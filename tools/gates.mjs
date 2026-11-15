// gates.mjs — CỔNG KIỂM TỰ ĐỘNG theo shot (chỉ cảnh báo, không chặn gộp / xuất, không tự sửa cảnh).
// Dùng qua look.mjs:  node tools/look.mjs episodes/ep003/index.html --shots all --gates [--gates-cfg tools/gates.json]
//
// Mỗi shot được đo ở 3 mốc (đầu +0,1 s / giữa / cuối −0,1 s) bằng probe() chạy TRONG trang (đọc window.__stage),
// rồi judge() chấm thuần bằng số → PASS/FAIL theo 4 cổng + dòng LOOK theo luật camera "dồn dập" (CLAUDE.md):
//   chan    chân lơ lửng / lún so với mặt sàn ngay dưới (bắn tia xuống cảnh, bỏ qua chính nhân vật)
//   dau     đầu nhân vật bị khung cắt (một phần đầu ra ngoài khung 9:16)
//   mat     mặt nhân vật chính lọt ra ngoài vùng an toàn của khung dọc (phụ đề dưới, nút trên)
//   xuyen   hai nhân vật xuyên vào nhau (hộp thân chồng lên nhau)
//   (tay cầm vật: engine chưa có khái niệm "vật đang cầm" trong shot → chưa kiểm, xem bao-cao)
// LOOK: "camera đứng yên", "1 người mà không zoom in", "≥2 người mà không zoom out", "mặt nhân vật chính bị che".
// Ngưỡng: tools/gates.json (ghi đè bằng --gates-cfg).

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export const DEFAULT_CFG = {
  chanLo: 0.15,        // stud: đáy chân cao hơn sàn quá mức này = lơ lửng
  chanLun: 0.15,       // stud: đáy chân thấp hơn sàn quá mức này = lún
  chanTiaCao: 1.2,     // stud: điểm bắn tia xuống, tính từ đáy chân (thấp hơn hông để không trúng bàn ghế phía trên)
  dauCat: 0.12,        // tỉ lệ diện tích đầu nằm ngoài khung (0–1) coi là bị cắt
  matAnToan: [0.06, 0.08, 0.06, 0.22],   // lề an toàn [trái, trên, phải, dưới] theo tỉ lệ khung; dưới chừa phụ đề
  xuyen: 0.35,         // tỉ lệ chồng lấn hộp thân (theo hộp nhỏ hơn) coi là xuyên
  camYen: 0.02,        // camera dời < mức này (stud) và fov đổi < 0,3° → đứng yên
  zoomTi: 0.04,        // đầu to/nhỏ ra ít nhất 4% giữa đầu–cuối shot mới tính là có zoom
};

export function loadCfg(path) {
  const here = dirname(fileURLToPath(import.meta.url));
  const f = path || join(here, 'gates.json');
  const extra = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  return { ...DEFAULT_CFG, ...extra };
}

