// snap.js — "Chụp màn hình" cảnh 3D của phim làm tranh bưu thiếp (chạy 1 lần lúc init, tất định).
// Mỗi thiếp: bật env, đặt camera, render vào 1 vùng của canvas WebGL (có tone mapping + màu đầu ra như phim),
// chép vùng đó ra canvas 2D → setPostcardArt(kind, canvas). Không dùng thời gian thực.
import { setPostcardArt } from './postcards.js';

export const SNAPS = {
  penguin:  { env: 'antarctica', t: 1.2, cam: { p: [-15, 4.2, 58], l: [-14, 2.6, 39], fov: 38 } },
  whale:    { env: 'ocean', t: 0.0, cam: { p: [37, 17, 15], l: [30, 9.5, 0], fov: 46 }, props: { shipSail: { at: [29, 10.4, -1], ry: 0.6, s: 0.32 } } },
  mountain: { env: 'mountain', t: 0.0, cam: { p: [140, -2, 40], l: [420, 18, -100], fov: 20 } },
  island:   { env: 'island', t: 0.5, cam: { p: [-150, 70, 150], l: [14, 2, -26], fov: 30 } },
};

export function snapPostcards(THREE, stage, envs, { hide = [], props = {}, w = 912, h = 432 } = {}) {
  const { renderer, scene, camera } = stage;
  const vis = hide.map((o) => [o, o.visible]); hide.forEach((o) => { o.visible = false; });
  const H = renderer.domElement.height;
  const old = { aspect: camera.aspect, fov: camera.fov };
  const out = {};
  for (const [kind, s] of Object.entries(SNAPS)) {
    const shown = [];
    for (const [name, p] of Object.entries(s.props || {})) {
      const o = props[name]; if (!o) continue;
      o.visible = true; o.position.set(...p.at); o.rotation.set(0, p.ry || 0, 0); o.scale.setScalar(p.s || 1); shown.push(o);
    }
    camera.aspect = w / h; stage.setCamera(s.cam.p, s.cam.l, { fov: s.cam.fov }); camera.updateProjectionMatrix();
    envs.use(s.env, s.t, { focus: s.cam.l });
    renderer.setScissorTest(true); renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h);
    renderer.render(scene, camera);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(renderer.domElement, 0, H - h, w, h, 0, 0, w, h);
    out[kind] = cv;
    shown.forEach((o) => { o.visible = false; });
  }
  renderer.setScissorTest(false); renderer.setViewport(0, 0, renderer.domElement.width, H);
  camera.aspect = old.aspect; camera.fov = old.fov; camera.updateProjectionMatrix();
  vis.forEach(([o, v]) => { o.visible = v; });
  for (const [k, cv] of Object.entries(out)) setPostcardArt(k, cv);
  return out;
}
