// Kiểm bang-shot.json — đặc tả: docs/quy-trinh-dau-vao.md
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const RE_SHOT = /^s\d{3,}[a-z]*$/;
const RE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const LOAI = ['zoomIn', 'zoomOut', 'lia', 'theo', 'dung', 'doiHuong'];
const GOC = ['ngang-mat', 'tren-xuong', 'duoi-len', 'qua-vai'];
const CO = ['toan', 'trung', 'can', 'dac-ta'];
const KY_TU_GIAY = 14;          // nhịp đọc tiếng Việt (skill viet-kich-ban)
const DUR_TOI_THIEU = 0.8;      // ngắn hơn đọc như giật hình
const DUNG_TOI_DA = 0.1;        // luật camera dồn dập: shot camera đứng yên ≤ 10%
const TONG_TAP = [120, 180];    // chỉ kiểm khi đủ dài để là cả tập

export function hongDau(s) {
  return typeof s === 'string' && (s.includes('�') || /\p{L}\?\p{L}/u.test(s));
}
export function quetChuoi(obj, cb, dau = '') {
  if (typeof obj === 'string') cb(obj, dau);
  else if (Array.isArray(obj)) obj.forEach((v, i) => quetChuoi(v, cb, `${dau}[${i}]`));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) quetChuoi(v, cb, `${dau}.${k}`);
}
const coChu = (v) => typeof v === 'string' && v.trim() !== '';

