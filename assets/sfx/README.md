# assets/sfx — hiệu ứng âm thanh

File `<tên>.wav|ogg|mp3|flac` ở đây được gọi bằng trường `sfx` của shot (xem `tools/mix.py`):

```js
{ id: 's040', f: [...], sfx: { n: 'thud', at: 0.4 } }   // at = giây từ đầu shot, hoặc k: 0..1
```

- `tools/mix.py` đo **đỉnh âm** của từng file và đặt đỉnh đó đúng lúc sự kiện (không cần cắt khoảng lặng đầu file).
- Chỉ dùng âm thanh có giấy phép cho phép dùng thương mại (ưu tiên CC0, vd. Kenney Audio packs).
  Mỗi file thêm vào phải có dòng trong `assets/manifest.json` (nguồn + giấy phép).
- Tên ngắn, mô tả tiếng: `thud`, `whoosh`, `pop`, `creak`, `splash`, `thunder`…
