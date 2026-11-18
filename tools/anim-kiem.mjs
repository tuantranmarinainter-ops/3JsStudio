// anim-kiem.mjs — KIỂM ANIMATION NHÂN VẬT bằng số (không chụp ảnh). Dùng chung cho mọi tập (R6 / R15) và cho dữ liệu ngoài
// (vd Roblox Studio xuất bằng Luau) miễn đúng định dạng "anim-pose v1" bên dưới.
//
//   node tools/anim-kiem.mjs xuat <trang> [--shots s001,s002|all] [--fps 30] [--cfg f.json] [--out dir]   → <out>/anim-pose.json
//   node tools/anim-kiem.mjs do <anim-pose.json> [--cfg f.json] [--ab khac.json] [--out dir] [--ten A] [--ten2 B] → <out>/bao-cao.md + ket-qua.json
//   node tools/anim-kiem.mjs <trang> …   (= xuat rồi do)        look.mjs --anim cũng gọi vào đây.
//
// 7 chỉ số (mỗi nhân vật × mỗi shot, chỉ tính khung nhân vật nằm trong khung hình):
//   truot   chân đang chạm đất mà trôi ngang (stud/s)            lo/lun  chân lơ lửng / lún so với mặt đất ngay dưới
//   giat    khớp xoay nhảy cóc giữa 2 khung (rad/s), gốc dịch chuyển tức thời
//   do      bất động hoàn toàn (không thở, không đung đưa) — hoặc ngược lại: nhân vật PHẢI đứng im (cfg.dungIm) mà vẫn nhúc nhích
//   mayMoc  khớp chỉ lắc đúng một nhịp sin (độ thuần điều hoà ≥ ngưỡng) / tay–chân đối xứng hoàn hảo
//   khopSo  số trên đầu giảm lệch bao nhiêu khung so với lúc chân chạm đất
//   tay     khoảng cách bàn tay → vật cần cầm (cfg.grip)
//
// cfg (JSON, tuỳ chọn, vd episodes/<ep>/anim-kiem.json): { dungIm:["s001:toi"], nhay:["s009:b2"], grip:[{shot,actor,hand:"rh",target:"ten_vat"}],
//   bo:["s011:me"] (bỏ qua), nguong:{…ghi đè NGUONG} }
//
// Định dạng anim-pose v1:
//   { v:1, src, fps, shots:[{id,t0,t1}], frames:[{ t, shot, a:{ <tên>: { root:[x,y,z], j:{ torso,head,la,ra,ll,rl,lk,rk,le,re: [rx,ry,rz] },
//       lf:[x,y,z], rf:[x,y,z], gl, gr, lh:[x,y,z], rh:[x,y,z], view:bool, num:"123"|null, grip:{rh:dist} } } }] }
//   j = góc Euler XYZ (rad) của khớp so với khớp cha; lf/rf = điểm đáy bàn chân (thế giới); gl/gr = độ cao mặt đất dưới chân (null = không có).
//   Trục Y lên, đơn vị stud.

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

export const NGUONG = {
  cham: 0.2,        // stud: chân cách đất < mức này = đang chạm
  truot: 1.0,       // stud/s: chân chạm đất mà trôi nhanh hơn = trượt
  lo: 0.25, lun: 0.2,
  giatRad: 18,      // rad/s một khớp giữa 2 khung = nhảy cóc
  giatGoc: 1.5,     // stud/khung: gốc nhân vật dịch chuyển tức thời
  doRad: 0.12, doGoc: 0.15,   // dưới mức này (rad/s, stud/s) ở MỌI khớp = bất động
  doTi: 0.6,        // ≥ 60% khung bất động trong shot = đơ (khi không cố ý đứng im)
  imRad: 0.35,      // nhân vật PHẢI đứng im mà khớp quay nhanh hơn mức này (rad/s) = nhúc nhích sai
  thuan: 0.93,      // độ thuần điều hoà (công suất 1 nhịp / tổng) ≥ mức này = sin máy móc
  bienDoMin: 0.12,  // rad: khớp lắc ít hơn thì không xét máy móc
  doiXung: 0.985,   // |tương quan| tay–chân ≥ mức này = đối xứng hoàn hảo
  khopSo: 3,        // khung: số giảm lệch hơn mức này so với lúc chạm đất = không khớp
  tay: 0.6,         // stud: bàn tay xa vật cần cầm hơn mức này
};
const JOINTS = ['torso', 'head', 'la', 'ra', 'll', 'rl', 'lk', 'rk', 'le', 're'];

