// mastbreak.js — GÃY CỘT BUỒM (thử, người dùng 2026-11-12). Hàm thuần của t toàn cục (tất định).
// Cột buồm Kenney dính liền thân tàu (1 mesh) → không cắt lưới: thân tàu gốc BỎ (discard) vùng cột phía trên điểm gãy,
// bản sao mesh CHỈ GIỮ vùng đó, gắn vào khớp gãy cùng buồm/cờ → khớp xoay đổ nghiêng qua mạn tàu. Mảnh gỗ văng lúc gãy.
// Tắt (MAST.on = 0, post.js FX 'mast') → cột nguyên vẹn như cũ.
//   const mb = createMastBreak(THREE, shipMesh, { hinge: [0, 3.4, -0.35], box: [0.55, 0.62], parts: [sailCloth, flag], t0: 36.7 });
//   mb.update(t)
export const MAST = { on: { value: 1 } };

const VERT = ['#include <common>', '#include <common>\nvarying vec3 vMbP;', '#include <begin_vertex>', '#include <begin_vertex>\nvMbP = position;'];

function cutMat(THREE, base, U, keep) {
  const m = base.clone();
  m.name = (base.name || 'ship') + (keep ? '_mastPiece' : '_mastCut');
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace(VERT[0], VERT[1]).replace(VERT[2], VERT[3]);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vMbP;
uniform float uMbOn; uniform vec3 uMbC; uniform vec2 uMbR;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
{ bool inside = abs(vMbP.x - uMbC.x) < uMbR.x && abs(vMbP.z - uMbC.z) < uMbR.y && vMbP.y > uMbC.y;
  ${keep ? 'if (uMbOn < 0.5 || !inside) discard;' : 'if (uMbOn > 0.5 && inside) discard;'} }`);
  };
  m.customProgramCacheKey = () => 'mast' + (keep ? 'K' : 'C');
  return m;
}

const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

export function createMastBreak(THREE, ship, o = {}) {
  const [hx, hy, hz] = o.hinge || [0, 3.4, -0.35];
  const [rx, rz] = o.box || [0.55, 0.62];
  const t0 = o.t0 ?? 36.7, maxA = o.angle ?? 1.1;
  const U = { uMbOn: MAST.on, uMbC: { value: new THREE.Vector3(hx, hy, hz) }, uMbR: { value: new THREE.Vector2(rx, rz) } };
  const base = ship.material;
  ship.material = cutMat(THREE, base, U, false);
  const pivot = new THREE.Group(); pivot.name = 'mast_pivot'; pivot.position.set(hx, hy, hz); ship.add(pivot);
  const piece = new THREE.Mesh(ship.geometry, cutMat(THREE, base, U, true)); piece.name = 'mast_piece';
  piece.position.set(-hx, -hy, -hz); piece.castShadow = piece.receiveShadow = true; pivot.add(piece);
  for (const p of o.parts || []) { if (!p) continue; pivot.attach(p); }   // buồm, cờ đổ theo cột (giữ nguyên vị trí thế giới lúc dựng)
  // mảnh gỗ văng tại chỗ gãy
  const wood = new THREE.MeshStandardMaterial({ color: '#7a4e2e', roughness: 0.9 });
  const chips = [];
  for (let i = 0; i < 9; i++) {
    const h = (n) => { const s = Math.sin((i + 1) * 91.7 + n * 13.1) * 43758.5; return s - Math.floor(s); };
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.08 + h(1) * 0.12, 0.25 + h(2) * 0.45, 0.08 + h(3) * 0.1), wood);
    c.name = 'mast_chip'; c.castShadow = true; ship.add(c);
    chips.push({ c, v: [(h(4) - 0.3) * 4, 2 + h(5) * 3, (h(6) - 0.5) * 4], w: [h(7) * 14, h(8) * 10, h(9) * 12] });
  }
  const tBreak = t0 + 0.25, tLand = tBreak + 0.55;
  function update(t) {
    const live = MAST.on.value > 0.5;
    piece.visible = live;
    let a = 0, tw = 0;
    if (live && t >= t0) {
      if (t < tBreak) a = 0.035 * Math.sin((t - t0) * 70) * ss(t0, tBreak, t) + 0.03 * ss(t0, tBreak, t);   // rung, nứt, nghiêng nhẹ
      else if (t < tLand) { const s = (t - tBreak) / (tLand - tBreak); a = 0.03 + (maxA - 0.03) * s * s; tw = 0.12 * s; }   // đổ, nhanh dần như rơi
      else { const u = t - tLand; a = maxA - 0.12 * Math.exp(-5 * u) * Math.abs(Math.sin(u * 11)); tw = 0.12; }   // dội lên vài lần rồi nằm tựa mạn
    }
    pivot.rotation.set(0, tw, -a);   // đổ về phía +x (mạn phải)
    for (const ch of chips) {
      const u = t - tBreak, on = live && u > 0 && u < 1.4;
      ch.c.visible = on;
      if (!on) continue;
      ch.c.position.set(hx + ch.v[0] * u, hy + ch.v[1] * u - 4.9 * u * u, hz + ch.v[2] * u);
      ch.c.rotation.set(ch.w[0] * u, ch.w[1] * u, ch.w[2] * u);
    }
  }
  update(0);
  return { update, pivot };
}
