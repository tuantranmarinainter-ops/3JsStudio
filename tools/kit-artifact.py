# python tools/kit-artifact.py [ep003]  — dựng trang xem bộ kit (kich-ban/<ep>-kit/kit.json) cho Artifact: output/artifact/kit/index.html
# + ảnh storyboard/emote thu nhỏ. Trang do Claude viết; dữ liệu là của kit (Codex lập). Chuỗi bị hỏng dấu được đánh dấu, không tự bịa lại.
import json, re, os, html, glob, sys
from PIL import Image

EP = sys.argv[1] if len(sys.argv) > 1 else 'ep003'
R = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')).replace('\\', '/') + '/'
K = json.load(open(R + f'kich-ban/{EP}-kit/kit.json', encoding='utf-8'))
OUT = R + 'output/artifact/kit/'
os.makedirs(OUT + 'shots', exist_ok=True); os.makedirs(OUT + 'emote', exist_ok=True)

def bad(s):
    return isinstance(s, str) and re.search(r'[A-Za-zÀ-ỹ]\?[a-zà-ỹ ]|\?\?|[a-zà-ỹ]\?$', s) is not None
def e(s):
    return html.escape(str(s if s is not None else ''))
def t(s):
    return e(s) if not bad(s) else '<span class="mu">(chữ bị hỏng khi Codex ghi file)</span>'
def sw(h):
    return f'<i class="sw" style="background:{e(h)}"></i>' if h else ''
def bar(v):
    return f'<span class="mb"><i style="width:{int((v or 0) * 100)}%"></i></span>' if v is not None else '<span class="mu">chưa có</span>'

files = set()
for f in sorted(glob.glob(R + f'kich-ban/{EP}-goi2/shots/*.jpg')) + sorted(glob.glob(R + f'kich-ban/{EP}-goi/shots/*.jpg')) + sorted(glob.glob(R + f'kich-ban/{EP}-sb/*.jpg')):
    n = re.search(r'(\d{3})', os.path.basename(f))
    if not n: continue
    o = f'shots/s{n.group(1)}.jpg'
    if o in files: continue
    im = Image.open(f).convert('RGB'); im.thumbnail((300, 540)); im.save(OUT + o, quality=68); files.add(o)
for f in glob.glob(R + f'kich-ban/{EP}-goi2/emote/*.png') + glob.glob(R + f'kich-ban/{EP}-goi/emote/*.png'):
    o = 'emote/e' + os.path.basename(f)[:2] + '.png'   # tên ngắn eNN.png để liệt kê khi đăng
    if o in files: continue
    im = Image.open(f).convert('RGBA'); im.thumbnail((72, 72)); im.save(OUT + o); files.add(o)

