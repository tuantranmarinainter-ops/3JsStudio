// fx.js — Hiệu ứng tất định: mỗi hạt là hàm thuần của (seed, chỉ số, t). Không cộng dồn theo frame.
//   const snow = fxSnow(THREE, { count: 1500, area: [80, 50, 80] }); scene.add(snow.obj); snow.update(t, center);
import { postcardTexture } from './postcards.js';

const hash = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

function dot(THREE, soft = true) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(soft ? 0.5 : 0.8, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(cv); return t;
}

// Tuyết / bụi lơ lửng / bọt: hạt rơi trong hộp quanh center
export function fxSnow(THREE, { count = 1500, area = [80, 50, 80], speed = 4, drift = 1.5, size = 0.5, color = '#ffffff', seed = 1, wind = [0, 0] } = {}) {
  // 2 lớp kích thước: xa = nhiều hạt nhỏ, gần = ít hạt to mềm. Mọi vị trí = hàm thuần của (seed, i, t).
  const flake = flakeTex(THREE);
  const layers = [
    { n: Math.round(count * 5.2), size: size * 0.75, sp: 0.8, op: 0.85, sd: seed },
    { n: Math.round(count * 2.4), size: size * 1.5, sp: 1.0, op: 0.8, sd: seed + 25 },
    { n: Math.round(count * 1.3), size: size * 3.2, sp: 1.15, op: 0.7, sd: seed + 50 },
  ].map((L) => {
    const geo = new THREE.BufferGeometry(); L.pos = new Float32Array(L.n * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(L.pos, 3));
    const m = new THREE.PointsMaterial({ size: L.size, map: flake, transparent: true, opacity: L.op, depthWrite: false, color, sizeAttenuation: true });
    L.geo = geo; L.obj = new THREE.Points(geo, m); L.obj.frustumCulled = false; return L;
  });
  const obj = new THREE.Group(); obj.name = 'fx_snow'; layers.forEach((L) => obj.add(L.obj));
  return {
    obj,
    update(t, c = [0, 0, 0]) {
      const [ax, ay, az] = area;
      // gió giật: dịch ngang = tích phân của (1 + giật(t)) nên liên tục, không nhảy khi giật đổi
      const w0 = wind[0] || 0.8, wz = wind[1] || 0.2;
      const WK = globalThis.__autoFx?.wind === false ? 0.2 : 1;   // tắt 'gió' → chỉ trôi nhẹ
      const gi = (k) => t * 1.0 + WK * k * (-0.9 * Math.cos(t * 0.6) / 0.6 - 0.35 * Math.cos(t * 1.7 + 1) / 1.7 + 0.6 * Math.sin(t * 0.35 + 2) / 0.35 * 0.5);
      const gs = WK * (0.5 + 0.5 * Math.sin(t * 0.9 + 0.5));   // 0..1 độ giật hiện tại (cho xoáy)
      for (const L of layers) {
        const pos = L.pos, sd = L.sd;
        for (let i = 0; i < L.n; i++) {
          const fall = (hash(i, sd) * ay + t * speed * L.sp * (0.7 + hash(i, sd + 3) * 0.6) * (1 - 0.15 * gs)) % ay;
          const ph = hash(i, sd + 4) * 6.283, swirl = hash(i, sd + 7) > 0.6 ? drift * 2.2 : 0;
          let x = (hash(i, sd + 1) - 0.5) * ax + Math.sin(t * 0.8 + ph) * drift + Math.sin(t * 1.9 + ph * 2) * drift * 0.4 + w0 * gi(1.6) * L.sp + WK * swirl * Math.sin(t * 2.1 + ph * 3) * (0.5 + gs);
          let z = (hash(i, sd + 2) - 0.5) * az + Math.cos(t * 0.7 + ph * 1.3) * drift + wz * t + WK * swirl * Math.cos(t * 1.8 + ph * 2) * (0.5 + gs);
          x = ((x + ax / 2) % ax + ax) % ax - ax / 2; z = ((z + az / 2) % az + az) % az - az / 2;
          pos[i * 3] = c[0] + x; pos[i * 3 + 1] = c[1] + ay - fall; pos[i * 3 + 2] = c[2] + z;
        }
        L.geo.attributes.position.needsUpdate = true;
      }
    },
  };
}

