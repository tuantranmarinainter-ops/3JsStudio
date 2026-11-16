#!/usr/bin/env node
// codex-ve.mjs — soạn đề bài theo cụm và chạy nhiều tiến trình Codex CLI song song để vẽ hình storyboard.
// Dùng: node tools/codex-ve.mjs <tham-chieu|shot> <thư mục tập> [--thu] [--tran N] [--model M] [--muc low] [--chi s001,s002] [--huong truoc,sau] [--chong]
// Mã thoát: 0 đủ hình · 1 còn thiếu · 2 lỗi đầu vào. Đặc tả: docs/quy-trinh-dau-vao.md, docs/de-bai-codex-mau.md.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HUONG_BOI_CANH, locHuong } from './huong-boi-canh.mjs';

const TOI_DA_HINH_THAM_CHIEU = 6;
const TOI_DA_SHOT_MOT_CUM = 25;

const NHAN_LOAI = { zoomIn: 'zoom vào', zoomOut: 'zoom ra', lia: 'lia ngang', theo: 'máy bám theo', dung: 'máy đứng yên', doiHuong: 'máy đổi hướng' };
const NHAN_GOC = { 'ngang-mat': 'ngang tầm mắt', 'tren-xuong': 'từ trên xuống', 'duoi-len': 'từ dưới lên', 'qua-vai': 'qua vai' };
const NHAN_CO = { toan: 'toàn', trung: 'trung', can: 'cận', 'dac-ta': 'đặc tả' };

// Quy tắc cho Codex: mục 3 của docs/de-bai-codex-mau.md
export const QUY_TAC = [
  'Chỉ vẽ đúng các file liệt kê ở mục "File phải tạo". Tên file đúng từng ký tự, đúng thư mục (tính từ thư mục làm việc hiện tại).',
  'Khổ dọc 9:16. Các hình của cùng một shot phải giữ nguyên: bối cảnh, đạo cụ, trang phục, cỡ nhân vật so với đồ vật; chỉ thay đổi thứ được ghi ở camera và hành động.',
  'Nhân vật vẽ theo ảnh tham chiếu đính kèm, không tự đổi tỉ lệ hay màu.',
  'Làm theo từng cụm; xong thì ghi file tiến độ (shot/hình nào xong, hình nào không vẽ được và vì sao).',
  'Không sửa mô tả. Thấy mô tả mâu thuẫn thì ghi vào file tiến độ, không tự đoán.',
  'Chỉ ghi các file của cụm này và file tiến độ riêng của cụm này; không ghi chung file với cụm khác.',
];

const QUY_TAC_THAM_CHIEU = [
  'Tờ mẫu nhân vật (nv_*): một tờ gồm góc trước, góc nghiêng, góc sau và 4 biểu cảm, nền trơn một màu, phong cách khối vuông (blocky).',
  'Ảnh bối cảnh (bc_*): toàn cảnh khổ dọc 9:16, tuyệt đối không có nhân vật.',
  'Ảnh bối cảnh vẽ đủ 8 hướng (trước, sau, trái, phải, từ trên xuống, từ dưới lên, thẳng mặt, ngang hông), mỗi hướng một file riêng; các hướng phải khớp nhau: cùng mốc, cùng màu, cùng số lượng đồ.',
];

const nhan = (map, k) => map[k] || k || '';

