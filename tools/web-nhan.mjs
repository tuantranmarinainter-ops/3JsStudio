// node tools/web-nhan.mjs [--mot-lan] [--cong 8792]   — máy nhận kết quả duyệt từ web 3js.tuanchau.io.vn
//   • nhận ĐẨY: POST /nhan (Cloudflare Tunnel đưa nhan.tuanchau.io.vn về cổng này), header x-khoa
//   • nhận KÉO: khi bật lên và định kỳ, lấy phần còn đợi trong KV (GET <WEB_URL>/api/may/lay) rồi báo xoá
//   • ghi vào đúng chỗ của tools/duyet.mjs: duyet/<ep>/dot-NN.ketqua.json + hop-thu.jsonl (hàm luuKetQua)
// Cấu hình trong .env.local (không in ra): WEB_URL=https://….pages.dev   WEB_KHOA=<khoá chung>   WEB_NHAN=0 để tắt
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url';
import { luuKetQua } from './duyet.mjs';
import { khoaDung, kiemGui } from '../web/hang-doi.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function docEnv(f = path.join(ROOT, '.env.local')) {
  const o = {}; try { for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(l); if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
  return { ...o, ...Object.fromEntries(['WEB_URL', 'WEB_KHOA', 'WEB_NHAN', 'TAP_OK'].filter((k) => process.env[k]).map((k) => [k, process.env[k]])) };
}

const daNhan = (goc, ep, id) => { const f = path.join(goc, 'duyet', ep, 'hop-thu.jsonl'); try { return fs.readFileSync(f, 'utf8').split('\n').some((l) => l.includes(`"id":"${id}"`)); } catch { return false; } };

// Ghi một mục hàng đợi. Idempotent theo id (nhận lại cùng id thì bỏ qua, vẫn coi là thành công để xoá khỏi KV).
export function nhanMuc(muc, { goc = ROOT, env = {}, log = console.log } = {}) {
  const kq = muc?.kq, loi = kiemGui(kq, env);
  if (!muc?.id || loi) throw new Error(loi || 'thiếu id');
  const dir = path.join(goc, 'duyet', kq.tap);
  if (daNhan(goc, kq.tap, muc.id)) return { trung: true };
  const f = luuKetQua(kq.tap, kq, goc);
  const dong = { luc: muc.luc, id: muc.id, nguon: 'web', dot: kq.dot, soChon: Object.keys(kq.chon || {}).length + (kq.gau ? 1 : 0), soDuyet: (kq.duyet || []).length, soSua: (kq.sua || []).length, file: path.relative(goc, f).replaceAll('\\', '/') };
  fs.appendFileSync(path.join(dir, 'hop-thu.jsonl'), JSON.stringify(dong) + '\n');
  log(`DA-NHAN web ${kq.tap} dot=${kq.dot} id=${muc.id}`);
  return { trung: false, file: f };
}

// Kéo một lượt: lấy hàng đợi, ghi từng mục theo thứ tự cũ→mới, báo xoá những mục đã ghi. Trả số mục đã nhận.
export async function keoMotLan({ goc = ROOT, env, f = fetch, log = console.log } = {}) {
  const url = String(env.WEB_URL || '').replace(/\/$/, '');
  if (!url || !env.WEB_KHOA) return { nhan: 0, loi: 'thiếu WEB_URL / WEB_KHOA' };
  const h = { 'x-khoa': env.WEB_KHOA };
  let r; try { r = await f(url + '/api/may/lay', { headers: h }); } catch (e) { return { nhan: 0, loi: 'không nối được web: ' + e.message }; }
  if (!r.ok) return { nhan: 0, loi: 'web trả ' + r.status };
  const { hang = [] } = await r.json(), ok = [];
  for (const m of hang) { try { nhanMuc(m, { goc, env, log }); ok.push(m.id); } catch (e) { log(`BO-QUA id=${m?.id}: ${e.message}`); } }
  if (ok.length) await f(url + '/api/may/xoa', { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify({ id: ok }) }).catch(() => {});
  return { nhan: ok.length, conLai: hang.length - ok.length };
}

export function moMayNhan({ cong = 8792, goc = ROOT, env, log = console.log } = {}) {
  return http.createServer((req, res) => {
    const tra = (ma, o) => { res.writeHead(ma, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (!khoaDung(req.headers['x-khoa'], env.WEB_KHOA)) return tra(401, { loi: 'sai khoá' });
    if (req.method !== 'POST' || req.url !== '/nhan') return tra(404, { loi: 'không có' });
    const bufs = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n <= 2.5 * 2 ** 20) bufs.push(c); });
    req.on('end', () => {
      if (n > 2.5 * 2 ** 20) return tra(413, { loi: 'quá lớn' });
      try { nhanMuc(JSON.parse(Buffer.concat(bufs).toString('utf8')), { goc, env, log }); tra(200, { ok: true }); } catch (e) { tra(422, { loi: e.message }); }
    });
  }).listen(cong, '127.0.0.1');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = docEnv(), a = process.argv.slice(2), co = (k) => a.includes(k), gt = (k, m) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : m; };
  if (env.WEB_NHAN === '0') { console.log('WEB_NHAN=0 → tắt máy nhận web.'); process.exit(0); }
  if (!env.WEB_URL || !env.WEB_KHOA) { console.error('Thiếu WEB_URL / WEB_KHOA trong .env.local'); process.exit(2); }
  const lam = async () => { const r = await keoMotLan({ env }); if (r.loi) console.warn('KEO: ' + r.loi); else if (r.nhan) console.log(`KEO: nhận ${r.nhan} mục`); return r; };
  await lam();
  if (co('--mot-lan')) process.exit(0);
  moMayNhan({ cong: +gt('--cong', 8792), env });
  console.log(`MAY-NHAN-WEB sẵn sàng (đẩy: cổng ${gt('--cong', 8792)}, kéo: mỗi 10 s)`);
  setInterval(lam, 10000);
}
