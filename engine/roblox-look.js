// roblox-look.js — "chất Roblox" cho cả scene: ánh sáng trời, bóng mềm, sương, bloom nhẹ, vật liệu nhựa mịn.
// Không dùng asset/texture chính thức của Roblox — chỉ mô phỏng cảm giác hình ảnh.
// Truyền THREE + addon vào (giống r6.js / winter.js) để module không phụ thuộc đường import.
//
// Dùng:
//   import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
//   import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
//   import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
//   import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
//   import { setupRobloxLook, robloxifyModel } from './roblox-look.js';
//   const look = setupRobloxLook(THREE, renderer, scene, cam, { EffectComposer, RenderPass, UnrealBloomPass, OutputPass });
//   robloxifyModel(THREE, gltf.scene);
//   // render(t): look.render();   (thay renderer.render; không có addon thì tự rơi về renderer.render)
// Cùng kiểu vật liệu này có sẵn trong engine/shaders.js: applyStyle(THREE, nhom, 'roblox').

export function setupRobloxLook(THREE, renderer, scene, camera, addons = {}, opts = {}) {
  const o = { sky: '#9ecbff', fog: '#c8e0ff', fogNear: 60, fogFar: 250, exposure: 1.0, bloom: 0.25, ...opts };

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = o.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  scene.background = new THREE.Color(o.sky);
  scene.fog = new THREE.Fog(o.fog, o.fogNear, o.fogFar);

  const hemi = new THREE.HemisphereLight('#cfe6ff', '#8a7a66', 1.2);
  hemi.name = 'robloxHemi';
  const sun = new THREE.DirectionalLight('#fff4e0', 2.5);
  sun.name = 'robloxSun';
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 150 });
  scene.add(hemi, sun, sun.target);

  let composer = null;
  const { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } = addons;
  if (EffectComposer && RenderPass && UnrealBloomPass && OutputPass && o.bloom > 0) {
    const size = renderer.getSize(new THREE.Vector2());
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(size, o.bloom, 0.4, 0.9)); // strength, radius, threshold
    composer.addPass(new OutputPass());
  }
  return {
    hemi, sun, composer,
    render() { composer ? composer.render() : renderer.render(scene, camera); },
  };
}

// Đổi vật liệu sang kiểu nhựa mịn (SmoothPlastic), giữ màu + texture gốc
export function robloxifyModel(THREE, model, { roughness = 0.7 } = {}) {
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const convert = (old) => {
      const m = new THREE.MeshStandardMaterial({
        roughness, metalness: 0,
        map: old.map ?? null,
        transparent: old.transparent ?? false,
      });
      if (old.color) m.color.copy(old.color);
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
      return m;
    };
    o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
  });
}
