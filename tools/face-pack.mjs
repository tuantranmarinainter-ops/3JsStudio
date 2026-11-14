#!/usr/bin/env node
// face-pack.mjs — tải một "bộ mặt" (face pack) từ Roblox Creator Store về .cache/roblox/<id>/ và liệt kê ảnh.
//   node tools/face-pack.mjs tai [id]        tải model + dump + mọi ảnh được tham chiếu (có cache theo id)
//   node tools/face-pack.mjs ke  [id]        in bảng: tên Decal → id ảnh → kích thước → có trong suốt không
// Khoá ROBLOX_API_KEY đọc từ .env.local, chỉ gửi qua header x-api-key tới apis.roblox.com; KHÔNG in / ghi / đưa vào URL.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { taiAsset, songSong, demRequest } from './roblox.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://apis.roblox.com';
const SKY = path.join(ROOT, 'tools', 'sky-extract', 'bin', 'sky-extract.exe');
const MAC_DINH = '6557969904';                          // AltiWyre's Face Pack

function khoa() {
  const f = path.join(ROOT, '.env.local');               // .env.local trước (giống tools/roblox.mjs), biến môi trường sau
  const m = fs.existsSync(f) && fs.readFileSync(f, 'utf8').match(/^ROBLOX_API_KEY=(.*)$/m);
  return (m ? m[1].trim().replace(/^["']|["']$/g, '') : '') || process.env.ROBLOX_API_KEY || '';
}
const che = (s) => { const k = khoa(); return k ? String(s).split(k).join('***') : String(s); };
function loi(m) { console.error(che('LỖI: ' + m)); process.exit(1); }

// Tải dùng chung với tools/roblox.mjs: thử lại 429/5xx (0,5 s · 1,5 s · 4 s) ở cả bước location lẫn CDN, song song có trần.
export function loaiAnh(b) {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}
/** Một id Decal có thể trả XML bọc <url>…id=ẢNH THẬT</url> — xử lý cả hai. Trả {file, anhId}. */
async function taiAnh(id, dir, o = {}) {
  for (const e of ['png', 'jpg', 'webp']) { const f = path.join(dir, `${id}.${e}`); if (fs.existsSync(f)) return { file: f, cache: true }; }
  let b = await taiAsset(id, o), e = loaiAnh(b), that = id;
  if (!e) {
    const m = b.toString('latin1', 0, 4000).match(/<url>[^<]*?(\d{4,})[^<]*<\/url>/);
    if (m) { that = m[1]; b = await taiAsset(that, o); e = loaiAnh(b); }
  }
  if (!e) throw new Error(`ảnh ${id}: không nhận ra định dạng`);
  const f = path.join(dir, `${id}.${e}`); fs.writeFileSync(f, b);
  return { file: f, that };
}
/** Kích thước + kiểu màu PNG (đọc IHDR; không cần thư viện). */
export function thongTinPng(b) {
  if (loaiAnh(b) !== 'png') return null;
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), ct = b[25];
  return { w, h, alpha: ct === 4 || ct === 6 || b.includes(Buffer.from('tRNS')) };
}
/** Gom mọi id ảnh trong một cây JSON bất kỳ (dump của sky-extract): chuỗi rbxassetid://N, …asset/?id=N. */
export function gomIdAnh(node, ra = [], duong = []) {
  if (Array.isArray(node)) { node.forEach((x, i) => gomIdAnh(x, ra, duong)); return ra; }
  if (node && typeof node === 'object') {
    const ten = node.name || node.Name;
    const d2 = ten ? [...duong, String(ten)] : duong;
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string') {
        const m = v.match(/(?:rbxassetid:\/\/|asset\/?\?id=|assetId=)(\d{4,})/i)
          || (/^(texture|textureId|colorMap|image)$/i.test(k) && v.match(/^(\d{4,})$/));   // sky-extract đã rút sẵn id trần
        if (m && !/mesh/i.test(k)) ra.push({ id: m[1], khoa: k, duong: node.path ? String(node.path) : d2.join('/') });
      } else gomIdAnh(v, ra, d2);
    }
  }
  return ra;
}

