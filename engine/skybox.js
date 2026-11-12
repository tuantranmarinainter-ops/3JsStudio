// skybox.js — THƯ VIỆN BẦU TRỜI dạng hộp 6 ảnh (Roblox Sky: SkyboxBk/Dn/Ft/Lf/Rt/Up), dùng khi cần.
// Ảnh ở assets/sky/<tên>/{bk,dn,ft,lf,rt,up}.png (đặt đúng tên theo 6 ô Properties của Sky trong Roblox Studio).
//
//   import { createSkybox, SKIES } from './skybox.js';
//   const sky = createSkybox(THREE, 'anime-day');   // Mesh hộp trời (tải qua DefaultLoadingManager → chờ tải xong trước seek)
//   scene.add(sky); ... mỗi lần render: sky.position.copy(camera.position)   (envs.js tự làm khi env khai báo e.skybox = 'anime-day')
//   sky.userData.setYaw(rad)   // xoay trời quanh trục đứng (chọn mảng mây đẹp sau lưng nhân vật)
//
//   sky.userData.setSun([x,y,z]) / setMoon([x,y,z])   // hướng tới mặt trời / mặt trăng (envs.js: mặt trời = hướng nắng của preset ánh sáng)
//
// Thêm trời mới (hàng loạt): node tools/sky-import.mjs <thư mục ảnh> [tên]  → chép ảnh + thêm dòng vào engine/skies.js + CREDITS.
// Mặt trời: ảnh quầng sáng cộng thêm (additive); mặt trăng: ảnh có alpha phủ lên trời. Cả hai luôn quay mặt về camera.
import { SKIES } from './skies.js';
export { SKIES };

// Ghép mặt TỰ TÍNH (không dựa quy ước CubeTexture): nhìn −Z thấy ft, quay phải lần lượt lf (+X), bk (+Z), rt (−X) — đo bằng độ khớp
// mép ảnh (bộ anime-day: rt→ft→lf→bk liền mây). Mặt trên: mép phải ↔ −Z, mép trên ↔ +X, mép trái ↔ +Z, mép dưới ↔ −X.
const FACES = ['ft', 'lf', 'bk', 'rt', 'up', 'dn'];