// ======================= PHÂN TÍCH (thuần, test được) =======================
const key = (shot, actor) => shot + ':' + actor;
const has = (list, shot, actor) => (list || []).some((x) => x === key(shot, actor) || x === '*:' + actor || x === shot + ':*');
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const angD = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const numOf = (s) => (s == null ? null : (/\d/.test(String(s)) ? +String(s).replace(/\D/g, '') : null));

// độ thuần điều hoà: DFT, công suất của nhịp mạnh nhất (± 1 bin) / tổng công suất xoay chiều
export function thuanDieuHoa(x) {
  const n = x.length; if (n < 12) return null;
  const m = x.reduce((s, v) => s + v, 0) / n, y = x.map((v) => v - m);
  // bỏ xu hướng tuyến tính (khớp xoay dần đều không phải dao động)
  const tm = (n - 1) / 2; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (i - tm) * y[i]; sxx += (i - tm) ** 2; }
  const k = sxy / sxx; for (let i = 0; i < n; i++) y[i] -= k * (i - tm);
  const P = []; let tot = 0;
  for (let f = 1; f <= Math.floor(n / 2); f++) { let re = 0, im = 0; for (let i = 0; i < n; i++) { const a = 2 * Math.PI * f * i / n; re += y[i] * Math.cos(a); im -= y[i] * Math.sin(a); } P[f] = re * re + im * im; tot += P[f]; }
  if (tot < 1e-9) return null;
  let best = 1; for (let f = 1; f < P.length; f++) if (P[f] > P[best]) best = f;
  return ((P[best - 1] || 0) + P[best] + (P[best + 1] || 0)) / tot;
}
function corr(a, b) {
  const n = a.length; if (n < 8) return 0;
  const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa < 1e-6 || sbb < 1e-6 ? 0 : sab / Math.sqrt(saa * sbb);
}

