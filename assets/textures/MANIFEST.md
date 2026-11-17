# Texture manifest

## Water normal maps

- `env/water_normal_a.png` — large ripples, 1024×1024 PNG, linear OpenGL tangent-space normal (+Y), periodic.
- `env/water_normal_b.png` — fine ripples, 1024×1024 PNG, linear OpenGL tangent-space normal (+Y), periodic.
- `_preview.jpg` — contact sheet for these two files.

Source: original procedural waves, created specifically for this project with Python, NumPy and Pillow; no third-party image assets. The project may use these files commercially. Generator: `tools/generate_water_normals.py`. Other textures in the brief are not yet included.

## Cảnh ngoài cửa sổ phòng Gà (ep003, 17/11)

- `env/e3-phong-cua-so-ngay.jpg`, `env/e3-phong-cua-so-dem.jpg` — 1080×906 JPEG. Ảnh chụp bối cảnh phố `e3-pho` của chính dự án (máy đặt trước mặt tiền nhà Gà, tầng 2, nhìn dọc phố về bắc; t = 3,5 s ngày / 52,4 s đêm) bằng `output/_tmp/chup-cua-so.mjs`. Trong ảnh có các model Roblox Creator Store đã ghi công ở `assets/manifest.json` (`nhap/pho-*`) và trời `assets/sky/` (CREDITS). Dùng ở `engine/envs/e3-phong.js` (`?anhPho=0` tắt).
