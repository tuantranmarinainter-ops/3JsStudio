#!/usr/bin/env node
// thu-vien-asset.mjs — thư viện asset từ video tham khảo: gộp đạo cụ trùng, chia mục, tìm 20 mẫu Creator Store mỗi món,
// dựng trang duyệt một file dist/thu-vien-asset.html (5 mẫu/lần, nút Làm mới, chọn nhiều, Gửi tới Claude).
//   node tools/thu-vien-asset.mjs dung [--lam-lai] [--so 30] [--toi-thieu 10]   gộp + tìm phần còn thiếu + dựng trang
//   node tools/thu-vien-asset.mjs gop                                           chỉ gộp + chia mục (in bảng)
//   node tools/thu-vien-asset.mjs nhan <file.json>                              đọc kết quả chọn (file tải từ trang)
//   node tools/thu-vien-asset.mjs codex <file.json>                             món "Nhờ Codex vẽ" → bản nháp đề bài output/thu-vien-asset/codex/
//   node tools/thu-vien-asset.mjs mo [--cong N] [--mot-lan]                     máy chủ cục bộ nhận nút "Gửi tới Claude"
// Dữ liệu vào: output/nghien-cuu-map/*/phan-tich-*.json. Cache tìm: .cache/thu-vien-asset/tim/<từ khoá>.json (không tìm lại; --lam-lai bỏ cache).
// Ảnh mẫu: .cache/roblox/<id>/thumb.png (thumbnails.roblox.com) → dist/thu-vien-asset-anh/<id>.jpg (nhỏ, trang dùng đường dẫn tương đối).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOC_MAP = path.join(ROOT, 'output', 'nghien-cuu-map');
const CACHE = path.join(ROOT, '.cache', 'thu-vien-asset');
const RA = path.join(ROOT, 'output', 'thu-vien-asset');
const DIST = path.join(ROOT, 'dist');

// ---------- mục + mục con ----------
export const MUC = [
  { id: 'nhan-vat', ten: 'Nhân vật', con: [['toc', 'Tóc'], ['mu', 'Mũ / nón'], ['kinh', 'Kính / mặt nạ'], ['lung-vai-co', 'Phụ kiện lưng, vai, cổ'], ['tay', 'Phụ kiện tay (đồ cầm)'], ['ao-quan', 'Áo / quần']] },
  { id: 'moi-truong', ten: 'Môi trường', con: [['cay-coi', 'Cây cối'], ['co-hoa', 'Cỏ hoa'], ['da-dia-hinh', 'Đá / địa hình'], ['nuoc', 'Nước']] },
  { id: 'duong-pho', ten: 'Đường phố', con: [['duong', 'Đường'], ['den', 'Đèn'], ['hang-rao', 'Hàng rào'], ['bien-hieu', 'Biển hiệu'], ['xe-co', 'Xe cộ']] },
  { id: 'nha', ten: 'Nhà và công trình', con: [['mat-tien', 'Nhà / mặt tiền'], ['tuong-san', 'Tường, sàn, trần'], ['cua', 'Cửa và cửa sổ']] },
  { id: 'noi-that', ten: 'Nội thất', con: [['phong-ngu', 'Phòng ngủ'], ['bep', 'Bếp'], ['phong-khach', 'Phòng khách']] },
  { id: 'do-dung', ten: 'Đồ dùng nhỏ', con: [['chung', 'Đồ dùng nhỏ']] },
  { id: 'troi', ten: 'Bầu trời (Skybox)', con: [['sky', 'Skybox']] },
  { id: 'van', ten: 'Vân vật liệu', con: [['decal', 'Vân (Decal / Texture)']] },
  { id: 'khac', ten: 'Khác', con: [['chung', 'Khác']] },
];

// Luật gộp + phân loại, khớp theo thứ tự trên "ten_en + từ khoá". [khoá món, tên Việt, mục, mục con, regex]
// Món trùng = cùng khoá. Món không khớp luật nào → khoá riêng từ từ khoá đầu, phân loại theo `nhom`.
const LUAT = [
  ['quan-tai', 'Quan tài', 'noi-that', 'phong-ngu', /coffin/],
  ['cay-nen', 'Cây hậu cảnh (nhóm cây)', 'moi-truong', 'cay-coi', /tree pack|tree line|forest|background (leafy )?tree|dense leafy/],
  ['cay-to', 'Cây tán lá (cây to)', 'moi-truong', 'cay-coi', /\b(tree|oak)\b/],
  ['cay-co-chau', 'Cây cọ trong chậu', 'moi-truong', 'cay-coi', /palm/],
  ['bui-hoa', 'Bụi hoa nhỏ', 'moi-truong', 'co-hoa', /flower(ing)? (shrub|bush)|shrub/],
  ['cay-con', 'Cây con / mầm', 'moi-truong', 'co-hoa', /seedling/],
  ['co-cao', 'Cỏ cao / lau sậy', 'moi-truong', 'co-hoa', /tall grass|reed|cattail/],
  ['bai-co', 'Bãi cỏ', 'moi-truong', 'co-hoa', /grass (lawn|terrain)|lawn/],
  ['chau-hoa', 'Chậu hoa nhỏ', 'do-dung', 'chung', /potted flower|planter box/],
  ['luong-hoa', 'Bó hoa', 'do-dung', 'chung', /bouquet/],
  ['hoa-hong-lo', 'Hoa hồng trong bình', 'do-dung', 'chung', /rose in vase/],
  ['da', 'Đá / cụm đá trắng', 'moi-truong', 'da-dia-hinh', /rocks?\b/],
  ['bai-cat', 'Bãi cát / bờ hồ', 'moi-truong', 'da-dia-hinh', /sand/],
  ['doi-dat', 'Đồi / đồng xa', 'moi-truong', 'da-dia-hinh', /hills/],
  ['nuoc-ho', 'Mặt nước hồ', 'moi-truong', 'nuoc', /lake water|water terrain/],
  ['via-he', 'Vỉa hè / nền lát đá', 'duong-pho', 'duong', /paver|paving|pavement|cobble|concrete road/],
  ['den-duong', 'Đèn đường', 'duong-pho', 'den', /street lamp/],
  ['den-long', 'Đèn lồng treo / gắn tường', 'do-dung', 'chung', /lantern/],
  ['rao-trang', 'Hàng rào trắng (picket)', 'duong-pho', 'hang-rao', /picket fence/],
  ['rao-go', 'Hàng rào gỗ', 'duong-pho', 'hang-rao', /wooden fence/],
  ['lan-can', 'Lan can / thanh chéo gỗ', 'duong-pho', 'hang-rao', /railing|cross brace/],
  ['bien-quan', 'Biển hiệu / biển ga', 'duong-pho', 'bien-hieu', /\bsign\b/],
  ['tau-hoa', 'Đầu máy hơi nước', 'duong-pho', 'xe-co', /locomotive/],
  ['xuong', 'Xuồng gỗ nhỏ', 'duong-pho', 'xe-co', /rowboat/],
  ['ga-tau', 'Nhà ga gỗ', 'nha', 'mat-tien', /train station/],
  ['quan-cafe', 'Quán cà phê gỗ (mặt tiền)', 'nha', 'mat-tien', /cafe facade/],
  ['nha-gach', 'Nhà gạch (mặt tiền / hậu cảnh)', 'nha', 'mat-tien', /brick (building|house|townhouse)|orange house/],
  ['cua-hang-xanh', 'Mặt tiền cửa hàng', 'nha', 'mat-tien', /storefront|shop front/],
  ['mai-hien', 'Mái hiên / mái che', 'nha', 'mat-tien', /awning/],
  ['thap-nuoc', 'Tháp nước trên mái', 'nha', 'mat-tien', /water tower/],
  ['cot-hien', 'Cột hiên', 'nha', 'mat-tien', /porch column/],
  ['cau-tau', 'Cầu tàu / cầu gỗ', 'nha', 'mat-tien', /pier|dock|bridge/],
  ['tuong-gach', 'Tường gạch đỏ', 'nha', 'tuong-san', /brick wall/],
  ['tuong-gach-men', 'Tường ốp gạch men kem', 'nha', 'tuong-san', /subway|tile wall|cream brick tile/],
  ['giay-dan-soc', 'Giấy dán tường sọc', 'nha', 'tuong-san', /striped wallpaper/],
  ['giay-dan', 'Giấy dán tường (trơn / hoạ tiết)', 'nha', 'tuong-san', /wallpaper|pale green wall/],
  ['san-go', 'Sàn gỗ', 'nha', 'tuong-san', /(wood|hardwood).* (floor|planks?)|wood(en)? floor|floor porch|\bwood plank floor/],
  ['tran', 'Trần nhà', 'nha', 'tuong-san', /ceiling/],
  ['rem', 'Rèm cửa', 'noi-that', 'phong-khach', /curtain/],
  ['cua-so', 'Cửa sổ', 'nha', 'cua', /window/],
  ['cua-ra-vao', 'Cửa gỗ', 'nha', 'cua', /\bdoor\b/],
  ['ban-picnic', 'Bàn picnic gỗ', 'noi-that', 'phong-khach', /picnic table/],
  ['ban-an', 'Bàn ăn gỗ', 'noi-that', 'phong-khach', /dining table/],
  ['ban-tron', 'Bàn nhỏ tròn', 'noi-that', 'phong-khach', /side table|coffee table/],
  ['ghe-quan', 'Ghế gỗ quán', 'noi-that', 'phong-khach', /cafe chair|wooden chair/],
  ['ghe-cong-vien', 'Ghế băng công viên', 'noi-that', 'phong-khach', /park bench/],
  ['ghe-bang', 'Ghế bành xanh', 'noi-that', 'phong-khach', /armchair|wingback/],
  ['sofa', 'Sofa xám', 'noi-that', 'phong-khach', /sofa/],
  ['tham-tron', 'Thảm tròn', 'noi-that', 'phong-khach', /round (white )?rug/],
  ['tham', 'Thảm hoạ tiết', 'noi-that', 'phong-khach', /\brug\b/],
  ['ke-sach', 'Kệ / tủ sách', 'noi-that', 'phong-khach', /book(shelf|case)/],
  ['tu-quan-ao', 'Tủ quần áo gỗ lớn', 'noi-that', 'phong-ngu', /wardrobe|large wooden cabinet/],
  ['tu-com-mot', 'Tủ ngăn kéo cổ', 'noi-that', 'phong-ngu', /dresser/],
  ['giuong-sat', 'Giường sắt cũ', 'noi-that', 'phong-ngu', /iron bed|bunk bed|bed (frame|edge)/],
  ['chan-goi', 'Chăn gối / gối tựa', 'noi-that', 'phong-ngu', /pillow|cushion|blanket/],
  ['tu-dau-giuong', 'Tủ đầu giường', 'noi-that', 'phong-ngu', /nightstand/],
  ['mat-bep', 'Mặt bếp đá', 'noi-that', 'bep', /counter/],
  ['tu-bep', 'Tủ bếp', 'noi-that', 'bep', /kitchen cabinet|wall cabinet/],
  ['bep-ga', 'Bếp nấu', 'noi-that', 'bep', /stove|cooktop/],
  ['thang', 'Thang', 'do-dung', 'chung', /ladder/],
  ['gio-may', 'Giỏ mây / giỏ picnic', 'do-dung', 'chung', /basket/],
  ['khung-tranh', 'Khung tranh', 'do-dung', 'chung', /picture frame/],
  ['hop-giay', 'Thùng carton', 'do-dung', 'chung', /cardboard/],
  ['may-ban-hang', 'Máy bán hàng', 'do-dung', 'chung', /vending machine/],
];

