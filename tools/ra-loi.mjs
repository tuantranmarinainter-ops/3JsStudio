// Vòng tự sửa shot theo kết quả kiem-luat (spec mục 7.2 và 8).
//   node tools/ra-loi.mjs <ep> [--thu]
//   Đọc output/<ep>/kiem/luat.json -> nhóm lỗi theo luật -> áp cách sửa (tools/kiem/sua.mjs) vào ĐÚNG shot trong
//   episodes/<ep>/shots.js (chèn khoá vào dòng shot, không ghi lại cả file) -> kiem-luat lại các shot đã sửa
//   -> tối đa goi.vongMax vòng. Ghi nhật ký (output/<ep>/kiem/nhat-ky.jsonl, mỗi cách sửa một dòng), ảnh A|B
//   output/<ep>/duyet/03_truoc-sau/<shot>_<luật>_v<vòng>.jpg, tóm tắt output/<ep>/kiem/ra-loi.json.
//   --thu: in các patch sẽ áp (JSON), KHÔNG ghi shots.js, không chạy kiem-luat, không ghi trạng thái/nhật ký.
//   Mã thoát: 0 hết lỗi, 1 còn lỗi / phải gọi người dùng (goi.lyDo), 2 môi trường (thiếu luat.json, shots.js lỗi...).
//   Không bao giờ: push, xoá asset, đổi twist/kết. Sửa lời kể KHÔNG nằm ở đây: ra-loi.json có danh sách loiKe {shot, cau, lyDo}.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { nguong as docNguong } from './kiem/luat.mjs';
import { CACH_SUA, apPatch, gopPatch } from './kiem/sua.mjs';
import { batDau, datBuoc, hashVao, ghiNhatKy } from './kiem/trang-thai.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MARK_A = '/*ra-loi*/', MARK_Z = '/*/ra-loi*/';

class LoiMoiTruong extends Error {}

// ---- shots.js: đọc ----
async function docShots(file) {
  const text = fs.readFileSync(file, 'utf8');
  try {
    const mod = await import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
    if (!Array.isArray(mod.SHOTS)) throw new Error('shots.js không xuất SHOTS');
    return { text, shots: mod.SHOTS };
  } catch (e) { throw new LoiMoiTruong('Không đọc được ' + file + ': ' + e.message); }
}

// tìm dấu } đóng của object bắt đầu tại text[start] === '{' (bỏ qua chuỗi, chú thích)
function timDong(text, start) {
  let d = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i = text.indexOf('*/', i + 2); if (i < 0) return -1; i++; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const q = c; i++;
      while (i < text.length && text[i] !== q) { if (text[i] === '\\') i++; i++; }
      continue;
    }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return i; }
  }
  return -1;
}

