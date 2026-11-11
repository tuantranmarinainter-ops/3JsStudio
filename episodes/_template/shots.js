// TẬP MẪU — mỗi shot 1 dòng, chỉ ghi phần KHÁC mặc định của loại shot (engine/shottypes.js).
// Địa điểm có sẵn từ thị trấn (engine/town.js): square, home, yard, shop, street, crossroad, park, center, house1…
export const SHOTS = [
  { id: 's001', dur: 2.0, type: 'establish', at: 'square', text: 'Ở thị trấn này…', line: 1 },
  { id: 's002', dur: 1.5, type: 'crowd', at: 'square', anim: 'jump', line: 1 },
  { id: 's003', dur: 1.5, type: 'walkBy', who: 'hero', at: 'street', anim: 'walk', line: 2 },
  { id: 's004', dur: 1.2, type: 'closeup', who: 'hero', face: 'surprised', line: 2 },
  { id: 's005', dur: 1.5, type: 'follow', who: 'hero', at: 'street', anim: 'run', turn: 1.5708, line: 3 },
  { id: 's006', dur: 1.2, type: 'reaction', who: 'hero', face: 'worried', line: 3 },
  { id: 's007', dur: 1.8, type: 'dialogue', who: 'hero', with: 'mom', at: 'home', withAnim: 'point', line: 4 },
  { id: 's008', dur: 1.5, type: 'overShoulder', who: 'mom', with: 'hero', at: 'home', anim: 'wave', face: 'happy', line: 4 },
  { id: 's009', dur: 1.2, type: 'insert', obj: 'mailbox_home', at: 'home', line: 5 },
  { id: 's010', dur: 1.8, type: 'chase', who: 'hero', with: 'crowd1', at: 'street', line: 5 },
  { id: 's011', dur: 2.5, type: 'reveal', who: 'hero', at: 'park', text: 'Bí mật!', line: 6 },
  // --- LÕI BIỂN (docs/core.md) — bỏ // để dùng; env có biển: 'sea' (biển chung), ocean, storm, shipStorm, hawaii, island… ---
  // { id: 's012', dur: 2.0, env: 'sea', seaWeather: 'nang', cam: { at: 'hero', dist: [14, 9], h: 4 },
  //   cast: { hero: { at: [0, -1.2, 0], anim: 'idle', float: { hx: 1.2, hz: 0.8, draft: 0.2 } } },        // người nổi trên sóng
  //   props: { crate: { at: [6, 0.4, 3], float: true } },                                                // đạo cụ nổi (tên trong props của tập)
  //   seaEvents: [{ at: [4, 6], t: 0.8, strength: 2, radius: 12 }] },                                     // vòng sóng lúc 0.8 s của shot
  // { id: 's013', dur: 3.0, env: 'sea', seaWeather: { from: 'gio-nhe', to: 'giong', ease: 'inout' },    // trời chuyển giông trong shot
  //   house: { at: [0, 0], boat: 1, y: -2 }, cam: { at: 'house', dist: [60, 80], h: 14 } },               // nhà nổi như thuyền
  // { id: 's014', dur: 1.5, env: 'storm', seaWeather: { base: 'bao', rain: 0.4 } },                        // preset + ghi đè
];
