// spring.js — Lò xo dạng công thức đóng: chuyển động mềm, có nảy nhẹ, nhưng vẫn là HÀM THUẦN của t
// (tua tới/lui/nhảy cóc đều ra cùng kết quả — không giữ trạng thái giữa các frame).
//
// 1) springStep(t, o)  — đáp ứng bậc thang 0 → 1 của lò xo tắt dần, t tính bằng giây.
//      o.freq   tần số riêng (Hz, mặc định 2.2)   — lớn = nhanh
//      o.damp   hệ số tắt dần ζ (mặc định 0.65)   — 1 = không nảy, 0.5 = nảy rõ, < 0.4 = rung
// 2) springEase(k, o)  — dùng như hàm ease trên tiến độ shot k ∈ [0,1]: đi 0 → 1, nảy nhẹ, kết thúc ĐÚNG 1 tại k = 1.
// 3) springTrack(keys, t, o) — giá trị đổi đích nhiều lần = TỔNG của 1 lò xo cho mỗi lần đổi.
//      keys = [[t0, v0], [t1, v1], …]  (t tăng dần; v là số hoặc mảng số cùng độ dài)
//      Tại t < t1 giá trị = v0; mỗi lần đổi đích i góp (v_i − v_{i−1}) · springStep(t − t_i).
//      Đổi đích giữa chừng (khi lò xo trước chưa yên) vẫn mượt vì các lò xo cộng chồng tuyến tính.
// 4) springEdges(keys, t, lead, trail) — 2 mép của 1 vật chạy theo 2 lò xo khác nhau → mép trước
//      vượt lên, mép sau theo sau: vật giãn ra khi chạy và co lại khi dừng (squash/stretch).

const TAU = Math.PI * 2;

export function springStep(t, { freq = 2.2, damp = 0.65 } = {}) {
  if (t <= 0) return 0;
  const w = TAU * freq, z = damp;
  if (z >= 1) {                                   // tắt dần tới hạn / quá tới hạn: không nảy
    if (z === 1) return 1 - Math.exp(-w * t) * (1 + w * t);
    const s = w * Math.sqrt(z * z - 1), r1 = -z * w + s, r2 = -z * w - s;
    return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
  }
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}

// k ∈ [0,1]; settle = phần shot dành cho lò xo (mặc định 1 = cả shot). Phần dư còn lại tại k=settle
// (rất nhỏ) được trừ dần bằng k^4 để chắc chắn khớp đúng 1 ở cuối — không có bước nhảy khi cắt cảnh.
export function springEase(k, { damp = 0.7, settle = 1, bounces = 1.6 } = {}) {
  if (k <= 0) return 0;
  const u = Math.min(1, k / settle);
  // chọn tần số sao cho trong khoảng settle có ~`bounces` nửa dao động (lên-xuống) và biên độ đã tắt gần hết
  const freq = bounces * 0.5 / Math.sqrt(Math.max(1e-6, 1 - Math.min(damp, 0.999) ** 2));
  const step = (x) => springStep(x, { freq, damp });
  const end = step(1);
  return step(u) + (1 - end) * u ** 4;
}

export function springTrack(keys, t, opts = {}) {
  if (!keys.length) return 0;
  const v0 = keys[0][1];
  if (Array.isArray(v0)) {
    const out = v0.slice();
    for (let i = 1; i < keys.length; i++) {
      const s = springStep(t - keys[i][0], keys[i][2] || opts);
      if (s === 0) break;                          // keys tăng dần → các key sau cũng chưa bắt đầu
      const a = keys[i - 1][1], b = keys[i][1];
      for (let j = 0; j < out.length; j++) out[j] += (b[j] - a[j]) * s;
    }
    return out;
  }
  let v = v0;
  for (let i = 1; i < keys.length; i++) {
    const s = springStep(t - keys[i][0], keys[i][2] || opts);
    if (s === 0) break;
    v += (keys[i][1] - keys[i - 1][1]) * s;
  }
  return v;
}

// Trả { lead, trail, center, stretch }: lead/trail là vị trí 2 mép (lead nhanh hơn trail),
// stretch = lead − trail (dương khi đang lao tới) — dùng để kéo giãn vật theo hướng chạy.
export function springEdges(keys, t, lead = { freq: 2.8, damp: 0.55 }, trail = { freq: 1.9, damp: 0.75 }) {
  const a = springTrack(keys, t, lead), b = springTrack(keys, t, trail);
  if (Array.isArray(a)) return { lead: a, trail: b, center: a.map((x, i) => (x + b[i]) / 2), stretch: a.map((x, i) => x - b[i]) };
  return { lead: a, trail: b, center: (a + b) / 2, stretch: a - b };
}
