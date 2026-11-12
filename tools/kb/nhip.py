"""Số liệu nhịp kể chuyện từ file phụ đề .srt (tiếng Anh).

Chỉ xuất SỐ LIỆU tổng hợp, không lưu lời gốc của phụ đề.

Chạy: python tools/kb/nhip.py [thư_mục=kich-ban/_vao/greenbro] [--out docs/nhip-kich-ban]
Ghi ra <out>.json và <out>.md.
"""

import argparse
import json
import re
import statistics
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MAC_DINH_THU_MUC = REPO / "kich-ban" / "_vao" / "greenbro"
MAC_DINH_OUT = REPO / "docs" / "nhip-kich-ban"

TIME_RE = re.compile(
    r"(\d+):(\d{1,2}):(\d{1,2})[,.](\d{1,3})\s*-->\s*(\d+):(\d{1,2}):(\d{1,2})[,.](\d{1,3})"
)
THE_RE = re.compile(r"<[^>]+>")
KET_THUC_CAU_RE = re.compile(r"[.!?…]+[\"')\]]*(?=\s|$)")
TU_KHOA_TWIST = [
    "but then",
    "that's when",
    "turns out",
    "the truth",
    "secret",
    "realized",
    "actually",
]
TWIST_RE = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in TU_KHOA_TWIST) + r")\b"
)
MOM_TU = {"mom", "mommy", "mum", "mama"}
GRANDMA_TU = {"grandma", "grandmother", "granny", "nana"}
NGUONG_DOI_CANH = 0.6
MOC_HOOK = 0.10
MOC_GIAI_QUYET = 0.75
MOC_TWIST_MAC_DINH = 0.50
MOC_TWIST_TOI_THIEU = 0.40


def _giay(h, m, s, ms):
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms.ljust(3, "0")) / 1000


def _chuan_hoa(text):
    return text.replace("’", "'").replace("‘", "'").lower()


def parse_srt(text):
    """Trả về danh sách khối {start, end, text} (giây). Bỏ khối không có mốc thời gian.
    Gộp khối liên tiếp có cùng nội dung (phụ đề tự động lặp dòng)."""
    text = text.lstrip("﻿").replace("\r\n", "\n").replace("\r", "\n")
    blocks = []
    for chunk in re.split(r"\n\s*\n", text.strip()):
        lines = chunk.split("\n")
        for idx, line in enumerate(lines):
            m = TIME_RE.search(line)
            if m:
                break
        else:
            continue
        noi_dung = " ".join(lines[idx + 1:])
        noi_dung = THE_RE.sub("", noi_dung)
        noi_dung = re.sub(r"\s+", " ", noi_dung).strip()
        if not noi_dung:
            continue
        start = _giay(*m.group(1, 2, 3, 4))
        end = _giay(*m.group(5, 6, 7, 8))
        if blocks and blocks[-1]["text"] == noi_dung:
            blocks[-1]["end"] = max(blocks[-1]["end"], end)
            continue
        blocks.append({"start": start, "end": end, "text": noi_dung})
    return blocks


def cau(blocks):
    """Ghép khối thành câu theo dấu . ! ? (thời gian chia theo vị trí ký tự trong khối)."""
    sentences = []
    buf = None
    for blk in blocks:
        text = blk["text"]
        dur = blk["end"] - blk["start"]
        L = len(text)
        pieces = []
        pos = 0
        for m in KET_THUC_CAU_RE.finditer(text):
            pieces.append((pos, m.end(), True))
            pos = m.end()
        if pos < L:
            pieces.append((pos, L, False))
        for a, b, term in pieces:
            seg = text[a:b].strip()
            if not seg:
                continue
            s = blk["start"] + dur * a / L
            e = blk["start"] + dur * b / L
            if buf is None:
                buf = {"start": s, "end": e, "text": seg}
            else:
                buf["end"] = e
                buf["text"] += " " + seg
            if term:
                sentences.append(buf)
                buf = None
    if buf is not None:
        sentences.append(buf)
    return sentences


def _phan_cua(rel, moc_twist):
    if rel < MOC_HOOK:
        return "hook"
    if rel < moc_twist:
        return "leo_thang"
    if rel < max(MOC_GIAI_QUYET, moc_twist):
        return "twist"
    return "giai_quyet"


