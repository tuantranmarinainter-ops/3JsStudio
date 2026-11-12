// Vòng tự sửa tools/ra-loi.mjs + tools/kiem/sua.mjs. Không cần trình duyệt: kiem-luat và ghép ảnh được tiêm vào.
// Gốc giả = thư mục tạm (episodes/_test_raloi, output/_test_raloi) — tự dọn, không đụng repo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { raLoi, chenKhoa, chay } from '../ra-loi.mjs';
import { CACH_SUA, xoayGoc, luiCamera, themZoom, keoDaiShot, batHat, canGiuaVatDoc, doiGocTranhChe, themDoPhuTheoTang } from '../kiem/sua.mjs';
import { docNhatKy } from '../kiem/trang-thai.mjs';

const EP = '_test_raloi';
const ng = { goi: { vongMax: 2 } };
const goc0 = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ra-loi-test-'));

function dung(goc, shotsTxt, luat) {
  fs.mkdirSync(path.join(goc, 'episodes', EP), { recursive: true });
  fs.mkdirSync(path.join(goc, 'output', EP, 'kiem'), { recursive: true });
  fs.writeFileSync(path.join(goc, 'episodes', EP, 'shots.js'), shotsTxt);
  fs.writeFileSync(path.join(goc, 'output', EP, 'kiem', 'luat.json'), JSON.stringify(luat));
}
const rec = (type, dur, ma, kq) => ({ type, dur, khung: [1, 5, 9], luat: { [ma]: kq }, loi: [ma] });
const luatDe = (shots, extra = {}) => ({ ep: EP, trang: 'episodes/' + EP + '/index.html', shots, tong: {}, goi: { can: false, lyDo: [] }, loiShot: [], ...extra });
const doc = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const anhGia = async () => {};

test('L11: shot ngắn -> sau 1 vòng dur = ngưỡng, nhật ký đúng 1 dòng, mã 0', async () => {
  const goc = goc0();
  const txt = "export const SHOTS = [\n  { id: 's001', dur: 0.4, type: 'closeup', who: 'hero' },  // ghi chú\n  { id: 's002', dur: 2, type: 'establish' },\n];\n";
  dung(goc, txt, luatDe({ s001: rec('closeup', 0.4, 'L11', { ok: false, val: 0.4, nguong: 0.8 }), s002: { type: 'establish', dur: 2, khung: [1, 2, 3], luat: {}, loi: [] } }));
  let goi = 0;
  const kiemLuat = async ({ ids }) => {
    goi++;
    assert.deepEqual(ids, ['s001']);
    const mod = await import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(goc, 'episodes', EP, 'shots.js'))).toString('base64'));
    const s1 = mod.SHOTS.find((s) => s.id === 's001');
    const ok = s1.dur >= 0.8;
    return luatDe({ s001: { type: 'closeup', dur: s1.dur, khung: [1, 5, 9], luat: { L11: { ok, val: s1.dur, nguong: 0.8 } }, loi: ok ? [] : ['L11'] }, s002: { type: 'establish', dur: 2, khung: [1, 2, 3], luat: {}, loi: [] } });
  };
  const r = await raLoi(EP, { goc, kiemLuat, ghepAnh: anhGia });
  assert.equal(r.ma, 0);
  assert.equal(goi, 1);
  const mod = await import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(goc, 'episodes', EP, 'shots.js'))).toString('base64'));
  assert.equal(mod.SHOTS[0].dur, 0.8);
  assert.equal(mod.SHOTS[1].dur, 2);
  assert.match(fs.readFileSync(path.join(goc, 'episodes', EP, 'shots.js'), 'utf8'), /\/\/ ghi chú/);
  const nk = docNhatKy(EP, { goc }).filter((d) => d.buoc === 'ra-loi');
  assert.equal(nk.length, 1);
  assert.equal(nk[0].shot, 's001'); assert.equal(nk[0].luat, 'L11'); assert.equal(nk[0].hanh_dong, 'sua');
  assert.equal(fs.readFileSync(path.join(goc, 'output', EP, 'kiem', 'nhat-ky.jsonl'), 'utf8').trim().split('\n').length, 1);
  assert.equal(doc(path.join(goc, 'output', EP, 'kiem', 'trang-thai.json')).buoc['ra-loi'].xong, true);
  fs.rmSync(goc, { recursive: true, force: true });
});

