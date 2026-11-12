#!/usr/bin/env node
// lam-phim: điều phối PHẦN TẤT ĐỊNH của dây chuyền "một câu luật -> phim HTML" (spec mục 4 bước 3a-3f).
//   node tools/lam-phim.mjs <ep> tiep          chạy lần lượt các bước cần chạy cho tới khi gặp việc phải nhờ agent / người dùng
//   node tools/lam-phim.mjs <ep> <buoc>        chạy đúng 1 bước (chỉ khi đầu vào đã đổi; --force ép chạy)
//   node tools/lam-phim.mjs <ep> trang-thai    chỉ đọc: trạng thái 8 bước + bước kế tiếp (không chạy gì)
// Bước: kich-ban, asset, giong, mau-duyet, shot, ra-loi, am-thanh, gop (tools/kiem/trang-thai.mjs).
// KHÔNG gọi LLM, KHÔNG commit/push. Việc cần agent / người dùng chỉ được IN RA. Stdout = một khối JSON:
//   { ep, buocTiep, canAgent:[{viec,file,model}], canNguoiDung:null|{lyDo,anh}, daChay[], daBo[], dangChayNen[],
//     canhBao[], lien:null|{...}, toiDaSongSong:3 }       (log tiến trình ra stderr)
// Bước chạy lại khi đầu vào đổi (hash): kich-ban, asset, mau-duyet <- kịch bản (+ manifest); giong <- lời kể (bỏ @at);
//   shot <- kịch bản + narration.json; ra-loi <- shot + shots.js; am-thanh <- ra-loi + sfx/music; gop <- am-thanh + (giọng thật xong?).
// Giọng: --dry trước (có nhịp), rồi python tools/tts.py chạy NỀN (không chặn); CapCut lỗi / log không đổi quá
//   goi.phutKhongTien phút -> canNguoiDung (KHÔNG tự đổi sang Edge). Bước khác treo quá ngưỡng đó (batDau cũ, nhật ký không đổi) -> canNguoiDung.
// LAM_PHIM_GIA=1: mọi lệnh con thay bằng lệnh giả (ghi output/<ep>/kiem/gia.log, tạo vài file kết quả tối thiểu) — dùng cho test.
// Mã thoát: 0 chạy được (kể cả đang chờ agent / giọng nền), 1 cần người dùng, 2 lỗi môi trường / tham số.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BUOC, docTrangThai, canChay, batDau, datBuoc, hashVao, ghiNhatKy, docNhatKy, thuMucKiem } from './kiem/trang-thai.mjs';
import { nguong } from './kiem/luat.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PY = process.platform === 'win32' ? 'python' : 'python3';
const ENV = { ...process.env, PYTHONIOENCODING: 'utf8', PYTHONDONTWRITEBYTECODE: '1' };
const CONT = new Set(['^', '〃', '"', '""', '…cont', '+']);   // cùng tập ký hiệu "nối câu trước" với kichban.py
const DEP = { 'ra-loi': 'shot', 'am-thanh': 'ra-loi', gop: 'am-thanh' };   // bước sau băm kèm hash bước trước
const TOI_DA_AGENT = 3;

class LoiMoiTruong extends Error {}

const sha = (s) => crypto.createHash('sha1').update(s).digest('hex');
const rel = (...p) => path.join(...p).split(path.sep).join('/');
const readJson = (f, mac = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return mac; } };
const log = (m) => process.stderr.write(m + '\n');

// ---------- đường dẫn ----------
const epDir = (ep) => path.join(GOC, 'episodes', ep);
const kiemDir = (ep) => thuMucKiem(ep);
const giongDir = (ep) => path.join(kiemDir(ep), 'giong');
function kbFile(ep) {
  for (const f of [path.join(epDir(ep), 'kich-ban.md'), path.join(GOC, 'kich-ban', ep, 'kich-ban.md')]) if (fs.existsSync(f)) return f;
  return null;
}
const kbSha = (ep) => { const f = kbFile(ep); return f ? sha(fs.readFileSync(f)) : 'thieu'; };
const urlFile = (f) => 'file:///' + f.replace(/\\/g, '/').replace(/ /g, '%20');

