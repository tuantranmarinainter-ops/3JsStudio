// Bối cảnh 'kitchen' (preset ánh sáng mặc định: interior). Sửa bối cảnh này CHỈ trong file này.
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
import { furnish } from '../furnish.js';
import { createFamilyPhoto } from '../familyphoto.js';

// BÀY ĐỒ bằng dữ liệu (engine/furnish.js). Tên 'table', 'chair1..3', 'counter_top' là vật dựng tay (refs) mà món mới thế chỗ / đặt lên.
// Ô "scans" tắt → đồ dựng tay cũ hiện lại.
export const KITCHEN_FURNISH = [
  { id: 'scan:wooden_table_02', name: 'wood_table', fit: 'table' },
  { id: 'scan:painted_wooden_chair_02', name: 'chair_w', fit: 'chair1' },
  { id: 'scan:painted_wooden_chair_02', name: 'chair_e', fit: 'chair2' },
  { id: 'scan:painted_wooden_chair_02', name: 'chair_n', fit: 'chair3' },
  { id: 'scan:potted_plant_01', at: [-21, 0, -16], h: 6 },
  { id: 'scan:ceramic_vase_01', at: [9.5, 4.4, -18.6], h: 1.6 },
  { id: 'scan:potted_plant_04', at: [18.5, 4.4, -18.6], h: 1.8 },
  { id: 'scan:painted_wooden_shelves', at: [-23.3, 7, -7], rot: Math.PI / 2, h: 5 },
  // đồ CC0 mới (Kenney Furniture Kit): lò nướng bánh trên quầy, thùng rác áp tường phải
  { id: 'kenney:toaster', on: 'counter_top', at: [-2.4, 0.2] },
  { id: 'kenney:trashcan', wall: 'east', at: [0, -12] },
];

