import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { lapKeHoach, soanDeBai } from '../codex-ve.mjs';
import { HUONG_BOI_CANH } from '../huong-boi-canh.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(aqui, '..', 'codex-ve.mjs');
const GIA = path.join(aqui, 'fixtures', 'codex-gia.mjs');
const MAU = path.join(aqui, 'fixtures', 'dau-vao-mau');
const bangMau = JSON.parse(fs.readFileSync(path.join(MAU, 'bang-shot.json'), 'utf8'));

function banSao() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-ve-'));
  const thuMuc = path.join(root, 'tap mau'); // có dấu cách, giống "S:\3JS Studio"
  fs.mkdirSync(thuMuc);
  fs.copyFileSync(path.join(MAU, 'bang-shot.json'), path.join(thuMuc, 'bang-shot.json'));
  return { root, thuMuc, state: path.join(root, 'state') };
}
function duyet(thuMuc) { fs.writeFileSync(path.join(thuMuc, 'duyet-1.json'), '{"duyet":true}'); }
function ref(thuMuc) {
  fs.mkdirSync(path.join(thuMuc, 'tham-chieu'), { recursive: true });
  for (const f of ['bc_pho', 'bc_tiem-banh', 'nv_ga', 'nv_ba-ban-banh']) fs.writeFileSync(path.join(thuMuc, 'tham-chieu', `${f}.png`), 'x');
}
// Test cũ chạy chế độ vẽ từng ảnh (--le); test lưới dùng cliLuoi.
function cli(args, extraEnv = {}, state) { return cliLuoi([...args, '--le'], extraEnv, state); }
function cliLuoi(args, extraEnv = {}, state) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, CODEX_BIN: `node "${GIA}"`, CODEX_GIA_DIR: state, ...extraEnv },
  });
}
const dem = (d, ext = '.png') => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith(ext)).length : 0);
const peak = (state) => Math.max(0, ...fs.readFileSync(path.join(state, 'peak.log'), 'utf8').split('\n').filter(Boolean).map(Number));

test('kế hoạch tham-chieu: đủ 4 hình trong 1 cụm', () => {
  const ke = lapKeHoach(bangMau, 'tham-chieu');
  assert.equal(ke.length, 1);
  assert.deepEqual(ke[0].hinh.map((h) => h.file).sort(),
    ['tham-chieu/bc_pho.png', 'tham-chieu/bc_tiem-banh.png', 'tham-chieu/nv_ba-ban-banh.png', 'tham-chieu/nv_ga.png']);
  assert.ok(ke[0].hinh.every((h) => h.moTa.length > 10));
  const de = soanDeBai(ke[0], bangMau);
  assert.match(de, /FILE: tham-chieu\/nv_ga\.png/);
  assert.match(de, /TIEN-DO: codex\/tien-do-tc1\.txt/);
});

test('kế hoạch shot: 12 hình, 2 cụm theo bối cảnh, đúng ảnh kèm', () => {
  const ke = lapKeHoach(bangMau, 'shot');
  assert.deepEqual(ke.map((c) => c.cum), ['tiem-banh', 'pho']); // theo thứ tự khai báo boiCanh
  assert.equal(ke[0].hinh.length, 6); // s003(2) s004(1) s005(3)
  assert.equal(ke[1].hinh.length, 6); // s001(2) s002(2) s006(2)
  assert.equal(ke.reduce((n, c) => n + c.hinh.length, 0), 12);
  assert.deepEqual(ke[1].anhKem, ['tham-chieu/bc_pho.png', 'tham-chieu/nv_ga.png']);
  assert.deepEqual(ke[0].anhKem, ['tham-chieu/bc_tiem-banh.png', 'tham-chieu/nv_ga.png', 'tham-chieu/nv_ba-ban-banh.png']);
  const files = ke[0].hinh.map((h) => h.file);
  assert.ok(files.includes('hinh/shot_s005_giua.png'));
  assert.ok(files.includes('hinh/shot_s004_dau.png') && !files.includes('hinh/shot_s004_cuoi.png'));
  // hình đã có thì không đưa lại
  const ke2 = lapKeHoach(bangMau, 'shot', { coFile: (f) => /shot_s00[126]_/.test(f) });
  assert.deepEqual(ke2.map((c) => c.cum), ['tiem-banh']);
});

