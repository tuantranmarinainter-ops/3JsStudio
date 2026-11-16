#!/usr/bin/env node
// nhap-story-html: file phim "story.html" tải về (quy trình khác, three.js tự viết) → tập mới cho studio.
//   node tools/nhap-story-html.mjs <file.html> --ten ep6B [--out episodes] [--khong-chay]
// KHÔNG chạy file gốc: chỉ ĐỌC CHỮ (regex) khối `const SHOTS = [ … ]` trong script module. Mỗi shot gốc: n, t (giây), say (lời kể, *từ khoá*),
// look (DAY/NIGHT/…/FACTORY), room, type (kiểu camera), act(<nhân vật>, {mood, faces, pose}).
// Các bước:
//   1. đọc 96 shot → bảng storyboard.md (output/<ten>/storyboard/) theo docs/kich-ban-vao.md, nhân vật R6, loại shot theo luật camera dồn dập;
//   2. chạy `python tools/storyboard.py` → episodes/<ten>/{episode.js,shots.js,narration.txt,…};
//   3. sửa diễn viên trong episode.js thành R6 (look có sẵn ở engine/r6-looks.js), ghi episodes/<ten>/<ten>.js (EPISODE+SHOTS+LOI_KE trong 1 file);
//   4. ghi output/<ten-thường>/bao-cao.md: bảng so sánh số shot/lời kể + phần KHÔNG ánh xạ được.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { xuatGoc } from './nhap-story-goc.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--ten' && args[args.indexOf(a) - 1] !== '--out');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const ten = opt('ten', 'ep6B');
const outEp = path.resolve(ROOT, opt('out', 'episodes'));
if (!file) { console.error('Dùng: node tools/nhap-story-html.mjs <file.html> --ten ep6B'); process.exit(1); }
const slug = ten.toLowerCase();
const rep = path.join(ROOT, 'output', slug);
const sbDir = path.join(rep, 'storyboard');
fs.mkdirSync(sbDir, { recursive: true });

