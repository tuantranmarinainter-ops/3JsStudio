// Gấu GLB (engine/bear-glb.js): công tắc, biến thể, ánh xạ khớp → xương theo xoay thế giới, tất định. Dùng bộ xương giả (không nạp GLB trong node).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { nap, engine } from './_three.mjs';

let THREE, G, B;
before(async () => { THREE = await nap(); G = await engine('bear-glb.js'); B = await engine('bear.js'); });
after(() => { G.bearGlbSetLib(null); delete globalThis.__bearGlb; });

// bộ xương giả cùng tên với bap.glb: root_00 > base_01 > {head_02, arm-r_09 > arm-r001_010, arm-l_011 > …, leg-r_05 > leg-r001_06, leg-l_07 > …}; mỗi xương có 1 hộp để có chiều cao
function fakeModel(name) {
  const g = new THREE.Group(); g.name = name;
  const mk = (n, parent, pos, rot) => { const b = new THREE.Bone(); b.name = n; b.position.set(...pos); if (rot) b.quaternion.setFromEuler(new THREE.Euler(...rot)); parent.add(b); return b; };
  const root = mk('root_00', g, [0, 1, 0], [0.3, 0, 0]), base = mk('base_01', root, [0, 0.2, 0], [0, 0.4, 0]);
  mk('head_02', base, [0, 0.9, 0]);
  const ar = mk('arm-r_09', base, [-0.5, 0.7, 0], [0, 0, 1.2]); mk('arm-r001_010', ar, [0, 0.4, 0], [0.2, 0, 0.1]);
  const al = mk('arm-l_011', base, [0.5, 0.7, 0], [0, 0, -1.2]); mk('arm-l001_012', al, [0, 0.4, 0], [0.2, 0, -0.1]);
  const lr = mk('leg-r_05', base, [-0.3, 0, 0], [0.1, 0, 0]); mk('leg-r001_06', lr, [0, -0.6, 0], [0, 0, 0]);
  const ll = mk('leg-l_07', base, [0.3, 0, 0]); mk('leg-l001_08', ll, [0, -0.6, 0]);
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 2.6, 1), new THREE.MeshStandardMaterial({ color: '#a8692a' })); m.material.name = 'body'; m.position.y = 1.3; g.add(m);
  return g;
}
const fakeLib = () => ({ THREE, A: { instance: (id, o) => fakeModel(o?.name || id) } });

