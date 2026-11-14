// r6-roblox.js — DIỆN MẠO NPC Roblox trên thân R6 của engine (engine/r6-rig.js): màu thân + ảnh áo/quần (khuôn R6 cổ điển 585×559) dán lên khối thân/tay/chân,
// phụ kiện (tóc, mũ, kính — acc.glb, gốc = tâm đầu) gắn vào đầu. Mặt vẫn là bộ mặt của engine → mọi animation + biểu cảm R6 dùng nguyên.
// Dữ liệu: assets/characters/rb/<tên>/{look.json, shirt.png, pants.png, tshirt.png, acc.glb} do tools/npc-roblox.mjs dựng.
//   const res = await loadRbLooks(THREE, ['bach', 'mayor']);            // tải XONG trước window.__ready
//   const char = createR6Rig(THREE, { name, ...rbRigOptions(res.bach) }); applyRbLook(THREE, char, res.bach);
// Không có trạng thái theo thời gian: thuần dữ liệu tĩnh.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GOC = new URL('../assets/characters/rb/', import.meta.url).href;
export const RB_W = 585, RB_H = 559;
// Khuôn áo/quần R6: [x, y, w, h] trên ảnh 585×559. Mặt: F trước, B sau, L trái, R phải (theo NHÂN VẬT), U trên, D dưới.
export const RB_KHUON = {
  torso: { F: [231, 74, 128, 128], B: [427, 74, 128, 128], R: [165, 74, 64, 128], L: [361, 74, 64, 128], U: [231, 8, 128, 64], D: [231, 204, 128, 64] },
  right: { L: [19, 355, 64, 128], B: [85, 355, 64, 128], R: [151, 355, 64, 128], F: [217, 355, 64, 128], U: [217, 289, 64, 64], D: [217, 485, 64, 64] },
  left: { F: [308, 355, 64, 128], L: [374, 355, 64, 128], B: [440, 355, 64, 128], R: [506, 355, 64, 128], U: [308, 289, 64, 64], D: [308, 485, 64, 64] },
};
// thứ tự vật liệu BoxGeometry: +x, −x, +y, −y, +z, −z. Nhân vật nhìn +Z, bên TRÁI của nhân vật = +X.
export const RB_MAT_ORDER = ['L', 'R', 'U', 'D', 'F', 'B'];
const HEAD_R_ENGINE = 0.68;   // = HR trong engine/r6-rig.js
const HEAD_RB = 1.25;   // đường kính + chiều cao đầu R6 Roblox (stud)

const taiAnh = (url) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = url; });

/** Tải look.json + ảnh + acc.glb của các nhân vật. Trả { <tên>: { look, shirt, pants, tshirt (Image|null), acc (Object3D|null) } }. Thiếu file → null, không ném lỗi. */
export async function loadRbLooks(THREE, names, { base = GOC } = {}) {
  const loader = new GLTFLoader(), ra = {};
  await Promise.all([...new Set(names)].map(async (ten) => {
    let look = null; try { const r = await fetch(`${base}${ten}/look.json`); if (r.ok) look = await r.json(); } catch {}
    if (!look) { console.warn('[r6-roblox] thiếu look.json:', ten); return; }
    const [shirt, pants, tshirt, acc] = await Promise.all([
      look.shirt ? taiAnh(`${base}${ten}/shirt.png`) : null, look.pants ? taiAnh(`${base}${ten}/pants.png`) : null, look.tshirt ? taiAnh(`${base}${ten}/tshirt.png`) : null,
      look.acc ? loader.loadAsync(`${base}${ten}/acc.glb`).then((g) => g.scene, () => null) : null]);
    ra[ten] = { look, shirt, pants, tshirt, acc };
  }));
  return ra;
}

/** Tuỳ chọn cho createR6Rig: thân trơn theo màu Roblox, bỏ tóc/mũ/phụ kiện tự vẽ; look.them (scale, wide, hair…) ghi đè. */
export function rbRigOptions(res) {
  const m = res?.look?.mau || {};
  return { skin: m.head || '#f5cd30', shirt: m.torso || '#0d69ac', sleeves: m.leftArm, hands: m.leftArm, pants: m.leftLeg || '#a4bd47', shoes: m.leftLeg, sole: m.leftLeg,
    torso: null, arm: null, leg: null, hair: null, hat: null, acc: [], wide: 1, ...(res?.look?.them || {}) };
}

