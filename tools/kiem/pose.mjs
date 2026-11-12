// Tư thế mô hình. `entry.pose` là MẢNG các tư thế mô hình hỗ trợ (suy từ từng clip), `entry.animTheoPose`
// ánh xạ tư thế -> clip. Dùng bởi tools/doctor.mjs (khối 10), tools/manifest-pose.mjs, tools/kb/chon-mo-hinh.mjs.
import fs from 'node:fs';
import path from 'node:path';

export const THU_TU_POSE = ['standing', 'sitting', 'flying', 'swimming'];
// Clip trang trí (đung đưa theo gió...): mô hình KHÔNG skin mà chỉ có clip loại này thì không gán pose.
export const CLIP_TRANG_TRI = { tu: ['tick'], chua: ['sway', 'wind'] };
const LUAT_CLIP = {
  flying: ['fly', 'flap', 'glide', 'soar'],
  swimming: ['swim', 'dive'],
  sitting: ['sit', 'perch'],
  standing: ['idle', 'walk', 'run', 'stand'],
};
const LUAT_TEN = {
  swimming: ['whale', 'dolphin', 'shark', 'fish', 'ray', 'orca'],
  flying: ['bird', 'gull', 'eagle'],
};

// Tách theo TỪ (ký tự không phải chữ-số, và ranh giới camelCase), thường hoá.
export const tuCua = (s) => String(s ?? '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
export const laTrangTri = (clip) => {
  const t = tuCua(clip), low = String(clip).toLowerCase();
  return t.some((w) => CLIP_TRANG_TRI.tu.includes(w)) || CLIP_TRANG_TRI.chua.some((k) => low.includes(k));
};

const MAGIC_JSON = 0x4E4F534A;
// { boQua } = không phải .glb; null = file không có; { loi } = có nhưng không đọc được; { anims, coSkin } = đọc được.
export function docGlbFs(root) {
  return (src) => {
    if (!/.glb$/i.test(src)) return { boQua: true }; // .gltf/.webp/...: không đọc
    const f = path.resolve(root, src);
    if (!fs.existsSync(f)) return null;
    try {
      const b = fs.readFileSync(f);
      if (b.length < 20 || b.toString('latin1', 0, 4) !== 'glTF') return { loi: 'không phải GLB' };
      if (b.readUInt32LE(16) !== MAGIC_JSON) return { loi: 'chunk đầu không phải JSON' };
      const json = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
      const anims = (json.animations || []).map((a, i) => a.name || `animation_${i}`);
      return { anims, coSkin: (json.skins || []).length > 0 };
    } catch (e) { return { loi: e.message }; }
  };
}

// Mô hình cần khai báo pose khi: có skin, hoặc có clip không trang trí.
export const canPose = (g) => g.coSkin || g.anims.some((c) => !laTrangTri(c));

// -> null (tĩnh) | { anim } (chỉ trang trí) | { pose: [...], anim, animTheoPose }
export function suyPose(entry, g) {
  if (!g || g.loi || g.boQua || (!g.anims.length && !g.coSkin)) return null;
  if (!canPose(g)) return { anim: g.anims };
  const theo = {};
  for (const p of THU_TU_POSE) {
    const khop = g.anims.filter((c) => tuCua(c).some((w) => LUAT_CLIP[p].includes(w)));
    if (!khop.length) continue;
    theo[p] = (p === 'standing' && khop.find((c) => tuCua(c).includes('idle'))) || khop[0];
  }
  if (!Object.keys(theo).length) {
    const w = tuCua(`${entry.id} ${entry.title ?? ''}`);
    const p = ['swimming', 'flying'].find((k) => LUAT_TEN[k].some((x) => w.includes(x))) || 'standing';
    if (g.anims.length) theo[p] = g.anims[0];
    return { pose: [p], anim: g.anims, ...(g.anims.length ? { animTheoPose: theo } : {}) };
  }
  return { pose: THU_TU_POSE.filter((p) => theo[p]), anim: g.anims, animTheoPose: theo };
}

export function kiemPose(manifest, docGlb) {
  const bad = [], warn = [];
  let thieu = 0, boQua = 0;
  for (const e of manifest) {
    if (!e.src) continue;
    const g = docGlb(e.src);
    if (!g) { thieu++; continue; }
    if (g.boQua) { boQua++; continue; }
    if (g.loi) { warn.push(`${e.id}: không đọc được ${e.src} (${g.loi})`); continue; }
    const coPose = Array.isArray(e.pose) ? e.pose.length > 0 : !!e.pose;
    if (canPose(g) && !coPose) {
      bad.push(`${e.id}: GLB có ${g.anims.length} animation${g.coSkin ? ' + skeleton' : ''} mà manifest thiếu "pose" (node tools/manifest-pose.mjs --only ${e.id})`);
    }
    for (const n of [...(e.anim || []), ...Object.values(e.animTheoPose || {})]) {
      if (!g.anims.includes(n)) warn.push(`${e.id}: anim "${n}" không có trong ${e.src} (có: ${g.anims.join(', ') || 'không'})`);
    }
  }
  return { bad, warn, thieu, boQua };
}
