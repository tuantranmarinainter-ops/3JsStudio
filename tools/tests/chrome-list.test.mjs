// Mọi file test mở Chrome (launchBrowser hoặc spawn công cụ có Chrome) phải nằm trong tools/tests/chrome.list.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nhomChrome, tatCa } from '../chay-test.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CONG_CU_CHROME = ['look', 'shaders', 'kiem-luat', 'ghi-cong', 'bundle', 'export-test', 'render-local', 'mau-duyet', 'kiem-chuyen-dong', 'xuat'];

test('chrome.list: file test dùng Chrome đều có trong danh sách, và danh sách không trỏ file ma', () => {
  const ds = new Set(nhomChrome());
  for (const f of ds) assert.ok(fs.existsSync(path.join(dir, f)), `chrome.list nêu ${f} nhưng không có file`);
  const thieu = [];
  for (const f of tatCa()) {
    if (f === 'chrome-list.test.mjs') continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const gia = src.includes('LAM_PHIM_GIA');   // lệnh con giả, không mở Chrome
    const dung = !gia && (src.includes('launchBrowser(') || (src.includes('spawnSync') && CONG_CU_CHROME.some((t) => src.includes(t + '.mjs'))));
    if (dung && !ds.has(f)) thieu.push(f);
  }
  assert.deepEqual(thieu, [], `thêm vào tools/tests/chrome.list: ${thieu.join(', ')}`);
});