/** Vẽ một mặt: nền màu thân → quần → áo (→ áo phông ở ngực). Trả canvas. */
export function veMat(nen, lop, o, { px = 2, tshirt = null } = {}) {
  const [, , w, h] = o, cv = document.createElement('canvas'); cv.width = w * px; cv.height = h * px;
  const g = cv.getContext('2d'); g.fillStyle = nen; g.fillRect(0, 0, cv.width, cv.height); g.imageSmoothingQuality = 'high';
  for (const im of lop) if (im) { const kx = im.width / RB_W, ky = im.height / RB_H; g.drawImage(im, o[0] * kx, o[1] * ky, w * kx, h * ky, 0, 0, cv.width, cv.height); }
  if (tshirt) g.drawImage(tshirt, 0, 0, cv.width, cv.height);
  return cv;
}

/** Thay vật liệu thân/tay/chân của một thân R6 đã tạo bằng áo quần Roblox, đặt màu da, gắn phụ kiện vào đầu. Trả char. */
export function applyRbLook(THREE, char, res, { px = 2 } = {}) {
  if (!res?.look) return char;
  const m = res.look.mau, root = char.root;
  const mats = (khuon, nen, lop, kind, tshirt) => RB_MAT_ORDER.map((k) => {
    const tx = new THREE.CanvasTexture(veMat(nen, lop, khuon[k], { px, tshirt: k === 'F' ? tshirt : null })); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    const mt = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.82, metalness: 0 }); mt.userData.matDecl = kind; mt.userData.matNguon = 'khai-bao'; return mt; });
  const gan = (ten, ms) => { const mesh = root.getObjectByName(ten); if (mesh) mesh.material = ms; return ms; };
  const than = gan('torso_mesh', mats(RB_KHUON.torso, m.torso, [res.pants, res.shirt], 'fabric', res.tshirt));
  gan('RightArm_mesh', mats(RB_KHUON.right, m.rightArm, [res.shirt], res.shirt ? 'fabric' : 'skin'));
  gan('LeftArm_mesh', mats(RB_KHUON.left, m.leftArm, [res.shirt], res.shirt ? 'fabric' : 'skin'));
  const chan = gan('RightLeg_mesh', mats(RB_KHUON.right, m.rightLeg, [res.pants], res.pants ? 'fabric' : 'skin'));
  gan('LeftLeg_mesh', mats(RB_KHUON.left, m.leftLeg, [res.pants], res.pants ? 'fabric' : 'skin'));
  char.setColors({ skin: m.head });
  char.materials.shirt = than[4]; char.materials.pants = chan[4];
  if (res.acc) {
    const hd = char.khung?.dau, g = new THREE.Group(); g.name = 'rb_acc';
    // đầu Roblox: trụ bán kính 0,625 cao 1,25; đầu engine: bán kính 0,68 cao 1,3 → phụ kiện phải nở NGANG nhiều hơn dọc, dư 2% để đầu không đâm xuyên râu/tóc (lỗi 14/11: râu tóc trông như xoay lệch)
    const ky = (hd ? hd.cao : 1.3) / HEAD_RB * 1.02, kxz = HEAD_R_ENGINE / (HEAD_RB / 2) * 1.02;
    g.scale.set(kxz, ky, kxz); g.position.set(...(hd ? hd.tam : [0, 0.67, 0])); g.rotation.y = Math.PI;   // Roblox nhìn −Z → engine nhìn +Z
    const c = res.acc.clone(true);
    c.traverse((x) => { if (!x.isMesh) return; x.castShadow = true; x.receiveShadow = true; x.material = x.material.clone(); x.material.metalness = 0; x.material.roughness = 0.8;
      x.material.userData.matDecl = /hair|beard|toc|rau/i.test(x.name) ? 'hair' : 'plastic'; x.material.userData.matNguon = 'khai-bao'; });
    g.add(c); char.parts.head.add(g); char.rbAcc = g;
  }
  root.userData.rb = res.look.ten;
  return char;
}
