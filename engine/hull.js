// hull.js — Bộ dựng THÂN TÀU/THUYỀN thủ tục cho mọi tập (LÕI). Tất định theo seed; không cần GLB.
// Học từ 2 game tham khảo (Claude Fable 5.2):
//   skiff — Tidewright 40-boat (tidewright.html ~3635–4160): xuồng đôi mũi đóng ván chồng (clinker), hàm sheerY/keelY/
//           halfBeam/hullPt, ván chồng mép (lap) + gờ tối dưới mỗi mép, ván trong, sườn, sống mũi–sống lái liền, sàn,
//           băng ngồi, sàn mũi, cột + buồm lug (yard + boom).
//   ship  — Saltline `function vb(` (src-salt/index.html ~5282–5470): thân thép dựng theo trạm (station) + hàng (row),
//           sơn hai màu (chống hà đỏ DƯỚI đường nước, sọc boot-top), gân mối hàn, gờ chắn va, lỗ thoát nước + vệt gỉ,
//           thang mớn nước, tên tàu, lan can, cabin.
//   raft  — bè gỗ: các thân gỗ tròn buộc dây, xà ngang, cột + buồm vuông (tuỳ chọn).
//
//   import { createHull } from './hull.js';
//   const boat = createHull(THREE, { type: 'skiff', length: 18, beam: 5.6, depth: 2.9, strakes: 8,
//                                    colors: { top: '#3a2a1e', bottom: '#241912', trim: '#cbbd98' }, name: 'MAI', seed: 3, sail: true });
//   scene.add(boat);  boat.position.y = mặtNước;   // GỐC = ĐƯỜNG NƯỚC (y = 0 cục bộ), +Z = mũi, +Y lên, +X = mạn trái
//   floatHull(sea.sample, { ...boat.userData.footprint, x, z, yaw, t, clock })   // engine/floating.js
//   boat.getObjectByName('sail').rotation.y = 0.4;  // xoay buồm quanh cột
//
// Đơn vị: stud (1 stud = 1 đơn vị R6; engine/scans.js M2STUD = 2.9 stud/m). Mặc định: skiff 18×5.6×2.9 (≈ 6.2 m như Tidewright),
// ship 60×12×8, raft 12×7×1.2.
// userData: { type, length, beam, depth, waterline: 0, draft, freeboard, footprint: { hx, hz }, parts: [tên…] }
// Bộ phận có tên: hull (+ strakes/ledges/inner/keel/ribs | plating/bottom/welds/fender/transom | logs), deck, rail,
//   mast, sail (+ yard/boom), rudder, house, scuppers, rust, marks, nameL/nameR, lashings. Tất cả mesh: userData.noMerge = true
//   (vật liệu sơn hai màu dùng toạ độ CỤC BỘ của thân — không gộp vào world).
// Vật liệu sơn: MeshStandardMaterial + onBeforeCompile (fbm 3D: loang màu, vệt chảy dọc, rêu sát nước, gỉ); nối tiếp được
//   (grunge.js / materials.js / floating.wetline dùng mẫu `prev` + customProgramCacheKey).
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- tiện ích
function mulberry(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vmul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vnorm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const vlerp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Bộ dựng lưới: đỉnh (vị trí đã qua hàm `xf`) + uv; pháp tuyến tự tính. Mọi phần dùng chỉ số (indexed) để gộp được.
function Builder(THREE, xf = (p) => p) {
  const pos = [], uv = [], idx = [];
  const b = {
    v(p, u = 0, w = 0) { const q = xf(p); pos.push(q[0], q[1], q[2]); uv.push(u, w); return pos.length / 3 - 1; },
    tri(a, c, d) { idx.push(a, c, d); },
    quad(a, c, d, e) { idx.push(a, c, d, a, d, e); },
    // lưới từ mảng các hàng điểm (mỗi hàng cùng số điểm)
    grid(rows, uvf) { const ids = rows.map((r, j) => r.map((p, i) => b.v(p, ...(uvf ? uvf(i, j) : [i / (r.length - 1), j / (rows.length - 1)])))); for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < rows[j].length - 1; i++) b.quad(ids[j][i], ids[j][i + 1], ids[j + 1][i + 1], ids[j + 1][i]); return ids; },
    // thanh tiết diện chữ nhật dọc đường pts, `ups` = hướng "lên" của tiết diện tại mỗi điểm
    beam(pts, ups, w, h, caps = true) {
      const n = pts.length, ring = [];
      for (let i = 0; i < n; i++) {
        const T = vnorm(vsub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)]));
        const U0 = Array.isArray(ups[0]) ? ups[i] : ups; const S = vnorm(vcross(T, U0)), U = vnorm(vcross(S, T));
        const c = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => vadd(pts[i], vadd(vmul(S, sx * w / 2), vmul(U, sy * h / 2))));
        ring.push(c.map((p, k) => b.v(p, i / (n - 1), k / 4)));
      }
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < 4; k++) b.quad(ring[i][k], ring[i + 1][k], ring[i + 1][(k + 1) % 4], ring[i][(k + 1) % 4]);
      if (caps) { const a = ring[0], e = ring[n - 1]; b.quad(a[3], a[2], a[1], a[0]); b.quad(e[0], e[1], e[2], e[3]); }
    },
    // ống tròn dọc pts, bán kính r (số hoặc hàm f∈[0,1])
    tube(pts, r, sides = 8, caps = true) {
      const n = pts.length, ring = [];
      for (let i = 0; i < n; i++) {
        const T = vnorm(vsub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)]));
        const ref = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        const S = vnorm(vcross(T, ref)), U = vnorm(vcross(S, T)), rr = typeof r === 'function' ? r(i / (n - 1)) : r;
        const row = [];
        for (let k = 0; k <= sides; k++) { const a = (k / sides) * Math.PI * 2; row.push(b.v(vadd(pts[i], vadd(vmul(S, Math.cos(a) * rr), vmul(U, Math.sin(a) * rr))), k / sides, i / (n - 1))); }
        ring.push(row);
      }
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) b.quad(ring[i][k], ring[i][k + 1], ring[i + 1][k + 1], ring[i + 1][k]);
      if (caps) for (const [row, flip] of [[ring[0], 1], [ring[n - 1], 0]]) { for (let k = 1; k < sides - 1; k++) flip ? b.tri(row[0], row[k + 1], row[k]) : b.tri(row[0], row[k], row[k + 1]); }
    },
    // hộp theo 8 góc (thứ tự: đáy 0..3, đỉnh 4..7)
    box8(c) {
      const F = [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
      for (const f of F) { const ids = f.map((k, j) => b.v(c[k], j === 1 || j === 2 ? 1 : 0, j >= 2 ? 1 : 0)); b.quad(ids[0], ids[1], ids[2], ids[3]); }
    },
    box(x0, y0, z0, x1, y1, z1) { b.box8([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]); },
    geo() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
      return g;
    },
    get empty() { return idx.length === 0; },
  };
  return b;
}

