// Kiểm tư thế mô hình: GLB có animation/skin thì entry manifest phải có `pose`;
// tên trong `anim` phải có trong file. Dùng bởi tools/doctor.mjs (khối 10) và tools/manifest-pose.mjs.
import fs from 'node:fs';
import path from 'node:path';

// Đọc chunk JSON của GLB bằng fs (không cần three.js). Trả null nếu thiếu file / không phải GLB.
export function docGlbFs(root) {
  return (src) => {
    try {
      const b = fs.readFileSync(path.resolve(root, src));
      if (b.length < 20 || b.toString('latin1', 0, 4) !== 'glTF') return null;
      const len = b.readUInt32LE(12);
      const json = JSON.parse(b.toString('utf8', 20, 20 + len));
      const anims = (json.animations || []).map((a, i) => a.name || `animation_${i}`);
      return { anims, coSkin: (json.skins || []).length > 0 };
    } catch { return null; }
  };
}

export function kiemPose(manifest, docGlb) {
  const bad = [], warn = [];
  let thieu = 0;
  for (const e of manifest) {
    if (!e.src) continue;
    const g = docGlb(e.src);
    if (!g) { thieu++; continue; }
    if ((g.anims.length || g.coSkin) && !e.pose) {
      bad.push(`${e.id}: GLB có ${g.anims.length} animation${g.coSkin ? ' + skeleton' : ''} mà manifest thiếu "pose" (node tools/manifest-pose.mjs --only ${e.id})`);
    }
    for (const n of e.anim || []) {
      if (!g.anims.includes(n)) warn.push(`${e.id}: anim "${n}" không có trong ${e.src} (có: ${g.anims.join(', ') || 'không'})`);
    }
  }
  return { bad, warn, thieu };
}
