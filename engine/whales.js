// whales.js — Sinh vật biển GLB có xương (mặc định cá nhà táng sea/sperm_whale, 13 clip) cho mọi env có biển.
// LÕI DÙNG LẠI: không chứa số liệu của tập nào. Kịch bản (ai, ở đâu, lúc nào) là DỮ LIỆU `plan` do env truyền vào
// (ví dụ ep001: OCEAN_PLAN_EP001 trong engine/envs/ocean.js).
//
// Đơn vị: thế giới = stud. Trong rig mỗi con (scale plan.S stud/m) đơn vị = MÉT, mặt nước gốc của tác giả GLB ở y = 0.
//   plan: R, at, sea events (x, z, radius) = stud;  deep/lift/approach/clipTravel = mét.
// Thời gian: t = thời gian env truyền vào update (ep001: giây toàn cục, cùng t mà env đưa cho sea(t)).
//   Mọi mốc của actor TƯƠNG ĐỐI với plan.t0 (mốc tuyệt đối = plan.t0 + giá trị). Mọi thứ là hàm thuần của t.
//
//   const life = createOceanLife(THREE, A, { seaY: 11, plan: MY_PLAN });  g.add(life.group);
//   life.update(t, camera, renderer);                                     // mỗi khung
//   sea.setEvents?.(life.seaEvents(t));                                   // sea2: vòng sóng/hố/bọt trên mặt biển
//
// plan = { asset?, S, swimSpeed, t0, actors: [actor…] }
//   { type: 'circler', name, R, w (rad/s), a0 (góc lúc t0), rise: [a, b], deep, lift, swimPhase?,
//     breathe?: [lúc, tốc độ clip], spout?: { at: [x,y,z] (m, trong rig) },
//     surfaceRing?: { strength, radius },  wake?: { every (s), life (s), strength, radius, delay (s sau rise[1]), until (s) } }
//   { type: 'jumper', name, at: [x, z], heading, t0 (lúc bắt đầu clip JUMP), speed (tốc độ clip), approach (m/s), clipTravel (m),
//     depth (m), splash: { seed, scale (m), dropScale }, exit: { strength, radius }, entry: { strength, radius }, drips?: true }
//
// Hàm phụ dùng lại cho sinh vật/env khác (sự kiện cùng định dạng engine/water.js setEvents):
//   breachEvents(crossings, { toWorld, toTime, exit, entry })  → { events, tExit, tEntry }   (crossings = findSurfaceCrossings)
//   wakeEvents(pathAt, { from, to, every, life, strength, radius }) → vệt bọt dọc đường đi pathAt(t) → [x, z]
//   liveSeaEvents(list, t, max = 8)   → các sự kiện đang sống tại t (có `taper` ⇒ cường độ tắt mượt về 0 trước khi bỏ)
//   applyWetSkin(material | material[], opts) → { set(outK, sinceExit), dry() }  — da ướt khi ra khỏi nước, khô dần theo thời gian
// Nước văng (splash.js) đặt trong cùng hệ rig của con nhảy → trọng lực/kích thước giọt tính bằng mét.
// Hiệu ứng mới (sự kiện mặt nước, da ướt v2, giọt nhỏ, cột phun khi thở) chỉ bật khi globalThis.__autoFx.sea2 (mặc định bật).
import { findSurfaceCrossings, createSplash } from './splash.js';

export const OCEAN_LIFE_ASSETS = ['sea/sperm_whale'];

const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const SEA2 = () => (globalThis.__autoFx?.sea2 ?? true);

