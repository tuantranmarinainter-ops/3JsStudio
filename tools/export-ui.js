// Trình phát + nút "Xuất MP4" nhúng vào bản gộp 1 file (tools/bundle.mjs). Chạy hoàn toàn trong trình duyệt của
// người xem: render từng frame bằng GPU máy họ (window.renderAt), ghép phụ đề, mã hoá H.264 bằng WebCodecs,
// giọng đọc AAC/Opus, đóng gói MP4 (mp4-muxer) → lưu file. Không cần server, không cần cloud.
// Cần Chrome/Edge bản mới (WebCodecs). Không bật khi trang bị điều khiển tự động (render-local, HyperFrames).
import { Muxer, ArrayBufferTarget, FileSystemWritableFileStreamTarget } from 'mp4-muxer';

const PRESETS = {
  '2k':    { w: 1440, h: 2560, label: '2K — 1440×2560', bitrate: 16e6 },
  '1080p': { w: 1080, h: 1920, label: 'Full HD — 1080×1920', bitrate: 10e6 },
  '4k':    { w: 2160, h: 3840, label: '4K — 2160×3840 (rất chậm)', bitrate: 35e6 },
};

async function init() {
  const root = document.getElementById('root');
  const W0 = +root.dataset.width || 1080, H0 = +root.dataset.height || 1920;
  const FPS = +root.dataset.fps || 30, DUR = +root.dataset.duration;
  const title = document.title;

  // ---- khung studio cho PC: thanh trên | cột shot | khung hình + điều khiển | cột thẻ | dải thời gian ----
  // (bố cục đã duyệt ở dist/studio_ban-mau.html; mọi id điều khiển cũ giữ nguyên, chỉ chuyển vào đúng thẻ)
  const css = document.createElement('style');
  css.textContent = `
    html, body { width: 100% !important; height: 100% !important; overflow: hidden !important; background: #0e1116 !important; margin: 0; }
    #xapp { --bg:#0e1116; --panel:#161b23; --panel2:#1d2430; --line:#2a3342; --text:#e8ecf2; --muted:#8b96a8; --acc:#4da3ff; --acc2:#1f6fd1; --ok:#3ecf8e; --warn:#f5b84a; --bad:#f2647a;
      --wl:250px; --wr:360px; --ht:150px; --fs:13px;
      position: fixed; inset: 0; z-index: 5; box-sizing: border-box; background: var(--bg); color: var(--text); font: var(--fs)/1.45 "Be Vietnam Pro", "Segoe UI", system-ui, sans-serif;
      display: grid; grid-template-columns: var(--wl) 5px minmax(0, 1fr) 5px var(--wr); grid-template-rows: 44px minmax(0, 1fr) 5px var(--ht);
      grid-template-areas: "hd hd hd hd hd" "lf g1 st g2 rt" "g3 g3 g3 g3 g3" "ft ft ft ft ft"; }
    #xapp[data-theme="am"] { --bg:#14110f; --panel:#1d1916; --panel2:#27211c; --line:#3a312a; --text:#f1ebe4; --muted:#a39685; --acc:#f2a154; --acc2:#c9772a; }
    #xapp[data-theme="sang"] { --bg:#eef1f5; --panel:#ffffff; --panel2:#f3f5f9; --line:#d7dde6; --text:#18202c; --muted:#657186; --acc:#1f6fd1; --acc2:#1557a8; }
    #xapp *, #xapp *::before, #xapp *::after { box-sizing: border-box; }
    #xapp.keo { user-select: none; }
    #xapp button, #xapp select, #xapp input, #xapp textarea { font: inherit; color: inherit; margin: 0; }
    #xapp button { background: var(--panel2); border: 1px solid var(--line); border-radius: 6px; padding: 5px 10px; cursor: pointer; font-weight: 600; }
    #xapp button:hover:not(:disabled) { border-color: var(--acc); }
    #xapp button:disabled { opacity: .45; cursor: default; }
    #xapp button.main { background: var(--acc2); border-color: var(--acc); color: #fff; font-weight: 700; }
    #xapp button.act, #xapp button.on { border-color: var(--acc); color: var(--acc); }
    #xapp button.main.act { color: #fff; }
    #xapp select, #xapp input[type=number], #xapp input[type=text], #xapp textarea { background: var(--panel2); border: 1px solid var(--line); border-radius: 6px; padding: 5px 8px; color: var(--text); }
    #xapp input[type=range], #xapp input[type=checkbox], #xapp input[type=radio] { accent-color: var(--acc); }
    #xapp .muted { color: var(--muted); font-size: .92em; } #xapp .num, #xapp .pill, #xapp .muted.num { font-variant-numeric: tabular-nums; }
    #xapp kbd { background: var(--panel2); border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; font: inherit; font-size: .85em; }
    #xapp h4 { margin: 14px 0 8px; font-size: .85em; letter-spacing: .8px; text-transform: uppercase; color: var(--muted); }
    #xapp h4:first-child { margin-top: 0; }

    #xhead { grid-area: hd; display: flex; align-items: center; gap: 12px; padding: 0 14px; background: var(--panel); border-bottom: 1px solid var(--line); position: relative; min-width: 0; }
    #xhead .logo { font-weight: 800; letter-spacing: .3px; white-space: nowrap; } #xhead .logo span { color: var(--acc); }
    #xhead .xtit { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    #xhead .sp { flex: 1; }
    #xapp .pill { padding: 2px 9px; border-radius: 99px; background: var(--panel2); border: 1px solid var(--line); font-size: .92em; white-space: nowrap; }
    #xhead .gear { font-size: 17px; padding: 3px 9px; }
    #xpop { position: absolute; right: 14px; top: 42px; width: 330px; max-width: calc(100vw - 28px); background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px; box-shadow: 0 14px 40px rgba(0,0,0,.45); z-index: 30; display: none; max-height: calc(100vh - 60px); overflow: auto; }
    #xpop.on { display: block; }

    #xapp .gut { background: var(--line); cursor: col-resize; position: relative; z-index: 5; } #xapp .gut.h { cursor: row-resize; }
    #xapp .gut:hover, #xapp .gut.act { background: var(--acc); }
    #xapp .gut[data-g=wl] { grid-area: g1; } #xapp .gut[data-g=wr] { grid-area: g2; } #xapp .gut[data-g=ht] { grid-area: g3; }
    #xapp .col { background: var(--panel); display: flex; flex-direction: column; min-width: 0; min-height: 0; }
    #xleft { grid-area: lf; }
    #xapp .hd { padding: 9px 12px; font-size: .85em; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 8px; }
    #xapp .hd input[type=text] { flex: 1; min-width: 0; padding: 3px 7px; text-transform: none; letter-spacing: 0; font-weight: 400; }
    #xapp .hd label { text-transform: none; letter-spacing: 0; white-space: nowrap; display: flex; gap: 4px; align-items: center; cursor: pointer; font-weight: 400; }
    #xapp .scroll { overflow: auto; flex: 1; min-height: 0; }
    #xapp .shot .sid { display: flex; align-items: center; gap: 4px; }
    #xapp .shot .sb { display: none; gap: 3px; } #xapp .shot.on .sb { display: inline-flex; }
    #xapp .shot .sb button { padding: 0 6px; font-size: .85em; line-height: 1.5; }
    #xapp .shot { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; padding: 6px 12px; border-bottom: 1px solid color-mix(in srgb, var(--line) 55%, transparent); cursor: pointer; }
    #xapp .shot:hover { background: var(--panel2); }
    #xapp .shot.on { background: color-mix(in srgb, var(--acc) 16%, var(--panel)); box-shadow: inset 3px 0 0 var(--acc); }
    #xapp .shot .tx { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--muted); font-size: .92em; }
    #xapp .cnt { display: inline-block; min-width: 17px; text-align: center; border-radius: 9px; background: var(--bad); color: #fff; font-size: .8em; font-weight: 700; padding: 0 4px; }
    #xapp .sec { padding: 8px 12px; color: var(--muted); }

    #xstage { grid-area: st; display: grid; grid-template-rows: minmax(0, 1fr) auto; min-height: 0; min-width: 0; background: var(--bg); }
    #xview { display: flex; align-items: center; justify-content: center; min-height: 0; min-width: 0; padding: 14px; position: relative; overflow: hidden; }
    #xwrap { position: relative; flex: none; box-shadow: 0 10px 40px rgba(0,0,0,.5); border-radius: 8px; overflow: hidden; cursor: pointer; }
    #xwrap > #root { transform-origin: 0 0; position: absolute; left: 0; top: 0; }
    #xbadge { position: absolute; top: 14px; left: 14px; display: flex; gap: 6px; flex-wrap: wrap; z-index: 4; pointer-events: none; }
    #xbadge.off { display: none; }
    #xann { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 5; display: none; touch-action: none; cursor: crosshair; }
    #xwrap.annot { cursor: crosshair; outline: 3px solid var(--bad); }
    #xwrap.annot #xann { display: block; }
    #xapp .transport { display: flex; align-items: center; gap: 8px 6px; padding: 8px 14px; background: var(--panel); border-top: 1px solid var(--line); flex-wrap: wrap; }
    #xapp .grp { display: flex; align-items: center; gap: 4px; padding-right: 10px; border-right: 1px solid var(--line); }
    #xapp .grp:last-child { border-right: 0; padding-right: 0; } #xapp .grp.grow { flex: 1; min-width: 150px; }
    #xapp .grp .lb { font-size: .85em; color: var(--muted); text-transform: uppercase; letter-spacing: .6px; margin-right: 3px; }
    #xapp #xplay { min-width: 84px; background: var(--acc2); border-color: var(--acc); color: #fff; }
    #xapp #xseek { flex: 1; min-width: 80px; } #xtime { min-width: 54px; text-align: right; font-variant-numeric: tabular-nums; }
    #xframe { width: 78px; } #xshsel { font-weight: 700; min-width: 70px; max-width: 110px; }
    #xapp .xsh, #xapp .xstep { padding: 5px 9px; }
    #xshinfo, #xftot, #xshot { font-variant-numeric: tabular-nums; }

    #xannbox { position: fixed; left: 0; top: 0; width: min(320px, calc(100vw - 16px)); max-height: calc(100vh - 16px); overflow: auto; background: var(--panel); border: 1px solid var(--acc); border-radius: 10px; padding: 0; box-shadow: 0 14px 40px rgba(0,0,0,.55); z-index: 40; display: none; flex-direction: column; }
    #xannbox.on { display: flex; }
    #xannbox .dh { display: flex; align-items: center; gap: 4px; padding: 6px 8px 6px 12px; cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; background: color-mix(in srgb, var(--acc) 22%, var(--panel)); border-radius: 9px 9px 0 0; position: sticky; top: 0; }
    #xannbox.drag .dh { cursor: grabbing; } #xannbox.drag, #xannbox.drawing { pointer-events: none; }
    #xannbox .dh button { padding: 2px 8px; flex: none; }
    #xannbox .bd { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px 12px; }
    #xannbox.min .bd { display: none; } #xannbox.min .dh { border-radius: 9px; }
    #xannbox .tools { display: flex; gap: 5px; flex-wrap: wrap; }
    #xannbox .tl { padding: 4px 8px; }
    #xannbox .tl[data-tool].act { background: var(--bad); border-color: var(--bad); color: #fff; }
    #xnote { width: 100%; min-height: 64px; resize: vertical; }
    #xmic.rec { background: var(--bad); color: #fff; border-color: var(--bad); }

    #xright { grid-area: rt; display: grid; grid-template-columns: 58px minmax(0, 1fr); min-height: 0; min-width: 0; background: var(--panel); }
    #xapp .rail { border-right: 1px solid var(--line); display: flex; flex-direction: column; gap: 2px; padding: 6px 4px; background: var(--panel2); }
    #xapp .tab { padding: 9px 2px; text-align: center; cursor: pointer; color: var(--muted); border-radius: 7px; font-size: .78em; font-weight: 600; position: relative; }
    #xapp .tab i { display: block; font-style: normal; font-size: 18px; line-height: 1.2; }
    #xapp .tab:hover { background: var(--panel); }
    #xapp .tab.on { color: var(--text); background: var(--panel); box-shadow: inset 3px 0 0 var(--acc); }
    #xapp .tab .cnt { position: absolute; top: 3px; right: 3px; }
    #xright > .scroll { position: relative; }
    #xapp .pane { display: none; padding: 12px; } #xapp .pane.on { display: block; }
    #xapp .row { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
    #xapp .row > .l { width: 92px; color: var(--muted); flex: none; }
    #xapp .row > :not(.l) { min-width: 0; } #xapp .row > select, #xapp .row > input[type=range] { flex: 1; }
    #xapp .sw { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 6px; margin-bottom: 8px; }
    #xapp .chk, #xapp .sw label { display: flex; align-items: center; gap: 7px; padding: 6px 8px; background: var(--panel2); border: 1px solid var(--line); border-radius: 6px; cursor: pointer; }
    #xapp .sfxrow { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    #xapp .sfxrow .chk { flex: 1.4; } #xapp .sfxrow input[type=range] { flex: 1; min-width: 70px; }
    #xapp .sfxrow .pct { width: 38px; text-align: right; color: var(--muted); font-size: .9em; font-variant-numeric: tabular-nums; }
    #xapp .fxgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 6px; }
    #xbar { height: 8px; background: var(--panel2); border-radius: 4px; overflow: hidden; margin: 10px 0; }
    #xbar > div { height: 100%; width: 0; background: var(--acc); transition: width .2s; }
    #xstat { min-height: 38px; white-space: pre-line; }
    #xnotes { display: flex; flex-direction: column; gap: 6px; }
    #xnotes .nt { display: flex; gap: 8px; align-items: center; background: var(--panel2); border: 1px solid var(--line); border-left: 3px solid var(--warn); border-radius: 6px; padding: 5px; cursor: pointer; }
    #xnotes .nt:hover { border-color: var(--acc); border-left-color: var(--warn); }
    #xnotes .nt img { width: 36px; height: 64px; object-fit: cover; border-radius: 3px; flex: none; background: #000; }
    #xnotes .nt .tx { flex: 1; min-width: 0; font-size: .95em; line-height: 1.35; }
    #xnotes .nt .tx b { font-variant-numeric: tabular-nums; }
    #xnotes .nt .tx span { display: block; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #xnotes .nt .del { padding: 2px 8px; }
    #xclst.ok { color: var(--ok); } #xclst.no { color: var(--warn); }

    #xfoot { grid-area: ft; background: var(--panel); display: flex; flex-direction: column; padding: 6px 14px 8px; gap: 3px; position: relative; min-height: 0; min-width: 0; }
    #xapp .trk { display: grid; grid-template-columns: 74px minmax(0, 1fr); align-items: center; gap: 8px; min-height: 0; flex: 1; }
    #xapp .trk.fix { flex: none; height: 18px; }
    #xapp .trk .nm { font-size: .82em; color: var(--muted); text-transform: uppercase; letter-spacing: .6px; white-space: nowrap; overflow: hidden; }
    #xapp .ruler { display: flex; justify-content: space-between; font-size: .85em; color: var(--muted); font-variant-numeric: tabular-nums; }
    #xapp .lane { height: 100%; min-height: 8px; display: flex; gap: 1px; border-radius: 4px; overflow: hidden; background: var(--panel2); position: relative; }
    #xapp .blk { height: 100%; background: color-mix(in srgb, var(--acc) 30%, var(--panel2)); min-width: 1px; }
    #xapp .blk:nth-child(even) { background: color-mix(in srgb, var(--acc) 20%, var(--panel2)); }
    #xapp .blk.on { background: var(--acc); }
    #xapp .lane canvas { width: 100%; height: 100%; display: block; }
    #xlmk { overflow: visible; background: none; }
    #xlmk b { position: absolute; top: 0; width: 14px; height: 16px; margin-left: -7px; background: var(--warn); color: #000; font-size: 10px; line-height: 14px; text-align: center; border-radius: 3px 3px 7px 7px; cursor: pointer; }
    #xscrub { position: absolute; left: 96px; right: 14px; top: 6px; bottom: 6px; cursor: ew-resize; z-index: 3; }
    #xhead2, #xghost { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; pointer-events: none; }
    #xhead2 { background: #fff; box-shadow: 0 0 6px var(--acc); } #xhead2::before { content: ""; position: absolute; top: -3px; left: -5px; border: 6px solid transparent; border-top-color: var(--acc); }
    #xghost { background: var(--muted); opacity: .6; display: none; }
    #xtip { position: absolute; top: 0; transform: translateX(-50%); background: var(--panel2); border: 1px solid var(--line); border-radius: 5px; padding: 1px 7px; font-size: .85em; white-space: nowrap; display: none; pointer-events: none; z-index: 6; }

    @media (max-width: 1099px), (max-aspect-ratio: 1/1) {
      #xapp { grid-template-columns: minmax(0, 1fr); grid-template-rows: 44px minmax(0, 1fr) minmax(120px, 38vh) 5px min(var(--ht), 150px); grid-template-areas: "hd" "st" "rt" "g3" "ft"; }
      #xapp #xleft, #xapp .gut[data-g=wl], #xapp .gut[data-g=wr], #xhead .pill, #xhead .xtit { display: none; }
      #xright { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
      #xapp .rail { flex-direction: row; border-right: 0; border-bottom: 1px solid var(--line); overflow-x: auto; }
      #xapp .tab { flex: 1; padding: 4px 6px; white-space: nowrap; } #xapp .tab i { display: inline; font-size: 14px; margin-right: 3px; }
      #xapp .pane { display: block; border-bottom: 1px solid var(--line); }
      #xapp .transport { padding: 6px 10px; } #xapp .grp { border-right: 0; padding-right: 4px; }
    }
  `;
  document.head.appendChild(css);
  const wrap = document.createElement('div'); wrap.id = 'xwrap';
  root.parentNode.insertBefore(wrap, root); wrap.appendChild(root);
  const annCv = document.createElement('canvas'); annCv.id = 'xann'; wrap.appendChild(annCv);   // lớp vẽ ghi chú — chỉ trên màn hình, không bao giờ vào video xuất
  const app = document.createElement('div'); app.id = 'xapp';
  const stepBtn = (d) => `<button class="xstep" data-d="${d}" title="${d < 0 ? 'Lùi' : 'Tới'} ${Math.abs(d)} frame">${d < 0 ? '◀' : ''}${Math.abs(d)}${d > 0 ? '▶' : ''}</button>`;
  app.innerHTML = `
    <header id="xhead">
      <div class="logo">3JS <span>Studio</span></div>
      <b class="xtit">${escapeHtml(title)}</b>
      <span class="pill num" id="xsumm">${W0}×${H0} · ${FPS} fps · ${fmt(DUR)}</span>
      <div class="sp"></div>
      <button class="main" id="xhgo">⬇ Xuất MP4</button>
      <button class="gear" id="xgear" title="Cài đặt studio">⚙</button>
      <div id="xpop">
        <h4>Màu khung</h4>
        <div class="row"><button data-th="">Xanh đêm</button><button data-th="am">Than ấm</button><button data-th="sang">Sáng</button></div>
        <h4>Hiển thị</h4>
        <div class="row"><span class="l">Cỡ chữ</span><input type="range" id="xfs" min="11" max="16" value="13"></div>
        <div class="sw">
          <label data-rowchk="xt-mk"><input type="checkbox" checked data-trk="xt-mk"> Hàng Marker</label>
          <label data-rowchk="xt-shot"><input type="checkbox" checked data-trk="xt-shot"> Hàng Shot</label>
          <label data-rowchk="xt-voice"><input type="checkbox" checked data-trk="xt-voice"> Hàng Giọng</label>
          <label data-rowchk="xt-sfx"><input type="checkbox" checked data-trk="xt-sfx"> Hàng Tiếng động</label>
          <label><input type="checkbox" checked id="xbadgechk"> Nhãn shot trên hình</label>
        </div>
        <h4>Bố cục</h4>
        <div class="row"><button id="xreset">Đặt lại kích thước khung</button></div>
      </div>
    </header>

    <aside id="xleft" class="col">
      <div class="hd">Shot <input type="text" id="xfind" placeholder="tìm mã / lời…"><label title="Chỉ hiện những shot đã có ghi chú"><input type="checkbox" id="xonlyerr"> có ghi chú</label></div>
      <div class="scroll" id="xshots"></div>
    </aside>
    <div class="gut" data-g="wl"></div>

    <section id="xstage">
      <div id="xview">
        <div id="xbadge"><span class="pill" id="xbshot"></span><span class="pill" id="xbfr"></span><span class="pill" id="xbtime"></span></div>
        <div id="xannbox">
          <div class="dh" id="xmdh" title="Kéo thanh này để di chuyển khung"><span aria-hidden="true">⠿</span><b id="xmtitle" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></b><button id="xmreset" title="Về vị trí mặc định (bên phải video)">⌖</button><button id="xmmin" title="Thu gọn / mở rộng">–</button><button id="xmclose" title="Huỷ (Esc)">✕</button></div>
          <div class="bd">
          <div class="muted">Vẽ lên khung hình để chỉ chỗ lỗi (video tạm dừng). Nét vẽ KHÔNG nằm trong file MP4 xuất ra.</div>
          <div class="tools" id="xanntools"><button class="tl act" data-tool="pen">✏ Bút</button><button class="tl" data-tool="ell">◯ Elip</button><button class="tl" data-tool="arrow">➚ Mũi tên</button><button class="tl" id="xundo">↶ Hoàn tác</button><button class="tl" id="xclr">🗑 Xoá nét</button></div>
          <textarea id="xnote" placeholder="Lỗi là gì? (gõ hoặc bấm 🎤 để nói · Ctrl+Enter lưu · Esc huỷ)"></textarea>
          <div class="row" style="margin:0"><label class="chk" style="flex:2"><input id="xscope" type="checkbox" checked> Lỗi của cả shot</label><button id="xmic">🎤 Nói</button><button id="xsave" class="main">Lưu marker</button></div>
          <div id="xmicst" class="muted"></div>
          </div>
        </div>
      </div>
      <div class="transport">
        <div class="grp"><button id="xplay">▶ Xem</button></div>
        <div class="grp" id="xshotrow" style="display:none"><span class="lb">Shot</span><button class="xsh" data-d="-1" title="Shot trước (phím [)">◀</button><select id="xshsel" title="Nhảy tới shot"></select><button class="xsh" data-d="1" title="Shot sau (phím ])">▶</button><button class="xsh" data-d="0" title="Về đầu shot này">↺</button><span id="xshinfo" class="muted"></span></div>
        <div class="grp"><span class="lb">Frame</span>${stepBtn(-10)}${stepBtn(-1)}<input id="xframe" type="number" min="0" step="1" value="0">${stepBtn(1)}${stepBtn(10)}<span id="xftot" class="muted"></span><span id="xshot" class="muted"></span></div>
        <div class="grp"><button id="xannbtn" title="Đánh dấu lỗi tại đây (phím M)">⚑ Marker <kbd>M</kbd></button></div>
        <div class="grp grow"><input id="xseek" type="range" min="0" max="${DUR}" step="0.001" value="0"><span id="xtime">0:00.0</span></div>
      </div>
    </section>

    <div class="gut" data-g="wr"></div>
    <aside id="xright">
      <div class="rail">
        <div class="tab on" data-p="xp1"><i>👁</i>Xem</div>
        <div class="tab" data-p="xp2" id="xtab2"><i>🔊</i>Âm thanh</div>
        <div class="tab" data-p="xp3" id="xtab3"><i>✨</i>Hiệu ứng</div>
        <div class="tab" data-p="xp4"><i>⚑</i>Ghi chú<span class="cnt" id="xncnt0" style="display:none"></span></div>
        <div class="tab" data-p="xp5"><i>⬇</i>Xuất</div>
      </div>
      <div class="scroll">
        <div class="pane on" id="xp1">
          <h4>Ngôn ngữ và giọng</h4>
          <div class="row"><span class="l">Ngôn ngữ</span><select id="xlang"><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div>
          <div class="row" id="xvidrow"><span class="l">Giọng</span><select id="xvid"></select></div>
          <div class="sw"><label class="chk"><input id="xsubs" type="checkbox" checked> Phụ đề</label><label class="chk"><input id="xvoice" type="checkbox" checked> Giọng đọc</label><label class="chk" id="xcredrow" style="display:none"><input id="xcred" type="checkbox"> Ghi công</label></div>
          <h4>Shot đang xem</h4>
          <div class="row"><span class="l">Loại</span><span id="xiloai">—</span></div>
          <div class="row"><span class="l">Thời lượng</span><span class="num" id="xidur">—</span></div>
          <div class="row"><span class="l">Lời</span><span id="xitx" class="muted">—</span></div>
        </div>
        <div class="pane" id="xp2">
          <div id="xsfxbox" style="display:none"><h4>Âm lượng từng lớp</h4><div id="xsfx"></div></div>
          <h4>Xử lý</h4>
          <div id="xaudopt" class="sw">
            <label class="chk" id="xduckrow" style="display:none"><input id="xduck" type="checkbox" checked> Giảm nhạc khi có lời</label>
            <label class="chk"><input id="xloud" type="checkbox" checked> Chuẩn âm lượng YouTube (−14 LUFS)</label></div>
        </div>
        <div class="pane" id="xp3">
          <div id="xfxbox" style="display:none"><h4>Hiệu ứng hình</h4><div id="xfx" class="fxgrid"></div></div>
          <div id="xfxnone" class="muted">Tập này chưa có hiệu ứng hình tuỳ chọn.</div>
        </div>
        <div class="pane" id="xp4">
          <div class="row"><button class="main" id="xsendc" style="flex:2">➤ Gửi tới Claude</button><button id="xsend" style="flex:1" title="Tải file góp ý .json về máy">⬇ Xuất file</button></div>
          <div class="muted" id="xclst" style="margin:-3px 0 4px">Đang dò máy nhận…</div>
          <div class="muted" id="xsendst" style="margin-bottom:10px;white-space:pre-line"></div>
          <h4>Marker và ghi chú (<span id="xncnt">0</span>) — bấm <kbd>M</kbd> để thêm</h4>
          <div id="xnotes"></div>
        </div>
        <div class="pane" id="xp5">
          <h4>Xuất MP4 bằng GPU máy này</h4>
          <div class="row"><span class="l">Độ phân giải</span><select id="xres">${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}"${k === '2k' ? ' selected' : ''}>${p.label}</option>`).join('')}</select></div>
          <div class="row"><span class="l">Đoạn (giây)</span>
            <input id="xs" type="number" min="0" max="${DUR}" step="0.1" value="0" style="width:72px"> –
            <input id="xe" type="number" min="0" max="${DUR}" step="0.1" value="${DUR.toFixed(2)}" style="width:80px"></div>
          <button id="xgo" class="main" style="width:100%;padding:10px">⬇ Xuất MP4</button>
          <button id="xstop" style="display:none;width:100%;margin-top:6px">Dừng</button>
          <div id="xbar"><div></div></div>
          <div id="xstat" class="muted"></div>
          <div class="muted">Render bằng card đồ hoạ của máy bạn, không cần mạng. Giữ tab này mở trong lúc xuất.
            Chrome/Edge sẽ hỏi chỗ lưu file trước khi bắt đầu.</div>
        </div>
      </div>
    </aside>

    <div class="gut h" data-g="ht"></div>
    <footer id="xfoot">
      <div class="trk fix"><span class="nm"></span><div class="ruler" id="xruler"></div></div>
      <div class="trk fix" id="xt-mk"><span class="nm">Marker</span><div class="lane" id="xlmk"></div></div>
      <div class="trk" id="xt-shot" style="display:none"><span class="nm">Shot</span><div class="lane" id="xlshot"></div></div>
      <div class="trk" id="xt-voice" style="display:none"><span class="nm">Giọng</span><div class="lane"><canvas id="xcvvoice" width="1600" height="40"></canvas></div></div>
      <div class="trk" id="xt-sfx" style="display:none"><span class="nm">Tiếng động</span><div class="lane"><canvas id="xcvsfx" width="1600" height="40"></canvas></div></div>
      <div id="xscrub"><div id="xghost"></div><div id="xhead2"></div><div id="xtip"></div></div>
    </footer>`;
  document.body.appendChild(app);
  $('xview').appendChild(wrap);
  function $(id) { return document.getElementById(id); }
  if (!('VideoEncoder' in window)) { $('xgo').disabled = true; $('xhgo').disabled = true; $('xstat').textContent = 'Trình duyệt này không có WebCodecs → mở bằng Chrome hoặc Edge bản mới.'; }

  // thu #root vừa chỗ trống của ô giữa (co theo kéo viền / đổi cỡ cửa sổ)
  function fit() {
    const v = $('xview'), availH = v.clientHeight - 28, availW = v.clientWidth - 28;
    if (availH < 20 || availW < 20) return;
    const k = Math.max(0.05, Math.min(availH / H0, availW / W0));
    root.style.transform = `scale(${k})`;
    wrap.style.width = `${W0 * k}px`; wrap.style.height = `${H0 * k}px`;
  }
  addEventListener('resize', fit); fit();
  try { new ResizeObserver(fit).observe($('xview')); } catch {}
  let syncUi = () => {}, syncNotesUi = () => {};   // gán lại ở khối STUDIO bên dưới (sau khi có ghi chú / danh sách shot)
  const xload = (m) => document.documentElement.setAttribute('data-xload', m);   // chữ trên lớp che của bản gộp (tools/bundle.mjs)
  xload('Đang tải cảnh…');

  // chờ cảnh sẵn sàng
  $('xstat').textContent = 'Đang tải cảnh…';
  while (!window.__ready) await sleep(50);
  $('xstat').textContent = '';
  const stage = window.__stage;
  let busy = false;
  // Tuỳ chọn ngôn ngữ / phụ đề / giọng đọc (index.html của tập cung cấp window.setOptions; không có thì ẩn)
  const hasOpts = typeof window.setOptions === 'function';
  if (!hasOpts) { $('xlang').closest('.row').style.display = 'none'; $('xsubs').closest('.row').style.display = 'none'; }
  else {
    const o = window.getOptions(); $('xlang').value = o.lang; $('xsubs').checked = o.subs; $('xvoice').checked = o.voice;
    if (!document.querySelector('audio[data-lang="en"]')) $('xlang').querySelector('[value=en]').remove();
    if (o.credits != null) { $('xcredrow').style.display = ''; $('xcred').checked = !!o.credits; }   // ảnh ghi công 3 giây cuối (engine/credits.js)
  }
  const opts = () => (hasOpts ? window.getOptions() : { lang: 'vi', subs: true, voice: true });
  // giọng đọc đang chọn (null nếu tắt giọng)
  const voiceEl = () => { const o = opts(); if (!o.voice) return null; return document.querySelector(`audio[data-lang="${o.lang}"]`) || document.querySelector('audio'); };
  let audioEl = voiceEl();
  // ô chọn giọng: chỉ giọng của ngôn ngữ đang chọn
  const fillVoices = () => {
    const o = hasOpts ? window.getOptions() : null, list = o && o.voices ? o.voices.filter((v) => v.lang === o.lang) : [];
    $('xvidrow').style.display = list.length ? '' : 'none';
    $('xvid').innerHTML = list.map((v) => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.label)}</option>`).join('');
    if (list.length) $('xvid').value = o.vid[o.lang];
  };
  fillVoices();
  const applyOpts = (ev) => {
    if (!hasOpts) return;
    const wasPlaying = playing; if (wasPlaying) pause();
    const o = { lang: $('xlang').value, subs: $('xsubs').checked, voice: $('xvoice').checked };
    if ($('xcredrow').style.display !== 'none') o.credits = $('xcred').checked;
    if (ev && ev.target && ev.target.id === 'xvid') o.vid = $('xvid').value;
    window.setOptions(o);
    // ảnh ghi công chỉ tải khi bật lần đầu: đợi tải xong rồi vẽ lại khung; tải lỗi (không có file) → ô tự bỏ chọn
    if (window.__credits && o.credits) window.__credits.ready.then(() => { $('xcred').checked = window.__credits.on; show(+$('xseek').value); });
    if (ev && ev.target && ev.target.id === 'xlang') fillVoices();
    audioEl = voiceEl();
    show(+$('xseek').value);
    if (ev && ev.target && ev.target.id === 'xlang') refreshVoiceRow();
    if (wasPlaying) play();
  };
  for (const id of ['xlang', 'xvid', 'xsubs', 'xvoice', 'xcred']) $(id).onchange = applyOpts;
  // hiệu ứng hình: mỗi ô = 1 hiệu ứng của engine/post.js
  const fxOpts = hasOpts ? window.getOptions() : null;
  if (fxOpts && fxOpts.fx) {
    $('xfxbox').style.display = ''; $('xfxnone').style.display = 'none';
    $('xfx').innerHTML = Object.entries(fxOpts.fx).map(([k, on]) =>
      `<label class="chk"><input type="checkbox" data-fx="${k}"${on ? ' checked' : ''}> ${escapeHtml((fxOpts.fxLabels || {})[k] || k)}</label>`).join('');
    $('xfx').onchange = (e) => { const k = e.target.dataset.fx; if (!k) return; window.setOptions({ fx: { [k]: e.target.checked } }); show(+$('xseek').value); };
  }

  // ---- xem trước (thời gian thực theo giọng đọc; chỉ để xem, không dùng khi xuất) ----
  let stopAt = null, stopFrame = 0, noteFromList = false, playing = false, raf = 0, t0 = 0, wall0 = 0, annotating = false;
  const NF = Math.round(DUR * FPS);   // tổng số frame; frame f hiển thị ở t = f / FPS
  const show = (t) => {
    window.renderAt(t); $('xseek').value = t; $('xtime').textContent = fmt(t, true);
    const f = Math.min(NF - 1, Math.round(t * FPS)); if (document.activeElement !== $('xframe')) $('xframe').value = f;
    $('xftot').textContent = '/ ' + (NF - 1);
    try {
      const si = shotInfo(t); $('xshot').textContent = si ? '· ' + si.id : '';
      if (si) { if ($('xshsel').value !== si.id) $('xshsel').value = si.id; $('xshinfo').textContent = `${si.index + 1}/${si.count} · khung ${si.fIn + 1}/${si.fCount}`; }
    } catch (e) {}
    try { syncUi(t); } catch (e) { console.warn('studio ui', e); }
  };
  // ---- theo dõi theo SHOT: shot đang xem, khung thứ mấy trong shot; bắt lỗi theo shot là mặc định, theo frame khi cần chi tiết ----
  const fOf = (t) => Math.ceil(t * FPS - 1e-6);
  const shotInfo = (t) => {
    const tl = window.__shots; if (!tl || !tl.list || !tl.list.length) return null;
    const sh = tl.at(Math.min(Math.max(0, t), DUR - 1e-4)).shot; if (!sh) return null;
    const f0 = fOf(sh.t0), f1 = Math.max(f0, fOf(sh.t1) - 1);   // khung đầu của shot = khung đầu tiên có t ≥ t0
    const f = Math.min(NF - 1, Math.round(t * FPS));
    return { id: sh.id, index: sh.index, count: tl.list.length, f0, f1, fCount: f1 - f0 + 1, fIn: Math.max(0, Math.min(f1 - f0, f - f0)), t0: sh.t0 };
  };
  const goShot = (i) => { const tl = window.__shots; if (!tl || !tl.list) return; i = Math.max(0, Math.min(tl.list.length - 1, i)); goFrame(fOf(tl.list[i].t0)); };
  const initShots = () => {
    const tl = window.__shots; if (!tl || !tl.list || !tl.list.length) return;
    $('xshotrow').style.display = 'flex';
    $('xshsel').innerHTML = tl.list.map((x) => `<option value="${x.id}">${x.id}</option>`).join('');
    $('xshsel').onchange = (e) => { const i = tl.list.findIndex((x) => x.id === e.target.value); if (i >= 0) goShot(i); e.target.blur(); };
    document.querySelectorAll('.xsh').forEach((b) => { b.onclick = () => { const si = shotInfo(+$('xseek').value); if (si) goShot(si.index + (+b.dataset.d)); }; });
    addEventListener('keydown', (e) => { if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return; const si = shotInfo(+$('xseek').value); if (!si) return;
      if (e.key === '[') goShot(si.fIn > 0 ? si.index : si.index - 1); else if (e.key === ']') goShot(si.index + 1); });
  };
  // đi từng frame: nút ◀10 ◀5 ◀1 1▶ 5▶ 10▶, ô số frame, phím ← → (giữ Shift = 10 frame)
  const goFrame = (f) => { if (busy) return; if (playing) pause(); f = Math.max(0, Math.min(NF - 1, Math.round(f))); show(f / FPS); };
  const curFrame = () => Math.round(+$('xseek').value * FPS);
  // giảm nhạc khi có lời (xem trước): đường bao giọng đọc tính 1 lần từ chính file giọng đang chọn (xem duckEnvelope)
  const musicLayers = () => sfxLayers.filter((L) => L.id === 'nhac');
  const envCache = new Map();   // src giọng → đường bao | Promise
  function voiceEnvelope() {
    const v = audioEl; if (!v || !$('xduck').checked) return null;
    const src = v.currentSrc || v.src, c = envCache.get(src);
    if (c && !c.then) return c;
    if (!c) envCache.set(src, loadAudio(src).then((b) => { const e = b ? duckEnvelope(b) : null; envCache.set(src, e); return e; }).catch(() => { envCache.set(src, null); return null; }));
    return null;   // đang tải → tạm chưa giảm
  }
  const nowT = () => (audioEl && !audioEl.paused ? audioEl.currentTime : t0 + (performance.now() - wall0) / 1000);
  function applyMusicVolume(t) {
    const ml = musicLayers(); if (!ml.length) return;
    const env = voiceEnvelope(), d = env ? duckAt(env, t) : 1;
    for (const L of ml) if (L.on) L.el.volume = Math.max(0, Math.min(1, L.gain * d));
  }
  function loop() {
    const t = nowT();
    if (stopAt !== null && t >= stopAt - 1e-4) { const lf = stopFrame; pause(); show(lf / FPS); return; }
    if (t >= DUR) { pause(); show(DUR - 1e-3); return; }
    applyMusicVolume(t);
    show(t); raf = requestAnimationFrame(loop);
  }
  // LỚP TIẾNG ĐỘNG: mỗi <audio data-sfx-layer> = 1 lớp (nền, bước chân, khoảnh khắc…) — bật/tắt + âm lượng riêng
  const sfxLayers = [...document.querySelectorAll('audio[data-sfx-layer]')].map((el) => ({ el, id: el.dataset.sfxLayer, label: el.dataset.label || el.dataset.sfxLayer, on: true, gain: 1 }));
  if (sfxLayers.length) {
    $('xsfxbox').style.display = '';
    if (sfxLayers.some((L) => L.id === 'nhac')) $('xduckrow').style.display = '';
    $('xsfx').innerHTML = sfxLayers.map((L, i) => `<div class="sfxrow"><label class="chk"><input type="checkbox" data-sl="${i}" checked> ${escapeHtml(L.label)}</label>` +
      `<input type="range" min="0" max="150" step="5" value="100" data-sv="${i}"><span class="pct" id="xsp${i}">100%</span></div>`).join('');
    $('xsfx').oninput = (e) => {
      const i = e.target.dataset.sv; if (i === undefined) return;
      sfxLayers[i].gain = e.target.value / 100; $('xsp' + i).textContent = e.target.value + '%';
      sfxLayers[i].el.volume = Math.min(1, sfxLayers[i].gain); if (playing) applyMusicVolume(nowT());
    };
    $('xsfx').onchange = (e) => {
      const i = e.target.dataset.sl; if (i === undefined) return;
      sfxLayers[i].on = e.target.checked; if (playing) { pause(); play(); }
    };
  }
  // trình phát đã đủ mục (giọng, tiếng động, hiệu ứng hình) và đã vẽ khung đầu → mới gỡ lớp che: không lộ bảng điều khiển dở dang
  document.getElementById('xpre')?.remove(); document.documentElement.removeAttribute('data-xload');
  function play() {
    if (busy) return; playing = true; $('xplay').textContent = '❚❚ Dừng';
    t0 = +$('xseek').value; if (t0 >= DUR - 0.05) t0 = 0; wall0 = performance.now();
    if (audioEl) { audioEl.currentTime = t0; audioEl.play().catch(() => {}); }
    for (const L of sfxLayers) if (L.on) { L.el.volume = Math.min(1, L.gain); L.el.currentTime = t0; L.el.play().catch(() => {}); }
    voiceEnvelope();   // bắt đầu tính đường bao giọng (nếu chưa có)
    raf = requestAnimationFrame(loop);
  }
  function pause() { stopAt = null; playing = false; $('xplay').textContent = '▶ Xem'; cancelAnimationFrame(raf); if (audioEl) audioEl.pause(); for (const L of sfxLayers) L.el.pause(); }
  $('xplay').onclick = () => (playing ? pause() : play());
  $('xduck').onchange = () => { if (playing) applyMusicVolume(nowT()); };
  $('xseek').oninput = () => { if (playing) pause(); show(+$('xseek').value); };
  try { initShots(); show(+$('xseek').value); } catch (e) { console.warn('shot ui', e); }
  addEventListener('keydown', (e) => { if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !annotating) { e.preventDefault(); playing ? pause() : play(); } });
  // phím M = Marker (ghi chú nhanh tại frame đang xem); Esc = huỷ bảng ghi chú
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && annotating) { setAnnotate(false); return; }
    if ((e.key === 'p' || e.key === 'P' || e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey && !annotating && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) {
      const si = shotInfo(+$('xseek').value); if (!si) return; e.preventDefault();
      if (e.key === 'p' || e.key === 'P') playShot(si.index); else noteShot(si.index);
      return;
    }
    if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) { e.preventDefault(); if (!annotating) { noteFromList = false; setAnnotate(true); } else $('xnote').focus(); }
  });
  for (const b of document.querySelectorAll('.xstep')) b.onclick = () => goFrame(curFrame() + +b.dataset.d);
  $('xframe').onchange = () => goFrame(+$('xframe').value);
  addEventListener('keydown', (e) => {
    if ((e.code !== 'ArrowLeft' && e.code !== 'ArrowRight') || ((e.target.tagName === 'INPUT' && e.target.type !== 'range') || e.target.tagName === 'TEXTAREA')) return;
    e.preventDefault(); goFrame(curFrame() + (e.code === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 10 : 1));
  });

  // ---- CLICK VÀO KHUNG = PHÁT / TẠM DỪNG ----
  wrap.addEventListener('click', () => { if (annotating || busy) return; playing ? pause() : play(); });

  // ---- GHI CHÚ LỖI: vẽ lên khung hình + ghi chú chữ/giọng nói → file góp ý .json (không bao giờ vào MP4) ----
  const AW = 540, AH = Math.round(540 * H0 / W0), CW = 450, CH = Math.round(450 * H0 / W0);
  annCv.width = AW; annCv.height = AH;
  const ag = annCv.getContext('2d');
  const epId = ((document.body.dataset && document.body.dataset.ep) || (title.match(/ep\d+/i) || [])[0] || (location.pathname.match(/ep\d+/i) || [])[0] || 'ep001').toLowerCase();
  const LSKEY = 'gopy:' + epId;
  let tool = 'pen', strokes = [], cur = null, notes = [];
  try { notes = JSON.parse(localStorage.getItem(LSKEY) || '[]') || []; } catch { notes = []; }
  const persist = () => {
    try { localStorage.setItem(LSKEY, JSON.stringify(notes)); return true; } catch {}
    try { localStorage.setItem(LSKEY, JSON.stringify(notes.map((n) => ({ ...n, img: '' })))); } catch {}
    return false;
  };
  function drawShape(g, st) {
    g.lineWidth = 5; g.strokeStyle = '#ff2b2b'; g.fillStyle = '#ff2b2b'; g.lineCap = 'round'; g.lineJoin = 'round';
    if (st.type === 'pen') {
      g.beginPath(); st.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (st.pts.length === 1) g.lineTo(st.pts[0][0] + 0.1, st.pts[0][1]);
      g.stroke();
    } else if (st.type === 'ell') {
      const [x0, y0] = st.a, [x1, y1] = st.b;
      g.beginPath(); g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.max(1, Math.abs(x1 - x0) / 2), Math.max(1, Math.abs(y1 - y0) / 2), 0, 0, Math.PI * 2); g.stroke();
    } else if (st.type === 'arrow') {
      const [x0, y0] = st.a, [x1, y1] = st.b, ang = Math.atan2(y1 - y0, x1 - x0), hl = 22;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - hl * Math.cos(ang - 0.45), y1 - hl * Math.sin(ang - 0.45));
      g.lineTo(x1 - hl * Math.cos(ang + 0.45), y1 - hl * Math.sin(ang + 0.45)); g.closePath(); g.fill();
    }
  }
  const redrawAnn = () => { ag.clearRect(0, 0, AW, AH); for (const st of strokes) drawShape(ag, st); if (cur) drawShape(ag, cur); };
  const apos = (e) => { const r = annCv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * AW, (e.clientY - r.top) / r.height * AH]; };
  annCv.addEventListener('pointerdown', (e) => {
    if (!annotating || e.button > 0) return; e.preventDefault(); annCv.setPointerCapture(e.pointerId);
    const p = apos(e); cur = tool === 'pen' ? { type: 'pen', pts: [p] } : { type: tool, a: p, b: p }; redrawAnn(); abox.classList.add('drawing');
  });
  annCv.addEventListener('pointermove', (e) => {
    if (!cur) return; const p = apos(e);
    if (cur.type === 'pen') cur.pts.push(p); else cur.b = p; redrawAnn();
  });
  const endStroke = () => { abox.classList.remove('drawing'); if (!cur) return; strokes.push(cur); cur = null; redrawAnn(); };
  annCv.addEventListener('pointerup', endStroke); annCv.addEventListener('pointercancel', endStroke);
  for (const b of document.querySelectorAll('#xanntools .tl[data-tool]')) b.onclick = () => {
    tool = b.dataset.tool; for (const o of document.querySelectorAll('#xanntools .tl[data-tool]')) o.classList.toggle('act', o === b);
  };
  $('xundo').onclick = () => { strokes.pop(); redrawAnn(); };
  $('xclr').onclick = () => { strokes = []; cur = null; redrawAnn(); };
  // ---- khung ghi chú NỔI: kéo bằng thanh tiêu đề, thu gọn, về mặc định (bên phải video), nhớ vị trí ----
  const abox = $('xannbox'), AM = 8, AKEY = 'xannpos';
  let aPos = null;   // {x,y,c} khi người dùng đã kéo/thu gọn; null = vị trí mặc định theo hộp bao video
  try { const j = JSON.parse(localStorage.getItem(AKEY) || 'null'); if (j && isFinite(j.x) && isFinite(j.y)) aPos = { x: +j.x, y: +j.y, c: !!j.c }; } catch {}
  const aSave = () => { try { aPos ? localStorage.setItem(AKEY, JSON.stringify(aPos)) : localStorage.removeItem(AKEY); } catch {} };
  const aApply = (x, y) => {
    const W = abox.offsetWidth, H = abox.offsetHeight;
    x = Math.max(AM, Math.min(x, innerWidth - W - AM)); y = Math.max(AM, Math.min(y, innerHeight - H - AM));
    abox.style.left = x + 'px'; abox.style.top = y + 'px'; return [x, y];
  };
  function placeAnn() {
    if (!annotating) return;
    if (aPos) { abox.classList.toggle('min', aPos.c); const [x, y] = aApply(aPos.x, aPos.y); aPos.x = x; aPos.y = y; return; }
    const r = wrap.getBoundingClientRect(); abox.classList.remove('min'); const W = abox.offsetWidth, H = abox.offsetHeight;
    let x, y, c = false;
    if (innerWidth - r.right - 12 - AM >= W) { x = r.right + 12; y = r.top; }                       // đủ chỗ bên phải video
    else if (r.bottom + 8 + H <= innerHeight - AM) { x = (innerWidth - W) / 2; y = r.bottom + 8; }   // màn hẹp: dưới video
    else { c = true; abox.classList.add('min'); x = (innerWidth - W) / 2; y = innerHeight; }          // hết chỗ: dán đáy, thu gọn
    abox.classList.toggle('min', c); aApply(x, y);
    if (c) { const b = abox.getBoundingClientRect(); if (b.top < r.bottom && b.bottom > r.top && b.left < r.right && b.right > r.left) abox.style.top = Math.max(AM, innerHeight - abox.offsetHeight - AM) + 'px'; }
  }
  addEventListener('resize', placeAnn);
  try { new ResizeObserver(placeAnn).observe(wrap); } catch {}
  $('xmreset').onclick = () => { aPos = null; aSave(); placeAnn(); };
  $('xmmin').onclick = () => {
    const b = abox.getBoundingClientRect(); const c = !abox.classList.contains('min');
    aPos = { x: b.left, y: b.top, c }; abox.classList.toggle('min', c); placeAnn(); aSave(); if (!c) $('xnote').focus();
  };
  { let d = null;
    $('xmdh').addEventListener('pointerdown', (e) => {
      if (e.button > 0 || e.target.closest('button')) return; e.preventDefault();
      const b = abox.getBoundingClientRect(); d = { id: e.pointerId, dx: e.clientX - b.left, dy: e.clientY - b.top };
      try { $('xmdh').setPointerCapture(e.pointerId); } catch {} abox.classList.add('drag');
    });
    $('xmdh').addEventListener('pointermove', (e) => {
      if (!d || e.pointerId !== d.id) return; const [x, y] = aApply(e.clientX - d.dx, e.clientY - d.dy); aPos = { x, y, c: abox.classList.contains('min') };
    });
    const dEnd = (e) => { if (!d) return; d = null; abox.classList.remove('drag'); aSave(); };
    $('xmdh').addEventListener('pointerup', dEnd); $('xmdh').addEventListener('pointercancel', dEnd);
  }
  function setAnnotate(on) {
    if (on && busy) return;
    annotating = on; if (on && playing) pause();
    wrap.classList.toggle('annot', on); $('xannbox').classList.toggle('on', on);
    $('xannbtn').classList.toggle('act', on);
    if (!on) { stopMic(); strokes = []; cur = null; redrawAnn(); $('xnote').value = ''; $('xmicst').textContent = ''; }
    else { try { syncUi(+$('xseek').value); } catch {} placeAnn(); if (!abox.classList.contains('min')) $('xnote').focus({ preventScroll: true }); }
  }
  $('xannbtn').onclick = () => { noteFromList = false; setAnnotate(!annotating); };
  $('xmclose').onclick = () => setAnnotate(false);
  $('xnote').addEventListener('keydown', (e) => { if (e.key === 'Escape') setAnnotate(false); else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNote(); } });

  // micro (Web Speech API)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, micBase = '';
  function stopMic() { listening = false; try { rec && rec.stop(); } catch {} $('xmic').classList.remove('rec'); $('xmic').textContent = '🎤 Nói'; }
  if (!SR) { $('xmic').disabled = true; $('xmicst').textContent = 'Trình duyệt này không hỗ trợ nhận dạng giọng nói (Web Speech API) → gõ ghi chú bằng tay, hoặc mở bằng Chrome/Edge.'; }
  $('xmic').onclick = () => {
    if (!SR) return;
    if (listening) { stopMic(); $('xmicst').textContent = ''; return; }
    rec = new SR(); rec.lang = 'vi-VN'; rec.continuous = true; rec.interimResults = true;
    micBase = $('xnote').value ? $('xnote').value.replace(/\s*$/, ' ') : '';
    rec.onresult = (e) => { let tx = ''; for (let i = 0; i < e.results.length; i++) tx += e.results[i][0].transcript; $('xnote').value = micBase + tx; };
    rec.onerror = (e) => { $('xmicst').textContent = 'Micro lỗi: ' + (e.error === 'not-allowed' ? 'chưa cho phép dùng micro (hoặc trang mở từ file:// bị chặn) → gõ tay.' : e.error); stopMic(); };
    rec.onend = () => { if (listening) { micBase = $('xnote').value.replace(/\s*$/, ' '); try { rec.start(); } catch { stopMic(); } } };
    try { rec.start(); listening = true; $('xmic').classList.add('rec'); $('xmic').textContent = '⏺ Đang nghe… (bấm để dừng)'; $('xmicst').textContent = 'Nói tiếng Việt, chữ sẽ hiện vào ô ghi chú.'; }
    catch (e) { $('xmicst').textContent = 'Không bật được micro: ' + e.message; }
  };

  // lưu ghi chú: chụp khung hiện tại (render rồi vẽ ngay) + phụ đề + nét vẽ → PNG nhỏ
  async function saveNote() {
    if (busy) return;
    const t = Math.min(+$('xseek').value, DUR - 1e-4), frame = Math.round(t * FPS);
    const text = $('xnote').value.trim();
    if (!text && !strokes.length) { $('xmicst').textContent = 'Hãy vẽ hoặc gõ/nói ghi chú trước khi lưu.'; return; }
    let img = '';
    try {
      const p = window.renderAt(t); if (p && p.then) await p;
      const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
      const g = cv.getContext('2d'); g.drawImage(stage.renderer.domElement, 0, 0, CW, CH);
      try { drawCaption(g, document.getElementById('cap'), CW / W0); } catch {}
      if (strokes.length) g.drawImage(annCv, 0, 0, CW, CH);
      img = cv.toDataURL('image/png');
    } catch (e) { console.warn('không chụp được khung', e); }
    let shotId = '', si = null; try { si = shotInfo(t); shotId = si ? si.id : ''; } catch {}
    const scope = si && $('xscope') && $('xscope').checked ? 'shot' : 'frame';   // 'shot' = lỗi của cả shot (khung chỉ là ảnh minh hoạ); 'frame' = lỗi đúng khung này
    notes.push({ id: Date.now().toString(36), frame, t: +t.toFixed(3), shotId, scope, shotIndex: si ? si.index + 1 : 0, frameInShot: si ? si.fIn + 1 : 0, shotFrames: si ? si.fCount : 0, shotF0: si ? si.f0 : 0, shotF1: si ? si.f1 : 0, text, img, created: new Date().toISOString() });
    notes.sort((a, b) => a.frame - b.frame);
    const ok = persist();
    strokes = []; cur = null; redrawAnn(); $('xnote').value = ''; stopMic();
    $('xmicst').textContent = ok ? 'Đã lưu ghi chú ' + (scope === 'shot' ? 'cho shot ' + shotId : 'ở frame ' + frame) + '.' : 'Đã lưu, nhưng bộ nhớ trình duyệt đầy: hãy bấm Gửi góp ý sớm (ảnh sẽ mất khi tải lại trang).';
    renderNotes(); setAnnotate(false);
    if (noteFromList && si) { noteFromList = false; goShot(si.index + 1); }
  }
  $('xsave').onclick = saveNote;
  function renderNotes() {
    $('xnotes').innerHTML = notes.map((n, i) => `<div class="nt" data-i="${i}">${n.img ? `<img src="${n.img}" alt="">` : '<img alt="">'}` +
      `<div class="tx">${n.shotId ? `<b>${escapeHtml(n.shotId)}</b> · ${n.scope === 'shot' ? 'cả shot' : 'đúng khung'}${n.frameInShot ? ` ${n.frameInShot}/${n.shotFrames}` : ''} · f${n.frame}` : `<b>f${n.frame}</b>`} · ${n.t.toFixed(2)}s<span>${escapeHtml(n.text || '(chỉ có nét vẽ)')}</span></div>` +
      `<button class="del" data-del="${i}" title="Xoá ghi chú">✕</button></div>`).join('') || '<div class="muted">Chưa có marker nào. Bấm <kbd>M</kbd> hoặc nút ⚑ Marker để thêm.</div>';
    $('xncnt').textContent = notes.length; $('xsend').disabled = $('xsendc').disabled = !notes.length || busy;
    const c0 = $('xncnt0'); c0.textContent = notes.length || ''; c0.style.display = notes.length ? '' : 'none';
    try { syncNotesUi(); } catch (e) { console.warn('studio ui', e); }
  }
  $('xnotes').onclick = (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { notes.splice(+d.dataset.del, 1); persist(); renderNotes(); return; }
    const n = e.target.closest('.nt'); if (n) goFrame(notes[+n.dataset.i].frame);
  };
  renderNotes();

  // dữ liệu góp ý: 1 file json (ảnh dạng data URL) — dùng chung cho "Xuất file" và "Gửi tới Claude"
  const feedbackData = () => ({ app: 'gop-y', version: 1, episode: epId, title, fps: FPS, duration: DUR, created: new Date().toISOString(), notes });
  const stFile = (s) => { $('xsendst').textContent = s; };
  // Xuất file: lưu .json (hộp lưu của Chrome/Edge, hoặc tải xuống) để bỏ vào feedback\ cho tools/feedback.mjs
  $('xsend').onclick = async () => {
    if (!notes.length) return;
    const d = new Date(), z = (n) => String(n).padStart(2, '0');
    const name = `gop-y_${epId}_${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}.json`;
    const blob = new Blob([JSON.stringify(feedbackData())], { type: 'application/json' });
    const st = stFile;
    try {
      if (window.showSaveFilePicker) {
        const fh = await showSaveFilePicker({ suggestedName: name, types: [{ description: 'Góp ý (JSON)', accept: { 'application/json': ['.json'] } }] });
        const w = await fh.createWritable(); await w.write(blob); await w.close();
        st('Đã lưu: ' + fh.name + '\nNhớ để file trong thư mục S:\\3JS Studio\\feedback\\ rồi nhắn Claude "đọc góp ý".');
      } else { download(blob, name); st('Đã tải: ' + name + '\nChuyển file vào thư mục S:\\3JS Studio\\feedback\\ rồi nhắn Claude "đọc góp ý".'); }
    } catch (e) {
      if (e && e.name === 'AbortError') { st('Đã huỷ.'); return; }
      download(blob, name); st('Không mở được hộp lưu → đã tải: ' + name + '\nChuyển vào S:\\3JS Studio\\feedback\\.');
    }
  };
  // Gửi tới Claude: POST đúng JSON đó tới máy nhận cục bộ (node tools/gop-y-nhan.mjs, cổng 8792); dò /ping để biết có đang chờ không
  const CLAUDE = 'http://127.0.0.1:8792';
  async function pingClaude() {
    const el = $('xclst'); let ok = false;
    try {
      const ac = new AbortController(), to = setTimeout(() => ac.abort(), 1500);
      const r = await fetch(CLAUDE + '/ping', { signal: ac.signal, cache: 'no-store' }); clearTimeout(to);
      const j = await r.json(); ok = !!(j && j.ung === 'gop-y');
    } catch {}
    el.className = 'muted ' + (ok ? 'ok' : 'no');
    el.textContent = ok ? '● Claude đang chờ nhận · không cần xuất file' : '○ Chưa bật máy nhận → dùng "Xuất file" (hoặc chạy: node tools/gop-y-nhan.mjs)';
    return ok;
  }
  window.__pingClaude = pingClaude;
  $('xsendc').onclick = async () => {
    if (!notes.length || busy) return;
    stFile('Đang gửi…');
    try {
      const r = await fetch(CLAUDE + '/gop-y', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(feedbackData()) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.loi || ('máy nhận trả mã ' + r.status));
      stFile(`Đã gửi ${notes.length} ghi chú tới Claude lúc ${new Date().toLocaleTimeString('vi')}.\n${j.file || ''}`);
    } catch (e) {
      stFile('Không gửi được (' + (e && e.message || e) + ') → bấm "Xuất file" rồi nhắn Claude "đọc góp ý".');
    }
    pingClaude();
  };

  // ================= STUDIO: danh sách shot, dải thời gian, viền kéo, cài đặt (bố cục ở khối đầu init) =================
  const UIKEY = 'studio-ui'; let U = {};
  try { U = JSON.parse(localStorage.getItem(UIKEY) || '{}') || {}; } catch { U = {}; }
  const uiSave = () => { try { localStorage.setItem(UIKEY, JSON.stringify(U)); } catch {} };
  const tlAll = window.__shots && window.__shots.list && window.__shots.list.length ? window.__shots : null, list = tlAll ? tlAll.list : [];
  const mqNarrow = matchMedia('(max-width: 1099px), (max-aspect-ratio: 1/1)');
  const GH = { wl: [160, 520], wr: [260, 640], ht: [90, 420] };
  for (const k of ['wl', 'wr', 'ht']) if (U[k]) app.style.setProperty('--' + k, U[k] + 'px');
  if (U.fs) { app.style.setProperty('--fs', U.fs + 'px'); $('xfs').value = U.fs; }
  if (U.th) app.dataset.theme = U.th;
  if (U.badge === false) { $('xbadgechk').checked = false; $('xbadge').classList.add('off'); }
  const hasRow = { 'xt-mk': true, 'xt-shot': !!tlAll, 'xt-voice': false, 'xt-sfx': false };
  function applyRows() {
    for (const id of Object.keys(hasRow)) {
      const on = hasRow[id] && !(U.rows && U.rows[id] === false);
      $(id).style.display = on ? '' : 'none';
      const lb = app.querySelector(`[data-rowchk="${id}"]`); if (lb) { lb.style.display = hasRow[id] ? '' : 'none'; lb.querySelector('input').checked = on; }
    }
  }
  const themeBtns = () => app.querySelectorAll('[data-th]').forEach((b) => b.classList.toggle('act', b.dataset.th === (app.dataset.theme || '')));

  // -- cột trái: danh sách shot (mã, lời nếu trang có phụ đề, số ghi chú); lời lấy từ window.__captions ([t0,t1,chữ]) nếu có, không thì chữ nổi của shot, không có thì để trống
  const capsFor = (s) => { const c = window.__captions; if (Array.isArray(c)) { const t = c.filter((x) => x[1] > s.t0 && x[0] < s.t1).map((x) => x[2]).join(' '); if (t) return t; } return s.text || ''; };
  let lastSi = -1;
  const markCur = () => { app.querySelectorAll('#xshots .shot').forEach((r) => { const on = +r.dataset.i === lastSi; r.classList.toggle('on', on); if (on) r.scrollIntoView({ block: 'nearest' }); }); };
  function dungDS() {
    const q = $('xfind').value.trim().toLowerCase(), only = $('xonlyerr').checked, cnt = new Map();
    for (const n of notes) if (n.shotId) cnt.set(n.shotId, (cnt.get(n.shotId) || 0) + 1);
    let h = '';
    list.forEach((s, i) => {
      const c = cnt.get(s.id) || 0, tx = capsFor(s);
      if ((only && !c) || (q && !(s.id + ' ' + tx).toLowerCase().includes(q))) return;
      h += `<div class="shot" data-i="${i}"><span class="sid"><span class="sb"><button data-act="play" title="Phát riêng shot này (P)">▶</button><button data-act="note" title="Ghi chú cả shot (N)">✎</button></span><b class="num">${escapeHtml(s.id)}</b></span><span class="tx">${escapeHtml(tx)}</span><span class="muted num">${s.dur.toFixed(1)}s ${c ? `<span class="cnt">${c}</span>` : ''}</span></div>`;
    });
    $('xshots').innerHTML = h || `<div class="sec">${list.length ? 'Không có shot nào khớp.' : 'Trang này chưa khai báo danh sách shot.'}</div>`;
    markCur();
  }
  $('xshots').onclick = (e) => {
    const r = e.target.closest('.shot'); if (!r) return; const i = +r.dataset.i, a = e.target.closest('[data-act]');
    if (a && a.dataset.act === 'play') playShot(i); else if (a && a.dataset.act === 'note') noteShot(i); else goShot(i);
  };
  // ▶ phát RIÊNG một shot (khung đầu → khung cuối rồi tự dừng; bấm lần nữa khi đang phát = dừng); ✎ ghi chú cả shot rồi chuyển sang shot kế
  function playShot(i) {
    if (busy || !tlAll) return;
    if (playing && stopAt !== null) { pause(); return; }
    const s = list[Math.max(0, Math.min(list.length - 1, i))]; if (!s) return;
    const f0 = Math.ceil(s.t0 * FPS - 1e-6), f1 = Math.max(f0, Math.ceil(s.t1 * FPS - 1e-6) - 1);
    goFrame(f0); stopFrame = Math.min(NF - 1, f1); play(); stopAt = (stopFrame + 1) / FPS;
  }
  function noteShot(i) {
    if (busy || !tlAll) return;
    const si = shotInfo(+$('xseek').value); if (!si || si.index !== i) goShot(i);
    $('xscope').checked = true; noteFromList = true; setAnnotate(true);
  }
  $('xfind').oninput = dungDS; $('xonlyerr').onchange = dungDS;

  // -- dải thời gian: thước, hàng Marker / Shot / Giọng / Tiếng động (hàng nào không có dữ liệu thì ẩn)
  $('xruler').innerHTML = [0, 1, 2, 3, 4, 5, 6].map((k) => `<span>${fmt(k / 6 * DUR)}</span>`).join('');
  $('xlshot').innerHTML = list.map((s) => `<div class="blk" style="flex:${s.dur}"></div>`).join('');
  const sc = $('xscrub'); let drag = false, pend = null, pendRaf = 0;
  const frAt = (e) => { const r = sc.getBoundingClientRect(); return Math.max(0, Math.min(NF - 1, Math.floor((e.clientX - r.left) / r.width * NF))); };
  const flushPend = () => { pendRaf = 0; if (pend !== null) { const f = pend; pend = null; goFrame(f); } };
  const tipText = (f) => { const si = tlAll ? shotInfo(f / FPS + 1e-4) : null; return (si ? `${si.id} · khung ${si.fIn + 1}/${si.fCount} · ` : '') + `f${f} · ${fmt(f / FPS, true)}`; };
  sc.addEventListener('pointerdown', (e) => {
    const mk = document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.dataset && x.dataset.m !== undefined && x.parentElement && x.parentElement.id === 'xlmk');
    if (mk) { goFrame(notes[+mk.dataset.m].frame); return; }
    drag = true; sc.setPointerCapture(e.pointerId); goFrame(frAt(e));
  });
  sc.addEventListener('pointermove', (e) => {
    const f = frAt(e), r = sc.getBoundingClientRect(), x = e.clientX - r.left;
    $('xtip').style.display = 'block'; $('xtip').style.left = Math.max(60, Math.min(r.width - 60, x)) + 'px'; $('xtip').textContent = tipText(f);
    $('xghost').style.display = drag ? 'none' : 'block'; $('xghost').style.left = x + 'px';
    if (drag) { pend = f; if (!pendRaf) pendRaf = requestAnimationFrame(flushPend); }
  });
  const endDrag = () => { if (!drag) return; drag = false; if (pendRaf) cancelAnimationFrame(pendRaf); flushPend(); };
  sc.addEventListener('pointerup', endDrag); sc.addEventListener('pointercancel', endDrag);
  sc.addEventListener('pointerleave', () => { if (!drag) { $('xtip').style.display = 'none'; $('xghost').style.display = 'none'; } });
  sc.addEventListener('wheel', (e) => { e.preventDefault(); goFrame(curFrame() + (e.deltaY > 0 ? 1 : -1) * (e.shiftKey ? 10 : 1)); }, { passive: false });

  // đồng bộ giao diện theo frame đang xem / theo danh sách ghi chú
  syncUi = (t) => {
    const f = Math.min(NF - 1, Math.max(0, Math.round(t * FPS))), si = tlAll ? shotInfo(t) : null;
    $('xhead2').style.left = (f + 0.5) / NF * 100 + '%';
    $('xbtime').textContent = fmt(t, true);
    $('xbshot').style.display = si ? '' : 'none'; if (si) $('xbshot').textContent = `${si.id} · ${si.index + 1}/${si.count}`;
    $('xbfr').textContent = si ? `khung ${si.fIn + 1}/${si.fCount} · f${f}` : `f${f}`;
    if (si && si.index !== lastSi) {
      const blks = $('xlshot').children; if (blks[lastSi]) blks[lastSi].classList.remove('on'); if (blks[si.index]) blks[si.index].classList.add('on');
      lastSi = si.index; markCur();
      const s = list[si.index];
      $('xiloai').textContent = (s.type || '—') + (s.at ? ' · ' + s.at : ''); $('xidur').textContent = `${s.dur.toFixed(2)} s · ${si.fCount} khung (f${si.f0}–${si.f1})`; $('xitx').textContent = capsFor(s) || '—';
    }
    if (annotating) $('xmtitle').textContent = si ? `⚑ Marker tại ${si.id} · khung ${si.fIn + 1}/${si.fCount} · f${f}` : `⚑ Marker tại f${f}`;
  };
  syncNotesUi = () => {
    $('xlmk').innerHTML = notes.map((n, i) => `<b style="left:${(n.frame + 0.5) / NF * 100}%" data-m="${i}" title="${escapeHtml((n.shotId || 'f' + n.frame) + ': ' + (n.text || '(nét vẽ)'))}">⚑</b>`).join('');
    dungDS();
  };

  // hàng Giọng / Tiếng động: dạng sóng THẬT của các file âm thanh trong trang (giải mã nền sau khi cảnh sẵn sàng); không có file → hàng ẩn
  let wv = { voice: null, sfx: null };
  async function wavePeaks(srcs, cols = 1600) {
    const out = new Float32Array(cols);
    for (const src of srcs) {
      const b = await loadAudio(src); if (!b) continue;
      const sr = b.sampleRate, step = DUR * sr / cols;
      for (let c = 0; c < cols; c++) {
        const a = Math.floor(c * step), z = Math.min(b.length, Math.floor((c + 1) * step)); if (a >= z) break;
        const inc = Math.max(1, Math.floor((z - a) / 160)); let m = 0;
        for (let k = 0; k < b.numberOfChannels; k++) { const d = b.getChannelData(k); for (let i = a; i < z; i += inc) { const v = Math.abs(d[i]); if (v > m) m = v; } }
        if (m > out[c]) out[c] = m;
      }
    }
    return out;
  }
  function drawWave(cvId, peaks, col) {
    const cv = $(cvId), g = cv.getContext('2d'), W = cv.width, H = cv.height; g.clearRect(0, 0, W, H); if (!peaks) return;
    let mx = 0; for (const v of peaks) if (v > mx) mx = v; if (!(mx > 0.005)) return;
    g.fillStyle = col;
    for (let c = 0; c < peaks.length; c++) { const h = Math.max(1, Math.sqrt(peaks[c] / mx) * H); g.fillRect(c * W / peaks.length, (H - h) / 2, Math.max(1, W / peaks.length), h); }
  }
  const drawWaves = () => { const cs = getComputedStyle(app); drawWave('xcvvoice', wv.voice, cs.getPropertyValue('--ok').trim() || '#3ecf8e'); drawWave('xcvsfx', wv.sfx, cs.getPropertyValue('--warn').trim() || '#f5b84a'); };
  async function refreshVoiceRow() {
    try {
      const o = opts(), a = document.querySelector(`audio[data-lang="${o.lang}"]`) || document.querySelector('audio[data-lang]');
      if (!a) return; const p = await wavePeaks([a.currentSrc || a.src]); wv.voice = p;
      hasRow['xt-voice'] = p.some((v) => v > 0.005); applyRows(); drawWaves();
    } catch (e) { console.warn('sóng giọng', e); }
  }
  async function refreshSfxRow() {
    try {
      const srcs = sfxLayers.filter((L) => L.id !== 'nhac').map((L) => L.el.currentSrc || L.el.src); if (!srcs.length) return;
      const p = await wavePeaks(srcs); wv.sfx = p; hasRow['xt-sfx'] = p.some((v) => v > 0.005); applyRows(); drawWaves();
    } catch (e) { console.warn('sóng tiếng động', e); }
  }

  // -- viền kéo co giãn (trái / phải / timeline): nhớ kích thước, bấm đúp = về mặc định
  app.querySelectorAll('.gut').forEach((g) => {
    g.addEventListener('pointerdown', (e) => {
      const k = g.dataset.g; g.setPointerCapture(e.pointerId); g.classList.add('act'); app.classList.add('keo');
      const mv = (ev) => { const r = app.getBoundingClientRect(); let v = k === 'wl' ? ev.clientX - r.left : k === 'wr' ? r.right - ev.clientX : r.bottom - ev.clientY; v = Math.round(Math.max(GH[k][0], Math.min(GH[k][1], v))); app.style.setProperty('--' + k, v + 'px'); U[k] = v; };
      const up = () => { for (const [n, f] of [['pointermove', mv], ['pointerup', up], ['pointercancel', up]]) g.removeEventListener(n, f); g.classList.remove('act'); app.classList.remove('keo'); uiSave(); fit(); };
      g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
    });
    g.addEventListener('dblclick', () => { app.style.removeProperty('--' + g.dataset.g); delete U[g.dataset.g]; uiSave(); fit(); });
  });

  // -- cột thẻ: 5 thẻ (màn hẹp: các thẻ xếp dọc, bấm thẻ = cuộn tới mục đó)
  app.querySelectorAll('.tab').forEach((tb) => { tb.onclick = () => {
    app.querySelectorAll('.tab, .pane').forEach((x) => x.classList.remove('on')); tb.classList.add('on');
    const p = $(tb.dataset.p); p.classList.add('on'); if (mqNarrow.matches) p.parentElement.scrollTop = p.offsetTop;
    if (tb.dataset.p === 'xp4') pingClaude();
  }; });
  $('xhgo').onclick = () => { app.querySelector('.tab[data-p="xp5"]').click(); $('xgo').click(); };

  // -- bánh răng: màu khung, cỡ chữ, hàng timeline, nhãn shot, đặt lại kích thước
  $('xgear').onclick = (e) => { e.stopPropagation(); $('xpop').classList.toggle('on'); };
  document.addEventListener('click', (e) => { if (!e.target.closest('#xpop') && !e.target.closest('#xgear')) $('xpop').classList.remove('on'); });
  app.querySelectorAll('[data-th]').forEach((b) => { b.onclick = () => { if (b.dataset.th) app.dataset.theme = b.dataset.th; else delete app.dataset.theme; U.th = b.dataset.th; uiSave(); themeBtns(); drawWaves(); }; });
  $('xfs').oninput = (e) => { app.style.setProperty('--fs', e.target.value + 'px'); U.fs = +e.target.value; uiSave(); };
  app.querySelectorAll('[data-trk]').forEach((c) => { c.onchange = () => { U.rows = U.rows || {}; U.rows[c.dataset.trk] = c.checked; uiSave(); applyRows(); }; });
  $('xbadgechk').onchange = (e) => { U.badge = e.target.checked; $('xbadge').classList.toggle('off', !e.target.checked); uiSave(); };
  $('xreset').onclick = () => { for (const k of ['wl', 'wr', 'ht']) { app.style.removeProperty('--' + k); delete U[k]; } uiSave(); fit(); };

  applyRows(); themeBtns(); syncNotesUi(); syncUi(+$('xseek').value); fit();
  pingClaude();
  setTimeout(() => { refreshVoiceRow(); refreshSfxRow(); }, 400);

  // ---- XUẤT MP4 ----
  let cancel = false;
  $('xstop').onclick = () => { cancel = true; };
  $('xgo').onclick = async () => {
    if (busy) return;
    pause(); setAnnotate(false);
    const P = PRESETS[$('xres').value];
    const ts = Math.max(0, +$('xs').value || 0), te = Math.min(DUR, +$('xe').value || DUR);
    const f0 = Math.round(ts * FPS), f1 = Math.round(te * FPS), N = f1 - f0;
    if (N <= 0) { $('xstat').textContent = 'Đoạn rỗng.'; return; }
    const O = opts(), tag = `${O.lang === 'en' ? '_EN' : '_VI'}${O.voice && O.vid && O.vid[O.lang] ? '_' + O.vid[O.lang] : ''}${O.subs ? '' : '_nosub'}${O.voice ? '' : '_novoice'}${!sfxLayers.length || sfxLayers.every((L) => L.on) ? '' : sfxLayers.some((L) => L.on) ? '_tat-' + sfxLayers.filter((L) => !L.on).map((L) => L.id).join('-') : '_nosfx'}`;
    const name = `${title}${tag}_${P.w}x${P.h}${ts > 0 || te < DUR ? `_${ts}-${te}s` : ''}.mp4`.replace(/[\\/:*?"<>|]/g, '_');
    busy = true; cancel = false;
    $('xgo').disabled = true; $('xplay').disabled = true; $('xstop').style.display = '';
    for (const id of ['xlang', 'xvid', 'xsubs', 'xvoice', 'xcred', 'xres', 'xduck', 'xloud']) $(id).disabled = true;
    for (const el of document.querySelectorAll('#xsfx input')) el.disabled = true;
    for (const el of document.querySelectorAll('#xfx input, .xstep, .xsh, #xframe, #xseek, #xhgo, #xsendc, #xannbtn, #xannbox button, #xannbox textarea')) el.disabled = true;
    const setStat = (s) => { $('xstat').textContent = s; };
    const bar = $('xbar').firstElementChild;
    let fileHandle = null, stream = null;
    try {
      // 1. chọn codec
      const vcfg = await pickVideoConfig(P, FPS);
      if (!vcfg) throw new Error('Máy/trình duyệt không mã hoá được H.264/VP9 ở độ phân giải này.');
      const vEl = voiceEl();
      const vBuf = vEl ? await loadAudio(vEl.currentSrc || vEl.src) : null;
      const parts = vBuf ? [[vBuf, 1, null]] : [];
      const duckEnv = vBuf && $('xduck').checked ? duckEnvelope(vBuf) : null;   // chỉ khi giọng đang bật
      for (const L of sfxLayers) if (L.on && L.gain > 0) { const b = await loadAudio(L.el.currentSrc || L.el.src); if (b) parts.push([b, L.gain, L.id === 'nhac' ? duckEnv : null]); }
      const audio = mixBuffers(parts);   // giọng + các lớp tiếng động (theo âm lượng từng lớp, nhạc hạ nhỏ khi có lời) → 1 track
      let loudInfo = '';
      if (audio) {
        edgeFade(audio, ts, te);   // 10 ms vào/ra ở hai đầu đoạn xuất: hết tiếng "bụp" khi cắt giữa tiếng, encoder AAC không bị vấp ở khung cuối
        if ($('xloud').checked) loudInfo = normalizeLoudness(audio, ts, te).msg;
        else clampMix(audio);
      }
      const acfg = audio ? await pickAudioConfig(audio) : null;

      // 2. nơi lưu: stream thẳng ra đĩa nếu được (đỡ RAM), không thì giữ trong RAM rồi tải xuống
      let target;
      if (window.showSaveFilePicker) {
        try {
          fileHandle = await showSaveFilePicker({ suggestedName: name, types: [{ description: 'Video MP4', accept: { 'video/mp4': ['.mp4'] } }] });
          stream = await fileHandle.createWritable();
          target = new FileSystemWritableFileStreamTarget(stream);
        } catch (e) { if (e.name === 'AbortError') throw new Error('Đã huỷ chọn chỗ lưu.'); }
      }
      if (!target) target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: { codec: vcfg.mux, width: P.w, height: P.h, frameRate: FPS },
        ...(acfg ? { audio: { codec: acfg.mux, numberOfChannels: acfg.cfg.numberOfChannels, sampleRate: acfg.cfg.sampleRate } } : {}),
        fastStart: target instanceof ArrayBufferTarget ? 'in-memory' : false,
        firstTimestampBehavior: 'offset',
      });

      let encErr = null;
      const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { encErr = e; } });
      venc.configure(vcfg.cfg);
      const aenc = acfg ? new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { encErr = e; } }) : null;
      if (aenc) aenc.configure(acfg.cfg);

      // 3. renderer lên độ phân giải xuất
      const renderer = stage.renderer, oldPR = renderer.getPixelRatio();
      renderer.setPixelRatio(P.w / W0); renderer.setSize(W0, H0, false); window.__post?.resize?.();
      const comp = new OffscreenCanvas(P.w, P.h), g = comp.getContext('2d', { alpha: false });
      const gl = renderer.domElement, cap = document.getElementById('cap');

      // giọng đọc: cắt đúng đoạn [ts, te), đẩy dần theo video
      const sr = audio ? audio.sampleRate : 0, aStart = Math.round(ts * sr), aEnd = Math.round(te * sr);
      let aPos = aStart; const ACH = 4096;
      const pushAudio = (until) => {
        if (!aenc) return;
        const stop = Math.min(aEnd, Math.round(until * sr));
        while (aPos < stop) {
          const n = Math.min(ACH, stop - aPos), ch = acfg.cfg.numberOfChannels, buf = new Float32Array(n * ch);
          for (let c = 0; c < ch; c++) buf.set(audio.getChannelData(Math.min(c, audio.numberOfChannels - 1)).subarray(aPos, aPos + n), c * n);
          const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: ch, timestamp: Math.round((aPos - aStart) / sr * 1e6), data: buf });
          aenc.encode(ad); ad.close(); aPos += n;
        }
      };

      if (window.__credits) await window.__credits.ready;   // ảnh ghi công (nếu bật) phải tải xong trước khung đầu tiên
      const tStart = performance.now();
      try {
        for (let i = 0; i < N; i++) {
          if (cancel) throw new Error('Đã dừng.');
          if (encErr) throw encErr;
          const f = f0 + i, t = f / FPS;
          const p = window.renderAt(t); if (p && p.then) await p;
          g.drawImage(gl, 0, 0, P.w, P.h);
          drawCaption(g, cap, P.w / W0);
          drawCredits(g, P.w, P.h, t);
          const vf = new VideoFrame(comp, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
          venc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
          pushAudio((f + 1) / FPS);
          while (venc.encodeQueueSize > 6) await sleep(2);
          if (i % 3 === 0 || i === N - 1) {
            const el = (performance.now() - tStart) / 1000, rate = (i + 1) / el;
            bar.style.width = `${(100 * (i + 1) / N).toFixed(1)}%`;
            setStat(`Đang xuất ${P.label}\nFrame ${i + 1}/${N} · ${rate.toFixed(1)} fps · còn ~${fmtS((N - i - 1) / rate)}`);
            await sleep(0);
          }
        }
        pushAudio(te);
        setStat('Đang đóng gói MP4…');
        await venc.flush(); if (aenc) await aenc.flush();
        if (encErr) throw encErr;
        muxer.finalize();
      } finally {
        renderer.setPixelRatio(oldPR); renderer.setSize(W0, H0, false); window.__post?.resize?.();
        try { venc.state !== 'closed' && venc.close(); } catch {}
        try { aenc && aenc.state !== 'closed' && aenc.close(); } catch {}
      }
      if (stream) { await stream.close(); stream = null; }
      else download(new Blob([target.buffer], { type: 'video/mp4' }), name);
      const el = (performance.now() - tStart) / 1000;
      setStat(`Xong: ${name}\n${N} frame trong ${fmtS(el)} · video ${vcfg.mux.toUpperCase()}${acfg ? ' + ' + acfg.mux.toUpperCase() : ''}${loudInfo ? '\n' + loudInfo : ''}`);
      bar.style.width = '100%';
    } catch (e) {
      console.error(e);
      setStat('Lỗi: ' + (e && e.message || e));
      if (stream) { try { await stream.abort(); } catch {} }
    } finally {
      busy = false; $('xgo').disabled = false; $('xplay').disabled = false; $('xstop').style.display = 'none';
      for (const id of ['xlang', 'xvid', 'xsubs', 'xvoice', 'xcred', 'xres', 'xduck', 'xloud']) $(id).disabled = false;
      for (const el of document.querySelectorAll('#xsfx input')) el.disabled = false;
      for (const el of document.querySelectorAll('#xfx input, .xstep, .xsh, #xframe, #xseek, #xhgo, #xsendc, #xannbtn, #xannbox button, #xannbox textarea')) el.disabled = false;
      if (!SR) $('xmic').disabled = true;
      renderNotes(); show(+$('xseek').value);
    }
  };
}

