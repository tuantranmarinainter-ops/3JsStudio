// face-pack: bộ mặt chọn bằng EPISODE.facePack (engine/face-pack.js) + dữ liệu assets/faces/altiwyre + công cụ tools/face-pack.mjs.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { nap, engine } from './_three.mjs';
import { gomIdAnh, phanLoai, loaiAnh, thongTinPng } from '../face-pack.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..'), D = path.join(ROOT, 'assets', 'faces', 'altiwyre');
let FP, R15;
before(async () => { await nap(); R15 = await engine('r15.js'); FP = await engine('face-pack.js'); });
const don = () => { delete globalThis.__facePacks; delete globalThis.__facePack; delete globalThis.__autoFx; delete globalThis.__emoteFaces; };

test('facePackName: tên lạ / thiếu → bộ cũ (tập cũ không khai báo giữ nguyên)', () => {
  assert.equal(FP.facePackName('altiwyre'), 'altiwyre'); assert.equal(FP.facePackName('emote37'), 'emote37');
  for (const v of [undefined, null, '', 'khong-co', 3]) assert.equal(FP.facePackName(v), 'emote37');
  assert.equal(FP.FACE_PACK_NEW, 'altiwyre'); assert.equal(FP.FACE_PACK_OLD, 'emote37');
  for (const [k, d] of Object.entries(FP.FACE_PACKS)) { assert.ok(d.base.startsWith('/assets/faces/'), k); assert.ok(['bbox', 'full'].includes(d.fit), k); }
});
test('activeFaceSet: theo tên bộ của tập, ô FX matAlti tắt → bộ cũ; thuần (gọi lại ra cùng kết quả)', () => {
  don();
  const cu = { binh_thuong: 1 }, moi = { binh_thuong: 2 };
  globalThis.__facePacks = { emote37: cu, altiwyre: moi };
  assert.equal(FP.activeFaceSet(), cu, 'chưa khai báo → bộ cũ');
  globalThis.__facePack = 'altiwyre';
  assert.equal(FP.activeFaceSet(), moi); assert.equal(FP.activeFaceSet(), moi);
  globalThis.__autoFx = { matAlti: false }; assert.equal(FP.activeFaceSet(), cu, 'tắt ô FX → bộ cũ');
  globalThis.__autoFx = { matAlti: true }; assert.equal(FP.activeFaceSet(), moi);
  globalThis.__facePack = 'emote37'; globalThis.__autoFx = { matAlti: true }; assert.equal(FP.activeFaceSet(), cu, 'tập chọn bộ cũ thì ô FX không đổi gì');
  don(); const fb = { x: 1 }; assert.equal(FP.activeFaceSet(fb), fb, 'chưa tải bộ nào → dùng bộ dự phòng'); assert.deepEqual(FP.activeFaceSet(), {});
  don();
});
test('loadFacePacks: tải bộ của tập + bộ cũ, gắn __fit/__name, có nhớ', async () => {
  don();
  const goi = [];
  const THREE = { SRGBColorSpace: 'srgb', TextureLoader: class { load(u, ok) { goi.push(u); ok({ url: u }); } } };
  const set = await FP.loadFacePacks(THREE, 'altiwyre');
  assert.equal(set.__name, 'altiwyre'); assert.equal(set.__fit, 'full'); assert.equal(globalThis.__facePack, 'altiwyre');
  assert.equal(Object.keys(set).length, 37, '__name/__fit không lọt vào danh sách khoá');
  assert.equal(globalThis.__facePacks.emote37.__fit, 'bbox');
  assert.equal(goi.length, 74); assert.ok(goi.includes('/assets/faces/altiwyre/24_quyet_tam.png')); assert.ok(goi.includes('/assets/faces/emote37/00_binh_thuong.png'));
  assert.equal(await FP.loadFacePack(THREE, 'altiwyre'), set); assert.equal(goi.length, 74, 'lần hai không tải lại');
  assert.equal(FP.activeFaceSet(), set);
  don(); goi.length = 0;
  const cu = await FP.loadFacePacks(THREE, undefined);
  assert.equal(cu.__name, 'emote37'); assert.equal(goi.length, 37, 'tập cũ chỉ tải bộ cũ');
  don();
});
test('assets/faces/altiwyre: map.json đủ 37 biểu cảm, mọi mã có ảnh, có ảnh ghép sẵn', () => {
  const map = JSON.parse(fs.readFileSync(path.join(D, 'map.json'), 'utf8')), parts = JSON.parse(fs.readFileSync(path.join(D, 'parts.json'), 'utf8'));
  const ten = R15.GA_FACES.map(([n, k]) => String(n).padStart(2, '0') + '_' + k);
  assert.deepEqual(Object.keys(map.map).sort(), ten.slice().sort());
  const co = new Set(parts.map((p) => p.ma));
  assert.equal(co.size, parts.length, 'mã bộ phận không trùng');
  for (const t of ten) {
    const m = map.map[t];
    assert.ok(Array.isArray(m.lop) && m.lop.length >= 2, t + ': cần ít nhất mắt + miệng');
    for (const ma of m.lop) { assert.ok(co.has(ma), `${t}: mã ${ma} không có trong parts.json`); assert.ok(fs.existsSync(path.join(D, 'parts', ma + '.png')), `thiếu parts/${ma}.png`); }
    assert.ok(['tot', 'tam', 'khong'].includes(m.khop), t);
    const b = fs.readFileSync(path.join(D, t + '.png')), i = thongTinPng(b);
    assert.equal(loaiAnh(b), 'png'); assert.equal(i.w, 512); assert.equal(i.h, 512); assert.ok(i.alpha, t + ': phải nền trong suốt');
  }
  assert.equal(map.nguon.robloxAssetId, 6557969904);
  const mf = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'manifest.json'), 'utf8')).find((x) => x.id === 'faces/altiwyre');
  assert.ok(mf && /AltiWyre/.test(mf.credit) && mf.license === 'Roblox Creator Store', 'manifest phải ghi nguồn + ghi công');
});
test('tools/face-pack: gom id ảnh từ dump + phân loại theo lưới trưng bày', () => {
  const P = (duoi, x, y, tex) => ({ path: 'A.-ALTIWYRE\'S FACE PACK-.' + duoi, name: 'Part', cframe: { pos: [x, y, -0.9] }, decals: [{ class: 'Decal', texture: tex }] });
  const parts = [
    P('[NEW].-EYES-.Decals', 66, 88, '1001'), P('[NEW].-EYES-.Decals', 66, 85, '1002'), P('[NEW].-EYES-.Decals', 62.5, 85, '1003'), P('[NEW].-EYES-.Decals', 66, 81.5, '1004'),
    P('[NEW].-MOUTHS-.-STILLS-.Decals', 66, 47, '2001'), P('[NEW].-MOUTHS-.-STILLS-.Decals', 62.5, 47, '2002'),
    P('[NEW].-MOUTHS-.-SPEECH-.Decals', 66, 63, '3001'), P('[OLD].EYES [OLD].Decals', 1, 1, '9999'),
    { path: 'A.[NEW].-EYES-', name: 'Title', cframe: { pos: [77, 90, -0.9] }, decals: [] },
  ];
  const ds = phanLoai(parts), ma = Object.fromEntries(ds.map((x) => [x.ma, x.id]));
  assert.deepEqual(ma, { ex01: '1001', 'e01-blank': '1002', 'e02-blank': '1003', 'e01-up': '1004', m01: '2001', m02: '2002', 's1-1': '3001' });
  const ids = gomIdAnh({ parts: [{ path: 'X.Y', meshId: '5555', textureId: 'rbxassetid://777777', decals: [{ texture: '1001' }, { texture: 'http://www.roblox.com/asset/?id=888888' }, { texture: null }] }] });
  assert.deepEqual(ids.map((x) => x.id).sort(), ['1001', '777777', '888888'], 'bỏ meshId, nhận id trần + rbxassetid + asset/?id=');
  assert.equal(ids[0].duong, 'X.Y');
});
