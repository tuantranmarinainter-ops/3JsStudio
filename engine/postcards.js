// postcards.js — Texture canvas cho bưu thiếp (mặt trước có tranh + dòng chữ, mặt sau là lời nhắn).
//   const tex = postcardTexture(THREE, 'penguin');   // penguin | whale | mountain | island | beach | jungle | desert | city | forest
//   const back = postcardBack(THREE, ['Đã tìm thấy một thứ tuyệt vời.', 'Sẽ sớm về nhà thôi.', 'Yêu cả hai mẹ con.']);
//   const card = makePostcard(THREE, 'island', { back });  // Mesh 2 mặt, rộng 3 × cao 2.1 (stud)
// Chữ trên thiếp lấy theo lời kể (SRT) của tập.

export const CARD_TEXT = {
  penguin: ['Lời chào từ', 'Nam Cực.'],
  whale: ['Giữa Thái Bình Dương.', 'Thấy một chú cá voi', 'ngay dưới thuyền!'],
  mountain: ['Đỉnh của thế giới.', 'Ước gì hai mẹ con ở đây.'],
  island: ['Ước gì hai mẹ con ở đây.'],
};

const W = 512, H = 360;
const cache = new Map();

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function frame(g) {
  g.fillStyle = '#fbf3e1'; g.fillRect(0, 0, W, H);
  // viền răng cưa
  g.fillStyle = '#e9dcc0';
  for (let x = 0; x < W; x += 16) { g.beginPath(); g.arc(x + 8, 0, 6, 0, Math.PI); g.fill(); g.beginPath(); g.arc(x + 8, H, 6, Math.PI, 0); g.fill(); }
  for (let y = 0; y < H; y += 16) { g.beginPath(); g.arc(0, y + 8, 6, -Math.PI / 2, Math.PI / 2); g.fill(); g.beginPath(); g.arc(W, y + 8, 6, Math.PI / 2, -Math.PI / 2); g.fill(); }
  g.strokeStyle = '#d8c7a3'; g.lineWidth = 3; g.strokeRect(14, 14, W - 28, H - 28);
}

function stamp(g, x, y, color = '#d9413a') {
  g.fillStyle = '#fff'; g.fillRect(x - 4, y - 4, 64, 76);
  g.fillStyle = color; g.fillRect(x, y, 56, 68);
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x + 28, y + 14); g.lineTo(x + 44, y + 48); g.lineTo(x + 12, y + 48); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(60,60,60,0.45)'; g.lineWidth = 2;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x - 30, y + 40 + i * 9, 26, -0.6, 0.6); g.stroke(); }
}

