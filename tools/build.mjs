// Dựng lại THEO LỚP — sửa lớp nào thì chỉ chạy lớp đó, cuối cùng gộp lại dist/<ep>.html.
//   node tools/build.mjs ep001 <lớp…> [--no-bundle]
// Lớp (xem episodes/<ep>/LAYERS.md):
//   canh          cảnh, model, camera, shot (shots.js, episode.js, engine/*, assets/)  → tính lại bước chân + tiếng nền (cú cắt/bối cảnh đổi)
//   hieu-ung-hinh màu theo cảnh, bloom, mờ hậu cảnh, viền… (engine/post.js)            → chỉ gộp
//   phu-de        phụ đề Việt (captions.js) / Anh (theo giọng)                          → chỉ gộp
//   giong         giọng đọc nhiều giọng (voices/, tools/voices_build.py)                → ghi lại voices/index.json
//   tieng-anh     lời kể tiếng Anh theo nhịp cắt (tools/en/en_<ep>.py)                   → nhịp + giọng Anh mặc định
//   nen           tiếng nền theo bối cảnh (sfx/layers.json: nen)                        → tải tiếng thiếu + trộn lớp nền
//   buoc-chan     tiếng "rầm" chân nhà (sfx/steps.json, layers.json: buoc-chan)          → trộn lớp bước chân
//   khoanh-khac   tiếng động theo khoảnh khắc (sfx/cues_*.json)                         → tải tiếng thiếu + trộn lớp
//   tieng-dong    = nen + buoc-chan + khoanh-khac
//   all           mọi lớp (không tạo lại giọng CapCut/Edge — việc đó chạy tools/voices_build.py riêng)
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [ep, ...rest] = process.argv.slice(2);
if (!ep) { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).join('\n')); process.exit(1); }
const flags = new Set(rest.filter((a) => a.startsWith('--')));
let layers = rest.filter((a) => !a.startsWith('--'));
const ALL = ['canh', 'hieu-ung-hinh', 'phu-de', 'giong', 'tieng-anh', 'nen', 'buoc-chan', 'khoanh-khac'];
if (!layers.length || layers.includes('all')) layers = ALL;
layers = layers.flatMap((l) => (l === 'tieng-dong' ? ['nen', 'buoc-chan', 'khoanh-khac'] : [l]));
for (const l of layers) if (!ALL.includes(l)) { console.error(`Lớp không có: ${l}. Có: ${ALL.join(', ')}, tieng-dong, all`); process.exit(1); }
const epd = join(root, 'episodes', ep);
const py = process.platform === 'win32' ? 'python' : 'python3';
const env = { ...process.env, PYTHONIOENCODING: 'utf8', PYTHONDONTWRITEBYTECODE: '1' };
const t0 = Date.now();
function run(label, cmd, args) {
  const t = Date.now(); process.stdout.write(`▶ ${label}\n`);
  const r = spawnSync(cmd, args, { cwd: root, env, stdio: 'inherit', shell: false });
  if (r.status !== 0) { console.error(`✗ ${label} lỗi (mã ${r.status})`); process.exit(r.status || 1); }
  console.log(`  ✓ ${((Date.now() - t) / 1000).toFixed(1)} s`);
}
const has = (l) => layers.includes(l);
const mixLayers = new Set();

if (has('canh')) {
  run('Bước chân nhà (quét chuyển động chân)', 'node', ['tools/sfx/steps.mjs', `episodes/${ep}/index.html`, `episodes/${ep}/sfx/steps.json`]);
  mixLayers.add('nen'); mixLayers.add('buoc-chan');
}
if (has('tieng-anh')) {
  run('Nhịp cắt cảnh cho tiếng Anh', py, ['-c', `import subprocess,sys;open('episodes/${ep}/beats.json','w',encoding='utf8').write(subprocess.run([sys.executable,'tools/en/beats.py','${ep}','--keep','s055'],capture_output=True,text=True,encoding='utf8').stdout)`]);
  run('Giọng Anh mặc định + phụ đề Anh', py, ['tools/en/tts_en.py', ep]);
}
if (has('giong') && existsSync(join(epd, 'voices'))) run('Danh sách giọng (voices/index.json)', py, ['tools/voices_build.py', ep, 'index']);
if (has('nen')) {
  const cfg = JSON.parse(readFileSync(join(epd, 'sfx', 'layers.json'), 'utf8')).nen;
  const phrases = [...new Set([...Object.values(cfg.map), ...Object.values(cfg.night)])];
  run('Tải tiếng nền còn thiếu', py, ['tools/sfx/fetch.py', '--amb', ...phrases]);
  mixLayers.add('nen');
}
if (has('khoanh-khac')) {
  run('Tải tiếng động còn thiếu', py, ['tools/sfx/fetch.py', '--cues', ...readdirCues()]);
  mixLayers.add('khoanh-khac');
}
if (has('buoc-chan')) mixLayers.add('buoc-chan');
if (mixLayers.size) run(`Trộn lớp tiếng động: ${[...mixLayers].join(', ')}`, py, ['tools/sfx/mix.py', ep, ...mixLayers]);
if (!flags.has('--no-bundle')) run('Gộp file HTML', 'node', ['tools/bundle.mjs', ep]);
console.log(`Xong (${layers.join(', ')}) trong ${((Date.now() - t0) / 1000).toFixed(0)} s → dist/${ep}.html`);

function readdirCues() {
  const dir = join(epd, 'sfx');
  return existsSync(dir) ? spawnSync(py, ['-c', `import glob;print('\\n'.join(sorted(glob.glob('episodes/${ep}/sfx/cues_*.json'))))`], { cwd: root, encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean) : [];
}
