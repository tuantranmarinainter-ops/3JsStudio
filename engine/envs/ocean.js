// Bối cảnh 'ocean' (preset ánh sáng mặc định: ocean). Sửa bối cảnh này CHỈ trong file này.
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

// sea2 (học Tidewright "dawn"/Saltline): biển ngày xanh sâu nhiệt đới — rãnh sóng xanh-đen, mặt sóng hướng trời xanh lơ
// (Fresnel), đỉnh mỏng ngược sáng xanh ngọc, ít bọt lác đác hơn (trời lặng gió), chân trời khói xanh nhạt.
// Bật/tắt bằng ô sea2 (globalThis.__autoFx.sea2) — tắt ⇒ đúng màu/ánh sáng cũ (đọc lại từ preset 'deep').
const SEA2_LOOK = {
  deep: '#011d36', shallow: '#0a5f96', sss: '#2fd3b4',        // rãnh gần đen-xanh · mặt sóng · đỉnh ngọc bích ngược sáng
  skyMix: 0.6, sssK: 1.25, detail: 0.62, glint: 1.25, foam: [0.52, 0.92, 0.38],
};
// ánh sáng: chân trời bớt trắng sữa (nước phản chiếu chân trời → khỏi nhạt), sương xa cùng tông; mặt trời ấm, cao vừa
const SEA2_LIGHT = { top: '#1f7fdb', bottom: '#a6d8f4', fog: '#a9d7f0', fogR: [240, 1000], hemi: ['#ffffff', '#1f6f98', 1.1], sun: ['#fff1d8', 2.75] };

export default function build(g, e, H) {
  const { THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  e.sea = makeSea(g, { preset: 'deep', y: 11, amp: 0.6, size: 1600 });
  g.add(plane(900, 900, mat('#0e5f86'), -10, 'seabed'));
  // cá voi GLB (nổi lên, bơi vòng quanh chân nhà, 1 cú nhảy + nước văng); thiếu asset → về cá voi khối cũ
  e.life = A && A.has('sea/sperm_whale') ? createOceanLife(THREE, A, { seaY: 11 }) : null;
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
