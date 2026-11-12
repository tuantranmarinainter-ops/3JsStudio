// DANH MỤC BẦU TRỜI 6 ẢNH — tools/sky-import.mjs tự thêm dòng khi nhập; sửa tay label/when/sunSize/moonSize thoải mái.
//   when: 'day' (chỉ hiện khi trời đẹp) | 'night' (chỉ khi ánh sáng đêm) | 'any'
//   sun / moon: có ảnh sun.png / moon.png (Roblox SunTextureId / MoonTextureId); sunSize / moonSize: độ góc (Roblox mặc định 21 / 11)
export const SKIES = {
  "anime-day": {"label": "Trời xanh mây trắng vẽ tay, chân trời biển (Roblox Sky, người dùng gửi 2026-11-12)", "when": "day", "exposure": 1},
  "clear-day": {"label": "Trời trong xanh, chân trời trắng, có mặt trời + mặt trăng (Roblox Sky, người dùng gửi 2026-11-12)", "when": "day", "exposure": 1, "sun": true, "sunSize": 21, "moon": true, "moonSize": 11},
  "moon": {"label": "Đêm mây đen dày (Roblox Sky 6285719338…)", "when": "night", "exposure": 1},
  "obby-sky": {"label": "Anime ngày có cầu vồng (Roblox Sky 16573631102…)", "when": "day", "exposure": 1},
  "sky-2": {"label": "Mây xám bão, ảnh phản chiếu (Roblox Sky 15542516997…)", "when": "any", "exposure": 1},
  "sky-3": {"label": "Đêm cực quang xanh lục (Roblox Sky 8974647550…)", "when": "night", "exposure": 1},
  "sky-4": {"label": "Đêm mây đen có trăng vẽ sẵn (Roblox Sky 48020371…)", "when": "night", "exposure": 1},
  "sky-5": {"label": "Đêm mây xám tối (Roblox Sky 15502511288…)", "when": "night", "exposure": 1},
  "sky-6": {"label": "Anime hoàng hôn mây cam (Roblox Sky 105645283097230…)", "when": "day", "exposure": 1},
  "sky-7": {"label": "Anime ban ngày: trời xanh mây trắng, có mặt trời + mặt trăng (Roblox Sky 14556558767…, người dùng gửi 2026-11-12) — trời NGÀY mặc định", "when": "day", "exposure": 0.86, "sun": true, "sunSize": 11, "sunGain": 0.7, "moon": true, "moonSize": 11, "fog": "#cfeefe"},
  "sky-8": {"label": "Anime ngày mây trắng hồng (Roblox Sky 13107325341…)", "when": "day", "exposure": 1},
  "sky-9": {"label": "Đêm xanh có sao + mây mỏng (Roblox Sky 1233158420…) + trăng của sky-7 — trời ĐÊM mặc định", "when": "night", "exposure": 1.3, "moon": true, "moonSize": 13, "fog": "#26345c"}
};
