// bake.js — NƯỚNG vân bề mặt (chất liệu) thành texture MỘT lần, thay cho tính noise cho từng điểm ảnh.
//
// Vấn đề: engine/materials.js sinh vân (gỗ, giấy, vải, đá…) bằng noise ngay trong fragment shader, toạ độ thế giới (vGrP):
// 35 kiểu vân → 35 shader khác nhau để dịch, và mỗi điểm ảnh phải tính lại fbm/voronoi mỗi khung.
// bake.js: MỘT shader chung (uniform int uPat) vẽ vân vào texture 1 lần lúc khởi động (MRT: albedo / orm / height,
// pass 2 tính normal), có mipmap + anisotropy. Fragment của vật chỉ còn tra texture (triplanar, `triplanarChunk`).
//
//   import { bakeSurface, triplanarChunk, bindBake, PAT_NAMES } from './bake.js';
//   const B = bakeSurface(THREE, renderer, { pat: 'WOOD', size: 1024, seed: 7, params: { tile: 8, bump: 0.9 } });
//   // B = { albedo, orm, normal, height, size, tile, pat, seed, dispose() } — texture RepeatWrapping, mipmap, anisotropy
//
// KÊNH (quy ước riêng, KHÔNG phải ORM chuẩn glTF):
//   albedo.rgb = A  phần màu TUYỆT ĐỐI của vân (mã hoá gamma 1/2.2: sạn gạch vữa, vảy gỉ, kim loại lộ) đã nhân độ sáng vân
//   albedo.a   = B/1.5  hệ số nhân MÀU GỐC của vật (độ sáng vân; nơi gỉ/vữa phủ thì B giảm)
//   → màu cuối = clamp((A + B · max(màuGốc, floorB)) · tint, 0, 1)
//   orm.r = spark (lấp lánh cát/tuyết/nhũ xe) · orm.g = 0,5 + Δnhám/2 · orm.b = 0,5 + Δkim-loại/2 · orm.a = floorB
//          (floorB: sàn độ sáng màu gốc — "kim loại mạ" 0,78, "sắt trần" 0,5; các kiểu khác 0)
//   normal.rgb = pháp tuyến tiếp tuyến (z lên) · normal.a = độ cao 8-bit (cho parallax/AO sau này)
//   height.rg = độ cao 16-bit đóng gói (r = phần nguyên /255, g = phần lẻ), giá trị thật = (r·255 + g)/255 · 2,5 − 1. Không mipmap, NEAREST.
// Công thức vân chép từ PAT của engine/materials.js (không import, để không phụ thuộc file đang sửa) và chuyển sang
// toạ độ phẳng 2D TUẦN HOÀN: mọi noise/voronoi/băm cell "gói" theo chu kỳ nguyên → lặp texture không thấy đường nối.
// Để chu kỳ nguyên, tần số (chu kỳ/stud) được làm tròn về bội của 1/tile (hàm sn()); bậc fbm 2,03/4,11/8,3 → 2/4/8.
// Hình vì thế KHÁC NHẸ bản trực tiếp của materials.js (xem docs/core.md mục "bake").
// Tất định: seed → dịch lưới băm (số nguyên); không Math.random, không giờ thực.

export const PAT_NAMES = ['NONE', 'MATTE', 'PLASTIC', 'WOOD', 'WOODPAINT', 'BARK', 'PAPER', 'FABRIC', 'FUZZ', 'HAIR', 'SKIN', 'FLAKE', 'SCRATCH',
  'METALPAINT', 'IRON', 'ENAMEL', 'PORES', 'FIBER', 'SHINGLE', 'BRICK', 'PLASTER', 'CONCRETE', 'ASPHALT', 'STONE', 'SAND', 'SOIL', 'GRASS',
  'LEAF', 'SNOW', 'ICE', 'CORAL', 'SHELL', 'FUR', 'MOTTLE'];

// Cạnh ô lặp (stud) mặc định: vân mịn cần ô nhỏ để không vượt độ phân giải; vân thưa (nứt nhựa đường) cần ô lớn để đỡ lặp.
export const PAT_TILE = { FABRIC: 4, FLAKE: 4, HAIR: 4, SCRATCH: 4, ASPHALT: 16 };
const DEFAULT_TILE = 8;

