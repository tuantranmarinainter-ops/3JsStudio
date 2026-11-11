// winter.js — Hiệu ứng môi trường cho three.js: trời, mây, tuyết rơi, tuyết phủ, núi tuyết, nước.
// Phong cách: ánh sáng/khí quyển "thật" + hình khối low-poly để hợp nhân vật R6.
//
// Quy tắc (CLAUDE.md): mọi chuyển động là hàm thuần của t, ngẫu nhiên đều có seed,
// không requestAnimationFrame, không giờ thực. Mỗi hiệu ứng trả về { object, update(t) }.
//
// Dùng:
//   import * as THREE from 'three';
//   import { Sky } from 'three/addons/objects/Sky.js';
//   import { Water } from 'three/addons/objects/Water.js';
//   import * as W from './winter.js';
//   const sky = W.createSky(THREE, Sky, { elevation: 12, azimuth: 200 });
//   const snow = W.createSnowfall(THREE, { seed: 7 });
//   W.applySnowCover(THREE, houseMaterial, { amount: 1 });
//   // trong render(t): sky.update(t); snow.update(t); ...

// ---------- Ngẫu nhiên có seed + noise ----------
export function rng(seed = 1) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gradient noise 2D có seed, giá trị ~[-1, 1]
export function makeNoise2D(seed = 1) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h, x, y) => { const a = (h / 256) * Math.PI * 2; return Math.cos(a) * x + Math.sin(a) * y; };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    const u = fade(xf), v = fade(yf);
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
    return (x1 + v * (x2 - x1)) * 1.41;
  };
}

export function fbm(noise, x, y, oct = 5, ridged = false) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    let n = noise(x * f, y * f);
    if (ridged) n = 1 - Math.abs(n), n *= n;
    s += n * amp; norm += amp; amp *= 0.5; f *= 2.03;
  }
  return s / norm;
}

// ---------- Bầu trời vật lý (Sky.js, mô hình Preetham) ----------
// elevation: độ cao mặt trời (độ). 2–8 = hoàng hôn, 15–30 = chiều, 60 = trưa.
export function createSky(THREE, Sky, opts = {}) {
  const o = { elevation: 12, azimuth: 200, turbidity: 6, rayleigh: 1.6, mie: 0.005, mieG: 0.8, scale: 10000, ...opts };
  const sky = new Sky();
  sky.name = 'sky';
  sky.scale.setScalar(o.scale);
  const u = sky.material.uniforms;
  u.turbidity.value = o.turbidity;
  u.rayleigh.value = o.rayleigh;
  u.mieCoefficient.value = o.mie;
  u.mieDirectionalG.value = o.mieG;
  const sunDir = new THREE.Vector3();
  const setSun = (elevation, azimuth) => {
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    sunDir.setFromSphericalCoords(1, phi, theta);
    u.sunPosition.value.copy(sunDir);
  };
  setSun(o.elevation, o.azimuth);
  return {
    object: sky, sunDir,
    setSun,
    // Ánh sáng môi trường (IBL) lấy từ chính bầu trời → vật thể hắt màu trời
    bakeEnvironment(renderer) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const tmp = new THREE.Scene();
      const clone = new Sky();
      clone.scale.setScalar(o.scale);
      for (const k of Object.keys(u)) clone.material.uniforms[k].value = u[k].value;
      tmp.add(clone);
      const rt = pmrem.fromScene(tmp, 0, 0.1, o.scale * 2);
      pmrem.dispose();
      return rt.texture;
    },
    update() {},
  };
}

