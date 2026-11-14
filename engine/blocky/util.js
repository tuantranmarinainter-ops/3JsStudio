// CHÉP NGUYÊN từ bộ skill 'blocky-shorts' (In This Town Skill Files, tác giả chưa rõ, 2026-11-14) — engine/js/util.js.
// Người dùng cho phép dùng và nhận trách nhiệm (2026-11-14). Không sửa tệp này; mã nối của mình nằm ở engine/blocky/song.js, co-canh.js.
// Shared helpers: math, easing, seeded random, canvas textures, materials.
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => (b === a ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a)));
export const smooth = t => t * t * (3 - 2 * t);
export const E = {
  linear: t => t,
  in: t => t * t * t,
  out: t => 1 - Math.pow(1 - t, 3),
  inout: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1),
  expoIn: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
};
export function rng(seed) {
  let s = seed | 0;
  return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const hash = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const toV = (a) => (a instanceof THREE.Vector3 ? a.clone() : Array.isArray(a) ? V(a[0] || 0, a[1] || 0, a[2] || 0) : V());
export const deg = d => d * Math.PI / 180;
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
// smooth pseudo-noise for handheld / tremble (deterministic in t)
export const noise1 = (t, s = 0) => Math.sin(t * 1.31 + s) * .5 + Math.sin(t * 2.71 + s * 1.7) * .3 + Math.sin(t * 5.13 + s * 2.3) * .2;

// ---------- canvas textures
export function canvasTex(w, h, draw, { repeat = 0, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
export function noiseFill(base, amt, seed, blotch = 0) {
  return (g, w, h) => {
    const r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < blotch; i++) { g.fillStyle = `rgba(${r() < .5 ? 0 : 255},${r() < .5 ? 0 : 255},${r() < .5 ? 0 : 255},0.03)`; const s = 20 + r() * 80; g.fillRect(r() * w, r() * h, s, s); }
    const id = g.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) { const n = (r() - .5) * amt; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
    g.putImageData(id, 0, 0);
  };
}
const texCache = {};
export function tex(name, rep = 1) {
  const k = name + rep; if (texCache[k]) return texCache[k];
  const T = {
    asphalt: () => canvasTex(512, 512, noiseFill('#8d9097', 26, 3, 40), { repeat: rep }),
    grass: () => canvasTex(256, 256, noiseFill('#4f9a35', 40, 5, 30), { repeat: rep }),
    dirt: () => canvasTex(256, 256, noiseFill('#9b7a52', 34, 6, 30), { repeat: rep }),
    concrete: () => canvasTex(256, 256, noiseFill('#b9bcc2', 18, 7, 20), { repeat: rep }),
    carpet: () => canvasTex(256, 256, noiseFill('#6c7a92', 22, 8), { repeat: rep }),
    stone: () => canvasTex(256, 256, (g, w, h) => { noiseFill('#a7adb5', 30, 9)(g, w, h); g.strokeStyle = 'rgba(60,64,70,.35)'; g.lineWidth = 2; for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 24; x < w; x += 48) g.strokeRect(x, y, 48, 32); }, { repeat: rep }),
    brick: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#b5523b'; g.fillRect(0, 0, w, h); const r = rng(12); for (let y = 0; y < h; y += 24) for (let x = (y / 24 % 2) * 26 - 26; x < w; x += 52) { g.fillStyle = `hsl(${10 + r() * 8},${45 + r() * 15}%,${38 + r() * 10}%)`; g.fillRect(x + 2, y + 2, 48, 20); } }, { repeat: rep }),
    wood: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#a0623a'; g.fillRect(0, 0, w, h); const r = rng(21); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(60,30,10,${.1 + r() * .2})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + r() * 8 - 4, w * .6, y + r() * 8 - 4, w, y); g.stroke(); } }, { repeat: rep }),
    planks: () => canvasTex(512, 512, (g, w, h) => { const r = rng(31); for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(28,${45 + r() * 10}%,${42 + r() * 8}%)`; g.fillRect(0, i * 64, w, 64); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, i * 64, w, 3); for (let k = 0; k < 3; k++) g.fillRect(r() * w, i * 64, 3, 64); } }, { repeat: rep }),
    tiles: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e9ecef'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c3c8ce'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, { repeat: rep }),
    checker: () => canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#d9c79a' : '#bfa877'; g.fillRect(x * 64, y * 64, 64, 64); } }, { repeat: rep }),
  };
  texCache[k] = (T[name] || T.concrete)();
  return texCache[k];
}

// ---------- materials & mesh helpers
const matCache = {};
export function M(color, opts = {}) {
  const k = color + JSON.stringify(opts, (key, v) => (v && v.isTexture ? v.uuid : v));
  if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: 0, ...opts });
  return matCache[k];
}
export function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
export function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) { const m = mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
export function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, parent, seg = 24) { const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
export function sph(r, mat, x = 0, y = 0, z = 0, parent, seg = 18) { const m = mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * .7 | 0)), mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
export function emissive(color, intensity = 1) { return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: .4 }); }
export function textPlane(w, h, draw, { px = 256, emissiveI = 0 } = {}) {
  const t = canvasTex(Math.round(px * w / h), px, draw);
  const mat = new THREE.MeshStandardMaterial({ map: t, roughness: .8, emissive: emissiveI ? '#ffffff' : '#000000', emissiveMap: emissiveI ? t : null, emissiveIntensity: emissiveI });
  return mesh(new THREE.PlaneGeometry(w, h), mat, false, true);
}
// Fit multi-line text into a canvas box
export function fitText(g, lines, w, h, { font = "'BS Black'", color = '#fff', maxSize = 120, lineGap = 1.08 } = {}) {
  let size = maxSize; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (; size > 8; size -= 2) { g.font = `900 ${size}px ${font}`; const wide = Math.max(...lines.map(l => g.measureText(l).width)); if (wide < w * .9 && lines.length * size * lineGap < h * .9) break; }
  g.fillStyle = color; const total = lines.length * size * lineGap;
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 - total / 2 + size * lineGap * (i + .5)));
  return size;
}
