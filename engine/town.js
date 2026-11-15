// town.js — Thị trấn dựng từ Kenney City Kit (Roads + Suburban, CC0) theo SEED: lưới đường, nhà, cây, đèn, quảng trường.
// Cùng seed → cùng thị trấn (không Math.random). Trả về các ĐỊA ĐIỂM có tên để shot tham chiếu (`at: 'home'`).
//
//   import { buildTown, TOWN_ASSETS, registerTownEnv } from '/engine/town.js';
//   await A.load(TOWN_ASSETS);                                // A = createAssetLib(THREE) — tải hết GLB TRƯỚC khi seek
//   const town = buildTown(THREE, A, { seed: 7, blocks: 3 });
//   registerTownEnv(envs, stage, town, { name: 'kenneyTown', light: 'day' });   // thành 1 env của engine/envs.js
//   town.places → { square, home, shop, street, crossroad, park, yard, house1… } mỗi cái { pos:[x,0,z], ry }
//
// Quy ước địa điểm: diễn viên đứng ở `pos` nhìn theo `ry`; camera loại shot đứng phía trước (hướng ry) nhìn lại.
//   home/shop/houseN: sân trước nhà, lưng quay về nhà, mặt nhìn ra đường.   street: giữa phố chạy theo trục X (ry 0).
//   square: giữa quảng trường lát gạch.   crossroad: ngã tư giữa thị trấn.   park: bãi cỏ nhiều cây.
// Đơn vị: 1 ô đường Kenney = `tile` stud (mặc định 16). Nhân vật R15 cao ~5.2 stud.
import { rng } from './stage.js';
import { ganMau, bam } from './town-styles.js';
import { createWind } from './wind.js';
import { createFarwoods } from './farwoods.js';
import { createBackdrop } from './backdrop.js';
import { createCloudShade } from './cloudshade.js';

