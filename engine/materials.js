// materials.js — CHẤT LIỆU THẬT cho mọi vật trong phim: giấy ra giấy, gỗ ra gỗ, sắt ra sắt, vải ra vải…
// Vấn đề cũ: hầu hết vật là màu phẳng + độ nhám đều → trông như nhựa bóng, sạch. File này:
//   1. Phân loại từng mesh theo tên (đường dẫn object + tên vật liệu) → 1 trong ~35 "chất liệu" (MAT_KINDS).
//   2. Vá MeshStandardMaterial bằng onBeforeCompile (giữ nguyên ánh sáng/IBL/bóng của three): mỗi chất liệu có
//      - vân riêng sinh bằng toán (thớ gỗ, sợi giấy, sợi dệt, hạt cát, rỗ đá, vảy sơn tróc lộ kim loại, sọc tóc…)
//      - độ nhám/kim loại đúng vật lý (sắt: kim loại 1, nhám 0,35; giấy: nhám 0,95; men sứ: 0,12…) + nhám thay đổi theo vân
//      - gồ ghề (bump) theo vân, tự mờ dần khi vân nhỏ hơn điểm ảnh (không nhiễu lấp lánh)
//      - vải/lông: viền sáng mềm (sheen); tuyết/cát: hạt lấp lánh; xe: vảy nhũ
//   Toạ độ vân = toạ độ cục bộ của vật × tỉ lệ thế giới (stud) → vật đi lại vân đi theo, không trôi. Tất định.
//   3. Shader theo HỌ (MAT_FAMILIES / FAMILIES): mọi loại trong họ dùng chung 1 program (khoá `|mat_<họ>`), khác nhau
//      chỉ qua uniform (material.userData.matU) → Chrome/ANGLE dịch ít program hơn hẳn lúc mở trang (xem docs/core.md).
//
//   import { applyMaterials, MATS } from '/engine/materials.js';
//   applyMaterials(THREE, stage.scene);          // SAU applyGrunge (vá nối tiếp, không ghi đè)
//   MATS.on.value = 0 | 1                         // bật/tắt cả hệ (engine/post.js đặt theo ô "mats")
// Gán tay: object.userData.matKind = 'wood' | 'paper' | … (ưu tiên hơn luật), 'none' = bỏ qua.
// Kiểm kê: node tools/mat-inventory.mjs → output/mat-inventory.json (cột kind).
import { ensureBoxAttr } from './grunge.js';
import { KHONG_GRUNGE } from './mat-khai-bao.js';

export const MATS = { on: { value: 1 }, tex: { value: 1 }, ready: Promise.resolve() };

// KHAI BÁO vật liệu (Task 10): đạo cụ nói thẳng nó là chất liệu gì thay vì để classifyMaterial ĐOÁN từ màu/tên.
//   Theo vật liệu: khaiBaoMat(mat, 'chrome')  (props.js: M(color, { kind: 'chrome' }))  → mat.userData.matDecl + matNguon = 'khai-bao'
//   Theo mesh:     khaiBao(root, [[/tên mesh/, 'wood'], …])  → mesh.userData.matKind + matNguon; trả về mesh CHƯA khai báo
// Ưu tiên: tag trên mesh > khai báo trên vật liệu > luật đoán MAT_RULES (matNguon = 'doan'). Sau applyMaterials,
// engine/measure.js đọc matNguon vào __measure().vatLieu và luật L9 đòi 'khai-bao' cho vật chính.
// Danh sách loại CẤM lớp bụi/cũ (grunge.js bỏ qua): nguồn duy nhất — tools/kiem/mac-dinh.json L9.camGrunge phải khớp (có test).
export { KHONG_GRUNGE };
// Loại đang dùng trong ep001 (kiểm kê tools/mat-inventory.mjs 2026-11-12) = da-duyet; chưa dùng (fruit, whale) = chua-duyet.
// Chỉ để tools/vat-lieu-doc.mjs ghi cột trạng thái.
export const MAT_DA_DUYET = [
  'asphalt', 'bark', 'brick', 'cactus', 'carpaint', 'chrome', 'coconut', 'concrete',
  'coral', 'enamel', 'fabric', 'feather', 'foliage', 'fur', 'glass', 'grassground',
  'hair', 'ice', 'iron', 'knit', 'leather', 'matte', 'metalpaint', 'organic',
  'paper', 'plaster', 'plastic', 'roadpaint', 'rubber', 'sand', 'shell', 'shingle',
  'skin', 'snow', 'soil', 'stone', 'tile', 'wood', 'woodpaint',
];
// Đề xuất đổi loại vật liệu (CHỜ NGƯỜI DÙNG DUYỆT). Khai báo hiện giữ ĐÚNG loại luật đoán cũ → hình ep001 không đổi ngoài việc kim loại/kính mất grunge.
// vat: vật; hienTai: loại đang khai báo; deXuat: loại nên dùng; shot: shot ep001 có vật trong khung (lấy mẫu 3 mốc/shot; số liệu 2026-11-12). tools/vat-lieu-doc.mjs ghi bảng này vào docs/vat-lieu.md.
export const MAT_DE_XUAT = [
  { vat: 'mailbox: post, post_foot, post_arm, post_brace', hienTai: 'metalpaint', deXuat: 'wood', shot: 's028 s030 s047 s048 s081 s082' },
  { vat: 'mailbox: box_rib, door_handle, door_hinge, flag_pin', hienTai: 'metalpaint', deXuat: 'chrome', shot: 's028 s030 s047 s048 s081 s082' },
  { vat: 'mailbox: house_number', hienTai: 'metalpaint', deXuat: 'enamel', shot: 's028 s030 s047 s048 s081 s082' },
  { vat: 'hải đăng GLB: door-mesh', hienTai: 'metalpaint', deXuat: 'wood', shot: 's088 s104 s105 s106 s107 s108 s109 s110 s113 s116 s117 s126 s127 s128' },
  { vat: 'hải đăng props (K.lighthouse, không dùng trong ep001): door / window', hienTai: 'metalpaint', deXuat: 'wood / matte', shot: '' },
  { vat: 'tàu props (K.ship, không dùng trong ep001): hull, hull_stripe / cabin / mast, mast2', hienTai: 'metalpaint / wood / matte', deXuat: 'woodpaint / woodpaint / wood', shot: '' },
  { vat: 'chồng thiếp: bow_loop, bow_tail, bow_knot (nơ)', hienTai: 'paper', deXuat: 'fabric', shot: 's107 s108 s110 s111 s112 s116' },
  { vat: 'nhà: cụm window_front (khung, thanh giữa, bậu, cánh chớp)', hienTai: 'glass', deXuat: 'woodpaint', shot: 's001 s003 s004 s005 s007 s008 s009 s011 s012 s013 s014 s015 s016 s017 s018 s019 s020 s028 s030 s035 s036 s039 s040 s041 s042 s043 s044 s045 s047 s048 s049 s050 s051 s053 s054 s055 s056 s058 s059 s080 s081 s082 s092 s093 s094 s095 s096 s097 s098 s099 s105 s114 s115 s119 s130 s131 s132 s133 s134 s135 s136 s137' },
  { vat: 'nhà: kính cửa sổ bên/sau + kính ô cửa tròn của cửa (đổi sang glass thì các kính này sẽ SÁNG đèn đêm; hiện luôn tối)', hienTai: 'woodpaint', deXuat: 'glass', shot: 's001 s003 s004 s005 s006 s007 s008 s009 s011 s012 s013 s014 s015 s016 s017 s018 s019 s020 s030 s035 s036 s039 s040 s041 s042 s043 s044 s045 s047 s048 s050 s051 s053 s054 s055 s056 s058 s059 s080 s081 s082 s092 s093 s094 s095 s096 s097 s098 s099 s105 s114 s115 s130 s131 s132 s133 s135 s137' },
];
export function khaiBaoMat(mat, kind) {
  if (!kind) return mat;
  if (!mat.userData) mat.userData = {};
  mat.userData.matDecl = kind; mat.userData.matNguon = 'khai-bao';
  return mat;
}
export function khaiBao(root, bang) {
  const chua = [], rieng = new Map();   // vật liệu dùng chung giữa các loại khác nhau → mỗi (vật liệu, loại) một bản sao, nếu không loại này kéo grunge/vân sang loại kia
  root.traverse((o) => {
    if (!o.isMesh) return;
    const hit = bang.find(([re]) => re.test(o.name));
    if (hit) {
      o.userData.matKind = hit[1]; o.userData.matNguon = 'khai-bao';
      if (o.material && !Array.isArray(o.material) && hit[1] !== 'none') {
        const m = o.material, ck = m.uuid + '|' + hit[1];
        if (!rieng.has(ck)) rieng.set(ck, m.clone());
        o.material = rieng.get(ck);
      }
    } else if (!o.userData.matKind && !(o.material && !Array.isArray(o.material) && o.material.userData?.matDecl)) chua.push(o);
  });
  return chua;
}