// ---- GLSL: thư viện noise tuần hoàn + vân ----
export const BAKE_LIB = /* glsl */`
uniform float uL;        // cạnh ô lặp (stud) — số CHẴN để gạch/ngói xếp so le lặp đúng
uniform vec3 uSeed;      // dịch lưới băm theo seed (số nguyên)
uniform float uBump;     // độ gồ (cùng ý nghĩa K.bump của materials.js)
float gFoot;             // bề rộng 1 điểm ảnh/texel tính bằng stud → tắt vân mịn dưới cỡ điểm ảnh
float AA(float f) { return 1.0 - smoothstep(0.25, 0.6, gFoot * f); }
float sn(float f)  { return max(floor(f * uL + 0.5), 1.0) / uL; }                    // tần số về bội 1/tile
float snE(float f) { return max(floor(f * uL * 0.5 + 0.5), 1.0) * 2.0 / uL; }        // số hàng chẵn
float bkH(vec3 q) { q = fract(q * 0.3183099 + vec3(0.71, 0.113, 0.419)); q *= 17.0; return fract(q.x * q.y * q.z * (q.x + q.y + q.z)); }
float bkHi(vec3 c) { return bkH(c + uSeed); }
float bkHw(vec3 i, vec3 N) { return bkHi(mod(i, N)); }
float nzc(vec3 p, vec3 K, vec3 o) {                      // value noise 2D (lát cắt z hằng), chu kỳ N = round(K·tile) ô theo từng trục
  vec3 N = max(floor(K * uL + 0.5), 1.0);
  vec3 x = p * (N / uL) + o; vec3 i = floor(x); vec2 f = fract(x.xy); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(bkHw(i, N), bkHw(i + vec3(1,0,0), N), f.x), mix(bkHw(i + vec3(0,1,0), N), bkHw(i + vec3(1,1,0), N), f.x), f.y);
}
float nz(vec3 p, float K) { return nzc(p, vec3(K), vec3(0.0)); }
float nz(vec3 p, vec3 K) { return nzc(p, K, vec3(0.0)); }
float nz(vec3 p, vec3 K, float o) { return nzc(p, K, vec3(o)); }
float fb(vec3 p, float K, float o) {
  return 0.5 * nzc(p, vec3(K), vec3(o)) + 0.27 * nzc(p, vec3(K * 2.0), vec3(o + 5.1)) + 0.15 * nzc(p, vec3(K * 4.0), vec3(o + 9.7)) + 0.08 * nzc(p, vec3(K * 8.0), vec3(o + 2.3));
}
float fb(vec3 p, float K) { return fb(p, K, 0.0); }
float hc(vec3 p, float K) { float n = max(floor(K * uL + 0.5), 1.0); return bkHw(floor(p * (n / uL)), vec3(n)); }
float hc2(vec2 q, float K) { float n = max(floor(K * uL + 0.5), 1.0); return bkHi(vec3(mod(floor(q * (n / uL)), n), 4.0)); }
vec2 vor(vec2 u, float K) {                               // voronoi tuần hoàn, trả khoảng cách theo đơn vị ô
  float N = max(floor(K * uL + 0.5), 1.0); vec2 q = u * (N / uL); vec2 i = floor(q), f = fract(q); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)); vec2 c = mod(i + g, N);
    vec2 o = vec2(bkHi(vec3(c, 2.0)), bkHi(vec3(c + vec2(17.0, 5.0), 3.0)));
    float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(d1, d2);
}
// đầu ra của vân (biến toàn cục, như materials.js)
vec3 mtAc; float mtBw, mtA, mtHgt, mtRv, mtMetMix, mtSpark, mtFloor;
void absMix(vec3 X, float w) { mtAc = mix(mtAc, X, w); mtBw *= 1.0 - w; }   // mtAlb = mix(mtAlb, X, w) khi mtAlb = mtAc + mtBw·màuGốc
`;

