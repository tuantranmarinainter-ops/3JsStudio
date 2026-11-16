// Dựng dist/model-test_so-sanh.html (một file, ảnh nhúng) từ output/model-test/*.
// Dùng: node tools/model-test-trang.mjs
// Cần: danh-sach.json, studio-bbox.json, 3js-info.json, studio/*.jpg, 3js/*.png; tuỳ chọn nhan-xet.json, de-xuat.json
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';

const D = 'output/model-test';
const R = (f) => JSON.parse(readFileSync(join(D, f), 'utf8'));
const ds = R('danh-sach.json'), sb = R('studio-bbox.json'), info = R('3js-info.json');
const nx = existsSync(join(D, 'nhan-xet.json')) ? R('nhan-xet.json') : [];
const rec = existsSync(join(D, 'de-xuat.json')) ? R('de-xuat.json') : { top3: [], de_xuat: [] };
const w3 = readdirSync(join(D, '3js')).filter((f) => f.endsWith('.png'));

// thu nhỏ + nhúng base64 (PIL)
const py = [
  'import sys,base64,io,json',
  'from PIL import Image',
  'out={}',
  'for k,p in json.loads(sys.argv[1]).items():',
  "    im=Image.open(p).convert('RGB'); im.thumbnail((720,720)); b=io.BytesIO(); im.save(b,'JPEG',quality=80); out[k]=base64.b64encode(b.getvalue()).decode()",
  'print(json.dumps(out))',
].join('\n');
const files = {};
const nameOf = (m, i) => 's' + String(i + 1).padStart(2, '0') + '_' + m.id;
sb.models.forEach((m, i) => {
  const nm = nameOf(m, i);
  files[nm + '|a'] = join(D, 'studio', nm + '.jpg');
  files[nm + '|b'] = join(D, '3js', w3.find((f) => f.includes(nm)));
});
files['row|a'] = join(D, 'studio', 'row.jpg');
files['row|b'] = join(D, '3js', w3.find((f) => f.includes('row')));
const img = JSON.parse(execFileSync('python', ['-I', '-c', py, JSON.stringify(files)], { maxBuffer: 1 << 28 }).toString());

const NOVAN = new Set(['Plastic', 'SmoothPlastic', 'Neon', 'Glass', 'ForceField', 'Foil']);
const e = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const sz = (a) => a.map((v) => v.toFixed(1)).join('×');

const cards = sb.models.map((m, i) => {
  const d = ds[i], f = info.info[i], nm = nameOf(m, i);
  const x = nx.find((n) => n.shot === nm) || {};
  const mats = Object.entries(m.mats).sort((a, b) => b[1] - a[1]);
  const van = mats.filter(([k]) => !NOVAN.has(k));
  const vanN = van.reduce((s, [, v]) => s + v, 0), all = mats.reduce((s, [, v]) => s + v, 0);
  const auto = [];
  const rel = (a, b) => Math.abs(a - b) / Math.max(b, 1);
  if (rel(f.size[1], m.size[1]) > 0.25 || rel(f.size[2], m.size[2]) > 0.25) auto.push(`Hộp bao lệch: Studio ${sz(m.size)} ≠ GLB ${sz(f.size)} stud`);
  if (vanN) auto.push(`${vanN}/${all} part dùng Enum.Material có vân (${van.map(([k, v]) => k + '×' + v).join(', ')}) → GLB chỉ còn màu phẳng, 0 vân vật liệu`);
  if (m.union) auto.push(`${m.union} Union → hộp bao (không CSG)`);
  if (m.decal + m.texture) auto.push(`Decal/Texture: Studio ${m.decal}/${m.texture} → GLB giữ ${f.textures.length} ảnh (phần lớn bị bỏ: "Texture trên mảnh không phải hộp")`);
  if (m.sa) auto.push(`SurfaceAppearance ×${m.sa} (PBR: màu+normal+roughness+metal) → GLB chỉ có map màu`);
  if (m.mats.Neon) auto.push('Neon (tự phát sáng) → xem emissive/bloom');
  if (f.meshes > 100) auto.push(`${f.meshes} mesh ≈ ${f.meshes} draw call (chưa gộp theo vật liệu)`);
  const rows = [
    ['Part / MeshPart / Union', `${m.part} / ${m.mesh} / ${m.union}`, `${f.meshes} mesh`],
    ['Decal / Texture / SurfaceApp.', `${m.decal} / ${m.texture} / ${m.sa}`, `${f.textures.length} ảnh vân`],
    ['Vật liệu', mats.map(([k, v]) => `${k}×${v}`).join(', '), `${f.materials} vật liệu · ${Object.entries(f.types).map(([k, v]) => k + '×' + v).join(', ')}`],
    ['Ảnh vân (độ phân giải)', '(theo ảnh gốc)', f.textures.length ? f.textures.map((t) => t.split(':')[1]).join(', ') : 'không có'],
    ['Tam giác', 'không đọc được qua MCP', f.tris.toLocaleString('vi')],
    ['Draw call (≈ mesh)', 'không đọc được', String(f.meshes)],
    ['Hộp bao (stud X×Y×Z)', sz(m.size), sz(f.size)],
  ];
  return `<section class="card"><h2>${i + 1}. ${e(d.ten)} <small>${d.loai} · ${e(d.tacGia)} · id ${d.id}</small></h2>
<div class="pair"><figure><img src="data:image/jpeg;base64,${img[nm + '|a']}" alt="Studio"><figcaption>Roblox Studio</figcaption></figure><figure><img src="data:image/jpeg;base64,${img[nm + '|b']}" alt="3JS"><figcaption>3JS (engine)</figcaption></figure></div>
<div class="tw"><table><tr><th></th><th>Studio</th><th>3JS</th></tr>${rows.map((r) => `<tr><td>${r[0]}</td><td>${e(r[1])}</td><td>${e(r[2])}</td></tr>`).join('')}</table></div>
<p class="sc">${x.diem != null ? `Độ khớp (agent nhìn ảnh): <b>${x.diem}/5</b> — ${e(x.dong || '')}` : ''}</p>
<ul class="bad">${auto.map((a) => `<li>${e(a)}</li>`).join('')}${(x.sai_khac || []).map((a) => `<li class="ag">${e(a)}</li>`).join('')}</ul></section>`;
}).join('\n');