// ẢNH VÂN CC0 (Poly Haven, assets/polyhaven-tex/<id>/512webp, ghi công assets/CREDITS.md) cho đất/đá/gỗ/ngói/cát/vải.
// Người dùng chốt 2026-11-12 (so 3 cột engine/mat-lab.html). Ảnh chỉ điều biến ĐỘ SÁNG quanh màu gốc của vật (màu phim giữ nguyên)
// + pháp tuyến + độ nhám; vẫn CHUNG 1 program với mọi chất liệu (sampler luôn khai báo, loại không có ảnh gắn ảnh 1×1).
// tile = số stud cho 1 lần lặp ảnh; lum = độ sáng tuyến tính trung bình ảnh diff; rgh = trung bình kênh nhám (arm.g);
// k = độ đậm vân (1 = như ảnh; gỗ sơn 0,45: cột/lan can trắng không thành vỏ cây bẩn — góp ý xem A/B s134).
// Bật/tắt: MATS.tex.value (engine/post.js ô "matTex") — tắt thì về vân toán như cũ. Kim loại gỉ giữ shader (không ảnh).
export const MAT_TEX = {
  wood:      { id: 'brown_planks_03',     tile: 6,   lum: 0.1400, rgh: 0.516, k: 0.8 },
  woodpaint: { id: 'blue_painted_planks', tile: 6,   lum: 0.1358, rgh: 0.526, k: 0.45 },
  shingle:   { id: 'clay_roof_tiles_02',  tile: 5,   lum: 0.1291, rgh: 0.913 },
  stone:     { id: 'gray_rocks',          tile: 8,   lum: 0.1743, rgh: 0.809 },
  soil:      { id: 'farm_soil',           tile: 6,   lum: 0.0587, rgh: 0.973 },
  sand:      { id: 'dense_sand',          tile: 6,   lum: 0.2265, rgh: 0.974 },
  fabric:    { id: 'rough_linen',         tile: 2.5, lum: 0.3978, rgh: 0.660 },   // vải trơn (thay vải kẻ ô fabric_pattern_05)
};
const TEX_URL = (id, m) => `/assets/polyhaven-tex/${id}/512webp/${id}_${m}_512.webp`;
const texCache = new Map();   // id → { d, n, a, ok: {value} }
let texWhite = null;
const texPending = [];
function texSet(THREE, id) {
  if (texCache.has(id)) return texCache.get(id);
  const L = new THREE.TextureLoader();   // DefaultLoadingManager → adapter/bản gộp chờ + nhúng ảnh
  const rec = { ok: { value: 0 } };
  const one = (key, m, srgb) => new Promise((res, rej) => { rec[key] = L.load(TEX_URL(id, m), res, undefined, rej); })
    .then((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true; });
  const p = Promise.all([one('d', 'diff', true), one('n', 'nor_gl', false), one('a', 'arm', false)])
    .then(() => { rec.ok.value = 1; }, (e) => console.warn('[materials] không nạp được ảnh vân', id, e?.message || e));
  texPending.push(p); MATS.ready = Promise.all(texPending);
  texCache.set(id, rec);
  return rec;
}

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
  chrome:      { r: 0.25, m: 0.9, pat: 'SCRATCH', sc: 1.0, bump: 0.15, label: 'Kim loại mạ' },
  metalpaint:  { r: 0.48, m: 0, pat: 'METALPAINT', sc: 1.0, bump: 0.6, label: 'Sắt sơn (tróc, gỉ)' },
  iron:        { r: 0.42, m: 0.85, pat: 'IRON', sc: 1.0, bump: 0.6, label: 'Sắt trần' },
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
  leather:     { r: 0.4, m: 0, pat: 'LEATHER', sc: 1.0, bump: 0.6, sheen: 0.35, label: 'Da thuộc (găng, ủng)' },
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
  [/dadisland.*(right|left)(hand|foot)/, 'leather'],   // găng + ủng da của bố ở đảo (góp ý #35)
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
vec3 txDn; float txOn;
float aa(float f) { return 1.0 - smoothstep(0.3, 0.8, mtFw * f); }   // f chu kỳ/stud → tắt khi < ~1–2 px/chu kỳ
`;

// VÂN theo kiểu. Phần NẶNG (fbm / noise / voronoi / hash) không viết trong từng kiểu mà là các "Ô NOISE" dùng chung,
// tính 1 lần trước nhánh, tham số bằng uniform: sF1 sF2 = mtFbm(p·s + o) · sN1..sN4 = mtN3(nền·s + o) · sV = mtVor(uvp·s)
// · sH = mtH(floor(nền·s) + o). Nền: p | U = vec3(uvp, 0) | W = (dọc thớ, ngang thớ) gỗ | WP = (dọc, y, dọc) gỗ sơn.
// Nhánh của kiểu chỉ còn phép trộn rẻ → shader 1 họ ≈ cỡ 1 kiểu nặng nhất, không phải tổng mọi kiểu (Chrome/ANGLE
// dịch nhanh). Phép tính y hệt bản cũ (cùng đối số, cùng thứ tự) → hình giống hệt.
// Có sẵn trong nhánh: p (stud × sc), n (pháp tuyến cục bộ), uvp (mặt phẳng trội), pW, aa(f) = 1 → 0 khi vân tần số f
// (chu kỳ/stud) nhỏ dần dưới cỡ 1 pixel → xa thì vân mịn tự tắt, không nhiễu hạt/moire.
// Biên độ cố ý NHẸ: chất liệu nhận ra nhờ độ nhám/kim loại + vân lớn; vân mịn chỉ thấy khi cận cảnh.
// Khai báo ô: f: [[s, o?]…] (s, o là số hoặc [x,y,z])  n: [[nền, s, o?]…]  v: s  h: [nền, s, o?]
const PAT = {
  NONE: { code: '' },
  MATTE: { f: [[0.9]], n: [['p', 9]], code: `mtA = mix(0.95, 1.04, sF1); mtHgt = sN1 * aa(9.0);` },
  PLASTIC: { f: [[1.2]], code: `mtA = mix(0.985, 1.01, sF1); mtHgt = 0.5;` },
  WOOD: { n: [['W', [0.12, 0.5, 0.5]], ['W', [0.22, 11, 11]], ['W', [0.5, 1.2, 1.2], 31]], code: `
    vec2 acr = pW.yz; float warp = sN1 * 2.2;
    float ring = fract((acr.x * 0.8 + acr.y * 0.5 + warp) * 2.6);
    float g = smoothstep(0.0, 0.3, ring) * smoothstep(1.0, 0.55, ring) * aa(5.0);
    float streak = mix(0.5, sN2, aa(11.0));
    float knot = smoothstep(0.86, 0.95, sN3);
    mtA = mix(0.8, 1.08, 0.5 * g + 0.5 * streak) * (1.0 - 0.3 * knot);
    mtHgt = 0.55 * g + 0.45 * streak - knot * 0.5; mtRv = (0.5 - streak) * 0.12;` },
  WOODPAINT: { n: [['WP', [0.25, 9, 0.1]]], f: [[1.3]], code: `
    float streak = mix(0.5, sN1, aa(9.0));
    mtA = mix(0.95, 1.03, sF1) * mix(0.97, 1.02, streak); mtHgt = streak; mtRv = (0.5 - streak) * 0.08;` },
  BARK: { n: [['p', [2.6, 0.32, 2.6]], ['p', [1.1, 0.5, 1.1]]], code: `
    float f = 1.0 - abs(sN1 * 2.0 - 1.0); f = f * f * f * aa(2.6);
    float plate = sN2;
    mtA = mix(1.08, 0.6, f) * mix(0.88, 1.06, plate); mtHgt = 1.0 - f;` },
  PAPER: { f: [[1.6]], n: [['p', 30]], code: `
    float mot = sF1, fib = mix(0.5, sN1, aa(30.0));
    mtA = mix(0.985, 1.012, mot) * mix(0.992, 1.006, fib); mtHgt = fib * 0.5 + mot * 0.5;` },
  FABRIC: { n: [['p', 14], ['U', [2, 24, 0], [0, 0, 1]]], code: `
    float wf = 28.0; vec2 w = uvp * wf; float wv = 0.5 + 0.5 * sin(w.x * 6.2832) * sin(w.y * 6.2832);
    float k = aa(wf); wv = mix(0.5, wv, k);
    float fuzz = mix(0.5, sN1, aa(14.0)), slub = sN2;
    mtA = mix(0.965, 1.025, wv * 0.3 + fuzz * 0.7) * mix(0.975, 1.02, slub); mtHgt = wv * 0.6 + fuzz * 0.4;` },
  FUZZ: { n: [['p', 18]], code: `float fz = mix(0.5, sN1, aa(18.0)); mtA = mix(0.94, 1.04, fz); mtHgt = fz;` },
  HAIR: { n: [['p', [30, 1.6, 30]]], code: `float s = sN1; s = mix(0.5, s, aa(30.0)); mtA = mix(0.86, 1.14, s); mtHgt = s; mtRv = (s - 0.5) * 0.2;` },
  SKIN: { f: [[2]], code: `mtA = mix(0.99, 1.008, sF1); mtHgt = 0.5;` },
  FLAKE: { h: ['p', 70], code: `mtSpark = step(0.97, sH) * aa(70.0); mtHgt = 0.5;` },
  SCRATCH: { n: [['U', [60, 1.2, 0], [0, 0, 7]]], f: [[2]], code: `
    mtAlb = max(mtAlb, vec3(0.78));                                      // kim loại mạ phải sáng (màu gốc tối → đen kịt)
    float sc = smoothstep(0.93, 0.99, sN1) * aa(60.0);
    mtA = 1.0 + sc * 0.1; mtRv = sc * 0.2 + (sF1 - 0.5) * 0.12; mtHgt = -sc;` },
  METALPAINT: { f: [[1.1, 7], [0.55, 2]], n: [['p', [2, 0.12, 2]], ['p', 6], ['p', 3], ['p', 16]], code: `
    float chipN = sF1;
    float chip = smoothstep(0.69, 0.72, chipN);
    float rust = smoothstep(0.55, 0.8, sF2) * (0.4 + 0.6 * (1.0 - smoothstep(0.0, 0.6, vGrB.y)));
    float streakR = smoothstep(0.6, 0.85, sN1) * (1.0 - step(0.7, abs(n.y)));
    vec3 metalC = vec3(0.62, 0.63, 0.66), rustC = vec3(0.42, 0.2, 0.08) * (0.75 + 0.4 * sN2);
    mtAlb = mix(mtAlb, metalC, chip);
    mtAlb = mix(mtAlb, rustC, clamp(rust * 0.5 + streakR * 0.3 + chip * rust, 0.0, 0.8));
    mtMetMix = chip * (1.0 - rust) * 0.85; mtA = mix(0.96, 1.03, sN3);
    mtHgt = chip * 0.8 + (smoothstep(0.66, 0.69, chipN) - chip) * 0.5 + rust * mix(0.5, sN4, aa(16.0)) * 0.6; mtRv = rust * 0.4 - chip * 0.12;` },
  IRON: { f: [[0.7, 4]], n: [['p', 4], ['p', 16]], code: `
    mtAlb = max(mtAlb, vec3(0.5));
    float rust = smoothstep(0.5, 0.78, sF1); vec3 rustC = vec3(0.4, 0.19, 0.08);
    mtAlb = mix(mtAlb, rustC, rust * 0.8); mtMetMix = -rust; mtA = mix(0.92, 1.04, sN1); mtHgt = rust * mix(0.5, sN2, aa(16.0)); mtRv = rust * 0.45;` },
  ENAMEL: { f: [[1.5]], n: [['p', 11]], code: `mtA = mix(0.99, 1.008, sF1); mtHgt = mix(0.5, sN1, aa(11.0));` },
  PORES: { v: 30, f: [[2]], code: `vec2 v = sV; float d = mix(0.6, smoothstep(0.0, 0.35, v.x), aa(30.0)); mtA = mix(0.93, 1.0, d) * mix(0.96, 1.03, sF1); mtHgt = d;` },
  FIBER: { n: [['p', [22, 3, 22]]], code: `float fb = mix(0.5, sN1, aa(22.0)); mtA = mix(0.76, 1.1, fb); mtHgt = fb;` },
  SHINGLE: { f: [[2]], code: `
    vec2 q = uvp * vec2(2.2, 3.4); float row = floor(q.y); q.x += mod(row, 2.0) * 0.5;
    vec2 cell = floor(q), f = fract(q); float k = aa(3.4);
    float edge = smoothstep(0.0, 0.07, f.x) * smoothstep(1.0, 0.93, f.x);
    mtA = mix(1.0, mix(0.84, 1.07, mtH2(cell + row * 7.0)) * mix(0.75, 1.0, f.y) * mix(0.82, 1.0, edge), k) * mix(0.95, 1.04, sF1);
    mtHgt = mix(0.5, f.y * edge, k);` },
  BRICK: { f: [[2]], code: `
    vec2 q = uvp * vec2(2.0, 4.0); float row = floor(q.y); q.x += mod(row, 2.0) * 0.5;
    vec2 cell = floor(q), f = fract(q); float k = aa(4.0);
    float mortar = (1.0 - smoothstep(0.0, 0.05, min(min(f.x, 1.0 - f.x) * 0.5, min(f.y, 1.0 - f.y)))) * k;
    mtAlb = mix(mtAlb * mix(1.0, mix(0.82, 1.12, mtH2(cell)), k), vec3(0.62, 0.6, 0.56), mortar);
    mtA = mix(0.93, 1.05, sF1); mtHgt = 1.0 - mortar;` },
  PLASTER: { f: [[0.9], [2]], n: [['p', 8]], code: `mtA = mix(0.95, 1.03, sF1); mtHgt = mix(0.5, sN1, aa(8.0)) * 0.7 + sF2 * 0.3;` },
  CONCRETE: { h: ['U', [40, 40, 0], [0, 0, 1.37]], f: [[0.7]], n: [['p', 16]], code: `
    float pore = step(0.95, sH) * aa(40.0);
    mtA = mix(0.88, 1.05, sF1) * (1.0 - pore * 0.3) * mix(0.97, 1.02, mix(0.5, sN1, aa(16.0)));
    mtHgt = mix(0.5, sN1, aa(16.0)) - pore;` },
  ASPHALT: { h: ['U', [30, 30, 0], [0, 0, 1.37]], v: 0.35, f: [[0.3, 9], [0.5]], n: [['p', 20]], code: `
    float agg = step(0.85, sH) * aa(30.0);
    vec2 v = sV; float crack = (1.0 - smoothstep(0.0, 0.03, v.y - v.x)) * smoothstep(0.6, 0.75, sF1) * aa(2.0);
    mtA = mix(0.84, 1.08, sF2) * (1.0 + agg * 0.35) * (1.0 - crack * 0.45);
    mtHgt = mix(0.5, sN1, aa(20.0)) + agg * 0.5 - crack; mtRv = -agg * 0.08;` },
  STONE: { f: [[0.75]], n: [['p', 7]], v: 1.1, h: ['p', 20], code: `
    float s1 = sF1, s2 = mix(0.5, sN1, aa(7.0)); vec2 v = sV;
    float crack = (1.0 - smoothstep(0.0, 0.05, v.y - v.x)) * aa(3.0);
    float speck = step(0.9, sH) * aa(20.0);
    mtA = mix(0.78, 1.1, s1) * mix(0.92, 1.06, s2) * (1.0 - crack * 0.3) * (1.0 + speck * 0.2);
    mtHgt = s1 * 0.6 + s2 * 0.4 - crack * 0.6; mtRv = (0.5 - s2) * 0.08;` },
  SAND: { n: [['p', 18], ['p', 0.25]], f: [[0.3]], h: ['p', 26], code: `
    float gr = mix(0.5, sN1, aa(18.0)); float rip = 0.5 + 0.5 * sin(p.x * 1.3 + p.z * 0.45 + sN2 * 5.0);
    mtA = mix(0.93, 1.05, gr) * mix(0.96, 1.03, rip) * mix(0.94, 1.04, sF1);
    mtHgt = gr * 0.5 + rip * 0.5; mtSpark = step(0.988, sH) * aa(26.0);` },
  SOIL: { f: [[1.2]], v: 9, h: ['U', [9, 9, 0], [0, 0, 1.37]], code: `
    float cl = sF1; vec2 v = sV; float peb = smoothstep(0.3, 0.18, v.x) * step(0.65, sH) * aa(9.0);
    mtA = mix(0.8, 1.08, cl) * (1.0 + peb * 0.2); mtHgt = cl * 0.6 + peb * 0.6;` },
  GRASS: { n: [['U', [40, 40, 0], [0, 0, 2]], ['U', [12, 12, 0], [0, 0, 5]]], f: [[0.35]], code: `
    float bl = sN1 * sN2; bl = mix(0.3, bl, aa(40.0)); float patchy = sF1;
    mtA = mix(0.82, 1.1, patchy) * mix(0.9, 1.08, bl); mtHgt = bl;` },
  LEAF: { n: [['p', 9]], f: [[1.8]], code: `float vein = mix(0.5, sN1, aa(9.0)); mtA = mix(0.84, 1.1, sF1) * mix(0.95, 1.03, vein); mtHgt = vein;` },
  SNOW: { f: [[1.3]], n: [['p', 10]], h: ['p', 36], code: `float g = sF1; mtA = mix(0.96, 1.02, g); mtHgt = g + mix(0.5, sN1, aa(10.0)) * 0.3; mtSpark = step(0.991, sH) * aa(36.0);` },
  ICE: { v: 1.4, f: [[0.8]], code: `vec2 v = sV; float cr = (1.0 - smoothstep(0.0, 0.025, v.y - v.x)) * aa(3.0); mtA = mix(0.94, 1.04, sF1) * (1.0 + cr * 0.12); mtHgt = -cr; mtRv = cr * 0.3;` },
  CORAL: { v: 7, f: [[1.5]], code: `vec2 v = sV; float pore = (1.0 - smoothstep(0.0, 0.28, v.x)) * aa(7.0); mtA = mix(0.86, 1.05, sF1) * (1.0 - pore * 0.16); mtHgt = 1.0 - pore * 0.7;` },
  SHELL: { n: [['p', 2]], f: [[2]], code: `float ring = 0.5 + 0.5 * sin(length(uvp) * 22.0 + sN1 * 3.0); ring = mix(0.5, ring, aa(4.0)); mtA = mix(0.9, 1.05, ring) * mix(0.94, 1.03, sF1); mtHgt = ring * 0.5;` },
  FUR: { n: [['p', [20, 5, 20]]], f: [[1.4]], code: `float st = mix(0.5, sN1, aa(20.0)); mtA = mix(0.87, 1.08, st) * mix(0.94, 1.04, sF1); mtHgt = st;` },
  MOTTLE: { f: [[0.8]], n: [['p', 12]], code: `float mo = sF1; mtA = mix(0.86, 1.06, mo); mtHgt = mo * 0.6 + mix(0.5, sN1, aa(12.0)) * 0.4;` },
  // DA THUỘC (thêm cuối bảng → id các kiểu cũ không đổi): hạt da (voronoi, viền ô tối) + nếp nhăn (đường noise mảnh) + bóng nhẹ nhờ r thấp
  LEATHER: { v: 34, f: [[1.1, 3]], n: [['p', [2.2, 5.5, 2.2]]], code: `
    vec2 v = sV; float gk = aa(34.0); float gr = mix(0.6, smoothstep(0.0, 0.22, v.y - v.x), gk);
    float cr = (1.0 - smoothstep(0.0, 0.07, abs(sN1 * 2.0 - 1.0))) * aa(2.5);
    mtA = mix(0.8, 1.08, sF1) * mix(0.9, 1.0, gr) * (1.0 - cr * 0.4);
    mtHgt = gr * 0.3 + 0.35 - cr * 0.9; mtRv = cr * 0.18 - (sF1 - 0.5) * 0.12;` },
};

// HỌ chất liệu: mỗi họ = 1 shader (khoá program `|mat_<họ>`); các loại trong họ chỉ khác nhau qua UNIFORM (r, m, tint,
// bump, spark, sheen, rmode, kiểu vân uMtPat, tham số ô noise). Trước: mỗi loại 1 program (38 loại × biến thể three)
// → Chrome/ANGLE dịch ~20 s lúc mở trang. Kiểu vân trong họ chọn bằng `if (uMtPat == i)` (uniform → nhánh đồng nhất).
// Bảng họ → kiểu vân. Sửa chỗ này để chia họ khác (đo bằng tools/shaders.mjs: tổng ms = số program × ms mỗi program).
export const MAT_FAMILIES = { all: Object.keys(PAT) };
const PAT_FAMILY = {}, PAT_ID = {};
for (const [fam, pats] of Object.entries(MAT_FAMILIES)) pats.forEach((pt, i) => { PAT_FAMILY[pt] = fam; PAT_ID[pt] = i; });
export const familyOf = (kind) => PAT_FAMILY[MAT_KINDS[kind].pat];

const BASE = { p: 0, U: 1, W: 2, WP: 3 };
const v3 = (x, d = 0) => (x == null ? [d, d, d] : Array.isArray(x) ? x : [x, x, x]);

// số ô noise mỗi họ cần (= nhiều nhất trong các kiểu của họ) → chỉ sinh đúng chừng đó ô
function slotsOf(fam) {
  const s = { f: 0, n: 0, v: 0, h: 0 };
  for (const pt of MAT_FAMILIES[fam]) {
    const P = PAT[pt];
    s.f = Math.max(s.f, P.f?.length || 0); s.n = Math.max(s.n, P.n?.length || 0);
    s.v = Math.max(s.v, P.v != null ? 1 : 0); s.h = Math.max(s.h, P.h ? 1 : 0);
  }
  return s;
}

// fbm: cận vòng lặp là UNIFORM (luôn 4) → trình dịch không trải 4 bậc ra (FXC/ANGLE trải mọi vòng hằng → shader phình).
// Thứ tự cộng y hệt mtFbm cũ: 0.5·N(p) + 0.27·N(p·2.03+5.1) + 0.15·N(p·4.11+9.7) + 0.08·N(p·8.3+2.3).
// Voronoi giữ bản trải sẵn mtVor (FRAG_LIB): bản vòng-uniform làm vết nứt đá lệch điểm ảnh (~44 dB), bản trải = ~80 dB.
const LOOP = { oct: { value: 4 } };
const FRAG_LOOP = /* glsl */`
uniform int uMtOct;
const float mtOW[4] = float[4](0.5, 0.27, 0.15, 0.08), mtOF[4] = float[4](1.0, 2.03, 4.11, 8.3), mtOO[4] = float[4](0.0, 5.1, 9.7, 2.3);
float mtFbmL(vec3 p) { float s = 0.0; for (int o = 0; o < uMtOct; o++) s += mtOW[o] * mtN3(p * mtOF[o] + mtOO[o]); return s; }`;

function fragFor(fam) {
  const S = slotsOf(fam); const decl = [], body = [];
  const needW = MAT_FAMILIES[fam].some((pt) => (PAT[pt].n || []).some((x) => x[0] === 'W' || x[0] === 'WP'));
  const baseSel = (b) => (needW ? `(${b} == 0 ? p : (${b} == 1 ? vec3(uvp, 0.0) : (${b} == 2 ? pW : pWP)))` : `(${b} == 0 ? p : vec3(uvp, 0.0))`);
  const pick = (arr, n, v) => Array.from({ length: n }, (_, i) => `${i ? 'else ' : ''}if (i == ${i}) ${arr}${i + 1} = ${v};`).join(' ');
  if (S.f) {
    decl.push(`uniform int uMtNF; uniform vec3 uMtFs[${S.f}], uMtFo[${S.f}];`);
    body.push(`for (int i = 0; i < uMtNF; i++) { float v = mtFbmL(p * uMtFs[i] + uMtFo[i]); ${pick('sF', S.f, 'v')} }`);
  }
  if (S.n) {
    decl.push(`uniform int uMtNN; uniform int uMtNb[${S.n}]; uniform vec3 uMtNs[${S.n}], uMtNo[${S.n}];`);
    body.push(`for (int i = 0; i < uMtNN; i++) { int b = uMtNb[i]; float v = mtN3(${baseSel('b')} * uMtNs[i] + uMtNo[i]); ${pick('sN', S.n, 'v')} }`);
  }
  if (S.v) { decl.push('uniform float uMtVs;'); body.push('if (uMtVs > 0.0) sV = mtVor(uvp * uMtVs);'); }
  if (S.h) { decl.push('uniform int uMtHb; uniform vec3 uMtHs, uMtHo;'); body.push(`if (uMtHs.x > 0.0) sH = mtH(floor(${baseSel('uMtHb')} * uMtHs) + uMtHo);`); }
  const vars = [...Array.from({ length: S.f }, (_, i) => `sF${i + 1} = 0.5`), ...Array.from({ length: S.n }, (_, i) => `sN${i + 1} = 0.5`), ...(S.h ? ['sH = 0.0'] : [])];
  // các nhánh ĐỘC LẬP (không else-if lồng nhau: FXC dịch chuỗi else-if sâu chậm gấp đôi); chỉ 1 nhánh khớp uMtPat
  const chain = MAT_FAMILIES[fam].map((pt, i) => (PAT[pt].code ? `if (uMtPat == ${i}) { ${PAT[pt].code} }` : '')).filter(Boolean).join('\n  ');
  const pars = /* glsl */`
