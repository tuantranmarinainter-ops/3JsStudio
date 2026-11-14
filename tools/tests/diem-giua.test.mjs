// Điểm giữa của shot (engine/diem-giua.js): đi qua đúng 3 điểm, liên tục, không có điểm giữa → trùng công thức cũ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { moc, qua1, qua3, mayTuyetDoi, viTri, huongThan } from '../../engine/diem-giua.js';
// easing của engine/shots.js (file đó kéo theo three.js nên không import được trong node) — chép đúng công thức
const EASE = { linear: (k) => k, smooth: (k) => k * k * (3 - 2 * k), out: (k) => 1 - Math.pow(1 - k, 3), inout: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2) };
const ease = (name, k) => EASE[name](Math.min(1, Math.max(0, k)));
import { expandShots } from '../../engine/shottypes.js';

const gan = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);
const gan3 = (a, b, e = 1e-9) => a.forEach((x, i) => gan(x, b[i], e));
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const A = [3, 2.5, 6], M = [4, 3, 6], B = [5, 2.5, 5];

test('qua3 / qua1: đi qua đúng 3 điểm tại u = 0, um, 1', () => {
  for (const um of [0.5, 0.3, 0.8]) {
    gan3(qua3(A, M, B, 0, um), A); gan3(qua3(A, M, B, um, um), M); gan3(qua3(A, M, B, 1, um), B);
    gan(qua1(38, 30, 40, 0, um), 38); gan(qua1(38, 30, 40, um, um), 30); gan(qua1(38, 30, 40, 1, um), 40);
  }
});

test('qua3: điểm giữa nằm đúng trên đoạn thẳng → trùng nội suy thẳng', () => {
  const mid = lerp3(A, B, 0.5);
  for (let i = 0; i <= 20; i++) gan3(qua3(A, mid, B, i / 20, 0.5), lerp3(A, B, i / 20), 1e-12);
});

test('liên tục và không gãy ở điểm giữa: bước nhỏ, vận tốc hai bên điểm giữa bằng nhau', () => {
  const N = 2000; let truoc = qua3(A, M, B, 0, 0.4);
  for (let i = 1; i <= N; i++) {
    const p = qua3(A, M, B, i / N, 0.4);
    assert.ok(Math.hypot(p[0] - truoc[0], p[1] - truoc[1], p[2] - truoc[2]) < 0.02, `nhảy cóc ở u=${i / N}`);
    truoc = p;
  }
  const h = 1e-4, um = 0.4;
  const vTrai = qua3(A, M, B, um, um).map((x, i) => (x - qua3(A, M, B, um - h, um)[i]) / h);
  const vPhai = qua3(A, M, B, um + h, um).map((x, i) => (x - qua3(A, M, B, um, um)[i]) / h);
  gan3(vTrai, vPhai, 1e-2);
});

test('moc: tm là tiến độ THỜI GIAN — với easing của shot, điểm giữa rơi đúng lúc k = tm', () => {
  for (const [name, tm] of [['smooth', 0.5], ['inout', 0.3], ['out', 0.6], ['linear', 0.25]]) {
    const eF = (x) => ease(name, x), c = { p: A, pm: M, p2: B, l: [0, 2, 3], lm: [0, 3.5, 3], fov: 38, fovm: 30, fov2: 40, tm, ease: name };
    const R = mayTuyetDoi(c, ease(name, tm), eF);
    gan3(R.pos, M); gan3(R.look, [0, 3.5, 3]); gan(R.fov, 30);
    gan3(mayTuyetDoi(c, ease(name, 0), eF).pos, A); gan3(mayTuyetDoi(c, ease(name, 1), eF).pos, B);
  }
  assert.equal(moc(0, null), 0.05); assert.equal(moc(1, null), 0.95);   // kẹp mép
});

