// Bối cảnh 'shipStorm' (preset ánh sáng mặc định: storm). Sửa bối cảnh này CHỈ trong file này.
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
import { floatHull, wetline, worldGrad } from '../floating.js';

export default function build(g, e, H) {
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  e.sea = makeSea(g, { preset: 'storm', y: -1, amp: 2.2, size: 1600 });
  e.seaClock = (t) => ({ t: t * 1.5, amp: 2.2 });   // = e.sea(t * 1.5, 2.2) trong update — engine/floating.js cần đúng giá trị này
  e.ship = place(g, K.ship(), 0, 0, 0, 0, 1);
  // sea2: tàu cưỡi sóng thật (engine/floating.js) — đáy hộp bao lấy làm mặt lọc sóng; DRAFT = độ chìm thêm so với bản cũ
  const bb = new THREE.Box3().setFromObject(e.ship), bsz = bb.getSize(new THREE.Vector3());
  const HULL = { hx: bsz.x / 2 * 0.8, hz: bsz.z / 2 * 0.8 }, DRAFT = 1.6, SEA_Y = -1;
  e.wet = wetline(THREE, e.ship);
  const SEA2 = () => globalThis.__autoFx?.sea2 ?? true;
  // tư thế tàu = hàm thuần của t (camera KHÔNG dùng: fade = 1, tàu ở gốc, camera các shot < 120 đv) → engine/shots.js gọi được
  //   trước khi đặt camera để chở người trên boong (e.carry), cho cùng kết quả với update()
  e.shipPose = (t) => {
    const sh = e.ship;
    if (!SEA2()) { sh.rotation.set(Math.sin(t * 0.8) * 0.06, 0, Math.sin(t * 1.1) * 0.12); sh.position.set(0, Math.sin(t * 1.3) * 0.8, 0); return null; }
    const F = floatHull(e.sea.sample, { x: 0, z: 0, yaw: 0, ...HULL, t, clock: e.seaClock, pitchK: 0.92, rollK: 0.62, maxPitch: 0.2, maxRoll: 0.3 });
    sh.rotation.set(F.rotX, 0, F.rotZ); sh.position.set(0, F.y - SEA_Y - DRAFT, 0);
    return F;
  };
  e.carry = (t) => { if (!SEA2()) return null; e.shipPose(t); e.ship.updateMatrix(); return e.ship.matrix; };
  e.rain = fxRain(THREE, { count: 1600, area: [70, 50, 70] }); g.add(e.rain.obj);
  e.bolt = fxBolt(THREE, { seed: 9 }); e.bolt.position.set(30, 25, -120); e.bolt.scale.setScalar(1.8); g.add(e.bolt);
  return { update(t, ctx) { e.sea(t * 1.5, 2.2); e.rain.update(t, ctx.focus || [0, 0, 0]); const F = e.shipPose(t);
    if (F) { const gr = worldGrad(F.sx, F.sz, 0); e.wet.set({ x: 0, z: 0, y: F.y, ...gr, t: t * 1.5 });
      e.sea.setHull({ x: 0, z: 0, hx: HULL.hx, hz: HULL.hz * 0.8, yaw: 0, k: 1, plunge: Math.min(1, Math.max(0, -F.vy / 4)) }); }
    else { e.wet.off(); e.sea.setHull(null); }
     const f = smoothFlash(t, { every: 2.4, seed: 8 }); e.bolt.visible = f > 0.45; ctx.flash = f; } };
}
