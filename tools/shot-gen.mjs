#!/usr/bin/env node
// shot-gen: kịch bản (episodes/<ep>/kich-ban.md) -> shots.js đã áp luật camera dồn dập.
//
//   node tools/shot-gen.mjs <ep> [--force] [--khop-giong]
//
// 1. gọi `python tools/storyboard.py episodes/<ep> <ep> --force` (dựng cơ bản: episode.js, shots.js, narration.txt, ...)
// 2. đọc lại kịch bản bằng tools/kb/kichban.py --json và hậu xử lý shots.js (mỗi shot 1 dòng, giữ `id` của kịch bản):
//    - loại shot lấy từ cột `loại` (kể cả 5 loại mới: insertRead, houseFull, hug, fall, sinkTilt); `vật cần đọc` -> insertRead + read;
//      chữ "nhà có chân" trong lời kể/ghi chú/máy quay -> houseFull
//    - luật camera dồn dập: 1 người trong khung -> zoom IN (dist2 < dist); >= 2 người hoặc nhà -> zoom OUT (dist2 > dist);
//      insertRead/houseFull/sinkTilt/reveal và shot ghi "đứng yên" giữ nguyên
//    - time / weather / lookAt (cột `nhìn`) / face / anim ghi ở TỪNG shot (không thừa kế)
//    - dur >= tối thiểu: cột `tối thiểu` hoặc nguong(epDir).L11 theo loại (không ghi cứng)
//    - --khop-giong: co giãn dur theo start/end từng câu của narration.json, không dưới tối thiểu
// Thoát: 0 đạt, 1 lỗi dữ liệu (kịch bản, tập đã có mà thiếu --force, loại shot không dựng được), 2 lỗi môi trường (python, file).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SHOT_TYPE_NAMES, expandShot } from '../engine/shottypes.js';
import { nguong } from './kiem/luat.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HANH_DONG = ['chase', 'fall', 'hug', 'walkBy', 'follow', 'sinkTilt'];   // như tools/kiem/luat.mjs (L11)
const KHONG_DUNG_CAM = new Set(['insertRead', 'houseFull', 'sinkTilt', 'reveal']);   // camera do loại tự quyết

const bo = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
const r3 = (x) => Math.round(x * 1000) / 1000;
const ident = (s) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);
const slug = (s) => bo(s).replace(/\W+/g, '_').replace(/^_+|_+$/g, '');

export function normId(v) {
  const s = String(v).trim();
  const m = /^s?(\d+)(.*)$/i.exec(s);
  if (m) return 's' + m[1].padStart(3, '0') + m[2];      // 12 / 12a / s12a -> s012 / s012a
  return s.startsWith('s') ? s : 's' + s;
}

export function toiThieu(shot, L11) {
  const t = shot.type;
  let san = L11.macDinh;
  if (HANH_DONG.includes(t)) san = L11.hanhDong;
  else if (typeof L11[t] === 'number' && t !== 'hanhDong' && t !== 'macDinh') san = L11[t];
  return typeof shot.min === 'number' ? Math.max(shot.min, san) : san;      // cột `tối thiểu` không thấp hơn sàn L11
}

// cột `nhìn`: tên diễn viên | đạo cụ | nhà | máy quay | "x y z"
const NHIN = { toi: 'hero', be: 'hero', me: 'mom', ba: 'dad', bo: 'dad', 'ba noi': 'grandma', 'ba ngoai': 'grandma', nha: 'house', may: 'cam', 'may quay': 'cam', camera: 'cam' };
export function lookAtOf(raw) {
  const s = String(raw).trim();
  const parts = s.replace(/[[\]()]/g, '').split(/[\s;,]+/).filter(Boolean);
  if (parts.length === 3 && parts.every((p) => Number.isFinite(Number(p)))) return parts.map(Number);
  if (ident(s)) return s;
  return NHIN[bo(s)] ?? slug(s);
}

const CO_CHAN = /nha (co )?(\d+ )?chan|chan (cua )?(ngoi )?nha|house ?legs/;

