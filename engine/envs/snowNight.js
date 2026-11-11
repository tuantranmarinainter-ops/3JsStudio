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
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  g.add(bumpy(900, 900, 70, '#dfe8f5', 8, 2.2, 'snow_night', 0.03));
  g.add(snowRanges(THREE, { day: false, seed: 8 }));
  for (let i = 0; i < 30; i++) place(g, pf(['snow-laden-spruce-36716e', 'snow-laden-spruce-36716e', 'windblown-larch-abb99c', 'bare-mountain-rowan-10e72e'][i % 4], 1.1 + hash(i, 4) * 0.8) || K.pine(12 + hash(i, 4) * 10, true), (hash(i, 5) - 0.5) * 300, 0, -60 - hash(i, 6) * 120, hash(i, 7) * 6);
  e.moon = place(g, K.moon(26), -120, 235, -500);
  e.snow = fxSnow(THREE, { count: 700, area: [120, 60, 120], speed: 2.5, size: 0.4 }); g.add(e.snow.obj);
  return { ground: { kind: 'snow', y: 0.1 }, update(t, ctx) { e.snow.update(t, ctx.focus || [0, 0, 0]); } };
}
