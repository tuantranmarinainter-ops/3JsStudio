// Nhập HÀNG LOẠT bầu trời 6 ảnh (Roblox Sky) vào thư viện engine/skybox.js.
//
//   node tools/sky-import.mjs <thư mục> [tên] [--when day|night|any] [--order sun,moon,bk,dn,ft,lf,rt,up] [--label "…"] [--force]
//   node tools/sky-import.mjs --batch <thư mục cha> [--when …]      mỗi thư mục con = 1 bầu trời (tên = tên thư mục con)
//
// Nhận ảnh theo TÊN (không phân biệt hoa thường): SkyboxBk/bk, SkyboxDn/dn, SkyboxFt/ft, SkyboxLf/lf, SkyboxRt/rt, SkyboxUp/up,
//   SunTextureId/sun, MoonTextureId/moon. Ảnh không có tên mặt (1.png, 2.png…) → xếp theo số, mặc định theo thứ tự ô Properties
//   của Sky trong Roblox Studio: 8 ảnh = sun, moon, bk, dn, ft, lf, rt, up · 7 ảnh = moon, bk, dn, ft, lf, rt, up (hoặc sun… nếu --order)
//   · 6 ảnh = bk, dn, ft, lf, rt, up. Khác thứ tự đó thì ghi --order.
// Kết quả: assets/sky/<tên>/{bk,dn,ft,lf,rt,up[,sun,moon]}.png + dòng trong engine/skies.js + dòng nguồn trong assets/sky/CREDITS.md.
// Xem thử: engine/sky-lab.html?sky=<tên> (cần phục vụ qua http, file:// không tải được ảnh).
import { readdirSync, statSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename, extname, resolve } from 'path';
import { createHash } from 'crypto';
import { pathToFileURL } from 'url';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const opt = {}; const pos = [];
for (let i = 0; i < args.length; i++) { const a = args[i]; if (a.startsWith('--')) { const k = a.slice(2); opt[k] = (k === 'force' || k === 'batch') ? true : args[++i]; } else pos.push(a); }
if (!pos.length) { console.error('Dùng: node tools/sky-import.mjs <thư mục> [tên] [--when day|night|any] [--order …] [--label …] | --batch <thư mục cha>'); process.exit(2); }

const ALIAS = { bk: 'bk', back: 'bk', dn: 'dn', down: 'dn', bottom: 'dn', ft: 'ft', front: 'ft', lf: 'lf', left: 'lf', rt: 'rt', right: 'rt', up: 'up', top: 'up', sun: 'sun', moon: 'moon' };
const faceOf = (b) => ALIAS[b.toLowerCase().replace(/[^a-z]/g, '').replace(/^skybox/, '').replace(/texture(id)?$/, '')];
const DEF_ORDER = { 8: 'sun,moon,bk,dn,ft,lf,rt,up', 7: 'moon,bk,dn,ft,lf,rt,up', 6: 'bk,dn,ft,lf,rt,up' };
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sky';
const md5 = (f) => createHash('md5').update(readFileSync(f)).digest('hex');

const skiesFile = join(root, 'engine/skies.js');
const { SKIES } = await import(pathToFileURL(skiesFile).href + '?t=' + Date.now());
const known = new Map();   // md5 bộ 6 mặt → tên đã có (bắt nhập trùng)
for (const n of Object.keys(SKIES)) { try { known.set(['bk', 'dn', 'ft', 'lf', 'rt', 'up'].map((f) => md5(join(root, 'assets/sky', n, f + '.png'))).join(), n); } catch {} }

