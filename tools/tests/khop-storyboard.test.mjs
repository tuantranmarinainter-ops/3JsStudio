// Test thước đo khớp bố cục bằng ảnh tổng hợp (không mở trình duyệt).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { diemKhop, huongThayDoi, trangThai, W, H } from '../khop-storyboard.mjs';

// ảnh RGB W×H: nền chuyển sắc + "chủ thể" là hình chữ nhật có vân, tâm (cx,cy), nửa rộng/cao (hw,hh)
function ve({ cx = 0.3, cy = 0.55, hw = 0.12, hh = 0.2, nen = [60, 90, 140], chu = [230, 200, 80], tuongPhan = 1, lat = false } = {}) {
  const a = new Uint8ClampedArray(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (lat ? W - 1 - x : x) / W, v = y / H, i = (y * W + x) * 3;
    const trong = Math.abs(u - cx) < hw && Math.abs(v - cy) < hh;
    const van = trong ? ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 1 : 0.8) : 1;
    for (let c = 0; c < 3; c++) {
      const base = trong ? chu[c] * van : nen[c] * (0.6 + 0.8 * (1 - v));
      a[i + c] = 128 + (base - 128) * tuongPhan;
    }
  }
  return a;
}
const mocLech = ve();

test('hai ảnh giống hệt → điểm ~1', () => {
  const r = diemKhop(mocLech, mocLech, W, H);
  assert.ok(r.diem > 0.98, JSON.stringify(r));
  assert.equal(trangThai(r.diem), 'dat');
});
test('cùng bố cục khác màu / tương phản → vẫn đạt', () => {
  const b = ve({ nen: [140, 70, 60], chu: [60, 160, 200], tuongPhan: 0.6 });
  const r = diemKhop(mocLech, b, W, H);
  assert.ok(r.diem >= 0.7, JSON.stringify(r));
});
test('chủ thể lệch nửa khung → lech hoặc hong', () => {
  const r = diemKhop(mocLech, ve({ cx: 0.8 }), W, H);
  assert.notEqual(trangThai(r.diem), 'dat', JSON.stringify(r));
  assert.ok(r.diem < 0.7);
});
test('chủ thể to gấp đôi → điểm giảm rõ', () => {
  const g = diemKhop(mocLech, mocLech, W, H).diem, r = diemKhop(mocLech, ve({ hw: 0.24, hh: 0.4 }), W, H);
  assert.ok(r.diem < g - 0.1, JSON.stringify(r));
  assert.ok(r.thanhPhan.dienTich < 0.8);
});
test('ảnh đảo trái–phải → giảm', () => {
  const g = diemKhop(mocLech, mocLech, W, H).diem, r = diemKhop(mocLech, ve({ lat: true }), W, H);
  assert.ok(r.diem < g - 0.15, JSON.stringify(r));
});
test('đầu vào xám cũng chạy', () => {
  const xam = new Uint8Array(W * H); for (let i = 0; i < xam.length; i++) xam[i] = mocLech[i * 3];
  const r = diemKhop(xam, xam, W, H);
  assert.ok(r.diem > 0.98 && r.thanhPhan.mau === undefined);
});
test('hướng thay đổi: vào / ra / giữ', () => {
  const nho = ve({ hw: 0.08, hh: 0.12 }), to = ve({ hw: 0.2, hh: 0.32 });
  assert.equal(huongThayDoi(nho, to, W, H).huong, 'vao');
  assert.equal(huongThayDoi(to, nho, W, H).huong, 'ra');
  assert.equal(huongThayDoi(nho, nho, W, H).huong, 'giu');
});

test('CLI: thiếu hình storyboard → tt "thieu" (không mở trình duyệt khi không có shot trong shots.js → thieu)', () => {
  const d = mkdtempSync(join(tmpdir(), 'khop-')), kb = join(d, 'kb'), ep = join(d, 'ep');
  mkdirSync(kb); mkdirSync(ep);
  writeFileSync(join(kb, 'bang-shot.json'), JSON.stringify({ ep: 'thu', shots: [{ id: 's001', hinh: 1 }] }));
  writeFileSync(join(ep, 'shots.js'), 'export const SHOTS = [];');   // shot không có trong tập → không chụp
  writeFileSync(join(ep, 'index.html'), '<html></html>');
  const r = spawnSync(process.execPath, [resolve('tools/khop-storyboard.mjs'), join(ep, 'index.html'), kb, '--out', join(d, 'out')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const kq = JSON.parse(readFileSync(join(kb, 'khop.json'), 'utf8'));
  assert.equal(kq.shots.s001.tt, 'thieu');
  assert.deepEqual(kq.nguong, { dat: 0.7, lech: 0.4 });
  assert.ok(existsSync(join(kb, 'khop.json')));
});
test('CLI: có khung dựng nhưng thiếu hình storyboard → thieu; có đủ → chấm', async () => {
  const sharp = (await import('sharp')).default;
  const d = mkdtempSync(join(tmpdir(), 'khop-')), kb = join(d, 'kb'), ep = join(d, 'ep'), out = join(d, 'out');
  for (const x of [kb, join(kb, 'hinh'), ep, out]) mkdirSync(x, { recursive: true });
  writeFileSync(join(kb, 'bang-shot.json'), JSON.stringify({ ep: 'thu', shots: [{ id: 's001', hinh: 1 }, { id: 's002', hinh: 1 }] }));
  writeFileSync(join(ep, 'shots.js'), 'export const SHOTS = [{id:"s001",dur:1},{id:"s002",dur:1}];');
  writeFileSync(join(ep, 'index.html'), '<html></html>');
  const png = await sharp(Buffer.from(ve()), { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  for (const id of ['s001', 's002']) writeFileSync(join(out, id + '_dau.png'), png);
  writeFileSync(join(kb, 'hinh', 'shot_s001_dau.png'), png);   // s002 thiếu hình
  const r = spawnSync(process.execPath, [resolve('tools/khop-storyboard.mjs'), join(ep, 'index.html'), kb, '--out', out, '--dung-lai'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const kq = JSON.parse(readFileSync(join(kb, 'khop.json'), 'utf8')).shots;
  assert.equal(kq.s001.tt, 'dat'); assert.ok(kq.s001.diem > 0.95);
  assert.equal(kq.s002.tt, 'thieu');
});
