// Bối cảnh 'island' (preset ánh sáng mặc định: beach). Sửa bối cảnh này CHỈ trong file này.
// Được engine/envs.js gọi: build(g, e, H) — g = Group của env, e = đối tượng env, H = bộ công cụ chung (xem envs.js).
import { fxSnow, fxRain, lightning, fxBolt } from '../fx.js';
import { createWater } from '../water.js';
import { createOceanLife, OCEAN_LIFE_ASSETS } from '../whales.js';
import { townLife } from '../townlife.js';
import { createSummit, createRange } from '../peaks.js';
import { createCloudSea, createCloudPuffs } from '../clouds.js';
import { pyramid, camel, jungleGiant, bigLeaves } from '../env_desert.js';
import { snowRanges } from '../snowpeaks.js';
import { createCliff, naturalRock, coralRock } from '../cliff.js';
import { createCrabs, createBeachGrass } from '../crabs.js';
import { createCamp } from '../castaway.js';
import { smoothFlash } from '../flash.js';
import { createCoconutPalm, gullIdle } from '../coconut.js';
import { createWind } from '../wind.js';
import { createGrass } from '../grass.js';
import { createSway } from '../sway.js';
import { createCloudShade } from '../cloudshade.js';
import { createRaft } from '../raft.js';
import { khaiBao } from '../materials.js';

