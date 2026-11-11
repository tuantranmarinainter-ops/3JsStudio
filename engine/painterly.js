// painterly.js — Bộ lọc "tranh sơn dầu" (Kuwahara dị hướng) cho EffectComposer của three.js. LÕI dùng chung mọi tập.
// Học từ Tidewright (Claude Fable 5.2), module 50-post (tidewright.html dòng ~5570–6220), chuyển sang Pass của three.
//
//   import { createPainterlyPass } from './painterly.js';
//   const paint = createPainterlyPass(THREE, { strength: 1, radius: 30, weave: 1, depthTexture, camera });
//   composer.addPass(paint);                 // đặt TRƯỚC bloom/grade (bloom toả trên lớp sơn, grade chỉnh màu sau cùng)
//   paint.params.strength = 0.7;             // 0..1  (0 = bỏ qua hoàn toàn: pass tự tắt)
//   paint.params.radius = 30;                // bán kính nét cọ (px ở khung cao 1920; tự co theo độ phân giải)
//   paint.params.weave = 1;                  // 0..1 vân vải canvas + nổi sơn (impasto) + cọ khô
//   paint.params.flat = 0.4;                 // độ rộng nét khi KHÔNG có depth (0 = nét chặt, 1 = nét bầu trời)
//   paint.setDepth(depthTexture, camera);    // tuỳ chọn: nét theo khoảng cách (gần chặt, xa/bầu trời rộng)
//
// Chuỗi (tất cả là hàm thuần của khung đầu vào — không ngẫu nhiên, không lịch sử khung, không đồng hồ ⇒ tất định):
//   pre      : khung (không gian hiển thị) → làm dịu chi tiết mảnh (mưa, dây, sao) trước khi vẽ → RT có mipmap
//   tensor   : tensor cấu trúc Sobel (E,F,G) của pre ở NỬA độ phân giải + hệ số bán kính nét (depth hoặc hằng)
//   blur H/V : gauss 9 tap của tensor; lượt V giải luôn hướng + độ dị hướng → "flow"
//              flow.rg = (cos2θ, sin2θ)·A·0.5+0.5 (θ = hướng nét dọc theo cạnh), b = độ mạnh cạnh, a = bán kính 0..1
//   kuwahara : Kuwahara tổng quát dị hướng 8 quạt trên pre, elip xoay theo flow, tap cố định (không rung theo khung)
//   composite: lớp sơn + trả lại chi tiết mịn (high-pass có giới hạn, không quầng) + giữ nét mảnh/đèn sáng
//              + bề mặt tranh: vân vải 7°, lông cọ (LIC 5 tap theo hướng nét), vệt cọ, sơn đọng, cọ khô, hạt
// Đầu vào là khung ĐÃ tone-map (post.js chép canvas) ⇒ "paint space" = chính không gian hiển thị (gần sqrt như bản gốc).
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const LW = 'const vec3 LW = vec3(0.2126, 0.7152, 0.0722);\n';

// ---- pre: chi tiết mảnh sáng/tối hơn CẢ HAI hàng xóm theo một trục bị kéo về nền (cạnh bậc giữ nguyên) ----
const FS_PRE = LW + `
uniform sampler2D tDiffuse; uniform vec2 uPx; varying vec2 vUv;
void main(){
  vec3 c = clamp(texture(tDiffuse, vUv).rgb, 0.0, 1.0);
  float L = dot(c, LW);
  float l = dot(texture(tDiffuse, vUv - vec2(uPx.x, 0.0)).rgb, LW), r = dot(texture(tDiffuse, vUv + vec2(uPx.x, 0.0)).rgb, LW);
  float d = dot(texture(tDiffuse, vUv - vec2(0.0, uPx.y)).rgb, LW), u = dot(texture(tDiffuse, vUv + vec2(0.0, uPx.y)).rgb, LW);
  float hi = min(max(l, r), max(d, u))*1.25 + 0.003, lo = max(min(l, r), min(d, u))*0.8 - 0.003;
  if (L > hi) c *= hi/L; else if (L < lo) c = c*(lo/max(L, 1e-4)) + vec3(lo)*step(L, 1e-4);
  gl_FragColor = vec4(c, 1.0);
}`;

