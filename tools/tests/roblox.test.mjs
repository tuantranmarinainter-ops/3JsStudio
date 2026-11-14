// tools/roblox.mjs — lọc/định dạng kết quả tìm, tách id, khoá không lọt ra chuỗi in (không gọi mạng).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ketQuaTim, dinhDangBang, layId, che, phanTich, loaiAnh } from '../roblox.mjs';

const it = (id, ten, { gia = 0, tg = 1000, mp = 2, sc = 0, has = false, up = 0.9, vc = 10 } = {}) => ({
  creator: { name: 'tac_gia', userId: 1, verified: false },
  creatorStoreProduct: { purchasePrice: { quantity: { significand: gia, exponent: 0 } }, purchasable: true },
  voting: { upVotePercent: up, voteCount: vc },
  asset: { id: Number(id), name: ten, hasScripts: has, scriptCount: sc, objectMeshSummary: { triangles: tg, vertices: 1 }, instanceCounts: { meshPart: mp, script: sc } },
});
const MAU = { nextPageToken: 'x', creatorStoreAssets: [
  it(1, 'Gau mien phi'), it(2, 'Gau tra tien', { gia: 5 }), it(3, 'Gau co script', { has: true, sc: 2 }),
  it(4, 'Gau nang', { tg: 50000 }), it(5, 'Khong vote', { vc: 0, up: 0 }),
] };

test('lọc: chỉ miễn phí, ẩn script, ẩn quá tam giác', () => {
  const r = ketQuaTim(MAU, { tamGiacMax: 20000 });
  assert.deepEqual(r.map((x) => x.id), ['1', '5']);
});
test('--co-script hiện lại mẫu có script; không có giới hạn tam giác thì giữ mẫu nặng', () => {
  assert.deepEqual(ketQuaTim(MAU, { coScript: true }).map((x) => x.id), ['1', '3', '4', '5']);
});
test('trường kết quả + % thích + link', () => {
  const [a, b] = ketQuaTim(MAU, { tamGiacMax: 20000 });
  assert.equal(a.tamGiac, 1000); assert.equal(a.meshPart, 2); assert.equal(a.thich, 90);
  assert.equal(b.thich, null);
  assert.equal(a.link, 'https://create.roblox.com/store/asset/1');
});
test('bảng có đủ cột và đúng số dòng', () => {
  const t = dinhDangBang(ketQuaTim(MAU, { tamGiacMax: 20000 })).split('\n');
  assert.equal(t.length, 3);
  for (const c of ['id', 'tên', 'tác giả', 'tam giác', 'meshPart', 'script', '% thích', 'link']) assert.ok(t[0].includes(c), c);
  assert.ok(t[1].includes('90%') && t[2].includes('?'));
});
test('tách id từ link / rbxassetid / ?id= / số trần', () => {
  for (const s of ['https://create.roblox.com/store/asset/4919878545/Teddy-Bear', 'create.roblox.com/store/asset/4919878545',
    'rbxassetid://4919878545', 'http://www.roblox.com/asset/?id=4919878545', 'https://www.roblox.com/library/4919878545/x', '4919878545', ' 4919878545 '])
    assert.equal(layId(s), '4919878545', s);
  for (const s of ['', 'abc', '12', null, undefined]) assert.equal(layId(s), null, String(s));
});
test('khoá không xuất hiện trong chuỗi in ra', () => {
  const khoa = 'ABCDEFGH-secret-key-0123456789';
  const loiMang = `fetch failed https://x/?k=${khoa} header x-api-key: ${khoa}`;
  const out = che(loiMang, khoa);
  assert.ok(!out.includes(khoa)); assert.ok(out.includes('***'));
  // bảng kết quả / JSON in ra cũng không chứa khoá
  const bang = che(dinhDangBang(ketQuaTim(MAU)) + JSON.stringify(ketQuaTim(MAU)), khoa);
  assert.ok(!bang.includes(khoa));
  // khoá quá ngắn thì không che (tránh phá chuỗi)
  assert.equal(che('abc', 'a'), 'abc');
});
test('khoá thật (nếu có) không lọt vào bảng/JSON in ra', async () => {
  const { docEnv } = await import('../roblox.mjs');
  const k = docEnv().ROBLOX_API_KEY;
  if (!k) return;
  const s = che(dinhDangBang(ketQuaTim(MAU)) + JSON.stringify(MAU));
  assert.ok(!s.includes(k));
  // mã nguồn không chứa khoá
  const fs = await import('node:fs');
  for (const f of ['../roblox.mjs', '../blender/roblox_ghep.py', './roblox.test.mjs'])
    assert.ok(!fs.readFileSync(new URL(f, import.meta.url), 'utf8').includes(k), f);
});
test('phân tích đối số + nhận diện ảnh', () => {
  const a = phanTich(['teddy', 'bear', '--so', '5', '--co-script', '--json']);
  assert.deepEqual(a._, ['teddy', 'bear']); assert.equal(a.so, '5'); assert.equal(a['co-script'], true); assert.equal(a.json, true);
  assert.equal(loaiAnh(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0])), 'png');
  assert.equal(loaiAnh(Buffer.from('<roblox')), null);
});
