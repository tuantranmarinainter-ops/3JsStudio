// Xem thử env KHU PHỐ tập 3: ?view=e3-pho&env=e3-pho&dem=1&v=<tên góc>&cam=x,y,z&look=x,y,z&fov=  (&ga=x,y,z → khối cao 5,3 làm thước Gà)
// Góc đặt sẵn (v=): toan | hien_gau | ban_cong | nga_ba | hien_thi_truong | nhin_hien | truoc_ga | tiem_may | tiem_banh | nga_ba_dong | doc_pho
// Chụp nhiều góc một lần: đặt globalThis.__camOverride = {cam, look, fov} và globalThis.__dem = true|false rồi gọi window.renderAt(t).
import { createEnvs, ENV_ASSETS } from '../../../engine/envs.js';
import { createAssetLib } from '../../../engine/assets.js';
import { propKit } from '../../../engine/props.js';
export const VIEWS = {
  toan: { cam: [8, 15, 52], look: [-14, 7, 0], fov: 66 },                  // ảnh khảo sát góc 1: toàn cao từ bên kia đường
  hien_gau: { cam: [-3.5, 5.2, 19], look: [-14, 5.5, 3], fov: 62 },             // góc 2: hiên tiệm gấu
  ban_cong: { cam: [-12.8, 14.6, 36.5], look: [10, 11.6, 24], fov: 62 },           // góc 3: ngược từ ban công nhìn sang mái hiên
  nga_ba: { cam: [-8, 22, 38], look: [4, 2, -92], fov: 62 },                  // góc 4: ngã ba nhìn về nhà máy (từ trên cao)
  hien_thi_truong: { cam: [-1.5, 5.2, -58], look: [-14.5, 5.6, -67.5], fov: 52, cua: 1 }, // hiên + cửa thị trưởng
  nhin_hien: { cam: [-12.6, 14.6, 33], look: [11.6, 10.4, 34], fov: 58 },     // từ ban công nhìn thẳng mái hiên
  truoc_ga: { cam: [-1, 5.5, 44], look: [-14, 6, 26], fov: 62 },
  tiem_may: { cam: [0, 5.5, -26], look: [-14, 6, -45], fov: 62 },
  tiem_banh: { cam: [-2, 5.5, -2], look: [-14, 6, -22], fov: 62 },
  nga_ba_dong: { cam: [6, 7, -90], look: [60, 10, -93], fov: 62 },
  doc_pho: { cam: [4, 7, 78], look: [-2, 10, -40], fov: 56 },
};
export default async (THREE, stage, q) => {
  const K = propKit(THREE);
  const A = createAssetLib(THREE); await A.load(ENV_ASSETS);
  const envs = createEnvs(THREE, stage, K, A);
  const name = q.get('env') || 'e3-pho';
  const m = await import(`../../../engine/envs/${name}.js`);
  if (m.ASSETS?.length) await A.load(m.ASSETS);
  envs.define(name, m.LIGHT || 'day', m.default);
  globalThis.__stage = stage; globalThis.__envs = envs; globalThis.__VIEWS = VIEWS;
  const dem0 = q.get('dem') === '1';
  if (q.get('ga')) { const [x, y, z] = q.get('ga').split(',').map(Number); const o = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5.3, 1.2), new THREE.MeshStandardMaterial({ color: '#f2c230' })); o.position.set(x, y + 2.65, z); o.name = 'thuoc_ga'; stage.scene.add(o); }
  const v0 = VIEWS[q.get('v') || 'toan'] || VIEWS.toan;
  return (t) => {
    const o = globalThis.__camOverride;
    if (o) stage.setCamera(o.cam, o.look, { fov: o.fov || 60 }); else if (!q.get('cam')) stage.setCamera(v0.cam, v0.look, { fov: v0.fov });
    const dem = globalThis.__dem ?? dem0;
    envs.use(name, t, { light: dem ? 'night' : 'day', focus: [0, 0, 0], cuaThiTruong: globalThis.__cua ?? +(q.get('cua') || 0) });
  };
};
