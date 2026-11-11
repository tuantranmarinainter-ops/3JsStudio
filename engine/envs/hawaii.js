// Bối cảnh 'hawaii' (preset ánh sáng mặc định: beach). Sửa bối cảnh này CHỈ trong file này.
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
import { createCoconutPalm } from '../coconut.js';

export default function build(g, e, H) {
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  // cát rộng tới tận chân trời (góp ý 2026-11-11 #3: hở mép cát ở s011); mép biển vẫn ở z≈70
  const sand = plane(2400, 1200, mat('#f1d79a'), 0, 'sand'); sand.position.z = 70 - 600; g.add(sand);
  e.sea = makeSea(g, { preset: 'tropical', y: 1.5, amp: 0.6, size: 1400, center: [0, -380], shore: { line: [0, 1, 54, 5] } }); g.children[g.children.length - 1].position.z = 380;
  // cua khối chạy trên cát ướt gần mép sóng (nhìn từ trên cao)
  e.crabs = createCrabs(THREE, [
    { a: [-16, 44], b: [-4, 48], speed: 5, phase: 0, s: 2.4 }, { a: [2, 49], b: [14, 45], speed: 4.5, phase: 1.3, s: 2.2 },
    { a: [16, 40], b: [26, 44], speed: 5, phase: 0.7, s: 2.4 }, { a: [-22, 36], b: [-10, 38], speed: 4.2, phase: 2.1, s: 2.2 },
    { a: [8, 34], b: [-4, 32], speed: 4.6, phase: 0.4, s: 2.2 }, { a: [22, 50], b: [34, 47], speed: 4.4, phase: 1.9, s: 2.3 },
    { a: [-8, 52], b: [4, 51], speed: 4, phase: 2.6, s: 2.2 },
  ]);
  g.add(e.crabs.group);
  for (let i = 0; i < 14; i++) place(g, createCoconutPalm(THREE, { h: 16 + hash(i, 5) * 8, lean: 0.14 + hash(i, 6) * 0.2, seed: i + 11 }), -120 + i * 18 + hash(i, 1) * 8, 0, -30 - hash(i, 2) * 50, 0);
  // thêm nhiều dừa phía trong đảo (góp ý #3): rải lệch theo hash, tránh khu nhà đứng (|x|<30, z>-40)
  for (let i = 0; i < 90; i++) {
    const x = -420 + hash(i, 21) * 840, z = -14 - hash(i, 22) * 320;
    if (Math.abs(x) < 48 && z > -110) continue;
    place(g, createCoconutPalm(THREE, { h: 15 + hash(i, 23) * 10, lean: 0.1 + hash(i, 24) * 0.25, seed: i + 40 }), x, 0, z, hash(i, 25) * 6.28);
  }
  for (let i = 0; i < 6; i++) place(g, K.rock(2 + hash(i, 9) * 2, '#9a8a7a', i), -60 + i * 25, 0, 40 + hash(i, 4) * 10);
  place(g, K.cloud(2.2), -80, 90, -260); place(g, K.cloud(1.8), 90, 110, -300);
  return { update(t) { e.sea(t); e.crabs.update(t); } };
}
