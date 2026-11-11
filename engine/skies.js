// skies.js — Các kiểu bầu trời dựng sẵn: trưa, hoàng hôn, trời hoạt hình (kiểu game khối), đêm sao, u ám.
// Tự dựng bằng shader / Sky.js — KHÔNG dùng skybox chính thức của Roblox (xem CLAUDE.md).
// Mỗi preset đặt luôn ánh sáng mặt trời, đèn trời, sương, exposure và IBL (scene.environment) cho khớp.
//
// Dùng:
//   import { Sky } from 'three/addons/objects/Sky.js';
//   import { createSkyPreset, SKY_PRESETS } from './skies.js';
//   const sky = createSkyPreset(THREE, 'sunset', { renderer, scene, Sky, sun, hemi });
//   // render(t): sky.update(t);      đổi preset: sky.dispose(); sky = createSkyPreset(...)

import { createSky, createClouds, rng } from './winter.js';

export const SKY_PRESETS = {
  day: 'Trưa nắng (Sky.js)',
  sunset: 'Hoàng hôn (Sky.js)',
  cartoon: 'Trời hoạt hình',
  night: 'Đêm sao + trăng',
  overcast: 'U ám',
  anime_day: 'Anime: trời xanh mây trắng',
  anime_sunset: 'Anime: hoàng hôn hồng tím',
  anime_night: 'Anime: đêm tím trăng to',
};

const CONF = {
  // Kiểu trời anime: gradient rực, mây khối lớn tô 2 tông cứng (sáng/bóng tím) + viền sáng, đáy mây phẳng
  anime_day:    { kind: 'grad', top: '#1f6dff', mid: '#5fb2ff', midH: 0.18, horizon: '#d8f3ff', bottom: '#a9d6ff', exponent: 0.7,
                  elevation: 50, azimuth: 150, disk: '#fffbe6', diskSize: 0.9992, exposure: 1.0,
                  sun: ['#ffffff', 2.6], hemi: ['#d7ecff', '#8a7a66', 1.0], fog: ['#d8f3ff', 90, 500],
                  anime: { lit: '#ffffff', shade: '#a9b8f0', rim: '#ffffff' } },
  anime_sunset: { kind: 'grad', top: '#2a3b9c', mid: '#e86fa8', midH: 0.16, horizon: '#ffb36b', bottom: '#6b4a8a', exponent: 0.8,
                  elevation: 4, azimuth: 200, disk: '#fff0b3', diskSize: 0.9985, exposure: 1.0,
                  sun: ['#ffb36b', 2.2], hemi: ['#ffc2d6', '#4a3060', 0.9], fog: ['#f3a07e', 70, 450],
                  anime: { lit: '#ffd9b3', shade: '#8c62b8', rim: '#fff3c4' } },
  anime_night:  { kind: 'grad', top: '#0d0b2e', mid: '#2d2470', midH: 0.2, horizon: '#7a5cc7', bottom: '#120f2b', exponent: 0.7,
                  elevation: 17, azimuth: 195, disk: '#fff6d8', diskSize: 0.9975, exposure: 1.0,
                  sun: ['#b7b4ff', 1.0], hemi: ['#6c62c9', '#141024', 0.8], fog: ['#3a2e7a', 60, 420], stars: true,
                  anime: { lit: '#7d78d6', shade: '#2e2766', rim: '#d6d3ff' } },
  day:      { kind: 'phys', elevation: 50, azimuth: 160, turbidity: 2, rayleigh: 1, exposure: 0.4,
              sun: ['#ffffff', 3.2], hemi: ['#cfe6ff', '#7a6a55', 0.4], fog: ['#bcd4ee', 0.0016], clouds: true },
  sunset:   { kind: 'phys', elevation: 3, azimuth: 250, turbidity: 8, rayleigh: 3, exposure: 0.5,
              sun: ['#ffb070', 2.4], hemi: ['#ffcf9f', '#4a3b4f', 0.4], fog: ['#e8b48c', 0.0018], clouds: true },
  cartoon:  { kind: 'grad', top: '#3d8bff', horizon: '#d4ecff', bottom: '#9cc0e0', exponent: 0.6,
              elevation: 55, azimuth: 160, disk: '#fff8d6', diskSize: 0.9994, exposure: 1.0,
              sun: ['#ffffff', 2.6], hemi: ['#cfe6ff', '#8a7a66', 1.0], fog: ['#d4ecff', 80, 450], clouds: true },
  night:    { kind: 'grad', top: '#02040f', horizon: '#1c2652', bottom: '#05060f', exponent: 0.45,
              elevation: 35, azimuth: 220, disk: '#e8eeff', diskSize: 0.9996, exposure: 1.0,
              sun: ['#9fb4ff', 0.9], hemi: ['#3a4a80', '#101018', 0.6], fog: ['#121a36', 60, 400], stars: true },
  overcast: { kind: 'grad', top: '#9aa3ad', horizon: '#c9ced3', bottom: '#8a8f94', exponent: 0.8,
              elevation: 60, azimuth: 160, disk: null, exposure: 1.0,
              sun: ['#ffffff', 0.6], hemi: ['#d6dbe0', '#6b6b6b', 1.6], fog: ['#c9ced3', 30, 220] },
};