// chèn / thay các khoá vào dòng shot `id`. kv = { khoá: giá trị đầy đủ }. Trả text mới hoặc null nếu không thấy shot.
export function chenKhoa(text, id, kv) {
  const re = new RegExp("^([ \\t]*)\\{\\s*id:\\s*(['\"])" + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\2', 'm');
  const m = re.exec(text);
  if (!m) return null;
  const start = m.index + m[1].length;
  let dong = timDong(text, start);
  if (dong < 0) return null;
  let body = text.slice(start, dong);
  for (const k of Object.keys(kv)) {
    const cu = new RegExp(',?\\s*' + MARK_A.replace(/[*/]/g, '\\$&') + '\\s*' + k + ':[^]*?' + MARK_Z.replace(/[*/]/g, '\\$&'));
    body = body.replace(cu, '');
  }
  const dau = body.replace(/\s+$/, '');
  const duoi = body.slice(dau.length);
  const them = Object.entries(kv).map(([k, v]) => `${MARK_A} ${k}: ${JSON.stringify(v)} ${MARK_Z}`).join(', ');
  const dauPhay = /[,{]$/.test(dau);
  const moi = dau + (dauPhay ? ' ' : ', ') + them + (duoi || ' ');
  return text.slice(0, start) + moi + text.slice(dong);
}

// ---- chọn cách sửa cho một (shot, luật) ----
function chonCach(ma, sd, kq, ng, daDung) {
  const ds = CACH_SUA[ma];
  if (!ds) return { lyDo: 'khong-tu-sua' };
  const ung = [];
  for (const f of ds) { let r = null; try { r = f(sd, kq, ng); } catch { r = null; } if (r && r.patch && Object.keys(r.patch).length) ung.push({ ten: f.name, ...r }); }
  if (!ung.length) return { lyDo: 'khong-co-cach' };
  const moi = ung.find((x) => !daDung.has(x.ten));
  return { cach: moi || ung[ung.length - 1] };
}

const tenAnh = (id, f) => `${id}_f${String(f).padStart(4, '0')}.jpg`;

function docLuat(f) {
  if (!fs.existsSync(f)) throw new LoiMoiTruong('Thiếu ' + f + ' — chạy tools/kiem-luat.mjs trước.');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { throw new LoiMoiTruong('luat.json hỏng: ' + e.message); }
}

// ---- mặc định: chạy kiem-luat thật / ghép ảnh bằng trình duyệt ----
function macDinhKiemLuat({ goc, ep, trang, ids }) {
  const r = spawnSync(process.execPath, [path.join(goc, 'tools', 'kiem-luat.mjs'), trang, '--ep', ep, '--shots', ids.join(','), '--jobs', '2'], { cwd: goc, encoding: 'utf8', timeout: 20 * 60 * 1000 });
  if (r.status !== 0 && r.status !== 1) throw new LoiMoiTruong('kiem-luat lỗi môi trường (mã ' + r.status + '): ' + (r.stderr || '').slice(-400));
  return docLuat(path.join(goc, 'output', ep, 'kiem', 'luat.json'));
}
let trinhDuyet = null;
async function macDinhGhepAnh(bufA, bufB, out) {
  const { launchBrowser } = await import('./browser.mjs');
  const { luoiAnh } = await import('./kiem/nhan.mjs');
  trinhDuyet ||= await launchBrowser();
  const p = await trinhDuyet.newPage({ viewport: { width: 400, height: 400 } });
  try {
    await p.setContent('<body></body>');
    const b = await luoiAnh(p, [bufA, bufB], { cot: 2, rong: 800 });
    if (b) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, b); }
  } finally { await p.close().catch(() => {}); }
}

