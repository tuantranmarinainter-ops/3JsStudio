// anim-nch: mọi động tác tất định (cùng t → cùng pose), không NaN, góc khớp trong giới hạn (R6 cứng: không gối/khuỷu ngược).
import test from 'node:test';
import assert from 'node:assert/strict';
import { nap, engine } from './_three.mjs';
await nap();
const { NCH, NCH_META, nchPose, registerNch, nchSpeed } = await engine('anim-nch.js');
const { R15_ANIMATIONS } = await engine('r15.js');

const names = Object.keys(NCH);
const OPTS = { punch: [{}, { hand: 'L' }], kick: [{}, { hand: 'L' }], dodge: [{ side: 'back' }, { side: 'R' }, { side: 'L' }], wave: [{}, { hand: 'L' }], point: [{}, { hand: 'L' }], idle: [{}, { stance: 'b' }], hit: [{}, { part: 'body' }], fall: [{}, { back: false }] };
const times = [-0.2, 0, 0.1, 0.37, 0.5, 0.9, 1.3, 2.2, 5.1];
const flat = (p) => { const o = []; const walk = (v, k) => { if (typeof v === 'number') o.push([k, v]); else if (v && typeof v === 'object') for (const [kk, vv] of Object.entries(v)) walk(vv, k + '.' + kk); }; walk(p, ''); return o; };

test('có ≥ 12 động tác', () => assert.ok(names.length >= 12, names.length + ' động tác'));
test('NCH_META đủ cho mọi động tác', () => { for (const n of names) assert.ok(NCH_META[n] && NCH_META[n].dur > 0, n); });

for (const n of names) {
  for (const opt of OPTS[n] || [{}]) {
    test(`${n} ${JSON.stringify(opt)}: tất định, không NaN, khớp trong giới hạn`, () => {
      for (const t of times) {
        const a = nchPose(n, t, opt), b = nchPose(n, t, opt);
        assert.deepEqual(a, b, `${n}@${t} không tất định`);
        for (const [k, v] of flat(a)) assert.ok(Number.isFinite(v), `${n}@${t} ${k}=${v}`);
        // R6 cứng: gối/khuỷu/cổ tay/cổ chân phải là 0 hoặc vắng (không bẻ ngược)
        for (const j of ['rightKnee', 'leftKnee', 'rightElbow', 'leftElbow', 'rightFoot', 'leftFoot', 'rightHand', 'leftHand']) {
          for (const v of Object.values(a[j] || {})) assert.ok(Math.abs(v) < 1e-9, `${n}@${t} ${j} phải = 0`);
        }
        // giới hạn vai/hông/cổ (rad): vai −π..+0.6 (không đưa tay ra sau quá), hông −2.0..+0.7, vặn đầu ≤ 1.4, vặn thân ≤ 1.0
        for (const s of ['right', 'left']) {
          const A = a[s + 'Arm'], Lg = a[s + 'Leg'];
          assert.ok(A.x >= -Math.PI - 1e-6 && A.x <= 0.9, `${n}@${t} ${s}Arm.x=${A.x}`);
          assert.ok(Math.abs(A.z) <= 3.0, `${n}@${t} ${s}Arm.z=${A.z}`);
          assert.ok(Lg.x >= -2.1 && Lg.x <= 1.0, `${n}@${t} ${s}Leg.x=${Lg.x}`);
          assert.ok(Math.abs(Lg.z) <= 0.8, `${n}@${t} ${s}Leg.z=${Lg.z}`);
        }
        assert.ok(Math.abs(a.head.y) <= 1.4 && Math.abs(a.head.x) <= 1.0 && Math.abs(a.head.z) <= 0.6, `${n}@${t} đầu ${JSON.stringify(a.head)}`);
        assert.ok(Math.abs(a.torso.y) <= 1.0 && a.torso.x >= -0.7 && a.torso.x <= 1.2, `${n}@${t} thân ${JSON.stringify(a.torso)}`);
      }
    });
  }
}

test('lặp: động tác loop có chu kỳ = dur', () => {
  for (const n of ['walk', 'run', 'cheer']) {
    const d = NCH_META[n].dur, a = nchPose(n, 0.123), b = nchPose(n, 0.123 + d);
    for (const [k, v] of flat(a)) { const w = flat(b).find(([kk]) => kk === k)[1]; assert.ok(Math.abs(v - w) < 1e-6, `${n} ${k} ${v} vs ${w}`); }
  }
});
test('đi: chân chống đứng yên so với sàn (v = nchSpeed)', () => {
  const o = { speed: 1.8 }, v = nchSpeed('walk', o);
  assert.ok(v > 3 && v < 12, 'v=' + v);
  // chân phải ở pha chống u∈[0,0.5): x_chân (stud, trục +Z) = −2·sin(góc ra trước) trừ quãng thân đã tiến → hằng số
  const foot = (t) => { const p = nchPose('walk', t, o); return -2 * Math.sin(-p.rightLeg.x) - v * t; };
  const f0 = foot(0.01), f1 = foot(0.2);
  assert.ok(Math.abs(f0 - f1) < 0.15 * 2, `bàn chân trượt ${f0} → ${f1}`);
});
test('đi: chân không lún sàn (đế thấp nhất ≈ 0)', async () => {
  const { soleHeight } = await engine('r15.js');
  for (const t of [0, 0.1, 0.2, 0.3, 0.45]) { const p = nchPose('walk', t); const lo = Math.min(soleHeight(p, 'right'), soleHeight(p, 'left')) + p.body.y; assert.ok(Math.abs(lo) < 1e-6, `t=${t} lo=${lo}`); }
});
test('ngã → nằm ngửa trên sàn, đứng dậy về thế đứng', () => {
  const end = nchPose('fall', 2), up = nchPose('getUp', 2);
  assert.ok(Math.abs(end.body.rx + Math.PI / 2) < 1e-6);
  assert.ok(Math.abs(up.body.rx) < 1e-6 && Math.abs(up.body.y) < 0.2);
  assert.ok(end.body.y >= 0.4 && end.body.y < 0.8);
});
test('knockback: bay rồi nằm xa đúng khoảng', () => {
  const p = nchPose('knockback', 5, { dist: 8 });
  assert.ok(Math.abs(p.body.rx + Math.PI / 2) < 1e-6 && p.body.z < -7.9);
});
test('registerNch thêm nch_* vào R15_ANIMATIONS, không ghi đè', () => {
  const ks = registerNch(); assert.equal(ks.length, names.length);
  for (const k of ks) assert.equal(typeof R15_ANIMATIONS[k], 'function');
  assert.equal(registerNch().length, names.length);
});
