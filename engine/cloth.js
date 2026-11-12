// cloth.js — VẢI MỀM cho buồm và chăn (người dùng 2026-11-12: "chất liệu vải như cánh buồm Tidewright").
// Cách làm (tự viết, chỉ học cảm giác: buồm vải sợi thô, xuyên sáng khi nắng/trăng sau lưng, gợn gió chạy dọc tấm):
//   - Lưới vải dựng bằng code (không dùng mesh khối cứng) → biến dạng trên CPU mỗi lần seek = HÀM THUẦN của t (tất định),
//     tính lại pháp tuyến → bóng nếp gấp đúng.
//   - Vật liệu MeshStandardMaterial vá shader: vân dệt chéo (canvas), đường may theo tấm, viền sáng mềm (sheen),
//     XUYÊN SÁNG: mặt khuất đèn vẫn sáng ấm theo màu vải (ánh sáng lọt qua sợi), sợi dày/đường may chặn bớt.
//   - Bật/tắt: CLOTH.on (post.js FX 'cloth'). Tắt = vải đứng yên, không vân/không xuyên sáng (như bản cũ).
//
// API:
//   clothMaterial(THREE, { color, trans, weave, sheen, seams: [khoảng cách tấm theo u, theo v], seamDir })
//   createSail(THREE, { w, h, belly, color, seed, wind })  → Mesh (gốc = giữa mép trên, buồm rủ xuống −y, bụng về +z); .userData.update(t)
//   createBlanket(THREE, { w, d, top, edgeY, color, cuff, lumps:[[x,z,r,h]], seed }) → Group (gốc = tâm mặt giường); .userData.update(t)
export const CLOTH = { on: { value: 1 } };
const on = () => CLOTH.on.value > 0.5;

const h1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export function clothMaterial(THREE, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: o.color || '#e9dfc8', roughness: o.roughness ?? 0.93, metalness: 0, side: THREE.DoubleSide });
  m.name = o.name || 'cloth';
  if (!o.grunge) m.userData.noGrunge = true;   // grunge.js bỏ qua (trừ khi o.grunge: buồm cũ lấy thêm lớp bụi/vân sần chung)
  const U = {
    uClOn: CLOTH.on,
    uClTrans: { value: o.trans ?? 0.55 },        // độ xuyên sáng
    uClWeave: { value: o.weave ?? 1 },           // độ rõ vân dệt
    uClSheen: { value: o.sheen ?? 0.35 },        // viền sáng mềm khi nhìn xiên
    uClSeam: { value: new THREE.Vector2(...(o.seams || [0.75, 0])) },   // khoảng cách đường may (đơn vị uv = stud); 0 = không
    uClWeaveSc: { value: o.weaveScale ?? 22 },   // số sợi / stud
    uClDirt: { value: o.dirt ?? 0 },             // độ cũ bẩn: ố nước chảy dọc, bẩn mép dưới + mép buộc, mốc loang
    uClSize: { value: new THREE.Vector2(...(o.size || [1, 1])) },   // cỡ tấm (stud) để chuẩn hoá uv
  };
  m.userData.clothU = U;
  m.customProgramCacheKey = () => 'cloth1';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vClUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvClUv = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec2 vClUv;