function dirFrom(THREE, elevation, azimuth) {
  return new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), THREE.MathUtils.degToRad(azimuth));
}

// Bầu trời gradient 3 màu + đĩa mặt trời/trăng (shader trên mặt cầu lớn)
export function createGradientSky(THREE, opts = {}) {
  const o = { top: '#3d8bff', mid: null, midH: 0.001, horizon: '#d4ecff', bottom: '#9cc0e0', exponent: 0.6, radius: 4000,
              sunDir: new THREE.Vector3(0, 1, 0), disk: '#fff8d6', diskSize: 0.9994, ...opts };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      uTop: { value: new THREE.Color(o.top) }, uHorizon: { value: new THREE.Color(o.horizon) },
      uBottom: { value: new THREE.Color(o.bottom) }, uExp: { value: o.exponent },
      uMid: { value: new THREE.Color(o.mid || o.horizon) }, uMidH: { value: o.mid ? o.midH : 0.001 },
      uSunDir: { value: o.sunDir.clone().normalize() }, uDisk: { value: new THREE.Color(o.disk || '#000000') },
      uDiskSize: { value: o.disk ? o.diskSize : 2.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uMid, uHorizon, uBottom, uSunDir, uDisk; uniform float uExp, uDiskSize, uMidH;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = h < 0.0 ? mix(uHorizon, uBottom, pow(-h, 0.5))
               : h < uMidH ? mix(uHorizon, uMid, h / uMidH)
               : mix(uMid, uTop, pow((h - uMidH) / (1.0 - uMidH), uExp));
        float s = dot(d, normalize(uSunDir));
        c += uDisk * smoothstep(uDiskSize - 0.0004, uDiskSize, s);           // đĩa
        c += uDisk * 0.25 * pow(max(s, 0.0), 64.0) * step(uDiskSize, 1.5);  // quầng sáng
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(o.radius, 48, 24), mat);
  mesh.name = 'gradientSky';
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return { object: mesh, material: mat };
}

