// timeline.js — t toàn cục → shot đang chạy + t cục bộ + tiến độ k (0..1).
// Shot ghi `f: [f0, f1]` (frame, gồm cả f1) theo cut list, hoặc `dur` (giây) nối tiếp shot trước.
export function buildTimeline(shots, fps = 30) {
  let cursor = 0;
  const list = shots.map((s, i) => {
    const t0 = s.f ? s.f[0] / fps : cursor;
    const t1 = s.f ? (s.f[1] + 1) / fps : t0 + s.dur;
    cursor = t1;
    return { ...s, index: i, t0, t1, dur: t1 - t0 };
  });
  const total = list.length ? list[list.length - 1].t1 : 0;
  function at(t) {
    let lo = 0, hi = list.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (list[mid].t0 <= t + 1e-6) lo = mid; else hi = mid - 1; }
    const shot = list[lo];
    const local = Math.max(0, t - shot.t0);
    return { shot, local, k: Math.min(1, local / shot.dur), prev: list[lo - 1], next: list[lo + 1] };
  }
  return { list, total, at, fps };
}
