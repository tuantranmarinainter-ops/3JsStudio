// shots.js — Đạo diễn: biến 1 shot (dữ liệu) + t cục bộ thành camera, diễn viên, nhà, env, đạo cụ.
//
// Shot (episodes/epNNN/shots.js), mọi trường trừ id/f/env đều tuỳ chọn:
//   { id, f:[f0,f1], env, light, line,
//     cam:   { at:'hero'|'house'|'obj:<tên>'|[x,y,z], look:[dx,dy,dz], yaw, h, dist, fov, roll, rel,
//              yaw2, h2, dist2, fov2, look2, ease, shake }            // quỹ đạo quanh chủ thể
//         |  { p:[x,y,z], l:[x,y,z], fov, p2, l2, fov2, ease, shake }  // tuyệt đối
//     house: { style, at:[x,z], to:[x,z], ry, legsOut, lift, kneel, shake, door, walk0, pitch, roll, night }
//     cast:  { hero: { at:[x,y,z], to, ry, ry2, anim, from, face, speed, tOff, lie, parent:'house', hold } , … }
//     props: { <tên>: { at, to, ry, rx, rz, s, parent } },  fx: { cards:{at,t0}, dust:[{at,t0}] },
//     room:  { tilt, roll, view, dense },  fn(ctx) }
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
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
// tiến độ cục bộ trong một đoạn con của shot: win = [k0,k1]
const sub = (k, win) => (win ? clamp01((k - win[0]) / (win[1] - win[0])) : k);

export function createDirector({ THREE, stage, envs, K, actors, houses, props = {}, fx = {} }) {
  const { scene, camera } = stage;
  const _v = new THREE.Vector3();
  const tmpObj = new THREE.Object3D();

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
    if (c.shake) { const s = c.shake; pos = [pos[0] + Math.sin(t * 23) * s * 0.3, pos[1] + Math.sin(t * 31 + 1) * s * 0.5, pos[2] + Math.cos(t * 19) * s * 0.3]; }
    const roll = val(c.roll, ke, 0);
    stage.setCamera(pos, look, { fov, roll, focusShadow: c.shadow !== false });
    if (c.shadowAt) stage.shadowFocus(anchorOf(c.shadowAt));
  }

  function placeHouse(spec, k, t, night) {
    for (const h of Object.values(houses)) h.root.visible = false;
    activeHouse = null;
    if (!spec) return;
    const h = houses[spec.style || 'family']; h.root.visible = true; activeHouse = h;
    const walking = !!spec.to;
    const kw = sub(k, spec.win);
    const ke = walking ? kw : ease(spec.ease || 'smooth', kw);
    const a = spec.at || [0, 0], b = spec.to || a;
    const x = a[0] + (b[0] - a[0]) * ke, z = a[1] + (b[1] - a[1]) * ke;
    h.root.position.set(x, spec.y ?? 0, z); h.root.rotation.y = val(spec.ry, ke, 0);
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]) * ke + (spec.walk0 || 0);
    h.pose({ legsOut: val(spec.legsOut, ke, 1), lift: val(spec.lift, ke, 1), kneel: val(spec.kneel, ke, 0), walk: walking ? dist : 0,
      walking, shake: val(spec.shake, ke, 0), pitch: val(spec.pitch, ke, 0), roll: val(spec.roll, ke, 0), t });
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
      const at = (s.tOff || 0) + (s.animFromShot ? k * (s.animDur || 1) : t);
      const opt = { speed: s.speed, amp: s.amp, from: s.from, mix: s.from ? ease('smooth', clamp01(sub(k, s.mixWin || [0, 0.3]))) : undefined };
      const pose = a.animate(anim, at, opt);
      const want = s.face || pose.face || a._defaultFace;
      if (want && a.options.face !== want) a.setFace(want);
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
    const arm = side === 'holdL' ? a.parts.leftArm : a.parts.rightArm;
    if (obj.parent !== arm) arm.add(obj);
    const o = typeof spec === 'object' ? spec : {};
    obj.position.set(...(o.at || [side === 'holdL' ? -0.6 : 0.6, -1.9, 0.9]));
    obj.rotation.set(...(o.rot || [0, 0, 0]));
    obj.scale.setScalar(o.s || 1);
    obj.visible = true; held.set(name, true);
  }

  function placeProps(spec = {}, k) {
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
    }
  }

  function render(shot, local, k, t) {
    held.clear();
    for (const obj of Object.values(props)) if (obj.parent && obj.parent.type !== 'Scene' && obj.parent.name && /Arm$/.test(obj.parent.name)) { obj.visible = false; }
    const ctx = { focus: [0, 0, 0], light: shot.light, lightOverride: shot.lightOverride };
    // env trước (để biết đêm/ngày), camera sau cùng (cần vị trí diễn viên)
    const L = envs.LIGHTS[shot.light || envs.envs[shot.env].light];
    const night = shot.night ?? L.night ?? 0;
    placeHouse(shot.house, k, t, night);
    const envObj = envs.activate(shot.env);
    if (envObj.room) {
      envObj.room.rotation.set(val(shot.room?.tilt, ease('smooth', k), 0), 0, val(shot.room?.roll, ease('smooth', k), 0));
      if (shot.room?.view && envObj.setView) envObj.setView(shot.room.view);
      if (envObj.fridge) { envObj.fridge.visible = !shot.room?.dense; envObj.fridgeDense.visible = !!shot.room?.dense; }
    }
    envObj.setNight?.(night);
    if (envObj.dirt) { envObj.dirt.visible = !!shot.dirt; envObj.hole.visible = shot.dirt === 'hole'; }
    placeCast(shot.cast, k, t);
    placeProps(shot.props, k);
    const fxCtx = { t, local, k, shot, actors, house: activeHouse, houses, envs, env: envObj, K, THREE, stage, props, fx, anchorOf };
    for (const f of Object.values(fx)) if (f.obj) f.obj.visible = false;
    if (shot.fx?.cards && fx.cards) { fx.cards.obj.visible = true; fx.cards.update(t, { ...shot.fx.cards, t0: shot.t0 + (shot.fx.cards.t0 || 0) }); }
    if (shot.fx?.dust && fx.dust) { fx.dust.obj.visible = true; fx.dust.update(t, shot.fx.dust.map((b) => ({ ...b, t0: shot.t0 + b.t0 }))); }
    shot.fn?.(fxCtx);
    placeCamera(shot.cam || { at: 'house', dist: 90, h: 10 }, k, t);
    ctx.focus = [camera.position.x, Math.max(0, camera.position.y - 20), camera.position.z];
    envs.use(shot.env, t, ctx);
  }

  return { render, anchorOf, get house() { return activeHouse; } };
}
