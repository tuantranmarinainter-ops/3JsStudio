// Bối cảnh 'ocean' (preset ánh sáng mặc định: ocean). Sửa bối cảnh này CHỈ trong file này.
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
  e.sea = makeSea(g, { preset: 'deep', y: 11, amp: 0.6, size: 1600 });
  g.add(plane(900, 900, mat('#0e5f86'), -10, 'seabed'));
  // cá voi GLB (nổi lên, bơi vòng quanh chân nhà, 1 cú nhảy + nước văng); thiếu asset → về cá voi khối cũ
  e.life = A && A.has('sea/sperm_whale') ? createOceanLife(THREE, A, { seaY: 11 }) : null;
  if (e.life) g.add(e.life.group);
  else e.whales = [0, 1, 2].map(() => place(g, K.whale(), 0, 0, 0, 0, 1));
  place(g, K.cloud(2.5), -120, 120, -300); place(g, K.cloud(2), 150, 100, -350);
  return { update(t) { e.sea(t);
    if (e.life) e.life.update(t, stage.camera, stage.renderer);
    else e.whales.forEach((w, i) => { const a = t * 0.18 + i * 2.1, r = 30 + i * 9; w.position.set(Math.cos(a) * r, 7 + Math.sin(t * 0.9 + i) * 0.6, Math.sin(a) * r); w.rotation.y = -a; K.swim(w, t, i); }); } };
}
