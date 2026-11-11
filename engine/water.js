// water.js — Mặt nước biển cách điệu nhưng thật: sóng Gerstner (đỉnh), 2 lớp pháp tuyến chi tiết (noise trong shader),
// Fresnel (Schlick) giữa phản chiếu bầu trời + chói mặt trời và màu nước (nông/sâu + tán xạ dưới bề mặt ở đỉnh sóng),
// bọt đỉnh sóng (Jacobian + noise), bọt bờ (đường thẳng / vòng tròn) và bọt quanh đá, sương mù của scene.
// Tất định: chỉ phụ thuộc uniform uTime = t của shot. Không đồng hồ, không Math.random.
//
//   const w = createWater(THREE, { size: 1400, segments: 150, y: 0, preset: 'tropical', amp: 0.5,
//                                  center: [0, 0], shore: { line: [0, 1, 62, 5] } | { circle: [0, 0, 70.5, 5] },
//                                  spots: [[x, z, r], ...], colors: { shallow, deep, sss, foam } });
//   scene.add(w.mesh);  w.update(t, camera, light);
//   light = { sunDir: Vector3, sunColor: Color(đã nhân cường độ), skyTop: Color, skyBottom: Color, amb: Color, flash: 0 }
//
// Preset: waves = [bước sóng, hướng (độ), biên độ tương đối, ] ; steep = độ nhọn tổng (Σ Q·k·A); g = "trọng lực" (tốc độ sóng);
// foam = [lo, hi] ngưỡng bọt theo (1 - Jacobian); detail = độ gợn pháp tuyến; alpha = độ đục cơ bản.

export const WATER_PRESETS = {
  tropical: {
    amp: 0.5, g: 9, steep: 0.75, alpha: 0.9, detail: 0.8, foam: [0.42, 0.8], foamAmt: 0.8, glint: 1.0, sss: 0.9, fres0: 0.03,
    shallow: '#33d6cc', deep: '#047bb0', sss_c: '#8dffd9', foamC: '#ffffff', skyMix: 0.5,
    waves: [[44, 20, 1.0], [27, -35, 0.7], [17, 62, 0.45], [10.5, -80, 0.28], [6.3, 110, 0.16]],
  },
  shallow: {
    amp: 0.35, g: 8, steep: 0.55, alpha: 0.6, detail: 0.5, foam: [0.4, 0.75], foamAmt: 0.7, glint: 0.9, sss: 0.7, fres0: 0.03,
    shallow: '#6af0dc', deep: '#13b0c4', sss_c: '#a8ffe6', foamC: '#ffffff', skyMix: 0.58,
    waves: [[36, 10, 1.0], [21, -40, 0.65], [13, 55, 0.4], [8, -75, 0.25], [5.2, 120, 0.14]],
  },
  deep: {
    amp: 0.8, g: 7, steep: 0.8, alpha: 0.86, detail: 0.5, foam: [0.45, 0.85], foamAmt: 0.7, glint: 1.1, sss: 0.7, fres0: 0.03,
    shallow: '#1f9fd0', deep: '#06557f', sss_c: '#62d6ff', foamC: '#ffffff', skyMix: 0.72,
    waves: [[70, 15, 1.0], [42, -30, 0.75], [25, 50, 0.45], [14, -70, 0.28], [8, 100, 0.16], [5.4, -15, 0.1]],
  },
  storm: {
    amp: 2.4, g: 11, steep: 1.05, alpha: 1, detail: 0.9, foam: [0.22, 0.55], foamAmt: 1.0, glint: 0.8, sss: 0.35, fres0: 0.04,
    shallow: '#1f4a63', deep: '#081a2c', sss_c: '#5fa0a0', foamC: '#e6eef6', skyMix: 0.9,
    waves: [[78, 10, 1.0], [52, -25, 0.8], [31, 40, 0.55], [18, -60, 0.35], [10.5, 80, 0.22], [6.4, -100, 0.14]],
  },
  night: {
    amp: 0.25, g: 8, steep: 0.5, alpha: 1, detail: 0.5, foam: [0.45, 0.8], foamAmt: 0.5, glint: 1.2, sss: 0.2, fres0: 0.04,
    shallow: '#1d3566', deep: '#0b1530', sss_c: '#3a5ea8', foamC: '#cfdcff', skyMix: 0.95,
    waves: [[50, 20, 1.0], [30, -35, 0.7], [18, 60, 0.4], [10, -80, 0.25]],
  },
};

