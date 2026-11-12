// engine/props-kb.js: sổ đạo cụ theo kịch bản (PROPS_KB), đặt đạo cụ (datDaoCu), gắn vào shot (ganDaoCu), nhóm diễn viên (noiNhom).
// Chạy trong Node (three không cần trình duyệt; chữ canvas tự bỏ khi không có document).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from '../../vendor/three/three.module.js';
import { PROPS_KB, PROP_INFO, PROP_SLOTS, buildPropsKB, datDaoCu, ganDaoCu, noiNhom, tenNoi } from '../../engine/props-kb.js';
import { khoaPropsKb } from '../kb/asset-plan.mjs';
import { expandShots, resolvePlaces } from '../../engine/shottypes.js';

const root = path.resolve(import.meta.dirname, '..', '..');
const EP002 = ['ke_trong', 'o_khoa', 'hoc_quay', 'hop_nhan', 'thung_dau_gau', 'ke_phong_ga', 'anh_ba', 'dong_ho', 'guong', 'cuon_sach', 'nhan_moi',
  'bang_chuyen', 'ke_gau', 'ban_do', 'ket_tien', 'day_chuyen', 'chuong', 'chan_tran', 'ket_ga', 'bang_tin', 'thung_tiem_bach', 'vi', 'tui_tien',
  'doi_dep', 'thung_go', 'hang_rao'];

test('PROPS_KB có đủ đạo cụ ep002, PROP_INFO cho mỗi khoá; asset-plan đọc được khoá', () => {
  for (const k of EP002) { assert.equal(typeof PROPS_KB[k], 'function', k); assert.ok(PROP_INFO[k]?.size?.length === 3, k); }
  const keys = khoaPropsKb(fs.readFileSync(path.join(root, 'engine', 'props-kb.js'), 'utf8'));
  for (const k of EP002) assert.ok(keys.includes(k), 'khoaPropsKb thiếu ' + k);
  assert.deepEqual(keys.sort(), Object.keys(PROPS_KB).sort());
});

test('mỗi đạo cụ: Group có tên, đúng kích thước PROP_INFO (±30%), gốc ở đáy, có màu (không xám đơn)', () => {
  const objs = buildPropsKB(THREE, Object.keys(PROPS_KB));
  const box = new THREE.Box3(), sz = new THREE.Vector3(), loi = [];
  for (const [k, o] of Object.entries(objs)) {
    if (o.name !== k) loi.push(`${k}: tên ${o.name}`);
    box.setFromObject(o); box.getSize(sz);
    const [w, h, d] = PROP_INFO[k].size;
    for (const [a, b, ax] of [[sz.x, w, 'w'], [sz.y, h, 'h'], [sz.z, d, 'd']]) if (Math.abs(a - b) > Math.max(0.3 * b, 0.12)) loi.push(`${k}.${ax}: đo ${a.toFixed(2)} ≠ ${b}`);
    if (Math.abs(box.min.y) >= 0.05) loi.push(`${k}: đáy ${box.min.y.toFixed(2)} ≠ 0`);
    const colors = new Set();
    o.traverse((m) => { if (m.isMesh && m.material?.color) colors.add(m.material.color.getHexString()); });
    if (colors.size < 2) loi.push(`${k}: chỉ ${colors.size} màu`);
  }
  assert.deepEqual(loi, []);
});

test('buildPropsKB: nhận { tên: { kit } }, kit lạ → giữ chỗ có màu + cảnh báo, kit propKit qua K', () => {
  const K = { table: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: '#a33' }))); return g; } };
  const warn = [];
  const o = buildPropsKB(THREE, { a: { kit: 'dong_ho' }, b: { kit: 'table' }, c: { kit: 'khong_co' } }, { K, warn: (m) => warn.push(m) });
  assert.equal(o.a.name, 'a'); assert.equal(o.b.name, 'b'); assert.equal(o.c.name, 'c');
  assert.ok(warn.some((m) => /khong_co/.test(m)));
});

const PLACES = resolvePlaces({ bakery: { pos: [18, 0, -6], ry: 0 }, bedroom_in: { pos: [4, 0, 3], ry: 0 } }, { home: { pos: [-20, 0, 10], ry: Math.PI / 2 }, street: { pos: [0, 0, 30], ry: 0 } });
const ENVS = ['kenneyTown', 'bedroom', 'factory'];
const EPP = {
  ke_trong: { kit: 'ke_trong', at: 'home' }, o_khoa: { kit: 'o_khoa', at: 'home' },
  hop_nhan: { kit: 'hop_nhan', at: 'bakery' },
  ke_phong_ga: { kit: 'ke_phong_ga', at: 'bedroom' }, dong_ho: { kit: 'dong_ho', at: 'bedroom', on: 'ke_phong_ga' },
  anh_ba: { kit: 'anh_ba', at: 'bedroom' }, guong: { kit: 'guong', at: 'bedroom' },
  ban_do: { kit: 'ban_do', at: 'factory' }, ket_tien: { kit: 'ket_tien', at: 'factory' }, day_chuyen: { kit: 'day_chuyen', at: 'factory', on: 'ket' },
  vi: { kit: 'vi', at: 'street', hold: true }, tay: { kit: 'dong_ho', at: 'street', pos: [1, 2, 3], ry: 0.5 },
};

