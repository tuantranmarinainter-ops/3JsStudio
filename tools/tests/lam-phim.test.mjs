import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const THU_TU = ['kich-ban', 'giong', 'asset', 'mau-duyet', 'shot', 'ra-loi', 'am-thanh', 'gop'];
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEN = [];
function tapGia(hau, { kb = true } = {}) {
  const ep = `_test_lamphim${hau}`;
  TEN.push(ep);
  xoa(ep);
  fs.mkdirSync(path.join(GOC, 'episodes', ep), { recursive: true });
  if (kb) fs.writeFileSync(path.join(GOC, 'episodes', ep, 'kich-ban.md'), '# kịch bản giả\n');
  return ep;
}
function xoa(ep) {
  for (const d of [`episodes/${ep}`, `output/${ep}`]) fs.rmSync(path.join(GOC, d), { recursive: true, force: true });
  for (const f of fs.existsSync(path.join(GOC, 'dist')) ? fs.readdirSync(path.join(GOC, 'dist')) : []) if (f.startsWith(ep)) fs.rmSync(path.join(GOC, 'dist', f), { force: true });
}
after(() => TEN.forEach(xoa));

function lam(ep, ...a) {
  const r = spawnSync(process.execPath, ['tools/lam-phim.mjs', ep, ...a], { cwd: GOC, encoding: 'utf8', env: { ...process.env, LAM_PHIM_GIA: '1' } });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* để assert báo */ }
  return { ma: r.status, json, loi: r.stderr, out: r.stdout };
}
const giaLog = (ep) => {
  const f = path.join(GOC, 'output', ep, 'kiem', 'gia.log');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
};
const thuTu = (dong) => { const o = []; for (const d of dong) if (o[o.length - 1] !== d.buoc) o.push(d.buoc); return o; };

test('tiep: đi đủ 8 bước đúng thứ tự, rồi chạy lại không bước nào chạy lại', () => {
  const ep = tapGia('1');
  const a = lam(ep, 'tiep');
  assert.equal(a.ma, 0, a.loi);
  assert.deepEqual(a.json.daChay, THU_TU);
  assert.equal(a.json.buocTiep, null);
  assert.equal(a.json.canNguoiDung, null);
  assert.deepEqual(a.json.canAgent, []);
  assert.deepEqual(thuTu(giaLog(ep)), THU_TU);
  assert.ok(a.json.lien.phim.file.startsWith('file:///') && a.json.lien.phim.duongDan.endsWith(`${ep}.html`), 'link phim cuối');
  assert.ok(a.json.lien.theoDoi.duongDan.endsWith(`${ep}_theo-doi.html`));
  // giọng: --dry trước, rồi chạy nền
  const g = giaLog(ep).filter((d) => d.buoc === 'giong').map((d) => d.lenh);
  assert.ok(g[0].includes('--dry') && !g[1].includes('--dry'), g.join(' | '));
  const n = giaLog(ep).length;

  const b = lam(ep, 'tiep');
  assert.equal(b.ma, 0, b.loi);
  assert.deepEqual(b.json.daChay, []);
  assert.deepEqual(b.json.daBo, THU_TU);
  assert.equal(giaLog(ep).length, n, 'không lệnh con nào chạy lại');
});

test('đổi 1 file đầu vào của bước shot -> chỉ shot, ra-loi, am-thanh, gop chạy lại', () => {
  const ep = tapGia('2');
  assert.equal(lam(ep, 'tiep').ma, 0);
  const n = giaLog(ep).length;
  fs.writeFileSync(path.join(GOC, 'episodes', ep, 'narration.json'), JSON.stringify({ gia: 'khop-giong-that' }));
  const r = lam(ep, 'tiep');
  assert.equal(r.ma, 0, r.loi);
  assert.deepEqual(r.json.daChay, ['shot', 'ra-loi', 'am-thanh', 'gop']);
  assert.deepEqual(thuTu(giaLog(ep).slice(n)), ['shot', 'ra-loi', 'am-thanh', 'gop']);
  const sh = giaLog(ep).slice(n).find((d) => d.buoc === 'shot');
  assert.ok(sh.lenh.includes('--chi-khop-giong') && !sh.lenh.includes('--force'), sh.lenh);
  assert.ok(!fs.existsSync(path.join(GOC, 'output', ep, 'kiem', 'sao-luu')));
});

