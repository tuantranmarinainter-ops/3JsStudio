// proctex.js — Texture sinh bằng shader, NƯỚNG 1 LẦN lúc dựng cảnh (ý tưởng từ Saltline): không cần file ảnh.
// Mỗi họ texture là 1 hàm GLSL surf(uv) → (màu tuyến tính, độ cao). Noise lát gạch được (tileable) và hash PCG số nguyên
// → cùng seed ra cùng ảnh. Áp lên vật bằng chiếu 3 mặt (triplanar) theo toạ độ thế giới → không cần UV,
// dùng được cho khối R6, khối tự dựng, cả mesh Kenney. Độ cao trong kênh alpha → tạo gồ ghề (bump) khi render.
//
// Dùng:
//   import { bakeProcTexture, applyProcTexture, PROC_FAMILIES } from './proctex.js';
//   const brick = bakeProcTexture(THREE, renderer, 'brick', { size: 512, seed: 3 });   // TRƯỚC lần seek đầu
//   applyProcTexture(THREE, wallMaterial, brick, { scale: 0.25, bump: 1 });            // 0.25 = 1 ô / 4 mét
// material.color nhân vào texture → 1 texture gạch, nhiều màu tường (giống "alpha = mặt nạ sơn" của Saltline).

export const PROC_FAMILIES = {
  brick: 'Tường gạch', paving: 'Vỉa hè lát đá', asphalt: 'Nhựa đường', grass: 'Cỏ', concrete: 'Bê tông',
  planks: 'Ván gỗ', roof: 'Ngói', dirt: 'Đất sỏi',
};

const LIB = /* glsl */ `
uniform uint uSeed;
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float h2(vec2 c) { ivec2 p = ivec2(c); return float(pcg(uint(p.x) + pcg(uint(p.y) + pcg(uSeed)))) / 4294967295.0; }
float h2b(vec2 c, float k) { return h2(c + vec2(k * 131.0, k * 71.0)); }
vec2 wrap(vec2 c, float per) { return mod(c, per); }
float vnoise(vec2 p, float per) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  float a = h2(wrap(i, per)), b = h2(wrap(i + vec2(1, 0), per)), c = h2(wrap(i + vec2(0, 1), per)), d = h2(wrap(i + vec2(1, 1), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// fbm lát được: uv 0..1, base = số ô ở quãng đầu
float fbm(vec2 uv, float base, int oct) {
  float s = 0.0, a = 0.5, n = 0.0, per = base;
  for (int i = 0; i < 7; i++) { if (i >= oct) break; s += a * vnoise(uv * per, per); n += a; a *= 0.5; per *= 2.0; }
  return s / n;
}
// Voronoi lát được: (F1, F2)
vec2 voronoi(vec2 uv, float per) {
  vec2 p = uv * per, i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y), c = wrap(i + g, per);
    vec2 o = vec2(h2(c), h2b(c, 1.0));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(d1, d2);
}
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 hex(float r, float g, float b) { return lin(vec3(r, g, b) / 255.0); }
`;

