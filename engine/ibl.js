// ibl.js — ÁNH SÁNG MÔI TRƯỜNG (image-based lighting) cho mọi bối cảnh, tính sẵn lúc init (tất định).
// Trước đây scene.environment = null → kim loại, men sứ, kính, sơn bóng không có gì để phản chiếu → đen kịt
// hoặc trông như nhựa. Học từ repo tham khảo (RoomEnvironment 0,55 cho cảnh trong nhà):
//   - trong nhà (interior, bedNight): "phòng studio" dựng bằng code — tường xám ấm + vài tấm đèn phát sáng
//     (giống ý tưởng RoomEnvironment của three.js, không cần file)
//   - ngoài trời: cầu trời gradient theo preset (top/bottom) + đốm mặt trời theo hướng nắng
// Dùng: const ibl = createIBL(THREE, renderer, LIGHTS); scene.environment = ibl.get(key); scene.environmentIntensity = ibl.intensity(key)
// Bật/tắt: ô "ibl" trong trình phát (engine/post.js → globalThis.__autoFx.ibl).

const INTENSITY = { interior: 0.55, bedNight: 0.3, night: 0.3, snowNight: 0.35, storm: 0.35 };   // còn lại 0.6
export const IBL_HEMI_SCALE = 0.72;   // khi bật IBL, giảm đèn bán cầu để tổng độ sáng gần như cũ

function roomScene(THREE, warm = '#efe3cf') {
  const s = new THREE.Scene();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const wall = new THREE.MeshBasicMaterial({ color: warm, side: THREE.BackSide });
  const room = new THREE.Mesh(box, wall); room.scale.set(14, 9, 14); room.position.y = 3.5; s.add(room);
  const floor = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: '#6b5440' })); floor.scale.set(14, 0.1, 14); floor.position.y = -0.95; s.add(floor);
  const lamp = (w, h, d, x, y, z, k, col = '#ffffff') => {
    const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k) }));
    m.scale.set(w, h, d); m.position.set(x, y, z); s.add(m);
  };
  lamp(4, 0.1, 4, 0, 7.9, 0, 6);                    // đèn trần lớn
  lamp(0.1, 3, 4, -6.9, 3.5, 0, 4, '#fff1d8');      // cửa sổ nắng ấm bên trái
  lamp(4, 3, 0.1, 0, 3.5, -6.9, 2.2, '#dfe9ff');    // cửa sổ trời mát phía sau
  lamp(0.1, 2, 2, 6.9, 2.5, 3, 1.5);                // đèn phụ phải
  return s;
}

function skyScene(THREE, L) {
  const s = new THREE.Scene();
  const sun = new THREE.Vector3(...(L.dir || [0.5, 1, 0.5])).normalize();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(L.top) }, bottom: { value: new THREE.Color(L.bottom) }, ground: { value: new THREE.Color(L.hemi?.[1] || '#777766') },
      sunDir: { value: sun }, sunCol: { value: new THREE.Color(L.sun?.[0] || '#ffffff').multiplyScalar(L.night ? 2.0 : 6.0) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, bottom, ground, sunDir, sunCol; varying vec3 vP;
      void main(){ vec3 d = normalize(vP); float h = clamp(d.y * 1.6 + 0.25, 0.0, 1.0);
        vec3 c = d.y >= 0.0 ? mix(bottom, top, h) : mix(bottom, ground * 0.6, clamp(-d.y * 3.0, 0.0, 1.0));
        c += sunCol * pow(max(dot(d, sunDir), 0.0), 64.0);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat));
  return s;
}

export function createIBL(THREE, renderer, LIGHTS) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const cache = {};
  const ROOMS = { interior: '#efe3cf', bedNight: '#3a3f72' };
  for (const [key, L] of Object.entries(LIGHTS)) {
    const sc = ROOMS[key] ? roomScene(THREE, ROOMS[key]) : skyScene(THREE, L);
    cache[key] = pmrem.fromScene(sc, 0.02, 0.1, 200).texture;
    sc.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
  }
  pmrem.dispose();
  return {
    get: (key) => cache[key] || cache.day || null,
    intensity: (key) => INTENSITY[key] ?? 0.6,
  };
}
