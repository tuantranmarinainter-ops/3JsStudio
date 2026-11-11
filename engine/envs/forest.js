// Bối cảnh 'forest' (preset ánh sáng mặc định: night). Sửa bối cảnh này CHỈ trong file này.
// Được engine/envs.js gọi: build(g, e, H) — g = Group của env, e = đối tượng env, H = bộ công cụ chung (xem envs.js).
import { fxSnow, fxRain, lightning, fxBolt } from '../fx.js';
import { createWater } from '../water.js';
import { createOceanLife, OCEAN_LIFE_ASSETS } from '../whales.js';
import { townLife } from '../townlife.js';
import { createSummit, createRange } from '../peaks.js';
import { createCloudSea, createCloudPuffs } from '../clouds.js';
import { pyramid, camel, jungleGiant, bigLeaves } from '../env_desert.js';
import { snowRanges } from '../snowpeaks.js';
import { createCliff, naturalRock, coralRock } from '../cliff.js';
import { createCrabs, createBeachGrass } from '../crabs.js';
import { createCamp } from '../castaway.js';
import { smoothFlash } from '../flash.js';

export default function build(g, e, H) {
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  g.add(plane(900, 900, mat('#2f5a33'), 0, 'forest_floor'));
  const path = plane(900, 16, mat('#6b5a3c'), 0.05, 'path'); g.add(path);
  // Rừng thông DÀY: ~1100 cây, đặc nhất sát đường; chừa hành lang tầm nhìn giữa camera (s043/s044) và nhà
  const segs = [[42, 82, -14, 0], [-31, 96, 10, 0]], clear = (x, z, r) => segs.some(([ax, az, bx, bz]) => { const dx = bx - ax, dz = bz - az, u = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - dx * u, z - az - dz * u) < r; });
  let tn = 0;
  for (let i = 0; i < 2400 && tn < 1100; i++) {
    const x = (hash(i, 1) - 0.5) * 520, side = hash(i, 5) < 0.5 ? -1 : 1, z = side * (17 + Math.pow(hash(i, 2), 1.5) * 260);
    if (clear(x, z, 24 - Math.min(10, Math.abs(z) / 12)) && Math.abs(z) < 120) continue;
    if (x > -42 && x < 44 && Math.abs(z) < 30) continue;   // lối nhà đi s043–s044 (x −20→20): chân nhà dang rộng ~±18, không cho cây đè (góp ý 2026-11-11 #7)
    tn++; place(g, K.pine(12 + hash(i, 3) * 20 + Math.min(10, Math.abs(z) / 14), false), x, 0, z, hash(i, 4) * 6, 0.9 + hash(i, 6) * 0.35);
  }
  for (let i = 0; i < 90; i++) { const x = (hash(i, 11) - 0.5) * 300, z = (hash(i, 12) < 0.5 ? -1 : 1) * (20 + hash(i, 13) * 90); if (!clear(x, z, 24)) place(g, K.bush(1.8 + hash(i, 14) * 1.6, '#2a5a30'), x, 0, z, hash(i, 15) * 6); }
}
