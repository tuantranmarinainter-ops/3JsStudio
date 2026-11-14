#!/usr/bin/env node
// gau-ke.mjs — dựng GẤU BÔNG TRÊN KỆ (tĩnh, ngồi) từ mẫu Roblox Creator Store cho engine/gau-ke.js:
//   thân + mắt mũi = mẫu 104566604295071 (gấu ngồi, 1 khối), NƠ = mượn của mẫu 8820218869 (mẫu thân không có nơ).
//   node tools/gau-ke.mjs dung      → assets/characters/rb/gau_ke/gau.glb (3 lưới: gau_long, gau_mat, gau_no; mông y=0, tâm xz=0, mặt nhìn +Z, 1 đơn vị = 1 stud)
//   node tools/gau-ke.mjs manifest  → in dòng manifest (JSON) để chèn vào assets/manifest.json
// Nguồn tải bằng tools/roblox.mjs (phiên Roblox giữ) vào .cache/gau-ke/<id>.glb; đã có thì không tải lại.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GAU_KE = {
  than: '104566604295071', no: '8820218869', ra: 'assets/characters/rb/gau_ke/gau.glb',
  // nơ trong mẫu 8820218869 (mặt nhìn −Z): 2 mảnh; đặt lên cổ gấu 104566604295071 (mặt nhìn +X, cổ ở y≈1,45, mép trước cổ x≈0,2)
  manhNo: /YumiBow|Cylinder/i, tyLeNo: 1.45, coThan: [0.3, 1.42, 0.02],
};

/** (x,y,z) quay −90° quanh Y: +X → +Z (cũng là −Z → +X). */
export const quay = ([x, y, z]) => [-z, y, x];
/** hộp bao của mảng toạ độ phẳng [x,y,z,…] */
export function hopBao(P) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); }
  return { mn, mx, tam: mn.map((v, k) => (v + mx[k]) / 2), cỡ: mn.map((v, k) => mx[k] - v) };
}
/** Đặt nơ: P (hệ mẫu nơ, mặt −Z) → hệ gấu thân (mặt +X): quay, phóng tyLe quanh tâm nơ, dời tâm nơ tới `co`. Trả mảng mới. */
export function datNo(P, tamNo, tyLe, co) {
  const ra = new Float32Array(P.length), t = quay(tamNo);
  for (let i = 0; i < P.length; i += 3) { const q = quay([P[i], P[i + 1], P[i + 2]]); for (let k = 0; k < 3; k++) ra[i + k] = (q[k] - t[k]) * tyLe + co[k]; }
  return ra;
}
export function dongManifest() {
  return {
    id: 'characters/rb/gau_ke', src: GAU_KE.ra, kind: 'prop', pack: 'roblox', license: 'Roblox Creator Store',
    url: `https://create.roblox.com/store/asset/${GAU_KE.than}`,
    credit: `Gấu bông trên kệ: thân "Teddy Bear Tool Plush Toy Stuffed Animal" (create.roblox.com/store/asset/${GAU_KE.than}); nơ mượn từ "Stuffed Toy Teddy Bear" (create.roblox.com/store/asset/${GAU_KE.no})`,
    note: 'dựng bằng tools/gau-ke.mjs dung; engine/gau-ke.js rải bằng InstancedMesh, đổi màu lông + nơ theo biến thể',
  };
}

async function docLuoi(io, file, loc) {
  const doc = await io.read(file), ra = [];
  for (const n of doc.getRoot().listNodes()) {
    const m = n.getMesh(); if (!m || (loc && !loc.test(n.getName()))) continue;
    const W = n.getWorldMatrix();
    for (const p of m.listPrimitives()) {
      const A = p.getAttribute('POSITION'), Nn = p.getAttribute('NORMAL'), c = A.getCount(), P = new Float32Array(c * 3), N = new Float32Array(c * 3), e = [];
      for (let i = 0; i < c; i++) {
        A.getElement(i, e); for (let k = 0; k < 3; k++) P[i * 3 + k] = W[k] * e[0] + W[4 + k] * e[1] + W[8 + k] * e[2] + W[12 + k];
        if (Nn) { Nn.getElement(i, e); const v = [0, 1, 2].map((k) => W[k] * e[0] + W[4 + k] * e[1] + W[8 + k] * e[2]), l = Math.hypot(...v) || 1; for (let k = 0; k < 3; k++) N[i * 3 + k] = v[k] / l; }
      }
      const I = p.getIndices() ? Uint32Array.from(p.getIndices().getArray()) : Uint32Array.from({ length: c }, (_, i) => i);
      ra.push({ ten: n.getName(), P, N, I });
    }
  }
  return ra;
}
const gop = (ds) => {
  const nv = ds.reduce((s, d) => s + d.P.length / 3, 0), P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), I = new Uint32Array(ds.reduce((s, d) => s + d.I.length, 0)); let vo = 0, io = 0;
  for (const d of ds) { P.set(d.P, vo * 3); N.set(d.N, vo * 3); for (const i of d.I) I[io++] = i + vo; vo += d.P.length / 3; }
  return { P, N, I };
};

