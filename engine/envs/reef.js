// Bối cảnh 'reef' (preset ánh sáng mặc định: beach). Sửa bối cảnh này CHỈ trong file này.
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
import { createWreck } from '../wreck.js';

export default function build(g, e, H) {
  const { ganTang, THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  const reefSpots = Array.from({ length: 12 }, (_, i) => [(hash(i, 2) - 0.5) * 70, (hash(i, 3) - 0.5) * 40, (5 + hash(i, 1) * 7) * 0.7]);
  e.sea = makeSea(g, { preset: 'shallow', y: 0, amp: 0.5, size: 1400, spots: reefSpots });
  // đá ngầm phủ san hô nhiều màu (engine/cliff.js) thay đá Kenney đen/xám; tránh chỗ thân tàu (5,0,0)
  for (let i = 0; i < 18; i++) { const x = (hash(i, 2) - 0.5) * 70, z = (hash(i, 3) - 0.5) * 40, r = 3.2 + hash(i, 1) * 4.2;
    const near = Math.hypot(x - 5, z) < 9; place(g, coralRock(THREE, { seed: i + 100, r: near ? r * 0.7 : r, h: 0.42 + hash(i, 4) * 0.2, base: -2.6 }), x, 0, z, hash(i, 5) * 6); }
  for (let i = 0; i < 26; i++) { const a = hash(i, 31) * Math.PI * 2, rr = 14 + hash(i, 32) * 34; place(g, coralRock(THREE, { seed: i + 300, r: 1.2 + hash(i, 33) * 1.4, h: 0.5, base: -2.2 }), 5 + Math.cos(a) * rr, 0, Math.sin(a) * rr * 0.7, hash(i, 34) * 6); }
  g.add(plane(400, 400, mat('#e9d6a6'), -2.4, 'reef_sand'));
  e.ship = place(g, K.ship({ sails: false }), 5, 0, 0, 0.5, 1); e.ship.rotation.z = 0.35; e.ship.rotation.x = -0.15; e.ship.position.y = -1.5;
  e.wreck = createWreck(THREE, e.ship);
  // --- 3 tầng (docs/boi-canh-tang.md): front = mặt nước + đá san hô · mid = tàu đắm · back = đảo xa trong sương (tangXa) ---
  ganTang(e.sea.water.mesh, 'front');
  g.children.forEach((o) => { if (o.name === 'coral_rock') ganTang(o, 'front'); });
  ganTang(e.ship, 'mid');
  const tx = new THREE.Group(); tx.name = 'reef_tangxa'; tx.userData.banKinhToiThieu = 30; g.add(tx);
  { const far = new THREE.Group(); far.name = 'reef_far_isles';
    for (let i = 0; i < 10; i++) {
      const a = (i + hash(i, 61) * 0.6) * 0.6283, r = 450 + hash(i, 62) * 250, w = 90 + hash(i, 63) * 90, h = 16 + hash(i, 64) * 24;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat(i % 2 ? '#5d8c78' : '#6a9a86', { flatShading: true, roughness: 1 }));
      m.scale.set(w, h, w * 0.5);
      m.position.set(Math.cos(a) * r, h * 0.2 - 0.5, Math.sin(a) * r);
      m.rotation.y = -a + Math.PI / 2;
      far.add(m);
    }
    tx.add(ganTang(far, 'back')); }   // đứt đôi + cột gãy + gỗ đen phong hoá (khoá 'wreckSplit'); tắt ⇒ tàu nguyên như cũ
  return { suSong: ['song'], update(t) { tx.visible = globalThis.__autoFx?.tangXa !== false; e.wreck.update(); e.sea(t); } };
}
