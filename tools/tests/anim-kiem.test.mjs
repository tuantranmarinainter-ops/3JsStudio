// tools/anim-kiem.mjs — phân tích thuần trên dữ liệu giả: đi đúng (chân đỡ đứng yên) vs trượt, đứng im sai, sin máy móc, giật.
import test from 'node:test';
import assert from 'node:assert/strict';
import { phanTich, thuanDieuHoa } from '../anim-kiem.mjs';

const FPS = 30;
function make(fn, n = 36, shot = 's001', actor = 'x') {
  const frames = [];
  for (let k = 0; k < n; k++) { const t = k / FPS; frames.push({ t, shot, a: { [actor]: { view: true, ...fn(t, k) } } }); }
  return { v: 1, fps: FPS, shots: [{ id: shot, t0: 0, t1: n / FPS }], frames };
}
const J = (a) => ({ torso: [0, 0, 0], head: [0, 0, 0], la: [a, 0, 0], ra: [-a, 0, 0], ll: [-a, 0, 0], rl: [a, 0, 0] });

test('thuần điều hoà: sin = ~1, sin + nhiễu bậc cao < sin', () => {
  const s = Array.from({ length: 40 }, (_, i) => Math.sin(i / 40 * 2 * Math.PI * 2));
  const m = s.map((v, i) => v + 0.6 * Math.sin(i / 40 * 2 * Math.PI * 7) + 0.4 * Math.sin(i / 40 * 2 * Math.PI * 11));
  assert.ok(thuanDieuHoa(s) > 0.97);
  assert.ok(thuanDieuHoa(m) < thuanDieuHoa(s) - 0.2);
});

test('chân đứng yên khi đi đúng → không trượt; cả người trôi → trượt', () => {
  // đúng: chân trái chạm đất đứng yên tại x=0, chân phải nhấc
  const ok = make((t) => ({ root: [t, 0, 0], j: J(0), lf: [0, 0, 0], rf: [t * 2, 0.4, 0], gl: 0, gr: 0 }));
  const bad = make((t) => ({ root: [t * 4, 0, 0], j: J(0), lf: [t * 4, 0, 0], rf: [t * 4, 0, 0.5], gl: 0, gr: 0 }));
  assert.equal(phanTich(ok).rows[0].truot.ti, 0);
  assert.ok(phanTich(bad).rows[0].truot.ti > 0.9);
  assert.ok(phanTich(bad).rows[0].loi.some((s) => s.startsWith('trượt')));
});

test('lún và lơ lửng', () => {
  const lun = make(() => ({ root: [0, 0, 0], j: J(0), lf: [0, -0.4, 0], rf: [1, -0.4, 0], gl: 0, gr: 0 }));
  const lo = make(() => ({ root: [0, 0, 0], j: J(0), lf: [0, 0.6, 0], rf: [1, 0.6, 0], gl: 0, gr: 0 }));
  assert.ok(phanTich(lun).rows[0].lun.ti > 0.9);
  assert.ok(phanTich(lo).rows[0].lo.ti > 0.9);
  assert.equal(phanTich(lo, { nhay: ['s001:x'] }).rows[0].lo.ti, 0);
});

test('phải đứng im mà bước tại chỗ → lỗi; đứng im thật → không lỗi; bất động khi không cố ý → đơ', () => {
  const step = make((t) => ({ root: [0, 0, 0], j: J(0.7 * Math.sin(t * 4 * Math.PI)), lf: [0, 0, 0], rf: [1, 0, 0], gl: 0, gr: 0 }));
  const still = make(() => ({ root: [0, 0, 0], j: J(0.3), lf: [0, 0, 0], rf: [1, 0, 0], gl: 0, gr: 0 }));
  assert.ok(phanTich(step, { dungIm: ['s001:x'] }).rows[0].loi.some((s) => s.includes('phải đứng im')));
  assert.equal(phanTich(still, { dungIm: ['s001:x'] }).rows[0].loi.length, 0);
  assert.ok(phanTich(still).rows[0].loi.some((s) => s.startsWith('đơ')));
  // sin thuần + tay chân đối xứng → máy móc
  assert.ok(phanTich(step).rows[0].loi.some((s) => s.startsWith('máy móc')));
});

test('giật: khớp nhảy cóc giữa 2 khung', () => {
  const g = make((t, k) => ({ root: [0, 0, 0], j: J(k === 20 ? 1.5 : 0.1 * Math.sin(t * 3)), lf: [0, 0, 0], rf: [1, 0, 0], gl: 0, gr: 0 }));
  assert.ok(phanTich(g).rows[0].giat.lan >= 1);
});

test('số giảm đúng lúc chân chạm đất → lệch 0; tay cách vật', () => {
  const d = make((t, k) => {
    const up = Math.floor(k / 10) % 2 === 1;   // chân trái nhấc ở khung 10–19, chạm lại ở 20
    return { root: [0, 0, 0], j: J(0), lf: [0, up ? 0.5 : 0, 0], rf: [1, 0, 0], gl: 0, gr: 0, num: String(100 - (k >= 20 ? 1 : 0)), grip: { rh: 0.2 } };
  });
  const r = phanTich(d, { grip: [{ shot: 's001', actor: 'x', hand: 'rh', target: 'v' }] }).rows[0];
  assert.equal(r.khopSo.lechMax, 0);
  assert.equal(r.tay.tb, 0.2);
});
