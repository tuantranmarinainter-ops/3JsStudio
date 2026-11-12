// stormsky.js — BẦU TRỜI BÃO NHIỀU LỚP (tự viết, 2026-11-12). Hàm thuần của t: tua tới/lui/nhảy cóc ra cùng hình.
//   Lớp 1: tầng mây dày cuộn (fbm uốn miền 2 lần — domain warp), trôi theo gió tích phân (không giật khi gió đổi).
//   Lớp 2: mây vụn thấp sát chân trời, trôi nhanh gấp ~6 lần, tối hơn.
//   Lớp 3: trăng tròn sau mây — quầng sáng, mép mây quanh trăng viền bạc, trăng lấp ló theo độ dày mây.
//   Lớp 4: chớp — loé theo flash của cảnh (hướng tia sét) + chớp ngầm trong mây (vị trí/nhịp băm theo t, không Math.random).
//   Lớp 5: bình minh (tuỳ chọn, dawn > 0): dải ấm sát chân trời theo hướng dawnDir.
//
//   import { createStormSky } from './stormsky.js';
//   const m = createStormSky(THREE, { moon: [-0.7, 0.27, -0.66], gust: (t) => 0..1 });   // env khai e.stormSky = {…} → envs.js tự dựng
//   mỗi khung: m.position.copy(camera.position); m.userData.update(t, flash, k, camPos)   (envs.js tự gọi; ô 'stormSky')
//
// Tham số: moon (hướng trăng), bolt (vị trí thế giới của tia sét để loé đúng phía), speed (tốc độ trôi), cover (độ phủ 0..1),
//   gust(t) → 0..1 gió giật thêm (tốc độ mây ×(1+2·gust)), dawn (0..1), dawnDir, màu: top/hor/dark/lit/silver/moonCol.
const GLSL_NOISE = /* glsl */`
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) { s += a * vn(p); p = r * p * 2.03 + 11.7; a *= 0.5; } return s / 0.97; }
  float fbm3(vec2 p) { float a = 0.5, s = 0.0; mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) { s += a * vn(p); p = r * p * 2.03 + 5.3; a *= 0.5; } return s / 0.875; }
`;

