// Thư viện shader — quy ước chung (mọi họ shader trong engine/shaders/<nhóm>/<họ>.js theo đúng mẫu này).
//
// MỤC TIÊU: mỗi tập chỉ nạp các họ shader nó dùng (episodes/<ep>/shaders.json → file import sinh tự động),
// bản gộp HTML không chứa họ không dùng, và mỗi họ = ÍT program (Chrome/ANGLE trên Windows dịch MỌI nhánh:
// shader 1 kiểu ~0,03–0,3 s, gộp 8 kiểu ~2–5 s, gộp 34 kiểu ~16 s → họ nhỏ, khác biệt qua UNIFORM, không qua #define).
//
// Một họ shader:
//   export default defineShader({
//     id: 'khong-khi/suong-do-cao',      // '<nhóm>/<họ>' — tên thư mục/file, chữ thường không dấu, gạch nối
//     group: 'khong-khi',                // nhóm (xem GROUPS)
//     title: 'Sương mù theo độ cao',     // tên tiếng Việt cho danh mục / trình phát
//     kind: 'object',                    // 'object' (tạo Object3D: mesh/points/sprite) | 'material' (vá/thay material có sẵn)
//                                        // | 'post' (pass toàn màn hình) | 'chunk' (đoạn GLSL dùng chung)
//     toggle: 'fog2',                    // tên ô bật/tắt trong trình phát (post.js FX_DEFAULTS sẽ thêm khi tích hợp); mặc định TẮT với tập cũ
//     params: { color: '#b9c7da', density: 0.02, height: 6 },   // tham số mặc định (mọi thứ đổi được qua uniform)
//     presets: { sang: {...}, chieu: {...} },                    // tuỳ chọn: bộ tham số có tên
//     create(THREE, opts) {              // opts = { ...params, ...presetOverrides, seed, renderer?, scene?, camera? }
//       // trả về: { object?, material?, apply?(target), pass?, update(t, ctx), set(params), dispose() }
//       //   update(t, ctx): HÀM THUẦN của t (ctx = { camera, sunDir, wind, ... }) — không giờ thực, không rAF, không Math.random
//     },
//   });
//
// Bắt buộc (CLAUDE.md): tất định theo t + seed; tải/dịch xong trước seek; đặt tên object rõ ('kk_suong_*');
// không phụ thuộc file engine khác ngoài three (truyền THREE vào); mọi tính năng bật/tắt được.

export const GROUPS = {
  'be-mat': 'Bề mặt / chất liệu (materials.js: gỗ, vải, đá, kim loại, hữu cơ, trong suốt)',
  'khong-khi': 'Không khí / khí quyển (sương, bụi, khói, tia nắng, sóng nhiệt…)',
  'troi': 'Trời & thiên thể (trời, mây, sao, trăng, cực quang, cầu vồng…)',
  'thoi-tiet': 'Thời tiết (mưa, tuyết, mưa đá, lá bay, vũng nước, giọt nước…)',
  'anh-sang': 'Ánh sáng & phát sáng (lửa, nến, đèn lồng, neon, đom đóm, phép thuật…)',
  'chat-long': 'Nước & chất lỏng (hồ, sông, thác, dưới nước, caustics, dung nham, chất nhờn…)',
  'vat-the': 'Hiệu ứng vật thể / nhân vật (toon, viền, tan biến, đóng băng, cháy xém, hologram…)',
  'giao-dien': 'Giao diện trong cảnh cho luật game (thanh máu, % pin, số trên đầu, đếm ngược…)',
  'hau-ky': 'Hậu kỳ màn hình (quang sai, glitch, vệt tốc độ, zoom mờ, chớp trắng…)',
};

const REG = new Map();

export function defineShader(def) {
  for (const k of ['id', 'group', 'title', 'kind', 'create']) if (!def[k]) throw new Error(`defineShader: thiếu "${k}" (${def.id || '?'})`);
  if (!GROUPS[def.group]) throw new Error(`defineShader: nhóm lạ "${def.group}" (${def.id})`);
  if (!def.id.startsWith(def.group + '/')) throw new Error(`defineShader: id "${def.id}" phải bắt đầu bằng "${def.group}/"`);
  const d = { params: {}, presets: {}, toggle: null, ...def };
  REG.set(d.id, d);
  return d;
}

// tạo một họ: createShader(THREE, mod, { preset, seed, ...over })
export function createShader(THREE, mod, opts = {}) {
  const d = mod?.default || mod;
  const { preset, ...over } = opts;
  const p = { ...d.params, ...(preset ? d.presets[preset] : null), ...over };
  return d.create(THREE, p);
}

export const registered = () => [...REG.values()];
