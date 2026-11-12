// credits.js — ảnh GHI CÔNG cuối phim (episodes/<ep>/ghi-cong.png, sinh bởi tools/ghi-cong.mjs).
// Hiện phủ lên khung trong `secs` giây cuối của phim, mờ dần vào trong `fade` giây đầu. Là hàm THUẦN của t (tua tới/lui ra cùng hình).
// Không kéo dài phim: 3 giây cuối là 3 giây cuối sẵn có. Tắt được: setOn(false) (tuỳ chọn `credits` của trình phát).
//   const credits = await createCredits({ root, src: '/episodes/ep001/ghi-cong.png', total: tl.total, on: false });
//   stage.onFrame((t) => credits.update(t));   // lớp <img> trên màn hình (opacity)
//   window.__credits = credits;                // tools/export-ui.js vẽ ảnh này vào khung xuất MP4 (giống phụ đề)
// Không có file ảnh (404) → credits.available = false, mọi hàm không làm gì.
export const CREDITS_SECS = 3, CREDITS_FADE = 0.4;

// độ mờ (0..1) tại thời điểm t — hàm thuần
export function creditsAlpha(t, total, secs = CREDITS_SECS, fade = CREDITS_FADE) {
  const t0 = total - secs;
  if (!(t >= t0)) return 0;
  return Math.min(1, (t - t0) / fade);
}

export async function createCredits({ root, src, total, on = true, secs = CREDITS_SECS, fade = CREDITS_FADE }) {
  const c = { available: false, on: false, img: null, total, secs, fade,
    alpha: (t) => (c.available && c.on ? creditsAlpha(t, total, secs, fade) : 0),
    setOn(v) { c.on = !!v && c.available; return c.on; },
    update(t) {
      if (!c.img) return;
      const a = c.alpha(t);
      c.img.style.opacity = a ? String(a) : '0';
      c.img.style.display = a ? 'block' : 'none';
    } };
  let blobUrl = '';
  try {
    const r = await fetch(src);   // bản gộp: fetch đã được nối vào dữ liệu nhúng
    if (!r.ok) return c;
    blobUrl = URL.createObjectURL(await r.blob());
  } catch (e) { return c; }
  const img = new Image();
  img.id = 'credits';
  img.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:none;opacity:0;pointer-events:none';
  img.src = blobUrl;
  try { await img.decode(); } catch (e) { return c; }
  root.appendChild(img);
  c.img = img; c.available = true; c.on = !!on;
  return c;
}