export function phanTich(data, cfg = {}) {
  const N = { ...NGUONG, ...(cfg.nguong || {}) }, fps = data.fps || 30, dt = 1 / fps;
  // gom chuỗi theo (shot, nhân vật), chỉ khung trong khung hình
  const seq = new Map();
  for (const fr of data.frames) for (const [n, a] of Object.entries(fr.a || {})) {
    if (a.view === false || has(cfg.bo, fr.shot, n)) continue;
    const k = key(fr.shot, n); if (!seq.has(k)) seq.set(k, { shot: fr.shot, actor: n, f: [] });
    seq.get(k).f.push({ t: fr.t, ...a });
  }
  const rows = [];
  for (const s of seq.values()) {
    const f = s.f; if (f.length < 3) continue;
    const r = { shot: s.shot, actor: s.actor, n: f.length, loi: [] };
    const fr = (i) => Math.round(f[i].t * fps);
    const dungIm = has(cfg.dungIm, s.shot, s.actor), nhay = has(cfg.nhay, s.shot, s.actor);
    // ---- chân: chạm, trượt, lơ lửng, lún ----
    let planted = 0, slid = 0, vMax = 0, vAt = -1, lo = 0, lun = 0, loMax = 0, lunMax = 0, coDat = 0;
    const contacts = [];   // khung chân bắt đầu chạm đất
    const gap = (i, side) => { const p = f[i][side], g = f[i][side === 'lf' ? 'gl' : 'gr']; return p && g != null ? p[1] - g : null; };
    let prevC = { lf: false, rf: false };
    for (let i = 0; i < f.length; i++) {
      const gL = gap(i, 'lf'), gR = gap(i, 'rf');
      if (gL == null && gR == null) continue;
      coDat++;
      const mn = Math.min(gL ?? 9, gR ?? 9);
      if (!nhay && mn > N.lo) { lo++; loMax = Math.max(loMax, mn); }
      if (mn < -N.lun) { lun++; lunMax = Math.max(lunMax, -mn); }
      for (const side of ['lf', 'rf']) {
        const g = side === 'lf' ? gL : gR, c = g != null && Math.abs(g) < N.cham;
        if (c && !prevC[side] && i > 0) contacts.push(f[i].t);
        const other = side === 'lf' ? gR : gL, support = other == null || g <= other + 0.02;   // chỉ chân ĐỠ người (thấp hơn) mới phải đứng yên
        if (c && support && i > 0 && prevC[side] && f[i - 1][side]) {
          planted++;
          const v = d2(f[i][side], f[i - 1][side]) / (f[i].t - f[i - 1].t || dt);
          if (v > N.truot) slid++;
          if (v > vMax) { vMax = v; vAt = fr(i); }
        }
        prevC[side] = c;
      }
    }
    r.truot = { ti: planted ? slid / planted : 0, vMax: +vMax.toFixed(2), khung: vAt };
    r.lo = { ti: coDat ? lo / coDat : 0, max: +loMax.toFixed(2) };
    r.lun = { ti: coDat ? lun / coDat : 0, max: +lunMax.toFixed(2) };
    if (r.truot.ti > 0.15 && vMax > N.truot) r.loi.push(`trượt chân ${(r.truot.ti * 100).toFixed(0)}% lúc chạm đất (đỉnh ${vMax.toFixed(1)} stud/s, khung ${vAt})`);
    if (r.lo.ti > 0.2) r.loi.push(`lơ lửng ${(r.lo.ti * 100).toFixed(0)}% khung (cao nhất ${loMax.toFixed(2)})`);
    if (r.lun.ti > 0.2) r.loi.push(`lún ${(r.lun.ti * 100).toFixed(0)}% khung (sâu nhất ${lunMax.toFixed(2)})`);
    // ---- khớp: vận tốc góc, giật, đơ ----
    const w = [];  // tốc độ góc lớn nhất mỗi khung
    let giat = 0, giatMax = 0, giatAt = -1, giatJ = '', tele = 0, still = 0;
    for (let i = 1; i < f.length; i++) {
      const h = f[i].t - f[i - 1].t || dt; let mx = 0, mj = '';
      for (const j of JOINTS) {
        const a = f[i].j?.[j], b = f[i - 1].j?.[j]; if (!a || !b) continue;
        const v = Math.max(Math.abs(angD(a[0], b[0])), Math.abs(angD(a[1], b[1])), Math.abs(angD(a[2], b[2]))) / h;
        if (v > mx) { mx = v; mj = j; }
      }
      const rv = f[i].root && f[i - 1].root ? Math.hypot(f[i].root[0] - f[i - 1].root[0], f[i].root[1] - f[i - 1].root[1], f[i].root[2] - f[i - 1].root[2]) : 0;
      w.push(mx);
      if (mx > N.giatRad) { giat++; if (mx > giatMax) { giatMax = mx; giatAt = fr(i); giatJ = mj; } }
      if (rv > N.giatGoc) tele++;
      if (mx < N.doRad && rv / h < N.doGoc) still++;
    }
    r.giat = { lan: giat, max: +giatMax.toFixed(1), khung: giatAt, khop: giatJ, dichChuyen: tele };
    r.do = { ti: still / (f.length - 1) };
    if (giat) r.loi.push(`giật ${giat} lần (khớp ${giatJ} ${giatMax.toFixed(0)} rad/s, khung ${giatAt})`);
    if (tele) r.loi.push(`dịch chuyển tức thời ${tele} lần`);
    if (dungIm) {
      const motion = w.filter((v) => v > N.imRad).length / w.length;
      r.do.imSai = motion;
      if (motion > 0.1) r.loi.push(`phải đứng im mà khớp vẫn quay ${(motion * 100).toFixed(0)}% khung`);
    } else if (r.do.ti >= N.doTi) r.loi.push(`đơ: bất động ${(r.do.ti * 100).toFixed(0)}% shot (không thở, không đung đưa)`);
    // ---- máy móc: độ thuần điều hoà + đối xứng hoàn hảo ----
    const purity = [];
    for (const j of ['la', 'ra', 'll', 'rl', 'torso', 'head']) {
      const x = f.map((q) => q.j?.[j]?.[0]).filter((v) => v != null);
      if (x.length < 12) continue;
      const amp = Math.max(...x) - Math.min(...x); if (amp < N.bienDoMin) continue;
      const p = thuanDieuHoa(x); if (p != null) purity.push({ j, p });
    }
    const ser = (j) => f.map((q) => q.j?.[j]?.[0] ?? 0);
    const cAL = corr(ser('la'), ser('ll')), cLR = corr(ser('ll'), ser('rl'));
    r.mayMoc = { thuan: purity.length ? +(purity.reduce((s, x) => s + x.p, 0) / purity.length).toFixed(3) : null, khop: purity.map((x) => x.j + ' ' + x.p.toFixed(2)).join(', '), doiXung: +Math.max(Math.abs(cAL), Math.abs(cLR)).toFixed(3) };
    const pure = purity.filter((x) => x.p >= N.thuan);
    if (pure.length >= 2) r.loi.push(`máy móc: ${pure.length} khớp lắc đúng 1 nhịp sin (${pure.map((x) => x.j).join(', ')})`);
    if (purity.length >= 2 && r.mayMoc.doiXung >= N.doiXung) r.loi.push(`tay–chân đối xứng hoàn hảo (tương quan ${r.mayMoc.doiXung})`);
    // ---- khớp số bước với chân chạm đất ----
    const drops = [];
    for (let i = 1; i < f.length; i++) { const a = numOf(f[i - 1].num), b = numOf(f[i].num); if (a != null && b != null && b < a) drops.push(f[i].t); }
    if (drops.length) {
      const lech = drops.map((t) => contacts.length ? Math.min(...contacts.map((c) => Math.abs(c - t))) * fps : Infinity);
      r.khopSo = { lan: drops.length, lechTB: +(lech.reduce((s, v) => s + Math.min(v, 99), 0) / lech.length).toFixed(1), lechMax: +Math.min(99, Math.max(...lech)).toFixed(1) };
      if (r.khopSo.lechMax > N.khopSo) r.loi.push(`số giảm lệch chân chạm đất tới ${r.khopSo.lechMax} khung`);
    }
    // ---- tay cầm vật ----
    const gs = (cfg.grip || []).filter((g) => g.shot === s.shot && g.actor === s.actor);
    if (gs.length) {
      const ds = []; for (const q of f) for (const g of gs) { const v = q.grip?.[g.hand || 'rh']; if (v != null) ds.push(v); }
      if (ds.length) {
        r.tay = { tb: +(ds.reduce((s, v) => s + v, 0) / ds.length).toFixed(2), max: +Math.max(...ds).toFixed(2) };
        if (r.tay.tb > N.tay) r.loi.push(`tay cách vật cần cầm ${r.tay.tb} stud`);
      }
    }
    rows.push(r);
  }
  // tổng hợp 7 chỉ số
  const avg = (xs) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
  const pick = (fn) => rows.map(fn).filter((v) => v != null && isFinite(v));
  const tong = {
    truot: avg(pick((r) => r.truot.ti)), lo: avg(pick((r) => r.lo.ti)), lun: avg(pick((r) => r.lun.ti)),
    giat: rows.reduce((s, r) => s + r.giat.lan + r.giat.dichChuyen, 0),
    do: avg(pick((r) => (has(cfg.dungIm, r.shot, r.actor) ? null : r.do.ti))),
    imSai: avg(pick((r) => r.do.imSai)),
    mayMoc: avg(pick((r) => r.mayMoc.thuan)), doiXung: avg(pick((r) => (r.mayMoc.thuan != null ? r.mayMoc.doiXung : null))),
    khopSo: avg(pick((r) => r.khopSo?.lechTB)), tay: avg(pick((r) => r.tay?.tb)),
    loi: rows.reduce((s, r) => s + r.loi.length, 0), cap: rows.length,
  };
  return { tong, rows: rows.sort((a, b) => b.loi.length - a.loi.length || (a.shot < b.shot ? -1 : 1)), nguong: N };
}

