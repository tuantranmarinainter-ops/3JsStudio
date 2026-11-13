// ep003 — shot của cụm bối cảnh "phong" (40 shot: 35 shot PHÒNG GÀ + 4 shot tiệm + s104). Mỗi shot 1 dòng; dòng chú thích phía trên ghi set, ngày/đêm, mốc giây và MẶT (emote) theo kịch bản.
// KHÔNG đổi id, dur. Bản 2 (13/11): phòng Gà dựng lại đúng tỉ lệ (engine/envs/e3-phong.js) → toạ độ lấy từ PHONG_DIEM, không gõ số rời.
// MÁY: tự đặt theo khung hình (khung.js = số Codex đo trên khung kịch bản; khung-sua.js = ghi đè tay). Bộ đặt máy đặt máy THEO HƯỚNG MẶT nhân vật, nên
//   hướng mặt tính ngược từ chỗ muốn đặt máy: ry = RY(B, id) với B = phương vị của MÁY nhìn từ nhân vật (độ; 0 = máy ở phía NAM (+Z), 90 = ĐÔNG, 180 = BẮC, −90 = TÂY).
//   Shot nhìn qua gương tự ghi cam p/l (máy nhìn vào ảnh đối xứng của vật: phongPhanChieu).
// Phòng: BẮC = −Z (cửa sổ, kệ), ĐÔNG = +X (cửa ban công, gương), NAM (cửa phòng, két góc tây–nam), TÂY (giường). envArg: cuaPhong, cuaSo, ketMo, ketY, guongRy.
import { PHONG_DIEM as D, phongPhanChieu, phongGuong } from '../../engine/envs/e3-phong.js';
import { KHUNG as KHUNG_SINH } from './khung.js';
import { gopKhung } from './khung-sua.js';
const KH = gopKhung(KHUNG_SINH);
export const PROPS_PHONG = {};
const RY = (B, id) => ((B - (KH[id]?.ngang ?? 0)) * Math.PI) / 180;
const C = (p, l, fov, p2, l2, fov2) => ({ p, l, fov, ...(p2 ? { p2 } : {}), ...(l2 ? { l2 } : {}), ...(fov2 ? { fov2 } : {}) });
const CAM0 = { p: [0.5, 5, 6.5], l: [0.5, 3.2, -4], fov: 50 };                       // dự phòng khi tắt bộ đặt máy (?khung=0)
const SACH = { at: D.ke_sach, ry: 0.25 }, DH = { at: D.ke_dong_ho, ry: 0 }, DH_TAM = [D.ke_dong_ho[0], D.ke_dong_ho[1] + 0.5, D.ke_dong_ho[2]];
const SACH_TAY = { at: [D.ke_mat[0] - 1.7, D.ke_mat[1], D.ke_mat[2] - 0.05], ry: 0.5 };   // sách ở đầu tây kệ (s040–s041: trong khung, bên phải)
const NHAN = { at: [D.ke_sach[0] - 0.6, D.ke_mat[1], D.ke_mat[2] + 0.2], ry: 0.5 };
const PR = (o = {}) => ({ dong_ho: null, day_chuyen: null, nhan_moi: null, cuon_sach: null, guong: null, ket_ga_om: null, day_chuyen_bac: null, nhan_bac: null, sach_reu: SACH, ...o });
const AN = { at: [0, -60, 40], anim: "idle" };                                        // nhân vật không có trong shot: cất xuống dưới sàn
const GA_NAM = D.giuong_nam, GA_KET = [-1.6, 0, 8.4], BAP_KET = [-3.35, 0, 6.9];   // Gà đứng phía đông Bắp, vai phải thẳng hàng đầu Bắp (s102–s103: xoa đầu)
const BAP_CHAN = [D.giuong_chan[0] + 1.2, D.giuong_chan[1] + 0.35, 0.3], BAP_GOC = [-3.5, D.giuong_chan[1], -0.2];   // Bắp nằm cạnh chân Gà · Bắp ngồi góc chân giường
const BAP_NAM = { at: BAP_GOC, ry: 0.3, anim: "sit", face: "binh_thuong" };          // Bắp "ngủ" ngồi ở góc chân giường (ngoài gò chăn)
const KE_TAY = D.ke_mat[0] - 3.0, KE_Z = D.ke_mat[2] + 0.95;                                                    // sát hông TÂY của kệ (Bắp leo lên từ đây)
const QUA_GUONG = (P, lech = 0, ry) => { const q = phongPhanChieu(P, ry), t = phongGuong(ry).t; return [q[0] + t[0] * lech, q[1], q[2] + t[2] * lech]; };   // điểm nhìn qua gương, lệch ngang `lech` stud để lộ mép khung gương
const NAM = { chanPhu: 1 };                                                           // Gà nằm trong chăn
const MAY_GOI = [-2.9, 4.2, -5.3];                                                    // máy "từ gối" cho shot nhìn gương: sát mép đông của gối, không vướng thân Gà
const GUONG_BAP = -2.288;                                                             // s026: xoay gương để từ gối thấy Bắp ở chân giường
// dây chuyền cầm ở tay phải (tay đưa ra trước góc th): gốc đạo cụ ở đáy mặt dây → treo thẳng đứng dưới bàn tay, lệch vào giữa hai tay
const DAY = (th) => ({ name: "day_chuyen_bac", at: [2.2, -0.4 - 0.95 * Math.cos(th) - 1.45, (-0.95 * Math.sin(th)) / 0.6], rot: [th, 0, 0] });
const EXP = { lightOverride: { exposure: 1.8 } };
const DEM = { time: "dem", lightOverride: { exposure: 1.6 } };
const SANG2 = { lightOverride: { exposure: 1.6 } };                                 // máy sát sàn trước két sẫm: nâng sáng
export const SHOTS_PHONG = [
  // s001 · set:bedroom · đêm · 0.00–1.49 s · mặt: —
  { id: "s001", dur: 1.485, env: "e3-phong", at: "e3-phong_in", ...DEM, lightOverride: { exposure: 2.3 }, cam: CAM0, props: PR(), cast: { hero: AN }, line: 1 },
  // s002 · set:bedroom · đêm · 1.49–2.85 s · mặt: —
  { id: "s002", dur: 1.369, env: "e3-phong", at: "e3-phong_in", cam: CAM0, props: PR({ sach_reu: { at: [D.ke_mat[0] - 1.3, 1.95, D.ke_mat[2] + 0.2], rz: 1.5708, ry: 0.3 } }), cast: { hero: AN }, line: 1 },
  // s004 · set:bakery · ngày · 4.22–5.26 s · mặt: banh=boi_roi
  { id: "s004", dur: 1.04, env: "e3-tiem", at: "e3-tiem_in", cam: C([3.2, 5.6, 0.0], [1.5, 4.5, -7.8], 34, [3.0, 5.4, -1.2]), props: PR(), cast: { banh: { at: [1.4, 0, -7.9], ry: 0, anim: "idle", face: "boi_roi", pose: { torso: { x: 0.12 }, head: { x: 0.3 }, leftArm: { x: -1.25 } } } }, line: 2 },
  // s005 · set:bakery · ngày · 5.26–6.30 s · mặt: banh=boi_roi
  { id: "s005", dur: 1.039, env: "e3-tiem", at: "e3-tiem_in", cam: C([4.8, 1.0, 3.0], [4.6, 1.7, -5.5], 46, [4.8, 1.0, 2.0]), props: PR(), cast: { banh: { at: [1.4, 0, -7.9], ry: 0, anim: "idle", face: "boi_roi", pose: { torso: { x: 0.12 }, head: { x: 0.3 }, leftArm: { x: -1.25 } } } }, line: 2 },
  // s006 · set:tailor · ngày · 6.30–7.29 s · mặt: may=boi_roi
  { id: "s006", dur: 0.988, env: "e3-tiem", at: "e3-tiem_in", cam: C([106.5, 4.6, -1.5], [102.8, 3.9, -8.5], 36, [105.6, 4.6, -2.0]), props: PR({ hop_nhan: { at: [104.5, 2.8, -7], ry: 0 } }), cast: { may: { at: [102.8, 0, -9.4], ry: 0, anim: "idle", face: "boi_roi", pose: { torso: { x: 0.15 }, leftArm: { x: -1.4, z: -0.3 } } } }, line: 3 },
  // s007 · set:tailor · ngày · 7.29–8.28 s · mặt: —
  { id: "s007", dur: 0.988, env: "e3-tiem", at: "e3-tiem_in", cam: C([104.1, 9.0, -6.4], [104.1, 3.0, -7.2], 14, [104.1, 8.0, -6.6]), props: PR({ hop_nhan: { at: [104.5, 2.8, -7], ry: 0 } }), cast: {}, line: 3 },
  // s016 · set:bedroom · ngày · 21.54–23.02 s · mặt: hero=boi_roi
  { id: "s016", dur: 1.477, env: "e3-phong", at: "e3-phong_in", cam: CAM0, props: PR(), cast: { hero: { at: [0.3, 0, -3.5], to: [1.1, 0, -4.4], ry: RY(-33, "s016"), anim: "walk", face: "boi_roi" } }, line: 9 },
  // s017 · set:bedroom · ngày · 23.02–24.50 s · mặt: hero=boi_roi
  { id: "s017", dur: 1.478, env: "e3-phong", at: "e3-phong_in", cam: CAM0, props: PR({ sach_reu: { at: [D.ke_mat[0] - 2.1, D.ke_mat[1], D.ke_mat[2] - 0.3], ry: 0.3 } }), cast: { hero: { at: [D.ke_vet_day[0] - 1.5, 0, -6.3], ry: 3.1416, anim: "idle", face: "boi_roi", pose: { torso: { x: 0.15 }, rightArm: { x: [-0.6, -1.05] } } } }, line: 9 },
  // s018 · set:bedroom · ngày · 24.50–25.91 s · mặt: hero=buon_rung_rung
  { id: "s018", dur: 1.412, env: "e3-phong", at: "e3-phong_in", lightOverride: { exposure: 0.92 }, cam: CAM0, props: PR(), cast: { hero: { at: [1.0, 0, -5.6], ry: RY(60, "s018"), anim: "idle", face: "buon_rung_rung", pose: { head: { x: 0.25 }, rightArm: { x: -1.2, z: 0.3 }, leftArm: { x: -1.2, z: -0.3 } } } }, line: 10 },
  // s019 · set:bedroom · ngày · 25.91–28.00 s · mặt: hero=quyet_tam
  { id: "s019", dur: 2.09, env: "e3-phong", at: "e3-phong_in", lightOverride: { exposure: 0.92 }, cam: CAM0, props: PR(), cast: { hero: { at: [1.6, 0, -5.9], ry: RY(10, "s019"), anim: "idle", face: "quyet_tam" } }, line: 11 },
  // s020 · set:bedroom · ngày · 28.00–29.34 s · mặt: hero=quyet_tam
  { id: "s020", dur: 1.34, env: "e3-phong", at: "e3-phong_in", ...DEM, envArg: { cuaPhong: 1 }, cam: CAM0, props: PR(), cast: { hero: { at: [0.9, 0, -0.6], to: [1.5, 0, -1.3], ry: RY(-12, "s020"), anim: "walk", face: "quyet_tam", hold: "dong_ho" } }, line: 12 },
  // s021 · set:bedroom · ngày · 29.34–30.68 s · mặt: hero=quyet_tam
  { id: "s021", dur: 1.341, env: "e3-phong", at: "e3-phong_in", ...DEM, cam: CAM0, props: PR({ dong_ho: DH }), cast: { hero: { at: [D.ke_dong_ho[0] - 1.75, 0, -6.55], ry: 2.3, anim: "idle", face: "quyet_tam", pose: { torso: { x: 0.12 }, rightArm: { x: -1.1 }, leftArm: { x: -0.9 } } } }, line: 12 },
  // s022 · set:bedroom · đêm · 30.68–32.08 s · mặt: hero=buon_ngu, bap=binh_thuong
  { id: "s022", dur: 1.401, env: "e3-phong", at: "e3-phong_in", ...DEM, envArg: NAM, cam: CAM0, props: PR({ dong_ho: DH }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "buon_ngu", pose: { head: { y: 0.6 } } }, bap: BAP_NAM }, line: 12 },
  // s023 · set:bedroom · đêm · 32.08–33.66 s · mặt: hero=nghi_ngo
  { id: "s023", dur: 1.583, env: "e3-phong", at: "e3-phong_in", ...DEM, envArg: { ...NAM, guongSang: 2.2 }, cam: { p: [-4.7, 4.55, -7.45], l: phongPhanChieu(DH_TAM), fov: 40, fov2: 37 }, props: PR({ dong_ho: DH }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "nghi_ngo" }, bap: BAP_NAM }, line: 13 },
  // s024 · set:bedroom · đêm · 33.66–35.30 s · mặt: —
  { id: "s024", dur: 1.632, env: "e3-phong", at: "e3-phong_in", ...DEM, lightOverride: { exposure: 2.0 }, envArg: { ...NAM, guongSang: 2.4 }, cam: { p: MAY_GOI, l: QUA_GUONG(DH_TAM, 1.1), fov: 16 }, props: PR({ dong_ho: DH }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "nghi_ngo" }, bap: BAP_NAM }, line: 13 },
  // s025 · set:bedroom · đêm · 35.30–37.36 s · mặt: hero=buon_ngu
  { id: "s025", dur: 2.062, env: "e3-phong", at: "e3-phong_in", ...DEM, lightOverride: { exposure: 1.25 }, envArg: NAM, cam: CAM0, props: PR({ dong_ho: DH }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "buon_ngu", pose: { head: { y: 0.5 } } }, bap: BAP_NAM }, line: 14 },
  // s026 · set:bedroom · đêm · 37.36–38.91 s · mặt: bap=o_tho
  { id: "s026", dur: 1.548, env: "e3-phong", at: "e3-phong_in", ...DEM, lightOverride: { exposure: 2.3 }, envArg: { ...NAM, guongRy: GUONG_BAP, guongSang: 2.4 }, cam: { p: MAY_GOI, l: QUA_GUONG([BAP_GOC[0], BAP_GOC[1] + 1.3, BAP_GOC[2]], 0.9, GUONG_BAP), fov: 16, fov2: 15.2 }, props: PR({ dong_ho: DH }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "buon_ngu" }, bap: { at: BAP_GOC, ry: 0.95, anim: "sit", face: "o_tho" } }, line: 14 },
  // s027 · set:bedroom · đêm · 38.91–39.59 s · mặt: bap=nghi_ngo
  { id: "s027", dur: 0.681, env: "e3-phong", at: "e3-phong_in", ...DEM, envArg: NAM, cam: CAM0, props: PR({ dong_ho: DH }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "buon_ngu" }, bap: { at: BAP_GOC, ry: RY(25, "s027"), anim: "sit", face: "nghi_ngo" } }, line: 15 },
  // s028 · set:bedroom · đêm · 39.59–41.88 s · mặt: hero=buon_ngu, bap=o_tho
  { id: "s028", dur: 2.295, env: "e3-phong", at: "e3-phong_in", ...DEM, envArg: NAM, cam: CAM0, props: PR({ dong_ho: DH }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "buon_ngu" }, bap: { at: BAP_GOC, ry: RY(8, "s028"), anim: "sit", face: "o_tho" } }, line: 16 },
  // s029 · set:bedroom · đêm · 41.88–43.34 s · mặt: bap=quyet_tam
  { id: "s029", dur: 1.461, env: "e3-phong", at: "e3-phong_in", ...DEM, lightOverride: { exposure: 2.3 }, envArg: NAM, cam: CAM0, props: PR({ dong_ho: DH }), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "buon_ngu" }, bap: { at: [KE_TAY, 0.3, KE_Z], to: [KE_TAY, 1.2, KE_Z], ry: 1.5708, anim: "climb", face: "quyet_tam" } }, line: 17 },
  // s030 · set:bedroom · đêm · 43.34–44.80 s · mặt: bap=nghi_ngo
  { id: "s030", dur: 1.461, env: "e3-phong", at: "e3-phong_in", ...DEM, envArg: NAM, cam: CAM0, props: PR(), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "buon_ngu" }, bap: { at: [D.ke_dong_ho[0] - 0.4, D.ke_mat[1], D.ke_mat[2] + 0.1], ry: RY(10, "s030"), anim: "hug", face: "nghi_ngo", hold: "dong_ho" } }, line: 17 },
  // s031 · set:bedroom · đêm · 44.80–46.44 s · mặt: bap=cuoi_dac_y
  { id: "s031", dur: 1.632, env: "e3-phong", at: "e3-phong_in", ...DEM, envArg: NAM, cam: CAM0, props: PR(), cast: { hero: { at: GA_NAM, lie: true, anim: "lie", face: "buon_ngu" }, bap: { at: [D.ke_sach[0] - 1.0, D.ke_mat[1], D.ke_mat[2] + 0.1], ry: RY(35, "s031"), anim: "hug", face: "cuoi_dac_y", hold: "dong_ho" } }, line: 17 },
  // s032 · set:bedroom · đêm · 46.44–47.32 s · mặt: hero=soc_ha_hoc
  { id: "s032", dur: 0.879, env: "e3-phong", at: "e3-phong_in", ...DEM, cam: CAM0, props: PR(), cast: { hero: { at: D.giuong_ngoi, ry: RY(0, "s032"), anim: "sitUp", face: "soc_ha_hoc" }, bap: AN }, line: 18 },
  // s033 · set:bedroom · đêm · 47.32–48.88 s · mặt: hero=soc_ha_hoc
  { id: "s033", dur: 1.569, env: "e3-phong", at: "e3-phong_in", ...DEM, cam: CAM0, props: PR(), cast: { hero: { at: D.giuong_ngoi, ry: 2.08, anim: "sit", face: "soc_ha_hoc" }, bap: AN }, line: 19 },
  // s034 · set:bedroom · đêm · 48.88–50.34 s · mặt: hero=quyet_tam
  { id: "s034", dur: 1.46, env: "e3-phong", at: "e3-phong_in", ...DEM, envArg: { cuaSo: [0.15, 0.9] }, cam: CAM0, props: PR(), cast: { hero: { at: [-2.4, 0, -7.6], ry: 3.1416, anim: "lookAround", face: "quyet_tam" }, bap: AN }, line: 20 },
  // s035 · set:bedroom · đêm · 50.34–51.81 s · mặt: hero=ngo_ngac
  { id: "s035", dur: 1.462, env: "e3-phong", at: "e3-phong_in", ...DEM, envArg: { cuaSo: 0.9 }, cam: CAM0, props: PR(), cast: { hero: { at: [-2.9, 0, -8.25], ry: 3.1416, anim: "idle", face: "ngo_ngac", pose: { torso: { x: 0.2 }, head: { y: -0.5 }, rightArm: { x: -0.9 }, leftArm: { x: -0.9 } } }, bap: AN }, line: 20 },
  // s037 · set:bedroom · đêm · 53.00–54.33 s · mặt: hero=quyet_tam
  { id: "s037", dur: 1.328, env: "e3-phong", at: "e3-phong_in", ...DEM, cam: CAM0, props: PR({ nhan_bac: NHAN }), cast: { hero: { at: [NHAN.at[0] - 1.5, 0, -6.3], ry: 3.1416, anim: "idle", face: "quyet_tam", pose: { torso: { x: 0.15 }, rightArm: { x: [-1.05, -0.7] } } }, bap: AN }, line: 21 },
  // s038 · set:bedroom · đêm · 54.33–55.69 s · mặt: hero=nghi_ngo
  { id: "s038", dur: 1.365, env: "e3-phong", at: "e3-phong_in", ...DEM, cam: CAM0, props: PR({ nhan_bac: NHAN }), cast: { hero: { at: [4.6, 0, -5.6], to: [5.4, 0, -5.9], ry: RY(-100, "s038"), anim: "walk", face: "nghi_ngo", pose: { head: { y: 0.7 } } }, bap: AN }, line: 21 },
  // s040 · set:bedroom · đêm · 58.19–59.06 s · mặt: bap=quyet_tam
  { id: "s040", dur: 0.873, env: "e3-phong", at: "e3-phong_in", ...DEM, cam: CAM0, props: PR({ sach_reu: SACH_TAY, nhan_bac: { at: [KE_TAY + 1.0, D.ke_mat[1], KE_Z - 0.55], ry: 0.6 } }), cast: { hero: AN, bap: { at: [KE_TAY, 1.9, KE_Z], ry: 1.5708, anim: "hold", face: "quyet_tam" } }, line: 23 },
  // s041 · set:bedroom · đêm · 59.06–59.93 s · mặt: —
  { id: "s041", dur: 0.874, env: "e3-phong", at: "e3-phong_in", ...DEM, cam: CAM0, props: PR({ sach_reu: SACH_TAY }), cast: { hero: AN, bap: AN }, line: 23 },
  // s095 · set:bedroom · ngày · 131.00–132.12 s · mặt: hero=tho_phao
  { id: "s095", dur: 1.117, env: "e3-phong", at: "e3-phong_in", cam: CAM0, props: PR(), cast: { hero: { at: [-4.6, 0, 3.6], ry: 0, anim: "idle", face: "tho_phao", hold: DAY(1.25), pose: { head: { x: 0.3 }, rightArm: { x: -1.25, z: 0.3 }, leftArm: { x: -1.25, z: -0.3 } } }, bap: AN }, line: 56 },
  // s096 · set:bedroom · ngày · 132.12–133.01 s · mặt: hero=tho_phao
  { id: "s096", dur: 0.893, env: "e3-phong", at: "e3-phong_in", cam: CAM0, props: PR(), cast: { hero: { at: [-4.3, 0, 3.4], ry: RY(160, "s096"), anim: "idle", face: "tho_phao", hold: DAY(1.45), pose: { head: { x: 0.25 }, rightArm: { x: -1.45, z: 0.45 }, leftArm: { x: -1.45, z: -0.45 } } }, bap: AN }, line: 56 },
  // s097 · set:bedroom · ngày · 133.01–134.12 s · mặt: hero=tho_phao
  { id: "s097", dur: 1.109, env: "e3-phong", at: "e3-phong_in", lightOverride: { exposure: 1.7 }, envArg: { ketMo: 1 }, cam: CAM0, props: PR({ day_chuyen_bac: { at: [D.ket_trong[0] + 0.1, 1.4, D.ket_trong[2] - 0.45], to: [D.ket_trong[0] + 0.1, 0.95, D.ket_trong[2] - 0.45], ry: 3.1416 } }), cast: { hero: { at: [-3.3, 0, 5.0], ry: -2.2, anim: "idle", face: "tho_phao", pose: { torso: { x: 0.2 }, rightArm: { x: -0.9 } } }, bap: AN }, line: 57 },
  // s098 · set:bedroom · ngày · 134.12–135.02 s · mặt: hero=binh_thuong, bap=cuoi_dac_y
  { id: "s098", dur: 0.897, env: "e3-phong", at: "e3-phong_in", ...SANG2, cam: CAM0, props: PR(), cast: { hero: AN, bap: { at: [-2.8, 0, 3.4], to: [-3.6, 0, 4.8], ry: RY(150, "s098"), anim: "walk", face: "cuoi_dac_y" } }, line: 58 },
  // s099 · set:bedroom · ngày · 135.02–136.05 s · mặt: bap=quyet_tam, hero=ngo_ngac
  { id: "s099", dur: 1.031, env: "e3-phong", at: "e3-phong_in", ...SANG2, envArg: { ketY: [0.05, 0.55] }, cam: CAM0, props: PR(), cast: { bap: { at: BAP_KET, ry: RY(150, "s099"), anim: "hug", face: "quyet_tam" }, hero: { at: [-5.4, 0, 4.6], ry: 0.84, anim: "idle", face: "ngo_ngac" } }, line: 58 },
  // s100 · set:bedroom · ngày · 136.05–136.50 s · mặt: hero=o_tho
  { id: "s100", dur: 0.448, env: "e3-phong", at: "e3-phong_in", envArg: { ketY: 0.55 }, cam: CAM0, props: PR(), cast: { hero: { at: [-5.4, 0, 4.6], ry: RY(-150, "s100"), anim: "idle", face: "o_tho" }, bap: { at: BAP_KET, ry: RY(150, "s099"), anim: "hug", face: "quyet_tam" } }, line: 59 },
  // s101 · set:bedroom · ngày · 136.50–137.32 s · mặt: bap=boi_roi
  { id: "s101", dur: 0.824, env: "e3-phong", at: "e3-phong_in", ...SANG2, envArg: { ketY: [0.55, 0] }, cam: CAM0, props: PR(), cast: { bap: { at: BAP_KET, ry: RY(150, "s101"), anim: "idle", face: "boi_roi" }, hero: { at: [3, 0, 8], ry: 0, anim: "idle", face: "o_tho" } }, line: 60 },
  // s102 · set:bedroom · ngày · 137.32–138.22 s · mặt: hero=nhin_cuoi, bap=boi_roi
  { id: "s102", dur: 0.896, env: "e3-phong", at: "e3-phong_in", ...SANG2, cam: CAM0, props: PR(), cast: { hero: { at: GA_KET, ry: -1.5708, anim: "idle", face: "nhin_cuoi", pose: { head: { x: 0.35 } } }, bap: { at: BAP_KET, ry: RY(150, "s102"), anim: "idle", face: "boi_roi" } }, line: 61 },
  // s103 · set:bedroom · ngày · 138.22–138.93 s · mặt: hero=nhin_cuoi, bap=soc_ha_hoc
  { id: "s103", dur: 0.709, env: "e3-phong", at: "e3-phong_in", ...SANG2, cam: CAM0, props: PR(), cast: { hero: { at: GA_KET, ry: -1.5708, anim: "idle", face: "nhin_cuoi", pose: { head: { x: 0.35 }, rightArm: { x: [-0.3, -0.78] } } }, bap: { at: BAP_KET, ry: RY(150, "s103"), anim: "idle", face: "soc_ha_hoc" } }, line: 61 },
  // s104 · set:black · ngày · 138.93–140.00 s · mặt: —
  { id: "s104", dur: 1.075, env: "e3-phong", time: "dem", lightOverride: { exposure: 0 }, cam: { p: [0, -400, 0], l: [0, -500, 0], fov: 20 } },   // CẮT ĐEN: máy chúc xuống dưới sàn rất xa + phơi sáng 0
];