// ---------- file riêng của lam-phim ----------
const fLm = (ep) => path.join(kiemDir(ep), 'lam-phim.json');
const docLm = (ep) => readJson(fLm(ep), {}) || {};
function ghiLm(ep, patch) {
  const d = { ...docLm(ep), ...patch };
  fs.mkdirSync(kiemDir(ep), { recursive: true });
  fs.writeFileSync(fLm(ep), JSON.stringify(d, null, 1) + '\n');
}

// ---------- lời kể ----------
function chuanNarration(text) {
  return text.split(/\r?\n/).filter((l) => !l.startsWith('#')).map((l) => l.replace(/^@at\s+[\d.]+\s*/, '').trim()).filter(Boolean).join('\n');
}
const hashNarration = (ep) => {
  const f = path.join(epDir(ep), 'narration.txt');
  return sha(fs.existsSync(f) ? chuanNarration(fs.readFileSync(f, 'utf8')) : '');
};

// ---------- hash đầu vào từng bước ----------
function bam(ep, b) {
  const p = [];
  const dep = DEP[b];
  if (dep) p.push(docTrangThai(ep).buoc[dep]?.hash || '');
  const E = `episodes/${ep}`;
  switch (b) {
    case 'kich-ban': p.push(kbSha(ep)); break;
    case 'asset':
    case 'mau-duyet': p.push(kbSha(ep), hashVao(['assets/manifest.json'])); break;
    case 'giong': p.push(hashNarration(ep)); break;
    case 'shot': p.push(kbSha(ep), hashVao([`${E}/narration.json`])); break;
    case 'ra-loi': p.push(hashVao([`${E}/shots.js`])); break;
    case 'am-thanh': p.push(hashVao([`${E}/sfx`, `${E}/music`])); break;
    case 'gop': p.push(giongXong(ep) ? 'giong-xong' : 'giong-nhap'); break;
    default: throw new Error('bước lạ: ' + b);
  }
  return sha(p.join('|'));
}
const giongXong = (ep) => !canChay(ep, 'giong', bam(ep, 'giong'));

// ---------- chạy lệnh con (thật / giả) ----------
function giaTao(c, args) {
  const k = kiemDir(c.ep); fs.mkdirSync(k, { recursive: true });
  const co = (s) => args.some((a) => String(a).endsWith(s));
  if (co('asset-plan.mjs')) fs.writeFileSync(path.join(k, 'thieu.json'), JSON.stringify({ env: [], prop: [], anim: [], tuDung: [] }));
  if (co('mau-duyet.mjs') && !fs.existsSync(path.join(k, 'mau.json'))) fs.writeFileSync(path.join(k, 'mau.json'), JSON.stringify({ 'nv:hero:thuong': { duyet: true } }));
  if (co('ra-loi.mjs')) {   // gia-ra-loi.json (nếu test đặt sẵn) = kết quả giả của ra-loi
    const tay = path.join(k, 'gia-ra-loi.json');
    fs.writeFileSync(path.join(k, 'ra-loi.json'), fs.existsSync(tay) ? fs.readFileSync(tay) : JSON.stringify({ goi: { can: false, lyDo: [] }, conLai: [], loiKe: [], khongSua: [] }));
  }
  if (co('tts.py') && args.includes('--dry') && !fs.existsSync(path.join(epDir(c.ep), 'narration.json'))) fs.writeFileSync(path.join(epDir(c.ep), 'narration.json'), JSON.stringify({ gia: 'dry' }));
}
function chay(c, buoc, cmd, args, { loiOk = false } = {}) {
  const lenh = [cmd, ...args].join(' ');
  if (c.gia) {
    fs.mkdirSync(kiemDir(c.ep), { recursive: true });
    fs.appendFileSync(path.join(kiemDir(c.ep), 'gia.log'), JSON.stringify({ buoc, lenh }) + '\n');
    giaTao(c, args);
    return { status: 0, out: '' };
  }
  log(`> [${buoc}] ${lenh}`);
  const r = spawnSync(cmd, args, { cwd: GOC, env: ENV, encoding: 'utf8', maxBuffer: 256 << 20 });
  const out = (r.stdout || '') + (r.stderr || '');
  if (out) process.stderr.write(out.endsWith('\n') ? out : out + '\n');
  if (r.error) { if (loiOk) return { status: 2, out }; throw new LoiMoiTruong(`${cmd}: ${r.error.message}`); }
  return { status: r.status ?? 2, out };
}
const duoi = (s, n = 6) => String(s).trim().split('\n').slice(-n).join('\n');
const node = (c, buoc, script, ...a) => chay(c, buoc, process.execPath, [script, ...a]);

