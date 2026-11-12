// backdrop.js — NÚI XA "VẼ MỘT LẦN" (kiểu Painted Valley): 3 dãy núi (đồi gần, dãy chính, dãy xa nhạt) vẽ vào MỘT dải panorama
// rồi dán lên một ống trụ mở bao quanh camera, đi theo camera như skybox. 1 ShaderMaterial = 1 program, không đổ bóng, không fog của three.
//
// Cách dùng:
//   const bd = createBackdrop(THREE, { seed: 4, radius: 900, base: -30, height: 380, ranges: 3, snow: 0.8, sunAz: 0.9,
//                                      palette: { rockLit: '#b09a7e', rockShade: '#4e5272', snowLit: '#ffffff', snowShade: '#9fb2d6', trees: '#2f5a33' } });
//   scene.add(bd.group);
//   bd.lightFrom(sun, hemi);  bd.fogFrom(scene.fog);       // ánh sáng + sương từ cảnh (chia π như grass.js/farwoods.js); gọi lại khi đổi shot
//   mỗi khung:  bd.update(t, camera);                       // hàm thuần: chỉ dời ống trụ tới (x,z) camera, giữ y = base
//   bd.set({ palette, haze, visible, sunDir, sunColor, skyColor }) · bd.dispose() · bd.buildMs = giờ vẽ lúc tạo (ms)
// Vẽ trên CPU lúc tạo (seed, tất định): dải RGBA 4096×512 — R = độ sáng dưới nắng CỐ ĐỊNH (sunAz/sunEl, mặt phẳng có bậc như tranh),
//   G = tuyết (0..0.4), 0.5 = trung tính (đá gần tán cây), hoặc tán cây (0.6..1 = độ sáng tán), B = sương/không khí (dãy xa → nhiều; gần chân → nhiều), A = mặt nạ núi/trời.
//   Lúc chạy KHÔNG vẽ lại: ánh sáng chỉ nhân theo màu/cường độ nắng, màu sương theo fog → ngày/đêm/bão không cần vẽ lại.
// Ống trụ ghim ở mặt phẳng xa (z = w) nên không bao giờ bị camera.far cắt; đất/vật gần vẫn che nó (depthTest). renderOrder = -20 (sau đồ đặc,
//   trước trong suốt khác). Chân ống mờ dần vào màu sương để gặp đường chân trời không thấy mép. Góc phương vị: x = cos a, z = sin a (a = atan2(z, x)).
// Không Math.random, không đồng hồ.
import * as THREE_NS from 'three';
import { makeNoise2D, fbm } from './winter.js';

