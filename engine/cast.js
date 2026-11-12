// cast.js — Dựng diễn viên R15 từ cấu hình tập (episode.actors), dùng chung cho mọi tập theo mẫu _template.
//   actors: { hero: { shirt:'#e74c3c', face:'smile', hat:'beanie' }, mom: { shirt:'#8e44ad', hair:'braids' }, crowd: { count: 12 } }
// Mỗi khoá (trừ crowd) = tuỳ chọn createR15 (engine/r15.js: skin, shirt, pants, hat, hatColor, hair, skirt, scarf…).
// crowd.count → dân thị trấn crowd1…crowdN, màu áo/quần/mũ chọn theo seed (tất định).
import { createR15, loadR15Body, loadCharacterTextures } from './r15.js';
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

export async function buildCast(THREE, actors = {}, { seed = 1 } = {}) {
  const body = await loadR15Body(THREE);
  const out = {};
  const make = async (name, o) => {
    const textures = await loadCharacterTextures(THREE, name);
    const a = createR15(THREE, { name, face: 'smile', ...o, body, textures });
    a._defaultFace = o.face || 'smile';
    out[name] = a;
  };
  for (const [name, o] of Object.entries(actors)) { if (name !== 'crowd') await make(name, o || {}); }
  const n = actors.crowd?.count || 0;
  for (let i = 1; i <= n; i++) await make(`crowd${i}`, crowdLook(i, seed));
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
