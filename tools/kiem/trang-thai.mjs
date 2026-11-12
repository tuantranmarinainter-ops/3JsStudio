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

function ghiTrangThai(ep, d, o) {
  const f = fTrangThai(ep, o);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(d, null, 2) + '\n');
}

export function hashVao(paths) {
  const h = crypto.createHash('sha1');
  for (const p of [...paths].sort()) {
    h.update(p + '\0');
    try { h.update(fs.readFileSync(p)); } catch { h.update('<thiếu>'); }
    h.update('\0');
  }
  return h.digest('hex');
}

export function canChay(ep, buoc, hash, o = {}) {
  const b = docTrangThai(ep, o).buoc[buoc];
  return !(b && b.xong && b.hash === hash);
}

const dangChay = new Map();
export function batDau(ep, buoc, o = {}) {
  dangChay.set(`${o.goc || GOC}|${ep}|${buoc}`, Date.now());
}

export function datBuoc(ep, buoc, { hash, xong = true, goi } = {}, o = {}) {
  const d = docTrangThai(ep, o);
  d.ep = ep;
  const k = `${o.goc || GOC}|${ep}|${buoc}`;
  const t0 = dangChay.get(k);
  dangChay.delete(k);
  const cu = d.buoc[buoc] || {};
  const phut = t0 ? Math.round((Date.now() - t0) / 600) / 100 : (cu.phut ?? 0);
  d.buoc[buoc] = { hash, xong: !!xong, luc: new Date().toISOString(), phut, goi: goi ?? cu.goi ?? 0 };
  ghiTrangThai(ep, d, o);
  return d.buoc[buoc];
}

export function ghiNhatKy(ep, dong, o = {}) {
  const f = fNhatKy(ep, o);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  let tien = '';
  if (fs.existsSync(f)) {
    const s = fs.readFileSync(f, 'utf8');
    if (s.length && !s.endsWith('\n')) {
      // dòng cuối cắt dở: nếu còn parse được thì giữ, không thì cắt bỏ để file sạch
      const i = s.lastIndexOf('\n');
      const cuoi = s.slice(i + 1);
      let ok = true; try { JSON.parse(cuoi); } catch { ok = false; }
      if (ok) tien = '\n'; else fs.writeFileSync(f, s.slice(0, i + 1));
    }
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
