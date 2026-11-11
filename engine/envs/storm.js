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
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  e.sea = makeSea(g, { preset: 'storm', y: 2, amp: 2.4, size: 1600 });
  e.rain = fxRain(THREE, { count: 2200 }); g.add(e.rain.obj);
  e.bolt = fxBolt(THREE); e.bolt.position.set(-40, 20, -140); e.bolt.scale.setScalar(2); g.add(e.bolt);
  // chớp mượt (engine/flash.js): sáng 1 khung rồi tắt dần — không nhấp nháy từng 2 khung (gây "giật")
  return { update(t, ctx) { e.sea(t * 1.6, 2.4); e.rain.update(t, ctx.focus || [0, 0, 0]); const f = smoothFlash(t); e.bolt.visible = f > 0.45; ctx.flash = f; } };
}
