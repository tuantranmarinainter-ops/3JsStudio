// snap.js — "Chụp màn hình" cảnh 3D của phim làm tranh bưu thiếp + ảnh dán tủ lạnh + cảnh ngoài cửa sổ bếp
// (chạy 1 lần lúc init, tất định). Mỗi ảnh: bật env, đặt camera, render vào 1 vùng của canvas WebGL (có tone mapping
// + màu đầu ra như phim), chép vùng đó ra canvas 2D → setPostcardArt(kind, canvas) / texture viewTex(kind).
// Không dùng thời gian thực.
import { setPostcardArt } from './postcards.js';

// aim(e) → [x,y,z]: tâm nhóm vật thể trong env (camera đặt TƯƠNG ĐỐI: p/l cộng thêm tâm này) — vd cánh cụt đi đứng theo t.
const centroid = (all) => { const arr = all.filter((o) => o.visible), c = [0, 0, 0]; for (const o of arr) { c[0] += o.position.x; c[1] += o.position.y; c[2] += o.position.z; } return c.map((v) => v / Math.max(1, arr.length)); };
export const SNAPS = {
  // cả đàn cánh cụt trên nền tuyết + núi tuyết (antarctica.js: t < 50 đàn đứng yên thành nhóm — mốc dành cho ảnh bưu thiếp)
  penguin:  { env: 'antarctica', t: 10, aim: (e) => centroid(e.penguins || []), cam: { p: [20, 5, 6], l: [3, 1.6, -1], fov: 36 } },   // nhìn chéo từ phải: tránh khối đá giữa đàn, núi tuyết làm nền
  // cá nhà táng nổi lên thở (đầu vuông bên phải), phun cột nước ở lỗ thở; thuyền buồm phía xa bên trái (dáng cá: whales.js snapshot())
  whale:    { env: 'ocean', t: 0.0, cam: { p: [24, 19, 32], l: [24, 19.5, -16], fov: 42 }, props: { shipSail: { at: [-30, 10.4, -75], ry: 0.5, s: 0.55 } },
              life: { at: [22, -16], heading: Math.PI / 2, lift: 1.2, breathe: 0.6, spoutAt: [0, 1.6, 7.4], spoutScale: 0.55 } },
  // đỉnh núi tuyết nhô trên biển mây (env 'mountain' dựng bằng peaks.js + clouds.js; t=68 = mốc bố cục mây của env)
  // ngọn cao nhất của dãy xa (peaks.js createRange seed 21, ngọn #9 ở (−146, −753), đỉnh y≈174) đặt GIỮA ảnh (góp ý f2552)
  mountain: { env: 'mountain', t: 68, cam: { p: [-96, 34, -400], l: [-146, 112, -753], fov: 40 } },
  island:   { env: 'island', t: 0.5, cam: { p: [-150, 70, 150], l: [14, 2, -26], fov: 30 } },
  // ảnh dán tủ lạnh (thiếp không chữ) — mỗi loại 1 cảnh của phim
  town:     { env: 'town', t: 10, light: 'day', cam: { p: [-46, 34, 62], l: [4, 2, 0], fov: 40 } },
  beach:    { env: 'hawaii', t: 3.5, cam: { p: [-60, 22, 70], l: [10, 0, 0], fov: 40 } },
  forest:   { env: 'forest', t: 50, light: 'day', cam: { p: [-20, 34, 70], l: [10, 4, -10], fov: 42 } },
  desert:   { env: 'sahara', t: 17, cam: { p: [10, 14, 40], l: [140, 30, -160], fov: 40 } },
  jungle:   { env: 'brazil', t: 15.7, cam: { p: [-10, 60, 90], l: [0, 4, 0], fov: 42 } },
  reef:     { env: 'reef', t: 144, cam: { p: [-46, 13, 46], l: [5, 2, 0], fov: 40 } },
  iceberg:  { env: 'iceSea', t: 116, light: 'snow', cam: { p: [-30, 22, 70], l: [10, 2, -20], fov: 40 } },
};
// cảnh ngoài cửa sổ bếp (shot room.view) — ghi đè canvas vẽ tay của viewTex(kind) trong envs.js
export const VIEWS = {
  mountain: { env: 'mountain', t: 68, cam: { p: [-30, 24, -30], l: [-240, 30, -420], fov: 40 } },
  snow:     { env: 'antarctica', t: 10, aim: (e) => centroid(e.penguins || []), cam: { p: [22, 6, 9], l: [3, 3, -1], fov: 44 } },
  sea:      { env: 'ocean', t: 0.0, cam: { p: [0, 14, 40], l: [0, 12, -40], fov: 44 } },
  night:    { env: 'town', t: 10, light: 'night', cam: { p: [-40, 20, 50], l: [4, 6, 0], fov: 44 } },
};

