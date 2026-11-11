// stage.js — Sân khấu three.js cho HyperFrames: renderer 1080×1920, camera, ánh sáng, mặt đất,
// và vòng render điều khiển hoàn toàn bằng sự kiện `hf-seek` (không giờ thực, không rAF).
//
// Dùng:
//   import * as THREE from 'three';
//   import { createStage } from '../../engine/stage.js';
//   const stage = createStage(THREE, { canvas: document.getElementById('stage') });
//   stage.scene.add(hero.root);
//   stage.onFrame((t) => {                       // hàm thuần của t (giây)
//     hero.animate('walk', t);
//     stage.setCamera([8, 6, 14], [0, 2.5, 0]);
//   });
//   stage.start();                               // nghe hf-seek + vẽ khung t=0
//
// Quy tắc (CLAUDE.md): thời gian chỉ lấy từ e.detail.time; mỗi lần seek → cập nhật pose/camera
// → renderer.render() đúng 1 lần. Việc bất đồng bộ → trả Promise từ onFrame (→ e.detail.waitUntil).

export const STAGE_DEFAULTS = {
  width: 1080,
  height: 1920,
  fov: 40,                 // độ, theo chiều dọc (khung dọc → fov nhỏ vẫn thấy cao)
  near: 0.1,
  far: 1000,
  sky: '#9fd3ff',          // màu nền / sương mù
  fog: [80, 260],          // [near, far]; null = tắt
  ground: '#7cc36a',       // null = không có mặt đất (khi town.js tự dựng đường/cỏ)
  groundSize: 400,
  shadows: true,
  shadowMapSize: 2048,
  shadowExtent: 40,        // nửa cạnh vùng đổ bóng quanh `shadowFocus`
  sunDir: [0.55, 1, 0.4],  // hướng tới mặt trời (chuẩn hoá trong code)
  sunIntensity: 2.4,
  hemiIntensity: 1.1,
  toneMapping: 'aces',     // aces | none
  exposure: 1.0,
};

export function createStage(THREE, opts = {}) {
  const o = { ...STAGE_DEFAULTS, ...opts };
  // Adapter three của HyperFrames đọc window.THREE.DefaultLoadingManager để chờ GLB/texture tải xong.
  window.THREE = THREE;

  const canvas = o.canvas || document.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true, // khung được chụp sau khi render → giữ buffer
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(1);
  renderer.setSize(o.width, o.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = o.toneMapping === 'aces' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = o.exposure;
  renderer.shadowMap.enabled = !!o.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;

  const scene = new THREE.Scene();
  scene.name = 'scene';
  scene.background = new THREE.Color(o.sky);
  if (o.fog) scene.fog = new THREE.Fog(o.sky, o.fog[0], o.fog[1]);

  const camera = new THREE.PerspectiveCamera(o.fov, o.width / o.height, o.near, o.far);
  camera.name = 'camera';
  camera.position.set(0, 6, 18);
  camera.lookAt(0, 2.5, 0);

  // ---- Ánh sáng: trời/đất + mặt trời đổ bóng (bóng bám theo điểm lấy nét) ----
  const hemi = new THREE.HemisphereLight('#ffffff', '#6b8f5a', o.hemiIntensity);
  hemi.name = 'hemi';
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#fff4e0', o.sunIntensity);
  sun.name = 'sun';
  sun.castShadow = !!o.shadows;
  sun.shadow.mapSize.set(o.shadowMapSize, o.shadowMapSize);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -o.shadowExtent;
  sc.right = sc.top = o.shadowExtent;
  sc.near = 1;
  sc.far = 200;
  scene.add(sun, sun.target);
  const sunDir = new THREE.Vector3(...o.sunDir).normalize();

  let ground = null;
  if (o.ground) {
    ground = new THREE.Mesh(
      new THREE.PlaneGeometry(o.groundSize, o.groundSize),
      new THREE.MeshStandardMaterial({ color: o.ground, roughness: 1 }),
    );
    ground.name = 'ground';
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  const _focus = new THREE.Vector3();
  const _target = new THREE.Vector3();

  // Đặt vùng đổ bóng quanh 1 điểm (thường là nhân vật đang được quay)
  function shadowFocus(p) {
    _focus.set(p[0] ?? p.x, p[1] ?? p.y, p[2] ?? p.z);
    sun.target.position.copy(_focus);
    sun.position.copy(_focus).addScaledVector(sunDir, 80);
    sun.target.updateMatrixWorld();
  }
  shadowFocus([0, 0, 0]);
  function setSunDir(d) { sunDir.set(d[0], d[1], d[2]).normalize(); shadowFocus([_focus.x, _focus.y, _focus.z]); }

  // Camera: vị trí, điểm nhìn, fov (tuỳ chọn), roll (radian, tuỳ chọn). Mặc định bóng theo điểm nhìn.
  function setCamera(pos, target, { fov, roll = 0, focusShadow = true } = {}) {
    camera.position.set(pos[0], pos[1], pos[2]);
    _target.set(target[0], target[1], target[2]);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(_target);
    if (fov && fov !== camera.fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (focusShadow) shadowFocus([_target.x, 0, _target.z]);
  }

  // Quỹ đạo quanh 1 điểm: góc yaw (radian, 0 = nhìn từ +Z), độ cao, khoảng cách
  function orbit(target, { yaw = 0, height = 4, dist = 14, lookUp = 0, fov, roll } = {}) {
    const pos = [target[0] + Math.sin(yaw) * dist, target[1] + height, target[2] + Math.cos(yaw) * dist];
    setCamera(pos, [target[0], target[1] + lookUp, target[2]], { fov, roll });
  }

  // ---- Vòng render theo hf-seek ----
  const frameFns = [];
  let lastT = 0;
  function onFrame(fn) { frameFns.push(fn); return api; }

  function renderAt(t) {
    lastT = Math.max(0, Number(t) || 0);
    const pending = [];
    for (const fn of frameFns) {
      const r = fn(lastT, api);
      if (r && typeof r.then === 'function') pending.push(r);
    }
    // api.draw (nếu có) = vẽ qua lớp hậu kỳ (engine/post.js); không có thì vẽ thẳng như cũ
    const draw = () => (api.draw ? api.draw(lastT) : renderer.render(scene, camera));
    if (!pending.length) { draw(); return null; }
    return Promise.all(pending).then(draw);
  }

  let started = false;
  function start() {
    if (started) return api;
    started = true;
    window.addEventListener('hf-seek', (e) => {
      const p = renderAt(e.detail?.time);
      if (p && e.detail?.waitUntil) e.detail.waitUntil(p);
    });
    renderAt(0);
    return api;
  }

  const api = {
    THREE, renderer, scene, camera, sun, hemi, ground, options: o,
    setCamera, orbit, shadowFocus, setSunDir, onFrame, renderAt, start,
    get time() { return lastT; },
    get target() { return _target; },   // điểm camera đang nhìn (setCamera) — dùng cho mờ hậu cảnh
  };
  return api;
}

// ---- Tiện ích thời gian thuần (dùng trong onFrame) ----
export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
// tiến độ trong đoạn [t0, t1] → 0..1 (đã làm mượt nếu ease=true)
export const span = (t, t0, t1, ease = true) => (ease ? smooth : clamp01)((t - t0) / (t1 - t0));

// PRNG có seed (mulberry32) — thay Math.random()
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
