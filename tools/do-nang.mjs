#!/usr/bin/env node
// do-nang.mjs — kiểm độ nặng SỚM của một tập: dung lượng bản gộp/tài sản, thời gian mở trang, số shader program.
//
// Cách dùng:
//   node tools/do-nang.mjs <ep> [--trang episodes/<ep>/index.html] [--nguong <file.json>] [--khong-trang]
//     --khong-trang  bỏ phần mở trình duyệt (chỉ đo dung lượng)
//     --nguong f     ghi đè ngưỡng mặc định bằng JSON, vd {"gopMB":{"canhBao":30,"loi":45}}
// Dung lượng bản gộp chỉ `stat` dist/<ep>.html (hoặc _xem-thu.html), KHÔNG đọc nội dung. Mở trang + shader đo qua tools/shaders.mjs.
// In mỗi mục một dòng ĐẠT / CẢNH BÁO / LỖI; ghi output/do-nang/<ep>.json; thoát mã 1 khi có LỖI.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MB = 1024 * 1024;

export const NGUONG_MAC_DINH = {
  gopMB: { canhBao: 30, loi: 45 },
  moGiay: { canhBao: 10, loi: 20 },
  shader: { canhBao: 80, loi: 120 },
  taiSanMB: { canhBao: 5 },
};

const tron = (a, b) => { const r = { ...a }; for (const k of Object.keys(b || {})) r[k] = (a[k] && typeof a[k] === 'object' && typeof b[k] === 'object') ? { ...a[k], ...b[k] } : b[k]; return r; };
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);

// Quét chuỗi đường dẫn tài sản `assets/...` trong mã nguồn (hàm thuần).
export function quetDuongDanTaiSan(src) {
  const re = /(?<![\w/])assets\/[\w\-./ %]+?\.(?:glb|gltf|bin|png|jpe?g|webp|ktx2|hdr|exr|ogg|mp3|wav|json)/gi;
  return [...new Set((String(src).match(re) || []).map((s) => s.replace(/%20/g, ' ')))];
}

// soDo: { gopMB, gopFile, taiSan: [{ file, mb }], moGiay, shader }  (null/undefined = chưa đo → bỏ mục)
// Trả { muc: [{ khoa, tt: 'dat'|'canhbao'|'loi', dong, goiY }], coLoi }
export function chamDoNang(soDo, nguong = NGUONG_MAC_DINH) {
  const n = tron(NGUONG_MAC_DINH, nguong);
  const muc = [];
  const them = (khoa, tt, dong, goiY = '') => muc.push({ khoa, tt, dong, goiY });
  const cham = (v, ng) => (v > ng.loi ? 'loi' : v > ng.canhBao ? 'canhbao' : 'dat');
  if (soDo.gopMB != null) {
    const tt = cham(soDo.gopMB, n.gopMB);
    them('gop', tt, `Bản gộp${soDo.gopFile ? ' ' + soDo.gopFile : ''}: ${f1(soDo.gopMB)} MB (cảnh báo > ${n.gopMB.canhBao}, lỗi > ${n.gopMB.loi})`,
      tt === 'dat' ? '' : 'nén model: node tools/nen-model.mjs <file.glb>; bỏ tài sản không dùng; xem 10 tài sản nặng nhất bên dưới');
  }
  if (soDo.taiSan) {
    const nang = soDo.taiSan.filter((t) => t.mb > n.taiSanMB.canhBao);
    if (nang.length) them('taiSan', 'canhbao', `${nang.length} tài sản đơn > ${n.taiSanMB.canhBao} MB: ${nang.slice(0, 3).map((t) => `${t.file} (${f1(t.mb)} MB)`).join(', ')}${nang.length > 3 ? ' …' : ''}`, `node tools/nen-model.mjs ${nang[0].file}`);
    else them('taiSan', 'dat', `Không tài sản đơn nào > ${n.taiSanMB.canhBao} MB (${soDo.taiSan.length} tài sản quét được)`);
  }
  if (soDo.moGiay != null) {
    const tt = cham(soDo.moGiay, n.moGiay);
    them('mo', tt, `Mở trang tới __ready: ${f1(soDo.moGiay)} s (cảnh báo > ${n.moGiay.canhBao}, lỗi > ${n.moGiay.loi})`, tt === 'dat' ? '' : 'giảm số shader/vật liệu, nén model; đo chi tiết: node tools/shaders.mjs <trang>');
  }
  if (soDo.shader != null) {
    const tt = cham(soDo.shader, n.shader);
    them('shader', tt, `Shader program: ${soDo.shader} (cảnh báo > ${n.shader.canhBao}, lỗi > ${n.shader.loi})`, tt === 'dat' ? '' : 'gộp vật liệu/khoá customProgramCacheKey; xem nhóm theo khoá: node tools/shaders.mjs <trang>');
  }
  return { muc, coLoi: muc.some((m) => m.tt === 'loi') };
}

