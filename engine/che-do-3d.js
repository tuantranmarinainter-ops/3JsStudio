// che-do-3d.js — CHẾ ĐỘ 3D của trình phát (giai đoạn 1: XEM). Kế hoạch: docs/handoff/studio-che-do-3d.md
// Cùng scene tại cùng t, nhìn qua CAMERA TỰ DO trong khung rộng; vẽ chóp + đường đi camera của shot, nhãn nhân vật/đạo cụ/địa điểm.
// Chỉ xem: không sửa cảnh, không ghi file. Khi CHƯA bật thì module không tạo gì (0 object, 0 shader) → chế độ Phim y nguyên.
//
//   installChe3D({ THREE, stage, tl?, actors?, props?, places?, q? })  → window.__che3d = { bat(container?), tat(), on, goc(ten), … }
//   DÙNG CHUNG: engine/stage.js tự gọi khi stage.start() → tập nào cũng có (không cần sửa index.html của tập). Thiếu nguồn thì tự lấy
//   window.__shots / __places / __props / __actors; nhân vật không khai thì dò trong scene (nhóm có tên chứa bộ phận "Head").
//   Gọi lại với cùng stage = chỉ cập nhật nguồn (trang tập có thể đưa actors/props/places chính xác hơn).
//   Trang dev: ?che3d=1 hiện nút "3D" nổi. Trình phát (tools/export-ui.js) tự gắn nút Phim | 3D vào khung hình.
//
// Điều khiển (giống Unreal, chế độ bay): GIỮ CHUỘT PHẢI = nhìn quanh; W A S D = tới/trái/lùi/phải, Q xuống, E lên,
//   Shift = nhanh ×3, lăn chuột khi giữ chuột phải = đổi tốc độ. Chuột trái kéo = xoay quanh điểm nhìn, chuột giữa = kéo ngang,
//   lăn = zoom theo con trỏ (OrbitControls của three.js). Điện thoại: 1 ngón xoay, 2 ngón chụm/kéo.
// Vòng rAF CHỈ chạy khi đang giữ phím di chuyển — chỉ vẽ lại camera tự do, không chạy lại onFrame, không đụng thời gian phim.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ganSua } from './che-do-3d-sua.js';
import { SKIES } from './skies.js';
import { VONG_BAO, NEN, vienState } from './vong-bao.js';

const CSS = `
.c3d-wrap { position: absolute; inset: 0; z-index: 3; background: #0b0d12; overflow: hidden; touch-action: none; }
.c3d-wrap.c3d-fixed { position: fixed; z-index: 2147483000; }
.c3d-wrap.c3d-ss { position: relative; inset: auto; flex: 1 1 0; align-self: stretch; min-width: 0; min-height: 0; border-radius: 8px; margin-left: 14px; }
.c3d-wrap.c3d-ss.c3d-col { margin: 14px 0 0; }
.c3d-wrap.c3d-ss .c3d-bar { top: 8px; }
.c3d-wrap canvas { position: absolute; inset: 0; width: 100% !important; height: 100% !important; display: block; outline: none; }
.c3d-lab { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.c3d-lab div { position: absolute; transform: translate(-50%, -100%); white-space: nowrap; font: 600 12px/1.2 "Be Vietnam Pro", system-ui, sans-serif;
  padding: 2px 6px; border-radius: 9px; color: #fff; background: rgba(20,24,32,.78); border: 1px solid var(--c, #888); }
.c3d-lab div.nv { --c: #4da3ff; } .c3d-lab div.dc { --c: #f2a154; } .c3d-lab div.dd { --c: #b98cff; color: #e6dbff; }
.c3d-bar { position: absolute; left: 8px; top: 46px; right: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; z-index: 2;
  font: 600 12px/1.3 "Be Vietnam Pro", system-ui, sans-serif; color: #e8ecf2; pointer-events: none; }
.c3d-bar > * { pointer-events: auto; }
.c3d-bar button { background: rgba(29,36,48,.92); color: #e8ecf2; border: 1px solid #2a3342; border-radius: 6px; padding: 5px 9px; cursor: pointer; font: inherit; }
.c3d-bar button:hover { border-color: #4da3ff; } .c3d-bar button.on { border-color: #4da3ff; color: #4da3ff; }
.c3d-bar select { background: rgba(29,36,48,.92); color: #e8ecf2; border: 1px solid #2a3342; border-radius: 6px; padding: 4px 6px; font: inherit; max-width: 220px; }
.c3d-ghi { position: absolute; left: 8px; right: 8px; bottom: 40px; z-index: 5; background: rgba(14,17,22,.94); border: 1px solid #4da3ff; border-radius: 8px; padding: 8px; color: #e8ecf2; font: 12px/1.4 system-ui, sans-serif; }
.c3d-ghi textarea { width: 100%; height: 86px; box-sizing: border-box; background: #0b0d12; color: #cfe3ff; border: 1px solid #2a3342; border-radius: 6px; font: 12px/1.4 ui-monospace, Consolas, monospace; }
.c3d-bar select.on { border-color: #4da3ff; color: #4da3ff; }
.c3d-bar label { background: rgba(29,36,48,.92); border: 1px solid #2a3342; border-radius: 6px; padding: 4px 8px; display: inline-flex; gap: 4px; align-items: center; cursor: pointer; }
.c3d-help { position: absolute; left: 8px; bottom: 8px; right: 8px; font: 13px/1.45 system-ui, sans-serif; color: #8b96a8; background: rgba(14,17,22,.7); padding: 4px 8px; border-radius: 6px; pointer-events: none; }
.c3d-help b { color: #f5d76e; }
.c3d-btn { position: fixed; right: 16px; top: 16px; z-index: 2147483001; font: 700 28px system-ui, sans-serif; padding: 10px 22px; border-radius: 10px;
  background: #1f6fd1; color: #fff; border: 2px solid #4da3ff; cursor: pointer; }
`;

