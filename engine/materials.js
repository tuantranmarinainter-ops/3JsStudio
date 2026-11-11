// materials.js — CHẤT LIỆU THẬT cho mọi vật trong phim: giấy ra giấy, gỗ ra gỗ, sắt ra sắt, vải ra vải…
// Vấn đề cũ: hầu hết vật là màu phẳng + độ nhám đều → trông như nhựa bóng, sạch. File này:
//   1. Phân loại từng mesh theo tên (đường dẫn object + tên vật liệu) → 1 trong ~35 "chất liệu" (MAT_KINDS).
//   2. Vá MeshStandardMaterial bằng onBeforeCompile (giữ nguyên ánh sáng/IBL/bóng của three): mỗi chất liệu có
//      - vân riêng sinh bằng toán (thớ gỗ, sợi giấy, sợi dệt, hạt cát, rỗ đá, vảy sơn tróc lộ kim loại, sọc tóc…)
//      - độ nhám/kim loại đúng vật lý (sắt: kim loại 1, nhám 0,35; giấy: nhám 0,95; men sứ: 0,12…) + nhám thay đổi theo vân
//      - gồ ghề (bump) theo vân, tự mờ dần khi vân nhỏ hơn điểm ảnh (không nhiễu lấp lánh)
//      - vải/lông: viền sáng mềm (sheen); tuyết/cát: hạt lấp lánh; xe: vảy nhũ
//   Toạ độ vân = toạ độ cục bộ của vật × tỉ lệ thế giới (stud) → vật đi lại vân đi theo, không trôi. Tất định.
//
//   import { applyMaterials, MATS } from '/engine/materials.js';
//   applyMaterials(THREE, stage.scene);          // SAU applyGrunge (vá nối tiếp, không ghi đè)
//   MATS.on.value = 0 | 1                         // bật/tắt cả hệ (engine/post.js đặt theo ô "mats")
// Gán tay: object.userData.matKind = 'wood' | 'paper' | … (ưu tiên hơn luật), 'none' = bỏ qua.
// Kiểm kê: node tools/mat-inventory.mjs → output/mat-inventory.json (cột kind).
import { ensureBoxAttr } from './grunge.js';

export const MATS = { on: { value: 1 } };

