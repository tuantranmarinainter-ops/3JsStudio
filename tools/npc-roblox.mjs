#!/usr/bin/env node
// npc-roblox.mjs — lấy DIỆN MẠO một NPC R6 của Roblox Creator Store cho thân R6 của engine (engine/r6-roblox.js).
//   node tools/npc-roblox.mjs dung [tên…]     dựng assets/characters/rb/<tên>/ theo assets/characters/rb/nguon.json (không ghi tên = tất cả)
//   node tools/npc-roblox.mjs ke               liệt kê nguồn + trạng thái
// Mỗi nhân vật: look.json (màu thân, tác giả, có áo/quần/phụ kiện), shirt.png + pants.png (khuôn R6 585×559), acc.glb (tóc/mũ/kính, gốc toạ độ = TÂM ĐẦU, stud).
// nguon.json: { "<tên>": { "id": "<robloxId>", "nv": <số thứ tự nhân vật trong pack, từ 0>, "ao": "<tên khác>" (lấy áo+quần của nhân vật khác trong file này),
//                          "dau": "<tên khác>" (lấy màu thân + phụ kiện của nhân vật khác), "them": { …tuỳ chọn r6-rig ghi đè: hair, acc, scale, wide… }, "moTa": "…" } }
// Không tự sửa assets/manifest.json: in sẵn các dòng cần thêm (lệnh `manifest`).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KHO = path.join(ROOT, 'assets', 'characters', 'rb');
const TAM = path.join(ROOT, 'output', 'npc-roblox', 'tam');
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const chay = (args) => spawnSync('node', [path.join(ROOT, 'tools', 'roblox.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 600000 });

export const hex = (c) => '#' + c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
/** bodyColors của dump (sRGB 0..1) → { head, torso, leftArm, rightArm, leftLeg, rightLeg } dạng #rrggbb; thiếu → vàng Roblox cổ điển. */
export function mauThan(bc) {
  const ra = {}, md = { head: '#f5cd30', torso: '#0d69ac', leftArm: '#f5cd30', rightArm: '#f5cd30', leftLeg: '#a4bd47', rightLeg: '#a4bd47' };
  for (const k of Object.keys(md)) ra[k] = bc && Array.isArray(bc[k]) ? hex(bc[k]) : md[k];
  return ra;
}
/** Đường dẫn cho `roblox.mjs tai --nhan-vat`: nhân vật thứ k trùng path thì thêm #n (đếm từ 1 trong các nhân vật cùng path). */
export function duongNhanVat(nhanVat, k) {
  const n = nhanVat[k]; if (!n) return null;
  const cung = nhanVat.filter((x) => x.path === n.path);
  return cung.length > 1 ? `${n.path}#${cung.indexOf(n) + 1}` : n.path;
}

function docDump(id) {
  const f = path.join(ROOT, '.cache', 'roblox', String(id), 'dump.json');
  if (!fs.existsSync(f) || !('nhanVat' in J(f))) { const r = chay(['xem', String(id)]); if (!fs.existsSync(f)) throw new Error(`xem ${id}: ${(r.stderr || r.stdout || '').trim().split('\n').pop()}`); }
  return J(f);
}
function taiAnh(id, ra) {
  fs.mkdirSync(path.dirname(ra), { recursive: true });
  const r = chay(['anh', String(id), '--ra', ra]);
  const m = (r.stdout || '').match(/Đã ghi (.+?) \((\d+)×(\d+)/);
  if (!m) return { loi: ((r.stderr || '') + (r.stdout || '')).trim().split('\n').pop().slice(0, 200) };
  return { file: path.resolve(ROOT, m[1].trim()), w: +m[2], h: +m[3] };
}

const THAN = /^(Head|Torso|Left Arm|Right Arm|Left Leg|Right Leg|HumanoidRootPart)(\.\d+)?$/;
/** GLB một nhân vật (roblox.mjs tai --nhan-vat) → chỉ giữ phụ kiện (node "Handle…"), dời gốc về tâm đầu. Trả { soNode, tamGiac } hoặc null nếu không có phụ kiện. */
export async function tachPhuKien(glbVao, glbRa) {
  const { NodeIO } = await import('@gltf-transform/core');
  const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
  const { prune, getBounds } = await import('@gltf-transform/functions');
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(glbVao), root = doc.getRoot(), scene = root.listScenes()[0];
  const nodes = scene.listChildren();
  const dau = nodes.find((n) => n.getName() === 'Head');
  if (!dau) throw new Error('GLB không có node Head');
  const b = getBounds(dau), tam = [0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2);
  let so = 0, tg = 0;
  for (const n of nodes) {
    // giữ mọi mảnh KHÔNG phải thân (Accessory "Handle", mũ kiểu cũ là Part thường như "Chef Hat") nằm quanh đầu; bỏ đồ đeo ở chân/hông
    const ten = n.getName(), nb = n === dau ? null : getBounds(n), c = nb && [0, 1, 2].map((i) => (nb.min[i] + nb.max[i]) / 2 - tam[i]);
    const laThan = THAN.test(ten) || /_decal(\.\d+)?$/.test(ten);
    if (laThan || !c || Math.abs(c[0]) > 1.6 || Math.abs(c[2]) > 1.6 || c[1] < -1.1 || c[1] > 2.6) { scene.removeChild(n); n.dispose(); continue; }
    const t = n.getTranslation(); n.setTranslation([t[0] - tam[0], t[1] - tam[1], t[2] - tam[2]]); so++;
    for (const p of n.getMesh()?.listPrimitives() || []) tg += (p.getIndices()?.getCount() || p.getAttribute('POSITION').getCount()) / 3;
  }
  if (!so) return null;
  await doc.transform(prune());
  fs.mkdirSync(path.dirname(glbRa), { recursive: true });
  await io.write(glbRa, doc);
  return { soNode: so, tamGiac: Math.round(tg), dauCao: +(b.max[1] - b.min[1]).toFixed(3), dauRong: +(b.max[0] - b.min[0]).toFixed(3) };
}

async function dungMot(ten, ng, tatCa) {
  const dir = path.join(KHO, ten); fs.mkdirSync(dir, { recursive: true });
  const canhBao = [];
  const lay = (id, k = 0) => { const d = docDump(id), nv = d.nhanVat?.[k]; if (!nv) throw new Error(`mẫu ${id} không có nhân vật thứ ${k}`); return { d, nv }; };
  const nDau = ng.dau ? tatCa[ng.dau] : ng, nAo = ng.ao ? tatCa[ng.ao] : ng;
  if (!nDau || !nAo) throw new Error(`"${ten}": tham chiếu dau/ao không có trong nguon.json`);
  const D = lay(nDau.id, nDau.nv || 0), A = nAo === nDau ? D : lay(nAo.id, nAo.nv || 0);
  if (D.nv.rigType !== 0) canhBao.push('không phải R6 (rigType ' + D.nv.rigType + ')');
  if ((D.nv.characterMeshes || []).length) canhBao.push('có CharacterMesh (thân lưới riêng) — bỏ, dùng khối R6');
  // màu thân: ưu tiên màu CỦA PART (đúng như ảnh xem trước), thiếu mới dùng BodyColors
  const mauPart = (X) => { const ra = {}, refs = new Set(X.nv.partRefs || []); for (const p of X.d.parts) { if (!(refs.size ? refs.has(p.ref) : p.path === X.nv.path)) continue;
    const k = { Head: 'head', Torso: 'torso', 'Left Arm': 'leftArm', 'Right Arm': 'rightArm', 'Left Leg': 'leftLeg', 'Right Leg': 'rightLeg' }[p.name]; if (k && !ra[k]) ra[k] = p.color; } return { ...(X.nv.bodyColors || {}), ...ra }; };
  const look = { ten, robloxId: String(nDau.id), nhanVat: D.nv.ten, mau: mauThan(mauPart(D)), shirt: false, pants: false, tshirt: false, acc: null, phuKien: (D.nv.accessories || []).map((a) => a.ten) };
  if (nAo !== nDau) { look.aoTu = String(nAo.id); const mA = mauThan(mauPart(A)); for (const k of ['torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']) if (k === 'torso' || k.endsWith('Leg')) look.mau[k] = mA[k]; }
  for (const [k, f] of [['shirt', 'shirt.png'], ['pants', 'pants.png'], ['tshirt', 'tshirt.png']]) {
    const id = A.nv[k]; if (!id) continue;
    const r = taiAnh(id, path.join(TAM, `${ten}-${k}.png`));
    if (r.loi) { canhBao.push(`${k} ${id}: ${r.loi}`); continue; }
    if (k !== 'tshirt' && (r.w !== 585 || r.h !== 559)) canhBao.push(`${k} ${id}: cỡ ${r.w}×${r.h} (khuôn chuẩn 585×559) — sẽ co giãn`);
    if (!/\.png$/i.test(r.file)) { canhBao.push(`${k} ${id}: không phải PNG (${path.extname(r.file)}) — bỏ`); continue; }
    fs.copyFileSync(r.file, path.join(dir, f)); look[k] = true; look[k + 'Id'] = String(id);
  }
  {
    const glb = path.join(TAM, `${ten}.glb`), nvPath = duongNhanVat(D.d.nhanVat, nDau.nv || 0);
    const r = chay(['tai', String(nDau.id), '--nhan-vat', nvPath, '--ra', glb]);
    const ra = (r.stdout || '') + (r.stderr || '');
    for (const l of ra.split('\n')) if (/403|từ chối|riêng tư/.test(l)) canhBao.push(l.trim().replace(/^- /, '').slice(0, 160));
    if (!fs.existsSync(glb)) canhBao.push('tải GLB phụ kiện lỗi: ' + ra.trim().split('\n').pop().slice(0, 160));
    else { const pk = await tachPhuKien(glb, path.join(dir, 'acc.glb')); if (pk) look.acc = pk; }
  }
  try { const t = J(path.join(ROOT, '.cache', 'roblox', String(nDau.id), 'tim.json')); look.tieuDe = t.ten; look.tacGia = t.tacGia; } catch {}
  if (ng.them) look.them = ng.them;
  if (ng.moTa) look.moTa = ng.moTa;
  if (canhBao.length) look.canhBao = canhBao;
  fs.writeFileSync(path.join(dir, 'look.json'), JSON.stringify(look, null, 1) + '\n');
  return look;
}

/** Dòng manifest cho một nhân vật đã dựng. */
export function dongManifest(look) {
  const url = `https://create.roblox.com/store/asset/${look.robloxId}`;
  return { id: `characters/rb/${look.ten}`, src: `assets/characters/rb/${look.ten}/look.json`, source: `create.roblox.com/store/asset/${look.robloxId}`, url, title: look.tieuDe || look.nhanVat, author: look.tacGia || '?',
    license: 'Roblox Creator Store', credit: `"${look.tieuDe || look.nhanVat}" by ${look.tacGia || '?'} (${url}), Roblox Creator Store${look.aoTu ? ` — áo quần từ https://create.roblox.com/store/asset/${look.aoTu}` : ''}`,
    scale: 1, loai: 'nhan-vat', files: ['look.json', ...(look.shirt ? ['shirt.png'] : []), ...(look.pants ? ['pants.png'] : []), ...(look.tshirt ? ['tshirt.png'] : []), ...(look.acc ? ['acc.glb'] : [])] };
}

async function main() {
  const [lenh, ...ten] = process.argv.slice(2);
  const fNguon = path.join(KHO, 'nguon.json');
  if (!lenh || !fs.existsSync(fNguon)) { console.log('Dùng: node tools/npc-roblox.mjs dung [tên…] | ke | manifest   (nguồn: assets/characters/rb/nguon.json)'); process.exit(lenh ? 1 : 0); }
  const ng = J(fNguon), ds = (ten.length ? ten : Object.keys(ng)).filter((t) => ng[t] || (console.log('không có trong nguon.json:', t), false));
  if (lenh === 'ke') { for (const t of Object.keys(ng)) { const f = path.join(KHO, t, 'look.json'); const l = fs.existsSync(f) ? J(f) : null; console.log(t.padEnd(12), String(ng[t].id || '→' + (ng[t].dau || '')).padEnd(16), l ? `áo ${l.shirt ? '✓' : '—'} quần ${l.pants ? '✓' : '—'} phụ kiện ${l.acc ? l.acc.soNode : 0}${l.canhBao ? ' ⚠ ' + l.canhBao.length : ''}` : 'CHƯA DỰNG'); } return; }
  if (lenh === 'manifest') { console.log(JSON.stringify(ds.filter((t) => fs.existsSync(path.join(KHO, t, 'look.json'))).map((t) => dongManifest(J(path.join(KHO, t, 'look.json')))), null, 1)); return; }
  if (lenh !== 'dung') { console.log('lệnh lạ:', lenh); process.exit(1); }
  let loi = 0;
  for (const t of ds) {
    try { const l = await dungMot(t, ng[t], ng); console.log(`${t}: áo ${l.shirt ? '✓' : '—'} quần ${l.pants ? '✓' : '—'} phụ kiện ${l.acc ? l.acc.soNode + ' (' + l.acc.tamGiac + ' tam giác)' : 0}${l.canhBao ? '\n  ⚠ ' + l.canhBao.join('\n  ⚠ ') : ''}`); }
    catch (e) { loi++; console.log(`${t}: LỖI ${String(e.message).slice(0, 200)}`); }
  }
  process.exit(loi ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
