import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http';
import { kiemGui, khoaDung, xep, lay, xoa, day, dem } from '../../web/hang-doi.mjs';
import { nhanMuc, keoMotLan, moMayNhan } from '../web-nhan.mjs';
import { onRequest } from '../../web/functions/api/[[p]].js';

const kvGia = () => { const m = new Map(); return { m,
  put: async (k, v) => { m.set(k, v); }, get: async (k) => m.get(k) ?? null, delete: async (k) => { m.delete(k); },
  list: async ({ prefix = '' } = {}) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name })), list_complete: true }) }; };
const goc = () => { const g = fs.mkdtempSync(path.join(os.tmpdir(), 'web3js-')); fs.mkdirSync(path.join(g, 'duyet/ep003'), { recursive: true });
  for (const so of [1, 2]) fs.writeFileSync(path.join(g, `duyet/ep003/dot-0${so}.json`), JSON.stringify({ so, tieuDe: 'x', nhom: [] })); return g; };
const KQ = (dot, chon = {}) => ({ tap: 'ep003', dot, chon });
const ENV = { WEB_KHOA: 'khoa-thu-nghiem-123', TAP_OK: 'ep003' };

test('kiemGui: chỉ ep003, dot nguyên dương', () => {
  assert.equal(kiemGui(KQ(1), ENV), null);
  assert.match(kiemGui({ tap: 'ep004', dot: 1 }, ENV), /không được phép/);
  assert.match(kiemGui({ tap: 'ep005', dot: 1 }, ENV), /không được phép/);
  assert.ok(kiemGui({ tap: 'ep003', dot: 'a' }, ENV)); assert.ok(kiemGui(null, ENV)); assert.ok(kiemGui([], ENV));
});
test('khoaDung', () => { assert.ok(khoaDung('abc', 'abc')); assert.ok(!khoaDung('abd', 'abc')); assert.ok(!khoaDung('', '')); assert.ok(!khoaDung('ab', 'abc')); });

test('hàng đợi: thứ tự cũ→mới, xoá, đếm', async () => {
  const kv = kvGia(); const a = await xep(kv, KQ(1), 1000), b = await xep(kv, KQ(2), 2000), c = await xep(kv, KQ(1), 3000);
  assert.deepEqual((await lay(kv)).map((x) => x.id), [a.id, b.id, c.id]);
  await xoa(kv, b.id); assert.equal(await dem(kv), 2);
});

test('đẩy tức thì: máy nhận được thì xoá; máy tắt thì còn trong KV', async () => {
  const kv = kvGia(), m = await xep(kv, KQ(1), 1000);
  assert.equal(await day(kv, m, { ...ENV, MAY_URL: 'http://x' }, async () => ({ ok: false })), false);
  assert.equal(await day(kv, m, { ...ENV, MAY_URL: 'http://x' }, async () => { throw new Error('tắt máy'); }), false);
  assert.equal(await dem(kv), 1);
  assert.equal(await day(kv, m, { ...ENV, MAY_URL: 'http://x' }, async () => ({ ok: true })), true);
  assert.equal(await dem(kv), 0);
  assert.equal(await day(kv, m, ENV), false); // không cấu hình MAY_URL → không đẩy
});

test('Pages Function: gửi → KV; ep004 bị từ chối; máy kéo cần khoá', async () => {
  const kv = kvGia(), env = { ...ENV, HANG_DOI: kv }, tc = [];
  const goi = (p, init, e = env) => onRequest({ request: new Request('https://x.test' + p, init), env: e, waitUntil: (pr) => tc.push(pr) });
  assert.equal((await goi('/api/ping?ep=ep003')).status, 200);
  assert.equal((await goi('/api/gui', { method: 'POST', body: JSON.stringify(KQ(1)) })).status, 200);
  assert.equal((await goi('/api/gui', { method: 'POST', body: JSON.stringify({ tap: 'ep004', dot: 1 }) })).status, 422);
  assert.equal((await goi('/api/gui', { method: 'POST', body: '{hong' })).status, 400);
  assert.equal((await goi('/api/may/lay')).status, 401);
  const r = await (await goi('/api/may/lay', { headers: { 'x-khoa': ENV.WEB_KHOA } })).json();
  assert.equal(r.hang.length, 1);
  await goi('/api/may/xoa', { method: 'POST', headers: { 'x-khoa': ENV.WEB_KHOA }, body: JSON.stringify({ id: r.hang[0].id }) });
  assert.equal(await dem(kv), 0);
});

test('máy nhận: ghi đúng chỗ duyet.mjs, idempotent, từ chối ep lạ', async () => {
  const g = goc(), kv = kvGia(), m = await xep(kv, KQ(1, { a: 'b' }), 1000);
  const l = { goc: g, env: ENV, log: () => {} };
  assert.equal(nhanMuc(m, l).trung, false);
  assert.equal(JSON.parse(fs.readFileSync(path.join(g, 'duyet/ep003/dot-01.ketqua.json'), 'utf8')).chon.a, 'b');
  assert.equal(nhanMuc(m, l).trung, true);
  assert.equal(fs.readFileSync(path.join(g, 'duyet/ep003/hop-thu.jsonl'), 'utf8').trim().split('\n').length, 1);
  assert.throws(() => nhanMuc({ id: 'x', kq: { tap: 'ep004', dot: 1 } }, l));
  assert.throws(() => nhanMuc({ id: 'y', kq: KQ(9) }, l)); // dot không tồn tại
});

test('tắt máy → bấm duyệt → bật lại: kéo đủ, đúng thứ tự (bản sau thắng), KV sạch', async () => {
  const g = goc(), kv = kvGia(), env = { ...ENV, WEB_URL: 'https://x.test' }, tc = [];
  const f = (url, init) => onRequest({ request: new Request(url, init), env: { ...ENV, HANG_DOI: kv }, waitUntil: (p) => tc.push(p) });
  for (const [dot, v] of [[1, 'lan1'], [2, 'dot2'], [1, 'lan2']]) await f('https://x.test/api/gui', { method: 'POST', body: JSON.stringify(KQ(dot, { m: v })) });
  assert.equal(await dem(kv), 3); // máy tắt: không ai nhận
  const r = await keoMotLan({ goc: g, env, f, log: () => {} });
  assert.equal(r.nhan, 3); assert.equal(await dem(kv), 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(g, 'duyet/ep003/dot-01.ketqua.json'), 'utf8')).chon.m, 'lan2');
  assert.equal(JSON.parse(fs.readFileSync(path.join(g, 'duyet/ep003/dot-02.ketqua.json'), 'utf8')).chon.m, 'dot2');
  assert.equal((await keoMotLan({ goc: g, env, f, log: () => {} })).nhan, 0);
});

test('máy nhận HTTP (đẩy): cần khoá, ghi được', async () => {
  const g = goc(), env = { ...ENV }, sv = moMayNhan({ cong: 0, goc: g, env, log: () => {} });
  await new Promise((r) => sv.once('listening', r)); const cong = sv.address().port;
  const post = (h) => fetch(`http://127.0.0.1:${cong}/nhan`, { method: 'POST', headers: h, body: JSON.stringify({ id: '0000000000001-aaaaaa', luc: 'z', kq: KQ(2) }) });
  assert.equal((await post({})).status, 401);
  assert.equal((await post({ 'x-khoa': ENV.WEB_KHOA })).status, 200);
  assert.ok(fs.existsSync(path.join(g, 'duyet/ep003/dot-02.ketqua.json')));
  sv.close();
});
