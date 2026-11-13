// cast.js — Dựng diễn viên R15 từ cấu hình tập (episode.actors), dùng chung cho mọi tập theo mẫu _template.
//   Cờ diễn viên: ga:1 → Gà (ga-rig.js), bear:1 → gấu bông (bear.js, bow:'#2e86de', fur), còn lại R15. beard:true → màu hairColor.
//   actors: { hero: { shirt:'#e74c3c', face:'smile', hat:'beanie' }, mom: { shirt:'#8e44ad', hair:'braids' }, crowd: { count: 12 } }
// Mỗi khoá (trừ crowd) = tuỳ chọn createR15 (engine/r15.js: skin, shirt, pants, hat, hatColor, hair, skirt, scarf…).
// crowd.count → dân thị trấn crowd1…crowdN, màu áo/quần/mũ chọn theo seed (tất định).
import { createR15, loadR15Body, loadCharacterTextures, loadGaFaces, loadEmoteFaces, FACE_PRESETS, GA_FACES, GA_FACE_MAP } from './r15.js';
// Gà (engine/ga-rig.js) nạp ĐỘNG khi có diễn viên ga:1 — tập không dùng Gà không phụ thuộc file này
import { createBear } from './bear.js';
import { createBearGlb, bearGlbPreload, bearGlbOn, bearGlbWanted } from './bear-glb.js';   // gấu GLB có xương (bật: EPISODE.bearGlb / ?bearGlb=1; tắt → gấu khối)
import './anim-them.js';   // đăng ký animation bổ sung (sitUp, climb, drag, vanish, peek, putDown, ringBell, sleepy) vào bảng R15 dùng chung cho R15 + Gà
import { rng } from './stage.js';

const SHIRTS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ecf0f1', '#34495e', '#ff7eb6'];
const PANTS = ['#2c3e50', '#3f6fb5', '#5d4037', '#7f8c8d', '#1b1b1b', '#556b2f'];
const SKINS = ['#f3d27a', '#f0c89a', '#d9a066', '#a8714a', '#f5deb3'];
const HATS = ['none', 'none', 'none', 'cap', 'beanie'];
const HAIR = ['none', 'none', 'braids'];

export function crowdLook(i, seed = 1) {
  const r = rng(seed * 1009 + i * 97 + 1), p = (a) => a[Math.floor(r() * a.length)];
  return { skin: p(SKINS), shirt: p(SHIRTS), pants: p(PANTS), hat: p(HATS), hatColor: p(SHIRTS), hair: p(HAIR), face: 'smile' };
}

