import { createHouse } from '../../../engine/house.js';
import { createR6 } from '../../../engine/r6.js';
export default (THREE, stage, q) => {
  const house = createHouse(THREE, { style: q.get('style') || 'family' });
  stage.scene.add(house.root);
  const kid = createR6(THREE, { shirt: '#f2c230' }); kid.root.position.set(-20, 0, 18); stage.scene.add(kid.root);
  const mode = q.get('mode') || 'walk';
  return (t) => {
    if (mode === 'walk') { const d = t * 6; house.root.position.set(0, 0, d); house.pose({ walk: d, t }); }
    else if (mode === 'emerge') house.pose({ legsOut: Math.min(1, t / 2), lift: Math.max(0, (t - 2) / 2), t });
    else if (mode === 'kneel') house.pose({ kneel: Math.min(1, t / 2), t });
    else house.pose({ legsOut: 0, lift: 0 });
    stage.orbit([0, 10, house.root.position.z], { yaw: +(q.get('yaw') || 0.7), height: 8, dist: +(q.get('dist') || 85), lookUp: 2 });
  };
};
