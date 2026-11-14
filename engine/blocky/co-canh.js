// CỠ CẢNH (shot ghi `co: 'can'` …): đặt camera quỹ đạo theo chiều cao khung nhìn thấy ở chủ thể, thay cho dò `dist` tay.
// Bảng SHOTSIZE + công thức d = (S/2)/tan(fov/2) + nhìn theo đầu/chân + góc 'eye' (dy = 0.06·d) CHÉP từ blocky-shorts engine/js/engine.js:298, 325-334.
// Nối sang camera của engine/shots.js: pos = neo + (sin yaw·dist, h, cos yaw·dist), neo diễn viên = gốc chân + 4.2 → look tương đối = lookY − 4.2.
// Ô FX 'coCanh' (mặc định bật; đọc lúc mở rộng shot, đổi cần tải lại trang). Shot không ghi `co` → không đổi gì.
// Không import three → chạy được trong node test.
const SHOTSIZE = { extreme: { S: 2.6, k: 'head', o: -.1 }, close: { S: 4.0, k: 'head', o: -.55 }, medium: { S: 6.8, k: 'head', o: -1.5 }, cowboy: { S: 8.6, k: 'head', o: -2.4 }, full: { S: 10.5, k: 'feet', o: 3.3 }, wide: { S: 16, k: 'feet', o: 4.8 }, establishing: { S: 28, k: 'feet', o: 7 } };
// Tên TIẾNG VIỆT = bảng HIỆU CHỈNH cho R6 của mình (chân 0–2, thân 2–4, đầu 4–5.2): S = chiều cao khung thấy được, y = độ cao tâm nhìn (tuyệt đối).
//   Bảng gốc blocky (tên tiếng Anh) lỏng hơn với R6: 'medium' 6.8 thấy gần trọn người (shot-lab 2026-11-14) → giữ nguyên để so, nhưng tập mới dùng tên Việt.
const CO_VN = { cucCan: { S: 1.8, y: 4.6 }, can: { S: 3.8, y: 4.3 }, trung: { S: 4.4, y: 3.9 }, ngangDui: { S: 5.8, y: 3.4 }, toanThan: { S: 8, y: 2.9 }, rong: { S: 14, y: 4.5 }, toanCanh: { S: 28, y: 7 } };
export const CO_TEN = { cucCan: 'extreme', can: 'close', trung: 'medium', ngangDui: 'cowboy', toanThan: 'full', rong: 'wide', toanCanh: 'establishing' };
export const CO_NAMES = [...Object.keys(CO_VN), ...Object.keys(SHOTSIZE)];
const ASPECT = 9 / 16;
const HEAD_Y = 4.6;      // tâm đầu R6/R15 (người cao 5.2), như blocky
const NEO_Y = 4.2;       // engine/shots.js anchorOf: diễn viên = gốc + 4.2
const GOC = { eye: 0.06, low: -0.42, high: 0.5, top: 1.1 };

export const coOn = () => globalThis.__autoFx?.coCanh !== false;

/** cam = camera của loại shot; co = tên cỡ; o = { goc: 'eye'|'low'|'high'|'top', spread: khoảng cách lớn nhất giữa các người (stud) }. Trả cam mới. */
export function apCoCanh(cam, co, o = {}) {
  const vn = CO_VN[co], size = vn ? null : SHOTSIZE[co];
  if (!vn && !size) throw new Error(`co "${co}" không có. Có: ${CO_NAMES.join(', ')}`);
  let S = vn ? vn.S : size.S; if (o.spread) S = Math.max(S, (o.spread + 4.6) / ASPECT);
  const fov = cam.fov ?? 40;
  const d = (S / 2) / Math.tan((fov / 2) * Math.PI / 180);
  const lookY = vn ? vn.y : size.k === 'head' ? HEAD_Y + size.o : Math.min(size.o, S * .36);
  const dy = (GOC[o.goc] ?? GOC.eye) * d;
  const horiz = Math.sqrt(Math.max(d * d * .25, d * d - dy * dy));
  const r = (x) => Math.round(x * 1000) / 1000;
  const look = [...(cam.look || [0, 0, 0])]; look[1] = r(lookY - NEO_Y);
  return { ...cam, dist: r(horiz), h: r(dy), look, co };
}
