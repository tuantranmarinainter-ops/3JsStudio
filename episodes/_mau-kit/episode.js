// _mau-kit — tập thử 6 shot sinh từ bộ kit mẫu (tools/tests/fixtures/dau-vao-mau). shots.js do `node tools/kit-shots.mjs` sinh, KHÔNG sửa tay.
// Bối cảnh: tiem-banh → engine/envs/shop-in.js (vai bakery, gốc x=0) · pho → engine/envs/e3-pho.js. Ánh xạ gốc kit: goc.json.
export const EPISODE = {
  id: "_mau-kit",
  title: "Tập thử kit → shots",
  fps: 30,
  seed: 1,
  facePack: 'altiwyre',                     // bộ mặt nhân vật R6: 'altiwyre' | 'emote37' (engine/face-pack.js)
  rule: "Tập thử kỹ thuật, không có cốt truyện.",
  env: "kenneyTown",
  light: "day",
  town: {"blocks": 3, "kieu": "pastel", "vai": ["bakery", "tailor", "mayor", "bearshop"], "vanh": 1},   // như ep002 (buildTown cần ≥ 3 khối)
  actors: { "ga": { "ga": 1 }, "ba-ban-banh": { "shirt": "#f2e3c6", "pants": "#6d4c41", "hat": "tophat", "hatColor": "#ffffff", "hair": "short", "hairColor": "#3e2723" } },
  places: { "goc": { "pos": [0, 0, 0], "ry": 0 } },
  props: {},
};