MAU = {'sage': 'Tường nhà Gà', 'teal': 'Xanh cổ vịt', 'cam_dat': 'Cam đất', 'kem': 'Kem', 'tim': 'Tím', 'navy': 'Xám lam', 'hiem_lam': 'Lam mái hiên', 'go': 'Gỗ', 'cham': 'Chàm', 'dem': 'Xanh đêm', 'ho_phach': 'Hổ phách (đèn)', 'gach': 'Đỏ gạch', 'da_ga': 'Vàng da Gà', 'xanh_ao_ga': 'Xanh áo Gà'}
DV = {'giuong_ga': 'Giường Gà', 'tu_dau_giuong': 'Tủ đầu giường', 'ke_phong': 'Kệ gỗ phòng Gà', 'guong_dung': 'Gương đứng', 'ket_ga': 'Két của Gà', 'dong_ho': 'Đồng hồ báo thức', 'cuon_sach': 'Cuốn sách', 'day_chuyen': 'Dây chuyền của bà', 'anh_ba': 'Ảnh bà', 'chot_cua': 'Chốt cửa', 'den_ban': 'Đèn bàn', 'nhan_moi': 'Nhẫn mới', 'nm_bang_mat': 'Băng chuyền nhà máy', 'nm_ket_banh': 'Két tiệm bánh', 'nm_ke_gau': 'Kệ gấu', 'nm_ban_do': 'Bản đồ thị trấn', 'nm_thung_ngoai': 'Thùng gỗ ngoài sân', 'nm_thung_carton': 'Thùng các-tông', 'nm_hang_rao': 'Hàng rào nhà máy', 'pho_ban_gau': 'Bàn phát gấu', 'pho_quay_banh': 'Quầy bánh'}
TG = {'sang': 'sáng', 'trua': 'trưa', 'chieu': 'chiều', 'dem': 'đêm'}
BC = {b['id']: (b.get('ten') if b.get('ten') and not bad(b.get('ten')) else b['id']) for b in K['boi_canh']}
S = K['shots']; GA = 5.2
co_may = sum(1 for s in S if ((s.get('camera') or {}).get('dau') or {}).get('pos'))
P = []
tabs = [('shot', f'{len(S)} shot'), ('nv', 'Nhân vật'), ('dv', 'Đồ vật'), ('as', 'Ánh sáng'), ('bc', 'Bối cảnh'), ('mau', 'Bảng màu'), ('loi', 'Việc cần xử lý')]
P.append(f'<header><h1>Bộ kit tập 3</h1><p class="mu">Bản {e(K.get("phien_ban"))} do Codex lập từ {len(S)} khung storyboard · {len(K["boi_canh"])} bối cảnh · {len(K["do_vat"])} đồ vật · {len(K["anh_sang"])} bộ đèn · {len(K["nhan_vat"])} nhân vật</p>'
         f'<div class="warn"><b>Bản dở, chưa dùng làm số đo chuẩn.</b> Cả {len(S)} shot ghi mức tin cậy thấp; vị trí máy 3D mới có {co_may}/{len(S)}. Kích thước bối cảnh và đồ vật phần lớn chép từ bản dựng hiện tại của engine, chưa đo lại từ ảnh. Một số chữ tiếng Việt bị hỏng dấu khi Codex ghi file.</div></header>'
         '<nav class="tabs" role="tablist">' + ''.join(f'<button role="tab" data-tab="{k}" aria-selected="{"true" if k == "shot" else "false"}">{n}</button>' for k, n in tabs) + '</nav>')

opt = ''.join(f'<option value="{e(i)}">{e(n)} ({sum(1 for s in S if s.get("boi_canh_id") == i)})</option>' for i, n in BC.items())
P.append(f'<section data-p="shot"><div class="flt"><select id="fb" aria-label="Lọc theo bối cảnh"><option value="">Mọi bối cảnh</option>{opt}</select><input id="fq" type="search" placeholder="tìm mã shot / lời kể…" aria-label="Tìm shot"><span id="fn" class="mu"></span></div><div class="grid" id="shots">')
for s in S:
    cam = s.get('camera') or {}; kd = cam.get('khung_do_anh') or {}
    rows = []
    for n in (s.get('nhan_vat') or []):
        bt = n.get('bo_tri_trong_anh') or {}
        em = ('e' + os.path.basename(n['emote_file'])[:2] + '.png') if n.get('emote_file') else ''
        img = f'<img class="em" src="emote/{e(em)}" alt="">' if ('emote/' + em) in files else ''
        moc = (bt.get('cach_moc') or {}).get('moc')
        rows.append(f'<li>{img}<b>{e(n.get("id"))}</b> {t(bt.get("tu_the") or "")} · {t(bt.get("quay_mat_ve") or "")}' + (f' · mốc: {t(moc)}' if moc else '') + '</li>')
    fov = (cam.get('dau') or {}).get('fov_doc_do')
    im = f'shots/{s["id"]}.jpg'
    anh = f'<img src="{im}" alt="Khung storyboard {e(s["id"])}" loading="lazy">' if im in files else '<div class="noimg">không có ảnh</div>'
    q = (s['id'] + ' ' + str(s.get('loi_ke') or '') + ' ' + str(s.get('y_do') or '')).lower()
    ts = []
    if kd.get('co_canh'): ts.append('cỡ cảnh ' + e(kd['co_canh']))
    if kd.get('goc_ngang_do') is not None: ts.append('góc ngang ' + e(kd['goc_ngang_do']) + '°')
    if kd.get('goc_cao_do') is not None: ts.append('góc cao ' + e(kd['goc_cao_do']) + '°')
    if fov: ts.append('góc nhìn dọc ' + e(fov) + '°')
    P.append(f'<article class="card" data-b="{e(s.get("boi_canh_id"))}" data-q="{e(q)}">{anh}<div class="cb"><div class="hd"><b class="num">{e(s["id"])}</b>'
             f'<span class="tag">{e(BC.get(s.get("boi_canh_id"), s.get("boi_canh_id")))}</span><span class="tag">{e(TG.get(s.get("thoi_gian"), s.get("thoi_gian") or ""))}</span>'
             f'<span class="mu num">{float(s.get("t0") or 0):.1f}–{float(s.get("t1") or 0):.1f}s</span></div><p class="yd">{t(s.get("y_do"))}</p>'
             + (f'<p class="lk">“{t(s.get("loi_ke"))}”</p>' if s.get('loi_ke') else '')
             + ('<p><span class="k">Phải thấy</span> ' + ' · '.join(t(x) for x in s['phai_thay']) + '</p>' if s.get('phai_thay') else '')
             + ('<p><span class="k">Không được</span> ' + ' · '.join(t(x) for x in s['khong_duoc']) + '</p>' if s.get('khong_duoc') else '')
             + (f'<ul class="nv">{"".join(rows)}</ul>' if rows else '')
             + f'<p class="mu num">{" · ".join(ts)}</p></div></article>')
