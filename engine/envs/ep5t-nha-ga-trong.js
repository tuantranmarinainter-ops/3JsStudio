// Bối cảnh 'ep5t-nha-ga-trong' (tập test ep005t) — SINH TỰ ĐỘNG bởi tools/ep5t-boi-canh.mjs từ kich-ban/ep005t/boi-canh/nha-ga-trong.json; đừng sửa tay (sửa bảng NHA trong tool).
// Dựng khối theo danh sách mốc + model nhóm NHÀ đã chốt (?rb=0 → bản khối). Logic: engine/envs/ep5t-chung.js.
import build, { LIGHT as L } from './ep5t-chung.js';
export const LIGHT = L;
export const ASSETS = [];
export const DATA = {"id":"nha-ga-trong","kichThuoc":{"rong":14,"sau":12,"cao":10},"trongCum":null,"moc":[{"id":"san","ten":"Sàn gỗ","vung":"x -7..7, y -0.2..0, z -6..6","mau":["#8a6a44"]},{"id":"tuong-sau","ten":"Tường sau + cửa sổ","vung":"x -7..7, y 0..10, z -6.2..-6","mau":["#e8d7b0"]},{"id":"tuong-trai","ten":"Tường trái","vung":"x -7.2..-7, y 0..10, z -6..6","mau":["#e8d7b0"]},{"id":"guong","ten":"Gương treo tường","vung":"x -7..-6.8, y 3.2..7.8, z -4.5..-1.5","mau":["#c8d8e0","#4a3524"]},{"id":"ban","ten":"Bàn gỗ","vung":"x 0..4, y 0..3.1, z -2..1","mau":["#8a6a44"]},{"id":"chai-bo","ten":"Chai nhãn con bò","vung":"x 1.5..2.1, y 3.1..4.5, z -0.8..-0.2","mau":["#7a1f2b","#f6efe0"]},{"id":"ly","ten":"Ly","vung":"x 2.6..3.1, y 3.1..4, z -0.6..-0.1","mau":["#d8e6ee"]},{"id":"den-dau","ten":"Đèn dầu treo","vung":"x 2..2.6, y 7..8.2, z 0..0.6","mau":["#ffcf73"]}],"MODELS":{}};
export default function (g, e, H) { return build(g, e, H, DATA); }
