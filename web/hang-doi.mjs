// Logic hàng đợi duyệt (thuần, không phụ thuộc Cloudflare) — dùng chung cho Pages Function, máy nhận và test.
// KV giả chỉ cần: put(key, value, {expirationTtl}), get(key), delete(key), list({prefix}) → {keys:[{name}]}
export const TIEN_TO = 'q:';
export const TOI_DA_BYTE = 2 * 2 ** 20;
export const HAN_GIU_GIAY = 30 * 24 * 3600;

export const tapChoPhep = (env) => String(env?.TAP_OK ?? 'ep003').split(',').map((s) => s.trim()).filter(Boolean);

// Kiểm kết quả duyệt gửi từ trang: cùng luật với moMayChu (tools/duyet.mjs) + danh sách tập cho phép.
export function kiemGui(kq, env) {
  if (!kq || typeof kq !== 'object' || Array.isArray(kq)) return 'JSON sai';
  if (typeof kq.tap !== 'string' || !tapChoPhep(env).includes(kq.tap)) return `tập "${kq.tap}" không được phép`;
  if (!Number.isInteger(kq.dot) || kq.dot < 1) return 'dot không hợp lệ';
  return null;
}

// So khoá chung theo thời gian không đổi.
export function khoaDung(cho, that) {
  const a = String(cho ?? ''), b = String(that ?? '');
  if (!b || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

let dem_ = 0;
const rand = () =>Math.random().toString(36).slice(2, 8);

export async function xep(kv, kq, now = Date.now()) {
  const id = `${String(now).padStart(13, '0')}-${String(++dem_).padStart(5, '0').slice(-5)}${rand()}`; // đếm tăng dần: cùng mili-giây vẫn giữ thứ tự
  const muc = { id, luc: new Date(now).toISOString(), kq };
  await kv.put(TIEN_TO + id, JSON.stringify(muc), { expirationTtl: HAN_GIU_GIAY });
  return muc;
}

// Phần đang đợi, cũ trước mới sau (key có mốc thời gian đệm 13 chữ số → thứ tự chữ = thứ tự thời gian).
export async function lay(kv, toiDa = 50) {
  const ds = []; let cursor;
  do {
    const r = await kv.list({ prefix: TIEN_TO, cursor });
    ds.push(...r.keys.map((k) => k.name)); cursor = r.list_complete === false ? r.cursor : undefined;
  } while (cursor && ds.length < toiDa);
  ds.sort();
  const out = [];
  for (const k of ds.slice(0, toiDa)) { const v = await kv.get(k); if (v) { try { out.push(JSON.parse(v)); } catch { await kv.delete(k); } } }
  return out;
}

export const xoa = (kv, id) => kv.delete(TIEN_TO + id);

export async function dem(kv) { return (await kv.list({ prefix: TIEN_TO })).keys.length; }

// Đẩy tức thì tới máy (qua Tunnel). Thành công (máy trả 2xx) thì xoá khỏi KV; lỗi thì để nguyên cho máy kéo lại.
export async function day(kv, muc, env, f = fetch) {
  if (!env?.MAY_URL) return false;
  try {
    const r = await f(env.MAY_URL.replace(/\/$/, '') + '/nhan', { method: 'POST', headers: { 'content-type': 'application/json', 'x-khoa': env.WEB_KHOA || '' }, body: JSON.stringify(muc) });
    if (!r.ok) return false;
    await xoa(kv, muc.id); return true;
  } catch { return false; }
}
