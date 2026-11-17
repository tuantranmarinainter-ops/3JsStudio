#!/usr/bin/env node
// khop-bao-cao.mjs — bảng LỆCH tài sản so với khối cho các env dựng THEO MỐC (kiểu engine/envs/ep5t-chung.js: module xuất DATA {id, moc[], MODELS{}}). CHỈ ĐO, không đổi env.
// Dựng env THẬT trong node với tài sản giả = hộp đúng kích thước đo (output/khop/do.json; chạy `nhap-model.mjs do` trước), lấy kích thước đang đặt của từng mốc,
// rồi hỏi khop() (engine/khop-tai-san.js) cần lệch bao nhiêu nếu khớp theo luật loại.
// Dùng: node tools/khop-bao-cao.mjs [--tien-to ep5t-] [--build ep5t-chung.js] [--loai f.json {"<bối cảnh>/<mốc>":"nha"}] [--ra output/khop/nha-lech.md] [--nguong 0.2]
// (ep003 dựng bằng helper rb()/nhaGlb(), không theo mốc → dùng tools/khop-bao-cao-ep003.mjs.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { nap } from './tests/_three.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2), opt = (k, d) => (arg.includes(k) ? arg[arg.indexOf(k) + 1] : d);
const TIEN_TO = opt('--tien-to', 'ep5t-'), BUILD = opt('--build', 'ep5t-chung.js'), LOAI = opt('--loai', null) ? JSON.parse(fs.readFileSync(path.resolve(ROOT, opt('--loai')), 'utf8')) : {};
import { khop, doanLoai } from '../engine/khop-tai-san.js';
const RA = path.resolve(ROOT, opt('--ra', 'output/khop/nha-lech.md')), NGUONG = parseFloat(opt('--nguong', '0.2'));
const DO = JSON.parse(fs.readFileSync(path.join(ROOT, 'output', 'khop', 'do.json'), 'utf8'));
const THREE = await nap();

function dung(build, data) {
  globalThis.location = { search: '?canh=0' };   // canh=0: ghép TỪNG MỐC (không dùng cảnh dựng sẵn)
  const fit = (id, size) => {
    const d = DO[id]; if (!d) return null;
    const [w, h, p] = d.bbox, k = size / Math.max(1e-4, h);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * k, h * k, p * k)); m.position.y = (h * k) / 2;
    const holder = new THREE.Group(); holder.add(m); return holder;
  };
  const g = new THREE.Group(), e = {};
  build(g, e, { THREE, ganTang: (o) => o, fit }, data);
  g.updateMatrixWorld(true);
  const r = {};
  g.traverse((o) => { if (o.name?.startsWith('ep5t_rb_')) { const b = new THREE.Box3().setFromObject(o); r[o.name.slice(8)] = { min: b.min.toArray(), max: b.max.toArray(), ry: o.rotation.y }; } });
  return r;
}
const lay = (vung) => { const o = {}; for (const m of String(vung || '').matchAll(/([xyz])\s*(-?[\d.]+)\s*\.\.\s*(-?[\d.]+)/g)) o[m[1]] = [parseFloat(m[2]), parseFloat(m[3])]; return o.x && o.y && o.z ? o : null; };
const f = (x) => (x == null ? '—' : (x * 100).toFixed(0) + '%');
const dec = (a) => a.map((x) => x.toFixed(2)).join(', ');
const dong = [];
const dir = path.join(ROOT, 'engine', 'envs');
const build = (await import(pathToFileURL(path.join(dir, BUILD)).href)).default;
let nMoc = 0, nModel = new Set();
for (const fn of fs.readdirSync(dir).filter((x) => x.startsWith(TIEN_TO) && x.endsWith('.js') && x !== BUILD && !/-studio\.js$/.test(x)).sort()) {
  const mod = await import(pathToFileURL(path.join(dir, fn)).href);
  if (!mod.DATA) continue;
  const data = mod.DATA, r = dung(build, data);
  for (const moc of [...data.moc, ...(data.them || [])]) {
    const md = (data.MODELS || {})[moc.id]; if (!md || md.bo || !r[moc.id] || !DO[md.id]) continue;
    const v = lay(md.vung || moc.vung); if (!v) continue;
    if (Object.keys(LOAI).length && !LOAI[data.id + '/' + moc.id]) continue;   // có --loai: chỉ các mốc được khai
    const loai = LOAI[data.id + '/' + moc.id] || md.loai || doanLoai(v);
    const k = khop({ bbox: DO[md.id].bbox, vung: v, loai, ry: md.ry || 0, opt: { he: md.he } });
    nMoc++; nModel.add(md.id);
    const a = r[moc.id], kich = a.max.map((m, i) => m - a.min[i]);
    dong.push({ bc: data.id, moc: moc.id, model: md.id.replace(/^nhap\/ep5t-/, ''), loai: k.loai, lech: k.lech, tong: k.tong, hienTai: kich, khop: k.sau, cb: k.canhBao, lap: k.lap });
  }
}
const vuot = dong.filter((r) => r.tong > NGUONG || r.cb.length);
const L = ['# Bảng lệch tài sản so với khối', '',
  `Sinh bởi \`node tools/khop-bao-cao.mjs --tien-to ${TIEN_TO}\` (CHỈ ĐO). Lệch = |kích thước nếu khớp theo luật loại ÷ vùng khối − 1| theo trục khối; "—" = trục mỏng < 0,5 stud bỏ qua. "Đang đặt" = kích thước env hiện tại đặt (cách co cũ). Ngưỡng ${(NGUONG * 100).toFixed(0)}%.`, '',
  `- Mốc có model: **${nMoc}** (${nModel.size} model khác nhau) · lệch > ${(NGUONG * 100).toFixed(0)}% hoặc có cảnh báo: **${vuot.length}**`, '',
  '| Bối cảnh / mốc | Model | Loại | Lệch X | Lệch Y | Lệch Z | Nếu khớp (x,y,z) | Đang đặt | Cảnh báo |', '|---|---|---|---|---|---|---|---|---|'];
for (const r of dong.sort((a, b) => b.tong - a.tong)) L.push(`| ${r.bc}/${r.moc} | ${r.model} | ${r.loai}${r.lap ? ` ×${r.lap.n}` : ''} | ${f(r.lech.x)} | ${f(r.lech.y)} | ${f(r.lech.z)} | ${dec(r.khop)} | ${dec(r.hienTai)} | ${r.cb.join('; ') || '—'} |`);
L.push('');
fs.mkdirSync(path.dirname(RA), { recursive: true }); fs.writeFileSync(RA, L.join(String.fromCharCode(10)), 'utf8');
console.log(`${nMoc} mốc · lệch>ngưỡng/cảnh báo ${vuot.length} → ${path.relative(ROOT, RA)}`);
