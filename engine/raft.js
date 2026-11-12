// raft.js — BÈ GỖ nổi trên biển của env (thay thuyền chèo). Dựng bằng engine/hull.js (type 'raft': khúc gỗ tròn + xà ngang + dây buộc + cột buồm vải thô)
// và cưỡi đúng sóng shader qua floatPose (engine/floating.js). Hàm thuần của t toàn cục → tất định.
//   const r = createRaft(THREE, e.sea, { x, z, yaw, y, length, beam }); g.add(r.root); r.update(t);
// Cờ bật/tắt: __autoFx.raft (khoá 'raft', nhãn "Bè gỗ"); tắt ⇒ root ẩn (env tự hiện lại vật cũ qua r.on()).
import { createHull } from './hull.js';
import { floatPose, floatTilt } from './floating.js';

export const raftOn = () => globalThis.__autoFx?.raft !== false;

export function createRaft(THREE, sea, o = {}) {
  const { x = 0, z = 0, yaw = 0, y = 0, length = 9, beam = 5.2, seed = 4 } = o;
  const root = createHull(THREE, { type: 'raft', length, beam, seed, id: 'raft', dirt: 0.8, sailColor: '#bfae8a', colors: { top: '#8c7a5c', bottom: '#4d4234', trim: '#a89670' }, mastHeight: length * 0.8 });
  root.position.set(x, y, z);
  const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  const q = new THREE.Quaternion();
  function update(t) {
    const on = raftOn(); root.visible = on;
    if (!on) return false;
    root.quaternion.copy(q0);
    if (sea?.sample && globalThis.__autoFx?.sea2 !== false) {
      const F = floatPose(sea, { x, z, yaw, hx: beam / 2, hz: length / 2, t, draft: 0, pitchK: 0.9, rollK: 0.8, maxPitch: 0.22, maxRoll: 0.28 });
      root.position.y = y + F.dy;
      root.quaternion.premultiply(floatTilt(THREE, F, yaw, 1, q));
    } else root.position.y = y;
    root.userData.animate?.(t, { wind: 0.7 });
    return true;
  }
  update(0);
  return { root, update };
}