const FAMILY = {
  brick: /* glsl */ `
vec4 surf(vec2 uv) {
  float rows = 8.0, cols = 4.0;
  float r = floor(uv.y * rows);
  vec2 p = vec2(uv.x * cols + mod(r, 2.0) * 0.5, uv.y * rows);
  vec2 id = vec2(mod(floor(p.x), cols), r), f = fract(p);
  float m = 0.06;
  float mortar = step(f.x, m) + step(1.0 - m * 0.5, f.x) + step(f.y, m * 2.0) + step(1.0 - m, f.y);
  float n = fbm(uv, 16.0, 5);
  vec3 c = mix(hex(150., 62., 44.), hex(196., 98., 66.), h2(id)) * (0.8 + 0.4 * n);
  c = mix(c, hex(90., 70., 60.), step(0.92, h2b(id, 2.0)) * 0.5);              // vài viên sẫm
  vec3 mc = hex(178., 170., 158.) * (0.85 + 0.3 * fbm(uv, 32.0, 3));
  float edge = min(min(f.x, 1.0 - f.x) * cols, min(f.y, 1.0 - f.y) * 2.0);
  float h = mortar > 0.0 ? 0.05 : 0.65 + 0.35 * smoothstep(0.0, 0.25, edge) * (0.8 + 0.2 * n);
  return vec4(mortar > 0.0 ? mc : c, h);
}`,
  paving: /* glsl */ `
vec4 surf(vec2 uv) {
  float k = 4.0; vec2 p = uv * k, id = floor(p), f = fract(p);
  float gap = 0.035, g = step(f.x, gap) + step(1.0 - gap, f.x) + step(f.y, gap) + step(1.0 - gap, f.y);
  float n = fbm(uv, 24.0, 5);
  vec3 c = mix(hex(150., 150., 146.), hex(186., 184., 178.), h2(id)) * (0.85 + 0.3 * n);
  return vec4(g > 0.0 ? hex(70., 70., 68.) : c, g > 0.0 ? 0.0 : 0.7 + 0.3 * n);
}`,
  asphalt: /* glsl */ `
vec4 surf(vec2 uv) {
  float n = fbm(uv, 8.0, 6), sp = h2(floor(uv * 1024.0));
  vec2 v = voronoi(uv, 6.0);
  float crack = 1.0 - smoothstep(0.0, 0.025, v.y - v.x);
  crack *= step(0.55, fbm(uv + 0.3, 4.0, 3));                                  // nứt chỉ ở vài vùng
  vec3 c = hex(52., 54., 58.) * (0.75 + 0.5 * n) + vec3(0.05) * step(0.93, sp);
  c *= 1.0 - crack * 0.6;
  return vec4(c, 0.5 + 0.3 * n + 0.2 * step(0.93, sp) - crack * 0.5);
}`,
  grass: /* glsl */ `
vec4 surf(vec2 uv) {
  float n = fbm(uv, 6.0, 5), blades = vnoise(uv * vec2(256.0, 64.0), 64.0) * vnoise(uv * vec2(64.0, 256.0), 64.0);
  vec3 c = mix(hex(66., 120., 44.), hex(118., 170., 64.), n) * (0.75 + 0.5 * blades);
  c = mix(c, hex(150., 160., 70.), smoothstep(0.7, 0.85, fbm(uv + 0.5, 4.0, 3)) * 0.35);   // mảng cỏ khô
  return vec4(c, 0.3 + 0.7 * blades);
}`,
  concrete: /* glsl */ `
vec4 surf(vec2 uv) {
  float n = fbm(uv, 6.0, 6), stain = smoothstep(0.55, 0.75, fbm(uv + 0.7, 3.0, 4));
  float pore = step(0.985, h2(floor(uv * 512.0)));
  vec3 c = hex(168., 166., 160.) * (0.82 + 0.3 * n) * (1.0 - stain * 0.25) * (1.0 - pore * 0.4);
  return vec4(c, 0.5 + 0.4 * n - pore * 0.4);
}`,
  planks: /* glsl */ `
vec4 surf(vec2 uv) {
  float k = 6.0; float id = floor(uv.x * k), fx = fract(uv.x * k);
  float gap = step(fx, 0.03) + step(0.97, fx);
  float grain = sin((uv.y * 40.0 + fbm(vec2(uv.x * 2.0, uv.y), 4.0, 4) * 6.0 + h2(vec2(id, 0.0)) * 20.0) * 3.14159);
  vec3 c = mix(hex(120., 78., 44.), hex(170., 118., 70.), h2(vec2(id, 3.0))) * (0.85 + 0.15 * grain) * (0.85 + 0.3 * fbm(uv, 8.0, 4));
  return vec4(gap > 0.0 ? hex(50., 34., 22.) : c, gap > 0.0 ? 0.0 : 0.75 + 0.1 * grain);
}`,
  roof: /* glsl */ `
vec4 surf(vec2 uv) {
  float rows = 8.0, cols = 8.0; float r = floor(uv.y * rows);
  vec2 p = vec2(uv.x * cols + mod(r, 2.0) * 0.5, uv.y * rows), id = vec2(mod(floor(p.x), cols), r), f = fract(p);
  float arc = 1.0 - pow(abs(f.x - 0.5) * 2.0, 2.0);                            // ngói cong
  float lip = smoothstep(0.0, 0.15, f.y);                                     // mép dưới viên trên
  vec3 c = mix(hex(150., 58., 40.), hex(190., 90., 56.), h2(id)) * (0.6 + 0.4 * arc) * (0.6 + 0.4 * lip);
  c *= 0.85 + 0.3 * fbm(uv, 16.0, 4);
  return vec4(c, arc * lip);
}`,
  dirt: /* glsl */ `
vec4 surf(vec2 uv) {
  float n = fbm(uv, 6.0, 6); vec2 v = voronoi(uv, 24.0);
  float pebble = smoothstep(0.32, 0.22, v.x) * step(0.6, h2(floor(uv * 24.0)));
  vec3 c = mix(hex(110., 84., 58.), hex(150., 118., 82.), n);
  c = mix(c, hex(160., 150., 140.) * (0.8 + 0.4 * n), pebble);
  return vec4(c, 0.4 * n + 0.6 * pebble);
}`,
};

