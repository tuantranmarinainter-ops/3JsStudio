import subprocess, sys, tempfile, unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
KB = HERE.parent
ROOT = KB.parent.parent
DATA = HERE / 'data'
sys.path.insert(0, str(KB))
sys.path.insert(0, str(ROOT / 'tools'))

import kichban, lint  # noqa: E402

HEAD_NGAN = '| id | giay | loi ke | loai | ở đâu | hành động |\n|---|---|---|---|---|---|\n'


def tmp_md(body):
    d = tempfile.mkdtemp()
    p = Path(d) / 'kich-ban.md'
    p.write_text('kiem_tong: off\n\n' + body, encoding='utf-8')
    return p


class TestLint(unittest.TestCase):
    def test_tot_khong_loi(self):
        self.assertEqual(lint.lint(DATA / 'kb_tot.md'), [])
        r = subprocess.run([sys.executable, str(KB / 'lint.py'), str(DATA / 'kb_tot.md')], capture_output=True)
        self.assertEqual(r.returncode, 0, r.stdout.decode('utf-8', 'replace'))

    def test_bat_6_loi(self):
        errs = lint.lint(DATA / 'kb_loi.md')
        self.assertEqual({c for _, c, _ in errs}, {'K01', 'K03', 'K04', 'K05', 'K06', 'K07'})
        by = {c: ln for ln, c, _ in errs}
        self.assertEqual(by, {'K07': 10, 'K01': 10, 'K03': 12, 'K04': 13, 'K05': 14, 'K06': 15})
        r = subprocess.run([sys.executable, str(KB / 'lint.py'), str(DATA / 'kb_loi.md')], capture_output=True)
        self.assertEqual(r.returncode, 1)
        self.assertIn('kb_loi.md:10: K01', r.stdout.decode('utf-8'))

    def test_cot_khong_dau(self):
        p = tmp_md(HEAD_NGAN + '| 1 | 1.5 | Ở thị trấn này, có luật. | establish | square | |\n')
        d = kichban.doc(p)
        self.assertEqual(d['loi_doc'], [])
        s = d['shots'][0]
        self.assertEqual((s['dur'], s['type'], s['at']), (1.5, 'establish', 'square'))
        self.assertEqual(lint.lint(p), [])

    def test_giay_dau_phay(self):
        p = tmp_md(HEAD_NGAN + '| 1 | 1,5 | Ở thị trấn này, có luật. | establish | square | |\n')
        self.assertEqual(kichban.doc(p)['shots'][0]['dur'], 1.5)

    def test_o_trong_khong_exception(self):
        p = tmp_md(HEAD_NGAN + '| 1 | 1.5 | Ở thị trấn này. | establish | square |\n| 2 | abc | x | closeup | square | |\n')
        errs = lint.lint(p)
        k00 = sorted(ln for ln, c, _ in errs if c == 'K00')
        self.assertEqual(k00, [5, 6])

    def test_storyboard_py_tuong_thich(self):
        import storyboard
        d = Path(tempfile.mkdtemp())
        (d / 'kich-ban.md').write_text((DATA / 'kb_tot.md').read_text(encoding='utf-8'), encoding='utf-8')
        _, meta, rows = storyboard.read_board(d)
        self.assertEqual(len(rows), 8)

    def test_tong_giay_va_json(self):
        p = tmp_md(HEAD_NGAN + '| 1 | 1.5 | Ở thị trấn này. | establish | square | |\n')
        p.write_text(p.read_text(encoding='utf-8').replace('kiem_tong: off\n', ''), encoding='utf-8')
        self.assertIn('K09', {c for _, c, _ in lint.lint(p)})
        r = subprocess.run([sys.executable, str(KB / 'kichban.py'), str(DATA / 'kb_tot.md'), '--json'], capture_output=True)
        import json
        j = json.loads(r.stdout.decode('utf-8'))
        self.assertEqual(len(j['shots']), 8)
        self.assertEqual(len(j['can_dung']), 2)
        self.assertEqual(j['meta']['ep'], 'ep998')

    def test_canh_bao_dem_va_dia_diem(self):
        head = '| id | giay | loi ke | loai | ở đâu | giờ |\n|---|---|---|---|---|---|\n'
        rows = ''.join(f'| {i} | 1.5 | | crowd | square | dem |\n' for i in range(1, 7))
        p = tmp_md(head + '| 0 | 1.5 | Ở thị trấn này. | establish | shop | dem |\n' + rows)
        ma = {c for _, c, _ in lint.canh_bao(p)}
        self.assertEqual(ma, {'W01', 'W02'})
        self.assertNotIn('W01', {c for _, c, _ in lint.lint(p)})   # cảnh báo không lẫn vào lỗi
        r = subprocess.run([sys.executable, str(KB / 'lint.py'), str(p)], capture_output=True)
        self.assertIn('W01', r.stdout.decode('utf-8'))

    def test_khong_canh_bao_khi_can_bang(self):
        head = '| id | giay | loi ke | loai | ở đâu | giờ |\n|---|---|---|---|---|---|\n'
        ats = ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd']
        rows = ''.join(f'| {i} | 1.5 | | crowd | {a} | {"dem" if i % 4 == 0 else "sang"} |\n' for i, a in enumerate(ats, 1))
        self.assertEqual(lint.canh_bao(tmp_md(head + rows)), [])

    def test_k01_noi_tiep_khong_loi(self):
        p = tmp_md(HEAD_NGAN + '| 1 | 1.5 | Ở thị trấn này. | establish | square | |\n| 2 | 1 | | crowd | | |\n| 3 | 1 | | crowd | | |\n')
        self.assertNotIn('K01', {c for _, c, _ in lint.lint(p)})
        self.assertEqual([s['at_hd'] for s in kichban.doc(p)['shots']], ['square'] * 3)
        self.assertNotIn('at', kichban.doc(p)['shots'][1])

    def test_k01_shot_dau_thieu(self):
        p = tmp_md(HEAD_NGAN + '| 1 | 1.5 | Ở thị trấn này. | establish | | |\n')
        self.assertEqual([(l, c) for l, c, _ in lint.lint(p)], [(5, 'K01')])
        p.write_text(p.read_text(encoding='utf-8').replace('kiem_tong: off', 'kiem_tong: off\nenv: town'), encoding='utf-8')
        self.assertEqual(lint.lint(p), [])

    def test_file_khong_ton_tai(self):
        for script in ('lint.py', 'kichban.py'):
            r = subprocess.run([sys.executable, str(KB / script), str(HERE / 'khong-co.md')], capture_output=True)
            self.assertEqual(r.returncode, 2)
            self.assertIn('K00 không đọc được file', r.stderr.decode('utf-8'))
            self.assertNotIn('Traceback', r.stderr.decode('utf-8'))

    def test_file_rong(self):
        p = tmp_md('')
        self.assertEqual([(l, c) for l, c, _ in lint.lint(p)], [(1, 'K00')])
        r = subprocess.run([sys.executable, str(KB / 'lint.py'), str(p)], capture_output=True)
        self.assertEqual(r.returncode, 1)

    def test_chuan_hoa_hoa_thuong(self):
        p = tmp_md(HEAD_NGAN + '| 1 | 1.5 | Ở thị trấn này. | INSERTREAD | square | LookAround |\n')
        s = kichban.doc(p)['shots'][0]
        self.assertEqual((s['type'], s['action']), ('insertRead', 'lookAround'))
        codes = {c for _, c, _ in lint.lint(p)}
        self.assertFalse(codes & {'K02', 'K04'})

    def test_goi_y_gan_nhat(self):
        p = tmp_md(HEAD_NGAN + '| 1 | 1.5 | Ở thị trấn này. | establsh | square | wlak |\n')
        msgs = {c: m for _, c, m in lint.lint(p)}
        self.assertIn('gần nhất: establish', msgs['K02'])
        self.assertIn('gần nhất: walk', msgs['K04'])

    def run_kb(self, *args):
        r = subprocess.run([sys.executable, str(KB / 'kichban.py'), *args], capture_output=True)
        return r.returncode, r.stdout.decode('utf-8')

    def test_danh_sach(self):
        rc, out = self.run_kb('--danh-sach')
        self.assertEqual(rc, 0)
        lines = {l.split(':', 1)[0]: l.split(':', 1)[1] for l in out.splitlines() if ':' in l}
        self.assertEqual(set(lines), {'loại', 'hành động', 'mặt', 'giờ', 'thời tiết', 'tư thế'})
        self.assertIn('insertRead', lines['loại'])
        self.assertIn('lookAround', lines['hành động'])
        self.assertEqual(len(lines['mặt'].split(',')), 16)

    def test_tom_tat(self):
        rc, out = self.run_kb(str(DATA / 'kb_tot.md'), '--tom-tat')
        self.assertEqual(rc, 0)
        self.assertIn('số câu: 6', out)
        self.assertIn('số shot: 8', out)
        self.assertIn('tổng giây: 10.2', out)
        self.assertIn('cần dựng: 2 (anim 1, env 1)', out)
        self.assertIn('shot dài nhất: 5 (2 s)', out)
        self.assertIn('shot ngắn nhất: 2 (1 s)', out)
        self.assertIn('twist: câu 3/6 ở 44% thời lượng', out)
        self.assertIn('số câu mỗi phần: hook 1 | leo thang 1 | twist 2 | giải quyết 2', out)
        self.assertNotIn('lỗi đọc', out)

    def test_tom_tat_chua_danh_dau_va_loi_doc(self):
        p = tmp_md(HEAD_NGAN + '| 1 | 1.5 | Ở thị trấn này. | establish | square | |\n| 2 | abc | x | closeup | square | |\n')
        rc, out = self.run_kb(str(p), '--tom-tat')
        self.assertIn('twist: chưa đánh dấu', out)
        self.assertNotIn('số câu mỗi phần', out)
        self.assertIn('lỗi đọc: 1', out)

    def test_k11(self):
        src = (DATA / 'kb_tot.md').read_text(encoding='utf-8')
        on = src.replace('kiem_tong: off\n', '')
        codes = lambda txt: {c for _, c, _ in lint.lint(self.write(txt))}
        self.assertNotIn('K11', codes(on))                                   # twist ở 44%
        self.assertNotIn('K11', codes(src.replace('| twist |', '|  |')))     # kiem_tong off: bỏ qua
        self.assertIn('K11', codes(on.replace('| twist |', '|  |')))         # chưa đánh dấu
        moved = on.replace('| twist |', '|  |').replace('| Tôi sợ.', '| Tôi sợ.')
        lines = moved.split('\n')
        i = next(k for k, l in enumerate(lines) if l.startswith('| 2 '))
        lines[i] = lines[i].rstrip()[:-1] + ' twist |'                        # ở 15%
        self.assertIn('K11', codes('\n'.join(lines)))
        lines[i] = lines[i].replace(' twist |', '  |')
        i = next(k for k, l in enumerate(lines) if l.startswith('| 8 '))
        lines[i] = lines[i].rstrip()[:-1] + ' twist |'                        # ở 90%
        self.assertIn('K11', codes('\n'.join(lines)))

    def write(self, txt):
        p = Path(tempfile.mkdtemp()) / 'kich-ban.md'
        p.write_text(txt, encoding='utf-8')
        return p