// ---- tensor (nửa độ phân giải) ----
const FS_TENSOR = LW + `
uniform sampler2D tPre; uniform sampler2D tDepth; uniform vec2 uPx; uniform float uUseDepth, uFlat, uNear, uFar, uOrtho;
varying vec2 vUv;
#define P(x,y) textureLod(tPre, vUv + uPx*vec2(x, y), 1.0).rgb
void main(){
  vec3 a = P(-1.0, 1.0), b = P(0.0, 1.0), c = P(1.0, 1.0);
  vec3 d = P(-1.0, 0.0),                  f = P(1.0, 0.0);
  vec3 g = P(-1.0,-1.0), h = P(0.0,-1.0), i = P(1.0,-1.0);
  vec3 gx = ((c + 2.0*f + i) - (a + 2.0*d + g))*0.25;
  vec3 gy = ((a + 2.0*b + c) - (g + 2.0*h + i))*0.25;
  float r = uFlat;
  if (uUseDepth > 0.5) {
    // khoảng cách tuyến tính (stud): nét chặt trên vật gần, rộng dần ra biển xa, rộng nhất ở trời/sương xa
    float dz = texture(tDepth, vUv).r;
    float z = uOrtho > 0.5 ? mix(uNear, uFar, dz) : uNear*uFar/max(uFar - dz*(uFar - uNear), 1e-6);
    r = mix(mix(0.035, 0.25, smoothstep(29.0, 200.0, z)), 0.46, smoothstep(200.0, 1300.0, z));
    r = mix(r, 1.0, smoothstep(3500.0, 17000.0, z) * step(dz, 0.99999) + step(0.99999, dz));
  }
  // đèn và phản chiếu ấm của chúng không phải nét cọ: sáng + ấm, hoặc rất sáng → (gần như) không cọ
  vec3 em = (b + d + f + h)*0.25; float eL = dot(em, LW);
  float hotp = max(smoothstep(0.62, 0.80, eL)*smoothstep(0.04, 0.18, em.r - em.b), smoothstep(0.90, 0.97, eL));
  r *= 1.0 - 0.9*hotp;
  gl_FragColor = vec4(dot(gx, gx), dot(gx, gy), dot(gy, gy), r);
}`;

const BLUR_BODY = `
uniform sampler2D tTex; uniform vec2 uDir; varying vec2 vUv;
vec4 blur9(){
  vec4 s = texture(tTex, vUv)*0.22702703;
  s += (texture(tTex, vUv + uDir*1.38461538) + texture(tTex, vUv - uDir*1.38461538))*0.31621622;
  s += (texture(tTex, vUv + uDir*3.23076923) + texture(tTex, vUv - uDir*3.23076923))*0.07027027;
  return s;
}`;
const FS_BLUR = BLUR_BODY + 'void main(){ gl_FragColor = blur9(); }';
// lượt V + giải trị riêng: dạng góc kép lọc/nội suy đúng (θ và θ+π là một nét), hướng mâu thuẫn tự triệt về A→0
const FS_FLOW = BLUR_BODY + `
void main(){
  vec4 s = blur9(); vec3 t = s.xyz;
  float tr = t.x + t.z;
  vec2 v = vec2(t.z - t.x, -2.0*t.y)/(tr + 2.5e-5);
  gl_FragColor = vec4(v*0.5 + 0.5, clamp(sqrt(max(tr, 0.0))*1.6, 0.0, 1.0), s.a);
}`;

const FLOW_DEC = `
void twFlow(vec4 fl, vec2 bias, out vec2 t, out float A){
  vec2 v = (fl.xy*2.0 - 1.0)*smoothstep(0.04, 0.16, fl.b); A = min(length(v), 1.0);
  v += bias; float l = length(v);
  vec2 d = l > 1e-4 ? v/l : vec2(1.0, 0.0);
  t = vec2(sqrt(max(0.5 + 0.5*d.x, 0.0)), sqrt(max(0.5 - 0.5*d.x, 0.0))*(d.y < 0.0 ? -1.0 : 1.0));
}`;

