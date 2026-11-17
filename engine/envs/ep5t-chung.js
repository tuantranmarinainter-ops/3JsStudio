// Bộ dựng CHUNG cho 8 bối cảnh tập test ep005t (ep5t-<id>.js chỉ khai dữ liệu rồi gọi build này). Dựng THEO DANH SÁCH MỐC
// (kich-ban/ep005t/boi-canh/<id>.json → engine/envs/ep5t-<id>.js do tools/ep5t-boi-canh.mjs sinh): mỗi mốc = một hộp phẳng đúng "vung" x/y/z, màu mau[0].
// BỐ CỤC TRƯỚC, shot/camera sau. Mốc có model đã chốt (`MODELS[mocId]`) thì thay hộp bằng model nhóm NHÀ (nhap/ep5t-* hoặc polyfork/*),
// co theo vùng của mốc; ?rb=0 trên URL (hoặc thiếu model) → về bản khối. Tất định (không Math.random, không giờ thực).
// Quy ước trục: gốc = tâm sàn bối cảnh, y=0 mặt đất, +X sang phải nhìn từ camera chính, +Z về phía camera chính.
export const LIGHT = 'day';

const lay = (vung) => {   // "x -8..8, y 0..12, z -6..-2" → { x:[a,b], y:[a,b], z:[a,b] }
  const o = {};
  for (const m of String(vung || '').matchAll(/([xyz])\s*(-?[\d.]+)\s*\.\.\s*(-?[\d.]+)/g)) o[m[1]] = [parseFloat(m[2]), parseFloat(m[3])];
  return o.x && o.y && o.z ? o : null;
};

export default function build(g, e, H, DATA) {
  const { THREE, ganTang, fit } = H;
  const RB = !/[?&]rb=0(&|$)/.test(globalThis.location?.search || '');
  e.skybox = null; e.skyboxNight = null;
  const R = e.room = new THREE.Group(); R.name = 'ep5t_' + DATA.id; g.add(R);
  const nhom = (ten, tang) => { const o = new THREE.Group(); o.name = ten; R.add(tang ? ganTang(o, tang) : o); return o; };
  const mid = nhom('ep5t_boi_canh', 'mid');
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
  const _bx = new THREE.Box3(), _sz = new THREE.Vector3();
  const khungDau = (m) => { m.userData.matKind = 'none'; m.userData.matNguon = 'khai-bao'; m.userData.grungeKind = 'none'; };

  // nền đất chung dưới mọi mốc (đủ rộng cho bối cảnh)
  const kt = DATA.kichThuoc || {};
  const nen = new THREE.Mesh(BOX, mat(DATA.mauNen || '#8a8470')); nen.name = 'ep5t_nen';
  nen.scale.set((kt.rong || 20) * 1.6, 0.2, (kt.sau || 20) * 1.6); nen.position.set(0, -0.35, 0); nen.receiveShadow = true; mid.add(nen);

  // đặt model vào vùng của mốc: chạm đáy y0, giữa x/z, co theo vùng (mốc mỏng thì giữ tỉ lệ theo cạnh lớn hơn)
  const datModel = (moc, md, v) => {
    if (!RB || !fit) return null;
    const dx = v.x[1] - v.x[0], dy = v.y[1] - v.y[0], dz = v.z[1] - v.z[0];
    const o = fit(md.id, dy); if (!o) return null;
    _bx.setFromObject(o); _bx.getSize(_sz);
    const q = Math.abs(Math.sin(md.ry || 0)) > 0.9;   // xoay ±90°: trục x/z của model đổi chỗ so với vùng
    const sx = (q ? dz : dx) / Math.max(1e-4, _sz.x), sz = (q ? dx : dz) / Math.max(1e-4, _sz.z);
    const mong = md.mong || Math.min(dz, dx) < 1;   // tấm mỏng (vách, cửa, bạt)   // mốc dạng tấm: giữ độ dày theo tỉ lệ model
    o.scale.set(sx, 1, mong ? Math.min(sx, 1) : sz);
    const grp = new THREE.Group(); grp.name = 'ep5t_rb_' + moc.id; grp.add(o);
    grp.position.set((v.x[0] + v.x[1]) / 2, v.y[0], (v.z[0] + v.z[1]) / 2); grp.rotation.y = md.ry || 0;
    o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; khungDau(m); } });
    mid.add(grp); return grp;
  };

  const da = new Set(), vatThay = {};
  for (const moc of DATA.moc) {
    if (moc.bat === false) continue;
    const v = lay(moc.vung); if (!v) continue;
    const md = (DATA.MODELS || {})[moc.id];
    if (md?.bo && RB && fit && fit(md.theo || md.id, 1)) continue;   // mốc đã gộp vào model của mốc khác
    if (md && datModel(moc, md, md.vung ? (lay(md.vung) || v) : v)) { vatThay[moc.id] = md.id; if (!md.giuKhoi) continue; }
    const m = new THREE.Mesh(BOX, mat((moc.mau || ['#bbbbbb'])[0])); m.name = 'ep5t_' + moc.id;
    m.scale.set(v.x[1] - v.x[0], Math.max(0.05, v.y[1] - v.y[0]), Math.max(0.05, v.z[1] - v.z[0]));
    m.position.set((v.x[0] + v.x[1]) / 2, (v.y[0] + v.y[1]) / 2, (v.z[0] + v.z[1]) / 2);
    m.castShadow = true; m.receiveShadow = true; mid.add(m); da.add(moc.id);
  }
  // mốc có model "gộp" (vùng riêng) mà mốc gốc của nó đã dựng khối thì thôi — tránh hộp trùm lên model
  e.mocDaDung = [...da]; e.vatThay = vatThay;
  e.diem = DATA.diem || {};
}
