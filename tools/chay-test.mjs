#!/usr/bin/env node
// chay-test.mjs — chạy test theo nhóm, ÍT LUỒNG để không kẹt CPU (xem docs/handoff/giam-tai-cpu.md).
//   node tools/chay-test.mjs nhanh    python unittest + mọi *.test.mjs TRỪ nhóm Chrome (tools/tests/chrome.list), --test-concurrency=4
//   node tools/chay-test.mjs chrome   chỉ nhóm Chrome, --test-concurrency=2
//   node tools/chay-test.mjs          = nhanh rồi chrome, tuần tự (đây là `npm test`)
// Trước và sau (kể cả khi lỗi) dọn Chrome ẩn mồ côi (chỉ cha đã chết; tools/don-chrome.mjs).
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { don } from './don-chrome.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = join(ROOT, 'tools', 'tests');
export const nhomChrome = () => readFileSync(join(TESTS, 'chrome.list'), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
export const tatCa = () => readdirSync(TESTS).filter((f) => f.endsWith('.test.mjs')).sort();

const chay = (cmd, args) => spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' }).status ?? 1;
const node = (conc, files) => chay(process.execPath, ['--test', `--test-concurrency=${conc}`, ...files.map((f) => join('tools', 'tests', f))]);

function main() {
  const mode = process.argv[2] || 'tat-ca';
  if (!['nhanh', 'chrome', 'tat-ca'].includes(mode)) { console.error('Dùng: node tools/chay-test.mjs [nhanh|chrome]'); process.exit(2); }
  const lc = new Set(nhomChrome()), nhanh = tatCa().filter((f) => !lc.has(f)), chrome = tatCa().filter((f) => lc.has(f));
  let bad = 0; const t0 = Date.now();
  try { don({ xoa: true, log: () => {} }); } catch { /* không dọn được thì thôi */ }
  try {
    if (mode !== 'chrome') {
      bad += chay('python', ['-m', 'unittest', 'discover', '-s', 'tools/kb/tests']) ? 1 : 0;
      bad += node(4, nhanh) ? 1 : 0;
    }
    if (mode !== 'nhanh') bad += node(2, chrome) ? 1 : 0;
  } finally {
    try { don({ xoa: true }); } catch { /* bỏ */ }
    console.error(`chay-test ${mode}: ${bad ? 'CÓ NHÓM LỖI' : 'đạt'} — ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  process.exit(bad ? 1 : 0);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