P.append('</div></section>')

P.append('<section data-p="nv" hidden><div class="grid2">' + ''.join(
    f'<article class="box"><div class="hd"><b>{t(n.get("ten") or n["id"])}</b><span class="mu">{e(n["id"])} · thân {e(n.get("loai_than") or "?")}</span></div>'
    f'<p class="num">{("Cao " + e(n["cao_stud"]) + " stud") if n.get("cao_stud") else "Chiều cao: chưa đo"}</p>'
    f'<p>{"".join(sw(v) + "<span class=mu>" + e(k) + "</span> " for k, v in (n.get("mau") or {}).items() if isinstance(v, str))}</p><p>{t(n.get("trang_phuc") or "")}</p>'
    f'<p class="mu num">{len(n.get("shot_xuat_hien") or [])} shot · tin cậy {e(n.get("tin_cay"))}</p></article>' for n in K['nhan_vat']) + '</div></section>')

def dv_card(d):
    kt = d.get('kich_thuoc') or {}; vl = d.get('vat_lieu') or {}
    h = min(140, max(2, (kt.get('cao') or 0) * 10)); w = min(150, max(2, (kt.get('rong') or 0) * 10))
    eng = ('Engine đã có: ' + e(d['co_san_trong_engine'])) if d.get('co_san_trong_engine') else '<b class="bad">Engine chưa có</b>'
    return (f'<article class="box"><div class="hd"><b>{e(DV.get(d["id"], d["id"]))}</b><span class="mu">{e(d["id"])}</span></div>'
            f'<div class="sc" aria-hidden="true"><i class="ga" style="height:52px"></i><i class="ob" style="height:{h:.0f}px;width:{w:.0f}px;background:{e(vl.get("mau_nen_hex") or "#888")}"></i></div>'
            f'<p class="num">{e(kt.get("rong"))} × {e(kt.get("cao"))} × {e(kt.get("sau"))} stud <span class="mu">(rộng × cao × sâu) · cao bằng {((kt.get("cao") or 0) / GA):.2f} lần Gà</span></p>'
            f'<p>{sw(vl.get("mau_nen_hex"))}<span class="num">{e(vl.get("mau_nen_hex"))}</span> {"".join(sw(x) for x in vl.get("mau_phu_hex") or [])}</p>'
            f'<p class="mt"><span>Nhám</span>{bar(vl.get("do_nham"))}<span>Kim loại</span>{bar(vl.get("kim_loai"))}<span>Cũ, bụi</span>{bar(vl.get("do_cu_bui"))}</p>'
            f'<p class="mu">{eng} · {len(d.get("shot_dung") or [])} shot</p></article>')
P.append('<section data-p="dv" hidden><div class="grid2">' + ''.join(dv_card(d) for d in K['do_vat']) + '</div><p class="mu">Thanh xám bên trái mỗi hình là Gà (5,2 stud) để so cỡ.</p></section>')

