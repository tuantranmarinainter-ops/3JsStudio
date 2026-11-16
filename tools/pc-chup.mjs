// node tools/pc-chup.mjs <trang.html> <ra.png> [--w 1280 --h 720] — chụp bố cục MÁY TÍNH (chuột, không cảm ứng) để so trước/sau khi sửa trình phát.
import { launchBrowser } from './browser.mjs'; import { resolve } from 'path'; import { pathToFileURL } from 'url';
const a = process.argv.slice(2); const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const [file, out] = a.filter((x) => !x.startsWith('--')); const br = await launchBrowser();
const page = await br.newPage({ viewport: { width: +opt('w', 1280), height: +opt('h', 720) } });
await page.goto(pathToFileURL(resolve(file)).href + '?ui=1', { timeout: 240000 });
await page.waitForFunction(() => window.__ready === true && !document.getElementById('xpre'), null, { timeout: 240000 });
await page.waitForTimeout(1500); await page.screenshot({ path: resolve(out) }); await br.close(); console.log('ghi', out);
