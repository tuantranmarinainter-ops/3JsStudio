// kit-shots.mjs — đổi bộ kit (kich-ban/<ep>/bang-shot.json + kit.json) thành shots.js CÓ chuyển động.
// Dùng: node tools/kit-shots.mjs kich-ban/<ep> [--ra <file>] [--goc <file.json>]
//   --goc: { "<boiCanh>": { "goc": [x,y,z], "xoay": độ } } — đổi toạ độ kit (gốc = tâm sàn bối cảnh) → toạ độ thế giới.
// Thoát: 0 xong · 1 sai cách dùng/đọc file · 2 kit còn lỗi (kiemKit --khong-hinh).
// Đặc tả: docs/quy-trinh-dau-vao.md. Loại shot: engine/shottypes.js. Camera p/l/p2/l2/fov/fov2: engine/shots.js (placeCamera).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { kiemKit } from './kiem-kit.mjs';
import { SHOT_TYPES } from '../engine/shottypes.js';

// ---- BẢNG ÁNH XẠ (dễ sửa): số nhân vật (0,1,2,3=3 trở lên) × camera.loai → type của engine/shottypes.js ----
// Camera thật luôn lấy từ kit (cam.p→p2, l→l2) nên `type` chỉ quyết định diễn viên mặc định + nhãn; chọn type có sẵn đúng luật camera.
export const ANH_XA = {
  0: { zoomIn: 'insert', zoomOut: 'establish', lia: 'establish', theo: 'establish', dung: 'insert', doiHuong: 'establish' },
  1: { zoomIn: 'closeup', zoomOut: 'reveal', lia: 'walkBy', theo: 'follow', dung: 'reaction', doiHuong: 'reaction' },
  2: { zoomIn: 'dialogue', zoomOut: 'dialogue', lia: 'dialogue', theo: 'chase', dung: 'dialogue', doiHuong: 'dialogue' },
  3: { zoomIn: 'crowd', zoomOut: 'crowd', lia: 'crowd', theo: 'crowd', dung: 'crowd', doiHuong: 'crowd' },
};
export const QUA_VAI = 'overShoulder';            // gocMay "qua-vai" + ≥ 2 nhân vật
export const CO_KHUNG_RONG = ['trung', 'toan'];   // 1 nhân vật zoomIn: coKhung cuối thuộc nhóm này → reaction thay vì closeup
export const NGUONG_CHAY = 9;                     // stud/giây: nhanh hơn → anim 'run', chậm hơn → 'walk'
export const NGUONG_DICH = 0.5;                   // stud: nhân vật dịch ít hơn → coi là đứng yên (anim 'idle')
export const NGUONG_ZOOM = 0.02;                  // ±2% cỡ khung (khoảng cách × tan(fov/2)) mới tính là zoom

const r3 = (x) => Math.round(x * 1000) / 1000 + 0;   // +0 bỏ -0
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const RAD = Math.PI / 180;

export function chonLoai(bs, n) {
  const loai = bs.camera.loai;
  let t = ANH_XA[Math.min(n, 3)][loai];
  if (n >= 2 && n < 3 && bs.camera.gocMay === 'qua-vai') t = QUA_VAI;
  else if (n === 1 && t === 'closeup' && CO_KHUNG_RONG.includes((bs.camera.coKhung || [])[1])) t = 'reaction';
  else if (n === 0 && t === 'insert' && (bs.camera.coKhung || []).includes('toan')) t = 'establish';
  return t;
}

// toạ độ kit → thế giới: xoay quanh Y (cùng quy ước engine: +Z quay θ → (sinθ, cosθ)) rồi cộng gốc
function bienDoi(g = {}) {
  const goc = g.goc || [0, 0, 0], th = (g.xoay || 0) * RAD, c = Math.cos(th), s = Math.sin(th);
  return {
    diem: (p) => [r3(goc[0] + p[0] * c + p[2] * s), r3(goc[1] + p[1]), r3(goc[2] - p[0] * s + p[2] * c)],
    huong: (h) => r3(((h || 0) + (g.xoay || 0)) * RAD),
  };
}

const kichCo = (m) => dist3(m.p, m.nhin) * Math.tan((m.fov * RAD) / 2);

