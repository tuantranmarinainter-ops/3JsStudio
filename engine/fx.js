// fx.js — Hiệu ứng tất định: mỗi hạt là hàm thuần của (seed, chỉ số, t). Không cộng dồn theo frame.
//   const snow = fxSnow(THREE, { count: 1500, area: [80, 50, 80] }); scene.add(snow.obj); snow.update(t, center);
import { postcardTexture } from './postcards.js';

const hash = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

function dot(THREE, soft = true) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(soft ? 0.5 : 0.8, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(cv); return t;
}

// Tuyết / bụi lơ lửng / bọt: hạt rơi trong hộp quanh center
export function fxSnow(THREE, { count = 1500, area = [80, 50, 80], speed = 4, drift = 1.5, size = 0.5, color = '#ffffff', seed = 1, wind = [0, 0] } = {}) {
  // 2 lớp kích thước: xa = nhiều hạt nhỏ, gần = ít hạt to mềm. Mọi vị trí = hàm thuần của (seed, i, t).
  const flake = flakeTex(THREE);
  const layers = [
    { n: Math.round(count * 5.2), size: size * 0.75, sp: 0.8, op: 0.85, sd: seed },
    { n: Math.round(count * 2.4), size: size * 1.5, sp: 1.0, op: 0.8, sd: seed + 25 },
    { n: Math.round(count * 1.3), size: size * 3.2, sp: 1.15, op: 0.7, sd: seed + 50 },
  ].map((L) => {
    const geo = new THREE.BufferGeometry(); L.pos = new Float32Array(L.n * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(L.pos, 3));
    const m = new THREE.PointsMaterial({ size: L.size, map: flake, transparent: true, opacity: L.op, depthWrite: false, color, sizeAttenuation: true });
    L.geo = geo; L.obj = new THREE.Points(geo, m); L.obj.frustumCulled = false; return L;
  });
  const obj = new THREE.Group(); obj.name = 'fx_snow'; layers.forEach((L) => obj.add(L.obj));
  return {
    obj,
    update(t, c = [0, 0, 0]) {
      const [ax, ay, az] = area;
      // gió giật: dịch ngang = tích phân của (1 + giật(t)) nên liên tục, không nhảy khi giật đổi
      const w0 = wind[0] || 0.8, wz = wind[1] || 0.2;
      const WK = globalThis.__autoFx?.wind === false ? 0.2 : 1;   // tắt 'gió' → chỉ trôi nhẹ
      const gi = (k) => t * 1.0 + WK * k * (-0.9 * Math.cos(t * 0.6) / 0.6 - 0.35 * Math.cos(t * 1.7 + 1) / 1.7 + 0.6 * Math.sin(t * 0.35 + 2) / 0.35 * 0.5);
      const gs = WK * (0.5 + 0.5 * Math.sin(t * 0.9 + 0.5));   // 0..1 độ giật hiện tại (cho xoáy)
      for (const L of layers) {
        const pos = L.pos, sd = L.sd;
        for (let i = 0; i < L.n; i++) {
          const fall = (hash(i, sd) * ay + t * speed * L.sp * (0.7 + hash(i, sd + 3) * 0.6) * (1 - 0.15 * gs)) % ay;
          const ph = hash(i, sd + 4) * 6.283, swirl = hash(i, sd + 7) > 0.6 ? drift * 2.2 : 0;
          let x = (hash(i, sd + 1) - 0.5) * ax + Math.sin(t * 0.8 + ph) * drift + Math.sin(t * 1.9 + ph * 2) * drift * 0.4 + w0 * gi(1.6) * L.sp + WK * swirl * Math.sin(t * 2.1 + ph * 3) * (0.5 + gs);
          let z = (hash(i, sd + 2) - 0.5) * az + Math.cos(t * 0.7 + ph * 1.3) * drift + wz * t + WK * swirl * Math.cos(t * 1.8 + ph * 2) * (0.5 + gs);
          x = ((x + ax / 2) % ax + ax) % ax - ax / 2; z = ((z + az / 2) % az + az) % az - az / 2;
          pos[i * 3] = c[0] + x; pos[i * 3 + 1] = c[1] + ay - fall; pos[i * 3 + 2] = c[2] + z;
        }
        L.geo.attributes.position.needsUpdate = true;
      }
    },
  };
}

function flakeTex(THREE) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv);
}

