import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rmsDb, phanTich, SR } from '../mo-dau.mjs';
import { khoangTrong, gomPhu } from '../phu-nen.mjs';
import { phanLoai, quet, soSanh } from '../lock.mjs';

// PCM tổng hợp: mảng [giây, biên độ 0..1] nối nhau, sóng vuông ±biên độ → RMS = biên độ
const pcm = (seg) => { const o = []; for (const [s, a] of seg) for (let i = 0; i < Math.round(s * SR); i++) o.push(Math.round((i % 2 ? 1 : -1) * a * 32767)); return Int16Array.from(o); };

test('rmsDb: sóng vuông biên độ 0.5 ≈ -6 dBFS, im lặng = -120', () => {
  const d = rmsDb(pcm([[0.1, 0.5], [0.1, 0]]));
  assert.equal(d.length, 10);
  assert.ok(Math.abs(d[0] - -6.02) < 0.1);
  assert.equal(d[9], -120);
});

test('mở đầu: tiếng ngay từ 0 ms → pass', () => {
  const r = phanTich(rmsDb(pcm([[3, 0.3]])));
  assert.equal(r.onsetMs, 0);
  assert.equal(r.status, 'pass');
});

test('mở đầu: lặng 300 ms đầu → khởi âm trễ, needs_review', () => {
  const r = phanTich(rmsDb(pcm([[0.3, 0], [2.7, 0.3]])));
  assert.equal(r.onsetMs, 300);
  assert.equal(r.status, 'needs_review');
  assert.match(r.flags[0], /KHOI_AM_TRE/);
});

test('mở đầu: một cửa sổ lẻ không đủ (cần 2 liên tiếp)', () => {
  const r = phanTich(rmsDb(pcm([[0.2, 0], [0.02, 0.3], [0.2, 0], [2.58, 0.3]])));
  assert.equal(r.onsetMs, 420);
});

test('mở đầu: lặng giữa > 600 ms bị cờ, đúng 600 ms thì không', () => {
  const dai = phanTich(rmsDb(pcm([[0.5, 0.3], [0.7, 0], [1.8, 0.3]])));
  assert.ok(dai.flags.some((f) => f.startsWith('LANG_DAI')));
  const vua = phanTich(rmsDb(pcm([[0.5, 0.3], [0.6, 0], [1.9, 0.3]])));
  assert.equal(vua.status, 'pass');
});

test('mở đầu: toàn lặng → không có khởi âm', () => {
  const r = phanTich(rmsDb(pcm([[3, 0]])));
  assert.equal(r.onsetMs, null);
  assert.equal(r.status, 'needs_review');
});

test('phủ nền: không khoảng trống → rỗng; trống > 0.5 s → báo', () => {
  assert.deepEqual(khoangTrong([[0, 5], [4, 10]], 10), []);
  assert.deepEqual(khoangTrong([[0.3, 5], [6, 10]], 10), [[5, 6]]);
  assert.deepEqual(khoangTrong([[1, 5]], 8), [[0, 1], [5, 8]]);
  assert.deepEqual(khoangTrong([[0, 4.7], [5, 10]], 10), []);   // hở 0.3 s: bỏ qua
});

test('phủ nền: quiet có reason được tính, thiếu reason thì không', () => {
  const g = gomPhu({ sfxLayers: { nen: { items: [[0, 2, 'x']] } }, plan: { segments: [{ from: 6, to: 10 }] },
    layers: { quiet: [{ from: 2, to: 6, reason: 'im lặng chủ ý' }, { from: 0, to: 1 }] } });
  assert.deepEqual(khoangTrong(g.covers, 10), []);
  assert.equal(g.quietThieuLyDo.length, 1);
  const g2 = gomPhu({ sfxLayers: { nen: { items: [[0, 2, 'x']] } }, plan: { segments: [{ from: 6, to: 10 }] }, layers: {} });
  assert.deepEqual(khoangTrong(g2.covers, 10), [[2, 6]]);
});

test('lock: bản đồ lớp', () => {
  assert.equal(phanLoai('narration.mp3'), 'giong');
  assert.equal(phanLoai('narration_en.json'), 'giong');
  assert.equal(phanLoai('voices/vi/a.ogg'), 'giong');
  assert.equal(phanLoai('sfx_nen.ogg'), 'nen');
  assert.equal(phanLoai('sfx/steps.json'), 'buoc-chan');
  assert.equal(phanLoai('sfx/cues_s001-s050.json'), 'khoanh-khac');
  assert.equal(phanLoai('music_nhac.ogg'), 'nhac');
  assert.equal(phanLoai('shots.js'), null);
});

test('lock: phát hiện đổi / thiếu / mới trên thư mục tạm', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-'));
  fs.mkdirSync(path.join(d, 'music')); fs.mkdirSync(path.join(d, 'voices'));
  fs.writeFileSync(path.join(d, 'narration.mp3'), 'a');
  fs.writeFileSync(path.join(d, 'sfx_nen.ogg'), 'b');
  fs.writeFileSync(path.join(d, 'music/plan.json'), '{}');
  fs.writeFileSync(path.join(d, 'shots.js'), 'x');   // không phải âm thanh
  const khoa = quet(d);
  assert.equal(khoa.length, 3);
  assert.deepEqual(soSanh(khoa, quet(d)), { doi: [], thieu: [], moi: [] });
  fs.writeFileSync(path.join(d, 'shots.js'), 'y');   // sửa lớp hình → vẫn nguyên vẹn
  assert.deepEqual(soSanh(khoa, quet(d)), { doi: [], thieu: [], moi: [] });
  fs.writeFileSync(path.join(d, 'narration.mp3'), 'A');
  fs.rmSync(path.join(d, 'sfx_nen.ogg'));
  fs.writeFileSync(path.join(d, 'voices/v.ogg'), 'v');
  const r = soSanh(khoa, quet(d));
  assert.deepEqual(r.doi.map((f) => f.path), ['narration.mp3']);
  assert.deepEqual(r.thieu.map((f) => f.path), ['sfx_nen.ogg']);
  assert.deepEqual(r.moi.map((f) => f.path), ['voices/v.ogg']);
  assert.deepEqual(soSanh(khoa.filter((f) => f.layer === 'nhac'), quet(d, ['nhac'])), { doi: [], thieu: [], moi: [] });
  fs.rmSync(d, { recursive: true, force: true });
});
