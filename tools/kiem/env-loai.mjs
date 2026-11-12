// Bảng env/ánh sáng -> loại cảnh cho ctx.env của tools/kiem-luat.mjs. Sửa ở đây khi thêm env mới.
// ĐỒNG BỘ THỦ CÔNG với engine/lights.js (khoá night) và engine/envs.js (ánh sáng mặc định mỗi env): đổi bên đó thì sửa ở đây.
// shot.night (true/false) đè bảng; shot.light đè ánh sáng mặc định của env.
// Nguồn: engine/envs.js (def(<tên>, <ánh sáng mặc định>)) và engine/lights.js (night: 1).
export const ANH_SANG_DEM = new Set(['night', 'snowNight', 'storm', 'bedNight']);
export const ANH_SANG_MAC_DINH = {
  town: 'night', forest: 'night', hawaii: 'beach', brazil: 'day', sahara: 'desert', antarctica: 'snow', ocean: 'ocean',
  mountain: 'sky', snowNight: 'snowNight', iceSea: 'snowNight', storm: 'storm', shipStorm: 'storm', island: 'beach',
  reef: 'beach', kitchen: 'interior', bedroom: 'bedNight', sea: 'ocean',
};
export const ENV_TUYET = new Set(['antarctica', 'snowNight', 'iceSea', 'mountain']);
export const ENV_MUA = new Set(['storm', 'shipStorm']);

// shot: phần tử window.__shots.list (cần env, light?, fx?). Trả { dem, tuyet, mua, ghiChu? }
export function loaiEnv(shot) {
  const env = shot && shot.env;
  if (!env) return { dem: false, tuyet: false, mua: false, ghiChu: 'khong-biet-env' };
  const anhSang = shot.light || ANH_SANG_MAC_DINH[env];
  const biet = Boolean(anhSang) || ENV_TUYET.has(env) || ENV_MUA.has(env);
  const chuDem = (s) => /night|dem/i.test(String(s || ''));
  let dem = ANH_SANG_DEM.has(anhSang) || chuDem(anhSang) || chuDem(env);
  if (typeof shot.night === 'boolean') dem = shot.night;
  const tuyet = ENV_TUYET.has(env) || /snow/i.test(env);
  const fx = shot.fx ? JSON.stringify(shot.fx) : '';
  const mua = ENV_MUA.has(env) || anhSang === 'storm' || /"(rain|mua)"/i.test(fx);
  const r = { dem, tuyet, mua };
  if (!biet) r.ghiChu = 'env-la: ' + env;
  return r;
}