export function installChe3D({ THREE, stage, tl, actors, props, places, q } = {}) {
  if (window.__che3d && window.__che3d._stage === stage) { window.__che3d._setSrc({ tl, actors, props, places }); return window.__che3d; }
  if (!q) q = new URLSearchParams(location.search);
  const S = { tl, actors, props, places };
  let autoAct = null;
  const autoActors = () => {   // nhân vật chưa khai: từ mỗi bộ phận Head/head đi ngược lên tới nút cao nhất chỉ chứa ĐÚNG 1 đầu (R15, R6, Gà…); bỏ đám đông
    if (autoAct) return autoAct;
    autoAct = {};
    const nHead = new Map();
    const count = (o) => { let n = /^head$/i.test(o.name) ? 1 : 0; for (const c of o.children) n += count(c); nHead.set(o, n); return n; };
    count(stage.scene);
    stage.scene.traverse((h) => {
      if (!/^head$/i.test(h.name)) return;
      let r = h; while (r.parent && r.parent !== stage.scene && nHead.get(r.parent) === 1) r = r.parent;
      if (r.name && !/^(walker|villager|crowd)/i.test(r.name) && !autoAct[r.name]) autoAct[r.name] = { root: r };
    });
    return autoAct;
  };
  const getTl = () => S.tl || window.__shots;
  const getActors = () => S.actors || window.__actors || autoActors();
  const getProps = () => S.props || window.__props || {};
  const getPlaces = () => S.places || window.__places || {};
  const { renderer, scene } = stage;
  const canvas = renderer.domElement;
  const W0 = stage.options.width, H0 = stage.options.height, ASPECT = W0 / H0;
  let on = false, built = null, origDraw = null, curT = 0, wrap = null, home = null, canvasStyle = '', sizeObs = null;
  let shotCam = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 50, target: new THREE.Vector3(), id: null };
  const paths = new Map();   // id shot → mảng Vector3 vị trí camera (lấy mẫu)
  let sampling = false, giuGoc = true, bam = false, envChon = '', show = { nv: true, dc: false, dd: false, cam: true, luoi: false };   // lưới, đạo cụ, địa điểm mặc định TẮT (người dùng 16/11)
  const listeners = new Set();
  // SONG SONG (Phim trái | 3D phải): renderer giữ nguyên cỡ phim W0×H0 (không dịch shader lại, không đổi cỡ bộ đệm mỗi khung).
  // Mỗi khung: vẽ Phim như thường (có hậu kỳ) → chép sang filmCv (canvas 2D đè đúng lên canvas WebGL, dưới phụ đề DOM);
  // rồi vẽ camera tự do vào một ô góc dưới-trái của bộ đệm (≤ W0×H0) → chép sang ssCv trong khung 3D. Kéo/bay chỉ vẽ lại phần 3D.
  let ss = false, ssCv = null, ssCtx = null, filmCv = null, filmCtx = null, vw = 4, vh = 4, nhe = true;   // nhe: chế độ song song nhẹ (dùng lại bóng đổ, xem redraw; lúc phát vẽ 3D cách khung, xem drawSS)
  let ss3dT = -1, boKhung = false, boKhungHen = 0;

  // ---------- dựng lười: chỉ khi bật 3D lần đầu ----------
  function build() {
    const free = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 6000);
    free.name = 'che3d_camera';
    const helpers = new THREE.Scene(); helpers.name = 'che3d_phu';
    const grid = new THREE.GridHelper(400, 100, 0x55606f, 0x2a313b); grid.name = 'che3d_luoi'; grid.position.y = 0.02;
    grid.material.transparent = true; grid.material.opacity = 0.55; helpers.add(grid);
    // chóp camera shot: khung dây trong hệ toạ độ camera (nhìn -Z), dựng lại khi fov/khoảng cách đổi
    const frus = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffd23f, depthTest: false, transparent: true }));
    frus.name = 'che3d_chop'; frus.renderOrder = 10; helpers.add(frus);
    const path = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff7a3d, depthTest: false, transparent: true }));
    path.name = 'che3d_duong'; path.renderOrder = 9; helpers.add(path);
    const dots = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xff7a3d, size: 11, sizeAttenuation: false, depthTest: false, transparent: true }));
    dots.name = 'che3d_diem'; dots.renderOrder = 9; helpers.add(dots);
    const look = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xffd23f, dashSize: 0.6, gapSize: 0.4, depthTest: false, transparent: true }));
    look.name = 'che3d_huong'; look.renderOrder = 10; helpers.add(look);

    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const el = document.createElement('div'); el.className = 'c3d-wrap';
    const lab = document.createElement('div'); lab.className = 'c3d-lab';
    const bar = document.createElement('div'); bar.className = 'c3d-bar';
    bar.innerHTML = `<button data-g="tren" title="Nhìn từ trên xuống (bản đồ)">⬇ Trên xuống</button><button data-g="truoc" title="Nhìn từ phía trước chỗ shot diễn">◉ Trước</button>`
      + `<button data-g="shot" title="Bám camera shot: camera 3D đi, quay, đổi fov theo đúng camera của shot mỗi khung (khung vàng = phần phim thấy). Kéo chuột / WASD để thoát bám.">🎥 Bám camera shot</button>`
      + `<label title="Bật: tua/phát qua shot khác camera bay vẫn đứng yên (chỉ chóp camera, nhân vật, bối cảnh đổi theo t). Tắt: camera bay tới chỗ shot mới diễn."><input type="checkbox" data-o="giuGoc" checked> 🔒 Giữ góc</label>`
      + `<label title="Song song nhẹ: khung 3D dùng lại bóng đổ của khung Phim và lúc đang phát chỉ vẽ cách 1 khung (dừng/tua vẫn vẽ ngay). Tắt: vẽ đủ mọi khung."><input type="checkbox" data-o="nhe" checked> ⚡ Nhẹ</label>`
      + `<select data-o="env" title="Xem riêng một bối cảnh (env) để sửa / bổ sung — chỉ đổi khung 3D, phim không đổi. 'Theo shot' = bối cảnh của shot đang xem."><option value="">🏞 Bối cảnh: theo shot</option></select>`
      + `<select data-o="troi" title="Bầu trời của khung 3D (và khung Phim khi chạy song song). Dòng đầu = trời đang dùng theo tập."></select>`
      + `<select data-o="vb" title="Vòng cây / đồi / núi bao kín chân trời (engine/vong-bao.js)"></select>`
      + `<select data-o="nen" title="Nền đất / cỏ / cát / đá lát vân lặp"></select>`
      + `<button data-k="ghi" title="Hiện dòng cần dán vào episode.js (và env) cho lựa chọn Trời / Vòng bao / Nền đang chọn">📋 Ghi vào tập</button>`
      + `<label title="Lưới sàn y = 0 (bị nhà/đất che đúng chỗ)"><input type="checkbox" data-o="luoi"> Lưới</label><label><input type="checkbox" data-o="cam" checked> Camera</label><label><input type="checkbox" data-o="nv" checked> Nhân vật</label>`
      + `<label><input type="checkbox" data-o="dc"> Đạo cụ</label><label><input type="checkbox" data-o="dd"> Địa điểm</label>`;
    const help = document.createElement('div'); help.className = 'c3d-help';
    help.innerHTML = '<b>Giữ chuột phải</b> nhìn · <b>W A S D</b> đi · <b>Q/E</b> xuống/lên · <b>Shift</b> nhanh · lăn khi giữ chuột phải = tốc độ · chuột trái xoay · chuột giữa kéo';
    el.append(lab, bar, help);
    bar.addEventListener('pointerdown', (e) => e.stopPropagation());   // nút/ô tích không bị OrbitControls hay chế độ bay bắt chuột
    bar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b?.dataset.k === 'ghi') { ghiVaoTap(); b.blur(); return; } if (b?.dataset.g) { goc(b.dataset.g); b.blur(); } });
    bar.addEventListener('change', (e) => {
      const k = e.target.dataset.o; if (!k) return;
      if (k === 'env') { setEnv(e.target.value); e.target.blur(); return; }
      if (k === 'troi' || k === 'vb' || k === 'nen') { setVien(k, e.target.value); e.target.blur(); return; }
      if (k === 'giuGoc') giuGoc = e.target.checked; else if (k === 'nhe') nhe = e.target.checked; else show[k] = e.target.checked;
      e.target.blur();   // trả phím Space / ← → / [ ] cho trình phát
      redraw();
    });

    const controls = new OrbitControls(free, el);
    controls.zoomToCursor = true; controls.screenSpacePanning = true; controls.enableDamping = false;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: null };   // chuột phải = chế độ bay (bên dưới)
    controls.maxDistance = 3000;
    controls.addEventListener('change', () => redraw());
    controls.addEventListener('start', () => stopBam());   // kéo chuột trái/giữa, lăn → thoát bám camera shot

    // ---- chế độ bay kiểu Unreal ----
    const keys = new Set(); let rmb = false, speed = 20, raf = 0, last = 0, lookDist = 15;
    const eul = new THREE.Euler(0, 0, 0, 'YXZ'), fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3();
    const syncTarget = () => { free.getWorldDirection(fwd); controls.target.copy(free.position).addScaledVector(fwd, lookDist); };
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 2) return;
      stopBam(); rmb = true; lookDist = Math.max(2, free.position.distanceTo(controls.target)); controls.enabled = false;
      eul.setFromQuaternion(free.quaternion, 'YXZ'); el.setPointerCapture(e.pointerId); el.focus?.();
    });
    el.addEventListener('pointermove', (e) => {
      if (!rmb) return;
      eul.y -= e.movementX * 0.0032; eul.x = Math.max(-1.55, Math.min(1.55, eul.x - e.movementY * 0.0032)); eul.z = 0;
      free.quaternion.setFromEuler(eul); syncTarget(); redraw();
    });
    const rmbUp = (e) => { if (!rmb || (e.type === 'pointerup' && e.button !== 2)) return; rmb = false; syncTarget(); controls.enabled = true; controls.update(); };
    el.addEventListener('pointerup', rmbUp); el.addEventListener('pointercancel', rmbUp); el.addEventListener('lostpointercapture', rmbUp);
    el.addEventListener('wheel', (e) => { if (!rmb) return; e.preventDefault(); e.stopImmediatePropagation(); speed = Math.max(1, Math.min(400, speed * (e.deltaY < 0 ? 1.2 : 1 / 1.2))); help.dataset.v = speed; }, { capture: true, passive: false });
    const MOVE = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyQ: 1, KeyE: 1 };
    const typing = (e) => /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '') && e.target.type !== 'checkbox' && e.target.type !== 'range';
    const kd = (e) => {
      if (!on || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Shift') { keys.add('Shift'); return; }
      if (!MOVE[e.code]) return;
      if (!rmb && built?.sua?.chanBay?.()) return;   // đang chọn vật (✥ Sửa vật): WASD/QE chỉ bay khi GIỮ chuột phải; S = đổi cỡ (Blender)
      e.preventDefault(); e.stopPropagation(); keys.add(e.code); stopBam();
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    };
    const ku = (e) => { keys.delete(e.code); if (e.key === 'Shift') keys.delete('Shift'); };
    function step(now) {
      const dt = Math.min(0.25, (now - last) / 1000); last = now;   // máy chậm / góc nhìn rộng: vẫn đi đúng tốc độ
      let moving = false;
      for (const k of keys) if (MOVE[k]) moving = true;
      if (!moving || !on) { raf = 0; return; }
      free.getWorldDirection(fwd); right.crossVectors(fwd, free.up).normalize();
      mv.set(0, 0, 0);
      if (keys.has('KeyW')) mv.add(fwd); if (keys.has('KeyS')) mv.sub(fwd);
      if (keys.has('KeyD')) mv.add(right); if (keys.has('KeyA')) mv.sub(right);
      if (keys.has('KeyE')) mv.y += 1; if (keys.has('KeyQ')) mv.y -= 1;
      if (mv.lengthSq() > 0) {
        mv.normalize().multiplyScalar(speed * (keys.has('Shift') ? 3 : 1) * dt);
        free.position.add(mv); controls.target.add(mv); redraw();
      }
      raf = requestAnimationFrame(step);
    }
    addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
    addEventListener('blur', () => keys.clear());

    const B0 = { free, helpers, grid, frus, path, dots, look, el, lab, bar, controls, labels: new Map(), heights: new Map() };
    // góp ý trong 3D: sửa vật (dời/xoay/cỡ — chỉ thử) + ghim mô tả → đi kèm file góp ý (engine/che-do-3d-sua.js)
    try {
      B0.sua = ganSua({ THREE, stage, B: B0, redraw: () => redraw(), isOn: () => on,
        withView: (f) => { const ov = envOverride(); try { return f(); } finally { ov(); } },
        shot: () => ({ id: shotCam.id, t: +curT.toFixed(3) }), viewCanvas: () => (ss ? ssCv : canvas), getProps });
      B0.sua.onChange(() => { for (const f of listeners) f(on, ss); });
    } catch (e) { console.warn('[che-do-3d] sửa/ghim', e); }
    return B0;
  }

  // ---------- camera shot: đọc sau khi director đặt stage.camera ----------
  function captureShot(t) {
    const cam = stage.camera;
    shotCam.pos.copy(cam.position); shotCam.quat.copy(cam.quaternion); shotCam.fov = cam.fov;
    shotCam.target.copy(stage.target);
    const tl = getTl(), id = tl?.at(Math.min(t, tl.total - 1e-4)).shot.id;
    const changed = id !== shotCam.id; shotCam.id = id;
    return changed;
  }
  function updateFrustum() {
    const B = built, d = Math.max(2, Math.min(60, shotCam.pos.distanceTo(shotCam.target)));
    const hh = d * Math.tan(THREE.MathUtils.degToRad(shotCam.fov) / 2), hw = hh * ASPECT;
    const c = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [x, y, -d]);
    const v = [];
    for (const p of c) v.push(0, 0, 0, ...p);
    for (let i = 0; i < 4; i++) v.push(...c[i], ...c[(i + 1) % 4]);
    v.push(-hw * 0.4, hh * 1.08, -d, 0, hh * 1.4, -d, 0, hh * 1.4, -d, hw * 0.4, hh * 1.08, -d, hw * 0.4, hh * 1.08, -d, -hw * 0.4, hh * 1.08, -d);   // tam giác "phía trên"
    B.frus.geometry.dispose(); B.frus.geometry = new THREE.BufferGeometry(); B.frus.geometry.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    B.frus.position.copy(shotCam.pos); B.frus.quaternion.copy(shotCam.quat);
    B.look.geometry.dispose(); B.look.geometry = new THREE.BufferGeometry().setFromPoints([shotCam.pos, shotCam.target]); B.look.computeLineDistances();
    const pts = paths.get(shotCam.id) || [];
    B.path.geometry.dispose(); B.path.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    B.dots.geometry.dispose(); B.dots.geometry = new THREE.BufferGeometry().setFromPoints(pts.length ? [pts[0], pts[pts.length - 1]] : []);
    for (const o of [B.frus, B.look, B.path, B.dots]) o.visible = show.cam;
    B.grid.visible = show.luoi;
  }

  // đường đi camera của shot: renderAt các mốc trong shot với draw TẮT (mọi thứ là hàm của t), rồi trả về t hiện tại
  // Không tráo stage.draw (bật/tắt chen giữa sẽ khôi phục nhầm): draw3d tự bỏ qua khi đang lấy mẫu; t do người dùng rê tới
  // trong lúc đó được ghi vào curT. Tắt 3D giữa chừng → dừng vòng, không lưu đường đi dở.
  let sampleT = null;
  async function samplePath(id) {
    const tl = getTl();
    if (sampling || paths.has(id) || !tl || !on) return;
    const sh = tl.list.find((s) => s.id === id); if (!sh) return;
    sampling = true;
    const pts = [];
    try {
      const N = 16;
      for (let i = 0; i <= N && on; i++) {
        const t = Math.min(tl.total - 1e-4, sh.t0 + (sh.dur - 1e-3) * (i / N));
        sampleT = t;
        const p = stage.renderAt(t); if (p && p.then) await p;
        pts.push(stage.camera.position.clone());
      }
    } finally { sampling = false; sampleT = null; }
    if (pts.length === 17) paths.set(id, pts);
    const p = stage.renderAt(curT); if (p && p.then) await p;   // trả cảnh về đúng t (3D: vẽ lại kèm đường đi; đã tắt: khung Phim)
    if (on && !paths.has(shotCam.id)) setTimeout(() => samplePath(shotCam.id), 0);   // shot đã đổi trong lúc lấy mẫu
  }

  // ---------- nhãn DOM chiếu lên khung ----------
  const _v = new THREE.Vector3(), _box = new THREE.Box3();
  const visibleDeep = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  function labelItems() {
    const out = [], actors = getActors(), props = getProps(), places = getPlaces();
    if (show.nv) for (const [n, a] of Object.entries(actors)) { if (a?.root) out.push(['nv:' + n, n, 'nv', a.root]); }
    if (show.dc) for (const [n, p] of Object.entries(props)) out.push(['dc:' + n, n, 'dc', p]);
    if (show.dd) for (const [n, p] of Object.entries(places)) if (p?.pos) out.push(['dd:' + n, '📍 ' + n, 'dd', p.pos]);
    return out;
  }
  // nhãn chồng nhau thì bỏ bớt: ưu tiên nhân vật → đạo cụ → địa điểm, gần trước xa sau; ô chữ đè ô đã đặt thì ẩn
  const PRI = { nv: 0, dc: 1, dd: 2 };
  function updateLabels() {
    const B = built, rect = B.el.getBoundingClientRect(), W = rect.width, H = rect.height;
    const cand = [], camPos = B.free.position;
    for (const [key, text, cls, obj] of labelItems()) {
      if (Array.isArray(obj)) _v.set(obj[0], (obj[1] || 0) + 0.5, obj[2]);
      else {
        if (!visibleDeep(obj)) continue;
        if (!B.heights.has(key)) { _box.setFromObject(obj); B.heights.set(key, _box.isEmpty() ? 2 : Math.max(0.5, _box.max.y - obj.getWorldPosition(_v).y)); }
        obj.getWorldPosition(_v); _v.y += B.heights.get(key) + 0.4;
      }
      const dist = _v.distanceTo(camPos);
      if (dist > 250) continue;
      _v.project(B.free);
      if (_v.z < -1 || _v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) continue;
      cand.push({ key, text, cls, x: (_v.x + 1) / 2 * W, y: (1 - _v.y) / 2 * H, dist });
    }
    cand.sort((a, b) => PRI[a.cls] - PRI[b.cls] || a.dist - b.dist);
    const placed = [], seen = new Set();
    for (const c of cand) {
      const w = c.text.length * 7 + 14, h = 19;
      c.x = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, c.x)); c.y = Math.max(h + 2, Math.min(H - 2, c.y));   // không để chữ bị cắt ở mép
      const r = [c.x - w / 2, c.y - h, c.x + w / 2, c.y];
      if (placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) continue;
      placed.push(r);
      let d = B.labels.get(c.key);
      if (!d) { d = document.createElement('div'); d.className = c.cls; d.textContent = c.text; B.lab.appendChild(d); B.labels.set(c.key, d); }
      d.style.left = c.x.toFixed(1) + 'px'; d.style.top = c.y.toFixed(1) + 'px'; d.style.display = '';
      seen.add(c.key);
    }
    for (const [k, d] of B.labels) if (!seen.has(k)) d.style.display = 'none';
  }

  // ---------- vẽ ----------
  function resize() {
    if (!on) return;
    const r = built.el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return;
    const k = Math.min(window.devicePixelRatio || 1, 1.5);
    if (ss) {   // ô 3D nằm trong bộ đệm cỡ phim → thu lại cho vừa W0×H0, giữ tỉ lệ khung 3D
      let w = r.width * k, h = r.height * k; const s = Math.min(1, W0 / w, H0 / h);
      vw = Math.max(4, Math.floor(w * s)); vh = Math.max(4, Math.floor(h * s));
      if (ssCv.width !== vw || ssCv.height !== vh) { ssCv.width = vw; ssCv.height = vh; }
    } else renderer.setSize(Math.round(r.width * k), Math.round(r.height * k), false);
    built.free.aspect = r.width / r.height; built.free.updateProjectionMatrix();
    redraw();
  }
  function redraw() {
    if (!on || sampling) return;
    const B = built, fog = scene.fog, ac = renderer.autoClear, sau = renderer.shadowMap.autoUpdate;
    scene.fog = null;   // sương của phim chỉnh theo khoảng cách camera shot → tắt TẠM khi nhìn xa (trả lại ngay sau khi vẽ)
    // song song: khung Phim vừa vẽ cùng t đã tính bóng đổ → khung 3D dùng lại, không vẽ lại shadow map (ô "nhẹ" tắt được: __che3d.setNhe(false))
    if (ss && nhe && !envChon) renderer.shadowMap.autoUpdate = false;
    const rt = renderer.getRenderTarget();
    try {
      if (ss) { renderer.setRenderTarget(null); renderer.setViewport(0, 0, vw, vh); renderer.setScissor(0, 0, vw, vh); renderer.setScissorTest(true); }
      const ov = envOverride(), sk = skyTheoCamera(B.free);
      try { renderer.render(scene, B.free); } finally { ov(); sk(); }
      B.grid.visible = show.luoi;
      renderer.autoClear = false; renderer.render(B.helpers, B.free);   // KHÔNG xoá depth: lưới bị nhà/đất che đúng chỗ; chóp/đường đi depthTest:false nên vẫn nổi
      if (ss) ssCtx.drawImage(canvas, 0, H0 - vh, vw, vh, 0, 0, vw, vh);   // chép ngay trong cùng tác vụ (không cần preserveDrawingBuffer)
    } finally {
      renderer.autoClear = ac; scene.fog = fog; renderer.shadowMap.autoUpdate = sau;
      if (ss) { renderer.setScissorTest(false); renderer.setViewport(0, 0, W0, H0); renderer.setScissor(0, 0, W0, H0); renderer.setRenderTarget(rt); }
    }
    updateLabels(); B.sua?.capNhatGhim();
  }
  // TRỜI bám camera ĐANG VẼ: envs.js đặt hộp trời/vòm trời/trời bão theo camera PHIM (stage.camera); camera bay đi xa thì trời ở lại chỗ cũ → mất trời.
  // Mỗi lần vẽ bằng camera tự do: dời trời tới camera đó (và hướng thu nhỏ trời theo hướng nhìn của nó), vẽ xong trả lại như cũ.
  const _sf3 = new THREE.Vector3();
  function skyTheoCamera(cam) {
    const saved = [];
    cam.getWorldDirection(_sf3); const yaw = Math.atan2(_sf3.x, _sf3.z);
    for (const o of scene.children) {
      if (!o.visible || !(o.name === 'sky' || o.name === 'stormsky' || o.name?.startsWith('skybox_'))) continue;
      const u = o.material?.uniforms?.uCamYaw; saved.push([o, o.position.clone(), u, u?.value]);
      o.position.copy(cam.position); if (u) u.value = yaw;
    }
    return () => { for (const [o, p, u, v] of saved) { o.position.copy(p); if (u) u.value = v; } };
  }

  // ---------- Trời / Vòng bao / Nền: ghi đè lúc xem (globalThis.__vien.override, đọc trong envs.js use()) — Phim song song đổi theo ----------
  const VS = vienState(), VK = { troi: 'troi', vb: 'vongBao', nen: 'nen' };
  const VLIST = { troi: Object.entries(SKIES).map(([k, d]) => [k, `${k} — ${String(d.label || '').replace(/\s*\(.*$/, '').slice(0, 34)}`]), vb: Object.entries(VONG_BAO), nen: Object.entries(NEN) };
  const VNAME = { troi: '🌤 Trời', vb: '🌲 Vòng bao', nen: '🟩 Nền' };
  let vienSig = '';
  function syncVien(force) {
    const B = built; if (!B) return;
    const cur = { troi: VS.cur?.troi, vb: VS.cur?.vongBao, nen: VS.cur?.nen };
    const sig = JSON.stringify([cur, VS.override]); if (!force && sig === vienSig) return; vienSig = sig;
    for (const k of ['troi', 'vb', 'nen']) {
      const sel = B.bar.querySelector(`select[data-o=${k}]`); if (!sel) continue;
      const ov = VS.override[VK[k]], tapV = VS.cur?.tap?.[VK[k]], dang = ov === undefined ? cur[k] : tapV, ten = (x) => (x ? VONG_BAO[x] || NEN[x] || x : 'không'), theo = ov === undefined ? `${VNAME[k]}: ${ten(cur[k])} (theo tập)` : `${VNAME[k]}: theo tập = ${ten(tapV)}`;
      if (!sel.options.length) sel.innerHTML = `<option value=""></option><option value="tat">${VNAME[k]}: Tắt</option>` + VLIST[k].map(([v, l]) => `<option value="${v}">${VNAME[k]}: ${l}</option>`).join('');
      sel.options[0].textContent = theo;
      sel.value = ov === undefined ? '' : ov === null ? 'tat' : ov; sel.classList.toggle('on', ov !== undefined);
      sel.title = `${VNAME[k]} đang dùng: ${cur[k] || 'không có'}${ov !== undefined ? ' (ghi đè lúc xem — chưa ghi vào tập)' : ''}`;
    }
  }
  function setVien(k, v) {
    if (v === '') delete VS.override[VK[k]]; else VS.override[VK[k]] = v === 'tat' ? null : v;
    const again = () => { try { const p = stage.renderAt(curT); if (p?.then) p.then(() => syncVien()); else syncVien(); } catch (e) {} };
    again(); setTimeout(again, 700); setTimeout(again, 2200);   // ảnh trời mới tải xong thì vẽ lại
  }
  function ghiVaoTap() {
    const o = VS.override, L = [];
    const val = (v) => (v === null ? 'null' : `'${v}'`);
    if (o.vongBao !== undefined) L.push(`  vongBao: ${val(o.vongBao)},`);
    if (o.nen !== undefined) L.push(`  nen: ${val(o.nen)},`);
    const T = o.troi !== undefined ? `\n// Trời (khai trong engine/envs/<env>.js của bối cảnh cần đổi):\n//   e.skybox = ${val(o.troi)};  // ban ngày;  đêm: e.skyboxNight = …` : '';
    const text = (L.length ? `// dán vào EPISODE trong episodes/<tập>/episode.js:\n${L.join('\n')}` : '// (chưa chọn Vòng bao / Nền — chưa có gì để ghi)') + T;
    let box = built.el.querySelector('.c3d-ghi'); box?.remove();
    box = document.createElement('div'); box.className = 'c3d-ghi';
    box.innerHTML = '<b>Ghi vào tập</b> — chép đoạn dưới vào file (đã tự chép vào clipboard nếu trình duyệt cho phép) <button style="float:right" data-x>Đóng</button><textarea readonly></textarea>';
    const ta = box.querySelector('textarea'); ta.value = text; box.querySelector('[data-x]').onclick = () => box.remove();
    box.addEventListener('pointerdown', (e) => e.stopPropagation()); built.el.appendChild(box); ta.select();
    try { navigator.clipboard?.writeText(text); } catch (e) {}
    console.log('[che3d] ghi vào tập:\n' + text);
  }
  function drawSS(t) {   // song song: Phim (hậu kỳ như thường) → filmCv, rồi phần 3D
    if (!sampling) { built.sua?.apDung(); origDraw(t); filmCtx.drawImage(canvas, 0, 0); }
    // nhẹ: lúc ĐANG PHÁT (t tiến đều, bước nhỏ) khung 3D chỉ vẽ cách 1 khung; tua/dừng/nhảy thì vẽ ngay.
    // Bỏ khung nào thì hẹn vẽ bù sau 120 ms nếu không có khung mới (dừng phát → 3D đúng t cuối).
    clearTimeout(boKhungHen);
    const deu = t > ss3dT && t - ss3dT < 0.25;
    if (nhe && !sampling && deu && !boKhung) { boKhung = true; curT = t;   // vẫn ghi t (samplePath trả cảnh về curT)
      boKhungHen = setTimeout(() => { if (on && ss && !sampling) { boKhung = false; draw3d(curT = t); ss3dT = t; } }, 120); return; }
    boKhung = false; ss3dT = t;
    draw3d(t);
  }
  function draw3d(t) {
    if (sampling) { if (t !== sampleT) curT = t; return; }
    curT = t;
    built.sua?.apDung();
    const changed = captureShot(t);
    if (bam) applyBam();
    else if (changed && !giuGoc && built.ready) flyToShot();   // 🔒 Giữ góc (mặc định bật): camera bay chỉ đổi khi người dùng tự bấm/kéo
    built.ready = true;
    updateFrustum(); redraw(); syncVien();
    if (changed && !paths.has(shotCam.id)) setTimeout(() => samplePath(shotCam.id), 0);
  }

  // ---------- chọn bối cảnh: khung 3D vẽ env được chọn thay env của shot (chỉ lúc vẽ 3D, trả visible lại ngay → Phim không đổi) ----------
  const envGroups = () => scene.children.filter((o) => o.name?.startsWith('env_') && o.isGroup);
  function envOverride() {
    if (!envChon) return () => {};
    const gs = envGroups(), keep = gs.map((g) => g.visible);
    for (const g of gs) g.visible = g.name === 'env_' + envChon;
    return () => gs.forEach((g, i) => { g.visible = keep[i]; });
  }
  function envList() {
    const used = new Map(), tl = getTl();
    for (const it of tl?.list || []) { const n = (it.shot || it).env; if (n) used.set(n, (used.get(n) || 0) + 1); }
    const all = envGroups().map((g) => g.name.slice(4)).map((n) => ({ name: n, shots: used.get(n) || 0 }));
    // chỉ bối cảnh tập ĐANG MỞ dùng (người dùng 16/11: không hiện env của tập khác); chưa có dòng thời gian thì hiện hết
    const mine = all.filter((e) => e.shots > 0);
    return (mine.length ? mine : all).sort((a, b) => b.shots - a.shots || a.name.localeCompare(b.name));
  }
  function fillEnvSelect() {
    const sel = built?.bar.querySelector('select[data-o=env]'); if (!sel) return;
    const list = envList(), sig = list.map((e) => e.name + e.shots).join();
    if (sel.dataset.sig === sig) return; sel.dataset.sig = sig;
    sel.innerHTML = '<option value="">🏞 Bối cảnh: theo shot</option>' + list.map((e) =>
      `<option value="${e.name}">${e.name}${e.shots ? ` · ${e.shots} shot` : ' · (tập này không dùng)'}</option>`).join('');
    sel.value = envChon;
  }
  function setEnv(name) {
    envChon = name && envGroups().some((g) => g.name === 'env_' + name) ? name : '';
    const sel = built?.bar.querySelector('select[data-o=env]');
    if (sel) { sel.value = envChon; sel.classList.toggle('on', !!envChon); }
    if (!on) return;
    if (envChon) {   // đặt camera nhìn toàn cảnh env được chọn (khung chứa ≤ 300 stud quanh tâm: bỏ mặt biển/trời rất rộng)
      const g = scene.getObjectByName('env_' + envChon), box = new THREE.Box3().setFromObject(g);
      if (!box.isEmpty()) {
        const ctr = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), ext = Math.min(300, Math.max(20, size.x, size.z)) * 0.6;
        bam = false; for (const b of built.bar.querySelectorAll('button[data-g]')) b.classList.remove('on');
        if (built.free.fov !== 55) { built.free.fov = 55; built.free.updateProjectionMatrix(); }
        ctr.y = Math.min(Math.max(ctr.y, 0), 20);
        built.controls.target.copy(ctr); built.free.position.copy(ctr).add(_v.set(0, ext * 0.55, ext)); built.controls.update();
      }
    }
    redraw();
  }

  // ---------- bám camera shot: mỗi khung camera tự do = camera shot (vị trí, hướng, fov) ----------
  function applyBam() {
    const B = built; if (!B) return;
    B.free.position.copy(shotCam.pos); B.free.quaternion.copy(shotCam.quat);
    if (B.free.fov !== shotCam.fov) { B.free.fov = shotCam.fov; B.free.updateProjectionMatrix(); }
    B.controls.target.copy(shotCam.target);   // không gọi controls.update(): giữ đúng hướng (kể cả nghiêng) của camera shot
  }
  function setBam(v) {
    bam = !!v;
    if (built) for (const b of built.bar.querySelectorAll('button[data-g]')) b.classList.toggle('on', bam ? b.dataset.g === 'shot' : false);
    for (const f of listeners) f(on, ss);
  }
  function stopBam() {
    if (!bam) return;
    setBam(false);
    const B = built; B.controls.update();
  }

  // ---------- góc nhìn nhanh ----------
  function flyToShot() {
    const B = built, off = B.free.position.clone().sub(B.controls.target);
    B.controls.target.copy(shotCam.target); B.free.position.copy(shotCam.target).add(off); B.controls.update();
  }
  function bounds() {
    const box = new THREE.Box3(), actors = getActors(), places = getPlaces();
    for (const p of Object.values(places)) if (p?.pos) box.expandByPoint(_v.set(p.pos[0], p.pos[1] || 0, p.pos[2]));
    for (const a of Object.values(actors)) if (a?.root && visibleDeep(a.root)) box.expandByPoint(a.root.getWorldPosition(_v));
    box.expandByPoint(shotCam.target);
    return box;
  }
  function goc(g) {
    if (!on) return;
    const B = built, c = B.controls;
    if (g === 'shot') { setBam(true); applyBam(); updateFrustum(); redraw(); return; }
    bam = false;
    if (B.free.fov !== 55) { B.free.fov = 55; B.free.updateProjectionMatrix(); }
    if (g === 'tren') {
      const box = bounds(), ctr = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const ext = Math.max(30, size.x, size.z) * 0.75;
      c.target.copy(ctr); B.free.position.set(ctr.x, ctr.y + ext / Math.tan(THREE.MathUtils.degToRad(B.free.fov / 2)), ctr.z + 0.01);
    } else if (g === 'truoc') {
      c.target.copy(shotCam.target); B.free.position.copy(shotCam.target).add(_v.set(0, 8, 28));
    }
    c.update(); redraw();
    for (const b of B.bar.querySelectorAll('button[data-g]')) b.classList.toggle('on', b.dataset.g === g);
  }

  // ---------- bật / tắt ----------
  // opt.songSong: Phim (khung gốc, cả phụ đề) giữ chỗ cũ bên trái, khung 3D thêm vào container bên phải (container nên là flex hàng)
  function bat(container, opt = {}) {
    if (on) { if (!!opt.songSong === ss) return api; tat(); }
    if (!built) built = build();
    on = true; ss = !!opt.songSong && !!container;
    const B = built;
    const host = container || document.body;
    B.el.classList.toggle('c3d-fixed', !container);
    B.el.classList.toggle('c3d-ss', ss);
    B.el.classList.toggle('c3d-col', ss && !!opt.cot);
    host.appendChild(B.el);
    B.el.tabIndex = -1;
    origDraw = stage.draw;
    if (ss) {
      ssCv = document.createElement('canvas'); ssCv.className = 'c3d-ssview'; ssCtx = ssCv.getContext('2d');
      B.el.insertBefore(ssCv, B.el.firstChild);
      filmCv = document.createElement('canvas'); filmCv.width = W0; filmCv.height = H0; filmCv.className = 'c3d-film';
      filmCv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
      filmCtx = filmCv.getContext('2d');
      canvas.parentNode.insertBefore(filmCv, canvas.nextSibling);   // đè canvas WebGL, nằm DƯỚI phụ đề/chữ nổi (DOM phía sau)
      stage.draw = (t) => drawSS(t);
    } else {
      home = { parent: canvas.parentNode, next: canvas.nextSibling };
      canvasStyle = canvas.getAttribute('style');
      B.el.insertBefore(canvas, B.el.firstChild);   // khung rộng: cùng renderer (không dịch shader lại), chỉ đổi cỡ bộ đệm vẽ
      stage.draw = (t) => draw3d(t);
    }
    try { sizeObs = new ResizeObserver(resize); sizeObs.observe(B.el); } catch (e) {}
    const r = B.el.getBoundingClientRect(), k = Math.min(window.devicePixelRatio || 1, 1.5);
    if (ss) { const s = Math.min(1, W0 / Math.max(4, r.width * k), H0 / Math.max(4, r.height * k)); vw = Math.max(4, Math.floor(r.width * k * s)); vh = Math.max(4, Math.floor(r.height * k * s)); ssCv.width = vw; ssCv.height = vh; }
    else renderer.setSize(Math.max(4, Math.round(r.width * k)), Math.max(4, Math.round(r.height * k)), false);
    B.free.aspect = Math.max(0.2, r.width / Math.max(1, r.height)); B.free.updateProjectionMatrix();
    B.ready = false;
    const p = stage.renderAt(curT = lastT());   // đọc camera shot ở t hiện tại
    const first = () => { if (!B.started) { B.started = true; goc('truoc'); } else { if (bam) applyBam(); else if (!giuGoc) flyToShot(); updateFrustum(); redraw(); } };
    if (p && p.then) p.then(first); else first();
    fillEnvSelect(); syncVien(true); B.sua?.batLai();
    for (const f of listeners) f(true, ss);
    return api;
  }
  function tat() {
    if (!on) return api;
    const B = built;
    on = false;
    try { sizeObs?.disconnect(); } catch (e) {}
    stage.draw = origDraw; origDraw = null;
    B.sua?.traLai();
    if (ss) {
      ssCv.remove(); filmCv.remove(); ssCv = ssCtx = filmCv = filmCtx = null; ss = false;
      B.el.classList.remove('c3d-ss', 'c3d-col');
      renderer.setScissorTest(false); renderer.setViewport(0, 0, W0, H0);
    } else {
      home.parent.insertBefore(canvas, home.next && home.next.parentNode === home.parent ? home.next : null);
      if (canvasStyle === null) canvas.removeAttribute('style'); else canvas.setAttribute('style', canvasStyle);
    }
    B.el.remove();
    renderer.setSize(W0, H0, false);   // đúng cỡ gốc của stage (setPixelRatio(1) không đổi)
    const p = stage.renderAt(curT);    // khung Phim y như trước khi bật
    for (const f of listeners) f(false, false);
    return p || api;
  }
  // t hiện tại: lấy từ lần renderAt gần nhất (stage giữ lastT bên trong) — đọc qua lần vẽ kế tiếp; mặc định 0
  let _lastT = 0;
  const lastT = () => _lastT;
  stage.onFrame((t) => { _lastT = t; });   // chỉ ghi lại t, không đổi gì trong cảnh

  const api = {
    bat, tat, goc,
    get on() { return on; },
    get songSong() { return on && ss; },
    toggle: (c) => (on ? tat() : bat(c)),
    onChange: (f) => { listeners.add(f); return () => listeners.delete(f); },
    get shotCam() { return { pos: shotCam.pos.toArray(), target: shotCam.target.toArray(), quat: shotCam.quat.toArray(), fov: shotCam.fov, id: shotCam.id }; },
    get camera() { return built?.free; },
    get giuGoc() { return giuGoc; },
    get sua() { return built?.sua || null; },
    ghiChu3d: () => built?.sua?.xuat() || null,
    get env() { return envChon; }, setEnv, envList,
    get bam() { return on && bam; },
    setBam: (v) => { if (v) goc('shot'); else stopBam(); },
    get nhe() { return nhe; }, setNhe: (v) => { nhe = !!v; const c = built?.bar.querySelector('input[data-o=nhe]'); if (c) c.checked = nhe; redraw(); },
    setGiuGoc: (v) => { giuGoc = !!v; const c = built?.bar.querySelector('input[data-o=giuGoc]'); if (c) c.checked = giuGoc; },
    paths,
    _stage: stage,
    _setSrc: (o) => { for (const k of Object.keys(S)) if (o[k]) S[k] = o[k]; if (built) built.heights.clear(); },
  };
  window.__che3d = api;
  window.dispatchEvent(new Event('che3d-san-sang'));   // trình phát (tools/export-ui.js) gắn nút Phim | 3D khi nhận

  // trang dev: ?che3d=1 → nút nổi "3D" (trình phát dùng nút riêng trong khung hình)
  if (q.get('che3d') === '1' && !document.getElementById('xapp')) {
    const b = document.createElement('button'); b.className = 'c3d-btn'; b.textContent = '3D';
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    b.onclick = () => { api.toggle(); b.textContent = on ? 'Phim' : '3D'; };
    document.body.appendChild(b);
  }
  return api;
}
