// town-styles.js — BẢNG KIỂU màu nhà thị trấn (dữ liệu + gán tất định theo seed). Không phụ thuộc THREE → test được bằng node.
// Cách dùng (xem docs/nha-thi-tran.md):  EPISODE.town = { kieu: 'pastel', vai: ['bakery','tailor'], nha: { bakery: { tuong:'#…', mai:'#…' } } }
//   hoặc thử nhanh: ?nha=pastel&vai=bakery,tailor.  Không khai kiểu → engine/town.js không đụng tới nhà (hình giữ nguyên).
// Mỗi bảng: tuong/mai/vien/cua = [[màu, trọng số], …]; nhan = [{ tuong, mai }, …] màu "nhấn" cho nhà có vai (KHÔNG trùng tuong thường);
//   cam = [[tường, mái], …] cặp bị cấm; tpMin = độ chênh sáng tối thiểu tường/mái.
export const STYLES = {
  pastel: {
    mo: 'thị trấn tươi vui: kem, hồng phấn, xanh trời, bạc hà, đào, tím nhạt; mái xanh xám/gạch/rêu/mận',
    tuong: [['#f6e7c8', 1], ['#f3c9c9', 1], ['#c9e3f0', 1], ['#d4ebc7', 1], ['#f6dcb4', 1], ['#e1d3ee', 1], ['#f2e4a8', 0.8], ['#f7f1e6', 0.8]],
    mai: [['#5b6f8f', 1], ['#a65a4a', 1], ['#4f7a64', 1], ['#7a5a7a', 0.8], ['#8a6a52', 1]],
    vien: [['#fbf6ea', 1.5], ['#e9e2d0', 1], ['#4a4f5e', 1]],
    cua: [['#c0574b', 1], ['#3f6f8f', 1], ['#e0a63a', 0.8], ['#5a8a5c', 1], ['#7b4a3a', 1]],
    nhan: [{ tuong: '#f2b53d', mai: '#ab7269' }, { tuong: '#e8806a', mai: '#7d7282' }, { tuong: '#5fb3b3', mai: '#697b87' }, { tuong: '#9b86d1', mai: '#727289' }, { tuong: '#e6708f', mai: '#88717a' }, { tuong: '#86b86a', mai: '#7d7167' }],
    cam: [['#f3c9c9', '#a65a4a'], ['#d4ebc7', '#4f7a64'], ['#e1d3ee', '#7a5a7a']], tpMin: 0.2,
  },
  'ven-bien': {
    mo: 'ven biển: trắng, trắng xanh, xanh nhạt, cát, đất nung; mái xanh biển/navy/cam đất',
    tuong: [['#f7f3ea', 1.4], ['#e8f1f5', 1.2], ['#b8d8e6', 1], ['#a9cfe0', 0.7], ['#f1d6b0', 1], ['#e6b88a', 1], ['#e3a47c', 0.8]],
    mai: [['#2f6f9a', 1.2], ['#c4673f', 1], ['#2d4f6b', 1], ['#3a8f8a', 0.8], ['#8f4a38', 0.8]],
    vien: [['#fbf8f0', 1.5], ['#e6dcc6', 1], ['#2d4f6b', 0.8]],
    cua: [['#2f6f9a', 1], ['#c4673f', 1], ['#e0b04a', 0.9], ['#3a8f8a', 1], ['#a8452f', 0.8]],
    nhan: [{ tuong: '#f0c24a', mai: '#688094' }, { tuong: '#d9694f', mai: '#697b87' }, { tuong: '#4fa8b8', mai: '#667282' }, { tuong: '#e9a0a0', mai: '#7d7d94' }, { tuong: '#7aa86a', mai: '#947566' }],
    cam: [['#b8d8e6', '#2f6f9a'], ['#a9cfe0', '#2f6f9a'], ['#e6b88a', '#c4673f'], ['#e3a47c', '#c4673f'], ['#e3a47c', '#8f4a38']], tpMin: 0.2,
  },
  'lang-go': {
    mo: 'làng gỗ ấm: gỗ mật, nâu, be, vàng rơm; mái nâu đậm/rêu/đỏ sẫm',
    tuong: [['#c99a66', 1], ['#b57f50', 1], ['#d9b88a', 1], ['#a86f46', 0.9], ['#e3cfa8', 1], ['#c8b08a', 1], ['#d6a97a', 1], ['#9a7a58', 0.8]],
    mai: [['#5a3e2b', 1.2], ['#4a5a3a', 1], ['#7a3f2e', 1], ['#4f4a44', 0.9], ['#6e5c34', 0.8]],
    vien: [['#efe3c8', 1.3], ['#5b3e2a', 1], ['#3a2c22', 0.8]],
    cua: [['#7a2f2a', 1], ['#3f5a45', 1], ['#2f4a63', 1], ['#c08a3a', 0.9], ['#5a3a2a', 0.8]],
    nhan: [{ tuong: '#d65a3a', mai: '#7d6b63' }, { tuong: '#e3b04b', mai: '#887166' }, { tuong: '#6a9a82', mai: '#716963' }, { tuong: '#6f88aa', mai: '#716d6a' }, { tuong: '#b86a8a', mai: '#786c69' }],
    cam: [['#a86f46', '#7a3f2e'], ['#9a7a58', '#5a3e2b'], ['#9a7a58', '#6e5c34'], ['#b57f50', '#7a3f2e']], tpMin: 0.16,
  },
  'pho-cu': {
    mo: 'phố cũ: gạch đỏ, xám đá, be đá; mái than/nâu/xanh đen; cửa xanh rêu, đỏ rượu',
    tuong: [['#a8503f', 1], ['#b86a4e', 0.9], ['#a9a9a6', 1], ['#8d9094', 0.9], ['#c8bfae', 1.1], ['#b38a68', 1], ['#d3c2a0', 0.9], ['#9c6a5a', 0.8]],
    mai: [['#3a3e46', 1.2], ['#4d3a35', 1], ['#2f3f4f', 1], ['#5a3430', 0.8], ['#3b4a40', 0.8]],
    vien: [['#e8e1d2', 1.4], ['#2f3036', 1], ['#bfb8a8', 1]],
    cua: [['#2f5a46', 1], ['#233a5a', 1], ['#7a2a2a', 1], ['#d0a53a', 0.8], ['#2c2c30', 0.8]],
    nhan: [{ tuong: '#d8b24a', mai: '#727175' }, { tuong: '#4f8a8f', mai: '#686a6e' }, { tuong: '#cbd5da', mai: '#94756e' }, { tuong: '#8a6aa0', mai: '#6c6a71' }, { tuong: '#e0896a', mai: '#757170' }],
    cam: [['#a8503f', '#5a3430'], ['#b86a4e', '#5a3430'], ['#9c6a5a', '#5a3430'], ['#8d9094', '#3b4a40'], ['#a9a9a6', '#3b4a40']], tpMin: 0.16,
  },
  tuyet: {
    mo: 'làng tuyết lạnh nhạt: trắng xanh, xám lam, be lạnh; mái lam xám; cửa đỏ/xanh ấm điểm xuyết',
    tuong: [['#e9eef3', 1.2], ['#d9e3ec', 1], ['#c6d4e0', 1], ['#e8e2dc', 1], ['#cfd8d4', 1], ['#d8d0e0', 0.9], ['#f1ece4', 1]],
    mai: [['#6f8196', 1], ['#566878', 1], ['#8c9aa6', 0.9], ['#7a6f6a', 0.9], ['#4a5866', 1]],
    vien: [['#ffffff', 1.4], ['#b9c6d2', 1], ['#5a6672', 1]],
    cua: [['#9a4a4a', 1], ['#3f5f7a', 1], ['#5a7a6a', 1], ['#c8943a', 0.9], ['#6a4a5a', 0.8]],
    nhan: [{ tuong: '#d86a5a', mai: '#7d8791' }, { tuong: '#e0b24a', mai: '#85929e' }, { tuong: '#5c8fa8', mai: '#717b85' }, { tuong: '#8fae86', mai: '#7d8087' }, { tuong: '#b58ac0', mai: '#7d7d8e' }],
    cam: [['#c6d4e0', '#8c9aa6'], ['#cfd8d4', '#8c9aa6'], ['#d9e3ec', '#8c9aa6']], tpMin: 0.2,
  },
};
export const KIEU = Object.keys(STYLES);

