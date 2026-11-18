// Đọc kho R2 (binding PHIM) cho web: studio, gói .3js, MP4 đã đăng, danh sách. Chạy sau Access cùng tên miền.
//   /r2/ds                       → JSON { mp4: { ep001: [{ten,size,luc}…], … }, goi: [{ten,size,luc}…] }
//   /r2/studio                   → studio.html (mở gói: /r2/studio?goi=/r2/g/ep003.3js&kho=/r2/g/kho-chung.3js)
//   /r2/g/<ep00N|kho-chung>.3js  → gói tập / kho chung (Range + Cache-Control)
//   /r2/m/<map>[.kho].3js         → gói bản đồ (bối cảnh) + kho riêng của nó; /r2/m/studio = studio có module bối cảnh
//   /r2/mp4/<ep>/<ngày-giờ>.mp4  → MP4 xem trên điện thoại (Range để tua)
// Chỉ ep001–003; ep004/ep005 không bao giờ (allow-list ở đây và ở tools/dang-r2.mjs).
export const OK = ['ep001', 'ep002', 'ep003'];
const RE_MAPF = /^[a-z0-9][a-z0-9-]{0,60}(?:\.kho)?\.3js$/;
const RE_GOI = /^(?:ep00[123]|kho-chung)\.3js$/, RE_MP4 = /^(ep00[123])\/[0-9_-]{8,24}\.mp4$/;
const AN = { 'x-robots-tag': 'noindex', 'accept-ranges': 'bytes' };
const loi = (c, m) => new Response(m, { status: c, headers: { 'x-robots-tag': 'noindex' } });

// Phục vụ một object R2 có Range / ETag. Dùng chung cho studio, gói, MP4.
export async function phucVu(kho, key, request, { type, cache = 'private, max-age=86400, must-revalidate' } = {}) {
  const rg = request.headers.get('range'), inm = request.headers.get('if-none-match');
  const head = (o) => ({ ...AN, 'content-type': type, 'cache-control': cache, etag: o.httpEtag });
  if (request.method === 'HEAD') { const o = await kho.head(key); return o ? new Response(null, { headers: { ...head(o), 'content-length': String(o.size) } }) : loi(404, 'Not found'); }
  // If-None-Match từ trình duyệt có ngoặc kép / tiền tố W/ (Cloudflare nén → ETag yếu); R2 chỉ nhận etag trần → làm sạch,
  // và nếu R2 vẫn từ chối điều kiện thì tải thường (trước đây ném lỗi → HTTP 500 khi điện thoại mở lại gói đã có trong bộ đệm).
  const tag = inm ? inm.split(',')[0].trim().replace(/^W\//i, '').replace(/"/g, '') : '';
  let o;
  try { o = await kho.get(key, rg ? { range: request.headers } : tag && tag !== '*' ? { onlyIf: { etagDoesNotMatch: tag } } : undefined); }
  catch { o = await kho.get(key); }
  if (!o) return loi(404, 'Not found');
  if (!o.body) return new Response(null, { status: 304, headers: head(o) });
  const h = head(o);
  if (rg && o.range) {
    const off = o.range.offset ?? (o.size - o.range.length), len = o.range.length ?? (o.size - off);
    return new Response(o.body, { status: 206, headers: { ...h, 'content-range': `bytes ${off}-${off + len - 1}/${o.size}`, 'content-length': String(len) } });
  }
  return new Response(o.body, { headers: { ...h, 'content-length': String(o.size) } });
}

export async function danhSach(kho) {
  const mp4 = Object.fromEntries(OK.map((e) => [e, []])), goi = [];
  for (const ep of OK) {
    const r = await kho.list({ prefix: `mp4/${ep}/`, limit: 200 });
    mp4[ep] = r.objects.filter((o) => o.key.endsWith('.mp4')).map((o) => ({ ten: o.key.slice(`mp4/${ep}/`.length), size: o.size, luc: o.uploaded })).sort((a, b) => b.ten.localeCompare(a.ten));
  }
  const g = await kho.list({ prefix: 'goi/', limit: 200 });
  for (const o of g.objects) { const t = o.key.slice(4); if (RE_GOI.test(t)) goi.push({ ten: t, size: o.size, luc: o.uploaded }); }
  const mp = await kho.list({ prefix: 'goi/map/', limit: 200 }), map = mp.objects.map((o) => o.key.slice(8)).filter((t) => RE_MAPF.test(t) && !t.endsWith('.kho.3js') && !/^ep00[45]/.test(t)).map((t) => t.slice(0, -4));
  return { mp4, goi, map, studio: !!(await kho.head('studio.html')) };
}

export async function onRequest({ request, env, params }) {
  if (!env.PHIM) return loi(404, 'Not found');
  if (request.method !== 'GET' && request.method !== 'HEAD') return loi(405, 'Method not allowed');
  const p = [].concat(params.f || []).join('/');
  if (p === 'ds') return new Response(JSON.stringify(await danhSach(env.PHIM)), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  if (p === 'studio') return phucVu(env.PHIM, 'studio.html', request, { type: 'text/html; charset=utf-8', cache: 'private, no-cache' });
  if (p.startsWith('g/') && RE_GOI.test(p.slice(2))) return phucVu(env.PHIM, 'goi/' + p.slice(2), request, { type: 'application/octet-stream' });
  if (p === 'm/studio') return phucVu(env.PHIM, 'goi/map/studio.html', request, { type: 'text/html; charset=utf-8', cache: 'private, no-cache' });
  if (p.startsWith('m/') && RE_MAPF.test(p.slice(2)) && !/^ep00[45]/.test(p.slice(2))) return phucVu(env.PHIM, 'goi/map/' + p.slice(2), request, { type: 'application/octet-stream', cache: 'private, no-cache' });
  if (p.startsWith('mp4/') && RE_MP4.test(p.slice(4))) return phucVu(env.PHIM, p, request, { type: 'video/mp4', cache: 'private, max-age=604800, immutable' });
  return loi(404, 'Not found');
}
