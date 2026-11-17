// CHÉP từ bộ skill 'blocky-shorts' (In This Town Skill Files, tác giả chưa rõ, 2026-11-14) — engine/js/overlays.js. Người dùng cho dùng (2026-11-14).
// Chỉ đổi 2 dòng FONT sang Be Vietnam Pro (có dấu tiếng Việt, phông phụ đề đã chốt). Vẽ trong hệ 720×1280 như bản gốc; mã nối: engine/blocky/lop-phu.js.
// 2D overlay layer drawn on top of the 3D frame: captions, pop-in signs, stamps, icons, speech bubbles,
// title cards, sparkles, comic bursts, transitions, vignette.
import { clamp, lerp, E, rng } from './util.js';

export const FONT = "'Be Vietnam Pro', 'Inter', sans-serif";
export const FONT_BLACK = "'Be Vietnam Pro', 'Inter', sans-serif";

// ---------- captions:  "found a *cheat code.*"  -> segments; whole line in *...* = highlighted line
export function parseCaption(text) {
  const segs = []; const re = /\*([^*]+)\*/g; let last = 0, m;
  while ((m = re.exec(text))) { if (m.index > last) segs.push({ t: text.slice(last, m.index), hl: false }); segs.push({ t: m[1], hl: true }); last = re.lastIndex; }
  if (last < text.length) segs.push({ t: text.slice(last), hl: false });
  return segs.filter(s => s.t.length);
}
export const plain = (text) => text.replace(/\*/g, '');
export function drawCaption(ctx, W, H, segs, age, st = {}) {
  const size = st.size || 50, y = H * (st.y ?? .725), anim = st.anim || 'pop';
  let s = 1, dy = 0, alpha = 1;
  if (anim === 'pop' && age < .09) s = lerp(.82, 1, E.back(age / .09));
  if (anim === 'bounce' && age < .16) { s = lerp(.6, 1, E.elastic(age / .16)); }
  if (anim === 'rise' && age < .12) { dy = 18 * (1 - E.out(age / .12)); alpha = E.out(age / .12); }
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(W / 2, y + dy); ctx.scale(s, s);
  const caps = st.uppercase; const parts = segs.map(p => ({ ...p, t: caps ? p.t.toUpperCase() : p.t }));
  ctx.font = `800 ${size}px ${st.font || FONT}`; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  // wrap if too wide
  const maxW = W * .86; let total = parts.reduce((a, p) => a + ctx.measureText(p.t).width, 0);
  if (total > maxW) { const k = maxW / total; ctx.scale(k, k); }
  let x = -total / 2;
  for (const p of parts) {
    const w = ctx.measureText(p.t).width; ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.lineWidth = st.stroke ?? 9; ctx.strokeStyle = st.strokeColor || '#000'; ctx.strokeText(p.t, x, 0);
    ctx.shadowColor = 'transparent'; ctx.fillStyle = p.hl ? (st.highlight || '#ffdc1f') : (st.color || '#ffffff'); ctx.fillText(p.t, x, 0);
    x += w;
  }
  ctx.restore();
}

