// wreck.js — XÁC TÀU ĐỨT ĐÔI dưới rạn san hô (s124). Lấy lưới thân tàu Kenney (pirate-kit/ship-wreck) rồi:
//   · cắt làm 2 nửa dọc mép lởm chởm (discard theo toạ độ cục bộ như mastbreak.js), đẩy 2 nửa lệch nhau (mũi ngóc, đuôi chìm);
//   · cột buồm cắt cụt thành gốc răng cưa, thêm gốc cột gãy + cột đổ nằm vắt qua mạn (mảnh đen, nhám);
//   · gỗ đen phong hoá: tối màu, rêu xanh quanh mực nước, hà trắng lốm đốm ở thấp. Mọi thứ tĩnh (thuần, tất định).
// Bật/tắt: __autoFx.wreckSplit (nhãn "Tàu đứt đôi"); tắt ⇒ env hiện lại tàu nguyên như cũ (không đổi hình bưu thiếp).
//   const w = createWreck(THREE, K.ship({ sails: false })); g.add(w.root) …  w.setOn(bool)
export const wreckOn = () => globalThis.__autoFx?.wreckSplit !== false;

const VP = ['#include <common>', '#include <common>\nvarying vec3 vWrP;', '#include <begin_vertex>', '#include <begin_vertex>\nvWrP = position;'];

