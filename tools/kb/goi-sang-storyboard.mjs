// Gói kịch bản "Shotlist_104.json" (id, set, camera, action, cast {MÃ: số emote}, start/end, lines) → thư mục storyboard cho tools/storyboard.py.
//   node tools/kb/goi-sang-storyboard.mjs <thư mục gói> <thư mục ra> [--demo]     (--demo: dùng mốc demoStart/demoEnd thay cho start/end)
// Bảng ánh xạ mã nhân vật / set ở đầu file: tập khác sửa tại đây hoặc truyền --map <file.json> { actors, sets, envs }.
import fs from 'node:fs';
import path from 'node:path';
const [src, out, ...fl] = process.argv.slice(2);
const demo = fl.includes('--demo'), mapF = fl.includes('--map') ? JSON.parse(fs.readFileSync(fl[fl.indexOf('--map') + 1], 'utf8')) : {};
const J = JSON.parse(fs.readFileSync(path.join(src, 'Shotlist_104.json'), 'utf8'));
const EMO = ['binh_thuong', 'o_tho', 'cuoi_rang_tho', 'cuoi_ra_nuoc_mat', 'phan_khich', 'nan_ni_moi_vien_den', 'buon_rung_rung', 'khoc_oa', 'que_do_mat', 'ren_do_mo_hoi', 'hoang_so', 'soc_ha_hoc', 'la_het', 'met_moi',
  'nghien_rang_tuc_gian', 'quat', 'nghi_ngo', 'boi_roi', 'cuoi_dac_y', 'ghe_tom', 'cuoi_guong', 'kiet_suc', 'ngo_ngac', 'buon_ngu', 'quyet_tam', 'thac_mac', 'ngam_nghi', 'thiet_ha', 'a_ra_roi', 'hoi_loi', 'dao_mat',
  'ban_tin_ban_nghi', 'nhin_cuoi', 'im_lang_kho_xu', 'thi_tham', 'tho_phao', 'nhay_mat'];
const ACT = { GA: 'hero', BAP: 'bap', BACH: 'bach', MAYOR: 'mayor', GUARD_A: 'linh_a', GUARD_B: 'linh_b', BAKER: 'banh', TAILOR: 'may', CHILD_A: 'be_vang', CHILD_B: 'be_ngoc',
  BEAR_WALLET: 'gau_vi', BEAR_BAG: 'gau_tui', TOWN_A: 'dan_a', TOWN_B: 'dan_b', TOWN_C: 'dan_c', BEARS_STOCK: null, ...(mapF.actors || {}) };
