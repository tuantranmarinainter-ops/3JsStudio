// ep003 — 104 shot, 140,00 s (mốc 2:20 của gói kịch bản). Shot chia 3 file theo cụm bối cảnh (mỗi file một người sửa): shots-phong.js, shots-nha-may.js, shots-pho.js.
// File này chỉ GHÉP theo thứ tự id.
import { SHOTS_PHONG } from './shots-phong.js';
import { SHOTS_NHA_MAY } from './shots-nha-may.js';
import { SHOTS_PHO } from './shots-pho.js';
import { KHUNG as KHUNG_SINH } from './khung.js';
import { gopKhung } from './khung-sua.js';
import { KIT2 } from './kit2.js';
export const KHUNG = gopKhung(KHUNG_SINH);   // số Codex (khung.js) + ghi đè tay (khung-sua.js)
// shot có đặc tả khung (khung.js) → cam.khung: máy tự đặt theo khung hình; cam ghi tay cũ giữ làm dự phòng. ?khung=0 trên URL → tắt, dùng cam ghi tay.
const KHUNG_ON = !(typeof location !== 'undefined' && /[?&]khung=0/.test(location.search));
// Lớp KIT2 (kich-ban/ep003-kit2/kit.json → tools/kb/kit2-sang-shot.mjs → kit2.js): số Codex chốt TRƯỚC khi vẽ ảnh, đã kiểm bằng dựng khối với nhân vật thật.
// Shot có trong KIT2: máy ghi tuyệt đối (p / l / fov, bỏ bộ giải khung), diễn viên đặt theo kit (giữ mặt + pose tay của shot cũ), ai không có trong kit thì ẩn. ?kit2=0 → tắt.
const KIT2_ON = !(typeof location !== 'undefined' && /[?&]kit2=0/.test(location.search));
const BO = new Set(['at', 'to', 'ry', 'ry2', 'rx', 'rz', 'lie', 'anim', 'tOff', 'win']);   // trường vị trí / chuyển động của shot cũ: bỏ khi kit đặt lại diễn viên
const gopKit2 = (s) => {
  const k = KIT2_ON && KIT2[s.id]; if (!k) return s;
  const cast = {};
  for (const [n, v] of Object.entries(k.cast)) { const cu = Object.fromEntries(Object.entries(s.cast?.[n] || {}).filter(([f]) => !BO.has(f))); if (v.lie) delete cu.pose; cast[n] = { anim: s.cast?.[n]?.anim || 'idle', ...cu, ...v }; if (cast[n].hold === null) delete cast[n].hold; }
  const props = { ...(s.props || {}) };
  for (const [n, v] of Object.entries(k.props || {})) if (n in props && v.at) props[n] = { ...(props[n] || {}), at: v.at, ry: v.ry };
  const T = k.them || {};   // trường engine thô của shot: envArg, props, lightOverride… (gộp nông; envArg / props gộp theo khoá)
  return { ...s, ...T, cam: k.cam, cast, props: { ...props, ...(T.props || {}) }, envArg: { ...(s.envArg || {}), ...(T.envArg || {}) } };
};
// ?camCu=1 → máy quay CŨ của các shot đã sửa máy theo góp ý (để so trước/sau). s005 17/11: hạ máy ngang hốc két (kit-pho.json S005).
const CAM_CU_ON = typeof location !== 'undefined' && /[?&]camCu=1(&|$)/.test(location.search);
const CAM_CU = { s005: { p: [4.8, 2.6, -1], l: [4.8, 0.1, -5.5], fov: 54, p2: [4.8, 1.85, -2.9], fov2: 48 } };
export const SHOTS = [...SHOTS_PHONG, ...SHOTS_NHA_MAY, ...SHOTS_PHO].sort((a, b) => (a.id < b.id ? -1 : 1))
  .map((s) => (KHUNG_ON && KHUNG[s.id] ? { ...s, cam: { ...(s.cam || {}), khung: KHUNG[s.id] } } : s)).map(gopKit2)
  .map((s) => (CAM_CU_ON && CAM_CU[s.id] ? { ...s, cam: CAM_CU[s.id] } : s));
