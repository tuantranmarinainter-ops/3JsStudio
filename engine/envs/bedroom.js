// Bối cảnh 'bedroom' (preset ánh sáng mặc định: bedNight). Sửa bối cảnh này CHỈ trong file này.
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

import { furnish } from '../furnish.js';
import { createPuffy, createFold } from '../cloth.js';
import { createWindowOutside } from '../realwindow.js';

// BÀY ĐỒ bằng dữ liệu (engine/furnish.js). 'nightstand', 'books5', 'poster', 'bed' là vật dựng tay (refs) mà món mới thế chỗ / đặt lên.
export const BEDROOM_FURNISH = [
  { id: 'scan:side_table_01', fit: 'nightstand' },
  { id: 'scan:book_encyclopedia_set_01', fit: 'books5', keepRatio: true },
  { id: 'scan:alarm_clock_01', at: [-0.9, 3, -14.6], h: 0.9, rot: 0.4 },
  { id: 'scan:potted_plant_04', at: [16, 0, -15], h: 3.2 },
  // đồ CC0 mới (KayKit Furniture Bits): đèn đứng áp tường giữa giường và tủ đầu giường, khung tranh lớn áp tường thế tấm bìa nâu
  { id: 'kaykit:lamp_standing', wall: 'north', at: [5], h: 6.5 },
  { id: 'kaykit:pictureframe_large_B', name: 'frame', wall: 'north', at: [6], y: 11.5, w: 4, replace: 'poster' },
];

export default function build(g, e, H) {
  const { ganTang, THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  e.room = new THREE.Group(); e.room.name = 'bedroom_room'; g.add(e.room); const R = e.room;
  const stars = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'); c.fillStyle = '#4b4f9e'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#e8e4ff';
    for (let i = 0; i < 14; i++) { const x = hash(i, 1) * 256, y = hash(i, 2) * 256, r = 5 + hash(i, 3) * 5; c.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); return t; })();
  const wall = new THREE.MeshStandardMaterial({ map: stars, roughness: 0.9 });
  R.add(plane(50, 50, mat('#7a5a44'), 0, 'bed_floor'));
  const rug = plane(14, 10, mat('#f2c14e'), 0.05, 'rug'); rug.position.set(6, 0.05, 6);
  R.add(ganTang(rug, 'front'));
  let eastWall = null;
  for (const [x, z, ry] of [[0, -18, 0], [-20, 0, Math.PI / 2], [20, 0, -Math.PI / 2], [0, 20, Math.PI]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(50, 22), wall); w.position.set(x, 11, z); w.rotation.y = ry; w.receiveShadow = true; R.add(w);
    if (x === 20) eastWall = w;
    if (z === -18) ganTang(w, 'back');
  }
  // cửa sổ THẬT (góp ý #14): tường đông có lỗ khoét đúng cửa sổ + cảnh 3D ngoài (engine/realwindow.js) nằm sau tường. Tắt: __autoFx.realWindow=false → ảnh phẳng cũ
  const holeWall = (() => { const sh = new THREE.Shape(); sh.moveTo(-25, -11); sh.lineTo(25, -11); sh.lineTo(25, 11); sh.lineTo(-25, 11); sh.closePath();
    const hp = new THREE.Path(); const cx = -6, hw = 3.45, hh = 3.95; hp.moveTo(cx - hw, -hh); hp.lineTo(cx - hw, hh); hp.lineTo(cx + hw, hh); hp.lineTo(cx + hw, -hh); hp.closePath(); sh.holes.push(hp);
    const geo = new THREE.ShapeGeometry(sh); const uv = geo.attributes.uv, pos = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 50 + 0.5, pos.getY(i) / 22 + 0.5);
    const m = new THREE.Mesh(geo, wall); m.position.copy(eastWall.position); m.rotation.copy(eastWall.rotation); m.receiveShadow = true; m.name = 'wall_east_window'; R.add(m); return m; })();
  const outside = createWindowOutside(THREE, { hash, nbHouse }); R.add(ganTang(outside.group, 'back'));
  const glassTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); c.clearRect(0, 0, 128, 128);
    const g = c.createLinearGradient(0, 0, 128, 128); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, 'rgba(210,225,255,0.5)'); g.addColorStop(0.38, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(210,225,255,0.3)'); g.addColorStop(0.66, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 7.6), new THREE.MeshBasicMaterial({ map: glassTex, color: '#9fb4ff', transparent: true, opacity: 0.22, depthWrite: false })); glass.name = 'window_glass'; glass.userData.matKind = 'none'; glass.userData.grungeKind = 'none';
  e.bed = ganTang(place(R, K.bed(), -10, 0, -8), 'mid');
  // gối + nếp gấp ga bằng vải liền mềm (engine/cloth.js) thay hộp 'pillow' và cuộn trụ 'blanket_cuff' (góp ý 2026-11-12 #6 #13)
  for (const nm of ['pillow', 'blanket_cuff']) { const o = e.bed.getObjectByName(nm); if (o) o.parent.remove(o); }
  for (const [px, ry, sd] of [[-1.55, 0.05, 1], [1.5, -0.04, 2]]) { const pl = createPuffy(THREE, { a: 1.4, b: 0.62, c: 1.15, ex: 0.6, dent: 0.2, pinch: 0.5, seed: sd, name: 'pillow_soft' }); pl.position.set(px, 3.05, -4.0); pl.rotation.y = ry; e.bed.add(pl); }
  e.bed.add(createFold(THREE, { w: 6.4, top: 4.7, z0: -2.1 }));
  e.window = K.window({ w: 7, h: 8, curtains: '#c8c0ff', view: viewTex('night') }); e.window.position.set(19.8, 11, -6);
  e.window.rotation.y = -Math.PI / 2;
  R.add(ganTang(e.window, 'back'));
  glass.position.set(19.74, 11, -6); glass.rotation.y = -Math.PI / 2; R.add(glass);
  const books5 = place(R, K.books(5), 4, 0, -14); const nstand = K.box(3, 3, 3, '#8a5a36', -2, 1.5, -15, 'nightstand', R); ganTang(place(R, K.books(3), -2, 3, -15), 'front');
  const poster = K.box(4, 3, 0.2, '#8a5a36', 6, 13, -17.8, 'poster', R);
  e.furn = furnish(THREE, R, BEDROOM_FURNISH, { assets: A, walls: { north: -18, south: 20, west: -20, east: 20 }, refs: { bed: e.bed, nightstand: nstand, books5, poster } });
  e.pointSpec = { color: '#aab6ff', intensity: 0.8, distance: 60, decay: 1.2, pos: [14, 14, -6] };   // đèn điểm dùng chung (engine/envs.js 'interior_point'): không tạo PointLight riêng → số đèn mọi env như nhau, không dịch lại shader
  return { suSong: [], update(t) { const rw = globalThis.__autoFx?.realWindow !== false; eastWall.visible = !rw; holeWall.visible = rw; outside.group.visible = rw; glass.visible = rw; e.window.getObjectByName('window_view').visible = !rw; e.furn.update(globalThis.__autoFx?.scans ?? true); e.bed.userData.update?.(t); }, setView(kind) { e.window.getObjectByName('window_view').material.map = viewTex(kind); } };
}