// ---- tô màu nhà Kenney theo bảng kiểu (engine/town-styles.js; docs/nha-thi-tran.md). Chỉ chạy khi khai kiểu: EPISODE.town.kieu hoặc ?nha=<kiểu> ----
// GLB nhà: 1 mesh + 1 vật liệu 'colormap'; ảnh 512² chia ô 64×128 (nửa trái phẳng, nửa phải dốc sáng→tối). Ô (3,2)=tường, (0,1)=mái xanh, (1,2)=cửa,
// (0,2)=xám đá: đế (chạm đất, giữ), viền cửa sổ (cụm nhỏ), mái/tầng trên kiểu phẳng (cụm lớn). Ô khác (kính, bụi cây, lối đi) giữ nguyên.
// Vai trò theo ĐỈNH → dời UV sang ô trắng (3,2) (giữ độ dốc sáng) + màu đỉnh = màu đích. Hình học dùng chung, chỉ thêm 1 thuộc tính màu mỗi nhà; 1 vật liệu chung.
const VT = { KHONG: 0, TUONG: 1, MAI: 2, VIEN: 3, CUA: 4 };
const phanTich = new WeakMap();
function phanTichHinh(geo) {
  if (phanTich.has(geo)) return phanTich.get(geo);
  const pos = geo.attributes.position, uv = geo.attributes.uv, idx = geo.index, nT = idx.count / 3;
  geo.computeBoundingBox(); const H = geo.boundingBox.max.y - geo.boundingBox.min.y, y0 = geo.boundingBox.min.y;
  const ô = new Array(nT), vt = new Uint8Array(pos.count), dX = new Float32Array(pos.count), dY = new Float32Array(pos.count);
  const tamUV = (t) => { let u = 0, v = 0; for (let k = 0; k < 3; k++) { u += uv.getX(idx.getX(t * 3 + k)); v += uv.getY(idx.getX(t * 3 + k)); } return [Math.floor(u / 3 * 512 / 64), Math.floor(v / 3 * 512 / 128)]; };
  const hàn = new Map(), vid = new Int32Array(pos.count), cha = [];
  for (let i = 0; i < pos.count; i++) { const k = `${Math.round(pos.getX(i) * 1000)},${Math.round(pos.getY(i) * 1000)},${Math.round(pos.getZ(i) * 1000)}`; if (!hàn.has(k)) { hàn.set(k, cha.length); cha.push(cha.length); } vid[i] = hàn.get(k); }
  const goc = (x) => { while (cha[x] !== x) { cha[x] = cha[cha[x]]; x = cha[x]; } return x; };
  for (let t = 0; t < nT; t++) { ô[t] = tamUV(t); if (ô[t][0] === 0 && ô[t][1] === 2) { const a = vid[idx.getX(t * 3)], b = vid[idx.getX(t * 3 + 1)], c = vid[idx.getX(t * 3 + 2)]; cha[goc(a)] = goc(b); cha[goc(b)] = goc(c); } }
  const cum = new Map();   // cụm xám đá: số tam giác + y thấp nhất
  for (let t = 0; t < nT; t++) if (ô[t][0] === 0 && ô[t][1] === 2) {
    const r = goc(vid[idx.getX(t * 3)]), c = cum.get(r) || { n: 0, y: 1e9 }; c.n++;
    for (let k = 0; k < 3; k++) c.y = Math.min(c.y, pos.getY(idx.getX(t * 3 + k))); cum.set(r, c);
  }
  for (let t = 0; t < nT; t++) {
    const [cx, cy] = ô[t]; let r = VT.KHONG;
    if (cx === 3 && cy === 2) r = VT.TUONG; else if (cx === 0 && cy === 1) r = VT.MAI; else if (cx === 1 && cy === 2) r = VT.CUA;
    else if (cx === 0 && cy === 2) { const c = cum.get(goc(vid[idx.getX(t * 3)])); r = c.y < y0 + 0.04 * H ? VT.KHONG : c.n >= 100 ? VT.MAI : VT.VIEN; }
    if (r === VT.KHONG) continue;
    for (let k = 0; k < 3; k++) { const i = idx.getX(t * 3 + k); vt[i] = r; dX[i] = (192 - 64 * cx) / 512; dY[i] = (256 - 128 * cy) / 512; }
  }
  const uvMoi = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { const doi = vt[i] !== VT.KHONG && vt[i] !== VT.TUONG; uvMoi[i * 2] = uv.getX(i) + (doi ? dX[i] : 0); uvMoi[i * 2 + 1] = uv.getY(i) + (doi ? dY[i] : 0); }
  const kq = { vt, uv: uvMoi }; phanTich.set(geo, kq); return kq;
}
const BU = { sat: 1.3, mai: 1.45, vien: 1.2, cua: 1.3 };
const matChung = new WeakMap();
function toMauNha(THREE, nhaGroup, mau) {
  const C = {}; for (const k of ['tuong', 'mai', 'vien', 'cua']) C[k] = new THREE.Color(mau[k]);
  const hsl = {}; C.tuong.getHSL(hsl); C.tuong.setHSL(hsl.h, Math.min(1, hsl.s * BU.sat), hsl.l);   // lớp grade/ánh sáng làm nhạt màu → tăng bão hoà tường
  C.mai.multiplyScalar(BU.mai); C.vien.multiplyScalar(BU.vien); C.cua.multiplyScalar(BU.cua);   // bù độ tối của ô trắng-dốc + ánh sáng cảnh
  const theoVT = [null, C.tuong, C.mai, C.vien, C.cua];
  nhaGroup.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || !o.material.map || !o.geometry.index || !o.geometry.attributes.uv) return;
    const m0 = o.material, mp = m0.map;
    if (mp.repeat.x !== 1 || mp.repeat.y !== 1 || mp.offset.x !== 0 || mp.offset.y !== 0) return;
    const A = phanTichHinh(o.geometry), g0 = o.geometry, n = g0.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const c = theoVT[A.vt[i]]; col[i * 3] = c ? c.r : 1; col[i * 3 + 1] = c ? c.g : 1; col[i * 3 + 2] = c ? c.b : 1; }
    const g = new THREE.BufferGeometry(); g.index = g0.index;
    for (const k of Object.keys(g0.attributes)) g.setAttribute(k, k === 'uv' ? (A.uvAttr || (A.uvAttr = new THREE.BufferAttribute(A.uv, 2))) : g0.attributes[k]);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.boundingBox = g0.boundingBox; g.boundingSphere = g0.boundingSphere;
    if (!matChung.has(m0)) { const m = m0.clone(); m.vertexColors = true; matChung.set(m0, m); }
    o.geometry = g; o.material = matChung.get(m0);
  });
}

const SUB = (n) => `city-kit-suburban/${n}`, RD = (n) => `city-kit-roads/${n}`;
const HOUSES = 'abcdefghijklmnopqrstu'.split('').map((c) => SUB(`building-type-${c}`));
const TREES = [SUB('tree-large'), SUB('tree-small')];
export const TOWN_ASSETS = [
  ...HOUSES, ...TREES,
  SUB('fence-1x4'), SUB('fence-1x3'), SUB('planter'), SUB('driveway-long'), SUB('path-long'), SUB('path-stones-long'),
  RD('road-straight'), RD('road-crossroad'), RD('tile-low'), RD('light-square'), RD('light-square-double'), RD('road-sign-stop'),
  'furniture-kit/bench', 'polyfork/curbside-mailbox-0e0736',
];

