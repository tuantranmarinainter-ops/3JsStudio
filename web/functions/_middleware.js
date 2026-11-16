// Chỉ cho vào qua tên miền có Access. Địa chỉ *.pages.dev không có Access nên chặn hết (trừ /api/may/* có khoá x-khoa).
export async function onRequest({ request, next }) {
  const u = new URL(request.url);
  if (u.hostname.endsWith('.pages.dev') && !u.pathname.startsWith('/api/may/')) return new Response('Not found', { status: 404 });
  return next();
}
