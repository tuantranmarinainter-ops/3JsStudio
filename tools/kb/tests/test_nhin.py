import sys, tempfile, unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
KB = HERE.parent
sys.path.insert(0, str(KB))
sys.path.insert(0, str(KB.parent))

import kichban  # noqa: E402


def doc_of(body):
    p = Path(tempfile.mkdtemp()) / 'kich-ban.md'
    p.write_text('kiem_tong: off\n\n' + body, encoding='utf-8')
    return kichban.doc(p)


class TestNhin(unittest.TestCase):
    def test_cot_nhin_thanh_lookAt(self):
        d = doc_of('| id | giây | loại | ở đâu | nhìn |\n|---|---|---|---|---|\n'
                   '| 1 | 1 | closeup | home | mẹ |\n| 2 | 1 | closeup | home | 1 2.5 3 |\n| 3 | 1 | closeup | home |  |\n')
        self.assertEqual(d['loi_doc'], [])
        self.assertEqual(d['shots'][0]['lookAt'], 'mẹ')
        self.assertEqual(d['shots'][1]['lookAt'], '1 2.5 3')
        self.assertNotIn('lookAt', d['shots'][2])

    def test_khong_cot_thi_bo_qua(self):
        d = doc_of('| id | giây | loại | ở đâu |\n|---|---|---|---|\n| 1 | 1 | closeup | home |\n')
        self.assertNotIn('lookAt', d['shots'][0])


if __name__ == '__main__':
    unittest.main()
