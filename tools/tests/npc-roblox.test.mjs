// Test tools/npc-roblox.mjs + khuôn áo quần của engine/r6-roblox.js (không cần mạng, không cần trình duyệt).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hex, mauThan, duongNhanVat, dongManifest } from '../npc-roblox.mjs';

test('hex + mauThan: sRGB 0..1 → #rrggbb, thiếu thì dùng màu Roblox cổ điển', () => {
  assert.equal(hex([1, 0.8, 0.6]), '#ffcc99');
  assert.equal(hex([2, -1, 0.5]), '#ff0080');
  const m = mauThan({ head: [1, 1, 1], torso: [0, 0, 0] });
  assert.equal(m.head, '#ffffff'); assert.equal(m.torso, '#000000'); assert.equal(m.leftLeg, '#a4bd47');
  assert.deepEqual(Object.keys(mauThan(null)), ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']);
});

test('duongNhanVat: nhân vật trùng path trong pack → thêm #n đếm từ 1', () => {
  const nv = [{ path: 'A.B' }, { path: 'A.B' }, { path: 'A.C' }, { path: 'A.B' }];
  assert.equal(duongNhanVat(nv, 0), 'A.B#1'); assert.equal(duongNhanVat(nv, 3), 'A.B#3'); assert.equal(duongNhanVat(nv, 2), 'A.C'); assert.equal(duongNhanVat(nv, 9), null);
});

test('dongManifest: đủ nguồn, tác giả, giấy phép, danh sách file', () => {
  const d = dongManifest({ ten: 'bach', robloxId: '123', tieuDe: 'Ông', tacGia: 'ai đó', shirt: true, pants: true, tshirt: false, acc: { soNode: 1 }, aoTu: '456' });
  assert.equal(d.id, 'characters/rb/bach'); assert.equal(d.license, 'Roblox Creator Store'); assert.equal(d.author, 'ai đó');
  assert.match(d.url, /store\/asset\/123$/); assert.match(d.credit, /asset\/456/);
  assert.deepEqual(d.files, ['look.json', 'shirt.png', 'pants.png', 'acc.glb']);
});

test('khuôn R6 trong engine/r6-roblox.js: đủ 6 mặt mỗi phần, nằm trong ảnh 585×559, không ô nào đè nhau', () => {
  const src = fs.readFileSync(new URL('../../engine/r6-roblox.js', import.meta.url), 'utf8');
  const khoi = src.match(/export const RB_KHUON = (\{[\s\S]*?\n\});/)[1];
  const K = new Function('return ' + khoi)();
  const o = [];
  for (const p of ['torso', 'right', 'left']) { assert.deepEqual(Object.keys(K[p]).sort(), ['B', 'D', 'F', 'L', 'R', 'U']); for (const [k, r] of Object.entries(K[p])) o.push([p + k, ...r]); }
  for (const [n, x, y, w, h] of o) assert.ok(x >= 0 && y >= 0 && x + w <= 585 && y + h <= 559, n);
  for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) { const [a, ax, ay, aw, ah] = o[i], [b, bx, by, bw, bh] = o[j];
    assert.ok(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay, `${a} đè ${b}`); }
  assert.deepEqual(K.torso.F.slice(2), [128, 128]); assert.deepEqual(K.right.F.slice(2), [64, 128]);
});

test('nguon.json + look.json đã dựng: mọi tham chiếu dau/ao tồn tại, file khai trong look có trên đĩa', () => {
  const dir = new URL('../../assets/characters/rb/', import.meta.url);
  const ng = JSON.parse(fs.readFileSync(new URL('nguon.json', dir), 'utf8'));
  for (const [t, v] of Object.entries(ng)) {
    for (const k of ['dau', 'ao']) if (v[k]) assert.ok(ng[v[k]], `${t}.${k} → ${v[k]}`);
    const f = new URL(`${t}/look.json`, dir); if (!fs.existsSync(f)) continue;
    const l = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert.match(l.mau.head, /^#[0-9a-f]{6}$/);
    for (const [k, file] of [['shirt', 'shirt.png'], ['pants', 'pants.png'], ['acc', 'acc.glb']]) if (l[k]) assert.ok(fs.existsSync(new URL(`${t}/${file}`, dir)), `${t}/${file}`);
  }
});
