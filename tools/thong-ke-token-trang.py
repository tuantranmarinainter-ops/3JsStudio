# python tools/thong-ke-token-trang.py  — dựng trang so sánh token/thời gian theo tập từ output/artifact/token/du-lieu.json
# (chạy tools/thong-ke-token.py trước). Mỗi biểu đồ MỘT chuỗi số (độ lớn) → một màu, nhãn số ghi thẳng, có bảng số bên dưới.
import json, os, html, subprocess
R = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
D = json.load(open(R + '/output/artifact/token/du-lieu.json', encoding='utf-8'))
T = D['tap']
def commits(ep):
    try:
        o = subprocess.run(['git', '-C', R, 'log', '--format=%ad', '--date=format:%Y-%m-%d', '--', f'episodes/{ep}'], capture_output=True, text=True).stdout.split()
        return len(o), (min(o) if o else ''), (max(o) if o else '')
    except Exception:
        return 0, '', ''
# Đánh số theo cách người dùng nhớ: 4 lần làm phim. (khoá số liệu, tên, thư mục tập trong repo, tên phim, nền tảng, nội dung, trạng thái)
TAP = [('rb', 'Tập 1', '', 'Nhà có chân — bản Roblox Studio', 'Roblox Studio (thư mục S:/ROBLOX CLAUDE)',
        'Lần làm đầu tiên của câu chuyện ngôi nhà mọc chân, dựng trực tiếp trong Roblox Studio. Sau đó chuyển hẳn sang dựng bằng three.js vì làm trong Studio tốn công.',
        'Đã dừng, thay bằng bản three.js'),
       ('ep1', 'Tập 2', 'ep001', 'Ngôi nhà biết đi', 'three.js — ep001 trong repo',
        'Mỗi đêm một ngôi nhà ngẫu nhiên mọc chân, đi tới một nơi trên thế giới rồi đêm sau đi về. Nhà của nhân vật chính thì không về: nó đi tiếp mỗi đêm, và các nơi nó dừng trùng đúng thứ tự bưu thiếp ba gửi về — ngôi nhà đang lần theo dấu ba. Cùng câu chuyện với Tập 1 nhưng làm lại từ đầu; số liệu gồm cả việc dựng lõi engine, trình phát/studio, dây chuyền và công cụ.',
        'Đã có bản hoàn chỉnh, đang sửa theo góp ý'),
       ('ep2', 'Tập 3', 'ep002', 'Món đồ biến mất trong phòng khóa kín', 'three.js — ep002 trong repo',
        'Ở thị trấn này đồ đạc cứ biến mất dù phòng đã khóa kín. Gà mất sợi dây chuyền bà để lại. Thủ phạm là lũ gấu bông ông Bách phát miễn phí, trong đó có Bắp; ông Bách còn tự giấu hàng của mình rồi báo mất để không ai nghi. Lần dựng đầu của câu chuyện Gà và Bắp, theo kịch bản chữ và file giọng mẫu.',
        'Tạm gác ở bản xem thử (104 shot, 124,5 giây)'),
       ('ep3', 'Tập 4', 'ep003', 'Ở thị trấn này — Gà và Bắp (bản storyboard 104 khung)', 'three.js — ep003 trong repo',
        'Cùng câu chuyện Gà và Bắp, dựng lại theo bộ storyboard 104 khung hình có sẵn bối cảnh, nhân vật và 37 biểu cảm; dân làng chuyển sang thân R6. Mục tiêu là khớp từng khung với ảnh gốc.',
        'Đang dựng: phòng Gà đã dựng lại, phần lớn shot chưa khớp khung gốc; chưa có tiếng động, nhạc')]
rows = []
for k, ten, ep, phim, nen, noi_dung, trang_thai in TAP:
    c = T.get(k, {}); n, d0, d1 = commits(ep) if ep else (0, '', '')
    rows.append(dict(k=k, ten=ten, mo_ta=phim, phim=phim, nen=nen, noi_dung=noi_dung, trang_thai=trang_thai, tong=c.get('tong', 0), moi=c.get('moi', 0), ra=c.get('ra', 0), doc=c.get('doc_dem', 0), gio=c.get('gio', 0),
                     luot=c.get('luot', 0), agent=c.get('luot_agent', 0), chinh=c.get('luot_chinh', 0), commit=n, d0=c.get('tu', ''), d1=c.get('den', '')))
T['chung'] = {**T.get('chung', {}), 'tong': T.get('chung', {}).get('tong', 0) + T.get('ep4', {}).get('tong', 0)}   # vài lượt lẻ nhắc "tập 4" → gộp vào phần không gán được
chung = T.get('chung', {})
e = lambda s: html.escape(str(s))
def so(v, don_vi='tr'):
    if don_vi == 'tr':
        return ('%.0f' % (v / 1e6)).replace('.', ',') + ' triệu' if v >= 1e7 else (('%.1f' % (v / 1e6)).replace('.', ',') + ' triệu' if v >= 1e5 else ('0' if v < 5e4 else '<0,1 triệu'))
    return ('%.1f' % v).replace('.', ',') + ' giờ'