// ---------- việc nhờ agent / người dùng ----------
const chan = (o) => ({ chan: { canAgent: [], canNguoiDung: null, ...o } });
const anhCo = (ep, ...fs_) => fs_.map((f) => rel('output', ep, f)).filter((f) => fs.existsSync(path.join(GOC, f)));

// ---------- handler từng bước ----------
const H = {};

H['kich-ban'] = async (c) => {
  const f = kbFile(c.ep);
  if (!f) return chan({ canNguoiDung: { lyDo: `Chưa có kịch bản: episodes/${c.ep}/kich-ban.md. Dùng skill viet-kich-ban (5 mẫu -> chọn -> kịch bản đầy đủ) rồi duyệt MỐC 1b.`, anh: [] } });
  const r = chay(c, 'kich-ban', PY, ['-X', 'utf8', 'tools/kb/lint.py', path.relative(GOC, f)]);
  if (r.status === 2) throw new LoiMoiTruong('lint.py lỗi môi trường: ' + duoi(r.out));
  if (r.status !== 0) {
    return chan({ canAgent: [{ viec: `Sửa kịch bản cho hết lỗi lint (python tools/kb/lint.py ${rel(path.relative(GOC, f))}). Lỗi cuối: ${duoi(r.out, 8).replace(/\n/g, ' | ')}`, file: rel(path.relative(GOC, f)), model: 'sonnet' }] });
  }
  return {};
};

H.asset = async (c) => {
  const r = node(c, 'asset', 'tools/kb/asset-plan.mjs', c.ep);
  const t = readJson(path.join(kiemDir(c.ep), 'thieu.json'), null);
  if (r.status === 2 || (r.status === 1 && !t)) throw new LoiMoiTruong('asset-plan lỗi: ' + duoi(r.out));
  if (r.status === 1) return chan({ canAgent: [{ viec: `Kịch bản có lỗi dữ liệu khi lập kế hoạch asset: ${duoi(r.out, 6).replace(/\n/g, ' | ')}`, file: `episodes/${c.ep}/kich-ban.md`, model: 'sonnet' }] });
  const ag = [];
  for (const e of t.env || []) ag.push({ viec: `Dựng bối cảnh "${e.ten}" (${e.moTa || 'theo kịch bản'}) theo skill scene-env${e.congThuc ? ', công thức ' + JSON.stringify(e.congThuc) : ''}; thêm layers front/mid/back`, file: `engine/envs/${e.ten}.js`, model: 'sonnet' });
  const nhap = [], dung = [];
  for (const p of t.prop || []) ((p.ungVien || []).some((u) => u.id) ? nhap : dung).push(p);
  if (nhap.length) ag.push({ viec: `Nhập mô hình vào assets/manifest.json (kèm pose/anim, ghi công CREDITS): ${nhap.map((p) => `${p.ten} <- ${p.ungVien.find((u) => u.id).nguon}:${p.ungVien.find((u) => u.id).id}`).join('; ')}`, file: 'assets/manifest.json', model: 'sonnet' });
  if (dung.length) ag.push({ viec: `Dựng đạo cụ bằng code (skill ref-model, khai báo mat từng bộ phận): ${dung.map((p) => p.ten).join(', ')}`, file: 'engine/props.js', model: 'sonnet' });
  if ((t.anim || []).length) ag.push({ viec: `Thêm animation R15 (phương pháp skill r6-anim, hàm thuần của t): ${t.anim.join(', ')}`, file: 'engine/r15.js', model: 'sonnet' });
  if (ag.length) return chan({ canAgent: ag });
  return {};
};

