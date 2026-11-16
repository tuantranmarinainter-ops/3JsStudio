// Bối cảnh 'ep5t-tiem-banh' (tập test ep005t) — SINH TỰ ĐỘNG bởi tools/ep5t-boi-canh.mjs từ kich-ban/ep005t/boi-canh/tiem-banh.json; đừng sửa tay (sửa bảng NHA trong tool).
// Dựng khối theo danh sách mốc + model nhóm NHÀ đã chốt (?rb=0 → bản khối). Logic: engine/envs/ep5t-chung.js.
import build, { LIGHT as L } from './ep5t-chung.js';
export const LIGHT = L;
export const ASSETS = ["nhap/ep5t-tiem-banh-mat-tien","nhap/ep5t-mai-hien"];
export const DATA = {"id":"tiem-banh","kichThuoc":{"rong":16,"sau":12,"cao":14},"trongCum":{"cum":"pho-ep005t","goc":[19,0,-66],"xoay":0},"moc":[{"id":"mat-tien","ten":"Mặt tiền tiệm bánh","vung":"x -8..8, y 0..12, z -6..-2","mau":["#f0c27a","#8c3b2a"]},{"id":"bien","ten":"Biển hình ổ bánh mì","vung":"x -2..2, y 9..10.6, z -1.9..-1.6","mau":["#8a6a44","#d99a4a"]},{"id":"quay","ten":"Quầy bán","vung":"x -4..4, y 0..3.2, z -0.8..0.8","mau":["#8a6a44"]},{"id":"khay","ten":"Khay bánh — có 1 chỗ trống","vung":"x -1.5..1.5, y 3.2..3.6, z -0.6..0.6","mau":["#2d3036","#d99a4a"]},{"id":"hien","ten":"Mái hiên","vung":"x -6..6, y 8..8.4, z -2..2","mau":["#c3262e","#f6efe0"]},{"id":"den-quay","ten":"Đèn treo quầy","vung":"x -0.3..0.3, y 7..7.8, z 0..0.6","mau":["#ffcf73"]}],"MODELS":{"mat-tien":{"id":"nhap/ep5t-tiem-banh-mat-tien"},"hien":{"id":"nhap/ep5t-mai-hien","mong":true}}};
export default function (g, e, H) { return build(g, e, H, DATA); }