const GLSL_NOISE = /* glsl */`
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
// value noise + đạo hàm: (giá trị, d/dx, d/dy)
vec3 vnD(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f), du = 6.0*f*(1.0-f);
  float a = h21(i), b = h21(i+vec2(1.,0.)), c = h21(i+vec2(0.,1.)), d = h21(i+vec2(1.,1.));
  float k = a - b - c + d;
  return vec3(a + (b-a)*u.x + (c-a)*u.y + k*u.x*u.y, du*(vec2(b-a, c-a) + k*u.yx));
}
`;

function waveCode(P, ampScale) {
  const n = P.waves.length; let s = '';
  P.waves.forEach(([L, deg, rel], i) => {
    const a = deg * Math.PI / 180, k = 2 * Math.PI / L, A = rel * ampScale, w = Math.sqrt(P.g * k);
    const Q = P.steep * (0.4 + 0.6 * rel) / (k * A * n);
    s += `{ vec2 D = vec2(${Math.cos(a).toFixed(5)}, ${Math.sin(a).toFixed(5)}); float k = ${k.toFixed(6)}; float A = ${A.toFixed(5)} * uAmp * fade; float Q = ${Math.min(Q, 3).toFixed(4)};
      float ph = k*dot(D, p) - ${w.toFixed(5)}*uTime + ${(i * 1.7 + 0.6).toFixed(3)}; float s = sin(ph), c = cos(ph);
      disp.xz += Q*A*D*c; disp.y += A*s; nrm.xz -= D*(k*A*c); nrm.y -= Q*k*A*s;
      float qa = Q*k*A*s; jxx -= qa*D.x*D.x; jzz -= qa*D.y*D.y; jxz -= qa*D.x*D.y; }
`;
  });
  return s;
}

