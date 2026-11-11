// quality.js — 2 mức chất lượng CỐ ĐỊNH (không tự đổi theo FPS → cùng t luôn ra cùng hình):
//   low  : xem nhanh / contact sheet (nửa độ phân giải, bóng nhỏ, không hậu kỳ, ít hạt mưa)
//   high : render thật (đủ 1080×1920, bóng mềm, AO + bloom)
// Chọn bằng URL ?q=low | ?q=high (mặc định high).
//
// Dùng:
//   import { getQuality, applyQuality, createPost } from './quality.js';
//   const Q = getQuality();                                   // { name, pixelRatio, shadowMapSize, ... }
//   applyQuality(THREE, renderer, Q);                         // trước khi tạo đèn có bóng
//   const post = createPost(THREE, renderer, scene, cam, { EffectComposer, RenderPass, OutputPass, UnrealBloomPass, GTAOPass }, Q);
//   // render(t): post.render();
// Lưu ý tất định: GTAOPass tạo noise bằng Math.random() → createPost tạm thay Math.random bằng bộ có seed khi khởi tạo.

import { rng } from './winter.js';

export const QUALITY = {
  low:  { pixelRatio: 0.5, shadowMapSize: 1024, softShadows: false, texSize: 256, rain: 0.4, antialias: false, post: false, bloom: 0, ao: false },
  high: { pixelRatio: 1,   shadowMapSize: 2048, softShadows: true,  texSize: 512, rain: 1,   antialias: true,  post: true,  bloom: 0.2, ao: true },
};

export function getQuality(search = (typeof location !== 'undefined' ? location.search : '')) {
  const q = new URLSearchParams(search).get('q');
  const name = QUALITY[q] ? q : 'high';
  return { name, ...QUALITY[name] };
}

export function applyQuality(THREE, renderer, Q) {
  renderer.setPixelRatio(Q.pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = Q.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
}

// Đèn có bóng: gọi sau khi tạo DirectionalLight
export function applyShadowQuality(light, Q) { light.shadow.mapSize.set(Q.shadowMapSize, Q.shadowMapSize); }

export function createPost(THREE, renderer, scene, camera, addons = {}, Q = QUALITY.high) {
  const { EffectComposer, RenderPass, OutputPass, UnrealBloomPass, GTAOPass } = addons;
  if (!Q.post || !EffectComposer || !RenderPass || !OutputPass) {
    return { composer: null, render: () => renderer.render(scene, camera) };
  }
  const size = renderer.getSize(new THREE.Vector2());
  const rtSize = size.clone().multiplyScalar(renderer.getPixelRatio());
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(rtSize.x, rtSize.y, { type: THREE.HalfFloatType, samples: Q.antialias ? 4 : 0 }));
  composer.addPass(new RenderPass(scene, camera));
  if (Q.ao && GTAOPass) {
    const orig = Math.random;
    Math.random = rng(1234);                  // noise khử nhiễu của GTAO → cố định
    try {
      const ao = new GTAOPass(scene, camera, rtSize.x, rtSize.y);
      ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1, scale: 1.2, samples: 12 });
      ao.blendIntensity = 0.85;
      // chữ, mưa… (userData.aoHide) không được tạo bóng AO: ẩn chúng trong lượt AO (ảnh màu đã vẽ trước đó)
      const aoRender = ao.render.bind(ao);
      ao.render = (...args) => {
        const hidden = [];
        scene.traverse((o) => { if (o.userData.aoHide && o.visible) { o.visible = false; hidden.push(o); } });
        try { aoRender(...args); } finally { for (const o of hidden) o.visible = true; }
      };
      composer.addPass(ao);
    } finally { Math.random = orig; }
  }
  if (Q.bloom > 0 && UnrealBloomPass) composer.addPass(new UnrealBloomPass(rtSize.clone(), Q.bloom, 0.4, 0.88));
  composer.addPass(new OutputPass());
  return { composer, render: () => composer.render() };
}
