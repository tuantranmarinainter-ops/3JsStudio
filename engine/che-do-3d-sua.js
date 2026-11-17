// che-do-3d-sua.js — GÓP Ý TRONG KHUNG 3D (gắn vào engine/che-do-3d.js, chỉ tạo khi bật 3D lần đầu)
//   🖐 Xem   : như cũ (bay, xoay).
//   ✥ Sửa vật: bấm vào vật → chọn đúng ASSET chứa chỗ bấm (gương, giường, tường…; bấm lại trong asset đang chọn = đi sâu một bộ phận,
//              ⬆ = lên lại). Cột SỬA VẬT bên phải khung 3D: tay kéo Dời (G) / Xoay (R) / Cỡ (T), Bám lưới, ↺ Trả lại (Delete), Esc bỏ chọn,
//              số vị trí/xoay/cỡ, ghi chú. Thẻ 📦 Asset của trình phát (ganAsset) liệt kê asset của bối cảnh đang xem để chọn.
//   📍 Ghim  : bấm vào một điểm trong cảnh → ghim + mô tả.
// PHÍM (theo Blender): G dời · R xoay · S cỡ · Ctrl+Z hoàn tác · Ctrl+Y / Ctrl+Shift+Z làm lại · Ctrl+C chép · Ctrl+V dán (bản sao) ·
//   Shift+D nhân bản · X / Delete xoá · H ẩn tạm · Alt+H hiện lại · Alt+G / Alt+R / Alt+S về vị trí / góc / cỡ cũ · F nhìn vật · Esc bỏ chọn.
//   Đang chọn vật thì W A S D Q E chỉ bay khi GIỮ chuột phải (như Unreal) — engine/che-do-3d.js hỏi chanBay().
// ASSET = con của các nhóm chứa: nhóm env_*, nhóm có userData.tang (lớp vỏ / đồ gỗ / đồ trước…), nhóm bọc chỉ 1 con.
// KHÔNG ghi vào tập: dời/xoay/cỡ chỉ là THỬ khi đang xem 3D (cả khung Phim song song thấy), tắt 3D thì trả lại như cũ.
// Mọi ghim + vật đã sửa (số trước/sau, ảnh khung 3D) đi kèm file góp ý (nút Gửi tới Claude / Xuất file của trình phát) → tools/feedback.mjs.
import { TransformControls } from 'three/addons/controls/TransformControls.js';

const COL_W = 250;
const CSS = `
.c3s-mode { display: inline-flex; gap: 0; } .c3s-mode button { border-radius: 0 !important; } .c3s-mode button:first-child { border-radius: 6px 0 0 6px !important; } .c3s-mode button:last-child { border-radius: 0 6px 6px 0 !important; }
.c3d-wrap.c3s-hep { right: ${COL_W + 8}px !important; }
.c3s-col { position: absolute; top: 0; right: 0; bottom: 0; width: ${COL_W}px; z-index: 3; box-sizing: border-box; overflow: auto; background: #10141b; border: 1px solid #2a3342; border-radius: 8px;
  padding: 10px; color: #e8ecf2; font: 12px/1.45 "Be Vietnam Pro", system-ui, sans-serif; }
.c3s-col.c3s-ssflex { position: relative; flex: 0 0 ${COL_W}px; align-self: stretch; margin-left: 8px; }
.c3s-col.c3s-fx { position: fixed; z-index: 2147483002; }
.c3s-col h4 { margin: 0 0 6px; font-size: 13px; color: #f2a154; } .c3s-col .muted { color: #8b96a8; }
.c3s-col .ten { font-weight: 700; color: #f2a154; word-break: break-all; } .c3s-col .duong { color: #8b96a8; font-size: 11px; word-break: break-all; }
.c3s-col .so { font: 11px/1.55 ui-monospace, Consolas, monospace; color: #b8c2d0; white-space: pre; margin: 6px 0; overflow-x: auto; }
.c3s-col .hang { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; }
.c3s-col button, .c3s-pin button { background: #1d2430; color: #e8ecf2; border: 1px solid #2a3342; border-radius: 6px; padding: 4px 8px; cursor: pointer; font: inherit; }
.c3s-col button.on { border-color: #4da3ff; color: #4da3ff; } .c3s-col button.main, .c3s-pin button.main { background: #1f6fd1; border-color: #4da3ff; margin-top: 4px; }
.c3s-col button:disabled { opacity: .45; cursor: default; }
.c3s-col .o-so { width: 100%; border-collapse: collapse; margin: 6px 0 0; font-size: 11px; } .c3s-col .o-so th { color: #8b96a8; font-weight: 400; } .c3s-col .o-so td:first-child { color: #b8c2d0; padding-right: 4px; white-space: nowrap; }
.c3s-col .o-so input { width: 100%; box-sizing: border-box; background: #0b0d12; color: #e8ecf2; border: 1px solid #2a3342; border-radius: 4px; padding: 2px 3px; font: 11px ui-monospace, Consolas, monospace; }
.c3s-col textarea, .c3s-pin textarea { width: 100%; height: 64px; box-sizing: border-box; background: #0b0d12; color: #e8ecf2; border: 1px solid #2a3342; border-radius: 6px; font: 12px/1.4 system-ui, sans-serif; resize: vertical; }
.c3s-pin { position: absolute; z-index: 6; width: 260px; background: rgba(14,17,22,.96); border: 1px solid #ff5a5a; border-radius: 8px; padding: 8px; color: #e8ecf2; font: 12px/1.4 system-ui, sans-serif; }
.c3s-pin button { margin: 4px 4px 0 0; }
.c3d-lab div.gh { --c: #ff5a5a; pointer-events: auto; cursor: pointer; max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
.c3d-lab div.gh b { color: #ff8a8a; }
.c3s-dem { color: #ff8a8a; }
.c3a { font-size: 12px; } .c3a .dau { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; margin-bottom: 6px; }
.c3a input[type=search] { width: 100%; box-sizing: border-box; margin: 4px 0 8px; padding: 5px 8px; border-radius: 6px; border: 1px solid var(--line, #2a3342); background: var(--panel2, #0b0d12); color: inherit; font: inherit; }
.c3a .lop { margin: 8px 0 3px; font-weight: 700; color: var(--muted, #8b96a8); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
.c3a .it { display: flex; gap: 6px; align-items: center; padding: 4px 6px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
.c3a .it:hover { background: var(--panel, #1d2430); } .c3a .it.on { border-color: #f2a154; background: rgba(242,161,84,.12); }
.c3a .it .n { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .c3a .it .m { color: var(--muted, #8b96a8); font-size: 11px; }
.c3a .it .sua { color: #f2a154; } .c3a .goi { color: var(--muted, #8b96a8); line-height: 1.5; }
`;

