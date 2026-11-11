// ao.js — Che khuất môi trường màn hình (SSAO kiểu N8AO/GTAO rút gọn), TẤT ĐỊNH. LÕI dùng chung mọi tập.
// Học từ claude-3d-animated-shorts (thuann-vn, MIT) engine/post.js `addAO` (n8ao: aoRadius 0.9, intensity 2.6, màu nâu ấm
// '#3a2a22') — tối dịu ở góc tường, dưới bàn ghế, chỗ nhân vật chạm đất. n8ao dùng nhiễu ngẫu nhiên; bản này thay bằng:
//   - nhân mẫu bán cầu sinh bằng mulberry32(seed) MỘT LẦN (cố định),
//   - xoay theo điểm ảnh bằng interleaved gradient noise (hàm thuần của toạ độ điểm ảnh) → cùng khung = cùng ảnh.
//
//   const ao = createAO(THREE, { radius: 2.5, intensity: 1, color: '#3a2a22', scale: 0.5, seed: 7 });
//   // mỗi khung, SAU khi vẽ cảnh:  ao.prepass(renderer, scene, camera)   → ao.depthTexture (cũng dùng cho painterly)
//   composer.addPass(ao.pass);                                             // nhân AO vào khung (đặt sớm, trước viền/bloom)
//   ao.params = { radius (stud), intensity 0..2, bias, fade: [đầu, cuối] (stud, AO mờ dần ở xa), color }
//
// Prepass: vẽ lại cảnh ở scale × độ phân giải với MeshNormalMaterial (pháp tuyến không gian nhìn) + DepthTexture.
//   Bỏ qua vật trong suốt (nước, kính, hạt) và vật có userData.noAO = true. Không cập nhật shadow map trong prepass.
//   Lưu ý: vật đẩy đỉnh trong shader riêng (sóng biển) vẽ phẳng trong prepass → đánh userData.noAO cho chúng.
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

