// ep003 — 104 shot, 140,00 s (mốc 2:20 của gói kịch bản). Shot chia 3 file theo cụm bối cảnh (mỗi file một người sửa): shots-phong.js, shots-nha-may.js, shots-pho.js.
// File này chỉ GHÉP theo thứ tự id.
import { SHOTS_PHONG } from './shots-phong.js';
import { SHOTS_NHA_MAY } from './shots-nha-may.js';
import { SHOTS_PHO } from './shots-pho.js';
import { KHUNG as KHUNG_SINH } from './khung.js';
import { gopKhung } from './khung-sua.js';
export const KHUNG = gopKhung(KHUNG_SINH);   // số Codex (khung.js) + ghi đè tay (khung-sua.js)
// shot có đặc tả khung (khung.js) → cam.khung: máy tự đặt theo khung hình; cam ghi tay cũ giữ làm dự phòng. ?khung=0 trên URL → tắt, dùng cam ghi tay.
const KHUNG_ON = !(typeof location !== 'undefined' && /[?&]khung=0/.test(location.search));
export const SHOTS = [...SHOTS_PHONG, ...SHOTS_NHA_MAY, ...SHOTS_PHO].sort((a, b) => (a.id < b.id ? -1 : 1))
  .map((s) => (KHUNG_ON && KHUNG[s.id] ? { ...s, cam: { ...(s.cam || {}), khung: KHUNG[s.id] } } : s));
