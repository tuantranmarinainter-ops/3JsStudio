// grunge.js — Lớp "đồ cũ, bụi" kiểu Roblox phủ lên vật liệu có sẵn (không cần ảnh texture, chạy trên GPU, tất định).
//   applyGrunge(THREE, root, 'char' | 'build')   // vá mọi MeshStandardMaterial bên dưới root (bỏ qua vật trong suốt)
//   GRUNGE.char.value / GRUNGE.build.value = 0..1 // bật/tắt (engine/post.js đặt theo ô "Hiệu ứng hình")
// Một object có thể ghi đè loại bằng userData.grungeKind = 'char' | 'build' | 'none'.
//
// char  (quần áo, da nhân vật): bóng nếp gấp vải, mép khối tối (như áo Roblox vẽ sẵn bóng), dưới tối hơn trên,
//       vết bẩn loang, hạt li ti + gồ ghề nhẹ, màu xỉn bớt.
// build (nhà, đường, đá, cỏ…): vết ố loang lớn, vệt bẩn chảy dọc, chân tường bám đất, hạt sần + gồ ghề.
// Toạ độ nhiễu = toạ độ cục bộ của vật × tỉ lệ thế giới (đơn vị stud) → nhân vật/nhà đi lại thì vân đi theo, không trôi.

export const GRUNGE = { char: { value: 1 }, build: { value: 1 }, aged: { value: 1 } };
// aged (v2, chỉ loại build): nhà "bán thực" — sơn tróc lộ gỗ bạc, sơn phai nắng, ố dưới mái, rêu/đất chân tường.
// Chỉ ăn vào bề mặt SƠN MÀU (độ bão hoà cao) → đường, đá, cỏ xám gần như không đổi.

const VERT_PARS = /* glsl */`
attribute vec3 aGrBox; attribute vec3 aGrSize;
varying vec3 vGrP; varying vec3 vGrN; varying vec3 vGrB; varying vec3 vGrSz;`;
const VERT_MAIN = /* glsl */`
{ vec3 grS = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
  vGrP = position * grS; vGrN = normal; vGrB = aGrBox; vGrSz = aGrSize * grS; }`;

const FRAG_PARS = /* glsl */`
uniform float uGrunge; uniform float uGrAmt; uniform float uGrAged;
varying vec3 vGrP; varying vec3 vGrN; varying vec3 vGrB; varying vec3 vGrSz;
float grH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float grN3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(grH(i), grH(i + vec3(1,0,0)), f.x), mix(grH(i + vec3(0,1,0)), grH(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(grH(i + vec3(0,0,1)), grH(i + vec3(1,0,1)), f.x), mix(grH(i + vec3(0,1,1)), grH(i + vec3(1,1,1)), f.x), f.y), f.z); }
float grFbm(vec3 p) { return 0.55 * grN3(p) + 0.28 * grN3(p * 2.07 + 3.1) + 0.17 * grN3(p * 4.13 + 7.7); }
// khoảng cách (stud) tới mép khối, bỏ trục vuông góc mặt đang vẽ
float grEdge() { vec3 n = abs(normalize(vGrN)); vec3 d = min(vGrB, 1.0 - vGrB) * vGrSz;
  if (dot(vGrSz, vGrSz) < 1e-8) return 99.0;   // vật tạo sau khi vá (không có khung) → không tối mép
  float e = 99.0; if (n.x < 0.7) e = min(e, d.x); if (n.y < 0.7) e = min(e, d.y); if (n.z < 0.7) e = min(e, d.z); return e; }
float grHeight;`;

