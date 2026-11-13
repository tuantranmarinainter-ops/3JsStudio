# python tools/thong-ke-sua-trang.py  — dựng trang "mỗi tập đã sửa gì để hoàn thiện" từ output/artifact/sua/du-lieu.json
# (dữ liệu do agent lập từ git log + handoff + góp ý; chỉ việc sửa phục vụ riêng tập, không tính viết chức năng).
import json, os, html
R = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
D = json.load(open(R + '/output/artifact/sua/du-lieu.json', encoding='utf-8'))
e = lambda s: html.escape(str(s if s is not None else ''))
NH = D['nhom']; TAP = D['tap']
dem = lambda t, n: sum(1 for m in t['muc'] if m.get('nhom') == n)
mx = max([dem(t, n) for t in TAP for n in NH] + [1])
tabs = ''.join(f'<button role="tab" data-tab="t{i}" aria-selected="{"true" if i == 0 else "false"}">{e(t["ten"])} <span class="num">{len(t["muc"])}</span></button>' for i, t in enumerate(TAP))
sec = []
for i, t in enumerate(TAP):
    ton = sum(1 for m in t['muc'] if m.get('con_ton'))
    bars = ''.join(f'<div class="row" tabindex="0" data-tip="{e(n)}: {dem(t, n)} việc sửa"><span class="lb">{e(n)}</span><span class="tr"><i style="width:{dem(t, n) / mx * 100:.1f}%"></i></span><span class="vl num">{dem(t, n)}</span></div>' for n in NH)
    ds = ''
    for n in NH:
        ms = [m for m in t['muc'] if m.get('nhom') == n]
        if not ms: continue
        ds += f'<h3>{e(n)} <span class="num mu">{len(ms)}</span></h3><ul class="ds">' + ''.join(
            f'<li class="{"ton" if m.get("con_ton") else ""}" data-ton="{1 if m.get("con_ton") else 0}"><span>{e(m.get("mo_ta"))}</span><span class="mt num">'
            + (f'{e(m["so_shot"])} shot · ' if m.get('so_shot') else '') + e(m.get('dot') or '') + (' · <b>còn tồn</b>' if m.get('con_ton') else '') + '</span></li>' for m in ms) + '</ul>'
    shot = (f'{e(t.get("so_shot_bi_sua"))}/{e(t.get("so_shot_tong"))}' + (' (ước lượng)' if t.get('uoc_luong') else '')) if t.get('so_shot_bi_sua') is not None and t.get('so_shot_tong') else '—'
    sec.append(f'''<section data-p="t{i}"{"" if i == 0 else " hidden"}>
<div class="ep"><div class="hd"><span class="so">{e(t["ten"])}</span><b>{e(t.get("phim"))}</b></div><p class="mu">{e(t.get("trang_thai"))}</p>{f'<p class="mu">{e(t["ghi_chu"])}</p>' if t.get("ghi_chu") else ""}</div>
<div class="hero"><div><b class="num">{len(t["muc"])}</b><span class="mu">việc sửa riêng cho tập</span></div><div><b class="num">{ton}</b><span class="mu">việc còn tồn</span></div>
<div><b class="num">{e(t.get("so_vong_gop_y")) if t.get("so_vong_gop_y") is not None else "—"}</b><span class="mu">vòng góp ý / duyệt</span></div><div><b class="num">{shot}</b><span class="mu">shot từng bị sửa</span></div></div>
<figure class="ch"><figcaption><b>Số việc sửa theo loại</b><span class="mu">Cùng một thang đo cho cả bốn tập để so được với nhau</span></figcaption><div class="bars">{bars}</div></figure>
{f'<label class="chk"><input type="checkbox" class="lt" id="lt{i}"> Chỉ hiện việc còn tồn</label>' if ton else ''}
{ds if ds else '<p class="mu">Không có lịch sử sửa được ghi lại cho tập này.</p>'}
</section>''')
bang = ''.join('<tr><th scope="row">' + e(n) + '</th>' + ''.join(f'<td class="num">{dem(t, n) or "—"}</td>' for t in TAP) + '</tr>' for n in NH)
bang += '<tr class="tg"><th scope="row">Tổng</th>' + ''.join(f'<td class="num">{len(t["muc"])}</td>' for t in TAP) + '</tr>'
page = f'''<title>Việc sửa theo tập</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&display=swap">
<style>
/* Bố cục: thẻ chọn tập → số chính → cột ngang một chuỗi theo loại việc → danh sách việc theo loại; cuối trang là bảng so 4 tập. */
:root{{--bg:#f3f5f8;--panel:#fff;--line:#d5dbe5;--fg:#17202c;--mu:#5d6a7e;--acc:#1f6fd1;--data:#2a6fc9;--track:#e6eaf1;--warn:#9a6200;--warnbg:#fff6e0;--font:"Be Vietnam Pro","Segoe UI",system-ui,sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#0e1116;--panel:#161b23;--line:#2a3342;--fg:#e8ecf2;--mu:#8b96a8;--acc:#4da3ff;--data:#5aa2f5;--track:#222a37;--warn:#f5b84a;--warnbg:#2a2210;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#0e1116;--panel:#161b23;--line:#2a3342;--fg:#e8ecf2;--mu:#8b96a8;--acc:#4da3ff;--data:#5aa2f5;--track:#222a37;--warn:#f5b84a;--warnbg:#2a2210;color-scheme:dark}}
body{{background:var(--bg);color:var(--fg);font:15px/1.5 var(--font);padding-block:18px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
main{{max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:12px}}section{{display:flex;flex-direction:column;gap:12px}}
h1{{font-size:22px;font-weight:800;margin:0}}h2{{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);margin:8px 0 0;font-weight:600}}h3{{font-size:15px;margin:6px 0 0}}
p{{margin:0}}.mu{{color:var(--mu);font-size:13px}}.num{{font-variant-numeric:tabular-nums}}
.tabs{{display:flex;gap:6px;flex-wrap:wrap;position:sticky;top:env(safe-area-inset-top,0px);background:var(--bg);padding-block:8px;z-index:2}}
.tabs button{{background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:99px;padding:6px 12px;font:inherit;font-weight:600;cursor:pointer}}
.tabs button[aria-selected="true"]{{background:var(--acc);border-color:var(--acc);color:#fff}}.tabs .num{{opacity:.75;font-weight:400}}button:focus-visible,input:focus-visible{{outline:2px solid var(--acc);outline-offset:1px}}
.ep{{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:4px}}.ep .hd{{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}}
.so{{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);border:1px solid var(--line);border-radius:99px;padding:1px 9px}}
.hero{{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}}.hero div{{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px}}.hero b{{display:block;font-size:22px;font-weight:800}}
.ch{{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px}}.ch figcaption{{display:flex;flex-direction:column;margin-bottom:8px}}
.bars{{display:flex;flex-direction:column;gap:8px}}.row{{display:grid;grid-template-columns:minmax(120px,190px) 1fr 32px;gap:10px;align-items:center;border-radius:6px}}.row:focus-visible{{outline:2px solid var(--data);outline-offset:2px}}
.lb{{font-size:14px}}.tr{{display:block;height:14px;background:var(--track);border-radius:0 4px 4px 0;overflow:hidden}}.tr i{{display:block;height:100%;background:var(--data);border-radius:0 4px 4px 0}}.vl{{text-align:right}}
#tip{{position:fixed;pointer-events:none;background:var(--fg);color:var(--bg);padding:4px 8px;border-radius:6px;font-size:13px;z-index:5;transform:translate(-50%,-140%);white-space:nowrap}}
.chk{{display:flex;gap:8px;align-items:center;cursor:pointer}}input[type=checkbox]{{accent-color:var(--acc)}}
.ds{{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}}.ds li{{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:2px}}
.ds li.ton{{border-color:var(--warn);background:var(--warnbg)}}.mt{{color:var(--mu);font-size:12px}}
.tw{{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:10px}}table{{border-collapse:collapse;width:100%;font-size:14px;min-width:520px}}
th,td{{padding:8px 10px;border-bottom:1px solid var(--line);text-align:right}}thead th{{font-size:12px;color:var(--mu);font-weight:600}}tbody th,th:first-child{{text-align:left;font-weight:600}}.tg th,.tg td{{border-bottom:0;font-weight:800}}
.warn{{background:var(--warnbg);border:1px solid var(--warn);border-radius:8px;padding:10px 12px;font-size:14px}}
</style>
<main>
<header><h1>Mỗi tập đã sửa gì để hoàn thiện</h1><p class="mu">3JS Studio · lập lúc {e(D.get("lap_luc"))} · chỉ tính việc sửa phục vụ riêng từng tập, không tính viết chức năng, công cụ hay lõi dùng chung</p></header>
<nav class="tabs" role="tablist">{tabs}</nav>
{"".join(sec)}
<h2>So bốn tập</h2>
<div class="tw"><table><thead><tr><th>Loại việc sửa</th>{"".join(f"<th>{e(t['ten'])}</th>" for t in TAP)}</tr></thead><tbody>{bang}</tbody></table></div>
<div class="warn">Danh sách lập từ lịch sử commit, các file bàn giao và file góp ý trong repo. Một việc sửa trải qua nhiều commit được gộp thành một dòng; số shot ghi "ước lượng" là đếm theo mô tả, không phải đo. Tập 3 và Tập 4 chưa xong nên danh sách còn dài thêm.</div>
</main>
<div id="tip" hidden></div>
<script>
const $$=(s)=>[...document.querySelectorAll(s)],tip=document.getElementById('tip');
$$('.tabs button').forEach((b)=>{{b.onclick=()=>{{$$('.tabs button').forEach((x)=>x.setAttribute('aria-selected',x===b));$$('section[data-p]').forEach((s)=>{{s.hidden=s.dataset.p!==b.dataset.tab;}});}};}});
$$('.lt').forEach((c)=>{{c.onchange=()=>{{c.closest('section').querySelectorAll('.ds li').forEach((li)=>{{li.hidden=c.checked&&li.dataset.ton!=='1';}});}};}});
$$('.row').forEach((r)=>{{const show=(x,y)=>{{tip.textContent=r.dataset.tip;tip.hidden=false;tip.style.left=x+'px';tip.style.top=y+'px';}};
r.addEventListener('pointermove',(ev)=>show(ev.clientX,ev.clientY));r.addEventListener('pointerleave',()=>{{tip.hidden=true;}});
r.addEventListener('focus',()=>{{const b=r.getBoundingClientRect();show(b.left+b.width/2,b.top);}});r.addEventListener('blur',()=>{{tip.hidden=true;}});}});
</script>
'''
open(R + '/output/artifact/sua/index.html', 'w', encoding='utf-8').write(page)
print('trang', len(page) // 1024, 'KB ·', ' | '.join(f'{t["ten"]}: {len(t["muc"])} việc, {sum(1 for m in t["muc"] if m.get("con_ton"))} tồn' for t in TAP))
