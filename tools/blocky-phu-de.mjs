// Dùng: node tools/blocky-phu-de.mjs episodes/ep003/captions.js episodes/ep003b/captions.js episodes/ep003b/phu-de-cum.txt
// chia lại phụ đề theo dấu "|" của phu-de-cum.txt; câu không đánh dấu → ngắt sau dấu câu, tối đa 4 âm tiết. Giữ mốc từng chữ.
import { writeFileSync, readFileSync } from 'fs';
import { pathToFileURL } from 'url';
const [src, out, marks] = process.argv.slice(2);
const { CAPTIONS } = await import(pathToFileURL(src).href);
const W = [];
for (const c of CAPTIONS) c[2].split(' ').forEach((w, i) => W.push({ w, s: c[3][i][0], e: c[3][i][1], end: c[1] }));
const n = (s) => s.toLowerCase().replace(/[.,!?…:;"“”]/g, '');
const M = readFileSync(marks, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('|').map((x) => x.trim().split(/\s+/).filter(Boolean)));
const G = []; let i = 0;
while (i < W.length) {
  const m = M.find((sent) => { const f = sent.flat(); return f.every((x, j) => W[i + j] && n(W[i + j].w) === n(x)); });
  if (m) { for (const part of m) { G.push(W.slice(i, i + part.length)); i += part.length; } continue; }
  const cur = [];
  while (i < W.length) { cur.push(W[i]); const p = /[.,!?…:;]$/.test(W[i].w); i++; if (p || cur.length >= 4) break; }
  G.push(cur);
}
const L = G.map((g, k) => { const last = g[g.length - 1]; const t1 = Math.min(last.end, G[k + 1] ? G[k + 1][0].s : last.end); return [g[0].s, +Math.max(t1, last.e).toFixed(2), g.map((x) => x.w).join(' '), g.map((x) => [x.s, x.e])]; });
writeFileSync(out, '// Phụ đề ep003b: cụm 1–3 từ kiểu blocky (từ captions.js của ep003 + phu-de-cum.txt, giữ mốc từng chữ).\nexport const CAPTIONS = ' + JSON.stringify(L) + ';\n');
console.log(CAPTIONS.length, '→', L.length); console.log(L.slice(0, 40).map((x) => x[0] + ' ' + x[2]).join(' | '));
