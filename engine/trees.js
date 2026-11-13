// trees.js — CÂY KIỂU PAINTED VALLEY (patch.gg/blendi/painted-valley, MIT — chỉ học phương pháp, không chép mã):
//   tán = nhiều CỤM KHỐI tròn (icosahedron lệch đỉnh, tô phẳng từng mặt), màu chuyển theo chiều cao (gốc tối-lạnh → ngọn sáng-ấm),
//   cả cây lay theo GIÓ CHUNG (engine/wind.js: gustAt/windBend, cùng dải gió giật với cỏ/rừng xa).
//   Mọi cây = 2 InstancedMesh (thân + tán) dùng chung 1 ShaderMaterial ⇒ 1 program, không đổ bóng, không bóng AO.
//
//   const wind = createWind(THREE, { … });
//   const pv = createPvTrees(THREE, { wind, seed: 3, list: [{ x, z, h, kind: 'giant'|'round', hue: 0..1 }, …] });
//   g.add(pv.group);                          // trong onBeforeRender đã tự nạp ánh sáng + sương từ scene (như farwoods)
//   pv.update(t);                             // hàm thuần của t: chỉ đặt uniform (gọi wind.update(t))
// Bật/tắt ở env: globalThis.__autoFx?.pvTrees !== false (ô "Cây Painted Valley").
import * as THREE_NS from 'three';

const hash = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

