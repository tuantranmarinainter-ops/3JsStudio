// node tools/kiem-khoa.mjs  — thử từng khoá API trong .env.local bằng một lệnh gọi CHỈ ĐỌC. Không bao giờ in giá trị khoá.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV = {};
try { for (const l of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(l); if (m) ENV[m[1]] = m[2].replace(/^["']|["']$/g, ''); } }
catch { console.log('Không đọc được .env.local'); process.exit(1); }
const UA = 'nhap-model/1.0';
const goi = async (url, headers = {}) => { try { const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(30000) }); let j = null; try { j = await r.json(); } catch {} return { s: r.status, j }; } catch (e) { return { s: 0, loi: String(e.cause?.code || e.message) }; } };
const kq = [];
const ghi = (ten, ok, ct) => { kq.push(ok); console.log(`${ok === true ? 'ĐẠT ' : ok === null ? 'BỎ QUA' : 'HỎNG'}  ${ten.padEnd(12)} ${ct}`); };

// Sketchfab
if (!ENV.SKETCHFAB_API_TOKEN) ghi('Sketchfab', null, 'chưa điền SKETCHFAB_API_TOKEN');
else { const r = await goi('https://api.sketchfab.com/v3/me', { Authorization: `Token ${ENV.SKETCHFAB_API_TOKEN}` });
  ghi('Sketchfab', r.s === 200, r.s === 200 ? 'khoá hợp lệ, đăng nhập được' : r.s === 401 ? 'khoá sai hoặc hết hạn (401)' : `mã ${r.s} ${r.loi || ''}`); }

// Poly Pizza
if (!ENV.POLY_PIZZA_API_KEY) ghi('Poly Pizza', null, 'chưa điền POLY_PIZZA_API_KEY (nhập theo ID vẫn chạy không cần khoá; tìm kiếm thì cần)');
else { const r = await goi('https://api.poly.pizza/v1.1/search/bear?Limit=1', { 'x-auth-token': ENV.POLY_PIZZA_API_KEY });
  ghi('Poly Pizza', r.s === 200, r.s === 200 ? `khoá hợp lệ, tìm thử "bear" ra ${r.j?.total ?? r.j?.results?.length ?? '?'} kết quả` : r.s === 401 || r.s === 403 ? `khoá bị từ chối (${r.s})` : `mã ${r.s} ${r.loi || ''}`); }

// Roblox Open Cloud
if (!ENV.ROBLOX_API_KEY) ghi('Roblox', null, 'chưa điền ROBLOX_API_KEY');
else { const id = ENV.ROBLOX_TEST_ASSET_ID || '1818';
  const a = await goi(`https://apis.roblox.com/assets/v1/assets/${id}`, { 'x-api-key': ENV.ROBLOX_API_KEY });
  const b = await goi(`https://apis.roblox.com/asset-delivery-api/v1/assetId/${id}`, { 'x-api-key': ENV.ROBLOX_API_KEY });
  const doc = (s) => s === 200 ? 'được' : s === 401 ? 'khoá sai (401)' : s === 403 ? 'khoá đúng nhưng thiếu quyền hoặc không có quyền với asset này (403)' : s === 404 ? 'không thấy asset (404)' : `mã ${s}`;
  const ok = a.s === 200 || b.s === 200; const sai = a.s === 401 && b.s === 401;
  ghi('Roblox', ok ? true : false, `asset ${id}: đọc thông tin ${doc(a.s)}; tải file ${doc(b.s)}` + (sai ? '' : ok ? '' : ' → kiểm quyền của khoá (assets: read, legacy-asset: manage) hoặc điền ROBLOX_TEST_ASSET_ID là asset của bạn')); }

// Polyfork
ghi('Polyfork', null, ENV.POLYFORK_API_KEY ? 'đã có khoá, nhưng repo chưa có lệnh gọi API Polyfork nào để thử (model Polyfork hiện tải tay vào assets/polyfork/)' : 'chưa điền POLYFORK_API_KEY; repo hiện không gọi API Polyfork');

// Poly Haven + Blender
{ const r = await goi('https://api.polyhaven.com/types'); ghi('Poly Haven', r.s === 200, r.s === 200 ? 'không cần khoá, API trả lời' : `mã ${r.s} ${r.loi || ''}`); }
ghi('Blender', ENV.BLENDER && fs.existsSync(ENV.BLENDER) ? true : false, ENV.BLENDER ? (fs.existsSync(ENV.BLENDER) ? 'tìm thấy file chạy' : 'đường dẫn BLENDER không tồn tại') : 'chưa điền BLENDER');
process.exit(kq.includes(false) ? 1 : 0);