async function cmdTai(id) {
  const dir = path.join(ROOT, '.cache', 'roblox', id), dA = path.join(dir, 'anh');
  fs.mkdirSync(dA, { recursive: true });
  let mf = ['rbxm', 'rbxmx'].map((e) => path.join(dir, `model.${e}`)).find((f) => fs.existsSync(f));
  if (!mf) {
    const b = await taiAsset(id);
    const dau = b.toString('latin1', 0, 16);
    if (!/^<roblox/.test(dau)) loi(`asset ${id} không phải model (đầu file: ${JSON.stringify(dau.slice(0, 12))})`);
    mf = path.join(dir, dau.startsWith('<roblox!') ? 'model.rbxm' : 'model.rbxmx'); fs.writeFileSync(mf, b);
  }
  const d = spawnSync(SKY, ['dump', mf], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (d.status !== 0) loi('sky-extract dump lỗi: ' + (d.stderr || '').slice(0, 300));
  fs.writeFileSync(path.join(dir, 'dump-full.json'), d.stdout);
  const ds = gomIdAnh(JSON.parse(d.stdout));
  const ids = [...new Set(ds.map((x) => x.id))];
  const bang = [], hong = [];
  const k = process.argv.indexOf('--song-song'), tran = k > 0 && Number(process.argv[k + 1]) > 0 ? Number(process.argv[k + 1]) : 6;
  const kq = await songSong(ids, (i, _n, giam) => taiAnh(i, dA, { khi429: giam }), { tran });   // gặp 429 thì trần tự giảm một nửa
  ids.forEach((i, n) => {
    const r = kq[n];
    if (!r.ok) { hong.push({ id: i, loi: che(r.loi.message) }); return; }
    const info = thongTinPng(fs.readFileSync(r.v.file)) || {};
    bang.push({ id: i, file: path.basename(r.v.file), ...info, noi: ds.filter((x) => x.id === i).map((x) => x.duong) });
  });
  fs.writeFileSync(path.join(dir, 'anh.json'), JSON.stringify({ id, anh: bang, hong }, null, 1));
  console.log(`model: ${path.relative(ROOT, mf)} (${fs.statSync(mf).size} byte) · ${ids.length} id ảnh · tải được ${bang.length} · hỏng ${hong.length} · ${demRequest()} request · song song ${tran}${kq.tranCuoi < tran ? ` (giảm còn ${kq.tranCuoi} vì 429)` : ''}`);
  if (hong.length) console.log('hỏng:', hong.slice(0, 10).map((h) => `${h.id} (${h.loi})`).join('; '));
}
function cmdKe(id) {
  const f = path.join(ROOT, '.cache', 'roblox', id, 'anh.json');
  if (!fs.existsSync(f)) loi('chưa tải: node tools/face-pack.mjs tai ' + id);
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const a of j.anh) console.log(`${a.id}\t${a.w}x${a.h}\t${a.alpha ? 'trong suốt' : 'đặc'}\t${a.noi[0]}${a.noi.length > 1 ? ` (+${a.noi.length - 1})` : ''}`);
}

// ---------- phân loại bộ phận của AltiWyre's Face Pack (nhóm [NEW]) theo vị trí trên bảng trưng bày ----------
const NHOM = [                                          // [đuôi path, tiền tố mã]
  ['-EYES-.Decals', 'e'], ['-EYES-.-EYEBROWS-.Decals', 'b'], ['-EYES-.-PUPILS-.Decals', 'p'],
  ['-MOUTHS-.-STILLS-.Decals', 'm'], ['-MOUTHS-.-SPEECH-.Decals', 's'], ['-ADDITIONAL-', 'a'],
  ['[OLD].ADDITIONS [OLD].Decals', 'o'],   // phụ thêm của bản cũ (nước mắt, mồ hôi, má hồng… nếu có)
];
const HUONG = ['blank', 'up', 'down', 'right', 'left', 'fwd'];   // hàng mắt từ trên xuống (theo nhãn Blank/Up/Down/Right/Left/Forward)
/** dump → [{ma, nhom, hang, cot, id}] ; mã ổn định: e07-up, ex03 (hàng mắt phụ), m12, s2-4, b05, p11, a09. */
export function phanLoai(parts) {
  const ra = [];
  for (const [duoi, tt] of NHOM) {
    const ps = parts.filter((p) => p.path.endsWith((duoi.startsWith('-') ? '[NEW].' : '') + duoi) && p.decals?.[0]?.texture);
    const tx = new Set(ps.map((p) => Math.round(p.cframe.pos[0] * 2))).size >= new Set(ps.map((p) => Math.round(p.cframe.pos[2] * 2))).size ? 0 : 2;   // bảng trưng bày trải theo trục x hay z
    const ys = [...new Set(ps.map((p) => Math.round(p.cframe.pos[1] * 2) / 2))].sort((a, b) => b - a);   // hàng: trên → dưới
    const xs = [...new Set(ps.map((p) => Math.round(p.cframe.pos[tx] * 2) / 2))].sort((a, b) => b - a);   // cột: trái → phải (nhìn mặt Front)
    const o = ps.map((p) => ({ p, hang: ys.indexOf(Math.round(p.cframe.pos[1] * 2) / 2), cot: xs.indexOf(Math.round(p.cframe.pos[tx] * 2) / 2) }))
      .sort((a, b) => a.hang - b.hang || a.cot - b.cot);
    const p2 = (n) => String(n + 1).padStart(2, '0');
    o.forEach((x, i) => {
      let ma;
      if (tt === 'e') ma = x.hang === 0 ? `ex${p2(x.cot)}` : `e${p2(x.cot)}-${HUONG[x.hang - 1]}`;
      else if (tt === 's') ma = `s${x.hang + 1}-${x.cot + 1}`;
      else ma = tt + p2(i);
      ra.push({ ma, nhom: tt, hang: x.hang, cot: x.cot, id: x.p.decals[0].texture });
    });
  }
  return ra;
}
/** Bảng xem từng nhóm (ô có nhãn mã) → output/face-pack/<nhóm>.png */
async function cmdBang(id) {
  const sharp = (await import('sharp')).default;
  const dir = path.join(ROOT, '.cache', 'roblox', id), out = path.join(ROOT, 'output', 'face-pack');
  fs.mkdirSync(out, { recursive: true });
  const ds = phanLoai(JSON.parse(fs.readFileSync(path.join(dir, 'dump-full.json'), 'utf8')).parts);
  fs.writeFileSync(path.join(dir, 'bo-phan.json'), JSON.stringify(ds, null, 1));
  const O = 150, NH = 20;
  for (const [, tt] of NHOM) {
    const g = ds.filter((x) => x.nhom === tt); if (!g.length) continue;
    const C = Math.max(...g.map((x) => x.cot)) + 1, R = Math.max(...g.map((x) => x.hang)) + 1;
    const lop = [];
    for (const x of g) {
      const f = path.join(dir, 'anh', x.id + '.png'); if (!fs.existsSync(f)) continue;
      lop.push({ input: await sharp(f).resize(O, O).png().toBuffer(), left: x.cot * O, top: x.hang * (O + NH) + NH });
    }
    const chu = g.map((x) => `<text x="${x.cot * O + O / 2}" y="${x.hang * (O + NH) + 15}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#111">${x.ma}</text>`).join('');
    lop.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${C * O}" height="${R * (O + NH)}">${chu}</svg>`), left: 0, top: 0 });
    await sharp({ create: { width: C * O, height: R * (O + NH), channels: 3, background: '#e8b98f' } }).composite(lop).png().toFile(path.join(out, `nhom-${tt}.png`));
    console.log(`nhom-${tt}.png: ${g.length} ô (${C}×${R})`);
  }
}

