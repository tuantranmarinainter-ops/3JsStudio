// shaders.js — Bộ "phong cách shader" dùng chung, áp lên cả một nhóm vật thể (R6, Kenney, GLB).
// Giữ texture/màu gốc của từng material, đổi được qua lại bất cứ lúc nào.
//
// Quy tắc (CLAUDE.md): mọi hiệu ứng là hàm thuần của t (update(t)), không requestAnimationFrame,
// không Math.random(). Truyền THREE vào như r6.js / winter.js.
//
// Dùng:
//   import * as S from './shaders.js';
//   let fx = S.applyStyle(THREE, nhom, 'anime');   // nhom: Group/Object3D chứa các mesh
//   // trong render(t): fx.update(t);
//   fx.restore();                                    // trả lại material gốc
//   fx = S.applyStyle(THREE, nhom, 'hologram', { color: '#3cf' });
// Mesh có userData.noStyle = true thì bỏ qua (vd: mặt đất).

export const SHADER_STYLES = {
  standard: 'Gốc (PBR realistic)',
  roblox: 'Roblox (nhựa mịn)',
  anime: 'Anime 3 bậc + viền + rim',
  anime2: 'Anime 2 bậc, viền dày',
  flat: 'Low-poly phẳng',
  rim: 'Viền phát sáng (rim)',
  hologram: 'Hologram',
  dissolve: 'Tan biến (dissolve)',
  wobble: 'Rung lắc (jelly)',
  outline: 'Chỉ thêm viền đen',
};