test('datDaoCu: tất định, env → parent room + chỗ riêng, thị trấn → trước nhà lệch nhau, đồ nhỏ có bàn bày, on → mặt đỡ', () => {
  const d = datDaoCu(EPP, PLACES, { townEnv: 'kenneyTown', envs: ENVS });
  assert.deepEqual(d, datDaoCu(EPP, PLACES, { townEnv: 'kenneyTown', envs: ENVS }));
  assert.equal(d.ke_phong_ga.parent, 'room');
  assert.deepEqual(d.ke_phong_ga.pos.slice(0, 3), PROP_SLOTS.bedroom.byName.ke_phong_ga.slice(0, 3));
  assert.equal(d.ke_trong.parent, undefined);
  const dx = Math.hypot(d.ke_trong.pos[0] - d.o_khoa.pos[0], d.ke_trong.pos[2] - d.o_khoa.pos[2]);
  assert.ok(dx >= (PROP_INFO.ke_trong.size[0] + PROP_INFO.o_khoa.size[0]) / 2, 'hai đạo cụ cùng nơi chồng nhau: ' + dx);
  for (const k of ['ke_trong', 'o_khoa']) assert.ok(Math.hypot(d[k].pos[0] + 20, d[k].pos[2] - 10) < 14, k + ' xa địa điểm');
  assert.equal(d.hop_nhan.stand, 'table');                // đồ nhỏ ở thị trấn: bàn bày cao ngang quầy
  assert.ok(d.hop_nhan.look[1] > 2.4);
  assert.ok(d.dong_ho.pos[1] > 1, 'đồng hồ phải nằm trên kệ: y=' + d.dong_ho.pos[1]);
  assert.ok(Math.hypot(d.dong_ho.pos[0] - d.ke_phong_ga.pos[0], d.dong_ho.pos[2] - d.ke_phong_ga.pos[2]) < 3);
  assert.ok(d.anh_ba.pos[1] > 1, 'ảnh bà (đồ để mặt phẳng) lên kệ cùng phòng');
  assert.ok(Math.abs(d.day_chuyen.pos[1] - PROP_INFO.ket_tien.size[1]) < 0.05, 'dây chuyền trên nắp két');
  assert.deepEqual(d.tay.pos, [1, 2, 3]); assert.equal(d.tay.ry, 0.5);
  assert.ok(d.ban_do.pos[1] > 2, 'bản đồ treo tường');
});

test('coSan: đạo cụ env đã dựng sẵn → mốc rỗng cùng tên ở byName (không dựng trùng)', () => {
  const ep = { bang_chuyen: { kit: 'bang_chuyen', at: 'factory' }, chuong: { kit: 'chuong', at: 'factory' } };
  const d = datDaoCu(ep, {}, { townEnv: 'kenneyTown', envs: ['factory'] });
  assert.equal(d.bang_chuyen.coSan, true);
  assert.deepEqual(d.bang_chuyen.pos, PROP_SLOTS.factory.byName.bang_chuyen.slice(0, 3));
  const o = buildPropsKB(THREE, ep, { dat: d });
  let n = 0; o.bang_chuyen.traverse((m) => { if (m.isMesh) n++; });
  assert.equal(n, 0); assert.equal(o.bang_chuyen.name, 'bang_chuyen');
  let k = 0; o.chuong.traverse((m) => { if (m.isMesh) k++; });
  assert.ok(k > 0);
});