// Chép từ PAT (engine/materials.js) → 2D tuần hoàn. Có sẵn: p (stud, 0..tile; z = 0,37 hằng), uvp = p.xy, n = (0,0,1).
// Ghi chú khác biệt: WOOD/WOODPAINT dọc thớ = trục x; METALPAINT gỉ ở "độ cao 0,5" cố định; SHELL vòng đồng tâm → sọc chéo; cát dùng (x,y).
const PAT_GLSL = {
  NONE: '',
  MATTE: `mtA = mix(0.95, 1.04, fb(p, 0.9)); mtHgt = nz(p, 9.0) * AA(9.0);`,
  PLASTIC: `mtA = mix(0.985, 1.01, fb(p, 1.2)); mtHgt = 0.5;`,
  WOOD: `
    float along = p.x; vec2 acr = p.yz;
    float warp = nz(vec3(along, acr), vec3(0.12, 0.5, 0.5)) * 2.2;
    float ring = fract(acr.x * sn(2.08) + acr.y * sn(1.3) + warp * 2.6);
    float g = smoothstep(0.0, 0.3, ring) * smoothstep(1.0, 0.55, ring) * AA(5.0);
    float streak = mix(0.5, nz(vec3(along, acr), vec3(0.22, 11.0, 11.0)), AA(11.0));
    float knot = smoothstep(0.86, 0.95, nz(vec3(along, acr), vec3(0.5, 1.2, 1.2), 31.0));
    mtA = mix(0.8, 1.08, 0.5 * g + 0.5 * streak) * (1.0 - 0.3 * knot);
    mtHgt = 0.55 * g + 0.45 * streak - knot * 0.5; mtRv = (0.5 - streak) * 0.12;`,
  WOODPAINT: `
    float along = p.x;
    float streak = mix(0.5, nz(vec3(along, p.y, along), vec3(0.25, 9.0, 0.1)), AA(9.0));
    mtA = mix(0.95, 1.03, fb(p, 1.3)) * mix(0.97, 1.02, streak); mtHgt = streak; mtRv = (0.5 - streak) * 0.08;`,
  BARK: `
    float f = 1.0 - abs(nz(p, vec3(2.6, 0.32, 2.6)) * 2.0 - 1.0); f = f * f * f * AA(2.6);
    float plate = nz(p, vec3(1.1, 0.5, 1.1));
    mtA = mix(1.08, 0.6, f) * mix(0.88, 1.06, plate); mtHgt = 1.0 - f;`,
  PAPER: `
    float mot = fb(p, 1.6), fib = mix(0.5, nz(p, 30.0), AA(30.0));
    mtA = mix(0.985, 1.012, mot) * mix(0.992, 1.006, fib); mtHgt = fib * 0.5 + mot * 0.5;`,
  FABRIC: `
    float wf = sn(28.0); vec2 w = uvp * wf; float wv = 0.5 + 0.5 * sin(w.x * 6.2832) * sin(w.y * 6.2832);
    float k = AA(28.0); wv = mix(0.5, wv, k);
    float fuzz = mix(0.5, nz(p, 14.0), AA(14.0)), slub = nz(vec3(uvp, 1.0), vec3(2.0, 24.0, 0.1));
    mtA = mix(0.965, 1.025, wv * 0.3 + fuzz * 0.7) * mix(0.975, 1.02, slub); mtHgt = wv * 0.6 + fuzz * 0.4;`,
  FUZZ: `float fz = mix(0.5, nz(p, 18.0), AA(18.0)); mtA = mix(0.94, 1.04, fz); mtHgt = fz;`,
  HAIR: `float s = nz(p, vec3(30.0, 1.6, 30.0)); s = mix(0.5, s, AA(30.0)); mtA = mix(0.86, 1.14, s); mtHgt = s; mtRv = (s - 0.5) * 0.2;`,
  SKIN: `mtA = mix(0.99, 1.008, fb(p, 2.0)); mtHgt = 0.5;`,
  FLAKE: `mtSpark = step(0.97, hc(p, 70.0)) * AA(70.0); mtHgt = 0.5;`,
  SCRATCH: `
    mtFloor = 0.78;
    float sc = smoothstep(0.93, 0.99, nz(vec3(uvp, 7.0), vec3(60.0, 1.2, 0.1))) * AA(60.0);
    mtA = 1.0 + sc * 0.1; mtRv = sc * 0.2 + (fb(p, 2.0) - 0.5) * 0.12; mtHgt = -sc;`,
  METALPAINT: `
    float chipN = fb(p, 1.1, 7.0);
    float chip = smoothstep(0.69, 0.72, chipN);
    float rust = smoothstep(0.55, 0.8, fb(p, 0.55, 2.0)) * 0.444;
    float streakR = smoothstep(0.6, 0.85, nz(p, vec3(2.0, 0.12, 2.0)));
    vec3 metalC = vec3(0.62, 0.63, 0.66), rustC = vec3(0.42, 0.2, 0.08) * (0.75 + 0.4 * nz(p, 6.0));
    absMix(metalC, chip);
    absMix(rustC, clamp(rust * 0.5 + streakR * 0.3 + chip * rust, 0.0, 0.8));
    mtMetMix = chip * (1.0 - rust) * 0.85; mtA = mix(0.96, 1.03, nz(p, 3.0));
    mtHgt = chip * 0.8 + (smoothstep(0.66, 0.69, chipN) - chip) * 0.5 + rust * mix(0.5, nz(p, 16.0), AA(16.0)) * 0.6; mtRv = rust * 0.4 - chip * 0.12;`,
  IRON: `
    mtFloor = 0.5;
    float rust = smoothstep(0.5, 0.78, fb(p, 0.7, 4.0)); vec3 rustC = vec3(0.4, 0.19, 0.08);
    absMix(rustC, rust * 0.8); mtMetMix = -rust; mtA = mix(0.92, 1.04, nz(p, 4.0)); mtHgt = rust * mix(0.5, nz(p, 16.0), AA(16.0)); mtRv = rust * 0.45;`,
  ENAMEL: `mtA = mix(0.99, 1.008, fb(p, 1.5)); mtHgt = mix(0.5, nz(p, 11.0), AA(11.0));`,
  PORES: `vec2 v = vor(uvp, 30.0); float d = mix(0.6, smoothstep(0.0, 0.35, v.x), AA(30.0)); mtA = mix(0.93, 1.0, d) * mix(0.96, 1.03, fb(p, 2.0)); mtHgt = d;`,
  FIBER: `float fb2 = mix(0.5, nz(p, vec3(22.0, 3.0, 22.0)), AA(22.0)); mtA = mix(0.76, 1.1, fb2); mtHgt = fb2;`,
  SHINGLE: `
    float fx = sn(2.2), fy = snE(3.4); float nx = floor(fx * uL + 0.5), ny = floor(fy * uL + 0.5);
    vec2 q = uvp * vec2(fx, fy); float row = floor(q.y); q.x += mod(row, 2.0) * 0.5;
    vec2 cell = floor(q), f = fract(q); float k = AA(3.4);
    float edge = smoothstep(0.0, 0.07, f.x) * smoothstep(1.0, 0.93, f.x);
    float hs = bkHi(vec3(mod(cell, vec2(nx, ny)) + mod(row, ny) * 7.0, 5.0));
    mtA = mix(1.0, mix(0.84, 1.07, hs) * mix(0.75, 1.0, f.y) * mix(0.82, 1.0, edge), k) * mix(0.95, 1.04, fb(p, 2.0));
    mtHgt = mix(0.5, f.y * edge, k);`,
  BRICK: `
    float fx = sn(2.0), fy = sn(4.0); float nx = floor(fx * uL + 0.5), ny = floor(fy * uL + 0.5);
    vec2 q = uvp * vec2(fx, fy); float row = floor(q.y); q.x += mod(row, 2.0) * 0.5;
    vec2 cell = floor(q), f = fract(q); float k = AA(4.0);
    float mortar = (1.0 - smoothstep(0.0, 0.05, min(min(f.x, 1.0 - f.x) * 0.5, min(f.y, 1.0 - f.y)))) * k;
    float hs = bkHi(vec3(mod(cell, vec2(nx, ny)), 6.0));
    mtBw = mix(1.0, mix(0.82, 1.12, hs), k); absMix(vec3(0.62, 0.6, 0.56), mortar);
    mtA = mix(0.93, 1.05, fb(p, 2.0)); mtHgt = 1.0 - mortar;`,
  PLASTER: `mtA = mix(0.95, 1.03, fb(p, 0.9)); mtHgt = mix(0.5, nz(p, 8.0), AA(8.0)) * 0.7 + fb(p, 2.0) * 0.3;`,
  CONCRETE: `
    float pore = step(0.95, hc2(uvp, 40.0)) * AA(40.0);
    float c16 = mix(0.5, nz(p, 16.0), AA(16.0));
    mtA = mix(0.88, 1.05, fb(p, 0.7)) * (1.0 - pore * 0.3) * mix(0.97, 1.02, c16);
    mtHgt = c16 - pore;`,
  ASPHALT: `
    float agg = step(0.85, hc2(uvp, 30.0)) * AA(30.0);
    vec2 v = vor(uvp, 0.35); float crack = (1.0 - smoothstep(0.0, 0.03, v.y - v.x)) * smoothstep(0.6, 0.75, fb(p, 0.3, 9.0)) * AA(2.0);
    mtA = mix(0.84, 1.08, fb(p, 0.5)) * (1.0 + agg * 0.35) * (1.0 - crack * 0.45);
    mtHgt = mix(0.5, nz(p, 20.0), AA(20.0)) + agg * 0.5 - crack; mtRv = -agg * 0.08;`,
  STONE: `
    float s1 = fb(p, 0.75), s2 = mix(0.5, nz(p, 7.0), AA(7.0)); vec2 v = vor(uvp, 1.1);
    float crack = (1.0 - smoothstep(0.0, 0.05, v.y - v.x)) * AA(3.0);
    float speck = step(0.9, hc(p, 20.0)) * AA(20.0);
    mtA = mix(0.78, 1.1, s1) * mix(0.92, 1.06, s2) * (1.0 - crack * 0.3) * (1.0 + speck * 0.2);
    mtHgt = s1 * 0.6 + s2 * 0.4 - crack * 0.6; mtRv = (0.5 - s2) * 0.08;`,
  SAND: `
    float gr = mix(0.5, nz(p, 18.0), AA(18.0));
    float rip = 0.5 + 0.5 * sin(6.2832 * (p.x * sn(0.21) + p.y * sn(0.07)) + nz(p, 0.25) * 5.0);
    mtA = mix(0.93, 1.05, gr) * mix(0.96, 1.03, rip) * mix(0.94, 1.04, fb(p, 0.3));
    mtHgt = gr * 0.5 + rip * 0.5; mtSpark = step(0.988, hc(p, 26.0)) * AA(26.0);`,
  SOIL: `
    float cl = fb(p, 1.2); vec2 v = vor(uvp, 9.0); float peb = smoothstep(0.3, 0.18, v.x) * step(0.65, hc2(uvp, 9.0)) * AA(9.0);
    mtA = mix(0.8, 1.08, cl) * (1.0 + peb * 0.2); mtHgt = cl * 0.6 + peb * 0.6;`,
  GRASS: `
    float bl = nz(vec3(uvp, 2.0), vec3(40.0, 40.0, 0.1)) * nz(vec3(uvp, 5.0), vec3(12.0, 12.0, 0.1)); bl = mix(0.3, bl, AA(40.0)); float patchy = fb(p, 0.35);
    mtA = mix(0.82, 1.1, patchy) * mix(0.9, 1.08, bl); mtHgt = bl;`,
  LEAF: `float vein = mix(0.5, nz(p, 9.0), AA(9.0)); mtA = mix(0.84, 1.1, fb(p, 1.8)) * mix(0.95, 1.03, vein); mtHgt = vein;`,
  SNOW: `float g = fb(p, 1.3); mtA = mix(0.96, 1.02, g); mtHgt = g + mix(0.5, nz(p, 10.0), AA(10.0)) * 0.3; mtSpark = step(0.991, hc(p, 36.0)) * AA(36.0);`,
  ICE: `vec2 v = vor(uvp, 1.4); float cr = (1.0 - smoothstep(0.0, 0.025, v.y - v.x)) * AA(3.0); mtA = mix(0.94, 1.04, fb(p, 0.8)) * (1.0 + cr * 0.12); mtHgt = -cr; mtRv = cr * 0.3;`,
  CORAL: `vec2 v = vor(uvp, 7.0); float pore = (1.0 - smoothstep(0.0, 0.28, v.x)) * AA(7.0); mtA = mix(0.86, 1.05, fb(p, 1.5)) * (1.0 - pore * 0.16); mtHgt = 1.0 - pore * 0.7;`,
  SHELL: `
    float ring = 0.5 + 0.5 * sin(6.2832 * (uvp.x * sn(3.5) + uvp.y * sn(1.5)) + nz(p, 2.0) * 3.0); ring = mix(0.5, ring, AA(4.0));
    mtA = mix(0.9, 1.05, ring) * mix(0.94, 1.03, fb(p, 2.0)); mtHgt = ring * 0.5;`,
  FUR: `float st = mix(0.5, nz(p, vec3(20.0, 5.0, 20.0)), AA(20.0)); mtA = mix(0.87, 1.08, st) * mix(0.94, 1.04, fb(p, 1.4)); mtHgt = st;`,
  MOTTLE: `float mo = fb(p, 0.8); mtA = mix(0.86, 1.06, mo); mtHgt = mo * 0.6 + mix(0.5, nz(p, 12.0), AA(12.0)) * 0.4;`,
};