test('cụm quá 25 shot thì tách đôi', () => {
  const shots = Array.from({ length: 30 }, (_, i) => ({ id: `s${String(i + 1).padStart(3, '0')}`, boiCanh: 'pho', nhanVat: [], hinh: 1, dau: 'x' }));
  const ke = lapKeHoach({ ...bangMau, shots }, 'shot');
  assert.deepEqual(ke.map((c) => c.cum), ['pho-1', 'pho-2']);
  assert.equal(ke[0].hinh.length + ke[1].hinh.length, 30);
});

test('--thu: ghi đề bài, không tạo hình, không chạy Codex', () => {
  const b = banSao();
  const r = cli(['shot', b.thuMuc, '--thu'], {}, b.state);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /2 cụm, 12 hình/);
  assert.match(r.stdout, /codex-gia\.mjs/);
  assert.equal(dem(path.join(b.thuMuc, 'hinh')), 0);
  assert.equal(dem(path.join(b.thuMuc, 'codex'), '.md'), 2);
  assert.ok(!fs.existsSync(b.state), 'Codex giả không được chạy');
  const r2 = cli(['tham-chieu', b.thuMuc, '--thu'], {}, b.state);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /1 cụm, 4 hình/);
});

test('tham-chieu chạy thật (Codex giả): đủ file, thoát 0; chạy lại thì "đủ"', () => {
  const b = banSao();
  const r = cli(['tham-chieu', b.thuMuc], {}, b.state);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(dem(path.join(b.thuMuc, 'tham-chieu')), 4);
  assert.ok(fs.existsSync(path.join(b.thuMuc, 'codex', 'ket-qua-tham-chieu.json')));
  assert.ok(fs.existsSync(path.join(b.thuMuc, 'codex', 'tien-do-tc1.txt')));
  const r2 = cli(['tham-chieu', b.thuMuc], {}, b.state);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /Đủ/);
});

test('shot chạy thật: 12 hình, kèm ảnh tham chiếu bằng -i, chạy lại thì "đủ"', () => {
  const b = banSao();
  duyet(b.thuMuc); ref(b.thuMuc);
  const r = cli(['shot', b.thuMuc], {}, b.state);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(dem(path.join(b.thuMuc, 'hinh')), 12);
  const calls = fs.readFileSync(path.join(b.state, 'calls.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(calls.length, 2);
  assert.ok(calls.every((c) => c.images.length >= 2 && c.images.every((i) => i.endsWith('.png'))));
  assert.ok(calls.every((c) => path.resolve(c.cwd) === path.resolve(b.thuMuc)));
  const r2 = cli(['shot', b.thuMuc], {}, b.state);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /Đủ/);
  assert.equal(calls.length, 2);
});

test('Codex sót 1 file: thoát 1 và nêu đúng file', () => {
  const b = banSao();
  duyet(b.thuMuc); ref(b.thuMuc);
  const r = cli(['shot', b.thuMuc], { CODEX_GIA_SOT: 'shot_s005_giua' }, b.state);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /hinh\/shot_s005_giua\.png/);
  assert.equal(dem(path.join(b.thuMuc, 'hinh')), 11);
  const kq = JSON.parse(fs.readFileSync(path.join(b.thuMuc, 'codex', 'ket-qua-shot.json'), 'utf8'));
  assert.deepEqual(kq.thieu, ['hinh/shot_s005_giua.png']);
});