// ---- đọc / ghi shots.js (mỗi shot 1 dòng) ----
async function docShotsJs(file) {
  const text = fs.readFileSync(file, 'utf8');
  const mod = await import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
  const lines = text.split(/\r?\n/);
  const iStart = lines.findIndex((l) => l.startsWith('export const SHOTS'));
  const rows = lines.slice(iStart + 1).filter((l) => /^ {2}\{/.test(l));
  const notes = rows.map((l) => { const k = l.lastIndexOf('},  // '); return k >= 0 ? l.slice(k + 7) : ''; });
  return { shots: mod.SHOTS, notes, head: lines.slice(0, iStart) };
}

function ghiShotsJs(file, head, shots, notes, ep) {
  const tong = shots.reduce((a, s) => a + s.dur, 0);
  const h = head.slice();
  if (h.length) h[0] = h[0].replace(/\d+ shot, [\d.]+ s/, `${shots.length} shot, ${tong.toFixed(2)} s`);
  const obj = (s) => '{ ' + Object.entries(s).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ') + ' }';
  const rows = shots.map((s, i) => `  ${obj(s)},${notes[i] ? '  // ' + notes[i] : ''}`);
  fs.writeFileSync(file, h.join('\n') + '\nexport const SHOTS = [\n' + rows.join('\n') + '\n];\n', 'utf8');
}

// ---- thời lượng ----
// co/giãn durs về tổng `target`, không shot nào dưới mins (shot chạm sàn thì ghim, phần còn lại chia lại)
export function fit(durs, mins, target) {
  const out = durs.slice(), fixed = new Set();
  for (let it = 0; it <= durs.length; it++) {
    const free = durs.map((_, i) => i).filter((i) => !fixed.has(i));
    if (!free.length) break;
    const sumFixed = [...fixed].reduce((a, i) => a + out[i], 0), sumFree = free.reduce((a, i) => a + durs[i], 0);
    if (!(sumFree > 0)) break;
    const k = (target - sumFixed) / sumFree;
    let again = false;
    for (const i of free) {
      const v = durs[i] * k;
      if (v < mins[i]) { out[i] = mins[i]; fixed.add(i); again = true; } else out[i] = v;
    }
    if (!again) break;
  }
  return out.map(r3);
}

// shots: mảng {dur, line?}; lines: narration.json lines [{start,end}] theo thứ tự câu; total: tổng mục tiêu
export function khopGiong(shots, mins, lines, total) {
  const first = [];
  shots.forEach((s, i) => { if (s.line && first[s.line - 1] === undefined) first[s.line - 1] = i; });
  if (first.length !== lines.length || first.some((x) => x === undefined)) {
    throw new Error(`narration.json có ${lines.length} câu nhưng shots.js có ${first.filter((x) => x !== undefined).length} câu (line)`);
  }
  const cuts = [0, ...first, shots.length];       // nhóm 0 = shot đứng trước câu 1 (nếu có)
  const mocs = [0, ...lines.map((l) => l.start), total];
  const out = shots.map((s) => s.dur);
  let mang = 0;       // khoảng thời gian của nhóm rỗng (vd. câu 1 bắt đầu sau 0 mà không có shot đứng trước) dồn vào nhóm kế tiếp
  for (let g = 0; g + 1 < cuts.length; g++) {
    const a = cuts[g], b = cuts[g + 1];
    const muc = Math.max(0, mocs[g + 1] - mocs[g]);
    if (a >= b) { mang += muc; continue; }
    const seg = fit(shots.slice(a, b).map((s) => s.dur), mins.slice(a, b), muc + mang);
    mang = 0;
    seg.forEach((v, i) => { out[a + i] = v; });
  }
  return out;
}

