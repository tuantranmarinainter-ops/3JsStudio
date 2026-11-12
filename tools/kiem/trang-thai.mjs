// Trạng thái + nhật ký của dây chuyền làm phim (output/<ep>/kiem/).
// Mọi hàm nhận tham số cuối { goc } (mặc định gốc repo) để test ghi vào thư mục tạm.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const BUOC = ['kich-ban', 'asset', 'giong', 'mau-duyet', 'shot', 'ra-loi', 'am-thanh', 'gop'];
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const thuMucKiem = (ep, { goc = GOC } = {}) => path.join(goc, 'output', ep, 'kiem');
const fTrangThai = (ep, o) => path.join(thuMucKiem(ep, o), 'trang-thai.json');
const fNhatKy = (ep, o) => path.join(thuMucKiem(ep, o), 'nhat-ky.jsonl');

export function docTrangThai(ep, o = {}) {
  const f = fTrangThai(ep, o);
  if (!fs.existsSync(f)) return { ep, buoc: {} };
  try {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!d || typeof d !== 'object' || typeof d.buoc !== 'object' || !d.buoc) throw new Error('sai dạng');
    return d;
  } catch {
    try { fs.renameSync(f, `${f}.hong-${Date.now()}`); } catch { /* bỏ qua */ }
    return { ep, buoc: {} };
  }
}

// ghi nguyên tử: file tạm cùng thư mục rồi đổi tên
function ghiTrangThai(ep, d, o) {
  const f = fTrangThai(ep, o);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = `${f}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2) + '\n');
  fs.renameSync(tmp, f);
}

function* duyetFile(p) {
  let st; try { st = fs.statSync(p); } catch { yield null; return; }
  if (st.isDirectory()) {
    for (const n of fs.readdirSync(p).sort()) yield* duyetFile(path.join(p, n));
  } else yield p;
}

// băm theo đường dẫn tương đối (chuẩn hoá /) so với goc → tuyệt đối hay tương đối đều ra cùng hash
export function hashVao(paths, { goc = GOC } = {}) {
  const h = crypto.createHash('sha1');
  const ds = paths.map((p) => path.resolve(goc, p)).sort();
  for (const g of ds) {
    for (const f of duyetFile(g)) {
      const ten = f ?? g;
      h.update(path.relative(goc, ten).split(path.sep).join('/') + '\0');
      if (f) h.update(fs.readFileSync(f)); else h.update('<thiếu>');
      h.update('\0');
    }
  }
  return h.digest('hex');
}

export function canChay(ep, buoc, hash, o = {}) {
  if (typeof hash !== 'string' || !hash) return true;
  const b = docTrangThai(ep, o).buoc[buoc];
  return !(b && b.xong && b.hash === hash);
}

export function batDau(ep, buoc, o = {}) {
  const d = docTrangThai(ep, o);
  d.ep = ep;
  d.buoc[buoc] = { ...(d.buoc[buoc] || {}), xong: false, bat_dau: new Date().toISOString() };
  ghiTrangThai(ep, d, o);
}

export function datBuoc(ep, buoc, { hash, xong = true, goi } = {}, o = {}) {
  const d = docTrangThai(ep, o);
  d.ep = ep;
  const { bat_dau, ...cu } = d.buoc[buoc] || {};
  let phut = cu.phut ?? null;
  const t0 = bat_dau ? Date.parse(bat_dau) : NaN;
  if (Number.isFinite(t0)) phut = Math.round(Math.max(0, Date.now() - t0) / 600) / 100;
  d.buoc[buoc] = { hash, xong: !!xong, luc: new Date().toISOString(), phut, goi: goi ?? cu.goi ?? 0 };
  ghiTrangThai(ep, d, o);
  return d.buoc[buoc];
}

// chỉ append; nếu file không kết thúc bằng \n (dòng dở) thì thêm \n trước dòng mới, giữ nguyên dòng dở
export function ghiNhatKy(ep, dong, o = {}) {
  const f = fNhatKy(ep, o);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  let tien = '';
  if (fs.existsSync(f)) {
    const fd = fs.openSync(f, 'r');
    try {
      const n = fs.fstatSync(fd).size;
      if (n > 0) {
        const b = Buffer.alloc(1);
        fs.readSync(fd, b, 0, 1, n - 1);
        if (b[0] !== 0x0a) tien = '\n';
      }
    } finally { fs.closeSync(fd); }
  }
  const d = { ts: new Date().toISOString(), ep, ...dong };
  fs.appendFileSync(f, tien + JSON.stringify(d) + '\n');
}

export function docNhatKy(ep, o = {}) {
  const f = fNhatKy(ep, o);
  if (!fs.existsSync(f)) return [];
  const out = [];
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    try { out.push(JSON.parse(l)); } catch { /* bỏ dòng hỏng */ }
  }
  return out;
}
