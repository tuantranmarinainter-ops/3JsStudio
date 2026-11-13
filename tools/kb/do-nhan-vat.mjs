// Đo nhân vật của một tập + dựng khối một bố cục (trang tools/kb/do-nhan-vat.html, dùng diễn viên THẬT của engine).
//   node tools/kb/do-nhan-vat.mjs do   <ep> <thư mục ra>                      → nhan-vat.json (hộp bao từng bộ phận, đầu, mặt, tay; theo stud) + raw/<tên>_<truoc|ngang|sau>.png
//   node tools/kb/do-nhan-vat.mjs dung <ep> <bo-cuc.json> <thư mục ra> [S001,S018]  → <id>.png (khung khối 450×800) + dung.json (cỡ đầu, tâm đầu chiếu ra % khung)
// bo-cuc.json: { "shots": [ { "id": "S018", "cam": { "p": [x,y,z], "l": [x,y,z], "fov": 28, "nghieng": 0 }, "khoi": [ { "ten", "tam": [x,y,z], "kich": [rộng,cao,sâu], "ry_do", "mau" } ],
//                              "dien_vien": [ { "ai": "hero", "pos": [x,y,z], "ry_do": 0, "tu_the": "idle", "t": 0 } ] } ] }   (đơn vị stud; xem kich-ban/ep003-de-bai-2/DE-BAI.md)
// Ảnh ghép có thước: python tools/kb/bang-nhan-vat.py <thư mục ra>
import { createServer } from 'http'; import { readFile, writeFile, mkdir } from 'fs/promises'; import { extname, join, resolve, relative } from 'path';
import { launchBrowser } from '../browser.mjs';
const [mode, ep, ...rest] = process.argv.slice(2), root = process.cwd();
if (!['do', 'dung'].includes(mode) || !ep) { console.log('dùng: node tools/kb/do-nhan-vat.mjs do <ep> <ra> | dung <ep> <bo-cuc.json> <ra> [ids]'); process.exit(2); }
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.ttf': 'font/ttf' };
const srv = createServer(async (q, r) => { try { const p = resolve(join(root, decodeURIComponent(q.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0; const b = await readFile(p); r.writeHead(200, { 'content-type': T[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
await new Promise((r) => srv.once('listening', r));
const b = await launchBrowser(), page = await b.newPage({ viewport: { width: 700, height: 820 } });
page.on('pageerror', (e) => console.log('LỖI TRANG', e.message));
await page.goto(`http://localhost:${srv.address().port}/tools/kb/do-nhan-vat.html?ep=${ep}`);
await page.waitForFunction('window.__ready === true', { timeout: 180000 });
const luu = (f, url) => writeFile(f, Buffer.from(url.split(',')[1], 'base64'));
let ma = 0;
if (mode === 'do') {
  const out = resolve(rest[0] || `output/${ep}/nhan-vat-do`); await mkdir(join(out, 'raw'), { recursive: true });
  const ten = await page.evaluate('window.__do.ten'), O = await page.evaluate('window.__do.O'), nv = {};
  for (const n of ten) {
    nv[n] = await page.evaluate((n) => window.__do.doNhanVat(n), n);
    for (const h of ['truoc', 'ngang', 'sau']) await luu(join(out, 'raw', `${n}_${h}.png`), await page.evaluate(([n, h]) => window.__do.chupThang(n, h), [n, h]));
    const t = nv[n].toan_than, d = nv[n].dau_khoi;
    console.log(n.padEnd(10), nv[n].loai.padEnd(4), 'cao', t.max[1].toFixed(2), ' ngang', t.kich[0].toFixed(2), ' sâu', t.kich[2].toFixed(2), d ? ` đầu ${d.cam_y.toFixed(2)}–${d.dinh_y.toFixed(2)} (${d.cao.toFixed(2)})` : '');
  }
  // tư thế ngồi / nằm của nhân vật chính: gốc toạ độ nằm ở đâu so với thân
  const tuThe = {}; for (const tt of ['sit', 'lie']) { try { tuThe[tt] = (await page.evaluate(([n, tt]) => window.__do.doNhanVat(n, tt), [ten[0], tt])).toan_than; } catch (e) { tuThe[tt] = { loi: String(e.message || e).slice(0, 120) }; } }
  await writeFile(join(out, 'nhan-vat.json'), JSON.stringify({ tap: ep, don_vi: 'stud', vung_chup: O, nhan_vat: nv, tu_the_cua: ten[0], tu_the: tuThe }, null, 1));
  console.log('→', join(out, 'nhan-vat.json'));
} else {
  const bc = JSON.parse(await readFile(rest[0], 'utf8')), out = resolve(rest[1] || `output/${ep}/dung-khoi`), pick = rest[2] ? new Set(rest[2].split(',')) : null; await mkdir(out, { recursive: true });
  // Mã nhân vật của kịch bản → tên diễn viên engine (ghi tên nào cũng được). Khối của shot = khối bối cảnh (boi_canh[<id>].khoi) + khối riêng của shot + đạo cụ có tam/kich.
  const MA = { GA: 'hero', BAP: 'bap', BACH: 'bach', MAYOR: 'mayor', MAYOR_NGU: 'mayor_ngu', GUARD_A: 'linh_a', GUARD_B: 'linh_b', BAKER: 'banh', TAILOR: 'may', CHILD_A: 'be_vang', CHILD_B: 'be_ngoc', BEAR_WALLET: 'gau_vi', BEAR_BAG: 'gau_tui', TOWN_A: 'dan_a', TOWN_B: 'dan_b', TOWN_C: 'dan_c' };
  const kq = {};
  for (const s0 of bc.shots || []) {
    if (pick && !pick.has(s0.id)) continue;
    if (!s0.cam) { kq[s0.id] = { bo_qua: 'không có cam' }; continue; }
    const s = { ...s0, khoi: [...(bc.boi_canh?.[s0.boi_canh]?.khoi || []), ...(s0.khoi || []), ...(s0.dao_cu || []).filter((d) => d.tam && d.kich).map((d) => ({ mau: '#c9a23a', ...d }))],
      dien_vien: (s0.dien_vien || []).map((d) => ({ ...d, ai: MA[d.ai] || d.ai })) };
    try {
      const r = await page.evaluate((s) => window.__do.dungKhoi(s), s); await luu(join(out, s.id + '.png'), r.anh); kq[s.id] = { dien_vien: r.do, may_trong_khoi: r.may_trong_khoi };
      const loi = r.may_trong_khoi.length || r.do.some((d) => !d.trong_khung || d.bi_che_boi); if (loi) ma = 1;
      console.log(s.id, r.do.map((d) => `${d.ai}: đầu ${d.dau_cao_pct}% tâm ${d.tam_dau_pct}${d.trong_khung ? '' : ' ⚠ NGOÀI KHUNG'}${d.bi_che_boi ? ' ⚠ bị che bởi ' + d.bi_che_boi : ''}`).join(' · '), r.may_trong_khoi.length ? '⚠ MÁY TRONG KHỐI ' + r.may_trong_khoi : '');
    } catch (e) { ma = 1; kq[s.id] = { loi: String(e.message || e).slice(0, 200) }; console.log(s.id, 'LỖI', kq[s.id].loi); }
  }
  await writeFile(join(out, 'dung.json'), JSON.stringify(kq, null, 1));
}
await b.close(); srv.close(); process.exit(ma);
