#!/usr/bin/env node
// Trang duyệt nhiều ĐỢT: node tools/duyet.mjs <ep> dung | moi "<tiêu đề>" | token <số> "<việc>" <token> [model] | nhan <file.json> | them-ung-vien <số> <file.json>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
const NN = n => String(n).padStart(2, '0');
const docJson = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const ghiJson = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 1) + '\n');

export function danhSachDot(ep, goc = GOC) {
  const dir = path.join(goc, 'duyet', ep);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /^dot-\d+\.json$/.test(f)).sort().map(f => {
    const d = docJson(path.join(dir, f));
    const kq = path.join(dir, f.replace('.json', '.ketqua.json'));
    d.ketqua = fs.existsSync(kq) ? docJson(kq) : null;
    const ct = d.token?.chiTiet || [];
    if (ct.length) d.token.tong = ct.reduce((s, x) => s + (+x.token || 0), 0);
    return d;
  });
}

export function moi(ep, tieuDe, goc = GOC) {
  const dir = path.join(goc, 'duyet', ep); fs.mkdirSync(dir, { recursive: true });
  const ds = danhSachDot(ep, goc), so = ds.length ? Math.max(...ds.map(d => d.so)) + 1 : 1;
  const f = path.join(dir, `dot-${NN(so)}.json`);
  ghiJson(f, { so, ngay: new Date().toISOString().slice(0, 10), tieuDe: tieuDe || `Đợt ${so}`, tomTat: '', token: { tong: 0, chiTiet: [], ghiChu: '' }, nhom: [], lienKet: [] });
  return f;
}

export function congToken(ep, so, viec, token, model = 'sonnet', goc = GOC) {
  const f = path.join(goc, 'duyet', ep, `dot-${NN(so)}.json`);
  const d = docJson(f); d.token ||= { tong: 0, chiTiet: [], ghiChu: '' }; d.token.chiTiet ||= [];
  d.token.chiTiet.push({ viec, token: +token, model });
  d.token.tong = d.token.chiTiet.reduce((s, x) => s + x.token, 0);
  ghiJson(f, d); return d.token.tong;
}

export function nhan(ep, file, goc = GOC) { return luuKetQua(ep, docJson(file), goc); }

export function luuKetQua(ep, kq, goc = GOC) {
  if (!kq.dot) throw new Error('file kết quả không có trường "dot"');
  const f = path.join(goc, 'duyet', ep, `dot-${NN(kq.dot)}.ketqua.json`);
  if (!fs.existsSync(path.join(goc, 'duyet', ep, `dot-${NN(kq.dot)}.json`))) throw new Error(`không có dot-${NN(kq.dot)}.json`);
  ghiJson(f, kq); return f;
}

// ---- chủ đề & chống trùng giữa các đợt ----
// chuDe = khoá chủ đề của mục/khe (ghi tay `chuDe`, hoặc suy từ id: bỏ tiền tố nhóm dn-/rb-, bỏ hậu tố __N, '-'→'_', rồi qua bảng đồng nghĩa)
const boDau = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const dangChuan = s => boDau(s).replace(/__.*$/, '').replace(/[-\s]+/g, '_').replace(/^_+|_+$/g, '');
const TIEN_TO_MAC = ['dn', 'rb'];
const DONG_NGHIA_MAC = {
  ket: ['ket_tien', 'ket_ga', 'ket_sat'],
  ke: ['ke_trong', 'ke_gau', 'ke_phong_ga', 'ke_go'],
  dep: ['doi_dep'],
  bac_them: ['bac_them_dep', 'bac_them_trong'],
  hoc_quay: ['quay_banh'],
};
// duyet/<ep>/dong-nghia.json (tuỳ chọn): { "tienTo": ["dn","rb"], "<chuDe>": ["đồng nghĩa", …], … }
export function docDongNghia(ep, goc = GOC) {
  const tienTo = new Set(TIEN_TO_MAC), map = new Map();
  const them = (chuan, ds) => { for (const x of mang(ds)) map.set(dangChuan(x), dangChuan(chuan)); };
  for (const [c, ds] of Object.entries(DONG_NGHIA_MAC)) them(c, ds);
  const f = path.join(goc, 'duyet', ep, 'dong-nghia.json');
  if (fs.existsSync(f)) {
    const j = docJson(f);
    for (const [c, ds] of Object.entries(j)) { if (c === 'tienTo') mang(ds).forEach(x => tienTo.add(boDau(x))); else them(c, ds); }
  }
  return { tienTo, map };
}
function khoaChuDe(m, dn) {
  if (m.chuDe) { const k = dangChuan(m.chuDe); return { chuDe: k, khoa: k }; }
  const id = String(m.id), t = boDau(id).match(/^([a-z0-9]+)[-_]/);
  const k = dangChuan(t && dn.tienTo.has(t[1]) ? id.slice(t[0].length) : id);
  return { chuDe: dn.map.get(k) || k, khoa: k };
}
const linkChinh = o => (o?.links || []).find(l => /^https?:/.test(l.href))?.href || null;
// quyết định thật sự của một đợt (đã chuanHoa, có .ketqua): [{chuDe,khoa,dot,id,slot,ten,anh,nguon,link,trangThai:'chon'|'duyet'|'sua',ghiChu}]
function quyetDinhDot(d, dn) {
  const k = d.ketqua; if (!k) return [];
  const ra = [];
  for (const n of d.nhom || []) for (const m of n.muc) {
    const { chuDe, khoa } = khoaChuDe(m, dn), tuMuc = tt => ({ trangThai: tt, ten: m.ten, anh: m.anh?.[0] || null, nguon: m.nguon || null, link: linkChinh(m) });
    let e = null;
    if (n.kieu === 'ung-vien') {
      if (k.chon && Object.hasOwn(k.chon, m.id)) {
        const c = k.chon[m.id];
        if (Array.isArray(c) && c.length) {   // khe chonNhieu: chọn nhiều ứng viên
          const us = c.map(id => (m.ungVien || []).find(x => x.id === id)).filter(Boolean);
          e = { trangThai: 'chon', ten: us.map(u => u.ten).join(' + ') || c.join(' + '), anh: us[0]?.anh?.[0] || null, nguon: us[0]?.nguon || null, link: linkChinh(us[0]), cacId: c };
        } else if (c && !Array.isArray(c)) { const u = (m.ungVien || []).find(x => x.id === c); e = { trangThai: 'chon', ten: u?.ten ?? c, anh: u?.anh?.[0] || null, nguon: u?.nguon || null, link: linkChinh(u) }; }
        else e = { trangThai: 'sua', ten: null, anh: null, nguon: null, link: null };
      }
    } else if (n.kieu === 'chon') { if (k.gau?.id === m.id) e = tuMuc('duyet'); }
    else if ((k.duyet || []).includes(m.id)) e = tuMuc('duyet');
    else if ((k.sua || []).includes(m.id)) e = tuMuc('sua');
    if (e) ra.push({ chuDe, khoa, dot: d.so, id: m.id, slot: m.ten, ghiChu: k.ghiChu?.[m.id] || '', ...e });
  }
  return ra;
}
// đợt gần nhất (trước vị trí i) có quyết định cho chủ đề; chỉ tính nếu có 'chon'/'duyet'. Ưu tiên khớp đúng khoá (trước khi qua đồng nghĩa).
function timTruoc(qd, i, chuDe, khoa) {
  for (let j = i - 1; j >= 0; j--) {
    const cung = qd[j].filter(x => x.chuDe === chuDe); if (!cung.length) continue;
    const ok = cung.filter(x => x.trangThai !== 'sua'); if (!ok.length) return [];
    const chinh = ok.filter(x => x.khoa === khoa);
    return chinh.length ? chinh : ok;
  }
  return [];
}
function ganDaQuyet(dots, dn) { // dots đã chuanHoa + .ketqua: gắn m.chuDe và m.daQuyet vào từng mục/khe
  const qd = dots.map(d => quyetDinhDot(d, dn));
  let tong = 0;
  dots.forEach((d, i) => { for (const n of d.nhom || []) { if (n.kieu === 'chon') continue; for (const m of n.muc) {
    const { chuDe, khoa } = khoaChuDe(m, dn); m.chuDe = chuDe;
    const q = timTruoc(qd, i, chuDe, khoa);
    if (q.length) { m.daQuyet = q.map(x => ({ dot: x.dot, id: x.id, slot: x.slot, ten: x.ten, anh: x.anh, nguon: x.nguon, trangThai: x.trangThai })); tong++; }
  } } });
  return tong;
}
const dotDaChuanHoa = (ep, goc, loc = () => true) => danhSachDot(ep, goc).filter(loc).map(d => Object.assign(chuanHoa(d), { ketqua: d.ketqua }));
// mục `items` ([{id, chuDe?}]) của đợt <so> trùng chủ đề đã quyết ở các đợt trước → [{item, q:[quyết định cũ]}]
export function timTrung(ep, so, items, goc = GOC) {
  const dn = docDongNghia(ep, goc), dots = dotDaChuanHoa(ep, goc, d => d.so < +so), qd = dots.map(d => quyetDinhDot(d, dn));
  return items.map(item => { const { chuDe, khoa } = khoaChuDe(item, dn); return { item, q: timTruoc(qd, dots.length, chuDe, khoa) }; }).filter(x => x.q.length);
}
// quyết định HIỆN HÀNH theo chủ đề qua mọi đợt (đợt sau ghi đè đợt trước)
export function tongHop(ep, goc = GOC) {
  const dn = docDongNghia(ep, goc), kq = {};
  const gon = x => ({ dot: x.dot, id: x.id, khoa: x.khoa, ten: x.ten, nguon: x.nguon, link: x.link, trangThai: x.trangThai, ghiChu: x.ghiChu });
  for (const d of dotDaChuanHoa(ep, goc)) {
    const theo = new Map();
    for (const e of quyetDinhDot(d, dn)) { if (!theo.has(e.chuDe)) theo.set(e.chuDe, []); theo.get(e.chuDe).push(e); }
    for (const [cd, ds] of theo) {
      const chinh = ds.find(x => x.trangThai !== 'sua') || ds[0], o = gon(chinh);
      if (ds.length > 1) o.cung = ds.filter(x => x !== chinh).map(gon);
      if (kq[cd]) { const t = kq[cd]; o.truoc = { dot: t.dot, id: t.id, ten: t.ten, trangThai: t.trangThai }; }
      kq[cd] = o;
    }
  }
  return Object.fromEntries(Object.entries(kq).sort(([a], [b]) => a < b ? -1 : 1));
}

