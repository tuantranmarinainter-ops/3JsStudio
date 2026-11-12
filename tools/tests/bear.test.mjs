// Gấu bông (engine/bear.js): rig, kích thước, animation tất định, vanish co về 0, giao diện diễn viên, camera ngắm đúng đầu.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { nap, engine } from './_three.mjs';

let THREE, B;
before(async () => { THREE = await nap(); B = await engine('bear.js'); });

const NAMES = ['idle', 'sit', 'sitting', 'lie', 'sitUp', 'walk', 'run', 'climb', 'hug', 'hold', 'drag', 'putDown', 'vanish', 'wave', 'stand', 'scared', 'cower', 'panic'];
const TIMES = [0, 0.13, 0.37, 0.9, 1.2, 3.3, 7.77];
const finite = (o) => !JSON.stringify(o, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? '__NaN__' : v)).includes('__NaN__');
const clone = (o) => JSON.parse(JSON.stringify(o));

test('createBear có đủ khớp đặt tên + nơ + tai theo đầu', () => {
  const b = B.createBear(THREE, { name: 'bap', bow: '#2e86de' });
  for (const k of ['root', 'body', 'head', 'hips', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'leftElbow', 'rightElbow', 'leftHand', 'rightHand', 'leftKnee', 'rightKnee', 'leftFoot', 'rightFoot', 'hat', 'bow'])
    assert.ok(b.parts[k] && b.parts[k].isObject3D, 'thiếu ' + k);
  assert.equal(b.root.name, 'bap');
  assert.ok(b.parts.head.getObjectByName('ear_L') && b.parts.head.getObjectByName('ear_R'), 'tai phải nằm trong nhóm đầu');
  assert.equal(b.parts.bow.getObjectByName('bow_wing_L').material.color.getHexString(), '2e86de');
  assert.equal(b.root.userData.vai, 'nguoi');
});
test('màu nơ / lông theo tuỳ chọn, setColors đổi được', () => {
  const r = B.createBear(THREE, { bow: '#e74c3c' }), y = B.createBear(THREE, { bow: '#f1c40f', fur: '#aa7733' });
  assert.equal(r.materials.bow.color.getHexString(), 'e74c3c');
  assert.equal(y.materials.fur.color.getHexString(), 'aa7733');
  y.setColors({ bow: '#2e86de' }); assert.equal(y.materials.bow.color.getHexString(), '2e86de');
});
test('đứng: cao ≈ 2,2 stud, chân chạm đất', () => {
  const b = B.createBear(THREE, {}); b.animate('stand', 0);
  b.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(b.root);
  assert.ok(box.max.y > 2.0 && box.max.y < 2.45, 'cao ' + box.max.y);
  assert.ok(Math.abs(box.min.y) < 0.06, 'đáy ' + box.min.y);
});
test('ngồi (idle): mông chạm đất, không chìm', () => {
  const b = B.createBear(THREE, {}); b.animate('idle', 0.4); b.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(b.root);
  assert.ok(box.min.y > -0.08 && box.min.y < 0.1, 'đáy ' + box.min.y);
});
test('mọi animation: pose hữu hạn + tất định (2 lần cùng t ra cùng kết quả) + ma trận hữu hạn', () => {
  const b = B.createBear(THREE, {});
  for (const n of NAMES) for (const t of TIMES) {
    const p1 = clone(b.animate(n, t));
    b.animate('run', 9.9);   // xáo trạng thái
    const p2 = clone(b.animate(n, t));
    assert.ok(finite(p1), `${n}@${t} có NaN`);
    assert.deepEqual(p2, p1, `${n}@${t} không tất định`);
    b.root.updateMatrixWorld(true);
    assert.ok(b.parts.head.matrixWorld.elements.every(Number.isFinite), `${n}@${t} ma trận không hữu hạn`);
  }
});
test('tên animation lạ → rơi về idle, không ném', () => {
  const b = B.createBear(THREE, {});
  assert.deepEqual(clone(b.animate('khong-co-gi', 1.1)), clone(b.animate('idle', 1.1)));
});
test('vanish: bắt đầu scale 1, cuối co về ~0 và giữ', () => {
  const b = B.createBear(THREE, {});
  b.animate('vanish', 0); assert.ok(Math.abs(b.parts.body.scale.x - 1) < 1e-6);
  b.animate('vanish', 0.5); assert.ok(b.parts.body.scale.x > 0.9, 'chưa co trước 0,55 s: ' + b.parts.body.scale.x);
  b.animate('vanish', 0.75); const mid = b.parts.body.scale.x; assert.ok(mid < 0.9 && mid > 0.05, 'giữa ' + mid);
  b.animate('vanish', 0.9); assert.ok(b.parts.body.scale.x < 0.01, 'cuối ' + b.parts.body.scale.x);
  b.animate('vanish', 3); assert.ok(b.parts.body.scale.x < 0.01);
  b.animate('vanish', 0.75); assert.ok(Math.abs(b.parts.body.scale.x - mid) < 1e-9, 'tua lùi phải ra cùng');
  b.animate('idle', 1); assert.ok(Math.abs(b.parts.body.scale.x - 1) < 1e-6, 'anim khác phải trả scale về 1');
});
test('giao diện diễn viên: setFace/faceAt/sampleFace/options.face không ném với tên bất kỳ', () => {
  const b = B.createBear(THREE, {});
  for (const f of ['worried', 'moved', 'grin', 'sleep', 'sleepy', 'laugh', 'shy', 'surprised', 'angry', 'sad', 'happy', 'scared', 'neutral', 'xyz', 'smile~o']) {
    b.setFace(f); assert.equal(b.options.face, f); b.faceAt(1, f, { live: true, from: 'sad', mix: 0.5, gaze: [0, 0] });
  }
  assert.equal(b.sampleFace('idle', 0), undefined);
  for (const m of ['apply', 'attach', 'setDetail', 'setHat', 'setColors']) assert.equal(typeof b[m], 'function', m);
  b.setHat('cap');
  b.animate('walk', 0.3, { from: 'idle', mix: 0.4, live: true, noFace: true, speed: 1.2, amp: 0.6 });
  assert.ok(b.lastPose && b.lastPose.body);
});
test('camera: anchorOf (root.getWorldPosition + 4,2) rơi đúng đầu gấu, theo cả scale cast', () => {
  const b = B.createBear(THREE, {}); b.root.position.set(3, 0, 5); b.root.scale.setScalar(1); b.root.updateMatrixWorld(true);
  let v = b.root.getWorldPosition(new THREE.Vector3()); assert.ok(Math.abs(v.y + 4.2 - 1.62) < 1e-6 && v.x === 3 && v.z === 5);
  b.root.scale.setScalar(2); b.root.updateMatrixWorld(true);
  v = b.root.getWorldPosition(new THREE.Vector3()); assert.ok(Math.abs(v.y + 4.2 - 3.24) < 1e-6);
  const r = B.createBear(THREE, { cameraAnchor: false }); assert.equal(r.root.getWorldPosition(new THREE.Vector3()).y, 0);
});
test('bearSample mix không NaN', () => {
  assert.ok(finite(B.bearSample('walk', 0.7, { from: 'sitUp', mix: 0.3 })));
});
