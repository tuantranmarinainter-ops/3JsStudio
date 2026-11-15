// Trạm 7: khối xám từ danh sách mốc. Phần 1 thuần (đọc vùng), phần 2 chụp thật bằng trình duyệt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { docVung, docBoiCanh } from '../kiem/khoi-xam-doc.mjs';
import { khoiXam } from '../khoi-xam.mjs';

const FILE = resolve(import.meta.dirname, 'fixtures', 'boi-canh-mau', 'moc-nha-may-ngoai.json');
const bc = JSON.parse(readFileSync(FILE, 'utf8'));

test('docVung: khoảng, điểm, ±, lần đầu thắng', () => {
  assert.deepEqual(docVung('x -0.5..2.1, y 0..1.4, z -11.25..-8.85 (SÁT tường)'), { x: [-0.5, 2.1], y: [0, 1.4], z: [-11.25, -8.85] });
  assert.deepEqual(docVung('z -11.75..-22.75, x ±8'), { z: [-22.75, -11.75], x: [-8, 8] });
  const p = docVung('x -5.5..5.5, y 5.8..12, mặt kính z -11.5');
  assert.deepEqual([p.z[0], p.z[1]], [-11.6, -11.4]);
  assert.deepEqual(docVung('trái: ống ngang y 3.2 x -10.5..-3.9; ống đứng x -4.3').x, [-10.5, -3.9]);
  assert.deepEqual(docVung('chỉ chữ, không số'), {});
});

test('thùng đọc đúng: x -0.5..2.1, y 0..1.4', () => {
  const t = docBoiCanh(bc).hop.find((h) => h.id === 'thung');
  assert.deepEqual([t.min[0], t.max[0], t.min[1], t.max[1]], [-0.5, 2.1, 0, 1.4]);
  assert.deepEqual([t.min[2], t.max[2]], [-11.25, -8.85]);
});

test('số hộp + số mốc không đọc được = số mốc có vùng; mốc thiếu số không bị đoán', () => {
  const d = docBoiCanh(bc), coVung = bc.moc.filter((m) => m.vung);
  const moc = new Set(d.khongDoc.map((k) => k.id));
  assert.equal(d.hop.length + coVung.filter((m) => moc.has(m.id)).length, coVung.length);
  assert.ok(d.hop.length >= 5, 'phải dựng được ít nhất tường, kính, bậu, thùng, sân');
  for (const id of ['tuong', 'kinh', 'bau', 'thung', 'san']) assert.ok(d.hop.some((h) => h.id === id), id);
  assert.ok(moc.has('hop-cau-dao'), 'tâm [..] không đủ trục → phải liệt kê, không dựng');
  assert.equal(d.nom.length, 2); assert.equal(d.nom[0].cao, 5.48);
  assert.equal(d.khoi.length, 1);
  assert.deepEqual(d.san, { rong: 32, sau: 24 });
});

test('khoiXam: ghi 2 ảnh 9:16 (trình duyệt)', async () => {
  const out = mkdtempSync(join(tmpdir(), 'khoi-xam-'));
  try {
    const r = await khoiXam(FILE, out, { w: 270, h: 480 });
    assert.equal(r.anh.length, 2);
    for (const f of r.anh) {
      assert.ok(existsSync(f) && statSync(f).size > 2000, f);
      const b = readFileSync(f); assert.equal(b.readUInt32BE(16), 270); assert.equal(b.readUInt32BE(20), 480);
    }
    assert.ok(r.anh[0].endsWith('nha-may-ngoai_tren-cao.png') && r.anh[1].endsWith('nha-may-ngoai_ngang-mat.png'));
    assert.notDeepEqual(readFileSync(r.anh[0]), readFileSync(r.anh[1]));
  } finally { rmSync(out, { recursive: true, force: true }); }
});