test('đổi kịch bản -> chạy lại từ đầu; lời kể không đổi thì giọng không tạo lại', () => {
  const ep = tapGia('3');
  assert.equal(lam(ep, 'tiep').ma, 0);
  const n = giaLog(ep).length;
  fs.appendFileSync(path.join(GOC, 'episodes', ep, 'kich-ban.md'), 'thêm dòng\n');
  const r = lam(ep, 'tiep');
  assert.deepEqual(r.json.daChay, THU_TU.filter((b) => b !== 'giong'));
  const sh = giaLog(ep).slice(n).find((d) => d.buoc === 'shot');
  assert.ok(sh.lenh.includes('--force'), sh.lenh);
  const sl = path.join(GOC, 'output', ep, 'kiem', 'sao-luu');
  const bak = fs.readdirSync(sl);
  assert.ok(bak.length >= 1);
  assert.ok(bak.every((b) => fs.existsSync(path.join(sl, b, 'narration.txt'))), 'sao lưu narration.txt trước khi sinh lại');
  assert.ok(!giaLog(ep).slice(n).some((d) => d.buoc === 'giong'));
  assert.equal(r.json.daChay.includes('giong'), false);
});

test('MỐC DUYỆT 2: mẫu chưa duyệt -> canNguoiDung kèm 00_mau.jpg, mã 1; duyệt xong thì đi tiếp', () => {
  const ep = tapGia('4');
  const k = path.join(GOC, 'output', ep, 'kiem');
  fs.mkdirSync(k, { recursive: true });
  fs.mkdirSync(path.join(GOC, 'output', ep, 'duyet'), { recursive: true });
  fs.writeFileSync(path.join(GOC, 'output', ep, 'duyet', '00_mau.jpg'), 'x');
  fs.writeFileSync(path.join(k, 'mau.json'), JSON.stringify({ 'nv:hero:thuong': { duyet: null }, 'env:town:rong:dem': { duyet: true } }));
  const a = lam(ep, 'tiep');
  assert.equal(a.ma, 1, a.loi);
  assert.equal(a.json.buocTiep, 'mau-duyet');
  assert.match(a.json.canNguoiDung.lyDo, /MOC DUYET 2/);
  assert.deepEqual(a.json.canNguoiDung.anh, [`output/${ep}/duyet/00_mau.jpg`]);
  assert.deepEqual(a.json.daChay, ['kich-ban', 'giong', 'asset']);
  assert.ok(!giaLog(ep).some((d) => d.buoc === 'shot'), 'chưa dựng shot khi chưa duyệt');
  fs.writeFileSync(path.join(k, 'mau.json'), JSON.stringify({ 'nv:hero:thuong': { duyet: true } }));
  const b = lam(ep, 'tiep');
  assert.equal(b.ma, 0, b.loi);
  assert.deepEqual(b.json.daChay, ['mau-duyet', 'shot', 'ra-loi', 'am-thanh', 'gop']);
});

