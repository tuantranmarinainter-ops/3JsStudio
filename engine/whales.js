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
  circler: { R: 47, w: 0.4, a0: -24.58, rise: [62.6, 63.3], deep: -6, lift: 3.2, breathe: [62.95, 1.15] },
  // Con 2: cùng vòng, đối diện con 1; lặn sâu trong s054 rồi nổi lên trong s055 (cảnh từ trên cao thấy 2 con quanh nhà)
  second: { R: 47, w: 0.4, a0: -24.38 + Math.PI, rise: [63.9, 64.6], deep: -7, lift: 3.0 },
  // Con nhảy: lao lên khỏi mặt nước bên phải chân nhà, hướng về máy s056 (cắt mặt nước lên ~65.36 s, rơi xuống ~66.30 s)
  jumper: { at: [40.7, 13.9], heading: 0.56, t0: 64.976, speed: 0.7 },
};

export function createOceanLife(THREE, A, { seaY = 11, plan = WHALE_PLAN } = {}) {
  const group = new THREE.Group(); group.name = 'ocean_life';
  const ID = 'sea/sperm_whale';
  if (!A || !A.has(ID)) return { group, update() {} };
  const M = A.manifest()?.byId.get(ID) || {};
  const k = M.scale_to_m || 0.98, wy = M.water_y_native || 4.283, S = plan.S;

  const mats = new Map();
  const whaleMat = (m) => {
    if (!mats.has(m)) mats.set(m, new THREE.MeshStandardMaterial({ color: '#62738a', roughness: 0.55, metalness: 0, side: THREE.DoubleSide, name: 'whale_lit' }));
    return mats.get(m);
  };
  const makeWhale = (name) => {
    const rig = new THREE.Group(); rig.name = name; rig.scale.setScalar(S); group.add(rig);
    const body = A.instance(ID, { name: name + '_model', castShadow: false });
    body.scale.setScalar(k); body.position.y = -wy * k; rig.add(body);
    body.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;   // xương nhảy ra khỏi khung bind → đừng cull
      // GLB gốc dùng unlit + texture gần như đen → trên biển sáng chỉ thấy bóng đen; đổi sang vật liệu có ánh sáng màu xám đá
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      o.material = whaleMat(o.material);
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
    return { rig, body, mixer, acts, pose };
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
  return { group, update, events, whales: { circler: w1, far: w2, jumper: wj }, splash };
}
