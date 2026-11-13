// gio-thoi-tiet.js — GIỜ TRONG NGÀY + THỜI TIẾT theo shot, dùng lại cho mọi env. Dữ liệu + hàm thuần (không import THREE).
//   Shot / episode:  { time: 'sang'|'trua'|'chieu'|'hoang-hon'|'dem', weather: 'nang'|'may'|'mua'|'giong'|'bao'|'tuyet'|'suong' }
//   gioThoiTiet({ time, weather }, envInfo) → null (không ghi gì ⇒ hình y hệt cũ) | { light, lightOverride, seaWeather, hat }
//     envInfo = { name, light (khoá ánh sáng gốc của env), sea, rain, snow }  (engine/shots.js dựng từ env đang chạy)
//     light         khoá LIGHTS (engine/lights.js) | null (= xoá khoá thừa kế, để seaWeather tự lo) | undefined (= giữ như shot)
//     lightOverride ghi đè từng trường LIGHTS (top, bottom, fog, fogR, hemi, sun, dir, exposure)
//     seaWeather    chỉ khi env có biển/mưa (e.sea / e.rain) và shot có weather: id | { base, sky, wind } của engine/seaweather.js
//     hat           chỉ cho env KHÔNG có sẵn mưa/tuyết: { mua: 0..1, tuyet: 0..1, slant: [x,z], wind: [x,z] } → taoHatThoiTiet
//   Nội thất (kitchen, bedroom): giờ chỉ đổi sáng/tối; thời tiết bị bỏ qua (cửa sổ do env tự vẽ).
//   Bật/tắt: globalThis.__autoFx.gioThoiTiet (mặc định bật) — kiểm ở engine/shots.js. Tập mới: docs/boi-canh-tang.md.
import { LIGHTS } from '../lights.js';
import { seaPreset } from '../seaweather.js';

export const GIO = ['sang', 'trua', 'chieu', 'hoang-hon', 'dem'];
export const THOI_TIET = ['nang', 'may', 'mua', 'giong', 'bao', 'tuyet', 'suong'];   // = WEATHER_OK trong tools/kb/kichban.py
const NOI_THAT = new Set(['kitchen', 'bedroom', 'shop-in']);

// ---- màu ----
const hex = (s) => { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (c) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
export const mixHex = (a, b, k) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * k)); };

// Giờ → pha màu kéo ánh sáng NGÀY của env về phía bảng này (k = mức kéo 0..1). Trưa = ánh sáng gốc, không đổi.
const GIO_MAU = {
  sang: { k: 0.6, top: '#8db8ea', bottom: '#ffd8b4', fog: '#f7dcc8', sun: ['#ffd9b0', 0.85], hemi: '#fff0e0', dir: [-0.9, 0.35, 0.4] },
  chieu: { k: 0.5, top: '#5aa0e0', bottom: '#f5d9a8', fog: '#f0dcb8', sun: ['#ffe0a0', 0.95], hemi: '#fff2d8', dir: [0.9, 0.55, 0.3] },
  'hoang-hon': { k: 0.75, top: '#4a5fa8', bottom: '#ff9d5c', fog: '#f0a878', sun: ['#ff9a50', 0.8], hemi: '#ffc9a0', dir: [0.95, 0.22, 0.2], exposure: 0.98 },
};
// Thời tiết (env không có biển): kéo trời/sương về xám (k), giảm nắng (sun ×), thu ngắn tầm sương (fogK ×), thêm hạt.
const THOI_TIET_BANG = {
  nang: null,
  may: { grey: '#aab4be', k: 0.45, sun: 0.55, hemi: 0.95, fogK: 0.8 },
  mua: { grey: '#8d98a3', k: 0.6, sun: 0.35, hemi: 0.9, fogK: 0.55, hat: { mua: 0.6, slant: [0.3, 0.1] } },
  giong: { grey: '#4d5b6e', k: 0.7, sun: 0.2, hemi: 0.85, fogK: 0.4, hat: { mua: 0.85, slant: [0.45, 0.15] } },
  bao: { grey: '#2e3a52', k: 0.75, sun: 0.15, hemi: 0.8, fogK: 0.3, hat: { mua: 1, slant: [0.6, 0.2] } },
  tuyet: { grey: '#dfe8f0', k: 0.5, sun: 0.6, hemi: 1, fogK: 0.5, hat: { tuyet: 0.8, wind: [2, 0] } },
  suong: { grey: '#cfd6dc', k: 0.55, sun: 0.45, hemi: 0.95, fogK: 0.25 },
};
// Thời tiết biển (engine/seaweather.js SEA_WEATHER) và bản ban đêm
const SEA_ID = { nang: 'nang', may: 'u-am', mua: 'mua', giong: 'giong', bao: 'bao', tuyet: 'bang', suong: 'gio-nhe' };
const SEA_DEM = { nang: 'dem-trang', 'u-am': 'dem-trang', mua: 'dem-bao', giong: 'dem-bao', bao: 'dem-bao', bang: 'dem-trang', 'gio-nhe': 'dem-trang' };
const BAO = new Set(['mua', 'giong', 'bao']);