export function kitSangShots(bangShot, kit, goc = {}) {
  const shots = [], ghiChu = [];
  const note = (id, loai, msg) => ghiChu.push({ id, loai, msg });
  const kitShot = new Map(kit.shots.map((s) => [s.id, s]));
  const kitNv = new Map(kit.nhanVat.map((n) => [n.id, n]));
  for (const bs of bangShot.shots) {
    const k = kitShot.get(bs.id);
    const T = bienDoi(goc[bs.boiCanh]);
    const ids = bs.nhanVat || [];
    const n = ids.length;
    const loai = bs.camera.loai;
    const type = chonLoai(bs, n);
    const may = k.may, dau = may.dau, cuoi = bs.hinh >= 2 ? may.cuoi : null;

    // người chính / người phụ
    const kn = (id) => (k.nhanVat || []).find((x) => x.id === id);
    let who = ids[0], others = ids.slice(1);
    if (type === QUA_VAI) {   // who = người xa máy (được nhìn), with = người gần máy (tiền cảnh, quay lưng)
      const xa = [...ids].sort((a, b) => dist3(kn(b).dau, dau.p) - dist3(kn(a).dau, dau.p));
      who = xa[0]; others = xa.slice(1);
    }

    // camera
    const cam = { p: T.diem(dau.p), l: T.diem(dau.nhin), fov: dau.fov };
    if (cuoi) {
      cam.p2 = T.diem(cuoi.p); cam.l2 = T.diem(cuoi.nhin);
      if (cuoi.fov !== dau.fov) cam.fov2 = cuoi.fov;
    }

    // diễn viên (toạ độ thế giới; kit đã chuẩn hoá hướng 0 = mặt +Z, độ → rad)
    const cast = {};
    const chuyenDong = [];
    for (const id of ids) {
      const e = kn(id), a = e.dau, b = bs.hinh >= 2 && e.cuoi ? e.cuoi : e.dau;
      const len = dist3(a, b), dich = len > NGUONG_DICH;
      const c = { at: T.diem(a) };
      if (e.huong !== undefined) c.ry = T.huong(e.huong);
      if (dich) {
        c.to = T.diem(b);
        c.anim = len / bs.dur > NGUONG_CHAY ? 'run' : 'walk';
        if (e.huong === undefined) delete c.ry;   // engine tự lấy hướng đi
        chuyenDong.push(`${id} ${c.anim}`);
      } else {
        c.anim = 'idle';
        if (['walkBy', 'follow', 'chase'].includes(type)) c.to = null;   // loại này tự thêm `to`: ép đứng yên
      }
      cast[id] = c;
    }

    const s = { id: bs.id, dur: bs.dur, type, env: bs.boiCanh };
    if (who) s.who = who;
    if (others.length) s.with = others.length === 1 ? others[0] : others;
    s.cam = cam;
    if (Object.keys(cast).length) s.cast = cast;
    shots.push(s);

    // ---- chú thích ----
    note(bs.id, 'info', `${loai}/${bs.camera.gocMay}/${(bs.camera.coKhung || []).join('>')} → ${type}`
      + (chuyenDong.length ? `; ${chuyenDong.join(', ')}` : '') + (bs.hanhDong ? `; ${bs.hanhDong}` : ''));
    if (bs.hinh === 3) {
      note(bs.id, 'sua-tay', 'có khung giữa (engine chỉ nội suy p→p2, không có điểm giữa: shots.js thiếu cam.p3; đã dùng đầu→cuối)');
    }
    if (loai === 'doiHuong') note(bs.id, 'sua-tay', 'doiHuong không có loại shot riêng (đổi hướng giữa shot): dựng tay/tách thành 2 shot');
    if (type === 'crowd') note(bs.id, 'sua-tay', '≥3 nhân vật dùng type crowd nhưng diễn viên lấy từ cast kit (crowd cần ctx.crowd để bày thêm người)');
    if (k.tinCay === 'thap') note(bs.id, 'sua-tay', 'tinCay thấp: số đo kit không chắc, xem lại khung');

    // ---- luật camera ----
    const tinh = cuoi ? (!eq(dau.p, cuoi.p) || !eq(dau.nhin, cuoi.nhin) || dau.fov !== cuoi.fov ? 'dong' : 'tinh') : 'tinh';
    let zoom = 'khong';
    if (cuoi) {
      const q = kichCo(cuoi) / kichCo(dau);
      zoom = q < 1 - NGUONG_ZOOM ? 'in' : q > 1 + NGUONG_ZOOM ? 'out' : 'khong';
    }
    if (n === 1 && zoom === 'out') note(bs.id, 'luat', '1 nhân vật mà zoom out');
    if (n >= 2 && zoom === 'in') note(bs.id, 'luat', `${n} nhân vật mà zoom in`);
    if (tinh === 'tinh' && loai !== 'dung') note(bs.id, 'luat', `camera đứng yên nhưng loại là ${loai} (không phải dung)`);
  }
  return { shots, ghiChu };
}