// r: độ nhám, m: kim loại, pat: kiểu vân, sc: số vân / stud, bump: độ gồ, sheen: viền sáng vải/lông,
// spark: hạt lấp lánh, tint: nhân màu, rmode 'max' = chỉ làm nhám thêm (không làm bóng hơn bản gốc)
export const MAT_KINDS = {
  wood:        { r: 0.72, m: 0, pat: 'WOOD', sc: 1.0, bump: 0.9, label: 'Gỗ mộc' },
  woodpaint:   { r: 0.62, m: 0, pat: 'WOODPAINT', sc: 1.0, bump: 0.5, label: 'Gỗ sơn' },
  bark:        { r: 0.95, m: 0, pat: 'BARK', sc: 1.0, bump: 1.6, label: 'Vỏ cây' },
  paper:       { r: 0.93, m: 0, pat: 'PAPER', sc: 1.0, bump: 0.12, tint: [1.0, 0.985, 0.95], label: 'Giấy' },
  fabric:      { r: 0.96, m: 0, pat: 'FABRIC', sc: 1.0, bump: 0.2, sheen: 1, label: 'Vải' },
  knit:        { r: 0.98, m: 0, pat: 'FUZZ', sc: 1.0, bump: 0.2, sheen: 1, label: 'Len đan' },
  hair:        { r: 0.45, m: 0, pat: 'HAIR', sc: 1.0, bump: 0.5, sheen: 0.4, label: 'Tóc' },
  skin:        { r: 0.6, m: 0, pat: 'SKIN', sc: 1.0, bump: 0.0, label: 'Da' },
  carpaint:    { r: 0.24, m: 0.15, pat: 'FLAKE', sc: 1.0, bump: 0.05, spark: 0.25, label: 'Sơn xe bóng' },
  chrome:      { r: 0.25, m: 0.7, pat: 'SCRATCH', sc: 1.0, bump: 0.15, label: 'Kim loại mạ' },
  metalpaint:  { r: 0.48, m: 0, pat: 'METALPAINT', sc: 1.0, bump: 0.6, label: 'Sắt sơn (tróc, gỉ)' },
  iron:        { r: 0.42, m: 0.75, pat: 'IRON', sc: 1.0, bump: 0.6, label: 'Sắt trần' },
  plastic:     { r: 0.35, m: 0, pat: 'PLASTIC', sc: 1.0, bump: 0.0, label: 'Nhựa thật (nam châm, đồ chơi)' },
  rubber:      { r: 0.88, m: 0, pat: 'MATTE', sc: 1.0, bump: 0.2, tint: [0.9, 0.9, 0.9], label: 'Cao su' },
  glass:       { r: 0.05, m: 0, pat: 'NONE', sc: 1.0, bump: 0.0, tint: [0.92, 0.95, 0.98], label: 'Kính' },
  enamel:      { r: 0.14, m: 0, pat: 'ENAMEL', sc: 1.0, bump: 0.12, label: 'Men / sứ' },
  tile:        { r: 0.2, m: 0, pat: 'ENAMEL', sc: 1.0, bump: 0.1, label: 'Gạch men' },
  fruit:       { r: 0.4, m: 0, pat: 'PORES', sc: 1.0, bump: 0.5, label: 'Vỏ trái cây' },
  coconut:     { r: 0.95, m: 0, pat: 'FIBER', sc: 1.0, bump: 1.0, label: 'Xơ dừa' },
  shingle:     { r: 0.82, m: 0, pat: 'SHINGLE', sc: 1.0, bump: 1.2, label: 'Ngói / tấm lợp' },
  brick:       { r: 0.88, m: 0, pat: 'BRICK', sc: 1.0, bump: 1.2, label: 'Gạch' },
  plaster:     { r: 0.9, m: 0, pat: 'PLASTER', sc: 1.0, bump: 0.25, label: 'Tường vữa' },
  concrete:    { r: 0.92, m: 0, pat: 'CONCRETE', sc: 1.0, bump: 0.7, label: 'Bê tông' },
  asphalt:     { r: 0.93, m: 0, pat: 'ASPHALT', sc: 1.0, bump: 0.8, label: 'Nhựa đường' },
  roadpaint:   { r: 0.7, m: 0, pat: 'CONCRETE', sc: 1.0, bump: 0.5, label: 'Sơn kẻ đường' },
  stone:       { r: 0.9, m: 0, pat: 'STONE', sc: 1.0, bump: 1.4, label: 'Đá' },
  sand:        { r: 0.97, m: 0, pat: 'SAND', sc: 1.0, bump: 0.6, spark: 0.5, label: 'Cát' },
  soil:        { r: 0.97, m: 0, pat: 'SOIL', sc: 1.0, bump: 0.9, label: 'Đất' },
  grassground: { r: 0.95, m: 0, pat: 'GRASS', sc: 1.0, bump: 0.7, label: 'Cỏ (nền)' },
  foliage:     { r: 0.62, m: 0, pat: 'LEAF', sc: 1.0, bump: 0.4, sheen: 0.3, label: 'Lá' },
  cactus:      { r: 0.45, m: 0, pat: 'LEAF', sc: 1.0, bump: 0.5, label: 'Xương rồng (sáp)' },
  snow:        { r: 0.8, m: 0, pat: 'SNOW', sc: 1.0, bump: 0.5, spark: 1, label: 'Tuyết' },
  ice:         { r: 0.08, m: 0, pat: 'ICE', sc: 1.0, bump: 0.4, label: 'Băng' },
  coral:       { r: 0.9, m: 0, pat: 'CORAL', sc: 1.0, bump: 1.2, label: 'San hô' },
  shell:       { r: 0.3, m: 0, pat: 'SHELL', sc: 1.0, bump: 0.4, label: 'Vỏ cứng (cua, sò)' },
  feather:     { r: 0.92, m: 0, pat: 'FUR', sc: 1.0, bump: 0.4, sheen: 0.7, label: 'Lông vũ' },
  fur:         { r: 0.97, m: 0, pat: 'FUR', sc: 1.0, bump: 0.5, sheen: 0.8, label: 'Lông thú' },
  whale:       { r: 0.3, m: 0, pat: 'MOTTLE', sc: 1.0, bump: 0.3, label: 'Da ướt (cá voi)' },
  organic:     { r: 0.7, m: 0, pat: 'MOTTLE', sc: 1.0, bump: 0.4, label: 'Hữu cơ (nấm)' },
  matte:       { r: 0.82, m: 0, pat: 'MATTE', sc: 1.0, bump: 0.3, rmode: 'max', label: 'Mờ chung (mặc định)' },
};