test('ra-loi báo goi.can -> canNguoiDung kèm lý do; lỗi dưới ngưỡng -> canAgent (≤ 3, sonnet), hết lượt thì đi tiếp + canhBao', () => {
  const ep = tapGia('5');
  const k = path.join(GOC, 'output', ep, 'kiem');
  fs.mkdirSync(k, { recursive: true });
  fs.writeFileSync(path.join(k, 'gia-ra-loi.json'), JSON.stringify({ goi: { can: true, lyDo: ['2 loi khong tu sua duoc (can nguoi dung)'] }, conLai: [], loiKe: [] }));
  const a = lam(ep, 'tiep');
  assert.equal(a.ma, 1, a.loi);
  assert.equal(a.json.buocTiep, 'ra-loi');
  assert.match(a.json.canNguoiDung.lyDo, /khong tu sua/);
  assert.ok(!giaLog(ep).some((d) => d.buoc === 'am-thanh'));
  // lỗi dưới ngưỡng: agent rà (tối đa 3, sonnet), mỗi agent một việc; sau goi.vongMax lượt thì chấp nhận
  fs.writeFileSync(path.join(k, 'gia-ra-loi.json'), JSON.stringify({ goi: { can: false, lyDo: [] },
    conLai: [{ shot: 's001', luat: 'L1' }, { shot: 's002', luat: 'L4' }, { shot: 's003', luat: 'L6' }, { shot: 's004', luat: 'L8' }],
    loiKe: [{ shot: 's009', cau: 4, lyDo: 'L2' }] }));
  const b = lam(ep, 'tiep');
  assert.equal(b.ma, 0, b.loi);
  assert.equal(b.json.buocTiep, 'ra-loi');
  assert.ok(b.json.canAgent.length >= 1 && b.json.canAgent.length <= 3, JSON.stringify(b.json.canAgent));
  assert.ok(b.json.canAgent.every((x) => x.model === 'sonnet' && x.file && x.viec));
  for (const sid of ['s001', 's002', 's003', 's004', 's009']) assert.ok(b.json.canAgent.some((x) => x.viec.includes(sid)), sid);
  const c = lam(ep, 'tiep');
  assert.equal(c.json.buocTiep, 'ra-loi');   // lượt agent 2
  const d = lam(ep, 'tiep');
  assert.equal(d.ma, 0, d.loi);
  assert.deepEqual(d.json.daChay, ['ra-loi', 'am-thanh', 'gop']);
  assert.ok(d.json.canhBao.some((x) => x.startsWith('ra-loi:')), JSON.stringify(d.json.canhBao));
  const t = lam(ep, 'trang-thai');
  assert.equal(t.json.buoc.length, 8);
  assert.ok(t.json.buoc.every((x) => x.xong && x.khop), JSON.stringify(t.json.buoc));
  assert.equal(t.json.buocTiep, null);
});

test('thiếu kịch bản -> canNguoiDung, mã 1; tham số sai -> mã 2', () => {
  const ep = tapGia('6', { kb: false });
  const a = lam(ep, 'tiep');
  assert.equal(a.ma, 1);
  assert.equal(a.json.buocTiep, 'kich-ban');
  assert.match(a.json.canNguoiDung.lyDo, /viet-kich-ban/);
  assert.equal(lam(ep, 'khong-co-buoc').ma, 2);
  assert.equal(spawnSync(process.execPath, ['tools/lam-phim.mjs'], { cwd: GOC }).status, 2);
});

test('chạy đúng 1 bước: chỉ khi đầu vào đổi; --force ép chạy', () => {
  const ep = tapGia('7');
  assert.deepEqual(lam(ep, 'kich-ban').json.daChay, ['kich-ban']);
  assert.deepEqual(lam(ep, 'kich-ban').json.daBo, ['kich-ban']);
  assert.deepEqual(lam(ep, 'kich-ban', '--force').json.daChay, ['kich-ban']);
});

