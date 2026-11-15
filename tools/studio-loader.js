// Trình khởi động của dist/studio.html (tools/bundle-studio.mjs nhúng nguyên file này). Kế hoạch: docs/handoff/tach-studio.md.
// Phần này KHÔNG tự cập nhật (bản an toàn cuối cùng). Việc:
//   • Thư mục studio: chọn 1 lần (File System Access), lưu handle trong IndexedDB → lần sau tự quét *.3js, nút Mở file mở đúng thư mục đó.
//   • Kho chung: lưu asset dùng chung (sha256 → Blob); báo khi kho-chung.3js trong thư mục mới hơn kho trong máy; xem danh sách kho.
//   • Lõi (engine + trình phát): bản gốc nhúng sẵn + tối đa 2 bản tải về (hiện tại, trước đó). Cập nhật mới nhất từ GitHub Release;
//     bản mới chạy thử ở lần mở tập kế tiếp: lỗi hoặc không tới window.__ready trong 180 s → tự quay về bản trước.
(function () {
  'use strict';
  var EMB = JSON.parse(document.getElementById('coremeta').textContent);
  var EMB_JS = document.getElementById('core').textContent;
  var Q = new URLSearchParams(location.search);
  var NGUON = Q.get('nguon');
  var API = NGUON ? NGUON + 'latest.json' : EMB.api, RAW = NGUON || EMB.raw;
  var ACTIVE = { version: EMB.version, mods: EMB.mods, js: EMB_JS, goc: true };   // lõi sẽ dùng
  var PACK = null, urls = new Map(), refUrls = {}, pending = null, DIR = null;
  var $ = function (id) { return document.getElementById(id); };
  function mb(n) { return (n / 1048576).toFixed(1) + ' MB'; }
  function msg(t, bad) { var m = $('smsg'); if (m) { m.textContent = t; m.className = bad ? 'bad' : ''; } else if (bad) alert(t); }
  function norm(u) { try { u = decodeURI(String(u)); } catch (e) {} return u.replace(/^[a-z]+:\/\/[^/]*/i, '').split('?')[0]; }
  function lookup(u) {
    if (!PACK) return null; var k = norm(u), F = PACK.files;
    if (!(k in F) && !(k in refUrls)) { var s = PACK.keys.find(function (x) { return k.endsWith(x); }); if (!s) return null; k = s; }
    if (k in refUrls) return refUrls[k];
    if (!urls.has(k)) { var e = F[k]; urls.set(k, URL.createObjectURL(new Blob([new Uint8Array(PACK.buf, PACK.base + e[1], e[2])], { type: e[0] }))); }
    return urls.get(k);
  }
  function parse(buf) {
    var u8 = new Uint8Array(buf, 0, 8);
    if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== '3JS1') throw new Error('Không phải file .3js');
    var n = new DataView(buf).getUint32(4, true);
    var h = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, n)));
    h.buf = buf; h.base = 8 + n; h.kind = h.kind || 'tap'; h.refs = h.refs || {}; return h;
  }
  async function headerOf(file) {   // chỉ đọc header (không đọc cả gói)
    var b8 = await file.slice(0, 8).arrayBuffer(), u8 = new Uint8Array(b8);
    if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== '3JS1') return null;
    var n = new DataView(b8).getUint32(4, true);
    var h = JSON.parse(new TextDecoder().decode(await file.slice(8, 8 + n).arrayBuffer())); h.kind = h.kind || 'tap'; h.refs = h.refs || {}; return h;
  }

  // ---- IndexedDB '3js-studio': blob (sha → Blob), path (đường dẫn → sha), meta (kho, khoDs, thuMuc, dangThu, dangMo, hong), core (hienTai, truocDo) ----
  var DB = null;
  function idb() {
    return DB || (DB = new Promise(function (res, rej) {
      var r = indexedDB.open('3js-studio', 2);
      r.onupgradeneeded = function () { ['blob', 'path', 'meta', 'core'].forEach(function (s) { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); }); };
      // tab studio khác (bản cũ) đang giữ kho ở phiên bản thấp hơn → nâng cấp bị chặn: báo rõ thay vì treo im lặng
      r.onblocked = function () {
        msg('Kho trong máy đang bị một tab studio khác giữ (bản cũ) — hãy ĐÓNG các tab studio / tập .html khác rồi đợi vài giây (tự chạy tiếp).', true);
        banner('⚠ Đóng các tab studio khác đang mở để studio này dùng được kho trong máy.');
      };
      r.onsuccess = function () {
        var d = r.result;
        d.onversionchange = function () {   // studio mới hơn ở tab khác cần nâng kho → nhường, không chặn nó
          d.close(); DB = null; banner('Một studio mới hơn vừa mở ở tab khác — tải lại trang này (F5) nếu cần dùng tiếp.');
        };
        res(d);
      };
      r.onerror = function () { DB = null; rej(r.error); };
    }));
  }
  function run(stores, mode, fn) {
    return idb().then(function (d) { return new Promise(function (res, rej) {
      var t = d.transaction(stores, mode), out = fn(t);
      t.oncomplete = function () { res(Array.isArray(out) ? out.map(function (r) { return r && r.result; }) : out && out.result); };
      t.onerror = t.onabort = function () { rej(t.error || new Error('IndexedDB lỗi (ổ đầy?)')); };
    }); });
  }
  function get(store, key) { return run(store, 'readonly', function (t) { return t.objectStore(store).get(key); }); }
  function put(store, key, val) { return run(store, 'readwrite', function (t) { return val === undefined ? t.objectStore(store).delete(key) : t.objectStore(store).put(val, key); }); }

  // ================= KHO CHUNG =================
  async function khoStatus(folderKho) {
    var m = await get('meta', 'kho').catch(function () { return null; });
    var el = $('skho');
    el.innerHTML = m ? 'Trong máy: <b>' + m.n + ' file</b>, ' + mb(m.bytes) + ' — dựng ' + new Date(m.built).toLocaleString('vi-VN') + '.'
      : 'Chưa có kho chung trong máy — chọn thư mục studio (tự nạp dist/kho-chung.3js) hoặc kéo file đó vào.';
    $('sxoa').style.display = m ? '' : 'none';
    var up = $('skhoup'); up.style.display = 'none';
    if (folderKho) {
      if (!m || m.built !== folderKho.h.built) {
        up.style.display = ''; up.onclick = function () { importFile(folderKho.file); };
        el.innerHTML += '<br><span class="warnc">⚠ Thư mục có kho-chung.3js ' + (m ? 'mới hơn' : 'chưa nạp') + ' (dựng ' +
          new Date(folderKho.h.built).toLocaleString('vi-VN') + ', ' + Object.keys(folderKho.h.files).length + ' file) → bấm “Cập nhật kho”.</span>';
      } else el.innerHTML += ' <span class="ok">Khớp kho-chung.3js trong thư mục.</span>';
    }
  }
  async function importKho(h) {
    msg('Đang lưu kho chung vào máy…');
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    var ds = {}, n = 0, bytes = 0;
    await run(['blob', 'path', 'meta'], 'readwrite', function (t) {
      var B = t.objectStore('blob'), P = t.objectStore('path'), seen = {};
      for (var p in h.files) {
        var e = h.files[p];   // [kiểu, vị trí, độ dài, sha256]
        if (!seen[e[3]]) { seen[e[3]] = 1; B.put(new Blob([new Uint8Array(h.buf, h.base + e[1], e[2])], { type: e[0] }), e[3]); bytes += e[2]; }
        P.put(e[3], p); ds[p] = [e[2], e[3]]; n++;
      }
      t.objectStore('meta').put({ built: h.built, n: n, bytes: bytes }, 'kho');
      t.objectStore('meta').put(ds, 'khoDs');
    });
    msg('Đã lưu kho chung: ' + n + ' file, ' + mb(bytes) + '.'); khoStatus(DIR && DIR.kho);
  }
  async function khoXem() {
    var el = $('skhods');
    if (el.innerHTML) { el.innerHTML = ''; return; }
    var ds = await get('meta', 'khoDs');
    if (!ds) { el.textContent = 'Kho trống.'; return; }
    var g = {};
    Object.keys(ds).sort().forEach(function (p) { var k = p.split('/').slice(1, 3).join('/'); (g[k] = g[k] || []).push(p); });
    el.innerHTML = Object.keys(g).sort(function (a, b) { return g[b].reduce(function (s, p) { return s + ds[p][0]; }, 0) - g[a].reduce(function (s, p) { return s + ds[p][0]; }, 0); }).map(function (k) {
      var tot = g[k].reduce(function (s, p) { return s + ds[p][0]; }, 0);
      return '<details><summary><b>' + k + '</b> — ' + g[k].length + ' file, ' + mb(tot) + '</summary><ul>' +
        g[k].map(function (p) { return '<li>' + p.split('/').slice(3).join('/') + ' <span>(' + (ds[p][0] / 1024).toFixed(0) + ' KB)</span></li>'; }).join('') + '</ul></details>';
    }).join('');
  }
  function resolveRefs(h) {   // điền refUrls; trả về đường dẫn còn thiếu
    var paths = Object.keys(h.refs);
    return run('blob', 'readonly', function (t) { var s = t.objectStore('blob'); return paths.map(function (p) { return s.get(h.refs[p][1]); }); }).then(function (blobs) {
      var miss = paths.filter(function (p, i) { if (blobs[i]) { refUrls[p] = URL.createObjectURL(blobs[i].slice(0, blobs[i].size, h.refs[p][0])); return false; } return true; });
      if (!miss.length) return miss;
      // sha lệch (kho dựng sau khi asset đổi) → bản mới nhất theo đường dẫn
      return run('path', 'readonly', function (t) { var s = t.objectStore('path'); return miss.map(function (p) { return s.get(p); }); }).then(function (shas) {
        return run('blob', 'readonly', function (t) { var s = t.objectStore('blob'); return shas.map(function (x) { return s.get(x || '-'); }); }).then(function (b2) {
          return miss.filter(function (p, i) {
            if (b2[i]) { console.warn('[kho] ' + p + ': bản trong kho khác lúc đóng gói ' + h.ep + ' — dùng bản trong kho'); refUrls[p] = URL.createObjectURL(b2[i].slice(0, b2[i].size, h.refs[p][0])); return false; }
            return true;
          });
        });
      });
    });
  }

  // ================= THƯ MỤC STUDIO =================
  var FSA = typeof window.showDirectoryPicker === 'function';
  async function chonThuMuc() {
    if (!FSA) return msg('Trình duyệt này không cho chọn thư mục (cần Chrome/Edge bản mới). Dùng nút Mở file hoặc kéo thả.', true);
    try {
      var h = await window.showDirectoryPicker({ id: '3js-studio', mode: 'read' });
      await put('meta', 'thuMuc', h); await quet(h);
    } catch (e) { if (e.name !== 'AbortError') msg(e.message, true); }
  }
  async function moLaiThuMuc(h) {
    try { if ((await h.requestPermission({ mode: 'read' })) === 'granted') return quet(h); } catch (e) { msg(e.message, true); }
  }
  async function quet(h) {
    var list = [], kho = null;
    for await (var e of h.values()) {
      if (e.kind !== 'file' || !/\.3js$/i.test(e.name)) continue;
      var f = await e.getFile(), hd = null;
      try { hd = await headerOf(f); } catch (er) {}
      if (!hd) continue;
      if (hd.kind === 'kho') { if (e.name === 'kho-chung.3js' || !kho) kho = { file: f, h: hd }; }
      else list.push({ file: f, h: hd });
    }
    DIR = { handle: h, list: list, kho: kho };
    list.sort(function (a, b) { return a.h.ep < b.h.ep ? -1 : 1; });
    $('sdir').innerHTML = 'Thư mục: <b>' + h.name + '</b> — ' + list.length + ' tập' + (kho ? ' + kho chung' : '') + '. Bấm một tập để mở.';
    $('sdirbtn').textContent = 'Đổi thư mục…'; $('sscan').style.display = '';
    var missBy = await thieuTheoTap(list);
    $('slist').innerHTML = '';
    list.forEach(function (it, i) {
      var d = document.createElement('div'); d.className = 'tap';
      d.innerHTML = '<b>' + it.h.ep + (it.h.title && it.h.title !== it.h.ep ? ' — ' + it.h.title : '') + '</b><span class="muted">' + mb(it.file.size) + '</span>' +
        '<span class="muted">đóng gói ' + new Date(it.h.built).toLocaleString('vi-VN') + (missBy[i] ? ' · <span class="warn">thiếu ' + missBy[i] + ' file kho chung' + (kho ? ' (tự nạp từ kho-chung.3js khi mở)' : ' → cần kho-chung.3js') + '</span>' : '') + '</span>' +
        '<span class="muted">' + (ACTIVE.version.slice(0, 10) < it.h.coreMin ? '<span class="warn">cần studio ≥ ' + it.h.coreMin + '</span>' : '') + '</span>';
      d.onclick = function () { importFile(it.file); };
      $('slist').appendChild(d);
    });
    khoStatus(kho);
  }
  async function thieuTheoTap(list) {   // đếm file kho chung còn thiếu của từng tập (theo sha256)
    var keys = await run('blob', 'readonly', function (t) { return t.objectStore('blob').getAllKeys(); }).catch(function () { return []; });
    var have = new Set(keys || []);
    return list.map(function (it) { return Object.keys(it.h.refs).filter(function (p) { return !have.has(it.h.refs[p][1]); }).length; });
  }
  async function moFile() {
    if (typeof window.showOpenFilePicker === 'function') {
      try {
        var opt = { id: '3js-studio', multiple: true, types: [{ description: 'Gói 3JS Studio', accept: { 'application/octet-stream': ['.3js'] } }] };
        if (DIR && DIR.handle) opt.startIn = DIR.handle;   // mở ngay trong thư mục studio đã chọn
        var hs = await window.showOpenFilePicker(opt), fs = [];
        for (var i = 0; i < hs.length; i++) fs.push(await hs[i].getFile());
        return readFiles(fs);
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    $('sfile').click();
  }

  // ================= LÕI: chọn bản, cập nhật, quay lại =================
  async function chonLoi() {
    var cur = await get('core', 'hienTai').catch(function () { return null; });
    var dangMo = await get('meta', 'dangMo').catch(function () { return null; });
    if (cur && dangMo === cur.version) {   // lần trước mở tập bằng bản đang thử mà không tới __ready → hỏng
      await quayLai('Bản ' + cur.version + ' lỗi ở lần mở trước');
      cur = await get('core', 'hienTai');
    }
    if (cur && cur.version > EMB.version) ACTIVE = cur;
    hienLoi();
  }
  async function quayLai(lyDo) {
    var cur = await get('core', 'hienTai'), prev = await get('core', 'truocDo');
    if (cur) await put('meta', 'hong', cur.version);
    await put('core', 'hienTai', prev && prev.version > EMB.version ? prev : undefined);
    await put('core', 'truocDo', undefined); await put('meta', 'dangThu', undefined); await put('meta', 'dangMo', undefined);
    var to = prev && prev.version > EMB.version ? prev.version : 'bản gốc ' + EMB.version;
    msg((lyDo ? lyDo + ' → ' : '') + 'đã quay về ' + to + '.', !!lyDo);
    try { localStorage.setItem('3js-studio-baoQuayLai', (lyDo || 'Quay lại') + ' → ' + to); } catch (e) {}
  }
  async function hienLoi() {
    var prev = await get('core', 'truocDo').catch(function () { return null; });
    $('sver').textContent = 'Studio ' + ACTIVE.version;
    $('score').innerHTML = 'Đang dùng: <b>' + ACTIVE.version + '</b> ' + (ACTIVE.goc ? '(bản gốc trong studio.html)' : '(bản tải về' + (ACTIVE.dangThu ? ', đang chạy thử' : '') + ')') +
      (prev ? ' · bản trước: ' + prev.version : '') + (ACTIVE.goc ? '' : ' · bản gốc: ' + EMB.version);
    $('sprev').style.display = prev ? '' : 'none'; $('sgoc').style.display = ACTIVE.goc ? 'none' : '';
    try { var b = localStorage.getItem('3js-studio-baoQuayLai'); if (b) { localStorage.removeItem('3js-studio-baoQuayLai'); banner('⚠ ' + b + '.'); } } catch (e) {}
  }
  function banner(html) { var b = $('sban'); b.innerHTML = html; b.className = 'box on'; }
  async function sha256(text) {
    var d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.prototype.map.call(new Uint8Array(d), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }
  async function kiemBanMoi(imLang) {
    var info = $('supdinfo'); info.textContent = 'Đang kiểm bản mới…';
    try {
      var rel = {};
      try { rel = await (await fetch(API, { cache: 'no-store' })).json(); } catch (e) {}
      // chưa có GitHub Release (vd chưa cài gh để tạo) → lấy bản mới nhất trên nhánh studio-ban
      if (!rel.tag_name) rel = { tag_name: 'studio-ban', body: '' };
      var r0 = await fetch(RAW + rel.tag_name + '/studio-core.json', { cache: 'no-store' });
      if (!r0.ok) throw new Error('chưa có bản phát hành nào (HTTP ' + r0.status + ')');
      var j = await r0.json();
      var hong = await get('meta', 'hong');
      if (!(j.version > ACTIVE.version)) { info.innerHTML = '<span class="ok">Đã là bản mới nhất (' + ACTIVE.version + ').</span>'; return; }
      info.innerHTML = 'Có bản mới <b>' + j.version + '</b> (' + mb(j.size) + ')' + (hong === j.version ? ' <span class="warnc">— bản này từng lỗi trên máy này</span>' : '') +
        '<br>' + String(rel.body || j.notes || '').replace(/</g, '&lt;').slice(0, 600).replace(/\n/g, '<br>') + '<div class="row"><button class="main" id="scai">Cài bản ' + j.version + '</button></div>';
      $('scai').onclick = function () { caiBan(rel.tag_name, j); };
      if (imLang) banner('Có studio bản mới ' + j.version + ' — xem mục “Phiên bản studio”.');
    } catch (e) { info.innerHTML = imLang ? '' : '<span class="warnc">Không kiểm được: ' + e.message + ' (cần mạng).</span>'; }
  }
  async function caiBan(tag, j) {
    var info = $('supdinfo'); info.textContent = 'Đang tải ' + j.version + '…';
    try {
      var js = await (await fetch(RAW + tag + '/studio-core.js', { cache: 'no-store' })).text();
      if ((await sha256(js)) !== j.sha256) throw new Error('mã kiểm tra sha256 không khớp — không cài');
      if (js.indexOf('globalThis.__studioCore') < 0) throw new Error('không phải lõi studio');
      var cur = await get('core', 'hienTai');
      await put('core', 'truocDo', cur || undefined);
      await put('core', 'hienTai', { version: j.version, mods: j.mods, js: js, notes: j.notes || '', dangThu: true });
      await put('meta', 'dangThu', j.version);
      ACTIVE = await get('core', 'hienTai'); hienLoi();
      info.innerHTML = '<span class="ok">Đã cài ' + j.version + '.</span> Bản này chạy thử ở lần mở tập tới; lỗi thì tự quay về bản đang dùng.';
    } catch (e) { info.innerHTML = '<span class="bad">Cài thất bại: ' + e.message + '</span>'; }
  }

  // ================= MỞ GÓI =================
  function fetchBuf(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }); }
  async function importFile(f) { msg('Đang đọc ' + f.name + '…'); try { await handle(await f.arrayBuffer(), f.name); } catch (e) { msg(f.name + ': ' + e.message, true); } }
  async function readFiles(list) {   // nhiều file một lần: kho trước, tập sau
    var fs = Array.prototype.slice.call(list).sort(function (a, b) { return (b.name.indexOf('kho') === 0) - (a.name.indexOf('kho') === 0); });
    for (var i = 0; i < fs.length; i++) await importFile(fs[i]);
  }
  async function handle(buf, name) {
    var h; try { h = parse(buf); } catch (e) { return msg(name + ': ' + e.message, true); }
    if (h.kind === 'kho') { await importKho(h); if (pending) { var p = pending; pending = null; return handle(p.buf, p.name); } return; }
    if (ACTIVE.version.slice(0, 10) < h.coreMin) return msg('Gói ' + h.ep + ' cần studio ≥ ' + h.coreMin + ' (đang ' + ACTIVE.version + ') — bấm “Cập nhật mới nhất”.', true);
    var thieu = h.mods.filter(function (k) { return ACTIVE.mods.indexOf(k) < 0; });
    if (thieu.length) return msg('Studio thiếu ' + thieu.length + ' module (' + thieu.slice(0, 3).join(', ') + ') — bấm “Cập nhật mới nhất”.', true);
    if (Object.keys(h.refs).length) {
      msg('Đang lấy asset dùng chung từ kho…');
      var lau = setTimeout(function () { msg('Lấy asset từ kho lâu bất thường — nếu còn tab studio / tập .html khác đang mở, hãy đóng chúng rồi tải lại trang (F5).', true); }, 10000);
      var miss = await resolveRefs(h).catch(function () { return Object.keys(h.refs); });
      clearTimeout(lau);
      if (miss.length) {   // tự nạp kho: kho-chung.3js trong thư mục studio đã chọn, hoặc cạnh studio (http / công cụ tự động)
        try {
          if (DIR && DIR.kho) await importKho(parse(await DIR.kho.file.arrayBuffer()));
          else await importKho(parse(await fetchBuf(Q.get('kho') || 'kho-chung.3js')));
          miss = await resolveRefs(h);
        } catch (e) {}
      }
      if (miss.length) {
        pending = { buf: buf, name: name };
        var b = miss.reduce(function (s, p) { return s + h.refs[p][2]; }, 0);
        return msg('Tập ' + h.ep + ' cần ' + miss.length + ' file dùng chung (' + mb(b) + ') chưa có trong máy.\nCách sửa: chạy node tools/kho-chung.mjs (dựng lại dist/kho-chung.3js) rồi kéo file đó vào đây — tập sẽ tự mở.', true);
      }
    }
    open(h);
  }
  function open(h) {
    PACK = h; PACK.keys = Object.keys(h.files).concat(Object.keys(h.refs));
    var A = ACTIVE;
    window.__embedURL = lookup; window.__pack = { ep: h.ep, title: h.title, built: h.built, core: A.version, coreGoc: !!A.goc };
    var _fetch = window.fetch.bind(window);
    window.fetch = function (input, init) { var u = typeof input === 'string' ? input : input.url; var b = lookup(u); return _fetch(b || input, init); };
    var thu = !A.goc && A.dangThu;
    window.__studioRun = async function () {
      var hong = function (lyDo) {
        if (!thu) return;
        quayLai('Bản ' + A.version + ' ' + lyDo).then(function () { location.reload(); });
      };
      var cho = thu && setTimeout(function () { if (!window.__ready) hong('không mở được tập trong 180 s'); }, 180000);
      try {
        if (thu) await put('meta', 'dangMo', A.version);
        await import(URL.createObjectURL(new Blob([A.js], { type: 'text/javascript' })));
        await import(lookup(h.js));
        if (thu) {   // tới đây là module tập đã chạy xong (đã đặt __ready) → bản thử đạt
          clearTimeout(cho);
          A.dangThu = false; await put('core', 'hienTai', A); await put('meta', 'dangThu', undefined); await put('meta', 'dangMo', undefined);
        }
        window.__studioMoXong = true;   // công cụ kiểm (tools/kiem-cap-nhat.mjs) chờ cờ này
      } catch (e) {
        console.error(e); document.documentElement.setAttribute('data-xload', 'Lỗi mở tập: ' + (e && e.message || e));
        clearTimeout(cho); hong('lỗi: ' + (e && e.message || e));
      }
    };
    var COVER = (navigator.webdriver && !Q.has('ui')) ? '' :
      '<script>(function(){var d=document.documentElement;d.setAttribute("data-xload","Đang mở trình phát…");var s=document.createElement("style");s.id="xpre";s.textContent="html,body{background:#0d0f14!important}body>*{visibility:hidden!important}html::after{content:attr(data-xload);position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#8b93a7;font:15px system-ui,sans-serif;z-index:2147483647}";d.appendChild(s);setTimeout(function(){s.remove()},90000)})()<\/script>';
    var page = h.page.replace(/__PACK__:([^"]+)/g, function (m, k) { return lookup(k) || k; })
      .replace('<!--__EP_MODULE__-->', '<script type="module">window.__studioRun()<\/script>')
      .replace(/<head>/i, function (x) { return x + COVER; });
    document.open(); document.write(page); document.close();
  }

  // ================= GẮN NÚT + KHỞI ĐỘNG =================
  window.__studioOpen = handle;
  window.__studio = { kiemBanMoi: kiemBanMoi, caiBan: caiBan, quayLai: quayLai, active: function () { return { version: ACTIVE.version, goc: !!ACTIVE.goc, dangThu: !!ACTIVE.dangThu }; } };
  $('sdirbtn').onclick = chonThuMuc;
  $('sscan').onclick = function () { if (DIR) quet(DIR.handle); };
  $('sopen').onclick = moFile;
  $('sfile').addEventListener('change', function (e) { readFiles(e.target.files); });
  $('skhoxem').onclick = khoXem;
  $('sxoa').onclick = function () {
    if (!confirm('Xoá kho asset dùng chung khỏi máy? Lần mở tập sau phải nạp lại dist/kho-chung.3js.')) return;
    run(['blob', 'path', 'meta'], 'readwrite', function (t) { t.objectStore('blob').clear(); t.objectStore('path').clear(); t.objectStore('meta').delete('kho'); t.objectStore('meta').delete('khoDs'); })
      .then(function () { msg('Đã xoá kho chung.'); $('skhods').innerHTML = ''; khoStatus(DIR && DIR.kho); });
  };
  $('supd').onclick = function () { kiemBanMoi(false); };
  $('sprev').onclick = async function () {
    var cur = await get('core', 'hienTai'), prev = await get('core', 'truocDo');
    if (!prev) return; await put('core', 'hienTai', prev); await put('core', 'truocDo', cur || undefined); ACTIVE = prev; msg('Đã chuyển về ' + prev.version + '.'); hienLoi();
  };
  $('sgoc').onclick = async function () {
    var cur = await get('core', 'hienTai'); if (cur) await put('core', 'truocDo', cur);
    await put('core', 'hienTai', undefined); ACTIVE = { version: EMB.version, mods: EMB.mods, js: EMB_JS, goc: true }; msg('Đang dùng bản gốc ' + EMB.version + '.'); hienLoi();
  };
  try { $('sauto').checked = localStorage.getItem('3js-studio-tuKiem') === '1'; } catch (e) {}
  $('sauto').onchange = function (e) { try { localStorage.setItem('3js-studio-tuKiem', e.target.checked ? '1' : '0'); } catch (er) {} };
  addEventListener('dragover', function (e) { e.preventDefault(); document.body.classList.add('drag'); });
  addEventListener('dragleave', function () { document.body.classList.remove('drag'); });
  addEventListener('drop', function (e) { e.preventDefault(); document.body.classList.remove('drag'); readFiles(e.dataTransfer.files); });

  (async function boot() {
    await chonLoi().catch(function (e) { console.warn('[studio] chọn lõi:', e); hienLoi(); });
    window.__studioSan = true;   // đã chọn xong lõi (công cụ kiểm chờ cờ này)
    khoStatus(null);
    var th = await get('meta', 'thuMuc').catch(function () { return null; });
    if (th && !Q.get('goi')) {
      var perm = await th.queryPermission({ mode: 'read' }).catch(function () { return 'denied'; });
      if (perm === 'granted') await quet(th).catch(function (e) { msg(e.message, true); });
      else {
        $('sdir').innerHTML = 'Thư mục đã nhớ: <b>' + th.name + '</b> — trình duyệt cần bạn cho phép đọc lại.';
        $('sdirbtn').textContent = 'Cho phép đọc ' + th.name; $('sdirbtn').onclick = function () { moLaiThuMuc(th); };
        var other = document.createElement('button'); other.textContent = 'Đổi thư mục…'; other.onclick = chonThuMuc; $('sdirbtn').after(other);
      }
    }
    var q = Q.get('goi');
    if (q) { msg('Đang tải ' + q + '…'); fetchBuf(q).then(function (b) { return handle(b, q); }, function (e) { msg('Không tải được ' + q + ': ' + e.message + ' — dùng nút Mở file.', true); }); }
    else { try { if (localStorage.getItem('3js-studio-tuKiem') === '1') kiemBanMoi(true); } catch (e) {} }
  })();
})();
