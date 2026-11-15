#!/usr/bin/env python3
"""nghien_cuu_map.py — chuẩn bị + kiểm việc nghiên cứu map từ video tham khảo (docs/nghien-cuu-map.md).

  python tools/nghien_cuu_map.py cat "<thư mục video>" [--chi "<từ trong tên>"] [--force]
      chép từng .mp4 sang output/nghien-cuu-map/_nguon/<slug>.mp4 (tên không dấu — ffmpeg/yt-dlp hỏng với đường dẫn có dấu)
      rồi chạy tools/video2kb.py --loi off --no-am-thanh → output/nghien-cuu-map/<slug>/. Video đã cắt thì bỏ qua.
  python tools/nghien_cuu_map.py kiem [<slug>]
      bảng trạng thái: số shot · đã gộp (dia-diem.json đủ shot?) · địa điểm đã/ chưa phân tích · số đạo cụ · lỗi JSON.
  python tools/nghien_cuu_map.py luoi <slug> [--shots s010,s020]   ảnh shot đại diện kẻ lưới 10×10 có nhãn → luoi/ (agent đọc khung theo ô)
  python tools/nghien_cuu_map.py bang-cat <slug>   bảng ảnh cắt đạo cụ có số → _kiem/<slug>/ (agent rẻ chấm đúng/sai)
"""
import argparse, json, re, shutil, subprocess, sys, unicodedata
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

ROOT = Path(__file__).resolve().parent.parent
GOC = ROOT / 'output' / 'nghien-cuu-map'


def slug(name):
    name = re.sub(r'\s*\[[^\]]*\]\s*$', '', Path(name).stem)          # bỏ [id YouTube]
    name = name.replace('đ', 'd').replace('Đ', 'D')
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def cat(a):
    src = Path(a.thu_muc)
    vids = sorted(src.glob('*.mp4'))
    if a.chi:
        vids = [v for v in vids if a.chi.lower() in v.name.lower()]
    if not vids:
        sys.exit(f'Không có .mp4 nào khớp trong {src}')
    (GOC / '_nguon').mkdir(parents=True, exist_ok=True)
    for v in vids:
        s = slug(v.name); out = GOC / s
        if (out / 'sheets').exists() and not a.force:
            print(f'  = {s} (đã cắt)'); continue
        dst = GOC / '_nguon' / f'{s}.mp4'
        if not dst.exists():
            shutil.copy2(v, dst)
        r = subprocess.run([sys.executable, str(ROOT / 'tools' / 'video2kb.py'), str(dst), '--out', str(out),
                            '--loi', 'off', '--no-am-thanh'], capture_output=True, text=True, encoding='utf-8', errors='replace')
        n = len(list(out.glob('shot_*.jpg')))
        print(f'  {"✓" if r.returncode == 0 else "✗"} {s}: {n} shot' + ('' if r.returncode == 0 else f'\n{r.stdout[-300:]}{r.stderr[-300:]}'))
        (out / 'nguon.txt').write_text(v.name, encoding='utf-8') if out.exists() else None


def kiem(a):
    dirs = [GOC / a.slug] if a.slug else sorted(p for p in GOC.iterdir() if p.is_dir() and not p.name.startswith('_'))
    tong = 0
    for d in dirs:
        if not d.exists():
            print(f'✗ {d.name}: chưa có'); continue
        n = len(list(d.glob('shot_*.jpg')))
        msg = [f'{d.name}: {n} shot']
        loi = []
        locs = None
        f = d / 'dia-diem.json'
        if f.exists():
            try:
                locs = json.loads(f.read_text(encoding='utf-8'))
                ids = [s for x in locs for s in x.get('shots', [])]
                want = {f's{i:03d}' for i in range(1, n + 1)}
                thieu = sorted(want - set(ids)); trung = len(ids) - len(set(ids))
                msg.append(f'{len(locs)} địa điểm')
                if thieu: loi.append(f'thiếu shot {",".join(thieu[:10])}{"…" if len(thieu) > 10 else ""}')
                if trung: loi.append(f'{trung} shot trùng nhóm')
                for x in locs:
                    if x.get('loai') not in ('can-mat', 'do-hoa') and not x.get('dai_dien'):
                        loi.append(f'{x.get("id")} không có shot đại diện')
            except Exception as e:
                loi.append(f'dia-diem.json lỗi: {e}')
        else:
            msg.append('chưa gộp')
        xong, dc = set(), 0
        for p in sorted(d.glob('phan-tich-*.json')):
            try:
                for x in json.loads(p.read_text(encoding='utf-8')):
                    xong.add(x.get('dia_diem')); dc += len(x.get('dao_cu') or [])
                    for k, o in enumerate(x.get('dao_cu') or []):
                        kh = o.get('khung')
                        if kh and (len(kh) != 4 or any(not 0 <= float(v) <= 1 for v in kh)):
                            loi.append(f'{p.name}: {x.get("dia_diem")} đạo cụ #{k} khung sai')
            except Exception as e:
                loi.append(f'{p.name} lỗi JSON: {e}')
        if locs is not None:
            can = [x['id'] for x in locs if x.get('loai') not in ('can-mat', 'do-hoa')]
            chua = [i for i in can if i not in xong]
            msg.append(f'phân tích {len(can) - len(chua)}/{len(can)}' + (f' (chưa: {", ".join(chua)})' if chua else ''))
        msg.append(f'{dc} đạo cụ'); tong += dc
        print(('✗ ' if loi else '✓ ') + ' · '.join(msg))
        for l in loi:
            print(f'    ⚠ {l}')
    if len(dirs) > 1:
        print(f'— {len(dirs)} video · {tong} đạo cụ')