export default function build(g, e, H) {
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  e.room = new THREE.Group(); e.room.name = 'kitchen_room'; g.add(e.room);
  const R = e.room;
  const floor = plane(60, 60, new THREE.MeshStandardMaterial({ map: checker, roughness: 0.7 }), 0, 'checker_floor'); R.add(floor);
  const wall = mat('#f3dc8c', { roughness: 0.9 }), wains = mat('#5fae7a');
  const wallAt = (x, z, ry, name) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(60, 22), wall); w.position.set(x, 11, z); w.rotation.y = ry; w.name = name; w.receiveShadow = true; R.add(w);
    const wc = new THREE.Mesh(new THREE.PlaneGeometry(60, 4), wains); wc.position.set(x, 2, z); wc.rotation.y = ry; wc.position.addScaledVector(new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)), 0.05); R.add(wc); };
  wallAt(0, -20, 0, 'wall_back'); wallAt(-24, 0, Math.PI / 2, 'wall_left'); wallAt(24, 0, -Math.PI / 2, 'wall_right'); wallAt(0, 24, Math.PI, 'wall_front');
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat('#fff6e0')); ceil.rotation.x = Math.PI / 2; ceil.position.y = 22; R.add(ceil);
  for (let i = -2; i <= 2; i++) K.box(1.2, 1.2, 60, '#7a4a2c', i * 10, 21.4, 0, 'beam', R);
  e.fridge = K.fridge(); e.fridge.position.set(-8, 0, -17.6); R.add(e.fridge);
  e.fridgeDense = K.fridge({ dense: true }); e.fridgeDense.position.set(-8, 0, -17.6); e.fridgeDense.visible = false; R.add(e.fridgeDense);
  // tay nắm tủ lạnh = thép mạ (góp ý #29): chrome (m 0.9, r 0.25, vân xước) + phản chiếu môi trường mạnh
  for (const fr of [e.fridge, e.fridgeDense]) fr.traverse((o) => {
    if (o.isMesh && /^handle_/.test(o.name)) {
      o.userData.matKind = 'chrome'; o.userData.grungeKind = 'none';
      const hh = o.geometry.parameters?.height; if (hh) { o.geometry = new THREE.CylinderGeometry(0.17, 0.17, hh, 20); o.geometry.userData = {}; }   // thanh tròn: có dải sáng/tối chạy dọc → đọc ra kim loại
      o.material = o.material.clone(); o.material.color.set('#f2f5f8'); o.material.metalness = 1; o.material.roughness = 0.14; o.material.envMapIntensity = 3.2; o.material.emissive.set('#3a4048');
    }
  });
  e.table = place(R, K.table(), 6, 0, 2); const chairs = [place(R, K.chair(), 0, 0, 2, Math.PI / 2), place(R, K.chair(), 12, 0, 2, -Math.PI / 2), place(R, K.chair(), 6, 0, -3.5, 0)];
  place(R, K.fruitBowl(), 6, 2.82, 2);
  e.window = K.window({ w: 7, h: 8, view: viewTex('day') }); e.window.position.set(10, 11, -19.8); R.add(e.window);
  e.window2 = K.window({ w: 6, h: 7, view: viewTex('day') }); e.window2.position.set(23.8, 11, 4); e.window2.rotation.y = -Math.PI / 2; R.add(e.window2);
  K.box(14, 4, 4, '#f4f1ea', 14, 2, -18, 'counter', R); const counterTop = K.box(14.4, 0.4, 4.4, '#8a5a36', 14, 4.2, -18, 'counter_top', R);
  const oldFrames = [];
  for (const [x, y] of [[-18, 13], [-12, 15], [2, 14]]) { oldFrames.push(K.box(3.4, 2.6, 0.2, '#8a5a36', x, y, -19.8, 'frame', R), K.box(2.8, 2, 0.25, ['#5fa8d8', '#e09a5a', '#7fc86a'][Math.abs(x) % 3], x, y, -19.75, 'picture', R)); }
  // ảnh gia đình (góp ý #12): mẹ + bé khối R15, khung gỗ, thế khung tranh xanh ở x=-12. Tắt: __autoFx.familyPhoto=false → khung cũ
  e.familyPhoto = createFamilyPhoto(THREE, { w: 4.4, h: 3.4 }); e.familyPhoto.position.set(-12.5, 13.9, -19.95); R.add(e.familyPhoto);
  const lamp = K.cyl(1.6, 0.6, 1.2, mat('#fff1c4', { emissive: C('#ffe39a'), emissiveIntensity: 0.8 }), 6, 18, 2, 'lamp', R, 12); K.box(0.1, 3.4, 0.1, '#333', 6, 20.3, 2, 'lamp_cord', R);
  e.pointSpec = { color: '#ffe2b0', intensity: 1.2, distance: 70, decay: 1.2, pos: [6, 17, 2] };   // đèn điểm dùng chung (engine/envs.js 'interior_point')
  // bày đồ theo dữ liệu KITCHEN_FURNISH: bàn + ghế gỗ quét thế đồ dựng tay (vừa khít hộp bao cũ), cây, bình gốm, kệ gỗ, đồ Kenney
  e.furn = furnish(THREE, R, KITCHEN_FURNISH, { assets: A, walls: { north: -20, south: 24, west: -24, east: 24 }, refs: { table: e.table, chair1: chairs[0], chair2: chairs[1], chair3: chairs[2], counter_top: counterTop } });
  e.door = new THREE.Group(); e.door.name = 'kitchen_door'; e.door.position.set(-16, 0, 23.9); R.add(e.door);
  return { update() { e.furn.update(globalThis.__autoFx?.scans ?? true); const fp = globalThis.__autoFx?.familyPhoto !== false; e.familyPhoto.visible = fp; for (const o of oldFrames.slice(2, 4)) o.visible = !fp; }, setView(kind) { const t = viewTex(kind); for (const w of [e.window, e.window2]) w.getObjectByName('window_view').material.map = t; }, };
}
