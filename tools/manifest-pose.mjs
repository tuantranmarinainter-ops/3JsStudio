#!/usr/bin/env node
// Liệt kê clip của GLB có skeleton/animation và đề xuất `pose` cho assets/manifest.json.
//   node tools/manifest-pose.mjs [--write] [--only <chuỗi lọc id>]
// Luật đề xuất (theo thứ tự; xét tên clip + id + title):
//   fly|flap|wing        -> flying
//   swim                 -> swimming
//   sit|perch|idle_sit   -> sitting
//   còn lại có skeleton/animation -> standing
// Mô hình tĩnh (không skin, không animation) KHÔNG nhận pose.
// --write chỉ thêm `pose` + `anim` (giữ thứ tự entry/khoá, thụt lề, xuống dòng); entry đã có pose thì giữ nguyên.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docGlbFs } from './kiem/pose.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function deXuat(entry, g) {
  if (!g || (!g.anims.length && !g.coSkin)) return null;
  const hay = `${g.anims.join(' ')} ${entry.id} ${entry.title ?? ''}`.toLowerCase();
  const rules = [['flying', /fly|flap|wing/], ['swimming', /swim/], ['sitting', /sit|perch/]];
  for (const [pose, re] of rules) {
    if (re.test(hay)) return { pose, can: `khớp ${re.source}` };
  }
  return { pose: 'standing', can: g.coSkin ? 'có skeleton' : 'có animation' };
}

function tinh(manifestPath, root, only) {
  const man = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const doc = docGlbFs(root);
  const rows = [];
  let thieu = 0;
  for (const e of man) {
    if (only && !e.id.includes(only)) continue;
    if (!e.src) continue;
    const g = doc(e.src);
    if (!g) { thieu++; continue; }
    const d = deXuat(e, g);
    if (d) rows.push({ e, g, ...d });
  }
  return { man, rows, thieu };
}

export function ghiPose(manifestPath, root, only) {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const { man, rows } = tinh(manifestPath, root, only);
  const eol = raw.endsWith('\n') ? '\n' : '';
  if (JSON.stringify(JSON.parse(raw), null, 1) + eol !== raw) throw new Error('manifest không ở dạng JSON.stringify(…, null, 1); dừng để khỏi đổi định dạng');
  let n = 0;
  for (const r of rows) {
    if (r.e.pose) continue;
    r.e.pose = r.pose;
    r.e.anim = r.g.anims;
    n++;
  }
  const out = JSON.stringify(man, null, 1) + eol;
  fs.writeFileSync(manifestPath, out);
  return n;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const i = a.indexOf('--only');
  const only = i >= 0 ? a[i + 1] : null;
  const mp = path.join(ROOT, 'assets/manifest.json');
  const { rows, thieu } = tinh(mp, ROOT, only);
  console.log('id | clip | pose đề xuất | căn cứ');
  for (const r of rows) console.log(`${r.e.id} | ${r.g.anims.join(', ') || '(chỉ skeleton)'} | ${r.pose}${r.e.pose ? ` (đã có: ${r.e.pose})` : ''} | ${r.can}`);
  const dem = {};
  for (const r of rows) dem[r.pose] = (dem[r.pose] || 0) + 1;
  console.log(`\n${rows.length} mô hình động ${JSON.stringify(dem)}; ${thieu} GLB thiếu trên máy`);
  if (a.includes('--write')) console.log(`Đã ghi pose/anim cho ${ghiPose(mp, ROOT, only)} entry.`);
  else console.log('(chưa ghi — thêm --write)');
}
