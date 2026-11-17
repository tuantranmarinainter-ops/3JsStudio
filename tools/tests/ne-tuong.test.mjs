// Máy blocky né tường (engine/blocky/ne-tuong.js, ô FX neTuong): tia máy → tâm nhìn chạm mặt bối cảnh thấy được thì kéo máy vào.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const THREE = await import(pathToFileURL(resolve('vendor/three/three.module.js')).href);
const { khoangNe, taoNeTuong } = await import('../../engine/blocky/ne-tuong.js');

test('khoangNe: không che → null; che → trước mặt gần tâm nhìn nhất − lùi; không gần hơn min', () => {
  assert.equal(khoangNe(10, []), null);
  assert.equal(khoangNe(10, [10.5]), null);                       // vật sau tâm nhìn: không tính
  assert.ok(Math.abs(khoangNe(10, [3]) - (7 - 0.35)) < 1e-9);       // mặt cách tâm 7 → máy ở 6.65
  assert.ok(Math.abs(khoangNe(10, [3], [6.5]) - (6.5 - 0.35)) < 1e-9);   // tường dày: mặt trong ở 6.5
  assert.equal(khoangNe(10, [9.2], [], { min: 0.6, ban: 0.5 }), 0.6);
  assert.equal(khoangNe(10, [8]), null);                           // vật sát tâm (< ban 2.5: mặt thùng, chăn giường) = cảnh của chủ thể: không né
});

// Phòng giả: tường dày 0.4 ở z = 5..5.4 (mặt ngoài nhìn ra +Z), chủ thể ở gốc, máy ở z = 10
function canh() {
  const scene = new THREE.Scene(), env = new THREE.Group(); scene.add(env);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 0.4), new THREE.MeshBasicMaterial()); wall.position.set(0, 0, 5.2); env.add(wall);
  return { scene, env, wall };
}

test('tường giữa máy và chủ thể → máy kéo vào trước mặt trong của tường, hết che; tất định', () => {
  const { env } = canh(), ne = taoNeTuong(THREE);
  const A = ne([0, 0, 10], [0, 0, 0], env), B = ne([0, 0, 10], [0, 0, 0], env);
  assert.ok(A, 'phải phát hiện bị che');
  assert.ok(Math.abs(A.pos[2] - (5 - 0.35)) < 1e-6, `máy ở z=${A.pos[2]}`);
  assert.equal(A.che, 0);
  assert.deepEqual(A, B);
});

test('không tính: vật ẩn, vật trong bộ bỏ qua (nhân vật/đạo cụ), kính trong suốt, hạt, trời, khongChan', () => {
  const { env, wall } = canh(), ne = taoNeTuong(THREE);
  wall.visible = false; assert.equal(ne([0, 0, 10], [0, 0, 0], env), null); wall.visible = true;
  assert.equal(ne([0, 0, 10], [0, 0, 0], env, new Set([wall])), null);
  wall.material.transparent = true; wall.material.opacity = 0.3; assert.equal(ne([0, 0, 10], [0, 0, 0], env), null); wall.material.transparent = false; wall.material.opacity = 1;
  wall.name = 'sky_dome'; assert.equal(ne([0, 0, 10], [0, 0, 0], env), null); wall.name = '';
  wall.userData.khongChan = true; assert.equal(ne([0, 0, 10], [0, 0, 0], env), null); delete wall.userData.khongChan;
  wall.visible = false;
  const pts = new THREE.Points(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 5)]), new THREE.PointsMaterial()); env.add(pts);
  assert.equal(ne([0, 0, 10], [0, 0, 0], env), null);
});

test('mặt quay lưng về máy (tường cắt, chỉ mặt trước) không chặn: máy giữ nguyên', () => {
  const env = new THREE.Group();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), new THREE.MeshBasicMaterial({ side: THREE.FrontSide }));
  plane.position.set(0, 0, 5); plane.rotation.y = Math.PI;   // mặt trước nhìn về −Z (về chủ thể), máy ở +Z thấy mặt sau → bị cull
  env.add(plane);
  assert.equal(taoNeTuong(THREE)([0, 0, 10], [0, 0, 0], env), null);
  plane.rotation.y = 0;                                       // quay về máy → chặn
  assert.ok(taoNeTuong(THREE)([0, 0, 10], [0, 0, 0], env));
});
