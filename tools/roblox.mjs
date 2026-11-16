#!/usr/bin/env node
// roblox.mjs — tìm mẫu MIỄN PHÍ trong Roblox Creator Store và tải về thành MỘT file GLB (không cần Roblox Studio).
//   node tools/roblox.mjs tim "teddy bear" [--so 20] [--tam-giac-max 20000] [--co-script] [--json]
//   node tools/roblox.mjs tim "teddy bear" --ung-vien output/roblox/ung-vien.json   (file ứng viên + ảnh xem trước cho trang duyệt)
//   node tools/roblox.mjs xem <id|link>                                          (đếm part / mesh / ảnh vân / Union, 1 request)
//   node tools/roblox.mjs tai <id|link> [--ra output/roblox/glb/roblox-<id>.glb] [--toi-da-request 40] [--anh-max 512]
//   node tools/roblox.mjs tai <id> --nhan-vat "<path>"     (chỉ ghép một nhân vật của pack, dựng thẳng ở gốc; path lấy từ `xem`)
//   node tools/roblox.mjs tai <id> --tach                  (pack nhiều nhân vật / nhiều Model con → mỗi cái một GLB: <ra>-<tên>.glb)
//   Mạng: 429/5xx thử lại 3 lần (0,5 s · 1,5 s · 4 s) ở cả bước lấy location lẫn CDN; mesh + ảnh tải song song (--song-song N, mặc định 6).
//   node tools/roblox.mjs anh <id|link> [--ra f.png]        (ảnh áo/quần/mặt giữ alpha → output/roblox/anh/; id asset bọc ngoài tự gỡ)
// Diện mạo nhân vật (R6/R15): .cache/roblox/<id>/dump.json key `nhanVat` (rigType, bodyColors, shirt, pants, tshirt, accessories, attachments…)
// Đưa vào kho + manifest: node tools/nhap-model.mjs nhap roblox:<id> --ten <tên> --loai <loại>
// Khoá ROBLOX_API_KEY đọc từ .env.local, chỉ gửi qua header x-api-key; KHÔNG bao giờ in ra / ghi lại / đưa vào URL.
// Cache: .cache/roblox/<id>/ (model, mesh, ảnh, nguon.json). Không tự sửa assets/manifest.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { docRbx, doiClip } from './rbx-anim.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://apis.roblox.com';

// ---------- .env.local ----------
export function docEnv(file = path.join(ROOT, '.env.local')) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const l of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !l.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}
const ENV = docEnv();
const KHOA = () => ENV.ROBLOX_API_KEY || process.env.ROBLOX_API_KEY || '';

/** Che khoá (nếu có) trong mọi chuỗi trước khi in. */
export function che(s, khoa = KHOA()) {
  const t = String(s);
  return khoa && khoa.length >= 8 ? t.split(khoa).join('***') : t;
}
const loi = (m) => { console.error('LOI: ' + che(m)); process.exit(1); };
const in_ = (...a) => console.log(che(a.join(' ')));

// ---------- tách id ----------
export function layId(s) {
  const t = String(s ?? '').trim();
  if (/^\d{3,}$/.test(t)) return t;
  let m = t.match(/rbxassetid:\/\/(\d+)/i) || t.match(/create\.roblox\.com\/(?:store|marketplace)\/asset\/(\d+)/i)
    || t.match(/roblox\.com\/(?:library|catalog|asset)\/(\d+)/i) || t.match(/[?&]id=(\d+)/i);
  return m ? m[1] : null;
}

// ---------- tìm kiếm ----------
const gia = (a) => {
  const q = a?.creatorStoreProduct?.purchasePrice?.quantity;
  if (!q) return null;
  return (q.significand ?? 0) * 10 ** (q.exponent ?? 0);
};
export function ketQuaTim(json, { coScript = false, tamGiacMax = Infinity } = {}) {
  const ra = [];
  for (const it of json?.creatorStoreAssets || []) {
    const a = it.asset || {};
    if (gia(it) !== 0) continue;                       // chỉ mẫu miễn phí (significand 0)
    const soScript = a.instanceCounts?.script ?? a.scriptCount ?? 0;
    const coSc = !!a.hasScripts || soScript > 0;
    if (coSc && !coScript) continue;
    const tg = a.objectMeshSummary?.triangles ?? null;
    if (tg !== null && tg > tamGiacMax) continue;
    const v = it.voting || {};
    ra.push({
      id: String(a.id), ten: a.name || '', tacGia: it.creator?.name || '', tamGiac: tg,
      meshPart: a.instanceCounts?.meshPart ?? 0, script: soScript,
      thich: v.voteCount ? Math.round((v.upVotePercent ?? 0) * (v.upVotePercent <= 1 ? 100 : 1)) : null,
      link: `https://create.roblox.com/store/asset/${a.id}`,
    });
  }
  return ra;
}
export function dinhDangBang(rows) {
  const cot = ['id', 'tên', 'tác giả', 'tam giác', 'meshPart', 'script', '% thích', 'link'];
  const dong = rows.map((r) => [r.id, r.ten.slice(0, 34), r.tacGia.slice(0, 18), r.tamGiac ?? '?', r.meshPart, r.script,
    r.thich === null ? '?' : r.thich + '%', r.link]);
  const w = cot.map((c, i) => Math.max(c.length, ...dong.map((d) => String(d[i]).length)));
  const fmt = (d) => d.map((x, i) => String(x).padEnd(w[i])).join('  ').trimEnd();
  return [fmt(cot), ...dong.map(fmt)].join('\n');
}

