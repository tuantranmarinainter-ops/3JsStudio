// Trình phát studio từ R2 (binding PHIM). Chỉ ep001–003; không bao giờ ep004/ep005. Chạy sau Access.
// /phim/<ep>        → màn chờ nhỏ có thanh tải (MB/%); tải xong mới ghi thẳng vào trang (giữ nguyên địa chỉ, tránh blob: làm hỏng new URL tương đối).
// /phim/<ep>?raw=1  → chính file HTML thô từ R2 (Cloudflare tự nén khi gửi). Không tự đặt Content-Encoding.
const OK = new Set(['ep001', 'ep002', 'ep003']);
const CHO = (ep) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Đang tải ${ep}…</title>
<style>:root{color-scheme:dark light}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#111113;color:#ececec;font:17px/1.5 system-ui,sans-serif;text-align:center;padding:24px}
.b{height:10px;border-radius:5px;background:#2a2a2e;overflow:hidden;margin:16px 0 8px;width:min(80vw,360px)}.b i{display:block;height:100%;width:0;background:#8b86ff;transition:width .3s}.m{color:#9a9a9f;font-size:14px}a{color:#8b86ff}</style></head>
<body><div><b>Đang tải trình phát ${ep}</b><div class="b"><i id="i"></i></div><div id="t">Bắt đầu…</div><div class="m" id="m">Bản nặng (~70 MB). Mạng chậm thì chờ lâu; lần sau mở lại sẽ nhanh vì đã lưu trong máy.</div></div>
<script>
(async()=>{const $=(s)=>document.getElementById(s),mb=(n)=>(n/1048576).toFixed(1);
try{const r=await fetch('/phim/${ep}?raw=1',{credentials:'same-origin'});if(!r.ok)throw new Error('HTTP '+r.status);
const tong=+r.headers.get('x-goc-byte')||0,rd=r.body.getReader(),ch=[];let n=0;
for(;;){const {done,value}=await rd.read();if(done)break;ch.push(value);n+=value.length;$('i').style.width=(tong?Math.min(99,n/tong*100):50)+'%';$('t').textContent=mb(n)+(tong?' / '+mb(tong):'')+' MB'+(tong?' ('+Math.round(n/tong*100)+'%)':'');}
$('t').textContent='Đang mở trình phát…';const tx=await new Blob(ch).text();ch.length=0;document.open();document.write(tx);document.close();
}catch(e){$('t').textContent='Lỗi tải: '+e.message;$('m').innerHTML='<a href="">Thử lại</a>';}})();
</script></body></html>`;
export async function onRequestGet({ request, env, params }) {
  const ep = String(params.ep || '').replace(/\.html$/, '');
  if (!OK.has(ep) || !env.PHIM) return new Response('Not found', { status: 404 });
  const u = new URL(request.url);
  if (u.searchParams.get('raw') !== '1') return new Response(CHO(ep), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  const inm = request.headers.get('if-none-match');
  const o = await env.PHIM.get(`${ep}.html`, inm ? { onlyIf: { etagDoesNotMatch: inm } } : undefined);
  if (!o) return new Response('Not found', { status: 404 });
  const h = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, max-age=86400, must-revalidate', etag: o.httpEtag, 'x-goc-byte': String(o.size), 'x-robots-tag': 'noindex' };
  if (!o.body) return new Response(null, { status: 304, headers: h });
  return new Response(o.body, { headers: h });
}
