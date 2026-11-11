// Chạy nút "Xuất MP4" của file HTML gộp (dist/*.html) hoàn toàn tự động, rồi kiểm tra từng MP4 xuất ra.
//   node tools/export-test.mjs dist/ep001.html [--range 76:92] [--res 2k|1080p|4k]
//        [--matrix "lang=vi,en;subs=1,0;voice=1"] [--vid <idGiọng>] [--frames 128.5,129] [--out output/kiem-tra/<ngày-giờ>]
// Ma trận: tích Descartes các giá trị lang / subs / voice / fx / sfx (mặc định lang=vi;subs=1;voice=1;fx=default;sfx=default).
//   fx=default|none|all|<id>+<id>…    hiệu ứng hình: BẬT đúng các id nêu, còn lại tắt (grade,bloom,dof,vignette,outline,storm)
//   sfx=default|none|all|<lớp>[@%]+…  lớp tiếng động giữ BẬT (nen,buoc-chan,khoanh-khac…), @% = âm lượng; lớp không nêu thì tắt
//   Ví dụ: --matrix "fx=none,all,outline;sfx=none,nen@50+khoanh-khac"
//   Trang cũ không có điều khiển fx/sfx → bỏ qua khoá đó kèm cảnh báo (không lỗi).
// --frames t1,t2: lưu thêm khung ở các mốc giây TUYỆT ĐỐI (nằm trong đoạn xuất) của từng MP4, ghép vào sheet (mỗi tổ hợp 1 hàng).
// Với mỗi tổ hợp: đặt điều khiển, bấm #xgo, chờ tải về, ffprobe + lấy khung giữa, kiểm:
//   số frame = round((cuối-đầu)*fps) ±1 · có âm thanh ⇔ (voice=1 hoặc còn lớp sfx bật) · kích thước đúng preset.
// Ghi <out>/report.md và <out>/sheet.jpg; thoát mã 1 nếu có LỖI.
import { writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve, join, relative } from 'path';
import { pathToFileURL } from 'url';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2);
const input = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!input) { console.error('Dùng: node tools/export-test.mjs dist/ep001.html [--range 76:92] [--res 2k|1080p|4k] [--matrix "lang=vi,en;subs=1,0;voice=1;fx=none,all;sfx=none,all"] [--vid id] [--frames t1,t2] [--out dir]'); process.exit(1); }
const htmlPath = resolve(input);
if (!existsSync(htmlPath)) { console.error('Không thấy file: ' + input); process.exit(1); }
const res = opt('res', '2k');
const SIZES = { '2k': [1440, 2560], '1080p': [1080, 1920], '4k': [2160, 3840] };
if (!SIZES[res]) { console.error('--res phải là 2k | 1080p | 4k'); process.exit(1); }
const stamp = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
const outDir = resolve(opt('out', join('output', 'kiem-tra', stamp)));
await mkdir(outDir, { recursive: true });

// ---- ma trận ----
const dims = { lang: ['vi'], subs: ['1'], voice: ['1'], fx: ['default'], sfx: ['default'] };
for (const part of (opt('matrix', '') || '').split(';').map((s) => s.trim()).filter(Boolean)) {
  const [k, v] = part.split('=');
  if (!(k in dims)) { console.error('Khoá ma trận không hợp lệ: ' + k); process.exit(1); }
  dims[k] = v.split(',').map((s) => s.trim());
}
const combos = [];
for (const lang of dims.lang) for (const subs of dims.subs) for (const voice of dims.voice) for (const fx of dims.fx) for (const sfx of dims.sfx)
  combos.push({ lang, subs: subs === '1', voice: voice === '1', fx, sfx });
const extraT = (opt('frames', '') || '').split(',').map((s) => s.trim()).filter(Boolean).map(Number);
if (extraT.some((x) => !isFinite(x))) { console.error('--frames phải là danh sách số giây, vd 128.5,129'); process.exit(1); }
const safe = (s) => s.replace(/@/g, '').replace(/\+/g, '-').replace(/[^\w.-]/g, '');

