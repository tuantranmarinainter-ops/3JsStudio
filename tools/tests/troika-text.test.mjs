// Test nhẹ (không cần trình duyệt) cho chữ troika của bưu thiếp (engine/troika-text.js + engine/postcards.js).
// 'troika-three-text' (bare specifier, chỉ có trong importmap) được thay bằng bản giả qua hook resolve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFile } from 'node:fs/promises';

const stub = `export class Text { constructor(){ this.position={set(){}}; this.userData={}; this.textRenderInfo=null; }
  sync(cb){ if (globalThis.__troikaNever) return; const d = globalThis.__troikaSyncDelay ?? 0; setTimeout(()=>{ this.textRenderInfo={}; cb&&cb(); }, d).unref?.(); } }
export function configureTextBuilder(){}`;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n){ if (s === 'troika-three-text') return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(stub)}), shortCircuit: true }; return n(s, c); }`));

const THREE = {
  MeshStandardMaterial: class { constructor(o) { Object.assign(this, o); } },
  CanvasTexture: class { constructor(cv) { this.image = cv; this.userData = {}; } },
  SRGBColorSpace: 'srgb',
};
const noop = new Proxy(function () {}, { get: () => noop, apply: () => noop });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => noop }) };

test('FX_DEFAULTS.troikaText mặc định TẮT', async () => {
  const src = await readFile(new URL('../../engine/post.js', import.meta.url), 'utf8');
  assert.match(src, /FX_DEFAULTS\s*=\s*\{[^}]*\btroikaText:\s*false\b/s);
});

test('postcardTexture: khoá cache "plain" riêng, không lẫn texture có chữ', async () => {
  const { postcardTexture } = await import('../../engine/postcards.js');
  const a = postcardTexture(THREE, 'island'), p = postcardTexture(THREE, 'island', { plain: true });
  assert.notEqual(a, p);
  assert.equal(postcardTexture(THREE, 'island'), a);
  assert.equal(postcardTexture(THREE, 'island', { plain: true }), p);
});

test('makeLine: sync trễ hơn timeout thì ok() chốt false, không bật lại về sau', async () => {
  globalThis.__troikaSyncDelay = 80;
  const { makeLine } = await import('../../engine/troika-text.js');
  const L = makeLine(THREE, { text: 'x', size: 1, timeoutMs: 20 });
  await L.done;
  assert.equal(L.ok(), false);
  await new Promise((r) => setTimeout(r, 150));   // sync xong muộn
  assert.equal(L.obj.textRenderInfo !== null, true);
  assert.equal(L.ok(), false, 'ok() không được đổi sang true sau khi đã hết giờ');
});

test('makeLine: sync kịp giờ thì ok() true', async () => {
  globalThis.__troikaSyncDelay = 5;
  const { makeLine } = await import('../../engine/troika-text.js');
  const L = makeLine(THREE, { text: 'x', size: 1, timeoutMs: 500 });
  await L.done;
  assert.equal(L.ok(), true);
});

// Thiếp thật qua makePostcard (THREE giả tối thiểu) với ô troikaText BẬT.
const mk = () => { const o = { children: [], position: { set() {} }, userData: {}, add(c) { this.children.push(c); } }; return o; };
THREE.Group = class { constructor() { Object.assign(this, mk()); } updateMatrixWorld() {} };
THREE.Mesh = class { constructor(g, m) { Object.assign(this, mk()); this.material = m; this.position = { z: 0 }; this.rotation = {}; } };
THREE.PlaneGeometry = class {};
const card = async () => {
  globalThis.__troikaTimeoutMs = 40; globalThis.__post = { options: { troikaText: true } };
  const pc = await import('../../engine/postcards.js');
  const g = pc.makePostcard(THREE, 'island'); await pc.postcardsTroikaReady();
  return { pc, line: g.children[0].children[0] };   // Text của dòng đầu mặt trước
};

test('đổi ngôn ngữ khi ô BẬT: Settled() trả promise, resolve, rồi null; chữ đã đổi', async () => {
  globalThis.__troikaSyncDelay = 10; globalThis.__troikaNever = false;
  const { pc, line } = await card();
  assert.equal(pc.postcardsTroikaSettled(), null);
  pc.setPostcardLang('en');
  const p = pc.postcardsTroikaSettled();
  assert.ok(p && typeof p.then === 'function');
  await p;
  assert.equal(pc.postcardsTroikaSettled(), null);
  assert.equal(line.text, 'Wish you were here.');
  pc.setPostcardLang('vi'); await pc.postcardsTroikaSettled();
});

test('sync không bao giờ gọi callback: Settled() vẫn resolve sau timeout (không treo renderAt)', async () => {
  globalThis.__troikaSyncDelay = 0;
  const { pc } = await card();
  globalThis.__troikaNever = true;
  pc.setPostcardLang('en');
  const p = pc.postcardsTroikaSettled();
  assert.ok(p);
  await Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('treo')), 2000).unref())]);
  assert.equal(pc.postcardsTroikaSettled(), null);
  globalThis.__troikaNever = false;
});

test('ô TẮT: không resync, không bắt khung chờ', async () => {
  const { pc } = await card();
  globalThis.__post.options.troikaText = false;
  pc.setPostcardLang('vi');
  assert.equal(pc.postcardsTroikaSettled(), null);
});
