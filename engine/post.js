// post.js — Hiệu ứng hình sau khi vẽ (post-processing) cho phim, MỖI HIỆU ỨNG BẬT/TẮT RIÊNG.
// Tất định: mọi thứ chỉ phụ thuộc t (hạt phim, mưa, chớp tính theo t), tua tới/lui ra cùng khung.
//
// Cách vẽ: cảnh được vẽ ra canvas Y HỆT khi không có hậu kỳ (tone mapping, sRGB, khử răng cưa của canvas),
// rồi chép khung đó vào texture và phủ các hiệu ứng lên (không gian màu hiển thị) → tắt hết hiệu ứng = giống bản gốc.
//
//   const post = createPost(THREE, stage, { actors: [...rootObject3D] });
//   stage.draw = () => post.render(info);        // info = { t, light, env, focus } mỗi khung
//   post.set({ grade, bloom, dof, vignette, outline, storm });
//   post.resize();                               // sau khi đổi pixel ratio (nút Xuất MP4 2K/4K)
//
// Hiệu ứng:
//   grade    — chỉnh màu theo cảnh (theo preset ánh sáng: snow lạnh, desert/interior ấm, storm xám lạnh…)
//   bloom    — chỗ sáng (mặt trời, đèn, tuyết, tia chớp) toả sáng nhẹ
//   dof      — làm mờ hậu cảnh, tự mạnh dần ở cảnh cận (camera gần điểm nhìn), cảnh rộng không mờ
//   vignette — tối nhẹ 4 góc + hạt phim mịn
//   outline  — viền đen quanh nhân vật (kiểu hoạt hình), chỉ viền ngoài, không xuyên tường
//   storm    — cảnh bão: vệt mưa chéo trên màn hình + loé sáng theo nhịp chớp của cảnh
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { GRUNGE } from './grunge.js';
import { MATS } from './materials.js';

export const FX_DEFAULTS = { grade: true, bloom: true, dof: true, vignette: true, outline: false, storm: true, worn: true, grime: true, foot: true, prints: true, wind: true, breath: true, folds: true, hair2: true, aged: true, mats: true, ibl: true, scans: true, sea2: true };
export const FX_LABELS = {
  grade: 'Chỉnh màu theo cảnh', bloom: 'Toả sáng (bloom)', dof: 'Mờ hậu cảnh (cảnh cận)',
  vignette: 'Tối viền + hạt phim', outline: 'Viền đen nhân vật', storm: 'Mưa bão mạnh',
  worn: 'Quần áo cũ, bụi (nhân vật)', grime: 'Vân sần, bụi (nhà, đường, cảnh)',
  foot: 'Bụi / tuyết bốc ở chân nhà', prints: 'Dấu chân trên tuyết', wind: 'Gió tuyết thổi vào mặt', breath: 'Hơi thở trắng (cảnh lạnh)',
  folds: 'Nếp vải vẽ sẵn trên áo quần (v2)', hair2: 'Tóc cụm lởm chởm (v2)', aged: 'Nhà cũ bán thực: sơn tróc, ố, rêu (v2)',
  mats: 'Chất liệu thật: gỗ, giấy, sắt, vải, đá, cát… (v3)',
  ibl: 'Ánh sáng môi trường: kim loại, men, kính phản chiếu thật (v4)',
  scans: 'Đồ vật quét thật Poly Haven: bàn ghế gỗ, cây, gốm, sách (v4)',
  sea2: 'Biển + thuyền nổi khớp sóng, bọt quanh thân, vệt ướt (v4, học Saltline)',
};

