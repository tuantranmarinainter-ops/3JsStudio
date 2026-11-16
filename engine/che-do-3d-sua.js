// che-do-3d-sua.js — GÓP Ý TRONG KHUNG 3D (gắn vào engine/che-do-3d.js, chỉ tạo khi bật 3D lần đầu)
//   🖐 Xem   : như cũ (bay, xoay).
//   ✥ Sửa vật: bấm vào vật → chọn (bấm lại trong vật đang chọn = đi sâu một tầng, ⬆ = nhóm lớn hơn); tay kéo Dời (G) / Xoay (R) / Cỡ (T),
//              Bám lưới 1 stud, ↺ Trả lại (Delete), Esc bỏ chọn; ô ghi chú cho từng vật.
//   📍 Ghim  : bấm vào một điểm trong cảnh → ghim + mô tả.
// KHÔNG ghi vào tập: dời/xoay/cỡ chỉ là THỬ khi đang xem 3D (cả khung Phim song song thấy), tắt 3D thì trả lại như cũ.
// Mọi ghim + vật đã sửa (số trước/sau, ảnh khung 3D) đi kèm file góp ý (nút Gửi tới Claude / Xuất file của trình phát) → tools/feedback.mjs.
import { TransformControls } from 'three/addons/controls/TransformControls.js';

const CSS = `
.c3s-mode { display: inline-flex; gap: 0; } .c3s-mode button { border-radius: 0 !important; } .c3s-mode button:first-child { border-radius: 6px 0 0 6px !important; } .c3s-mode button:last-child { border-radius: 0 6px 6px 0 !important; }
.c3s-sel { display: none; gap: 6px; align-items: center; flex-wrap: wrap; } .c3s-sel.on { display: inline-flex; }
.c3s-info { position: absolute; right: 8px; top: 92px; width: 270px; z-index: 4; background: rgba(14,17,22,.94); border: 1px solid #f2a154; border-radius: 8px; padding: 8px;
  color: #e8ecf2; font: 12px/1.45 system-ui, sans-serif; display: none; } .c3s-info.on { display: block; }
.c3s-info .ten { font-weight: 700; color: #f2a154; word-break: break-all; } .c3s-info .so { font: 11px/1.5 ui-monospace, Consolas, monospace; color: #b8c2d0; white-space: pre; margin: 4px 0; }
.c3s-info textarea, .c3s-pin textarea { width: 100%; height: 58px; box-sizing: border-box; background: #0b0d12; color: #e8ecf2; border: 1px solid #2a3342; border-radius: 6px; font: 12px/1.4 system-ui, sans-serif; resize: vertical; }
.c3s-info button, .c3s-pin button { background: #1d2430; color: #e8ecf2; border: 1px solid #2a3342; border-radius: 6px; padding: 4px 8px; cursor: pointer; font: inherit; margin: 4px 4px 0 0; }
.c3s-info button.main, .c3s-pin button.main { background: #1f6fd1; border-color: #4da3ff; }
.c3s-pin { position: absolute; z-index: 6; width: 260px; background: rgba(14,17,22,.96); border: 1px solid #ff5a5a; border-radius: 8px; padding: 8px; color: #e8ecf2; font: 12px/1.4 system-ui, sans-serif; }
.c3d-lab div.gh { --c: #ff5a5a; pointer-events: auto; cursor: pointer; max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
.c3d-lab div.gh b { color: #ff8a8a; }
.c3s-dem { color: #ff8a8a; }
`;