// ---- lõi ----
export async function raLoi(ep, o = {}) {
  const goc = o.goc || GOC, thu = !!o.thu;
  const kiemLuat = o.kiemLuat || macDinhKiemLuat, ghepAnh = o.ghepAnh || macDinhGhepAnh;
  const epDir = path.join(goc, 'episodes', ep), fShots = path.join(epDir, 'shots.js');
  const kiemDir = path.join(goc, 'output', ep, 'kiem'), duyetDir = path.join(goc, 'output', ep, 'duyet');
  if (!fs.existsSync(fShots)) throw new LoiMoiTruong('Không thấy ' + fShots);
  const ng = docNguong(epDir);
  const vongMax = Math.max(1, ng.goi?.vongMax ?? 2);
  let luat = docLuat(path.join(kiemDir, 'luat.json'));
  const trang = luat.trang;
  const tg = { goc };
  if (!thu) batDau(ep, 'ra-loi', tg);

  const daSua = [];           // { vong, shot, luat, cach, moTa, patch }
  const daDung = new Map();   // `${id}|${ma}` -> Set tên cách đã dùng
  const dsThu = [];
  let soVong = 0;

  const loiHienTai = () => {
    const out = [];
    for (const [id, rec] of Object.entries(luat.shots || {})) for (const ma of rec.loi || []) if (ma !== 'loi') out.push({ id, ma, rec });
    return out;
  };

  for (let vong = 1; vong <= vongMax; vong++) {
    const hien = loiHienTai();
    const { shots } = await docShots(fShots);
    const theoId = new Map(shots.map((s) => [s.id, s]));
    const patchShot = new Map();   // id -> patch gộp
    const viec = [];               // { id, ma, cach }
    for (const { id, ma, rec } of hien) {
      const sd0 = theoId.get(id);
      if (!sd0) continue;
      const sd = { ...sd0, _dur: rec.dur, _type: rec.type ?? sd0.type ?? null, _vong: vong };
      const khoa = `${id}|${ma}`;
      const r = chonCach(ma, sd, rec.luat[ma], ng, daDung.get(khoa) || new Set());
      if (!r.cach) continue;
      viec.push({ id, ma, cach: r.cach, sd0 });
    }
    if (!viec.length) break;
    // gộp patch theo shot (tính từ shot gốc; khoá trùng thì cách sau đè)
    for (const v of viec) patchShot.set(v.id, gopPatch(patchShot.get(v.id) || {}, v.cach.patch));
    if (thu) {
      for (const v of viec) dsThu.push({ shot: v.id, luat: v.ma, cach: v.cach.ten, moTa: v.cach.moTa, patch: v.cach.patch });
      soVong = 1;
      break;
    }
    soVong = vong;
    // ảnh TRƯỚC (khung giữa hiện có) lấy trước khi kiem-luat ghi đè
    const truoc = new Map();
    for (const v of viec) {
      const rec = luat.shots[v.id];
      const f = path.join(duyetDir, '01_shots', tenAnh(v.id, rec.khung[1]));
      if (fs.existsSync(f) && !truoc.has(v.id)) truoc.set(v.id, fs.readFileSync(f));
    }
    // áp vào shots.js, kiểm đọc lại được
    const { text } = await docShots(fShots);
    let moi = text;
    for (const [id, patch] of patchShot) {
      const kv = apPatch(theoId.get(id), patch);
      const t2 = chenKhoa(moi, id, kv);
      if (t2 === null) throw new LoiMoiTruong('Không tìm thấy dòng shot ' + id + ' trong shots.js');
      moi = t2;
    }
    try { await import('data:text/javascript;base64,' + Buffer.from(moi).toString('base64')); } catch (e) { throw new LoiMoiTruong('shots.js sau khi sửa không đọc được (giữ nguyên bản cũ): ' + e.message); }
    fs.writeFileSync(fShots, moi, 'utf8');
    for (const v of viec) {
      const khoa = `${v.id}|${v.ma}`;
      if (!daDung.has(khoa)) daDung.set(khoa, new Set());
      daDung.get(khoa).add(v.cach.ten);
      const d = { vong, shot: v.id, luat: v.ma, cach: v.cach.ten, moTa: v.cach.moTa, patch: v.cach.patch };
      daSua.push(d);
      ghiNhatKy(ep, { buoc: 'ra-loi', hanh_dong: 'sua', vong, shot: v.id, luat: v.ma, cach: v.cach.ten, mo_ta: v.cach.moTa, patch: v.cach.patch }, tg);
    }
    // đo lại các shot đã sửa
    const ids = [...patchShot.keys()];
    luat = await kiemLuat({ goc, ep, trang, ids });
    // ảnh A|B
    for (const v of viec) {
      const rec = luat.shots && luat.shots[v.id];
      const A = truoc.get(v.id);
      if (!rec || !A) continue;
      const f = path.join(duyetDir, '01_shots', tenAnh(v.id, rec.khung[1]));
      if (!fs.existsSync(f)) continue;
      try { await ghepAnh(A, fs.readFileSync(f), path.join(duyetDir, '03_truoc-sau', `${v.id}_${v.ma}_v${vong}.jpg`)); } catch { /* ảnh lỗi không chặn vòng sửa */ }
    }
  }
  if (trinhDuyet) { await trinhDuyet.close().catch(() => {}); trinhDuyet = null; }

  if (thu) {
    const theoLuat = {};
    for (const d of dsThu) theoLuat[d.luat] = (theoLuat[d.luat] || 0) + 1;
    return { ma: 0, thu: true, patch: dsThu, soShotCoPatch: new Set(dsThu.map((d) => d.shot)).size, theoLuat, soShotLoi: new Set(loiHienTai().map((x) => x.id)).size };
  }

  // ---- kết quả cuối ----
  const { shots: shotsCuoi } = await docShots(fShots);
  const theoIdCuoi = new Map(shotsCuoi.map((s) => [s.id, s]));
  const conLoi = loiHienTai();
  const khongSua = [], loiKe = [];
  for (const { id, ma, rec } of conLoi) {
    const sd0 = theoIdCuoi.get(id);
    const kq = rec.luat[ma];
    let lyDo;
    if (!CACH_SUA[ma]) lyDo = 'khong-tu-sua';
    else if (!sd0) lyDo = 'khong-thay-shot';
    else {
      const r = chonCach(ma, { ...sd0, _dur: rec.dur, _type: rec.type ?? sd0.type ?? null, _vong: soVong + 1 }, kq, ng, new Set());
      lyDo = r.cach ? `con-loi-sau-${soVong}-vong` : r.lyDo;
    }
    khongSua.push({ shot: id, luat: ma, lyDo, val: kq.val ?? null });
    if (['L1', 'L2', 'L3', 'L11'].includes(ma) && sd0) loiKe.push({ shot: id, cau: sd0.line ?? null, lyDo: `${ma} ${JSON.stringify(kq.val)}` });
  }
  for (const x of luat.loiShot || []) khongSua.push({ shot: x.id, luat: '*', lyDo: 'shot-nem-loi: ' + x.loi, val: null });
  const lyDo = [...(luat.goi?.lyDo || [])];
  const nKhong = khongSua.filter((x) => x.lyDo === 'khong-tu-sua' || x.lyDo === 'khong-co-cach' || x.lyDo.startsWith('shot-nem-loi')).length;
  if (nKhong) lyDo.push(`${nKhong} loi khong tu sua duoc (can nguoi dung)`);
  const conSau = khongSua.filter((x) => x.lyDo.startsWith('con-loi-sau')).length;
  if (conSau) lyDo.push(`${conSau} loi con lai sau ${soVong} vong sua`);
  const goi = { can: lyDo.length > 0, lyDo };
  const tomTat = {
    ep, luc: new Date().toISOString(), soVong, daSua, khongSua, loiKe, goi,
    soShotLoi: new Set(conLoi.map((x) => x.id)).size,
  };
  fs.mkdirSync(kiemDir, { recursive: true });
  fs.writeFileSync(path.join(kiemDir, 'ra-loi.json'), JSON.stringify(tomTat, null, 1) + '\n');
  datBuoc(ep, 'ra-loi', { hash: hashVao([path.relative(goc, fShots)], { goc }), xong: !goi.can, goi: goi.can ? 1 : 0 }, tg);
  return { ma: goi.can || conLoi.length || (luat.loiShot || []).length ? 1 : 0, ...tomTat };
}

