// Cỡ cảnh `co:` (engine/blocky/co-canh.js, công thức chép từ blocky-shorts) nối vào expandShot của engine/shottypes.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { apCoCanh, CO_NAMES } from '../../engine/blocky/co-canh.js';
import { expandShot } from '../../engine/shottypes.js';

const ctx = { places: { a: { pos: [0, 0, 0], ry: 0 } }, hero: 'hero' };

test('co: cỡ càng rộng thì máy càng xa; cận nhìn ngang đầu, toàn thân nhìn thấp hơn', () => {
  const cam = { fov: 40, look: [0, 0, 0] };
  const d = ['cucCan', 'can', 'trung', 'ngangDui', 'toanThan', 'rong', 'toanCanh'].map((c) => apCoCanh(cam, c).dist);
  for (let i = 1; i < d.length; i++) assert.ok(d[i] > d[i - 1], `dist tăng dần: ${d}`);
  assert.ok(apCoCanh(cam, 'can').look[1] > apCoCanh(cam, 'toanThan').look[1]);
  // chiều cao khung nhìn thấy = 2·khoảng xiên·tan(fov/2) = S của bảng (gốc blocky 'close' = 4.0; Việt 'can' = 2.8)
  const S = (c) => 2 * Math.hypot(c.dist, c.h) * Math.tan((40 / 2) * Math.PI / 180);
  assert.ok(Math.abs(S(apCoCanh(cam, 'close')) - 4.0) < 0.01);
  assert.ok(Math.abs(S(apCoCanh(cam, 'can')) - 2.8) < 0.01);
  assert.throws(() => apCoCanh(cam, 'khongCo'), /không có/);
  assert.ok(CO_NAMES.includes('close') && CO_NAMES.includes('toanThan'));
});

test('expandShot: không ghi co → camera y hệt cũ; ghi co → đổi dist/h/look, push vẫn áp sau', () => {
  const base = expandShot({ id: 'x', type: 'closeup', at: 'a' }, ctx);
  const again = expandShot({ id: 'x', type: 'closeup', at: 'a' }, ctx);
  assert.deepEqual(base.cam, again.cam);
  const co = expandShot({ id: 'x', type: 'closeup', at: 'a', co: 'trung' }, ctx);
  assert.notEqual(co.cam.dist, base.cam.dist);
  assert.ok(Math.abs(co.cam.dist2 - co.cam.dist * 0.72) < 1e-9, 'push = dist·0.72 tính trên dist mới');
});

test('expandShot: ô FX coCanh tắt → bỏ qua co', () => {
  const g = (globalThis.__autoFx ||= {}), old = g.coCanh;
  try {
    g.coCanh = false;
    const off = expandShot({ id: 'x', type: 'closeup', at: 'a', co: 'toanCanh' }, ctx);
    const base = expandShot({ id: 'x', type: 'closeup', at: 'a' }, ctx);
    assert.deepEqual(off.cam, base.cam);
  } finally { g.coCanh = old; }
});

test('expandShot: hai người cách xa → cỡ tự nới (máy lùi xa hơn một người)', () => {
  const one = expandShot({ id: 'x', type: 'dialogue', at: 'a', co: 'trung', with: 'mom' }, ctx);
  const solo = expandShot({ id: 'x', type: 'closeup', at: 'a', co: 'trung' }, ctx);
  assert.ok(one.cam.dist >= solo.cam.dist);
});
