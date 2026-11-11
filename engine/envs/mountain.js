// Bối cảnh 'mountain' (preset ánh sáng mặc định: sky). Sửa bối cảnh này CHỈ trong file này.
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
  // Đỉnh chính: lưới noise có mặt bằng tuyết (nhà ở y=0), sườn đá + tuyết theo độ dốc (engine/peaks.js)
  const summit = createSummit(THREE, { seed: 11, plateauR: 56, radius: 150, depth: 150 }); g.add(summit.object); 
  // Dãy núi xa nhiều lớp; sương (fog 'sky') làm nhạt dần theo khoảng cách
  g.add(createRange(THREE, { seed: 21, count: 12, rMin: 420, rMax: 780, base: -50, hMin: 90, hMax: 170, hFar: 60 }).object);
  // Đá rải mép mặt bằng — chỉ phía sau/hai bên, không chắn khung hiên (+z)
  for (let i = 0; i < 6; i++) { const a = Math.PI * (1.15 + (i / 5) * 0.95) + (hash(i, 9) - 0.5) * 0.2, r = 53 + hash(i, 2) * 3;
    const rk = pf(i % 2 ? 'rock-outcrop-158ac3' : 'boulder-field-cluster-08e364', 0.5 + hash(i, 1) * 0.4) || K.rock(2.2 + hash(i, 1) * 2.6, '#6b5f58', i + 40);
    place(g, rk, Math.cos(a) * r, -0.8, Math.sin(a) * r, hash(i, 3) * 6); }
  // Biển mây: 2 lớp shader fbm (lớp dưới đặc, tối hơn → lỗ hổng thấy mây sâu) + cụm bông sprite
  e.seaLo = createCloudSea(THREE, { y: -36, cover: 0.3, soft: 0.25, shade: '#9fb3cd', lit: '#e6eef8', scale: 0.02, drift: [0.6, 0.2], seed: 5, name: 'cloud_sea_low', solidFar: 1, minAlpha: 1, relief: 4, fogNear: 400, fogFar: 1800 });
  e.sea = createCloudSea(THREE, { y: -20, cover: 0.33, hug: 0.2, bump: 22, hugR: [45, 160], relief: 5, soft: 0.14, scale: 0.032, drift: [1.4, 0.5], seed: 3, shade: '#adc0d8', fogNear: 400, fogFar: 1800 });
  g.add(e.seaLo.object, e.sea.object);
  const puffs = [];
  for (let i = 0; i < 44; i++) {   // vành mây ôm chân đỉnh: đặt ngay ngoài sườn núi ở độ cao của cụm → che đường cắt mây/đá
    const a = (i / 44) * Math.PI * 2 + hash(i, 4) * 0.3, y = -19 + hash(i, 7) * 7, s = 14 + hash(i, 6) * 16;
    let r = 30; while (r < 170 && summit.heightAt(Math.cos(a) * r, Math.sin(a) * r) > y - s * 0.15) r += 2;
    r += s * 0.25 + hash(i, 5) * 10;
    puffs.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, s, seed: i, k: 0.4 }); }
  for (let i = 0; i < 90; i++) { const a = hash(i, 14) * Math.PI * 2, r = 130 + Math.pow(hash(i, 15), 0.8) * 650;   // sóng mây xa
    const x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.hypot(x - 77, z - 92) < 110) continue;   // chừa chỗ camera s058
    puffs.push({ x, y: -21 + hash(i, 17) * 7, z, s: 34 + hash(i, 16) * 60 + r * 0.05, seed: i + 3 }); }
  for (let i = 0; i < 16; i++) {   // bông tiền cảnh dưới khung s058 (giữa đỉnh và camera, thấp hơn mép mặt bằng)
    const a = 0.87 + (hash(i, 21) - 0.5) * 0.9, r = 52 + hash(i, 22) * 45, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - 77, z - 92) < 55) continue;
    puffs.push({ x, y: -22 + hash(i, 23) * 5, z, s: 16 + hash(i, 24) * 14, seed: i + 7, k: 0.5 }); }
  e.puffs = createCloudPuffs(THREE, { list: puffs, drift: [1.4, 0.5], seed: 2 }); g.add(e.puffs.object);
  const sd = new THREE.Vector3();
  return { update(t, ctx = {}) {
    const tl = t - 68;   // trôi quanh mốc giữa cảnh → bố cục giữ nguyên, chỉ chuyển động theo t
    // hướng nắng lấy từ preset (KHÔNG đọc stage.sun: use() đặt nắng SAU update → sẽ là nắng của khung trước → mất tất định)
    sd.fromArray(ctx.lightOverride?.dir || LIGHTS[ctx.light || e.light].dir);
    e.sea.update(tl, sd); e.seaLo.update(tl, sd); e.puffs.update(tl);
  } };
}