test('L9: không patch, goi.can, mã 1, shots.js nguyên vẹn, không gọi kiem-luat', async () => {
  const goc = goc0();
  const txt = "export const SHOTS = [\n  { id: 's001', dur: 1, type: 'insert' },\n];\n";
  dung(goc, txt, luatDe({ s001: rec('insert', 1, 'L9', { ok: false, val: { loi: ['x:nguon=chua-va'] }, nguong: {} }) }));
  let goi = 0;
  const r = await raLoi(EP, { goc, kiemLuat: async () => { goi++; return {}; }, ghepAnh: anhGia });
  assert.equal(r.ma, 1);
  assert.equal(goi, 0);
  assert.equal(r.goi.can, true);
  assert.equal(r.daSua.length, 0);
  assert.equal(r.khongSua[0].lyDo, 'khong-tu-sua');
  assert.match(r.goi.lyDo.join(' '), /khong tu sua/);
  assert.equal(fs.readFileSync(path.join(goc, 'episodes', EP, 'shots.js'), 'utf8'), txt);
  assert.ok(fs.existsSync(path.join(goc, 'output', EP, 'kiem', 'ra-loi.json')));
  fs.rmSync(goc, { recursive: true, force: true });
});

test('12 shot lỗi vẫn lỗi sau sửa -> dừng sau 2 vòng, mã 1, có goi.lyDo', async () => {
  const goc = goc0();
  const ids = Array.from({ length: 12 }, (_, i) => 's' + String(i + 1).padStart(3, '0'));
  const txt = 'export const SHOTS = [\n' + ids.map((id) => `  { id: '${id}', dur: 1.5, type: 'closeup', cam: { at: 'hero', dist: 10, dist2: 10, yaw: 0 } },`).join('\n') + '\n];\n';
  const mk = () => luatDe(Object.fromEntries(ids.map((id) => [id, rec('closeup', 1.5, 'L4', { ok: false, val: 45, nguong: { psnrMax: 30 } })])), { goi: { can: true, lyDo: ['shot-loi 12 > 10'] } });
  dung(goc, txt, mk());
  let vong = 0;
  const r = await raLoi(EP, { goc, kiemLuat: async () => { vong++; return mk(); }, ghepAnh: anhGia });
  assert.equal(r.ma, 1);
  assert.equal(vong, 2);
  assert.equal(r.soVong, 2);
  assert.equal(r.daSua.length, 24);
  assert.equal(r.soShotLoi, 12);
  assert.ok(r.goi.can);
  assert.match(r.goi.lyDo.join(' '), /shot-loi 12 > 10/);
  assert.equal(r.conLai.length, 12);
  fs.rmSync(goc, { recursive: true, force: true });
});

test('--thu: in patch, không ghi shots.js / nhật ký / trạng thái', async () => {
  const goc = goc0();
  const txt = "export const SHOTS = [\n  { id: 's001', dur: 0.4, type: 'closeup' },\n];\n";
  dung(goc, txt, luatDe({ s001: rec('closeup', 0.4, 'L11', { ok: false, val: 0.4, nguong: 0.8 }) }));
  const r = await raLoi(EP, { goc, thu: true, kiemLuat: async () => { throw new Error('khong duoc goi'); } });
  assert.equal(r.ma, 0);
  assert.equal(r.patch.length, 1);
  assert.deepEqual(r.patch[0].patch, { dur: 0.8 });
  assert.equal(fs.readFileSync(path.join(goc, 'episodes', EP, 'shots.js'), 'utf8'), txt);
  assert.ok(!fs.existsSync(path.join(goc, 'output', EP, 'kiem', 'nhat-ky.jsonl')));
  assert.ok(!fs.existsSync(path.join(goc, 'output', EP, 'kiem', 'trang-thai.json')));
  fs.rmSync(goc, { recursive: true, force: true });
});

test('thiếu luat.json -> mã 2', async () => {
  const goc = goc0();
  fs.mkdirSync(path.join(goc, 'episodes', EP), { recursive: true });
  fs.writeFileSync(path.join(goc, 'episodes', EP, 'shots.js'), 'export const SHOTS = [];\n');
  assert.equal(await chay([EP], { goc }), 2);
  assert.equal(await chay([], { goc }), 2);
  fs.rmSync(goc, { recursive: true, force: true });
});

