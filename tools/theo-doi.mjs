// Bảng theo dõi dây chuyền làm phim.
//   node tools/theo-doi.mjs <ep> [--json] [--transcript <thư mục phiên>] [--goc <thư mục>]
// Mặc định ghi dist/<ep>_theo-doi.html (một file, offline). --json in 4 dataset cho artifact "Bảng sản xuất phim".
//
// Tên trường dataset (đối chiếu lại với artifact 2VXWaFbnB5HHk8EvuzDUdL của claude.ai khi đẩy):
//   tap:   { ep, ten, luat, buoc, soBuoc: 8, shotQua, soShot, loiCon, soLanGoi, token, chiPhi, capNhat, choBan: null|string }
//   buoc:  [{ ep, buoc, xong, phut, luc }]
//   loi:   [{ ep, luat, loi, tyLe }]
//   token: [{ ep, gio, token }]
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BUOC, docTrangThai, docNhatKy, thuMucKiem } from './kiem/trang-thai.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const GOC = path.resolve(DIR, '..');
const FPS = 30;

const doc = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n, k) => String(n).padStart(k, '0');

async function docShots(goc, ep) {
  const f = path.join(goc, 'episodes', ep, 'shots.js');
  if (!fs.existsSync(f)) return [];
  try { return (await import(pathToFileURL(f).href + '?t=' + Date.now())).SHOTS || []; } catch (e) { console.error(`cảnh báo: không đọc được ${f}: ${e.message}`); return []; }
}
async function docLuat(goc, ep) {
  const f = path.join(goc, 'episodes', ep, 'episode.js');
  if (!fs.existsSync(f)) return '';
  try { const m = await import(pathToFileURL(f).href + '?t=' + Date.now()); return m.EPISODE?.rule || ''; } catch { return ''; }
}
const giayCua = (s) => (Array.isArray(s.f) ? (s.f[1] - s.f[0] + 1) / FPS : s.dur ?? null);