uniform int uMtPat; uniform float uMtSc, uMtR, uMtM, uMtRMax, uMtBump, uMtSpark, uMtSheen; uniform vec3 uMtTint;
uniform sampler2D uTxD, uTxN, uTxA; uniform float uTxUse, uTxInv, uTxLum, uTxRgh, uTxK, uMatTex; varying vec3 vTxX, vTxY, vTxZ;
${decl.join('\n')}${FRAG_LOOP}`;
  return {
    pars,
    color: /* glsl */`
{ vec3 p = vGrP * uMtSc; vec3 n = normalize(vGrN); vec3 an = abs(n);
  vec2 uvp = (an.x > an.y && an.x > an.z) ? p.zy : ((an.y > an.z) ? p.xz : p.xy);
  mtFw = length(fwidth(p));
  mtAlb = diffuseColor.rgb; mtA = 1.0; mtHgt = 0.5; mtRv = 0.0; mtMet = 0.0; mtSpark = 0.0; mtMetMix = 0.0;
  ${needW ? `vec3 sz = vGrSz; vec3 pW = (sz.x >= sz.y && sz.x >= sz.z) ? p : ((sz.y >= sz.z) ? p.yxz : p.zxy);
  float alongP = (sz.x >= sz.z) ? p.x : p.z; vec3 pWP = vec3(alongP, p.y, alongP);` : ''}
  ${vars.length ? 'float ' + vars.join(', ') + ';' : ''} ${S.v ? 'vec2 sV = vec2(8.0);' : ''}
  txOn = uTxUse * uMatTex; txDn = vec3(0.0);
  vec3 tq = vGrP * uTxInv, tqx = dFdx(tq), tqy = dFdy(tq);   // đạo hàm NGOÀI nhánh → textureGrad (FXC không trải phẳng 2 nhánh)
  if (txOn < 0.5) {
  ${body.join('\n  ')}
  ${chain}
  } else {   // ảnh vân CC0, triplanar theo toạ độ cục bộ (stud) → vật đi lại vân đi theo
    vec3 tw = pow(an, vec3(4.0)); tw /= (tw.x + tw.y + tw.z);
    #define TXS(S, a, b) textureGrad(S, vec2(tq.a, tq.b), vec2(tqx.a, tqx.b), vec2(tqy.a, tqy.b))
    vec3 tc = TXS(uTxD, z, y).rgb * tw.x + TXS(uTxD, x, z).rgb * tw.y + TXS(uTxD, x, y).rgb * tw.z;
    vec3 ta = TXS(uTxA, z, y).rgb * tw.x + TXS(uTxA, x, z).rgb * tw.y + TXS(uTxA, x, y).rgb * tw.z;
    vec2 nx = TXS(uTxN, z, y).xy * 2.0 - 1.0, ny = TXS(uTxN, x, z).xy * 2.0 - 1.0, nz = TXS(uTxN, x, y).xy * 2.0 - 1.0;
    #undef TXS
    txDn = vec3(0.0, nx.y, nx.x) * tw.x + vec3(ny.x, 0.0, ny.y) * tw.y + vec3(nz.x, nz.y, 0.0) * tw.z;
    mtA = mix(1.0, clamp(dot(tc, vec3(0.2126, 0.7152, 0.0722)) / uTxLum, 0.35, 2.2), uTxK) * mix(1.0, ta.r, 0.6 * uTxK);
    mtRv = (ta.g - uTxRgh) * 0.6 * uTxK; txDn *= uTxK;
  }
  diffuseColor.rgb = mix(diffuseColor.rgb, clamp(mtAlb * mtA * uMtTint, 0.0, 1.0), uMatOn); }`,
    rough: `roughnessFactor = mix(roughnessFactor, clamp((uMtRMax > 0.5 ? max(roughnessFactor, uMtR) : uMtR) + mtRv, 0.04, 1.0), uMatOn);`,
    metal: `metalnessFactor = mix(metalnessFactor, clamp(uMtM + mtMetMix, 0.0, 1.0), uMatOn);`,
    bump: /* glsl */`
