#!/usr/bin/env node
// doctor.mjs — kiểm tra sức khoẻ repo cho một tập phim trong một lệnh.
//
// Cách dùng:
//   node tools/doctor.mjs [ep001] [--fix-procs]
//     ep001        tên tập (mặc định ep001)
//     --fix-procs  dừng các tiến trình render/TTS bị treo (mục 7)
// In danh sách ✔ / ⚠ / ✘ theo từng mục; thoát mã 1 nếu có ít nhất một ✘.
// Không cần npm; chỉ Node + child_process (git, ffprobe, powershell).

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const FIX_PROCS = args.includes('--fix-procs');
const EP = args.find((a) => !a.startsWith('--')) || 'ep001';
const FPS = 30;
const EPDIR = path.join(ROOT, 'episodes', EP);

let nBad = 0, nWarn = 0;
const ok = (m) => console.log(`  ✔ ${m}`);
const warn = (m) => { nWarn++; console.log(`  ⚠ ${m}`); };
const bad = (m) => { nBad++; console.log(`  ✘ ${m}`); };
const info = (m) => console.log(`    ${m}`);
const section = (t) => console.log(`\n== ${t} ==`);
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const exists = (p) => fs.existsSync(p);
const read = (p) => fs.readFileSync(p, 'utf8');
const fmt = (s) => s.toFixed(2) + ' s';
const head = (arr, n = 10) => arr.slice(0, n).join(', ') + (arr.length > n ? ` … (+${arr.length - n})` : '');