// ---- Kuwahara dị hướng 8 quạt (mức chất lượng 0..2 = 3/4/6 tap mỗi quạt) ----
function kuwaharaFS(level) {
  const sets = [
    [[0.42, 0], [0.86, -0.24], [0.86, 0.24]],
    [[0.34, 0], [0.70, -0.27], [0.70, 0.27], [1.0, 0]],
    [[0.30, 0], [0.55, -0.26], [0.55, 0.26], [0.78, -0.29], [0.78, 0.29], [1.0, 0]],
  ];
  const taps = sets[level], n = taps.length;
  const f = (x) => { const s = x.toFixed(5); return s.indexOf('.') < 0 ? s + '.0' : s; };
  const lodBias = level === 0 ? 0.5 : level === 1 ? 0.25 : 0.0;
  // xy = vị trí trên đĩa, z = trọng số gauss, w = lệch mip (log2 khoảng cách tap so với bán kính)
  const arr = taps.map((t) => `vec4(${f(t[0] * Math.cos(t[1]))},${f(t[0] * Math.sin(t[1]))},${f(Math.exp(-1.3 * t[0] * t[0]))},${f(Math.log2(t[0] * 0.45) + lodBias)})`);
  return FLOW_DEC + `
uniform sampler2D tPre; uniform sampler2D tFlow; uniform vec2 uTexel;
uniform vec4 uK; // x = bán kính nét (px), y = sàn phương sai, z = trọng số tâm
varying vec2 vUv;
const int NT = ${n};
const vec4 TAPS[${n}] = vec4[${n}](${arr.join(', ')});
void main(){
  vec4 fl = texture(tFlow, vUv);
  vec2 t; float A; twFlow(fl, vec2(0.0), t, A);
  float R = uK.x*fl.a;
  const float AL = 0.6;
  float ea = R*(AL + A)/AL, eb = R*AL/(AL + A);
  vec2 tu = t*ea*uTexel, nu = vec2(-t.y, t.x)*eb*uTexel;
  float lod0 = log2(max(R, 1.0));
  vec3 c0 = textureLod(tPre, vUv, 0.0).rgb, c0s = c0*c0;
  vec3 mk[8]; float vk[8]; float vmin = 1e9;
  vec2 ax = vec2(1.0, 0.0), ay = vec2(0.0, 1.0);
  for (int k = 0; k < 8; k++){
    vec3 m = c0*uK.z, s = c0s*uK.z; float w = uK.z;
    for (int j = 0; j < NT; j++){
      vec4 T = TAPS[j];
      vec2 p = ax*T.x + ay*T.y;
      vec3 c = textureLod(tPre, vUv + tu*p.x + nu*p.y, max(lod0 + T.w, 0.0)).rgb;
      m += c*T.z; s += c*c*T.z; w += T.z;
    }
    m /= w; s = abs(s/w - m*m);
    float v = s.r + s.g + s.b;
    mk[k] = m; vk[k] = v; vmin = min(vmin, v);
    ax = vec2(ax.x - ax.y, ax.x + ax.y)*0.70710678; ay = vec2(-ax.y, ax.x);
  }
  // trọng số TƯƠNG ĐỐI với quạt êm nhất → màu đọng thành mảng phẳng, viền sắc; sàn (uK.y) giữ vùng phẳng = trung bình
  vec3 acc = vec3(0.0); float wsum = 0.0; float vref = 1.0/(vmin*2.2 + uK.y);
  for (int k = 0; k < 8; k++){ float x = vk[k]*vref; x *= x; float wk = 1.0/(1.0 + x); acc += mk[k]*wk; wsum += wk; }
  gl_FragColor = vec4(acc/wsum, 1.0);
}`;
}

