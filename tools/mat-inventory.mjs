// Kiểm kê VẬT LIỆU của cả tập (mọi bối cảnh, nhà, diễn viên, đạo cụ): tên, loại, màu, nhám/kim loại, texture,
// đang gắn chất liệu gì (userData.matKind của engine/materials.js), và đường dẫn object dùng nó.
//   node tools/mat-inventory.mjs [ep001] [--out output/mat-inventory.json]
// Dùng để soát "cái gì còn trông như nhựa" và thêm luật phân loại trong engine/materials.js.
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { extname, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2);
const ep = args.find((a) => !a.startsWith('--')) || 'ep001';
const oi = args.indexOf('--out');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, oi >= 0 ? args[oi + 1] : 'output/mat-inventory.json');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.hdr': 'application/octet-stream' };
const srv = createServer(async (req, res) => {
  try { const p = join(root, decodeURIComponent(req.url.split('?')[0])); const b = await readFile(p);
    res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(b);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(`http://localhost:${srv.address().port}/episodes/${ep}/index.html?peek=1`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
const rows = await page.evaluate(() => {
  const scene = window.__stage.scene, map = new Map();
  const pathOf = (o) => { const n = []; for (let x = o; x && x !== scene && n.length < 6; x = x.parent) if (x.name) n.unshift(x.name); return n.join('/'); };
  scene.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine && !o.isSprite) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m) continue;
      let r = map.get(m.uuid);
      if (!r) {
        r = { name: m.name || '', type: m.type, color: m.color ? '#' + m.color.getHexString() : null, rough: m.roughness ?? null, metal: m.metalness ?? null,
          map: !!m.map, normal: !!m.normalMap, transparent: !!m.transparent, emissive: m.emissive ? m.emissive.getHex() !== 0 : false,
          kind: m.userData.matKind || null, uses: 0, tris: 0, paths: [] };
        map.set(m.uuid, r);
      }
      r.uses++;
      const g = o.geometry; if (g) r.tris += (g.index ? g.index.count : g.attributes.position?.count || 0) / 3;
      if (r.paths.length < 4) r.paths.push(pathOf(o));
    }
  });
  return [...map.values()].sort((a, b) => b.tris - a.tris);
});
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(rows, null, 1));
const byKind = {}; for (const r of rows) byKind[r.kind || '(chưa gán)'] = (byKind[r.kind || '(chưa gán)'] || 0) + 1;
console.log(`${rows.length} vật liệu → ${out}`);
console.log('theo chất liệu:', JSON.stringify(byKind));
await browser.close(); srv.close();
