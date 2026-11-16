// Bố cục ĐIỆN THOẠI của trình phát (dùng chung mọi tập, nạp từ tools/export-ui.js).
// Cách làm: KHÔNG dựng lại giao diện — chỉ thêm class `dt` lên #xapp, chuyển một số nút có sẵn (giữ nguyên id + sự kiện) vào
// thanh dưới / ngăn kéo, rồi phủ CSS. Tắt `dt` thì trả mọi nút về chỗ cũ → bố cục máy tính y nguyên.
//   Tự nhận: màn hẹp + cảm ứng. Ép: ?giaodien=dt | ?giaodien=mt. Nút đổi: ⚙ → "Giao diện" (nhớ trong localStorage 'giaodien').
//   Màn chính = chỉ phim vừa khít. Chạm phim = hiện nút Phát/Dừng to + thanh tua + giờ, tự ẩn sau ~3,5 giây.
//   ⚙ (góc dưới phải) = ngăn kéo từ đáy: Xem · 3D · Âm thanh · Hiệu ứng · Ghi chú · Xuất · Asset · Cài đặt.
//   3D: 1 ngón xoay, 2 ngón kéo/phóng (OrbitControls); 🛠 mở thanh công cụ 3D; Sửa vật = bảng dưới đáy, tay kéo to hơn.
export function installDT({ app, $, fit, wrap }) {
  const q = new URLSearchParams(location.search);
  const lsGet = () => { try { return localStorage.getItem('giaodien'); } catch { return null; } };
  const lsSet = (v) => { try { localStorage.setItem('giaodien', v); } catch {} };
  const auto = () => matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) <= 820;
  const want = () => { const p = q.get('giaodien'); if (p === 'dt' || p === 'mt') return p; const s = lsGet(); if (s === 'dt' || s === 'mt') return s; return auto() ? 'dt' : 'mt'; };

  const css = document.createElement('style');
  css.textContent = `
  #xapp:not(.dt) .dtonly { display: none !important; }
  #xapp.dt { --bg:#fafafa; --panel:#fff; --panel2:#f4f4f6; --line:#e8e8e8; --text:#1a1a1a; --muted:#6b6b6b; --acc:#4f46e5; --acc2:#4f46e5; --ac2:#eef0ff; --ok:#16a34a; --warn:#d97706; --bad:#dc2626;
    display: block; font-size: 15px; font-family: "Be Vietnam Pro", system-ui, sans-serif; -webkit-tap-highlight-color: transparent; background: #000; }
  #xapp.dt #xhead, #xapp.dt #xleft, #xapp.dt .gut, #xapp.dt #xfoot, #xapp.dt .transport, #xapp.dt #xpop { display: none !important; }
  #xapp.dt #xstage { position: absolute; inset: 0; display: block; background: #000; }
  #xapp.dt #xview { position: absolute; inset: 0; padding: 0; background: #000; }
  #xapp.dt #xwrap { box-shadow: none; border-radius: 0; }
  #xapp.dt #xbadge { top: calc(10px + env(safe-area-inset-top)); left: 10px; z-index: 21; transition: opacity .2s; }
  #xapp.dt:not(.cv) #xbadge { opacity: 0; }
  #xapp.dt #xbfr, #xapp.dt #xbtime { display: none; }
  #xapp.dt #xbadge .pill { background: rgba(255,255,255,.92); color: #1a1a1a; border-color: #e8e8e8; font-size: 13px; padding: 4px 11px; }

  /* nút to, chữ to, không cuộn ngang */
  #xapp.dt button, #xapp.dt select, #xapp.dt input[type=text], #xapp.dt input[type=number] { min-height: 44px; font-size: 15px; border-radius: 12px; }
  #xapp.dt select, #xapp.dt input[type=text], #xapp.dt input[type=number], #xapp.dt textarea { font-size: 16px; }
  #xapp.dt textarea { border-radius: 12px; padding: 10px; }
  #xapp.dt input[type=checkbox], #xapp.dt input[type=radio] { width: 22px; height: 22px; flex: none; }
  #xapp.dt input[type=range] { height: 44px; }
  #xapp.dt .chk, #xapp.dt .sw label { min-height: 48px; padding: 8px 12px; border-radius: 12px; font-size: 15px; }
  #xapp.dt .chk, #xapp.dt .sw label { min-width: 0; overflow-wrap: anywhere; }
  #xapp.dt .sw, #xapp.dt .fxgrid { grid-template-columns: 1fr 1fr; gap: 8px; }
  #xapp.dt .row { flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  #xapp.dt .row > .l { width: 100%; font-size: 13px; }
  #xapp.dt .row > select, #xapp.dt .row > input[type=range] { flex: 1 1 100%; }
  #xapp.dt .sfxrow { flex-wrap: wrap; } #xapp.dt .sfxrow .chk { flex: 1 1 100%; } #xapp.dt .sfxrow input[type=range] { flex: 1; }
  #xapp.dt h4 { font-size: 12px; margin: 18px 0 8px; }
  #xapp.dt button.main { background: var(--acc); color: #fff; border-color: var(--acc); }
  #xapp.dt button.on, #xapp.dt button.act { background: var(--ac2); border-color: var(--acc); color: var(--acc); }
  #xapp.dt button.main.act { color: #fff; background: var(--acc); }
  #xapp.dt .grp { flex-wrap: wrap; border: 0; padding: 0; gap: 6px; }
  #xapp.dt .grp .lb { display: none; }
  #xapp.dt #xshsel { max-width: none; flex: 1; min-width: 90px; }
  #xapp.dt #xframe { width: 84px; }
  #xapp.dt .xsh, #xapp.dt .xstep { padding: 6px 12px; }
  #xapp.dt #xnotes .nt { padding: 8px; } #xapp.dt #xnotes .nt .del { min-width: 44px; }
  #xapp.dt kbd { display: none; }

  /* thanh dưới: Phát | tua | giờ | ⚙ */
  #dtbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 22; display: flex; align-items: center; gap: 10px; padding: 8px 12px calc(10px + env(safe-area-inset-bottom));
    background: rgba(255,255,255,.94); border-top: 1px solid var(--line); backdrop-filter: blur(8px); transition: transform .22s, opacity .22s; }
  #xapp.dt:not(.cv):not(.m3d) #dtbar { transform: translateY(110%); opacity: 0; pointer-events: none; }
  #xapp.dt.mo #dtbar { display: none; }
  #xapp #dtbar button { width: 48px; height: 48px; padding: 0; font-size: 20px; flex: none; border-radius: 14px; }
  #xapp #dtbar #dtsm { background: var(--acc); color: #fff; border-color: var(--acc); }
  #dtbar #xseek { flex: 1; min-width: 0; width: auto; height: 44px; margin: 0; }
  #dtbar #xtime { min-width: 50px; text-align: right; font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; flex: none; }
  /* nút Phát to giữa phim (chỉ ở chế độ Phim) */
  #xapp #dtbig { position: fixed; left: 50%; top: 50%; width: 84px; height: 84px; margin: -42px 0 0 -42px; z-index: 21; border-radius: 50%; border: 0; font-size: 34px; padding: 0;
    background: rgba(79,70,229,.92); color: #fff; box-shadow: 0 8px 28px rgba(0,0,0,.35); transition: opacity .2s; }
  #xapp.dt:not(.cv) #dtbig, #xapp.dt.m3d #dtbig, #xapp.dt.mss #dtbig, #xapp.dt.mo #dtbig, #xapp.dt.annot #dtbig { opacity: 0; pointer-events: none; }
  #xapp #dttools { position: fixed; right: 10px; top: calc(10px + env(safe-area-inset-top)); z-index: 23; height: 44px; padding: 0 14px; background: rgba(255,255,255,.95); }
  #xapp.dt:not(.m3d):not(.mss) #dttools { display: none !important; }
  #dttools.on { background: var(--ac2); border-color: var(--acc); color: var(--acc); }

  /* ngăn kéo từ đáy */
  #dtscrim { position: fixed; inset: 0; z-index: 55; background: rgba(0,0,0,.35); opacity: 0; pointer-events: none; transition: opacity .2s; }
  #xapp.dt.mo #dtscrim { opacity: 1; pointer-events: auto; }
  #xapp.dt #xright { position: fixed; left: 0; right: 0; bottom: 0; top: auto; z-index: 60; display: flex; flex-direction: column; max-height: 66dvh; min-height: 40dvh;
    background: var(--panel); border-radius: 20px 20px 0 0; box-shadow: 0 -12px 40px rgba(0,0,0,.28); transform: translateY(105%); transition: transform .26s ease; visibility: hidden; }
  #xapp.dt.mo #xright { transform: none; visibility: visible; }
  #dtgrip { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px 0 18px; flex: none; }
  #dtgrip b { font-size: 16px; } #dtgrip button { width: 44px; padding: 0; font-size: 18px; }
  #xapp.dt .rail { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 8px 12px; border: 0; border-bottom: 1px solid var(--line); background: var(--panel); flex: none; overflow: visible; }
  #xapp.dt .tab { flex: none; padding: 6px 2px; min-height: 52px; font-size: 12px; border-radius: 12px; background: var(--panel2); text-align: center; }
  #xapp.dt .tab i { display: block; font-size: 19px; margin: 0; }
  #xapp.dt .tab.on { background: var(--ac2); color: var(--acc); box-shadow: none; }
  #xapp.dt #xright > .scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
  #xapp.dt .pane { display: none; padding: 6px 16px 28px; border: 0; } #xapp.dt .pane.on { display: block; }
  #xapp.dt .dtsec { margin-bottom: 4px; }

  /* ghi chú lỗi: bảng dưới, không kéo */
  #xapp.dt #xannbox { left: 0 !important; right: 0; top: auto !important; bottom: 0 !important; width: auto; max-height: 52dvh; border-radius: 18px 18px 0 0; z-index: 70; padding-bottom: env(safe-area-inset-bottom); }
  #xapp.dt #xannbox .dh { border-radius: 18px 18px 0 0; cursor: default; } #xapp.dt #xannbox .dh > span, #xapp.dt #xmreset { display: none; }
  #xapp.dt #xannbox .tl { padding: 6px 12px; }
  #xapp.dt.annot #dtbar { display: none; }
  #xapp.dt #xannbox.min .bd { display: flex !important; } #xapp.dt #xmmin { display: none; }

  /* 3D */
  #xapp.dt .c3d-help { display: none !important; }
  #xapp.dt .c3d-bar { display: none; top: calc(62px + env(safe-area-inset-top)); left: 8px; right: 8px; max-height: 52dvh; overflow-y: auto; align-content: flex-start; gap: 8px; padding: 10px; border-radius: 16px;
    background: rgba(255,255,255,.96); box-shadow: 0 10px 30px rgba(0,0,0,.3); font-size: 14px; color: #1a1a1a; z-index: 24; }
  #xapp.dt.tl3 .c3d-bar { display: flex; }
  #xapp.dt .c3d-bar button, #xapp.dt .c3d-bar select, #xapp.dt .c3d-bar label { min-height: 44px; font-size: 14px; background: #f4f4f6; color: #1a1a1a; border: 1px solid #e8e8e8; border-radius: 12px; padding: 6px 12px; max-width: 100%; }
  #xapp.dt .c3d-bar button.on, #xapp.dt .c3d-bar select.on { background: #eef0ff; color: #4f46e5; border-color: #4f46e5; }
  #xapp.dt .c3d-bar input[type=checkbox] { width: 22px; height: 22px; }
  #xapp.dt .c3s-mode { flex: 1 1 100%; display: flex; order: -1; } #xapp.dt .c3s-mode button { flex: 1; }
  #xapp.dt .c3s-dem { flex: 1 1 100%; color: var(--bad); }
  #xapp.dt .c3d-wrap.c3s-hep { right: 0 !important; }
  #xapp.dt .c3s-col { position: fixed !important; left: 8px; right: 8px; top: auto !important; bottom: 74px; width: auto !important; max-height: 46dvh; flex: none !important; margin: 0 !important; z-index: 26; border-radius: 16px;
    background: #fff; color: #1a1a1a; border-color: #e8e8e8; box-shadow: 0 10px 30px rgba(0,0,0,.3); font-size: 14px; }
  #xapp.dt .c3s-col .phim { display: none; }
  #xapp.dt .c3s-col button { min-height: 44px; background: #f4f4f6; color: #1a1a1a; border-color: #e8e8e8; border-radius: 12px; padding: 6px 12px; }
  #xapp.dt .c3s-col button.on { background: #eef0ff; color: #4f46e5; border-color: #4f46e5; }
  #xapp.dt .c3s-col button.main { background: #4f46e5; color: #fff; }
  #xapp.dt .c3s-col .hang { gap: 8px; } #xapp.dt .c3s-col h4 { color: #4f46e5; } #xapp.dt .c3s-col textarea { background: #fff; color: #1a1a1a; font-size: 16px; }
  #xapp.dt .c3s-col .so { color: #444; } #xapp.dt .c3s-col .muted { color: #6b6b6b; }
  #xapp.dt .c3s-col input[type=checkbox] { width: 22px; height: 22px; }
  #xapp.dt .c3a .it { padding: 10px 8px; min-height: 44px; } #xapp.dt .c3a input[type=search] { min-height: 44px; font-size: 16px; }
  #xapp.dt .c3s-pin { width: min(260px, calc(100vw - 20px)); background: #fff; color: #1a1a1a; }
  #xapp.dt .c3s-pin button { min-height: 44px; }
  `;
  document.head.appendChild(css);

  // ---- phần tử thêm vào (chỉ hiện khi dt) ----
  const bar = document.createElement('div'); bar.id = 'dtbar'; bar.className = 'dtonly';
  bar.innerHTML = '<button id="dtsm" title="Phát / Dừng">▶</button><button id="dtgear" title="Menu: giọng, phụ đề, 3D, xuất MP4…">⚙</button>';
  const big = document.createElement('button'); big.id = 'dtbig'; big.className = 'dtonly'; big.textContent = '▶';
  const tools = document.createElement('button'); tools.id = 'dttools'; tools.className = 'dtonly'; tools.textContent = '🛠 Công cụ 3D';
  const scrim = document.createElement('div'); scrim.id = 'dtscrim'; scrim.className = 'dtonly';
  const grip = document.createElement('div'); grip.id = 'dtgrip'; grip.className = 'dtonly'; grip.innerHTML = '<b>Menu</b><button id="dtclose" title="Đóng">✕</button>';
  app.append(bar, big, tools, scrim);
  $('xright').insertBefore(grip, $('xright').firstChild);

  // thẻ mới: 3D (chuyển chế độ, shot, frame, marker) và Cài đặt
  const rail = $('xright').querySelector('.rail'), scroll = $('xright').querySelector('.scroll');
  const tab7 = document.createElement('div'); tab7.className = 'tab dtonly'; tab7.dataset.p = 'xp7'; tab7.innerHTML = '<i>🧊</i>Chế độ';
  const tab8 = document.createElement('div'); tab8.className = 'tab dtonly'; tab8.dataset.p = 'xp8'; tab8.innerHTML = '<i>⚙</i>Cài đặt';
  rail.insertBefore(tab7, $('xtab2')); rail.appendChild(tab8);
  const p7 = document.createElement('div'); p7.className = 'pane'; p7.id = 'xp7';
  const p8 = document.createElement('div'); p8.className = 'pane'; p8.id = 'xp8';
  scroll.append(p7, p8);
  const mkSec = (host, title, id) => { const s = document.createElement('div'); s.className = 'dtsec'; s.id = id; s.innerHTML = `<h4>${title}</h4>`; host.appendChild(s); return s; };
  const sModes = mkSec(p7, 'Phim hay 3D', 'dts-mode'), sShot = mkSec(p7, 'Chuyển shot', 'dts-shot'), sFrame = mkSec(p7, 'Từng khung hình', 'dts-frame'), sMark = mkSec(p7, 'Đánh dấu lỗi', 'dts-mark');
  p8.innerHTML = `<h4>Giao diện</h4><div class="row"><button id="dtmt" style="flex:1">🖥 Bố cục máy tính</button></div>
    <div class="muted" style="margin-top:-4px">Điện thoại: chạm phim để hiện nút. Chế độ 3D: 1 ngón xoay, 2 ngón kéo và phóng to. Sửa vật: chạm vào vật rồi kéo tay kéo.</div><h4>Gỡ lỗi</h4><div class="sw" id="dtdbg"></div>`;
  for (const t of [tab7, tab8]) t.onclick = () => { app.querySelectorAll('.tab, .pane').forEach((x) => x.classList.remove('on')); t.classList.add('on'); $(t.dataset.p).classList.add('on'); syncSecs(); scroll.scrollTop = 0; };
  const syncSecs = () => { for (const s of [sModes, sShot, sFrame, sMark]) { const c = s.lastElementChild; s.style.display = !c || c === s.firstElementChild || c.style.display === 'none' ? 'none' : ''; } };

  // ---- chuyển nút qua lại ----
  const moved = [];
  const move = (node, to) => { if (!node || !to) return; moved.push({ node, parent: node.parentNode, next: node.nextSibling }); to.appendChild(node); };
  const restore = () => { while (moved.length) { const m = moved.pop(); m.parent.insertBefore(m.node, m.next && m.next.parentNode === m.parent ? m.next : null); } };
  const grpOf = (id) => $(id)?.closest('.grp');

  let isDT = false, timer = 0;
  function showCtl(stay) { app.classList.add('cv'); clearTimeout(timer); if (!stay) timer = setTimeout(() => app.classList.remove('cv'), 3500); }
  function hideCtl() { clearTimeout(timer); app.classList.remove('cv'); }
  function openDr(p) { if (p) { const t = app.querySelector(`.tab[data-p="${p}"]`); if (t && t.style.display !== 'none') t.click(); } syncSecs(); app.classList.add('mo'); }
  function closeDr() { app.classList.remove('mo'); showCtl(); }

  function setDT(on) {
    if (on === isDT) return; isDT = on;
    if (on) {
      move($('xseek'), bar); bar.insertBefore($('xseek'), $('dtgear'));
      move($('xtime'), bar); bar.insertBefore($('xtime'), $('dtgear'));
      move(grpOf('x3drow'), sModes); move(grpOf('xshotrow'), sShot); move(grpOf('xframe'), sFrame); move(grpOf('xannbtn'), sMark);
      move($('xdbgchk')?.closest('label'), $('dtdbg'));
      app.classList.add('dt'); showCtl();
      document.querySelector('meta[name=viewport]')?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    } else {
      app.classList.remove('dt', 'mo', 'cv', 'tl3'); restore(); clearTimeout(timer);
    }
    const s = $('xshotrow'); if (s) s.style.removeProperty('--x');
    fit(); setTimeout(fit, 60); syncSecs(); sync();
  }

  // ---- đồng bộ trạng thái: đang phát?, chế độ 3D?, đang ghi chú? ----
  const playTx = () => /Dừng/.test($('xplay').textContent);
  function sync() {
    const c = window.__che3d, on3 = !!(c && c.on), ss = !!(c && c.on && c.songSong);
    app.classList.toggle('m3d', isDT && on3 && !ss); app.classList.toggle('mss', isDT && ss);
    if (!isDT || !on3) app.classList.remove('tl3'); $('dttools').classList.toggle('on', app.classList.contains('tl3'));
    const p = playTx(); $('dtsm').textContent = p ? '❚❚' : '▶'; big.textContent = p ? '❚❚' : '▶';
    app.classList.toggle('annot', isDT && $('xannbox').classList.contains('on'));
    try { const tc = c?.sua?.tc; if (tc && tc._dtSize !== (isDT ? 1.7 : 0.9)) { tc._dtSize = isDT ? 1.7 : 0.9; tc.setSize(tc._dtSize); } } catch {}
  }
  new MutationObserver(sync).observe($('xplay'), { childList: true, characterData: true, subtree: true });
  new MutationObserver(sync).observe($('xannbox'), { attributes: true, attributeFilter: ['class'] });
  setInterval(sync, 350);

  // ---- thao tác ----
  const playClick = () => { $('xplay').click(); showCtl(); };
  $('dtsm').onclick = playClick; big.onclick = playClick;
  $('dtgear').onclick = () => openDr(); $('dtclose').onclick = closeDr; scrim.onclick = closeDr;
  tools.onclick = () => { app.classList.toggle('tl3'); sync(); };
  $('dtmt').onclick = () => { lsSet('mt'); setDT(false); };
  bar.addEventListener('pointerdown', () => showCtl(), true);
  bar.addEventListener('input', () => showCtl());
  // chạm phim = hiện / ẩn nút (không phát ngay); ghi chú đang mở thì để nguyên cho vẽ
  wrap.addEventListener('click', (e) => {
    if (!isDT || wrap.classList.contains('annot')) return;
    e.stopPropagation(); e.stopImmediatePropagation();
    if (app.classList.contains('cv')) hideCtl(); else showCtl();
  }, true);
  // chạm ra ngoài thanh công cụ 3D = đóng nó (cú chạm vẫn đi tiếp tới khung 3D: chọn vật, ghim…)
  document.addEventListener('pointerdown', (e) => { if (isDT && app.classList.contains('tl3') && !e.target.closest('.c3d-bar, #dttools')) { app.classList.remove('tl3'); sync(); } }, true);
  // vuốt ngăn kéo xuống ở thanh tiêu đề = đóng
  { let y0 = null; grip.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    grip.addEventListener('touchmove', (e) => { if (y0 !== null && e.touches[0].clientY - y0 > 60) { y0 = null; closeDr(); } }, { passive: true }); }
  // nút trong cài đặt máy tính: đổi sang bố cục điện thoại
  const pop = $('xpop');
  if (pop) { const h = document.createElement('div'); h.innerHTML = '<h4>Giao diện</h4><div class="row"><button id="xtodt">📱 Bố cục điện thoại</button></div>'; pop.insertBefore(h, pop.firstChild); h.querySelector('#xtodt').onclick = () => { lsSet('dt'); pop.classList.remove('on'); setDT(true); }; }
  // khi đang ở dt: bấm ✥ Sửa vật → mở thanh công cụ không cần; chọn Asset tự mở ngăn kéo thì không (giữ phim). Tắt 3D → đóng thanh công cụ.
  addEventListener('resize', () => { if (!q.get('giaodien') && !lsGet()) setDT(auto()); });
  setDT(want() === 'dt');
  window.__giaoDien = { get dt() { return isDT; }, set: (v) => setDT(v === 'dt'), moDr: openDr, dongDr: closeDr };
}
