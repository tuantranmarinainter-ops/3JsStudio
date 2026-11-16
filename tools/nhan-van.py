#!/usr/bin/env python
# nhan-van.py — nhận diện LOẠI VÂN của một vùng ảnh, so với thư viện vân (assets/polyhaven/vat-lieu/ + bảng VAN_PH).
#   python tools/nhan-van.py <anh> [--vung x,y,w,h] [--top 3] [--nguong 0.22] [--tu-khoa "brick wall"] [--ung-vien out.json]
# Luật vân (CLAUDE.md): khớp ≤ ngưỡng → dùng vân trong thư viện; vượt ngưỡng = "CHƯA CÓ" → tìm ứng viên Poly Haven CC0
# (theo --tu-khoa hoặc theo loại gần nhất), tải ảnh nhỏ, ghi file ứng viên cho `node tools/duyet.mjs <ep> them-ung-vien <đợt> <file>`.
# Cách đo (thuần số, không AI): xám hoá, chuẩn hoá sáng; đặc trưng = hướng gradient (8 ô) + phổ công suất theo bán kính (6 dải)
# + độ tương phản + độ đều hướng; màu chỉ góp phần nhỏ (vân được nhân với màu mảnh). So ở 3 tỉ lệ phóng của vân thư viện.
# Đây là bộ lọc gợi ý, không phải kết luận: luôn cho người dùng/agent nhìn lại ứng viên đầu bảng.
import sys, os, json, re, argparse, urllib.request, urllib.parse
import numpy as np
from PIL import Image

GOC = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
THU_VIEN = os.path.join(GOC, 'assets', 'polyhaven', 'vat-lieu')
# slug → loại Enum.Material (khớp VAN_PH trong tools/blender/roblox_ghep.py)
LOAI = {'brick_wall_001': 'Brick', 'fine_grained_wood': 'Wood', 'brown_planks_03': 'WoodPlanks', 'concrete_floor_01': 'Concrete',
        'grey_roof_tiles': 'RoofShingles', 'metal_plate': 'Metal', 'leafy_grass': 'Grass', 'grey_plaster_02': 'Plaster',
        'slate_floor': 'Slate', 'floor_tiles_04': 'CeramicTiles', 'marble_01': 'Marble', 'coast_sand_01': 'Sand',
        'fabric_pattern_07': 'Fabric', 'snow_02': 'Snow'}
# loại → từ khoá tìm ứng viên mới trên Poly Haven
TU_KHOA = {'Brick': 'brick', 'Wood': 'wood', 'WoodPlanks': 'planks', 'Concrete': 'concrete', 'RoofShingles': 'roof', 'Metal': 'metal',
           'Grass': 'grass', 'Plaster': 'plaster', 'Slate': 'slate', 'CeramicTiles': 'tiles', 'Marble': 'marble', 'Sand': 'sand',
           'Fabric': 'fabric', 'Snow': 'snow'}
UA = {'User-Agent': 'Mozilla/5.0 (3JS-Studio nhan-van)'}

def xam(img, n=128):
    a = np.asarray(img.convert('RGB').resize((n, n), Image.LANCZOS), dtype=np.float32) / 255.0
    return a, a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)

def dac_trung(L):
    L = (L - L.mean()) / (L.std() + 1e-4)
    gy, gx = np.gradient(L)
    mag = np.hypot(gx, gy); ang = (np.arctan2(gy, gx) % np.pi)
    h = np.zeros(8)
    b = np.minimum((ang / np.pi * 8).astype(int), 7)
    for k in range(8): h[k] = mag[b == k].sum()
    h /= h.sum() + 1e-9
    w = np.hanning(L.shape[0])[:, None] * np.hanning(L.shape[1])[None, :]
    F = np.abs(np.fft.fftshift(np.fft.fft2(L * w))) ** 2
    y, x = np.indices(F.shape); r = np.hypot(y - F.shape[0] / 2, x - F.shape[1] / 2)
    rr = np.minimum((np.log2(1 + r) / np.log2(1 + F.shape[0] / 2) * 6).astype(int), 5)
    p = np.array([F[rr == k].sum() for k in range(6)]); p = np.log1p(p); p /= p.sum() + 1e-9
    return np.concatenate([h * 2.0, p * 3.0, [min(mag.mean(), 2.0) / 2.0]])

def mau(a): return a.reshape(-1, 3).mean(0)