// ---- chạy TRONG trang (page.evaluate(probe, cfg)) — chỉ đọc cảnh, không đổi gì ----
export function probe(cfg) {
  const st = window.__stage, T = window.THREE || (st && st.THREE);
  if (!st || !st.scene || !st.camera || !T) return { err: 'trang không có window.__stage / THREE' };
  const sc = st.scene, cam = st.camera;
  sc.updateMatrixWorld(true); cam.updateMatrixWorld(true);
  const worldVisible = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  // diễn viên = Group có hậu duệ tên Head + LeftFoot + RightFoot (R6 / R15 cùng đặt tên pivot như vậy)
  const actors = [];
  sc.traverse((o) => {
    if (!o.isGroup || !o.getObjectByName) return;
    if (o.name === 'sizer' || o.name === 'body') return;
    const head = o.getObjectByName('Head'), lf = o.getObjectByName('LeftFoot'), rf = o.getObjectByName('RightFoot');
    if (!head || !lf || !rf) return;
    for (let p = o.parent; p; p = p.parent) if (actors.some((a) => a.root === p)) return;   // chỉ lấy gốc ngoài cùng
    if (!worldVisible(o)) return;
    actors.push({ root: o, head, lf, rf });
  });
  const own = new Set(); for (const a of actors) a.root.traverse((m) => own.add(m));
  const ndc = (v) => v.clone().project(cam);
  const box = new T.Box3(), v = new T.Vector3();
  const meshBox = (obj, filter) => {   // hộp bao thế giới của các mesh nhìn thấy dưới obj
    box.makeEmpty();
    obj.traverse((m) => { if (m.isMesh && worldVisible(m) && (!filter || filter(m))) { m.geometry.boundingBox || m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); } });
    return box.isEmpty() ? null : box.clone();
  };
  const screenRect = (b) => {   // hộp 3D → khung chữ nhật NDC [-1,1] (null nếu nằm sau camera)
    let x0 = 9, y0 = 9, x1 = -9, y1 = -9, behind = 0;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
      const p = ndc(v); if (p.z > 1) behind++;
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    return behind === 8 ? null : { x0, y0, x1, y1 };
  };
  const ray = new T.Raycaster(); ray.camera = cam;
  // chỉ bắn tia vào mesh thường đang hiện (bỏ sprite, điểm, đường, vật trong suốt mờ) — danh sách lập 1 lần
  const solid = [];
  const isSky = (m) => /sky|dome|backdrop|horizon/i.test(m.name) || m.material.side === T.BackSide;
  sc.traverse((m) => { if (m.isMesh && !m.isSprite && worldVisible(m) && m.material && !Array.isArray(m.material) && m.material.visible !== false && !(m.material.transparent && m.material.opacity < 0.5) && !isSky(m)) solid.push(m); else if (m.isMesh && Array.isArray(m.material) && worldVisible(m) && !/sky/i.test(m.name)) solid.push(m); });
  const others = solid.filter((m) => !own.has(m));
  const out = { cam: { p: cam.getWorldPosition(new T.Vector3()).toArray().map((x) => +x.toFixed(4)), fov: +cam.fov.toFixed(3) }, actors: [] };
  for (const a of actors) {
    const name = a.root.name || 'nv';
    const hero = a.root.userData && a.root.userData.vai === 'hero';
    const hb = meshBox(a.head, (m) => !/hair|hat|beanie|braid|acc_/i.test(m.name)) || meshBox(a.head);
    // khung đầu trên màn hình = chiếu đỉnh lưới thật của mesh đầu (hộp bao 3D chiếu 8 góc thì phình to → báo cắt nhầm)
    const vertRect = () => {
      let x0 = 9, y0 = 9, x1 = -9, y1 = -9, n = 0, behind = 0;
      a.head.traverse((m) => {
        if (!m.isMesh || !worldVisible(m) || /hair|hat|beanie|braid|acc_|face/i.test(m.name)) return;
        const pa = m.geometry.attributes.position; if (!pa) return;
        const step = Math.max(1, Math.floor(pa.count / 300));
        for (let i = 0; i < pa.count; i += step) {
          v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld).project(cam); n++;
          if (v.z > 1) { behind++; continue; }
          x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
        }
      });
      return !n || behind === n ? null : { x0, y0, x1, y1 };
    };
    const r = hb && (vertRect() || screenRect(hb));
    let headOut = null, inFrame = false, headH = 0, headC = null;
    if (r) {
      const w = r.x1 - r.x0, h = r.y1 - r.y0;
      const ix = Math.max(0, Math.min(1, r.x1) - Math.max(-1, r.x0)), iy = Math.max(0, Math.min(1, r.y1) - Math.max(-1, r.y0));
      const inside = w > 0 && h > 0 ? (ix * iy) / (w * h) : 0;
      inFrame = inside > 0.02; headOut = +(1 - inside).toFixed(3); headH = +(h / 2).toFixed(4);
      headC = [+((r.x0 + r.x1) / 2).toFixed(3), +((r.y0 + r.y1) / 2).toFixed(3)];
    }
    // chân: đáy hộp thân (bỏ phụ kiện) so với sàn ngay dưới
    const bb = meshBox(a.root, (m) => !/hair|hat|beanie|braid|acc_|scarf|cape|tool|prop/i.test(m.name));
    let gap = null, upright = false, feetIn = false, floorName = null;
    if (bb) {
      const hp = a.head.getWorldPosition(new T.Vector3());
      const H = bb.max.y - bb.min.y;   // đứng = cao hơn bề ngang và đầu ở nửa trên (nằm / ngã / bay ngang thì bỏ qua cổng chân)
      upright = H > 1.5 && hp.y - bb.min.y > 0.6 * H && H > 0.9 * Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
      const fp = a.lf.getWorldPosition(new T.Vector3()).add(a.rf.getWorldPosition(new T.Vector3())).multiplyScalar(0.5);
      ray.set(new T.Vector3(fp.x, bb.min.y + cfg.chanTiaCao, fp.z), new T.Vector3(0, -1, 0)); ray.far = cfg.chanTiaCao + 6;
      const hit = ray.intersectObjects(others, false)[0];
      if (hit) { gap = +(bb.min.y - hit.point.y).toFixed(3); floorName = hit.object.name || hit.object.type; }
      // điểm cổ chân (trên cả đáy chân lẫn mặt sàn) — phải nằm trong khung và không bị vật khác che thì mới chấm cổng chân
      const ankle = new T.Vector3(fp.x, Math.max(bb.min.y, hit ? hit.point.y : bb.min.y) + 0.4, fp.z), pf = ndc(ankle.clone());
      feetIn = Math.abs(pf.x) <= 0.95 && Math.abs(pf.y) <= 0.95 && pf.z <= 1;   // sát mép khung thì không thấy rõ → bỏ qua
      if (feetIn) {   // chân bị bàn ghế / vật khác che trước camera → mắt không thấy lơ lửng → bỏ qua
        const o0 = cam.getWorldPosition(new T.Vector3()), d = ankle.clone().sub(o0), L = d.length();
        ray.set(o0, d.normalize()); ray.far = L - 0.3;
        if (ray.intersectObjects(others, false).length) feetIn = false;
      }
    }
    // mặt bị che: tia từ camera tới tâm đầu, vật đầu tiên không phải của nhân vật này
    let occluded = false;
    if (hb && inFrame) {
      const c = hb.getCenter(new T.Vector3()), o0 = cam.getWorldPosition(new T.Vector3());
      const d = c.clone().sub(o0); const L = d.length();
      ray.set(o0, d.normalize()); ray.far = L - 0.6;
      const first = ray.intersectObjects(solid, false).find((h) => !a.root.getObjectById(h.object.id));
      occluded = !!first; if (first) occluded = first.object.name || 'vật';
    }
    out.actors.push({ name, hero, inFrame, headOut, headH, headC, gap, floor: floorName, upright, feetIn, occluded,
      box: bb ? [bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z].map((x) => +x.toFixed(3)) : null });
  }
  return out;
}

