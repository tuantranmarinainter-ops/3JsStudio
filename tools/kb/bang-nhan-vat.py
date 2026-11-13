# Ghép bảng nhân vật CÓ THƯỚC từ kết quả của tools/kb/do-nhan-vat.mjs (nhan-vat.json + raw/<tên>_<truoc|ngang|sau>.png).
#   python tools/kb/bang-nhan-vat.py <thư mục đo> [thư mục ra = <thư mục đo>/bang]
# Ra: <tên>.jpg (trước | ngang | sau, lưới 1 stud, vạch đỉnh đầu / cằm / tâm mặt) và bang-chieu-cao.jpg (mọi nhân vật đứng chung một vạch đất, cùng tỉ lệ).
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
import numpy as np

src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(src, 'bang'); os.makedirs(out, exist_ok=True)
J = json.load(open(os.path.join(src, 'nhan-vat.json'), encoding='utf-8')); O = J['vung_chup']; PX = O['px']; NV = J['nhan_vat']
MA = {'hero': 'GA', 'bap': 'BAP', 'bach': 'BACH', 'mayor': 'MAYOR (ngày)', 'mayor_ngu': 'MAYOR (áo ngủ)', 'linh_a': 'GUARD_A', 'linh_b': 'GUARD_B', 'banh': 'BAKER', 'may': 'TAILOR',
      'be_vang': 'CHILD_A', 'be_ngoc': 'CHILD_B', 'gau_vi': 'BEAR_WALLET', 'gau_tui': 'BEAR_BAG', 'dan_a': 'TOWN_A', 'dan_b': 'TOWN_B', 'dan_c': 'TOWN_C'}
BG = np.array([244, 243, 238])
def font(sz, bold=False):
    try: return ImageFont.truetype('arialbd.ttf' if bold else 'arial.ttf', sz)
    except Exception: return ImageFont.load_default()
F, FB, FS = font(17), font(19, True), font(14)
yp = lambda y: (O['y1'] - y) * PX                 # stud → px theo chiều đứng của ảnh thô
def luoi(w, h, x0):                               # nền lưới 1 stud; x0 = stud ở mép trái
    im = Image.new('RGB', (w, h), (250, 249, 245)); d = ImageDraw.Draw(im)
    for i in range(-10, 11):
        x = (i - x0) * PX
        if 0 <= x < w: d.line([(x, 0), (x, h)], fill=(226, 223, 214) if i else (190, 186, 176), width=1)
    for y in range(int(O['y0']), int(O['y1']) + 1):
        d.line([(0, yp(y)), (w, yp(y))], fill=(226, 223, 214), width=1)
        if y >= 0: d.text((3, yp(y) - 17), str(y), fill=(150, 146, 136), font=FS)
    d.line([(0, yp(0)), (w, yp(0))], fill=(60, 58, 54), width=3)
    return im
def dan(nen, anh, box, at):                       # dán phần nhân vật (khác màu nền) của ảnh thô lên nền lưới
    c = anh.crop(box); a = np.asarray(c).astype(int); m = (np.abs(a - BG).max(axis=2) > 7).astype(np.uint8) * 255
    nen.paste(c, at, Image.fromarray(m))
def vach(d, w, y, mau, chu):
    for x in range(0, w, 14): d.line([(x, yp(y)), (x + 7, yp(y))], fill=mau, width=2)
    d.text((w - 6 - d.textlength(chu, font=FS), yp(y) - 17), chu, fill=mau, font=FS)

