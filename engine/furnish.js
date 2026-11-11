// furnish.js — BÀY ĐỒ ĐẠC BẰNG DỮ LIỆU (lõi dùng cho mọi tập). Mỗi món 1 dòng, không viết tay vị trí/kích thước từng phòng.
//   import { furnish, furnishIds } from '../furnish.js';
//   export const MY_ROOM = [ { id: 'kaykit:table_medium', name: 'table', at: [6, 2] },
//                            { id: 'kaykit:chair_A', at: [0, 2], rot: Math.PI / 2 },
//                            { id: 'scan:potted_plant_01', wall: 'north', at: [-21, -16], h: 6 }, … ];
//   const F = furnish(THREE, R, MY_ROOM, { assets: A, walls: { north: -20, south: 24, west: -24, east: 24 }, refs: { oldTable: e.table } });
//   update(): F.update(globalThis.__autoFx?.scans ?? true)      // bật/tắt cả bộ (ô "scans"); tắt → đồ dựng tay cũ hiện lại
// Muốn tải trước asset: ENV_ASSETS gồm ...furnishIds(MY_ROOM) (xem engine/envs.js).
//
// ĐỊNH DẠNG MỘT MÓN (chỉ ghi phần cần):
//   id      'kaykit:<tên>' (assets/kaykit/furniture, CC0)  |  'kenney:<tên>' (assets/kenney/furniture-kit, CC0)  |  'scan:<tên>' (Poly Haven, CC0)
//           hoặc id thô trong manifest ('furniture-kit/chair'). Danh sách tên: assets/manifest.json.
//   name    tên object trong cảnh (mặc định = tên model; trùng thì thêm _2, _3…). Dùng cho on:/fit:/replace: và F.get(name)/F.set(name,on)
//   at      [x, z] hoặc [x, y, z] (gốc món = GIỮA ĐÁY). Với wall: chỉ lấy toạ độ DỌC tường (north/south → x, east/west → z); với on: là độ lệch so với tâm vật đỡ
//   y       độ cao đáy (mặc định 0; với on: cộng thêm trên mặt vật đỡ; với wall: độ cao treo)
//   rot     góc quay quanh Y (rad), CỘNG vào hướng tự có (wall tự quay mặt ra phòng; fit mặc định theo vật bị thế)
//   scale   nhân thêm cho kích thước chuẩn của bộ    ·  h / w / d: ép chiều cao / rộng / sâu (giữ tỉ lệ, theo trục ghi đầu tiên)
//   size    [w, h, d] ép từng trục (null = giữ), kéo méo được
//   on      tên món (hoặc Object3D) làm vật đỡ → đặt lên mặt trên nó (bắn tia xuống nên đặt đúng lên nệm/mặt bàn, không lên thành giường)
//   wall    'north' | 'south' | 'east' | 'west' → áp lưng vào tường (cần opts.walls), gap: khe hở (stud)
//   fit     tên món / Object3D cũ → thế chỗ: vừa khít hộp bao, cùng vị trí; vật cũ bị ẩn khi bật (keepRatio: giữ tỉ lệ)
//   replace tên / Object3D cũ cần ẩn khi món này bật (không ép kích thước)
//   mat     'none' → không chạy materials.js/grunge.js lên món (mặc định 'none' cho scan, còn lại chạy như mọi vật)
//   off     true → bỏ món này (không dựng)
// Mọi hàm đều thuần (không Math.random, không thời gian) → tất định.

export const M2STUD = 2.9;
// hệ số đưa đơn vị gốc của từng bộ về STUD (người cao 5.2): ghế ~3, bàn ăn ~2.4–2.8, tủ lạnh ~6.
export const KITS = {
  kaykit: { prefix: 'kaykit/', stud: 2.4, mat: null },
  kenney: { prefix: 'furniture-kit/', stud: 6.5, mat: null },
  scan: { prefix: 'polyhaven/', stud: M2STUD, mat: 'none' },
};

