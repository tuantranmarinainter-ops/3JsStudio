// 12 luật kiểm khung hình: hàm thuần (ctx, ng) -> { ok, val, nguong, skip?, ghiChu? }.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { psnr, tyLeToi, diemSang, oPhang, thanhPhan, diemDoi } from './anh.mjs';

// Đơn vị: m.vat[].nghieng = độ; m.vat[].chim = stud (1 stud = 1 đơn vị three.js).
// Mặt nạ L10 vẽ các vai hero, vat-chinh, nha (đã chốt với phần viết __measure) nên số thành phần đếm theo đúng ba vai đó.
const HANH_DONG = ['chase', 'fall', 'hug', 'walkBy', 'follow', 'sinkTilt'];
const HANH_DONG_TACH = ['chase', 'fall', 'hug', 'walkBy', 'follow'];
const KHONG_MEASURE = { ok: true, val: null, nguong: null, skip: 'khong-co-measure' };
const mien = (ghiChu, nguong = null) => ({ ok: true, val: null, nguong, ghiChu });
const ms = (ctx) => (Array.isArray(ctx.m) ? ctx.m : []).filter(Boolean);
const coM = (ctx) => ms(ctx).length > 0;
// khung giữa; nếu hỏng thì lấy khung không-null gần nhất (đầu rồi cuối)
const giua = (ctx) => ctx.m[1] || ctx.m[0] || ctx.m[2];
const vaiCua = (m, vai) => (m.vat || []).filter((v) => v.vai === vai);
const coBbox = (v) => Array.isArray(v.bbox);   // bbox === null: vật rỗng/ngoài tầm nhìn — mọi luật bỏ qua khi gộp/so bbox
const hop = (bs) => [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))];
const giao = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const r3 = (x) => Math.round(x * 1000) / 1000;

