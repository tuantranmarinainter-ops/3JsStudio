// Chỉ cho vào qua tên miền có Access. Địa chỉ *.pages.dev không có Access nên chặn hết (trừ /api/may/* có khoá x-khoa).
export async function onRequest({ request, env, next }) {
  const u = new URL(request.url);
  const khoaOk = env.WEB_KHOA && request.headers.get('x-khoa') === env.WEB_KHOA;   // để kiểm từ máy, không qua Access
  if (u.hostname.endsWith('.pages.dev') && !u.pathname.startsWith('/api/may/') && !khoaOk) return new Response('Not found', { status: 404 });
  return next();
}
