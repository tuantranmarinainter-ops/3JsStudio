// Bối cảnh 'sea' — BIỂN CHUNG cho mọi tập: chỉ có mặt nước + mưa + chớp, toàn bộ nhìn/ánh sáng lấy từ thời tiết
//   (engine/seaweather.js). Shot: { env: 'sea', seaWeather: 'giong' } hoặc { from: 'nang', to: 'bao' }; không ghi ⇒ 'nang'.
//   Bộ sóng 'deep' (bước sóng 70 → 5 stud); amp của preset là biên độ tuyệt đối (createWater amp = 1).
//   Đảo, đá, tàu… thêm bằng props/house của shot (float: {...} để nổi) — không cần sửa file này.
import { fxRain, fxBolt } from '../fx.js';

export default function build(g, e, H) {
  const { THREE, makeSea } = H;
  e.sea = makeSea(g, { preset: 'deep', y: 0, amp: 1, size: 1600, name: 'open_sea' });
  e.defaultWeather = 'nang';
  e.rain = fxRain(THREE, { count: 2400, area: [80, 55, 80] }); e.rain.obj.name = 'open_sea_rain'; g.add(e.rain.obj);
  e.bolt = fxBolt(THREE, { seed: 6 }); e.bolt.name = 'open_sea_bolt'; e.bolt.position.set(-40, 22, -170); e.bolt.scale.setScalar(2); g.add(e.bolt);
  return { update(t, ctx) { e.sea(t); e.rain.update(t, ctx.focus || [0, 0, 0]); e.bolt.visible = false; } };
}