// ---- màu thuần số (không THREE) ----
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const sang = (h) => { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
export const sacDo = (h) => { const [r, g, b] = hex(h).map((v) => v / 255); return Math.max(r, g, b) - Math.min(r, g, b); };
export const sac = (h) => {   // góc màu 0–360
  const [r, g, b] = hex(h).map((v) => v / 255), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  if (d < 1e-6) return 0;
  const hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (hh * 60 + 360) % 360;
};
const lech = (a, b) => { const d = Math.abs(sac(a) - sac(b)) % 360; return d > 180 ? 360 - d : d; };
export const nhan = (h, k) => toHex(hex(h).map((v) => v * k));

// băm số nguyên → [0,1) (thay Math.random; cùng đầu vào → cùng kết quả)
export function bam(...xs) {
  let h = 0x9e3779b9;
  for (const x of xs) { h = Math.imul(h ^ (x | 0), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; }
  return (h >>> 0) / 4294967296;
}
const chon = (ds, u) => { let s = 0; for (const d of ds) s += d.w; let t = u * s; for (const d of ds) { t -= d.w; if (t < 0) return d; } return ds[ds.length - 1]; };

// Cặp tường–mái hợp lệ: đủ tương phản sáng, không cùng tông sặc sỡ, không trong danh sách cấm.
export function capHopLe(st, tuong, mai) {
  if (Math.abs(sang(tuong) - sang(mai)) < st.tpMin) return false;
  if (sacDo(tuong) > 0.12 && sacDo(mai) > 0.12 && lech(tuong, mai) < 28) return false;
  return !st.cam.some(([a, b]) => a === tuong && b === mai);
}

export const KHOANG_KE = 52;   // hai nhà cách nhau < ngần này (stud, theo XZ) = hàng xóm (cùng dãy, sau lưng, đối diện, khối bên cạnh)

// houses: [{ idx, x, z }] theo thứ tự dựng. vai: [{ ten, idx }] nhà có vai. nha: { <vai>: { tuong, mai, vien, cua } } khai tay.
// Trả { <idx>: { tuong, mai, vien, cua, vai? } }; màu đã lệch sáng ±5% mỗi nhà.
export function ganMau(kieu, houses, { seed = 1, vai = [], nha = {} } = {}) {
  const st = STYLES[kieu]; if (!st) throw new Error(`kiểu nhà "${kieu}" không có (có: ${KIEU.join(', ')})`);
  const out = {}, ke = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) < KHOANG_KE;
  const byIdx = Object.fromEntries(houses.map((h) => [h.idx, h]));
  const cap = Math.max(2, Math.ceil(houses.length * 0.28)), dem = {};
  const jit = (c, i, k, amp = 0.05) => nhan(c, 1 + (bam(seed, i, k) - 0.5) * 2 * amp);
  const dsChon = (list, loc, i, k, mu = 0) => {   // lọc → trọng số giảm theo số lần đã dùng → chọn bằng băm
    let ds = list.map(([c, w]) => ({ c, w: w / Math.pow(1 + (dem[c] || 0), mu) })).filter((d) => loc(d.c));
    return ds.length ? chon(ds, bam(seed, i, k)).c : null;
  };
  const khac = (h) => houses.filter((o) => o.idx !== h.idx && out[o.idx] && ke(h, o)).map((o) => out[o.idx]);
  const dung = (h, m) => { const nb = khac(h); return { tuong: new Set(nb.map((o) => o.goc.tuong)), cap: new Set(nb.map((o) => o.goc.tuong + o.goc.mai)) }; };
  const vaiMap = Object.fromEntries(vai.map((v) => [v.idx, v.ten]));
  const thuTu = [...vai.map((v) => byIdx[v.idx]).filter(Boolean), ...houses.filter((h) => !(h.idx in vaiMap))];
  let nNhan = 0;
  for (const h of thuTu) {
    const ten = vaiMap[h.idx], kh = ten ? nha[ten] || {} : {}, nb = dung(h);
    let tuong = kh.tuong, mai = kh.mai;
    if (ten && (!tuong || !mai)) {   // nhà có vai chưa khai: lấy màu nhấn (mỗi vai một màu khác nhau, không nằm trong bảng tường thường)
      const dau = nNhan, ds = st.nhan.map((n, j) => ({ n, j })).filter(({ n }) => !nb.tuong.has(n.tuong) && !Object.values(out).some((o) => o.goc.tuong === n.tuong));
      const pick = ds.length ? ds[(dau + Math.floor(bam(seed, 77) * 97)) % ds.length].n : st.nhan[dau % st.nhan.length];
      nNhan++; tuong = tuong || pick.tuong; mai = mai || pick.mai;
    }
    if (!tuong) {
      tuong = dsChon(st.tuong, (c) => !nb.tuong.has(c) && (dem[c] || 0) < cap, h.idx, 1, 2) || dsChon(st.tuong, (c) => !nb.tuong.has(c), h.idx, 1, 2) || st.tuong[0][0];
    }
    if (!mai) {
      mai = dsChon(st.mai, (c) => capHopLe(st, tuong, c) && !nb.cap.has(tuong + c), h.idx, 2, 1.5)
        || dsChon(st.mai, (c) => capHopLe(st, tuong, c), h.idx, 2, 1) || dsChon(st.mai, () => true, h.idx, 2, 1);
    }
    const vien = kh.vien || dsChon(st.vien, (c) => Math.abs(sang(c) - sang(tuong)) >= 0.12, h.idx, 3, 1) || st.vien[0][0];
    const cua = kh.cua || dsChon(st.cua, (c) => c !== mai && Math.abs(sang(c) - sang(tuong)) >= 0.1, h.idx, 4, 1) || st.cua[0][0];
    dem[tuong] = (dem[tuong] || 0) + 1;
    out[h.idx] = { goc: { tuong, mai }, tuong: jit(tuong, h.idx, 11), mai: jit(mai, h.idx, 12), vien: jit(vien, h.idx, 13, 0.03), cua: jit(cua, h.idx, 14), ...(ten ? { vai: ten } : {}) };
  }
  for (const o of Object.values(out)) { o.tuongGoc = o.goc.tuong; o.maiGoc = o.goc.mai; delete o.goc; }
  return out;
}
