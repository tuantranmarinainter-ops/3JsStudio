// 8 hướng chụp/vẽ mỗi bối cảnh (luật người dùng chốt 16/11): dùng chung cho khối xám (tools/khoi-xam.mjs, trạm 7)
// và ảnh Codex vẽ chồng lên (tools/codex-ve.mjs, chế độ tham-chieu, trạm 8).
// KHÔNG nhầm với `gocMay` của shot (ngang-mat/tren-xuong/duoi-len/qua-vai): đó là góc máy của từng shot.
// Hệ trục: +Z = phía máy chính nhìn vào bối cảnh (mặt trước), +X = bên phải, 1 đơn vị = 1 stud.
export const HUONG_BOI_CANH = [
  { id: 'truoc', ten: 'Trước', moTa: 'nhìn từ phía trước (+Z), cao ngang đầu người hơi chếch xuống ~25°, thấy trọn mặt trước' },
  { id: 'sau', ten: 'Sau', moTa: 'nhìn từ phía sau (−Z), cao ngang đầu người hơi chếch xuống ~25°, thấy trọn mặt sau' },
  { id: 'trai', ten: 'Trái', moTa: 'nhìn từ bên trái (−X), cao ngang đầu người hơi chếch xuống ~25°, thấy trọn mặt trái' },
  { id: 'phai', ten: 'Phải', moTa: 'nhìn từ bên phải (+X), cao ngang đầu người hơi chếch xuống ~25°, thấy trọn mặt phải' },
  { id: 'tren-xuong', ten: 'Từ trên xuống', moTa: 'nhìn thẳng từ trên cao xuống (mặt bằng), +X sang phải ảnh, +Z (phía trước) xuống đáy ảnh, thấy trọn vùng chính' },
  { id: 'duoi-len', ten: 'Từ dưới lên', moTa: 'máy sát đất (~1 stud) ở phía trước, nhìn ngước lên thấy các vật cao, mái và bầu trời' },
  { id: 'thang-mat', ten: 'Thẳng mặt', moTa: 'ngang tầm mắt nhân vật (4,75 stud) từ phía trước (+Z), nhìn thẳng vào bối cảnh, không chúi xuống' },
  { id: 'ngang-hong', ten: 'Ngang hông', moTa: 'ngang tầm mắt nhân vật (4,75 stud) từ bên hông phải (+X), nhìn thẳng ngang vào bối cảnh, không chúi xuống' },
];
export const ID_HUONG = HUONG_BOI_CANH.map((h) => h.id);
// Lọc theo chuỗi "truoc,sau" (cờ --huong); rỗng/null = đủ 8. Id lạ → ném lỗi.
export function locHuong(chuoi) {
  if (!chuoi) return HUONG_BOI_CANH;
  const ds = String(chuoi).split(',').map((s) => s.trim()).filter(Boolean);
  const la = ds.filter((d) => !ID_HUONG.includes(d));
  if (la.length) throw new Error(`Hướng không biết: ${la.join(', ')} (có: ${ID_HUONG.join(', ')})`);
  return HUONG_BOI_CANH.filter((h) => ds.includes(h.id));
}