// Luật phân loại: [regex trên "đường-dẫn-object [tên-vật-liệu]" viết thường, chất liệu]. Luật đầu khớp thắng; null = bỏ qua.
export const MAT_RULES = [
  [/\bface\b|window_view|\bsky\b|fx_|splash|spout|crab_eye|crab_pupil|\beye\b|pupil|\blamp\b|moon\/moon\b|cloud|puff/, null],
  [/\[_defaultmat\]/, 'matte'],                    // phần trắng chưa rõ của Kenney → mờ chung, không đoán
  [/car_body/, 'carpaint'],
  [/magnet/, 'plastic'],
  [/bumper|car_hub|handle_top/, 'chrome'],
  [/car_wheel|lamp_cord|car_skirt/, 'rubber'],
  [/camel_body\/blanket/, 'fabric'],
  [/camel/, 'fur'],
  [/_rod\b/, 'iron'],
  [/head_mesh|neck|arm_mesh\b/, 'skin'],
  [/ribbon/, 'fabric'],
  [/card|letter|picture|collage|\bbooks?\b/, 'paper'],
  [/\/sail\d*\s\[|curtain|blanket|mattress|pillow|\brug\b|scarf|skirt|\bhood\b|hoodie|(torso|leg)_mesh\b/, 'fabric'],
  [/beanie|\/hat\b/, 'knit'],
  [/hair|braid|beard/, 'hair'],
  [/(upper|lower)(torso|arm|leg)|(right|left)(hand|foot)/, 'fabric'],
  [/windshield|headlight|taillight|gable_window|window_front|glass\/glass/, 'glass'],
  [/fridge|bowl/, 'enamel'],
  [/crab/, 'shell'],
  [/mailbox|lighthouse|ship-large|hull|box_liner|box_rib|\/post\b|post_foot|post_brace|flag_arm/, 'metalpaint'],
  [/pencil/, 'wood'],
  [/frame/, 'woodpaint'],
  [/fruit/, 'fruit'],
  [/coconut\b/, 'coconut'],
  [/checker_floor/, 'tile'],
  [/bed_floor|porch_floor|table|beam|driftwood|dinghy|deck|cabin|wreck|tamarisk-wood|box_floor|tally|thigh|shin|leg_/, 'wood'],
  [/door|corner_trim|gable_ornament|fence|house_shell\/walls|basement/, 'woodpaint'],
  [/roof/, 'shingle'],
  [/chimney/, 'brick'],
  [/house_shell/, 'woodpaint'],                    // phần còn lại của vỏ nhà (cột hiên, tam giác hồi, lan can…)
  [/trunk|bark|bole|vine|\/root\b|coconut_palm\/crown\s\[/, 'bark'],
  [/cactus/, 'cactus'],
  [/leaf|leafs|frond|canopy|bush|plant|tuft|marram|dwarf-pine|flower|tree/, 'foliage'],
  [/lawn|forest_floor|jungle_floor|\[grass\]/, 'grassground'],
  [/dirt|\/path\b|jungle_path/, 'soil'],
  [/sand|dunes|seabed/, 'sand'],
  [/ice_floe|ice_sheet/, 'ice'],
  [/snow|range_|summit|peak/, 'snow'],
  [/coral/, 'coral'],
  [/shell|crab_top/, 'shell'],
  [/penguin|gull|bird/, 'feather'],
  [/whale/, 'whale'],
  [/mushroom/, 'organic'],
  [/rock|stone|cliff|boulder|outcrop|pyr_step|crater/, 'stone'],
  [/stripe/, 'roadpaint'],
  [/road|street|driveway|crosswalk/, 'asphalt'],
  [/sidewalk|front_walk|curb|lot_hole/, 'concrete'],
  [/building|kitchen_room|bedroom_room|wall_back|room/, 'plaster'],
];

const VERT_PARS = /* glsl */`
attribute vec3 aGrBox; attribute vec3 aGrSize;
varying vec3 vGrP; varying vec3 vGrN; varying vec3 vGrB; varying vec3 vGrSz;`;
const VERT_MAIN = /* glsl */`
{ vec3 grS = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
  vGrP = position * grS; vGrN = normal; vGrB = aGrBox; vGrSz = aGrSize * grS; }`;
const FRAG_VARY = /* glsl */`varying vec3 vGrP; varying vec3 vGrN; varying vec3 vGrB; varying vec3 vGrSz;`;

const FRAG_LIB = /* glsl */`
uniform float uMatOn;
float mtH(vec3 p) { p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mtH2(vec2 p) { return mtH(vec3(p, 1.37)); }
float mtN3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mtH(i), mtH(i + vec3(1,0,0)), f.x), mix(mtH(i + vec3(0,1,0)), mtH(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(mtH(i + vec3(0,0,1)), mtH(i + vec3(1,0,1)), f.x), mix(mtH(i + vec3(0,1,1)), mtH(i + vec3(1,1,1)), f.x), f.y), f.z); }
float mtFbm(vec3 p) { return 0.5 * mtN3(p) + 0.27 * mtN3(p * 2.03 + 5.1) + 0.15 * mtN3(p * 4.11 + 9.7) + 0.08 * mtN3(p * 8.3 + 2.3); }
vec2 mtVor(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y); vec2 o = vec2(mtH2(i + g), mtH2(i + g + 17.3));
    float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return vec2(d1, d2); }
vec3 mtAlb; float mtA, mtHgt, mtRv, mtMet, mtSpark, mtMetMix, mtFw;
float aa(float f) { return 1.0 - smoothstep(0.3, 0.8, mtFw * f); }   // f chu kỳ/stud → tắt khi < ~1–2 px/chu kỳ
`;

// Vân theo kiểu (chạy 1 lần sau map_fragment). Có sẵn: p (stud × sc), n (pháp tuyến cục bộ), uvp (mặt phẳng trội),
// aa(f) = 1 → 0 khi vân tần số f (chu kỳ/stud) nhỏ dần dưới cỡ 1 pixel → xa thì vân mịn tự tắt, không nhiễu hạt/moire.
// Biên độ cố ý NHẸ: chất liệu nhận ra nhờ độ nhám/kim loại + vân lớn; vân mịn chỉ thấy khi cận cảnh.
const PAT = {
  NONE: '',
  MATTE: `mtA = mix(0.95, 1.04, mtFbm(p * 0.9)); mtHgt = mtN3(p * 9.0) * aa(9.0);`,
  PLASTIC: `mtA = mix(0.985, 1.01, mtFbm(p * 1.2)); mtHgt = 0.5;`,
  WOOD: `
    vec3 sz = vGrSz; float along; vec2 acr;
    if (sz.x >= sz.y && sz.x >= sz.z) { along = p.x; acr = p.yz; } else if (sz.y >= sz.z) { along = p.y; acr = p.xz; } else { along = p.z; acr = p.xy; }
    float warp = mtN3(vec3(along * 0.12, acr * 0.5)) * 2.2;
    float ring = fract((acr.x * 0.8 + acr.y * 0.5 + warp) * 2.6);
    float g = smoothstep(0.0, 0.3, ring) * smoothstep(1.0, 0.55, ring) * aa(5.0);
    float streak = mix(0.5, mtN3(vec3(along * 0.22, acr * 11.0)), aa(11.0));
    float knot = smoothstep(0.86, 0.95, mtN3(vec3(along * 0.5, acr * 1.2) + 31.0));
    mtA = mix(0.8, 1.08, 0.5 * g + 0.5 * streak) * (1.0 - 0.3 * knot);
    mtHgt = 0.55 * g + 0.45 * streak - knot * 0.5; mtRv = (0.5 - streak) * 0.12;`,
  WOODPAINT: `
    vec3 sz = vGrSz; float along = (sz.x >= sz.z) ? p.x : p.z;
    float streak = mix(0.5, mtN3(vec3(along * 0.25, p.y * 9.0, along * 0.1)), aa(9.0));
    mtA = mix(0.95, 1.03, mtFbm(p * 1.3)) * mix(0.97, 1.02, streak); mtHgt = streak; mtRv = (0.5 - streak) * 0.08;`,
  BARK: `
    float f = 1.0 - abs(mtN3(vec3(p.x * 2.6, p.y * 0.32, p.z * 2.6)) * 2.0 - 1.0); f = f * f * f * aa(2.6);
    float plate = mtN3(vec3(p.x * 1.1, p.y * 0.5, p.z * 1.1));
    mtA = mix(1.08, 0.6, f) * mix(0.88, 1.06, plate); mtHgt = 1.0 - f;`,
  PAPER: `
    float mot = mtFbm(p * 1.6), fib = mix(0.5, mtN3(p * 30.0), aa(30.0));
    mtA = mix(0.985, 1.012, mot) * mix(0.992, 1.006, fib); mtHgt = fib * 0.5 + mot * 0.5;`,
  FABRIC: `
    float wf = 28.0; vec2 w = uvp * wf; float wv = 0.5 + 0.5 * sin(w.x * 6.2832) * sin(w.y * 6.2832);
    float k = aa(wf); wv = mix(0.5, wv, k);
    float fuzz = mix(0.5, mtN3(p * 14.0), aa(14.0)), slub = mtN3(vec3(uvp.x * 2.0, uvp.y * 24.0, 1.0));
    mtA = mix(0.965, 1.025, wv * 0.3 + fuzz * 0.7) * mix(0.975, 1.02, slub); mtHgt = wv * 0.6 + fuzz * 0.4;`,
  FUZZ: `float fz = mix(0.5, mtN3(p * 18.0), aa(18.0)); mtA = mix(0.94, 1.04, fz); mtHgt = fz;`,
  HAIR: `float s = mtN3(vec3(p.x * 30.0, p.y * 1.6, p.z * 30.0)); s = mix(0.5, s, aa(30.0)); mtA = mix(0.86, 1.14, s); mtHgt = s; mtRv = (s - 0.5) * 0.2;`,
  SKIN: `mtA = mix(0.99, 1.008, mtFbm(p * 2.0)); mtHgt = 0.5;`,
  FLAKE: `mtSpark = step(0.97, mtH(floor(p * 70.0))) * aa(70.0); mtHgt = 0.5;`,
  SCRATCH: `
    mtAlb = max(mtAlb, vec3(0.78));                                      // kim loại mạ phải sáng (màu gốc tối → đen kịt)
    float sc = smoothstep(0.93, 0.99, mtN3(vec3(uvp.x * 60.0, uvp.y * 1.2, 7.0))) * aa(60.0);
    mtA = 1.0 + sc * 0.1; mtRv = sc * 0.2 + (mtFbm(p * 2.0) - 0.5) * 0.12; mtHgt = -sc;`,
  METALPAINT: `
    float chipN = mtFbm(p * 1.1 + 7.0);
    float chip = smoothstep(0.69, 0.72, chipN);
    float rust = smoothstep(0.55, 0.8, mtFbm(p * 0.55 + 2.0)) * (0.4 + 0.6 * (1.0 - smoothstep(0.0, 0.6, vGrB.y)));
    float streakR = smoothstep(0.6, 0.85, mtN3(vec3(p.x * 2.0, p.y * 0.12, p.z * 2.0))) * (1.0 - step(0.7, abs(n.y)));
    vec3 metalC = vec3(0.62, 0.63, 0.66), rustC = vec3(0.42, 0.2, 0.08) * (0.75 + 0.4 * mtN3(p * 6.0));
    mtAlb = mix(mtAlb, metalC, chip);
    mtAlb = mix(mtAlb, rustC, clamp(rust * 0.5 + streakR * 0.3 + chip * rust, 0.0, 0.8));
    mtMetMix = chip * (1.0 - rust) * 0.85; mtA = mix(0.96, 1.03, mtN3(p * 3.0));
    mtHgt = chip * 0.8 + (smoothstep(0.66, 0.69, chipN) - chip) * 0.5 + rust * mix(0.5, mtN3(p * 16.0), aa(16.0)) * 0.6; mtRv = rust * 0.4 - chip * 0.12;`,
  IRON: `
    mtAlb = max(mtAlb, vec3(0.5));
    float rust = smoothstep(0.5, 0.78, mtFbm(p * 0.7 + 4.0)); vec3 rustC = vec3(0.4, 0.19, 0.08);
    mtAlb = mix(mtAlb, rustC, rust * 0.8); mtMetMix = -rust; mtA = mix(0.92, 1.04, mtN3(p * 4.0)); mtHgt = rust * mix(0.5, mtN3(p * 16.0), aa(16.0)); mtRv = rust * 0.45;`,
  ENAMEL: `mtA = mix(0.99, 1.008, mtFbm(p * 1.5)); mtHgt = mix(0.5, mtN3(p * 11.0), aa(11.0));`,
  PORES: `vec2 v = mtVor(uvp * 30.0); float d = mix(0.6, smoothstep(0.0, 0.35, v.x), aa(30.0)); mtA = mix(0.93, 1.0, d) * mix(0.96, 1.03, mtFbm(p * 2.0)); mtHgt = d;`,
  FIBER: `float fb = mix(0.5, mtN3(vec3(p.x * 22.0, p.y * 3.0, p.z * 22.0)), aa(22.0)); mtA = mix(0.76, 1.1, fb); mtHgt = fb;`,
  SHINGLE: `
    vec2 q = uvp * vec2(2.2, 3.4); float row = floor(q.y); q.x += mod(row, 2.0) * 0.5;
    vec2 cell = floor(q), f = fract(q); float k = aa(3.4);
    float edge = smoothstep(0.0, 0.07, f.x) * smoothstep(1.0, 0.93, f.x);
    mtA = mix(1.0, mix(0.84, 1.07, mtH2(cell + row * 7.0)) * mix(0.75, 1.0, f.y) * mix(0.82, 1.0, edge), k) * mix(0.95, 1.04, mtFbm(p * 2.0));
    mtHgt = mix(0.5, f.y * edge, k);`,
  BRICK: `
    vec2 q = uvp * vec2(2.0, 4.0); float row = floor(q.y); q.x += mod(row, 2.0) * 0.5;
    vec2 cell = floor(q), f = fract(q); float k = aa(4.0);
    float mortar = (1.0 - smoothstep(0.0, 0.05, min(min(f.x, 1.0 - f.x) * 0.5, min(f.y, 1.0 - f.y)))) * k;
    mtAlb = mix(mtAlb * mix(1.0, mix(0.82, 1.12, mtH2(cell)), k), vec3(0.62, 0.6, 0.56), mortar);
    mtA = mix(0.93, 1.05, mtFbm(p * 2.0)); mtHgt = 1.0 - mortar;`,
  PLASTER: `mtA = mix(0.95, 1.03, mtFbm(p * 0.9)); mtHgt = mix(0.5, mtN3(p * 8.0), aa(8.0)) * 0.7 + mtFbm(p * 2.0) * 0.3;`,
  CONCRETE: `
    float pore = step(0.95, mtH2(floor(uvp * 40.0))) * aa(40.0);
    mtA = mix(0.88, 1.05, mtFbm(p * 0.7)) * (1.0 - pore * 0.3) * mix(0.97, 1.02, mix(0.5, mtN3(p * 16.0), aa(16.0)));
    mtHgt = mix(0.5, mtN3(p * 16.0), aa(16.0)) - pore;`,
  ASPHALT: `
    float agg = step(0.85, mtH2(floor(uvp * 30.0))) * aa(30.0);
    vec2 v = mtVor(uvp * 0.35); float crack = (1.0 - smoothstep(0.0, 0.03, v.y - v.x)) * smoothstep(0.6, 0.75, mtFbm(p * 0.3 + 9.0)) * aa(2.0);
    mtA = mix(0.84, 1.08, mtFbm(p * 0.5)) * (1.0 + agg * 0.35) * (1.0 - crack * 0.45);
    mtHgt = mix(0.5, mtN3(p * 20.0), aa(20.0)) + agg * 0.5 - crack; mtRv = -agg * 0.08;`,
  STONE: `
    float s1 = mtFbm(p * 0.75), s2 = mix(0.5, mtN3(p * 7.0), aa(7.0)); vec2 v = mtVor(uvp * 1.1);
    float crack = (1.0 - smoothstep(0.0, 0.05, v.y - v.x)) * aa(3.0);
    float speck = step(0.9, mtH(floor(p * 20.0))) * aa(20.0);
    mtA = mix(0.78, 1.1, s1) * mix(0.92, 1.06, s2) * (1.0 - crack * 0.3) * (1.0 + speck * 0.2);
    mtHgt = s1 * 0.6 + s2 * 0.4 - crack * 0.6; mtRv = (0.5 - s2) * 0.08;`,
  SAND: `
    float gr = mix(0.5, mtN3(p * 18.0), aa(18.0)); float rip = 0.5 + 0.5 * sin(p.x * 1.3 + p.z * 0.45 + mtN3(p * 0.25) * 5.0);
    mtA = mix(0.93, 1.05, gr) * mix(0.96, 1.03, rip) * mix(0.94, 1.04, mtFbm(p * 0.3));
    mtHgt = gr * 0.5 + rip * 0.5; mtSpark = step(0.988, mtH(floor(p * 26.0))) * aa(26.0);`,
  SOIL: `
    float cl = mtFbm(p * 1.2); vec2 v = mtVor(uvp * 9.0); float peb = smoothstep(0.3, 0.18, v.x) * step(0.65, mtH2(floor(uvp * 9.0))) * aa(9.0);
    mtA = mix(0.8, 1.08, cl) * (1.0 + peb * 0.2); mtHgt = cl * 0.6 + peb * 0.6;`,
  GRASS: `
    float bl = mtN3(vec3(uvp * 40.0, 2.0)) * mtN3(vec3(uvp * 12.0, 5.0)); bl = mix(0.3, bl, aa(40.0)); float patchy = mtFbm(p * 0.35);
    mtA = mix(0.82, 1.1, patchy) * mix(0.9, 1.08, bl); mtHgt = bl;`,
  LEAF: `float vein = mix(0.5, mtN3(p * 9.0), aa(9.0)); mtA = mix(0.84, 1.1, mtFbm(p * 1.8)) * mix(0.95, 1.03, vein); mtHgt = vein;`,
  SNOW: `float g = mtFbm(p * 1.3); mtA = mix(0.96, 1.02, g); mtHgt = g + mix(0.5, mtN3(p * 10.0), aa(10.0)) * 0.3; mtSpark = step(0.991, mtH(floor(p * 36.0))) * aa(36.0);`,
  ICE: `vec2 v = mtVor(uvp * 1.4); float cr = (1.0 - smoothstep(0.0, 0.025, v.y - v.x)) * aa(3.0); mtA = mix(0.94, 1.04, mtFbm(p * 0.8)) * (1.0 + cr * 0.12); mtHgt = -cr; mtRv = cr * 0.3;`,
  CORAL: `vec2 v = mtVor(uvp * 7.0); float pore = (1.0 - smoothstep(0.0, 0.28, v.x)) * aa(7.0); mtA = mix(0.86, 1.05, mtFbm(p * 1.5)) * (1.0 - pore * 0.16); mtHgt = 1.0 - pore * 0.7;`,
  SHELL: `float ring = 0.5 + 0.5 * sin(length(uvp) * 22.0 + mtN3(p * 2.0) * 3.0); ring = mix(0.5, ring, aa(4.0)); mtA = mix(0.9, 1.05, ring) * mix(0.94, 1.03, mtFbm(p * 2.0)); mtHgt = ring * 0.5;`,
  FUR: `float st = mix(0.5, mtN3(vec3(p.x * 20.0, p.y * 5.0, p.z * 20.0)), aa(20.0)); mtA = mix(0.87, 1.08, st) * mix(0.94, 1.04, mtFbm(p * 1.4)); mtHgt = st;`,
  MOTTLE: `float mo = mtFbm(p * 0.8); mtA = mix(0.86, 1.06, mo); mtHgt = mo * 0.6 + mix(0.5, mtN3(p * 12.0), aa(12.0)) * 0.4;`,
};

const f3 = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

function fragFor(kind) {
  const K = MAT_KINDS[kind];
  const tint = K.tint ? `vec3(${K.tint.map(f3).join(',')})` : 'vec3(1.0)';
  return {
    color: /* glsl */`
{ vec3 p = vGrP * ${f3(K.sc)}; vec3 n = normalize(vGrN); vec3 an = abs(n);
  vec2 uvp = (an.x > an.y && an.x > an.z) ? p.zy : ((an.y > an.z) ? p.xz : p.xy);
  mtFw = length(fwidth(p));
  mtAlb = diffuseColor.rgb; mtA = 1.0; mtHgt = 0.5; mtRv = 0.0; mtMet = 0.0; mtSpark = 0.0; mtMetMix = 0.0;
  ${PAT[K.pat] || ''}
  diffuseColor.rgb = mix(diffuseColor.rgb, clamp(mtAlb * mtA * ${tint}, 0.0, 1.0), uMatOn); }`,
    rough: K.rmode === 'max'
      ? `roughnessFactor = mix(roughnessFactor, clamp(max(roughnessFactor, ${f3(K.r)}) + mtRv, 0.04, 1.0), uMatOn);`
      : `roughnessFactor = mix(roughnessFactor, clamp(${f3(K.r)} + mtRv, 0.04, 1.0), uMatOn);`,
    metal: `metalnessFactor = mix(metalnessFactor, clamp(${f3(K.m)} + mtMetMix, 0.0, 1.0), uMatOn);`,
    bump: K.bump ? /* glsl */`
{ vec3 sp = -vViewPosition; vec3 sx = dFdx(sp), sy = dFdy(sp);
  vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1);
  vec2 dh = vec2(dFdx(mtHgt), dFdy(mtHgt)) * ${f3(K.bump * 0.06)} * uMatOn;
  vec3 gv = sign(det) * (dh.x * r1 + dh.y * r2);
  normal = normalize(mix(normal, normalize(abs(det) * normal - gv), step(1e-9, abs(det)))); }` : '',
    spark: K.spark ? `totalEmissiveRadiance += vec3(mtSpark * ${f3(K.spark)} * uMatOn) * 0.6;` : '',
    sheen: K.sheen ? /* glsl */`
{ float rim = pow(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 3.0);
  outgoingLight *= 1.0 + rim * ${f3(K.sheen * 0.55)} * uMatOn; }` : '',
  };
}

function patch(THREE, mat, kind) {
  mat.userData.matKind = kind;
  if (!mat.defaultAttributeValues?.aGrBox) mat.defaultAttributeValues = { ...(mat.defaultAttributeValues || {}), aGrBox: [0.5, 0.5, 0.5], aGrSize: [0, 0, 0] };
  const F = fragFor(kind);
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.uniforms.uMatOn = MATS.on;
    if (!sh.vertexShader.includes('vGrP')) {   // chưa được grunge.js vá → tự thêm cùng tên biến
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_PARS)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_MAIN);
    }
    let fs = sh.fragmentShader;
    fs = fs.replace('#include <common>', '#include <common>\n' + (fs.includes('varying vec3 vGrP') ? '' : FRAG_VARY) + FRAG_LIB);
    fs = fs.replace('#include <map_fragment>', '#include <map_fragment>\n' + F.color)
      // nhám đặt NGAY TRƯỚC metalness (sau mọi chỉnh nhám của grunge.js) → kim loại/men/kính không bị làm nhám lại
      .replace('#include <metalnessmap_fragment>', F.rough + '\n#include <metalnessmap_fragment>\n' + F.metal)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + F.bump)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + F.spark)
      .replace('#include <opaque_fragment>', F.sheen + '\n#include <opaque_fragment>');
    sh.fragmentShader = fs;
  };
  const key = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (key ? key() : '') + '|mat_' + kind;
  mat.needsUpdate = true;
}