H['mau-duyet'] = async (c) => {
  const r = node(c, 'mau-duyet', 'tools/mau-duyet.mjs', c.ep);
  if (r.status === 2) throw new LoiMoiTruong('mau-duyet lỗi môi trường: ' + duoi(r.out));
  if (r.status === 1) return chan({ canAgent: [{ viec: `Kịch bản có lỗi dữ liệu khi lập bảng mẫu: ${duoi(r.out, 6).replace(/\n/g, ' | ')}`, file: `episodes/${c.ep}/kich-ban.md`, model: 'sonnet' }] });
  const mau = readJson(path.join(kiemDir(c.ep), 'mau.json'), null);
  if (!mau) throw new LoiMoiTruong('mau-duyet không ghi output/<ep>/kiem/mau.json');
  const chuaCo = Object.entries(mau).filter(([, v]) => v && v.chua_co);
  if (chuaCo.length) {
    const fileCua = (muc) => (muc.startsWith('env:') ? `engine/envs/${muc.split(':')[1]}.js` : muc.startsWith('prop:') ? 'engine/props.js' : `episodes/${c.ep}/episode.js`);
    return chan({ canAgent: chuaCo.slice(0, TOI_DA_AGENT * 4).map(([muc, v]) => ({ viec: `Dựng để chụp được mẫu ${muc}: ${v.chua_co}`, file: fileCua(muc), model: 'sonnet' })) });
  }
  const chuaDuyet = Object.entries(mau).filter(([, v]) => !v || v.duyet !== true).map(([k]) => k);
  if (chuaDuyet.length) {
    const anh = anhCo(c.ep, 'duyet/00_mau.jpg', 'duyet/00_mau_2.jpg', 'duyet/00_mau_3.jpg');
    return chan({ canNguoiDung: { lyDo: `MOC DUYET 2: ${chuaDuyet.length} mẫu chưa duyệt (${chuaDuyet.slice(0, 8).join(', ')}${chuaDuyet.length > 8 ? ', …' : ''}). Xem bảng mẫu rồi duyệt: node tools/mau-duyet.mjs ${c.ep} --duyet tat-ca (hoặc --tu-choi <muc,..>).`, anh: anh.length ? anh : [rel('output', c.ep, 'duyet/00_mau.jpg')] } });
  }
  return {};
};

H.shot = async (c) => {
  const dich = path.join(epDir(c.ep), 'kich-ban.md');
  const nguon = kbFile(c.ep);
  if (!nguon) return chan({ canNguoiDung: { lyDo: 'Chưa có kịch bản.', anh: [] } });
  if (path.resolve(nguon) !== path.resolve(dich)) { fs.mkdirSync(epDir(c.ep), { recursive: true }); fs.copyFileSync(nguon, dich); }
  const khop = fs.existsSync(path.join(epDir(c.ep), 'narration.json'));
  const r = node(c, 'shot', 'tools/shot-gen.mjs', c.ep, '--force', ...(khop ? ['--khop-giong'] : []));
  if (r.status === 2) throw new LoiMoiTruong('shot-gen lỗi môi trường: ' + duoi(r.out));
  if (r.status !== 0) return chan({ canAgent: [{ viec: `Sửa kịch bản/lời kể cho shot-gen chạy được${khop ? ' (có --khop-giong: số câu narration.json phải khớp kịch bản)' : ''}: ${duoi(r.out, 8).replace(/\n/g, ' | ')}`, file: `episodes/${c.ep}/kich-ban.md`, model: 'sonnet' }] });
  ghiLm(c.ep, { vongRaLoi: 0 });
  return {};
};

