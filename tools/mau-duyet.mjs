// Bảng MẪU cho người dùng duyệt TRƯỚC khi dựng shot (bước 'mau-duyet' của dây chuyền một câu luật -> phim).
//   node tools/mau-duyet.mjs <ep> [--kich-ban <file>] [--force] [--lai muc,muc] [--cho 120]
//   node tools/mau-duyet.mjs <ep> --duyet muc,muc|tat-ca        đánh dấu đã duyệt (duyet: true)
//   node tools/mau-duyet.mjs <ep> --tu-choi muc,muc             từ chối (duyet: false) -> lần chạy sau CHỈ chụp lại mẫu đó
//   -> output/<ep>/duyet/mau/<muc>.jpg (540x960 có nhãn) + 00_mau.jpg (lưới rộng 1600 px, 4 cột; > 32 ô thì 00_mau_2.jpg…)
//      output/<ep>/kiem/mau.json  { <muc>: { hash, duyet: null|true|false, file?, chua_co?, kinds?, ... } }
// Mẫu (đọc kịch bản qua tools/kb/kichban.py --json):
//   nv:<vai>:<mặt>      mỗi nhân vật (actor, trừ crowd) × (mặt thường + tối đa 3 biểu cảm dùng nhiều nhất của vai đó, cột `ai` + `mặt`)
//   env:<env>:<rong|can>:<giờ>   mỗi bối cảnh có trong engine × 2 góc (GOC_MAU) × 2 giờ (giờ dùng nhiều nhất trong kịch bản; giờ nhiều thứ nhì,
//                                không có thì 'dem' — nếu giờ 1 đã là 'dem' thì 'trua'). Env nội thất vẫn chụp 2 giờ.
//   prop:<tên>          mỗi đạo cụ ở cột `vật cần đọc` (propKit theo tên Anh qua dichLoai, rồi GLB trong manifest)
//   mat:<kind>          mỗi vật liệu `chua-duyet` mà đạo cụ ở trên dùng. ĐỊNH NGHĨA: kind không thuộc MAT_DA_DUYET (engine/materials.js),
//                       hoặc mesh trong suốt chưa khai báo/chưa vá (= nguồn 'chua-va' của __measure). Biết được SAU khi chụp đạo cụ (lưu `kinds` ở mục prop).
// Phần CHƯA CÓ để chụp (env chưa dựng, đạo cụ chưa có mô hình, lỗi trang) KHÔNG làm chết tool: ghi { chua_co: <lý do> } trong mau.json.
// Chụp lại khi: chưa có / đầu vào đổi (hash) / duyet === false / thiếu file / --force / --lai. Không đổi gì -> không mở trình duyệt.
// Mã thoát: 0 xong, 1 kịch bản có lỗi dữ liệu, 2 lỗi môi trường (python / trình duyệt / trang không sẵn sàng).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { docKichBan, docEnvCo, docManifest, docTuStoryboard, dichLoai, tachTuThe } from './kb/asset-plan.mjs';
import { ungVien } from './kb/chon-mo-hinh.mjs';
import { fold, tuMoTa } from '../engine/envs/cong-thuc.js';
import { GOC_MAU } from '../engine/envs/goc-mau.js';
import { thuMucKiem, hashVao, batDau, datBuoc, ghiNhatKy } from './kiem/trang-thai.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOCS = ['rong', 'can'];
const CHUNG = ['engine/mau-lab.html', 'engine/stage.js', 'engine/shots.js'];

export const slug = (s) => fold(String(s)).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex');

// ---------- lập kế hoạch (thuần, không trình duyệt) ----------
export function chonGio(dem) {   // dem: Map giờ -> số shot
  const xep = [...dem].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g);
  const g1 = xep[0] ?? 'trua';
  const g2 = xep.find((g) => g !== g1) ?? (g1 === 'dem' ? 'trua' : 'dem');
  return [g1, g2];
}