// Mưa: đoạn thẳng nghiêng rơi nhanh
export function fxRain(THREE, { count = 1800, area = [90, 60, 90], speed = 55, len = 2.2, slant = [0.25, 0.1], color = '#a9c4e8', seed = 2 } = {}) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(count * 6);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }));
  obj.name = 'fx_rain'; obj.frustumCulled = false;
  return {
    obj,
    update(t, c = [0, 0, 0]) {
      const [ax, ay, az] = area;
      for (let i = 0; i < count; i++) {
        const fall = (hash(i, seed) * ay + t * speed * (0.8 + hash(i, seed + 4) * 0.4)) % ay;
        const y = ay - fall, x = (hash(i, seed + 1) - 0.5) * ax + slant[0] * fall, z = (hash(i, seed + 2) - 0.5) * az + slant[1] * fall;
        pos.set([c[0] + x, c[1] + y, c[2] + z, c[0] + x - slant[0] * len, c[1] + y + len, c[2] + z - slant[1] * len], i * 6);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// Bụi bùng (một lần) tại các điểm, t0 = lúc chạm đất
export function fxDust(THREE, { count = 160, color = '#c9b48a', seed = 5, life = 1.4, spread = 9, rise = 4, size = 2.2 } = {}) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(count * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size, map: dot(THREE), transparent: true, depthWrite: false, color, opacity: 0.8 });
  const obj = new THREE.Points(geo, mat); obj.name = 'fx_dust'; obj.frustumCulled = false;
  return {
    obj,
    // bursts: [{ at:[x,y,z], t0 }]
    update(t, bursts = []) {
      let vis = 0; const per = Math.max(1, Math.floor(count / Math.max(1, bursts.length)));
      for (let i = 0; i < count; i++) {
        const b = bursts[Math.floor(i / per)]; const k = b ? (t - b.t0) / life : -1;
        if (!b || k < 0 || k > 1) { pos[i * 3 + 1] = -999; continue; }
        vis++;
        const a = hash(i, seed) * Math.PI * 2, r = (0.3 + hash(i, seed + 1) * 0.7) * spread * (1 - Math.pow(1 - k, 3));
        pos[i * 3] = b.at[0] + Math.cos(a) * r; pos[i * 3 + 2] = b.at[2] + Math.sin(a) * r;
        pos[i * 3 + 1] = b.at[1] + hash(i, seed + 2) * rise * Math.sin(k * Math.PI * 0.8);
      }
      mat.opacity = 0.75; geo.attributes.position.needsUpdate = true; obj.visible = vis > 0;
    },
  };
}

// Bưu thiếp rơi/tung: InstancedMesh, mỗi tấm bay theo quỹ đạo parabol + xoay; t0 = lúc tung
export function fxCards(THREE, { count = 40, seed = 7, kind = 'island', w = 1.6 } = {}) {
  const geo = new THREE.PlaneGeometry(w, w * 0.7);
  const mat = new THREE.MeshStandardMaterial({ map: postcardTexture(THREE, kind), side: THREE.DoubleSide, roughness: 0.9 });
  const obj = new THREE.InstancedMesh(geo, mat, count); obj.name = 'fx_cards'; obj.castShadow = true; obj.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  return {
    obj,
    update(t, { at = [0, 0, 0], t0 = 0, up = 6, out = 6, ground = 0, flutter = 1 } = {}) {
      const dt = Math.max(0, t - t0);
      for (let i = 0; i < count; i++) {
        const a = hash(i, seed) * Math.PI * 2, sp = out * (0.4 + hash(i, seed + 1) * 0.8), vu = up * (0.5 + hash(i, seed + 2));
        const drag = 1 - Math.exp(-dt * 1.2);
        let y = at[1] + vu * Math.min(dt, 0.6) - 0.5 * 9 * Math.max(0, Math.min(dt, 0.6)) ** 2 - Math.max(0, dt - 0.6) * 2.2;
        y = Math.max(ground + 0.05 + i * 0.002, y);
        p.set(at[0] + Math.cos(a) * sp * drag + Math.sin(dt * 3 + i) * 0.4 * flutter, y, at[2] + Math.sin(a) * sp * drag);
        const landed = y <= ground + 0.06 + i * 0.002;
        e.set(landed ? -Math.PI / 2 : dt * (2 + hash(i, seed + 3) * 4), hash(i, seed + 4) * 6 + (landed ? 0 : dt * 2), landed ? 0 : dt * 3);
        q.setFromEuler(e); m.compose(p, q, s); obj.setMatrixAt(i, m);
      }
      obj.instanceMatrix.needsUpdate = true;
    },
  };
}

// Độ sáng tia chớp tại t: các nháy ngắn có seed (0..1)
export function lightning(t, { every = 3.1, seed = 3 } = {}) {
  const n = Math.floor(t / every), local = t - n * every, at = hash(n, seed) * (every - 0.5);
  const d = local - at; if (d < 0 || d > 0.35) return 0;
  return d < 0.06 ? 1 : d < 0.12 ? 0.3 : d < 0.18 ? 0.8 : Math.max(0, 1 - (d - 0.18) / 0.17) * 0.4;
}

// Tia chớp (đường gấp khúc) — hiển thị khi lightning(t) > 0.5
export function fxBolt(THREE, { seed = 4 } = {}) {
  const pts = []; let x = 0, y = 60; for (let i = 0; i < 14; i++) { pts.push(new THREE.Vector3(x, y, 0)); x += (hash(i, seed) - 0.5) * 8; y -= 4.5; }
  const obj = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#ffffff', fog: false }));
  obj.name = 'fx_bolt'; return obj;
}

// =====================================================================================================================
// Hiệu ứng "tự động" do đạo diễn (engine/shots.js) điều khiển: bụi/tuyết bốc ở chân nhà, hơi thở, dấu chân, gió thổi.
// Mọi thứ là hàm thuần của (sự kiện, t) — sự kiện do shots.js tính tất định từ pha bước của nhà.
// =====================================================================================================================
const PUFF_KINDS = {
  sand:   { color: '#e6d3a2', life: 1.3, spread: 9, rise: 4, size: 10, op: 0.85 },
  dirt:   { color: '#a69272', life: 1.25, spread: 8.5, rise: 3.8, size: 9.5, op: 0.8 },
  grass:  { color: '#b4bd96', life: 1.2, spread: 8, rise: 3.5, size: 9, op: 0.75 },
  snow:   { color: '#f8fbff', life: 1.7, spread: 10.5, rise: 6, size: 11, op: 0.95 },
  breath: { color: '#eaf3ff', life: 1.7, spread: 1.6, rise: 0.9, size: 0.85, op: 0.6, cone: true },
};

export function fxPuffs(THREE, { maxEvents = 36, per = 22, seed = 11 } = {}) {
  const N = maxEvents * per;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), aA = new Float32Array(N), aS = new Float32Array(N), aC = new Float32Array(N * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(aA, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: dot(THREE) }, uScale: { value: 960 } },
    vertexShader: 'attribute float aAlpha; attribute float aSize; attribute vec3 aColor; uniform float uScale; varying float vA; varying vec3 vC; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(0.0, aSize * uScale / -mv.z); vA = aAlpha; vC = aColor; }',
    fragmentShader: 'uniform sampler2D map; varying float vA; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false,
  });
  const obj = new THREE.Points(geo, mat); obj.name = 'fx_puffs'; obj.frustumCulled = false; obj.renderOrder = 5;
  const col = new THREE.Color();
  return {
    obj,
    // events: [{ at:[x,y,z], t0, kind, dir?:[x,y,z] }]; scale = renderer.height/2; light = hệ số sáng (đêm < 1)
    update(t, events = [], { scale = 960, light = 1 } = {}) {
      mat.uniforms.uScale.value = scale;
      const ev = events.length > maxEvents ? events.slice(events.length - maxEvents) : events;
      let vis = 0;
      for (let e = 0; e < maxEvents; e++) {
        const E = ev[e], K = E && PUFF_KINDS[E.kind || 'dirt'];
        const age = E ? t - E.t0 : -1, k = E ? age / K.life : -1;
        const live = !!E && k >= 0 && k <= 1;
        let cr = 1, cg = 1, cb = 1;
        if (live) { col.set(K.color); cr = col.r * light; cg = col.g * light; cb = col.b * light; vis++; }
        for (let j = 0; j < per; j++) {
          const i = e * per + j, s = seed + (e * 13) % 7;
          if (!live) { aA[i] = 0; aS[i] = 0; pos[i * 3 + 1] = -999; continue; }
          const h0 = hash(j, s), h1 = hash(j, s + 1), h2 = hash(j, s + 2), h3 = hash(j, s + 3);
          const eo = 1 - Math.pow(1 - k, 3);
          if (K.cone) {
            const d = E.dir || [0, 0, 1], r = K.spread * eo * (0.45 + h0 * 0.7);
            pos[i * 3] = E.at[0] + d[0] * r + (h1 - 0.5) * 0.5 * eo;
            pos[i * 3 + 1] = E.at[1] + d[1] * r + K.rise * k * (0.3 + h2) + (h3 - 0.5) * 0.3;
            pos[i * 3 + 2] = E.at[2] + d[2] * r + (h2 - 0.5) * 0.5 * eo;
          } else {
            const a = h0 * Math.PI * 2, r = (0.25 + h1 * 0.75) * K.spread * eo;
            pos[i * 3] = E.at[0] + Math.cos(a) * r; pos[i * 3 + 2] = E.at[2] + Math.sin(a) * r;
            pos[i * 3 + 1] = E.at[1] + 0.5 + h2 * K.rise * Math.sin(Math.min(1, k * 1.15) * Math.PI * 0.75) + k * 1.2;
          }
          aS[i] = K.size * (0.45 + 0.9 * k) * (0.6 + h3 * 0.8);
          aA[i] = K.op * Math.pow(1 - k, 1.4) * Math.min(1, age / 0.05);
          aC[i * 3] = cr; aC[i * 3 + 1] = cg; aC[i * 3 + 2] = cb;
        }
      }
      for (const a of ['position', 'aAlpha', 'aSize', 'aColor']) geo.attributes[a].needsUpdate = true;
      obj.visible = vis > 0;
    },
  };
}

