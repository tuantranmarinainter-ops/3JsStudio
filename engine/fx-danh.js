// fx-danh.js — VFX ĐÁNH NHAU tất định: aura, beam, hitSpark, speedLines, shake.
// Học ý (không chép mã, không dùng sprite) từ vfx.py/fight.py của nocodehack-roblox-engine (Apache-2.0) — xem output/vfx-danh-nhau/ghi-cong.md.
//
// Mọi thứ là hàm thuần của t: vị trí hạt = f(seed, chỉ số, t − t0); ngẫu nhiên chỉ qua rng(seed) của stage.js (không Math.random/giờ thực).
// Một Mesh duy nhất (một shader) gồm các tấm "quad" quay về camera, vẽ cộng sáng; hình dạng (lửa/vệt/sao/vòng/thân tia) vẽ bằng shader.
//
//   const vfx = createVfxDanh(THREE);  scene.add(vfx.obj);
//   stage.onFrame((t) => { stage.setCamera(...); vfx.update(t, EVENTS, camera); applyShake(camera, t, EVENTS); });
//
// EVENTS = [
//   { kind:'aura',  at: obj3D|[x,y,z], t0, t1, color:'#FFBF32', k:1, seed:7 },        // hào quang quanh người, at = chân nhân vật
//   { kind:'beam',  from, to, t0, t1, color:'#49BFFF', k:1 },                          // tia năng lượng (mọc 0,14 s, tắt 0,12 s)
//   { kind:'hit',   at, t0, color:'#FFF19A', k:1 },                                    // tia lửa va chạm (0,18 s)
//   { kind:'speed', t0, t1, color:'#D5F3FF', k:1, n:18 },                              // vệt tốc độ bám camera
//   { kind:'shake', t0, t1, amp:0.25 },                                                // rung camera (đơn vị = stud)
// ]
// Mỗi loại có ô bật/tắt riêng trong trình phát (post.js FX_DEFAULTS, MẶC ĐỊNH TẮT): vfxAura, vfxBeam, vfxHitSpark, vfxSpeedLines, vfxShake
// → đọc qua globalThis.__autoFx[key] === true. Tắt hết = update() không vẽ gì, applyShake() không đụng camera (tập cũ không đổi).
import { rng, clamp01 } from './stage.js';

export const VFX_DANH_FX = { aura: 'vfxAura', beam: 'vfxBeam', hit: 'vfxHitSpark', speed: 'vfxSpeedLines', shake: 'vfxShake' };
const on = (kind) => globalThis.__autoFx?.[VFX_DANH_FX[kind]] === true;
const S = { SOFT: 0, FLAME: 1, STREAK: 2, STAR: 3, RING: 4, BEAM: 5 };

