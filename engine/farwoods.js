// farwoods.js — RỪNG XA bằng thẻ vẽ tay luôn quay mặt về camera (kiểu game cũ / Painted Valley). Hàng nghìn cây = 1 Mesh instanced + 1 ShaderMaterial (1 program).
//
// Cách dùng:
//   const wind = createWind(THREE, {...});                       // tuỳ chọn; không có thì cây không đung đưa
//   const fw = createFarwoods(THREE, { wind, seed: 5, center: [0, 0], ring: [80, 220], count: 3000,
//                                      heightAt: (x, z) => 0, avoid: (x, z) => false,
//                                      size: [9, 18],                       // chiều cao cây (m)
//                                      kinds: { leafy: 1, pine: 0.6, palm: 0 },   // hoặc ['leafy','pine'] (trọng số bằng nhau)
//                                      colors: { lit: '#7fae4a', shade: '#2f5a2e', trunk: '#5b4128' }, clumps: true });
//   scene.add(fw.group);
//   fw.lightFrom(sun, hemi);  fw.fogFrom(scene.fog);              // ánh sáng + sương từ cảnh (chia π như grass.js); gọi lại khi đổi shot
//   mỗi khung:  fw.update(t, camera);                             // hàm thuần của t: chỉ đặt uniform (gọi wind.update(t))
//   fw.set({ colors:{lit,shade,trunk}, sunDir, sunColor, skyColor, nearFade:[a,b], visible }) · fw.dispose()
// Đặt cây MỘT LẦN trên CPU bằng mulberry32(seed): clumps = tâm cụm + lệch → khối rừng, không phải chấm đều. avoid(x,z) → true = bỏ chỗ đó.
// Atlas vẽ MỘT LẦN bằng code (4×2 ô 256²): 0-3 cây tròn tán, 4-5 thông, 6-7 dừa. Kênh R = độ sáng (ánh sáng hoạ sĩ từ trên-trái),
//   G = mặt nạ (alphaTest/discard, không sắp xếp trong suốt), B = thân cây (nhân màu thân). Ô chừa lề trong suốt → không thấy mép thẻ.
// Thẻ trụ (xoay quanh Y về phía camera); ngọn đung đưa theo gió chung rất nhẹ; cây gần camera (nearFade) co dần về 0 → không pop.
// mesh.userData.noAO = true · name 'farwoods' · không đổ bóng. Tất định: không Math.random, không đồng hồ.
import * as THREE_NS from 'three';