// ---- máy chủ cục bộ: mo [--cong N] [--khong-mo] [--mot-lan] [--het-gio phút] [--thu-muc dir] ----
const DUOI_OK = { html: 'text/html; charset=utf-8', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export function moMayChu(ep, { cong = 8791, khongMo = false, motLan = false, hetGio = 240, goc = GOC, log = console.log } = {}) {
  dung(ep, { goc, log: console.warn });
  const trang = path.join(goc, 'dist', `${ep}_duyet.html`);
  let congThat = cong;
  const hostOk = h => !!h && new RegExp(`^(127\\.0\\.0\\.1|localhost):${congThat}$`).test(h);
  // file:// gửi Origin "null" (Chrome thường) hoặc "file://" (khi bật allow-file-access); trang http cục bộ gửi http://127.0.0.1:<cổng> / http://localhost:<cổng>; web khác bị chặn
  const originOk = o => o === undefined || o === 'null' || o === 'file://' || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o);
  const tra = (res, ma, noiDung, kieu = 'text/plain; charset=utf-8') => { res.writeHead(ma, { 'Content-Type': kieu, 'Cache-Control': 'no-store', ...(res._cors || {}) }); res.end(noiDung); };
  let xong = false;
  const sv = http.createServer((req, res) => {
    if (!hostOk(req.headers.host)) return tra(res, 403, 'host không hợp lệ');
    let u; try { u = new URL(req.url, 'http://x'); } catch { return tra(res, 400, 'url sai'); }
    const org = req.headers.origin;
    if (org !== undefined && !originOk(org)) return tra(res, 403, 'origin không hợp lệ');
    // Chrome từ file:// có khi KHÔNG gửi Origin ở GET → vẫn phải có ACAO để trang đọc được (origin web lạ luôn gửi Origin và đã bị 403 ở trên)
    if (u.pathname === '/gui' || u.pathname === '/ping') res._cors = { 'Access-Control-Allow-Origin': org === undefined ? '*' : org, 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') { // preflight (file:// → http://127.0.0.1)
      if (u.pathname !== '/gui' && u.pathname !== '/ping') return tra(res, 404, 'không có');
      const h = { ...(res._cors || {}), 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', 'Cache-Control': 'no-store' };
      if (req.headers['access-control-request-private-network']) h['Access-Control-Allow-Private-Network'] = 'true';
      res.writeHead(204, h); return res.end();
    }
    if (req.method === 'GET' && u.pathname === '/ping') return tra(res, 200, JSON.stringify({ ung: 'duyet', ep }), 'application/json');
    if (req.method === 'POST' && u.pathname === '/gui') {
      const bufs = []; let n = 0, qua = false;
      req.on('data', c => { n += c.length; if (n > 2 * 2 ** 20) { if (!qua) { qua = true; tra(res, 413, 'quá 2 MB'); } } else bufs.push(c); });
      req.on('end', () => {
        if (qua) return;
        let kq; try { kq = JSON.parse(Buffer.concat(bufs).toString('utf8')); } catch { return tra(res, 400, 'JSON sai'); }
        if (!kq || kq.tap !== ep) return tra(res, 422, `tap phải là "${ep}"`);
        if (!Number.isInteger(kq.dot) || !danhSachDot(ep, goc).some(d => d.so === kq.dot)) return tra(res, 422, 'dot không có trong các đợt hiện tại');
        let f; try { f = luuKetQua(ep, kq, goc); } catch (e) { return tra(res, 500, e.message); }
        const dong = { luc: new Date().toISOString(), dot: kq.dot, soChon: Object.keys(kq.chon || {}).length + (kq.gau ? 1 : 0), soDuyet: (kq.duyet || []).length, soSua: (kq.sua || []).length, file: path.relative(goc, f).replaceAll('\\', '/') };
        fs.appendFileSync(path.join(goc, 'duyet', ep, 'hop-thu.jsonl'), JSON.stringify(dong) + '\n');
        log(`DA-NHAN dot=${kq.dot} file=${f}`);
        tra(res, 200, JSON.stringify({ ok: true, dot: kq.dot, luc: dong.luc }), 'application/json');
        if (motLan && !xong) { xong = true; res.on('finish', () => setTimeout(() => process.exit(0), 50)); }
      });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return tra(res, 405, 'chỉ GET và POST /gui');
    let rel; try { rel = decodeURIComponent(u.pathname); } catch { return tra(res, 400, 'url sai'); }
    if (rel === '/') rel = `/dist/${ep}_duyet.html`;
    if (rel.includes('\0') || rel.split(/[\\/]/).includes('..')) return tra(res, 403, 'không được');
    const f = path.resolve(goc, '.' + rel), duoi = path.extname(f).slice(1).toLowerCase();
    if (!f.startsWith(path.resolve(goc) + path.sep)) return tra(res, 403, 'ngoài gốc repo');
    if (!DUOI_OK[duoi]) return tra(res, 403, 'đuôi file không cho phép');
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return tra(res, 404, 'không có');
    tra(res, 200, fs.readFileSync(f), DUOI_OK[duoi]);
  });
  return new Promise((ok, loi) => {
    const thu = c => {
      congThat = c;
      const onLoi = e => { if (e.code === 'EADDRINUSE' && c < cong + 10) thu(c + 1); else loi(e); };
      sv.once('error', onLoi);
      sv.listen(c, '127.0.0.1', () => {
        sv.off('error', onLoi);
        const url = `http://127.0.0.1:${c}/`;
        log(`MO ${url}  (trang: ${trang})`);
        if (!khongMo) {
          try { (process.platform === 'win32' ? spawn('cmd', ['/c', 'start', '""', url], { stdio: 'ignore', detached: true }) : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore', detached: true })).on('error', () => {}).unref(); } catch {}
        }
        if (hetGio > 0) setTimeout(() => { log('HET-GIO: không ai gửi'); process.exit(3); }, hetGio * 60000);
        ok({ server: sv, cong: c, url });
      });
    };
    thu(cong);
  });
}

// ---- chuẩn hoá lược đồ ----
const mang = x => (x == null || x === '') ? [] : Array.isArray(x) ? x : [x];
const taiNguyen = h => (/^(https?:|file:|\.{1,2}\/|#|mailto:)/.test(h) ? h : '../' + h.replace(/^\/+/, '')); // đường dẫn repo → tương đối từ dist/

export function chuanMuc(m, kieu) {
  if (Array.isArray(m)) { const [id, ten, phu] = m; m = { id, ten, phu }; }
  const o = { ...m }; o.phu ||= ''; o.anh = mang(o.anh);
  let ls = (o.links || []).map(l => ({ ...l }));
  if (o.link) ls.push({ href: o.link, ten: o.linkTen || 'Xem nguồn' });
  if (kieu === 'cap' && (o.anhTruoc || o.anhSau)) {
    if (!ls.length) { if (o.anhTruoc) ls.push({ href: o.anhTruoc, ten: 'ảnh lớn (trước)' }); if (o.anhSau) ls.push({ href: o.anhSau, ten: 'ảnh lớn (sau)' }); }
  } else if (!ls.length && o.anh.length) ls.push({ href: o.anh[0], ten: 'ảnh lớn' });
  o.links = ls.map(l => ({ ten: l.ten || 'Xem nguồn', href: taiNguyen(l.href) }));
  delete o.link; delete o.linkTen;
  return o;
}

export function chuanHoa(dot) {
  const d = JSON.parse(JSON.stringify(dot));
  d.nhom = (d.nhom || []).map(n => {
    n.anh = mang(n.anh);
    if (n.kieu === 'ung-vien') {
      n.muc = (n.khe || n.muc || []).map(k => ({ id: k.id, chuDe: k.chuDe, chonNhieu: k.chonNhieu || undefined, ten: k.ten, phu: k.phu || '', anh: mang(k.anhHienTai ?? k.anh), ungVien: (k.ungVien || []).map(u => chuanMuc(u)) }));
      delete n.khe;
    } else {
      n.muc = (n.muc || []).map(m => chuanMuc(m, n.kieu));
      if (n.hienTai) n.hienTai = chuanMuc(n.hienTai);
    }
    return n;
  });
  return d;
}

function duongAnh(d) { // path → cạnh dài tối đa
  const r = new Map(), them = (p, mx) => { if (p) r.set(p, Math.max(r.get(p) || 0, mx)); };
  for (const n of d.nhom) {
    n.anh.forEach(p => them(p, 1400));
    if (n.hienTai) n.hienTai.anh.forEach(p => them(p, 640));
    for (const m of n.muc) {
      m.anh.forEach(p => them(p, 640)); them(m.anhTruoc, 640); them(m.anhSau, 640);
      (m.ungVien || []).forEach(u => u.anh.forEach(p => them(p, 640)));
      (m.daQuyet || []).forEach(q => them(q.anh, 640));
    }
  }
  return r;
}

const PY = `
import sys, json
from PIL import Image
for j in json.load(sys.stdin):
    try:
        im = Image.open(j['src'])
        if im.mode in ('RGBA', 'LA', 'P'):
            im = im.convert('RGBA'); bg = Image.new('RGB', im.size, (240, 241, 244)); bg.paste(im, mask=im.split()[3]); im = bg
        else: im = im.convert('RGB')
        m = max(im.size)
        if m > j['max']:
            k = j['max'] / m; im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        im.save(j['dst'], 'JPEG', quality=82, optimize=True)
    except Exception as e:
        print('LOI ' + j['src'] + ': ' + str(e), file=sys.stderr)
`;

function thuNho(ds, goc, log) { // ds: [[path, max]] → Map path → {file, mime}
  const cache = path.join(goc, '.cache', 'duyet'); fs.mkdirSync(cache, { recursive: true });
  const kq = new Map(), viec = [];
  for (const [p, mx] of ds) {
    const f = path.join(goc, p); if (!fs.existsSync(f)) { kq.set(p, null); continue; }
    const st = fs.statSync(f), h = crypto.createHash('sha1').update(`${p}|${st.size}|${st.mtimeMs}|${mx}`).digest('hex').slice(0, 20);
    const dst = path.join(cache, h + '.jpg'); kq.set(p, { file: dst, goc: f });
    if (!fs.existsSync(dst)) viec.push({ src: f, dst, max: mx });
  }
  if (viec.length) {
    try { execFileSync('python', ['-I', '-c', PY], { input: JSON.stringify(viec), maxBuffer: 1 << 26, stdio: ['pipe', 'inherit', 'inherit'] }); }
    catch (e) { log('CẢNH BÁO: không thu nhỏ được ảnh bằng python/PIL, nhúng ảnh gốc'); }
  }
  for (const [p, v] of kq) if (v) {
    if (fs.existsSync(v.file)) { v.mime = 'image/jpeg'; }
    else { v.file = v.goc; v.mime = MIME[path.extname(p).slice(1).toLowerCase()] || 'application/octet-stream'; }
  }
  return kq;
}

export function dung(ep, { goc = GOC, log = console.warn } = {}) {
  const dots = dotDaChuanHoa(ep, goc);
  if (!dots.length) throw new Error(`chưa có đợt nào trong duyet/${ep}/ (chạy: moi "<tiêu đề>")`);
  const trung = ganDaQuyet(dots, docDongNghia(ep, goc));
  const ds = new Map(); for (const d of dots) for (const [p, m] of duongAnh(d)) ds.set(p, Math.max(ds.get(p) || 0, m));
  const nho = thuNho([...ds], goc, log), anh = {}; let tong = 0; const thieu = [];
  for (const [p] of ds) {
    const v = nho.get(p);
    if (!v) { anh[p] = null; thieu.push(p); log(`CẢNH BÁO: thiếu ảnh ${p}`); continue; }
    const b = fs.readFileSync(v.file); tong += b.length; anh[p] = `data:${v.mime};base64,${b.toString('base64')}`;
  }
  if (tong > 25 * 2 ** 20) log(`CẢNH BÁO: ảnh nhúng ${(tong / 2 ** 20).toFixed(1)} MB (> 25 MB), trang sẽ nặng`);
  const esc = c => String.fromCharCode(92) + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0');
  const du = JSON.stringify({ ep, dots, anh }).split('').map(c => (c === '<' || c.charCodeAt(0) === 0x2028 || c.charCodeAt(0) === 0x2029) ? esc(c) : c).join('');
  const html = TRANG.replaceAll('__EP__', ep).replace('__DATA__', () => du);
  const out = path.join(goc, 'dist', `${ep}_duyet.html`);
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, html);
  return { out, bytes: Buffer.byteLength(html), anhNhung: ds.size - thieu.length, thieu, dots: dots.length, trung };
}

// nạp nhóm kiểu 'ung-vien' từ file ứng viên vào đợt <so> (tạo đợt nếu chưa có; thay nhóm cùng nhomId)
export function themUngVien(ep, so, file, goc = GOC, { boTrung = false, log = console.warn } = {}) {
  const nv = docJson(file), dir = path.join(goc, 'duyet', ep);
  if (!nv.nhomId) throw new Error('file ứng viên thiếu "nhomId"');
  if (!Array.isArray(nv.khe) || !nv.khe.length) throw new Error('file ứng viên thiếu mảng "khe"');
  const ids = new Set();
  for (const k of nv.khe) {
    if (!k.id || !Array.isArray(k.ungVien) || !k.ungVien.length) throw new Error(`khe "${k.id}" thiếu id hoặc ungVien`);
    if (ids.has(k.id)) throw new Error(`trùng id khe "${k.id}"`); ids.add(k.id);
    const u = new Set(); for (const x of k.ungVien) { if (!x.id || u.has(x.id)) throw new Error(`khe "${k.id}": ứng viên thiếu/trùng id`); u.add(x.id); }
  }
  let khe = nv.khe;
  const tr = timTrung(ep, so, khe, goc);
  for (const { item, q } of tr) log(`TRÙNG: ${item.id} ↔ Đợt ${q[0].dot} ${q[0].id} = ${q[0].ten}` + (q.length > 1 ? ` (+${q.length - 1} mục cùng chủ đề)` : ''));
  if (boTrung && tr.length) {
    const bo = new Set(tr.map(x => x.item.id)); khe = khe.filter(k => !bo.has(k.id));
    log(`--bo-trung: bỏ ${bo.size} khe trùng, còn ${khe.length}`);
    if (!khe.length) throw new Error('mọi khe đều trùng chủ đề đã quyết ở đợt trước, không nạp gì');
  }
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `dot-${NN(so)}.json`);
  if (!fs.existsSync(f)) ghiJson(f, { so: +so, ngay: new Date().toISOString().slice(0, 10), tieuDe: `Đợt ${so}`, tomTat: '', token: { tong: 0, chiTiet: [], ghiChu: '' }, nhom: [], lienKet: [] });
  const d = docJson(f), g = { id: nv.nhomId, ten: nv.ten || nv.nhomId, mota: nv.mota || '', kieu: 'ung-vien', anh: [], muc: khe };
  const i = (d.nhom ||= []).findIndex(n => n.id === g.id);
  if (i >= 0) d.nhom[i] = g; else d.nhom.push(g);
  ghiJson(f, d); return f;
}

const TRANG = String.raw`<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Duyệt __EP__</title>
<style>
  :root { --bg:#f4f2ee; --card:#fff; --ink:#1d1b22; --mute:#6b6875; --line:#dcd8d0; --ok:#1e8e4e; --okbg:#e6f5ec; --fix:#c0392b; --fixbg:#fbe9e7; --hold:#8a8594; --acc:#2456c9; --tile:#e9e7e2; --vbg:#fff4d6; --vtx:#8a5a00; }
  @media (prefers-color-scheme: dark) { :root { --bg:#17161b; --card:#22212a; --ink:#eeeaf2; --mute:#a09cab; --line:#3a3844; --acc:#7ea2ff; --okbg:#173022; --fixbg:#3a1d1b; --tile:#2e2d36; --ok:#37b36d; --fix:#e0675a; --vbg:#3a3014; --vtx:#f0c14b; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 "Be Vietnam Pro","Segoe UI",system-ui,sans-serif; }
  header { position:sticky; top:0; z-index:5; background:var(--card); border-bottom:1px solid var(--line); padding:10px 16px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
  header h1 { font-size:18px; margin:0 12px 0 0; }
  #dem { color:var(--mute); font-size:14px; flex:1; min-width:160px; }
  button { font:inherit; border:1px solid var(--line); background:var(--card); color:var(--ink); border-radius:8px; padding:6px 12px; cursor:pointer; }
  button:disabled { opacity:.5; cursor:default; }
  button.chinh { background:var(--acc); border-color:var(--acc); color:#fff; font-weight:600; }
  #dots, #loc { display:flex; flex-wrap:wrap; gap:6px; padding:10px 16px 0; max-width:1280px; margin:0 auto; align-items:center; }
  #dots button, #loc button { border-radius:999px; padding:4px 14px; }
  #dots button.hien, #loc button.hien { background:var(--acc); border-color:var(--acc); color:#fff; font-weight:600; }
  #loc span { color:var(--mute); font-size:14px; margin-right:4px; }
  nav { display:flex; flex-wrap:wrap; gap:6px; padding:10px 16px 0; max-width:1280px; margin:0 auto; }
  nav a { color:var(--acc); text-decoration:none; border:1px solid var(--line); border-radius:999px; padding:3px 12px; font-size:14px; background:var(--card); }
  main { max-width:1280px; margin:0 auto; padding:8px 16px 80px; }
  section { margin-top:28px; }
  h2 { font-size:20px; margin:0 0 4px; }
  .mota { color:var(--mute); margin:0 0 10px; font-size:14px; }
  .nhan { display:inline-block; font-size:12px; border-radius:999px; padding:1px 10px; margin-left:8px; vertical-align:middle; background:var(--hold); color:#fff; }
  .anh { display:block; width:100%; height:100%; object-fit:contain; cursor:zoom-in; }
  .thieu, .khong-hinh { display:flex; align-items:center; justify-content:center; text-align:center; padding:8px; color:var(--fix); font-size:13px; width:100%; height:100%; }
  .khong-hinh { color:var(--mute); }
  .khung { aspect-ratio:4/3; background:var(--tile); border-radius:8px; overflow:hidden; display:flex; }
  .khung.gal { display:grid; grid-template-columns:1fr 1fr; gap:2px; }
  .khung.gal .anh, .khung.gal .thieu { min-height:0; }
  .doi { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .doi figure { margin:0; } .doi figcaption { font-size:12px; color:var(--mute); text-align:center; }
  .luoi { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr)); gap:12px; margin-top:12px; }
  .luoi .rong { grid-column:span 2; } @media (max-width:520px) { .luoi .rong { grid-column:span 1; } }
  .the { position:relative; background:var(--card); border:2px solid var(--line); border-radius:12px; padding:8px; display:flex; flex-direction:column; gap:6px; }
  .the[data-tt="duyet"] { border-color:var(--ok); background:var(--okbg); }
  .the[data-tt="sua"] { border-color:var(--fix); background:var(--fixbg); }
  .the.tc { border-style:dashed; }
  .the .ten { font-weight:600; line-height:1.3; } .the .phu { color:var(--mute); font-size:13px; } .the .meta { color:var(--mute); font-size:12px; }
  .the .lk { font-size:13px; color:var(--acc); margin-right:10px; }
  .links { display:flex; flex-wrap:wrap; }
  .dau { position:absolute; top:12px; right:12px; width:26px; height:26px; border-radius:50%; display:none; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:15px; z-index:1; }
  .the[data-tt="duyet"] > .dau { display:flex; background:var(--ok); } .the[data-tt="sua"] > .dau { display:flex; background:var(--fix); }
  .nut { display:flex; gap:6px; margin-top:auto; }
  .nut button { padding:4px 10px; font-size:14px; flex:1; }
  .the[data-tt="duyet"] .b-duyet { background:var(--ok); color:#fff; border-color:var(--ok); font-weight:600; }
  .the[data-tt="sua"] .b-sua { background:var(--fix); color:#fff; border-color:var(--fix); font-weight:600; }
  textarea { width:100%; min-height:34px; font:inherit; font-size:14px; border:1px solid var(--line); border-radius:6px; padding:4px 6px; background:var(--bg); color:var(--ink); resize:vertical; }
  .gau.co .the.uv:not([data-tt="duyet"]), .khe.co .the.uv:not([data-tt="duyet"]) { opacity:.5; }
  .khe { margin-top:18px; border:2px solid var(--line); border-radius:14px; padding:10px 12px; background:var(--card); }
  .khe[data-tt="duyet"] { border-color:var(--ok); } .khe[data-tt="sua"] { border-color:var(--fix); }
  .khe h3 { margin:0; font-size:17px; } .khe .luoi { margin-top:8px; }
  .khe .cuoi { display:flex; gap:8px; align-items:flex-start; margin-top:8px; flex-wrap:wrap; }
  .khe .cuoi textarea { flex:1; min-width:200px; }
  .khe[data-tt="sua"] .b-khong { background:var(--fix); color:#fff; border-color:var(--fix); font-weight:600; }
  details.tong { margin:8px 0; } details.tong summary { cursor:pointer; color:var(--acc); font-size:14px; }
  details.tong img { max-width:100%; display:block; margin-top:6px; border:1px solid var(--line); border-radius:8px; cursor:zoom-in; }
  main[data-loc="chua"] .loc:not([data-tt=""]) { display:none; }
  main[data-loc="sua"] .loc:not([data-tt="sua"]) { display:none; }
  .hop { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:10px 14px; margin-top:12px; }
  .hop h3 { margin:0 0 6px; font-size:16px; }
  table { border-collapse:collapse; width:100%; font-size:14px; }
  th, td { text-align:left; padding:4px 8px; border-bottom:1px solid var(--line); }
  td.so, th.so { text-align:right; font-variant-numeric:tabular-nums; }
  .cuon { overflow-x:auto; }
  #phong { position:fixed; inset:0; background:rgba(0,0,0,.88); display:none; overflow:auto; z-index:20; cursor:zoom-out; }
  #phong img { display:block; margin:0 auto; max-width:none; }
  #ra { width:100%; min-height:120px; margin-top:8px; font-family:Consolas,monospace; font-size:13px; }
  a.phim { color:var(--acc); }
  button.vien { border-color:var(--acc); color:var(--acc); }
  .cham { display:inline-block; width:9px; height:9px; border-radius:50%; background:#1e8e4e; margin-right:5px; }
  .trung { display:flex; gap:8px; align-items:center; background:var(--vbg); color:var(--vtx); border:1px solid var(--vtx); border-radius:8px; padding:4px 8px; font-size:13px; font-weight:600; }
  .trung img { width:44px; height:44px; object-fit:contain; background:var(--tile); border-radius:6px; cursor:zoom-in; }
  details.truoc { margin:14px 0 0; background:var(--card); border:1px solid var(--vtx); border-radius:10px; padding:8px 12px; }
  details.truoc summary { cursor:pointer; font-weight:600; color:var(--vtx); }
  .hang { display:flex; gap:10px; align-items:center; padding:6px 0; border-top:1px solid var(--line); flex-wrap:wrap; }
  .hang img { width:52px; height:52px; object-fit:contain; background:var(--tile); border-radius:6px; cursor:zoom-in; }
  .hang .chu { flex:1; min-width:200px; font-size:14px; } .hang .chu b { font-weight:600; }
  .hang button { padding:3px 10px; font-size:13px; }
</style>
</head>
<body>
<header>
  <h1>Duyệt __EP__</h1>
  <div id="dem"></div>
  <button id="tatca">Duyệt hết mục chưa chọn</button>
  <button id="chep">Sao chép kết quả</button>
  <button id="luu">Lưu kết quả</button>
  <button id="gui" class="chinh">Gửi tới Claude</button>
  <span id="ghi-gui" class="mota" style="margin:0"></span>
</header>
<div id="tb" style="display:none;position:sticky;top:64px;z-index:6;margin:10px 16px 0;padding:8px 12px;border-radius:8px;color:#fff;max-width:1248px"></div>
<div id="dots"></div>
<div id="loc"><span>Hiện:</span><button data-l="">Tất cả</button><button data-l="chua">Chưa chọn</button><button data-l="sua">Cần sửa</button></div>
<nav id="muc-luc"></nav>
<main id="noi-dung"></main>
<div id="phong"><img alt=""></div>
<script type="application/json" id="du-lieu">__DATA__</script>
<script>
const DL = JSON.parse(document.getElementById('du-lieu').textContent);
const EP = DL.ep, DOTS = DL.dots, ANH = DL.anh;
const NN = n => String(n).padStart(2, '0');
const el = (t, a = {}, ...c) => { const n = document.createElement(t); for (const k in a) k === 'text' ? n.textContent = a[k] : n.setAttribute(k, a[k]); n.append(...c); return n; };
const fmt = n => (+n || 0).toLocaleString('vi-VN');
const khoa = d => EP + '_duyet_dot' + NN(d.so);
const dongKhoa = d => !!d.ketqua;
// trạng thái từng đợt: { id: {tt:'duyet'|'sua'|'', ghi, chon} }  (khe ung-vien: chon = id ứng viên | 'khong')
function nap(d) {
  if (d.ketqua) {
    const k = d.ketqua, t = {};
    (k.duyet || []).forEach(id => t[id] = { tt: 'duyet' }); (k.sua || []).forEach(id => t[id] = { tt: 'sua' });
    if (k.gau?.id) t[k.gau.id] = { tt: 'duyet' };
    for (const id in k.chon || {}) t[id] = k.chon[id] ? { tt: 'duyet', chon: k.chon[id] } : { tt: 'sua', chon: 'khong' };
    for (const id in k.ghiChu || {}) t[id] = { ...(t[id] || {}), ghi: k.ghiChu[id] };
    for (const id in k.doiTuDot || {}) t[id] = { ...(t[id] || {}), mo: true };
    return t;
  }
  try { const s = localStorage.getItem(khoa(d)); if (s) return JSON.parse(s); } catch (e) {}
  if (d.so === 1) try { const s = localStorage.getItem(EP + '_duyet_v1'); if (s) return JSON.parse(s); } catch (e) {}
  return {};
}
DOTS.forEach(d => d.tt = nap(d));
let hien = DOTS[DOTS.length - 1];
const nho = () => { if (!dongKhoa(hien)) try { localStorage.setItem(khoa(hien), JSON.stringify(hien.tt)); } catch (e) {} dem(); veLichSu(); };
// mục/khe đã quyết ở đợt trước và chưa được mở lại → thu gọn, không tính vào "Chưa chọn"
const an = (d, m) => !!(m.daQuyet && m.daQuyet.length) && !d.tt[m.id]?.mo && !d.tt[m.id]?.tt && !d.tt[m.id]?.chon;
const cacMuc = d => (d.nhom || []).filter(n => n.kieu !== 'chon').flatMap(n => n.muc).filter(m => !an(d, m));
function thongKe(d) { const t = cacMuc(d), n = t.filter(m => d.tt[m.id]?.tt === 'duyet').length, s = t.filter(m => d.tt[m.id]?.tt === 'sua').length; return { tong: t.length, duyet: n, sua: s, chua: t.length - n - s }; }

function veAnh(a, alt) {
  const src = ANH[a];
  return src ? el('img', { class: 'anh', src, alt, loading: 'lazy' }) : el('div', { class: 'thieu', text: 'thiếu ảnh: ' + a });
}
function veKhung(list, alt) {
  if (!list || !list.length) return el('div', { class: 'khung' }, el('div', { class: 'khong-hinh', text: 'không có hình' }));
  const k = el('div', { class: 'khung' + (list.length > 1 ? ' gal' : '') }); list.forEach(a => k.append(veAnh(a, alt))); return k;
}
function veLinks(m) {
  const w = el('div', { class: 'links' });
  (m.links || []).forEach(l => w.append(el('a', { class: 'lk', href: l.href, target: '_blank', rel: 'noopener', text: '↗ ' + l.ten })));
  return w;
}
function veMeta(m) {
  const p = []; if (m.nguon) p.push(m.nguon); if (m.tacGia) p.push('tác giả: ' + m.tacGia); if (m.giayPhep) p.push(m.giayPhep); if (m.tamGiac) p.push(fmt(m.tamGiac) + ' tam giác');
  return p.length ? el('div', { class: 'meta', text: p.join(' · ') }) : null;
}
function veChu(m) { return [el('div', { class: 'ten', text: m.ten }), m.phu ? el('div', { class: 'phu', text: m.phu }) : null, veMeta(m), veLinks(m)].filter(Boolean); }
function ghiChu(d, id, vao) {
  const TT = d.tt, ta = el('textarea', { placeholder: 'Ghi chú…' }); ta.value = TT[id]?.ghi || '';
  ta.oninput = () => { TT[id] = { ...(TT[id] || {}), ghi: ta.value }; nho(); };
  if (dongKhoa(d)) ta.readOnly = true; return ta;
}
function moTa(q) { return 'Đã chọn ở Đợt ' + q.dot + ': ' + (q.ten || (q.trangThai === 'sua' ? 'không cái nào' : q.id)); }
function veTrung(m) {
  const q = m.daQuyet && m.daQuyet[0]; if (!q) return null;
  const w = el('div', { class: 'trung', title: 'Chủ đề "' + m.chuDe + '" đã quyết ở đợt trước' });
  if (q.anh && ANH[q.anh]) w.append(el('img', { src: ANH[q.anh], alt: q.ten || '' }));
  w.append(el('span', { text: moTa(q) + (m.daQuyet.length > 1 ? ' (+' + (m.daQuyet.length - 1) + ')' : '') })); return w;
}
// thẻ mục thường / chon / cap
function veThe(d, nhom, m) {
  const khoaDong = dongKhoa(d), TT = d.tt, id = m.id, chon = nhom.kieu === 'chon';
  const o = el('div', { class: 'the loc' + (chon ? ' uv' : '') + ((nhom.kieu === 'cap' && m.anhTruoc) ? ' rong' : ''), 'data-id': id });
  const bD = el('button', { class: 'b-duyet' }), bS = el('button', { class: 'b-sua' });
  const hienNut = () => {
    const t = TT[id]?.tt || ''; o.dataset.tt = t;
    bD.textContent = chon ? (t === 'duyet' ? '✓ Đã chọn' : 'Chọn') : (t === 'duyet' ? '✓ Đã duyệt' : 'Duyệt');
    bS.textContent = chon ? 'Loại' : (t === 'sua' ? '✕ Cần sửa' : 'Cần sửa');
    if (chon) o.closest('section')?.classList.toggle('co', nhom.muc.some(x => TT[x.id]?.tt === 'duyet'));
  };
  const dat = tt => {
    if (khoaDong) return;
    if (chon && tt === 'duyet') nhom.muc.forEach(x => { if (x.id !== id && TT[x.id]?.tt === 'duyet') { TT[x.id].tt = ''; document.querySelector('[data-id="' + x.id + '"]')?._hien?.(); } });
    TT[id] = { ...(TT[id] || {}), tt: TT[id]?.tt === tt ? '' : tt }; hienNut(); nho();
  };
  bD.onclick = () => dat('duyet'); bS.onclick = () => dat('sua');
  if (khoaDong) bD.disabled = bS.disabled = true;
  o._hien = hienNut;
  let khung;
  if (nhom.kieu === 'cap' && (m.anhTruoc || m.anhSau)) {
    const nh = nhom.nhan || ['Trước', 'Sau'];
    khung = el('div', { class: 'doi' }, el('figure', {}, el('div', { class: 'khung' }, veAnh(m.anhTruoc, m.ten + ' — ' + nh[0])), el('figcaption', { text: nh[0] })), el('figure', {}, el('div', { class: 'khung' }, veAnh(m.anhSau, m.ten + ' — ' + nh[1])), el('figcaption', { text: nh[1] })));
  } else khung = veKhung(m.anh, m.ten);
  o.append(el('div', { class: 'dau', text: '✓' }), ...[veTrung(m)].filter(Boolean), khung, ...veChu(m), el('div', { class: 'nut' }, bD, bS), ghiChu(d, id));
  hienNut(); return o;
}
function veTheTC(m, nhan) { // thẻ tham chiếu: không nút
  return el('div', { class: 'the tc' }, khungNhan(m, nhan), ...veChu(m));
}
function khungNhan(m, nhan) { const k = veKhung(m.anh, m.ten); const w = el('div', {}); w.append(el('div', { class: 'meta', text: nhan }), k); return w; }
// khe ung-vien
function veKhe(d, nhom, khe) {
  const khoaDong = dongKhoa(d), TT = d.tt, id = khe.id;
  const w = el('div', { class: 'khe loc', 'data-id': id });
  const luoi = el('div', { class: 'luoi' });
  luoi.append(el('div', { class: 'the tc' }, khungNhan(khe, 'Hiện tại')));
  const bKhong = el('button', { class: 'b-khong' });
  const cac = [], nhieu = !!khe.chonNhieu;   // khe.chonNhieu: chọn NHIỀU ứng viên (cây, đá…) → chon = mảng id
  const dangChon = (c, uid) => (Array.isArray(c) ? c.includes(uid) : c === uid);
  const bHet = nhieu ? el('button', { class: 'b-duyet', text: 'Chọn hết' }) : null;
  const hien2 = () => {
    const c = TT[id]?.chon || '', co = Array.isArray(c) ? c.length > 0 : (!!c && c !== 'khong');
    w.dataset.tt = c === 'khong' ? 'sua' : co ? 'duyet' : ''; w.classList.toggle('co', co);
    bKhong.textContent = c === 'khong' ? '✕ Không cái nào' : 'Không cái nào';
    if (bHet) bHet.textContent = Array.isArray(c) && c.length === khe.ungVien.length ? '✓ Đã chọn hết' : 'Chọn hết' + (Array.isArray(c) && c.length ? ' (đang chọn ' + c.length + ')' : '');
    cac.forEach(([u, card, b]) => { const on = dangChon(c, u.id); card.dataset.tt = on ? 'duyet' : ''; b.textContent = on ? '✓ Đã chọn' : 'Chọn'; });
  };
  const ghi = c => { const rong = !c || (Array.isArray(c) && !c.length); TT[id] = { ...(TT[id] || {}), chon: rong ? '' : c, tt: rong ? '' : (c === 'khong' ? 'sua' : 'duyet') }; hien2(); nho(); };
  const dat = c => {
    if (khoaDong) return; const cu = TT[id]?.chon || '';
    if (!nhieu || c === 'khong') return ghi(cu === c ? '' : c);
    const a = Array.isArray(cu) ? [...cu] : []; const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); else a.push(c); ghi(a);
  };
  if (bHet) { bHet.onclick = () => { if (khoaDong) return; const c = TT[id]?.chon; ghi(Array.isArray(c) && c.length === khe.ungVien.length ? '' : khe.ungVien.map(u => u.id)); }; if (khoaDong) bHet.disabled = true; }
  khe.ungVien.forEach(u => {
    const b = el('button', { class: 'b-duyet', text: 'Chọn' }); b.onclick = () => dat(u.id); if (khoaDong) b.disabled = true;
    const card = el('div', { class: 'the uv', 'data-id': id + '/' + u.id }, el('div', { class: 'dau', text: '✓' }), veKhung(u.anh, u.ten), ...veChu(u), el('div', { class: 'nut' }, b));
    cac.push([u, card, b]); luoi.append(card);
  });
  bKhong.onclick = () => dat('khong'); if (khoaDong) bKhong.disabled = true;
  w.append(el('h3', { text: khe.ten + (nhieu ? ' — chọn được NHIỀU mẫu' : '') }), veTrung(khe) || el('span'), khe.phu ? el('div', { class: 'phu mota', text: khe.phu }) : el('div'), luoi, el('div', { class: 'cuoi' }, ...(bHet ? [bHet] : []), bKhong, ghiChu(d, id)));
  hien2(); return w;
}
function veToken(d) {
  const t = d.token || {}, ct = t.chiTiet || [];
  const h = el('div', { class: 'hop' }, el('h3', { text: 'Chi phí token: ' + fmt(t.tong) }));
  if (ct.length) {
    const tb = el('table'); tb.append(el('tr', {}, el('th', { text: 'Việc' }), el('th', { text: 'Model' }), el('th', { class: 'so', text: 'Token' })));
    ct.forEach(x => tb.append(el('tr', {}, el('td', { text: x.viec }), el('td', { text: x.model || '' }), el('td', { class: 'so', text: fmt(x.token) }))));
    h.append(el('div', { class: 'cuon' }, tb));
  }
  if (t.ghiChu) h.append(el('p', { class: 'mota', text: t.ghiChu }));
  return h;
}
function bangTong(n) {
  if (!n.anh.length) return null;
  const det = el('details', { class: 'tong' }, el('summary', { text: 'Xem bảng tổng' }));
  det.addEventListener('toggle', () => { if (det.open && det.children.length === 1) n.anh.forEach(a => det.append(ANH[a] ? el('img', { class: 'anh', src: ANH[a], alt: n.ten }) : el('div', { class: 'thieu', text: 'thiếu ảnh: ' + a }))); });
  return det;
}
function veDot(d) {
  const main = document.getElementById('noi-dung'), nav = document.getElementById('muc-luc');
  main.textContent = ''; nav.textContent = ''; main.dataset.loc = LOC;
  const ti = el('h2', { text: 'Đợt ' + d.so + ': ' + d.tieuDe }); if (dongKhoa(d)) ti.append(el('span', { class: 'nhan', text: 'đã chốt' }));
  main.append(ti, el('p', { class: 'mota', text: d.ngay + (d.tomTat ? ' · ' + d.tomTat : '') }));
  const p = el('p', { class: 'mota' }); p.append(document.createTextNode('Bấm vào hình để phóng to; bấm link ↗ để xem nguồn ở tab mới. Mỗi thẻ chọn Duyệt (xanh) hoặc Cần sửa (đỏ), ghi chú nếu muốn; lựa chọn tự nhớ trên máy này. Xong bấm Gửi tới Claude (hoặc Lưu / Sao chép kết quả).'));
  (d.lienKet || []).forEach(l => { p.append(el('a', { class: 'phim', href: l.href, text: l.ten }), document.createTextNode(' ')); });
  main.append(p, veToken(d));
  const gon = [];
  for (const n of d.nhom || []) if (n.kieu !== 'chon') n.muc.forEach(m => { if (an(d, m)) gon.push(m); });
  if (gon.length) {
    const det = el('details', { class: 'truoc' }, el('summary', { text: 'Đã quyết ở đợt trước (' + gon.length + ' mục) — bấm để xem lại/đổi' }));
    gon.forEach(m => {
      const q = m.daQuyet[0], h = el('div', { class: 'hang', 'data-gon': m.id });
      if (q.anh && ANH[q.anh]) h.append(el('img', { src: ANH[q.anh], alt: q.ten || '' }));
      const c = el('div', { class: 'chu' }); c.append(el('b', { text: m.ten }), document.createTextNode(' — ' + moTa(q))); h.append(c);
      if (!dongKhoa(d)) { const b = el('button', { text: 'Chọn lại' }); b.onclick = () => { d.tt[m.id] = { ...(d.tt[m.id] || {}), mo: true }; nho(); veDot(d); document.querySelector('[data-id="' + m.id + '"]')?.scrollIntoView({ block: 'center' }); }; h.append(b); }
      det.append(h);
    });
    main.append(det);
  }
  for (const n of d.nhom || []) {
    nav.append(el('a', { href: '#' + n.id, text: n.ten.split(' — ')[0].split(' (')[0] }));
    const s = el('section', { id: n.id, class: n.kieu === 'chon' ? 'gau' : '' }, el('h2', { text: n.ten }), el('p', { class: 'mota', text: n.mota || '' }));
    if (n.kieu === 'ung-vien') { n.muc.forEach(k => { if (!an(d, k)) s.append(veKhe(d, n, k)); }); const t = bangTong(n); if (t) s.append(t); main.append(s); continue; }
    const coAnhRieng = n.muc.some(m => m.anh.length || m.anhTruoc || m.anhSau);
    if (n.kieu === 'cap' && !coAnhRieng) { const c = el('div', { class: 'doi' }); n.anh.forEach((a, i) => c.append(el('figure', {}, veAnh(a, (n.nhan || [])[i] || n.ten), el('figcaption', { text: (n.nhan || [])[i] || '' })))); s.append(c); }
    else { const t = bangTong(n); if (t) s.append(t); }
    const l = el('div', { class: 'luoi' });
    if (n.hienTai) l.append(veTheTC(n.hienTai, 'Hiện tại (để so)'));
    n.muc.forEach(m => { if (!an(d, m)) l.append(veThe(d, n, m)); }); s.append(l); main.append(s);
    if (n.kieu === 'chon') s.classList.toggle('co', n.muc.some(x => d.tt[x.id]?.tt === 'duyet'));
  }
  main.append(el('section', { id: 'lich-su' }));
  document.getElementById('tatca').disabled = dongKhoa(d);
  veLichSu(); dem();
}
function veLichSu() {
  const s = document.getElementById('lich-su'); if (!s) return;
  s.textContent = ''; s.append(el('h2', { text: 'Lịch sử các đợt' }));
  const tb = el('table'); tb.append(el('tr', {}, ...['Đợt', 'Ngày', 'Số mục', 'Duyệt', 'Cần sửa', 'Token'].map((x, i) => el('th', { class: i > 1 ? 'so' : '', text: x }))));
  let tt = 0;
  DOTS.forEach(d => { const k = thongKe(d); tt += +d.token?.tong || 0; tb.append(el('tr', {}, el('td', { text: d.so + ' · ' + d.tieuDe + (dongKhoa(d) ? ' (đã chốt)' : '') }), el('td', { text: d.ngay }), el('td', { class: 'so', text: k.tong }), el('td', { class: 'so', text: k.duyet }), el('td', { class: 'so', text: k.sua }), el('td', { class: 'so', text: fmt(d.token?.tong) }))); });
  tb.append(el('tr', {}, el('td', { text: 'Tổng' }), el('td'), el('td'), el('td'), el('td'), el('td', { class: 'so', text: fmt(tt) })));
  s.append(el('div', { class: 'hop cuon' }, tb));
}
function dem() {
  const d = hien, k = thongKe(d), ch = (d.nhom || []).find(n => n.kieu === 'chon'), g = ch && ch.muc.find(m => d.tt[m.id]?.tt === 'duyet');
  document.getElementById('dem').textContent = 'Đợt ' + d.so + ' · Duyệt ' + k.duyet + ' · Cần sửa ' + k.sua + ' · Chưa chọn ' + k.chua + (ch ? ' · Gấu: ' + (g ? g.ten : 'chưa chọn') : '');
}
function ketQua() {
  const d = hien, ra = { tap: EP, dot: d.so, luc: new Date().toISOString(), gau: null, duyet: [], sua: [], chuaChon: [], chon: {}, ghiChu: {}, doiTuDot: {}, giuTuDot: {} };
  for (const n of d.nhom || []) for (const m of n.muc) {
    const id = m.id, t = d.tt[id] || {}; if (t.ghi) ra.ghiChu[id] = t.ghi;
    if (an(d, m)) { ra.giuTuDot[id] = m.daQuyet[0].dot; continue; }
    if (m.daQuyet && m.daQuyet.length && (t.tt || t.chon)) ra.doiTuDot[id] = m.daQuyet[0].dot;
    if (n.kieu === 'ung-vien') { if (t.chon === 'khong') ra.chon[id] = null; else if (t.chon) ra.chon[id] = t.chon; else ra.chuaChon.push(id); continue; }
    if (n.kieu === 'chon') { if (t.tt === 'duyet') ra.gau = { id, ten: m.ten }; continue; }
    (t.tt === 'duyet' ? ra.duyet : t.tt === 'sua' ? ra.sua : ra.chuaChon).push(id);
  }
  return JSON.stringify(ra, null, 1);
}
let LOC = '';
function chonDot(d) {
  hien = d; document.querySelectorAll('#dots button').forEach(b => b.classList.toggle('hien', +b.dataset.so === d.so));
  document.getElementById('chep').textContent = 'Sao chép kết quả'; veDot(d);
}
function chonLoc(l) { LOC = l; document.querySelectorAll('#loc button').forEach(b => b.classList.toggle('hien', b.dataset.l === l)); document.getElementById('noi-dung').dataset.loc = l; }
document.querySelectorAll('#loc button').forEach(b => b.onclick = () => chonLoc(b.dataset.l)); chonLoc('');
DOTS.forEach(d => { const b = el('button', { text: 'Đợt ' + d.so, 'data-so': d.so, title: d.tieuDe }); b.onclick = () => chonDot(d); document.getElementById('dots').append(b); });
document.getElementById('tatca').onclick = () => {
  const d = hien; if (dongKhoa(d)) return;
  (d.nhom || []).forEach(n => { if (n.kieu === 'chon' || n.kieu === 'ung-vien') return; n.muc.forEach(m => { if (!an(d, m) && !d.tt[m.id]?.tt) { d.tt[m.id] = { ...(d.tt[m.id] || {}), tt: 'duyet' }; document.querySelector('[data-id="' + m.id + '"]')?._hien?.(); } }); });
  nho();
};
document.getElementById('chep').onclick = async () => {
  const t = ketQua();
  try { await navigator.clipboard.writeText(t); document.getElementById('chep').textContent = 'Đã chép ✓'; }
  catch (e) { let r = document.getElementById('ra'); if (!r) { r = el('textarea', { id: 'ra', readonly: '' }); document.getElementById('noi-dung').append(el('h2', { text: 'Kết quả (chọn hết rồi chép)' }), r); } r.value = t; r.scrollIntoView(); r.select(); }
};
const phong = document.getElementById('phong');
document.addEventListener('click', e => { if (e.target.classList.contains('anh') || e.target.closest('details.tong img')) { phong.firstElementChild.src = e.target.src; phong.style.display = 'block'; phong.scrollTo(0, 0); } else if (phong.contains(e.target)) phong.style.display = 'none'; });
const bGui = document.getElementById('gui'), tb = document.getElementById('tb'), ghiGui = document.getElementById('ghi-gui');
const MAU = { ok: '#1e8e4e', loi: '#c0392b', vang: '#9a6700' };
const thongBao = (loai, chu) => { tb.style.display = 'block'; tb.style.background = MAU[loai] || MAU.loi; tb.textContent = chu; };
// Máy chủ nhận (tools/duyet.mjs mo): trang http cục bộ → cùng gốc; mở bằng file:// hoặc data: → thử 127.0.0.1:8791…8801
const TAI_CHO = location.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(location.hostname);
// Bản đăng lên web (3js.tuanchau.io.vn, https): gửi cùng gốc tới /api/gui → hàng đợi Cloudflare KV → máy nhận (tools/web-nhan.mjs)
const TREN_WEB = location.protocol === 'https:';
const UNG_VIEN = TREN_WEB ? ['/api'] : TAI_CHO ? [''] : Array.from({ length: 11 }, (_, i) => 'http://127.0.0.1:' + (8791 + i));
let MAY_CHU = null, DANG_GUI = false;
async function hoi(goc) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 800);
  try { const r = await fetch(goc + '/ping?ep=' + encodeURIComponent(EP), { signal: ac.signal, cache: 'no-store' }); if (!r.ok) return false; const j = await r.json(); return !!j && j.ung === 'duyet' && j.ep === EP; }
  catch (e) { return false; } finally { clearTimeout(t); }
}
async function timMayChu() { // lần lượt từng cổng, dừng ở máy chủ đúng tập
  if (MAY_CHU !== null && await hoi(MAY_CHU)) return MAY_CHU;
  for (const g of UNG_VIEN) if (g !== MAY_CHU && await hoi(g)) return g;
  return null;
}
function hienSan(san) {
  bGui.classList.toggle('chinh', san); bGui.classList.toggle('vien', !san);
  ghiGui.textContent = '';
  if (san) ghiGui.append(el('span', { class: 'cham' }), document.createTextNode('Claude đang chờ nhận')); else ghiGui.textContent = 'chưa bật nhận — bấm vẫn lưu file';
}
async function doTrangThai() { if (DANG_GUI) return; MAY_CHU = await timMayChu(); hienSan(MAY_CHU !== null); }
function luuFile() { const a = el('a', { href: URL.createObjectURL(new Blob([ketQua()], { type: 'application/json' })), download: EP + '_duyet_dot' + NN(hien.so) + '.json' }); a.click(); }
document.getElementById('luu').onclick = luuFile;
bGui.onclick = async () => {
  const d = hien; if (dongKhoa(d)) return thongBao('loi', 'Đợt này đã chốt, không gửi lại được.');
  const k = JSON.parse(ketQua()).chuaChon.length;
  if (k > 0 && !confirm('Còn ' + k + ' mục chưa chọn, vẫn gửi?')) return;
  DANG_GUI = true; bGui.disabled = true;
  try {
    const goc = await timMayChu(); MAY_CHU = goc;
    if (goc === null) {
      hienSan(false); luuFile();
      thongBao('vang', 'Claude chưa bật chế độ nhận. Đã tự lưu file kết quả (thư mục Tải xuống) — hãy gửi file đó cho Claude, hoặc mở tools\\duyet-mo.bat rồi bấm lại.');
    } else {
      try {
        const r = await fetch(goc + '/gui', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ketQua() });
        if (!r.ok) throw new Error('máy chủ trả ' + r.status + ': ' + (await r.text()));
        const h = new Date(), p = x => String(x).padStart(2, '0');
        thongBao('ok', 'Đã gửi Đợt ' + d.so + ' lúc ' + p(h.getHours()) + ':' + p(h.getMinutes()) + ' — Claude sẽ nhận trong phiên điều phối');
      } catch (e) { luuFile(); thongBao('loi', 'Gửi lỗi: ' + e.message + '. Đã tự lưu file kết quả — đưa file đó cho Claude.'); }
    }
  } finally { DANG_GUI = false; bGui.disabled = false; }
};
hienSan(false); doTrangThai(); setInterval(doTrangThai, 15000);
window.__duyet = { ketQua, chonDot: so => chonDot(DOTS.find(d => d.so === so)), dots: DOTS };
chonDot(hien);
</script>
</body>
</html>
`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [ep, lenh, ...r] = process.argv.slice(2);
  const co = t => r.includes(t), giaTri = (t, mac) => { const i = r.indexOf(t); return i >= 0 && r[i + 1] ? r[i + 1] : mac; };
  try {
    if (lenh === 'mo') {
      moMayChu(ep, { cong: +giaTri('--cong', 8791), khongMo: co('--khong-mo'), motLan: co('--mot-lan'), hetGio: +giaTri('--het-gio', 240), goc: path.resolve(giaTri('--thu-muc', GOC)) })
        .catch(e => { console.error('Lỗi: ' + e.message); process.exit(1); });
    } else if (lenh === 'dung') { const o = dung(ep); console.log(`${o.out}: ${(o.bytes / 2 ** 20).toFixed(2)} MB, ${o.dots} đợt, ${o.anhNhung} ảnh nhúng, ${o.thieu.length} thiếu, ${o.trung} mục trùng chủ đề đợt trước`); }
    else if (lenh === 'moi') console.log('tạo ' + moi(ep, r[0]));
    else if (lenh === 'token' && r.length >= 3) console.log('tổng token đợt ' + r[0] + ': ' + congToken(ep, +r[0], r[1], r[2], r[3]));
    else if (lenh === 'them-ung-vien' && r.length >= 2) console.log('nạp ứng viên vào ' + themUngVien(ep, +r[0], r[1], GOC, { boTrung: co('--bo-trung') }));
    else if (lenh === 'tong-hop') console.log(JSON.stringify(tongHop(ep), null, 1));
    else if (lenh === 'nhan' && r[0]) console.log('lưu ' + nhan(ep, r[0]));
    else { console.error('Dùng: node tools/duyet.mjs <ep> dung | moi "<tiêu đề>" | token <số> "<việc>" <token> [model] | nhan <file.json> | them-ung-vien <số> <file.json> [--bo-trung] | tong-hop | mo [--cong N] [--khong-mo] [--mot-lan] [--het-gio phút] [--thu-muc dir]'); process.exit(2); }
  } catch (e) { console.error('Lỗi: ' + e.message); process.exit(1); }
}