// Ảnh khối xám của bối cảnh (quy ước đường dẫn trong thư mục tập): docs/quy-trinh-dau-vao.md
export const GOC_KHOI_XAM = HUONG_BOI_CANH.map((h) => h.id);
export const duongKhoiXam = (id) => GOC_KHOI_XAM.map((g) => `boi-canh/${id}_${g}.png`);
export const duongMoc = (id) => `boi-canh/${id}.json`;
// Vẽ TỰ DO (mặc định từ 16/11, ep005t #23): máy vẽ của Codex không nhận ảnh cục bộ → không vẽ chồng được; Codex chép/lọc màu khối xám.
export const CAU_TU_DO = 'Vẽ ảnh MỚI hoàn toàn bằng công cụ tạo hình theo chữ (KHÔNG chép, cắt, lọc màu hay chỉnh ảnh có sẵn bằng script); bố cục theo danh sách mốc và trục ảnh ghi ở đây; không thêm/bớt mốc, không thêm đồ ngoài danh sách, không vẽ nhân vật, không vẽ chữ hay nhãn.';
// Trục thế giới → trục ảnh cho từng hướng (để Codex đặt mốc theo "vùng: x…, z…")
export const TRUC_ANH = {
  truoc: 'trong ảnh: +X sang phải, −Z là phía xa (sâu vào ảnh), +Z gần máy',
  sau: 'trong ảnh: +X sang TRÁI, +Z là phía xa, −Z gần máy',
  trai: 'trong ảnh: +Z sang trái, −Z sang phải, +X là phía xa',
  phai: 'trong ảnh: −Z sang trái, +Z sang phải, −X là phía xa',
  'tren-xuong': 'trong ảnh: +X sang phải, −Z lên đỉnh ảnh, +Z xuống đáy ảnh',
  'duoi-len': 'trong ảnh: +X sang phải, vật cao vươn lên đỉnh ảnh, phía xa là −Z',
  'thang-mat': 'trong ảnh: +X sang phải, −Z là phía xa, đường chân trời ở giữa ảnh',
  'ngang-hong': 'trong ảnh: −Z sang trái, +Z sang phải, −X là phía xa, đường chân trời ở giữa ảnh',
};
export const CAU_BAT_BUOC_KHOI_XAM = 'Vẽ chồng lên ảnh khối xám đính kèm, không đổi hình khối, không thêm/bớt mốc, không vẽ nhân vật.';

function camMoTa(cam) {
  if (!cam) return '';
  const co = Array.isArray(cam.coKhung) ? cam.coKhung.map((k) => nhan(NHAN_CO, k)).join(' → ') : '';
  return [nhan(NHAN_LOAI, cam.loai), nhan(NHAN_GOC, cam.gocMay), co && `cỡ khung ${co}`].filter(Boolean).join(', ');
}

export function hinhCuaShot(s) {
  const n = Number(s.hinh) || 1;
  return n >= 3 ? ['dau', 'giua', 'cuoi'] : n === 2 ? ['dau', 'cuoi'] : ['dau'];
}

const NHAN_VI_TRI = { dau: 'khung ĐẦU', giua: 'khung GIỮA', cuoi: 'khung CUỐI' };

function moTaHinhShot(bs, s, vi) {
  const bc = (bs.boiCanh || []).find((b) => b.id === s.boiCanh);
  const nvs = (s.nhanVat || []).map((id) => (bs.nhanVat || []).find((n) => n.id === id)?.ten || id);
  const phan = [`${NHAN_VI_TRI[vi]} của shot ${s.id}: ${s[vi]}`];
  phan.push(`Bối cảnh: ${bc?.ten || s.boiCanh}`);
  phan.push(`Nhân vật: ${nvs.length ? nvs.join(', ') : 'không có'}`);
  const cam = camMoTa(s.camera);
  if (cam) phan.push(`Camera: ${cam}`);
  if (s.hanhDong) phan.push(`Hành động cả shot: ${s.hanhDong}`);
  if (s.thoai) phan.push(`Lời thoại: ${s.thoai}`);
  return phan.join(' · ');
}

function chiaDoi(arr) {
  if (arr.length <= TOI_DA_SHOT_MOT_CUM) return [arr];
  const m = Math.ceil(arr.length / 2);
  return [...chiaDoi(arr.slice(0, m)), ...chiaDoi(arr.slice(m))];
}

/**
 * Lập kế hoạch các cụm. Chỉ đưa hình CHƯA có file (coFile(relPath) → boolean).
 * docMoc(id) → nội dung boi-canh/<id>.json hoặc null (không có thì giữ hành vi cũ: dùng moTa).
 * @returns {{cum:string, cheDo:string, hinh:{file:string, moTa:string, moc?:object, khoiXam?:string[]}[], anhKem:string[], nhanVat:string[], boiCanh?:string}[]}
 */