// ---- Chuẩn hoá tuỳ chọn diễn viên (hàm THUẦN, test được trong node) ----
//   ga:1|true → Gà (engine/ga-rig.js createGa)   bear:1|true → gấu bông (engine/bear.js createBear)   còn lại → R15.
//   beard:true|'true'|'1' → màu râu = hairColor (hoặc xám); beard:false|'0'|'' → không râu. (r15.js dùng beard làm MÀU: true làm ném lỗi.)
const BOOL_T = new Set(['1', 'true', 'yes', 'on', 'co', 'có']), BOOL_F = new Set(['', '0', 'false', 'no', 'off', 'khong', 'không', 'none', 'null', 'undefined']);
export const toFlag = (v) => v === true || v === 1 || (typeof v === 'string' && BOOL_T.has(v.trim().toLowerCase()));
const isFalseish = (v) => v === undefined || v === null || v === false || v === 0 || (typeof v === 'string' && BOOL_F.has(v.trim().toLowerCase()));
export const BEARD_FALLBACK = '#9e9e9e';
export function normalizeActorOpts(o = {}) {
  const { ga, bear, r6, ...rest } = o || {};
  const kind = toFlag(r6) ? 'r6' : toFlag(ga) ? 'ga' : toFlag(bear) ? 'bear' : 'r15';   // r6:1 → thân R6 (engine/r6-rig.js, look:'<tên trong r6-looks.js>')
  if ('beard' in rest) {
    const b = rest.beard;
    if (isFalseish(b)) delete rest.beard;
    else if (toFlag(b)) rest.beard = typeof rest.hairColor === 'string' && rest.hairColor ? rest.hairColor : BEARD_FALLBACK;
    else if (typeof b !== 'string') rest.beard = BEARD_FALLBACK;
  }
  return { kind, opts: rest };
}
// tên biểu cảm lạ → tên gần nhất (R15 và Gà đều hiểu 14 tên chuẩn; tên khác ở đây). Tên không biết → để nguyên (R15 rơi về smile, Gà về binh_thuong, gấu bỏ qua), không ném.
export const FACE_ALIAS = {
  shocked: 'surprised', shock: 'surprised', amazed: 'surprised', cry: 'sad', crying: 'sad', tearful: 'sad', upset: 'sad', tired: 'sleepy', exhausted: 'sleepy', drowsy: 'sleepy',
  excited: 'happy', joy: 'happy', glad: 'happy', cheerful: 'happy', confused: 'worried', thinking: 'worried', anxious: 'worried', nervous: 'worried', embarrassed: 'shy', blush: 'shy',
  laughing: 'laugh', lol: 'laugh', smirk: 'grin', smug: 'grin', proud: 'grin', mad: 'angry', furious: 'angry', annoyed: 'angry', afraid: 'scared', fear: 'scared', terrified: 'scared',
  calm: 'neutral', flat: 'neutral', serious: 'neutral', touched: 'moved', grateful: 'moved', relieved: 'moved', asleep: 'sleep', sleeping: 'sleep', freezing: 'cold', smiling: 'smile',
};
export const mapFace = (name, known) => (!name || typeof name !== 'string' || name.includes('~') || (known && known(name)) ? name : FACE_ALIAS[name] ?? name);
function wrapFaces(a, known) {
  const sf = a.setFace?.bind(a), fa = a.faceAt?.bind(a);
  if (sf) a.setFace = (e) => sf(mapFace(e, known));
  if (fa) a.faceAt = (t, n, opt) => fa(t, mapFace(n, known), opt);
  return a;
}
const R15_KNOWN = (n) => !!FACE_PRESETS[n];
const GA_KNOWN = (n) => !!GA_FACE_MAP[n] || GA_FACES.some(([, k]) => k === n);

export async function buildCast(THREE, actors = {}, { seed = 1 } = {}) {
  const out = {};
  const plan = Object.entries(actors).filter(([n]) => n !== 'crowd').map(([name, o]) => ({ name, ...normalizeActorOpts(o) }));
  const nCrowd = actors.crowd?.count || 0;
  const needBody = nCrowd > 0 || plan.some((p) => p.kind === 'r15');
  const body = needBody ? await loadR15Body(THREE) : null;
  // Gà cần faceSet (37 mặt), atlas và mũ trùm GLB nạp xong TRƯỚC khi dựng (một lần cho cả tập)
  let gaRes = null;
  let createGa = null;
  if (plan.some((p) => p.kind === 'ga')) { const G = await import('./ga-rig.js'); createGa = G.createGa; const { loadGaAtlas, loadGaHood } = G; gaRes = { faceSet: await loadGaFaces(THREE), atlas: await loadGaAtlas(THREE), hood: await loadGaHood(THREE) }; }
  if (plan.some((p) => p.kind === 'bear') && bearGlbWanted()) await bearGlbPreload();
  // Thân R6 (r6:1): nạp ĐỘNG rig + thư viện ngoại hình + bộ 37 mặt emote (một lần cho cả tập)
  let r6Res = null;
  if (plan.some((p) => p.kind === 'r6')) { const [RG, LK] = await Promise.all([import('./r6-rig.js'), import('./r6-looks.js')]); r6Res = { create: RG.createR6Rig, looks: LK.R6_LOOKS, faceSet: await loadEmoteFaces(THREE) }; }
  let bearIdx = 0;
  const make = async (name, o, kind = 'r15') => {
    let a;
    if (kind === 'r6') a = wrapFaces(r6Res.create(THREE, { name, ...(r6Res.looks[o.look] || {}), ...o, faceSet: r6Res.faceSet }), () => true);
    else if (kind === 'ga') a = wrapFaces(createGa(THREE, { name, face: 'smile', ...o, ...gaRes }), GA_KNOWN);
    else if (kind === 'bear') { const bi = bearIdx++; a = wrapFaces((bearGlbOn() && createBearGlb(THREE, { name, glbIndex: bi, ...o })) || createBear(THREE, { name, ...o }), () => true); }
    else a = wrapFaces(createR15(THREE, { name, face: 'smile', ...o, body, textures: await loadCharacterTextures(THREE, name) }), R15_KNOWN);
    a._defaultFace = o.face || (kind === 'r6' && a.options.face) || 'smile';
    out[name] = a;
  };
  for (const p of plan) await make(p.name, p.opts, p.kind);
  for (let i = 1; i <= nCrowd; i++) await make(`crowd${i}`, crowdLook(i, seed));
  return out;
}
export const crowdNames = (actors = {}) => Array.from({ length: actors.crowd?.count || 0 }, (_, i) => `crowd${i + 1}`);