// ======================= BÁO CÁO =======================
const CHI_SO = [
  ['truot', 'Trượt chân (tỉ lệ khung chạm đất bị trôi)', 'pct', -1],
  ['lo', 'Lơ lửng (tỉ lệ khung)', 'pct', -1], ['lun', 'Lún (tỉ lệ khung)', 'pct', -1],
  ['giat', 'Giật / dịch chuyển tức thời (số lần)', 'n', -1],
  ['do', 'Đơ — bất động khi không cố ý (tỉ lệ)', 'pct', -1], ['imSai', 'Phải đứng im mà nhúc nhích (tỉ lệ)', 'pct', -1],
  ['mayMoc', 'Máy móc — độ thuần sin (1 = sin tuyệt đối)', 'f', -1], ['doiXung', 'Tay–chân đối xứng (|tương quan|)', 'f', -1],
  ['khopSo', 'Số giảm lệch chân chạm (khung, TB)', 'f', -1], ['tay', 'Tay cách vật cần cầm (stud, TB)', 'f', -1],
  ['loi', 'Tổng số lỗi (nhân vật × shot)', 'n', -1],
];
const fmtV = (v, kind) => (v == null ? '—' : kind === 'pct' ? (v * 100).toFixed(1) + '%' : kind === 'n' ? String(v) : v.toFixed(2));
export function baoCao(kq, ten = 'A', kq2 = null, ten2 = 'B') {
  const L = [`# Kiểm animation nhân vật${kq2 ? ` — ${ten} | ${ten2}` : ''}`, '', 'Số càng thấp càng tốt. Ngưỡng: `tools/anim-kiem.mjs` NGUONG (ghi đè bằng cfg.nguong).', ''];
  L.push(kq2 ? `| Chỉ số | ${ten} | ${ten2} | Tốt hơn |` : '| Chỉ số | Giá trị |', kq2 ? '|---|---|---|---|' : '|---|---|');
  for (const [k, label, kind] of CHI_SO) {
    const a = kq.tong[k], b = kq2?.tong[k];
    if (!kq2) { L.push(`| ${label} | ${fmtV(a, kind)} |`); continue; }
    const win = a == null || b == null ? '—' : Math.abs(a - b) < 1e-3 ? 'ngang' : a < b ? ten : ten2;
    L.push(`| ${label} | ${fmtV(a, kind)} | ${fmtV(b, kind)} | ${win} |`);
  }
  L.push(`| Số cặp nhân vật × shot đã đo | ${kq.tong.cap} |${kq2 ? ` ${kq2.tong.cap} | |` : ''}`);
  for (const [k, t] of [[kq, ten], [kq2, ten2]]) {
    if (!k) continue;
    L.push('', `## ${t} — lỗi theo nhân vật × shot (nặng trước)`, '', '| Shot | Nhân vật | Lỗi |', '|---|---|---|');
    const bad = k.rows.filter((r) => r.loi.length);
    for (const r of bad.slice(0, 40)) L.push(`| ${r.shot} | ${r.actor} | ${r.loi.join('; ')} |`);
    if (!bad.length) L.push('| — | — | không có lỗi vượt ngưỡng |');
    if (bad.length > 40) L.push(`| … | | còn ${bad.length - 40} dòng trong ket-qua.json |`);
  }
  return L.join('\n') + '\n';
}

