---
name: lam-phim
description: Điều phối cả dây chuyền "một câu luật → phim HTML" sau khi người dùng đã duyệt kịch bản đầy đủ (MỐC 1b) — chạy node tools/lam-phim.mjs <ep>, giao việc cho tối đa 3 agent Sonnet khi tool báo canAgent, dừng ở MỐC DUYỆT 2 (bảng mẫu 00_mau.jpg), chạy giọng CapCut nền, dựng shot, vòng rà lỗi, tiếng động/nhạc/phụ đề/ghi công, gộp dist/<ep>.html. Dùng BẤT CỨ KHI NÀO người dùng nói "làm phim", "chạy lam-phim", "dựng cả tập từ kịch bản", "tiếp tục làm tập epNNN", "bước tiếp theo của dây chuyền", "đến đâu rồi" — kể cả khi không nhắc tên skill.
---

# Làm phim — điều phối dây chuyền 8 bước

Đầu vào: `episodes/<ep>/kich-ban.md` đã qua `python tools/kb/lint.py` 0 lỗi và người dùng đã duyệt (MỐC 1b, skill `viet-kich-ban`).
Đầu ra: `dist/<ep>_xem-thu.html` (bản nháp khi giọng thật chưa xong) rồi `dist/<ep>.html` + `dist/<ep>_theo-doi.html`.
Spec: `docs/superpowers/specs/2026-11-12-quy-trinh-mot-cau-luat-ra-phim-design.md` (mục 4, 6.2, 7.2, 8, 9).

## Công cụ duy nhất bạn gọi
```
node tools/lam-phim.mjs <ep> tiep          # chạy các bước cần chạy cho tới khi gặp việc cần agent / người dùng
node tools/lam-phim.mjs <ep> trang-thai    # chỉ đọc: 8 bước, bước kế tiếp
node tools/lam-phim.mjs <ep> <buoc> [--force]   # đúng 1 bước (kich-ban asset giong mau-duyet shot ra-loi am-thanh gop)
```
Tool KHÔNG gọi LLM, không commit, không push. Stdout là một khối JSON; log ở stderr. Mã thoát: `0` chạy được (kể cả chờ agent / giọng nền), `1` cần người dùng, `2` lỗi môi trường.
```
{ ep, buocTiep, canAgent:[{viec,file,model}], canNguoiDung:null|{lyDo,anh}, daChay[], daBo[], dangChayNen[], canhBao[], lien, toiDaSongSong:3 }
```
Mỗi bước chạy lại CHỈ khi đầu vào đổi (hash): sửa kịch bản → chạy lại từ đầu (giọng chỉ tạo lại nếu lời kể đổi); sửa `narration.json` (giọng thật xong) → chỉ `shot`, `ra-loi`, `am-thanh`, `gop`.

## Vòng điều phối (3a–3f)
0. Nhánh riêng: `git switch -c <ep>` (nếu chưa có). **Sau mỗi bước đạt → commit** với thông điệp rõ (implementer/agent KHÔNG commit; chỉ agent chính commit). Không push, không merge khi chưa được bảo.
1. Chạy `tiep`, đọc JSON:
   - `canAgent` khác rỗng → giao việc (xem "Quy tắc agent"), đợi xong, kiểm lại (diff, chạy lại `tiep`), không tin báo cáo agent chưa kiểm.
   - `canNguoiDung` khác null → DỪNG, báo người dùng đúng `lyDo` + đường dẫn `anh`; không tự quyết thay (mục 8 bên dưới).
   - `dangChayNen` có `giong` → bình thường, dựng hình không chờ (đã chạy `--dry` để có nhịp).
   - Mỗi bước đạt → đẩy `node tools/theo-doi.mjs <ep> --json` lên artifact "Bảng sản xuất phim" (ArtifactData, ghi vào dataset `tap/buoc/loi/token`) để người dùng xem từ xa; chỉ đẩy ảnh nhỏ (bảng mẫu, lưới lỗi).