def chart(tieu_de, chu_thich, khoa, don_vi):
    mx = max(r[khoa] for r in rows) or 1
    h = f'<figure class="ch"><figcaption><b>{e(tieu_de)}</b><span class="mu">{e(chu_thich)}</span></figcaption><div class="bars">'
    for r in rows:
        w = r[khoa] / mx * 100
        nhan = so(r[khoa], don_vi) if r[khoa] else 'chưa có'
        h += (f'<div class="row" tabindex="0" data-tip="{e(r["ten"])}: {e(nhan)}"><span class="lb">{e(r["ten"])}</span>'
              f'<span class="tr"><i style="width:{max(w, 0.6 if r[khoa] else 0):.2f}%"></i></span><span class="vl num">{e(nhan)}</span></div>')
    return h + '</div></figure>'
tong_all = sum(r['tong'] for r in rows) + chung.get('tong', 0)
the = ''.join(f'<article class="ep"><div class="hd"><span class="so">{e(r["ten"])}</span><b>{e(r["phim"])}</b></div><p class="mu">{e(r["nen"])} · {e(r["d0"][5:])} → {e(r["d1"][5:])}</p><p>{e(r["noi_dung"])}</p><p class="tt"><span class="k">Trạng thái</span> {e(r["trang_thai"])}</p><p class="num mu">{so(r["tong"])} token · {so(r["moi"])} mới · {so(r["gio"], "h")} máy</p></article>' for r in rows)
bang = ''.join(f'<tr><th scope="row">{e(r["ten"])}<small>{e(r["mo_ta"])}</small></th><td class="num">{so(r["tong"])}</td><td class="num">{so(r["moi"])}</td><td class="num">{so(r["ra"])}</td>'
               f'<td class="num">{so(r["gio"], "h") if r["gio"] else "—"}</td><td class="num">' + f'{r["luot"]:,}'.replace(',', '.') + f'</td><td class="num">{(str(round(r["agent"] / r["luot"] * 100)) + "%") if r["luot"] else "—"}</td>'
               f'<td class="num">{r["commit"] or "—"}</td><td class="num">{e((r["d0"][5:] + " → " + r["d1"][5:]) if r["d0"] else "—")}</td></tr>' for r in rows)
