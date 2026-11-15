// ke-thua.mjs — kiểm "kế thừa": file env (engine/envs/*.js) không được VÁ món của builder dùng chung
// (docs/handoff/ke-thua-ep001.md). Món đẹp phải nằm trong builder (engine/props.js, cloth.js, realwindow.js, nen-xa.js…)
// có ô FX mặc định bật, để tập sau tự nhận. Chỉ CẢNH BÁO (doctor mục 12), đọc tĩnh, nhanh.
//   kiemKeThua([{ file, src }], allow) → [{ file, line, kind, msg }]
//   allow: mảng { file, mau, lyDo } trong tools/ke-thua.json — mục nào có `file` trùng và dòng chứa `mau` thì bỏ qua.
// Loại cảnh báo:
//   go-bo-phan   getObjectByName('x') rồi remove / visible = false trên cùng dòng (gỡ/ẩn bộ phận của builder)
//   ghi-de       trong traverse(...) gán lại .material = / .geometry = (thay vật liệu/hình của builder sau khi tạo)
//   matKind-none traverse gắn matKind = 'none' cho cả cây (bỏ ảnh vân + vật liệu thật dùng chung)
//   tu-dung      env tự dựng giường/cửa sổ/tủ lạnh (tên mesh) mà không gọi builder dùng chung tương ứng
// tên mesh: một đoạn (ngăn bởi _) đúng bằng từ khoá — 'phong_chan' có, 'seabed'/'bedroom'/'bedNight' không
const seg = (w) => new RegExp(`['"\`](?:[\\w-]*_)?(?:${w})(?:_[\\w-]*)?['"\`]`, 'i');
export const BUILDERS = [
  { mon: 'giường', ten: seg('giuong|bed|blanket|pillow|goi|chan'), goi: /K\.bed\(|createBedSoft\(/, goiTen: 'K.bed / createBedSoft' },
  { mon: 'cửa sổ', ten: seg('cua_so|window'), goi: /K\.window\(|createRealWindow\(/, goiTen: 'K.window / createRealWindow' },
  { mon: 'tủ lạnh', ten: seg('tu_lanh|fridge'), goi: /K\.fridge\(/, goiTen: 'K.fridge' },
];
const DUNG_MESH = /\.name\s*=|\b(?:box|inst|tag|none|mesh|plane|cyl|sph)\(|new THREE\.Mesh\(/;   // dòng có tạo / đặt tên mesh

export function kiemKeThua(files, allow = []) {
  const out = [];
  for (const { file, src } of files) {
    const lines = src.split(/\r?\n/);
    const allowed = (ln) => allow.some((a) => a.file === file && ln.includes(a.mau));
    const push = (i, kind, msg) => { if (!allowed(lines[i])) out.push({ file, line: i + 1, kind, msg }); };
    let travUntil = -1;
    lines.forEach((ln, i) => {
      if (/^\s*\/\//.test(ln)) return;
      if (/\.traverse\(/.test(ln)) travUntil = i + 8;
      if (/getObjectByName\(/.test(ln) && /\.remove\(|\.visible\s*=\s*false/.test(ln)) push(i, 'go-bo-phan', 'gỡ/ẩn bộ phận lấy bằng getObjectByName — đưa biến thể vào builder kèm ô FX');
      if (i <= travUntil && /\b\w+\.(material|geometry)\s*=(?!=)/.test(ln)) push(i, 'ghi-de', 'ghi đè vật liệu/hình trong traverse — sửa ở builder dùng chung');
      if (/\.traverse\(/.test(ln) && /matKind\s*=\s*['"]none['"]/.test(ln)) push(i, 'matKind-none', "gắn matKind='none' cho cả cây — mất ảnh vân/vật liệu thật dùng chung; khai báo loại thật");
    });
    for (const b of BUILDERS) {
      if (b.goi.test(src)) continue;
      const i = lines.findIndex((ln) => !/^\s*\/\//.test(ln) && DUNG_MESH.test(ln) && b.ten.test(ln));
      if (i >= 0) push(i, 'tu-dung', `tự dựng ${b.mon} mà không gọi builder dùng chung (${b.goiTen})`);
    }
  }
  return out;
}