export function buildTown(THREE, A, opts = {}) {
  const { seed = 1, blocks = 3, block = 5, tile = 16, houseSize = 28, name = 'town', ground = '#6fae55' } = opts;
  const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const kieu = Q.get('nha') || opts.kieu || null;            // TẮT mặc định: không khai → nhà giữ màu Kenney gốc
  const R = rng(seed * 7919 + 13);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const g = new THREE.Group(); g.name = name;
  const box = new THREE.Box3(), sz = new THREE.Vector3();
  // đặt model đã chuẩn hoá: size = kích thước mục tiêu theo trục (y = cao, xz = cạnh ngang lớn nhất), đáy chạm y=0, tâm ở gốc
  const fit = (id, size, axis = 'y', label) => {
    if (!A.has(id)) return null;
    const o = A.instance(id); box.setFromObject(o); box.getSize(sz);
    const cur = axis === 'xz' ? Math.max(sz.x, sz.z) : axis === 'x' ? sz.x : sz.y;
    o.scale.multiplyScalar(size / Math.max(1e-4, cur));
    box.setFromObject(o);
    o.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    const h = new THREE.Group(); h.name = label || 'kn_' + id.split('/')[1]; h.add(o); return h;
  };
  const put = (obj, x, z, ry = 0, y = 0) => { if (!obj) return null; obj.position.set(x, y, z); obj.rotation.y = ry; g.add(obj); return obj; };
  // ô đường: đúng 1 ô Kenney = tile (không chuẩn hoá theo bbox để các ô khít nhau)
  const roadTile = (id, x, z, ry = 0) => { if (!A.has(id)) return null; const o = A.instance(id, { scale: tile, receiveShadow: true }); o.castShadow = false; o.name = id.split('/')[1]; return put(o, x, z, ry, 0.02); };

  // mặt cỏ
  const N = blocks * block;                       // số ô mỗi chiều (đường ở chỉ số bội của block)
  const W = (N + 1) * tile, half = (N * tile) / 2;
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: ground, roughness: 0.95 }));
  lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; lawn.name = 'town_lawn'; g.add(lawn);
  const X = (i) => i * tile - half, Z = X;          // chỉ số ô → toạ độ tâm ô

  // đường: các đường ngang (chạy theo X) ở gz = 0, block, 2·block…; đường dọc (theo Z) ở gx tương tự. Kéo dài 2 ô ra ngoài.
  const isRoad = (i) => i % block === 0;
  for (let i = -2; i <= N + 2; i++) for (let j = 0; j <= N; j += block) {
    if (isRoad(i) && i >= 0 && i <= N) roadTile(RD('road-crossroad'), X(i), Z(j));
    else roadTile(RD('road-straight'), X(i), Z(j), 0);             // phố theo trục X (ô Kenney gốc chạy theo X)
  }
  for (let j = -2; j <= N + 2; j++) for (let i = 0; i <= N; i += block) {
    if (isRoad(j) && j >= 0 && j <= N) continue;
    roadTile(RD('road-straight'), X(i), Z(j), Math.PI / 2);            // phố theo trục Z
  }
  // đèn đường ở góc mỗi ngã tư
  const lamps = [];
  for (let i = 0; i <= N; i += block) for (let j = 0; j <= N; j += block) {
    const o = tile * 0.42;
    lamps.push(put(fit(RD('light-square'), 10, 'y', `lamp_${i}_${j}`), X(i) + o, Z(j) + o, Math.PI));
  }

  // khối nhà: ô trong mỗi khối = (block-1)², nhà xếp 2 dãy quay lưng vào nhau, mặt nhìn ra phố ngang
  const places = {};
  const nb = blocks, mid = Math.floor(nb / 2);
  const parkBlock = [(mid + 1) % nb, mid];          // khối công viên
  const houses = [];
  const inner = (block - 1) * tile;                 // cạnh lòng khối
  for (let bx = 0; bx < nb; bx++) for (let bz = 0; bz < nb; bz++) {
    const cx = X(bx * block) + (block * tile) / 2, cz = Z(bz * block) + (block * tile) / 2;   // tâm khối
    if (bx === mid && bz === mid) { buildSquare(cx, cz); continue; }
    if (bx === parkBlock[0] && bz === parkBlock[1]) { buildPark(cx, cz); continue; }
    for (const side of [1, -1]) {                   // 1 = dãy phía +Z (mặt nhìn +Z), -1 = dãy phía -Z
      for (const k of [-1, 1]) {
        const ry = side > 0 ? 0 : Math.PI;
        const id = pick(HOUSES), idx = houses.length + 1;
        const h = fit(id, houseSize, 'xz', `house_${idx}`);
        if (!h) continue;
        box.setFromObject(h); box.getSize(sz);
        const depth = ry === 0 ? sz.z : sz.z;               // nhà quay 0 hoặc π → chiều sâu = cạnh z
        const hx = cx + k * inner / 4, hz = cz + side * (depth / 2 + 1.5);   // 2 dãy quay lưng sát nhau → sân trước rộng
        put(h, hx, hz, ry);
        // sân trước: lối đi, cây, hàng rào sau nhà
        const fz = hz + side * (depth / 2);                 // mép trước nhà
        const yard = inner / 2 - (fz - cz) * side;          // khoảng từ mặt nhà tới mép phố
        put(fit(SUB('path-long'), Math.max(3, yard - 1), 'xz'), hx, fz + side * yard / 2, ry);
        if (R() < 0.8) put(fit(pick(TREES), 9 + R() * 6, 'y', `tree_h${idx}`), hx + (R() < 0.5 ? -1 : 1) * (houseSize * 0.38), fz + side * yard * 0.55, R() * 6);
        if (R() < 0.6) put(fit(SUB('fence-1x4'), inner / 2 - 2, 'xz', `fence_h${idx}`), hx, cz, ry);
        const front = [hx, 0, fz + side * Math.min(5, yard * 0.45)];
        houses.push({ idx, id, pos: front, ry, house: h });
        places[`house${idx}`] = { pos: front, ry };
      }
    }
  }

  function buildSquare(cx, cz) {
    const n = block - 1;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) roadTile(RD('tile-low'), cx + (i - (n - 1) / 2) * tile, cz + (j - (n - 1) / 2) * tile);
    const r = inner * 0.36;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      put(fit(SUB('tree-large'), 15, 'y', 'tree_square'), cx + sx * r, cz + sz * r, R() * 6);
      put(fit(SUB('planter'), 4.5, 'xz', 'planter_square'), cx + sx * r * 0.55, cz + sz * r * 1.05, 0);
      put(fit('furniture-kit/bench', 5.5, 'xz', 'bench_square'), cx + sx * r * 1.05, cz + sz * r * 0.5, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
    }
    lamps.push(put(fit(RD('light-square-double'), 11, 'y', 'lamp_square'), cx, cz - r * 0.2, 0));
    places.square = { pos: [cx, 0, cz + 6], ry: 0 };
  }
  function buildPark(cx, cz) {
    const r = rng(seed * 31 + 5), lim = inner / 2 - 6;
    const pts = [];
    for (let tries = 0; pts.length < 14 && tries < 400; tries++) {
      const x = (r() * 2 - 1) * lim, z = (r() * 2 - 1) * lim;
      if (Math.hypot(x, z - 4) < 14 || pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < 9)) continue;
      pts.push([x, z]);
    }
    pts.forEach(([x, z], i) => put(fit(TREES[i % 2], 10 + r() * 8, 'y', 'tree_park'), cx + x, cz + z, r() * 6));
    put(fit(SUB('path-stones-long'), 12, 'xz', 'path_park'), cx, cz + 4, 0);
    places.park = { pos: [cx, 0, cz + 4], ry: 0 };
  }

  // địa điểm có tên: home = nhà gần quảng trường nhất ở dãy +Z (hàng xóm "tôi"), shop = nhà xa nhất phía khác (theo seed)
  const sq = places.square.pos;
  const front = houses.filter((h) => h.ry === 0).sort((a, b) => Math.hypot(a.pos[0] - sq[0], a.pos[2] - sq[2]) - Math.hypot(b.pos[0] - sq[0], b.pos[2] - sq[2]));
  const home = front[0] || houses[0];
  const others = houses.filter((h) => h !== home);
  const shop = others[Math.floor(R() * others.length)] || home;
  if (home) {
    places.home = { pos: home.pos, ry: home.ry }; home.house.name = 'house_home';
    places.yard = { pos: [home.pos[0] + 8, 0, home.pos[2] - 3], ry: home.ry + 0.3 };
    const mb = fit('polyfork/curbside-mailbox-0e0736', 3.6, 'y', 'mailbox_home');
    put(mb, home.pos[0] - 6, home.pos[2] + 1.5, home.ry);
  }
  if (shop) { places.shop = { pos: shop.pos, ry: shop.ry }; shop.house.name = 'house_shop'; }
  // phố: giữa đường ngang ngay trước nhà "home"; ngã tư: giữa thị trấn
  const roadZ = Z(Math.round((home.pos[2] + half) / tile / block) * block);
  places.street = { pos: [home.pos[0], 0, roadZ], ry: 0 };
  places.crossroad = { pos: [X(Math.round(blocks / 2) * block), 0, Z(Math.round(blocks / 2) * block)], ry: 0.6 };
  places.center = { pos: [0, 0, 0], ry: 0 };
  for (const p of Object.values(places)) p.pos = p.pos.map((v) => Math.round(v * 100) / 100);

  // tô màu nhà theo bảng kiểu (chỉ khi bật khoá). Không dùng R() → vị trí/đạo cụ/cây của thị trấn không đổi.
  let nhaInfo = null;
  if (kieu) {
    const idxOf = (n) => { const p = places[n]; return p ? houses.find((h) => h.pos === p.pos || (h.pos[0] === p.pos[0] && h.pos[2] === p.pos[2]))?.idx : undefined; };
    const dsVai = opts.vai || (Q.get('vai') ? Q.get('vai').split(',') : ['home', 'shop']);
    const st = places.street.pos, dung = new Set(), vai = [];
    const homeI = houses.find((h) => h.house === home?.house)?.idx, shopI = houses.find((h) => h.house === shop?.house)?.idx;
    const gan = (ten, i) => { if (i != null && !dung.has(i)) { dung.add(i); vai.push({ ten, idx: i }); } };
    for (const ten of dsVai) { const ov = (opts.nhaViTri || {})[ten]; if (ov) gan(ten, idxOf(ov) ?? houses.find((h) => `house${h.idx}` === ov)?.idx); else if (ten === 'home') gan(ten, homeI); else if (ten === 'shop') gan(ten, shopI); }
    const gan2 = houses.filter((h) => !dung.has(h.idx) && h.idx !== homeI && h.idx !== shopI).sort((a, b) => Math.hypot(a.pos[0] - st[0], a.pos[2] - st[2]) - Math.hypot(b.pos[0] - st[0], b.pos[2] - st[2]) || a.idx - b.idx);
    for (const ten of dsVai) if (!vai.some((v) => v.ten === ten) && gan2.length) gan(ten, gan2.shift().idx);
    const mau = ganMau(kieu, houses.map((h) => ({ idx: h.idx, x: h.house.position.x, z: h.house.position.z })), { seed, vai, nha: opts.nha || {} });
    for (const h of houses) if (mau[h.idx]) toMauNha(THREE, h.house, mau[h.idx]);
    nhaInfo = { kieu, mau, houses: houses.map((h) => ({ idx: h.idx, id: h.id, x: h.house.position.x, z: h.house.position.z })) };
    globalThis.__nhaInfo = nhaInfo;
  }

  // VÀNH NGOÀI (tuỳ chọn, mặc định TẮT: opts.vanh = số vành khối nhà bao quanh thị trấn; ep001 không khai → không đổi gì).
  // Dùng rng riêng (không đụng R) và KHÔNG thêm vào `houses`/`places` → vị trí, địa điểm, màu nhà cũ giữ nguyên.
  const vanhHouses = [];
  if (opts.vanh > 0) {
    const nB = opts.vanh * block, R2 = rng(seed * 104729 + 77), pick2 = (arr) => arr[Math.floor(R2() * arr.length)];
    const ringRoad = (i, j) => { const crossH = (i % block === 0) && i >= -nB && i <= N + nB; return crossH; };
    for (let j = -nB; j <= N + nB; j += block) for (let i = -nB - 2; i <= N + nB + 2; i++) {   // phố ngang mới + đoạn nối ra hai bên
      if (j >= 0 && j <= N && i >= -2 && i <= N + 2) continue;
      if (ringRoad(i, j)) roadTile(RD('road-crossroad'), X(i), Z(j)); else roadTile(RD('road-straight'), X(i), Z(j), 0);
    }
    for (let i = -nB; i <= N + nB; i += block) for (let j = -nB - 2; j <= N + nB + 2; j++) {   // phố dọc mới
      if (i >= 0 && i <= N && j >= -2 && j <= N + 2) continue;
      if (j % block === 0 && j >= -nB && j <= N + nB) continue;   // giao lộ đã có ở vòng ngang
      roadTile(RD('road-straight'), X(i), Z(j), Math.PI / 2);
    }
    const ring = [];
    for (let bx = -opts.vanh; bx < nb + opts.vanh; bx++) for (let bz = -opts.vanh; bz < nb + opts.vanh; bz++) {
      if (bx >= 0 && bx < nb && bz >= 0 && bz < nb) continue;
      const cx = X(bx * block) + (block * tile) / 2, cz = Z(bz * block) + (block * tile) / 2;
      for (const side of [1, -1]) for (const k of [-1, 1]) {
        const ry = side > 0 ? 0 : Math.PI, idx = 1000 + ring.length;
        const h = fit(pick2(HOUSES), houseSize, 'xz', `house_vanh_${idx}`); if (!h) continue;
        box.setFromObject(h); box.getSize(sz);
        const hx = cx + k * inner / 4, hz = cz + side * (sz.z / 2 + 1.5), fz = hz + side * (sz.z / 2), yard = inner / 2 - (fz - cz) * side;
        put(h, hx, hz, ry);
        put(fit(SUB('path-long'), Math.max(3, yard - 1), 'xz'), hx, fz + side * yard / 2, ry);
        if (R2() < 0.8) put(fit(pick2(TREES), 9 + R2() * 6, 'y', `tree_vanh${idx}`), hx + (R2() < 0.5 ? -1 : 1) * (houseSize * 0.38), fz + side * yard * 0.55, R2() * 6);
        ring.push({ idx, house: h }); vanhHouses.push(h);
      }
    }
    if (kieu) {
      const mauV = ganMau(kieu, ring.map((r) => ({ idx: r.idx, x: r.house.position.x, z: r.house.position.z })), { seed: seed + 999, vai: [], nha: {} });
      for (const r of ring) if (mauV[r.idx]) toMauNha(THREE, r.house, mauV[r.idx]);
    }
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } });
  const dem = taoDen(THREE, g, { houses: [...houses.map((h) => h.house), ...vanhHouses], lamps: lamps.filter(Boolean), seed, leSang: opts.leSang });
  return { group: g, places, houses, size: W, seed, vanh: opts.vanh || 0, nha: nhaInfo, setNight: dem.setNight, den: dem, update: null };
}

