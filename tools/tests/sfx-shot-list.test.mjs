import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShotList, loadShotList } from '../sfx/shot-list.mjs';

test('định dạng f: [a,b] (ep001) — khung hình, b gồm cả, env/light đúng như ghi', () => {
  const r = buildShotList([{ id: 's001', f: [0, 29], env: 'town' }, { id: 's002', f: [30, 59], env: 'island', light: 'night', events: { doorOpen: 0.5 } }]);
  assert.equal(r.shots[0].t1, 1); assert.equal(r.shots[1].t0, 1); assert.equal(r.total, 2);
  assert.equal(r.shots[1].light, 'night'); assert.equal(r.shots[1].events.doorOpen, 0.5);
});
test('định dạng dur (tập sinh) — cộng dồn giây, env suy từ at/EPISODE, time dem → night', () => {
  const r = buildShotList([{ id: 's1', dur: 1.5, at: 'street', time: 'sang' }, { id: 's2', dur: 2, at: 'bedroom_in', time: 'dem' }, { id: 's3', dur: 1, env: 'factory', at: 'factory_in' }], { env: 'kenneyTown' });
  assert.deepEqual(r.shots.map((s) => [s.t0, s.t1, s.env, s.light]), [[0, 1.5, 'kenneyTown', ''], [1.5, 3.5, 'bedroom', 'night'], [3.5, 4.5, 'factory', '']]);
  assert.equal(r.total, 4.5);
});
test('tệp thật: ep001 (145 shot) và ep002 (114 shot) đều đọc được', async () => {
  const a = await loadShotList('ep001'), b = await loadShotList('ep002');
  assert.equal(a.shots.length, 145); assert.equal(b.shots.length, 114);
  assert.ok(Math.abs(b.total - 175.95) < 0.1);
});