test('thiếu duyet-1.json: thoát 2, không chạy gì', () => {
  const b = banSao();
  const r = cli(['shot', b.thuMuc], {}, b.state);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /duyet-1\.json/);
  assert.equal(dem(path.join(b.thuMuc, 'hinh')), 0);
});

test('trần song song được tôn trọng', () => {
  const b1 = banSao(); duyet(b1.thuMuc); ref(b1.thuMuc);
  const r1 = cli(['shot', b1.thuMuc, '--tran', '1'], { CODEX_GIA_NGU: '500' }, b1.state);
  assert.equal(r1.status, 0, r1.stdout + r1.stderr);
  assert.equal(peak(b1.state), 1);
  const b2 = banSao(); duyet(b2.thuMuc); ref(b2.thuMuc);
  const r2 = cli(['shot', b2.thuMuc, '--tran', '2'], { CODEX_GIA_NGU: '500' }, b2.state);
  assert.equal(r2.status, 0, r2.stdout + r2.stderr);
  assert.equal(peak(b2.state), 2);
});

test('rate limit lần đầu: chạy lại cụm bị giới hạn một lần với trần giảm một nửa', () => {
  const b = banSao(); duyet(b.thuMuc); ref(b.thuMuc);
  const r = cli(['shot', b.thuMuc, '--tran', '2'], { CODEX_GIA_429: '1', CODEX_GIA_NGU: '200' }, b.state);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Bị giới hạn/);
  assert.equal(dem(path.join(b.thuMuc, 'hinh')), 12);
  const kq = JSON.parse(fs.readFileSync(path.join(b.thuMuc, 'codex', 'ket-qua-shot.json'), 'utf8'));
  assert.equal(kq.cum.filter((c) => c.gioiHan).length, 1);
  assert.equal(kq.cum.filter((c) => c.chayLai).length, 1);
});

// ---------- bối cảnh theo danh sách mốc (boi-canh/<id>.json) ----------
const MOC_MAU = path.join(aqui, 'fixtures', 'boi-canh-mau', 'moc-nha-may-ngoai.json');

function tapCoMoc({ khoiXam = [], sua = (m) => m } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-ve-moc-'));
  const thuMuc = path.join(root, 'tap mau');
  fs.mkdirSync(path.join(thuMuc, 'boi-canh'), { recursive: true });
  const bs = { ep: 'epX', nhanVat: [{ id: 'ga', ten: 'Gà', moTa: 'gà con vàng' }],
    boiCanh: [{ id: 'nha-may-ngoai', ten: 'Sân ngoài nhà máy', moTa: 'MÔ TẢ CŨ MỘT CÂU' }, { id: 'pho', ten: 'Phố', moTa: 'phố nhỏ, đèn vàng' }],
    shots: [] };
  fs.writeFileSync(path.join(thuMuc, 'bang-shot.json'), JSON.stringify(bs));
  const moc = sua(JSON.parse(fs.readFileSync(MOC_MAU, 'utf8')));
  fs.writeFileSync(path.join(thuMuc, 'boi-canh', 'nha-may-ngoai.json'), JSON.stringify(moc));
  for (const g of khoiXam) fs.writeFileSync(path.join(thuMuc, 'boi-canh', `nha-may-ngoai_${g}.png`), 'x');
  return { root, thuMuc, state: path.join(root, 'state') };
}
const docDeBai = (thuMuc) => fs.readdirSync(path.join(thuMuc, 'codex')).filter((f) => /^de-bai-tham-chieu-.*\.md$/.test(f)).sort()
  .map((f) => fs.readFileSync(path.join(thuMuc, 'codex', f), 'utf8')).join('\n');
const HUONG8 = ['truoc', 'sau', 'trai', 'phai', 'tren-xuong', 'duoi-len', 'thang-mat', 'ngang-hong'];