async function dung() {
  const { NodeIO, Document } = await import('@gltf-transform/core'); const { weld, prune } = await import('@gltf-transform/functions');
  const io = new NodeIO(), tam = path.join(GOC, '.cache/gau-ke'); fs.mkdirSync(tam, { recursive: true });
  const nguon = (id) => { const f = path.join(tam, id + '.glb');
    if (!fs.existsSync(f)) { const r = spawnSync(process.execPath, [path.join(GOC, 'tools/roblox.mjs'), 'tai', id, '--ra', f], { cwd: GOC, stdio: 'inherit' }); if (r.status !== 0 || !fs.existsSync(f)) throw new Error('không tải được mẫu ' + id); }
    return f; };
  const than = await docLuoi(io, nguon(GAU_KE.than)), no = await docLuoi(io, nguon(GAU_KE.no), GAU_KE.manhNo);
  if (!than.length || !no.length) throw new Error('thiếu lưới thân hoặc nơ');
  const long = gop(than.filter((d) => !/eye|nose/i.test(d.ten))), mat = gop(than.filter((d) => /eye|nose/i.test(d.ten))), noG = gop(no);
  noG.P = datNo(noG.P, hopBao(noG.P).tam, GAU_KE.tyLeNo, GAU_KE.coThan);
  for (let i = 0; i < noG.N.length; i += 3) noG.N.set(quay([noG.N[i], noG.N[i + 1], noG.N[i + 2]]), i);
  // về hệ engine: +X → +Z, mông y=0, tâm xz theo thân
  const hb = hopBao(long.P), doc = new Document(), buf = doc.createBuffer(), sc = doc.createScene('gau_ke');
  for (const [ten, g, mau] of [['gau_long', long, [0.72, 0.5, 0.33, 1]], ['gau_mat', mat, [0.03, 0.03, 0.03, 1]], ['gau_no', noG, [0.9, 0.3, 0.3, 1]]]) {
    for (let i = 0; i < g.P.length; i += 3) { const q = quay([g.P[i] - hb.tam[0], g.P[i + 1] - hb.mn[1], g.P[i + 2] - hb.tam[2]]); g.P.set(q, i); g.N.set(quay([g.N[i], g.N[i + 1], g.N[i + 2]]), i); }
    const pr = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(g.P).setBuffer(buf)).setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(g.N).setBuffer(buf))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(g.I).setBuffer(buf)).setMaterial(doc.createMaterial(ten).setBaseColorFactor(mau).setRoughnessFactor(0.9).setMetallicFactor(0));
    sc.addChild(doc.createNode(ten).setMesh(doc.createMesh(ten).addPrimitive(pr)));
  }
  await doc.transform(weld(), prune());
  const ra = path.join(GOC, GAU_KE.ra); fs.mkdirSync(path.dirname(ra), { recursive: true }); await io.write(ra, doc);
  const tri = doc.getRoot().listMeshes().map((m) => m.getName() + ' ' + m.listPrimitives()[0].getIndices().getCount() / 3);
  console.log(`Đã ghi ${GAU_KE.ra} · ${(fs.statSync(ra).size / 1024).toFixed(0)} KB · tam giác: ${tri.join(', ')} · cao ${hb.cỡ[1].toFixed(2)} stud`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const lenh = process.argv[2];
  if (lenh === 'dung') await dung();
  else if (lenh === 'manifest') console.log(JSON.stringify(dongManifest(), null, 1));
  else console.log('Dùng: node tools/gau-ke.mjs dung | manifest');
}
