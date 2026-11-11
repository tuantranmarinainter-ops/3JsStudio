// Render file HTML một tập (bản gộp từ tools/bundle.mjs, hoặc bất kỳ trang nào có window.renderAt + window.__ready)
// ra MP4 dọc 1080×1920 trên CHÍNH MÁY NÀY — không cần cloud, không cần HyperFrames.
//   node tools/render-local.mjs dist/ep001.html                       → output/ep001.mp4
//   node tools/render-local.mjs dist/ep001.html -o output/x.mp4 --workers 4
//   node tools/render-local.mjs dist/ep001.html --start 40 --end 52   (chỉ một đoạn, giây)
// Tuỳ chọn: --fps (mặc định data-fps), --crf 18, --preset medium, --workers N (mặc định 3), --keep (giữ đoạn tạm)
// Mỗi worker là 1 tab, render một khoảng frame liên tiếp → part_XX.mp4; cuối cùng nối + ghép giọng đọc (AAC).
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { spawn } from 'child_process';
import { resolve, join, basename, dirname } from 'path';
import { pathToFileURL } from 'url';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2);
const input = args.find((a, i) => !a.startsWith('-') && !(i > 0 && args[i - 1].startsWith('-')));
if (!input) { console.error('Dùng: node tools/render-local.mjs <tap.html> [-o out.mp4] [--workers 3] [--start s --end s]'); process.exit(1); }
const opt = (k, d) => { const i = args.findIndex((a) => a === '--' + k || (k === 'out' && a === '-o')); return i >= 0 ? args[i + 1] : d; };
const htmlPath = resolve(input);
const out = resolve(opt('out', join('output', basename(htmlPath).replace(/\.html?$/i, '') + '.mp4')));
const html = await readFile(htmlPath, 'utf8');
const rootTag = html.match(/<div[^>]*data-composition-id[^>]*>/);
const attr = (n, d) => { const m = rootTag && rootTag[0].match(new RegExp(`${n}="([^"]+)"`)); return m ? m[1] : d; };
const W = +attr('data-width', 1080), H = +attr('data-height', 1920);
const fps = +opt('fps', attr('data-fps', 30));
const total = +attr('data-duration', 0);
const t0 = +opt('start', 0), t1 = Math.min(+opt('end', total), total);
const f0 = Math.round(t0 * fps), f1 = Math.round(t1 * fps); // [f0, f1)
const N = f1 - f0;
if (!(N > 0)) throw new Error(`khoảng frame rỗng (duration=${total})`);
const workers = Math.max(1, Math.min(+opt('workers', 3), N));
const crf = opt('crf', '18'), preset = opt('preset', 'medium');
const tmp = join(dirname(out), `.render_${basename(out, '.mp4')}`);
await mkdir(tmp, { recursive: true });
console.log(`Render ${basename(htmlPath)} → ${out}`);
console.log(`  ${W}×${H} @${fps} fps, frame ${f0}–${f1 - 1} (${N} frame, ${(N / fps).toFixed(2)} s), ${workers} worker`);

const ffmpeg = (a, opts = {}) => new Promise((ok, bad) => {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: [opts.stdin ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
  p.on('error', bad); p.on('close', (c) => (c === 0 ? ok() : bad(new Error('ffmpeg thoát mã ' + c))));
  if (opts.stdin) opts.stdin(p);
});

const browser = await launchBrowser();
const url = pathToFileURL(htmlPath).href;
let done = 0; const started = Date.now();
const progress = setInterval(() => {
  const s = (Date.now() - started) / 1000, r = done / Math.max(s, 1e-3);
  process.stdout.write(`\r  ${done}/${N} frame  ${(100 * done / N).toFixed(1)}%  ${r.toFixed(1)} fps  còn ~${Math.round((N - done) / Math.max(r, 1e-3))} s   `);
}, 1000);

async function worker(w, a, b) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log(`\n  [w${w}] pageerror:`, e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  const sel = (await page.locator('#root').count()) ? '#root' : 'canvas';
  const el = page.locator(sel).first();
  const part = join(tmp, `part_${String(w).padStart(2, '0')}.mp4`);
  await ffmpeg(['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', preset, '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(fps), part], {
    stdin: async (p) => {
      try {
        for (let f = a; f < b; f++) {
          await page.evaluate((t) => window.renderAt(t), f / fps);
          const png = await el.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' });
          if (!p.stdin.write(png)) await new Promise((r) => p.stdin.once('drain', r));
          done++;
        }
      } finally { p.stdin.end(); }
    },
  });
  await page.close();
  return part;
}

const per = Math.ceil(N / workers), jobs = [];
for (let w = 0; w < workers; w++) { const a = f0 + w * per, b = Math.min(f1, a + per); if (a < b) jobs.push(worker(w, a, b)); }
const parts = await Promise.all(jobs);
clearInterval(progress);
await browser.close();
console.log(`\n  xong ${N} frame trong ${((Date.now() - started) / 1000).toFixed(0)} s, đang ghép…`);

// Giọng đọc: <audio src="data:..."> (bản gộp) hoặc đường dẫn file cạnh HTML.
const audios = [...html.matchAll(/<audio\b[^>]*\ssrc="([^"]+)"[^>]*>/g)].map((m) => m[1]);
const list = join(tmp, 'parts.txt');
await writeFile(list, parts.map((p) => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
const aIn = [];
if (audios.length) {
  const src = audios[0];
  let aPath;
  if (src.startsWith('data:')) { aPath = join(tmp, 'audio.' + (src.includes('audio/wav') ? 'wav' : 'mp3')); await writeFile(aPath, Buffer.from(src.slice(src.indexOf(',') + 1), 'base64')); }
  else aPath = resolve(dirname(htmlPath), src);
  aIn.push('-ss', String(t0), '-t', String(N / fps), '-i', aPath);
}
await ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, ...aIn, '-map', '0:v', ...(aIn.length ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '192k'] : []),
  '-c:v', 'copy', '-t', String(N / fps), '-movflags', '+faststart', out]);
if (!args.includes('--keep')) await rm(tmp, { recursive: true, force: true });
console.log(`  → ${out}`);
