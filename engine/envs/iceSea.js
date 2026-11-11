// Bối cảnh 'iceSea' (preset ánh sáng mặc định: snowNight). Sửa bối cảnh này CHỈ trong file này.
// Được engine/envs.js gọi: build(g, e, H) — g = Group của env, e = đối tượng env, H = bộ công cụ chung (xem envs.js).
import { fxSnow, fxRain, lightning, fxBolt } from '../fx.js';
import { createWater } from '../water.js';
import { createOceanLife, OCEAN_LIFE_ASSETS } from '../whales.js';
import { townLife } from '../townlife.js';
import { createSummit, createRange } from '../peaks.js';
import { createCloudSea, createCloudPuffs } from '../clouds.js';
import { pyramid, camel, jungleGiant, bigLeaves } from '../env_desert.js';
import { snowRanges } from '../snowpeaks.js';
import { createCliff, naturalRock, coralRock } from '../cliff.js';
import { createCrabs, createBeachGrass } from '../crabs.js';
import { createCamp } from '../castaway.js';
import { smoothFlash } from '../flash.js';

export default function build(g, e, H) {
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  e.sea = makeSea(g, { preset: 'night', y: -0.3, amp: 0.2, size: 1400, name: 'dark_water' });
  for (let i = 0; i < 160; i++) { const x = (hash(i, 1) - 0.5) * 500, z = (hash(i, 2) - 0.5) * 500; const r = 6 + hash(i, 3) * 12;
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.8, 6), mat(i % 3 ? '#e8eef8' : '#cfdaee', { flatShading: true })); fl.position.set(x, 0, z); fl.rotation.y = hash(i, 4) * 3; fl.receiveShadow = true; fl.name = 'ice_floe'; g.add(fl); }
  const sheet = plane(70, 70, mat('#eef3fb'), 0.35, 'ice_sheet'); g.add(sheet);
  e.moon = place(g, K.moon(30), 140, 170, -520);
  return { ground: { kind: 'snow', y: 0.45 }, update(t) { e.sea(t); } };
}
