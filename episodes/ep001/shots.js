// ep001 — danh sách 145 shot (cut list refs/ngoinha/cuts.json, khung F0–F5131 @30fps).
// Mỗi shot = dữ liệu (xem engine/shots.js). Toạ độ: nhà gia đình ở gốc, mặt trước +Z; phố theo trục X ở z=36.
// Bếp: tủ lạnh (-8,0,-17.6), bàn (6,0,2), cửa sổ (10,11,-19.8). Đảo: mỏm hải đăng (52,0,-40), chỗ cha ngồi (46,3.2,-26).
const PI = Math.PI;
const FAM = (o = {}) => ({ style: 'family', ...o });
const ILL = (o = {}) => ({ style: 'illus', ...o });
const orb = (at, yaw, dist, h, o = {}) => ({ at, yaw, dist, h, ...o });
const P = (x = 0, z = 13, o = {}) => ({ parent: 'house', at: [x, 0, z], ...o });   // trên hiên
const R = (x, y, z, o = {}) => ({ parent: 'room', at: [x, y, z], ...o });          // trong phòng
const walkX = (x0, x1, o = {}) => ({ at: [x0, 36], to: [x1, 36], ry: PI / 2, ...o }); // nhà đi dọc phố
// vị trí thiếp trên tủ (toạ độ phòng bếp)
const CARD = { penguin: [-9.2, 8.6, -15.2], whale: [-6.9, 8.0, -15.2], mountain: [-9.0, 5.9, -15.2], island: [-6.8, 5.0, -15.2] };
const card = (k, dist = 3.6, o = {}) => ({ at: [CARD[k][0], CARD[k][1] + 0.2, CARD[k][2]], yaw: 0, dist, h: 0, fov: 34, ...o });
// đảo: nhà quay về phía cha
const ISL = { at: [-10, 0], ry: 2.0 };
const porchW = (lx, lz) => [ISL.at[0] + Math.sin(ISL.ry) * lz + Math.cos(ISL.ry) * lx, 0, ISL.at[1] + Math.cos(ISL.ry) * lz - Math.sin(ISL.ry) * lx];
const DADSEAT = [44, 2.4, -28];