if (txOn > 0.5) normal = normalize(mix(normal, normalize(normal + (txDn.x * vTxX + txDn.y * vTxY + txDn.z * vTxZ) * 0.8), uMatOn));
if (uMtBump != 0.0) { vec3 sp = -vViewPosition; vec3 sx = dFdx(sp), sy = dFdy(sp);
  vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1);
  vec2 dh = vec2(dFdx(mtHgt), dFdy(mtHgt)) * uMtBump * uMatOn;
  vec3 gv = sign(det) * (dh.x * r1 + dh.y * r2);
  normal = normalize(mix(normal, normalize(abs(det) * normal - gv), step(1e-9, abs(det)))); }`,
    spark: `if (uMtSpark != 0.0) totalEmissiveRadiance += vec3(mtSpark * uMtSpark * uMatOn) * 0.6;`,
    sheen: /* glsl */`
if (uMtSheen != 0.0) { float rim = pow(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 3.0);
  outgoingLight *= 1.0 + rim * uMtSheen * uMatOn; }`,
  };
}
// tham số (số thuần, chưa phải uniform) của 1 loại — y như hằng số cũ ghi thẳng vào shader
function kindParams(kind) {
  const K = MAT_KINDS[kind], P = PAT[K.pat], S = slotsOf(familyOf(kind));
  const q = {
    uMtPat: PAT_ID[K.pat], uMtSc: K.sc, uMtR: K.r, uMtM: K.m, uMtRMax: K.rmode === 'max' ? 1 : 0,
    uMtBump: K.bump ? K.bump * 0.06 : 0, uMtSpark: K.spark || 0, uMtSheen: K.sheen ? K.sheen * 0.55 : 0,
    uMtTint: K.tint || [1, 1, 1], uMtNF: P.f?.length || 0, uMtNN: P.n?.length || 0,
  };
  if (S.f) { q.uMtFs = Array.from({ length: S.f }, (_, i) => v3(P.f?.[i]?.[0])); q.uMtFo = Array.from({ length: S.f }, (_, i) => v3(P.f?.[i]?.[1])); }
  if (S.n) {
    q.uMtNb = Array.from({ length: S.n }, (_, i) => (P.n?.[i] ? BASE[P.n[i][0]] : 0));
    q.uMtNs = Array.from({ length: S.n }, (_, i) => v3(P.n?.[i]?.[1])); q.uMtNo = Array.from({ length: S.n }, (_, i) => v3(P.n?.[i]?.[2]));
  }
  if (S.v) q.uMtVs = P.v || 0;
  if (S.h) { q.uMtHb = P.h ? BASE[P.h[0]] : 0; q.uMtHs = v3(P.h?.[1]); q.uMtHo = v3(P.h?.[2]); }
  return q;
}

// FAMILIES[họ] = { kinds, pats, glsl, params{loại → tham số} } — MỖI HỌ TỰ ĐỦ (GLSL + bảng tham số), patch() chỉ tra
// từ đây → bước sau tách thành engine/shaders/<họ>.js và mỗi tập chỉ nạp họ nó dùng. glsl dựng lười (lần đầu cần).
export const FAMILIES = {};
for (const [fam, pats] of Object.entries(MAT_FAMILIES)) {
  const kinds = Object.keys(MAT_KINDS).filter((k) => familyOf(k) === fam);
  let glsl = null;
  FAMILIES[fam] = { kinds, pats, params: Object.fromEntries(kinds.map((k) => [k, kindParams(k)])), get glsl() { return glsl || (glsl = fragFor(fam)); } };
}

// tham số → object uniform (mảng 3 số → Vector3; mảng các mảng → mảng Vector3)
function toUniforms(THREE, q) {
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const U = { uMtOct: LOOP.oct };
  for (const [k, v] of Object.entries(q)) U[k] = { value: !Array.isArray(v) ? v : Array.isArray(v[0]) ? v.map(V) : (k === 'uMtNb' ? v.slice() : V(v)) };
  return U;
}

function patch(THREE, mat, kind) {
  mat.userData.matKind = kind;
  if (!mat.defaultAttributeValues?.aGrBox) mat.defaultAttributeValues = { ...(mat.defaultAttributeValues || {}), aGrBox: [0.5, 0.5, 0.5], aGrSize: [0, 0, 0] };
  const fam = familyOf(kind), FAM = FAMILIES[fam];
  const F = FAM.glsl;
  const U = toUniforms(THREE, FAM.params[kind]);
  // giữ uniform trong userData (không liệt kê → không vào JSON/clone); MATS.on dùng chung cho cả hệ
  const T = MAT_TEX[kind];
  if (!texWhite) { texWhite = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); texWhite.needsUpdate = true; }
  const R = T ? texSet(THREE, T.id) : null;
  U.uTxUse = R ? R.ok : { value: 0 };
  U.uTxD = { get value() { return R?.ok.value ? R.d : texWhite; } };
  U.uTxN = { get value() { return R?.ok.value ? R.n : texWhite; } };
  U.uTxA = { get value() { return R?.ok.value ? R.a : texWhite; } };
  U.uTxInv = { value: T ? 1 / T.tile : 1 }; U.uTxLum = { value: T ? T.lum : 1 }; U.uTxRgh = { value: T ? T.rgh : 0.5 }; U.uTxK = { value: T?.k ?? 1 };
  Object.defineProperty(mat.userData, 'matU', { value: U, enumerable: false, configurable: true, writable: true });
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.uniforms.uMatOn = MATS.on; sh.uniforms.uMatTex = MATS.tex;
    Object.assign(sh.uniforms, U);
    if (!sh.vertexShader.includes('vGrP')) {   // chưa được grunge.js vá → tự thêm cùng tên biến
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_PARS)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_MAIN);
    }
    if (!sh.vertexShader.includes('vTxX')) {   // trục cục bộ → không gian nhìn (pháp tuyến ảnh vân)
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTxX, vTxY, vTxZ;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTxX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0)); vTxY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0)); vTxZ = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));');
    }
    let fs = sh.fragmentShader;
    fs = fs.replace('#include <common>', '#include <common>\n' + (fs.includes('varying vec3 vGrP') ? '' : FRAG_VARY) + FRAG_LIB + F.pars);
    fs = fs.replace('#include <map_fragment>', '#include <map_fragment>\n' + F.color)
      // nhám đặt NGAY TRƯỚC metalness (sau mọi chỉnh nhám của grunge.js) → kim loại/men/kính không bị làm nhám lại
      .replace('#include <metalnessmap_fragment>', F.rough + '\n#include <metalnessmap_fragment>\n' + F.metal)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + F.bump)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + F.spark)
      .replace('#include <opaque_fragment>', F.sheen + '\n#include <opaque_fragment>');
    sh.fragmentShader = fs;
  };
  const key = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (key ? key() : '') + '|mat_' + fam;
  mat.needsUpdate = true;
}

export function classifyMaterial(obj, mat, path) {
  const tag = obj.userData.matKind;
  if (tag) return tag === 'none' ? null : tag;
  const decl = mat.userData && mat.userData.matDecl;
  if (decl) return decl === 'none' ? null : decl;
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
        const khaiBaoRoi = !!(o.userData.matKind || m.userData.matDecl);   // mesh hoặc vật liệu đã khai báo (kể cả chỉnh tay cũ)
        if (khaiBaoRoi && !o.userData.matNguon) o.userData.matNguon = 'khai-bao';
        if (!kind || (m.transparent && kind !== 'glass')) return m;
        if (m.userData.matKind === kind) { if (!khaiBaoRoi && m.userData.matNguon !== 'khai-bao') m.userData.matNguon = 'doan'; return m; }
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
        target.userData.matNguon = khaiBaoRoi ? 'khai-bao' : 'doan';
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