// ---- chấm điểm một shot từ 3 mốc probe {a: đầu, m: giữa, b: cuối} ----
export function judge(P, cfg = DEFAULT_CFG) {
  const fails = [], look = [];
  if (!P || !P.m || P.m.err) return { fails: [{ gate: 'probe', msg: (P && P.m && P.m.err) || 'không đo được' }], look };
  for (const [k, S] of Object.entries(P)) {
    if (!S || !S.actors) continue;
    for (const a of S.actors) {
      if (!a.inFrame) continue;
      if (a.upright && a.feetIn && a.gap != null) {
        if (a.gap > cfg.chanLo) fails.push({ gate: 'chan', at: k, nv: a.name, msg: `chân lơ lửng ${a.gap.toFixed(2)} stud` });
        else if (a.gap < -cfg.chanLun) fails.push({ gate: 'chan', at: k, nv: a.name, msg: `chân lún ${(-a.gap).toFixed(2)} stud` });
      }
      if (a.headOut != null && a.headOut > cfg.dauCat && a.headOut < 0.98) fails.push({ gate: 'dau', at: k, nv: a.name, msg: `đầu bị cắt ${(a.headOut * 100).toFixed(0)}%` });
      if (a.hero && a.headC) {
        const [l, t, r, b] = cfg.matAnToan, x = (a.headC[0] + 1) / 2, y = (1 - a.headC[1]) / 2;
        if (x < l || x > 1 - r || y < t || y > 1 - b) fails.push({ gate: 'mat', at: k, nv: a.name, msg: `mặt nhân vật chính ngoài vùng an toàn (x ${x.toFixed(2)}, y ${y.toFixed(2)})` });
      }
    }
    const L = S.actors.filter((a) => a.inFrame && a.box && a.upright);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const p = L[i].box, q = L[j].box;
      const ox = Math.min(p[3], q[3]) - Math.max(p[0], q[0]), oz = Math.min(p[5], q[5]) - Math.max(p[2], q[2]);
      if (ox <= 0 || oz <= 0) continue;
      const area = (bx) => (bx[3] - bx[0]) * (bx[5] - bx[2]);
      const ratio = (ox * oz) / Math.min(area(p), area(q));
      if (ratio > cfg.xuyen) fails.push({ gate: 'xuyen', at: k, nv: `${L[i].name}+${L[j].name}`, msg: `hai nhân vật xuyên nhau ${(ratio * 100).toFixed(0)}%` });
    }
  }
  // gộp lỗi trùng (cùng cổng + nhân vật ở nhiều mốc) → 1 dòng
  const seen = new Map();
  for (const f of fails) { const key = f.gate + '|' + (f.nv || ''); if (!seen.has(key)) seen.set(key, { ...f, ats: [f.at] }); else seen.get(key).ats.push(f.at); }
  const merged = [...seen.values()];
  // LOOK — luật camera dồn dập
  if (P.a && P.b && P.a.cam && P.b.cam) {
    const d = Math.hypot(...P.a.cam.p.map((x, i) => x - P.b.cam.p[i])), df = Math.abs(P.a.cam.fov - P.b.cam.fov);
    const still = d < cfg.camYen && df < 0.3;
    if (still) look.push('camera đứng yên');
    const vis = (P.m.actors || []).filter((a) => a.inFrame);
    const sz = (S, n) => { const a = (S.actors || []).find((x) => x.name === n && x.inFrame); return a ? a.headH : 0; };
    if (!still && vis.length) {
      const ref = vis.find((a) => a.hero) || vis[0];
      const s0 = sz(P.a, ref.name), s1 = sz(P.b, ref.name);
      if (s0 > 0 && s1 > 0) {
        const k = s1 / s0 - 1;
        if (vis.length === 1 && k < cfg.zoomTi) look.push(`1 người mà không zoom in (đầu ${k >= 0 ? '+' : ''}${(k * 100).toFixed(0)}%)`);
        if (vis.length >= 2 && k > -cfg.zoomTi) look.push(`${vis.length} người mà không zoom out (đầu ${k >= 0 ? '+' : ''}${(k * 100).toFixed(0)}%)`);
      }
    }
    const hero = (P.m.actors || []).find((a) => a.hero && a.inFrame && a.occluded);
    if (hero) look.push(`mặt nhân vật chính bị che (${hero.occluded})`);
  }
  return { fails: merged, look };
}

export function formatShot(id, r) {
  const head = `  ${(id || '-').padEnd(7)}`;
  const lines = [head + (r.fails.length ? `FAIL  ` + r.fails.map((f) => `[${f.gate}] ${f.nv ? f.nv + ': ' : ''}${f.msg} @${f.ats ? f.ats.join('/') : f.at}`).join(' · ') : 'PASS')];
  if (r.look.length) lines.push(' '.repeat(9) + 'LOOK  ' + r.look.join(' · '));
  return lines.join('\n');
}