// ---------- vector icons (no emoji font needed). name or any emoji character.
export const ICONS = ['exclaim', 'question', 'interrobang', 'zzz', 'anger', 'heart', 'sweat', 'dots', 'note', 'dollar', 'star', 'skull', 'check', 'cross', 'fire', 'bulb', 'clap', 'sleep', 'yawn', 'sneeze', 'laugh', 'face', 'phone', 'clock', 'stop'];
export function drawIcon(ctx, name, x, y, size, t = 0) {
  ctx.save(); ctx.translate(x, y); const s = size / 100; ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const outline = (fill, w = 10) => { ctx.lineWidth = w; ctx.strokeStyle = '#111'; ctx.stroke(); ctx.fillStyle = fill; ctx.fill(); };
  const txt = (str, color, sz = 100, font = FONT_BLACK) => { ctx.font = `900 ${sz}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 12; ctx.strokeStyle = '#111'; ctx.strokeText(str, 0, 0); ctx.fillStyle = color; ctx.fillText(str, 0, 0); };
  switch (name) {
    case 'exclaim': txt('!', '#ff3b30', 120); break;
    case 'question': txt('?', '#ffdc1f', 120); break;
    case 'interrobang': txt('!?', '#ff3b30', 100); break;
    case 'zzz': ctx.rotate(-.15); [['Z', 0, 20, 70], ['z', 40, -30, 55], ['z', 72, -70, 42]].forEach(([c, dx, dy, sz], i) => { ctx.save(); ctx.translate(dx - 30, dy + 10 + Math.sin(t * 3 + i) * 6); txt(c, '#ffffff', sz); ctx.restore(); }); break;
    case 'anger': ctx.strokeStyle = '#e8202a'; ctx.lineWidth = 14; for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.beginPath(); ctx.moveTo(10, -40); ctx.quadraticCurveTo(12, -12, 40, -10); ctx.stroke(); ctx.restore(); } break;
    case 'heart': ctx.beginPath(); ctx.moveTo(0, 40); ctx.bezierCurveTo(-70, -5, -40, -60, 0, -22); ctx.bezierCurveTo(40, -60, 70, -5, 0, 40); outline('#ff3b6b'); break;
    case 'sweat': ctx.beginPath(); ctx.moveTo(0, -45); ctx.quadraticCurveTo(38, 20, 0, 40); ctx.quadraticCurveTo(-38, 20, 0, -45); outline('#6cc4ff', 8); break;
    case 'dots': for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-34 + i * 34, 0, 11 + 3 * Math.max(0, Math.sin(t * 6 - i)), 0, 7); outline('#ffffff', 7); } break;
    case 'note': ctx.beginPath(); ctx.ellipse(-12, 26, 20, 15, -.4, 0, 7); outline('#ffffff', 8); ctx.beginPath(); ctx.rect(2, -44, 10, 70); outline('#ffffff', 6); break;
    case 'dollar': ctx.beginPath(); ctx.arc(0, 0, 44, 0, 7); outline('#4cd964'); txt('$', '#ffffff', 70); break;
    case 'star': ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 20 : 46, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); outline('#ffdc1f'); break;
    case 'skull': ctx.beginPath(); ctx.arc(0, -8, 38, Math.PI * .85, Math.PI * 2.15); ctx.lineTo(18, 38); ctx.lineTo(-18, 38); ctx.closePath(); outline('#f4f4f4'); ctx.fillStyle = '#111'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 15, -5, 10, 0, 7); ctx.fill(); } break;
    case 'check': ctx.beginPath(); ctx.arc(0, 0, 44, 0, 7); outline('#34c759'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-5, 16); ctx.lineTo(22, -14); ctx.stroke(); break;
    case 'cross': case 'stop': ctx.beginPath(); ctx.arc(0, 0, 44, 0, 7); outline('#ff3b30'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 14; ctx.beginPath(); if (name === 'cross') { ctx.moveTo(-18, -18); ctx.lineTo(18, 18); ctx.moveTo(18, -18); ctx.lineTo(-18, 18); } else { ctx.moveTo(-24, 0); ctx.lineTo(24, 0); } ctx.stroke(); break;
    case 'fire': ctx.beginPath(); ctx.moveTo(0, 44); ctx.bezierCurveTo(-46, 40, -40, -10, -10, -46); ctx.bezierCurveTo(-8, -18, 10, -20, 14, -36); ctx.bezierCurveTo(44, -6, 44, 40, 0, 44); outline('#ff7a1a'); ctx.beginPath(); ctx.moveTo(0, 40); ctx.bezierCurveTo(-20, 36, -18, 10, 0, -6); ctx.bezierCurveTo(18, 12, 20, 36, 0, 40); ctx.fillStyle = '#ffdc1f'; ctx.fill(); break;
    case 'bulb': ctx.beginPath(); ctx.arc(0, -10, 34, Math.PI * .8, Math.PI * 2.2); ctx.lineTo(14, 26); ctx.lineTo(-14, 26); ctx.closePath(); outline('#ffe14d'); ctx.beginPath(); ctx.rect(-14, 28, 28, 14); outline('#999', 6); break;
    case 'clap': for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 16, 6); ctx.rotate(sx * .35); ctx.beginPath(); ctx.roundRect(-17, -42, 34, 84, 16); outline('#ffe2b8', 7); ctx.restore(); } break;
    case 'clock': ctx.beginPath(); ctx.arc(0, 0, 44, 0, 7); outline('#ffffff'); ctx.strokeStyle = '#111'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -28); ctx.moveTo(0, 0); ctx.lineTo(20, 8); ctx.stroke(); break;
    case 'phone': ctx.beginPath(); ctx.roundRect(-24, -44, 48, 88, 10); outline('#333'); ctx.fillStyle = '#4a8cff'; ctx.fillRect(-17, -34, 34, 62); break;
    case 'sleep': drawIcon(ctx, 'zzz', 0, 0, 100, t); break;
    case 'yawn': case 'face': case 'sneeze': case 'laugh': { ctx.beginPath(); ctx.arc(0, 0, 44, 0, 7); outline('#f5cd30', 8); ctx.strokeStyle = '#111'; ctx.lineWidth = 7; for (const s of [-1, 1]) { ctx.beginPath(); if (name === 'laugh') ctx.arc(s * 16, -8, 8, Math.PI * 1.1, Math.PI * 1.9); else ctx.arc(s * 16, -12, 9, Math.PI * .15, Math.PI * .85); ctx.stroke(); } ctx.fillStyle = '#111'; ctx.beginPath(); if (name === 'yawn') ctx.ellipse(0, 18, 12, 17, 0, 0, 7); else if (name === 'laugh') { ctx.moveTo(-20, 8); ctx.quadraticCurveTo(0, 40, 20, 8); ctx.closePath(); } else if (name === 'sneeze') ctx.ellipse(0, 16, 9, 7, 0, 0, 7); else { ctx.lineWidth = 6; ctx.arc(0, 4, 18, .2 * Math.PI, .8 * Math.PI); ctx.stroke(); break; } ctx.fill(); if (name === 'sneeze') { ctx.fillStyle = '#7cc6ff'; for (const [x, y] of [[30, 14], [38, 24], [26, 30]]) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); } } break; }
    default: ctx.font = `100px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name, 0, 6);
  }
  ctx.restore();
}

