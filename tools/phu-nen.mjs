// phu-nen.mjs — hàm thuần: mọi giây của phim có được phủ bởi tiếng nền ("nen") hoặc nhạc,
// hoặc nằm trong đoạn yên lặng CÓ LÝ DO không? (doctor.mjs mục 11 dùng.)
//
// Đoạn yên lặng chủ ý: thêm vào episodes/<ep>/sfx/layers.json (khoá cấp cao nhất):
//   "quiet": [ { "from": 120.0, "to": 123.5, "reason": "im lặng trước khi lộ twist" } ]
// Đoạn thiếu "reason" KHÔNG được tính.

// Gộp các khoảng [a,b] chồng/kề nhau, cắt trong [0,total].
export function hopNhat(iv, total) {
  const s = iv.map(([a, b]) => [Math.max(0, +a), Math.min(total, +b)]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [a, b] of s) {
    if (out.length && a <= out[out.length - 1][1] + 1e-6) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b);
    else out.push([a, b]);
  }
  return out;
}

// Trả các khoảng [a,b] trong [0,total] chưa được phủ và dài > minGap.
export function khoangTrong(covers, total, minGap = 0.5) {
  const m = hopNhat(covers, total), gaps = [];
  let t = 0;
  for (const [a, b] of m) { if (a - t > minGap) gaps.push([t, a]); t = Math.max(t, b); }
  if (total - t > minGap) gaps.push([t, total]);
  return gaps;
}

// Từ nội dung các file → { covers, quiet, quietThieuLyDo }
export function gomPhu({ sfxLayers, layers, plan }) {
  const covers = [];
  for (const it of sfxLayers?.nen?.items || []) covers.push([it[0], it[1]]);
  for (const s of plan?.segments || []) covers.push([s.from, s.to]);
  const quiet = [], thieu = [];
  for (const q of layers?.quiet || []) {
    if (q && typeof q.from === 'number' && typeof q.to === 'number' && String(q.reason || '').trim()) { quiet.push([q.from, q.to]); covers.push([q.from, q.to]); }
    else thieu.push(q);
  }
  return { covers, quiet, quietThieuLyDo: thieu };
}
