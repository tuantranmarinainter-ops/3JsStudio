// Máy quay kiểu blocky (engine/blocky/may.js): tất định, push lại gần, whip tới đích, nhắm điểm thì tâm nhìn đúng điểm, punch thu fov.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mayBlocky, frameShot } from '../../engine/blocky/may.js';

const NEO = { a: { feet: [0, 0, 0], yaw: 0 }, b: { feet: [10, 0, 0], yaw: 0 } };
const neo = (r) => NEO[r] || null;
const dist = (p, l) => Math.hypot(p[0] - l[0], p[1] - l[1], p[2] - l[2]);

test('tất định: cùng đầu vào → cùng máy', () => {
  const bk = { on: 'a', co: 'medium', move: 'orbit-left' };
  assert.deepEqual(mayBlocky(bk, { neo, local: 0.4, dur: 1 }), mayBlocky(bk, { neo, local: 0.4, dur: 1 }));
});

test('push: cuối shot gần chủ thể hơn đầu shot', () => {
  const bk = { on: 'a', co: 'full', move: 'push' };
  const A = mayBlocky(bk, { neo, local: 0, dur: 1 }), B = mayBlocky(bk, { neo, local: 1, dur: 1 });
  assert.ok(dist(B.pos, B.look) < dist(A.pos, A.look));
});

test('tắt chuyển động (move=false) → khung đứng yên', () => {
  const bk = { on: 'a', co: 'full', move: 'crane-up' };
  const A = mayBlocky(bk, { neo, local: 0, dur: 1, move: false }), B = mayBlocky(bk, { neo, local: 1, dur: 1, move: false });
  assert.deepEqual(A.pos, B.pos);
});

test('whip: sau whip tâm nhìn ở chủ thể mới', () => {
  const B = mayBlocky({ on: 'a', co: 'medium', whip: { to: 'b', at: 0.2, dur: 0.2 } }, { neo, local: 0.9, dur: 1 });
  assert.ok(Math.abs(B.look[0] - 10) < 0.01);
});

test('nhắm điểm: tâm nhìn = điểm', () => {
  const F = frameShot({ on: [1, 3, -2], co: 'close' }, neo);
  assert.deepEqual(F.look, [1, 3, -2]);
});

test('punch thu hẹp fov sau mốc, rung tắt dần', () => {
  const bk = { on: 'a', co: 'medium', move: 'static' };
  const fx = [{ punch: 0.2, t: 0.5 }, { shake: 0.1, t: 0.5 }];
  const truoc = mayBlocky(bk, { neo, local: 0.4, dur: 1, fx }), sau = mayBlocky(bk, { neo, local: 0.9, dur: 1, fx });
  assert.ok(sau.fov < truoc.fov * 0.85);
  assert.equal(mayBlocky(bk, { neo, local: 0.99, dur: 1, fx }).shake, 0);
  assert.equal(mayBlocky(bk, { neo, local: 0.9, dur: 1, fx, punch: false }).fov, truoc.fov);
});
