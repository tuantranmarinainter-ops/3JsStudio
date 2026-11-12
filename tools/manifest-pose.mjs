#!/usr/bin/env node
// Suy `pose` (MẢNG tư thế mô hình hỗ trợ) + `anim` + `animTheoPose` cho assets/manifest.json từ GLB.
//   node tools/manifest-pose.mjs [--write [--cap-nhat]] [--only <chuỗi lọc id>]
// Luật (xét TỪNG clip, khớp theo TỪ, không phân biệt hoa thường; thứ tự mảng: standing, sitting, flying, swimming):
//   fly|flap|glide|soar -> flying     swim|dive -> swimming
//   sit|perch -> sitting              idle|walk|run|stand -> standing
// Không clip nào khớp mà có skin/animation: suy từ từ trong id/title (whale|dolphin|shark|fish|ray|orca -> swimming;
//   bird|gull|eagle -> flying; còn lại standing).
// Không skin + chỉ clip trang trí (tick, *sway*, *wind*) -> chỉ ghi `anim`, không pose. Mô hình tĩnh: không ghi gì.
// --write: mặc định không đụng entry đã có pose; --cap-nhat cho phép ghi đè pose/anim/animTheoPose.
// Giữ thứ tự entry/khoá, thụt lề, xuống dòng của file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docGlbFs, suyPose } from './kiem/pose.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function tinh(manifestPath, root, only) {
  const man = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const doc = docGlbFs(root);
  const rows = [];
  let thieu = 0, loi = 0;
  for (const e of man) {
    if (only && !e.id.includes(only)) continue;
    if (!e.src) continue;
    const g = doc(e.src);
    if (!g) { thieu++; continue; }
    if (g.boQua) continue;
    if (g.loi) { loi++; continue; }
    const r = suyPose(e, g);
    if (r) rows.push({ e, g, r });
  }
  return { man, rows, thieu, loi };
}

export function ghiPose(manifestPath, root, { only, capNhat } = {}) {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const { man, rows } = tinh(manifestPath, root, only);
  const eol = raw.endsWith('\n') ? '\n' : '';
  if (JSON.stringify(JSON.parse(raw), null, 1) + eol !== raw) throw new Error('manifest không ở dạng JSON.stringify(…, null, 1); dừng để khỏi đổi định dạng');
  let n = 0;
  for (const { e, r } of rows) {
    const co = e.pose !== undefined || e.animTheoPose !== undefined || e.anim !== undefined;
    if (co && !capNhat) continue;
    delete e.pose; delete e.anim; delete e.animTheoPose;
    if (r.pose) e.pose = r.pose;
    e.anim = r.anim;
    if (r.animTheoPose) e.animTheoPose = r.animTheoPose;
    n++;
  }
  fs.writeFileSync(manifestPath, JSON.stringify(man, null, 1) + eol);
  return n;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const i = a.indexOf('--only');
  const only = i >= 0 ? a[i + 1] : null;
  const mp = path.join(ROOT, 'assets/manifest.json');
  const { rows, thieu, loi } = tinh(mp, ROOT, only);
  console.log('id | clip | pose đề xuất | animTheoPose');
  for (const { e, g, r } of rows) console.log(`${e.id} | ${g.anims.join(', ') || '(chỉ skeleton)'} | ${r.pose ? r.pose.join(',') : '(trang trí, không pose)'}${e.pose ? ` (đang có: ${[].concat(e.pose).join(',')})` : ''} | ${r.animTheoPose ? JSON.stringify(r.animTheoPose) : '-'}`);
  const dem = {};
  for (const { r } of rows) for (const p of r.pose || []) dem[p] = (dem[p] || 0) + 1;
  console.log(`\n${rows.length} mô hình động, tư thế ${JSON.stringify(dem)}; ${thieu} GLB thiếu trên máy; ${loi} không đọc được`);
  if (a.includes('--write')) console.log(`Đã ghi cho ${ghiPose(mp, ROOT, { only, capNhat: a.includes('--cap-nhat') })} entry.`);
  else console.log('(chưa ghi — thêm --write)');
}