export function phanGiaiEnv(kb, { envCo, town }) {
  const rieng = new Map();
  for (const c of kb.can_dung || []) if (c.kind === 'env') rieng.set(c.name, c.desc || '');
  const places = new Set(Object.keys(kb.meta?.places || {}));
  const cache = new Map();
  return (ten) => {
    if (cache.has(ten)) return cache.get(ten);
    let r;
    if (envCo.has(ten)) r = { env: ten };
    else if (rieng.has(ten)) {
      const ct = tuMoTa(rieng.get(ten)) ?? tuMoTa(ten);
      r = ct && envCo.has(ct.env) ? { env: ct.env } : { env: null, lyDo: `bối cảnh riêng "${ten}" chưa dựng (không khớp env nào trong engine)` };
    } else if (town.has(ten) || places.has(ten) || /^house\d+$/.test(ten)) r = { env: 'town' };
    else {
      const ct = tuMoTa(ten);
      r = ct && envCo.has(ct.env) ? { env: ct.env } : { env: null, lyDo: `địa điểm "${ten}" không khớp env nào trong engine` };
    }
    cache.set(ten, r);
    return r;
  };
}

export function lapMuc(kb, ctx) {
  const muc = [], chuaCo = [];
  const shots = kb.shots || [];
  // --- nhân vật ---
  const actors = { ...(kb.meta?.actors || {}) }; delete actors.crowd;
  if (!Object.keys(actors).length) for (const s of shots) if (s.who && !actors[s.who]) actors[s.who] = {};   // chỉ khi kịch bản không khai actor (cột `ai` còn có thể là thú/đạo cụ như bap, bear2)
  for (const [ten, optsGoc] of Object.entries(actors)) {
    const opts = { ...optsGoc }; delete opts.ga;   // 'ga' = rig riêng (engine/ga*.js) chưa nối vào cast.js: chụp bằng R15 theo màu khai báo
    const co = optsGoc.ga ? 'ga chưa nối vào cast.js: chụp bằng R15 mặc định' : null;
    const co1 = opts.face || 'smile';
    const dem = new Map();
    for (const s of shots) if (s.who === ten && s.face && s.face !== co1) dem.set(s.face, (dem.get(s.face) || 0) + 1);
    const top = [...dem].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([f]) => f);
    for (const [i, f] of [co1, ...top].entries()) {
      muc.push({
        id: `nv:${slug(ten)}:${i === 0 ? 'thuong' : slug(f)}`, loai: 'nv', spec: { ten, opts, face: f, seed: kb.meta?.seed ?? 1 },
        dong1: `${ten} · ${i === 0 ? 'mặt thường' : f}`, dong2: `${i === 0 ? 'nền: ' + f : (dem.get(f) + ' shot dùng')}${co ? ' · ' + co : ''}`,
        file: ['engine/r15.js', 'engine/cast.js'],
      });
    }
  }
  // --- bối cảnh ---
  const giaiEnv = phanGiaiEnv(kb, ctx);
  const theoEnv = new Map(), tenChuaCo = new Map();
  const them = (ten, gio) => {
    if (!ten) return;
    const r = giaiEnv(ten);
    if (!r.env) { if (!tenChuaCo.has(ten)) tenChuaCo.set(ten, r.lyDo); return; }
    if (!theoEnv.has(r.env)) theoEnv.set(r.env, new Map());
    if (gio) theoEnv.get(r.env).set(gio, (theoEnv.get(r.env).get(gio) || 0) + 1);
  };
  if (kb.meta?.env) them(String(kb.meta.env));
  for (const c of kb.can_dung || []) if (c.kind === 'env') them(c.name);
  for (const s of shots) them(s.env || s.at, s.time);
  for (const [ten, lyDo] of tenChuaCo) chuaCo.push({ id: `env:${slug(ten)}`, lyDo });
  for (const [env, dem] of theoEnv) {
    if (!GOC_MAU[env]) { chuaCo.push({ id: `env:${env}`, lyDo: `GOC_MAU chưa có góc mẫu cho env "${env}"` }); continue; }
    const [g1, g2] = chonGio(dem);
    for (const gio of [g1, g2]) for (const goc of GOCS) {
      muc.push({
        id: `env:${env}:${goc}:${gio}`, loai: 'env', spec: { env, goc, gio },
        dong1: `${env} · góc ${goc}`, dong2: `giờ ${gio}${gio === g1 ? ' (nhiều nhất)' : ''}`,
        file: [`engine/envs/${env}.js`, 'engine/envs/gio-thoi-tiet.js', 'engine/envs/goc-mau.js', 'engine/envs.js'],
      });
    }
  }
  // --- đạo cụ `vật cần đọc` ---
  const man = ctx.manifest ?? [];
  const thay = new Set();
  for (const s of shots) {
    const ten = String(s.read || '').trim();
    if (!ten || thay.has(ten)) continue;
    thay.add(ten);
    const { loai } = tachTuThe(ten);
    const syns = dichLoai(loai);
    const glb = [];
    for (const sy of syns) for (const e of ungVien(man, { loai: sy })) if (!glb.includes(e.id)) glb.push(e.id);
    muc.push({
      id: `prop:${slug(ten)}`, loai: 'prop', spec: { ten, syns, glb: glb.slice(0, 3) },
      dong1: `đạo cụ: ${ten}`, dong2: `đọc ở shot ${s.id}`, file: ['engine/props.js', 'engine/materials.js', 'assets/manifest.json'],
    });
  }
  return { muc, chuaCo };
}