// ---- phần chạy dòng lệnh ----
const statMB = (p) => { try { return fs.statSync(p).size / MB; } catch { return null; } };
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

function quetTaiSanTap(ep) {
  const epJs = path.join(ROOT, 'episodes', ep, 'episode.js');
  if (!fs.existsSync(epJs)) return null;
  const src = fs.readFileSync(epJs, 'utf8');
  const files = [epJs];
  const envDir = path.join(ROOT, 'engine/envs');
  if (fs.existsSync(envDir)) for (const f of fs.readdirSync(envDir)) {
    if (!f.endsWith('.js')) continue;
    const ten = f.slice(0, -3);
    if (new RegExp(`["'\`]${ten.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'\`]`).test(src)) files.push(path.join(envDir, f));   // bối cảnh tập nhắc tên
  }
  for (const f of ['props-glb.js', 'bear-glb.js', 'ga-rig.js', 'r15.js']) {   // mô-đun nạp tài sản dùng chung
    const p = path.join(ROOT, 'engine', f); if (fs.existsSync(p)) files.push(p);
  }
  const set = new Set();
  for (const f of files) for (const a of quetDuongDanTaiSan(fs.readFileSync(f, 'utf8'))) set.add(a);
  const out = [];
  for (const a of set) { const mb = statMB(path.join(ROOT, a)); if (mb != null) out.push({ file: a, mb }); }
  return out.sort((a, b) => b.mb - a.mb);
}

function main() {
  const args = process.argv.slice(2);
  const ep = args.find((a, i) => !a.startsWith('--') && !['--trang', '--nguong'].includes(args[i - 1]));
  if (!ep) { console.log('Dùng: node tools/do-nang.mjs <ep> [--trang episodes/<ep>/index.html] [--nguong <file.json>] [--khong-trang]'); process.exit(2); }
  const val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const trang = val('--trang') || `episodes/${ep}/index.html`;
  let nguong = NGUONG_MAC_DINH;
  if (val('--nguong')) nguong = tron(NGUONG_MAC_DINH, JSON.parse(fs.readFileSync(path.resolve(val('--nguong')), 'utf8')));

  const soDo = {};
  for (const f of [`dist/${ep}.html`, `dist/${ep}_xem-thu.html`]) {
    const mb = statMB(path.join(ROOT, f));
    if (mb != null) { soDo.gopMB = mb; soDo.gopFile = f; break; }
  }
  const ts = quetTaiSanTap(ep);
  if (ts) soDo.taiSan = ts;
  if (!args.includes('--khong-trang')) {
    fs.mkdirSync(path.join(ROOT, 'output/_tmp'), { recursive: true });
    const tmp = path.join(ROOT, 'output/_tmp', `do-nang-${ep}-shaders.json`);
    console.log(`Đang mở ${trang} để đo shader + thời gian mở (có thể mất 20–60 s)…`);
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/shaders.mjs'), trang, '--json', tmp, '--top', '0'], { cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20 });
    if (r.status === 0 && fs.existsSync(tmp)) {
      const j = JSON.parse(fs.readFileSync(tmp, 'utf8'));
      soDo.moGiay = j.readySec; soDo.shader = (j.afterFilm || j.afterReady).n;
    } else console.log(`  ⚠ Không đo được trang (shaders.mjs mã ${r.status}): ${(r.stdout || '').trim().split('\n').pop() || (r.stderr || '').slice(0, 160)}`);
  }

  const kq = chamDoNang(soDo, nguong);
  console.log(`\n== Độ nặng ${ep} ==`);
  const NHAN = { dat: '✔ ĐẠT      ', canhbao: '⚠ CẢNH BÁO ', loi: '✘ LỖI      ' };
  for (const m of kq.muc) { console.log(`  ${NHAN[m.tt]}${m.dong}`); if (m.goiY) console.log(`               → ${m.goiY}`); }
  if (!kq.muc.length) console.log('  (không có số đo nào — thiếu dist/<ep>.html, episode.js và chưa mở trang)');
  if (ts && ts.length) {
    console.log('\n  10 tài sản nặng nhất tập tham chiếu:');
    for (const t of ts.slice(0, 10)) console.log(`    ${f1(t.mb).padStart(6)} MB  ${t.file}`);
  }
  const dir = path.join(ROOT, 'output/do-nang'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${ep}.json`);
  fs.writeFileSync(f, JSON.stringify({ ep, luc: new Date().toISOString(), nguong, soDo: { ...soDo, taiSan: (soDo.taiSan || []).slice(0, 10) }, ketQua: kq }, null, 1));
  console.log(`\nĐã ghi ${rel(f)}`);
  process.exit(kq.coLoi ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