export const LUAT = {
  // L1: nhà có chân lọt khung với lề, đủ chân TRONG KHUNG. Chỉ áp khi nhà CÓ chân, là CHỦ THỂ và không phải cận cảnh.
  // Miễn theo TỪNG khung (khung cận cảnh = nhà trong khung < trongKhungMin hoặc lề <= leSat). Shot có khung cận cảnh
  // (cận rồi lùi) thì KHUNG CUỐI phải lộ đủ chân; shot không có khung cận cảnh thì chỉ cần MỘT khung đạt; toàn khung cận cảnh: miễn.
  L1(ctx, ng) {
    const t = ng.L1;
    if (ctx.shot.frame === 'close') return mien('frame-close: bo qua', t);
    if (!coM(ctx)) return { ...KHONG_MEASURE, nguong: t };
    let coNha = false, soNodeChan = 0;
    const khung = [];   // mỗi khung có nhà: { le, canh, soChan, dat, can }
    for (const m of ms(ctx)) {
      const nha = vaiCua(m, 'nha');
      if (!nha.length) continue;
      coNha = true;
      soNodeChan += vaiCua(m, 'chan-nha').length;   // đếm cả chân bbox null / ngoài khung (chỉ để biết nhà có chân hay không)
      const chan = vaiCua(m, 'chan-nha').filter(coBbox);
      const chanTrong = chan.filter((v) => (Number.isFinite(v.trongKhung) ? v.trongKhung : 0) >= t.chanTrongKhungMin).length;
      const bs = [...nha.filter(coBbox), ...chan].map((v) => v.bbox);
      if (!bs.length) { khung.push({ le: -Infinity, canh: 'trai', soChan: 0, dat: false, can: true }); continue; }
      const tkNha = Math.min(...nha.map((v) => (Number.isFinite(v.trongKhung) ? v.trongKhung : 0)));
      const b = hop(bs);
      let le = Infinity, canh = 'trai';
      for (const [ten, l] of [['trai', b[0]], ['tren', b[1]], ['phai', 1 - b[2]], ['duoi', 1 - b[3]]]) if (l < le) { le = l; canh = ten; }
      const can = !(tkNha >= t.trongKhungMin) || !(le > t.leSat);
      khung.push({ le, canh, soChan: chanTrong, dat: !can && le >= t.le && chanTrong >= t.soChan, can });
    }
    if (!coNha) return mien('khong-co-nha-trong-khung', t);
    const exempt = (ghiChu) => ({ ok: true, val: { apDung: false }, nguong: t, ghiChu });
    if (soNodeChan === 0) return exempt('nha-khong-chan');
    const g = giua(ctx);
    const nguoiTo = (g.vat || []).some((v) => (v.vai === 'hero' || v.vai === 'nguoi') && coBbox(v) && (v.bbox[3] - v.bbox[1]) >= t.nguoiChuTheCao);
    if (nguoiTo) return exempt('nha-la-nen');
    if (khung.every((k) => k.can)) return exempt('can-canh');
    const coCan = khung.some((k) => k.can);
    const xet = coCan ? khung[khung.length - 1] : (khung.find((k) => k.dat) || khung.reduce((a, k) => (k.le > a.le ? k : a)));
    const r = { ok: xet.dat, val: { le: r3(xet.le), canh: xet.canh, soChan: xet.soChan, apDung: true }, nguong: t };
    if (coCan) r.ghiChu = 'co-khung-can-canh: xet khung cuoi';
    return r;
  },

  // L2: vật cần đọc (insertRead) ở giữa, không che, không tràn.
  L2(ctx, ng) {
    const t = ng.L2;
    if ((ctx.shot.type ?? ctx.shot.shotType) !== 'insertRead') return mien('khong-phai-insertRead', t);
    if (!coM(ctx)) return { ...KHONG_MEASURE, nguong: t };
    let lech = 0, dx = 0, dy = 0, che = 0, rong = 0, thay = false;
    for (const m of ms(ctx)) {
      const d = vaiCua(m, 'doc').filter(coBbox)[0];
      if (!d) continue;
      thay = true;
      const cx = (d.bbox[0] + d.bbox[2]) / 2 - 0.5, cy = (d.bbox[1] + d.bbox[3]) / 2 - 0.5;
      if (Math.hypot(cx, cy) >= lech) { lech = Math.hypot(cx, cy); dx = cx; dy = cy; }
      che = Math.max(che, d.che || 0);
      rong = Math.max(rong, d.bbox[2] - d.bbox[0]);
    }
    const val = { lech: r3(lech), dx: r3(dx), dy: r3(dy), che: r3(che), rong: r3(rong) };
    if (!thay) return { ok: false, val, nguong: t, ghiChu: 'khong-thay-vat-doc' };
    return { ok: lech < t.lechTam && che < t.cheMax && rong <= t.rongMax, val, nguong: t };
  },

  // L3: nhân vật chính nằm trọn khung, mặt không bị che. Cận cảnh (bbox hero lớn hơn khung) miễn phần "trọn khung" (zoom IN vào mặt là luật camera).
  L3(ctx, ng) {
    const t = ng.L3;
    if (!coM(ctx)) return { ...KHONG_MEASURE, nguong: t };
    let tk = Infinity, che = 0, thay = false, thieuTk = false, canCanh = false;
    for (const m of ms(ctx)) for (const h of vaiCua(m, 'hero')) {
      thay = true;
      if (!Number.isFinite(h.trongKhung)) thieuTk = true;
      const dt = coBbox(h) ? (h.bbox[2] - h.bbox[0]) * (h.bbox[3] - h.bbox[1]) : 0;
      if (dt >= t.canCanhDienTich) canCanh = true;
      else tk = Math.min(tk, Number.isFinite(h.trongKhung) ? h.trongKhung : 0);
      che = Math.max(che, h.mat?.che || 0);
    }
    if (!thay) return mien('khong-co-hero', t);
    if (tk === Infinity) tk = 1;   // mọi khung đều cận cảnh
    const r = { ok: tk >= t.trongKhungMin && che <= t.cheMatMax, val: { trongKhung: r3(tk), cheMat: r3(che) }, nguong: t };
    if (thieuTk) r.ghiChu = 'thieu-trongKhung: coi nhu 0';
    else if (canCanh) r.ghiChu = 'can-canh: bo qua trongKhung';
    return r;
  },

  // L4: camera dồn dập, ảnh đầu và cuối phải khác nhau.
  L4(ctx, ng) {
    const t = ng.L4;
    if (ctx.shot.static === true) return mien('shot-tinh: bo qua', t);
    const p = psnr(ctx.anh[0], ctx.anh[2]);
    const val = Math.min(p, 100); // Infinity không serialize được
    return { ok: p < t.psnrMax, val, nguong: t };
  },

  // L5: nhà nghiêng / chìm ở khung giữa (chỉ sinkTilt).
  L5(ctx, ng) {
    const t = ng.L5;
    if ((ctx.shot.type ?? ctx.shot.shotType) !== 'sinkTilt') return mien('khong-phai-sinkTilt', t);
    if (!coM(ctx)) return { ...KHONG_MEASURE, nguong: t };
    const g = giua(ctx);
    const vat = g.vat || [];
    const v = vaiCua(g, 'nha')[0] || vat.find((x) => x.nghieng !== undefined || x.chim !== undefined);
    if (!v) return { ok: false, val: null, nguong: t, ghiChu: 'khong-thay-vat-nghieng' };
    const nghieng = v.nghieng ?? 0, chim = v.chim ?? 0;
    return { ok: nghieng >= t.nghiengMin || chim >= t.chimMin, val: { nghieng, chim }, nguong: t };
  },

  // L6: hạt bụi ở chân chạm đất; tuyết/mưa có hạt.
  L6(ctx, ng) {
    const t = ng.L6;
    if (!coM(ctx)) return { ...KHONG_MEASURE, nguong: t };
    if (ms(ctx).every((m) => m.soTheHat === 0)) return { ok: true, val: null, nguong: t, skip: 'khong-co-the-hat' };   // trang không có thẻ hạt nào (bản gộp cũ)
    // bụi chỉ nổ lúc vừa chạm: chỉ đòi cho bàn chân chamDat ở khung giữa mà khung đầu chưa chạm (ghép theo ten)
    const thieuHat = [];
    const dau = ctx.m[0] ? new Map((ctx.m[0].chan || []).map((c) => [c.ten, c])) : null;
    for (const c of giua(ctx).chan || []) {
      const truoc = dau && dau.get(c.ten);
      if (c.chamDat && truoc && !truoc.chamDat && !(c.hatGan >= t.hatMin)) thieuHat.push(c.ten);
    }
    const hat = giua(ctx).hat || {};
    const loi = [...new Set(thieuHat)];
    if (ctx.env.tuyet && !(hat.tuyet > 0)) loi.push('hat.tuyet');
    if (ctx.env.mua && !(hat.mua > 0)) loi.push('hat.mua');
    return { ok: loi.length === 0, val: { thieu: loi }, nguong: t };
  },

  // L7: cảnh đêm không tối đen, có điểm sáng (trên ảnh giữa).
  L7(ctx, ng) {
    const t = ng.L7;
    if (!ctx.env.dem) return mien('khong-phai-canh-dem', t);
    const toi = tyLeToi(ctx.anh[1], t.nguongToi);
    const ds = diemSang(ctx.anh[1], { nguong: t.nguongSang, dienTichMin: t.dienTichSangMin });
    return { ok: toi < t.toiMax && ds >= t.diemSangMin, val: { tyLeToi: r3(toi), diemSang: ds }, nguong: t };
  },

  // L8: không trống — ô phẳng ít, mỗi tầng có vật.
  L8(ctx, ng) {
    const t = ng.L8;
    const op = oPhang(ctx.anh[1], { luoi: t.luoi, doLech: t.doLech });
    let okTang = true, tang = null, ghiChu;
    if (coM(ctx)) {
      tang = giua(ctx).tang || {};
      if (['front', 'mid', 'back'].reduce((s, k) => s + (tang[k] ?? 0), 0) === 0) ghiChu = 'chua-gan-tang';   // env chưa gắn tầng: chỉ kiểm ô phẳng
      else okTang = ['front', 'mid', 'back'].every((k) => (tang[k] ?? 0) >= t.vatMoiTangMin);
    } else ghiChu = 'khong-co-measure: chi kiem anh';
    const r = { ok: op < t.oPhangMax && okTang, val: { oPhang: r3(op), tang }, nguong: t };
    if (ghiChu) r.ghiChu = ghiChu;
    return r;
  },

  // L9: vật liệu phải khai báo, kind cấm grunge không được grunge.
  L9(ctx, ng) {
    const t = ng.L9;
    if (!coM(ctx)) return { ...KHONG_MEASURE, nguong: t };
    const loi = [];
    for (const m of ms(ctx)) for (const v of m.vatLieu || []) {
      if (v.nguon !== 'khai-bao') loi.push(`${v.ten}:nguon=${v.nguon}`);
      else if (v.grunge === true && t.camGrunge.includes(v.kind)) loi.push(`${v.ten}:grunge-${v.kind}`);
    }
    return { ok: loi.length === 0, val: { loi: [...new Set(loi)] }, nguong: t };
  },

  // L10: bóng dáng trên mask: diện tích, mỗi vật cần có thành phần chồng bbox, không thành phần mồ côi, tách thân cho cảnh hành động.
  L10(ctx, ng) {
    const t = ng.L10;
    if (!ctx.mask) return { ok: true, val: null, nguong: t, skip: 'khong-co-mask' };
    const mg = coM(ctx) ? giua(ctx) : null;
    const can = mg ? (mg.vat || []).filter((v) => ['hero', 'vat-chinh', 'nha'].includes(v.vai) && !(v.trongKhung <= 0) && !(v.vai === 'hero' && v.trong)) : [];   // hero trong nhà dính vào thành phần của nhà
    if (mg && !can.length) return { ok: true, val: { canCo: 0 }, nguong: t, ghiChu: 'khong-co-vat-chinh' };
    const phu = tyLeToi(ctx.mask, t.nguongDen);
    if (phu > t.phuKinMax) return { ok: true, val: { phu: r3(phu) }, nguong: t, skip: 'mask-phu-kin' };
    const tp = thanhPhan(ctx.mask, { nguongDen: t.nguongDen, cumMin: t.cumMin });
    const dt = tp.reduce((s, c) => s + c.dienTich, 0);
    const val = { dienTich: r3(dt), thanhPhan: tp.length };
    const ghi = [];
    let ok = dt >= t.dienTichMin;
    const noi = (b) => [b[0] - t.noiBbox, b[1] - t.noiBbox, b[2] + t.noiBbox, b[3] + t.noiBbox];
    if (mg) {
      val.canCo = can.length;
      const bc = can.filter(coBbox);
      const thieu = bc.filter((v) => !tp.some((c) => giao(c.bbox, noi(v.bbox))));
      if (thieu.length) { ok = false; val.thieu = thieu.map((v) => v.ten); }
      const moi = (mg.vat || []).filter((v) => ['hero', 'vat-chinh', 'nha', 'tay', 'chan-nguoi', 'chan-nha'].includes(v.vai) && coBbox(v)).map((v) => noi(v.bbox));
      const moCoi = tp.filter((c) => c.dienTich >= t.moCoiMin && !moi.some((b) => giao(c.bbox, b)));
      if (moCoi.length) { ok = false; val.moCoi = moCoi.length; ghi.push('thanh-phan-mo-coi'); }
    } else ghi.push('khong-co-measure: khong kiem thanh phan theo vat');
    if (HANH_DONG_TACH.includes((ctx.shot.type ?? ctx.shot.shotType)) && tp.length < 2) {
      const than = mg ? vaiCua(mg, 'hero')[0] : null;
      const chi = mg && than ? (mg.vat || []).filter((v) => (v.vai === 'tay' || v.vai === 'chan-nguoi') && v.chu === than.ten && coBbox(v)) : [];
      if (than && coBbox(than) && chi.length) {
        const tach = chi.some((c) => !giao(c.bbox, than.bbox));
        val.tachThan = tach;
        if (!tach) ok = false;
      } else ghi.push('khong-du-du-lieu-tach-than: chi kiem dien tich');
    }
    const r = { ok, val, nguong: t };
    if (ghi.length) r.ghiChu = ghi.join('; ');
    return r;
  },

  // L11: thời lượng tối thiểu theo loại shot.
  L11(ctx, ng) {
    const t = ng.L11;
    const type = ctx.shot.type ?? ctx.shot.shotType;
    let min;
    if (HANH_DONG.includes(type)) min = t.hanhDong;
    else if (type !== 'hanhDong' && type !== 'macDinh' && typeof t[type] === 'number') min = t[type];
    else min = t.macDinh;
    return { ok: ctx.shot.dur >= min, val: ctx.shot.dur, nguong: min };
  },

  // L12: "đứng yên" — diễn viên/đạo cụ phải đổi thấy được trong MỌI cửa sổ cuaSo giây. ctx.dong = [{ t, anh: [đầu, giữa, cuối] }]
  // chụp với camera ĐÓNG BĂNG ở tư thế đầu cửa sổ (tools/kiem-luat.mjs), nên chênh ảnh chỉ do vật/diễn viên (và hiệu ứng nền như nước, tuyết).
  // Mỗi cửa sổ lấy max số điểm đổi qua ba cặp (đầu-giữa, giữa-cuối, đầu-cuối); cửa sổ nào < diemMin thì lỗi.
  L12(ctx, ng) {
    const t = ng.L12;
    if (ctx.shot.static) return mien('shot-tinh: bo qua', t);
    if (!(ctx.shot.dur > t.cuaSo)) return { ok: true, val: null, nguong: t, skip: 'ngan-hon-cua-so' };
    if (!Array.isArray(ctx.dong) || !ctx.dong.length) return { ok: true, val: null, nguong: t, skip: 'khong-co-cua-so' };
    let min = Infinity, viTri = null;
    for (const w of ctx.dong) {
      const [a, b, c] = w.anh;
      const n = Math.max(diemDoi(a, b, t.nguong), diemDoi(b, c, t.nguong), diemDoi(a, c, t.nguong));
      if (n < min) { min = n; viTri = w.t; }
    }
    return { ok: min >= t.diemMin, val: { diemItNhat: min, cuaSoXauNhat: viTri === null ? null : r3(viTri), soCuaSo: ctx.dong.length }, nguong: t };
  },
};

