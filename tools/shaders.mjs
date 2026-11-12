#!/usr/bin/env node
// shaders.mjs — đo số program shader + thời gian Chrome/ANGLE dịch chúng (nguyên nhân trang mở chậm).
//
// Cách dùng:
//   node tools/shaders.mjs <trang|dist/x.html> [--film] [--json out.json] [--top N] [--step S]
//     --film     sau __ready còn tua cả phim (mỗi --step giây, mặc định 1) để đếm program phát sinh thêm
//     --json f   ghi toàn bộ số liệu ra file JSON
//     --top N    in N program chậm nhất (mặc định 10)
// Cảnh báo ⚠ khi programs > 80 hoặc __ready > 10 s. Thoát mã 0 (chỉ báo), mã 2 nếu lỗi mở trang.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchBrowser } from './browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = { top: 10, step: 1 }; let pageArg = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--film') opt.film = true;
  else if (a === '--json') opt.json = argv[++i];
  else if (a === '--top') opt.top = +argv[++i];
  else if (a === '--step') opt.step = +argv[++i];
  else if (!a.startsWith('--')) pageArg = a;
}
if (!pageArg) { console.log('Dùng: node tools/shaders.mjs <trang|dist/x.html> [--film] [--json out.json] [--top N] [--step S]'); process.exit(2); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.css': 'text/css' };
let srv = null;
async function toUrl(p) {
  if (/^(https?|file):\/\//i.test(p)) return p;
  const abs = resolve(p);
  if (!existsSync(abs)) throw new Error('Không thấy trang: ' + p);
  const rel = relative(root, abs).replace(/\\/g, '/');
  if (rel.startsWith('dist/') || rel.startsWith('..') || isAbsolute(rel)) return pathToFileURL(abs).href;
  srv = createServer(async (req, res) => {
    try {
      const f = resolve(join(root, decodeURIComponent(req.url.split('?')[0])));
      if (relative(root, f).startsWith('..')) throw 0;
      const b = await readFile(f);
      res.writeHead(200, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  return `http://localhost:${srv.address().port}/${rel}`;
}

const browser = await launchBrowser();
const fail = async (m) => { console.log('✘ ' + m); await browser.close(); srv?.close(); process.exit(2); };
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => console.log('  pageerror:', e.message.slice(0, 200)));

// Hook WebGL2: gom thời gian mọi lời gọi chặn theo từng program (ANGLE dịch lười, chặn ở getProgramParameter/InfoLog…).
await page.addInitScript(() => {
  const P = WebGL2RenderingContext.prototype;
  const src = new WeakMap(), att = new WeakMap(); window.__pg = new Map(); window.__glTotal = 0;
  const rec = (p) => { let r = window.__pg.get(p); if (!r) window.__pg.set(p, (r = { ms: 0, calls: 0 })); return r; };
  const ss = P.shaderSource; P.shaderSource = function (s, c) { src.set(s, c); return ss.call(this, s, c); };
  const as = P.attachShader; P.attachShader = function (p, s) { (att.get(p) || att.set(p, []).get(p)).push(s); return as.call(this, p, s); };
  for (const k of ['linkProgram', 'getProgramParameter', 'getProgramInfoLog', 'getActiveUniform', 'getActiveAttrib', 'getUniformLocation', 'getAttribLocation', 'getUniformBlockIndex', 'useProgram']) {
    const f = P[k];
    P[k] = function (...a) {
      const t = performance.now(); const r = f.apply(this, a); const d = performance.now() - t;
      const p = a[0];
      if (p && typeof p === 'object') {
        const x = rec(p); x.ms += d; x.calls++; window.__glTotal += d;
        if (!x.sh) {
          const sh = att.get(p) || []; const v = src.get(sh[0]) || '', f2 = src.get(sh[1]) || '';
          if (v || f2) {
            x.vlen = v.length; x.flen = f2.length;
            x.name = (v.match(/#define SHADER_NAME (.*)/) || [, ''])[1];
            x.mats = /mtAlb/.test(f2); x.grunge = /vGrP/.test(f2); x.shadow = /USE_SHADOWMAP/.test(f2);
            x.dir = +((f2.match(/#define NUM_DIR_LIGHTS (\d+)/) || [, 0])[1]);
            x.point = +((f2.match(/#define NUM_POINT_LIGHTS (\d+)/) || [, 0])[1]);
            x.spot = +((f2.match(/#define NUM_SPOT_LIGHTS (\d+)/) || [, 0])[1]);
            x.sh = 1;
          }
        }
      }
      return r;
    };
  }
  window.__collect = () => {
    const infos = (window.__stage && window.__stage.renderer && window.__stage.renderer.info.programs) || [];
    const out = infos.map((p) => {
      const r = window.__pg.get(p.program) || {};
      return { name: p.name || r.name || '', key: String(p.cacheKey || ''), ms: r.ms || 0, vlen: r.vlen || 0, flen: r.flen || 0, mats: !!r.mats, grunge: !!r.grunge, shadow: !!r.shadow, dir: r.dir || 0, point: r.point || 0, spot: r.spot || 0 };
    });
    return { n: infos.length, glMs: window.__glTotal, progs: out };
  };
});

let url;
try { url = await toUrl(pageArg); } catch (e) { await fail(e.message); }
const t0 = Date.now();
try { await page.goto(url, { timeout: 0 }); await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000, polling: 200 }); }
catch (e) { await fail('Trang không tới __ready: ' + e.message.slice(0, 200)); }
const readySec = (Date.now() - t0) / 1000;
const hasRenderer = await page.evaluate(() => !!(window.__stage && window.__stage.renderer));
if (!hasRenderer) await fail('Trang không lộ window.__stage.renderer — không đếm được program.');
const A = await page.evaluate(() => window.__collect());

let B = null, filmSec = 0, filmRes = null;
if (opt.film) {
  const tf = Date.now();
  filmRes = await page.evaluate(async (step) => {
    const total = (window.__shots && window.__shots.total) || 0; let n = 0;
    for (let s = step / 2; s < total; s += step) { await window.renderAt(s); n++; }
    return { total, n };
  }, opt.step);
  filmSec = (Date.now() - tf) / 1000;
  B = await page.evaluate(() => window.__collect());
}
await browser.close(); srv?.close();

const fin = B || A;
// nhóm theo khoá: các đoạn "|tên" trong cacheKey (customProgramCacheKey, vd `|mat_wood`, `|grunge_build`)
const keyOf = (k) => { const m = k.match(/\|[A-Za-z_][\w\-.:]*/g); return m ? m.join('') : '(không khoá)'; };
const groups = {};
for (const p of fin.progs) { const g = (groups[keyOf(p.key)] ||= { n: 0, ms: 0 }); g.n++; g.ms += p.ms; }
const compileMs = fin.progs.reduce((a, p) => a + p.ms, 0);
const f1 = (x) => x.toFixed(1);

console.log(`\n== Shader: ${pageArg} — ${new Date().toLocaleString('vi-VN')} ==`);
console.log(`Tới __ready      : ${f1(readySec)} s ${readySec > 10 ? '⚠ (> 10 s)' : '✔'}`);
console.log(`Program sau ready: ${A.n} ${A.n > 80 ? '⚠ (> 80)' : '✔'}   · thời gian GL chặn: ${f1(A.glMs / 1000)} s`);
if (B) console.log(`Sau tua cả phim  : ${B.n} program (+${B.n - A.n} phát sinh), tua ${filmRes.n} mốc/${f1(filmRes.total)} s mất ${f1(filmSec)} s, GL chặn thêm ${f1((B.glMs - A.glMs) / 1000)} s ${B.n > 80 ? '⚠' : ''}`);
console.log(`Tổng dịch (theo program): ${f1(compileMs / 1000)} s · trung bình ${f1(compileMs / Math.max(1, fin.n))} ms/program`);
const flag = (p) => [p.mats && 'mats', p.grunge && 'grunge', p.shadow && 'shadow'].filter(Boolean).join('+') || '-';
console.log(`\nTop ${opt.top} program chậm nhất:`);
console.log('    ms | tên shader           | frag   | cờ                 | đèn D/P/S | khoá');
for (const p of [...fin.progs].sort((a, b) => b.ms - a.ms).slice(0, opt.top))
  console.log(`  ${String(Math.round(p.ms)).padStart(4)} | ${(p.name || '?').slice(0, 20).padEnd(20)} | ${String(p.flen).padStart(6)} | ${flag(p).padEnd(18)} | ${`${p.dir}/${p.point}/${p.spot}`.padEnd(9)} | ${keyOf(p.key)}`);
console.log('\nNhóm theo khoá (đuôi customProgramCacheKey) — khoá nào nhân nhiều program nhất:');
for (const [k, g] of Object.entries(groups).sort((a, b) => b[1].n - a[1].n).slice(0, 12))
  console.log(`  ${String(g.n).padStart(4)} program · ${String(Math.round(g.ms)).padStart(6)} ms · ${k}`);
const warns = [];
if (fin.n > 80) warns.push(`${fin.n} program (> 80)`);
if (readySec > 10) warns.push(`__ready ${f1(readySec)} s (> 10 s)`);
console.log(warns.length ? `\n⚠ ${warns.join('; ')}` : '\n✔ Số program và thời gian mở trang trong ngưỡng.');
if (opt.json) { await writeFile(opt.json, JSON.stringify({ page: pageArg, at: new Date().toISOString(), readySec, afterReady: A, afterFilm: B, filmSec, groups, warns }, null, 1)); console.log('Đã ghi ' + opt.json); }