H['ra-loi'] = async (c) => {
  const trang = `episodes/${c.ep}/index.html`;
  const kl = node(c, 'ra-loi', 'tools/kiem-luat.mjs', trang, '--ep', c.ep, '--shots', 'all');
  if (kl.status === 2) throw new LoiMoiTruong('kiem-luat lỗi môi trường: ' + duoi(kl.out));
  const r = node(c, 'ra-loi', 'tools/ra-loi.mjs', c.ep);
  if (r.status === 2) throw new LoiMoiTruong('ra-loi lỗi môi trường: ' + duoi(r.out));
  const rl = readJson(path.join(kiemDir(c.ep), 'ra-loi.json'), null);
  if (!rl) throw new LoiMoiTruong('ra-loi không ghi output/<ep>/kiem/ra-loi.json');
  if (rl.goi && rl.goi.can) {
    return chan({ canNguoiDung: { lyDo: (rl.goi.lyDo || []).join('; ') || 'ra-loi yêu cầu gọi người dùng', anh: anhCo(c.ep, 'duyet/luoi-loi.jpg', 'duyet/02_loi') } });
  }
  const loiKe = rl.loiKe || [], conLai = rl.conLai || [];
  if (!loiKe.length && !conLai.length) return {};
  const vongMax = nguong(epDir(c.ep)).goi?.vongMax ?? 2, lm = docLm(c.ep), vong = lm.vongRaLoi || 0;
  if (vong >= vongMax) {
    c.kq.canhBao.push(`ra-loi: còn ${conLai.length} lỗi dưới ngưỡng + ${loiKe.length} lỗi cần sửa lời kể sau ${vong} lượt agent — chấp nhận, đi tiếp (xem output/${c.ep}/kiem/ra-loi.json)`);
    return {};
  }
  const ag = [];
  if (loiKe.length) ag.push({ viec: `Sửa 1-3 từ lời kể cho khớp hình rồi tạo lại câu giọng đó: ${loiKe.map((x) => `${x.shot} (câu ${x.cau}) ${x.lyDo}`).join('; ')}`, file: `episodes/${c.ep}/narration.txt`, model: 'sonnet' });
  const nhom = {};
  for (const x of conLai) (nhom[x.luat] = nhom[x.luat] || []).push(x.shot);
  const ds = Object.entries(nhom);
  const cho = TOI_DA_AGENT - ag.length;
  const gop = ds.slice(0, Math.max(cho, 1));
  for (let i = cho; i < ds.length && gop.length; i++) { gop[gop.length - 1][0] += '+' + ds[i][0]; gop[gop.length - 1][1] = [...gop[gop.length - 1][1], ...ds[i][1]]; }
  for (const [luat, ids] of gop) ag.push({ viec: `Rà và sửa tay lỗi luật ${luat} ở các shot ${[...new Set(ids)].join(', ')} (chỉ Edit đúng dòng các shot này, rồi chụp kiểm bằng look.mjs --shots)`, file: `episodes/${c.ep}/shots.js`, model: 'sonnet' });
  ghiLm(c.ep, { vongRaLoi: vong + 1 });
  return chan({ canAgent: ag.slice(0, TOI_DA_AGENT) });
};

H['am-thanh'] = async (c) => {
  const E = epDir(c.ep), lop = ['canh'];
  if (fs.existsSync(path.join(E, 'sfx', 'layers.json'))) lop.push('nen', 'buoc-chan');
  else c.kq.canhBao.push(`thiếu episodes/${c.ep}/sfx/layers.json: bỏ lớp nen + buoc-chan`);
  const sfxDir = path.join(E, 'sfx');
  if (fs.existsSync(sfxDir) && fs.readdirSync(sfxDir).some((n) => /^cues_.*\.json$/.test(n))) lop.push('khoanh-khac');
  else c.kq.canhBao.push('chưa có sfx/cues_*.json: bỏ lớp khoanh-khac');
  if (fs.existsSync(path.join(E, 'music', 'plan.json'))) lop.push('nhac');
  else c.kq.canhBao.push(`thiếu episodes/${c.ep}/music/plan.json: phim chưa có nhạc nền (nhờ agent chọn nhạc theo skill tieng-dong)`);
  lop.push('phu-de');
  const r = node(c, 'am-thanh', 'tools/build.mjs', c.ep, ...lop, '--no-bundle');
  if (r.status !== 0) throw new LoiMoiTruong(`build.mjs ${lop.join(' ')} lỗi (mã ${r.status}): ${duoi(r.out)}`);
  const g = node(c, 'am-thanh', 'tools/ghi-cong.mjs', c.ep);
  if (g.status === 3) {
    const j = readJson(path.join(E, 'ghi-cong.json'), {}) || {};
    return chan({ canNguoiDung: { lyDo: `Asset ĐANG DÙNG chưa rõ giấy phép: ${JSON.stringify(j.chuaRo || '(xem ghi-cong.json)')}. Thay asset hoặc chạy ghi-cong.mjs --cho-phep-chua-ro nếu bạn chịu trách nhiệm.`, anh: [] } });
  }
  if (g.status !== 0) throw new LoiMoiTruong(`ghi-cong lỗi (mã ${g.status}): ${duoi(g.out)}`);
  return {};
};

