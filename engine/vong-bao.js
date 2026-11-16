// vong-bao.js — VÒNG BAO CHÂN TRỜI (cây/đồi/núi khép kín 360°) + NỀN ĐẤT/CỎ cho bối cảnh ngoài trời. Builder DÙNG CHUNG.
//
//   env / episode / shot khai báo:  e.vongBao = 'rung-thong' | { preset, r, h, y, seed, color, center:[x,z] } | null
//                                   e.nen     = 'co' | { preset, color, tile, r, y } | null
//   Ưu tiên: ghi đè studio/URL > shot > env > episode (tập mới có sẵn trong episode.js, tập cũ không khai → TẮT, khung y nguyên).
//   Ô FX 'vongBao' / 'nen' (engine/post.js) bật/tắt từng món. URL thử nhanh: ?vongBao=rung-thong&nen=co&troi=sky-7  (tat = tắt)
//
// Quy tắc: hàm thuần (không Math.random, không giờ thực); dựng LƯỜI lúc cần (không khai → 0 object, 0 shader). Cây dùng InstancedMesh
//   (1 draw call/preset). Vòng và nền KHÔNG đổ bóng, không dính hệ vật liệu/vân bẩn (matKind/grungeKind = 'none').
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const VONG_BAO = {
  'rung-thong': 'Rừng thông',
  'cay-tron': 'Cây tròn hoạt hình (low-poly)',
  'doi-xa': 'Đồi xa',
  'nui-xa': 'Núi xa (đỉnh tuyết)',
  'dai-anh': 'Dải ảnh 360° (vân cây vẽ canvas)',
};
export const NEN = { co: 'Cỏ', dat: 'Đất', cat: 'Cát', da: 'Đá lát' };

// trạng thái dùng chung giữa envs.js (đọc) và chế độ 3D (ghi): undefined = theo tập, null = tắt, chuỗi/đối tượng = ép dùng
export function vienState() {
  const G = globalThis;
  if (!G.__vien) {
    G.__vien = { override: {}, cur: {} };
    try {   // URL: ?vongBao=… &nen=… &troi=…  (tat | off | 0 = tắt)
      const q = new URLSearchParams(G.location?.search || '');
      for (const [k, p] of [['vongBao', 'vongBao'], ['nen', 'nen'], ['troi', 'troi']]) {
        const v = q.get(p); if (v == null) continue;
        G.__vien.override[k] = /^(tat|off|0|null)$/i.test(v) ? null : v;
      }
    } catch (e) {}
  }
  return G.__vien;
}

const mul = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const norm = (s, def) => (typeof s === 'string' ? { preset: s } : { ...s });
const tag = (o, name) => { o.name = name; o.userData.matKind = 'none'; o.userData.grungeKind = 'none'; o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; return o; };

