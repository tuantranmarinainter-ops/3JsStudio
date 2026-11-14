// Chấm ĐIỂM KHỚP BỐ CỤC giữa khung hình dựng 3D và hình storyboard (tranh AI) cho từng shot — thay việc soi bằng mắt.
//   node tools/khop-storyboard.mjs <trang index.html của tập> <kich-ban/<ep>> [--shots s001,s002|all] [--out output/khop/<ep>]
//        [--nguong-dat 0.7] [--nguong-lech 0.4] [--dung-lai]   (--dung-lai: dùng lại ảnh khung đã chụp trong --out, không chụp lại)
// Chụp khung bằng tools/look.mjs (tiến trình con, một lần cho mọi thời điểm). Khung ở đầu (t0+1 khung), giữa, cuối (t1−1 khung) theo `hinh`
// (1 → đầu; 2 → đầu, cuối; 3 → đầu, giữa, cuối). Ảnh thu nhỏ 270×480 ghi vào --out/<id>_<đầu|giữa|cuối>.png.
// Ra: <kich-ban/<ep>>/khop.json; thoát 0 khi không có shot `hong`, 1 khi có.
//
// THƯỚC ĐO (không so pixel thô — một bên là 3D, một bên là tranh vẽ). Cả hai ảnh thu về 54×96, cắt giữa tỉ lệ 9:16:
//  - sang     : bản đồ độ sáng lưới 9×16 (sau làm mờ), mỗi bản đồ chuẩn hoá z-score, hệ số tương quan Pearson r → max(0, r).
//  - noiBat   : bản đồ nổi bật S = 0,5·norm(|làm mờ nhẹ − làm mờ rộng|) + 0,5·norm(biên Sobel); lưới 9×16, Pearson → max(0, r).
//  - trongTam : trọng tâm vùng nổi bật (điểm có S > TB+0,5·σ, trọng số S²); d = khoảng cách (chuẩn hoá theo rộng/cao khung);
//               điểm = max(0, 1 − d/0,35).
//  - dienTich : tỉ lệ cỡ chủ thể r = C_a/C_b với C = √(diện tích vùng nổi bật · độ trải²); điểm = exp(−0,7·|ln r|/ln 2) (r=2 → 0,5; r=4 → 0,25).
//  - mau      : màu TB 3 dải (trên/giữa/dưới) trừ màu TB toàn ảnh, chia độ lệch chuẩn toàn ảnh (triệt bảng màu/tương phản chung);
//               điểm = exp(−RMS(chênh)/0,8). Ảnh xám thì bỏ thành phần này.
//  Điểm cặp = 0,35·sang + 0,20·noiBat + 0,15·trongTam + 0,15·dienTich + 0,15·mau (chia lại trọng số khi thiếu mau).
//  Điểm shot = trung bình các cặp. Trạng thái: dat ≥ 0,7 · lech ≥ 0,4 · hong < 0,4 (cấu hình được).
//  HƯỚNG THAY ĐỔI (shot ≥ 2 hình): cỡ chủ thể = C như trên; tỉ số cuối/đầu > 1,15 → "vao",
//  < 1/1,15 → "ra", còn lại "giu". Storyboard và khung dựng ngược nhau (một vào một ra) → nguocHuong:true, trạng thái hạ xuống ít nhất `lech`.
import { readFile, writeFile, mkdir, readdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join, dirname, relative } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