// ---------- pop-in sign card (top of frame)
export function drawSign(ctx, W, H, t, t0, o = {}) {
  const age = t - t0; if (age < 0) return;
  const s = age < .35 ? E.back(clamp(age / .28)) : 1, rot = -.07 + .16 * Math.exp(-age * 7) * Math.cos(age * 26);
  const lines = Array.isArray(o.text) ? o.text : String(o.text || 'NO\nYAWNING').split('\n');
  const red = o.color || '#e1262c';
  ctx.save(); ctx.translate(W / 2 + (o.dx ?? 40), (o.y ?? 250) + 6 * Math.sin(t * 2.2)); ctx.rotate(o.tilt ?? rot); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
  ctx.beginPath(); ctx.roundRect(-250, -100, 500, 200, 26); ctx.fillStyle = o.bg || '#fbf6ea'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = 14; ctx.strokeStyle = red; ctx.stroke();
  const hasIcon = o.icon !== false && o.icon !== 'none';
  if (hasIcon) {
    ctx.beginPath(); ctx.roundRect(-225, -75, 150, 150, 22); ctx.fillStyle = o.iconBg || '#f3c48a'; ctx.fill();
    drawIcon(ctx, o.icon || 'yawn', -150, 0, 92, t);
    if (o.slash !== false) { ctx.strokeStyle = red; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-215, 65); ctx.lineTo(-85, -65); ctx.stroke(); }
  }
  ctx.fillStyle = red; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cx = hasIcon ? 85 : 0, maxW = hasIcon ? 300 : 440;
  const n = lines.length; let sz = n === 1 ? 74 : n === 2 ? 60 : 44;
  ctx.font = `900 ${sz}px ${FONT_BLACK}`; const wmax = Math.max(...lines.map(l => ctx.measureText(l).width)); if (wmax > maxW) { sz *= maxW / wmax; ctx.font = `900 ${sz}px ${FONT_BLACK}`; }
  lines.forEach((l, i) => ctx.fillText(l, cx, (i - (n - 1) / 2) * sz * 1.08 + 4));
  ctx.restore();
}
// ---------- rubber stamp
export function drawStamp(ctx, W, H, t, t0, o = {}) {
  const age = t - t0; if (age < 0) return; const k = clamp(age / .1);
  const s = lerp(2.6, 1, E.in(k)), al = lerp(0, .95, clamp(k * 2)); const text = o.text || 'DENIED!'; const col = o.color || '#e0242b';
  ctx.save(); ctx.globalAlpha = al; ctx.translate(W / 2, H * (o.y ?? .43)); ctx.rotate(o.rot ?? -.18); ctx.scale(s, s);
  ctx.font = `900 74px ${FONT_BLACK}`; let tw = ctx.measureText(text).width; let sc = 1; if (tw > 520) { sc = 520 / tw; } ctx.scale(sc, sc); tw = Math.max(tw, 300);
  ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.beginPath(); ctx.roundRect(-tw / 2 - 30, -62, tw + 60, 124, 14); ctx.stroke(); ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-tw / 2 - 16, -48, tw + 32, 96, 8); ctx.stroke();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 4);
  ctx.globalCompositeOperation = 'destination-out'; const r = rng(3); for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(-tw / 2 - 30 + r() * (tw + 60), -62 + r() * 124, 1 + r() * 3, 0, 7); ctx.fill(); }
  ctx.restore();
}
// ---------- sparkles & comic burst (anchored to a screen point)
function star4(ctx, x, y, r, rot, fill) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.quadraticCurveTo(0, 0, Math.cos(a + Math.PI / 2) * r, Math.sin(a + Math.PI / 2) * r); } ctx.closePath(); ctx.fillStyle = fill; ctx.shadowColor = '#fff6b0'; ctx.shadowBlur = 18; ctx.fill(); ctx.restore(); }
export function drawSparkles(ctx, t, t0, p, scale = 1) { const age = t - t0; if (age < 0 || age > .6) return; const pts = [[-70, -40, 26], [80, -70, 20], [60, 50, 16], [-55, 70, 14], [0, -110, 18]]; pts.forEach(([dx, dy, r], i) => { const a = clamp((age - i * .04) / .45); if (a <= 0 || a >= 1) return; const s = Math.sin(a * Math.PI); star4(ctx, p.x + dx * scale * (1 + a * .3), p.y + dy * scale * (1 + a * .3), r * s * 1.4 * scale, a * 1.5, i % 2 ? '#fff' : '#fff2a0'); }); }
export function drawGlint(ctx, t, t0, p) { const age = t - t0; if (age < 0 || age > .35) return; const s = Math.sin(age / .35 * Math.PI); star4(ctx, p.x, p.y, 34 * s, age * 4, '#ffffff'); }
export function drawBurst(ctx, t, t0, p, scale = 1) { const age = t - t0; if (age < 0 || age > .2) return; const a = age / .2; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(scale, scale); ctx.lineCap = 'round'; for (let i = 0; i < 9; i++) { const ang = i / 9 * Math.PI * 2 + .3; const r0 = 40 + a * 50, r1 = r0 + 34 * (1 - a); ctx.strokeStyle = '#000'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1); ctx.stroke(); ctx.strokeStyle = i % 2 ? '#fff' : '#ffe14d'; ctx.lineWidth = 5; ctx.stroke(); } ctx.restore(); }
// floating icon above a head: pops in, bobs, fades out
export function drawFloatIcon(ctx, t, t0, dur, p, name, size = 90) { const age = t - t0; if (age < 0 || age > dur) return; const s = E.back(clamp(age / .2)) * (1 - clamp((age - dur + .15) / .15)); ctx.save(); ctx.globalAlpha = clamp(1 - (age - dur + .15) / .15); drawIcon(ctx, name, p.x + 40, p.y - 40 - age * 14 + 4 * Math.sin(age * 6), size * s, t); ctx.restore(); }
// speech bubble
export function drawBubble(ctx, W, H, t, t0, dur, p, text, o = {}) {
  const age = t - t0; if (age < 0 || age > dur) return; const s = age < .18 ? E.back(age / .18) : 1 - clamp((age - dur + .12) / .12);
  ctx.save(); ctx.font = `800 ${o.size || 40}px ${FONT}`; const lines = String(text).split('\n'); const tw = Math.max(...lines.map(l => ctx.measureText(l).width)); const bw = Math.min(W * .8, tw + 60), bh = lines.length * (o.size || 40) * 1.15 + 40;
  let bx = clamp(p.x - bw / 2, 20, W - bw - 20), by = clamp(p.y - bh - 70, 40, H - bh - 40);
  ctx.translate(bx + bw / 2, by + bh); ctx.scale(s, s); ctx.translate(-bw / 2, -bh);
  ctx.fillStyle = o.bg || '#ffffff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(0, 0, bw, bh, 28); ctx.fill(); ctx.stroke();
  const tx = clamp(p.x - bx, 30, bw - 30); ctx.beginPath(); ctx.moveTo(tx - 18, bh - 4); ctx.lineTo(tx + (p.x - (bx + tx)) * .4, bh + 40); ctx.lineTo(tx + 18, bh - 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(tx - 15, bh - 10, 30, 10);
  ctx.fillStyle = o.color || '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, bw / 2, 20 + (o.size || 40) * 1.15 * (i + .5)));
  ctx.restore();
}
// title card / banner
export function drawTitle(ctx, W, H, t, t0, dur, o = {}) {
  const age = t - t0; if (age < 0 || age > dur) return; const lines = String(o.text || '').split('\n');
  const fin = clamp(age / .12), fout = 1 - clamp((age - dur + .12) / .12);
  if ((o.style || 'card') === 'card') {
    ctx.save(); ctx.globalAlpha = Math.min(fin, fout); ctx.fillStyle = o.bg || '#000'; ctx.fillRect(0, 0, W, H);
    const sc = lerp(1.15, 1, E.out(fin)); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let sz = o.size || 78; ctx.font = `900 ${sz}px ${FONT_BLACK}`; const mw = Math.max(...lines.map(l => ctx.measureText(l).width)); if (mw > W * .86) { sz *= W * .86 / mw; ctx.font = `900 ${sz}px ${FONT_BLACK}`; }
    ctx.fillStyle = o.color || '#ffffff'; lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * sz * 1.1)); ctx.restore();
  } else { // banner at top
    ctx.save(); const k = E.back(clamp(age / .2)) * fout; ctx.translate(W / 2, o.y ?? 170); ctx.scale(k, k); ctx.rotate(-.03);
    ctx.font = `900 ${o.size || 58}px ${FONT_BLACK}`; const tw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 60; const bh = lines.length * (o.size || 58) * 1.1 + 34;
    ctx.fillStyle = o.bg || '#ffdc1f'; ctx.strokeStyle = '#111'; ctx.lineWidth = 8; ctx.beginPath(); ctx.roundRect(-tw / 2, -bh / 2, tw, bh, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = o.color || '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * (o.size || 58) * 1.1 + 3)); ctx.restore();
  }
}
export function vignette(ctx, W, H, amt = .42) { if (!amt) return; const g = ctx.createRadialGradient(W / 2, H * .48, H * .28, W / 2, H * .5, H * .78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${amt})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
export function flash(ctx, W, H, a, color = '#ffffff') { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
export function progressBar(ctx, W, H, u, color = '#ffdc1f') { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(0, H - 8, W, 8); ctx.fillStyle = color; ctx.fillRect(0, H - 8, W * u, 8); }
