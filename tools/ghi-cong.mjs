// Tự sinh phần GHI CÔNG của một tập từ các file CREDITS + manifest, lọc theo asset TẬP ĐÓ DÙNG.
//   node tools/ghi-cong.mjs <ep> [--goc <thư mục gốc>] [--khong-anh] [--cho-phep-chua-ro]
// Ra:  episodes/<ep>/ghi-cong.txt   văn bản dán mô tả YouTube (đủ dòng, có URL)
//      episodes/<ep>/ghi-cong.png   ảnh 1080×1920 hiện 3 giây cuối trong trình phát (tuỳ chọn `credits`, engine/credits.js)
//      episodes/<ep>/ghi-cong.json  số đo: cỡ chữ nhỏ nhất, mức gom dòng… (tool kiểm lại, test đọc)
// Asset "đã dùng" = id (hoặc tên cuối của id) xuất hiện trong shots.js / episode.js / các env mà shots gọi (engine/envs/<env>.js
// + module nó import), tên tiếng động trong sfx/*.json, bài nhạc trong music/plan.json.
// CC BY (mọi giấy phép đòi ghi công) của asset dùng → phải có; CC0 → gom 1 dòng theo nguồn; asset không dùng → không có.
// Ảnh: trang HTML tạm chụp bằng launchBrowser (tools/browser.mjs), phông Be Vietnam Pro cục bộ, chữ ≥ 28 px.
// Quá nhiều dòng → gom theo tác giả (mức 1, 2); vẫn tràn → thoát 1.
// Asset ĐANG DÙNG mà CREDITS không ghi giấy phép (vd bộ trời Roblox assets/sky) → 'chưa rõ': cảnh báo stderr, ghi vào ghi-cong.json
// (khoá chuaRo) và khối '#' cuối ghi-cong.txt, KHÔNG vào ảnh. MÃ THOÁT 3 = xong nhưng có mục chưa rõ (file vẫn ghi đủ);
// --cho-phep-chua-ro → vẫn cảnh báo nhưng thoát 0. Các mã: 0 ổn, 1 ảnh tràn, 2 sai tham số, 3 chưa rõ giấy phép (xem --help).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 1080, H = 1920, MIN_FONT = 28, SIZES = [32, 30, 28];

const rd = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const rdj = (p) => { const s = rd(p); if (s == null) return null; try { return JSON.parse(s); } catch { return null; } };
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const htmlEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const normUrl = (u) => String(u).toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').replace(/[\s).,;]+$/, '').replace(/\/+$/, '');

// ---------- giấy phép ----------
export function chuanGiayPhep(raw, urlHint = '') {
  const s = String(raw || '');
  if (/cc0|public ?domain|publicdomain/i.test(s)) return 'CC0';
  let m = s.match(/CC[ -]?BY(?:[ -]?(SA|NC(?:-?(?:SA|ND))?|ND))?[ -]*(\d\.\d)?/i);
  if (m) return `CC BY${m[1] ? '-' + m[1].toUpperCase().replace(/^-/, '') : ''} ${m[2] || (urlHint.match(/licenses\/by[a-z-]*\/(\d\.\d)/i) || [, '4.0'])[1]}`;
  if (/^\s*by\s*$/i.test(s) || /licensed (?:under )?by\b/i.test(s)) return `CC BY ${(urlHint.match(/licenses\/by\/(\d\.\d)/i) || [, '4.0'])[1]}`;
  return s.trim();
}