const NHOM_MUC = { 'cay-coi': ['moi-truong', 'cay-coi'], 'canh-quan': ['moi-truong', 'da-dia-hinh'], 'nha-cua': ['nha', 'mat-tien'], 'noi-that': ['noi-that', 'phong-khach'],
  'do-dung': ['do-dung', 'chung'], 'duong-pho': ['duong-pho', 'duong'], 'xe-co': ['duong-pho', 'xe-co'], 'bien-hieu': ['duong-pho', 'bien-hieu'], khac: ['khac', 'chung'] };

const CON_NV = { toc: 'toc', mu: 'mu', kinh: 'kinh', 'lung-vai-co': 'lung-vai-co', tay: 'tay', 'ao-quan': 'ao-quan' };
const bo = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dienTich = (k) => (Array.isArray(k) && k.length === 4 ? Math.max(0, k[2]) * Math.max(0, k[3]) : 0);

export function docDaoCu(goc = GOC_MAP) {
  const ra = [];
  if (!fs.existsSync(goc)) return ra;
  for (const video of fs.readdirSync(goc).sort()) {
    const dir = path.join(goc, video);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => /^phan-tich-.+\.json$/.test(x)).sort()) {
      let ds; try { ds = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
      for (const d of ds) for (const o of d.dao_cu || []) ra.push({ ...o, video, dia_diem: d.dia_diem, dia_diem_ten: d.ten || d.dia_diem });
    }
  }
  return ra;
}

/** Gộp món trùng + chia mục. Trả {mon: [...]} mỗi món: khoá, ten, tenEn, muc, con, mau[], vatLieu, kichThuoc, tuKhoa[], xuatHien[], anh{video,shot,khung}. */
export function gopMon(daoCu) {
  const map = new Map();
  for (const o of daoCu) {
    const chuoi = `${o.ten_en || ''} ${(o.tu_khoa_store || []).join(' ')}`.toLowerCase();
    const nv = o.nhom === 'nhan-vat', tv = o.nhom === 'troi-van';
    const l = nv ? null : LUAT.find((r) => r[4].test(chuoi));
    let khoa, ten, muc, con, lb = '';
    if (nv) { muc = 'nhan-vat'; con = CON_NV[o.nhom_con] || 'tay'; khoa = 'nv-' + con + '-' + bo((o.tu_khoa_store || [])[0] || o.ten_en || o.ten); ten = o.ten || o.ten_en; }
    else if (tv) { const t = o.nhom_con === 'troi'; muc = t ? 'troi' : 'van'; con = t ? 'sky' : 'decal'; khoa = (t ? 'troi-' : 'van-') + bo((o.tu_khoa_store || [])[0] || o.ten_en || o.ten); ten = o.ten || o.ten_en; lb = t ? 'Sky (Model)' : 'Decal'; }
    else if (l) [khoa, ten, muc, con] = l;
    else { khoa = bo((o.tu_khoa_store || [])[0] || o.ten_en || o.ten); ten = o.ten || o.ten_en; [muc, con] = NHOM_MUC[o.nhom] || NHOM_MUC.khac; }
    let m = map.get(khoa);
    if (!m) { m = { khoa, ten, muc, con, avatar: nv, lb, tenEn: o.ten_en || '', chiTiet: nv || tv ? (o.chi_tiet || '') : '', mau: [], vatLieu: [], kichThuoc: [], tuKhoa: [], xuatHien: [], anh: null, _ds: -1, soLuong: 0 }; map.set(khoa, m); }
    for (const c of o.mau || []) if (!m.mau.includes(c)) m.mau.push(c);
    if (o.vat_lieu && !m.vatLieu.includes(o.vat_lieu)) m.vatLieu.push(o.vat_lieu);
    if (o.kich_thuoc_stud && !m.kichThuoc.includes(o.kich_thuoc_stud)) m.kichThuoc.push(o.kich_thuoc_stud);
    for (const k of o.tu_khoa_store || []) if (!m.tuKhoa.includes(k)) m.tuKhoa.push(k);
    m.xuatHien.push({ video: o.video, dia_diem: o.dia_diem, diaDiemTen: o.dia_diem_ten, ten: o.ten, shot: o.shot });
    m.soLuong++;
    const ds = dienTich(o.khung);
    if (ds > m._ds) { m._ds = ds; m.anh = { video: o.video, shot: o.shot, khung: o.khung, diaDiem: o.dia_diem }; if (!l) m.ten = o.ten || m.ten; }
  }
  const sapMuc = Object.fromEntries(MUC.map((x, i) => [x.id, i]));
  return [...map.values()].sort((a, b) => sapMuc[a.muc] - sapMuc[b.muc] || a.ten.localeCompare(b.ten, 'vi')).map(({ _ds, ...r }) => r);
}

// ---------- tìm mẫu (có cache theo từ khoá) ----------
const SO_REQ = { tim: 0, catalog: 0, anh: 0 };
function demFetch() {
  const goc = globalThis.fetch;
  globalThis.fetch = (u, ...r) => { const s = String(u?.url || u); if (s.includes('assets:search')) SO_REQ.tim++; else if (s.includes('catalog.roblox.com')) SO_REQ.catalog++; else if (s.includes('thumbnails.roblox.com')) SO_REQ.anh++; return goc(u, ...r); };
}
const fCache = (tu) => path.join(CACHE, 'tim', bo(tu).slice(0, 80) + '.json');

const HANG_CAT = { luc: 0 };
/** Avatar Shop (catalog.roblox.com, công khai, KHÔNG gửi khoá): tóc/phụ kiện/áo quần, ưu tiên miễn phí–rẻ. */
export async function timCatalog(tu, { so = 30, loai = 'Accessories', giaMax = 100, mienPhi = false } = {}) {
  const lim = so <= 10 ? 10 : so <= 28 ? 28 : 30;   // Avatar Shop chỉ nhận Limit 10/28/30; muốn nhiều hơn thì đi theo nextPageCursor
  const q = new URLSearchParams({ Keyword: tu, Category: loai, Limit: String(lim), SortType: '0' });
  if (mienPhi) { q.set('MaxPrice', '0'); q.set('salesTypeFilter', '1'); } else if (giaMax != null) q.set('MaxPrice', String(giaMax));
  const kq = []; let cursor = '';
  for (let trang = 0; trang < Math.max(1, Math.ceil(so / lim)) && kq.length < so; trang++) {   // đi theo nextPageCursor tới khi đủ `so`
    let j = null;
    for (let lan = 0; lan < 6 && !j; lan++) {
      const cho = Math.max(0, HANG_CAT.luc + 1200 - Date.now()); HANG_CAT.luc = Date.now() + cho; if (cho) await new Promise((ok) => setTimeout(ok, cho));   // nối đuôi, cách nhau >= 1,2 s
      const qq = new URLSearchParams(q); if (cursor) qq.set('Cursor', cursor);
      const r = await fetch(`https://catalog.roblox.com/v1/search/items/details?${qq}`);
      if (r.ok) j = await r.json();
      else if (r.status === 429 || r.status >= 500) await new Promise((ok) => setTimeout(ok, 4000 * (lan + 1)));
      else throw new Error(`catalog HTTP ${r.status}`);
    }
    if (!j) { if (kq.length) break; throw new Error('catalog: hết lượt thử lại'); }
    for (const x of j.data || []) if ((x.itemType === 'Asset' || x.itemType === undefined) && !kq.some((y) => y.id === String(x.id))) kq.push({ id: String(x.id), ten: x.name || '', tacGia: x.creatorName || '', tamGiac: null, gia: x.priceStatus === 'Free' ? 0 : (x.price ?? x.lowestPrice ?? null), link: `https://www.roblox.com/catalog/${x.id}` });
    cursor = j.nextPageCursor || ''; if (!cursor) break;
  }
  return kq.slice(0, so);
}

