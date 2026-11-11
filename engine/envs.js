// envs.js — Bối cảnh + preset ánh sáng. Mọi env dựng tại gốc toạ độ, chỉ 1 env hiển thị mỗi shot.
//   const envs = createEnvs(THREE, stage, K);   // K = propKit(THREE)
//   envs.use('townNight', t, ctx);              // bật env, đặt bầu trời/ánh sáng, cập nhật sóng/hạt theo t
// Nhà gia đình đứng ở gốc, mặt trước +Z. Phố chạy theo trục X ở z = +34.
import { fxSnow, fxRain, lightning, fxBolt } from './fx.js';
import { createWater } from './water.js';
import { createSea } from './sea.js';
import { applySeaWeather, preSeaWeather, resetSeaWeather } from './seaweather.js';
import { createIBL, IBL_HEMI_SCALE } from './ibl.js';
import { SCAN_IDS } from './scans.js';
import { createOceanLife, OCEAN_LIFE_ASSETS } from './whales.js';
import { townLife } from './townlife.js';
import { createSummit, createRange } from './peaks.js';
import { createCloudSea, createCloudPuffs } from './clouds.js';
import { pyramid, camel, jungleGiant, bigLeaves } from './env_desert.js';
import { snowRanges } from './snowpeaks.js';
import { createCliff, naturalRock, coralRock } from './cliff.js';
import { createCrabs, createBeachGrass } from './crabs.js';
import { createCamp } from './castaway.js';
import { smoothFlash } from './flash.js';
import TOWN_ENV from './envs/town.js';
import FOREST_ENV from './envs/forest.js';
import OPENSEA_ENV from './envs/openSea.js';
import HAWAII_ENV from './envs/hawaii.js';
import BRAZIL_ENV from './envs/brazil.js';
import SAHARA_ENV from './envs/sahara.js';
import ANTARCTICA_ENV from './envs/antarctica.js';
import OCEAN_ENV from './envs/ocean.js';
import MOUNTAIN_ENV from './envs/mountain.js';
import SNOWNIGHT_ENV from './envs/snowNight.js';
import ICESEA_ENV from './envs/iceSea.js';
import STORM_ENV from './envs/storm.js';
import SHIPSTORM_ENV from './envs/shipStorm.js';
import ISLAND_ENV from './envs/island.js';
import REEF_ENV from './envs/reef.js';
import KITCHEN_ENV from './envs/kitchen.js';
import BEDROOM_ENV from './envs/bedroom.js';

import { LIGHTS } from './lights.js';
export { LIGHTS };

const hash = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

