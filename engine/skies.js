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
};

const CONF = {
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
  const o = { top: '#3d8bff', horizon: '#d4ecff', bottom: '#9cc0e0', exponent: 0.6, radius: 4000,
              sunDir: new THREE.Vector3(0, 1, 0), disk: '#fff8d6', diskSize: 0.9994, ...opts };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      uTop: { value: new THREE.Color(o.top) }, uHorizon: { value: new THREE.Color(o.horizon) },
      uBottom: { value: new THREE.Color(o.bottom) }, uExp: { value: o.exponent },
      uSunDir: { value: o.sunDir.clone().normalize() }, uDisk: { value: new THREE.Color(o.disk || '#000000') },
      uDiskSize: { value: o.disk ? o.diskSize : 2.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon, uBottom, uSunDir, uDisk; uniform float uExp, uDiskSize;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(h, uExp)) : mix(uHorizon, uBottom, pow(-h, 0.5));
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

export function createSkyPreset(THREE, name, { renderer, scene, Sky, sun, hemi }) {
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
