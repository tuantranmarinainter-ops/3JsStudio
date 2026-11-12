import argparse, sys, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools'))

import tts  # noqa: E402


def args():
    return argparse.Namespace(source='edge', voice=None, rate=0, pitch=0, volume=0)


class ChuThich(unittest.TestCase):
    def test_chu_thich_cuoi_dong_chi_thi(self):
        txt = ('@source capcut   # nguồn mặc định\n'
               '@narrator BV075_streaming -5   # giọng dẫn\n'
               '@voice mom multi_female_yangguangnv_uranus_bigtts 0 0 # mẹ\n\n'
               '@at 0.00 Xin chào # này là một phần lời\n'
               '[mom] Trừ tôi.\n')
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / 'narration.txt'
            f.write_text(txt, encoding='utf-8')
            lines = tts.parse(str(f), args())
        self.assertEqual(len(lines), 2)
        self.assertEqual(lines[0]['source'], 'capcut')
        self.assertEqual(lines[0]['voice'], 'BV075_streaming')
        self.assertEqual(lines[0]['rate'], -5)
        self.assertEqual(lines[0]['text'], 'Xin chào # này là một phần lời')   # lời kể giữ nguyên
        self.assertEqual(lines[1]['who'], 'mom')
        self.assertEqual(lines[1]['voice'], 'multi_female_yangguangnv_uranus_bigtts')


if __name__ == '__main__':
    unittest.main()