const CELL = 256, COLS = 4, ROWS = 2;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash2 = (i, j) => { let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const KIND_BASE = { leafy: [0, 4], pine: [4, 2], palm: [6, 2] };

// ---------------- atlas vẽ bằng code ----------------
function makeAtlasData() {
  const W = CELL * COLS, H = CELL * ROWS, d = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { d[i * 4] = 140; d[i * 4 + 1] = 0; d[i * 4 + 2] = 0; d[i * 4 + 3] = 255; }
  const LX = -0.55, LY = 0.65, LZ = 0.52, LL = Math.hypot(LX, LY, LZ);
  const put = (ox, oy, i, j, lit, cov, trunk) => {
    if (cov <= 0) return;
    const o = ((oy + j) * W + ox + i) * 4;
    if (cov >= 0.5 || d[o + 1] < 128) { d[o] = clamp(lit) * 255; d[o + 2] = trunk ? 255 : 0; }
    if (cov * 255 > d[o + 1]) d[o + 1] = cov * 255;
  };
  const speck = (i, j, ox, oy) => (hash2(((ox + i) >> 2), ((oy + j) >> 2)) - 0.5) * 0.14;
  const post = (l) => { const q = Math.round(l * 4) / 4; return l * 0.7 + q * 0.3; };       // hơi "bệt màu" như tranh vẽ
  // thân thẳng thon: u giữa cx, từ v0 đến v1, nửa rộng w0→w1
  const trunk = (ox, oy, cxf, v0, v1, w0, w1, lean = 0) => {
    for (let j = Math.floor(v0 * CELL); j < v1 * CELL; j++) for (let i = 0; i < CELL; i++) {
      const v = j / CELL, s = (v - v0) / (v1 - v0), uc = cxf(v) + lean * s * s, w = w0 + (w1 - w0) * s, u = (i + 0.5) / CELL;
      const cov = clamp((w - Math.abs(u - uc)) * CELL / 1.5 + 0.5);
      if (cov > 0) put(ox, oy, i, j, 0.3 + 0.28 * clamp((uc - u) / w * 0.5 + 0.5) + speck(i, j, ox, oy) * 0.5, cov, true);
    }
  };
  const blob = (ox, oy, cx, cy, r, ph1, ph2) => {
    const x0 = Math.max(0, Math.floor((cx - r * 1.3) * CELL)), x1 = Math.min(CELL - 1, Math.ceil((cx + r * 1.3) * CELL));
    const y0 = Math.max(0, Math.floor((cy - r * 1.3) * CELL)), y1 = Math.min(CELL - 1, Math.ceil((cy + r * 1.3) * CELL));
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const dx = (i + 0.5) / CELL - cx, dy = (j + 0.5) / CELL - cy, a = Math.atan2(dy, dx);
      const re = r * (1 + 0.1 * Math.sin(3 * a + ph1) + 0.07 * Math.sin(7 * a + ph2) + 0.04 * Math.sin(13 * a + ph1 * 2));
      const dist = Math.hypot(dx, dy), cov = clamp((re - dist) * CELL / 1.5 + 0.5);
      if (cov <= 0) continue;
      const nx = dx / re, ny = dy / re, nz = Math.sqrt(clamp(1 - nx * nx - ny * ny));
      let l = 0.5 + 0.5 * (nx * LX + ny * LY + nz * LZ) / LL * 1.1;
      l = post(clamp((l - 0.12) / 0.8)) + speck(i, j, ox, oy);
      put(ox, oy, i, j, l, cov, false);
    }
  };
  const leafy = (idx) => {
    const ox = (idx % COLS) * CELL, oy = Math.floor(idx / COLS) * CELL, rng = mulberry32(100 + idx * 17);
    trunk(ox, oy, () => 0.5, 0.06, 0.48, 0.03, 0.017, (rng() - 0.5) * 0.04);
    const cy = 0.6 + (rng() - 0.5) * 0.04, spread = 0.15 + rng() * 0.05, bl = [];
    const n = 6 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rng() * 0.6, rr = (0.45 + 0.55 * rng()) * spread, r = 0.1 + rng() * 0.05;
      bl.push([0.5 + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr * 0.9, r]);
    }
    bl.push([0.5, cy, 0.17 + rng() * 0.03]); bl.push([0.5 + (rng() - 0.5) * 0.12, cy + 0.12, 0.11 + rng() * 0.03]);
    bl.sort((p, q) => p[1] - q[1]);
    for (const [bx, by, br] of bl) blob(ox, oy, clamp(bx, 0.06 + br * 1.3, 0.94 - br * 1.3), clamp(by, 0.28, 0.94 - br * 1.3), br, rng() * 6.28, rng() * 6.28);
  };
  const pine = (idx) => {
    const ox = (idx % COLS) * CELL, oy = Math.floor(idx / COLS) * CELL, rng = mulberry32(300 + idx * 29), k = idx === 4 ? 4 : 5, hw = idx === 4 ? 0.3 : 0.23;
    trunk(ox, oy, () => 0.5, 0.05, 0.22, 0.025, 0.02);
    for (let t = 0; t < k; t++) {                                         // bậc từ dưới lên
      const f = t / (k - 1), vBase = 0.13 + f * 0.5, vTop = vBase + 0.3 - f * 0.04, w = hw * (1 - 0.62 * f), ph = rng() * 6;
      for (let j = Math.floor(vBase * CELL); j < Math.min(CELL * 0.94, vTop * CELL); j++) for (let i = 0; i < CELL; i++) {
        const v = (j + 0.5) / CELL, u = (i + 0.5) / CELL, s = (v - vBase) / (vTop - vBase);
        const edge = w * (1 - s) * (1 + 0.1 * Math.sin(v * 70 + ph) + 0.05 * Math.sin(v * 150 + ph));
        const cov = clamp((edge - Math.abs(u - 0.5)) * CELL / 1.5 + 0.5);
        if (cov <= 0) continue;
        const side = clamp((0.5 - u) / Math.max(edge, 1e-3), -1, 1);
        let l = 0.52 + 0.3 * side * (1 - s * 0.4) - 0.2 * (1 - s) * 0.8 + 0.1 * s;
        put(ox, oy, i, j, post(clamp(l)) + speck(i, j, ox, oy), cov, false);
      }
    }
  };
  const palm = (idx) => {
    const ox = (idx % COLS) * CELL, oy = Math.floor(idx / COLS) * CELL, rng = mulberry32(500 + idx * 31), lean = idx === 6 ? 0.1 : -0.12;
    const tx = 0.5 + lean, ty = 0.66, top = [tx, ty];
    for (let j = Math.floor(0.05 * CELL); j < ty * CELL; j++) for (let i = 0; i < CELL; i++) {   // thân cong: u = 0.5 + lean*s²
      const v = (j + 0.5) / CELL, s = (v - 0.05) / (ty - 0.05), uc = 0.5 + lean * s * s, w = 0.03 - 0.012 * s, u = (i + 0.5) / CELL;
      const cov = clamp((w - Math.abs(u - uc)) * CELL / 1.5 + 0.5);
      if (cov > 0) put(ox, oy, i, j, 0.32 + 0.26 * clamp((uc - u) / w * 0.5 + 0.5) + (hash2(j >> 3, 7) - 0.5) * 0.12, cov, true);
    }
    const nF = 10, fr = [];
    for (let k = 0; k < nF; k++) {
      const a = Math.PI * (0.04 + 0.92 * (k + 0.5) / nF) + (rng() - 0.5) * 0.12, len = 0.25 + rng() * 0.05, dr = 0.13 + rng() * 0.06;
      const seg = []; for (let q = 0; q <= 14; q++) { const s = q / 14; seg.push([top[0] + Math.cos(a) * len * s, top[1] + Math.sin(a) * len * s * 0.9 - dr * s * s * s * (0.6 + Math.abs(Math.cos(a)))]); }
      fr.push(seg);
    }
    for (let j = 0; j < CELL; j++) for (let i = 0; i < CELL; i++) {
      const u = (i + 0.5) / CELL, v = (j + 0.5) / CELL;
      if (u < 0.05 || u > 0.95 || v < 0.3 || v > 0.95) continue;
      let best = 0, bl = 0.5;
      for (const seg of fr) for (let q = 0; q < 14; q++) {
        const a = seg[q], b = seg[q + 1], ex = b[0] - a[0], ey = b[1] - a[1], s = clamp(((u - a[0]) * ex + (v - a[1]) * ey) / (ex * ex + ey * ey));
        const px = a[0] + ex * s, py = a[1] + ey * s, dist = Math.hypot(u - px, v - py), sg = (q + s) / 14;
        const w = 0.062 * Math.pow(Math.sin(Math.PI * clamp(sg * 0.92 + 0.04)), 0.6) + 0.004;
        const cov = clamp((w - dist) * CELL / 1.5 + 0.5);
        if (cov > best - 0.01) { const upper = v > py ? 1 : 0; const l = 0.42 + 0.34 * upper + 0.18 * (0.5 - u) + 0.08 * sg; if (cov >= best) { best = Math.max(best, cov); bl = l; } }
      }
      if (best > 0) put(ox, oy, i, j, post(clamp(bl)) + speck(i, j, ox, oy), best, false);
    }
  };
  for (let k = 0; k < 4; k++) leafy(k);
  pine(4); pine(5); palm(6); palm(7);
  return { data: d, W, H };
}