// ---- composite ----
const FS_COMP = LW + FLOW_DEC + `
uniform sampler2D tDiffuse; uniform sampler2D tPaint; uniform sampler2D tFlow; uniform sampler2D tPre; uniform sampler2D tNoise;
uniform vec4 uP;      // x = strength, y = weave, z = canvas scale (H/720), w = 0
uniform vec2 uTexel;
varying vec2 vUv;
float weave(vec2 p, float pitch){
  vec2 q = vec2(p.x*0.9925 - p.y*0.1219, p.x*0.1219 + p.y*0.9925)/pitch;   // lệch 7°: không đánh nhịp với lưới điểm ảnh
  vec2 n = textureLod(tNoise, p/(pitch*90.0), 0.0).rg - 0.5;
  q += n*1.1;
  return cos(6.2831853*q.x)*cos(6.2831853*q.y)*(0.75 + n.x);
}
// lông cọ: hạt tĩnh tích phân DỌC hướng nét (LIC 5 tap)
float bristle(vec2 p, vec2 t, float pn){
  vec2 st = t*(1.7*pn); float inv = 1.0/(256.0*pn);
  float a = textureLod(tNoise, p*inv, 0.0).a;
  a += textureLod(tNoise, (p + st)*inv, 0.0).a + textureLod(tNoise, (p - st)*inv, 0.0).a;
  a += textureLod(tNoise, (p + 2.0*st)*inv, 0.0).a + textureLod(tNoise, (p - 2.0*st)*inv, 0.0).a;
  return a*0.2;
}
// vệt cọ: cùng ý đó, thô hơn hai quãng tám
float strokes(vec2 p, vec2 t, float pn){
  float sc = pn*3.2; vec2 st = t*(2.1*sc); float inv = 1.0/(256.0*sc); p += vec2(91.0, 37.0)*sc;
  float a = textureLod(tNoise, p*inv, 0.0).a;
  a += textureLod(tNoise, (p + st)*inv, 0.0).a + textureLod(tNoise, (p - st)*inv, 0.0).a;
  a += textureLod(tNoise, (p + 2.0*st)*inv, 0.0).a + textureLod(tNoise, (p - 2.0*st)*inv, 0.0).a;
  return a*0.2 - 0.5;
}
void main(){
  vec3 src = clamp(texture(tDiffuse, vUv).rgb, 0.0, 1.0);
  float pm = clamp(uP.x, 0.0, 1.0);
  vec4 fl = texture(tFlow, vUv);
  vec2 t; float A; twFlow(fl, vec2(0.085, 0.03), t, A);
  // cạnh "vẽ tay": trung bình nhẹ DỌC cạnh (không bao giờ ngang cạnh) → răng cưa hình học tan thành nét kẻ sạch
  {
    vec2 d = uTexel;
    float gw = sqrt(dot(texture(tDiffuse, vUv - vec2(d.x, 0.0)).rgb, LW)), gr = sqrt(dot(texture(tDiffuse, vUv + vec2(d.x, 0.0)).rgb, LW));
    float gd = sqrt(dot(texture(tDiffuse, vUv - vec2(0.0, d.y)).rgb, LW)), gu = sqrt(dot(texture(tDiffuse, vUv + vec2(0.0, d.y)).rgb, LW));
    vec2 gg = vec2(gr - gw, gu - gd); float gm = length(gg);
    vec2 tn = vec2(-gg.y, gg.x)/max(gm, 1e-4)*d*1.5;
    vec3 ta = texture(tDiffuse, vUv + tn).rgb, tb = texture(tDiffuse, vUv - tn).rgb;
    float lc = dot(src, LW), la = dot(ta, LW), lb = dot(tb, LW);
    float inside = 1.0 - smoothstep(0.02, 0.25, max(lc - max(la, lb), min(la, lb) - lc)/(lc + max(la, lb) + 0.02));
    src = mix(src, src*0.36 + (ta + tb)*0.32, smoothstep(0.035, 0.14, gm)*inside*pm);
  }
  vec2 px = gl_FragCoord.xy;
  float cs = max(uP.z, 0.5), pn = max(1.0, 1.25*cs);
  float mk = strokes(px, t, pn);
  float broad = smoothstep(0.09, 0.5, fl.a);
  float far = smoothstep(0.50, 0.92, fl.a);                  // trời, mây, sương xa: chỗ tranh vẽ phóng nhất
  vec2 wob = textureLod(tNoise, px/(256.0*1.6*cs), 2.5).rg - 0.5;   // tay run chậm
  float soft = (0.2*broad + 0.8*far)*(1.0 - smoothstep(0.30, 0.75, fl.b));
  vec3 e3 = textureLod(tPre, vUv, 3.0).rgb;
  // vệt sáng thẳng mạch lạc (tia đèn, quầng) là ÁNH SÁNG, không phải sơn: không rung, không kéo
  float shaft = smoothstep(0.008, 0.04, dot(src - e3, LW))*(0.35 + 0.65*smoothstep(0.2, 0.6, A));
  soft *= 1.0 - shaft;
  float big = 0.0;
  if (far > 0.01){ const mat2 RT = mat2(0.7986, 0.6018, -0.6018, 0.7986); big = strokes(RT*px + vec2(311.0, 173.0), RT*t, pn*3.0); }
  vec2 buv = vUv + (wob*(5.0 + 2.5*far) + vec2(-t.y, t.x)*(mk*2.5 + big*9.0*far))*uTexel*(cs*soft*pm);
  vec3 ep = texture(tPaint, buv).rgb, es = src;
  // chi tiết mịn quay lại (high-pass), kéo sơn VỀ PHÍA bản gốc nhưng không vượt qua → không quầng
  vec3 hp = es - textureLod(tPre, vUv, 1.5).rgb;
  float dwt = mix(0.5, 0.85, smoothstep(0.03, 0.22, fl.b))*mix(1.0, 0.35, broad)*(1.0 - 0.6*far);
  vec3 e = mix(ep, clamp(ep + hp*dwt, min(ep, es), max(ep, es)), mix(1.0, 0.45, broad)*(1.0 - 0.5*far));
  e += clamp(ep - e3, -0.06, 0.06)*0.32;                       // nâng tương phản cục bộ nhẹ
  vec3 pc = max(e, vec3(0.0));
  // chi tiết mảnh mà nét cọ nuốt mất (sao, mưa, dây, chim): lệch mạnh khỏi mảng sơn → hiện lại sắc nét
  float Ls = dot(es, LW), Lp = dot(pc, LW);
  float th = mix(1.6, 1.22, smoothstep(0.12, 0.7, Ls));
  float show = max(smoothstep(th, th*2.4, Ls/(Lp + 0.004)), smoothstep(1.5, 3.0, (Lp + 0.004)/(Ls + 0.004)));
  float warmBright = smoothstep(0.62, 0.85, Ls)*smoothstep(0.05, 0.2, es.r - es.b);   // ánh đèn ấm: lấy mượt từ bản render
  pc = mix(pc, es, max(show, warmBright));
  vec3 g = mix(src, pc, clamp(pm*1.6, 0.0, 1.0));

  // ---- bề mặt tranh: vân vải, nổi sơn, sơn đọng, cọ khô ----
  float wv = uP.y;
  if (wv > 0.0) {
    float lum = dot(g, LW);
    float load = smoothstep(0.34, 0.62, textureLod(tNoise, px/(256.0*5.0*cs), 0.0).g);   // lượng sơn trên cọ đổi theo mảng
    const vec2 LR = vec2(-0.5547, 0.8321);                    // ánh sáng xiên từ trên-trái
    float pitch = max(4.3, 4.4*cs);
    vec2 pl = px + LR*(1.15*pn);
    float b0 = bristle(px, t, pn);
    float db = b0 - bristle(pl, t, pn);
    float dw = weave(px, pitch) - weave(pl, pitch);
    float conf = smoothstep(0.04, 0.16, fl.b);
    float body = smoothstep(0.05, 0.18, lum)*(1.0 - smoothstep(0.62, 0.86, lum));   // hạt chỉ ở tối + trung tính
    float form = smoothstep(0.035, 0.13, fl.b);              // vân chỉ nơi có hình khối thật (gradient phẳng → không lưới)
    float relief = (db*(0.35 + 0.65*load)*0.07 + dw*0.005*(1.0 - 0.8*load)*(1.0 - far))*body*form;
    vec2 gq = px/(256.0*max(1.0, 0.9*cs)) + vec2(0.317, 0.713);
    float grain = textureLod(tNoise, gq, 0.0).a - 0.5*(textureLod(tNoise, gq + vec2(1.0/256.0, 0.0), 0.0).a + textureLod(tNoise, gq + vec2(0.0, 1.0/256.0), 0.0).a);
    relief += grain*0.022*body;
    float pool = smoothstep(0.20, 0.90, fl.b)*0.05*broad*(1.0 - smoothstep(0.55, 0.95, fl.b));
    float dry = smoothstep(0.59, 0.73, b0)*(0.35 + 0.65*A)*0.035*body*(1.0 - 0.7*load)*conf;
    float marks = body*form*(mk*mix(0.15*(0.4 + 0.6*broad), 0.09, far) + big*0.15*far);
    g *= 1.0 + pm*wv*(relief + marks - pool - dry);
  }
  gl_FragColor = vec4(clamp(g, 0.0, 1.0), 1.0);
}`;