// ======================= XUẤT TƯ THẾ TỪ TRANG three.js =======================
// chạy TRONG trang: đặt t, đo mọi nhân vật đang hiện (gốc có userData.r6 hoặc có Head + LeftFoot + RightFoot)
function probeAnim({ ts, grip }) {
  const st = window.__stage, T = window.THREE || (st && st.THREE), tl = window.__shots;
  const sc = st.scene, cam = st.camera;
  const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const v = new T.Vector3(), q = new T.Quaternion(), e = new T.Euler(), box = new T.Box3();
  const ray = new T.Raycaster(), DOWN = new T.Vector3(0, -1, 0);
  const frust = new T.Frustum(), M = new T.Matrix4();
  const P = (o) => o.getWorldPosition(new T.Vector3()).toArray().map((x) => +x.toFixed(4));
  const E = (o) => { e.setFromQuaternion(o.quaternion, 'XYZ'); return [+e.x.toFixed(4), +e.y.toFixed(4), +e.z.toFixed(4)]; };
  const out = [];
  for (const t of ts) {
    const r = window.renderAt(t); // (đồng bộ ở trang tập; Promise thì bỏ qua — trang tập không trả Promise)
    sc.updateMatrixWorld(true); cam.updateMatrixWorld(true);
    M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frust.setFromProjectionMatrix(M);
    const actors = [];
    sc.traverse((o) => {
      if (!o.isGroup || o.name === 'sizer' || o.name === 'body') return;
      if (!(o.userData && o.userData.r6) && !(o.getObjectByName('Head') && o.getObjectByName('LeftFoot') && o.getObjectByName('RightFoot'))) return;
      if (!o.getObjectByName('LeftFoot')) return;
      for (let p = o.parent; p; p = p.parent) if (actors.some((a) => a === p)) return;
      if (vis(o)) actors.push(o);
    });
    const own = new Set(); for (const a of actors) a.traverse((m) => own.add(m));
    const solid = [];
    sc.traverse((m) => { if (m.isMesh && !m.isSprite && !own.has(m) && vis(m) && m.material && !Array.isArray(m.material) && m.material.visible !== false && !(m.material.transparent && m.material.opacity < 0.5) && m.material.side !== T.BackSide && !/sky|dome|backdrop|horizon/i.test(m.name)) solid.push(m); });
    const ground = (p) => { ray.set(new T.Vector3(p[0], p[1] + 1.2, p[2]), DOWN); ray.far = 8; const h = ray.intersectObjects(solid, false)[0]; return h ? +h.point.y.toFixed(4) : null; };
    const sole = (upper) => {   // điểm đáy thấp nhất của các mesh dưới khớp đùi (R6: 1 khối; R15: đùi + cẳng + bàn)
      let lo = null; const pts = [];
      upper.traverse((m) => { if (!m.isMesh || !vis(m)) return; m.geometry.boundingBox || m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox;
        for (let i = 0; i < 8; i++) { v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(m.matrixWorld); pts.push(v.clone()); } });
      if (!pts.length) return P(upper);
      pts.sort((a, b) => a.y - b.y); const k = pts.slice(0, 4); lo = k.reduce((s, p) => s.add(p), new T.Vector3()).multiplyScalar(1 / 4); lo.y = pts[0].y;
      return lo.toArray().map((x) => +x.toFixed(4));
    };
    const fr = { t, shot: tl.at(Math.min(t, tl.total - 1e-4)).shot.id, a: {} };
    for (const o of actors) {
      const g = (n) => o.getObjectByName(n);
      const head = g('Head'), lul = g('LeftUpperLeg'), rul = g('RightUpperLeg');
      const J = { torso: g('UpperTorso') || g('LowerTorso'), head, la: g('LeftUpperArm'), ra: g('RightUpperArm'), ll: lul, rl: rul, lk: g('LeftLowerLeg'), rk: g('RightLowerLeg'), le: g('LeftLowerArm'), re: g('RightLowerArm') };
      const j = {}; for (const [k, n] of Object.entries(J)) if (n) j[k] = E(n);
      const lf = sole(lul || g('LeftFoot')), rf = sole(rul || g('RightFoot'));
      head.getWorldPosition(v);
      const num = (() => { let s = null; head.traverse((m) => { if (s == null && m.visible && m.userData && m.userData.soTrenDau != null) s = String(m.userData.soTrenDau); }); return s; })();
      const a = { root: P(o), j, lf, rf, gl: ground(lf), gr: ground(rf), lh: P(g('LeftHand') || J.la), rh: P(g('RightHand') || J.ra), view: frust.containsPoint(v), num };
      for (const gp of grip || []) {
        if (gp.shot !== fr.shot || gp.actor !== o.name) continue;
        const tg = sc.getObjectByName(gp.target); if (!tg) continue;
        box.setFromObject(tg); const hp = new T.Vector3(...a[gp.hand || 'rh']);
        (a.grip ||= {})[gp.hand || 'rh'] = +box.distanceToPoint(hp).toFixed(3);
      }
      fr.a[o.name] = a;
    }
    out.push(fr);
  }
  return out;
}

