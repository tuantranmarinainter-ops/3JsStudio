// che-do-3d-cam.js — 🎥 SỬA CAMERA trong khung 3D (gắn vào engine/che-do-3d.js qua ganCam; nút 🎥 Camera ở nhóm 🖐 Xem / ✥ Sửa vật / 📍 Ghim)
// Mỗi shot MỘT chuyển động camera: ĐIỂM ĐẦU (p, l, fov) → ĐIỂM CUỐI (p2, l2, fov2), kiểu chạy (ease), và đoạn chạy trong shot (win = [a, b]
// tính theo tiến độ shot 0..1 — "kéo dài / thu ngắn" chuyển động). Cách sửa:
//   • bay camera tự do tới góc muốn rồi bấm 📷 Điểm đầu / 🏁 Điểm cuối = góc đang xem (như Ctrl+Alt+Numpad0 của Blender);
//   • nút nhanh: Zoom vào / Zoom ra / Trượt trái / Trượt phải / Lên / Xuống / Đứng yên / Đảo chiều (độ mạnh %), so với ĐIỂM ĐẦU;
//   • thanh thời gian: chạy từ a% → b% của shot, kiểu chạy Mượt / Đều / Nhanh dần / Chậm dần; độ dài shot đề nghị (chỉ ghi vào góp ý).
// CHỈ THỬ: áp vào khung Phim + 3D khi đang bật 3D (ô "Dùng camera đã sửa" để so với gốc); tắt 3D → camera gốc. Ctrl+Z / Ctrl+Y.
// Góp ý xuất ra dòng `cam: { p, l, fov, p2, l2, fov2, ease, win }` dán thẳng vào shots.js (engine/shots.js hiểu `win`).
import { ease } from './shots.js';