// ---------------------------------------------------------------- texture thủ tục (canvas, rng có seed)
const hasDOM = () => typeof document !== 'undefined' && !!document.createElement;
function canvasTex(THREE, w, h, draw, { repeat = true, srgb = true } = {}) {
  if (!hasDOM()) return null;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}
// vân gỗ: dải dọc theo u, mắt gỗ, đốm hắc ín (map trắng-xám để nhân với màu sơn)
function woodTex(THREE, seed) {
  const R = mulberry(seed * 31 + 7);
  return canvasTex(THREE, 512, 128, (g, w, h) => {
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y = R() * h, len = 40 + R() * 260, x = R() * w, v = 150 + R() * 100 | 0;
      g.strokeStyle = `rgba(${v},${v},${v},${0.25 + R() * 0.35})`; g.lineWidth = 0.6 + R() * 1.8;
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len * 0.3, y + (R() - 0.5) * 4, x + len * 0.7, y + (R() - 0.5) * 4, x + len, y + (R() - 0.5) * 3); g.stroke();
    }
    for (let i = 0; i < 7; i++) { const x = R() * w, y = R() * h, r = 2 + R() * 5; g.fillStyle = 'rgba(70,70,70,0.55)'; g.beginPath(); g.ellipse(x, y, r * 2.2, r, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(40,40,40,${0.08 + R() * 0.12})`; g.fillRect(R() * w, R() * h, 4 + R() * 30, 1 + R() * 3); }
  });
}
// thép sơn: loang nhẹ + vệt dọc + chấm sơn bong
function steelTex(THREE, seed) {
  const R = mulberry(seed * 17 + 3);
  return canvasTex(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = R() * w, y = R() * h, r = 10 + R() * 50, v = 200 + R() * 55 | 0; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${v},${v},${v},0.35)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 50; i++) { const x = R() * w; g.fillStyle = `rgba(120,120,120,${0.05 + R() * 0.1})`; g.fillRect(x, R() * h * 0.5, 1 + R() * 2, 20 + R() * 120); }
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(90,90,90,${0.2 + R() * 0.4})`; g.beginPath(); g.arc(R() * w, R() * h, 0.5 + R() * 1.6, 0, 7); g.fill(); }
  });
}
// buồm vải: đường may theo tấm, miếng vá, dây rạn buồm (reef points)
function sailTex(THREE, seed, color) {
  const R = mulberry(seed * 13 + 5);
  return canvasTex(THREE, 256, 512, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,240,210'},${0.03 + R() * 0.05})`; g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 3); }
    g.strokeStyle = 'rgba(30,18,10,0.45)'; g.lineWidth = 2;
    for (let y = 32; y < h; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 6); g.stroke(); }
    for (let i = 0; i < 3; i++) { const x = R() * w * 0.7, y = R() * h * 0.8, a = 24 + R() * 40, b = 20 + R() * 34; g.fillStyle = `rgba(${R() < 0.5 ? '60,35,20' : '200,170,120'},0.25)`; g.fillRect(x, y, a, b); g.strokeStyle = 'rgba(30,18,10,0.5)'; g.lineWidth = 1; g.strokeRect(x, y, a, b); }
    g.fillStyle = 'rgba(25,15,8,0.7)'; for (let x = 10; x < w; x += 22) g.fillRect(x, h * 0.78, 2, 9);
    const gr = g.createLinearGradient(0, h, 0, h * 0.6); gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
// vệt gỉ chảy (Saltline decal `rust_run`): gradient dọc + đốm gỉ đậm ở gốc; nền trong suốt
function rustTex(THREE, seed) {
  const R = mulberry(seed * 7 + 11);
  return canvasTex(THREE, 128, 256, (g, w, h) => {
    for (let i = 0; i < 40; i++) {
      const x = w * (0.2 + 0.6 * (R() * 0.5 + R() * 0.5)), L = h * (0.2 + R() * 0.75), ww = 1.2 + R() * R() * 9, a = 0.08 + R() * 0.22, c = R() < 0.5 ? '118,52,18' : '150,78,26';
      const gr = g.createLinearGradient(0, 8, 0, L); gr.addColorStop(0, `rgba(${c},${Math.min(1, a * 1.4)})`); gr.addColorStop(0.3, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - ww / 2, 8, ww, L);
    }
    for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '70,30,14' : '104,44,16'},${0.5 + R() * 0.4})`; g.beginPath(); g.ellipse(w * (0.3 + R() * 0.4), 6 + R() * 12, 3 + R() * 8, 2 + R() * 4, 0, 0, 7); g.fill(); }
  }, { repeat: false });
}
// thang mớn nước: vạch + số chẵn (đọc từ dưới lên), nền trong suốt
function marksTex(THREE, color = '#f2efe6') {
  return canvasTex(THREE, 96, 512, (g, w, h) => {
    g.fillStyle = color; g.font = 'bold 34px sans-serif'; g.textBaseline = 'middle';
    for (let k = 0; k < 9; k++) { const y = h - 26 - k * 56; g.fillRect(8, y - 3, k % 2 ? 22 : 38, 7); if (k % 2 === 0) g.fillText(String(2 + k), 50, y); }
  }, { repeat: false });
}
// tên tàu, chữ trắng sờn (distress)
function nameTex(THREE, name, seed, color = '#f2efe6') {
  const R = mulberry(seed * 5 + 1);
  let aspect = 6;
  const tex = canvasTex(THREE, 1024, 160, (g, w, h) => {
    g.font = 'bold 120px sans-serif'; g.textBaseline = 'middle';
    const tw = Math.min(w - 20, g.measureText(name).width); aspect = Math.max(2, (tw + 30) / h);
    g.fillStyle = color; g.fillText(name, 10, h / 2 + 4, w - 20);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + R() * 0.6})`; g.beginPath(); g.arc(R() * w, R() * h, 0.6 + R() * 2.6, 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-over';
  }, { repeat: false });
  return { tex, aspect: () => aspect };
}