async function xuat(page, o) {
  const { launchBrowser } = await import('./browser.mjs');
  const { createServer } = await import('http');
  const { readFile: rf } = await import('fs/promises');
  const { extname, relative } = await import('path');
  const root = process.cwd();
  const srv = createServer(async (req, res) => {
    try { const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0;
      const TY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wasm': 'application/wasm' };
      const body = await rf(p); res.writeHead(200, { 'content-type': TY[extname(p).toLowerCase()] || 'application/octet-stream' }); res.end(body);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  const url = /^(https?|file):/.test(page) ? page : `http://localhost:${srv.address().port}/${relative(root, resolve(page.split('?')[0])).replace(/\\/g, '/')}${page.includes('?') ? '?' + page.split('?')[1] : ''}`;
  const browser = await launchBrowser();
  try {
    const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.25 });
    pg.on('pageerror', (e) => console.log('  pageerror:', e.message));
    await pg.goto(url);
    await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
    const shots = await pg.evaluate(() => window.__shots.list.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 })));
    const want = !o.shots || o.shots === 'all' ? shots : shots.filter((s) => o.shots.split(',').includes(s.id));
    const fps = +(o.fps || 30), ts = [];
    for (const s of want) for (let k = Math.ceil(s.t0 * fps - 1e-6); k / fps < s.t1 - 1e-6; k++) ts.push(+(k / fps).toFixed(5));
    const frames = [];
    for (let i = 0; i < ts.length; i += 30) {
      frames.push(...(await pg.evaluate(probeAnim, { ts: ts.slice(i, i + 30), grip: o.cfg.grip })));
      process.stdout.write(`\r  đo tư thế ${Math.min(i + 30, ts.length)}/${ts.length} khung`);
    }
    process.stdout.write('\n');
    return { v: 1, src: page, fps, shots: want, frames };
  } finally { await browser.close(); srv.close(); }
}

