#!/usr/bin/env python3
"""Tạo giọng đọc CẢ PHIM cho nhiều giọng → episodes/<ep>/voices/ + index.json (trình phát chọn giọng).

  python tools/voices_build.py ep001 en            # mọi giọng tiếng Anh Microsoft (Edge), 4 giọng song song
  python tools/voices_build.py ep001 vi            # mọi giọng tiếng Việt CapCut (qua engine VoiceStudio)
  python tools/voices_build.py ep001 index         # chỉ nén .ogg + ghi index.json từ những gì đã có
Tuỳ chọn: --only <id1,id2>  --jobs 4  --py-capcut "<python có miniaudio/requests>" (mặc định .venv của VoiceStudio)

- Tiếng Anh: tools/en/tts_en.py --voice <id> --out voices/en/<id> (đọc theo nhịp cắt cảnh, phụ đề riêng từng giọng).
- Tiếng Việt: tools/tts.py với bản sao narration.txt đổi @narrator → voices/vi/<id>.txt → <id>.mp3 (câu đặt đúng @at).
- Mỗi giọng nén thêm .ogg (Opus 32 kb/s mono, chuẩn hoá âm lượng −18 LUFS để đổi giọng không to nhỏ khác nhau).
Bỏ qua giọng đã có .mp3 (xoá file để làm lại)."""
import argparse, asyncio, json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ap = argparse.ArgumentParser()
ap.add_argument('ep'); ap.add_argument('what', choices=['en', 'vi', 'index', 'sample'])
ap.add_argument('--sample-s', type=float, default=26.4, help='độ dài đoạn nghe thử (giây)')
ap.add_argument('--only'); ap.add_argument('--jobs', type=int, default=4)
ap.add_argument('--py-capcut', default=r'S:\ChatGPT\MMO TOOL\TTS1\.venv\Scripts\python.exe')
args = ap.parse_args()
EPD = ROOT / 'episodes' / args.ep
VD = EPD / 'voices'
ENV = {**os.environ, 'PYTHONIOENCODING': 'utf8', 'PYTHONDONTWRITEBYTECODE': '1'}
only = set(args.only.split(',')) if args.only else None


def edge_voices():
    import edge_tts
    vs = asyncio.run(edge_tts.list_voices())
    return [v for v in vs if v['Locale'].startswith('en-')]


def capcut_voices():
    out = []
    for ln in (ROOT / 'tools' / 'voice_studio' / 'voices-capcut.txt').read_text(encoding='utf8').splitlines():
        m = re.match(r'(\S+)\s+vi-VN\s+\S+\s+(.+)$', ln.strip())
        if m: out.append((m.group(1), m.group(2).strip()))
    return out


def run(cmd, log):
    r = subprocess.run(cmd, cwd=ROOT, env=ENV, capture_output=True, text=True, encoding='utf8', errors='replace')
    tail = (r.stdout + r.stderr).strip().splitlines()[-3:]
    print(f'[{"ok" if r.returncode == 0 else "LỖI"}] {log}  {" | ".join(tail)}', flush=True)
    return r.returncode == 0


def do_en():
    (VD / 'en').mkdir(parents=True, exist_ok=True)
    vs = [v['ShortName'] for v in edge_voices() if not only or v['ShortName'] in only]
    todo = [v for v in vs if not (VD / 'en' / f'{v}.mp3').exists()]
    print(f'{len(vs)} giọng Anh, cần làm {len(todo)}', flush=True)
    with ThreadPoolExecutor(args.jobs) as ex:
        list(ex.map(lambda v: run([sys.executable, 'tools/en/tts_en.py', args.ep, '--voice', v, '--out', str(VD / 'en' / v)], v), todo))


def do_vi():
    (VD / 'vi').mkdir(parents=True, exist_ok=True)
    src = (EPD / 'narration.txt').read_text(encoding='utf8')
    m = re.search(r'^@narrator\s+\S+\s*(\S*)', src, re.M); rate = m.group(1) if m and m.group(1) else '20'
    vs = [(i, n) for i, n in capcut_voices() if not only or i in only]
    todo = [(i, n) for i, n in vs if not (VD / 'vi' / f'{i}.mp3').exists()]
    print(f'{len(vs)} giọng Việt CapCut, cần làm {len(todo)}', flush=True)
    for k, (vid, name) in enumerate(todo, 1):
        txt = VD / 'vi' / f'{vid}.txt'
        txt.write_text(re.sub(r'^@narrator .*$', f'@narrator {vid} {rate}', src, flags=re.M), encoding='utf8')
        for attempt in range(3):   # CapCut đôi khi báo "tác vụ thất bại" thoáng qua; câu đã xong nằm trong cache
            if run([args.py_capcut, 'tools/tts.py', str(txt), '--workers', '2'], f'({k}/{len(todo)}) {vid} — {name} [lần {attempt + 1}]'): break