export const W = 54, H = 96, GX = 9, GY = 16;
export const NGUONG = { dat: 0.7, lech: 0.4 };
const TRONG_SO = { sang: 0.35, noiBat: 0.2, trongTam: 0.15, dienTich: 0.15, mau: 0.15 };
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ---------- hàm thuần ----------
// chuẩn hoá đầu vào → {g: xám w*h, rgb: w*h*3 | null}
function chuanHoa(a, w, h) {
  const n = w * h, g = new Float32Array(n);
  if (a.length === n * 3 || a.length === n * 4) {
    const k = a.length / n, rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = a[i * k], gg = a[i * k + 1], b = a[i * k + 2];
      rgb[i * 3] = r; rgb[i * 3 + 1] = gg; rgb[i * 3 + 2] = b;
      g[i] = 0.299 * r + 0.587 * gg + 0.114 * b;
    }
    return { g, rgb };
  }
  for (let i = 0; i < n; i++) g[i] = a[i];
  return { g, rgb: null };
}
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, c = 0;
    for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += src[y * w + xx]; c++; } }
    tmp[y * w + x] = s / c;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, c = 0;
    for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; c++; } }
    out[y * w + x] = s / c;
  }
  return out;
}
function luoi(m, w, h, gx = GX, gy = GY) {
  const out = new Float32Array(gx * gy), cnt = new Float32Array(gx * gy);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = Math.min(gx - 1, Math.floor(x * gx / w)), cy = Math.min(gy - 1, Math.floor(y * gy / h));
    out[cy * gx + cx] += m[y * w + x]; cnt[cy * gx + cx]++;
  }
  for (let i = 0; i < out.length; i++) out[i] /= cnt[i] || 1;
  return out;
}
function pearson(a, b) {
  const n = a.length; let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
  if (saa < 1e-9 && sbb < 1e-9) return 1;     // cả hai phẳng → coi là khớp
  if (saa < 1e-9 || sbb < 1e-9) return 0;
  return sab / Math.sqrt(saa * sbb);
}
function noiBatMap(g, w, h) {
  const b1 = boxBlur(g, w, h, 1), bL = boxBlur(g, w, h, Math.max(2, Math.round(w / 6)));
  const cs = new Float32Array(g.length), gm = new Float32Array(g.length);
  for (let i = 0; i < g.length; i++) cs[i] = Math.abs(b1[i] - bL[i]);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = (b1[i - w + 1] + 2 * b1[i + 1] + b1[i + w + 1]) - (b1[i - w - 1] + 2 * b1[i - 1] + b1[i + w - 1]);
    const gy = (b1[i + w - 1] + 2 * b1[i + w] + b1[i + w + 1]) - (b1[i - w - 1] + 2 * b1[i - w] + b1[i - w + 1]);
    gm[i] = Math.hypot(gx, gy);
  }
  let mc = 1e-6, mg = 1e-6;
  for (let i = 0; i < g.length; i++) { if (cs[i] > mc) mc = cs[i]; if (gm[i] > mg) mg = gm[i]; }
  const s = new Float32Array(g.length);
  for (let i = 0; i < g.length; i++) s[i] = 0.5 * cs[i] / mc + 0.5 * gm[i] / mg;
  return s;
}
function chuThe(s, w, h) {   // trọng tâm (0..1), diện tích (0..1), độ trải
  let m = 0; for (const v of s) m += v; m /= s.length;
  let sd = 0; for (const v of s) sd += (v - m) * (v - m); sd = Math.sqrt(sd / s.length);
  const thr = m + 0.5 * sd;
  let wsum = 0, cx = 0, cy = 0, cnt = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = s[y * w + x]; if (v <= thr) continue;
    const wt = v * v; wsum += wt; cx += wt * (x + 0.5) / w; cy += wt * (y + 0.5) / h; cnt++;
  }
  if (!wsum || sd < 1e-4) return { cx: 0.5, cy: 0.5, dt: 0.01, trai: 0.05 };
  cx /= wsum; cy /= wsum;
  let vx = 0, vy = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = s[y * w + x]; if (v <= thr) continue;
    const wt = v * v; vx += wt * ((x + 0.5) / w - cx) ** 2; vy += wt * ((y + 0.5) / h - cy) ** 2;
  }
  return { cx, cy, dt: Math.max(0.01, cnt / s.length), trai: Math.max(0.01, Math.sqrt(Math.sqrt((vx / wsum) * (vy / wsum)))) };
}
function mauDai(rgb, w, h) {   // 3 dải × 3 kênh, đã triệt màu TB + tương phản toàn ảnh
  const mean = [0, 0, 0], n = w * h;
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) mean[c] += rgb[i * 3 + c];
  for (let c = 0; c < 3; c++) mean[c] /= n;
  let v = 0; for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) v += (rgb[i * 3 + c] - mean[c]) ** 2;
  const sd = Math.sqrt(v / (n * 3)) || 1, out = [];
  for (let z = 0; z < 3; z++) {
    const y0 = Math.floor(z * h / 3), y1 = Math.floor((z + 1) * h / 3), s = [0, 0, 0]; let k = 0;
    for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { for (let c = 0; c < 3; c++) s[c] += rgb[(y * w + x) * 3 + c]; k++; }
    for (let c = 0; c < 3; c++) out.push((s[c] / k - mean[c]) / sd);
  }
  return out;
}
const phanTich = (a, w, h) => {
  const { g, rgb } = chuanHoa(a, w, h), gb = boxBlur(g, w, h, 1), s = noiBatMap(g, w, h);
  return { sangG: luoi(gb, w, h), sG: luoi(s, w, h), th: chuThe(s, w, h), mau: rgb ? mauDai(rgb, w, h) : null };
};

