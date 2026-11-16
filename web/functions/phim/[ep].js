// Trình phát studio từ R2 (binding PHIM). Chỉ ep001–003; không bao giờ ep004/ep005. Chạy sau Access.
const OK = new Set(['ep001', 'ep002', 'ep003']);
export async function onRequestGet({ request, env, params }) {
  const ep = String(params.ep || '').replace(/\.html$/, '');
  if (!OK.has(ep) || !env.PHIM) return new Response('Not found', { status: 404 });
  const o = await env.PHIM.get(`${ep}.html`);
  if (!o) return new Response('Not found', { status: 404 });
  // Lưu R2 dạng thô (không gzip, không Content-Encoding): để Cloudflare tự nén khi gửi. Tự đặt Content-Encoding từng làm trình duyệt nhận nhị phân.
  return new Response(o.body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, max-age=3600', 'x-robots-tag': 'noindex' } });
}
