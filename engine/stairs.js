// stairs.js — Cầu thang hiên của nhà biết đi: luôn dài tới chạm đất dù nhà đang ở mức lift nào (góp ý #19).
//   const st = createStairs(THREE, { shell, trim, porchMat, z0, ground }); st.update(bodyY);
// bodyY = độ cao thân nhà (sàn hiên) so với đất; hàm thuần của pose → tất định theo t.
// Số bậc tăng theo độ cao (tối đa MAXN, bậc cao dần khi nhà đứng rất cao). Tắt: globalThis.__autoFx.houseStairs = false → hiện cầu thang cũ 4 bậc.
export function createStairs(THREE, { shell, trim, porchMat, z0, width = 7 }) {
  const MAXN = 16, RISE = 0.78, RUN = 1.2;
  const old = shell.children.filter((o) => /^(stair|stair_nose|stair_rail)$/.test(o.name));
  const grp = new THREE.Group(); grp.name = 'stairs_ground'; shell.add(grp);
  const mk = (mat, name) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat); m.name = name; m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
  const treads = [], noses = [];
  for (let i = 0; i < MAXN; i++) { treads.push(mk(porchMat, 'stair')); noses.push(mk(trim, 'stair_nose')); }
  const strings = [-1, 1].map(() => mk(porchMat, 'stair_stringer'));
  const rails = [-1, 1].map(() => mk(trim, 'stair_rail'));
  const posts = [-1, 1].map(() => mk(trim, 'stair_post'));
  let last = -1;
  function update(y) {
    const on = globalThis.__autoFx?.houseStairs !== false;
    grp.visible = on; for (const o of old) o.visible = !on;
    if (!on || Math.abs(y - last) < 1e-4) return;
    last = y;
    const drop = Math.max(0.5, y);                              // đất nằm ở y cục bộ = -drop
    const N = Math.min(MAXN, Math.max(2, Math.ceil(drop / RISE)));
    const rise = drop / N;
    treads.forEach((m, i) => {
      const on2 = i < N - 1; m.visible = noses[i].visible = on2; if (!on2) return;
      const top = -(i + 1) * rise, zc = z0 + RUN * (i + 0.5);
      m.scale.set(width, 0.6, RUN); m.position.set(0, top - 0.3, zc);
      noses[i].scale.set(width, 0.3, 0.3); noses[i].position.set(0, top - 0.05, zc + RUN / 2 - 0.1);
    });
    const runTot = N * RUN, len = Math.hypot(runTot, drop), ang = Math.atan2(drop, runTot);
    strings.forEach((m, k) => {                                  // dầm xiên 2 bên đỡ bậc, hạ tới đất
      m.scale.set(0.5, 1.3, len); m.rotation.x = ang; m.position.set((k ? 1 : -1) * (width / 2 + 0.05), -drop / 2 - 0.55, z0 + runTot / 2 - 0.2);
    });
    rails.forEach((m, k) => {
      const x = (k ? 1 : -1) * (width / 2 + 0.2), h = 2.4;
      m.scale.set(0.35, 0.35, len); m.rotation.x = ang; m.position.set(x, h - drop / 2, z0 + runTot / 2 - 0.2);
      const p = posts[k]; p.scale.set(0.3, h + 0.4, 0.3); p.position.set(x, -drop + p.scale.y / 2, z0 + runTot - 0.4);   // trụ chân thang chạm đất
    });
  }
  return { update, group: grp };
}