const VS = 'attribute vec4 aCol; attribute float aShape; varying vec2 vUv; varying vec4 vCol; varying float vShape; void main(){ vUv = uv; vCol = aCol; vShape = aShape; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const FS = `varying vec2 vUv; varying vec4 vCol; varying float vShape;
void main(){
  vec2 c = vUv - 0.5; float u = vUv.x, v = vUv.y, f = 0.0, hot = 0.0;
  if (vShape < 0.5) { f = pow(max(0.0, 1.0 - length(c) * 2.0), 2.0); }
  else if (vShape < 1.5) { float w = 0.44 * pow(max(1.0 - v, 0.0), 0.85) * (0.3 + 0.7 * smoothstep(0.0, 0.3, v)); f = (1.0 - smoothstep(w * 0.25, w, abs(c.x))) * smoothstep(0.0, 0.1, v) * (1.0 - 0.35 * v); hot = f * f * (1.0 - v); }
  else if (vShape < 2.5) { float ac = 1.0 - abs(c.x) * 2.0; f = pow(max(ac, 0.0), 1.6) * smoothstep(0.0, 0.7, v) * smoothstep(1.0, 0.92, v) + 0.0; hot = f * f; }
  else if (vShape < 3.5) { vec2 a = abs(c); f = exp(-a.x * 22.0 - a.y * 2.6) + exp(-a.y * 22.0 - a.x * 2.6) + 0.6 * pow(max(0.0, 1.0 - length(c) * 3.0), 2.0); hot = f * 0.5; }
  else if (vShape < 4.5) { float d = length(c) * 2.0; float q = (d - 0.8) / 0.12; f = exp(-q * q) * smoothstep(1.0, 0.9, d); hot = f * 0.4; }
  else { float ac = 1.0 - abs(c.x) * 2.0; f = pow(max(ac, 0.0), 1.4) * smoothstep(0.0, 0.04, v) * smoothstep(1.0, 0.96, v); hot = f * f; }
  gl_FragColor = vec4(vCol.rgb * (f + hot * 0.7), vCol.a * clamp(f, 0.0, 1.0));
#include <colorspace_fragment>
}`;

const hex = (THREE, h) => new THREE.Color(h);

export function createVfxDanh(THREE, { cap = 1024 } = {}) {
  const geo = new THREE.BufferGeometry();
  const P = new Float32Array(cap * 12), UV = new Float32Array(cap * 8), C = new Float32Array(cap * 16), SH = new Float32Array(cap * 4);
  const idx = new Uint16Array(cap * 6);
  for (let i = 0; i < cap; i++) { const b = i * 4; idx.set([b, b + 1, b + 2, b, b + 2, b + 3], i * 6); UV.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8); }
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  geo.setAttribute('aCol', new THREE.BufferAttribute(C, 4)); geo.setAttribute('aShape', new THREE.BufferAttribute(SH, 1)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const obj = new THREE.Mesh(geo, mat); obj.name = 'fx_danh'; obj.frustumCulled = false; obj.renderOrder = 20; obj.visible = false;
  let n = 0;
  const tmpV = new THREE.Vector3(), camP = new THREE.Vector3(), cR = new THREE.Vector3(), cU = new THREE.Vector3(), cF = new THREE.Vector3(), colA = new THREE.Color();

  // ---- ghi 1 quad: tâm c, nửa-trục a (u), nửa-trục b (v), màu rgba, hình ----
  function quad(cx, cy, cz, ax, ay, az, bx, by, bz, col, a, shape, gain = 1) {
    if (n >= cap || a <= 0.002) return;
    const o = n * 12;
    P[o] = cx - ax - bx; P[o + 1] = cy - ay - by; P[o + 2] = cz - az - bz;
    P[o + 3] = cx + ax - bx; P[o + 4] = cy + ay - by; P[o + 5] = cz + az - bz;
    P[o + 6] = cx + ax + bx; P[o + 7] = cy + ay + by; P[o + 8] = cz + az + bz;
    P[o + 9] = cx - ax + bx; P[o + 10] = cy - ay + by; P[o + 11] = cz - az + bz;
    for (let j = 0; j < 4; j++) { const q = (n * 4 + j) * 4; C[q] = col.r * gain; C[q + 1] = col.g * gain; C[q + 2] = col.b * gain; C[q + 3] = Math.min(1, a); SH[n * 4 + j] = shape; }
    n++;
  }
  // quad dọc trục (vệt/thân tia): v chạy từ p0 → p1, bề ngang quay về camera
  function axisQuad(x0, y0, z0, x1, y1, z1, halfW, col, a, shape, gain = 1) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dy, dz); if (L < 1e-6) return;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, mz = (z0 + z1) / 2;
    tmpV.set(dx / L, dy / L, dz / L); const vx = camP.x - mx, vy = camP.y - my, vz = camP.z - mz;
    let rx = tmpV.y * vz - tmpV.z * vy, ry = tmpV.z * vx - tmpV.x * vz, rz = tmpV.x * vy - tmpV.y * vx; let rl = Math.hypot(rx, ry, rz);
    if (rl < 1e-5) { rx = cR.x; ry = cR.y; rz = cR.z; rl = 1; }
    const k = halfW / rl; quad(mx, my, mz, rx * k, ry * k, rz * k, dx / 2, dy / 2, dz / 2, col, a, shape, gain);
  }
  // quad vuông quay về camera (sao, vòng, quầng): nửa cạnh h
  function card(x, y, z, h, col, a, shape, roll = 0, gain = 1) {
    const cs = Math.cos(roll) * h, sn = Math.sin(roll) * h;
    quad(x, y, z, cR.x * cs + cU.x * sn, cR.y * cs + cU.y * sn, cR.z * cs + cU.z * sn, -cR.x * sn + cU.x * cs, -cR.y * sn + cU.y * cs, -cR.z * sn + cU.z * cs, col, a, shape, gain);
  }
  const pos = (at, out) => {
    if (Array.isArray(at)) return out.set(at[0], at[1], at[2]);
    if (at?.getWorldPosition) { at.updateWorldMatrix(true, false); return at.getWorldPosition(out); }
    return out.set(at.x, at.y, at.z);
  };
  const P0 = new THREE.Vector3(), P1 = new THREE.Vector3();
  const fade = (t, t0, t1, a = 0.15, b = 0.2) => Math.min(1, clamp01((t - t0) / a), clamp01((t1 - t) / b));

  // ---- AURA: lưỡi lửa mọc quanh người, bay lên, đời ~0,3 s lệch pha; quầng nóng phía sau; chừa vùng trước mặt ----
  function aura(e, t) {
    const { t0, t1, k = 1, seed = 7 } = e, col = hex(THREE, e.color || '#FFBF32'), f = fade(t, t0, t1, 0.18, 0.25); if (f <= 0) return;
    pos(e.at, P0); const N = e.tongues ?? 14, L = 0.3, H = 3.8 * k, W = 1.9 * k;
    // hướng "phải"/"sâu" của camera trên mặt phẳng ngang để chừa mặt
    const dxc = camP.x - P0.x, dzc = camP.z - P0.z, dl = Math.hypot(dxc, dzc) || 1, fxw = dxc / dl, fzw = dzc / dl, rxw = fzw, rzw = -fxw;
    for (let i = 0; i < N; i++) {
      const off = rng(seed * 977 + i * 131)(), u = (t - t0) / L + off, cyc = Math.floor(u), ph = u - cyc;
      const r = rng(seed * 7919 + i * 131 + cyc * 104729); const a = r() * Math.PI * 2, rad = (0.9 + r() * 0.8) * k, hs = 0.75 + r() * 0.5;
      let lat = Math.cos(a) * rad, dep = Math.sin(a) * rad;
      if (dep > 0 && Math.abs(lat) < 1.15 * k) dep = -dep;             // không để lưỡi lửa nằm ngay trước mặt nhân vật
      const grow = Math.pow(Math.sin(Math.PI * clamp01(ph / 0.95)), 0.8) * f, h = H * hs * grow;
      const bx = P0.x + rxw * lat + fxw * dep, bz = P0.z + rzw * lat + fzw * dep, by = P0.y + 0.2 + ph * 1.5 * k;
      quad(bx, by + h / 2, bz, rxw * W * grow * 0.5, 0, rzw * W * grow * 0.5, 0, h / 2, 0, col, 0.85, S.FLAME, 1.3);
    }
    // quầng nóng phía sau thân (đẩy xa camera 1 stud), nhịp thở
    const br = 1 + 0.08 * Math.sin(t * 9);
    for (let j = 0; j < 2; j++) card(P0.x - fxw * (1 + j * 0.4), P0.y + 2.4 * k, P0.z - fzw * (1 + j * 0.4), (2.6 + j * 1.0) * k * br, col, (0.26 - j * 0.1) * f, S.SOFT);
  }

  // ---- HIT SPARK: loé trắng + quầng + vòng xung kích + vệt bắn tỏa; 0,18 s ----
  function hit(e, t) {
    const { t0, k = 1 } = e, L = 0.18, u = (t - t0) / L; if (u < 0 || u > 1) return;
    const col = hex(THREE, e.color || '#FFF19A'), white = colA.set('#ffffff').clone(); pos(e.at, P0);
    const s = u < 0.25 ? 0.5 + u * 2 : 1.0 - (u - 0.25) * 0.35, al = 1 - Math.pow(u, 2.2), seed = e.seed ?? Math.round(t0 * 100) + 3;
    card(P0.x, P0.y, P0.z, 1.5 * k * (0.35 + 1.0 * Math.min(1, u * 4)), col, 0.85 * al, S.SOFT);
    card(P0.x, P0.y, P0.z, 1.25 * k * s, white, al, S.STAR, rng(seed)() * 6.28, 1.4);
    card(P0.x, P0.y, P0.z, (0.3 + 1.9 * u) * k, col, 0.9 * (1 - u), S.RING);
    const r = rng(seed * 31 + 5);
    for (let i = 0; i < 8; i++) {
      const a = r() * 6.2832, el = (r() - 0.5) * 1.6, sp = (7 + r() * 5) * k, len = (0.9 + r() * 0.8) * k;
      const dx = Math.cos(a) * Math.cos(el), dy = Math.sin(el) + 0.2, dz = Math.sin(a) * Math.cos(el), dn = Math.hypot(dx, dy, dz);
      const d = sp * L * Math.pow(u, 0.7), nx = dx / dn, ny = dy / dn, nz = dz / dn, head = d, tail = Math.max(0, d - len * (1 - u * 0.5));
      axisQuad(P0.x + nx * tail, P0.y + ny * tail - 3 * u * u * 0.4, P0.z + nz * tail, P0.x + nx * head, P0.y + ny * head - 3 * u * u * 0.4, P0.z + nz * head, 0.09 * k, white, 0.95 * al, S.STREAK, 1.3);
    }
  }

  // ---- BEAM: halo + thân màu + lõi trắng, mọc 0,14 s, tắt 0,12 s; sét xẹt dọc thân (đổi mỗi 1/24 s); loé nòng + đầu; tia lửa chỗ trúng ----
  function beam(e, t) {
    const { t0, t1, k = 1 } = e; if (t < t0 || t > t1) return;
    pos(e.from, P0); pos(e.to, P1); const col = hex(THREE, e.color || '#49BFFF'), white = new THREE.Color('#ffffff');
    const grow = Math.min(1, (t - t0) / 0.14), fd = Math.min(1, (t1 - t) / 0.12), pulse = fd * (1 + 0.12 * Math.sin((t - t0) * 58)); if (fd <= 0) return;
    const dx = P1.x - P0.x, dy = P1.y - P0.y, dz = P1.z - P0.z, tx = P0.x + dx * grow, ty = P0.y + dy * grow, tz = P0.z + dz * grow, Ls = Math.hypot(dx, dy, dz) * grow;
    axisQuad(P0.x, P0.y, P0.z, tx, ty, tz, 0.95 * k * pulse, col, 0.5, S.BEAM, 1);
    axisQuad(P0.x, P0.y, P0.z, tx, ty, tz, 0.45 * k * pulse, col, 0.95, S.BEAM, 1.0);
    axisQuad(P0.x, P0.y, P0.z, tx, ty, tz, 0.17 * k * pulse, white, 1, S.BEAM, 1.5);
    const fr = Math.floor((t - t0) * 24), nseg = Math.max(2, Math.min(7, Math.floor(Ls / 2)));
    for (let i = 0; i < nseg; i++) {   // sét: mỗi đoạn nhảy ngang, đổi theo khung 24 fps
      const r = rng(fr * 131 + i * 17 + 9), a0 = i / nseg, a1 = (i + 1) / nseg, jx = (r() - 0.5) * 1.1 * k, jy = (r() - 0.5) * 1.1 * k;
      if (a1 * grow < 0.001) continue;
      axisQuad(P0.x + dx * a0 * grow, P0.y + dy * a0 * grow + jy * 0.5, P0.z + dz * a0 * grow + jx * 0.5, P0.x + dx * a1 * grow, P0.y + dy * a1 * grow + jy, P0.z + dz * a1 * grow + jx, 0.07 * k, white, 0.3 + 0.6 * r(), S.BEAM, 1.2);
    }
    card(P0.x, P0.y, P0.z, 1.3 * k * pulse, col, 0.6 * fd, S.SOFT); card(P0.x, P0.y, P0.z, 1.0 * k * pulse, white, fd, S.STAR, (t - t0) * 0.35, 1.3);   // nòng
    card(tx, ty, tz, 1.5 * k * pulse, col, 0.6 * fd, S.SOFT); card(tx, ty, tz, 1.1 * k * pulse, white, fd, S.STAR, -(t - t0) * 0.5, 1.3);              // đầu tia
    if (grow >= 1) {   // tia lửa bắn ở chỗ trúng, đợt mới mỗi 3 khung
      const bf = Math.floor((t - t0) * 8), ph = (t - t0) * 8 - bf;
      for (let i = 0; i < 5; i++) {
        const r = rng(bf * 977 + i * 13 + 41), a = r() * 6.2832, sp = (3 + r() * 3) * k, el = 0.3 + r() * 0.9, d = sp * ph * 0.125, up = el * sp * ph * 0.125 - 6 * (ph * 0.125) ** 2;
        const hx = Math.cos(a) * d, hz = Math.sin(a) * d; axisQuad(P1.x + hx * 0.7, P1.y + up * 0.7, P1.z + hz * 0.7, P1.x + hx, P1.y + up, P1.z + hz, 0.07 * k, white, 0.9 * (1 - ph) * fd, S.STREAK, 1.3);
      }
    }
  }

  // ---- SPEED LINES: vệt tỏa từ giữa khung ra rìa, bám camera, đổi mỗi 0,1 s; chừa vùng giữa (mặt) ----
  function speed(e, t, cam) {
    const { t0, t1, k = 1, seed = 11 } = e, f = fade(t, t0, t1, 0.08, 0.1); if (f <= 0) return;
    const col = hex(THREE, e.color || '#D5F3FF'), N = e.n ?? 18, D = 2.0, hH = D * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), hW = hH * cam.aspect, CY = 0.1;
    for (let i = 0; i < N; i++) {
      const u = (t - t0) / CY + rng(seed * 331 + i * 7)(), cyc = Math.floor(u), ph = u - cyc, r = rng(seed * 6007 + i * 53 + cyc * 3571);
      const th = (i + r() * 0.8) / N * 6.2832, rho = 0.62 + 0.5 * r(), ln = (0.18 + 0.2 * r()) * k, sl = 1 + ph * 0.2;   // ρ theo nửa-khung; ≥0,62 nên không đè mặt (mặt nhân vật nằm trong ~0,5)
      const c = Math.cos(th), s = Math.sin(th), r0 = rho * sl, r1 = r0 + ln, w = 0.0045 * (1 + 2 * r()) * k;
      const px = (R) => cam.position.x + cF.x * D + (cR.x * c * hW + cU.x * s * hH) * R, py = (R) => cam.position.y + cF.y * D + (cR.y * c * hW + cU.y * s * hH) * R, pz = (R) => cam.position.z + cF.z * D + (cR.z * c * hW + cU.z * s * hH) * R;
      const al = 0.6 * f * Math.sin(Math.PI * ph) ** 0.5, h = w * D * 2.5;
      // bề ngang vuông góc phương toả trong mặt phẳng ảnh
      const wx = (-cR.x * s * hW + cU.x * c * hH), wy = (-cR.y * s * hW + cU.y * c * hH), wz = (-cR.z * s * hW + cU.z * c * hH), wl = Math.hypot(wx, wy, wz) || 1, kk = h / wl;
      quad((px(r0) + px(r1)) / 2, (py(r0) + py(r1)) / 2, (pz(r0) + pz(r1)) / 2, wx * kk, wy * kk, wz * kk, (px(r1) - px(r0)) / 2, (py(r1) - py(r0)) / 2, (pz(r1) - pz(r0)) / 2, col, al, S.STREAK, 1.1);
    }
  }

  const DO = { aura, beam, hit, speed };
  return {
    obj,
    get soQuad() { return n; },
    // Gọi MỖI khung sau khi đặt camera. Không có sự kiện bật → ẩn, không vẽ gì.
    update(t, events = [], camera) {
      n = 0; camera.updateMatrixWorld(true); camP.setFromMatrixPosition(camera.matrixWorld);
      const m = camera.matrixWorld.elements; cR.set(m[0], m[1], m[2]); cU.set(m[4], m[5], m[6]); cF.set(-m[8], -m[9], -m[10]);
      for (const e of events) { const fn = DO[e.kind]; if (fn && on(e.kind)) fn(e, t, camera); }
      geo.setDrawRange(0, n * 6); for (const a of ['position', 'aCol', 'aShape']) geo.attributes[a].needsUpdate = true; obj.visible = n > 0;
      return n;
    },
  };
}

// RUNG CAMERA: dời camera theo phương phải/lên của chính nó (cuối hàm onFrame, sau setCamera). Tắt ô vfxShake = không đụng camera.
export function applyShake(camera, t, events = []) {
  if (!on('shake')) return 0;
  let dx = 0, dy = 0, tot = 0;
  for (const e of events) {
    if (e.kind !== 'shake' || t < e.t0 || t > e.t1) continue;
    const u = (t - e.t0) / (e.t1 - e.t0), env = (1 - u) * (1 - u), s = (e.seed ?? 3) * 1.7, a = (e.amp ?? 0.25) * env;
    dx += a * (Math.sin(t * 97 + s) + 0.5 * Math.sin(t * 163 + s * 2)); dy += a * (Math.cos(t * 109 + s) + 0.5 * Math.sin(t * 181 + s * 3)); tot += a;
  }
  if (!tot) return 0;
  camera.updateMatrixWorld(true); const m = camera.matrixWorld.elements;
  camera.position.x += m[0] * dx + m[4] * dy; camera.position.y += m[1] * dx + m[5] * dy; camera.position.z += m[2] * dx + m[6] * dy; camera.updateMatrixWorld(true);
  return tot;
}