// ---------- đọc một dòng CREDITS ----------
const URL_RE = /https?:\/\/[^\s),]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|dev|org|net|io|nl)\/[^\s),]+/gi;
export function docDong(line) {
  const t = line.trim().replace(/^[-*]\s+/, '');
  if (!t || t.startsWith('#') || t.startsWith('|')) return null;
  if (!/\sby\s/i.test(t) || !/CC[ -]?BY|CC0|licensed|\bBY\b/i.test(t)) return null;
  let title, rest;
  const q = t.match(/["“]([^"”]+)["”]/);
  if (q) { title = q[1].trim(); rest = t.slice(t.indexOf(q[0]) + q[0].length); }
  else { const i = t.search(/\sby\s/i); title = t.slice(0, i).trim(); rest = t.slice(i); }
  const am = rest.match(/\sby\s+(.+?)(?=\s*(?:\(|,|$))/i);
  const author = am ? am[1].trim() : '';
  const urls = [...t.matchAll(URL_RE)].map((m) => m[0]);
  const lic = chuanGiayPhep(rest.replace(/\(https?:[^)]*\)/g, (u) => u), urls.find((u) => /creativecommons/i.test(u)) || '');
  const licSrc = rest.match(/(?:licensed|,)\s*(?:under\s+)?(CC[ -]?BY[^,.()]*|CC0|BY)\b/i);
  return { title, author, urls: urls.filter((u) => !/creativecommons/i.test(u)), license: licSrc ? chuanGiayPhep(licSrc[1], urls.find((u) => /creativecommons/i.test(u)) || '') : lic, raw: t };
}
// Phân loại: can-ghi-cong (CC BY…), cc0, chua-ro (không thấy tên giấy phép đã biết, hoặc ghi "chịu trách nhiệm"/"chưa rõ"/"unknown")
export function phanLoai(lic, ghiChu = '') {
  if (/chịu trách nhiệm|chưa rõ|unknown/i.test(ghiChu)) return 'chua-ro';
  if (/^CC0$/.test(lic)) return 'cc0';
  if (/^CC BY/.test(lic)) return 'can-ghi-cong';
  if (/\b(MIT|OFL|Apache|BSD|ISC|zlib)\b/i.test(lic)) return 'khac-biet';
  return 'chua-ro';
}
export function docCredits(text) { return String(text || '').split(/\r?\n/).map(docDong).filter(Boolean).map((e) => ({ ...e, clazz: phanLoai(e.license) })); }
// Bảng Markdown (vd assets/sky/CREDITS.md): mỗi hàng `ten/` | nguồn | ghi chú
export function docBang(text, file = '') {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const t = line.trim(); if (!t.startsWith('|') || /^\|[\s|:-]+$/.test(t)) continue;
    const cells = t.split('|').slice(1, -1).map((c) => c.trim());
    const m = cells[0] && cells[0].match(/`([^`]+)`/); if (!m) continue;
    const lic = (t.match(/CC0|public ?domain|CC[ -]?BY[ -]*(?:SA|NC|ND)?[ -]*\d?\.?\d?|\b(?:MIT|OFL|Apache|BSD|ISC|zlib)\b/i) || [''])[0];
    const clazz = phanLoai(chuanGiayPhep(lic), t);
    const ghi = cells.slice(1).join(' | ');
    out.push({ ten: m[1].replace(/\/+$/, ''), file, nguon: cells[1] || '', license: lic ? chuanGiayPhep(lic) : '', clazz,
      lyDo: clazz !== 'chua-ro' ? '' : /chịu trách nhiệm|chưa rõ|unknown/i.test(t) ? `CREDITS ghi: ${ghi}` : 'CREDITS không ghi giấy phép nào nhận ra' });
  }
  return out;
}

// ---------- thu thập asset đã dùng ----------
function gomChuoi(v, out) { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach((x) => gomChuoi(x, out)); else if (v && typeof v === 'object') Object.values(v).forEach((x) => gomChuoi(x, out)); return out; }
function docThuMuc(dir) { try { return fs.readdirSync(dir); } catch { return []; } }

// Theo chuỗi import tương đối ('./x.js', '../x.js', '/engine/x.js') tới độ sâu 4; bỏ vendor/; `seen` chống vòng lặp.
const IMPORT_RE = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
function theoImport(goc, file, text, depth, seen) {
  let out = '';
  if (depth > 4) return out;
  for (const m of text.matchAll(IMPORT_RE)) {
    const spec = m[1];
    if (!spec.startsWith('.') && !spec.startsWith('/')) continue;
    const p = spec.startsWith('/') ? path.join(goc, spec) : path.resolve(path.dirname(file), spec);
    if (/[\\/]vendor[\\/]/.test(p) || !/\.m?js$/.test(p) || seen.has(p)) continue;
    seen.add(p);
    const t = rd(p); if (t == null) continue;
    out += '\n' + t + theoImport(goc, p, t, depth + 1, seen);
  }
  return out;
}

function ngu(goc, ep) {
  const epDir = path.join(goc, 'episodes', ep);
  let corpus = ['shots.js', 'episode.js'].map((f) => rd(path.join(epDir, f)) || '').join('\n');
  // nhân vật R15 dựng từ một thân GLB dùng chung (engine/r15.js) — tập nào có diễn viên R15 thì dùng nó
  if (/createR15|buildCast|actors\s*:/.test(corpus)) corpus += '\ncharacters/r15_body';
  // env được gọi (+ props.js) → thêm mã của chúng và mọi module chúng import (đệ quy, sâu ≤ 4)
  const envDir = path.join(goc, 'engine', 'envs'), seen = new Set();
  const roots = docThuMuc(envDir).filter((x) => x.endsWith('.js') && new RegExp(`['"\`]${esc(x.replace(/\.js$/, ''))}['"\`]`).test(corpus)).map((x) => path.join(envDir, x));
  roots.push(path.join(goc, 'engine', 'props.js'));
  for (const f of roots) { const src = rd(f); if (src == null) continue; seen.add(f); corpus += '\n' + src + theoImport(goc, f, src, 1, seen); }
  // engine/envs.js chỉ dùng để dò trời mặc định (nó liệt kê MỌI asset của MỌI env nên không đưa vào corpus asset)
  const skyCorpus = corpus + '\n' + (rd(path.join(goc, 'engine', 'envs.js')) || '');
  const sfxStr = []; const sfxDir = path.join(epDir, 'sfx');
  for (const f of docThuMuc(sfxDir).filter((x) => x.endsWith('.json'))) gomChuoi(rdj(path.join(sfxDir, f)), sfxStr);
  const plan = rdj(path.join(epDir, 'music', 'plan.json'));
  const tracks = new Set(((plan && plan.segments) || []).map((s) => s && s.track).filter(Boolean));
  return { corpus, skyCorpus, sfxStr: new Set(sfxStr.map((s) => s.toLowerCase())), tracks };
}
const dungTrong = (corpus, id) => {
  const base = id.split('/').pop();
  const re = (s) => new RegExp(`(^|[^\\w-])${esc(s)}($|[^\\w-])`);
  return re(id).test(corpus) || (base.length >= 8 && re(base).test(corpus));
};

function nguonNhan(hay) {
  if (/kenney\.nl/.test(hay)) return ['Kenney', 'kenney.nl'];
  if (/polyhaven\.com/.test(hay)) return ['Poly Haven', 'polyhaven.com'];
  if (/kaylousberg|kaykit/.test(hay)) return ['KayKit (Kay Lousberg)', 'kaylousberg.com'];
  if (/quaternius/.test(hay)) return ['Quaternius', 'quaternius.com'];
  if (/freesound\.org/.test(hay)) return ['Freesound', 'freesound.org'];
  if (/jamendo\.com/.test(hay)) return ['Jamendo', 'jamendo.com'];
  const d = hay.match(/([a-z0-9-]+\.(?:com|dev|org|net|io|nl))/);
  return [d ? d[1] : hay.slice(0, 40), d ? d[1] : ''];
}

export function thuThap(goc, ep, du = ngu(goc, ep)) {
  const { corpus, sfxStr, tracks } = du;
  const recs = [];
  const manifest = rdj(path.join(goc, 'assets', 'manifest.json')) || [];
  for (const e of Array.isArray(manifest) ? manifest : []) {
    if (!e || !e.id || !dungTrong(corpus, e.id)) continue;
    const c = e.credit ? docDong(e.credit.replace(/^["“]?/, '- ')) : null;
    recs.push({ kind: 'model', file: 'assets/manifest.json', title: e.title || (c && c.title) || e.id, author: e.author || (c && c.author) || '', license: chuanGiayPhep(e.license, e.url || ''),
      url: e.url || (c && c.urls[0]) || (e.source && /\./.test(e.source) ? e.source : ''), hay: [e.id, e.source, e.url, e.credit].filter(Boolean).join(' ').toLowerCase() });
  }
  const sfx = rdj(path.join(goc, 'assets', 'sfx', 'sfx_manifest.json')) || {};
  for (const [k, e] of Object.entries(sfx)) {
    if (!e || e.missing || !e.license || !sfxStr.has(k.toLowerCase())) continue;
    recs.push({ kind: 'sfx', file: 'assets/sfx/sfx_manifest.json', title: e.title || k, author: e.creator || '', license: chuanGiayPhep(e.license, e.license_url || ''), url: e.source_url || '', hay: [k, e.source_url].filter(Boolean).join(' ').toLowerCase() });
  }
  const mus = rdj(path.join(goc, 'assets', 'music', 'music_manifest.json')) || {};
  for (const k of tracks) {
    const e = mus[k]; if (!e) continue;
    recs.push({ kind: 'music', file: 'assets/music/music_manifest.json', title: e.title || k, author: e.creator || '', license: chuanGiayPhep(e.license, e.license_url || ''), url: e.source_url || '', hay: [k, e.source_url].filter(Boolean).join(' ').toLowerCase() });
  }
  return recs;
}

function docMoiCredits(goc) {
  const files = ['assets/CREDITS.md', ...['characters', 'music', 'polyfork', 'polyhaven', 'sfx', 'sky'].map((d) => `assets/${d}/CREDITS.md`)];
  return files.flatMap((f) => docCredits(rd(path.join(goc, f))));
}
const khop = (rec, ent) => { const hay = rec.hay.replace(/https?:\/\/(www\.)?/g, ''); return ent.urls.some((u) => { const n = normUrl(u); return n.length > 6 && new RegExp(`(^|[^\\w/-])${esc(n)}($|[^\\w-])`).test(hay); }); };

// ---------- dòng ghi công ----------
export function dungDong(goc, ep) {
  const du = ngu(goc, ep), recs = thuThap(goc, ep, du), ents = docMoiCredits(goc);
  const by = [], cc0 = new Map(), seen = new Set(), chuaRo = [];
  // Trời (skybox): mục assets/sky/CREDITS.md (bảng) mà tập đang dùng → xếp loại; chưa rõ thì phải báo
  const skyFile = 'assets/sky/CREDITS.md', skyEnts = docBang(rd(path.join(goc, skyFile)), skyFile);
  const skyDirs = docThuMuc(path.join(goc, 'assets', 'sky')).filter((n) => { try { return fs.statSync(path.join(goc, 'assets', 'sky', n)).isDirectory(); } catch { return false; } });
  const tenSky = new Set([...skyDirs, ...skyEnts.map((e) => e.ten), ...[...du.skyCorpus.matchAll(/['"`](sky-\d+)['"`]/g)].map((m) => m[1])]);
  const skyLines = [];
  for (const ten of [...tenSky].sort()) {
    // 'sky-<n>' là tên riêng → khớp chuỗi trích dẫn; tên chung ('moon', 'clear-day'…) phải nằm sau chữ sky/skybox trên cùng dòng (tránh trùng tên object 'moon')
    const q = `['"\`]${esc(ten)}['"\`]`;
    if (!new RegExp(/^sky-\d+$/.test(ten) ? q : `sky[^\\n]{0,80}${q}`, 'i').test(du.skyCorpus)) continue;
    const e = skyEnts.find((x) => x.ten === ten);
    if (!e) chuaRo.push({ ten, nguon: 'assets/sky/ (không có mục nào trong ' + skyFile + ')', lyDo: 'trời đang dùng nhưng CREDITS không nhắc tới' });
    else if (e.clazz === 'chua-ro') chuaRo.push({ ten, nguon: e.file, lyDo: e.lyDo });
    else if (e.clazz === 'can-ghi-cong') skyLines.push({ title: ten, author: e.nguon, license: e.license });
  }
  for (const r of recs) {
    if (phanLoai(r.license) === 'chua-ro') { chuaRo.push({ ten: r.title, nguon: r.file, lyDo: `giấy phép không nhận ra: "${r.license || '(trống)'}"` }); continue; }
    const ent = ents.find((e) => khop(r, e));
    const lic = r.license === 'CC0' ? 'CC0' : (ent && ent.license && /CC/.test(ent.license) ? ent.license : r.license);
    const title = (ent && ent.title) || r.title, author = (ent && ent.author) || r.author, url = (ent && ent.urls[0] && (/^https?:/.test(ent.urls[0]) ? ent.urls[0] : 'https://' + ent.urls[0])) || r.url;
    const section = r.kind === 'model' ? 'model' : 'am';
    if (lic === 'CC0') { const [ten, host] = nguonNhan(r.hay); cc0.set(`${section}|${ten}`, { section, ten, host }); continue; }
    const key = `${section}|${title}|${author}|${lic}`;
    if (seen.has(key)) continue; seen.add(key);
    by.push({ section, title, author, license: lic, url });
  }
  const lines = { model: [], am: [] };
  for (const b of skyLines) by.push({ section: 'model', ...b, url: '' });
  for (const b of by) lines[b.section].push({ ...b, text: [b.title, b.author, b.license, b.url].filter(Boolean).join(' — '), short: [b.title, b.author, b.license].filter(Boolean).join(' — ') });
  for (const c of cc0.values()) lines[c.section].push({ cc0: true, ten: c.ten, license: 'CC0', author: c.ten, text: `${c.ten} — CC0${c.host ? ' — ' + c.host : ''}`, short: `${c.ten} — CC0` });
  const tools = congCu();
  return { model: lines.model, am: lines.am, tools, chuaRo };
}

function congCu() {
  const pkg = rdj(path.join(REPO, 'package.json')) || {};
  const v = pkg.vendored || {};
  const threeLic = (rd(path.join(REPO, 'vendor', 'three', 'LICENSE')) || '').split(/\r?\n/)[0].replace(/\s*License.*/i, '').replace(/^The\s+/i, '').trim() || 'MIT';
  const gsapHead = (rd(path.join(REPO, 'vendor', 'gsap', 'gsap.min.js')) || '').slice(0, 600);
  const gsapUrl = (gsapHead.match(/terms at (https?:\/\/[^\s.]+(?:\.[^\s.]+)*[^\s.])/) || [, 'https://gsap.com/standard-license'])[1];
  const mp = rdj(path.join(REPO, 'node_modules', 'mp4-muxer', 'package.json')) || {};
  const mpUrl = ((mp.repository && mp.repository.url) || 'https://github.com/Vanilagy/mp4-muxer').replace(/^git\+/, '').replace(/\.git$/, '');
  const t = [
    { title: `three.js${v.three ? ' ' + v.three : ''}`, author: 'three.js authors', license: threeLic, url: 'https://threejs.org' },
    { title: `GSAP${v.gsap ? ' ' + v.gsap : ''}`, author: 'GreenSock', license: 'GSAP Standard License', url: gsapUrl },
    { title: `mp4-muxer${mp.version ? ' ' + mp.version : ''}`, author: mp.author || 'Vanilagy', license: mp.license || 'MIT', url: mpUrl },
    { title: 'Phương pháp hoạt hình, hiệu ứng & dựng cảnh', author: 'fwjelaa (FWJ STUDIOS)', license: 'phương pháp, chuyển sang three.js', url: '' },
  ];
  return t.map((x) => ({ ...x, text: [x.title, x.author, x.license, x.url].filter(Boolean).join(' — '), short: [x.title, x.author, x.license].filter(Boolean).join(' — '), fixed: true }));
}

const SECTIONS = [['model', 'Mô hình & hình ảnh'], ['am', 'Âm thanh & nhạc'], ['tools', 'Công cụ & phương pháp']];
export function dungTxt(g) {
  const out = ['# Dán toàn bộ phần dưới vào mô tả video (ảnh cuối phim chỉ ghi tác giả + giấy phép).', '', 'GHI CÔNG / CREDITS', ''];
  for (const [k, ten] of SECTIONS) { out.push(ten); if (!g[k].length) out.push('- (không có)'); for (const l of g[k]) out.push('- ' + l.text); out.push(''); }
  if (g.chuaRo && g.chuaRo.length) {
    out.push('# CHƯA RÕ GIẤY PHÉP (xoá khối này khi đã xác nhận; không dán lên YouTube)');
    for (const c of g.chuaRo) out.push(`# - ${c.ten} — ${c.nguon} — ${c.lyDo}`);
    out.push('');
  }
  return out.join('\n').replace(/\n+$/, '\n');
}

// ---------- ảnh ----------
function gom(lines, level) {
  if (level === 0) return lines.map((l) => l.short);
  const g = new Map(), res = [];
  for (const l of lines) {
    if (l.cc0 || l.fixed || !l.author) { res.push({ k: null, t: l.short }); continue; }
    const k = `${l.author}|${l.license}`; if (!g.has(k)) g.set(k, { a: l.author, lic: l.license, titles: [] }); g.get(k).titles.push(l.title);
  }
  const grouped = [...g.values()].map((x) => level === 1 ? `${x.a} — ${x.titles.join(', ')} — ${x.lic}` : `${x.a}${x.titles.length > 1 ? ` (${x.titles.length})` : ''} — ${x.lic}`);
  return [...res.map((r) => r.t), ...grouped];
}
function trang(g, level, px, fontUrl) {
  const sec = SECTIONS.map(([k, ten]) => `<h2>${htmlEsc(ten)}</h2>${gom(g[k], k === 'tools' ? 0 : level).map((t) => `<p>${htmlEsc(t)}</p>`).join('') || '<p>—</p>'}`).join('');
  const foot = level ? `<p class="f">Danh sách đầy đủ có trong mô tả video.</p>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'BVP';font-weight:100 900;src:url('${fontUrl}') format('truetype')}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;background:#0e1118;color:#eef2f8;overflow:hidden}
body{font-family:'BVP',sans-serif;font-weight:900;display:flex;flex-direction:column;justify-content:center}
#in{padding:56px 60px;width:${W}px}
h1{font-size:${px + 22}px;color:#ffd166;margin-bottom:${px * 0.6}px;line-height:1.2}
h2{font-size:${px + 4}px;color:#7fd1ff;margin:${px * 0.7}px 0 ${px * 0.25}px;line-height:1.25}
p{font-size:${px}px;line-height:1.3;margin:0 0 ${px * 0.2}px;overflow-wrap:anywhere;color:#e3e9f2}
p.f{margin-top:${px * 0.5}px;color:#9fb0c6}
</style></head><body><div id="in"><h1>Ghi công</h1>${sec}${foot}</div></body></html>`;
}

async function veAnh(goc, ep, g, outPng) {
  const { launchBrowser } = await import('./browser.mjs');
  const fontP = [path.join(goc, 'assets/fonts/BeVietnamPro-Black.ttf'), path.join(REPO, 'assets/fonts/BeVietnamPro-Black.ttf')].find((p) => fs.existsSync(p));
  if (!fontP) throw new Error('không thấy assets/fonts/BeVietnamPro-Black.ttf');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghi-cong-task18-'));
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    for (let level = 0; level <= 2; level++) for (const px of SIZES) {
      const f = path.join(tmp, 'g.html'); fs.writeFileSync(f, trang(g, level, px, pathToFileURL(fontP).href));
      await page.goto(pathToFileURL(f).href); await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate((MIN) => {
        let mn = 1e9; for (const el of document.querySelectorAll('#in *')) { if (!el.textContent.trim()) continue; mn = Math.min(mn, parseFloat(getComputedStyle(el).fontSize)); }
        return { h: document.getElementById('in').offsetHeight, min: mn, ok: document.fonts.check("900 28px BVP"), MIN };
      }, MIN_FONT);
      if (m.h <= H && m.min >= MIN_FONT) {
        await page.screenshot({ path: outPng, clip: { x: 0, y: 0, width: W, height: H } });
        return { width: W, height: H, minFontPx: m.min, fontPx: px, level, lines: SECTIONS.reduce((s, [k]) => s + gom(g[k], k === 'tools' ? 0 : level).length, 0) };
      }
    }
    return null;
  } finally { await browser.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
}

// ---------- chạy ----------
const HELP = [
  'Dùng: node tools/ghi-cong.mjs <ep> [--goc <thư mục gốc>] [--khong-anh] [--cho-phep-chua-ro] [--help]',
  '  --goc <thư mục>      gốc repo giả (mặc định: repo này) — dùng cho test',
  '  --khong-anh          chỉ ghi ghi-cong.txt, bỏ ảnh PNG',
  '  --cho-phep-chua-ro   asset ĐANG DÙNG mà không rõ giấy phép: vẫn cảnh báo nhưng thoát 0',
  'Mã thoát: 0 = xong, không có gì chưa rõ; 1 = ảnh tràn khung; 2 = sai tham số/không có tập;',
  '          3 = XONG (file đã ghi đủ) nhưng có asset đang dùng CHƯA RÕ GIẤY PHÉP — người dùng phải xác nhận trước khi đăng.',
].join('\n');
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
  const ep = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--goc');
  const gi = args.indexOf('--goc');
  const goc = gi >= 0 ? path.resolve(args[gi + 1]) : REPO;
  if (!ep) { console.error(HELP); process.exit(2); }
  const epDir = path.join(goc, 'episodes', ep);
  if (!fs.existsSync(epDir)) { console.error(`Không có ${epDir}`); process.exit(2); }
  for (const f of ['assets/CREDITS.md', 'assets/characters/CREDITS.md', 'assets/music/CREDITS.md', 'assets/polyfork/CREDITS.md', 'assets/polyhaven/CREDITS.md', 'assets/sfx/CREDITS.md', 'assets/sky/CREDITS.md'])
    if (!fs.existsSync(path.join(goc, f))) console.log(`  (thiếu ${f} — dùng manifest thay thế)`);
  const g = dungDong(goc, ep);
  fs.writeFileSync(path.join(epDir, 'ghi-cong.txt'), dungTxt(g));
  const n = g.model.length + g.am.length + g.tools.length;
  console.log(`ghi-cong.txt: ${n} dòng (mô hình ${g.model.length}, âm thanh ${g.am.length}, công cụ ${g.tools.length})`);
  let ma = 0;
  if (!args.includes('--khong-anh')) {
    const r = await veAnh(goc, ep, g, path.join(epDir, 'ghi-cong.png'));
    if (!r) { console.error(`✗ Ghi công tràn khung ${W}×${H} dù đã gom theo tác giả và hạ chữ tới ${MIN_FONT} px (${n} dòng) — bớt asset hoặc chỉnh tay.`); process.exit(1); }
    fs.writeFileSync(path.join(epDir, 'ghi-cong.json'), JSON.stringify({ ...r, txtLines: n, chuaRo: g.chuaRo }, null, 1) + '\n');
    console.log(`ghi-cong.png ${r.width}×${r.height}: chữ nhỏ nhất ${r.minFontPx}px (thân ${r.fontPx}px), mức gom ${r.level}, ${r.lines} dòng`);
  }
  if (g.chuaRo.length) {
    console.error('⚠ CHƯA RÕ GIẤY PHÉP — cần người dùng xác nhận trước khi đăng:');
    for (const c of g.chuaRo) console.error(`  - ${c.ten} (${c.nguon}): ${c.lyDo}`);
    ma = args.includes('--cho-phep-chua-ro') ? 0 : 3;
  }
  process.exit(ma);
}