const FRAG_COLOR = {
  char: /* glsl */`
{ float k = uGrunge; vec3 p = vGrP;
  float blot = grFbm(p * 1.6);                                          // vết bẩn loang
  float fold = grN3(vec3(p.x * 5.0, p.y * 0.9, p.z * 5.0));             // nếp gấp dọc thân/tay
  float fine = grN3(p * 9.0);                                           // hạt vải li ti
  float edge = smoothstep(0.0, 0.32, grEdge());                         // mép khối tối (bóng vẽ sẵn)
  float shade = mix(0.72, 1.0, edge) * mix(0.88, 1.0, smoothstep(0.0, 0.8, vGrB.y)) * mix(0.90, 1.03, fold) * mix(0.96, 1.02, fine);
  vec3 c = diffuseColor.rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float amt = uGrAmt, dark = 1.0 - smoothstep(0.06, 0.32, l);          // vải tối (xanh than, đen) → bụi bạc màu thấy rõ hơn
  c = mix(c, vec3(l), 0.10 * amt);                                      // xỉn màu
  c = mix(c, vec3(0.46, 0.43, 0.38) * (0.55 + l), (smoothstep(0.6, 0.9, blot) * 0.14 + dark * (0.05 + 0.10 * blot)) * amt);   // bám bụi, bạc màu
  float light = smoothstep(0.25, 0.6, l), extra = max(amt - 1.0, 0.0) * 4.0;   // vải sáng của người mặc lâu (amount > 1): ố đất, gấu quần bẩn
  c = mix(c, vec3(0.24, 0.18, 0.11), clamp(light * extra * (0.12 + 0.32 * smoothstep(0.35, 0.85, blot) + 0.30 * (1.0 - smoothstep(0.0, 0.45, vGrB.y))), 0.0, 0.75));
  c *= shade;
  diffuseColor.rgb = mix(diffuseColor.rgb, c, k);
  grHeight = fold * k; }`,
  build: /* glsl */`
{ float k = uGrunge; vec3 p = vGrP;
  float stain = grFbm(p * 0.09);                                        // ố loang lớn
  float drip = grN3(vec3(p.x * 0.7, p.y * 0.05, p.z * 0.7));            // vệt chảy dọc
  float grit = grN3(p * 1.4); float fine = grN3(p * 4.5);               // sần
  float base = 1.0 - smoothstep(0.0, 0.22, vGrB.y);                     // chân bám đất
  float edge = smoothstep(0.0, 0.6, grEdge());
  vec3 c = diffuseColor.rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, vec3(l), 0.12);
  c *= mix(0.80, 1.06, grit * 0.45 + fine * 0.55);
  c *= mix(1.0, 0.82, smoothstep(0.5, 0.8, stain));
  c *= mix(1.0, 0.86, smoothstep(0.55, 0.75, drip) * smoothstep(0.15, 0.6, vGrB.y));
  c = mix(c, vec3(0.30, 0.25, 0.19) * (0.5 + l), base * 0.35);
  c *= mix(0.86, 1.0, edge);
  diffuseColor.rgb = mix(diffuseColor.rgb, c, k);
  grHeight = grit * k; }`,
};


const FRAG_AGED = /* glsl */`
{ float ag = uGrAged; vec3 p = vGrP; vec3 c = diffuseColor.rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float sat = max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
  float painted = smoothstep(0.06, 0.22, sat);
  vec3 n = abs(normalize(vGrN));
  float wall = 1.0 - step(0.7, n.y);                                    // mặt đứng
  float peel = grFbm(p * 0.85 + vec3(11.0, 3.0, 7.0));
  float peelM = smoothstep(0.665, 0.69, peel) * painted * wall;         // mảng sơn tróc (chỉ tường đứng, mái không)
  float rim = (smoothstep(0.625, 0.66, peel) - smoothstep(0.665, 0.69, peel)) * painted * wall;
  float grain = grN3(vec3(p.x * 0.5 + p.z * 0.5, p.y * 14.0, p.z * 0.3)); // vân gỗ theo ván ngang
  vec3 wood = vec3(0.52, 0.47, 0.40) * (0.78 + 0.4 * grain);
  c = mix(c, mix(vec3(l), c, 0.72) * 1.05, 0.38 * painted);             // sơn phai nắng
  c *= mix(0.9, 1.05, grain * painted);                                 // vân gỗ hằn qua lớp sơn
  c = mix(c, wood, peelM * 0.92);
  c *= 1.0 - rim * 0.4;                                                 // mép tróc tối
  float under = smoothstep(0.62, 1.0, vGrB.y) * wall;                   // ố dưới mái + vệt chảy
  c *= mix(1.0, 0.74, under * (0.45 + 0.55 * grN3(vec3(p.x * 1.4, p.y * 0.07, p.z * 1.4))));
  float moss = (1.0 - smoothstep(0.0, 0.2, vGrB.y)) * smoothstep(0.42, 0.72, grFbm(p * 0.45 + 5.0));
  c = mix(c, vec3(0.19, 0.25, 0.11) * (0.7 + 0.6 * l), moss * 0.5);    // rêu / đất chân tường
  diffuseColor.rgb = mix(diffuseColor.rgb, c, ag);
  grHeight += (peelM * 0.7 + rim) * ag; }`;

