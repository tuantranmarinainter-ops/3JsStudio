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
];