export function createVien(THREE) {
  const root = new THREE.Group(); root.name = 'vien';
  const cache = new Map();   // khoá → { obj, update?(night) }
  const C = (c) => new THREE.Color(c);

  const paint = (geo, hex) => {   // gán màu đỉnh, bỏ chỉ mục để gộp được
    const g = geo.index ? geo.toNonIndexed() : geo, c = C(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  };
  const at = (geo, x, y, z) => { geo.translate(x, y, z); return geo; };

  // ---- cây (chiều cao đơn vị 1) ----
  const pine = () => mergeGeometries([
    paint(at(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 5), 0, 0.1, 0), '#5a3b22'),
    paint(at(new THREE.ConeGeometry(0.40, 0.48, 7), 0, 0.30, 0), '#245c34'),
    paint(at(new THREE.ConeGeometry(0.32, 0.44, 7), 0, 0.55, 0), '#2d6e3d'),
    paint(at(new THREE.ConeGeometry(0.22, 0.40, 7), 0, 0.80, 0), '#38834a'),
  ]);
  const round = () => mergeGeometries([
    paint(at(new THREE.CylinderGeometry(0.06, 0.09, 0.4, 5), 0, 0.2, 0), '#6b4528'),
    paint(at(new THREE.IcosahedronGeometry(0.36, 1), 0, 0.66, 0), '#4f9b3e'),
    paint(at(new THREE.IcosahedronGeometry(0.22, 1), 0.2, 0.46, 0.06), '#5fae4a'),
    paint(at(new THREE.IcosahedronGeometry(0.2, 1), -0.2, 0.5, -0.08), '#418a35'),
  ]);

  function trees(kind, cfg) {
    const r = cfg.r ?? 420, h = cfg.h ?? (kind === 'pine' ? 46 : 34), y0 = cfg.y ?? -0.2, rows = 3, per = 250, R = mul(cfg.seed ?? 11);
    const [cx, cz] = cfg.center || [0, 0], N = rows * per;
    const geo = kind === 'pine' ? pine() : round();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, color: cfg.color ? C(cfg.color) : C('#ffffff') });
    const im = new THREE.InstancedMesh(geo, mat, N), M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const row = i % rows, a = ((i / rows) / per) * Math.PI * 2 + (R() - 0.5) * 0.02, rad = r + row * 16 + R() * 12, k = h * (0.7 + R() * 0.6);
      p.set(cx + Math.cos(a) * rad, y0, cz + Math.sin(a) * rad); q.setFromAxisAngle(up, R() * 6.283); s.set(k * (0.9 + R() * 0.3), k, k * (0.9 + R() * 0.3));
      M.compose(p, q, s); im.setMatrixAt(i, M);
      const v = 0.78 + R() * 0.34; im.setColorAt(i, col.setRGB(v, v * (0.95 + R() * 0.1), v));
    }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    // dải lá thấp lấp khe hở dưới gốc cây
    const wall = new THREE.Mesh(paint(new THREE.CylinderGeometry(r + 26, r + 26, h * 0.34, 96, 1, true), kind === 'pine' ? '#1f4f2e' : '#3d7d33'), mat.clone());
    wall.material.side = THREE.DoubleSide; wall.position.set(cx, y0 + h * 0.17, cz);
    const g = new THREE.Group(); g.add(tag(im, 'vien_cay'), tag(wall, 'vien_ria'));
    return { obj: g };
  }

  // ---- đồi / núi: dải vòng khép kín, độ cao là tổng sin tần số NGUYÊN theo góc (liền mạch 360°) ----
  function ridge(kind, cfg) {
    const mount = kind === 'nui', r = cfg.r ?? 520, h = cfg.h ?? (mount ? 150 : 55), y0 = cfg.y ?? -4, R = mul(cfg.seed ?? 5), [cx, cz] = cfg.center || [0, 0];
    const layers = mount ? [{ k: 1.0, dr: 0, c: ['#5b6678', '#7b879a', '#dfe6f0', '#ffffff'], ph: R() * 6 }, { k: 0.62, dr: -70, c: ['#3f5a47', '#587761', '#8aa393', '#a9bdb0'], ph: R() * 6 }]
      : [{ k: 1.0, dr: 0, c: ['#4f8a4a', '#69a85a', '#86c26c', '#86c26c'], ph: R() * 6 }, { k: 0.6, dr: -60, c: ['#3f7a42', '#58985a', '#74b068', '#74b068'], ph: R() * 6 }];
    const fr = [0, 0.5, 0.78, 1], SEG = 192, geos = [];
    for (const L of layers) {
      const rad = r + L.dr, pos = [], colr = [], idx = [], A = [1, 2, 3, 5, 8, 13].map((f, i) => [f, R() * 6.28, 0.5 / (1 + i * 0.9)]);
      const hh = (a) => { let v = 0.5; for (const [f, ph, w] of A) v += w * Math.sin(f * a + ph + L.ph) * 0.6; if (mount) v = Math.abs(v - 0.2) * 1.5 + 0.25 * Math.abs(Math.sin(21 * a + L.ph)); return Math.max(0.12, v) * h * L.k; };
      for (let i = 0; i <= SEG; i++) {
        const a = (i % SEG) / SEG * Math.PI * 2, top = hh(a);
        for (let j = 0; j < fr.length; j++) {
          pos.push(cx + Math.cos(a) * rad, y0 + (j === 0 ? -10 : top * fr[j]), cz + Math.sin(a) * rad);
          const c = C(L.c[j]); colr.push(c.r, c.g, c.b);
        }
      }
      const W = fr.length;
      for (let i = 0; i < SEG; i++) for (let j = 0; j < W - 1; j++) { const a = i * W + j, b = (i + 1) * W + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
      g.setIndex(idx); g.computeVertexNormals(); geos.push(g);
    }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, flatShading: true, color: cfg.color ? C(cfg.color) : C('#ffffff') });
    const grp = new THREE.Group(); geos.forEach((g, i) => grp.add(tag(new THREE.Mesh(g, mat), 'vien_' + kind + i)));
    return { obj: grp };
  }

  // ---- dải ảnh 360°: trụ mở dán vân bóng cây vẽ bằng canvas (tuần hoàn → không thấy mối nối) ----
  function dai(cfg) {
    const r = cfg.r ?? 430, h = cfg.h ?? 80, y0 = cfg.y ?? -2, [cx, cz] = cfg.center || [0, 0], W = 2048, H = 256, R = mul(cfg.seed ?? 3);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const tree = (x, base, hh, kind, color) => { for (const dx of [-W, 0, W]) {
      g.fillStyle = color; g.beginPath();
      if (kind) { g.moveTo(x + dx - hh * 0.22, base); g.lineTo(x + dx, base - hh); g.lineTo(x + dx + hh * 0.22, base); }
      else { g.arc(x + dx, base - hh * 0.55, hh * 0.38, 0, 6.283); g.rect(x + dx - hh * 0.04, base - hh * 0.3, hh * 0.08, hh * 0.3); }
      g.closePath(); g.fill(); } };
    g.fillStyle = '#2c5a35'; g.fillRect(0, H * 0.86, W, H * 0.14);
    for (const [col, hs, n, base] of [['#4d8656', 0.55, 90, 0.9], ['#3a7046', 0.75, 70, 0.92], ['#2c5a35', 0.95, 60, 0.96]])
      for (let i = 0; i < n; i++) tree(((i + R() * 0.8) / n) * W, H * base, H * hs * (0.7 + R() * 0.3), R() < 0.55, col);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = THREE.RepeatWrapping; tx.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tx, transparent: true, alphaTest: 0.4, side: THREE.BackSide, depthWrite: true, color: cfg.color ? C(cfg.color) : C('#ffffff') });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 128, 1, true), mat); m.position.set(cx, y0 + h / 2, cz);
    return { obj: tag(m, 'vien_dai'), update: (night) => { mat.color.set(cfg.color || '#ffffff').multiplyScalar(night ? 0.38 : 1); } };
  }

  // ---- nền: mặt phẳng lớn vân lặp ----
  const FLOOR = {
    co: { base: '#5fa83c', draw: (g, R, S, dr) => { for (let i = 0; i < 2600; i++) { const x = R() * S, y = R() * S, l = 4 + R() * 7, a = -1.57 + (R() - 0.5) * 0.9; const t = R(); dr(x, y, (G) => { G.strokeStyle = t < 0.4 ? '#7cc255' : t < 0.75 ? '#4d9230' : '#3f7d2a'; G.lineWidth = 1.4; G.beginPath(); G.moveTo(x, y); G.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); G.stroke(); }); } } },
    dat: { base: '#8a6a45', draw: (g, R, S, dr) => { for (let i = 0; i < 1400; i++) { const x = R() * S, y = R() * S, r = 0.8 + R() * 2.6, t = R(); dr(x, y, (G) => { G.fillStyle = t < 0.5 ? '#6d5232' : t < 0.8 ? '#a4835a' : '#58422a'; G.beginPath(); G.ellipse(x, y, r, r * 0.7, 0, 0, 6.283); G.fill(); }); } } },
    cat: { base: '#e0c88a', draw: (g, R, S, dr) => { for (let i = 0; i < 3200; i++) { const x = R() * S, y = R() * S, t = R(); dr(x, y, (G) => { G.fillStyle = t < 0.5 ? '#c9b074' : t < 0.8 ? '#efdba0' : '#b99b5e'; G.fillRect(x, y, 1.6, 1.6); }); } for (let i = 0; i < 7; i++) { const y = (i + 0.5) * S / 7 + (R() - 0.5) * 8; g.strokeStyle = 'rgba(180,150,90,.28)'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= S; x += 8) g.lineTo(x, y + Math.sin((x / S) * 6.283 * 2 + i) * 4); g.stroke(); } } },
    da: { base: '#8d8f93', draw: (g, R, S) => { const n = 4, c = S / n; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = 118 + Math.floor(R() * 56); g.fillStyle = `rgb(${v},${v + 2},${v + 6})`; g.fillRect(i * c + 2, j * c + 2, c - 4, c - 4); }
      g.strokeStyle = '#4b4d52'; g.lineWidth = 4; for (let k = 0; k <= n; k++) { g.beginPath(); g.moveTo(k * c, 0); g.lineTo(k * c, S); g.moveTo(0, k * c); g.lineTo(S, k * c); g.stroke(); } } },
  };
  function nen(kind, cfg) {
    const def = FLOOR[kind], S = 256, R = mul(cfg.seed ?? 2), r = cfg.r ?? 2600, tile = cfg.tile ?? (kind === 'da' ? 40 : 26);
    const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); g.fillStyle = def.base; g.fillRect(0, 0, S, S);
    const dr = (x, y, f) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { if (dx && (x + dx < -8 || x + dx > S + 8)) continue; if (dy && (y + dy < -8 || y + dy > S + 8)) continue; g.save(); g.translate(dx, dy); f(g); g.restore(); } };
    def.draw(g, R, S, dr);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(r * 2 / tile, r * 2 / tile); tx.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tx, roughness: 1, metalness: 0, color: cfg.color ? C(cfg.color) : C('#ffffff'), polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 });
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), mat); m.rotation.x = -Math.PI / 2; m.position.set(cfg.center?.[0] ?? 0, cfg.y ?? -0.08, cfg.center?.[1] ?? 0);
    return { obj: tag(m, 'vien_nen_' + kind) };
  }

  function build(kind, spec) {
    const c = norm(spec);
    if (kind === 'vb') {
      if (c.preset === 'rung-thong') return trees('pine', c);
      if (c.preset === 'cay-tron') return trees('round', c);
      if (c.preset === 'doi-xa') return ridge('doi', c);
      if (c.preset === 'nui-xa') return ridge('nui', c);
      if (c.preset === 'dai-anh') return dai(c);
    } else if (FLOOR[c.preset]) return nen(c.preset, c);
    console.warn(`[vien] ${kind === 'vb' ? 'vongBao' : 'nen'} "${c.preset}" không có. Có: ${Object.keys(kind === 'vb' ? VONG_BAO : NEN).join(', ')}`);
    return null;
  }

  return {
    group: root,
    // spec = { vongBao, nen } (chuỗi | đối tượng | null); night: ánh sáng đêm (dải ảnh tự tối lại)
    update(scene, spec, night = false) {
      const want = new Set();
      for (const [kind, v] of [['vb', spec.vongBao], ['nen', spec.nen]]) {
        if (!v) continue;
        const key = kind + ':' + JSON.stringify(v);
        if (!cache.has(key)) { const b = build(kind, v); cache.set(key, b); if (b) root.add(b.obj); }
        const b = cache.get(key); if (b) { want.add(key); b.update?.(night); }
      }
      if (want.size && !root.parent) scene.add(root);
      for (const [k, b] of cache) if (b) b.obj.visible = want.has(k);
      root.visible = want.size > 0;
    },
  };
}