const ORDER = ['GA', 'BAP', 'BACH', 'MAYOR', 'BEAR_WALLET', 'BEAR_BAG', 'GUARD_A', 'GUARD_B', 'BAKER', 'TAILOR', 'CHILD_A', 'CHILD_B', 'TOWN_A', 'TOWN_B', 'TOWN_C'];
const ENV = { bedroom: 'e3-phong', bakery: 'e3-tiem', tailor: 'e3-tiem', 'factory-exterior': 'e3-nha-may', 'factory-interior': 'e3-nha-may', 'factory-storage': 'e3-nha-may', ...(mapF.envs || {}) };
const envOf = (set) => ENV[set] || 'e3-pho';
// giờ theo shot: đêm = hồi 2–4 + S067–S071 (gõ cửa thị trưởng ban đêm); S001–S002 phòng khoá buổi đêm; còn lại ngày
const num = (id) => +id.slice(1);
const isNight = (s) => { const n = num(s.id); return (n >= 20 && n <= 71 && !(n >= 20 && n <= 21)) || n <= 2; };
const actors = {
  hero: { r6: 1, look: 'ga' }, bach: { r6: 1, look: 'bach' }, mayor: { r6: 1, look: 'mayor' }, mayor_ngu: { r6: 1, look: 'mayor_ngu' }, linh_a: { r6: 1, look: 'linh_a' }, linh_b: { r6: 1, look: 'linh_b' },
  banh: { r6: 1, look: 'banh' }, may: { r6: 1, look: 'may' }, be_vang: { r6: 1, look: 'be_vang' }, be_ngoc: { r6: 1, look: 'be_ngoc' }, dan_a: { r6: 1, look: 'dan_a' }, dan_b: { r6: 1, look: 'dan_b' }, dan_c: { r6: 1, look: 'dan_c' },
  bap: { bear: 1, bow: '#2a3fb0', fur: '#b8651f' }, gau_vi: { bear: 1, bow: '#f08a1a', fur: '#9a9a9c' }, gau_tui: { bear: 1, bow: '#d8402a', fur: '#6b3523' },
};
fs.mkdirSync(out, { recursive: true });
const shots = []; let prevLine = null, tot = 0;
J.shots.forEach((s, i) => {
  const t0 = demo ? s.demoStart : s.start, t1 = demo ? s.demoEnd : s.end, dur = +(t1 - t0).toFixed(3); tot += dur;
  const keys = ORDER.filter((k) => k in (s.cast || {}) && ACT[k]);
  let names = keys.map((k) => (k === 'MAYOR' && s.set === 'mayor-door' && isNight(s) ? 'mayor_ngu' : ACT[k]));
  const frame = `shot_${String(i + 1).padStart(3, '0')}.jpg`;
  if (!fs.existsSync(path.join(out, frame))) fs.copyFileSync(path.join(src, s.file), path.join(out, frame));
  const o = { id: num(s.id), khung: frame, 'giây': dur, 'lời kể': s.line == null || !s.dialogue ? '' : s.line === prevLine ? '^' : s.dialogue,
    'ở đâu': envOf(s.set), 'hành động': s.action, 'máy quay': s.camera, 'ghi chú': `${s.title} · set:${s.set}${isNight(s) ? ' · đêm' : ''}` };
  if (names[0]) { o.ai = names[0]; o['mặt'] = EMO[+s.cast[keys[0]]]; }
  if (names.length > 1) { o['cùng'] = names.slice(1).join(', '); o['mặt 2'] = EMO[+s.cast[keys[1]]]; }
  if (s.line != null && s.dialogue) prevLine = s.line;
  shots.push(o);
});
const episode = { title: `${J.title} — ${J.episode}`, seed: 7, rule: 'Ở thị trấn này, đồ đạc liên tục biến mất, dù căn phòng đã được khóa kín.',
  weakness: 'Tôi mất sợi dây chuyền bà để lại — và con gấu bông tôi tin nhất lại là kẻ lấy.', twist: 'Ông Bách hiền lành phát gấu miễn phí chính là chủ mưu: gấu bông đi trộm về nhà máy; ông tự báo mất để che mắt.',
  solution: 'Tôi giả vờ ngủ, soi qua gương, bám theo Bắp tới nhà máy rồi dẫn thị trưởng tới bắt quả tang.', env: 'e3-pho', light: 'day', actors };
fs.writeFileSync(path.join(out, 'storyboard.json'), JSON.stringify({ episode, shots }, null, 1));
// bảng phụ cho các bước sau: mốc shot + mốc câu + mặt từng nhân vật theo shot
fs.writeFileSync(path.join(out, 'moc.json'), JSON.stringify({ tong: +tot.toFixed(3),
  shots: J.shots.map((s) => ({ id: 's' + s.id.slice(1), set: s.set, t0: demo ? s.demoStart : s.start, t1: demo ? s.demoEnd : s.end, line: s.line, dem: isNight(s),
    cast: Object.fromEntries(Object.entries(s.cast || {}).filter(([k]) => ACT[k]).map(([k, v]) => [k === 'MAYOR' && s.set === 'mayor-door' && isNight(s) ? 'mayor_ngu' : ACT[k], EMO[+v]])) })),
  lines: J.lines.map((l) => ({ line: l.line, t0: demo ? l.demoStart : l.start, t1: demo ? l.demoEnd : l.end, text: l.text })) }, null, 1));
console.log(`${shots.length} shot, tổng ${tot.toFixed(3)} s → ${out}`);