// ---- ĐÊM CÓ ĐÈN: cửa sổ nhà sáng ấm + đèn đường (quầng sáng). Chỉ THÊM vật; KHÔNG đụng vật liệu nhà (không đổi program nhà) và KHÔNG thêm PointLight
//      (đổi số đèn thật buộc mọi env dịch lại shader). Kính nhà Kenney = ô (5,1) của colormap 8×4 (phanTichHinh: ô khác TƯỜNG/MÁI/VIỀN/CỬA).
//      Cửa sổ nào sáng: bam(seed, nhà, cửa sổ) < LE_SANG → tất định theo seed. Ban ngày cả nhóm ẩn (visible=false).
const LE_SANG = 0.6, KINH = [5, 1];
const kinhCache = new WeakMap();
export function cuaKinh(geo) {   // → [{ c:[x,y,z], n:[nx,0,nz], w, h }] trong toạ độ mesh; chỉ mặt kính hướng ra ngoài, mỗi cụm tam giác liền nhau = 1 cửa sổ
  if (kinhCache.has(geo)) return kinhCache.get(geo);
  const pos = geo.attributes.position, uv = geo.attributes.uv, idx = geo.index, out = [];
  if (!pos || !uv || !idx) { kinhCache.set(geo, out); return out; }
  geo.computeBoundingBox(); const bb = geo.boundingBox, cx0 = (bb.min.x + bb.max.x) / 2, cz0 = (bb.min.z + bb.max.z) / 2;
  const P = (i) => [pos.getX(i), pos.getY(i), pos.getZ(i)], tris = [];
  for (let t = 0; t < idx.count / 3; t++) {
    const a = idx.getX(t * 3), b = idx.getX(t * 3 + 1), c = idx.getX(t * 3 + 2);
    let u = 0, v = 0; for (const k of [a, b, c]) { u += uv.getX(k); v += uv.getY(k); }
    if (Math.floor(u / 3 * 8) !== KINH[0] || Math.floor(v / 3 * 4) !== KINH[1]) continue;
    const A = P(a), B = P(b), C = P(c), e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], L = Math.hypot(...n) || 1;
    n[0] /= L; n[1] /= L; n[2] /= L;
    if (Math.abs(n[1]) > 0.5) continue;                                                  // mặt nằm ngang
    if (n[0] * ((A[0] + B[0] + C[0]) / 3 - cx0) + n[2] * ((A[2] + B[2] + C[2]) / 3 - cz0) <= 0) continue;   // mặt quay vào trong nhà
    tris.push({ v: [a, b, c], n });
  }
  const key = (i) => `${Math.round(pos.getX(i) * 1000)},${Math.round(pos.getY(i) * 1000)},${Math.round(pos.getZ(i) * 1000)}`;
  const cha = new Map(), goc = (x) => { while (cha.get(x) !== x) x = cha.get(x); return x; };
  for (const t of tris) for (const i of t.v) { const k = key(i); if (!cha.has(k)) cha.set(k, k); }
  for (const t of tris) for (let k = 1; k < 3; k++) cha.set(goc(key(t.v[k])), goc(key(t.v[0])));
  const cum = new Map(); for (const t of tris) { const r = goc(key(t.v[0])); if (!cum.has(r)) cum.set(r, []); cum.get(r).push(t); }
  for (const ts of cum.values()) {
    let nx = 0, nz = 0; for (const t of ts) { nx += t.n[0]; nz += t.n[2]; } const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const tx = nz, tz = -nx; let s0 = 1e9, s1 = -1e9, y0 = 1e9, y1 = -1e9, px = 0, pz = 0, pc = 0;
    for (const t of ts) for (const i of t.v) { const [x, y, z] = P(i), s = x * tx + z * tz; s0 = Math.min(s0, s); s1 = Math.max(s1, s); y0 = Math.min(y0, y); y1 = Math.max(y1, y); px += x; pz += z; pc++; }
    if ((s1 - s0) * (y1 - y0) < 1e-5) continue;
    out.push({ c: [px / pc, (y0 + y1) / 2, pz / pc], n: [nx, 0, nz], w: s1 - s0, h: y1 - y0 });
  }
  out.sort((p, q) => p.c[1] - q.c[1] || p.c[0] - q.c[0] || p.c[2] - q.c[2]);   // thứ tự cố định → chỉ số cửa sổ tất định
  kinhCache.set(geo, out); return out;
}
function quangTex(THREE) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const MAU_DEN = ['#ffd27a', '#ffe2a8', '#ffc060', '#fff0cc'];
function taoDen(THREE, g, { houses, lamps, seed, leSang = LE_SANG }) {   // leSang = tỉ lệ cửa sổ sáng 0..1 (episode.town.leSang; không ghi = LE_SANG cũ 0,6; bộ Blender 2.5D dùng 0,35)
  g.updateMatrixWorld(true);
  const den = new THREE.Group(); den.name = 'town_night_lights'; den.visible = false; g.add(den);
  // 1) cửa sổ sáng: 1 InstancedMesh + 1 vật liệu MeshBasic (không đèn)
  const mats = [], M = new THREE.Matrix4(), q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), Sc = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  houses.forEach((h, hi) => h.traverse((o) => {
    if (!o.isMesh || !o.geometry?.index) return;
    const ws = cuaKinh(o.geometry); if (!ws.length) return;
    const mw = o.matrixWorld, s = Sc.setFromMatrixScale(mw).x;
    ws.forEach((w, k) => {
      if (bam(seed * 977 + hi, k) >= leSang) return;
      const nW = new THREE.Vector3(...w.n).transformDirection(mw), tW = new THREE.Vector3(nW.z, 0, -nW.x);
      V.set(...w.c).applyMatrix4(mw).addScaledVector(nW, 0.18);
      M.makeBasis(tW, UP, nW); q.setFromRotationMatrix(M); S.set(w.w * s * 0.86, w.h * s * 0.82, 1);
      mats.push({ m: new THREE.Matrix4().compose(V, q, S), c: MAU_DEN[Math.floor(bam(seed * 31 + hi, k + 500) * MAU_DEN.length)] });
    });
  }));
  let cs = null;
  if (mats.length) {
    cs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), mats.length);
    const cc = new THREE.Color();
    mats.forEach((e, i) => { cs.setMatrixAt(i, e.m); cs.setColorAt(i, cc.set(e.c).multiplyScalar(1.5)); });
    cs.name = 'town_windows_lit'; cs.frustumCulled = false; cs.castShadow = false; cs.receiveShadow = false; cs.userData.noAO = true; den.add(cs);
  }
  // 2) đèn đường: quầng sáng sprite ở đầu đèn + vệt sáng trên mặt đường (cộng sáng)
  const tex = quangTex(THREE), heads = [];
  for (const L of lamps) L.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const p = o.geometry.attributes.position; o.geometry.computeBoundingBox();
    const y1 = o.geometry.boundingBox.max.y, y0 = o.geometry.boundingBox.min.y, H = y1 - y0, cl = [];
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < y1 - 0.12 * H) continue;
      const v = [p.getX(i), p.getY(i), p.getZ(i)], c = cl.find((c) => Math.hypot(c.x / c.n - v[0], c.z / c.n - v[2]) < 0.1 * H);   // đèn đôi có 2 đầu
      if (c) { c.x += v[0]; c.y += v[1]; c.z += v[2]; c.n++; } else cl.push({ x: v[0], y: v[1], z: v[2], n: 1 });
    }
    const xa = cl.filter((c) => c.n >= 3).map((c) => ({ x: c.x / c.n, y: c.y / c.n, z: c.z / c.n })).map((c) => ({ ...c, d: Math.hypot(c.x, c.z) })).sort((a, b) => b.d - a.d);
    const hs = xa.length && xa[0].d > 0.1 * H ? [xa[0]] : [];   // đầu đèn = mút cần xa trục cột nhất; đèn đôi: thêm mút ở phía đối diện
    if (hs.length) { const o2 = xa.find((c) => c.d > 0.1 * H && (c.x * hs[0].x + c.z * hs[0].z) < -0.5 * c.d * hs[0].d); if (o2) hs.push(o2); }
    for (const c of hs) heads.push(o.localToWorld(new THREE.Vector3(c.x, c.y, c.z)));
  });
  if (tex && heads.length) {
    const sm = new THREE.SpriteMaterial({ map: tex, color: '#ffc870', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false });
    const pm = new THREE.MeshBasicMaterial({ map: tex, color: '#ffb450', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false });
    const pg = new THREE.PlaneGeometry(1, 1);
    heads.forEach((h, i) => {
      const sp = new THREE.Sprite(sm); sp.position.copy(h); sp.position.y -= 0.4; sp.scale.setScalar(15); sp.name = `lamp_glow_${i}`; den.add(sp);
      const pool = new THREE.Mesh(pg, pm); pool.rotation.x = -Math.PI / 2; pool.position.set(h.x, 0.07, h.z); pool.scale.setScalar(40); pool.renderOrder = 3; pool.name = `lamp_pool_${i}`; pool.userData.noAO = true; den.add(pool);
    });
  }
  return { group: den, windows: cs, nWindows: mats.length, heads, setNight(n) { den.visible = !!n && n > 0.5; } };
}

