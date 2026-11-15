// Đọc danh sách mốc bối cảnh (boi-canh/<id>.json) thành các hộp xám. THUẦN (không THREE, không DOM): chạy được trong node lẫn trình duyệt.
//   docVung("x -0.5..2.1, y 0..1.4, z -11.25..-8.85 (SÁT tường)") → { x:[-0.5,2.1], y:[0,1.4], z:[-11.25,-8.85] }
//   Quy tắc (không bịa số, chỉ dùng số có trong chuỗi):
//     - "x a..b"  = khoảng; "x a" (một số) = mặt phẳng mỏng dày 0,2 quanh a; "x ±a" = -a..a. Lần xuất hiện ĐẦU TIÊN của mỗi trục thắng.
//     - đủ 3 trục → hộp. Thiếu y mà có cả x và z là khoảng → tấm nằm trên mặt đất (y -0,2..0).
//     - còn lại (thiếu trục, hoặc chỉ có "tâm [..]"/"trái"/"phải") → KHÔNG dựng, in vào danh sách "không đọc được số".
const N = String.raw`(-?\d+(?:\.\d+)?)`;
const DAY = 0.2;

export function docVung(chuoi) {
  const r = {};
  if (typeof chuoi !== 'string') return r;
  for (const a of ['x', 'y', 'z']) {
    const re = new RegExp(String.raw`(?<![A-Za-z0-9_])${a}\s*(?:±\s*${N}|${N}\s*\.\.\s*${N}|${N})`, 'i');
    const m = chuoi.match(re);
    if (!m) continue;
    if (m[1] !== undefined) r[a] = [-Math.abs(+m[1]), Math.abs(+m[1])];
    else if (m[2] !== undefined) { const p = +m[2], q = +m[3]; r[a] = [Math.min(p, q), Math.max(p, q)]; }
    else { const p = +m[4]; r[a] = [p - DAY / 2, p + DAY / 2]; r[a].diem = true; }
  }
  return r;
}

// Trả { hop:[{id,ten,min:[x,y,z],max:[x,y,z]}], khongDoc:[{id,ten,vung,lyDo}], nom:[…], khoi:[…], san:{rong,sau}|null }
export function docBoiCanh(bc) {
  const hop = [], khongDoc = [];
  for (const m of bc.moc || []) {
    if (m.vung === undefined || m.vung === null || m.vung === '') continue;
    const v = docVung(m.vung);
    let { x, y, z } = v;
    let lyDo = null;
    if (!y && x && z && !x.diem && !z.diem) y = [-DAY, 0];
    if (!x || !y || !z) lyDo = 'thiếu trục ' + ['x', 'y', 'z'].filter((a) => !({ x, y, z })[a]).join(',');
    if (lyDo) { khongDoc.push({ id: m.id, ten: m.ten, vung: m.vung, lyDo }); continue; }
    hop.push({ id: m.id, ten: m.ten, min: [x[0], y[0], z[0]], max: [x[1], y[1], z[1]] });
  }
  const nom = [], khoi = [];
  for (const o of bc.vatDoCo || []) {
    if (!Array.isArray(o.dat) || o.dat.length < 3 || !o.dat.every(Number.isFinite)) { khongDoc.push({ id: o.ten, ten: o.ten, vung: o.dat, lyDo: 'dat không đủ [x,y,z]' }); continue; }
    if (/nộm|nom\b/i.test(o.ten)) {
      const cao = +((o.ten.match(/cao\s*(\d+(?:[.,]\d+)?)/i) || [])[1]?.replace(',', '.')) || 5.48;
      nom.push({ ten: o.ten, dat: o.dat, cao });
    } else if (/1\s*[×x]\s*1\s*[×x]\s*1|lập phương/i.test(o.ten)) khoi.push({ ten: o.ten, dat: o.dat, canh: 1 });
    else khongDoc.push({ id: o.ten, ten: o.ten, vung: o.dat, lyDo: 'không nhận ra loại vật đo cỡ' });
  }
  const k = bc.kichThuoc || {};
  const s = Array.isArray(k.san) ? k.san : (k.rong && k.sau ? [k.rong, k.sau] : null);
  return { hop, khongDoc, nom, khoi, san: s ? { rong: s[0], sau: s[1] } : null };
}
