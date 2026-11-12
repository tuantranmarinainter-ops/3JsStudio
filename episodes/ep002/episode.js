// ep002 — Món đồ biến mất trong phòng khóa kín. Sinh bởi tools/storyboard.py từ kich-ban.md (sửa tay tiếp: diễn viên, địa điểm 'town:center' = chưa đặt).
// Địa điểm thị trấn có sẵn: square, home, yard, shop, street, crossroad, park, center, house1… (engine/town.js); '<env>_in' = chỗ đứng trong env riêng.
// props: { <tên>: { kit: <khoá PROPS_KB (engine/props-kb.js) | hàm propKit>, at: <địa điểm | env>, on?: <đạo cụ đỡ>, hold?: chỉ được cầm,
//          pos?: [x,y,z], ry? } } — không ghi pos: engine/props-kb.js datDaoCu() đặt theo quy tắc (docs/kich-ban-vao.md).
export const EPISODE = {
  id: "ep002",
  title: "Món đồ biến mất trong phòng khóa kín",
  fps: 30,
  seed: 21,
  rule: "Ở thị trấn này, đồ đạc liên tục biến mất dù phòng đã khóa kín.",
  weakness: "Tôi mất sợi dây chuyền bà để lại — món tôi quý nhất.",
  twist: "Gấu bông ông Bách phát miễn phí là kẻ trộm; ông còn tự giấu hàng mình rồi báo mất để không ai nghi.",
  solution: "Tôi theo Bắp tới nhà máy, dẫn thị trưởng tới tận nơi; gấu mang luôn dép thị trưởng tới trước mắt chú.",
  env: "kenneyTown",
  light: "day",
  town: {"blocks": 3},
  actors: {"hero": {"ga": 1}, "bach": {"shirt": "#f2e3c6", "pants": "#6d4c41", "hair": "short", "hairColor": "#9e9e9e", "beard": true}, "mayor": {"shirt": "#9fc5e8", "pants": "#9fc5e8", "hair": "short", "hairColor": "#3e2723"}, "guard1": {"shirt": "#1f3a68", "pants": "#1f3a68", "hat": "beanie", "hatColor": "#c0392b"}, "guard2": {"shirt": "#1f3a68", "pants": "#1f3a68", "hat": "beanie", "hatColor": "#f1c40f"}, "baker": {"shirt": "#ffffff", "pants": "#795548"}, "tailor": {"shirt": "#e91e63", "skirt": "#4a148c", "hair": "braids", "lashes": true}, "kid1": {"shirt": "#4caf50", "pants": "#1565c0"}, "bap": {"bear": 1, "bow": "#2e86de"}, "bear2": {"bear": 1, "bow": "#e74c3c"}, "bear3": {"bear": 1, "bow": "#f1c40f"}, "crowd": {"count": 8}},
  places: {"bakery": {"pos": [18.0, 0, -6.0], "ry": 0}, "tailor": {"pos": [26.0, 0, -6.0], "ry": 0}, "bearshop": {"pos": [-8.0, 0, -6.0], "ry": 0}, "mayor": {"pos": [34.0, 0, -6.0], "ry": 0}, "balcony": {"pos": [0.0, 0, -4.0], "ry": 0}, "roof": {"pos": [0.0, 0, 8.0], "ry": 0}, "factory": {"pos": [60.0, 0, -20.0], "ry": 0}, "bedroom_in": {"pos": [4, 0, 3], "ry": 0}, "factory_in": {"pos": [0, 0, 3], "ry": 0}},
  props: {"ke_trong": {"kit": "ke_trong", "at": "home"}, "o_khoa": {"kit": "o_khoa", "at": "home"}, "hoc_quay": {"kit": "hoc_quay", "at": "bakery"}, "hop_nhan": {"kit": "hop_nhan", "at": "tailor"}, "thung_dau_gau": {"kit": "thung_dau_gau", "at": "bearshop"}, "bang_tin": {"kit": "bang_tin", "at": "square"}, "ke_phong_ga": {"kit": "ke_phong_ga", "at": "bedroom"}, "anh_ba": {"kit": "anh_ba", "at": "bedroom"}, "dong_ho": {"kit": "dong_ho", "at": "bedroom", "on": "ke_phong_ga"}, "guong": {"kit": "guong", "at": "bedroom"}, "cuon_sach": {"kit": "cuon_sach", "at": "bedroom"}, "nhan_moi": {"kit": "nhan_moi", "at": "bedroom", "on": "ke_phong_ga"}, "vi": {"kit": "vi", "at": "crossroad", "hold": true}, "tui_tien": {"kit": "tui_tien", "at": "crossroad", "hold": true}, "bang_chuyen": {"kit": "bang_chuyen", "at": "factory"}, "ke_gau": {"kit": "ke_gau", "at": "factory"}, "ban_do": {"kit": "ban_do", "at": "factory"}, "ket_tien": {"kit": "ket_tien", "at": "factory"}, "day_chuyen": {"kit": "day_chuyen", "at": "factory", "on": "ket_tien"}, "chuong": {"kit": "chuong", "at": "factory"}, "doi_dep": {"kit": "doi_dep", "at": "factory", "hold": true}, "chan_tran": {"kit": "chan_tran", "at": "factory"}, "thung_tiem_bach": {"kit": "thung_tiem_bach", "at": "factory"}, "ket_ga": {"kit": "ket_ga", "at": "bedroom"}},
};
