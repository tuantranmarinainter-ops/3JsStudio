// scans.js — Đặt mô hình QUÉT THẬT từ Poly Haven (CC0, assets/polyhaven/<id>/, tải qua workflow "assets" với dòng
// "polyhaven:<id>" trong assets/queue.txt). Vật liệu quét (màu, nhám, kim loại, normal) được GIỮ NGUYÊN — đó là lý do
// gỗ ra gỗ, gốm ra gốm. Không vá materials.js / grunge.js lên chúng (userData.matKind/grungeKind = 'none').
//   import { SCAN_IDS, scanPut, scanToggle } from '../scans.js';
//   scanPut(H, 'polyhaven/potted_plant_01', R, { at: [x, y, z], ry, h: 4.2 })          // cao 4.2 stud (giữ tỉ lệ)
//   scanPut(H, 'polyhaven/wooden_table_02', R, { fit: oldTable })                       // vừa khít hộp bao vật cũ, ẩn vật cũ khi bật
//   scanToggle(e, on)   // bật/tắt mọi mô hình quét của env (ô "scans" trong trình phát → globalThis.__autoFx.scans)
// Đơn vị: 1 m ≈ 2.9 stud (người cao 5.2 stud).
export const SCAN_IDS = ['potted_plant_01', 'potted_plant_04', 'ceramic_vase_01', 'book_encyclopedia_set_01', 'alarm_clock_01',
  'hanging_picture_frame_01', 'painted_wooden_shelves', 'side_table_01', 'painted_wooden_chair_02', 'wooden_table_02'].map((i) => 'polyhaven/' + i);
export const M2STUD = 2.9;

export function scanPut(H, id, parent, o = {}) {
  const { THREE, A } = H;
  const obj = A.instance(id, { name: id.split('/')[1] });
  obj.traverse((m) => { m.userData.matKind = 'none'; m.userData.grungeKind = 'none'; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  obj.userData.matKind = 'none'; obj.userData.grungeKind = 'none';
  const wrap = new THREE.Group(); wrap.name = 'scan_' + id.split('/')[1]; wrap.add(obj); wrap.userData.matKind = 'none'; wrap.userData.grungeKind = 'none';
  obj.scale.setScalar(M2STUD);
  if (o.ry) wrap.rotation.y = o.ry;
  let bb = new THREE.Box3().setFromObject(obj); const sz = bb.getSize(new THREE.Vector3());
  if (o.fit) {   // vừa khít hộp bao của vật cũ (cùng hướng); vật cũ được nhớ để ẩn khi bật
    o.fit.updateMatrixWorld(true);
    const tb = new THREE.Box3().setFromObject(o.fit), ts = tb.getSize(new THREE.Vector3());
    const rot = Math.abs(Math.sin(o.ry || 0)) > 0.7;   // quay 90° → đổi trục x/z
    const sx = (rot ? ts.z : ts.x) / sz.x, sy = ts.y / sz.y, sz2 = (rot ? ts.x : ts.z) / sz.z;
    const k = o.keepRatio ? Math.min(sx, sz2) : null;
    obj.scale.multiply(new THREE.Vector3(k ?? sx, sy, k ?? sz2));
    parent.add(wrap); wrap.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    const c = tb.getCenter(new THREE.Vector3()).applyMatrix4(inv), bottom = new THREE.Vector3(0, tb.min.y, 0).applyMatrix4(inv).y;
    bb = new THREE.Box3().setFromObject(wrap); const cc = bb.getCenter(new THREE.Vector3()).applyMatrix4(inv), by = new THREE.Vector3(0, bb.min.y, 0).applyMatrix4(inv).y;
    wrap.position.x += c.x - cc.x; wrap.position.z += c.z - cc.z; wrap.position.y += bottom - by;
    wrap.userData.replaces = o.fit;
  } else {
    if (o.h) obj.scale.multiplyScalar(o.h / sz.y);
    parent.add(wrap); wrap.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(obj);
    const inv = new THREE.Matrix4().copy(wrap.matrixWorld).invert();
    const c = bb.getCenter(new THREE.Vector3()).applyMatrix4(inv), by = new THREE.Vector3(0, bb.min.y, 0).applyMatrix4(inv).y;
    obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= by;   // gốc = giữa đáy
    wrap.position.set(...(o.at || [0, 0, 0]));
  }
  return wrap;
}

export function scanToggle(list, on) {
  for (const w of list) { w.visible = on; if (w.userData.replaces) w.userData.replaces.visible = !on; }
}