const COL_W = 250;
const KIEU = [['smooth', 'Mượt'], ['linear', 'Đều'], ['in', 'Nhanh dần'], ['out', 'Chậm dần'], ['inout', 'Mượt mạnh']];
const CSS = `
.c3c-bar { position: relative; height: 18px; background: #0b0d12; border: 1px solid #2a3342; border-radius: 5px; margin: 6px 0 2px; overflow: hidden; }
.c3c-bar .w { position: absolute; top: 0; bottom: 0; background: #1f6fd1aa; border-left: 2px solid #3ddc84; border-right: 2px solid #f2a154; }
.c3c-bar .ph { position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; }
.c3s-col input[type=range] { width: 100%; } .c3s-col select, .c3s-col input[type=number] { background: #0b0d12; color: #e8ecf2; border: 1px solid #2a3342; border-radius: 5px; font: inherit; }
.c3s-col input[type=number] { width: 58px; } .c3s-col .nho { font-size: 11px; } .c3s-col .dau { color: #3ddc84; font-weight: 700; } .c3s-col .cuoi { color: #f2a154; font-weight: 700; }
`;
const cl01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [0, 1, 2].map((i) => lerp(a[i], b[i], k));
const r = (a) => (Array.isArray(a) ? a.map((v) => +(+v).toFixed(3)) : +(+a).toFixed(2));
const sao = (o) => JSON.parse(JSON.stringify(o));
const giong = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function ganCam({ THREE, stage, B, isOn, getTl, curT, mauCam, rerender, chup, stopBam, chep }) {
  if (!document.getElementById('c3c-css')) { const st = document.createElement('style'); st.id = 'c3c-css'; st.textContent = CSS; document.head.appendChild(st); }
  const LS = 'c3d-cam:' + location.pathname + ':' + document.title;
  const ed = new Map();        // shotId → { goc, moi:{p,l,fov,p2,l2,fov2,ease,win}, text, dur, t, img }
  const gocCache = new Map();  // shotId → camera gốc (lấy mẫu đầu / cuối shot)
  let bat = false, dung = true, id = null, goc = null, dangLay = false, idVe = null;
  const lich = [], lai = [], listeners = new Set();
  const changed = () => { luu(); veCot(); veMoc(); for (const f of listeners) try { f(); } catch (e) {} };

  // ---- shot tại t ----
  const shotTai = (t) => { const tl = getTl(); if (!tl) return null; const a = tl.at(Math.min(t, tl.total - 1e-4)); return a?.shot || null; };
  const camTai = (m, k) => {   // cùng phép tính với engine/shots.js placeCamera (máy tuyệt đối + win)
    const w = m.win || [0, 1], kk = w[1] > w[0] ? cl01((k - w[0]) / (w[1] - w[0])) : (k >= w[0] ? 1 : 0), ke = ease(m.ease || 'smooth', kk);
    return { pos: lerp3(m.p, m.p2, ke), look: lerp3(m.l, m.l2, ke), fov: lerp(m.fov, m.fov2, ke) };
  };

  // gọi mỗi lần vẽ (sau director, trước khi vẽ Phim / đọc camera shot): đè camera của shot đã sửa
  function apDung(t) {
    const sh = shotTai(t); if (!sh) return;
    if (bat && sh.id !== idVe) { idVe = sh.id; setTimeout(() => moShot(sh.id), 0); }
    if (bat) veCot();
    const e = dung && ed.get(sh.id); if (!e) { veMoc(); return; }
    const c = camTai(e.moi, cl01((t - sh.t0) / sh.dur));
    stage.setCamera(c.pos, c.look, { fov: c.fov });
  }

  async function layGoc(sid) {
    if (gocCache.has(sid)) return gocCache.get(sid);
    const sh = getTl()?.list.find((s) => s.id === sid); if (!sh) return null;
    const [a, b] = await mauCam([sh.t0 + 1e-4, sh.t0 + sh.dur - 1e-3]);
    const g = { p: r(a.pos), l: r(a.look), fov: r(a.fov), p2: r(b.pos), l2: r(b.look), fov2: r(b.fov) };
    gocCache.set(sid, g); return g;
  }
  async function moShot(sid) {
    if (!bat || dangLay) return;
    dangLay = true;
    try { id = sid; goc = ed.get(sid)?.goc || await layGoc(sid); } finally { dangLay = false; }
    veCot(); veMoc();
    const now = shotTai(curT())?.id; if (bat && now && now !== id) moShot(now);   // shot đã đổi trong lúc lấy mẫu
  }
  const lay = () => { let e = ed.get(id); if (!e && goc) { e = { goc, moi: { ...sao(goc), ease: 'smooth', win: [0, 1] }, text: '', dur: null, t: +curT().toFixed(3) }; ed.set(id, e); e._moi = true; } return e; };
  function doi(fn) {
    if (!id || !goc) return;
    const co = ed.has(id), e = lay(), a = sao({ moi: e.moi, dur: e.dur });
    fn(e.moi, e);
    const b = sao({ moi: e.moi, dur: e.dur }); if (giong(a, b)) { if (!co) ed.delete(id); return; }
    lich.push({ id, a, b, tao: !co }); if (lich.length > 200) lich.shift(); lai.length = 0;
    e.t = +curT().toFixed(3); changed(); rerender();
  }
  function hoanTac() { const h = lich.pop(); if (!h) return false; lai.push(h); if (h.tao) ed.delete(h.id); else Object.assign(ed.get(h.id) || lay(), sao(h.a)); changed(); rerender(); return true; }
  function lamLai() { const h = lai.pop(); if (!h) return false; lich.push(h); if (!ed.has(h.id)) ed.set(h.id, { goc: gocCache.get(h.id), text: '', t: 0, ...sao(h.b) }); else Object.assign(ed.get(h.id), sao(h.b)); changed(); rerender(); return true; }

  // ---- góc đang xem của camera bay ----
  const _d = new THREE.Vector3();
  function gocXem() {
    const p = B.free.position; B.free.getWorldDirection(_d);
    const d = Math.max(1, p.distanceTo(B.controls.target));
    return { p: r(p.toArray()), l: r(p.clone().addScaledVector(_d, d).toArray()), fov: r(B.free.fov) };
  }
  function xemTu(p, l, fov) {
    stopBam?.();
    B.free.position.set(...p); B.controls.target.set(...l); B.free.up.set(0, 1, 0); B.free.lookAt(B.controls.target);
    if (fov && B.free.fov !== fov) { B.free.fov = fov; B.free.updateProjectionMatrix(); }
    rerender();
  }
  function nhanh(kieu, s) {
    doi((m) => {
      const P = new THREE.Vector3(...m.p), L = new THREE.Vector3(...m.l), dir = L.clone().sub(P), len = dir.length() || 1;
      const up = new THREE.Vector3(0, 1, 0), right = dir.clone().cross(up).normalize(), d = len * s * 0.5;
      let p2 = P.clone(), l2 = L.clone();
      if (kieu === 'vao') p2.addScaledVector(dir, s * 0.5);
      else if (kieu === 'ra') p2.addScaledVector(dir, -s);
      else if (kieu === 'trai') { p2.addScaledVector(right, -d); l2.addScaledVector(right, -d); }
      else if (kieu === 'phai') { p2.addScaledVector(right, d); l2.addScaledVector(right, d); }
      else if (kieu === 'len') { p2.addScaledVector(up, d); l2.addScaledVector(up, d); }
      else if (kieu === 'xuong') { p2.addScaledVector(up, -d); l2.addScaledVector(up, -d); }
      if (kieu === 'dao') { [m.p, m.p2] = [m.p2, m.p]; [m.l, m.l2] = [m.l2, m.l]; [m.fov, m.fov2] = [m.fov2, m.fov]; return; }
      m.p2 = r(p2.toArray()); m.l2 = r(l2.toArray()); m.fov2 = m.fov;
    });
  }

  // ---- mốc đầu / cuối trong khung 3D ----
  const moc = new THREE.Group(); moc.name = 'che3d_cam_sua'; moc.visible = false; B.helpers.add(moc);
  const kim = (mau) => {
    const v = [], c = [[-0.8, -0.45], [0.8, -0.45], [0.8, 0.45], [-0.8, 0.45]];
    for (const [x, y] of c) v.push(0, 0, 0, x, y, 1.6);
    for (let i = 0; i < 4; i++) v.push(c[i][0], c[i][1], 1.6, c[(i + 1) % 4][0], c[(i + 1) % 4][1], 1.6);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const o = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: mau, depthTest: false, transparent: true })); o.renderOrder = 999; return o;
  };
  const kA = kim(0x3ddc84), kB = kim(0xf2a154); kA.name = 'che3d_cam_dau'; kB.name = 'che3d_cam_cuoi'; kA.scale.setScalar(1.6); kB.scale.setScalar(1.6);   // to hơn khung camera shot (vàng) để phân biệt
  const duong = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.6, gapSize: 0.4, depthTest: false, transparent: true }));
  duong.renderOrder = 999; moc.add(kA, kB, duong);
  function veMoc() {
    const m = id && (ed.get(id)?.moi || goc);
    moc.visible = !!(bat && isOn() && m);
    if (!moc.visible) return;
    kA.position.set(...m.p); kA.lookAt(...m.l); kB.position.set(...m.p2); kB.lookAt(...m.l2);
    duong.geometry.dispose(); duong.geometry = new THREE.BufferGeometry().setFromPoints([kA.position, kB.position]); duong.computeLineDistances();
  }

  // ---- cột 🎥 SỬA CAMERA bên phải khung 3D (cùng chỗ cột ✥ Sửa vật) ----
  const col = document.createElement('div'); col.className = 'c3s-col c3c-col';
  col.innerHTML = `<h4>🎥 Sửa camera <span class="muted shot"></span></h4>
    <div class="muted nho cho">Đang đọc camera của shot…</div>
    <div class="co">
    <label class="nho"><input type="checkbox" data-o="dung" checked> Dùng camera đã sửa <span class="muted">(bỏ = xem gốc)</span></label>
    <div class="nho muted" style="margin-top:6px">1 · Bay tới góc muốn (kéo chuột / chuột phải + WASD) rồi bấm:</div>
    <div class="hang"><button data-a="datA" title="Điểm đầu = góc camera đang xem"><span class="dau">📷</span> Điểm đầu</button><button data-a="datB" title="Điểm cuối = góc camera đang xem"><span class="cuoi">🏁</span> Điểm cuối</button></div>
    <div class="hang"><button data-a="xemA" title="Đưa camera bay tới điểm đầu">👁 Xem đầu</button><button data-a="xemB" title="Đưa camera bay tới điểm cuối">👁 Xem cuối</button></div>
    <div class="nho muted" style="margin-top:6px">2 · Hoặc chuyển động nhanh (so với điểm đầu):</div>
    <div class="hang"><button data-k="vao">🔍+ Zoom vào</button><button data-k="ra">🔍− Zoom ra</button><button data-k="trai">⬅ Trượt trái</button><button data-k="phai">Trượt phải ➡</button>
      <button data-k="len">⬆ Lên</button><button data-k="xuong">⬇ Xuống</button><button data-k="yen">⏸ Đứng yên</button><button data-k="dao">⇄ Đảo chiều</button></div>
    <label class="nho">Độ mạnh <b class="vManh">40</b>% <input type="range" data-o="manh" min="5" max="100" value="40"></label>
    <div class="hang nho">Góc nhìn (fov) <span class="dau">đầu</span> <input type="number" data-o="fov" min="5" max="120" step="1"> <span class="cuoi">cuối</span> <input type="number" data-o="fov2" min="5" max="120" step="1"></div>
    <div class="nho muted" style="margin-top:6px">3 · Thời gian — kéo dài / thu ngắn chuyển động:</div>
    <div class="c3c-bar"><div class="w"></div><div class="ph"></div></div>
    <div class="nho tg"></div>
    <label class="nho">Bắt đầu chạy <input type="range" data-o="a" min="0" max="100" value="0"></label>
    <label class="nho">Dừng ở <input type="range" data-o="b" min="0" max="100" value="100"></label>
    <div class="hang"><button data-w="0,1">Cả shot</button><button data-w="0,0.5">Nửa đầu</button><button data-w="0.5,1">Nửa sau</button><button data-w="0.2,0.8">Giữa</button></div>
    <div class="hang nho">Kiểu chạy <select data-o="ease">${KIEU.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
    <div class="hang nho">Độ dài shot (s) <input type="number" data-o="dur" min="0.2" max="30" step="0.1"> <span class="muted">đề nghị — ghi vào góp ý</span></div>
    <div class="hang"><button data-a="trala" title="Shot này về camera gốc">↺ Về gốc</button><button data-a="undo" title="Ctrl+Z" disabled>↶</button><button data-a="redo" title="Ctrl+Y" disabled>↷</button></div>
    <div class="so"></div>
    <textarea placeholder="Ghi chú camera shot này (vd: zoom chậm hơn, thấy cả 4 chân nhà…)"></textarea>
    <button class="main" data-a="luu">Lưu ghi chú</button>
    <button class="main" data-a="chep" title="Chép mọi điều chỉnh thành chữ — dán thẳng cho Claude">📋 Copy điều chỉnh</button>
    <div class="muted nho" style="margin-top:8px">Mốc <span class="dau">xanh</span> = điểm đầu, <span class="cuoi">cam</span> = điểm cuối. Chỉ là thử: tắt 3D thì về camera gốc; số + ghi chú đi kèm file góp ý (dòng <code>cam:</code> dán thẳng vào shots.js).</div>
    </div>`;
  col.addEventListener('pointerdown', (e) => e.stopPropagation());
  col.addEventListener('keydown', (e) => { if (/TEXTAREA|INPUT|SELECT/.test(e.target.tagName)) e.stopPropagation(); });
  const $ = (s) => col.querySelector(s);
  function hienCot(on) {
    if (on) {
      const ssm = B.el.classList.contains('c3d-ss'), fx = B.el.classList.contains('c3d-fixed');
      col.classList.toggle('c3s-ssflex', ssm); col.classList.toggle('c3s-fx', fx);
      if (ssm) B.el.after(col); else { B.el.classList.add('c3s-hep'); (B.el.parentNode || document.body).appendChild(col); }
    } else { if (col.parentNode) { col.remove(); if (!document.querySelector('.c3s-col:not(.c3c-col)')) B.el.classList.remove('c3s-hep'); } }
  }
  col.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; b.blur();
    const s = +$('[data-o=manh]').value / 100;
    if (b.dataset.k) return b.dataset.k === 'yen' ? doi((m) => { m.p2 = [...m.p]; m.l2 = [...m.l]; m.fov2 = m.fov; }) : nhanh(b.dataset.k, s);
    if (b.dataset.w) { const w = b.dataset.w.split(',').map(Number); return doi((m) => { m.win = w; }); }
    const a = b.dataset.a, m = id && (ed.get(id)?.moi || goc);
    if (a === 'datA') { const g = gocXem(); doi((m) => { m.p = g.p; m.l = g.l; m.fov = g.fov; }); }
    else if (a === 'datB') { const g = gocXem(); doi((m) => { m.p2 = g.p; m.l2 = g.l; m.fov2 = g.fov; }); }
    else if (a === 'xemA' && m) xemTu(m.p, m.l, m.fov);
    else if (a === 'xemB' && m) xemTu(m.p2, m.l2, m.fov2);
    else if (a === 'trala' && ed.has(id)) { const e0 = ed.get(id); lich.push({ id, a: sao({ moi: e0.moi, dur: e0.dur }), b: sao({ moi: { ...sao(goc), ease: 'smooth', win: [0, 1] }, dur: null }), tao: false }); ed.delete(id); lich[lich.length - 1].xoa = true; changed(); rerender(); }
    else if (a === 'undo') hoanTac();
    else if (a === 'redo') lamLai();
    else if (a === 'chep') chep?.(b);
    else if (a === 'luu' && id && goc) {
      const e = lay(); e.text = $('textarea').value.trim(); e.img = chup?.() || ''; e.t = +curT().toFixed(3); changed();
      b.textContent = 'Đã lưu ✓'; setTimeout(() => { b.textContent = 'Lưu ghi chú'; }, 1200);
    }
  });
  col.addEventListener('input', (e) => {
    const o = e.target.dataset.o; if (!o) return;
    if (o === 'manh') { $('.vManh').textContent = e.target.value; return; }
    if (o === 'dung') { dung = e.target.checked; rerender(); return; }
    if (o === 'a' || o === 'b') {
      let a = +$('[data-o=a]').value / 100, b2 = +$('[data-o=b]').value / 100;
      if (b2 - a < 0.05) { if (o === 'a') a = Math.max(0, b2 - 0.05); else b2 = Math.min(1, a + 0.05); }
      return doi((m) => { m.win = [+a.toFixed(2), +b2.toFixed(2)]; });
    }
  });
  col.addEventListener('change', (e) => {
    const o = e.target.dataset.o, v = e.target.value;
    if (o === 'ease') doi((m) => { m.ease = v; });
    else if (o === 'fov' || o === 'fov2') { const n = +v; if (n >= 5 && n <= 120) doi((m) => { m[o] = n; }); }
    else if (o === 'dur') { const n = +v, sh = getTl()?.list.find((s) => s.id === id); doi((m, e2) => { e2.dur = n > 0 && sh && Math.abs(n - sh.dur) > 1e-3 ? +n.toFixed(2) : null; }); }
  });

  const dongCam = (m) => {
    const w = m.win && (m.win[0] > 0 || m.win[1] < 1) ? `, win: [${m.win.join(', ')}]` : '';
    const f = (a) => `[${a.join(', ')}]`;
    return `cam: { p: ${f(m.p)}, l: ${f(m.l)}, fov: ${m.fov}, p2: ${f(m.p2)}, l2: ${f(m.l2)}, fov2: ${m.fov2}, ease: '${m.ease || 'smooth'}'${w} }`;
  };
  function veCot() {
    if (!col.parentNode) return;
    const sh = id && getTl()?.list.find((s) => s.id === id);
    $('.shot').textContent = sh ? `· ${sh.id}` : '';
    $('.cho').style.display = goc ? 'none' : ''; $('.co').style.display = goc ? '' : 'none';
    $('[data-a=undo]').disabled = !lich.length; $('[data-a=redo]').disabled = !lai.length;
    if (!goc || !sh) return;
    const e = ed.get(id), m = e?.moi || { ...goc, ease: 'smooth', win: [0, 1] };
    const ae = document.activeElement;
    const dat = (s, v) => { const x = $(s); if (x && x !== ae) x.value = v; };
    dat('[data-o=fov]', Math.round(m.fov)); dat('[data-o=fov2]', Math.round(m.fov2)); dat('[data-o=ease]', m.ease || 'smooth');
    dat('[data-o=a]', Math.round(m.win[0] * 100)); dat('[data-o=b]', Math.round(m.win[1] * 100)); dat('[data-o=dur]', (e?.dur ?? sh.dur).toFixed(2));
    if ($('textarea') !== ae) $('textarea').value = e?.text || '';
    $('.c3c-bar .w').style.cssText = `left:${m.win[0] * 100}%;width:${(m.win[1] - m.win[0]) * 100}%`;
    $('.c3c-bar .ph').style.left = `${cl01((curT() - sh.t0) / sh.dur) * 100}%`;
    const D = e?.dur ?? sh.dur;
    $('.tg').textContent = `chạy ${(m.win[0] * D).toFixed(2)} s → ${(m.win[1] * D).toFixed(2)} s (dài ${((m.win[1] - m.win[0]) * D).toFixed(2)} s / shot ${D.toFixed(2)} s)`;
    $('.so').textContent = (e ? 'ĐÃ SỬA (thử)\n' : 'GỐC (chưa sửa)\n') + `đầu  ${m.p.join(', ')}\n  nhìn ${m.l.join(', ')}\ncuối ${m.p2.join(', ')}\n  nhìn ${m.l2.join(', ')}\nfov ${m.fov} → ${m.fov2}`;
  }

  // ---- lưu tạm trong trình duyệt ----
  function luu() { try { localStorage.setItem(LS, JSON.stringify([...ed].map(([k, e]) => [k, { goc: e.goc, moi: e.moi, text: e.text, dur: e.dur, t: e.t, img: e.img || '' }]))); } catch (e) { try { localStorage.setItem(LS, JSON.stringify([...ed].map(([k, e]) => [k, { goc: e.goc, moi: e.moi, text: e.text, dur: e.dur, t: e.t }]))); } catch (e2) {} } }
  try { for (const [k, e] of JSON.parse(localStorage.getItem(LS) || '[]')) if (e?.goc && e?.moi) { ed.set(k, e); gocCache.set(k, e.goc); } } catch (e) {}

  function xuat(img = true) {
    const out = [];
    for (const [sid, e] of ed) {
      const sh = getTl()?.list.find((s) => s.id === sid);
      const coi = { ...e.goc, ease: 'smooth', win: [0, 1] };
      if (giong(e.moi, coi) && !e.text && e.dur == null) continue;
      out.push({ shotId: sid, t: e.t ?? sh?.t0 ?? null, goc: e.goc, moi: e.moi, dong: dongCam(e.moi), text: e.text || '', durGoc: sh ? +sh.dur.toFixed(3) : null, durDeNghi: e.dur ?? null, img: img ? e.img || '' : '' });
    }
    return out;
  }

  function setBat(v) {
    bat = !!v; hienCot(bat && isOn());
    if (bat) { idVe = null; const s = shotTai(curT()); if (s) { idVe = s.id; moShot(s.id); } }
    veMoc(); veCot();
  }
  // phím khi đang ở 🎥 Camera (che-do-3d-sua.js chuyển sang): Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z — trả true nếu đã dùng
  function phim(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.code === 'KeyZ') { e.shiftKey ? lamLai() : hoanTac(); return true; }
    if (ctrl && e.code === 'KeyY') { lamLai(); return true; }
    return false;
  }

  return {
    apDung, setBat, phim, xuat, hoanTac, lamLai, nhanh, doi, dongCam, camTai,
    traLai() { hienCot(false); moc.visible = false; },
    batLai() { if (bat) setBat(true); },
    get bat() { return bat; }, get dung() { return dung; }, setDung(v) { dung = !!v; const c = $('[data-o=dung]'); if (c) c.checked = dung; rerender(); },
    get id() { return id; }, get goc() { return goc; }, get mocHien() { return moc.visible; }, ed, datA: () => col.querySelector('[data-a=datA]').click(), datB: () => col.querySelector('[data-a=datB]').click(),
    xoaHet() { ed.clear(); lich.length = 0; lai.length = 0; changed(); rerender(); },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    get lich() { return lich.length; },
  };
}