export function kiemShot(ctx, ng0) {
  // ghi đè riêng theo shot: ng.rieng[shot.id] trộn lên ng
  const r = ng0.rieng && ctx.shot && ng0.rieng[ctx.shot.id];
  const ng = r ? tron(ng0, r) : ng0;
  const kq = {};
  for (const ma of Object.keys(LUAT)) {
    if (ng[ma] && ng[ma].tat === true) { kq[ma] = { ok: true, val: null, nguong: null, skip: 'tat' }; continue; }
    try { kq[ma] = LUAT[ma](ctx, ng); } catch (e) {
      kq[ma] = { ok: false, val: null, nguong: null, skip: 'loi', ghiChu: 'loi: ' + e.message };
    }
  }
  return kq;
}

function docJson(file) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch (e) { throw new Error(`Khong doc duoc ${file}: ${e.message}`); }
  try { return JSON.parse(txt); } catch (e) { throw new Error(`File JSON hong ${file}: ${e.message}`); }
}
function tron(a, b) {
  if (b && typeof b === 'object' && !Array.isArray(b) && a && typeof a === 'object' && !Array.isArray(a)) {
    const o = { ...a };
    for (const k of Object.keys(b)) o[k] = k in a ? tron(a[k], b[k]) : b[k];
    return o;
  }
  return b;
}

export function nguong(epDir) {
  const macDinh = docJson(path.join(path.dirname(fileURLToPath(import.meta.url)), 'mac-dinh.json'));
  const rieng = path.join(epDir, 'quy-trinh.json');
  return fs.existsSync(rieng) ? tron(macDinh, docJson(rieng)) : macDinh;
}
