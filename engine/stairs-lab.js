// stairs-lab.js — trang duyệt riêng cầu thang gấp bản lề (engine/stairs.js) trên nhà biết đi.
// Gộp 1 file: node tools/stairs-lab-build.mjs → dist/cau-thang-gap.html
import * as THREE from 'three';
import { createHouse } from './house.js';

globalThis.__autoFx = { houseStairs: true, stairsFold: true };
const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('view').appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#bfe3ff'); scene.fog = new THREE.Fog('#bfe3ff', 160, 420);
scene.add(new THREE.HemisphereLight('#ffffff', '#6b8f4e', 1.4));
const sun = new THREE.DirectionalLight('#fff4dd', 2.4); sun.position.set(60, 90, 70); sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, far: 300 }); sun.shadow.mapSize.set(2048, 2048); scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: '#7fb05a', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const house = createHouse(THREE, { style: 'family' }); scene.add(house.root);
house.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

const camera = new THREE.PerspectiveCamera(40, W / H, 0.5, 900);
const VIEWS = {   // vị trí so với mép hiên (camera bám độ cao sàn khi nhà đứng lên)
  ben: { p: [80, 6, 10], l: [0, -3, 8] },            // nhìn ngang từ hông nhà: thấy rõ thang nằm ngang song song sàn
  goc: { p: [52, 22, 72], l: [0, -3, -4] },         // góc 3/4 trước
  gan: { p: [28, 2, 22], l: [0, -3, 4] },           // cận cầu thang
};
let view = 'ben';
const setView = (k) => { view = k; document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === k)); };
function placeCam(lift) {
  const v = VIEWS[view], y = 3 + 16 * ease(lift), k = camera.aspect < 0.8 ? 1.7 : 1;   // sàn hiên = BASE + (STAND-BASE)·smooth(lift)
  camera.position.set(v.p[0] * k, y + v.p[1] * k, 16 + v.p[2] * k); camera.lookAt(v.l[0], y + v.l[1], 16 + v.l[2]);
}

// vòng diễn: ngồi 1.2s → đứng dậy 2.4s → đứng 1.2s → ngồi xuống 2.4s
const CYC = [[1.2, 0, 0], [2.4, 0, 1], [1.2, 1, 1], [2.4, 1, 0]], TOT = CYC.reduce((a, c) => a + c[0], 0);
const ease = (v) => v * v * (3 - 2 * v);
function liftAt(t) {
  t %= TOT;
  for (const [d, a, b] of CYC) { if (t < d) return a + (b - a) * ease(t / d); t -= d; }
  return 0;
}
const slider = document.getElementById('lift'), out = document.getElementById('liftv');
let playing = true, t0 = performance.now(), tPause = 0;
document.getElementById('play').onclick = (e) => {
  playing = !playing; e.target.textContent = playing ? '⏸ Dừng' : '▶ Chạy';
  if (playing) t0 = performance.now() - tPause * 1000;
};
slider.oninput = () => { playing = false; document.getElementById('play').textContent = '▶ Chạy'; };
document.getElementById('fold').onchange = (e) => { globalThis.__autoFx.stairsFold = e.target.checked; };
document.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => setView(b.dataset.view); });
setView('ben');

function frame() {
  let lift;
  if (playing) { tPause = (performance.now() - t0) / 1000; lift = liftAt(tPause); slider.value = lift; }
  else lift = +slider.value;
  out.textContent = lift.toFixed(2);
  house.pose({ legsOut: 1, lift }); placeCam(lift);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
frame();
