// wind.js — GIÓ DÙNG CHUNG (khối uniform + GLSL) cho cỏ, lá, cờ, vải… Tất định: mọi thứ là hàm thuần của t.
//
// Cách dùng:
//   import { createWind } from './wind.js';
//   const wind = createWind(THREE, { dir: [1, 0.3], speed: 5, gust: 0.7, seed: 7 });
//   // vật liệu: dùng CHUNG đúng các object uniform này (không clone) → đổi gió là mọi vật liệu đổi theo, không dịch lại shader
//   const mat = new THREE.ShaderMaterial({ uniforms: { ...wind.uniforms, uMine: { value: 1 } },
//     vertexShader: wind.glsl + '…void main(){ vec2 lean = windBend(worldXZ, rand); … }', fragmentShader: … });
//   wind.update(t);                 // mỗi khung, t = thời điểm toàn cục (giây): gán uWindT + uWindScroll = dir*speed*t (KHÔNG cộng dồn)
//   wind.set({ dir: [x,z] | độ, speed, gust, seed });   // đổi tham số (seed mới → sinh lại tWindNoise)
//
// Uniform: uWindT (s) · uWind = (dirx, dirz, speed m/s, gust 0..1) · uWindScroll = dir*speed*t (m) · tWindNoise (RGBA 256², 4 trường nhiễu giá trị, tiling).
// GLSL (wind.glsl, chèn vào VERTEX shader): float gustAt(vec2 xz) → 0..1 (dải gió giật trượt theo hướng gió, chưa nhân uWind.w)
//                                           vec2 windBend(vec2 xz, float rand) → vector nghiêng (phần của chiều cao ngọn), rand 0..1 riêng mỗi lá/cọng.
import * as THREE_NS from 'three';

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 4 trường: [tần số lưới thô, tần số lưới mịn]; mỗi trường = 2 octave nhiễu giá trị tiling, chuẩn hoá về 0..1
const FIELDS = [[4, 8], [8, 16], [6, 12], [16, 32]];
const N = 256;
function fillNoise(data, seed) {
  const rng = mulberry32((seed | 0) * 7919 + 12345);
  const sm = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  for (let c = 0; c < 4; c++) {
    const vals = new Float32Array(N * N); let mn = 1e9, mx = -1e9;
    for (let o = 0; o < 2; o++) {
      const f = FIELDS[c][o], amp = o === 0 ? 1 : 0.5, lat = new Float32Array(f * f);
      for (let i = 0; i < lat.length; i++) lat[i] = rng();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const u = (x / N) * f, v = (y / N) * f, x0 = Math.floor(u), y0 = Math.floor(v), fx = sm(u - x0), fy = sm(v - y0);
        const xa = x0 % f, xb = (x0 + 1) % f, ya = y0 % f, yb = (y0 + 1) % f;
        const a = lat[ya * f + xa], b = lat[ya * f + xb], d = lat[yb * f + xa], e = lat[yb * f + xb];
        vals[y * N + x] += amp * ((a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy);
      }
    }
    for (const v of vals) { if (v < mn) mn = v; if (v > mx) mx = v; }
    for (let i = 0; i < N * N; i++) data[i * 4 + c] = Math.round(((vals[i] - mn) / (mx - mn)) * 255);
  }
}

const GLSL = /* glsl */`
uniform float uWindT;
uniform vec4 uWind;          // dirx, dirz, speed m/s, gust 0..1
uniform vec2 uWindScroll;    // dir*speed*t
uniform float uGustSize;     // cỡ dải gió giật lớn (m); dải nhỏ = 0.28×
uniform sampler2D tWindNoise;
uniform vec4 uCloud;         // bóng mây: độ tối 0..1 (0 = tắt), cỡ đám mây (m), nhân tốc độ trôi, độ che phủ 0..1
// 1 = nắng, < 1 = trong bóng mây; mây trôi theo hướng gió (uWindScroll × uCloud.z), mép mềm
float cloudOpen(vec2 xz) {
  if (uCloud.x <= 0.0) return 1.0;
  vec2 p = (xz - uWindScroll * uCloud.z) / uCloud.y;
  float c = texture2D(tWindNoise, p).b * 0.7 + texture2D(tWindNoise, p * 2.7 + 0.19).a * 0.3;
  float th = mix(0.66, 0.38, uCloud.w);
  return 1.0 - uCloud.x * smoothstep(th, th + 0.1, c);
}
float gustAt(vec2 xz) {
  float broad = texture2D(tWindNoise, (xz - uWindScroll) / uGustSize).r;
  float fine  = texture2D(tWindNoise, (xz - uWindScroll * 0.62) / (uGustSize * 0.28)).g;
  return smoothstep(0.26, 0.78, broad * 0.68 + fine * 0.32);
}
vec2 windBend(vec2 xz, float rand) {
  float k = clamp(uWind.z / 6.0, 0.0, 1.6);
  float g = gustAt(xz) * uWind.w;
  vec2 d = uWind.xy;
  vec2 perp = vec2(-d.y, d.x);
  float fl  = sin(rand * 40.0 + uWindT * (5.0 + 4.0 * rand));
  float fl2 = sin(rand * 23.0 + uWindT * (7.0 + 3.0 * rand));
  return d * ((0.10 + 0.85 * g) * k) + d * (fl * 0.05 * k * (0.3 + g)) + perp * (fl2 * 0.035 * k);
}
`;

