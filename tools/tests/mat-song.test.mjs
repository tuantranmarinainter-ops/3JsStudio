// Task 12: R15 mặt sống (engine/r15.js mixFace + engine/shots.js liveFacePass) trên engine/face-lab.html?a=smile&b=scared&c=sad.
//   Tất định (tua tới/lui cùng pose JSON), chuyển biểu cảm mềm ở ranh shot, chớp 3–5 s, ánh nhìn đổi dấu theo lookAt, đồng tử đêm to hơn,
//   tắt faceLive ⇒ đường mã cũ (không có trạng thái mặt sống), ô FX faceLive + gioThoiTiet có trong post.js.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, resolve, relative } from 'node:path';
import { launchBrowser } from '../browser.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml' };
const T = { timeout: 180000 };
let srv, browser, page, pageOff;

const open = async (qs) => {
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.25 });
  await pg.goto(`http://localhost:${srv.address().port}/engine/face-lab.html${qs}`);
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 170000 });
  return pg;
};
before(async () => {
  srv = createServer(async (req, res) => {
    try {
      const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0])));
      if (relative(root, p).startsWith('..')) throw 0;
      const b = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(b);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  browser = await launchBrowser();
  page = await open('?a=smile&b=scared&c=sad');
  pageOff = await open('?a=smile&b=scared&c=sad&live=0');
}, { timeout: 360000 });
after(async () => { await browser?.close(); srv?.close(); });

const face = (pg, t) => pg.evaluate((t) => window.__face(t), t);
const mpOf = (f) => f.st.mp;
// độ lệch chuẩn hoá của tham số miệng giữa hai khung so với biên độ toàn đoạn A→B (lớn nhất trong 3 tham số)
const lech = (m0, m1, mA, mB) => Math.max(...['curve', 'open', 'width'].map((k) => { const span = Math.abs(mB[k] - mA[k]); return span < 1e-9 ? 0 : Math.abs(m1[k] - m0[k]) / span; }));

test('face-lab: ô FX faceLive + gioThoiTiet có trong post.js, mặc định bật', () => {
  const post = readFileSync(join(root, 'engine/post.js'), 'utf8');
  assert.match(post, /FX_DEFAULTS = \{[^}]*faceLive: true[^}]*\}/);
  assert.match(post, /FX_DEFAULTS = \{[^}]*gioThoiTiet: true[^}]*\}/);
  assert.match(post, /FX_LABELS = \{[\s\S]*faceLive: '/);
  assert.match(post, /FX_LABELS = \{[\s\S]*gioThoiTiet: '/);
  assert.match(readFileSync(join(root, 'episodes/ep001/episode.js'), 'utf8'), /faceLive: false/);
});

test('mặt sống: tất định — tua tới / lui / nhảy cóc ra cùng trạng thái mặt + pose JSON', T, async () => {
  const ts = [0.3, 1.25, 1.3, 2.45, 2.6, 4.2, 6.0, 8.45];
  const fwd = []; for (const t of ts) fwd.push(await face(page, t));
  const back = []; for (const t of [...ts].reverse()) back.push(await face(page, t));
  back.reverse();
  assert.deepEqual(back, fwd);
  const again = await face(page, 1.3);
  assert.deepEqual(again, fwd[2]);
});

test('mixFace: chuyển biểu cảm mềm — ranh shot ±0,05 s tham số miệng đổi < 50% biên độ; sau 0,25 s đã về mặt mới', T, async () => {
  for (const [tb, nameA, nameB] of [[1.2, 'smile', 'scared'], [2.4, 'scared', 'sad']]) {
    const before_ = await face(page, tb - 0.05), mid = await face(page, tb + 0.05), end = await face(page, tb + 0.4);
    assert.equal(mid.face, nameB, 'khung sau ranh phải là mặt mới');
    const mA = mpOf(before_), mB = mpOf(end);
    const dMid = lech(mA, mpOf(mid), mA, mB);
    assert.ok(dMid > 0, `${nameA}→${nameB}: miệng phải bắt đầu đổi (mềm), lệch = ${dMid}`);
    assert.ok(dMid < 0.5, `${nameA}→${nameB}: miệng đổi ${(dMid * 100).toFixed(0)}% biên độ trong 0,05 s (phải < 50%)`);
    // đối chiếu đường cũ: nhảy cứng 100%
    assert.ok(mid.st.mixK > 0 && mid.st.mixK < 0.5);
    assert.equal(end.st.mixK, 1);
  }
  // trước ranh (khung cuối shot trước) và đúng ranh: còn nguyên mặt cũ
  const f = await face(page, 1.2);
  assert.equal(f.st.mixK, 0, 'đúng ranh: k = 0');
  assert.equal(f.st.mp.curve, (await face(page, 1.15)).st.mp.curve, 'đúng ranh = mặt cũ');
});

test('chớp mắt: hai lần liên tiếp cách nhau 3–5 s', T, async () => {
  const starts = [];
  let prevBlink = false;
  for (let i = 0; i <= 9.6 * 30; i++) {
    const t = Math.min(i / 30, 9.59);
    const f = await face(page, t);
    const blink = f.st.eyes === 'closed' || (f.st.eyes === 'half' && f.st.eyesQ.lid?.[0] === 0.62);
    if (blink && !prevBlink) starts.push(t);
    prevBlink = blink;
  }
  assert.ok(starts.length >= 2, 'cần >= 2 lần chớp trong 9,6 s, thấy ' + starts.length);
  for (let i = 1; i < starts.length; i++) {
    const g = starts[i] - starts[i - 1];
    assert.ok(g >= 3 - 0.05 && g <= 5 + 0.05, `khoảng chớp ${g.toFixed(3)} s ngoài 3–5 s`);
  }
});

test('ánh nhìn: gaze đổi dấu khi lookAt đổi bên; lookAt cam ≈ thẳng', T, async () => {
  const right = await face(page, 4.2), left = await face(page, 5.4), cam = await face(page, 6.6);
  const gx = (f) => f.st.eyesQ.gaze[0];
  assert.ok(gx(right) > 0.2, 'mom ở +X ⇒ gaze x > 0, được ' + gx(right));
  assert.ok(gx(left) < -0.2, 'mom ở −X ⇒ gaze x < 0, được ' + gx(left));
  assert.ok(Math.abs(gx(cam)) < 0.15 && Math.abs(cam.st.eyesQ.gaze[1]) < 0.3, 'nhìn máy quay: gần thẳng, được ' + JSON.stringify(cam.st.eyesQ.gaze));
  assert.ok(Math.abs(gx(right)) <= 0.85 + 1e-9 && Math.abs(gx(left)) <= 0.85 + 1e-9, 'kẹp biên');
});

test('đồng tử: đêm to hơn ban ngày (theo ánh sáng thật của shot)', T, async () => {
  const day = await face(page, 7.5), night = await face(page, 8.45);
  const ps = (f) => f.st.eyesQ.ps ?? 1;
  assert.ok(ps(night) > ps(day) + 0.1, `đêm ${ps(night)} phải > ngày ${ps(day)}`);
});

test('tắt faceLive: đường mã cũ — không có trạng thái mặt sống, không nội suy', T, async () => {
  const f = await face(pageOff, 1.3);
  assert.equal(f.st.mp, undefined);
  assert.equal(f.st.mixK, undefined);
  assert.equal(f.face, 'scared');
});
