// Nhánh KIT của tools/lam-phim.mjs (trạm 10–12). Kit lấy từ BẢN SAO ở output/_tmp (không đụng kich-ban/ep004, episodes/ep004).
// Không gọi TTS/Codex thật: LAM_PHIM_GIA=1 giả mọi lệnh con trừ kiem-kit/kit-shots (thuần, tất định, chạy thật).
// Nguồn kit: kich-ban/ep004 nếu có (hoặc biến LAM_PHIM_KIT_NGUON), không thì tools/tests/fixtures/dau-vao-mau.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const THU_TU = ['kich-ban', 'giong', 'asset', 'mau-duyet', 'shot', 'ra-loi', 'am-thanh', 'gop'];
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TMP = path.join(GOC, 'output', '_tmp', 'noi-lam-phim');
const TEN = [];

function nguonKit() {
  const cand = [process.env.LAM_PHIM_KIT_NGUON, path.join(GOC, 'kich-ban', 'ep004'), path.join(GOC, 'tools', 'tests', 'fixtures', 'dau-vao-mau')].filter(Boolean);
  const d = cand.find((x) => fs.existsSync(path.join(x, 'kit.json')) && fs.existsSync(path.join(x, 'bang-shot.json')));
  assert.ok(d, 'không tìm thấy kit nguồn');
  return d;
}
function xoa(ep) {
  for (const d of [`episodes/${ep}`, `output/${ep}`]) fs.rmSync(path.join(GOC, d), { recursive: true, force: true });
  fs.rmSync(path.join(TMP, ep), { recursive: true, force: true });
  for (const f of fs.existsSync(path.join(GOC, 'dist')) ? fs.readdirSync(path.join(GOC, 'dist')) : []) if (f.startsWith(ep)) fs.rmSync(path.join(GOC, 'dist', f), { force: true });
}
after(() => { TEN.forEach(xoa); try { fs.rmdirSync(TMP); } catch { /* còn tập khác */ } });

// bản sao kit (chỉ JSON, không hình) ở output/_tmp/noi-lam-phim/<ep>/kit; goc.json: mọi env trỏ env có sẵn của engine ('town') để bước asset đạt
function tapKit(hau, { goc = true } = {}) {
  const ep = `_test_lamphimkit${hau}`;
  TEN.push(ep); xoa(ep);
  const nguon = nguonKit(), dich = path.join(TMP, ep, 'kit');
  fs.mkdirSync(dich, { recursive: true });
  for (const n of ['bang-shot.json', 'kit.json']) fs.copyFileSync(path.join(nguon, n), path.join(dich, n));
  const kit = JSON.parse(fs.readFileSync(path.join(dich, 'kit.json'), 'utf8'));
  if (goc) {
    const g = {};
    for (const b of kit.boiCanh) g[b.id] = { goc: [0, 0, 0], xoay: 0, env: 'town' };
    fs.writeFileSync(path.join(dich, 'goc.json'), JSON.stringify(g, null, 1));
  }
  return { ep, dich, kitArg: path.relative(GOC, dich).split(path.sep).join('/') };
}
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
const daGoi = (ep, tenFile) => giaLog(ep).some((d) => d.lenh.includes(tenFile));
const khaiTapTay = (ep) => {
  fs.writeFileSync(path.join(GOC, 'episodes', ep, 'episode.js'), 'export const EPISODE = {};\n');
  fs.writeFileSync(path.join(GOC, 'episodes', ep, 'index.html'), '<!doctype html>\n');
};

test('kit: --kit đi nhánh kit — kiem-kit chạy, KHÔNG lint.py/asset-plan; dừng ở MỐC DUYỆT KIT (mã 1)', () => {
  const { ep, kitArg } = tapKit('1');
  const a = lam(ep, 'tiep', '--kit', kitArg);
  assert.equal(a.ma, 1, a.loi);
  assert.equal(a.json.kit, kitArg);
  assert.equal(a.json.buocTiep, 'mau-duyet');
  assert.match(a.json.canNguoiDung.lyDo, /MỐC DUYỆT KIT/);
  assert.match(a.json.canNguoiDung.lyDo, /--duyet-kit/);
  assert.deepEqual(a.json.daChay, ['kich-ban', 'giong', 'asset']);
  assert.ok(daGoi(ep, 'kiem-kit.mjs'), 'phải gọi kiem-kit');
  assert.ok(!daGoi(ep, 'lint.py') && !daGoi(ep, 'asset-plan.mjs') && !daGoi(ep, 'mau-duyet.mjs'), 'không đụng lệnh đường cũ');
  assert.ok(!fs.existsSync(path.join(GOC, 'episodes', ep, 'shots.js')), 'chưa duyệt thì chưa sinh shots.js');
  // lời kể suy từ bang-shot.thoai (không qua storyboard.py)
  const nar = fs.readFileSync(path.join(GOC, 'episodes', ep, 'narration.txt'), 'utf8');
  assert.match(nar, /@source capcut/);
  assert.match(nar, /^@at 0 /m);
});