test('bc_* có file mốc: đề bài đủ phong cách, mốc, lấp đầy, chừa trống, cấm, ánh sáng, câu bắt buộc', () => {
  const b = tapCoMoc({ khoiXam: ['truoc', 'tren-xuong'], sua: (m) => ({
    ...m, phongCach: 'khối vuông Roblox; gạch xanh xám', bangMau: ['#5f7480', '#ffd9a0'],
    lapDay: [{ cum: 'phai', mon: [{ ten: 'thùng phuy xanh', soLuong: 2 }] }],
    moc: m.moc.map((x) => (x.id === 'thung' ? { ...x, vaiTro: 'Gà trèo lên để nhìn qua kính' } : x)) }) });
  const r = cli(['tham-chieu', b.thuMuc, '--thu', '--chong'], {}, b.state);
  assert.equal(r.status, 0, r.stderr);
  const de = docDeBai(b.thuMuc);
  assert.match(de, /Vẽ chồng lên ảnh khối xám đính kèm, không đổi hình khối, không thêm\/bớt mốc, không vẽ nhân vật\./);
  assert.match(de, /khối vuông Roblox; gạch xanh xám/);
  assert.match(de, /#5f7480, #ffd9a0/);
  assert.match(de, /Thùng gỗ để trèo \[thung\] — vai trò: Gà trèo lên để nhìn qua kính · vùng: x -0\.5\.\.2\.1.* · màu: #8a6a44, #3a2614 · vật liệu: ván gỗ/);
  assert.match(de, /Tường gạch nhà máy \[tuong\]/);
  assert.match(de, /2 × thùng phuy xanh/);
  assert.match(de, /Vùng phải để trống[\s\S]*khoảng sân x -4\.\.4/);
  assert.match(de, /Điều cấm[\s\S]*không đổi số ô kính/);
  assert.match(de, /Ánh sáng[\s\S]*xanh lạnh ban đêm/);
  assert.match(de, /Gà[^\n]*đỉnh đầu 5\.48|hình nộm xám khối vuông cao 5\.48/);
  assert.doesNotMatch(de, /MÔ TẢ CŨ MỘT CÂU/);
  // ảnh khối xám có trong -i của lệnh
  assert.match(r.stdout, /-i [^<]*nha-may-ngoai_truoc\.png/);
  assert.match(r.stdout, /-i [^<]*nha-may-ngoai_tren-xuong\.png/);
  // bối cảnh không có file mốc vẫn dùng moTa cũ
  assert.match(de, /phố nhỏ, đèn vàng/);
});

test('chạy thật: ảnh khối xám có thì vào -i; thiếu thì không; không có file mốc thì như cũ', () => {
  const b = tapCoMoc({ khoiXam: ['tren-xuong'] });
  const r = cli(['tham-chieu', b.thuMuc, '--chong'], {}, b.state);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const calls = fs.readFileSync(path.join(b.state, 'calls.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const anh = calls.flatMap((c) => c.images).map((p) => path.basename(p));
  assert.deepEqual(anh, ['nha-may-ngoai_tren-xuong.png']);
  // không file mốc, không ảnh khối xám: đường cũ, không -i
  const c = banSao();
  const r2 = cli(['tham-chieu', c.thuMuc], {}, c.state);
  assert.equal(r2.status, 0, r2.stdout + r2.stderr);
  const calls2 = fs.readFileSync(path.join(c.state, 'calls.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(calls2.every((x) => x.images.length === 0));
  assert.match(docDeBai(c.thuMuc), /Toàn cảnh bối cảnh "[^"]+": /);
});

test('mặc định vẽ tự do (#23): có khối xám vẫn KHÔNG -i, đề bài cấm chép/lọc ảnh, có trục ảnh từng hướng', () => {
  const b = tapCoMoc({ khoiXam: ['truoc', 'tren-xuong'] });
  const r = cli(['tham-chieu', b.thuMuc, '--thu'], {}, b.state);
  assert.equal(r.status, 0, r.stderr);
  const de = docDeBai(b.thuMuc);
  assert.match(de, /Vẽ ảnh MỚI hoàn toàn bằng công cụ tạo hình/);
  assert.match(de, /bc_nha-may-ngoai_sau\.png[^\n]*Trục: trong ảnh: \+X sang TRÁI/);
  assert.doesNotMatch(de, /Vẽ chồng lên ảnh khối xám đính kèm/);
  assert.doesNotMatch(r.stdout, /-i [^<]*nha-may-ngoai_/);
});

test('file mốc hỏng: thoát 2', () => {
  const b = tapCoMoc();
  fs.writeFileSync(path.join(b.thuMuc, 'boi-canh', 'nha-may-ngoai.json'), '{hỏng');
  const r = cli(['tham-chieu', b.thuMuc, '--thu'], {}, b.state);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /nha-may-ngoai\.json hỏng/);
});

test('anhSang theo giờ (object) in từng giờ, không ra [object Object] — vướng #18 ep005t', () => {
  const cum = { cum: 'tc1', cheDo: 'tham-chieu', anhKem: [], nhanVat: [],
    hinh: [{ file: 'tham-chieu/bc_x.png', moTa: 'Toàn cảnh x', moc: { id: 'x', anhSang: { ngay: 'nắng nhẹ', dem: { chinh: 'trăng xanh', phu: 'đèn dầu' } } } }] };
  const de = soanDeBai(cum, {});
  assert.ok(!de.includes('[object Object]'), 'còn [object Object]');
  assert.match(de, /- ngay: nắng nhẹ/);
  assert.match(de, /- dem: .*trăng xanh/);
});

test('tham-chieu có file mốc: đúng 8 hình bc_<id>_<huong>, mỗi hình chỉ kèm khối xám cùng hướng; không mốc vẫn 1 hình', () => {
  const bs = { ep: 'epX', nhanVat: [], boiCanh: [{ id: 'a', ten: 'A', moTa: 'x' }, { id: 'b', ten: 'B', moTa: 'phố' }], shots: [] };
  const moc = { boiCanh: 'a', moc: [{ id: 'm1', ten: 'Mốc 1' }] };
  const coFile = (f) => /^boi-canh\/a_(truoc|sau|phai)\.png$/.test(f);
  const ke = lapKeHoach(bs, 'tham-chieu', { coFile, docMoc: (id) => (id === 'a' ? moc : null), chong: true });
  const hinh = ke.flatMap((c) => c.hinh);
  const ha = hinh.filter((h) => h.file.startsWith('tham-chieu/bc_a_'));
  assert.deepEqual(ha.map((h) => h.file), HUONG8.map((g) => `tham-chieu/bc_a_${g}.png`));
  for (const h of ha) {
    const g = h.file.match(/bc_a_(.+)\.png/)[1];
    assert.deepEqual(h.khoiXam, coFile(`boi-canh/a_${g}.png`) ? [`boi-canh/a_${g}.png`] : []);
    assert.ok(h.moTa.includes(HUONG_BOI_CANH.find((x) => x.id === g).moTa));
  }
  assert.deepEqual(hinh.filter((h) => h.file.includes('bc_b')).map((h) => h.file), ['tham-chieu/bc_b.png']);
  assert.ok(ke.every((c) => c.hinh.length <= 6));
  // đề bài: mục mốc chỉ in một lần mỗi bối cảnh trong một cụm + luật 8 hướng
  const de = ke.map((c) => soanDeBai(c, bs)).join('\n');
  assert.match(de, /vẽ đủ 8 hướng/);
  // --huong lọc
  const ke2 = lapKeHoach(bs, 'tham-chieu', { coFile, docMoc: (id) => (id === 'a' ? moc : null), huong: 'sau,tren-xuong', chong: true });
  assert.deepEqual(ke2.flatMap((c) => c.hinh).filter((h) => h.file.includes('bc_a')).map((h) => h.file), ['tham-chieu/bc_a_sau.png', 'tham-chieu/bc_a_tren-xuong.png']);
});

test('shot: bối cảnh có mốc kèm bc_<id>_truoc + _tren-xuong; không mốc kèm bc_<id>.png', () => {
  const ke = lapKeHoach(bangMau, 'shot', { docMoc: (id) => (id === 'pho' ? { moc: [] } : null) });
  assert.deepEqual(ke.find((c) => c.cum === 'pho').anhKem.slice(0, 2), ['tham-chieu/bc_pho_truoc.png', 'tham-chieu/bc_pho_tren-xuong.png']);
  assert.equal(ke.find((c) => c.cum === 'tiem-banh').anhKem[0], 'tham-chieu/bc_tiem-banh.png');
});

test('timTrung: nhóm file trùng md5 (ảnh Codex chép nhầm giữa cụm)', async () => {
  const { timTrung } = await import('../codex-ve.mjs');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'trung-'));
  fs.writeFileSync(path.join(d, 'a.png'), 'X'); fs.writeFileSync(path.join(d, 'b.png'), 'X'); fs.writeFileSync(path.join(d, 'c.png'), 'Y');
  assert.deepEqual(timTrung(['a.png', 'b.png', 'c.png', 'thieu.png'], d), [['a.png', 'b.png']]);
});

test('timChepAnhKem: hình chép khối xám (cả khi mã hoá lại) bị bắt, ảnh khác cỡ thì không', async () => {
  const { timChepAnhKem } = await import('../codex-ve.mjs');
  const sharp = (await import('sharp')).default;
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'chep-'));
  const anh = (w, h, c) => sharp({ create: { width: w, height: h, channels: 3, background: c } }).png();
  await anh(54, 96, '#808080').toFile(path.join(d, 'xam.png'));
  await anh(54, 96, '#818181').png({ compressionLevel: 1 }).toFile(path.join(d, 'a.png'));   // chép, byte khác
  await anh(94, 167, '#c08040').toFile(path.join(d, 'b.png'));                              // vẽ thật, khác cỡ
  const ke = [{ cum: 'tc1', anhKem: [], hinh: [{ file: 'a.png', khoiXam: ['xam.png'] }, { file: 'b.png', khoiXam: ['xam.png'] }, { file: 'thieu.png', khoiXam: ['xam.png'] }] }];
  const r = await timChepAnhKem(ke, d);
  assert.deepEqual(r.map((x) => [x.file, x.chep, x.cungCo]), [['a.png', true, true], ['b.png', false, false]]);
});

// ---------- chế độ LƯỚI (luật 16/11) ----------
const mauO = (file) => { const h = crypto.createHash('md5').update(file).digest(); return [40 + (h[0] % 160), 40 + (h[1] % 160), 40 + (h[2] % 160)]; };
async function diemGiua(f) { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const i = ((info.height >> 1) * info.width + (info.width >> 1)) * 3; return [data[i], data[i + 1], data[i + 2]]; }

test('lưới tham-chieu: 8 hướng một bối cảnh = 1 lưới 2×4 đúng thứ tự; tờ nhân vật và bối cảnh không mốc ra lưới riêng', () => {
  const bs = { ep: 'epX', nhanVat: [{ id: 'ga', ten: 'Gà' }], boiCanh: [{ id: 'a', ten: 'A' }, { id: 'b', ten: 'B', moTa: 'phố' }], shots: [] };
  const ke = lapKeHoach(bs, 'tham-chieu', { luoi: true, docMoc: (id) => (id === 'a' ? { boiCanh: 'a', moc: [{ id: 'm1', ten: 'Mốc 1' }] } : null) });
  assert.deepEqual(ke.map((c) => c.cum), ['nv_ga', 'a_huong', 'bc-le_b']);
  const a = ke.find((c) => c.cum === 'a_huong');
  assert.deepEqual(a.hinh.map((h) => h.file), HUONG8.map((g) => `tham-chieu/bc_a_${g}.png`));
  assert.deepEqual([a.luoi.cot, a.luoi.hang, a.luoi.file], [2, 4, 'slide/a_huong.png']);
  // thiếu vài hướng thì lưới chỉ gồm hướng thiếu, giữ thứ tự
  const k2 = lapKeHoach(bs, 'tham-chieu', { luoi: true, chi: ['a'], coFile: (f) => /bc_a_(truoc|sau|trai|phai|tren-xuong)\.png/.test(f), docMoc: () => ({ moc: [] }) });
  assert.deepEqual(k2[0].hinh.map((h) => h.file), ['duoi-len', 'thang-mat', 'ngang-hong'].map((g) => `tham-chieu/bc_a_${g}.png`));
  // ≤ 8 tờ nhân vật mỗi lưới
  const nv = Array.from({ length: 11 }, (_, i) => ({ id: `n${i}`, ten: `N${i}` }));
  const k3 = lapKeHoach({ nhanVat: nv, boiCanh: [] }, 'tham-chieu', { luoi: true });
  assert.deepEqual(k3.map((c) => c.hinh.length), [6, 5]);
});

test('lưới shot: hình của các shot cùng bối cảnh gộp, ≤ 10 ô / lưới', () => {
  const ke = lapKeHoach(bangMau, 'shot', { luoi: true });
  assert.deepEqual(ke.map((c) => c.boiCanh), ['tiem-banh', 'pho']);
  assert.deepEqual(ke.map((c) => c.hinh.length), [6, 6]);
  assert.deepEqual(ke[0].luoi, { file: `slide/${ke[0].cum}.png`, cot: 2, hang: 3 });
  const shots = Array.from({ length: 12 }, (_, i) => ({ id: `s${String(i + 1).padStart(3, '0')}`, boiCanh: 'pho', nhanVat: [], hinh: 1, dau: 'x' }));
  const k2 = lapKeHoach({ ...bangMau, shots }, 'shot', { luoi: true });
  assert.deepEqual(k2.map((c) => c.hinh.length), [6, 6]);
  assert.equal(new Set(k2.map((c) => c.cum)).size, 2);
});

test('đề bài lưới: thứ tự ô, viền 8 px, câu lưu file, không FILE:, kèm mốc', () => {
  const b = tapCoMoc();
  const r = cliLuoi(['tham-chieu', b.thuMuc, '--thu'], {}, b.state);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /3 cụm, 10 hình/);
  assert.match(r.stdout, /lưới 2×4 slide\/nha-may-ngoai_huong\.png/);
  const de = fs.readFileSync(path.join(b.thuMuc, 'codex', 'de-bai-tham-chieu-nha-may-ngoai_huong.md'), 'utf8');
  assert.match(de, /^- LUOI: slide\/nha-may-ngoai_huong\.png — 2 cột × 4 hàng = 8 ô$/m);
  assert.match(de, /viền trắng mảnh 8 px/);
  assert.match(de, /KHÔNG chữ, KHÔNG nhãn/);
  assert.match(de, /ĐÚNG đường dẫn ảnh mà công cụ tạo hình trả về/);
  assert.match(de, /KHÔNG lấy file mới nhất/);
  assert.doesNotMatch(de, /^- FILE:/m);
  HUONG8.forEach((g, i) => assert.match(de, new RegExp(`^- Ô ${i + 1} \\(hàng ${Math.floor(i / 2) + 1}, cột ${(i % 2) + 1}\\): tham-chieu/bc_nha-may-ngoai_${g}\\.png`, 'm')));
  assert.match(de, /Danh sách mốc bối cảnh nha-may-ngoai/);
  assert.match(de, /TIEN-DO: codex\/tien-do-nha-may-ngoai_huong\.txt/);
  assert.ok(!fs.existsSync(path.join(b.thuMuc, 'tham-chieu')));
});

