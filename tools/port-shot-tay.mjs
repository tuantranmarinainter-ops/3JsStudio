#!/usr/bin/env node
// port-shot-tay: chép phần RÀ TAY (cam, cast, w) từ một shots.js cũ sang shots.js mới cho shot cùng id + cùng (type, who, at, anim, face).
//   node tools/port-shot-tay.mjs <shots_cu.js> <shots_moi.js> [--kiem]
// Giữ nguyên dur/line/lời; mỗi shot 1 dòng, ghi chú cuối dòng giữ nguyên. In danh sách shot đã chép + shot mới/đổi (không chép).
import fs from 'node:fs';
const [cu, moi] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const kiem = process.argv.includes('--kiem');
const imp = async (f) => { const t = fs.readFileSync(f, 'utf8'); return { t, m: await import('data:text/javascript;base64,' + Buffer.from(t).toString('base64')) }; };
const a = await imp(cu), b = await imp(moi);
const old = new Map(a.m.SHOTS.map((s) => [s.id, s]));
const lines = b.t.split(/\r?\n/);
const i0 = lines.findIndex((l) => l.startsWith('export const SHOTS'));
const rows = lines.slice(i0 + 1).filter((l) => /^ {2}\{/.test(l));
const notes = rows.map((l) => { const k = l.lastIndexOf('},  // '); return k >= 0 ? l.slice(k + 7) : ''; });
const KEY = ['type', 'who', 'at', 'anim', 'face', 'obj', 'read'];
const chep = [], moiSh = [];
const res = b.m.SHOTS.map((s) => {
  const o = old.get(s.id);
  if (!o || KEY.some((k) => JSON.stringify(o[k]) !== JSON.stringify(s[k]))) { moiSh.push(s.id); return s; }
  const n = { ...s }; let did = false;
  for (const k of ['cam', 'cast', 'w']) if (o[k] !== undefined && JSON.stringify(o[k]) !== JSON.stringify(s[k])) { n[k] = o[k]; did = true; }
  if (did) chep.push(s.id);
  return n;
});
console.log(`đã chép rà tay: ${chep.length} shot (${chep.join(' ')})\nshot mới/đổi, KHÔNG chép: ${moiSh.length} (${moiSh.join(' ')})`);
if (!kiem) {
  const obj = (s) => '{ ' + Object.entries(s).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ') + ' }';
  const out = res.map((s, i) => `  ${obj(s)},${notes[i] ? '  // ' + notes[i] : ''}`);
  fs.writeFileSync(moi, lines.slice(0, i0 + 1).join('\n') + '\n' + out.join('\n') + '\n];\n', 'utf8');
}
