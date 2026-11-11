// castaway.js — Chỗ ở của người cha mắc kẹt trên đảo (ba năm): tấm ván gỗ trôi khắc vạch đếm ngày + đống bưu thiếp đã viết.
// Dựng bằng code, tất định theo seed. Texture vẽ bằng canvas một lần lúc dựng (không đổi theo t).
import { hash } from './cliff.js';

function canvasTex(THREE, w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// Vạch đếm ngày: nhóm 5 (4 sọc + 1 gạch chéo), nét khắc trên gỗ — rất nhiều nhóm = rất nhiều ngày.
function tallyTex(THREE, seed) {
  return canvasTex(THREE, 1024, 768, (g, W, H) => {
    // gỗ trôi bạc màu: vân dọc
    g.fillStyle = '#b89a76'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${90 + hash(i, seed) * 40},${66 + hash(i, seed + 1) * 30},40,${0.18 + hash(i, seed + 2) * 0.2})`; g.lineWidth = 1 + hash(i, seed + 3) * 3;
      const y = hash(i, seed + 4) * H; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + (hash(i, 5) - 0.5) * 30, W * 0.7, y + (hash(i, 6) - 0.5) * 30, W, y + (hash(i, 7) - 0.5) * 20); g.stroke(); }
    for (const y of [256, 512]) { g.fillStyle = 'rgba(60,40,24,0.55)'; g.fillRect(0, y - 4, W, 8); }   // khe giữa các ván
    // vạch đếm
    const cols = 11, rows = 8, cw = (W - 60) / cols, rh = (H - 50) / rows;
    g.lineCap = 'round';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const n = r * cols + c; if (r === rows - 1 && c > 6) break;   // hàng cuối dở dang → vẫn đang đếm
      const x0 = 34 + c * cw + (hash(n, seed + 8) - 0.5) * 8, y0 = 30 + r * rh + (hash(n, seed + 9) - 0.5) * 6, hh = rh * 0.72;
      const stroke = (x1, y1, x2, y2) => {
        g.strokeStyle = 'rgba(55,34,18,0.95)'; g.lineWidth = 7; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        g.strokeStyle = 'rgba(230,214,186,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x1 + 2, y1 + 1); g.lineTo(x2 + 2, y2 + 1); g.stroke();
      };
      const k = (r === rows - 1 && c === 6) ? 3 : 4;
      for (let s = 0; s < k; s++) { const x = x0 + s * cw * 0.18; stroke(x + (hash(n * 5 + s, seed) - 0.5) * 3, y0, x + (hash(n * 5 + s, seed + 1) - 0.5) * 5, y0 + hh); }
      if (k === 4) stroke(x0 - cw * 0.06, y0 + hh * 0.8, x0 + cw * 0.66, y0 + hh * 0.18);
    }
  });
}

// Mặt sau bưu thiếp đã viết: chữ viết tay (nét nguệch ngoạc xanh), tem, dòng địa chỉ — đọc được là "đã viết".
function writtenTex(THREE, seed) {
  return canvasTex(THREE, 512, 340, (g, W, H) => {
    g.fillStyle = '#f6efdc'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#c9b48e'; g.lineWidth = 3; g.strokeRect(6, 6, W - 12, H - 12);
    g.strokeStyle = '#b9a27a'; g.lineWidth = 2; g.beginPath(); g.moveTo(W * 0.56, 30); g.lineTo(W * 0.56, H - 30); g.stroke();
    g.fillStyle = '#d6322b'; g.fillRect(W - 96, 22, 70, 84); g.fillStyle = '#f6efdc'; g.fillRect(W - 88, 30, 54, 68); g.fillStyle = '#2f8f6b'; g.fillRect(W - 82, 52, 42, 40);
    for (let l = 0; l < 3; l++) { g.strokeStyle = '#9a8a6c'; g.lineWidth = 2; g.beginPath(); g.moveTo(W * 0.6, 150 + l * 50); g.lineTo(W - 30, 150 + l * 50); g.stroke(); }
    g.strokeStyle = '#2d4f9a'; g.lineWidth = 3.2; g.lineJoin = 'round';
    for (let l = 0; l < 7; l++) {   // nét chữ viết tay
      let x = 26; const y = 46 + l * 38, end = W * 0.52 - (l === 6 ? 90 : hash(l, seed) * 30);
      g.beginPath(); g.moveTo(x, y);
      while (x < end) { const s = 6 + hash(Math.floor(x) + l * 97, seed) * 8; g.quadraticCurveTo(x + s * 0.5, y - 8 - hash(Math.floor(x), seed + l) * 8, x + s, y + (hash(Math.floor(x) + 3, seed) - 0.5) * 6); x += s; if (hash(Math.floor(x), seed + 9) < 0.12) { x += 9; g.moveTo(x, y); } }
      g.stroke();
    }
    for (let l = 0; l < 3; l++) { let x = W * 0.62; const y = 140 + l * 50; g.beginPath(); g.moveTo(x, y); while (x < W - 50 - l * 20) { const s = 7 + hash(Math.floor(x), seed + 30 + l) * 7; g.quadraticCurveTo(x + s / 2, y - 9, x + s, y); x += s; } g.stroke(); }
  });
}

export function createCamp(THREE, { seed = 3, faceDir = -0.9, board = [42, 0, -35.5], pile = [46.6, 0, -25], cards = 46 } = {}) {
  const g = new THREE.Group(); g.name = 'castaway_camp';
  // --- tấm ván đếm ngày (3 ván ghép, dựng nghiêng tựa vào đá) ---
  const bw = 7, bh = 5.2;
  const boardG = new THREE.Group(); boardG.name = 'tally_board'; boardG.position.set(...board); boardG.rotation.y = faceDir; g.add(boardG);
  const tilt = new THREE.Group(); tilt.rotation.x = -0.16; boardG.add(tilt);
  const wood = new THREE.MeshStandardMaterial({ color: '#8a6d4c', roughness: 0.95 });
  const face = new THREE.MeshStandardMaterial({ map: tallyTex(THREE, seed), roughness: 0.9 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.35), [wood, wood, wood, wood, face, wood]); slab.position.y = bh / 2 + 0.1; slab.castShadow = slab.receiveShadow = true; slab.name = 'tally_slab'; tilt.add(slab);
  for (const x of [-bw / 2 + 0.6, bw / 2 - 0.6]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, bh + 1.2, 0.45), wood); post.position.set(x, (bh + 1.2) / 2 - 0.3, -0.35); post.castShadow = true; post.name = 'tally_post'; tilt.add(post); }
  const prop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.2), wood); prop.position.set(0, 1.4, -1.6); prop.rotation.x = 0.75; prop.name = 'tally_prop'; boardG.add(prop);
  // --- đống bưu thiếp đã viết (vun thành ụ + vài xấp buộc dây + thiếp rơi lẻ) ---
  const pileG = new THREE.Group(); pileG.name = 'card_pile'; pileG.position.set(...pile); g.add(pileG);
  const mats = [0, 1, 2].map((k) => new THREE.MeshStandardMaterial({ map: writtenTex(THREE, seed * 11 + k), roughness: 0.85 }));
  const edge = new THREE.MeshStandardMaterial({ color: '#efe5cc', roughness: 0.9 });
  const cg = new THREE.BoxGeometry(2.0, 0.04, 1.36);
  for (let i = 0; i < cards; i++) {
    const r = Math.sqrt(hash(i, seed + 1)) * 2.4, a = hash(i, seed + 2) * Math.PI * 2;
    const hgt = Math.max(0, 1.5 - r * 0.62) * (0.6 + hash(i, seed + 3) * 0.5);   // ụ: giữa cao, rìa thấp
    const m = new THREE.Mesh(cg, [edge, edge, mats[i % 3], edge, edge, edge]);
    m.position.set(Math.cos(a) * r, 0.03 + hgt, Math.sin(a) * r);
    m.rotation.set((hash(i, seed + 4) - 0.5) * 0.5, hash(i, seed + 5) * 6.28, (hash(i, seed + 6) - 0.5) * 0.5);
    m.castShadow = m.receiveShadow = true; m.name = 'pile_card'; pileG.add(m);
  }
  const red = new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.7 });
  for (let b = 0; b < 4; b++) {   // xấp thiếp buộc dây
    const bundle = new THREE.Group(); bundle.name = 'card_bundle';
    const a = 0.6 + b * 1.4, r = 2.9 + hash(b, seed + 7) * 0.8; bundle.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); bundle.rotation.y = hash(b, seed + 8) * 6.28;
    const n = 10 + Math.floor(hash(b, seed + 9) * 8);
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(cg, [edge, edge, mats[(i + b) % 3], edge, edge, edge]); m.position.y = 0.03 + i * 0.045; m.rotation.y = (hash(i + b * 20, seed) - 0.5) * 0.12; m.castShadow = true; bundle.add(m); }
    const hh = n * 0.045 + 0.08;
    const rx = new THREE.Mesh(new THREE.BoxGeometry(2.08, hh, 0.12), red); rx.position.y = hh / 2; bundle.add(rx);
    const rz = new THREE.Mesh(new THREE.BoxGeometry(0.12, hh, 1.44), red); rz.position.y = hh / 2; bundle.add(rz);
    pileG.add(bundle);
  }
  return g;
}