// ---- hậu xử lý một shot theo kịch bản ----
function ghepKichBan(sh, kb) {
  if (!kb) return sh;
  const o = { ...sh };
  const ty = kb.read ? 'insertRead' : kb.type;
  if (ty && SHOT_TYPE_NAMES.includes(ty)) o.type = ty;
  if (!kb.read && (o.type === 'establish' || !kb.type) && CO_CHAN.test(bo([kb.narration, kb.notes, kb.camera, kb.action].filter((x) => x && x !== '^').join(' ')))) o.type = 'houseFull';
  if (kb.read) o.read = ident(kb.read) ? kb.read : slug(kb.read);
  if (kb.time) o.time = kb.time;
  if (kb.weather) o.weather = kb.weather;
  if (kb.lookAt) o.lookAt = lookAtOf(kb.lookAt);
  const hopLe = (k) => kb[k] && !('_goi_y_' + k in kb);
  if (hopLe('face')) o.face = kb.face;
  if (hopLe('action')) o.anim = kb.action;
  if (hopLe('withAnim')) o.withAnim = kb.withAnim;
  if (hopLe('withFace')) o.withFace = kb.withFace;
  if (typeof kb.min === 'number') o._min = kb.min;
  return o;
}

// luật camera dồn dập: sửa cam.dist2 (chỉ ghi đè khoá cần thiết)
function dungCam(shots, canh, epMeta) {
  const places = {};
  for (const s of shots) if (typeof s.at === 'string') places[s.at] = { pos: [0, 0, 0], ry: 0 };
  places.center ??= { pos: [0, 0, 0], ry: 0 };
  const ctx = { places, crowd: Array.from({ length: 24 }, (_, i) => 'crowd' + (i + 1)), env: epMeta.env, light: epMeta.light, fps: 30 };
  const state = { at: null, actors: {}, env: ctx.env, light: ctx.light };
  const loi = [];
  for (const s of shots) {
    let ex;
    try { ex = expandShot(s, ctx, state); } catch (e) { loi.push(`${s.id}: ${e.message}`); continue; }
    if (KHONG_DUNG_CAM.has(s.type) || ex.static || s.move === 'static' || s.cam?.dist2 !== undefined) continue;
    const cam = ex.cam || {};
    if (typeof cam.dist !== 'number') continue;
    const n = Object.keys(ex.cast || {}).length, coNha = !!ex.house;
    const d2 = typeof cam.dist2 === 'number' ? cam.dist2 : cam.dist;
    if (n === 0 && !coNha) { if (!(d2 < cam.dist)) { s.cam = { ...s.cam, dist2: r3(cam.dist * 0.9) }; canh.in++; } continue; }
    if (n === 1 && !coNha && !(d2 < cam.dist)) { s.cam = { ...s.cam, dist2: r3(cam.dist * 0.75) }; canh.in++; }
    else if ((n >= 2 || coNha) && !(d2 > cam.dist)) { s.cam = { ...s.cam, dist2: r3(cam.dist * 1.3) }; canh.out++; }
  }
  return loi;
}

function capNhatMocNarration(epDir, shots) {
  const f = path.join(epDir, 'narration.txt');
  if (!fs.existsSync(f)) return;
  const t0 = []; let t = 0;
  shots.forEach((s) => { if (s.line && t0[s.line - 1] === undefined) t0[s.line - 1] = t; t += s.dur; });
  let k = 0;
  const out = fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => {
    const m = /^@at\s+[\d.]+\s(.*)$/.exec(l);
    if (!m) return l;
    const at = t0[k++];
    return at === undefined ? l : `@at ${(at + 0.05).toFixed(2)} ${m[1]}`;
  });
  fs.writeFileSync(f, out.join('\n'), 'utf8');
}

function py(args) {
  return spawnSync('python', ['-X', 'utf8', ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, maxBuffer: 64 << 20 });
}

