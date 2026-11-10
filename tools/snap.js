// snap.js — chụp frame từ một trang three.js trong repo, KHÔNG cần HyperFrames (dùng khi chưa init
// hoặc để xem nhanh). Trang phải có window.renderAt(t) và đặt window.__ready = true khi sẵn sàng.
//
// Cloud của Claude chặn cdn.jsdelivr.net → script phục vụ three từ node_modules cục bộ thay cho CDN.
//   npm i --prefix <thư mục tạm> three@0.160.0
//   node tools/snap.js <trang.html> <thư mục ra> <t1> <t2> ... [--three <thư mục tạm>/node_modules/three]
// Ví dụ:
//   node tools/snap.js engine/winter-demo.html output/winter 0.5 4.5 8 --three /tmp/x/node_modules/three
// Ra: <thư mục ra>/f_<t>.jpg (1080×1920) + sheet.jpg (contact sheet) + thời gian render mỗi frame.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const ti = args.indexOf('--three');
const threeDir = ti >= 0 ? args.splice(ti, 2)[1] : path.resolve('node_modules/three');
const [page, out, ...times] = args;
if (!page || !out || !times.length) { console.error('Dùng: node tools/snap.js <trang.html> <thư mục ra> <t...> [--three dir]'); process.exit(1); }
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg' };

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 540, height: 960 } });
  p.on('pageerror', (e) => console.log('pageerror:', e.message));
  p.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
  await p.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\//, (r) => {
    const rel = r.request().url().replace(/^.*three@[^/]+\//, '');
    r.fulfill({ path: path.join(threeDir, rel), contentType: 'text/javascript' });
  });
  await p.route('http://repo/**', (r) => {
    const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname));
    r.fulfill({ path: f, contentType: types[path.extname(f)] || 'application/octet-stream' });
  });
  await p.goto(`http://repo/${page}?capture=1`);
  await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  const files = [];
  for (const t of times) {
    const t0 = Date.now();
    await p.evaluate((t) => window.renderAt(t), +t);
    const url = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/jpeg', 0.85));
    const f = path.join(out, `f_${t}.jpg`);
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
    files.push(f);
    console.log(`t=${t}s  ${Date.now() - t0}ms  → ${f}`);
  }
  // contact sheet: ghép các frame cạnh nhau (thu nhỏ 1/3)
  const sheet = await p.evaluate(async (imgs) => {
    const ims = await Promise.all(imgs.map((src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; })));
    const w = 360, h = 640, c = document.createElement('canvas');
    c.width = w * ims.length; c.height = h;
    ims.forEach((im, k) => c.getContext('2d').drawImage(im, k * w, 0, w, h));
    return c.toDataURL('image/jpeg', 0.85);
  }, files.map((f) => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64')));
  fs.writeFileSync(path.join(out, 'sheet.jpg'), Buffer.from(sheet.split(',')[1], 'base64'));
  console.log('contact sheet →', path.join(out, 'sheet.jpg'));
  await b.close();
})();
