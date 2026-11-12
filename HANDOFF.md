# HANDOFF — ep001 "Ngôi nhà biết đi" (cập nhật 2026-11-12 khuya)

Đọc `CLAUDE.md` trước. Người dùng nói tiếng Việt. Nhánh `ep1-v2`, CHƯA push. Bàn giao trước: `git show 9d81dae~1:HANDOFF.md`
(trời 6 ảnh/bão). Phần cảnh nhẹ/gió/cỏ: `HANDOFF-canh.md`. Dây chuyền một câu luật → phim: `HANDOFF-quy-trinh.md`.

## Mục tiêu
Phim dọc ep001 giao 1 file HTML (trình phát + Xuất MP4). Góp ý theo frame → sửa → `dist/ep001_xem-thu.html` → duyệt → commit.

## Đã xong phiên này
- Mặt trời theo shot (`skySun`/`skyMoon`, ô `shotSky`), 7 shot ngày có mặt trời; trời thu nhỏ ×2 + lấy mẫu Catmull-Rom (ô `skyScale`, `skyCubic`).
- Góp ý `feedback/gop-y_ep001_2026-11-12_14-49/` (40 ghi chú, kế hoạch `KE-HOACH.md`): xong đợt A (trừ #22 #23 #26, #36 giảm nhẹ),
  phần lớn đợt B, #25 mũ trùm hoodie bịt kín 2 đầu (`r15.js`, f5f0045).
- Học repo `kaomei/stickman-video-director` (MIT) → 7 tính năng (commit 9d81dae, 99935fa, 1402d5d):
  1. Nhép miệng: `python tools/levels.py ep001` → `*.levels.json`; shot ghi `talk: 'hero'` (s064 s071 s072 s118); ô `nhep` (bật).
  2. Cổng mở đầu MP4: `node tools/mo-dau.mjs <mp4>` (khởi âm ≤100 ms ở −36 dBFS, lặng ≤600 ms); gắn trong `export-test.mjs`.
  3. Phụ đề Việt từng chữ: `python tools/caps_vi.py ep001 --whisper` (faster-whisper + difflib căn theo lời gốc); ô `chuTungChu` (tắt).
  4. Cue tiếng động theo sự kiện: shot `events: {doorOpen: 0.88}`, cue `event`/`anchor`/`tol`; `tools/sfx/anchor.py`, `cue-check --khong-anh`.
  5. Phủ nền âm thanh: `doctor.mjs` mục 11 (đoạn lặng chủ ý = `quiet:[{from,to,reason}]` trong `sfx/layers.json`);
     `audio-check.py --target` (−16..−14 LUFS, TP ≤ −1); `doctor.mjs ep001 --mix <mp4>`.
  6. Khoá âm thanh: `node tools/lock.mjs ep001 lock|check` (chưa tạo `episodes/ep001/lock.json` — tạo khi người dùng chốt tiếng).
  7. Luật L12 "đứng yên" trong `kiem-luat` (khoá camera, cửa sổ 2.25 s, ≥8 điểm ảnh đổi >12/255).

## Còn lại
1. Người dùng xem bản xem thử: nhép miệng (s071…) và bật thử `chuTungChu` — CHƯA ai nhìn bằng mắt; chưa xuất MP4 thật với 2 ô mới.
2. Bản xuất cũ trượt cổng: khởi âm 120 ms, −19.3 LUFS → sửa trộn (lớp nhac/giọng) cho đạt −16..−14.
3. L12 bắt s066 s068 s070 (bưu thiếp đứng yên khi bỏ zoom) → hỏi người dùng có cần chuyển động phụ không.
4. Góp ý chưa xong: #22 #23 #36 vệt dọc cạnh mặt (nghi hậu kỳ post/ao/painterly); #26 viền (cần biết ô nào người dùng bật);
   #31 núi thấp/tối; #40 s136 tối; nệm s037 cạnh vuông; đợt C (#10 #8 #12 #14 #19 #34 #39) — một phần đã có ô FX của phiên khác.
5. Cũ: bóng đổ chưa khớp mặt trời; s032 mũi sóng; kiểm cả phim `look.mjs --shots all --det`; xuất MP4 chậm; s095 pitch.
6. Giọng Việt khớp whisper thấp (~80%): BV562, BV560, daqi → mốc từng chữ kém hơn.

## Không đụng (phiên khác đang sửa, chưa commit)
`engine/r15.js` (mặt sống), `engine/measure.js`, `engine/materials.js`, `engine/house.js`, `engine/envs/island.js|openSea.js`,
`episodes/ep001/episode.js`, `tools/vat-lieu-doc.mjs`, file `ga*`, `_tmp_*`, `refs/t10-*`, voice `.ogg` yangguangnv, `Desktop.ini`.
Test hỏng không phải của phiên này: `hải đăng GLB` (materials), `houseFull`/`mask khôi phục` (chỉ hỏng khi chạy song song).
