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
// events: [{ time, x, y, z, dir: 'up'|'down', speed }]  (toạ độ của nhóm splash; speed = đơn vị/s theo phương đứng)
//
// Đơn vị: toạ độ CỤC BỘ của splash.object — đặt nó trong 1 rig có scale (vd. stud/m) thì mọi số dưới đây là mét.
//   scale ≈ chiều dài con vật; gravity theo cùng đơn vị. Thời gian: t truyền vào update() (cùng hệ với events[].time,
//   vd. giây trong clip). opts: { seed, scale, drops, mist, life, gravity, color, linger (đời sương đọng, giây của t), lingerN }.
// sea2 (globalThis.__autoFx.sea2, mặc định bật): thêm vương miện/màn nước (ống hở xé ngón, loe rồi sụp; 'down' cao hơn 'up'),
//   màn sương hạt mịn đọng ~linger giây, và bỏ đĩa bọt/vòng phẳng (mặt biển water.js setEvents tự vẽ bọt + vòng sóng theo sóng).
//   Sea2 tắt ⇒ y hệt bản cũ. Muốn có sự kiện cho mặt biển: whales.js breachEvents(findSurfaceCrossings(...), {...}).

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
const smoothstep01 = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// scale: kích thước con vật (m) → độ cao/độ rộng tia nước. strength nhân thêm theo vận tốc cắt mặt nước.
export function createSplash(THREE, opts = {}) {
  // linger = đời màn sương đọng (giây của t truyền vào update); crown = vương miện/màn nước khi rơi xuống (chỉ khi sea2 bật)
  const o = { seed: 7, scale: 10, drops: 2600, mist: 260, linger: 4.6, lingerN: 900, life: 2.6, gravity: 9.8, color: '#f4fbff', ...opts };
  const r = rng(o.seed);
  const group = new THREE.Group();
  group.name = 'splash';

  const uEvt = Array.from({ length: MAX_EVENTS }, () => new THREE.Vector4(0, -1e5, 0, -1e5)); // xyz + time
  const uPow = Array.from({ length: MAX_EVENTS }, () => new THREE.Vector2(0, 0));              // strength, dir(1 up,-1 down)
  const common = {
    uTime: { value: 0 }, uLoop: { value: 0 }, uEvt: { value: uEvt }, uPow: { value: uPow },
    uScale: { value: o.scale }, uGrav: { value: o.gravity }, uLife: { value: o.life },
    uPx: { value: 1000 }, uColor: { value: new THREE.Color(o.color) }, uLinger: { value: o.linger },
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
        uniform float uTime, uLoop, uScale, uGrav, uLife, uPx, uKind, uLinger;
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
          float sz2 = 1.0;
          if (uKind > 1.5) {
            // sea2: màn sương hạt mịn đọng lại sau cú đập — bốc chậm, trôi theo gió, nở to, mờ dần (~uLinger)
            life = uLinger * (0.55 + 0.45 * aRnd.y);
            if (tau > 0.0 && tau < life && pw.x > 0.0) {
              float k = tau / life, big = pw.y < 0.0 ? 1.0 : 0.5;
              float rr = uScale * (0.18 + 0.32 * (1.0 - exp(-1.5 * tau))) * (0.6 + 0.4 * big);
              p = ev.xyz + vec3(aOff.x * rr, 0.0, aOff.y * rr)
                + vec3(0.9, 0.0, 0.35) * uScale * 0.05 * tau                          // gió nhẹ
                + vec3(0.0, uScale * (0.05 + 0.22 * aVel.y) * pow(tau, 0.6) * big, 0.0);
              sz2 = 0.6 + 1.4 * k;
              vA = 0.16 * big * pw.x * pow(1.0 - k, 1.4) * smoothstep(0.0, 0.5, tau);
            }
          } else
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
          float s = (uKind > 1.5 ? 0.3 * sz2 : uKind > 0.5 ? 0.2 : 0.03) * uScale * aRnd.x;
          gl_PointSize = s * uPx / max(-mv.z, 0.1);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor; uniform float uKind;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = (uKind > 1.5 ? smoothstep(0.5, 0.0, d) * smoothstep(0.5, 0.0, d) : uKind > 0.5 ? smoothstep(0.5, 0.0, d) * 0.5 : smoothstep(0.5, 0.25, d)) * vA;
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
  // sea2: sương đọng + vương miện nước (tạo sau drops/mist để dãy rng của chúng không đổi → bản sea2 tắt y hệt cũ)
  const linger = makePoints(o.lingerN, 2);
  linger.name = 'splash_linger_mist';
  group.add(linger);

  // --- sea2: vương miện / màn nước (ống hở, mép trên xé thành ngón, loe ra rồi sụp) — 1 ống / event ---
  const crownGeo = new THREE.CylinderGeometry(1, 1, 1, 96, 12, true);
  crownGeo.translate(0, 0.5, 0);   // y: 0 (mặt nước) → 1 (mép trên)
  const crowns = uEvt.map((_, i) => {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTau: { value: 0 }, uLifeC: { value: 1.6 }, uR: { value: 1 }, uH: { value: 1 }, uFlare: { value: 0.6 }, uSeed: { value: i * 1.37 + o.seed }, uColor: common.uColor, uA: { value: 0.8 } },
      vertexShader: /* glsl */`
        uniform float uTau, uLifeC, uR, uH, uFlare, uSeed;
        varying vec2 vUv; varying float vShade;
        float wav(float a, float s){ return 0.5 + 0.5*(sin(a*7.0 + s)*0.5 + sin(a*13.0 + s*2.3)*0.3 + sin(a*29.0 + s*4.1)*0.2); }
        void main(){
          vUv = uv;
          float a = uv.x * 6.2831853, v = position.y;
          float k = clamp(uTau / uLifeC, 0.0, 1.0);
          float jag = wav(a, uSeed);
          float r = uR * (1.0 + uFlare * v * v * (0.6 + 0.8 * k)) * (0.92 + 0.16 * jag);   // mép trên loe ra, sau đó đổ ra ngoài
          float h = uH * v * (0.75 + 0.5 * wav(a, uSeed + 3.0));
          h -= uH * 0.55 * k * k * v * v;                                                     // sụp xuống theo thời gian
          vec3 p = vec3(cos(a) * r, max(h, 0.0), sin(a) * r);
          vShade = 0.75 + 0.25 * cos(a - 0.8);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform float uTau, uLifeC, uSeed, uA; uniform vec3 uColor;
        varying vec2 vUv; varying float vShade;
        float wav(float a, float s){ return 0.5 + 0.5*(sin(a*7.0 + s)*0.5 + sin(a*13.0 + s*2.3)*0.3 + sin(a*29.0 + s*4.1)*0.2); }
        void main(){
          float a = vUv.x * 6.2831853, v = vUv.y;
          float k = clamp(uTau / uLifeC, 0.0, 1.0);
          float cut = 0.45 + 0.5 * wav(a * 2.0, uSeed + 7.0);                                 // ngón nước ở mép
          float fing = 1.0 - smoothstep(cut - 0.18, cut, v + 0.25 * k);
          float n1 = wav(a * 3.0 + v * 1.7, uSeed + 11.0), n2 = wav(a * 11.0 - v * 4.3 + n1 * 2.0, uSeed + 5.0);
          float dens = mix(1.0, 0.6, v) * (0.65 + 0.35 * n1);                                  // dày ở chân, mỏng lên mép
          float holes = smoothstep(0.18 + 0.55 * k, 0.42 + 0.5 * k, n2 * 0.55 + n1 * 0.45);       // vỡ thành ren theo thời gian
          float al = uA * fing * dens * holes * pow(1.0 - k, 1.3) * smoothstep(0.0, 0.06, uTau) * smoothstep(0.0, 0.08, v + 0.02);
          if (al < 0.01) discard;
          gl_FragColor = vec4(uColor * (0.92 + 0.08 * vShade) * (0.96 + 0.08 * v), al);
        }`,
    });
    const c = new THREE.Mesh(crownGeo, m);
    c.name = `splash_crown_${i}`; c.visible = false; c.frustumCulled = false; c.renderOrder = 4;
    group.add(c);
    return c;
  });

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

  // --- Gợn sóng tròn tính bằng công thức (không mô phỏng): đặt chồng lên mọi mặt biển ---
  const RIP_LIFE = o.life * 2.2;
  const ripUni = {
    uTime: common.uTime, uLoop: common.uLoop, uEvt: common.uEvt, uPow: common.uPow,
    uSpeed: { value: Math.sqrt(o.scale) * 1.7 }, uLife: { value: RIP_LIFE }, uScale: common.uScale, uColor: common.uColor,
    uRipK: { value: 1 },      // sea2: mặt biển tự vẽ vòng sóng thật → gợn phẳng này mờ bớt
    uRipM: { value: null },   // ma trận cục bộ của mesh gợn sóng → toạ độ của nhóm splash (cùng hệ với events)
  };
  const ripples = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: ripUni,
      vertexShader: /* glsl */`
        uniform mat4 uRipM;
        varying vec3 vW;
        // vW trong hệ toạ độ của nhóm splash (events cũng ở hệ đó) → nhóm được dời/xoay/scale vẫn đúng
        void main() { vW = (uRipM * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        #define N ${MAX_EVENTS}
        uniform float uTime, uLoop, uSpeed, uLife, uScale, uRipK; uniform vec4 uEvt[N]; uniform vec2 uPow[N]; uniform vec3 uColor;
        varying vec3 vW;
        void main() {
          float a = 0.0;
          for (int i = 0; i < N; i++) {
            float tau = uTime - uEvt[i].w;
            if (uLoop > 0.0 && tau < 0.0) tau += uLoop;
            if (tau <= 0.0 || tau > uLife || uPow[i].x <= 0.0) continue;
            float r = distance(vW.xz, uEvt[i].xz);
            float R = uSpeed * tau + uScale * 0.25;      // mép sóng ngoài cùng
            float d = R - r;                              // > 0: phía trong mép sóng
            if (d < -0.5) continue;
            float k = 6.2831 / (uScale * 0.09 + tau * 0.6); // bước sóng dãn ra theo thời gian
            float wave = sin(d * k) * exp(-max(d, 0.0) / (uScale * 0.35)) * smoothstep(-0.5, 0.3, d);
            a += max(wave, 0.0) * uPow[i].x * (1.0 - tau / uLife) * (uPow[i].y < 0.0 ? 1.0 : 0.6);
          }
          a = min(a, 1.0) * 0.85 * uRipK;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    }),
  );
  ripUni.uRipM.value = ripples.matrix;
  ripples.name = 'splash_ripples';
  ripples.frustumCulled = false;
  ripples.visible = false;
  group.add(ripples);

  // --- Tia nước flipbook: 16 khung vẽ bằng code (có seed) → sprite luôn quay về camera ---
  const FRAMES = 16, COLS = 4, CELL = 256, BASE = 32;
  const atlas = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = CELL * COLS;
    const g = cv.getContext('2d');
    const rr = rng(o.seed * 31 + 7);
    const jets = Array.from({ length: 22 }, () => ({ ang: (rr() - 0.5) * 2.3, len: 0.45 + rr() * 0.55, w: 3 + rr() * 7, x: (rr() - 0.5) * 0.5, drops: 2 + Math.floor(rr() * 4), dseed: rr() }));
    for (let f = 0; f < FRAMES; f++) {
      const ox = (f % COLS) * CELL, oy = Math.floor(f / COLS) * CELL;
      const k = f / (FRAMES - 1);
      const rise = Math.sin(Math.min(k * 1.6, 1) * Math.PI / 2);   // tia vươn lên
      const fall = Math.max(0, k - 0.45) / 0.55;                    // vỡ thành giọt rồi rơi
      const fade = 1 - Math.pow(k, 1.6);
      g.save();
      g.beginPath(); g.rect(ox + 1, oy + 1, CELL - 2, CELL - 2); g.clip(); // không lấn sang khung bên cạnh
      g.translate(ox + CELL / 2, oy + CELL - BASE);
      g.lineCap = 'round';
      for (const j of jets) {
        const L = CELL * 0.78 * j.len * rise * (1 - fall * 0.6);
        const bx = j.x * CELL * (0.6 + k * 0.6);
        const tx = bx + Math.sin(j.ang) * L, ty = -Math.cos(j.ang) * L * (1 - fall * 0.5) + fall * fall * CELL * 0.35;
        const grad = g.createLinearGradient(bx, 0, tx, ty);
        grad.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`);
        grad.addColorStop(1, `rgba(235,248,255,${0.2 * fade})`);
        g.strokeStyle = grad;
        g.lineWidth = j.w * (1 - fall * 0.7);
        if (fall < 0.9) { g.beginPath(); g.moveTo(bx, 0); g.quadraticCurveTo((bx + tx) / 2, ty * 0.75, tx, ty); g.stroke(); }
        g.fillStyle = `rgba(255,255,255,${0.9 * fade})`;
        for (let d = 0; d < j.drops; d++) {
          const s = (d + 1) / (j.drops + 1);
          const dx = tx + Math.sin(j.ang + d) * 6 * (1 + fall * 4) * (j.dseed + 0.5);
          const dy = ty - s * 14 * rise + fall * fall * CELL * 0.4 * s;
          g.beginPath(); g.arc(dx, dy, Math.max(0.8, j.w * 0.35 * (1 - s * 0.5)), 0, Math.PI * 2); g.fill();
        }
      }
      // bọt chân tia
      const fg = g.createRadialGradient(0, 0, 4, 0, 0, CELL * 0.45);
      fg.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
      fg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = fg;
      g.beginPath(); g.ellipse(0, 0, CELL * 0.45 * (0.5 + k * 0.5), CELL * 0.08, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const sheets = uEvt.map((_, i) => {
    const map = atlas.clone();
    map.repeat.set(1 / COLS, 1 / COLS);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: true, toneMapped: false }));
    sp.center.set(0.5, BASE / CELL);
    sp.name = `splash_sheet_${i}`;
    sp.visible = false;
    group.add(sp);
    return sp;
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
      const sea2 = globalThis.__autoFx?.sea2 ?? true;
      linger.visible = sea2;
      ripUni.uRipK.value = sea2 ? 0.35 : 1;
      ripples.visible = events.length > 0;
      if (ripples.visible) {
        const cx = events.reduce((s, e) => s + e.x, 0) / events.length, cz = events.reduce((s, e) => s + e.z, 0) / events.length;
        ripples.position.set(cx, events[0].y + 0.03, cz);
        ripples.scale.setScalar(o.scale * 14);
      }
      events.forEach((e, i) => {
        let tau = t - e.time;
        if (loop > 0 && tau < 0) tau += loop;
        // flipbook: chọn khung theo tau
        const sheet = sheets[i], sLife = o.life * 0.9;
        sheet.visible = tau > 0 && tau < sLife;
        if (sheet.visible) {
          const f = Math.min(FRAMES - 1, Math.floor((tau / sLife) * FRAMES));
          sheet.material.map.offset.set((f % COLS) / COLS, 1 - (Math.floor(f / COLS) + 1) / COLS);
          const sz = o.scale * (e.dir === 'down' ? 1.15 : 0.8) * uPow[i].x;
          sheet.scale.set(sz, sz, 1);
          sheet.position.set(e.x, e.y, e.z);
        }
        // sea2: vương miện nước — rơi xuống: cao + rộng; lên: màn thấp bám thân
        const crown = crowns[i], down = e.dir === 'down', cl = down ? 1.7 : 1.1;
        crown.visible = sea2 && tau > 0 && tau < cl;
        if (crown.visible) {
          const cu = crown.material.uniforms, sc = o.scale * uPow[i].x;
          cu.uTau.value = tau; cu.uLifeC.value = cl;
          cu.uR.value = sc * (down ? 0.2 : 0.12) * (1 + (down ? 1.3 : 0.6) * (1 - Math.exp(-2.4 * tau)));
          cu.uH.value = sc * (down ? 0.62 : 0.28) * Math.pow(Math.sin(Math.PI * Math.min(tau / (cl * 0.75), 1) * 0.5 + 0.0001), 0.6);
          cu.uFlare.value = down ? 0.9 : 0.35; cu.uA.value = down ? 0.95 : 0.6;
          crown.position.set(e.x, e.y, e.z);
        }
        const life = o.life * 1.5;
        const on = tau > 0 && tau < life;
        const fk = sea2 ? 0.55 * (1 - smoothstep01(0.4, 1.4, tau)) : 1;   // sea2: bọt/vòng thật do mặt biển (water.js) vẽ → đĩa phẳng chỉ còn lúc đầu
        const k = tau / life;
        const ring = rings[i], foam = foams[i];
        ring.visible = foam.visible = on;
        if (!on) return;
        const R = o.scale * (0.2 + 0.7 * (1 - Math.exp(-2.2 * tau)));
        ring.position.set(e.x, e.y + 0.02, e.z);
        ring.scale.setScalar(R);
        ring.material.opacity = 0.75 * (1 - k) * fk;
        foam.position.set(e.x, e.y + 0.015, e.z);
        foam.scale.setScalar(R * 0.85);
        foam.material.opacity = 0.45 * (1 - k) * (1 - k) * fk;
      });
    },
  };
}
