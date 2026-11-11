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

export default function build(g, e, H) {
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
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
}