export async function main(argv) {
  const args = argv.filter((a) => !a.startsWith('--'));
  const force = argv.includes('--force'), khop = argv.includes('--khop-giong');
  const ep = args[0];
  if (!ep || !/^[\w-]+$/.test(ep)) { console.error('Dùng: node tools/shot-gen.mjs <ep> [--force] [--khop-giong]'); return 1; }
  const epDir = path.join(ROOT, 'episodes', ep), kbFile = path.join(epDir, 'kich-ban.md'), shotsFile = path.join(epDir, 'shots.js');
  if (!fs.existsSync(kbFile)) { console.error(`Không thấy ${path.relative(ROOT, kbFile)}`); return 1; }
  if (fs.existsSync(shotsFile) && !force) { console.error(`${path.relative(ROOT, shotsFile)} đã có — thêm --force để dựng lại (ghi đè shots.js, narration.txt, episode.js…)`); return 1; }

  const jr = py([path.join('tools', 'kb', 'kichban.py'), kbFile, '--json']);
  if (jr.error || jr.status !== 0) { console.error('kichban.py lỗi: ' + (jr.error?.message || jr.stderr)); return 2; }
  const kb = JSON.parse(jr.stdout);
  if (kb.loi_doc.length) {
    for (const e of kb.loi_doc) console.error(`kich-ban.md:${e.dong}: ${e.ma} ${e.msg}`);
    return 1;
  }
  const kbById = new Map(kb.shots.map((s) => [normId(s.id), s]));
  const canMin = [];

  const sb = py([path.join('tools', 'storyboard.py'), path.relative(ROOT, epDir), ep, '--force']);
  if (sb.error || sb.status !== 0) { console.error('storyboard.py lỗi: ' + (sb.error?.message || sb.stderr || sb.stdout)); return 2; }
  const loc = (sb.stdout.split(/\r?\n/)).filter((l) => !/^\s+! .*loại ".*" không rõ/.test(l));
  console.log(loc.join('\n').trim());

  const { shots: goc, notes, head } = await docShotsJs(shotsFile);
  const khongKb = [];
  const ghep = goc.map((s) => {
    const id = normId(s.id), k = kbById.get(id);
    if (!k) khongKb.push(s.id);
    return ghepKichBan({ ...s, id }, k);
  });
  const canh = { in: 0, out: 0 };
  let meta = {};
  try { meta = (await import(pathToFileURL(path.join(epDir, 'episode.js')).href + '?t=' + Date.now())).EPISODE || {}; } catch { /* không có episode.js */ }
  const loi = dungCam(ghep, canh, meta);

  const L11 = nguong(epDir).L11;
  const mins = ghep.map((s) => toiThieu({ type: s.type, min: s._min }, L11));
  ghep.forEach((s, i) => { if (typeof s._min === 'number' && s._min < mins[i]) canMin.push(`${s.id}: tối thiểu ${s._min} < sàn L11 ${mins[i]} (dùng ${mins[i]})`); });
  let nTang = 0;
  ghep.forEach((s, i) => { if (s.dur < mins[i]) { s.dur = r3(mins[i]); nTang++; } });
  if (khop) {
    const nf = path.join(epDir, 'narration.json');
    if (!fs.existsSync(nf)) { console.error('--khop-giong: chưa có narration.json (tạo giọng trước: tools/tts.py)'); return 1; }
    const nj = JSON.parse(fs.readFileSync(nf, 'utf8'));
    const total = nj.total ?? Math.max(...nj.lines.map((l) => l.end));
    try {
      const nd = khopGiong(ghep, mins, nj.lines, total);
      ghep.forEach((s, i) => { s.dur = nd[i]; });
    } catch (e) { console.error('--khop-giong: ' + e.message); return 1; }
  }
  const ketQua = ghep.map(({ _min, ...s }) => s);
  ghiShotsJs(shotsFile, head, ketQua, notes);
  capNhatMocNarration(epDir, ketQua);

  const tong = ketQua.reduce((a, s) => a + s.dur, 0);
  console.log(`shot-gen ${ep}: ${ketQua.length} shot, ${tong.toFixed(2)} s; camera zoom-in +${canh.in}, zoom-out +${canh.out}; dur nâng lên tối thiểu: ${nTang}${khop ? '; đã khớp giọng' : ''}`);
  for (const l of loi) console.error('  ! ' + l);
  for (const l of canMin) console.error('  ! ' + l);
  if (khongKb.length) console.error(`shot-gen: ${khongKb.length} shot trong shots.js không có dòng kịch bản (mất time/weather/read/lookAt/min): ${khongKb.join(', ')}`);
  return loi.length || khongKb.length ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e); process.exit(2); });
}