def chi_so(sentences):
    """Chỉ tiêu cho một truyện (số liệu, không chứa lời)."""
    if not sentences:
        return None
    base = sentences[0]["start"]
    T = sentences[-1]["end"] - base
    if T <= 0:
        return None

    def rel(t):
        return (t - base) / T

    twist_rel = MOC_TWIST_MAC_DINH
    for s in sentences:
        if rel(s["start"]) > MOC_TWIST_TOI_THIEU and TWIST_RE.search(_chuan_hoa(s["text"])):
            twist_rel = rel(s["start"])
            break

    dem_phan = {"hook": 0, "leo_thang": 0, "twist": 0, "giai_quyet": 0}
    for s in sentences:
        dem_phan[_phan_cua(rel(s["start"]), twist_rel)] += 1

    do_dai = [len(s["text"]) for s in sentences]
    tong_ky_tu = sum(do_dai)

    dau = _chuan_hoa(sentences[0]["text"]).lstrip("\"'([{ ")
    kieu_mo = "in this town" if dau.startswith("in this town") else "khac"

    ket_goi_lai = False
    if len(sentences) >= 2:
        noi_dung_dau = set(re.findall(r"[a-z0-9]{5,}", _chuan_hoa(sentences[0]["text"])))
        noi_dung_cuoi = set(re.findall(r"[a-z0-9]{5,}", _chuan_hoa(sentences[-1]["text"])))
        ket_goi_lai = len(noi_dung_dau & noi_dung_cuoi) >= 2

    tokens = re.findall(r"[a-z]+(?:'[a-z]+)?", _chuan_hoa(" ".join(s["text"] for s in sentences)))
    dem = {"i": 0, "mom": 0, "grandma": 0}
    for tok in tokens:
        goc = tok.split("'")[0]
        if goc == "i":
            dem["i"] += 1
        elif goc in MOM_TU:
            dem["mom"] += 1
        elif goc in GRANDMA_TU:
            dem["grandma"] += 1
    n_tu = len(tokens)
    tan_suat = {k: (v / n_tu * 1000 if n_tu else 0.0) for k, v in dem.items()}

    so_doi_canh = 0
    for prev, nxt in zip(sentences, sentences[1:]):
        if nxt["start"] - prev["end"] >= NGUONG_DOI_CANH:
            so_doi_canh += 1

    return {
        "so_cau": len(sentences),
        "thoi_luong_s": T,
        "ky_tu_moi_cau": tong_ky_tu / len(sentences),
        "ky_tu_moi_giay": tong_ky_tu / T,
        "cau_moi_phan": dem_phan,
        "vi_tri_twist_pct": twist_rel * 100,
        "kieu_mo": kieu_mo,
        "ket_goi_lai_mo": ket_goi_lai,
        "tan_suat_1000_tu": tan_suat,
        "mat_do_doi_canh_moi_phut": so_doi_canh / (T / 60),
    }


def _phan_bo(values):
    if not values:
        return None
    if len(values) >= 2:
        p25, p50, p75 = statistics.quantiles(values, n=4, method="inclusive")
    else:
        p25 = p50 = p75 = values[0]
    return {
        "tb": round(statistics.fmean(values), 2),
        "p25": round(p25, 2),
        "p50": round(p50, 2),
        "p75": round(p75, 2),
    }


def tong_hop(stories):
    chi_tieu = {
        "so_cau": _phan_bo([s["so_cau"] for s in stories]),
        "thoi_luong_s": _phan_bo([s["thoi_luong_s"] for s in stories]),
        "ky_tu_moi_cau": _phan_bo([s["ky_tu_moi_cau"] for s in stories]),
        "ky_tu_moi_giay": _phan_bo([s["ky_tu_moi_giay"] for s in stories]),
        "cau_moi_phan": {
            phan: _phan_bo([s["cau_moi_phan"][phan] for s in stories])
            for phan in ("hook", "leo_thang", "twist", "giai_quyet")
        },
        "vi_tri_twist_pct": _phan_bo([s["vi_tri_twist_pct"] for s in stories]),
        "kieu_mo": {},
        "ket_goi_lai_mo_pct": 0.0,
        "tan_suat_1000_tu": {},
        "mat_do_doi_canh_moi_phut": _phan_bo([s["mat_do_doi_canh_moi_phut"] for s in stories]),
    }
    n = len(stories)
    if n:
        ti_le_in_town = sum(1 for s in stories if s["kieu_mo"] == "in this town") / n
        chi_tieu["kieu_mo"] = {"in this town": round(ti_le_in_town, 3), "khac": round(1 - ti_le_in_town, 3)}
        chi_tieu["ket_goi_lai_mo_pct"] = round(sum(1 for s in stories if s["ket_goi_lai_mo"]) / n * 100, 1)
        chi_tieu["tan_suat_1000_tu"] = {
            k: round(statistics.fmean([s["tan_suat_1000_tu"][k] for s in stories]), 2)
            for k in ("i", "mom", "grandma")
        }
    return chi_tieu


def _fmt(d, key="p50"):
    if d is None:
        return "—"
    return f"{d[key]}"


