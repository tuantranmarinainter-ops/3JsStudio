// Kiểm kit.json + file hình so với bang-shot.json — đặc tả: docs/quy-trinh-dau-vao.md
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { hongDau, quetChuoi, inKetQua } from './kiem-bang-shot.mjs';

const TIN_CAY = ['cao', 'vua', 'thap'];
const vec3 = (v) => Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number' && Number.isFinite(x));
const bang = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function kiemKit(bangShot, kit, { files = null } = {}) {
  const loi = [], canhBao = [];
  const L = (shot, msg) => loi.push({ shot, msg });
  const W = (shot, msg) => canhBao.push({ shot, msg });
  if (!kit || typeof kit !== 'object') { L('-', 'kit.json không phải đối tượng JSON'); return { loi, canhBao }; }
  for (const k of ['nhanVat', 'boiCanh', 'shots'])
    if (!Array.isArray(kit[k])) L('-', `kit thiếu mảng "${k}"`);
  if (loi.length) return { loi, canhBao };
  if (kit.donVi !== 'stud') W('-', `donVi nên là "stud" (đang là ${JSON.stringify(kit.donVi)})`);
  if (bangShot && kit.ep !== bangShot.ep) L('-', `ep của kit "${kit.ep}" khác bảng shot "${bangShot.ep}"`);
  quetChuoi(kit, (s, d) => { if (hongDau(s)) L('-', `hỏng dấu tiếng Việt ở kit${d}: "${s}"`); });

  const nvKit = new Map(kit.nhanVat.map((n) => [n && n.id, n]));
  const bcKit = new Map(kit.boiCanh.map((b) => [b && b.id, b]));
  for (const n of kit.nhanVat) {
    if (!(typeof n.cao === 'number' && n.cao >= 1 && n.cao <= 8)) L('-', `nhân vật "${n.id}": cao phải trong 1–8 stud (đang là ${JSON.stringify(n.cao)})`);
  }
  for (const b of kit.boiCanh) {
    for (const k of ['rong', 'sau', 'cao'])
      if (!(typeof b[k] === 'number' && b[k] > 0)) L('-', `bối cảnh "${b.id}": ${k} phải là số > 0`);
    const l = b.anhSang && b.anhSang.luma;
    if (!(typeof l === 'number' && l >= 85 && l <= 150)) L('-', `bối cảnh "${b.id}": anhSang.luma phải trong 85–150 (đang là ${JSON.stringify(l)})`);
  }

  const shots = (bangShot && bangShot.shots) || [];
  const kitShot = new Map(kit.shots.map((s) => [s && s.id, s]));
  for (const id of kitShot.keys()) if (!shots.some((s) => s.id === id)) W(id, 'shot có trong kit nhưng không có trong bảng shot');
  let thap = 0;
  for (const s of shots) {
    const id = s.id, k = kitShot.get(id);
    if (!k) { L(id, 'thiếu trong kit.json'); continue; }
    const bc = bcKit.get(s.boiCanh);
    if (!bc) L(id, `kit thiếu bối cảnh "${s.boiCanh}"`);
    const may = k.may || {};
    const can = s.hinh === 1 ? ['dau'] : s.hinh === 2 ? ['dau', 'cuoi'] : ['dau', 'giua', 'cuoi'];
    if (!may.dau) L(id, 'thiếu may.dau');
    if (s.hinh >= 2 && !may.cuoi) L(id, 'thiếu may.cuoi');
    if (s.hinh === 3 && !may.giua) L(id, 'thiếu may.giua');
    for (const m of ['dau', 'giua', 'cuoi']) {
      const c = may[m];
      if (!c) continue;
      if (!vec3(c.p)) L(id, `may.${m}.p phải là [x, y, z] số`);
      if (!vec3(c.nhin)) L(id, `may.${m}.nhin phải là [x, y, z] số`);
      if (!(typeof c.fov === 'number' && c.fov >= 15 && c.fov <= 90)) L(id, `may.${m}.fov phải trong 15–90 (đang là ${JSON.stringify(c.fov)})`);
      if (vec3(c.p)) {
        if (!(c.p[1] > 0)) L(id, `may.${m}: độ cao máy p[1]=${c.p[1]} phải > 0`);
        else if (bc && typeof bc.cao === 'number' && !(c.p[1] < bc.cao)) L(id, `may.${m}: độ cao máy p[1]=${c.p[1]} phải < cao bối cảnh ${bc.cao}`);
      }
    }
    const nvs = Array.isArray(k.nhanVat) ? k.nhanVat : [];
    for (const n of s.nhanVat || []) {
      const e = nvs.find((x) => x.id === n);
      if (!nvKit.has(n)) L(id, `kit thiếu nhân vật "${n}" trong danh sách nhanVat`);
      if (!e) { L(id, `thiếu toạ độ nhân vật "${n}"`); continue; }
      if (!vec3(e.dau)) L(id, `nhân vật "${n}" thiếu toạ độ dau`);
      if (s.hinh >= 2 && !vec3(e.cuoi)) L(id, `nhân vật "${n}" thiếu toạ độ cuoi`);
      if (e.giua !== undefined && !vec3(e.giua)) L(id, `nhân vật "${n}" có giua nhưng không phải [x,y,z]`);
      for (const m of ['dau', 'giua', 'cuoi']) {   // giua tuỳ chọn (shot hinh:3: vị trí ở khung giữa, y > 0 = đang nhảy)
        const p = e[m];
        if (vec3(p) && bc && bc.rong > 0 && bc.sau > 0 && (Math.abs(p[0]) > bc.rong / 2 || Math.abs(p[2]) > bc.sau / 2))
          L(id, `nhân vật "${n}" ngoài bối cảnh ở ${m}: [${p}] vượt ${bc.rong}×${bc.sau}`);
      }
    }
    if (s.hinh >= 2 && may.dau && may.cuoi && bang(may.dau, may.cuoi)) {
      const doiCho = (s.nhanVat || []).some((n) => { const e = nvs.find((x) => x.id === n); return e && !bang(e.dau, e.cuoi); });
      if (!doiCho) L(id, 'không có chuyển động: may.dau giống hệt may.cuoi và nhân vật không đổi chỗ');
    }
    if (!TIN_CAY.includes(k.tinCay)) L(id, `tinCay phải là ${TIN_CAY.join(' | ')} (đang là ${JSON.stringify(k.tinCay)})`);
    else if (k.tinCay === 'thap') { thap++; W(id, 'tinCay thấp'); }
    if (files) {
      for (const m of can) {
        const f = `shot_${id}_${m}.png`;
        if (!files.includes(f)) L(id, `thiếu file hình hinh/${f}`);
      }
    }
  }
  if (shots.length && thap / shots.length > 0.2)
    L('-', `${thap}/${shots.length} shot tinCay thấp (${Math.round(100 * thap / shots.length)}% > 20%)`);
  return { loi, canhBao };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2];
  if (!dir) { process.stdout.write('Cách dùng: node tools/kiem-kit.mjs <thư mục tập> [--khong-hinh]\n'); process.exit(1); }
  const doc = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  let bs, kit;
  try { bs = doc('bang-shot.json'); kit = doc('kit.json'); }
  catch (e) { process.stdout.write(`LỖI -: không đọc được bang-shot.json / kit.json: ${e.message}\n`); process.exit(1); }
  let files = null;
  if (!process.argv.includes('--khong-hinh')) {
    try { files = fs.readdirSync(path.join(dir, 'hinh')); } catch { files = []; }
  }
  process.exitCode = inKetQua(kiemKit(bs, kit, { files }), 'kiem-kit', (bs.shots || []).length);
}