// Bão tuyết (góp ý 2026-11-12 #16): rất nhiều hạt, rơi XIÊN mạnh theo gió, 3 lớp (mịn xa / vừa / bông mềm sát ống kính),
// vệt mờ chuyển động cho hạt gần (LineSegments) + làn tuyết cuộn sát đất. Tất định: vị trí = hàm thuần của (seed, i, t).
//   const b = fxBlizzard(THREE); b.update(t, center, { k: 1, wind: 18 })   // k = 0..1 mật độ (0 → ẩn)
export function fxBlizzard(THREE, { area = [44, 26, 44], seed = 5, fall = 6 } = {}) {
  const flake = flakeTex(THREE), [ax, ay, az] = area;
  const mk = (n, size, op, sp, sd, h0 = 0, h1 = 1) => {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const o = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: flake, transparent: true, opacity: op, depthWrite: false, color: '#ffffff', sizeAttenuation: true }));
    o.frustumCulled = false; return { n, pos, geo, o, sp, sd, h0, h1 };
  };
  const pts = [mk(16000, 0.3, 0.95, 1.0, seed), mk(7000, 0.62, 0.8, 1.15, seed + 20), mk(1400, 1.7, 0.32, 1.3, seed + 40)];
  const ground = mk(1600, 2.4, 0.22, 0.85, seed + 60);
  const NS = 2600, sGeo = new THREE.BufferGeometry(), sPos = new Float32Array(NS * 6); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const streaks = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false })); streaks.frustumCulled = false;
  const obj = new THREE.Group(); obj.name = 'fx_blizzard'; for (const L of [...pts, ground]) obj.add(L.o); obj.add(streaks); obj.visible = false;
  const wrap = (v, m) => ((v % m) + m) % m;
  return {
    obj,
    update(t, c = [0, 0, 0], { k = 1, wind = 18, ground: gy = 0.1 } = {}) {
      obj.visible = k > 0; if (!(k > 0)) return;
      const kk = Math.min(1, k), G = t - 0.4 * Math.cos(0.7 * t) / 0.7, gust = 1 + 0.4 * Math.sin(0.7 * t), wz = wind * 0.3;
      for (const L of pts) {
        const n = Math.floor(L.n * kk), pos = L.pos, sd = L.sd; L.geo.setDrawRange(0, n);
        for (let i = 0; i < n; i++) {
          const s = L.sp * (0.8 + hash(i, sd + 3) * 0.4), ph = hash(i, sd + 4) * 6.283;
          const x = wrap((hash(i, sd + 1) - 0.5) * ax + wind * s * G + Math.sin(t * 2.3 + ph) * 0.6, ax) - ax / 2;
          const z = wrap((hash(i, sd + 2) - 0.5) * az + wz * s * G + Math.cos(t * 1.9 + ph) * 0.6, az) - az / 2;
          const y = ay - wrap(hash(i, sd) * ay + fall * s * t, ay) + Math.sin(t * 3.1 + ph) * 0.4;
          pos[i * 3] = c[0] + x; pos[i * 3 + 1] = c[1] + y; pos[i * 3 + 2] = c[2] + z;
        }
        L.geo.attributes.position.needsUpdate = true;
      }
      const nS = Math.floor(NS * kk), sd = seed + 80; sGeo.setDrawRange(0, nS * 2);
      const tail = 0.075;
      for (let i = 0; i < nS; i++) {   // vệt: hạt gần hơn (nửa hộp phía camera) kéo đuôi ngược chiều vận tốc
        const s = 1.3 * (0.8 + hash(i, sd + 3) * 0.4), ph = hash(i, sd + 4) * 6.283;
        const x = wrap((hash(i, sd + 1) - 0.5) * ax * 0.6 + wind * s * G, ax * 0.6) - ax * 0.3;
        const z = wrap((hash(i, sd + 2) - 0.5) * az * 0.6 + wz * s * G + Math.cos(t * 1.9 + ph) * 0.6, az * 0.6) - az * 0.3 + az * 0.15;
        const y = ay - wrap(hash(i, sd) * ay + fall * s * t, ay);
        const vx = wind * s * gust, vy = -fall * s, vz = wz * s;
        sPos.set([c[0] + x, c[1] + y, c[2] + z, c[0] + x - vx * tail, c[1] + y - vy * tail, c[2] + z - vz * tail], i * 6);
      }
      sGeo.attributes.position.needsUpdate = true;
      { const n = Math.floor(ground.n * kk), pos = ground.pos, sd2 = ground.sd; ground.geo.setDrawRange(0, n);   // làn tuyết cuộn sát đất
        for (let i = 0; i < n; i++) {
          const s = ground.sp * (0.7 + hash(i, sd2 + 3) * 0.6), ph = hash(i, sd2 + 4) * 6.283;
          pos[i * 3] = c[0] + wrap((hash(i, sd2 + 1) - 0.5) * ax + wind * s * G, ax) - ax / 2;
          pos[i * 3 + 2] = c[2] + wrap((hash(i, sd2 + 2) - 0.5) * az + wz * s * G, az) - az / 2;
          pos[i * 3 + 1] = gy + 0.3 + hash(i, sd2) * 2.6 + Math.sin(t * 1.7 + ph) * 0.5;
        }
        ground.geo.attributes.position.needsUpdate = true; }
    },
  };
}