const fmt = (a, k = 2) => a.map((v) => (Math.abs(v) < 1e-9 ? 0 : +v.toFixed(k)));
const deg = (e) => [e.x, e.y, e.z].map((r) => +(r * 180 / Math.PI).toFixed(1));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function ganSua({ THREE, stage, B, redraw, withView, shot, viewCanvas, isOn }) {
  const { scene } = stage;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const LS = 'c3d-gop-y:' + location.pathname + ':' + (document.title || '');
  let mode = 'xem', sel = null, hitPath = [], snap = false;
  const edits = new Map();   // obj → { path, ten, orig:{p,q,s}, text, shotId, t, img, ghiLuc }
  let ghim = [];             // { id, so, pos:Vector3, text, vat, shotId, t, cam, img }
  const listeners = new Set();
  const changed = () => { luu(); for (const f of listeners) try { f(); } catch (e) {} };

  // ---- thanh công cụ ----
  const grp = document.createElement('span'); grp.className = 'c3s-mode';
  grp.innerHTML = '<button data-m="xem" class="on" title="Chỉ xem / bay">🖐 Xem</button><button data-m="sua" title="Bấm vào vật để chọn rồi dời / xoay / đổi cỡ (chỉ thử, không ghi vào tập)">✥ Sửa vật</button><button data-m="ghim" title="Bấm vào một điểm trong cảnh để ghim + mô tả">📍 Ghim</button>';
  const sgrp = document.createElement('span'); sgrp.className = 'c3s-sel';
  sgrp.innerHTML = '<button data-t="translate" class="on" title="Dời (G)">↔ Dời</button><button data-t="rotate" title="Xoay (R)">⟳ Xoay</button><button data-t="scale" title="Cỡ (T)">⤢ Cỡ</button>'
    + '<label title="Dời theo bước 1 stud, xoay bước 15°"><input type="checkbox" data-snap> Bám lưới</label><button data-a="cha" title="Chọn nhóm lớn hơn (chứa vật này)">⬆ Nhóm</button><button data-a="trala" title="Trả vật về như cũ (Delete)">↺ Trả lại</button><button data-a="bo" title="Bỏ chọn (Esc)">✕</button>';
  const dem = document.createElement('span'); dem.className = 'c3s-dem'; dem.title = 'Ghim + vật đã sửa — đi kèm file góp ý (Gửi tới Claude / Xuất file)';
  B.bar.append(grp, sgrp, dem);
  const info = document.createElement('div'); info.className = 'c3s-info';
  info.innerHTML = '<div class="ten"></div><div class="so"></div><textarea placeholder="Ghi chú cho vật này (vd: dời sát tường, to quá…)"></textarea><div><button class="main" data-i="luu">Lưu ghi chú</button><button data-i="trala">↺ Trả lại</button></div>';
  B.el.appendChild(info);
  for (const n of [info]) n.addEventListener('pointerdown', (e) => e.stopPropagation());

  // ---- tay kéo ----
  const tc = new TransformControls(B.free, B.el);
  tc.setSize(0.9);
  const gizmo = tc.getHelper(); gizmo.name = 'che3d_taykeo'; B.helpers.add(gizmo);
  tc.addEventListener('dragging-changed', (e) => { B.controls.enabled = !e.value; });
  tc.addEventListener('change', () => { if (isOn()) redraw(); });
  tc.addEventListener('objectChange', () => { if (sel) { ghiSua(sel); showInfo(); } });
  tc.addEventListener('mouseUp', () => { if (sel && edits.has(sel)) { const e = edits.get(sel); e.img = chup(); e.shotId = shot().id; e.t = shot().t; changed(); } });

  function setMode(m) {
    mode = m;
    for (const b of grp.querySelectorAll('button')) b.classList.toggle('on', b.dataset.m === m);
    if (m !== 'sua') chon(null);
    B.el.style.cursor = m === 'xem' ? '' : 'crosshair';
  }
  grp.addEventListener('click', (e) => { const b = e.target.closest('button[data-m]'); if (b) { setMode(b.dataset.m); b.blur(); } });
  sgrp.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; b.blur();
    if (b.dataset.t) setTool(b.dataset.t);
    else if (b.dataset.a === 'cha' && sel?.parent && sel.parent !== scene) chon(sel.parent);
    else if (b.dataset.a === 'trala') traVat(sel);
    else if (b.dataset.a === 'bo') chon(null);
  });
  sgrp.addEventListener('change', (e) => { if (e.target.dataset.snap !== undefined) { snap = e.target.checked; applySnap(); e.target.blur(); } });
  function setTool(t) { tc.setMode(t); for (const b of sgrp.querySelectorAll('button[data-t]')) b.classList.toggle('on', b.dataset.t === t); }
  function applySnap() { tc.setTranslationSnap(snap ? 1 : null); tc.setRotationSnap(snap ? THREE.MathUtils.degToRad(15) : null); tc.setScaleSnap(snap ? 0.1 : null); }
  info.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]'); if (!b || !sel) return;
    if (b.dataset.i === 'trala') return traVat(sel);
    const ed = ghiSua(sel, true); ed.text = info.querySelector('textarea').value.trim(); ed.img = chup(); ed.shotId = shot().id; ed.t = shot().t; changed();
    b.textContent = 'Đã lưu ✓'; setTimeout(() => { b.textContent = 'Lưu ghi chú'; }, 1200);
  });

  // ---- chọn vật / ghim bằng cú bấm (không kéo) ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  B.el.addEventListener('pointerdown', (e) => { if (e.button === 0) down = [e.clientX, e.clientY]; }, true);
  B.el.addEventListener('pointerup', (e) => {
    if (e.button !== 0 || !down || mode === 'xem' || tc.dragging) return;
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null;
    if (moved > 4 || e.target.closest('.c3s-info,.c3s-pin,.c3d-bar,.gh')) return;
    const hit = pick(e); if (mode === 'sua') { if (hit) chonTu(hit.object); } else if (mode === 'ghim') moGhim(hit, e);
  });
  const isSky = (o) => /^(sky|stormsky)$/.test(o.name) || o.name?.startsWith('skybox_');
  function pick(e) {
    const r = B.el.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, B.free);
    return withView(() => {
      const hits = ray.intersectObjects(scene.children, true);
      for (const h of hits) {
        let ok = true; for (let x = h.object; x; x = x.parent) { if (!x.visible || isSky(x)) { ok = false; break; } }
        if (ok && (h.object.isMesh || h.object.isSkinnedMesh || h.object.isInstancedMesh)) return h;
      }
      // trượt mọi vật → điểm trên mặt sàn y = 0
      const p = new THREE.Vector3(); return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? { point: p, object: null } : null;
    });
  }
  // chuỗi tổ tiên từ nút dưới env_/scene xuống tới mesh trúng; bấm lại trong vật đang chọn → đi sâu một tầng
  function chonTu(mesh) {
    const chain = []; for (let x = mesh; x && x !== scene; x = x.parent) { chain.unshift(x); if (x.parent?.name?.startsWith('env_') || x.parent === scene) break; }
    if (chain[0]?.name?.startsWith('env_')) chain.shift();
    if (!chain.length) return;
    const i = sel ? chain.indexOf(sel) : -1;
    hitPath = chain; chon(i >= 0 && i < chain.length - 1 ? chain[i + 1] : chain[0]);
  }
  function chon(o) {
    sel = o || null;
    if (sel) tc.attach(sel); else tc.detach();
    sgrp.classList.toggle('on', !!sel); info.classList.toggle('on', !!sel);
    if (sel) { info.querySelector('textarea').value = edits.get(sel)?.text || ''; showInfo(); }
    if (isOn()) redraw();
  }
  const pathOf = (o) => { const a = []; for (let x = o; x && x !== scene; x = x.parent) a.unshift(x.name || `#${x.parent ? x.parent.children.indexOf(x) : 0}`); return a.join('/'); };
  const tf = (o) => ({ p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() });
  function ghiSua(o, force) {
    let ed = edits.get(o);
    if (!ed) { ed = { path: pathOf(o), ten: o.name || pathOf(o), orig: null, text: '', ghiLuc: new Date().toISOString() }; edits.set(o, ed); }
    if (!ed.orig) ed.orig = ed.orig0 || tf(o);   // orig0: vị trí trước lần kéo đầu (ghi ở 'mouseDown')
    ed.now = tf(o);
    return ed;
  }
  tc.addEventListener('mouseDown', () => { if (sel && !edits.has(sel)) edits.set(sel, { path: pathOf(sel), ten: sel.name || pathOf(sel), orig: tf(sel), text: '', ghiLuc: new Date().toISOString() }); });
  function traVat(o) {
    const ed = o && edits.get(o); if (!ed) return;
    if (ed.orig) { o.position.copy(ed.orig.p); o.quaternion.copy(ed.orig.q); o.scale.copy(ed.orig.s); }
    edits.delete(o); if (o === sel) showInfo(); changed(); if (isOn()) redraw();
  }
  function showInfo() {
    if (!sel) return;
    const ed = edits.get(sel), w = new THREE.Vector3(); sel.getWorldPosition(w);
    const e = new THREE.Euler().setFromQuaternion(sel.quaternion);
    info.querySelector('.ten').textContent = (sel.name || '(không tên)') + (hitPath.length > 1 ? `  · tầng ${hitPath.indexOf(sel) + 1}/${hitPath.length}` : '');
    info.querySelector('.ten').title = pathOf(sel);
    let s = `vị trí  ${fmt(sel.position.toArray()).join(', ')}\nxoay°   ${deg(e).join(', ')}\ncỡ      ${fmt(sel.scale.toArray(), 3).join(', ')}\nthế giới ${fmt(w.toArray()).join(', ')}`;
    if (ed?.orig) { const d = sel.position.clone().sub(ed.orig.p); s += `\nđã dời  ${fmt(d.toArray()).join(', ')}`; }
    info.querySelector('.so').textContent = s;
  }

  // ---- ghim ----
  const pinGeo = new THREE.BufferGeometry();
  const pins = new THREE.Points(pinGeo, new THREE.PointsMaterial({ color: 0xff4d4d, size: 12, sizeAttenuation: false, depthTest: false, transparent: true }));
  pins.name = 'che3d_ghim'; pins.renderOrder = 12; B.helpers.add(pins);
  const pinGeoUpdate = () => { pins.geometry.dispose(); pins.geometry = new THREE.BufferGeometry().setFromPoints(ghim.map((g) => g.pos)); };
  let panel = null;
  function moGhim(hit, e, edit) {
    panel?.remove();
    const g = edit || (hit ? { pos: hit.point.clone(), vat: hit.object ? pathOf(hit.object) : null } : null); if (!g) return;
    const r = B.el.getBoundingClientRect();
    panel = document.createElement('div'); panel.className = 'c3s-pin';
    panel.style.left = Math.min(r.width - 270, Math.max(4, (e?.clientX ?? r.left + r.width / 2) - r.left + 10)) + 'px';
    panel.style.top = Math.min(r.height - 150, Math.max(4, (e?.clientY ?? r.top + r.height / 2) - r.top + 10)) + 'px';
    panel.innerHTML = `<b>📍 ${edit ? 'Ghim ' + edit.so : 'Ghim mới'}</b>${g.vat ? ` <span style="color:#8b96a8">trên ${esc(g.vat.split('/').pop())}</span>` : ''}<textarea placeholder="Mô tả chỗ này (vd: thiếu cửa sổ, cây che mặt…)"></textarea>`
      + `<div><button class="main" data-p="luu">Lưu</button>${edit ? '<button data-p="xoa">Xoá ghim</button>' : ''}<button data-p="huy">Huỷ</button></div>`;
    panel.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    const ta = panel.querySelector('textarea'); ta.value = edit?.text || '';
    ta.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Escape') panel.remove(); if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) panel.querySelector('[data-p=luu]').click(); });
    panel.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-p]'); if (!b) return;
      if (b.dataset.p === 'luu') {
        const text = ta.value.trim();
        if (edit) edit.text = text;
        else { const s = shot(); ghim.push({ id: Date.now().toString(36), so: (ghim.reduce((m, x) => Math.max(m, x.so), 0) + 1), pos: g.pos, vat: g.vat, text, shotId: s.id, t: s.t, cam: { pos: fmt(B.free.position.toArray()), target: fmt(B.controls.target.toArray()), fov: +B.free.fov.toFixed(1) } }); }
        pinGeoUpdate(); if (isOn()) redraw();
        const it = edit || ghim[ghim.length - 1]; it.img = chup(); changed();
      } else if (b.dataset.p === 'xoa') { ghim = ghim.filter((x) => x !== edit); B.labels.get('gh:' + edit.id)?.remove(); B.labels.delete('gh:' + edit.id); pinGeoUpdate(); changed(); if (isOn()) redraw(); }
      panel.remove(); panel = null;
    });
    B.el.appendChild(panel); ta.focus();
  }
  // nhãn ghim (gọi sau updateLabels của che-do-3d)
  const _v = new THREE.Vector3();
  function capNhatGhim() {
    const rect = B.el.getBoundingClientRect();
    for (const g of ghim) {
      const key = 'gh:' + g.id; let d = B.labels.get(key);
      if (!d) { d = document.createElement('div'); d.className = 'gh'; d.onclick = (ev) => { ev.stopPropagation(); moGhim(null, ev, g); }; d.addEventListener('pointerdown', (ev) => ev.stopPropagation()); B.lab.appendChild(d); B.labels.set(key, d); }
      d.innerHTML = `<b>📍${g.so}</b> ${esc(g.text || '(chưa mô tả)')}`; d.title = g.text || '';
      _v.copy(g.pos).project(B.free);
      if (_v.z < -1 || _v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) { d.style.display = 'none'; continue; }
      d.style.left = ((_v.x + 1) / 2 * rect.width).toFixed(1) + 'px'; d.style.top = ((1 - _v.y) / 2 * rect.height - 8).toFixed(1) + 'px'; d.style.display = '';
    }
    dem.textContent = ghim.length || edits.size ? `📍${ghim.length} · ✥${edits.size}` : '';
  }

  // ảnh khung 3D (JPEG ≤ 640 px) — vẽ lại rồi đọc ngay trong cùng tác vụ (không cần preserveDrawingBuffer)
  function chup() {
    try {
      if (!isOn()) return '';
      redraw();
      const src = viewCanvas(), k = Math.min(1, 640 / Math.max(1, src.width));
      const c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.75);
    } catch (e) { return ''; }
  }

  // ---- phím: G/R/T đổi tay kéo, Delete trả lại, Esc bỏ chọn ----
  addEventListener('keydown', (e) => {
    if (!isOn() || mode !== 'sua' || !sel || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '') && e.target.type !== 'checkbox') return;
    const m = { KeyG: 'translate', KeyR: 'rotate', KeyT: 'scale' }[e.code];
    if (m) { e.preventDefault(); e.stopPropagation(); setTool(m); }
    else if (e.key === 'Delete') { e.preventDefault(); traVat(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); chon(null); }
  }, true);

  // ---- lưu tạm trong trình duyệt (tải lại trang vẫn còn) ----
  function luu() {
    const d = xuat(true);
    try { localStorage.setItem(LS, JSON.stringify(d)); } catch (e) { try { localStorage.setItem(LS, JSON.stringify(xuat(false))); } catch (e2) {} }
  }
  let choApDung = [];   // vật sửa từ lần mở trước: tìm lại theo đường dẫn khi cảnh đã có
  try {
    const d = JSON.parse(localStorage.getItem(LS) || 'null');
    if (d) { ghim = (d.ghim || []).map((g) => ({ ...g, pos: new THREE.Vector3(...g.pos) })); choApDung = d.vat || []; pinGeoUpdate(); }
  } catch (e) {}
  const findPath = (p) => { let o = scene; for (const n of p.split('/')) { o = n.startsWith('#') ? o?.children[+n.slice(1)] : o?.children.find((c) => c.name === n); if (!o) return null; } return o; };

  // ---- vòng đời ----
  const arr = (v) => v.toArray();
  function xuat(img = true) {
    const vat = [];
    for (const [o, ed] of edits) {
      if (!ed.orig) continue;
      const now = tf(o), eo = new THREE.Euler().setFromQuaternion(ed.orig.q), en = new THREE.Euler().setFromQuaternion(now.q);
      const wo = new THREE.Vector3(), wn = new THREE.Vector3(); o.getWorldPosition(wn);
      { const p = o.position.clone(); o.position.copy(ed.orig.p); o.updateMatrixWorld(true); o.getWorldPosition(wo); o.position.copy(p); o.updateMatrixWorld(true); }
      vat.push({ path: ed.path, ten: ed.ten, text: ed.text || '', shotId: ed.shotId || null, t: ed.t ?? null,
        truoc: { pos: fmt(arr(ed.orig.p), 3), rotDeg: deg(eo), scale: fmt(arr(ed.orig.s), 3) },
        sau: { pos: fmt(arr(now.p), 3), rotDeg: deg(en), scale: fmt(arr(now.s), 3) },
        lech: { pos: fmt(arr(now.p.clone().sub(ed.orig.p)), 3), rotDeg: deg(en).map((v, i) => +(v - deg(eo)[i]).toFixed(1)), scaleNhan: fmt(arr(now.s.clone().divide(ed.orig.s)), 3) },
        theGioi: { truoc: fmt(arr(wo), 3), sau: fmt(arr(wn), 3) }, img: img ? ed.img || '' : '' });
    }
    for (const v of choApDung) if (!vat.some((x) => x.path === v.path)) vat.push(img ? v : { ...v, img: '' });
    return { ghim: ghim.map((g) => ({ so: g.so, id: g.id, text: g.text, pos: fmt(arr(g.pos), 3), vat: g.vat, shotId: g.shotId, t: g.t, cam: g.cam, img: img ? g.img || '' : '' })), vat };
  }
  return {
    apDung() {   // gọi mỗi lần vẽ 3D (sau onFrame của director): giữ vật đã sửa đúng chỗ thử
      if (choApDung.length) {
        choApDung = choApDung.filter((v) => {
          const o = findPath(v.path); if (!o) return true;
          const ed = { path: v.path, ten: v.ten, text: v.text, shotId: v.shotId, t: v.t, img: v.img, orig: { p: new THREE.Vector3(...v.truoc.pos), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(...v.truoc.rotDeg.map((d) => d * Math.PI / 180))), s: new THREE.Vector3(...v.truoc.scale) } };
          ed.now = { p: new THREE.Vector3(...v.sau.pos), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(...v.sau.rotDeg.map((d) => d * Math.PI / 180))), s: new THREE.Vector3(...v.sau.scale) };
          edits.set(o, ed); return false;
        });
      }
      for (const [o, ed] of edits) if (ed.now && !(tc.dragging && o === sel)) { o.position.copy(ed.now.p); o.quaternion.copy(ed.now.q); o.scale.copy(ed.now.s); }
    },
    traLai() {   // tắt 3D: mọi vật về như cũ (khung Phim / Xuất MP4 không dính phần thử)
      panel?.remove(); panel = null;
      for (const [o, ed] of edits) if (ed.orig) { o.position.copy(ed.orig.p); o.quaternion.copy(ed.orig.q); o.scale.copy(ed.orig.s); }
    },
    capNhatGhim, xuat, setMode, get mode() { return mode; }, get sel() { return sel; }, chon, chonTu, traVat, edits, get ghim() { return ghim; },
    themGhim(pos, text) { const s = shot(); const g = { id: Date.now().toString(36) + ghim.length, so: ghim.reduce((m, x) => Math.max(m, x.so), 0) + 1, pos: new THREE.Vector3(...pos), vat: null, text, shotId: s.id, t: s.t, cam: { pos: fmt(B.free.position.toArray()), target: fmt(B.controls.target.toArray()), fov: +B.free.fov.toFixed(1) } }; ghim.push(g); pinGeoUpdate(); g.img = chup(); changed(); return g; },
    xoaHet() { this.traLai(); edits.clear(); choApDung = []; ghim = []; for (const [k, d] of B.labels) if (k.startsWith('gh:')) { d.remove(); B.labels.delete(k); } pinGeoUpdate(); chon(null); changed(); if (isOn()) redraw(); },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    tc,
  };
}
