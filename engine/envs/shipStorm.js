// Bối cảnh 'shipStorm' (preset ánh sáng mặc định: storm). Sửa bối cảnh này CHỈ trong file này.
// Được engine/envs.js gọi: build(g, e, H) — g = Group của env, e = đối tượng env, H = bộ công cụ chung (xem envs.js).
import { createSail } from '../cloth.js';
import { createMastBreak } from '../mastbreak.js';
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
import { floatPose, wetline, worldGrad } from '../floating.js';

export default function build(g, e, H) {
  const { ganTang, THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  e.sea = makeSea(g, { preset: 'storm', y: -1, amp: 2.2, size: 1600, rate: 1.5 });
  ganTang(e.sea.water.mesh, 'front');   // quy ước mặt nước = tầng trước
  // GIÓ GIẬT quanh lúc gãy cột (36,7–37,6 s): 0 → 1 → 0, hàm thuần của t. Dùng cho sóng, mưa xiên, mây trôi, chớp.
  const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  e.gust = (t) => ss(36.3, 36.85, t) * (1 - ss(37.6, 38.6, t));
  e.seaDrive = (tg) => ({ amp: 2.2 * (1 + 0.15 * e.gust(tg)), rate: 1.5 });   // engine/shots.js prepareSea → biển dâng nhẹ (dâng mạnh hơn làm mũi sóng phẳng sát ống kính s032)
  // sóng lớn: vòng sóng toả từ mạn phải lúc cột rung + lúc RẮC (sự kiện biển, engine/sea.js; t0 theo t toàn cục)
  e.seaEvents = (t) => (t > 36 && t < 41 ? [{ x: 7, z: 2, t0: 36.7, strength: 2.2, radius: 14 }, { x: 6, z: -4, t0: 36.95, strength: 2.8, radius: 16 }] : null);
  // trời bão nhiều lớp (engine/stormsky.js, ô 'stormSky'): trăng sau lưng cột buồm ở góc s032, loé theo tia sét
  e.stormSky = { moon: [-0.72, 0.3, -0.62], bolt: [30 * 1, 25 + 20, -120], gust: e.gust, cover: 0.64, speed: 1.2 };   // t biển = t·1.5 (engine/sea.js) — vật nổi tự lấy sea.clock
  e.ship = ganTang(place(g, K.ship(), 0, 0, 0, 0, 1), 'mid');   // tầng giữa: tàu
  // buồm VẢI MỀM (engine/cloth.js, 2026-11-12, học cảm giác buồm Tidewright): thay 2 buồm khối của Kenney bằng lưới vải
  //   cùng chỗ/cùng cỡ — phồng–xẹp theo gió giật bão, gợn chạy ngang tấm, mép dưới phần phật, xuyên sáng khi chớp/đèn sau lưng
  e.sails = [];
  for (const [nm, H, B, sd] of [['sail-a', 4.72, 1.5, 1], ['sail-b', 3.63, 1.2, 2]]) {
    const old = e.ship.getObjectByName(nm); if (!old) continue;
    const sl = createSail(THREE, { w: 4.4, h: H, belly: B, wind: 1.7, seed: sd, color: '#ebe1ca', spars: true, name: nm + '_cloth' });
    sl.position.copy(old.position); sl.quaternion.copy(old.quaternion); sl.scale.copy(old.scale);
    sl.position.y += H * old.scale.y;
    old.parent.add(sl); old.visible = false; e.sails.push(sl);
  }
  // GÃY CỘT BUỒM (thử, engine/mastbreak.js): cột chính rung–rắc ở s031 rồi đổ qua mạn phải cùng buồm + cờ ở s032, nằm luôn tới s086
  let hullMesh = null; e.ship.traverse((o) => { if (o.isMesh && !o.name.includes('_cloth') && (!hullMesh || o.geometry.attributes.position.count > hullMesh.geometry.attributes.position.count)) hullMesh = o; });   // thân tàu = mesh nhiều đỉnh nhất
  e.mast = null;
  if (hullMesh && hullMesh.isMesh) {
    g.updateMatrixWorld(true);
    e.mast = createMastBreak(THREE, hullMesh, { hinge: [0, 3.4, -0.35], box: [0.55, 0.62], t0: 36.7, angle: 1.1,
      parts: [e.ship.getObjectByName('sail-a_cloth'), e.ship.getObjectByName('flag-b')] });
  }
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
    const F = floatPose(e.sea, { x: 0, z: 0, yaw: 0, ...HULL, t, draft: DRAFT, pitchK: 0.92, rollK: 0.62, maxPitch: 0.2, maxRoll: 0.3 });   // lõi chung (floating.js)
    sh.rotation.set(F.rotX, 0, F.rotZ); sh.position.set(0, F.dy, 0);
    return F;
  };
  e.carry = (t) => { if (!SEA2()) return null; e.shipPose(t); e.ship.updateMatrix(); return e.ship.matrix; };
  e.rain = fxRain(THREE, { count: 1600, area: [70, 50, 70] }); g.add(ganTang(e.rain.obj, 'front'));   // tầng trước: mưa quanh camera
  // tầng sau (ô FX tangXa; ep001 tắt): núi mờ trong sương quanh chân trời, 650–800 stud < camera.far 1000; update() ẩn/hiện theo ô
  const tx = new THREE.Group(); tx.name = 'shipstorm_tangxa'; g.add(tx);
  { const far = new THREE.Group(); far.name = 'shipstorm_far_rocks';
    for (let i = 0; i < 10; i++) { const a = (i + hash(i, 41) * 0.5) * 0.6283, r = 520 + hash(i, 42) * 100, w = 220 + hash(i, 43) * 120, h = 110 + hash(i, 44) * 60;   // bóng núi cao ~12–16° ở chân trời, màu sáng hơn mây bão để đọc được
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat('#7388b0', { flatShading: true, roughness: 1 })); m.scale.set(w, h, w * 0.35); m.position.set(Math.cos(a) * r, h * 0.15, Math.sin(a) * r); m.rotation.y = -a + Math.PI / 2; far.add(m); }
    e.farRocks = far; tx.add(ganTang(far, 'back')); }
  e.bolt = fxBolt(THREE, { seed: 9 }); e.bolt.position.set(30, 25, -120); e.bolt.scale.setScalar(1.8); g.add(e.bolt);
  return { suSong: ['song'], update(t, ctx) { tx.visible = globalThis.__autoFx?.tangXa !== false; const G = e.gust(t); e.rain.slant = [0.25 + 0.9 * G, 0.1 + 0.35 * G];   // gió giật → mưa quất xiên (đặt TRƯỚC rain.update)
    e.sea(t, 2.2); for (const sl of e.sails) sl.userData.update(t); e.mast?.update(t); e.rain.update(t, ctx.focus || [0, 0, 0]); const F = e.shipPose(t);
    if (F) { const gr = worldGrad(F.sx, F.sz, 0); e.wet.set({ x: 0, z: 0, y: F.y, ...gr, t: e.sea.clock(t).t });
      e.sea.setHull({ x: 0, z: 0, hx: HULL.hx, hz: HULL.hz * 0.8, yaw: 0, k: 1, plunge: Math.min(1, Math.max(0, -F.vy / 4)) }); }
    else { e.wet.off(); e.sea.setHull(null); }
     // sét đánh đúng nhịp RẮC (36,95) + dư chấn 37,08
     const pk = (c, w) => Math.max(0, 1 - Math.abs(t - c) / w);
     const f = Math.max(smoothFlash(t, { every: 2.4, seed: 8 }), pk(36.93, 0.07), pk(37.08, 0.05) * 0.75); e.bolt.visible = f > 0.45; ctx.flash = f; } };
}
