import test from 'node:test'; import assert from 'node:assert/strict';
import { epDuocPhep, chonXoa, locKho, docGoi, stampMp4, dangMp4 } from '../dang-r2.mjs';
import { phucVu, danhSach, onRequest } from '../../web/functions/r2/[[f]].js';

test('epDuocPhep: chỉ ep001–003', () => {
  assert.equal(epDuocPhep('ep003'), 'ep003'); assert.equal(epDuocPhep('ep003_xem-thu'), 'ep003'); assert.equal(epDuocPhep('EP001'), 'ep001');
  for (const x of ['ep004', 'ep005', 'ep004_xem-thu', 'ep0031', 'ep6B', '', null]) assert.equal(epDuocPhep(x), null, String(x));
});
test('dangMp4: ep004 bị chặn trước khi chạm wrangler', () => {
  const r = dangMp4({ file: 'x.mp4', ep: 'ep004' }); assert.equal(r.ok, false); assert.ok(r.boQua);
  assert.equal(dangMp4({ file: 'khong-co.mp4', ep: 'ep003' }).ok, false);
  assert.equal(dangMp4({ file: process.argv[1], ep: 'ep003', thu: true }).ok, true);
});
test('chonXoa: giữ N bản mới nhất', () => {
  const k = ['a/2026-11-01_10-00-00', 'a/2026-11-03_10-00-00', 'a/2026-11-02_10-00-00', 'a/2026-11-04_10-00-00'];
  assert.deepEqual(chonXoa(k, 2), ['a/2026-11-02_10-00-00', 'a/2026-11-01_10-00-00']);
  assert.deepEqual(chonXoa(k, 5), []); assert.equal(chonXoa(k, 0).length, 0);
  assert.match(stampMp4(new Date(2026, 10, 18, 9, 5, 7)), /^2026-11-18_09-05-07$/);
});
const goi = (files, refs = {}) => { const parts = [], f = {}; let o = 0; for (const [p, b] of Object.entries(files)) { f[p] = ['x', o, b.length]; parts.push(b); o += b.length; }
  const h = Buffer.from(JSON.stringify({ v: 2, files: f, refs })), pre = Buffer.alloc(8); pre.write('3JS1', 0, 'latin1'); pre.writeUInt32LE(h.length, 4); return Buffer.concat([pre, h, ...parts]); };
test('locKho: bỏ file không ai dùng (ví dụ ep004), giữ nguyên nội dung', () => {
  const kho = goi({ '/a.png': Buffer.from('AAA'), '/ep004/mat.png': Buffer.from('SECRET'), '/b.glb': Buffer.from('BB') });
  const { h, body } = docGoi(locKho(kho, new Set(['/a.png', '/b.glb'])));
  assert.deepEqual(Object.keys(h.files), ['/a.png', '/b.glb']);
  assert.equal(body.subarray(h.files['/b.glb'][1], h.files['/b.glb'][1] + 2).toString(), 'BB'); assert.ok(!body.toString().includes('SECRET'));
});
const khoGia = (data) => ({ async get(k, opt) { const b = data[k]; if (!b) return null; const o = { httpEtag: '"e"', size: b.length };
    if (opt?.range) { const m = /bytes=(\d+)-(\d*)/.exec(opt.range.get('range')), off = +m[1], end = m[2] ? +m[2] : b.length - 1; return { ...o, range: { offset: off, length: end - off + 1 }, body: b.subarray(off, end + 1) }; }
    if (opt?.onlyIf && opt.onlyIf.etagDoesNotMatch === '"e"') return { ...o, body: null }; return { ...o, body: b }; },
  async head(k) { return data[k] ? { httpEtag: '"e"', size: data[k].length } : null; },
  async list({ prefix }) { return { objects: Object.keys(data).filter((k) => k.startsWith(prefix)).map((key) => ({ key, size: data[key].length, uploaded: 'T' })) }; } });
