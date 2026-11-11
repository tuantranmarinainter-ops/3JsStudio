// clouds.js — Biển mây mềm, tất định (chỉ phụ thuộc t).
//   createCloudSea(THREE, { y, radius, ... })  → lớp mây phẳng bằng shader fbm: mép mềm, sáng phía mặt trời, xa thì đặc lại.
//   createCloudPuffs(THREE, { list, ... })     → các cụm mây bông = sprite billboard, texture vẽ bằng canvas từ noise có seed.
// Cả hai: { object, update(t, sunDir?) }. Không Math.random, không giờ thực.
import { rng, makeNoise2D } from './winter.js';

const NOISE_GLSL = /* glsl */`
  float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++){ s += a*vnoise(p); p = m*p; a *= 0.5; } return s / 0.97; }
`;

// ---------- Lớp biển mây (shader) ----------
export function createCloudSea(THREE, o = {}) {
  const {
    y = -40, radius = 1800, scale = 0.012, cover = 0.47, soft = 0.16, opacity = 1, drift = [1.2, 0.4],
    lit = '#f3f7fc', shade = '#b3c5db', gain = 1.0, relief = 9, bump = 9, fog = '#e8f6ff', fogNear = 250, fogFar = 1300, seed = 3, name = 'cloud_sea', solidFar = 0.85, minAlpha = 0, hug = 0, hugR = [40, 150],
  } = o;
  const C = (c) => new THREE.Color(c);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uT: { value: 0 }, uSun: { value: new THREE.Vector3(0.5, 1, 0.5).normalize() },
      uLit: { value: C(lit) }, uShade: { value: C(shade) }, uFog: { value: C(fog) },
      uFogNear: { value: fogNear }, uFogFar: { value: fogFar }, uCover: { value: cover }, uSoft: { value: soft },
      uOpacity: { value: opacity }, uScale: { value: scale }, uDrift: { value: new THREE.Vector2(drift[0], drift[1]) },
      uSeed: { value: seed * 17.13 }, uSolidFar: { value: solidFar }, uGain: { value: gain }, uRelief: { value: relief }, uBump: { value: bump }, uMinA: { value: minAlpha }, uHug: { value: hug }, uHugR: { value: new THREE.Vector2(hugR[0], hugR[1]) },
    },
    vertexShader: /* glsl */`
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uT, uFogNear, uFogFar, uCover, uSoft, uOpacity, uScale, uSeed, uSolidFar, uGain, uRelief, uBump, uMinA, uHug;
      uniform vec2 uHugR;
      float gHug = 0.0;   // mây dồn dày quanh chân đỉnh (theo khoảng cách tới tâm)
      uniform vec3 uSun, uLit, uShade, uFog; uniform vec2 uDrift;
      varying vec3 vW;
      ${NOISE_GLSL}
      float fbm3(vec2 p){ float s = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 3; i++){ s += a*vnoise(p); p = m*p; a *= 0.5; } return s / 0.875; }
      // độ dày mây 0..1: fbm bị warp (cuộn) → bông súp lơ
      float H(vec2 p){
        vec2 q = vec2(fbm3(p*0.45 + uSeed), fbm3(p*0.45 + uSeed + 5.2));
        float d = fbm(p + q*1.5) + gHug;
        return smoothstep(uCover - uSoft, uCover + uSoft * 2.2, d);
      }
      void main(){
        vec3 V = normalize(vW - cameraPosition);
        float dist = length(vW - cameraPosition);
        float far = smoothstep(uFogNear, uFogFar, dist);
        gHug = uHug * (1.0 - smoothstep(uHugR.x, uHugR.y, length(vW.xz)));
        vec2 p0 = (vW.xz + uDrift*uT) * uScale;
        // parallax 1 bước: chỗ mây dày như phồng lên về phía camera → có khối khi nhìn xiên
        float h0 = H(p0);
        vec2 p = p0 + V.xz / max(0.12, -V.y) * h0 * uRelief * uScale;
        float h = H(p);
        // pháp tuyến từ gradient độ dày → chiếu sáng theo mặt trời (mặt nắng trắng, khe khuất xanh xám)
        float e = 0.035;
        float hx = H(p + vec2(e, 0.0)) - H(p - vec2(e, 0.0));
        float hz = H(p + vec2(0.0, e)) - H(p - vec2(0.0, e));
        vec3 n = normalize(vec3(-hx * uBump, 1.0, -hz * uBump));
        float ndl = clamp(dot(n, normalize(uSun)), 0.0, 1.0);
        float lk = clamp(0.1 + 0.95 * ndl + h * 0.1, 0.0, 1.0);
        vec3 col = mix(uShade, uLit, lk);
        col += uLit * (1.0 - smoothstep(0.0, 0.5, h)) * 0.12;     // rìa mỏng trong, sáng (viền bạc)
        col = mix(col * uGain, uFog, far * 0.75);
        float a = max(uMinA, smoothstep(0.0, 0.45, h));
        a = mix(a, 1.0, far * uSolidFar) * uOpacity;
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false,   // màu mây = màu hiển thị (khớp nền trời, không xám đi vì ACES)
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), mat);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.name = name; mesh.renderOrder = 1;
  return {
    object: mesh, material: mat,
    update(t, sunDir) { mat.uniforms.uT.value = t; if (sunDir) mat.uniforms.uSun.value.copy(sunDir).normalize(); },
  };
}

// ---------- Texture cụm mây bông (canvas, tất định) ----------
const _texCache = new Map();
export function puffTexture(THREE, seed = 1, size = 256) {
  const key = seed + ':' + size; if (_texCache.has(key)) return _texCache.get(key);
  const r = rng(seed * 7919 + 13), nz = makeNoise2D(seed + 50);
  // các bông tròn chồng nhau, tập trung nửa trên → hình súp lơ, đáy phẳng hơn
  const blobs = [];
  const nb = 9 + Math.floor(r() * 6);
  for (let i = 0; i < nb; i++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.27;
    blobs.push({ x: 0.5 + Math.cos(a) * rr * 1.15, y: 0.52 + Math.sin(a) * rr * 0.75 - r() * 0.04, s: 0.11 + r() * 0.12 });
  }
  blobs.push({ x: 0.5, y: 0.5, s: 0.22 });
  const cv = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(size, size) : Object.assign(document.createElement('canvas'), { width: size, height: size });
  const g = cv.getContext('2d'); const img = g.createImageData(size, size); const D = img.data;
  const field = (u, v) => {
    let s = 0;
    for (const b of blobs) { const dx = u - b.x, dy = v - b.y; s += Math.exp(-(dx * dx + dy * dy) / (2 * b.s * b.s * 0.45)); }
    return s;
  };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = i / size, v = j / size;                       // v: 0 = trên
    const w = nz(u * 9, v * 9) * 0.5 + nz(u * 22 + 3, v * 22) * 0.22;   // rìa xơ mềm
    const f = field(u, v) + w * 0.35;
    // mép mờ dần, không cạnh cứng; rìa ô ép về 0
    const edge = Math.min(u, v, 1 - u, 1 - v);
    let a = Math.min(1, Math.max(0, (f - 0.42) / 0.5)); a = a * a * (3 - 2 * a); a *= Math.min(1, edge * 10);
    // sáng: mặt trên (gradient field hướng lên) + nửa trên sáng, đáy xanh xám; rìa mỏng hơi trong
    const up = field(u, v - 0.05) - field(u, v + 0.05);       // >0 ở mặt trên
    let L = 0.5 + up * 0.9 + (0.48 - v) * 0.9 + w * 0.08 + (1 - Math.min(1, f)) * 0.15;
    L = Math.min(1, Math.max(0, L));
    const k = (j * size + i) * 4;
    // shade #aebfd6 → lit #f6f9fd
    D[k] = 174 + (246 - 174) * L; D[k + 1] = 191 + (249 - 191) * L; D[k + 2] = 214 + (253 - 214) * L; D[k + 3] = 255 * a;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  _texCache.set(key, tex); return tex;
}

// ---------- Cụm mây bông (sprite) ----------
// list: [{ x, y, z, s, seed?, tint? }]; drift: stud/giây theo x,z.
export function createCloudPuffs(THREE, { list, variants = 5, drift = [1.0, 0.3], seed = 1, name = 'cloud_puffs', opacity = 1 } = {}) {
  const g = new THREE.Group(); g.name = name;
  const mats = new Map();
  const getMat = (v, tint) => {
    const key = v + '|' + tint; if (mats.has(key)) return mats.get(key);
    const m = new THREE.SpriteMaterial({ map: puffTexture(THREE, seed * 31 + v), color: new THREE.Color(tint), transparent: true, depthWrite: false, fog: true, opacity, toneMapped: false });
    mats.set(key, m); return m;
  };
  const items = list.map((p, i) => {
    const sp = new THREE.Sprite(getMat((p.seed ?? i) % variants, p.tint || '#ffffff'));
    sp.scale.set(p.s * (p.ar || 1.25), p.s, 1);
    sp.material.rotation = 0;
    sp.position.set(p.x, p.y, p.z); sp.name = 'cloud_puff'; sp.renderOrder = 2;
    g.add(sp); return { sp, x: p.x, z: p.z, k: p.k ?? 1 };
  });
  return {
    object: g,
    update(t) { for (const it of items) it.sp.position.set(it.x + drift[0] * t * it.k, it.sp.position.y, it.z + drift[1] * t * it.k); },
  };
}