// token theo giờ: cộng 4 loại token của object usage, như hook session_guard.py.
// Đọc từng dòng qua stream; cùng message.id (+ requestId) chỉ cộng một lần.
export async function docToken(ep, dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const files = [];
  const quet = (d, sau) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isFile() && e.name.endsWith('.jsonl')) files.push(p);
      else if (e.isDirectory() && sau < 3) quet(p, sau + 1);
    }
  };
  quet(dir, 0);
  const theoGio = new Map();
  const daThay = new Set();
  for (const f of files) {
    const rl = readline.createInterface({ input: fs.createReadStream(f, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const l of rl) {
      if (!l.includes('"usage"')) continue;
      let o; try { o = JSON.parse(l); } catch { continue; }
      const u = o?.message?.usage || o?.usage; if (!u) continue;
      const ts = o.timestamp || o?.message?.timestamp; if (!ts) continue;
      const mid = o?.message?.id;
      if (mid) {
        const k = mid + '|' + (o.requestId || '');
        if (daThay.has(k)) continue;
        daThay.add(k);
      }
      const gio = String(ts).slice(0, 13) + ':00';
      const n = (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      theoGio.set(gio, (theoGio.get(gio) || 0) + n);
    }
  }
  return [...theoGio].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([gio, token]) => ({ ep, gio, token }));
}

export async function tinh(ep, { goc = GOC, transcript } = {}) {
  const o = { goc };
  if (!fs.existsSync(path.join(goc, 'episodes', ep))) throw Object.assign(new Error(`không có thư mục episodes/${ep}/`), { thoat: 2 });
  const tt = docTrangThai(ep, o);
  const nk = docNhatKy(ep, o);
  const luat = doc(path.join(thuMucKiem(ep, o), 'luat.json'));
  const shots = await docShots(goc, ep);
  const narr = doc(path.join(goc, 'episodes', ep, 'narration.json'));
  const cau = new Map((narr?.lines || []).map((l) => [l.line, l.text]));

  const buoc = BUOC.map((b) => {
    const x = tt.buoc[b] || {};
    return { ep, buoc: b, xong: !!x.xong, phut: x.phut ?? 0, luc: x.luc ?? null };
  });
  const loi = Object.entries(luat?.tong?.theoLuat || {}).map(([l, v]) => ({ ep, luat: l, loi: v.loi ?? 0, tyLe: v.tyLe ?? 0 }));
  const token = await docToken(ep, transcript);
  const soShot = luat?.tong?.soShot ?? shots.length;
  const loiCon = luat?.tong?.shotLoi ?? 0;
  const tap = {
    ep, ten: ep, luat: await docLuat(goc, ep), buoc: buoc.filter((b) => b.xong).length, soBuoc: BUOC.length,
    shotQua: luat ? soShot - loiCon : 0, soShot, loiCon,
    soLanGoi: BUOC.reduce((s, b) => s + (tt.buoc[b]?.goi || 0), 0),
    token: token.reduce((s, t) => s + t.token, 0), chiPhi: null,
    capNhat: new Date().toISOString(), choBan: null,
  };
  return { tap, buoc, loi, token, _goc: goc, _nk: nk, _luat: luat, _shots: shots, _cau: cau };
}

// ô ảnh chỉ là link khi file ảnh có thật
function lienKet(d, rel, nhan, lop = '') {
  if (!fs.existsSync(path.join(d._goc, 'output', d.tap.ep, 'duyet', rel))) return '<span class="mu">·</span>';
  return `<a${lop ? ` class="${lop}"` : ''} href="${esc(encodeURI(`../output/${d.tap.ep}/duyet/${rel}`))}">${esc(nhan)}</a>`;
}

function oBuoc(b, s, d) {
  const dongNk = d._nk.filter((x) => x.buoc === b && x.shot === s.id);
  const kq = d._luat?.shots?.[s.id];
  let nd = '';
  if (b === 'shot' && kq?.khung) {
    nd = kq.khung.map((f, i) => lienKet(d, `01_shots/${s.id}_f${pad(f, 4)}.jpg`, ['đ', 'g', 'c'][i] || i)).join('');
  } else if (b === 'ra-loi' && kq) {
    nd = (kq.loi || []).map((l) => lienKet(d, `03_truoc-sau/${s.id}_${l}_v1.jpg`, l, 'bad')).join('');
    if (!nd) nd = '<span class="ok">✓</span>';
  } else if (kq && b === 'mau-duyet') {
    nd = kq.loi?.length ? '<span class="bad">!</span>' : '<span class="ok">✓</span>';
  }
  if (dongNk.length) nd += ` <span class="mu" title="${esc(dongNk.map((x) => x.hanh_dong).join(', '))}">·${dongNk.length}</span>`;
  return `<td class="buoc">${nd || '<span class="mu">·</span>'}</td>`;
}

export function dungHtml(d) {
  const khuon = fs.readFileSync(path.join(DIR, 'theo-doi', 'khuon.html'), 'utf8');
  const the = [
    ...d.buoc.map((b) => `<div><b class="${b.xong ? 'ok' : 'mu'}">${b.phut} p</b><span>${esc(b.buoc)}${b.xong ? ' ✓' : ''}</span></div>`),
    `<div><b>${d.tap.soLanGoi}</b><span>lần gọi</span></div>`,
    `<div><b class="${d.tap.loiCon ? 'bad' : 'ok'}">${d.tap.loiCon}/${d.tap.soShot}</b><span>shot còn lỗi</span></div>`,
    ...d.loi.map((l) => `<div><b class="${l.loi ? 'bad' : 'ok'}">${l.loi}</b><span>${esc(l.luat)} · ${Math.round(l.tyLe * 100)}%</span></div>`),
  ].join('');
  const hang = d._shots.map((s) => {
    const kq = d._luat?.shots?.[s.id];
    const giay = giayCua(s);
    return `<tr class="shot${kq?.loi?.length ? ' coloi' : ''}"><td>${esc(s.id)}</td><td class="loi-text">${esc(d._cau.get(s.line) ?? '')}</td><td>${esc(s.type ?? kq?.type ?? '')}</td><td>${giay == null ? '' : giay.toFixed(1)}</td>${BUOC.map((b) => oBuoc(b, s, d)).join('')}</tr>`;
  }).join('\n');
  // dùng hàm thay thế để ký tự $ trong nội dung không bị hiểu nhầm
  return khuon
    .replaceAll('__EP__', () => esc(d.tap.ep)).replace('__CAPNHAT__', () => esc(d.tap.capNhat))
    .replace('__DAUTRANG__', () => the).replace('__COT__', () => BUOC.map((b) => `<th>${b}</th>`).join(''))
    .replace('__BANG__', () => hang);
}

async function main() {
  const a = process.argv.slice(2);
  const val = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const ep = a.find((x, i) => !x.startsWith('--') && a[i - 1] !== '--transcript' && a[i - 1] !== '--goc');
  if (!ep) { console.error('dùng: node tools/theo-doi.mjs <ep> [--json] [--transcript <thư mục>]'); process.exit(2); }
  const goc = val('--goc') ? path.resolve(val('--goc')) : GOC;
  const d = await tinh(ep, { goc, transcript: val('--transcript') });
  if (a.includes('--json')) {
    process.stdout.write(JSON.stringify({ tap: d.tap, buoc: d.buoc, loi: d.loi, token: d.token }, null, 2) + '\n');
    return;
  }
  const out = path.join(goc, 'dist', `${ep}_theo-doi.html`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, dungHtml(d));
  console.log(out);
  console.log('file:///' + out.replace(/\\/g, '/').replace(/ /g, '%20'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`lỗi: ${e.message}`); process.exit(e.thoat || 2); });
}
