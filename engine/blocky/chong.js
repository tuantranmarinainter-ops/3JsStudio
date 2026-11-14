// ĐỘNG TÁC CHỒNG LỚP (ô FX 'chongLop', mặc định tắt): diễn viên ghi `do: [{ a:'wave', t:[0.3,1.1], arm:'R' }, …]` — mỗi động tác chỉ ghi
// "một phần cơ thể" (ACTIONS của blocky-shorts, engine/blocky/poses.js), trộn lên dáng nền đã animate (idle/đi/ngồi…) theo trọng số,
// mờ vào/ra 0,12 s (cách làm của blocky engine.js:248-260). t = [bắt đầu, kết thúc] tính bằng giây từ đầu shot; thiếu t = cả shot.
// Hàm thuần của (local, tham số): tua tới/lui ra cùng kết quả. Tắt ô FX hoặc không ghi `do` = không đụng gì → hình y hệt cũ.
// Chạy SAU a.animate() và idle sống (khung sau animate đặt lại pose từ đầu nên không cộng dồn); không import three.
import { ACTIONS } from './poses.js';
import { lerp, clamp } from './util.js';

export const FADE = 0.12;
export const chongOn = () => globalThis.__autoFx?.chongLop === true;
// khớp blocky → bộ phận của rig R6/R15 (cùng tên parts)
const KHOP = { up: 'torso', neck: 'head', aL: 'leftArm', aR: 'rightArm' };

/** Trọng số mờ vào/ra của một động tác tại giờ local của shot. */
export function trongSo(local, t0, t1, fade = FADE) {
  const d = Math.max(1e-6, t1 - t0), f = Math.min(fade, d / 2);
  return clamp(Math.min((local - t0) / f, (t1 - local) / f), 0, 1);
}

/** Trộn các động tác `list` lên diễn viên `a` (đã animate xong) tại giờ local. */
export function chongLop(a, list, local, dur = Infinity) {
  if (!a?.parts || !Array.isArray(list)) return;
  for (const it of list) {
    const fn = ACTIONS[it.a]; if (!fn) continue;
    const [t0, t1] = it.t || [0, dur];
    const w = trongSo(local, t0, t1); if (w <= 0) continue;
    const lt = local - t0, u = clamp(lt / Math.max(1e-6, t1 - t0), 0, 1);
    const q = fn(lt, u, it) || {};
    for (const [k, part] of Object.entries(KHOP)) {
      const v = q[k], p = a.parts[part]; if (!v || !p) continue;
      for (let i = 0; i < 3; i++) if (v[i] != null) p.rotation['xyz'[i]] = lerp(p.rotation['xyz'[i]], v[i], w);
    }
    for (const [k, part] of [['lL', 'leftLeg'], ['lR', 'rightLeg']]) {
      const p = a.parts[part]; if (q[k] != null && p) p.rotation.x = lerp(p.rotation.x, q[k], w);
    }
  }
}
