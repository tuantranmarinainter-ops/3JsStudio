// Máy kiểm động tác R6 (Gà thân gập eo) so với Steve gốc: đo số từng tick + chụp 4 khung/động tác thành ảnh lưới 800px.
//   (gọi qua node tools/r6-may-kiem.mjs) [--chi a,b] [--khong-anh]
import { launchBrowser } from '../browser.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
const OUT = process.env.OUT || 'S:/3JS Studio/output/r6-bobj/kiem'; mkdirSync(OUT, { recursive: true })
const chi = (process.argv.find((a) => a.startsWith('--chi=')) || '').slice(6).split(',').filter(Boolean)
const khongAnh = process.argv.includes('--khong-anh')
const b = await launchBrowser(), p = await b.newPage({ viewport: { width: 800, height: 1455 } })
p.on('pageerror', (e) => console.log('LỖI TRANG', e.message))
await p.goto(process.env.PAGE || 'file:///S:/3JS%20Studio/dist/r6-bobj-test.html'); await p.waitForFunction(() => window.__ready && window.__dbg?.SRC, null, { timeout: 120000 })
const names = await p.evaluate((chi) => { const d = window.__dbg; d.setT(0); return [...d.DST.keys()].filter((n) => !chi.length || chi.includes(n)) }, chi)
const all = []
for (const n of names) {
  const r = await p.evaluate(({ n, khongAnh }) => {
    const { THREE, A, B3, SRC, DSTE, ren, scene, cam, pose, evaluateBobjAction, grid } = window.__dbg
    const M = (a) => new THREE.Matrix4().fromArray(a)
    const ga = DSTE.get(n), st = SRC.get(n), T = Math.ceil(ga.durationTicks)
    const rig = (C, act, tk, dims, cung) => {
      const arm = C.model.armature, R = new Map(arm.bones.map((b) => [b.name, b])), W = new Map(evaluateBobjAction(arm, act, Math.min(tk, act.durationTicks)).map((b) => [b.name, M(b.worldMatrix)]))
      const S = (bn) => W.get(bn).clone().multiply(M(R.get(bn).restWorld).invert())
      const tail = (bn) => new THREE.Vector3(...R.get(bn).tail), head = (bn) => new THREE.Vector3().setFromMatrixPosition(M(R.get(bn).restWorld))
      const P = (bn, v) => v.clone().applyMatrix4(S(bn))
      // R6 cứng: khối chỉ gắn xương trên → đầu mút đi theo xương trên; Steve có khuỷu/gối → theo xương mút
      const tips = cung ? { handL: P('left_arm', tail('low_left_arm.end')), handR: P('right_arm', tail('low_right_arm.end')), footL: P('left_leg', tail('low_left_leg')), footR: P('right_leg', tail('low_leg_right')) } : { handL: P('low_left_arm.end', tail('low_left_arm.end')), handR: P('low_right_arm.end', tail('low_right_arm.end')), footL: P('low_left_leg', tail('low_left_leg')), footR: P('low_leg_right', tail('low_leg_right')) }
      const roots = { handL: P('left_arm', head('left_arm')), handR: P('right_arm', head('right_arm')), footL: P('left_leg', head('left_leg')), footR: P('right_leg', head('right_leg')) }
      // trong thân? (toạ độ nghỉ: nửa dưới theo body, nửa trên theo low_body)
      const inTorso = (w) => { let best = 0
        for (const [bn, y0, y1] of [['body', dims.y0, dims.ym], ['low_body', dims.ym, dims.y1]]) { const q = w.clone().applyMatrix4(S(bn).invert())
          const dx = dims.hx - Math.abs(q.x), dz = dims.hz - Math.abs(q.z), dy = Math.min(q.y - y0, y1 - q.y); const d = Math.min(dx, dz, dy); if (d > best) best = d }
        return best }
      const rot = Object.fromEntries((cung ? ['body', 'low_body', 'head', 'left_arm', 'right_arm', 'left_leg', 'right_leg'] : ['body', 'low_body', 'head', 'left_arm', 'right_arm', 'left_leg', 'right_leg', 'low_left_arm', 'low_right_arm', 'low_left_leg', 'low_leg_right']).filter((x) => R.has(x)).map((x) => [x, new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(S(x)))]))
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rot.low_body)
      return { tips, roots, inTorso, rot, up, S }
    }
    const minY = (C) => { C.root.updateMatrixWorld(true); let m = Infinity; const v = new THREE.Vector3()
      C.root.traverse((o) => { if (!o.isSkinnedMesh) return; o.skeleton.update(); const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 1500))
        for (let i = 0; i < pos.count; i += step) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); if (v.y < m) m = v.y } }); return m }
    // hộp nghỉ của từng khối (từ đỉnh lưới gắn xương nặng nhất) → đo khối tay lún vào đầu / thân / tay kia
    const hop = (C) => { const box = {}, v = new THREE.Vector3(); C.root.traverse((o) => { if (!o.isSkinnedMesh) return; const pos = o.geometry.attributes.position, si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight
        for (let i = 0; i < pos.count; i++) { let bi = 0, bw = -1; for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > bw) { bw = sw.getComponent(i, k); bi = si.getComponent(i, k) }
          const bn = o.skeleton.bones[bi].name; v.fromBufferAttribute(pos, i).applyMatrix4(o.bindMatrix); const bx = box[bn] ||= { min: new THREE.Vector3(9, 9, 9), max: new THREE.Vector3(-9, -9, -9) }; bx.min.min(v); bx.max.max(v) } })
      for (const k in box) { const b = box[k], z = Math.min(-b.min.z, b.max.z); b.min.z = -z; b.max.z = z }   // bỏ mỏ/mào nhô trước-sau: hộp lõi đối xứng
      return box }
    const HG = hop(B3), HS = hop(A)
    // điểm mẫu lưới 3×3×7 trong khối tay (lùi vào 0.02 để chạm mặt không tính); Steve: nửa dưới theo cẳng tay
    const mau = (H, side, cung) => { const up = H[side + '_arm'], lo = H['low_' + side + '_arm'], mn = up.min.clone(), mx = up.max.clone(); if (!cung && lo) { mn.min(lo.min); mx.max(lo.max) }
      const pts = [], e = 0.02, yCut = up.min.y; for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) for (let k = 0; k < 3; k++) { const q = new THREE.Vector3(mn.x + e + (mx.x - mn.x - 2 * e) * i / 2, mn.y + e + (mx.y - mn.y - 2 * e) * j / 6, mn.z + e + (mx.z - mn.z - 2 * e) * k / 2); pts.push([q, !cung && q.y < yCut ? 'low_' + side + '_arm' : side + '_arm']) }
      return pts }
    const MG = { left: mau(HG, 'left', true), right: mau(HG, 'right', true) }, MS = { left: mau(HS, 'left'), right: mau(HS, 'right') }
    const sau = (q, b, m = 0.02) => Math.min(...['x', 'y', 'z'].map((a) => (b.max[a] - b.min[a]) / 2 - m - Math.abs(q[a] - (b.max[a] + b.min[a]) / 2)))
    const lun = (r, H, M) => { const o = { dau: 0, than: 0, chong: 0, dauAt: '', thanAt: '', chongAt: '' }, inv = {}; for (const bn of ['head', 'body', 'low_body', 'left_arm', 'right_arm']) inv[bn] = r.S(bn).clone().invert()
      for (const side of ['left', 'right']) for (const [q, bn] of M[side]) { const w = q.clone().applyMatrix4(r.S(bn))
        const dd = sau(w.clone().applyMatrix4(inv.head), H.head); if (dd > o.dau) { o.dau = dd; o.dauAt = side === 'left' ? 'tay trái' : 'tay phải' }
        for (const t of ['body', 'low_body']) { const dt = sau(w.clone().applyMatrix4(inv[t]), H[t]); if (dt > o.than) { o.than = dt; o.thanAt = side === 'left' ? 'tay trái' : 'tay phải' } }
        if (side === 'left') { const dc = sau(w.clone().applyMatrix4(inv.right_arm), H.right_arm); if (dc > o.chong) o.chong = dc } }
      return o }
    const DG = { hx: 0.36, hz: 0.16, y0: 0.82, ym: 1.2, y1: 1.58 }, DS = { hx: 0.22, hz: 0.10, y0: 0.77, ym: 1.125, y1: 1.48 }, K = 0.6 / 0.375
    const rows = []; let prevG = null, prevS = null
    for (let tk = 0; tk <= T; tk++) {
      const g = rig(B3, ga, tk, DG, true), s = st ? rig(A, st, tk, DS) : null
      pose(B3, ga, Math.min(tk, ga.durationTicks)); if (st) pose(A, st, Math.min(tk, st.durationTicks))
      const yg = minY(B3), ys = st ? minY(A) : yg
      const lg = lun(g, HG, MG), ls = s ? lun(s, HS, MS) : { dau: 0, than: 0, chong: 0 }
      const row = { tk, tayDau: lg.dau - ls.dau * K, tayDauAt: lg.dauAt, tayThan: lg.than - ls.than * K, tayThanAt: lg.thanAt, tayChong: lg.chong - ls.chong * K, san: yg - ys, ysan: ys, xuyen: 0, xuyenS: 0, xuyenAt: '', lech: 0, lechAt: '', giat: 0, giatAt: '', cham: 0, than: 0 }
      for (const k of ['handL', 'handR', 'footL', 'footR']) { const d = g.inTorso(g.tips[k]), ds = s ? s.inTorso(s.tips[k]) : 0; if (d - ds * K > row.xuyen) { row.xuyen = d - ds * K; row.xuyenAt = k } }
      if (s) {
        for (const k of ['handL', 'handR']) { const a = g.tips[k].clone().sub(g.roots[k]).normalize(), c = s.tips[k].clone().sub(s.roots[k]).normalize(); const ang = Math.acos(Math.min(1, a.dot(c))) * 57.3; if (ang > row.lech) { row.lech = ang; row.lechAt = k } }
        row.than = Math.acos(Math.min(1, g.up.dot(s.up))) * 57.3
        const dg = g.tips.handL.distanceTo(g.tips.handR), ds = s.tips.handL.distanceTo(s.tips.handR); if (ds < 0.15) row.cham = Math.max(0, dg - (ds * K + 0.12))
        if (prevG) for (const x in g.rot) { const ag = g.rot[x].angleTo(prevG.rot[x]) * 57.3, LOW = { left_arm: 'low_left_arm', right_arm: 'low_right_arm', left_leg: 'low_left_leg', right_leg: 'low_leg_right' }, as = Math.max(...[x, LOW[x]].filter((y) => y && prevS.rot[y] && s.rot[y]).map((y) => s.rot[y].angleTo(prevS.rot[y]) * 57.3), 0); const e = ag - as; if (e > row.giat) { row.giat = e; row.giatAt = x } }
      }
      prevG = g; prevS = s; rows.push(row)
    }
    // điểm từng loại lỗi
    const worst = (f) => rows.reduce((a, r) => (f(r) > f(a) ? r : a), rows[0])
    const L = []
    const add = (key, label, f, thr, fmt) => { const w = worst(f), v = f(w); if (v > thr) L.push({ key, label, v: +v.toFixed(3), tk: w.tk, nTick: rows.filter((r) => f(r) > thr).length, note: fmt(w) }) }
    add('lun', 'chân lún dưới sàn', (r) => -r.san, 0.06, (w) => 'thấp hơn Steve ' + (-w.san).toFixed(2) + ' block')
    add('lo', 'lơ lửng', (r) => (r.ysan < 0.06 ? r.san : 0), 0.08, (w) => 'cao hơn Steve ' + w.san.toFixed(2) + ' block')
    add('xuyen', 'tay/chân xuyên thân', (r) => r.xuyen, 0.04, (w) => w.xuyenAt + ' sâu ' + w.xuyen.toFixed(2))
    add('tayDau', 'tay lún vào đầu', (r) => r.tayDau, 0.05, (w) => w.tayDauAt + ' sâu ' + w.tayDau.toFixed(2) + ' block')
    add('tayThan', 'tay lún vào thân', (r) => r.tayThan, 0.06, (w) => w.tayThanAt + ' sâu ' + w.tayThan.toFixed(2) + ' block')
    add('tayChong', 'hai tay chồng nhau', (r) => r.tayChong, 0.05, (w) => 'chồng sâu ' + w.tayChong.toFixed(2) + ' block')
    add('lech', 'tay/chân lệch hướng Steve', (r) => r.lech, 35, (w) => w.lechAt + ' ' + w.lech.toFixed(0) + '°')
    add('than', 'thân lệch hướng Steve', (r) => r.than, 25, (w) => w.than.toFixed(0) + '°')
    add('giat', 'giật', (r) => r.giat, 30, (w) => w.giatAt + ' +' + w.giat.toFixed(0) + '°/tick')
    add('cham', 'hai tay không chạm', (r) => r.cham, 0.08, (w) => 'xa hơn ' + w.cham.toFixed(2))
    const W8 = { tayDau: 3, tayThan: 3, tayChong: 3, lun: 3, lo: 2, xuyen: 3, lech: 0.04, than: 0.05, giat: 0.04, cham: 3 }
    const score = +L.reduce((a, x) => a + x.v * W8[x.key] * Math.min(1, x.nTick / 4 + 0.25), 0).toFixed(2)
    // 4 khung: khung tệ nhất của các lỗi nặng, bù đầu/giữa/cuối
    const pick = []; for (const x of [...L].sort((a, b) => b.v * W8[b.key] - a.v * W8[a.key])) if (pick.length < 4 && pick.every((p) => Math.abs(p.tk - x.tk) > 2)) pick.push({ tk: x.tk, why: x.label })
    for (const tk of [0, Math.round(T / 3), Math.round(2 * T / 3), T]) if (pick.length < 4 && pick.every((p) => Math.abs(p.tk - tk) > 2)) pick.push({ tk, why: '' })
    for (let tk = 0; pick.length < 4 && tk <= T; tk++) if (pick.every((p) => p.tk !== tk)) pick.push({ tk, why: '' })
    pick.sort((a, b) => a.tk - b.tk)
    let img = null
    if (!khongAnh) {
      const c = document.createElement('canvas'); c.width = 800; c.height = 830; const x2 = c.getContext('2d'); x2.fillStyle = '#fff'; x2.fillRect(0, 0, 800, 830)
      x2.fillStyle = '#111'; x2.font = 'bold 18px sans-serif'; x2.fillText(n + '  (' + (ga.durationTicks / 20).toFixed(1) + ' s)   trái: Steve gốc · phải: Gà R6 eo', 8, 21)
      const saved = cam.position.clone(); cam.position.set(2.6, 1.7, 4.6); cam.lookAt(0, 0.9, 0); grid.visible = true
      pick.forEach((pk, i) => { pose(B3, ga, Math.min(pk.tk, ga.durationTicks)); if (st) pose(A, st, Math.min(pk.tk, st.durationTicks)); ren.render(scene, cam)
        const X = (i % 2) * 400, Y = 30 + Math.floor(i / 2) * 400; x2.drawImage(ren.domElement, X, Y, 400, 400); x2.strokeStyle = '#999'; x2.strokeRect(X, Y, 400, 400)
        x2.fillStyle = 'rgba(0,0,0,.7)'; x2.fillRect(X, Y, 400, 22); x2.fillStyle = '#fff'; x2.font = '14px sans-serif'; x2.fillText('khung ' + (i + 1) + ' · tick ' + pk.tk + ' (' + (pk.tk / 20).toFixed(2) + ' s)' + (pk.why ? ' · ' + pk.why : ''), X + 6, Y + 16) })
      cam.position.copy(saved); cam.lookAt(0, 1, 0); window.__dbg.ctl.update(); img = c.toDataURL('image/jpeg', 0.82)
    }
    return { name: n, T, loi: L, score, khung: pick, img, coSteve: !!st }
  }, { n, khongAnh })
  if (r.img) writeFileSync(`${OUT}/${n}.jpg`, Buffer.from(r.img.split(',')[1], 'base64'))
  delete r.img; all.push(r); process.stdout.write(`${n} ${r.score} ${r.loi.map((x) => x.key).join(',')}\n`)
}
all.sort((a, b) => b.score - a.score)
writeFileSync(`${OUT}/so.json`, JSON.stringify(all, null, 1))
console.log('xong', all.length, 'động tác; có lỗi số:', all.filter((x) => x.loi.length).length)
await b.close()
