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
  for (let i = 0; i <= N; i += block) for (let j = 0; j <= N; j += block) {
    const o = tile * 0.42;
    put(fit(RD('light-square'), 10, 'y', `lamp_${i}_${j}`), X(i) + o, Z(j) + o, Math.PI);
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
    put(fit(RD('light-square-double'), 11, 'y', 'lamp_square'), cx, cz - r * 0.2, 0);
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

  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } });
  return { group: g, places, houses, size: W, seed, setNight() {}, update: null };
}

// Gắn thị trấn vào engine/envs.js như một env thường (envs.use(name) bật/tắt, preset ánh sáng LIGHTS[light]).
export function registerTownEnv(envs, stage, town, { name = 'kenneyTown', light = 'day' } = {}) {
  town.group.name = `env_${name}`; town.group.visible = false; stage.scene.add(town.group);
  envs.envs[name] = { name, light, group: town.group, update: town.update, setNight: town.setNight, places: town.places };
  return envs.envs[name];
}
