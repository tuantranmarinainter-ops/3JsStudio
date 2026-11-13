// Camera_104.json của gói kịch bản (đặc tả khung đo trên ảnh: docs/nghien-cuu/camera/de-bai-camera-cho-codex.md) → episodes/<ep>/khung.js cho bộ đặt máy (engine/dat-may.js).
//   node tools/kb/camera-sang-khung.mjs <thư mục gói> <ep> <moc.json>
// Quy đổi: tâm đầu + cỡ đầu → { bo:'dau', pct, x, y }; không có số đầu → bbox toàn thân; nhắm vật → đạo cụ cùng tên (bảng VAT) hoặc nhân vật có số đo trong bo_tri.
// Góc trống (null): suy từ mat_huong_ve (trái +35°, phải −35°, máy 0°, quay lưng 180°), góc cao 0. Tiêu cự = tieu_cu_mm_du_kien (không có → 50).
// Chuyển động: ảnh tĩnh không có → đọc chữ chỉ dẫn (tiến/đẩy → +8 % cỡ; lùi/kéo → −8 %; còn lại +3 % rất nhẹ).
import fs from 'node:fs'; import path from 'node:path';
const [src, ep, mocF] = process.argv.slice(2);
const C = JSON.parse(fs.readFileSync(path.join(src, 'Camera_104.json'), 'utf8')), MOC = JSON.parse(fs.readFileSync(mocF, 'utf8'));
const ACT = { GA: 'hero', BAP: 'bap', BACH: 'bach', MAYOR: 'mayor', GUARD_A: 'linh_a', GUARD_B: 'linh_b', BAKER: 'banh', TAILOR: 'may', CHILD_A: 'be_vang', CHILD_B: 'be_ngoc', BEAR_WALLET: 'gau_vi', BEAR_BAG: 'gau_tui', TOWN_A: 'dan_a', TOWN_B: 'dan_b', TOWN_C: 'dan_c' };
const VAT = [[/đồng hồ báo thức/i, 'dong_ho'], [/nhẫn (mồi )?bạc/i, 'nhan_moi'], [/dây chuyền/i, 'day_chuyen'], [/đồng hồ quả quýt/i, 'dong_ho_quyt'], [/hộp nhẫn/i, 'hop_nhan']];
const HUONG = { trai: 35, phai: -35, may: 0, quay_lung: 180 };
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
const out = {}, bo = [];
for (const s of C) {
  const id = 's' + s.id.slice(1), m = MOC.shots.find((x) => x.id === id), cast = m ? Object.keys(m.cast) : [];
  const ten = (ma) => { const n = ACT[ma]; return n === 'mayor' && cast.includes('mayor_ngu') ? 'mayor_ngu' : n; };
  let k = null, vi = '';
  const tuNguoi = (o, ma, chiDau = false) => {   // o = shot hoặc mục bo_tri có số đo của nhân vật `ma`
    const pct = num(o.dau_cao_pct), tam = o.tam_dau_pct;
    if (pct && Array.isArray(tam) && num(tam[0]) !== null && num(tam[1]) !== null) return { nham: ten(ma), bo: 'dau', pct, x: tam[0], y: tam[1] };
    const b = o.bbox_pct; if (!chiDau && Array.isArray(b) && b.every((v) => num(v) !== null) && b[3] - b[1] > 3 && b[1] > 1 && b[3] < 99) return   /* bbox chạm mép khung = người bị cắt, không dùng làm cỡ */ { nham: ten(ma), bo: 'toan_than', pct: b[3] - b[1], x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2, _bbox: true };
    return null;
  };
  if (s.nham?.ai && ACT[s.nham.ai]) { k = tuNguoi(s, s.nham.ai) || tuNguoi((s.bo_tri || []).find((b) => b.ai === s.nham.ai) || {}, s.nham.ai); vi = 'người'; }
  if (!k && s.nham?.vat) {
    const v = VAT.find(([re]) => re.test(s.nham.vat)), tam = s.tam_vat_pct || s.tam_dau_pct, pct = num(s.vat_cao_pct);
    if (v && pct && Array.isArray(tam) && num(tam[0]) !== null) { k = { nham: v[1], pct, x: tam[0], y: tam[1] }; vi = 'vật'; }
  }
  if (!k) for (const b of s.bo_tri || []) { if (ACT[b.ai] && (k = tuNguoi(b, b.ai, true))) { vi = 'người phụ trong khung'; break; } }
  if (!k || !k.nham) { bo.push(`${id}: ${s.nham?.vat ? 'nhắm vật "' + s.nham.vat + '" chưa có trong cảnh' : 'thiếu số đo'}`); continue; }
  const laNham = vi !== 'người phụ trong khung';
  k.ngang = laNham && num(s.goc_ngang_do) !== null ? s.goc_ngang_do : (HUONG[s.mat_huong_ve] ?? 0);
  k.cao = num(s.goc_cao_do) ?? 0; if (vi === 'vật' && Math.abs(k.cao) > 60) k.cao = Math.sign(k.cao) * 60;   // máy bổ thẳng xuống: giữ 60° để còn đường chân trời ổn định
  if (num(s.nghieng_do)) k.nghieng = s.nghieng_do;
  k.mm = num(s.tieu_cu_mm) ?? num(s.tieu_cu_mm_du_kien) ?? 50;
  const cd = (s.chuyen_dong_du_kien?.chi_dan_goc || '').toLowerCase();
  const kp = /tiến|đẩy|dolly vào|push|áp sát/.test(cd) ? 1.08 : /lùi|kéo ra|pull/.test(cd) ? 0.92 : 1.03;
  k.pct = +k.pct.toFixed(1); k.pct2 = +(k.pct * kp).toFixed(1); k.x = +k.x.toFixed(1); k.y = +k.y.toFixed(1);
  if (vi === 'vật') k.tuyetDoi = false;
  delete k._bbox; out[id] = k;
}
const line = (k) => '{ ' + Object.entries(k).map(([a, b]) => `${a}: ${typeof b === 'string' ? `'${b}'` : b}`).join(', ') + ' }';
fs.writeFileSync(path.join('episodes', ep, 'khung.js'),
`// ${ep} — ĐẶC TẢ KHUNG HÌNH theo shot cho bộ đặt máy (engine/dat-may.js). SINH TỰ ĐỘNG bởi tools/kb/camera-sang-khung.mjs từ Camera_104.json
// (số Codex đo trên chính khung kịch bản). Đừng sửa tay: sửa ở KHUNG_SUA cuối file (ghi đè từng trường theo id) rồi giữ nguyên phần sinh.
// nham = diễn viên/đạo cụ; bo = điểm đặt; pct = % chiều cao khung của đoạn đo (đầu); x, y = vị trí trên khung (%); ngang/cao = độ; mm = tiêu cự dự kiến.
const SINH = {
${Object.entries(out).map(([id, k]) => `  ${id}: ${line(k)},`).join('\n')}
};
// Chưa đặt được theo khung (dùng máy ghi tay trong file shot):
${bo.map((b) => '//   ' + b).join('\n')}
export const KHUNG_SUA = {};
export const KHUNG = Object.fromEntries(Object.entries(SINH).map(([id, k]) => [id, { ...k, ...(KHUNG_SUA[id] || {}) }]));
`);
console.log(`${Object.keys(out).length} shot có đặc tả khung, ${bo.length} shot chưa đặt được:`); console.log(bo.join('\n'));