function sh(cmd, a, opt = {}) {
  const r = spawnSync(cmd, a, { cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20, ...opt });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), fail: r.error };
}
function probeDur(file) {
  const r = sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]);
  const d = parseFloat(r.out);
  return Number.isFinite(d) ? d : null;
}
// Lấy chuỗi mảng sau `export const NAME = [` đến `];` đầu dòng (đếm ngoặc, bỏ qua chuỗi/ghi chú).
function extractArray(src, name) {
  const m = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\\[`).exec(src);
  if (!m) return null;
  let i = m.index + m[0].length - 1, depth = 0, q = null;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === '/' && src[j + 1] === '/') { while (j < src.length && src[j] !== '\n') j++; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return src.slice(i, j + 1);
  }
  return null;
}
const evalExpr = (expr, ctx = {}) => new Function(...Object.keys(ctx), `return (${expr});`)(...Object.values(ctx));

console.log(`Doctor — tập ${EP}  (${ROOT})`);

// ---------------------------------------------------------------- 1. Asset
section('1. Asset');
let manifest = [], byId = new Map(), envIds = [];
try {
  manifest = JSON.parse(read(path.join(ROOT, 'assets/manifest.json')));
  byId = new Map(manifest.map((m) => [m.id, m]));
  ok(`manifest.json: ${manifest.length} mục`);
} catch (e) { bad(`không đọc được assets/manifest.json: ${e.message}`); }

try {
  const envSrc = read(path.join(ROOT, 'engine/envs.js'));
  let expr = extractArray(envSrc, 'ENV_ASSETS');
  if (!expr) throw new Error('không tìm thấy `export const ENV_ASSETS = [` trong engine/envs.js');
  const ctx = {};
  // Giải spread từ engine/whales.js (và các mảng khác nếu có).
  const spreads = [...expr.matchAll(/\.\.\.\s*([A-Z][A-Z0-9_]+)\b/g)].map((m) => m[1]);
  for (const nm of new Set(spreads)) {
    let arr = null;
    for (const f of ['engine/envs.js', 'engine/whales.js']) {
      const s = read(path.join(ROOT, f)), e = extractArray(s, nm);
      if (e) { arr = evalExpr(e); break; }
    }
    if (!arr) throw new Error(`không giải được spread ...${nm}`);
    ctx[nm] = arr;
  }
  envIds = evalExpr(expr, ctx);
  ok(`ENV_ASSETS giải ra ${envIds.length} id${spreads.length ? ` (spread: ${[...new Set(spreads)].join(', ')})` : ''}`);
} catch (e) { bad(`không phân tích được ENV_ASSETS: ${e.message}`); }

const kitOf = (id) => {
  const k = id.split('/')[0];
  return k === 'polyfork' ? 'polyfork' : k === 'sea' ? 'sea' : `kenney:${k}`;
};
const dupIds = envIds.filter((id, i) => envIds.indexOf(id) !== i);
if (dupIds.length) warn(`ENV_ASSETS có id trùng: ${head([...new Set(dupIds)])}`);
const missManifest = [], missFile = [], perKit = {};
for (const id of envIds) {
  const k = kitOf(id); perKit[k] ??= { total: 0, ok: 0 };
  perKit[k].total++;
  const m = byId.get(id);
  if (!m) { missManifest.push(id); continue; }
  if (!m.src || !exists(path.join(ROOT, m.src))) { missFile.push(`${id} → ${m.src}`); continue; }
  perKit[k].ok++;
}
if (envIds.length) {
  (missManifest.length ? bad : ok)(missManifest.length ? `${missManifest.length} id thiếu trong manifest: ${head(missManifest)}` : 'mọi id của ENV_ASSETS đều có trong manifest');
  (missFile.length ? bad : ok)(missFile.length ? `${missFile.length} file src không tồn tại: ${head(missFile)}` : 'mọi file src của ENV_ASSETS đều có trên đĩa');
  const parts = Object.entries(perKit).map(([k, v]) => `${k} ${v.ok}/${v.total}`);
  info('theo bộ: ' + parts.join(' · '));
  const kn = Object.entries(perKit).filter(([k]) => k.startsWith('kenney')).reduce((s, [, v]) => s + v.total, 0);
  info(`tổng: kenney ${kn} · polyfork ${perKit.polyfork?.total || 0} · sea ${perKit.sea?.total || 0}`);
}
const orphan = manifest.filter((m) => !m.src || !exists(path.join(ROOT, m.src)));
if (orphan.length) warn(`manifest có ${orphan.length} mục mà file src không có trên đĩa: ${head(orphan.map((m) => m.id))}`);
else ok('mọi mục manifest đều có file src');

// ---------------------------------------------------------------- 2. Giấy phép
section('2. Giấy phép');
{
  const credFiles = ['assets/CREDITS.md', 'assets/polyfork/CREDITS.md'].filter((f) => exists(path.join(ROOT, f)));
  const credText = credFiles.map((f) => read(path.join(ROOT, f))).join('\n').toLowerCase();
  if (!credFiles.length) warn('không có assets/CREDITS.md hay assets/polyfork/CREDITS.md');
  const isBY = (l) => /(^|[^a-z])by[- ]?\d|cc[- ]by/i.test(l || '');
  const used = envIds.map((id) => byId.get(id)).filter(Boolean);
  const by = used.filter((m) => isBY(m.license));
  const missing = [];
  for (const m of by) {
    const slug = m.id.split('/').pop().toLowerCase();
    const author = (m.author || '').toLowerCase().replace(/\s*\(.*\)/, '').trim();
    const title = (m.title || '').toLowerCase();
    const credit = (m.credit || '').toLowerCase().replace(/,?\s*cc[- ]by.*$/, '').trim();
    const hit = credText.includes(slug) || (credit && credText.includes(credit)) || (author && credText.includes(author)) || (title && credText.includes(title));
    if (!hit) missing.push(m.id);
  }
  info(`asset dùng trong ENV_ASSETS có CC-BY: ${by.length}`);
  if (missing.length) warn(`${missing.length} asset CC-BY chưa thấy ghi công: ${head(missing)}`);
  else ok('mọi asset CC-BY đã có dòng ghi công');
  // Asset CC-BY nằm ngoài ENV_ASSETS (vd. killer_whale) — chỉ nhắc.
  const extra = manifest.filter((m) => isBY(m.license) && !envIds.includes(m.id) && !m.id.startsWith('polyfork/'));
  for (const m of extra) {
    const slug = m.id.split('/').pop().toLowerCase(), au = (m.author || '').toLowerCase().replace(/\s*\(.*\)/, '').trim();
    if (!(credText.includes(slug) || (au && credText.includes(au)) || credText.includes((m.title || '').toLowerCase())))
      warn(`${m.id} (CC-BY, ngoài ENV_ASSETS) chưa có ghi công`);
  }
}

// ---------------------------------------------------------------- 3. Phông
section('3. Phông');
const indexHtml = exists(path.join(EPDIR, 'index.html')) ? read(path.join(EPDIR, 'index.html')) : null;
if (!indexHtml) bad(`thiếu ${rel(path.join(EPDIR, 'index.html'))}`);
else {
  const fonts = [...indexHtml.matchAll(/@font-face\s*\{[^}]*?url\(\s*['"]?([^'")]+\.(?:ttf|otf|woff2?))['"]?\s*\)/gi)].map((m) => m[1]);
  if (!fonts.length) warn('index.html không có @font-face nào');
  for (const u of fonts) {
    const file = path.join(ROOT, u.replace(/^\/+/, '')), dir = path.dirname(file);
    if (!exists(file)) { bad(`phông không tồn tại: ${u}`); continue; }
    const ofl = fs.readdirSync(dir).filter((f) => /-OFL\.txt$/i.test(f));
    const stem = path.basename(file).split('-')[0].toLowerCase();
    const mine = ofl.find((f) => f.toLowerCase().startsWith(stem));
    if (mine) ok(`${path.basename(file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB) + ${mine}`);
    else bad(`${path.basename(file)} thiếu file *-OFL.txt (giấy phép OFL) cạnh nó`);
  }
}

// ---------------------------------------------------------------- 4. Shot
section('4. Shot');
let shots = [], totalFrames = 0, totalSec = 0;
{
  const f = path.join(EPDIR, 'shots.js');
  if (!exists(f)) bad(`thiếu ${rel(f)}`);
  else {
    const re = /\{\s*id:\s*'(s[0-9]+[a-z]?)'\s*,\s*f:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/g;
    const src = read(f); let m;
    while ((m = re.exec(src))) shots.push({ id: m[1], a: +m[2], b: +m[3] });
    ok(`${shots.length} shot trong shots.js`);
    const seen = new Set(), dups = [], gaps = [];
    shots.forEach((s, i) => {
      if (seen.has(s.id)) dups.push(s.id); seen.add(s.id);
      if (s.b < s.a) gaps.push(`${s.id} có b<a`);
      if (i === 0 && s.a !== 0) gaps.push(`${s.id} bắt đầu ở ${s.a} (phải là 0)`);
      if (i > 0 && s.a !== shots[i - 1].b + 1) gaps.push(`${shots[i - 1].id}→${s.id}: ${shots[i - 1].b}→${s.a}`);
    });
    (dups.length ? bad : ok)(dups.length ? `id trùng: ${head(dups)}` : 'id duy nhất');
    (gaps.length ? bad : ok)(gaps.length ? `khung không liền mạch: ${head(gaps)}` : 'khung liền mạch (next.a = prev.b+1), bắt đầu từ 0');
    totalFrames = shots.length ? shots[shots.length - 1].b + 1 : 0;
    totalSec = totalFrames / FPS;
    const dm = indexHtml && /id="root"[^>]*?data-duration="([\d.]+)"/.exec(indexHtml);
    if (dm) {
      const dur = parseFloat(dm[1]), dFrames = dur * FPS;
      const diff = Math.abs(dFrames - totalFrames);
      (diff <= 1.0001 ? ok : bad)(`tổng ${totalFrames} khung = ${fmt(totalSec)}; #root data-duration=${dur} (${dFrames.toFixed(1)} khung, lệch ${diff.toFixed(1)})`);
      if (diff > 1.0001) info('→ sửa data-duration (#root và #cap) hoặc f của shot cuối');
    } else warn('không đọc được data-duration của #root trong index.html');
  }
}

// ---------------------------------------------------------------- 5. Giọng & phụ đề
section('5. Giọng & phụ đề');
const total = totalSec;
for (const [file, label] of [['narration.mp3', 'tiếng Việt'], ['narration_en.mp3', 'tiếng Anh']]) {
  const p = path.join(EPDIR, file);
  if (!exists(p)) { bad(`thiếu ${rel(p)}`); continue; }
  const d = probeDur(p);
  if (d == null) { warn(`${file}: ffprobe không đọc được thời lượng`); continue; }
  const diff = d - total;
  (Math.abs(diff) <= 0.5 ? ok : warn)(`${file} (${label}) ${fmt(d)} so với phim ${fmt(total)} (${diff >= 0 ? '+' : ''}${diff.toFixed(2)} s)`);
}
async function loadCaps(file, exportName) {
  const p = path.join(EPDIR, file);
  if (!exists(p)) { bad(`thiếu ${rel(p)}`); return; }
  let arr;
  try { arr = (await import('file://' + p.replace(/\\/g, '/')))[exportName]; } catch (e) { bad(`${file}: lỗi nạp (${e.message})`); return; }
  if (!Array.isArray(arr)) { bad(`${file}: không có export ${exportName}`); return; }
  const unsorted = [], outside = [];
  arr.forEach((c, i) => {
    if (i > 0 && c[0] < arr[i - 1][0] - 1e-6) unsorted.push(i);
    if (c[0] < -0.01 || c[1] > total + 0.05 || c[1] < c[0]) outside.push(`#${i} [${c[0]},${c[1]}]`);
  });
  const last = arr.length ? arr[arr.length - 1][1] : 0;
  (unsorted.length ? bad : ok)(unsorted.length ? `${file}: ${unsorted.length} cụm không theo thứ tự (vd #${unsorted[0]})` : `${file}: ${arr.length} cụm, đúng thứ tự, cụm cuối kết thúc ${fmt(last)}`);
  if (outside.length) bad(`${file}: ${outside.length} cụm ngoài [0,${fmt(total)}]: ${head(outside, 5)}`);
}
await loadCaps('captions.js', 'CAPTIONS');
await loadCaps('captions_en.js', 'CAPTIONS_EN');

{
  const vi = path.join(EPDIR, 'voices/index.json');
  const pending = path.join(EPDIR, 'voices/index.chua-duyet.json');
  if (exists(vi)) {
    try {
      const list = JSON.parse(read(vi)), miss = [], byLang = {};
      for (const v of list) {
        byLang[v.lang] = (byLang[v.lang] || 0) + 1;
        for (const k of ['audio', 'caps']) if (v[k] && !exists(path.join(ROOT, v[k].replace(/^\/+/, '')))) miss.push(`${v.id}.${k}`);
      }
      info('giọng theo ngôn ngữ: ' + Object.entries(byLang).map(([k, n]) => `${k} ${n}`).join(' · '));
      (miss.length ? bad : ok)(miss.length ? `${miss.length} file giọng thiếu: ${head(miss)}` : `voices/index.json: ${list.length} giọng, đủ file audio/caps`);
    } catch (e) { bad(`voices/index.json hỏng: ${e.message}`); }
  } else if (exists(pending)) info('chưa có voices/index.json (chỉ có index.chua-duyet.json — chưa duyệt) → bỏ qua kiểm tra giọng');
  else info('không có voices/index.json → bỏ qua');
}
{
  const bp = path.join(EPDIR, 'beats.json');
  if (!exists(bp)) info('không có beats.json');
  else if (!shots.length) warn('beats.json: bỏ qua vì không có shot');
  else {
    try {
      const beats = JSON.parse(read(bp)), t0 = new Map(shots.map((s) => [s.id, s.a / FPS]));
      const probs = [];
      for (const b of beats) {
        // Shot nằm trong [start,end): t0 ≥ start-0.01 và < end-0.01
        const want = shots.filter((s) => s.a / FPS >= b.start - 0.01 && s.a / FPS < b.end - 0.01).map((s) => s.id);
        const first = (b.shots || [])[0];
        const startOk = first && Math.abs((t0.get(first) ?? -9) - b.start) <= 0.01;
        const listOk = JSON.stringify(want) === JSON.stringify(b.shots || []);
        if (!startOk || !listOk) probs.push(`${b.id} [${b.start}–${b.end}] ${!startOk ? `start≠t0(${first}=${t0.get(first)?.toFixed(3)})` : ''} ${!listOk ? `shots ${JSON.stringify(b.shots)} ≠ ${JSON.stringify(want)}` : ''}`.trim());
      }
      if (probs.length) {
        warn(`beats.json: ${probs.length}/${beats.length} nhịp lệch cú cắt: ${head(probs, 3)}`);
        info('→ nhịp tiếng Anh lệch cú cắt → chạy lại tools/en/beats.py ep001 --keep s055 rồi tools/en/tts_en.py');
      } else ok(`beats.json: ${beats.length} nhịp khớp cú cắt shot`);
    } catch (e) { bad(`beats.json hỏng: ${e.message}`); }
  }
}

// ---------------------------------------------------------------- 6. Bản gộp
section('6. Bản gộp');
{
  const dist = path.join(ROOT, 'dist', `${EP}.html`);
  if (!exists(dist)) warn(`chưa có dist/${EP}.html → chạy npm run bundle:${EP}`);
  else {
    const st = fs.statSync(dist);
    ok(`dist/${EP}.html ${(st.size / 1048576).toFixed(1)} MB (${st.mtime.toLocaleString('vi-VN')})`);
    let newest = { t: 0, f: '' };
    const walk = (p) => {
      let s; try { s = fs.statSync(p); } catch { return; }
      if (s.isDirectory()) { for (const n of fs.readdirSync(p)) if (n !== 'node_modules' && n !== '.git') walk(path.join(p, n)); }
      else if (!/\.md$/i.test(p) && s.mtimeMs > newest.t) newest = { t: s.mtimeMs, f: p };
    };
    for (const p of ['engine', `episodes/${EP}`, 'tools/export-ui.js', 'tools/bundle.mjs', 'assets/fonts']) walk(path.join(ROOT, p));
    if (newest.t > st.mtimeMs + 1000) warn(`bản gộp cũ hơn nguồn: ${rel(newest.f)} mới hơn ${((newest.t - st.mtimeMs) / 60000).toFixed(0)} phút → chạy npm run bundle:${EP}`);
    else ok('bản gộp mới hơn mọi nguồn (engine, episodes, export-ui, bundle, fonts)');
  }
}

// ---------------------------------------------------------------- 7. Tiến trình treo
section('7. Tiến trình treo');
if (process.platform !== 'win32') info('chỉ kiểm tra trên Windows');
else {
  const PSH = [process.env.SystemRoot && path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'), 'powershell.exe'].filter((x) => x && (x === 'powershell.exe' || exists(x)))[0];
  const PAT = /render-local|tts_en\.py|tools[\\/]tts\.py|voices_build|image2pipe/i;
  const ps = sh(PSH, ['-NoProfile', '-Command',
    "Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(node|python|pythonw|py|ffmpeg|chrome|msedge|bash|sh)(\\.exe)?$' } | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress"]);
  if (ps.code !== 0) warn('không chạy được powershell Get-CimInstance: ' + (ps.err || ps.fail?.message || ps.code));
  else {
    let list = []; try { const j = JSON.parse(ps.out || '[]'); list = Array.isArray(j) ? j : [j]; } catch { /* rỗng */ }
    const hung = list.filter((p) => p.CommandLine && PAT.test(p.CommandLine) && p.ProcessId !== process.pid && !/doctor\.mjs/.test(p.CommandLine));
    if (!hung.length) ok('không có tiến trình render/TTS nào đang chạy');
    else {
      warn(`${hung.length} tiến trình render/TTS đang chạy (có thể treo):`);
      for (const p of hung) info(`PID ${p.ProcessId} ${p.Name}: ${String(p.CommandLine).slice(0, 140)}`);
      if (FIX_PROCS) {
        for (const p of hung) {
          const r = sh(PSH, ['-NoProfile', '-Command', `Stop-Process -Id ${p.ProcessId} -Force -ErrorAction SilentlyContinue`]);
          info(`đã dừng PID ${p.ProcessId}${r.code ? ' (lỗi)' : ''}`);
        }
      } else info('→ thêm --fix-procs để dừng chúng');
    }
  }
}

// ---------------------------------------------------------------- 8. Git
section('8. Git');
{
  const br = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (br.code !== 0) warn('không phải repo git hoặc git lỗi');
  else {
    ok(`nhánh hiện tại: ${br.out}`);
    const st = sh('git', ['status', '--porcelain']).out.split('\n').filter(Boolean);
    const untracked = st.filter((l) => l.startsWith('??')).length;
    (st.length ? warn : ok)(`${st.length - untracked} file đã sửa/staged, ${untracked} file chưa theo dõi`);
    const nm = sh('git', ['branch', '-r', '--no-merged', 'HEAD']).out.split('\n').map((s) => s.trim()).filter((s) => s && !s.includes('->'));
    (nm.length ? warn : ok)(nm.length ? `${nm.length} nhánh remote chưa gộp vào HEAD: ${nm.join(', ')} (chi tiết: bash tools/branches.sh)` : 'mọi nhánh remote đã gộp vào HEAD');
  }
}

console.log(`\nKết quả: ${nBad} ✘ · ${nWarn} ⚠`);
process.exit(nBad ? 1 : 0);