const req = (u, h = {}, m = 'GET') => new Request('https://x.test' + u, { method: m, headers: h });
test('Function R2: Range → 206 + content-range; ETag → 304; ep004 → 404', async () => {
  const env = { PHIM: khoGia({ 'mp4/ep003/2026-11-18_10-00-00.mp4': Buffer.from('0123456789'), 'mp4/ep004/2026-11-18_10-00-00.mp4': Buffer.from('x'), 'goi/ep003.3js': Buffer.from('G'), 'goi/ep004.3js': Buffer.from('G'), 'studio.html': Buffer.from('<html>') }) };
  const go = (u, h) => onRequest({ request: req(u, h), env, params: { f: u.replace(/^\/r2\//, '').split('?')[0].split('/') } });
  let r = await go('/r2/mp4/ep003/2026-11-18_10-00-00.mp4', { range: 'bytes=2-5' });
  assert.equal(r.status, 206); assert.equal(r.headers.get('content-range'), 'bytes 2-5/10'); assert.equal(await r.text(), '2345');
  r = await go('/r2/mp4/ep003/2026-11-18_10-00-00.mp4'); assert.equal(r.status, 200); assert.equal(r.headers.get('accept-ranges'), 'bytes'); assert.match(r.headers.get('cache-control'), /max-age/);
  r = await go('/r2/mp4/ep003/2026-11-18_10-00-00.mp4', { 'if-none-match': '"e"' }); assert.equal(r.status, 304);
  for (const u of ['/r2/mp4/ep004/2026-11-18_10-00-00.mp4', '/r2/g/ep004.3js', '/r2/g/..%2Fx.3js', '/r2/mp4/ep003/../ep004/x.mp4']) assert.equal((await go(u)).status, 404, u);
  assert.equal((await go('/r2/g/ep003.3js')).status, 200); assert.equal((await go('/r2/studio')).status, 200);
  const ds = await (await go('/r2/ds')).json(); assert.equal(ds.mp4.ep003.length, 1); assert.deepEqual(ds.mp4.ep004, undefined); assert.deepEqual(ds.goi.map((x) => x.ten), ['ep003.3js']); assert.equal(ds.studio, true);
  assert.equal((await onRequest({ request: req('/r2/ds', {}, 'POST'), env, params: { f: ['ds'] } })).status, 405);
});

test('dongKhoMap: kho riêng chỉ gồm asset map dùng, sha khớp; asset đổi → báo lỗi', async () => {
  const { dongKhoMap, docGoi } = await import('../dang-r2.mjs');
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path'), crypto = await import('node:crypto');
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'map-')); fs.mkdirSync(path.join(goc, 'assets'), { recursive: true });
  const a = Buffer.from('glb-A'); fs.writeFileSync(path.join(goc, 'assets/a.glb'), a); fs.writeFileSync(path.join(goc, 'assets/b.glb'), 'khong-dung');
  const sh = crypto.createHash('sha256').update(a).digest('hex');
  const goi = (refs) => { const hd = Buffer.from(JSON.stringify({ kind: 'boi-canh', built: 'x', files: {}, refs })), p = Buffer.alloc(8); p.write('3JS1', 0, 'latin1'); p.writeUInt32LE(hd.length, 4); return Buffer.concat([p, hd]); };
  const k = docGoi(dongKhoMap(goi({ '/assets/a.glb': ['model/gltf-binary', sh, a.length] }), goc));
  assert.equal(k.h.kind, 'kho'); assert.deepEqual(Object.keys(k.h.files), ['/assets/a.glb']); assert.equal(k.h.files['/assets/a.glb'][3], sh);
  assert.equal(k.body.subarray(0, a.length).toString(), 'glb-A');
  assert.throws(() => dongKhoMap(goi({ '/assets/a.glb': ['model/gltf-binary', 'sai', a.length] }), goc), /sha khác/);
});

test('Function /r2/m/*: phục vụ studio + gói map, liệt kê map, chặn ep004/tên lạ', async () => {
  const O = { 'goi/map/studio.html': 'S', 'goi/map/city-moi-5x5.3js': 'G', 'goi/map/city-moi-5x5.kho.3js': 'K', 'goi/map/ep004-x.3js': 'X' };
  const obj = (k) => ({ key: k, size: O[k].length, httpEtag: '"e"', uploaded: 'u', body: O[k] });
  const PHIM = { get: async (k) => (k in O ? obj(k) : null), head: async (k) => (k in O ? obj(k) : null), list: async ({ prefix }) => ({ objects: Object.keys(O).filter((k) => k.startsWith(prefix)).map(obj) }) };
  const go = (f) => onRequest({ request: new Request('https://x/r2/' + f), env: { PHIM }, params: { f: f.split('/') } });
  assert.equal(await (await go('m/studio')).text(), 'S');
  assert.equal(await (await go('m/city-moi-5x5.3js')).text(), 'G');
  assert.equal(await (await go('m/city-moi-5x5.kho.3js')).text(), 'K');
  assert.equal((await go('m/ep004-x.3js')).status, 404);
  assert.equal((await go('m/..%2Fstudio.html')).status, 404);
  assert.deepEqual((await (await go('ds')).json()).map, ['city-moi-5x5']);
});