// only = danh sách tên vân (trang thử dùng để dịch shader nhỏ cho từng kiểu); mặc định cả 34 kiểu (shader nướng chung).
export function makeEval(only = null) {
  const want = only ? new Set(only.map((x) => PAT_NAMES.indexOf(x))) : null;
  return BAKE_LIB + `
void bkEval(int id, vec2 uv) {
  vec3 p = vec3(uv * uL, 0.37); vec2 uvp = p.xy; vec3 n = vec3(0.0, 0.0, 1.0);
  mtAc = vec3(0.0); mtBw = 1.0; mtA = 1.0; mtHgt = 0.5; mtRv = 0.0; mtMetMix = 0.0; mtSpark = 0.0; mtFloor = 0.0;
${PAT_NAMES.map((k, i) => (want && !want.has(i) ? '' : '  if (id == ' + i + ') {\n' + (PAT_GLSL[k] || '') + '\n  }')).join('\n')}
}
`;
}
export const BAKE_EVAL = makeEval();

// Đóng gói đầu ra vân → 3 target (albedo / orm / height16)
const PACK_GLSL = /* glsl */`
vec4 packAlb() { vec3 A = clamp(mtAc * mtA, 0.0, 1.0); return vec4(pow(A, vec3(1.0 / 2.2)), clamp(mtBw * mtA / 1.5, 0.0, 1.0)); }
vec4 packOrm() { return vec4(mtSpark, clamp(mtRv * 0.5 + 0.5, 0.0, 1.0), clamp(mtMetMix * 0.5 + 0.5, 0.0, 1.0), mtFloor); }
vec4 packHgt() { float hn = clamp((mtHgt + 1.0) / 2.5, 0.0, 1.0); float hs = hn * 255.0; float hi = floor(hs); return vec4(hi / 255.0, hs - hi, 0.0, 1.0); }
`;