H.gop = async (c) => {
  const final = giongXong(c.ep);
  const dist = (n) => path.join(GOC, 'dist', n);
  if (final) {
    const r = node(c, 'gop', 'tools/build.mjs', c.ep, 'all');
    if (r.status !== 0) throw new LoiMoiTruong(`build.mjs all lỗi (mã ${r.status}): ${duoi(r.out)}`);
  } else {
    const r = node(c, 'gop', 'tools/build.mjs', c.ep, 'all', '--no-bundle');
    if (r.status !== 0) throw new LoiMoiTruong(`build.mjs all lỗi (mã ${r.status}): ${duoi(r.out)}`);
    const b = node(c, 'gop', 'tools/bundle.mjs', c.ep, '--out', `dist/${c.ep}_xem-thu.html`);
    if (b.status !== 0) throw new LoiMoiTruong(`bundle.mjs lỗi (mã ${b.status}): ${duoi(b.out)}`);
    c.kq.canhBao.push('Bản nháp (giọng thật chưa xong): dist/<ep>_xem-thu.html. Khi giọng xong, chạy lại tiep -> shot/ra-loi/am-thanh/gop chạy lại (vòng rà lỗi cuối với giọng thật) và ra dist/<ep>.html.');
  }
  const t = node(c, 'gop', 'tools/theo-doi.mjs', c.ep);
  if (t.status !== 0) throw new LoiMoiTruong(`theo-doi lỗi (mã ${t.status}): ${duoi(t.out)}`);
  const lk = (n) => ({ duongDan: dist(n), file: urlFile(dist(n)) });
  c.kq.lien = final ? { phim: lk(`${c.ep}.html`), theoDoi: lk(`${c.ep}_theo-doi.html`) } : { xemThu: lk(`${c.ep}_xem-thu.html`), theoDoi: lk(`${c.ep}_theo-doi.html`) };
  return {};
};

