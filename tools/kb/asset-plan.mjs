// asset-plan.mjs — liệt kê THỨ CÒN THIẾU của một tập (bối cảnh, đạo cụ, animation) từ kich-ban.md.
//   node tools/kb/asset-plan.mjs <ep> [--kich-ban <file>] [--ra <file>] [--force]
//   -> output/<ep>/kiem/thieu.json
//      { env:[{ten, moTa, congThuc|null, shot}], prop:[{ten, tuThe, ungVien:[{nguon,id,giayPhep,dongManifest,ghiCong}], ...}],
//        anim:[ten], tuDung:[{loai, ten, lyDo}], daCo:{env,prop,anim}, danhMuc:{<nguồn>:'co-file'|'chua-co-danh-muc'} }
// Đọc kịch bản qua `python tools/kb/kichban.py <file> --json` (chịu trường lạ). KHÔNG tải mạng.
// Tra đạo cụ theo thứ tự:
//   1. assets/manifest.json qua chonMoHinh/ungVien (đúng loài + đúng tư thế)  -> đã có (daCo), không phải "thiếu"
//   2. danh mục cục bộ: (a) file GLB trong assets/<nguồn>/ chưa có dòng manifest (kenney, kaykit, polyhaven, polyfork, quaternius, special)
//                       (b) assets/catalogs/<nguồn>.json NẾU có — định dạng tối thiểu [{id, ten, tags, giayPhep}]
//   3. nguồn nào không có danh mục JSON -> nguon:'chua-co-danh-muc' (chỉ ghi khi không có ứng viên thật)
//   4. không có ứng viên thật -> thêm vào tuDung (phải tự dựng bằng code).
// Nhu cầu đạo cụ lấy từ: mục "## Cần dựng" dạng `- prop: <tên>: <mô tả>` (tên có thể kèm tư thế: "chim bay"; hoặc mô tả ghi `pose=flying`),
// cột "vật cần đọc" (+ tư thế của shot), và ghi chú `obj:<tên>`.
// Mã thoát: 0 xong, 1 kịch bản có lỗi dữ liệu (loi_doc), 2 lỗi môi trường (không chạy được python/kichban).
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ungVien } from './chon-mo-hinh.mjs';
import { fold, tuMoTa } from '../../engine/envs/cong-thuc.js';
import { thuMucKiem, hashVao, canChay, batDau, datBuoc, ghiNhatKy } from '../kiem/trang-thai.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HELPER_ENV = new Set(['cong-thuc', 'gio-thoi-tiet', 'tang']);
const NGUON = ['kenney', 'kaykit', 'polyhaven', 'polyfork', 'quaternius', 'special'];   // thư mục assets/<nguồn>
const NGUON_DANH_MUC = ['kenney', 'polyhaven', 'quaternius', 'polyfork'];                // cần assets/catalogs/<nguồn>.json
const GIAY_PHEP = { kenney: 'CC0', kaykit: 'CC0', polyhaven: 'CC0', polyfork: 'CC BY 4.0', quaternius: 'CC0', special: 'khong-ro' };
const TOI_DA_UNG_VIEN = 5;