test('kit: duyệt kit -> sinh shots.js bằng kit-shots (+goc.json), thiếu episode.js/index.html -> canAgent; đủ thì chạy hết 8 bước', () => {
  const { ep, kitArg } = tapKit('2');
  assert.equal(lam(ep, 'tiep', '--kit', kitArg).ma, 1);
  const b = lam(ep, 'tiep', '--kit', kitArg, '--duyet-kit');
  assert.equal(b.ma, 0, b.loi);
  assert.equal(b.json.buocTiep, 'shot');
  assert.equal(b.json.canAgent.length, 1);
  assert.match(b.json.canAgent[0].viec, /episode\.js/);
  assert.ok(daGoi(ep, 'kit-shots.mjs'), 'phải gọi kit-shots');
  assert.ok(!daGoi(ep, 'shot-gen.mjs'), 'không gọi shot-gen của đường cũ');
  assert.ok(giaLog(ep).find((d) => d.lenh.includes('kit-shots.mjs')).lenh.includes('--goc'), 'có goc.json thì truyền --goc');
  const shots = fs.readFileSync(path.join(GOC, 'episodes', ep, 'shots.js'), 'utf8');
  assert.match(shots, /export const SHOTS = \[/);
  const kit = JSON.parse(fs.readFileSync(path.join(GOC, kitArg, 'bang-shot.json'), 'utf8'));
  for (const s of kit.shots) assert.ok(shots.includes(s.id), `shots.js thiếu ${s.id}`);

  // người/agent khai episode.js + index.html -> đi tiếp; shots.js KHÔNG bị sinh lại (giữ chỗ sửa tay)
  fs.appendFileSync(path.join(GOC, 'episodes', ep, 'shots.js'), '// sửa tay\n');
  khaiTapTay(ep);
  const c = lam(ep, 'tiep', '--kit', kitArg);
  assert.equal(c.ma, 0, c.loi);
  assert.deepEqual(c.json.canAgent, []);
  assert.deepEqual(giaLog(ep).filter((d) => d.lenh.includes('kit-shots.mjs')).length, 1, 'kit-shots chỉ chạy 1 lần');
  assert.match(fs.readFileSync(path.join(GOC, 'episodes', ep, 'shots.js'), 'utf8'), /sửa tay/);
  const buoc = JSON.parse(fs.readFileSync(path.join(GOC, 'output', ep, 'kiem', 'trang-thai.json'), 'utf8')).buoc;
  for (const t of THU_TU) assert.ok(buoc[t]?.xong, `bước ${t} phải xong`);
  assert.ok(c.json.lien.phim.duongDan.endsWith(`${ep}.html`) || c.json.lien.xemThu.duongDan.endsWith(`${ep}_xem-thu.html`));

  // chạy lại: không bước nào chạy lại
  const d = lam(ep, 'tiep', '--kit', kitArg);
  assert.equal(d.ma, 0, d.loi);
  assert.deepEqual(d.json.daChay, []);
});

test('kit: kit đổi -> duyệt lại, sinh lại shots.js và sao lưu bản cũ', () => {
  const { ep, dich, kitArg } = tapKit('3');
  lam(ep, 'tiep', '--kit', kitArg, '--duyet-kit');
  khaiTapTay(ep);
  assert.equal(lam(ep, 'tiep', '--kit', kitArg).ma, 0);
  const bs = JSON.parse(fs.readFileSync(path.join(dich, 'bang-shot.json'), 'utf8'));
  bs.ten = (bs.ten || '') + ' (đổi)';
  fs.writeFileSync(path.join(dich, 'bang-shot.json'), JSON.stringify(bs, null, 1));
  const a = lam(ep, 'tiep', '--kit', kitArg);
  assert.equal(a.ma, 1, a.loi);
  assert.match(a.json.canNguoiDung.lyDo, /kit đã đổi/);
  const b = lam(ep, 'tiep', '--kit', kitArg, '--duyet-kit');
  assert.equal(b.ma, 0, b.loi);
  assert.ok(b.json.canhBao.some((w) => /sinh lại shots\.js/.test(w)), b.out);
  assert.equal(giaLog(ep).filter((d) => d.lenh.includes('kit-shots.mjs')).length, 2);
});

test('kit: kit hỏng (kiem-kit lỗi) -> canAgent sửa kit, không sinh shots.js', () => {
  const { ep, dich, kitArg } = tapKit('4');
  const kit = JSON.parse(fs.readFileSync(path.join(dich, 'kit.json'), 'utf8'));
  delete kit.shots;
  fs.writeFileSync(path.join(dich, 'kit.json'), JSON.stringify(kit));
  const a = lam(ep, 'tiep', '--kit', kitArg);
  assert.equal(a.ma, 0, a.loi);
  assert.equal(a.json.buocTiep, 'kich-ban');
  assert.equal(a.json.canAgent.length, 1);
  assert.match(a.json.canAgent[0].viec, /kiem-kit/);
  assert.ok(!fs.existsSync(path.join(GOC, 'episodes', ep, 'shots.js')));
});

test('kit: env trong goc.json chưa đăng ký engine/envs.js -> asset báo canAgent scene-env', () => {
  const { ep, dich, kitArg } = tapKit('5');
  const g = JSON.parse(fs.readFileSync(path.join(dich, 'goc.json'), 'utf8'));
  const id = Object.keys(g)[0];
  g[id].env = 'e9-khong-co-that';
  fs.writeFileSync(path.join(dich, 'goc.json'), JSON.stringify(g));
  const a = lam(ep, 'tiep', '--kit', kitArg);
  assert.equal(a.json.buocTiep, 'asset');
  assert.ok(a.json.canAgent.some((x) => x.file === 'engine/envs/e9-khong-co-that.js' && /scene-env/.test(x.viec)), a.out);
});

test('--kit trỏ thư mục không có kit -> mã 2; không kit thì KHÔNG có trường kit và vẫn chạy đường cũ (lint.py + shot-gen)', () => {
  const x = lam('_test_lamphimkit6', 'tiep', '--kit', 'output/_tmp/noi-lam-phim/khong-co');
  assert.equal(x.ma, 2);
  const ep = '_test_lamphimkit7';
  TEN.push(ep); xoa(ep);
  fs.mkdirSync(path.join(GOC, 'episodes', ep), { recursive: true });
  fs.writeFileSync(path.join(GOC, 'episodes', ep, 'kich-ban.md'), '# kịch bản giả\n');
  const a = lam(ep, 'tiep');
  assert.equal(a.ma, 0, a.loi);
  assert.equal(a.json.kit, undefined);
  assert.deepEqual(a.json.daChay, THU_TU);
  assert.ok(daGoi(ep, 'lint.py') && daGoi(ep, 'shot-gen.mjs'));
  assert.ok(!daGoi(ep, 'kit-shots.mjs') && !daGoi(ep, 'kiem-kit.mjs'));
});

test('kit: tự nhận biết khi có kich-ban/<ep>/kit.json + bang-shot.json (không cần --kit); --cu ép đường cũ', () => {
  const { ep, dich } = tapKit('8');
  const d = path.join(GOC, 'kich-ban', ep);
  after(() => fs.rmSync(d, { recursive: true, force: true }));
  fs.cpSync(dich, d, { recursive: true });
  const a = lam(ep, 'tiep');
  assert.equal(a.json.kit, `kich-ban/${ep}`);
  assert.equal(a.json.buocTiep, 'mau-duyet');
  assert.ok(daGoi(ep, 'kiem-kit.mjs'));
  // --cu: bỏ qua kit, đường cũ thiếu kịch bản -> canNguoiDung "Chưa có kịch bản", không trường kit
  const b = lam(ep, 'tiep', '--cu');
  assert.equal(b.json.kit, undefined);
  assert.match(b.json.canNguoiDung.lyDo, /Chưa có kịch bản/);
});
