// TẬP MẪU — cấu hình chung (dữ liệu thuần, khai báo 1 lần). tools/storyboard.py sinh file này cho tập mới.
export const EPISODE = {
  id: '_template',
  title: 'Tập mẫu — đủ 11 loại shot',
  fps: 30,
  seed: 7,                                  // thị trấn + dân giống hệt mỗi lần render
  rule: 'Ai đi bộ cũng phải nhảy',
  weakness: '',
  twist: '',
  solution: '',
  env: 'kenneyTown',                        // env mặc định (engine/town.js); có thể dùng env của engine/envs.js: hawaii, forest, kitchen…
  light: 'day',                             // preset ánh sáng (engine/lights.js LIGHTS)
  // biển: env 'sea' + shot.seaWeather ('lang' 'nang' 'gio-nhe' 'u-am' 'mua' 'giong' 'bao' 'dem-trang' 'dem-bao' 'bang') — docs/core.md
  town: { blocks: 3 },                      // tuỳ chọn buildTown (blocks, block, tile, houseSize)
  actors: {                                 // tuỳ chọn createR15 (engine/r15.js) + crowd.count
    hero: { shirt: '#e74c3c', sleeves: '#e74c3c', pants: '#2c3e50', hat: 'cap', hatColor: '#2d6cdf', face: 'smile' },
    mom: { skin: '#f0c89a', shirt: '#8e44ad', sleeves: '#8e44ad', skirt: '#5d4037', pants: '#5d4037', hair: 'braids', lashes: true, face: 'smile' },
    crowd: { count: 8 },
  },
  places: {},                               // thêm/ghi đè địa điểm: { bakery: { pos: [x,0,z], ry: 0 }, nha: 'town:home' }
};
