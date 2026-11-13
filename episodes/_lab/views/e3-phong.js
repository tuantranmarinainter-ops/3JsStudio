// Xem thử env tập 3: ?view=e3-phong&env=e3-phong|e3-tiem&dem=1&cam=x,y,z&look=x,y,z&fov=  (&ga=x,y,z → khối cao 5,3 làm thước Gà)
import { createEnvs, ENV_ASSETS } from '../../../engine/envs.js';
import { createAssetLib } from '../../../engine/assets.js';
import { propKit } from '../../../engine/props.js';
export default async (THREE, stage, q) => {
  const K = propKit(THREE);
  const A = createAssetLib(THREE); await A.load(ENV_ASSETS);
  const envs = createEnvs(THREE, stage, K, A);
  const name = q.get('env') || 'e3-phong';
  const m = await import(`../../../engine/envs/${name}.js`);
  if (m.ASSETS?.length) await A.load(m.ASSETS);
  envs.define(name, m.LIGHT || 'day', m.default);
  globalThis.__stage = stage;
  const dem = q.get('dem') === '1';
  if (q.get('ga')) { const [x, y, z] = q.get('ga').split(',').map(Number); const o = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5.3, 1.2), new THREE.MeshStandardMaterial({ color: '#f2c230' })); o.position.set(x, y + 2.65, z); o.name = 'thuoc_ga'; stage.scene.add(o); }
  const def = name === 'e3-phong' ? [[-8.5, 6.5, 13], [-3, 6, -10]] : name === 'e3-tiem' ? [[0, 5.5, 9], [0, 4, -8]] : [[0, 6, 10], [0, 4, 0]];
  return (t) => {
    const o = globalThis.__camOverride;
    if (o) stage.setCamera(o.cam, o.look, { fov: o.fov || 60 }); else if (!q.get('cam')) stage.setCamera(def[0], def[1], { fov: 60 });
    envs.use(name, t, { light: dem ? 'bedNight' : 'interior', focus: [0, 0, 0] });
  };
};
