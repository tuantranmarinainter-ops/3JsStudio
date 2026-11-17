#!/usr/bin/env node
// danh-muc.mjs — DANH MỤC TÊN HỢP LỆ (sinh tự động từ mã) + lệnh kiểm tên trong shot.
//   node tools/danh-muc.mjs                 → sinh docs/danh-muc.md (loại shot, clip, động tác chồng lớp, mặt, env, bfx, cam.bk, ô FX)
//   node tools/danh-muc.mjs kiem <ep> [--strict] [--json]
//        quét episodes/<ep>/episode.js + shots*.js, báo mỗi tên KHÔNG có trong danh mục:
//        `file:dòng  loại  'tên'  (gợi ý gần nhất: …)`. Mã thoát 0 (chỉ cảnh báo); --strict → 1 nếu có cảnh báo.
// Vì sao: engine lặng lẽ rơi về mặc định khi gặp tên lạ (clip, mặt, env, kiểu máy…) nên agent bịa tên mà không ai báo.
// Đọc mã bằng PHÂN TÍCH TĨNH (engine/r15.js, post.js… kéo three/DOM nên không import được trong Node); riêng shottypes.js
// (thuần) thì import để lấy khoá thật, lệch với bản tĩnh thì in cảnh báo. Không mở Chrome. Chỉ đọc engine/, không sửa.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ex = (f) => fs.existsSync(path.join(ROOT, f));

// ---------------------------------------------------------------- phân tích tĩnh nhỏ
/** Thay chú thích bằng khoảng trắng (giữ nguyên độ dài + xuống dòng → vị trí/dòng không lệch). Chuỗi giữ nguyên. */
export function boChuThich(s) {
  let o = '', i = 0; const n = s.length;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '/') { while (i < n && s[i] !== '\n') { o += ' '; i++; } continue; }
    if (c === '/' && d === '*') { while (i < n && !(s[i] === '*' && s[i + 1] === '/')) { o += s[i] === '\n' ? '\n' : ' '; i++; } o += '  '; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { const q = c; o += c; i++; while (i < n && s[i] !== q) { if (s[i] === '\\') { o += s[i++]; } o += s[i++]; } o += q; i++; continue; }
    o += c; i++;
  }
  return o;
}

/** Từ vị trí `open` (ký tự { [ hoặc () trả vị trí đóng tương ứng (bỏ qua chuỗi). -1 nếu không tìm thấy. */
export function dongNgoac(s, open) {
  const O = s[open], C = { '{': '}', '[': ']', '(': ')' }[O]; let d = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < s.length && s[i] !== q) { if (s[i] === '\\') i++; i++; } continue; }
    if (c === O) d++; else if (c === C) { d--; if (!d) return i; }
  }
  return -1;
}

/** Các khoá cấp 1 của một object literal bắt đầu ở `open` (ký tự {). Trả [{ key, pos }]. */
export function khoaCap1(s, open) {
  const end = dongNgoac(s, open), out = []; if (end < 0) return out;
  let d = 0, expect = false;
  for (let i = open; i <= end; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c, st = i; i++; while (i < s.length && s[i] !== q) { if (s[i] === '\\') i++; i++; }
      if (d === 1 && expect && q !== '`') { let j = i + 1; while (/\s/.test(s[j])) j++; if (s[j] === ':' || s[j] === '(') out.push({ key: s.slice(st + 1, i), pos: st }); }
      expect = false; continue;
    }
    if (c === '{' || c === '[' || c === '(') { d++; if (d === 1) expect = true; else expect = false; continue; }
    if (c === '}' || c === ']' || c === ')') { d--; continue; }
    if (d === 1) {
      if (c === ',') { expect = true; continue; }
      if (expect && /[A-Za-z_$]/.test(c)) {
        let j = i; while (/[\w$]/.test(s[j])) j++;
        let k = j; while (/\s/.test(s[k])) k++;
        if (s[k] === ':' || s[k] === '(' || s[k] === ',' || s[k] === '}') out.push({ key: s.slice(i, j), pos: i });
        i = j - 1; expect = false; continue;
      }
      if (expect && c === '.') { expect = false; continue; }   // ...spread
      if (expect && /\d/.test(c)) { let j = i; while (/[\w.]/.test(s[j])) j++; out.push({ key: s.slice(i, j), pos: i }); i = j - 1; expect = false; continue; }
      if (!/\s/.test(c)) expect = false;
    }
  }
  return out;
}