export async function timTheoTuKhoa(tu, { so = 20, lamLai = false, timMau, avatar = false, loai = 'Model', tatCa = false } = {}) {
  const f = avatar ? fCache((tatCa ? 'catalogall-' : 'catalog-') + tu) : loai !== 'Model' ? fCache(loai + '-' + tu) : fCache(tu);
  let cu = null;
  if (!lamLai && fs.existsSync(f)) { try { cu = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {} }
  if (cu && (cu.so || 20) >= so && (!avatar || cu.mp)) return { mau: cu.mau, tuCache: true };
  let moi;   // nâng kho 20 → 30: tìm lại một lần, giữ thứ tự mẫu cũ, chỉ thêm mẫu còn thiếu
  if (avatar) { moi = (cu && (cu.so || 20) >= so) ? [] : await timCatalog(tu, { so, loai: avatar, giaMax: tatCa ? null : 100 }); moi = [...moi, ...await timCatalog(tu, { so: Math.min(so, 60), loai: avatar, mienPhi: true })]; }   // hai nguồn: ≤100 R$ và miễn phí
  else moi = (await timMau(tu, { so, loai })).map((x) => ({ id: x.id, ten: x.ten, tacGia: x.tacGia, tamGiac: x.tamGiac, thich: x.thich, link: x.link }));
  const mau = [...(cu?.mau || [])]; for (const x of moi) { const d = mau.find((y) => y.id === x.id); if (!d) mau.push(x); else if (x.gia === 0) d.gia = 0; }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ tuKhoa: tu, so, mp: !!avatar, luc: new Date().toISOString(), mau }));
  return { mau: avatar ? mau : mau.slice(0, Math.max(so, cu?.mau?.length || 0)), tuCache: false };
}

/** Mỗi món: thử từ khoá lần lượt, gộp bỏ trùng id, dừng khi đủ `so`; < toiThieu thì thử tiếp từ khoá kế (kể cả tên Anh). */
export async function timChoMon(m, opt) {
  const { so = 30, toiThieu = 10 } = opt;
  const ds = [...m.tuKhoa]; if (m.tenEn && !ds.map((x) => x.toLowerCase()).includes(m.tenEn.toLowerCase())) ds.push(m.tenEn);
  const mau = [], dung = [];
  for (const tu of ds.slice(0, 6)) {
    if (mau.length >= so) break;
    // từ khoá đầu luôn tìm; từ khoá kế chỉ thử khi chưa đủ `so` mà đã có thể thiếu (< toiThieu) hoặc còn cách xa so
    const r = await timTheoTuKhoa(tu, { ...opt, avatar: m.avatar ? (m.con === 'ao-quan' ? 'Clothing' : 'Accessories') : false, loai: m.muc === 'van' ? 'Decal' : 'Model' });
    dung.push(tu);
    for (const x of r.mau) if (!mau.some((y) => y.id === x.id)) mau.push(x);
    if (mau.length >= so) break;
    if (mau.length >= toiThieu && dung.length >= 2) break;
  }
  return { mau: mau.slice(0, so), tuKhoaDung: dung };
}

// ---------- ảnh ----------
const PY_ANH = `
import sys, json, base64, io
sys.path.insert(0, sys.argv[1])
from pathlib import Path
from PIL import Image
import thu_vien_map as T
job = json.load(sys.stdin); ra = {'cat': {}, 'thumb': 0}
for k, a in job['cat'].items():
    try:
        im = T.shot_img(Path(a['dir']), a['shot']); c = T.crop(im, a['khung'])
        if im is None and a.get('thay'):   # tập test (ep005t): không có khung video → ảnh Codex vẽ (hình shot, rồi ảnh bối cảnh)
            im = Image.open(a['thay']['path']).convert('RGB'); c = T.crop(im, a['khung']) if a['thay']['crop'] else None
        if c is None and im is not None: c = im
        if c is not None: ra['cat'][k] = T.b64(c, 260)
    except Exception as e: pass
out = Path(job['thumbDir']); out.mkdir(parents=True, exist_ok=True)
for id_, src in job['thumb'].items():
    d = out / (id_ + '.jpg')
    if d.exists(): continue
    try:
        im = Image.open(src).convert('RGBA'); bg = Image.new('RGB', im.size, (240, 240, 240)); bg.paste(im, mask=im.split()[3])
        bg.thumbnail((200, 200)); bg.save(d, 'JPEG', quality=78); ra['thumb'] += 1
    except Exception as e: pass
sys.stdout.write(json.dumps(ra))
`;

/** Không có khung video thì lấy ảnh Codex vẽ trong kich-ban/<tập>/: hình shot (cắt theo khung), rồi ảnh bối cảnh (cả ảnh). */
export function anhCodexThay(a, goc = path.join(ROOT, 'kich-ban')) {
  if (!a?.video) return null;
  const dir = path.join(goc, a.video), sid = String(a.shot || '');
  const ds = [];
  for (const vi of ['dau', 'giua', 'cuoi']) ds.push([path.join(dir, 'hinh', `shot_${sid}_${vi}.png`), true]);
  const bc = String(a.diaDiem || '').replace(new RegExp('^' + a.video + '-'), '');
  if (bc) for (const h of ['thang-mat', 'truoc', 'tren-xuong']) ds.push([path.join(dir, 'tham-chieu', `bc_${bc}_${h}.png`), false]);
  const t = ds.find(([f]) => fs.existsSync(f));
  return t ? { path: t[0], crop: t[1] } : null;
}

