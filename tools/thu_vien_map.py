#!/usr/bin/env python3
"""thu_vien_map.py — gộp kết quả nghiên cứu map (output/nghien-cuu-map/<video>/phan-tich-*.json) thành trang thư viện
một file: dist/thu-vien-map.html (ảnh cắt nhúng sẵn, lọc theo nhóm/video, tìm theo tên/từ khoá).

  python tools/thu_vien_map.py [--goc output/nghien-cuu-map] [--ra dist/thu-vien-map.html]

Mỗi video: thư mục có shot_NNN.jpg (từ tools/video2kb.py) + dia-diem.json + phan-tich-*.json do agent ghi
([{dia_diem, ten, cach_dung:{…}, dao_cu:[{ten, ten_en, nhom, mau, vat_lieu, kich_thuoc_stud, chi_tiet, tu_khoa_store, shot, khung}]}]).
"""
import argparse, base64, html, io, json, sys
from pathlib import Path
from PIL import Image

for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

ROOT = Path(__file__).resolve().parent.parent


def b64(im, w):
    im = im.convert('RGB')
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)))
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=80)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def shot_img(d, sid):
    try:
        p = d / f"shot_{int(str(sid).lstrip('s')):03d}.jpg"
        return Image.open(p) if p.exists() else None
    except ValueError:
        return None


def crop(im, k):
    if not im or not k or len(k) != 4:
        return None
    x, y, w, h = (float(v) for v in k)
    pad = 0.15
    x0 = max(0, x - w * pad); y0 = max(0, y - h * pad)
    x1 = min(1, x + w * (1 + pad)); y1 = min(1, y + h * (1 + pad))
    if x1 - x0 < 0.02 or y1 - y0 < 0.02:
        return None
    return im.crop((round(x0 * im.width), round(y0 * im.height), round(x1 * im.width), round(y1 * im.height)))


