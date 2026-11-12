// Bối cảnh 'sea' — BIỂN CHUNG cho mọi tập: chỉ có mặt nước + mưa + chớp, toàn bộ nhìn/ánh sáng lấy từ thời tiết
//   (engine/seaweather.js). Shot: { env: 'sea', seaWeather: 'giong' } hoặc { from: 'nang', to: 'bao' }; không ghi ⇒ 'nang'.
//   Bộ sóng 'deep' (bước sóng 70 → 5 stud); amp của preset là biên độ tuyệt đối (createWater amp = 1).
//   Đảo, đá, tàu… thêm bằng props/house của shot (float: {...} để nổi) — không cần sửa file này.
import { fxRain, fxBolt } from '../fx.js';
import { floatPose } from '../floating.js';

export default function build(g, e, H) {
  const { THREE, makeSea, ganTang, hash, mat } = H;
  e.sea = makeSea(g, { preset: 'deep', y: 0, amp: 1, size: 1600, name: 'open_sea' });
  ganTang(e.sea.water.mesh, 'front');   // tầng trước: mặt nước (nhìn rõ nhất, sát camera)
  e.defaultWeather = 'nang';
  e.rain = fxRain(THREE, { count: 2400, area: [80, 55, 80] }); e.rain.obj.name = 'open_sea_rain'; g.add(e.rain.obj);
  e.bolt = fxBolt(THREE, { seed: 6 }); e.bolt.name = 'open_sea_bolt'; e.bolt.position.set(-40, 22, -170); e.bolt.scale.setScalar(2); g.add(e.bolt);
  // --- 3 tầng (docs/boi-canh-tang.md): vật NHỎ dựng bằng code, tất định. Ô FX seaDecor (engine/post.js) ẩn/hiện cả nhóm, đổi giữa chừng có tác dụng (update() đặt dec.visible) ---
  //   front: 4 phao nhỏ gần gốc · mid: mõm đá nhô lên cách ~150 stud · back: đảo xa + dải mây ngoài đường chân trời. Shot thêm đảo/tàu qua props như cũ.
  e.phao = [];
  let dec = null;
  {
    const cone = new THREE.ConeGeometry(0.9, 2.2, 10), bar = new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), cap = new THREE.SphereGeometry(0.28, 8, 6);
    dec = new THREE.Group(); dec.name = 'open_sea_decor'; g.add(dec);
    const phaos = new THREE.Group(); phaos.name = 'open_sea_buoys';
    for (let i = 0; i < 4; i++) {
      const a = hash(i, 11) * 6.283, r = 26 + hash(i, 12) * 22, b = new THREE.Group(); b.name = 'buoy_' + i;
      const body = new THREE.Mesh(cone, mat(i % 2 ? '#e8e4d8' : '#d6452f')); body.position.y = 0.5; b.add(body);
      const mast = new THREE.Mesh(bar, mat('#444a52')); mast.position.y = 2.4; b.add(mast);
      const top = new THREE.Mesh(cap, mat('#ffd34e', { emissive: '#ffb020', emissiveIntensity: 0.2 })); top.position.y = 3.7; b.add(top);
      b.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); b.userData.fase = hash(i, 13) * 6.283; b.userData.yaw = hash(i, 14) * 6.283; phaos.add(b); e.phao.push(b);
    }
    dec.add(ganTang(phaos, 'front'));
    // 4 cụm đá cách ~55 stud quanh gốc, mỗi cụm tự là 1 vật tầng giữa; 8 đảo thấp ở ~70 stud (tầng sau, mỗi đảo 1 vật): measure đếm theo tầm nhìn nên rải đều mọi hướng để cả góc camera cao nhìn xuống cũng có
    for (let k = 0; k < 4; k++) {
      const rock = new THREE.Group(); rock.name = 'open_sea_rock' + (k ? '_' + k : '');
      for (let i = 0; i < 5; i++) {
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat(['#6f6a62', '#7d776d', '#5d5953'][i % 3], { flatShading: true, roughness: 1 }));
        const s = i === 0 ? 7 : 2.5 + hash(i + 5 * k, 21) * 3; m.scale.set(s, s * (0.8 + hash(i + 5 * k, 22) * 0.5), s * 0.9); m.position.set(i === 0 ? 0 : (hash(i + 5 * k, 23) - 0.5) * 14, s * 0.35, i === 0 ? 0 : (hash(i + 5 * k, 24) - 0.5) * 9);
        m.castShadow = true; rock.add(m);
      }
      const a = (k + 0.1 + hash(k, 25) * 0.9) * 1.5708, r = 48 + hash(k, 26) * 22;   // lệch góc + bán kính lớn để không thành vòng đều rock.position.set(Math.sin(a) * r, -1.2, -Math.cos(a) * r);
      dec.add(ganTang(rock, 'mid'));
    }
    for (let k = 0; k < 8; k++) {
      const isl = new THREE.Group(); isl.name = 'open_sea_islet_' + k;
      const w = 12 + hash(k, 27) * 8, h = 9 + hash(k, 28) * 6;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat(['#5f7a62', '#6b8470', '#56705c'][k % 3], { flatShading: true, roughness: 1 })); m.scale.set(w, h, w * 0.8); m.position.y = h * 0.25; isl.add(m);
      const a = (k + (hash(k, 29) - 0.5) * 1.3) * 0.7854 + 0.2, r = 62 + hash(k, 30) * 34; isl.position.set(Math.sin(a) * r, -1, -Math.cos(a) * r);
      dec.add(ganTang(isl, 'back'));
    }
    const far = new THREE.Group(); far.name = 'open_sea_far';
    for (const [x, z, w, h, c] of [[-420, -760, 190, 24, '#6d8da3'], [-300, -790, 120, 16, '#7a98ad'], [520, -700, 170, 20, '#6f8fa6']]) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat(c, { flatShading: true, roughness: 1 })); m.scale.set(w, h, w * 0.4); m.position.set(x, h * 0.2 - 1, z); far.add(m);
    }
    dec.add(ganTang(far, 'back'));
  }
  return { suSong: ['song'], update(t, ctx) { e.sea(t); if (dec) dec.visible = globalThis.__autoFx?.seaDecor !== false;
    // phao bám mặt sóng thật (lõi nổi engine/floating.js; không còn sin riêng)
    if (dec?.visible) for (const b of e.phao) { const F = floatPose(e.sea, { x: b.position.x, z: b.position.z, yaw: 0, hx: 0.7, hz: 0.7, t, draft: 0.3, pitchK: 0.8, rollK: 0.8, maxPitch: 0.35, maxRoll: 0.35 }); b.position.y = F.dy; b.rotation.set(F.rotX, 0, F.rotZ); } e.rain.update(t, ctx.focus || [0, 0, 0]); e.bolt.visible = false; } };
}
