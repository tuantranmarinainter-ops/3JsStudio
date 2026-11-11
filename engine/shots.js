// shots.js — Đạo diễn: biến 1 shot (dữ liệu) + t cục bộ thành camera, diễn viên, nhà, env, đạo cụ.
//
// Shot (episodes/epNNN/shots.js), mọi trường trừ id/f/env đều tuỳ chọn:
//   { id, f:[f0,f1], env, light, line,
//     cam:   { at:'hero'|'house'|'obj:<tên>'|[x,y,z], look:[dx,dy,dz], yaw, h, dist, fov, roll, rel,
//              yaw2, h2, dist2, fov2, look2, ease, shake }            // quỹ đạo quanh chủ thể
//         |  { p:[x,y,z], l:[x,y,z], fov, p2, l2, fov2, ease, shake }  // tuyệt đối
//     house: { style, at:[x,z], to:[x,z], ry, legsOut, lift, kneel, shake, door, walk0, pitch, roll, night, boat (0..1: nổi như thuyền) }
//     cast:  { hero: { at:[x,y,z], to, ry, ry2, anim, from, face, speed, tOff, lie, parent:'house', hold } , … }
//     props: { <tên>: { at, to, ry, rx, rz, s, parent } },  fx: { cards:{at,t0}, dust:[{at,t0}] },
//     — LÕI BIỂN (env có e.sea; docs/core.md) —
//     cast.<tên>.float / props.<tên>.float: true | { hx, hz, draft, pitchK, rollK, maxPitch, maxRoll, k }   nổi theo sóng thật
//         (at[1] = độ cao khi biển lặng; hx/hz = nửa dài thân theo X/Z cục bộ, stud; draft = chìm thêm; k 0..1 hoặc [a,b])
//     seaEvents: [{ at:[x,z], t: giây cục bộ của shot, strength = 1.5, radius = 10 }]   vòng sóng/hố/bọt (≤ 8 cùng lúc)
//     seaWeather: 'nang' | { from, to, ease, win } | { base, …ghi đè }   thời tiết biển (engine/seaweather.js, ô FX seaWx)
//     room:  { tilt, roll, view, dense },  fn(ctx) }
// Shot ngắn theo LOẠI ({ type:'closeup', who:'hero', at:'square', … }) → engine/shottypes.js điền cam/cast mặc định:
//   index.html gọi expandShots(SHOTS, ctx) trước buildTimeline (có liên tục giữa shot), hoặc truyền
//   resolveType = makeTypeResolver(ctx) vào createDirector (mở rộng từng shot lẻ). Shot không có `type` không bị đụng.
// Giá trị số dạng [a, b] = nội suy a→b theo tiến độ shot (ease mặc định smooth, đi bộ thì tuyến tính).

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const EASE = {
  linear: (k) => k,
  smooth: (k) => k * k * (3 - 2 * k),
  in: (k) => k * k * k,
  out: (k) => 1 - Math.pow(1 - k, 3),
  inout: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  back: (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
};
export const ease = (name, k) => (EASE[name] || EASE.smooth)(clamp01(k));
const isRange = (v) => Array.isArray(v) && v.length === 2 && typeof v[0] === 'number';
export const val = (v, k, def = 0) => (v === undefined ? def : isRange(v) ? v[0] + (v[1] - v[0]) * k : v);
import { fxPuffs, fxPrints, fxWind } from './fx.js';
import { floatPose, floatTilt, wetline, worldGrad } from './floating.js';
import { resolveSeaWeather, seaWeatherAmp } from './seaweather.js';
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
// tiến độ cục bộ trong một đoạn con của shot: win = [k0,k1]
const sub = (k, win) => (win ? clamp01((k - win[0]) / (win[1] - win[0])) : k);

export function createDirector({ THREE, stage, envs, K, actors, houses, props = {}, fx = {}, resolveType = null }) {
  const { scene, camera } = stage;
  const _v = new THREE.Vector3();
  const tmpObj = new THREE.Object3D();
  // --- hiệu ứng tự động (bụi/tuyết ở chân nhà, dấu chân, hơi thở, gió): tất định theo pha bước; bật/tắt qua globalThis.__autoFx ---
  //   window.__autoFx = { foot:true, prints:true, breath:true, wind:true }  (mặc định bật hết; shot có thể ghi shot.wind = 0..1.5 / 0)
  const AUTO = (globalThis.__autoFx ||= { foot: true, prints: true, breath: true, wind: true });
  const auto = { puffs: fxPuffs(THREE, { maxEvents: 40 }), prints: fxPrints(THREE), wind: fxWind(THREE), breath: fxPuffs(THREE, { maxEvents: 12, per: 8, seed: 31 }) };
  for (const f of Object.values(auto)) { f.obj.visible = false; scene.add(f.obj); }
  const camBasis = { pos: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3() };
  const GROUND = { hawaii: 'sand', island: 'sand', reef: 'sand', sahara: 'sand', town: 'dirt', brazil: 'grass', forest: 'grass' };
  const FOOT_PHASE = [0, 0.5, 0.5, 0];          // = PHASE trong house.js (FL, FR, BL, BR)
  // Các lần bàn chân nhà CHẠM ĐẤT tới thời điểm t của shot (đã trừ những lần chưa tới): [{ t0, at:[x,y,z], yaw, leg }]
  // Chân i chạm đất khi quãng đường D = (n − PHASE[i]) · 2·STRIDE (house.js: cyc = D / 2·STRIDE, ph = 0 ⇒ bắt đầu chịu tải).
  function footEvents(shot, k, past = 1) {
    const sp = shot.house, h = activeHouse;
    if (!sp || !sp.to || !h || !h.legs || sp.boat) return [];   // nổi như thuyền: không có bước chân / bụi / dấu chân
    const a = sp.at || [0, 0], b = sp.to, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-3) return [];
    const stride2 = 2 * (h.dims?.STRIDE || 7), w = sp.win || [0, 1], w0 = w[0], dw = w[1] - w[0], walk0 = sp.walk0 || 0;
    const kw = clamp01((k - w0) / dw), dNow = len * kw + walk0, back = walk0 - stride2 * past, out = [];
    for (const L of h.legs) {
      const ph = FOOT_PHASE[L.i], nMin = Math.ceil(back / stride2 + ph), nMax = Math.floor(dNow / stride2 + ph + 1e-9);
      for (let n = nMin; n <= nMax; n++) {
        const D = (n - ph) * stride2, ke = (D - walk0) / len, kc = clamp01(ke);
        if (val(sp.legsOut, kc, 1) < 0.9 || val(sp.lift, kc, 1) <= 0.5) continue;
        const ry = val(sp.ry, kc, 0), cs = Math.cos(ry), sn = Math.sin(ry);
        const lx = L.hx + L.side * (10 + 3 * val(sp.kneel, kc, 0)), lz = L.hz + L.front * 3.5 + (h.dims?.STRIDE || 7) / 2;
        const px = a[0] + (b[0] - a[0]) * ke, pz = a[1] + (b[1] - a[1]) * ke;
        out.push({ t0: shot.t0 + (w0 + ke * dw) * shot.dur, at: [px + lx * cs + lz * sn, sp.y ?? 0, pz - lx * sn + lz * cs], yaw: ry + L.side * 0.5, leg: L.i });
      }
    }
    return out.sort((p, q) => p.t0 - q.t0);
  }
  function applyAutoFx(shot, envObj, k, t, night) {
    for (const f of Object.values(auto)) f.obj.visible = false;
    camera.updateMatrixWorld(true); camera.getWorldPosition(camBasis.pos); camera.getWorldDirection(camBasis.fwd);
    camBasis.right.setFromMatrixColumn(camera.matrixWorld, 0).normalize(); camBasis.up.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    const gr = envObj.ground || { kind: GROUND[shot.env] || 'dirt' }, snow = gr.kind === 'snow';
    const light = 1 - 0.22 * night, scale = (stage.renderer?.domElement?.height || 1920) / 2;
    const steps = footEvents(shot, k, snow ? 3 : 1);
    if (AUTO.foot && steps.length) auto.puffs.update(t, steps.map((e) => ({ at: [e.at[0], e.at[1], e.at[2]], t0: e.t0, kind: snow ? 'snow' : gr.kind })), { scale, light });
    if (AUTO.prints && snow && steps.length) auto.prints.update(t, steps, { y: gr.y ?? 0.08, tint: night > 0.5 ? '#5d6c95' : '#9bb0d4' });
    else if (AUTO.prints && !snow) {   // dấu chân trên cát/đất/cỏ/đường (góp ý 2026-11-11 #6: "đi phải có dấu chân") — giữ ~6 sải gần nhất
      const pr = footEvents(shot, k, 6);
      const tint = { sand: '#a3814c', grass: '#2f3b24', dirt: '#3b3129' }[gr.kind] || '#3b3129';
      if (pr.length) auto.prints.update(t, pr, { y: gr.y ?? 0.14, tint: night > 0.5 ? '#6a5a44' : tint });
    }
    if (AUTO.breath && snow) {
      const ev = [];
      for (const [name, a] of Object.entries(actors)) {
        if (!a.root.visible || !shot.cast?.[name]) continue;
        const per = 1.5, off = (name.length % 3) * 0.37, n = Math.floor((t - off) / per);
        const head = anchorOf('face:' + name, [0, -0.15, 0]), yaw = headingOf(name);
        for (const m of [n - 1, n]) ev.push({ at: [head[0] + Math.sin(yaw) * 0.7, head[1], head[2] + Math.cos(yaw) * 0.7], t0: m * per + off, kind: 'breath', dir: [Math.sin(yaw) * 0.8, 0.2, Math.cos(yaw) * 0.8] });
      }
      if (ev.length) auto.breath.update(t, ev, { scale, light });
    }
    const wind = shot.wind ?? (snow ? (shot.env === 'antarctica' ? 1 : 0.7) : 0);
    // (vệt gió đã bỏ — gió nay là tuyết rơi trôi ngang trong fxSnow, đọc AUTO.wind)
  }

  function anchorOf(ref, look = [0, 0, 0]) {
    if (Array.isArray(ref)) return [ref[0] + look[0], ref[1] + look[1], ref[2] + look[2]];
    let o, base = [0, 0, 0];
    if (ref === 'house') { o = activeHouse?.body; base = [0, 6, 0]; }
    else if (typeof ref === 'string' && ref.startsWith('obj:')) o = scene.getObjectByName(ref.slice(4));
    else if (typeof ref === 'string' && ref.startsWith('face:')) { o = actors[ref.slice(5)]?.parts.head; base = [0, 0.6, 0]; }
    else if (actors[ref]) { o = actors[ref].root; base = [0, 4.2, 0]; }
    if (!o) return [...look];
    o.updateWorldMatrix(true, false);
    _v.set(base[0], 0, base[2]).add(o.getWorldPosition(new THREE.Vector3())); _v.y += base[1];
    return [_v.x + look[0], _v.y + look[1], _v.z + look[2]];
  }
  function headingOf(ref) {
    if (typeof ref === 'string' && ref.startsWith('face:')) ref = ref.slice(5);
    const o = actors[ref]?.root || (ref === 'house' ? activeHouse?.root : null);
    if (!o) return 0; const q = new THREE.Quaternion(); o.getWorldQuaternion(q); return new THREE.Euler().setFromQuaternion(q, 'YXZ').y;
  }

  let activeHouse = null;
  // sea2 (engine/floating.js): nhà nổi cưỡi đúng sóng của shader + vệt ướt trên thân + bọt quanh thân. Tắt ⇒ sin cố định như cũ.
  const SEA2 = () => globalThis.__autoFx?.sea2 ?? true;
  const houseWet = new Map(Object.values(houses).map((h) => [h, wetline(THREE, h.root)]));
  // --- lõi biển cho shot (engine/sea.js + seaweather.js): đặt MỖI khung trước khi đặt nhà/diễn viên/đạo cụ ---
  //   seaNow = { e, sea, clock } của env đang chạy (null nếu env không có e.sea) — mọi vật nổi dùng chung
  let seaNow = null, hullBest = 0;
  const _q = new THREE.Quaternion();
  function hullFoam(h, area) {   // water chỉ có 1 vùng bọt thân nổi → lấy vật to nhất (nhà luôn thắng)
    if (!seaNow || area <= hullBest) return; hullBest = area;
    seaNow.sea.setHull({ x: h.x, z: h.z, hx: h.hx, hz: h.hz, yaw: h.yaw, k: h.k, plunge: Math.min(1, Math.max(0, -h.vy / 4)) });
  }
  function prepareSea(shot, k, t) {
    for (const e of Object.values(envs.envs)) for (const s of e.group.userData.seas || []) { s.setDrive(null); s.setShotEvents(null); }
    seaNow = null; hullBest = 0;
    const e = envs.envs[shot.env], sea = e?.sea;
    const spec = ((AUTO.seaWx ?? true) && shot.seaWeather) || e?.defaultWeather || null;
    const W = spec ? resolveSeaWeather(spec, k) : null;
    if (!sea?.sample) return W;
    if (W) {   // đồng hồ + biên độ theo thời tiết (hàm thuần của t toàn cục → tiến độ shot)
      const kOf = (tg) => clamp01((tg - shot.t0) / (shot.dur || 1));
      sea.setDrive((tg) => ({ amp: seaWeatherAmp(spec, kOf(tg)), rate: W.speed }), { response: W.float });
    }
    seaNow = { e, sea, clock: W ? sea.clock : e.seaClock || sea.clock };
    if (SEA2()) {
      // sự kiện của env khai báo thuần (e.seaEvents(t)) → vật nổi thấy ngay khung này; không khai ⇒ xoá (không dùng của khung trước)
      sea.setEvents(e.seaEvents ? e.seaEvents(t) : null);
      if (shot.seaEvents?.length) sea.setShotEvents(shot.seaEvents.map((ev) => ({ x: ev.at[0], z: ev.at[1],
        t0: seaNow.clock(shot.t0 + (ev.t || 0)).t, strength: ev.strength ?? 1.5, radius: ev.radius ?? 10 })));
    }
    return W;
  }
  // vật (root) nổi: f = spec.float; p = vị trí [x, y_lặng, z]; yaw = rotation.y
  function floatObj(root, f, p, yaw, ke, t) {
    if (!f || !seaNow || !SEA2() || root.parent !== scene) return;
    const o = f === true ? {} : f, kf = val(o.k, ke, 1);
    if (kf <= 0) return;
    const hx = o.hx ?? 1.5, hz = o.hz ?? 1.5;
    const F = floatPose(seaNow.sea, { x: p[0], z: p[2], yaw, hx, hz, t, clock: seaNow.clock, draft: o.draft ?? 0,
      pitchK: o.pitchK ?? 0.9, rollK: o.rollK ?? 0.7, maxPitch: o.maxPitch ?? 0.25, maxRoll: o.maxRoll ?? 0.3 });
    root.position.y = p[1] + kf * (F.dy + (o.draft ?? 0)) - (o.draft ?? 0);
    root.quaternion.premultiply(floatTilt(THREE, F, yaw, kf, _q));
    if (o.foam !== false) hullFoam({ x: p[0], z: p[2], hx, hz, yaw, k: kf, vy: F.vy }, hx * hz);
  }

  function placeCamera(c, k, t) {
    const ke = ease(c.ease || 'smooth', k);
    let pos, look, fov;
    if (c.p) {
      pos = c.p2 ? lerp3(c.p, c.p2, ke) : c.p; look = c.l2 ? lerp3(c.l, c.l2, ke) : c.l;
      fov = c.fov2 ? c.fov + (c.fov2 - c.fov) * ke : c.fov || 40;
    } else {
      const lk = c.look2 ? lerp3(c.look || [0, 0, 0], c.look2, ke) : c.look || [0, 0, 0];
      const tgt = anchorOf(c.at || 'house', lk);
      const yaw = (c.yaw2 !== undefined ? c.yaw + (c.yaw2 - c.yaw) * ke : c.yaw || 0) + (c.rel ? headingOf(c.at) : 0);
      const dist = c.dist2 !== undefined ? c.dist + (c.dist2 - c.dist) * ke : c.dist ?? 12;
      const h = c.h2 !== undefined ? c.h + (c.h2 - c.h) * ke : c.h ?? 0;
      pos = [tgt[0] + Math.sin(yaw) * dist, tgt[1] + h, tgt[2] + Math.cos(yaw) * dist]; look = tgt;
      fov = c.fov2 ? c.fov + (c.fov2 - c.fov) * ke : c.fov || 40;
    }
    if (c.shake) { const s = c.shake; pos = [pos[0] + (Math.sin(t * 9.1) + 0.5 * Math.sin(t * 15.7 + 2)) * s * 0.22, pos[1] + (Math.sin(t * 11.3 + 1) + 0.5 * Math.sin(t * 17.9)) * s * 0.3, pos[2] + Math.cos(t * 8.3) * s * 0.22]; }   // rung tay máy chậm (~1.5–2.8 Hz), không giật
    const roll = val(c.roll, ke, 0);
    stage.setCamera(pos, look, { fov, roll, focusShadow: c.shadow !== false });
    if (c.shadowAt) stage.shadowFocus(anchorOf(c.shadowAt));
    else if (c.shadow === false) stage.shadowFocus(c.shadowFocus || [0, 0, 0]);   // vùng bóng cố định — không giữ chỗ của shot trước (tất định)
  }

  function placeHouse(spec, k, t, night, envName) {
    for (const h of Object.values(houses)) h.root.visible = false;
    activeHouse = null;
    if (!spec) return;
    const h = houses[spec.style || 'family']; h.root.visible = true; activeHouse = h;
    const walking = !!spec.to;
    const kw = sub(k, spec.win);
    const ke = walking ? kw : ease(spec.ease || 'smooth', kw);
    const a = spec.at || [0, 0], b = spec.to || a;
    const x = a[0] + (b[0] - a[0]) * ke, z = a[1] + (b[1] - a[1]) * ke;
    // boat 0→1: nhà hạ xuống mặt nước và NỔI như thuyền — chân thôi bước (dang ra dưới nước), thân nhấp nhô + lắc theo sóng
    //   (hàm thuần của t; shot ghi boat: 1, y = cao độ mặt biển của env). Góp ý 2026-11-11 f3528 (vượt bão).
    const boat = val(spec.boat, ke, 0);
    let heave = boat * (0.9 * Math.sin(t * 1.7) + 0.45 * Math.sin(t * 2.9 + 1.3));
    let bRoll = boat * (0.13 * Math.sin(t * 1.9) + 0.05 * Math.sin(t * 3.4 + 0.7));
    let bPitch = boat * (0.07 * Math.sin(t * 1.35 + 1.1) + 0.03 * Math.sin(t * 2.6));
    const yaw = val(spec.ry, ke, 0) + boat * 0.06 * Math.sin(t * 0.9);
    const S = seaNow;
    if (boat > 0 && SEA2() && S) {
      // sea2: nổi theo ĐÚNG mặt nước đang vẽ (đồng hồ biển của env; fade camera = 1 vì camera shot nổi < 120 đv).
      //   spec.y giữ nghĩa cũ = độ cao gốc nhà so với mặt biển trung bình → gốc nhà = spec.y + (mặt nước dưới thân − mặt biển TB)
      const hx = (h.dims?.W ?? 28) / 2 + 0.3, hz = (h.dims?.D ?? 20) / 2 + 0.3;
      const F = floatPose(S.sea, { x, z, yaw, hx, hz, t, clock: S.clock, pitchK: 0.85, rollK: 0.75, maxPitch: 0.2, maxRoll: 0.25 });
      heave = boat * F.dy; bRoll = boat * F.rotZ; bPitch = boat * F.rotX;
      houseWet.get(h)?.set({ x, z, y: F.y, ...worldGrad(F.sx, F.sz, yaw), t, k: boat });
      hullFoam({ x, z, hx, hz, yaw, k: boat, vy: F.vy }, 1e9);
    }
    h.root.position.set(x, (spec.y ?? 0) + heave, z); h.root.rotation.y = yaw;
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]) * ke + (spec.walk0 || 0);
    const stepping = walking && boat < 0.5;
    h.pose({ legsOut: val(spec.legsOut, ke, 1), lift: val(spec.lift, ke, 1) * (1 - boat), kneel: val(spec.kneel, ke, 0), walk: stepping ? dist : 0,
      walking: stepping, shake: val(spec.shake, ke, 0), pitch: val(spec.pitch, ke, 0) + bPitch, roll: val(spec.roll, ke, 0) + bRoll, t });
    h.setNight(spec.night ?? night);
    h.setDoor(val(spec.door, ke, 0));
    h.root.updateMatrixWorld(true);
  }

  function placeCast(cast = {}, k, t) {
    for (const [name, a] of Object.entries(actors)) {
      const s = cast[name];
      a.root.visible = !!s;
      if (!s) continue;
      const parent = s.parent === 'house' && activeHouse ? activeHouse.body : s.parent === 'room' ? envs.current?.room || scene : scene;
      if (a.root.parent !== parent) parent.add(a.root);
      const anim = s.anim || 'idle';
      const moving = !!s.to && (anim === 'walk' || anim === 'run');
      const kw = sub(k, s.win);
      const ke = moving ? kw : ease(s.ease || 'smooth', kw);
      const p = s.to ? lerp3(s.at, s.to, ke) : s.at || [0, 0, 0];
      a.root.position.set(p[0], p[1], p[2]);
      let ry = s.ry2 !== undefined ? (s.ry ?? 0) + (s.ry2 - (s.ry ?? 0)) * ke : s.ry;
      if (ry === undefined && s.to) ry = Math.atan2(s.to[0] - s.at[0], s.to[2] - s.at[2]);
      a.root.rotation.set(s.lie ? -Math.PI / 2 : s.rx || 0, ry || 0, s.rz || 0);
      a.root.scale.setScalar(s.s || 1);
      if (s.float) floatObj(a.root, s.float, p, ry || 0, ke, t);
      const at = (s.tOff || 0) + (s.animFromShot ? k * (s.animDur || 1) : t);
      const opt = { speed: s.speed, amp: s.amp, from: s.from, mix: s.from ? ease('smooth', clamp01(sub(k, s.mixWin || [0, 0.3]))) : undefined };
      const pose = a.animate(anim, at, opt);
      const want = s.face || pose.face || a._defaultFace;
      if (want && a.options.face !== want) { a.setFace(want); a.animate(anim, at, opt); }   // đổi mặt xong dựng lại pose → hướng mắt không phụ thuộc shot trước (tất định)
      if (s.pose) applyExtra(a, s.pose, ke);
      // vật cầm tay
      for (const side of ['holdR', 'holdL', 'hold']) if (s[side]) holdProp(a, s[side], side);
    }
  }
  const R6_FACE_ANIMS = new Set(['shiver', 'panic', 'lie', 'tumble', 'fall', 'scared', 'cower', 'faint', 'cheer', 'dance', 'wave', 'hug', 'lookAround']);
  function applyExtra(a, pose, k) {
    for (const [part, rot] of Object.entries(pose)) {
      const p = a.parts[part]; if (!p) continue;
      for (const ax of ['x', 'y', 'z']) if (rot[ax] !== undefined) p.rotation[ax] = val(rot[ax], k);
    }
  }
  const held = new Map();
  function holdProp(a, spec, side) {
    const name = typeof spec === 'string' ? spec : spec.name;
    const obj = props[name]; if (!obj) return;
    const hand = side === 'holdL' ? a.parts.leftHand : a.parts.rightHand;   // R15: gắn vào bàn tay
    const arm = hand || (side === 'holdL' ? a.parts.leftArm : a.parts.rightArm);
    if (obj.parent !== arm) arm.add(obj);
    const o = typeof spec === 'object' ? spec : {};
    const def = hand ? [0, -0.45, 0.55] : [side === 'holdL' ? -0.6 : 0.6, -1.9, 0.9];
    obj.position.set(...(hand && o.at ? [o.at[0] * 0.5, o.at[1] + 1.45, o.at[2] * 0.6] : o.at || def));
    obj.rotation.set(...(o.rot || [0, 0, 0]));
    obj.scale.setScalar(o.s || 1);
    obj.visible = true; held.set(name, true);
  }

  function placeProps(spec = {}, k, t = 0) {
    for (const [name, obj] of Object.entries(props)) {
      if (held.get(name)) continue;
      const s = spec[name]; obj.visible = !!s; if (!s) continue;
      const parent = s.parent === 'house' && activeHouse ? activeHouse.body : s.parent === 'room' ? envs.current?.room || scene : scene;
      if (obj.parent !== parent) parent.add(obj);
      const ke = ease(s.ease || 'smooth', sub(k, s.win));
      const p = s.to ? lerp3(s.at, s.to, ke) : s.at || [0, 0, 0];
      obj.position.set(p[0], p[1], p[2]);
      obj.rotation.set(val(s.rx, ke, 0), val(s.ry, ke, 0), val(s.rz, ke, 0));
      obj.scale.setScalar(val(s.s, ke, 1));
      if (s.float) floatObj(obj, s.float, p, val(s.ry, ke, 0), ke, t);
    }
  }

  function render(shot, local, k, t) {
    if (shot.type && resolveType) shot = resolveType(shot);
    held.clear();
    for (const obj of Object.values(props)) if (obj.parent && obj.parent.type !== 'Scene' && obj.parent.name && /Arm$/.test(obj.parent.name)) { obj.visible = false; }
    const ctx = { focus: [0, 0, 0], light: shot.light, lightOverride: shot.lightOverride };
    const W = prepareSea(shot, k, t);   // lõi biển: đồng hồ/thời tiết/sự kiện TRƯỚC khi đặt vật nổi
    if (W) { ctx.seaWeather = W; ctx.shotLight = shot.light; ctx.shotLightOverride = shot.lightOverride; }
    // env trước (để biết đêm/ngày), camera sau cùng (cần vị trí diễn viên)
    const L = envs.LIGHTS[shot.light || envs.envs[shot.env].light];
    const night = shot.night ?? (W && !shot.light ? W.night : L.night ?? 0);
    // sea2: xoá trạng thái nổi của khung trước (vệt ướt, bọt quanh thân) → mỗi khung tự đặt lại (tất định khi tua)
    for (const wl of houseWet.values()) wl.off();
    for (const e of Object.values(envs.envs)) { e.wet?.off(); for (const w of e.group.userData.waters || []) w.setHull?.(null); }
    placeHouse(shot.house, k, t, night, shot.env);
    const envObj = envs.activate(shot.env);
    if (envObj.room) {
      envObj.room.rotation.set(val(shot.room?.tilt, ease('smooth', k), 0), 0, val(shot.room?.roll, ease('smooth', k), 0));
      if (shot.room?.view && envObj.setView) envObj.setView(shot.room.view);
      if (envObj.fridge) { envObj.fridge.visible = !shot.room?.dense; envObj.fridgeDense.visible = !!shot.room?.dense; }
    }
    envObj.setNight?.(night);
    if (envObj.dirt) { envObj.dirt.visible = !!shot.dirt; envObj.hole.visible = shot.dirt === 'hole'; }
    placeCast(shot.cast, k, t);
    // sea2: env có vật nổi chở người (tàu trong bão) → diễn viên đứng trong toạ độ thế giới đi theo biến đổi của tàu
    //   (đặt trước camera để camera bám đúng chỗ). Shot tạo cho tàu đứng yên ở gốc → ma trận nghỉ = đơn vị.
    { const M = envObj.carry?.(t);
      if (M) for (const [name, a] of Object.entries(actors)) {
        if (!a.root.visible || a.root.parent !== scene || shot.cast?.[name]?.parent || shot.cast?.[name]?.float) continue;
        a.root.updateMatrix(); a.root.matrix.premultiply(M); a.root.matrix.decompose(a.root.position, a.root.quaternion, a.root.scale);
      } }
    placeProps(shot.props, k, t);
    const fxCtx = { t, local, k, shot, actors, house: activeHouse, houses, envs, env: envObj, K, THREE, stage, props, fx, anchorOf };
    for (const f of Object.values(fx)) if (f.obj) f.obj.visible = false;
    if (shot.fx?.cards && fx.cards) { fx.cards.obj.visible = true; fx.cards.update(t, { ...shot.fx.cards, t0: shot.t0 + (shot.fx.cards.t0 || 0) }); }
    if (shot.fx?.dust && fx.dust) { fx.dust.obj.visible = true; fx.dust.update(t, shot.fx.dust.map((b) => ({ ...b, t0: shot.t0 + b.t0 }))); }
    shot.fn?.(fxCtx);
    placeCamera(shot.cam || { at: 'house', dist: 90, h: 10 }, k, t);
    ctx.focus = [camera.position.x, Math.max(0, camera.position.y - 20), camera.position.z];
    envs.use(shot.env, t, ctx);
    applyAutoFx(shot, envObj, k, t, night);
  }

  return { render, anchorOf, get house() { return activeHouse; } };
}
