# HANDOFF — quy trình "một câu luật → phim HTML" (cập nhật 2026-11-13 rạng sáng, cuối phiên 3 lượt 3)

Đọc `CLAUDE.md` trước. `HANDOFF.md`, `HANDOFF-canh.md`, `HANDOFF-gop-y.md`, `HANDOFF-ga.md` là của việc khác — không đụng.

## Mục tiêu
Dây chuyền: câu luật → 5 kịch bản mẫu → kịch bản đầy đủ → "tiến hành" → `dist/<ep>.html`, sửa tay < 10 lần.
- Thiết kế: `docs/superpowers/specs/2026-11-12-quy-trinh-mot-cau-luat-ra-phim-design.md`; kế hoạch 21 task cùng tên trong `docs/superpowers/plans/`.
- Sổ tiến độ (nguồn sự thật, mọi `Ruling:`): `.superpowers/sdd/2026-11-12-quy-trinh-mot-cau-luat-ra-phim/progress.md` (gitignore).
- **Báo cáo tổng cho người dùng: `BAO-CAO-quy-trinh.md`** (việc xong, điểm yếu ep002, việc chờ quyết, lỗi dây chuyền, mọi Ruling).

## Đã xong (nhánh `ep1-v2`, đã commit, CHƯA push)
- Task 1–20. Task 20a troika (ô `troikaText` TẮT) rà sạch; 20b/20c/20d không tích hợp (lý do `docs/core.md`).
- Rà cả nhánh (Opus, `final-review.md` trong thư mục sổ) → sửa C1–C3, I1–I7, nhãn "Tầng bổ sung".
- **Task 21 — bản nháp ep002: `dist/ep002_xem-thu.html`** (55 MB, 114 shot, 2:56, giọng CapCut thật, tiếng động, nhạc, ghi công; xuất MP4 thử đạt; `--det` cả phim OK).
  Mới: `engine/bear.js`, `engine/anim-them.js`, `engine/cast.js` (ga:1 / bear:1), `engine/envs/factory.js`, `engine/props-kb.js`, `tools/sfx/shot-list.mjs`.
  ep002 gộp TRỰC TIẾP: `node tools/bundle.mjs ep002 --out dist/ep002_xem-thu.html` (bước am-thanh/gop của lam-phim bị chặn vì giấy phép trời).

- **Bản cuối ep002: `dist/ep002.html`** (2026-11-13 sáng). Người dùng tự bấm "Có, ra bản cuối" = nhận trách nhiệm giấy phép trời sky-7/sky-9
  → `quy-trinh.json ghiCong.choPhepTroi: true`. `tiep --cho-phep-troi` chạy hết am-thanh + gop, NHƯNG ra-loi lại tự sửa đè 5 shot dù `vongMax 0`
  → đã khôi phục `shots.js` từ HEAD rồi gộp lại bằng `node tools/bundle.mjs ep002`; vì vậy `trang-thai` báo bước tiếp là ra-loi — ĐỪNG chạy `tiep` nữa.

## Còn lại (theo thứ tự)
1. Chờ người dùng xem bản cuối ep002 + trả lời các mục còn lại của "Chờ bạn quyết" trong `BAO-CAO-quy-trinh.md` (bảng mẫu, tiệm là mặt phố hay nội thất, CLAUDE.md, commit file Gà).
2. Rà lại (scoped re-review, Sonnet) các gói sửa chưa rà: commit `eeec98c` `172e436` `cdfb6dd` (A: lam-phim/asset-plan/mau-duyet), `cbed4fa` (B: bear/cast/anim),
   `497e517` (C: storyboard/shot-gen/template/props-kb), `d0b5eda` (factory), `886f744` (engine ep002), `da0e233` (sfx shot-list).
3. Sửa lỗi dây chuyền lộ ra khi chạy thật (mục cùng tên trong báo cáo): narration.txt bị ghi đè mất `@voice`; giọng `--dry` ghi đè giọng thật;
   ra-loi thêm khoá `cam` thứ hai + lùi camera rà tay; `--nhap` không nới chặn trời; giọng vai mặc định nữ; `reveal` ngắm lệch; closeup gấu quá xa.
4. ep002 sau góp ý: làm sáng cảnh đêm (TB 82,8), các shot yếu s044 s048 s060 s074 s024 s033 s086 s027, làm đẹp đạo cụ, mũ lính gác/đầu bếp, lớp tiếng Anh.
5. Mục 11b.3: cập nhật `CLAUDE.md` — CHỈ khi người dùng tự bảo (phiên này nhận lệnh qua phiên khác nên không sửa).

## Quyền / giới hạn
- KHÔNG: push, merge, đổi ngưỡng L1, thay skybox, duyệt đổi hình ep001, áp bảng "Đề xuất đổi loại", đặt `ghiCong.choPhepTroi`, commit hộ file Gà.
- Không Haiku cho dây chuyền; Sonnet cho code + rà; Opus chỉ thiết kế khó; ≤ 3 agent, mỗi agent file riêng. Agent phụ phiên này đã tốn ~95 triệu token → tiết kiệm.
- Khi nhiều agent cùng chụp: `look.mjs --jobs 1`, mỗi lần ≤ 4 shot (3 agent chụp song song làm nghẽn GPU).

## Cảnh báo
- Phiên khác commit vào CÙNG checkout. `engine/r15.js`, `episodes/ep001/episode.js` có sửa dở của phiên Gà (r15.js: tôi chỉ stage 1 dòng `body.ds` theo hunk).
- ep002 `quy-trinh.json`: `goi.vongMax 0`, `chapNhanNhap true` (không cho ra-loi tự sửa shot đã rà tay). Đừng chạy `tiep` trên ep001.
- Giọng vai ep002: bach = `capcut:multi_male_felipe_uranus_bigtts`, mayor = `capcut:multi_female_xinwenjieshuo_uranus_bigtts`; kiểm lại `narration.txt` sau mỗi lần `lam-phim` chạy bước giọng.
- `node --test tools/tests/*.test.mjs` (dạng thư mục lỗi trên Node 24).

Câu dán vào phiên mới: **"Đọc HANDOFF-quy-trinh.md rồi làm tiếp mục còn lại số 1."**