// Ảnh ghi công 3 giây cuối (engine/credits.js): vẽ phủ lên khung xuất, cùng độ mờ với lớp <img> trên màn hình. Tắt/không có → không vẽ gì.
function drawCredits(g, w, h, t) {
  const c = window.__credits; if (!c || !c.img) return;
  const a = c.alpha(t); if (!(a > 0)) return;
  g.save(); g.globalAlpha = a; g.drawImage(c.img, 0, 0, w, h); g.restore();
}

// Vẽ phụ đề y như #cap trong DOM (Nunito 900 92px, viền 14px, bóng, phóng nảy) lên canvas xuất.
function drawCaption(g, cap, s) {
  const text = cap.textContent.trim(); if (!text) return;
  const cs = getComputedStyle(cap);
  const m = (cap.style.transform || '').match(/scale\(([\d.]+)\)\s*$/); const k = m ? +m[1] : 1;
  const fontPx = parseFloat(cs.fontSize) || 92, lineH = (parseFloat(cs.lineHeight) || fontPx * 1.05);
  const left = cap.offsetLeft, width = cap.offsetWidth, top = cap.offsetTop;
  const stroke = parseFloat(cs.webkitTextStrokeWidth) || 14;
  g.save();
  g.font = `${cs.fontWeight || 900} ${fontPx}px ${cs.fontFamily}`;
  const lines = wrapLines(g, text, width);
  const boxH = lines.length * lineH;
  // transform-origin 50% 60% của hộp phụ đề
  const ox = (left + width / 2) * s, oy = (top + boxH * 0.6) * s;
  g.translate(ox, oy); g.scale(k * s, k * s); g.translate(-(left + width / 2), -(top + boxH * 0.6));
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.miterLimit = 2;
  g.lineWidth = stroke; g.strokeStyle = cs.webkitTextStrokeColor || '#15121c'; g.fillStyle = cs.color || '#fff';
  const cx = left + width / 2;
  const wi = cap.dataset.wi !== undefined && cap.dataset.wi !== '' ? +cap.dataset.wi : undefined; let wordIdx = 0;
  lines.forEach((ln, i) => {
    const y = top + lineH * (i + 0.5) + fontPx * 0.02;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowOffsetY = 6 * k * s; g.shadowBlur = 0;
    g.strokeText(ln, cx, y); g.restore();
    if (wi === undefined) { g.fillText(ln, cx, y); return; }
    // phụ đề từng chữ (ô FX chuTungChu): chữ thứ wi sáng (trắng), các chữ khác xám nhạt — khớp #cap .w / .w.on trong trang
    const ws = ln.split(' '), tw = g.measureText(ln).width; let x = cx - tw / 2; g.textAlign = 'left';
    ws.forEach((w, j) => { const piece = (j ? ' ' : '') + w; g.fillStyle = wordIdx + j === wi ? '#ffffff' : '#c4bfd6'; g.fillText(piece, x, y); x += g.measureText(piece).width; });
    wordIdx += ws.length; g.textAlign = 'center';
  });
  g.restore();
}
function wrapLines(g, text, maxW) {
  const words = text.split(/\s+/), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && g.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

async function pickVideoConfig(P, fps) {
  const base = { width: P.w, height: P.h, bitrate: P.bitrate, framerate: fps, latencyMode: 'quality' };
  const tries = [
    { mux: 'avc', cfg: { ...base, codec: P.w * P.h > 4096 * 2304 ? 'avc1.640034' : 'avc1.640033', avc: { format: 'avc' } } },
    { mux: 'avc', cfg: { ...base, codec: 'avc1.4d0034', avc: { format: 'avc' } } },
    { mux: 'avc', cfg: { ...base, codec: 'avc1.420034', avc: { format: 'avc' } } },
    { mux: 'vp9', cfg: { ...base, codec: 'vp09.00.51.08' } },
  ];
  for (const hw of ['prefer-hardware', 'no-preference']) {
    for (const t of tries) {
      const cfg = { ...t.cfg, hardwareAcceleration: hw };
      try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return { mux: t.mux, cfg }; } catch {}
    }
  }
  return null;
}
async function pickAudioConfig(buf) {
  const ch = Math.min(2, buf.numberOfChannels), sr = buf.sampleRate;
  for (const [mux, codec] of [['aac', 'mp4a.40.2'], ['opus', 'opus']]) {
    const cfg = { codec, sampleRate: sr, numberOfChannels: ch, bitrate: 192000 };
    try { const r = await AudioEncoder.isConfigSupported(cfg); if (r.supported) return { mux, cfg }; } catch {}
  }
  return null;
}
// cộng nhiều AudioBuffer (cùng 48 kHz) thành 1 nguồn {sampleRate, numberOfChannels, length, getChannelData}
// parts = [[AudioBuffer, gain, đường bao|null], …] — đường bao (duckEnvelope) nhân thêm vào phần đó (nhạc nền hạ khi có lời).
// KHÔNG chặn đỉnh ở đây: gọi normalizeLoudness (chuẩn −14 LUFS + giới hạn đỉnh) hoặc clampMix.
function mixBuffers(parts) {
  if (!parts.length) return null;
  const bufs = parts.map((p) => p[0]);
  const sr = bufs[0].sampleRate, ch = Math.max(...bufs.map((b) => b.numberOfChannels)), len = Math.max(...bufs.map((b) => b.length));
  const data = Array.from({ length: ch }, () => new Float32Array(len));
  for (const [b, g, env] of parts) for (let c = 0; c < ch; c++) {
    const src = b.getChannelData(Math.min(c, b.numberOfChannels - 1)), dst = data[c];
    if (!env) { for (let i = 0; i < src.length; i++) dst[i] += src[i] * g; continue; }
    const hop = env.hop, gs = env.g, last = gs.length - 1;
    for (let i = 0; i < src.length; i++) {
      const k = i / hop, k0 = k | 0, f = k - k0, a0 = gs[k0 > last ? last : k0], a1 = gs[k0 + 1 > last ? last : k0 + 1];
      dst[i] += src[i] * g * (a0 + (a1 - a0) * f);
    }
  }
  return { sampleRate: sr, numberOfChannels: ch, length: len, getChannelData: (c) => data[c] };
}
function edgeFade(m, ts, te, ms = 10) {
  const sr = m.sampleRate, a = Math.round(ts * sr), b = Math.min(m.length, Math.round(te * sr)), n = Math.round(sr * ms / 1000);
  for (let c = 0; c < m.numberOfChannels; c++) {
    const d = m.getChannelData(c);
    for (let i = 0; i < n; i++) { const w = i / n; if (a + i < d.length) d[a + i] *= w; if (b - 1 - i >= 0) d[b - 1 - i] *= w; }
  }
}
function clampMix(m) {
  for (let c = 0; c < m.numberOfChannels; c++) { const d = m.getChannelData(c); for (let i = 0; i < d.length; i++) { const x = d[i]; d[i] = x > 1 ? 1 : x < -1 ? -1 : x; } }
}