// Mây anime: cụm cầu tròn, đáy phẳng, tô 2 tông cứng theo hướng nắng + viền sáng mép. Trôi quanh trục Y theo t.
export function createAnimeClouds(THREE, opts = {}) {
  const o = { seed: 8, count: 16, dist: [380, 620], height: [25, 130], speed: 0.004,
              lit: '#ffffff', shade: '#a9b8f0', rim: '#ffffff', sunDir: new THREE.Vector3(0, 1, 0), ...opts };
  const r = rng(o.seed);
  const mat = new THREE.ShaderMaterial({
    fog: false, toneMapped: false,
    uniforms: { uLit: { value: new THREE.Color(o.lit) }, uShade: { value: new THREE.Color(o.shade) },
                uRim: { value: new THREE.Color(o.rim) }, uSun: { value: o.sunDir.clone().normalize() } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vWN;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = -mv.xyz;
        vWN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLit, uShade, uRim, uSun; varying vec3 vN; varying vec3 vV; varying vec3 vWN;
      void main() {
        float l = dot(normalize(vWN), uSun) + vWN.y * 0.35;          // nắng + trời chiếu từ trên
        vec3 c = mix(uShade, uLit, smoothstep(0.02, 0.08, l));       // 2 tông cứng
        float fr = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
        c = mix(c, uRim, smoothstep(0.62, 0.7, fr) * 0.85);           // viền sáng
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const group = new THREE.Group();
  group.name = 'animeClouds';
  for (let i = 0; i < o.count; i++) {
    const c = new THREE.Group();
    c.name = `animeCloud_${i}`;
    const puffs = 5 + Math.floor(r() * 5), len = 70 + r() * 90, base = o.height[0] + r() * (o.height[1] - o.height[0]);
    for (let k = 0; k < puffs; k++) {
      const u = puffs > 1 ? k / (puffs - 1) : 0.5;
      const s = (18 + r() * 16) * (1.15 - Math.abs(u - 0.5));        // giữa to, hai đầu nhỏ
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(s * 1.25, s, s);
      m.position.set((u - 0.5) * len, s * 0.55 + r() * s * 0.5, (r() - 0.5) * 30); // đáy gần phẳng ở y=0
      c.add(m);
    }
    // vài cụm phụ chồng lên đỉnh cho dáng "bông cải"
    for (let k = 0; k < 2; k++) {
      const s = 20 + r() * 14, m = new THREE.Mesh(geo, mat);
      m.scale.setScalar(s);
      m.position.set((r() - 0.5) * len * 0.4, s * 1.4, (r() - 0.5) * 15);
      c.add(m);
    }
    const a = (i / o.count) * Math.PI * 2 + r() * 0.3, d = o.dist[0] + r() * (o.dist[1] - o.dist[0]);
    c.position.set(Math.sin(a) * d, base, Math.cos(a) * d);
    c.lookAt(0, base, 0);
    group.add(c);
  }
  return {
    object: group,
    update(t) { group.rotation.y = t * o.speed; },
  };
}

// Sao: điểm cố định trên nửa trên bầu trời, có seed
export function createStars(THREE, { seed = 21, count = 1500, radius = 3500, size = 2 } = {}) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = 0.05 + r() * 0.95, a = r() * Math.PI * 2, k = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * k * radius, y * radius, Math.sin(a) * k * radius], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 }));
  pts.name = 'stars';
  pts.frustumCulled = false;
  return { object: pts };
}

// Trời ảnh HDRI 360° từ Poly Haven (CC0, polyhaven.com). File .hdr nằm ở assets/hdri/ (bản 1k).
// Tải bằng RGBELoader rồi truyền vào createSkyPreset(..., { hdri: { [key]: texture } }).
// sun: hướng nắng ước lượng theo ảnh (để có bóng đổ); ảnh tự chiếu sáng qua IBL nên đèn để nhẹ.
export const HDRI_SKIES = {
  hdri_quarry:  { label: 'Ảnh 360°: trưa nắng (Poly Haven)', file: 'quarry_01_1k.hdr', exposure: 0.9,
                  elevation: 45, azimuth: 120, sun: ['#fff1dc', 1.6], hemi: ['#cfe0ff', '#7a6a55', 0.7] },
  hdri_sunrise: { label: 'Ảnh 360°: bình minh (Poly Haven)', file: 'blouberg_sunrise_2_1k.hdr', exposure: 0.9,
                  elevation: 8, azimuth: 250, sun: ['#ffc58a', 1.8], hemi: ['#ffd9b0', '#4a3b4f', 0.8] },
  hdri_sunset:  { label: 'Ảnh 360°: hoàng hôn phố cổ (Poly Haven)', file: 'venice_sunset_1k.hdr', exposure: 0.9,
                  elevation: 6, azimuth: 200, sun: ['#ffae6b', 1.8], hemi: ['#ffcf9f', '#4a3b4f', 0.8] },
  hdri_night:   { label: 'Ảnh 360°: đêm không trăng (Poly Haven)', file: 'moonless_golf_1k.hdr', exposure: 1.6,
                  elevation: 40, azimuth: 220, sun: ['#9fb4ff', 0.5], hemi: ['#5a6aa0', '#101018', 0.8] },
};