test('chenKhoa: shot nhiều dòng + gọi hàm, gộp cam, chạy lại thì thay chứ không lặp', async () => {
  const txt = [
    'const orb = (at, yaw, dist, h, o = {}) => ({ at, yaw, dist, h, ...o });',
    'export const SHOTS = [',
    "  { id: 's010', f: [330, 385], env: 'bedroom', note: 'a}b{',",
    '    cam: orb([0, 1, 2], 0.1, 20, 2, { dist2: 30 }),',
    '    cast: { hero: { anim: "idle" } } },  // het',
    "  { id: 's011', f: [386, 400] },",
    '];',
    '',
  ].join('\n');
  const doTxt = async (t) => (await import('data:text/javascript;base64,' + Buffer.from(t).toString('base64'))).SHOTS;
  const goc = (await doTxt(txt))[0];
  const t1 = chenKhoa(txt, 's010', { cam: { ...goc.cam, dist: 25, dist2: 37.5 } });
  const s1 = await doTxt(t1);
  assert.equal(s1[0].cam.dist, 25); assert.equal(s1[0].cam.yaw, 0.1); assert.equal(s1[0].note, 'a}b{');
  assert.deepEqual(s1[1], { id: 's011', f: [386, 400] });
  assert.match(t1, /\/\/ het/);
  const t2 = chenKhoa(t1, 's010', { cam: { ...goc.cam, dist: 31 } });
  assert.equal((t2.match(/ra-loi\*\/ cam:/g) || []).length, 1);
  assert.equal((await doTxt(t2))[0].cam.dist, 31);
  assert.equal(chenKhoa(txt, 's999', { dur: 1 }), null);
});

test('cách sửa chịu được type null / thiếu cam, trả null thay vì ném lỗi', () => {
  const sd = { id: 's1', f: [0, 10], type: null };
  const kq = { ok: false, val: { le: 0.01, canh: 'trai' }, nguong: {} };
  for (const [ma, ds] of Object.entries(CACH_SUA)) for (const f of ds) assert.equal(f(sd, kq, {}), null, ma + ' ' + f.name);
  assert.equal(luiCamera({ _type: null }, kq), null);
  assert.equal(themDoPhuTheoTang({}, kq), null);
});

test('luiCamera nhân cả dist lẫn dist2, giữ chiều zoom', () => {
  const r = luiCamera({ cam: { dist: 20, dist2: 10 } }, { ok: false, val: {} });
  assert.deepEqual(r.patch.cam, { dist: 25, dist2: 12.5 });
  assert.ok(r.moTa);
});

test('themZoom: 1 người zoom vào, nhà/đám đông zoom ra, không đảo hướng, shot static bỏ qua', () => {
  const kq = { ok: false, val: 45 };
  assert.equal(themZoom({ type: 'closeup', cam: { dist: 10 } }, kq).patch.cam.dist2, 7.2);
  assert.equal(themZoom({ type: 'houseFull', cam: { dist: 10 } }, kq).patch.cam.dist2, 13);
  assert.equal(themZoom({ house: {}, cam: { dist: 10, dist2: 10.1 } }, kq).patch.cam.dist2, 13);
  assert.equal(themZoom({ type: 'closeup', cam: { dist: 10, dist2: 14 } }, kq), null);
  assert.equal(themZoom({ type: 'closeup', cam: { dist: 10 }, static: true }, kq), null);
  assert.deepEqual(themZoom({ type: 'crowd' }, kq).patch, { move: 'pull' });
});

test('keoDaiShot: dur -> ngưỡng; shot khai f không kéo được', () => {
  assert.deepEqual(keoDaiShot({ dur: 0.5 }, { ok: false, val: 0.5, nguong: 1.5 }).patch, { dur: 1.5 });
  assert.equal(keoDaiShot({ f: [0, 5] }, { ok: false, val: 0.2, nguong: 0.8 }), null);
});

test('batHat: thêm bụi theo tên chân; không lặp lại; hạt thời tiết -> null', () => {
  const kq = { ok: false, val: { thieu: ['house_illus/leg_FR', 'house_illus/leg_BL'] } };
  const r = batHat({ _dur: 1, house: { at: [0, 0], to: [0, 14] } }, kq);
  assert.equal(r.patch.fx.dust.length, 2);
  assert.deepEqual(r.patch.fx.dust[0].at, [24, 0, 28]);
  assert.equal(batHat({ _dur: 1, house: { at: [0, 0], to: [0, 14] }, fx: r.patch.fx }, kq), null);
  assert.equal(batHat({ _dur: 1 }, { ok: false, val: { thieu: ['hat.tuyet'] } }), null);
});

