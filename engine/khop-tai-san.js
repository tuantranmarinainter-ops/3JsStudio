// khop-tai-san.js — KHỚP TÀI SẢN VÀO KHỐI ("khối thắng"): vị trí, chân đế, hướng của khối giữ nguyên; tài sản co/lặp cho vừa.
// Hàm THUẦN SỐ (không three, không giờ thực, không ngẫu nhiên) → test bằng node, dùng chung cho env, trang duyệt, cổng kiểm.
// Kế hoạch: docs/handoff/khop-khoi-tai-san.md (mục 3–4).
//
// khop({ bbox:[rộng,cao,sâu], vung:{x:[a,b],y:[a,b],z:[a,b]}, loai, ry?, opt? }) → kết quả:
//   scale [sx,sy,sz]  hệ số co theo trục CỤC BỘ của tài sản (nhân với kích thước bbox đưa vào)
//   lap   null | { n, buoc, truc:'x'|'z' }   (loại 'dai': nhân n bản, cách nhau `buoc` đơn vị khối, theo trục cục bộ)
//   lech  { x, y, z }  |kích thước sau khớp ÷ vùng − 1| theo trục của KHỐI (null = trục mỏng < 0,5 stud, bỏ qua)
//   tong  lệch lớn nhất · canhBao [chuỗi]
// Quy ước: tài sản gốc ở tâm đáy; đặt tại (giữa x, y đáy, giữa z) của vùng, xoay `ry` (quanh Y). Không bao giờ dời vùng.

export const LOAI = ['do-vat', 'cay', 'nha', 'hop', 'dai', 'tam', 'noi-that'];
export const MAC_DINH = { nguongLech: 0.20, keoHop: 0.15, tranMax: 0.10, mong: 0.5, nMax: 40, giaiLap: 0.08, dangMax: 2 };

const DAY = 0.5;   // trục vùng mỏng hơn → bỏ qua khi tính tỉ lệ

/** Đoán loại từ kích thước vùng khi khối không khai (plan mục 3a). */
export function doanLoai(vung) {
  const d = kichVung(vung), ngang = [d[0], d[2]].sort((a, b) => b - a);
  if (Math.min(...d) < 1) return 'tam';
  if (ngang[0] / Math.max(1e-4, ngang[1]) > 4) return 'dai';
  return 'do-vat';
}
export const kichVung = (v) => [v.x[1] - v.x[0], v.y[1] - v.y[0], v.z[1] - v.z[0]];

/**
 * @param {{bbox:number[], vung:object, loai?:string, ry?:number, opt?:object}} a
 */
