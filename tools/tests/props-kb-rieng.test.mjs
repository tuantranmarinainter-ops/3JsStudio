// Đạo cụ "dựng riêng" ep002 (engine/props-kb.js + props-glb.js + episodes/ep002/episode.js): bảng hiệu, thùng nhà máy, bàn tiệm may, đèn cửa, bản đồ.
// Node (không canvas → bỏ chữ; không GLB): kiểm đặt chỗ, không chồng nhau, hộp nhẫn nằm TRÊN mặt bàn, tất định.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three/three.module.js';
import { PROPS_KB, PROP_INFO, PROP_SLOTS, buildPropsKB, datDaoCu } from '../../engine/props-kb.js';
import { GLB_KIT } from '../../engine/props-glb.js';
import { EPISODE } from '../../episodes/ep002/episode.js';
import { resolvePlaces } from '../../engine/shottypes.js';

const MOI = ['thung_dan_mat', 'thung_bach_giau', 'bang_hieu_tiem_gau', 'bang_hieu_tiem_banh', 'bang_hieu_tiem_may', 'bang_hieu_thi_truong', 'bang_hieu_banh_mi', 'bang_hieu_treo', 'ban_tiem_may', 'den_cua'];
const places = resolvePlaces(EPISODE.places, { square: { pos: [0, 0, 6], ry: 0 } });
const dat = datDaoCu(EPISODE.props, places, { townEnv: 'kenneyTown', envs: ['bedroom', 'factory'] });
const rect = (n) => { const d = dat[n], [w, , s] = d.size, c = Math.abs(Math.cos(d.ry)), sn = Math.abs(Math.sin(d.ry)); const hx = (w * c + s * sn) / 2, hz = (w * sn + s * c) / 2; return [d.pos[0] - hx, d.pos[0] + hx, d.pos[2] - hz, d.pos[2] + hz]; };
const giao = (a, b) => a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3];

test('10 đạo cụ riêng: có kit + PROP_INFO + khai ở EPISODE.props; kit GLB khai trong GLB_KIT', () => {
  for (const k of MOI) { assert.equal(typeof PROPS_KB[k], 'function', k); assert.ok(PROP_INFO[k], k); assert.ok(EPISODE.props[k], 'EPISODE.props thiếu ' + k); }
  for (const k of ['ban_tiem_may', 'den_cua', 'bang_hieu_treo', 'thung_dan_mat', 'thung_bach_giau']) assert.ok(GLB_KIT[k], 'GLB_KIT thiếu ' + k);
});

test('bảng hiệu đúng nhà (theo places/vai), không chồng nhau, không chồng đạo cụ khác cùng nơi', () => {
  const nha = { bang_hieu_tiem_gau: 'bearshop', bang_hieu_treo: 'bearshop', bang_hieu_tiem_banh: 'bakery', bang_hieu_banh_mi: 'bakery', bang_hieu_tiem_may: 'tailor', bang_hieu_thi_truong: 'mayor', den_cua: 'mayor' };
  for (const [k, loc] of Object.entries(nha)) assert.equal(dat[k].loc, loc, k);
  assert.deepEqual(EPISODE.town.vai.sort(), ['bakery', 'bearshop', 'mayor', 'tailor']);
  const ten = Object.keys(dat).filter((n) => !dat[n].parent && PROP_INFO[EPISODE.props[n].kit]?.base === 'floor');
  const loi = [];
  for (const a of ten) for (const b of ten) if (a < b && (MOI.includes(a) || MOI.includes(b)) && giao(rect(a), rect(b))) loi.push(a + ' ∩ ' + b);
  assert.deepEqual(loi, []);
});

test('hộp nhẫn nằm TRÊN mặt bàn tiệm may (cùng nơi, trong khung bàn, y = mặt bàn)', () => {
  const b = dat.ban_tiem_may, h = dat.hop_nhan, I = PROP_INFO.ban_tiem_may;
  assert.equal(b.loc, 'tailor'); assert.equal(h.loc, 'tailor'); assert.equal(h.stand, null);
  assert.ok(Math.abs(h.pos[1] - (b.pos[1] + I.surfaces[0][1])) < 0.01, 'y hộp ' + h.pos[1]);
  const r = rect('ban_tiem_may'); assert.ok(h.pos[0] > r[0] && h.pos[0] < r[1] && h.pos[2] > r[2] && h.pos[2] < r[3]);
});

test('nhà máy: 2 cụm thùng riêng ở byName, parent room, không trùng nhau và không nằm trong hộp env dựng sẵn', () => {
  for (const k of ['thung_dan_mat', 'thung_bach_giau']) { assert.ok(PROP_SLOTS.factory.byName[k], k); assert.equal(dat[k].parent, 'room'); assert.ok(!dat[k].coSan); }
  assert.ok(!giao(rect('thung_dan_mat'), rect('thung_bach_giau')));
  assert.ok(!giao(rect('thung_dan_mat'), [14.2, 23.5, -11.9, -2.5]), 'chồng carton_pile của env');
  assert.ok(!giao(rect('thung_bach_giau'), [-21.2, -12.8, 3.6, 8.4]), 'chồng carton_neat của env');
});

test('dựng tất định: hai lần dựng cho cùng hộp bao; thùng có nhãn + dấu gấu (decal) ở nhóm doc', () => {
  const dung = () => buildPropsKB(THREE, Object.fromEntries(MOI.map((k) => [k, { kit: k }])));
  const A = dung(), B = dung();
  for (const k of MOI) { const a = new THREE.Box3().setFromObject(A[k]), b = new THREE.Box3().setFromObject(B[k]); assert.deepEqual(a.min.toArray(), b.min.toArray(), k); assert.deepEqual(a.max.toArray(), b.max.toArray(), k); }
  for (const k of ['thung_dan_mat', 'thung_bach_giau']) { let n = 0; A[k].traverse((m) => { if (m.isMesh && /_dan\d+$/.test(m.name)) n++; }); assert.ok(n >= 5, k + ' thiếu decal: ' + n); }
});