// ---- texture nhiễu 256² lát liền (R fbm, G fbm2, B worley F1, A trắng) — sinh bằng hash có seed, tất định ----
function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function makeNoiseTexture(THREE, seed = 1) {
  const N = 256, data = new Uint8Array(N * N * 4);
  const tnoise = (x, y, per, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const w = (a) => ((a % per) + per) % per;
    const a = hash2(w(xi), w(yi), s), b = hash2(w(xi + 1), w(yi), s), c = hash2(w(xi), w(yi + 1), s), d = hash2(w(xi + 1), w(yi + 1), s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const tfbm = (x, y, s) => { let o = 0, a = 0.5, per = 4, n = 0; for (let k = 0; k < 6; k++) { o += a * tnoise((x / N) * per, (y / N) * per, per, s + k * 17); n += a; a *= 0.5; per *= 2; } return o / n; };
  const C = 12, pts = [];
  for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) pts.push([(i + hash2(i, j, seed + 901)) / C, (j + hash2(i, j, seed + 902)) / C]);
  const worley = (x, y) => {
    const u = x / N, v = y / N, ci = Math.floor(u * C), cj = Math.floor(v * C); let best = 9;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const p = pts[((cj + dj + C) % C) * C + ((ci + di + C) % C)];
      let dx = Math.abs(p[0] - u), dy = Math.abs(p[1] - v); if (dx > 0.5) dx = 1 - dx; if (dy > 0.5) dy = 1 - dy;
      best = Math.min(best, Math.hypot(dx, dy) * C);
    }
    return Math.min(1, best);
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4;
    data[i] = (tfbm(x, y, seed + 11) * 255) | 0;
    data[i + 1] = (tfbm(x + 37.5, y + 91.5, seed + 4242) * 255) | 0;
    data[i + 2] = (worley(x, y) * 255) | 0;
    data[i + 3] = (hash2(x, y, seed + 77) * 255) | 0;
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace; tex.needsUpdate = true;
  return tex;
}

export const PAINT_DEFAULTS = { strength: 1, radius: 30, weave: 1, flat: 0.4, quality: 2 };

export function createPainterlyPass(THREE, opts = {}) {
  const params = { ...PAINT_DEFAULTS, ...opts };
  const mat = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  const rt = (o = {}) => new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, ...o });
  const pre = rt({ type: THREE.UnsignedByteType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const tA = rt(), tB = rt(), paint = rt({ type: THREE.UnsignedByteType });
  const noise = makeNoiseTexture(THREE, opts.seed ?? 1);
  const v2 = () => ({ value: new THREE.Vector2() });

  const mPre = mat(FS_PRE, { tDiffuse: { value: null }, uPx: v2() });
  const mTensor = mat(FS_TENSOR, { tPre: { value: pre.texture }, tDepth: { value: null }, uPx: v2(), uUseDepth: { value: 0 }, uFlat: { value: 0.4 }, uNear: { value: 0.1 }, uFar: { value: 1000 }, uOrtho: { value: 0 } });
  const mBlur = mat(FS_BLUR, { tTex: { value: null }, uDir: v2() });
  const mFlow = mat(FS_FLOW, { tTex: { value: null }, uDir: v2() });
  const mKuwa = [0, 1, 2].map((q) => mat(kuwaharaFS(q), { tPre: { value: pre.texture }, tFlow: { value: tA.texture }, uTexel: v2(), uK: { value: new THREE.Vector4() } }));
  const mComp = mat(FS_COMP, { tDiffuse: { value: null }, tPaint: { value: paint.texture }, tFlow: { value: tA.texture }, tPre: { value: pre.texture }, tNoise: { value: noise }, uP: { value: new THREE.Vector4() }, uTexel: v2() });
  const quad = new FullScreenQuad(mPre);
  let W = 2, H = 2, depth = null, cam = null;

  const pass = new Pass();
  pass.needsSwap = true;
  pass.params = params;
  pass.setDepth = (tex, camera) => { depth = tex || null; cam = camera || null; };
  if (opts.depthTexture) pass.setDepth(opts.depthTexture, opts.camera);
  pass.setSize = (w, h) => {
    W = Math.max(2, w | 0); H = Math.max(2, h | 0);
    pre.setSize(W, H); paint.setSize(W, H);
    const hw = Math.max(1, (W + 1) >> 1), hh = Math.max(1, (H + 1) >> 1);
    tA.setSize(hw, hh); tB.setSize(hw, hh);
  };
  const draw = (renderer, m, target) => { quad.material = m; renderer.setRenderTarget(target); quad.render(renderer); };
  pass.render = (renderer, writeBuffer, readBuffer) => {
    const pm = Math.max(0, Math.min(1, +params.strength || 0));
    const src = readBuffer.texture;
    if (pm <= 0.001) {   // tắt: chép thẳng (giữ đúng hợp đồng needsSwap)
      mComp.uniforms.uP.value.set(0, 0, 1, 0); mComp.uniforms.tDiffuse.value = src;
      return draw(renderer, mComp, pass.renderToScreen ? null : writeBuffer);
    }
    // pre (+ mipmap tự sinh sau khi vẽ vào RT)
    mPre.uniforms.tDiffuse.value = src;
    const o = Math.max(1.0, H / 960);
    mPre.uniforms.uPx.value.set(o / W, o / H);
    draw(renderer, mPre, pre);
    // tensor ở nửa độ phân giải
    const U = mTensor.uniforms;
    U.uPx.value.set(2 / W, 2 / H); U.uFlat.value = params.flat;
    const useD = !!(depth && cam);
    U.uUseDepth.value = useD ? 1 : 0; U.tDepth.value = useD ? depth : null;
    if (useD) { U.uNear.value = cam.near; U.uFar.value = cam.far; U.uOrtho.value = cam.isOrthographicCamera ? 1 : 0; }
    draw(renderer, mTensor, tA);
    mBlur.uniforms.tTex.value = tA.texture; mBlur.uniforms.uDir.value.set(1 / tA.width, 0); draw(renderer, mBlur, tB);
    mFlow.uniforms.tTex.value = tB.texture; mFlow.uniforms.uDir.value.set(0, 1 / tB.height); draw(renderer, mFlow, tA);
    // bán kính nét theo chiều cao khung → cùng một vẻ ở mọi độ phân giải
    const R = params.radius * (H / 1920) * (0.55 + 0.45 * pm);
    const mk = mKuwa[Math.max(0, Math.min(2, params.quality | 0))];
    mk.uniforms.uTexel.value.set(1 / W, 1 / H); mk.uniforms.uK.value.set(Math.max(1, R), 1.0e-4, 0.4, 0);
    draw(renderer, mk, paint);
    // composite
    const C = mComp.uniforms;
    C.tDiffuse.value = src; C.uTexel.value.set(1 / W, 1 / H);
    C.uP.value.set(pm, Math.max(0, +params.weave || 0), H / 720 * 0.75, 0);
    draw(renderer, mComp, pass.renderToScreen ? null : writeBuffer);
  };
  pass.dispose = () => {
    for (const r of [pre, tA, tB, paint]) r.dispose();
    for (const m of [mPre, mTensor, mBlur, mFlow, mComp, ...mKuwa]) m.dispose();
    noise.dispose(); quad.dispose();
  };
  return pass;
}
