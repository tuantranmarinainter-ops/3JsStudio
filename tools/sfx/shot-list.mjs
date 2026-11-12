// Danh sách shot DÙNG CHUNG cho mọi tool âm thanh — đọc được cả 2 định dạng shots.js:
//   ep001: { id: 's001', f: [a, b], env, light, events: {…} }   (khung hình, b gồm cả)
//   tập sinh tự động: { id: "s001", dur: 1.5, at, env?, time: "dem", … }   (giây, nối tiếp)
// CLI: node tools/sfx/shot-list.mjs <ep>  → JSON { total, shots: [{id, t0, t1, env, light, events}] } (cho mix.py).
// Quy tắc env/light: shot kiểu `f` → đúng trường ghi trong shot (như cũ, không suy diễn);
// shot kiểu `dur` → env = shot.env, hoặc '<chỗ>_in' → '<chỗ>', hoặc EPISODE.env; light = shot.light, hoặc time:"dem" → 'night'.
import { pathToFileURL, fileURLToPath } from 'url';
import { resolve, dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FPS = 30;

export function buildShotList(shots, episode = {}) {
  let cursor = 0;
  const list = shots.map((s) => {
    const legacy = Array.isArray(s.f);
    const t0 = legacy ? s.f[0] / FPS : cursor;
    const t1 = legacy ? (s.f[1] + 1) / FPS : t0 + s.dur;
    cursor = t1;
    let env, light;
    if (legacy) { env = s.env || ''; light = s.light || ''; }
    else {
      env = s.env || (typeof s.at === 'string' && s.at.endsWith('_in') ? s.at.slice(0, -3) : episode.env) || '';
      light = s.light || (s.time === 'dem' ? 'night' : '');
    }
    return { id: s.id, t0, t1, env, light, events: s.events && typeof s.events === 'object' ? s.events : {} };
  });
  return { total: list.length ? list[list.length - 1].t1 : 0, shots: list };
}

export async function loadShotList(ep, root = ROOT) {
  const dir = join(root, 'episodes', ep);
  const { SHOTS } = await import(pathToFileURL(join(dir, 'shots.js')).href);
  let episode = {};
  // episode.js kéo three/engine (không nạp được ở Node thuần) → chỉ đọc chữ trường env mặc định cấp tập
  if (existsSync(join(dir, 'episode.js'))) { const m = /^\s*env:\s*["']([^"']+)["']/m.exec(readFileSync(join(dir, 'episode.js'), 'utf8')); if (m) episode = { env: m[1] }; }
  return buildShotList(SHOTS, episode);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ep = process.argv[2];
  if (!ep) { console.error('Dùng: node tools/sfx/shot-list.mjs <ep>'); process.exit(1); }
  process.stdout.write(JSON.stringify(await loadShotList(ep)));
}
