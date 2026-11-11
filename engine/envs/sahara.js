// Bối cảnh 'sahara' (preset ánh sáng mặc định: desert). Sửa bối cảnh này CHỈ trong file này.
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
  g.add(bumpy(900, 900, 110, '#e7b86a', 12, 1.7, 'dunes', 0.03));
  // Kim tự tháp bậc thang ở chân trời (phía camera s014 nhìn: +X, -Z)
  [[150, -120, 80, '#d9aa62'], [235, -175, 110, '#cf9c58'], [60, -230, 70, '#dcb06b'], [-120, -200, 60, '#d2a25c']].forEach(([x, z, sz, c], i) => place(g, pyramid(THREE, sz, c), x, 0, z, 0.5 + i * 0.4));
  // Cồn cát lớn tô điểm chân trời
  for (let i = 0; i < 9; i++) { const d = K.rock(26 + hash(i, 5) * 20, '#e0ad5e', i + 70); d.children[0].scale.set(3.2, 0.32, 1.6); place(g, d, -300 + i * 75, -4, -110 - hash(i, 6) * 120, hash(i, 7) * 3); }
  // Lạc đà: 2 con đứng, 2 con đi chậm (tất định theo t)
  e.camels = [[19, 0, 13, 1.4, -2.7, 0], [0, 0, 40, 1.2, 2.4, 0], [-26, 0, 24, 1.3, -0.52, 1], [30, 0, -14, 1.6, 3.6, 1]].map(([x, y, z, s, ry, w], i) => {
    const c = camel(THREE, K, i, w); place(g, c, x, y, z, ry, s); c.userData.base = [x, z, ry, w]; return c; });
  for (let i = 0; i < 9; i++) place(g, K.rock(1.5 + hash(i, 8), '#c08a52', i + 20), -50 + i * 14 + hash(i, 9) * 6, 0, 30 + hash(i, 4) * 25 - (i % 3) * 45);
  for (let i = 0; i < 10; i++) { const r = pickFit(['nature-kit/stone_tallA', 'nature-kit/stone_tallB', 'nature-kit/rock_smallA'], i, 4 + hash(i, 10) * 5); if (r) place(g, r, (hash(i, 11) - 0.5) * 160, 0, -60 - hash(i, 12) * 60, hash(i, 13) * 6); }
  // Bụi khô
  // không mọc cây/bụi dưới gầm nhà (nhà ở gốc toạ độ; góp ý 2026-11-11 #4: cây xuyên lan can ở s014)
  const clearOfHouse = (x, z) => Math.hypot(x, z) > 24;
  for (let i = 0; i < 24; i++) { const x = (hash(i, 15) - 0.5) * 120, z = 50 - hash(i, 16) * 100; if (!clearOfHouse(x, z)) continue; const b = K.bush(1.2 + hash(i, 14), i % 2 ? '#a88a4a' : '#8a7038'); b.scale.y = 0.7; place(g, b, x, 0, z, hash(i, 17) * 6); }
  for (let i = 0; i < 9; i++) { const x = (hash(i, 2) - 0.5) * 220, z = -40 - hash(i, 3) * 120 + (i % 2) * 90; if (!clearOfHouse(x, z)) continue; const c = pickFit(['nature-kit/cactus_tall', 'nature-kit/cactus_short'], i, 6 + hash(i, 1) * 5); if (c) place(g, c, x, 0, z, hash(i, 4) * 6); }
  return { update(t) { e.camels.forEach((c) => { const [x, z, ry, w] = c.userData.base;
    if (w) { const d = (t - 17) * 4; c.position.set(x + Math.cos(ry) * d, 0, z - Math.sin(ry) * d); }
    c.userData.update(t); }); } };
}
