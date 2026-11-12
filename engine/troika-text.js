// troika-text.js — chữ tiếng Việt SDF (troika-three-text, MIT) cho bưu thiếp. Chỉ nạp khi trang có importmap "troika-three-text";
// postcards.js nạp bằng import() động, thiếu thì giữ chữ canvas cũ. Bật/tắt: ô FX `troikaText` (engine/post.js, mặc định TẮT).
//   - Phông CỤC BỘ (assets/fonts/*.ttf): không Google Fonts, không CDN. `useWorker:false` → không Worker/blob (chạy được ở bản gộp 1 file, file://).
//   - Mọi chữ đều có trong phông (Patrick Hand có đủ tiếng Việt) nên bộ chọn phông dự phòng (CDN jsdelivr) không bao giờ chạy.
//   - Tất định: bố cục + SDF chỉ phụ thuộc (chuỗi, phông, cỡ). Mọi Text được sync() XONG trước __ready (xem postcardsTroikaReady).
import { Text, configureTextBuilder } from 'troika-three-text';

configureTextBuilder({ useWorker: false, sdfGlyphSize: 64 });

export const FONT_URL = { hand: '/assets/fonts/PatrickHand-Regular.ttf', ui: '/assets/fonts/BeVietnamPro-Black.ttf' };

// Bản gộp 1 file: troika tải phông bằng XMLHttpRequest (không qua fetch đã bị chặn) → đổi sang blob URL của file nhúng (window.__embedURL, tools/bundle.mjs).
const fontSrc = (u) => (typeof window !== 'undefined' && window.__embedURL && window.__embedURL(u)) || u;

// Một dòng chữ phẳng (anchor giữa-giữa), dán lên mặt phẳng local (đơn vị world). Trả { obj, done: Promise } — done resolve khi SDF + bố cục xong.
export function makeLine(THREE, { text, font = 'hand', size, color = '#000', x = 0, y = 0, z = 0.004, roughness = 0.9, name = 'troika_line' }) {
  const t = new Text();
  t.text = text; t.font = fontSrc(FONT_URL[font] || font); t.fontSize = size; t.color = color;
  t.anchorX = 'center'; t.anchorY = 'middle'; t.textAlign = 'center'; t.letterSpacing = 0; t.sdfGlyphSize = 64;
  t.material = new THREE.MeshStandardMaterial({ roughness, metalness: 0 });
  t.position.set(x, y, z); t.name = name; t.visible = false; t.castShadow = false; t.receiveShadow = false; t.frustumCulled = false;
  t.userData.matKind = 'none'; t.userData.matNguon = 'khai-bao';   // engine/materials.js: không đoán chất liệu cho chữ
  const done = Promise.race([new Promise((res) => t.sync(res)), new Promise((res) => setTimeout(res, 15000))]);   // phông hỏng/không tải được → không chặn __ready (chữ canvas được giữ, xem ok())
  return { obj: t, done, ok: () => !!t.textRenderInfo, resync: (s) => { if (s !== t.text) { t.text = s; return new Promise((res) => t.sync(res)); } return Promise.resolve(); } };
}