// ---------- Mây khối low-poly, trôi theo t ----------
export function createClouds(THREE, opts = {}) {
  const o = { seed: 3, count: 14, area: 700, height: [90, 150], speed: 4, color: '#ffffff', ...opts };
  const r = rng(o.seed);
  const group = new THREE.Group();
  group.name = 'clouds';
  const mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 1, flatShading: true, emissive: '#8fa4bf', emissiveIntensity: 0.25 });
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const items = [];
  for (let i = 0; i < o.count; i++) {
    const c = new THREE.Group();
    c.name = `cloud_${i}`;
    const puffs = 4 + Math.floor(r() * 5);
    const len = 14 + r() * 26;
    for (let k = 0; k < puffs; k++) {
      const m = new THREE.Mesh(geo, mat);
      const s = 6 + r() * 9 * (1 - Math.abs(k / (puffs - 1) - 0.5));
      m.scale.set(s * 1.3, s * 0.75, s);
      m.position.set((k / (puffs - 1) - 0.5) * len, r() * 3, (r() - 0.5) * 8);
      c.add(m);
    }
    const x0 = (r() - 0.5) * o.area;
    const z0 = -o.area * 0.15 - r() * o.area * 0.6;
    const y = o.height[0] + r() * (o.height[1] - o.height[0]);
    c.position.set(x0, y, z0);
    c.rotation.y = (r() - 0.5) * 0.6;
    group.add(c);
    items.push({ c, x0, sp: o.speed * (0.6 + r() * 0.8) });
  }
  return {
    object: group,
    update(t) {
      for (const it of items) {
        const half = o.area / 2;
        it.c.position.x = ((((it.x0 + it.sp * t + half) % o.area) + o.area) % o.area) - half;
      }
    },
  };
}

// ---------- Tuyết rơi: particle tất định (vị trí = hàm của seed + t) ----------
// Vùng tuyết là hộp kích thước `area` đặt tại `center`; đặt center theo camera nếu camera đi xa.
export function createSnowfall(THREE, opts = {}) {
  const o = { seed: 11, count: 6000, area: [80, 40, 80], center: [0, 0, 0], size: 0.35, speed: [1.2, 2.4], sway: 0.6, opacity: 0.95, ...opts };
  const r = rng(o.seed);
  const pos = new Float32Array(o.count * 3);
  const rnd = new Float32Array(o.count * 4);
  for (let i = 0; i < o.count; i++) {
    pos[i * 3] = (r() - 0.5) * o.area[0];
    pos[i * 3 + 1] = r() * o.area[1];
    pos[i * 3 + 2] = (r() - 0.5) * o.area[2];
    rnd[i * 4] = o.speed[0] + r() * (o.speed[1] - o.speed[0]);
    rnd[i * 4 + 1] = r() * Math.PI * 2;
    rnd[i * 4 + 2] = 0.5 + r();       // kích thước tương đối
    rnd[i * 4 + 3] = 0.4 + r() * 1.2; // tần số lắc
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uHeight: { value: o.area[1] },
      uCenter: { value: new THREE.Vector3(...o.center) },
      uSize: { value: o.size },
      uSway: { value: o.sway },
      uWind: { value: new THREE.Vector2(0.6, 0.2) },
      uOpacity: { value: o.opacity },
      uScale: { value: 1920 / 2 },
      uColor: { value: new THREE.Color('#ffffff') },
    },
    vertexShader: /* glsl */`
      attribute vec4 aRnd;
      uniform float uTime, uHeight, uSize, uSway, uScale;
      uniform vec3 uCenter;
      uniform vec2 uWind;
      varying float vA;
      void main() {
        vec3 p = position;
        float fall = uTime * aRnd.x;
        p.y = mod(p.y - fall, uHeight);
        p.x += sin(uTime * aRnd.w + aRnd.y) * uSway + uWind.x * fall * 0.3;
        p.z += cos(uTime * aRnd.w * 0.8 + aRnd.y) * uSway + uWind.y * fall * 0.3;
        p += uCenter;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aRnd.z * uScale / -mv.z;
        // mờ dần ở đỉnh/đáy hộp để không thấy hạt bật ra
        float h = p.y - uCenter.y;
        vA = smoothstep(0.0, 2.0, h) * (1.0 - smoothstep(uHeight - 4.0, uHeight, h));
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA * uOpacity;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = 'snowfall';
  pts.frustumCulled = false;
  return {
    object: pts,
    material: mat,
    update(t) { mat.uniforms.uTime.value = t; },
  };
}

// ---------- Tuyết phủ lên mọi material có sẵn (Kenney, R6…) ----------
// Mặt hướng lên trên (normal.y lớn) → trắng tuyết. amount 0..1 có thể animate theo t (tuyết dày dần).
export function applySnowCover(THREE, material, opts = {}) {
  const o = { amount: 1, min: 0.35, max: 0.7, color: '#f4f8ff', ...opts };
  const uniforms = {
    uSnowAmount: { value: o.amount },
    uSnowMin: { value: o.min },
    uSnowMax: { value: o.max },
    uSnowColor: { value: new THREE.Color(o.color) },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSnowN;\nvarying vec3 vSnowP;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vSnowN = normalize(mat3(modelMatrix) * objectNormal);
        vSnowP = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vSnowN; varying vec3 vSnowP;
        uniform float uSnowAmount, uSnowMin, uSnowMax; uniform vec3 uSnowColor;
        float snowHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float snowNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(snowHash(i), snowHash(i + vec2(1, 0)), f.x), mix(snowHash(i + vec2(0, 1)), snowHash(i + vec2(1, 1)), f.x), f.y);
        }
        float snowMask;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float n = snowNoise(vSnowP.xz * 1.7) * 0.5 + snowNoise(vSnowP.xz * 5.3) * 0.25;
          snowMask = smoothstep(uSnowMin, uSnowMax, vSnowN.y + (n - 0.35) * 0.35) * uSnowAmount;
          diffuseColor.rgb = mix(diffuseColor.rgb, uSnowColor, snowMask);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.85, snowMask);`);
  };
  material.customProgramCacheKey = () => 'snowcover';
  material.needsUpdate = true;
  material.userData.snow = uniforms;
  return uniforms;
}