// Đổi dữ liệu RGBELoader.parse(buffer) → texture trời (dùng khi đã có sẵn ArrayBuffer, vd: nhúng base64)
export function hdriTextureFromParsed(THREE, d) {
  const tex = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type);
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.flipY = true;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.needsUpdate = true;
  return tex;
}

export function createSkyPreset(THREE, name, { renderer, scene, Sky, sun, hemi, hdri = {} }) {
  if (HDRI_SKIES[name] && hdri[name]) return createHdriPreset(THREE, name, { renderer, scene, sun, hemi, texture: hdri[name] });
  const c = CONF[name] || CONF.cartoon;
  const group = new THREE.Group();
  group.name = `sky_${name}`;
  const updates = [];
  let sunDir;

  const pmrem = new THREE.PMREMGenerator(renderer);
  if (c.kind === 'phys') {
    const sky = createSky(THREE, Sky, { elevation: c.elevation, azimuth: c.azimuth, turbidity: c.turbidity, rayleigh: c.rayleigh });
    group.add(sky.object);
    sunDir = sky.sunDir.clone();
    scene.environment = sky.bakeEnvironment(renderer);
    scene.background = null;
  } else {
    sunDir = dirFrom(THREE, c.elevation, c.azimuth);
    const sky = createGradientSky(THREE, { ...c, sunDir });
    group.add(sky.object);
    const tmp = new THREE.Scene();
    tmp.add(new THREE.Mesh(sky.object.geometry, sky.material));
    scene.environment = pmrem.fromScene(tmp, 0, 0.1, 10000).texture;
    scene.background = null;
  }
  pmrem.dispose();

  if (c.stars) group.add(createStars(THREE).object);
  if (c.anime) {
    const ac = createAnimeClouds(THREE, { ...c.anime, sunDir });
    group.add(ac.object);
    updates.push((t) => ac.update(t));
  }
  if (c.clouds) {
    const cl = createClouds(THREE, { seed: 3, count: 12, area: 420, height: [45, 85] });
    group.add(cl.object);
    updates.push((t) => cl.update(t));
  }

  // ánh sáng + sương + exposure khớp với trời
  sun.color.set(c.sun[0]);
  sun.intensity = c.sun[1];
  sun.position.copy(sunDir).multiplyScalar(80).add(sun.target.position);
  hemi.color.set(c.hemi[0]);
  hemi.groundColor.set(c.hemi[1]);
  hemi.intensity = c.hemi[2];
  scene.fog = c.fog.length === 2 ? new THREE.FogExp2(c.fog[0], c.fog[1]) : new THREE.Fog(c.fog[0], c.fog[1], c.fog[2]);
  renderer.toneMappingExposure = c.exposure;

  scene.add(group);
  return {
    name, object: group, sunDir, exposure: c.exposure,
    update(t) { for (const f of updates) f(t); },
    dispose() {
      scene.remove(group);
      scene.environment?.dispose();
      scene.environment = null;
      group.traverse((x) => { x.geometry?.dispose(); x.material?.dispose?.(); });
    },
  };
}

function createHdriPreset(THREE, name, { renderer, scene, sun, hemi, texture }) {
  const c = HDRI_SKIES[name];
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(texture).texture;
  pmrem.dispose();
  scene.background = texture;
  scene.environment = env;
  scene.fog = null;
  const sunDir = dirFrom(THREE, c.elevation, c.azimuth);
  sun.color.set(c.sun[0]);
  sun.intensity = c.sun[1];
  sun.position.copy(sunDir).multiplyScalar(80).add(sun.target.position);
  hemi.color.set(c.hemi[0]);
  hemi.groundColor.set(c.hemi[1]);
  hemi.intensity = c.hemi[2];
  renderer.toneMappingExposure = c.exposure;
  const group = new THREE.Group();
  group.name = `sky_${name}`;
  return {
    name, object: group, sunDir, exposure: c.exposure,
    update() {},
    dispose() { scene.background = null; env.dispose(); scene.environment = null; },
  };
}
