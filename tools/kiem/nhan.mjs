// Ảnh -> Node và gắn nhãn, dùng một tab trống (page) của trình duyệt.
//   docAnh(page, png, w, h)            -> { w, h, data: Uint8ClampedArray RGBA } (giảm cỡ bằng canvas)
//   ganNhan(page, png, dong1, dong2)   -> Buffer JPG 540x960, dải nhãn 2 dòng ở góc trên
export async function docAnh(page, png, w, h) {
  const b64 = await page.evaluate(async ({ s, w, h }) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    let bin = ''; const CH = 0x8000;
    for (let i = 0; i < d.length; i += CH) bin += String.fromCharCode.apply(null, d.subarray(i, i + CH));
    return btoa(bin);
  }, { s: png.toString('base64'), w, h });
  const buf = Buffer.from(b64, 'base64');
  return { w, h, data: new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.length) };
}

export async function ganNhan(page, png, dong1, dong2) {
  const b64 = await page.evaluate(async ({ s, d1, d2 }) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
    const c = document.createElement('canvas'); c.width = 540; c.height = 960;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0, 540, 960);
    const fam = '"Be Vietnam Pro", "Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
    g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, 0, 540, 56);
    g.textBaseline = 'top'; g.fillStyle = '#fff';
    g.font = `600 20px ${fam}`; g.fillText(d1, 10, 5, 520);
    g.font = `500 18px ${fam}`; g.fillStyle = '#ffe08a'; g.fillText(d2, 10, 30, 520);
    return c.toDataURL('image/jpeg', 0.8).split(',')[1];
  }, { s: png.toString('base64'), d1: dong1, d2: dong2 });
  return Buffer.from(b64, 'base64');
}

// Lưới nhiều khung đã gắn nhãn (JPG buffer) -> một ảnh rộng ~800 px.
export async function luoiAnh(page, jpgs, { cot = 4, rong = 800 } = {}) {
  if (!jpgs.length) return null;
  const b64 = await page.evaluate(async ({ list, cot, rong }) => {
    const o = rong / cot, cao = Math.round(o * 960 / 540), hang = Math.ceil(list.length / cot);
    const c = document.createElement('canvas'); c.width = rong; c.height = hang * cao;
    const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < list.length; i++) {
      const im = new Image(); im.src = 'data:image/jpeg;base64,' + list[i]; await im.decode();
      g.drawImage(im, (i % cot) * o, Math.floor(i / cot) * cao, o, cao);
    }
    return c.toDataURL('image/jpeg', 0.8).split(',')[1];
  }, { list: jpgs.map((b) => b.toString('base64')), cot, rong });
  return Buffer.from(b64, 'base64');
}
