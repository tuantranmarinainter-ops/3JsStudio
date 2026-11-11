// Bối cảnh 'town' (preset ánh sáng mặc định: night). Sửa bối cảnh này CHỈ trong file này.
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
  g.add(plane(900, 900, mat('#5f9d4e'), 0, 'lawn'));
  const road = plane(900, 18, mat('#3d4049', { roughness: 0.9 }), 0.05, 'road'); road.position.z = 36; g.add(road);
  for (const z of [26, 46]) { const sw = plane(900, 3, mat('#b9b6ad'), 0.08, 'sidewalk'); sw.position.z = z; g.add(sw); }
  for (let i = -40; i < 40; i++) { const s = plane(5, 0.5, mat('#f4f1e1'), 0.1, 'stripe'); s.position.set(i * 11, 0.1, 36); g.add(s); }
  for (const x of [-60, 70]) for (let i = 0; i < 7; i++) { const s = plane(1.4, 14, mat('#f4f1e1'), 0.1, 'crosswalk'); s.position.set(x + i * 2.6, 0.11, 36); g.add(s); }
  const dirt = plane(36, 30, mat('#5a4330'), 0.06, 'dirt_lot'); dirt.name = 'dirt_lot'; dirt.visible = false; g.add(dirt);
  const hole = plane(26, 20, mat('#2e2219'), 0.07, 'lot_hole'); hole.visible = false; g.add(hole);
  const cols = [['#e3d5b8', '#5b6f8f'], ['#9fc5e8', '#3b4a6b'], ['#f2c6a0', '#7a3b2e'], ['#c8e0b0', '#4a5a3a'], ['#f4f1ea', '#2f6f6a'], ['#e8b4b8', '#5b3b4b']];
  let k = 0;
  for (const x of [-120, 120, 178, -178, 236, -236]) { const [c, r] = cols[k++ % cols.length]; const kh = kenneyHouse(k * 3); if (kh) place(g, kh, x, 0, 0, 0); else { const h = place(g, nbHouse(c, r, k), x, 0, 0, 0, 1.1); nbWins.push(h.userData.win); } }
  for (const x of [-150, -90, -30, 30, 90, 150, 210, -210]) { const [c, r] = cols[k++ % cols.length]; const kh = kenneyHouse(k * 3 + 1); if (kh) place(g, kh, x, 0, 125, Math.PI); else { const h = place(g, nbHouse(c, r, k), x, 0, 125, Math.PI, 1.1); nbWins.push(h.userData.win); } }
  // --- mạng đường: phố sau song song (giữa các dãy nhà) + phố cắt ngang (theo Z) nối vào đường chính → nhìn từ trên ra thị trấn ---
  const asph = mat('#44474f', { roughness: 0.9 }), curb = mat('#b9b6ad'), paint = mat('#f4f1e1'), drive = mat('#8d8a82');
  const BACK_ST = [-36, -102, 156];                              // phố sau: z (rộng 10)
  const XN = [-207, -91, 91, 207], XS = [-120, 120];             // phố ngang phía nhà (z<27) / bên kia đường (z>45)
  const nearX = (x, xs, r) => xs.some((c) => Math.abs(x - c) < r);
  for (const z of BACK_ST) {
    const r = plane(900, 10, asph, 0.05, 'back_street'); r.position.z = z; g.add(r);
    for (const s of [-1, 1]) { const c = plane(900, 1.2, curb, 0.075, 'back_curb'); c.position.z = z + s * 5.6; g.add(c); }
    for (let i = -40; i < 40; i++) { const d = plane(4, 0.4, paint, 0.1, 'back_stripe'); d.position.set(i * 11 + 5, 0.1, z); g.add(d); }
  }
  const crossSt = (x, z0, z1) => {
    const len = z1 - z0, cz = (z0 + z1) / 2;
    const r = plane(12, len, asph, 0.09, 'cross_street'); r.position.set(x, 0.09, cz); g.add(r);
    for (const s of [-1, 1]) { const c = plane(1.2, len, curb, 0.092, 'cross_curb'); c.position.set(x + s * 6.6, 0.092, cz); g.add(c); }
    for (let zz = z0 + 4; zz < z1 - 3; zz += 11) { const d = plane(0.4, 4, paint, 0.11, 'cross_stripe'); d.position.set(x, 0.11, zz); g.add(d); }
    // vạch qua đường ở miệng phố ngang
    const zc = z1 > 30 ? z0 + 2.5 : z1 - 2.5;
    for (let i = -2; i <= 2; i++) { const s = plane(1.3, 4, paint, 0.112, 'crosswalk'); s.position.set(x + i * 2.4, 0.112, zc); g.add(s); }
  };
  for (const x of XN) crossSt(x, -170, 27);
  for (const x of XS) crossSt(x, 45, 215);
  // --- khu dân cư dày quanh nhà gia đình: hàng gần, hàng sau, hàng bên kia đường; chừa hành lang |x|<30 (chân nhà) + đường ---
  const TYPES = 'abcdefghijklmnopqrstu'.split('').map((c) => `city-kit-suburban/building-type-${c}`);
  const dense = (x, z, ry, w, sd) => { const kh = pickFit(TYPES, sd, w, { axis: 'xz' }); if (kh) place(g, kh, x, 0, z, ry); return kh; };
  const yard = (x, z, ry, sd) => {   // sân trước: lối xe + hàng rào + bụi
    const dz = Math.cos(ry) > 0 ? 1 : -1;
    const dw = plane(5, 12, drive, 0.07, 'driveway'); dw.position.set(x + 8, 0.07, z + dz * 18); g.add(dw);
    place(g, K.fence(14), x - 5, 0, z + dz * 14, 0);
    place(g, K.bush(2 + hash(sd, 1)), x - 10, 0, z + dz * 11);
  };
  // hàng gần (z≈0) hai bên nhà
  [[-46, 24, 1], [46, 22, 2], [-74, 20, 3], [74, 21, 4]].forEach(([x, w, sd]) => { const ry = (hash(sd, 5) - 0.5) * 0.12; dense(x, hash(sd, 6) * 4 - 2, ry, w, sd * 11); yard(x, 0, 0, sd); });
  // lớp thứ hai sau nhà gia đình (giữa nhà và phố sau): nhà nhỏ hai bên, bỏ trục chính
  [[-44, -20, 31], [44, -20, 32], [-76, -18, 33], [76, -18, 34]].forEach(([x, z, sd]) => { dense(x, z, (hash(sd, 7) - 0.5) * 0.3, 17 + hash(sd, 8) * 3, sd); });
  // hàng sau phố sau: xen kẽ giữa các nhà cũ
  for (const [z, x0, sd] of [[-68, -260, 61], [-136, -234, 71]])
    for (let i = 0, x = x0; x <= -x0; i++, x += 52) {
      if (nearX(x, XN, 20)) continue;
      dense(x + (hash(i, sd) - 0.5) * 6, z + (hash(i, sd + 1) - 0.5) * 5, (hash(i, sd + 2) - 0.5) * 0.3, 18 + hash(i, sd + 3) * 4, sd + i * 7);
    }
  // hàng bên kia đường (z≈78): quay mặt ra đường, tránh trục ngôi nhà (|x|<58) để không che tầm nhìn
  for (let i = 0, x = -250; x <= 250; i++, x += 33) {
    if ((x > -60 && x < 200) || nearX(x, XS, 17)) continue;
    dense(x + (hash(i, 91) - 0.5) * 5, 96 + (hash(i, 92) - 0.5) * 6, Math.PI + (hash(i, 93) - 0.5) * 0.12, 19 + hash(i, 94) * 5, 300 + i * 3);
    place(g, K.fence(14), x - 4, 0, 80, 0);
  }
  // lối đi từ cầu thang nhà gia đình ra vỉa hè
  { const w = plane(5.5, 4.6, curb, 0.07, 'front_walk'); w.position.set(0, 0.07, 22.6); g.add(w); }
  // --- dãy nhà phía sau (2 hàng sau nhà gia đình, 1 hàng sau dãy bên kia đường) → thị trấn dày, có chiều sâu ---
  for (const [z, ry, x0, step, sd] of [[-68, 0, -286, 52, 50], [-136, 0, -260, 52, 80], [190, Math.PI, -264, 54, 110],
      [-200, 0, -312, 50, 130], [-262, 0, -338, 50, 150], [-324, 0, -364, 52, 170]])   // 3 hàng xa: góp ý 2026-11-11 #5 (s018 trống góc trên)
    for (let i = 0, x = x0; x <= -x0; i++, x += step) {
      const xs = z > 0 ? XS : XN;
      const hx = x + (hash(i, sd + 1) - 0.5) * 8;
      if (!nearX(hx, xs, 23)) {
        const kh = pickFit('abcdefghijklmnopqrstu'.split('').map((c) => `city-kit-suburban/building-type-${c}`), sd + i * 5, 26 + hash(i, sd) * 6, { axis: 'xz' });
        if (kh) place(g, kh, hx, 0, z + (hash(i, sd + 2) - 0.5) * 6, ry + (hash(i, sd + 3) - 0.5) * 0.16);
        // lối xe nối từ nhà ra phố sau trước mặt (hàng xa z<-150 không có phố sau → bỏ)
        if (z > -150) {
        const st = ry ? 156 : (z === -68 ? -36 : -102), dz = ry ? 1 : -1;   // dz: hướng từ phố vào nhà
        const z0 = st + dz * 5, z1 = z - dz * 12, dw = plane(7, Math.abs(z1 - z0), drive, 0.07, 'driveway');
        dw.position.set(hx + 9, 0.07, (z0 + z1) / 2); g.add(dw);
        }
      }
      const tx = x + step / 2;
      if (hash(i, sd + 4) < 0.6 && !nearX(tx, xs, 11)) place(g, K.roundTree(9 + hash(i, sd + 5) * 5), tx, 0, z + (ry ? -8 : 10));
    }
  // --- lối xe + xe đậu ở khe giữa các nhà; xe chạy + người đi bộ ban ngày (engine/townlife.js) ---
  const parked = [];
  for (const x of [-149, 149]) parked.push([x + (hash(x, 1) - 0.5) * 3, 10, Math.PI * (hash(x, 2) < 0.5 ? 0 : 1)]);
  for (const x of [-240, -180, -60, 0, 180, 240]) parked.push([x + (hash(x, 3) - 0.5) * 3, 104, Math.PI * (hash(x, 4) < 0.5 ? 0 : 1)]);
  for (const [x, z] of parked) { const dw = plane(9, 18, drive, 0.07, 'driveway'); dw.position.set(x, 0.07, z + (z < 50 ? 6 : -6)); g.add(dw); }
  // xe đậu dọc phố sau (bên lề)
  for (let i = 0; i < 10; i++) { const z = BACK_ST[i % 3], x = -230 + i * 49 + hash(i, 21) * 10; if (!nearX(x, z > 0 ? XS : XN, 14)) parked.push([x, z + (i % 2 ? 2.4 : -2.4), Math.PI / 2 * (i % 2 ? 1 : -1)]); }
  const life = townLife(THREE, K, { parked }); g.add(life.group);
  // đèn đường + cây vỉa hè; chừa sân nhà gia đình (|x|<40, chỗ chân nhà đặt xuống) và miệng phố ngang → không che mặt tiền nhà
  for (let i = -10; i <= 10; i++) {
    let lx = i * 40 + 12; if (i === 0) lx = -32; if (nearX(lx, XN, 10)) lx += 14;
    place(g, K.streetLamp(), lx, 0, 27.5, Math.PI / 2);
    const tx = i * 40 - 6;
    if (Math.abs(tx) > 40 && !nearX(tx, XN, 10)) place(g, K.roundTree(10 + hash(i, 7) * 4, ['#3f8f3f', '#4caf50', '#2e7d32'][(i + 30) % 3]), tx, 0, 22 - hash(i, 3) * 6);
  }
  // cây sân nhà gia đình: sau nhà, ngoài vùng chân nhà dang ra
  place(g, K.roundTree(11), -30, 0, -22); place(g, K.roundTree(10), 31, 0, -24);
  for (const x of [-26, 26]) place(g, K.fence(16), x, 0, 22);
  place(g, K.bush(2.5), -18, 0, 16); place(g, K.bush(2.2), 19, 0, 17);
  for (let i = 0; i < 24; i++) { const f = pickFit(['nature-kit/flower_redA', 'nature-kit/flower_yellowB', 'nature-kit/flower_purpleA'], i, 1.2); if (f) place(g, f, -24 + (i % 12) * 4.2 + hash(i, 2), 0, 18 + Math.floor(i / 12) * 2.5, hash(i, 3) * 6); }
  const moon = place(g, K.moon(34), -170, 170, -420); moon.name = 'moon_town';
  return { setNight(n) { nbWins.forEach((w) => { w.emissiveIntensity = n * 1.4; }); moon.visible = n > 0.5; }, dirt, hole,
    update(t, ctx) { const L = LIGHTS[ctx.light || 'night']; life.update(t, !L.night); } };
}
