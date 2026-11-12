// Bối cảnh 'brazil' (preset ánh sáng mặc định: day). Sửa bối cảnh này CHỈ trong file này.
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
import { createWind } from '../wind.js';
import { createPvTrees } from '../trees.js';

export default function build(g, e, H) {
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  g.add(plane(900, 900, mat('#3f8a35'), 0, 'jungle_floor'));
  g.add(plane(14, 200, mat('#7a5a3a'), 0.05, 'jungle_path'));
  const KT = ['nature-kit/tree_tall', 'nature-kit/tree_detailed', 'nature-kit/tree_fat', 'nature-kit/tree_oak', 'nature-kit/tree_palmTall', 'nature-kit/tree_palmDetailedTall'];
  // Cây: bản cũ (khối hộp + Kenney) nằm trong `old`; bản mới kiểu Painted Valley (engine/trees.js) = `pv`. Ô bật/tắt 'pvTrees' (tắt = bản cũ).
  const old = new THREE.Group(); old.name = 'brazil_trees_old'; g.add(old);
  const pvList = [], wind = createWind(THREE, { dir: [1, 0.15], speed: 4, gust: 0.7, seed: 13, gustSize: 36 });
  // Tường cây khổng lồ phía sau nhà (camera s013 nhìn thẳng về -Z từ z≈72, hạ thấp → phải rất cao mới lên khỏi mái)
  for (let i = 0; i < 46; i++) {
    const x = (hash(i, 1) - 0.5) * 230, z = -34 - hash(i, 2) * 110, h = 55 + hash(i, 3) * 45;
    if (Math.abs(x) < 9 && z > -60) continue;
    place(old, jungleGiant(THREE, K, h, i), x, 0, z, hash(i, 4) * 6);
    pvList.push({ x, z, h: h * 0.95, kind: 'giant', hue: hash(i, 15) });
  }
  // Hai bên nhà: cây cao + cây Kenney
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1, x = side * (36 + hash(i, 5) * 40), z = 0 - hash(i, 6) * 60;
    if (i % 3 === 0) { const hh = 48 + hash(i, 7) * 28; place(old, jungleGiant(THREE, K, hh, 100 + i), x, 0, z, hash(i, 8) * 6); pvList.push({ x, z, h: hh * 0.95, kind: 'giant', hue: hash(i, 16) }); }
    else { const hh = 36 + hash(i, 7) * 26, t = pickFit(KT, i, hh); place(old, t || K.jungleTree(34), x, 0, z, hash(i, 8) * 6); pvList.push({ x, z, h: hh * 1.05, kind: 'round', hue: hash(i, 17) }); }
  }
  for (let i = 0; i < 70; i++) { const x = (hash(i, 11) - 0.5) * 260, z = -20 - hash(i, 12) * 140; if (Math.abs(x) < 16 && z > -50) continue;
    const hh = 22 + hash(i, 13) * 24, t = pickFit(KT, i + 3, hh); place(old, t || K.jungleTree(26), x, 0, z, hash(i, 14) * 6); pvList.push({ x, z, h: hh * 1.1, kind: 'round', hue: hash(i, 18) }); }
  const pv = createPvTrees(THREE, { wind, seed: 13, list: pvList }).bind(scene); g.add(pv.group);
  // Lá to, dương xỉ, bụi dày dọc lối đi và quanh nhà
  for (let i = 0; i < 44; i++) {
    const side = i % 2 ? 1 : -1, x = side * (9 + hash(i, 21) * 34), z = 56 - hash(i, 22) * 80;
    if (Math.abs(x) < 9) continue;
    if (i % 3 === 0) place(g, bigLeaves(THREE, K, 5 + hash(i, 23) * 4, i, ['#2f9a3f', '#3fae4a', '#23823a'][i % 3]), x, 0, z, hash(i, 24) * 6);
    else { const b = pickFit(['nature-kit/plant_bushLargeTriangle', 'nature-kit/plant_bushTriangle', 'nature-kit/grass_leafsLarge', 'nature-kit/plant_flatTall'], i, 3.5 + hash(i, 25) * 4); place(g, b || K.bush(2 + hash(i, 26) * 2, ['#2e8b3c', '#3c9a46', '#56b04a'][i % 3]), x, 0, z, hash(i, 27) * 6); }
  }
  for (let i = 0; i < 70; i++) { const x = (hash(i, 31) - 0.5) * 200, z = 30 - hash(i, 32) * 130; if (Math.abs(x) < 10 && z > -20) continue;
    place(g, K.bush(2.5 + hash(i, 33) * 3, ['#2e8b3c', '#3c9a46', '#56b04a', '#1f6b2e'][i % 4]), x, 0, z); }
  for (let i = 0; i < 16; i++) { const m = pickFit(['nature-kit/mushroom_redGroup'], i, 2.2); if (m) place(g, m, (hash(i, 41) > 0.5 ? 1 : -1) * (8 + hash(i, 42) * 12), 0, 50 - hash(i, 43) * 50, hash(i, 44) * 6); }
  for (let i = 0; i < 5; i++) { const b = K.box(1.2, 0.6, 1.8, '#d9413a', 0, 0, 0, 'bird', g); b.position.set(-20 + i * 9, 28 + i * 3, -10); }
  return { update(t) { const on = globalThis.__autoFx?.pvTrees !== false; pv.group.visible = on; old.visible = !on; if (on) pv.update(t); } };
}
