#!/usr/bin/env node
// Trung tâm điều hành — trang artifact liệt kê mọi phiên 3JS Studio (skill `trung-tam`).
//
//   node tools/trung-tam.mjs diem-dung [--ngay 2]   in gọn khối ĐIỂM DỪNG của docs/handoff/*.md sửa trong N ngày
//   node tools/trung-tam.mjs dong-goi               kiểm docs/trung-tam.json, đóng dấu giờ, ghi output/trung-tam/bang.json
//   node tools/trung-tam.mjs tao-tu <thư mục>       (một lần) gom các file <id>.json (xuất từ db cũ) thành docs/trung-tam.json
//
// Dữ liệu gốc: docs/trung-tam.json = { capNhat, phien: { <id>: {ten, trangThai, nhom, dangLam, tiepTheo, banCan, lanCuoi, link} } }
// Trang đọc MỘT bản ghi db: collection "bang", doc "hientai" = nội dung output/trung-tam/bang.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const URL_TRANG = 'https://claude.ai/artifact/JUGQ8iJHoj5AiD2boeppbT';
export const TRANG_THAI = ['dang-lam', 'cho-ban', 'tam-nghi', 'xong'];
const TRUONG = ['ten', 'trangThai', 'nhom', 'dangLam', 'tiepTheo', 'banCan', 'lanCuoi', 'link'];
// không dùng \b: "chờ"/"làm" kết thúc bằng chữ có dấu, \b không nhận ra ranh giới
const KHOA_DD = /^(Đang làm|Đã xong|Bước kế tiếp|Đang chờ|Xong|Tiếp theo)(?=[:\s(])/i;

/** Rút các dòng chính trong khối ĐIỂM DỪNG (hoặc 30 dòng đầu nếu không có khối). */
export function rutDiemDung(md, toiDa = 170) {
  const dong = md.split(/\r?\n/);
  let i = dong.findIndex(l => /ĐIỂM DỪNG/.test(l));
  const vung = i >= 0 ? dong.slice(i, i + 30) : dong.slice(0, 30);
  const out = [];
  for (const l of vung) {
    const s = l.replace(/^\s*[-*]\s*/, '').replace(/\*\*/g, '').trim();
    if (!KHOA_DD.test(s)) continue;
    out.push(s.length > toiDa ? s.slice(0, toiDa - 1) + '…' : s);
    if (out.length >= 4) break;
  }
  return out;
}

/** Kiểm dữ liệu; trả danh sách lỗi (rỗng = đạt). */
export function kiem(du) {
  const loi = [];
  if (!du || typeof du.phien !== 'object') return ['thiếu khoá "phien"'];
  for (const [id, r] of Object.entries(du.phien)) {
    if (!/^[A-Za-z0-9_.-]+$/.test(id)) loi.push(`${id}: id chỉ dùng chữ không dấu, số, - _ .`);
    if (!r.ten) loi.push(`${id}: thiếu "ten"`);
    if (!TRANG_THAI.includes(r.trangThai)) loi.push(`${id}: trangThai "${r.trangThai}" không thuộc ${TRANG_THAI.join('|')}`);
    if (r.trangThai === 'cho-ban' && !r.banCan) loi.push(`${id}: "cho-ban" nhưng thiếu "banCan" (bạn cần làm gì)`);
    if (r.lanCuoi && isNaN(Date.parse(r.lanCuoi))) loi.push(`${id}: lanCuoi không phải ngày giờ`);
    for (const k of Object.keys(r)) if (!TRUONG.includes(k)) loi.push(`${id}: trường lạ "${k}"`);
  }
  return loi;
}

/** Dữ liệu → bản ghi trang đọc (mảng, có id, đủ trường). */
export function dongGoi(du, bayGio = new Date()) {
  const rows = Object.entries(du.phien).map(([id, r]) => {
    const o = { id };
    for (const k of TRUONG) o[k] = r[k] ?? '';
    return o;
  });
  const dem = Object.fromEntries(TRANG_THAI.map(t => [t, rows.filter(r => r.trangThai === t).length]));
  return { capNhat: bayGio.toISOString().replace(/\.\d+Z$/, 'Z'), dem, rows };
}

function main(argv) {
  const [lenh, ...rest] = argv;
  const fData = path.join(ROOT, 'docs/trung-tam.json');
  if (lenh === 'diem-dung') {
    const ni = rest.indexOf('--ngay');
    const ngay = ni >= 0 ? Number(rest[ni + 1]) : 2;
    const dir = path.join(ROOT, 'docs/handoff');
    const moc = Date.now() - ngay * 864e5;
    const ds = fs.readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('_'))
      .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs })).filter(x => x.t >= moc).sort((a, b) => b.t - a.t);
    for (const { f, t } of ds) {
      const dd = rutDiemDung(fs.readFileSync(path.join(dir, f), 'utf8'));
      console.log(`## ${f}  (${new Date(t).toISOString().slice(5, 16).replace('T', ' ')}Z)`);
      for (const l of dd) console.log('  ' + l);
    }
    console.log(`— ${ds.length} file sửa trong ${ngay} ngày`);
    return 0;
  }
  if (lenh === 'tao-tu') {
    const dir = rest[0];
    const phien = {};
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
      phien[f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    }
    fs.writeFileSync(fData, JSON.stringify({ capNhat: new Date().toISOString(), phien }, null, 2) + '\n');
    console.log(`Đã ghi ${fData} (${Object.keys(phien).length} phiên)`);
    return 0;
  }
  if (lenh === 'dong-goi') {
    const du = JSON.parse(fs.readFileSync(fData, 'utf8'));
    const loi = kiem(du);
    if (loi.length) { console.error('LỖI dữ liệu:\n  ' + loi.join('\n  ')); return 1; }
    const bang = dongGoi(du);
    du.capNhat = bang.capNhat;
    fs.writeFileSync(fData, JSON.stringify(du, null, 2) + '\n');
    const out = path.join(ROOT, 'output/trung-tam/bang.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(bang));
    const d = bang.dem;
    console.log(`OK ${bang.rows.length} phiên · đang làm ${d['dang-lam']} · chờ bạn ${d['cho-ban']} · tạm nghỉ ${d['tam-nghi']} · xong ${d.xong}`);
    console.log(`Ghi lên trang: ArtifactData set url=${URL_TRANG} collection=bang doc_id=hientai file_path=${out} (+ if_version)`);
    return 0;
  }
  console.log('Dùng: node tools/trung-tam.mjs diem-dung [--ngay 2] | dong-goi | tao-tu <thư mục>');
  return lenh ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
