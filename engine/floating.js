// floating.js — vật nổi cưỡi sóng THẬT của shader nước (sea2, học Saltline / Tidewright), tất định: hàm thuần của t.
//
//   Dùng floatPose(sea, …) bên dưới (đường chung); floatHull là phần tính thuần.
//   const F = floatHull(sea.sample, { x, z, yaw, hx, hz, t, clock });
//     sea.sample = createWater(...).sample (bản CPU của tổng sóng Gerstner trong vertex shader)
//     clock(t) → { t: uTime của biển, amp } — ĐÚNG giá trị env truyền vào update() (vd. bão: t*1.6, 2.4)
//     hx/hz = nửa dài theo trục X / Z cục bộ của thân (yaw = rotation.y của thân)
//   → { y, sx, sz, vy, rotX, rotZ }   y = mặt nước trung bình dưới thân; sx/sz = dốc mặt nước theo X/Z cục bộ;
//     rotX/rotZ = góc đặt cho rotation.x / rotation.z của thân (+Z chúi xuống khi rotX > 0; +X nhô lên khi rotZ > 0)
//
// Quán tính KHÔNG dùng lò xo theo khung (cấm lịch sử khung): mỗi kênh lấy trung bình vài "nhịp trễ" của chính trường sóng
//   tại t − lag (nhấp nhô ~0.12 s, chúi ~0.15 s, lắc ~0.2 s) → vẫn là hàm thuần của t.
// Lọc thông thấp theo không gian: sample(..., box) lấy TRUNG BÌNH sóng trên mặt đáy thân (sinc·sinc giải tích) → sóng ngắn
//   không làm thân to giật theo.
//
//   const wl = wetline(THREE, root);  wl.set({ y, x, z, gx, gz, t }) | wl.off()
//     vệt ướt / đường nước trên vật liệu của thân (tối + bóng hơn dưới mặt nước + 0.4) qua onBeforeCompile,
//     nối tiếp onBeforeCompile sẵn có (grunge.js / materials.js) theo mẫu `prev` + customProgramCacheKey. Tắt ⇒ y hệt cũ.

const TAPS = { heave: [0.04, 0.12, 0.2], pitch: [0.05, 0.15, 0.25], roll: [0.1, 0.2, 0.3] };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function hullAt(sample, o, ts) {
  const { t, amp } = o.clock ? o.clock(ts) : { t: ts, amp: undefined };
  const { x, z, yaw = 0, hx, hz, cam = null } = o;
  const ux = Math.cos(yaw), uz = -Math.sin(yaw), vx = Math.sin(yaw), vz = Math.cos(yaw);   // trục X / Z cục bộ trong thế giới
  const s = (ox, oz, bx, bz) => sample(x + ox, z + oz, { t, amp, cam, box: { hx: bx, hz: bz, yaw } });
  const c = s(0, 0, hx, hz);
  const f = s(vx * hz / 2, vz * hz / 2, hx, hz / 2), b = s(-vx * hz / 2, -vz * hz / 2, hx, hz / 2);   // trước / sau (+Z / −Z)
  const r = s(ux * hx / 2, uz * hx / 2, hx / 2, hz), l = s(-ux * hx / 2, -uz * hx / 2, hx / 2, hz);   // +X / −X
  return {
    y: c.y * 0.2 + (f.y + b.y) * 0.22 + (r.y + l.y) * 0.18,
    vy: c.vy * 0.2 + (f.vy + b.vy) * 0.22 + (r.vy + l.vy) * 0.18,
    sx: (r.y - l.y) / hx, sz: (f.y - b.y) / hz,
  };
}

export function floatHull(sample, o) {
  const t = o.t, cache = new Map();
  const at = (lag) => { const k = lag.toFixed(3); if (!cache.has(k)) cache.set(k, hullAt(sample, o, t - lag)); return cache.get(k); };
  const avg = (taps, key) => taps.reduce((a, lag) => a + at(lag)[key], 0) / taps.length;
  const y = avg(TAPS.heave, 'y'), sx = avg(TAPS.roll, 'sx'), sz = avg(TAPS.pitch, 'sz');
  // tốc độ dọc (đv / giây của shot) — vi phân hữu hạn của chính hàm nhấp nhô (thuần theo t)
  const h = 1 / 60, yp = TAPS.heave.reduce((a, lag) => a + hullAt(sample, o, t + h - lag).y, 0) / 3;
  const vy = (yp - y) / h;
  const kp = o.pitchK ?? 0.92, kr = o.rollK ?? 0.62, mp = o.maxPitch ?? 0.22, mr = o.maxRoll ?? 0.25;
  return { y, sx, sz, vy, rotX: clamp(-Math.atan(sz) * kp, -mp, mp), rotZ: clamp(Math.atan(sx) * kr, -mr, mr) };
}