// khoá ánh sáng theo giờ cho env này
function khoaAnhSang(time, env) {
  const goc = env.light, dem = !!LIGHTS[goc]?.night;
  if (NOI_THAT.has(env.name)) return time === 'dem' ? 'bedNight' : 'interior';
  if (time === 'dem') return dem ? goc : goc === 'snow' ? 'snowNight' : 'night';
  if (!dem) return goc;
  return goc === 'snowNight' ? 'snow' : goc === 'storm' ? 'storm' : 'day';   // env gốc ban đêm → bản ngày
}

// ghi đè LIGHTS để tới pha màu của giờ (chỉ ban ngày, ngoài trời)
function tintGio(L, time) {
  const T = GIO_MAU[time]; if (!T) return {};
  const o = { top: mixHex(L.top, T.top, T.k), bottom: mixHex(L.bottom, T.bottom, T.k), dir: [...T.dir] };
  if (L.fog) o.fog = mixHex(L.fog, T.fog, T.k);
  o.hemi = [mixHex(L.hemi[0], T.hemi, T.k), L.hemi[1], L.hemi[2]];
  o.sun = [mixHex(L.sun[0], T.sun[0], T.k), L.sun[1] * T.sun[1]];
  if (T.exposure) o.exposure = T.exposure;
  return o;
}

// ĐÊM dễ nhìn (chỉ luồng time:'dem'; preset LIGHTS.night/bedNight giữ nguyên cho tập đặt light: tay như ep001):
//   ngoài trời = trăng định hướng lạnh, thấp hơn + mạnh hơn (tách khối, có bóng) + hemi đất ấm (bóng không bệt xanh);
//   nhà máy = đèn trần ấm (hemi ấm) ; phòng ngủ = trăng qua cửa sổ + hemi tím nhạt. Giá trị đo trên ep002 (output/look/den-b).
const DEM = {
  ngoai: { top: '#0f1a52', bottom: '#4a5ca8', hemi: ['#a9b9ff', '#5a4a66', 1.45], sun: ['#c4d2ff', 2.5], dir: [-0.65, 0.7, 0.45], exposure: 1.15 },
  factory: { hemi: ['#ffe2bc', '#7a6048', 1.5], sun: ['#ffd9a8', 0.9], dir: [0.4, 1, 0.7], exposure: 1.1 },
  bedroom: { hemi: ['#b4bdff', '#5a4458', 1.5], sun: ['#c0caff', 2.0], dir: [-0.8, 0.7, 0.4], exposure: 1.12 },
};
function demAnhSang(env) {
  if (env.name === 'factory') return DEM.factory;
  if (env.name === 'bedroom') return DEM.bedroom;
  if (NOI_THAT.has(env.name)) return {};
  return DEM.ngoai;
}
// đèn nhân vật bám camera (engine/lights.js denNhanVat): đêm mạnh, nhà máy mạnh nhất (ngược sáng), bão vừa; còn lại 0
function denNhanVat(time, weather, env) {
  if (time === 'dem') return { k: env.name === 'factory' ? 1.5 : 1.0, color: env.name === 'factory' ? '#fff0dc' : '#e8ecff' };
  if (weather === 'mua' || weather === 'giong' || weather === 'bao') return { k: 0.5, color: '#e8ecff' };
  return null;
}

// thời tiết lên ánh sáng đã có (L = LIGHTS gốc + tint giờ)
function tintThoiTiet(L, W) {
  const o = {};
  const tgt = L.night ? mixHex(W.grey, '#0a0e1c', 0.8) : W.grey;
  o.top = mixHex(L.top, tgt, W.k); o.bottom = mixHex(L.bottom, tgt, W.k);
  if (L.fog) { o.fog = mixHex(L.fog, tgt, W.k); if (L.fogR) o.fogR = [L.fogR[0] * W.fogK, L.fogR[1] * W.fogK]; }
  o.hemi = [L.hemi[0], L.hemi[1], L.hemi[2] * W.hemi];
  o.sun = [L.sun[0], L.sun[1] * W.sun];
  return o;
}