test('danh sách giọng: bỏ sisi/daqi/kiwi; Anh đủ 6 giọng mới; nghe thử chỉ Thanh Niên Tự Tin + Andrew', () => {
  const r = spawnSync('python', ['-X', 'utf8', 'tools/voices_build.py', 'ep001', 'list'], { cwd: GOC, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const d = JSON.parse(r.stdout);
  for (const v of ['multi_female_sisi_uranus_bigtts', 'multi_female_daqi_uranus_bigtts', 'multi_female_kiwi_uranus_bigtts']) assert.ok(!d.vi.includes(v), v);
  assert.ok(d.vi.includes('BV075_streaming'));
  for (const v of ['en-US-AndrewMultilingualNeural', 'en-US-AndrewNeural', 'en-US-AvaMultilingualNeural', 'en-US-EmmaNeural', 'en-US-BrianNeural', 'en-US-SteffanNeural', 'en-GB-SoniaNeural']) assert.ok(d.en.includes(v), v);
  assert.ok(d.en.some((v) => v.startsWith('en-AU-William')));
  assert.deepEqual(d.nghe_thu.vi, ['BV075_streaming']);
  assert.deepEqual(d.nghe_thu.en, ['en-US-AndrewMultilingualNeural', 'en-US-AndrewNeural']);
});

test('I1: shots.js/episode.js có sẵn mà lam-phim chưa từng sinh -> từ chối (mã 1), không gọi shot-gen', () => {
  const ep = tapGia('8');
  fs.writeFileSync(path.join(GOC, 'episodes', ep, 'shots.js'), 'export const SHOTS = [];\n');
  const a = lam(ep, 'tiep');
  assert.equal(a.ma, 1, a.loi);
  assert.equal(a.json.buocTiep, 'shot');
  assert.match(a.json.canNguoiDung.lyDo, /Từ chối ghi đè/);
  assert.ok(!giaLog(ep).some((d) => d.buoc === 'shot'));
  assert.equal(fs.readFileSync(path.join(GOC, 'episodes', ep, 'shots.js'), 'utf8'), 'export const SHOTS = [];\n');
});

test('I2: lời kể do lam-phim tạo có @source/@narrator/@voice (kịch bản có [vai]) (đủ cho tts.py)', () => {
  const ep = tapGia('9', { kb: false });
  const mau = fs.readFileSync(path.join(GOC, 'tools', 'kb', 'tests', 'data', 'kb_tot.md'), 'utf8').replace('| Trừ tôi. |', '| [mom] Trừ tôi. |');
  fs.writeFileSync(path.join(GOC, 'episodes', ep, 'kich-ban.md'), mau);
  const a = lam(ep, 'giong');
  assert.equal(a.ma, 0, a.loi);
  const nar = fs.readFileSync(path.join(GOC, 'episodes', ep, 'narration.txt'), 'utf8');
  assert.match(nar, /^@source /m);
  assert.match(nar, /^@narrator /m);
  assert.match(nar, /^@voice mom /m);
  assert.match(nar, /^@at [\d.]+ \[mom\] Trừ tôi\./m);
  assert.ok(!fs.existsSync(path.join(GOC, 'episodes', `_lamphim_tmp_${ep}`)), 'tập tạm đã dọn');
  assert.ok(!fs.existsSync(path.join(GOC, 'output', '_tmp', `lam-phim-${ep}`)));
});

test('I3: giọng khởi chạy nền NGAY sau kich-ban, trước khi asset trả canAgent; JSON có giongNen', () => {
  const ep = tapGia('10');
  const k = path.join(GOC, 'output', ep, 'kiem');
  fs.mkdirSync(k, { recursive: true });
  fs.writeFileSync(path.join(k, 'gia-giong-nen'), '1');
  fs.writeFileSync(path.join(k, 'gia-thieu.json'), JSON.stringify({ env: [{ ten: 'kitchen', moTa: 'bếp' }], prop: [], anim: [], tuDung: [] }));
  const a = lam(ep, 'tiep');
  assert.equal(a.ma, 0, a.loi);
  assert.equal(a.json.buocTiep, 'asset');
  assert.equal(a.json.canAgent.length, 1);
  assert.deepEqual(a.json.dangChayNen, ['giong']);
  assert.ok(a.json.giongNen && a.json.giongNen.pid > 0 && a.json.giongNen.batDau && a.json.giongNen.log, JSON.stringify(a.json.giongNen));
  assert.deepEqual(thuTu(giaLog(ep)), ['kich-ban', 'giong', 'asset']);
});

test('N1: shot-gen thoát 1 sau khi đã ghi file -> canAgent; sửa kịch bản -> tiep lần 2 chạy lại được, không bị từ chối', () => {
  const ep = tapGia('11');
  const k = path.join(GOC, 'output', ep, 'kiem');
  fs.mkdirSync(k, { recursive: true });
  fs.writeFileSync(path.join(k, 'gia-shot-ma'), '1');
  const a = lam(ep, 'tiep');
  assert.equal(a.ma, 0, a.loi);
  assert.equal(a.json.buocTiep, 'shot');
  assert.equal(a.json.canAgent.length, 1);
  assert.ok(fs.existsSync(path.join(GOC, 'episodes', ep, 'shots.js')), 'shot-gen đã ghi shots.js trước khi thoát 1');
  fs.rmSync(path.join(k, 'gia-shot-ma'));
  fs.appendFileSync(path.join(GOC, 'episodes', ep, 'kich-ban.md'), 'agent đã sửa\n');
  const b = lam(ep, 'tiep');
  assert.equal(b.ma, 0, b.loi);
  assert.equal(b.json.canNguoiDung, null);
  assert.ok(b.json.daChay.includes('shot') && b.json.daChay.includes('gop'));
});
