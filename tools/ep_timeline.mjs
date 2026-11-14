// In timeline của một tập ra JSON (dùng cho các tool Python: popscan.py, mix.py).
//   node tools/ep_timeline.mjs ep001  →  {"fps":30,"total":171.07,"shots":[{"id":"s001","t0":0,"t1":1.2,"line":1,"sfx":…},…]}
// Chỉ đọc episodes/<ep>/shots.js (dữ liệu thuần) + engine/timeline.js — không cần trình duyệt.
import { pathToFileURL } from 'url';
import { resolve } from 'path';
import { buildTimeline } from '../engine/timeline.js';

const ep = process.argv[2] || 'ep001';
const fps = +(process.argv[3] || 30);
const { SHOTS } = await import(pathToFileURL(resolve('episodes', ep, 'shots.js')).href);
const tl = buildTimeline(SHOTS, fps);
const r = (x) => Math.round(x * 1e6) / 1e6;
const shots = tl.list.map((s) => {
  const o = { id: s.id, t0: r(s.t0), t1: r(s.t1) };
  if (s.line !== undefined) o.line = s.line;
  if (s.sfx !== undefined) o.sfx = s.sfx;
  return o;
});
process.stdout.write(JSON.stringify({ ep, fps, total: r(tl.total), shots }));