def doc_thu_vien():
    ds = {}
    for slug, loai in LOAI.items():
        f = os.path.join(THU_VIEN, slug + '_diff_1k.jpg')
        if not os.path.exists(f): continue
        im = Image.open(f).convert('RGB'); W, H = im.size
        fs = []
        for k in (1.0, 0.5, 0.25):          # 3 tỉ lệ: vân thật có thể to/nhỏ khác ô lặp của thư viện
            s = int(min(W, H) * k); c = im.crop(((W - s) // 2, (H - s) // 2, (W + s) // 2, (H + s) // 2))
            a, L = xam(c); fs.append(dac_trung(L))
        ds[slug] = {'loai': loai, 'f': fs, 'mau': mau(xam(im)[0])}
    return ds

def khoang(f, g): return float(np.abs(f - g).sum() / 2.0)

def tim_ph(tu_khoa, so=6):
    """Poly Haven API: texture có slug chứa từ khoá (hoặc tag khớp), CC0 → [(slug, tên, tác giả)]."""
    req = urllib.request.Request('https://api.polyhaven.com/assets?t=textures', headers=UA)
    ds = json.loads(urllib.request.urlopen(req, timeout=60).read().decode('utf8'))
    ws = [w for w in re.split(r'\s+', tu_khoa.lower()) if w]
    kq = []
    for slug, m in ds.items():
        txt = (slug + ' ' + m.get('name', '') + ' ' + ' '.join(m.get('tags', []))).lower()
        sc = sum(1 for w in ws if w in txt)
        if sc == len(ws): kq.append((sc + (1 if all(w in slug for w in ws) else 0), slug, m.get('name', slug), ', '.join(m.get('authors', {}))))
    kq.sort(key=lambda x: (-x[0], x[1]))
    return [(s, n, a) for _, s, n, a in kq[:so]]

def ghi_ung_vien(duong, tu_khoa, ung):
    thu = os.path.join(GOC, '.cache', 'nhan-van'); os.makedirs(thu, exist_ok=True)
    uv = []
    for slug, ten, tg in ung:
        f = os.path.join(thu, slug + '.png')
        try:
            if not os.path.exists(f):
                r = urllib.request.Request('https://cdn.polyhaven.com/asset_img/thumbs/%s.png?height=256' % slug, headers=UA)
                open(f, 'wb').write(urllib.request.urlopen(r, timeout=60).read())
        except Exception as e:
            print('  ! không tải được ảnh nhỏ %s: %s' % (slug, e)); continue
        uv.append({'id': 'polyhaven-van:' + slug, 'ten': ten, 'anh': [os.path.relpath(f, GOC).replace('\\', '/')],
                   'link': 'https://polyhaven.com/a/' + slug, 'linkTen': 'Poly Haven', 'nguon': 'polyhaven', 'tacGia': tg,
                   'giayPhep': 'CC0', 'phu': 'vân tileable, nhập vào assets/polyhaven/vat-lieu/ + VAN_PH'})
    out = {'nhomId': 'van-' + re.sub(r'\W+', '-', tu_khoa), 'ten': 'Ứng viên vân: ' + tu_khoa,
           'mota': 'Chọn 1 vân. Sau khi chốt: tải ảnh 1k vào assets/polyhaven/vat-lieu/, thêm dòng VAN_PH (roblox_ghep.py) + manifest + CREDITS.',
           'khe': [{'id': 'van', 'ten': tu_khoa, 'phu': '', 'ungVien': uv}]}
    os.makedirs(os.path.dirname(os.path.abspath(duong)), exist_ok=True)
    json.dump(out, open(duong, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    return len(uv)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('anh'); ap.add_argument('--vung'); ap.add_argument('--top', type=int, default=3)
    ap.add_argument('--nguong', type=float, default=0.22, help='khoảng cách đặc trưng lớn nhất coi là khớp (nhỏ = khớp hơn)')
    ap.add_argument('--tu-khoa'); ap.add_argument('--ung-vien'); ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    im = Image.open(a.anh).convert('RGB')
    if a.vung:
        x, y, w, h = [int(v) for v in a.vung.split(',')]; im = im.crop((x, y, x + w, y + h))
    s = min(im.size); im = im.crop(((im.size[0] - s) // 2, (im.size[1] - s) // 2, (im.size[0] + s) // 2, (im.size[1] + s) // 2))
    arr, L = xam(im); f = dac_trung(L); m = mau(arr)
    lib = doc_thu_vien()
    if not lib: print('LOI: thư viện vân trống (%s)' % THU_VIEN); sys.exit(2)
    xs = []
    for slug, d in lib.items():
        kc = min(khoang(f, g) for g in d['f']); dm = float(np.abs(m - d['mau']).mean()) * 0.15
        xs.append((kc + dm, slug, d['loai']))
    xs.sort()
    best = xs[0]
    khop = best[0] <= a.nguong
    kq = {'khop': khop, 'ngưỡng': a.nguong, 'top': [{'slug': s, 'loai': l, 'diem': round(d, 3)} for d, s, l in xs[:a.top]]}
    if not khop:
        kw = a.tu_khoa or TU_KHOA.get(best[2], '')
        kq['tuKhoa'] = kw
        kq['chuaCo'] = True
        if a.ung_vien and kw:
            thu = [(s, n, t) for s, n, t in tim_ph(kw, 8) if s not in LOAI]
            n = ghi_ung_vien(a.ung_vien, kw, thu); kq['ungVien'] = {'file': a.ung_vien, 'so': n}
    if a.json: print(json.dumps(kq, ensure_ascii=False)); return
    print('%s  (điểm càng nhỏ càng giống; ngưỡng %.2f)' % ('KHỚP thư viện' if khop else 'CHƯA CÓ trong thư viện → cần người dùng duyệt vân mới', a.nguong))
    for t in kq['top']: print('  %-10s %-20s %.3f' % (t['loai'], t['slug'], t['diem']))
    if not khop:
        print('  gần nhất chỉ là gợi ý; từ khoá tìm vân mới: "%s"' % kq.get('tuKhoa', ''))
        if 'ungVien' in kq:
            print('  đã ghi %d ứng viên → %s\n  đưa duyệt: node tools/duyet.mjs <ep> them-ung-vien <số đợt> %s' % (kq['ungVien']['so'], a.ung_vien, a.ung_vien))
        else: print('  thêm --ung-vien output/van/ung-vien.json [--tu-khoa "..."] để lập ứng viên cho trang duyệt')

if __name__ == '__main__': main()
