// Gộp số máy đo (so.json) + kết luận mắt (mat-*.json) → may-kiem.json (cho trang thử) + trang tổng hợp có ảnh lưới.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import sharp from 'sharp'
const K = process.env.K || 'S:/3JS Studio/output/r6-bobj/kiem/'
const so = JSON.parse(readFileSync(K + 'so.json', 'utf8'))
const mat = new Map(); for (const i of [1, 2, 3]) if (existsSync(K + `mat-${i}.json`)) for (const x of JSON.parse(readFileSync(K + `mat-${i}.json`, 'utf8'))) mat.set(x.name, x)
// lỗi tay lún (thêm 19/11): mắt riêng ở mat-tay.json — key "sai" thì bỏ, mức tay nâng mức chung
const TAY = ['tayDau', 'tayThan', 'tayChong'], matTay = new Map(existsSync(K + 'mat-tay.json') ? JSON.parse(readFileSync(K + 'mat-tay.json', 'utf8')).map((x) => [x.name, x]) : [])
for (const s of so) { const t = matTay.get(s.name); if (t) s.loi = s.loi.filter((l) => !TAY.includes(l.key) || t[l.key] !== 'sai') }
const out = {}, rows = []
for (const s of so) {
  const m = mat.get(s.name)
  const may = s.loi.filter((l) => !m || !(m.may_sai || []).includes(l.key)).map((l) => l.label + ' (' + l.note + ', tick ' + l.tk + ')')
  const t = matTay.get(s.name), tayMay = may.filter((x) => /^(tay lún|hai tay chồng)/.test(x))
  const muc = Math.max(m ? m.muc : Math.min(3, Math.ceil(s.score / 3)), t ? t.muc : 0)
  out[s.name] = { muc, loi: m ? [...(m.loi || []), ...(t?.muc && t.ghi_chu ? ['tay: ' + t.ghi_chu] : []), ...may.filter((x) => x.startsWith('giật') || (!t && tayMay.includes(x))).map((x) => 'số: ' + x)] : may.map((x) => 'số: ' + x), score: s.score, mat: !!m }
  rows.push({ s, m, muc, may, t })
}
writeFileSync(K + 'may-kiem.json', JSON.stringify(out))
rows.sort((a, b) => b.muc - a.muc || b.s.score - a.s.score)
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
let cards = ''
for (const r of rows) {
  const img = (await sharp(K + r.s.name + '.jpg').resize(560).jpeg({ quality: 68 }).toBuffer()).toString('base64')
  cards += `<article class="c m${r.muc}" data-m="${r.muc}"><h3><span class="b m${r.muc}">${r.muc ? 'mức ' + r.muc : 'ổn'}</span> ${esc(r.s.name)}</h3>`
    + (r.m?.loi?.length ? `<p><b>Mắt thấy:</b> ${r.m.loi.map(esc).join(' · ')}</p>` : '')
    + (r.t?.muc && r.t.ghi_chu ? `<p><b>Tay lún (mắt):</b> mức ${r.t.muc} · ${esc(r.t.ghi_chu)}</p>` : '')
    + (r.may.length ? `<p class="s"><b>Máy đo:</b> ${r.may.map(esc).join(' · ')}</p>` : '')
    + `<img loading="lazy" src="data:image/jpeg;base64,${img}" alt="${esc(r.s.name)}"></article>`
}
const cnt = [0, 1, 2, 3].map((k) => rows.filter((r) => r.muc === k).length)
const html = `<title>Máy kiểm R6</title><style>
:root{--bg:#f3f4f7;--card:#fff;--ink:#1d1d1f;--mut:#666;--bd:#ddd}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141416;--card:#1e1e22;--ink:#eee;--mut:#9a9aa2;--bd:#333}}
:root[data-theme="dark"]{--bg:#141416;--card:#1e1e22;--ink:#eee;--mut:#9a9aa2;--bd:#333}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif}header{padding:12px 16px;position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--bd);z-index:1}
h1{font-size:18px;margin:0 0 6px}.f label{margin-right:10px;font-size:13px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;padding:12px 16px}
.c{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:10px}.c h3{margin:0 0 6px;font-size:15px}.c p{margin:4px 0;font-size:13px}.c .s{color:var(--mut)}.c img{width:100%;border-radius:6px;margin-top:6px}
.b{color:#fff;border-radius:4px;padding:0 6px;font-size:12px}.b.m0{background:#2e7d32}.b.m1{background:#b8a000}.b.m2{background:#d96b00}.b.m3{background:#c62828}</style>
<header><h1>Máy kiểm động tác Gà R6 (${process.env.GA === 'mc' ? 'xương Minecraft' : 'thân gập eo'})${process.env.TEN ? ' · bộ ' + process.env.TEN : ''} — ${rows.length} động tác</h1><div class="f">
${[3, 2, 1, 0].map((k) => `<label><input type="checkbox" value="${k}" checked> ${k ? 'mức ' + k : 'ổn'} (${cnt[k]})</label>`).join('')}</div>
<small>Mỗi ảnh: 4 khung, trái Steve gốc, phải Gà. Mức 3 = hỏng động tác, 2 = lỗi rõ, 1 = nhẹ.</small></header><main>${cards}</main>
<script>document.querySelectorAll('.f input').forEach(i=>i.onchange=()=>{const on=new Set([...document.querySelectorAll('.f input:checked')].map(x=>x.value));document.querySelectorAll('.c').forEach(c=>c.style.display=on.has(c.dataset.m)?'':'none')})</script>`
const TEN = process.env.TEN || ''   // '' = bộ BBS; 'quaternius' → may-kiem-quaternius.html
writeFileSync(`S:/3JS Studio/output/r6-bobj/may-kiem-${TEN || 'r6'}.html`, html)
writeFileSync(`S:/3JS Studio/dist/r6-may-kiem${TEN ? '-' + TEN : ''}.html`, '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + html + '</body></html>')
console.log('mức 0..3:', cnt, '· có mắt:', mat.size, '· trang', (html.length / 1e6).toFixed(2), 'MB')