def as_card(a):
    key = a.get('key') or {}; fill = a.get('fill') or {}; lm = a.get('do_sang_dich_luma') or ['?', '?']
    return (f'<article class="box"><div class="hd"><b>{e(", ".join(BC.get(x, x) for x in a.get("cho") or []))} — {e(TG.get(a.get("thoi_gian"), a.get("thoi_gian")))}</b><span class="mu">{e(a["id"])}</span></div>'
            f'<p>{sw(key.get("mau_hex"))} đèn chính <span class="num">{e(key.get("mau_hex"))}</span></p><p>{sw(fill.get("mau_hex"))} đèn phụ <span class="num">{e(fill.get("mau_hex") or "chưa có")}</span></p>'
            f'<p class="num">Độ sáng đích: {e(lm[0])}–{e(lm[1])} · {len(a.get("den_thuc_te") or [])} đèn thực tế</p><p class="mu">Hướng và cường độ đèn: Codex chưa đo.</p></article>')
P.append('<section data-p="as" hidden><div class="grid2">' + ''.join(as_card(a) for a in K['anh_sang']) + '</div></section>')

def bc_card(b):
    k = b.get('kich_thuoc') or b.get('kich_thuoc_du_kien') or {}
    kt = f'{e(k.get("rong_x"))} × {e(k.get("sau_z"))} × {e(k.get("cao_y"))} stud (rộng × sâu × cao)' if k else 'chưa có kích thước'
    return (f'<article class="box"><div class="hd"><b>{e(BC[b["id"]])}</b><span class="mu">{e(b["id"])}</span></div><p class="num">{kt}</p>'
            f'<p class="mu num">{len(b.get("tuong") or [])} tường · {len(b.get("cua") or [])} cửa · {len(b.get("cua_so") or [])} cửa sổ · {len(b.get("vat_co_dinh") or [])} đồ cố định · {len(b.get("diem_dung") or [])} điểm đứng · {sum(1 for s in S if s.get("boi_canh_id") == b["id"])} shot</p></article>')
P.append('<section data-p="bc" hidden><div class="grid2">' + ''.join(bc_card(b) for b in K['boi_canh']) + '</div></section>')
P.append('<section data-p="mau" hidden><div class="pal">' + ''.join(f'<div><i style="background:{e(m["hex"])}"></i><b>{e(MAU.get(m["id"], m["id"]))}</b><span class="num mu">{e(m["hex"])}</span></div>' for m in K['bang_mau']) + '</div></section>')
P.append('<section data-p="loi" hidden><h2>Storyboard tự mâu thuẫn</h2>' + ''.join(f'<article class="box"><b>{e(m.get("shot"))}</b><p>{t(m.get("van_de"))}</p><p class="mu">Cách chọn: {t(m.get("cach_chon"))}</p></article>' for m in K.get('mau_thuan') or [])
         + '<h2>Engine còn thiếu</h2>' + ''.join(f'<article class="box"><b>{t(m.get("thu_gi"))}</b><p>{t(m.get("vi_sao_can"))}</p><p class="mu">Ưu tiên: {e(m.get("do_uu_tien"))}</p></article>' for m in K.get('thieu_trong_engine') or []) + '</section>')

