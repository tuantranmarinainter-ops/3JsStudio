// stairs.js — Cầu thang hiên của nhà biết đi, GẤP BẢN LỀ 2 đoạn (góp ý #19 + duyệt v10).
//   const st = createStairs(THREE, { shell, trim, porchMat, z0 }); st.update(bodyY);
// bodyY = độ cao sàn hiên so với đất; hàm thuần của pose → tất định theo t.
// - Nhà NGỒI (bodyY ≤ SIT_Y): cầu thang bung hết, dài vừa đúng tới đất (không thừa).
// - Nhà nâng lên: đoạn dưới gập ngược lên đoạn trên (bản lề trên tay vịn), rồi cả khối xoay xuống áp vào hiên.
// - Hạ xuống thì bung ra theo thứ tự ngược lại.
// Tắt: __autoFx.houseStairs = false → cầu thang cũ 4 bậc; __autoFx.stairsFold = false → kiểu cũ (luôn dài tới đất, không gấp).
export function createStairs(THREE, { shell, trim, porchMat, z0, width = 7 }) {
  const MAXN = 16, RISE = 0.78, RUN = 1.2;
  const SIT_Y = 6.6, FOLD_H = 3.0, HOFF = 2.9;                // ngồi: sàn ≤ 6.6 (lift ≤ 0.3); gấp xong khi cao thêm 3; bản lề nằm trên tay vịn
  const old = shell.children.filter((o) => /^(stair|stair_nose|stair_rail)$/.test(o.name));
  const grp = new THREE.Group(); grp.name = 'stairs_ground'; shell.add(grp);
  const hingeA = new THREE.Group(); hingeA.name = 'stairs_hingeA'; hingeA.position.set(0, 0, z0); grp.add(hingeA);
  const hingeB = new THREE.Group(); hingeB.name = 'stairs_hingeB'; hingeA.add(hingeB);
  const flightB = new THREE.Group(); flightB.name = 'stairs_flightB'; hingeB.add(flightB); flightB.position.y = -HOFF;
  const mk = (mat, name, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat); m.name = name; m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const treads = [], noses = [];
  for (let i = 0; i < MAXN; i++) { treads.push(mk(porchMat, 'stair', hingeA)); noses.push(mk(trim, 'stair_nose', hingeA)); }
  const side = (k) => (k ? 1 : -1);
  const strA = [0, 1].map(() => mk(porchMat, 'stair_stringer', hingeA)), strB = [0, 1].map(() => mk(porchMat, 'stair_stringer', flightB));
  const railA = [0, 1].map(() => mk(trim, 'stair_rail', hingeA)), railB = [0, 1].map(() => mk(trim, 'stair_rail', flightB));
  const posts = [0, 1].map(() => mk(trim, 'stair_post', flightB));
  const knuckleGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.7, 10);
  const knuckles = [0, 1].map((k) => { const m = new THREE.Mesh(knuckleGeo, trim); m.name = 'stair_hinge'; m.rotation.z = Math.PI / 2; m.position.x = side(k) * (width / 2 + 0.2); m.castShadow = true; hingeB.add(m); return m; });
  const sm = (v) => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
  let last = -1, lastKey = '';
  function update(y) {
    const on = globalThis.__autoFx?.houseStairs !== false, fold = globalThis.__autoFx?.stairsFold !== false;
    grp.visible = on; for (const o of old) o.visible = !on;
    const key = `${fold}`;
    if (!on || (Math.abs(y - last) < 1e-4 && key === lastKey)) return;
    last = y; lastKey = key;
    const drop = fold ? Math.min(SIT_Y, Math.max(0.5, y)) : Math.max(0.5, y);   // cầu thang dài theo độ cao lúc NGỒI
    const f = fold ? sm((y - SIT_Y) / FOLD_H) : 0;                             // 0 = bung, 1 = gấp hẳn
    const N = Math.min(MAXN, Math.max(2, Math.ceil(drop / RISE))), rise = drop / N;
    const runTot = N * RUN, len = Math.hypot(runTot, drop), ang = Math.atan2(drop, runTot);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const loc = (yy, zz) => [yy * ca + zz * sa, -yy * sa + zz * ca];           // toạ độ lúc bung (so với bản lề) → toạ độ dọc thân thang
    const kB = Math.ceil(N / 2), LA = len * kB / N, LB = len - LA;            // bản lề giữa nằm ở mép bậc kB
    const hbY = -kB * rise, hbZ = kB * RUN;
    hingeB.position.set(0, HOFF, LA);
    treads.forEach((m, i) => {
      const vis = i < N - 1; m.visible = noses[i].visible = vis; if (!vis) return;
      const inA = i < kB, par = inA ? hingeA : flightB, oy = inA ? 0 : hbY, oz = inA ? 0 : hbZ;
      if (m.parent !== par) { par.add(m); par.add(noses[i]); }
      const top = -(i + 1) * rise, zc = RUN * (i + 0.5);
      let [ly, lz] = loc(top - 0.3 - oy, zc - oz);
      m.scale.set(width, 0.6, RUN); m.position.set(0, ly, lz); m.rotation.x = -ang;
      [ly, lz] = loc(top - 0.05 - oy, zc + RUN / 2 - 0.1 - oz);
      noses[i].scale.set(width, 0.3, 0.3); noses[i].position.set(0, ly, lz); noses[i].rotation.x = -ang;
    });
    const beams = (str, rail, L) => {
      str.forEach((m, k) => { m.scale.set(0.5, 1.3, L + 0.2); m.position.set(side(k) * (width / 2 + 0.05), -0.65, L / 2); });
      rail.forEach((m, k) => { m.scale.set(0.35, 0.35, L); m.position.set(side(k) * (width / 2 + 0.2), 2.4 * ca, L / 2); });
    };
    beams(strA, railA, LA); beams(strB, railB, LB);
    posts.forEach((p, k) => {                                                   // trụ chân thang: đứng thẳng khi bung, chạm đất
      const h = 2.4 + 0.4; p.scale.set(0.3, h, 0.3);
      const [ly, lz] = loc(-drop + h / 2 - hbY, runTot - 0.4 - hbZ);
      p.position.set(side(k) * (width / 2 + 0.2), ly, lz); p.rotation.x = -ang;
    });
    knuckles.forEach((m) => { m.visible = fold; });
    // gấp: đoạn dưới gập lên trước (an toàn với đất), rồi cả khối xoay xuống áp vào hiên
    const eB = sm(f / 0.6), eA = sm((f - 0.35) / 0.65);
    hingeB.rotation.x = -(Math.PI - 0.05) * eB;
    hingeA.rotation.x = ang + (Math.PI / 2 - ang) * eA;
  }
  return { update, group: grp };
}