// Màu theo preset ánh sáng (engine/envs.js LIGHTS). temp > 0 ấm, < 0 lạnh; sat bão hoà; con tương phản; gain/lift sáng.
export const GRADES = {
  day:       { sat: 1.12, con: 1.06, temp: 0.03, gain: 1.00, lift: 0.00 },
  beach:     { sat: 1.12, con: 1.03, temp: 0.025, gain: 1.02, lift: 0.00 },
  desert:    { sat: 1.10, con: 1.08, temp: 0.12, gain: 1.02, lift: 0.01 },
  snow:      { sat: 0.92, con: 1.05, temp: -0.09, gain: 1.00, lift: 0.01 },
  night:     { sat: 0.92, con: 1.10, temp: -0.07, gain: 1.00, lift: 0.00 },
  snowNight: { sat: 0.90, con: 1.10, temp: -0.10, gain: 1.00, lift: 0.00 },
  storm:     { sat: 0.78, con: 1.14, temp: -0.10, gain: 0.96, lift: 0.00 },
  interior:  { sat: 1.08, con: 1.05, temp: 0.08, gain: 1.00, lift: 0.01 },
  bedNight:  { sat: 0.95, con: 1.08, temp: -0.06, gain: 1.00, lift: 0.00 },
  ocean:     { sat: 1.12, con: 1.04, temp: -0.02, gain: 1.01, lift: 0.00 },
  sky:       { sat: 1.06, con: 1.04, temp: 0.04, gain: 1.01, lift: 0.01 },
};
const NEUTRAL = { sat: 1, con: 1, temp: 0, gain: 1, lift: 0 };

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uSat: { value: 1 }, uCon: { value: 1 }, uTemp: { value: 0 }, uGain: { value: 1 }, uLift: { value: 0 },
    uVig: { value: 0 }, uGrain: { value: 0 }, uSeed: { value: 0 }, uRain: { value: 0 }, uTime: { value: 0 }, uFlash: { value: 0 },
    uRes: { value: null },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uSat, uCon, uTemp, uGain, uLift, uVig, uGrain, uSeed, uRain, uTime, uFlash; uniform vec2 uRes;
    varying vec2 vUv;
    float h11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
    float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    // vệt mưa chéo: mỗi cột 1 hạt rơi theo t (không có trạng thái)
    float rainLayer(vec2 uv, float cols, float len, float speed, float seed) {
      uv.x += uv.y * 0.18;                        // xiên theo gió
      float c = floor(uv.x * cols), fx = fract(uv.x * cols);
      float r = h11(c + seed * 17.0);
      float y = fract(uv.y * 1.6 + uTime * speed * (0.8 + 0.4 * r) + r * 7.0);
      float line = smoothstep(0.5 - 0.09, 0.5, fx) * smoothstep(0.5 + 0.09, 0.5, fx);
      float seg = smoothstep(0.0, len * 0.3, y) * smoothstep(len, len * 0.6, y);
      return line * seg * step(0.35, r);
    }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // tông ấm/lạnh GIỮ độ sáng (không làm nước xanh ngọc ngả xám khi chỉnh ấm)
      float l0 = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c *= vec3(1.0 + uTemp, 1.0 + uTemp * 0.1, 1.0 - uTemp * 0.6);
      c *= l0 / max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
      c = c * uGain + uLift;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uCon + 0.5;
      if (uRain > 0.0) {
        vec2 uv = vec2(vUv.x * uRes.x / uRes.y, vUv.y);
        float r = rainLayer(uv, 70.0, 0.22, 1.9, 1.0) * 0.55 + rainLayer(uv * 1.7 + 0.31, 120.0, 0.16, 2.6, 2.0) * 0.35;
        c = mix(c, c * 0.84 + vec3(0.02, 0.03, 0.05), uRain * 0.6);   // ướt, tối, lạnh
        c += vec3(0.75, 0.82, 0.95) * r * uRain;
        c += vec3(0.85, 0.9, 1.0) * uFlash * 0.32 * uRain;
      }
      if (uVig > 0.0) {
        vec2 d = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 1.9;
        c *= mix(1.0, smoothstep(1.45, 0.55, length(d)), uVig * 0.3);   // nhẹ: mép khung dọc tối ~13%
        c += (h21(floor(vUv * uRes) + uSeed) - 0.5) * 0.035 * uVig;   // hạt phim theo khung (tất định)
      }
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export function createPost(THREE, stage, { actors = [] } = {}) {
  const { renderer, scene, camera } = stage;
  const fx = { ...FX_DEFAULTS };
  const css = new THREE.Vector2(); renderer.getSize(css);
  const W = css.x, H = css.y;
  const pr = () => renderer.getPixelRatio();

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pr()); composer.setSize(W, H);

  // khung vừa vẽ ra canvas → texture → bước đầu của chuỗi hậu kỳ
  let fbTex = null;
  const fbSize = new THREE.Vector2();
  const ensureFb = () => {
    renderer.getDrawingBufferSize(fbSize);
    if (fbTex && fbTex.image.width === fbSize.x && fbTex.image.height === fbSize.y) return;
    if (fbTex) fbTex.dispose();
    fbTex = new THREE.FramebufferTexture(fbSize.x, fbSize.y); fbTex.colorSpace = THREE.NoColorSpace;
  };
  const copyIn = new ShaderPass({
    uniforms: { tFrame: { value: null } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tFrame; varying vec2 vUv; void main() { gl_FragColor = texture2D(tFrame, vUv); }',
  });
  const outline = new OutlinePass(new THREE.Vector2(W, H), scene, camera, actors);
  outline.edgeStrength = 10; outline.edgeGlow = 0; outline.edgeThickness = 3.2; outline.pulsePeriod = 0;
  outline.downSampleRatio = 1;   // viền sắc (mặc định 2 → mờ, mảnh)
  outline.visibleEdgeColor.set('#120e18'); outline.hiddenEdgeColor.set('#000000');
  // viền ĐEN kiểu hoạt hình: bản gốc cộng sáng (additive) và vẽ cả phần bị che → đổi sang phủ màu, bỏ viền xuyên tường
  const edgeSrc = outline.edgeDetectionMaterial.fragmentShader;
  outline.edgeDetectionMaterial.fragmentShader = edgeSrc.replace(
    /vec3 edgeColor = 1\.0 - visibilityFactor > 0\.001 \? visibleEdgeColor : hiddenEdgeColor;\s*gl_FragColor = vec4\(edgeColor, 1\.0\) \* vec4\(d\);/,
    'gl_FragColor = vec4(visibleEdgeColor, 1.0) * vec4(d) * step(0.001, 1.0 - visibilityFactor);');
  if (outline.edgeDetectionMaterial.fragmentShader === edgeSrc) console.warn('[post] không vá được shader viền (bản three khác?)');
  outline.edgeDetectionMaterial.needsUpdate = true;
  outline.overlayMaterial.fragmentShader = outline.overlayMaterial.fragmentShader.replace('gl_FragColor = finalColor;',
    'gl_FragColor = vec4(finalColor.rgb, clamp(finalColor.a, 0.0, 1.0));');
  outline.overlayMaterial.blending = THREE.NormalBlending; outline.overlayMaterial.needsUpdate = true;

  const bokeh = new BokehPass(scene, camera, { focus: 20, aperture: 0, maxblur: 0.008 });
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.22, 0.45, 0.93);   // strength, radius, threshold
  const grade = new ShaderPass(GradeShader);
  grade.uniforms.uRes.value = new THREE.Vector2(W * pr(), H * pr());
  for (const p of [copyIn, outline, bokeh, bloom, grade]) composer.addPass(p);

  const anyOn = () => Object.values(fx).some(Boolean);
  const _f = new THREE.Vector3();

  function render({ t = 0, light = 'day', env = '', focus = null, flash = 0 } = {}) {
    const AF = (globalThis.__autoFx ||= {}); AF.foot = fx.foot; AF.prints = fx.prints; AF.wind = fx.wind; AF.breath = fx.breath; AF.ibl = fx.ibl; AF.scans = fx.scans;   // engine/shots.js hiệu ứng tự động
    GRUNGE.char.value = fx.worn ? 1 : 0; GRUNGE.build.value = fx.grime ? 1 : 0;   // engine/grunge.js (vân bụi trên vật liệu)
    GRUNGE.aged.value = fx.aged ? 1 : 0;
    MATS.on.value = fx.mats ? 1 : 0;   // engine/materials.js
    for (const a of actors) a.userData.setDetail?.({ folds: fx.folds, hair: fx.hair2 });   // engine/r15.js v2
    renderer.setRenderTarget(null); renderer.render(scene, camera);   // khung gốc (giống hệt khi không hậu kỳ)
    if (!anyOn()) return;
    ensureFb(); renderer.copyFramebufferToTexture(fbTex); copyIn.uniforms.tFrame.value = fbTex;
    outline.enabled = fx.outline && actors.some((a) => a.visible);
    // mờ hậu cảnh: chỉ khi camera gần điểm nhìn (cảnh cận), cảnh rộng giữ nét
    const dist = focus ? camera.position.distanceTo(_f.copy(focus)) : 1e9;
    const k = Math.max(0, Math.min(1, (26 - dist) / 16));
    bokeh.enabled = fx.dof && k > 0.02;
    if (bokeh.enabled) { bokeh.uniforms.focus.value = dist; bokeh.uniforms.aperture.value = 0.0006 * k; bokeh.uniforms.maxblur.value = 0.011 * k; }
    bloom.enabled = fx.bloom;
    const storm = fx.storm && (light === 'storm' || /storm/i.test(env));
    bloom.strength = storm ? 0.22 + flash * 0.9 : 0.22;
    const G = fx.grade ? (GRADES[light] || NEUTRAL) : NEUTRAL;
    const u = grade.uniforms;
    u.uSat.value = G.sat; u.uCon.value = G.con; u.uTemp.value = G.temp; u.uGain.value = G.gain; u.uLift.value = G.lift;
    u.uVig.value = fx.vignette ? 1 : 0; u.uSeed.value = Math.round(t * 30) % 997;
    u.uRain.value = storm ? 1 : 0; u.uTime.value = t; u.uFlash.value = flash;
    composer.render();
  }

  function resize() {
    composer.setPixelRatio(pr()); composer.setSize(W, H);
    grade.uniforms.uRes.value.set(W * pr(), H * pr());
    outline.edgeThickness = 3.2 * pr();   // giữ độ dày viền khi xuất 2K/4K
  }

  resize();
  return {
    composer, passes: { copyIn, outline, bokeh, bloom, grade },
    get options() { return { ...fx }; },
    set(o = {}) { for (const k of Object.keys(FX_DEFAULTS)) if (o[k] !== undefined) fx[k] = !!o[k]; const AF = (globalThis.__autoFx ||= {}); for (const k of ['foot', 'prints', 'wind', 'breath', 'ibl', 'scans', 'sea2']) AF[k] = fx[k]; return { ...fx }; },
    render, resize,
  };
}