// ---- GIẢM NHẠC KHI CÓ LỜI: đường bao tăng ích từ chính file giọng đọc (đúng với mọi giọng/ngôn ngữ) ----
// RMS 50 ms (bước 5 ms) > −50 dBFS = "đang nói"; nhạc hạ về DUCK_GAIN trong ~60 ms, giữ 200 ms sau câu, thả lại trong ~350 ms.
const DUCK_GAIN = 0.35;
function duckEnvelope(buf, opt = {}) {
  const sr = buf.sampleRate, hop = Math.round(sr * 0.005), n = Math.ceil(buf.length / hop);
  const thr = opt.thr ?? 0.0032, gmin = opt.gain ?? DUCK_GAIN, attack = opt.attack ?? 0.06, release = opt.release ?? 0.35, hold = opt.hold ?? 0.2;
  const e = new Float64Array(n), chs = [];
  for (let c = 0; c < buf.numberOfChannels; c++) chs.push(buf.getChannelData(c));
  for (let k = 0; k < n; k++) {
    let s = 0; const a = k * hop, b = Math.min(buf.length, a + hop);
    for (const d of chs) for (let i = a; i < b; i++) s += d[i] * d[i];
    e[k] = s / (Math.max(1, b - a) * chs.length);
  }
  const W = 10, g = new Float32Array(n), dt = 0.005, ca = 1 - Math.exp(-dt / attack), cr = 1 - Math.exp(-dt / release);
  let acc = 0, cur = 1, holdLeft = 0;
  for (let k = 0; k < n; k++) {
    acc += e[k]; if (k >= W) acc -= e[k - W];
    const active = Math.sqrt(acc / Math.min(W, k + 1)) > thr;
    holdLeft = active ? hold : holdLeft - dt;
    const target = active || holdLeft > 0 ? gmin : 1;
    cur += (target - cur) * (target < cur ? ca : cr);
    g[k] = cur;
  }
  return { hop, g, rate: sr / hop };
}
function duckAt(env, t) {
  const g = env.g, l = g.length - 1, k = t * env.rate, k0 = Math.floor(k);
  if (k0 < 0) return g[0]; if (k0 >= l) return g[l];
  return g[k0] + (g[k0 + 1] - g[k0]) * (k - k0);
}