// ---------- mạng ----------
let soRequest = 0, tranRequest = Infinity;            // đếm request Open Cloud của lần chạy này (--toi-da-request)
export const demRequest = () => soRequest;
export const GIAN_THU_LAI = [500, 1500, 4000];        // ms chờ trước lần thử lại 1, 2, 3 (429 / 5xx / lỗi mạng)
const nguMs = (ms) => new Promise((s) => setTimeout(s, ms));
/** Gọi `goi()` (→ Response); 429, 5xx hoặc lỗi mạng thì chờ rồi gọi lại theo `gian`. Hết lượt: trả Response cuối (hoặc ném lỗi mạng). */
export async function thuLai(goi, { gian = GIAN_THU_LAI, ngu = nguMs, khi429 } = {}) {
  for (let i = 0; ; i++) {
    let r = null, err = null;
    try { r = await goi(); } catch (e) { if (e.khongThuLai) throw e; err = e; }
    if (r && r.status === 429) khi429?.();
    if (r && r.status !== 429 && r.status < 500) return r;
    if (i >= gian.length) { if (err) throw new Error('lỗi mạng: ' + (err.cause?.code || err.message)); return r; }
    await ngu(gian[i]);
  }
}
const soLan = (o) => (o.gian || GIAN_THU_LAI).length + 1;
const ban = (st) => st === 429 || st >= 500;
/** Gọi Open Cloud kèm khoá (chỉ ở header). o: { fetch, khoa, gian, ngu, khi429 } — để test bằng fetch giả. */
async function hoiApi(url, opts = {}, o = {}) {
  const khoa = o.khoa || KHOA();
  if (!khoa) loi('thiếu ROBLOX_API_KEY trong .env.local');
  return thuLai(() => {
    if (soRequest >= tranRequest) throw Object.assign(new Error(`đã dùng hết ${tranRequest} request của lần chạy này (tăng bằng --toi-da-request N)`), { khongThuLai: true });
    soRequest++;
    return (o.fetch || fetch)(url, { ...opts, headers: { 'x-api-key': khoa, ...(opts.headers || {}) } });
  }, o);
}
/** Chạy `viec(x, i, giam)` cho mọi phần tử, tối đa `tran` việc cùng lúc; việc nào gọi `giam()` (gặp 429) thì trần giảm một nửa (≥ 1).
 *  Trả mảng cùng thứ tự: { ok: true, v } | { ok: false, loi }, kèm .dinh (số việc cùng lúc cao nhất) và .tranCuoi. */
export async function songSong(ds, viec, { tran = 6 } = {}) {
  const st = { tran: Math.max(1, Math.floor(tran) || 1), dang: 0, dinh: 0 };
  const giam = () => { st.tran = Math.max(1, Math.floor(st.tran / 2)); };
  const kq = new Array(ds.length); let i = 0;
  await new Promise((xong) => {
    const tiep = () => {
      if (i >= ds.length && st.dang === 0) return xong();
      while (st.dang < st.tran && i < ds.length) {
        const k = i++; st.dang++; st.dinh = Math.max(st.dinh, st.dang);
        Promise.resolve().then(() => viec(ds[k], k, giam)).then((v) => { kq[k] = { ok: true, v }; }, (e) => { kq[k] = { ok: false, loi: e }; })
          .finally(() => { st.dang--; tiep(); });
      }
    };
    tiep();
  });
  kq.dinh = st.dinh; kq.tranCuoi = st.tran;
  return kq;
}

async function cmdTim(a) {
  const tu = a._.join(' ').trim();
  if (!tu) loi('cách dùng: tim "<từ khoá>" [--so 20] [--tam-giac-max N] [--co-script] [--json]');
  const so = Number(a.so) > 0 ? Number(a.so) : 20;
  const tgMax = a['tam-giac-max'] ? Number(a['tam-giac-max']) : Infinity;
  const ra = await timMau(tu, { so, tamGiacMax: tgMax, coScript: !!a['co-script'] });
  if (a['ung-vien'] && a['ung-vien'] !== true) {       // ghi file ứng viên cho trang duyệt (kèm ảnh xem trước)
    const anh = await taiAnhXemTruoc(ra.map((x) => x.id));
    const khe = String(a.khe && a.khe !== true ? a.khe : tu.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'roblox');
    const f = path.resolve(ROOT, String(a['ung-vien']));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify({ nhomId: `roblox-${khe}`, ten: `Mẫu Roblox: ${tu}`, mota: 'Ứng viên từ Roblox Creator Store (miễn phí). Chọn xong: node tools/nhap-model.mjs nhap roblox:<id> --ten <tên> --loai <loại>.',
      khe: [{ id: khe, ten: a.ten && a.ten !== true ? String(a.ten) : tu, phu: '', ungVien: ungVienDuyet(ra, anh) }] }, null, 1) + '\n');
    in_(`Đã ghi ${ra.length} ứng viên (${Object.keys(anh).length} ảnh xem trước) vào ${path.relative(ROOT, f)} — nạp: node tools/duyet.mjs <ep> them-ung-vien <số đợt> ${path.relative(ROOT, f)}`);
  }
  if (a.json) { console.log(che(JSON.stringify(ra, null, 2))); return; }
  if (!ra.length) { in_('Không có mẫu miễn phí phù hợp (thử bỏ --tam-giac-max hoặc thêm --co-script).'); return; }
  in_(dinhDangBang(ra));
}

