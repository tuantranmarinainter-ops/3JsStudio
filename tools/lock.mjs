#!/usr/bin/env node
// lock.mjs — khoá (sha256) các file ÂM THANH đã duyệt của một tập, để chứng minh khi chỉ sửa lớp hình
// (canh, hieu-ung-hinh) thì âm thanh không đổi.
//   node tools/lock.mjs <ep> lock  [--layers giong,nen,buoc-chan,khoanh-khac,nhac] [--out file.json]
//   node tools/lock.mjs <ep> check [--layers …] [--lock file.json]
// Mặc định ghi/đọc episodes/<ep>/lock.json {created, files:[{path,sha256,layer}]}.
// check: in file ĐỔI / THIẾU / MỚI theo lớp; thoát mã 1 nếu có thay đổi (0 = nguyên vẹn).
// Bản đồ lớp → file (xem episodes/<ep>/LAYERS.md):
//   giong       narration*.mp3, narration*.json, voices/**
//   nen         sfx_nen.ogg
//   buoc-chan   sfx_buoc-chan.ogg, sfx/steps.json
//   khoanh-khac sfx_khoanh-khac.ogg, sfx/cues_*.json
//   nhac        music_*.ogg, music/plan.json
//   sfx-chung   sfx/layers.json, sfx_layers.json (cấu hình chung 3 lớp tiếng động; tính khi chọn nen/buoc-chan/khoanh-khac)
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LAYERS = ['giong', 'nen', 'buoc-chan', 'khoanh-khac', 'nhac'];
const SFX = ['nen', 'buoc-chan', 'khoanh-khac'];

// đường dẫn tương đối trong thư mục tập (dấu /) → tên lớp hoặc null
export function phanLoai(p) {
  if (/^narration[^/]*\.(mp3|json)$/.test(p) || p.startsWith('voices/')) return 'giong';
  if (p === 'sfx_nen.ogg') return 'nen';
  if (p === 'sfx_buoc-chan.ogg' || p === 'sfx/steps.json') return 'buoc-chan';
  if (p === 'sfx_khoanh-khac.ogg' || /^sfx\/cues_[^/]*\.json$/.test(p)) return 'khoanh-khac';
  if (/^music_[^/]*\.ogg$/.test(p) || p === 'music/plan.json') return 'nhac';
  if (p === 'sfx/layers.json' || p === 'sfx_layers.json') return 'sfx-chung';
  return null;
}
export function trongPhamVi(layer, chon) {
  if (!layer) return false;
  if (layer === 'sfx-chung') return SFX.some((l) => chon.includes(l));
  return chon.includes(layer);
}

function* duyet(dir, base = '') {
  for (const e of fs.readdirSync(path.join(dir, base), { withFileTypes: true })) {
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) { if (!/^(node_modules|\.git)$/.test(e.name)) yield* duyet(dir, rel); } else yield rel;
  }
}
export const sha = (f) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');

export function quet(epDir, chon = LAYERS) {
  const out = [];
  for (const rel of duyet(epDir)) {
    const layer = phanLoai(rel);
    if (trongPhamVi(layer, chon)) out.push({ path: rel, sha256: sha(path.join(epDir, rel)), layer });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

// so sánh danh sách đã khoá với hiện tại → { doi, thieu, moi } (mỗi phần tử là {path, layer})
export function soSanh(khoa, hienTai) {
  const k = new Map(khoa.map((f) => [f.path, f])), h = new Map(hienTai.map((f) => [f.path, f]));
  const doi = [], thieu = [], moi = [];
  for (const [p, f] of k) { const g = h.get(p); if (!g) thieu.push({ path: p, layer: f.layer }); else if (g.sha256 !== f.sha256) doi.push({ path: p, layer: f.layer }); }
  for (const [p, g] of h) if (!k.has(p)) moi.push({ path: p, layer: g.layer });
  return { doi, thieu, moi };
}

function main() {
  const a = process.argv.slice(2);
  const opt = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : undefined; };
  const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')));
  const [ep, cmd] = pos;
  if (!ep || !['lock', 'check'].includes(cmd)) { console.error('Dùng: node tools/lock.mjs <ep> lock|check [--layers giong,nen,buoc-chan,khoanh-khac,nhac] [--out|--lock file.json]'); process.exit(1); }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const epDir = path.join(root, 'episodes', ep);
  if (!fs.existsSync(epDir)) { console.error('✘ Không thấy ' + epDir); process.exit(1); }
  const chon = opt('layers') ? opt('layers').split(',').map((s) => s.trim()).filter(Boolean) : LAYERS;
  const sai = chon.filter((l) => !LAYERS.includes(l));
  if (sai.length) { console.error(`✘ Lớp không hợp lệ: ${sai.join(', ')} (có: ${LAYERS.join(', ')})`); process.exit(1); }
  const lockFile = path.resolve(opt('out') || opt('lock') || path.join(epDir, 'lock.json'));
  const hien = quet(epDir, chon);
  if (cmd === 'lock') {
    // ghi đè lớp được chọn, giữ nguyên các lớp khác nếu đã có file khoá
    let giu = [];
    if (fs.existsSync(lockFile)) { try { giu = JSON.parse(fs.readFileSync(lockFile, 'utf8')).files.filter((f) => !trongPhamVi(f.layer, chon)); } catch { /* khoá cũ hỏng → ghi mới */ } }
    const files = [...giu, ...hien].sort((x, y) => x.path.localeCompare(y.path));
    fs.writeFileSync(lockFile, JSON.stringify({ created: new Date().toISOString(), files }, null, 1) + '\n');
    const per = {}; for (const f of hien) per[f.layer] = (per[f.layer] || 0) + 1;
    console.log(`✔ Đã khoá ${hien.length} file âm thanh (${Object.entries(per).map(([l, n]) => `${l} ${n}`).join(' · ') || 'không có'}) → ${lockFile}`);
    return;
  }
  if (!fs.existsSync(lockFile)) { console.error('✘ Chưa có file khoá: ' + lockFile + ' (chạy `lock` trước)'); process.exit(1); }
  const khoa = JSON.parse(fs.readFileSync(lockFile, 'utf8')).files.filter((f) => trongPhamVi(f.layer, chon));
  const r = soSanh(khoa, hien), nhom = {};
  for (const [loai, ds] of Object.entries(r)) for (const f of ds) (nhom[f.layer] ??= []).push(`${{ doi: 'ĐỔI', thieu: 'THIẾU', moi: 'MỚI' }[loai]} ${f.path}`);
  const n = r.doi.length + r.thieu.length + r.moi.length;
  if (!n) { console.log(`✔ Âm thanh nguyên vẹn: ${khoa.length} file khớp khoá (lớp: ${chon.join(', ')})`); return; }
  for (const [layer, ds] of Object.entries(nhom)) { console.log(`⚠ lớp ${layer}:`); ds.forEach((d) => console.log('    ' + d)); }
  console.log(`✘ ${r.doi.length} đổi · ${r.thieu.length} thiếu · ${r.moi.length} mới`);
  process.exit(1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
