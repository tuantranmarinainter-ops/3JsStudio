// Sinh cues_s001-s114.json và steps_extra.json từ THỜI GIAN SHOT THẬT (cộng dồn dur trong shots.js).
//   node episodes/ep002/sfx/gen-cues.mjs     (chạy từ gốc repo; xong chạy: node tools/build.mjs ep002 khoanh-khac buoc-chan)
// [shot, giây trong shot, tên tiếng, vol, dur?, align?]  — Boang dùng mốc tuyệt đối từ nguon/giong-moi/nhip.json.
import { writeFileSync, readFileSync } from 'fs';
import { loadShotList } from '../../../tools/sfx/shot-list.mjs';
const SL = await loadShotList('ep002');
const T0 = Object.fromEntries(SL.shots.map((s) => [s.id, s]));
const nhip = JSON.parse(readFileSync('episodes/ep002/nguon/giong-moi/nhip.json', 'utf8'));
const C = [
  ['s003', 0.2, 'door lock click', 0.6, 1.2, 'peak', 'ổ khoá cửa còn nguyên'],
  ['s005', 0.1, 'gasp short', 0.3, 0.8, null, 'chú bán bánh giật mình'],
  ['s013', 0.2, 'paper rustle', 0.3, 0.9, null, 'bảng tin dán kín giấy báo mất'],
  ['s016', 0.25, 'soft magical chime', 0.3, 1.0, null, 'dây chuyền của bà biến mất'],
  ['s021', 0.4, 'glass clink table', 0.25, 0.8, 'peak', 'Gà đặt đồng hồ lên kệ'],
  ['s027', 0.1, 'cloth rustle', 0.2, 0.8, null, 'gấu lén ngồi dậy trong gương'],
  ['s032', 0.1, 'cloth rustle', 0.25, 1.0, null, 'gấu lén trèo lên kệ'],
  ['s033', 0.1, 'cloth rustle', 0.25, 0.9, null, 'gấu ôm đồng hồ'],
  ['s034', 0.3, 'book slide', 0.5, 1.0, null, 'kéo sách che chỗ vừa lấy đồ'],
  ['s036', 0.0, 'cloth rustle', 0.3, 0.6, null, 'Gà bật dậy'],
  ['s037', 0.4, 'magic poof', 0.6, 1.3, 'peak', 'Bắp biến mất'],
  ['s039', 0.6, 'window open', 0.5, 1.0, null, 'Gà mở cửa sổ'],
  ['s042', 0.3, 'glass clink table', 0.25, 0.8, 'peak', 'đặt nhẫn lên kệ'],
  ['s045', 0.15, 'cloth rustle', 0.25, 0.6, null, 'Bắp chộp nhẫn'],
  ['s046', 0.3, 'magic poof', 0.6, 1.3, 'peak', 'nhẫn và Bắp biến mất'],
  ['s051', 0.1, 'cloth rustle', 0.25, 0.9, null, 'hai gấu nhập bọn ở ngã ba'],
  ['s053', 0.1, 'cloth rustle', 0.25, 0.8, null, 'gấu nơ đỏ ôm ví'],
  ['s054', 0.1, 'cloth rustle', 0.25, 1.0, null, 'gấu nơ vàng kéo túi tiền'],
  ['s055', 0.2, 'cloth rustle', 0.2, 1.0, null, 'ba gấu chui hàng rào'],
  ['s057', 0.3, 'wood squeak', 0.3, 0.6, null, 'Gà trèo lên thùng gỗ'],
  ['s062', 0.0, 'dramatic sting', 0.7, 1.4, 'peak', 'lộ mặt ông Bách (twist)'],
  ['s069', 0.3, 'marker squeak', 0.5, 0.8, null, 'đánh dấu X đỏ lên bản đồ'],
  ['s074', 0.5, 'soft magical chime', 0.3, 1.0, null, 'thấy dây chuyền của bà'],
  ['s077', 0.0, 'door knock', 0.6, 0.9, 'peak', 'Gà gõ cửa thị trưởng'],
  ['s077', 0.6, 'door creak', 0.5, 0.6, null, 'cửa hé mở'],
  ['s081', 0.6, 'door slam', 0.6, 0.95, 'peak', 'thị trưởng đóng cửa'],
  ['s093', 0.2, 'metal door slide', 0.7, 1.2, null, 'lính gác mở cửa kho'],
  ['s094', 0.1, 'gasp short', 0.3, 0.6, null, 'thị trưởng thấy thùng'],
  ['s095', 0.1, 'heavy wood thud', 0.3, 0.7, 'peak', 'chồng thùng in tên tiệm'],
  ['s098', 0.0, 'cricket', 0.4, 0.99, null, 'ông Bách im lặng gượng'],
  ['s106', 0.3, 'soft magical chime', 0.3, 0.9, null, 'Gà cầm lại dây chuyền'],
  ['s107', 0.6, 'safe door close', 0.6, 0.64, 'peak', 'cất dây chuyền vào két'],
  ['s109', 0.1, 'cloth rustle', 0.25, 0.9, null, 'Bắp ôm nguyên cái két'],
  ['s111', 0.4, 'thud soft', 0.5, 0.5, 'peak', 'Bắp đặt két xuống'],
];
const cues = C.map(([shot, dt, name, vol, dur, align, why]) => {
  const x = { t: +(T0[shot].t0 + dt).toFixed(3), name, vol, dur };
  if (align) x.align = align; x.shot = shot; x.why = why; return x;
});
// Boang: hai lớp trùng đỉnh đúng nhip.boang (chảo rỗng + cartoon boing)
const B = nhip.boang;
cues.push({ t: B, name: 'hollow pan bonk', vol: 0.9, dur: 0.9, align: 'peak', shot: 's113', why: 'Boang (nhip.json: boang)' });
cues.push({ t: B, name: 'cartoon boing', vol: 0.7, dur: 2.14, align: 'peak', shot: 's113', why: 'Boang — đuôi lò xo' });
cues.sort((a, b) => a.t - b.t);
writeFileSync('episodes/ep002/sfx/cues_s001-s114.json', JSON.stringify(cues, null, 1));

// bước chân nhân vật: [shot, ai, nhịp (giây/bước), dist (xa → nhỏ), bắt đầu trễ]
const S = [
  ['s039', 0.27, 55], ['s049', 0.27, 55], ['s051', 0.30, 80], ['s055', 0.30, 80], ['s076', 0.26, 55],
  ['s083', 0.28, 65], ['s087', 0.52, 50], ['s101', 0.5, 70], ['s108', 0.5, 60],
];
const steps = [];
for (const [id, cad, dist] of S) {
  const s = T0[id];
  for (let t = s.t0 + 0.12; t < s.t1 - 0.05; t += cad) steps.push({ t: +t.toFixed(3), shot: id, dist, onScreen: true });
}
writeFileSync('episodes/ep002/sfx/steps_extra.json', JSON.stringify(steps));
console.log(cues.length, 'cue;', steps.length, 'bước chân');
