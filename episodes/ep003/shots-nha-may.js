// ep003 — shot của cụm bối cảnh "nha-may" (33 shot). Mỗi shot 1 dòng; dòng chú thích phía trên ghi set, ngày/đêm, mốc giây và MẶT (emote) từng nhân vật theo kịch bản.
// KHÔNG đổi id, dur. Đạo cụ thêm riêng của cụm: khai ở PROPS_NHA_MAY (episode.js gộp vào EPISODE.props).
export const PROPS_NHA_MAY = { thung_dau_gau: { kit: "thung_dau_gau", at: "e3-nha-may_in", hold: true } };
export const SHOTS_NHA_MAY = [
  // s049 · set:factory-exterior · đêm · 70.59–72.28 s · mặt: bap=quyet_tam, gau_vi=nghi_ngo, gau_tui=ren_do_mo_hoi
  { id: "s049", dur: 1.687, env: "e3-nha-may", light: "night", lightOverride: { exposure: 4.2 }, line: 28,
    cam: { p: [-50.8, 1.8, 14], l: [-44, 4.6, -10], fov: 60, p2: [-51.6, 2.2, 19], l2: [-44, 4.8, -11], fov2: 64 },
    cast: { bap: { at: [-48.2, 0, -5], to: [-48.2, 0, -14], anim: "walk", ry: 3.1416, face: "quyet_tam" },
            gau_vi: { at: [-48.8, 0, -2.5], to: [-48.8, 0, -11.5], anim: "walk", ry: 3.1416, face: "nghi_ngo", hold: "vi" },
            gau_tui: { at: [-47.8, 0, 0], to: [-47.8, 0, -9], anim: "walk", ry: 3.1416, face: "ren_do_mo_hoi", hold: "tui_tien" } } },
  // s050 · set:factory-exterior · đêm · 72.28–74.00 s · mặt: hero=ngam_nghi
  { id: "s050", dur: 1.724, env: "e3-nha-may", light: "night", lightOverride: { exposure: 4.2 }, line: 28,
    cam: { p: [-53.5, 3.6, 18], l: [-39.5, 6.8, -6.2], fov: 52, p2: [-52.8, 3.8, 16.6], l2: [-39, 7.2, -6.5], fov2: 40 },
    cast: { hero: { at: [-50.4, 0, 10], ry: 2.5, anim: "idle", face: "ngam_nghi" } } },
  // s051 · set:factory-exterior · đêm · 74.00–75.44 s · mặt: hero=quyet_tam
  { id: "s051", dur: 1.445, env: "e3-nha-may", light: "night", lightOverride: { exposure: 4.2 }, line: 29,
    cam: { p: [-45, 2.6, 9], l: [-33.5, 5.6, 2.5], fov: 42, p2: [-43.5, 3.0, 8.0], l2: [-33.5, 5.8, 2.5], fov2: 36 },
    cast: { hero: { at: [-33.6, 2.0, 2.5], ry: 1.0, anim: "climb", face: "quyet_tam" } } },
  // s052 · set:factory-exterior · đêm · 75.44–76.88 s · mặt: hero=nghi_ngo
  { id: "s052", dur: 1.434, env: "e3-nha-may", light: "night", lightOverride: { exposure: 3.0 }, line: 29,
    cam: { p: [-38.5, 7.5, 7.2], l: [-13.3, 4.4, -9.2], fov: 40, p2: [-37.8, 7.5, 6.6], l2: [-11, 4.2, -9.2], fov2: 32 },
    cast: { hero: { at: [-33.4, 2.0, 2.5], ry: 1.9, anim: "peek", face: "nghi_ngo" } } },
  // s053 · set:factory-interior · đêm · 76.88–78.83 s · mặt: bap=o_tho
  { id: "s053", dur: 1.946, env: "e3-nha-may", light: "night", lightOverride: { exposure: 3.4 }, line: 30,
    cam: { p: [-20.2, 5.2, -14.6], l: [-20.4, 4.6, -8], fov: 42, p2: [-20.2, 5.0, -13.2], l2: [-20.4, 4.6, -8], fov2: 36 },
    cast: { bap: { at: [-20.9, 3.72, -8], ry: 3.1416, anim: "idle", face: "o_tho" } },
    props: { nhan_moi: { at: [-19.7, 4.1, -8], ry: 0 } } },
  // s054 · set:factory-interior · đêm · 78.83–80.75 s · mặt: bach=o_tho
  { id: "s054", dur: 1.929, env: "e3-nha-may", light: "night", lightOverride: { exposure: 3.0 }, line: 31,
    cam: { p: [-3.8, 5.6, -8.1], l: [4.8, 3.4, -8], fov: 32, p2: [-1.8, 5.4, -8.1], l2: [4.8, 3.5, -8], fov2: 30 },
    cast: { bach: { at: [4.8, 0, -8], ry: -1.5708, anim: "idle", face: "o_tho" } },
    props: { nhan_moi: { at: [2.0, 3.75, -8], ry: 0 } } },
  // s055 · set:factory-interior · đêm · 80.75–81.97 s · mặt: bach=cuoi_dac_y
  { id: "s055", dur: 1.217, env: "e3-nha-may", light: "night", lightOverride: { exposure: 2.6 }, line: 31,
    cam: { p: [0.5, 5.8, -2.0], l: [4.8, 5.4, -8.2], fov: 38, p2: [1.8, 5.8, -3.0], l2: [4.8, 5.4, -8.2], fov2: 32 },
    cast: { bach: { at: [4.8, 0, -8], ry: -1.04, anim: "idle", face: "cuoi_dac_y" } } },
  // s056 · set:factory-interior · đêm · 81.97–83.50 s · mặt: bach=cuoi_dac_y
  { id: "s056", dur: 1.528, env: "e3-nha-may", light: "night", lightOverride: { exposure: 3.2 }, line: 32,
    cam: { p: [10.5, 5.0, -3.5], l: [-1.5, 6.0, -14.5], fov: 50, p2: [12.0, 5.0, -2.5], l2: [-3.5, 6.0, -14.5], fov2: 56 },
    cast: { bach: { at: [5.4, 0, -5.5], ry: -1.5, anim: "idle", face: "cuoi_dac_y" } } },
  // s057 · set:factory-interior · đêm · 83.50–84.70 s · mặt: —
  { id: "s057", dur: 1.203, env: "e3-nha-may", light: "night", lightOverride: { exposure: 3.0 }, line: 32,
    cam: { p: [-14.0, 4.4, -9.6], l: [-6.5, 3.8, -14.1], fov: 34, p2: [-12.4, 4.3, -10.2], l2: [-6.5, 3.8, -14.1], fov2: 30 },
    cast: {} },
  // s058 · set:factory-interior · đêm · 84.70–86.75 s · mặt: bach=cuoi_dac_y
  { id: "s058", dur: 2.044, env: "e3-nha-may", light: "night", lightOverride: { exposure: 1.1 }, line: 33,
    cam: { p: [11.0, 6.4, -4.0], l: [20.5, 8.2, -19.4], fov: 46, p2: [12.2, 6.5, -5.4], l2: [20.5, 8.4, -19.4], fov2: 38 },
    cast: { bach: { at: [17.6, 0, -14.2], ry: 2.5, anim: "point", face: "cuoi_dac_y" } } },
  // s059 · set:factory-interior · đêm · 86.75–87.83 s · mặt: bach=cuoi_dac_y
  { id: "s059", dur: 1.088, env: "e3-nha-may", light: "night", lightOverride: { exposure: 0.7 }, line: 34,
    cam: { p: [18.4, 8.8, -11.6], l: [18.6, 7.9, -19.4], fov: 30, p2: [18.5, 8.6, -12.8], l2: [18.6, 7.9, -19.4], fov2: 26 },
    cast: { bach: { at: [21.5, 0, -15.4], ry: 3.1416, anim: "point", face: "cuoi_dac_y" } } },
  // s060 · set:factory-interior · đêm · 87.83–88.86 s · mặt: bach=cuoi_dac_y, bap=o_tho
  { id: "s060", dur: 1.027, env: "e3-nha-may", light: "night", lightOverride: { exposure: 1.6 }, line: 34,
    cam: { p: [5.5, 5.6, -6.0], l: [20.6, 6.2, -14.6], fov: 40, p2: [3.5, 5.8, -5.0], l2: [20.6, 6.2, -14.6], fov2: 46 },
    cast: { bach: { at: [19.4, 0, -14.6], ry: 2.2, anim: "point", face: "cuoi_dac_y" },
            bap: { at: [22.2, 0, -14.8], ry: 2.8, anim: "idle", face: "o_tho" } } },
  // s061 · set:factory-interior · đêm · 88.86–90.67 s · mặt: bach=cuoi_dac_y
  { id: "s061", dur: 1.807, env: "e3-nha-may", light: "night", lightOverride: { exposure: 0.7 }, line: 35,
    cam: { p: [19.4, 9.4, -12.4], l: [20.0, 8.6, -19.4], fov: 32, p2: [19.8, 9.2, -13.2], l2: [20.6, 9.0, -19.4], fov2: 28 },
    cast: { bach: { at: [19.2, 0, -15.6], ry: 3.1416, anim: "point", face: "cuoi_dac_y" } } },
  // s062 · set:factory-interior · đêm · 90.67–91.92 s · mặt: —
  { id: "s062", dur: 1.251, env: "e3-nha-may", light: "night", lightOverride: { exposure: 3.0 }, line: 36,
    cam: { p: [-11.4, 1.0, 2.5], l: [-9.0, 2.6, -8.0], fov: 50, p2: [-11.0, 1.0, 1.0], l2: [-9.0, 2.6, -8.0], fov2: 45 },
    cast: {} },
  // s063 · set:factory-interior · đêm · 91.92–93.12 s · mặt: —
  { id: "s063", dur: 1.203, env: "e3-nha-may", light: "night", lightOverride: { exposure: 3.2 }, line: 36,
    cam: { p: [-8.4, 2.4, -2.2], l: [-9.0, 2.1, -6.4], fov: 38, p2: [-8.6, 2.4, -3.2], l2: [-9.0, 2.1, -6.4], fov2: 32 },
    cast: {} },
  // s064 · set:factory-interior · đêm · 93.12–94.93 s · mặt: —
  { id: "s064", dur: 1.807, env: "e3-nha-may", light: "night", lightOverride: { exposure: 1.3 }, line: 37,
    cam: { p: [-13.6, 1.9, -2.4], l: [-11.2, 0.2, -5.6], fov: 30, p2: [-12.8, 1.5, -3.2], l2: [-11.2, 0.2, -5.6], fov2: 24 },
    cast: {}, props: { day_chuyen: { at: [-11.2, 0.06, -5.6], ry: 0.5 } } },
  // s065 · set:factory-exterior · đêm · 94.93–95.91 s · mặt: hero=a_ra_roi
  { id: "s065", dur: 0.976, env: "e3-nha-may", light: "night", lightOverride: { exposure: 3.4 }, line: 37,
    cam: { p: [-23.4, 6.9, 3.0], l: [-33.4, 6.6, 2.5], fov: 28, p2: [-25.6, 6.9, 2.9], l2: [-33.4, 6.6, 2.5], fov2: 24 },
    cast: { hero: { at: [-33.4, 2.0, 2.5], ry: 1.5708, anim: "scared", face: "a_ra_roi" } } },
  // s066 · set:factory-exterior · đêm · 95.91–98.00 s · mặt: hero=quyet_tam
  { id: "s066", dur: 2.095, env: "e3-nha-may", light: "night", lightOverride: { exposure: 4.8 }, line: 38,
    cam: { p: [-50.6, 3.8, -13], l: [-49, 3.6, 14], fov: 56, p2: [-50.6, 4.0, -2], l2: [-49, 3.6, 22], fov2: 52 },
    cast: { hero: { at: [-49, 0, -4], to: [-49, 0, 23], ry: 0, anim: "run", face: "quyet_tam" } } },
  // s078 · set:factory-exterior · ngày · 111.94–113.30 s · mặt: hero=thi_tham, mayor=ban_tin_ban_nghi, linh_a=nghi_ngo, linh_b=o_tho
  { id: "s078", dur: 1.358, env: "e3-nha-may", light: "day", line: 46,
    cam: { p: [-36.5, 3.6, 9.5], l: [-33.0, 4.6, -5.5], fov: 50, p2: [-37.5, 4.0, 13.5], l2: [-33.0, 4.6, -5.5], fov2: 54 },
    cast: { mayor: { at: [-32.2, 0, -4.6], ry: 1.5708, anim: "idle", face: "ban_tin_ban_nghi" },
            hero: { at: [-32.9, 0, -8.0], ry: 1.5708, anim: "point", face: "thi_tham" },
            linh_a: { at: [-36.4, 0, -3.2], ry: 1.5708, anim: "idle", face: "nghi_ngo" },
            linh_b: { at: [-36.2, 0, -6.6], ry: 1.5708, anim: "idle", face: "o_tho" } } },
  // s079 · set:factory-interior · ngày · 113.30–114.77 s · mặt: bach=o_tho
  { id: "s079", dur: 1.471, env: "e3-nha-may", light: "day", line: 46,
    cam: { p: [-11.0, 5.2, -8.2], l: [4.8, 5.0, -8.0], fov: 30, p2: [-8.0, 5.1, -8.2], l2: [4.8, 5.0, -8.0], fov2: 26 },
    cast: { bach: { at: [4.8, 0, -8], ry: -1.5708, anim: "hold", hold: "dong_ho_quyt", face: "o_tho" } } },
  // s080 · set:factory-exterior · ngày · 114.77–116.11 s · mặt: hero=thi_tham, mayor=a_ra_roi
  { id: "s080", dur: 1.336, env: "e3-nha-may", light: "day", line: 46,
    cam: { p: [-41.0, 5.6, -3.0], l: [-32.4, 5.6, -7.8], fov: 38, p2: [-39.6, 5.6, -3.8], l2: [-32.4, 5.6, -7.8], fov2: 32 },
    cast: { mayor: { at: [-32.4, 0, -7.6], ry: 1.5708, anim: "idle", face: "a_ra_roi" },
            hero: { at: [-33.9, 0, -8.8], ry: 1.5708, anim: "idle", face: "thi_tham" } } },
  // s081 · set:factory-exterior · ngày · 116.11–117.66 s · mặt: hero=quyet_tam, mayor=quyet_tam, linh_a=nghi_ngo, linh_b=thac_mac
  { id: "s081", dur: 1.548, env: "e3-nha-may", light: "day", line: 47,
    cam: { p: [-34.2, 4.4, 14.5], l: [-34.0, 4.8, -4.5], fov: 48, p2: [-35.0, 4.8, 19.0], l2: [-34.0, 4.8, -4.5], fov2: 52 },
    cast: { mayor: { at: [-33.0, 0, -4.6], ry: 0.4, anim: "point", face: "quyet_tam" },
            hero: { at: [-34.6, 0, -7.6], ry: 1.2, anim: "idle", face: "quyet_tam" },
            linh_a: { at: [-37.6, 0, -0.8], ry: -0.3, anim: "idle", face: "nghi_ngo" },
            linh_b: { at: [-38.8, 0, -3.2], ry: -0.1, anim: "idle", face: "thac_mac" } } },
  // s082 · set:factory-exterior · ngày · 117.66–119.00 s · mặt: mayor=quyet_tam, linh_a=quyet_tam, linh_b=quyet_tam
  { id: "s082", dur: 1.342, env: "e3-nha-may", light: "day", line: 48,
    cam: { p: [28.6, 3.8, 3.6], l: [22.0, 5.0, -0.5], fov: 44, p2: [29.4, 4.0, 4.6], l2: [22.0, 5.0, -0.5], fov2: 48 },
    cast: { mayor: { at: [21.0, 0, 0.0], ry: 1.5708, anim: "point", face: "quyet_tam" },
            linh_a: { at: [24.6, 0, -2.6], ry: 1.5708, anim: "idle", face: "quyet_tam" },
            linh_b: { at: [24.6, 0, 2.6], ry: 1.5708, anim: "idle", face: "quyet_tam" } } },
  // s083 · set:factory-storage · ngày · 119.00–120.18 s · mặt: linh_a=quyet_tam, linh_b=quyet_tam, mayor=quyet_tam, hero=nghi_ngo
  { id: "s083", dur: 1.183, env: "e3-nha-may", light: "day", line: 49,
    cam: { p: [17.5, 4.2, 0.0], l: [30.0, 5.0, 0.4], fov: 52, p2: [13.5, 4.4, 0.0], l2: [30.0, 5.0, 0.4], fov2: 56 },
    cast: { linh_a: { at: [28.6, 0, -4.2], ry: 1.5708, anim: "idle", face: "quyet_tam" },
            linh_b: { at: [28.6, 0, 4.2], ry: 1.5708, anim: "idle", face: "quyet_tam" },
            mayor: { at: [24.0, 0, -1.2], ry: 1.5708, anim: "idle", face: "quyet_tam" },
            hero: { at: [23.4, 0, 1.6], ry: 1.5708, anim: "idle", face: "nghi_ngo" } } },
  // s084 · set:factory-storage · ngày · 120.18–120.77 s · mặt: mayor=thac_mac, hero=nghi_ngo
  { id: "s084", dur: 0.591, env: "e3-nha-may", light: "day", line: 50,
    cam: { p: [29.5, 5.4, -3.6], l: [45.0, 5.5, 8.0], fov: 40, p2: [27.5, 5.8, -5.6], l2: [45.0, 5.5, 8.0], fov2: 44 },
    cast: { mayor: { at: [33.5, 0, 1.0], ry: 1.07, anim: "idle", face: "thac_mac" },
            hero: { at: [32.0, 0, -1.4], ry: 1.07, anim: "idle", face: "nghi_ngo" } } },
  // s085 · set:factory-storage · ngày · 120.77–122.12 s · mặt: —
  { id: "s085", dur: 1.343, env: "e3-nha-may", light: "day", line: 50,
    cam: { p: [38.0, 3.0, 1.8], l: [43.2, 3.2, 6.0], fov: 32, p2: [39.6, 3.0, 3.0], l2: [43.2, 3.2, 6.0], fov2: 26 },
    cast: {} },
  // s086 · set:factory-storage · ngày · 122.12–123.19 s · mặt: mayor=soc_ha_hoc, hero=nghi_ngo
  { id: "s086", dur: 1.077, env: "e3-nha-may", light: "day", line: 51,
    cam: { p: [45.2, 5.6, 1.2], l: [40.6, 5.0, 4.6], fov: 38, p2: [44.4, 5.6, 1.8], l2: [40.6, 5.0, 4.6], fov2: 32 },
    cast: { mayor: { at: [40.4, 0, 4.6], ry: 1.5708, anim: "point", face: "soc_ha_hoc" },
            hero: { at: [40.0, 0, 7.2], ry: 1.2, anim: "idle", face: "nghi_ngo" } } },
  // s087 · set:factory-storage · ngày · 123.19–124.29 s · mặt: mayor=nghi_ngo, bach=ren_do_mo_hoi
  { id: "s087", dur: 1.095, env: "e3-nha-may", light: "day", line: 51,
    cam: { p: [46.5, 5.4, 1.0], l: [40.5, 5.0, 2.5], fov: 44, p2: [48.0, 5.6, 0.6], l2: [40.5, 5.0, 2.5], fov2: 48 },
    cast: { mayor: { at: [41.6, 0, 4.2], ry: -1.9, anim: "point", face: "nghi_ngo" },
            bach: { at: [39.0, 0, 1.0], ry: -0.6, anim: "idle", face: "ren_do_mo_hoi" } } },
  // s088 · set:factory-storage · ngày · 124.29–125.18 s · mặt: bach=im_lang_kho_xu
  { id: "s088", dur: 0.887, env: "e3-nha-may", light: "day", line: 52,
    cam: { p: [43.5, 5.6, 1.5], l: [39.5, 5.2, 1.5], fov: 30, p2: [42.6, 5.6, 1.5], l2: [39.5, 5.2, 1.5], fov2: 25 },
    cast: { bach: { at: [39.5, 0, 1.5], ry: 1.5708, anim: "idle", face: "im_lang_kho_xu" } } },
  // s089 · set:factory-storage · ngày · 125.18–125.85 s · mặt: hero=a_ra_roi
  { id: "s089", dur: 0.673, env: "e3-nha-may", light: "day", line: 53,
    cam: { p: [36.8, 5.9, 2.0], l: [41.5, 5.6, 4.0], fov: 28, p2: [37.8, 5.8, 2.5], l2: [41.5, 5.6, 4.0], fov2: 23 },
    cast: { hero: { at: [41.5, 0, 4.0], ry: -1.6, anim: "idle", face: "a_ra_roi" },
            bach: { at: [35.0, 0, 3.8], ry: 1.5708, anim: "idle", face: "im_lang_kho_xu" } } },
  // s090 · set:factory-storage · ngày · 125.85–127.01 s · mặt: bach=cuoi_dac_y
  { id: "s090", dur: 1.165, env: "e3-nha-may", light: "day", line: 54,
    cam: { p: [33.5, 1.6, -5.5], l: [40.5, 3.0, 2.0], fov: 54, p2: [34.6, 1.8, -4.4], l2: [40.5, 3.0, 2.0], fov2: 48 },
    cast: { bach: { at: [37.8, 0, -0.6], to: [41.2, 0, 3.6], ry: 0.9, anim: "hold", hold: "thung_dau_gau", face: "cuoi_dac_y" } } },
  // s091 · set:factory-storage · ngày · 127.01–128.27 s · mặt: bach=cuoi_dac_y
  { id: "s091", dur: 1.254, env: "e3-nha-may", light: "day", line: 54,
    cam: { p: [38.8, 4.8, 3.5], l: [43.0, 5.0, 6.8], fov: 34, p2: [39.6, 4.9, 4.0], l2: [43.0, 5.0, 6.8], fov2: 28 },
    cast: { bach: { at: [41.0, 0, 6.8], ry: 1.5708, anim: "hold", face: "cuoi_dac_y" } },
    props: { thung_dau_gau: { at: [44.8, 4.4, 6.8], ry: 0 } } },
  // s094 · set:factory-storage · ngày · 130.22–131.00 s · mặt: hero=ban_tin_ban_nghi, mayor=nghi_ngo, bach=dao_mat
  { id: "s094", dur: 0.779, env: "e3-nha-may", light: "day", line: 55,
    cam: { p: [45.2, 5.4, 2.6], l: [39.8, 5.0, 2.8], fov: 42, p2: [47.4, 5.8, 2.2], l2: [39.8, 5.0, 2.8], fov2: 46 },
    cast: { hero: { at: [41.3, 0, 4.4], ry: -1.6, anim: "idle", face: "ban_tin_ban_nghi" },
            mayor: { at: [39.4, 0, 1.6], ry: 1.5708, anim: "idle", face: "nghi_ngo" },
            bach: { at: [37.6, 0, 3.6], ry: 1.2, anim: "idle", face: "dao_mat" } } },
];
