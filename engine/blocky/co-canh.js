// CỠ CẢNH (shot ghi `co: 'can'` …) cho LOẠI SHOT CŨ (engine/shottypes.js): đặt camera quỹ đạo theo chiều cao khung nhìn thấy ở chủ thể,
// thay cho dò `dist` tay. KHÔNG còn bảng riêng: dùng chung bảng CO + hàm frameShot của máy blocky (engine/blocky/may.js) — một nguồn
// duy nhất cho cả `co:` lẫn `cam.bk.co` (gộp 17/11; trước đó bảng ở đây lệch số: trung 4.4 / ngangDui 5.8, tên tiếng Anh = bảng gốc blocky).
// Nối sang camera của engine/shots.js: pos = neo + (sin yaw·dist, h, cos yaw·dist), neo diễn viên = gốc chân + 4.2 → look tương đối = lookY − 4.2.
// Ô FX 'coCanh' (mặc định bật; đọc lúc mở rộng shot, đổi cần tải lại trang). Shot không ghi `co` → không đổi gì. Shot ghi dist/h/fov trực tiếp → không đụng.
// Không import three → chạy được trong node test.
import { CO, VN, frameShot } from './may.js';

export const CO_TEN = { ...VN };
export const CO_NAMES = [...Object.keys(VN), ...Object.keys(CO)];
const NEO_Y = 4.2;       // engine/shots.js anchorOf: diễn viên = gốc + 4.2
const GOC_O = new Set(['eye', 'low', 'high', 'top']);

export const coOn = () => globalThis.__autoFx?.coCanh !== false;

/** cam = camera của loại shot; co = tên cỡ; o = { goc: 'eye'|'low'|'high'|'top', spread: khoảng cách lớn nhất giữa các người (stud) }. Trả cam mới. */
export function apCoCanh(cam, co, o = {}) {
  if (!CO[VN[co] || co]) throw new Error(`co "${co}" không có. Có: ${CO_NAMES.join(', ')}`);
  const fov = cam.fov ?? 40;
  // khung ở gốc toạ độ, nhìn từ +Z (yaw 0, không lệch side) → tách ra dist (ngang) / h (cao) / lookY; hướng do loại shot tự lo
  const F = frameShot({ on: 'x', co, fov, goc: GOC_O.has(o.goc) ? o.goc : 'eye', yaw: 0, from: 0, side: 0, spread: o.spread || 0 },
    () => ({ feet: [0, 0, 0], yaw: 0 }));
  const r = (x) => Math.round(x * 1000) / 1000;
  const look = [...(cam.look || [0, 0, 0])]; look[1] = r(F.look[1] - NEO_Y);
  return { ...cam, dist: r(F.pos[2] - F.look[2]), h: r(F.pos[1] - F.look[1]), look, co };
}