// ---- tiện ích ----
const run = (cmd, a) => spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 1 << 26 });
function probe(file) {
  const r = run('ffprobe', ['-v', 'error', '-count_packets', '-show_streams', '-show_format', '-of', 'json', file]);
  if (r.status !== 0) throw new Error('ffprobe lỗi: ' + r.stderr);
  const j = JSON.parse(r.stdout);
  const v = j.streams.find((s) => s.codec_type === 'video'), a = j.streams.find((s) => s.codec_type === 'audio');
  const [n, d] = (v.avg_frame_rate || v.r_frame_rate).split('/').map(Number);
  return { v, a, fps: n / (d || 1), frames: +(v.nb_frames || v.nb_read_packets), vdur: +v.duration, adur: a ? +a.duration : 0, fdur: +j.format.duration };
}

// ---- trình duyệt ----
const browser = await launchBrowser();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 540, height: 960 } });
await ctx.addInitScript(() => { delete window.showSaveFilePicker; });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
await page.goto(pathToFileURL(htmlPath).href + '?ui=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await page.waitForFunction(() => document.querySelector('#xstat') && document.querySelector('#xstat').textContent.trim() === '', null, { timeout: 300000 });

async function setupPage() {
  if (opt('range')) {
    const [s, e] = opt('range').split(':').map(Number);
    await page.fill('#xs', String(s)); await page.fill('#xe', String(e));
  }
  await page.selectOption('#xres', res);
}
await setupPage();

// điều khiển fx / sfx (trang cũ có thể không có): đọc id + trạng thái ban đầu để khôi phục khi gặp 'default'
const initCtl = await page.evaluate(() => {
  const fx = [...document.querySelectorAll('#xfx input[data-fx]')].map((el) => ({ id: el.dataset.fx, on: el.checked }));
  const au = [...document.querySelectorAll('audio[data-sfx-layer]')].map((el) => el.dataset.sfxLayer);
  const sfx = [...document.querySelectorAll('#xsfx input[data-sl]')].map((el) => {
    const i = el.dataset.sl, rg = document.querySelector('#xsfx input[data-sv="' + i + '"]');
    return { i: +i, id: au[+i] || String(i), on: el.checked, vol: rg ? +rg.value : 100 };
  });
  return { fx, sfx };
});
const needFx = dims.fx.some((v) => v !== 'default'), needSfx = dims.sfx.some((v) => v !== 'default');
if (needFx && !initCtl.fx.length) console.log('CẢNH BÁO: trang không có điều khiển hiệu ứng hình (#xfx) → bỏ qua khoá fx');
if (needSfx && !initCtl.sfx.length) console.log('CẢNH BÁO: trang không có lớp tiếng động (#xsfx) → bỏ qua khoá sfx');

// đặt fx qua checkbox (change → setOptions({fx}) của UI)
async function applyFx(spec) {
  const ids = initCtl.fx.map((f) => f.id);
  let on;
  if (spec === 'default') on = new Set(initCtl.fx.filter((f) => f.on).map((f) => f.id));
  else if (spec === 'none') on = new Set();
  else if (spec === 'all') on = new Set(ids);
  else {
    on = new Set(spec.split('+').filter(Boolean));
    for (const id of on) if (!ids.includes(id)) throw new Error(`fx '${id}' không có (có: ${ids.join(',')})`);
  }
  for (const id of ids) await page.setChecked(`#xfx input[data-fx="${id}"]`, on.has(id));
}
// đặt sfx qua UI: checkbox (change) + range (sự kiện input như người dùng kéo); trả về số lớp đang BẬT
async function applySfx(spec) {
  const want = new Map(); // id → % âm lượng
  if (spec === 'default') { for (const L of initCtl.sfx) if (L.on) want.set(L.id, L.vol); }
  else if (spec === 'all') { for (const L of initCtl.sfx) want.set(L.id, 100); }
  else if (spec !== 'none') {
    for (const part of spec.split('+').filter(Boolean)) {
      const [id, pc] = part.split('@');
      if (!initCtl.sfx.some((L) => L.id === id)) throw new Error(`sfx '${id}' không có (có: ${initCtl.sfx.map((L) => L.id).join(',')})`);
      want.set(id, pc === undefined ? 100 : +pc);
    }
  }
  for (const L of initCtl.sfx) {
    const on = want.has(L.id);
    await page.setChecked(`#xsfx input[data-sl="${L.i}"]`, on);
    const vol = on ? want.get(L.id) : (spec === 'default' ? L.vol : 100);
    await page.$eval(`#xsfx input[data-sv="${L.i}"]`, (el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, vol);
  }
  return want.size;
}

const fpsPage = await page.evaluate(() => { const m = document.querySelector('[data-fps]'); return m ? +m.getAttribute('data-fps') : 30; });
const tStart = +(await page.inputValue('#xs')), tEnd = +(await page.inputValue('#xe'));
console.log(`Kiểm tra xuất MP4: ${relative(process.cwd(), htmlPath)}  ${res}  ${tStart}–${tEnd}s  ${combos.length} tổ hợp → ${outDir}`);

const results = [];
for (const c of combos) {
  const fxOn = needFx && initCtl.fx.length > 0, sfxOn = needSfx && initCtl.sfx.length > 0;
  const label = `${c.lang} ${c.subs ? 'sub' : 'nosub'} ${c.voice ? 'voice' : 'novoice'}` + (fxOn ? ` fx=${c.fx}` : '') + (sfxOn ? ` sfx=${c.sfx}` : '');
  const file = join(outDir, `${c.lang}_${c.subs ? 'sub' : 'nosub'}_${c.voice ? 'voice' : 'novoice'}${fxOn ? '_fx-' + safe(c.fx) : ''}${sfxOn ? '_sfx-' + safe(c.sfx) : ''}${opt('vid') ? '_' + opt('vid') : ''}.mp4`);
  const r = { label, file, errs: [], status: '' };
  results.push(r);
  console.log(`\n[${label}] …`);
  try {
    if ((await page.locator('#xlang option').allTextContents()).length) await page.selectOption('#xlang', c.lang);
    if (opt('vid') && (await page.locator('#xvid option').count())) await page.selectOption('#xvid', opt('vid'));
    await page.setChecked('#xsubs', c.subs);
    await page.setChecked('#xvoice', c.voice);
    if (fxOn) await applyFx(c.fx);
    let sfxLayersOn = null;
    if (sfxOn) sfxLayersOn = await applySfx(c.sfx);
    // âm thanh mong đợi: có giọng, hoặc còn ít nhất 1 lớp tiếng động bật
    const sfxAny = sfxLayersOn !== null ? sfxLayersOn > 0 : initCtl.sfx.some((L) => L.on);
    const expectAudio = c.voice || sfxAny;
    const timeout = Math.max(300000, (tEnd - tStart) * 1000 * 60);
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout }),
      page.click('#xgo'),
    ]);
    await dl.saveAs(file);
    r.status = (await page.locator('#xstat').textContent()).trim();
    // chờ dòng trạng thái cuối cùng (Xong/Lỗi)
    await page.waitForFunction(() => /Xong:|Lỗi:/.test(document.querySelector('#xstat').textContent), null, { timeout: 60000 }).catch(() => {});
    r.status = (await page.locator('#xstat').textContent()).trim().replace(/\n/g, ' · ');
    if (/Lỗi:/.test(r.status)) r.errs.push('trạng thái báo lỗi');

    const p = probe(file);
    const [W, H] = SIZES[res];
    const expect = Math.round((tEnd - tStart) * p.fps);
    r.info = `${p.v.codec_name} ${p.v.width}×${p.v.height} ${p.fps.toFixed(2)}fps ${p.frames}f vid ${p.vdur.toFixed(2)}s` + (p.a ? ` · ${p.a.codec_name} ${p.adur.toFixed(2)}s` : ' · không âm thanh');
    if (Math.abs(p.fps - fpsPage) > 0.01) r.errs.push(`fps ${p.fps} ≠ ${fpsPage}`);
    if (!(Math.abs(p.frames - expect) <= 1)) r.errs.push(`số frame ${p.frames} ≠ ${expect}±1`);
    if (!!p.a !== expectAudio) r.errs.push(expectAudio ? 'thiếu âm thanh' : 'có âm thanh dù tắt giọng + tiếng động');
    if (p.v.width !== W || p.v.height !== H) r.errs.push(`kích thước ${p.v.width}×${p.v.height} ≠ ${W}×${H}`);
    if (p.a && c.voice && p.adur < (tEnd - tStart) - 0.5) r.errs.push(`âm thanh ngắn (${p.adur.toFixed(2)}s)`);
    // khung giữa + các mốc --frames (giây tuyệt đối → trừ tStart)
    r.frames = [];
    const dur = tEnd - tStart;
    const shots = [['giữa', dur / 2, '_mid'], ...extraT.map((t) => [`t=${t}`, t - tStart, '_t' + String(t).replace('.', 'p')])];
    for (const [nm, ss, suf] of shots) {
      if (ss < 0 || ss > dur) { r.errs.push(`mốc ${nm} ngoài đoạn xuất`); continue; }
      const f = file.replace(/\.mp4$/, suf + '.png');
      const ff = run('ffmpeg', ['-v', 'error', '-y', '-ss', String(Math.min(ss, Math.max(0, dur - 0.05))), '-i', file, '-frames:v', '1', f]);
      if (ff.status !== 0 || !existsSync(f)) r.errs.push(`không lấy được khung ${nm}`); else r.frames.push({ f, nm });
    }
  } catch (e) {
    r.errs.push('ngoại lệ: ' + (e.message || e).toString().split('\n')[0]);
    r.status = r.status || (await page.locator('#xstat').textContent().catch(() => '')).trim().replace(/\n/g, ' · ');
    // trang có thể đang kẹt: nạp lại cho tổ hợp sau
    await page.reload().catch(() => {});
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 }).catch(() => {});
    await setupPage().catch(() => {});
  }
  r.ok = r.errs.length === 0;
  console.log(`[${label}] ${r.ok ? 'OK' : 'LỖI: ' + r.errs.join('; ')}  ${r.info || ''}`);
}

