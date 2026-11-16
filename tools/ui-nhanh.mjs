// node tools/ui-nhanh.mjs <dist/ep.html> <ra.html> — thay riêng phần trình phát (tools/export-ui.js) trong một bản gộp có sẵn,
// KHÔNG dựng lại cảnh (vài giây thay vì vài phút). Để thử giao diện; bản thật vẫn gộp bằng tools/bundle.mjs.
import { readFileSync, writeFileSync } from 'fs'; import { build } from 'esbuild'; import { resolve, join, dirname } from 'path'; import { fileURLToPath } from 'url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [src, out] = process.argv.slice(2); if (!src || !out) { console.error('Dùng: node tools/ui-nhanh.mjs <vào.html> <ra.html>'); process.exit(1); }
const ui = (await build({ entryPoints: [join(root, 'tools', 'export-ui.js')], bundle: true, format: 'esm', target: 'es2022', minify: true, write: false, legalComments: 'none', logLevel: 'warning' })).outputFiles[0].text.replace(/<\/script/gi, '<\/script');
let h = readFileSync(resolve(src), 'utf8');
const open = '<script type="module">', i = h.lastIndexOf(open), j = h.indexOf('</script>', i);
if (i < 0 || j < 0) throw new Error('không thấy module trình phát');
h = h.slice(0, i) + open + ui + h.slice(j);
h = h.replace(/<meta name="viewport"[^>]*>/i, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />');
writeFileSync(resolve(out), h); console.log('ghi', out, (h.length / 1048576).toFixed(1), 'MB');