function sky(g, x, y, w, h, top, bot) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(x, y, w, h); }
function sea(g, x, y, w, h, c1 = '#3cc6d8', c2 = '#1f8fb8') { sky(g, x, y, w, h, c1, c2); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x + 20 + i * 70, y + 16 + (i % 3) * 18); g.quadraticCurveTo(x + 40 + i * 70, y + 8 + (i % 3) * 18, x + 60 + i * 70, y + 16 + (i % 3) * 18); g.stroke(); } }
function cloud(g, x, y, s) { g.fillStyle = '#fff'; for (const [dx, dy, r] of [[0, 0, 14], [16, -6, 18], [34, 0, 14], [17, 6, 14]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); } }
function palm(g, x, y, s) {
  g.strokeStyle = '#7a5530'; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6 * s, y - 25 * s, x + 2 * s, y - 45 * s); g.stroke();
  g.fillStyle = '#2f9a4a'; for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2; g.beginPath(); g.ellipse(x + 2 * s + Math.cos(ang) * 14 * s, y - 45 * s + Math.sin(ang) * 6 * s, 16 * s, 5 * s, ang, 0, Math.PI * 2); g.fill(); }
}
function lighthouse(g, x, y, s) {
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#2f8f6b'; g.fillRect(x - (9 - i) * s, y - (i + 1) * 12 * s, (18 - 2 * i) * s, 12 * s); }
  g.fillStyle = '#ffe38a'; g.fillRect(x - 5 * s, y - 72 * s, 10 * s, 10 * s);
  g.fillStyle = '#2f8f6b'; g.beginPath(); g.moveTo(x - 8 * s, y - 72 * s); g.lineTo(x + 8 * s, y - 72 * s); g.lineTo(x, y - 84 * s); g.closePath(); g.fill();
}
function island(g, cx, cy, s) {
  g.fillStyle = '#7a5a3a'; g.beginPath(); g.ellipse(cx, cy, 90 * s, 22 * s, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f0d58a'; g.beginPath(); g.ellipse(cx, cy - 6 * s, 82 * s, 18 * s, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#5bbf5a'; g.beginPath(); g.ellipse(cx - 10 * s, cy - 12 * s, 50 * s, 12 * s, 0, 0, Math.PI * 2); g.fill();
  palm(g, cx - 35 * s, cy - 10 * s, s); palm(g, cx + 20 * s, cy - 12 * s, s * 0.9);
  lighthouse(g, cx + 55 * s, cy - 8 * s, s * 0.8);
}

const ART = {
  penguin(g, x, y, w, h) {
    sky(g, x, y, w, h * 0.6, '#9fd3f2', '#d9f1ff');
    g.fillStyle = '#e8f4fb'; g.beginPath(); g.moveTo(x, y + h * 0.55); g.lineTo(x + w * 0.25, y + h * 0.2); g.lineTo(x + w * 0.45, y + h * 0.55); g.fill();
    g.beginPath(); g.moveTo(x + w * 0.4, y + h * 0.55); g.lineTo(x + w * 0.7, y + h * 0.12); g.lineTo(x + w, y + h * 0.55); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(x, y + h * 0.55, w, h * 0.45);
    for (let i = 0; i < 6; i++) {
      const px = x + w * (0.12 + i * 0.15), py = y + h * (0.86 - (i % 2) * 0.06), s = 1 - (i % 2) * 0.15;
      g.fillStyle = '#1d2433'; g.beginPath(); g.ellipse(px, py - 28 * s, 15 * s, 28 * s, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(px, py - 22 * s, 9 * s, 20 * s, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f2a33a'; g.fillRect(px - 3 * s, py - 47 * s, 6 * s, 4 * s); g.fillRect(px - 9 * s, py - 2, 7 * s, 3); g.fillRect(px + 2 * s, py - 2, 7 * s, 3);
    }
  },
  whale(g, x, y, w, h) {
    sky(g, x, y, w, h * 0.35, '#8fd0f5', '#d8f0ff'); cloud(g, x + w * 0.2, y + h * 0.15, 0.9);
    sea(g, x, y + h * 0.35, w, h * 0.65, '#43b4d6', '#155f8d');
    g.fillStyle = '#26364d'; g.beginPath(); g.ellipse(x + w * 0.48, y + h * 0.7, w * 0.3, h * 0.11, -0.05, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x + w * 0.76, y + h * 0.68); g.lineTo(x + w * 0.9, y + h * 0.55); g.lineTo(x + w * 0.88, y + h * 0.78); g.closePath(); g.fill();
    g.fillStyle = '#d7e3ea'; g.beginPath(); g.ellipse(x + w * 0.45, y + h * 0.76, w * 0.22, h * 0.04, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8a4a2a'; g.fillRect(x + w * 0.35, y + h * 0.37, w * 0.22, h * 0.05); g.fillStyle = '#fff'; g.fillRect(x + w * 0.45, y + h * 0.22, 3, h * 0.15);
  },
  mountain(g, x, y, w, h) {
    sky(g, x, y, w, h, '#7fbde8', '#eaf6ff');
    g.fillStyle = '#8a7d74'; g.beginPath(); g.moveTo(x + w * 0.2, y + h * 0.75); g.lineTo(x + w * 0.5, y + h * 0.08); g.lineTo(x + w * 0.8, y + h * 0.75); g.closePath(); g.fill();
    g.fillStyle = '#6b5f58'; g.beginPath(); g.moveTo(x + w * 0.5, y + h * 0.08); g.lineTo(x + w * 0.8, y + h * 0.75); g.lineTo(x + w * 0.55, y + h * 0.75); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x + w * 0.42, y + h * 0.26); g.lineTo(x + w * 0.5, y + h * 0.08); g.lineTo(x + w * 0.58, y + h * 0.26); g.lineTo(x + w * 0.5, y + h * 0.22); g.closePath(); g.fill();
    for (let i = 0; i < 7; i++) cloud(g, x + i * w * 0.15 - 10, y + h * 0.78 + (i % 2) * 8, 1.3);
  },
  island(g, x, y, w, h) {
    sky(g, x, y, w, h * 0.45, '#76c6f0', '#d8f3ff'); cloud(g, x + w * 0.15, y + h * 0.12, 0.8); cloud(g, x + w * 0.7, y + h * 0.2, 0.6);
    sea(g, x, y + h * 0.45, w, h * 0.55, '#4fd2dc', '#1b9ac0');
    island(g, x + w * 0.5, y + h * 0.7, w / 330);
  },
  beach(g, x, y, w, h) { sky(g, x, y, w, h * 0.5, '#6ec1ef', '#c9ecff'); sea(g, x, y + h * 0.5, w, h * 0.2); g.fillStyle = '#f2d48a'; g.fillRect(x, y + h * 0.7, w, h * 0.3); palm(g, x + w * 0.8, y + h * 0.8, 1.3); },
  jungle(g, x, y, w, h) { sky(g, x, y, w, h, '#8ed38b', '#2e7d3a'); for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#1f6b2e' : '#3c9a46'; g.beginPath(); g.arc(x + i * w / 8, y + h * (0.4 + (i % 3) * 0.15), 40, 0, Math.PI * 2); g.fill(); } },
  desert(g, x, y, w, h) { sky(g, x, y, w, h * 0.5, '#f7c77a', '#fde9c2'); g.fillStyle = '#e2a75a'; g.beginPath(); g.moveTo(x, y + h); g.quadraticCurveTo(x + w * 0.3, y + h * 0.3, x + w * 0.6, y + h * 0.7); g.quadraticCurveTo(x + w * 0.8, y + h * 0.45, x + w, y + h * 0.6); g.lineTo(x + w, y + h); g.fill(); },
  city(g, x, y, w, h) { sky(g, x, y, w, h, '#ffb68a', '#ffe3c8'); for (let i = 0; i < 8; i++) { g.fillStyle = ['#596a8a', '#7b88a8', '#495878'][i % 3]; const bh = h * (0.3 + ((i * 37) % 50) / 100); g.fillRect(x + i * w / 8, y + h - bh, w / 8 - 4, bh); } },
  forest(g, x, y, w, h) { sky(g, x, y, w, h * 0.6, '#a6d8f5', '#e6f6ff'); g.fillStyle = '#7dbd5a'; g.fillRect(x, y + h * 0.7, w, h * 0.3); for (let i = 0; i < 7; i++) { g.fillStyle = '#2f7a3a'; g.beginPath(); g.moveTo(x + i * w / 6, y + h * 0.25); g.lineTo(x + i * w / 6 + 28, y + h * 0.75); g.lineTo(x + i * w / 6 - 28, y + h * 0.75); g.fill(); } },
};

function hand(g, lines, x, y, size, color = '#4a3b2a', lh = 1.25) {
  g.fillStyle = color; g.font = `italic 600 ${size}px "Comic Sans MS", "Segoe Print", cursive, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, x, y + i * size * lh));
}

export function postcardTexture(THREE, kind, opts = {}) {
  const key = `front:${kind}:${opts.variant || 0}:${opts.text === false}`;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  frame(g);
  const text = opts.text === false ? null : (opts.lines || CARD_TEXT[kind]);
  const ah = text ? H * 0.6 : H - 56;
  g.save(); g.beginPath(); g.rect(28, 28, W - 56, ah); g.clip();
  (ART[kind] || ART.beach)(g, 28, 28, W - 56, ah);
  g.restore();
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(28, 28, W - 56, ah);
  stamp(g, W - 100, 40, kind === 'island' ? '#d9413a' : ['#d9413a', '#2f8f6b', '#e09a2a'][(opts.variant || 0) % 3]);
  if (text) hand(g, text, W / 2, 28 + ah + 34, text.length > 2 ? 26 : 30);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  cache.set(key, tex); return tex;
}

export function postcardBack(THREE, lines) {
  const key = 'back:' + lines.join('|');
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  frame(g);
  g.strokeStyle = '#cdbb98'; g.lineWidth = 2; g.beginPath(); g.moveTo(W * 0.62, 40); g.lineTo(W * 0.62, H - 40); g.stroke();
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(W * 0.66, 170 + i * 36); g.lineTo(W - 40, 170 + i * 36); g.stroke(); }
  stamp(g, W - 100, 40);
  hand(g, lines, W * 0.32, 110, 30, '#3a3226', 1.6);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  cache.set(key, tex); return tex;
}

// Thiếp 2 mặt (Group): mặt trước +Z
export function makePostcard(THREE, kind, opts = {}) {
  const w = opts.w ?? 3, h = w * H / W;
  const g = new THREE.Group(); g.name = `postcard_${kind}`;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: postcardTexture(THREE, kind, opts), roughness: 0.9 }));
  front.position.z = 0.011; front.name = 'front'; g.add(front);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: opts.back || postcardBack(THREE, ['']), roughness: 0.9 }));
  back.rotation.y = Math.PI; back.position.z = -0.011; back.name = 'back'; g.add(back);
  front.castShadow = back.castShadow = true;
  return g;
}

export const POSTCARD_ASPECT = H / W;
export function seededKinds(n, seed = 3) { const r = rng(seed); const k = Object.keys(ART); return Array.from({ length: n }, () => k[Math.floor(r() * k.length)]); }