// ---- bảng ghép khung (mỗi tổ hợp 1 hàng: giữa + các mốc --frames) ----
const withFrame = results.filter((r) => r.frames && r.frames.length);
if (withFrame.length) {
  const C = await browser.newPage();
  await C.setContent('<body></body>');
  const tw = 270, th = 480;
  const rows = withFrame.map((r) => r.frames.map((x) => ({ b: readFileSync(x.f).toString('base64'), lb: r.label + ' · ' + x.nm })));
  const b64 = await C.evaluate(async ({ rows, tw, th }) => {
    const cols = Math.max(...rows.map((r) => r.length));
    const cv = document.createElement('canvas'); cv.width = cols * (tw + 4); cv.height = rows.length * (th + 4);
    const g = cv.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = 'bold 13px sans-serif'; g.textBaseline = 'middle';
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      const im = new Image(); im.src = 'data:image/png;base64,' + rows[j][i].b; await im.decode();
      const x = i * (tw + 4) + 2, y = j * (th + 4) + 2; g.drawImage(im, x, y, tw, th);
      const w = Math.min(tw - 6, g.measureText(rows[j][i].lb).width + 8);
      g.fillStyle = 'rgba(0,0,0,0.78)'; g.fillRect(x + 3, y + th - 24, w, 22); g.fillStyle = '#fff'; g.fillText(rows[j][i].lb, x + 7, y + th - 13, tw - 14);
    }
    return cv.toDataURL('image/jpeg', 0.88).split(',')[1];
  }, { rows, tw, th });
  await writeFile(join(outDir, 'sheet.jpg'), Buffer.from(b64, 'base64'));
}

// ---- báo cáo ----
const bad = results.filter((r) => !r.ok).length;
let md = `# Kiểm tra xuất MP4\n\n- Trang: \`${relative(process.cwd(), htmlPath)}\`\n- Độ phân giải: ${res} (${SIZES[res].join('×')}) · đoạn ${tStart}–${tEnd}s\n- Kết quả: ${results.length - bad}/${results.length} OK\n\n`;
md += '| Tổ hợp | Kết quả | Thông số | Lỗi | Trạng thái |\n|---|---|---|---|---|\n';
for (const r of results) md += `| ${r.label} | ${r.ok ? 'OK' : 'LỖI'} | ${r.info || ''} | ${r.errs.join('; ')} | ${(r.status || '').replace(/\|/g, '/')} |\n`;
md += `\nBảng khung (mỗi hàng = 1 tổ hợp): \`${join(outDir, 'sheet.jpg')}\`\n`;
await writeFile(join(outDir, 'report.md'), md);
console.log('\n' + md);
await browser.close();
process.exit(bad ? 1 : 0);
