// Gộp 1 trang lab (engine/*-lab.html, không asset ngoài) thành 1 file mở được bằng file://
// Dùng: node tools/lab1file.mjs engine/grass-lab.html dist/grass-lab.html
import { build } from 'esbuild'; import { readFileSync, writeFileSync } from 'fs'; import { resolve, dirname } from 'path';
const [src, out] = process.argv.slice(2); const root = process.cwd();
let html = readFileSync(src, 'utf8');
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
const r = await build({ stdin: { contents: m[1], resolveDir: dirname(resolve(src)), loader: 'js' }, bundle: true, format: 'esm', write: false, minify: true,
  alias: { three: resolve(root, 'vendor/three/three.module.js') }, plugins: [{ name: 'addons', setup(b) { b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: resolve(root, 'vendor/three/addons', a.path.slice(13)) })); } }] });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\/script');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '').replace(m[0], () => `<script type="module">${js}</script>`);
writeFileSync(out, html); console.log(out, (html.length / 1e6).toFixed(2) + ' MB');
