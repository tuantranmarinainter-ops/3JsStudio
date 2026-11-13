// Chuyển bộ số của Codex (kich-ban/<ep>-kit2/kit.json, mẫu ở kich-ban/ep003-de-bai-2/DE-BAI.md mục 5) thành lớp ghi đè cho shot của tập.
//   node tools/kb/kit2-sang-shot.mjs <ep> <kit.json> <lớp>   → episodes/<ep>/kit2-<lớp>.js  (export const KIT2 = { s018: { cam, cast, props, them }, … }); lớp = phong | pho | nha-may
//   episodes/<ep>/kit2.js gộp các lớp. Thường không gọi trực tiếp: tools/kb/kit2-xem.mjs gọi rồi chụp khung engine thật.
// episodes/<ep>/shots.js gộp KIT2 lên shot cùng id (máy ghi tuyệt đối p / l / fov, không qua bộ giải khung); ?kit2=0 trên URL để tắt.
// Quy đổi: ry_do (độ, 0 = nhìn +Z) → ry (rad) · nam: true → lie + rz (hướng đầu) · mã kịch bản (GA, BAP…) → tên diễn viên · cam2 → p2 / l2 / fov2.
import { readFile, writeFile } from 'fs/promises'; import { join } from 'path';
const [ep, file, lop] = process.argv.slice(2);
if (!ep || !file || !lop) { console.log('dùng: node tools/kb/kit2-sang-shot.mjs <ep> <kit.json> <lớp>'); process.exit(2); }
export const MA = { GA: 'hero', BAP: 'bap', BACH: 'bach', MAYOR: 'mayor', MAYOR_NGU: 'mayor_ngu', GUARD_A: 'linh_a', GUARD_B: 'linh_b', BAKER: 'banh', TAILOR: 'may', CHILD_A: 'be_vang', CHILD_B: 'be_ngoc', BEAR_WALLET: 'gau_vi', BEAR_BAG: 'gau_tui', TOWN_A: 'dan_a', TOWN_B: 'dan_b', TOWN_C: 'dan_c' };
const kit = JSON.parse(await readFile(file, 'utf8')), rad = (d) => +(((d || 0) * Math.PI) / 180).toFixed(4), r3 = (a) => a.map((x) => +(+x).toFixed(3));
const out = {}, canhBao = [];
for (const s of kit.shots || []) {
  const id = String(s.id).toLowerCase(); if (!s.cam) continue;
  const c = s.cam, c2 = s.cam2, cam = { p: r3(c.p), l: r3(c.l), fov: +c.fov };
  if (c.nghieng) cam.roll = rad(c.nghieng);
  if (c2) { if (c2.p && String(c2.p) !== String(c.p)) cam.p2 = r3(c2.p); if (c2.l && String(c2.l) !== String(c.l)) cam.l2 = r3(c2.l); if (c2.fov && +c2.fov !== +c.fov) cam.fov2 = +c2.fov; }
  const cast = {};
  for (const d of s.dien_vien || []) {
    const n = MA[d.ai] || d.ai, a = { at: r3(d.pos) };
    if (d.nam) { a.lie = true; a.ry = 0; a.rz = rad(d.ry_do); } else a.ry = rad(d.ry_do);
    if (d.tu_the) a.anim = d.tu_the;
    if (d.t) a.tOff = +d.t;
    if (d.pos2) a.to = r3(d.pos2);
    if (d.giu !== undefined) a.hold = d.giu;          // tên đạo cụ engine (hoặc { name, at, rot }) cầm ở tay phải; null = không cầm
    if (d.giu_trai !== undefined) a.holdL = d.giu_trai;   // cầm ở tay trái
    if (d.pose !== undefined) a.pose = d.pose;        // pose thô của engine: { head: { x }, rightArm: { x, z }, … } (rad)
    if (d.mat_engine) a.face = d.mat_engine;
    cast[n] = a;
  }
  const props = {};
  for (const d of s.dao_cu || []) { if (!d.ten) continue; if (d.cam_boi) { const [ai, tay] = String(d.cam_boi).split('.'); props[d.ten] = { cam: MA[ai] || ai, tay: tay || 'tay_phai' }; } else if (d.tam) props[d.ten] = { at: r3(d.tam), ry: rad(d.ry_do), ...(d.kich ? { kich: r3(d.kich) } : {}) }; }
  out[id] = { boi_canh: s.boi_canh || null, cam, cast, props, ...(s.them ? { them: s.them } : {}) };
  if (!Object.keys(cast).length && s.boi_canh !== 'black') canhBao.push(id + ': không có diễn viên');
}
const dong = Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, v]) => `  ${id}: ${JSON.stringify(v)},`).join('\n');
await writeFile(join('episodes', ep, `kit2-${lop}.js`), `// SINH TỰ ĐỘNG bởi tools/kb/kit2-sang-shot.mjs từ ${file.replace(/\\/g, '/')} — đừng sửa tay; sửa kit.json rồi chạy lại.\nexport const KIT2 = {\n${dong}\n};\n`);
console.log(Object.keys(out).length, 'shot → episodes/' + ep + `/kit2-${lop}.js`, canhBao.length ? '\n⚠ ' + canhBao.join('\n⚠ ') : '');