test('mặc định là lưới (không cờ); --le về cách cũ', () => {
  const b = tapCoMoc();
  assert.match(cliLuoi(['tham-chieu', b.thuMuc, '--thu'], {}, b.state).stdout, /\(LƯỚI\)/);
  assert.doesNotMatch(cliLuoi(['tham-chieu', b.thuMuc, '--thu', '--le'], {}, b.state).stdout, /LƯỚI/);
});

test('lưới chạy thật (Codex giả): cắt đủ ô đúng tên, đúng thứ tự, giữ lưới gốc; chạy lại thì đủ', async () => {
  const b = tapCoMoc();
  const r = cliLuoi(['tham-chieu', b.thuMuc], {}, b.state);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const calls = fs.readFileSync(path.join(b.state, 'calls.jsonl'), 'utf8').trim().split('\n');
  assert.equal(calls.length, 3, 'mỗi lưới một tiến trình');
  assert.ok(fs.existsSync(path.join(b.thuMuc, 'slide', 'nha-may-ngoai_huong.png')));
  for (const g of HUONG8) {
    const f = `tham-chieu/bc_nha-may-ngoai_${g}.png`;
    const p = path.join(b.thuMuc, f);
    assert.ok(fs.existsSync(p), f);
    const m = await sharp(p).metadata();
    assert.ok(Math.abs(m.width - 100) <= 6 && Math.abs(m.height - 160) <= 6, `${f} ${m.width}×${m.height}`);
    const [R, G, B] = await diemGiua(p), e = mauO(f);
    assert.ok(Math.abs(R - e[0]) + Math.abs(G - e[1]) + Math.abs(B - e[2]) < 6, `${f} sai màu ô`);
  }
  assert.ok(fs.existsSync(path.join(b.thuMuc, 'tham-chieu', 'bc_pho.png')));
  assert.ok(fs.existsSync(path.join(b.thuMuc, 'tham-chieu', 'nv_ga.png')));
  const r2 = cliLuoi(['tham-chieu', b.thuMuc], {}, b.state);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /Đủ/);
});

