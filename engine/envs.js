// envs.js — Bối cảnh + preset ánh sáng. Mọi env dựng tại gốc toạ độ, chỉ 1 env hiển thị mỗi shot.
//   const envs = createEnvs(THREE, stage, K);   // K = propKit(THREE)
//   envs.use('townNight', t, ctx);              // bật env, đặt bầu trời/ánh sáng, cập nhật sóng/hạt theo t
// Nhà gia đình đứng ở gốc, mặt trước +Z. Phố chạy theo trục X ở z = +34.
import { fxSnow, fxRain, lightning, fxBolt } from './fx.js';
import { createWater } from './water.js';
import { createOceanLife, OCEAN_LIFE_ASSETS } from './whales.js';
import { townLife } from './townlife.js';

export const LIGHTS = {
  day:      { top: '#3f9fe6', bottom: '#cdeeff', fog: '#cfeaff', fogR: [160, 700], hemi: ['#ffffff', '#7a9a66', 1.15], sun: ['#fff3dc', 2.6], dir: [0.5, 1, 0.6], exposure: 1.0, night: 0 },
  beach:    { top: '#2f95e3', bottom: '#bfeaff', fog: '#cdefff', fogR: [180, 800], hemi: ['#ffffff', '#d8c08a', 1.2], sun: ['#fff1d6', 2.8], dir: [0.4, 1, 0.7], exposure: 1.0, night: 0 },
  desert:   { top: '#5fb2ec', bottom: '#fbe3b8', fog: '#f7e2bb', fogR: [150, 650], hemi: ['#fff6e6', '#d9a860', 1.2], sun: ['#ffe2b0', 2.8], dir: [0.6, 0.9, 0.4], exposure: 1.0, night: 0 },
  snow:     { top: '#7cb9e8', bottom: '#e9f6ff', fog: '#e4f2fb', fogR: [120, 600], hemi: ['#ffffff', '#b8cfe0', 1.25], sun: ['#ffffff', 2.2], dir: [0.4, 1, 0.6], exposure: 0.95, night: 0 },
  night:    { top: '#0c1238', bottom: '#33428a', fog: '#26326e', fogR: [90, 520], hemi: ['#8fa0ff', '#1b2040', 0.95], sun: ['#a9bcff', 1.3], dir: [-0.5, 1, 0.5], exposure: 1.05, night: 1 },
  snowNight:{ top: '#0d1640', bottom: '#4a5ea8', fog: '#3a4a8c', fogR: [90, 520], hemi: ['#aab8ff', '#4a5a90', 1.0], sun: ['#c4d0ff', 1.3], dir: [-0.4, 1, 0.5], exposure: 1.05, night: 1 },
  storm:    { top: '#0f1c40', bottom: '#33507e', fog: '#26395e', fogR: [70, 380], hemi: ['#a4b8e0', '#1c2848', 1.4], sun: ['#c4d2f2', 1.4], dir: [0.3, 1, 0.4], exposure: 1.25, night: 1 },
  interior: { top: '#f3e2b8', bottom: '#f3e2b8', fog: null, hemi: ['#fff3dc', '#8a6a44', 1.35], sun: ['#ffe9c4', 1.6], dir: [0.6, 0.9, 0.8], exposure: 1.0, night: 0 },
  bedNight: { top: '#2a2f6a', bottom: '#2a2f6a', fog: null, hemi: ['#9aa6ff', '#3a2a40', 1.0], sun: ['#aab6ff', 1.2], dir: [-0.8, 0.7, 0.4], exposure: 1.05, night: 1 },
  ocean:    { top: '#2e8fe0', bottom: '#c3ebff', fog: '#bfe6fa', fogR: [200, 900], hemi: ['#ffffff', '#3a8fb0', 1.15], sun: ['#fff4e0', 2.6], dir: [0.5, 1, 0.5], exposure: 1.0, night: 0 },
  sky:      { top: '#2c7fd6', bottom: '#d8f0ff', fog: '#e8f6ff', fogR: [250, 1000], hemi: ['#ffffff', '#c8d8e8', 1.25], sun: ['#fff6e6', 2.6], dir: [0.5, 1, 0.5], exposure: 1.0, night: 0 },
};

const hash = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

// Asset Kenney dùng trong env (index.html gọi A.load(ENV_ASSETS) trước khi createEnvs).
export const ENV_ASSETS = [
  ...'abcdefghijklmnopqrstu'.split('').map((c) => `city-kit-suburban/building-type-${c}`),
  'city-kit-suburban/tree-large', 'city-kit-suburban/tree-small', 'city-kit-suburban/fence-1x4', 'city-kit-suburban/planter',
  'city-kit-roads/light-square', 'city-kit-roads/light-curved',
  ...['A', 'B', 'C', 'D'].map((c) => `nature-kit/tree_pineTall${c}_detailed`), ...['A', 'B', 'C', 'D', 'E', 'F'].map((c) => `nature-kit/tree_pineRound${c}`),
  'nature-kit/tree_palmTall', 'nature-kit/tree_palmDetailedTall', 'nature-kit/tree_palmBend', 'nature-kit/tree_palmDetailedShort',
  'nature-kit/tree_oak', 'nature-kit/tree_detailed', 'nature-kit/tree_fat', 'nature-kit/tree_default', 'nature-kit/tree_tall',
  'nature-kit/plant_bushLarge', 'nature-kit/plant_bushDetailed', 'nature-kit/plant_bush', 'nature-kit/flower_redA', 'nature-kit/flower_yellowB', 'nature-kit/flower_purpleA',
  ...['A', 'B', 'C', 'D', 'E', 'F'].map((c) => `nature-kit/rock_large${c}`), ...['A', 'B', 'C', 'D'].map((c) => `nature-kit/stone_large${c}`),
  'nature-kit/rock_tallA', 'nature-kit/rock_tallC', 'nature-kit/cactus_tall', 'nature-kit/cactus_short', 'nature-kit/log', 'nature-kit/stump_round',
  'pirate-kit/ship-large', 'pirate-kit/ship-wreck', 'pirate-kit/rocks-a', 'pirate-kit/rocks-b', 'pirate-kit/rocks-c', 'pirate-kit/rocks-sand-a', 'pirate-kit/rocks-sand-b',
  'pirate-kit/palm-detailed-straight', 'pirate-kit/palm-detailed-bend', 'pirate-kit/barrel', 'pirate-kit/crate', 'pirate-kit/chest',
  'furniture-kit/kitchenCabinet', 'furniture-kit/kitchenCabinetDrawer', 'furniture-kit/kitchenSink', 'furniture-kit/kitchenStove', 'furniture-kit/kitchenCabinetUpper',
  'polyfork/penguin-base', 'polyfork/old-lighthouse-48ca6c', 'polyfork/curbside-mailbox-0e0736', 'polyfork/herring-gull-55c3da', 'polyfork/driftwood-log-89a68f', 'polyfork/marram-grass-tuft-8c7a99', 'polyfork/shell-scatter-6d36b7', 'polyfork/tamarisk-bush-ba4337', 'polyfork/rowing-dinghy-022673', 'polyfork/snow-laden-spruce-36716e', 'polyfork/windblown-larch-abb99c', 'polyfork/boulder-field-cluster-08e364', 'polyfork/rock-outcrop-158ac3', 'polyfork/dwarf-pine-mat-faee77', 'polyfork/bare-mountain-rowan-10e72e',
  ...OCEAN_LIFE_ASSETS,   // cá nhà táng có xương + clip (engine/whales.js)
  'furniture-kit/pottedPlant', 'furniture-kit/plantSmall1', 'furniture-kit/bookcaseOpen', 'furniture-kit/sideTable', 'furniture-kit/lampRoundTable', 'furniture-kit/rugRound', 'furniture-kit/coatRack',
];