test('L2: dịch điểm nhìn về tâm, giảm fill; đổi góc tránh che đổi phía theo vòng', () => {
  const kq = { ok: false, val: { lech: 0.2, dx: 0.1, dy: -0.1, che: 0, rong: 0.95 } };
  const r = canGiuaVatDoc({ type: 'insertRead', cam: { look: [0, 0, 0], yaw: 0 } }, kq, { L2: {} });
  assert.ok(r.patch.cam.look[0] > 0 && r.patch.cam.look[1] > 0);
  assert.equal(r.patch.fill, 0.48);
  const c = { ok: false, val: { cheMat: 0.5 } };
  assert.equal(doiGocTranhChe({ cam: { yaw: 0 }, _vong: 1 }, c, { L3: {} }).patch.cam.yaw, 0.3);
  assert.equal(doiGocTranhChe({ cam: { yaw: 0.3 }, _vong: 2 }, c, { L3: {} }).patch.cam.yaw, -0.3);
  assert.equal(doiGocTranhChe({ cam: { yaw: 0 } }, { ok: false, val: { cheMat: 0.1 } }, { L3: {} }), null);
});

test('I1: còn 3 lỗi thường dưới ngưỡng -> goi.can false, mã 0, bước xong, liệt kê conLai', async () => {
  const goc = goc0();
  const ids = ['s001', 's002', 's003'];
  const txt = 'export const SHOTS = [\n' + ids.map((id) => `  { id: '${id}', dur: 1.5, type: 'closeup', cam: { at: 'hero', dist: 10, dist2: 10, yaw: 0 } },`).join('\n') + '\n];\n';
  const mk = () => luatDe(Object.fromEntries(ids.map((id) => [id, rec('closeup', 1.5, 'L4', { ok: false, val: 45, nguong: { psnrMax: 30 } })])));
  dung(goc, txt, mk());
  const r = await raLoi(EP, { goc, kiemLuat: async () => mk(), ghepAnh: anhGia });
  assert.equal(r.goi.can, false);
  assert.equal(r.ma, 0);
  assert.equal(r.conLai.length, 3);
  assert.equal(r.khongSua.length, 0);
  assert.equal(doc(path.join(goc, 'output', EP, 'kiem', 'trang-thai.json')).buoc['ra-loi'].xong, true);
  assert.equal(doc(path.join(goc, 'output', EP, 'kiem', 'ra-loi.json')).conLai.length, 3);
  fs.rmSync(goc, { recursive: true, force: true });
});

test('I1: L10 còn lỗi sau vòng sửa vẫn gọi; luat.goi vượt ngưỡng vẫn gọi', async () => {
  const goc = goc0();
  const txt = "export const SHOTS = [\n  { id: 's001', dur: 1.5, type: 'closeup', cam: { at: 'hero', dist: 10, yaw: 0 } },\n];\n";
  const mk = () => luatDe({ s001: rec('closeup', 1.5, 'L10', { ok: false, val: { dienTich: 0.5, thieu: ['hero'] }, nguong: { dienTichMin: 0.04 } }) });
  dung(goc, txt, mk());
  const r = await raLoi(EP, { goc, kiemLuat: async () => mk(), ghepAnh: anhGia });
  assert.equal(r.ma, 1);
  assert.match(r.goi.lyDo.join(' '), /L10/);
  fs.rmSync(goc, { recursive: true, force: true });
});

test('M1: follow/walkBy 1 người zoom vào; có with hoặc nhà zoom ra', () => {
  const kq = { ok: false, val: 45 };
  assert.equal(themZoom({ type: 'follow', who: 'hero', cam: { dist: 10 } }, kq).patch.cam.dist2, 7.2);
  assert.equal(themZoom({ type: 'walkBy', who: 'hero', cam: { dist: 10 } }, kq).patch.cam.dist2, 7.2);
  assert.equal(themZoom({ type: 'chase', who: 'hero', with: 'crowd1', cam: { dist: 10 } }, kq).patch.cam.dist2, 13);
});

test('M2: dist2 sau khuếch đại không âm', () => {
  const r = themZoom({ type: 'closeup', cam: { dist: 10, dist2: 3 } }, { ok: false, val: 45 });
  assert.ok(r.patch.cam.dist2 >= 3);
});

test('M3: L10 chủ thể quá nhỏ không lùi camera, vẫn xoay góc', () => {
  const kq = { ok: false, val: { dienTich: 0.02, thanhPhan: 1 }, nguong: { dienTichMin: 0.04 } };
  assert.equal(luiCamera({ cam: { dist: 10 } }, kq), null);
  assert.ok(xoayGoc({ cam: { yaw: 0 } }, kq));
  assert.ok(luiCamera({ cam: { dist: 10 } }, { ok: false, val: { dienTich: 0.5, thieu: ['hero'] }, nguong: { dienTichMin: 0.04 } }));
});
