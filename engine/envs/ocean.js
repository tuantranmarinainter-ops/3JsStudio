// Bối cảnh 'ocean' (preset ánh sáng mặc định: ocean). Sửa bối cảnh này CHỈ trong file này.
// Được engine/envs.js gọi: build(g, e, H) — g = Group của env, e = đối tượng env, H = bộ công cụ chung (xem envs.js).
// Thời gian: update(t, ctx) nhận t toàn cục; mặt biển, cá voi và sự kiện mặt nước (sea.setEvents) dùng CÙNG t đó.
// Đơn vị stud. Mặt biển y = 11. Dữ liệu tập: OCEAN_PLAN_EP001 (dưới) — tập khác: gán e.oceanPlan hoặc đổi plan truyền vào.
//   e.life = createOceanLife(THREE, A, { seaY: 11, plan });  g.add(e.life.group);
//   update(t): e.sea(t); e.life.update(t, camera, renderer); e.sea.setEvents?.(e.life.seaEvents(t));
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

// sea2 (học Tidewright "dawn"/Saltline): biển ngày xanh sâu nhiệt đới — rãnh sóng xanh-đen, mặt sóng hướng trời xanh lơ
// (Fresnel), đỉnh mỏng ngược sáng xanh ngọc, ít bọt lác đác hơn (trời lặng gió), chân trời khói xanh nhạt.
// Bật/tắt bằng ô sea2 (globalThis.__autoFx.sea2) — tắt ⇒ đúng màu/ánh sáng cũ (đọc lại từ preset 'deep').
const SEA2_LOOK = {
  deep: '#011d36', shallow: '#0a5f96', sss: '#23a89a',        // rãnh gần đen-xanh · mặt sóng · đỉnh ngọc bích ngược sáng
  skyMix: 0.6, sssK: 0.6, detail: 0.62, glint: 1.25, foam: [0.52, 0.92, 0.38],
};
// ánh sáng: CHỈ đổi chân trời + sương (nước phản chiếu chân trời → bớt trắng sữa). Không đổi hemi/sun/top:
//   thử hạ hemi đất + sun ấm làm nhân vật/nhà tối hẳn (sáng TB 120 → 83) nên bỏ.
const SEA2_LIGHT = { bottom: '#a6d8f4', fog: '#a9d7f0' };

// Kịch bản sinh vật biển của ep001 (dữ liệu cho engine/whales.js createOceanLife — lõi không chứa số của tập).
//   Mốc thời gian tương đối với t0 = 62.0 s (t toàn cục). Mốc shot: s053 62.13–62.77, s054 62.77–64.27, s055 64.30–65.20, s056 65.20–66.90.
//   Đơn vị: R/at/radius = stud, deep/lift = mét (rig scale S = 3 stud/m → cá dài 16 m ≈ 48 stud, nhà rộng ~38 stud).
//   a0 / swimPhase viết dạng "giá trị cũ theo t tuyệt đối + w·t0" để khớp đúng khung hình bản trước.
const T0 = 62.0, SW = 0.55;
export const OCEAN_PLAN_EP001 = {
  asset: 'sea/sperm_whale', S: 3.0, swimSpeed: SW, t0: T0,
  actors: [
    // con 1: từ dưới sâu nổi lên trước chân nhà (s054), thở + phun, rồi bơi vòng quanh chân nhà (a(63.5) ≈ phía trước nhà)
    { type: 'circler', name: 'whale_circler', R: 72, w: 0.4, a0: -24.36 + 0.4 * T0, rise: [0.6, 1.3], deep: -6, lift: 2.4, swimPhase: T0 * SW,
      breathe: [0.95, 1.15], spout: { at: [0, 2.6, 6.2] },
      surfaceRing: { strength: 0.75, radius: 11 }, wake: { every: 1.0, life: 2.0, strength: 0.32, radius: 5, delay: 0.3, until: 28 } },
    // con 2: cùng vòng, đối diện; lặn sâu trong s054 rồi nổi lên trong s055 (từ trên cao thấy 2 con quanh nhà)
    { type: 'circler', name: 'whale_far', R: 47, w: 0.4, a0: -24.38 + Math.PI + 0.4 * T0, rise: [1.9, 2.6], deep: -7, lift: 3.0, swimPhase: T0 * SW + 0.31,
      surfaceRing: { strength: 0.75, radius: 10 }, wake: { every: 1.0, life: 2.0, strength: 0.32, radius: 5, delay: 0.8, until: 28 } },
    // con nhảy: lao lên bên phải chân nhà, hướng về máy s056 (lên ~65.36 s, đập xuống ~66.30 s); đập xuống to hơn lúc lên
    { type: 'jumper', name: 'whale_jumper', at: [40.7, 13.9], heading: 0.56, t0: 64.976 - T0, speed: 0.7, approach: 7, clipTravel: 11, depth: 6, swimPhase: T0 * SW,
      splash: { seed: 5, scale: 21, dropScale: 0.6 }, exit: { strength: 1.3, radius: 13 }, entry: { strength: 2.7, radius: 22 }, drips: true },
  ],
};

