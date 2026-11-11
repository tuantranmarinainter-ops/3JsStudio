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