def ogg(mp3):
    o = mp3.with_suffix('.ogg')
    if not o.exists() or o.stat().st_mtime < mp3.stat().st_mtime:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-ac', '1', '-ar', '48000', '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11', '-c:a', 'libopus', '-b:a', '32k',
                        '-application', 'voip', str(o)], check=True)
    return o


def do_index():
    items = []
    names = dict(capcut_voices())
    for mp3 in sorted((VD / 'vi').glob('*.mp3')):
        vid = mp3.stem
        if only and vid not in only: continue   # chỉ giọng người dùng đã chốt
        items.append({'id': vid, 'lang': 'vi', 'source': 'capcut', 'label': names.get(vid, vid),
                      'audio': '/' + ogg(mp3).relative_to(ROOT).as_posix()})
    try: info = {v['ShortName']: v for v in edge_voices()}
    except Exception: info = {}
    for mp3 in sorted((VD / 'en').glob('*.mp3')):
        vid = mp3.stem; caps = mp3.with_suffix('.caps.json')
        if only and vid not in only: continue
        if not caps.exists(): continue
        v = info.get(vid, {}); g = {'Female': 'nữ', 'Male': 'nam'}.get(v.get('Gender'), '')
        nm = re.sub(r'^en-[A-Z]{2}-|Neural$', '', vid).replace('Multilingual', ' Multilingual')
        items.append({'id': vid, 'lang': 'en', 'source': 'edge', 'label': f"{nm} ({vid[3:5]}{', ' + g if g else ''})",
                      'audio': '/' + ogg(mp3).relative_to(ROOT).as_posix(), 'caps': '/' + caps.relative_to(ROOT).as_posix()})
    # giọng mặc định: Giọng Bé (vi), Andrew Multilingual (en)
    order = {'BV074_streaming_dsp': 0, 'en-US-AndrewMultilingualNeural': 0}
    items.sort(key=lambda x: (x['lang'] != 'vi', order.get(x['id'], 1), x['label']))
    (VD / 'index.json').write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding='utf8')
    print(f"index.json: {sum(i['lang'] == 'vi' for i in items)} giọng Việt, {sum(i['lang'] == 'en' for i in items)} giọng Anh")


def do_sample():
    """Đoạn mở đầu ~25 s cho MỌI giọng → output/nghe-thu/{vi,en}/ + trang nghe thử index.html."""
    OUT = ROOT / 'output' / 'nghe-thu'; (OUT / 'vi').mkdir(parents=True, exist_ok=True); (OUT / 'en').mkdir(parents=True, exist_ok=True)
    src = (EPD / 'narration.txt').read_text(encoding='utf8')
    m = re.search(r'^@narrator\s+\S+\s*(\S*)', src, re.M); rate = m.group(1) if m and m.group(1) else '20'
    head = []
    for ln in src.splitlines():
        mm = re.match(r'@at\s+([\d.]+)', ln)
        if mm and float(mm.group(1)) >= args.sample_s - 0.5: break
        head.append(ln)
    head = '\n'.join(head) + '\n'
    en = [v['ShortName'] for v in edge_voices()]
    vi = capcut_voices()
    def one_en(v):
        if not (OUT / 'en' / f'{v}.mp3').exists():
            run([sys.executable, 'tools/en/tts_en.py', args.ep, '--voice', v, '--until', str(args.sample_s), '--out', str(OUT / 'en' / v)], v)
    def one_vi(item):
        vid, name = item
        if (OUT / 'vi' / f'{vid}.mp3').exists(): return
        txt = OUT / 'vi' / f'{vid}.txt'
        txt.write_text(re.sub(r'^@narrator .*$', f'@narrator {vid} {rate}', head, flags=re.M), encoding='utf8')
        for attempt in range(3):
            if run([args.py_capcut, 'tools/tts.py', str(txt), '--workers', '2', '--tail', '0.3'], f'{vid} — {name} [lần {attempt + 1}]'): break
    with ThreadPoolExecutor(args.jobs) as ex:
        fe = [ex.submit(one_en, v) for v in en]
        for it in vi: one_vi(it)          # CapCut: lần lượt (giới hạn song song của dịch vụ)
        [f.result() for f in fe]
    write_sample_page(OUT, vi, edge_voices())