// Từ điển Việt (đã fold) -> từ khoá Anh dùng để khớp id/tiêu đề manifest. Cụm dài thắng. Thêm 1 dòng khi cần.
export const TU_DIEN = {
  'chim': ['bird', 'gull', 'seagull'], 'hai au': ['gull', 'seagull'], 'canh cut': ['penguin'],
  'ca voi': ['whale'], 'ca heo': ['dolphin'], 'ca map': ['shark'], 'ca duoi': ['ray', 'manta'], 'ca': ['fish'],
  'cua': ['crab'], 'hom thu': ['mailbox'], 'thuyen': ['boat', 'dinghy', 'canoe'], 'tau dam': ['shipwreck', 'wreck'],
  'tau': ['ship', 'boat'], 'buom': ['sail'], 'hai dang': ['lighthouse'], 'cay co': ['palm'], 'cay dua': ['palm'], 'cay': ['tree'],
  'da': ['rock', 'boulder', 'stone'], 'ghe': ['chair', 'stool'], 'ban': ['table', 'desk'], 'giuong': ['bed'],
  'tu lanh': ['fridge', 'refrigerator'], 'binh hoa': ['vase', 'plant'], 'den': ['lamp', 'light'], 'xe': ['car'],
  'nha': ['house', 'building'], 'thang': ['ladder', 'stairs'], 'kim tu thap': ['pyramid'], 'lac da': ['camel'],
  'san ho': ['coral'], 'nam': ['mushroom'], 'vo so': ['shell'], 'go troi': ['driftwood'],
  'thiep': ['card', 'postcard'], 'tam thiep': ['card', 'postcard'], 'quai vat': ['monster'], 'rong': ['dragon'],
  'cua so': ['window'], 'cong': ['gate', 'door'], 'cot': ['pole', 'pillar'], 'cat': ['sand'], 'nui': ['mountain'], 'cau tau': ['pier', 'dock', 'jetty'],
  'thong': ['pine', 'spruce', 'larch'],
};
// Từ chỉ tư thế trong tên đạo cụ ("chim bay", "cá bơi", "chim đậu"); fold trước khi so.
const TU_THE_TU = { bay: 'flying', boi: 'swimming', dau: 'sitting', ngoi: 'sitting', dung: 'standing' };
const POSE_OK = new Set(['standing', 'flying', 'sitting', 'swimming']);

const tokens = (s) => fold(s).split(' ').filter(Boolean);
const uniq = (a) => [...new Set(a)];

// "chim bay" -> { loai: 'chim', tuThe: 'flying' }
export function tachTuThe(ten, moTa = '') {
  const m = /pose\s*=\s*([a-z]+)/i.exec(moTa || '');
  let tuThe = m && POSE_OK.has(m[1].toLowerCase()) ? m[1].toLowerCase() : null;
  const giu = [];
  for (const w of String(ten).trim().split(/\s+/).filter(Boolean)) { const f = fold(w); if (TU_THE_TU[f]) tuThe = tuThe ?? TU_THE_TU[f]; else giu.push(w); }
  return { loai: giu.join(' ') || String(ten).trim(), tuThe };
}

