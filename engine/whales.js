// whales.js — Cá voi cho env 'ocean' (shot s052–s056, lời kể câu 23 "…cá voi bơi quanh chân nó").
// Cá nhà táng GLB có xương (sea/sperm_whale, 13 clip) — tất định: mọi thứ là hàm thuần của t toàn cục.
//   const life = createOceanLife(THREE, A, { seaY: 11 });  g.add(life.group);
//   life.update(t, camera, renderer);                      // gọi mỗi khung trong env.update
//
// Cách dựng mỗi con: rig (Group, đặt tại mặt biển, scale S = stud/m) → model (scale_to_m, hạ -water_y_native)
// ⇒ trong hệ toạ độ của rig: đơn vị = mét, mặt nước gốc của tác giả ở y = 0. Clip điều khiển bằng
// action.time + mixer.update(0) (không đồng hồ) → tua tới/lui ra cùng khung.
// Nước văng (splash.js) đặt trong cùng hệ rig của con nhảy → trọng lực/kích thước giọt tính bằng mét.
import { findSurfaceCrossings, createSplash } from './splash.js';

export const OCEAN_LIFE_ASSETS = ['sea/sperm_whale'];

const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// Kịch bản (giây toàn cục). Mốc shot: s053 62.13–62.77, s054 62.77–64.27, s055 64.30–65.20, s056 65.20–66.90.
export const WHALE_PLAN = {
  S: 3.0,                 // stud / mét → cá dài 16 m ≈ 48 stud (nhà rộng ~38 stud)
  swimSpeed: 0.55,        // clip SWIM chạy chậm lại cho ra dáng con vật lớn
  // Con 1: từ dưới sâu nổi lên trước chân nhà (s054), thở (lưng gù vồng lên), rồi bơi vòng quanh chân nhà
  //   góc a: x = R·cos a, z = R·sin a (a tăng = ngược chiều kim đồng hồ nhìn từ trên). a(63.5) ≈ 0.82 = phía trước nhà, giữa máy s054 và chân nhà.
  circler: { R: 72, w: 0.4, a0: -24.36, rise: [62.6, 63.3], deep: -6, lift: 2.4, breathe: [62.95, 1.15] },
  // Con 2: cùng vòng, đối diện con 1; lặn sâu trong s054 rồi nổi lên trong s055 (cảnh từ trên cao thấy 2 con quanh nhà)
  second: { R: 47, w: 0.4, a0: -24.38 + Math.PI, rise: [63.9, 64.6], deep: -7, lift: 3.0 },
  // Con nhảy: lao lên khỏi mặt nước bên phải chân nhà, hướng về máy s056 (cắt mặt nước lên ~65.36 s, rơi xuống ~66.30 s)
  jumper: { at: [40.7, 13.9], heading: 0.56, t0: 64.976, speed: 0.7 },
};