// Shader tô sáng dùng cho trang thử (không phải cho engine): cùng công thức giải mã mà material sẽ dùng.
export const BAKE_SHADE = /* glsl */`
vec3 bkShade(vec3 A, float B, float flo, float spark, float dR, float dM, vec3 nT, vec3 base, float r0, float m0, vec3 tint, float sparkK) {
  vec3 b = max(base, vec3(flo)); vec3 alb = clamp((A + B * b) * tint, 0.0, 1.0);
  float rough = clamp(r0 + dR, 0.04, 1.0), met = clamp(m0 + dM, 0.0, 1.0);
  vec3 L = normalize(vec3(0.45, 0.55, 0.7)), H = normalize(L + vec3(0.0, 0.0, 1.0));
  float nl = max(dot(nT, L), 0.0), nh = max(dot(nT, H), 0.0);
  float a2 = max(rough * rough * rough * rough, 1.0e-3);
  float spec = pow(nh, min(2.0 / a2 - 2.0, 300.0)) * (1.0 - rough) * 0.6;
  vec3 c = alb * (1.0 - met) * (0.32 + 0.8 * nl) + mix(vec3(0.04), alb, met) * (spec + met * 0.3 * (0.5 + 0.5 * nT.z)) + vec3(spark * sparkK) * 0.3;
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}
`;