// "tàu đắm" -> ['shipwreck','wreck']; không có trong từ điển -> chính cụm (coi là tiếng Anh).
// "cọ" (palm) và "cỏ" (grass) trùng nhau sau khi bỏ dấu -> xét trên chữ gốc trước.
const THEO_DAU = [[/(^|\s)cửa sổ(\s|$)/, ['window']], [/(^|\s)cửa(\s|$)/, ['door']], [/(^|\s)cọ(\s|$)/, ['palm']], [/(^|\s)cỏ(\s|$)/, ['grass']]];
export function dichLoai(loai) {
  const tho = String(loai).normalize('NFC').toLowerCase();
  for (const [re, kw] of THEO_DAU) if (re.test(tho)) return kw;
  const v = ' ' + fold(loai) + ' ';
  const khoa = Object.keys(TU_DIEN).sort((a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length);
  for (const k of khoa) if (v.includes(' ' + k + ' ')) return TU_DIEN[k];
  return [fold(loai)];
}

const khopTu = (hay, kw) => { const t = tokens(hay); return tokens(kw).every((x) => t.includes(x)); };

// ---------- đọc dữ liệu repo ----------
export function docManifest(goc = GOC) { return JSON.parse(fs.readFileSync(path.join(goc, 'assets', 'manifest.json'), 'utf8')); }

export function docEnvCo(goc = GOC) {
  const ten = new Set();
  const f = path.join(goc, 'engine', 'envs.js');
  if (fs.existsSync(f)) for (const m of fs.readFileSync(f, 'utf8').matchAll(/^\s*def\('([A-Za-z0-9_]+)'/gm)) ten.add(m[1]);
  const d = path.join(goc, 'engine', 'envs');
  if (fs.existsSync(d)) for (const n of fs.readdirSync(d)) if (n.endsWith('.js') && !HELPER_ENV.has(n.slice(0, -3))) ten.add(n.slice(0, -3));
  return ten;
}

export function docAnimCo(goc = GOC) {
  const t = fs.readFileSync(path.join(goc, 'engine', 'r15.js'), 'utf8');
  const m = /export const R15_ANIMATIONS\s*=\s*\{\n(.*?)\n\};/s.exec(t);
  if (!m) throw new Error('không đọc được R15_ANIMATIONS trong engine/r15.js');
  return new Set([...m[1].matchAll(/^ {2}([A-Za-z_]\w*)\s*:/gm)].map((x) => x[1]));
}

// ANIM_WORDS / PLACE_WORDS / TOWN_PLACES của tools/storyboard.py (chỉ đọc) — để không coi mô tả tự do là "thiếu".
export function docTuStoryboard(goc = GOC) {
  const r = { anim: [], noi: [], town: new Set() };
  const f = path.join(goc, 'tools', 'storyboard.py');
  if (!fs.existsSync(f)) return r;
  const t = fs.readFileSync(f, 'utf8');
  const cap = (ten) => { const m = new RegExp(ten + '\\s*=\\s*\\[(.*?)\\n\\]|' + ten + '\\s*=\\s*\\[(.*?)\\]\\n', 's').exec(t); return m ? (m[1] ?? m[2]) : ''; };
  const cap2 = (s) => [...s.matchAll(/\('([^']*)',\s*'(\w+)'\)/g)].map((m) => [m[1], m[2]]);
  r.anim = cap2(cap('ANIM_WORDS')); r.noi = cap2(cap('PLACE_WORDS'));
  const tp = /TOWN_PLACES\s*=\s*\{(.*?)\}/s.exec(t);
  if (tp) for (const m of tp[1].matchAll(/'(\w+)'/g)) r.town.add(m[1]);
  return r;
}
const khopTuKhoa = (bang, text) => { const t = ' ' + fold(text) + ' '; for (const [w] of bang) { const k = ' ' + w.trim(); if (t.includes(k) || t.trim() === w.trim()) return true; } return false; };

// Đạo cụ dựng bằng CODE: khoá của propKit (engine/props.js) + khoá của PROPS_KB (engine/props-kb.js, sổ đạo cụ theo kịch bản).
const HAM_PHU_PROPKIT = new Set(['M', 'mesh', 'box', 'cyl', 'sph', 'group', 'waddle', 'swim']);
function khoaPropKit(text) {
  const ra = [];
  const i0 = text.search(/\bconst K = \{/);
  if (i0 < 0) return ra;
  for (const dong of text.slice(i0).split('\n').slice(1)) {
    if (/^ {2}\};/.test(dong)) break;
    const m = /^ {4}([A-Za-z_]\w*)\s*\(/.exec(dong);
    if (m && !HAM_PHU_PROPKIT.has(m[1])) ra.push(m[1]);
  }
  return ra;
}
// khoá cấp 1 của `export const PROPS_KB = { … }` — quét có đếm ngoặc, bỏ chuỗi/chú thích; file lạ/hỏng -> []
export function khoaPropsKb(text) {
  const ra = [];
  const m = /PROPS_KB\s*=\s*\{/.exec(text);
  if (!m) return ra;
  let i = m.index + m[0].length, depth = 1, canKhoa = true;
  const n = text.length;
  while (i < n && depth > 0) {
    const c = text[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (depth === 1 && canKhoa) {
      const k = /^(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*[:(]/.exec(text.slice(i, i + 200));
      canKhoa = false;
      if (k) { ra.push(k[1] ?? k[2] ?? k[3]); i += k[0].length - 1; if (text[i] === '(') continue; i++; continue; }
    }
    if (c === "'" || c === '"' || c === '`') { let j = i + 1; while (j < n && text[j] !== c) { if (text[j] === '\\') j++; j++; } i = j + 1; continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 1) canKhoa = true;
    i++;
  }
  return ra;
}
export function docPropCo(goc = GOC) {
  const co = new Set();
  const doc = (f) => { try { return fs.readFileSync(path.join(goc, 'engine', f), 'utf8'); } catch { return ''; } };
  for (const k of khoaPropKit(doc('props.js'))) co.add(k);
  for (const k of khoaPropsKb(doc('props-kb.js'))) co.add(k);
  return co;
}
const chuanKhoa = (s) => fold(String(s)).replace(/[^a-z0-9]/g, '');

function* duyetGlb(dir) {
  let ds; try { ds = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const d of ds.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) yield* duyetGlb(p);
    else if (/\.(glb|gltf)$/i.test(d.name)) yield p;
  }
}

// Danh mục cục bộ: GLB chưa vào manifest + assets/catalogs/<nguồn>.json
export function docDanhMuc(goc, manifest) {
  const trongManifest = new Set(manifest.map((e) => String(e.src ?? '').replace(/\\/g, '/')));
  const muc = [], trangThai = {};
  for (const ng of NGUON) {
    for (const f of duyetGlb(path.join(goc, 'assets', ng))) {
      const rel = path.relative(goc, f).split(path.sep).join('/');
      if (trongManifest.has(rel)) continue;
      const id = path.relative(path.join(goc, 'assets'), f).split(path.sep).join('/').replace(/\.(glb|gltf)$/i, '');
      muc.push({ nguon: ng, id, chu: id.replace(/[\\/]/g, ' '), giayPhep: GIAY_PHEP[ng] ?? 'khong-ro', file: true });
    }
  }
  for (const ng of NGUON_DANH_MUC) {
    const f = path.join(goc, 'assets', 'catalogs', ng + '.json');
    if (!fs.existsSync(f)) { trangThai[ng] = 'chua-co-danh-muc'; continue; }
    try {
      for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))) {
        muc.push({ nguon: ng, id: String(e.id), chu: `${e.id} ${e.ten ?? ''} ${(e.tags || []).join(' ')}`, giayPhep: e.giayPhep ?? GIAY_PHEP[ng] ?? 'khong-ro', file: false });
      }
      trangThai[ng] = 'co-file';
    } catch { trangThai[ng] = 'chua-co-danh-muc'; }
  }
  for (const ng of NGUON) if (!trangThai[ng]) trangThai[ng] = muc.some((m) => m.nguon === ng) ? 'co-file' : 'chua-co-danh-muc';
  return { muc, trangThai };
}

// ---------- gom nhu cầu từ kịch bản ----------
export function gomNhuCau(kb) {
  const env = new Map(), prop = new Map(), anim = new Map();
  const them = (m, ten, o) => { const c = m.get(ten) ?? { ten, shot: [], ...o }; if (o.moTa && !c.moTa) c.moTa = o.moTa; if (o.id) c.shot.push(o.id); m.set(ten, c); };
  const meta = kb.meta || {};
  if (meta.env) them(env, String(meta.env), { moTa: '' });
  for (const c of kb.can_dung || []) {
    if (c.kind === 'env') them(env, c.name, { moTa: c.desc || '', rieng: true });
    else if (c.kind === 'anim') them(anim, c.name, { moTa: c.desc || '', rieng: true });
    else if (c.kind === 'prop') {
      for (const ten of String(c.name).split(',').map((s) => s.trim()).filter(Boolean)) {   // "- prop: ví, túi tiền, nhẫn" = 3 đạo cụ
        const { loai, tuThe } = tachTuThe(ten, c.desc);
        const k = `${loai}|${tuThe ?? ''}`;
        if (!prop.has(k)) prop.set(k, { ten, loai, tuThe, moTa: c.desc || '', shot: [] });
      }
    }
  }
  for (const sh of kb.shots || []) {
    if (sh.env) them(env, String(sh.env), { id: sh.id });
    if (sh.at) them(env, String(sh.at), { id: sh.id, la_at: true });
    for (const k of ['action', 'withAnim']) if (sh[k]) them(anim, String(sh[k]), { id: sh.id });
    const doc = [];
    if (sh.read) doc.push(String(sh.read));
    for (const m of String(sh.notes || '').matchAll(/obj:([\w-]+)/g)) doc.push(m[1].replace(/[_-]+/g, ' '));
    for (const ten of doc) {
      const { loai, tuThe: tt } = tachTuThe(ten);
      const tuThe = tt ?? (POSE_OK.has(sh.pose) ? sh.pose : null);
      const k = `${loai}|${tuThe ?? ''}`;
      const c = prop.get(k) ?? { ten, loai, tuThe, moTa: '', shot: [] };
      c.shot.push(sh.id); prop.set(k, c);
    }
  }
  return { env, prop, anim };
}

// ---------- tra cứu ----------
function xetEnv(nhuCau, ctx) {
  const thieu = [], daCo = [], tuDung = [], canhBao = [];
  for (const c of nhuCau.env.values()) {
    const ten = c.ten;
    if (ctx.envCo.has(ten)) { daCo.push(ten); continue; }
    if (ctx.places.has(ten) || (c.rieng && ctx.town.has(ten))) {   // `place <tên>: x, z` đầu kịch bản = địa điểm trong env town, không phải env riêng
      daCo.push(`${ten} => place (env town)`);
      if (c.rieng) canhBao.push(`"Cần dựng" env "${ten}" trùng một địa điểm (place khai ở đầu kịch bản / địa điểm sẵn của env town): dùng làm địa điểm trong env town, KHÔNG dựng env riêng. Muốn env riêng thì đổi tên place hoặc tên env.`);
      continue;
    }
    if (c.la_at && !c.rieng) {
      if (ctx.town.has(ten) || /^house\d+$/.test(ten)) continue;
    }
    const congThuc = tuMoTa(c.moTa || '') ?? tuMoTa(ten);
    if (!c.rieng && congThuc && ctx.envCo.has(congThuc.env)) { daCo.push(`${ten} => ${congThuc.env}`); continue; }
    if (c.la_at && !c.rieng && khopTuKhoa(ctx.noi, ten)) continue;       // storyboard.py đổi thành địa điểm thị trấn
    thieu.push({ ten, moTa: c.moTa || ten, congThuc: congThuc ?? null, shot: uniq(c.shot) });
    if (!congThuc) tuDung.push({ loai: 'env', ten, lyDo: 'không khớp công thức nào trong engine/envs/cong-thuc.js' });
  }
  return { thieu, daCo, tuDung, canhBao };
}

function xetAnim(nhuCau, ctx) {
  const lower = new Map([...ctx.animCo].map((a) => [a.toLowerCase(), a]));
  const thieu = [], daCo = [];
  for (const c of nhuCau.anim.values()) {
    if (lower.has(c.ten.toLowerCase())) { daCo.push(c.ten); continue; }
    if (!c.rieng && khopTuKhoa(ctx.animTu, c.ten)) continue;             // mô tả tự do -> storyboard.py đoán ra anim có sẵn
    thieu.push(c.ten);
  }
  return { thieu, daCo };
}

function ungVienThat(syns, ctx) {
  const ra = [];
  for (const m of ctx.danhMuc.muc) {
    if (!syns.some((s) => khopTu(m.chu, s))) continue;
    const bySa = /BY/i.test(m.giayPhep);
    ra.push({ nguon: m.nguon, id: m.id, giayPhep: m.giayPhep, dongManifest: false, ghiCong: bySa ? `${m.id} (${m.nguon}), ${m.giayPhep}` : null });
    if (ra.length >= TOI_DA_UNG_VIEN) break;
  }
  return ra;
}

// mô hình không khai pose là vật tĩnh -> coi như đứng
const hopTuThe = (e, pose) => !pose || (Array.isArray(e.pose) ? e.pose : e.pose ? [e.pose] : (pose === 'standing' ? ['standing'] : [])).includes(pose);

function xetProp(nhuCau, ctx) {
  const thieu = [], daCo = [], tuDung = [];
  for (const c of nhuCau.prop.values()) {
    const syns = dichLoai(c.loai);
    const khoaTen = [chuanKhoa(c.ten), chuanKhoa(c.loai)];
    if (khoaTen.some((k) => ctx.dienVien.has(k))) { daCo.push({ ten: c.ten, tuThe: c.tuThe, id: null, nguon: 'dien-vien' }); continue; }   // bear=1 / ga=1: dựng như diễn viên
    const bangCode = khoaTen.some((k) => ctx.propCo.has(k)) || (c.loai.trim().split(/\s+/).length <= 2 && syns.some((s) => ctx.propCo.has(chuanKhoa(s))));
    if (bangCode) { daCo.push({ ten: c.ten, tuThe: c.tuThe, id: null, nguon: 'code' }); continue; }   // propKit / PROPS_KB
    const tim = (pose) => {
      const th = [];
      for (const s of syns) for (const e of ungVien(ctx.manifest, { loai: s })) if (!th.includes(e) && hopTuThe(e, pose)) th.push(e);
      return th;
    };
    const dung = tim(c.tuThe);
    if (dung.length) { daCo.push({ ten: c.ten, tuThe: c.tuThe, id: dung[0].id }); continue; }
    const khac = c.tuThe ? tim(null) : [];
    let uv = ungVienThat(syns, ctx);
    const thieuDM = Object.entries(ctx.danhMuc.trangThai).filter(([, v]) => v === 'chua-co-danh-muc').map(([k]) => k);
    if (!uv.length && thieuDM.length) uv = [{ nguon: 'chua-co-danh-muc', id: null, giayPhep: null, dongManifest: false, ghiCong: null, thieu: thieuDM }];
    const it = { ten: c.ten, tuThe: c.tuThe, ungVien: uv, shot: uniq(c.shot) };
    if (khac.length) it.coSanKhacTuThe = khac.map((e) => ({ id: e.id, pose: e.pose ?? [] }));
    thieu.push(it);
    if (!uv.some((u) => u.id)) {
      tuDung.push({ loai: 'prop', ten: c.ten, lyDo: khac.length ? `manifest chỉ có tư thế ${[...new Set(khac.flatMap((e) => e.pose ?? []))].join('/') || 'khác'}, cần ${c.tuThe}` : 'không có trong manifest lẫn danh mục cục bộ' });
    }
  }
  return { thieu, daCo, tuDung };
}

export function lapKeHoach({ kb, manifest, envCo, animCo, propCo = new Set(), tuStoryboard = { anim: [], noi: [], town: new Set() }, danhMuc = { muc: [], trangThai: {} } }) {
  const nhuCau = gomNhuCau(kb);
  const meta = kb.meta || {};
  const places = new Set(Object.keys(meta.places || {}));
  const dienVien = new Set(Object.entries(meta.actors || {}).filter(([, v]) => v && (v.bear || v.ga)).map(([k]) => chuanKhoa(k)));
  const ctx = { manifest, envCo, animCo, animTu: tuStoryboard.anim, noi: tuStoryboard.noi, town: tuStoryboard.town, danhMuc,
    propCo: new Set([...propCo].map(chuanKhoa)), places, dienVien };
  const e = xetEnv(nhuCau, ctx), p = xetProp(nhuCau, ctx), a = xetAnim(nhuCau, ctx);
  return {
    env: e.thieu, prop: p.thieu, anim: a.thieu, tuDung: [...e.tuDung, ...p.tuDung], canhBao: e.canhBao,
    daCo: { env: e.daCo, prop: p.daCo, anim: a.daCo }, danhMuc: danhMuc.trangThai,
  };
}

// ---------- CLI ----------
export function docKichBan(file, goc = GOC) {
  const r = spawnSync('python', [path.join(goc, 'tools', 'kb', 'kichban.py'), file, '--json'],
    { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0 || !r.stdout) throw new Error(`không chạy được kichban.py: ${r.error?.message ?? r.stderr}`);
  return JSON.parse(r.stdout);
}

export function chay(ep, { kichBan, ra, force = false, goc = GOC } = {}) {
  const ung = [kichBan, path.join(goc, 'kich-ban', ep, 'kich-ban.md'), path.join(goc, 'episodes', ep, 'kich-ban.md')].filter(Boolean);
  const file = ung.find((f) => fs.existsSync(f));
  if (!file) { console.error(`[asset-plan] không thấy kịch bản (thử: ${ung.join(', ')})`); return 2; }
  const dinhRa = ra ?? path.join(thuMucKiem(ep, { goc }), 'thieu.json');
  const envCo = docEnvCo(goc), animCo = docAnimCo(goc), propCo = docPropCo(goc), tuStoryboard = docTuStoryboard(goc), manifest = docManifest(goc);
  const danhMuc = docDanhMuc(goc, manifest);
  // băm: kịch bản + manifest + MỌI thứ kết quả phụ thuộc (tên env, tên anim, từ điển storyboard, danh sách GLB/catalog chưa vào manifest, công thức)
  const phuThuoc = JSON.stringify({ env: [...envCo].sort(), prop: [...propCo].sort(), anim: [...animCo].sort(), sb: [tuStoryboard.anim, tuStoryboard.noi, [...tuStoryboard.town].sort()], dm: danhMuc,
    ct: hashVao([path.join(goc, 'engine', 'envs', 'cong-thuc.js')], { goc }) });
  const hash = crypto.createHash('sha1').update(hashVao([file, path.join(goc, 'assets', 'manifest.json')], { goc })).update(phuThuoc).digest('hex');
  if (!force && fs.existsSync(dinhRa) && !canChay(ep, 'asset', hash, { goc })) { console.log(`[asset-plan] ${ep}: đầu vào không đổi, dùng lại ${dinhRa}`); return 0; }
  let kb;
  try { kb = docKichBan(file, goc); } catch (e) { console.error(`[asset-plan] ${e.message}`); return 2; }
  batDau(ep, 'asset', { goc });
  const kq = lapKeHoach({ kb, manifest, envCo, animCo, propCo, tuStoryboard, danhMuc });
  fs.mkdirSync(path.dirname(dinhRa), { recursive: true });
  fs.writeFileSync(dinhRa, JSON.stringify(kq, null, 2) + '\n');
  const loi = (kb.loi_doc || []).length;
  datBuoc(ep, 'asset', { hash, xong: loi === 0 }, { goc });
  ghiNhatKy(ep, { buoc: 'asset', env: kq.env.length, prop: kq.prop.length, anim: kq.anim.length, tuDung: kq.tuDung.length, loiKichBan: loi }, { goc });
  console.log(`[asset-plan] ${ep}: thiếu env ${kq.env.length}, prop ${kq.prop.length}, anim ${kq.anim.length}, tự dựng ${kq.tuDung.length} -> ${dinhRa}`);
  if (loi) { console.error(`[asset-plan] kịch bản có ${loi} lỗi dữ liệu (chạy tools/kb/lint.py)`); return 1; }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), val = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const ep = a.find((x, i) => !x.startsWith('--') && !['--kich-ban', '--ra'].includes(a[i - 1]));
  if (!ep) { console.error('dùng: node tools/kb/asset-plan.mjs <ep> [--kich-ban file] [--ra file] [--force]'); process.exit(2); }
  process.exit(chay(ep, { kichBan: val('--kich-ban'), ra: val('--ra'), force: a.includes('--force') }));
}