let _last = null;   // để công cụ kiểm (tools) chụp lại sau khi chỉnh SNAPS mà không tải lại trang
export const resnap = () => (_last ? snapPostcards(..._last) : null);
export function snapPostcards(THREE, stage, envs, { hide = [], props = {}, w = 912, h = 432, vw = 560, vh = 640 } = {}) {
  _last = [THREE, stage, envs, { hide, props, w, h, vw, vh }];
  const { renderer, scene, camera } = stage;
  const vis = hide.map((o) => [o, o.visible]); hide.forEach((o) => { o.visible = false; });
  const H = renderer.domElement.height;
  const old = { aspect: camera.aspect, fov: camera.fov };
  const shoot = (s, w, h) => {
    const shown = [];
    for (const [name, p] of Object.entries(s.props || {})) {
      const o = props[name]; if (!o) continue;
      o.visible = true; o.position.set(...p.at); o.rotation.set(0, p.ry || 0, 0); o.scale.setScalar(p.s || 1); shown.push(o);
    }
    let c = [0, 0, 0];
    if (s.aim) { envs.use(s.env, s.t, { light: s.light }); c = s.aim(envs.envs[s.env]) || c; }
    const P = s.cam.p.map((v, i) => v + c[i]), L = s.cam.l.map((v, i) => v + c[i]);
    camera.aspect = w / h; stage.setCamera(P, L, { fov: s.cam.fov }); camera.updateProjectionMatrix();
    envs.use(s.env, s.t, { focus: L, light: s.light });
    const life = s.life && envs.envs[s.env]?.life;   // cá voi: đặt dáng riêng cho ảnh (sau use() vì update(t) đặt lại dáng)
    if (life?.snapshot) life.snapshot(s.life);
    renderer.setScissorTest(true); renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h);
    renderer.render(scene, camera);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(renderer.domElement, 0, H - h, w, h, 0, 0, w, h);
    if (life?.unsnap) life.unsnap();
    shown.forEach((o) => { o.visible = false; });
    return cv;
  };
  const out = {}, views = {};
  for (const [kind, s] of Object.entries(SNAPS)) { if (envs.envs[s.env]) out[kind] = shoot(s, w, h); }
  if (envs.viewTex) for (const [kind, s] of Object.entries(VIEWS)) { if (envs.envs[s.env]) views[kind] = shoot(s, vw, vh); }
  renderer.setScissorTest(false); renderer.setViewport(0, 0, renderer.domElement.width, H);
  camera.aspect = old.aspect; camera.fov = old.fov; camera.updateProjectionMatrix();
  vis.forEach(([o, v]) => { o.visible = v; });
  for (const [k, cv] of Object.entries(out)) setPostcardArt(k, cv);
  // cửa sổ: thay ảnh của CHÍNH texture viewTex(kind) (vật liệu cửa sổ đang giữ texture này) — dispose để tải lại đúng cỡ mới
  for (const [k, cv] of Object.entries(views)) { const t = envs.viewTex(k); t.image = cv; t.dispose(); t.needsUpdate = true; }
  if (typeof window !== 'undefined') window.__snaps = { ...out, ...Object.fromEntries(Object.entries(views).map(([k, v]) => ['view_' + k, v])) };
  return out;
}
