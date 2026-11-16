// Pages Function: /api/*  (cùng gốc với trang → không cần CORS)
//   GET  /api/ping?ep=…        trang hỏi "có nhận không" (luôn có: hàng đợi KV bảo đảm không mất)
//   POST /api/gui              trang gửi kết quả duyệt → KV (+ đẩy tức thì tới máy nếu có MAY_URL)
//   GET  /api/may/lay          máy kéo phần đang đợi      (header x-khoa)
//   POST /api/may/xoa  {id}    máy báo đã nhận            (header x-khoa)
import { kiemGui, khoaDung, xep, lay, xoa, dem, day, TOI_DA_BYTE } from '../../hang-doi.mjs';

const json = (o, ma = 200) => new Response(JSON.stringify(o), { status: ma, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function onRequest({ request, env, waitUntil }) {
  const u = new URL(request.url), p = u.pathname.replace(/^\/api/, '').replace(/\/$/, '');
  const kv = env.HANG_DOI;
  if (!kv) return json({ loi: 'chưa gắn KV HANG_DOI' }, 500);

  if (request.method === 'GET' && p === '/ping') return json({ ung: 'duyet', ep: u.searchParams.get('ep'), web: true, cauHinh: { khoa: !!env.WEB_KHOA, may: !!env.MAY_URL } });

  if (request.method === 'POST' && p === '/gui') {
    const txt = await request.text();
    if (txt.length > TOI_DA_BYTE) return json({ loi: 'quá 2 MB' }, 413);
    let kq; try { kq = JSON.parse(txt); } catch { return json({ loi: 'JSON sai' }, 400); }
    const loi = kiemGui(kq, env); if (loi) return json({ loi }, 422);
    const muc = await xep(kv, kq);
    const lam = day(kv, muc, env); if (waitUntil) waitUntil(lam);
    return json({ ok: true, dot: kq.dot, luc: muc.luc });
  }

  if (p.startsWith('/may/')) {
    if (!khoaDung(request.headers.get('x-khoa'), env.WEB_KHOA)) return json({ loi: 'sai khoá' }, 401);
    if (request.method === 'GET' && p === '/may/lay') { const hang = await lay(kv); return json({ hang, con: hang.length }); }
    if (request.method === 'POST' && p === '/may/xoa') {
      let b; try { b = await request.json(); } catch { return json({ loi: 'JSON sai' }, 400); }
      const ids = [].concat(b?.id ?? []).filter((x) => typeof x === 'string' && /^[0-9a-z-]{10,40}$/.test(x));
      await Promise.all(ids.map((i) => xoa(kv, i))); return json({ ok: true, xoa: ids.length });
    }
  }
  return json({ loi: 'không có' }, 404);
}
