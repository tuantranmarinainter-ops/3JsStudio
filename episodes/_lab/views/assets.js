// Thử thư viện asset với manifest thiếu/rỗng: không được lỗi, vẫn render được.
import { loadManifest, createAssetLib } from '../../../engine/assets.js';
export default async (THREE, stage, q) => {
  const man = await loadManifest();
  const lib = createAssetLib(THREE, man);
  const ids = (q.get('ids') || 'nonexistent/model').split(',');
  await lib.load(ids);
  const g = new THREE.Group();
  for (const id of ids) g.add(lib.instance(id, { scale: 1 }));
  g.add(lib.scatter(ids[0], 20, [-30, -30, 30, 30], 5, { minDist: 4 }));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#6aa84f' }));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  stage.scene.add(g);
  console.log('manifest entries:', man.list.length);
  return () => stage.orbit([0, 0, 0], { yaw: 0.7, height: 20, dist: 60 });
};
