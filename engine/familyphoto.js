// familyphoto.js — Khung ảnh gia đình (góp ý #12): ảnh vẽ bằng canvas, các nhân vật KHỐI R15 của phim (mẹ + bé, đúng màu áo episode.js), khung gỗ.
//   const fp = createFamilyPhoto(THREE, { w: 4.6, h: 3.6 }); fp.position.set(x, y, z); room.add(fp);   // mặt ảnh nhìn +Z
// Texture vẽ 1 lần (tất định, không dùng ngẫu nhiên).
export function familyPhotoTexture(THREE, who = {}) {
  const W = 640, H = 480, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  // nền: tường/vườn phía sau + sàn cỏ
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#bfe3f7'); sky.addColorStop(0.62, '#e9f6ff'); sky.addColorStop(0.62, '#8fc26a'); sky.addColorStop(1, '#6aa24f');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = '#c0392b'; g.fillRect(40, 150, 190, 110); g.fillStyle = '#9e1c16'; g.beginPath(); g.moveTo(25, 152); g.lineTo(135, 90); g.lineTo(245, 152); g.fill();   // nhà đỏ phía sau (mái đỏ như phim)
  g.fillStyle = '#f4f1ea'; g.fillRect(122, 205, 26, 55); g.fillStyle = '#2b3b55'; g.fillRect(62, 178, 28, 28); g.fillRect(180, 178, 28, 28);
  const shade = (c, k) => { const n = parseInt(c.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  const block = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + w - 5, y, 5, h); };
  // nhân vật khối R15: đầu vuông bo, thân, 2 tay, 2 chân
  const person = (cx, base, s, o) => {
    const head = 62 * s, tw = 64 * s, th = 78 * s, lg = 74 * s, arm = 18 * s, ah = 74 * s;
    const yFoot = base, yHip = yFoot - lg, yTop = yHip - th, yHead = yTop - head - 4 * s;
    block(cx - tw / 2, yHip, tw / 2 - 1, lg - 8 * s, o.pants); block(cx + 1, yHip, tw / 2 - 1, lg - 8 * s, o.pants);
    block(cx - tw / 2 - 1, yFoot - 8 * s, tw / 2, 8 * s, o.shoes || '#1b1b1b'); block(cx + 1, yFoot - 8 * s, tw / 2, 8 * s, o.shoes || '#1b1b1b');
    if (o.skirt) { g.fillStyle = o.skirt; g.beginPath(); g.moveTo(cx - tw / 2 - 4, yHip - 6 * s); g.lineTo(cx + tw / 2 + 4, yHip - 6 * s); g.lineTo(cx + tw / 2 + 14 * s, yHip + lg * 0.78); g.lineTo(cx - tw / 2 - 14 * s, yHip + lg * 0.78); g.fill(); }
    block(cx - tw / 2, yTop, tw, th, o.shirt);
    if (o.stripe) { g.fillStyle = o.stripe; for (let x = cx - tw / 2 + 5; x < cx + tw / 2 - 8; x += 15 * s) g.fillRect(x, yTop, 6 * s, th); }
    block(cx - tw / 2 - arm, yTop + 2, arm, ah, o.shirt); block(cx + tw / 2, yTop + 2, arm, ah, o.shirt);
    g.fillStyle = o.skin; g.fillRect(cx - tw / 2 - arm, yTop + ah - 8 * s, arm, 12 * s); g.fillRect(cx + tw / 2, yTop + ah - 8 * s, arm, 12 * s);
    if (o.scarf) { g.fillStyle = o.scarf; g.fillRect(cx - tw / 2 + 2, yTop - 4 * s, tw - 4, 12 * s); g.fillRect(cx - 4 * s, yTop, 12 * s, 34 * s); }
    g.fillStyle = o.skin; const hx = cx - head / 2; g.beginPath(); g.roundRect(hx, yHead, head, head, 10 * s); g.fill();
    if (o.hair === 'braids') {
      g.fillStyle = o.hairColor; g.beginPath(); g.roundRect(hx - 3, yHead - 4, head + 6, head * 0.42, 8 * s); g.fill(); g.fillRect(hx - 6 * s, yHead + 8, 9 * s, head * 1.05); g.fillRect(hx + head - 3 * s, yHead + 8, 9 * s, head * 1.05);
    }
    if (o.hat) { g.fillStyle = o.hat; g.beginPath(); g.roundRect(hx - 2, yHead - 14 * s, head + 4, head * 0.5, 12 * s); g.fill(); g.fillStyle = shade(o.hat, 0.8); g.fillRect(hx - 2, yHead + head * 0.2, head + 4, 6 * s); }
    // mặt cười
    g.fillStyle = '#1b1b1b'; const ey = yHead + head * 0.5; g.beginPath(); g.arc(cx - head * 0.2, ey, 3.4 * s, 0, 7); g.arc(cx + head * 0.2, ey, 3.4 * s, 0, 7); g.fill();
    g.strokeStyle = '#1b1b1b'; g.lineWidth = 2.6 * s; g.lineCap = 'round'; g.beginPath(); g.arc(cx, ey + head * 0.1, head * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    if (o.lashes) { g.lineWidth = 2 * s; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * head * 0.2, ey - 3 * s); g.lineTo(cx + sx * head * 0.2 + sx * 6 * s, ey - 8 * s); g.stroke(); } }
    g.fillStyle = 'rgba(230,110,110,0.35)'; g.beginPath(); g.arc(cx - head * 0.32, ey + head * 0.14, 5 * s, 0, 7); g.arc(cx + head * 0.32, ey + head * 0.14, 5 * s, 0, 7); g.fill();
  };
  const mom = { skin: '#f0c89a', shirt: '#9fe0c0', stripe: '#d9f5e8', pants: '#8a6a4a', skirt: '#8a6a4a', scarf: '#d6322b', hair: 'braids', hairColor: '#1b1b1b', lashes: true, ...(who.mom || {}) };
  const kid = { skin: '#f2c8a0', shirt: '#f2c230', pants: '#3f6fb5', hat: '#d6322b', ...(who.hero || {}) };
  person(300, 440, 1.0, mom); person(430, 440, 0.78, kid);
  // họa tiết: vài bông hoa, vignette nhẹ, góc ảnh cũ
  for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#fff5b0' : '#ffd0e0'; g.beginPath(); g.arc(30 + i * 71, 455 + (i % 3) * 6, 5, 0, 7); g.fill(); }
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,35,10,0.35)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function createFamilyPhoto(THREE, { w = 4.6, h = 3.6, who } = {}) {
  const grp = new THREE.Group(); grp.name = 'family_photo';
  const fw = 0.34, d = 0.28;
  const wood = new THREE.MeshStandardMaterial({ color: '#7a4a28', roughness: 0.7 });
  const mat = new THREE.MeshStandardMaterial({ color: '#f6efdc', roughness: 0.95 });
  const box = (bw, bh, bd, m, x, y, z, name) => { const o = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m); o.position.set(x, y, z); o.name = name; o.castShadow = o.receiveShadow = true; grp.add(o); return o; };
  box(w, h, 0.12, mat, 0, 0, 0.0, 'photo_mat');
  const pw = w - 2 * fw - 0.5, ph = h - 2 * fw - 0.5;
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: familyPhotoTexture(THREE, who), toneMapped: false }));
  pic.position.z = 0.07; pic.name = 'family_photo_img'; grp.add(pic);
  box(w, fw, d, wood, 0, h / 2 - fw / 2, d / 2 - 0.06, 'photo_frame_top'); box(w, fw, d, wood, 0, -h / 2 + fw / 2, d / 2 - 0.06, 'photo_frame_bottom');
  box(fw, h - 2 * fw, d, wood, -w / 2 + fw / 2, 0, d / 2 - 0.06, 'photo_frame_l'); box(fw, h - 2 * fw, d, wood, w / 2 - fw / 2, 0, d / 2 - 0.06, 'photo_frame_r');
  grp.position.z = 0.06;
  return grp;
}