export const SHOTS = [
  // ===== 01 · Quy luật kỳ lạ =====
  { id: 's001', f: [0, 50], env: 'town', line: 1, house: ILL({ legsOut: 1, lift: 0.45 }), cam: orb('house', 0.12, 78, -2, { look: [0, 2, 0], dist2: 70, fov: 52 }),
    fn: ({ env }) => {} },
  { id: 's002', f: [51, 93], env: 'town', line: 1, dirt: 'hole', cam: { p: [-24, 62, 46], l: [2, 0, 4], p2: [-20, 58, 42], fov: 42 } },
  { id: 's003', f: [94, 116], env: 'hawaii', line: 1, house: ILL({ at: [0, 0], ry: 0.3, legsOut: 1, lift: 0.55 }), cam: orb('house', 0.55, 82, 2, { look: [0, -4, 0], yaw2: 0.45, fov: 52 }) },
  { id: 's004', f: [117, 144], env: 'hawaii', line: 1, house: ILL({ at: [0, 0], ry: 0.3, legsOut: 1, lift: 0.55 }), cam: orb('house', 0.15, 120, 90, { look: [0, -10, 20], fov: 52, h2: 80 }) },

  // ===== 02 · Chân gỗ thức giấc =====
  { id: 's005', f: [145, 189], env: 'town', line: 2, house: ILL({ legsOut: 0, lift: 0 }), cam: orb('house', 0, 74, 2, { look: [0, 4, 0], dist2: 66, fov: 52 }),
    fn: ({ env }) => { const m = env.group.getObjectByName('moon_town'); } },
  { id: 's006', f: [190, 257], env: 'town', line: 2, house: ILL({ legsOut: [0, 1], lift: 0, win: [0.2, 0.62] }), fx: { dust: [{ at: [24, 0, 14], t0: 1.4 }, { at: [-24, 0, 14], t0: 1.45 }, { at: [24, 0, -14], t0: 1.5 }] },
    cam: { p: [40, 3, 4], l: [18, 7, 10], p2: [39, 3.2, 4.5], fov: 52 } },
  { id: 's007', f: [258, 285], env: 'town', line: 3, house: ILL({ legsOut: 1, lift: [0, 1] }), cam: orb('house', 0.4, 90, 6, { look: [0, -2, 0], fov: 52 }) },
  { id: 's008', f: [286, 313], env: 'town', line: 3, house: ILL({ legsOut: 1, lift: 1, shake: [1, 0] }), fx: { dust: [{ at: [0, 4, 0], t0: 0.0 }] }, cam: orb('house', 0.15, 92, 4, { look: [0, -4, 0], fov: 52 }) },
  { id: 's009', f: [314, 329], env: 'town', line: 3, house: ILL({ at: [0, 0], to: [0, 14], legsOut: 1, lift: 1 }), cam: orb([0, 18, 10], 0.05, 110, 2, { fov: 52 }) },
  { id: 's010', f: [330, 385], env: 'bedroom', line: 3, light: 'bedNight',
    cast: { dad: R(-12.2, 3.6, -6.6, { lie: true, anim: 'lie' }), mom: R(-10, 3.6, -6.6, { lie: true, anim: 'lie' }), hero: R(-7.9, 3.6, -6.6, { lie: true, anim: 'lie', s: 0.9 }) },
    cam: { p: [-10, 17, -1], l: [-10, 3, -9], p2: [-10, 16, -1.6], fov: 50 } },

  // ===== 03 · Các điểm đến và lời hứa trở về =====
  { id: 's011', f: [386, 441], env: 'hawaii', line: 4, house: ILL({ ry: 0.6, legsOut: 1, lift: 0.75 }), cam: orb('house', 0.95, 88, 4, { look: [0, -6, 0], yaw2: 0.8, fov: 52 }) },
  { id: 's012', f: [442, 469], env: 'hawaii', line: 4, house: ILL({ ry: 0, lift: 0.4 }), cam: orb('house', 0.05, 66, -4, { look: [0, -2, 6], fov: 52 }) },
  { id: 's013', f: [470, 501], env: 'brazil', line: 4, house: ILL({ lift: 0.3 }), cam: orb('house', -0.15, 72, -2, { look: [0, -2, 0], dist2: 64, fov: 52 }) },
  { id: 's014', f: [502, 551], env: 'sahara', line: 4, house: ILL({ ry: -0.4, lift: 0.35 }), cam: orb('house', -0.6, 80, 42, { look: [0, -8, 0], yaw2: -0.45, fov: 52 }) },
  { id: 's015', f: [552, 582], env: 'hawaii', line: 5, house: ILL({ lift: 0 }), cast: { hero: P(-1.5, 13.5, { anim: 'cheer', ry: 0 }), mom: P(3, 12, { anim: 'idle', face: 'happy', ry: -0.3 }) },
    cam: orb('hero', 0.15, 19, 0, { look: [1.5, -1, 0], fov: 42, dist2: 17 }) },
  { id: 's016', f: [583, 617], env: 'town', line: 5, house: ILL(walkX(160, 150, { ry: -PI / 2, walk0: 0 })), cam: orb([150, 20, 36], -0.25, 96, 6, { fov: 52, yaw2: -0.3 }) },
  { id: 's017', f: [618, 673], env: 'town', line: 5, house: ILL({ at: [40, 36], to: [16, 36], ry: -PI / 2 }), cam: orb([20, 20, 36], -0.55, 92, -2, { fov: 52, yaw2: -0.7 }) },
  { id: 's018', f: [674, 703], env: 'town', light: 'day', line: 6, house: FAM({ legsOut: 0, lift: 0 }), cam: { p: [-80, 90, 120], l: [10, 0, 20], p2: [-70, 86, 112], fov: 40 } },
  { id: 's019', f: [704, 754], env: 'town', light: 'day', line: 6, house: FAM({ legsOut: 0, lift: 0 }), cam: { p: [60, 70, 95], l: [-20, 0, 10], p2: [52, 66, 90], fov: 42 } },

  // ===== 04 · Gia đình và người cha mất tích =====
  { id: 's020', f: [755, 789], env: 'town', light: 'day', line: 6, house: FAM({ legsOut: 0, lift: 0 }), cam: orb('house', 0, 70, -1, { look: [0, 4, 0], dist2: 64, fov: 52 }) },
  { id: 's021', f: [790, 841], env: 'kitchen', line: 7, cast: { hero: R(3.5, 0, -1.5, { anim: 'idle', ry: 0.1, s: 0.92 }), mom: R(8.5, 0, -1.8, { anim: 'idle', ry: -0.2, face: 'smile' }) },
    props: {}, cam: { p: [5.5, 8, 15], l: [5.5, 5, 0], p2: [5.5, 7.8, 13.5], fov: 42 } },
  { id: 's022', f: [842, 886], env: 'antarctica', line: 8, cast: { dad: { at: [0, 0, 30], ry: 0.3, anim: 'idle', face: 'happy', pose: { rightArm: { x: -2.6, z: -0.3 } } } },
    cam: orb('dad', 0.35, 13, 0.5, { look: [0, -1.4, 0], fov: 40, dist2: 12 }) },
  { id: 's023', f: [887, 905], env: 'shipStorm', light: 'ocean', line: 9, cast: { dad: { at: [8, 3.6, 0.5], ry: PI / 2, anim: 'wave' } }, cam: orb('dad', PI / 2 + 0.5, 12, 0, { look: [0, 1, 0], fov: 44 }) },
  { id: 's024', f: [906, 941], env: 'antarctica', line: 9, cast: { dad: { at: [-6, 0, 30], to: [-2, 0, 33], anim: 'walk' } }, cam: orb('dad', 0.7, 14, 1, { look: [0, -1.4, 0], fov: 40, rel: false }) },
  { id: 's025', f: [942, 980], env: 'antarctica', line: 10, cast: { dad: { at: [8.4, 0, 33], ry: 0.6, anim: 'hold', face: 'happy', holdR: { name: 'cardPenguin', at: [1.4, -2.0, 1.0], rot: [0.95, 0, 0], s: 0.8 } } },
    cam: orb('dad', 0.25, 11, 0, { look: [0.8, -1.2, 0], fov: 40, dist2: 10 }) },
  { id: 's026', f: [981, 995], env: 'kitchen', line: 10, cast: { mom: R(-11, 0, -11.5, { anim: 'point', ry: 0.6 }), hero: R(-4.5, 0, -11, { anim: 'idle', ry: -0.5, s: 0.92 }) },
    cam: { p: [2, 9, 4], l: [-8, 6, -15], fov: 40 } },
  { id: 's027', f: [996, 1033], env: 'kitchen', line: 11, cam: { p: [-8, 6.2, -4], l: [-8, 6, -15.4], p2: [-8, 6.6, -6], fov: 44 } },
  { id: 's028', f: [1034, 1048], env: 'town', light: 'day', line: 11, house: FAM({ legsOut: 0, lift: 0 }), props: { mailboxTown: { parent: 'house', at: [10, 0, 14.5], ry: 0 } },
    cam: { p: [5, 10, 23], l: [10, 7.6, 14.5], p2: [5, 10, 22], fov: 42, shadow: false } },
  { id: 's029', f: [1049, 1072], env: 'kitchen', line: 11, cam: { p: [-9.5, 7, -10], l: [-8, 7, -15.3], p2: [-7, 6, -10], fov: 40 } },
  { id: 's030', f: [1073, 1095], env: 'town', light: 'day', line: 11, house: FAM({ legsOut: 0, lift: 0 }), props: { mailboxTown: { parent: 'house', at: [10, 0, 14.5] } },
    cast: { hero: P(4, 13, { anim: 'sit', face: 'sad', ry: 0.4, s: 0.92 }) }, cam: { p: [18, 9, 32], l: [5, 5, 13], fov: 44 } },
  { id: 's031', f: [1096, 1110], env: 'shipStorm', line: 12, cam: { p: [-30, 8, 40], l: [0, 6, 0], p2: [-28, 9, 38], fov: 44 } },
  { id: 's032', f: [1111, 1128], env: 'shipStorm', line: 12, cam: { p: [36, 3, 28], l: [0, 7, 0], fov: 42, shake: 1.2 } },
  { id: 's033', f: [1129, 1142], env: 'storm', line: 12, cam: { p: [0, 4, 20], l: [0, 2, -10], p2: [0, 3, 14], fov: 50, shake: 1 } },
  { id: 's034', f: [1143, 1199], env: 'kitchen', line: 12, cast: { mom: R(-2, 0, -9, { to: [-14, 0, -9], anim: 'walk', face: 'sad', speed: 1.2 }) },
    cam: { p: [-4, 7, 8], l: [-8, 5, -12], p2: [-6, 7, 7], fov: 44 } },

  // ===== 05 · Nhà mình bắt đầu đi =====
  { id: 's035', f: [1200, 1219], env: 'town', line: 13, house: FAM({ legsOut: 0, lift: 0 }), cam: orb('house', 0, 72, -1, { look: [0, 3, 0], fov: 52 }) },
  { id: 's036', f: [1220, 1270], env: 'town', line: 13, house: FAM({ legsOut: [0, 1], lift: 0, win: [0.2, 0.9] }), fx: { dust: [{ at: [24, 0, 14], t0: 1.3 }, { at: [-24, 0, 14], t0: 1.35 }] },
    cam: orb('house', 0.55, 76, 2, { look: [0, 0, 0], yaw2: 0.62, fov: 52 }) },
  { id: 's037', f: [1271, 1309], env: 'bedroom', line: 14, room: { roll: [0, 0.18], tilt: [0, 0.05] }, cast: { hero: R(-10, 3.6, -6.6, { lie: true, anim: 'lie', face: 'surprised', rz: 0 }) },
    props: {}, cam: { p: [4, 11, 0], l: [-10, 4, -10], fov: 46, roll: [0, -0.12], shake: 0.3 } },
  { id: 's038', f: [1310, 1341], env: 'bedroom', line: 15, room: { roll: 0.12 }, cast: { hero: R(16.5, 2.6, -6, { anim: 'idle', ry: PI / 2, face: 'surprised', s: 0.92 }) },
    props: {}, cam: { p: [8, 9.5, -1], l: [17, 8, -6], fov: 46 } },
  { id: 's039', f: [1342, 1362], env: 'town', line: 15, house: FAM({ legsOut: 1, lift: 1 }), cam: { p: [-48, 28, 32], l: [-14, 24, 4], fov: 44 } },
  { id: 's040', f: [1363, 1436], env: 'town', line: 15, house: FAM({ at: [0, 30], to: [24, 36], ry: PI / 2 }), cam: orb([10, 18, 34], -0.9, 100, -2, { fov: 52, yaw2: -0.7 }) },
  { id: 's041', f: [1437, 1480], env: 'town', line: 16, house: FAM(walkX(30, 50)), cam: { p: [72, 4, 84], l: [40, 17, 36], fov: 50, shake: 0.6 } },
  { id: 's042', f: [1481, 1508], env: 'town', line: 17, house: FAM(walkX(130, 160)), cam: orb([150, 18, 36], -0.9, 130, 40, { fov: 52, look: [0, -6, 0] }) },
  { id: 's043', f: [1509, 1529], env: 'forest', line: 17, house: FAM({ at: [-20, 0], to: [-8, 0], ry: PI / 2 }), cam: orb([-14, 18, 0], 0.6, 100, 6, { fov: 52 }) },
  { id: 's044', f: [1530, 1574], env: 'forest', line: 17, house: FAM({ at: [0, 0], to: [20, 0], ry: PI / 2 }), lightOverride: { exposure: 0.8 }, cam: orb([10, 18, 0], -0.4, 105, 4, { fov: 52 }) },

  // ===== 06 · Nam Cực =====
  { id: 's045', f: [1575, 1609], env: 'antarctica', line: 18, house: FAM({ lift: 0.25, door: [0, 0.15], win: [0.6, 1] }), cam: { p: [0, 9.6, 25], l: [0, 9.6, 10], fov: 46, shadow: false } },
  { id: 's046', f: [1610, 1670], env: 'antarctica', line: 18, house: FAM({ lift: 0.25, door: 1 }), cast: { hero: P(0, 10.8, { anim: 'shiver', s: 0.92 }) },
    cam: orb('face:hero', 0, 3.4, 0.2, { fov: 40, look: [0, -0.3, 0], rel: true, dist2: 3.0 }) },
  { id: 's047', f: [1671, 1703], env: 'antarctica', line: 19, house: FAM({ lift: 0.25 }), cam: orb('house', 0.35, 92, 6, { look: [0, -6, 10], fov: 52 }) },
  { id: 's048', f: [1704, 1744], env: 'antarctica', line: 19, house: FAM({ lift: 0.25 }), cam: { p: [20, 1.6, 52], l: [8, 4, 34], fov: 46 } },
  { id: 's049', f: [1745, 1761], env: 'antarctica', line: 20, house: FAM({ lift: 0.25, door: 1 }), cast: { hero: P(-1.8, 13.5, { anim: 'shiver', ry: 0.4, s: 0.92 }), mom: P(1.8, 13, { anim: 'idle', face: 'surprised', ry: 0.3 }) },
    cam: orb('hero', 0.9, 11, 0.5, { look: [1.6, -0.8, 0], fov: 40 }) },

  // ===== 07 · Biển rồi núi trên mây =====
  { id: 's050', f: [1762, 1804], env: 'snowNight', line: 21, house: FAM({ at: [0, -10], to: [0, 6] }), cam: orb([0, 18, 0], 0.5, 100, 8, { fov: 52 }) },
  { id: 's051', f: [1805, 1848], env: 'snowNight', line: 21, house: FAM({ at: [0, 0], to: [18, 4], ry: 1.35 }), cam: orb([10, 16, 2], -0.4, 92, 0, { fov: 52, yaw2: -0.3 }) },
  { id: 's052', f: [1849, 1863], env: 'ocean', line: 22, house: FAM({ door: 1 }), cast: { hero: P(0, 11, { anim: 'idle', face: 'surprised', s: 0.92 }) }, cam: orb('hero', 0.25, 11, 0.8, { look: [0, -0.6, 0], fov: 42 }) },
  { id: 's053', f: [1864, 1882], env: 'ocean', line: 22, house: FAM({ door: 1 }), cast: { hero: P(0, 13.5, { anim: 'idle', face: 'surprised', s: 0.92 }) }, cam: { p: [0, 15, 44], l: [0, 20, 16], fov: 44 } },
  { id: 's054', f: [1883, 1928], env: 'ocean', line: 23, house: FAM({ ry: 0.3 }), cam: orb('house', 0.6, 95, 4, { look: [0, -8, 0], yaw2: 0.5, fov: 52 }) },
  { id: 's055', f: [1929, 1970], env: 'ocean', line: 23, house: FAM({ ry: 0.3 }), cam: { p: [10, 85, 70], l: [0, 6, 4], p2: [8, 82, 66], fov: 44 } },
  { id: 's056', f: [1971, 2007], env: 'ocean', line: 23, house: FAM({ ry: 0.3 }), cam: { p: [44, 12, 40], l: [18, 15, 12], fov: 48 } },
  { id: 's057', f: [2008, 2036], env: 'mountain', line: 24, house: FAM({ lift: 0.2, door: 1 }), cast: { hero: P(0, 10.8, { anim: 'idle', face: 'happy', s: 0.92 }) }, cam: orb('hero', 0, 13, 1, { look: [0, -1, 0], fov: 42, dist2: 11 }) },
  { id: 's058', f: [2037, 2073], env: 'mountain', line: 24, house: FAM({ lift: 0.2 }), cam: orb('house', 0.75, 120, 30, { look: [0, -16, 0], fov: 52, yaw2: 0.6 }) },
  { id: 's059', f: [2074, 2123], env: 'mountain', line: 24, house: FAM({ lift: 0.2 }), cast: { hero: P(-6, 14.5, { anim: 'idle', face: 'happy', ry: 0, s: 0.92 }) }, cam: { p: [-6, 17, 48], l: [-6, 7, 20], p2: [-6, 15, 44], fov: 42 } },
  { id: 's060', f: [2124, 2159], env: 'kitchen', line: 25, room: { view: 'mountain' }, cast: { mom: R(10, 0, -14, { anim: 'panic', ry: 0.2 }) }, cam: orb('mom', 0.15, 9.5, -0.3, { look: [0, -1.2, 0], fov: 40 }) },
  { id: 's061', f: [2160, 2206], env: 'kitchen', line: 26, room: { view: 'mountain' }, cast: { mom: R(10, 0, -14, { anim: 'panic', ry: -0.15, face: 'scared' }) }, cam: orb('mom', -0.25, 8, 0, { look: [0, -0.8, 0], fov: 40, dist2: 7 }) },

  // ===== 08 · Bưu thiếp là bản đồ =====
  { id: 's062', f: [2207, 2240], env: 'kitchen', line: 27, room: { view: 'mountain' }, cast: { mom: R(10, 0, -14, { anim: 'idle', face: 'worried', ry: 0 }) }, cam: orb('mom', 0, 7, 0, { look: [0, -0.5, 0], fov: 40 }) },
  { id: 's063', f: [2241, 2259], env: 'kitchen', line: 28, cast: { hero: R(-2, 0, -10, { anim: 'hold', ry: 0.2, s: 0.92, holdR: { name: 'glass', at: [0.55, -2.0, 0.9] } }) }, cam: orb('hero', 0.2, 8, 0, { look: [0, -1.5, 0], fov: 40 }) },
  { id: 's064', f: [2260, 2274], env: 'kitchen', line: 28, cast: { hero: R(-6, 0, -9, { anim: 'idle', face: 'surprised', ry: PI, s: 0.92 }) }, cam: orb('face:hero', 0, 3.9, 0, { rel: true, fov: 40, look: [0, -0.3, 0] }) },
  { id: 's065', f: [2275, 2324], env: 'kitchen', line: 28, cast: { hero: R(-6, 0, -9, { anim: 'idle', ry: PI, s: 0.92 }) }, cam: { p: [-3, 6, -2], l: [-8, 6, -15.4], p2: [-5, 6.5, -5], fov: 46 } },
  { id: 's066', f: [2325, 2411], env: 'kitchen', line: 29, cam: card('penguin', 3.8, { dist2: 3.2 }) },
  { id: 's067', f: [2412, 2443], env: 'kitchen', line: 30, cam: card('whale', 4.4) },
  { id: 's068', f: [2444, 2532], env: 'kitchen', line: 30, cam: card('whale', 3.4, { dist2: 3.0 }) },
  { id: 's069', f: [2533, 2584], env: 'kitchen', line: 32, cam: card('mountain', 4.2) },
  { id: 's070', f: [2585, 2668], env: 'kitchen', line: 33, cam: card('mountain', 3.3, { dist2: 3.0, look: [0, -0.3, 0] }) },
  { id: 's071', f: [2669, 2700], env: 'kitchen', line: 34, cast: { hero: R(-6, 0, -9, { anim: 'idle', face: 'surprised', ry: 0.1, s: 0.92 }) }, cam: orb('face:hero', 0, 4.2, -0.2, { rel: true, fov: 40, dist2: 3.8, look: [0, -0.3, 0] }) },
  { id: 's072', f: [2701, 2716], env: 'kitchen', line: 35, cast: { hero: R(-6, 0, -9, { anim: 'idle', face: 'scared', ry: 0.9, s: 0.92 }) }, cam: orb('face:hero', 0, 4.0, 0, { rel: true, fov: 40, look: [0, -0.3, 0] }) },
  { id: 's073', f: [2717, 2731], env: 'kitchen', line: 36, cast: { mom: R(-16, 0, 21, { to: [-14, 0, 18], anim: 'walk', face: 'worried' }) }, cam: orb('mom', PI + 0.2, 11, 0, { look: [0, -1, 0], fov: 42 }) },
  { id: 's074', f: [2732, 2766], env: 'kitchen', line: 37, cast: { hero: R(-2, 0, -8, { anim: 'point', ry: -1.9, s: 0.92 }), mom: R(-12, 0, 12, { anim: 'idle', face: 'worried', ry: 2.5 }) },
    cam: { p: [10, 9, 18], l: [-6, 5, -8], fov: 46 } },
  { id: 's075', f: [2767, 2782], env: 'kitchen', line: 37, cast: { hero: R(-2, 0, -8, { anim: 'point', ry: 0.9, s: 0.92 }) }, cam: { p: [-8, 7, 6], l: [0, 5, -10], fov: 44 } },
  { id: 's076', f: [2783, 2807], env: 'kitchen', line: 38, room: { view: 'mountain' }, cam: { p: [10, 11, -10], l: [10, 11, -19.8], fov: 46 } },
  { id: 's077', f: [2808, 2840], env: 'kitchen', line: 38, cam: card('whale', 4.6, { look: [-0.8, -0.5, 0], yaw: 0.1 }) },
  { id: 's078', f: [2841, 2885], env: 'kitchen', line: 39, cast: { mom: R(-3, 0, -12, { anim: 'idle', face: 'surprised', ry: 0.5 }) }, cam: { p: [1, 7, -3], l: [-5, 5.5, -13], fov: 44 } },
  { id: 's079', f: [2886, 2917], env: 'kitchen', line: 39, cam: { p: [-8, 6.8, -9], l: [-8, 6.6, -15.4], p2: [-7.5, 7.2, -9.5], fov: 44 } },
  { id: 's080', f: [2918, 2961], env: 'snowNight', light: 'snow', line: 40, house: FAM({ lift: 0.5 }), cam: orb('house', 0.3, 84, 0, { look: [0, -6, 0], fov: 52 }) },
  { id: 's081', f: [2962, 3001], env: 'antarctica', line: 41, house: FAM({ at: [0, 0], to: [-6, -14], ry: PI + 0.4 }), cam: orb([-3, 14, -6], 0.1, 72, 8, { fov: 52, look: [0, -4, 0] }) },

  // ===== 09 · Tấm thiếp cuối =====
  { id: 's082', f: [3002, 3034], env: 'antarctica', line: 42, house: FAM({ ry: 0.2 }), cam: orb('house', 0.1, 92, -4, { look: [0, -8, 0], dist2: 86, fov: 52 }) },
  { id: 's083', f: [3035, 3081], env: 'kitchen', line: 43, cast: { mom: R(-3, 0, -11, { anim: 'idle', face: 'worried', ry: 0.3 }) }, cam: { p: [0, 7.5, -2], l: [-6, 6, -13], fov: 46 } },
  { id: 's084', f: [3082, 3124], env: 'kitchen', line: 43, props: { cardIsland: { parent: 'room', at: [-6.8, 5.0, -15.05], to: [-6.6, 4.6, -12.5], win: [0.45, 1] } },
    cast: { mom: R(-4.2, 0, -13.4, { anim: 'point', ry: -2.17, pose: { rightArm: { x: [-1.4, -1.0] } } }) }, cam: { p: [-7.8, 5.6, -10.6], l: [-6.8, 5, -15.2], fov: 46 } },
  { id: 's085', f: [3125, 3172], env: 'kitchen', line: 44, cast: { mom: R(-4, 0, -10, { anim: 'hold', face: 'worried', ry: 0, pose: { rightArm: { x: -0.75 }, leftArm: { x: -0.75 } }, holdR: { name: 'cardIsland', at: [2.9, -2.1, 0.9], rot: [0.95, 0, 0], s: 0.72 } }) },
    cam: orb('mom', 0, 7.5, 0.4, { look: [0, -1.4, 0], fov: 42 }) },
  { id: 's086', f: [3173, 3211], env: 'shipStorm', line: 45, cast: { dad: { at: [4, 3.6, 1], ry: 0.4, anim: 'scared' } }, cam: orb('dad', 0.6, 8, -1.5, { look: [0, 0, 0], fov: 46, shake: 0.6 }) },
  { id: 's087', f: [3212, 3233], env: 'kitchen', line: 46, props: { cardIsland: { parent: 'room', at: [6, 4.6, 4.2], rx: -0.5 } }, cam: { p: [6, 7.2, 7.4], l: [6, 4.6, 4.2], fov: 40 } },
  { id: 's088', f: [3234, 3266], env: 'island', line: 46, cam: { p: [86, 12, 26], l: [60, 18, -50], p2: [82, 12, 20], fov: 40 } },
  { id: 's089', f: [3267, 3270], env: 'kitchen', line: 46, props: { cardIsland: { parent: 'room', at: [6, 4.6, 4.2], rx: -0.5 } }, cam: { p: [6, 7.0, 7.2], l: [6, 4.6, 4.2], fov: 40 } },
  { id: 's090', f: [3271, 3347], env: 'kitchen', line: 47, props: { cardIsland: { parent: 'room', at: [6, 4.6, 4.2], rx: -0.5, ry: [0, PI], win: [0, 0.18] } }, cam: { p: [6, 7.8, 7.6], l: [6, 4.6, 4.2], p2: [6, 7.6, 7.2], fov: 40 } },
  { id: 's091', f: [3348, 3380], env: 'kitchen', line: 49, cast: { mom: R(-4, 0, -10, { anim: 'hold', face: 'moved', ry: 0, pose: { rightArm: { x: -0.75 }, leftArm: { x: -0.75 } }, holdR: { name: 'cardIsland', at: [2.9, -2.1, 0.9], rot: [0.95, PI, 0], s: 0.72 } }) },
    cam: orb('mom', 0, 6.5, 0.3, { look: [0, -1.2, 0], fov: 42 }) },
  { id: 's092', f: [3381, 3435], env: 'snowNight', line: 50, house: FAM({ legsOut: 1, lift: [0.3, 1], win: [0.1, 0.8] }), cam: orb('house', 0.45, 96, 0, { look: [0, -4, 0], fov: 52 }) },

  // ===== 10 · Hành trình đến đảo =====
  { id: 's093', f: [3436, 3474], env: 'snowNight', line: 51, house: FAM({ at: [0, 0], to: [12, 0], ry: PI / 2 }), cam: orb([6, 16, 0], 0.15, 92, 0, { fov: 52 }) },
  { id: 's094', f: [3475, 3512], env: 'iceSea', line: 51, house: FAM({ at: [-8, 0], to: [8, 0], ry: PI / 2 }), cam: orb([0, 16, 0], 0.05, 96, 2, { fov: 52 }) },
  { id: 's095', f: [3513, 3524], env: 'storm', line: 51, house: FAM({ at: [-4, 0], to: [0, 0], ry: PI / 2 + 0.3, y: -2 }), cam: orb([0, 18, 0], 0.3, 90, 2, { fov: 52 }) },
  { id: 's096', f: [3525, 3535], env: 'storm', line: 51, house: FAM({ at: [0, 0], to: [4, 0], ry: PI / 2 + 0.3, y: -2 }), cam: orb([0, 18, 0], 0.5, 80, 4, { fov: 52 }) },
  { id: 's097', f: [3536, 3539], env: 'storm', line: 51, house: FAM({ at: [4, 0], to: [5, 0], ry: PI / 2 + 0.3, y: -2 }), cam: orb([4, 18, 0], 0.7, 70, 6, { fov: 52 }) },
  { id: 's098', f: [3540, 3582], env: 'island', light: 'night', line: 51, house: FAM({ ...ISL, lift: [1, 0.85] }), cam: orb([-10, 16, 0], 1.4, 96, -2, { fov: 52 }) },
  { id: 's099', f: [3583, 3597], env: 'island', line: 52, house: FAM({ ...ISL, lift: 0.85 }), cam: orb([-10, 14, 0], 2.0, 62, -6, { fov: 52, look: [0, 4, 0] }) },
  { id: 's100', f: [3598, 3619], env: 'island', line: 52, house: FAM({ ...ISL, lift: 0.85, door: 1 }), cast: { hero: P(0, 10.6, { anim: 'idle', face: 'surprised', s: 0.92 }) }, cam: orb('hero', 0, 12, 1, { rel: true, look: [0, -1, 0], fov: 42 }) },
  { id: 's101', f: [3620, 3634], env: 'island', line: 52, house: FAM({ ...ISL, lift: 0.85 }), cam: { p: [porchW(18, 22)[0], 3, porchW(18, 22)[2]], l: [porchW(17, 15)[0], 4, porchW(17, 15)[2]], fov: 50 } },
  { id: 's102', f: [3635, 3667], env: 'island', line: 52, cam: { p: [-40, 4, 40], l: [-30, 18, -10], p2: [-38, 4, 36], fov: 50 } },
  { id: 's103', f: [3668, 3683], env: 'island', line: 52, cam: { p: [0, 3, 95], l: [0, 0, 70], fov: 50 } },
  { id: 's104', f: [3684, 3719], env: 'island', line: 52, cam: { p: [36, 22, -8], l: [60, 26, -50], p2: [34, 20, -10], fov: 40 } },
  { id: 's105', f: [3720, 3768], env: 'island', line: 52, house: FAM({ ...ISL, lift: 0.85 }), cam: { p: [-140, 120, 160], l: [0, 0, -10], p2: [-130, 110, 150], fov: 40 } },

  // ===== 11 · Người cha dưới hải đăng =====
  { id: 's106', f: [3769, 3806], env: 'island', line: 53, props: { cardIsland: { at: [21.4, 15.3, -15], ry: -0.83 } }, cam: { p: [17, 14.5, -11], l: [60, 22, -50], fov: 44 } },
  { id: 's107', f: [3807, 3852], env: 'island', line: 54, cast: { dadIsland: { at: DADSEAT, ry: -0.9, anim: 'sitHold' } }, props: { cardStack: { at: [43.0, 3.5, -27.2], ry: -0.9, s: 0.7 } },
    cam: { p: [28, 12, -8], l: [60, 34, -50], l2: [44, 4, -28], fov: 46 } },
  { id: 's108', f: [3853, 3881], env: 'island', line: 54, cast: { dadIsland: { at: DADSEAT, ry: -0.9, anim: 'sitHold' } }, props: { cardStack: { at: [43.0, 3.5, -27.2], ry: -0.9, s: 0.7 } }, cam: orb('dadIsland', -0.9, 9, 3, { look: [0, -2, 0], fov: 42 }) },
  { id: 's109', f: [3882, 3900], env: 'island', line: 54, cast: { dadIsland: { at: DADSEAT, ry: -0.9, anim: 'sitHold', face: 'worried' } }, cam: orb('face:dadIsland', -0.9, 3.2, 0, { fov: 40 }) },
  { id: 's110', f: [3901, 3928], env: 'island', line: 55, cast: { dadIsland: { at: DADSEAT, ry: -0.9, anim: 'sitHold' } }, props: { cardStack: { at: [43.0, 3.5, -27.2], ry: -0.9, s: 0.7 } }, cam: orb('dadIsland', -0.9, 4.5, 0, { look: [0, -1.6, 0], fov: 40 }) },
  { id: 's111', f: [3929, 3955], env: 'island', line: 55, cast: { dadIsland: { at: DADSEAT, ry: -0.9, anim: 'sitHold' } }, props: { cardStack: { at: [43.0, 3.5, -27.2], ry: -0.9, s: 0.7 } }, cam: { p: [40.8, 6.6, -25.0], l: [43.0, 3.7, -27.2], fov: 40 } },
  { id: 's112', f: [3956, 3992], env: 'island', line: 55, cast: { dadIsland: { at: DADSEAT, ry: -0.9, anim: 'sitHold' } }, props: { cardStack: { at: [43.0, 3.5, -27.2], ry: -0.9, s: 0.7 } }, cam: { p: [41.6, 5.8, -25.6], l: [43.0, 3.7, -27.2], p2: [41.8, 5.5, -25.9], fov: 40 } },
  { id: 's113', f: [3993, 4016], env: 'island', line: 56, cast: { dadIsland: { at: DADSEAT, ry: -0.9, anim: 'sitHold', face: 'surprised', pose: { head: { x: -0.4 } } } }, cam: orb('face:dadIsland', -0.9, 3.4, -0.6, { fov: 40, look: [0, 0.2, 0] }) },
  { id: 's114', f: [4017, 4055], env: 'island', line: 56, house: FAM({ ...ISL, lift: 0.85 }), cam: { p: [42, 5.5, -26], l: [-8, 22, 0], fov: 46 } },

  // ===== 12 · Đoàn tụ =====
  { id: 's115', f: [4056, 4091], env: 'island', line: 56, house: FAM({ ...ISL, lift: 0.85 }), cast: { dadIsland: { at: DADSEAT, ry: -1.3, anim: 'sitHold', pose: { head: { x: -0.4 } } } }, cam: { p: [49, 8.5, -31], l: [-6, 18, 0], fov: 46 } },
  { id: 's116', f: [4092, 4103], env: 'island', line: 57, cast: { dadIsland: { at: DADSEAT, ry: -0.9, anim: 'sitHold', face: 'surprised' } }, props: { cardStack: { at: [43.0, 3.5, -27.2], ry: -0.9, s: 0.7 } }, cam: orb('dadIsland', -0.9, 7, 1.5, { look: [0, -1, 0], fov: 42 }) },
  { id: 's117', f: [4104, 4136], env: 'island', line: 57, cast: { dadIsland: { at: DADSEAT, ry: -0.9, anim: 'idle', face: 'surprised', pose: { rightArm: { x: -1.2 }, leftArm: { x: -1.2 } } } },
    fx: { cards: { at: [43.0, 4.0, -27.2], t0: 0.1, up: 7, out: 5, ground: 2.6 } }, cam: orb('dadIsland', -0.9, 9, 1, { look: [0, -1, 0], fov: 44 }) },
  { id: 's118', f: [4137, 4151], env: 'island', line: 58, house: FAM({ ...ISL, lift: 0.85, door: 1 }), cast: { hero: P(0, 10.8, { anim: 'idle', face: 'surprised', s: 0.92 }) }, cam: orb('face:hero', 0, 3.6, -0.3, { rel: true, fov: 42 }) },
  { id: 's119', f: [4152, 4172], env: 'island', line: 59, house: FAM({ ...ISL, lift: 0.85, door: 1 }), cast: { hero: P(0, 11, { to: [0, -3.5, 19.5], anim: 'run', face: 'happy', s: 0.92 }) }, cam: orb('hero', 0, 11, 2, { rel: true, fov: 44 }) },
  { id: 's120', f: [4173, 4187], env: 'island', line: 59, house: FAM({ ...ISL, lift: 0.85 }), cast: { hero: { at: porchW(0, 24), to: porchW(0, 34), anim: 'run', face: 'happy', s: 0.92 } }, cam: orb('hero', 0, 10, 1, { rel: true, fov: 44 }) },
  { id: 's121', f: [4188, 4219], env: 'island', line: 60, house: FAM({ ...ISL, lift: 0.85 }), cast: { mom: { at: porchW(-2, 22), to: porchW(-2, 34), anim: 'run', face: 'happy' } }, cam: orb('mom', 0, 11, 1, { rel: true, fov: 44 }) },
  { id: 's122', f: [4220, 4290], env: 'island', line: 61, cast: { dadIsland: { at: [40, 0, -21], ry: -0.9 + PI, anim: 'hug', face: 'happy' }, hero: { at: [38.5, 0, -19.6], ry: -0.9, anim: 'hug', s: 0.92 }, mom: { at: [37.6, 0, -21.6], ry: -0.6, anim: 'hug' } },
    cam: { p: [30, 6, -12], l: [39, 3.4, -20.6], p2: [31, 5.6, -13], fov: 42 } },

  // ===== 13 · Giải thích ba năm =====
  { id: 's123', f: [4291, 4329], env: 'island', line: 61, fx: { cards: { at: [39, 3, -20.6], t0: -0.6, up: 4, out: 6, ground: 0 } },
    cast: { dadIsland: { at: [40, 0.6, -21], ry: 2.2, anim: 'tumble', face: 'happy', animFromShot: true }, hero: { at: [38, 0.6, -19.6], ry: -0.9, anim: 'tumble', s: 0.92, animFromShot: true }, mom: { at: [37.6, 0.6, -22], ry: -0.4, anim: 'tumble', animFromShot: true } },
    cam: { p: [39, 20, -18], l: [39, 0, -20.6], fov: 44 } },
  { id: 's124', f: [4330, 4357], env: 'reef', line: 62, cam: { p: [-50, 14, 50], l: [5, 2, 0], p2: [-46, 13, 46], fov: 40 } },
  { id: 's125', f: [4358, 4378], env: 'reef', line: 62, cam: { p: [20, 4, 30], l: [5, 3, 0], fov: 44 } },
  { id: 's126', f: [4379, 4405], env: 'island', line: 63, fx: { cards: { at: [-22, 0.3, 20], t0: -5, up: 0, out: 4, ground: 0 } }, cam: { p: [-14, 3.5, 30], l: [-24, 7, 16], fov: 46 } },
  { id: 's127', f: [4406, 4436], env: 'island', line: 63, cam: { p: [130, 34, 60], l: [44, 12, -36], fov: 38 } },
  { id: 's128', f: [4437, 4478], env: 'island', line: 63, cast: { dadIsland: { at: DADSEAT, ry: -0.9, anim: 'write', holdR: { name: 'pencil', at: [0.1, -2.2, 0.6], rot: [0.8, 0, 0] } } }, props: { cardWrite: { at: [43.0, 3.55, -27.2], rx: -PI / 2, rz: 0.9 } },
    cam: orb('dadIsland', -0.5, 7, 2, { look: [0, -1.8, 0], fov: 42 }) },
  { id: 's129', f: [4479, 4493], env: 'island', line: 63, cast: { mom: { at: [36, 0, -20], ry: 0.6, anim: 'sit', face: 'happy' }, dadIsland: { at: [39, 0, -21], ry: 0.1, anim: 'sit', face: 'happy' }, hero: { at: [41.5, 0, -19.6], ry: -0.4, anim: 'sit', face: 'happy', s: 0.92 } },
    cam: { p: [38, 5, -9], l: [38.8, 2.6, -20.4], fov: 42 } },
  { id: 's130', f: [4494, 4527], env: 'island', line: 64, house: FAM({ ...ISL, lift: 0.85 }), cast: { mom: { at: [26, 0, -16], ry: -2.4, anim: 'sit' }, dadIsland: { at: [28.5, 0, -17.5], ry: -2.4, anim: 'sit' }, hero: { at: [31, 0, -18.8], ry: -2.4, anim: 'sit', s: 0.92 } },
    cam: { p: [36, 7, -24], l: [-8, 18, 0], fov: 42 } },

  // ===== 14 · Nhà đưa gia đình về =====
  { id: 's131', f: [4528, 4568], env: 'island', line: 64, house: FAM({ ...ISL, lift: 0.85, kneel: [0, 0.3] }), cam: { p: [porchW(0, 90)[0], 10, porchW(0, 90)[2]], l: [-10, 16, 0], fov: 40 } },
  { id: 's132', f: [4569, 4618], env: 'island', line: 65, house: FAM({ ...ISL, lift: 0.85, kneel: [0.3, 0.75] }), cam: { p: [porchW(-30, 80)[0], 8, porchW(-30, 80)[2]], l: [-10, 12, 0], fov: 40 } },
  { id: 's133', f: [4619, 4646], env: 'island', line: 65, house: FAM({ ...ISL, lift: 0.85, kneel: [0.75, 1] }), cam: { p: [porchW(0, 64)[0], 5, porchW(0, 64)[2]], l: [-10, 9, 0], fov: 42 } },
  { id: 's134', f: [4647, 4696], env: 'island', line: 66, house: FAM({ ...ISL, lift: 0.85, kneel: 1 }), cast: { dadIsland: P(0, 21, { at: [0, -3, 21], to: [0, 0, 13.5], anim: 'walk', ry: PI, face: 'moved' }), mom: P(-3, 12.5, { anim: 'idle', face: 'happy', ry: 0.2 }) },
    cam: orb('dadIsland', PI + 0.3, 12, 3, { rel: false, look: [0, -0.5, 0], fov: 42 }) },
  { id: 's135', f: [4697, 4723], env: 'iceSea', light: 'night', line: 66, house: FAM({ at: [8, 0], to: [-4, 0], ry: -PI / 2 }), cam: orb([2, 16, 0], 0.35, 96, 2, { fov: 52 }) },
  { id: 's136', f: [4724, 4749], env: 'town', line: 66, house: FAM({ legsOut: 1, lift: 0.5 }), cast: { hero: P(-9.6, 10.9, { anim: 'idle', face: 'happy', s: 0.92 }), dadIsland: P(-11.4, 10.9, { anim: 'idle', face: 'happy' }), mom: P(-7.6, 10.9, { anim: 'idle', face: 'happy' }) },
    cam: { p: [-9.6, 15, 30], l: [-9.6, 14.5, 10], fov: 44 } },

  // ===== 15 · Tủ lạnh đầy thư nhớ nhà =====
  { id: 's137', f: [4750, 4813], env: 'town', line: 67, house: FAM(walkX(-40, -10)), cam: orb([-25, 16, 36], -0.6, 90, 0, { fov: 52, yaw2: -0.4 }) },
  { id: 's138', f: [4814, 4882], env: 'kitchen', line: 68, room: { dense: true }, cam: { p: [-8, 6.5, -9.5], l: [-8, 6.2, -15.4], p2: [-8, 6.2, -10.2], fov: 46 } },
  { id: 's139', f: [4883, 4897], env: 'kitchen', line: 68, room: { dense: true }, cam: { p: [0, 7, 2], l: [-8, 6, -15.4], fov: 46 } },
  { id: 's140', f: [4898, 4943], env: 'kitchen', line: 69, room: { dense: true }, cam: { p: [-9, 7.5, -12], l: [-8.5, 7.2, -15.4], p2: [-8, 6.5, -12], fov: 40 } },
  { id: 's141', f: [4944, 4980], env: 'kitchen', line: 70, room: { dense: true }, cam: { p: [-7, 4.2, -12.4], l: [-7.8, 4.2, -15.4], p2: [-7.6, 4.6, -12.4], fov: 40 } },
  { id: 's142', f: [4981, 5007], env: 'kitchen', line: 70, room: { dense: true }, cam: { p: [-9.6, 8.6, -12.6], l: [-8.8, 8.2, -15.4], fov: 40 } },
  { id: 's143', f: [5008, 5054], env: 'kitchen', line: 71, room: { dense: true }, cam: { p: [-7.2, 6, -12.2], l: [-8, 5.6, -15.4], p2: [-8.2, 6.2, -12.6], fov: 40 } },

  // ===== 16 · Cả nhà bên nhau =====
  { id: 's144', f: [5055, 5094], env: 'kitchen', line: 72, room: { dense: true },
    cast: { hero: R(-7.5, 0, -9.5, { anim: 'idle', face: 'happy', s: 0.92 }), mom: R(-10.5, 0, -11.8, { anim: 'idle', face: 'happy', ry: 0.2 }), dadIsland: R(-4.6, 0, -11.8, { anim: 'idle', face: 'happy', ry: -0.2 }) },
    cam: { p: [-7.5, 7, 7], l: [-7.5, 4.6, -11], p2: [-7.5, 6.8, 5.5], fov: 46 } },
  { id: 's145', f: [5095, 5131], env: 'kitchen', line: 72, room: { dense: true },
    cast: { hero: R(-7.5, 0, -9.5, { anim: 'cheer', face: 'happy', s: 0.92 }), mom: R(-10.5, 0, -11.8, { anim: 'idle', face: 'happy', ry: 0.2 }), dadIsland: R(-4.6, 0, -11.8, { anim: 'idle', face: 'happy', ry: -0.2 }) },
    cam: { p: [-7.5, 6.6, 4], l: [-7.5, 4.8, -11], p2: [-7.5, 6.4, 3], fov: 46 } },
];