const PERCH_ROOF = 0.9, PERCH_RAIL = 0.715;
export default function build(g, e, H) {
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  e.sea = makeSea(g, { preset: 'tropical', y: -0.6, amp: 0.4, size: 1600, shore: { circle: [0, 0, 70.6, 5] } });
  const isl = new THREE.Mesh(new THREE.CylinderGeometry(70, 82, 6, 28), mat('#f2d89a')); isl.position.y = -3; isl.receiveShadow = true; isl.name = 'island_sand'; g.add(isl);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(30, 34, 1.2, 20), mat('#6cbf58')); grass.position.set(-30, 0.1, -30); grass.receiveShadow = true; g.add(grass);
  // cỏ instanced + gió chung (engine/grass.js, engine/wind.js) trên mặt bãi cỏ (đỉnh trụ y = 0.7); ô bật/tắt 'grass' trong trình phát
  e.wind = createWind(THREE, { dir: [1, 0.3], speed: 4, gust: 0.75, seed: 5, gustSize: 18 });
  e.meadow = createGrass(THREE, { wind: e.wind, area: { center: [-30, -30], size: 59, round: true }, heightAt: () => 0.7, cell: 0.09, height: 0.34,
    colors: { base: '#4f9a3e', tip: '#a6dc6e' }, seed: 5, follow: true, flowers: { density: 0.008 } });   // hoa trong cỏ — ô 'flowers'
  g.add(e.meadow.group);
  // đèn của shot được đặt SAU env.update → lấy ánh sáng ngay lúc vẽ (không dùng đèn của khung trước)
  const _sun = () => (scene.children.find((o) => o.isDirectionalLight && o.name === 'sun')), _hemi = () => scene.children.find((o) => o.isHemisphereLight);
  // bóng mây trôi theo cùng gió (engine/cloudshade.js + cloudOpen trong wind.js): phủ mặt cát + bãi cỏ; cỏ tự đọc; ô bật/tắt 'cloudShade'
  const CLOUD = [0.5, 45, 2.6, 0.45];
  e.cloudShade = createCloudShade(THREE, e.wind, { far: 240 });
  e.cloudShade.add(new THREE.CircleGeometry(70, 56), { y: 0.0, name: 'cloud_shade_sand' });
  e.cloudShade.add(new THREE.CircleGeometry(30, 40), { x: -30, y: 0.7, z: -30, name: 'cloud_shade_meadow' });
  g.add(e.cloudShade.group);
  const lightNow = () => {
    const sun = _sun(); e.cloudShade.lightFrom(sun);
    const on = globalThis.__autoFx?.cloudShade !== false;
    e.wind.uniforms.uCloud.value.x = on ? CLOUD[0] * e.cloudShade.uniforms.uSunK.value : 0;   // ban đêm / tắt → không bóng (cả cỏ)
    e.meadow.lightFrom(sun, _hemi());
  };
  e.wind.set({ cloud: CLOUD });
  e.cloudShade.onRender(lightNow);
  e.meadow.rings.forEach((r) => { r.mesh.onBeforeRender = lightNow; });
  // cỏ rạp quanh chân: khớp LeftFoot/RightFoot của diễn viên R15 đang hiện (cast đặt trước env.update) → tối đa 6 vật đẩy
  let feet = null; const _fp = new THREE.Vector3();
  const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  const meadowFeet = () => {
    if (!feet?.length) { feet = []; scene.traverse((o) => { if (o.name === 'LeftFoot' || o.name === 'RightFoot') feet.push(o); }); }
    const out = [];
    for (const f of feet) { if (out.length >= 6 || !shown(f)) continue; f.getWorldPosition(_fp); if (Math.hypot(_fp.x + 30, _fp.z + 30) < 31) out.push([_fp.x, _fp.y, _fp.z, 0.55]); }
    return out;
  };
  // mỏm đá + hải đăng
  // mỏm đá tự nhiên (engine/cliff.js: lưới noise phân lớp, đỉnh phẳng phủ cỏ) thay cụm đá Kenney + bệ trụ xám
  e.cliff = new THREE.Group(); e.cliff.name = 'cliff'; e.cliff.position.set(60, 0, -50); g.add(e.cliff);
  e.cliff.add(createCliff(THREE, { seed: 7, top: 4.6, topR: 12 }));
  const pfl = pf('old-lighthouse-48ca6c', 0.8, (h) => (h.s > 0.35 && (h.h < 0.06 || h.h > 0.94) ? '#2f8f6b' : (h.l > 0.75 && h.s > 0.2 ? '#f4f4ef' : null)));
  if (pfl) { pfl.userData.vai = 'vat-chinh'; khaiBao(pfl, [[/./, 'metalpaint']]); }   // GLB hải đăng: vật chính + khai báo loại đang hiển thị (nhánh K.lighthouse() tự khai báo trong props.js)
  e.lighthouse = pfl || K.lighthouse(); e.lighthouse.position.y = 4.5; e.cliff.add(e.lighthouse);
  e.seat = new THREE.Vector3(44, 2.4, -28);   // chỗ cha ngồi (tảng đá dưới chân hải đăng)
  place(g, naturalRock(THREE, { seed: 77, r: 2.8, h: 0.9, top: 1.9, strata: 0.8 }), 44, 0, -28.6, 0.4);
  // chỗ ở ba năm của cha: ván khắc vạch đếm ngày + đống bưu thiếp đã viết (engine/castaway.js)
  e.camp = createCamp(THREE, { seed: 3, faceDir: -0.9, board: [42.6, 0, -35.2], pile: [47.2, 0, -24.4] }); g.add(e.camp);
  // cua khối chạy ngang trên cát + hàng cỏ / cây bụi bãi biển (engine/crabs.js)
  e.crabs = createCrabs(THREE, [
    { a: [-8, 63.5], b: [-2.5, 65], speed: 3.5, phase: 0 }, { a: [5, 61], b: [9.5, 58.8], speed: 3, phase: 1.3, s: 0.85 },
    { a: [48.5, -20.5], b: [51, -16.8], speed: 3.2, phase: 0.6 }, { a: [37.5, -31.5], b: [40.5, -33.8], speed: 2.8, phase: 2.1, s: 0.8 },
    { a: [16, -19], b: [19.5, -21.5], speed: 4, phase: 0.9 }, { a: [30, -4], b: [33.5, -6.5], speed: 3.4, phase: 1.7, s: 0.9 },
    { a: [22, -31], b: [25.5, -28.5], speed: 3, phase: 0.3 }, { a: [-34, 57.5], b: [-30, 59.5], speed: 3.6, phase: 2.6 },
    { a: [36, 8], b: [40, 6], speed: 3.2, phase: 1.1, s: 0.85 }, { a: [12, 40], b: [16, 42], speed: 3.8, phase: 0.2 },
  ]);
  g.add(e.crabs.group);
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], k = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * k, z - a[1] - dz * k); };
  e.grass = createBeachGrass(THREE, { seed: 9, arcs: [52, 57, 62].map((r) => ({ c: [0, 0], r, a0: 0, a1: Math.PI * 2, n: Math.round(r * 2.6), jitter: 1.6 })),
    skip: (x, z) => Math.hypot(x + 10, z) < 40 || segD(x, z, [8, -9], [44, -28]) < 8 || Math.hypot(x - 44, z + 28) < 9 || Math.hypot(x - 60, z + 50) < 25 || Math.hypot(x + 30, z + 30) < 34 || Math.hypot(x + 40, z - 62) < 6 || Math.hypot(x, z) > 66 });
  g.add(e.grass.group);
  // cây dừa khối: hàng dọc bãi (s102 nhìn dọc bờ tây) + vòng quanh đảo, tránh hải đăng / trại / khu nhà
  const palmOK = (x, z) => Math.hypot(x + 10, z) > 30 && Math.hypot(x - 44, z + 28) > 14 && Math.hypot(x - 60, z + 50) > 26 && Math.hypot(x, z) < 64 && Math.hypot(x - 36, z + 8) > 26 && Math.hypot(x + 40, z - 40) > 24 && segD(x, z, [8, -9], [44, -28]) > 9;
  let pn = 0; const palm = (x, z, hh) => { if (!palmOK(x, z)) return; const k = pn++; place(g, createCoconutPalm(THREE, { h: hh, lean: 0.14 + hash(k, 8) * 0.18, seed: k + 3 }), x, 0, z, 0); };
  for (let i = 0; i < 8; i++) { palm(-48 + hash(i, 31) * 3, 4 - i * 8.5 + hash(i, 32) * 2, 15 + hash(i, 33) * 4); palm(-31 + hash(i, 34) * 3, 0 - i * 8.5 + hash(i, 35) * 2, 14 + hash(i, 36) * 4); }
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + hash(i, 37) * 0.15, r = 55 + hash(i, 38) * 4; palm(Math.cos(a) * r, Math.sin(a) * r, 14 + hash(i, 39) * 5); }
  // cây dừa đung đưa theo CÙNG gió với cỏ (engine/sway.js: xoay group trên CPU, không thêm shader); ô bật/tắt 'sway'
  e.sway = createSway(THREE, e.wind, { seed: 5 });
  g.children.forEach((o) => { if (o.name === 'coconut_palm') e.sway.addPalm(o); });
  for (let i = 0; i < 12; i++) { if (i === 3) continue;   // bỏ tảng đá trước máy quay s103 (góp ý #11)
    const a = i / 12 * Math.PI * 2; place(g, naturalRock(THREE, { seed: i + 80, r: 2 + hash(i, 10) * 2, h: 0.6, strata: 0.7 }), Math.cos(a) * 76, -0.8, Math.sin(a) * 76, hash(i, 11) * 6); }
  place(g, K.cloud(2.4), -100, 110, -320); place(g, K.cloud(2), 120, 130, -380);
  // chi tiết bãi biển Polyfork: gỗ trôi, cỏ biển, vỏ sò, bụi, thuyền chèo, mòng biển
  for (let i = 0; i < 40; i++) { const a = hash(i, 21) * Math.PI * 2, r = 20 + hash(i, 22) * 52, x = Math.cos(a) * r - 10, z = Math.sin(a) * r - 20;
    if (Math.hypot(x + 10, z) < 30 || Math.hypot(x - 42, z + 26) < 9) continue;
    const o = pf(['marram-grass-tuft-8c7a99', 'marram-grass-tuft-8c7a99', 'shell-scatter-6d36b7', 'tamarisk-bush-ba4337', 'driftwood-log-89a68f'][i % 5], 1 + hash(i, 23) * 0.5); if (o) place(g, o, x, 0, z, hash(i, 24) * 6); }
  const dinghy = pf('rowing-dinghy-022673', 1.1); if (dinghy) place(g, dinghy, -40, 0, 62, 0.8);
  e.raft = createRaft(THREE, e.sea, { x: -37, z: 70, y: -0.6, yaw: 0.5, length: 13, beam: 7 }); g.add(e.raft.root); e.dinghy = dinghy;   // bè gỗ nổi thay thuyền chèo (khoá 'raft')
  // mòng biển ĐỨNG yên (model Polyfork dáng đứng, không có cánh vỗ) — đậu trên lan can / mái hải đăng, đá, cát; chỉ quay đầu + nhún nhẹ
  g.updateMatrixWorld(true);
  const lb = new THREE.Box3().setFromObject(e.lighthouse), lc = lb.getCenter(new THREE.Vector3()), lw = (lb.max.x - lb.min.x) / 2, lh = lb.max.y - lb.min.y;
  const perches = [
    // góp ý 2026-11-11 #12 (s104): 2 con đậu đúng chỗ khoanh đỏ — mép mái đèn bên trái + gờ chân tháp bên phải (toạ độ dò bằng raycast)
    { x: 57.5, y: 32.15, z: -51.4, ry: -0.35 },                                                 // mép mái đèn
    { x: 62.3, y: 13.0, z: -48.45, ry: -0.6 },                                                  // gờ chân tháp
    { x: 44.6, y: 1.0, z: -28.4, ry: 1.2 },                                                     // tảng đá chỗ cha ngồi
    { x: 27, y: 0.05, z: -12, ry: -0.8 },                                                       // cát
  ];
  e.gullBase = perches;
  e.gulls = perches.map((p, i) => { const o = pf('herring-gull-55c3da', 1.3); return o ? place(g, o, p.x, p.y, p.z, p.ry) : null; });
  return { update(t) { e.wind.update(t); e.cloudShade.group.visible = globalThis.__autoFx?.cloudShade !== false; if (globalThis.__autoFx?.sway !== false) e.sway.update(t); else e.sway.rest(); e.meadow.group.visible = globalThis.__autoFx?.grass !== false; e.meadow.set({ flowers: globalThis.__autoFx?.flowers !== false }); if (e.meadow.group.visible) { e.meadow.setPushers(meadowFeet()); e.meadow.update(t, stage.camera); } e.sea(t); { const rOn = e.raft.update(t); if (e.dinghy) e.dinghy.visible = !rOn; } e.crabs.update(t); e.grass.update(t); e.gulls.forEach((gl, i) => { if (gl) gullIdle(gl, e.gullBase[i], i, t); }); } };
}
