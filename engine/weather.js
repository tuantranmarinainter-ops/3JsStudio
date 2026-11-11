// weather.js — Mưa, vũng nước gợn sóng, bề mặt ướt. Ý tưởng từ Saltline:
// hạt mưa KHÔNG có trạng thái CPU — vị trí = f(seed, t) tính trong vertex shader, tự quấn quanh camera bằng mod.
// Bề mặt ướt = vá MeshStandardMaterial qua onBeforeCompile (giữ nguyên ánh sáng/IBL của three).
// Tất định: mọi thứ là hàm của t (update(t)), không Math.random().
//
// Dùng:
//   import { createRain, createPuddles, applyWetness } from './weather.js';
//   const rain = createRain(THREE, { seed: 4, count: 6000 }); scene.add(rain.object);
//   const puddles = createPuddles(THREE, { seed: 2, area: [40, 40] }); scene.add(puddles.object);
//   const wet = applyWetness(THREE, groundMat, { amount: 1 });   // wet.uWet.value = 0..1 (mưa dần)
//   // render(t): rain.update(t, camera.position); puddles.update(t);

import { rng } from './winter.js';

export function createRain(THREE, opts = {}) {
  const o = { seed: 4, count: 6000, area: [60, 30, 60], speed: 22, wind: [2, 0], length: 0.9,
              color: '#c9d6e8', opacity: 0.45, ...opts };
  const r = rng(o.seed);
  const n = o.count;
  const seeds = new Float32Array(n * 2 * 3), ends = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const a = r(), b = r(), c = r(), s = 0.75 + r() * 0.5;
    seeds.set([a, b, c, a, b, c], i * 6);
    ends[i * 2] = 0; ends[i * 2 + 1] = s;          // đầu (0) / đuôi (độ dài riêng từng giọt)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3)); // bị shader thay
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  g.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
  const vel = new THREE.Vector3(o.wind[0], -o.speed, o.wind[1]);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: {
      uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uArea: { value: new THREE.Vector3(...o.area) },
      uVel: { value: vel }, uLen: { value: o.length }, uColor: { value: new THREE.Color(o.color) }, uOpacity: { value: o.opacity },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aSeed; attribute float aEnd;
      uniform float uTime, uLen; uniform vec3 uCenter, uArea, uVel;
      varying float vA;
      void main() {
        vec3 p = aSeed * uArea + uVel * uTime * (0.85 + aSeed.x * 0.3);
        p = mod(p - uCenter + uArea * 0.5, uArea) + uCenter - uArea * 0.5;   // quấn quanh camera
        p -= normalize(uVel) * uLen * aEnd;                                   // vệt mưa
        vA = 1.0 - step(0.01, aEnd) * 0.85;                                    // đầu đậm, đuôi nhạt
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; varying float vA;
      void main() {
        gl_FragColor = vec4(uColor, uOpacity * vA);
        #include <colorspace_fragment>
      }`,
  });
  const lines = new THREE.LineSegments(g, mat);
  lines.name = 'rain';
  lines.frustumCulled = false;
  lines.userData.noStyle = lines.userData.noMerge = lines.userData.aoHide = true;
  return {
    object: lines, material: mat,
    // center: thường là camera.position (lệch xuống một chút để thấy mưa rơi quanh nhân vật)
    update(t, center) { mat.uniforms.uTime.value = t; if (center) mat.uniforms.uCenter.value.copy(center); },
  };
}

// Ghép onBeforeCompile với hàm đã có (style, tuyết phủ…) thay vì ghi đè
function chain(material, key, fn) {
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey?.call(material) ?? '';
  material.onBeforeCompile = (sh, r) => { prev?.call(material, sh, r); fn(sh); };
  material.customProgramCacheKey = () => prevKey + '|' + key;
  material.needsUpdate = true;
}

// Bề mặt ướt: tối màu + bóng hơn; mặt ngửa lên ướt nhất, tường đứng ít hơn, có vệt chảy dọc
export function applyWetness(THREE, material, opts = {}) {
  const o = { amount: 1, ...opts };
  const U = { uWet: { value: o.amount } };
  chain(material, 'wet', (sh) => {
    sh.uniforms.uWet = U.uWet;
    sh.vertexShader = 'varying vec3 vWetN;\nvarying vec3 vWetP;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n  vWetN = normalize(mat3(modelMatrix) * objectNormal);\n  vWetP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uWet;\nvarying vec3 vWetN;\nvarying vec3 vWetP;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  float wetUp = clamp(vWetN.y, 0.0, 1.0);
  float streak = 0.55 + 0.45 * sin(vWetP.x * 9.0 + sin(vWetP.z * 3.0) * 2.0) * (1.0 - wetUp);
  float wetK = uWet * mix(0.45 * streak, 1.0, wetUp);
  diffuseColor.rgb *= mix(1.0, 0.62, wetK);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.14, wetK);');
  });
  return U;
}

// Vũng nước: đĩa phẳng méo, gần như gương (phản chiếu trời qua scene.environment), gợn tròn khi mưa rơi
export function createPuddles(THREE, opts = {}) {
  const o = { seed: 2, count: 10, area: [40, 40], center: [0, 0], radius: [0.8, 2.6], color: '#3a4250', rain: 1, avoid: [], ...opts };
  const r = rng(o.seed);
  const mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.03, metalness: 0.0, envMapIntensity: 1.4,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  mat.name = 'puddle';
  const U = { uTime: { value: 0 }, uRain: { value: o.rain } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vPW;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n  vPW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = `uniform float uTime, uRain;\nvarying vec3 vPW;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      // mỗi ô lưới 1 giọt mỗi chu kỳ; vòng sóng nở ra rồi tắt (3 cỡ ô như Saltline)
      vec2 ripple(vec2 p, float cell, float t) {
        vec2 id = floor(p / cell), f = p / cell - id - 0.5;
        float ph = h21(id), age = fract(t * 1.3 + ph);
        vec2 off = vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5;
        vec2 d = f - off * 0.6; float dist = length(d);
        float ring = sin((dist - age * 0.55) * 60.0) * smoothstep(0.08, 0.0, abs(dist - age * 0.55)) * (1.0 - age);
        return dist > 0.0 ? normalize(d) * ring : vec2(0.0);
      }
` + sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  vec2 rg = (ripple(vPW.xz, 0.9, uTime) + ripple(vPW.xz + 17.0, 0.55, uTime * 1.1) + ripple(vPW.xz + 41.0, 1.4, uTime * 0.9)) * uRain;
  normal = normalize(normal + (viewMatrix * vec4(rg.x, 0.0, rg.y, 0.0)).xyz * 0.35);`);
  };
  mat.customProgramCacheKey = () => 'puddle';
  const group = new THREE.Group();
  group.name = 'puddles';
  group.userData.noStyle = true;
  for (let i = 0; i < o.count; i++) {
    let x, z, tries = 0;
    do {
      x = o.center[0] + (r() - 0.5) * o.area[0];
      z = o.center[1] + (r() - 0.5) * o.area[1];
      tries++;
    } while (tries < 20 && o.avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar));
    const rad = o.radius[0] + r() * (o.radius[1] - o.radius[0]);
    const geo = new THREE.CircleGeometry(1, 40);
    const pos = geo.attributes.position;
    const k1 = r() * 6.28, k2 = r() * 6.28;
    for (let v = 1; v < pos.count; v++) {   // méo viền bằng tổng sin (có seed)
      const a = Math.atan2(pos.getY(v), pos.getX(v));
      const s = 1 + 0.18 * Math.sin(a * 3 + k1) + 0.1 * Math.sin(a * 5 + k2);
      pos.setXY(v, Math.cos(a) * s, Math.sin(a) * s);
    }
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.name = `puddle_${i}`;
    m.position.set(x, 0.015, z);
    m.scale.set(rad * (0.8 + r() * 0.6), 1, rad);
    m.rotation.y = r() * Math.PI;
    m.receiveShadow = true;
    m.userData.noStyle = true;
    group.add(m);
  }
  return { object: group, material: mat, uniforms: U, update(t) { U.uTime.value = t; } };
}