// ---------- hàm phụ dùng lại ----------
// crossings: [{ time, x, z, dir: 'up'|'down' }] (hệ cục bộ); toWorld(x, z) → [X, Z] stud; toTime(time) → t của env.
// Lần lên đầu tiên = ra khỏi nước (vừa), lần xuống cuối = đập xuống (lớn hơn).
export function breachEvents(crossings, { toWorld = (x, z) => [x, z], toTime = (t) => t, exit = { strength: 1.3, radius: 13 }, entry = { strength: 2.7, radius: 22 } } = {}) {
  const up = crossings.find((e) => e.dir === 'up'), down = [...crossings].reverse().find((e) => e.dir === 'down');
  const events = [];
  const tExit = up ? toTime(up.time) : null, tEntry = down ? toTime(down.time) : null;
  if (up && exit) { const [x, z] = toWorld(up.x, up.z); events.push({ x, z, t0: tExit, strength: exit.strength, radius: exit.radius, kind: 'exit' }); }
  if (down && entry) { const [x, z] = toWorld(down.x, down.z); events.push({ x, z, t0: tEntry, strength: entry.strength, radius: entry.radius, kind: 'entry' }); }
  return { events, tExit, tEntry };
}
// vệt bọt nhỏ: 1 điểm mỗi `every` giây từ `from` đến `to`, mỗi điểm tắt dần trong `life` giây
export function wakeEvents(pathAt, { from, to, every = 1, life = 2, strength = 0.32, radius = 5 } = {}) {
  const out = [];
  for (let t = from; t < to; t += every) { const [x, z] = pathAt(t); out.push({ x, z, t0: t, strength, radius, taper: life, kind: 'wake' }); }
  return out;
}
// sự kiện không có `taper` (cú nhảy) luôn được ưu tiên; còn lại lấy mới nhất trước. Hàm thuần của t.
export function liveSeaEvents(list, t, max = 8) {
  const live = (e) => t >= e.t0 && t - e.t0 <= (e.taper || 8);
  const sc = (e) => ({ x: e.x, z: e.z, t0: e.t0, radius: e.radius, strength: e.taper ? e.strength * (1 - smooth(e.taper * 0.55, e.taper, t - e.t0)) : e.strength });
  const out = list.filter((e) => !e.taper && live(e)).map(sc);
  for (const e of list.filter((e) => e.taper && live(e)).sort((a, b) => b.t0 - a.t0)) { if (out.length >= max) break; out.push(sc(e)); }
  return out.slice(0, max);
}
// da ướt: outK = 0..1 (đang ở trên mặt nước), sinceExit = giây kể từ lúc ra khỏi nước (khô dần sau dryTime).
//   Ướt ⇒ nhám thấp, màu sẫm lại, phản chiếu trời mạnh hơn. dry() trả vật liệu về trạng thái lúc tạo.
export function applyWetSkin(materials, { wetRough = 0.16, darken = [0.2, 0.18, 0.15], envBoost = 0.8, sheen = [0.012, 0.02, 0.03], dryTime = 5, dryKeep = 0.65 } = {}) {
  const mats = Array.isArray(materials) ? materials : [materials];
  const base = mats.map((m) => ({ r: m.roughness, c: m.color.clone(), e: m.emissive.clone(), env: m.envMapIntensity ?? 1 }));
  return {
    set(outK, sinceExit) {
      const wk = outK * (1 - (1 - dryKeep) * smooth(0, dryTime, Math.max(0, sinceExit)));
      mats.forEach((m, i) => { const b = base[i];
        m.roughness = b.r + (wetRough - b.r) * wk;
        m.color.setRGB(b.c.r * (1 - darken[0] * wk), b.c.g * (1 - darken[1] * wk), b.c.b * (1 - darken[2] * wk));
        m.envMapIntensity = b.env * (1 + envBoost * wk);
        m.emissive.setRGB(b.e.r + sheen[0] * wk, b.e.g + sheen[1] * wk, b.e.b + sheen[2] * wk); });
      return wk;
    },
    dry() { mats.forEach((m, i) => { const b = base[i]; m.roughness = b.r; m.color.copy(b.c); m.emissive.copy(b.e); m.envMapIntensity = b.env; }); },
  };
}