const fmt = (a, k = 2) => a.map((v) => (Math.abs(v) < 1e-9 ? 0 : +v.toFixed(k)));
const deg = (e) => [e.x, e.y, e.z].map((r) => +(r * 180 / Math.PI).toFixed(1));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TANG_TEN = { back: 'Lớp sau (tường, sàn, cửa…)', mid: 'Lớp giữa (đồ gỗ…)', front: 'Lớp trước' };

export function ganSua(ctx) {
  const { THREE, stage, B, redraw, withView, shot, viewCanvas, isOn, getProps, getActors } = ctx;
  const { scene } = stage;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const LS = 'c3d-gop-y:' + location.pathname + ':' + (document.title || '');
  let mode = 'xem', sel = null, selAsset = null, snap = false;
  const edits = new Map();   // obj → { path, ten, orig:{p,q,s}, now, text, shotId, t, img }
  let ghim = [];             // { id, so, pos:Vector3, text, vat, shotId, t, cam, img }
  const listeners = new Set();
  const changed = () => { luu(); veAsset(); for (const f of listeners) try { f(); } catch (e) {} };
  const bao = () => { try { dispatchEvent(new CustomEvent('che3d-sua', { detail: { mode, sel: sel ? pathOf(sel) : null } })); } catch (e) {} };

  // ---- thanh công cụ: chế độ ----
  const grp = document.createElement('span'); grp.className = 'c3s-mode';
  grp.innerHTML = '<button data-m="xem" class="on" title="Chỉ xem / bay">🖐 Xem</button><button data-m="sua" title="Bấm vào vật để chọn rồi dời / xoay / đổi cỡ (chỉ thử, không ghi vào tập). Mở thẻ 📦 Asset">✥ Sửa vật</button><button data-m="ghim" title="Bấm vào một điểm trong cảnh để ghim + mô tả">📍 Ghim</button><button data-m="cam" title="Sửa camera của shot: điểm đầu / cuối, zoom, trượt, kéo dài / thu ngắn (chỉ thử)">🎥 Camera</button>';
  const dem = document.createElement('span'); dem.className = 'c3s-dem'; dem.title = 'Ghim + vật đã sửa — đi kèm file góp ý (Gửi tới Claude / Xuất file)';
  B.bar.append(grp, dem);
  grp.addEventListener('click', (e) => { const b = e.target.closest('button[data-m]'); if (b) { setMode(b.dataset.m); b.blur(); } });

  // ---- cột SỬA VẬT bên phải khung 3D ----
  const col = document.createElement('div'); col.className = 'c3s-col';
  col.innerHTML = `<h4>✥ Sửa vật</h4><div class="trong muted">Bấm vào một vật trong khung 3D, hoặc chọn trong thẻ <b>📦 Asset</b> bên phải.</div>
    <div class="co" style="display:none"><div class="ten"></div><div class="duong"></div>
    <div class="hang"><button data-t="translate" class="on" title="Dời (G)">↔ Dời</button><button data-t="rotate" title="Xoay (R)">⟳ Xoay</button><button data-t="scale" title="Cỡ (T)">⤢ Cỡ</button></div>
    <div class="hang"><label title="Dời theo bước 1 stud, xoay bước 15°, cỡ bước 0.1"><input type="checkbox" data-snap> Bám lưới</label></div>
    <div class="hang"><button data-a="len" title="Chọn lại cả asset (khi đang chọn một bộ phận)">⬆ Cả vật</button><button data-a="nhin" title="Đưa camera tới nhìn vật này">🎯 Nhìn</button><button data-a="trala" title="Trả vật về như cũ">↺ Trả lại</button><button data-a="bo" title="Bỏ chọn (Esc)">✕</button></div>
    <div class="hang"><button data-a="nhan" title="Nhân bản (Shift+D) — bản sao lệch 1 stud">⧉ Nhân bản</button><button data-a="xoa" title="Xoá vật (X / Delete)">🗑 Xoá</button><button data-a="an" title="Ẩn tạm để nhìn ra sau (H) — không ghi vào góp ý; Alt+H hiện lại">🙈 Ẩn</button></div>
    <table class="o-so"><tr><th></th><th>x</th><th>y</th><th>z</th></tr>
      <tr data-r="p"><td title="Vị trí cục bộ (trong nhóm cha)">Vị trí</td><td><input type="number" step="0.1"></td><td><input type="number" step="0.1"></td><td><input type="number" step="0.1"></td></tr>
      <tr data-r="r"><td title="Góc xoay (độ)">Xoay°</td><td><input type="number" step="5"></td><td><input type="number" step="5"></td><td><input type="number" step="5"></td></tr>
      <tr data-r="s"><td>Cỡ</td><td><input type="number" step="0.05"></td><td><input type="number" step="0.05"></td><td><input type="number" step="0.05"></td></tr>
      <tr data-r="w"><td title="Vị trí trong thế giới">Thế giới</td><td><input type="number" step="0.1"></td><td><input type="number" step="0.1"></td><td><input type="number" step="0.1"></td></tr></table>
    <div class="so"></div>
    <textarea placeholder="Ghi chú cho vật này (vd: dời sát tường, to quá…)"></textarea>
    <button class="main" data-a="luu">Lưu ghi chú</button>
    <div class="muted" style="margin-top:8px">Bấm lại vào vật đang chọn = chọn một bộ phận của nó. Chỉ là thử: tắt 3D thì vật về chỗ cũ; số + ghi chú đi kèm file góp ý.</div></div>
    <div class="hang" style="margin-top:8px"><button data-a="undo" title="Hoàn tác (Ctrl+Z)" disabled>↶ Hoàn tác</button><button data-a="redo" title="Làm lại (Ctrl+Y)" disabled>↷ Làm lại</button></div>
    <button class="main" data-a="chep" title="Chép mọi điều chỉnh (ghi chú, vật, ghim, camera) thành chữ — dán thẳng cho Claude, không cần xuất file">📋 Copy điều chỉnh</button>
    <div class="phim muted" style="font-size:11px;line-height:1.6"><b>Phím (như Blender)</b><br>G dời · R xoay · S cỡ<br>Ctrl+Z hoàn tác · Ctrl+Y làm lại<br>Ctrl+C chép · Ctrl+V dán · Shift+D nhân bản<br>X / Delete xoá · H ẩn · Alt+H hiện lại<br>Alt+G / Alt+R / Alt+S về vị trí / góc / cỡ cũ<br>F nhìn vật · Esc bỏ chọn<br>Bay khi đang chọn: <b>giữ chuột phải</b> + WASD</div>`;
  col.addEventListener('pointerdown', (e) => e.stopPropagation());
  const $c = (s) => col.querySelector(s);
  function hienCot(on) {
    if (on) {
      const ssm = B.el.classList.contains('c3d-ss'), fx = B.el.classList.contains('c3d-fixed');
      col.classList.toggle('c3s-ssflex', ssm); col.classList.toggle('c3s-fx', fx);
      if (ssm) B.el.after(col); else { B.el.classList.add('c3s-hep'); (B.el.parentNode || document.body).appendChild(col); }
    } else { col.remove(); B.el.classList.remove('c3s-hep'); }
  }
  col.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; b.blur();
    if (b.dataset.t) return setTool(b.dataset.t);
    const a = b.dataset.a;
    if (a === 'len' && selAsset) chon(selAsset);
    else if (a === 'nhin' && sel) nhin(sel);
    else if (a === 'trala') traVat(sel);
    else if (a === 'bo') chon(null);
    else if (a === 'nhan' && sel) nhanBan(sel, true);
    else if (a === 'xoa' && sel) xoaVat(sel);
    else if (a === 'an' && sel) anVat(sel);
    else if (a === 'undo') hoanTac();
    else if (a === 'redo') lamLai();
    else if (a === 'chep') ctx.chep?.(b);
    else if (a === 'luu' && sel) {
      const ed = ghiSua(sel); ed.text = $c('textarea').value.trim(); ed.img = chup(); ed.shotId = shot().id; ed.t = shot().t; changed();
      b.textContent = 'Đã lưu ✓'; setTimeout(() => { b.textContent = 'Lưu ghi chú'; }, 1200);
    }
  });
  col.addEventListener('change', (e) => { if (e.target.dataset.snap !== undefined) { snap = e.target.checked; applySnap(); e.target.blur(); } });
  col.addEventListener('keydown', (e) => { if (/TEXTAREA|INPUT/.test(e.target.tagName) && e.target.type !== 'checkbox') { e.stopPropagation(); if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); } });
  // gõ số vị trí / xoay / cỡ / thế giới → đổi vật (có Ctrl+Z, đúng cả vật có animation vì lưu phần lệch)
  col.addEventListener('change', (e) => {
    const tr = e.target.closest('.o-so tr[data-r]'); if (!tr || !sel) return;
    const v = [...tr.querySelectorAll('input')].map((x) => +x.value); if (v.some((x) => !Number.isFinite(x))) return showInfo();
    const ed = moiSua(sel), a = cloneT(ed.d), r = tr.dataset.r;
    if (r === 'p') sel.position.set(...v);
    else if (r === 'r') sel.quaternion.setFromEuler(new THREE.Euler(...v.map((d) => d * Math.PI / 180)));
    else if (r === 's') sel.scale.set(...v.map((x) => (Math.abs(x) < 1e-4 ? 1e-4 : x)));
    else if (r === 'w') { sel.parent.updateMatrixWorld(true); sel.position.copy(sel.parent.worldToLocal(new THREE.Vector3(...v))); }
    sel.updateMatrixWorld(true);
    const b = cloneT(dongBo(sel).d);
    if (!giong(a, b)) { ghiLich({ k: 'tf', o: sel, a, b }); ed.shotId = shot().id; ed.t = shot().t; }
    showInfo(); changed(); if (isOn()) redraw();
  });

  // ---- tay kéo ----
  const tc = new TransformControls(B.free, B.el);
  tc.setSize(0.9);
  const gizmo = tc.getHelper(); gizmo.name = 'che3d_taykeo'; B.helpers.add(gizmo);
  tc.addEventListener('dragging-changed', (e) => { B.controls.enabled = !e.value; });
  tc.addEventListener('change', () => { if (isOn()) redraw(); });
  let keoA = null;
  tc.addEventListener('mouseDown', () => { if (!sel) return; keoA = cloneT(moiSua(sel).d); });
  tc.addEventListener('objectChange', () => { if (sel) { ghiSua(sel); showInfo(); } });
  tc.addEventListener('mouseUp', () => {
    if (!sel || !edits.has(sel)) return;
    const e = dongBo(sel), b = cloneT(e.d);
    if (keoA && !giong(keoA, b)) ghiLich({ k: 'tf', o: sel, a: keoA, b }); keoA = null;
    e.img = chup(); e.shotId = shot().id; e.t = shot().t; changed();
  });
  function setTool(t) { tc.setMode(t); for (const b of col.querySelectorAll('button[data-t]')) b.classList.toggle('on', b.dataset.t === t); }
  function applySnap() { tc.setTranslationSnap(snap ? 1 : null); tc.setRotationSnap(snap ? THREE.MathUtils.degToRad(15) : null); tc.setScaleSnap(snap ? 0.1 : null); }

  function setMode(m) {
    mode = m;
    for (const b of grp.querySelectorAll('button')) b.classList.toggle('on', b.dataset.m === m);
    if (m !== 'sua') chon(null);
    hienCot(m === 'sua' && isOn());
    ctx.camMode?.(m === 'cam');
    B.el.style.cursor = m === 'xem' || m === 'cam' ? '' : 'crosshair';
    veAsset(); bao();
  }

  // ---- ASSET của bối cảnh đang xem ----
  const isSky = (o) => /^(sky|stormsky)$/.test(o.name) || o.name?.startsWith('skybox_');
  const meshCount = (o) => { let n = 0; o.traverse((x) => { if (x.isMesh || x.isSkinnedMesh || x.isInstancedMesh) n++; }); return n; };
  // nhóm CHỨA (đi xuyên qua): env, lớp tầng (userData.tang), nhóm chứa lớp tầng, nhóm duy nhất của env (vd e3_phong_room)
  const laChua = (o, env) => o === env || !!o.userData?.tang || o.children.some((c) => c.userData?.tang)
    || (o.parent === env && o.isGroup && o.children.length > 3 && env.children.filter((c) => c.isGroup).length === 1);
  function curEnv() { return withView(() => scene.children.find((o) => o.name?.startsWith('env_') && o.isGroup && o.visible)) || null; }
  let assetCache = { env: null, list: [], set: new Set() };
  function assets() {
    const env = curEnv();
    const sid = shot().id;   // đạo cụ / nhân vật hiện theo shot → làm lại danh sách khi đổi shot
    if (assetCache.env === env && assetCache.sid === sid && assetCache.list.length) return assetCache;
    const list = [], set = new Set();
    const visit = (o, lop) => {
      for (const c of o.children) {
        if (c.isLight || isSky(c) || c.name?.startsWith('che3d_')) continue;
        const l2 = c.userData?.tang ? (TANG_TEN[c.userData.tang] || c.userData.tang) : lop;
        if (laChua(c, env)) { visit(c, l2); continue; }
        const n = meshCount(c); if (!n) continue;
        list.push({ obj: c, ten: tenOf(c), lop: l2 || 'Bối cảnh', n }); set.add(c);
      }
    };
    if (env) visit(env, '');
    for (const [ten, p] of Object.entries(getProps?.() || {})) {   // đạo cụ của tập (ngoài bối cảnh) đang hiện
      if (!p?.isObject3D || set.has(p)) continue;
      let vis = true; for (let x = p; x; x = x.parent) if (!x.visible) { vis = false; break; }
      if (vis && meshCount(p)) { list.push({ obj: p, ten, lop: 'Đạo cụ của tập', n: meshCount(p) }); set.add(p); }
    }
    for (const [ten, a] of Object.entries(getActors?.() || {})) {   // nhân vật (đồ cầm tay nằm trong nhân vật: bấm lại = đi sâu từng bộ phận)
      const r = a?.root?.isObject3D ? a.root : a?.isObject3D ? a : null;
      if (!r || set.has(r)) continue;
      let vis = true; for (let x = r; x; x = x.parent) if (!x.visible) { vis = false; break; }
      if (vis && meshCount(r)) { list.push({ obj: r, ten, lop: 'Nhân vật', n: meshCount(r) }); set.add(r); }
    }
    assetCache = { env, sid, list, set };
    return assetCache;
  }
  const tenOf = (o) => { if (o.name) return o.name; let n = ''; o.traverse((x) => { if (!n && x.name) n = x.name; }); return n || '(không tên)'; };
  const assetOf = (o) => { const S = assets().set; for (let x = o; x && x !== scene; x = x.parent) if (S.has(x)) return x; return null; };

  // ---- chọn vật / ghim bằng cú bấm (không kéo) ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  B.el.addEventListener('pointerdown', (e) => { if (e.button === 0) down = [e.clientX, e.clientY]; }, true);
  B.el.addEventListener('pointerup', (e) => {
    if (e.button !== 0 || !down || mode === 'xem' || tc.dragging) return;
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null;
    if (moved > 4 || e.target.closest('.c3s-pin,.c3d-bar,.gh')) return;
    const hit = pick(e); if (mode === 'sua') { if (hit?.object) chonTu(hit.object); } else if (mode === 'ghim') moGhim(hit, e);
  });
  function pick(e) {
    const r = B.el.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, B.free);
    return withView(() => {
      const hits = ray.intersectObjects(scene.children, true);
      for (const h of hits) {
        let ok = true; for (let x = h.object; x; x = x.parent) { if (!x.visible || isSky(x) || x.name?.startsWith('che3d_')) { ok = false; break; } }
        if (ok && (h.object.isMesh || h.object.isSkinnedMesh || h.object.isInstancedMesh)) return h;
      }
      const p = new THREE.Vector3(); return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? { point: p, object: null } : null;
    });
  }
  // bấm → asset chứa chỗ bấm; bấm lại trong asset đang chọn → đi sâu một tầng về phía mesh trúng
  function chonTu(mesh) {
    const A = assetOf(mesh);
    if (!A) { let x = mesh; while (x.parent && x.parent !== scene && !x.parent.name?.startsWith('env_')) x = x.parent; return chon(x); }   // (sau nhánh đi sâu ở trên)
    const trong = (o, m) => { for (let x = m; x; x = x.parent) if (x === o) return true; return false; };
    if (sel && sel !== mesh && (sel === A || A === selAsset || trong(sel, mesh))) {
      const chain = []; for (let x = mesh; x && x !== sel; x = x.parent) chain.unshift(x);
      if (chain.length && chain[0].parent === sel) return chon(chain[0], A);
    }
    chon(A, A);
  }
  function chon(o, asset) {
    sel = o || null; selAsset = sel ? (asset || assetOf(sel) || sel) : null;
    if (sel) tc.attach(sel); else tc.detach();
    $c('.trong').style.display = sel ? 'none' : ''; $c('.co').style.display = sel ? '' : 'none';
    if (sel) { $c('textarea').value = edits.get(sel)?.text || ''; showInfo(); }
    veAsset(); bao();
    if (isOn()) redraw();
  }
  function nhin(o) {
    ctx.stopBam?.();   // 🎯 Nhìn / F: camera bay tới vật → thôi bám camera shot
    const box = new THREE.Box3().setFromObject(o); if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3()), r = Math.max(1.5, box.getSize(new THREE.Vector3()).length() * 0.9);
    const dir = B.free.position.clone().sub(B.controls.target); if (dir.lengthSq() < 1e-6) dir.set(0, 0.5, 1);
    B.controls.target.copy(c); B.free.position.copy(c).add(dir.normalize().multiplyScalar(r)); B.controls.update(); redraw();
  }
  const pathOf = (o) => { const a = []; for (let x = o; x && x !== scene; x = x.parent) a.unshift(x.name || `#${x.parent ? x.parent.children.indexOf(x) : 0}`); return a.join('/'); };
  const tf = (o) => ({ p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() });
  // SỬA = PHẦN LỆCH so với tư thế gốc của khung (d): vị trí cộng thêm, góc nhân thêm (cục bộ), cỡ nhân thêm.
  // Vật có animation (diễn viên, đạo cụ director đặt mỗi khung): mỗi lần vẽ lấy tư thế director vừa đặt làm gốc (base) rồi áp d
  // → vẫn chạy theo các shot trước / sau, chỉ lệch thêm đúng phần đã sửa. Vật tĩnh: base = lúc chưa sửa.
  const cloneT = (t) => ({ p: t.p.clone(), q: t.q.clone(), s: t.s.clone() });
  const ID = () => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1) });
  const lechOf = (a, b) => ({ p: b.p.clone().sub(a.p), q: a.q.clone().invert().multiply(b.q), s: b.s.clone().divide(new THREE.Vector3(a.s.x || 1, a.s.y || 1, a.s.z || 1)) });
  const hop = (b, d) => ({ p: b.p.clone().add(d.p), q: b.q.clone().multiply(d.q), s: b.s.clone().multiply(d.s) });
  const datO = (o, t) => { o.position.copy(t.p); o.quaternion.copy(t.q); o.scale.copy(t.s); o.updateMatrixWorld(true); };
  function moiSua(o) {
    let ed = edits.get(o);
    if (!ed) { const t = tf(o); ed = { path: pathOf(o), ten: tenOf(o), orig: t, base: cloneT(t), last: cloneT(t), d: ID(), now: cloneT(t), text: '' }; edits.set(o, ed); }
    if (!ed.base) ed.base = cloneT(ed.orig || tf(o));
    if (!ed.d) ed.d = ID();
    return ed;
  }
  function dongBo(o) { const ed = moiSua(o); ed.now = tf(o); ed.d = lechOf(ed.base, ed.now); ed.last = cloneT(ed.now); return ed; }   // sau khi người dùng đổi vật
  function ghiSua(o) { return dongBo(o); }
  function traVat(o) {
    const ed = o && edits.get(o); if (!ed || ed.banSao) return;
    moiSua(o); const a = cloneT(ed.d);
    datO(o, ed.base); dongBo(o);
    if (!giong(a, ed.d)) ghiLich({ k: 'tf', o, a, b: cloneT(ed.d) });
    if (ed.xoa) { ed.xoa = false; o.visible = ed.vis0 ?? true; }
    if (o === sel) showInfo(); changed(); if (isOn()) redraw();
  }

  // ---- LỊCH SỬ (Ctrl+Z / Ctrl+Y): tf = đổi vị trí/góc/cỡ, xoa, them (bản sao), an, hien, ghim+ / ghim- ----
  const giong = (a, b) => a.p.distanceToSquared(b.p) < 1e-12 && Math.abs(a.q.dot(b.q)) > 1 - 1e-12 && a.s.distanceToSquared(b.s) < 1e-12;
  const lich = [], lai = [];
  function ghiLich(x) { lich.push(x); if (lich.length > 200) lich.shift(); lai.length = 0; nutLich(); }
  function nutLich() { const u = $c('button[data-a=undo]'), r = $c('button[data-a=redo]'); if (u) u.disabled = !lich.length; if (r) r.disabled = !lai.length; }
  function datTf(o, d) { const ed = moiSua(o); datO(o, hop(ed.base, d)); dongBo(o); }   // lịch sử tf lưu PHẦN LỆCH d (đúng cả với vật có animation)
  function chay(x, nguoc) {
    if (x.k === 'tf') datTf(x.o, nguoc ? x.a : x.b);
    else if (x.k === 'xoa') { const ed = edits.get(x.o); if (ed) { ed.xoa = nguoc ? !x.v : x.v; x.o.visible = ed.xoa ? false : (ed.vis0 ?? true); } if (ed?.xoa && sel === x.o) chon(null); }
    else if (x.k === 'them') { const ed = edits.get(x.o); if (ed) ed.bo = nguoc; if (nguoc) { if (sel === x.o) chon(null); x.o.removeFromParent(); } else x.par.add(x.o); assetCache.list = []; }
    else if (x.k === 'an') { if (nguoc) { x.o.visible = x.vis; anTam.delete(x.o); } else { anTam.set(x.o, x.vis); x.o.visible = false; if (sel === x.o) chon(null); } }
    else if (x.k === 'hien') { for (const [o, v] of x.ds) { if (nguoc) { anTam.set(o, v); o.visible = false; } else { o.visible = v; anTam.delete(o); } } }
    else if (x.k === 'ghim+' || x.k === 'ghim-') { const add = (x.k === 'ghim+') !== nguoc; ghim = ghim.filter((g) => g !== x.g); if (add) ghim.push(x.g); else { B.labels.get('gh:' + x.g.id)?.remove(); B.labels.delete('gh:' + x.g.id); } pinGeoUpdate(); }
    if (sel) showInfo(); changed(); if (isOn()) redraw();
  }
  function hoanTac() { const x = lich.pop(); if (!x) return; chay(x, true); lai.push(x); nutLich(); }
  function lamLai() { const x = lai.pop(); if (!x) return; chay(x, false); lich.push(x); nutLich(); }

  // ---- chép / dán / nhân bản / xoá / ẩn ----
  let clip = null, soBan = 0;
  const anTam = new Map();   // vật ẩn tạm (H) → visible cũ; không ghi vào góp ý
  function nhanBan(src, lech) {
    const par = src.parent; if (!par) return null;
    const o = src.clone(true); soBan++;
    o.name = `${src.name || 'vat'}_ban_sao${soBan}`;
    par.add(o);
    if (lech) o.position.x += 1;   // lệch 1 stud cho thấy rõ bản sao
    o.updateMatrixWorld(true);
    edits.set(o, { path: pathOf(o), ten: o.name, orig: tf(o), base: tf(o), last: tf(o), d: ID(), now: tf(o), banSao: pathOf(src), text: '', shotId: shot().id, t: shot().t });
    assetCache.list = [];
    ghiLich({ k: 'them', o, par });
    chon(o, o); edits.get(o).img = chup(); changed();
    return o;
  }
  function xoaVat(o) {
    const ed = ghiSua(o); if (ed.xoa) return;
    if (ed.vis0 === undefined) ed.vis0 = o.visible;
    ed.xoa = true; o.visible = false; ed.shotId = shot().id; ed.t = shot().t;
    ghiLich({ k: 'xoa', o, v: true }); chon(null); changed(); if (isOn()) redraw();
  }
  function anVat(o) { ghiLich({ k: 'an', o, vis: o.visible }); anTam.set(o, o.visible); o.visible = false; chon(null); if (isOn()) redraw(); }
  function hienHet() { if (!anTam.size) return; const ds = [...anTam]; for (const [o, v] of ds) o.visible = v; anTam.clear(); ghiLich({ k: 'hien', ds }); if (isOn()) redraw(); }
  function veCu(o, phan) {   // Alt+G / Alt+R / Alt+S: về vị trí / góc / cỡ lúc chưa sửa
    const ed = edits.get(o); if (!ed?.orig) return;
    moiSua(o); const a = cloneT(ed.d);
    if (phan === 'p') o.position.copy(ed.base.p); else if (phan === 'q') o.quaternion.copy(ed.base.q); else o.scale.copy(ed.base.s);
    dongBo(o); const b = cloneT(ed.d); if (giong(a, b)) return;
    ghiLich({ k: 'tf', o, a, b }); showInfo(); changed(); if (isOn()) redraw();
  }
  function showInfo() {
    if (!sel) return;
    const ed = edits.get(sel), w = new THREE.Vector3(); sel.getWorldPosition(w);
    const e = new THREE.Euler().setFromQuaternion(sel.quaternion);
    $c('.ten').textContent = tenOf(sel) + (sel !== selAsset ? '  (bộ phận)' : '');
    $c('.duong').textContent = pathOf(sel);
    $c('button[data-a=len]').disabled = sel === selAsset;
    const ae = document.activeElement, dien = (r, a) => { const ip = col.querySelectorAll(`.o-so tr[data-r=${r}] input`); a.forEach((x, i) => { if (ip[i] && ip[i] !== ae) ip[i].value = x; }); };
    dien('p', fmt(sel.position.toArray())); dien('r', deg(e)); dien('s', fmt(sel.scale.toArray(), 3)); dien('w', fmt(w.toArray()));
    let s = '';
    if (ed?.d) { const de = new THREE.Euler().setFromQuaternion(ed.d.q); s = `đã dời   ${fmt(ed.d.p.toArray()).join(', ')}\nđã xoay° ${deg(de).join(', ')}\ncỡ ×     ${fmt(ed.d.s.toArray(), 3).join(', ')}`; if (ed.hoatHinh) s += '\n(vật có animation: lệch thêm, vẫn chạy theo shot)'; }
    $c('.so').textContent = s;
  }

  // ---- thẻ 📦 Asset (trình phát gắn vào khung của nó) ----
  let aEl = null, aLoc = '';
  function ganAsset(el) { aEl = el; veAsset(); }
  function veAsset() {
    if (!aEl) return;
    if (!isOn()) { aEl.innerHTML = '<div class="c3a"><div class="goi">Bật <b>🧊 3D</b> hoặc <b>◧ Song song</b>, rồi bấm <b>✥ Sửa vật</b> để xem và chọn asset của bối cảnh.</div></div>'; return; }
    const { env, list } = assets(), q = aLoc.trim().toLowerCase();
    const groups = new Map(); for (const a of list) { if (q && !a.ten.toLowerCase().includes(q)) continue; if (!groups.has(a.lop)) groups.set(a.lop, []); groups.get(a.lop).push(a); }
    const keepFocus = document.activeElement?.dataset?.aloc !== undefined;
    aEl.innerHTML = `<div class="c3a"><div class="dau"><b>${env ? esc(env.name.slice(4)) : 'Không có bối cảnh'}</b><span class="muted">${list.length} asset · ✥${edits.size}</span></div>`
      + `<input type="search" data-aloc placeholder="Lọc theo tên…" value="${esc(aLoc)}">`
      + (mode !== 'sua' ? '<div class="goi" style="margin-bottom:6px">Bấm <b>✥ Sửa vật</b> trên khung 3D để kéo / xoay / đổi cỡ. Chọn ở đây cũng tự bật.</div>' : '')
      + [...groups].map(([lop, arr]) => `<div class="lop">${esc(lop)} · ${arr.length}</div>` + arr.map((a) => {
        const i = list.indexOf(a), on = a.obj === selAsset, da = edits.has(a.obj) || [...edits.keys()].some((o) => assetOf(o) === a.obj);
        const ed = edits.get(a.obj), dau = ed?.xoa ? '<span class="sua" title="đã xoá thử">🗑</span>' : ed?.banSao ? '<span class="sua" title="bản sao (thử)">⧉</span>' : da ? '<span class="sua" title="đã sửa thử">✥</span>' : '';
        return `<div class="it${on ? ' on' : ''}" data-ai="${i}" title="${esc(pathOf(a.obj))}"${ed?.xoa ? ' style="opacity:.5;text-decoration:line-through"' : ''}><span class="n">${esc(a.ten)}</span>${dau}<span class="m">${a.n}</span></div>`;
      }).join('')).join('') + (list.length ? '' : '<div class="goi">Bối cảnh này chưa có asset nào chọn được.</div>') + '</div>';
    if (keepFocus) { const i = aEl.querySelector('[data-aloc]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    aEl.querySelector('.it.on')?.scrollIntoView({ block: 'nearest' });
  }
  document.addEventListener('input', (e) => { if (aEl && e.target.dataset?.aloc !== undefined && aEl.contains(e.target)) { aLoc = e.target.value; veAsset(); } });
  document.addEventListener('click', (e) => {
    if (!aEl || !aEl.contains(e.target)) return;
    const it = e.target.closest('[data-ai]'); if (!it) return;
    const a = assets().list[+it.dataset.ai]; if (!a) return;
    if (mode !== 'sua') setMode('sua');
    chon(a.obj, a.obj); nhin(a.obj);
  });

  // ---- ghim ----
  const pins = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xff4d4d, size: 12, sizeAttenuation: false, depthTest: false, transparent: true }));
  pins.name = 'che3d_ghim'; pins.renderOrder = 12; B.helpers.add(pins);
  const pinGeoUpdate = () => { pins.geometry.dispose(); pins.geometry = new THREE.BufferGeometry().setFromPoints(ghim.map((g) => g.pos)); };
  const camNow = () => ({ pos: fmt(B.free.position.toArray()), target: fmt(B.controls.target.toArray()), fov: +B.free.fov.toFixed(1) });
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
    ta.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Escape') { panel.remove(); panel = null; } if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) panel.querySelector('[data-p=luu]').click(); });
    panel.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-p]'); if (!b) return;
      if (b.dataset.p === 'luu') {
        const text = ta.value.trim();
        if (edit) edit.text = text;
        else { const s = shot(); ghim.push({ id: Date.now().toString(36), so: ghim.reduce((m, x) => Math.max(m, x.so), 0) + 1, pos: g.pos, vat: g.vat, text, shotId: s.id, t: s.t, cam: camNow() }); ghiLich({ k: 'ghim+', g: ghim[ghim.length - 1] }); }
        pinGeoUpdate();
        const it = edit || ghim[ghim.length - 1]; it.img = chup(); changed();
      } else if (b.dataset.p === 'xoa') { ghiLich({ k: 'ghim-', g: edit }); ghim = ghim.filter((x) => x !== edit); B.labels.get('gh:' + edit.id)?.remove(); B.labels.delete('gh:' + edit.id); pinGeoUpdate(); changed(); if (isOn()) redraw(); }
      panel.remove(); panel = null;
    });
    B.el.appendChild(panel); ta.focus();
  }
  const _v = new THREE.Vector3();
  function capNhatGhim() {   // gọi sau updateLabels của che-do-3d
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
    if (assetCache.env && assetCache.env !== curEnv()) veAsset();   // đổi shot sang bối cảnh khác → danh sách asset đổi theo
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

  // ---- phím (Blender) ----
  addEventListener('keydown', (e) => {
    if (!isOn() || (e.repeat && !/^Key[ZY]$/.test(e.code))) return;
    if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '') && e.target.type !== 'checkbox') return;   // đang gõ: Ctrl+Z… của ô chữ
    const ctrl = e.ctrlKey || e.metaKey, stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (mode === 'cam') { if (ctx.camKey?.(e)) stop(); return; }   // 🎥 Camera: Ctrl+Z / Ctrl+Y của camera (engine/che-do-3d-cam.js)
    if (ctrl && e.code === 'KeyZ') { stop(); return e.shiftKey ? lamLai() : hoanTac(); }   // hoàn tác / làm lại: mọi chế độ (cả ghim)
    if (ctrl && e.code === 'KeyY') { stop(); return lamLai(); }
    if (mode !== 'sua') return;
    if (e.altKey && e.code === 'KeyH') { stop(); return hienHet(); }
    if (ctrl && e.code === 'KeyV' && clip) { stop(); if (clip.parent) nhanBan(clip, true); return; }
    if (!sel) return;
    if (ctrl && e.code === 'KeyC') { stop(); clip = sel; flash('Đã chép ' + tenOf(sel) + ' — Ctrl+V để dán'); return; }
    if (ctrl) return;
    if (e.altKey) { const ph = { KeyG: 'p', KeyR: 'q', KeyS: 's' }[e.code]; if (ph) { stop(); veCu(sel, ph); } return; }
    if (e.shiftKey && e.code === 'KeyD') { stop(); nhanBan(sel, false); setTool('translate'); return; }
    const m = { KeyG: 'translate', KeyR: 'rotate', KeyS: 'scale', KeyT: 'scale' }[e.code];
    if (m) { stop(); setTool(m); }
    else if (e.code === 'KeyX' || e.key === 'Delete') { stop(); xoaVat(sel); }
    else if (e.code === 'KeyH') { stop(); anVat(sel); }
    else if (e.code === 'KeyF' || e.code === 'NumpadDecimal') { stop(); nhin(sel); }
    else if (e.key === 'Escape') { stop(); chon(null); }
  }, true);
  function flash(t) { const d = $c('.duong'); if (!d) return; d.textContent = t; d.style.color = '#4da3ff'; setTimeout(() => { d.textContent = sel ? pathOf(sel) : ''; d.style.color = ''; }, 1400); }

  // ---- lưu tạm trong trình duyệt (tải lại trang vẫn còn) ----
  function luu() {
    try { localStorage.setItem(LS, JSON.stringify(xuat(true))); } catch (e) { try { localStorage.setItem(LS, JSON.stringify(xuat(false))); } catch (e2) {} }
  }
  let sidVe = null;
  let choApDung = [];   // vật sửa từ lần mở trước: tìm lại theo đường dẫn khi cảnh đã có
  try {
    const d = JSON.parse(localStorage.getItem(LS) || 'null');
    if (d) { ghim = (d.ghim || []).map((g) => ({ ...g, pos: new THREE.Vector3(...g.pos) })); choApDung = d.vat || []; pinGeoUpdate(); }
  } catch (e) {}
  const findPath = (p) => { let o = scene; for (const n of p.split('/')) { o = n.startsWith('#') ? o?.children[+n.slice(1)] : o?.children.find((c) => c.name === n); if (!o) return null; } return o; };
  const fromRec = (r) => ({ p: new THREE.Vector3(...r.pos), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(...r.rotDeg.map((d) => d * Math.PI / 180))), s: new THREE.Vector3(...r.scale) });

  // ---- dữ liệu góp ý ----
  const arr = (v) => v.toArray();
  function xuat(img = true) {
    const vat = [];
    for (const [o, ed] of edits) {
      if (!ed.orig || ed.bo) continue;
      if (!ed.now && !ed.xoa) continue;
      const now = ed.d ? hop(ed.orig, ed.d) : ed.now || ed.orig;   // "sau" = tư thế lúc sửa + phần lệch (không trôi theo khung đang xem)
      if (!ed.xoa && !ed.banSao && !ed.text && giong(ed.orig, now)) continue;   // đã trả lại / chưa đổi gì
      const eo = new THREE.Euler().setFromQuaternion(ed.orig.q), en = new THREE.Euler().setFromQuaternion(now.q);
      const wo = new THREE.Vector3(), wn = new THREE.Vector3(), keep = tf(o);
      o.position.copy(now.p); o.quaternion.copy(now.q); o.scale.copy(now.s); o.updateMatrixWorld(true); o.getWorldPosition(wn);
      o.position.copy(ed.orig.p); o.updateMatrixWorld(true); o.getWorldPosition(wo);
      o.position.copy(keep.p); o.quaternion.copy(keep.q); o.scale.copy(keep.s); o.updateMatrixWorld(true);
      const A = assetOf(o);
      vat.push({ hoatHinh: !!ed.hoatHinh, loai: ed.banSao ? 'banSao' : ed.xoa ? 'xoa' : 'sua', nguon: ed.banSao || null, path: ed.path, ten: ed.ten, asset: A && A !== o ? pathOf(A) : null, text: ed.text || '', shotId: ed.shotId || null, t: ed.t ?? null,
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
          let o = findPath(v.path);
          if (!o && v.loai === 'banSao') {   // bản sao từ lần mở trước: nhân lại từ vật nguồn
            const src = findPath(v.nguon || ''); if (!src?.parent) return true;
            o = src.clone(true); o.name = v.path.split('/').pop(); src.parent.add(o); assetCache.list = [];
          }
          if (!o) return true;
          edits.set(o, { path: v.path, ten: v.ten, text: v.text, shotId: v.shotId, t: v.t, img: v.img, orig: fromRec(v.truoc), now: fromRec(v.sau), d: lechOf(fromRec(v.truoc), fromRec(v.sau)), last: null, banSao: v.loai === 'banSao' ? v.nguon : undefined, xoa: v.loai === 'xoa', vis0: true });
          return false;
        });
      }
      for (const [o, ed] of edits) {
        if (ed.bo) continue;
        if (ed.banSao && !o.parent && ed.par) ed.par.add(o);
        if (!ed.d && ed.orig && ed.now) ed.d = lechOf(ed.orig, ed.now);
        if (ed.d && !(tc.dragging && o === sel)) {
          const cur = tf(o), L = ed.last;
          if (!ed.base) ed.base = cloneT(cur);
          if (!L) ed.base = cloneT(cur);   // khôi phục từ lần mở trước: gốc = tư thế hiện tại
          else {   // thành phần nào director vừa đặt lại (khác lần áp trước) → lấy làm gốc mới
            if (cur.p.distanceToSquared(L.p) > 1e-10) { ed.base.p.copy(cur.p); ed.hoatHinh = true; }
            if (Math.abs(cur.q.dot(L.q)) < 1 - 1e-10) { ed.base.q.copy(cur.q); ed.hoatHinh = true; }
            if (cur.s.distanceToSquared(L.s) > 1e-10) { ed.base.s.copy(cur.s); ed.hoatHinh = true; }
          }
          const n = hop(ed.base, ed.d); datO(o, n); ed.last = cloneT(n); ed.now = cloneT(n);
        }
        if (ed.xoa) o.visible = false;
      }
      for (const o of anTam.keys()) o.visible = false;
      const sid = shot().id; if (sid !== sidVe) { sidVe = sid; setTimeout(veAsset, 0); }   // đổi shot → danh sách asset (nhân vật / đạo cụ hiện) làm lại
      if (sel && mode === 'sua') showInfo();
    },
    traLai() {   // tắt 3D: mọi vật về như cũ (khung Phim / Xuất MP4 không dính phần thử); cột sửa vật đóng
      panel?.remove(); panel = null;
      for (const [o, ed] of edits) {
        if (ed.banSao) { if (o.parent) { ed.par = o.parent; o.removeFromParent(); } continue; }   // bản sao rời cảnh; bật 3D lại thì thêm lại
        if (ed.base || ed.orig) datO(o, ed.base || ed.orig);   // vật có animation: về tư thế director của khung này
        if (ed.xoa) o.visible = ed.vis0 ?? true;
      }
      for (const [o, v] of anTam) o.visible = v;
      hienCot(false); veAsset();
    },
    batLai() { hienCot(mode === 'sua'); veAsset(); },   // bật 3D lại: cột sửa vật mở lại nếu đang ở ✥ Sửa vật
    capNhatGhim, xuat, setMode, get mode() { return mode; }, get sel() { return sel; }, get selAsset() { return selAsset; },
    chon, chonTu, traVat, nhin, assets: () => assets().list.map((a) => ({ ten: a.ten, lop: a.lop, n: a.n, path: pathOf(a.obj) })), assetObj: (i) => assets().list[i]?.obj, ganAsset, veAsset,
    edits, get ghim() { return ghim; },
    themGhim(pos, text) { const s = shot(); const g = { id: Date.now().toString(36) + ghim.length, so: ghim.reduce((m, x) => Math.max(m, x.so), 0) + 1, pos: new THREE.Vector3(...pos), vat: null, text, shotId: s.id, t: s.t, cam: camNow() }; ghim.push(g); pinGeoUpdate(); g.img = chup(); changed(); return g; },
    xoaHet() { this.traLai(); anTam.clear(); lich.length = 0; lai.length = 0; nutLich(); for (const [o, ed] of edits) if (ed.banSao) o.removeFromParent(); assetCache.list = []; edits.clear(); choApDung = []; ghim = []; for (const [k, d] of B.labels) if (k.startsWith('gh:')) { d.remove(); B.labels.delete(k); } pinGeoUpdate(); chon(null); changed(); if (isOn()) redraw(); },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    tc, hoanTac, lamLai, chup, nhanBan, xoaVat, anVat, hienHet, veCu,
    chanBay: () => isOn() && mode === 'sua' && !!sel,
    get lich() { return lich.length; }, get lai() { return lai.length; },
  };
}
