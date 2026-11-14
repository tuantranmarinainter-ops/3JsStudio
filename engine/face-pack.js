// face-pack.js — BỘ MẶT ảnh chọn được bằng dữ liệu tập: EPISODE.facePack = 'altiwyre' | 'emote37'.
//   const set = await loadFacePacks(THREE, EPISODE.facePack);   // tải xong TRƯỚC window.__ready (cast.js gọi hộ)
// - Mỗi bộ = 37 ảnh cùng tên (NN_tên.png theo GA_FACES) → tên biểu cảm trong shot/kịch bản KHÔNG đổi khi đổi bộ.
// - 'emote37'  : assets/faces/emote37/ (mặt nguyên, cắt theo khung chữ rồi canh giữa — cách vẽ cũ).
// - 'altiwyre' : assets/faces/altiwyre/ (AltiWyre's Face Pack, Roblox Creator Store 6557969904; ghép sẵn từ bộ phận mắt + mày + miệng
//                theo assets/faces/altiwyre/map.json bằng `node tools/face-pack.mjs ghep`; vẽ NGUYÊN KHUNG nên mắt/miệng không xê dịch giữa các biểu cảm).
// - Bật/tắt lúc chạy: ô FX 'matAlti' (tắt → quay về emote37). Không có giờ thực, không ngẫu nhiên: chọn bộ chỉ phụ thuộc cờ + dữ liệu tập.
import { loadGaFaces } from './r15.js';

export const FACE_PACKS = {
  emote37: { base: '/assets/faces/emote37', fit: 'bbox' },
  altiwyre: { base: '/assets/faces/altiwyre', fit: 'full', box: { x0: -0.175, y0: -0.2155, x1: 1.175, y1: 1.1345 } },   // box = vùng canvas mặt (0..1) mà ảnh nguyên khung phủ lên; phóng 1.35 quanh (0.5, 0.53) vì bộ phận chỉ chiếm x .13–.87, y .16–.90 của khung
};
export const FACE_PACK_OLD = 'emote37';       // tập không khai báo facePack → giữ bộ cũ
export const FACE_PACK_NEW = 'altiwyre';      // tập mới (công cụ sinh tập ghi sẵn facePack này)
export const facePackName = (n) => (FACE_PACKS[n] ? n : FACE_PACK_OLD);

/** Tải một bộ (có nhớ). Trả { tên: Texture } kèm __name, __fit, __box (không liệt kê khi duyệt khoá). */
export async function loadFacePack(THREE, name, { base } = {}) {
  name = facePackName(name);
  const P = (globalThis.__facePacks ||= {});
  if (P[name]) return P[name];
  const def = FACE_PACKS[name], set = await loadGaFaces(THREE, { base: base || def.base });
  for (const [k, v] of [['__name', name], ['__fit', def.fit], ['__box', def.box || null]]) Object.defineProperty(set, k, { value: v, enumerable: false });
  return (P[name] = set);
}
/** Tải bộ của tập (+ bộ cũ để ô FX 'matAlti' tắt được) và đặt làm bộ đang dùng. */
export async function loadFacePacks(THREE, name) {
  name = facePackName(name);
  const [chinh, cu] = await Promise.all([loadFacePack(THREE, name), name === FACE_PACK_OLD ? null : loadFacePack(THREE, FACE_PACK_OLD)]);
  globalThis.__facePack = name;
  globalThis.__emoteFaces ||= cu || chinh;    // R15 (engine/r15.js) vẫn đọc biến này
  return chinh;
}
/** Bộ mặt đang hiệu lực (hàm thuần của cờ FX + tên bộ của tập). */
export function activeFaceSet(fallback = null) {
  const P = globalThis.__facePacks || {}, want = facePackName(globalThis.__facePack);
  const on = globalThis.__autoFx?.matAlti !== false;
  return (want !== FACE_PACK_OLD && !on ? P[FACE_PACK_OLD] : P[want]) || fallback || P[FACE_PACK_OLD] || globalThis.__emoteFaces || {};
}