2. **3a asset** — `thieu.json` còn gì thì `canAgent` liệt kê (bối cảnh = skill `scene-env`, đạo cụ = `ref-model`, animation R15 = `r6-anim`); mỗi bối cảnh một file `engine/envs/<tên>.js`. Chạy lại `tiep` đến khi thiếu = 0.
3. **3b giọng CapCut** chạy NỀN ngay (~1 giờ): `--dry` trước rồi `python tools/tts.py` (giọng mặc định tiếng Việt `BV075_streaming` Thanh Niên Tự Tin). CapCut lỗi hoặc log không đổi 30 phút → `canNguoiDung`; **KHÔNG tự đổi sang Edge**. Danh sách giọng dùng: `python tools/voices_build.py <ep> list`.
4. **3c mau-duyet** → `output/<ep>/duyet/00_mau.jpg` = **MỐC DUYỆT 2**. Chưa duyệt thì tool dừng với `canNguoiDung`; KHÔNG dựng shot khi chưa duyệt. Người dùng duyệt: `node tools/mau-duyet.mjs <ep> --duyet tat-ca` (hoặc `--tu-choi <muc,…>` → chỉ chụp lại mẫu đó). Duyệt trước rồi mới ghép.
5. **3d shot** — `shot-gen.mjs` (luật camera dồn dập, `--khop-giong` khi đã có `narration.json`).
6. **3e ra-loi** (vòng rà lỗi) — `kiem-luat` → `ra-loi` tự sửa tối đa `goi.vongMax` vòng/nhóm. Lỗi dưới ngưỡng còn lại → `canAgent` rà tay (≤ 3 agent, mỗi agent một nhóm luật, chỉ Edit đúng dòng shot của mình). **Vòng rà lỗi cuối phải chạy SAU khi có giọng thật**: khi `giong` xong, `narration.json` đổi → `tiep` tự chạy lại shot→ra-loi→am-thanh→gop; đừng chốt phim bằng kết quả của giọng `--dry`.
7. **3f am-thanh** (tiếng động nền/bước chân/khoảnh khắc + nhạc + phụ đề + ghi công `ghi-cong.mjs`) → **gop** (`build.mjs <ep> all`, `theo-doi.mjs`).
8. Cuối: đưa link (xem "Giao sản phẩm").

## Khi nào gọi người dùng (mục 8; ngưỡng ở `episodes/<ep>/quy-trinh.json`, mặc định `tools/kiem/mac-dinh.json`)
- Sau 2 vòng còn > 10 shot lỗi, hoặc 1 luật lỗi ở > 15% số shot → gửi bảng số + `output/<ep>/duyet/02_loi/` + `luoi-loi.jpg`.
- Lỗi không tự sửa: thiếu mô hình/animation, kịch bản mâu thuẫn hình, vật liệu chưa duyệt, silhouette (L10) không đạt sau 2 vòng, tất định (`--det`) lỗi, L5/L9/L12.
- Một bước quá 30 phút không tiến (`goi.phutKhongTien`) → tool tự báo.
- Không bao giờ: push, xoá asset, đổi cốt truyện (twist/kết) khi tự sửa.

## Quy tắc agent (người dùng chốt)
- **Tối đa 3 agent cùng lúc.** Muốn nhiều hơn thì hỏi trước + ước lượng chi phí. Mỗi lần giao nói ngắn: mấy agent, model nào, việc gì.
- **KHÔNG dùng Haiku** cho dây chuyền này. Sonnet cho viết code/dựng asset/rà soát; Opus chỉ cho thiết kế khó (kiến trúc engine, rig, lỗi khó tìm).
- **Mỗi agent sở hữu file riêng** (đúng cột `file` của `canAgent`); không hai agent cùng một file. Không sửa `engine/` dùng chung nếu không được giao.
- Giao việc rõ: mục tiêu, phạm vi file, đã loại trừ gì, "xong khi nào" (tool nào chạy sạch). Không giao cùng một việc cho hai agent, không tự làm lại việc đã giao.
- **Implementer/agent không commit.** Agent chính kiểm diff + chạy test/tool rồi mới commit.
- Kiểm hình bằng số trước (`look.mjs --pose`, `kiem-luat`), chỉ mở ảnh khi số báo lệch; ảnh nằm trên đĩa, không dán vào chat.

## Giao sản phẩm
Sau MỖI lần sửa xong (kể cả nhỏ) luôn gộp lại và đưa link ở cuối câu trả lời: đường dẫn `S:\3JS Studio\dist\<ep>_xem-thu.html` (bản nháp / chưa chốt) hoặc `S:\3JS Studio\dist\<ep>.html` (bản cuối), kèm `file:///S:/3JS%20Studio/dist/<ep>.html`. Mọi tính năng mới bật/tắt được trong trình phát. Render MP4 chạy trên máy người dùng (nút ⬇ Xuất MP4), không cloud.

## Ghi chú
- Nhân vật chính có thể là **Gà** (`engine/ga-rig.js`, xem `HANDOFF-ga.md`) — CHƯA nối vào `engine/cast.js`; nối là việc của lúc chạy tập (mau-duyet hiện chụp `ga` bằng R15 mặc định).
- Tập đã có tay làm (ep001) và ep002 đang dở: KHÔNG chạy `tiep` ở chế độ thật (shot-gen `--force` ghi đè shots.js/episode.js). Chỉ `trang-thai` là đọc an toàn.
- Test tool: `LAM_PHIM_GIA=1 node tools/lam-phim.mjs _test_lamphimX tiep` (lệnh con giả, log ở `output/<ep>/kiem/gia.log`); `node --test tools/tests/lam-phim.test.mjs`.