// Dấu chân lõm trên tuyết/đất: mọc ra trong 0.12s tại t0 rồi ở lại. events: [{ at:[x,y,z], yaw, t0 }]
export function fxPrints(THREE, { max = 96, size = 8, color = '#7d8fb4', opacity = 0.8 } = {}) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(64, 50, 34, 30, 0, 0, Math.PI * 2); g.fill();                      // gót tròn
  for (const a of [-0.55, 0, 0.55]) { g.save(); g.translate(64 + Math.sin(a) * 46, 66 + Math.cos(a) * 30); g.rotate(-a); g.beginPath(); g.ellipse(0, 12, 7, 17, 0, 0, Math.PI * 2); g.fill(); g.restore(); }   // 3 móng (+Z cục bộ = đáy ảnh)
  const am = new THREE.CanvasTexture(cv);
  const geo = new THREE.PlaneGeometry(size, size); geo.rotateX(-Math.PI / 2);
  const m = new THREE.MeshStandardMaterial({ color, alphaMap: am, transparent: true, opacity, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const obj = new THREE.InstancedMesh(geo, m, max); obj.name = 'fx_prints'; obj.frustumCulled = false; obj.receiveShadow = true; obj.renderOrder = 2;
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  return {
    obj,
    update(t, events = [], { y = 0.08, tint = color } = {}) {
      m.color.set(tint);
      const ev = events.length > max ? events.slice(events.length - max) : events;
      let n = 0;
      for (const E of ev) {
        const k = (t - E.t0) / 0.12; if (k < 0) continue;
        const sc = 0.55 + 0.45 * Math.min(1, k);
        q.setFromAxisAngle(up, E.yaw); p.set(E.at[0], (E.at[1] || 0) + y, E.at[2]); s.set(sc, 1, sc);
        mx.compose(p, q, s); obj.setMatrixAt(n++, mx);
      }
      obj.count = n; obj.instanceMatrix.needsUpdate = true; obj.visible = n > 0;
    },
  };
}

// fxWind: ĐÃ BỎ hiệu ứng vệt gió (người dùng chốt). Giữ API để code cũ không lỗi; không vẽ gì.
// "Gió" nay = bông tuyết rơi của fxSnow trôi ngang theo cơn giật (bật/tắt qua globalThis.__autoFx.wind).
export function fxWind(THREE) {
  const obj = new THREE.Group(); obj.name = 'fx_wind'; obj.visible = false;
  return { obj, gustAt: (t) => 0.3 + 0.7 * (Math.sin(t * 0.9) * 0.5 + 0.5), update() { obj.visible = false; } };
}
