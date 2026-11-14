// r6-rig: mặt là hàm thuần của pose + mặt mặc định (không giữ mặt của lần animate trước).
import test from 'node:test';
import assert from 'node:assert/strict';
import { nap, engine } from './_three.mjs';

const ctx = new Proxy(function () {}, { get: (_, k) => (k === 'canvas' ? {} : ctx), set: () => true, apply: () => ctx });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
const THREE = await nap();
const { createR6Rig } = await engine('r6-rig.js');

const img = { width: 8, height: 8 };
const FS = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? img : undefined) });   // mọi tên mặt đều có ảnh giả

test('animate có face rồi animate không face → về mặt mặc định; A→B→A = A', () => {
  const c = createR6Rig(THREE, { name: 't', face: 'smile', faceSet: FS });
  const seen = () => c.lastFace.ga;
  c.animate('idle', 0); const base = seen();
  c.animate('scared', 0.3); const A = seen();
  assert.notEqual(A, base);
  c.animate('idle', 0); assert.equal(seen(), base);
  c.animate('scared', 0.3); assert.equal(seen(), A);
  c.setFace('happy'); c.animate('idle', 0); assert.equal(c.options.face, 'happy');
  assert.notEqual(seen(), A);
});
