// Gộp các lớp số Codex (kit2-<cụm>.js, sinh bởi tools/kb/kit2-sang-shot.mjs từ kich-ban/ep003-kit2/kit-<cụm>.json). Mỗi cụm một file để ba người sửa song song không đè nhau.
import { KIT2 as A } from './kit2-phong.js';
import { KIT2 as B } from './kit2-pho.js';
import { KIT2 as C } from './kit2-nha-may.js';
// Shot mà bản dựng CŨ (cam ghi tay / bộ giải khung) gần kịch bản hơn số kit2 — theo bảng chấm A/B docs/handoff/ep003-ab-*.md. Các shot này bỏ lớp kit2.
export const KIT2_BO = new Set(['s020', 's027', 's035', 's038', 's040', 's047', 's049', 's052', 's057', 's068', 's070', 's086', 's090', 's098', 's099']);   // chấm A/B 14/11 00:30
export const KIT2 = Object.fromEntries(Object.entries({ ...A, ...B, ...C }).filter(([id]) => !KIT2_BO.has(id)));