def luoi(a):
    """Kẻ lưới 10×10 có nhãn lên shot đại diện (+ shot đạo cụ đang dùng) → luoi/shot_NNN.jpg, để agent đọc khung theo ô."""
    from PIL import Image, ImageDraw, ImageFont
    d = GOC / a.slug
    ids = set()
    f = d / 'dia-diem.json'
    if f.exists():
        for x in json.loads(f.read_text(encoding='utf-8')):
            ids.update(x.get('dai_dien') or [])
    for p in d.glob('phan-tich-*.json'):
        for x in json.loads(p.read_text(encoding='utf-8')):
            ids.update(o['shot'] for o in x.get('dao_cu') or [] if o.get('shot'))
    if getattr(a, 'shots', None):   # thêm shot chỉ định: --shots s010,s020
        ids.update(x.strip() for x in a.shots.split(',') if x.strip())
    (d / 'luoi').mkdir(exist_ok=True)
    try: font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 15)
    except OSError: font = ImageFont.load_default()
    for sid in sorted(ids):
        src = d / f'shot_{int(sid.lstrip("s")):03d}.jpg'
        if not src.exists(): continue
        im = Image.open(src).convert('RGB'); W, H = im.size
        dr = ImageDraw.Draw(im)
        for k in range(1, 10):
            x, y = W * k / 10, H * k / 10
            dr.line([(x, 0), (x, H)], fill=(255, 0, 255), width=1)
            dr.line([(0, y), (W, y)], fill=(255, 0, 255), width=1)
        for k in range(10):   # nhãn 0.0…0.9 ở mép trên (x) và mép trái (y)
            for t, pos in ((f'{k / 10:.1f}', (W * k / 10 + 2, 2)), (f'{k / 10:.1f}', (2, H * k / 10 + 2))):
                dr.text(pos, t, fill='yellow', font=font, stroke_width=2, stroke_fill='black')
        im.save(d / 'luoi' / src.name, quality=88)
    print(f'{len(ids)} ảnh lưới → {d / "luoi"}')


def bang_cat(a):
    """Ghép ảnh cắt mọi đạo cụ thành bảng có số + tên (48 ô/tờ) → _kiem/<slug>/crops_N.jpg + muc-luc.json (số → mục),
    để 1 agent rẻ chấm DUNG/LECH/SAI."""
    sys.path.insert(0, str(ROOT / 'tools'))
    from thu_vien_map import shot_img, crop
    from PIL import Image, ImageDraw, ImageFont
    d = GOC / a.slug; out = GOC / '_kiem' / a.slug; out.mkdir(parents=True, exist_ok=True)
    items = []
    for f in sorted(d.glob('phan-tich-*.json')):
        for loc in json.loads(f.read_text(encoding='utf-8')):
            for i, x in enumerate(loc.get('dao_cu') or []):
                items.append({'so': len(items) + 1, 'file': f.name, 'dia_diem': loc.get('dia_diem'), 'vi_tri': i,
                              'ten': x.get('ten'), 'ten_en': x.get('ten_en'), 'shot': x.get('shot'), 'khung': x.get('khung')})
    try: font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 13)
    except OSError: font = ImageFont.load_default()
    W, H, C = 160, 150, 8
    for p in range(0, len(items), 48):
        ch = items[p:p + 48]; rows = (len(ch) + C - 1) // C
        sh = Image.new('RGB', (C * W, rows * (H + 30)), 'white'); dr = ImageDraw.Draw(sh)
        for i, it in enumerate(ch):
            X, Y = (i % C) * W, (i // C) * (H + 30)
            c = crop(shot_img(d, it['shot']), it['khung'])
            if c: c.thumbnail((W - 4, H - 4)); sh.paste(c, (X + 2, Y + 2))
            dr.text((X + 2, Y + H + 1), f"{it['so']}. {it['ten_en'] or ''}"[:24], fill='black', font=font)
        sh.save(out / f'crops_{p // 48 + 1}.jpg', quality=85)
    (out / 'muc-luc.json').write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(items)} ô → {out}')


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    c = sp.add_parser('cat'); c.add_argument('thu_muc'); c.add_argument('--chi'); c.add_argument('--force', action='store_true')
    k = sp.add_parser('kiem'); k.add_argument('slug', nargs='?')
    l = sp.add_parser('luoi'); l.add_argument('slug'); l.add_argument('--shots', help='thêm shot kẻ lưới, vd s010,s020')
    b = sp.add_parser('bang-cat'); b.add_argument('slug')
    a = ap.parse_args()
    {'cat': cat, 'kiem': kiem, 'luoi': luoi, 'bang-cat': bang_cat}[a.cmd](a)


if __name__ == '__main__':
    main()
