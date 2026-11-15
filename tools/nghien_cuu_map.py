#!/usr/bin/env python3
"""nghien_cuu_map.py — chuẩn bị + kiểm việc nghiên cứu map từ video tham khảo (docs/nghien-cuu-map.md).

  python tools/nghien_cuu_map.py cat "<thư mục video>" [--chi "<từ trong tên>"] [--force]
      chép từng .mp4 sang output/nghien-cuu-map/_nguon/<slug>.mp4 (tên không dấu — ffmpeg/yt-dlp hỏng với đường dẫn có dấu)
      rồi chạy tools/video2kb.py --loi off --no-am-thanh → output/nghien-cuu-map/<slug>/. Video đã cắt thì bỏ qua.
  python tools/nghien_cuu_map.py kiem [<slug>]
      bảng trạng thái: số shot · đã gộp (dia-diem.json đủ shot?) · địa điểm đã/ chưa phân tích · số đạo cụ · lỗi JSON.
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


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    c = sp.add_parser('cat'); c.add_argument('thu_muc'); c.add_argument('--chi'); c.add_argument('--force', action='store_true')
    k = sp.add_parser('kiem'); k.add_argument('slug', nargs='?')
    a = ap.parse_args()
    {'cat': cat, 'kiem': kiem}[a.cmd](a)


if __name__ == '__main__':
    main()