// ---------- mau.json ----------
const fMau = (ep, o) => path.join(thuMucKiem(ep, o), 'mau.json');
export function docMau(ep, o = {}) {
  try { const d = JSON.parse(fs.readFileSync(fMau(ep, o), 'utf8')); return d && typeof d === 'object' && !Array.isArray(d) ? d : {}; } catch { return {}; }
}
export function ghiMau(ep, d, o = {}) {
  const f = fMau(ep, o); fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = `${f}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2) + '\n'); fs.renameSync(tmp, f);
}
export function danhDau(ep, ds, giaTri, o = {}) {
  const d = docMau(ep, o); const lo = [];
  const tat = ds.length === 1 && ds[0] === 'tat-ca';
  for (const k of tat ? Object.keys(d) : ds) { if (!d[k]) lo.push(k); else if (!d[k].chua_co) d[k].duyet = giaTri; }
  ghiMau(ep, d, o);
  return lo;
}

// ---------- CLI ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
async function phucVu(root) {
  const srv = createServer(async (req, res) => {
    try {
      const p = path.resolve(path.join(root, decodeURIComponent(req.url.split('?')[0])));
      if (path.relative(root, p).startsWith('..')) throw 0;
      const b = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(b);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  return srv;
}

async function chay(argv) {
  const opt = {}, pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) { const k = argv[i].slice(2); if (k === 'force') opt.force = true; else opt[k] = argv[++i]; } else pos.push(argv[i]);
  }
  const ep = pos[0];
  if (!ep) { console.error('Dùng: node tools/mau-duyet.mjs <ep> [--kich-ban f] [--force] [--lai muc,..] [--duyet muc,..|tat-ca] [--tu-choi muc,..]'); return 2; }
  const ds = (s) => String(s).split(',').map((x) => x.trim()).filter(Boolean);
  if (opt.duyet || opt['tu-choi']) {
    const lo = [...(opt.duyet ? danhDau(ep, ds(opt.duyet), true) : []), ...(opt['tu-choi'] ? danhDau(ep, ds(opt['tu-choi']), false) : [])];
    if (lo.length) { console.error('Không có mẫu: ' + lo.join(', ')); return 1; }
    console.log('Đã cập nhật ' + fMau(ep, {})); return 0;
  }
  const ung = opt['kich-ban'] ? [path.resolve(opt['kich-ban'])] : [path.join(GOC, 'episodes', ep, 'kich-ban.md'), path.join(GOC, 'kich-ban', ep, 'kich-ban.md')];
  const fKb = ung.find((f) => fs.existsSync(f));
  if (!fKb) { console.error('Không thấy kịch bản: ' + ung.join(' | ')); return 2; }
  let kb;
  try { kb = docKichBan(fKb); } catch (e) { console.error('Kịch bản lỗi dữ liệu: ' + e.message); return 1; }
  if ((kb.loi_doc || []).length) { console.error('Kịch bản có lỗi dữ liệu:\n  ' + kb.loi_doc.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n  ')); return 1; }

  const ctx = { envCo: docEnvCo(GOC), town: docTuStoryboard(GOC).town, manifest: docManifest(GOC) };
  if (Array.isArray(ctx.manifest.assets)) ctx.manifest = ctx.manifest.assets;
  const kq = lapMuc(kb, ctx);
  const dirMau = path.join(GOC, 'output', ep, 'duyet', 'mau');
  const tenFile = (id) => id.replace(/[^A-Za-z0-9._-]+/g, '_') + '.jpg';
  const mau = docMau(ep);
  const hashMuc = (m) => sha(JSON.stringify(m.spec) + '|' + hashVao([...CHUNG, ...m.file], { goc: GOC }));

  // bỏ mục không còn trong kế hoạch (file ảnh cũ giữ nguyên); mat:* giữ nếu đạo cụ gốc còn
  const idHienCo = new Set([...kq.muc.map((m) => m.id), ...kq.chuaCo.map((c) => c.id)]);
  const matGoc = (k, v) => k.startsWith('mat:') && v.tu && idHienCo.has(v.tuProp);
  for (const k of Object.keys(mau)) if (!idHienCo.has(k) && !matGoc(k, mau[k])) delete mau[k];
  // mat:* đã biết từ lần chụp đạo cụ trước
  const matDaBiet = [];
  for (const m of kq.muc.filter((x) => x.loai === 'prop')) {
    for (const kd of (mau[m.id]?.kinds || [])) if (!kd.duyet) matDaBiet.push({ kind: kd.kind, prop: m });
  }
  const themMat = (kind, propM, hashProp) => {
    const id = `mat:${slug(kind)}`;
    if (kq.muc.some((x) => x.id === id)) return;
    kq.muc.push({
      id, loai: 'mat', spec: { kind, tu: propM.spec.ten, prop: propM.spec },
      dong1: `vật liệu: ${kind}`, dong2: `chưa duyệt · từ đạo cụ ${propM.spec.ten}`, file: ['engine/materials.js', ...propM.file], tuProp: propM.id,
    });
    idHienCo.add(id);
  };
  for (const { kind, prop } of matDaBiet) themMat(kind, prop);

  const lai = new Set(opt.lai ? ds(opt.lai) : []);
  const can = (m) => {
    const e = mau[m.id]; const f = path.join(dirMau, tenFile(m.id));
    return !!opt.force || lai.has(m.id) || !e || e.chua_co || e.hash !== hashMuc(m) || e.duyet === false || !fs.existsSync(f);
  };
  for (const c of kq.chuaCo) {   // ghi nhận phần chưa có (không chụp)
    mau[c.id] = { hash: sha(c.lyDo), duyet: null, chua_co: c.lyDo };
  }
  const ds0 = kq.muc.filter(can);
  const ghiXong = (daChup) => {
    ghiMau(ep, mau);
    const hashTong = sha(Object.keys(mau).sort().map((k) => k + ':' + mau[k].hash).join('|'));
    datBuoc(ep, 'mau-duyet', { hash: hashTong, xong: true }, {});
    ghiNhatKy(ep, { buoc: 'mau-duyet', chup: daChup, tong: kq.muc.length, chua_co: Object.values(mau).filter((v) => v.chua_co).length }, {});
  };
  // mat:* mới có thể xuất hiện sau khi chụp đạo cụ => nếu có prop cần chụp thì chắc chắn mở trình duyệt
  if (!ds0.length) {
    console.log(`Mẫu không đổi (${kq.muc.length} ô, ${kq.chuaCo.length} chưa có để chụp) -> không chụp lại.`);
    ghiXong(0); return 0;
  }

  batDau(ep, 'mau-duyet', {});
  fs.mkdirSync(dirMau, { recursive: true });
  const { launchBrowser } = await import('./browser.mjs');
  const { ganNhan, luoiAnh } = await import('./kiem/nhan.mjs');
  const srv = await phucVu(GOC);
  let browser, daChup = 0, hoanTat = false;
  const cho = Math.max(1, Number(opt.cho || 120)) * 1000;
  try {
    try { browser = await launchBrowser(); } catch (e) { console.error(e.message); return 2; }
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.5 });
    const loiConsole = [];
    page.on('console', (m) => { if (m.type() === 'error') loiConsole.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => loiConsole.push('pageerror: ' + e.message));
    await page.goto(`http://localhost:${srv.address().port}/engine/mau-lab.html?ep=${encodeURIComponent(ep)}`);
    try { await page.waitForFunction(() => window.__ready === true, null, { timeout: cho }); } catch {
      console.error(`Quá hạn ${cho / 1000} s chờ window.__ready của engine/mau-lab.html.`);
      if (loiConsole.length) console.error('Lỗi console:\n  ' + [...new Set(loiConsole)].slice(0, 10).join('\n  '));
      return 2;
    }
    const C = await browser.newPage({ viewport: { width: 400, height: 400 } });
    await C.setContent('<body></body>');
    const THU_TU = { nv: 0, prop: 1, mat: 2, env: 3 };   // env sau cùng: env thật đổi nền/sương/ánh sáng của stage
    const hangDoi = [...ds0].sort((a, b) => THU_TU[a.loai] - THU_TU[b.loai]);
    for (let i = 0; i < hangDoi.length; i++) {
      const m = hangDoi[i];
      let r;
      try {
        r = await page.evaluate(([id, spec]) => window.__datMuc(id, spec), [m.id, m.spec]);
      } catch (e) { r = { ok: false, lyDo: 'lỗi trang: ' + String(e.message).split('\n')[0].slice(0, 200) }; }
      if (!r.ok) {
        mau[m.id] = { hash: sha('chua-co|' + m.id + '|' + r.lyDo), duyet: null, chua_co: r.lyDo };
        console.log(`  - ${m.id}: chưa có để chụp (${r.lyDo})`);
        continue;
      }
      const png = await page.locator('#root').first().screenshot({ type: 'png' });
      const jpg = await ganNhan(C, png, m.dong1, m.dong2 + (r.ghiChu ? ` · ${r.ghiChu}` : ''));
      fs.writeFileSync(path.join(dirMau, tenFile(m.id)), jpg);
      const e = { hash: hashMuc(m), duyet: null, file: `output/${ep}/duyet/mau/${tenFile(m.id)}` };
      if (m.loai === 'prop') {
        e.kinds = (r.kinds || []).map((k) => ({ kind: k.kind, nguon: k.nguon, duyet: !!k.duyet }));
        for (const kd of e.kinds) if (!kd.duyet) {
          const id = `mat:${slug(kd.kind)}`;
          if (!kq.muc.some((x) => x.id === id) && !hangDoi.some((x) => x.id === id)) {
            themMat(kd.kind, m);
            const mm = kq.muc.find((x) => x.id === id);
            hangDoi.push(mm);
          }
        }
      }
      if (m.loai === 'mat') { e.tu = m.spec.tu; e.tuProp = m.tuProp; }
      mau[m.id] = e; daChup++;
      console.log(`  + ${m.id}`);
    }
    // lưới: mọi ô đang có ảnh, theo thứ tự kế hoạch
    const co = kq.muc.filter((m) => mau[m.id] && !mau[m.id].chua_co && fs.existsSync(path.join(dirMau, tenFile(m.id))));
    for (const f of fs.readdirSync(dirMau)) if (/^00_mau(_\d+)?\.jpg$/.test(f)) fs.unlinkSync(path.join(dirMau, f));
    for (let i = 0, n = 1; i < co.length; i += 32, n++) {
      const g = await luoiAnh(C, co.slice(i, i + 32).map((m) => fs.readFileSync(path.join(dirMau, tenFile(m.id)))), { cot: 4, rong: 1600 });
      if (g) fs.writeFileSync(path.join(dirMau, n === 1 ? '00_mau.jpg' : `00_mau_${n}.jpg`), g);
    }
    hoanTat = true;
  } finally {
    if (hoanTat) ghiXong(daChup); else if (daChup > 0) ghiMau(ep, mau);   // thoát sớm (return 2 / lỗi): không đánh dấu bước xong
    await browser?.close().catch(() => {});
    srv.close();
  }
  const nChuaCo = Object.values(mau).filter((v) => v.chua_co).length;
  console.log(`Mẫu: chụp ${daChup} ô, ${nChuaCo} mục chưa có để chụp. Ảnh: ${path.relative(GOC, dirMau)} (00_mau.jpg), trạng thái: ${path.relative(GOC, fMau(ep))}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  chay(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e.message); process.exit(2); });
}