// ---------- Núi tuyết: terrain low-poly tự sinh theo seed ----------
// Vùng giữa (bán kính `flat`) bằng phẳng cho thị trấn; ra xa mọc núi.
// Màu theo độ cao + độ dốc: thông xanh thấp → đá dốc → tuyết trên cao.
export function createMountains(THREE, opts = {}) {
  const o = {
    seed: 5, size: 2400, segments: 200, flat: 240, rise: 460, peak: 170,
    snowLine: 55, colors: { snow: '#f2f6fc', rock: '#6b6f7a', forest: '#2f4a3a', ground: '#e8eef6' },
    ...opts,
  };
  const noise = makeNoise2D(o.seed);
  const geo = new THREE.PlaneGeometry(o.size, o.size, o.segments, o.segments).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const heightAt = (x, z) => {
    const d = Math.hypot(x, z);
    const k = THREE.MathUtils.smoothstep(d, o.flat, o.flat + o.rise);
    const ridge = fbm(noise, x / 260, z / 260, 5, true);
    const hills = fbm(noise, x / 90 + 50, z / 90, 3) * 0.5 + 0.5;
    return k * (ridge * o.peak + hills * 25) + (1 - k) * 0;
  };
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const col = new Float32Array(p.count * 3);
  const C = Object.fromEntries(Object.entries(o.colors).map(([k, v]) => [k, new THREE.Color(v)]));
  const tmp = new THREE.Color();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    a.fromBufferAttribute(p, f); b.fromBufferAttribute(p, f + 1); c.fromBufferAttribute(p, f + 2);
    n.crossVectors(c.clone().sub(b), a.clone().sub(b)).normalize();
    const h = (a.y + b.y + c.y) / 3;
    const cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3;
    const slope = 1 - Math.abs(n.y);
    const line = o.snowLine + noise(cx / 40, cz / 40) * 18;
    // trộn liên tục (không cắt ngưỡng) → không lốm đốm
    const ss = THREE.MathUtils.smoothstep;
    const snowK = ss(h, line - 20, line + 10) * (1 - ss(slope, 0.5, 0.75));
    const rockK = ss(slope, 0.35, 0.6);
    tmp.copy(C.forest).lerp(C.snow, 0.35).lerp(C.rock, rockK).lerp(C.snow, snowK);
    if (h < 1) tmp.copy(C.ground);
    // chút biến thiên để mặt low-poly không bị phẳng màu
    tmp.offsetHSL(0, 0, noise(cx / 7, cz / 7) * 0.03);
    for (let k = 0; k < 3; k++) col.set([tmp.r, tmp.g, tmp.b], (f + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'mountains';
  mesh.receiveShadow = true;
  return { object: mesh, heightAt, update() {} };
}

// ---------- Nước (Water.js: phản chiếu trời + sóng) ----------
// Normal map sinh bằng code (lặp liền mạch) → không cần tải waternormals.jpg.
export function makeWaterNormals(THREE, { size = 256, seed = 9 } = {}) {
  const r = rng(seed);
  const waves = Array.from({ length: 10 }, () => ({
    kx: Math.round((r() - 0.5) * 16) || 1, ky: Math.round((r() - 0.5) * 16) || 1,
    ph: r() * Math.PI * 2, a: 0.3 + r(),
  }));
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let dx = 0, dy = 0;
    for (const w of waves) {
      const ph = ((w.kx * x + w.ky * y) / size) * Math.PI * 2 + w.ph;
      const d = Math.cos(ph) * w.a;
      dx += d * w.kx; dy += d * w.ky;
    }
    const nx = -dx * 0.02, ny = -dy * 0.02, nz = 1;
    const l = Math.hypot(nx, ny, nz);
    const i = (y * size + x) * 4;
    data[i] = (nx / l * 0.5 + 0.5) * 255;
    data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
    data[i + 2] = (nz / l * 0.5 + 0.5) * 255;
    data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createWater(THREE, Water, opts = {}) {
  const o = { geometry: null, radius: 12, sunDir: new THREE.Vector3(0.3, 0.5, -0.8), color: '#1d4a63', sunColor: '#fff4e0', distortion: 1.6, size: 2.5, speed: 0.6, fog: true, ...opts };
  const geo = o.geometry || new THREE.CircleGeometry(o.radius, 64);
  const water = new Water(geo, {
    textureWidth: 512, textureHeight: 512,
    waterNormals: makeWaterNormals(THREE),
    sunDirection: o.sunDir.clone().normalize(),
    sunColor: o.sunColor, waterColor: o.color,
    distortionScale: o.distortion, fog: o.fog,
  });
  water.name = 'water';
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.size.value = o.size;
  return {
    object: water,
    update(t) { water.material.uniforms.time.value = t * o.speed; },
  };
}

// ---------- Cây thông + nhà khối (đạo cụ tạm, thay bằng Kenney sau) ----------
export function createPine(THREE, { seed = 1, height = 7 } = {}) {
  const r = rng(seed);
  const g = new THREE.Group();
  g.name = 'pine';
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, height * 0.25, 6), new THREE.MeshStandardMaterial({ color: '#5b3a24', roughness: 1 }));
  trunk.position.y = height * 0.125;
  g.add(trunk);
  const leaf = new THREE.MeshStandardMaterial({ color: '#2c5a3c', roughness: 0.9, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const rad = height * (0.32 - i * 0.08);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, height * 0.42, 7), leaf);
    cone.position.y = height * (0.38 + i * 0.2);
    cone.rotation.y = r() * Math.PI;
    g.add(cone);
  }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { object: g, materials: [trunk.material, leaf] };
}