export function createWind(THREE = THREE_NS, opts = {}) {
  const P = { dir: [1, 0.25], speed: 5, gust: 0.7, seed: 1, gustSize: 61, cloud: [0, 60, 2.6, 0.45], ...opts };
  const uniforms = {
    uWindT: { value: 0 },
    uWind: { value: new THREE.Vector4(1, 0, 5, 0.7) },
    uWindScroll: { value: new THREE.Vector2() },
    uGustSize: { value: 61 },
    uCloud: { value: new THREE.Vector4(0, 60, 2.6, 0.45) },
    tWindNoise: { value: null },
  };
  let t = 0, noiseSeed = null, noiseData = null;
  const norm = (d) => { const a = typeof d === 'number' ? [Math.cos(d * Math.PI / 180), Math.sin(d * Math.PI / 180)] : d; const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
  function makeNoise() {
    const data = new Uint8Array(N * N * 4); fillNoise(data, P.seed); noiseData = data;
    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
    tex.name = 'tWindNoise'; uniforms.tWindNoise.value?.dispose(); uniforms.tWindNoise.value = tex; noiseSeed = P.seed;
  }
  function apply() {
    const d = norm(P.dir); P.dir = d;
    uniforms.uWind.value.set(d[0], d[1], P.speed, P.gust);
    uniforms.uWindScroll.value.set(d[0] * P.speed * t, d[1] * P.speed * t);
    uniforms.uWindT.value = t;
    uniforms.uGustSize.value = P.gustSize;
    uniforms.uCloud.value.fromArray(P.cloud);
    if (noiseSeed !== P.seed) makeNoise();
  }
  // ---- bản CPU của gustAt (cùng dữ liệu nhiễu, RepeatWrapping, lọc song tuyến như GPU LinearFilter) ----
  const mod = (a, n) => ((a % n) + n) % n;
  function sampleCh(u, v, c) {                       // texture2D(tWindNoise, (u,v)).c → 0..1
    const x = mod(u, 1) * N - 0.5, y = mod(v, 1) * N - 0.5, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const xa = mod(x0, N), xb = mod(x0 + 1, N), ya = mod(y0, N), yb = mod(y0 + 1, N), d = noiseData;
    const a = d[(ya * N + xa) * 4 + c], b = d[(ya * N + xb) * 4 + c], e = d[(yb * N + xa) * 4 + c], f = d[(yb * N + xb) * 4 + c];
    return ((a + (b - a) * fx) * (1 - fy) + (e + (f - e) * fx) * fy) / 255;
  }
  const smoothstep = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const wind = {
    uniforms, glsl: GLSL, params: P,
    get t() { return t; },
    get noise() { return noiseData; },
    dirXZ() { return [P.dir[0], P.dir[1]]; },
    gustAt(x, z) {                                    // 0..1 như GLSL gustAt (chưa nhân gust); dùng t/dir/speed của lần update/set gần nhất
      const sx = P.dir[0] * P.speed * t, sz = P.dir[1] * P.speed * t, gs = P.gustSize;
      const broad = sampleCh((x - sx) / gs, (z - sz) / gs, 0);
      const fine = sampleCh((x - sx * 0.62) / (gs * 0.28), (z - sz * 0.62) / (gs * 0.28), 1);
      return smoothstep(0.26, 0.78, broad * 0.68 + fine * 0.32);
    },
    update(tt) { t = +tt; apply(); },
    set(p = {}) { Object.assign(P, p); apply(); },
  };
  makeNoise(); apply();
  return wind;
}