// ---------------- 1. đọc dữ liệu (chỉ chữ) ----------------
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const i0 = lines.findIndex((l) => l.startsWith('const SHOTS = ['));
const iEnd = lines.findIndex((l, i) => i > i0 && /^const END = /.test(l));
if (i0 < 0 || iEnd < 0) { console.error('Không thấy "const SHOTS = [" / "const END =" — file không đúng dạng.'); process.exit(2); }
const END = +lines[iEnd].match(/END = ([\d.]+)/)[1];
const SAY = /say: '((?:[^'\\]|\\.)*)'/;
const blocks = lines.slice(i0 + 1, iEnd).join('\n').split(/^ {2}\{ n: /m).slice(1);
const raw = blocks.map((p, i) => {
  const n = +p.match(/^\d+/)[0], t = +p.match(/t: ([\d.]+)/)[1];
  const say = ((p.match(SAY) || [])[1] || '').replace(/\\'/g, "'");
  const cam = (p.match(/type: '([\w+]+)'/) || [])[1] || '';
  const look = (p.match(/look: '(\w+)'/) || [])[1] || 'DAY';
  const room = /room: 1/.test(p);
  // nhân vật theo thứ tự xuất hiện trong mã shot; mặt đầu tiên của từng người
  const acts = []; const faces = {}; const moods = {};
  const re = /\bact\((\w+)/g; let m; const pos = [];
  while ((m = re.exec(p))) pos.push([m[1], m.index]);
  pos.forEach(([nm, at], k) => {
    const seg = p.slice(at, k + 1 < pos.length ? pos[k + 1][1] : p.length);
    if (!acts.includes(nm)) { acts.push(nm); const f = seg.match(/faces: \[\[[\d.]+, '(\w+)'/); if (f) faces[nm] = f[1]; const md = seg.match(/mood: '(\w+)'/); if (md) moods[nm] = md[1]; }
  });
  const lie = /gaLie|bapLie/.test(p), sit = /gaSit|bapSit/.test(p);
  return { n, t, say, cam, look, room, acts, faces, moods, lie, sit };
});
raw.forEach((s, i) => { s.t1 = i + 1 < raw.length ? raw[i + 1].t : END; s.dur = +(s.t1 - s.t).toFixed(2); });

// ---------------- 2. ánh xạ ----------------
// nhân vật gốc → diễn viên R6 của studio (null = người đi đường → đám đông)
const WHO = { ga: 'hero', bap: 'bap', bach: 'bach', bachF: 'bach', baker: 'tho_banh', tailor: 'tho_may', mayorN: 'tt_ngu', mayorD: 'thitruong',
  guardA: 'linh1', guardB: 'linh2', bearR: 'gau_do', bearY: 'gau_vang', kid2: null, folk1: null, folk2: null, folk3: null };
const ACTORS = {
  hero: 'r6=1 look=ga', bach: 'r6=1 look=bach rb=bach', bap: 'bear=1 bow=#2a3fb0 fur=#9b5426',
  tho_banh: 'r6=1 look=banh', tho_may: 'r6=1 look=may', thitruong: 'r6=1 look=mayor', tt_ngu: 'r6=1 look=mayor_ngu',
  linh1: 'r6=1 shirt=#2c3e6a pants=#1e2a44 hat=cap hatColor=#1e2a44 hairColor=#2a1a12', linh2: 'r6=1 shirt=#2c3e6a pants=#1e2a44 hat=cap hatColor=#1e2a44 hairColor=#4a3020',
  gau_do: 'bear=1 bow=#c0302a', gau_vang: 'bear=1 bow=#e8b830',
};
const CAM_VI = { 'whip+drone': 'rung', whipchain: 'rung', whip: 'rung', 'whip+lens': 'rung', handheld: 'rung', shake: 'rung', drone: 'cẩu lên', 'tilt+drone': 'cẩu lên',
  push: 'đẩy vào', longpush: 'đẩy vào', macro: 'đẩy vào', pull: 'kéo ra', orbit: 'xoay quanh', crane: 'cẩu lên', truck: 'lia', drift: 'lia', tilt: 'hạ xuống',
  facing: 'kéo ra', glass: 'đứng yên', black: 'đứng yên' };
const FACE = (f) => (!f ? '' : /angry/.test(f) ? 'angry' : /scared|worried/.test(f) ? (/worried/.test(f) ? 'worried' : 'scared') : /shock/.test(f) ? 'surprised'
  : /tear|cry|sad/.test(f) ? 'sad' : /tired/.test(f) ? 'sleepy' : /happy/.test(f) ? 'happy' : /smile|smug/.test(f) ? 'smile' : /determined|neutral|unimpressed|blink/.test(f) ? 'neutral' : '');
const ANIM_MOOD = { WALK: 'walk', CHAY: 'run', VUI: 'cheer', LO: 'scared', NHON: 'lookAround', BUON: 'idle' };
// nơi diễn ra theo số shot (đọc từ cốt truyện + room/look của file gốc)
const PLACE = (n, s) => (n <= 3 || n === 13 || n === 14 ? 'phố' : n <= 12 ? 'tiệm' : n <= 16 ? 'phố' : s.room && n <= 38 ? 'bedroom' : n <= 52 ? (s.room ? 'bedroom' : 'phố')
  : n <= 55 ? 'phố' : n <= 65 ? 'factory' : n <= 71 ? 'nhà' : n <= 76 ? 'phố' : n === 77 ? 'factory' : n <= 79 ? 'phố' : n <= 87 ? 'factory' : 'bedroom');
const baoCao = { khong: [], canh: [] };

const rows = raw.map((s, i) => {
  const main = s.acts.map((a) => WHO[a]).filter(Boolean).filter((v, k, a) => a.indexOf(v) === k);
  const extras = s.acts.filter((a) => WHO[a] === null);
  const drop = s.acts.filter((a) => WHO[a] === undefined && a !== 'c');
  if (drop.length) baoCao.khong.push(`s${String(s.n).padStart(3, '0')}: act(${drop.join(',')}) không có trong bảng nhân vật → bỏ`);
  if (extras.length) baoCao.canh.push(`s${String(s.n).padStart(3, '0')}: ${extras.join(',')} (dân/bé) → đám đông chung, không dựng riêng`);
  if (main.length > 2) baoCao.canh.push(`s${String(s.n).padStart(3, '0')}: ${main.length} nhân vật chính (${main.join(',')}) → dialogue chỉ giữ 2 người đầu`);
  let type;
  if (s.cam === 'black') type = 'closeup';
  else if (s.cam === 'macro') type = 'insert';
  else if (!main.length) type = 'establish';
  else if (main.length >= 2) type = 'dialogue';
  else if (s.cam === 'facing' || s.cam === 'longpush' && false) type = 'follow';
  else type = 'closeup';
  if (s.cam === 'black') baoCao.canh.push(`s${String(s.n).padStart(3, '0')}: màn đen cuối (${s.dur}s) → closeup Bắp, không có màn đen thật`);
  const who = main[0] || (type === 'closeup' ? 'bap' : '');
  const first = s.acts.find((a) => WHO[a] === main[0]);
  const f = FACE(s.faces[first]);
  const anim = s.lie ? 'lie' : s.sit ? 'sit' : ANIM_MOOD[s.moods[first]] || '';
  const sec = s.n === 96 ? 'closeup' : type;
  const notes = [s.cam ? `cam gốc: ${s.cam}` : '', extras.length ? `thêm: ${extras.join(',')}` : ''].filter(Boolean).join('; ');
  return { n: s.n, dur: s.dur, say: s.say, type: sec, who, with: main[1] || '', at: PLACE(s.n, s), anim, face: f, cam: CAM_VI[s.cam] || '', look: s.look, notes };
});

// lời kể: câu mới khi shot trước rỗng hoặc kết thúc bằng . ! ? (có thể kèm ”)
let prevEnd = true; let sent = 0;
const loi = rows.map((r) => {
  const clean = r.say.replace(/\*/g, '').trim();
  if (!clean) { prevEnd = true; return ''; }
  const out = prevEnd ? clean : '^';
  if (prevEnd) sent++;
  prevEnd = /[.!?…]["”]?$/.test(clean);
  return out;
});
// gộp: câu mới = lời của cả câu = nối các mảnh; shot sau dùng ^
const full = []; { let cur = -1; rows.forEach((r, i) => { const clean = r.say.replace(/\*/g, '').trim(); if (loi[i] && loi[i] !== '^') { cur = full.length; full.push(clean); } else if (loi[i] === '^') full[cur] += ' ' + clean; }); }
let k = 0; const loiCau = loi.map((x) => (x && x !== '^' ? full[k++] : x));
const LIGHT = { DAY: 'day', MORNING: 'day', NIGHT: 'night', FACTORY: 'night', SEPIA: 'day' };

const md = [
  '# Món đồ biến mất — nhập từ story.html', '',
  'title: Món đồ biến mất', 'seed: 7', 'rule: Ở thị trấn này, đồ đạc liên tục biến mất dù căn phòng đã khóa kín.',
  'weakness: Món quý nhất của tôi — sợi dây chuyền của bà — cũng biến mất.', 'twist: Ông Bách giấu hàng của mình rồi đi báo mất; Bắp chỉ làm theo lệnh.',
  'solution: Tôi lấy lại dây chuyền và cất vào két; Bắp là gấu bông biết ăn cắp theo lệnh.', 'crowd: 6',
  ...Object.entries(ACTORS).map(([k2, v]) => `actor ${k2}: ${v}`), '',
  '| id | giây | lời kể | loại | ai | cùng | ở đâu | anim | mặt | máy quay | ánh sáng | ghi chú |', '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r, i) => `| ${r.n} | ${r.dur} | ${loiCau[i]} | ${r.type} | ${r.who} | ${r.with} | ${r.at} | ${r.anim} | ${r.face} | ${r.cam} | ${LIGHT[r.look] || 'day'} | ${r.notes} |`),
].join('\n');
fs.writeFileSync(path.join(sbDir, 'storyboard.md'), md, 'utf8');

// ---------------- 3. chạy storyboard.py ----------------
if (!args.includes('--khong-chay')) {
  const r = spawnSync('python', ['-I', path.join(ROOT, 'tools', 'storyboard.py'), sbDir, ten, '--force', '--title', 'Món đồ biến mất'], { cwd: ROOT, encoding: 'utf8' });
  process.stdout.write((r.stdout || '') + (r.stderr || ''));
  if (r.status !== 0) { console.error('storyboard.py lỗi'); process.exit(3); }
  const epDir = path.join(outEp, ten);
  // 3b. diễn viên R6: storyboard.py chép nguyên tuỳ chọn → kiểm lại episode.js còn khoá r6/bear
  // 3a. NHÂN VẬT + BỐI CẢNH + CAMERA GỐC (riêng của tập): goc/ + shots.js thô (mỗi shot gọi cảnh gốc theo số shot) + index.html. Bản storyboard giữ ở shots-storyboard.js.
  if (!args.includes('--khong-goc')) {
    const g = xuatGoc(file, epDir, ten);
    fs.copyFileSync(path.join(epDir, 'shots.js'), path.join(epDir, 'shots-storyboard.js'));
    const cur = { s: '' };
    const raw2 = rows.map((r) => `  { id: "s${String(r.n).padStart(3, '0')}", dur: ${r.dur}, env: "goc-trong", light: "${/NIGHT|FACTORY/.test(r.look) ? 'night' : 'day'}", goc: ${r.n}, cam: { p: [0, 6, 14], l: [0, 2, 0], fov: 50 } },`);
    const cm = `// ${ten} — ${rows.length} shot THÔ: mỗi shot = số shot gốc (goc) → camera/động tác/nhân vật lấy từ goc/story.js (cảnh gốc story.html). cam ở đây chỉ là chỗ giữ.
// Bản dựng theo loại shot của studio (storyboard.py): shots-storyboard.js.
`;
    fs.writeFileSync(path.join(epDir, 'shots.js'), [cm + 'export const SHOTS = [', ...raw2, '];', ''].join(String.fromCharCode(10)), 'utf8');
    spawnSync('node', [path.join(ROOT, 'tools', 'nhap-story-index.mjs'), ten], { cwd: ROOT, stdio: 'inherit' });
    console.log(`goc/: ${g.mat} mặt, story.js ${g.dong} dòng`);
  }
  const epJs = fs.readFileSync(path.join(epDir, 'episode.js'), 'utf8');
  const shotsJs = fs.readFileSync(path.join(epDir, 'shots.js'), 'utf8');
  const narr = fs.existsSync(path.join(epDir, 'narration.txt')) ? fs.readFileSync(path.join(epDir, 'narration.txt'), 'utf8') : '';
  fs.writeFileSync(path.join(epDir, `${ten}.js`),
    `// ${ten}.js — GỘP 1 FILE (EPISODE + SHOTS + LOI_KE) từ ${path.basename(file)} bằng tools/nhap-story-html.mjs. Studio đọc episode.js/shots.js cùng thư mục.\n` +
    `// --- episode.js ---\n${epJs}\n// --- shots.js ---\n${shotsJs.replace(/^import[^\n]*\n/gm, '')}\n// --- narration.txt ---\nexport const LOI_KE = ${JSON.stringify(narr)};\n`, 'utf8');
}

// ---------------- 4. báo cáo ----------------
const soLoi = full.length;
const goc = raw.map((s) => s.say.replace(/\*/g, '').trim()).filter(Boolean).join(' ');
const moi = full.join(' ');
const khop = goc.replace(/\s+/g, ' ') === moi.replace(/\s+/g, ' ');
const tong = rows.reduce((a, r) => a + r.dur, 0);
const bc = `# Báo cáo nhập ${path.basename(file)} → ${ten}\n\n| | file gốc | ${ten} |\n|---|---|---|\n| số shot | ${raw.length} | ${rows.length} |\n| thời lượng | ${END} s | ${tong.toFixed(2)} s |\n| lời kể (chữ) | ${goc.length} ký tự | ${moi.length} ký tự — ${khop ? 'KHỚP' : 'LỆCH'} |\n| số câu | — | ${soLoi} |\n\n## Không ánh xạ được\n` +
  `- GIỮ NGUYÊN từ file gốc (episodes/${ten}/goc/): nhân vật characters.js + 140 mặt, bối cảnh sets.js, camera + động tác + đạo cụ từng shot (story.js, hàm thuần của t). Shot thô trong shots.js chỉ gọi số shot gốc; bản theo loại shot của studio để ở shots-storyboard.js.${NL}- KHÔNG nhập (vẽ 2D lên khung của file gốc): bụi bông/tóe sao, nhoè whip, sepia, kính, màn đen, phụ đề gốc (studio có phụ đề riêng). Ánh sáng/hậu kỳ do studio vẽ nên hơi khác (sáng/tối).${NL}- Giọng, tiếng động, nhạc: file gốc không có.${NL}- Khác biệt đã thấy khi so A/B 6 khung: bố cục, nhân vật, bối cảnh khớp; mặt/bóng hơi khác do hậu kỳ studio.${NL}${NL}## Chi tiết từng shot (bản theo loại shot, chỉ để tham khảo)${NL}` +
  [...baoCao.khong, ...baoCao.canh].map((x) => `- ${x}`).join('\n') + '\n';
fs.writeFileSync(path.join(rep, 'bao-cao.md'), bc, 'utf8');
console.log(`shot ${raw.length}/${rows.length} · ${END}s/${tong.toFixed(1)}s · ${soLoi} câu · lời kể ${khop ? 'KHỚP' : 'LỆCH'} → ${path.relative(ROOT, rep)}/bao-cao.md`);
