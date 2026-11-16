import test from 'node:test';
import assert from 'node:assert/strict';
import { chromeMoCoi } from '../don-chrome.mjs';

const PW = '--remote-debugging-pipe --user-data-dir=C:\Users\A\AppData\Local\Temp\playwright_chromiumdev_profile-AbC123 --headless';
const P = (ProcessId, ParentProcessId, Name, CommandLine = '', Ms = 1000) => ({ ProcessId, ParentProcessId, Name, CommandLine, Ms });

test('don-chrome: Chrome thường của người dùng không bao giờ bị liệt kê (kể cả khi cha đã chết)', () => {
  const procs = [P(10, 999, 'chrome.exe', '"C:\Chrome\chrome.exe" --profile-directory=Default')];
  assert.deepEqual(chromeMoCoi(procs), []);
});
test('don-chrome: Chrome playwright có cha node còn sống → giữ', () => {
  assert.deepEqual(chromeMoCoi([P(1, 0, 'node.exe', 'node look.mjs', 500), P(10, 1, 'chrome.exe', PW, 1000)]), []);
});
test('don-chrome: Chrome playwright cha đã chết → mồ côi; tiến trình con --type= không bị tính riêng', () => {
  const r = chromeMoCoi([P(10, 999, 'chrome.exe', PW), P(11, 10, 'chrome.exe', PW + ' --type=renderer')]);
  assert.equal(r.length, 1); assert.equal(r[0].pid, 10);
});
test('don-chrome: PID cha bị dùng lại (cha sinh sau con) hoặc cha không phải node → mồ côi', () => {
  assert.equal(chromeMoCoi([P(1, 0, 'node.exe', 'x', 5000), P(10, 1, 'chrome.exe', PW, 1000)]).length, 1);
  assert.equal(chromeMoCoi([P(1, 0, 'explorer.exe', 'x', 500), P(10, 1, 'chrome.exe', PW, 1000)]).length, 1);
});
test('don-chrome: Chrome có remote-debugging-pipe nhưng hồ sơ lạ (vd. công cụ khác) → không đụng', () => {
  assert.deepEqual(chromeMoCoi([P(10, 999, 'chrome.exe', '--remote-debugging-pipe --user-data-dir=C:\Users\A\khac')]), []);
});
