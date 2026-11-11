// Bối cảnh 'antarctica' (preset ánh sáng mặc định: snow). Sửa bối cảnh này CHỈ trong file này.
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
  g.add(bumpy(900, 900, 70, '#f3f8fb', 6, 0.4, 'snowfield', 0.03));
  g.add(snowRanges(THREE, { day: true, seed: 3 }));
  // Hòm thư KHÔNG còn nằm trong env: nó là prop 'mailboxTown' gắn vào hiên nhà (parent:'house') trong shots.js; cảnh không có nhà (s022/24/25) đặt prop ở toạ độ thế giới.
  // Đàn cánh cụt: NP con, kích cỡ khác nhau (clone penguin-base). Vị trí tụ tập = lưới lệch ở trước nhà.
  const NP = 18, PEN = [];
  for (let i = 0; i < NP; i++) {
    const sz = 0.72 + hash(i, 41) * 0.5;
    const o = place(g, pf('penguin-base', 1.7) || K.penguin(), 0, 0, 0, 0, sz);
    const col = i % 6, row = Math.floor(i / 6);
    PEN.push({ o, sz, hx: 14 + col * 3.1 + (hash(i, 42) - 0.5) * 1.6 + (row % 2) * 1.2, hz: 27 + row * 3.6 + (hash(i, 43) - 0.5) * 1.8, face: hash(i, 44) * 1.4 - 0.2, ph: hash(i, 45) * 6, lag: hash(i, 46) * 0.9 });
  }
  e.penguins = PEN.map((p) => p.o);
  for (let i = 0; i < 14; i++) { const o = pf(['boulder-field-cluster-08e364', 'rock-outcrop-158ac3', 'dwarf-pine-mat-faee77'][i % 3], 1.4 + hash(i, 9)); if (o) place(g, o, (hash(i, 1) - 0.5) * 220, 0, -30 - hash(i, 2) * 120 + (i % 3 === 0 ? 100 : 0), hash(i, 3) * 6); }
  e.snow = fxSnow(THREE, { count: 900, area: [120, 60, 120], speed: 3, size: 0.45, wind: [3, 0] }); g.add(e.snow.obj);
  // Dòng thời gian cánh cụt: t<TA đứng thành đàn (ảnh bưu thiếp, cảnh bố); TA..PT0 ẩn; PT0 đi vào từ TRÁI (s047), tụ trước nhà (s048),
  // TL (sau s049, ngoài khung) quay đi bước ra bên phải rồi biến mất → s081/s082 KHÔNG còn cánh cụt đứng chết.
  const TA = 50, PT0 = 55.7, PV = 5, TL = 60.5, TEND = TL + 7;
  return { ground: { kind: 'snow', y: 0.1 }, update(t, ctx) { e.snow.update(t, ctx.focus || [0, 0, 0]); PEN.forEach((P, i) => {
    const p = P.o, tx = P.hx, x0 = tx - 9 - (i % 6) * 1.1 - Math.floor(i / 6) * 0.6, t0 = PT0 + P.lag;
    let x = tx, ry = Math.PI / 2 - P.face, walking = false, vis = true;
    if (t >= TA && t < PT0) vis = false;
    else if (t >= t0 + 0 && t < TL) {
      x = Math.min(tx, x0 + PV * (t - t0)); walking = x < tx - 1e-3;
      const turn = Math.min(1, Math.max(0, (t - (t0 + (tx - x0) / PV)) / 0.7)), ease = turn * turn * (3 - 2 * turn);
      ry = Math.PI / 2 - ease * P.face;
    } else if (t >= TL) {
      const u = t - TL - P.lag; x = tx + PV * 0.8 * Math.max(0, u); walking = u > 0;
      const turn = Math.min(1, Math.max(0, u / 0.7)); ry = Math.PI / 2 - (1 - turn * turn * (3 - 2 * turn)) * P.face;
      if (t > TEND) vis = false;
    } else if (t < TA) { x = tx; }
    if (t >= PT0 && t < t0) { x = x0; walking = true; ry = Math.PI / 2; }
    p.visible = vis;
    p.position.set(x, 0, P.hz); p.rotation.y = ry;
    const amp = walking ? 1 : 0.18, sp = walking ? 7 : 2.2, tt = t + P.ph;
    if (p.userData.pf) { p.rotation.z = Math.sin(tt * sp) * 0.12 * amp; p.position.y = Math.abs(Math.sin(tt * sp)) * 0.15 * amp * P.sz; } else K.waddle(p, walking ? tt : 0.1); }); } };
}
