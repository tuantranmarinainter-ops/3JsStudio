// Semaphore Chrome: tối đa N ô, ô của tiến trình chết được thu hồi, chạy lồng không kẹt. Không mở Chrome thật.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SEM = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'chrome-sem.mjs')).href;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-sem-'));
// tiến trình con: xin ô, in "GOT", giữ `ms` rồi thả
const kich = (dir, ms, extraEnv = {}) => spawn(process.execPath, ['-e',
  `import(${JSON.stringify(SEM)}).then(async m=>{const o=await m.giuO({dir:${JSON.stringify(dir)},toiDa:2,cho:30,log(){}});console.log('GOT');await new Promise(r=>setTimeout(r,${ms}));o.tha();console.log('DONE')})`],
  { env: { ...process.env, CHROME_O_CHA: '', CHROME_KHOA: '', ...extraEnv }, stdio: ['ignore', 'pipe', 'inherit'] });
const doi = (p, tu) => new Promise((ok) => { let b = ''; p.stdout.on('data', (d) => { b += d; if (b.includes(tu)) ok(true); }); p.on('close', () => ok(false)); });
const dem = (dir) => fs.readdirSync(dir).filter((f) => /^o-\d+\.lock$/.test(f)).length;

test('chrome-sem: 4 tiến trình xin cùng lúc với N=2 → không bao giờ quá 2 ô', async () => {
  const dir = tmp(); let max = 0;
  const ps = [0, 1, 2, 3].map(() => kich(dir, 1200));
  const t = setInterval(() => { max = Math.max(max, dem(dir)); }, 50);
  await Promise.all(ps.map((p) => new Promise((ok) => p.on('close', ok))));
  clearInterval(t);
  assert.ok(max >= 1 && max <= 2, `max ô = ${max}`);
  assert.equal(dem(dir), 0, 'thả hết ô sau khi xong');
});

test('chrome-sem: ô của tiến trình bị giết được thu hồi', async () => {
  const dir = tmp();
  const a = kich(dir, 60000), b = kich(dir, 60000);
  await doi(a, 'GOT'); await doi(b, 'GOT');
  assert.equal(dem(dir), 2);
  const c = kich(dir, 100);            // phải chờ
  await new Promise((r) => setTimeout(r, 1000));
  a.kill('SIGKILL');                   // tiến trình giữ ô chết đột ngột → không kịp thả
  assert.ok(await doi(c, 'GOT'), 'tiến trình đang chờ phải nhận được ô của tiến trình đã chết');
  b.kill('SIGKILL');
});

test('chrome-sem: chạy lồng (CHROME_O_CHA = pid cha còn sống) dùng chung ô, không xin thêm', async () => {
  const dir = tmp();
  const a = kich(dir, 60000), b = kich(dir, 60000);
  await doi(a, 'GOT'); await doi(b, 'GOT');   // hết ô
  const con = kich(dir, 50, { CHROME_O_CHA: String(a.pid) });
  assert.ok(await doi(con, 'GOT'), 'con của tiến trình giữ ô không bị kẹt');
  a.kill('SIGKILL'); b.kill('SIGKILL');
});