/** Khoá cấp 1 của `NAME = {` (const / export const / thuộc tính) trong file. */
export function khoaCua(file, name) {
  const s = boChuThich(rd(file));
  const m = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*\\{`).exec(s) || new RegExp(`\\b${name}\\s*[:=]\\s*\\{`).exec(s);
  if (!m) return [];
  return khoaCap1(s, m.index + m[0].length - 1).map((k) => k.key);
}
/** Các chuỗi trong mảng `NAME = ['a','b']`. */
export function mangCua(file, name) {
  const s = boChuThich(rd(file));
  const m = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*\\[`).exec(s); if (!m) return [];
  const a = m.index + m[0].length - 1, e = dongNgoac(s, a);
  return [...s.slice(a, e).matchAll(/'([^']+)'|"([^"]+)"/g)].map((x) => x[1] ?? x[2]);
}
const uniq = (a) => [...new Set(a)];

// ---------------------------------------------------------------- dựng danh mục
export async function taoDanhMuc() {
  const dm = { nhom: {}, canhBao: [] };
  const them = (id, o) => { dm.nhom[id] = { ten: id, nguon: '', ten_vn: '', ds: [], ghiChu: '', ...o, ds: uniq(o.ds || []) }; };

  // 1. loại shot — import thật nếu được
  const docLoai = {};
  { const s = boChuThich(rd('engine/shottypes.js')); const m = /export const SHOT_TYPES\s*=\s*\{/.exec(s);
    let ds = [];
    if (m) for (const k of khoaCap1(s, m.index + m[0].length - 1)) {
      ds.push(k.key);
      const b = s.indexOf('{', k.pos), e = dongNgoac(s, b), body = rd('engine/shottypes.js').slice(b, e);
      const d = /doc:\s*'((?:[^'\\]|\\.)*)'/.exec(body); if (d) docLoai[k.key] = d[1];
    }
    try { const M = await import(pathToFileURL(path.join(ROOT, 'engine/shottypes.js')).href); const th = Object.keys(M.SHOT_TYPES);
      if (th.slice().sort().join() !== ds.slice().sort().join()) dm.canhBao.push('loại shot: bản tĩnh lệch bản import → dùng bản import'); ds = th;
    } catch { /* module không import được → dùng bản tĩnh */ }
    them('loaiShot', { ten_vn: 'Loại shot (`type:`)', nguon: 'engine/shottypes.js · SHOT_TYPES', ds, doc: docLoai });
  }
  // move cấp shot (không phải bk): các chữ so sánh trong applyMove
  { const s = rd('engine/shottypes.js'); const m = /function applyMove[\s\S]*?\n}\n/.exec(s);
    them('moveShot', { ten_vn: 'Chuyển động máy cấp shot (`move:` hoặc `cam.move`)', nguon: 'engine/shottypes.js · applyMove', ds: ['static', ...[...(m ? m[0] : '').matchAll(/m === '(\w+)'/g)].map((x) => x[1])], ghiChu: 'ghép được: `push+pan`' }); }

  // 2. clip / động tác R6 (nhân vật R6 dùng bảng R15_ANIMATIONS dùng chung + bảng riêng R6)
  { const ds = [];
    const nguon = [];
    for (const [f, n, pre] of [['engine/r6.js', 'R6_ANIMATIONS', ''], ['engine/r15.js', 'R15_ANIMATIONS', ''], ['engine/anim-them.js', 'ANIM_THEM', ''], ['engine/anim-nch.js', 'NCH', 'nch_']]) {
      if (!ex(f)) continue; const k = khoaCua(f, n); ds.push(...k.map((x) => pre + x)); nguon.push(`${f} · ${n}${pre ? ` (tiền tố \`${pre}\`)` : ''}`);
    }
    { const g = ['engine/bear.js:BEAR_ANIMATIONS'].flatMap((x) => { const [f, n] = x.split(':'); return khoaCua(f, n); }); ds.push(...g); nguon.push('engine/bear.js · BEAR_ANIMATIONS (gấu bông)');
      for (const f of fs.readdirSync(path.join(ROOT, 'engine')).filter((x) => x.endsWith('.js'))) for (const m of rd('engine/' + f).matchAll(/\b(?:R15|R6|BEAR)_ANIMATIONS\.(\w+)\s*=[^=]/g)) ds.push(m[1]); }
    const dir = path.join(ROOT, 'assets/nhap/anims');
    if (fs.existsSync(dir)) { const r = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => 'rbx_' + f.replace(/\.json$/, '')); ds.push(...r); nguon.push(`assets/nhap/anims/*.json (tiền tố \`rbx_\`, ${r.length} clip Roblox)`); }
    them('clip', { ten_vn: 'Clip / động tác nền (`anim:`, `withAnim:`)', nguon: nguon.join(' + '), ds });
  }
  // 3. động tác chồng lớp
  them('hanhDong', { ten_vn: 'Động tác chồng lớp (`do: [{ a: … }]`)', nguon: 'engine/blocky/poses.js · ACTIONS', ds: khoaCua('engine/blocky/poses.js', 'ACTIONS'),
    ghiChu: 'tham số theo từng động tác (arm, dir, times, rate…) xem poses.js; `t: [bắt đầu, kết thúc]` giây từ đầu shot' });
  // 4. mặt
  { const ga = [...rd('engine/r15.js').matchAll(/\[\d+,\s*'(\w+)'\]/g)].map((x) => x[1]);
    const map = khoaCua('engine/r15.js', 'GA_FACE_MAP'), alias = ex('engine/cast.js') ? khoaCua('engine/cast.js', 'FACE_ALIAS') : [], r6 = mangCua('engine/r6.js', 'R6_FACES');
    them('mat', { ten_vn: 'Mặt / biểu cảm (`face:`, `withFace:`, `mat: [[t,tên]]`)', nguon: 'engine/r15.js · GA_FACES + GA_FACE_MAP, engine/cast.js · FACE_ALIAS, engine/r6.js · R6_FACES',
      ds: [...ga, ...map, ...alias, ...r6], ghiChu: 'có thể thêm hậu tố `~open` (miệng mở); ảnh mặt thật = 37 tên GA_FACES (bộ altiwyre / emote37 cùng tên)' });
    dm.matChinh = ga;
  }
  // 5. bối cảnh
  { const envs = [...rd('engine/envs.js').matchAll(/\bdef\(\s*'([\w-]+)'/g)].map((x) => x[1]);
    const KHONG = new Set(['cong-thuc', 'goc-mau', 'tang', 'gio-thoi-tiet']);   // file phụ trợ, không phải env
    const file = fs.readdirSync(path.join(ROOT, 'engine/envs')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).filter((n) => !KHONG.has(n));
    // env đặt tên dạng 'kenneyTown'… là thị trấn Kenney dựng từ episode.town (engine/town.js) — xem ghi chú
    them('env', { ten_vn: 'Bối cảnh (`env:`)', nguon: 'engine/envs.js · def(…) + engine/envs/*.js (nạp theo tên file)', ds: [...envs, ...file, 'kenneyTown'],
      ghiChu: '`kenneyTown` = thị trấn Kenney theo `episode.town`; tên file engine/envs/<tên>.js nạp được bằng `envs.define`' });
  }
  // 6. bfx
  { const lp = rd('engine/blocky/lop-phu.js'), may = rd('engine/blocky/may.js');
    const hieuUng = uniq([...lp.matchAll(/\bf\.(\w+)\)/g)].map((x) => x[1]));   // f.sign) f.stamp) …
    const kieu = ['sign', 'stamp', 'icon', 'bulb', 'sparkle', 'glint', 'burst', 'say', 'title', 'flash'].filter((k) => hieuUng.includes(k) || new RegExp(`f\\.${k}\\b`).test(lp));
    const tham = uniq([...lp.matchAll(/\bf\.(\w+)/g)].map((x) => x[1]).concat([...may.matchAll(/\bf\.(\w+)/g)].map((x) => x[1])));
    const mayFx = uniq([...may.matchAll(/\bf\.(punch|shake)\b/g)].map((x) => x[1]));
    them('bfx', { ten_vn: 'Hiệu ứng đồ hoạ shot (`bfx: [{ t, … }]`) — kiểu', nguon: 'engine/blocky/lop-phu.js (veHieuUng) + engine/blocky/may.js (punch, shake)', ds: [...kieu, ...mayFx] });
    them('bfxThamSo', { ten_vn: 'Khoá phụ của một hiệu ứng bfx', nguon: 'engine/blocky/lop-phu.js · may.js', ds: ['t', ...tham] });
    them('icon', { ten_vn: 'Biểu tượng nổi (`bfx: { icon: … }`, `sign.icon`)', nguon: 'engine/blocky/overlays.js · ICONS', ds: mangCua('engine/blocky/overlays.js', 'ICONS') });
    them('tieuDe', { ten_vn: 'Kiểu thẻ tiêu đề (`bfx: { title, style }`)', nguon: 'engine/blocky/lop-phu.js', ds: ['card', 'banner'] });
  }
  // 7. cam.bk
  { const m = boChuThich(rd('engine/blocky/may.js'));
    const dyI = m.indexOf('const dy = {'), dyS = dyI >= 0 ? m.slice(dyI, m.indexOf('}', dyI)) : '';
    const bkKeys = uniq([...m.matchAll(/\b(?:spec|bk)\.(\w+)/g)].map((x) => x[1]));
    const sub = uniq([...m.matchAll(/\b(?:w|c)\.(\w+)/g)].map((x) => x[1]));
    let co = khoaCua('engine/blocky/may.js', 'CO').concat(khoaCua('engine/blocky/may.js', 'VN')), easeK = khoaCua('engine/blocky/may.js', 'E');
    try { const M = await import(pathToFileURL(path.join(ROOT, 'engine/blocky/may.js')).href); const th = [...Object.keys(M.CO), ...Object.keys(M.VN)];   // may.js thuần → khoá thật
      if (th.slice().sort().join() !== co.slice().sort().join()) dm.canhBao.push('bk.co: bản tĩnh lệch bản import → dùng bản import'); co = th; easeK = Object.keys(M.E); } catch { /* dùng bản tĩnh */ }
    them('bkKhoa', { ten_vn: 'Khoá của `cam.bk`', nguon: 'engine/blocky/may.js · frameShot / applyMove / mayBlocky', ds: [...bkKeys, 'whip', 'crash'] });
    them('bkSub', { ten_vn: 'Khoá con của `whip` / `crash`', nguon: 'engine/blocky/may.js · mayBlocky', ds: sub });
    them('bkMove', { ten_vn: '`bk.move`', nguon: 'engine/blocky/may.js · AMT', ds: khoaCua('engine/blocky/may.js', 'AMT') });
    them('bkCo', { ten_vn: '`bk.co` và `co:` cấp shot (cỡ cảnh; một bảng dùng chung)', nguon: 'engine/blocky/may.js · CO + VN (co-canh.js dùng lại)', ds: co });
    them('bkGoc', { ten_vn: '`bk.goc` (góc máy)', nguon: 'engine/blocky/may.js · frameShot', ds: [...dyS.matchAll(/[{,]\s*(\w+):/g)].map((x) => x[1]).filter((k) => k !== 'dy') });
    them('bkFrom', { ten_vn: '`bk.from` (hướng nhìn; hoặc số độ)', nguon: 'engine/blocky/may.js · FROM', ds: khoaCua('engine/blocky/may.js', 'FROM') });
    them('bkEase', { ten_vn: '`bk.ease`', nguon: 'engine/blocky/may.js · E', ds: easeK });
  }
  // 8. ô FX
  { const s = rd('engine/post.js'), m = /export const FX_DEFAULTS\s*=\s*\{/.exec(s), def = {};
    if (m) { const e = dongNgoac(s, m.index + m[0].length - 1); for (const x of s.slice(m.index + m[0].length, e).matchAll(/(\w+):\s*(true|false)/g)) def[x[1]] = x[2] === 'true'; }
    const lb = {}; { const b = /export const FX_LABELS\s*=\s*\{/.exec(s); if (b) { const open = b.index + b[0].length - 1; const e = dongNgoac(s, open); for (const x of s.slice(open, e).matchAll(/\b(\w+):\s*'((?:[^'\\]|\\.)*)'/g)) lb[x[1]] = x[2]; } }
    them('fx', { ten_vn: 'Ô FX (`fx: { tên: true/false }`)', nguon: 'engine/post.js · FX_DEFAULTS + FX_LABELS', ds: Object.keys(def) });
    const fxShot = uniq(fs.readdirSync(path.join(ROOT, 'engine')).filter((x) => x.endsWith('.js')).flatMap((f) => [...rd('engine/' + f).matchAll(/\bshot\.fx\??\.(\w+)/g)].map((x) => x[1])));
    them('fxShot', { ten_vn: 'Hiệu ứng của MỘT shot (`fx: { cards|dust: … }` trong shots*.js) — khác ô FX bật/tắt cả tập', nguon: 'engine/shots.js · shot.fx.<tên>', ds: fxShot });
    dm.fxMacDinh = def; dm.fxNhan = lb;
  }
  return dm;
}

// ---------------------------------------------------------------- sinh docs/danh-muc.md
export function viMd(dm) {
  const L = [];
  const dsMd = (g) => g.ds.map((x) => '`' + x + '`').join(' · ');
  L.push('# Danh mục tên hợp lệ', '',
    '> **File sinh tự động, đừng sửa tay.** Sinh bởi `node tools/danh-muc.mjs` từ mã trong `engine/` (đổi mã → chạy lại lệnh).',
    '> Kiểm một tập có dùng tên lạ không: `node tools/danh-muc.mjs kiem <ep>` (cũng nằm trong `node tools/doctor.mjs <ep>`, mục 13).',
    '> Engine KHÔNG báo lỗi khi gặp tên lạ — nó lặng lẽ rơi về mặc định. Chỉ dùng tên có ở đây.', '');
  const muc = (tieu, ids, f) => { L.push(`## ${tieu}`, ''); for (const id of ids) { const g = dm.nhom[id]; L.push(`### ${g.ten_vn} — ${g.ds.length} tên`, '', `Nguồn: ${g.nguon}`, ''); if (f) f(g); else L.push(dsMd(g), ''); if (g.ghiChu) L.push(`_${g.ghiChu}_`, ''); } };
  muc('A. Shot', ['loaiShot', 'moveShot'], (g) => { if (g.doc) { for (const k of g.ds) L.push(`- \`${k}\`${g.doc[k] ? ' — ' + g.doc[k] : ''}`); L.push(''); } else L.push(dsMd(g), ''); });
  muc('B. Nhân vật (R6)', ['clip', 'hanhDong', 'mat']);
  muc('C. Bối cảnh', ['env']);
  muc('D. Đồ hoạ shot (`bfx`, `fx` của shot)', ['bfx', 'bfxThamSo', 'icon', 'tieuDe', 'fxShot']);
  muc('E. Máy quay blocky (`cam.bk`)', ['bkKhoa', 'bkSub', 'bkMove', 'bkCo', 'bkGoc', 'bkFrom', 'bkEase']);
  L.push('## F. Ô FX (`fx:`) — bật/tắt trong trình phát', '', `Nguồn: ${dm.nhom.fx.nguon}`, '', '| Ô | Mặc định | Mô tả |', '|---|---|---|');
  for (const k of dm.nhom.fx.ds) L.push(`| \`${k}\` | ${dm.fxMacDinh[k] ? 'bật' : 'tắt'} | ${(dm.fxNhan[k] || '').replace(/\|/g, '/')} |`);
  L.push('');
  return L.join('\n');
}

// ---------------------------------------------------------------- kiểm tên
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length]; };
export function goiY(ten, ds, n = 3) {
  const t = String(ten).toLowerCase();
  return ds.map((x) => ({ x, d: x.toLowerCase().includes(t) || t.includes(x.toLowerCase()) ? 0.5 : lev(t, x.toLowerCase()) }))
    .filter((o) => o.d <= Math.max(3, Math.floor(t.length / 2))).sort((a, b) => a.d - b.d).slice(0, n).map((o) => o.x);
}

/** Quét một nguồn shot/episode. Trả [{ file, dong, loai, ten, goiY }]. */
export function kiemNguon(src, file, dm) {
  const s = boChuThich(src);
  const lineOf = (pos) => s.slice(0, pos).split('\n').length;
  const out = [], tap = (id) => new Set(dm.nhom[id].ds);
  const bao = (pos, loai, ten, ds) => out.push({ file, dong: lineOf(pos), loai, ten, goiY: goiY(ten, ds) });
  const che = [];                       // vùng đã xử lý riêng (bk / bfx / fx / do / mat) để luật chung không bắt nhầm
  const trong = (pos) => che.some(([a, b]) => pos >= a && pos <= b);
  const kiemChuoi = (pos, loai, ten, id, { cho } = {}) => { const T = tap(id); if (!T.has(ten) && !(cho && cho(ten))) bao(pos, loai, ten, dm.nhom[id].ds); };

  // khối `khoá: {` hoặc `khoá: [` → trả [{ open, close }]
  const khoi = (khoa, ngoac) => { const r = [], re = new RegExp(`\\b${khoa}\\s*:\\s*\\${ngoac}`, 'g'); let m; while ((m = re.exec(s))) { const open = m.index + m[0].length - 1, close = dongNgoac(s, open); if (close > 0) r.push({ open, close }); } return r; };

  const matOk = (t) => tap('mat').has(t.split('~')[0]);
  // fx: { ô: bool }
  for (const b of khoi('fx', '{')) { che.push([b.open, b.close]); for (const k of khoaCap1(s, b.open)) kiemChuoi(k.pos, /episode.js$/.test(file) ? 'ô-fx' : 'fx-shot', k.key, /episode.js$/.test(file) ? 'fx' : 'fxShot'); }
  // bk: { … }
  for (const b of khoi('bk', '{')) {
    che.push([b.open, b.close]);
    const doiNhom = { move: 'bkMove', co: 'bkCo', goc: 'bkGoc', from: 'bkFrom', ease: 'bkEase' };
    for (const k of khoaCap1(s, b.open)) {
      kiemChuoi(k.pos, 'bk-khoá', k.key, 'bkKhoa');
      if (doiNhom[k.key]) { const m = /^\s*:\s*'([^']*)'/.exec(s.slice(k.pos + k.key.length)); if (m) kiemChuoi(k.pos, 'bk-' + k.key, m[1], doiNhom[k.key]); }
      if (k.key === 'whip' || k.key === 'crash') { const o = s.indexOf('{', k.pos), c = dongNgoac(s, o);
        if (o > 0 && o < b.close) for (const sk of khoaCap1(s, o)) { kiemChuoi(sk.pos, `bk.${k.key}-khoá`, sk.key, 'bkSub', { cho: (t) => k.key === 'whip' && tap('bkKhoa').has(t) }); if (doiNhom[sk.key]) { const m = /^\s*:\s*'([^']*)'/.exec(s.slice(sk.pos + sk.key.length)); if (m) kiemChuoi(sk.pos, `bk.${k.key}-${sk.key}`, m[1], doiNhom[sk.key]); } } }
    }
  }
  // bfx: [ { … } ]
  for (const b of khoi('bfx', '[')) {
    che.push([b.open, b.close]);
    const body = s.slice(b.open, b.close); let d = 0;
    for (let i = 0; i < body.length; i++) {
      const c = body[i];
      if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < body.length && body[i] !== q) { if (body[i] === '\\') i++; i++; } continue; }
      if (c === '{' || c === '[' || c === '(') { d++; if (c === '{' && d === 2) for (const k of khoaCap1(body, i)) kiemChuoi(b.open + k.pos, 'bfx-khoá', k.key, 'bfxThamSo', { cho: (t) => tap('bfx').has(t) }); continue; }
      if (c === '}' || c === ']' || c === ')') d--;
    }
    for (const m of body.matchAll(/\bicon\s*:\s*'([^']*)'/g)) kiemChuoi(b.open + m.index, 'bfx-icon', m[1], 'icon');
    for (const m of body.matchAll(/\bstyle\s*:\s*'([^']*)'/g)) kiemChuoi(b.open + m.index, 'bfx-title-style', m[1], 'tieuDe');
  }
  // do: [{ a: 'tên' }]
  for (const b of khoi('do', '[')) { che.push([b.open, b.close]); for (const m of s.slice(b.open, b.close).matchAll(/\ba\s*:\s*'([^']*)'/g)) kiemChuoi(b.open + m.index, 'động-tác', m[1], 'hanhDong'); }
  // mat: [[t,'tên'],…]
  for (const b of khoi('mat', '[')) { che.push([b.open, b.close]); for (const m of s.slice(b.open, b.close).matchAll(/'([^']*)'/g)) kiemChuoi(b.open + m.index, 'mặt', m[1], 'mat', { cho: matOk }); }

  const re = (khoa, f) => { for (const m of s.matchAll(new RegExp(`\\b${khoa}\\s*:\\s*(?:'([^']*)'|"([^"]*)")`, 'g'))) { if (trong(m.index)) continue; f(m.index, m[1] ?? m[2]); } };
  re('type', (p, t) => kiemChuoi(p, 'loại-shot', t, 'loaiShot'));
  re('anim', (p, t) => kiemChuoi(p, 'clip', t, 'clip'));
  re('withAnim', (p, t) => kiemChuoi(p, 'clip', t, 'clip'));
  re('face', (p, t) => kiemChuoi(p, 'mặt', t, 'mat', { cho: matOk }));
  re('withFace', (p, t) => kiemChuoi(p, 'mặt', t, 'mat', { cho: matOk }));
  re('env', (p, t) => kiemChuoi(p, 'bối-cảnh', t, 'env'));
  re('co', (p, t) => kiemChuoi(p, 'cỡ-cảnh', t, 'bkCo'));
  return out;
}

export async function kiemTap(ep, dm = null) {
  dm ||= await taoDanhMuc();
  const dir = path.join(ROOT, 'episodes', ep);
  if (!fs.existsSync(dir)) throw new Error(`không có episodes/${ep}`);
  const files = fs.readdirSync(dir).filter((f) => f === 'episode.js' || /^shots.*\.js$/.test(f)).sort();
  const out = [];
  for (const f of files) out.push(...kiemNguon(fs.readFileSync(path.join(dir, f), 'utf8'), `episodes/${ep}/${f}`, dm));
  return { files, ketQua: out };
}
export const inCanhBao = (r) => `${r.file}:${r.dong}  ${r.loai}  '${r.ten}'` + (r.goiY.length ? `  (gợi ý gần nhất: ${r.goiY.join(', ')})` : '');

// ---------------------------------------------------------------- CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), strict = a.includes('--strict'), json = a.includes('--json'), pos = a.filter((x) => !x.startsWith('--'));
  const dm = await taoDanhMuc();
  if (pos[0] === 'kiem') {
    const ep = pos[1]; if (!ep) { console.error('Cách dùng: node tools/danh-muc.mjs kiem <ep> [--strict] [--json]'); process.exit(2); }
    const { files, ketQua } = await kiemTap(ep, dm);
    if (json) console.log(JSON.stringify(ketQua, null, 1));
    else { for (const r of ketQua) console.log(inCanhBao(r)); console.log(`\n${ep}: quét ${files.length} file (${files.join(', ')}) · ${ketQua.length} cảnh báo tên lạ`); }
    process.exit(strict && ketQua.length ? 1 : 0);
  }
  const out = path.join(ROOT, 'docs/danh-muc.md');
  fs.writeFileSync(out, viMd(dm));
  for (const w of dm.canhBao) console.warn('⚠', w);
  console.log(`đã ghi docs/danh-muc.md — ${Object.keys(dm.nhom).length} nhóm: ` + Object.values(dm.nhom).map((g) => `${g.ten.replace(/\s.*/, '')}=${g.ds.length}`).join(' '));
}
