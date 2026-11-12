// Số đo ảnh thuần: ảnh = { w, h, data: Uint8ClampedArray RGBA }.
const sang = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;

export function psnr(a, b) {
  if (a.w !== b.w || a.h !== b.h) throw new Error(`psnr: khác kích thước ${a.w}x${a.h} vs ${b.w}x${b.h}`);
  let s = 0;
  const n = a.w * a.h;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    for (let c = 0; c < 3; c++) { const d = a.data[i + c] - b.data[i + c]; s += d * d; }
  }
  const mse = s / (n * 3);
  return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
}

export function tyLeToi(img, nguong = 0.10) {
  const n = img.w * img.h;
  let dem = 0;
  for (let p = 0; p < n; p++) if (sang(img.data, p * 4) < nguong) dem++;
  return n ? dem / n : 0;
}

// Gán nhãn thành phần liên thông (4 lân cận) trên mặt nạ boolean; trả về danh sách {dienTich(px), bbox px}.
function thanhPhanLienThong(w, h, bat) {
  const thay = new Uint8Array(w * h);
  const res = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!bat[s] || thay[s]) continue;
    let dt = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
    stack.push(s); thay[s] = 1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      dt++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && bat[p - 1] && !thay[p - 1]) { thay[p - 1] = 1; stack.push(p - 1); }
      if (x < w - 1 && bat[p + 1] && !thay[p + 1]) { thay[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && bat[p - w] && !thay[p - w]) { thay[p - w] = 1; stack.push(p - w); }
      if (y < h - 1 && bat[p + w] && !thay[p + w]) { thay[p + w] = 1; stack.push(p + w); }
    }
    res.push({ dt, x0, y0, x1, y1 });
  }
  return res;
}

export function diemSang(img, { nguong = 0.8, dienTichMin = 4 } = {}) {
  const bat = new Uint8Array(img.w * img.h);
  for (let p = 0; p < bat.length; p++) bat[p] = sang(img.data, p * 4) >= nguong ? 1 : 0;
  return thanhPhanLienThong(img.w, img.h, bat).filter((c) => c.dt >= dienTichMin).length;
}

export function oPhang(img, { luoi = 4, doLech = 6 } = {}) {
  let phang = 0;
  for (let gy = 0; gy < luoi; gy++) for (let gx = 0; gx < luoi; gx++) {
    const xa = Math.floor((gx * img.w) / luoi), xb = Math.floor(((gx + 1) * img.w) / luoi);
    const ya = Math.floor((gy * img.h) / luoi), yb = Math.floor(((gy + 1) * img.h) / luoi);
    let n = 0, tong = 0, tong2 = 0;
    for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
      const v = sang(img.data, (y * img.w + x) * 4) * 255;
      n++; tong += v; tong2 += v * v;
    }
    if (!n) continue;
    const tb = tong / n;
    const sd = Math.sqrt(Math.max(0, tong2 / n - tb * tb));
    if (sd < doLech) phang++;
  }
  return phang / (luoi * luoi);
}

// Mặt nạ: đen (độ sáng < nguongDen) là vật; bỏ cụm < cumMin (tỷ lệ diện tích). Trả về thành phần liên thông, lớn trước; dienTich 0..1, bbox chuẩn hoá 0..1.
export function thanhPhan(mask, { nguongDen = 0.5, cumMin = 0.001 } = {}) {
  const { w, h } = mask;
  const bat = new Uint8Array(w * h);
  for (let p = 0; p < bat.length; p++) bat[p] = sang(mask.data, p * 4) < nguongDen ? 1 : 0;
  return thanhPhanLienThong(w, h, bat)
    .map((c) => ({ dienTich: c.dt / (w * h), bbox: [c.x0 / w, c.y0 / h, (c.x1 + 1) / w, (c.y1 + 1) / h] }))
    .filter((c) => c.dienTich >= cumMin)
    .sort((a, b) => b.dienTich - a.dienTich);
}

// L12: số điểm ảnh khác nhau giữa hai ảnh cùng cỡ: max kênh RGB chênh > nguong (thang 0..255).
export function diemDoi(a, b, nguong = 12) {
  if (a.w !== b.w || a.h !== b.h) throw new Error(`diemDoi: khác kích thước ${a.w}x${a.h} vs ${b.w}x${b.h}`);
  let n = 0;
  const m = a.w * a.h;
  for (let p = 0; p < m; p++) {
    const i = p * 4;
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    if (d > nguong) n++;
  }
  return n;
}

// L12: các cửa sổ [đầu, giữa, cuối] (giây) cho shot [t0, t1]: bắt đầu mỗi `buoc` s, dài `cuaSo` s; kẹp trong khung đầu/cuối shot.
// Shot ngắn hơn cuaSo -> [] (không áp dụng).
export function cuaSoDong(t0, t1, cuaSo, buoc, fps = 30) {
  const out = [];
  if (!(buoc > 0) || !(cuaSo > 0)) return out;
  const lo = t0 + 1 / fps, hi = t1 - 1 / fps;
  for (let k = 0; t0 + k * buoc + cuaSo <= t1 + 1e-9; k++) {
    const s = t0 + k * buoc;
    out.push([Math.max(lo, s), Math.min(hi, s + cuaSo / 2), Math.min(hi, s + cuaSo)]);
  }
  return out;
}