export function classifyMaterial(obj, mat, path) {
  const tag = obj.userData.matKind;
  if (tag) return tag === 'none' ? null : tag;
  const s = `${path} [${(mat.name || '').toLowerCase()}]`;
  for (const [re, kind] of MAT_RULES) if (re.test(s)) return kind;
  return 'matte';
}

// Duyệt root, gán + vá chất liệu. Vật liệu dùng chung bởi nhiều chất liệu khác nhau → nhân bản theo chất liệu.
export function applyMaterials(THREE, root, { log = false } = {}) {
  const clones = new Map(), stats = {};
  const walk = (o, path) => {
    const p = o.name ? (path ? path + '/' + o.name.toLowerCase() : o.name.toLowerCase()) : path;
    if (o.isMesh && !o.isInstancedMesh && o.userData.matKind !== 'none') {
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      let changed = false;
      const next = arr.map((m) => {
        if (!m || !m.isMeshStandardMaterial) return m;
        const kind = classifyMaterial(o, m, p);
        if (!kind || (m.transparent && kind !== 'glass')) return m;
        if (m.userData.matKind === kind) return m;
        let target = m;
        if (m.userData.matKind && m.userData.matKind !== kind) {   // đã là chất liệu khác → bản sao riêng
          const ck = m.uuid + '|' + kind;
          if (!clones.has(ck)) {
            const c = m.clone();
            c.onBeforeCompile = m.userData.__baseOBC || (() => {}); c.customProgramCacheKey = m.userData.__baseKey || undefined;
            c.userData = { ...m.userData, matKind: null };
            clones.set(ck, c); patch(THREE, c, kind);
          }
          target = clones.get(ck); changed = true;
        } else {
          m.userData.__baseOBC = m.onBeforeCompile; m.userData.__baseKey = m.customProgramCacheKey;
          patch(THREE, m, kind);
        }
        stats[kind] = (stats[kind] || 0) + 1;
        return target;
      });
      if (changed) o.material = Array.isArray(o.material) ? next : next[0];
      if (o.geometry) ensureBoxAttr(THREE, o.geometry);
    }
    for (const c of o.children) walk(c, p);
  };
  walk(root, '');
  if (log) console.log('[materials]', JSON.stringify(stats));
  return stats;
}
