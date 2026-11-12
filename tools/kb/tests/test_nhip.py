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

    def _srt(self, cau_list):
        khoi = []
        for i, c in enumerate(cau_list):
            khoi.append(f"{i+1}" + chr(10) + f"00:00:{i*5:02d},000 --> 00:00:{i*5+5:02d},000" + chr(10) + c + chr(10))
        return chr(10).join(khoi)

    def test_khong_phat_hien_khong_gan_50(self):
        text = self._srt(["Alpha one two three."] * 2 + [f"Plain line number {i}." for i in range(10)])
        text = text.replace("Alpha one two three.", "Opening words here.")
        st = nhip.chi_so(nhip.cau(nhip.parse_srt(text)))
        self.assertIsNone(st["twist_phat_hien"])
        self.assertIsNone(st["vi_tri_twist_pct"])
        tong = nhip.tong_hop([st])
        self.assertEqual(tong["vi_tri_twist_pct"]["n"], 0)
        self.assertEqual(tong["vi_tri_twist_pct"]["n_chac"], 0)

    def test_tu_khoa_yeu(self):
        lines = [f"Plain line number {i}." for i in range(12)]
        lines[8] = "Suddenly the lights were gone."
        st = nhip.chi_so(nhip.cau(nhip.parse_srt(self._srt(lines))))
        self.assertEqual(st["twist_phat_hien"], "yeu")
        self.assertGreater(st["vi_tri_twist_pct"], 40)

    def test_phan_twist_khong_rong(self):
        lines = [f"Plain line number {i}." for i in range(20)]
        lines[16] = "But then the truth came out."
        st = nhip.chi_so(nhip.cau(nhip.parse_srt(self._srt(lines))))
        self.assertEqual(st["twist_phat_hien"], "chac")
        self.assertGreaterEqual(st["cau_moi_phan"]["twist"], 1)
        self.assertGreaterEqual(st["cau_moi_phan"]["giai_quyet"], 1)

    def test_tu_khoa_chac_thang_yeu(self):
        st = nhip.chi_so(nhip.cau(nhip.parse_srt(MAU.read_text(encoding="utf-8-sig"))))
        self.assertEqual(st["twist_phat_hien"], "chac")

    def test_json_co_canh_bao_va_doi_canh_null(self):
        import json
        with tempfile.TemporaryDirectory() as tmp:
            nhip.main([str(DATA), "--out", str(Path(tmp) / "nhip-kich-ban")])
            d = json.loads((Path(tmp) / "nhip-kich-ban.json").read_text(encoding="utf-8"))
            md = (Path(tmp) / "nhip-kich-ban.md").read_text(encoding="utf-8")
        self.assertTrue(d["canh_bao"])
        self.assertIn("ranh_phan", d)
        self.assertTrue(any("suy từ độ dài chữ" in c for c in d["canh_bao"]))
        ct = d["chi_tieu"]
        self.assertIsNone(ct["mat_do_doi_canh_moi_phut"])
        self.assertNotIn("ky_tu_moi_giay", ct)
        for k in ("n", "n_chac", "ti_le_phat_hien"):
            self.assertIn(k, ct["vi_tri_twist_pct"])
        self.assertIn("cận dưới", md)

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
