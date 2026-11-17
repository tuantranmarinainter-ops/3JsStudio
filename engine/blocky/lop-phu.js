// LỚP PHỦ KIỂU BLOCKY — vẽ 2D lên một canvas 1080×1920 đặt trên khung 3D (trình phát) và được dán vào khung xuất MP4 (tools/export-ui.js: window.__lopPhu).
//   shot.bfx = [{ t, ...một loại }] (t = giây từ đầu shot):
//     { sign: { text: 'MẤT\nĐỒ', icon: 'stop', slash: false }, until }   biển cảnh báo bật ở trên
//     { stamp: 'MẤT!', dur }                                              dấu đóng đập vào
//     { icon: 'question', on: 'hero', dur, size }                         biểu tượng nổi trên đầu (exclaim question interrobang zzz anger heart sweat dots dollar star skull check cross fire bulb clock…)
//     { bulb: 'hero' } · { sparkle: 'hero' } · { glint: 'hero' } · { burst: 'hero' }
//     { say: 'Chào!', on: 'hero', dur }                                   bong bóng thoại
//     { title: 'MỘT TUẦN SAU', dur, style: 'card'|'banner' }              thẻ tiêu đề / băng rôn
//     { flash: true }                                                     chớp trắng
//   punch / shake cũng nằm trong shot.bfx nhưng do máy quay xử lý (engine/blocky/may.js).
// Phụ đề kiểu blocky (ô FX phuDeBlocky): từng chữ bật lên theo mốc giọng thật (captions [t0, t1, chữ, [[ws, we]…]]), chữ thuộc cụm NHẤN tô vàng.
// Hàm thuần của (t, shot, vị trí 3D): tua tới/lui ra cùng hình. Ô FX lopPhu / phuDeBlocky tắt → không vẽ phần đó.
import * as O from './overlays.js';

const W = 720, H = 1280;   // hệ toạ độ gốc của overlays.js
const norm = (s) => s.toLowerCase().normalize('NFC').replace(/[.,!?…:;"“”()]/g, '');

/** Đánh dấu chữ nào thuộc cụm nhấn (so không phân biệt hoa thường, bỏ dấu câu). */
export function danhDauNhan(words, nhan = []) {
  const w = words.map(norm), hl = words.map(() => false);
  for (const ph of nhan) {
    const p = norm(ph).split(/\s+/).filter(Boolean); if (!p.length) continue;
    for (let i = 0; i + p.length <= w.length; i++) if (p.every((x, j) => w[i + j] === x)) for (let j = 0; j < p.length; j++) hl[i + j] = true;
  }
  return hl;
}

export function createLopPhu({ THREE, canvas, camera, actors, props = {}, nhan = [], style = {} }) {
  const ctx = canvas.getContext('2d');
  const v = new THREE.Vector3();
  const on = (k) => globalThis.__autoFx?.[k] !== false;
  // điểm màn hình (hệ 720×1280) của đầu / mặt chủ thể; sau máy → null
  function diem(ref, dy = 5.6) {
    const a = actors[ref];
    if (a && a.root.visible) { a.root.getWorldPosition(v); v.y += dy * (a.root.scale.y || 1); }
    else if (props[ref]) { props[ref].getWorldPosition(v); v.y += 1; }
    else if (Array.isArray(ref)) v.set(ref[0], ref[1], ref[2]);
    else return null;
    v.project(camera); if (v.z > 1 || v.z < -1) return null;
    // cảnh cận: đầu sát mép trên → giữ biểu tượng / bong bóng trong vùng nhìn thấy
    return { x: Math.min(W - 90, Math.max(90, (v.x + 1) / 2 * W)), y: Math.max(150, (1 - v.y) / 2 * H) };
  }
  function veHieuUng(shot, local) {
    for (const f of shot.bfx || []) {
      const t0 = f.t ?? 0; if (local < t0) continue;
      if (f.sign) { if (f.until == null || local < f.until) O.drawSign(ctx, W, H, local, f.instant ? t0 - 1 : t0, typeof f.sign === 'string' ? { text: f.sign } : f.sign); }
      else if (f.stamp) { if (local - t0 < (f.dur ?? 1.4)) O.drawStamp(ctx, W, H, local, t0, typeof f.stamp === 'string' ? { text: f.stamp } : f.stamp); }
      else if (f.icon) { const p = diem(f.on); if (p) O.drawFloatIcon(ctx, local, t0, f.dur ?? 1.2, p, f.icon, f.size ?? 90); }
      else if (f.bulb) { const p = diem(f.bulb); if (p) O.drawFloatIcon(ctx, local, t0, f.dur ?? 1.2, { x: p.x - 40, y: p.y }, 'bulb', f.size ?? 110); }
      else if (f.sparkle) { const p = diem(f.sparkle); if (p) O.drawSparkles(ctx, local, t0, p); }
      else if (f.glint) { const p = diem(f.glint, 4.9); if (p) O.drawGlint(ctx, local, t0, { x: p.x + 30, y: p.y - 10 }); }
      else if (f.burst) { const p = diem(f.burst, 3.2); if (p) O.drawBurst(ctx, local, t0, p); }
      else if (f.say) { const p = diem(f.on); if (p) O.drawBubble(ctx, W, H, local, t0, f.dur ?? 1.4, p, f.say); }
      else if (f.title) O.drawTitle(ctx, W, H, local, t0, f.dur ?? 1, { text: f.title, style: f.style, bg: f.bg, color: f.color });
      else if (f.flash) O.flash(ctx, W, H, 1 - (local - t0) / (f.dur ?? .25));
    }
  }
  function vePhuDe(t, L) {
    let c = null; for (const x of L) if (x[0] <= t + 1e-4 && t < x[1]) { c = x; break; }
    if (!c) return;
    const words = c[2].split(' '), ws = c[3];
    let n = words.length, age = t - c[0];
    if (ws && ws.length === words.length) { n = 0; for (let j = 0; j < ws.length; j++) if (ws[j][0] <= t + 1e-4) { n = j + 1; age = t - ws[j][0]; } if (!n) { n = 1; age = t - c[0]; } }
    const hl = danhDauNhan(words, nhan);
    const segs = []; for (let j = 0; j < n; j++) segs.push({ t: (j ? ' ' : '') + words[j], hl: hl[j] });
    O.drawCaption(ctx, W, H, segs, age, { size: 52, y: .7, anim: 'pop', stroke: 10, ...style });
  }
  return {
    canvas,
    /** t = giây cả phim, local = giây trong shot, L = danh sách phụ đề đang dùng (rỗng = tắt phụ đề). */
    draw(t, shot, local, L = []) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
      if (on('lopPhu')) veHieuUng(shot, local);
      if (on('phuDeBlocky') && L.length) vePhuDe(t, L);
    },
  };
}
