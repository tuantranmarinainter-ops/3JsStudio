// Tìm mọi khoảnh khắc BÀN CHÂN nhà biết đi chạm đất → episodes/ep001/sfx/steps.json (để đặt tiếng "BOOM").
//   node tools/sfx/steps.mjs [trang=episodes/ep001/index.html] [ra=episodes/ep001/sfx/steps.json]
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { extname, join, resolve, relative, dirname } from 'path';
import { launchBrowser } from '../browser.mjs';

const root = process.cwd();
const pageArg = process.argv[2] || 'episodes/ep001/index.html';
const outFile = resolve(process.argv[3] || 'episodes/ep001/sfx/steps.json');
const FPS = 30;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.css': 'text/css', '.wasm': 'application/wasm' };
const srv = createServer(async (req, res) => {
  try {
    const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0])));
    if (relative(root, p).startsWith('..')) throw 0;
    const b = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
await new Promise((r) => srv.once('listening', r));
const url = `http://localhost:${srv.address().port}/${pageArg.split('\\').join('/')}`;

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(url);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });

const raw = await page.evaluate(({ FPS }) => {
  const st = window.__stage, tl = window.__shots;
  st.draw = () => {};                       // chỉ cập nhật pose, không vẽ
  const houses = [];
  st.scene.traverse((o) => { if (/^house_/.test(o.name) && o.children.some((c) => c.name === 'house_body')) houses.push(o); });
  const feet = houses.map((h) => {
    const list = [];
    h.traverse((o) => { if (o.name === 'foot' && o.parent && /^leg_/.test(o.parent.name)) list.push(o); });
    return { h, list };
  });
  const vis = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const total = Math.round(tl.total * FPS);
  const events = [];
  const prev = new Map();                    // foot → { y, shotId }
  const wp = { x: 0, y: 0, z: 0 };
  for (let f = 0; f < total; f++) {
    const t = f / FPS;
    window.renderAt(t);
    st.camera.updateMatrixWorld(true);
    const T = Math.min(t, tl.total - 1e-4);
    const shot = tl.at(T).shot, sid = shot.id;
    for (const { h, list } of feet) {
      h.updateMatrixWorld(true);
      for (const ft of list) {
        const visible = vis(ft) && ft.scale.x > 0.95;
        const y = ft.position.y;
        const pv = prev.get(ft);
        if (visible && pv && pv.sid === sid && pv.vis && pv.y > 0.3 && y <= 0.05) {
          const w = ft.getWorldPosition(ft.position.clone());
          const cp = st.camera.getWorldPosition(w.clone());
          const dist = w.distanceTo(cp);
          const n = w.clone().project(st.camera);
          events.push({ t: +(t).toFixed(3), f, house: h.name, leg: ft.parent.name, onScreen: n.z < 1 && Math.abs(n.x) <= 1 && Math.abs(n.y) <= 1, dist: +dist.toFixed(1), shot: sid });
        }
        prev.set(ft, { y, sid, vis: visible });
      }
    }
  }
  return events;
}, { FPS });

raw.sort((a, b) => a.t - b.t || a.leg.localeCompare(b.leg));
await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify(raw, null, 1));
const per = {};
for (const e of raw) { per[e.shot] = per[e.shot] || { n: 0, on: 0 }; per[e.shot].n++; if (e.onScreen) per[e.shot].on++; }
console.log(`Tổng ${raw.length} bước chân, trên màn hình ${raw.filter((e) => e.onScreen).length}`);
for (const [s, v] of Object.entries(per)) console.log(`  ${s}: ${v.n} (trên màn hình ${v.on})`);
console.log('Ghi:', outFile);
await browser.close(); srv.close();