const coThe = (t) => Math.sqrt(t.dt * t.trai * t.trai);   // cỡ chủ thể: trung bình nhân diện tích vùng nổi bật và độ trải²

/** Điểm khớp bố cục giữa hai ảnh (xám w*h hoặc RGB/RGBA w*h*3|4). → {diem, thanhPhan:{sang,noiBat,trongTam,dienTich,mau?}} */
export function diemKhop(a, b, w, h) {
  const A = phanTich(a, w, h), B = phanTich(b, w, h);
  const tp = {
    sang: clamp01(pearson(A.sangG, B.sangG)),
    noiBat: clamp01(pearson(A.sG, B.sG)),
    trongTam: clamp01(1 - Math.hypot(A.th.cx - B.th.cx, A.th.cy - B.th.cy) / 0.35),
    dienTich: clamp01(Math.exp(-0.7 * Math.abs(Math.log(coThe(A.th) / coThe(B.th))) / Math.LN2)),
  };
  if (A.mau && B.mau) {
    let s = 0; for (let i = 0; i < 9; i++) s += (A.mau[i] - B.mau[i]) ** 2;
    tp.mau = clamp01(Math.exp(-Math.sqrt(s / 9) / 0.8));
  }
  let tong = 0, ws = 0;
  for (const k of Object.keys(tp)) { tong += TRONG_SO[k] * tp[k]; ws += TRONG_SO[k]; }
  for (const k of Object.keys(tp)) tp[k] = +tp[k].toFixed(3);
  return { diem: +(tong / ws).toFixed(3), thanhPhan: tp };
}

/** Cỡ chủ thể đổi thế nào từ ảnh đầu → ảnh cuối (cùng một nguồn). → {tiSo, huong:'vao'|'ra'|'giu'} */
export function huongThayDoi(dau, cuoi, w, h, nguong = 1.15) {
  const co = (a) => Math.log(coThe(phanTich(a, w, h).th));
  const tiSo = Math.exp(co(cuoi) - co(dau));
  return { tiSo: +tiSo.toFixed(3), huong: tiSo > nguong ? 'vao' : tiSo < 1 / nguong ? 'ra' : 'giu' };
}

export function trangThai(diem, ng = NGUONG) { return diem >= ng.dat ? 'dat' : diem >= ng.lech ? 'lech' : 'hong'; }
const THU_TU = { dat: 0, lech: 1, hong: 2 };
const VI = { 1: ['dau'], 2: ['dau', 'cuoi'], 3: ['dau', 'giua', 'cuoi'] };

// ---------- ảnh (sharp) ----------
async function docRGB(file) {
  const sharp = (await import('sharp')).default;
  const { data } = await sharp(file).removeAlpha().resize(W, H, { fit: 'cover' }).raw().toBuffer({ resolveWithObject: true });
  return data;
}
async function luuThu(src, dst) {
  const sharp = (await import('sharp')).default;
  await sharp(src).resize(270, 480, { fit: 'cover' }).png().toFile(dst);
}

