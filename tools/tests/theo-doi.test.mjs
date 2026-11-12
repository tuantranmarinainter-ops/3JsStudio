import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { thuMucKiem, datBuoc, ghiNhatKy } from '../kiem/trang-thai.mjs';

const TOOL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'theo-doi.mjs');
const ghi = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof s === 'string' ? s : JSON.stringify(s)); };

function dung({ luat = true } = {}) {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'task7-td-'));
  ghi(path.join(goc, 'episodes/ep9/shots.js'), `export const SHOTS = [
 { id: 's001', f: [0, 29], line: 1, type: 'establish' },
 { id: 's002', f: [30, 74], line: 2, type: 'closeup' },
 { id: 's003', dur: 2, line: 2 } ];`);
  ghi(path.join(goc, 'episodes/ep9/narration.json'), { dry: false, total: 5, lines: [{ line: 1, text: 'Câu một', start: 0, end: 1, dur: 1 }, { line: 2, text: 'Câu hai', start: 1, end: 3, dur: 2 }] });
  if (luat) ghi(path.join(thuMucKiem('ep9', { goc }), 'luat.json'), {
    ep: 'ep9', trang: 'x', luc: 'y', coMeasure: true,
    shots: {
      s001: { type: 'establish', dur: 1, khung: [0, 15, 29], luat: {}, loi: [] },
      s002: { type: 'closeup', dur: 1.5, khung: [30, 52, 74], luat: { L4: { ok: false } }, loi: ['L4'] },
      s003: { type: 'x', dur: 2, khung: [75, 90, 134], luat: {}, loi: [] },
    },
    tong: { soShot: 3, shotLoi: 1, theoLuat: { L4: { loi: 1, tyLe: 0.33, skip: 0 } } }, goi: { can: false, lyDo: [] },
  });
  for (const r of ['01_shots/s002_f0052.jpg', '03_truoc-sau/s002_L4_v1.jpg']) ghi(path.join(goc, 'output/ep9/duyet', r), 'x');
  datBuoc('ep9', 'shot', { hash: 'h', xong: true, goi: 2 }, { goc });
  ghiNhatKy('ep9', { buoc: 'ra-loi', shot: 's002', luat: 'L4', hanh_dong: 'sua' }, { goc });
  return goc;
}
const chay = (goc, ...a) => spawnSync(process.execPath, [TOOL, 'ep9', '--goc', goc, ...a], { encoding: 'utf8' });

test('HTML: 3 hàng x 8 cột, offline, ảnh tương đối', () => {
  const goc = dung();
  const r = chay(goc); assert.equal(r.status, 0, r.stderr);
  const h = fs.readFileSync(path.join(goc, 'dist/ep9_theo-doi.html'), 'utf8');
  assert.equal((h.match(/<tr class="shot[ "]/g) || []).length, 3);
  const hang = h.match(/<tr class="shot"[\s\S]*?<\/tr>/)[0];
  assert.equal((hang.match(/<td class="buoc"/g) || []).length, 8);
  assert.ok(!h.includes('http'));
  assert.ok(h.includes('s002'));
  assert.ok(h.includes('../output/ep9/duyet/01_shots/s002_f0052.jpg'));
  assert.ok(h.includes('../output/ep9/duyet/03_truoc-sau/s002_L4_v1.jpg'));
  assert.ok(h.includes('Câu hai'));
});

test('--json đủ 4 khoá, token từ transcript', () => {
  const goc = dung();
  const tr = path.join(goc, 'phien');
  const u = (ts, i, o) => JSON.stringify({ timestamp: ts, message: { usage: { input_tokens: i, output_tokens: o, cache_read_input_tokens: 10, cache_creation_input_tokens: 5 } } });
  ghi(path.join(tr, 'a.jsonl'), u('2026-11-12T08:10:00Z', 1, 2) + '\n' + u('2026-11-12T08:50:00Z', 3, 4) + '\n{hong');
  const lap = JSON.stringify({ timestamp: '2026-11-12T10:00:00Z', requestId: 'r1', message: { id: 'm1', usage: { input_tokens: 100, output_tokens: 0 } } });
  ghi(path.join(tr, 'c.jsonl'), lap + '\n' + lap + '\n' + lap + '\n');
  ghi(path.join(tr, 'subagents/b.jsonl'), u('2026-11-12T09:00:00Z', 5, 6) + '\n');
  const r = chay(goc, '--json', '--transcript', tr); assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(j).sort(), ['buoc', 'loi', 'tap', 'token']);
  assert.equal(j.tap.soBuoc, 8); assert.equal(j.tap.soShot, 3); assert.equal(j.tap.shotQua, 2); assert.equal(j.tap.loiCon, 1); assert.equal(j.tap.soLanGoi, 2);
  assert.equal(j.token.length, 3);
  assert.equal(j.token.find((t) => t.gio.startsWith('2026-11-12T10')).token, 100);
  assert.equal(j.token.find((t) => t.gio.startsWith('2026-11-12T08')).token, (1 + 2 + 15) + (3 + 4 + 15));
  assert.deepEqual(j.loi, [{ ep: 'ep9', luat: 'L4', loi: 1, tyLe: 0.33 }]);
  assert.equal(j.buoc.find((b) => b.buoc === 'shot').xong, true);
  assert.deepEqual(JSON.parse(chay(goc, '--json').stdout).token, []);
});

test('thiếu luat.json vẫn ra trang, mã 0', () => {
  const goc = dung({ luat: false });
  const r = chay(goc); assert.equal(r.status, 0, r.stderr);
  const h = fs.readFileSync(path.join(goc, 'dist/ep9_theo-doi.html'), 'utf8');
  assert.equal((h.match(/<tr class="shot[ "]/g) || []).length, 3);
});

test('ảnh thiếu → ô "·", không link; href mã hoá', () => {
  const goc = dung();
  const h = (chay(goc), fs.readFileSync(path.join(goc, 'dist/ep9_theo-doi.html'), 'utf8'));
  assert.ok(!h.includes('s001_f0000.jpg'));
  assert.ok(!h.includes('s003_f0090.jpg'));
});

test('ep không tồn tại → mã 2, stderr, không ghi file', () => {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'task7-td-'));
  const r = chay(goc);
  assert.equal(r.status, 2); assert.ok(r.stderr.includes('ep9'));
  assert.ok(!fs.existsSync(path.join(goc, 'dist/ep9_theo-doi.html')));
});

test('shots.js hỏng → cảnh báo stderr, vẫn ra trang, mã 0', () => {
  const goc = dung();
  ghi(path.join(goc, 'episodes/ep9/shots.js'), 'export const SHOTS = [ {{{');
  const r = chay(goc); assert.equal(r.status, 0);
  assert.ok(/shots\.js/.test(r.stderr));
  assert.ok(fs.existsSync(path.join(goc, 'dist/ep9_theo-doi.html')));
});