// ======================= DÒNG LỆNH =======================
async function main() {
  const args = process.argv.slice(2), o = {}, pos = [];
  for (let i = 0; i < args.length; i++) { const a = args[i]; if (a.startsWith('--')) o[a.slice(2)] = args[++i]; else pos.push(a); }
  let cmd = pos[0];
  if (!cmd) { console.log('Dùng: node tools/anim-kiem.mjs xuat <trang> | do <anim-pose.json> [--ab khac.json] | <trang>'); process.exit(1); }
  if (cmd !== 'xuat' && cmd !== 'do') { pos.unshift('ca'); cmd = 'ca'; }
  const src = pos[1];
  const cfgPath = o.cfg || (() => { const m = /episodes[\\/]([^\\/]+)/.exec(src || ''); const f = m && join('episodes', m[1], 'anim-kiem.json'); return f && existsSync(f) ? f : null; })();
  o.cfg = cfgPath ? JSON.parse(await readFile(cfgPath, 'utf8')) : {};
  if (cfgPath) console.log('  cfg:', cfgPath);
  const out = resolve(o.out || join('output', 'anim-kiem', basename(dirname(resolve(src.split('?')[0])))));
  await mkdir(out, { recursive: true });
  let data;
  if (cmd === 'xuat' || cmd === 'ca') {
    data = await xuat(src, o);
    await writeFile(join(out, 'anim-pose.json'), JSON.stringify(data));
    console.log('  ghi', join(out, 'anim-pose.json'), `(${data.frames.length} khung)`);
    if (cmd === 'xuat') return;
  } else data = JSON.parse(await readFile(resolve(src), 'utf8'));
  const kq = phanTich(data, o.cfg);
  let kq2 = null;
  if (o.ab) { const d2 = JSON.parse(await readFile(resolve(o.ab), 'utf8')); kq2 = phanTich(d2, o.cfg); }
  const md = baoCao(kq, o.ten || (o.ab ? 'A' : 'kết quả'), kq2, o.ten2 || 'B');
  await writeFile(join(out, 'bao-cao.md'), md);
  await writeFile(join(out, 'ket-qua.json'), JSON.stringify({ a: kq, b: kq2 }, null, 1));
  const t = kq.tong;
  console.log(`ANIM ${o.ten || ''}: ${t.loi} lỗi / ${t.cap} cặp · trượt ${fmtV(t.truot, 'pct')} · lơ lửng ${fmtV(t.lo, 'pct')} · giật ${t.giat} · đơ ${fmtV(t.do, 'pct')} · máy móc ${fmtV(t.mayMoc, 'f')}`);
  if (kq2) { const u = kq2.tong; console.log(`ANIM ${o.ten2 || 'B'}: ${u.loi} lỗi / ${u.cap} cặp · trượt ${fmtV(u.truot, 'pct')} · lơ lửng ${fmtV(u.lo, 'pct')} · giật ${u.giat} · đơ ${fmtV(u.do, 'pct')} · máy móc ${fmtV(u.mayMoc, 'f')}`); }
  console.log('  báo cáo:', join(out, 'bao-cao.md'));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