export function createWater(THREE, opts = {}) {
  const P = WATER_PRESETS[opts.preset || 'tropical'] || WATER_PRESETS.tropical;
  const size = opts.size ?? 1200, N = Math.min(opts.segments ?? 140, 160), y = opts.y ?? 0;
  const ampScale = opts.amp ?? P.amp;
  const [cx, cz] = opts.center || [0, 0], half = size / 2;
  const C = (c) => new THREE.Color(c);
  const col = { shallow: P.shallow, deep: P.deep, sss: P.sss_c, foam: P.foamC, ...(opts.colors || {}) };

  // lưới dày quanh `center`, thưa dần ra xa (ẩn mép bằng sương mù)
  const warp = (s, c) => { const e = s < 0 ? c + half : half - c; return c + Math.sign(s) * Math.pow(Math.abs(s), 1.7) * e; };
  const pos = new Float32Array((N + 1) * (N + 1) * 3), idx = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const o = (j * (N + 1) + i) * 3;
    pos[o] = warp(-1 + 2 * i / N, cx); pos[o + 1] = 0; pos[o + 2] = warp(-1 + 2 * j / N, cz);
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 0, cz), size); geo.boundingBox = null;

  // bờ: line [nx,nz,c,width] (nước ở phía dot(xz,n) > c) | circle [cx,cz,R,width] (nước ở ngoài R)
  const sh = opts.shore || {};
  const shoreMode = sh.line ? 1 : sh.circle ? 2 : 0, shoreP = sh.line || sh.circle || [0, 0, 0, 1];
  const spots = opts.spots || []; const SPOTS = 12;
  const spotArr = Array.from({ length: SPOTS }, (_, i) => new THREE.Vector3(...(spots[i] || [0, 0, 0])));

  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uAmp: { value: 1 }, uFlash: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.4).normalize() }, uSunCol: { value: C('#ffffff').multiplyScalar(2.6) },
    uTop: { value: C('#3f9fe6') }, uBot: { value: C('#cdeeff') }, uAmb: { value: C('#ffffff') },
    uShallow: { value: C(col.shallow) }, uDeep: { value: C(col.deep) }, uSss: { value: C(col.sss) }, uFoam: { value: C(col.foam) },
    uShoreMode: { value: shoreMode }, uShoreP: { value: new THREE.Vector4(...shoreP) },
    uSpots: { value: spotArr }, uSpotN: { value: Math.min(spots.length, SPOTS) },
    uAlpha: { value: opts.alpha ?? P.alpha }, uDetail: { value: P.detail }, uFoamR: { value: new THREE.Vector4(P.foam[0], P.foam[1], P.foamAmt, P.glint) },
    uSssK: { value: P.sss }, uF0: { value: P.fres0 }, uSkyMix: { value: P.skyMix },
    uAmpMax: { value: ampScale * P.waves.reduce((a, w) => a + w[2], 0) },
    // sea2 (v4, học Saltline): đánh bóng shader + bọt quanh thân vật nổi. uSea2 = 0 → y hệt bản cũ.
    uSea2: { value: 0 }, uHull: { value: new THREE.Vector4(0, 0, 1, 1) }, uHullR: { value: new THREE.Vector4(0, 0, 0, 0) },
  }]);

  const vertex = /* glsl */`
    uniform float uTime, uAmp;
    varying vec3 vW; varying vec3 vN; varying float vH; varying float vJ;
    #include <fog_pars_vertex>
    void main(){
      vec3 p0 = (modelMatrix * vec4(position, 1.0)).xyz;
      vec2 p = p0.xz;
      float dc = length(p - cameraPosition.xz);
      float fade = 1.0 - 0.7*smoothstep(120.0, 450.0, dc);
      vec3 disp = vec3(0.0); vec3 nrm = vec3(0.0, 1.0, 0.0); float jxx = 1.0, jzz = 1.0, jxz = 0.0;
      ${waveCode(P, ampScale)}
      vec3 wp = p0 + disp;
      vW = wp; vN = nrm; vH = clamp(disp.y / max(uAmpMax_, 0.001) * 0.5 + 0.5, 0.0, 1.0);
      float J = jxx*jzz - jxz*jxz; vJ = clamp(1.0 - J, 0.0, 2.0);
      vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`.replace(/uAmpMax_/g, (ampScale * P.waves.reduce((a, w) => a + w[2], 0)).toFixed(4));

  const fragment = /* glsl */`
    uniform float uTime, uFlash, uAlpha, uDetail, uSssK, uF0, uSkyMix, uAmpMax;
    uniform vec3 uSunDir, uSunCol, uTop, uBot, uAmb, uShallow, uDeep, uSss, uFoam;
    uniform float uShoreMode; uniform vec4 uShoreP, uFoamR; uniform vec3 uSpots[${SPOTS}]; uniform float uSpotN;
    uniform float uSea2; uniform vec4 uHull, uHullR;   // uHull = (tâm x, tâm z, nửa dài X cục bộ, nửa rộng Z cục bộ); uHullR = (yaw, cường độ, lao xuống 0..1, -)
    varying vec3 vW; varying vec3 vN; varying float vH; varying float vJ;
    ${GLSL_NOISE}
    #include <fog_pars_fragment>
    float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
    vec3 skyCol(vec3 r){
      float h = clamp(r.y*1.6 + 0.25, 0.0, 1.0);
      vec3 c = mix(uBot, uTop, h);
      // nhẹ nhàng: vệt mây trong phản chiếu
      vec2 q = mat2(0.8,-0.6,0.6,0.8) * (r.xz / max(r.y + 0.25, 0.2)) * 1.3 + vec2(uTime*0.01, 0.0);
      float cl = smoothstep(0.62, 0.9, vnD(q*1.7).x*0.65 + vnD(q*4.1).x*0.35);
      c = mix(c, mix(uBot, vec3(1.0), 0.5), cl * 0.12 * smoothstep(0.0, 0.5, r.y));
      return c + uFlash*0.6;
    }
    void main(){
      vec3 wp = vW; vec2 xz = wp.xz;
      vec3 toCam = cameraPosition - wp; float dist = length(toCam); vec3 V = toCam / max(dist, 1e-3);
      float fadeD = 1.0 / (1.0 + dist*0.012);
      // --- 2 lớp pháp tuyến chi tiết, trôi ngược chiều nhau ---
      vec2 t1 = vec2(0.6, 0.25)*uTime, t2 = vec2(-0.35, 0.5)*uTime;
      vec3 a1 = vnD(xz*0.32 + t1), a2 = vnD(mat2(0.8,-0.6,0.6,0.8)*xz*0.75 + t2*1.3);
      vec3 b1 = vnD(xz*1.45 - t1*1.7), b2 = vnD(mat2(0.6,0.8,-0.8,0.6)*xz*2.9 + t2*2.2);
      vec2 slope = (a1.yz*0.55 + a2.yz*0.45) * 0.55 + (b1.yz*0.35 + b2.yz*0.25) * 0.5;
      slope *= uDetail * (0.35 + 0.65*fadeD) * 0.6;
      // sea2: "cat's-paw" — mảng gió tần số thấp làm vùng nước tối + nhám hơn (Saltline)
      float catPaw = 0.0;
      if (uSea2 > 0.5) {
        catPaw = smoothstep(0.42, 0.78, vnD(xz*0.011 + vec2(uTime*0.012, -uTime*0.007)).x*0.65 + vnD(mat2(0.8,-0.6,0.6,0.8)*xz*0.027 - vec2(uTime*0.02, 0.0)).x*0.35);
        slope *= 1.0 + 0.7*catPaw;
      }
      vec3 N = normalize(vec3(vN.x - slope.x, max(vN.y, 0.15), vN.z - slope.y));
      float NV = clamp(dot(N, V), 0.0, 1.0);
      float F = uF0 + (1.0 - uF0) * pow(1.0 - NV, 5.0);
      F = clamp(F, 0.0, 1.0);
      // --- phản chiếu bầu trời ---
      vec3 R = reflect(-V, N); R.y = abs(R.y);
      vec3 refl = skyCol(R);
      // --- màu nước ---
      float h01 = vH;
      float k = clamp(0.12 + 0.6*h01 + 0.3*(1.0 - NV), 0.0, 1.0);
      vec3 body = mix(uDeep, uShallow, k);
      float NL = max(dot(N, uSunDir), 0.0);
      body *= 0.72 + 0.28*NL + 0.1*lum(uAmb);
      // tán xạ dưới bề mặt: đỉnh sóng sáng từ phía sau
      float back = pow(clamp(dot(V, -uSunDir)*0.5 + 0.5, 0.0, 1.0), 3.0);
      float crest = smoothstep(0.52, 0.95, h01);
      body += uSss * uSssK * (crest*(0.35 + 0.65*back) + 0.12*back) * (0.4 + 0.6*clamp(lum(uSunCol)*0.4, 0.0, 1.0));
      // --- bờ / đá: độ nông + bọt ---
      float shoreD = 1e3; float lap = 0.0;
      float nz1 = vnD(xz*0.35 + vec2(0.0, uTime*0.1)).x;
      if (uShoreMode > 0.5) {
        if (uShoreMode < 1.5) shoreD = dot(xz, uShoreP.xy) - uShoreP.z;
        else shoreD = length(xz - uShoreP.xy) - uShoreP.z;
        shoreD += (nz1 - 0.5) * 2.5;
      }
      float shw = max(uShoreP.w, 1.0);
      float shallowW = (uShoreMode > 0.5) ? 1.0 - smoothstep(0.0, shw*5.0, shoreD) : 0.0;
      body = mix(body, uShallow*1.12 + vec3(0.04), shallowW*0.7);
      float foam = 0.0;
      float fn = vnD(xz*0.8 + vec2(uTime*0.12, -uTime*0.07)).x*0.55 + vnD(xz*2.4 - vec2(uTime*0.3, uTime*0.2)).x*0.45;
      float fnS = vnD(vec2(xz.x*0.25 - uTime*0.18, xz.y*1.1)).x*0.5 + vnD(xz*3.1 + uTime*0.2).x*0.5; // vệt bọt kéo dài (bão)
      // bọt đỉnh sóng (Jacobian)
      float jf = smoothstep(uFoamR.x, uFoamR.y, vJ);
      foam += jf * uFoamR.z * smoothstep(0.25, 0.7, fn*0.8 + fnS*0.5);
      // bọt bờ lặp theo nhịp
      if (uShoreMode > 0.5) {
        float ph = 0.5 + 0.5*sin(uTime*0.9 + nz1*5.0);
        float edge = shw*(0.4 + 0.9*ph);
        float band = smoothstep(edge + 1.4, edge - 0.3, shoreD) * smoothstep(-0.2, 0.7, shoreD);
        float line2 = smoothstep(shw*0.45, 0.0, abs(shoreD - (shw*(1.6 + 0.9*sin(uTime*0.9 + nz1*5.0 - 1.6)))));
        float brk = smoothstep(0.32, 0.62, fn + (1.0 - clamp(shoreD/(shw*2.0), 0.0, 1.0))*0.4);
        foam += clamp(band*brk*1.1 + line2*0.55*brk*smoothstep(1.0, 4.0, shoreD), 0.0, 1.0);
        lap = band;
      }
      for (int i = 0; i < ${SPOTS}; i++) {
        if (float(i) >= uSpotN) break;
        float sd = length(xz - uSpots[i].xy) - uSpots[i].z;
        sd += (nz1 - 0.5) * 2.0;
        float ph = 0.5 + 0.5*sin(uTime*1.1 + float(i)*1.9 + nz1*4.0);
        float edge = 1.0 + 1.5*ph;
        foam += smoothstep(edge + 1.5, edge - 0.3, sd) * smoothstep(-1.5, 0.3, sd) * smoothstep(0.3, 0.6, fn + 0.1);
      }
      // sea2: bọt + vệt ướt quanh thân vật nổi (SDF hộp xoay, Saltline) — bùng lên khi thân lao xuống
      if (uHullR.y > 0.001) {
        vec2 hd = xz - uHull.xy; float cy = cos(uHullR.x), sy = sin(uHullR.x);
        vec2 hq = abs(vec2(hd.x*cy - hd.y*sy, hd.x*sy + hd.y*cy)) - uHull.zw;
        float sdH = length(max(hq, 0.0)) + min(max(hq.x, hq.y), 0.0);
        float nzH = vnD(xz*0.55 + vec2(uTime*0.23, -uTime*0.17)).x*0.6 + vnD(xz*1.7 - vec2(uTime*0.4, uTime*0.1)).x*0.4;
        float pl = uHullR.z;
        // bóng tiếp xúc hình elip (Tidewright hullAO): ngồi HẲN trong nước; bán trục 1.25× nửa hộp → phủ cả góc
        vec2 hl = vec2(hd.x*cy - hd.y*sy, hd.x*sy + hd.y*cy) / (uHull.zw*1.25);
        float he = dot(hl, hl);
        body *= 1.0 - 0.42*(1.0 - smoothstep(0.70, 1.22, he))*uHullR.y;
        float hxr = (sqrt(he) - 1.03)/0.17;
        foam += exp(-hxr*hxr)*(0.16 + 0.62*pl)*(0.35 + 1.3*nzH)*uHullR.y;      // bọt ôm đường nước
        float bandW = 1.6 + 2.6*nzH + 4.5*pl;
        float band = 1.0 - smoothstep(0.0, bandW, sdH);
        float scum = smoothstep(0.62 - 0.32*pl - 0.25*band, 0.9 - 0.2*pl, fn*0.75 + nzH*0.45);
        float ring = smoothstep(0.35, 0.0, abs(sdH - (0.6 + 3.5*pl))) * pl;    // vành bọt đẩy ra khi lao xuống
        foam += clamp(band*scum*1.15 + ring*0.7*smoothstep(0.3, 0.6, nzH), 0.0, 1.0) * uHullR.y * step(-0.3, sdH);
      }
      foam = clamp(foam, 0.0, 1.0);
      // --- chói mặt trời ---
      vec3 H = normalize(V + uSunDir);
      float nh = max(dot(N, H), 0.0);
      float rl = max(dot(R, uSunDir), 0.0);
      vec2 gq = xz*2.6 + vec2(uTime*0.7, -uTime*0.5); vec2 gc = floor(gq); float spk = h21(gc);
      vec2 gf = fract(gq) - 0.5 - (vec2(h21(gc + 7.3), h21(gc + 3.1)) - 0.5)*0.5;
      float sparkle = step(0.86, spk) * smoothstep(0.2, 0.04, length(gf)) * pow(nh, 10.0) * fadeD * 3.0;   // lấp lánh tròn
      float spec = pow(nh, 700.0)*14.0 + pow(nh, 90.0)*1.6 + pow(nh, 25.0)*0.22 + sparkle + pow(rl, 30.0)*0.15;
      vec2 sunAz = normalize(uSunDir.xz + vec2(1e-4)); vec2 viewAz = normalize(-V.xz + vec2(1e-5));
      float azi = pow(max(dot(viewAz, sunAz), 0.0), 3.0);
      if (uSea2 > 0.5) {
        // chói sắc ở gần, mềm + yếu dần ở xa (tránh lấp lánh răng cưa), mạnh nhất dọc phương vị mặt trời, yếu trong mảng gió
        float farK = smoothstep(50.0, 380.0, dist);
        spec = pow(nh, mix(700.0, 140.0, farK))*mix(14.0, 4.0, farK) + pow(nh, mix(90.0, 35.0, farK))*1.6 + pow(nh, 25.0)*0.22
             + sparkle*(1.0 - farK) + pow(rl, 30.0)*0.15;
        spec *= mix(0.55, 1.45, azi) * (1.0 - 0.45*catPaw);
      }
      spec *= uFoamR.w * smoothstep(0.0, 0.15, uSunDir.y) * (1.0 - foam);
      // --- trộn ---
      vec3 col = mix(body, refl, clamp(F*uSkyMix + (1.0-uSkyMix)*F*0.5, 0.0, 1.0));
      col += uSunCol * spec * (0.25 + 0.75*F) * 0.4;
      if (uSea2 > 0.5) {
        col *= 1.0 - 0.1*catPaw;
        // khói xa về màu chân trời, ngả sáng phía mặt trời
        float hz = smoothstep(140.0, 650.0, dist);
        vec3 hazeC = mix(uBot, uBot + uSunCol*0.12, azi);
        col = mix(col, hazeC, hz*0.3);
      }
      vec3 foamLit = uFoam * (0.5*uAmb + uSunCol*NL*0.22) + uFlash*0.5;
      foamLit *= mix(1.0, 0.82, fnS);
      col = mix(col, foamLit, foam*0.95);
      col = clamp(col, 0.0, 30.0);
      float alpha = mix(uAlpha, 1.0, F);
      if (uShoreMode > 0.5) alpha = max(alpha*smoothstep(-0.2, 3.0, shoreD), foam*step(-0.5, shoreD)*0.95) * step(-0.8, shoreD);
      alpha = max(alpha, foam*0.9);
      gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`;

  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: vertex, fragmentShader: fragment, fog: true,
    transparent: (opts.alpha ?? P.alpha) < 1 || shoreMode > 0, depthWrite: true,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = opts.name || 'sea'; mesh.position.y = y; mesh.frustumCulled = false; mesh.renderOrder = 1;
  const u = uniforms, _c = new THREE.Color();
  const defaultAmp = ampScale;

  // ---- bản CPU của tổng sóng trong vertex shader (Saltline Lb): cùng D,k,A,Q,ω,pha, cùng uAmp, cùng fade theo camera ----
  const nW = P.waves.length;
  const WV = P.waves.map(([L, deg, rel], i) => {
    const a = deg * Math.PI / 180, k = 2 * Math.PI / L, A = rel * ampScale, w = Math.sqrt(P.g * k);
    return { dx: Math.cos(a), dz: Math.sin(a), k, A, w, Q: Math.min(P.steep * (0.4 + 0.6 * rel) / (k * A * nW), 3), off: i * 1.7 + 0.6 };
  });
  const sinc = (x) => (Math.abs(x) < 1e-4 ? 1 : Math.sin(x) / x);
  const smoothstep = (a, b, x) => { const v = Math.min(1, Math.max(0, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  const filt = new Float64Array(nW);
  // box = { hx, hz, yaw }: TRUNG BÌNH tổng sóng trên hình chữ nhật (thân nổi) — tích phân giải tích: mỗi sóng × sinc·sinc
  //   (lọc thông thấp không trễ, không cần lịch sử khung → sóng ngắn không làm thân to giật theo)
  function setFilter(box) {
    for (let i = 0; i < nW; i++) {
      if (!box) { filt[i] = 1; continue; }
      const W = WV[i], ux = Math.cos(box.yaw || 0), uz = -Math.sin(box.yaw || 0);
      const du = W.dx * ux + W.dz * uz, dv = W.dx * -uz + W.dz * ux;   // v = (sin yaw, cos yaw) = (-uz, ux)
      filt[i] = sinc(W.k * du * (box.hx || 0)) * sinc(W.k * dv * (box.hz || 0));
    }
  }
  const D = { x: 0, y: 0, z: 0, vy: 0 };
  function disp(px, pz, T, uA, cam) {
    const fade = cam ? 1 - 0.7 * smoothstep(120, 450, Math.hypot(px - cam.x, pz - cam.z)) : 1;
    D.x = D.y = D.z = D.vy = 0;
    for (let i = 0; i < nW; i++) {
      const W = WV[i], A = W.A * uA * fade * filt[i];
      const ph = W.k * (W.dx * px + W.dz * pz) - W.w * T + W.off, s = Math.sin(ph), c = Math.cos(ph);
      D.x += W.Q * A * W.dx * c; D.z += W.Q * A * W.dz * c; D.y += A * s; D.vy -= A * W.w * c;
    }
    return D;
  }
  let lastT = 0, lastAmp;
  // sample(x, z, { t, amp, cam, box }) → { y (cao độ mặt nước thế giới), vy (dy/d(uTime)) }
  //   t/amp = đúng giá trị env truyền vào update (mặc định: lần update gần nhất); cam = vị trí camera (fade xa) — bỏ qua ⇒ fade = 1 (đúng khi camera < 120 đv)
  //   Sóng Gerstner dời ngang → tìm điểm gốc chưa dời p0 bằng lặp điểm bất động p0 = x − disp.xz(p0) (3 lần)
  function sample(x, z, { t = lastT, amp = lastAmp, cam = null, box = null } = {}) {
    const uA = amp == null ? 1 : Math.max(0, amp / defaultAmp);
    setFilter(box);
    let px = x, pz = z;
    for (let it = 0; it < 3; it++) { disp(px, pz, t, uA, cam); px = x - D.x; pz = z - D.z; }
    disp(px, pz, t, uA, cam);
    return { y: mesh.position.y + D.y, vy: D.vy };
  }
  // bọt quanh thân nổi: { x, z, hx, hz, yaw, k, plunge } | null
  function setHull(h) {
    if (!h || !(h.k > 0)) { u.uHullR.value.set(0, 0, 0, 0); return; }
    u.uHull.value.set(h.x, h.z, h.hx, h.hz); u.uHullR.value.set(h.yaw || 0, h.k, h.plunge || 0, 0);
  }

  function update(t, camera, L = {}, amp) {
    lastT = t; lastAmp = amp;
    u.uTime.value = t;
    u.uSea2.value = (globalThis.__autoFx?.sea2 ?? true) ? 1 : 0;
    u.uAmp.value = amp == null ? 1 : Math.max(0, amp / defaultAmp);
    if (L.sunDir) u.uSunDir.value.copy(L.sunDir);
    if (L.sunColor) u.uSunCol.value.copy(L.sunColor);
    if (L.skyTop) u.uTop.value.copy(L.skyTop);
    if (L.skyBottom) u.uBot.value.copy(L.skyBottom);
    if (L.amb) u.uAmb.value.copy(L.amb);
    u.uFlash.value = L.flash || 0;
  }
  return { mesh, update, uniforms, material, preset: P, sample, setHull };
}