def write_sample_page(OUT, vi, edge):
    import html as H
    g = {v['ShortName']: ({'Female': 'nữ', 'Male': 'nam'}.get(v['Gender'], ''), v['Locale']) for v in edge}
    rows = []
    for k, (vid, name) in enumerate(vi, 1):
        if (OUT / 'vi' / f'{vid}.mp3').exists():
            rows.append(('vi', k, vid, name, 'CapCut', f'vi/{vid}.mp3'))
    for k, v in enumerate(sorted(g, key=lambda x: (g[x][1] != 'en-US', x)), 1):
        if (OUT / 'en' / f'{v}.mp3').exists():
            nm = re.sub(r'^en-[A-Z]{2}-|Neural$', '', v).replace('Multilingual', ' Multilingual')
            rows.append(('en', k, v, f'{nm} — {g[v][1]}, {g[v][0]}', 'Microsoft', f'en/{v}.mp3'))
    def table(lang, title):
        tr = ''.join(f'<tr><td class=n>{k}</td><td><b>{H.escape(n)}</b><div class=id>{H.escape(i)}</div></td>'
                     f'<td><audio controls preload=none src="{H.escape(p)}"></audio></td>'
                     f'<td><label><input type=checkbox data-id="{H.escape(i)}" data-lang={l}> Giữ</label></td></tr>'
                     for l, k, i, n, s, p in rows if l == lang)
        return f'<h2>{title} <span>({sum(r[0] == lang for r in rows)} giọng)</span></h2><table>{tr}</table>'
    page = f'''<!doctype html><html lang=vi><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Nghe thử giọng</title><style>
:root{{--bg:#0f1218;--fg:#e8ecf3;--mut:#8b93a7;--line:#262c3b;--acc:#e5484d}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px system-ui,'Segoe UI',sans-serif;padding:16px;max-width:900px;margin:auto}}
h1{{font-size:20px}} h2{{font-size:17px;margin-top:28px}} h2 span,.id,.n{{color:var(--mut);font-weight:400;font-size:12.5px}}
table{{width:100%;border-collapse:collapse}} td{{padding:7px 6px;border-bottom:1px solid var(--line);vertical-align:middle}}
audio{{width:min(320px,52vw);height:34px}} label{{cursor:pointer;white-space:nowrap}} input{{accent-color:var(--acc);width:17px;height:17px;vertical-align:-3px}}
#out{{position:sticky;bottom:0;background:#171b24;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-top:20px}}
textarea{{width:100%;height:70px;background:#0b0e13;color:var(--fg);border:1px solid var(--line);border-radius:6px;font:12.5px monospace}}
button{{background:var(--acc);color:#fff;border:0;border-radius:7px;padding:8px 14px;font-weight:600;cursor:pointer}}</style>
<h1>Nghe thử giọng đọc — 25 giây đầu phim</h1>
<p style="color:var(--mut)">Bấm ▶ để nghe. Tích <b>Giữ</b> những giọng muốn làm cả phim, rồi bấm <b>Chép danh sách</b> và dán gửi Claude.</p>
{table('vi', 'Tiếng Việt — CapCut')}{table('en', 'Tiếng Anh — Microsoft')}
<div id=out><button id=cp>Chép danh sách</button> <span id=cnt style="color:var(--mut)"></span><textarea id=ta readonly></textarea></div>
<script>
const ta=document.getElementById('ta'),cnt=document.getElementById('cnt');
function upd(){{const c=[...document.querySelectorAll('input[data-id]:checked')];ta.value='Giữ các giọng: '+c.map(x=>x.dataset.id).join(', ');cnt.textContent=c.length+' giọng đã chọn';}}
document.addEventListener('change',upd);upd();
document.addEventListener('play',e=>{{for(const a of document.querySelectorAll('audio'))if(a!==e.target)a.pause();}},true);
document.getElementById('cp').onclick=()=>{{ta.select();try{{navigator.clipboard.writeText(ta.value)}}catch(e){{document.execCommand('copy')}}}};
</script></html>'''
    (OUT / 'index.html').write_text(page, encoding='utf8')
    print(f"trang nghe thử: {OUT / 'index.html'} — {sum(r[0] == 'vi' for r in rows)} Việt, {sum(r[0] == 'en' for r in rows)} Anh")


{'en': do_en, 'vi': do_vi, 'index': do_index, 'sample': do_sample}[args.what]()
