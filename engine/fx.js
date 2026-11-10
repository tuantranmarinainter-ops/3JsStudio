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
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(count * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size, map: dot(THREE), transparent: true, depthWrite: false, color, sizeAttenuation: true });
  const obj = new THREE.Points(geo, mat); obj.name = 'fx_snow'; obj.frustumCulled = false;
  return {
    obj,
    update(t, c = [0, 0, 0]) {
      const [ax, ay, az] = area;
      for (let i = 0; i < count; i++) {
        const fall = (hash(i, seed) * ay + t * speed * (0.7 + hash(i, seed + 3) * 0.6)) % ay;
        let x = (hash(i, seed + 1) - 0.5) * ax + Math.sin(t * 0.8 + i) * drift + wind[0] * t;
        let z = (hash(i, seed + 2) - 0.5) * az + Math.cos(t * 0.7 + i * 1.3) * drift + wind[1] * t;
        x = ((x + ax / 2) % ax + ax) % ax - ax / 2; z = ((z + az / 2) % az + az) % az - az / 2;
        pos[i * 3] = c[0] + x; pos[i * 3 + 1] = c[1] + ay - fall; pos[i * 3 + 2] = c[2] + z;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
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