export function kiemBangShot(data) {
  const loi = [], canhBao = [];
  const L = (shot, msg) => loi.push({ shot, msg });
  const W = (shot, msg) => canhBao.push({ shot, msg });
  if (!data || typeof data !== 'object') { L('-', 'dữ liệu không phải đối tượng JSON'); return { loi, canhBao }; }
  if (!coChu(data.ep)) L('-', 'thiếu trường "ep"');
  for (const k of ['nhanVat', 'boiCanh', 'shots'])
    if (!Array.isArray(data[k])) L('-', `thiếu mảng "${k}"`);
  if (!Array.isArray(data.shots)) return { loi, canhBao };
  if (data.shots.length === 0) L('-', 'danh sách shot rỗng');

  const nv = new Set(), bc = new Set();
  for (const [ten, khoa, tap] of [['nhân vật', 'nhanVat', nv], ['bối cảnh', 'boiCanh', bc]]) {
    for (const o of (data[khoa] || [])) {
      if (!o || typeof o.id !== 'string') { L('-', `${ten} thiếu id`); continue; }
      if (!RE_SLUG.test(o.id)) L('-', `id ${ten} "${o.id}" phải là chữ thường không dấu, gạch nối`);
      if (tap.has(o.id)) L('-', `id ${ten} "${o.id}" bị trùng`);
      tap.add(o.id);
    }
  }
  quetChuoi({ nhanVat: data.nhanVat, boiCanh: data.boiCanh }, (s, d) => {
    if (hongDau(s)) L('-', `hỏng dấu tiếng Việt ở ${d.slice(1)}: "${s}"`);
  });

  const thay = new Set();
  let n3 = 0;
  data.shots.forEach((s, i) => {
    const id = s && typeof s.id === 'string' ? s.id : `#${i + 1}`;
    if (!s || typeof s !== 'object') { L(id, 'shot không phải đối tượng'); return; }
    if (!RE_SHOT.test(id)) L(id, 'id shot phải dạng s001 hoặc s012a');
    if (thay.has(id)) L(id, 'id shot bị trùng');
    thay.add(id);
    if (!bc.has(s.boiCanh)) L(id, `bối cảnh "${s.boiCanh}" không có trong danh sách boiCanh`);
    if (!Array.isArray(s.nhanVat)) L(id, 'thiếu mảng nhanVat');
    else for (const n of s.nhanVat) if (!nv.has(n)) L(id, `nhân vật "${n}" không có trong danh sách nhanVat`);
    if (!(typeof s.dur === 'number' && s.dur > 0)) L(id, `dur phải là số > 0 (đang là ${JSON.stringify(s.dur)})`);
    if (s.thoai !== undefined && typeof s.thoai !== 'string') L(id, 'thoai phải là chuỗi');
    const c = s.camera;
    if (!c || typeof c !== 'object') L(id, 'thiếu camera');
    else {
      if (!LOAI.includes(c.loai)) L(id, `camera.loai "${c.loai}" không hợp lệ (${LOAI.join(' | ')})`);
      if (!GOC.includes(c.gocMay)) L(id, `camera.gocMay "${c.gocMay}" không hợp lệ (${GOC.join(' | ')})`);
      if (!Array.isArray(c.coKhung) || c.coKhung.length !== 2 || !c.coKhung.every((x) => CO.includes(x)))
        L(id, `camera.coKhung phải là mảng 2 phần tử thuộc ${CO.join(' | ')}`);
    }
    const h = s.hinh;
    if (![1, 2, 3].includes(h)) L(id, `hinh phải là 1, 2 hoặc 3 (đang là ${JSON.stringify(h)})`);
    else {
      const can = h === 1 ? ['dau'] : h === 2 ? ['dau', 'cuoi'] : ['dau', 'giua', 'cuoi'];
      for (const k of can) if (!coChu(s[k])) L(id, `hinh:${h} thiếu mô tả "${k}"`);
      if (h >= 2 && !coChu(s.hanhDong)) L(id, `hinh:${h} thiếu "hanhDong"`);
      if (h === 3) n3++;
    }
    if (c && c.loai === 'dung' && h !== 1) L(id, 'camera "dung" chỉ đi với hinh:1');
    if (c && c.loai === 'doiHuong' && h !== 3) L(id, 'camera "doiHuong" chỉ đi với hinh:3');
    if (Array.isArray(s.nhanVat) && c) {
      if (s.nhanVat.length === 1 && c.loai === 'zoomOut') W(id, 'shot 1 nhân vật nhưng zoomOut (luật: 1 người → zoomIn)');
      if (s.nhanVat.length >= 2 && c.loai === 'zoomIn') W(id, 'shot từ 2 nhân vật nhưng zoomIn (luật: zoomOut)');
    }
    quetChuoi(s, (str, d) => { if (hongDau(str)) L(id, `hỏng dấu tiếng Việt ở ${d.slice(1)}: "${str}"`); });
  });
  // --- luật học từ lint của nocodehack, đổi cho "Ở thị trấn này" (chỉ CẢNH BÁO) ---
  const dungDen = new Set();
  let nDung = 0, tong = 0, truoc = null;
  for (const s of data.shots) {
    if (!s || typeof s !== 'object') continue;
    const id = typeof s.id === 'string' ? s.id : '?';
    if (typeof s.dur === 'number') {
      tong += s.dur;
      if (s.dur > 0 && s.dur < DUR_TOI_THIEU) W(id, `dur ${s.dur} s < ${DUR_TOI_THIEU} s: đọc như giật hình, gộp với shot kề`);
      if (coChu(s.thoai) && s.dur > 0) {
        const can = s.thoai.trim().length / KY_TU_GIAY;
        if (can > s.dur * 1.25 + 0.3) W(id, `thoại cần ~${can.toFixed(1)} s để đọc nhưng shot chỉ dài ${s.dur} s: rút thoại hoặc tăng dur`);
      }
    }
    if (typeof s.boiCanh === 'string') dungDen.add('b:' + s.boiCanh);
    if (Array.isArray(s.nhanVat)) for (const n of s.nhanVat) dungDen.add('n:' + n);
    const c = s.camera;
    if (c && c.loai === 'dung') nDung++;
    if (truoc && c && truoc.c && truoc.b === s.boiCanh && truoc.c.loai === c.loai && truoc.c.gocMay === c.gocMay)
      W(id, `cùng bối cảnh, cùng camera (${c.loai}/${c.gocMay}) với shot ${truoc.id} liền trước: đơn điệu, đổi loại hoặc góc máy`);
    truoc = { id, b: s.boiCanh, c };
  }
  for (const [ten, khoa, ma] of [['nhân vật', 'nhanVat', 'n:'], ['bối cảnh', 'boiCanh', 'b:']]) {
    for (const o of (data[khoa] || [])) {
      if (!o || typeof o.id !== 'string') continue;
      if (!dungDen.has(ma + o.id)) W('-', `${ten} "${o.id}" khai báo nhưng không shot nào dùng`);
      if (!coChu(o.moTa)) W('-', `${ten} "${o.id}" thiếu moTa: tờ mẫu vẽ không nhất quán giữa các shot`);
    }
  }
  if (data.shots.length >= 10 && nDung / data.shots.length > DUNG_TOI_DA)
    W('-', `${nDung}/${data.shots.length} shot camera "dung" (${Math.round(100 * nDung / data.shots.length)}%, quá ${DUNG_TOI_DA * 100}%): luật camera dồn dập`);
  if (data.shots.length >= 60 && (tong < TONG_TAP[0] || tong > TONG_TAP[1]))
    W('-', `tổng ${tong.toFixed(1)} s ngoài ${TONG_TAP[0]}–${TONG_TAP[1]} s của một tập`);
  if (data.shots.length && n3 / data.shots.length > 0.2)
    W('-', `shot hinh:3 chiếm ${Math.round(100 * n3 / data.shots.length)}% (quá 20%)`);
  return { loi, canhBao };
}

export function inKetQua({ loi, canhBao }, tenKiem, tong) {
  const out = [];
  for (const e of loi) out.push(`LỖI ${e.shot}: ${e.msg}`);
  for (const e of canhBao) out.push(`CẢNH BÁO ${e.shot}: ${e.msg}`);
  out.push(`${tenKiem}: ${tong} shot · ${loi.length} lỗi · ${canhBao.length} cảnh báo`);
  process.stdout.write(out.join('\n') + '\n');
  return loi.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2];
  if (!dir) { process.stdout.write('Cách dùng: node tools/kiem-bang-shot.mjs <thư mục tập>\n'); process.exit(1); }
  const f = path.join(dir, 'bang-shot.json');
  let data;
  try { data = JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { process.stdout.write(`LỖI -: không đọc được ${f}: ${e.message}\n`); process.exit(1); }
  process.exitCode = inKetQua(kiemBangShot(data), 'kiem-bang-shot', (data.shots || []).length);
}