// ---------- giọng (nền) ----------
function suyNarration(c) {
  if (c.gia) return '# gia\n@source capcut\n@narrator BV075_streaming\n\n@at 0.00 xin chao\n';
  const f = kbFile(c.ep);
  if (!f) throw new LoiMoiTruong('không có kịch bản để suy lời kể');
  const r = spawnSync(PY, ['-X', 'utf8', 'tools/kb/kichban.py', f, '--json'], { cwd: GOC, env: ENV, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.error || r.status !== 0) throw new LoiMoiTruong('kichban.py lỗi: ' + (r.error?.message || duoi(r.stderr || r.stdout)));
  const d = JSON.parse(r.stdout);
  let t = 0; const lines = [];
  for (const sh of d.shots) {
    const nar = sh.narration || '';
    if (!CONT.has(nar) && nar) lines.push(`@at ${t.toFixed(2)} ${nar}`);
    t += sh.dur || 0;
  }
  const m = d.meta || {};
  return [`# ${m.title || c.ep} — lời kể sinh từ kich-ban.md bởi lam-phim. @at = ước lượng (~14 ký tự/giây); tools/tts.py canh đúng mốc.`,
    `@source ${m.voice_source || 'capcut'}`, `@narrator ${m.narrator || 'BV075_streaming'}`, '', ...lines, ''].join('\n');
}
function damBaoNarration(c) {
  const f = path.join(epDir(c.ep), 'narration.txt');
  const lm = docLm(c.ep), k = kbSha(c.ep);
  if (fs.existsSync(f) && !(lm.narrationKb && lm.narrationKb !== k)) return;
  fs.mkdirSync(epDir(c.ep), { recursive: true });
  fs.writeFileSync(f, suyNarration(c));
  ghiLm(c.ep, { narrationKb: k });
  log(`lam-phim: ghi ${rel('episodes', c.ep, 'narration.txt')} từ kịch bản`);
}
const pidSong = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
function pyCapcut() {
  if (process.env.LAM_PHIM_PY_CAPCUT) return process.env.LAM_PHIM_PY_CAPCUT;
  const v = 'S:\\ChatGPT\\MMO TOOL\\TTS1\\.venv\\Scripts\\python.exe';
  return fs.existsSync(v) ? v : PY;
}
function trangThaiGiong(c, h) {
  const d = giongDir(c.ep), tt = readJson(path.join(d, 'tt.json'), null);
  if (!tt || tt.hash !== h) return { st: 'chua' };
  const ma = path.join(d, 'ma.txt');
  if (fs.existsSync(ma)) { const m = fs.readFileSync(ma, 'utf8').trim(); return m === '0' ? { st: 'xong' } : { st: 'loi', ma: m }; }
  if (!pidSong(tt.pid)) return { st: 'chet' };
  const lg = path.join(d, 'tts.log');
  const moc = Math.max(fs.existsSync(lg) ? fs.statSync(lg).mtimeMs : 0, Date.parse(tt.batDau) || 0);
  const phut = (Date.now() - moc) / 60000;
  const ng = nguong(epDir(c.ep)).goi?.phutKhongTien ?? 30;
  return phut > ng ? { st: 'ket', phut: Math.round(phut) } : { st: 'dang-chay' };
}
function khoiChayGiong(c, h) {
  const d = giongDir(c.ep); fs.mkdirSync(d, { recursive: true });
  fs.rmSync(path.join(d, 'ma.txt'), { force: true });
  const narr = rel('episodes', c.ep, 'narration.txt');
  const dry = chay(c, 'giong', PY, ['tools/tts.py', narr, '--dry']);
  if (dry.status !== 0) throw new LoiMoiTruong('tts.py --dry lỗi: ' + duoi(dry.out));
  const lg = path.join(d, 'tts.log'), ma = path.join(d, 'ma.txt');
  fs.writeFileSync(lg, `[lam-phim ${new Date().toISOString()}] tts.py ${narr}\n`);
  batDau(c.ep, 'giong');
  const tt = { hash: h, pid: 0, batDau: new Date().toISOString() };
  if (c.gia) {
    fs.appendFileSync(path.join(kiemDir(c.ep), 'gia.log'), JSON.stringify({ buoc: 'giong', lenh: `python tools/tts.py ${narr} --workers 2 (nền)` }) + '\n');
    fs.writeFileSync(ma, '0');
  } else {
    const code = `const {spawnSync}=require('child_process');const fs=require('fs');const [py,cwd,log,ma,...a]=JSON.parse(process.argv[1]);`
      + `const fd=fs.openSync(log,'a');const r=spawnSync(py,a,{cwd,stdio:['ignore',fd,fd],env:{...process.env,PYTHONIOENCODING:'utf8'}});fs.writeFileSync(ma,String(r.status===null?'killed':r.status));`;
    const ch = spawn(process.execPath, ['-e', code, JSON.stringify([pyCapcut(), GOC, lg, ma, 'tools/tts.py', narr, '--workers', '2'])], { cwd: GOC, detached: true, stdio: 'ignore' });
    ch.unref();
    tt.pid = ch.pid;
    log(`lam-phim: giọng chạy nền (pid ${ch.pid}), log ${path.relative(GOC, lg)}`);
  }
  fs.writeFileSync(path.join(d, 'tt.json'), JSON.stringify(tt));
}

async function buocGiong(c) {
  damBaoNarration(c);
  const h = bam(c.ep, 'giong');
  if (!c.force && !canChay(c.ep, 'giong', h)) return { daBo: true };
  let s = trangThaiGiong(c, h);
  if (s.st === 'chua') { khoiChayGiong(c, h); s = trangThaiGiong(c, h); }
  const logPath = rel('output', c.ep, 'kiem', 'giong', 'tts.log');
  if (s.st === 'xong') { datBuoc(c.ep, 'giong', { hash: h, xong: true }); return { chay: true }; }
  if (s.st === 'dang-chay') { c.kq.dangChayNen.push('giong'); return { nen: true }; }
  const lyDo = s.st === 'loi' ? `Giọng CapCut lỗi (python thoát mã ${s.ma}). Không tự đổi sang Edge.`
    : s.st === 'chet' ? 'Tiến trình giọng CapCut đã chết giữa chừng (không có mã thoát). Không tự đổi sang Edge.'
      : `Giọng CapCut không tiến ${s.phut} phút (log không đổi). Không tự đổi sang Edge.`;
  if (s.st !== 'ket') fs.rmSync(path.join(giongDir(c.ep), 'tt.json'), { force: true });   // lần sau chạy lại (câu đã xong nằm trong cache)
  datBuoc(c.ep, 'giong', { xong: false });
  return chan({ canNguoiDung: { lyDo: `${lyDo} Xem ${logPath}; xử lý CapCut/mạng rồi chạy lại.`, anh: [], log: logPath } });
}

// ---------- treo quá hạn ----------
function quaHan(c) {
  const st = docTrangThai(c.ep).buoc;
  const ng = nguong(epDir(c.ep)).goi?.phutKhongTien ?? 30, nk = docNhatKy(c.ep);
  for (const b of BUOC) {
    if (b === 'giong') continue;
    const t0 = st[b]?.bat_dau ? Date.parse(st[b].bat_dau) : NaN;
    if (!Number.isFinite(t0)) continue;
    const moc = Math.max(t0, ...nk.map((x) => Date.parse(x.ts) || 0));
    if ((Date.now() - moc) / 60000 > ng) {
      datBuoc(c.ep, b, { xong: false });   // xoá bat_dau để lần sau chạy lại
      return { b, phut: Math.round((Date.now() - moc) / 60000) };
    }
  }
  return null;
}

// ---------- điều phối ----------
async function chayBuoc(c, b) {
  if (b === 'giong') return buocGiong(c);
  const h = bam(c.ep, b);
  if (!c.force && !canChay(c.ep, b, h)) return { daBo: true };
  batDau(c.ep, b);
  log(`== ${b}`);
  const r = await H[b](c);
  if (r.chan) {
    datBuoc(c.ep, b, { xong: false });
    ghiNhatKy(c.ep, { buoc: b, hanh_dong: 'lam-phim', ket: 'chan', canAgent: r.chan.canAgent.length, canNguoiDung: !!r.chan.canNguoiDung });
    return r;
  }
  datBuoc(c.ep, b, { hash: bam(c.ep, b), xong: true });
  ghiNhatKy(c.ep, { buoc: b, hanh_dong: 'lam-phim', ket: 'xong' });
  return { chay: true };
}

async function tiep(ep, { chi = null, force = false, gia = false } = {}) {
  const kq = { ep, buocTiep: null, canAgent: [], canNguoiDung: null, daChay: [], daBo: [], dangChayNen: [], canhBao: [], lien: null, toiDaSongSong: TOI_DA_AGENT };
  const c = { ep, kq, force, gia };
  const treo = quaHan(c);
  if (treo) {
    kq.buocTiep = treo.b;
    kq.canNguoiDung = { lyDo: `Bước ${treo.b} đã chạy quá ${treo.phut} phút mà nhật ký không tiến (có thể treo). Đã đặt lại để chạy lại ở lần sau.`, anh: [] };
    return kq;
  }
  for (const b of chi ? [chi] : BUOC) {
    const r = await chayBuoc(c, b);
    if (r.daBo) { kq.daBo.push(b); continue; }
    if (r.chan) { kq.buocTiep = b; kq.canAgent = r.chan.canAgent; kq.canNguoiDung = r.chan.canNguoiDung; return kq; }
    if (r.chay) kq.daChay.push(b);
  }
  if (!chi && kq.dangChayNen.includes('giong')) kq.buocTiep = 'giong';   // còn chờ giọng thật để ra bản cuối
  return kq;
}

function trangThai(ep) {
  const st = docTrangThai(ep).buoc;
  const buoc = BUOC.map((b) => {
    const s = st[b] || {};
    const h = bam(ep, b);
    return { ten: b, xong: !!s.xong, khop: !canChay(ep, b, h), luc: s.luc ?? null, phut: s.phut ?? null, goi: s.goi ?? 0, dangChay: !!s.bat_dau };
  });
  const tiepB = buoc.find((x) => !x.khop);
  const g = readJson(path.join(giongDir(ep), 'tt.json'), null);
  return { ep, buoc, buocTiep: tiepB ? tiepB.ten : null, giong: g ? { pid: g.pid, batDau: g.batDau, ma: fs.existsSync(path.join(giongDir(ep), 'ma.txt')) ? fs.readFileSync(path.join(giongDir(ep), 'ma.txt'), 'utf8').trim() : null } : null, vongRaLoi: docLm(ep).vongRaLoi || 0 };
}

export async function main(argv) {
  const pos = argv.filter((a) => !a.startsWith('--'));
  const force = argv.includes('--force');
  const [ep, act = 'tiep'] = pos;
  const dung = 'Dùng: node tools/lam-phim.mjs <ep> [tiep|trang-thai|' + BUOC.join('|') + '] [--force]';
  if (!ep || !/^[\w-]+$/.test(ep)) { console.error(dung); return 2; }
  if (act !== 'tiep' && act !== 'trang-thai' && !BUOC.includes(act)) { console.error(dung); return 2; }
  try {
    if (act === 'trang-thai') { console.log(JSON.stringify(trangThai(ep), null, 1)); return 0; }
    const kq = await tiep(ep, { chi: act === 'tiep' ? null : act, force, gia: process.env.LAM_PHIM_GIA === '1' });
    console.log(JSON.stringify(kq, null, 1));
    return kq.canNguoiDung ? 1 : 0;
  } catch (e) {
    console.error((e instanceof LoiMoiTruong ? '' : 'Lỗi: ') + (e && e.message));
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(await main(process.argv.slice(2)));
}
