"""Đường mới video-sang-kich-ban: shots.json mẫu → phan-tich-format.md + kich-ban.md (không cần video/GPU)."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
FIX = ROOT / 'tools' / 'tests' / 'fixtures' / 'video-cat-mau'
sys.path.insert(0, str(ROOT / 'tools'))
import video2kb_chu as V  # noqa: E402


def chay(*args):
    return subprocess.run([sys.executable, '-X', 'utf8', str(ROOT / 'tools' / 'video2kb.py'), *args],
                          capture_output=True, text=True, encoding='utf8')


class TestKichBanChu(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.src = self.tmp / 'kb'
        shutil.copytree(FIX, self.src)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_cli_tu_shots_ra_hai_file(self):
        r = chay('--tu-shots', str(self.src / 'shots.json'), '--ra', 'kich-ban-chu')
        self.assertEqual(r.returncode, 0, r.stderr)
        pt = (self.src / 'phan-tich-format.md').read_text(encoding='utf8')
        kb = (self.src / 'kich-ban.md').read_text(encoding='utf8')
        self.assertIn('**20 shot**', pt)
        for tieu_de in ('## Nhịp cắt', '## Cấu trúc 4 phần', '## Kiểu máy', '## Nhịp lời kể'):
            self.assertIn(tieu_de, pt)
        for tieu_de in ('## Lõi', '## Nhân vật', '## Bối cảnh', '## Hook', '## Leo thang', '## Twist', '## Giải quyết', '## Cần dựng'):
            self.assertIn(tieu_de, kb)
        self.assertFalse((self.src / 'storyboard.md').exists())   # đường cũ không bị chạm

    def test_khong_ro_ri_loi_nguon(self):
        chay('--tu-shots', str(self.src / 'shots.json'), '--ra', 'kich-ban-chu')
        for f in ('phan-tich-format.md', 'kich-ban.md'):
            txt = (self.src / f).read_text(encoding='utf8')
            self.assertNotIn('Câu mẫu giả', txt, f)
        self.assertIn('4 câu', (self.src / 'phan-tich-format.md').read_text(encoding='utf8'))

    def test_khong_de_kich_ban_da_viet(self):
        (self.src / 'kich-ban.md').write_text('đã viết tay', encoding='utf8')
        r = chay('--tu-shots', str(self.src / 'shots.json'), '--ra', 'kich-ban-chu')
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual((self.src / 'kich-ban.md').read_text(encoding='utf8'), 'đã viết tay')
        r = chay('--tu-shots', str(self.src / 'shots.json'), '--ra', 'kich-ban-chu', '--force')
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_so_lieu(self):
        j = json.loads((FIX / 'shots.json').read_text(encoding='utf8'))
        r = V.so_lieu(j['shots'], j['meta']['dur'])
        self.assertEqual(r['n'], 20)
        self.assertEqual(sum(p['n'] for p in r['phan']), 20)
        self.assertEqual(sum(c for _, c in r['bin']), 20)
        self.assertEqual(sum(r['dong'].values()), 20)
        self.assertIsNone(r['loi'])
        self.assertIn('chưa điền', V.viet_phan_tich(r, 'x'))   # chưa có `loai` → nhắc điền

    def test_loai_da_dien(self):
        j = json.loads((FIX / 'shots.json').read_text(encoding='utf8'))
        for i, s in enumerate(j['shots']):
            s['loai'] = 'cận mặt' if i % 2 else 'toàn cảnh'
        txt = V.viet_phan_tich(V.so_lieu(j['shots'], j['meta']['dur']), 'x')
        self.assertIn('cận mặt: 10 (50%)', txt)

    def test_duong_cu_van_con(self):
        r = chay('--help')
        self.assertIn('storyboard', r.stdout)
        self.assertTrue(hasattr(__import__('video2kb'), 'write_storyboard'))


if __name__ == '__main__':
    unittest.main()