export default function build(g, e, H) {
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  e.sea = makeSea(g, { preset: 'deep', y: 11, amp: 0.6, size: 1600 });
  g.add(plane(900, 900, mat('#0e5f86'), -10, 'seabed'));
  // cá voi GLB (nổi lên, bơi vòng quanh chân nhà, 1 cú nhảy + nước văng); thiếu asset → về cá voi khối cũ
  // e.oceanPlan: tập khác có thể gán kịch bản riêng trước khi dựng env; mặc định = ep001
  e.life = A && A.has('sea/sperm_whale') ? createOceanLife(THREE, A, { seaY: 11, plan: e.oceanPlan || OCEAN_PLAN_EP001 }) : null;
  if (e.life) g.add(e.life.group);
  else e.whales = [0, 1, 2].map(() => place(g, K.whale(), 0, 0, 0, 0, 1));
  place(g, K.cloud(2.5), -120, 120, -300); place(g, K.cloud(2), 150, 100, -350);

  // --- bảng màu sea2 ↔ màu cũ: đặt thẳng uniform mỗi khung (water.update không ghi đè các uniform này) ---
  const W = e.sea.water, U = W?.uniforms;
  const old = U && { deep: U.uDeep.value.clone(), shallow: U.uShallow.value.clone(), sss: U.uSss.value.clone(),
    skyMix: U.uSkyMix.value, sssK: U.uSssK.value, detail: U.uDetail.value, foamR: U.uFoamR.value.clone() };
  const look2 = U && { deep: new THREE.Color(SEA2_LOOK.deep), shallow: new THREE.Color(SEA2_LOOK.shallow), sss: new THREE.Color(SEA2_LOOK.sss) };
  const applyLook = (on) => {
    if (!U) return;
    U.uDeep.value.copy(on ? look2.deep : old.deep); U.uShallow.value.copy(on ? look2.shallow : old.shallow); U.uSss.value.copy(on ? look2.sss : old.sss);
    U.uSkyMix.value = on ? SEA2_LOOK.skyMix : old.skyMix; U.uSssK.value = on ? SEA2_LOOK.sssK : old.sssK; U.uDetail.value = on ? SEA2_LOOK.detail : old.detail;
    if (on) U.uFoamR.value.set(SEA2_LOOK.foam[0], SEA2_LOOK.foam[1], SEA2_LOOK.foam[2], SEA2_LOOK.glint); else U.uFoamR.value.copy(old.foamR);
  };

  return { update(t, ctx = {}) {
    const on = globalThis.__autoFx?.sea2 ?? true;
    e.sea(t);   // thời gian của mặt biển = t toàn cục (cá voi + sự kiện mặt nước cùng hệ)
    applyLook(on);
    if (on && (ctx.light || e.light) === 'ocean') ctx.lightOverride = { ...SEA2_LIGHT, ...(ctx.lightOverride || {}) };
    if (e.life) {
      e.life.update(t, stage.camera, stage.renderer);
      // cá voi → sự kiện mặt nước (vòng sóng + hố + bọt): danh sách là hàm thuần của t
      e.sea.setEvents?.(on ? e.life.seaEvents(t) : null);
    }
    else e.whales.forEach((w, i) => { const a = t * 0.18 + i * 2.1, r = 30 + i * 9; w.position.set(Math.cos(a) * r, 7 + Math.sin(t * 0.9 + i) * 0.6, Math.sin(a) * r); w.rotation.y = -a; K.swim(w, t, i); }); } };
}