const tr = existsSync(join(D, 'truoc', '3js-info.json')) ? JSON.parse(readFileSync(join(D, 'truoc', '3js-info.json'), 'utf8')) : null;
const truocSau = tr ? `<div class="box"><b>Trước / sau khi sửa khâu nhập</b> (Ball lệch trục → cầu; Neon → emissive; Glass → trong suốt)<div class="tw"><table><tr><th>Món</th><th>Hộp bao trước</th><th>Hộp bao sau</th><th>Studio</th><th>Emissive trước → sau</th><th>Trong suốt sau</th></tr>${info.info.map((f, i) => { const t = tr.info[i]; return `<tr><td>${i + 1}. ${e(ds[i].ten)}</td><td>${sz(t.size)}</td><td>${sz(f.size)}</td><td>${sz(sb.models[i].size)}</td><td>${t.emissive || 0} → ${f.emissive || 0}</td><td>${f.transparent || 0}</td></tr>`; }).join('')}</table></div></div>` : '';
const L = sb.lighting;
const rowx = nx.find((n) => n.shot === 'row') || {};
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>So sánh Studio và 3JS</title>
<style>:root{--bg:#f6f7f9;--fg:#1b1f24;--mut:#59636e;--card:#fff;--bd:#d8dee4;--bad:#b3261e}
@media(prefers-color-scheme:dark){:root{--bg:#10141a;--fg:#e6e9ee;--mut:#9aa5b1;--card:#1a2029;--bd:#2c3540;--bad:#ff8a80}}
*{box-sizing:border-box}body{margin:auto;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,Segoe UI,sans-serif;padding:16px;max-width:1100px}
h1{font-size:22px}h2{font-size:17px;margin:0 0 8px}h2 small{display:block;font-weight:400;color:var(--mut);font-size:12px}
.card,.box{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:12px;margin:14px 0}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}figure{margin:0}img{width:100%;height:auto;border-radius:6px;display:block}figcaption{font-size:12px;color:var(--mut);text-align:center}
.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}td,th{border:1px solid var(--bd);padding:4px 6px;text-align:left;vertical-align:top}th{background:var(--bg)}
.bad li{color:var(--bad);font-size:13px}.bad li.ag{color:var(--fg)}.sc{font-size:13px;margin:4px 0}code{background:var(--bg);padding:1px 4px;border-radius:4px}
@media(max-width:640px){.pair{grid-template-columns:1fr}}</style></head><body>
<h1>So sánh asset Roblox: Studio và 3JS</h1>
<p style="color:var(--mut)">10 mẫu miễn phí Creator Store, cùng vị trí, hướng và góc máy 3/4 phía trước (fov 70). Dựng ngày ${new Date().toISOString().slice(0, 10)} bằng <code>tools/model-test-trang.mjs</code>.</p>
<div class="box"><b>Điều kiện</b><ul>
<li>Studio: ClockTime ${L.ClockTime}, Ambient ${L.Ambient.join(',')}, Brightness ${L.Brightness}, có Sky (bầu trời đêm tuỳ biến của dự án Sky) + Atmosphere, Technology: ${e(L.Technology)}. Giữ nguyên.</li>
<li>3JS: nền xanh đen phẳng, mặt đất xám phẳng, 1 mặt trời đổ bóng + hemi + ambient, không tone mapping. <b>Ánh sáng và nền chưa khớp Studio</b>; so ở mức vật liệu, vân, hình.</li>
<li>Studio không cho đọc số tam giác/draw call qua MCP. 3JS đo bằng renderer.info + duyệt GLB. Số shader program toàn trang: <b>${info.programs}</b> (<code>node tools/shaders.mjs</code>: trong ngưỡng).</li></ul></div>
<div class="box"><b>Toàn hàng</b><div class="pair"><figure><img src="data:image/jpeg;base64,${img['row|a']}" alt="Studio"><figcaption>Studio</figcaption></figure><figure><img src="data:image/jpeg;base64,${img['row|b']}" alt="3JS"><figcaption>3JS</figcaption></figure></div><p class="sc">${e(rowx.dong || '')}</p></div>
<div class="box"><b>3 sai khác lớn nhất</b><ol>${rec.top3.map((t) => `<li>${e(t)}</li>`).join('')}</ol></div>
${truocSau}
${cards}
<div class="box"><b>Đề xuất cải tiến khâu nhập (xếp theo lợi/công)</b><div class="tw"><table><tr><th>#</th><th>Việc</th><th>Lợi</th><th>Công</th><th>Vì sao</th></tr>${rec.de_xuat.map((r, i) => `<tr><td>${i + 1}</td><td>${e(r.viec)}</td><td>${e(r.loi)}</td><td>${e(r.cong)}</td><td>${e(r.vi_sao)}</td></tr>`).join('')}</table></div><p class="sc">Chỉ đề xuất. Chưa sửa engine hay <code>roblox.mjs</code>; chờ người dùng chọn.</p></div>
</body></html>`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/model-test_so-sanh.html', html);
console.log('dist/model-test_so-sanh.html', (html.length / 1e6).toFixed(2) + ' MB');
