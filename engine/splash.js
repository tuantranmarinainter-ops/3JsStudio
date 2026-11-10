// splash.js — hiệu ứng nước văng khi vật thể xuyên qua mặt nước (cá voi nhảy lên / rơi xuống).
// Tất định: mọi thứ là hàm thuần của t (thời gian của clip/shot), ngẫu nhiên có seed.
//
// Dùng:
//   import { findSurfaceCrossings, createSplash } from './splash.js';
//   const events = findSurfaceCrossings(THREE, whaleRoot, mixer, clip, waterY);   // tính 1 lần sau khi tải
//   const splash = createSplash(THREE, { seed: 3, scale: 16 });                    // scale ≈ chiều dài con vật (m)
//   scene.add(splash.object); splash.setEvents(events);
//   // trong render(t):  mixer.setTime(t); splash.update(t);
//   // clip lặp:         splash.update(t, clip.duration)  → hiệu ứng nối mượt qua điểm lặp
//
// events: [{ time, x, y, z, dir: 'up'|'down', speed }]  (toạ độ world; speed = m/s theo phương đứng)

function rng(seed = 1) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Lấy mẫu clip, tìm lúc tâm khung xương (trung bình vị trí các bone) cắt mặt nước y = waterY.
// Không có bone thì dùng tâm bounding box. Trả về các lần cắt, có hướng và vận tốc.
export function findSurfaceCrossings(THREE, root, mixer, clip, waterY, { samples = 180 } = {}) {
  const bones = [];
  root.traverse((o) => { if (o.isBone) bones.push(o); });
  const action = mixer.clipAction(clip);
  const prevWeight = action.getEffectiveWeight();
  mixer.stopAllAction();
  action.reset().play();
  const v = new THREE.Vector3(), box = new THREE.Box3();
  const probe = (t) => {
    mixer.setTime(t);
    root.updateMatrixWorld(true);
    if (!bones.length) return box.setFromObject(root).getCenter(v.set(0, 0, 0)).clone();
    const c = new THREE.Vector3();
    for (const b of bones) c.add(b.getWorldPosition(v));
    return c.multiplyScalar(1 / bones.length);
  };
  const dt = clip.duration / samples;
  const out = [];
  let prev = probe(0);
  for (let i = 1; i <= samples; i++) {
    const t = i * dt;
    const cur = probe(t);
    const a = prev.y - waterY, b = cur.y - waterY;
    if ((a < 0) !== (b < 0)) {
      const k = a / (a - b);
      const p = prev.clone().lerp(cur, k);
      out.push({ time: t - dt + k * dt, x: p.x, y: waterY, z: p.z, dir: b > a ? 'up' : 'down', speed: Math.abs(b - a) / dt });
    }
    prev = cur;
  }
  mixer.setTime(0);
  if (prevWeight === 0) action.stop();
  return out;
}

const MAX_EVENTS = 6;