page = f'''<title>Token theo tập</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&display=swap">
<style>
/* Bố cục: ba biểu đồ cột ngang một chuỗi (độ lớn) xếp dọc, rồi bảng số; một màu nhấn cho dữ liệu, chữ dùng mực chữ. */
:root{{--bg:#f3f5f8;--panel:#fff;--line:#d5dbe5;--fg:#17202c;--mu:#5d6a7e;--data:#2a6fc9;--track:#e6eaf1;--warn:#9a6200;--warnbg:#fff6e0;--font:"Be Vietnam Pro","Segoe UI",system-ui,sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#0e1116;--panel:#161b23;--line:#2a3342;--fg:#e8ecf2;--mu:#8b96a8;--data:#5aa2f5;--track:#222a37;--warn:#f5b84a;--warnbg:#2a2210;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#0e1116;--panel:#161b23;--line:#2a3342;--fg:#e8ecf2;--mu:#8b96a8;--data:#5aa2f5;--track:#222a37;--warn:#f5b84a;--warnbg:#2a2210;color-scheme:dark}}
body{{background:var(--bg);color:var(--fg);font:15px/1.5 var(--font);padding-block:18px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
main{{max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:14px}}h1{{font-size:22px;font-weight:800;margin:0}}h2{{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);margin:8px 0 0;font-weight:600}}
p{{margin:0}}.mu{{color:var(--mu);font-size:13px}}.num{{font-variant-numeric:tabular-nums}}
.hero{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}}.hero div{{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px}}.hero b{{display:block;font-size:22px;font-weight:800}}
.ch{{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px}}.ch figcaption{{display:flex;flex-direction:column;margin-bottom:8px}}
.bars{{display:flex;flex-direction:column;gap:8px}}.row{{display:grid;grid-template-columns:52px 1fr auto;gap:10px;align-items:center;border-radius:6px;padding:2px 0}}
.row:focus-visible{{outline:2px solid var(--data);outline-offset:2px}}.lb{{font-weight:600}}.tr{{display:block;height:14px;background:var(--track);border-radius:0 4px 4px 0;overflow:hidden}}
.tr i{{display:block;height:100%;background:var(--data);border-radius:0 4px 4px 0}}.vl{{min-width:92px;text-align:right}}
.row:hover .tr i,.row:focus .tr i{{filter:brightness(1.15)}}
#tip{{position:fixed;pointer-events:none;background:var(--fg);color:var(--bg);padding:4px 8px;border-radius:6px;font-size:13px;z-index:5;transform:translate(-50%,-140%);white-space:nowrap}}
.tw{{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:10px}}table{{border-collapse:collapse;width:100%;font-size:14px;min-width:680px}}
td{{white-space:nowrap}}th,td{{padding:8px 10px;border-bottom:1px solid var(--line);text-align:right;vertical-align:top}}thead th{{font-size:12px;color:var(--mu);font-weight:600}}tbody th{{text-align:left;font-weight:600}}th:first-child{{text-align:left}}
tbody th small{{display:block;font-weight:400;color:var(--mu);font-size:12px}}tr:last-child th,tr:last-child td{{border-bottom:0}}
.eps{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:10px}}.ep{{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;min-width:0}}.ep .hd{{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}}.so{{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);border:1px solid var(--line);border-radius:99px;padding:1px 9px}}.k{{color:var(--mu);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}}
.warn{{background:var(--warnbg);border:1px solid var(--warn);border-radius:8px;padding:10px 12px;font-size:14px}}ul{{margin:4px 0 0;padding-left:18px}}li{{margin:2px 0}}
</style>
<main>
<header><h1>Token và thời gian theo tập</h1><p class="mu">3JS Studio · lập lúc {e(D["lap_luc"])} từ nhật ký các phiên Claude Code và agent phụ ở thư mục 3JS Studio và thư mục Roblox Studio</p></header>
<div class="hero"><div><b class="num">{so(tong_all)}</b><span class="mu">token cả dự án (gồm đọc lại bộ nhớ đệm)</span></div>
<div><b class="num">{so(sum(r["moi"] for r in rows))}</b><span class="mu">token mới (không tính đọc lại)</span></div>
<div><b class="num">{so(sum(r["gio"] for r in rows), "h")}</b><span class="mu">giờ máy làm việc, cộng mọi phiên và agent</span></div></div>
<h2>Bốn lần làm phim</h2><div class="eps">{the}</div>
<h2>So sánh</h2>
{chart("Tổng token", "Mọi token đi qua mô hình, gồm cả phần đọc lại từ bộ nhớ đệm (rẻ hơn nhiều so với token mới)", "tong", "tr")}
{chart("Token mới", "Token vào chưa có trong bộ nhớ đệm + token ghi đệm + token mô hình viết ra — sát với chi phí thật hơn", "moi", "tr")}
{chart("Giờ máy làm việc", "Cộng thời gian hoạt động của phiên chính và từng agent phụ; nhiều agent chạy song song thì cộng dồn, nên lớn hơn giờ đồng hồ", "gio", "h")}
<h2>Bảng số</h2>
<div class="tw"><table><thead><tr><th>Tập</th><th>Tổng token</th><th>Token mới</th><th>Token viết ra</th><th>Giờ máy</th><th>Lượt gọi mô hình</th><th>Do agent phụ</th><th>Commit</th><th>Thời gian làm</th></tr></thead><tbody>{bang}</tbody></table></div>
<div class="warn"><b>Cách đọc các con số này</b><ul>
<li>Việc gán một lượt làm việc cho tập nào là <b>ước lượng</b>: dựa vào tên tập được nhắc trong lượt đó; lượt không nhắc tập nào thì tính theo tập của lượt trước.</li>
<li><b>Cách đánh số</b>: theo bốn lần làm phim. Tập 1 là bản Roblox Studio; Tập 2, 3, 4 lần lượt là <code>ep001</code>, <code>ep002</code>, <code>ep003</code> trong repo. Nhật ký chỉ ghi câu chuyện "nhà có chân / nhà biết đi", không thấy "nhà trên cây".</li>
<li><b>Tập 2 gánh cả phần dựng nền</b>: lõi engine, trình phát/studio, dây chuyền, công cụ — vì các việc đó diễn ra khi mới chỉ có tập này. Con số Tập 2 vì vậy không phải "giá của một tập".</li>
<li>Tập 3 và Tập 4 chưa xong, nên số của hai tập này sẽ còn tăng.</li>
<li>Tập 1 tính trọn mọi phiên trong thư mục Roblox Studio. Không gồm Codex và các phiên ở thư mục khác.</li>
<li>Ngoài bốn tập còn {so(chung.get("tong", 0))} token không gán được cho tập nào.</li></ul></div>
</main>
<div id="tip" hidden></div>
<script>
const tip=document.getElementById('tip');
document.querySelectorAll('.row').forEach((r)=>{{const show=(x,y)=>{{tip.textContent=r.dataset.tip;tip.hidden=false;tip.style.left=x+'px';tip.style.top=y+'px';}};
r.addEventListener('pointermove',(ev)=>show(ev.clientX,ev.clientY));r.addEventListener('pointerleave',()=>{{tip.hidden=true;}});
r.addEventListener('focus',()=>{{const b=r.getBoundingClientRect();show(b.left+b.width/2,b.top);}});r.addEventListener('blur',()=>{{tip.hidden=true;}});}});
</script>
'''
open(R + '/output/artifact/token/index.html', 'w', encoding='utf-8').write(page)
for r in rows: print(r['ten'], so(r['tong']), so(r['moi']), so(r['gio'], 'h'), r['luot'], r['commit'], r['d0'], r['d1'])
print('chung', so(chung.get('tong', 0)), '· trang', len(page) // 1024, 'KB')