export function khop({ bbox, vung, loai, ry = 0, opt = {} }) {
  const P = { ...MAC_DINH, ...opt };
  loai = LOAI.includes(loai) ? loai : doanLoai(vung);
  const V = kichVung(vung);                                  // kích thước vùng theo trục khối [x,y,z]
  const q = Math.abs(Math.sin(ry)) > 0.9;                    // xoay ±90°: trục x/z của tài sản đổi chỗ so với khối
  const B = q ? [bbox[2], bbox[1], bbox[0]] : [bbox[0], bbox[1], bbox[2]];   // bbox theo trục khối
  const day = V.map((d) => d > DAY);                         // trục "dày" (tính được tỉ lệ)
  const r = V.map((d, i) => d / Math.max(1e-6, B[i]));       // tỉ lệ vùng/tài sản từng trục
  const dayR = r.filter((_, i) => day[i]);
  const rMin = dayR.length ? Math.min(...dayR) : 1;
  const ctx = [];
  let s = [1, 1, 1], lap = null;                             // s theo trục KHỐI, sẽ đổi về trục cục bộ khi trả về

  if (loai === 'nha') {                                      // vừa CHÂN: co đều theo trục chật nhất (không tràn chân nhà)
    s = [rMin, rMin, rMin];
  } else if (loai === 'do-vat' || loai === 'cay' || loai === 'noi-that') {
    const h = day[1] ? r[1] : rMin;                          // theo chiều cao
    let k = h;
    for (const i of [0, 2]) if (day[i] && B[i] * k > V[i] * (1 + P.tranMax)) k = Math.min(k, r[i]);   // tràn > 10% → co thêm
    s = [k, k, k];
  } else if (loai === 'hop') {                               // co đều rồi kéo lệch ≤ ±15%/trục để lấp vùng
    s = r.map((ri, i) => (day[i] ? Math.min(ri, rMin * (1 + P.keoHop)) : rMin));
  } else if (loai === 'tam') {                               // tấm: 2 trục phẳng khớp vùng, trục mỏng nhất theo vùng/giữ độ dày
    const idx = [0, 1, 2].sort((a, b) => V[a] - V[b]), mong = idx[0];
    const ph = idx.slice(1), sp = Math.sqrt(r[ph[0]] * r[ph[1]]);
    s = [0, 0, 0]; for (const i of ph) s[i] = r[i];
    s[mong] = Math.min(r[mong], sp);                         // độ dày không phình hơn tỉ lệ phẳng, không vượt vùng
    const bd = [...B].sort((a, b) => a - b);                  // tài sản có thật sự là tấm? (mỏng nhất ÷ lớn nhất so với vùng)
    const vd = [...V].sort((a, b) => a - b);
    if (bd[0] / bd[2] > 0.3 && bd[0] / bd[2] > 2 * (vd[0] / vd[2])) ctx.push(`model dày ${bd.map((x) => x.toFixed(1)).join('×')} không phải tấm, bị ép dẹt vào vùng ${vd.map((x) => x.toFixed(1)).join('×')} — nên chọn mẫu khác`);
  } else if (loai === 'dai') {                               // lặp mẫu dọc trục ngang dài; tiết diện co đều theo chiều cao
    const t = V[0] >= V[2] ? 0 : 2, o = t === 0 ? 2 : 0;     // t = trục dài (theo khối)
    const h = day[1] ? r[1] : r[o];
    const k = Math.min(h, day[o] ? Math.max(r[o], 0) : h);   // không tràn bề ngang vùng
    const len = Math.max(1e-6, B[t] * k), n = Math.max(1, Math.round(V[t] / len));
    const buoc = V[t] / n;
    s = [k, k, k]; s[t] = buoc / Math.max(1e-6, B[t]);
    if (n > P.nMax) ctx.push(`lặp ${n} bản > ${P.nMax} (mẫu quá ngắn so với vùng)`);
    const giai = Math.abs(s[t] / k - 1); if (giai > P.giaiLap) ctx.push(`giãn mẫu lặp ${(giai * 100).toFixed(0)}% > ${(P.giaiLap * 100).toFixed(0)}%`);
    lap = { n, buoc, truc: (q ? (t === 0 ? 'z' : 'x') : (t === 0 ? 'x' : 'z')) };
  }
  if (opt.he) s = s.map((x) => x * opt.he);

  // lệch so với vùng, theo trục khối (với 'dai' tính cả chuỗi lặp)
  const sau = [B[0] * s[0], B[1] * s[1], B[2] * s[2]];
  if (lap) { const t = V[0] >= V[2] ? 0 : 2; sau[t] = B[t] * s[t] * lap.n; }
  const lech = { x: null, y: null, z: null }; ['x', 'y', 'z'].forEach((k, i) => { if (day[i]) lech[k] = Math.abs(sau[i] / V[i] - 1); });
  const lv = Object.values(lech).filter((x) => x != null), tong = lv.length ? Math.max(...lv) : 0;
  const ng = opt.nguongLech ?? P.nguongLech;
  const canhBao = [...ctx];
  for (const k of ['x', 'y', 'z']) if (lech[k] != null && lech[k] > ng) canhBao.push(`lệch ${k.toUpperCase()} ${(lech[k] * 100).toFixed(0)}% > ${(ng * 100).toFixed(0)}%`);
  for (let i = 0; i < 3; i++) if (day[i] && sau[i] > V[i] * (1 + P.tranMax) + 1e-9) canhBao.push(`tràn khối trục ${'XYZ'[i]} ${((sau[i] / V[i] - 1) * 100).toFixed(0)}%`);
  if (dayR.length > 1 && Math.max(...dayR) / Math.min(...dayR) > P.dangMax * 1 && loai !== 'tam' && loai !== 'dai')
    canhBao.push(`tỉ lệ dáng khác khối > ${P.dangMax}× — nên chọn mẫu khác`);

  // trục khối → trục cục bộ của tài sản
  const sc = q ? [s[2], s[1], s[0]] : s;
  return { loai, scale: sc, lap, lech, tong, canhBao, sau };
}