CSS = '''
/* Bố cục: một cột trên điện thoại, lưới thẻ khi rộng; thẻ shot = ảnh dọc bên trái + thông số bên phải. */
:root{--bg:#f3f5f8;--panel:#fff;--line:#d5dbe5;--fg:#17202c;--mu:#5d6a7e;--acc:#1f6fd1;--warn:#9a6200;--warnbg:#fff6e0;--bad:#b3261e;--font:"Be Vietnam Pro","Segoe UI",system-ui,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0e1116;--panel:#161b23;--line:#2a3342;--fg:#e8ecf2;--mu:#8b96a8;--acc:#4da3ff;--warn:#f5b84a;--warnbg:#2a2210;--bad:#ff8a80;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0e1116;--panel:#161b23;--line:#2a3342;--fg:#e8ecf2;--mu:#8b96a8;--acc:#4da3ff;--warn:#f5b84a;--warnbg:#2a2210;--bad:#ff8a80;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:15px/1.5 var(--font);padding-block:18px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
header,nav,section{max-width:1100px;margin:0 auto}h1{font-size:22px;font-weight:800;margin:0}h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);margin:18px 0 8px}
p{margin:4px 0}.mu{color:var(--mu);font-size:13px}.num{font-variant-numeric:tabular-nums}.bad{color:var(--bad)}
.warn{background:var(--warnbg);border:1px solid var(--warn);border-radius:8px;padding:10px 12px;margin:10px 0;font-size:14px}
.tabs{display:flex;gap:6px;flex-wrap:wrap;position:sticky;top:env(safe-area-inset-top,0px);background:var(--bg);padding-block:8px;z-index:2}
.tabs button{background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:99px;padding:6px 12px;font:inherit;font-weight:600;cursor:pointer}
.tabs button[aria-selected="true"]{background:var(--acc);border-color:var(--acc);color:#fff}button:focus-visible,select:focus,input:focus{outline:2px solid var(--acc);outline-offset:1px}
.flt{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}.flt select,.flt input{background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:7px 9px;font:inherit;min-width:0;flex:1 1 160px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr));gap:10px}.grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:10px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;display:grid;grid-template-columns:120px 1fr;gap:10px;padding:8px;min-width:0}
.card>img,.noimg{width:120px;aspect-ratio:9/16;object-fit:cover;border-radius:6px;background:var(--line)}.noimg{display:grid;place-items:center;font-size:12px;color:var(--mu)}
.cb{min-width:0;font-size:14px}.hd{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}.tag{padding:1px 8px;border-radius:99px;border:1px solid var(--line);font-size:12px;color:var(--mu)}
.yd{font-weight:600}.lk{color:var(--mu);font-style:italic}.k{color:var(--mu);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.nv{list-style:none;padding:0;margin:4px 0;display:flex;flex-direction:column;gap:3px}.nv li{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.em{width:28px;height:28px;border-radius:6px;background:#ffe000}
.box{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;min-width:0}
.sw{display:inline-block;width:16px;height:16px;border-radius:4px;border:1px solid var(--line);vertical-align:-3px;margin-right:4px}
.sc{display:flex;align-items:flex-end;gap:10px;height:150px;border-bottom:2px solid var(--line);margin:6px 0;overflow:hidden}.sc .ga{width:14px;background:var(--mu);border-radius:3px 3px 0 0;opacity:.6}.sc .ob{border-radius:3px 3px 0 0;border:1px solid var(--line)}
.mt{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:center;font-size:13px}.mb{display:block;height:6px;border-radius:3px;background:var(--line);overflow:hidden}.mb i{display:block;height:100%;background:var(--acc)}
.pal{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}.pal div{display:flex;flex-direction:column;gap:2px}.pal i{height:64px;border-radius:8px;border:1px solid var(--line)}
'''
JS = '''const $=(s)=>document.querySelector(s),$$=(s)=>[...document.querySelectorAll(s)];
$$('.tabs button').forEach((b)=>{b.onclick=()=>{$$('.tabs button').forEach((x)=>x.setAttribute('aria-selected',x===b));$$('section[data-p]').forEach((s)=>{s.hidden=s.dataset.p!==b.dataset.tab;});};});
const loc=()=>{const b=$('#fb').value,q=$('#fq').value.trim().toLowerCase();let n=0;$$('#shots .card').forEach((c)=>{const on=(!b||c.dataset.b===b)&&(!q||c.dataset.q.includes(q));c.hidden=!on;if(on)n++;});$('#fn').textContent=n+' shot';};
$('#fb').onchange=loc;$('#fq').oninput=loc;loc();'''
page = ('<title>Bộ kit tập 3</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&display=swap">\n<style>' + CSS + '</style>\n' + '\n'.join(P) + '\n<script>' + JS + '</script>\n')
open(OUT + 'index.html', 'w', encoding='utf-8').write(page)
json.dump({f: f for f in sorted(files)}, open(OUT + 'files.json', 'w'))
print(len(page) // 1024, 'KB trang ·', len(files), 'ảnh ·', sum(os.path.getsize(OUT + f) for f in files) // 1024, 'KB ảnh')
