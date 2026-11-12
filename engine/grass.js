// grass.js — CỎ INSTANCED, tất định, gió dùng chung (engine/wind.js). 1 ShaderMaterial (1 program) cho mọi vòng LOD.
//
// Cách dùng:
//   const wind  = createWind(THREE, { dir: [1, 0.3], speed: 5, gust: 0.7 });
//   const grass = createGrass(THREE, { wind, area: { center: [0, 0], size: 30 }, cell: 0.08, height: 0.35,
//                                      colors: { base: '#3f7d2f', tip: '#9fd36a' }, seed: 3, density: 1,
//                                      heightAt: (x, z) => 0, follow: true });
//   scene.add(grass.group);
//   grass.set({ sunDir: v3, sunColor: color, skyColor: color });   // ánh sáng đơn giản (không dùng đèn của three)
//   mỗi khung:  grass.update(t, camera);     // gọi wind.update(t); nếu follow: 2 vòng gần bám camera (bước = ô lưới → không nhảy cọng)
//   grass.set({ height, colors:{base,tip}, density(≤ lúc tạo), visible:false }) · grass.dispose()
// Mỗi cọng: vị trí lệch / cao / xoay / màu = hash SỐ NGUYÊN của (chỉ số ô thế giới, seed) → không mảng CPU theo cọng, không Math.random.
// Vòng: 'grass_ring_near' (ô = cell) · 'grass_ring_mid' (×2.2) · 'grass_ring_far' (×4.5, phủ cả vùng). Chuyển vòng bằng co chiều cao (không pop).
// Chiều cao nền: heightAt(x,z) nướng 1 lần vào DataTexture half-float (≤128²); mặc định phẳng 0. mesh.userData.noAO = true.
import * as THREE_NS from 'three';

