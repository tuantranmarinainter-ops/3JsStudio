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

// ----- đợt 2: tóm tắt model, ứng viên trang duyệt, nguồn roblox trong nhap-model -----
import { tomTatParts, ungVienDuyet, GIAY_PHEP } from '../roblox.mjs';
import { giayPhepHopLe, rbThongTin, fileUngVien, sapXepUngVien } from '../nhap-model.mjs';

test('tomTatParts: đếm loại mảnh, ảnh vân, decal, Union và số request cần', () => {
  const p = (o) => ({ class: 'Part', shape: 'Block', specialMeshes: [], decals: [], ...o });
  const t = tomTatParts([
    p({ decals: [{ texture: '11' }, { texture: '11' }, { texture: null }] }),
    p({ class: 'MeshPart', meshId: '21', textureId: '12' }),
    p({ class: 'MeshPart', meshId: '21', colorMap: '13' }),
    p({ specialMeshes: [{ meshId: '22', textureId: '14' }] }),
    p({ class: 'UnionOperation', csg: { Content: { id: '31' } } }),
    p({ class: 'WedgePart', shape: 'Wedge' }),
  ]);
  assert.equal(t.part, 6); assert.equal(t.mesh, 2); assert.equal(t.anh, 4); assert.equal(t.decal, 2); assert.equal(t.union, 1);
  assert.equal(t.request, 1 + 2 + 4 + 1);
  assert.deepEqual(t.loai, { 'Part/Block': 2, MeshPart: 2, UnionOperation: 1, WedgePart: 1 });
});
test('ungVienDuyet: đủ trường cho trang duyệt (ảnh, tam giác, tác giả, link, giấy phép)', () => {
  const [a, b] = ungVienDuyet(ketQuaTim(MAU, { tamGiacMax: 20000 }), { 1: '.cache/roblox/1/thumb.png' });
  assert.deepEqual(a, { id: 'roblox:1', ten: 'Gau mien phi', anh: ['.cache/roblox/1/thumb.png'], link: 'https://create.roblox.com/store/asset/1', linkTen: 'Creator Store',
    nguon: 'roblox', tacGia: 'tac_gia', giayPhep: 'Roblox Creator Store', tamGiac: 1000, phu: '90% thích' });
  assert.deepEqual(b.anh, []); assert.equal(b.phu, '');
});
test('nhap-model: roblox là nguồn hợp lệ, ứng viên vào file duyệt kèm ảnh xem trước', async () => {
  assert.equal(GIAY_PHEP, 'Roblox Creator Store');
  assert.ok(giayPhepHopLe('Roblox Creator Store')); assert.ok(!giayPhepHopLe('Roblox'));
  const ds = sapXepUngVien(ketQuaTim(MAU, { tamGiacMax: 20000 }).map(rbThongTin), 'vua');
  assert.equal(ds[0].gp.ma, 'Roblox Creator Store'); assert.equal(ds[0].url, 'https://create.roblox.com/store/asset/1');
  const f = await fileUngVien('Teddy Bear', ds, { nhan: { 'ly-tuong': 'lý tưởng' }, layAnh: async (ids) => Object.fromEntries(ids.map((i) => [i, `thumb-${i}.png`])) });
  assert.equal(f.nhomId, 'model-teddy-bear'); assert.equal(f.khe.length, 1); assert.equal(f.khe[0].id, 'teddy-bear');
  const u = f.khe[0].ungVien[0];
  assert.equal(u.id, 'roblox:1'); assert.deepEqual(u.anh, ['thumb-1.png']); assert.equal(u.nguon, 'roblox');
  assert.equal(u.giayPhep, 'Roblox Creator Store'); assert.equal(u.tamGiac, 1000); assert.equal(u.tacGia, 'tac_gia'); assert.equal(u.phu, 'lý tưởng');
});

// ----- đợt 3: nhân vật (NPC) -----
import { motNhanVat, chonIdAnh } from '../roblox.mjs';
test('motNhanVat: chỉ giữ mảnh của nhân vật, bỏ HumanoidRootPart, dựng thẳng về gốc', () => {
  const quay = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]];                       // xoay 90° quanh Y
  const p = (name, pth, pos) => ({ name, path: pth, cframe: { pos, rot: quay } });
  const r = motNhanVat([p('HumanoidRootPart', 'Pack.A', [10, 3, 5]), p('Head', 'Pack.A', [10, 4.5, 5]), p('Left Arm', 'Pack.A', [10, 3, 6.5]),
    p('Handle', 'Pack.A.Hair', [10, 5, 5]), p('Head', 'Pack.AB', [0, 0, 0]), p('Head', 'Pack.B', [20, 4.5, 5])], 'Pack.A');
  assert.deepEqual(r.map((x) => x.name), ['Head', 'Left Arm', 'Handle']);
  const gan = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  assert.ok(gan(r[0].cframe.pos, [0, 1.5, 0])); assert.ok(gan(r[2].cframe.pos, [0, 2, 0]));
  assert.ok(gan(r[1].cframe.pos, [-1.5, 0, 0]));                          // R0ᵀ·(0,0,1.5)
  assert.ok(r[0].cframe.rot.every((h, i) => gan(h, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i])));
  assert.equal(motNhanVat([p('Head', 'X', [0, 0, 0])], 'Khong').length, 0);
});
test('chonIdAnh: gỡ asset bọc ngoài — ưu tiên ShirtTemplate/Texture, bỏ mesh/âm thanh', () => {
  assert.equal(chonIdAnh([{ prop: 'MeshId', id: '1' }, { prop: 'ShirtTemplate', id: '2' }]), '2');
  assert.equal(chonIdAnh([{ prop: 'SoundId', id: '1' }, { prop: 'Image', id: '3' }]), '3');
  assert.equal(chonIdAnh([{ prop: 'MeshId', id: '1' }]), null); assert.equal(chonIdAnh(undefined), null);
});