def _ghi_md(path, so_truyen, bo_qua, ct):
    cp = ct["cau_moi_phan"]
    dong = []
    dong.append("# Nhịp kịch bản: số liệu từ phụ đề tiếng Anh\n")
    dong.append(f"Số truyện: {so_truyen}; bỏ qua: {bo_qua}. Chỉ có số liệu, không lưu lời gốc.\n")
    dong.append("| Chỉ tiêu | TB | p25 | p50 | p75 |")
    dong.append("|---|---|---|---|---|")

    def them(ten, d):
        dong.append(f"| {ten} | {_fmt(d,'tb')} | {_fmt(d,'p25')} | {_fmt(d,'p50')} | {_fmt(d,'p75')} |")

    them("1. Số câu / truyện", ct["so_cau"])
    them("2. Thời lượng (s)", ct["thoi_luong_s"])
    them("3. Ký tự / câu", ct["ky_tu_moi_cau"])
    them("   Ký tự / giây (phụ)", ct["ky_tu_moi_giay"])
    them("4a. Câu phần hook (10% đầu)", cp["hook"])
    them("4b. Câu phần leo thang", cp["leo_thang"])
    them("4c. Câu phần twist", cp["twist"])
    them("4d. Câu phần giải quyết", cp["giai_quyet"])
    them("5. Vị trí twist (% thời lượng)", ct["vi_tri_twist_pct"])
    kieu = ct["kieu_mo"]
    dong.append(
        f"| 6. Kiểu mở: 'in this town' / khác | "
        f"{kieu.get('in this town', '—')} / {kieu.get('khac', '—')} | | | |"
    )
    dong.append(f"| 7. Kết gợi lại câu mở (%) | {ct['ket_goi_lai_mo_pct']} | | | |")
    tt = ct["tan_suat_1000_tu"]
    dong.append(
        f"| 8. Tần suất / 1000 từ: i / mom / grandma | "
        f"{tt.get('i', '—')} / {tt.get('mom', '—')} / {tt.get('grandma', '—')} | | | |"
    )
    them("9. Đổi cảnh (lần/phút, khoảng lặng >= 0,6 s)", ct["mat_do_doi_canh_moi_phut"])

    dong.append("")
    dong.append("## Áp dụng cho tiếng Việt\n")
    dong.append(
        f"1. Số câu: trung vị {_fmt(ct['so_cau'])} câu/truyện (p25-p75: "
        f"{_fmt(ct['so_cau'],'p25')}-{_fmt(ct['so_cau'],'p75')}). Giữ dải này cho cùng thời lượng, không dùng số tuyệt đối."
    )
    dong.append(
        f"2. Thời lượng: trung vị {_fmt(ct['thoi_luong_s'])} s. Quy đổi lời Việt theo ký tự/giây "
        f"(tiếng Anh trung vị {_fmt(ct['ky_tu_moi_giay'])}), không theo số từ."
    )
    dong.append(
        f"3. Phân bổ câu (trung vị): hook {_fmt(cp['hook'])}, leo thang {_fmt(cp['leo_thang'])}, "
        f"twist {_fmt(cp['twist'])}, giải quyết {_fmt(cp['giai_quyet'])}. Dùng làm tỉ lệ khi viết lời Việt."
    )
    dong.append(
        f"4. Vị trí twist: trung vị {_fmt(ct['vi_tri_twist_pct'])}% thời lượng. "
        f"Đặt cú ngoặt của phim quanh mốc này, không đặt sớm hơn 40%."
    )
    dong.append(
        f"5. Mở và kết: tỉ lệ truyện mở bằng 'in this town' là {kieu.get('in this town', '—')}; "
        f"{ct['ket_goi_lai_mo_pct']}% có kết gợi lại câu mở; đổi cảnh trung vị "
        f"{_fmt(ct['mat_do_doi_canh_moi_phut'])} lần/phút."
    )
    path.write_text("\n".join(dong) + "\n", encoding="utf-8")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Số liệu nhịp từ file .srt (không lưu lời gốc)")
    ap.add_argument("thu_muc", nargs="?", default=str(MAC_DINH_THU_MUC))
    ap.add_argument("--out", default=str(MAC_DINH_OUT))
    args = ap.parse_args(argv)

    thu_muc = Path(args.thu_muc)
    out = Path(args.out)
    if not out.is_absolute():
        out = REPO / out

    stories = []
    bo_qua = 0
    for f in sorted(thu_muc.glob("*.srt")):
        try:
            sentences = cau(parse_srt(f.read_text(encoding="utf-8-sig")))
            st = chi_so(sentences)
        except Exception:
            st = None
        if st is None:
            bo_qua += 1
        else:
            stories.append(st)

    ct = tong_hop(stories)
    so_truyen = len(stories)
    out.parent.mkdir(parents=True, exist_ok=True)
    du_lieu = {"so_truyen": so_truyen, "bo_qua": bo_qua, "chi_tieu": ct}
    out.with_suffix(".json").write_text(
        json.dumps(du_lieu, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    _ghi_md(out.with_suffix(".md"), so_truyen, bo_qua, ct)
    print(f"so_truyen={so_truyen} bo_qua={bo_qua}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
