// Xuất hình học THẬT của một bối cảnh engine thành danh sách khối hộp (hộp bao theo trục) để đưa vào kit / công cụ dựng khối.
//   node tools/kb/xuat-khoi-env.mjs <ep> <env> [file ra.json]      vd: node tools/kb/xuat-khoi-env.mjs ep003 e3-phong kich-ban/ep003-de-bai-2/khoi-e3-phong.json
// Mỗi vật có tên ở tầng trên cùng của nhóm env_<tên> → { ten, tam: [x,y,z], kich: [rộng, cao, sâu], mau }. Nhóm không tên thì đi xuống một tầng. Đơn vị stud, hệ trục của bối cảnh.
import { createServer } from 'http'; import { readFile, writeFile } from 'fs/promises'; import { extname, join, resolve, relative } from 'path'; import { pathToFileURL } from 'url';
import { launchBrowser } from '../browser.mjs';
const [ep, env, ra] = process.argv.slice(2), root = process.cwd();
const { SHOTS } = await import(pathToFileURL(join(root, 'episodes', ep, 'shots.js')).href);
let t0 = 0, t = null; for (const s of SHOTS) { if (t === null && s.env === env) t = t0 + s.dur / 2; t0 += s.dur; }
if (t === null) { console.log('không có shot nào dùng env', env); process.exit(2); }
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.ttf': 'font/ttf', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
const srv = createServer(async (q, r) => { try { const p = resolve(join(root, decodeURIComponent(q.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0; const b = await readFile(p); r.writeHead(200, { 'content-type': T[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
await new Promise((r) => srv.once('listening', r));
const b = await launchBrowser(), page = await b.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => console.log('LỖI TRANG', e.message));
await page.goto(`http://localhost:${srv.address().port}/episodes/${ep}/index.html`);
await page.waitForFunction('window.__ready === true', { timeout: 180000 });
const khoi = await page.evaluate(([env, t]) => {
  window.renderAt(t); const THREE = window.THREE, g = window.__stage.scene.getObjectByName('env_' + env); if (!g) return null;
  g.updateWorldMatrix(true, true); const inv = g.matrixWorld.clone().invert(), out = [], r = (x) => Math.round(x * 100) / 100, dem = {};
  const mau = (o) => { let c = null; o.traverse((m) => { if (!c && m.isMesh) { const mt = Array.isArray(m.material) ? m.material[0] : m.material; if (mt?.color) c = '#' + mt.color.getHexString(); } }); return c; };
  const them = (o) => {
    const bb = new THREE.Box3().setFromObject(o); if (bb.isEmpty()) return; bb.applyMatrix4(inv);
    const s = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()); if (Math.max(s.x, s.y, s.z) < 0.05) return;
    dem[o.name] = (dem[o.name] || 0) + 1; out.push({ ten: dem[o.name] > 1 ? `${o.name}#${dem[o.name]}` : o.name, tam: [r(c.x), r(c.y), r(c.z)], kich: [r(s.x), r(s.y), r(s.z)], mau: mau(o) || undefined });
  };
  // vật = nút CÓ TÊN mà bên trong không còn nút có tên nào khác; nút chứa (có con cháu có tên) thì đi xuống; lưới không tên nằm trực tiếp trong nút chứa lấy tên "<cha>_khoi"
  const coTenBenTrong = (o) => { let co = false; o.traverse((m) => { if (m !== o && m.name) co = true; }); return co; };
  const di = (o) => { for (const c of o.children) { if (!c.visible || c.isLight || c.isCamera) continue; if (coTenBenTrong(c)) di(c); else if (c.name) them(c); else if (c.isMesh) { c.name = (o.name || 'vat') + '_khoi'; them(c); c.name = ''; } else di(c); } };
  di(g); return out;
}, [env, t]);
await b.close(); srv.close();
if (!khoi) { console.log('không thấy nhóm env_' + env); process.exit(1); }
const txt = '{\n "env": ' + JSON.stringify(env) + ', "don_vi": "stud", "truc": "+X đông, +Y lên, +Z nam",\n "khoi": [\n' + khoi.map((k) => '  ' + JSON.stringify(k)).join(',\n') + '\n ]\n}\n';
if (ra) { await writeFile(ra, txt); console.log(khoi.length, 'khối →', ra); } else console.log(txt);