// ---------- chạy ----------
const FPS = 30;
async function thoiDiemShot(trang) {   // t0,t1 từng shot = cộng dồn dur trong shots.js cạnh trang
  const f = join(dirname(resolve(trang)), 'shots.js');
  const m = await import(pathToFileURL(f).href);
  const out = {}; let t = 0;
  for (const s of m.SHOTS) { out[s.id] = { t0: t, t1: t + s.dur }; t += s.dur; }
  return out;
}

async function main() {
  const args = process.argv.slice(2), pos = [], opt = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dung-lai') opt.dungLai = true;
    else if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
    else pos.push(args[i]);
  }
  if (pos.length < 2) { console.error('Dùng: node tools/khop-storyboard.mjs <trang index.html> <kich-ban/<ep>> [--shots all|s001,…] [--out dir]'); process.exit(2); }
  const trang = pos[0], kb = resolve(pos[1]);
  const ng = { dat: +(opt['nguong-dat'] ?? NGUONG.dat), lech: +(opt['nguong-lech'] ?? NGUONG.lech) };
  const bang = JSON.parse(await readFile(join(kb, 'bang-shot.json'), 'utf8'));
  const ep = bang.ep || kb.split(/[\\/]/).pop();
  const out = resolve(opt.out || join('output', 'khop', ep));
  await mkdir(out, { recursive: true });
  const muon = !opt.shots || opt.shots === 'all' ? bang.shots.map((s) => s.id) : opt.shots.split(',');
  const shots = muon.map((id) => bang.shots.find((s) => s.id === id)).filter(Boolean);
  const tgian = await thoiDiemShot(trang);

  // 1. kế hoạch chụp
  const ke = [];   // {id, vi, t}
  for (const s of shots) {
    const tt = tgian[s.id]; if (!tt) continue;
    const dv = VI[s.hinh] || VI[1];
    const tu = { dau: Math.ceil((tt.t0 + 1 / FPS) * 100) / 100, cuoi: Math.floor((tt.t1 - 1 / FPS) * 100) / 100, giua: Math.round((tt.t0 + tt.t1) * 50) / 100 };
    for (const vi of dv) ke.push({ id: s.id, vi, t: tu[vi] });
  }
  const can = ke.filter((k) => !(opt.dungLai && existsSync(join(out, `${k.id}_${k.vi}.png`))));
  const tChup = Date.now();
  if (can.length) {
    const tmp = join(out, '_chup');
    await rm(tmp, { recursive: true, force: true });
    const ts = [...new Set(can.map((k) => k.t))].sort((a, b) => a - b);
    const r = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'look.mjs'), trang, '--t', ts.join(','), '--out', tmp, '--sheet', join(tmp, 'sheet.jpg'), '--jobs', '4'],
      { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 1 << 28 });
    if (r.status && !existsSync(tmp)) { console.error(r.stderr || r.stdout); process.exit(2); }
    const files = (await readdir(tmp)).filter((f) => /^t[\d.]+_?.*\.png$/.test(f) && !/_(diff|det-lai|B)\.png$/.test(f));
    for (const k of can) {
      const tag = `t${k.t.toFixed(2).padStart(7, '0')}`;
      const f = files.find((x) => x.startsWith(tag + '_') || x === tag + '.png');
      if (!f) { k.loi = 'không chụp được khung'; continue; }
      const idThat = (f.match(/^t[\d.]+_(.+)\.png$/) || [])[1];
      if (idThat && idThat !== k.id) k.loi = `thời điểm ${k.t}s rơi vào shot ${idThat}, không phải ${k.id} (shots.js lệch trang?)`;
      await luuThu(join(tmp, f), join(out, `${k.id}_${k.vi}.png`));
    }
    await rm(tmp, { recursive: true, force: true });
  }
  const giayChup = (Date.now() - tChup) / 1000;

  // 2. chấm
  const kq = {}, dem = { dat: 0, lech: 0, hong: 0, thieu: 0 };
  const tCham = Date.now();
  for (const s of shots) {
    const dv = VI[s.hinh] || VI[1], ghi = [];
    if (!tgian[s.id]) { kq[s.id] = { tt: 'thieu', diem: null, cap: [], nguocHuong: false, ghiChu: 'shot không có trong shots.js của tập' }; dem.thieu++; continue; }
    const sbFile = (vi) => join(kb, 'hinh', `shot_${s.id}_${vi}.png`);
    const thieuHinh = dv.filter((vi) => !existsSync(sbFile(vi)));
    const thieuKhung = dv.filter((vi) => !existsSync(join(out, `${s.id}_${vi}.png`)));
    if (thieuHinh.length || thieuKhung.length) {
      kq[s.id] = { tt: 'thieu', diem: null, cap: [], nguocHuong: false, ghiChu: [thieuHinh.length && 'thiếu hình storyboard: ' + thieuHinh.join(','), thieuKhung.length && 'thiếu khung dựng: ' + thieuKhung.join(',')].filter(Boolean).join('; ') };
      dem.thieu++; continue;
    }
    const cap = [], dung = {}, sb = {};
    for (const vi of dv) {
      dung[vi] = await docRGB(join(out, `${s.id}_${vi}.png`)); sb[vi] = await docRGB(sbFile(vi));
      const r = diemKhop(dung[vi], sb[vi], W, H);
      cap.push({ vi, diem: r.diem, thanhPhan: r.thanhPhan });
    }
    for (const k of ke.filter((x) => x.id === s.id && x.loi)) ghi.push(k.loi);
    const diem = +(cap.reduce((a, c) => a + c.diem, 0) / cap.length).toFixed(3);
    let tt = trangThai(diem, ng), nguocHuong = false;
    if (dv.length >= 2) {
      const hs = huongThayDoi(sb.dau, sb.cuoi, W, H), hd = huongThayDoi(dung.dau, dung.cuoi, W, H);
      nguocHuong = hs.huong !== 'giu' && hd.huong !== 'giu' && hs.huong !== hd.huong;
      ghi.push(`cỡ chủ thể đầu→cuối: storyboard ${hs.huong} (×${hs.tiSo}), dựng ${hd.huong} (×${hd.tiSo})`);
      if (nguocHuong && THU_TU[tt] < THU_TU.lech) tt = 'lech';
      if (nguocHuong) ghi.push('NGƯỢC HƯỚNG zoom so với storyboard');
    }
    kq[s.id] = { tt, diem, cap, nguocHuong, ghiChu: ghi.join('; ') };
    dem[tt]++;
  }
  const giayCham = (Date.now() - tCham) / 1000;
  await writeFile(join(kb, 'khop.json'), JSON.stringify({ luc: new Date().toISOString(), nguong: ng, shots: kq }, null, 2));

  // 3. in bảng
  console.log(`Khớp storyboard — ${ep} (${shots.length} shot)  ngưỡng đạt ≥${ng.dat}, lệch ≥${ng.lech}`);
  for (const [id, r] of Object.entries(kq)) {
    console.log(`  ${id.padEnd(6)} ${r.tt.padEnd(5)} ${r.diem == null ? '  —  ' : r.diem.toFixed(2)}  ${r.cap.map((c) => `${c.vi}:${c.diem.toFixed(2)}`).join(' ')}${r.nguocHuong ? '  ⚠ngược' : ''}${r.tt === 'thieu' ? '  ' + r.ghiChu : ''}`);
  }
  console.log(`Tổng: đạt ${dem.dat} · lệch ${dem.lech} · hỏng ${dem.hong} · thiếu ${dem.thieu}`);
  console.log(`Thời gian: chụp ${giayChup.toFixed(1)}s (${ke.length} khung), chấm ${giayCham.toFixed(1)}s → ${(shots.length ? (giayChup + giayCham) / shots.length : 0).toFixed(1)}s/shot · ${relative(process.cwd(), join(kb, 'khop.json'))}`);
  process.exit(dem.hong ? 1 : 0);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