// Bảng màu bậc thang cho toon: [0.35, 0.7, 1] = 3 bậc tối → sáng
function gradientMap(THREE, steps) {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v * 255, v * 255, v * 255, 255], i * 4));
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// Đoạn GLSL dùng lại
const RIM_PARS = /* glsl */ `
uniform vec3 uRimColor;
uniform float uRimStrength;
uniform float uRimMin;
uniform float uRimMax;
`;
const RIM_APPLY = /* glsl */ `
{
  float rimF = 1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0);
  gl_FragColor.rgb += uRimColor * smoothstep(uRimMin, uRimMax, rimF) * uRimStrength;
}
#include <dithering_fragment>
`;
const NOISE3 = /* glsl */ `
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise3(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

function addRim(material, U, key) {
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uRimColor: U.uRimColor, uRimStrength: U.uRimStrength, uRimMin: U.uRimMin, uRimMax: U.uRimMax });
    sh.fragmentShader = RIM_PARS + sh.fragmentShader.replace('#include <dithering_fragment>', RIM_APPLY);
  };
  material.customProgramCacheKey = () => key;
}

export function applyStyle(THREE, root, style = 'standard', opts = {}) {
  const o = {
    outline: 0.06, outlineColor: '#151018',
    rimColor: '#ffffff', rimStrength: 0.6,
    color: '#38e0ff',          // hologram / rim / mép dissolve
    dissolvePeriod: 4,         // giây cho 1 vòng tan → hiện
    wobbleAmp: 0.3, wobbleSpeed: 5,
    ...opts,
  };
  const U = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uRimColor: { value: new THREE.Color(o.rimColor) },
    uRimStrength: { value: o.rimStrength },
    uRimMin: { value: 0.55 },
    uRimMax: { value: 0.75 },
    uColor: { value: new THREE.Color(o.color) },
  };
  const created = [];
  const cache = new Map();
  const hulls = [];
  const meshes = [];

  const base = (m) => ({ color: m.color ? m.color.clone() : new THREE.Color('#ffffff'), map: m.map || null });

  const make = {
    roblox(m) {
      const b = base(m);
      return new THREE.MeshStandardMaterial({ ...b, roughness: 0.7, metalness: 0, envMapIntensity: 0.6 });
    },
    anime(m) {
      const mat = new THREE.MeshToonMaterial({ ...base(m), gradientMap: gradientMap(THREE, [0.42, 0.75, 1]) });
      addRim(mat, U, 'anime-rim');
      return mat;
    },
    anime2(m) {
      return new THREE.MeshToonMaterial({ ...base(m), gradientMap: gradientMap(THREE, [0.55, 1]) });
    },
    flat(m) {
      return new THREE.MeshLambertMaterial({ ...base(m), flatShading: true });
    },
    rim(m) {
      const mat = new THREE.MeshStandardMaterial({ ...base(m), roughness: 0.6, metalness: 0 });
      addRim(mat, { ...U, uRimColor: U.uColor, uRimStrength: { value: 1.6 }, uRimMin: { value: 0.3 }, uRimMax: { value: 0.95 } }, 'rim-glow');
      return mat;
    },
    hologram() {
      return new THREE.ShaderMaterial({
        uniforms: { uTime: U.uTime, uColor: U.uColor },
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV; varying float vY;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal); vV = -mv.xyz;
            vY = (modelMatrix * vec4(position, 1.0)).y;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uColor;
          varying vec3 vN; varying vec3 vV; varying float vY;
          void main() {
            float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
            float scan = step(0.55, fract(vY * 6.0 - uTime * 1.5));
            float flick = 0.88 + 0.12 * sin(uTime * 37.0) * sin(uTime * 11.0);
            float a = (0.12 + fres * 0.9 + scan * 0.18) * flick;
            gl_FragColor = vec4(uColor * (0.5 + fres), a);
            #include <colorspace_fragment>
          }`,
      });
    },
    dissolve(m) {
      const mat = new THREE.MeshStandardMaterial({ ...base(m), roughness: 0.7, metalness: 0 });
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, { uProgress: U.uProgress, uEdgeColor: U.uColor });
        sh.vertexShader = 'varying vec3 vLocalPos;\n' + sh.vertexShader.replace(
          '#include <begin_vertex>', '#include <begin_vertex>\n  vLocalPos = position;');
        sh.fragmentShader = 'uniform float uProgress;\nuniform vec3 uEdgeColor;\nvarying vec3 vLocalPos;\n' + NOISE3 +
          sh.fragmentShader
            .replace('void main() {', 'void main() {\n  float dn = noise3(vLocalPos * 2.6) * 0.65 + noise3(vLocalPos * 7.0) * 0.35;\n  if (dn < uProgress) discard;')
            .replace('#include <emissivemap_fragment>',
              '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uEdgeColor * 4.0 * step(0.001, uProgress) * (1.0 - smoothstep(0.0, 0.06, dn - uProgress));');
      };
      mat.customProgramCacheKey = () => 'dissolve';
      return mat;
    },
    wobble(m) {
      const mat = new THREE.MeshStandardMaterial({ ...base(m), roughness: 0.6, metalness: 0 });
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, { uTime: U.uTime, uAmp: { value: o.wobbleAmp }, uSpeed: { value: o.wobbleSpeed } });
        sh.vertexShader = 'uniform float uTime;\nuniform float uAmp;\nuniform float uSpeed;\n' + sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
  transformed.x += sin(position.y * 2.2 + uTime * uSpeed) * uAmp;
  transformed.z += cos(position.y * 1.7 + uTime * uSpeed * 1.3) * uAmp * 0.6;`);
      };
      mat.customProgramCacheKey = () => 'wobble';
      return mat;
    },
  };

  const wantsOutline = { anime: o.outline, anime2: o.outline * 1.8, outline: o.outline }[style] || 0;
  const hullMat = wantsOutline ? new THREE.MeshBasicMaterial({ color: o.outlineColor, side: THREE.BackSide }) : null;
  if (hullMat) created.push(hullMat);

  root.traverse((obj) => { if (obj.isMesh && !obj.userData.noStyle && obj.name !== '__outline') meshes.push(obj); });

  for (const mesh of meshes) {
    if (!mesh.userData.__orig) mesh.userData.__orig = { material: mesh.material, castShadow: mesh.castShadow };
    const orig = mesh.userData.__orig.material;
    const fn = make[style];
    if (fn) {
      const conv = (m) => {
        if (!cache.has(m)) { const n = fn(m); cache.set(m, n); created.push(n); }
        return cache.get(m);
      };
      mesh.material = Array.isArray(orig) ? orig.map(conv) : conv(orig);
    } else {
      mesh.material = orig;
    }
    mesh.castShadow = (style === 'hologram' || style === 'dissolve') ? false : mesh.userData.__orig.castShadow;

    // Viền đen kiểu "inverted hull": bản sao mặt sau, nở ra theo hộp bao → hợp khối R6 / Kenney
    if (hullMat) {
      const g = mesh.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const size = g.boundingBox.getSize(new THREE.Vector3());
      const center = g.boundingBox.getCenter(new THREE.Vector3());
      const s = new THREE.Vector3(
        size.x > 1e-4 ? (size.x + 2 * wantsOutline) / size.x : 1,
        size.y > 1e-4 ? (size.y + 2 * wantsOutline) / size.y : 1,
        size.z > 1e-4 ? (size.z + 2 * wantsOutline) / size.z : 1);
      const hull = new THREE.Mesh(g, hullMat);
      hull.name = '__outline';
      hull.userData.noStyle = true;
      hull.scale.copy(s);
      hull.position.copy(center).multiply(new THREE.Vector3(1, 1, 1).sub(s));
      mesh.add(hull);
      hulls.push(hull);
    }
  }

  return {
    style,
    uniforms: U,
    update(t) {
      U.uTime.value = t;
      // dissolve: tan dần rồi hiện lại, chu kỳ dissolvePeriod giây
      U.uProgress.value = 0.5 - 0.5 * Math.cos((t / o.dissolvePeriod) * Math.PI * 2);
    },
    restore() {
      for (const h of hulls) h.parent?.remove(h);
      for (const mesh of meshes) {
        mesh.material = mesh.userData.__orig.material;
        mesh.castShadow = mesh.userData.__orig.castShadow;
      }
      for (const m of created) { m.gradientMap?.dispose(); m.dispose(); }
    },
  };
}