// ---- CLI ----
export async function chay(argv, o = {}) {
  const pos = argv.filter((a) => !a.startsWith('--'));
  const thu = argv.includes('--thu');
  if (!pos[0]) { console.error('Dùng: node tools/ra-loi.mjs <ep> [--thu]'); return 2; }
  try {
    const r = await raLoi(pos[0], { ...o, thu });
    if (r.thu) {
      console.log(JSON.stringify({ ep: pos[0], soShotLoi: r.soShotLoi, soShotCoPatch: r.soShotCoPatch, theoLuat: r.theoLuat, patch: r.patch }, null, 1));
      return 0;
    }
    console.log(`ra-loi ${pos[0]}  ${r.soVong} vong  da sua ${r.daSua.length}  con loi ${r.soShotLoi} shot`);
    for (const d of r.daSua) console.log(`  v${d.vong} ${d.shot} ${d.luat} ${d.cach}: ${d.moTa}`);
    for (const k of r.khongSua.slice(0, 20)) console.log(`  KHONG SUA ${k.shot} ${k.luat}: ${k.lyDo}`);
    if (r.loiKe.length) console.log('loiKe (can sua loi ke / giao agent): ' + JSON.stringify(r.loiKe));
    if (r.goi.can) console.log('Can goi: ' + r.goi.lyDo.join('; '));
    return r.ma;
  } catch (e) {
    console.error((e instanceof LoiMoiTruong ? '' : 'Lỗi: ') + e.message);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(await chay(process.argv.slice(2)));
}