uniform float uClOn, uClTrans, uClWeave, uClSheen, uClWeaveSc, uClDirt;
uniform vec2 uClSeam, uClSize;
float clH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float clN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(clH(i), clH(i + vec2(1, 0)), f.x), mix(clH(i + vec2(0, 1)), clH(i + vec2(1, 1)), f.x), f.y); }
float clThick = 0.0;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
if (uClOn > 0.5) {
  vec2 q = vClUv * uClWeaveSc;
  // vân dệt chéo: sợi dọc/ngang đan xen + sợi to nhỏ không đều (slub)
  float wu = 0.5 + 0.5 * sin(q.x * 6.2832), wv = 0.5 + 0.5 * sin(q.y * 6.2832);
  float over = step(0.5, fract((floor(q.x) + floor(q.y)) * 0.5));
  float thread = mix(wu, wv, over);
  float slub = clN(vec2(vClUv.x * 3.0, vClUv.y * 40.0)) * 0.6 + clN(vec2(vClUv.x * 45.0, vClUv.y * 2.5)) * 0.4;
  // vết bạc màu / loang nước lớn
  float blot = clN(vClUv * 1.3) * 0.65 + clN(vClUv * 4.1) * 0.35;
  // đường may theo tấm (2 đường chỉ sát nhau) — chỗ vải chồng 2 lớp
  float seam = 0.0;
  if (uClSeam.x > 0.0) { float s = abs(fract(vClUv.x / uClSeam.x + 0.5) - 0.5) * uClSeam.x; seam = max(seam, 1.0 - smoothstep(0.02, 0.05, s)); }
  if (uClSeam.y > 0.0) { float s = abs(fract(vClUv.y / uClSeam.y + 0.5) - 0.5) * uClSeam.y; seam = max(seam, 1.0 - smoothstep(0.02, 0.05, s)); }
  float stitch = seam * step(0.5, fract((vClUv.x + vClUv.y) * 30.0));
  float k = uClWeave;
  diffuseColor.rgb *= 1.0 + k * ((thread - 0.5) * 0.10 + (slub - 0.5) * 0.10 - (blot - 0.5) * 0.14 - seam * 0.06 - stitch * 0.03);
  clThick = thread * 0.35 + slub * 0.25 + seam * 0.9;
  if (uClDirt > 0.0) {
    vec2 n = vClUv / uClSize;                                                  // 0..1, y = 0 ở mép trên (xà)
    float streak = clN(vec2(vClUv.x * 3.2, vClUv.y * 0.22)) * 0.7 + clN(vec2(vClUv.x * 11.0, vClUv.y * 0.6)) * 0.3;   // ố nước chảy dọc
    float bottom = smoothstep(0.5, 1.0, n.y);                                  // mép dưới bẩn nhất (nước bắn, tay kéo)
    float edge = 1.0 - smoothstep(0.0, 0.07, min(n.x, 1.0 - n.x));             // 2 mép buộc dây
    float mold = smoothstep(0.66, 0.86, clN(vClUv * 1.9) * 0.7 + clN(vClUv * 7.3) * 0.3);   // mốc loang
    float grime = clamp(bottom * (0.45 + 0.55 * streak) + edge * 0.4 + mold * 0.5 + (streak - 0.45) * 0.45 + seam * 0.25, 0.0, 1.0);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.60, 0.53, 0.42), grime * uClDirt);
    float speck = step(0.93, clH(floor(vClUv * 40.0)));                       // chấm bẩn li ti
    diffuseColor.rgb *= 1.0 - speck * 0.18 * uClDirt;
    // mảng vá / lỗ rách sẫm màu rải rác (như buồm cũ Kenney): đốm méo, viền nhạt hơn lõi
    float pn = clN(vClUv * 2.6 + 7.3) * 0.55 + clN(vClUv * 9.5 + 1.7) * 0.3 + clN(vClUv * 23.0) * 0.15;
    float hole = smoothstep(0.735, 0.765, pn), rim = smoothstep(0.70, 0.735, pn) - hole;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.11, 0.13), hole * 0.85 * uClDirt);
    diffuseColor.rgb *= 1.0 - rim * 0.25 * uClDirt;
    clThick += hole * 0.6 * uClDirt;
    clThick += grime * 0.3 * uClDirt;
  }
}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
if (uClOn > 0.5) {
  vec3 V = normalize(vViewPosition);
  float nv = abs(dot(normal, V));
  // viền sáng mềm của vải (sợi bông bắt sáng khi nhìn xiên)
  reflectedLight.indirectDiffuse += diffuseColor.rgb * uClSheen * pow(1.0 - nv, 3.0) * 0.8;
  #if NUM_DIR_LIGHTS > 0
  {
    // XUYÊN SÁNG: đèn ở phía sau tấm vải (so với mặt đang nhìn) → ánh sáng lọt qua, ấm theo màu vải; sợi dày / đường may chặn bớt
    float back = max(0.0, -dot(normal, directionalLights[0].direction));
    float fwd = pow(max(0.0, dot(-V, directionalLights[0].direction) * 0.5 + 0.5), 2.0);   // đèn nằm gần sau lưng vải so với mắt → rực hơn
    vec3 tint = pow(diffuseColor.rgb, vec3(0.75));
    reflectedLight.directDiffuse += tint * directionalLights[0].color * back * (0.35 + 0.65 * fwd) * uClTrans * (1.0 - 0.55 * clThick);
  }
  #endif
}`);
  };
  return m;
}

// ---------------------------------------------------------------- lưới vải chung
function grid(THREE, nu, nv, fn, uvScale) {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3), uv = new Float32Array((nu + 1) * (nv + 1) * 2), idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const k = j * (nu + 1) + i, p = fn(i / nu, j / nv);
    pos.set(p, k * 3); uv[k * 2] = (i / nu) * uvScale[0]; uv[k * 2 + 1] = (j / nv) * uvScale[1];
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function deform(geo, nu, nv, fn) {
  const p = geo.attributes.position.array;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) p.set(fn(i / nu, j / nv), (j * (nu + 1) + i) * 3);
  geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
}
const tagMesh = (mesh, grunge = false) => { mesh.userData.matKind = 'none'; if (!grunge) mesh.userData.grungeKind = 'none'; mesh.userData.noMerge = true; mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };

// ---------------------------------------------------------------- BUỒM vuông (treo trên xà, góc dưới buộc)
// u: trái→phải, v: trên (xà) → dưới. Bụng về +z. wind: độ mạnh gió (1 = vừa, 1.8 = bão).
export function createSail(THREE, o = {}) {
  const W = o.w ?? 4.4, H = o.h ?? 4.7, B = o.belly ?? 1.0, wind = o.wind ?? 1, seed = o.seed ?? 1, boom = !!o.spars;   // spars: xà trên + xà dưới bằng gỗ, mép dưới buộc vào xà
  const NU = 22, NV = 20, ph = h1(seed) * 6.28;
  const shape = (u, v, t, live) => {
    const su = Math.sin(Math.PI * u);
    // gió giật: 2 sin lệch pha theo seed; bão giật mạnh + lâu lâu buồm xẹp nhẹ rồi căng lại
    const gust = live ? 0.86 + 0.10 * Math.sin(t * 1.15 + ph) + 0.06 * Math.sin(t * 2.9 + ph * 1.7) * wind : 1;
    const belly = B * gust * Math.pow(su, 0.85) * (boom ? Math.sin(Math.PI * v) : Math.sin(Math.PI * (0.06 + 0.8 * v)));
    let z = belly, x = (u - 0.5) * W, y = -v * H;
    if (live) {
      const free = su * (boom ? Math.sin(Math.PI * v) : v);   // tự do = xa xà và xa 2 mép buộc
      z += 0.12 * wind * free * Math.sin(5.5 * u + 3.6 * v - 4.2 * t * (0.7 + 0.3 * wind) + ph);   // gợn chạy ngang tấm
      z += 0.06 * wind * free * Math.sin(11 * u - 7 * v - 8.5 * t + ph * 2.0);
      const edge = boom ? 0 : Math.pow(v, 4);            // mép dưới rung (lá buồm phần phật) — không rung khi buộc vào xà
      z += 0.10 * wind * edge * su * Math.sin(16 * u - 13 * t + ph);
      y += 0.10 * wind * edge * su * (Math.sin(t * 2.3 + ph) * 0.5 - 0.3);   // mép dưới bị gió nhấc nhẹ
      x += 0.04 * wind * free * Math.sin(3 * v - 3.1 * t + ph);
    }
    return [x, y, z];
  };
  const geo = grid(THREE, NU, NV, (u, v) => shape(u, v, 0, false), [W, H]);
  const mat = clothMaterial(THREE, { color: o.color || '#ece2cb', trans: o.trans ?? 0.6, seams: [0, 0], name: 'cloth_sail',
    weave: o.weave ?? 1.8, dirt: o.dirt ?? 1, size: [W, H], grunge: o.grunge ?? true });   // buồm cũ: vân dệt rõ + ố bẩn + lớp bụi chung (grunge.js)
  const mesh = tagMesh(new THREE.Mesh(geo, mat), o.grunge ?? true); mesh.name = o.name || 'sailCloth';
  if (boom) {   // 2 xà gỗ có núm đầu (giữ dáng buồm cũ)
    const wood = new THREE.MeshStandardMaterial({ color: o.sparColor || '#8a5a36', roughness: 0.85 }), cap = new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.6 });
    for (const [y, nm] of [[0.05, 'yard'], [-H - 0.05, 'boom']]) {
      const cg = new THREE.CylinderGeometry(0.13, 0.13, W + 0.5, 10); cg.rotateZ(Math.PI / 2);
      const sp = new THREE.Mesh(cg, wood); sp.name = nm; sp.position.set(0, y, 0.12); sp.castShadow = sp.receiveShadow = true; mesh.add(sp);
      for (const sx of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), cap); k.name = nm + '_end'; k.position.set(sx * (W / 2 + 0.25), y, 0.12); sp.parent.add(k); }
    }
  }
  let last = null;
  mesh.userData.update = (t) => {
    const live = on(), key = live ? t : -1;
    if (key === last) return; last = key;
    deform(geo, NU, NV, (u, v) => shape(u, v, t, live));
  };
  return mesh;
}

// ---------------------------------------------------------------- GỐI / ĐỆM phồng mềm (lưới siêu-elip bo tròn, không khối hộp)
// o: { a, b, c: nửa kích thước x,y,z; ex: độ vuông (1 = bầu dục, nhỏ = vuông hơn); dent: độ lõm giữa mặt trên; pinch: mép nén mỏng; color; seed }
// Gốc = tâm gối. Tĩnh (hàm thuần, không phụ thuộc t).
export function createPuffy(THREE, o = {}) {
  const a = o.a ?? 1.3, b = o.b ?? 0.55, c = o.c ?? 1.2, ex = o.ex ?? 0.62, dent = o.dent ?? 0.22, pinch = o.pinch ?? 0.45, seed = o.seed ?? 1;
  const g = new THREE.SphereGeometry(1, 44, 28);
  const p = g.attributes.position.array, sg = (v) => (v < 0 ? -1 : 1), pw = (v, e) => sg(v) * Math.pow(Math.abs(v), e);
  for (let i = 0; i < p.length; i += 3) {
    const dx = p[i], dy = p[i + 1], dz = p[i + 2];
    let nx = pw(dx, ex), nz = pw(dz, ex), ny = pw(dy, 0.9);
    const e = Math.max(Math.abs(nx), Math.abs(nz));                       // 0 giữa → 1 ở mép
    ny *= 1 - pinch * Math.pow(e, 3);                                      // mép nén mỏng như gối thật
    const r2 = nx * nx + nz * nz;
    if (ny > 0) ny -= dent * Math.exp(-r2 * 2.6) * (0.5 + 0.5 * ny);       // lõm nhẹ ở giữa mặt trên
    let x = nx * a, y = ny * b, z = nz * c;
    y += 0.035 * b * Math.sin(x * 3.1 + seed) * Math.sin(z * 2.7 + seed * 1.7) * (ny > 0 ? 1 : 0.3);   // gợn vải mịn
    x += 0.04 * a * Math.sin(z * 2.3 + seed * 2.2) * Math.abs(ny) * 0.3;
    p[i] = x; p[i + 1] = y; p[i + 2] = z;
  }
  g.computeVertexNormals();
  // làm mượt pháp tuyến qua đường nối UV (đỉnh trùng vị trí)
  const n = g.attributes.normal.array, map = new Map();
  for (let i = 0; i < p.length; i += 3) { const k = Math.round(p[i] * 1e3) + ',' + Math.round(p[i + 1] * 1e3) + ',' + Math.round(p[i + 2] * 1e3); let m = map.get(k); if (!m) map.set(k, m = [0, 0, 0, []]); m[0] += n[i]; m[1] += n[i + 1]; m[2] += n[i + 2]; m[3].push(i); }
  for (const m of map.values()) { const l = Math.hypot(m[0], m[1], m[2]) || 1; for (const i of m[3]) { n[i] = m[0] / l; n[i + 1] = m[1] / l; n[i + 2] = m[2] / l; } }
  g.computeBoundingSphere();
  const uv = g.attributes.uv.array; for (let i = 0; i < uv.length; i += 2) { uv[i] *= a * 2; uv[i + 1] *= c * 2; }
  const mat = clothMaterial(THREE, { color: o.color || '#f4f1ea', trans: 0.2, sheen: 0.45, weave: 0.8, weaveScale: o.weaveScale ?? 10, seams: [0, 0], name: o.name || 'cloth_puffy' });
  const m = tagMesh(new THREE.Mesh(g, mat)); m.name = o.name || 'puffy';
  return m;
}

// ---------------------------------------------------------------- NẾP GẤP GA ở cổ chăn (thay cuộn trụ cứng): dải vải liền bo tròn quanh mép chăn
// o: { w, top, z0, color }  — w = bề rộng dải. Tĩnh.
export function createFold(THREE, o = {}) {
  const w = o.w ?? 6.4, top = o.top ?? 4.7, z0 = o.z0 ?? -2.1, seed = o.seed ?? 5;
  // mặt cắt (dz, dy) so với mép chăn: nằm lên mặt chăn rồi cuộn vòng qua mép và rủ xuống phía cổ
  const P = [[1.2, 0.2], [0.85, 0.24], [0.5, 0.29], [0.15, 0.33], [-0.12, 0.28], [-0.27, 0.12], [-0.28, -0.08], [-0.12, -0.25], [0.2, -0.33], [0.65, -0.3]];
  const cr = (t) => { const n = P.length - 1, f = t * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)];
    const q = (k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u);
    return [q(0), q(1)]; };
  const NU = 40, NV = 26;
  const geo = grid(THREE, NU, NV, (u, v) => {
    const x = (u - 0.5) * w, k = Math.abs(x) / (w / 2), f = Math.sqrt(Math.max(0, 1 - Math.pow(k, 6)));   // 2 đầu dải khép lại
    const [dz, dy] = cr(v);
    const wob = 0.07 * Math.sin(x * 1.9 + seed + v * 2.0) + 0.05 * Math.sin(x * 4.6 + seed * 2.0);
    return [x, top + dy * (0.25 + 0.75 * f) + (dy > -0.05 ? 0.02 : 0) + wob * f * 0.5 - (1 - f) * 0.1, z0 + dz * (0.5 + 0.5 * f) + wob * 0.3 * f - (1 - f) * 0.05];
  }, [w, 3.2]);
  const mat = clothMaterial(THREE, { color: o.color || '#f1ebe0', trans: 0.2, sheen: 0.5, weaveScale: 14, seams: [0, 0], name: 'cloth_fold' });
  const m = tagMesh(new THREE.Mesh(geo, mat)); m.name = 'blanket_fold';
  return m;
}

// ---------------------------------------------------------------- CHĂN trùm người nằm
// Gốc = tâm giường ở mặt sàn giường cũ (toạ độ cục bộ của prop bed). Chăn phủ từ z0 (cổ) tới z1 (chân giường),
// mặt trên cao `top`, rủ xuống hai bên + cuối giường tới edgeY, nếp nhăn mềm, gồ lên theo người nằm (lumps) và thở nhẹ.
export function createBlanket(THREE, o = {}) {
  const w = o.w ?? 7.9, z0 = o.z0 ?? -2.1, z1 = o.z1 ?? 5.4, top = o.top ?? 4.7, edgeY = o.edgeY ?? 2.0, seed = o.seed ?? 3;
  const mw = o.mw ?? 6.8, mz1 = o.mz1 ?? 5.3;   // mép đệm (chỗ chăn bắt đầu rủ xuống)
  const lumps = o.lumps || [];
  const hangX = (w - mw) / 2 + (top - edgeY) * 0.25, hangZ = (top - edgeY) * 0.9;
  const NU = 34, NV = 30;
  const span = mw + 2 * hangX, len = (mz1 - z0) + hangZ;
  const shape = (u, v, t, live) => {
    // trải phẳng theo chiều dài cung: s = khoảng cách trên mặt vải
    const sx = (u - 0.5) * span, sz = v * len;
    let x, y, z;
    const ax = Math.abs(sx), half = mw / 2 - 0.35;
    if (ax <= half) { x = sx; y = top; }
    else { const k = Math.min(1, (ax - half) / (hangX + 0.35));   // bo mép đệm rồi rủ
      const a = k * Math.PI / 2; x = Math.sign(sx) * (half + Math.sin(a) * (hangX * 0.55 + 0.35)); y = top - (1 - Math.cos(a)) * (top - edgeY); }
    const zlen = mz1 - z0 - 0.35;
    if (sz <= zlen) z = z0 + sz;
    else { const k = Math.min(1, (sz - zlen) / (hangZ + 0.35)), a = k * Math.PI / 2;
      z = z0 + zlen + Math.sin(a) * (hangZ * 0.45 + 0.35); y = Math.min(y, top - (1 - Math.cos(a)) * (top - edgeY)); }
    // gồ theo người nằm + thở (hàm thuần của t)
    const onTop = Math.max(0, 1 - Math.max(0, ax - half) * 1.5);
    for (let i = 0; i < lumps.length; i++) {
      const [lx, lz, lr, lh] = lumps[i];
      const d2 = ((x - lx) ** 2) / (lr * lr) + ((z - lz) ** 2) / ((lr * 2.6) ** 2);
      const breathe = live ? 1 + 0.06 * Math.sin(t * 1.55 + i * 1.9) : 1;
      y += lh * breathe * Math.exp(-d2 * 1.6) * onTop;
    }
    // nếp nhăn mềm: dọc thân (giữa 2 người lõm nhẹ) + gợn chéo
    const wr = 0.10 * Math.sin(x * 2.1 + z * 0.7 + seed) + 0.06 * Math.sin(x * 4.3 - z * 1.9 + seed * 2.0) + 0.08 * Math.sin(z * 1.3 + x * 0.4 + seed * 3.0)
      + 0.12 * Math.pow(Math.max(0, Math.sin(x * 1.6 - z * 0.9 + seed * 1.3)), 6.0);   // vài nếp gấp sắc
    const neck = o.fold !== false ?Math.min(1, Math.max(0, (sz - 0.2) / 2.2)) : 1;   // gần cổ chăn phẳng hơn (để nếp gấp ga nằm êm lên trên)
    y += wr * (0.4 + 0.6 * onTop) * neck * neck * (3 - 2 * neck);
    if (o.fold !== false) y -= 0.12 * (1 - neck) * onTop;   // chăn hạ nhẹ dưới nếp gấp ga
    // mép rủ có sóng vải (nếp dọc khi chăn buông xuống)
    const hang = 1 - onTop;
    if (hang > 0) { const f = Math.sin(z * 2.4 + seed) * 0.12 + Math.sin(x * 2.4 + seed) * 0.12; x += Math.sign(x) * f * hang * (ax > half ? 1 : 0); z += (sz > zlen ? f * hang : 0); }
    return [x, y, z];
  };
  const geo = grid(THREE, NU, NV, (u, v) => shape(u, v, 0, false), [span, len]);
  const mat = clothMaterial(THREE, { color: o.color || '#c0392b', trans: 0.25, sheen: 0.55, weave: 1.2, weaveScale: 9, seams: [span / 4, len / 5], name: 'cloth_blanket' });
  const g = new THREE.Group(); g.name = 'blanket';
  const mesh = tagMesh(new THREE.Mesh(geo, mat)); mesh.name = 'blanket_cloth'; g.add(mesh);
  // mép chăn gập ở cổ: cuộn vải sáng màu (ga trải giường lật ra)
  if (o.cuff !== false) {
    const cuffMat = clothMaterial(THREE, { color: o.cuffColor || '#f1ebe0', trans: 0.2, sheen: 0.5, weaveScale: 14, seams: [0, 0], name: 'cloth_cuff' });
    const cg = new THREE.CylinderGeometry(0.32, 0.32, mw + 0.2, 16, 1); cg.rotateZ(Math.PI / 2);
    const cuff = tagMesh(new THREE.Mesh(cg, cuffMat)); cuff.name = 'blanket_cuff'; cuff.position.set(0, top + 0.05, z0 + 0.15); g.add(cuff);
  }
  let last = null;
  g.userData.update = (t) => {
    const live = on(), key = live ? Math.round(t * 30) : -1;
    if (key === last) return; last = key;
    deform(geo, NU, NV, (u, v) => shape(u, v, t, live));
  };
  return g;
}