// ---------------- shader ----------------
const VERT = /* glsl */`
uniform vec2 uNear;       // cây gần camera co về 0: (bắt đầu co, bắt đầu hiện đủ) (m)
uniform float uSwayK;
attribute vec3 aPos;      // gốc cây (m, thế giới)
attribute vec4 aData;     // cao (m), chỉ số ô atlas, rand 0..1, hệ số rộng
varying vec2 vUv; varying float vRand; varying float vKind; varying float vFogD; varying vec2 vToCam;
__WIND__
void main() {
  float h = aData.x, idx = aData.y, rnd = aData.z;
  vec2 d = cameraPosition.xz - aPos.xz;
  float dl = length(d); d = dl > 1e-4 ? d / dl : vec2(0.0, 1.0);
  vec2 right = vec2(d.y, -d.x);
  float dist3 = length(cameraPosition - aPos);
  h *= smoothstep(uNear.x, uNear.y, dist3);
  float flip = rnd > 0.5 ? 1.0 : -1.0;
  float w = h * aData.w;
  float y01 = position.y;
  vec3 wp = aPos + vec3(right.x, 0.0, right.y) * position.x * w * flip + vec3(0.0, y01 * h - 0.04 * h, 0.0);
  float g = gustAt(aPos.xz) * uWind.w;
  float k = clamp(uWind.z / 6.0, 0.0, 1.6);
  float sw = h * uSwayK * y01 * y01 * (((0.25 + 0.75 * g) * k) + 0.25 * sin(uWindT * (1.5 + rnd) + rnd * 40.0));
  wp.xz += uWind.xy * sw;
  float col = mod(idx, 4.0), row = floor(idx / 4.0);
  vec2 uvq = vec2(position.x * flip * 0.5 + 0.5, y01);
  vUv = (vec2(col, row) + uvq) / vec2(4.0, 2.0);
  vRand = rnd; vKind = idx; vToCam = d;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vFogD = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;
const FRAG = /* glsl */`
uniform sampler2D tAtlas;
uniform vec3 uLit, uShade, uTrunk, uSunDir, uSunColor, uSkyColor, uFogColor;
uniform vec2 uFog;
varying vec2 vUv; varying float vRand; varying float vKind; varying float vFogD; varying vec2 vToCam;
void main() {
  vec4 tx = texture2D(tAtlas, vUv);
  if (tx.g < 0.5) discard;
  float lightness = tx.r;
  vec2 sxz = uSunDir.xz; float sl = length(sxz); sxz = sl > 1e-4 ? sxz / sl : vec2(0.0);
  float facing = 0.62 + 0.38 * dot(vToCam, sxz);                 // camera quay lưng về phía mặt trời → tán sáng; ngược nắng → tối
  float sun = clamp(uSunDir.y * 0.7 + 0.35, 0.0, 1.0) * facing;
  vec3 tint = vec3(0.9 + 0.2 * vRand, 0.94 + 0.12 * fract(vRand * 7.3), 0.9 + 0.2 * fract(vRand * 3.1));
  if (vKind > 3.5 && vKind < 5.5) tint *= vec3(0.78, 0.95, 0.9);      // thông: xanh sẫm
  if (vKind > 5.5) tint *= vec3(1.12, 1.08, 0.82);                    // dừa: vàng hơn
  vec3 shadeC = uShade * tint * uSkyColor;
  vec3 litC = uLit * tint * (uSunColor * 0.9 + uSkyColor * 0.5);
  vec3 col = mix(shadeC, litC, clamp(lightness * sun * 1.15, 0.0, 1.0));
  vec3 tr = uTrunk * mix(uSkyColor * 0.7, uSunColor * 0.6 + uSkyColor * 0.5, lightness * sun);
  col = mix(col, tr, step(0.5, tx.b));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, smoothstep(uFog.x, uFog.y, vFogD));   // sương sau tonemap, như fog_fragment của three
}
`;
const NOWIND = /* glsl */`
uniform float uWindT; uniform vec4 uWind;
float gustAt(vec2 xz) { return 0.0; }
`;

export function createFarwoods(THREE = THREE_NS, opts = {}) {
  const { wind } = opts;
  const P = { seed: 1, center: [0, 0], ring: [80, 220], count: 3000, size: [9, 18], clumps: true, nearFade: [6, 30], ...opts };
  const colors = { lit: '#7fae4a', shade: '#2f5a2e', trunk: '#5b4128', ...(opts.colors || {}) };
  const rng = mulberry32(P.seed * 7919 + 13);
  const hAt = opts.heightAt || (() => 0), avoid = opts.avoid;
  // ---- trọng số loại ----
  const kw = Array.isArray(P.kinds) ? Object.fromEntries(P.kinds.map((k) => [k, 1])) : (P.kinds || { leafy: 1, pine: 0.5 });
  const kinds = Object.keys(kw).filter((k) => KIND_BASE[k] && kw[k] > 0), ksum = kinds.reduce((s, k) => s + kw[k], 0) || 1;
  const pickKind = (r) => { let a = r * ksum; for (const k of kinds) { a -= kw[k]; if (a <= 0) return k; } return kinds[kinds.length - 1] || 'leafy'; };
  const [rIn, rOut] = P.ring, r2a = rIn * rIn, r2b = rOut * rOut;
  const ringPt = () => { const r = Math.sqrt(r2a + (r2b - r2a) * rng()), a = rng() * Math.PI * 2; return [P.center[0] + Math.cos(a) * r, P.center[1] + Math.sin(a) * r]; };

  // ---- đặt cây (CPU, 1 lần) ----
  const nCl = P.clumps ? Math.max(4, Math.round(P.count / 45)) : 0;
  const clumps = [];
  for (let c = 0; c < nCl; c++) { const [x, z] = ringPt(); clumps.push({ x, z, s: (0.06 + 0.12 * rng()) * (rOut - rIn + 40), kind: pickKind(rng()), sz: 0.75 + 0.5 * rng(), w: 0.3 + rng() }); }
  const cw = clumps.reduce((s, c) => s + c.w, 0);
  const pos = [], dat = [];
  const gauss = () => (rng() + rng() + rng() - 1.5) / 0.75;
  for (let n = 0; n < P.count; n++) {
    let x = 0, z = 0, cl = null, ok = false;
    for (let tries = 0; tries < 8 && !ok; tries++) {
      cl = null;
      if (nCl && rng() < 0.88) { let a = rng() * cw; for (const c of clumps) { a -= c.w; if (a <= 0) { cl = c; break; } } cl = cl || clumps[0]; x = cl.x + gauss() * cl.s; z = cl.z + gauss() * cl.s; }
      else [x, z] = ringPt();
      const r = Math.hypot(x - P.center[0], z - P.center[1]);
      ok = r >= rIn && r <= rOut && !(avoid && avoid(x, z));
    }
    if (!ok) continue;
    const kind = cl && rng() < 0.75 ? cl.kind : pickKind(rng());
    const [b, cnt] = KIND_BASE[kind], idx = b + Math.floor(rng() * cnt);
    const sz = (P.size[0] + (P.size[1] - P.size[0]) * rng()) * (cl ? cl.sz : 1) * (kind === 'pine' ? 1.1 : 1);
    const asp = kind === 'pine' ? 0.8 : kind === 'palm' ? 1.3 : 1.05;   // rộng thẻ = cao·asp (tán chiếm ~45% bề rộng ô)
    pos.push(x, hAt(x, z), z); dat.push(sz, idx, rng(), asp * (0.9 + 0.2 * rng()));
  }
  const count = pos.length / 3;

  // ---- hình học + vật liệu ----
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('aData', new THREE.InstancedBufferAttribute(new Float32Array(dat), 4));
  geo.instanceCount = count;
  const R = rOut + P.size[1] * 2;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(P.center[0], 0, P.center[1]), R + 50);

  const at = makeAtlasData();
  const tex = new THREE.DataTexture(at.data, at.W, at.H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.anisotropy = 4; tex.needsUpdate = true; tex.name = 'farwoods_atlas';

  const own = wind ? null : { uWindT: { value: 0 }, uWind: { value: new THREE.Vector4(1, 0, 0, 0) } };
  const uniforms = {
    ...(wind ? wind.uniforms : own),
    tAtlas: { value: tex }, uNear: { value: new THREE.Vector2(...P.nearFade) }, uSwayK: { value: 0.03 },
    uLit: { value: new THREE.Color(colors.lit) }, uShade: { value: new THREE.Color(colors.shade) }, uTrunk: { value: new THREE.Color(colors.trunk) },
    uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() }, uSunColor: { value: new THREE.Color('#fff2d8') }, uSkyColor: { value: new THREE.Color('#9db8d8') },
    uFogColor: { value: new THREE.Color('#bcd6ee') }, uFog: { value: new THREE.Vector2(1e6, 2e6) },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT.replace('__WIND__', wind ? wind.glsl : NOWIND), fragmentShader: FRAG, side: THREE.DoubleSide, name: 'farwoods_mat' });
  const mesh = new THREE.Mesh(geo, mat); mesh.name = 'farwoods'; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.userData.noAO = true;
  const group = new THREE.Group(); group.name = 'farwoods_group'; group.add(mesh);

  return {
    group, mesh, uniforms, count,
    lightFrom(sun, hemi) {
      if (sun) { uniforms.uSunDir.value.copy(sun.position).sub(sun.target.position).normalize(); uniforms.uSunColor.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI); }
      if (hemi) uniforms.uSkyColor.value.copy(hemi.color).lerp(hemi.groundColor, 0.25).multiplyScalar(hemi.intensity / Math.PI * 1.8);
    },
    fogFrom(fog) {
      if (!fog) { uniforms.uFog.value.set(1e6, 2e6); return; }
      uniforms.uFogColor.value.copy(fog.color);
      if (fog.isFogExp2) uniforms.uFog.value.set(0, 2.6 / Math.max(fog.density, 1e-5)); else uniforms.uFog.value.set(fog.near, fog.far);
    },
    update(t, camera) {
      if (wind) wind.update(t); else uniforms.uWindT.value = t;
    },
    set(p = {}) {
      if (p.colors?.lit) uniforms.uLit.value.set(p.colors.lit);
      if (p.colors?.shade) uniforms.uShade.value.set(p.colors.shade);
      if (p.colors?.trunk) uniforms.uTrunk.value.set(p.colors.trunk);
      if (p.sunDir) uniforms.uSunDir.value.copy(p.sunDir).normalize();
      if (p.sunColor) uniforms.uSunColor.value.copy(p.sunColor);
      if (p.skyColor) uniforms.uSkyColor.value.copy(p.skyColor);
      if (p.nearFade) uniforms.uNear.value.set(p.nearFade[0], p.nearFade[1]);
      if (p.sway != null) uniforms.uSwayK.value = p.sway;
      if (p.visible != null) group.visible = !!p.visible;
    },
    dispose() { geo.dispose(); mat.dispose(); tex.dispose(); group.removeFromParent(); },
  };
}