// ---------- tải ----------
/** Tải một asset: hỏi `location` (có khoá) rồi tải từ CDN (không khoá); cả hai bước đều thử lại khi 429/5xx. Lỗi luôn kèm id. */
export async function taiAsset(id, o = {}) {
  let r;
  try { r = await hoiApi(`${API}/asset-delivery-api/v1/assetId/${id}`, {}, o); } catch (e) { throw new Error(`asset ${id}: ${e.message}`); }
  if (!r.ok) throw new Error(`asset ${id}: HTTP ${r.status}` + (ban(r.status) ? ` sau ${soLan(o)} lần thử` : ''));
  const j = await r.json();
  const loc = j.location || j.locations?.[0]?.location;
  if (!loc) throw new Error(`asset ${id}: ` + (j.errors?.[0] ? `Roblox từ chối (${j.errors[0].code}: ${j.errors[0].message}) — asset riêng tư hoặc chưa được duyệt, Open Cloud không tải được` : 'không có location'));
  let c;
  try { c = await thuLai(() => (o.fetch || fetch)(loc), o); } catch (e) { throw new Error(`asset ${id}: CDN ${e.message}`); }   // CDN: không gửi khoá
  if (!c.ok) throw new Error(`asset ${id}: CDN HTTP ${c.status}` + (ban(c.status) ? ` sau ${soLan(o)} lần thử` : ''));
  return Buffer.from(await c.arrayBuffer());
}
export function loaiAnh(b) {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}
async function taiAnh(id, dir, o = {}) {
  for (const e of ['png', 'jpg', 'webp']) { const f = path.join(dir, `${id}.${e}`); if (fs.existsSync(f)) return f; }
  let b = await taiAsset(id, o);
  let e = loaiAnh(b);
  if (!e) {                                            // asset bọc ngoài (Decal, Shirt, Pants, T-Shirt…): lấy id ảnh bên trong
    const trong = idAnhTrong(b, dir, id);
    if (trong) { b = await taiAsset(trong, o); e = loaiAnh(b); }
  }
  if (!e) throw new Error(`ảnh ${id}: không nhận ra định dạng`);
  const f = path.join(dir, `${id}.${e}`); fs.writeFileSync(f, b); return f;
}

/** Asset bọc ngoài → id ảnh bên trong. XML: thẻ <url>; nhị phân (rbxm): đọc bằng `sky-extract dump` (key lienKet). */
export function chonIdAnh(lienKet) {
  const uu = ['ShirtTemplate', 'PantsTemplate', 'Graphic', 'Texture', 'TextureID', 'TextureId', 'ColorMap'];
  const ds = (lienKet || []).filter((l) => l.id);
  return (ds.find((l) => uu.includes(l.prop)) || ds.find((l) => !/Mesh|Sound|Anim/i.test(l.prop)) || {}).id || null;
}
function idAnhTrong(b, dir, id) {
  const dau = b.toString('latin1', 0, 8);
  if (!dau.startsWith('<roblox')) return null;
  if (!dau.startsWith('<roblox!')) {
    const m = b.toString('latin1', 0, 8000).match(/<url>[^<]*?(\d{4,})[^<]*<\/url>/);
    return m ? m[1] : null;
  }
  const f = path.join(dir, `_boc_${id}.rbxm`); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, b);
  const d = chay(SKY, ['dump', f]);
  try { return d.status === 0 ? chonIdAnh(JSON.parse(d.stdout).lienKet) : null; } catch { return null; } finally { fs.rmSync(f, { force: true }); }
}
async function cmdAnh(a) {
  const id = layId(a._[0]); if (!id) loi('cách dùng: anh <id|link> [--ra file.png]');
  tranRequest = Number(a['toi-da-request']) > 0 ? Number(a['toi-da-request']) : 5;
  const dA = path.join(ROOT, '.cache', 'roblox', '_anh'); fs.mkdirSync(dA, { recursive: true });
  const f = await taiAnh(id, dA), e = path.extname(f);
  let ra = a.ra && a.ra !== true ? path.resolve(ROOT, String(a.ra)) : path.join(ROOT, 'output', 'roblox', 'anh', `${id}${e}`);
  if (path.extname(ra).toLowerCase() !== e) ra = ra.replace(/\.[^.\\/]*$/, '') + e;      // giữ nguyên byte gốc (alpha còn nguyên) → đuôi theo định dạng thật
  fs.mkdirSync(path.dirname(ra), { recursive: true }); fs.copyFileSync(f, ra);
  const b = fs.readFileSync(ra);
  const kt = e === '.png' ? `${b.readUInt32BE(16)}×${b.readUInt32BE(20)}, ${[0, 0, 'RGB', 'bảng màu', 'xám+alpha', 0, 'RGBA'][b[25]] || 'xám'}` : e.slice(1);
  in_(`Đã ghi ${path.relative(ROOT, ra)} (${kt}, ${b.length} byte)`);
}

const SKY = path.join(ROOT, 'tools', 'sky-extract', 'bin', 'sky-extract.exe');
function chay(exe, args, opt = {}) { return spawnSync(exe, args, { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 600000, ...opt }); }