export function createHouse(THREE, { seed = 1, w = 7, d = 6, h = 4.5, wall, roof } = {}) {
  const r = rng(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const g = new THREE.Group();
  g.name = 'house';
  const wallMat = new THREE.MeshStandardMaterial({ color: wall || pick(['#c0533f', '#d9b48f', '#7d9bb5', '#e8d6a0', '#8f6b8f']), roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roof || pick(['#3b2f2f', '#4a5660', '#6b2e2e']), roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.name = 'walls';
  body.position.y = h / 2;
  g.add(body);
  const roofGeo = new THREE.CylinderGeometry(1, 1, d + 0.8, 3, 1);
  roofGeo.rotateX(-Math.PI / 2); // lăng trụ tam giác nằm dọc Z, đỉnh hướng lên
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.name = 'roof';
  const sy = (h * 0.55) / 1.5;
  roofMesh.scale.set((w + 0.8) / 1.732, sy, 1);
  roofMesh.position.y = h + 0.5 * sy;
  g.add(roofMesh);
  const winMat = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb347', emissiveIntensity: 1.6 });
  for (const sx of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.1), winMat);
    win.name = 'window';
    win.position.set(sx * w * 0.25, h * 0.55, d / 2 + 0.03);
    g.add(win);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.1), new THREE.MeshStandardMaterial({ color: '#4a3020' }));
  door.name = 'door';
  door.position.set(0, 1.1, d / 2 + 0.03);
  g.add(door);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { object: g, materials: [wallMat, roofMat] };
}
