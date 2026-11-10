// props.js — Đạo cụ dựng bằng code (phong cách khối). Mỗi hàm trả Group có tên rõ; mặt trước nhìn +Z; đơn vị stud.
import { postcardTexture, makePostcard, postcardBack, seededKinds, POSTCARD_ASPECT, onPostcardArt } from './postcards.js';

export function propKit(THREE) {
  const mats = new Map();
  const M = (color, o = {}) => {
    const k = color + JSON.stringify(o);
    if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o }));
    return mats.get(k);
  };
  const mesh = (geo, mat, x = 0, y = 0, z = 0, name = '', parent) => {
    const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.position.set(x, y, z); m.name = name;
    m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m;
  };
  const box = (w, h, d, mat, x, y, z, name, parent) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, name, parent);
  const cyl = (r0, r1, h, mat, x, y, z, name, parent, seg = 16) => mesh(new THREE.CylinderGeometry(r1, r0, h, seg), mat, x, y, z, name, parent);
  const sph = (r, mat, x, y, z, name, parent, seg = 16) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)), mat, x, y, z, name, parent);
  const group = (name) => { const g = new THREE.Group(); g.name = name; return g; };
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rs = (s) => { seed = s; };

  const K = {
    M, mesh, box, cyl, sph, group,

    // ---------- Bếp / nội thất ----------
    fridge({ cards = ['penguin', 'whale', 'mountain', 'island'], extra = 26, dense = false } = {}) {
      const g = group('fridge');
      const body = M('#9fe0c9', { roughness: 0.35 });
      box(5.4, 11, 4.4, body, 0, 5.5, 0, 'fridge_body', g);
      box(5.5, 0.12, 4.5, '#7cc2ac', 0, 7.6, 0.01, 'fridge_split', g);
      box(0.3, 2.6, 0.4, M('#d8dde2', { metalness: 0.6, roughness: 0.3 }), -2.2, 8.9, 2.35, 'handle_top', g);
      box(0.3, 4.2, 0.4, M('#d8dde2', { metalness: 0.6, roughness: 0.3 }), -2.2, 5.2, 2.35, 'handle_bottom', g);
      const front = group('fridge_cards'); front.position.z = 2.22; g.add(front);
      if (dense) {
        // collage dày thiếp đảo (1 texture lớn) + vài thiếp nổi
        const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 2048; const c = cv.getContext('2d');
        const src = postcardTexture(THREE, 'island').image;
        const drawCollage = () => {
          rs(5); c.fillStyle = '#9fe0c9'; c.fillRect(0, 0, 1024, 2048);
          for (let y = -60; y < 2100; y += 120) for (let x = -80; x < 1100; x += 165) {
            c.save(); c.translate(x + rnd() * 30, y + rnd() * 30); c.rotate((rnd() - 0.5) * 0.3); c.drawImage(src, 0, 0, 180, 126); c.restore();
          }
        };
        drawCollage();
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
        onPostcardArt((k) => { if (k === 'island') { drawCollage(); tex.needsUpdate = true; } });
        mesh(new THREE.PlaneGeometry(5.3, 10.8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0, 5.5, 0.01, 'card_collage', front);
        rs(9);
        for (let i = 0; i < 14; i++) {
          const c2 = makePostcard(THREE, 'island', { w: 1.5 }); c2.position.set(-2 + rnd() * 4, 1 + rnd() * 9.5, 0.05 + i * 0.004);
          c2.rotation.z = (rnd() - 0.5) * 0.5; c2.name = `card_island_${i}`; front.add(c2);
        }
      } else {
        rs(21); const kinds = seededKinds(extra, 4);
        for (let i = 0; i < extra; i++) {
          const c2 = makePostcard(THREE, kinds[i], { w: 1.3, text: false, variant: i }); c2.position.set(-2.1 + (i % 4) * 1.4 + rnd() * 0.2, 1.2 + Math.floor(i / 4) * 1.45 + rnd() * 0.2, 0.03 + i * 0.002);
          c2.rotation.z = (rnd() - 0.5) * 0.35; front.add(c2);
          const mg = sph(0.07, ['#d9413a', '#f2c14e', '#2f8fd6'][i % 3], c2.position.x, c2.position.y + 0.42, 0.1, 'magnet', front, 10); mg.scale.z = 0.35;
        }
        const spots = { penguin: [-1.2, 8.6], whale: [1.1, 8.0], mountain: [-1.0, 5.9], island: [1.2, 5.0] };
        cards.forEach((k, i) => {
          const c2 = makePostcard(THREE, k, { w: 2.0, back: k === 'island' ? postcardBack(THREE, ['Đã tìm thấy một thứ', 'tuyệt vời.', 'Sẽ sớm về nhà thôi.', 'Yêu cả hai mẹ con.']) : undefined });
          const [x, y] = spots[k] || [0, 3 + i]; c2.position.set(x, y, 0.12 + i * 0.01); c2.rotation.z = [0.06, -0.05, 0.04, -0.07][i % 4];
          c2.name = `card_${k}`; front.add(c2);
          sph(0.09, '#d9413a', x, y + POSTCARD_ASPECT * 0.92, 0.14, `magnet_${k}`, front, 12).scale.z = 0.35;
        });
      }
      return g;
    },

    table() {
      const g = group('table'); const wood = M('#8a5a36');
      box(9, 0.5, 5, wood, 0, 3.4, 0, 'table_top', g);
      for (const [x, z] of [[-4, -2], [4, -2], [-4, 2], [4, 2]]) box(0.5, 3.2, 0.5, '#6e4428', x, 1.6, z, 'table_leg', g);
      return g;
    },
    chair() {
      const g = group('chair'); const wood = M('#7a4a2c');
      box(2.4, 0.35, 2.4, wood, 0, 2.2, 0, 'seat', g); box(2.4, 3, 0.3, wood, 0, 3.8, -1.05, 'back', g);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.3, 2.2, 0.3, wood, x, 1.1, z, 'chair_leg', g);
      return g;
    },
    window({ w = 6, h = 7, curtains = '#5fae7a', view = null } = {}) {
      const g = group('window');
      if (view) mesh(new THREE.PlaneGeometry(w - 0.6, h - 0.6), new THREE.MeshBasicMaterial({ map: view, toneMapped: false }), 0, 0, -0.05, 'window_view', g);
      else mesh(new THREE.PlaneGeometry(w - 0.6, h - 0.6), new THREE.MeshBasicMaterial({ color: '#cfe9ff' }), 0, 0, -0.05, 'window_view', g);
      const tr = M('#f4f1ea');
      box(w, 0.4, 0.4, tr, 0, h / 2, 0, 'frame_top', g); box(w, 0.4, 0.4, tr, 0, -h / 2, 0, 'frame_bottom', g);
      box(0.4, h, 0.4, tr, -w / 2, 0, 0, 'frame_l', g); box(0.4, h, 0.4, tr, w / 2, 0, 0, 'frame_r', g);
      box(0.2, h, 0.3, tr, 0, 0, 0, 'mullion', g); box(w, 0.2, 0.3, tr, 0, 0, 0, 'transom', g);
      box(w + 1.2, 0.4, 1.0, tr, 0, -h / 2 - 0.2, 0.4, 'sill', g);
      if (curtains) {
        const cm = M(curtains, { roughness: 1 });
        for (const s of [-1, 1]) {
          const c = box(1.6, h + 1, 0.3, cm, s * (w / 2 + 0.3), 0, 0.5, 'curtain', g);
          for (let i = 0; i < 3; i++) box(0.12, h + 1, 0.4, M('#3f8a5b'), s * (w / 2 + 0.3) - 0.5 + i * 0.5, 0, 0.6, 'curtain_fold', g);
        }
        box(w + 4, 0.25, 0.25, '#8a5a36', 0, h / 2 + 0.7, 0.6, 'curtain_rod', g);
      }
      return g;
    },
    bed() {
      const g = group('bed');
      box(7, 1.6, 11, '#8a5a36', 0, 0.8, 0, 'bed_frame', g);
      box(6.8, 1.0, 10.6, '#f2ede4', 0, 2.1, 0, 'mattress', g);
      box(7.2, 0.6, 7.5, '#c0392b', 0, 3.9, 1.6, 'blanket', g);
      box(7.2, 1.4, 7.6, '#a93226', 0, 3.0, 1.6, 'blanket_fold', g);
      box(5, 0.9, 2.4, '#ffffff', 0, 3.0, -4, 'pillow', g);
      box(7.2, 4, 0.6, '#8a5a36', 0, 2.8, -5.6, 'headboard', g);
      return g;
    },
    books(n = 4) {
      const g = group('books'); const cols = ['#2f8fd6', '#e74c3c', '#f2c14e', '#8e44ad', '#16a085'];
      for (let i = 0; i < n; i++) { const b = box(2.4, 0.45, 1.7, cols[i % 5], (i % 2) * 0.2, 0.25 + i * 0.47, 0, 'book', g); b.rotation.y = (i * 0.37) % 0.6 - 0.3; }
      return g;
    },
    glass() {
      const g = group('water_glass');
      cyl(0.32, 0.38, 1.0, M('#cfefff', { transparent: true, opacity: 0.55, roughness: 0.1 }), 0, 0.5, 0, 'glass', g, 12);
      cyl(0.3, 0.34, 0.6, M('#7fc8ff', { transparent: true, opacity: 0.6 }), 0, 0.32, 0, 'water', g, 12);
      return g;
    },
    fruitBowl() {
      const g = group('fruit_bowl');
      cyl(0.8, 1.4, 0.6, '#f4f1ea', 0, 0.3, 0, 'bowl', g, 16);
      for (const [x, z, c] of [[-0.4, 0, '#e74c3c'], [0.4, 0.2, '#f39c12'], [0, -0.4, '#f1c40f'], [0.1, 0.4, '#e67e22']]) sph(0.42, c, x, 0.85, z, 'fruit', g, 10);
      return g;
    },

    // ---------- Ngoài trời ----------
    mailbox() {
      const g = group('mailbox');
      box(0.5, 4, 0.5, '#3b2a1e', 0, 2, 0, 'post', g);
      const m = M('#1f5a4a', { roughness: 0.5 });
      box(2, 1.6, 3, m, 0, 4.6, 0, 'box', g);
      const top = cyl(1, 1, 3, m, 0, 5.4, 0, 'box_top', g, 16); top.rotation.x = Math.PI / 2; top.scale.set(1, 1, 0.8);
      box(0.15, 1.2, 0.15, '#d9413a', 1.1, 5.4, 0.8, 'flag', g);
      return g;
    },
    lighthouse() {
      const g = group('lighthouse');
      const n = 8, h = 3.2;
      for (let i = 0; i < n; i++) {
        const r0 = 5 - i * 0.3, r1 = 5 - (i + 1) * 0.3;
        cyl(r0, r1, h, i % 2 ? '#ffffff' : '#2f8f6b', 0, i * h + h / 2, 0, `band_${i}`, g, 24);
      }
      const top = n * h;
      cyl(3.6, 3.6, 0.6, '#2b3b3a', 0, top + 0.3, 0, 'gallery', g, 24);
      for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; box(0.15, 1.4, 0.15, '#2b3b3a', Math.cos(an) * 3.4, top + 1.2, Math.sin(an) * 3.4, 'rail', g); }
      const ring = mesh(new THREE.TorusGeometry(3.4, 0.1, 6, 32), '#2b3b3a', 0, top + 1.9, 0, 'rail_ring', g); ring.rotation.x = Math.PI / 2;
      cyl(2.2, 2.2, 3, M('#fff3b0', { emissive: new THREE.Color('#ffe27a'), emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }), 0, top + 2.1, 0, 'lantern', g, 16);
      mesh(new THREE.ConeGeometry(2.8, 2.4, 16), '#2f8f6b', 0, top + 4.8, 0, 'cap', g);
      sph(0.4, '#2b3b3a', 0, top + 6.2, 0, 'cap_ball', g, 8);
      box(1.8, 3, 0.4, '#3a2a1e', 0, 1.5, 4.9, 'door', g);
      for (const y of [8, 15]) box(1, 1.6, 0.3, '#f2d98a', 0, y, 4.75 - y * 0.03, 'window', g);
      return g;
    },
    ship({ sails = true } = {}) {
      const g = group('ship');
      const hull = new THREE.Shape(); hull.moveTo(-11, 2); hull.lineTo(11, 2); hull.lineTo(14, 5); hull.lineTo(-13, 5); hull.lineTo(-11, 2);
      const hg = new THREE.ExtrudeGeometry(hull, { depth: 7, bevelEnabled: false }); hg.translate(0, 0, -3.5);
      mesh(hg, '#7a2e22', 0, -2, 0, 'hull', g);
      box(26, 0.5, 6.6, '#f0e6d2', 0.5, 3.1, 0, 'hull_stripe', g);
      box(25, 0.4, 6.4, '#9a6b42', 0.5, 3.4, 0, 'deck', g);
      box(6, 3, 4.5, '#efe3cc', -6, 5.1, 0, 'cabin', g);
      cyl(0.35, 0.3, 20, '#5b3b22', 2, 13, 0, 'mast', g, 8);
      cyl(0.3, 0.25, 15, '#5b3b22', 9, 10.5, 0, 'mast2', g, 8);
      if (sails) {
        const sm = M('#b48a5a', { side: THREE.DoubleSide, roughness: 1 });
        const s1 = mesh(new THREE.PlaneGeometry(10, 11), sm, 2, 13, 0.3, 'sail', g); s1.rotation.y = Math.PI / 2;
        const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0, 12); tri.lineTo(7, 0); tri.closePath();
        const s2 = mesh(new THREE.ShapeGeometry(tri), sm, 9.2, 4.5, 0, 'sail2', g); s2.rotation.y = -Math.PI / 2;
      }
      return g;
    },
    penguin() {
      const g = group('penguin'); const body = group('penguin_body'); g.add(body);
      box(1.6, 2.6, 1.3, '#1d2433', 0, 1.6, 0, 'p_body', body);
      box(1.2, 2.0, 0.2, '#f4f4f4', 0, 1.4, 0.62, 'p_belly', body);
      box(1.3, 1.1, 1.2, '#1d2433', 0, 3.4, 0, 'p_head', body);
      box(0.9, 0.7, 0.15, '#f4f4f4', 0, 3.35, 0.57, 'p_face', body);
      box(0.4, 0.25, 0.5, '#f2a33a', 0, 3.25, 0.8, 'p_beak', body);
      for (const s of [-1, 1]) {
        sph(0.13, '#1b1b1b', s * 0.25, 3.55, 0.66, 'p_eye', body, 8);
        const w = box(0.25, 1.8, 0.8, '#1d2433', s * 0.92, 1.9, 0, s < 0 ? 'p_wing_r' : 'p_wing_l', body); w.geometry.translate(0, -0.6, 0); w.position.y = 2.5;
        box(0.6, 0.2, 0.8, '#f2a33a', s * 0.4, 0.1, 0.3, 'p_foot', g);
      }
      return g;
    },
    // dáng lạch bạch: t giây
    waddle(p, t) {
      const b = p.getObjectByName('penguin_body'); b.rotation.z = Math.sin(t * 7) * 0.14; b.position.y = Math.abs(Math.sin(t * 7)) * 0.12;
      for (const n of ['p_wing_r', 'p_wing_l']) { const w = b.getObjectByName(n); w.rotation.z = (n.endsWith('r') ? -1 : 1) * (0.2 + Math.abs(Math.sin(t * 7)) * 0.3); }
    },
    whale() {
      const g = group('whale'); const body = group('whale_body'); g.add(body);
      const m = M('#26364d', { roughness: 0.5 });
      const b = sph(1, m, 0, 0, 0, 'w_body', body, 24); b.scale.set(3.2, 2.4, 11);
      const belly = sph(1, '#c9d6de', 0, -0.9, 0.5, 'w_belly', body, 20); belly.scale.set(2.6, 1.5, 9);
      const tail = group('w_tail'); tail.position.z = -10.5; body.add(tail);
      const tb = sph(1, m, 0, 0, -1.5, 'w_tailstock', tail, 12); tb.scale.set(1.2, 1, 3);
      for (const s of [-1, 1]) { const f = box(4, 0.3, 2.2, m, s * 2.2, 0, -4, 'w_fluke', tail); f.rotation.y = s * 0.35; }
      for (const s of [-1, 1]) { const f = box(3, 0.25, 1.6, m, s * 3.4, -1, 3, 'w_fin', body); f.rotation.z = s * -0.4; f.rotation.y = s * 0.3; }
      for (const s of [-1, 1]) sph(0.2, '#0f1520', s * 2.6, 0.2, 7.2, 'w_eye', body, 8);
      return g;
    },
    swim(w, t, phase = 0) {
      const body = w.getObjectByName('whale_body'), tail = w.getObjectByName('w_tail');
      body.rotation.x = Math.sin(t * 1.6 + phase) * 0.05; tail.rotation.x = Math.sin(t * 1.6 + phase - 0.8) * 0.35;
    },
    palm(h = 14, lean = 0.25) {
      const g = group('palm'); const trunk = M('#8a6a44');
      let x = 0, y = 0; const segs = 7;
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs; const s = cyl(0.75 - t0 * 0.3, 0.7 - t0 * 0.3, h / segs + 0.2, trunk, x, y + h / segs / 2, 0, 'trunk', g, 8);
        s.rotation.z = -lean * (0.3 + t0); x += Math.sin(lean * (0.3 + t0)) * h / segs; y += h / segs;
      }
      const leaf = M('#2f9a4a', { side: THREE.DoubleSide }), leaf2 = M('#3fb85a', { side: THREE.DoubleSide });
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2; const pv = group('frond'); pv.position.set(x, y, 0); pv.rotation.y = a; g.add(pv);
        const f = box(1.6, 0.12, 7, i % 2 ? leaf : leaf2, 0, -0.6, 3.4, 'frond_leaf', pv); f.rotation.x = 0.45;
      }
      sph(0.6, '#5b3b22', x + 0.4, y - 0.6, 0.3, 'coconut', g, 8); sph(0.6, '#5b3b22', x - 0.4, y - 0.7, -0.2, 'coconut', g, 8);
      return g;
    },
    pine(h = 12, snow = false) {
      const g = group('pine');
      cyl(0.6, 0.5, h * 0.3, '#5b3b22', 0, h * 0.15, 0, 'trunk', g, 8);
      for (let i = 0; i < 3; i++) {
        mesh(new THREE.ConeGeometry(h * (0.38 - i * 0.09), h * 0.4, 8), snow ? '#e9f3f7' : ['#2f7a3a', '#358a42', '#3c9a46'][i], 0, h * (0.35 + i * 0.2), 0, 'cone', g);
      }
      return g;
    },
    roundTree(h = 10, color = '#4caf50') {
      const g = group('tree');
      cyl(0.6, 0.5, h * 0.5, '#6b4226', 0, h * 0.25, 0, 'trunk', g, 8);
      sph(h * 0.32, color, 0, h * 0.62, 0, 'crown', g, 10);
      sph(h * 0.22, color, h * 0.2, h * 0.75, h * 0.1, 'crown2', g, 10);
      return g;
    },
    jungleTree(h = 16) {
      const g = group('jungle_tree');
      cyl(0.9, 0.6, h, '#5b3b22', 0, h / 2, 0, 'trunk', g, 8);
      for (let i = 0; i < 4; i++) { const s = sph(h * 0.22, ['#1f6b2e', '#2e8b3c', '#3c9a46'][i % 3], Math.cos(i * 1.6) * h * 0.2, h * (0.85 + (i % 2) * 0.1), Math.sin(i * 1.6) * h * 0.2, 'leaves', g, 10); s.scale.y = 0.6; }
      return g;
    },
    bush(r = 2, color = '#3c9a46') { const g = group('bush'); sph(r, color, 0, r * 0.6, 0, 'bush', g, 10); sph(r * 0.7, color, r * 0.7, r * 0.5, 0.3, 'bush2', g, 10); return g; },
    rock(r = 2, color = '#8a8a8a', s = 1) {
      const g = group('rock'); const m = mesh(new THREE.DodecahedronGeometry(r, 0), M(color, { flatShading: true, roughness: 1 }), 0, r * 0.5, 0, 'rock', g);
      rs(s * 97 + 3); m.scale.set(1 + rnd() * 0.4, 0.6 + rnd() * 0.4, 1 + rnd() * 0.3); m.rotation.set(rnd(), rnd() * 3, rnd()); return g;
    },
    cloud(s = 1) {
      const g = group('cloud'); const m = M('#ffffff', { roughness: 1 });
      for (const [x, y, z, r] of [[0, 0, 0, 3], [3, 0.6, 0.5, 3.6], [6.5, 0, 0, 2.8], [3, -0.5, -1.5, 2.6], [-2.5, -0.6, 0.6, 2.2]]) { const q = sph(r * s, m, x * s, y * s, z * s, 'puff', g, 12); q.castShadow = false; }
      return g;
    },
    moon(r = 10) {
      const g = group('moon');
      const m = sph(r, new THREE.MeshBasicMaterial({ color: '#f3f0dc', fog: false }), 0, 0, 0, 'moon', g, 24); m.castShadow = false;
      for (const [x, y, rr] of [[-3, 2, 2], [3, -1, 1.6], [0, -4, 1.2], [4, 4, 1]]) { const c = sph(rr, new THREE.MeshBasicMaterial({ color: '#d9d4bd', fog: false }), x * r / 10, y * r / 10, r * 0.92, 'crater', g, 10); c.scale.z = 0.2; c.castShadow = false; }
      return g;
    },
    iceberg(h = 20, color = '#eaf6fb') {
      const g = group('iceberg');
      const m = mesh(new THREE.ConeGeometry(h * 0.6, h, 6, 1), M(color, { flatShading: true, roughness: 0.6 }), 0, h / 2, 0, 'ice', g);
      mesh(new THREE.ConeGeometry(h * 0.35, h * 0.6, 5, 1), M('#cbe7f2', { flatShading: true }), h * 0.4, h * 0.3, h * 0.1, 'ice2', g);
      return g;
    },
    streetLamp() {
      const g = group('street_lamp');
      cyl(0.25, 0.2, 9, '#2c3e50', 0, 4.5, 0, 'pole', g, 8);
      box(1.6, 0.3, 0.6, '#2c3e50', 0.6, 9, 0, 'arm', g);
      const l = box(0.9, 0.5, 0.9, M('#fff1b5', { emissive: new THREE.Color('#ffe08a'), emissiveIntensity: 1.2 }), 1.2, 8.7, 0, 'lamp', g);
      return g;
    },
    fence(len = 10) {
      const g = group('fence'); const w = M('#f4f1ea');
      for (let i = 0; i <= len; i += 1.2) box(0.3, 2.2, 0.3, w, i - len / 2, 1.1, 0, 'picket', g);
      box(len, 0.25, 0.2, w, 0, 1.6, 0, 'rail', g);
      return g;
    },
    // xấp thiếp buộc dây đỏ
    cardStack(n = 12) {
      const g = group('card_stack'); rs(41);
      for (let i = 0; i < n; i++) {
        const c = makePostcard(THREE, i === n - 1 ? 'island' : 'island', { w: 2.4, text: i === n - 1 });
        c.rotation.x = -Math.PI / 2; c.position.y = i * 0.05; c.rotation.z = (rnd() - 0.5) * 0.1; g.add(c);
      }
      const red = M('#c0392b');
      box(2.5, n * 0.05 + 0.1, 0.18, red, 0, n * 0.025, 0, 'ribbon_x', g);
      box(0.18, n * 0.05 + 0.1, 1.8, red, 0, n * 0.025, 0, 'ribbon_z', g);
      for (const s of [-1, 1]) { const b = box(0.6, 0.1, 0.35, red, s * 0.35, n * 0.05 + 0.08, 0, 'bow', g); b.rotation.y = s * 0.6; }
      return g;
    },
  };
  return K;
}