test('camera KHÔNG có điểm giữa: trùng công thức cũ từng số', () => {
  const cu = (c, ke) => ({ pos: c.p2 ? lerp3(c.p, c.p2, ke) : c.p, look: c.l2 ? lerp3(c.l, c.l2, ke) : c.l, fov: c.fov2 ? c.fov + (c.fov2 - c.fov) * ke : c.fov || 40 });
  const ca = [{ p: A, l: [0, 2, 3], fov: 38, p2: B, l2: [1, 2, 3], fov2: 44 }, { p: A, l: [0, 2, 3] }, { p: A, l: [0, 2, 3], fov: 25, p2: B }, { p: A, l: [0, 2, 3], l2: [0, 1, 0], fov2: 30 }];
  for (const c of ca) for (let i = 0; i <= 30; i++) {
    const ke = ease('smooth', i / 30);
    assert.deepStrictEqual(mayTuyetDoi(c, ke, (x) => ease('smooth', x)), cu(c, ke));
  }
  assert.equal(mayTuyetDoi(ca[1], 0.3).pos, A);   // không p2: trả chính mảng p như cũ
});

test('nhân vật: atm (kể cả độ cao) + rym; không có thì trùng công thức cũ', () => {
  const nhay = { at: [0, 0, 3], atm: [0, 1.6, 3] };   // nhảy tại chỗ: không có `to` → về lại at
  gan3(viTri(nhay, 0), [0, 0, 3]); gan3(viTri(nhay, 0.5), [0, 1.6, 3]); gan3(viTri(nhay, 1), [0, 0, 3]);
  gan(viTri(nhay, 0.25)[1], 1.2);   // parabol: 4·h·u·(1−u)
  const di = { at: [0, 0, 0], atm: [2, 1, 3], to: [0, 0, 6], tm: 0.3 };
  gan3(viTri(di, 0.3), [2, 1, 3]); gan3(viTri(di, 1), [0, 0, 6]);
  const quay = { ry: 0, rym: 2, ry2: 1 };
  gan(huongThan(quay, 0), 0); gan(huongThan(quay, 0.5), 2); gan(huongThan(quay, 1), 1);
  gan(huongThan({ ry: 1, rym: 2 }, 1), 1);   // không ry2 → quay rồi về hướng đầu
  // không có điểm giữa
  for (const ke of [0, 0.37, 1]) {
    assert.deepStrictEqual(viTri({ at: A, to: B }, ke), lerp3(A, B, ke));
    assert.equal(viTri({ at: A }, ke), A);
    assert.deepStrictEqual(viTri({}, ke), [0, 0, 0]);
    assert.equal(huongThan({ ry: 1, ry2: 3 }, ke), 1 + (3 - 1) * ke);
    assert.equal(huongThan({ ry: 1.5 }, ke), 1.5);
    assert.equal(huongThan({ ry2: 2 }, ke), 2 * ke);
    assert.equal(huongThan({ to: B }, ke), undefined);
  }
});

test('nối shot (shottypes remember): shot có atm / rym vẫn để lại vị trí và hướng CUỐI cho shot sau', () => {
  const ctx = { places: { san: { pos: [0, 0, 0], ry: 0 } }, hero: 'ga', env: 'town' };
  const out = expandShots([
    { id: 's1', dur: 1, type: 'reaction', who: 'ga', at: 'san', cam: { p: A, l: [0, 2, 3], pm: M, p2: B }, cast: { ga: { at: [1, 0, 2], atm: [3, 2, 4], to: [5, 0, 6], ry: 0, rym: 2, ry2: 1, anim: 'idle' } } },
    { id: 's2', dur: 1, type: 'closeup', who: 'ga' },
    { id: 's3', dur: 1, type: 'reaction', who: 'ga', cast: { ga: { at: [0, 0, 3], atm: [0, 1.6, 3], ry: 0.5 } } },
    { id: 's4', dur: 1, type: 'closeup', who: 'ga' },
  ], ctx);
  assert.deepEqual(out[0].cam.pm, M);                       // sh.cam gộp đè lên camera của loại, giữ điểm giữa
  assert.deepEqual(out[1].cast.ga.at, [5, 0, 6]); assert.equal(out[1].cast.ga.ry, 1);
  assert.deepEqual(out[3].cast.ga.at, [0, 0, 3]); assert.equal(out[3].cast.ga.ry, 0.5);   // nhảy tại chỗ: cuối = at, không phải atm
});
