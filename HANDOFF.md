# HANDOFF — ep001 "Ngôi nhà biết đi" (cập nhật 2026-11-12 tối)

Đọc `CLAUDE.md` trước. Người dùng nói tiếng Việt. Bản bàn giao cũ (v4/core, 162 dòng): `git show 7688261:HANDOFF.md`.

## Mục tiêu
Phim dọc 1080×1920 ep001, giao dạng 1 file HTML có trình phát + nút Xuất MP4. Người dùng góp ý theo frame → sửa →
bản xem thử `dist/ep001_xem-thu.html` → người dùng duyệt → bản chính `dist/ep001.html` + commit (KHÔNG push nếu chưa bảo).

## Đã xong (commit 0c47896, nhánh `ep1-v2`, chưa push)
- **Bầu trời 6 ảnh** `engine/skybox.js` + danh mục `engine/skies.js` (13 bộ trong `assets/sky/`, ghi nguồn `assets/sky/CREDITS.md`).
  Mặt trời (ảnh cộng sáng) + trăng (ảnh alpha) vẽ trong shader, quay về camera.
- **Nhập hàng loạt**: `node tools/sky-import.mjs --batch <thư mục>` (nhận tên `SkyboxBk_…`/`SunTexture_…` hoặc ảnh 1–8 theo
  thứ tự sun, moon, bk, dn, ft, lf, rt, up). Bắt trùng, tự ghi skies.js + CREDITS.
- **Trời mặc định** (`engine/envs.js`, `SKY_DAY='sky-7'` anime có mặt trời/trăng, `SKY_NIGHT='sky-9'` đêm sao + trăng):
  mọi env ngoài trời trừ `NO_SKY` (kitchen, bedroom, reef, storm, shipStorm). Env ghi đè: `e.skybox`, `e.skyboxNight`
  (null = tắt), `e.skyFog`, `e.skySun`, `e.skyMoon`. Ô FX `skybox`.
  Mặt trời/trăng đặt thấp ~23°, phương vị NGƯỢC hướng nắng (để lọt khung). Ban ngày giấu trăng.
- **Trăng cũ** `K.moon` (`engine/props.js`) → sprite ảnh `assets/sky/sky-7/moon.png` (town, snowNight, iceSea). Env có trăng riêng
  thì trời đêm giấu trăng của nó.
- **Trời bão** `engine/stormsky.js` (tự viết): mây cuộn domain-warp, mây vụn, khe trăng viền bạc, chớp trong mây. Ô FX `stormSky`.
  Gắn `shipStorm` (`e.stormSky`), chỉ hiện khi light = 'storm'.
- **shipStorm s031–s032**: `e.gust(t)` 36,3→38,6 s; mưa xiên; sét 36,93/37,08; biển dâng ×1,15 qua `e.seaDrive`
  (`engine/shots.js` prepareSea); vòng sóng `e.seaEvents`. Gãy cột `engine/mastbreak.js`, buồm vải `engine/cloth.js`.
- Kiểm `look --det` đạt ở mọi khung đã chụp.

## Quyết định đã chốt
- Dâng sóng ×1,4 trở lên làm mũi sóng trắng phẳng sát ống kính s032 → giữ ×1,15 + vòng sóng.
- Trời đêm chọn sky-9 vì sáng nhất trong các bộ đêm (nhà/nhân vật đọc rõ). Trời ngày sky-7: exposure 0.86, sunSize 11, sunGain 0.7.
- Lỗi tất định từng gặp: `rain.slant` phải đặt TRƯỚC `rain.update` (đọc trạng thái khung trước).

## Còn lại
1. Mặt trời chỉ hiện ở shot camera nhìn về phía đó; người dùng có thể muốn chỉ định theo shot (thêm `skySun` vào shot?).
2. Bóng đổ vẫn theo hướng nắng cũ, chưa khớp vị trí mặt trời trên trời.
3. s032 vẫn có mũi sóng sáng nhỏ ở tiền cảnh — chờ người dùng góp ý.
4. Chưa kiểm cả phim 1 lần với trời mới: `node tools/look.mjs episodes/ep001/index.html --shots all --det`.
5. Việc cũ chưa xong (từ HANDOFF trước): xuất MP4 chậm (~5m27), s095 nhà chúi gần maxPitch.

## File quan trọng
`engine/skybox.js`, `engine/skies.js`, `engine/stormsky.js`, `engine/envs.js` (hàm `use()`, phần trời), `engine/envs/shipStorm.js`,
`engine/props.js` (moon), `tools/sky-import.mjs`, `engine/sky-lab.html` (thử trời: `?sky=<tên>`, cần http),
`assets/sky/`, `episodes/ep001/shots.js`.

## Không đụng (của phiên khác, chưa commit)
`tools/look.mjs` (đã sửa), `assets/polyhaven-tex/`, `engine/mat-lab.html`, `assets/CREDITS.md`, `assets/manifest.json`,
`episodes/ep001/voices/vi/multi_female_yangguangnv_uranus_bigtts.ogg`, `Desktop.ini`.