// Gắn thị trấn vào engine/envs.js như một env thường (envs.use(name) bật/tắt, preset ánh sáng LIGHTS[light]).
// Đi qua envs.define → def() của lõi gán TRỜI THẬT (skybox ngày sky-7 / đêm sky-9: mây, mặt trời, trăng, sao) như env `town` của ep001; thêm núi xa (backdrop),
// rừng xa (farwoods), bóng mây (cloudshade) theo đúng ô fx backdrop / farwoods / cloudShade. Đêm: town.setNight bật cửa sổ + đèn đường.
export function registerTownEnv(envs, stage, town, { name = 'kenneyTown', light = 'day' } = {}) {
  town.group.name = `town_${name}`;
  if (!envs.define) {   // lõi cũ không có define: giữ cách cũ (không trời thật)
    town.group.visible = false; stage.scene.add(town.group);
    envs.envs[name] = { name, light, group: town.group, update: town.update, setNight: town.setNight, places: town.places };
    return envs.envs[name];
  }
  return envs.define(name, light, (g, e, H) => {
    const { THREE, scene } = H;
    town.group.visible = true; g.add(town.group);
    const sun = () => scene.children.find((o) => o.isDirectionalLight && o.name === 'sun'), hemi = () => scene.children.find((o) => o.isHemisphereLight);
    const ext = (town.size || 240) / 2 + 20 + (town.vanh || 0) * 80;   // nửa cạnh vùng có nhà; rừng xa nằm ngoài vùng này
    const wind = createWind(THREE, { dir: [1, 0.2], speed: 3, gust: 0.6, seed: 8, gustSize: 40 });
    const woods = createFarwoods(THREE, { wind, seed: 8, center: [0, 0], ring: [ext + 60, ext + 330], count: 1800, size: [10, 22], kinds: { leafy: 1, pine: 0.8 }, clumps: true,
      avoid: (x, z) => Math.abs(x) < ext + 40 && Math.abs(z) < ext + 40 });
    woods.mesh.onBeforeRender = () => { woods.lightFrom(sun(), hemi()); woods.fogFrom(scene.fog); };
    const hills = createBackdrop(THREE, { seed: 8, radius: 900, base: -30, height: 340, snow: 0.6 });
    hills.mesh.onBeforeRender = () => { hills.lightFrom(sun(), hemi()); hills.fogFrom(scene.fog); };
    H.ganTang(woods.group, 'back'); H.ganTang(hills.group, 'back'); g.add(woods.group, hills.group);
    const wind2 = createWind(THREE, { dir: [1, 0.2], speed: 3, gust: 0.6, seed: 8, gustSize: 40 }); wind2.set({ cloud: [0.5, 70, 2.4, 0.5] });
    const cloud = createCloudShade(THREE, wind2, { far: 320 });
    cloud.add(new THREE.PlaneGeometry(1400, 1400), { y: 0.012 }); cloud.group.name = 'town_cloudshade'; g.add(cloud.group);
    cloud.onRender(() => cloud.lightFrom(sun()));
    return {
      places: town.places, setNight: town.setNight, woods, hills, cloud,
      update(t, ctx) {
        const AF = globalThis.__autoFx || {}, cam = stage.camera;
        woods.group.visible = AF.farwoods !== false; if (woods.group.visible) woods.update(t, cam);
        hills.group.visible = AF.backdrop !== false; if (hills.group.visible) hills.update(t, cam);
        cloud.group.visible = AF.cloudShade !== false; if (cloud.group.visible) wind2.update(t);
        town.update?.(t, ctx);
      },
    };
  });
}