function importOne(dir, name) {
  const files = readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const bad = readdirSync(dir).filter((f) => /\.(jpe?g|webp|bmp)$/i.test(f));
  if (bad.length) console.warn(`  ⚠ bỏ qua ${bad.length} ảnh không phải PNG (${bad.join(', ')}) — đổi sang PNG rồi chạy lại`);
  const map = {};
  for (const f of files) { const b = basename(f, extname(f)); const k = faceOf(b); if (k && !map[k]) map[k] = f; }
  if (!['bk', 'dn', 'ft', 'lf', 'rt', 'up'].every((k) => map[k])) {   // không nhận được theo tên → theo thứ tự
    const order = (opt.order || DEF_ORDER[files.length] || '').split(',').filter(Boolean);
    if (order.length !== files.length) throw new Error(`${dir}: có ${files.length} ảnh PNG, không đoán được mặt nào — đặt tên ảnh (bk, dn, ft, lf, rt, up, sun, moon) hoặc ghi --order`);
    for (const k in map) delete map[k];
    order.forEach((k, i) => { map[k] = files[i]; });
  }
  const sig = ['bk', 'dn', 'ft', 'lf', 'rt', 'up'].map((f) => md5(join(dir, map[f]))).join();
  if (known.has(sig) && known.get(sig) !== name && !opt.force) { console.warn(`  ⚠ ${dir}: trùng 6 mặt với "${known.get(sig)}" — bỏ qua (--force để nhập vẫn)`); return null; }
  if (SKIES[name] && !opt.force) { console.warn(`  ⚠ tên "${name}" đã có — bỏ qua (--force để ghi đè, hoặc đặt tên khác)`); return null; }
  const out = join(root, 'assets/sky', name); mkdirSync(out, { recursive: true });
  for (const [k, f] of Object.entries(map)) copyFileSync(join(dir, f), join(out, k + '.png'));
  SKIES[name] = { label: opt.label || `${name} (Roblox Sky, người dùng gửi ${new Date().toISOString().slice(0, 10)})`, when: opt.when || 'day', exposure: 1,
    ...(map.sun ? { sun: true, sunSize: 21 } : {}), ...(map.moon ? { moon: true, moonSize: 11 } : {}) };
  known.set(sig, name);
  const cred = join(root, 'assets/sky/CREDITS.md');
  if (existsSync(cred) && !readFileSync(cred, 'utf8').includes('`' + name + '/`')) {   // chèn ngay sau dòng cuối của bảng
    const L = readFileSync(cred, 'utf8').split('\n'); let i = -1; L.forEach((l, k) => { if (l.startsWith('|')) i = k; });
    L.splice(i + 1, 0, `| \`${name}/\` (${Object.keys(map).join(', ')}) | Người dùng gửi ${new Date().toISOString().slice(0, 10)}, từ Roblox Sky | Nguồn/giấy phép do người dùng chịu trách nhiệm. |`);
    writeFileSync(cred, L.join('\n'));
  }
  console.log(`  ✓ ${name}: ${Object.entries(map).map(([k, f]) => `${k}←${f}`).join('  ')}`);
  return name;
}

const done = [];
if (opt.batch) {
  const parent = resolve(pos[0]);
  for (const d of readdirSync(parent)) { const p = join(parent, d); if (statSync(p).isDirectory()) { try { const n = importOne(p, slug(d)); if (n) done.push(n); } catch (e) { console.warn('  ✗ ' + e.message); } } }
} else {
  const dir = resolve(pos[0]); const n = importOne(dir, slug(pos[1] || basename(dir))); if (n) done.push(n);
}
// ghi lại engine/skies.js (giữ phần chú thích đầu file)
const src = readFileSync(skiesFile, 'utf8'), head = src.slice(0, src.indexOf('export const SKIES'));
writeFileSync(skiesFile, head + 'export const SKIES = {\n' + Object.entries(SKIES).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v).replace(/,"/g, ', "').replace(/":/g, '": ')}`).join(',\n') + '\n};\n');
console.log(`\nĐã nhập ${done.length} bầu trời: ${done.join(', ') || '(không có)'}`);
if (done.length) console.log(`Gắn vào bối cảnh: e.skybox = '${done[0]}' trong engine/envs/<tên>.js · Xem thử: engine/sky-lab.html?sky=${done[0]}`);