function taoAnh(mon, thumbs) {
  const job = { cat: {}, thumb: thumbs, thumbDir: path.join(DIST, 'thu-vien-asset-anh') };
  for (const m of mon) if (m.anh) job.cat[m.khoa] = { dir: path.join(GOC_MAP, m.anh.video), shot: m.anh.shot, khung: m.anh.khung, thay: anhCodexThay(m.anh) };
  const r = spawnSync('python', ['-I', '-c', PY_ANH, path.join(ROOT, 'tools')], { input: JSON.stringify(job), encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  // -I bỏ sys.path[0] nhưng ta chèn tools/ tường minh (mã của dự án, không phải dữ liệu tải về)
  if (r.status !== 0) throw new Error('python lỗi: ' + (r.stderr || '').slice(-400));
  return JSON.parse(r.stdout);
}

// ---------- dựng ----------
export async function dung(opt = {}) {
  const so = opt.so || 30, toiThieu = opt.toiThieu || 10;
  const dao = docDaoCu();
  const mon = gopMon(dao);
  const { timMau, taiAnhXemTruoc } = await import('./roblox.mjs');
  demFetch();
  const ket = new Map();
  const hang = [...mon]; let loiTim = 0;
  const chay = async () => {
    for (let m; (m = hang.shift());) {
      try { ket.set(m.khoa, await timChoMon(m, { so, toiThieu, lamLai: opt.lamLai, timMau })); }
      catch (e) { loiTim++; ket.set(m.khoa, { mau: [], tuKhoaDung: [], loi: e.message }); console.warn(`! ${m.ten}: ${e.message}`); }
    }
  };
  await Promise.all([chay(), chay(), chay()]);
  const ids = [...new Set([...ket.values()].flatMap((r) => r.mau.map((x) => x.id)))];
  const anh = await taiAnhXemTruoc(ids);
  const thumbs = Object.fromEntries(Object.entries(anh).map(([id, p]) => [id, path.join(ROOT, p)]));
  const ra = taoAnh(mon, thumbs);
  const du = mon.map((m) => {
    const r = ket.get(m.khoa) || { mau: [] };
    const mau = r.mau.filter((x) => thumbs[x.id] && fs.existsSync(path.join(DIST, 'thu-vien-asset-anh', x.id + '.jpg')));
    return { ...m, anhCat: ra.cat[m.khoa] || '', mauStore: mau, tuKhoaDung: r.tuKhoaDung, soTimDuoc: r.mau.length, loi: r.loi };
  });
  fs.mkdirSync(DIST, { recursive: true }); fs.mkdirSync(RA, { recursive: true });
  fs.mkdirSync(path.join(RA, 'cat'), { recursive: true });   // ảnh cắt từ video, để đính kèm khi nhờ Codex vẽ
  for (const m of du) if (m.anhCat.startsWith('data:image/jpeg;base64,')) fs.writeFileSync(path.join(RA, 'cat', m.khoa + '.jpg'), Buffer.from(m.anhCat.split(',')[1], 'base64'));
  const video = [...new Set(dao.map((o) => o.video))];
  const html = trang({ muc: MUC, mon: du, video, luc: new Date().toISOString() });
  const out = path.join(DIST, 'thu-vien-asset.html');
  fs.writeFileSync(out, html);
  const thongKe = {};
  for (const m of du) { const k = MUC.find((x) => x.id === m.muc).ten + ' / ' + MUC.find((x) => x.id === m.muc).con.find((c) => c[0] === m.con)[1]; thongKe[k] = (thongKe[k] || 0) + 1; }
  const tomTat = { daoCu: dao.length, mon: du.length, theoMuc: Object.fromEntries(MUC.map((x) => [x.ten, du.filter((m) => m.muc === x.id).length])), theoMucCon: thongKe,
    request: { timKiem: SO_REQ.tim, avatarShop: SO_REQ.catalog, anhXemTruoc: SO_REQ.anh, ghiChu: 'chỉ đếm request của lần chạy này; từ khoá đã có cache không tính' },
    duoi5: du.filter((m) => m.mauStore.length < 5).map((m) => ({ ten: m.ten, soMau: m.mauStore.length, tuKhoa: m.tuKhoaDung })),
    loiTim, trang: out, kichThuocMB: +(fs.statSync(out).size / 2 ** 20).toFixed(2) };
  fs.writeFileSync(path.join(RA, 'tom-tat.json'), JSON.stringify(tomTat, null, 1));
  return tomTat;
}

export function nhan(file) {
  const kq = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (kq.ung !== 'thu-vien-asset') throw new Error('không phải file kết quả của thư viện asset');
  const dir = path.join(RA, 'ket-qua'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `ket-qua_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify(kq, null, 1));
  const chon = Object.entries(kq.chon || {}).filter(([, v]) => v.mau?.length);
  return { file: f, soMonCoChon: chon.length, soMau: chon.reduce((s, [, v]) => s + v.mau.length, 0), canThem: kq.canThem || [], nhoCodex: kq.nhoCodex || [], nhoBlender: kq.nhoBlender || [] };
}

/** Món "Nhờ Codex vẽ" → bản nháp đề bài cho Claude hoàn thiện (mô tả cụ thể) rồi giao Codex theo docs/de-bai-codex-mau.md. */
export function soanDeCodex(file) {
  const kq = JSON.parse(fs.readFileSync(file, 'utf8'));
  const dir = path.join(RA, 'codex'); fs.mkdirSync(dir, { recursive: true });
  const cach = { van: 'Ảnh vân LIỀN MẠCH (seamless/tileable) vuông 1024×1024, nhìn thẳng chính diện, không bóng đổ, không viền, không phối cảnh; các cạnh đối nhau khớp liền. Phong cách sơn tay/Roblox, thấy rõ vân.',
    troi: 'Ảnh bầu trời toàn cảnh dạng equirectangular 2:1 (2048×1024), không có mặt đất, không nhân vật; mây và dải màu như mô tả. Phong cách hoạt hình sơn tay.',
    mac: 'Ảnh món đồ đơn lẻ, nền trơn sáng, nhìn chính diện 3/4, phong cách khối vuông Roblox (low poly), không nhân vật.' };
  const ra = [];
  for (const m of kq.nhoCodex || []) {
    const loai = m.muc === 'van' ? 'van' : m.muc === 'troi' ? 'troi' : 'mac';
    const f = path.join(dir, `de-bai-${bo(m.id)}.md`);
    const anh = path.join(RA, 'cat', m.id + '.jpg');
    fs.writeFileSync(f, `# Đề bài Codex — ${m.ten}

> BẢN NHÁP do tool dựng từ dữ liệu phân tích. Claude đọc ảnh tham chiếu rồi viết lại phần "Mô tả cụ thể" trước khi giao (docs/de-bai-codex-mau.md: gpt-6-luna, low, -i ảnh).

- Tên: ${m.ten} (${m.tenEn})
- Loại: ${m.loai || m.muc}
- Màu chủ đạo: ${(m.mau || []).join('; ')}
- Vật liệu: ${(m.vatLieu || []).join('; ')}
- Cỡ ô lặp / kích thước (stud): ${(m.coTu || []).join('; ') || 'không rõ'}
- Ảnh tham chiếu (cắt từ video): ${fs.existsSync(anh) ? anh : '(chưa có — chạy dung)'}

## Mô tả cụ thể (Claude hoàn thiện)
${m.moTa || '(thêm: hình dạng, chi tiết, hoạ tiết, ánh sáng)'}

## Yêu cầu hình
${cach[loai]}

## Ghi
Lưu ảnh vào output/thu-vien-asset/codex/${bo(m.id)}.png. Không chép ảnh tham chiếu nguyên xi; vẽ tài sản MỚI tương tự.
`);
    ra.push(f);
  }
  return ra;
}

/** Món "Nhờ Blender vẽ" → bản nháp đề bài cho Claude: xem ảnh tham chiếu (mẫu đã chọn + ảnh cắt từ video) rồi dùng Blender MCP dựng thử. */
export function soanDeBlender(file) {
  const kq = JSON.parse(fs.readFileSync(file, 'utf8'));
  const dir = path.join(RA, 'blender'); fs.mkdirSync(dir, { recursive: true });
  const ra = [];
  for (const m of kq.nhoBlender || []) {
    const f = path.join(dir, `de-bai-${bo(m.id)}.md`);
    const anh = path.join(RA, 'cat', m.id + '.jpg');
    const tc = (m.thamChieu || []).map((x) => {
      const local = path.join(DIST, 'thu-vien-asset-anh', String(x.id).replace(/[^\w.-]/g, '_') + '.jpg');
      return `  - ${x.ten} (${x.nguon}${x.gia ? ', ' + x.gia + ' R$' : ''}${x.tamGiac ? ', ' + x.tamGiac + ' tam giác' : ''}) — ${x.link}` + (/^\d+$/.test(String(x.id)) && fs.existsSync(local) ? `\n    ảnh: ${local}` : '');
    }).join('\n') ||'  - (chưa chọn mẫu tham chiếu — dùng ảnh cắt từ video)';
    fs.writeFileSync(f, `# Đề bài Blender — ${m.ten}

> BẢN NHÁP do tool dựng. Claude xem ảnh tham chiếu, viết thêm mô tả hình khối, rồi dựng thử bằng Blender MCP (Blender 5.1.2; Blender chỉ để dựng model, xuất GLB, không animation/ánh sáng/render cảnh). Nhập vào kho qua tools/nhap-model.mjs (assets/manifest.json). Ưu tiên low poly (docs/nhap-model.md).

- Tên: ${m.ten} (${m.tenEn})
- Loại: ${m.loai || m.muc}
- Màu chủ đạo: ${(m.mau || []).join('; ')}
- Vật liệu: ${(m.vatLieu || []).join('; ')}
- Cỡ (stud): ${(m.coTu || []).join('; ') || 'không rõ'}
- Ảnh cắt từ video: ${fs.existsSync(anh) ? anh : '(chưa có — chạy dung)'}
- Mẫu tham chiếu đã chọn (chỉ để NHÌN hình dáng; mẫu trả phí KHÔNG tải, KHÔNG chép nguyên — dựng bản MỚI tương tự):
${tc}

## Mô tả cụ thể (Claude hoàn thiện)
${m.moTa || '(thêm: hình dạng, tỉ lệ, chi tiết)'}

## Yêu cầu
Phong cách khối vuông Roblox (low poly, phẳng màu, đặt tên bộ phận rõ). Mặt trước nhìn +Z, 1 đơn vị = 1 stud. Xuất output/thu-vien-asset/blender/${bo(m.id)}.glb, chụp một ảnh xem thử đưa người dùng duyệt trước khi nhập kho.
`);
    ra.push(f);
  }
  return ra;
}

export function moMayChu({ cong = 8791, motLan = false } = {}) {
  const ok = (o) => o === undefined || o === 'null' || o === 'file://' || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o);
  let xong = false;
  const sv = http.createServer((req, res) => {
    const org = req.headers.origin;
    const cors = { 'Access-Control-Allow-Origin': org === undefined ? '*' : org, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store' };
    const tra = (ma, nd) => { res.writeHead(ma, { 'Content-Type': 'application/json', ...cors }); res.end(JSON.stringify(nd)); };
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host || '') || (org !== undefined && !ok(org))) return tra(403, { loi: 'không cho phép' });
    if (req.method === 'OPTIONS') { if (req.headers['access-control-request-private-network']) cors['Access-Control-Allow-Private-Network'] = 'true'; res.writeHead(204, cors); return res.end(); }
    if (req.method === 'GET' && req.url === '/ping') return tra(200, { ung: 'thu-vien-asset' });
    if (req.method === 'GET' && req.url.startsWith('/tim?')) {   // ô tìm từng món: từ khoá tự gõ → 30 mẫu + ảnh nhỏ
      const q = new URL(req.url, 'http://x').searchParams;
      const so = Math.min(400, Math.max(30, +q.get('so') || 100)), tu = (q.get('tu') || '').replace(/\s+/g, ' ').trim().slice(0, 80), muc = q.get('muc') || '', con = q.get('con') || '', av = q.get('av') === '1';
      if (tu.length < 2) return tra(400, { loi: 'từ khoá quá ngắn' });
      const ng = q.get('nguon') || 'roblox';
      if (ng !== 'roblox') {   // Sketchfab / Poly Pizza / Polyfork / Kenney: mẫu = [id, ten, tacGia, tamGiac, gia, anh, link, nguon, giayPhep]
        (async () => {
          const N = await import('./thu-vien-nguon.mjs');
          const tuTim = ng === 'sketchfab' && q.get('rb') !== '0' && !/roblox/i.test(tu) ? tu + ' roblox' : tu;   // Sketchfab: thêm chữ roblox (tắt được)
          const cd = path.join(ROOT, '.cache', 'thu-vien-asset', 'tim');
          let ds = await N.timNguon(ng, tuTim, { so, cacheDir: cd });
          if (tuTim !== tu && ds.length < 6) { const them = await N.timNguon(ng, tu, { so, cacheDir: cd }); ds = [...ds, ...them.filter((x) => !ds.some((y) => y.id === x.id))]; }   // chữ roblox làm mất kết quả: bổ sung kết quả không có chữ đó
          if (ng === 'kenney') await N.veAnhKenney(ds, path.join(DIST, 'thu-vien-asset-anh')).catch((e) => console.warn('! ' + e.message));
          const mau = ds.filter((x) => ng !== 'kenney' || fs.existsSync(path.join(DIST, 'thu-vien-asset-anh', x._file))).map((x) => [x.id, x.ten, x.tacGia, x.tamGiac, 0, x.anh, x.link, ng, x.gp]);
          console.log(`TIM[${ng}] "${tuTim}" -> ${mau.length} mau`);
          tra(200, { ok: true, tu: tuTim, nguon: ng, mau, con: ng !== 'kenney' && ds.length >= so * 0.8 && so < 400 });
        })().catch((e) => tra(500, { loi: e.message }));
        return;
      }
      (async () => {
        const { timMau, taiAnhXemTruoc } = await import('./roblox.mjs');
        const r = await timTheoTuKhoa(tu, { so, tatCa: true, timMau, avatar: av ? (con === 'ao-quan' ? 'Clothing' : 'Accessories') : false, loai: muc === 'van' ? 'Decal' : 'Model' });
        const anh = await taiAnhXemTruoc(r.mau.map((x) => x.id));
        taoAnh([], Object.fromEntries(Object.entries(anh).map(([id, p]) => [id, path.join(ROOT, p)])));
        const mau = r.mau.filter((x) => fs.existsSync(path.join(DIST, 'thu-vien-asset-anh', x.id + '.jpg')))
          .map((x) => [x.id, x.ten, x.tacGia, x.tamGiac ?? null, x.gia ?? (av ? null : 0)]);
        console.log(`TIM "${tu}" so=${so} -> ${mau.length} mau${r.tuCache ? ' (cache)' : ''}`);
        tra(200, { ok: true, tu, mau, con: r.mau.length >= so * 0.7 && so < 400 });
      })().catch((e) => tra(500, { loi: e.message }));
      return;
    }
    if (req.method === 'POST' && req.url === '/gui') {
      const b = []; let n = 0;
      req.on('data', (c) => { n += c.length; if (n < 4 * 2 ** 20) b.push(c); });
      req.on('end', () => {
        if (n >= 4 * 2 ** 20) return tra(413, { loi: 'quá 4 MB' });
        try {
          const tam = path.join(RA, '_nhan.json'); fs.mkdirSync(RA, { recursive: true });
          fs.writeFileSync(tam, Buffer.concat(b)); const r = nhan(tam); fs.rmSync(tam, { force: true });
          console.log(`DA-NHAN mon=${r.soMonCoChon} mau=${r.soMau} file=${r.file}`);
          tra(200, { ok: true, ...r, file: undefined });
          if (motLan && !xong) { xong = true; setTimeout(() => process.exit(0), 100); }
        } catch (e) { tra(400, { loi: e.message }); }
      });
      return;
    }
    tra(404, { loi: 'không có' });
  });
  const thu = (c) => { sv.once('error', (e) => { if (e.code === 'EADDRINUSE' && c < cong + 10) thu(c + 1); else throw e; }); sv.listen(c, '127.0.0.1', () => console.log(`MO http://127.0.0.1:${c}/ (chờ nút Gửi tới Claude)`)); };
  thu(cong);
}

// ---------- trang ----------
const jsonNhung = (o) => JSON.stringify(o).replace(/</g, '\u003c').split(' ').join('').split(' ').join('');
function trang(D) {
  const du = { muc: D.muc.map((m) => ({ id: m.id, ten: m.ten, con: m.con.map(([id, ten]) => ({ id, ten })) })), video: D.video, luc: D.luc,
    mon: D.mon.map((m) => ({ id: m.khoa, ten: m.ten, en: m.tenEn, muc: m.muc, con: m.con, mau: m.mau, vl: m.vatLieu, kt: m.kichThuoc, ct: m.anhCat, xh: m.xuatHien, sl: m.soLuong,
      mauStore: m.mauStore.map((x) => [x.id, x.ten, x.tacGia, x.tamGiac, x.gia ?? (m.avatar ? null : 0)]), av: !!m.avatar, lb: m.lb || '', ctNv: m.chiTiet || '', tk: (m.tuKhoaDung && m.tuKhoaDung[0]) || m.tenEn || m.ten })) };
  return TRANG.replace('/*__DATA__*/null', jsonNhung(du));
}

const TRANG = String.raw`<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Thư viện asset</title>
<style>
:root{--bg:#f6f5f2;--card:#fff;--ink:#1d1c1a;--mut:#6b6862;--line:#e3e0d8;--acc:#2f6fed;--accbg:#e7efff;--ok:#1f9d55;--okbg:#e3f6ea;--warn:#c2410c;--warnbg:#ffecdf}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#15161a;--card:#1f2127;--ink:#ecebe7;--mut:#9a98a0;--line:#31343c;--acc:#7aa2ff;--accbg:#22304f;--ok:#4ade80;--okbg:#17321f;--warn:#fb923c;--warnbg:#3a2415}}
:root[data-theme=dark]{--bg:#15161a;--card:#1f2127;--ink:#ecebe7;--mut:#9a98a0;--line:#31343c;--acc:#7aa2ff;--accbg:#22304f;--ok:#4ade80;--okbg:#17321f;--warn:#fb923c;--warnbg:#3a2415}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;padding:0 16px 96px}
.wrap{max-width:1100px;margin:0 auto}
header{padding:16px 0 8px}h1{font-size:20px;margin:0 0 4px}.mut{color:var(--mut);font-size:13px}
nav{position:sticky;top:0;background:var(--bg);padding:8px 0;border-bottom:1px solid var(--line);z-index:5;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
nav a{color:var(--ink);text-decoration:none;font-size:13px;padding:5px 10px;border:1px solid var(--line);border-radius:99px;background:var(--card);white-space:nowrap}
nav .gap{flex:1}
h2{font-size:18px;margin:26px 0 4px}h3{font-size:14px;margin:14px 0 6px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}
.mon{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;margin:10px 0;display:grid;grid-template-columns:230px 1fr;gap:14px}
.mon>*,.tr>*{min-width:0}.kv,.tr h4,details{overflow-wrap:anywhere}
.mon.co-chon{border-color:var(--ok)}
.tr .ct{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:var(--line);display:block}
.tr h4{margin:8px 0 2px;font-size:15px}.tr .en{color:var(--mut);font-size:12px}
.kv{font-size:12px;color:var(--mut);margin-top:6px;line-height:1.5}.sw{display:inline-block;width:12px;height:12px;border-radius:3px;border:1px solid var(--line);vertical-align:-2px;margin-right:3px}
details{font-size:12px;color:var(--mut);margin-top:6px}
.ph .bar{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
button{font:inherit;font-size:13px;padding:7px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer;min-height:36px}
button.chinh{background:var(--acc);color:#fff;border-color:var(--acc)}button.on{background:var(--warnbg);border-color:var(--warn);color:var(--warn)}
.luoi{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.mau{min-width:0;width:100%;border:2px solid var(--line);border-radius:10px;padding:6px;background:var(--bg);cursor:pointer;text-align:left;display:block;position:relative;min-height:0}
.mau img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;display:block;background:var(--line)}
.mau .n{font-size:11px;font-weight:600;margin-top:4px;line-height:1.25;max-height:2.5em;overflow:hidden}.mau .m{font-size:10.5px;color:var(--mut);line-height:1.3;word-break:break-all}
.mau.chon{border-color:var(--ok);background:var(--okbg)}.mau.chon::after{content:"✓";position:absolute;top:4px;right:6px;background:var(--ok);color:#fff;border-radius:99px;width:20px;height:20px;text-align:center;font-size:13px;line-height:20px}
.da{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px}.da .chip{display:flex;gap:6px;align-items:center;border:1px solid var(--ok);background:var(--okbg);border-radius:8px;padding:3px 8px 3px 3px;cursor:pointer}
.da .chip img{width:32px;height:32px;border-radius:5px;object-fit:cover}
.lk{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.6);color:#fff;border-radius:99px;width:24px;height:24px;text-align:center;line-height:24px;text-decoration:none;font-size:14px}.lk.nho{position:static;display:inline-block;width:18px;height:18px;line-height:18px;font-size:11px;background:var(--acc)}
.gia{display:inline-block;font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:99px;margin-top:3px;background:var(--line)}.gia.mp{background:var(--okbg);color:var(--ok)}.gia.tp{background:var(--warnbg);color:var(--warn)}
.mpl{font-size:13px;display:flex;gap:4px;align-items:center;border:1px solid var(--line);border-radius:99px;padding:4px 10px;background:var(--card)}
.pn{border:1px solid var(--line);border-radius:10px;padding:8px;margin-bottom:8px}.pnt{font-size:12px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}
.pb{border:1px dashed var(--warn);border-radius:10px;padding:8px;margin-top:8px}.pbta{width:100%;font:12px/1.45 ui-monospace,Consolas,monospace;padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);resize:vertical;margin-bottom:6px}
.pager{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-top:8px}button.pg{min-width:34px;padding:5px 8px}button.pg.on{background:var(--acc);color:#fff;border-color:var(--acc)}
.tkrow{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap}.tkin{flex:1;min-width:140px;font:inherit;font-size:13px;padding:7px 10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);min-height:36px}
.trong{color:var(--mut);font-size:13px;padding:14px;border:1px dashed var(--line);border-radius:10px}
.foot{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);padding:10px 16px;z-index:9}
.foot .in{max-width:1100px;margin:0 auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#tb{display:none;margin:8px 0;padding:10px 12px;border-radius:8px;font-size:13px;background:var(--accbg)}
@media (max-width:720px){nav{position:static}.mon{grid-template-columns:minmax(0,1fr)}.tr{display:grid;grid-template-columns:110px minmax(0,1fr);gap:10px}.tr .ct{aspect-ratio:1}.luoi{grid-template-columns:repeat(2,minmax(0,1fr))}.mau .n{font-size:12px}}
</style>
</head>
<body>
<div class="wrap">
<header><h1>Thư viện asset</h1><div class="mut" id="gt"></div><div id="tb"></div></header>
<nav id="muc"></nav>
<main id="main"></main>
</div>
<div class="foot"><div class="in">
<span id="dem" class="mut" style="flex:1"></span>
<button id="luu">Lưu file JSON</button><button id="gui" class="chinh">Gửi tới Claude</button><span id="ghi" class="mut"></span>
</div></div>
<script>
const D=/*__DATA__*/null;
const KEY='thu-vien-asset:v1';
const SO=10;
let S={chon:{},trang:{},can:{},cdx:{},bld:{},mp:true,tk:{},tim:{},src:{roblox:true,sketchfab:true,polypizza:true,polyfork:true,kenney:true},nt:{},pg:{},rb:true,v2:0};
const ST={};   // trạng thái ô tìm từng món: '...' đang tìm / thông báo lỗi
try{const r=localStorage.getItem(KEY);if(r)S=Object.assign(S,JSON.parse(r))}catch(e){}
if(!S.v2){for(const k of Object.keys(S.nt))if(k.endsWith('|sketchfab'))delete S.nt[k];S.v2=1}   // Sketchfab giờ tự thêm chữ roblox: bỏ kết quả cũ
const luu=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const E=(t,a,...k)=>{const e=document.createElement(t);for(const[x,v]of Object.entries(a||{})){if(v===undefined||v===null)continue;if(x==='class')e.className=v;else if(x.startsWith('on'))e[x]=v;else e.setAttribute(x,v)}for(const c of k.flat())if(c!=null)e.append(c.nodeType?c:document.createTextNode(c));return e};
const IMG=id=>'thu-vien-asset-anh/'+id+'.jpg';
const MON=Object.fromEntries(D.mon.map(m=>[m.id,m]));
const slChon=()=>Object.values(S.chon).reduce((s,o)=>s+Object.keys(o).length,0);
function cap(){document.getElementById('dem').textContent='Đã chọn '+slChon()+' mẫu ở '+Object.values(S.chon).filter(o=>Object.keys(o).length).length+' món · cần thêm mẫu: '+Object.values(S.can).filter(Boolean).length}
function tick(id,x){ // x=[id,ten,tacGia,tamGiac]
  const o=S.chon[id]||(S.chon[id]={});
  if(o[x[0]])delete o[x[0]];else o[x[0]]={ten:x[1],tacGia:x[2],tamGiac:x[3],gia:x[4],anh:x[5],link:x[6],nguon:x[7],gp:x[8]};
  luu();veLai(id)}
async function timMon(m,tu,so){
  so=so||60;
  tu=(tu||'').trim();if(tu.length<2){ST[m.id]='Từ khoá quá ngắn';veLai(m.id);return}
  S.tk[m.id]=tu;ST[m.id]='...';luu();veLai(m.id);
  try{const g=await tim();
    if(!g){ST[m.id]='Cần bật máy chủ: chạy node tools/thu-vien-asset.mjs mo rồi bấm Tìm lại';return}
    const r=await fetch(g+'/tim?tu='+encodeURIComponent(tu)+'&muc='+encodeURIComponent(m.muc)+'&con='+encodeURIComponent(m.con)+'&av='+(m.av?1:0)+'&so='+so,{cache:'no-store',signal:AbortSignal.timeout(300000)});
    const j=await r.json();if(!r.ok)throw new Error(j.loi||('HTTP '+r.status));
    if(!j.mau.length){ST[m.id]='Không có mẫu cho "'+tu+'" — thử từ khoá khác';return}
    const old=S.tim[m.id];S.tim[m.id]={tu:j.tu,mau:j.mau,con:j.con,so};if(!(old&&old.tu===j.tu))S.pg[m.id]=0;delete ST[m.id]}
  catch(e){ST[m.id]='Tìm lỗi: '+e.message}
  finally{if(ST[m.id]==='...')delete ST[m.id];luu();veLai(m.id)}}
function veLai(id){const cu=document.getElementById('m-'+id);if(cu)cu.replaceWith(hang(MON[id]));cap()}
function tg(n){return n==null?'?':n>=1000?(n/1000).toFixed(1).replace('.0','')+'k':String(n)}
const URLX=(m,id)=>(m.av?'https://www.roblox.com/catalog/':'https://create.roblox.com/store/asset/')+id;
function lk(m,id,nho){return E('a',{class:'lk'+(nho?' nho':''),href:URLX(m,id),target:'_blank',rel:'noopener noreferrer',title:'Mở trang món này trên Roblox',onclick:e=>e.stopPropagation()},'↗')}
function lkU(h,nho){return E('a',{class:'lk'+(nho?' nho':''),href:h,target:'_blank',rel:'noopener noreferrer',title:'Mở trang món này',onclick:e=>e.stopPropagation()},'↗')}
function gia(g){return g===0?E('span',{class:'gia mp'},'Miễn phí'):g==null?E('span',{class:'gia'},'giá ?'):E('span',{class:'gia tp'},g+' R$ · trả phí')}
const NG=[{id:'sketchfab',ten:'Sketchfab'},{id:'polypizza',ten:'Poly Pizza'},{id:'polyfork',ten:'Polyfork'},{id:'kenney',ten:'Kenney (trong máy)'}];
const NGT={roblox:'Roblox',sketchfab:'Sketchfab',polypizza:'Poly Pizza',polyfork:'Polyfork',kenney:'Kenney'};
let HANG=Promise.resolve();   // xếp hàng: mỗi lần một yêu cầu tìm tới máy chủ
function timNg(m,g,tu,tay,so){
  so=so||30;
  const k=m.id+'|'+g.id;tu=(tu||'').trim();
  if(tu.length<2){ST[k]='Từ khoá quá ngắn';veLai(m.id);return}
  if(ST[k]==='...')return;
  S.tk[k]=tu;ST[k]='...';luu();if(tay)veLai(m.id);
  HANG=HANG.then(async()=>{
    try{const h=await tim();
      if(!h){ST[k]='Cần bật máy chủ: node tools/thu-vien-asset.mjs mo';return}
      const r=await fetch(h+'/tim?nguon='+g.id+'&tu='+encodeURIComponent(tu)+'&muc='+encodeURIComponent(m.muc)+'&con='+encodeURIComponent(m.con)+'&so='+so+(g.id==='sketchfab'?'&rb='+(S.rb?1:0):''),{cache:'no-store',signal:AbortSignal.timeout(300000)});
      const j=await r.json();if(!r.ok)throw new Error(j.loi||('HTTP '+r.status));
      if(!j.mau.length)ST[k]='Không có mẫu cho "'+tu+'" — thử từ khoá khác';
      else{const old=S.nt[k];S.nt[k]={tu:j.tu,mau:j.mau,con:j.con,so};if(!(old&&old.tu===j.tu))S.pg[k]=0;delete ST[k]}}
    catch(e){ST[k]='Tìm lỗi: '+e.message}
    finally{if(ST[k]==='...')delete ST[k];luu();veLai(m.id)}})}
const OB=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){OB.unobserve(e.target);const f=e.target._tu;if(f)f()}},{rootMargin:'300px'}):null;
function pagerEl(k,id,n,con,more){
  const np=Math.max(1,Math.ceil(n/SO)),cur=Math.min(S.pg[k]||0,np-1);
  const go=p=>()=>{S.pg[k]=p;luu();veLai(id)};
  const nut=(t,p,on,dis)=>E('button',{class:'pg'+(on?' on':''),disabled:dis?'':undefined,'aria-label':'Trang '+(p+1),'aria-current':on?'page':undefined,onclick:go(p)},t);
  const ds=new Set([0,np-1]);for(let i=cur-2;i<=cur+2;i++)if(i>=0&&i<np)ds.add(i);
  const bar=E('div',{class:'pager'},nut('‹',Math.max(0,cur-1),false,cur===0));
  let last=-1;for(const p of [...ds].sort((a,b)=>a-b)){if(p-last>1)bar.append(E('span',{class:'mut'},'…'));bar.append(nut(String(p+1),p,p===cur));last=p}
  bar.append(nut('›',Math.min(np-1,cur+1),false,cur>=np-1));
  bar.append(E('span',{class:'mut'},np+' trang · '+n+' mẫu'));
  if(con)bar.append(E('button',{title:'Tìm sâu thêm kết quả từ nguồn',onclick:more},'Tải thêm ▸'));
  return bar}
function panel(m,g){
  const k=m.id+'|'+g.id,r=S.nt[k],n=r?r.mau.length:0,np=Math.max(1,Math.ceil(n/SO)),pg=Math.min(S.pg[k]||0,np-1),off=pg*SO,dt=ST[k]||'',ch=S.chon[m.id]||{};
  const hien=n?r.mau.slice(off,off+SO):[];
  const o=E('input',{type:'search',class:'tkin',value:S.tk[k]!==undefined?S.tk[k]:m.tk,placeholder:'từ khoá tìm (tiếng Anh)',maxlength:'80','aria-label':g.ten+': từ khoá cho '+m.ten,oninput:e=>{S.tk[k]=e.target.value;luu()},onkeydown:e=>{if(e.key==='Enter'){e.preventDefault();timNg(m,g,e.target.value,true)}}});
  const p=E('div',{class:'pn'},E('div',{class:'pnt'},g.ten),
    E('div',{class:'tkrow'},o,E('button',{class:'chinh',disabled:dt==='...'?'':undefined,onclick:()=>timNg(m,g,o.value,true)},dt==='...'?'Đang tìm…':'Tìm'),
      g.id==='sketchfab'?E('label',{class:'mut',title:'Tự thêm chữ roblox vào từ khoá khi tìm trên Sketchfab'},E('input',{type:'checkbox',checked:S.rb?'':undefined,onchange:e=>{S.rb=e.target.checked;luu()}}),' + roblox'):null,
      n?E('span',{class:'mut'},'Mẫu '+(off+1)+'–'+Math.min(off+SO,n)+' / '+n+(r.tu&&r.tu!==o.value?' · đã tìm: '+r.tu:'')):null,
      dt&&dt!=='...'?E('span',{class:'mut',style:'color:var(--warn)'},dt):null));
  if(n)p.append(E('div',{class:'luoi'},...hien.map(x=>E('div',{class:'mau'+(ch[x[0]]?' chon':''),role:'button',tabindex:'0',onclick:()=>tick(m.id,x),onkeydown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tick(m.id,x)}},title:x[1]},
    E('img',{src:x[5],alt:x[1],loading:'lazy'}),lkU(x[6]),E('div',{class:'n'},x[1]||'(không tên)'),E('div',{class:'m'},(x[2]||'?')+(x[3]?' · '+tg(x[3])+' tam giác':'')),E('span',{class:'gia mp'},x[8]||'')))));
  else if(dt!=='...'&&!dt)p.append(E('div',{class:'trong'},'Chưa có kết quả — đang chờ tìm (hoặc bấm Tìm).'));
  if(n)p.append(pagerEl(k,m.id,n,r.con,()=>timNg(m,g,S.tk[k]!==undefined?S.tk[k]:m.tk,true,(r.so||30)+100)));
  if(!n&&!dt&&OB){p._tu=()=>timNg(m,g,S.tk[k]!==undefined?S.tk[k]:m.tk,false);OB.observe(p)}
  return p}
function promptBlender(m){
  const ch=S.chon[m.id]||{},ds=Object.entries(ch);
  const tc=ds.length?ds.map(([id,v])=>'- '+(v.ten||id)+' ('+(NGT[v.nguon]||(m.av?'Avatar Shop':'Roblox Creator Store'))+(v.gia?', '+v.gia+' R$ trả phí':'')+(v.tamGiac?', '+v.tamGiac+' tam giác':'')+') — '+(v.link||URLX(m,id))+(/^\d+$/.test(id)?'\n  ảnh xem trước: S:/3JS Studio/dist/thu-vien-asset-anh/'+id+'.jpg':'')).join('\n'):'- (chưa chọn mẫu tham chiếu — dùng ảnh cắt từ video)';
  return ['Hãy dùng Blender MCP (Blender 5.1.2) dựng thử cho tôi một model 3D low poly cho dự án S:/3JS Studio. Đọc docs/nhap-model.md trước (quy ước nhập model).','',
    'MÓN: '+m.ten+(m.en?' ('+m.en+')':''),
    m.ctNv?'Mô tả: '+m.ctNv:null,
    'Màu chủ đạo: '+m.mau.join('; '),'Vật liệu: '+m.vl.join('; '),'Cỡ (stud): '+(m.kt.join('; ')||'không rõ'),
    'Ảnh cắt từ video: S:/3JS Studio/output/thu-vien-asset/cat/'+m.id+'.jpg (nếu chưa có, chạy: node tools/thu-vien-asset.mjs dung)','',
    'MẪU THAM CHIẾU tôi đã chọn (chỉ để NHÌN hình dáng, tỉ lệ, màu; mẫu trả phí thì KHÔNG tải, KHÔNG chép nguyên — dựng bản MỚI tương tự):',tc,'',
    'YÊU CẦU: phong cách khối vuông Roblox, low poly, phẳng màu, đặt tên rõ từng bộ phận; mặt trước nhìn +Z, 1 đơn vị = 1 stud. Blender chỉ để dựng model (không animation, ánh sáng, render cảnh).',
    'Xuất GLB vào output/thu-vien-asset/blender/'+m.id+'.glb và chụp một ảnh xem thử (lưu ra file, đừng dán vào chat) để tôi duyệt. CHƯA nhập kho.',
    'Đạt khi: có file GLB và ảnh xem thử có hình khối + màu gần với mẫu tham chiếu. Dừng khi: đưa ảnh xem thử cho tôi duyệt.'].filter(x=>x!==null).join('\n')}
function boxPrompt(m){
  const ta=E('textarea',{class:'pbta',readonly:'',rows:'9','aria-label':'Prompt giao Claude dựng bằng Blender'});ta.value=promptBlender(m);
  const gh=E('span',{class:'mut'});
  const sao=E('button',{class:'chinh',onclick:async()=>{try{await navigator.clipboard.writeText(ta.value);gh.textContent='Đã sao chép — dán cho Claude'}catch(e){ta.select();document.execCommand('copy');gh.textContent='Đã chọn sẵn — bấm Ctrl+C rồi dán cho Claude'}}},'Sao chép prompt');
  return E('div',{class:'pb'},E('div',{class:'pnt'},'Prompt giao Claude dựng bằng Blender (cập nhật theo mẫu bạn chọn)'),ta,E('div',{class:'tkrow'},sao,gh))}
function hang(m){
  const goc=S.tim[m.id]?S.tim[m.id].mau:m.mauStore;
  const ch=S.chon[m.id]||{},nch=Object.keys(ch).length,pool=S.mp?goc.filter(x=>x[4]===0):goc,n=pool.length;
  const np=Math.max(1,Math.ceil(n/SO)),pg=Math.min(S.pg[m.id]||0,np-1),off=pg*SO;
  const hien=n?pool.slice(off,off+SO):[];
  const tr=E('div',{class:'tr'},
    E('img',{class:'ct',src:m.ct||'',alt:m.ten,loading:'lazy'}),
    E('div',null,E('h4',null,m.ten,...[...new Set(m.xh.map(x=>x.video))].map(v=>E('span',{class:'chip',style:'margin-left:6px;font-size:11px;font-weight:600'},v))),E('div',{class:'en'},m.en),m.ctNv?E('div',{class:'kv'},m.ctNv):null,
      E('div',{class:'kv'},E('div',null,...m.mau.slice(0,4).map(c=>E('span',null,E('span',{class:'sw',style:'background:'+(c.match(/#[0-9a-fA-F]{3,8}/)||['#ccc'])[0]}),c.replace(/#[0-9a-fA-F]{3,8}\s*/,'')+' '))),
        E('div',null,'Vật liệu: '+m.vl.slice(0,2).join(' · ')),E('div',null,'Cỡ: '+m.kt.slice(0,3).join(' · ')+' stud')),
      E('details',null,E('summary',null,'Xuất hiện '+m.xh.length+' lần'),...m.xh.map(x=>E('div',null,x.video+' · '+x.diaDiemTen+' · '+x.shot)))));
  const ph=E('div',{class:'ph'}),rb=E('div',{class:'pn'});
  const bar=E('div',{class:'bar'},
    E('span',{class:'mut'},n?('Mẫu '+(off+1)+'–'+(Math.min(off+SO,n))+' / '+n+(S.mp?' miễn phí':'')):(S.mp&&m.mauStore.length?'Không có mẫu miễn phí — tắt "Chỉ miễn phí" để xem '+m.mauStore.length+' mẫu trả phí':'Chưa có mẫu')),
    E('span',{style:'flex:1'}),
    E('button',{class:S.can[m.id]?'on':'',onclick:()=>{S.can[m.id]=!S.can[m.id];luu();veLai(m.id)}},S.can[m.id]?'✓ Cần thêm mẫu':'Cần thêm mẫu'),
    E('button',{class:S.cdx[m.id]?'on':'',title:'Không có / không tải được mẫu hợp ý: nhờ Claude giao Codex vẽ tài sản (texture…) tương tự',onclick:()=>{S.cdx[m.id]=!S.cdx[m.id];luu();veLai(m.id)}},S.cdx[m.id]?'✓ Nhờ Codex vẽ':'Nhờ Codex vẽ'),
    E('button',{class:S.bld[m.id]?'on':'',title:'Chọn mẫu tham chiếu (thường là mẫu trả phí) rồi bấm: Claude dùng Blender MCP dựng thử bản tương tự',onclick:()=>{S.bld[m.id]=!S.bld[m.id];luu();veLai(m.id)}},S.bld[m.id]?'✓ Nhờ Blender vẽ':'Nhờ Blender vẽ'));
  rb.append(E('div',{class:'pnt'},'Roblox Creator Store'),bar);
  const tk=S.tk[m.id]!==undefined?S.tk[m.id]:m.tk,dt=ST[m.id]||'';
  const o=E('input',{type:'search',class:'tkin',value:tk,placeholder:'từ khoá tìm (tiếng Anh)',maxlength:'80','aria-label':'Từ khoá tìm cho '+m.ten,oninput:e=>{S.tk[m.id]=e.target.value;luu()},onkeydown:e=>{if(e.key==='Enter'){e.preventDefault();timMon(m,e.target.value)}}});
  rb.append(E('div',{class:'tkrow'},o,
    E('button',{class:'chinh',disabled:dt==='...'?'':undefined,onclick:()=>timMon(m,o.value)},dt==='...'?'Đang tìm…':'Tìm'),
    S.tim[m.id]?E('button',{onclick:()=>{delete S.tim[m.id];delete S.tk[m.id];delete ST[m.id];S.pg[m.id]=0;luu();veLai(m.id)}},'Về mẫu gốc'):null,
    dt&&dt!=='...'?E('span',{class:'mut',style:'color:var(--warn)'},dt):S.tim[m.id]?E('span',{class:'mut'},'đang xem kết quả của "'+S.tim[m.id].tu+'"'):null));
  if(!n)rb.append(E('div',{class:'trong'},S.mp&&m.mauStore.length?'Không có mẫu miễn phí cho món này.':'Creator Store không có mẫu miễn phí phù hợp — đánh dấu "Cần thêm mẫu" để Claude tìm bằng từ khoá khác.'));
  else rb.append(E('div',{class:'luoi'},...hien.map(x=>E('div',{class:'mau'+(ch[x[0]]?' chon':''),role:'button',tabindex:'0',onclick:()=>tick(m.id,x),onkeydown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tick(m.id,x)}},title:x[1]},
    E('img',{src:IMG(x[0]),alt:x[1],loading:'lazy'}),lk(m,x[0]),E('div',{class:'n'},x[1]||'(không tên)'),E('div',{class:'m'},(x[2]||'?')+' · '+x[0]+' · '+(m.av?'Avatar Shop':m.lb?m.lb:tg(x[3])+' tam giác')),gia(x[4])))));
  if(n)rb.append(pagerEl(m.id,m.id,n,S.tim[m.id]?S.tim[m.id].con:true,()=>timMon(m,S.tk[m.id]!==undefined?S.tk[m.id]:m.tk,(S.tim[m.id]?S.tim[m.id].so:30)+100)));
  const da=E('div',{class:'da'},E('b',null,'Đã chọn ('+nch+'):'));
  if(!nch)da.append(E('span',{class:'mut'},'chưa chọn mẫu nào'));
  for(const[id,v]of Object.entries(ch))da.append(E('span',{class:'chip',title:'Bấm để bỏ chọn',onclick:()=>tick(m.id,[id,v.ten,v.tacGia,v.tamGiac,v.gia,v.anh,v.link,v.nguon,v.gp])},E('img',{src:v.anh||IMG(id),alt:''}),(v.ten||id).slice(0,26),lkU(v.link||URLX(m,id),true)));
  if(S.src.roblox)ph.append(rb);
  for(const g of NG)if(S.src[g.id])ph.append(panel(m,g));
  ph.append(da);
  if(S.bld[m.id])ph.append(boxPrompt(m));
  return E('section',{class:'mon'+(nch?' co-chon':''),id:'m-'+m.id},tr,ph)}
function ve(){
  const nav=document.getElementById('muc'),main=document.getElementById('main');
  const TAP=new URLSearchParams(location.search).get('tap')||'';   // lọc theo tập/video: ?tap=ep005t
  const coTap=m=>!TAP||m.xh.some(x=>x.video===TAP);
  nav.append(E('label',{class:'mpl',style:'font-weight:600'},'Tập: ',E('select',{'aria-label':'Lọc theo tập',onchange:e=>{const u=new URL(location.href);e.target.value?u.searchParams.set('tap',e.target.value):u.searchParams.delete('tap');location.href=u.href}},
    E('option',{value:''},'Tất cả ('+D.mon.length+')'),...D.video.map(v=>E('option',{value:v,selected:v===TAP?'':undefined},v+' ('+D.mon.filter(m=>m.xh.some(x=>x.video===v)).length+')')))));
  for(const mc of D.muc){
    const ds=D.mon.filter(m=>m.muc===mc.id&&coTap(m));if(!ds.length)continue;
    nav.append(E('a',{href:'#'+mc.id},mc.ten+' '+ds.length));
    main.append(E('h2',{id:mc.id},mc.ten+' ('+ds.length+')'));
    for(const c of mc.con){const dc=ds.filter(m=>m.con===c.id);if(!dc.length)continue;
      if(mc.con.length>1)main.append(E('h3',null,c.ten+' · '+dc.length));
      for(const m of dc)main.append(hang(m))}}
  nav.append(E('span',{class:'gap'}),...[{id:'roblox',ten:'Roblox'},...NG].map(g=>E('label',{class:'mpl'},E('input',{type:'checkbox','data-src':g.id,checked:S.src[g.id]?'':undefined,onchange:e=>{S.src[g.id]=e.target.checked;luu();for(const x of D.mon)veLai(x.id)}}),' '+g.ten)),E('label',{class:'mpl'},E('input',{type:'checkbox',id:'mp',checked:S.mp?'':undefined,onchange:e=>{S.mp=e.target.checked;luu();for(const m of D.mon)veLai(m.id)}}),' Chỉ miễn phí'),E('a',{href:'#',onclick:e=>{e.preventDefault();const r=document.documentElement;const d=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme:dark)').matches);r.dataset.theme=d?'light':'dark'}},'◐ Sáng/tối'));
  document.getElementById('gt').textContent=D.mon.length+' món từ '+D.video.join(', ')+' · 10 mẫu mỗi trang, bấm số trang để lật; "Tải thêm" tìm sâu hơn · chọn được nhiều mẫu';
  cap()}
function ketQua(){
  const chon={};for(const[id,o]of Object.entries(S.chon)){if(!MON[id]||!Object.keys(o).length)continue;chon[id]={ten:MON[id].ten,tenEn:MON[id].en,muc:MON[id].muc,con:MON[id].con,mau:Object.entries(o).map(([i,v])=>({id:i,ten:v.ten,tacGia:v.tacGia,tamGiac:v.tamGiac,gia:v.gia,nguon:v.nguon||(MON[id].av?'avatar-shop':'creator-store'),giayPhep:v.gp||'',loai:MON[id].lb||'',link:v.link||((MON[id].av?'https://www.roblox.com/catalog/':'https://create.roblox.com/store/asset/')+i)}))}}
  const can=Object.keys(S.can).filter(k=>S.can[k]&&MON[k]);
  const cdx=Object.keys(S.cdx).filter(k=>S.cdx[k]&&MON[k]);
  const bld=Object.keys(S.bld).filter(k=>S.bld[k]&&MON[k]);
  const chua=D.mon.filter(m=>!chon[m.id]&&!can.includes(m.id)&&!cdx.includes(m.id)&&!bld.includes(m.id)).map(m=>m.id);
  return JSON.stringify({ung:'thu-vien-asset',video:D.video,luc:new Date().toISOString(),chon,canThem:can.map(k=>({id:k,ten:MON[k].ten,tuKhoa:MON[k].en})),nhoCodex:cdx.map(k=>({id:k,ten:MON[k].ten,tenEn:MON[k].en,muc:MON[k].muc,loai:MON[k].lb||'',mau:MON[k].mau,vatLieu:MON[k].vl,coTu:MON[k].kt,moTa:MON[k].ctNv})),nhoBlender:bld.map(k=>({id:k,ten:MON[k].ten,tenEn:MON[k].en,muc:MON[k].muc,loai:MON[k].lb||'',mau:MON[k].mau,vatLieu:MON[k].vl,coTu:MON[k].kt,moTa:MON[k].ctNv,thamChieu:chon[k]?chon[k].mau:[]})),chuaChon:chua},null,1)}
const tb=document.getElementById('tb'),ghi=document.getElementById('ghi'),bGui=document.getElementById('gui');
const bao=(t,mau)=>{tb.style.display='block';tb.style.background=mau||'';tb.textContent=t};
function luuFile(){const a=E('a',{href:URL.createObjectURL(new Blob([ketQua()],{type:'application/json'})),download:'thu-vien-asset_ket-qua.json'});document.body.append(a);a.click();a.remove()}
document.getElementById('luu').onclick=()=>{luuFile();bao('Đã tải file JSON kết quả.')};
const CONG=Array.from({length:11},(_,i)=>'http://127.0.0.1:'+(8791+i));
async function hoi(g){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),800);try{const r=await fetch(g+'/ping',{signal:ac.signal,cache:'no-store'});if(!r.ok)return false;const j=await r.json();return j&&j.ung==='thu-vien-asset'}catch(e){return false}finally{clearTimeout(t)}}
async function tim(){for(const g of CONG)if(await hoi(g))return g;return null}
async function san(){const g=await tim();ghi.textContent=g?'Claude đang chờ nhận':'chưa bật nhận — bấm vẫn lưu file'}
bGui.onclick=async()=>{bGui.disabled=true;try{const g=await tim();
  if(!g){luuFile();bao('Claude chưa bật chế độ nhận (node tools/thu-vien-asset.mjs mo). Đã tải file JSON — đưa file đó cho Claude.','var(--warnbg)');return}
  const r=await fetch(g+'/gui',{method:'POST',headers:{'Content-Type':'application/json'},body:ketQua()});
  if(!r.ok)throw new Error('máy chủ trả '+r.status);
  const j=await r.json();bao('Đã gửi: '+j.soMau+' mẫu ở '+j.soMonCoChon+' món.','var(--okbg)')}
  catch(e){luuFile();bao('Gửi lỗi: '+e.message+'. Đã tải file JSON.','var(--warnbg)')}finally{bGui.disabled=false}};
ve();san();setInterval(san,15000);
window.__tv={ketQua,tick,S:()=>S,ST:()=>ST,D};
</script>
</body>
</html>
`;

// ---------- CLI ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [lenh, ...r] = process.argv.slice(2);
  const co = (t) => r.includes(t), gt = (t, mac) => { const i = r.indexOf(t); return i >= 0 && r[i + 1] ? r[i + 1] : mac; };
  try {
    if (lenh === 'dung') console.log(JSON.stringify(await dung({ lamLai: co('--lam-lai'), so: +gt('--so', 30), toiThieu: +gt('--toi-thieu', 10) }), null, 1));
    else if (lenh === 'gop') { const m = gopMon(docDaoCu()); for (const x of m) console.log(`${x.muc}/${x.con}\t${x.ten}\t(x${x.soLuong})`); console.log(`${m.length} món`); }
    else if (lenh === 'nhan' && r[0]) console.log(JSON.stringify(nhan(path.resolve(r[0])), null, 1));
    else if (lenh === 'codex' && r[0]) console.log(soanDeCodex(path.resolve(r[0])).join('\n') || 'không có món nhờ Codex vẽ');
    else if (lenh === 'blender' && r[0]) console.log(soanDeBlender(path.resolve(r[0])).join('\n') || 'không có món nhờ Blender vẽ');
    else if (lenh === 'mo') moMayChu({ cong: +gt('--cong', 8791), motLan: co('--mot-lan') });
    else { console.error('Dùng: node tools/thu-vien-asset.mjs dung [--lam-lai] [--so 30] [--toi-thieu 10] | gop | nhan <file.json> | codex <file.json> | blender <file.json> | mo [--cong N] [--mot-lan]'); process.exit(2); }
  } catch (e) { console.error('Lỗi: ' + (e.message || e)); process.exit(1); }
}
