# Bộ mặt AltiWyre — việc cho phiên ep003 (Tập 4)

Người dùng đã duyệt (14/11): thay bộ 37 emote bằng **AltiWyre's Face Pack** (Roblox Creator Store 6557969904) cho Tập 4 và mọi tập sau.
Engine đã sẵn; `episodes/ep003/*` CHƯA sửa (phiên này không được đụng). Phiên ep003 thêm đúng 2 dòng:

## 1. `episodes/ep003/episode.js` — thêm một trường vào `EPISODE` (cạnh `seed`)
```js
  facePack: 'altiwyre',   // bộ mặt nhân vật R6: 'altiwyre' | 'emote37' (engine/face-pack.js)
```

## 2. `episodes/ep003/index.html` dòng ~132 — truyền trường đó cho `buildCast`
```js
      const actors = await buildCast(THREE, EPISODE.actors, { seed: EPISODE.seed ?? 1, facePack: EPISODE.facePack });
```
Không khai báo thì tập vẫn dùng bộ cũ `emote37` (đã chạy thử `look.mjs episodes/ep003/index.html --t 2` sau khi sửa engine: mở bình thường).

## Điều cần biết
- **Tên biểu cảm không đổi**: 37 mặt mới cùng tên file với bộ cũ (`24_quyet_tam`, `smile`, `'24'`… vẫn dùng như trước) → không phải sửa `shots.js`.
- **Áp cho mọi nhân vật thân R6**, kể cả `hero: {"r6":1,"look":"ga"}`. Gà kiểu `ga: 1` (engine/ga-rig.js) và R15 KHÔNG đổi.
- **Bật/tắt trong trình phát**: ô FX `matAlti` ("Bộ mặt AltiWyre…"; tắt = quay về 37 emote cũ). Mặc định bật; chỉ có tác dụng khi tập khai `facePack: 'altiwyre'`.
- Mặt mới **nét mảnh hơn** bộ cũ và vẽ nguyên khung (mắt/miệng không xê dịch giữa các biểu cảm). Nhân vật có **tóc mái dày / mũ sụp** (vd `dan_a`) có thể che mày và nửa trên mắt → sau khi bật nên chụp vài shot cận (`look.mjs --shots …`) và chỉnh `faceY` / `faceSize` của look đó trong `engine/r6-looks.js` nếu cần.
- Sau khi thêm 2 dòng: `node tools/build.mjs ep003 canh` rồi gộp lại như thường; số ảnh tải thêm = 37 PNG (~0,35 MB), không thêm shader.

## Đổi một biểu cảm (không cần sửa engine)
1. Mở `dist/face-pack_mau.html` (dựng lại: `node tools/face-pack-mau.mjs`), chọn ô, bấm bộ phận, **Chép JSON**.
2. Dán mảng `lop` vào `assets/faces/altiwyre/map.json` → `node tools/face-pack.mjs ghep --chi-mat` (cần `.cache/roblox/6557969904/`; chưa có thì `node tools/face-pack.mjs tai` trước).
3. `node --test tools/tests/face-pack.test.mjs`.

## 6 biểu cảm chỉ khớp "tạm" (bộ mới thiếu bộ phận tương ứng)
`05_nan_ni_moi_vien_den` (không có mắt lấp lánh) · `09_ren_do_mo_hoi` (không có giọt mồ hôi) · `12_la_het` (không có mắt `><`) ·
`16_nghi_ngo` (hai mày đang đối xứng) · `21_kiet_suc` (quầng thâm `o13` chưa kiểm vị trí) · `36_nhay_mat` (ghép lẻ hai mắt).

## File
`engine/face-pack.js` (FACE_PACKS, loadFacePacks, activeFaceSet) · `engine/r6-rig.js` (tuỳ chọn `facePack: true`) · `engine/cast.js` (`buildCast(…, { facePack })`) ·
`engine/post.js` (ô FX `matAlti`) · `assets/faces/altiwyre/` (37 mặt + `parts/` 279 bộ phận + `map.json`, `parts.json`) · `tools/face-pack.mjs`, `tools/face-pack-mau.mjs` ·
`engine/face-pack-lab.html` (trang thử: `?pack=altiwyre|emote37&look=tron|dan_a&fx=0`) · test `tools/tests/face-pack.test.mjs`.
Tập mới: `tools/storyboard.py` ghi sẵn `facePack: 'altiwyre'`; `episodes/_template` và `_mau-kit` đã có trường + truyền cho `buildCast`.