export function createStormSky(THREE, o = {}) {
  const C = (c) => new THREE.Color(c);
  const V = (a, def) => new THREE.Vector3(...(a || def)).normalize();
  const U = {
    uT: { value: 0 }, uDrift: { value: 0 }, uFlash: { value: 0 }, uIntra: { value: 0 }, uOn: { value: 1 },
    uMoon: { value: V(o.moon, [-0.7, 0.27, -0.66]) }, uBolt: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
    uIntraDir: { value: new THREE.Vector3(0, 0.4, -1).normalize() },
    uCover: { value: o.cover ?? 0.62 }, uDawn: { value: o.dawn ?? 0 }, uDawnDir: { value: V(o.dawnDir, [1, 0, -0.3]) },
    cTop: { value: C(o.top || '#070c1c') }, cHor: { value: C(o.hor || '#2b3c5c') },
    cDark: { value: C(o.dark || '#0b1020') }, cLit: { value: C(o.lit || '#3a4766') }, cSilver: { value: C(o.silver || '#e4ecff') },
    cMoon: { value: C(o.moonCol || '#f6f3e6') }, cFlash: { value: C(o.flashCol || '#cfdcff') }, cDawnC: { value: C(o.dawnCol || '#ff9a5c') },
  };
  const mat = new THREE.ShaderMaterial({
    name: 'stormsky', uniforms: U,
    vertexShader: /* glsl */`varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform float uT, uDrift, uFlash, uIntra, uCover, uDawn;
      uniform vec3 uMoon, uBolt, uIntraDir, uDawnDir, cTop, cHor, cDark, cLit, cSilver, cMoon, cFlash, cDawnC;
      varying vec3 vDir;
      ${GLSL_NOISE}
      float deck(vec2 q, out float w) {   // tầng mây chính: uốn miền 2 lần → cuộn xoáy
        vec2 a = vec2(fbm3(q * 0.55 + vec2(0.0, uT * 0.012)), fbm3(q * 0.55 + vec2(5.2, 1.3) - uT * 0.009));
        vec2 b = vec2(fbm3(q * 0.9 + 2.2 * a + vec2(1.7, 9.2) + uDrift * 0.015), fbm3(q * 0.9 + 2.2 * a + vec2(8.3, 2.8)));
        w = b.x;
        return fbm(q * 1.25 + 2.6 * b);
      }
      void main() {
        vec3 d = normalize(vDir); float h = d.y;
        // nền trời: đỉnh gần đen xanh, chân trời xám xanh
        vec3 col = mix(cHor, cTop, smoothstep(-0.02, 0.55, h));
        if (h < -0.02) col = cHor * 0.55;   // dưới chân trời (biển che gần hết)
        float md = dot(d, uMoon);
        // trăng + quầng (trước khi mây phủ)
        float disk = smoothstep(0.99935, 0.99965, md);
        float halo = pow(max(md, 0.0), 90.0) * 0.9 + pow(max(md, 0.0), 10.0) * 0.18;
        vec3 sky = col + cMoon * (disk * 1.5 + halo * 0.32);
        // chiếu lên mặt phẳng mây (phối cảnh): xa chân trời co lại
        float hy = max(h, 0.0) + 0.07;
        vec2 p = d.xz / hy * 0.55;
        vec2 q = p + vec2(uDrift * 0.06, uDrift * 0.022);
        float w; float den = deck(q, w);
        float cov = 1.0 - uCover;
        den = smoothstep(cov - 0.13, cov + 0.15, den);
        den = mix(den, 0.86, smoothstep(0.22, 0.0, h));                     // sát chân trời: mây dày đều (che răng cưa)
        den *= 1.0 - 0.75 * smoothstep(0.93, 0.995, md);                   // khe trăng: mây mở quanh trăng
        // bóng tự che: lấy mẫu dịch về phía trăng → mặt quay về trăng sáng hơn
        vec2 mq = normalize(uMoon.xz + 1e-4) * 0.14;
        float w2; float den2 = smoothstep(cov - 0.13, cov + 0.15, deck(q + mq, w2));
        float lit = clamp(0.55 + (den - den2) * 2.2, 0.0, 1.0);
        vec3 cloud = mix(cDark, cLit, lit * (0.45 + 0.55 * w));
        // viền bạc: mép mây mỏng gần trăng sáng rực
        float edge = clamp(den * (1.0 - den) * 4.0, 0.0, 1.0);
        float near = pow(max(md, 0.0), 30.0) * 1.25 + pow(max(md, 0.0), 6.0) * 0.18;
        cloud += cSilver * edge * near * 1.4;
        cloud += cMoon * (1.0 - den) * near * 0.35;                         // mây mỏng trước trăng ửng sáng
        // mây vụn thấp, trôi nhanh, tối
        vec2 ps = d.xz / (max(h, 0.0) + 0.035) * 1.1 + vec2(uDrift * 0.42, uDrift * 0.15);
        float sc = smoothstep(0.52, 0.78, fbm3(ps * 1.6 + vec2(w * 3.0, 0.0)));
        sc *= smoothstep(0.42, 0.04, h) * smoothstep(-0.03, 0.03, h);
        // chớp: loé theo tia sét của cảnh + chớp ngầm trong mây
        float fl = uFlash * (0.25 + 1.6 * pow(max(dot(d, uBolt), 0.0), 5.0));
        float fi = uIntra * pow(max(dot(d, uIntraDir), 0.0), 14.0) * 2.2;
        float glow = (fl + fi) * (0.35 + 0.9 * den * (1.0 - 0.5 * den));   // mây dày giữa sáng lên như bóng đèn bên trong
        cloud += cFlash * glow;
        vec3 c = mix(sky, cloud, den * 0.97);
        c = mix(c, cDark * 0.7 + cFlash * glow * 0.4, sc * 0.85);
        c += cFlash * fl * 0.08 * (1.0 - den);
        // bình minh (tuỳ chọn)
        vec2 dd = normalize(d.xz + 1e-4), dw = normalize(uDawnDir.xz + 1e-4);
        c += cDawnC * uDawn * exp(-max(h, 0.0) * 9.0) * pow(max(dot(dd, dw), 0.0), 2.0) * (1.0 - 0.6 * den) * step(-0.02, h);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat);
  mesh.name = 'stormsky'; mesh.renderOrder = -2; mesh.frustumCulled = false;
  mesh.userData.matKind = 'none'; mesh.userData.grungeKind = 'none';
  const speed = o.speed ?? 1, gust = o.gust || (() => 0);
  const bolt = o.bolt ? new THREE.Vector3(...o.bolt) : null, tmp = new THREE.Vector3();
  // gió tích phân: drift(t) = ∫ speed·(1 + 2·gust) dt — tính bằng tổng bước cố định từ 0 (thuần, tua đâu cũng như nhau)
  const drift = (t) => { const N = Math.max(8, Math.ceil(Math.abs(t) * 8)), h = t / N; let s = 0;
    for (let i = 0; i < N; i++) s += 1 + 2 * gust((i + 0.5) * h); return s * h * speed; };
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  mesh.userData.update = (t, flash = 0, k = 1, cam = null) => {
    U.uT.value = t; U.uDrift.value = drift(t); U.uFlash.value = flash * k;
    if (bolt && cam) U.uBolt.value.copy(tmp.copy(bolt).sub(cam).normalize());
    // chớp ngầm: mỗi ô 0.7 s có ~45% cơ hội một nhịp loé đôi ở hướng ngẫu nhiên (băm theo số ô)
    const cell = Math.floor(t / 0.7), u = t / 0.7 - cell;
    if (hash(cell) < 0.45) {
      const a = hash(cell + 17) * Math.PI * 2, el = 0.12 + hash(cell + 31) * 0.4;
      U.uIntraDir.value.set(Math.cos(a), el, Math.sin(a)).normalize();
      const pulse = (c, wdt) => Math.max(0, 1 - Math.abs(u - c) / wdt);
      U.uIntra.value = (pulse(0.3, 0.06) * 0.9 + pulse(0.46, 0.05) * 0.6) * (0.6 + 0.4 * hash(cell + 5)) * k;
    } else U.uIntra.value = 0;
  };
  return mesh;
}
