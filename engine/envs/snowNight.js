// Bối cảnh 'snowNight' (preset ánh sáng mặc định: snowNight). Sửa bối cảnh này CHỈ trong file này.
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
  g.add(bumpy(900, 900, 70, '#dfe8f5', 8, 2.2, 'snow_night', 0.03));
  g.add(ganTang(snowRanges(THREE, { day: false, seed: 8, natural: true }), 'back'));
  for (let i = 0; i < 30; i++) ganTang(place(g, pf(['snow-laden-spruce-36716e', 'snow-laden-spruce-36716e', 'windblown-larch-abb99c', 'bare-mountain-rowan-10e72e'][i % 4], 1.1 + hash(i, 4) * 0.8) || K.pine(12 + hash(i, 4) * 10, true), (hash(i, 5) - 0.5) * 300, 0, -60 - hash(i, 6) * 120, hash(i, 7) * 6), 'mid');
  // ô FX tangXa (engine/post.js; ep001 tắt): vài tảng băng nhỏ quanh khu nhân vật = tầng trước. update() ẩn/hiện theo ô.
  const tx = new THREE.Group(); tx.name = 'snowNight_tangxa'; g.add(tx);
  { const ice = new THREE.Group(); ice.name = 'snowNight_ice_chunks';
    for (let i = 0, n = 0; n < 7 && i < 60; i++) { const a = hash(i, 81) * 6.283, r = 26 + hash(i, 82) * 22, x = Math.cos(a) * r, z = 10 + Math.sin(a) * r;
      if (x > 6 && x < 42 && z > 22 && z < 52) continue;
      const s0 = 0.5 + hash(i, 83) * 0.9, m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat('#c9d6ea', { flatShading: true, roughness: 0.55 }));
      m.scale.set(s0 * 1.3, s0 * 0.7, s0); m.position.set(x, s0 * 0.25, z); m.rotation.y = hash(i, 84) * 6.283; ice.add(m); n++; }
    tx.add(ganTang(ice, 'front')); }
  e.moon = place(g, K.moon(26), -120, 235, -500);
  e.snow = fxSnow(THREE, { count: 700, area: [120, 60, 120], speed: 2.5, size: 0.4 }); g.add(ganTang(e.snow.obj, 'front'));
  return { suSong: [], ground: { kind: 'snow', y: 0.1 }, update(t, ctx) {
    tx.visible = globalThis.__autoFx?.tangXa !== false;
    if (e.moon) e.moon.visible = !!LIGHTS[ctx.light || e.light]?.night;   // ánh sáng ngày (vd 'snow') → giấu trăng, trời 6 ảnh vẽ mặt trời (góp ý #27 s080)
    e.snow.update(t, ctx.focus || [0, 0, 0]); } };
}