function weatherMat(THREE, base, side) {   // side: 0 = nửa mũi (z > cắt), 1 = nửa đuôi
  const m = base.clone(); m.side = THREE.DoubleSide; m.name = 'cleave_' + side;
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(VP[0], VP[1]).replace(VP[2], VP[3]);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWrP;
float wrH(vec3 q){ return fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
{ vec3 p = vWrP;
  float edge = ${CUT.toFixed(3)} + 0.38 * sin(p.x * 5.3 + p.y * 2.9) + 0.22 * sin(p.y * 9.1 - p.x * 3.7) + 0.12 * sin(p.x * 17.0 + p.y * 5.0);
  ${side === 0 ? 'if (p.z < edge) discard;' : 'if (p.z >= edge) discard;'}
  if (p.y > 5.0) discard;                                                         // bỏ cột/mũi trên cao
  float ang = atan(p.x, p.z - 0.67), jag = 2.9 + 0.5 * abs(sin(ang * 3.0 + 0.6)) + 0.7 * wrH(vec3(floor(ang * 2.0), 1.0, 2.0));
  if (abs(p.x) < 0.75 && p.z > -0.1 && p.z < 1.5 && p.y > jag) discard;           // cột chính gãy răng cưa
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{ vec3 p = vWrP; float n1 = wrH(floor(p * 7.0)), n2 = wrH(floor(p * 38.0 + 3.0));
  vec3 c = diffuseColor.rgb * vec3(0.30, 0.26, 0.23);                              // gỗ đen phong hoá
  float low = 1.0 - smoothstep(1.1, 2.9, p.y);
  c = mix(c, vec3(0.16, 0.27, 0.12), low * (0.35 + 0.4 * n1));                    // rêu quanh mực nước
  c = mix(c, vec3(0.62, 0.60, 0.54), step(0.93, n2) * (1.0 - smoothstep(0.8, 2.0, p.y)) * 0.6);   // hà
  diffuseColor.rgb = c; }`);
  };
  m.customProgramCacheKey = () => 'wreckSplit' + side;
  return m;
}
const CUT = -1.2;

export function createWreck(THREE, ship) {
  const root = ship;   // dùng luôn nhóm tàu (đã scale chuẩn của fit) làm gốc → đặt/nghiêng giống tàu cũ
  let main = null; root.traverse((o) => { if (o.isMesh && (!main || o.geometry.attributes.position.count > main.geometry.attributes.position.count)) main = o; });
  const parent = main.parent, base = main.material, orig = main;
  const extras = []; parent.traverse((o) => { if (o !== main && o.isMesh) extras.push(o); });   // cỏ, buồm, thùng… của GLB
  const halves = new THREE.Group(); halves.name = 'wreck_split'; parent.add(halves);
  const mk = (side) => {
    const g = new THREE.Group(); g.position.set(0, 0, CUT); g.name = 'cleave_g' + side;
    const mesh = new THREE.Mesh(main.geometry, weatherMat(THREE, base, side)); mesh.name = 'cleave_m' + side;
    mesh.position.set(0, 0, -CUT); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); halves.add(g); return g;
  };
  const bow = mk(0), stern = mk(1);
  bow.position.set(0.15, 0.55, CUT + 0.9); bow.rotation.set(-0.16, 0.10, 0.05);       // mũi ngóc, trôi ra
  stern.position.set(-0.1, -0.7, CUT - 0.9); stern.rotation.set(0.22, -0.12, -0.10);   // đuôi chìm, lún nghiêng
  // gỗ gãy: gốc cột (răng cưa) + cột đổ vắt qua mạn + mảnh ván trôi
  const dark = new THREE.MeshStandardMaterial({ color: '#27201a', roughness: 1 }), pale = new THREE.MeshStandardMaterial({ color: '#7a6a52', roughness: 1 });
  const h = (a, b) => { const s = Math.sin(a * 91.7 + b * 13.3) * 43758.5; return s - Math.floor(s); };
  const splint = (r, len, seed, top) => {
    const geo = new THREE.CylinderGeometry(r * 0.85, r, len, 7, 1); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0 && top) p.setY(i, p.getY(i) + (h(i, seed) - 0.3) * len * 0.35);
    geo.computeVertexNormals(); const m = new THREE.Mesh(geo, dark); m.castShadow = true; return m;
  };
  const stub2 = splint(0.28, 1.5, 3, true); stub2.name = 'cleave_stub'; stub2.position.set(0.1, 4.1, -3.7); stern.add(stub2); stub2.position.set(0.1, 4.1, -3.7 - CUT);
  const mast = splint(0.2, 5.2, 8, true); mast.name = 'cleave_fallenMast'; mast.rotation.set(1.42, 0.0, -0.55); mast.position.set(0.9, 3.4, 2.4 - CUT); stern.add(mast);
  mast.position.set(1.2, 3.0, -2.0 - CUT);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 2.4), pale); plank.name = 'cleave_plank'; plank.rotation.set(0.3, 0.9, 0.4); plank.position.set(-1.2, 2.2, CUT + 0.4); bow.add(plank);
  // gốc cột nát + đồ đạc chìm trên boong: gộp lưới theo vật liệu (3 draw call), dùng lại vật liệu gỗ sẵn có (không thêm shader)
  const rope = new THREE.MeshStandardMaterial({ color: '#8a7650', roughness: 1 }), moss = new THREE.MeshStandardMaterial({ color: '#2f4a22', roughness: 1 });
  const bag = new Map([[dark, []], [pale, []], [rope, []], [moss, []]]);
  const put = (mat, geo, x, y, z, rx, ry, rz) => {
    const o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); o.updateMatrix();
    const g = geo.index ? geo.toNonIndexed() : geo; g.applyMatrix4(o.matrix); bag.get(mat).push(g);
  };
  const MX = 0, MZ = 0.67 - CUT, MY = 3.0;                       // chân cột chính trong hệ nhóm mũi
  for (let i = 0; i < 11; i++) {                                  // dăm gỗ nhọn quanh chỗ gãy
    const a = i / 11 * Math.PI * 2 + h(i, 1) * 0.4, rr = 0.28 + h(i, 2) * 0.25, ln = 0.35 + h(i, 3) * 0.55;
    const sp = new THREE.ConeGeometry(0.07 + h(i, 4) * 0.07, ln, 4);
    put(i % 3 ? dark : pale, sp, MX + Math.cos(a) * rr, MY + 0.1 + ln * 0.5 + h(i, 5) * 0.15, MZ + Math.sin(a) * rr, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
  }
  for (let i = 0; i < 5; i++) {                                   // ván vỡ quanh gốc cột
    const a = i * 1.3 + 0.4, pl = new THREE.BoxGeometry(0.2, 0.06, 0.8 + h(i, 6) * 0.9);
    put(i % 2 ? pale : dark, pl, MX + Math.cos(a) * 0.9, MY - 0.45 + h(i, 7) * 0.2, MZ + Math.sin(a) * 0.9, 0.3 * h(i, 8), a, 0.35 * (h(i, 9) - 0.5));
  }
  const DK = MY - 0.95;                                           // mặt boong ước lượng
  const barrel = new THREE.CylinderGeometry(0.28, 0.28, 0.6, 8);
  put(dark, barrel, 0.9, DK + 0.3, MZ + 0.2); put(dark, barrel, 0.7, DK + 0.25, MZ + 1.0, 0, 0, 1.2);
  put(dark, barrel, -0.8, DK + 0.3, MZ - 0.6, 0.2, 0, 0.1);
  put(moss, new THREE.CylinderGeometry(0.29, 0.29, 0.1, 8), 0.9, DK + 0.62, MZ + 0.2);  // rêu phủ nắp thùng
  put(pale, new THREE.BoxGeometry(0.6, 0.45, 0.5), -0.7, DK + 0.22, MZ + 0.7, 0, 0.5, 0.08);   // thùng gỗ
  put(moss, new THREE.BoxGeometry(0.62, 0.08, 0.52), -0.7, DK + 0.46, MZ + 0.7, 0, 0.5, 0.08);
  put(rope, new THREE.TorusGeometry(0.32, 0.07, 5, 12), 0.2, DK + 0.1, MZ + 1.5, Math.PI / 2, 0, 0);       // cuộn dây
  put(rope, new THREE.TorusGeometry(0.2, 0.06, 5, 10), 0.2, DK + 0.2, MZ + 1.5, Math.PI / 2, 0, 0);
  put(dark, new THREE.CylinderGeometry(0.07, 0.09, 3.0, 5), -0.3, DK + 0.3, MZ - 1.6, 0.1, 1.0, Math.PI / 2 - 0.12);   // sào đổ
  for (let i = 0; i < 7; i++)                                     // rong/hà bám
    put(moss, new THREE.ConeGeometry(0.1, 0.5 + h(i, 11) * 0.5, 4), -1 + h(i, 12) * 2, DK + 0.25, MZ - 1.5 + h(i, 13) * 3, 0.2 * (h(i, 14) - 0.5), 0, 0.3 * (h(i, 15) - 0.5));
  const merge = (list) => {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3); let o = 0;
    for (const g of list) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); return geo;
  };
  for (const [mat, list] of bag) if (list.length) { const m = new THREE.Mesh(merge(list), mat); m.name = 'cleave_clutter'; m.castShadow = true; bow.add(m); }
  const setOn = (on) => {   // bật = 2 nửa; tắt = tàu nguyên bản (mọi lưới gốc hiện lại)
    halves.visible = on; orig.visible = !on; for (const x of extras) x.visible = !on;
  };
  setOn(wreckOn());
  return { root, setOn, update() { setOn(wreckOn()); } };
}
