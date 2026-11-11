// Mở Chrome/Edge CÓ SẴN trên máy (playwright-core, không tải trình duyệt). Dùng GPU thật nếu có.
//   BROWSER=msedge|chrome  chọn trình duyệt; GL=swiftshader  ép render bằng CPU (máy không GPU / cloud).
import { chromium } from 'playwright-core';

export async function launchBrowser({ headless = true } = {}) {
  const gl = process.env.GL === 'swiftshader'
    ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'];
  const args = [...gl, '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
  const tries = process.env.BROWSER ? [process.env.BROWSER] : ['chrome', 'msedge'];
  let last;
  for (const channel of tries) {
    try { return await chromium.launch({ channel, headless, args }); } catch (e) { last = e; }
  }
  throw new Error('Không mở được Chrome/Edge: ' + (last && last.message));
}
