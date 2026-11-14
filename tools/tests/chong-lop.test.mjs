// Động tác chồng lớp `do:` (engine/blocky/chong.js, ô FX chongLop).
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// engine/blocky/util.js import 'three' (trình duyệt dùng importmap) → trỏ về vendor/three khi chạy trong node
const three = pathToFileURL(resolve('vendor/three/three.module.js')).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(three)}, shortCircuit: true } : n(s, c); }`));
const { chongLop, trongSo, FADE } = await import('../../engine/blocky/chong.js');

const rot = () => ({ rotation: { x: 0, y: 0, z: 0 } });
const mk = () => ({ parts: { torso: rot(), head: rot(), leftArm: rot(), rightArm: rot(), leftLeg: rot(), rightLeg: rot() } });

test('trọng số mờ vào/ra 0,12 s, 0 ngoài khoảng', () => {
  assert.equal(trongSo(0.2, 0.3, 1), 0);
  assert.ok(Math.abs(trongSo(0.3 + FADE / 2, 0.3, 1) - 0.5) < 1e-9);
  assert.equal(trongSo(0.6, 0.3, 1), 1);
  assert.ok(trongSo(1 - FADE / 2, 0.3, 1) < 0.51);
  assert.equal(trongSo(1.2, 0.3, 1), 0);
});

test('vẫy tay phải: chỉ tay phải đổi, ngoài mốc giờ không đổi gì, hàm thuần của local', () => {
  const list = [{ a: 'wave', arm: 'R', t: [0.3, 1.5] }];
  const a = mk(); chongLop(a, list, 0.1);
  assert.equal(a.parts.rightArm.rotation.x, 0);
  const b = mk(); chongLop(b, list, 0.9);
  assert.ok(b.parts.rightArm.rotation.x < -2, 'tay phải giơ lên');
  assert.equal(b.parts.leftArm.rotation.x, 0);
  assert.equal(b.parts.leftLeg.rotation.x, 0);
  const c = mk(); chongLop(c, list, 0.9);   // cùng local → cùng kết quả (tua tới/lui)
  assert.deepEqual(c.parts.rightArm.rotation, b.parts.rightArm.rotation);
});

test('động tác lạ / không có parts → bỏ qua, không ném lỗi', () => {
  chongLop(mk(), [{ a: 'khongCo' }], 0.5); chongLop({}, [{ a: 'wave' }], 0.5); chongLop(mk(), undefined, 0.5);
});