async function cmdTai(a) {
  const id = layId(a._[0]); if (!id) loi('cách dùng: tai <id|link> [--ra file.glb]');
  const ra = path.resolve(ROOT, String(a.ra && a.ra !== true ? a.ra : `output/roblox/glb/roblox-${id}.glb`));
  const dir = path.join(ROOT, '.cache', 'roblox', id);
  const dM = path.join(dir, 'mesh'), dA = path.join(dir, 'anh');
  for (const d of [dir, dM, dA, path.dirname(ra)]) fs.mkdirSync(d, { recursive: true });
  tranRequest = Number(a['toi-da-request']) > 0 ? Number(a['toi-da-request']) : 40;
  let parts = await layParts(id, dir);
  const nhanVat = parts.nhanVat || [];
  if (a.tach && a['nhan-vat']) loi('chỉ dùng một trong hai: --tach hoặc --nhan-vat');
  if (a['nhan-vat'] && a['nhan-vat'] !== true) {
    const nv = String(a['nhan-vat']), ds = parts.nhanVat.map((x) => x.path);
    parts = motNhanVat(parts, chonNhanVat(nhanVat, nv) || nv.replace(/#\d+$/, ''));
    if (!parts.length) loi(`không có nhân vật "${nv}" — trong model có: ${ds.join(' | ') || '(không có Model nào chứa Humanoid)'}`);
  }
  // 3. mesh + ảnh
  const meshIds = new Set(), imgIds = new Set(), canhBao = [];
  for (const p of parts) {
    if (p.meshId) meshIds.add(p.meshId);
    for (const s of p.specialMeshes) { if (s.meshId) meshIds.add(s.meshId); if (s.textureId) imgIds.add(s.textureId); }
    if (p.textureId) imgIds.add(p.textureId);
    if (p.colorMap) imgIds.add(p.colorMap);
    for (const d of p.decals || []) if (d.texture) imgIds.add(d.texture);
  }
  return taiTiep(a, id, ra, dir, dM, dA, parts, meshIds, imgIds, canhBao, nhanVat);
}
/** Tải file model (1 request, có cache) rồi đọc cây bằng sky-extract dump → danh sách BasePart. */
async function layParts(id, dir) {
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(SKY)) loi('thiếu ' + SKY);
  // 1. model
  let mf = ['rbxm', 'rbxmx'].map((e) => path.join(dir, `model.${e}`)).find((f) => fs.existsSync(f));
  if (!mf) {
    const b = await taiAsset(id);
    const dau = b.toString('latin1', 0, 16);
    if (!/^<roblox/.test(dau)) loi(`asset ${id} không phải model (đầu file: ${JSON.stringify(dau.slice(0, 12))})`);
    mf = path.join(dir, dau.startsWith('<roblox!') ? 'model.rbxm' : 'model.rbxmx'); fs.writeFileSync(mf, b);
  }
  // 2. dump
  const d = chay(SKY, ['dump', mf]);
  if (d.status !== 0) loi('sky-extract dump lỗi: ' + (d.stderr || '').slice(0, 300));
  const j = JSON.parse(d.stdout), parts = j.parts;
  fs.writeFileSync(path.join(dir, 'dump.json'), JSON.stringify({ parts, nhanVat: j.nhanVat || [] }, null, 1));
  parts.nhanVat = j.nhanVat || [];
  return parts;
}
/** Chỉ giữ các mảnh của một nhân vật và dựng thẳng (bỏ hướng xoay của HumanoidRootPart/Torso, gốc về tâm nó).
 *  nv: đường dẫn Model có Humanoid, hoặc một phần tử `nhanVat` của dump (có partRefs → tách đúng cả khi trùng đường dẫn). */
export function motNhanVat(parts, nv) {
  const duong = typeof nv === 'string' ? nv : nv.path;
  const refs = typeof nv === 'object' && nv.partRefs?.length ? new Set(nv.partRefs) : null;
  const ds = refs ? parts.filter((p) => refs.has(p.ref)) : parts.filter((p) => p.path === duong || p.path.startsWith(duong + '.'));
  const goc = ds.find((p) => p.path === duong && p.name === 'HumanoidRootPart') || ds.find((p) => p.path === duong && /^(Torso|LowerTorso|UpperTorso)$/.test(p.name));
  if (!goc) return ds;
  const R = goc.cframe.rot, t0 = goc.cframe.pos;                 // R0ᵀ·(x − t0), R0ᵀ·R
  const Tv = (v) => [0, 1, 2].map((i) => R[0][i] * v[0] + R[1][i] * v[1] + R[2][i] * v[2]);
  return ds.filter((p) => p !== goc || p.name !== 'HumanoidRootPart').map((p) => {
    const r = p.cframe.rot, cot = [0, 1, 2].map((c) => Tv([r[0][c], r[1][c], r[2][c]]));
    return { ...p, cframe: { pos: Tv(p.cframe.pos.map((x, i) => x - t0[i])), rot: [0, 1, 2].map((i) => [cot[0][i], cot[1][i], cot[2][i]]) } };
  });
}
/** Chọn nhân vật theo "--nhan-vat": đường dẫn, hoặc "đường dẫn#2" khi nhiều nhân vật trùng đường dẫn, hoặc số thứ tự "#3". */
export function chonNhanVat(nhanVat, spec) {
  const m = String(spec).match(/^(.*?)(?:#(\d+))?$/), duong = m[1], n = m[2] ? Number(m[2]) : 1;
  const ds = duong ? nhanVat.filter((x) => x.path === duong) : nhanVat;
  return ds[n - 1] || null;
}
/** Đếm loại mảnh + ảnh vân của một model (để chọn mẫu trước khi tải hết mesh). */
export function tomTatParts(parts) {
  const loai = {}, mesh = new Set(), anh = new Set(); let decal = 0, union = 0;
  for (const p of parts) {
    const k = p.class === 'Part' ? `Part/${p.shape}` : p.class; loai[k] = (loai[k] || 0) + 1;
    if (/Operation$/.test(p.class)) union++;
    if (p.meshId) mesh.add(p.meshId);
    for (const s of p.specialMeshes || []) { if (s.meshId) mesh.add(s.meshId); if (s.textureId) anh.add(s.textureId); }
    if (p.textureId) anh.add(p.textureId);
    if (p.colorMap) anh.add(p.colorMap);
    for (const d of p.decals || []) if (d.texture) { anh.add(d.texture); decal++; }
  }
  const csg = new Set(parts.map((p) => p.csg?.Content?.id).filter(Boolean));
  return { part: parts.length, loai, mesh: mesh.size, anh: anh.size, anhIds: [...anh], decal, union, request: 1 + mesh.size + anh.size + csg.size };
}
async function cmdXem(a) {
  const id = layId(a._[0]); if (!id) loi('cách dùng: xem <id|link>');
  const ps = await layParts(id, path.join(ROOT, '.cache', 'roblox', id));
  const t = tomTatParts(ps);
  if (a.json) { console.log(JSON.stringify({ id, ...t, nhanVat: ps.nhanVat })); return; }
  in_(`${id}: ${t.part} part — ${Object.entries(t.loai).map(([k, v]) => `${k}×${v}`).join(', ')}`);
  in_(`mesh: ${t.mesh} · ảnh vân: ${t.anh} (decal ${t.decal}) · Union: ${t.union} · tải đủ cần ~${t.request} request`);
  for (const n of ps.nhanVat) in_(`nhân vật "${n.path}": ${n.rigType === 1 ? 'R15' : n.rigType === 0 ? 'R6' : 'rig ?'} · áo ${n.shirt || '—'} · quần ${n.pants || '—'} · áo phông ${n.tshirt || '—'} · phụ kiện ${n.accessories.length}${n.bodyColors ? '' : ' · không có BodyColors'}`);
}
/** Chia một pack thành nhóm để xuất riêng: mỗi nhân vật (Model có Humanoid, dựng thẳng) một nhóm + phần còn lại;
 *  không có nhân vật thì mỗi Model con cấp một một nhóm. Trả [{ ten, slug, parts }]. */
export function tachNhom(parts, nhanVat = []) {
  const ra = [], dung = new Set();
  const slug = (t) => {
    const g = String(t).split('.').pop().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'nhom';
    let s2 = g, n = 2; while (dung.has(s2)) s2 = `${g}-${n++}`;
    dung.add(s2); return s2;
  };
  if (nhanVat.length) {
    const ngoai = nhanVat.filter((x) => !nhanVat.some((y) => y !== x && x.path.startsWith(y.path + '.')));   // bỏ nhân vật lồng trong nhân vật
    const daLay = new Set();
    for (const nv of ngoai) {
      const ps = motNhanVat(parts, nv); if (!ps.length) continue;
      for (const p of ps) daLay.add(p.ref);
      for (const r of nv.partRefs || []) daLay.add(r);
      const cung = ngoai.filter((x) => x.path === nv.path);
      ra.push({ ten: cung.length > 1 ? `${nv.path}#${cung.indexOf(nv) + 1}` : nv.path, slug: slug(nv.path), parts: ps });
    }
    const con = parts.filter((p) => !daLay.has(p.ref) && !(ngoai.some((nv) => !nv.partRefs && (p.path === nv.path || p.path.startsWith(nv.path + '.')))));
    if (con.length) ra.push({ ten: '(còn lại)', slug: slug('con-lai'), parts: con });
    return ra;
  }
  const nhom = new Map();
  for (const p of parts) { const k = p.path.split('.').slice(0, 2).join('.'); if (!nhom.has(k)) nhom.set(k, []); nhom.get(k).push(p); }
  for (const [k, ps] of nhom) ra.push({ ten: k.includes('.') ? k : `${k} (mảnh ở gốc)`, slug: slug(k.includes('.') ? k : 'goc'), parts: ps });
  return ra;
}
/** Ghép một danh sách mảnh thành một GLB bằng Blender headless → kết quả GHEP_JSON. */
function ghepBlender(dir, tenJson, parts, tn, ra, a, id, canhBao) {
  const exe = ENV.BLENDER || process.env.BLENDER;
  if (!exe || !fs.existsSync(exe)) loi('không thấy Blender: đặt BLENDER trong .env.local');
  const manifest = path.join(dir, tenJson);
  fs.writeFileSync(manifest, JSON.stringify({ parts, meshes: tn.meshes, images: tn.anh, csg: tn.csg, out: ra, ten: `roblox-${id}`, anhMax: Number(a['anh-max']) || 512, boManhLon: !!a['bo-manh-lon'], khongVan: !!a['khong-van'] }));
  const r = chay(exe, ['-b', '--factory-startup', '-P', path.join(ROOT, 'tools', 'blender', 'roblox_ghep.py'), '--', manifest]);
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/^GHEP_JSON (.*)$/m);
  if (/GHEP_LOI không có mảnh/.test(out) && canhBao.length) throw new Error(`không ghép được mảnh nào — ${canhBao.length} mesh/ảnh không tải được:\n  ` + canhBao.slice(0, 6).join('\n  '));
  if (r.status !== 0 || !m) throw new Error('Blender lỗi:\n' + out.split('\n').filter((l) => /Error|Traceback|GHEP_LOI|File "/.test(l)).slice(-12).join('\n') + (m ? '' : '\n' + out.slice(-500)));
  return JSON.parse(m[1]);
}
async function taiTiep(a, id, ra, dir, dM, dA, parts, meshIds, imgIds, canhBao, nhanVat = []) {
  const meshes = {}, anh = {}, csg = {};
  // UnionOperation…: lưới thật nằm ở asset CSG riêng (thuộc tính AssetId) → tải, rút MeshData bằng `sky-extract bin`
  for (const p of parts) {
    const c = p.csg?.Content?.id; if (!c || csg[c]) continue;
    try {
      const dC = path.join(dir, 'csg', c), f = path.join(dir, 'csg', `${c}.rbxm`);
      let bin = fs.existsSync(dC) ? fs.readdirSync(dC).find((x) => /_MeshData\.bin$/.test(x)) : null;
      if (!bin) {
        fs.mkdirSync(dC, { recursive: true });
        if (!fs.existsSync(f)) fs.writeFileSync(f, await taiAsset(c));
        const r = chay(SKY, ['bin', f, dC]);
        if (r.status !== 0) throw new Error((r.stderr || '').trim().slice(0, 200));
        bin = fs.readdirSync(dC).find((x) => /_MeshData\.bin$/.test(x));
      }
      if (!bin) throw new Error('asset CSG không có MeshData');
      csg[c] = path.join(dC, bin);
    } catch (e) { canhBao.push(`union ${p.name} (CSG ${c}): ${e.message}`); }
  }
  // mesh + ảnh: tải song song có trần (--song-song N, mặc định 6), gặp 429 thì trần tự giảm một nửa
  const viec = [...[...meshIds].map((x) => ({ loai: 'mesh', id: x })), ...[...imgIds].map((x) => ({ loai: 'ảnh', id: x }))];
  const kqTai = await songSong(viec, async (v, _k, giam) => {
    const o = { khi429: giam };
    if (v.loai === 'ảnh') return taiAnh(v.id, dA, o);
    const glb = path.join(dM, `${v.id}.glb`);
    if (!fs.existsSync(glb)) {
      const raw = path.join(dM, `${v.id}.mesh`);
      if (!fs.existsSync(raw)) fs.writeFileSync(raw, await taiAsset(v.id, o));
      const r = chay(SKY, ['mesh', raw, glb]);
      if (r.status !== 0) throw new Error((r.stderr || r.stdout || '').trim().slice(0, 200));
    }
    return glb;
  }, { tran: Number(a['song-song']) > 0 ? Number(a['song-song']) : 6 });
  kqTai.forEach((r, k) => {
    const v = viec[k];
    if (r.ok) (v.loai === 'mesh' ? meshes : anh)[v.id] = r.v; else canhBao.push(`${v.loai} ${v.id}: ${r.loi.message}`);
  });
  // 4. ghép bằng Blender (một GLB, hoặc --tach: mỗi nhân vật / Model con một GLB)
  const tn = { meshes, anh, csg };
  let kq, tach = null;
  try {
    if (a.tach) {
      const goc = ra.replace(/\.glb$/i, '');
      tach = [];
      for (const g of tachNhom(parts, nhanVat)) {
        const f = `${goc}-${g.slug}.glb`;
        try {
          const k = ghepBlender(dir, `ghep-${g.slug}.json`, g.parts, tn, f, a, id, []);
          tach.push({ ten: g.ten, glb: path.relative(ROOT, f).replace(/\\/g, '/'), part: g.parts.length, tamGiac: k.tamGiac, hopBao: k.hopBao.map((x) => +x.toFixed(3)), xapXi: k.boQua.map((b) => `${b.ten}: ${b.lyDo}`) });
        } catch (e) { tach.push({ ten: g.ten, glb: null, part: g.parts.length, loi: e.message.split('\n')[0] }); }
      }
      if (!tach.some((t) => t.glb)) throw new Error('--tach: không ghép được nhóm nào' + (canhBao.length ? ` (${canhBao.length} mesh/ảnh không tải được: ${canhBao[0]})` : ''));
      const ok = tach.filter((t) => t.glb);
      kq = { manh: ok.reduce((n, t) => n + t.part, 0), tamGiac: ok.reduce((n, t) => n + t.tamGiac, 0), hopBao: [0, 0, 0], boQua: [], union: 0, decal: 0, anh: Object.keys(anh).length };
    } else kq = ghepBlender(dir, 'ghep.json', parts, tn, ra, a, id, canhBao);
  } catch (e) { loi(e.message); }
  // 5. nguồn
  let tt = {};
  try { tt = await thongTin(id); } catch (e) { canhBao.push('không lấy được tên/tác giả: ' + e.message); }
  const nguon = { id, ten: a.ten || tt.ten || `Roblox ${id}`, tacGia: a['tac-gia'] || tt.tacGia || '', link: `https://create.roblox.com/store/asset/${id}`, giayPhep: GIAY_PHEP,
    ngayTai: new Date().toISOString().slice(0, 10), glb: path.relative(ROOT, ra).replace(/\\/g, '/'),
    tamGiac: kq.tamGiac, manh: kq.manh, hopBao: kq.hopBao.map((x) => +x.toFixed(3)), union: kq.union, decal: kq.decal, anh: kq.anh,
    xapXi: kq.boQua.map((b) => `${b.ten}: ${b.lyDo}`), manhLon: kq.manhLon || [], ...(tach ? { glb: null, tach } : {}) };
  fs.writeFileSync(path.join(dir, 'nguon.json'), JSON.stringify(nguon, null, 1));
  // tóm tắt
  const bb = kq.hopBao;
  if (tach) {
    in_(`Đã tách ${tach.filter((t) => t.glb).length}/${tach.length} nhóm (tổng ${kq.tamGiac} tam giác) · request Open Cloud: ${soRequest}`);
    for (const t of tach) in_(t.glb ? `  ${t.glb}  ←  ${t.ten} · ${t.part} part · ${t.tamGiac} tam giác · ${t.hopBao.map((x) => x.toFixed(2)).join(' × ')} stud${t.xapXi.length ? ` · xấp xỉ ${t.xapXi.length}` : ''}` : `  (LỖI) ${t.ten}: ${t.loi}`);
  } else {
    in_(`Đã ghi ${path.relative(ROOT, ra)}`);
    in_(`mảnh: ${kq.manh} (trong ${parts.length} part) · tam giác: ${kq.tamGiac} · hộp bao (stud): ${bb.map((x) => x.toFixed(2)).join(' × ')}`);
    in_(`ảnh vân: ${kq.anh} (decal ${kq.decal}) · Union đọc được lưới thật: ${kq.union} · request Open Cloud: ${soRequest}`);
  }
  if (a.json) console.log(JSON.stringify(nguon));
  for (const m of kq.manhLon || []) in_(`⚠ mảnh lớn bất thường: ${m.path ? m.path + '.' : ''}${m.ten} hộp bao ${m.hopBao.join('×')} > 2× phần còn lại ${m.phanConLai.join('×')} stud${a['bo-manh-lon'] ? ' — ĐÃ BỎ (--bo-manh-lon)' : ' — giữ nguyên; thêm --bo-manh-lon để bỏ'}`);
  const bo = [...kq.boQua, ...canhBao.map((c) => ({ ten: c, lyDo: 'cảnh báo tải' }))];
  if (bo.length) { in_(`bỏ qua / xấp xỉ ${bo.length}:`); for (const b of bo.slice(0, 20)) in_(`  - ${b.ten}: ${b.lyDo}`); if (bo.length > 20) in_(`  … và ${bo.length - 20} mục nữa`); }
  in_(`nguồn: .cache/roblox/${id}/nguon.json (chưa vào kho: node tools/nhap-model.mjs nhap roblox:${id} --ten <tên> --loai <loại>)`);
}
export const GIAY_PHEP = 'Roblox Creator Store';
/** Tên, tác giả, tam giác của một mẫu: đọc .cache/roblox/<id>/tim.json, chưa có thì hỏi Open Cloud (1 request) rồi lưu lại. */
export async function thongTin(id) {
  const f = path.join(ROOT, '.cache', 'roblox', String(id), 'tim.json');
  if (fs.existsSync(f)) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (j.ten && j.tacGia) return j; }
  const r = await hoiApi(`${API}/toolbox-service/v2/assets/${id}`);
  if (!r.ok) throw new Error(`thông tin mẫu ${id}: HTTP ${r.status}`);
  const x = ketQuaTim({ creatorStoreAssets: [await r.json()] }, { coScript: true })[0];
  if (!x) throw new Error(`mẫu ${id} không miễn phí hoặc không đọc được`);
  const j = { ten: x.ten, tacGia: x.tacGia, tamGiac: x.tamGiac };
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(j));
  return j;
}
/** Ảnh xem trước của Creator Store (thumbnails.roblox.com, công khai, KHÔNG gửi khoá) → .cache/roblox/<id>/thumb.png. Trả {id: đường dẫn tương đối}. */
export async function taiAnhXemTruoc(ids, { co = '420x420' } = {}) {
  const ra = {}, thieu = [];
  for (const id of ids) { const f = path.join(ROOT, '.cache', 'roblox', String(id), 'thumb.png'); if (fs.existsSync(f)) ra[id] = `.cache/roblox/${id}/thumb.png`; else thieu.push(String(id)); }
  for (let i = 0; i < thieu.length; i += 50) {
    try {
      const r = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${thieu.slice(i, i + 50).join(',')}&size=${co}&format=Png`);
      if (!r.ok) continue;
      for (const d of (await r.json()).data || []) {
        if (d.state !== 'Completed' || !d.imageUrl) continue;
        const c = await fetch(d.imageUrl); if (!c.ok) continue;
        const dir = path.join(ROOT, '.cache', 'roblox', String(d.targetId)); fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'thumb.png'), Buffer.from(await c.arrayBuffer()));
        ra[String(d.targetId)] = `.cache/roblox/${d.targetId}/thumb.png`;
      }
    } catch { /* thiếu ảnh xem trước không chặn việc tìm */ }
  }
  return ra;
}
/** Tìm mẫu miễn phí (dùng chung cho CLI và tools/nhap-model.mjs). */
export async function timMau(tu, { so = 20, tamGiacMax = Infinity, coScript = false, loai = 'Model' } = {}) {
  const rows = []; let token = '', nReq = 0;
  while (rows.length < so && nReq < 4) {
    const q = new URLSearchParams({ searchCategoryType: loai, query: tu, maxPageSize: String(Math.min(100, Math.max(so * 2, 30))) });
    if (token) q.set('pageToken', token);
    const r = await hoiApi(`${API}/toolbox-service/v2/assets:search?${q}`); nReq++;
    if (!r.ok) throw new Error(`tìm kiếm lỗi HTTP ${r.status}`);
    const j = await r.json();
    for (const x of ketQuaTim(j, { coScript, tamGiacMax })) if (!rows.some((y) => y.id === x.id)) rows.push(x);
    token = j.nextPageToken || ''; if (!token) break;
  }
  const ra = rows.slice(0, so);
  for (const x of ra) { try { const d = path.join(ROOT, '.cache', 'roblox', x.id); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'tim.json'), JSON.stringify({ ten: x.ten, tacGia: x.tacGia, tamGiac: x.tamGiac })); } catch {} }
  return ra;
}
/** Kết quả tìm → ứng viên cho trang duyệt (tools/duyet.mjs them-ung-vien). */
export function ungVienDuyet(rows, anh = {}) {
  return rows.map((r) => ({ id: `roblox:${r.id}`, ten: r.ten, anh: anh[r.id] ? [anh[r.id]] : [], link: r.link, linkTen: 'Creator Store',
    nguon: 'roblox', tacGia: r.tacGia, giayPhep: GIAY_PHEP, tamGiac: r.tamGiac ?? undefined, phu: r.thich === null || r.thich === undefined ? '' : `${r.thich}% thích` }));
}

// ---------- anim: KeyframeSequence → clip JSON R6 (engine/anim-rbx.js) ----------
export const slugAnim = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const khoaTen = (s) => String(s).trim().toLowerCase();
/** Thêm/thay một dòng trong assets/manifest.json (giữ kiểu xuống dòng + thụt lề của file). */
export function ghiManifestAnim(entry, file = path.join(ROOT, 'assets', 'manifest.json')) {
  const goc = fs.readFileSync(file, 'utf8'), eol = goc.includes('\r\n') ? '\r\n' : '\n', txt = goc.replace(/\r\n/g, '\n'), arr = JSON.parse(txt);
  const i = arr.findIndex((e) => e.id === entry.id); if (i >= 0) arr[i] = entry; else arr.push(entry);
  const o = JSON.stringify(arr, null, 1) + (txt.endsWith('\n') ? '\n' : ''); fs.writeFileSync(file, eol === '\n' ? o : o.replace(/\n/g, eol));
}
function ghiCreditsAnim(ten, id, tieuDe, tacGia, file = path.join(ROOT, 'assets', 'nhap', 'CREDITS.md')) {
  const dau = `- [anim/${ten}]`, dong = `${dau} "${tieuDe}" (https://create.roblox.com/store/asset/${id}) by ${tacGia}, licensed under Roblox Creator Store (https://create.roblox.com/store). KeyframeSequence tải theo id, đổi sang khớp R6 (tools/rbx-anim.mjs); không chép lại nội dung ngoài clip JSON.`;
  const ls = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [], k = ls.findIndex((l) => l.startsWith(dau));
  if (k >= 0) ls[k] = dong; else { while (ls.length && ls.at(-1) === '') ls.pop(); ls.push(dong, ''); }
  fs.writeFileSync(file, ls.join('\n'));
}
/** Ghi một clip + manifest + credits. */
function luuClip(clip, ten, id, nguonMo, tacGia, ra) {
  fs.mkdirSync(ra, { recursive: true });
  const f = path.join(ra, ten + '.json'); fs.writeFileSync(f, JSON.stringify(clip));
  const names = fs.readdirSync(ra).filter((x) => x.endsWith('.json') && x !== 'index.json').map((x) => x.slice(0, -5)).sort();   // index cho trình duyệt (không liệt kê thư mục được)
  fs.writeFileSync(path.join(ra, 'index.json'), JSON.stringify({ names }));
  const tg = tacGia || (/Storflin6564/.test(nguonMo || '') ? 'Storflin6564' : /default R6 Animate/.test(nguonMo || '') ? 'Roblox' : 'Roblox Creator Store');
  ghiManifestAnim({ id: `anim/${ten}`, src: `assets/nhap/anims/${ten}.json`, source: `create.roblox.com/store/asset/${id}`, license: 'Roblox Creator Store', credit: `“${clip.ten}” by ${tg} (https://create.roblox.com/store/asset/${id}), Roblox Creator Store`, title: clip.ten, author: tg, loai: 'animation', dur: clip.dur, loop: clip.loop, keys: clip.keys.length });
  ghiCreditsAnim(ten, id, clip.ten, tg);
  return f;
}
async function cmdAnim(a) {
  tranRequest = Number(a['toi-da-request']) > 0 ? Number(a['toi-da-request']) : 40;
  const ra = path.resolve(ROOT, String(a.ra && a.ra !== true ? a.ra : 'assets/nhap/anims'));
  const cache = path.join(ROOT, '.cache', 'roblox', 'anim'); fs.mkdirSync(cache, { recursive: true });
  const lay = async (id) => { const f = path.join(cache, id + '.bin'); if (fs.existsSync(f)) return fs.readFileSync(f); const b = await taiAsset(id); fs.writeFileSync(f, b); return b; };
  if (a.bo && a.bo !== true) {                          // --bo <thư-mục manifest/anims của nocodehack>: mỗi nhóm có meta.json {id,name,source,loop}
    const goc = path.resolve(ROOT, String(a.bo)), metas = fs.readdirSync(goc).filter((d) => fs.existsSync(path.join(goc, d, 'meta.json'))).map((d) => ({ nhom: d, ...JSON.parse(fs.readFileSync(path.join(goc, d, 'meta.json'), 'utf8')) }));
    const loc = a.chon ? new Set(String(a.chon).split(',').map(khoaTen)) : null, kq = [];
    for (const m of metas) {
      if (loc && !loc.has(khoaTen(m.nhom)) && !loc.has(khoaTen(m.name))) continue;
      try {
        const seqs = docRbx(await lay(String(m.id))), s = seqs.length === 1 ? seqs[0] : seqs.find((x) => khoaTen(x.ten) === khoaTen(m.name));
        if (!s) throw new Error(`không thấy "${m.name}" trong ${seqs.length} KeyframeSequence của ${m.id}`);
        const clip = doiClip(s, { id: String(m.id), ten: m.name, loop: typeof m.loop === 'boolean' ? m.loop : s.loop });
        const ten = slugAnim(m.nhom); const f = luuClip(clip, ten, m.id, m.source, '', ra);
        kq.push(`OK  ${ten.padEnd(10)} id=${m.id} ${clip.keys.length} khung ${clip.dur}s ${clip.loop ? 'lặp' : 'một lần'}${clip.canhBao.length ? ' ⚠ ' + clip.canhBao.join(';') : ''}`); void f;
      } catch (e) { kq.push(`LOI ${m.nhom}: ${che(e.message)}`); }
    }
    in_(kq.join('\n')); return;
  }
  const id = layId(a._[0]); if (!id) loi('cách dùng: anim <id|link> [--liet-ke] [--chon "Tên"] [--ten ten-file] | anim --bo <thư mục manifest/anims> [--chon a,b]');
  const seqs = docRbx(await lay(id));
  if (a['liet-ke'] || (seqs.length > 1 && !a.chon)) { in_(`asset ${id}: ${seqs.length} KeyframeSequence\n` + seqs.map((s) => `  ${s.ten}  (${s.keys.length} khung, ${s.keys.at(-1)?.t ?? 0}s, ${s.loop ? 'lặp' : 'một lần'})`).join('\n')); return; }
  const s = seqs.length === 1 ? seqs[0] : seqs.find((x) => khoaTen(x.ten) === khoaTen(a.chon)); if (!s) loi(`không thấy "${a.chon}"`);
  const ten = slugAnim(a.ten && a.ten !== true ? a.ten : s.ten), clip = doiClip(s, { id, ten: s.ten });
  const f = luuClip(clip, ten, id, '', '', ra);
  in_(`OK ${path.relative(ROOT, f)}  ${clip.keys.length} khung ${clip.dur}s ${clip.loop ? 'lặp' : 'một lần'} khớp: ${clip.khop.join(',')}${clip.canhBao.length ? '\n⚠ ' + clip.canhBao.join(';') : ''}`);
}

// ---------- CLI ----------
export function phanTich(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2), n = argv[i + 1];
      if (n !== undefined && !n.startsWith('--') && !['co-script', 'json', 'tach', 'liet-ke', 'bo-manh-lon', 'khong-van'].includes(k)) { a[k] = n; i++; } else a[k] = true;
    } else a._.push(t);
  }
  return a;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [lenh, ...rest] = process.argv.slice(2);
  const a = phanTich(rest);
  try {
    if (lenh === 'tim') await cmdTim(a);
    else if (lenh === 'tai') await cmdTai(a);
    else if (lenh === 'xem') await cmdXem(a);
    else if (lenh === 'anh') await cmdAnh(a);
    else if (lenh === 'anim') await cmdAnim(a);
    else console.log('Cách dùng:\n  node tools/roblox.mjs tim "<từ khoá>" [--so 20] [--tam-giac-max N] [--co-script] [--json] [--ung-vien file.json [--khe id]]\n  node tools/roblox.mjs xem <id|link>      (đếm part/mesh/ảnh vân/Union, chỉ tốn 1 request)\n  node tools/roblox.mjs tai <id|link> [--ra file.glb] [--ten "tên"] [--toi-da-request 40] [--anh-max 512] [--json] [--song-song 6] [--nhan-vat "<path>" | --tach]\n  node tools/roblox.mjs anim <id|link> [--liet-ke] [--chon "Tên"] [--ten ten-file]   (animation Roblox → assets/nhap/anims/<ten>.json)\n  node tools/roblox.mjs anim --bo <thư mục manifest/anims> [--chon agree,wave]\n  node tools/roblox.mjs anh <id|link> [--ra file.png]   (tải ảnh giữ nguyên alpha; id Shirt/Pants/Decal bọc ngoài tự gỡ)');
  } catch (e) { loi(e.message || e); }
}
