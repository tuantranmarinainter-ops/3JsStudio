// fbx2glb.js — chuyển FBX → GLB (giữ animation) bằng three.js FBXLoader + GLTFExporter trong Chromium headless.
// Không cần Blender. Dùng cho gói như Quaternius (chỉ có FBX/OBJ/Blend).
//   node tools/fbx2glb.js <vào.fbx> <ra.glb> [--three <dir node_modules/three>]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const ti = args.indexOf('--three');
const threeDir = ti >= 0 ? args.splice(ti, 2)[1] : path.resolve('node_modules/three');
const [inp, out] = args;
if (!inp || !out) { console.error('Dùng: node tools/fbx2glb.js <vào.fbx> <ra.glb> [--three dir]'); process.exit(1); }

const html = `<!doctype html><script type="importmap">{"imports":{"three":"http://conv/three/build/three.module.js","three/addons/":"http://conv/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
window.convert = async () => {
  const obj = await new FBXLoader().loadAsync('http://conv/input.fbx');
  const clips = obj.animations || [];
  const glb = await new GLTFExporter().parseAsync(obj, { binary: true, animations: clips, onlyVisible: false });
  const box = new THREE.Box3().setFromObject(obj), s = box.getSize(new THREE.Vector3());
  const bytes = new Uint8Array(glb); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { b64: btoa(bin), clips: clips.map((c) => c.name + ' (' + c.duration.toFixed(2) + 's)'), size: [s.x, s.y, s.z].map((v) => +v.toFixed(3)) };
};
window.__ready = true;
</script>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('pageerror:', e.message));
  await p.route('http://conv/**', (r) => {
    const u = new URL(r.request().url()).pathname;
    if (u === '/index.html') return r.fulfill({ body: html, contentType: 'text/html' });
    if (u === '/input.fbx') return r.fulfill({ path: inp, contentType: 'application/octet-stream' });
    r.fulfill({ path: path.join(threeDir, u.replace('/three/', '')), contentType: 'text/javascript' });
  });
  await p.goto('http://conv/index.html');
  await p.waitForFunction(() => window.__ready);
  const res = await p.evaluate(() => window.convert());
  fs.writeFileSync(out, Buffer.from(res.b64, 'base64'));
  console.log(JSON.stringify({ out, bytes: fs.statSync(out).size, size_native: res.size, clips: res.clips }));
  await b.close();
})();