// scale: kích thước con vật (m) → độ cao/độ rộng tia nước. strength nhân thêm theo vận tốc cắt mặt nước.
export function createSplash(THREE, opts = {}) {
  const o = { seed: 7, scale: 10, drops: 2600, mist: 260, life: 2.6, gravity: 9.8, color: '#f4fbff', ...opts };
  const r = rng(o.seed);
  const group = new THREE.Group();
  group.name = 'splash';

  const uEvt = Array.from({ length: MAX_EVENTS }, () => new THREE.Vector4(0, -1e5, 0, -1e5)); // xyz + time
  const uPow = Array.from({ length: MAX_EVENTS }, () => new THREE.Vector2(0, 0));              // strength, dir(1 up,-1 down)
  const common = {
    uTime: { value: 0 }, uLoop: { value: 0 }, uEvt: { value: uEvt }, uPow: { value: uPow },
    uScale: { value: o.scale }, uGrav: { value: o.gravity }, uLife: { value: o.life },
    uPx: { value: 1000 }, uColor: { value: new THREE.Color(o.color) },
  };

  // Mỗi hạt thuộc 1 event (theo chỉ số), vận tốc + kích thước ngẫu nhiên có seed
  const makePoints = (count, kind) => {
    const ev = new Float32Array(count), vel = new Float32Array(count * 3), rnd = new Float32Array(count * 2), off = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      ev[i] = i % MAX_EVENTS;
      const ang = r() * Math.PI * 2;
      const spread = kind === 0 ? 0.25 + r() * 0.75 : 0.6 + r() * 0.8; // tia: thiên về phía trên
      const up = kind === 0 ? 0.55 + r() * 0.75 : 0.15 + r() * 0.35;
      vel[i * 3] = Math.cos(ang) * spread;
      vel[i * 3 + 1] = up;
      vel[i * 3 + 2] = Math.sin(ang) * spread;
      rnd[i * 2] = 0.4 + r() * 0.9;  // kích thước
      rnd[i * 2 + 1] = 0.55 + r() * 0.45; // tỷ lệ thời gian sống
      // điểm bắn ra rải trên một đĩa (thân con vật lớn chạm nước trên cả một vùng)
      const ra = Math.sqrt(r()), aa = r() * Math.PI * 2;
      off[i * 2] = Math.cos(aa) * ra; off[i * 2 + 1] = Math.sin(aa) * ra;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aEv', new THREE.BufferAttribute(ev, 1));
    g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 2));
    g.setAttribute('aOff', new THREE.BufferAttribute(off, 2));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { ...common, uKind: { value: kind } },
      vertexShader: /* glsl */`
        #define N ${MAX_EVENTS}
        attribute float aEv; attribute vec3 aVel; attribute vec2 aRnd; attribute vec2 aOff;
        uniform float uTime, uLoop, uScale, uGrav, uLife, uPx, uKind;
        uniform vec4 uEvt[N]; uniform vec2 uPow[N];
        varying float vA;
        void main() {
          int e = int(aEv + 0.5);
          vec4 ev = uEvt[0]; vec2 pw = uPow[0];
          for (int i = 0; i < N; i++) if (i == e) { ev = uEvt[i]; pw = uPow[i]; }
          float tau = uTime - ev.w;
          if (uLoop > 0.0 && tau < 0.0) tau += uLoop;      // clip lặp: hiệu ứng tràn qua điểm lặp
          float life = uLife * aRnd.y * (uKind > 0.5 ? 1.4 : 1.0);
          vA = 0.0;
          vec3 p = vec3(0.0, -1e5, 0.0);
          if (tau > 0.0 && tau < life && pw.x > 0.0) {
            // vào nước (down) → vương miện rộng, cao; ra khỏi nước (up) → màn nước bám theo thân
            float h = sqrt(uScale) * 3.0 * pw.x * (pw.y < 0.0 ? 1.0 : 0.7);
            vec3 v = aVel * vec3(h * 0.75, h * 1.9, h * 0.75);
            if (uKind > 0.5) v *= vec3(0.9, 0.35, 0.9);     // sương: thấp, loang rộng, chậm
            float drag = uKind > 0.5 ? 1.6 : 0.15;
            float tt = (1.0 - exp(-drag * tau)) / drag;     // cản không khí
            p = ev.xyz + vec3(aOff.x * uScale * 0.22, uScale * 0.02, aOff.y * uScale * 0.12) + v * tt;
            p.y -= 0.5 * uGrav * (uKind > 0.5 ? 0.15 : 1.0) * tau * tau;
            float k = tau / life;
            vA = (1.0 - k) * smoothstep(0.0, 0.06, tau) * step(ev.y - 0.05, p.y);
          }
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float s = (uKind > 0.5 ? 0.2 : 0.03) * uScale * aRnd.x;
          gl_PointSize = s * uPx / max(-mv.z, 0.1);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor; uniform float uKind;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = (uKind > 0.5 ? smoothstep(0.5, 0.0, d) * 0.5 : smoothstep(0.5, 0.25, d)) * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.name = kind === 0 ? 'splash_drops' : 'splash_mist';
    return pts;
  };
  const drops = makePoints(o.drops, 0);
  const mist = makePoints(o.mist, 1);
  group.add(drops, mist);

  // Vòng bọt loang trên mặt nước, 1 vòng / event
  const ringGeo = new THREE.RingGeometry(0.82, 1, 64);
  ringGeo.rotateX(-Math.PI / 2);
  const rings = uEvt.map((_, i) => {
    const m = new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, m);
    ring.name = `splash_ring_${i}`;
    ring.visible = false;
    group.add(ring);
    return ring;
  });
  const foamGeo = new THREE.CircleGeometry(1, 48);
  foamGeo.rotateX(-Math.PI / 2);
  const foams = uEvt.map((_, i) => {
    const m = new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0, depthWrite: false });
    const f = new THREE.Mesh(foamGeo, m);
    f.name = `splash_foam_${i}`;
    f.visible = false;
    group.add(f);
    return f;
  });

  let events = [];
  return {
    object: group,
    events: () => events,
    setEvents(list, { minSpeed = 0.5 } = {}) {
      events = list.filter((e) => e.speed >= minSpeed).slice(0, MAX_EVENTS);
      const maxV = Math.max(1e-3, ...events.map((e) => e.speed));
      uEvt.forEach((v, i) => {
        const e = events[i];
        if (!e) { v.set(0, -1e5, 0, -1e5); uPow[i].set(0, 0); return; }
        v.set(e.x, e.y, e.z, e.time);
        uPow[i].set(0.55 + 0.45 * (e.speed / maxV), e.dir === 'up' ? 1 : -1);
      });
    },
    // t: thời gian clip/shot; loop: độ dài clip nếu clip lặp (0 = không lặp); px: chiều cao canvas (pixel)
    update(t, loop = 0, px) {
      common.uTime.value = t;
      common.uLoop.value = loop;
      if (px) common.uPx.value = px;
      events.forEach((e, i) => {
        let tau = t - e.time;
        if (loop > 0 && tau < 0) tau += loop;
        const life = o.life * 1.5;
        const on = tau > 0 && tau < life;
        const k = tau / life;
        const ring = rings[i], foam = foams[i];
        ring.visible = foam.visible = on;
        if (!on) return;
        const R = o.scale * (0.2 + 0.7 * (1 - Math.exp(-2.2 * tau)));
        ring.position.set(e.x, e.y + 0.02, e.z);
        ring.scale.setScalar(R);
        ring.material.opacity = 0.75 * (1 - k);
        foam.position.set(e.x, e.y + 0.015, e.z);
        foam.scale.setScalar(R * 0.85);
        foam.material.opacity = 0.45 * (1 - k) * (1 - k);
      });
    },
  };
}
