// Xem thử env 'e3-nha-may': ?view=e3-nha-may&dem=1 (đêm) | dem=0 (ngày) &kho=0..1 (cửa kho) &cong=0..1 (cổng rào) &cam=x,y,z&look=x,y,z&fov=
import { createEnvs, ENV_ASSETS } from '../../../engine/envs.js';
import { createAssetLib } from '../../../engine/assets.js';
import { propKit } from '../../../engine/props.js';
export default async (THREE, stage, q) => {
  const K = propKit(THREE);
  const A = createAssetLib(THREE); await A.load(ENV_ASSETS);
  const m = await import('../../../engine/envs/e3-nha-may.js');
  if (m.ASSETS?.length) await A.load(m.ASSETS);
  const envs = createEnvs(THREE, stage, K, A);
  envs.define('e3-nha-may', m.LIGHT, m.default);
  const num = (s) => s.split(',').map(Number);
  const night = q.get('dem') !== '0';
  const ctx = { light: night ? 'night' : 'day', focus: [0, 0, 0] };
  if (q.get('kho') !== null) ctx.cuaKho = +q.get('kho');
  if (q.get('cong') !== null) ctx.congRao = +q.get('cong');
  window.__env = envs.envs['e3-nha-may']; window.__stage = stage; window.__THREE = THREE;
  const S = { cam: q.get('cam'), look: q.get('look') || '0,0,0', fov: +(q.get('fov') || 40) };
  window.__view = (o) => { Object.assign(S, o); if (o.dem !== undefined) ctx.light = o.dem ? 'night' : 'day'; if (o.kho !== undefined) ctx.cuaKho = o.kho; if (o.cong !== undefined) ctx.congRao = o.cong; };   // công cụ chụp (nhiều góc trong một lần mở trang)
  return (t) => {
    if (S.cam) stage.setCamera(num(S.cam), num(S.look), { fov: S.fov });
    else stage.orbit([0, 8, 0], { yaw: 0.6, height: 40, dist: 120, lookUp: 0, fov: 40 });
    envs.use('e3-nha-may', t, ctx);
  };
};
