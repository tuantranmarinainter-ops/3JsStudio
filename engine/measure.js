// measure.js — đo khung hình bằng SỐ cho tool kiểm luật (tools/kiem/*) và vẽ mặt nạ bóng dáng.
//   installMeasure({ THREE, stage, shots }) đặt:
//     window.__measure(t)  — gọi SAU renderAt(t); chỉ đọc cảnh, không đổi gì. Trả
//        { t, shot, cam:{fov,pos}, soTheHat, vat:[{ten,vai,bbox:[x0,y0,x1,y1],trongKhung,che,mat?,nghieng?,chim?}],
//          chan:[{ten,chamDat,hatGan}], hat:{bui,tuyet,mua}, tang:{front,mid,back}, vatLieu:[{ten,kind,nguon,grunge}] }
//     window.__mask(t)     — vẽ lại khung: vật vai hero/vat-chinh/nha (cả con cháu) đen phẳng, còn lại ẩn, nền trắng, không hậu kỳ.
//                            window.__mask(null) khôi phục (sau đó gọi renderAt(t) để vẽ lại ảnh thường).
//     window.__maskAnh(t, w=135, h=240) -> { w, h, data:number[] RGBA } — như __mask nhưng vẽ vào WebGLRenderTarget w×h và ĐỌC THẲNG pixel trong cùng tác vụ
//                            (không qua screenshot), rồi tự khôi phục; canvas không bị đụng.
//   Vai gắn ở nơi tạo vật: userData.vai = 'hero'|'nguoi'|'nha'|'chan-nha'|'doc'|'vat-chinh'|'vat-phu'|'tay'|'chan-nguoi';
//   userData.tang = 'front'|'mid'|'back'; userData.hat = 'bui'|'tuyet'|'mua' + userData.soHat() (+ tuỳ chọn hatViTri()).
//   Vai của một vật = vai gần nhất khi đi ngược lên cây cha.
//   KHÔNG có import: file này được tiêm nguyên văn vào bản gộp cũ (THREE nhận qua tham số).
export function installMeasure({ THREE, stage, shots }) {
  const scene = stage.scene, camera = stage.camera, renderer = stage.renderer;
  const R4 = (v) => Math.round(v * 1e4) / 1e4;
  const MASK_VAI = new Set(['hero', 'vat-chinh', 'nha']);

  const chainVisible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const matsOf = (m) => (Array.isArray(m.material) ? m.material : [m.material]);
  const faint = (m) => { const ms = matsOf(m).filter(Boolean); return !ms.length || ms.every((x) => x.visible === false || (x.transparent && x.opacity < 0.05)); };
  const vaiOf = (o) => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.vai) return p.userData.vai; return null; };
  // giữ mesh nếu BẤT KỲ tổ tiên (kể cả chính nó) có vai trong MASK_VAI — tay/chân lồng trong hero vẫn được vẽ
  const coVaiMask = (o) => { for (let p = o; p; p = p.parent) if (p.userData && MASK_VAI.has(p.userData.vai)) return true; return false; };
  const VAI_VL = new Set(['vat-chinh', 'nha', 'chan-nha', 'doc', 'vat-phu']);   // vật liệu phải KHAI BÁO (tools/kiem/luat.mjs L9)
  const coVaiVL = (o) => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.vai) return VAI_VL.has(p.userData.vai); return false; };   // vai GẦN NHẤT (người trong nhà không tính)
  const vaiNode = (o) => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.vai) return p; return null; };

  // bbox thế giới của các mesh nhìn thấy dưới `obj` (bỏ cây con thoả `skip`)
  const _b = new THREE.Box3();
  function worldBox(obj, skip) {
    const box = new THREE.Box3();
    (function walk(o) {
      if (!o.visible || (skip && skip(o))) return;
      if (o.isMesh && o.geometry && !faint(o)) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        _b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(_b);
      }
      for (const c of o.children) walk(c);
    })(obj);
    return box;
  }

  // chiếu bbox ra màn hình 0..1 (cắt cạnh theo mặt phẳng gần để không vỡ khi một phần ở sau camera)
  const CORNERS = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  function screenRect(box) {
    if (box.isEmpty()) return null;
    camera.updateMatrixWorld();
    const inv = new THREE.Matrix4().copy(camera.matrixWorld).invert();
    const P = CORNERS.map(([a, b, c]) => new THREE.Vector3(a ? box.max.x : box.min.x, b ? box.max.y : box.min.y, c ? box.max.z : box.min.z).applyMatrix4(inv));
    const zn = -camera.near;
    const pts = [];
    for (const p of P) if (p.z <= zn) pts.push(p);
    for (const [i, j] of EDGES) {
      const a = P[i], b = P[j];
      if ((a.z <= zn) !== (b.z <= zn)) { const k = (zn - a.z) / (b.z - a.z); pts.push(new THREE.Vector3().lerpVectors(a, b, k)); }
    }
    if (!pts.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      p.applyMatrix4(camera.projectionMatrix);   // camera-space → NDC (applyMatrix4 chia w)
      const x = (p.x + 1) / 2, y = (1 - p.y) / 2;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return [x0, y0, x1, y1];
  }
  const inFrame = (r) => {
    const a = (r[2] - r[0]) * (r[3] - r[1]); if (!(a > 0)) return 0;
    const w = Math.max(0, Math.min(1, r[2]) - Math.max(0, r[0])), h = Math.max(0, Math.min(1, r[3]) - Math.max(0, r[1]));
    return Math.min(1, (w * h) / a);
  };

  // ứng viên che khuất: mesh nhìn thấy, đặc (không hạt, không gần như trong suốt, có ghi độ sâu → bỏ bầu trời/viền) + cầu bao thế giới
  function occluders() {
    const list = [];
    scene.traverseVisible((o) => {
      if (!o.isMesh || !o.geometry || o.isSprite || faint(o)) return;
      if (matsOf(o).some((m) => m && (m.depthWrite === false || m.depthTest === false))) return;
      const g = o.geometry; if ((g.index ? g.index.count : g.attributes.position.count) > 60000) return;   // mặt biển/địa hình lưới dày: raycast CPU chậm (~0,35 s/81 tia) và sai vì sóng dịch trong shader
      if (!g.boundingSphere) g.computeBoundingSphere();
      list.push({ o, s: o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld), b: (g.boundingBox || (g.computeBoundingBox(), g.boundingBox)).clone().applyMatrix4(o.matrixWorld) });
    });
    return list;
  }
  const rc = new THREE.Raycaster();
  // tỷ lệ tia (lưới 9×9 trên mặt phẳng qua tâm bbox vuông góc hướng nhìn) bị vật KHÁC chặn trước khi tới điểm đó
  function cheKhuat(box, rect, own, all, GRID = 9) {
    if (!rect) return 0;
    const x0 = Math.max(0, rect[0]), x1 = Math.min(1, rect[2]), y0 = Math.max(0, rect[1]), y1 = Math.min(1, rect[3]);
    if (!(x1 > x0 && y1 > y0)) return 0;
    const center = box.getCenter(new THREE.Vector3());
    const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    const dPlane = center.clone().sub(camPos).dot(fwd);
    if (!(dPlane > camera.near)) return 0;
    // kim tự tháp từ camera qua 4 góc của ô lưới: chỉ mesh có cầu bao cắt nó (và nằm trước mặt phẳng đích) mới thử tia
    const ray = (sx, sy) => { rc.setFromCamera(new THREE.Vector2(sx * 2 - 1, 1 - sy * 2), camera); return rc.ray.direction.clone(); };
    const dirs = [ray(x0, y0), ray(x1, y0), ray(x1, y1), ray(x0, y1)];
    const planes = dirs.map((d, i) => { const e = dirs[(i + 1) % 4]; return new THREE.Plane().setFromNormalAndCoplanarPoint(d.clone().cross(e).normalize(), camPos); });
    const sign = planes[0].distanceToPoint(camPos.clone().addScaledVector(fwd, 1)) >= 0 ? 1 : -1;
    const cands = [];
    for (const { o, s, b } of all) {
      if (own.has(o)) continue;
      let ok = true;
      for (const pl of planes) if (sign * pl.distanceToPoint(s.center) < -s.radius) { ok = false; break; }
      if (ok && s.center.clone().sub(camPos).dot(fwd) - s.radius < dPlane) cands.push({ o, b });
    }
    if (!cands.length) return 0;
    let blocked = 0, total = 0;
    const ndc = new THREE.Vector2(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    let hit;
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
      const sx = x0 + (x1 - x0) * (i + 0.5) / GRID, sy = y0 + (y1 - y0) * (j + 0.5) / GRID;
      ndc.set(sx * 2 - 1, 1 - sy * 2);
      rc.setFromCamera(ndc, camera);
      dir.copy(rc.ray.direction);
      const dist = dPlane / Math.max(1e-6, dir.dot(fwd));
      rc.near = 0; rc.far = dist - 1e-3;
      total++;
      // chỉ thử mesh mà tia vào hộp bao của nó trước khi tới điểm đích (núi/đồi phía sau bị loại ngay, khỏi duyệt từng tam giác)
      const near = [];
      for (const c of cands) { if (c.b.containsPoint(rc.ray.origin) || ((hit = rc.ray.intersectBox(c.b, tmp)) && hit.distanceTo(rc.ray.origin) <= rc.far)) near.push(c.o); }
      if (near.length && rc.intersectObjects(near, false).length) blocked++;
    }
    return total ? blocked / total : 0;
  }

  function ownMeshes(root) { const s = new Set(); root.traverse((o) => { if (o.isMesh) s.add(o); }); return s; }

  const tenOf = (o) => {
    const owner = o.parent ? vaiNode(o.parent) : null;
    return owner ? `${tenOf(owner)}/${o.name || o.userData.vai}` : (o.name || o.userData.vai);
  };

  function measure(t) {
    scene.updateMatrixWorld(true);
    const T = Math.min(t, (shots.total ?? t) - 1e-4);
    const info = shots.at ? shots.at(T) : null;
    const cands = occluders();
    const vat = [], chan = [], seenHat = { bui: 0, tuyet: 0, mua: 0 }, tang = { front: 0, mid: 0, back: 0 };
    const nodes = [];
    scene.traverse((o) => { if (o.userData && o.userData.vai && chainVisible(o)) nodes.push(o); });
    const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    const matDat = stage.ground && stage.ground.visible ? stage.ground.position.y : 0;   // env không khai báo thì mặt đất ở y = 0
    camera.updateMatrixWorld();
    const frTang = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, new THREE.Matrix4().copy(camera.matrixWorld).invert()));
    const tangTrongTamNhin = (o) => { const bx = worldBox(o); return bx.isEmpty() || frTang.intersectsBox(bx); };
    const hats = [];
    let soTheHat = 0;
    scene.traverse((o) => {
      const u = o.userData; if (!u) return;
      if (u.hat) soTheHat++;
      if (u.tang && tang[u.tang] !== undefined && chainVisible(o) && tangTrongTamNhin(o)) tang[u.tang]++;   // chỉ đếm vật giao frustum camera (gồm near..far); vật không có mesh (hạt mưa quanh camera) đếm luôn
      if (u.hat && seenHat[u.hat] !== undefined && chainVisible(o)) { seenHat[u.hat] += typeof u.soHat === 'function' ? u.soHat() : 0; if (typeof u.hatViTri === 'function') hats.push(u); }
    });
    for (const o of nodes) {
      const vai = o.userData.vai;
      const box = worldBox(o);
      const owner = o.parent ? vaiNode(o.parent) : null;
      const ten = tenOf(o);
      const rect = box.isEmpty() ? null : screenRect(box);
      const own = ownMeshes(o);
      // bbox null = hộp rỗng / hoàn toàn sau lưng camera (không phải [0,0,0,0])
      const e = { ten, vai, bbox: rect ? rect.map(R4) : null, trongKhung: rect ? R4(inFrame(rect)) : 0, che: rect ? R4(cheKhuat(box, rect, own, cands, vai === 'tay' || vai === 'chan-nguoi' ? 5 : 9)) : 0 };   // bộ phận người: lưới 5×5 cho kịp ≤ ~1 s
      if ((vai === 'tay' || vai === 'chan-nguoi') && owner) e.chu = tenOf(owner);   // vật chủ (vd. hero) để luật tách thân chỉ xét hero
      if (box.isEmpty()) { vat.push(e); continue; }
      if (vai === 'hero') {
        let nhaCha = null; for (let p = o.parent; p && !nhaCha; p = p.parent) if (p.userData && p.userData.vai === 'nha') nhaCha = p;
        e.trong = nhaCha ? tenOf(nhaCha) : null;   // hero đứng trong/trên nhà: dính vào bóng dáng của nhà
        let head = null; o.traverse((c) => { if (!head && c.name === 'Head') head = c; });
        if (head) { const hb = worldBox(head); e.mat = { che: R4(cheKhuat(hb, screenRect(hb), own, cands)) }; }
      }
      if (vai === 'nha') {
        let body = null; o.traverse((c) => { if (!body && c.name === 'house_body') body = c; });
        const up = new THREE.Vector3(0, 1, 0).transformDirection((body || o).matrixWorld);
        e.nghieng = R4(THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.max(-1, up.y)))));
        const sb = worldBox(body || o);
        e.chim = R4(Math.max(0, sb.isEmpty() ? 0 : -sb.min.y));   // mặt đất/mặt nước ở y = 0
      }
      vat.push(e);
      if (vai === 'chan-nha') {
        let foot = null; o.traverse((c) => { if (!foot && c.name === 'foot') foot = c; });
        const fb = worldBox(foot || o);
        const y = fb.isEmpty() ? null : R4(fb.min.y - matDat);   // độ cao đáy bàn chân so với mặt đất của cảnh
        const chamDat = y !== null && y <= 0.05;
        let hatGan = 0;
        if (!fb.isEmpty() && hats.length) {
          const c = fb.getCenter(new THREE.Vector3());
          for (const u of hats) { const a = u.hatViTri(); for (let i = 0; i + 2 < a.length; i += 3) if (Math.hypot(a[i] - c.x, a[i + 1] - c.y, a[i + 2] - c.z) <= 5) hatGan++; }
        }
        chan.push({ ten, chamDat, y, hatGan });
      }
    }
    // vật liệu của mesh đang trong khung (gộp theo tên+loại)
    const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const vl = new Map(), sph = new THREE.Sphere();
    scene.traverseVisible((o) => {
      if (!o.isMesh || !o.geometry || faint(o)) return;
      if (!coVaiVL(o)) return;   // chỉ vật chính / nhà / vật cần đọc (luật L9); đất, cây, người… không khai báo từng mesh
      const m = matsOf(o)[0]; let kind = m && m.userData && m.userData.matKind;
      let chuaVa = false;   // có vai nhưng vật liệu chưa được vá (trong suốt, không phải MeshStandard…): KHÔNG bỏ qua, báo nguon 'chua-va' để L9 thấy
      if (!kind) {
        const kd = (o.userData && o.userData.matKind) || (m && m.userData && m.userData.matDecl) || null;
        if ((o.userData && o.userData.matKind === 'none' && o.userData.matNguon === 'khai-bao') || (m && m.userData && m.userData.matDecl === 'none')) kind = 'none';   // khai báo "giữ vật liệu gốc" (ở mesh hoặc ở vật liệu)
        else { kind = kd; chuaVa = true; }
      }
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      if (!fr.intersectsSphere(sph)) return;
      let gk; for (let p = o; p && gk === undefined; p = p.parent) gk = p.userData && p.userData.grungeKind;
      const grunge = gk !== 'none' && !!(m && m.userData && m.userData.grunge);
      const nguon = chuaVa ? 'chua-va' : ((o.userData && o.userData.matNguon) || (m && m.userData && m.userData.matNguon) || 'doan');
      vl.set(`${o.name}|${kind}|${nguon}|${grunge}`, { ten: o.name, kind, nguon, grunge });
    });
    return {
      t, shot: info && info.shot ? info.shot.id : null,
      cam: { fov: R4(camera.fov), pos: [R4(camPos.x), R4(camPos.y), R4(camPos.z)] }, soTheHat,
      vat, chan, hat: seenHat, tang, vatLieu: [...vl.values()],
    };
  }

  // ---- mặt nạ ----
  let saved = null;
  function restore() {
    if (!saved) return;
    for (const [o, v] of saved.vis) o.visible = v;
    scene.overrideMaterial = saved.over; scene.background = saved.bg; scene.fog = saved.fog;
    renderer.setClearColor(saved.cc, saved.ca); renderer.autoClear = saved.auto; renderer.shadowMap.autoUpdate = saved.sh;
    saved.basic.dispose(); saved = null;
  }
  // đặt cảnh sang chế độ mặt nạ (vật vai hero/vat-chinh/nha đen phẳng, còn lại ẩn, nền trắng); khôi phục bằng restore()
  function begin() {
    scene.updateMatrixWorld(true);
    const cc = new THREE.Color(); renderer.getClearColor(cc);
    saved = { vis: [], over: scene.overrideMaterial, bg: scene.background, fog: scene.fog, cc, ca: renderer.getClearAlpha(), auto: renderer.autoClear,
      sh: renderer.shadowMap.autoUpdate, basic: new THREE.MeshBasicMaterial({ color: 0x000000 }) };
    scene.traverse((o) => {
      if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.visible && !coVaiMask(o)) { saved.vis.push([o, o.visible]); o.visible = false; }
    });
    scene.overrideMaterial = saved.basic; scene.background = new THREE.Color(0xffffff); scene.fog = null;
    renderer.setClearColor(0xffffff, 1); renderer.autoClear = true; renderer.shadowMap.autoUpdate = false;
  }
  function mask(t) {
    if (t === null || t === undefined) { restore(); return; }   // khôi phục (sau đó gọi renderAt(t) để vẽ lại ảnh thường)
    if (saved) restore();
    const go = () => {
      begin();
      let xong = false;
      try {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);   // thẳng ra canvas, không qua hậu kỳ
        xong = true;
      } finally { if (!xong) restore(); }   // render ném lỗi → luôn khôi phục cảnh
    };
    const p = stage.renderAt(t);   // đưa cảnh về đúng khung t (thường đồng bộ)
    return p && p.then ? p.then(go) : go();
  }
  // mặt nạ cỡ w×h đọc thẳng từ renderer ngay sau lệnh vẽ (cùng một tác vụ): ổn định hơn screenshot canvas
  function maskAnh(t, w = 135, h = 240) {
    if (saved) restore();
    const go = () => {
      const prevRT = renderer.getRenderTarget();
      const rt = new THREE.WebGLRenderTarget(w, h);
      let out = null;
      try {
        begin();
        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);
        const buf = new Uint8Array(w * h * 4);
        renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
        const data = new Array(w * h * 4);
        for (let y = 0; y < h; y++) {   // hàng 0 của buffer là đáy ảnh -> lật y
          const src = (h - 1 - y) * w * 4, dst = y * w * 4;
          for (let i = 0; i < w * 4; i++) data[dst + i] = buf[src + i];
        }
        out = { w, h, data };
      } finally { renderer.setRenderTarget(prevRT); rt.dispose(); restore(); }
      return out;
    };
    const p = stage.renderAt(t);
    return p && p.then ? p.then(go) : go();
  }

  window.__measure = measure;
  window.__mask = mask;
  window.__maskAnh = maskAnh;
}