if __name__ == '__main__':
    unittest.main()


class TestLuatMoi(unittest.TestCase):
    """cảnh báo W03–W09 và kiểm narration.txt (học từ lint nocodehack, docs/format-kich-ban.md)."""
    HEAD = '| id | giay | loi ke | loai | ở đâu | ghi chú |\n|---|---|---|---|---|---|\n'

    def md(self, rows, meta='', kiem=True):
        d = tempfile.mkdtemp()
        p = Path(d) / 'kich-ban.md'
        p.write_text(('' if kiem else 'kiem_tong: off\n') + meta + '\n\n' + self.HEAD + rows, encoding='utf-8')
        return p

    def ma(self, p): return {c for _, c, _ in lint.canh_bao_kich_ban(p)}

    def rows(self, n=6, loi='Ở thị trấn này, tôi thấy luật.', cuoi_at='square', note=''):
        r = f'| 1 | 2 | {loi} | establish | square | |\n'
        for i in range(2, n):
            r += f'| {i} | 2 | | crowd | street | |\n'
        r += f'| {n} | 2 | | crowd | {cuoi_at} | {note} |\n'
        return r

    FULL = 'rule: Ở thị trấn này, ai cũng có thanh pin.\nweakness: pin tôi cạn nhanh\ntwist: mẹ giấu sạc\nsolution: pin cạn nên tôi thấy mẹ'

    def test_sach_khi_du_header(self):
        self.assertEqual(self.ma(self.md(self.rows(), self.FULL)), set())

    def test_w03_thieu_header(self):
        self.assertIn('W03', self.ma(self.md(self.rows(), 'rule: x')))

    def test_w04_luat_dai_hoac_nhieu_cau(self):
        meta = self.FULL.replace('rule: Ở thị trấn này, ai cũng có thanh pin.', 'rule: Ở thị trấn này ai cũng có pin. Hết pin thì ngủ. Ngủ thì mất.')
        self.assertIn('W04', self.ma(self.md(self.rows(), meta)))

    def test_w05_doc_khong_kip_khong_can_header(self):
        r = self.rows(loi='Ở thị trấn này, tôi đã nhìn thấy một điều vô cùng kỳ lạ trong căn phòng.').replace('| 2 | Ở', '| 0.8 | Ở', 1)
        p = self.md(r, kiem=False)
        self.assertIn('W05', self.ma(p))
        self.assertNotIn('W05', {c for _, c, _ in lint.lint(p)})

    def test_w06_twist_qua_muon(self):
        r = self.rows().replace('| 2 | | crowd | street | |', '| 2 | | crowd | street | |').replace('| 6 | 2 | | crowd | square |  |', '| 6 | 2 | | crowd | square | twist |')
        self.assertIn('W06', self.ma(self.md(r, self.FULL)))

    def test_w07_khong_ngoi_thu_nhat(self):
        self.assertIn('W07', self.ma(self.md(self.rows(loi='Ở thị trấn này, ai cũng có luật.'), self.FULL)))
        self.assertNotIn('W07', self.ma(self.md(self.rows(), self.FULL)))

    def test_w08_canh_cuoi_khong_goi_lai_canh_dau(self):
        r = ''.join(f'| {i} | 2 | {"Ở thị trấn này, tôi thấy." if i == 1 else ""} | crowd | {"shop" if i <= 3 else "park"} | |\n' for i in range(1, 7))
        self.assertIn('W08', self.ma(self.md(r, self.FULL)))
        self.assertNotIn('W08', self.ma(self.md(r[:-3] + ' loop |\n', self.FULL)))
        self.assertNotIn('W08', self.ma(self.md(self.rows(), self.FULL)))

    def test_w09_crowd_qua_dong(self):
        self.assertIn('W09', self.ma(self.md(self.rows(), self.FULL + '\ncrowd: 40')))
        self.assertNotIn('W09', self.ma(self.md(self.rows(), self.FULL + '\ncrowd: 12')))

    def test_kiem_tong_off_tat_luat_toan_tap(self):
        self.assertEqual(self.ma(self.md(self.rows(loi='Ở thị trấn này, ai cũng có luật.'), kiem=False)), set())

    def loi_ke(self, text):
        d = tempfile.mkdtemp()
        p = Path(d) / 'narration.txt'
        p.write_text(text, encoding='utf-8')
        return lint.kiem_loi_ke(p)

    def test_loi_ke_tot(self):
        errs, ws = self.loi_ke('@at 0 Ở thị trấn này, tôi sống.\n@at 3 Tôi sợ.\n')
        self.assertEqual(errs, [])
        self.assertEqual([c for _, c, _ in ws], ['W11'])    # chỉ ~4 s, ngoài 120–180 s

    def test_loi_ke_n01_n02(self):
        errs, _ = self.loi_ke('@at 0 Hôm nay tôi đi học.\n@at abc Câu.\n@at 5 Câu.\n@at 4 Lùi mốc.\n')
        self.assertEqual({c for _, c, _ in errs}, {'N01', 'N02'})
        self.assertEqual(self.loi_ke('không có mốc')[0][0][1], 'N01')

    def test_loi_ke_w10_w12(self):
        _, ws = self.loi_ke('@at 0 Ở thị trấn này, ai cũng có một thanh pin trên đầu mãi mãi mãi.\n@at 1 Hết.\n')
        self.assertEqual({'W10', 'W12'} & {c for _, c, _ in ws}, {'W10', 'W12'})

    def test_loi_ke_cli(self):
        d = tempfile.mkdtemp()
        p = Path(d) / 'narration.txt'
        p.write_text('@at 0 Hôm nay.\n', encoding='utf-8')
        r = subprocess.run([sys.executable, str(KB / 'lint.py'), '--loi-ke', str(p)], capture_output=True)
        self.assertEqual(r.returncode, 1)
        self.assertIn('N02', r.stdout.decode('utf-8'))
