// Gộp các lớp số Codex (kit2-<cụm>.js, sinh bởi tools/kb/kit2-sang-shot.mjs từ kich-ban/ep003-kit2/kit-<cụm>.json). Mỗi cụm một file để ba người sửa song song không đè nhau.
import { KIT2 as A } from './kit2-phong.js';
import { KIT2 as B } from './kit2-pho.js';
import { KIT2 as C } from './kit2-nha-may.js';
export const KIT2 = { ...A, ...B, ...C };
