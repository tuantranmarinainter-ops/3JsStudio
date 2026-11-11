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
    @media (max-aspect-ratio: 1/1) { body { flex-direction: column; gap: 12px; } #xui { width: min(92vw, 420px); } }
  `;
  document.head.appendChild(css);
  const wrap = document.createElement('div'); wrap.id = 'xwrap';
  root.parentNode.insertBefore(wrap, root); wrap.appendChild(root);
  const ui = document.createElement('div'); ui.id = 'xui';
  ui.innerHTML = `
    <h1>${escapeHtml(title)}</h1>
    <div class="muted">${W0}×${H0} · ${FPS} fps · ${fmt(DUR)}</div>
    <div class="row"><span class="lbl">Ngôn ngữ</span><select id="xlang"><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div>
    <div class="row" id="xvidrow"><span class="lbl">Giọng</span><select id="xvid"></select></div>
    <div class="row"><label class="chk"><input id="xsubs" type="checkbox" checked> Phụ đề</label><label class="chk"><input id="xvoice" type="checkbox" checked> Giọng đọc</label></div>
    <div id="xsfxbox" style="display:none"><div class="lbl" style="width:auto;margin:2px 0 6px">Tiếng động</div><div id="xsfx"></div></div>
    <div id="xfxbox" style="display:none"><div class="lbl" style="width:auto;margin:2px 0 6px">Hiệu ứng hình</div><div id="xfx" class="fxgrid"></div></div>
    <div class="row"><button id="xplay">▶ Xem</button><input id="xseek" type="range" min="0" max="${DUR}" step="0.001" value="0"><span id="xtime">0:00.0</span></div>
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
  let playing = false, raf = 0, t0 = 0, wall0 = 0;
  const show = (t) => { window.renderAt(t); $('xseek').value = t; $('xtime').textContent = fmt(t, true); };
  function loop() {
    const t = audioEl && !audioEl.paused ? audioEl.currentTime : t0 + (performance.now() - wall0) / 1000;
    if (t >= DUR) { pause(); show(DUR - 1e-3); return; }
    show(t); raf = requestAnimationFrame(loop);
  }
  // LỚP TIẾNG ĐỘNG: mỗi <audio data-sfx-layer> = 1 lớp (nền, bước chân, khoảnh khắc…) — bật/tắt + âm lượng riêng
  const sfxLayers = [...document.querySelectorAll('audio[data-sfx-layer]')].map((el) => ({ el, id: el.dataset.sfxLayer, label: el.dataset.label || el.dataset.sfxLayer, on: true, gain: 1 }));
  if (sfxLayers.length) {
    $('xsfxbox').style.display = '';
    $('xsfx').innerHTML = sfxLayers.map((L, i) => `<div class="sfxrow"><label class="chk"><input type="checkbox" data-sl="${i}" checked> ${escapeHtml(L.label)}</label>` +
      `<input type="range" min="0" max="150" step="5" value="100" data-sv="${i}"><span class="pct" id="xsp${i}">100%</span></div>`).join('');
    $('xsfx').oninput = (e) => {
      const i = e.target.dataset.sv; if (i === undefined) return;
      sfxLayers[i].gain = e.target.value / 100; $('xsp' + i).textContent = e.target.value + '%';
      sfxLayers[i].el.volume = Math.min(1, sfxLayers[i].gain);
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
    raf = requestAnimationFrame(loop);
  }
  function pause() { playing = false; $('xplay').textContent = '▶ Xem'; cancelAnimationFrame(raf); if (audioEl) audioEl.pause(); for (const L of sfxLayers) L.el.pause(); }
  $('xplay').onclick = () => (playing ? pause() : play());
  $('xseek').oninput = () => { if (playing) pause(); show(+$('xseek').value); };
  addEventListener('keydown', (e) => { if (e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); playing ? pause() : play(); } });

  // ---- XUẤT MP4 ----
  let cancel = false;
  $('xstop').onclick = () => { cancel = true; };
  $('xgo').onclick = async () => {
    if (busy) return;
    pause();
    const P = PRESETS[$('xres').value];
    const ts = Math.max(0, +$('xs').value || 0), te = Math.min(DUR, +$('xe').value || DUR);
    const f0 = Math.round(ts * FPS), f1 = Math.round(te * FPS), N = f1 - f0;
    if (N <= 0) { $('xstat').textContent = 'Đoạn rỗng.'; return; }
    const O = opts(), tag = `${O.lang === 'en' ? '_EN' : '_VI'}${O.voice && O.vid ? '_' + O.vid[O.lang] : ''}${O.subs ? '' : '_nosub'}${O.voice ? '' : '_novoice'}${sfxLayers.length && !sfxLayers.some((L) => L.on) ? '_nosfx' : ''}`;
    const name = `${title}${tag}_${P.w}x${P.h}${ts > 0 || te < DUR ? `_${ts}-${te}s` : ''}.mp4`.replace(/[\\/:*?"<>|]/g, '_');
    busy = true; cancel = false;
    $('xgo').disabled = true; $('xplay').disabled = true; $('xstop').style.display = '';
    for (const id of ['xlang', 'xvid', 'xsubs', 'xvoice', 'xres']) $(id).disabled = true;
    for (const el of document.querySelectorAll('#xsfx input')) el.disabled = true;
    for (const el of document.querySelectorAll('#xfx input')) el.disabled = true;
    const setStat = (s) => { $('xstat').textContent = s; };
    const bar = $('xbar').firstElementChild;
    let fileHandle = null, stream = null;
    try {
      // 1. chọn codec
      const vcfg = await pickVideoConfig(P, FPS);
      if (!vcfg) throw new Error('Máy/trình duyệt không mã hoá được H.264/VP9 ở độ phân giải này.');
      const vEl = voiceEl();
      const vBuf = vEl ? await loadAudio(vEl.currentSrc || vEl.src) : null;
      const parts = vBuf ? [[vBuf, 1]] : [];
      for (const L of sfxLayers) if (L.on && L.gain > 0) { const b = await loadAudio(L.el.currentSrc || L.el.src); if (b) parts.push([b, L.gain]); }
      const audio = mixBuffers(parts);   // giọng + các lớp tiếng động (theo âm lượng từng lớp) → 1 track
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
      setStat(`Xong: ${name}\n${N} frame trong ${fmtS(el)} · video ${vcfg.mux.toUpperCase()}${acfg ? ' + ' + acfg.mux.toUpperCase() : ''}`);
      bar.style.width = '100%';
    } catch (e) {
      console.error(e);
      setStat('Lỗi: ' + (e && e.message || e));
      if (stream) { try { await stream.abort(); } catch {} }
    } finally {
      busy = false; $('xgo').disabled = false; $('xplay').disabled = false; $('xstop').style.display = 'none';
      for (const id of ['xlang', 'xvid', 'xsubs', 'xvoice', 'xres']) $(id).disabled = false;
      for (const el of document.querySelectorAll('#xsfx input')) el.disabled = false;
      for (const el of document.querySelectorAll('#xfx input')) el.disabled = false;
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
function mixBuffers(parts) {   // parts = [[AudioBuffer, gain], …]
  if (!parts.length) return null;
  if (parts.length === 1 && parts[0][1] === 1) return parts[0][0];
  const bufs = parts.map((p) => p[0]);
  const sr = bufs[0].sampleRate, ch = Math.max(...bufs.map((b) => b.numberOfChannels)), len = Math.max(...bufs.map((b) => b.length));
  const data = Array.from({ length: ch }, () => new Float32Array(len));
  for (const [b, g] of parts) for (let c = 0; c < ch; c++) {
    const src = b.getChannelData(Math.min(c, b.numberOfChannels - 1)), dst = data[c];
    for (let i = 0; i < src.length; i++) dst[i] += src[i] * g;
  }
  for (const d of data) for (let i = 0; i < d.length; i++) { const x = d[i]; d[i] = x > 1 ? 1 : x < -1 ? -1 : x; }
  return { sampleRate: sr, numberOfChannels: ch, length: len, getChannelData: (c) => data[c] };
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