const VERT = /* glsl */`
uniform vec2 uOrigin;   // chỉ số ô thế giới của góc ô (0,0) trong vòng
uniform float uCell, uHeight, uSeed, uKeep, uHScale, uWidthK;
uniform vec2 uRingC;    // tâm vòng (m)
uniform vec2 uInC;      // tâm vòng trong (cho đoạn "vào")
uniform vec4 uFade;     // vào(bắt đầu, xong) đo tới tâm vòng trong, ra(bắt đầu, xong) đo tới tâm vòng này — Chebyshev
uniform vec3 uArea;     // cx, cz, nửa cạnh (hoặc bán kính khi uRound = 1)
uniform float uRound;   // 1 = vùng tròn (area.round)
uniform vec4 uPushers[6];   // xyz = tâm bàn chân/thân (m, thế giới), w = bán kính (0 = không dùng) — cỏ rạp ra ngoài
uniform sampler2D tHeight; uniform vec4 uHRect;   // minx, minz, 1/size, 1/size
attribute vec2 aCell;
varying float vV; varying float vRand; varying float vGust; varying vec3 vN; varying float vCloud;
uint ph(uint v) { v = v * 747796405u + 2891336453u; uint w = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u; return (w >> 22u) ^ w; }
void cellRand(vec2 c, out vec4 a, out vec4 b) {
  uint h = ph(uint(int(c.x)) ^ ph(uint(int(c.y)) ^ ph(uint(int(uSeed)))));
  uint h1 = ph(h), h2 = ph(h1), h3 = ph(h2), h4 = ph(h3), h5 = ph(h4), h6 = ph(h5), h7 = ph(h6);
  a = vec4(float(h & 0xffffu), float(h1 & 0xffffu), float(h2 & 0xffffu), float(h3 & 0xffffu)) / 65535.0;
  b = vec4(float(h4 & 0xffffu), float(h5 & 0xffffu), float(h6 & 0xffffu), float(h7 & 0xffffu)) / 65535.0;
}
__WIND__
void main() {
  vec4 r, q; vec2 wc = uOrigin + aCell; cellRand(wc, r, q);
  vec2 p = (wc + 0.1 + 0.8 * r.xy) * uCell;
  float dc = max(abs(p.x - uRingC.x), abs(p.y - uRingC.y));
  float di = max(abs(p.x - uInC.x), abs(p.y - uInC.y));
  float da = mix(max(abs(p.x - uArea.x), abs(p.y - uArea.y)), length(p - uArea.xy), uRound);
  float fade = smoothstep(uFade.x, uFade.y, di) * (1.0 - smoothstep(uFade.z, uFade.w, dc)) * smoothstep(0.0, 1.2, uArea.z - da);
  float keep = step(q.z, uKeep);
  float h = uHeight * uHScale * (0.62 + 0.76 * r.w) * fade * keep;
  float y0 = texture2D(tHeight, (p - uHRect.xy) * uHRect.zw).r;
  float v = position.y, side = position.x;
  float ang = r.z * 6.2831853;
  vec2 right = vec2(cos(ang), sin(ang));
  float wid = uCell * uWidthK * (1.0 - 0.88 * pow(v, 1.4));
  vec2 lean = windBend(p, q.y);
  float na = q.w * 6.2831853;
  lean += vec2(cos(na), sin(na)) * 0.16 * q.x;                // nghiêng tự nhiên
  for (int i = 0; i < 6; i++) {                                 // cỏ bị chân đè rạp ra ngoài (kiểu Painted Valley)
    vec4 pu = uPushers[i];
    if (pu.w > 0.0) {
      vec2 d = p - pu.xz; float dl = length(d);
      float k = (1.0 - smoothstep(pu.w * 0.7, pu.w * 1.9, dl)) * (1.0 - smoothstep(y0 + h * 0.5, y0 + h + 0.12, pu.y - pu.w));
      lean += (dl > 1e-4 ? d / dl : vec2(1.0, 0.0)) * k * 0.95;
    }
  }
  float ll = length(lean); if (ll > 1.25) lean *= 1.25 / ll;     // chặn: cọng không lật xuống dưới đất
  float b = v * v;
  vec2 off = lean * h * b + right * side * wid;
  float L2 = min(dot(lean, lean), 1.6);
  float y = y0 + h * v * (1.0 - 0.38 * L2 * v);
  vec4 wp = vec4(p.x + off.x, y, p.y + off.y, 1.0);
  vec3 axis = normalize(vec3(lean.x * 2.0 * v, 1.0, lean.y * 2.0 * v));
  vN = normalize(cross(vec3(right.x, 0.0, right.y), axis));
  vV = v; vRand = q.x;
  vGust = gustAt(p) * uWind.w;
  vCloud = cloudOpen(p);                                      // bóng mây (wind.js) — chỉ che nắng
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const FRAG = /* glsl */`
uniform vec3 uBase, uTip, uSunDir, uSunColor, uSkyColor;
varying float vV; varying float vRand; varying float vGust; varying vec3 vN; varying float vCloud;
void main() {
  float v = vV;
  vec3 alb = mix(uBase, uTip, pow(v, 1.1));
  alb *= 0.82 + 0.36 * vRand;
  alb = mix(alb, alb * vec3(1.12, 1.0, 0.7), smoothstep(0.7, 1.0, vRand) * 0.5);
  alb *= mix(0.66, 1.28, vGust);                              // dải gió giật sáng/tối
  vec3 n = vN * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 nn = normalize(n + vec3(0.0, 0.9, 0.0));
  float ao = mix(0.32, 1.0, smoothstep(0.0, 0.55, v));
  float diff = max(dot(nn, uSunDir), 0.0);
  float trans = max(dot(-n, uSunDir), 0.0);                   // nắng xuyên qua lá từ phía sau
  vec3 col = alb * (uSkyColor * 0.55 * ao + uSunColor * vCloud * diff * 0.9 * mix(0.55, 1.0, ao)) + uTip * uSunColor * vCloud * trans * 0.4 * v;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createGrass(THREE = THREE_NS, opts = {}) {
  const { wind } = opts;
  if (!wind) throw new Error('createGrass: cần opts.wind (createWind)');
  const area = { center: [0, 0], size: 30, ...(opts.area || {}) };
  const P = { cell: 0.08, height: 0.35, seed: 1, density: 1, follow: false, ...opts };
  const colors = { base: '#3f7d2f', tip: '#9fd36a', ...(opts.colors || {}) };
  const half = area.size / 2, created = Math.max(0.05, P.density);
  const cellK = 1 / Math.sqrt(created);

  // ---- texture độ cao nền (nướng 1 lần) ----
  let hTex;
  if (opts.heightAt) {
    const R = Math.min(128, Math.max(8, Math.ceil(area.size / 0.5))), data = new Uint16Array(R * R);
    for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
      const x = area.center[0] - half + (i + 0.5) / R * area.size, z = area.center[1] - half + (j + 0.5) / R * area.size;
      data[j * R + i] = THREE.DataUtils.toHalfFloat(opts.heightAt(x, z));
    }
    hTex = new THREE.DataTexture(data, R, R, THREE.RedFormat, THREE.HalfFloatType);
  } else hTex = new THREE.DataTexture(new Uint16Array([0]), 1, 1, THREE.RedFormat, THREE.HalfFloatType);
  hTex.minFilter = hTex.magFilter = THREE.LinearFilter; hTex.wrapS = hTex.wrapT = THREE.ClampToEdgeWrapping; hTex.generateMipmaps = false; hTex.needsUpdate = true;
  const hRect = new THREE.Vector4(area.center[0] - half, area.center[1] - half, 1 / area.size, 1 / area.size);

  // ---- hình lá: 4 hàng + ngọn nhọn; position.x = bên (-0.5..0.5), position.y = v (0..1) ----
  const rows = 4, pos = [], idx = [];
  for (let i = 0; i < rows; i++) { const v = i / rows; pos.push(-0.5, v, 0, 0.5, v, 0); }
  pos.push(0, 1, 0);
  for (let i = 0; i < rows - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  { const a = (rows - 1) * 2; idx.push(a, a + 1, rows * 2); }
  const bladeIdx = new Uint16Array(idx), bladePos = new Float32Array(pos);

  // ---- vòng LOD ----
  const halves = [5, 10].filter((h) => h < half); halves.push(half);
  const cellMul = [1, 2.2, 4.5], hMul = [1, 1.05, 1.1], names = ['grass_ring_near', 'grass_ring_mid', 'grass_ring_far'];
  const group = new THREE.Group(); group.name = 'grass';
  const rings = [], shared = {
    uHeight: { value: P.height }, uSeed: { value: P.seed }, uKeep: { value: 1 },
    uArea: { value: new THREE.Vector3(area.center[0], area.center[1], half) }, uRound: { value: area.round ? 1 : 0 },
    tHeight: { value: hTex }, uHRect: { value: hRect },
    uPushers: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
    uBase: { value: new THREE.Color(colors.base) }, uTip: { value: new THREE.Color(colors.tip) },
    uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() }, uSunColor: { value: new THREE.Color('#fff2d8') }, uSkyColor: { value: new THREE.Color('#9db8d8') },
  };
  const vert = VERT.replace('__WIND__', wind.glsl);
  halves.forEach((hf, k) => {
    const last = k === halves.length - 1, cs = P.cell * cellMul[Math.min(k, 2)] * cellK;
    let n = Math.ceil(hf * 2 / cs); n += n & 1;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(bladePos, 3)); geo.setIndex(new THREE.BufferAttribute(bladeIdx, 1));
    const cells = new Float32Array(n * n * 2);
    for (let j = 0, o = 0; j < n; j++) for (let i = 0; i < n; i++, o += 2) { cells[o] = i; cells[o + 1] = j; }
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2)); geo.instanceCount = n * n;
    const prev = k ? halves[k - 1] : 0;
    const u = {
      ...wind.uniforms, ...shared,
      uOrigin: { value: new THREE.Vector2() }, uRingC: { value: new THREE.Vector2() }, uInC: { value: k ? rings[k - 1].u.uRingC.value : new THREE.Vector2() }, uCell: { value: cs },
      uHScale: { value: hMul[Math.min(k, 2)] }, uWidthK: { value: 0.7 },
      uFade: { value: new THREE.Vector4(k ? prev * 0.55 : -1, k ? prev * 0.8 : 0, last ? 1e6 : hf * 0.8, last ? 2e6 : hf) },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: vert, fragmentShader: FRAG, side: THREE.DoubleSide, name: 'grass_mat' });
    const mesh = new THREE.Mesh(geo, mat); mesh.name = names[Math.min(k, 2)]; mesh.frustumCulled = false; mesh.userData.noAO = true;
    group.add(mesh); rings.push({ mesh, u, n, cs, hf, follow: !last });
  });

  function place(r, cx, cz) {
    const ix = Math.round(cx / r.cs), iz = Math.round(cz / r.cs);   // bám theo bội của ô → cọng không nhảy
    r.u.uRingC.value.set(ix * r.cs, iz * r.cs); r.u.uOrigin.value.set(ix - r.n / 2, iz - r.n / 2);
  }
  rings.forEach((r) => place(r, area.center[0], area.center[1]));
  const _p = new THREE.Vector3();
  return {
    group, rings, uniforms: shared,
    // lấy ánh sáng từ đèn three của cảnh (DirectionalLight + HemisphereLight) → cỏ tối theo đêm/bão như vật khác
    //   chia π như BRDF Lambert của three (r155+); gọi mỗi khung nếu đèn đổi theo shot
    lightFrom(sun, hemi) {
      if (sun) { shared.uSunDir.value.copy(sun.position).sub(sun.target.position).normalize(); shared.uSunColor.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI); }
      if (hemi) shared.uSkyColor.value.copy(hemi.color).lerp(hemi.groundColor, 0.25).multiplyScalar(hemi.intensity / Math.PI * 1.8);
    },
    // list ≤ 6 phần tử {x,y,z,r} | [x,y,z,r]; thiếu → w = 0. Hàm đặt thuần, gọi mỗi khung.
    setPushers(list = []) {
      const a = shared.uPushers.value;
      for (let i = 0; i < 6; i++) { const e = list[i];
        if (!e) a[i].set(0, 0, 0, 0); else if (Array.isArray(e)) a[i].set(e[0], e[1], e[2], e[3]); else a[i].set(e.x, e.y, e.z, e.r); }
    },
    update(t, camera) {
      wind.update(t);
      if (P.follow && camera) { camera.getWorldPosition(_p); for (const r of rings) if (r.follow) place(r, _p.x, _p.z); }
    },
    set(p = {}) {
      if (p.height != null) shared.uHeight.value = P.height = p.height;
      if (p.colors?.base) shared.uBase.value.set(p.colors.base);
      if (p.colors?.tip) shared.uTip.value.set(p.colors.tip);
      if (p.density != null) shared.uKeep.value = Math.min(1, Math.max(0, p.density / created));
      if (p.sunDir) shared.uSunDir.value.copy(p.sunDir).normalize();
      if (p.sunColor) shared.uSunColor.value.copy(p.sunColor);
      if (p.skyColor) shared.uSkyColor.value.copy(p.skyColor);
      if (p.visible != null) group.visible = !!p.visible;
    },
    dispose() { for (const r of rings) { r.mesh.geometry.dispose(); r.mesh.material.dispose(); } hTex.dispose(); group.removeFromParent(); },
  };
}
