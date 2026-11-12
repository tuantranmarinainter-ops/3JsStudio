// cong-thuc.js — CÔNG THỨC sinh bối cảnh từ mô tả chữ. Dữ liệu thuần (không THREE), chạy được trong node.
//   tuMoTa('bến cảng sương mù') → { env: 'sea', them: ['cang', …], time: null, weather: 'suong' } | null
// Khoá = cụm từ khoá ĐÃ FOLD (chữ thường, bỏ dấu, đ→d, chỉ chữ-số cách nhau 1 dấu cách). Khớp theo từ nguyên; cụm dài nhất thắng.
// Công thức: { env: <tên env trong engine/envs.js>, them: [thẻ đồ/sự sống thêm — gợi ý cho người dựng/agent bối cảnh], time?, weather? }
//   time ∈ sang|trua|chieu|hoang-hon|dem · weather ∈ nang|may|mua|giong|bao|tuyet|suong (xem engine/envs/gio-thoi-tiet.js).
// Thêm công thức = thêm 1 dòng. Cụm càng cụ thể càng nên dài (vd. 'ben cang suong mu' thắng 'ben cang').

export function fold(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

export const CONG_THUC = {
  // --- biển chung (env 'sea') ---
  'ben cang suong mu': { env: 'sea', them: ['cang', 'tau', 'den-duong', 'chim'], time: 'sang', weather: 'suong' },
  'ben cang': { env: 'sea', them: ['cang', 'tau', 'chim'] },
  'bien': { env: 'sea', them: ['song'] },
  // --- đất liền ---
  'thi tran': { env: 'town', them: ['den-duong', 'xe', 'dan'], time: 'trua', weather: 'nang' },
  'dem thi tran': { env: 'town', them: ['den-duong', 'cua-so-sang'], time: 'dem' },
  'rung': { env: 'forest', them: ['chim', 'co-gio'] },
  'rung nhiet doi': { env: 'brazil', them: ['chim', 'day-leo', 'co-gio'] },
  'bai bien': { env: 'hawaii', them: ['cay-dua', 'cua', 'chim'], time: 'trua', weather: 'nang' },
  'sa mac': { env: 'sahara', them: ['lac-da', 'cat-bay'], time: 'trua', weather: 'nang' },
  'nam cuc': { env: 'antarctica', them: ['canh-cut', 'tuyet-roi'], weather: 'tuyet' },
  'tren may': { env: 'mountain', them: ['bien-may', 'dinh-nui'], time: 'chieu' },
  'nui tuyet dem': { env: 'snowNight', them: ['tuyet-roi', 'trang'], time: 'dem', weather: 'tuyet' },
  'dao hai dang': { env: 'island', them: ['hai-dang', 'chim-bien', 'song'], time: 'hoang-hon' },
  // --- biển và nước ---
  'dai duong': { env: 'ocean', them: ['song', 'ca-voi'], time: 'trua', weather: 'nang' },
  'bien bang': { env: 'iceSea', them: ['bang-troi', 'song'], time: 'dem' },
  'bien bao': { env: 'storm', them: ['song-lon', 'mua'], time: 'dem', weather: 'bao' },
  'boong tau trong bao': { env: 'shipStorm', them: ['cot-buom', 'mua', 'song-lon'], weather: 'bao' },
  'bai da ngam': { env: 'reef', them: ['xac-tau', 'da-ngam'], time: 'chieu' },
  // --- nội thất ---
  'nha bep': { env: 'kitchen', them: ['tu-lanh', 'bep'] },
  'bep': { env: 'kitchen', them: ['tu-lanh'] },
  'phong ngu': { env: 'bedroom', them: ['giuong', 'den-ngu'], time: 'dem' },
};

// Cụm từ khoá xếp dài → ngắn (dài nhất thắng; cùng độ dài thì theo thứ tự khai báo)
const KHOA = Object.keys(CONG_THUC).sort((a, b) => b.length - a.length);

export function tuMoTa(moTa) {
  if (typeof moTa !== 'string') return null;
  const v = ' ' + fold(moTa) + ' ';
  if (v.trim() === '') return null;
  for (const k of KHOA) {
    if (!v.includes(' ' + k + ' ')) continue;
    const c = CONG_THUC[k];
    return { env: c.env, them: [...c.them], time: c.time ?? null, weather: c.weather ?? null };
  }
  return null;
}
