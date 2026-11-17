#!/usr/bin/env node
// khop-bao-cao.mjs — bảng LỆCH tài sản so với khối cho các bối cảnh ep5t-* (kế hoạch docs/handoff/khop-khoi-tai-san.md, Bước 3).
// Dựng env THẬT (engine/envs/ep5t-chung.js) trong node với tài sản giả = hộp đúng kích thước đo (output/khop/do.json; chạy `nhap-model.mjs do` trước),
// hai lần: khớp MỚI (khop bật) và CŨ (?khop=0). Kiểm: đáy / tâm x-z / hướng của từng mốc GIỐNG HỆT; in % lệch từng chiều theo khối.
// Dùng: node tools/khop-bao-cao.mjs [--ra output/khop/nha-lech.md] [--nguong 0.2]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { nap } from './tests/_three.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2), opt = (k, d) => (arg.includes(k) ? arg[arg.indexOf(k) + 1] : d);
const RA = path.resolve(ROOT, opt('--ra', 'output/khop/nha-lech.md')), NGUONG = parseFloat(opt('--nguong', '0.2'));
const DO = JSON.parse(fs.readFileSync(path.join(ROOT, 'output', 'khop', 'do.json'), 'utf8'));
const THREE = await nap();

function dung(build, data, khop) {
  globalThis.location = { search: khop ? '?canh=0' : '?canh=0&khop=0' };   // canh=0: ghép TỪNG MỐC (không dùng cảnh dựng sẵn)
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
  return { r, e };
}
const f = (x) => (x == null ? '—' : (x * 100).toFixed(0) + '%');
const dec = (a) => a.map((x) => x.toFixed(2)).join(', ');
const dong = [], vuot = [], lechVT = [];
const dir = path.join(ROOT, 'engine', 'envs');
let nMoc = 0, nModel = new Set();
for (const fn of fs.readdirSync(dir).filter((x) => /^ep5t-.+\.js$/.test(x) && !['ep5t-chung.js', 'ep5t-loai.js'].includes(x) && !/-studio\.js$/.test(x)).sort()) {
  const mod = await import(pathToFileURL(path.join(dir, fn)).href);
  if (!mod.DATA) continue;
  const data = mod.DATA, build = (await import(pathToFileURL(path.join(dir, 'ep5t-chung.js')).href)).default;
  const moi = dung(build, data, true), cu = dung(build, data, false);
  for (const [id, k] of Object.entries(moi.e.khop)) {
    nMoc++; nModel.add(k.model);
    const a = moi.r[id], b = cu.r[id];
    // đáy, tâm x/z, hướng phải giống bản cũ
    const tam = (x) => [(x.min[0] + x.max[0]) / 2, x.min[1], (x.min[2] + x.max[2]) / 2];
    const ta = tam(a), tb = tam(b);
    const sai = Math.abs(ta[1] - tb[1]) > 1e-6 || Math.abs(ta[0] - tb[0]) > 1e-3 || Math.abs(ta[2] - tb[2]) > 1e-3 || Math.abs(a.ry - b.ry) > 1e-9;
    if (sai) lechVT.push(`${data.id}/${id}: mới [${ta.map((x) => x.toFixed(3))}] ry ${a.ry} ≠ cũ [${tb.map((x) => x.toFixed(3))}] ry ${b.ry}`);
    const kich = (x) => x.max.map((m, i) => m - x.min[i]);
    const row = { bc: data.id, moc: id, model: k.model.replace(/^nhap\/ep5t-/, ''), loai: k.loai, lech: k.lech, tong: k.tong, moi: kich(a), cu: kich(b), cb: k.canhBao, lap: k.lap };
    dong.push(row); if (k.tong > NGUONG || row.cb.length) vuot.push(row);
  }
}
const L = [];
L.push('# Bảng lệch tài sản so với khối — nhóm NHÀ ep005t', '',
  `Sinh bởi \`node tools/khop-bao-cao.mjs\` (khớp \`engine/khop-tai-san.js\`; tài sản = hộp đúng bbox đo ở \`output/khop/do.json\`). Lệch = |kích thước sau khớp ÷ vùng khối − 1| theo trục khối; "—" = trục mỏng < 0,5 stud bỏ qua. Ngưỡng cảnh báo ${(NGUONG * 100).toFixed(0)}%.`, '',
  `- Mốc có model: **${nMoc}** (${nModel.size} model khác nhau) · lệch > ${(NGUONG * 100).toFixed(0)}% hoặc có cảnh báo: **${vuot.length}** · vị trí/đáy/tâm/hướng khác bản cũ: **${lechVT.length}**`, '',
  '| Bối cảnh / mốc | Model | Loại | Lệch X | Lệch Y | Lệch Z | Kích thước mới (x,y,z) | Cũ (?khop=0) | Cảnh báo |', '|---|---|---|---|---|---|---|---|---|');
for (const r of dong.sort((a, b) => b.tong - a.tong)) L.push(`| ${r.bc}/${r.moc} | ${r.model} | ${r.loai}${r.lap ? ` ×${r.lap.n}` : ''} | ${f(r.lech.x)} | ${f(r.lech.y)} | ${f(r.lech.z)} | ${dec(r.moi)} | ${dec(r.cu)} | ${r.cb.join('; ') || '—'} |`);
L.push('', '## Kiểm vị trí', lechVT.length ? lechVT.map((x) => '- ❌ ' + x).join('\n') : '- ✅ Mọi mốc: đáy, tâm x/z và hướng (ry) GIỐNG HỆT bản cũ.', '');
fs.mkdirSync(path.dirname(RA), { recursive: true }); fs.writeFileSync(RA, L.join('\n'), 'utf8');
console.log(`${nMoc} mốc · vượt ngưỡng ${vuot.length} · vị trí khác ${lechVT.length} → ${path.relative(ROOT, RA)}`);
process.exit(lechVT.length ? 1 : 0);
