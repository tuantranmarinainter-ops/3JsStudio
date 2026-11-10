// Lab: nhân vật R15 bo tròn (engine/r15.js) với 4 diễn viên ep001.
//   ?view=r15&who=hero|mom|dad|dadIsland|all&anim=walk&face=<tên>|cycle&yaw=0.5&dist=20
//   face=cycle → mỗi giây t một biểu cảm (R15_FACES); cam=…&look=…&fov=… để cận mặt (index.html).
//   blink=0 tắt chớp mắt; side=1 nhìn ngang.
import { createR15, loadCharacterTextures, loadR15Body, R15_FACES } from '../../../engine/r15.js';

const SKIN = '#f3d27a';
// Bản sao option từ episodes/ep001/episode.js (buildCast) + vài option mới của R15 (zipper, boots, lashes…)
const CAST = {
  hero: { skin: SKIN, shirt: '#f2c230', sleeves: '#f2c230', hoodie: '#6b4226', pants: '#3f6fb5', shoes: '#1b1b1b', hat: 'beanie', hatColor: '#d6322b' },
  mom: { skin: '#f0c89a', shirt: '#9fe0c0', sleeves: '#9fe0c0', shirtPattern: 'stripes', shirtPattern2: '#d9f5e8', pants: '#8a6a4a', skirt: '#8a6a4a', scarf: '#d6322b', hair: 'braids', hairColor: '#1b1b1b', lashes: true },
  dad: { skin: '#f0c89a', shirt: '#283a66', sleeves: '#283a66', pants: '#d8cfb8', shoes: '#3b2a1e', hat: 'beanie', hatColor: '#d6322b', zipper: true, boots: true, browThickness: 1.4 },
  dadIsland: { skin: '#f0c89a', shirt: '#2f4a7a', sleeves: '#2f4a7a', shirtPattern: 'torn', shirtPattern2: '#f0c89a', pants: '#7a5a3a', pantsPattern: 'torn', hat: 'beanie', hatColor: '#c42e28', beard: '#cfcfd2', browThickness: 1.4, tired: true },
};
const DEFAULT_FACE = { hero: 'smile', mom: 'smile', dad: 'smile', dadIsland: 'worried' };

export default async (THREE, stage, q) => {
  const who = q.get('who') || 'all';
  const names = who === 'all' ? ['hero', 'mom', 'dad', 'dadIsland'] : who.split(',');
  const anim = q.get('anim') || 'idle';
  const face = q.get('face');
  const blink = q.get('blink') !== '0';
  const actors = [];
  const body = q.get('body') === '0' ? null : await loadR15Body(THREE);
  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    const textures = await loadCharacterTextures(THREE, n);
    const a = createR15(THREE, { name: n, ...CAST[n], textures, body, face: DEFAULT_FACE[n], blink, ...(n === 'hero' ? { scale: 0.92 } : {}) });
    a._defaultFace = DEFAULT_FACE[n];
    const x = (i - (names.length - 1) / 2) * 3.8;
    a.root.position.x = x;
    if (n === 'hero') a.root.scale.setScalar(0.92);
    stage.scene.add(a.root);
    actors.push(a);
  }
  const side = q.get('side') === '1';
  const yaw = +(q.get('yaw') ?? (side ? 1.5708 : 0.45));
  const dist = +(q.get('dist') || (names.length > 1 ? 36 : 11));
  const lie = anim === 'lie';
  return (t) => {
    for (const a of actors) {
      a.root.rotation.set(lie ? -Math.PI / 2 : 0, 0, 0);
      a.root.position.y = lie ? 0.5 : 0;
      const pose = a.animate(anim, t);
      let want = pose.face || a._defaultFace;
      if (face === 'cycle') want = R15_FACES[Math.floor(t) % R15_FACES.length];
      else if (face) want = face;
      if (a.options.face !== want) a.setFace(want);
    }
    stage.orbit([0, lie ? 0.6 : 2.7, 0], { yaw, height: lie ? 9 : 1.6, dist, fov: 40 });
  };
};
