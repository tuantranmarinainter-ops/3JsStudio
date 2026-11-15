// Gộp engine/ga-lab.html thành dist/ga-lab.html (1 file, mở bằng file://, điện thoại):
// nhúng three + r15 + ga-rig + body R15 (GLB, cho bản v1/hero cũ) + atlas Gà + 37 mặt WebP 256 px + ảnh phác trước/sau (WebP 514 px).
//   node tools/ga-lab-build.mjs [out=dist/ga-lab.html]      (cần python + Pillow)
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const out = process.argv[2] || 'dist/ga-lab.html';
execFileSync('node', ['tools/lab1file.mjs', 'engine/ga-lab.html', out], { stdio: 'inherit' });
const tmp = mkdtempSync(join(tmpdir(), 'ga-faces-'));
execFileSync('python', ['-I', '-c', `
import os,sys
from PIL import Image
src='assets/characters/ga/faces'; dst=sys.argv[1]
for f in sorted(os.listdir(src)):
    if f.endswith('.png'): Image.open(os.path.join(src,f)).convert('RGBA').resize((256,256),Image.LANCZOS).save(os.path.join(dst,f[:-4]+'.webp'),quality=88,method=6)
for n in ('front','back'):
    im=Image.open('assets/characters/ga/'+n+'.png').convert('RGB'); im.resize((514,765),Image.LANCZOS).save(os.path.join(dst,'_sk_'+n+'.webp'),quality=80,method=6)
`, tmp], { stdio: 'inherit' });
const faces = {}, sk = {};
for (const f of readdirSync(tmp)) {
  const d = 'data:image/webp;base64,' + readFileSync(join(tmp, f)).toString('base64');
  if (f.startsWith('_sk_')) sk[f.slice(4, -5)] = d; else faces[f.replace(/^\d+_/, '').replace('.webp', '')] = d;
}
const glb = 'data:model/gltf-binary;base64,' + readFileSync('assets/characters/r15_body.glb').toString('base64');
const atlas = 'data:image/webp;base64,' + readFileSync('assets/characters/ga/atlas.webp').toString('base64');
const hood = 'data:model/gltf-binary;base64,' + readFileSync('assets/characters/ga/hood.glb').toString('base64');
let html = readFileSync(out, 'utf8');
html = html.replace('<script type="module">', () => `<script>window.__GA_ASSETS=${JSON.stringify({ body: glb, atlas, hood, faces, front: sk.front, back: sk.back })};</script>\n<script type="module">`);
writeFileSync(out, html);
console.log('ga-lab', (html.length / 1e6).toFixed(2), 'MB,', Object.keys(faces).length, 'mặt');
