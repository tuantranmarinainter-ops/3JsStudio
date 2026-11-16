#!/usr/bin/env node
// ep5t-boi-canh.mjs — sinh engine/envs/ep5t-<id>.js (8 bối cảnh tập test ep005t) từ kich-ban/ep005t/boi-canh/<id>.json.
// Dùng: node tools/ep5t-boi-canh.mjs [--nhom nha]   (mặc định: mọi nhóm model đã nhập; hiện có nhóm NHÀ)
// Mỗi file env chỉ chứa DỮ LIỆU (mốc + bảng model đã chốt) rồi gọi engine/envs/ep5t-chung.js. Model thiếu/?rb=0 → bản khối.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NGUON = path.join(ROOT, 'kich-ban', 'ep005t', 'boi-canh');

// Model nhóm NHÀ đã chốt (thư viện asset 16/11) theo mốc: id model trong kho · ry (xoay quanh Y; nhà phía +Z quay mặt −Z = π)
const NHA = {
  'choi': { vach: { id: 'nhap/ep5t-nha-go-vach' }, cua: { id: 'nhap/ep5t-cua-go-doi' }, 'cua-so': { id: 'nhap/ep5t-cua-so-go' } },
  'hang-rao': { 'tuong-sau-nha': { id: 'nhap/ep5t-nha-lung-ga', ry: Math.PI } },   // 'tuong-qt' (Town houses 455202696) để khối: model là CẢ DÃY nhà 33×63×476 stud, ép vào 1 nhà thì méo — xem báo cáo
  'pho-chinh': {
        'nha-cindy': { id: 'nhap/ep5t-nha-tim-than', ry: Math.PI }, 'nha-nam-dong': { id: 'polyfork/two-story-house-40f6dc', ry: Math.PI },
    'cua-ga': { id: 'nhap/ep5t-cua-go-doi' }, 'cua-cindy': { id: 'nhap/ep5t-cua-go-doi', ry: Math.PI },
    'cuaso-ga': { id: 'nhap/ep5t-cua-so-go', ry: Math.PI / 2 }, 'cuaso-cindy': { id: 'nhap/ep5t-cua-so-go', ry: -Math.PI / 2 },
  },
  'quang-truong': { 'day-nha-nam': { id: 'polyfork/two-story-house-40f6dc', ry: Math.PI }, 'chan-thap': { id: 'polyfork/water-tower-7eb7ec', vung: 'x -4..4, y 0..30, z -17..-9' } },
  'thap-nuoc': { 'chan-sat': { id: 'polyfork/water-tower-7eb7ec', vung: 'x -5..5, y 0..30, z -9..1' }, bon: { id: 'polyfork/water-tower-7eb7ec', bo: true } },
  'tiem-banh': { 'mat-tien': { id: 'nhap/ep5t-tiem-banh-mat-tien' }, hien: { id: 'nhap/ep5t-mai-hien', mong: true } },
};
const NHOM = { nha: NHA };

const arg = process.argv.slice(2); const nhomChon = arg.includes('--nhom') ? arg[arg.indexOf('--nhom') + 1] : null;
const bang = Object.entries(NHOM).filter(([k]) => !nhomChon || k === nhomChon).map(([, v]) => v);
let n = 0;
for (const f of fs.readdirSync(NGUON).filter((x) => x.endsWith('.json')).sort()) {
  const id = f.replace(/\.json$/, '');
  const m = JSON.parse(fs.readFileSync(path.join(NGUON, f), 'utf8'));
  const MODELS = Object.assign({}, ...bang.map((b) => b[id] || {}));
  const ASSETS = [...new Set(Object.values(MODELS).map((x) => x.id))];
  const DATA = { id, kichThuoc: m.kichThuoc, trongCum: m.trongCum || null, moc: (m.moc || []).map(({ id: i, ten, vung, mau, bat }) => ({ id: i, ten, vung, mau, ...(bat === false ? { bat } : {}) })), MODELS };
  const out = `// Bối cảnh 'ep5t-${id}' (tập test ep005t) — SINH TỰ ĐỘNG bởi tools/ep5t-boi-canh.mjs từ kich-ban/ep005t/boi-canh/${id}.json; đừng sửa tay (sửa bảng NHA trong tool).
// Dựng khối theo danh sách mốc + model nhóm NHÀ đã chốt (?rb=0 → bản khối). Logic: engine/envs/ep5t-chung.js.
import build, { LIGHT as L } from './ep5t-chung.js';
export const LIGHT = L;
export const ASSETS = ${JSON.stringify(ASSETS)};
export const DATA = ${JSON.stringify(DATA)};
export default function (g, e, H) { return build(g, e, H, DATA); }
`;
  fs.writeFileSync(path.join(ROOT, 'engine', 'envs', `ep5t-${id}.js`), out, 'utf8'); n++;
}
console.log(`đã sinh ${n} env ep5t-<id>.js`);
