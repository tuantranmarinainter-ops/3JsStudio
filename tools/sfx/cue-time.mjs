// Thời điểm cue tính từ shots.js (trường `events: { tên: giây cục bộ }`) — bản JS của cue_time() trong mix.py.
export function parseShotEvents(src) {
  const out = {};
  for (const m of src.matchAll(/\{ id: '([^']+)', f: \[(\d+), (\d+)\](.*?)\},?\s*$/gm)) {
    const ev = /events:\s*\{([^}]*)\}/.exec(m[4]);
    const d = {};
    if (ev) for (const [, k, v] of ev[1].matchAll(/([A-Za-z_]\w*)\s*:\s*(-?[\d.]+)/g)) d[k] = +v;
    out[m[1]] = { start: +m[2] / 30, events: d };
  }
  return out;
}
// cue có `event` → bắt đầu shot + mốc + dt; không có → t tuyệt đối. Ném lỗi nếu mốc không tồn tại.
export function cueTime(c, ev) {
  if (!c.event) return Number(c.t);
  const i = c.event.lastIndexOf('.');
  const sid = i >= 0 ? c.event.slice(0, i) : c.shot, nm = i >= 0 ? c.event.slice(i + 1) : c.event;
  const s = ev[sid];
  if (!s || !(nm in s.events)) throw new Error(`cue event '${c.event}' (shot ${sid}) không có trong shots.js:events`);
  return Math.round((s.start + s.events[nm] + (Number(c.dt) || 0)) * 1000) / 1000;
}
// So giờ tính được (c.tCalc) với t khai báo (c.t) và neo khai báo với neo đo được; trả danh sách cảnh báo (khung 30 fps).
export function cueIssues(c, measuredAnchor, fps = 30) {
  const tol = (c.tol ?? 1) / fps, out = [];
  if (c.event && c.t != null && Math.abs(c.tCalc - c.t) > tol + 1e-9)
    out.push(`event→${c.tCalc.toFixed(3)}s lệch t=${c.t} ${((c.tCalc - c.t) * fps).toFixed(1)} khung (> tol ${c.tol ?? 1})`);
  if (typeof c.anchor === 'number' && measuredAnchor != null && Math.abs(c.anchor - measuredAnchor) > tol + 1e-9)
    out.push(`anchor ${c.anchor} ≠ đo ${measuredAnchor} (${((c.anchor - measuredAnchor) * fps).toFixed(1)} khung)`);
  return out;
}