export function lapKeHoach(bs, cheDo, { coFile = () => false, chi = null, docMoc = () => null, huong = null, chong = false } = {}) {
  const loc = (id) => !chi || chi.includes(id);
  const cumList = [];

  if (cheDo === 'tham-chieu') {
    const muc = [];
    for (const n of bs.nhanVat || []) {
      if (!loc(n.id)) continue;
      muc.push({ file: `tham-chieu/nv_${n.id}.png`, moTa: `Tờ mẫu nhân vật "${n.ten || n.id}": ${n.moTa || ''}. Bố cục: góc trước, góc nghiêng, góc sau, và 4 biểu cảm khác nhau; nền trơn một màu; phong cách khối vuông.` });
    }
    for (const b of bs.boiCanh || []) {
      if (!loc(b.id)) continue;
      const moc = docMoc(b.id);
      if (moc) {
        for (const hg of locHuong(huong)) {
          const khoiXam = chong ? [`boi-canh/${b.id}_${hg.id}.png`].filter((f) => coFile(f)) : [];
          const cau = khoiXam.length ? CAU_BAT_BUOC_KHOI_XAM : chong ? 'Vẽ đúng theo danh sách mốc, không thêm/bớt mốc, không vẽ nhân vật (chưa có ảnh khối xám hướng này).' : `${CAU_TU_DO} Trục: ${TRUC_ANH[hg.id]}.`;
          muc.push({ file: `tham-chieu/bc_${b.id}_${hg.id}.png`, moc, khoiXam, huong: hg.id,
            moTa: `Toàn cảnh bối cảnh "${b.ten || b.id}", khổ dọc 9:16, HƯỚNG ${hg.ten.toUpperCase()}: ${hg.moTa}. ${cau} Chi tiết ở mục "Danh sách mốc bối cảnh ${b.id}". Phải khớp các hướng còn lại (cùng mốc, màu, số lượng đồ).` });
        }
      } else {
        muc.push({ file: `tham-chieu/bc_${b.id}.png`, moTa: `Toàn cảnh bối cảnh "${b.ten || b.id}": ${b.moTa || ''}. Khổ dọc 9:16, không có nhân vật; phong cách khối vuông.` });
      }
    }
    const can = muc.filter((m) => !coFile(m.file));
    if (!can.length) return [];
    const n = Math.ceil(can.length / TOI_DA_HINH_THAM_CHIEU);
    const moi = Math.ceil(can.length / n);
    for (let i = 0; i < n; i++) {
      const hinh = can.slice(i * moi, (i + 1) * moi);
      const anhKem = [...new Set(hinh.flatMap((h) => h.khoiXam || []))];
      if (hinh.length) cumList.push({ cum: `tc${i + 1}`, cheDo, hinh, anhKem, nhanVat: [] });
    }
    return cumList;
  }

  // chế độ shot: gom theo bối cảnh theo thứ tự khai báo
  const thuTu = (bs.boiCanh || []).map((b) => b.id);
  for (const s of bs.shots || []) if (!thuTu.includes(s.boiCanh)) thuTu.push(s.boiCanh);
  for (const bcId of thuTu) {
    const shots = (bs.shots || []).filter((s) => s.boiCanh === bcId && loc(s.id));
    if (!shots.length) continue;
    const manh = chiaDoi(shots);
    manh.forEach((nhom, i) => {
      const hinh = [];
      const nvSet = [];
      for (const s of nhom) {
        for (const vi of hinhCuaShot(s)) {
          const file = `hinh/shot_${s.id}_${vi}.png`;
          if (coFile(file)) continue;
          hinh.push({ file, moTa: moTaHinhShot(bs, s, vi) });
          for (const id of s.nhanVat || []) if (!nvSet.includes(id)) nvSet.push(id);
        }
      }
      if (!hinh.length) return;
      const ten = manh.length > 1 ? `${bcId}-${i + 1}` : bcId;
      const anhBc = docMoc(bcId) ? [`tham-chieu/bc_${bcId}_truoc.png`, `tham-chieu/bc_${bcId}_tren-xuong.png`] : [`tham-chieu/bc_${bcId}.png`];
      const anhKem = [...anhBc, ...nvSet.map((id) => `tham-chieu/nv_${id}.png`)];
      cumList.push({ cum: ten, cheDo, hinh, anhKem, nhanVat: nvSet, boiCanh: bcId });
    });
  }
  return cumList;
}

