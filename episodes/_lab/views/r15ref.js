// So sánh: nhân vật R15 của engine (trái) với mô hình tham chiếu assets/characters/r15_body.glb (phải, không texture).
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createR15, loadR15Body } from '../../../engine/r15.js';
export default async (THREE, stage, q) => {
  const body = await loadR15Body(THREE);
  const a = createR15(THREE, { name: 'hero', skin: '#f3d27a', shirt: '#f2c230', sleeves: '#f2c230', pants: '#3f6fb5', body });
  a.root.position.x = -2.6; stage.scene.add(a.root);
  const g = await new GLTFLoader().loadAsync('/assets/characters/r15_body.glb');
  g.scene.position.set(2.6, 3, 0); g.scene.traverse((m) => { if (m.isMesh) m.material = new THREE.MeshStandardMaterial({ color: '#c8c8c8', roughness: 0.7 }); });
  stage.scene.add(g.scene);
  const yaw = +(q.get('yaw') || 0.35);
  return (t) => { a.animate('idle', 0); stage.orbit([0, 2.6, 0], { yaw, height: 0.8, dist: 24, fov: 40 }); };
};