// ---------------------------------------------------------------- vật liệu sơn hai màu (theo y CỤC BỘ)
const PAINT_GLSL = /* glsl */`
varying vec3 vHullP;
uniform vec3 uHTop, uHBot, uHBoot; uniform vec4 uHP; // x = đường nước, y = cao sọc boot-top, z = mức bẩn/gỉ, w = seed
float hH(vec3 p){ p = fract(p*0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x + p.y + p.z)); }
float hN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(hH(i), hH(i + vec3(1,0,0)), f.x), mix(hH(i + vec3(0,1,0)), hH(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hH(i + vec3(0,0,1)), hH(i + vec3(1,0,1)), f.x), mix(hH(i + vec3(0,1,1)), hH(i + vec3(1,1,1)), f.x), f.y), f.z); }
float hF(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*hN(p); p = p*2.03 + 17.1; a *= 0.5; } return s/0.9375; }
`;
function paintMaterial(THREE, { top, bottom, boot, wl = 0, bootH = 0, dirt = 0.5, seed = 1, map = null, rough = 0.7, metal = 0, side = THREE.DoubleSide, tag = 'hull' }) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map, roughness: rough, metalness: metal, side });
  m.name = 'hullPaint_' + tag;
  const U = {
    uHTop: { value: new THREE.Color(top) }, uHBot: { value: new THREE.Color(bottom ?? top) }, uHBoot: { value: new THREE.Color(boot ?? bottom ?? top) },
    uHP: { value: new THREE.Vector4(wl, bootH, dirt, (seed % 97) * 3.17) },
  };
  m.userData.hullPaint = U;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHullP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHullP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + PAINT_GLSL)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec3 P = vHullP + uHP.w;
        float y = vHullP.y - uHP.x;
        float aa = 0.03;
        vec3 col = mix(uHBot, uHBoot, smoothstep(-aa, aa, y));
        col = mix(col, uHTop, smoothstep(uHP.y - aa, uHP.y + aa, y));
        float g = hF(P*0.45);
        col *= 0.86 + 0.28*g;                                               // loang sơn
        float streak = hF(vec3((vHullP.x + vHullP.z)*1.3, vHullP.y*0.09, uHP.w));   // vệt chảy dọc
        float d = uHP.z;
        col = mix(col, col*0.62 + vec3(0.05, 0.03, 0.015), smoothstep(0.58, 0.8, streak)*d*step(0.0, y));
        col = mix(col, vec3(0.16, 0.19, 0.09), (1.0 - smoothstep(0.0, 0.45, y))*step(0.0, y)*d*0.55*smoothstep(0.35, 0.7, g));  // rêu sát nước
        col = mix(col, vec3(0.30, 0.13, 0.05), smoothstep(0.72, 0.86, hF(P*1.7 + 9.0))*d*0.6);   // đốm gỉ / bong sơn
        diffuseColor.rgb *= col;
      }`);
  };
  const key = m.customProgramCacheKey?.bind(m);
  m.customProgramCacheKey = () => (key ? key() : '') + '|hullpaint';
  return m;
}
const stdMat = (THREE, color, o = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, side: THREE.DoubleSide, ...o }); m.name = o.name || 'hull_' + String(color); return m; };

function meshOf(THREE, name, geo, mat) {
  const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = true; m.receiveShadow = true; m.userData.noMerge = true; return m;
}
function mergeOf(THREE, name, builders, mat) {
  const gs = builders.filter((b) => !b.empty).map((b) => b.geo());
  if (!gs.length) return null;
  return meshOf(THREE, name, gs.length === 1 ? gs[0] : mergeGeometries(gs, false), mat);
}

// ================================================================= SKIFF (Tidewright clinker double-ender)
// Đường hình gốc tính bằng mét (dài 6.17, rộng 1.91, sâu ~0.98, đường nước y = 0), rồi co giãn theo length/beam/depth.
const TW = (() => {
  const KH = 0.036;
  const sheerY = (t) => 0.63 + (t > 0 ? 0.46 : 0.36) * Math.pow(Math.abs(t), 2.3);
  const keelY = (t) => -0.35 + 0.17 * Math.pow(Math.abs(t), 2.6);
  const zBow = (v) => 2.45 + 0.68 * Math.pow(Math.max(v, 0), 0.62);
  const zStern = (v) => -(2.50 + 0.54 * Math.pow(Math.max(v, 0), 0.72));
  const halfBeam = (t) => { const a = Math.min(1, Math.abs(t)); return t > 0 ? KH + 0.92 * Math.pow(1 - Math.pow(a, 1.9), 1.05) : KH + 0.92 * Math.pow(1 - Math.pow(a, 2.3), 0.95); };
  // u 0 (lái) .. 1 (mũi), v 0 (sống) .. 1 (mép mạn), sx +1 trái / -1 phải
  const hullPt = (u, v, sx) => {
    const t = u * 2 - 1, a = Math.min(1, Math.abs(t)), e = 0.46 + 0.80 * Math.pow(a, 1.7), vv = Math.max(v, 0);
    return [sx * (KH + (halfBeam(t) - KH) * Math.pow(vv, e)), keelY(t) + (sheerY(t) - keelY(t)) * v, zStern(v) + (zBow(v) - zStern(v)) * u];
  };
  const hullN = (u, v, sx) => {
    const e = 0.003, P = hullPt(u, v, sx);
    const du = vsub(hullPt(Math.min(1, u + e), v, sx), hullPt(Math.max(0, u - e), v, sx));
    const dv = vsub(hullPt(u, v + e, sx), hullPt(u, Math.max(0.0005, v - e), sx));
    return { P, N: vnorm(vmul(vcross(dv, du), sx)), Tv: vnorm(dv) };
  };
  const uAtZ = (z, v) => (z - zStern(v)) / (zBow(v) - zStern(v));
  const uvAt = (z, y) => { let v = 0.5, u = 0.5; for (let i = 0; i < 6; i++) { u = clamp(uAtZ(z, v), 0, 1); const t = u * 2 - 1; v = clamp((y - keelY(t)) / (sheerY(t) - keelY(t)), 0.001, 1.1); } return [u, v]; };
  const inAt = (z, y, sx, inset) => { const [u, v] = uvAt(z, y); const { P, N } = hullN(u, v, sx); const x = P[0] - N[0] * inset; return [sx * Math.max(sx * x, 0.004), P[1] - N[1] * inset, P[2] - N[2] * inset]; };
  return { KH, sheerY, keelY, zBow, zStern, halfBeam, hullPt, hullN, uAtZ, inAt, L: 6.17, B: 1.912, D: 0.98 };
})();

function buildSkiff(THREE, o, root) {
  const S = [o.beam / TW.B, o.depth / TW.D, o.length / TW.L];
  const sc = (p) => [p[0] * S[0], p[1] * S[1], p[2] * S[2]];
  const B = () => Builder(THREE, sc);
  const NSTR = Math.max(3, o.strakes | 0 || 8), LAP = 0.03, NU = 32, ZM = 0.9;
  const SV = []; for (let k = 0; k <= NSTR; k++) SV.push(Math.pow(k / NSTR, 1.25));
  const wood = woodTex(THREE, o.seed);
  if (wood) wood.repeat.set(1, 1 / NSTR * 2);
  const C = o.colors;
  const mPlank = paintMaterial(THREE, { top: C.top, bottom: C.bottom, boot: C.bottom, wl: 0, bootH: 0, dirt: o.dirt, seed: o.seed, map: wood, rough: 0.62, tag: 'skiff' });
  const mInner = stdMat(THREE, '#6b4a2c', { map: wood, roughness: 0.8, name: 'hull_oakInner', side: THREE.DoubleSide });
  const mOak = stdMat(THREE, '#8a6238', { map: wood, roughness: 0.7, name: 'hull_oak' });
  const mTrim = stdMat(THREE, C.trim, { map: wood, roughness: 0.6, name: 'hull_trim' });
  const mLedge = stdMat(THREE, '#120d09', { roughness: 0.9, name: 'hull_ledge', side: THREE.DoubleSide });
  const mIron = stdMat(THREE, '#2a2a2e', { roughness: 0.5, metalness: 0.6, name: 'hull_iron' });
  const mSpar = stdMat(THREE, '#a77c48', { map: wood, roughness: 0.55, name: 'hull_spar' });

  const hull = new THREE.Group(); hull.name = 'hull'; root.add(hull);
  const bStr = B(), bLedge = B(), bIn = B(), bRib = B(), bRail = B(), bRub = B(), bKeel = B(), bFloor = B(), bDeck = B(), bThw = B();
  for (const sx of [1, -1]) {
    // ván ngoài chồng mép: mỗi ván 3 hàng, mép dưới nhô ra LAP (đè lên ván dưới), mép trên lùi vào
    for (let k = 0; k < NSTR; k++) {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const v = lerp(SV[k], SV[k + 1], r / 2), off = LAP * (1 - r / 2), row = [];
        for (let i = 0; i <= NU; i++) { const { P, N } = TW.hullN(i / NU, v, sx); row.push(vadd(P, vmul(N, off))); }
        rows.push(row);
      }
      bStr.grid(sx > 0 ? rows : rows.slice().reverse(), (i, j) => [i / NU * 6.2, k + (sx > 0 ? j : 2 - j) * 0.4995]);
      if (k > 0) {   // gờ tối dưới mỗi mép ván
        const a = [], c = [];
        for (let i = 0; i <= NU; i++) { const { P, N } = TW.hullN(i / NU, SV[k], sx); a.push(P); c.push(vadd(P, vmul(N, LAP))); }
        bLedge.grid([a, c]);
      }
    }
    // mặt trong ván
    const NV = 11, irows = [];
    for (let j = 0; j <= NV; j++) {
      const v = Math.pow(j / NV, 1.3), row = [];
      for (let i = 0; i <= NU; i++) { const { P, N } = TW.hullN(i / NU, v, sx); const x = P[0] - N[0] * 0.028; row.push([sx * Math.max(sx * x, 0.004), P[1] - N[1] * 0.028, P[2] - N[2] * 0.028]); }
      irows.push(row);
    }
    bIn.grid(irows, (i, j) => [i / NU * 6.2, j / NV * NSTR]);
    // mép mạn (gunwale) + gờ chắn va sáng màu dưới ván mép
    const gp = [], rp = [], rn = [];
    for (let i = 0; i <= NU; i++) {
      const a = TW.hullN(i / NU, 1, sx); gp.push([a.P[0] + a.N[0] * 0.004, a.P[1] + 0.012, a.P[2] + a.N[2] * 0.004]);
      const b = TW.hullN(i / NU, SV[NSTR - 1], sx); rp.push(vadd(b.P, vmul(b.N, LAP + 0.012))); rn.push(b.N);
    }
    bRail.beam(gp, [0, 1, 0], 0.088, 0.046);
    bRub.beam(rp, rn, 0.032, 0.028);
    // sườn
    for (let zr = -2.4; zr <= 2.01; zr += 0.4) {
      const pts = [], ups = [];
      for (let j = 0; j <= 9; j++) {
        const v = 0.02 + 0.95 * j / 9, u = clamp(TW.uAtZ(zr, v), 0, 1); const { P, N } = TW.hullN(u, v, sx);
        const x = P[0] - N[0] * 0.042; pts.push([sx * Math.max(sx * x, 0.01), P[1] - N[1] * 0.042, P[2] - N[2] * 0.042]); ups.push(vmul(N, -1));
      }
      bRib.beam(pts, ups, 0.042, 0.032, false);
    }
  }
  // sống lái – sống đáy – sống mũi: một thanh liền
  {
    const raw = [];
    for (let j = 0; j <= 8; j++) { const v = 1.07 * (1 - j / 8); raw.push([0, TW.keelY(-1) + (TW.sheerY(-1) - TW.keelY(-1)) * v, TW.zStern(v)]); }
    for (let i = 1; i < 20; i++) { const P = TW.hullPt(i / 20, 0, 1); raw.push([0, P[1], P[2]]); }
    for (let j = 0; j <= 9; j++) { const v = 1.13 * j / 9; raw.push([0, TW.keelY(1) + (TW.sheerY(1) - TW.keelY(1)) * v, TW.zBow(v)]); }
    const pts = [], ups = [];
    for (let i = 0; i < raw.length; i++) { const T = vnorm(vsub(raw[Math.min(i + 1, raw.length - 1)], raw[Math.max(i - 1, 0)])); const U = [0, -T[2], T[1]]; ups.push(U); pts.push(vadd(raw[i], vmul(U, 0.026))); }
    bKeel.beam(pts, ups, 0.074, 0.11);
  }
  // sàn (floorboards)
  {
    const yf = -0.13, L = [], R = [];
    for (let i = 0; i <= 16; i++) { const z = -2.15 + 4.1 * i / 16; const l = TW.inAt(z, yf, 1, 0.04), r = TW.inAt(z, yf, -1, 0.04); L.push([l[0], yf, z]); R.push([r[0], yf, z]); }
    bFloor.grid([R, L], (i, j) => [i / 16 * 4, j]);
  }
  // băng ngồi (thwarts) + sàn lái
  const thwart = (zc, hw, y, th) => {
    const a = TW.inAt(zc - hw, y, 1, 0.02), b = TW.inAt(zc + hw, y, 1, 0.02), c = TW.inAt(zc + hw, y, -1, 0.02), d = TW.inAt(zc - hw, y, -1, 0.02);
    const q = [a, b, c, d].map((p) => [p[0], y - th, p[2]]), w = [a, b, c, d].map((p) => [p[0], y, p[2]]);
    bThw.box8([q[0], q[1], q[2], q[3], w[0], w[1], w[2], w[3]]);
  };
  thwart(-1.45, 0.13, 0.34, 0.036); thwart(-0.2, 0.12, 0.34, 0.036); thwart(ZM, 0.15, 0.36, 0.045); thwart(-2.4, 0.3, 0.36, 0.03);
  // sàn mũi (foredeck)
  {
    const u0 = TW.uAtZ(1.85, 1), L = [], R = [];
    for (let i = 0; i <= 9; i++) { const P = TW.hullPt(lerp(u0, 1, i / 9), 1, 1); L.push([P[0], P[1] - 0.008, P[2]]); R.push([-P[0], P[1] - 0.008, P[2]]); }
    bDeck.grid([R, L], (i, j) => [i / 9, j]);
    bDeck.beam([[L[0][0], L[0][1] - 0.01, L[0][2]], [0, L[0][1] + 0.035, L[0][2] - 0.03], [R[0][0], R[0][1] - 0.01, R[0][2]]], [0, 1, 0], 0.05, 0.10);
  }
  for (const [n, b, m] of [['strakes', bStr, mPlank], ['ledges', bLedge, mLedge], ['inner', bIn, mInner], ['ribs', bRib, mOak], ['keel', bKeel, mPlank], ['rubStrake', bRub, mTrim]]) { const x = mergeOf(THREE, n, [b], m); if (x) hull.add(x); }
  const deck = new THREE.Group(); deck.name = 'deck'; root.add(deck);
  for (const [n, b, m] of [['foredeck', bDeck, mOak], ['floor', bFloor, mInner], ['thwarts', bThw, mOak]]) { const x = mergeOf(THREE, n, [b], m); if (x) deck.add(x); }
  const rail = mergeOf(THREE, 'rail', [bRail], mOak); root.add(rail);

  // bánh lái + cần lái
  {
    const b = B();
    const RD = vnorm([0, 1.33, -0.50]), RE = [0, RD[2], -RD[1]], RA0 = vadd([0, -0.25, -2.56], vmul(RE, 0.10));
    const rp = (a, d) => [0, RA0[1] + RD[1] * a + RE[1] * d, RA0[2] + RD[2] * a + RE[2] * d];
    const blade = [rp(0, 0), rp(0, 0.42), rp(0.9, 0.36), rp(1.15, 0.05)];
    const th = 0.022;
    b.box8([...blade.map((p) => [p[0] - th, p[1], p[2]]), ...blade.map((p) => [p[0] + th, p[1], p[2]])].map((p, i) => p).slice(0, 8));
    b.beam([rp(1.5, 0.02), [0, 0.80, -2.14]], [0, 1, 0], 0.04, 0.05);
    const m = mergeOf(THREE, 'rudder', [b], mPlank); root.add(m);
  }
  // cột + buồm lug
  if (o.mast !== false) {
    const SL = S[2], k = S[0];   // chiều cao cột/buồm theo chiều dài (giữ dáng)
    const sm = (p) => [p[0] * k, p[1] * SL, p[2] * S[2]];
    const bM = Builder(THREE, sm);
    bM.tube([[0, -0.22, ZM], [0, 1.0, ZM], [0, 3.4, ZM], [0, 5.7, ZM]], (f) => 0.062 - 0.026 * f, 10);
    const mast = meshOf(THREE, 'mast', bM.geo(), mSpar); root.add(mast);
    const bS = Builder(THREE, sm);   // dây chằng (shrouds)
    for (const sx of [1, -1]) { const P = TW.hullPt(TW.uAtZ(0.5, 1), 1, sx); bS.tube([[0, 5.5, ZM], [P[0] * 0.5 * (S[0] / k), (5.5 * SL + P[1] * S[1]) / 2 / SL, (ZM + P[2]) * 0.5], [P[0] * S[0] / k, (P[1] * S[1] + 0.03) / SL, P[2]]], 0.011, 4, false); }
    mast.add(meshOf(THREE, 'shrouds', bS.geo(), stdMat(THREE, '#3b2f20', { name: 'hull_rope' })));
    if (o.sail !== false) {
      // buồm lug: góc (khoảng cách SAU cột, cao): tack, clew, throat, peak — Tidewright CORNERS
      const SAILX = 0.075, cn = [[-0.12, 1.20], [3.0, 1.27], [-0.75, 4.02], [2.05, 6.62]];
      const pivot = new THREE.Group(); pivot.name = 'sail'; pivot.position.set(0, 0, ZM * S[2]); root.add(pivot);
      const sp = (p) => [p[0] * k, p[1] * SL, p[2] * SL];   // dọc trục cột (gốc tại cột)
      const P3 = (c, x = SAILX) => [x, c[1], -c[0]];
      const bSail = Builder(THREE, sp), NS = 12, NT = 14, rows = [];
      for (let j = 0; j <= NT; j++) {
        const t = j / NT, row = [];
        for (let i = 0; i <= NS; i++) {
          const s = i / NS, lo = vlerp(P3(cn[0]), P3(cn[1]), s), hi = vlerp(P3(cn[2]), P3(cn[3]), s), p = vlerp(lo, hi, t);
          p[0] += (o.camber ?? 0.32) * Math.sin(Math.PI * s) * Math.sin(Math.PI * (0.08 + 0.84 * t)) * (1 - 0.3 * t);   // bụng buồm
          row.push(p);
        }
        rows.push(row);
      }
      bSail.grid(rows, (i, j) => [i / NS, j / NT]);
      const mSail = stdMat(THREE, '#ffffff', { map: sailTex(THREE, o.seed, o.sailColor || '#9a5a34'), roughness: 0.9, side: THREE.DoubleSide, name: 'hull_sail' });
      if (!mSail.map) mSail.color.set(o.sailColor || '#9a5a34');
      pivot.add(meshOf(THREE, 'sailCloth', bSail.geo(), mSail));
      const bY = Builder(THREE, sp); bY.tube([P3(cn[2], SAILX + 0.02), P3(cn[3], SAILX + 0.02)], 0.035, 6);
      const bB = Builder(THREE, sp); bB.tube([P3(cn[0], SAILX + 0.02), P3(cn[1], SAILX + 0.02)], 0.04, 6);
      pivot.add(meshOf(THREE, 'yard', bY.geo(), mSpar), meshOf(THREE, 'boom', bB.geo(), mSpar));
      if (o.sailAngle) pivot.rotation.y = o.sailAngle;
    }
    // vòng sắt ở cột
    const bI = Builder(THREE, sm); bI.tube([[0, 0.355, ZM], [0, 0.405, ZM]], 0.08, 10); mast.add(meshOf(THREE, 'mastBand', bI.geo(), mIron));
  }
  return { draft: -TW.keelY(0) * S[1] + 0.11 * S[1], freeboard: TW.sheerY(0) * S[1] };
}

// ================================================================= SHIP (Saltline lofted steel hull)
function buildShip(THREE, o, root) {
  const L = o.length, Bm = o.beam, D = o.depth, T = o.draft ?? D * 0.45, k = Bm / 16;   // k: tỉ lệ chi tiết (Saltline ~16 m rộng)
  const C = o.colors;
  const free = D - T;
  const sheer = (u) => free + 0.12 * D * Math.pow(Math.max(0, (u - 0.82) / 0.18), 2) + 0.05 * D * Math.pow(Math.max(0, (0.12 - u) / 0.12), 2);
  // nửa rộng tại (u, y): mũi thon (đoạn vào nước ngắn dần lên cao), đuôi thu về vách lái (transom), đáy phẳng + hông bo
  const halfW = (u, y) => {
    const r = clamp((y + T) / D, 0, 1.3), db = (1 - u) * L, a = L * (0.27 - 0.13 * Math.pow(Math.min(r, 1), 1.3));
    const c = db >= a ? 1 : Math.pow(Math.sin((db / a) * Math.PI / 2), 0.72);
    let w = 0.01 * L + (Bm / 2 - 0.01 * L) * c;
    const ds = u * L, Ls = 0.16 * L; if (ds < Ls) w *= 1 - 0.42 * Math.pow((Ls - ds) / Ls, 2) * (1 - 0.6 * Math.min(r, 1));
    const sec = 1 - 0.8 * Math.pow(1 - Math.min(1, r / 0.16), 2.2);   // hông bo (bilge)
    return w * sec;
  };
  const rake = (u, y) => 0.07 * L * ((y + T) / D) * sstep(0.78, 1, u) - 0.02 * L * ((y + T) / D) * (1 - sstep(0, 0.06, u));
  const P = (u, y, sx) => [sx * halfW(u, y), y, -L / 2 + u * L + rake(u, y)];
  const Nrm = (u, y, sx) => {
    const e = 1e-3; const du = vsub(P(Math.min(1, u + e), y, sx), P(Math.max(0, u - e), y, sx)), dv = vsub(P(u, y + e * D, sx), P(u, y - e * D, sx));
    let n = vnorm(vcross(du, dv)); if (n[0] * sx < 0) n = vmul(n, -1); return n;
  };
  // trạm dày ở 2 đầu (cos), hàng: dưới nước tuyệt đối, trên nước theo % mạn khô (hàng WL đúng y = 0)
  const NU = 34, us = []; for (let i = 0; i <= NU; i++) us.push(0.5 - 0.5 * Math.cos(Math.PI * i / NU));
  const below = [0, 0.05, 0.16, 0.36, 0.62, 0.84, 1].map((f) => -T + T * f), above = [0.22, 0.46, 0.7, 0.88, 1];
  const rowY = (u) => [...below, ...above.map((f) => f * sheer(u))];
  const NR = below.length + above.length;
  const steel = steelTex(THREE, o.seed); if (steel) steel.repeat.set(L / 24, 1);
  const mHull = paintMaterial(THREE, { top: C.top, bottom: C.bottom, boot: o.boot || '#151515', wl: 0, bootH: 0.45 * k, dirt: o.dirt, seed: o.seed, map: steel, rough: 0.55, metal: 0.1, tag: 'ship' });
  const mDeck = stdMat(THREE, o.deckColor || '#5d6b5a', { map: steel, roughness: 0.8, name: 'hull_deck' });
  const mTrim = stdMat(THREE, C.trim, { map: steel, roughness: 0.6, name: 'hull_trim' });
  const mDark = stdMat(THREE, '#1c1c1e', { roughness: 0.55, metalness: 0.4, name: 'hull_steelDark' });
  const mGlass = stdMat(THREE, '#1d2a33', { roughness: 0.15, metalness: 0.3, emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: o.lit ?? 0, name: 'hull_glass' });

  const hull = new THREE.Group(); hull.name = 'hull'; root.add(hull);
  const bPl = Builder(THREE), bBot = Builder(THREE), bTr = Builder(THREE), bW = Builder(THREE), bF = Builder(THREE);
  for (const sx of [1, -1]) {
    const rows = []; for (let j = 0; j < NR; j++) rows.push(us.map((u) => P(u, rowY(u)[j], sx)));
    bPl.grid(sx > 0 ? rows : rows.slice().reverse(), (i, j) => [us[i] * L / 6, (sx > 0 ? rowY(0.5)[j] : rowY(0.5)[NR - 1 - j]) / 6]);
    // đáy phẳng: từ đường tâm tới hàng đáy
    const c0 = us.map((u) => [0, -T, -L / 2 + u * L + rake(u, -T)]), r0 = rows[0];
    bBot.grid(sx > 0 ? [c0, r0] : [r0, c0]);
    // gân mối hàn (Saltline): đường dọc các hàng trên nước + mối nối đứng xen kẽ
    const off = (u, y) => vadd(P(u, y, sx), vmul(Nrm(u, y, sx), 0.03 * k));
    for (let j = below.length; j < NR - 1; j++) bW.beam(us.slice(2, -2).map((u) => off(u, rowY(u)[j])), (() => { const a = []; for (const u of us.slice(2, -2)) a.push(Nrm(u, rowY(u)[j], sx)); return a; })(), 0.07 * k, 0.05 * k, false);
    for (let i = 3; i < NU - 3; i += 2) for (let j = below.length; j < NR - 1; j++) if ((i + j) % 2 === 0) { const u = us[i]; bW.beam([off(u, rowY(u)[j]), off(u, rowY(u)[j + 1])], Nrm(u, rowY(u)[j], sx), 0.05 * k, 0.04 * k, false); }
    // gờ chắn va (fender) ở ~72% mạn khô
    const fu = us.slice(3, -3); bF.beam(fu.map((u) => vadd(P(u, sheer(u) * 0.72, sx), vmul(Nrm(u, sheer(u) * 0.72, sx), 0.12 * k))), fu.map((u) => Nrm(u, sheer(u) * 0.72, sx)), 0.3 * k, 0.24 * k);
  }
  // vách lái (transom) phẳng ở u = 0
  { const ys = rowY(0); const L0 = ys.map((y) => P(0, y, 1)), R0 = ys.map((y) => P(0, y, -1)); bTr.grid([R0, L0].map((r) => r.slice()), (i, j) => [j, i / ys.length]); }
  for (const [n, b, m] of [['plating', bPl, mHull], ['bottom', bBot, mHull], ['transom', bTr, mHull], ['welds', bW, mHull], ['fender', bF, mDark]]) { const x = mergeOf(THREE, n, [b], m); if (x) hull.add(x); }

  // boong phẳng ở mép mạn
  { const b = Builder(THREE); const Lr = us.map((u) => P(u, sheer(u), 1)), Rr = us.map((u) => P(u, sheer(u), -1)); b.grid([Lr, Rr], (i, j) => [us[i] * L / 8, j * Bm / 8]); root.add(meshOf(THREE, 'deck', b.geo(), mDeck)); }
  // lan can: 2 ống ngang + cột đứng
  {
    const b = Builder(THREE), h = 1.05 * k * 1.6, rs = us.slice(1, -1);
    for (const sx of [1, -1]) {
      for (const f of [0.55, 1]) b.tube(rs.map((u) => { const p = P(u, sheer(u), sx); return [p[0] - sx * 0.15 * k, p[1] + h * f, p[2]]; }), 0.045 * k, 6, false);
      for (let z = -L / 2 + 2 * k; z < L / 2 - 2 * k; z += 3 * k) { const u = (z + L / 2) / L, p = P(u, sheer(u), sx); b.tube([[p[0] - sx * 0.15 * k, p[1], p[2]], [p[0] - sx * 0.15 * k, p[1] + h, p[2]]], 0.04 * k, 5, false); }
    }
    root.add(meshOf(THREE, 'rail', b.geo(), mTrim));
  }
  // lỗ thoát nước (scuppers) + vệt gỉ chảy dưới mỗi lỗ (decal bám mặt thân)
  const R = mulberry(o.seed * 101 + 9);
  const patch = (u0, u1, y0, y1, sx, eps, flip = false) => {
    const b = Builder(THREE), rows = [], N = 6;
    for (let j = 0; j <= N; j++) { const row = []; for (let i = 0; i <= N; i++) { const u = lerp(u0, u1, i / N), y = lerp(y0, y1, j / N); row.push(vadd(P(u, y, sx), vmul(Nrm(u, y, sx), eps))); } rows.push(row); }
    b.grid(sx > 0 ? rows : rows.slice().reverse(), (i, j) => { const s = flip ? 1 - i / N : i / N; return [s, sx > 0 ? j / N : 1 - j / N]; });
    return b;
  };
  {
    const bSc = Builder(THREE), bRust = [], rt = rustTex(THREE, o.seed);
    const mRust = new THREE.MeshStandardMaterial({ map: rt, transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide, name: 'hull_rust' });
    if (!rt) mRust.visible = false;
    for (const sx of [1, -1]) for (let z = -L / 2 + 0.22 * L; z < L / 2 - 0.2 * L; z += 5.5 * k * 1.4) {
      const u = (z + L / 2) / L, ys = sheer(u) - 0.45 * k, p = P(u, ys, sx), n = Nrm(u, ys, sx);
      const c = vadd(p, vmul(n, 0.02 * k)); bSc.box(c[0] - 0.05 * k, c[1] - 0.12 * k, c[2] - 0.35 * k, c[0] + 0.05 * k, c[1] + 0.12 * k, c[2] + 0.35 * k);
      const len = (2.6 + 3.2 * R()) * k, du = 0.5 * k / L;
      bRust.push(patch(u - du, u + du, ys - 0.1 * k - len, ys - 0.1 * k, sx, 0.02 * k, sx < 0));
    }
    // vệt gỉ lớn dưới lỗ neo ở mũi
    for (const sx of [1, -1]) { const u = 0.93; bRust.push(patch(u - 0.02, u + 0.02, sheer(u) - 0.85 * free, sheer(u) - 0.2 * free, sx, 0.022 * k, sx < 0)); }
    hull.add(meshOf(THREE, 'scuppers', bSc.geo(), mDark));
    const mr = mergeOf(THREE, 'rust', bRust, mRust); if (mr) { mr.renderOrder = 1; hull.add(mr); }
  }
  // thang mớn nước ở mũi + lái (2 mạn), tên tàu ở mũi (2 mạn, đọc đúng chiều từ ngoài nhìn vào)
  {
    const mt = marksTex(THREE, C.trim);
    const mMarks = new THREE.MeshStandardMaterial({ map: mt, transparent: true, depthWrite: false, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide, name: 'hull_marks' });
    if (!mt) mMarks.visible = false;
    const bs = [];
    for (const sx of [1, -1]) for (const u of [0.955, 0.04]) { const w = (0.9 * k) / L; bs.push(patch(u - w, u + w, -0.55 * T, 0.6 * free, sx, 0.02 * k, sx > 0)); }
    const m = mergeOf(THREE, 'marks', bs, mMarks); if (m) { m.renderOrder = 2; hull.add(m); }
    if (o.name) {
      const nt = nameTex(THREE, String(o.name).toUpperCase(), o.seed, C.trim);
      const mName = new THREE.MeshStandardMaterial({ map: nt.tex, transparent: true, depthWrite: false, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide, name: 'hull_name' });
      if (!nt.tex) mName.visible = false;
      const hgt = 0.17 * free, wid = Math.min(0.13 * L, hgt * nt.aspect()), u1 = 0.88, u0 = u1 - wid / L, y0 = sheer(0.84) * 0.78 - hgt / 2;
      for (const sx of [1, -1]) { const me = meshOf(THREE, sx > 0 ? 'nameL' : 'nameR', patch(u0, u1, y0, y0 + hgt, sx, 0.024 * k, sx > 0).geo(), mName); me.renderOrder = 2; hull.add(me); }
    }
  }
  // cabin lái (house) ở phía lái + cột đèn
  {
    const b = Builder(THREE), g = Builder(THREE), z0 = -L / 2 + 0.08 * L, z1 = z0 + 0.16 * L, y0 = sheer(0.2), hw = Bm * 0.36, hH = 3.2 * k * 1.3;
    b.box(-hw, y0, z0, hw, y0 + hH, z1); b.box(-hw * 0.8, y0 + hH, z0 + 0.15 * (z1 - z0), hw * 0.8, y0 + hH * 1.8, z1 - 0.05 * (z1 - z0));
    b.box(-hw * 1.12, y0 + hH * 1.8, z0 + 0.1 * (z1 - z0), hw * 1.12, y0 + hH * 1.86, z1);
    const wy = y0 + hH * 1.45, wz = z1 - 0.05 * (z1 - z0) + 0.02;
    for (let i = 0; i < 5; i++) { const x0 = -hw * 0.7 + i * hw * 0.29; g.box(x0, wy - 0.35 * k * 1.3, wz - 0.01, x0 + hw * 0.22, wy + 0.35 * k * 1.3, wz + 0.04 * k); }
    const house = meshOf(THREE, 'house', b.geo(), mTrim); house.add(meshOf(THREE, 'windows', g.geo(), mGlass)); root.add(house);
    const bm = Builder(THREE); bm.tube([[0, y0 + hH * 1.86, (z0 + z1) / 2], [0, y0 + hH * 1.86 + 6 * k * 1.3, (z0 + z1) / 2]], 0.18 * k, 8);
    root.add(meshOf(THREE, 'mast', bm.geo(), mTrim));
    if (o.funnel !== false) {
      const bf = Builder(THREE), fz = z0 - 0.02 * L; bf.tube([[0, y0, fz], [0, y0 + hH * 2.3, fz - 0.2 * k]], 1.0 * k * 1.3, 14);
      const fun = meshOf(THREE, 'funnel', bf.geo(), stdMat(THREE, C.top, { roughness: 0.6, name: 'hull_funnel' }));
      const bb = Builder(THREE); bb.tube([[0, y0 + hH * 2.05, fz - 0.18 * k], [0, y0 + hH * 2.3 + 0.02, fz - 0.2 * k]], 1.03 * k * 1.3, 14);
      fun.add(meshOf(THREE, 'funnelBand', bb.geo(), mDark)); root.add(fun);
    }
  }
  // bánh lái dưới vách lái
  { const b = Builder(THREE); b.box(-0.12 * k, -T + 0.1 * T, -L / 2 - 1.2 * k, 0.12 * k, -0.15 * T, -L / 2 + 0.2 * k); root.add(meshOf(THREE, 'rudder', b.geo(), mHull)); }
  return { draft: T, freeboard: free };
}

// ================================================================= RAFT (bè gỗ)
function buildRaft(THREE, o, root) {
  const L = o.length, Bm = o.beam, R = mulberry(o.seed * 41 + 3), C = o.colors;
  const n = Math.max(4, o.strakes | 0 || Math.round(Bm / 1.1)), d = Bm / n, r = d / 2, yc = 0.3 * r;   // ~35% đường kính chìm
  const wood = woodTex(THREE, o.seed); if (wood) wood.repeat.set(2, 0.5);
  const mLog = paintMaterial(THREE, { top: C.top, bottom: C.bottom, boot: C.bottom, wl: 0, bootH: 0, dirt: o.dirt, seed: o.seed, map: wood, rough: 0.85, tag: 'raft' });
  const mRope = stdMat(THREE, C.trim, { roughness: 0.95, name: 'hull_rope' });
  const hull = new THREE.Group(); hull.name = 'hull'; root.add(hull);
  const bLog = Builder(THREE);
  for (let i = 0; i < n; i++) {
    const x = -Bm / 2 + r + i * d, ext = (R() - 0.5) * 0.12 * L, rr = r * (0.9 + 0.1 * R());
    const z0 = -L / 2 + ext * 0.5 - R() * 0.04 * L, z1 = L / 2 + ext * 0.5 + R() * 0.04 * L;
    const pts = []; for (let j = 0; j <= 6; j++) pts.push([x + (R() - 0.5) * 0.02 * d, yc + (R() - 0.5) * 0.03 * d, lerp(z0, z1, j / 6)]);
    bLog.tube(pts, (f) => rr * (1 - 0.18 * Math.pow(Math.abs(f * 2 - 1), 6)), 10);
  }
  hull.add(meshOf(THREE, 'logs', bLog.geo(), mLog));
  const deck = new THREE.Group(); deck.name = 'deck'; root.add(deck);
  const bX = Builder(THREE), bLash = Builder(THREE), top = yc + r;
  for (const f of [-0.36, 0.36, 0]) {
    const z = f * L; bX.tube([[-Bm / 2 - 0.2 * r, top + 0.35 * r, z], [Bm / 2 + 0.2 * r, top + 0.35 * r, z]], 0.42 * r, 8);
    // dây buộc: vòng elip ôm xà ngang + lưng khúc gỗ bên dưới, mỗi chỗ giao 2 vòng chéo
    for (let i = 0; i < n; i++) { const x = -Bm / 2 + r + i * d; for (const s of [-1, 1]) { const ring = []; for (let a = 0; a <= 16; a++) { const q = (a / 16) * Math.PI * 2; ring.push([x + s * 0.18 * r * Math.sin(q), top + 0.2 * r + 0.72 * r * Math.cos(q), z + 0.5 * r * Math.sin(q)]); } bLash.tube(ring, 0.06 * r, 4, false); } }
  }
  deck.add(meshOf(THREE, 'crossbeams', bX.geo(), mLog), meshOf(THREE, 'lashings', bLash.geo(), mRope));
  if (o.mast !== false) {
    const H = o.mastHeight ?? L * 0.75, bm = Builder(THREE); bm.tube([[0, top, -0.05 * L], [0, top + H, -0.05 * L]], 0.25 * r, 8);
    const mast = meshOf(THREE, 'mast', bm.geo(), mLog); root.add(mast);
    if (o.sail !== false) {
      const sail = new THREE.Group(); sail.name = 'sail'; sail.position.set(0, 0, -0.05 * L); root.add(sail);
      const w = Bm * 0.95, y0 = top + H * 0.3, y1 = top + H * 0.95, b = Builder(THREE), rows = [];
      for (let j = 0; j <= 10; j++) { const row = []; for (let i = 0; i <= 10; i++) { const s = i / 10, t = j / 10; row.push([lerp(-w / 2, w / 2, s), lerp(y0, y1, t), 0.3 * r + (o.camber ?? 0.12) * w * Math.sin(Math.PI * s) * Math.sin(Math.PI * t)]); } rows.push(row); }
      b.grid(rows, (i, j) => [i / 10, j / 10]);
      const mS = stdMat(THREE, '#ffffff', { map: sailTex(THREE, o.seed, o.sailColor || '#d8c7a2'), roughness: 0.95, side: THREE.DoubleSide, name: 'hull_sail' });
      if (!mS.map) mS.color.set(o.sailColor || '#d8c7a2');
      sail.add(meshOf(THREE, 'sailCloth', b.geo(), mS));
      const by = Builder(THREE); by.tube([[-w / 2 - 0.3 * r, y1, 0.25 * r], [w / 2 + 0.3 * r, y1, 0.25 * r]], 0.16 * r, 6); sail.add(meshOf(THREE, 'yard', by.geo(), mLog));
      if (o.sailAngle) sail.rotation.y = o.sailAngle;
    }
  }
  return { draft: -(yc - r), freeboard: top };
}

// ================================================================= API
export const HULL_DEFAULTS = {
  skiff: { length: 18, beam: 5.6, depth: 2.9, strakes: 8, colors: { top: '#3a2a1e', bottom: '#2a1d14', trim: '#cbbd98' } },
  ship: { length: 60, beam: 12, depth: 8, strakes: 0, colors: { top: '#2b4c72', bottom: '#8a2b1f', trim: '#ece8dc' } },
  raft: { length: 12, beam: 7, depth: 1.2, strakes: 0, colors: { top: '#8a6a44', bottom: '#4a3a26', trim: '#c9b48a' } },
};

export function createHull(THREE, opts = {}) {
  const type = HULL_DEFAULTS[opts.type] ? opts.type : 'skiff';
  const D = HULL_DEFAULTS[type];
  const o = { dirt: 0.5, seed: 1, ...D, ...opts, type, colors: { ...D.colors, ...(opts.colors || {}) } };
  o.seed = Math.abs(Math.floor(o.seed)) || 1;
  const root = new THREE.Group();
  root.name = opts.id || `hull_${type}`;
  const info = type === 'ship' ? buildShip(THREE, o, root) : type === 'raft' ? buildRaft(THREE, o, root) : buildSkiff(THREE, o, root);
  const parts = []; root.traverse((x) => { if (x !== root && x.name) parts.push(x.name); });
  root.userData = {
    ...root.userData, type, length: o.length, beam: o.beam, depth: o.depth, name: o.name || '', seed: o.seed,
    waterline: 0, draft: info.draft, freeboard: info.freeboard,
    footprint: { hx: o.beam / 2, hz: o.length / 2 }, parts,
  };
  return root;
}
