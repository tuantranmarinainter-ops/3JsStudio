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

// ----- đợt 4: thử lại có giãn cách, tải song song có trần, tách pack (fetch giả, không gọi mạng) -----
import { thuLai, taiAsset, songSong, tachNhom, chonNhanVat, GIAN_THU_LAI } from '../roblox.mjs';
const res = (status, body = '') => ({ status, ok: status >= 200 && status < 300, json: async () => JSON.parse(body), arrayBuffer: async () => Buffer.from(body) });
const fetchGia = (kichBan) => { const goi = []; const f = async (url, opts) => { goi.push({ url, khoa: opts?.headers?.['x-api-key'] }); const k = kichBan.shift(); if (k instanceof Error) throw k; return k; }; f.goi = goi; return f; };

test('thuLai: 503 → 429 → 200, chờ đúng 0,5 s rồi 1,5 s, báo 429 một lần', async () => {
  const cho = []; let n429 = 0; const kb = [res(503), res(429), res(200, 'ok')];
  const r = await thuLai(async () => kb.shift(), { ngu: async (ms) => cho.push(ms), khi429: () => n429++ });
  assert.equal(r.status, 200); assert.deepEqual(cho, [500, 1500]); assert.equal(n429, 1);
  assert.deepEqual(GIAN_THU_LAI, [500, 1500, 4000]);
});
test('thuLai: hết 3 lượt thử lại thì trả response lỗi cuối; 404 không thử lại; lỗi mạng cũng thử lại', async () => {
  const cho = []; let n = 0;
  const r = await thuLai(async () => { n++; return res(503); }, { ngu: async (ms) => cho.push(ms) });
  assert.equal(r.status, 503); assert.equal(n, 4); assert.deepEqual(cho, [500, 1500, 4000]);
  n = 0; assert.equal((await thuLai(async () => { n++; return res(404); }, { ngu: async () => {} })).status, 404); assert.equal(n, 1);
  const kb = [new Error('ECONNRESET'), res(200)];
  assert.equal((await thuLai(async () => { const k = kb.shift(); if (k instanceof Error) throw k; return k; }, { ngu: async () => {} })).status, 200);
  await assert.rejects(thuLai(async () => { throw new Error('ECONNRESET'); }, { ngu: async () => {} }), /lỗi mạng: ECONNRESET/);
});
test('taiAsset: thử lại ở cả bước location lẫn CDN; khoá chỉ gửi cho Open Cloud, không gửi CDN', async () => {
  const loc = JSON.stringify({ location: 'https://cdn.example/x' });
  const f = fetchGia([res(503), res(200, loc), res(503), res(503), res(200, 'DULIEU')]);
  const b = await taiAsset('123', { fetch: f, khoa: 'KHOA-GIA', ngu: async () => {} });
  assert.equal(b.toString(), 'DULIEU'); assert.equal(f.goi.length, 5);
  assert.deepEqual(f.goi.map((g) => g.khoa), ['KHOA-GIA', 'KHOA-GIA', undefined, undefined, undefined]);
  assert.ok(f.goi[0].url.endsWith('/assetId/123')); assert.equal(f.goi[4].url, 'https://cdn.example/x');
});
test('taiAsset: hết lượt mới báo lỗi, ghi rõ id và bước hỏng; lỗi không lộ khoá', async () => {
  const loc = JSON.stringify({ location: 'https://cdn.example/x' });
  const o = (kb) => ({ fetch: fetchGia(kb), khoa: 'KHOA-GIA', ngu: async () => {} });
  await assert.rejects(taiAsset('77', o([res(200, loc), res(503), res(503), res(503), res(503)])), (e) => /asset 77: CDN HTTP 503 sau 4 lần thử/.test(e.message) && !e.message.includes('KHOA-GIA'));
  await assert.rejects(taiAsset('78', o([res(500), res(500), res(500), res(500)])), /asset 78: HTTP 500 sau 4 lần thử/);
  await assert.rejects(taiAsset('79', o([res(200, JSON.stringify({ errors: [{ code: 403, message: 'User is not authorized to access Asset.' }] }))])), /asset 79: Roblox từ chối \(403/);
  await assert.rejects(taiAsset('80', o([res(404)])), /asset 80: HTTP 404$/);
});
test('songSong: không vượt trần, giữ thứ tự kết quả, lỗi của một việc không chặn việc khác', async () => {
  let dang = 0, dinh = 0;
  const kq = await songSong([...Array(20).keys()], async (x) => { dang++; dinh = Math.max(dinh, dang); await new Promise((s) => setTimeout(s, 2)); dang--; if (x === 7) throw new Error('hỏng 7'); return x * 2; }, { tran: 6 });
  assert.equal(dinh, 6); assert.equal(kq.dinh, 6); assert.equal(kq.length, 20);
  assert.deepEqual(kq.filter((r) => r.ok).map((r) => r.v), [...Array(20).keys()].filter((x) => x !== 7).map((x) => x * 2));
  assert.equal(kq[7].ok, false); assert.equal(kq[7].loi.message, 'hỏng 7');
  assert.equal((await songSong([], async () => 1)).length, 0);
});
test('songSong: gặp 429 thì trần giảm một nửa (6 → 3 → 1), không xuống dưới 1', async () => {
  let dang = 0; const dinhSau = [];
  const kq = await songSong([...Array(30).keys()], async (x, _k, giam) => {
    dang++; if (x === 0 || x === 12) giam();
    await new Promise((s) => setTimeout(s, 2));
    if (x >= 20) dinhSau.push(dang);
    dang--; return x;
  }, { tran: 6 });
  assert.equal(kq.tranCuoi, 1); assert.equal(kq.dinh, 6); assert.ok(Math.max(...dinhSau) <= 1); assert.ok(kq.every((r) => r.ok));
  const k2 = await songSong([1, 2, 3], async (_x, _k, giam) => { giam(); giam(); giam(); giam(); }, { tran: 2 });
  assert.equal(k2.tranCuoi, 1);
});
test('tachNhom: hai nhân vật TRÙNG đường dẫn vẫn tách đúng theo partRefs; phần còn lại thành nhóm riêng', () => {
  const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const p = (ref, name, pth, pos) => ({ ref, name, path: pth, cframe: { pos, rot: I } });
  const parts = [p('a1', 'HumanoidRootPart', 'M.NPC', [0, 3, 0]), p('a2', 'Head', 'M.NPC', [0, 4.5, 0]), p('b1', 'HumanoidRootPart', 'M.NPC', [9, 3, 0]), p('b2', 'Head', 'M.NPC', [9, 4.5, 0]), p('c1', 'San', 'M', [0, 0, 0])];
  const nv = [{ path: 'M.NPC', partRefs: ['a1', 'a2'] }, { path: 'M.NPC', partRefs: ['b1', 'b2'] }];
  const g = tachNhom(parts, nv);
  assert.deepEqual(g.map((x) => [x.ten, x.slug, x.parts.map((q) => q.ref).join(',')]), [['M.NPC#1', 'npc', 'a2'], ['M.NPC#2', 'npc-2', 'b2'], ['(còn lại)', 'con-lai', 'c1']]);
  assert.deepEqual(g[1].parts[0].cframe.pos, [0, 1.5, 0]);                 // nhân vật thứ hai cũng về gốc
  assert.equal(chonNhanVat(nv, 'M.NPC#2'), nv[1]); assert.equal(chonNhanVat(nv, 'M.NPC'), nv[0]); assert.equal(chonNhanVat(nv, '#2'), nv[1]); assert.equal(chonNhanVat(nv, 'X'), null);
  const k = tachNhom([p('1', 'A', 'Nha.Ban', [0, 0, 0]), p('2', 'B', 'Nha.Ban.Chan', [0, 0, 0]), p('3', 'C', 'Nha.Ghe', [0, 0, 0]), p('4', 'D', 'Nha', [0, 0, 0])], []);
  assert.deepEqual(k.map((x) => [x.slug, x.parts.length]), [['ban', 2], ['ghe', 1], ['goc', 1]]);
});
