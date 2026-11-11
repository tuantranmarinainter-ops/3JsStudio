// Thư viện asset GLB (Kenney/Polyfork) cho engine. Asset thiếu -> cảnh báo + Group rỗng, KHÔNG ném lỗi,
// để phim vẫn render được trước khi asset được tải về. Chỉ fetch manifest/GLB lúc INIT (trước khi seek).
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

export async function loadManifest(url = '/assets/manifest.json') {
  try {
    const r = await fetch(url);
    if (!r.ok) return { byId: new Map(), list: [] };
    const j = await r.json();
    const list = Array.isArray(j) ? j : (j.assets || []);
    return { byId: new Map(list.map((e) => [e.id, e])), list };
  } catch (e) {
    console.warn('[assets] không đọc được manifest:', e.message);
    return { byId: new Map(), list: [] };
  }
}

// PRNG có seed (mulberry32) — không dùng Math.random.
function rng(seed) {
  let a = (seed | 0) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function createAssetLib(THREE, manifest = null) {
  const models = new Map();   // id -> gltf.scene (gốc, không thêm vào scene)
  const warned = new Set();
  const loader = new GLTFLoader(THREE.DefaultLoadingManager);
  let man = manifest; // { byId, list } hoặc null -> tự tải ở load()

  const warn = (id, why) => { if (!warned.has(id)) { warned.add(id); console.warn(`[assets] thiếu "${id}": ${why}`); } };

  function tune(root) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        if ('roughness' in m) m.roughness = 0.8;
        if ('metalness' in m) m.metalness = 0;
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
        m.needsUpdate = true;
      }
    });
  }

  async function load(ids) {
    if (!man) man = await loadManifest();
    await Promise.all([...new Set(ids)].map(async (id) => {
      if (models.has(id)) return;
      const e = man.byId.get(id);
      if (!e) return warn(id, 'không có trong manifest');
      try {
        const gltf = await loader.loadAsync('/' + e.src.replace(/^\/+/, ''));
        tune(gltf.scene);
        gltf.scene.animations = gltf.animations || []; // giữ clip (sinh vật có xương); instance()/clone sao chép theo
        models.set(id, gltf.scene);
      } catch (err) { warn(id, 'tải GLB lỗi: ' + err.message); }
    }));
  }

  const isSkinned = (root) => { let s = false; root.traverse((o) => { if (o.isSkinnedMesh) s = true; }); return s; };

  function instance(id, opts = {}) {
    const { scale = 1, castShadow = true, receiveShadow = true, name } = opts;
    const src = models.get(id);
    let obj;
    if (!src) { warn(id, 'chưa load'); obj = new THREE.Group(); }
    else {
      obj = isSkinned(src) ? skeletonClone(src) : src.clone(true);
      const m = man && man.byId.get(id);
      const s = scale * ((m && m.scale) || 1);
      obj.scale.multiplyScalar(s);
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = castShadow; o.receiveShadow = receiveShadow; } });
    }
    obj.name = name || id;
    return obj;
  }

  // Rải ngẫu nhiên có seed trong area = {x,z,w,d} hoặc [x0,z0,x1,z1]; dùng InstancedMesh nếu model tĩnh.
  function scatter(id, count, area, seed = 1, opts = {}) {
    const { minDist = 0, exclude = [], yJitter = 0, scale = [1, 1], name } = opts;
    const g = new THREE.Group(); g.name = name || `scatter_${id}`;
    const src = models.get(id);
    if (!src) { warn(id, 'chưa load (scatter)'); return g; }
    const [x0, z0, x1, z1] = Array.isArray(area) ? area : [area.x - area.w / 2, area.z - area.d / 2, area.x + area.w / 2, area.z + area.d / 2];
    const r = rng(seed), pts = [];
    for (let tries = 0; pts.length < count && tries < count * 40; tries++) {
      const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
      if (exclude.some(([ex, ez, er]) => Math.hypot(x - ex, z - ez) < er)) continue;
      if (minDist && pts.some((p) => Math.hypot(x - p.x, z - p.z) < minDist)) continue;
      pts.push({ x, z, y: (r() * 2 - 1) * yJitter, ry: r() * Math.PI * 2, s: scale[0] + r() * (scale[1] - scale[0]) });
    }
    const man1 = man && man.byId.get(id);
    const base = (man1 && man1.scale) || 1;
    if (isSkinned(src)) {
      pts.forEach((p, i) => { const o = instance(id, { scale: p.s, name: `${g.name}_${i}` }); o.position.set(p.x, p.y, p.z); o.rotation.y = p.ry; g.add(o); });
      return g;
    }
    src.updateMatrixWorld(true);
    const m4 = new THREE.Matrix4(), place = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
    src.traverse((o) => {
      if (!o.isMesh) return;
      const im = new THREE.InstancedMesh(o.geometry, o.material, pts.length);
      im.name = `${g.name}_${o.name || 'mesh'}`; im.castShadow = im.receiveShadow = true;
      pts.forEach((p, i) => {
        q.setFromAxisAngle(up, p.ry); v.set(p.x, p.y, p.z); sc.setScalar(p.s * base);
        place.compose(v, q, sc);
        m4.multiplyMatrices(place, o.matrixWorld); // matrixWorld của mesh trong model gốc
        im.setMatrixAt(i, m4);
      });
      im.instanceMatrix.needsUpdate = true;
      g.add(im);
    });
    return g;
  }

  return { load, instance, scatter, has: (id) => models.has(id), manifest: () => man };
}