const SH = [
  { id: 's001', dur: 1.5, type: 'establish', at: 'street' },
  { id: 's002', dur: 1.5, type: 'insert', at: 'home', obj: 'ke_trong' },
  { id: 's003', dur: 1.5, type: 'closeup', who: 'hero', at: 'home' },
  { id: 's004', dur: 1.5, type: 'insert', env: 'bedroom', at: 'bedroom_in', obj: 'dong_ho' },
  { id: 's005', dur: 1.5, type: 'closeup', who: 'bap', stance: 'sitting', anim: 'sit' },
  { id: 's006', dur: 1.5, type: 'insert', who: 'bap', obj: 'guong' },
  { id: 's007', dur: 1.5, type: 'walkBy', who: 'bap', with: ['bear2', 'bear3'], group: 'bears', anim: 'run', env: 'kenneyTown', at: 'street', cast: { bear2: { hold: 'vi' } } },
  { id: 's008', dur: 1.5, type: 'insertRead', env: 'factory', at: 'factory_in', read: 'ban_do' },
  { id: 's009', dur: 1.5, type: 'establish', env: 'kenneyTown', at: 'street' },
  { id: 's010', dur: 1.5, type: 'insert', env: 'bedroom', at: 'bedroom_in' },
];
const ACT = { hero: { ga: 1 }, bap: { bear: 1 }, bear2: { bear: 1 }, bear3: { bear: 1 } };

test('ganDaoCu: hiện đúng nơi/khối cảnh, camera insert nhắm vật, gấu cạnh vật, insertRead có look + w', () => {
  const dat = datDaoCu(EPP, { ...PLACES, factory_in: { pos: [0, 0, 0], ry: 0 } }, { townEnv: 'kenneyTown', envs: ENVS });
  const out = ganDaoCu(SH, { props: EPP, dat, actors: ACT, townEnv: 'kenneyTown', envs: ENVS });
  assert.notEqual(out, SH); assert.equal(SH[1].cam, undefined, 'không sửa SHOTS gốc');
  const vis = (i) => Object.keys(out[i].props || {}).sort();
  assert.deepEqual(vis(0), []);                                    // phố: không có đạo cụ của nhà/phòng
  assert.deepEqual(vis(1), ['ke_trong', 'o_khoa']);                // o_khoa cố định cùng nơi
  assert.deepEqual(vis(2), ['ke_trong', 'o_khoa']);
  assert.ok(vis(3).includes('dong_ho') && vis(3).includes('ke_phong_ga') && vis(3).includes('guong'));
  assert.ok(vis(4).includes('dong_ho'), 'cùng khối cảnh phòng → vẫn hiện');
  assert.ok(!vis(6).includes('vi'), 'vật chỉ được cầm không đặt ra phố');
  assert.ok(!vis(9).includes('dong_ho'), 'khối cảnh phòng khác không dùng đồng hồ → giấu');
  assert.ok(vis(9).includes('ke_phong_ga'), 'đồ cố định luôn hiện ở phòng');
  assert.equal(out[3].props.dong_ho.parent, 'room');
  assert.equal(out[1].cam.at, 'obj:ke_trong');
  assert.ok(out[1].cam.look[1] > 1 && out[1].cam.dist2 < out[1].cam.dist);
  assert.ok(Array.isArray(out[5].cast.bap.at), 'gấu đứng cạnh gương');
  assert.ok(Array.isArray(out[5].cam.at), 'camera khung cả gấu + gương');
  assert.equal(out[7].w, PROP_INFO.ban_do.size[0]);
  assert.ok(out[7].cam.look[1] > 0);
  assert.equal(tenNoi(out, 3, { townEnv: 'kenneyTown' }), 'bedroom');
});

test('noiNhom: nhóm chạy cùng nhau lệch pha, stance vào cast, camera trong phòng không vượt camMax', () => {
  const dat = datDaoCu(EPP, { ...PLACES, factory_in: { pos: [0, 0, 0], ry: 0 } }, { townEnv: 'kenneyTown', envs: ENVS });
  const raw = ganDaoCu(SH, { props: EPP, dat, actors: ACT, townEnv: 'kenneyTown', envs: ENVS });
  const ex = noiNhom(expandShots(raw, { places: { ...PLACES, factory_in: { pos: [0, 0, 0], ry: 0 } }, crowd: [], env: 'kenneyTown', light: 'day', fps: 30 }));
  const w = ex[6].cast;
  for (const m of ['bear2', 'bear3']) {
    assert.ok(w[m].to, m + ' phải chạy (có to)');
    assert.equal(w[m].anim, 'run');
    assert.ok(Math.hypot(w[m].at[0] - w.bap.at[0], w[m].at[2] - w.bap.at[2]) > 1.5, m + ' trùng chỗ Bắp');
  }
  assert.equal(w.bear2.hold, 'vi', 'giữ hold của cast ghi trong shot');
  assert.equal(ex[4].cast.bap.stance, 'sitting');
  const max = PROP_SLOTS.bedroom.camMax;
  for (const i of [3, 4, 5, 9]) if (typeof ex[i].cam.dist === 'number') assert.ok(ex[i].cam.dist <= max + 1e-6 && (ex[i].cam.dist2 ?? 0) <= max + 1e-6, ex[i].id + ' camera ra ngoài phòng');
});