HW = 2.9                                           # nửa bề ngang mỗi hình chiếu (stud)
for ten, v in NV.items():
    W1 = int(2 * HW * PX); H = int((O['y1'] - O['y0']) * PX); im = Image.new('RGB', (W1 * 3, H + 64), (250, 249, 245)); t = v['toan_than']
    for i, (h, nhan) in enumerate((('truoc', 'TRƯỚC'), ('ngang', 'NGANG (máy ở +X; mặt quay về TRÁI ảnh)'), ('sau', 'SAU'))):
        raw = Image.open(os.path.join(src, 'raw', f'{ten}_{h}.png')).convert('RGB'); cx = (0 - O['x0']) * PX
        nen = luoi(W1, H, -HW); dan(nen, raw, (int(cx - HW * PX), 0, int(cx + HW * PX), H), (0, 0)); d = ImageDraw.Draw(nen)
        dk = v.get('dau_khoi')
        if dk:
            vach(d, W1, dk['dinh_y'], (200, 60, 40), f"đỉnh khối đầu {dk['dinh_y']:.2f}"); vach(d, W1, dk['cam_y'], (200, 60, 40), f"cằm {dk['cam_y']:.2f}")
            vach(d, W1, v['mat_tam'][1], (40, 110, 200), f"tâm mặt {v['mat_tam'][1]:.2f}")
        vach(d, W1, t['max'][1], (90, 90, 90), f"cao nhất {t['max'][1]:.2f}")
        d.text((8, 6), nhan, fill=(40, 40, 40), font=FB); im.paste(nen, (i * W1, 0))
    d = ImageDraw.Draw(im); dk = v.get('dau_khoi')
    dong = f"{MA.get(ten, ten)}  ·  diễn viên engine: {ten}  ·  {'thân R6' if v['loai'] == 'r6' else 'gấu bông'}  ·  1 ô lưới = 1 stud  ·  gốc (0,0,0) = giữa hai đế giày, mặt nhìn +Z, tay phải ở −X"
    so = f"cao nhất {t['max'][1]:.2f}  ·  bề ngang {t['kich'][0]:.2f}  ·  bề sâu {t['kich'][2]:.2f}" + (f"  ·  khối đầu cao {dk['cao']:.2f} (cằm {dk['cam_y']:.2f} → đỉnh {dk['dinh_y']:.2f})  ·  thân cao {dk['dinh_y'] / dk['cao']:.2f} đầu" if dk else '')
    d.text((10, H + 8), dong, fill=(30, 30, 30), font=FB); d.text((10, H + 36), so + '  (stud)', fill=(70, 70, 70), font=F)
    im.save(os.path.join(out, ten + '.jpg'), quality=86)

# ----- bảng chiều cao: mọi nhân vật, hình chiếu trước, chung vạch đất -----
ten = list(NV); cot = 8; hang = [ten[i:i + cot] for i in range(0, len(ten), cot)]; CW = int(5.2 * PX); H = int((O['y1'] - O['y0']) * PX); HH = H + 58
im = Image.new('RGB', (CW * cot, HH * len(hang)), (250, 249, 245)); d0 = ImageDraw.Draw(im)
G = NV[ten[0]].get('dau_khoi', {}).get('dinh_y')
for r, hg in enumerate(hang):
    nen = luoi(CW * cot, H, 0); d = ImageDraw.Draw(nen)
    if G: vach(d, CW * cot, G, (200, 60, 40), f"G = đỉnh khối đầu Gà = {G:.2f} stud")
    for c, n in enumerate(hg):
        raw = Image.open(os.path.join(src, 'raw', f'{n}_truoc.png')).convert('RGB'); cx = (0 - O['x0']) * PX
        dan(nen, raw, (int(cx - CW / 2), 0, int(cx + CW / 2), H), (c * CW, 0))
    im.paste(nen, (0, r * HH))
    for c, n in enumerate(hg):
        v = NV[n]; dk = v.get('dau_khoi'); cao = dk['dinh_y'] if dk else v['toan_than']['max'][1]
        d0.text((c * CW + 8, r * HH + H + 6), MA.get(n, n), fill=(30, 30, 30), font=FB)
        d0.text((c * CW + 8, r * HH + H + 30), f"{'đỉnh đầu' if dk else 'cao'} {cao:.2f} stud" + (f" = {cao / G:.2f} G" if G else ''), fill=(70, 70, 70), font=F)
im.save(os.path.join(out, 'bang-chieu-cao.jpg'), quality=86)
print('xong:', len(NV) + 1, 'anh')
