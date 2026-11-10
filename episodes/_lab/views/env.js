import { createEnvs } from '../../../engine/envs.js';
import { propKit } from '../../../engine/props.js';
import { createHouse } from '../../../engine/house.js';
export default (THREE, stage, q) => {
  const K = propKit(THREE);
  const envs = createEnvs(THREE, stage, K);
  const house = createHouse(THREE, { style: 'family' }); stage.scene.add(house.root);
  const list = (q.get('envs') || 'town').split(',');
  return (t) => {
    const name = list[Math.min(list.length - 1, Math.floor(t))];
    const inside = name === 'kitchen' || name === 'bedroom';
    house.root.visible = !inside;
    const lift = { town: 0, ocean: 1, mountain: 0.2 }[name] ?? 0.4;
    house.pose({ legsOut: name === 'town' ? 0 : 1, lift, t });
    house.setNight(['town', 'forest', 'snowNight', 'iceSea', 'storm'].includes(name) ? 1 : 0);
    if (inside) stage.setCamera([20, 12, 20], [-6, 7, -10], { fov: 50 });
    else stage.orbit([0, 10, 0], { yaw: 0.55, height: 14, dist: 95, lookUp: 0, fov: 42 });
    envs.use(name, t * 3, { focus: [0, 0, 0] });
  };
};