const VERT = /* glsl */`varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const fragBake = (only) => /* glsl */`
${only ? makeEval(only) : BAKE_EVAL}
${PACK_GLSL}
uniform int uPat; uniform float uTexel;
varying vec2 vUv;
layout(location = 0) out vec4 gAlb; layout(location = 1) out vec4 gOrm; layout(location = 2) out vec4 gHgt;
void main() { gFoot = uTexel; bkEval(uPat, vUv); gAlb = packAlb(); gOrm = packOrm(); gHgt = packHgt(); }`;
const FRAG_NRM = /* glsl */`
uniform sampler2D tH; uniform float uSize; uniform float uK;   // uK = bump · 0,06 · size / (2 · tile)
varying vec2 vUv;
layout(location = 0) out vec4 gNrm;
float hAt(vec2 c) { vec4 t = texelFetch(tH, ivec2(mod(c, uSize)), 0); return (t.r * 255.0 + t.g) / 255.0 * 2.5 - 1.0; }
void main() {
  vec2 c = floor(vUv * uSize);
  float hx = hAt(c + vec2(1.0, 0.0)) - hAt(c - vec2(1.0, 0.0)), hy = hAt(c + vec2(0.0, 1.0)) - hAt(c - vec2(0.0, 1.0));
  vec3 n = normalize(vec3(-hx * uK, -hy * uK, 1.0));
  vec4 t = texelFetch(tH, ivec2(c), 0);
  gNrm = vec4(n * 0.5 + 0.5, (t.r * 255.0 + t.g) / 255.0);
}`;

// seed → dịch lưới băm (mulberry32, số nguyên 0..63)
export function seedOffset(seed) {
  let a = (seed | 0) + 0x6d2b79f5;
  const r = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return [Math.floor(r() * 64), Math.floor(r() * 64), Math.floor(r() * 64)];
}

const CTX = new WeakMap();
const shaderSet = (params, name) => (params.shared ? null : (params.only || [name]));
function ctxFor(THREE, renderer, only) {
  const key = only ? only.join(',') : '*';
  let cm = CTX.get(renderer); if (!cm) CTX.set(renderer, cm = new Map());
  let c = cm.get(key);
  if (c) return c;
  const geo = new THREE.PlaneGeometry(2, 2);
  const bakeMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: fragBake(only), depthTest: false, depthWrite: false,
    uniforms: { uPat: { value: 0 }, uTexel: { value: 0.01 }, uL: { value: 8 }, uSeed: { value: new THREE.Vector3() }, uBump: { value: 1 } },
  });
  const nrmMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG_NRM, depthTest: false, depthWrite: false,
    uniforms: { tH: { value: null }, uSize: { value: 512 }, uK: { value: 1 } },
  });
  const mesh = new THREE.Mesh(geo, bakeMat); mesh.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(mesh);
  c = { geo, bakeMat, nrmMat, mesh, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  cm.set(key, c);
  return c;
}

/**
 * Nướng 1 bộ vân. pat: tên trong PAT_NAMES (hoặc chỉ số). size: cạnh texture (cap 1024). seed: số nguyên.
 * params: { tile (stud, chẵn), bump, aniso, shared, only }
 *  - mặc định mỗi kiểu vân dùng shader RIÊNG chỉ chứa kiểu đó (dịch ~0,15–0,4 s/kiểu trên máy thử; chương trình tạo lười, 1 cái/kiểu dùng tới).
 *  - shared: true → MỘT shader chung cho cả 34 kiểu (uniform int uPat): chỉ 1 chương trình nhưng dịch ~15 s (xem docs/core.md "bake");
 *    nên gọi bakeSurfaceAsync (dịch song song, không đứng hình).
 *  - only: ['WOOD','PAPER',…] → shader chung của nhóm đó (nhóm 4–8 kiểu: 2–5 s).
 */
export function bakeSurface(THREE, renderer, { pat = 'WOOD', size = 512, seed = 1, params = {} } = {}) {
  const id = typeof pat === 'number' ? pat : PAT_NAMES.indexOf(String(pat).toUpperCase());
  if (id < 0) throw new Error('bakeSurface: kiểu vân không có: ' + pat);
  const name = PAT_NAMES[id];
  size = Math.max(16, Math.min(1024, size | 0));
  let tile = params.tile ?? PAT_TILE[name] ?? DEFAULT_TILE; tile = Math.max(2, Math.round(tile / 2) * 2);   // chẵn
  const bump = params.bump ?? 1;
  const maxA = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
  const aniso = Math.min(params.aniso ?? 8, maxA);
  const c = ctxFor(THREE, renderer, shaderSet(params, name));

  const rt = new THREE.WebGLRenderTarget(size, size, {
    count: 3, depthBuffer: false, type: THREE.UnsignedByteType, format: THREE.RGBAFormat,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true,
    wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
  });
  const [tA, tO, tH] = rt.textures;
  tA.name = `bake_${name}_albedo`; tO.name = `bake_${name}_orm`; tH.name = `bake_${name}_height`;
  tH.minFilter = THREE.NearestFilter; tH.magFilter = THREE.NearestFilter; tH.generateMipmaps = false;
  for (const t of [tA, tO]) t.anisotropy = aniso;
  const rtN = new THREE.WebGLRenderTarget(size, size, {
    depthBuffer: false, type: THREE.UnsignedByteType, format: THREE.RGBAFormat,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true,
    wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
  });
  rtN.texture.name = `bake_${name}_normal`; rtN.texture.anisotropy = aniso;

  const prevRT = renderer.getRenderTarget(), prevAuto = renderer.autoClear;
  renderer.autoClear = true;
  // pass 1: albedo / orm / height
  const u = c.bakeMat.uniforms;
  u.uPat.value = id; u.uL.value = tile; u.uTexel.value = tile / size; u.uBump.value = bump; u.uSeed.value.set(...seedOffset(seed));
  c.mesh.material = c.bakeMat;
  renderer.setRenderTarget(rt); renderer.render(c.scene, c.cam);
  // pass 2: normal từ height (sai phân trung tâm, gói vòng quanh)
  const n = c.nrmMat.uniforms;
  n.tH.value = tH; n.uSize.value = size; n.uK.value = bump * 0.06 * size / (2 * tile);
  c.mesh.material = c.nrmMat;
  renderer.setRenderTarget(rtN); renderer.render(c.scene, c.cam);
  renderer.setRenderTarget(prevRT); renderer.autoClear = prevAuto;
  n.tH.value = null;

  const out = {
    pat: name, size, tile, seed, bump, albedo: tA, orm: tO, normal: rtN.texture, height: tH,
    dispose() { rt.dispose(); rtN.dispose(); },
  };
  return out;
}

/** Uniform cho chunk triplanar: { bkAlb, bkOrm, bkNrm, bkInvTile }. scale = sc của chất liệu (số vân / stud nhân thêm). */
export function bindBake(uniforms, bake, { scale = 1, prefix = 'bk' } = {}) {
  const P = prefix;
  uniforms[P + 'Alb'] = { value: bake.albedo }; uniforms[P + 'Orm'] = { value: bake.orm }; uniforms[P + 'Nrm'] = { value: bake.normal };
  uniforms[P + 'InvTile'] = { value: scale / bake.tile };
  return uniforms;
}

/**
 * GLSL tra texture nướng theo vGrP/vGrN (triplanar), dán vào fragment của vật (sau #include <common>):
 *   BkOut o = bkTri(vGrP, normalize(vGrN), vGrSz);
 *   diffuseColor.rgb = clamp((o.A + o.B * max(diffuseColor.rgb, vec3(o.floorB))) * tint, 0.0, 1.0);
 *   roughnessFactor = clamp(R + o.dRough, 0.04, 1.0);  metalnessFactor = clamp(M + o.dMetal, 0.0, 1.0);  emissive += o.spark * k;
 *   o.nObj = pháp tuyến (đã có gồ ghề) trong toạ độ vật → view: normalize(mat3(viewMatrix) * (mat3(modelMatrix) * o.nObj)) (chia đều nếu scale vật đều)
 * oriented = true: u của texture chạy dọc cạnh DÀI của hộp vật (vGrSz) — cho thớ gỗ.
 */
export function triplanarChunk({ prefix = 'bk', oriented = false } = {}) {
  const P = prefix;
  return /* glsl */`
