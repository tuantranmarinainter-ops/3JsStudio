// Mở Chrome/Edge CÓ SẴN trên máy (playwright-core, không tải trình duyệt). Dùng GPU thật nếu có.
//   BROWSER=msedge|chrome  chọn trình duyệt; GL=swiftshader  ép render bằng CPU (máy không GPU / cloud).
//
// PROFILE=1 (THỬ NGHIỆM, mặc định TẮT): chạy Chrome với hồ sơ cố định .cache/chrome-profile/<kênh>-<N> để GIỮ LẠI shader đã dịch
//   → lần mở trang sau còn ~6–7 s thay vì ~28–31 s (đo 2026-11-13 trên ep001/ep002).
//   - Chỉ trang mở trong ngữ cảnh mặc định của hồ sơ mới dùng lại được shader (ngữ cảnh ẩn danh thì không). Vì thế trình duyệt
//     được mở TRỄ ở lần newPage() đầu tiên, lấy luôn viewport + deviceScaleFactor của trang đó làm mặc định của hồ sơ.
//     Trang sau cùng deviceScaleFactor → mở trong hồ sơ; khác deviceScaleFactor (vd trang ghép bảng 400×400) → ngữ cảnh riêng như cũ.
//   - Nhiều công cụ chạy cùng lúc: mỗi tiến trình giữ một ô N riêng (file khoá <hồ sơ>.lock ghi pid); hết ô thì chạy kiểu cũ.
//   - Cache HTTP bị tắt (--disk-cache-size=1) để không bao giờ lấy file cũ sau khi sửa.
//   - GL=swiftshader luôn chạy kiểu cũ (so khung tất định). Xoá .cache/chrome-profile/ lúc nào cũng được.
import { chromium } from 'playwright-core';
import { mkdirSync, openSync, writeSync, closeSync, readFileSync, rmSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { giuO } from './chrome-sem.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SLOTS = 4;

function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }

function takeSlot(channel) {
  const base = join(ROOT, '.cache', 'chrome-profile');
  mkdirSync(base, { recursive: true });
  for (let i = 0; i < SLOTS; i++) {
    const dir = join(base, `${channel}-${i}`); const lock = dir + '.lock';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const fd = openSync(lock, 'wx'); writeSync(fd, String(process.pid)); closeSync(fd);
        return { dir, lock };
      } catch {
        let pid = 0; try { pid = Number(readFileSync(lock, 'utf8')); } catch {}
        if (pid && alive(pid)) break;                 // ô đang có tiến trình khác dùng
        try { rmSync(lock, { force: true }); } catch {} // khoá mồ côi (tiến trình cũ đã chết) → gỡ rồi thử lại
      }
    }
  }
  return null;
}

function lazyProfileBrowser(channel, headless, args) {
  let ctx = null, plain = null, slot = null, dsf = 1, firstUsed = false;
  const release = () => { if (slot) { try { rmSync(slot.lock, { force: true }); } catch {} slot = null; } };
  const plainBrowser = async () => (plain ||= await chromium.launch({ channel, headless, args }));
  const start = async (opts) => {
    slot = takeSlot(channel);
    if (!slot) return false;
    try {
      dsf = opts.deviceScaleFactor || 1;
      ctx = await chromium.launchPersistentContext(slot.dir, { channel, headless, args: [...args, '--disk-cache-size=1'],
        viewport: opts.viewport || { width: 1280, height: 720 }, deviceScaleFactor: dsf, acceptDownloads: true });
      process.once('exit', release);
      return true;
    } catch { release(); ctx = null; return false; }
  };
  return {
    async newPage(opts = {}) {
      if (!ctx && !plain && !(await start(opts))) await plainBrowser();
      if (!ctx) return plain.newPage(opts);
      if ((opts.deviceScaleFactor || 1) !== dsf) return (ctx.browser() || await plainBrowser()).newPage(opts);
      const page = !firstUsed && ctx.pages()[0] ? ctx.pages()[0] : await ctx.newPage();
      firstUsed = true;
      if (opts.viewport) await page.setViewportSize(opts.viewport);
      return page;
    },
    async newContext(opts) {   // ngữ cảnh riêng: đúng như cũ, không dùng lại shader
      if (ctx && ctx.browser()) return ctx.browser().newContext(opts);
      return (await plainBrowser()).newContext(opts);
    },
    async close() {
      try { if (ctx) await ctx.close(); if (plain) await plain.close(); } finally { release(); }
    },
  };
}

// Khoá toàn máy: tối đa CHROME_TOI_DA (mặc định 3) Chrome ẩn cùng lúc, chờ ô nếu đầy (tools/chrome-sem.mjs, CHROME_KHOA=0 để tắt).
export async function launchBrowser(opts = {}) {
  const o = await giuO();
  try {
    const b = await moChrome(opts);
    const close = b.close.bind(b);
    b.close = async (...a) => { try { return await close(...a); } finally { o.tha(); } };
    return b;
  } catch (e) { o.tha(); throw e; }
}

async function moChrome({ headless = true } = {}) {
  const sw = process.env.GL === 'swiftshader';
  const gl = sw
    ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'];
  const args = [...gl, '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
  const tries = process.env.BROWSER ? [process.env.BROWSER] : ['chrome', 'msedge'];
  if (!sw && process.env.PROFILE === '1') return lazyProfileBrowser(tries[0], headless, args);
  let last;
  for (const channel of tries) {
    try { return await chromium.launch({ channel, headless, args }); } catch (e) { last = e; }
  }
  throw new Error('Không mở được Chrome/Edge: ' + (last && last.message));
}
