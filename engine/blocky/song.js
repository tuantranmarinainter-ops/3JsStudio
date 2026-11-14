// IDLE SỐNG (ô FX 'idleSong'): chồng nhịp thở + lắc đầu + đung đưa tay của blocky-shorts (BASES.idle, engine/blocky/poses.js)
// lên MỌI clip đứng tại chỗ của R6/R15, mỗi nhân vật lệch pha theo tên (công thức pha của blocky engine.js:161) → đám đông không thở đồng loạt.
// Cộng THÊM vào góc khớp sau khi a.animate() đã đặt pose (khung sau animate đặt lại từ đầu nên không cộng dồn). Hàm thuần của t, không ngẫu nhiên.
// Tắt ô FX = không gọi hàm này → hình y hệt cũ.
import { BASES, REST } from './poses.js';
import { hash } from './util.js';

// clip di chuyển / cả thân đã tự chuyển động mạnh → không chồng thêm
const BO_QUA = new Set(['walk', 'run', 'jump', 'fall', 'tumble', 'faint', 'lie', 'dance', 'panic', 'shiver', 'cower', 'tpose', 'swim', 'hug']);
const R0 = REST();

export const phaOf = (name) => (hash(name) % 1000) / 160;

/** Cộng lớp sống lên bộ phận của diễn viên `a` (đã animate xong). gain = độ mạnh (1 = như blocky). */
export function themSong(a, name, anim, t, gain = 1) {
  if (BO_QUA.has(anim) || !a?.parts) return;
  const P = a.parts, q = BASES.idle(t, phaOf(name));
  const add = (part, ax, v) => { const p = P[part]; if (p) p.rotation[ax] += v * gain; };
  add('torso', 'x', q.up[0]); add('torso', 'z', q.up[2]);
  add('head', 'y', q.neck[1]);
  add('leftArm', 'z', q.aL[2] - R0.aL[2]); add('rightArm', 'z', q.aR[2] - R0.aR[2]);
}