test('công tắc: mặc định tắt; __bearGlb=true bật; node không nạp GLB → bearGlbOn=false', () => {
  assert.equal(G.bearGlbWanted(), false);
  globalThis.__bearGlb = true; assert.equal(G.bearGlbWanted(), true);
  assert.equal(G.bearGlbOn(), false, 'chưa nạp thư viện');
  globalThis.__bearGlb = false; assert.equal(G.bearGlbWanted(), false);
});
test('biến thể theo tên diễn viên và thứ tự', () => {
  assert.equal(G.bearGlbVariant('bap'), 'characters/bap');
  assert.equal(G.bearGlbVariant('bear2'), 'characters/bap2');
  assert.equal(G.bearGlbVariant('bear3'), 'characters/bap3');
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => G.bearGlbVariant('gau' + i, i)), ['characters/bap', 'characters/bap2', 'characters/bap3', 'characters/bap', 'characters/bap2']);
  assert.equal(G.bearGlbVariant('x', 0, 'bap3'), 'characters/bap3');
});
test('createBearGlb: cùng giao diện createBear, co về 2,2 stud, chân chạm đất', () => {
  G.bearGlbSetLib(fakeLib());
  const b = G.createBearGlb(THREE, { name: 'bap', bow: '#2e86de' });
  for (const k of ['root', 'body', 'head', 'hips', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'leftElbow', 'rightElbow', 'leftHand', 'rightHand', 'leftKnee', 'rightKnee', 'hat', 'bow']) assert.ok(b.parts[k]?.isObject3D, 'thiếu ' + k);
  assert.ok(b.isBear && b.isBearGlb && b.height === B.BEAR_DIMS.height);
  b.animate('stand', 0); b.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(b.glb);
  assert.ok(Math.abs(box.max.y - 2.2) < 0.05 && Math.abs(box.min.y) < 0.05, `cao ${box.max.y} đáy ${box.min.y}`);
  assert.ok(typeof b.attach === 'function' && typeof b.setFace === 'function' && b.faceAt().bear);
});
test('khớp → xương: xoay thế giới của xương = xoay khớp × xoay lúc nghỉ; tất định theo t', () => {
  G.bearGlbSetLib(fakeLib());
  const b = G.createBearGlb(THREE, { name: 'bap' });
  const bone = (n) => b.glb.getObjectByName(n);
  const wq = (n) => { b.root.updateMatrixWorld(true); return bone(n).getWorldQuaternion(new THREE.Quaternion()); };
  b.animate('stand', 0); const r0 = wq('arm-r_09').clone();
  b.animate('wave', 0.37); const w1 = wq('arm-r_09').clone();
  assert.ok(r0.angleTo(w1) > 0.5, 'vẫy tay phải đổi xoay xương');
  b.animate('run', 9.9); b.animate('wave', 0.37); const w2 = wq('arm-r_09').clone();
  assert.ok(w1.angleTo(w2) < 1e-6, 'cùng t → cùng xoay');
  // xoay thế giới của xương (so với thân) lệch khớp người lái đúng bằng góc khớp (cánh tay phải một mình, không có cha xoay)
  b.animate('wave', 0.37);
  const body = b.parts.body.getWorldQuaternion(new THREE.Quaternion());
  const rel = body.clone().invert().multiply(wq('arm-r_09'));
  const joint = b.parts.rightArm.getWorldQuaternion(new THREE.Quaternion()), rest = new THREE.Quaternion();
  b.animate('stand', 0); // không đủ để lấy rest; kiểm gián tiếp: quay lại wave rồi so với (khớp × rest) tính từ r0 và khớp lúc stand
  const jStand = b.parts.rightArm.getWorldQuaternion(new THREE.Quaternion());
  rest.copy(jStand).invert().multiply(r0);   // rest = khớp_stand⁻¹ × xương_stand
  b.animate('wave', 0.37);
  const jWave = b.parts.rightArm.getWorldQuaternion(new THREE.Quaternion());
  const expect = jWave.clone().multiply(rest);
  assert.ok(wq('arm-r_09').angleTo(expect) < 1e-5, 'xương = khớp × nghỉ');
  void rel; void joint;
});
test('mọi animation của gấu: ma trận xương hữu hạn, vanish co về ~0, ngồi chạm đất', () => {
  G.bearGlbSetLib(fakeLib());
  const b = G.createBearGlb(THREE, { name: 'bap' });
  for (const n of Object.keys(B.BEAR_ANIMATIONS)) for (const t of [0, 0.4, 1.3, 7.7]) {
    b.animate(n, t); b.root.updateMatrixWorld(true);
    b.glb.traverse((o) => assert.ok(o.matrixWorld.elements.every(Number.isFinite), `${n}@${t} ${o.name}`));
  }
  b.animate('vanish', 5); assert.ok(b.parts.body.scale.x < 0.01);
  b.animate('idle', 0.4); b.root.updateMatrixWorld(true);
  assert.ok(Math.abs(new THREE.Box3().setFromObject(b.glb).min.y) < 0.12, 'ngồi không chìm/lơ lửng');
});
test('thiếu model → createBearGlb trả null (cast.js rơi về gấu khối)', () => {
  G.bearGlbSetLib({ THREE, A: { instance: () => new THREE.Group() } });
  assert.equal(G.createBearGlb(THREE, { name: 'bap' }), null);
});

test('bearGlbBakedStatic: tắt/chưa nạp → null (kệ gấu giữ gấu khối); nạp lib giả không có lưới xương → vật liệu thiếu để env tự bỏ qua', () => {
  G.bearGlbSetLib(null); globalThis.__bearGlb = true;
  assert.equal(G.bearGlbBakedStatic(THREE, 0), null);
  G.bearGlbSetLib(fakeLib()); G.bearGlbBakedClear();
  const r = G.bearGlbBakedStatic(THREE, 0);
  assert.ok(r === null || !r.materials[0], 'không có SkinnedMesh → không có vật liệu lông');
  G.bearGlbSetLib(null); globalThis.__bearGlb = false;
});