// ---- ghi file ----
export function dungModule(res, ep) {
  const nhan = (id, loai) => res.ghiChu.filter((g) => g.id === id && g.loai === loai).map((g) => g.msg);
  const dong = (t) => String(t).replace(/[\r\n]+/g, ' ');
  const lines = res.shots.map((s) => {
    const body = Object.entries(s).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
    const cm = [...nhan(s.id, 'info'), ...nhan(s.id, 'luat').map((m) => `LUẬT CAMERA: ${m}`),
      ...nhan(s.id, 'sua-tay').map((m) => `CẦN SỬA TAY: ${m}`)].map(dong).join(' · ');
    return `  { ${body} },  // ${cm}`;
  });
  return `// ${ep} — ${res.shots.length} shot, sinh bởi tools/kit-shots.mjs từ kit.json (camera đầu→cuối, nhân vật đầu→cuối).\n`
    + '// Mỗi dòng 1 shot theo LOẠI (engine/shottypes.js); cam.p→p2 / l→l2 / fov→fov2 là camera thật. Chỗ "CẦN SỬA TAY" Claude sửa tiếp.\n'
    + `export const SHOTS = [\n${lines.join('\n')}\n];\n`;
}

export function thongKe(res) {
  const theoLoai = {};
  for (const s of res.shots) theoLoai[s.type] = (theoLoai[s.type] || 0) + 1;
  const suaTay = res.ghiChu.filter((g) => g.loai === 'sua-tay'), luat = res.ghiChu.filter((g) => g.loai === 'luat');
  return { theoLoai, suaTay, luat, soSuaTay: new Set(suaTay.map((g) => g.id)).size, soLuat: new Set(luat.map((g) => g.id)).size };
}

function main(argv) {
  const out = (s) => process.stdout.write(s + '\n');
  const dir = argv[0] && !argv[0].startsWith('--') ? argv[0] : null;
  const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  if (!dir) { out('Cách dùng: node tools/kit-shots.mjs kich-ban/<ep> [--ra <file>] [--goc <file.json>]'); return 1; }
  let bs, kit, goc = {};
  try {
    bs = JSON.parse(fs.readFileSync(path.join(dir, 'bang-shot.json'), 'utf8'));
    kit = JSON.parse(fs.readFileSync(path.join(dir, 'kit.json'), 'utf8'));
    if (opt('--goc')) goc = JSON.parse(fs.readFileSync(opt('--goc'), 'utf8'));
  } catch (e) { out(`LỖI: không đọc được file đầu vào: ${e.message}`); return 1; }
  const kq = kiemKit(bs, kit, { files: null });
  if (kq.loi.length) {
    out(`TỪ CHỐI: kit còn ${kq.loi.length} lỗi (node tools/kiem-kit.mjs ${dir} --khong-hinh):`);
    for (const l of kq.loi) out(`  LỖI ${l.shot}: ${l.msg}`);
    return 2;
  }
  const res = kitSangShots(bs, kit, goc);
  const ra = opt('--ra') || path.join(dir, 'shots.tao.js');
  fs.mkdirSync(path.dirname(path.resolve(ra)), { recursive: true });
  fs.writeFileSync(ra, dungModule(res, bs.ep), 'utf8');
  const st = thongKe(res);
  out(`Đã ghi ${res.shots.length} shot → ${ra}`);
  out('Theo loại: ' + Object.entries(st.theoLoai).map(([k, v]) => `${k}=${v}`).join(', '));
  out(`Cần sửa tay: ${st.soSuaTay} shot`);
  for (const g of st.suaTay) out(`  ${g.id}: ${g.msg}`);
  out(`Vi phạm luật camera: ${st.soLuat} shot`);
  for (const g of st.luat) out(`  ${g.id}: ${g.msg}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main(process.argv.slice(2));
// kiểm bảng ánh xạ chỉ trỏ tới loại có thật
for (const t of new Set(Object.values(ANH_XA).flatMap((m) => Object.values(m)).concat(QUA_VAI)))
  if (!SHOT_TYPES[t]) throw new Error(`ANH_XA: loại "${t}" không có trong engine/shottypes.js`);
