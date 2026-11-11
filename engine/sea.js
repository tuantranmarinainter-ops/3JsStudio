// sea.js — LÕI "biển": bọc createWater (engine/water.js) thành hàm sea(t, amp) có ĐỒNG HỒ riêng, dùng chung cho mọi env,
// sea-lab.html và vật nổi (engine/floating.js). envs.js makeSea(g, …) = createSea + thêm vào group của env.
//
//   const sea = createSea(THREE, { preset: 'storm', y: 2, amp: 2.4, size: 1600, rate: 1.6 });
//   scene.add(sea.water.mesh);
//   sea(t);                          // trong env.update: t = t TOÀN CỤC của phim; thời gian shader = t · rate
//   sea.water.update(sea.water.t, camera, light, sea.water.ampNow);   // envs.use() làm việc này mỗi khung
//   sea.clock(t) → { t: thời gian biển, amp }   ĐÚNG giá trị shader dùng ở khung t (vật nổi + sự kiện cần cái này)
//   sea.sample(x, z, { t: sea.clock(t).t, amp: sea.clock(t).amp })   → { y, vy }   (xem đầu water.js)
//
// Đồng hồ (ưu tiên giảm dần):
//   1. drive  — sea.setDrive((tg) => ({ amp, rate }))  (thời tiết theo shot, engine/seaweather.js; shots.js đặt mỗi khung)
//   2. học    — env cũ tự nhân thời gian (sea(t * 1.6, 2.4)) mà không khai báo rate: sea() NHỚ tỉ lệ (t biển / t khung)
//              và amp của lần gọi gần nhất → clock() dùng lại. (Khung đầu tiên trước lần gọi nào thì chưa biết →
//              env mới nên khai báo `rate` thay vì tự nhân.)
//   3. mặc định — t · rate, amp = amp khai báo (⇒ uAmp = 1, như cũ)
//   e.seaClock(t) cũ (env tự khai) vẫn được engine/shots.js dùng trước tiên — tương thích ngược.
//
// Sự kiện mặt nước: 2 nguồn được GỘP (≤ 8) trước khi đưa vào water.setEvents:
//   sea.setEvents(list)      — của env (cá voi…), t0 cùng đơn vị với t truyền vào sea(t) (= t toàn cục) → tự nhân rate
//   sea.setShotEvents(list)  — của shot (engine/shots.js, trường seaEvents), t0 đã ở thời gian biển
// Nhìn: sea.resetLook() trả màu/bọt/gió về lúc dựng (envs.use gọi mỗi khung trước env.update → thời tiết không "dính" sang shot sau).
import { createWater } from './water.js';

export function createSea(THREE, { preset = 'tropical', size = 1400, seg = 150, y = 0, amp, name = 'sea', rate = 1, ...rest } = {}) {
  const w = createWater(THREE, { preset, size, segments: seg, y, amp, name, ...rest });
  const ampDecl = amp ?? w.defaultAmp;
  let drive = null, learned = null, envEv = null, shotEv = null, frameT = null, base = null;
  const rateNow = (tg) => (drive ? (drive(tg).rate ?? rate) : learned ? learned.k : rate);
  const clock = (tg) => {
    if (drive) { const d = drive(tg); return { t: tg * (d.rate ?? rate), amp: d.amp ?? ampDecl }; }
    if (learned) return { t: tg * learned.k, amp: learned.amp };
    return { t: tg * rate, amp: ampDecl };
  };
  const push = () => { const l = [...(shotEv || []), ...(envEv || [])]; w.setEvents(l.length ? l : null); };
  const sea = (x, a) => {
    if (drive) { const c = clock(frameT ?? x); w.t = c.t; w.ampNow = c.amp; }
    else {
      w.t = x * rate; w.ampNow = a;
      // nhớ đồng hồ khi env tự nhân thời gian / tự đổi amp (chỉ khi KHÁC khai báo → env thường vẫn tất định tuyệt đối)
      if (frameT != null && Math.abs(frameT) > 1e-6) {
        const k = w.t / frameT, am = a ?? ampDecl;
        learned = Math.abs(k - rate) > 1e-6 || Math.abs(am - ampDecl) > 1e-6 ? { k, amp: am } : null;
      }
    }
    sea.last = { t: w.t, amp: w.ampNow, tg: frameT };
    return w;
  };
  Object.assign(sea, {
    water: w, rate, clock, sample: w.sample, setHull: w.setHull, last: null, response: 1,
    /** t toàn cục của khung — envs.use() gọi trước env.update */
    frame(tg) { frameT = tg; },
    /** fn(tg) → { amp, rate } | null; response = hệ số phản ứng vật nổi (floatPose) */
    setDrive(fn, { response = 1 } = {}) { drive = fn || null; sea.response = fn ? response : 1; },
    setEvents(list) {   // env: t0 theo t toàn cục → thời gian biển
      const k = rateNow(frameT ?? 0);
      envEv = list && list.length ? (k === 1 ? list : list.map((e) => ({ ...e, t0: (e.t0 ?? 0) * k }))) : null; push();
    },
    setShotEvents(list) { shotEv = list && list.length ? list : null; push(); },
    resetLook() { if (!base) base = w.getLook(); w.setLook(base); w.setWind(); },
    baseLook() { if (!base) base = w.getLook(); return base; },
  });
  return sea;
}
