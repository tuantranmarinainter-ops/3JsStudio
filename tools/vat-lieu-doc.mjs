// Sinh docs/vat-lieu.md từ MAT_KINDS (engine/materials.js): kind, họ shader, grunge được/không, trạng thái duyệt.
//   node tools/vat-lieu-doc.mjs           ghi docs/vat-lieu.md
//   node tools/vat-lieu-doc.mjs --kiem    chỉ so với file đang có (thoát 1 nếu cũ)
// Trạng thái: da-duyet = kind đang dùng trong ep001 (MAT_DA_DUYET); chua-duyet = còn lại, cần người xem trước khi dùng cho tập khác.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MAT_KINDS, KHONG_GRUNGE, MAT_DA_DUYET, MAT_DE_XUAT, familyOf } from '../engine/materials.js';

export function sinhMarkdown() {
  const dong = Object.entries(MAT_KINDS).map(([k, v]) => {
    const gr = KHONG_GRUNGE.includes(k) ? 'không' : 'được';
    const tt = MAT_DA_DUYET.includes(k) ? 'da-duyet' : 'chua-duyet';
    return `| \`${k}\` | ${v.label} | ${familyOf(k)} | ${gr} | ${tt} |`;
  });
  return [
    '# Bảng vật liệu (sinh ra từ `engine/materials.js` — đừng sửa tay)',
    '',
    'Sinh lại: `node tools/vat-lieu-doc.mjs`. Đạo cụ **khai báo** loại vật liệu của nó (xem dưới) thay vì để `classifyMaterial` đoán từ màu/tên.',
    'Bộ kiểm luật L9 chỉ đo vật có vai gần nhất là `vat-chinh` / `vat-phu` / `nha` / `chan-nha` / `doc` và đòi `nguon = khai-bao`; loại ở cột "grunge" = *không* thì lớp bụi/cũ (`engine/grunge.js`) không phủ lên.',
    '',
    '| kind | tên | họ shader | grunge | trạng thái |',
    '|---|---|---|---|---|',
    ...dong,
    '',
    '## Đề xuất đổi loại (chờ người dùng duyệt)',
    '',
    'Khai báo hiện giữ đúng loại luật đoán cũ để hình ep001 không đổi (chỉ kim loại/kính mất grunge). Các loại dưới đây hợp vật thật hơn nhưng làm đổi hình; chỉ đổi khi được duyệt. Nguồn: `MAT_DE_XUAT` trong `engine/materials.js`.',
    '',
    '| vật | loại hiện tại | loại đề xuất | shot ảnh hưởng |',
    '|---|---|---|---|',
    ...MAT_DE_XUAT.map((d) => `| ${d.vat} | \`${d.hienTai}\` | \`${d.deXuat}\` | ${d.shot || '(không có trong ep001)'} |`),
    '',
    '## Cách khai báo',
    '',
    '- Theo vật liệu: `M(color, { kind: \'chrome\' })` (engine/props.js, engine/house.js) hoặc `khaiBaoMat(material, kind)` — đặt `userData.matDecl` + `matNguon = \'khai-bao\'`.',
    '- Theo mesh: `khaiBao(root, [[/regex tên mesh/, kind], …])` — đặt `userData.matKind` + `matNguon` trên mesh, trả về danh sách mesh chưa khai báo.',
    '- `kind = \'none\'` nghĩa là giữ nguyên vật liệu gốc (không vân, không nhám/kim loại chồng lên); vẫn tính là khai báo.',
    '- `KHONG_GRUNGE` (materials.js) là nguồn duy nhất của danh sách cấm grunge; `tools/kiem/mac-dinh.json` `L9.camGrunge` phải khớp (có test).',
    '- Mesh có vai nhưng vật liệu chưa vá (trong suốt, không phải MeshStandard) được `__measure().vatLieu` báo `nguon = chua-va`; L9 coi là lỗi.',
    '- Ưu tiên khi phân loại: tag trên mesh > khai báo trên vật liệu > luật đoán `MAT_RULES` (`matNguon = \'doan\'`).',
    '',
  ].join('\n');
}

const dich = resolve(import.meta.dirname, '..', 'docs', 'vat-lieu.md');
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const md = sinhMarkdown();
  if (process.argv.includes('--kiem')) {
    let cu = ''; try { cu = readFileSync(dich, 'utf8'); } catch { /* chưa có */ }
    if (cu !== md) { console.error('docs/vat-lieu.md cũ — chạy: node tools/vat-lieu-doc.mjs'); process.exit(1); }
    console.log('docs/vat-lieu.md khớp');
  } else { writeFileSync(dich, md); console.log('đã ghi', dich); }
}
