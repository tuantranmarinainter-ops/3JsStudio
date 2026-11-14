#!/usr/bin/env node
// roblox.mjs — tìm mẫu MIỄN PHÍ trong Roblox Creator Store và tải về thành MỘT file GLB (không cần Roblox Studio).
//   node tools/roblox.mjs tim "teddy bear" [--so 20] [--tam-giac-max 20000] [--co-script] [--json]
//   node tools/roblox.mjs tim "teddy bear" --ung-vien output/roblox/ung-vien.json   (file ứng viên + ảnh xem trước cho trang duyệt)
//   node tools/roblox.mjs xem <id|link>                                          (đếm part / mesh / ảnh vân / Union, 1 request)
//   node tools/roblox.mjs tai <id|link> [--ra output/roblox/glb/roblox-<id>.glb] [--toi-da-request 40] [--anh-max 512]
// Đưa vào kho + manifest: node tools/nhap-model.mjs nhap roblox:<id> --ten <tên> --loai <loại>
// Khoá ROBLOX_API_KEY đọc từ .env.local, chỉ gửi qua header x-api-key; KHÔNG bao giờ in ra / ghi lại / đưa vào URL.
// Cache: .cache/roblox/<id>/ (model, mesh, ảnh, nguon.json). Không tự sửa assets/manifest.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

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
async function hoiApi(url, opts = {}, thu = 3) {
  const khoa = KHOA();
  if (!khoa) loi('thiếu ROBLOX_API_KEY trong .env.local');
  for (let i = 0; i < thu; i++) {
    if (soRequest >= tranRequest) throw new Error(`đã dùng hết ${tranRequest} request của lần chạy này (tăng bằng --toi-da-request N)`);
    soRequest++;
    let r;
    try { r = await fetch(url, { ...opts, headers: { 'x-api-key': khoa, ...(opts.headers || {}) } }); }
    catch (e) { if (i === thu - 1) loi('lỗi mạng: ' + (e.cause?.code || e.message)); await new Promise((s) => setTimeout(s, 1000 * (i + 1))); continue; }
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 1500 * (i + 1))); continue; }
    return r;
  }
  loi('máy chủ Roblox bận (429/5xx) sau ' + thu + ' lần thử');
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
export async function taiAsset(id) {
  const r = await hoiApi(`${API}/asset-delivery-api/v1/assetId/${id}`);
  if (!r.ok) throw new Error(`asset ${id}: HTTP ${r.status}`);
  const j = await r.json();
  const loc = j.location || j.locations?.[0]?.location;
  if (!loc) throw new Error(`asset ${id}: không có location`);
  const c = await fetch(loc);                          // CDN: không gửi khoá
  if (!c.ok) throw new Error(`asset ${id}: CDN HTTP ${c.status}`);
  return Buffer.from(await c.arrayBuffer());
}
export function loaiAnh(b) {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}
async function taiAnh(id, dir) {
  for (const e of ['png', 'jpg', 'webp']) { const f = path.join(dir, `${id}.${e}`); if (fs.existsSync(f)) return f; }
  let b = await taiAsset(id);
  let e = loaiAnh(b);
  if (!e) {                                            // Decal/Texture bọc: <url>…id=XXX</url>
    const m = b.toString('latin1', 0, 4000).match(/<url>[^<]*?(\d{4,})[^<]*<\/url>/);
    if (m) { b = await taiAsset(m[1]); e = loaiAnh(b); }
  }
  if (!e) throw new Error(`ảnh ${id}: không nhận ra định dạng`);
  const f = path.join(dir, `${id}.${e}`); fs.writeFileSync(f, b); return f;
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
  const parts = await layParts(id, dir);
  // 3. mesh + ảnh
  const meshIds = new Set(), imgIds = new Set(), canhBao = [];
  for (const p of parts) {
    if (p.meshId) meshIds.add(p.meshId);
    for (const s of p.specialMeshes) { if (s.meshId) meshIds.add(s.meshId); if (s.textureId) imgIds.add(s.textureId); }
    if (p.textureId) imgIds.add(p.textureId);
    if (p.colorMap) imgIds.add(p.colorMap);
    for (const d of p.decals || []) if (d.texture) imgIds.add(d.texture);
  }
  return taiTiep(a, id, ra, dir, dM, dA, parts, meshIds, imgIds, canhBao);
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
  const parts = JSON.parse(d.stdout).parts;
  fs.writeFileSync(path.join(dir, 'dump.json'), JSON.stringify({ parts }, null, 1));
  return parts;
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
  return { part: parts.length, loai, mesh: mesh.size, anh: anh.size, decal, union, request: 1 + mesh.size + anh.size + csg.size };
}
async function cmdXem(a) {
  const id = layId(a._[0]); if (!id) loi('cách dùng: xem <id|link>');
  const t = tomTatParts(await layParts(id, path.join(ROOT, '.cache', 'roblox', id)));
  if (a.json) { console.log(JSON.stringify({ id, ...t })); return; }
  in_(`${id}: ${t.part} part — ${Object.entries(t.loai).map(([k, v]) => `${k}×${v}`).join(', ')}`);
  in_(`mesh: ${t.mesh} · ảnh vân: ${t.anh} (decal ${t.decal}) · Union: ${t.union} · tải đủ cần ~${t.request} request`);
}
async function taiTiep(a, id, ra, dir, dM, dA, parts, meshIds, imgIds, canhBao) {
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
  for (const m of meshIds) {
    const glb = path.join(dM, `${m}.glb`);
    try {
      if (!fs.existsSync(glb)) {
        const raw = path.join(dM, `${m}.mesh`);
        if (!fs.existsSync(raw)) fs.writeFileSync(raw, await taiAsset(m));
        const r = chay(SKY, ['mesh', raw, glb]);
        if (r.status !== 0) throw new Error((r.stderr || r.stdout || '').trim().slice(0, 200));
      }
      meshes[m] = glb;
    } catch (e) { canhBao.push(`mesh ${m}: ${e.message}`); }
  }
  for (const i of imgIds) {
    try { anh[i] = await taiAnh(i, dA); } catch (e) { canhBao.push(`ảnh ${i}: ${e.message}`); }
  }
  // 4. ghép bằng Blender
  const exe = ENV.BLENDER || process.env.BLENDER;
  if (!exe || !fs.existsSync(exe)) loi('không thấy Blender: đặt BLENDER trong .env.local');
  const manifest = path.join(dir, 'ghep.json');
  fs.writeFileSync(manifest, JSON.stringify({ parts, meshes, images: anh, csg, out: ra, ten: `roblox-${id}`, anhMax: Number(a['anh-max']) || 512 }));
  const r = chay(exe, ['-b', '--factory-startup', '-P', path.join(ROOT, 'tools', 'blender', 'roblox_ghep.py'), '--', manifest]);
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/^GHEP_JSON (.*)$/m);
  if (r.status !== 0 || !m) loi('Blender lỗi:\n' + out.split('\n').filter((l) => /Error|Traceback|GHEP_LOI|File "/.test(l)).slice(-12).join('\n') + (m ? '' : '\n' + out.slice(-500)));
  const kq = JSON.parse(m[1]);
  // 5. nguồn
  let tt = {};
  try { tt = await thongTin(id); } catch (e) { canhBao.push('không lấy được tên/tác giả: ' + e.message); }
  const nguon = { id, ten: a.ten || tt.ten || `Roblox ${id}`, tacGia: a['tac-gia'] || tt.tacGia || '', link: `https://create.roblox.com/store/asset/${id}`, giayPhep: GIAY_PHEP,
    ngayTai: new Date().toISOString().slice(0, 10), glb: path.relative(ROOT, ra).replace(/\\/g, '/'),
    tamGiac: kq.tamGiac, manh: kq.manh, hopBao: kq.hopBao.map((x) => +x.toFixed(3)), union: kq.union, decal: kq.decal, anh: kq.anh,
    xapXi: kq.boQua.map((b) => `${b.ten}: ${b.lyDo}`) };
  fs.writeFileSync(path.join(dir, 'nguon.json'), JSON.stringify(nguon, null, 1));
  // tóm tắt
  const bb = kq.hopBao;
  in_(`Đã ghi ${path.relative(ROOT, ra)}`);
  in_(`mảnh: ${kq.manh} (trong ${parts.length} part) · tam giác: ${kq.tamGiac} · hộp bao (stud): ${bb.map((x) => x.toFixed(2)).join(' × ')}`);
  in_(`ảnh vân: ${kq.anh} (decal ${kq.decal}) · Union đọc được lưới thật: ${kq.union} · request Open Cloud: ${soRequest}`);
  if (a.json) console.log(JSON.stringify(nguon));
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
export async function timMau(tu, { so = 20, tamGiacMax = Infinity, coScript = false } = {}) {
  const rows = []; let token = '', nReq = 0;
  while (rows.length < so && nReq < 4) {
    const q = new URLSearchParams({ searchCategoryType: 'Model', query: tu, maxPageSize: String(Math.min(100, Math.max(so * 2, 30))) });
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

// ---------- CLI ----------
export function phanTich(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2), n = argv[i + 1];
      if (n !== undefined && !n.startsWith('--') && !['co-script', 'json'].includes(k)) { a[k] = n; i++; } else a[k] = true;
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
    else console.log('Cách dùng:\n  node tools/roblox.mjs tim "<từ khoá>" [--so 20] [--tam-giac-max N] [--co-script] [--json] [--ung-vien file.json [--khe id]]\n  node tools/roblox.mjs xem <id|link>      (đếm part/mesh/ảnh vân/Union, chỉ tốn 1 request)\n  node tools/roblox.mjs tai <id|link> [--ra file.glb] [--ten "tên"] [--toi-da-request 40] [--anh-max 512] [--json]');
  } catch (e) { loi(e.message || e); }
}