function flakeTex(THREE) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv);
}

// Mưa: đoạn thẳng nghiêng rơi nhanh
export function fxRain(THREE, { count = 1800, area = [90, 60, 90], speed = 55, len = 2.2, slant: slant0 = [0.25, 0.1], color = '#a9c4e8', seed = 2 } = {}) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(count * 6);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }));
  obj.name = 'fx_rain'; obj.frustumCulled = false;
  const R = {
    obj,
    slant: null,   // ghi đè độ xiên [x, z] (gió — engine/seaweather.js); null ⇒ slant lúc tạo
    update(t, c = [0, 0, 0]) {
      const [ax, ay, az] = area, slant = R.slant || slant0;
      for (let i = 0; i < count; i++) {
        const fall = (hash(i, seed) * ay + t * speed * (0.8 + hash(i, seed + 4) * 0.4)) % ay;
        const y = ay - fall, x = (hash(i, seed + 1) - 0.5) * ax + slant[0] * fall, z = (hash(i, seed + 2) - 0.5) * az + slant[1] * fall;
        pos.set([c[0] + x, c[1] + y, c[2] + z, c[0] + x - slant[0] * len, c[1] + y + len, c[2] + z - slant[1] * len], i * 6);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
  return R;
}

// Bụi bùng (một lần) tại các điểm, t0 = lúc chạm đất
// Nâng cấp (góp ý 2026-11-12 #4): hạt MỀM nhiều lớp (vòng bụi sát đất lăn ra → cụm bùng lên → sợi mảnh bay cao), mỗi hạt
// phình to + nhạt dần + ngả từ nâu sẫm sang be; ảnh hạt là đám mây nhiễu (không phải đĩa tròn). Mỗi burst có thể ghi
// { tone: 0.5..1 } (độ sáng bụi; đêm ≈ 0.5) và { scale } (cỡ). count = số hạt cho MỖI burst (tối đa 6 burst).
function puffTex(THREE) {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const img = g.createImageData(S, S);
  const lobes = Array.from({ length: 9 }, (_, i) => { const a = hash(i, 71) * 6.283, r = hash(i, 72) * 0.28; return [0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r, 0.16 + hash(i, 73) * 0.16, 0.5 + hash(i, 74) * 0.5]; });
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S; let d = 0;
    for (const [cx, cy, rr, w] of lobes) { const q = Math.hypot(u - cx, v - cy) / rr; d += w * Math.exp(-q * q * 1.6); }
    const edge = Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * 2); const a = Math.min(1, d * 0.75) * Math.pow(edge, 0.7);
    const o = (y * S + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = 255; img.data[o + 3] = Math.round(a * 255);
  }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function fxDust(THREE, { count = 160, color = '#a89677', seed = 5, life = 2.3, spread = 11, rise = 4.5, size = 4.2, maxBursts = 6 } = {}) {
  const per = Math.max(60, Math.round(count * 0.6)), N = per * maxBursts;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), aA = new Float32Array(N), aS = new Float32Array(N), aC = new Float32Array(N * 3), aR = new Float32Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(aA, 1)); geo.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aC, 3)); geo.setAttribute('aRot', new THREE.BufferAttribute(aR, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: puffTex(THREE) }, uScale: { value: 960 } },
    vertexShader: 'attribute float aAlpha; attribute float aSize; attribute float aRot; attribute vec3 aColor; uniform float uScale; varying float vA; varying vec3 vC; varying float vR; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aSize * uScale / max(0.5, -mv.z), 0.0, 380.0); vA = aAlpha; vC = aColor; vR = aRot; }',
    fragmentShader: 'uniform sampler2D map; varying float vA; varying vec3 vC; varying float vR; void main(){ vec2 c = gl_PointCoord - 0.5; float s = sin(vR), co = cos(vR); vec2 uv = vec2(co*c.x - s*c.y, s*c.x + co*c.y) + 0.5; vec4 t = texture2D(map, uv); gl_FragColor = vec4(vC * (0.82 + 0.3 * t.a), t.a * vA);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false,
  });
  const obj = new THREE.Points(geo, mat); obj.name = 'fx_dust'; obj.frustumCulled = false; obj.renderOrder = 5;
  const c0 = new THREE.Color(color), cDark = new THREE.Color('#6d604b'), cl = new THREE.Color();
  return {
    obj,
    // bursts: [{ at:[x,y,z], t0, tone?, scale? }]
    update(t, bursts = [], { scale = 960 } = {}) {
      mat.uniforms.uScale.value = scale; let vis = 0;
      for (let e = 0; e < maxBursts; e++) {
        const b = bursts[e]; const k = b ? (t - b.t0) / life : -1; const live = !!b && k >= 0 && k <= 1;
        const tone = b?.tone ?? 1, sc = b?.scale ?? 1; if (live) vis++;
        const eo = 1 - Math.pow(1 - k, 2.6);
        for (let j = 0; j < per; j++) {
          const i = e * per + j, s = seed + e * 3;
          if (!live) { aA[i] = 0; aS[i] = 0; pos[i * 3 + 1] = -999; continue; }
          const h0 = hash(j, s), h1 = hash(j, s + 1), h2 = hash(j, s + 2), h3 = hash(j, s + 3), h4 = hash(j, s + 4);
          const layer = j % 5 === 0 ? 2 : j % 5 < 3 ? 1 : 0;     // 0 vòng sát đất · 1 cụm giữa · 2 sợi mảnh bay cao
          const a = h0 * Math.PI * 2 + Math.sin(k * 2 + h3 * 6) * 0.15;
          const reach = (layer === 0 ? 0.55 + h1 * 0.45 : layer === 1 ? 0.25 + h1 * 0.5 : 0.1 + h1 * 0.5) * spread * sc;
          const r = reach * eo + Math.sin(k * 3 + h2 * 6) * 0.4;
          pos[i * 3] = b.at[0] + Math.cos(a) * r + k * k * 1.6;           // gió đẩy nhẹ sang +x
          pos[i * 3 + 2] = b.at[2] + Math.sin(a) * r;
          const hmax = layer === 0 ? 0.5 + h2 * 1.1 : layer === 1 ? 1.2 + h2 * rise * 0.6 : 2.2 + h2 * rise;
          pos[i * 3 + 1] = b.at[1] + 0.3 + hmax * Math.sin(Math.min(1, k * 1.1) * Math.PI * 0.55) * sc + k * (layer + 0.5) * 0.9;
          aS[i] = size * sc * (layer === 2 ? 0.6 : layer === 1 ? 1.0 : 0.85) * (0.45 + 1.15 * Math.pow(k, 0.6)) * (0.65 + h3 * 0.7);
          aA[i] = (layer === 2 ? 0.2 : layer === 1 ? 0.36 : 0.42) * Math.pow(1 - k, 1.7) * Math.min(1, (t - b.t0) / 0.06) * (0.6 + h4 * 0.6);
          cl.copy(cDark).lerp(c0, Math.min(1, 0.35 + k * 0.5 + h4 * 0.3)).multiplyScalar(tone);
          aC[i * 3] = cl.r; aC[i * 3 + 1] = cl.g; aC[i * 3 + 2] = cl.b; aR[i] = h4 * 6.283 + k * (h0 - 0.5) * 2;
        }
      }
      for (const a of ['position', 'aAlpha', 'aSize', 'aColor', 'aRot']) geo.attributes[a].needsUpdate = true;
      obj.visible = vis > 0;
    },
  };
}