// ---------- sinh vật ----------
export function createOceanLife(THREE, A, { seaY = 0, plan = null } = {}) {
  const group = new THREE.Group(); group.name = 'ocean_life';
  const ID = plan?.asset || OCEAN_LIFE_ASSETS[0];
  const none = { group, update() {}, seaEvents: () => [], snapshot() {}, unsnap() {}, events: [], whales: {}, actors: [] };
  if (!plan || !A || !A.has(ID)) return none;
  const M = A.manifest()?.byId.get(ID) || {};
  const k = M.scale_to_m || 0.98, wy = M.water_y_native || 4.283, S = plan.S ?? 3, T0 = plan.t0 ?? 0, swimSpeed = plan.swimSpeed ?? 0.55;

  // Màu cá nhà táng: lưng xanh-xám đậm → bụng sáng ngả kem; tô 1 lần lúc init bằng vertex color từ pose bind
  // (y hình học gốc + pháp tuyến + vài đốm nhiễu theo vị trí, không random) → tất định, không phụ thuộc t.
  const BACK = new THREE.Color('#2b4262'), BELLY = new THREE.Color('#8fa5ba'), SPOT = new THREE.Color('#1f3149');
  const paintWhale = (geo) => {
    if (geo.userData.whalePainted) return;
    geo.userData.whalePainted = true;
    geo.computeBoundingBox();
    const bb = geo.boundingBox, pos = geo.attributes.position, nor = geo.attributes.normal;
    const col = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = (pos.getY(i) - bb.min.y) / Math.max(1e-6, bb.max.y - bb.min.y);
      const n = nor ? nor.getY(i) : 0;
      let h = Math.min(1, Math.max(0, 1 - smooth(0.25, 0.6, y)));
      h = Math.min(1, h * 0.7 + Math.max(0, -n) * 0.4); h *= h;   // lưng đậm chiếm phần lớn, bụng sáng chỉ ở dưới
      const hash = Math.sin(pos.getX(i) * 12.9898 + pos.getZ(i) * 78.233 + pos.getY(i) * 37.719) * 43758.5453;
      const sp = (hash - Math.floor(hash)) * (1 - h) * 0.22;           // đốm tối nhẹ trên lưng
      c.copy(BACK).lerp(BELLY, h).lerp(SPOT, sp);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  };
  const makeMat = () => new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide, name: 'whale_lit' });
  const makeWhale = (name) => {
    const mat = makeMat();
    const rig = new THREE.Group(); rig.name = name; rig.scale.setScalar(S); group.add(rig);
    const body = A.instance(ID, { name: name + '_model', castShadow: false });
    body.scale.setScalar(k); body.position.y = -wy * k; rig.add(body);
    body.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;   // xương nhảy ra khỏi khung bind → đừng cull
      // GLB gốc dùng unlit + texture gần như đen → trên biển sáng chỉ thấy bóng đen; đổi sang vật liệu có ánh sáng màu xám đá
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      paintWhale(o.geometry);
      o.material = mat;
    });
    const mixer = new THREE.AnimationMixer(body), acts = {};
    for (const c of body.animations) {
      const key = c.name.split('-')[0].split('.')[0].toUpperCase();
      if (acts[key]) continue;
      const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); acts[key] = a;
    }
    // pose([[clip, giây trong clip, trọng số], ...]); clip lặp thì quấn, JUMP thì kẹp
    const pose = (list) => {
      for (const a of Object.values(acts)) a.setEffectiveWeight(0);
      for (const [key, tc, w] of list) {
        const a = acts[key]; if (!a) continue; const d = a.getClip().duration;
        a.time = key.startsWith('JUMP') ? Math.min(Math.max(tc, 0), d - 1e-4) : ((tc % d) + d) % d;
        a.setEffectiveWeight(w);
      }
      mixer.update(0);
    };
    return { rig, body, mixer, acts, pose, mat, skin: applyWetSkin(mat) };
  };
  // vẻ ướt bản cũ (sea2 tắt): lên khỏi mặt nước thì bóng hơn, chìm thì mờ; hàm thuần của vị trí rig
  const wetOld = (w, aboveM) => { const k2 = smooth(-1.5, 1.5, aboveM); w.skin.dry(); w.mat.roughness = 0.62 - 0.34 * k2; w.mat.emissive.setRGB(0.05 * k2, 0.07 * k2, 0.09 * k2); };

  const fwd = (ry) => [Math.sin(ry), Math.cos(ry)];
  const _v = new THREE.Vector2();
  const seaList = [];   // mọi sự kiện mặt nước của plan (t của env), dựng 1 lần
  const actors = [];

  // cột phun khi thở: các cụm bụi nước trắng xếp hình phễu nghiêng về trước-trái (kiểu cá nhà táng), toạ độ rig = mét
  const makeSpout = () => {
    const spout = new THREE.Group(); spout.name = 'whale_spout'; spout.visible = false;
    const hs = (i, k2) => { const x = Math.sin(i * 127.1 + k2 * 311.7) * 43758.5453; return x - Math.floor(x); };
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const mist = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#c8d6e2', transparent: true, opacity: 0.55, depthWrite: false, name: 'whale_spout_mist' });
    const core = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#dde8f0', transparent: true, opacity: 0.85, depthWrite: false, name: 'whale_spout_core' });
    const N = 260;
    for (let i = 0; i < N; i++) {
      const h = Math.pow(i / (N - 1), 0.9);                       // 0 = lỗ thở, 1 = đỉnh cột
      const spread = 0.2 + h * h * 1.8, a = hs(i, 1) * Math.PI * 2, r = spread * Math.sqrt(hs(i, 2));
      const m = new THREE.Mesh(geo, h < 0.5 ? core : mist);
      m.position.set(Math.cos(a) * r - h * 0.9, h * 6.5 + (hs(i, 3) - 0.5) * 0.4, Math.sin(a) * r + h * 1.5);   // nghiêng về trước
      m.scale.setScalar(0.18 + h * 0.5 + hs(i, 4) * 0.18);
      m.renderOrder = 4; spout.add(m);
    }
    spout.userData.mats = [core, mist]; spout.userData.base = [0.85, 0.55];
    return spout;
  };

  for (const P of plan.actors || []) {
    const w = makeWhale(P.name || `whale_${actors.length}`);
    const a = { P, w, type: P.type };
    if (P.type === 'circler') {
      const at = (t) => { const ang = P.a0 + P.w * (t - T0); return [Math.cos(ang) * P.R, Math.sin(ang) * P.R]; };
      a.pathAt = at;
      const riseEnd = T0 + P.rise[1];
      if (P.surfaceRing) { const [x, z] = at(riseEnd - 0.1); seaList.push({ x, z, t0: riseEnd - 0.1, strength: P.surfaceRing.strength, radius: P.surfaceRing.radius, taper: P.surfaceRing.life ?? 4.5, kind: 'surface' }); }
      if (P.wake) seaList.push(...wakeEvents(at, { from: riseEnd + (P.wake.delay ?? 0.3), to: T0 + (P.wake.until ?? 30), ...P.wake }));
      if (P.spout) { a.spout = makeSpout(); w.rig.add(a.spout); }
    } else if (P.type === 'jumper') {
      // nước văng: tìm lúc cắt mặt nước 1 lần lúc init (bản sao riêng, không đụng mixer chính)
      const probe = A.instance(ID); probe.scale.setScalar(k); probe.position.y = -wy * k; probe.updateMatrixWorld(true);
      const jumpClip = probe.animations.find((c) => c.name.toUpperCase().startsWith('JUMP-'));
      const cross = jumpClip ? findSurfaceCrossings(THREE, probe, new THREE.AnimationMixer(probe), jumpClip, 0) : [];
      const rigS = new THREE.Group(); rigS.name = (P.name || 'whale') + '_splash_rig'; rigS.scale.setScalar(S); group.add(rigS);
      const sp = P.splash || {};
      const splash = createSplash(THREE, { seed: sp.seed ?? 5, scale: sp.scale ?? 21 });
      splash.setEvents(cross);
      splash.object.traverse((o) => { o.renderOrder = 3; });   // vẽ sau mặt biển (trong suốt)
      rigS.add(splash.object);
      const jumpDur = jumpClip ? jumpClip.duration : 1.42;
      const toWorld = (x, z) => { const c = Math.cos(P.heading), s = Math.sin(P.heading); return [P.at[0] + S * (x * c + z * s), P.at[1] + S * (-x * s + z * c)]; };
      const toTime = (tc) => T0 + P.t0 + tc / P.speed;
      const br = breachEvents(cross, { toWorld, toTime, exit: P.exit, entry: P.entry });
      seaList.push(...br.events);
      Object.assign(a, { splash, rigS, jumpDur, cross, tExit: br.tExit ?? toTime(0.3), tEntry: br.tEntry ?? toTime(jumpDur - 0.2) });
      a.drips = P.drips === false ? null : makeDrips(probe, jumpClip, jumpDur, cross, P.speed, rigS);
    }
    actors.push(a);
  }

  // giọt nước nhỏ từ thân con nhảy khi ở trên không (hệ splash rig = hệ rig con nhảy lúc nhảy, mét):
  //   lấy mẫu clip JUMP 1 lần → vị trí vài xương theo thời gian clip; giọt i rơi tự do từ xương j lúc ts_i
  function makeDrips(probe, clip, dur, cross, speed, parent) {
    if (!clip) return null;
    const bones = []; probe.traverse((o) => { if (o.isBone) bones.push(o); });
    if (!bones.length) return null;
    const pickB = bones.filter((_, i) => i % Math.max(1, Math.floor(bones.length / 14)) === 0).slice(0, 14);
    const mx = new THREE.AnimationMixer(probe), act = mx.clipAction(clip); act.play();
    const NS = 48, track = pickB.map(() => []), v = new THREE.Vector3();
    for (let i = 0; i <= NS; i++) { mx.setTime((i / NS) * dur); probe.updateMatrixWorld(true); pickB.forEach((b, j) => track[j].push(b.getWorldPosition(v).toArray())); }
    act.stop();
    const at = (j, tc) => { const f = Math.min(NS - 1e-4, Math.max(0, (tc / dur) * NS)), i = Math.floor(f), u = f - i, A0 = track[j][i], B0 = track[j][i + 1];
      return [A0[0] + (B0[0] - A0[0]) * u, A0[1] + (B0[1] - A0[1]) * u, A0[2] + (B0[2] - A0[2]) * u]; };
    const N = 700, hs = (i, k2) => { const x = Math.sin(i * 91.7 + k2 * 47.3) * 43758.5453; return x - Math.floor(x); };
    const up = cross.find((e) => e.dir === 'up'), down = [...cross].reverse().find((e) => e.dir === 'down');
    const c0 = up ? up.time : 0.3, c1 = down ? down.time : dur - 0.2;
    const seeds = Array.from({ length: N }, (_, i) => {
      const j = i % pickB.length, ts = c0 + (c1 - c0) * hs(i, 1);
      const p0 = at(j, ts), p1 = at(j, ts + 0.02), q = speed * 0.5 / 0.02;
      return { ts, p0: [p0[0] + (hs(i, 2) - 0.5) * 1.6, p0[1] + (hs(i, 3) - 0.5) * 0.8, p0[2] + (hs(i, 4) - 0.5) * 1.6], vel: [(p1[0] - p0[0]) * q, (p1[1] - p0[1]) * q, (p1[2] - p0[2]) * q] };
    });
    const pos = new Float32Array(N * 3), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: '#eaf8ff', size: 0.45, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false, fog: true, name: 'whale_drips' });
    const pts = new THREE.Points(geo, m); pts.name = 'whale_drips'; pts.frustumCulled = false; pts.renderOrder = 3; pts.visible = false;
    parent.add(pts);
    return { pts, update(tc) {
      let any = false;
      for (let i = 0; i < N; i++) {
        const d = seeds[i], age = (tc - d.ts) / speed;      // giây của env kể từ khi giọt rời thân
        let y = -1e4, x = 0, z = 0;
        if (age > 0 && age < 2.2) {
          x = d.p0[0] + d.vel[0] * age; z = d.p0[2] + d.vel[2] * age; y = d.p0[1] + d.vel[1] * age - 4.9 * age * age;
          if (y < 0) y = -1e4; else any = true;
        }
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      }
      geo.attributes.position.needsUpdate = true; pts.visible = any;
    } };
  }

  let snapOn = false;
  function spoutTick(a, t) {
    const sp = a.spout; if (!sp || snapOn) return;
    const mats = sp.userData.mats, base = sp.userData.base;
    const B = a.P.breathe, on = SEA2() && B;
    const kk = on ? ((t - T0 - B[0]) * B[1] - 0.35) / 1.6 : -1;   // giây clip BREATHE → 0..1 của cột phun
    sp.visible = kk > 0 && kk < 1;
    if (!sp.visible) { mats.forEach((m, i) => { m.opacity = base[i]; }); return; }
    sp.position.set(...(a.P.spout.at || [0, 2.6, 6.2]));
    const g2 = smooth(0, 0.35, kk);
    sp.scale.set(0.6 + 0.6 * g2, 0.15 + 0.95 * g2, 0.6 + 0.6 * g2);
    mats.forEach((m, i) => { m.opacity = base[i] * (1 - smooth(0.45, 1, kk)); });
  }

  function update(t, camera, renderer) {
    const sea2 = SEA2();
    const sw = (t - T0) * swimSpeed;
    let px = 1000;   // giọt nước: kích thước điểm theo pixel thật của canvas (đổi theo độ phân giải xuất)
    if (camera && renderer) { renderer.getDrawingBufferSize(_v); px = _v.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); }
    for (const a of actors) {
      const { P, w } = a;
      if (a.type === 'circler') {
        // từ dưới sâu nổi lên (rise), có thể thở (BREATHE: lưng gù vồng lên khỏi mặt nước), bơi vòng quanh gốc
        const ang = P.a0 + P.w * (t - T0);
        w.rig.position.x = Math.cos(ang) * P.R; w.rig.position.z = Math.sin(ang) * P.R; w.rig.rotation.y = -ang;
        w.rig.position.y = seaY + (P.deep + (P.lift - P.deep) * smooth(T0 + P.rise[0], T0 + P.rise[1], t)) * S;
        let bw = 0, bt = 0;
        if (P.breathe) { bt = (t - T0 - P.breathe[0]) * P.breathe[1]; bw = bt > 0 && bt < 1.67 ? smooth(0, 0.25, bt) * (1 - smooth(1.35, 1.67, bt)) : 0; }
        w.pose(bw > 0 ? [['SWIM', sw + (P.swimPhase || 0), 1 - bw], ['BREATHE', Math.max(0, bt), bw]] : [['SWIM', sw + (P.swimPhase || 0), 1]]);
        const above = (w.rig.position.y - seaY) / S;
        if (sea2) w.skin.set(smooth(-1.5, 1.5, above), t - (T0 + P.rise[1])); else wetOld(w, above);
        spoutTick(a, t);
      } else if (a.type === 'jumper') {
        // tiếp cận dưới nước theo heading → đứng yên (clip JUMP tự di chuyển thân) → bơi tiếp dưới nước
        const tc = (t - T0 - P.t0) * P.speed, dur = a.jumpDur;
        const [fx, fz] = fwd(P.heading);
        const before = Math.min(tc, 0), after = Math.max(0, tc - dur);
        const travel = (before + after) * (P.approach ?? 7) + (tc > dur ? (P.clipTravel ?? 11) : 0);
        w.rig.position.set(P.at[0] + fx * travel * S, seaY, P.at[1] + fz * travel * S);
        w.rig.rotation.y = P.heading;
        if (tc < 0 || tc > dur) { w.rig.position.y = seaY - (P.depth ?? 6) * S; w.pose([['SWIM', sw + (P.swimPhase || 0), 1]]); }
        else w.pose([['JUMP', tc, 1]]);
        w.rig.visible = tc > -1.5 && tc < dur + 1.5;
        a.rigS.position.set(P.at[0], seaY, P.at[1]); a.rigS.rotation.y = P.heading;
        a.splash.update(tc, 0, px * S * (P.splash?.dropScale ?? 0.6));   // < 1: giọt nhỏ → bụi nước, không thành bong bóng
        a.splash.object.visible = tc > -0.1 && tc < dur + (sea2 ? 7 : 4);  // sea2: sương đọng lâu hơn
        if (a.drips) { if (sea2) a.drips.update(tc); else a.drips.pts.visible = false; }
        if (sea2) w.skin.set(smooth(a.tExit - 0.12, a.tExit + 0.05, t) * (1 - smooth(a.tEntry, a.tEntry + 0.35, t)), t - a.tExit);
        else wetOld(w, tc > 0 && tc < dur ? 2 : -2);
      }
    }
  }
  const seaEvents = (t) => liveSeaEvents(seaList, t);

  // --- CHỈ cho ảnh bưu thiếp (engine/snap.js): con có `spout` (hoặc circler đầu tiên) nổi lên thở + cột phun ---
  // Ẩn các con khác + nước văng; update(t) mỗi khung đặt lại vị trí/pose → shot biển không đổi.
  const hidden = [];
  // snapshot({ at:[x,z], heading, lift (m), breathe (giây clip BREATHE), clips, spoutAt:[x,y,z] (m, trong rig), spoutScale })
  function snapshot({ at = [0, 0], heading = 0, lift = 1.2, breathe = 0.8, clips = null, spoutAt = [0, 2.6, 6.2], spoutScale = 1 } = {}) {
    const hero = actors.find((a) => a.spout) || actors.find((a) => a.type === 'circler') || actors[0];
    if (!hero) return;
    for (const a of actors) {
      if (a !== hero) { hidden.push([a.w.rig, a.w.rig.visible]); a.w.rig.visible = false; }
      if (a.splash) { hidden.push([a.splash.object, a.splash.object.visible]); a.splash.object.visible = false; }
      if (a.drips) { hidden.push([a.drips.pts, a.drips.pts.visible]); a.drips.pts.visible = false; }
    }
    const w = hero.w;
    w.rig.position.set(at[0], seaY + lift * S, at[1]); w.rig.rotation.y = heading;
    w.pose(clips || [['BREATHE', breathe, 1]]);
    wetOld(w, 2);
    if (!hero.spout) { hero.spout = makeSpout(); w.rig.add(hero.spout); }
    snapOn = true; hero.spout.userData.mats.forEach((m, i) => { m.opacity = hero.spout.userData.base[i]; });
    hero.spout.position.set(...spoutAt); hero.spout.scale.setScalar(spoutScale); hero.spout.visible = true;
    hidden.push([hero.spout, false]);
    w.rig.updateMatrixWorld(true);
  }
  function unsnap() { snapOn = false; while (hidden.length) { const [o, v] = hidden.pop(); o.visible = v; } }

  const whales = Object.fromEntries(actors.map((a) => [a.P.name, a.w]));
  return { group, update, seaEvents, events: actors.find((a) => a.cross)?.cross || [], actors, whales, splash: actors.find((a) => a.splash)?.splash, snapshot, unsnap };
}