export function createSkybox(THREE, name, o = {}) {
  const def = SKIES[name]; if (!def) throw new Error(`skybox "${name}" không có. Có: ${Object.keys(SKIES).join(', ')}`);
  const base = (o.base ?? '/assets/sky/') + name + '/';
  const L = new THREE.TextureLoader(), U = { uYaw: { value: o.yaw ?? 0 }, uExp: { value: o.exposure ?? def.exposure ?? 1 } };
  const faces = def.sun ? [...FACES, 'sun'] : FACES.slice();
  if (def.moon) faces.push('moon');
  const rad = (deg) => Math.tan((deg * Math.PI / 180) / 2);
  Object.assign(U, { uSunDir: { value: new THREE.Vector3(0.4, 1, 0.7).normalize() }, uMoonDir: { value: new THREE.Vector3(-0.4, 0.6, -0.7).normalize() },
    uSunR: { value: rad(def.sunSize ?? 21) }, uMoonR: { value: rad(def.moonSize ?? 11) }, uSunK: { value: def.sunGain ?? 1.6 }, uRes: { value: def.res ?? 420 }, uCubic: { value: 1 }, uSkyK: { value: 1 }, uCamYaw: { value: 0 } });
  for (const f of faces) {
    const t = L.load(base + f + '.png'); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    U['s_' + f] = { value: t };
  }
  const mat = new THREE.ShaderMaterial({
    name: 'skybox_' + name, uniforms: U,
    vertexShader: /* glsl */`varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`uniform sampler2D s_ft, s_lf, s_bk, s_rt, s_up, s_dn;${def.sun ? ' uniform sampler2D s_sun;' : ''}${def.moon ? ' uniform sampler2D s_moon;' : ''}
      uniform float uYaw, uExp, uSunR, uMoonR, uSunK, uRes, uCubic, uSkyK, uCamYaw; uniform vec3 uSunDir, uMoonDir; varying vec3 vDir;
      // ảnh trời chỉ ~420px/mặt → bị phóng ~8× trong khung: lấy mẫu Catmull-Rom 9 điểm (5 lần đọc song tuyến) cho mây mượt, không ô vuông (ô FX skyCubic)
      vec3 tx(sampler2D s, vec2 uv) {
        if (uCubic < 0.5) return texture2D(s, uv).rgb;
        vec2 sp = uv * uRes, tp = floor(sp - 0.5) + 0.5, f = sp - tp;
        vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f), w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
        vec2 w12 = w1 + w2, o12 = w2 / w12, t0 = (tp - 1.0) / uRes, t3 = (tp + 2.0) / uRes, t12 = (tp + o12) / uRes;
        vec3 c = texture2D(s, vec2(t12.x, t0.y)).rgb * w12.x * w0.y
          + texture2D(s, vec2(t0.x, t12.y)).rgb * w0.x * w12.y + texture2D(s, t12).rgb * w12.x * w12.y + texture2D(s, vec2(t3.x, t12.y)).rgb * w3.x * w12.y
          + texture2D(s, vec2(t12.x, t3.y)).rgb * w12.x * w3.y;
        return max(c / (w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y), 0.0);
      }
      // ảnh vuông quay mặt về camera, tâm ở hướng c, nửa cạnh = tan(nửa độ góc) → toạ độ uv (ngoài [0,1] = không trúng)
      vec2 disc(vec3 d, vec3 c, float r) { float k = dot(d, c); if (k <= 0.0) return vec2(-1.0);
        vec3 rt = normalize(cross(abs(c.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0), c)), up = cross(c, rt);
        return vec2(dot(d, rt), dot(d, up)) / k / r * 0.5 + 0.5; }
      void main() {
        vec3 d = normalize(vDir);
        if (uSkyK > 1.001) {   // thu nhỏ trời quanh hướng camera (ảnh chỉ 420px/mặt): phương vị ×K quanh hướng nhìn, độ cao ×K ở chân trời → ×1 ở thiên đỉnh (chân trời giữ nguyên)
          float az = atan(d.x, d.z), el = asin(clamp(d.y, -1.0, 1.0)), da = az - uCamYaw;
          da = mod(da + 3.14159265, 6.2831853) - 3.14159265;
          az = uCamYaw + da * uSkyK; el = el * uSkyK / (1.0 + (uSkyK - 1.0) * abs(el) / 1.5707963);
          d = vec3(sin(az) * cos(el), sin(el), cos(az) * cos(el));
        }
        float c = cos(uYaw), s = sin(uYaw); d = vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z);
        vec3 a = abs(d); vec3 col;
        if (a.y >= a.x && a.y >= a.z) {
          float m = a.y;
          if (d.y > 0.0) col = tx(s_up, vec2(0.5 - 0.5 * d.z / m, 0.5 + 0.5 * d.x / m));
          else col = tx(s_dn, vec2(0.5 + 0.5 * d.x / m, 0.5 + 0.5 * d.z / m));
        } else if (a.z >= a.x) {
          float m = a.z, v = 0.5 + 0.5 * d.y / m;
          if (d.z < 0.0) col = tx(s_ft, vec2(0.5 + 0.5 * d.x / m, v));     // −Z, phải = +X
          else col = tx(s_bk, vec2(0.5 - 0.5 * d.x / m, v));               // +Z, phải = −X
        } else {
          float m = a.x, v = 0.5 + 0.5 * d.y / m;
          if (d.x > 0.0) col = tx(s_lf, vec2(0.5 + 0.5 * d.z / m, v));     // +X, phải = +Z
          else col = tx(s_rt, vec2(0.5 - 0.5 * d.z / m, v));               // −X, phải = −Z
        }
        vec3 w = normalize(vDir);   // mặt trời/trăng theo hướng THẾ GIỚI (không xoay theo uYaw → khớp hướng nắng)
        ${def.moon ? `{ vec2 uv = disc(w, uMoonDir, uMoonR); if (all(greaterThan(uv, vec2(0.0))) && all(lessThan(uv, vec2(1.0)))) { vec4 m = texture2D(s_moon, uv); col = mix(col, m.rgb, m.a); } }` : ''}
        ${def.sun ? `{ vec2 uv = disc(w, uSunDir, uSunR); if (all(greaterThan(uv, vec2(0.0))) && all(lessThan(uv, vec2(1.0)))) { vec4 m = texture2D(s_sun, uv); col += m.rgb * m.a * uSunK; } }` : ''}
        gl_FragColor = vec4(col * uExp, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat);
  mesh.name = 'skybox_' + name; mesh.renderOrder = -2; mesh.frustumCulled = false;
  mesh.userData.matKind = 'none'; mesh.userData.grungeKind = 'none';
  mesh.userData.setYaw = (r) => { mat.uniforms.uYaw.value = r; };
  mesh.userData.setSun = (d) => { U.uSunDir.value.set(d[0], d[1], d[2]).normalize(); };
  mesh.userData.setMoon = (d) => { U.uMoonDir.value.set(d[0], d[1], d[2]).normalize(); };
  mesh.userData.setCubic = (on) => { U.uCubic.value = on ? 1 : 0; };
  mesh.userData.setScale = (k, camYaw) => { U.uSkyK.value = k; U.uCamYaw.value = camYaw; };   // k > 1: trời nhỏ lại (ít phóng ảnh), camYaw = atan2(dir.x, dir.z) của camera
  mesh.userData.def = def;
  return mesh;
}