// Bưu thiếp rơi/tung: InstancedMesh, mỗi tấm bay theo quỹ đạo parabol + xoay; t0 = lúc tung
export function fxCards(THREE, { count = 40, seed = 7, kind = 'island', w = 1.6 } = {}) {
  // lưới 12×8 ô để UỐN được; uSoft = 0 (mặc định) → phẳng y hệt cũ. soft > 0 (shot ghi fx.cards.soft): uốn cong + lay như giấy,
  // hàm thuần của (t, phase theo tấm) — đỉnh uốn trong vertex shader, pháp tuyến tính lại bằng sai phân.
  const geo = new THREE.PlaneGeometry(w, w * 0.7, 12, 8);
  const aSoft = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);   // (phase, uốn cong, lay)
  for (let i = 0; i < count; i++) aSoft.setXYZ(i, hash(i, seed + 5) * 6.2832, 1, 1);
  geo.setAttribute('aSoft', aSoft);
  const SU = { uSoft: { value: 0 }, uSoftT: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ map: postcardTexture(THREE, kind), side: THREE.DoubleSide, roughness: 0.9 });
  const SOFT_Z = /* glsl */`
    uniform float uSoft, uSoftT; attribute vec3 aSoft;
    float cardZ(vec2 q) {
      float u = q.x / ${w.toFixed(3)}, v = q.y / ${(w * 0.7).toFixed(3)}, ph = aSoft.x, T = uSoftT;
      float c1 = 0.55 + 0.45 * sin(T * 2.3 + ph);                              // cong dọc theo bề ngang (hai mép vồng lên)
      float z = (u * u - 0.06) * ${w.toFixed(3)} * 0.75 * c1 * aSoft.y;
      float dg = max(0.0, u * 0.9 + v * 0.7 + 0.1 * sin(T * 1.7 + ph * 2.0));   // góc chéo cong như giấy bị lật
      z += dg * dg * ${w.toFixed(3)} * 0.9 * sin(T * 1.9 + ph * 1.3) * aSoft.y;
      z += 0.05 * ${w.toFixed(3)} * sin(u * 5.0 + v * 2.0 + T * 7.0 + ph) * aSoft.z;   // gợn lay
      return z * uSoft;
    }`;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, SU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + SOFT_Z)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      { float e = 0.02; float z0 = cardZ(position.xy); float dx = cardZ(position.xy + vec2(e, 0.0)) - z0, dy = cardZ(position.xy + vec2(0.0, e)) - z0;
        objectNormal = normalize(vec3(-dx / e, -dy / e, 1.0)); }`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.z += cardZ(position.xy);');
  };
  mat.customProgramCacheKey = () => 'fx_cards_soft';
  const obj = new THREE.InstancedMesh(geo, mat, count); obj.name = 'fx_cards'; obj.castShadow = true; obj.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  return {
    obj,
    update(t, { at = [0, 0, 0], t0 = 0, up = 6, out = 6, ground = 0, flutter = 1, soft = 0 } = {}) {
      const dt = Math.max(0, t - t0);
      SU.uSoft.value = soft; SU.uSoftT.value = t;
      for (let i = 0; i < count; i++) {
        const a = hash(i, seed) * Math.PI * 2, sp = out * (0.4 + hash(i, seed + 1) * 0.8), vu = up * (0.5 + hash(i, seed + 2));
        const drag = 1 - Math.exp(-dt * 1.2);
        let y = at[1] + vu * Math.min(dt, 0.6) - 0.5 * 9 * Math.max(0, Math.min(dt, 0.6)) ** 2 - Math.max(0, dt - 0.6) * 2.2;
        y = Math.max(ground + 0.05 + i * 0.002, y);
        p.set(at[0] + Math.cos(a) * sp * drag + Math.sin(dt * 3 + i) * 0.4 * flutter, y, at[2] + Math.sin(a) * sp * drag);
        const landed = y <= ground + 0.06 + i * 0.002;
        e.set(landed ? -Math.PI / 2 : dt * (2 + hash(i, seed + 3) * 4), hash(i, seed + 4) * 6 + (landed ? 0 : dt * 2), landed ? 0 : dt * 3);
        q.setFromEuler(e); m.compose(p, q, s); obj.setMatrixAt(i, m);
        aSoft.setY(i, landed ? 0.45 : 1); aSoft.setZ(i, landed ? 0.1 : 1);   // nằm đất: cong nhẹ, gần hết lay
      }
      aSoft.needsUpdate = true;
      obj.instanceMatrix.needsUpdate = true;
    },
  };
}

// Độ sáng tia chớp tại t: các nháy ngắn có seed (0..1)
export function lightning(t, { every = 3.1, seed = 3 } = {}) {
  const n = Math.floor(t / every), local = t - n * every, at = hash(n, seed) * (every - 0.5);
  const d = local - at; if (d < 0 || d > 0.35) return 0;
  return d < 0.06 ? 1 : d < 0.12 ? 0.3 : d < 0.18 ? 0.8 : Math.max(0, 1 - (d - 0.18) / 0.17) * 0.4;
}

// Tia chớp (đường gấp khúc) — hiển thị khi lightning(t) > 0.5
export function fxBolt(THREE, { seed = 4 } = {}) {
  const pts = []; let x = 0, y = 60; for (let i = 0; i < 14; i++) { pts.push(new THREE.Vector3(x, y, 0)); x += (hash(i, seed) - 0.5) * 8; y -= 4.5; }
  const obj = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#ffffff', fog: false }));
  obj.name = 'fx_bolt'; return obj;
}

// =====================================================================================================================
// Hiệu ứng "tự động" do đạo diễn (engine/shots.js) điều khiển: bụi/tuyết bốc ở chân nhà, hơi thở, dấu chân, gió thổi.
// Mọi thứ là hàm thuần của (sự kiện, t) — sự kiện do shots.js tính tất định từ pha bước của nhà.
// =====================================================================================================================
const PUFF_KINDS = {
  sand:   { color: '#e6d3a2', life: 1.3, spread: 9, rise: 4, size: 10, op: 0.85 },
  dirt:   { color: '#a69272', life: 1.25, spread: 8.5, rise: 3.8, size: 9.5, op: 0.8 },
  grass:  { color: '#b4bd96', life: 1.2, spread: 8, rise: 3.5, size: 9, op: 0.75 },
  snow:   { color: '#f8fbff', life: 1.7, spread: 10.5, rise: 6, size: 11, op: 0.95 },
  breath: { color: '#eaf3ff', life: 1.7, spread: 1.6, rise: 0.9, size: 0.85, op: 0.6, cone: true },
};

export function fxPuffs(THREE, { maxEvents = 36, per = 22, seed = 11 } = {}) {
  const PER3 = per * 3, N = maxEvents * PER3;   // bộ đệm gấp 3 để hơi thở có thể dày hơn (globalThis.__breathK > 1)
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), aA = new Float32Array(N), aS = new Float32Array(N), aC = new Float32Array(N * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(aA, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: dot(THREE) }, uScale: { value: 960 } },
    vertexShader: 'attribute float aAlpha; attribute float aSize; attribute vec3 aColor; uniform float uScale; varying float vA; varying vec3 vC; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(0.0, aSize * uScale / -mv.z); vA = aAlpha; vC = aColor; }',
    fragmentShader: 'uniform sampler2D map; varying float vA; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false,
  });
  const obj = new THREE.Points(geo, mat); obj.name = 'fx_puffs'; obj.frustumCulled = false; obj.renderOrder = 5;
  const col = new THREE.Color();
  return {
    obj,
    // events: [{ at:[x,y,z], t0, kind, dir?:[x,y,z] }]; scale = renderer.height/2; light = hệ số sáng (đêm < 1)
    update(t, events = [], { scale = 960, light = 1 } = {}) {
      mat.uniforms.uScale.value = scale;
      // độ dày hơi thở theo shot (góp ý #17): shot đặt globalThis.__breathK (1 = cũ); đọc 1 lần rồi trả về 1
      const bk = events.some((q) => q.kind === 'breath') ? Math.max(1, globalThis.__breathK || 1) : 1; if (bk > 1) globalThis.__breathK = 1;
      const bt = Math.min(1, (bk - 1) / 2);
      const ev = events.length > maxEvents ? events.slice(events.length - maxEvents) : events;
      let vis = 0;
      for (let e = 0; e < maxEvents; e++) {
        const E = ev[e], K = E && PUFF_KINDS[E.kind || 'dirt'];
        const age = E ? t - E.t0 : -1, k = E ? age / K.life : -1;
        const live = !!E && k >= 0 && k <= 1;
        let cr = 1, cg = 1, cb = 1;
        if (live) { col.set(K.color); cr = col.r * light; cg = col.g * light; cb = col.b * light; vis++; }
        const jn = K && K.cone ? Math.round(per * (1 + 2 * bt)) : per;
        for (let j = 0; j < PER3; j++) {
          const i = e * PER3 + j, s = seed + (e * 13) % 7;
          if (!live || j >= jn) { aA[i] = 0; aS[i] = 0; pos[i * 3 + 1] = -999; continue; }
          const h0 = hash(j, s), h1 = hash(j, s + 1), h2 = hash(j, s + 2), h3 = hash(j, s + 3);
          const eo = 1 - Math.pow(1 - k, 3);
          if (K.cone) {
            const d = E.dir || [0, 0, 1], r = K.spread * (1 + 0.5 * bt) * eo * (0.45 + h0 * 0.7);
            pos[i * 3] = E.at[0] + d[0] * r + (h1 - 0.5) * 0.5 * eo;
            pos[i * 3 + 1] = E.at[1] + d[1] * r + K.rise * k * (0.3 + h2) + (h3 - 0.5) * 0.3;
            pos[i * 3 + 2] = E.at[2] + d[2] * r + (h2 - 0.5) * 0.5 * eo;
          } else {
            const a = h0 * Math.PI * 2, r = (0.25 + h1 * 0.75) * K.spread * eo;
            pos[i * 3] = E.at[0] + Math.cos(a) * r; pos[i * 3 + 2] = E.at[2] + Math.sin(a) * r;
            pos[i * 3 + 1] = E.at[1] + 0.5 + h2 * K.rise * Math.sin(Math.min(1, k * 1.15) * Math.PI * 0.75) + k * 1.2;
          }
          const dense = K.cone ? 1 + 0.15 * bt : 1;
          aS[i] = K.size * dense * (0.45 + 0.9 * k) * (0.6 + h3 * 0.8);
          aA[i] = K.op * (K.cone ? 1 - 0.3 * bt : 1) * Math.pow(1 - k, 1.4) * Math.min(1, age / 0.05);
          aC[i * 3] = cr; aC[i * 3 + 1] = cg; aC[i * 3 + 2] = cb;
        }
      }
      for (const a of ['position', 'aAlpha', 'aSize', 'aColor']) geo.attributes[a].needsUpdate = true;
      obj.visible = vis > 0;
    },
  };
}

// Dấu chân lõm trên tuyết/đất: mọc ra trong 0.12s tại t0 rồi ở lại. events: [{ at:[x,y,z], yaw, t0 }]
export function fxPrints(THREE, { max = 96, size = 8, color = '#7d8fb4', opacity = 0.92 } = {}) {
  // Vết LÕM thật (góp ý 2026-11-12 #15): mặt nạ hình chân → làm mờ 2 cỡ → trường cao độ h = G_lớn·0.62 − G_nhỏ
  // (trong vết âm = lõm, ngay ngoài mép dương = đất đùn lên) → bake normalMap (Sobel) + map tối trong lòng/sáng ở viền + alphaMap mềm.
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S); g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(64, 50, 30, 27, 0, 0, Math.PI * 2); g.fill();                      // gót tròn
  for (const a of [-0.55, 0, 0.55]) { g.save(); g.translate(64 + Math.sin(a) * 42, 66 + Math.cos(a) * 28); g.rotate(-a); g.beginPath(); g.ellipse(0, 12, 6, 15, 0, 0, Math.PI * 2); g.fill(); g.restore(); }   // 3 móng (+Z cục bộ = đáy ảnh)
  const mask = new Float32Array(S * S), id0 = g.getImageData(0, 0, S, S).data;
  for (let i = 0; i < S * S; i++) mask[i] = id0[i * 4] / 255;
  const blur = (src, r) => { const out = new Float32Array(S * S), tmp = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let s = 0; for (let d = -r; d <= r; d++) s += src[y * S + Math.min(S - 1, Math.max(0, x + d))]; tmp[y * S + x] = s / (2 * r + 1); }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let s = 0; for (let d = -r; d <= r; d++) s += tmp[Math.min(S - 1, Math.max(0, y + d)) * S + x]; out[y * S + x] = s / (2 * r + 1); }
    return out; };
  const gs = blur(blur(mask, 2), 2), gl = blur(blur(mask, 6), 6), H = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) H[i] = gl[i] * 0.62 - gs[i];
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); return [c, x, x.createImageData(S, S)]; };
  const [ncv, nx, nimg] = mk(), [mcv, mctx, mimg] = mk(), [acv, ax, aimg] = mk();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, hx = H[y * S + Math.min(S - 1, x + 1)] - H[y * S + Math.max(0, x - 1)], hy = H[Math.min(S - 1, y + 1) * S + x] - H[Math.max(0, y - 1) * S + x];
    let nxv = -hx * 7, nyv = hy * 7, nzv = 1; const l = Math.hypot(nxv, nyv, nzv); nxv /= l; nyv /= l; nzv /= l;   // nyv: UV y lên = −Z thế giới (đáy ảnh = +Z cục bộ)
    const o = i * 4; nimg.data[o] = (nxv * 0.5 + 0.5) * 255; nimg.data[o + 1] = (nyv * 0.5 + 0.5) * 255; nimg.data[o + 2] = (nzv * 0.5 + 0.5) * 255; nimg.data[o + 3] = 255;
    const v = Math.max(0.28, Math.min(1, 0.78 + H[i] * 1.5)); mimg.data[o] = mimg.data[o + 1] = mimg.data[o + 2] = v * 255; mimg.data[o + 3] = 255;
    const edge = Math.max(0, 1 - Math.hypot(x / S - 0.5, y / S - 0.5) * 2.1), a = Math.min(1, gl[i] * 2.4 + Math.max(0, H[i]) * 2) * Math.min(1, edge * 4);
    aimg.data[o] = aimg.data[o + 1] = aimg.data[o + 2] = a * 255; aimg.data[o + 3] = 255;
  }
  nx.putImageData(nimg, 0, 0); mctx.putImageData(mimg, 0, 0); ax.putImageData(aimg, 0, 0);
  const am = new THREE.CanvasTexture(acv), nm = new THREE.CanvasTexture(ncv), mm = new THREE.CanvasTexture(mcv); mm.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(size, size); geo.rotateX(-Math.PI / 2);
  const m = new THREE.MeshStandardMaterial({ color, map: mm, normalMap: nm, normalScale: new THREE.Vector2(1.6, 1.6), alphaMap: am, transparent: true, opacity, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const obj = new THREE.InstancedMesh(geo, m, max); obj.name = 'fx_prints'; obj.frustumCulled = false; obj.receiveShadow = true; obj.renderOrder = 2;
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  return {
    obj,
    update(t, events = [], { y = 0.08, tint = color } = {}) {
      m.color.set(tint);
      const ev = events.length > max ? events.slice(events.length - max) : events;
      let n = 0;
      for (const E of ev) {
        const k = (t - E.t0) / 0.12; if (k < 0) continue;
        const sc = 0.55 + 0.45 * Math.min(1, k);
        q.setFromAxisAngle(up, E.yaw); p.set(E.at[0], (E.at[1] || 0) + y, E.at[2]); s.set(sc, 1, sc);
        mx.compose(p, q, s); obj.setMatrixAt(n++, mx);
      }
      obj.count = n; obj.instanceMatrix.needsUpdate = true; obj.visible = n > 0;
    },
  };
}

// fxWind: ĐÃ BỎ hiệu ứng vệt gió (người dùng chốt). Giữ API để code cũ không lỗi; không vẽ gì.
// "Gió" nay = bông tuyết rơi của fxSnow trôi ngang theo cơn giật (bật/tắt qua globalThis.__autoFx.wind).
export function fxWind(THREE) {
  const obj = new THREE.Group(); obj.name = 'fx_wind'; obj.visible = false;
  return { obj, gustAt: (t) => 0.3 + 0.7 * (Math.sin(t * 0.9) * 0.5 + 0.5), update() { obj.visible = false; } };
}
