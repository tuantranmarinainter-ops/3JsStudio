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
import { createWind } from '../wind.js';
import { createFarwoods } from '../farwoods.js';
import { createBackdrop } from '../backdrop.js';

export default function build(g, e, H) {
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  // --- chất liệu đất/cỏ/nhựa (góp ý 2026-11-12 #1 #4): texture nhiễu lát được, tất định (hash), có bumpMap; hố đất mép gồ ghề + cục đất ---
  const noiseCanvas = (seed, contrast, cells, speck = 0) => {
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const cx = cv.getContext('2d'), img = cx.createImageData(S, S);
    const lat = (i, j, c, o) => hash((((i % c) + c) % c) * 131 + (((j % c) + c) % c), seed + o);
    const vn = (x, y, c, o) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      return (lat(i, j, c, o) * (1 - u) + lat(i + 1, j, c, o) * u) * (1 - v) + (lat(i, j + 1, c, o) * (1 - u) + lat(i + 1, j + 1, c, o) * u) * v; };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n = 0.5 * vn(x / S * cells, y / S * cells, cells, 0) + 0.3 * vn(x / S * cells * 2, y / S * cells * 2, cells * 2, 1) + 0.2 * vn(x / S * cells * 4, y / S * cells * 4, cells * 4, 2);
      let k = 1 + (n - 0.5) * contrast; if (speck && hash(y * S + x, seed + 9) > 1 - speck) k *= 0.6;
      const o = (y * S + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.min(255, 235 * k); img.data[o + 3] = 255;
    }
    cx.putImageData(img, 0, 0); return cv;
  };
  const tiled = (cv, rx, ry = rx, srgb = true) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const grassCv = noiseCanvas(11, 0.55, 8, 0.03), asphCv = noiseCanvas(12, 0.4, 10, 0.06), dirtCv = noiseCanvas(13, 0.9, 8, 0.05);
  g.add(plane(900, 900, mat('#6aa957', { map: tiled(grassCv, 90), bumpMap: tiled(grassCv, 90, 90, false), bumpScale: 0.6 }), 0, 'lawn'));
  const road = plane(900, 18, mat('#464a54', { roughness: 0.9, map: tiled(asphCv, 90, 2), bumpMap: tiled(asphCv, 90, 2, false), bumpScale: 0.4 }), 0.05, 'road'); road.position.z = 36; g.add(road);
  for (const z of [26, 46]) { const sw = plane(900, 3, mat('#b9b6ad'), 0.08, 'sidewalk'); sw.position.z = z; g.add(sw); }
  for (let i = -40; i < 40; i++) { const s = plane(5, 0.5, mat('#f4f1e1'), 0.1, 'stripe'); s.position.set(i * 11, 0.1, 36); g.add(s); }
  for (const x of [-60, 70]) for (let i = 0; i < 7; i++) { const s = plane(1.4, 14, mat('#f4f1e1'), 0.1, 'crosswalk'); s.position.set(x + i * 2.6, 0.11, 36); g.add(s); }
  // blob: lưới cực (vòng × cung), biên lệch theo nhiễu 1D có seed (mép gồ ghề, không vuông); hf(u,θ)→cao độ, cf(u,θ,out)→màu đỉnh
  const blob = (rx, rz, seed, name, hf, cf, rings = 14, segs = 72) => {
    const pos = [], col = [], uv = [], idx = [], c = new THREE.Color();
    const edge = (a) => { let r = 1; for (let o = 1; o <= 4; o++) r += (hash(o * 7, seed) - 0.5) * 0.5 / o * Math.sin(a * (o * 2 + 1) + hash(o, seed + 3) * 6.28) + (hash(o * 5, seed + 1) - 0.5) * 0.16 / o * Math.sin(a * (o * 5 + 3) + hash(o, seed + 5) * 6.28); return r; };
    for (let ri = 0; ri <= rings; ri++) for (let si = 0; si < segs; si++) {
      const u = ri / rings, a = si / segs * Math.PI * 2, R = edge(a) * Math.pow(u, 0.9); const x = Math.cos(a) * rx * R, z = Math.sin(a) * rz * R;
      pos.push(x, hf(u, a), z); cf(u, a, c); col.push(c.r, c.g, c.b); uv.push(x / 9, z / 9);
    }
    for (let ri = 0; ri < rings; ri++) for (let si = 0; si < segs; si++) { const a = ri * segs + si, b = ri * segs + (si + 1) % segs, d = (ri + 1) * segs + si, e = (ri + 1) * segs + (si + 1) % segs; idx.push(a, b, d, b, e, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true, emissive: '#2a1a0e', emissiveMap: tiled(dirtCv, 1), map: tiled(dirtCv, 1), bumpMap: tiled(dirtCv, 1, 1, false), bumpScale: 1.6, roughness: 0.96 })); m.name = name; m.receiveShadow = true; m.castShadow = true; return { m, edge };
  };
  const clods = (cnt, rx, rz, u0, u1, seed, edge, s0, s1, base) => {   // cục đất vỡ rải quanh mép (InstancedMesh, tất định)
    const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat('#ffffff', { flatShading: true, roughness: 1 }), cnt); const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
    for (let i = 0; i < cnt; i++) {
      const a = hash(i, seed) * 6.283, u = u0 + hash(i, seed + 1) * (u1 - u0), R = edge(a) * u, s = s0 + Math.pow(hash(i, seed + 2), 2.2) * (s1 - s0);
      e.set(hash(i, seed + 3) * 6, hash(i, seed + 4) * 6, hash(i, seed + 5) * 6); q.setFromEuler(e);
      mx.compose(new THREE.Vector3(Math.cos(a) * rx * R, s * 0.3, Math.sin(a) * rz * R), q, new THREE.Vector3(s * (1 + hash(i, seed + 6) * 0.5), s * 0.7, s * (1 + hash(i, seed + 7) * 0.4))); im.setMatrixAt(i, mx);
      im.setColorAt(i, cc.set(base).multiplyScalar(0.6 + hash(i, seed + 8) * 0.7));
    }
    im.name = 'dirt_clods'; im.castShadow = true; im.receiveShadow = true; return im;
  };
  // bãi đất trống: biên lượn, rìa chuyển dần sang cỏ (màu đỉnh xanh nâu ở ngoài rìa), nhấp nhô nhẹ
  const tmpC = new THREE.Color(), mix = (c, a, b, t) => c.set(a).lerp(tmpC.set(b), Math.min(1, Math.max(0, t)));
  const dirtB = blob(25, 20, 41, 'dirt_lot', (u, a) => 0.06 + 0.04 * Math.sin(a * 3 + u * 5) * u, (u, a, c) => { mix(c, '#b08455', '#5d6f38', (u - 0.88) / 0.12); c.multiplyScalar(0.85 + 0.3 * hash(Math.floor(u * 9) * 31 + Math.floor(a * 8), 3)); });
  const dirt = new THREE.Group(); dirt.name = 'dirt_lot'; dirt.add(dirtB.m); dirt.add(clods(40, 25, 20, 0.6, 1.0, 51, dirtB.edge, 0.25, 0.8, '#8a6642')); dirt.visible = false; g.add(dirt);
  // hố: sàn tối ẩm (y 0.07), thành hố dốc đi lên tới vành đất đùn (cao ~1.3) rồi thoải ra ngoài; vành xen cục đất to
  const holeH = (u) => { if (u < 0.62) return 0.2; if (u < 0.86) { const w = (u - 0.62) / 0.24; return 0.2 + 1.15 * (0.5 - 0.5 * Math.cos(w * Math.PI)); } return 0.07 + 1.28 * Math.max(0, 1 - (u - 0.86) / 0.14); };
  const holeB = blob(13, 10, 61, 'lot_hole_mesh', holeH, (u, a, c) => {
    if (u < 0.62) c.set('#4a3524').multiplyScalar(0.8 + 0.5 * hash(Math.floor(u * 9) * 17 + Math.floor(a * 7), 8));
    else if (u < 0.86) mix(c, '#3a2a1c', '#6a4c32', Math.pow((u - 0.62) / 0.24, 0.8));
    else mix(c, '#9a7448', '#5d6f38', Math.pow((u - 0.86) / 0.14, 2));
  }, 16, 80);
  const hole = new THREE.Group(); hole.name = 'lot_hole'; hole.add(holeB.m); hole.add(clods(70, 13, 10, 0.78, 1.1, 71, holeB.edge, 0.3, 1.1, '#8a6642')); hole.visible = false; g.add(hole);
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
  // rừng xa = thẻ ảnh vẽ quay về camera (engine/farwoods.js, 1 program), chừa con đường; ngọn lay theo gió chung; ô bật/tắt 'farwoods'
  const wind = createWind(THREE, { dir: [1, 0.2], speed: 3, gust: 0.6, seed: 8, gustSize: 40 });
  const woods = createFarwoods(THREE, { wind, seed: 8, center: [0, 0], ring: [150, 400], count: 2600, size: [10, 22],
    kinds: { leafy: 1, pine: 0.8 }, avoid: (x, z) => Math.abs(z - 36) < 16, clumps: true });
  woods.mesh.onBeforeRender = () => { woods.lightFrom(scene.children.find((o) => o.isDirectionalLight && o.name === 'sun'), scene.children.find((o) => o.isHemisphereLight)); woods.fogFrom(scene.fog); };
  g.add(woods.group);
  // núi xa vẽ 1 lần thành dải tranh quấn chân trời (engine/backdrop.js, 1 program); màu theo nắng/sương của shot; ô bật/tắt 'backdrop'
  const hills = createBackdrop(THREE, { seed: 8, radius: 900, base: -30, height: 340, snow: 0.6 });
  hills.mesh.onBeforeRender = () => { hills.lightFrom(scene.children.find((o) => o.isDirectionalLight && o.name === 'sun'), scene.children.find((o) => o.isHemisphereLight)); hills.fogFrom(scene.fog); };
  g.add(hills.group);
  // ghế ngồi hiên (s030: bé ngồi chờ thư). Shot gọi env.seat.userData.want = true + đặt position/rotation (toạ độ thế giới) trong fn mỗi khung;
  // update() đọc cờ rồi xoá → mọi shot khác không thấy ghế (hàm thuần của shot, tua tới/lui như nhau)
  const seat = K.chair(); seat.name = 'porch_chair'; seat.scale.setScalar(1.8); seat.visible = false; g.add(seat);
  return { setNight(n) { nbWins.forEach((w) => { w.emissiveIntensity = n * 1.4; }); moon.visible = n > 0.5; }, dirt, hole, seat,
    update(t, ctx) { woods.group.visible = globalThis.__autoFx?.farwoods !== false; if (woods.group.visible) woods.update(t, stage.camera); hills.group.visible = globalThis.__autoFx?.backdrop !== false; if (hills.group.visible) hills.update(t, stage.camera); const L = LIGHTS[ctx.light || 'night']; life.update(t, !L.night); seat.visible = !!seat.userData.want; seat.userData.want = false; } };
}
