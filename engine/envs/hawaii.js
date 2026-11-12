// Bối cảnh 'hawaii' (preset ánh sáng mặc định: beach). Sửa bối cảnh này CHỈ trong file này.
// Được engine/envs.js gọi: build(g, e, H) — g = Group của env, e = đối tượng env, H = bộ công cụ chung (xem envs.js).
import { fxSnow, fxRain, lightning, fxBolt } from '../fx.js';
import { createWater } from '../water.js';
import { createOceanLife, OCEAN_LIFE_ASSETS } from '../whales.js';
import { townLife } from '../townlife.js';
import { createSummit, createRange } from '../peaks.js';
import { createCloudSea, createCloudPuffs } from '../clouds.js';
import { pyramid, camel, jungleGiant, bigLeaves } from '../env_desert.js';
import { snowRanges } from '../snowpeaks.js';
import { createCliff, naturalRock, coralRock } from '../cliff.js';
import { createCrabs, createBeachGrass } from '../crabs.js';
import { createCamp } from '../castaway.js';
import { smoothFlash } from '../flash.js';
import { createCoconutPalm } from '../coconut.js';

export default function build(g, e, H) {
  const { ganTang, THREE, stage, scene, K, K0, A, fit, pick, pickFit, PINES, PALMS, LEAFY, ROCKS, BUSH, M2S, pf, kenneyHouse, C, plane, mat, place, makeSea, bumpy, nbHouse, nbWins, checker, views, viewTex, hash, LIGHTS, envs } = H;
  // cát rộng tới tận chân trời (góp ý 2026-11-11 #3: hở mép cát ở s011); mép biển vẫn ở z≈70
  // góp ý 2026-11-12 #2 (s003): cát thật hơn — hạt mịn, gợn gió, cát ướt sẫm gần mép nước, vân không lặp ô, màu dịu bớt vàng.
  // Shader thủ tục theo toạ độ THẾ GIỚI (tĩnh, tất định); bỏ vân SAND chung của materials.js (matKind 'none') để khỏi chồng 2 lớp.
  const sandMat = mat('#e3cc9c', { roughness: 0.97 });
  sandMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSW =(modelMatrix * vec4(transformed, 1.0)).xyz;');
    const FN = `
      varying vec3 vSW;
      float sdH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float sdN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(sdH(i), sdH(i + vec2(1.0, 0.0)), f.x), mix(sdH(i + vec2(0.0, 1.0)), sdH(i + vec2(1.0, 1.0)), f.x), f.y); }
      float sdF(vec2 p){ return sdN(p) * 0.5 + sdN(p * 2.03 + 7.1) * 0.25 + sdN(p * 4.1 + 3.7) * 0.125 + sdN(p * 8.3 + 1.3) * 0.0625; }
      float sdRip(vec2 p){
        float dirN = sdN(p * 0.012) * 1.2;                           // hướng gợn đổi chậm theo vùng
        vec2 d = vec2(cos(0.5 + dirN), sin(0.5 + dirN));
        float w = sdF(p * 0.05) * 9.0 + sdN(p * 0.33) * 2.6;           // uốn lượn
        float r = sin(dot(p, d) * 1.7 + w);
        float amp = smoothstep(0.25, 0.7, sdN(p * 0.025 + 11.0));     // chỗ có gợn, chỗ phẳng
        return (r * 0.5 + 0.5) * amp;
      }
      float sdHgt(vec2 p){ return sdRip(p) * 0.6 + sdF(p * 1.7) * 0.4; }`;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + FN)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 sp = vSW.xz;
        float wetF = smoothstep(44.0, 66.0, vSW.z + (sdN(sp * 0.18) - 0.5) * 7.0);        // cát ướt dần về phía biển (mép nước z≈70)
        float big = sdF(sp * 0.035), mid = sdF(sp * 0.35), grain = sdN(sp * 14.0) * 0.6 + sdN(sp * 38.0) * 0.4;
        float rip = sdRip(sp);
        vec3 sandLo = vec3(0.50, 0.39, 0.25), sandHi = vec3(0.74, 0.62, 0.43);
        vec3 sc = mix(sandLo, sandHi, 0.35 + 0.65 * big);
        sc *= mix(0.9, 1.07, mid) * mix(0.9, 1.08, grain) * mix(0.96, 1.04, rip);
        sc = mix(sc, sc * vec3(0.52, 0.48, 0.45), wetF * 0.9);                               // ướt: sẫm, hơi lạnh
        sc += vec3(0.07, 0.07, 0.06) * step(0.985, sdH(floor(sp * 30.0))) * (1.0 - wetF);    // lấp lánh hạt thạch anh
        diffuseColor.rgb = sc;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.97, 0.38, wetF);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float e0 = 0.12, h0 = sdHgt(sp), hx = sdHgt(sp + vec2(e0, 0.0)), hz = sdHgt(sp + vec2(0.0, e0));
          float k = mix(0.3, 0.1, wetF);
          vec3 gw = vec3(-(hx - h0) / e0 * k, 0.0, -(hz - h0) / e0 * k);
          normal = normalize(normal + (viewMatrix * vec4(gw, 0.0)).xyz); }`);
  };
  sandMat.customProgramCacheKey = () => 'hawaiiSand1';
  const sand = plane(2400, 1200, sandMat, 0, 'sand'); sand.userData.matKind = 'none'; sand.position.z = 70 - 600; g.add(sand);
  e.sea = makeSea(g, { preset: 'tropical', y: 1.5, amp: 0.6, size: 1400, center: [0, -380], shore: { line: [0, 1, 54, 5] } }); g.children[g.children.length - 1].position.z = 380;
  // cua khối chạy trên cát ướt gần mép sóng (nhìn từ trên cao)
  e.crabs = createCrabs(THREE, [
    { a: [-16, 44], b: [-4, 48], speed: 5, phase: 0, s: 2.4 }, { a: [2, 49], b: [14, 45], speed: 4.5, phase: 1.3, s: 2.2 },
    { a: [16, 40], b: [26, 44], speed: 5, phase: 0.7, s: 2.4 }, { a: [-22, 36], b: [-10, 38], speed: 4.2, phase: 2.1, s: 2.2 },
    { a: [8, 34], b: [-4, 32], speed: 4.6, phase: 0.4, s: 2.2 }, { a: [22, 50], b: [34, 47], speed: 4.4, phase: 1.9, s: 2.3 },
    { a: [-8, 52], b: [4, 51], speed: 4, phase: 2.6, s: 2.2 },
  ]);
  g.add(e.crabs.group);
  for (let i = 0; i < 14; i++) place(g, createCoconutPalm(THREE, { h: 16 + hash(i, 5) * 8, lean: 0.14 + hash(i, 6) * 0.2, seed: i + 11 }), -120 + i * 18 + hash(i, 1) * 8, 0, -30 - hash(i, 2) * 50, 0);
  // thêm nhiều dừa phía trong đảo (góp ý #3): rải lệch theo hash, tránh khu nhà đứng (|x|<30, z>-40)
  for (let i = 0; i < 90; i++) {
    const x = -420 + hash(i, 21) * 840, z = -14 - hash(i, 22) * 320;
    if (Math.abs(x) < 48 && z > -110) continue;
    place(g, createCoconutPalm(THREE, { h: 15 + hash(i, 23) * 10, lean: 0.1 + hash(i, 24) * 0.25, seed: i + 40 }), x, 0, z, hash(i, 25) * 6.28);
  }
  const rocks = new THREE.Group(); rocks.name = 'hawaii_beach_rocks'; g.add(rocks);
  for (let i = 0; i < 6; i++) place(rocks, K.rock(2 + hash(i, 9) * 2, '#9a8a7a', i), -60 + i * 25, 0, 40 + hash(i, 4) * 10);
  const cloudA = place(g, K.cloud(2.2), -80, 90, -260);
  const cloudB = place(g, K.cloud(1.8), 90, 110, -300);
  // --- 3 tầng (docs/boi-canh-tang.md): front = mặt nước + cua + đá bãi · mid = dừa (hàng bãi + trong đảo) · back = mây xa + dãy núi xa (tangXa) ---
  ganTang(e.sea.water.mesh, 'front');
  ganTang(e.crabs.group, 'front');
  ganTang(rocks, 'front');
  g.children.forEach((o) => { if (o.name === 'coconut_palm') ganTang(o, 'mid'); });
  ganTang(cloudA, 'back');
  ganTang(cloudB, 'back');
  const tx = new THREE.Group(); tx.name = 'hawaii_tangxa'; tx.userData.banKinhToiThieu = 30; g.add(tx);
  { const far = new THREE.Group(); far.name = 'hawaii_far_hills';
    for (let i = 0; i < 8; i++) {
      const x = -700 + i * 200 + (hash(i, 81) - 0.5) * 80, z = -620 - hash(i, 82) * 160, w = 180 + hash(i, 83) * 120, h = 40 + hash(i, 84) * 50;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat(i % 2 ? '#587a5e' : '#4c6e54', { flatShading: true, roughness: 1 }));
      m.scale.set(w, h, w * 0.5);
      m.position.set(x, h * 0.25 - 1, z);
      far.add(m);
    }
    tx.add(ganTang(far, 'back')); }
  return { suSong: ['song'], update(t) { tx.visible = globalThis.__autoFx?.tangXa !== false; e.sea(t); e.crabs.update(t); } };
}