// ---- đường dùng CHUNG cho mọi vật nổi (nhà boat, cast/props float, tàu shipStorm, sea-lab) ----
//   const F = floatPose(sea, { x, z, yaw, hx, hz, t, draft, pitchK, rollK, maxPitch, maxRoll, response, clock });
//   sea = hàm biển của engine/sea.js (có .sample/.clock/.water/.response); t = t TOÀN CỤC (clock đổi sang thời gian biển)
//   → F của floatHull + dy = F.y − cao độ mặt biển tĩnh − draft  (đặt: position.y = y_khi_biển_lặng + dy)
//   response (× pitchK/rollK/maxPitch/maxRoll) mặc định = sea.response (thời tiết, engine/seaweather.js float) = 1.
export function floatPose(sea, o) {
  const R = o.response ?? sea.response ?? 1;
  const F = floatHull(sea.sample, { ...o, clock: o.clock || sea.clock,
    pitchK: (o.pitchK ?? 0.92) * R, rollK: (o.rollK ?? 0.62) * R, maxPitch: (o.maxPitch ?? 0.22) * R, maxRoll: (o.maxRoll ?? 0.25) * R });
  F.dy = F.y - (sea.water?.mesh.position.y ?? 0) - (o.draft || 0);
  return F;
}
// nghiêng của F (rotX/rotZ trong hệ thân có yaw) thành quaternion THẾ GIỚI để nhân trước (premultiply) vào hướng sẵn có
export function floatTilt(THREE, F, yaw = 0, k = 1, q = new THREE.Quaternion()) {
  const e = new THREE.Euler(F.rotX * k, yaw, F.rotZ * k, 'YXZ');
  q.setFromEuler(e).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw));
  return q;
}

const WL_VERT_PARS = 'varying vec3 vWlW;';
const WL_VERT = 'vWlW = (modelMatrix * vec4(transformed, 1.0)).xyz;';
const WL_FRAG_PARS = 'varying vec3 vWlW; uniform float uWlOn; uniform vec4 uWlP; uniform vec3 uWlG;';
// uWlP = (tâm x, tâm z, cao độ nước ở tâm, t) ; uWlG = (dốc theo x thế giới, dốc theo z thế giới, -)
const WL_K = /* glsl */`
  float wlH = uWlP.z + dot(vWlW.xz - uWlP.xy, uWlG.xy) + 0.18*sin(dot(vWlW.xz, vec2(0.55, 0.38)) + uWlP.w*2.3) + 0.1*sin(dot(vWlW.xz, vec2(-0.3, 0.9)) - uWlP.w*3.1);
  float wlD = vWlW.y - wlH;
  float wlWet = (1.0 - smoothstep(0.15, 0.75, wlD)) * uWlOn;           // ướt tới ~+0.4 trên mặt nước
  float wlSub = (1.0 - smoothstep(-0.6, 0.0, wlD)) * uWlOn;            // dưới mặt nước: tối hơn nữa (rêu/sơn chống hà)
`;

const PATCHED = new WeakMap();
export function wetline(THREE, root) {
  const U = { uWlOn: { value: 0 }, uWlP: { value: new THREE.Vector4() }, uWlG: { value: new THREE.Vector3() } };
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || !m.isMeshStandardMaterial || PATCHED.has(m)) continue;
      PATCHED.set(m, U);
      const prev = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => {
        prev?.call(m, sh, r);
        sh.uniforms.uWlOn = U.uWlOn; sh.uniforms.uWlP = U.uWlP; sh.uniforms.uWlG = U.uWlG;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + WL_VERT_PARS)
          .replace('#include <project_vertex>', '#include <project_vertex>\n' + WL_VERT);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + WL_FRAG_PARS)
          .replace('#include <map_fragment>', '#include <map_fragment>\n' + WL_K + 'diffuseColor.rgb *= 1.0 - 0.38*wlWet - 0.22*wlSub;')
          .replace('#include <metalnessmap_fragment>', '{' + WL_K + 'roughnessFactor = mix(roughnessFactor, 0.22, wlWet*0.85); }\n#include <metalnessmap_fragment>');
      };
      const key = m.customProgramCacheKey?.bind(m);
      m.customProgramCacheKey = () => (key ? key() : '') + '|wetline';
      m.needsUpdate = true;
    }
  });
  return {
    U,
    off() { U.uWlOn.value = 0; },
    set({ y, x, z, gx = 0, gz = 0, t = 0, k = 1 }) { U.uWlOn.value = k; U.uWlP.value.set(x, z, y, t); U.uWlG.value.set(gx, gz, 0); },
  };
}

// dốc mặt nước theo trục thế giới từ dốc cục bộ (trục X cục bộ = (cos yaw, −sin yaw), Z cục bộ = (sin yaw, cos yaw))
export function worldGrad(sx, sz, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { gx: sx * c + sz * s, gz: -sx * s + sz * c };
}