// Asset Kenney dùng trong env (index.html gọi A.load(ENV_ASSETS) trước khi createEnvs).
export const ENV_ASSETS = [
  ...SCAN_IDS,   // mô hình quét Poly Haven (engine/scans.js) — bếp, phòng ngủ
  'nature-kit/plant_bushLargeTriangle', 'nature-kit/plant_bushTriangle', 'nature-kit/grass_leafsLarge', 'nature-kit/plant_flatTall', 'nature-kit/hanging_moss', 'nature-kit/mushroom_redGroup', 'nature-kit/rock_smallA', 'nature-kit/rock_smallFlatA', 'nature-kit/stone_tallA', 'nature-kit/stone_tallB',
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
  // ánh sáng môi trường (IBL) tính sẵn cho mọi preset — engine/ibl.js; bật/tắt ô "ibl"
  const ibl = createIBL(THREE, stage.renderer, LIGHTS);

  const plane = (w, d, mat, y = 0, name = 'plane', seg = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, seg, seg), mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; m.name = name; return m; };
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, ...o });
  const place = (g, obj, x, y, z, ry = 0, s = 1) => { obj.position.set(x, y, z); obj.rotation.y = ry; obj.scale.setScalar(s); g.add(obj); return obj; };
  const def = (name, light, build) => { const g = new THREE.Group(); g.name = `env_${name}`; g.visible = false; scene.add(g); const e = { name, light, group: g, update: null }; Object.assign(e, build(g, e) || {}); envs[name] = e; return e; };

  // biển: engine/sea.js createSea (đồng hồ, sự kiện, nhìn) + thêm vào group của env. Ánh sáng/bầu trời được nạp mỗi khung trong use().
  //   e.sea = makeSea(g, { preset, y, amp, size, rate, …ghi đè nhìn });  update(t) { e.sea(t); }   ← t TOÀN CỤC, rate tự nhân
  //   Mọi env có e.sea: vật nổi (shots.js float/boat), seaEvents theo shot và seaWeather chạy KHÔNG cần thêm code.
  const makeSea = (g, opts = {}) => {
    const sea = createSea(THREE, opts);
    g.add(sea.water.mesh); (g.userData.waters ||= []).push(sea.water); (g.userData.seas ||= []).push(sea);
    return sea;   // API: đầu engine/sea.js + engine/water.js
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
  // bộ công cụ chung cho các file engine/envs/<tên>.js
  const H = () => ({ THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs });
  def('town', 'night', (g, e) => TOWN_ENV(g, e, H()));   // engine/envs/town.js

  // ---------- RỪNG ----------
  def('forest', 'night', (g, e) => FOREST_ENV(g, e, H()));   // engine/envs/forest.js

  // ---------- HAWAII (bãi biển) ----------
  def('hawaii', 'beach', (g, e) => HAWAII_ENV(g, e, H()));   // engine/envs/hawaii.js

  // ---------- BRAZIL (rừng rậm) ----------
  def('brazil', 'day', (g, e) => BRAZIL_ENV(g, e, H()));   // engine/envs/brazil.js

  // ---------- SAHARA ----------
  def('sahara', 'desert', (g, e) => SAHARA_ENV(g, e, H()));   // engine/envs/sahara.js

  // ---------- NAM CỰC ----------
  def('antarctica', 'snow', (g, e) => ANTARCTICA_ENV(g, e, H()));   // engine/envs/antarctica.js

  // ---------- ĐẠI DƯƠNG (nhà ngập nước) ----------
  def('ocean', 'ocean', (g, e) => OCEAN_ENV(g, e, H()));   // engine/envs/ocean.js

  // ---------- ĐỈNH NÚI TRÊN MÂY ----------
  def('mountain', 'sky', (g, e) => MOUNTAIN_ENV(g, e, H()));   // engine/envs/mountain.js

  // ---------- NÚI TUYẾT ĐÊM (bắt đầu chương 10) ----------
  def('snowNight', 'snowNight', (g, e) => SNOWNIGHT_ENV(g, e, H()));   // engine/envs/snowNight.js

  // ---------- BIỂN BĂNG (đêm) ----------
  def('iceSea', 'snowNight', (g, e) => ICESEA_ENV(g, e, H()));   // engine/envs/iceSea.js

  // ---------- BÃO (biển đêm, mưa, chớp) ----------
  def('storm', 'storm', (g, e) => STORM_ENV(g, e, H()));   // engine/envs/storm.js

  // ---------- BOONG TÀU TRONG BÃO (hồi tưởng) ----------
  def('shipStorm', 'storm', (g, e) => SHIPSTORM_ENV(g, e, H()));   // engine/envs/shipStorm.js

  // ---------- ĐẢO HẢI ĐĂNG ----------
  def('island', 'beach', (g, e) => ISLAND_ENV(g, e, H()));   // engine/envs/island.js

  // ---------- BÃI ĐÁ NGẦM + XÁC TÀU ----------
  def('reef', 'beach', (g, e) => REEF_ENV(g, e, H()));   // engine/envs/reef.js

  // ---------- NỘI THẤT: BẾP ----------
  def('kitchen', 'interior', (g, e) => KITCHEN_ENV(g, e, H()));   // engine/envs/kitchen.js

  // ---------- NỘI THẤT: PHÒNG NGỦ ----------
  def('bedroom', 'bedNight', (g, e) => BEDROOM_ENV(g, e, H()));   // engine/envs/bedroom.js

  // ---------- BIỂN CHUNG: dựng hoàn toàn từ thời tiết (engine/seaweather.js) — shot: { env: 'sea', seaWeather: 'giong' } ----------
  def('sea', 'ocean', (g, e) => OPENSEA_ENV(g, e, H()));   // engine/envs/openSea.js

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
    // lõi biển: t khung cho đồng hồ biển; thời tiết của shot (ctx.seaWeather = W từ engine/seaweather.js) — trả về như dựng rồi áp
    for (const s of e.group.userData.seas || []) s.frame(t);
    if (e.group.userData.seas || e.rain) { resetSeaWeather(e); preSeaWeather(e, ctx.seaWeather); }
    e.update?.(t, ctx);
    if (ctx.seaWeather) applySeaWeather(e, ctx.seaWeather, t, ctx);
    const L = { ...LIGHTS[ctx.light || e.light], ...(ctx.lightOverride || {}) };
    applyLight(L, ctx.flash || 0);
    { const key = ctx.light || e.light, on = (globalThis.__autoFx?.ibl ?? true);
      scene.environment = on ? ibl.get(key) : null; scene.environmentIntensity = ibl.intensity(key);
      if (on) stage.hemi.intensity *= IBL_HEMI_SCALE; }
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