export function bakeProcTexture(THREE, renderer, family, opts = {}) {
  const o = { size: 512, seed: 1, anisotropy: 4, ...opts };
  if (!FAMILY[family]) throw new Error(`proctex.js: không có họ "${family}". Có: ${Object.keys(FAMILY).join(', ')}`);
  const rt = new THREE.WebGLRenderTarget(o.size, o.size, {
    depthBuffer: false, generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
  });
  rt.texture.anisotropy = o.anisotropy;
  rt.texture.name = `proc_${family}`;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSeed: { value: o.seed >>> 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: LIB + FAMILY[family] + '\nvarying vec2 vUv;\nvoid main() { gl_FragColor = clamp(surf(vUv), 0.0, 1.0); }',
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prevRT = renderer.getRenderTarget(), prevTM = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  renderer.setRenderTarget(prevRT);
  renderer.toneMapping = prevTM;
  mat.dispose(); quad.geometry.dispose();
  rt.texture.userData.renderTarget = rt;   // giữ RT sống cùng texture; dispose: tex.userData.renderTarget.dispose()
  return rt.texture;
}

function chain(material, key, fn) {
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey?.call(material) ?? '';
  material.onBeforeCompile = (sh, r) => { prev?.call(material, sh, r); fn(sh); };
  material.customProgramCacheKey = () => prevKey + '|' + key;
  material.needsUpdate = true;
}

// Chiếu 3 mặt theo toạ độ thế giới; scale = số ô lặp trên 1 mét; bump = độ gồ ghề (0 = phẳng)
export function applyProcTexture(THREE, material, texture, opts = {}) {
  const o = { scale: 0.5, bump: 1, ...opts };
  const U = { uTpMap: { value: texture }, uTpScale: { value: o.scale }, uTpBump: { value: o.bump } };
  chain(material, `proctex_${texture.uuid}`, (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vTpP;\nvarying vec3 vTpN;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n  vTpP = (modelMatrix * vec4(transformed, 1.0)).xyz;\n  vTpN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = `uniform sampler2D uTpMap; uniform float uTpScale, uTpBump;
varying vec3 vTpP; varying vec3 vTpN;
vec3 tpPerturb(vec3 sp, vec3 sn, vec2 dH, float fd) {
  vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, sn), r2 = cross(sn, sx);
  float det = dot(sx, r1) * fd;
  vec3 g = sign(det) * (dH.x * r1 + dH.y * r2);
  return normalize(abs(det) * sn - g);
}
` + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
  vec3 tpW = pow(abs(normalize(vTpN)), vec3(4.0)); tpW /= (tpW.x + tpW.y + tpW.z);
  vec4 tp = texture2D(uTpMap, vTpP.zy * uTpScale) * tpW.x + texture2D(uTpMap, vTpP.xz * uTpScale) * tpW.y + texture2D(uTpMap, vTpP.xy * uTpScale) * tpW.z;
  diffuseColor.rgb *= tp.rgb;
  float tpH = tp.a;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  normal = tpPerturb(-vViewPosition, normal, vec2(dFdx(tpH), dFdy(tpH)) * uTpBump, faceDirection);`);
  });
  return U;
}