const VERT = /* glsl */`
attribute vec3 aOff;      // tâm cụm (m, thế giới)
attribute vec3 aScl;      // co giãn xyz
attribute vec4 aCol;      // rgb, yaw
attribute vec4 aInfo;     // cao cả cây, rand, loại (0 thân / 1 tán), baseX
attribute float aBaseZ;
uniform float uSwayK;
varying vec3 vCol; varying vec3 vW; varying float vG; varying float vKind; varying float vFogD; varying float vLy;
__WIND__
void main() {
  float c = cos(aCol.w), s = sin(aCol.w);
  vec3 p = position * aScl;
  p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  vec3 wp = aOff + p;
  float H = aInfo.x, rnd = aInfo.y;
  float y01 = clamp(wp.y / H, 0.0, 1.2);
  vec2 base = vec2(aInfo.w, aBaseZ);
  // cả cây nghiêng theo gió (gần gốc ~0, ngọn nhiều nhất) + từng cụm rung nhẹ riêng
  wp.xz += windBend(base, rnd) * uSwayK * H * y01 * y01;
  wp.xz += windBend(aOff.xz, rnd + 0.37) * 0.018 * aScl.x * aInfo.z * (0.4 + y01);
  vW = wp; vKind = aInfo.z; vCol = aCol.rgb;
  vLy = position.y;                                     // cao trong cụm: -1..1 (tán) / 0..1 (thân)
  vG = clamp(0.55 * y01 + 0.45 * (aInfo.z > 0.5 ? vLy * 0.5 + 0.5 : y01), 0.0, 1.0);
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vFogD = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;
const FRAG = /* glsl */`
uniform vec3 uSunDir, uSunColor, uSkyColor, uFogColor, uBark;
uniform vec2 uFog;
varying vec3 vCol; varying vec3 vW; varying float vG; varying float vKind; varying float vFogD; varying float vLy;
void main() {
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));        // pháp tuyến phẳng từng mặt → khối "cắt tay" kiểu tranh sơn
  float ndl = dot(n, uSunDir);
  float lit = clamp(ndl * 0.55 + 0.45, 0.0, 1.0);
  vec3 base = vCol;
  vec3 cool = base * vec3(0.60, 0.78, 0.76);            // gốc/dưới tán: sẫm, hơi lạnh
  vec3 warm = base * vec3(1.08, 1.08, 0.92);            // ngọn/trên tán: sáng, ngả vàng
  vec3 leaf = mix(cool, warm, smoothstep(0.05, 0.95, vG));
  leaf = mix(leaf, vec3(dot(leaf, vec3(0.3, 0.59, 0.11))) * vec3(0.95, 1.0, 0.9), 0.3);   // bớt rực: giảm bão hoà ~30%
  vec3 bark = uBark * (0.6 + 0.5 * vG) * (0.9 + 0.2 * smoothstep(-0.2, 0.4, n.x));
  vec3 alb = mix(leaf, bark, step(vKind, 0.5));
  vec3 amb = uSkyColor * (0.5 + 0.5 * n.y);
  vec3 col = alb * (amb * 0.95 + uSunColor * lit * lit * 1.05);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, smoothstep(uFog.x, uFog.y, vFogD));
}
`;
const NOWIND = /* glsl */`
uniform float uWindT; uniform vec4 uWind;
vec2 windBend(vec2 xz, float rand) { return vec2(0.0); }
`;

function lumpyIco(THREE, detail = 1, jag = 0.16, seed = 5) {   // icosahedron lệch đỉnh (đỉnh trùng vị trí lệch y hệt → không hở), tô phẳng
  const g = new THREE.IcosahedronGeometry(1, detail).toNonIndexed(); const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), key = Math.round(x * 100) * 73856 + Math.round(y * 100) * 19349 + Math.round(z * 100) * 83492;
    const k = 1 + (hash(key, seed) - 0.5) * 2 * jag;
    P.setXYZ(i, x * k, y * k * 0.9, z * k);
  }
  g.computeVertexNormals(); return g;
}

export function createPvTrees(THREE = THREE_NS, opts = {}) {
  const { wind, list = [] } = opts, seed = opts.seed ?? 1;
  const greens = opts.greens || ['#3d7a3f', '#468546', '#4f8b44', '#376e3e', '#5a8a42', '#3f7f4c', '#44784a'];
  const accents = opts.accents || ['#7aa545', '#8aa94a'];
  const bark = opts.bark || '#6b4a2e';
  const cT = [], cC = [];   // thân / tán: mỗi cụm 4 mảng
  const push = (a, o) => { a.push(o); };
  const col = new THREE.Color();
  list.forEach((t, ti) => {
    const H = t.h, sd = seed * 1000 + ti * 13, giant = t.kind === 'giant', hue = t.hue ?? hash(ti, sd + 1);
    const baseG = greens[Math.floor(hue * greens.length) % greens.length];
    const tr = giant ? 0.05 * H + 0.8 : 0.034 * H + 0.45, th = H * (giant ? 0.74 : 0.5);
    push(cT, { x: t.x, y: 0, z: t.z, sx: tr, sy: th, sz: tr, yaw: hash(ti, sd + 2) * 6.28, c: [0.4, 0.28, 0.18], H, rnd: hash(ti, sd + 3), kind: 0, bx: t.x, bz: t.z });
    if (giant) for (let k = 0; k < 3; k++) {   // bạnh gốc: 3 rễ nghiêng ngắn
      const a = hash(ti, sd + 20 + k) * 6.28;
      push(cT, { x: t.x + Math.cos(a) * tr * 0.7, y: 0, z: t.z + Math.sin(a) * tr * 0.7, sx: tr * 0.55, sy: th * 0.16, sz: tr * 0.55, yaw: a, c: [0.4, 0.28, 0.18], H, rnd: hash(ti, sd + 3), kind: 0, bx: t.x, bz: t.z });
    }
    const cy0 = giant ? H * 0.74 : H * 0.5, R0 = H * (giant ? 0.17 : 0.2), tiers = giant ? 3 : 3;
    let n = 0;
    for (let tier = 0; tier < tiers; tier++) {
      const cnt = [5, 4, 2][tier], ring = R0 * (1.25 - tier * 0.45) * (giant ? 1.15 : 1), r = R0 * (0.95 - tier * 0.12);
      for (let k = 0; k < cnt; k++, n++) {
        const a = (k / cnt) * 6.28 + hash(ti, sd + 40 + n) * 1.2 + tier * 0.7, d = tier === tiers - 1 ? ring * 0.3 * hash(ti, sd + 60 + n) : ring * (0.7 + 0.5 * hash(ti, sd + 60 + n));
        const rr = r * (0.8 + 0.4 * hash(ti, sd + 80 + n));
        col.set(hash(ti, sd + 100 + n) < 0.12 ? accents[n % accents.length] : baseG);
        col.offsetHSL((hash(ti, sd + 5) - 0.5) * 0.05 + (hash(ti, sd + 120 + n) - 0.5) * 0.03, (hash(ti, sd + 140 + n) - 0.5) * 0.1, (hash(ti, sd + 160 + n) - 0.5) * 0.08);
        push(cC, { x: t.x + Math.cos(a) * d, y: cy0 + tier * R0 * 0.62 + (hash(ti, sd + 180 + n) - 0.5) * R0 * 0.3, z: t.z + Math.sin(a) * d, sx: rr, sy: rr * 0.82, sz: rr * (0.9 + 0.2 * hash(ti, sd + 200 + n)), yaw: hash(ti, sd + 220 + n) * 6.28, c: [col.r, col.g, col.b], H, rnd: hash(ti, sd + 3), kind: 1, bx: t.x, bz: t.z });
      }
    }
  });

  const own = wind ? null : { uWindT: { value: 0 }, uWind: { value: new THREE.Vector4(1, 0, 0, 0) } };
  const uniforms = {
    ...(wind ? wind.uniforms : own),
    uSwayK: { value: opts.sway ?? 0.016 },
    uBark: { value: new THREE.Color(bark) },
    uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() }, uSunColor: { value: new THREE.Color('#fff2d8') }, uSkyColor: { value: new THREE.Color('#9db8d8') },
    uFogColor: { value: new THREE.Color('#bcd6ee') }, uFog: { value: new THREE.Vector2(1e6, 2e6) },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT.replace('__WIND__', wind ? wind.glsl : NOWIND), fragmentShader: FRAG, name: 'pvtrees_mat' });

  const mk = (name, src, items) => {
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', src.attributes.position);
    const n = items.length, off = new Float32Array(n * 3), scl = new Float32Array(n * 3), colA = new Float32Array(n * 4), info = new Float32Array(n * 4), bz = new Float32Array(n);
    items.forEach((o, i) => { off.set([o.x, o.y, o.z], i * 3); scl.set([o.sx, o.sy, o.sz], i * 3); colA.set([...o.c, o.yaw], i * 4); info.set([o.H, o.rnd, o.kind, o.bx], i * 4); bz[i] = o.bz; });
    geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); geo.setAttribute('aScl', new THREE.InstancedBufferAttribute(scl, 3));
    geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(colA, 4)); geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));
    geo.setAttribute('aBaseZ', new THREE.InstancedBufferAttribute(bz, 1)); geo.instanceCount = n;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 80, -60), 1e5);
    const m = new THREE.Mesh(geo, mat); m.name = name; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false;
    m.userData.noAO = true; m.userData.matKind = 'none'; m.userData.grungeKind = 'none';
    return m;
  };
  const trunkGeo = new THREE.CylinderGeometry(0.62, 1, 1, 7, 1).toNonIndexed(); trunkGeo.translate(0, 0.5, 0);
  const canopyGeo = lumpyIco(THREE, 1, 0.16, seed + 4); canopyGeo.translate(0, 0, 0);
  const trunks = mk('pv_trunks', trunkGeo, cT), canopies = mk('pv_canopy', canopyGeo, cC);
  const group = new THREE.Group(); group.name = 'pv_trees'; group.add(trunks, canopies);

  const lightFrom = (sun, hemi) => {
    if (sun) { uniforms.uSunDir.value.copy(sun.position).sub(sun.target.position).normalize(); uniforms.uSunColor.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI); }
    if (hemi) uniforms.uSkyColor.value.copy(hemi.color).lerp(hemi.groundColor, 0.25).multiplyScalar(hemi.intensity / Math.PI * 1.8);
  };
  const fogFrom = (fog) => {
    if (!fog) { uniforms.uFog.value.set(1e6, 2e6); return; }
    uniforms.uFogColor.value.copy(fog.color);
    if (fog.isFogExp2) uniforms.uFog.value.set(0, 2.6 / Math.max(fog.density, 1e-5)); else uniforms.uFog.value.set(fog.near, fog.far);
  };
  return {
    group, uniforms, count: cT.length + cC.length, lightFrom, fogFrom,
    // scene: nạp ánh sáng + sương mỗi lần vẽ (cả 2 mesh, để thân và tán luôn cùng một giá trị)
    bind(scene) {
      const hook = () => { lightFrom(scene.children.find((o) => o.isDirectionalLight && o.name === 'sun'), scene.children.find((o) => o.isHemisphereLight)); fogFrom(scene.fog); };
      trunks.onBeforeRender = hook; canopies.onBeforeRender = hook; return this;
    },
    update(t) { if (wind) wind.update(t); else uniforms.uWindT.value = t; },
    dispose() { trunks.geometry.dispose(); canopies.geometry.dispose(); mat.dispose(); group.removeFromParent(); },
  };
}
