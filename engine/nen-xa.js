// Tầng nền xa dùng chung cho env ngoài trời: gió → rừng xa (farwoods) → núi xa (backdrop) → [gió 2 → bóng mây (cloudshade)].
// Gọi 1 dòng trong builder env: const nx = createNenXa(THREE, { scene, stage, g, ring: [150, 400], count: 2600, avoid, cloud: false });
// update(t, camera) tự đọc ô FX farwoods / backdrop / cloudShade (globalThis.__autoFx), tắt ô = ẩn nhóm.
import { createWind } from './wind.js';
import { createFarwoods } from './farwoods.js';
import { createBackdrop } from './backdrop.js';
import { createCloudShade } from './cloudshade.js';
import { ganTang } from './envs/tang.js';

const WIND = { dir: [1, 0.2], speed: 3, gust: 0.6, seed: 8, gustSize: 40 };

export function createNenXa(THREE, { scene, stage, g, seed = 8, ring = [150, 400], count = 2600, size = [10, 22], kinds = { leafy: 1, pine: 0.8 },
  avoid, clumps = true, center = [0, 0], wind: windOpt, backdrop = {}, cloud = false } = {}) {
  const sun = () => scene.children.find((o) => o.isDirectionalLight && o.name === 'sun'), hemi = () => scene.children.find((o) => o.isHemisphereLight);
  const wind = createWind(THREE, { ...WIND, ...windOpt });
  const woods = createFarwoods(THREE, { wind, seed, center, ring, count, size, kinds, avoid, clumps });
  woods.mesh.onBeforeRender = () => { woods.lightFrom(sun(), hemi()); woods.fogFrom(scene.fog); };
  const hills = createBackdrop(THREE, { seed, radius: 900, base: -30, height: 340, snow: 0.6, ...backdrop });
  hills.mesh.onBeforeRender = () => { hills.lightFrom(sun(), hemi()); hills.fogFrom(scene.fog); };
  ganTang(woods.group, 'back'); ganTang(hills.group, 'back');   // tầng sau: rừng xa + núi xa
  g.add(woods.group, hills.group);
  let wind2 = null, shade = null;
  if (cloud) {   // bóng mây: gió riêng (cùng seed) để bản mây không đổi khung rừng
    const c = { far: 320, size: 1400, y: 0.012, name: 'town_cloudshade', set: [0.5, 70, 2.4, 0.5], ...cloud };
    wind2 = createWind(THREE, { ...WIND, ...windOpt }); wind2.set({ cloud: c.set });
    shade = createCloudShade(THREE, wind2, { far: c.far });
    shade.add(new THREE.PlaneGeometry(c.size, c.size), { y: c.y }); shade.group.name = c.name; g.add(shade.group);
    shade.onRender(() => shade.lightFrom(sun()));
  }
  return {
    wind, woods, hills, cloud: shade,
    update(t, camera = stage.camera) {
      const AF = globalThis.__autoFx || {};
      woods.group.visible = AF.farwoods !== false; if (woods.group.visible) woods.update(t, camera);
      hills.group.visible = AF.backdrop !== false; if (hills.group.visible) hills.update(t, camera);
      if (shade) { shade.group.visible = AF.cloudShade !== false; if (shade.group.visible) wind2.update(t); }
    },
  };
}