export function createOceanLife(THREE, A, { seaY = 11, plan = WHALE_PLAN } = {}) {
  const group = new THREE.Group(); group.name = 'ocean_life';
  const ID = 'sea/sperm_whale';
  if (!A || !A.has(ID)) return { group, update() {}, snapshot() {}, unsnap() {} };
  const M = A.manifest()?.byId.get(ID) || {};
  const k = M.scale_to_m || 0.98, wy = M.water_y_native || 4.283, S = plan.S;

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
    return { rig, body, mixer, acts, pose, mat };
  };

  const w1 = makeWhale('whale_circler');
  const w2 = makeWhale('whale_far');
  const wj = makeWhale('whale_jumper');

  // --- nước văng của cú nhảy: tính lúc cắt mặt nước 1 lần lúc init (bản sao riêng, không đụng mixer chính) ---
  const J = plan.jumper;
  const probe = A.instance(ID); probe.scale.setScalar(k); probe.position.y = -wy * k; probe.updateMatrixWorld(true);
  const jumpClip = probe.animations.find((c) => c.name.toUpperCase().startsWith('JUMP-'));
  const events = jumpClip ? findSurfaceCrossings(THREE, probe, new THREE.AnimationMixer(probe), jumpClip, 0) : [];
  const splashRig = new THREE.Group(); splashRig.name = 'whale_splash_rig'; splashRig.scale.setScalar(S); group.add(splashRig);
  const splash = createSplash(THREE, { seed: 5, scale: 21 });   // to hơn chiều dài thật một chút cho cột nước đọc rõ trong khung dọc
  splash.setEvents(events);
  splash.object.traverse((o) => { o.renderOrder = 3; });   // vẽ sau mặt biển (trong suốt)
  splashRig.add(splash.object);
  const jumpDur = jumpClip ? jumpClip.duration : 1.42;

  const fwd = (ry) => [Math.sin(ry), Math.cos(ry)];
  const orbit = (w, t, { R, w: om, a0 }) => {   // vòng tròn quanh gốc (nhà), mặt hướng theo vận tốc
    const a = a0 + om * t;
    w.rig.position.x = Math.cos(a) * R; w.rig.position.z = Math.sin(a) * R; w.rig.rotation.y = -a;
  };
  const _v = new THREE.Vector2();

  function update(t, camera, renderer) {
    const sw = t * plan.swimSpeed;
    // con 1: từ dưới sâu nổi lên, rồi thở (BREATHE: lưng gù vồng lên khỏi mặt nước) và bơi vòng
    const C = plan.circler;
    orbit(w1, t, C);
    const up = smooth(C.rise[0], C.rise[1], t);
    w1.rig.position.y = seaY + (C.deep + (C.lift - C.deep) * up) * S;
    const bt = (t - C.breathe[0]) * C.breathe[1];                 // giây trong clip BREATHE (1.67 s)
    const bw = bt > 0 && bt < 1.67 ? smooth(0, 0.25, bt) * (1 - smooth(1.35, 1.67, bt)) : 0;
    w1.pose([['SWIM', sw, 1 - bw], ['BREATHE', Math.max(0, bt), bw]]);

    const F = plan.second;
    orbit(w2, t, F);
    w2.rig.position.y = seaY + (F.deep + (F.lift - F.deep) * smooth(F.rise[0], F.rise[1], t)) * S;
    w2.pose([['SWIM', sw + 0.31, 1]]);

    // con nhảy: tiếp cận dưới nước theo hướng heading → đứng yên (clip JUMP tự di chuyển thân) → bơi tiếp dưới nước
    const tc = (t - J.t0) * J.speed;                              // giây trong clip JUMP
    const [fx, fz] = fwd(J.heading);
    const before = Math.min(tc, 0), after = Math.max(0, tc - jumpDur);
    const travel = (before + after) * 7 + (tc > jumpDur ? 11 : 0); // m (clip JUMP đẩy thân tới ~11 m)
    wj.rig.position.set(J.at[0] + fx * travel * S, seaY, J.at[1] + fz * travel * S);
    wj.rig.rotation.y = J.heading;
    if (tc < 0 || tc > jumpDur) { wj.rig.position.y = seaY - 6 * S; wj.pose([['SWIM', sw, 1]]); }
    else wj.pose([['JUMP', tc, 1]]);
    wj.rig.visible = tc > -1.5 && tc < jumpDur + 1.5;

    splashRig.position.set(J.at[0], seaY, J.at[1]); splashRig.rotation.y = J.heading;
    // giọt nước: kích thước điểm theo pixel thật của canvas (đổi theo độ phân giải xuất) và theo scale của rig
    let px = 1000;
    if (camera && renderer) { renderer.getDrawingBufferSize(_v); px = _v.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); }
    splash.update(tc, 0, px * S * 0.6);   // 0.6: giọt nhỏ hơn bản demo → ra bụi nước, không thành bong bóng
    splash.object.visible = tc > -0.1 && tc < jumpDur + 4;
  }
  // vẻ ướt: lên khỏi mặt nước thì bóng hơn (roughness thấp, ánh nhẹ), chìm thì mờ; hàm thuần của vị trí rig
  const wet = (w, aboveM) => { const k2 = smooth(-1.5, 1.5, aboveM); w.mat.roughness = 0.62 - 0.34 * k2; w.mat.emissive.setRGB(0.05 * k2, 0.07 * k2, 0.09 * k2); };
  // --- CHỈ cho ảnh bưu thiếp (engine/snap.js): 1 con nổi lên thở + cột nước phun ở lỗ thở ---
  // Cột phun: các cụm bụi nước trắng xếp hình phễu nghiêng về trước-trái (kiểu cá nhà táng), toạ độ rig = mét.
  // Ẩn mặc định; snapshot() bật, unsnap() tắt. update(t) mỗi khung đặt lại vị trí/pose cá → shot biển không đổi.
  const spout = new THREE.Group(); spout.name = 'whale_spout'; spout.visible = false;
  {
    const hs = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
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
  }
  w1.rig.add(spout);
  const hidden = [];
  // snapshot({ at:[x,z], heading, lift (m), clip giây BREATHE, spout:[x,y,z] trong rig (m) })
  function snapshot({ at = [0, 0], heading = 0, lift = 1.2, breathe = 0.8, clips = null, spoutAt = [0, 2.6, 6.2], spoutScale = 1 } = {}) {
    for (const w of [w2, wj]) { hidden.push([w.rig, w.rig.visible]); w.rig.visible = false; }
    hidden.push([splash.object, splash.object.visible]); splash.object.visible = false;
    w1.rig.position.set(at[0], seaY + lift * S, at[1]); w1.rig.rotation.y = heading;
    w1.pose(clips || [['BREATHE', breathe, 1]]);
    wet(w1, 2);
    spout.position.set(...spoutAt); spout.scale.setScalar(spoutScale); spout.visible = true;
    w1.rig.updateMatrixWorld(true);
  }
  function unsnap() { spout.visible = false; while (hidden.length) { const [o, v] = hidden.pop(); o.visible = v; } }
  const _update = update;
  function update2(t, camera, renderer) {
    _update(t, camera, renderer);
    wet(w1, (w1.rig.position.y - seaY) / S); wet(w2, (w2.rig.position.y - seaY) / S);
    const tc = (t - J.t0) * J.speed; wet(wj, tc > 0 && tc < jumpDur ? 2 : -2);
  }
  return { group, update: update2, events, whales: { circler: w1, far: w2, jumper: wj }, splash, snapshot, unsnap };
}
