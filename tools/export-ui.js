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

  // ---- khung trình phát: thu #root vừa cửa sổ, thanh điều khiển bên phải/dưới ----
  const css = document.createElement('style');
  css.textContent = `
    html, body { width: 100% !important; height: 100% !important; overflow: hidden; background: #0d0f14 !important; }
    body { display: flex; align-items: center; justify-content: center; gap: 24px; font-family: system-ui, 'Segoe UI', sans-serif; color: #e8ecf3; }
    #xwrap { position: relative; flex: none; box-shadow: 0 10px 40px rgba(0,0,0,.6); border-radius: 10px; overflow: hidden; }
    #xwrap > #root { transform-origin: 0 0; position: absolute; left: 0; top: 0; }
    #xui { width: 300px; flex: none; display: flex; flex-direction: column; gap: 12px; font-size: 14px; }
    #xui h1 { font-size: 17px; margin: 0 0 4px; font-weight: 700; }
    #xui .row { display: flex; gap: 8px; align-items: center; }
    #xui button { font: inherit; font-weight: 600; border: 0; border-radius: 8px; padding: 10px 14px; cursor: pointer; background: #2a3040; color: #e8ecf3; }
    #xui button:hover { background: #343c50; }
    #xui button.main { background: #e5484d; color: #fff; padding: 13px 14px; font-size: 15px; }
    #xui button.main:hover { background: #f05358; }
    #xui button:disabled { opacity: .45; cursor: default; }
    #xui select, #xui input[type=number] { font: inherit; background: #1b2030; color: #e8ecf3; border: 1px solid #343c50; border-radius: 6px; padding: 7px 8px; }
    #xui select { flex: 1; }
    #xui input[type=range] { flex: 1; }
    #xui .muted { color: #8b93a7; font-size: 12.5px; line-height: 1.45; }
    #xui .chk { display: flex; align-items: center; gap: 7px; cursor: pointer; flex: 1; background: #1b2030; border: 1px solid #343c50; border-radius: 6px; padding: 7px 9px; }
    #xui .chk input { width: 16px; height: 16px; accent-color: #e5484d; margin: 0; }
    #xui .lbl { width: 78px; color: #8b93a7; font-size: 12.5px; }
    #xui .fxgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    #xui .fxgrid .chk { font-size: 12.5px; padding: 6px 8px; }
    #xui .sfxrow { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    #xui .sfxrow .chk { flex: 1.4; font-size: 12.5px; padding: 6px 8px; }
    #xui .sfxrow input[type=range] { flex: 1; min-width: 70px; }
    #xui .sfxrow .pct { width: 38px; text-align: right; color: #8b93a7; font-size: 12px; font-variant-numeric: tabular-nums; }
    #xbar { height: 8px; background: #1b2030; border-radius: 4px; overflow: hidden; }
    #xbar > div { height: 100%; width: 0; background: #e5484d; transition: width .2s; }
    #xstat { min-height: 38px; white-space: pre-line; }
    #xtime { font-variant-numeric: tabular-nums; min-width: 92px; text-align: right; }
    #xui .xfr { gap: 6px; } #xui .xstep { padding: 6px 0; flex: 1; font-variant-numeric: tabular-nums; }
    #xframe { width: 78px; font: inherit; background: #1b2030; color: #e8ecf3; border: 1px solid #343c50; border-radius: 6px; padding: 4px 6px; }
    #xftot, #xshot { font-variant-numeric: tabular-nums; }
    #xui { max-height: 100vh; overflow-y: auto; padding-right: 4px; box-sizing: border-box; }
    #xwrap { cursor: pointer; }
    #xann { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 5; display: none; touch-action: none; cursor: crosshair; }
    #xwrap.annot { cursor: crosshair; outline: 3px solid #e5484d; }
    #xwrap.annot #xann { display: block; }
    #xannbox { display: flex; flex-direction: column; gap: 8px; }
    #xanntools { display: none; flex-direction: column; gap: 8px; background: #151a27; border: 1px solid #343c50; border-radius: 8px; padding: 10px; }
    #xanntools.on { display: flex; }
    #xanntools .tl { padding: 7px 4px; flex: 1; font-size: 12.5px; }
    #xanntools .tl.act { background: #e5484d; color: #fff; }
    #xnote { font: inherit; width: 100%; box-sizing: border-box; min-height: 70px; resize: vertical; background: #1b2030; color: #e8ecf3; border: 1px solid #343c50; border-radius: 6px; padding: 7px 8px; }
    #xmic.rec { background: #e5484d; color: #fff; }
    #xnotes { display: flex; flex-direction: column; gap: 6px; }
    #xnotes .nt { display: flex; gap: 8px; align-items: center; background: #1b2030; border: 1px solid #343c50; border-radius: 6px; padding: 5px; cursor: pointer; }
    #xnotes .nt:hover { background: #232a3d; }
    #xnotes .nt img { width: 36px; height: 64px; object-fit: cover; border-radius: 3px; flex: none; background: #000; }
    #xnotes .nt .tx { flex: 1; min-width: 0; font-size: 12.5px; line-height: 1.35; }
    #xnotes .nt .tx b { color: #ffb4b6; font-variant-numeric: tabular-nums; }
    #xnotes .nt .tx span { display: block; color: #8b93a7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #xnotes .nt .del { padding: 4px 8px; background: #3a2226; }
    @media (max-aspect-ratio: 1/1) { body { flex-direction: column; gap: 12px; } #xui { width: min(92vw, 420px); } }
  `;
  document.head.appendChild(css);
  const wrap = document.createElement('div'); wrap.id = 'xwrap';
  root.parentNode.insertBefore(wrap, root); wrap.appendChild(root);
  const annCv = document.createElement('canvas'); annCv.id = 'xann'; wrap.appendChild(annCv);   // lớp vẽ ghi chú — chỉ trên màn hình, không bao giờ vào video xuất
  const ui = document.createElement('div'); ui.id = 'xui';
  ui.innerHTML = `
    <h1>${escapeHtml(title)}</h1>
    <div class="muted">${W0}×${H0} · ${FPS} fps · ${fmt(DUR)}</div>
    <div class="row"><span class="lbl">Ngôn ngữ</span><select id="xlang"><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div>
    <div class="row" id="xvidrow"><span class="lbl">Giọng</span><select id="xvid"></select></div>
    <div class="row"><label class="chk"><input id="xsubs" type="checkbox" checked> Phụ đề</label><label class="chk"><input id="xvoice" type="checkbox" checked> Giọng đọc</label></div>
    <div id="xsfxbox" style="display:none"><div class="lbl" style="width:auto;margin:2px 0 6px">Tiếng động</div><div id="xsfx"></div></div>
    <div id="xaudopt" class="row" style="flex-direction:column;align-items:stretch;gap:6px">
      <label class="chk" id="xduckrow" style="display:none"><input id="xduck" type="checkbox" checked> Giảm nhạc khi có lời</label>
      <label class="chk"><input id="xloud" type="checkbox" checked> Chuẩn âm lượng YouTube (−14 LUFS)</label></div>
    <div id="xfxbox" style="display:none"><div class="lbl" style="width:auto;margin:2px 0 6px">Hiệu ứng hình</div><div id="xfx" class="fxgrid"></div></div>
    <div class="row"><button id="xplay">▶ Xem</button><input id="xseek" type="range" min="0" max="${DUR}" step="0.001" value="0"><span id="xtime">0:00.0</span></div>
    <div class="row xfr"><span class="lbl" style="width:auto">Frame</span><input id="xframe" type="number" min="0" step="1" value="0"><span id="xftot" class="muted"></span><span id="xshot" class="muted"></span></div>
    <div class="row xfr">${[-10, -5, -1, 1, 5, 10].map((d) => `<button class="xstep" data-d="${d}" title="${d < 0 ? 'Lùi' : 'Tới'} ${Math.abs(d)} frame">${d < 0 ? '◀' : ''}${Math.abs(d)}${d > 0 ? '▶' : ''}</button>`).join('')}</div>
    <div id="xannbox">
      <button id="xannbtn">✎ Ghi chú lỗi</button>
      <div id="xanntools">
        <div class="muted">Vẽ lên khung hình để chỉ chỗ lỗi (video tạm dừng). Nét vẽ KHÔNG nằm trong file MP4 xuất ra.</div>
        <div class="row xfr"><button class="tl act" data-tool="pen">✏ Bút</button><button class="tl" data-tool="ell">◯ Elip</button><button class="tl" data-tool="arrow">➚ Mũi tên</button></div>
        <div class="row xfr"><button class="tl" id="xundo">↶ Hoàn tác</button><button class="tl" id="xclr">🗑 Xoá nét</button></div>
        <textarea id="xnote" placeholder="Ghi chú cho khung này (gõ hoặc bấm micro để nói)…"></textarea>
        <div class="row xfr"><button id="xmic" style="flex:1">🎤 Nói</button><button id="xsave" class="main" style="flex:2;padding:10px 14px;font-size:14px">Lưu ghi chú</button></div>
        <div id="xmicst" class="muted"></div>
      </div>
      <div id="xnotes"></div>
      <div id="xsendrow" style="display:none;flex-direction:column;gap:6px">
        <button id="xsend" class="main" style="font-size:14px">📨 Gửi góp ý (<span id="xncnt">0</span>)</button>
        <div class="muted">Bấm Gửi góp ý → lưu file .json vào thư mục <b>S:\\3JS Studio\\feedback\\</b> để Claude đọc.</div>
        <div id="xsendst" class="muted"></div>
      </div>
    </div>
    <hr style="border:0;border-top:1px solid #262c3b;width:100%;margin:4px 0">
    <div class="row"><select id="xres">${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}"${k === '2k' ? ' selected' : ''}>${p.label}</option>`).join('')}</select></div>
    <div class="row"><label class="muted" style="flex:1">Đoạn (giây)</label>
      <input id="xs" type="number" min="0" max="${DUR}" step="0.1" value="0" style="width:72px"> –
      <input id="xe" type="number" min="0" max="${DUR}" step="0.1" value="${DUR.toFixed(2)}" style="width:80px"></div>
    <button id="xgo" class="main">⬇ Xuất MP4</button>
    <button id="xstop" style="display:none">Dừng</button>
    <div id="xbar"><div></div></div>
    <div id="xstat" class="muted"></div>
    <div class="muted">Render bằng card đồ hoạ của máy bạn, không cần mạng. Giữ tab này mở trong lúc xuất.
      Chrome/Edge sẽ hỏi chỗ lưu file trước khi bắt đầu.</div>`;
  document.body.appendChild(ui);
  const $ = (id) => document.getElementById(id);
  if (!('VideoEncoder' in window)) { $('xgo').disabled = true; $('xstat').textContent = 'Trình duyệt này không có WebCodecs → mở bằng Chrome hoặc Edge bản mới.'; }

  function fit() {
    const narrow = innerWidth / innerHeight < 1;
    const availH = innerHeight - (narrow ? 330 : 40), availW = innerWidth - (narrow ? 32 : 380);
    const k = Math.max(0.1, Math.min(availH / H0, availW / W0));
    root.style.transform = `scale(${k})`;
    wrap.style.width = `${W0 * k}px`; wrap.style.height = `${H0 * k}px`;
  }
  addEventListener('resize', fit); fit();
  document.getElementById('xpre')?.remove();   // gỡ lớp che của bản gộp (tools/bundle.mjs) — giờ khung đã thu vừa cửa sổ

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
    if (ev && ev.target && ev.target.id === 'xvid') o.vid = $('xvid').value;
    window.setOptions(o);
    if (ev && ev.target && ev.target.id === 'xlang') fillVoices();
    audioEl = voiceEl();
    show(+$('xseek').value);
    if (wasPlaying) play();
  };
  for (const id of ['xlang', 'xvid', 'xsubs', 'xvoice']) $(id).onchange = applyOpts;
  // hiệu ứng hình: mỗi ô = 1 hiệu ứng của engine/post.js
  const fxOpts = hasOpts ? window.getOptions() : null;
  if (fxOpts && fxOpts.fx) {
    $('xfxbox').style.display = '';
    $('xfx').innerHTML = Object.entries(fxOpts.fx).map(([k, on]) =>
      `<label class="chk"><input type="checkbox" data-fx="${k}"${on ? ' checked' : ''}> ${escapeHtml((fxOpts.fxLabels || {})[k] || k)}</label>`).join('');
    $('xfx').onchange = (e) => { const k = e.target.dataset.fx; if (!k) return; window.setOptions({ fx: { [k]: e.target.checked } }); show(+$('xseek').value); };
  }

  // ---- xem trước (thời gian thực theo giọng đọc; chỉ để xem, không dùng khi xuất) ----
  let playing = false, raf = 0, t0 = 0, wall0 = 0, annotating = false;
  const NF = Math.round(DUR * FPS);   // tổng số frame; frame f hiển thị ở t = f / FPS
  const show = (t) => {
    window.renderAt(t); $('xseek').value = t; $('xtime').textContent = fmt(t, true);
    const f = Math.min(NF - 1, Math.round(t * FPS)); if (document.activeElement !== $('xframe')) $('xframe').value = f;
    $('xftot').textContent = '/ ' + (NF - 1);
    try { const sh = window.__shots && window.__shots.at(Math.min(t, DUR - 1e-4)).shot; $('xshot').textContent = sh ? '· ' + sh.id : ''; } catch (e) {}
  };
  // đi từng frame: nút ◀10 ◀5 ◀1 1▶ 5▶ 10▶, ô số frame, phím ← → (giữ Shift = 10 frame)
  const goFrame = (f) => { if (playing) pause(); f = Math.max(0, Math.min(NF - 1, Math.round(f))); show(f / FPS); };
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
  function play() {
    if (busy) return; playing = true; $('xplay').textContent = '❚❚ Dừng';
    t0 = +$('xseek').value; if (t0 >= DUR - 0.05) t0 = 0; wall0 = performance.now();
    if (audioEl) { audioEl.currentTime = t0; audioEl.play().catch(() => {}); }
    for (const L of sfxLayers) if (L.on) { L.el.volume = Math.min(1, L.gain); L.el.currentTime = t0; L.el.play().catch(() => {}); }
    voiceEnvelope();   // bắt đầu tính đường bao giọng (nếu chưa có)
    raf = requestAnimationFrame(loop);
  }
  function pause() { playing = false; $('xplay').textContent = '▶ Xem'; cancelAnimationFrame(raf); if (audioEl) audioEl.pause(); for (const L of sfxLayers) L.el.pause(); }
  $('xplay').onclick = () => (playing ? pause() : play());
  $('xduck').onchange = () => { if (playing) applyMusicVolume(nowT()); };
  $('xseek').oninput = () => { if (playing) pause(); show(+$('xseek').value); };
  addEventListener('keydown', (e) => { if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !annotating) { e.preventDefault(); playing ? pause() : play(); } });
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
    const p = apos(e); cur = tool === 'pen' ? { type: 'pen', pts: [p] } : { type: tool, a: p, b: p }; redrawAnn();
  });
  annCv.addEventListener('pointermove', (e) => {
    if (!cur) return; const p = apos(e);
    if (cur.type === 'pen') cur.pts.push(p); else cur.b = p; redrawAnn();
  });
  const endStroke = () => { if (!cur) return; strokes.push(cur); cur = null; redrawAnn(); };
  annCv.addEventListener('pointerup', endStroke); annCv.addEventListener('pointercancel', endStroke);
  for (const b of document.querySelectorAll('#xanntools .tl[data-tool]')) b.onclick = () => {
    tool = b.dataset.tool; for (const o of document.querySelectorAll('#xanntools .tl[data-tool]')) o.classList.toggle('act', o === b);
  };
  $('xundo').onclick = () => { strokes.pop(); redrawAnn(); };
  $('xclr').onclick = () => { strokes = []; cur = null; redrawAnn(); };
  function setAnnotate(on) {
    if (on && busy) return;
    annotating = on; if (on && playing) pause();
    wrap.classList.toggle('annot', on); $('xanntools').classList.toggle('on', on);
    $('xannbtn').textContent = on ? '✕ Thoát ghi chú' : '✎ Ghi chú lỗi';
    if (!on) stopMic();
  }
  $('xannbtn').onclick = () => setAnnotate(!annotating);

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
    let shotId = ''; try { const sh = window.__shots && window.__shots.at(t).shot; shotId = sh ? sh.id : ''; } catch {}
    notes.push({ id: Date.now().toString(36), frame, t: +t.toFixed(3), shotId, text, img, created: new Date().toISOString() });
    notes.sort((a, b) => a.frame - b.frame);
    const ok = persist();
    strokes = []; cur = null; redrawAnn(); $('xnote').value = ''; stopMic();
    $('xmicst').textContent = ok ? 'Đã lưu ghi chú ở frame ' + frame + '.' : 'Đã lưu, nhưng bộ nhớ trình duyệt đầy: hãy bấm Gửi góp ý sớm (ảnh sẽ mất khi tải lại trang).';
    renderNotes();
  }
  $('xsave').onclick = saveNote;
  function renderNotes() {
    $('xnotes').innerHTML = notes.map((n, i) => `<div class="nt" data-i="${i}">${n.img ? `<img src="${n.img}" alt="">` : '<img alt="">'}` +
      `<div class="tx"><b>f${n.frame}</b> · ${n.t.toFixed(2)}s${n.shotId ? ' · ' + escapeHtml(n.shotId) : ''}<span>${escapeHtml(n.text || '(chỉ có nét vẽ)')}</span></div>` +
      `<button class="del" data-del="${i}" title="Xoá ghi chú">✕</button></div>`).join('');
    $('xsendrow').style.display = notes.length ? 'flex' : 'none'; $('xncnt').textContent = notes.length;
  }
  $('xnotes').onclick = (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { notes.splice(+d.dataset.del, 1); persist(); renderNotes(); return; }
    const n = e.target.closest('.nt'); if (n) goFrame(notes[+n.dataset.i].frame);
  };
  renderNotes();

  // gửi góp ý: 1 file json (ảnh dạng data URL)
  $('xsend').onclick = async () => {
    if (!notes.length) return;
    const d = new Date(), z = (n) => String(n).padStart(2, '0');
    const name = `gop-y_${epId}_${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}.json`;
    const data = { app: 'gop-y', version: 1, episode: epId, title, fps: FPS, duration: DUR, created: d.toISOString(), notes };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const st = (s) => { $('xsendst').textContent = s; };
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
    const O = opts(), tag = `${O.lang === 'en' ? '_EN' : '_VI'}${O.voice && O.vid ? '_' + O.vid[O.lang] : ''}${O.subs ? '' : '_nosub'}${O.voice ? '' : '_novoice'}${!sfxLayers.length || sfxLayers.every((L) => L.on) ? '' : sfxLayers.some((L) => L.on) ? '_tat-' + sfxLayers.filter((L) => !L.on).map((L) => L.id).join('-') : '_nosfx'}`;
    const name = `${title}${tag}_${P.w}x${P.h}${ts > 0 || te < DUR ? `_${ts}-${te}s` : ''}.mp4`.replace(/[\\/:*?"<>|]/g, '_');
    busy = true; cancel = false;
    $('xgo').disabled = true; $('xplay').disabled = true; $('xstop').style.display = '';
    for (const id of ['xlang', 'xvid', 'xsubs', 'xvoice', 'xres', 'xduck', 'xloud']) $(id).disabled = true;
    for (const el of document.querySelectorAll('#xsfx input')) el.disabled = true;
    for (const el of document.querySelectorAll('#xfx input, .xstep, #xframe, #xannbox button, #xannbox textarea')) el.disabled = true;
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

      const tStart = performance.now();
      try {
        for (let i = 0; i < N; i++) {
          if (cancel) throw new Error('Đã dừng.');
          if (encErr) throw encErr;
          const f = f0 + i, t = f / FPS;
          const p = window.renderAt(t); if (p && p.then) await p;
          g.drawImage(gl, 0, 0, P.w, P.h);
          drawCaption(g, cap, P.w / W0);
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
      for (const id of ['xlang', 'xvid', 'xsubs', 'xvoice', 'xres', 'xduck', 'xloud']) $(id).disabled = false;
      for (const el of document.querySelectorAll('#xsfx input')) el.disabled = false;
      for (const el of document.querySelectorAll('#xfx input, .xstep, #xframe, #xannbox button, #xannbox textarea')) el.disabled = false;
      if (!SR) $('xmic').disabled = true;
      show(+$('xseek').value);
    }
  };
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
  lines.forEach((ln, i) => {
    const y = top + lineH * (i + 0.5) + fontPx * 0.02;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowOffsetY = 6 * k * s; g.shadowBlur = 0;
    g.strokeText(ln, cx, y); g.restore();
    g.fillText(ln, cx, y);
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