export function createEnvs(THREE, stage, K0, A = null) {
  // Bọc bộ dựng-bằng-code: có model Kenney thì dùng, không thì về bản code (phim vẫn render khi thiếu asset).
  const _box = new THREE.Box3(), _sz = new THREE.Vector3();
  const fit = (id, size, { axis = 'y', seed = 0 } = {}) => {
    if (!A || !A.has(id)) return null;
    const o = A.instance(id); _box.setFromObject(o); _box.getSize(_sz);
    const cur = axis === 'xz' ? Math.max(_sz.x, _sz.z) : _sz[axis];
    const k = size / Math.max(1e-4, cur); o.scale.multiplyScalar(k);
    _box.setFromObject(o); const holder = new THREE.Group(); holder.name = 'kn_' + id.split('/')[1];
    o.position.y -= _box.min.y; o.position.x -= (_box.min.x + _box.max.x) / 2; o.position.z -= (_box.min.z + _box.max.z) / 2;
    holder.add(o); return holder;
  };
  const pick = (ids, i) => { const ok = ids.filter((id) => A && A.has(id)); return ok.length ? ok[Math.abs(i) % ok.length] : null; };
  const pickFit = (ids, i, size, opt) => { const id = pick(ids, i); return id ? fit(id, size, opt) : null; };
  const PINES = ['A', 'B', 'C', 'D'].map((c) => `nature-kit/tree_pineTall${c}_detailed`).concat(['A', 'B', 'C', 'D', 'E', 'F'].map((c) => `nature-kit/tree_pineRound${c}`));
  const PALMS = ['nature-kit/tree_palmTall', 'nature-kit/tree_palmDetailedTall', 'nature-kit/tree_palmBend', 'pirate-kit/palm-detailed-straight', 'pirate-kit/palm-detailed-bend'];
  const LEAFY = ['nature-kit/tree_oak', 'nature-kit/tree_detailed', 'nature-kit/tree_fat', 'nature-kit/tree_default', 'nature-kit/tree_tall', 'city-kit-suburban/tree-large'];
  const ROCKS = ['A', 'B', 'C', 'D', 'E', 'F'].map((c) => `nature-kit/rock_large${c}`).concat(['pirate-kit/rocks-a', 'pirate-kit/rocks-b', 'pirate-kit/rocks-c']);
  const BUSH = ['nature-kit/plant_bushLarge', 'nature-kit/plant_bushDetailed', 'nature-kit/plant_bush'];
  let ci = 0;
  const K = Object.create(K0);
  K.pine = (h = 12, snow = false) => (snow ? null : pickFit(PINES, ci++, h)) || K0.pine(h, snow);
  K.palm = (h = 14, lean) => pickFit(PALMS, ci++, h) || K0.palm(h, lean);
  K.roundTree = (h = 10, color) => pickFit(LEAFY, ci++, h * 1.2) || K0.roundTree(h, color);
  K.jungleTree = (h = 16) => pickFit(LEAFY, ci++, h) || K0.jungleTree(h);
  K.bush = (r = 2, color) => pickFit(BUSH, ci++, r * 1.4) || K0.bush(r, color);
  K.rock = (r = 2, color, sd = 1) => pickFit(ROCKS, sd * 7 + ci++, r * 2.2, { axis: 'xz' }) || K0.rock(r, color, sd);
  K.streetLamp = () => pickFit(['city-kit-roads/light-square', 'city-kit-roads/light-curved'], 0, 10) || K0.streetLamp();
  K.fence = (len = 10) => { const f = fit('city-kit-suburban/fence-1x4', len, { axis: 'xz' }); return f || K0.fence(len); };
  K.ship = (o = {}) => fit(o.sails === false ? 'pirate-kit/ship-wreck' : 'pirate-kit/ship-large', 30, { axis: 'xz' }) || K0.ship(o);
  // Polyfork: kích thước thật (mét) → 1 m ≈ 2.9 stud (người R6 5.2 stud ≈ 1.8 m)
  const M2S = 2.9;
  const pf = (id, mult = 1, recolor = null) => {
    const full = 'polyfork/' + id; if (!A || !A.has(full)) return null;
    const ent = A.manifest()?.byId.get(full); const hm = ent?.size_m?.y;
    const o = hm ? fit(full, hm * M2S * mult) : A.instance(full, { scale: M2S * mult }); o.userData.pf = true;
    if (recolor) o.traverse((m) => {   // Polyfork tô màu theo đỉnh (COLOR_0) → đổi màu từng đỉnh trên bản sao geometry
      if (!m.isMesh || !m.geometry.attributes.color) return;
      m.geometry = m.geometry.clone(); const ca = m.geometry.attributes.color, c = new THREE.Color(), hsl = {};
      for (let i = 0; i < ca.count; i++) { c.setRGB(ca.getX(i), ca.getY(i), ca.getZ(i), THREE.LinearSRGBColorSpace); c.getHSL(hsl); const nc = recolor(hsl, c); if (nc) { c.set(nc); ca.setXYZ(i, c.r, c.g, c.b); } }
      ca.needsUpdate = true;
    });
    return o;
  };
  const kenneyHouse = (seed) => pickFit('abcdefghijklmnopqrstu'.split('').map((c) => `city-kit-suburban/building-type-${c}`), seed, 30, { axis: 'xz' });
  const { scene } = stage;
  const envs = {};
  const C = (c) => new THREE.Color(c);

  // --- bầu trời gradient (cầu lớn) ---
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { top: { value: C('#3f9fe6') }, bottom: { value: C('#cdeeff') }, flash: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; uniform float flash; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.25,0.0,1.0); vec3 c = mix(bottom, top, h); gl_FragColor = vec4(c + flash*0.6, 1.0); }',
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat); skyDome.name = 'sky'; skyDome.renderOrder = -1; scene.add(skyDome);
  if (stage.ground) stage.ground.visible = false;

  const plane = (w, d, mat, y = 0, name = 'plane', seg = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, seg, seg), mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; m.name = name; return m; };
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, ...o });
  const place = (g, obj, x, y, z, ry = 0, s = 1) => { obj.position.set(x, y, z); obj.rotation.y = ry; obj.scale.setScalar(s); g.add(obj); return obj; };
  const def = (name, light, build) => { const g = new THREE.Group(); g.name = `env_${name}`; g.visible = false; scene.add(g); const e = { name, light, group: g, update: null }; Object.assign(e, build(g, e) || {}); envs[name] = e; return e; };

  // biển: shader nước (engine/water.js). Trả về hàm (t, amp) chỉ ghi thời gian; ánh sáng/bầu trời được nạp mỗi khung trong use().
  const makeSea = (g, { preset = 'tropical', size = 1400, seg = 150, y = 0, amp, name = 'sea', ...rest } = {}) => {
    const w = createWater(THREE, { preset, size, segments: seg, y, amp, name, ...rest });
    g.add(w.mesh); (g.userData.waters ||= []).push(w);
    return (t, a) => { w.t = t; w.ampNow = a; return w; };
  };
  const bumpy = (w, d, seg, color, h, seed, name, freq = 0.04) => {
    const m = plane(w, d, mat(color, { flatShading: true }), 0, name, seg); const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.array[i * 3], y = p.array[i * 3 + 1]; const r = Math.hypot(x, y);
      const k = Math.min(1, Math.max(0, (r - 40) / 60));
      p.array[i * 3 + 2] = k * h * (Math.sin(x * freq + seed) * Math.cos(y * freq * 1.3 + seed * 2) + 0.5 * Math.sin((x + y) * freq * 2.1)); }
    m.geometry.computeVertexNormals(); return m;
  };
  const nbHouse = (color, roofC, seed) => {
    const g = new THREE.Group(); g.name = 'neighbor_house';
    const w = 18 + hash(seed, 1) * 8, d = 16, h = 10 + hash(seed, 2) * 4;
    K.box(w, h, d, color, 0, h / 2, 0, 'nb_walls', g);
    const s = new THREE.Shape(); s.moveTo(-d / 2 - 1.5, 0); s.lineTo(d / 2 + 1.5, 0); s.lineTo(0, 7); s.closePath();
    const rg = new THREE.ExtrudeGeometry(s, { depth: w + 2, bevelEnabled: false }); rg.translate(0, 0, -(w + 2) / 2); rg.rotateY(Math.PI / 2);
    const r = new THREE.Mesh(rg, mat(roofC)); r.position.y = h; r.castShadow = true; g.add(r);
    const win = new THREE.MeshStandardMaterial({ color: '#2b3b55', emissive: C('#ffd27a'), emissiveIntensity: 0, roughness: 0.3 });
    for (const x of [-w / 3, w / 3]) K.box(3.4, 4, 0.3, win, x, h * 0.55, d / 2 + 0.1, 'nb_window', g);
    K.box(3, 6, 0.3, '#6e4428', 0, 3, d / 2 + 0.1, 'nb_door', g);
    g.userData.win = win; return g;
  };
  const nbWins = [];

  // ---------- THỊ TRẤN ĐÊM (dùng cả ban ngày) ----------
  def('town', 'night', (g) => {
    g.add(plane(900, 900, mat('#5f9d4e'), 0, 'lawn'));
    const road = plane(900, 18, mat('#3d4049', { roughness: 0.9 }), 0.05, 'road'); road.position.z = 36; g.add(road);
    for (const z of [26, 46]) { const sw = plane(900, 3, mat('#b9b6ad'), 0.08, 'sidewalk'); sw.position.z = z; g.add(sw); }
    for (let i = -40; i < 40; i++) { const s = plane(5, 0.5, mat('#f4f1e1'), 0.1, 'stripe'); s.position.set(i * 11, 0.1, 36); g.add(s); }
    for (const x of [-60, 70]) for (let i = 0; i < 7; i++) { const s = plane(1.4, 14, mat('#f4f1e1'), 0.1, 'crosswalk'); s.position.set(x + i * 2.6, 0.11, 36); g.add(s); }
    const dirt = plane(36, 30, mat('#5a4330'), 0.06, 'dirt_lot'); dirt.name = 'dirt_lot'; dirt.visible = false; g.add(dirt);
    const hole = plane(26, 20, mat('#2e2219'), 0.07, 'lot_hole'); hole.visible = false; g.add(hole);
    const cols = [['#e3d5b8', '#5b6f8f'], ['#9fc5e8', '#3b4a6b'], ['#f2c6a0', '#7a3b2e'], ['#c8e0b0', '#4a5a3a'], ['#f4f1ea', '#2f6f6a'], ['#e8b4b8', '#5b3b4b']];
    let k = 0;
    for (const x of [-120, -62, 62, 120, 178, -178, 236, -236]) { const [c, r] = cols[k++ % cols.length]; const kh = kenneyHouse(k * 3); if (kh) place(g, kh, x, 0, 0, 0); else { const h = place(g, nbHouse(c, r, k), x, 0, 0, 0, 1.1); nbWins.push(h.userData.win); } }
    for (const x of [-150, -90, -30, 30, 90, 150, 210, -210]) { const [c, r] = cols[k++ % cols.length]; const kh = kenneyHouse(k * 3 + 1); if (kh) place(g, kh, x, 0, 125, Math.PI); else { const h = place(g, nbHouse(c, r, k), x, 0, 125, Math.PI, 1.1); nbWins.push(h.userData.win); } }
    // --- dãy nhà phía sau (2 hàng sau nhà gia đình, 1 hàng sau dãy bên kia đường) → thị trấn dày, có chiều sâu ---
    for (const [z, ry, x0, step, sd] of [[-68, 0, -286, 52, 50], [-136, 0, -260, 52, 80], [190, Math.PI, -264, 54, 110]])
      for (let i = 0, x = x0; x <= -x0; i++, x += step) {
        const kh = pickFit('abcdefghijklmnopqrstu'.split('').map((c) => `city-kit-suburban/building-type-${c}`), sd + i * 5, 26 + hash(i, sd) * 6, { axis: 'xz' });
        if (kh) place(g, kh, x + (hash(i, sd + 1) - 0.5) * 8, 0, z + (hash(i, sd + 2) - 0.5) * 6, ry + (hash(i, sd + 3) - 0.5) * 0.16);
        if (hash(i, sd + 4) < 0.6) place(g, K.roundTree(9 + hash(i, sd + 5) * 5), x + step / 2, 0, z + (ry ? -8 : 10));
      }
    // --- lối xe + xe đậu ở khe giữa các nhà; xe chạy + người đi bộ ban ngày (engine/townlife.js) ---
    const parked = [];
    for (const x of [-207, -149, -91, 91, 149, 207]) parked.push([x + (hash(x, 1) - 0.5) * 3, 10, Math.PI * (hash(x, 2) < 0.5 ? 0 : 1)]);
    for (const x of [-240, -180, -120, -60, 0, 60, 120, 180, 240]) if (!(x === 60)) parked.push([x + (hash(x, 3) - 0.5) * 3, 104, Math.PI * (hash(x, 4) < 0.5 ? 0 : 1)]);
    for (const [x, z] of parked) { const dw = plane(9, 18, mat('#8d8a82'), 0.07, 'driveway'); dw.position.set(x, 0.07, z + (z < 50 ? 6 : -6)); g.add(dw); }
    const life = townLife(THREE, K, { parked }); g.add(life.group);
    for (let i = -10; i <= 10; i++) { place(g, K.streetLamp(), i * 40 + 12, 0, 27.5, Math.PI / 2); place(g, K.roundTree(10 + hash(i, 7) * 4, ['#3f8f3f', '#4caf50', '#2e7d32'][(i + 30) % 3]), i * 40 - 6, 0, 22 - hash(i, 3) * 6); }
    for (const x of [-26, 26]) place(g, K.fence(16), x, 0, 22);
    place(g, K.bush(2.5), -18, 0, 16); place(g, K.bush(2.2), 19, 0, 17);
    for (let i = 0; i < 24; i++) { const f = pickFit(['nature-kit/flower_redA', 'nature-kit/flower_yellowB', 'nature-kit/flower_purpleA'], i, 1.2); if (f) place(g, f, -24 + (i % 12) * 4.2 + hash(i, 2), 0, 18 + Math.floor(i / 12) * 2.5, hash(i, 3) * 6); }
    const moon = place(g, K.moon(34), -170, 170, -420); moon.name = 'moon_town';
    return { setNight(n) { nbWins.forEach((w) => { w.emissiveIntensity = n * 1.4; }); moon.visible = n > 0.5; }, dirt, hole,
      update(t, ctx) { const L = LIGHTS[ctx.light || 'night']; life.update(t, !L.night); } };
  });

  // ---------- RỪNG ----------
  def('forest', 'night', (g) => {
    g.add(plane(900, 900, mat('#2f5a33'), 0, 'forest_floor'));
    const path = plane(900, 16, mat('#6b5a3c'), 0.05, 'path'); g.add(path);
    for (let i = 0; i < 160; i++) { const x = (hash(i, 1) - 0.5) * 600, z = (hash(i, 2) - 0.5) * 300; if (Math.abs(z) < 16) continue; place(g, K.pine(14 + hash(i, 3) * 14), x, 0, z, hash(i, 4) * 6); }
  });

  // ---------- HAWAII (bãi biển) ----------
  def('hawaii', 'beach', (g, e) => {
    const sand = plane(900, 260, mat('#f1d79a'), 0, 'sand'); sand.position.z = -60; g.add(sand);
    e.sea = makeSea(g, { preset: 'tropical', y: 0.4, amp: 0.6, size: 1400, center: [0, -380], shore: { line: [0, 1, 62, 5] } }); g.children[g.children.length - 1].position.z = 380;
    for (let i = 0; i < 14; i++) place(g, K.palm(14 + hash(i, 5) * 8, 0.2 + hash(i, 6) * 0.2), -120 + i * 18 + hash(i, 1) * 8, 0, -30 - hash(i, 2) * 50, hash(i, 3) * 6);
    for (let i = 0; i < 6; i++) place(g, K.rock(2 + hash(i, 9) * 2, '#9a8a7a', i), -60 + i * 25, 0, 40 + hash(i, 4) * 10);
    place(g, K.cloud(2.2), -80, 90, -260); place(g, K.cloud(1.8), 90, 110, -300);
    return { update(t) { e.sea(t); } };
  });

  // ---------- BRAZIL (rừng rậm) ----------
  def('brazil', 'day', (g) => {
    g.add(plane(900, 900, mat('#4f8f3a'), 0, 'jungle_floor'));
    g.add(plane(14, 200, mat('#7a5a3a'), 0.05, 'jungle_path'));
    for (let i = 0; i < 120; i++) { const x = (hash(i, 1) - 0.5) * 300, z = (hash(i, 2) - 0.5) * 300; if (Math.hypot(x, z) < 34 || (z > 0 && Math.abs(x) < 70)) continue; place(g, K.jungleTree(16 + hash(i, 3) * 16), x, 0, z, hash(i, 4) * 6); }
    for (let i = 0; i < 60; i++) { const x = (hash(i, 5) - 0.5) * 200, z = (hash(i, 6) - 0.5) * 200; if (Math.hypot(x, z) < 26 || (z > 10 && Math.abs(x) < 50)) continue; place(g, K.bush(2 + hash(i, 7) * 2, ['#2e8b3c', '#3c9a46', '#56b04a'][i % 3]), x, 0, z); }
    for (let i = 0; i < 4; i++) { const b = K.box(1.2, 0.6, 1.8, '#d9413a', 0, 0, 0, 'bird', g); b.position.set(-20 + i * 9, 28 + i * 3, -10); }
  });

  // ---------- SAHARA ----------
  def('sahara', 'desert', (g) => {
    g.add(bumpy(900, 900, 80, '#e7b86a', 10, 1.7, 'dunes', 0.025));
    for (let i = 0; i < 4; i++) place(g, K.rock(1.5, '#c08a52', i + 20), -30 + i * 20, 0, 30 + i * 4);
    for (let i = 0; i < 9; i++) { const c = pickFit(['nature-kit/cactus_tall', 'nature-kit/cactus_short'], i, 6 + hash(i, 1) * 5); if (c) place(g, c, (hash(i, 2) - 0.5) * 220, 0, -40 - hash(i, 3) * 120 + (i % 2) * 90, hash(i, 4) * 6); }
  });

  // ---------- NAM CỰC ----------
  def('antarctica', 'snow', (g, e) => {
    g.add(bumpy(900, 900, 70, '#f3f8fb', 6, 0.4, 'snowfield', 0.03));
    for (let i = 0; i < 10; i++) place(g, K.iceberg(40 + hash(i, 1) * 50, i % 2 ? '#e8f3f9' : '#d8eaf3'), -300 + i * 70, 0, -200 - hash(i, 2) * 120, hash(i, 3) * 6);
    e.mailbox = place(g, pf('curbside-mailbox-0e0736', 1.6) || K.mailbox(), 11, 0, 31, 0);
    e.penguins = [0, 1, 2, 3].map((i) => place(g, pf('penguin-base', 1.7) || K.penguin(), 0, 0, 0, 0, 1));
    for (let i = 0; i < 14; i++) { const o = pf(['boulder-field-cluster-08e364', 'rock-outcrop-158ac3', 'dwarf-pine-mat-faee77'][i % 3], 1.4 + hash(i, 9)); if (o) place(g, o, (hash(i, 1) - 0.5) * 220, 0, -30 - hash(i, 2) * 120 + (i % 3 === 0 ? 100 : 0), hash(i, 3) * 6); }
    e.snow = fxSnow(THREE, { count: 900, area: [120, 60, 120], speed: 3, size: 0.45, wind: [3, 0] }); g.add(e.snow.obj);
    return { update(t, ctx) { e.snow.update(t, ctx.focus || [0, 0, 0]); e.penguins.forEach((p, i) => { const x = -22 + ((t * 2.2 + i * 5) % 60); p.position.set(x, 0, 38 + (i % 2) * 3); p.rotation.y = Math.PI / 2; if (p.userData.pf) { p.rotation.z = Math.sin((t + i * 0.3) * 7) * 0.12; p.position.y = Math.abs(Math.sin((t + i * 0.3) * 7)) * 0.15; } else K.waddle(p, t + i * 0.3); }); } };
  });

  // ---------- ĐẠI DƯƠNG (nhà ngập nước) ----------
  def('ocean', 'ocean', (g, e) => {
    e.sea = makeSea(g, { preset: 'deep', y: 11, amp: 0.6, size: 1600 });
    g.add(plane(900, 900, mat('#0e5f86'), -10, 'seabed'));
    // cá voi GLB (nổi lên, bơi vòng quanh chân nhà, 1 cú nhảy + nước văng); thiếu asset → về cá voi khối cũ
    e.life = A && A.has('sea/sperm_whale') ? createOceanLife(THREE, A, { seaY: 11 }) : null;
    if (e.life) g.add(e.life.group);
    else e.whales = [0, 1, 2].map(() => place(g, K.whale(), 0, 0, 0, 0, 1));
    place(g, K.cloud(2.5), -120, 120, -300); place(g, K.cloud(2), 150, 100, -350);
    return { update(t) { e.sea(t);
      if (e.life) e.life.update(t, stage.camera, stage.renderer);
      else e.whales.forEach((w, i) => { const a = t * 0.18 + i * 2.1, r = 30 + i * 9; w.position.set(Math.cos(a) * r, 7 + Math.sin(t * 0.9 + i) * 0.6, Math.sin(a) * r); w.rotation.y = -a; K.swim(w, t, i); }); } };
  });

  // ---------- ĐỈNH NÚI TRÊN MÂY ----------
  def('mountain', 'sky', (g, e) => {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(70, 120, 9, 3), mat('#7d7069', { flatShading: true })); peak.position.y = -62; peak.name = 'peak'; peak.receiveShadow = true; g.add(peak);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(26, 34, 6, 9), mat('#8a7d74', { flatShading: true })); top.position.y = -3; top.name = 'peak_top'; top.receiveShadow = true; g.add(top);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(27, 29, 1.2, 9), mat('#f4f8fb', { flatShading: true })); cap.position.y = 0.2; cap.name = 'snow_cap'; cap.receiveShadow = true; g.add(cap);
    for (let i = 0; i < 10; i++) place(g, K.rock(3 + hash(i, 1) * 4, '#6b5f58', i + 40), Math.cos(i) * (24 + hash(i, 2) * 6), -2, Math.sin(i) * (24 + hash(i, 3) * 6));
    for (let i = 0; i < 70; i++) { const a = hash(i, 4) * Math.PI * 2, r = 40 + hash(i, 5) * 360; place(g, K.cloud(2.5 + hash(i, 6) * 2.5), Math.cos(a) * r, -18 - hash(i, 7) * 14, Math.sin(a) * r, hash(i, 8) * 6); }
    for (let i = 0; i < 5; i++) place(g, K.iceberg(120, '#a8a6b0'), Math.cos(i * 1.3) * 420, -90, Math.sin(i * 1.3) * 420 - 100);
  });

  // ---------- NÚI TUYẾT ĐÊM (bắt đầu chương 10) ----------
  def('snowNight', 'snowNight', (g, e) => {
    g.add(bumpy(900, 900, 70, '#dfe8f5', 8, 2.2, 'snow_night', 0.03));
    for (let i = 0; i < 8; i++) place(g, K.iceberg(60 + hash(i, 1) * 60, '#c9d6ec'), -300 + i * 80, 0, -220 - hash(i, 2) * 100);
    for (let i = 0; i < 30; i++) place(g, pf(['snow-laden-spruce-36716e', 'snow-laden-spruce-36716e', 'windblown-larch-abb99c', 'bare-mountain-rowan-10e72e'][i % 4], 1.1 + hash(i, 4) * 0.8) || K.pine(12 + hash(i, 4) * 10, true), (hash(i, 5) - 0.5) * 300, 0, -60 - hash(i, 6) * 120, hash(i, 7) * 6);
    e.moon = place(g, K.moon(26), -120, 160, -500);
    e.snow = fxSnow(THREE, { count: 700, area: [120, 60, 120], speed: 2.5, size: 0.4 }); g.add(e.snow.obj);
    return { update(t, ctx) { e.snow.update(t, ctx.focus || [0, 0, 0]); } };
  });

  // ---------- BIỂN BĂNG (đêm) ----------
  def('iceSea', 'snowNight', (g, e) => {
    e.sea = makeSea(g, { preset: 'night', y: -0.3, amp: 0.2, size: 1400, name: 'dark_water' });
    for (let i = 0; i < 160; i++) { const x = (hash(i, 1) - 0.5) * 500, z = (hash(i, 2) - 0.5) * 500; const r = 6 + hash(i, 3) * 12;
      const fl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.8, 6), mat(i % 3 ? '#e8eef8' : '#cfdaee', { flatShading: true })); fl.position.set(x, 0, z); fl.rotation.y = hash(i, 4) * 3; fl.receiveShadow = true; fl.name = 'ice_floe'; g.add(fl); }
    const sheet = plane(70, 70, mat('#eef3fb'), 0.35, 'ice_sheet'); g.add(sheet);
    e.moon = place(g, K.moon(30), 140, 170, -520);
    return { update(t) { e.sea(t); } };
  });

  // ---------- BÃO (biển đêm, mưa, chớp) ----------
  def('storm', 'storm', (g, e) => {
    e.sea = makeSea(g, { preset: 'storm', y: 2, amp: 2.4, size: 1600 });
    e.rain = fxRain(THREE, { count: 2200 }); g.add(e.rain.obj);
    e.bolt = fxBolt(THREE); e.bolt.position.set(-40, 20, -140); e.bolt.scale.setScalar(2); g.add(e.bolt);
    return { update(t, ctx) { e.sea(t * 1.6, 2.4); e.rain.update(t, ctx.focus || [0, 0, 0]); const f = lightning(t); e.bolt.visible = f > 0.5; ctx.flash = f; } };
  });

  // ---------- BOONG TÀU TRONG BÃO (hồi tưởng) ----------
  def('shipStorm', 'storm', (g, e) => {
    e.sea = makeSea(g, { preset: 'storm', y: -1, amp: 2.2, size: 1600 });
    e.ship = place(g, K.ship(), 0, 0, 0, 0, 1);
    e.rain = fxRain(THREE, { count: 1600, area: [70, 50, 70] }); g.add(e.rain.obj);
    e.bolt = fxBolt(THREE, { seed: 9 }); e.bolt.position.set(30, 25, -120); e.bolt.scale.setScalar(1.8); g.add(e.bolt);
    return { update(t, ctx) { e.sea(t * 1.5, 2.2); e.rain.update(t, ctx.focus || [0, 0, 0]); e.ship.rotation.z = Math.sin(t * 1.1) * 0.12; e.ship.rotation.x = Math.sin(t * 0.8) * 0.06; e.ship.position.y = Math.sin(t * 1.3) * 0.8; const f = lightning(t, { every: 2.4, seed: 8 }); e.bolt.visible = f > 0.5; ctx.flash = f; } };
  });

  // ---------- ĐẢO HẢI ĐĂNG ----------
  def('island', 'beach', (g, e) => {
    e.sea = makeSea(g, { preset: 'tropical', y: -0.6, amp: 0.4, size: 1600, shore: { circle: [0, 0, 70.6, 5] } });
    const isl = new THREE.Mesh(new THREE.CylinderGeometry(70, 82, 6, 28), mat('#f2d89a')); isl.position.y = -3; isl.receiveShadow = true; isl.name = 'island_sand'; g.add(isl);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(30, 34, 1.2, 20), mat('#6cbf58')); grass.position.set(-30, 0.1, -30); grass.receiveShadow = true; g.add(grass);
    // mỏm đá + hải đăng
    e.cliff = new THREE.Group(); e.cliff.name = 'cliff'; e.cliff.position.set(60, 0, -50); g.add(e.cliff);
    for (let i = 0; i < 9; i++) { const r = K.rock(6 + hash(i, 1) * 5, i % 2 ? '#6b5444' : '#7d6452', i + 60); r.position.set((hash(i, 2) - 0.5) * 18, hash(i, 3) * 4, (hash(i, 4) - 0.5) * 18); e.cliff.add(r); }
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(9, 12, 8, 10), mat('#6b5444', { flatShading: true })); plinth.position.y = 4; plinth.castShadow = plinth.receiveShadow = true; e.cliff.add(plinth);
    const pfl = pf('old-lighthouse-48ca6c', 0.8, (h) => (h.s > 0.35 && (h.h < 0.06 || h.h > 0.94) ? '#2f8f6b' : (h.l > 0.75 && h.s > 0.2 ? '#f4f4ef' : null)));
    if (pfl) { plinth.scale.set(1.3, 0.6, 1.3); plinth.position.y = 2.4; }
    e.lighthouse = pfl || K.lighthouse(); e.lighthouse.position.y = pfl ? 4.6 : 8; e.cliff.add(e.lighthouse);
    e.seat = new THREE.Vector3(44, 2.4, -28);   // chỗ cha ngồi (mỏm đá dưới chân hải đăng)
    place(g, K.rock(2.6, '#7d6452', 77), 44, -0.9, -28.6);
    for (let i = 0; i < 26; i++) { const a = hash(i, 5) * Math.PI * 2, r = 30 + hash(i, 6) * 32, px = Math.cos(a) * r - 10, pz = Math.sin(a) * r - 20;
      if (Math.hypot(px + 10, pz) < 36 || Math.hypot(px - 40, pz + 22) < 22 || Math.hypot(px - 60, pz + 50) < 16 || (px > -10 && pz > -30 && px < 50)) continue; place(g, K.palm(13 + hash(i, 7) * 8, 0.2 + hash(i, 8) * 0.25), px, 0, pz, hash(i, 9) * 6); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; place(g, K.rock(2 + hash(i, 10) * 2, '#8a7a6a', i + 80), Math.cos(a) * 76, -1, Math.sin(a) * 76); }
    place(g, K.cloud(2.4), -100, 110, -320); place(g, K.cloud(2), 120, 130, -380);
    // chi tiết bãi biển Polyfork: gỗ trôi, cỏ biển, vỏ sò, bụi, thuyền chèo, mòng biển
    for (let i = 0; i < 40; i++) { const a = hash(i, 21) * Math.PI * 2, r = 20 + hash(i, 22) * 52, x = Math.cos(a) * r - 10, z = Math.sin(a) * r - 20;
      if (Math.hypot(x + 10, z) < 30 || Math.hypot(x - 42, z + 26) < 9) continue;
      const o = pf(['marram-grass-tuft-8c7a99', 'marram-grass-tuft-8c7a99', 'shell-scatter-6d36b7', 'tamarisk-bush-ba4337', 'driftwood-log-89a68f'][i % 5], 1 + hash(i, 23) * 0.5); if (o) place(g, o, x, 0, z, hash(i, 24) * 6); }
    const dinghy = pf('rowing-dinghy-022673', 1.1); if (dinghy) place(g, dinghy, -40, 0, 62, 0.8);
    e.gulls = [0, 1, 2].map((i) => { const o = pf('herring-gull-55c3da', 1.3); return o ? place(g, o, 0, 0, 0) : null; }).filter(Boolean);
    return { update(t) { e.sea(t); e.gulls.forEach((gl, i) => { const a = t * 0.35 + i * 2.1; gl.position.set(30 + Math.cos(a) * (18 + i * 6), 26 + i * 4 + Math.sin(t * 1.3 + i) * 1.2, -20 + Math.sin(a) * (14 + i * 5)); gl.rotation.y = -a; }); } };
  });

  // ---------- BÃI ĐÁ NGẦM + XÁC TÀU ----------
  def('reef', 'beach', (g, e) => {
    const reefSpots = Array.from({ length: 12 }, (_, i) => [(hash(i, 2) - 0.5) * 70, (hash(i, 3) - 0.5) * 40, (5 + hash(i, 1) * 7) * 0.7]);
    e.sea = makeSea(g, { preset: 'shallow', y: 0, amp: 0.5, size: 1400, spots: reefSpots });
    for (let i = 0; i < 18; i++) place(g, K.rock(5 + hash(i, 1) * 7, i % 2 ? '#5b5752' : '#6e6862', i + 100), (hash(i, 2) - 0.5) * 70, -2, (hash(i, 3) - 0.5) * 40);
    e.ship = place(g, K.ship({ sails: false }), 5, 0, 0, 0.5, 1); e.ship.rotation.z = 0.35; e.ship.rotation.x = -0.15; e.ship.position.y = -1.5;
    return { update(t) { e.sea(t); } };
  });

  // ---------- NỘI THẤT: BẾP ----------
  const checker = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#5a3524' : '#f1e6cc'; g.fillRect(x * 32, y * 32, 32, 32); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.anisotropy = 4; return t; })();
  const views = {};
  const viewTex = (kind) => {
    if (views[kind]) return views[kind];
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d');
    const grad = (a, b) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); };
    if (kind === 'night') { grad('#0c1238', '#3a4a8a'); g.fillStyle = '#fff'; for (let i = 0; i < 30; i++) g.fillRect(hash(i, 1) * 256, hash(i, 2) * 180, 2, 2); }
    else if (kind === 'snow') { grad('#8cc4ee', '#eef8ff'); g.fillStyle = '#ffffff'; g.fillRect(0, 170, 256, 86); g.fillStyle = '#dbe9f3'; g.beginPath(); g.moveTo(40, 170); g.lineTo(110, 60); g.lineTo(180, 170); g.fill(); }
    else if (kind === 'sea') { grad('#7cc6f2', '#d9f2ff'); g.fillStyle = '#1fa6c9'; g.fillRect(0, 140, 256, 116); }
    else if (kind === 'mountain') { grad('#5aa8e8', '#e8f6ff'); g.fillStyle = '#8a7d74'; g.beginPath(); g.moveTo(60, 200); g.lineTo(140, 40); g.lineTo(220, 200); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(118, 84); g.lineTo(140, 40); g.lineTo(162, 84); g.fill(); g.fillStyle = '#ffffff'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(i * 36, 210 + (i % 2) * 8, 30, 0, Math.PI * 2); g.fill(); } }
    else { grad('#8fd0f5', '#e6f6ff'); g.fillStyle = '#5f9d4e'; g.fillRect(0, 180, 256, 76); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return (views[kind] = t);
  };
  def('kitchen', 'interior', (g, e) => {
    e.room = new THREE.Group(); e.room.name = 'kitchen_room'; g.add(e.room);
    const R = e.room;
    const floor = plane(60, 60, new THREE.MeshStandardMaterial({ map: checker, roughness: 0.7 }), 0, 'checker_floor'); R.add(floor);
    const wall = mat('#f3dc8c', { roughness: 0.9 }), wains = mat('#5fae7a');
    const wallAt = (x, z, ry, name) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(60, 22), wall); w.position.set(x, 11, z); w.rotation.y = ry; w.name = name; w.receiveShadow = true; R.add(w);
      const wc = new THREE.Mesh(new THREE.PlaneGeometry(60, 4), wains); wc.position.set(x, 2, z); wc.rotation.y = ry; wc.position.addScaledVector(new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)), 0.05); R.add(wc); };
    wallAt(0, -20, 0, 'wall_back'); wallAt(-24, 0, Math.PI / 2, 'wall_left'); wallAt(24, 0, -Math.PI / 2, 'wall_right'); wallAt(0, 24, Math.PI, 'wall_front');
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat('#fff6e0')); ceil.rotation.x = Math.PI / 2; ceil.position.y = 22; R.add(ceil);
    for (let i = -2; i <= 2; i++) K.box(1.2, 1.2, 60, '#7a4a2c', i * 10, 21.4, 0, 'beam', R);
    e.fridge = K.fridge(); e.fridge.position.set(-8, 0, -17.6); R.add(e.fridge);
    e.fridgeDense = K.fridge({ dense: true }); e.fridgeDense.position.set(-8, 0, -17.6); e.fridgeDense.visible = false; R.add(e.fridgeDense);
    e.table = place(R, K.table(), 6, 0, 2); place(R, K.chair(), 0, 0, 2, Math.PI / 2); place(R, K.chair(), 12, 0, 2, -Math.PI / 2); place(R, K.chair(), 6, 0, -3.5, 0);
    place(R, K.fruitBowl(), 6, 2.82, 2);
    e.window = K.window({ w: 7, h: 8, view: viewTex('day') }); e.window.position.set(10, 11, -19.8); R.add(e.window);
    e.window2 = K.window({ w: 6, h: 7, view: viewTex('day') }); e.window2.position.set(23.8, 11, 4); e.window2.rotation.y = -Math.PI / 2; R.add(e.window2);
    K.box(14, 4, 4, '#f4f1ea', 14, 2, -18, 'counter', R); K.box(14.4, 0.4, 4.4, '#8a5a36', 14, 4.2, -18, 'counter_top', R);
    for (const [x, y] of [[-18, 13], [-12, 15], [2, 14]]) { K.box(3.4, 2.6, 0.2, '#8a5a36', x, y, -19.8, 'frame', R); K.box(2.8, 2, 0.25, ['#5fa8d8', '#e09a5a', '#7fc86a'][Math.abs(x) % 3], x, y, -19.75, 'picture', R); }
    const lamp = K.cyl(1.6, 0.6, 1.2, mat('#fff1c4', { emissive: C('#ffe39a'), emissiveIntensity: 0.8 }), 6, 18, 2, 'lamp', R, 12); K.box(0.1, 3.4, 0.1, '#333', 6, 20.3, 2, 'lamp_cord', R);
    e.point = new THREE.PointLight('#ffe2b0', 1.2, 70, 1.2); e.point.position.set(6, 17, 2); R.add(e.point);
    e.door = new THREE.Group(); e.door.name = 'kitchen_door'; e.door.position.set(-16, 0, 23.9); R.add(e.door);
    return { setView(kind) { const t = viewTex(kind); for (const w of [e.window, e.window2]) w.getObjectByName('window_view').material.map = t; }, };
  });

  // ---------- NỘI THẤT: PHÒNG NGỦ ----------
  def('bedroom', 'bedNight', (g, e) => {
    e.room = new THREE.Group(); e.room.name = 'bedroom_room'; g.add(e.room); const R = e.room;
    const stars = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'); c.fillStyle = '#4b4f9e'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#e8e4ff';
      for (let i = 0; i < 14; i++) { const x = hash(i, 1) * 256, y = hash(i, 2) * 256, r = 5 + hash(i, 3) * 5; c.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); return t; })();
    const wall = new THREE.MeshStandardMaterial({ map: stars, roughness: 0.9 });
    R.add(plane(50, 50, mat('#7a5a44'), 0, 'bed_floor'));
    const rug = plane(14, 10, mat('#f2c14e'), 0.05, 'rug'); rug.position.set(6, 0.05, 6); R.add(rug);
    for (const [x, z, ry] of [[0, -18, 0], [-20, 0, Math.PI / 2], [20, 0, -Math.PI / 2], [0, 20, Math.PI]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(50, 22), wall); w.position.set(x, 11, z); w.rotation.y = ry; w.receiveShadow = true; R.add(w); }
    e.bed = place(R, K.bed(), -10, 0, -8);
    e.window = K.window({ w: 7, h: 8, curtains: '#c8c0ff', view: viewTex('night') }); e.window.position.set(19.8, 11, -6); e.window.rotation.y = -Math.PI / 2; R.add(e.window);
    place(R, K.books(5), 4, 0, -14); K.box(3, 3, 3, '#8a5a36', -2, 1.5, -15, 'nightstand', R); place(R, K.books(3), -2, 3, -15);
    K.box(4, 3, 0.2, '#8a5a36', 6, 13, -17.8, 'poster', R);
    e.point = new THREE.PointLight('#aab6ff', 0.8, 60, 1.2); e.point.position.set(14, 14, -6); R.add(e.point);
    return { setView(kind) { e.window.getObjectByName('window_view').material.map = viewTex(kind); } };
  });

  // ---------- áp dụng ----------
  let current = null;
  const wl = { sunDir: new THREE.Vector3(), sunColor: new THREE.Color(), skyTop: new THREE.Color(), skyBottom: new THREE.Color(), amb: new THREE.Color(), flash: 0 };
  function applyLight(L, flash = 0) {
    skyMat.uniforms.top.value.set(L.top); skyMat.uniforms.bottom.value.set(L.bottom); skyMat.uniforms.flash.value = flash;
    scene.background = C(L.bottom);
    if (L.fog) { if (!scene.fog) scene.fog = new THREE.Fog(L.fog, 100, 500); scene.fog.color.set(L.fog); scene.fog.near = L.fogR[0]; scene.fog.far = L.fogR[1]; } else scene.fog = null;
    stage.hemi.color.set(L.hemi[0]); stage.hemi.groundColor.set(L.hemi[1]); stage.hemi.intensity = L.hemi[2] + flash * 1.5;
    stage.sun.color.set(L.sun[0]); stage.sun.intensity = L.sun[1] + flash * 3;
    stage.renderer.toneMappingExposure = L.exposure;
    stage.setSunDir?.(L.dir);
  }
  function activate(name) {
    const e = envs[name]; if (!e) throw new Error(`env "${name}" không có. Có: ${Object.keys(envs).join(', ')}`);
    if (current !== e) { if (current) current.group.visible = false; e.group.visible = true; current = e; }
    return e;
  }
  let last = { env: '', light: 'day', flash: 0 };
  function use(name, t, ctx = {}) {
    const e = activate(name);
    ctx.flash = 0;
    e.update?.(t, ctx);
    const L = { ...LIGHTS[ctx.light || e.light], ...(ctx.lightOverride || {}) };
    applyLight(L, ctx.flash || 0);
    last = { env: name, light: ctx.light || e.light, flash: ctx.flash || 0 };   // cho engine/post.js (màu theo cảnh, chớp)
    if (e.group.userData.waters) {
      wl.sunDir.copy(stage.sun.position).sub(stage.sun.target.position).normalize();
      wl.sunColor.copy(stage.sun.color).multiplyScalar(stage.sun.intensity);
      wl.skyTop.copy(skyMat.uniforms.top.value); wl.skyBottom.copy(skyMat.uniforms.bottom.value);
      wl.amb.copy(stage.hemi.color).multiplyScalar(stage.hemi.intensity); wl.flash = ctx.flash || 0;
      for (const w of e.group.userData.waters) w.update(w.t || 0, stage.camera, wl, w.ampNow);
    }
    skyDome.visible = !(name === 'kitchen' || name === 'bedroom');
    skyDome.position.copy(stage.camera.position);
    return { env: e, light: L };
  }
  return { envs, use, activate, LIGHTS, viewTex, get current() { return current; }, get last() { return last; } };
}