// --- Dân làng R15 phối đồ ngẫu nhiên theo seed (engine/townlife.js). Tất định: cùng (i, seed) → cùng người. ---
const V_SKINS = ['#f5d0a9', '#e0ac69', '#c68642', '#f0c89a', '#8d5524', '#ffdbac', '#d9a066', '#a8714a'];
const V_SHIRTS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ecf0f1', '#34495e', '#ff7eb6', '#c0392b', '#2980b9', '#16a085', '#f39c12', '#7f8c8d', '#d35400'];
const V_PANTS = ['#2c3e50', '#3f6fb5', '#5d4037', '#7f8c8d', '#1b1b1b', '#556b2f', '#8e7b5a', '#34495e', '#6b3b2a'];
const V_HAIRC = ['#1b1b1b', '#2a1a10', '#4a2c17', '#6b4423', '#a9743a', '#d6b25e', '#8a8a8a', '#c0472a'];
const V_FACES = ['smile', 'happy', 'neutral', 'smile'];
export function villagerLook(i, seed = 1) {
  const r = rng(seed * 7919 + i * 131 + 17), p = (a) => a[Math.floor(r() * a.length)], q = r;
  const look = { name: `villager${i}`, skin: p(V_SKINS), shirt: p(V_SHIRTS), pants: p(V_PANTS), hairColor: p(V_HAIRC), face: p(V_FACES), blink: false };
  const hair = q(); look.hair = hair < 0.38 ? 'short' : hair < 0.62 ? 'braids' : 'none';
  const hat = q(); if (hat < 0.14) { look.hat = 'cap'; look.hatColor = p(V_SHIRTS); } else if (hat < 0.24) { look.hat = 'beanie'; look.hatColor = p(V_SHIRTS); } else if (hat < 0.28) { look.hat = 'tophat'; look.hatColor = '#2b2b2b'; }
  if (look.hat === 'cap' || look.hat === 'tophat') { if (look.hair === 'braids') look.hair = 'short'; }
  const kind = q();
  if (kind < 0.18) { look.skirt = p(V_PANTS); if (look.hair === 'none') look.hair = 'braids'; }
  else if (kind < 0.32) look.hoodie = true;
  else if (kind < 0.42) look.shirtPattern = 'stripes';
  if (q() < 0.22) look.scarf = p(V_SHIRTS);
  if (q() < 0.5 && !look.hoodie) look.sleeves = look.skin;   // áo ngắn tay (tay trần) hay dài tay xen kẽ
  if (q() < 0.18) { look.boots = true; look.shoes = '#3a2a1c'; }
  return look;
}
