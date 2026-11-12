// Bối cảnh 'storm' (preset ánh sáng mặc định: storm). Sửa bối cảnh này CHỈ trong file này.
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
  e.sea = makeSea(g, { preset: 'storm', y: 2, amp: 2.4, size: 1600, rate: 1.6 });   // t biển = t·1.6 (engine/sea.js) — vật nổi tự lấy sea.clock
  ganTang(e.sea.water.mesh, 'front');   // quy ước mặt nước = tầng trước (như sea/ocean/shipStorm); tầng giữa = đá gần (tangXa) + vật shot thêm qua props
  e.rain = fxRain(THREE, { count: 2200 }); g.add(ganTang(e.rain.obj, 'front'));   // tầng trước: mưa quanh camera
  // ô FX tangXa (engine/post.js; ep001 tắt): nhóm 'storm_tangxa' = đá gần (tầng giữa) + núi mờ trong sương quanh chân trời (tầng sau, 650–800 stud < camera.far 1000). update() ẩn/hiện theo ô.
  const tx = new THREE.Group(); tx.name = 'storm_tangxa'; g.add(tx);
  { const reef = new THREE.Group(); reef.name = 'storm_reef_rocks';
    for (let i = 0; i < 6; i++) { const a = hash(i, 31) * 6.283, r = 90 + hash(i, 32) * 40, s0 = 5 + hash(i, 33) * 6;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat('#27323f', { flatShading: true, roughness: 1 })); m.scale.set(s0, s0 * 0.8, s0 * 0.9); m.position.set(Math.cos(a) * r, 2 + s0 * 0.1, Math.sin(a) * r); reef.add(m); }
    tx.add(ganTang(reef, 'mid'));
    const far = new THREE.Group(); far.name = 'storm_far_rocks';
    for (let i = 0; i < 10; i++) { const a = (i + hash(i, 41) * 0.5) * 0.6283, r = 520 + hash(i, 42) * 100, w = 220 + hash(i, 43) * 120, h = 110 + hash(i, 44) * 60;   // bóng núi cao ~12–16° ở chân trời, màu sáng hơn mây bão để đọc được
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat('#7388b0', { flatShading: true, roughness: 1 })); m.scale.set(w, h, w * 0.35); m.position.set(Math.cos(a) * r, h * 0.15, Math.sin(a) * r); m.rotation.y = -a + Math.PI / 2; far.add(m); }
    e.farRocks = far; tx.add(ganTang(far, 'back')); }
  e.bolt = fxBolt(THREE); e.bolt.position.set(-40, 20, -140); e.bolt.scale.setScalar(2); g.add(e.bolt);
  // chớp mượt (engine/flash.js): sáng 1 khung rồi tắt dần — không nhấp nháy từng 2 khung (gây "giật")
  return { suSong: ['song'], update(t, ctx) { tx.visible = globalThis.__autoFx?.tangXa !== false; e.sea(t, 2.4); e.rain.update(t, ctx.focus || [0, 0, 0]); const f = smoothFlash(t); e.bolt.visible = f > 0.45; ctx.flash = f; } };
}