test('lưới shot chạy thật: 12 hình từ 2 lưới', () => {
  const b = banSao(); duyet(b.thuMuc); ref(b.thuMuc);
  const r = cliLuoi(['shot', b.thuMuc], {}, b.state);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(dem(path.join(b.thuMuc, 'hinh')), 12);
  assert.equal(dem(path.join(b.thuMuc, 'slide')), 2);
});

test('lưới trùng md5 giữa các lưới bị bắt: xoá lưới, tính thiếu, lưới trùng không bị cắt ô', () => {
  const b = tapCoMoc();
  const r = cliLuoi(['tham-chieu', b.thuMuc], { CODEX_GIA_TRUNG_LUOI: '1' }, b.state);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /Lưới TRÙNG nội dung/);
  assert.ok(!fs.existsSync(path.join(b.thuMuc, 'tham-chieu', 'nv_ga.png')) && !fs.existsSync(path.join(b.thuMuc, 'slide', 'nv_ga.png')));   // 2 lưới 1 ô giống hệt: xoá cả hai
  const kq = JSON.parse(fs.readFileSync(path.join(b.thuMuc, 'codex', 'ket-qua-tham-chieu.json'), 'utf8'));
  assert.deepEqual(kq.thieu.sort(), ['tham-chieu/bc_pho.png', 'tham-chieu/nv_ga.png']);
});

test('lưới không ra: thoát 1 và nêu đủ ô thiếu', () => {
  const b = tapCoMoc();
  const r = cliLuoi(['tham-chieu', b.thuMuc], { CODEX_GIA_SOT: 'nha-may-ngoai_huong' }, b.state);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /bc_nha-may-ngoai_ngang-hong\.png/);
});

test('trần song song mặc định 4', () => {
  const b = banSao(); duyet(b.thuMuc); ref(b.thuMuc);
  assert.match(cliLuoi(['shot', b.thuMuc, '--thu'], {}, b.state).stdout, /trần song song 4/);
});