const TAU = Math.PI * 2;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash3 = (i, j, k) => { let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(k | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// top = đỉnh cao nhất (phần chiều cao ống), k = tần số gờ, hz = sương nền, ribF = bề rộng mặt phẳng
const RANGES = [
  { top: 0.21, k: 3.4, bumps: 0, hz: 0.04, ribF: 20, snowK: 0, trees: true },
  { top: 0.78, k: 1.7, bumps: 5, hz: 0.30, ribF: 26, snowK: 1 },
  { top: 0.72, k: 1.5, bumps: 4, hz: 0.70, ribF: 22, snowK: 0.8 },
  { top: 0.40, k: 2.6, bumps: 2, hz: 0.78, ribF: 20, snowK: 0.5 },
];

function paint(THREE, P) {
  const W = P.width, H = P.height, n = P.ranges, R = P.radius, HM = P.heightM;
  const data = new Uint8Array(W * H * 4);
  const sa = P.sunAz, se = (P.sunEl * Math.PI) / 180, cosE = Math.cos(se), sinE = Math.sin(se);
  const rng = mulberry32(P.seed * 7919 + 101);
  const rngs = RANGES.slice(0, n);
  // ---- 1D profile mỗi dãy (quấn kín 360°: lấy mẫu noise 2D trên vòng tròn) ----
  const prof = rngs.map((cfg, r) => {
    const noise = makeNoise2D(P.seed * 131 + r * 17 + 1), noise2 = makeNoise2D(P.seed * 53 + r * 29 + 7);
    const bumps = [];
    for (let b = 0; b < cfg.bumps; b++) bumps.push({ a: (b + rng() * 0.9) / cfg.bumps * TAU, w: 0.09 + 0.12 * rng(), amp: 0.62 + 0.38 * rng() });
    const h = new Float32Array(W);
    for (let j = 0; j < W; j++) {
      const a = (j / W) * TAU, cx = Math.cos(a), cy = Math.sin(a);
      const ridge = Math.max(0, (fbm(noise, cx * cfg.k, cy * cfg.k, 6, true) - 0.14) / 0.5);
      const low = fbm(noise2, cx * 0.9 + 3, cy * 0.9 - 2, 3) * 0.5 + 0.5;               // bao dáng thấp: tạo đèo giữa các đỉnh
      let bump = 0;
      for (const b of bumps) { let d = Math.abs(a - b.a); d = Math.min(d, TAU - d); bump = Math.max(bump, b.amp * Math.exp(-((d / b.w) ** 2))); }
      const body = cfg.bumps ? 0.42 * ridge * (0.45 + 0.8 * low) + 0.7 * bump * (0.55 + 0.45 * ridge) : 0.8 * ridge * (0.5 + 0.7 * low);
      h[j] = body + 0.03 * clamp(fbm(noise2, cx * 14, cy * 14, 3, true));
    }
    let mx = 1e-6; for (let j = 0; j < W; j++) mx = Math.max(mx, h[j]);
    for (let j = 0; j < W; j++) {
      const a = (j / W) * TAU, dip = r === 1 ? 0.62 + 0.38 * clamp(fbm(noise2, Math.cos(a) * 0.8 + 11, Math.sin(a) * 0.8 + 5, 2) * 1.3 + 0.5) : 1;   // dãy chính thấp xuống ở vài hướng → dãy xa lộ ra
      h[j] = (0.08 + 0.92 * Math.pow(h[j] / mx, 1.35)) * dip;   // mũ >1 → sườn rộng, đỉnh nhọn, có đèo
    }
    let m2 = 1e-6; for (let j = 0; j < W; j++) m2 = Math.max(m2, h[j]);
    for (let j = 0; j < W; j++) h[j] *= cfg.top / m2;                                     // cao nhất = top
    // dốc đã làm mượt (±~1.5°) → "phía" của đỉnh gần nhất, không nhảy theo từng cột
    const rad = Math.round(W * 0.0045), hsm = new Float32Array(W);
    for (let j = 0; j < W; j++) { let sum = 0; for (let k = -rad; k <= rad; k++) sum += h[(j + k + W) % W]; hsm[j] = sum / (2 * rad + 1); }
    const side = new Float32Array(W);
    for (let j = 0; j < W; j++) side[j] = Math.tanh(1.8 * ((hsm[(j + 1) % W] - hsm[(j + W - 1) % W]) / (2 * TAU / W)) * HM / R);
    return { cfg, h, side, noise: makeNoise2D(P.seed * 977 + r * 41 + 3), noiseB: makeNoise2D(P.seed * 331 + r * 43 + 5) };
  });

  // ---- tán cây tròn cho chân đồi gần (ô lưới so le, elip vì 1 hàng ≠ 1 cột về góc nhìn) ----
  const CW = 5, CH = 9;
  const crownAt = (j, i, hpx, sT, sR) => {
    let best = -1, bestY = 1e9;
    const cj0 = Math.floor(j / CW), ci0 = Math.floor(i / CH);
    for (let ci = ci0 - 1; ci <= ci0 + 1; ci++) for (let cj = cj0 - 1; cj <= cj0 + 1; cj++) {
      const hs = hash3(cj, ci, 7);
      const cxp = (cj + 0.5 + (ci & 1) * 0.5 + (hs - 0.5) * 0.6) * CW, cyp = (ci + 0.5 + (hash3(cj, ci, 11) - 0.5) * 0.6) * CH;
      const rx = 2.6 + 0.9 * hash3(cj, ci, 3), ry = rx * 1.9;
      const wc = ((Math.floor(cxp) % W) + W) % W;
      if (cyp > hpx[wc] * 0.9 || cyp < 2) continue;                                       // gốc tán phải nằm dưới gờ + dưới ranh giới cây
      const dx = (j + 0.5 - cxp) / rx, dy = (i + 0.5 - cyp) / ry, d2 = dx * dx + dy * dy;
      if (d2 >= 1 || cyp >= bestY) continue;
      const nz = Math.sqrt(1 - d2);
      best = clamp(0.5 + 0.55 * (dx * sT + dy * sinE - nz * sR + 0.25)); bestY = cyp;
    }
    return best;
  };

  const set = (j, i, rr, gg, bb, aa) => { const o = (i * W + j) * 4; data[o] = rr * 255 + 0.5; data[o + 1] = gg * 255 + 0.5; data[o + 2] = bb * 255 + 0.5; data[o + 3] = aa * 255 + 0.5; };
  const dA = TAU / W;
  const hpxs = prof.map((p) => { const a = new Float32Array(W); for (let j = 0; j < W; j++) a[j] = p.h[j] * H; return a; });
  for (let j = 0; j < W; j++) {
    const a = (j / W) * TAU;
    const sT = Math.sin(sa - a) * cosE, sR = Math.cos(sa - a) * cosE;                     // thành phần nắng: tiếp tuyến (tăng a) và hướng ra xa tâm
    for (let r = n - 1; r >= 0; r--) {
      const p = prof[r], cfg = p.cfg, hpx = hpxs[r][j];
      const j0 = (j + W - 1) % W, j1 = (j + 1) % W;
      const sl = ((p.h[j1] - p.h[j0]) / (2 * dA)) * HM / R;                               // độ dốc thế giới (dy/ds)
      const phi = Math.atan(sl * 0.8), nT0 = -Math.sin(phi), nIn0 = Math.cos(phi) * 0.8;
      const topI = Math.min(H - 1, Math.floor(hpx) + (cfg.trees ? 10 : 0));
      const snowLine = cfg.top * (1.02 - 0.82 * P.snow) * (cfg.snowK ? 1 : 9);
      for (let i = 0; i <= topI; i++) {
        let aa = i + 1 <= hpx ? 1 : clamp(hpx - i);
        let tree = -1;
        if (cfg.trees) { tree = crownAt(j, i, hpxs[0], sT, sR); if (tree >= 0) aa = 1; }
        if (aa <= 0) continue;
        const yrel = clamp(i / Math.max(hpx, 1));
        const air = clamp(cfg.hz * (0.55 + 0.45 * (1 - yrel)) + 0.22 * Math.pow(1 - yrel, 2.2));
        if (tree >= 0) { set(j, i, tree, 0.6 + 0.4 * tree, air, 1); continue; }
        // mặt phẳng: sườn (dốc) + gờ sống lưng ngẫu nhiên lượng tử hoá → bậc sáng/tối sạch như tranh
        // trường cao độ giả 2D: gờ chạy theo đường dốc nhất xuống từ đỉnh (a' = a + phía·độ sâu), mặt phẳng LỚN (~3°), 3 tông mép mềm
        const dm = (hpx - i) * HM / H, sd = p.side[j];
        const ap = a + sd * dm / R * 1.2;
        const dv = (hpx - i) / H * 2.2;
        const rib = p.noise(ap * cfg.ribF, dv) * 0.8 + p.noise(ap * cfg.ribF * 2.1 + 9, dv * 1.8 + 3) * 0.2;
        const rq = sstep(-0.3, -0.18, rib) + sstep(0.18, 0.3, rib) - 1;                  // -1 / 0 / +1 với mép mềm
        const gully = sstep(0.12, 0.3, -rib);                                              // rãnh: tuyết kéo dài xuống
        const nT = nT0 * 0.5 + rq * 0.9 * (0.3 + 0.7 * yrel), nY = 0.2 + 0.7 * Math.pow(1 - yrel, 1.3), nIn = nIn0;
        const inv = 1 / Math.hypot(nT, nY, nIn);
        const L = (nT * sT + nY * sinE - nIn * sR) * inv;                                 // -nIn*sR: mặt hướng vào tâm đón nắng khi nắng ở phía trước
        const lx = clamp(0.48 + 0.75 * L) * 4, lf = Math.floor(lx), lit = (lf + sstep(0.4, 0.6, lx - lf)) / 4;   // 4 tông, mép mềm
        let snow = 0;
        if (cfg.snowK && P.snow > 0) {
          const y01 = i / H, jit = (0.06 * p.noiseB(ap * 9, dv * 2) - 0.1 * gully) * cfg.top;
          const gentle = 1 - 0.6 * sstep(0.5, 1.0, Math.abs(nT));
          snow = sstep(0.38, 0.62, sstep(snowLine - 0.05 * cfg.top, snowLine + 0.05 * cfg.top, y01 - jit) * (0.5 + 0.5 * gentle));
        }
        set(j, i, lit, cfg.trees ? 0.5 : snow * 0.4, air, aa);
      }
      // trời phía trên: chép đỉnh để mipmap/lọc không lẫn màu rác, A = 0 (chỉ làm ở dãy đầu tiên cho cột, sau cùng)
    }
    let top = H - 1; while (top > 0 && data[(top * W + j) * 4 + 3] === 0) top--;
    const o = (top * W + j) * 4;
    for (let i = top + 1; i < H; i++) { const q = (i * W + j) * 4; data[q] = data[o]; data[q + 1] = data[o + 1]; data[q + 2] = data[o + 2]; data[q + 3] = 0; }
  }
  return data;
}

const VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 p = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  p.z = p.w * 0.99999;               // ghim ở mặt phẳng xa như skybox
  gl_Position = p;
}
`;
const FRAG = /* glsl */`
uniform sampler2D tMap;
uniform vec3 uRockLit, uRockShade, uSnowLit, uSnowShade, uTrees, uSunDir, uSunColor, uSkyColor, uFogColor;
uniform float uHaze, uFoot;
varying vec2 vUv;
void main() {
  vec4 tx = texture2D(tMap, vUv);
  float al = smoothstep(0.3, 0.7, tx.a);
  if (al < 0.02) discard;
  float sunK = clamp(uSunDir.y * 0.7 + 0.35, 0.0, 1.0);
  vec3 sunL = uSunColor * 0.9 + uSkyColor * 0.5;
  float k = clamp(tx.r * sunK * 1.15, 0.0, 1.0);
  float tm = smoothstep(0.54, 0.58, tx.g);
  float snow = clamp(tx.g / 0.4, 0.0, 1.0) * (1.0 - smoothstep(0.42, 0.48, tx.g));
  vec3 rock = mix(uRockShade * uSkyColor, uRockLit * sunL, k);
  vec3 snw = mix(uSnowShade * uSkyColor, uSnowLit * sunL, k);
  vec3 tre = mix(uTrees * 0.35 * uSkyColor, uTrees * sunL, clamp((tx.g - 0.6) * 2.5 * sunK, 0.0, 1.0));
  vec3 col = mix(rock, snw, snow);
  col = mix(col, tre, tm);
  gl_FragColor = vec4(col, al);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  float haze = clamp(tx.b * uHaze, 0.0, 1.0);
  haze = max(haze, 1.0 - smoothstep(0.0, uFoot, vUv.y));       // chân ống chìm vào màu sương
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, haze);
}
`;

export function createBackdrop(THREE = THREE_NS, opts = {}) {
  const P = { seed: 1, radius: 900, base: -30, height: 380, ranges: 3, snow: 0.8, sunAz: 0.9, sunEl: 35, width: 4096, texHeight: 512, segments: 128, haze: 1, footM: 45, ...opts };
  P.ranges = Math.max(1, Math.min(4, P.ranges | 0));
  const pal = { rockLit: '#b09a7e', rockShade: '#4e5272', snowLit: '#ffffff', snowShade: '#9fb2d6', trees: '#2f5a33', ...(opts.palette || {}) };
  const t0 = (typeof performance !== 'undefined' ? performance.now() : 0);
  const data = paint(THREE, { ...P, heightM: P.height, width: P.width, height: P.texHeight });
  const tex = new THREE.DataTexture(data, P.width, P.texHeight, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true; tex.name = 'backdrop_panorama';
  const buildMs = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;

  const N = P.segments, pos = new Float32Array((N + 1) * 6), uv = new Float32Array((N + 1) * 4), idx = [];
  for (let s = 0; s <= N; s++) {
    const a = (s / N) * TAU, x = Math.cos(a) * P.radius, z = Math.sin(a) * P.radius;
    pos.set([x, 0, z, x, P.height, z], s * 6); uv.set([s / N, 0, s / N, 1], s * 4);
    if (s < N) { const b = s * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);

  const C = (c) => new THREE.Color(c);
  const uniforms = {
    tMap: { value: tex },
    uRockLit: { value: C(pal.rockLit) }, uRockShade: { value: C(pal.rockShade) }, uSnowLit: { value: C(pal.snowLit) }, uSnowShade: { value: C(pal.snowShade) }, uTrees: { value: C(pal.trees) },
    uSunDir: { value: new THREE.Vector3(Math.cos(P.sunAz), 0.7, Math.sin(P.sunAz)).normalize() }, uSunColor: { value: C('#fff2d8') }, uSkyColor: { value: C('#9db8d8') },
    uFogColor: { value: C('#bcd6ee') }, uHaze: { value: P.haze }, uFoot: { value: (P.footM - P.base) / P.height },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, transparent: true, depthWrite: false, depthTest: true, fog: false, name: 'backdrop_mat' });
  const mesh = new THREE.Mesh(geo, mat); mesh.name = 'backdrop'; mesh.frustumCulled = false; mesh.renderOrder = -20; mesh.castShadow = false; mesh.receiveShadow = false; mesh.userData.noAO = true;
  mesh.position.y = P.base;
  const group = new THREE.Group(); group.name = 'backdrop_group'; group.add(mesh);

  return {
    group, mesh, uniforms, buildMs,
    lightFrom(sun, hemi) {
      if (sun) { uniforms.uSunDir.value.copy(sun.position).sub(sun.target.position).normalize(); uniforms.uSunColor.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI); }
      if (hemi) uniforms.uSkyColor.value.copy(hemi.color).lerp(hemi.groundColor, 0.25).multiplyScalar(hemi.intensity / Math.PI * 1.8);
    },
    fogFrom(fog) { if (fog) uniforms.uFogColor.value.copy(fog.color); },
    update(t, camera) {
      const e = camera.matrixWorld.elements;
      mesh.position.set(e[12], P.base, e[14]);
    },
    set(p = {}) {
      const c = p.palette || {};
      if (c.rockLit) uniforms.uRockLit.value.set(c.rockLit); if (c.rockShade) uniforms.uRockShade.value.set(c.rockShade);
      if (c.snowLit) uniforms.uSnowLit.value.set(c.snowLit); if (c.snowShade) uniforms.uSnowShade.value.set(c.snowShade); if (c.trees) uniforms.uTrees.value.set(c.trees);
      if (p.sunDir) uniforms.uSunDir.value.copy(p.sunDir).normalize();
      if (p.sunColor) uniforms.uSunColor.value.copy(p.sunColor);
      if (p.skyColor) uniforms.uSkyColor.value.copy(p.skyColor);
      if (p.haze != null) uniforms.uHaze.value = p.haze;
      if (p.visible != null) group.visible = !!p.visible;
    },
    dispose() { geo.dispose(); mat.dispose(); tex.dispose(); group.removeFromParent(); },
  };
}