/** Ghép từng biểu cảm theo assets/faces/altiwyre/map.json (mảng `lop` = mã bộ phận, vẽ từ dưới lên) → NN_tên.png 512²;
 *  kèm chép mọi bộ phận (500², PNG bảng màu) vào assets/faces/altiwyre/parts/ để chọn lại sau. */
async function cmdGhep(id, { chiMat = false } = {}) {
  const sharp = (await import('sharp')).default;
  const dir = path.join(ROOT, '.cache', 'roblox', id), dich = path.join(ROOT, 'assets', 'faces', 'altiwyre'), dP = path.join(dich, 'parts');
  fs.mkdirSync(dP, { recursive: true });
  const ds = phanLoai(JSON.parse(fs.readFileSync(path.join(dir, 'dump-full.json'), 'utf8')).parts);
  const theoMa = Object.fromEntries(ds.map((x) => [x.ma, x]));
  const goc = (ma) => { const x = theoMa[ma]; if (!x) throw new Error('không có bộ phận ' + ma); return path.join(dir, 'anh', x.id + '.png'); };
  if (!chiMat) {
    let n = 0;
    for (const x of ds) { const f = goc(x.ma); if (!fs.existsSync(f)) continue; await sharp(f).resize(500, 500).png({ palette: true, quality: 90, effort: 10 }).toFile(path.join(dP, x.ma + '.png')); n++; }
    fs.writeFileSync(path.join(dich, 'parts.json'), JSON.stringify(ds.map(({ ma, nhom, hang, cot, id: anh }) => ({ ma, nhom, hang, cot, robloxId: anh }))) + '\n');
    console.log(`parts/: ${n} bộ phận`);
  }
  const map = JSON.parse(fs.readFileSync(path.join(dich, 'map.json'), 'utf8'));
  let k = 0;
  for (const [ten, m] of Object.entries(map.map)) {
    const lop = [];
    for (const ma of m.lop) lop.push({ input: await sharp(goc(ma)).resize(1000, 1000).png().toBuffer() });
    const b = await sharp({ create: { width: 1000, height: 1000, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(lop).png().toBuffer();
    await sharp(b).resize(512, 512).png({ palette: true, quality: 95, effort: 10 }).toFile(path.join(dich, ten + '.png')); k++;
  }
  console.log(`ghép ${k} biểu cảm → assets/faces/altiwyre/`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, id = MAC_DINH] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  if (cmd === 'tai') await cmdTai(id);
  else if (cmd === 'ke') cmdKe(id);
  else if (cmd === 'bang') await cmdBang(id);
  else if (cmd === 'ghep') await cmdGhep(id, { chiMat: process.argv.includes('--chi-mat') });
  else { console.log('cách dùng: node tools/face-pack.mjs tai|ke [id]'); process.exit(cmd ? 1 : 0); }
}
