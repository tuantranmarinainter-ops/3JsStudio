// XEM THỬ số của kit bằng CHÍNH ENGINE (khung phim thật: gương phản chiếu, két mở, đạo cụ cầm tay, ánh sáng) + đo bằng số.
//   node tools/kb/kit2-xem.mjs <ep> <kit-<lớp>.json> <S018,S020 | all> [thư mục ra]
// Việc làm: (1) chuyển kit → episodes/<ep>/kit2-<lớp>.js (lớp lấy từ tên file: kit-phong.json → phong); (2) mở trang tập, với mỗi shot chụp 3 khung ĐẦU / GIỮA / CUỐI;
// (3) ghép <ra>/<ID>.jpg = [ảnh kịch bản cũ | đầu | giữa | cuối]; (4) in số đo từng diễn viên ở khung giữa: phần thân nằm trong khung, bị che, mặt bị che.
// ⚠ khi: tâm đầu diễn viên trong kit nằm ngoài khung · thân bị che > 60 % · mặt bị che > 50 % (bỏ qua nếu diễn viên ghi "thay_tu" = cố ý chỉ thấy một phần).
// Thoát mã 1 nếu có ⚠ hoặc lỗi. Mỗi lần chạy mất 40–90 giây (mở Chrome không giao diện) + ~2 giây mỗi shot → gom nhiều shot vào một lần chạy.
import { createServer } from 'http'; import { readFile, writeFile, mkdir } from 'fs/promises'; import { extname, join, resolve, relative, basename, dirname } from 'path'; import { pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
import { launchBrowser } from '../browser.mjs';
const [ep, file, pick = 'all', ra] = process.argv.slice(2), root = process.cwd();
if (!ep || !file) { console.log('dùng: node tools/kb/kit2-xem.mjs <ep> <kit-<lớp>.json> <ids|all> [ra]'); process.exit(2); }
const lop = basename(file).replace(/^kit-?/, '').replace(/\.json$/, '') || 'phong', out = resolve(ra || join(dirname(file), 'xem')); await mkdir(out, { recursive: true });
console.log(execFileSync(process.execPath, ['tools/kb/kit2-sang-shot.mjs', ep, file, lop], { encoding: 'utf8' }).trim());
const kit = JSON.parse(await readFile(file, 'utf8')), MA = { GA: 'hero', BAP: 'bap', BACH: 'bach', MAYOR: 'mayor', MAYOR_NGU: 'mayor_ngu', GUARD_A: 'linh_a', GUARD_B: 'linh_b', BAKER: 'banh', TAILOR: 'may', CHILD_A: 'be_vang', CHILD_B: 'be_ngoc', BEAR_WALLET: 'gau_vi', BEAR_BAG: 'gau_tui', TOWN_A: 'dan_a', TOWN_B: 'dan_b', TOWN_C: 'dan_c' };
const { SHOTS } = await import(pathToFileURL(join(root, 'episodes', ep, 'shots.js')).href);
const moc = {}; { let t0 = 0; for (const s of SHOTS) { moc[s.id] = [t0, s.dur]; t0 += s.dur; } }
const want = (kit.shots || []).filter((s) => s.cam && (pick === 'all' || pick.toLowerCase().split(',').includes(String(s.id).toLowerCase())));
if (!want.length) { console.log('không có shot nào khớp', pick); process.exit(2); }
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.ttf': 'font/ttf', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
const srv = createServer(async (q, r) => { try { const p = resolve(join(root, decodeURIComponent(q.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0; const b = await readFile(p); r.writeHead(200, { 'content-type': T[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
await new Promise((r) => srv.once('listening', r));
const goc = `http://localhost:${srv.address().port}`;
const b = await launchBrowser(), page = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.25 });   // khung 270 × 480
page.on('pageerror', (e) => console.log('LỖI TRANG', e.message));
await page.goto(`${goc}/episodes/${ep}/index.html?subs=0`);
await page.waitForFunction('window.__ready === true', { timeout: 240000 });
const ghep = await b.newPage({ viewport: { width: 400, height: 300 } }); await ghep.setContent('<canvas id="c"></canvas>');
const anhKB = join('kich-ban', `${ep}-goi2`, 'shots');
let ma = 0; const tong = {};
for (const s of want) {
  const id = String(s.id).toLowerCase(), ID = id.toUpperCase(), m = moc[id]; if (!m) { console.log(ID, 'không có trong shots.js'); ma = 1; continue; }
  const khung = [], do_ = [];
  for (const k of [0.03, 0.5, 0.97]) {
    const t = m[0] + m[1] * k;
    const d = await page.evaluate((t) => { window.renderAt(t); const M = window.__measure(t), c = window.__stage.camera; const V = new window.THREE.Vector3(), dau = (ten) => { const r = window.__stage.scene.getObjectByName(ten); if (!r) return null; const h = r.getObjectByName('Head') || r.getObjectByName('head'); if (h) h.localToWorld(V.set(0, h.name === 'Head' ? 0.67 : 0.3, 0)); else { r.getWorldPosition(V); V.y += 1.67; } const sau = V.clone().sub(c.position).dot(c.getWorldDirection(new window.THREE.Vector3())) < 0; V.project(c); return sau ? null : [Math.round((V.x + 1) * 50), Math.round((1 - V.y) * 50)]; };
      return { vat: M.vat.filter((v) => v.vai === 'hero' || v.vai === 'nguoi').map((v) => ({ ten: v.ten, bbox: v.bbox, trong: v.trongKhung, che: v.che, matChe: v.mat?.che ?? null, dau: dau(v.ten) })), cam: { p: c.position.toArray().map((x) => +x.toFixed(2)), fov: +c.fov.toFixed(1) } }; }, t);
    do_.push(d); khung.push('data:image/png;base64,' + (await page.locator('#root').first().screenshot({ type: 'png' })).toString('base64'));
  }
  let kb = null; try { kb = 'data:image/jpeg;base64,' + (await readFile(join(anhKB, ID + '.jpg'))).toString('base64'); } catch {}
  const jpg = await ghep.evaluate(async ([kb, khung, ID]) => {
    const W = 270, H = 480, N = 26, c = document.getElementById('c'); c.width = W * 4 + 12; c.height = H + N; const g = c.getContext('2d'); g.fillStyle = '#141414'; g.fillRect(0, 0, c.width, c.height);
    const nap = (u) => new Promise((ok) => { if (!u) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = u; });
    const ds = [[kb, ID + ' KỊCH BẢN CŨ', '#ffd25a'], [khung[0], 'ENGINE đầu', '#78c8ff'], [khung[1], 'ENGINE giữa', '#78c8ff'], [khung[2], 'ENGINE cuối', '#78c8ff']];
    for (let i = 0; i < 4; i++) { const im = await nap(ds[i][0]), x = i * (W + 4); g.fillStyle = ds[i][2]; g.font = 'bold 17px Arial'; g.fillText(ds[i][1], x + 4, 19); if (im) g.drawImage(im, x, N, W, H); }
    return c.toDataURL('image/jpeg', 0.86).split(',')[1];
  }, [kb, khung, ID]);
  await writeFile(join(out, ID + '.jpg'), Buffer.from(jpg, 'base64'));
  const giua = do_[1], coY = new Map((s.dien_vien || []).map((d) => [MA[d.ai] || d.ai, d])), dong = [];
  for (const [n, d] of coY) {
    const v = giua.vat.find((x) => x.ten === n);
    if (!v) { dong.push(`${n}: ⚠ KHÔNG THẤY trong cảnh`); if (!d.thay_tu) ma = 1; continue; }
    const dauTrong = !!v.dau && v.dau[0] >= 2 && v.dau[0] <= 98 && v.dau[1] >= 2 && v.dau[1] <= 98;
    const xau = (!dauTrong || v.che > 0.6 || (v.matChe !== null && v.matChe > 0.5)) && !d.thay_tu; if (xau) ma = 1;
    dong.push(`${n}: đầu ở ${v.dau ? `(${v.dau[0]}%, ${v.dau[1]}%)` : 'SAU MÁY'}${dauTrong ? '' : ' NGOÀI KHUNG'} · thân trong khung ${Math.round(v.trong * 100)}% · thân bị che ${Math.round(v.che * 100)}%${v.matChe !== null ? ` · mặt bị che ${Math.round(v.matChe * 100)}%` : ''}${xau ? ' ⚠' : ''}`);
  }
  const thua = giua.vat.filter((v) => !coY.has(v.ten) && v.trong > 0.05).map((v) => v.ten); if (thua.length) dong.push(`(ngoài kit nhưng lọt khung: ${thua.join(', ')})`);
  tong[ID] = do_; console.log(`${ID}  máy giữa p=${JSON.stringify(giua.cam.p)} fov=${giua.cam.fov}\n   ` + dong.join('\n   '));
}
await writeFile(join(out, `do-${lop}.json`), JSON.stringify(tong));
await b.close(); srv.close();
console.log(`→ ảnh ghép: ${relative(root, out)}/<ID>.jpg (kịch bản cũ | đầu | giữa | cuối)`);
process.exit(ma);
