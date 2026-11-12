// goc-mau.js — DỮ LIỆU THUẦN: 2 góc camera mẫu cho mỗi env (không import gì; dùng cho test 3 tầng + bảng mẫu duyệt Task 15).
//   rong = toàn cảnh (thấy đường chân trời / toàn phòng với nội thất)
//   can  = tầm mắt nhân vật (~y 4–6) tại chỗ diễn chính của env, nhìn ngang về hướng hậu cảnh chính
//   { ten, p:[x,y,z], look:[x,y,z], fov }
const g = (rong, can) => ({ rong: { ten: 'rong', ...rong }, can: { ten: 'can', ...can } });

export const GOC_MAU = {
  town:       g({ p: [0, 30, 110], look: [0, 10, -300], fov: 56 }, { p: [-18, 5, 36], look: [-18, 6, -300], fov: 46 }),
  forest:     g({ p: [0, 26, 90], look: [0, 14, -300], fov: 56 }, { p: [0, 7, 70], look: [0, 12, -300], fov: 50 }),
  hawaii:     g({ p: [0, 20, 80], look: [0, 12, -300], fov: 56 }, { p: [0, 5, 20], look: [0, 6, -300], fov: 46 }),
  brazil:     g({ p: [0, 90, 160], look: [0, 55, -300], fov: 56 }, { p: [0, 5, 300], look: [0, 45, -300], fov: 50 }),
  sahara:     g({ p: [0, 20, 80], look: [0, 12, -300], fov: 56 }, { p: [0, 5, 20], look: [0, 6, -300], fov: 46 }),
  antarctica: g({ p: [0, 20, 80], look: [0, 12, -300], fov: 56 }, { p: [0, 5, 45], look: [0, 6, -300], fov: 46 }),
  ocean:      g({ p: [0, 30, 100], look: [0, 14, -300], fov: 56 }, { p: [0, 16, 30], look: [0, 17, -300], fov: 46 }),
  mountain:   g({ p: [0, 20, 80], look: [0, 12, -300], fov: 56 }, { p: [0, 5, 20], look: [0, 6, -300], fov: 46 }),
  snowNight:  g({ p: [0, 20, 80], look: [0, 12, -300], fov: 56 }, { p: [0, 5, 20], look: [0, 6, -300], fov: 46 }),
  iceSea:     g({ p: [0, 20, 80], look: [0, 12, -300], fov: 56 }, { p: [0, 5, 20], look: [0, 6, -300], fov: 46 }),
  storm:      g({ p: [6, 14, 40], look: [0, 14, -300], fov: 56 }, { p: [6, 11.5, 22], look: [0, 12, -300], fov: 46 }),
  shipStorm:  g({ p: [-28, 12, 40], look: [0, 8, -300], fov: 56 }, { p: [-55, 9, 80], look: [0, 10, 0], fov: 50 }),
  island:     g({ p: [0, 20, 80], look: [0, 12, -300], fov: 56 }, { p: [0, 5, 20], look: [0, 6, -300], fov: 46 }),
  reef:       g({ p: [20, 10, 50], look: [5, 4, -300], fov: 56 }, { p: [20, 4.5, 30], look: [5, 4, -300], fov: 46 }),
  kitchen:    g({ p: [0, 12, 22], look: [0, 7, -15], fov: 70 }, { p: [14, 6, 10], look: [-2, 5, -14], fov: 50 }),
  bedroom:    g({ p: [0, 10, 12], look: [0, 6, -15], fov: 70 }, { p: [8, 6, 12], look: [-6, 3, -8], fov: 50 }),
  factory:    g({ p: [7, 9, 13], look: [-4, 5, -14], fov: 80 }, { p: [0, 5, 6], look: [1, 5, -14], fov: 50 }),
  sea:        g({ p: [0, 20, 80], look: [0, 12, -300], fov: 56 }, { p: [22, 5, 18], look: [43, 6, -38], fov: 46 }),
};
