// r6-looks.js — THƯ VIỆN ngoại hình nhân vật thân R6 (engine/r6-rig.js). Dùng: actors: { bach: { r6: 1, look: 'bach' } }.
// Mỗi mục = tuỳ chọn createR6Rig. Toạ độ nét vẽ 0..1 trên từng mặt khối (y từ trên xuống). Tập sau thêm mục mới ở cuối, không sửa mục đã duyệt.
// Nguồn thiết kế đợt đầu: gói kịch bản ep003 của người dùng (episodes/ep003/nguon/thiet-ke-hinh.md).
const SKIN = '#f5d21a';
const R = (x, y, wd, h, color, r = 0, more = {}) => ({ op: 'rect', x, y, wd, h, color, r, ...more });
const L = (x1, y1, x2, y2, color, w = 0.03) => ({ op: 'line', x1, y1, x2, y2, color, w });
const Ci = (x, y, r, color) => ({ op: 'circle', x, y, r, color });
const P = (pts, color, more = {}) => ({ op: 'poly', pts, color, ...more });
const shade = (hex, k) => '#' + [1, 3, 5].map((i) => Math.round(clamp255(parseInt(hex.slice(i, i + 2), 16) * (1 + k))).toString(16).padStart(2, '0')).join('');
const clamp255 = (v) => Math.max(0, Math.min(255, v));

// tạp dề: yếm ngực + thân dưới + 2 quai + nút + túi; lưng: 2 quai (chéo nếu cross) + dải eo
const apronF = (c, pocket, btn, { top = false } = {}) => [
  R(0.27, 0.14, 0.46, 0.4, c, 0.03), R(0.06, 0.5, 0.88, 0.5, c), L(0.3, 0.16, 0.18, 0, c, 0.09), L(0.7, 0.16, 0.82, 0, c, 0.09),
  Ci(0.31, 0.19, 0.03, btn), Ci(0.69, 0.19, 0.03, btn),
  ...(top ? [R(0.37, 0.26, 0.26, 0.16, pocket, 0.02, { stroke: true, w: 0.012 })] : []),
  R(0.28, 0.62, 0.44, 0.24, pocket, 0.02), R(0.28, 0.62, 0.44, 0.24, shade(pocket, -0.25), 0.02, { stroke: true, w: 0.012 }),
];
const apronB = (c, cross) => [...(cross ? [L(0.2, 0, 0.8, 0.52, c, 0.08), L(0.8, 0, 0.2, 0.52, c, 0.08)] : [L(0.22, 0, 0.3, 0.52, c, 0.09), L(0.78, 0, 0.7, 0.52, c, 0.09)]), R(0, 0.5, 1, 0.1, c)];
const apronLeg = (c, len = 0.42) => ({ front: [R(0, 0, 1, len, c)] });
const legs = (pants, shoes, sole, extra = {}) => ({ bands: [[0, 0.82, pants], [0.82, 0.95, shoes], [0.95, 1, sole || shoes]], ...extra });
const arms = (sleeve, cuffY = 0.8, cuff = null, hand = SKIN, wrap) => ({ bands: [[0, cuff ? cuffY - 0.1 : cuffY, sleeve], ...(cuff ? [[cuffY - 0.1, cuffY, cuff]] : []), [cuffY, 1, hand]], wrap });
const ribs = (c, n = 9) => Array.from({ length: n }, (_, i) => L((i + 0.5) / n, 0, (i + 0.5) / n, 1, c, 0.012));
const guard = (epaulette, hatStyle) => ({
  skin: SKIN, scale: 1.12, shirt: '#1e2342', pants: '#1b1f38', face: 'o_tho',
  torso: { bands: [[0, 0.78, '#1e2342'], [0.78, 0.9, '#3b2a1e'], [0.9, 1, '#1e2342']],
    front: [L(0.5, 0.02, 0.5, 0.78, '#141831', 0.012), ...[0.12, 0.3, 0.48, 0.66].map((y) => Ci(0.5, y, 0.03, '#c8a030')),
      R(0.14, 0.2, 0.24, 0.2, '#262c52', 0.02), R(0.62, 0.2, 0.24, 0.2, '#262c52', 0.02), R(0.14, 0.2, 0.24, 0.07, '#141831'), R(0.62, 0.2, 0.24, 0.07, '#141831'), Ci(0.26, 0.27, 0.022, '#c8a030'), Ci(0.74, 0.27, 0.022, '#c8a030'),
      R(0.42, 0.775, 0.16, 0.13, '#c8a030', 0.02), R(0.455, 0.805, 0.09, 0.07, '#3b2a1e', 0.01)] },
  arm: arms('#1e2342'), leg: legs('#1b1f38', '#1a1a1c', '#0e0e10'),
  hat: { style: hatStyle, color: '#1b2140', band: '#12162c', badge: '#c8a030' }, acc: [{ kind: 'epaulettes', color: epaulette }],
});
const mayorHead = { hair: { style: 'slick', color: '#b8b3b8', cap: 0.5, back: 1.05, arc: 1.3, curls: 9, sweep: 0.0001 }, acc: [{ kind: 'moustache', color: '#c8c4c8' }] };

