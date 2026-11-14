// Mặt R6 (engine/r6.js) là hàm thuần của trạng thái: tua tới/lui không để lại mặt cũ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { nap, engine } from './_three.mjs';

let draws = 0, faces = [];
const ctx = new Proxy(function () {}, { get: (_, k) => (k === 'canvas' ? {} : ctx), set: () => true, apply: () => ctx });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => { draws++; return ctx; } }) };

const THREE = await nap();
const R6 = await engine('r6.js');
// theo dõi mặt thực sự được vẽ bằng cách bọc showFace/setFace
function make(face = 'smile') {
  const c = R6.createR6(THREE, { face });
  const u = c.root.userData;
  const sf = u.showFace; u.showFace = (f) => { const before = draws; sf(f); if (draws !== before) faces.push(f); };
  return c;
}

test('pose không khai face → về mặt mặc định', () => {
  const c = make('smile'); let cur;
  const u = c.root.userData, sf = u.showFace; u.showFace = (f) => { cur = f; sf(f); };
  c.apply({ face: 'scared' }); assert.equal(cur, 'scared');
  c.apply({}); assert.equal(cur, 'smile');
});

test('A→B→A cho cùng mặt như chỉ áp A', () => {
  const run = (seq) => { const c = make('smile'); let cur = 'smile'; const u = c.root.userData, sf = u.showFace; u.showFace = (f) => { cur = f; sf(f); }; for (const p of seq) c.apply(p); return cur; };
  const A = { face: 'scared' }, B = {};
  assert.equal(run([A, B, A]), run([A]));
  assert.equal(run([B, A, B]), run([B]));
});

test('đổi mặt mặc định bằng setFace → pose không khai mặt dùng mặt mới', () => {
  const c = make('smile'); let cur;
  const u = c.root.userData, sf = u.showFace; u.showFace = (f) => { cur = f; sf(f); };
  c.apply({ face: 'scared' }); c.setFace('happy'); c.apply({}); assert.equal(cur, 'happy');
  // setFace thủ công khi đang hiện 'scared' rồi pose khai lại 'scared' phải vẽ lại
  c.apply({ face: 'scared' }); assert.equal(cur, 'scared');
});

test('áp cùng một mặt liên tiếp không vẽ lại canvas', () => {
  const c = make('smile');
  c.apply({ face: 'scared' });
  const n = draws;
  for (let i = 0; i < 5; i++) c.apply({ face: 'scared' });
  assert.equal(draws, n);
  c.apply({}); c.apply({}); c.apply({});
  assert.equal(draws, n + 1);   // đúng 1 lần để về mặt mặc định
});
