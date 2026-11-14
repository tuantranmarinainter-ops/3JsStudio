// Test tools/gau-ke.mjs (đặt nơ, hệ trục, manifest) + công tắc engine/gau-ke.js (không cần mạng, không cần trình duyệt).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { quay, hopBao, datNo, dongManifest, GAU_KE } from '../gau-ke.mjs';

test('quay: +X → +Z, −Z → +X, giữ y', () => {
  assert.deepEqual(quay([1, 2, 0]).map((v) => v + 0), [0, 2, 1]);
  assert.deepEqual(quay([0, 5, -1]).map((v) => v + 0), [1, 5, 0]);
});

test('datNo: tâm nơ về đúng cổ gấu, cỡ nhân theo tỷ lệ', () => {
  const P = Float32Array.from([-1, 0, -2, 1, 2, -1]), hb = hopBao(P), ra = datNo(P, hb.tam, 2, [0.3, 1.4, 0]), h2 = hopBao(ra);
  h2.tam.forEach((v, k) => assert.ok(Math.abs(v - [0.3, 1.4, 0][k]) < 1e-5));
  assert.ok(Math.abs(h2.cỡ[1] - hb.cỡ[1] * 2) < 1e-5); assert.ok(Math.abs(h2.cỡ[0] - hb.cỡ[2] * 2) < 1e-5);   // trục z cũ thành x
});

test('dongManifest: ghi đủ hai nguồn Roblox', () => {
  const d = dongManifest();
  assert.equal(d.id, 'characters/rb/gau_ke'); assert.equal(d.src, GAU_KE.ra); assert.equal(d.license, 'Roblox Creator Store');
  assert.match(d.url, new RegExp(GAU_KE.than)); assert.match(d.credit, new RegExp(GAU_KE.no));
});

test('engine/gau-ke.js: mặc định TẮT; __gauKe=true mới muốn bật; chưa nạp model → gauKeOn=false, gauKeStatic/gauKeTach = null', async () => {
  const G = await import('../../engine/gau-ke.js');
  delete globalThis.__gauKe; assert.equal(G.gauKeWanted(), false);
  globalThis.__gauKe = true; assert.equal(G.gauKeWanted(), true); assert.equal(G.gauKeOn(), false);
  assert.equal(G.gauKeStatic({}, 0), null); assert.equal(G.gauKeTach({}), null);
  delete globalThis.__gauKe;
});

test('model đã dựng có trên đĩa và hai bối cảnh nhà máy đều có đường quay về gấu cũ', () => {
  assert.ok(fs.statSync(new URL('../../' + GAU_KE.ra, import.meta.url)).size > 50000);
  for (const f of ['factory.js', 'e3-nha-may.js']) assert.match(fs.readFileSync(new URL('../../engine/envs/' + f, import.meta.url), 'utf8'), /gauKeOn\(\)/);
});