function mulberry(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const NS = 16;
const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const FS_AO = `
uniform sampler2D tDepth, tNormal; uniform mat4 uProj, uProjInv; uniform vec3 uKernel[${NS}];
uniform float uRadius, uBias; uniform vec2 uFade; varying vec2 vUv;
vec3 viewPos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 v = uProjInv*vec4(uv*2.0 - 1.0, d*2.0 - 1.0, 1.0); return v.xyz/v.w; }
void main(){
  float d = texture2D(tDepth, vUv).x;
  if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv);
  vec3 N = normalize(texture2D(tNormal, vUv).xyz*2.0 - 1.0);
  float ign = fract(52.9829189*fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));   // tất định theo điểm ảnh
  float a = 6.2831853*ign; vec3 rv = vec3(cos(a), sin(a), 0.0);
  vec3 T = normalize(rv - N*dot(rv, N)); vec3 B = cross(N, T); mat3 TBN = mat3(T, B, N);
  float occ = 0.0;
  for (int i = 0; i < ${NS}; i++){
    vec3 s = P + TBN*uKernel[i]*uRadius;
    vec4 o = uProj*vec4(s, 1.0); vec2 suv = o.xy/o.w*0.5 + 0.5;
    if (suv.x < 0.0 || suv.y < 0.0 || suv.x > 1.0 || suv.y > 1.0) continue;
    float sz = viewPos(suv).z;
    float range = smoothstep(0.0, 1.0, uRadius/max(abs(P.z - sz), 1e-4));
    occ += step(s.z + uBias, sz)*range;
  }
  float ao = 1.0 - occ/float(${NS});
  ao = mix(ao, 1.0, smoothstep(uFade.x, uFade.y, -P.z));
  gl_FragColor = vec4(ao, -P.z, 0.0, 1.0);
}`;
// làm mịn có giữ cạnh theo độ sâu (7 tap, tách ngang/dọc)
const FS_BLUR = `
uniform sampler2D tAO; uniform vec2 uDir; varying vec2 vUv;
void main(){
  vec2 c = texture2D(tAO, vUv).xy; float s = c.x, w = 1.0;
  for (int i = 1; i <= 3; i++){
    for (int k = -1; k <= 1; k += 2){
      vec2 q = texture2D(tAO, vUv + uDir*float(i*k)).xy;
      float wk = exp(-float(i*i)*0.18) * (1.0 - smoothstep(0.0, 0.04*c.y + 0.3, abs(q.y - c.y)));
      s += q.x*wk; w += wk;
    }
  }
  gl_FragColor = vec4(s/w, c.y, 0.0, 1.0);
}`;
const FS_MIX = `
uniform sampler2D tDiffuse, tAO; uniform float uInt; uniform vec3 uColor; varying vec2 vUv;
void main(){
  vec4 c = texture2D(tDiffuse, vUv);
  float a = clamp(texture2D(tAO, vUv).x, 0.0, 1.0);
  a = pow(a, 0.75);   // khung đầu vào đã ở không gian hiển thị: dịu bớt cho giống AO nhân trong tuyến tính
  c.rgb *= mix(vec3(1.0), mix(uColor, vec3(1.0), a), clamp(uInt, 0.0, 2.0));
  gl_FragColor = c;
}`;

export const AO_DEFAULTS = { radius: 2.5, intensity: 1, bias: 0.08, fade: [120, 260], color: '#3a2a22', scale: 0.5, seed: 7 };

export function createAO(THREE, opts = {}) {
  const params = { ...AO_DEFAULTS, ...opts };
  const R = mulberry(params.seed);
  const kernel = [];
  for (let i = 0; i < NS; i++) {   // bán cầu +Z, dồn về tâm (mẫu gần quan trọng hơn)
    const u = R(), v = R(), th = 2 * Math.PI * u, z = Math.sqrt(1 - v * 0.92), r = Math.sqrt(1 - z * z);
    let s = (i + 1) / NS; s = 0.15 + 0.85 * s * s;
    kernel.push(new THREE.Vector3(Math.cos(th) * r * s, Math.sin(th) * r * s, z * s));
  }
  const depthTexture = new THREE.DepthTexture(2, 2);
  const pre = new THREE.WebGLRenderTarget(2, 2, { depthTexture, depthBuffer: true, type: THREE.UnsignedByteType });
  const rtA = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false });
  const rtB = rtA.clone();
  const normalMat = new THREE.MeshNormalMaterial(); normalMat.toneMapped = false;
  const mat = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
  const mAO = mat(FS_AO, { tDepth: { value: depthTexture }, tNormal: { value: pre.texture }, uProj: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() },
    uKernel: { value: kernel }, uRadius: { value: 1 }, uBias: { value: 0.05 }, uFade: { value: new THREE.Vector2() } });
  const mBlur = mat(FS_BLUR, { tAO: { value: null }, uDir: { value: new THREE.Vector2() } });
  const mMix = mat(FS_MIX, { tDiffuse: { value: null }, tAO: { value: rtA.texture }, uInt: { value: 1 }, uColor: { value: new THREE.Color() } });
  const quad = new FullScreenQuad(mAO);
  let ready = false, W = 2, H = 2;
  const _hidden = [], _clear = new THREE.Color();

  function setSize(w, h) {
    W = Math.max(2, w | 0); H = Math.max(2, h | 0);
    const sw = Math.max(2, Math.round(W * params.scale)), sh = Math.max(2, Math.round(H * params.scale));
    pre.setSize(sw, sh); rtA.setSize(sw, sh); rtB.setSize(sw, sh);
  }
  // vẽ pháp tuyến + độ sâu của cảnh (gọi mỗi khung, sau khi vẽ cảnh chính)
  function prepass(renderer, scene, camera) {
    const fb = new THREE.Vector2(); renderer.getDrawingBufferSize(fb);
    if (Math.round(fb.x * params.scale) !== pre.width || Math.round(fb.y * params.scale) !== pre.height) setSize(fb.x, fb.y);
    _hidden.length = 0;
    scene.traverseVisible((o) => {
      const m = o.material;
      if (o.userData.noAO || (m && (Array.isArray(m) ? m.some((x) => x.transparent) : m.transparent)) || o.isPoints || o.isSprite || o.isLine) { _hidden.push(o); }
    });
    for (const o of _hidden) o.visible = false;
    const bg = scene.background, ov = scene.overrideMaterial, au = renderer.shadowMap.autoUpdate, a0 = renderer.getClearAlpha();
    renderer.getClearColor(_clear);
    scene.background = null; scene.overrideMaterial = normalMat; renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0x8080ff, 1);
    renderer.setRenderTarget(pre); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    scene.background = bg; scene.overrideMaterial = ov; renderer.shadowMap.autoUpdate = au; renderer.setClearColor(_clear, a0);
    for (const o of _hidden) o.visible = true;
    mAO.uniforms.uProj.value.copy(camera.projectionMatrix); mAO.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
    ready = true;
  }

  const pass = new Pass();
  pass.needsSwap = true;
  pass.setSize = () => {};
  pass.render = (renderer, writeBuffer, readBuffer) => {
    const draw = (m, target) => { quad.material = m; renderer.setRenderTarget(target); quad.render(renderer); };
    const out = pass.renderToScreen ? null : writeBuffer;
    mMix.uniforms.tDiffuse.value = readBuffer.texture;
    if (!ready || params.intensity <= 0) { mMix.uniforms.uInt.value = 0; return draw(mMix, out); }
    const U = mAO.uniforms; U.uRadius.value = params.radius; U.uBias.value = params.bias; U.uFade.value.set(params.fade[0], params.fade[1]);
    draw(mAO, rtA);
    mBlur.uniforms.tAO.value = rtA.texture; mBlur.uniforms.uDir.value.set(1 / rtA.width, 0); draw(mBlur, rtB);
    mBlur.uniforms.tAO.value = rtB.texture; mBlur.uniforms.uDir.value.set(0, 1 / rtB.height); draw(mBlur, rtA);
    mMix.uniforms.uInt.value = params.intensity; mMix.uniforms.uColor.value.set(params.color);
    draw(mMix, out);
  };
  pass.dispose = () => { for (const r of [pre, rtA, rtB]) r.dispose(); depthTexture.dispose(); for (const m of [normalMat, mAO, mBlur, mMix]) m.dispose(); quad.dispose(); };
  return { pass, prepass, setSize, params, depthTexture, get ready() { return ready; }, invalidate() { ready = false; } };
}
