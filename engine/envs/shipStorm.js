// Bối cảnh 'shipStorm' (preset ánh sáng mặc định: storm). Sửa bối cảnh này CHỈ trong file này.
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
  e.sea = makeSea(g, { preset: 'storm', y: -1, amp: 2.2, size: 1600 });
  e.ship = place(g, K.ship(), 0, 0, 0, 0, 1);
  e.rain = fxRain(THREE, { count: 1600, area: [70, 50, 70] }); g.add(e.rain.obj);
  e.bolt = fxBolt(THREE, { seed: 9 }); e.bolt.position.set(30, 25, -120); e.bolt.scale.setScalar(1.8); g.add(e.bolt);
  return { update(t, ctx) { e.sea(t * 1.5, 2.2); e.rain.update(t, ctx.focus || [0, 0, 0]); e.ship.rotation.z = Math.sin(t * 1.1) * 0.12; e.ship.rotation.x = Math.sin(t * 0.8) * 0.06; e.ship.position.y = Math.sin(t * 1.3) * 0.8; const f = smoothFlash(t, { every: 2.4, seed: 8 }); e.bolt.visible = f > 0.45; ctx.flash = f; } };
}
