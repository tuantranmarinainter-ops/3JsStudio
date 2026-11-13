// ep003 — shot của cụm bối cảnh "phong" (40 shot). Mỗi shot 1 dòng; dòng chú thích phía trên ghi set, ngày/đêm, mốc giây và MẶT (emote) từng nhân vật theo kịch bản.
// KHÔNG đổi id, dur. Đạo cụ thêm riêng của cụm: khai ở PROPS_PHONG (episode.js gộp vào EPISODE.props).
export const PROPS_PHONG = {
  guong: { kit: "guong", at: "e3-phong_in", pos: [13.0, 0, 4.2] },
};
// Máy: p/l tuyệt đối (toạ độ env; BẮC = −Z, ĐÔNG = +X). Đạo cụ trên kệ khai tường minh mỗi shot (null = ẩn) để không phụ thuộc luật tự hiện.
const C = (p, l, fov, p2, l2, fov2) => ({ p, l, fov, ...(p2 ? { p2 } : {}), ...(l2 ? { l2 } : {}), ...(fov2 ? { fov2 } : {}) });
const SACH = { at: [6.6, 3.6, -13.9], ry: 0 };
const KE = [5.5, 3.6, -13.9];
const PR = (o = {}) => ({ dong_ho: null, day_chuyen: null, nhan_moi: null, cuon_sach: null, guong: null, ...o });
const GA_NAM = [-15, 3.55, -6.8];
const BAP_CHAN = [-15, 2.95, -5.4];
const MIR = { at: [13.36, -1.4, 4.25], ry: -2.004, s: 1.7 };
const EXP = { lightOverride: { exposure: 1.8 } };
const DEM = { time: "dem" };
export const SHOTS_PHONG = [
  // s001 · set:bedroom · đêm · 0.00–1.49 s · mặt: —
  { id: "s001", dur: 1.485, env: "e3-phong", at: "e3-phong_in", ...DEM, lightOverride: { exposure: 2.4 }, cam: C([-5.4, 5.3, 7.5], [-8.0, 5.25, 14.75], 28, [-6.6, 5.3, 7.5]), props: PR(), cast: {}, line: 1 },
  // s002 · set:bedroom · đêm · 1.49–2.85 s · mặt: —
  { id: "s002", dur: 1.369, env: "e3-phong", at: "e3-phong_in", ...DEM, lightOverride: { exposure: 1.8 }, cam: C([7.2, 8.5, -10.5], [5.0, 3.6, -13.8], 28, [6.6, 7.8, -10.9]), props: PR({ cuon_sach: SACH }), cast: {}, line: 1 },
  // s004 · set:bakery · ngày · 4.22–5.26 s · mặt: banh=boi_roi
  { id: "s004", dur: 1.04, env: "e3-tiem", at: "e3-tiem_in", cam: C([3.2, 5.6, 0.0], [1.5, 4.5, -7.8], 34, [3.0, 5.4, -1.2]), props: PR(), cast: { banh: { at: [1.4, 0, -7.9], ry: 0, anim: "idle", face: "boi_roi", pose: { torso: { x: 0.12 }, head: { x: 0.3 }, leftArm: { x: -1.25 } } } }, line: 2 },
  // s005 · set:bakery · ngày · 5.26–6.30 s · mặt: banh=boi_roi
  { id: "s005", dur: 1.039, env: "e3-tiem", at: "e3-tiem_in", cam: C([4.8, 1.0, 3.0], [4.6, 1.7, -5.5], 46, [4.8, 1.0, 2.0]), props: PR(), cast: { banh: { at: [1.4, 0, -7.9], ry: 0, anim: "idle", face: "boi_roi", pose: { torso: { x: 0.12 }, head: { x: 0.3 }, leftArm: { x: -1.25 } } } }, line: 2 },
  // s006 · set:tailor · ngày · 6.30–7.29 s · mặt: may=boi_roi
  { id: "s006", dur: 0.988, env: "e3-tiem", at: "e3-tiem_in", cam: C([106.5, 4.6, -1.5], [102.8, 3.9, -8.5], 36, [105.6, 4.6, -2.0]), props: PR({ hop_nhan: { at: [104.5, 2.8, -7], ry: 0 } }), cast: { may: { at: [102.8, 0, -9.4], ry: 0, anim: "idle", face: "boi_roi", pose: { torso: { x: 0.15 }, leftArm: { x: -1.4, z: -0.3 } } } }, line: 3 },
  // s007 · set:tailor · ngày · 7.29–8.28 s · mặt: —
  { id: "s007", dur: 0.988, env: "e3-tiem", at: "e3-tiem_in", cam: C([104.1, 9.0, -6.4], [104.1, 3.0, -7.2], 14, [104.1, 8.0, -6.6]), props: PR({ hop_nhan: { at: [104.5, 2.8, -7], ry: 0 } }), cast: {}, line: 3 },
  // s016 · set:bedroom · ngày · 21.54–23.02 s · mặt: hero=boi_roi
  { id: "s016", dur: 1.477, env: "e3-phong", at: "e3-phong_in", cam: C([16.2, 5.4, -1.5], [4.6, 3.8, -10.6], 46, [15.2, 5.4, -2.5]), props: PR({ cuon_sach: SACH }), cast: { hero: { at: [3.2, 0, -9.8], to: [4.0, 0, -11.9], ry: 2.3, anim: "walk", face: "boi_roi", pose: { rightArm: { x: [-0.3, -1.6] } } } }, line: 9 },
  // s017 · set:bedroom · ngày · 23.02–24.50 s · mặt: hero=boi_roi
  { id: "s017", dur: 1.478, env: "e3-phong", at: "e3-phong_in", cam: C([13.5, 4.8, -10.2], [5.6, 3.8, -13.0], 20, [12.8, 4.8, -10.4]), props: PR({ cuon_sach: SACH }), cast: { hero: { at: [4.0, 0, -11.9], ry: Math.PI, anim: "idle", face: "boi_roi", pose: { rightArm: { x: -1.6 } } } }, line: 9 },
  // s018 · set:bedroom · ngày · 24.50–25.91 s · mặt: hero=buon_rung_rung
  { id: "s018", dur: 1.412, env: "e3-phong", at: "e3-phong_in", cam: C([9.6, 4.7, -6.0], [4.0, 3.7, -11.9], 30, [8.6, 4.7, -7.0]), props: PR({ cuon_sach: SACH }), cast: { hero: { at: [4.0, 0, -11.9], ry: 0.5, anim: "idle", face: "buon_rung_rung", pose: { rightArm: { x: -1.1, z: 0.55 }, leftArm: { x: -1.1, z: -0.55 }, head: { x: 0.25 } } } }, line: 10 },
  // s019 · set:bedroom · ngày · 25.91–28.00 s · mặt: hero=quyet_tam
  { id: "s019", dur: 2.09, env: "e3-phong", at: "e3-phong_in", cam: C([9.6, 4.4, -11.5], [4.0, 3.9, -11.9], 30, [8.0, 4.4, -11.7]), props: PR({ cuon_sach: SACH }), cast: { hero: { at: [4.0, 0, -11.9], ry: 1.5, anim: "idle", face: "quyet_tam", pose: { rightArm: { x: -1.1, z: 0.55 }, head: { x: -0.2 } } } }, line: 11 },
  // s020 · set:bedroom · ngày · 28.00–29.34 s · mặt: hero=quyet_tam
  { id: "s020", dur: 1.34, env: "e3-phong", at: "e3-phong_in", ...DEM, lightOverride: { exposure: 1.7 }, cam: C([-8.5, 5.5, 13.5], [2.5, 3.8, -8.0], 48, [-7.0, 5.3, 10.0]), props: PR({ cuon_sach: SACH }), cast: { hero: { at: [-0.4, 0, -4.4], to: [4.1, 0, -10.8], anim: "walk", face: "quyet_tam", hold: "dong_ho" } }, line: 12 },
  // s021 · set:bedroom · ngày · 29.34–30.68 s · mặt: hero=quyet_tam
  { id: "s021", dur: 1.341, env: "e3-phong", at: "e3-phong_in", ...DEM, lightOverride: { exposure: 1.7 }, cam: C([5.5, 6.0, -12.7], [5.5, 3.8, -13.8], 40, [5.5, 5.8, -12.4]), props: PR({ cuon_sach: SACH, dong_ho: { at: KE, ry: 0 } }), cast: { hero: { at: [5.5, 0, -12.4], ry: Math.PI, anim: "idle", face: "quyet_tam", pose: { rightArm: { x: -1.45, z: 0.45 }, leftArm: { x: -1.45, z: -0.45 } } } }, line: 12 },
  // s022 · set:bedroom · đêm · 30.68–32.08 s · mặt: hero=buon_ngu, bap=binh_thuong
  { id: "s022", dur: 1.401, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([-9.0, 4.6, -8.0], [-15, 3.4, -8.6], 60, [-9.6, 4.6, -8.2]), props: PR({ cuon_sach: SACH, dong_ho: { at: KE, ry: 0 } }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "buon_ngu", pose: { head: { y: 0.8 } } }, bap: { at: [-15.2, 3.3, -5.0], lie: true, anim: "lie", face: "binh_thuong" } }, line: 12 },
  // s023 · set:bedroom · đêm · 32.08–33.66 s · mặt: hero=nghi_ngo
  { id: "s023", dur: 1.583, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([-16.4, 4.8, -11.6], [13.4, 5.5, 4.2], 20, [-16.0, 4.8, -11.3]), props: PR({ cuon_sach: SACH, guong: MIR }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "nghi_ngo" } }, line: 13 },
  // s024 · set:bedroom · đêm · 33.66–35.30 s · mặt: —
  { id: "s024", dur: 1.632, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([-14.2, 4.3, -11.0], [13.4, 5.5, 4.2], 22), props: PR({ cuon_sach: SACH, guong: MIR }), cast: {}, line: 13 },
  // s025 · set:bedroom · đêm · 35.30–37.36 s · mặt: hero=buon_ngu
  { id: "s025", dur: 2.062, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([-7.5, 6.2, -7.4], [-15, 4.0, -11.7], 26, [-8.2, 6.0, -7.9]), props: PR({ cuon_sach: SACH }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "buon_ngu" } }, line: 14 },
  // s026 · set:bedroom · đêm · 37.36–38.91 s · mặt: bap=o_tho
  { id: "s026", dur: 1.548, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([-14.2, 4.3, -11.0], [13.4, 5.5, 4.2], 22, [-14.2, 4.3, -11.0], [13.4, 4.8, 4.2], 20), props: PR({ cuon_sach: SACH, guong: MIR }), cast: { bap: { at: [13.2, 2.9, 3.52], ry: 1.1376, s: 1.5, anim: "sit", face: "o_tho" } }, line: 14 },
  // s027 · set:bedroom · đêm · 38.91–39.59 s · mặt: bap=nghi_ngo
  { id: "s027", dur: 0.681, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([-9.9, 4.6, -1.5], [-15, 4.3, -5.4], 24, [-10.4, 4.6, -2.0]), props: PR({ cuon_sach: SACH, dong_ho: { at: KE, ry: 0 } }), cast: { bap: { at: BAP_CHAN, ry: 0, anim: "sit", face: "nghi_ngo" } }, line: 15 },
  // s028 · set:bedroom · đêm · 39.59–41.88 s · mặt: hero=buon_ngu, bap=o_tho
  { id: "s028", dur: 2.295, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([-9.5, 4.5, 2.0], [-14, 3.6, -8.5], 44, [-10.0, 4.5, 1.0]), props: PR({ cuon_sach: SACH, dong_ho: { at: KE, ry: 0 } }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "buon_ngu" }, bap: { at: BAP_CHAN, ry: 0.4, anim: "sit", face: "o_tho" } }, line: 16 },
  // s029 · set:bedroom · đêm · 41.88–43.34 s · mặt: bap=quyet_tam
  { id: "s029", dur: 1.461, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([11.8, 2.4, -11.6], [5.2, 3.0, -12.6], 40, [11.0, 2.5, -11.7]), props: PR({ cuon_sach: SACH, dong_ho: { at: KE, ry: 0 } }), cast: { bap: { at: [5.0, 1.3, -12.3], ry: Math.PI, anim: "climb", face: "quyet_tam" } }, line: 17 },
  // s030 · set:bedroom · đêm · 43.34–44.80 s · mặt: bap=nghi_ngo
  { id: "s030", dur: 1.461, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([3.0, 5.2, -4.5], [5.0, 4.7, -13.8], 26, [3.4, 5.2, -5.3]), props: PR({ cuon_sach: SACH }), cast: { bap: { at: [5.0, 3.6, -13.7], ry: 0, anim: "hug", face: "nghi_ngo", hold: "dong_ho" } }, line: 17 },
  // s031 · set:bedroom · đêm · 44.80–46.44 s · mặt: bap=cuoi_dac_y
  { id: "s031", dur: 1.632, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([1.0, 8.0, -6.0], [5.4, 4.0, -13.8], 30, [1.5, 7.6, -6.5]), props: PR({ cuon_sach: { at: [6.6, 3.6, -13.9], to: [5.3, 3.6, -13.9], ry: 0 } }), cast: { bap: { at: [5.0, 3.6, -13.7], ry: 0, anim: "hug", face: "cuoi_dac_y", hold: "dong_ho" } }, line: 17 },
  // s032 · set:bedroom · đêm · 46.44–47.32 s · mặt: hero=soc_ha_hoc
  { id: "s032", dur: 0.879, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([-11.0, 5.2, -1.0], [-15, 4.4, -7.6], 40, [-11.6, 5.2, -1.8]), props: PR({ cuon_sach: { at: [5.3, 3.6, -13.9], ry: 0 } }), cast: { hero: { at: [-15, 2.95, -7.6], ry: 1.0, anim: "sitUp", face: "soc_ha_hoc" } }, line: 18 },
  // s033 · set:bedroom · đêm · 47.32–48.88 s · mặt: hero=soc_ha_hoc
  { id: "s033", dur: 1.569, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([-16.3, 6.8, -4.6], [5.3, 4.5, -13.9], 60, [-16.0, 6.7, -4.9]), props: PR({ cuon_sach: { at: [5.3, 3.6, -13.9], ry: 0 } }), cast: { hero: { at: [-15, 2.95, -7.6], ry: 1.35, anim: "sit", face: "soc_ha_hoc" } }, line: 19 },
  // s034 · set:bedroom · đêm · 48.88–50.34 s · mặt: hero=quyet_tam
  { id: "s034", dur: 1.46, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([-6.0, 6.0, 2.0], [-3.5, 5.0, -13.5], 38, [-5.5, 5.9, 0.5]), props: PR({ cuon_sach: { at: [5.3, 3.6, -13.9], ry: 0 } }), cast: { hero: { at: [-3.5, 0, -13.3], ry: Math.PI, anim: "idle", face: "quyet_tam", pose: { rightArm: { x: [-1.8, -2.5] }, leftArm: { x: [-1.8, -2.5] } } } }, line: 20 },
  // s035 · set:bedroom · đêm · 50.34–51.81 s · mặt: hero=ngo_ngac
  { id: "s035", dur: 1.462, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([-3.5, 6.0, -8.0], [-3.5, 6.2, -14.8], 30, [-3.5, 6.0, -9.0]), props: PR({ cuon_sach: { at: [5.3, 3.6, -13.9], ry: 0 } }), cast: { hero: { at: [-3.5, 0, -14.0], ry: Math.PI, anim: "idle", face: "ngo_ngac", pose: { torso: { x: 0.5 }, head: { x: 0.2 } } } }, line: 20 },
  // s037 · set:bedroom · đêm · 53.00–54.33 s · mặt: hero=quyet_tam
  { id: "s037", dur: 1.328, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([13.5, 4.8, -10.2], [5.5, 3.8, -13.2], 20, [12.8, 4.8, -10.4]), props: PR({ cuon_sach: SACH, nhan_moi: { at: [5.4, 3.6, -13.6], ry: 0 } }), cast: { hero: { at: [4.0, 0, -11.9], ry: Math.PI, anim: "idle", face: "quyet_tam", pose: { rightArm: { x: -1.6 } } } }, line: 21 },
  // s038 · set:bedroom · đêm · 54.33–55.69 s · mặt: hero=nghi_ngo
  { id: "s038", dur: 1.365, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([1.2, 4.4, -12.6], [11.5, 4.0, -10.0], 60, [1.8, 4.4, -12.6]), props: PR({ cuon_sach: SACH, nhan_moi: { at: [5.4, 3.6, -13.6], ry: 0 } }), cast: { hero: { at: [10.5, 0, -10.2], to: [12.5, 0, -9.8], ry: 1.6, anim: "walk", face: "nghi_ngo", pose: { head: { y: -0.9 } } } }, line: 21 },
  // s040 · set:bedroom · đêm · 58.19–59.06 s · mặt: bap=quyet_tam
  { id: "s040", dur: 0.873, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([4.8, 3.3, -6.5], [5.3, 4.3, -13.4], 34, [5.0, 3.35, -7.2]), props: PR({ cuon_sach: SACH }), cast: { bap: { at: [5.3, 3.6, -13.4], ry: 0, anim: "hold", face: "quyet_tam", hold: "nhan_moi" } }, line: 23 },
  // s041 · set:bedroom · đêm · 59.06–59.93 s · mặt: —
  { id: "s041", dur: 0.874, env: "e3-phong", at: "e3-phong_in", ...DEM, ...EXP, cam: C([4.8, 3.3, -6.5], [5.3, 4.3, -13.4], 34, [5.0, 3.35, -7.2]), props: PR({ cuon_sach: SACH }), cast: {}, line: 23 },
  // s095 · set:bedroom · ngày · 131.00–132.12 s · mặt: hero=tho_phao
  { id: "s095", dur: 1.117, env: "e3-phong", at: "e3-phong_in", cam: C([-4.6, 5.4, 12.6], [-8.0, 3.5, 13.8], 26, [-5.2, 5.1, 12.9]), props: PR(), cast: { hero: { at: [-9.5, 0, 12.8], ry: 1.5708, anim: "idle", face: "tho_phao", hold: "day_chuyen", pose: { rightArm: { x: -1.2, z: 0.3 }, leftArm: { x: -1.2, z: -0.3 } } } }, line: 56 },
  // s096 · set:bedroom · ngày · 132.12–133.01 s · mặt: hero=tho_phao
  { id: "s096", dur: 0.893, env: "e3-phong", at: "e3-phong_in", cam: C([-3.5, 5.0, 10.0], [-9.0, 4.0, 13.0], 38, [-4.2, 5.0, 10.4]), props: PR(), cast: { hero: { at: [-9.5, 0, 12.8], ry: 1.5708, anim: "idle", face: "tho_phao", hold: "day_chuyen", pose: { rightArm: { x: -1.2, z: 0.3 }, leftArm: { x: -1.2, z: -0.3 }, head: { x: 0.25 } } } }, line: 56 },
  // s097 · set:bedroom · ngày · 133.01–134.12 s · mặt: hero=tho_phao
  { id: "s097", dur: 1.109, env: "e3-phong", at: "e3-phong_in", cam: C([-9.5, 4.8, 8.0], [-13.6, 3.0, 12.6], 30, [-10.2, 4.6, 8.8]), props: PR(), cast: { hero: { at: [-12.4, 0, 12.6], ry: -1.5708, anim: "idle", face: "tho_phao", hold: "day_chuyen", pose: { rightArm: { x: -1.0 } } } }, line: 57 },
  // s098 · set:bedroom · ngày · 134.12–135.02 s · mặt: hero=binh_thuong, bap=cuoi_dac_y
  { id: "s098", dur: 0.897, env: "e3-phong", at: "e3-phong_in", cam: C([-8.5, 4.5, 3.5], [-12.5, 3.0, 11.0], 46, [-8.5, 4.5, 4.5]), props: PR(), cast: { hero: { at: [-10.5, 0, 11.0], to: [-9.6, 0, 11.0], ry: 1.5708, anim: "walk", face: "binh_thuong" }, bap: { at: [-13.9, 0, 9.6], to: [-14.0, 0, 11.0], ry: 0, anim: "walk", face: "cuoi_dac_y" } }, line: 58 },
  // s099 · set:bedroom · ngày · 135.02–136.05 s · mặt: bap=quyet_tam, hero=ngo_ngac
  { id: "s099", dur: 1.031, env: "e3-phong", at: "e3-phong_in", cam: C([-0.5, 2.4, 10.5], [-3.4, 1.5, 6.2], 42, [-1.1, 2.3, 9.8]), props: PR(), cast: { bap: { at: [-3.4, 0, 6.0], ry: 0.4, anim: "hug", face: "quyet_tam", hold: "ket_ga_om" }, hero: { at: [-1.0, 0, 5.0], ry: -2.0, anim: "idle", face: "ngo_ngac" } }, line: 58 },
  // s100 · set:bedroom · ngày · 136.05–136.50 s · mặt: hero=o_tho
  { id: "s100", dur: 0.448, env: "e3-phong", at: "e3-phong_in", cam: { at: "hero", look: [0, 0.3, 0], yaw: -1.6, dist: 6.5, dist2: 5.8, h: 0.2, fov: 30 }, props: PR(), cast: { hero: { at: [-1.0, 0, 5.0], ry: -2.0, anim: "idle", face: "o_tho" } }, line: 59 },
  // s101 · set:bedroom · ngày · 136.50–137.32 s · mặt: bap=boi_roi
  { id: "s101", dur: 0.824, env: "e3-phong", at: "e3-phong_in", cam: C([-1.0, 2.0, 10.5], [-3.4, 1.3, 6.5], 40, [-1.6, 1.9, 9.8]), props: PR({ ket_ga_om: { at: [-3.4, 0, 7.4], ry: 0 } }), cast: { bap: { at: [-3.4, 0, 6.0], ry: 0.3, anim: "idle", face: "boi_roi" } }, line: 60 },
  // s102 · set:bedroom · ngày · 137.32–138.22 s · mặt: hero=nhin_cuoi, bap=boi_roi
  { id: "s102", dur: 0.896, env: "e3-phong", at: "e3-phong_in", cam: C([-2.0, 3.8, 14.0], [-2.0, 2.6, 6.0], 62, [-2.0, 3.6, 13.0]), props: PR({ ket_ga_om: { at: [-4.8, 0, 7.0], ry: 0 } }), cast: { hero: { at: [-1.2, 0, 6.0], ry: -1.5708, anim: "idle", face: "nhin_cuoi", pose: { torso: { x: 0.2 }, rightArm: { x: -1.4 } } }, bap: { at: [-2.7, 0, 6.0], ry: 1.5708, anim: "idle", face: "boi_roi" } }, line: 61 },
  // s103 · set:bedroom · ngày · 138.22–138.93 s · mặt: hero=nhin_cuoi, bap=soc_ha_hoc
  { id: "s103", dur: 0.709, env: "e3-phong", at: "e3-phong_in", cam: C([-2.2, 2.4, 10.5], [-2.5, 2.2, 6.0], 30, [-2.3, 2.4, 10.0]), props: PR({ ket_ga_om: { at: [-4.8, 0, 7.0], ry: 0 } }), cast: { hero: { at: [-1.2, 0, 6.0], ry: -1.5708, anim: "idle", face: "nhin_cuoi", pose: { torso: { x: 0.2 }, rightArm: { x: -1.4 } } }, bap: { at: [-2.7, 0, 6.0], ry: 1.5708, anim: "idle", face: "soc_ha_hoc" } }, line: 61 },
  // s104 · set:black · ngày · 138.93–140.00 s · mặt: —
  { id: "s104", dur: 1.075, env: "e3-phong", time: "dem", lightOverride: { exposure: 0 }, cam: { p: [0, -400, 0], l: [0, -500, 0], fov: 20 } },   // CẮT ĐEN: máy chúc xuống dưới sàn rất xa + phơi sáng 0
];