export const R6_LOOKS = {
  // Anh Gà — đầu vàng, chỏm 3 múi, băng đỏ, hoodie ô-liu sọc vàng, quần lửng nâu, giày đen đế kem
  ga: {
    skin: '#ffe000', shirt: '#7da33c', pants: '#6b2e1e', hero: true,
    torso: { bands: [[0, 0.92, '#7da33c'], [0.92, 1, '#6b8f32']], wrap: [{ op: 'stripes', color: '#c9d95a', n: 7, h: 0.035, y0: 0.02, y1: 0.9 }],
      front: [P([[0.24, 0.6], [0.76, 0.6], [0.86, 0.88], [0.14, 0.88]], '#77993a'), P([[0.24, 0.6], [0.76, 0.6], [0.86, 0.88], [0.14, 0.88]], '#5f7f2c', { stroke: true, w: 0.014 })] },
    arm: { bands: [[0, 0.74, '#7da33c'], [0.74, 0.8, '#6b8f32'], [0.8, 1, '#ffe000']], wrap: [{ op: 'stripes', color: '#c9d95a', n: 6, h: 0.035, y0: 0.02, y1: 0.74 }] },
    leg: { bands: [[0, 0.5, '#6b2e1e'], [0.5, 0.52, '#a8512e'], [0.52, 0.8, '#ffe000'], [0.8, 0.94, '#222426'], [0.94, 1, '#d9d2be']], front: [L(0.3, 0.84, 0.7, 0.9, '#f2f2ee', 0.03), L(0.7, 0.84, 0.3, 0.9, '#f2f2ee', 0.03)] },
    acc: [{ kind: 'headband', color: '#e01b1b' }, { kind: 'crest', color: '#ffd800' }, { kind: 'hood', color: '#74993a' }, { kind: 'strings', color: '#e8dcc0' }],
  },
  // Ông Bách — tóc muối tiêu, kính tròn, áo len kem, tạp dề cam đất
  bach: {
    skin: SKIN, scale: 1.05, shirt: '#ebd9b0', pants: '#7a5a2e',
    torso: { wrap: ribs('#d9c598'), front: apronF('#b5532b', '#a04923', '#7a3a1b'), back: apronB('#b5532b', true) },
    arm: arms('#ebd9b0', 0.8, '#dccaa0', SKIN, ribs('#d9c598', 5)), leg: legs('#7a5a2e', '#4a2e22', '#1c1412', apronLeg('#b5532b')),
    hair: { color: '#8e8a8c', cap: 0.46, back: 1.0, arc: 1.3, fringe: 'left', curls: 9 },
    acc: [{ kind: 'glasses', color: '#6b3a1e' }, { kind: 'bow', color: '#b5532b', y: 0.3 }],
  },
  // Thị trưởng ban ngày — vest navy, sơ mi kem, cà vạt vàng nhạt
  mayor: {
    skin: SKIN, scale: 1.12, wide: 1.2, shirt: '#20284d', pants: '#1f2646', face: 'buon_ngu', ...mayorHead,
    torso: { front: [P([[0.36, 0], [0.64, 0], [0.5, 0.42]], '#ead9b8'), P([[0.46, 0.02], [0.54, 0.02], [0.56, 0.3], [0.5, 0.38], [0.44, 0.3]], '#e3c94f'),
      L(0.36, 0, 0.5, 0.42, '#151b38', 0.02), L(0.64, 0, 0.5, 0.42, '#151b38', 0.02), L(0.5, 0.42, 0.5, 1, '#151b38', 0.014),
      ...[0.52, 0.66, 0.8].map((y) => Ci(0.53, y, 0.024, '#c8a030')), R(0.1, 0.68, 0.26, 0.05, '#151b38'), R(0.64, 0.68, 0.26, 0.05, '#151b38')],
      back: [L(0.5, 0, 0.5, 1, '#151b38', 0.012), L(0.5, 0.72, 0.5, 1, '#0e1228', 0.03)] },
    arm: arms('#20284d', 0.8, '#ead9b8'), leg: legs('#1f2646', '#1a1a1c', '#0c0c0e'),
  },
  // Thị trưởng đồ ngủ — pyjama tím mận viền kem
  mayor_ngu: {
    skin: SKIN, scale: 1.12, wide: 1.2, shirt: '#5b2b52', pants: '#5b2b52', face: 'buon_ngu', ...mayorHead,
    torso: { bands: [[0, 0.96, '#5b2b52'], [0.96, 1, '#d9c3a6']], front: [L(0.4, 0, 0.5, 0.2, '#d9c3a6', 0.02), L(0.6, 0, 0.5, 0.2, '#d9c3a6', 0.02), L(0.5, 0.2, 0.5, 0.96, '#d9c3a6', 0.016),
      ...[0.3, 0.46, 0.62, 0.78].map((y) => Ci(0.5, y, 0.026, '#e3cfb0')), R(0.62, 0.24, 0.2, 0.2, '#d9c3a6', 0.015, { stroke: true, w: 0.014 })] },
    arm: arms('#5b2b52', 0.8, '#d9c3a6'), leg: { bands: [[0, 0.8, '#5b2b52'], [0.8, 0.83, '#d9c3a6'], [0.83, 0.88, SKIN], [0.88, 1, '#4b2142']] },
  },
  linh_a: guard('#2f66d8', 'flatCap'),
  linh_b: guard('#d8543a', 'roundCap'),
  // Chú bán bánh — mũ bếp, áo nâu đỏ, tạp dề kem
  banh: {
    skin: SKIN, shirt: '#8a2f28', pants: '#5b3a2a',
    torso: { front: [R(0.42, 0, 0.16, 0.12, '#74241f'), ...apronF('#d9c7a3', '#cdb98f', '#8b5a3a', { top: true })], back: apronB('#d9c7a3', false) },
    arm: { bands: [[0, 0.58, '#8a2f28'], [0.58, 0.78, '#e0cfa7'], [0.78, 1, SKIN]] }, leg: legs('#5b3a2a', '#222222', '#141414', apronLeg('#d9c7a3', 0.38)),
    hair: { color: '#6b3a24', cap: 0.3, back: 0.95, arc: 1.3, curls: 10 }, hat: { style: 'chef', color: '#e7d9be' }, acc: [{ kind: 'bow', color: '#d9c7a3', y: 0.3 }],
  },
  // Cô thợ may — tóc đen búi thấp, áo tím nhạt, tạp dề lanh
  may: {
    skin: SKIN, shirt: '#b089c4', pants: '#5b2b52',
    torso: { front: [P([[0.34, 0], [0.5, 0.14], [0.66, 0], [0.6, 0], [0.5, 0.08], [0.4, 0]], '#c9a8d8'), ...apronF('#d5c3a0', '#c8b48e', '#8b6a4a', { top: true })], back: apronB('#d5c3a0', true) },
    arm: arms('#b089c4'), leg: legs('#5b2b52', '#2e2332', '#1c1620', apronLeg('#d5c3a0', 0.36)),
    hair: { color: '#2b2528', cap: 0.44, back: 0.9, arc: 1.2, fringe: 'right', locks: 0.62, bun: true, bunY: 0.4 }, acc: [{ kind: 'bow', color: '#d5c3a0', y: 0.3 }],
  },
  // Bé áo vàng mù tạt — tóc nâu, ba lô than
  be_vang: {
    skin: SKIN, scale: 0.84, shirt: '#d8a021', pants: '#2d3a63', face: 'binh_thuong',
    torso: { front: [L(0.2, 0, 0.24, 0.7, '#3b3636', 0.08), L(0.8, 0, 0.76, 0.7, '#3b3636', 0.08)] },
    arm: { bands: [[0, 0.44, '#d8a021'], [0.44, 0.49, '#f0e4c8'], [0.49, 0.55, '#d8a021'], [0.55, 0.6, '#f0e4c8'], [0.6, 0.8, '#d8a021'], [0.8, 1, SKIN]] },
    leg: legs('#2d3a63', '#2a2424', '#e6ddc8'), hair: { color: '#8b4a2a', cap: 0.5, back: 0.9, arc: 1.3, fringe: 'left', curls: 12 },
    acc: [{ kind: 'backpack', color: '#3b3636', pocket: '#2e2a2a' }],
  },
  // Bé áo xanh ngọc — mũ lưỡi trai đội ngược
  be_ngoc: {
    skin: SKIN, scale: 0.84, shirt: '#2e7f78', pants: '#4a4440',
    torso: { front: [L(0.2, 0, 0.24, 0.7, '#2a5c58', 0.08), L(0.8, 0, 0.76, 0.7, '#2a5c58', 0.08)] },
    arm: { bands: [[0, 0.3, '#2e7f78'], [0.3, 0.35, '#f2f2ee'], [0.35, 0.41, '#2e7f78'], [0.41, 0.46, '#f2f2ee'], [0.46, 0.52, '#2e7f78'], [0.52, 1, SKIN]] },
    leg: legs('#4a4440', '#2e2c2c', '#e6ddc8'), hair: { color: '#1e1a1c', cap: 0.3, back: 0.85, arc: 1.25, fringe: 'left' },
    hat: { style: 'capBack', color: '#3a8a86', band: '#2f746f' }, acc: [{ kind: 'backpack', color: '#2a5c58', pocket: '#214a47' }],
  },
  // Dân phố A (hoodie lam), B (áo nỉ đỏ đất), C (áo khoác tím)
  dan_a: {
    skin: SKIN, shirt: '#5b8db8', pants: '#3b302b',
    torso: { bands: [[0, 0.92, '#5b8db8'], [0.92, 1, '#4a7aa0']], front: [P([[0.26, 0.6], [0.74, 0.6], [0.84, 0.88], [0.16, 0.88]], '#5485ae'), P([[0.26, 0.6], [0.74, 0.6], [0.84, 0.88], [0.16, 0.88]], '#44709a', { stroke: true, w: 0.014 })] },
    arm: arms('#5b8db8', 0.8, '#4a7aa0'), leg: legs('#3b302b', '#8a8478', '#d9d0bc'),
    hair: { color: '#5b3a22', cap: 0.48, back: 0.92, arc: 1.25, fringe: 'right', curls: 5 }, acc: [{ kind: 'hood', color: '#5485ae' }, { kind: 'strings', color: '#e8dcc0' }],
  },
  dan_b: {
    skin: SKIN, shirt: '#a8402a', pants: '#3b302b',
    torso: { bands: [[0, 0.06, '#8f3522'], [0.06, 0.92, '#a8402a'], [0.92, 1, '#8f3522']] }, arm: arms('#a8402a', 0.8, '#8f3522'), leg: legs('#3b302b', '#5a4033', '#d9d0bc'),
    hair: { color: '#5b3a22', cap: 0.5, back: 0.95, arc: 1.35, curls: 26 },
  },
  dan_c: {
    skin: SKIN, shirt: '#9a74b5', pants: '#3b302b',
    torso: { front: [L(0.5, 0, 0.5, 0.45, '#c9ccd2', 0.022), R(0.47, 0.42, 0.06, 0.08, '#a9adb5', 0.01), P([[0.36, 0], [0.5, 0.1], [0.64, 0], [0.58, 0], [0.5, 0.05], [0.42, 0]], '#86629f')] },
    arm: arms('#9a74b5', 0.8, '#86629f'), leg: legs('#3b302b', '#3a2c28', '#d9d0bc'),
    hair: { color: '#6a4030', cap: 0.48, back: 0.95, arc: 1.3, fringe: 'right', bob: 1.5 },
  },
};
