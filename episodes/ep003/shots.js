// ep003 — 104 shot, 140,00 s (mốc 2:20 của gói kịch bản). Shot chia 3 file theo cụm bối cảnh (mỗi file một người sửa): shots-phong.js, shots-nha-may.js, shots-pho.js.
// File này chỉ GHÉP theo thứ tự id.
import { SHOTS_PHONG } from './shots-phong.js';
import { SHOTS_NHA_MAY } from './shots-nha-may.js';
import { SHOTS_PHO } from './shots-pho.js';
export const SHOTS = [...SHOTS_PHONG, ...SHOTS_NHA_MAY, ...SHOTS_PHO].sort((a, b) => (a.id < b.id ? -1 : 1));
