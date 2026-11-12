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
  const { ganTang, THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  e.sea = makeSea(g, { preset: 'night', y: -0.3, amp: 0.2, size: 1400, name: 'dark_water' });
  for (let i = 0; i < 160; i++) { const x = (hash(i, 1) - 0.5) * 500, z = (hash(i, 2) - 0.5) * 500; const r = 6 + hash(i, 3) * 12;
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.8, 6), mat(i % 3 ? '#e8eef8' : '#cfdaee', { flatShading: true })); fl.position.set(x, 0, z); fl.rotation.y = hash(i, 4) * 3; fl.receiveShadow = true; fl.name = 'ice_floe'; g.add(fl); }
  const sheet = plane(70, 70, mat('#eef3fb'), 0.35, 'ice_sheet'); g.add(sheet);
  e.moon = place(g, K.moon(30), 140, 170, -520);
  // --- 3 tầng (docs/boi-canh-tang.md): front = mặt nước · mid = tảng băng chính (ice_sheet, chỗ nhà/nhân vật) · back = mặt trăng + dãy băng xa (tangXa) ---
  ganTang(e.sea.water.mesh, 'front');
  ganTang(sheet, 'mid');
  ganTang(e.moon, 'back');
  // ô FX tangXa (ep001 tắt): dãy băng trôi xa quanh chân trời (500–800 stud < camera.far 1000), tất định theo hash; update() ẩn/hiện theo ô
  const tx = new THREE.Group(); tx.name = 'iceSea_tangxa'; tx.userData.banKinhToiThieu = 30; g.add(tx);
  { const far = new THREE.Group(); far.name = 'iceSea_far_bergs';
    for (let i = 0; i < 12; i++) {
      const a = (i + hash(i, 51) * 0.6) * 0.5236, r = 520 + hash(i, 52) * 260, w = 70 + hash(i, 53) * 90, h = 14 + hash(i, 54) * 22;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat(i % 2 ? '#b9c8e0' : '#d4deef', { flatShading: true, roughness: 1 }));
      m.scale.set(w, h, w * 0.5);
      m.position.set(Math.cos(a) * r, h * 0.2 - 0.5, Math.sin(a) * r);
      m.rotation.y = -a + Math.PI / 2;
      far.add(m);
    }
    tx.add(ganTang(far, 'back')); }
  return { suSong: ['song'], ground: { kind: 'snow', y: 0.45 }, update(t) { tx.visible = globalThis.__autoFx?.tangXa !== false; e.sea(t); } };
}