uniform sampler2D ${P}Alb; uniform sampler2D ${P}Orm; uniform sampler2D ${P}Nrm; uniform float ${P}InvTile;
struct ${P.toUpperCase()[0] + P.slice(1)}Out { vec3 A; float B; float spark; float dRough; float dMetal; float floorB; vec3 nObj; };
void ${P}Add(vec2 uv, vec3 U, vec3 V, float w, inout vec4 a, inout vec4 o, inout vec3 dn) {
  uv *= ${P}InvTile;
  vec4 s = texture2D(${P}Alb, uv); s.rgb = pow(s.rgb, vec3(2.2));
  a += s * w; o += texture2D(${P}Orm, uv) * w;
  vec3 t = texture2D(${P}Nrm, uv).xyz * 2.0 - 1.0;
  dn += (t.x * U + t.y * V) * w;
}
${P.toUpperCase()[0] + P.slice(1)}Out ${P}Tri(vec3 p, vec3 n, vec3 sz) {
  vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);
  vec2 uvX = vec2(p.z, p.y), uvY = vec2(p.x, p.z), uvZ = vec2(p.x, p.y);
  vec3 UX = vec3(0.0, 0.0, 1.0), VX = vec3(0.0, 1.0, 0.0), UY = vec3(1.0, 0.0, 0.0), VY = vec3(0.0, 0.0, 1.0), UZ = vec3(1.0, 0.0, 0.0), VZ = vec3(0.0, 1.0, 0.0);
  ${oriented ? `if (sz.y > sz.z) { uvX = uvX.yx; vec3 t = UX; UX = VX; VX = t; }
  if (sz.z > sz.x) { uvY = uvY.yx; vec3 t = UY; UY = VY; VY = t; }
  if (sz.y > sz.x) { uvZ = uvZ.yx; vec3 t = UZ; UZ = VZ; VZ = t; }` : ''}
  vec4 a = vec4(0.0), o = vec4(0.0); vec3 dn = vec3(0.0);
  ${P}Add(uvX, UX, VX, w.x, a, o, dn); ${P}Add(uvY, UY, VY, w.y, a, o, dn); ${P}Add(uvZ, UZ, VZ, w.z, a, o, dn);
  ${P.toUpperCase()[0] + P.slice(1)}Out r;
  r.A = a.rgb; r.B = a.a * 1.5; r.spark = o.r; r.dRough = (o.g - 0.5) * 2.0; r.dMetal = (o.b - 0.5) * 2.0; r.floorB = o.a; r.nObj = normalize(n + dn);
  return r;
}
`;
}

export { PAT_GLSL };

/** Như bakeSurface nhưng dịch shader nướng bằng KHR_parallel_shader_compile (compileAsync) trước → không đứng hình khi dịch. */
export async function bakeSurfaceAsync(THREE, renderer, opt = {}) {
  const params = opt.params || {};
  const name = typeof opt.pat === 'number' ? PAT_NAMES[opt.pat] : String(opt.pat || 'WOOD').toUpperCase();
  const c = ctxFor(THREE, renderer, shaderSet(params, name));
  if (!c.ready) { c.ready = true; c.mesh.material = c.bakeMat; await renderer.compileAsync(c.scene, c.cam); c.mesh.material = c.nrmMat; await renderer.compileAsync(c.scene, c.cam); }
  return bakeSurface(THREE, renderer, opt);
}