export function resolveId(id) {
  const m = /^(\w+):(.+)$/.exec(id);
  if (m && KITS[m[1]]) return { aid: KITS[m[1]].prefix + m[2], kit: KITS[m[1]], short: m[2] };
  const kit = Object.values(KITS).find((k) => id.startsWith(k.prefix)) || { stud: 1, mat: null };
  return { aid: id, kit, short: id.split('/').pop() };
}
export const furnishIds = (layout) => [...new Set(layout.filter((o) => !o.off).map((o) => resolveId(o.id).aid))];

const WALL_ROT = { north: 0, south: Math.PI, west: Math.PI / 2, east: -Math.PI / 2 };   // quay để MẶT TRƯỚC (+Z của model) nhìn vào phòng

export function furnish(THREE, parent, layout, { assets: A, walls = {}, refs = {} } = {}) {
  const G = new THREE.Group(); G.name = 'furnish'; parent.add(G);
  const byName = new Map(Object.entries(refs)), items = [];
  const ray = new THREE.Raycaster(), V = new THREE.Vector3();
  const target = (t) => (typeof t === 'string' ? byName.get(t) : t);
  const meshesOf = (o) => { const a = []; o.traverse((m) => { if (m.isMesh && m.visible !== false) a.push(m); }); return a; };
  const worldBox = (o) => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };
  const toLocal = (p) => G.worldToLocal(p.clone());
  const uniq = (n) => { let k = n, i = 1; while (byName.has(k)) k = `${n}_${++i}`; return k; };

  for (const o of layout) {
    if (o.off) continue;
    const { aid, kit, short } = resolveId(o.id);
    const name = uniq(o.name || short);
    const obj = A.instance(aid, { name: short });
    const wrap = new THREE.Group(); wrap.name = name; wrap.add(obj); G.add(wrap);
    const none = (o.mat ?? kit.mat) === 'none';
    wrap.traverse((m) => { if (none) { m.userData.matKind = 'none'; m.userData.grungeKind = 'none'; } if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    wrap.userData.furnish = { id: o.id, name };
    obj.scale.multiplyScalar(kit.stud * (o.scale ?? 1));
    let bb = worldBox(obj);
    if (bb.isEmpty()) { console.warn(`[furnish] món "${o.id}" rỗng (asset chưa tải?)`); wrap.visible = false; wrap.userData.furnish.empty = true; byName.set(name, wrap); items.push(wrap); continue; }
    let sz = bb.getSize(V.clone());
    const fitT = o.fit ? target(o.fit) : null;
    if (o.fit && !fitT) console.warn(`[furnish] "${name}": không thấy vật cần thế "${o.fit}"`);
    const ry = (o.rot ?? 0) + (o.wall ? WALL_ROT[o.wall] ?? 0 : 0) + (fitT && o.rot == null ? fitT.rotation.y : 0);
    const swap = Math.abs(Math.sin(ry)) > 0.7;   // quay 90° → trục x/z đổi chỗ khi so với hộp thế giới
    // ---- kích thước
    if (fitT) {
      const tb = worldBox(fitT), ts = tb.getSize(V.clone());
      const sx = (swap ? ts.z : ts.x) / sz.x, sy = ts.y / sz.y, sz2 = (swap ? ts.x : ts.z) / sz.z;
      const k = o.keepRatio ? Math.min(sx, sz2) : null;
      obj.scale.multiply(new THREE.Vector3(k ?? sx, sy, k ?? sz2));   // keepRatio: chỉ giữ tỉ lệ x/z, chiều cao vẫn khít vật cũ
    } else if (o.size) {
      obj.scale.multiply(new THREE.Vector3(o.size[0] ? o.size[0] / sz.x : 1, o.size[1] ? o.size[1] / sz.y : 1, o.size[2] ? o.size[2] / sz.z : 1));
    } else if (o.h || o.w || o.d) {
      obj.scale.multiplyScalar(o.h ? o.h / sz.y : o.w ? o.w / sz.x : o.d / sz.z);
    }
    // gốc = giữa đáy (trong hệ của wrap, chưa quay)
    bb = worldBox(obj);
    const c = bb.getCenter(V.clone());
    obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= bb.min.y;
    wrap.rotation.y = ry;
    // ---- vị trí
    const at = o.at || [];
    let x = 0, y = 0, z = 0;
    if (fitT) {
      const tb = worldBox(fitT), tc = toLocal(tb.getCenter(V.clone()));
      x = tc.x; z = tc.z; y = toLocal(new THREE.Vector3(0, tb.min.y, 0)).y;
    } else if (o.on) {
      const base = target(o.on);
      if (!base) console.warn(`[furnish] "${name}": không thấy vật đỡ "${o.on}"`);
      else {
        const b = worldBox(base), bc = toLocal(b.getCenter(V.clone()));
        const dx = at.length === 3 ? at[0] : (at[0] ?? 0), dz = at.length === 3 ? at[2] : (at[1] ?? 0), dy = at.length === 3 ? at[1] : 0;
        x = bc.x + dx; z = bc.z + dz;
        ray.set(new THREE.Vector3(x, b.max.y + 50, z), new THREE.Vector3(0, -1, 0)); ray.far = 200;
        const hit = ray.intersectObjects(meshesOf(base), false)[0];   // mặt đỡ thật dưới điểm đặt (nệm/mặt bàn), không phải đỉnh hộp bao
        y = (hit ? hit.point.y : b.max.y) + dy;
      }
    } else if (o.wall) {
      const alongX = o.wall === 'north' || o.wall === 'south';
      const along = at.length === 1 ? at[0] : alongX ? at[0] : at[at.length - 1];
      x = alongX ? (along ?? 0) : (walls[o.wall] ?? 0); z = alongX ? (walls[o.wall] ?? 0) : (along ?? 0);
    } else {
      if (at.length === 3) [x, y, z] = at; else { x = at[0] ?? 0; z = at[1] ?? 0; }
    }
    wrap.position.set(x, y + (o.y ?? 0), z);
    if (o.wall) {   // áp lưng vào tường: đo lại hộp thế giới sau khi xoay, đẩy cho mép sau chạm mặt phẳng tường
      const wb = worldBox(wrap), w = walls[o.wall] ?? 0, gap = o.gap ?? 0;
      if (o.wall === 'north') wrap.position.z += w - wb.min.z + gap;
      else if (o.wall === 'south') wrap.position.z += w - wb.max.z - gap;
      else if (o.wall === 'west') wrap.position.x += w - wb.min.x + gap;
      else wrap.position.x += w - wb.max.x - gap;
    }
    const repl = []; for (const t of [fitT, o.replace ? target(o.replace) : null]) if (t) repl.push(t);
    wrap.userData.replaces = repl;
    byName.set(name, wrap); items.push(wrap);
  }
  G.updateMatrixWorld(true);

  const api = {
    group: G, items, byName,
    get: (n) => byName.get(n),
    /** bật/tắt MỘT món theo tên (tắt → vật cũ mà nó thế chỗ hiện lại) */
    set(n, on) { const w = byName.get(n); if (w) w.userData.enabled = on; return api; },
    /** gọi mỗi khung (update của env): on = ô bật/tắt cả bộ; có thể tắt riêng món qua globalThis.__autoFx.furnishItems = { tên: false } */
    update(on = true) {
      const per = globalThis.__autoFx?.furnishItems;
      for (const w of items) {
        if (w.userData.furnish.empty) continue;
        const v = on && w.userData.enabled !== false && per?.[w.name] !== false;
        w.visible = v;
        for (const r of w.userData.replaces) r.visible = !v;
      }
    },
  };
  return api;
}
