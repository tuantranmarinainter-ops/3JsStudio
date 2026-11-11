// labels.js — Chữ trong cảnh: biển tên cửa hàng, con số trên đầu nhân vật, % pin, đồng hồ đếm ngược…
// Mọi chữ vẽ (Canvas2D) vào MỘT texture atlas 2048px, xếp theo kệ, có viền đệm chống loang mipmap
// (ý tưởng từ Saltline). Hỗ trợ tiếng Việt có dấu (đo chiều cao thật của chữ).
//
// Dùng:
//   import { createLabelAtlas, createLabel } from './labels.js';
//   const atlas = createLabelAtlas(THREE);
//   const sign = createLabel(THREE, atlas, 'TIỆM BÁNH MÌ', { height: 1.2, style: 'sign' });
//   sign.object.position.set(0, 6, 3.6); scene.add(sign.object);
//   const pin = createLabel(THREE, atlas, 'PIN 100%', { height: 0.9, style: 'tag', billboard: true });
//   hero.head.add(pin.object); pin.object.position.y = 2.2;
//   atlas.prepare(['PIN 3%', 'PIN 2%', 'PIN 1%']);    // vẽ trước mọi giá trị sẽ dùng (trước khi seek)
//   // render(t): pin.setText(`PIN ${n}%`);          // chỉ đổi vùng UV, không vẽ lại nếu đã có
// Kiểu dựng sẵn: sign (biển gỗ), tag (nhãn tròn trên đầu), big (chữ nổi to viền đen), plain (chữ trắng không nền).

export const LABEL_STYLES = {
  sign:  { font: '800 72px system-ui, "Segoe UI", Roboto, Arial, sans-serif', color: '#fff7e6', bg: '#7a4b2a', border: '#4a2c17', borderW: 10, radius: 14, padX: 40, padY: 24 },
  tag:   { font: '800 50px system-ui, "Segoe UI", Roboto, Arial, sans-serif', color: '#ffffff', bg: '#e74c3c', border: '#ffffff', borderW: 6, radius: 999, padX: 24, padY: 12 },
  big:   { font: '900 110px system-ui, "Segoe UI", Roboto, Arial, sans-serif', color: '#ffe14d', stroke: '#1b1530', strokeW: 18, padX: 24, padY: 18 },
  plain: { font: '700 64px system-ui, "Segoe UI", Roboto, Arial, sans-serif', color: '#ffffff', stroke: '#000000', strokeW: 8, padX: 16, padY: 12 },
};

export function createLabelAtlas(THREE, { size = 2048, pad = 8 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const entries = new Map();
  const users = new Set();     // các texture con (offset/repeat riêng) cần báo cập nhật
  let shelfY = pad, shelfH = 0, cursorX = pad;

  const keyOf = (text, styleName) => `${styleName}\u0000${text}`;

  function draw(text, styleName) {
    const st = typeof styleName === 'string' ? LABEL_STYLES[styleName] : styleName;
    ctx.font = st.font;
    const m = ctx.measureText(text);
    const asc = Math.ceil(m.actualBoundingBoxAscent || parseInt(st.font.match(/(\d+)px/)[1], 10) * 0.8);
    const desc = Math.ceil(m.actualBoundingBoxDescent || 0);
    const sw = st.strokeW || 0;
    const w = Math.ceil(m.width + st.padX * 2 + sw), h = Math.ceil(asc + desc + st.padY * 2 + sw);
    if (cursorX + w + pad > size) { shelfY += shelfH + pad * 2; shelfH = 0; cursorX = pad; }
    if (shelfY + h + pad > size) throw new Error('labels.js: atlas đầy — tăng size hoặc bớt chữ');
    const x = cursorX, y = shelfY;
    cursorX += w + pad * 2;
    shelfH = Math.max(shelfH, h);

    ctx.save();
    ctx.translate(x, y);
    // nền mờ rất nhẹ quanh chữ không nền → mipmap không ra viền đen (mẹo của Saltline)
    if (!st.bg) { ctx.fillStyle = (st.stroke || st.color) + '03'; ctx.fillRect(0, 0, w, h); }
    if (st.bg) {
      const r = Math.min(st.radius || 0, h / 2), bw = st.borderW || 0;
      ctx.beginPath();
      ctx.roundRect(bw / 2, bw / 2, w - bw, h - bw, r);
      ctx.fillStyle = st.bg; ctx.fill();
      if (bw) { ctx.lineWidth = bw; ctx.strokeStyle = st.border; ctx.stroke(); }
    }
    ctx.font = st.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const bx = w / 2, by = st.padY + sw / 2 + asc;
    if (st.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = st.strokeW; ctx.strokeStyle = st.stroke; ctx.strokeText(text, bx, by); }
    ctx.fillStyle = st.color;
    ctx.fillText(text, bx, by);
    ctx.restore();
    return { x, y, w, h, aspect: w / h };
  }

  const atlas = {
    canvas, texture, size,
    get(text, styleName = 'plain') {
      const k = keyOf(text, typeof styleName === 'string' ? styleName : JSON.stringify(styleName));
      if (!entries.has(k)) {
        entries.set(k, draw(text, styleName));
        texture.needsUpdate = true;
        for (const u of users) u.needsUpdate = true;
      }
      return entries.get(k);
    },
    prepare(texts, styleName = 'plain') { for (const t of texts) atlas.get(t, styleName); },
    // texture con dùng chung ảnh atlas, chỉ khác offset/repeat
    view(entry) {
      const t = texture.clone();
      users.add(t);
      atlas.fit(t, entry);
      return t;
    },
    fit(t, e) {
      t.offset.set(e.x / size, 1 - (e.y + e.h) / size);
      t.repeat.set(e.w / size, e.h / size);
    },
  };
  return atlas;
}

export function createLabel(THREE, atlas, text, opts = {}) {
  const o = { height: 1, style: 'plain', billboard: false, anchor: 'center', overlay: false, ...opts };
  let entry = atlas.get(text, o.style);
  const map = atlas.view(entry);
  let object;
  if (o.billboard) {
    const mat = new THREE.SpriteMaterial({ map, toneMapped: false, depthTest: !o.overlay, fog: false });
    object = new THREE.Sprite(mat);
    if (o.anchor === 'bottom') object.center.set(0.5, 0);
  } else {
    const geo = new THREE.PlaneGeometry(1, 1);
    if (o.anchor === 'bottom') geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.02, toneMapped: false, side: THREE.DoubleSide, fog: false });
    object = new THREE.Mesh(geo, mat);
  }
  object.name = `label_${text}`;
  object.renderOrder = o.overlay ? 10 : 1;
  object.userData.noStyle = true;
  object.userData.noMerge = true;
  object.userData.aoHide = true;
  const resize = () => object.scale.set(o.height * entry.aspect, o.height, 1);
  resize();
  return {
    object,
    get text() { return text; },
    setText(next) {
      if (next === text) return;
      text = next;
      entry = atlas.get(text, o.style);
      atlas.fit(map, entry);
      resize();
    },
  };
}