// ---- CHUẨN ÂM LƯỢNG ≈ −14 LUFS (YouTube), BS.1770: K-weighting, khối 400 ms bước 100 ms, cổng −70 LUFS & −10 LU ----
function kWeighted(x, sr) {   // hệ số chuẩn cho 48 kHz (mọi buffer giải mã ở 48 kHz); tần số khác → tính lại theo công thức
  let sh, hp;
  if (Math.abs(sr - 48000) < 1) { sh = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585]; hp = [1, -2, 1, -1.99004745483398, 0.99007225036621]; }
  else {
    const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196, K = Math.tan(Math.PI * f0 / sr), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
    let a0 = 1 + K / Q + K * K; sh = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0];
    const f1 = 38.13547087602444, Q1 = 0.5003270373238773, K1 = Math.tan(Math.PI * f1 / sr); a0 = 1 + K1 / Q1 + K1 * K1;
    hp = [1, -2, 1, 2 * (K1 * K1 - 1) / a0, (1 - K1 / Q1 + K1 * K1) / a0];
  }
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, w1 = 0, w2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const s = sh[0] * xi + sh[1] * x1 + sh[2] * x2 - sh[3] * y1 - sh[4] * y2; x2 = x1; x1 = xi; y2 = y1; y1 = s;
    const h = hp[0] * s + hp[1] * z1 + hp[2] * z2 - hp[3] * w1 - hp[4] * w2; z2 = z1; z1 = s; w2 = w1; w1 = h;
    y[i] = h;
  }
  return y;
}
function integratedLoudness(chans, sr, a, b) {   // chans: Float32Array[] → LUFS tích phân của đoạn [a,b) mẫu, null nếu im lặng
  const blk = Math.round(sr * 0.4), step = Math.round(sr * 0.1), pre = [];
  for (const x of chans) {
    const k = kWeighted(x.subarray(a, b), sr), cum = new Float64Array(k.length + 1);
    for (let i = 0; i < k.length; i++) cum[i + 1] = cum[i] + k[i] * k[i];
    pre.push(cum);
  }
  const ms = [];
  for (let s = 0; s + blk <= b - a; s += step) { let e = 0; for (const cum of pre) e += (cum[s + blk] - cum[s]) / blk; ms.push(e); }
  const lk = (e) => -0.691 + 10 * Math.log10(e);
  const abs = ms.filter((e) => e > 0 && lk(e) > -70); if (!abs.length) return null;
  const rel = lk(abs.reduce((p, e) => p + e, 0) / abs.length) - 10;
  const gated = abs.filter((e) => lk(e) > rel); if (!gated.length) return null;
  return lk(gated.reduce((p, e) => p + e, 0) / gated.length);
}
// giới hạn đỉnh nhìn trước 5 ms: min trượt (nhìn trước L mẫu) rồi trung bình trượt L mẫu ⇒ độ giảm tại i luôn ≤ độ giảm cần tại i
function limitPeaks(chans, sr, ceil) {
  const n = chans[0].length, L = Math.max(2, Math.round(sr * 0.005)), need = new Float32Array(n);
  let any = false;
  for (let i = 0; i < n; i++) { let m = 0; for (const d of chans) { const v = Math.abs(d[i]); if (v > m) m = v; } if (m > ceil) { need[i] = ceil / m; any = true; } else need[i] = 1; }
  if (!any) return;
  const mn = new Float32Array(n), dq = new Int32Array(n); let h = 0, t = 0;
  for (let j = n - 1; j >= 0; j--) {
    while (t > h && need[dq[t - 1]] >= need[j]) t--;
    dq[t++] = j;
    while (dq[h] > j + L - 1) h++;
    mn[j] = need[dq[h]];
  }
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += mn[i]; if (i >= L) acc -= mn[i - L];
    const g = Math.min(need[i], (acc + Math.max(0, L - 1 - i)) / L);
    if (g < 1) for (const d of chans) d[i] *= g;
  }
}
function normalizeLoudness(mix, ts, te, target = -14, ceilDb = -2.5) {
  const sr = mix.sampleRate, chans = [];
  for (let c = 0; c < mix.numberOfChannels; c++) chans.push(mix.getChannelData(c));
  const a = Math.max(0, Math.min(mix.length - 1, Math.round(ts * sr))), b = Math.max(a + 1, Math.min(mix.length, Math.round(te * sr)));
  const l0 = integratedLoudness(chans, sr, a, b), ceil = Math.pow(10, ceilDb / 20);
  if (l0 === null) { clampMix(mix); return { msg: 'Âm lượng: đoạn quá yên lặng, không chuẩn hoá.' }; }
  let total = 0, lAfter = l0;
  const MAX_BOOST = 6;   // không khuếch quá +6 dB tổng (vd chỉ bật 1 lớp tiếng thưa → tránh đẩy tiếng nền/bước chân lên quá to)
  for (let it = 0; it < 3; it++) {   // chỉnh gain → giới hạn đỉnh → đo lại (giới hạn có thể làm nhỏ đi một chút)
    const gdb = Math.min(target - lAfter, MAX_BOOST - total);
    if (it > 0 && Math.abs(gdb) < 0.2) break;
    const g = Math.pow(10, gdb / 20); total += gdb;
    for (const d of chans) for (let i = 0; i < d.length; i++) d[i] *= g;
    limitPeaks(chans, sr, ceil);
    lAfter = integratedLoudness(chans, sr, a, b);
    if (lAfter === null) break;
  }
  clampMix(mix);
  return { msg: `Âm lượng: ${l0.toFixed(1)} → ${lAfter === null ? '?' : lAfter.toFixed(1)} LUFS (${total >= 0 ? '+' : ''}${total.toFixed(1)} dB)` };
}
async function loadAudio(src) {
  try {
    const ab = await (await fetch(src)).arrayBuffer();
    const ctx = new OfflineAudioContext(2, 1, 48000);
    return await ctx.decodeAudioData(ab);
  } catch (e) { console.warn('không đọc được giọng đọc:', e); return null; }
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function fmt(t, tenth) { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${(tenth ? s.toFixed(1) : Math.floor(s).toString()).padStart(tenth ? 4 : 2, '0')}`; }
function fmtS(s) { s = Math.max(0, Math.round(s)); return s >= 60 ? `${Math.floor(s / 60)} phút ${s % 60} s` : `${s} s`; }
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

// khởi động SAU khi mọi hằng/hàm ở trên đã khai báo
if (!navigator.webdriver || new URLSearchParams(location.search).has('ui')) init();
