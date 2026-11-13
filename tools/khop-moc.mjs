#!/usr/bin/env node
// khop-moc: khớp mốc HÌNH–LỜI. Co giãn `dur` từng shot theo mốc `start` từng câu của narration.json (giữ nguyên mọi thứ khác),
// có BÙ trừ nhóm trước (nhóm chạm sàn thì phần dư không cộng dồn sang các câu sau — khác `shot-gen --chi-khop-giong`),
// rồi in bảng LỆCH: (giây bắt đầu của shot đầu tiên mỗi câu) − (start của câu trong narration.json).
//
//   node tools/khop-moc.mjs <ep> [--kiem] [--cat-den <giây>] [--tong <giây>] [--nguong 0.15]
//     --kiem          chỉ đo, không ghi shots.js
//     --cat-den, --tong   shot CUỐI CÙNG (không thuộc câu nào ngoài câu cuối) = màn đen: nhóm câu cuối kết thúc đúng lúc --cat-den,
//                         shot cuối dài (tong − cat-den). Bỏ qua = không có shot đen riêng.
// Thoát 0 = mọi câu lệch ≤ ngưỡng (mặc định 0.15 s), 1 = có câu lệch hơn.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fit, toiThieu, normId } from './shot-gen.mjs';
import { nguong } from './kiem/luat.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const ep = argv.find((a) => !a.startsWith('--'));
const opt = (k, d = null) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
if (!ep) { console.error('Dùng: node tools/khop-moc.mjs <ep> [--kiem] [--cat-den s] [--tong s] [--nguong 0.15]'); process.exit(2); }
const epDir = path.join(ROOT, 'episodes', ep), shotsFile = path.join(epDir, 'shots.js');
const NG = Number(opt('nguong', 0.15)), kiemThoi = argv.includes('--kiem');
const catDen = opt('cat-den') !== null ? Number(opt('cat-den')) : null, tong = opt('tong') !== null ? Number(opt('tong')) : null;

const text = fs.readFileSync(shotsFile, 'utf8');
const { SHOTS } = await import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
const nj = JSON.parse(fs.readFileSync(path.join(epDir, 'narration.json'), 'utf8'));
const jr = spawnSync('python', ['-X', 'utf8', path.join('tools', 'kb', 'kichban.py'), path.join(epDir, 'kich-ban.md'), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const minKb = new Map();
if (jr.status === 0) for (const k of JSON.parse(jr.stdout).shots || []) if (typeof k.min === 'number') minKb.set(normId(k.id), k.min);
const L11 = nguong(epDir).L11;
const mins = SHOTS.map((s) => toiThieu({ type: s.type, min: minKb.get(normId(s.id)) }, L11));

const first = [];
SHOTS.forEach((s, i) => { if (s.line && first[s.line - 1] === undefined) first[s.line - 1] = i; });
if (first.length !== nj.lines.length || first.some((x) => x === undefined)) { console.error(`narration.json ${nj.lines.length} câu ≠ shots.js ${first.filter((x) => x !== undefined).length} câu`); process.exit(2); }
const durs = SHOTS.map((s) => s.dur);
const out = durs.slice();
if (!kiemThoi) {
  const nCau = nj.lines.length;
  const cuoi = catDen !== null && tong !== null ? SHOTS.length - 1 : SHOTS.length;      // shot đen cuối nằm ngoài nhóm câu
  const cuts = [...first, cuoi];
  let t = 0, du = 0;
  if (first[0] > 0) { const seg = fit(durs.slice(0, first[0]), mins.slice(0, first[0]), nj.lines[0].start); seg.forEach((v, i) => { out[i] = v; }); t = seg.reduce((a, b) => a + b, 0); }
  for (let g = 0; g < nCau; g++) {
    const a = cuts[g], b = cuts[g + 1];
    const fin = g + 1 < nCau ? nj.lines[g + 1].start : (catDen ?? tong ?? nj.lines[g].end);
    const sumMin = mins.slice(a, b).reduce((x, y) => x + y, 0);
    const muc = Math.max(sumMin, fin - t);
    const seg = fit(durs.slice(a, b), mins.slice(a, b), muc);
    seg.forEach((v, i) => { out[a + i] = v; });
    t += seg.reduce((x, y) => x + y, 0);
  }
  if (cuoi < SHOTS.length) out[SHOTS.length - 1] = Math.round((tong - catDen) * 1000) / 1000;
  // ghi lại `dur` từng shot (đúng dòng của shot, không đụng chỗ khác)
  const lines = text.split(/\r?\n/), eol = text.includes('\r\n') ? '\r\n' : '\n';
  let k = 0;
  const res = lines.map((l) => {
    const m = /^(\s*\{ id: "([^"]+)", dur: )([\d.]+)(,.*)$/.exec(l);
    if (!m) return l;
    const v = out[k++];
    return `${m[1]}${v}${m[4]}`;
  });
  if (k !== SHOTS.length) { console.error(`ghi dur: khớp ${k}/${SHOTS.length} dòng shot`); process.exit(2); }
  const sum = out.reduce((a, b) => a + b, 0);
  res[0] = res[0].replace(/\d+ shot, [\d.]+ s/, `${SHOTS.length} shot, ${sum.toFixed(2)} s`);
  fs.writeFileSync(shotsFile, res.join(eol), 'utf8');
}
// ---- đo lệch ----
let t = 0; const start = [];
SHOTS.forEach((s, i) => { if (s.line && first[s.line - 1] === i) start[s.line - 1] = t; t += out[i]; });
const lech = nj.lines.map((l, i) => start[i] - l.start);
const bad = lech.map((d, i) => [i + 1, d]).filter(([, d]) => Math.abs(d) > NG);
const tb = lech.reduce((a, d) => a + Math.abs(d), 0) / lech.length, mx = Math.max(...lech.map(Math.abs));
console.log(`khop-moc ${ep}: ${SHOTS.length} shot, tổng ${t.toFixed(3)} s; lệch mốc câu–shot: TB ${tb.toFixed(3)} s, max ${mx.toFixed(3)} s, ${bad.length} câu > ${NG} s`);
for (const [n, d] of bad) console.log(`  câu ${n}: ${d >= 0 ? '+' : ''}${d.toFixed(3)} s (start ${nj.lines[n - 1].start.toFixed(2)})`);
const viPham = SHOTS.map((s, i) => [s.id, out[i], mins[i]]).filter(([, d, m]) => d + 1e-6 < m);
if (viPham.length) console.log(`  shot dưới tối thiểu: ${viPham.map(([id, d, m]) => `${id} ${d}<${m}`).join(', ')}`);
process.exit(bad.length ? 1 : 0);
