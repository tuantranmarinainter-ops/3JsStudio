// Gộp trang duyệt cầu thang gấp thành 1 file mở thẳng bằng file:// → dist/cau-thang-gap.html
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const r = await build({
  entryPoints: [root + 'engine/stairs-lab.js'], bundle: true, write: false, format: 'iife', minify: true,
  alias: { three: root + 'vendor/three/three.module.js' }, logLevel: 'warning',
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cầu thang gấp bản lề</title><style>
html,body{margin:0;height:100%;overflow:hidden;font:15px system-ui,sans-serif;background:#bfe3ff}
#ui{position:fixed;left:12px;top:12px;background:rgba(20,24,32,.82);color:#fff;padding:10px 12px;border-radius:10px;max-width:340px}
#ui h1{font-size:16px;margin:0 0 6px} #ui p{margin:4px 0 8px;opacity:.85;font-size:13px;line-height:1.35}
button{background:#2d6cdf;color:#fff;border:0;border-radius:6px;padding:6px 10px;margin:2px;cursor:pointer}
button.on{background:#f2c14e;color:#222} input[type=range]{width:200px;vertical-align:middle}
</style></head><body><div id="view"></div><div id="ui">
<h1>Cầu thang gấp bản lề — duyệt</h1>
<p>Nhà ngồi: thang bung vừa chạm đất. Nhà đứng dậy: đoạn trên nhấc lên nằm ngang song song sàn hiên, đoạn dưới gập ngược vào bên dưới (hướng về nhà). Ngồi xuống: bung ra lại.</p>
<button id="play">⏸ Dừng</button>
<label><input type="checkbox" id="fold" checked> Gấp bản lề</label><br>
Độ nâng nhà <input type="range" id="lift" min="0" max="1" step="0.01" value="0"> <b id="liftv">0</b><br>
Góc nhìn: <button data-view="ben">Hông nhà</button><button data-view="goc">Góc 3/4</button><button data-view="gan">Cận thang</button>
</div><script>${js}</script></body></html>`;
writeFileSync(root + 'dist/cau-thang-gap.html', html);
console.log('ghi dist/cau-thang-gap.html', (html.length / 1024).toFixed(0), 'KB');
