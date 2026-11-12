import re
import sys
import tempfile
import unittest
from pathlib import Path

KB_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KB_DIR))

import nhip  # noqa: E402

DATA = KB_DIR / "tests" / "data"
MAU = DATA / "mau_1.srt"


class TestNhip(unittest.TestCase):
    def test_parse_bom_crlf(self):
        text = (
            "﻿1\r\n00:00:00,000 --> 00:00:01,500\r\nFirst line.\r\n\r\n"
            "00:00:01,500 --> 00:00:03,000\r\nSecond line.\r\n\r\n"
            "3\r\n00:00:03,000 --> 00:00:04,000\r\nThird line.\r\n\r\n"
            "xx\r\nbroken block\r\n\r\n"
            "4\r\n00:00:05,000 --> 00:00:06,000\r\nLast.\r\n"
        )
        blocks = nhip.parse_srt(text)
        self.assertEqual(len(blocks), 4)
        self.assertAlmostEqual(blocks[0]["start"], 0.0)
        self.assertAlmostEqual(blocks[0]["end"], 1.5)

    def test_gop_dong_lap(self):
        text = (
            "1\n00:00:00,000 --> 00:00:02,000\nHello there.\n\n"
            "2\n00:00:02,000 --> 00:00:04,000\nHello there.\n"
        )
        sentences = nhip.cau(nhip.parse_srt(text))
        self.assertEqual(len(sentences), 1)

    def test_vi_tri_twist(self):
        text = MAU.read_text(encoding="utf-8-sig")
        stats = nhip.chi_so(nhip.cau(nhip.parse_srt(text)))
        self.assertGreaterEqual(stats["vi_tri_twist_pct"], 55)
        self.assertLessEqual(stats["vi_tri_twist_pct"], 65)

    def test_khong_chua_loi_goc(self):
        source = MAU.read_text(encoding="utf-8-sig")
        words = re.findall(r"\w+", source.lower())
        grams = {tuple(words[i:i + 4]) for i in range(len(words) - 3)}
        with tempfile.TemporaryDirectory() as tmp:
            nhip.main([str(DATA), "--out", str(Path(tmp) / "nhip-kich-ban")])
            outputs = "\n".join(
                p.read_text(encoding="utf-8")
                for p in Path(tmp).glob("nhip-kich-ban.*")
            )
        out_words = re.findall(r"\w+", outputs.lower())
        out_grams = {tuple(out_words[i:i + 4]) for i in range(len(out_words) - 3)}
        self.assertFalse(grams & out_grams, "Đầu ra chứa lời gốc của mau_1.srt")


if __name__ == "__main__":
    unittest.main()