const dsMau = (m) => (Array.isArray(m) ? m.join(', ') : m || '');

/** Mục Markdown mô tả một bối cảnh từ file danh sách mốc (boi-canh/<id>.json). */
function moMocBoiCanh(h, id) {
  const m = h.moc;
  const L = [`## Danh sách mốc bối cảnh ${id}`];
  if (h.khoiXam?.length) L.push(`- ${CAU_BAT_BUOC_KHOI_XAM} Ảnh khối xám của bối cảnh này: ${h.khoiXam.join(', ')}.`);
  else L.push(`- ${CAU_TU_DO}`, '- Phong cách khối vuông low poly kiểu Roblox: mặt phẳng, cạnh vuông, ít chi tiết nhỏ; giữ đúng mã màu từng mốc.');
  L.push('- Số đo (stud) chỉ lấy từ danh sách này, không đoán từ ảnh.');
  if (m.phongCach || m.bangMau) L.push(`- Phong cách: ${m.phongCach || 'khối vuông'}${m.bangMau ? ` · bảng màu: ${dsMau(m.bangMau)}` : ''}`);
  if (m.heQuyChieu) L.push(`- Hệ quy chiếu: ${m.heQuyChieu}`);
  if (m.kichThuoc) L.push(`- Kích thước: ${JSON.stringify(m.kichThuoc)} ${m.donVi || 'stud'}`);
  if (m.vatDoCo?.length) {
    L.push('', '### Vật đo cỡ');
    for (const v of m.vatDoCo) L.push(`- ${v.ten}${v.dat ? ` tại [${v.dat.join(', ')}]` : ''}${v.ghiChu ? ` — ${v.ghiChu}` : ''}`);
  }
  const moc = (m.moc || []).filter((x) => x.bat !== false);
  L.push('', `### Các mốc (${moc.length}) — phải có đủ, đúng chỗ`);
  for (const x of moc) {
    const f = [x.vaiTro && `vai trò: ${x.vaiTro}`, x.vung && `vùng: ${x.vung}`, x.kichThuoc && `kích thước: ${x.kichThuoc}`,
      x.mau && `màu: ${dsMau(x.mau)}`, x.vatLieu && `vật liệu: ${x.vatLieu}`].filter(Boolean);
    L.push(`- ${x.ten || x.id} [${x.id}]${f.length ? ` — ${f.join(' · ')}` : ''}`);
  }
  if (m.lapDay?.length) {
    L.push('', '### Đồ lấp đầy (đúng số lượng, đúng cụm)');
    for (const c of m.lapDay) L.push(`- ${c.cum}: ${(c.mon || []).map((o) => `${o.soLuong ?? 1} × ${o.ten}`).join('; ')}`);
  }
  if (m.chuaTrong?.length) { L.push('', '### Vùng phải để trống'); for (const c of m.chuaTrong) L.push(`- ${c}`); }
  if (m.cam?.length) { L.push('', '### Điều cấm'); for (const c of m.cam) L.push(`- ${c}`); }
  if (m.anhSang) {   // chuỗi, hoặc object theo giờ {ngay, chapToi, dem…} khi bối cảnh có nhiều biến thể giờ
    L.push('', '### Ánh sáng');
    if (typeof m.anhSang === 'object') for (const [gio, v] of Object.entries(m.anhSang)) L.push(`- ${gio}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
    else L.push(`- ${m.anhSang}`);
  }
  L.push('');
  return L;
}

/** Soạn nội dung đề bài (Markdown) cho một cụm. */
export function soanDeBai(cum, bs = {}) {
  const L = [];
  L.push(`# Đề bài vẽ hình — tập ${bs.ep || '?'} — cụm ${cum.cum} (${cum.cheDo})`, '');
  L.push('Bạn là người vẽ. Dùng công cụ tạo hình để tạo ĐÚNG các file bên dưới; mỗi file là một ảnh PNG.', '');
  L.push('## Quy tắc');
  for (const q of QUY_TAC) L.push(`- ${q}`);
  if (cum.cheDo === 'tham-chieu') for (const q of QUY_TAC_THAM_CHIEU) L.push(`- ${q}`);
  L.push('');
  if (cum.anhKem?.length) {
    L.push(cum.cheDo === 'tham-chieu' ? '## Ảnh khối xám đính kèm (nền để vẽ chồng lên)' : '## Ảnh tham chiếu đính kèm (đã duyệt)');
    for (const a of cum.anhKem) L.push(`- ${a}`);
    L.push('');
  }
  if (cum.cheDo === 'shot' && cum.boiCanh) {
    const bc = (bs.boiCanh || []).find((b) => b.id === cum.boiCanh);
    if (bc) L.push('## Bối cảnh của cụm', `- ${bc.ten || bc.id}: ${bc.moTa || ''}`, '');
    const nvs = (cum.nhanVat || []).map((id) => (bs.nhanVat || []).find((n) => n.id === id)).filter(Boolean);
    if (nvs.length) { L.push('## Nhân vật trong cụm'); for (const n of nvs) L.push(`- ${n.ten || n.id}: ${n.moTa || ''}`); L.push(''); }
  }
  const daMoc = new Set();
  for (const h of cum.hinh) {
    if (!h.moc) continue;
    const id = h.moc.boiCanh || path.basename(h.file, '.png').replace(/^bc_/, '').replace(/_[a-z-]+$/, '');
    if (daMoc.has(id)) continue;
    daMoc.add(id);
    const khoiXam = [...new Set(cum.hinh.filter((k) => k.moc === h.moc).flatMap((k) => k.khoiXam || []))];
    L.push(...moMocBoiCanh({ ...h, khoiXam }, id));
  }
  L.push(`## File phải tạo (${cum.hinh.length} hình)`);
  for (const h of cum.hinh) L.push(`- FILE: ${h.file} — ${h.moTa}`);
  L.push('');
  L.push('## Tiến độ');
  L.push(`- TIEN-DO: codex/tien-do-${cum.cum}.txt`);
  L.push('Ghi file trên khi xong: mỗi dòng một hình, dạng "xong <tên file>" hoặc "không vẽ được <tên file>: <lý do>"; ghi thêm mâu thuẫn trong mô tả nếu có.', '');
  return L.join('\n');
}

// ---------- chạy Codex ----------
const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;

/** Nhóm các file có cùng md5 (≥ 2 file mỗi nhóm). */
export function timTrung(files, thuMuc = '.') {
  const m = new Map();
  for (const f of files) { const p = path.join(thuMuc, f); if (!fs.existsSync(p)) continue; const h = crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'); m.set(h, [...(m.get(h) || []), f]); }
  return [...m.values()].filter((g) => g.length > 1);
}

/** Hình ra là bản CHÉP/LỌC MÀU ảnh kèm thay vì ảnh vẽ mới (ep005t trạm 8: Codex không đưa được ảnh cục bộ vào máy vẽ nên chép
 *  khối xám hoặc phủ màu bằng script). So pixel (sharp, 64×64): lệch TB < nguong → chép. cungCo = cùng kích thước ảnh kèm (dấu hiệu
 *  xử lý bằng script; ảnh vẽ thật thường khác cỡ). Trả [{file, anh, lech, cungCo, chep}] cho mọi hình có ảnh kèm cùng hướng. */
export async function timChepAnhKem(ke, thuMuc = '.', { nguong = 5 } = {}) {
  const sharp = (await import('sharp')).default;
  const doc = async (p) => { const im = sharp(p); const m = await im.metadata(); const px = await sharp(p).removeAlpha().resize(64, 64, { fit: 'fill' }).raw().toBuffer(); return { w: m.width, h: m.height, px }; };
  const ra = [];
  for (const c of ke) for (const h of c.hinh) {
    const p = path.join(thuMuc, h.file); if (!fs.existsSync(p)) continue;
    const kem = (h.khoiXam || []).filter((a) => fs.existsSync(path.join(thuMuc, a)));
    if (!kem.length) continue;
    let A; try { A = await doc(p); } catch { continue; }   // không phải ảnh đọc được → bỏ qua
    for (const k of kem) {
      let B; try { B = await doc(path.join(thuMuc, k)); } catch { continue; } let s = 0; for (let i = 0; i < A.px.length; i++) s += Math.abs(A.px[i] - B.px[i]);
      const lech = s / A.px.length, cungCo = A.w === B.w && A.h === B.h;
      ra.push({ file: h.file, anh: k, lech: +lech.toFixed(1), cungCo, chep: lech < nguong });
    }
  }
  return ra;
}

export function lenhCho(cum, { thuMuc, model, muc, codexBin, anh }) {
  const parts = [codexBin, 'exec', '-C', q(thuMuc), '-s', 'workspace-write', '--skip-git-repo-check', '-m', model,
    '-c', q(`model_reasoning_effort="${muc}"`)];
  if (anh.length) parts.push('-i', ...anh.map(q));
  parts.push('-o', q(path.join(thuMuc, 'codex', `${cum.cum}.log`)), '-');
  return parts.join(' ');
}

function chayMotCum(lenh, deBai, thuMuc) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let out = '';
    const child = spawn(lenh, { shell: true, cwd: thuMuc, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const gom = (d) => { if (out.length < 200000) out += d.toString('utf8'); };
    child.stdout.on('data', gom);
    child.stderr.on('data', gom);
    child.stdin.on('error', () => {});
    child.on('error', (e) => { out += `\nLỗi khởi chạy: ${e.message}`; });
    child.on('close', (ma) => resolve({ ma, out, giay: (Date.now() - t0) / 1000 }));
    child.stdin.end(deBai, 'utf8');
  });
}

async function hangDoi(viec, tran, fn) {
  let i = 0;
  const tho = Array.from({ length: Math.max(1, Math.min(tran, viec.length)) }, async () => {
    while (i < viec.length) { const k = i++; await fn(viec[k]); }
  });
  await Promise.all(tho);
}

const GIOI_HAN = /\b429\b|rate[\s_-]?limit/i;

function docThamSo(argv) {
  const r = { vitri: [], thu: false, tran: 6, model: 'gpt-6-luna', muc: 'low', chi: null, huong: null, chong: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--thu') r.thu = true;
    else if (a === '--tran') r.tran = parseInt(argv[++i], 10);
    else if (a === '--model') r.model = argv[++i];
    else if (a === '--muc') r.muc = argv[++i];
    else if (a === '--chi') r.chi = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--huong') r.huong = argv[++i];
    else if (a === '--chong') r.chong = true;   // vẽ chồng lên khối xám (cách cũ; Codex hiện không làm được — #23)
    else if (a.startsWith('--')) r.loi = `Cờ không biết: ${a}`;
    else r.vitri.push(a);
  }
  return r;
}

export async function chay(argv, env = process.env) {
  const t = docThamSo(argv);
  const dung = 'Dùng: node tools/codex-ve.mjs <tham-chieu|shot> <thư mục tập> [--thu] [--tran N] [--model M] [--muc low] [--chi s001,s002] [--huong truoc,sau] [--chong]';
  if (t.loi || t.vitri.length !== 2 || !['tham-chieu', 'shot'].includes(t.vitri[0]) || !(t.tran >= 1) || !t.model || !t.muc) {
    console.error(`${t.loi || 'Tham số không hợp lệ.'}\n${dung}`);
    return 2;
  }
  try { locHuong(t.huong); } catch (e) { console.error(e.message); return 2; }
  const cheDo = t.vitri[0];
  const thuMuc = path.resolve(t.vitri[1]);
  const fBang = path.join(thuMuc, 'bang-shot.json');
  if (!fs.existsSync(fBang)) { console.error(`Không thấy ${fBang}`); return 2; }
  let bs;
  try { bs = JSON.parse(fs.readFileSync(fBang, 'utf8')); } catch (e) { console.error(`bang-shot.json hỏng: ${e.message}`); return 2; }
  if (cheDo === 'shot' && !t.thu && !fs.existsSync(path.join(thuMuc, 'duyet-1.json'))) {
    console.error('Thiếu duyet-1.json: người dùng chưa duyệt cổng 1 nên chưa được vẽ hình shot. (Dùng --thu để chỉ xem kế hoạch.)');
    return 2;
  }

  const coFile = (rel) => { try { return fs.statSync(path.join(thuMuc, rel)).size > 0; } catch { return false; } };
  let loiMoc = null;
  const docMoc = (id) => {
    const f = path.join(thuMuc, duongMoc(id));
    if (!fs.existsSync(f)) return null;
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { loiMoc = `${duongMoc(id)} hỏng: ${e.message}`; return null; }
  };
  const ke = lapKeHoach(bs, cheDo, { coFile, chi: t.chi, docMoc, huong: t.huong, chong: t.chong });
  if (loiMoc) { console.error(loiMoc); return 2; }
  if (!ke.length) { console.log(`Đủ hình (${cheDo}): không còn hình nào cần vẽ.`); return 0; }

  const dirCodex = path.join(thuMuc, 'codex');
  fs.mkdirSync(dirCodex, { recursive: true });
  const codexBin = env.CODEX_BIN || 'codex';
  const anhCoSan = (cum) => cum.anhKem.filter((a) => fs.existsSync(path.join(thuMuc, a))).map((a) => path.join(thuMuc, a));
  const ghiDeBai = (cum) => {
    const f = path.join(dirCodex, `de-bai-${cheDo}-${cum.cum}.md`);
    fs.writeFileSync(f, soanDeBai(cum, bs), 'utf8');
    return f;
  };
  const lenhMoi = (cum) => lenhCho(cum, { thuMuc, model: t.model, muc: t.muc, codexBin, anh: anhCoSan(cum) });

  const tongHinh = ke.reduce((n, c) => n + c.hinh.length, 0);
  console.log(`Kế hoạch ${cheDo}: ${ke.length} cụm, ${tongHinh} hình, trần song song ${t.tran}, model ${t.model} (${t.muc}).`);
  for (const c of ke) {
    ghiDeBai(c);
    const thieuAnh = c.anhKem.filter((a) => !fs.existsSync(path.join(thuMuc, a)));
    console.log(`- cụm ${c.cum}: ${c.hinh.length} hình, ${anhCoSan(c).length} ảnh kèm${thieuAnh.length ? ` (chưa có: ${thieuAnh.join(', ')})` : ''}`);
    if (t.thu) console.log(`    ${lenhMoi(c)} < codex/de-bai-${cheDo}-${c.cum}.md`);
  }
  if (t.thu) { console.log('Chế độ --thu: đã ghi đề bài vào codex/, không chạy Codex.'); return 0; }

  const kq = new Map(ke.map((c) => [c.cum, { cum: c.cum, can: c.hinh.length, giay: 0, gioiHan: false, chayLai: false, maThoat: null }]));

  const chayCum = async (cum, lanLai) => {
    // tính lại hình còn thiếu để không vẽ lại hình đã có
    const moi = lapKeHoach(bs, cheDo, { coFile, chi: t.chi, docMoc, huong: t.huong, chong: t.chong }).find((c) => c.cum === cum.cum);
    const r = kq.get(cum.cum);
    if (!moi) return;
    ghiDeBai(moi);
    console.log(`Chạy cụm ${cum.cum}${lanLai ? ' (chạy lại, trần giảm)' : ''}: ${moi.hinh.length} hình...`);
    const res = await chayMotCum(lenhMoi(moi), soanDeBai(moi, bs), thuMuc);
    r.giay += res.giay;
    r.maThoat = res.ma;
    let log = '';
    try { log = fs.readFileSync(path.join(dirCodex, `${cum.cum}.log`), 'utf8'); } catch { /* chưa có */ }
    try { fs.writeFileSync(path.join(dirCodex, `${cum.cum}.out.log`), res.out, 'utf8'); } catch { /* bỏ qua */ }
    if (GIOI_HAN.test(res.out) || GIOI_HAN.test(log)) r.gioiHan = true;
    if (lanLai) r.chayLai = true;
  };

  await hangDoi(ke, t.tran, (c) => chayCum(c, false));

  const conThieu = (cum) => cum.hinh.filter((h) => !coFile(h.file));
  const bi = ke.filter((c) => kq.get(c.cum).gioiHan && conThieu(c).length);
  if (bi.length) {
    const tran2 = Math.max(1, Math.floor(t.tran / 2));
    console.log(`Bị giới hạn (429/rate limit) ở ${bi.length} cụm: chạy lại một lần với trần ${tran2}.`);
    await hangDoi(bi, tran2, (c) => chayCum(c, true));
  }

  // kiểm lại
  const bang = [];
  const thieuTat = [];
  for (const c of ke) {
    const th = conThieu(c);
    const r = kq.get(c.cum);
    r.co = c.hinh.length - th.length;
    r.thieu = th.map((h) => h.file);
    thieuTat.push(...r.thieu);
    bang.push(r);
  }
  console.log('\nCụm'.padEnd(20) + 'cần'.padStart(5) + 'có'.padStart(5) + 'thiếu'.padStart(7) + 'thời gian'.padStart(12));
  for (const r of bang) {
    console.log(r.cum.padEnd(19) + String(r.can).padStart(5) + String(r.co).padStart(5) + String(r.thieu.length).padStart(7) + `${r.giay.toFixed(1)}s`.padStart(12) + (r.gioiHan ? '  [bị giới hạn]' : ''));
  }
  // file trùng nội dung (md5): Codex chạy song song có lúc chép nhầm ảnh của cụm khác (ep005t trạm 5) → coi là thiếu
  const trung = timTrung(ke.flatMap((c) => c.hinh.map((h) => h.file)).filter((f) => coFile(f)), thuMuc);
  for (const g of trung) for (const f of g) if (!thieuTat.includes(f)) thieuTat.push(f);
  if (trung.length) { console.log(`
Ảnh TRÙNG nội dung (${trung.length} nhóm) — xem rồi xoá file sai và chạy lại:`); for (const g of trung) console.log('  = ' + g.join('  ≡  ')); }
  // hình là bản chép ảnh kèm (khối xám) → xoá để lần sau vẽ lại, tính là thiếu; cùng cỡ ảnh kèm → cảnh báo (có thể chỉ lọc màu)
  const soi = await timChepAnhKem(ke, thuMuc);
  const chep = soi.filter((x) => x.chep), nghi = soi.filter((x) => !x.chep && x.cungCo);
  if (chep.length) {
    console.log(`
Ảnh CHÉP ảnh kèm (${chep.length}) — Codex không vẽ, đã xoá để chạy lại:`);
    for (const x of chep) { console.log(`  x ${x.file}  ≈  ${x.anh} (lệch ${x.lech})`); fs.rmSync(path.join(thuMuc, x.file), { force: true }); if (!thieuTat.includes(x.file)) thieuTat.push(x.file); }
  }
  if (nghi.length) { console.log(`
Ảnh NGHI LỌC MÀU (${nghi.length}) — cùng cỡ khối xám, xem tận mắt:`); for (const x of nghi) console.log(`  ? ${x.file} (lệch ${x.lech})`); }
  fs.writeFileSync(path.join(dirCodex, `ket-qua-${cheDo}.json`), JSON.stringify({ cheDo, thuMuc, model: t.model, muc: t.muc, tran: t.tran, cum: bang, thieu: thieuTat }, null, 2), 'utf8');
  if (thieuTat.length) {
    console.log(`\nCòn thiếu ${thieuTat.length} hình:`);
    for (const f of thieuTat) console.log(`  - ${f}`);
    return 1;
  }
  console.log('\nĐủ hình.');
  return 0;
}

const laChinh = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (laChinh) {
  chay(process.argv.slice(2)).then((ma) => { process.exitCode = ma; }, (e) => { console.error(e?.stack || e); process.exitCode = 2; });
}
