// nhap-story-index: dựng episodes/<ep>/index.html cho tập nhập từ story.html (nhân vật + bối cảnh + camera GỐC trong goc/), từ index.html của ep005.
//   node tools/nhap-story-index.mjs ep6B
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ep = process.argv[2] || 'ep6B';
let h = fs.readFileSync(path.join(ROOT, 'episodes', 'ep005', 'index.html'), 'utf8');
const sub = (a, b) => { if (!h.includes(a)) throw new Error('thiếu mốc: ' + a.slice(0, 60)); h = h.split(a).join(b); };
sub('ep005', ep);
sub("import { createNvCast } from '/episodes/" + ep + "/nv-cast.js';",
  `import { RoundedBoxGeometry } from '/episodes/${ep}/goc/RoundedBoxGeometry.js';
      import { Reflector } from '/episodes/${ep}/goc/Reflector.js';
      import { createCharacterKit } from '/episodes/${ep}/goc/characters.js';
      import { buildStorySets, buildStorySets2 } from '/episodes/${ep}/goc/sets.js';
      import { createStory } from '/episodes/${ep}/goc/story.js';`);
// env trống cho cảnh gốc: tự dựng cả thế giới trong stage.scene
sub("for (const n of [...new Set(SHOTS.map((s) => s.env).filter(Boolean))]) {\n        if (n === townEnv || n === 'kenneyTown') continue;",
  "envs.define('goc-trong', 'night', (g) => {});\n      for (const n of [...new Set(SHOTS.map((s) => s.env).filter(Boolean))]) {\n        if (n === townEnv || n === 'kenneyTown' || n === 'goc-trong') continue;");
// bỏ nv-cast; tạo cảnh gốc SAU applyMaterials (vân/chất liệu của studio không chạm vào đồ gốc)
sub(/const nv = await createNvCast\(THREE, stage\.scene\);[^\n]*/.exec(h)[0], 'const nv = { render() {} };   // không dùng diễn viên studio: nhân vật gốc ở goc/ (xem bên dưới)');
sub('await MATS.ready;', `await MATS.ready;
      // ---- CẢNH GỐC của story.html (goc/): nhân vật characters.js, bối cảnh sets.js, camera + động tác từng shot. Tắt: ?goc=0 (về bản studio trống)
      const GOC = q.get('goc') !== '0';
      const KIT = createCharacterKit(THREE, RoundedBoxGeometry);
      const goc = createStory(THREE, RoundedBoxGeometry, Reflector, KIT, buildStorySets, buildStorySets2, stage.scene);
      await goc.preload();
      window.__goc = goc;`);
sub('nv.render(shot, T, local, local / shot.dur);',
  `if (GOC && shot.goc) { const c = goc.frame(T); stage.setCamera(c.p, c.l, { fov: c.fov, roll: c.roll, focusShadow: false }); stage.camera.quaternion.set(...c.quat); }`);
fs.copyFileSync(path.join(ROOT, 'vendor/three/addons/geometries/RoundedBoxGeometry.js'), path.join(ROOT, 'episodes', ep, 'goc', 'RoundedBoxGeometry.js'));   // studio chỉ nhúng module 'three': addon chép cạnh tập
// thời lượng thật = END của story gốc (data-duration mượn từ ep005 là 20 s → trình phát dừng ở shot 15)
const endM = fs.readFileSync(path.join(ROOT, 'episodes', ep, 'goc', 'story.js'), 'utf8').match(/const END = ([0-9.]+);/);
if (endM) h = h.replace(/data-duration="20\.000"/g, 'data-duration="' + (+endM[1]).toFixed(3) + '"');
fs.writeFileSync(path.join(ROOT, 'episodes', ep, 'index.html'), h, 'utf8');
console.log('ghi episodes/' + ep + '/index.html');