def esc(v):
    if isinstance(v, list):
        v = ', '.join(str(x) for x in v)
    return html.escape(str(v if v is not None else ''))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--goc', default=str(ROOT / 'output/nghien-cuu-map'))
    ap.add_argument('--ra', default=str(ROOT / 'dist/thu-vien-map.html'))
    a = ap.parse_args()
    goc = Path(a.goc)
    scenes, props = [], []
    for d in sorted(p for p in goc.iterdir() if p.is_dir() and not p.name.startswith('_')):
        for f in sorted(d.glob('phan-tich-*.json')):
            try:
                data = json.loads(f.read_text(encoding='utf-8'))
            except Exception as e:
                print(f'  ⚠ bỏ qua {f}: {e}'); continue
            for loc in data:
                dd = loc.get('dao_cu') or []
                first = next((x.get('shot') for x in dd if x.get('shot')), None)
                im = shot_img(d, first)
                scenes.append({'video': d.name, 'id': loc.get('dia_diem'), 'ten': loc.get('ten'),
                               'cd': loc.get('cach_dung') or {}, 'img': b64(im, 220) if im else '', 'n': len(dd)})
                for x in dd:
                    c = crop(shot_img(d, x.get('shot')), x.get('khung'))
                    props.append({**x, 'video': d.name, 'loc': loc.get('ten') or loc.get('dia_diem'),
                                  'img': b64(c, 180) if c else ''})
    groups = sorted({p.get('nhom') or 'khac' for p in props})
    videos = sorted({s['video'] for s in scenes})

    def swatches(m):
        out = []
        for c in (m if isinstance(m, list) else [m]):
            s = str(c); hx = s.split()[0] if s.startswith('#') else ''
            out.append(f'<span class="sw"><i style="background:{esc(hx)}"></i>{esc(s)}</span>' if hx else f'<span class="sw">{esc(s)}</span>')
        return ''.join(out)

    scene_html = []
    for s in scenes:
        rows = ''.join(f'<dt>{esc(k)}</dt><dd>{esc(v)}</dd>' for k, v in s['cd'].items())
        img = f'<img src="{s["img"]}" alt="">' if s['img'] else ''
        scene_html.append(f'<details class="scene" data-video="{esc(s["video"])}"><summary>{img}<div><b>{esc(s["ten"])}</b>'
                          f'<small>{esc(s["video"])} · {s["n"]} đạo cụ</small></div></summary><dl>{rows}</dl></details>')
    prop_html = []
    for p in props:
        kw = ''.join(f'<code>{esc(k)}</code>' for k in (p.get('tu_khoa_store') or []))
        img = f'<img src="{p["img"]}" alt="">' if p['img'] else '<div class="noimg">không có ảnh</div>'
        sl = f' ×{esc(p["so_luong"])}' if p.get('so_luong') else ''
        hay = ' '.join(str(p.get(k, '')) for k in ('ten', 'ten_en', 'vat_lieu', 'loc')) + ' ' + ' '.join(p.get('tu_khoa_store') or [])
        prop_html.append(
            f'<article class="prop" data-nhom="{esc(p.get("nhom") or "khac")}" data-video="{esc(p["video"])}" data-hay="{esc(hay.lower())}">'
            f'{img}<div class="b"><h3>{esc(p.get("ten"))}{sl}</h3><p class="en">{esc(p.get("ten_en"))} · <span class="tag">{esc(p.get("nhom"))}</span></p>'
            f'<div class="sws">{swatches(p.get("mau") or [])}</div>'
            f'<p><b>Vật liệu:</b> {esc(p.get("vat_lieu"))}</p><p><b>Cỡ (stud):</b> {esc(p.get("kich_thuoc_stud"))}</p>'
            f'<p><b>Chi tiết:</b> {esc(p.get("chi_tiet"))}</p><p class="kw">{kw}</p>'
            f'<p class="src">{esc(p["loc"])} · {esc(p["video"])} · {esc(p.get("shot"))}</p></div></article>')

    opt_g = ''.join(f'<button data-g="{esc(g)}">{esc(g)}</button>' for g in groups)
    opt_v = ''.join(f'<option value="{esc(v)}">{esc(v)}</option>' for v in videos)
    page = f'''<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thư viện map</title><style>
:root{{--bg:#f6f5f2;--card:#fff;--ink:#1d1d1f;--mut:#6b6b70;--line:#e3e1dc;--acc:#2f6fdf}}
@media (prefers-color-scheme:dark){{:root:not([data-theme=light]){{--bg:#16171a;--card:#202226;--ink:#ececee;--mut:#9a9aa2;--line:#33353a;--acc:#6aa0ff}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif}}
header{{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 16px}}
h1{{font-size:18px;margin:0 0 8px}}h2{{font-size:16px;margin:24px 0 10px}}main{{padding:0 16px 40px;max-width:1300px;margin:auto}}
.bar{{display:flex;flex-wrap:wrap;gap:6px;align-items:center}}input,select{{padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink)}}
input{{flex:1;min-width:160px}}button{{padding:5px 10px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);cursor:pointer}}
button.on{{background:var(--acc);color:#fff;border-color:var(--acc)}}
.scenes{{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px}}
.scene{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px}}.scene summary{{display:flex;gap:10px;cursor:pointer;list-style:none}}
.scene img{{width:64px;height:110px;object-fit:cover;border-radius:6px}}.scene small{{display:block;color:var(--mut)}}
dl{{margin:8px 0 0;font-size:13px}}dt{{font-weight:600;margin-top:6px}}dd{{margin:0;color:var(--mut)}}
.props{{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}}
.prop{{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;display:flex;flex-direction:column}}
.prop img,.noimg{{width:100%;height:150px;object-fit:contain;background:#0001}}.noimg{{display:grid;place-items:center;color:var(--mut)}}
.b{{padding:8px 10px}}h3{{margin:0;font-size:15px}}.b p{{margin:3px 0;font-size:13px}}.en{{color:var(--mut)}}.tag{{color:var(--acc)}}
.sws{{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}}.sw{{font-size:12px;display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line);border-radius:6px;padding:1px 6px}}
.sw i{{width:12px;height:12px;border-radius:3px;border:1px solid #0003}}code{{font-size:12px;background:#0000000d;border-radius:4px;padding:1px 5px;margin:0 3px 3px 0;display:inline-block;cursor:copy}}
.src{{color:var(--mut);font-size:12px!important}}.hide{{display:none!important}}#n{{color:var(--mut)}}
</style></head><body><header><h1>Thư viện map — nghiên cứu từ video</h1><div class="bar">
<input id="q" placeholder="Tìm tên, vật liệu, từ khoá…"><select id="v"><option value="">Mọi video</option>{opt_v}</select>
<button data-g="" class="on">tất cả</button>{opt_g}<span id="n"></span></div></header><main>
<h2>Bối cảnh & cách dựng ({len(scenes)})</h2><div class="scenes">{''.join(scene_html)}</div>
<h2>Đạo cụ ({len(props)}) <small style="font-weight:400;color:var(--mut)">— bấm từ khoá để chép</small></h2><div class="props">{''.join(prop_html)}</div>
</main><script>
let g='';const q=document.getElementById('q'),v=document.getElementById('v'),n=document.getElementById('n');
function f(){{const s=q.value.trim().toLowerCase();let c=0;document.querySelectorAll('.prop').forEach(e=>{{
const ok=(!g||e.dataset.nhom===g)&&(!v.value||e.dataset.video===v.value)&&(!s||e.dataset.hay.includes(s));e.classList.toggle('hide',!ok);if(ok)c++}});
document.querySelectorAll('.scene').forEach(e=>e.classList.toggle('hide',!!v.value&&e.dataset.video!==v.value));n.textContent=c+' đạo cụ'}}
document.querySelectorAll('button[data-g]').forEach(b=>b.onclick=()=>{{g=b.dataset.g;document.querySelectorAll('button[data-g]').forEach(x=>x.classList.toggle('on',x===b));f()}});
q.oninput=f;v.onchange=f;document.addEventListener('click',e=>{{if(e.target.tagName==='CODE')navigator.clipboard?.writeText(e.target.textContent)}});f();
</script></body></html>'''
    out = Path(a.ra); out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding='utf-8')
    print(f'{len(videos)} video · {len(scenes)} bối cảnh · {len(props)} đạo cụ → {out}')


if __name__ == '__main__':
    main()