export function gioThoiTiet(shot, env) {
  const { time, weather } = shot || {};
  if (!time && !weather) return null;
  if (time && !GIO.includes(time)) throw new Error(`gioThoiTiet: time "${time}" không có. Có: ${GIO.join(', ')}`);
  if (weather && !THOI_TIET.includes(weather)) throw new Error(`gioThoiTiet: weather "${weather}" không có. Có: ${THOI_TIET.join(', ')}`);
  const out = {};
  const noiThat = NOI_THAT.has(env.name), dem = time === 'dem';
  const kieuBien = !noiThat && weather && (env.sea || env.rain);

  if (kieuBien) {
    // thời tiết biển lo ánh sáng + sóng + mưa + chớp; giờ chỉ chọn bản ngày/đêm và pha màu bình minh/hoàng hôn
    let id = SEA_ID[weather]; if (dem) id = SEA_DEM[id];
    let sky = null, extra = {};
    if (weather === 'suong') { sky = { fog: dem ? '#3a4458' : '#cfd8dc', fogR: [25, 160] }; extra = { wind: { dir: 0, k: 0.2 } }; }
    if (time && !dem && GIO_MAU[time] && !BAO.has(weather)) sky = { ...tintGio(seaPreset(id).L, time), ...(sky || {}) };
    out.seaWeather = sky ? { base: id, sky, ...extra } : id;
    out.light = null; out.lightOverride = {};
    out.denNV = denNhanVat(time, weather, env);
    return out;
  }

  // ánh sáng theo giờ (+ thời tiết); env nội thất bỏ qua thời tiết
  const light = time ? khoaAnhSang(time, env) : env.light;
  if (time) out.light = light;
  let L = { ...LIGHTS[light] };
  let o = {};
  if (time && !dem && !noiThat) { o = tintGio(L, time); L = { ...L, ...o }; }
  if (dem && L.night) { o = demAnhSang(env); L = { ...L, ...o }; }
  const W = !noiThat && weather ? THOI_TIET_BANG[weather] : null;
  if (W) { o = { ...o, ...tintThoiTiet(L, W) }; }
  out.lightOverride = o;
  out.denNV = denNhanVat(time, weather, env);
  if (W && W.hat) {
    const hat = {};
    if (W.hat.mua && !env.rain) { hat.mua = W.hat.mua; hat.slant = W.hat.slant; }
    if (W.hat.tuyet && !env.snow) { hat.tuyet = W.hat.tuyet; hat.wind = W.hat.wind; }
    if (hat.mua || hat.tuyet) out.hat = hat;
  }
  return out;
}

// Lớp phủ hạt dùng chung cho env không có mưa/tuyết riêng. Tạo LƯỜI (lần đầu có shot thời tiết) nên ep không ghi weather không thêm vật nào.
//   const fxTT = taoHatThoiTiet(THREE, scene, { fxRain, fxSnow });  fxTT.update(hat|null, t, focus)
export function taoHatThoiTiet(THREE, scene, { fxRain, fxSnow }) {
  const rain = fxRain(THREE, { count: 2000, area: [90, 60, 90], seed: 17 }); rain.obj.name = 'thoitiet_mua';
  const snow = fxSnow(THREE, { count: 700, area: [100, 60, 100], speed: 3, size: 0.45, seed: 19 }); snow.obj.name = 'thoitiet_tuyet';
  const g = new THREE.Group(); g.name = 'fx_thoitiet'; g.add(rain.obj, snow.obj); g.visible = false; scene.add(g);
  rain.obj.visible = snow.obj.visible = false;
  const nRain = rain.obj.geometry.attributes.position.count / 2;
  return {
    group: g, rain, snow,
    update(hat, t, focus = [0, 0, 0]) {
      g.visible = !!hat;
      if (!hat) { rain.obj.visible = snow.obj.visible = false; return; }
      rain.obj.visible = !!hat.mua; snow.obj.visible = !!hat.tuyet;
      if (hat.mua) {
        rain.slant = hat.slant || null;
        rain.obj.geometry.setDrawRange(0, Math.round(nRain * Math.min(1, hat.mua)) * 2);
        rain.update(t, focus);
      }
      if (hat.tuyet) {
        for (const L of snow.obj.children) L.geometry.setDrawRange(0, Math.max(1, Math.round(L.geometry.attributes.position.count * Math.min(1, hat.tuyet))));
        snow.update(t, focus);
      }
    },
  };
}