const FRAG_ROUGH = /* glsl */`roughnessFactor = mix(roughnessFactor, clamp(roughnessFactor + 0.22 + grHeight * 0.1, 0.0, 1.0), uGrunge);   // vải/tường nhám, hết bóng`;
const FRAG_BUMP = (amp) => /* glsl */`
{ vec3 sp = -vViewPosition; vec3 sx = dFdx(sp), sy = dFdy(sp);
  vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1);
  vec2 dh = vec2(dFdx(grHeight), dFdy(grHeight)) * ${amp};
  vec3 g = sign(det) * (dh.x * r1 + dh.y * r2);
  normal = normalize(mix(normal, normalize(abs(det) * normal - g), step(1e-9, abs(det)))); }`;

function ensureBoxAttr(THREE, geo) {
  if (geo.attributes.aGrBox || !geo.attributes.position) return;
  geo.computeBoundingBox(); const bb = geo.boundingBox, p = geo.attributes.position, n = p.count;
  const sz = new THREE.Vector3(); bb.getSize(sz);
  const box = new Float32Array(n * 3), size = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    box[i * 3] = sz.x > 1e-6 ? (p.getX(i) - bb.min.x) / sz.x : 0.5;
    box[i * 3 + 1] = sz.y > 1e-6 ? (p.getY(i) - bb.min.y) / sz.y : 0.5;
    box[i * 3 + 2] = sz.z > 1e-6 ? (p.getZ(i) - bb.min.z) / sz.z : 0.5;
    size[i * 3] = sz.x; size[i * 3 + 1] = sz.y; size[i * 3 + 2] = sz.z;
  }
  geo.setAttribute('aGrBox', new THREE.BufferAttribute(box, 3));
  geo.setAttribute('aGrSize', new THREE.BufferAttribute(size, 3));
}

function patch(mat, kind, amount = 1, aged = false) {
  if (mat.userData.grunge) return;
  mat.userData.grunge = kind;
  aged = aged && kind === 'build';
  // mesh dùng chung vật liệu nhưng tạo sau (chưa có aGrBox) → giá trị cố định, không đọc rác (giữ tất định)
  mat.defaultAttributeValues = { ...(mat.defaultAttributeValues || {}), aGrBox: [0.5, 0.5, 0.5], aGrSize: [0, 0, 0] };
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.uniforms.uGrunge = GRUNGE[kind]; sh.uniforms.uGrAmt = { value: amount }; sh.uniforms.uGrAged = GRUNGE.aged;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_PARS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_MAIN);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + FRAG_COLOR[kind] + (aged ? FRAG_AGED : ''))
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + FRAG_ROUGH)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + FRAG_BUMP('0.0'));
  };
  const key = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (key ? key() : '') + '|grunge_' + kind + (aged ? '_aged' : '');
  mat.needsUpdate = true;
}

export function applyGrunge(THREE, root, kind = 'build', { amount = 1, aged = false } = {}) {   // aged: lớp nhà cũ bán thực (v2) — chỉ gọi cho nhà   // amount: mức cũ/bụi riêng (vd. người cha 1.5)
  const walk = (o, k) => {
    k = o.userData.grungeKind || k;
    if (o.isMesh && k !== 'none' && !o.isInstancedMesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const ok = mats.filter((m) => m && m.isMeshStandardMaterial && !m.transparent && !m.userData.noGrunge && (k !== 'char' || m.map));   // nhân vật: chỉ quần áo/mũ (có texture), da/mặt giữ trơn
      if (ok.length) { ensureBoxAttr(THREE, o.geometry); ok.forEach((m) => patch(m, k, amount, aged)); }
    }
    for (const c of o.children) walk(c, k);
  };
  walk(root, kind);
}
