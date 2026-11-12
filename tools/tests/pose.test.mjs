import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chonMoHinh, ungVien, clipChoPose } from '../kb/chon-mo-hinh.mjs';
import { kiemPose, docGlbFs, suyPose, CLIP_TRANG_TRI } from '../kiem/pose.mjs';
import { ghiPose } from '../manifest-pose.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'task11-'));

function glb(json) {
  let j = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, ...json }));
  j = Buffer.concat([j, Buffer.alloc((4 - j.length % 4) % 4, 0x20)]);
  const h = Buffer.alloc(20);
  h.write('glTF', 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(20 + j.length, 8);
  h.writeUInt32LE(j.length, 12); h.writeUInt32LE(0x4E4F534A, 16);
  return Buffer.concat([h, j]);
}

const M = [
  { id: 'a/bird-sit', title: 'Bird', pose: 'sitting', anim: ['sit'] },
  { id: 'a/bird-fly', title: 'Bird', pose: 'flying', anim: ['fly', 'glide'] },
  { id: 'a/penguin', title: 'Pingüino', pose: 'standing' },
  { id: 'a/rock', title: 'Rock' },
];

test('chonMoHinh: chim bay -> entry bay; không có -> null', () => {
  assert.equal(chonMoHinh(M, { loai: 'bird', pose: 'flying' }).id, 'a/bird-fly');
  assert.equal(chonMoHinh(M, { loai: 'BIRD', pose: 'sitting' }).id, 'a/bird-sit');
  assert.equal(chonMoHinh(M, { loai: 'bird', pose: 'swimming' }), null);
  assert.equal(chonMoHinh(M, { loai: 'whale', pose: 'swimming' }), null);
  assert.equal(chonMoHinh(M, { loai: 'bird', pose: 'flying', anim: 'glide' }).id, 'a/bird-fly');
  assert.equal(chonMoHinh(M, { loai: 'bird', pose: 'flying', anim: 'dive' }), null);
});
test('chonMoHinh: không phân biệt dấu, tất định theo thứ tự', () => {
  assert.equal(chonMoHinh(M, { loai: 'pinguino' }).id, 'a/penguin');
  assert.equal(chonMoHinh(M, { loai: 'bird' }).id, 'a/bird-sit');
  assert.deepEqual(ungVien(M, { loai: 'bird' }).map((e) => e.id), ['a/bird-sit', 'a/bird-fly']);
});

test('kiemPose: manifest giả có đúng 1 bad, 1 warn, đếm thiếu', () => {
  const man = [
    { id: 'x', src: 'x.glb' },                          // anim, thiếu pose -> bad
    { id: 'y', src: 'y.glb', pose: 'flying', anim: ['fly', 'khong-co'] }, // warn
    { id: 'z', src: 'z.glb' },                          // tĩnh
    { id: 'w', src: 'w.glb' },                          // thiếu file
  ];
  const f = { 'x.glb': { anims: ['A'], coSkin: false }, 'y.glb': { anims: ['fly'], coSkin: true }, 'z.glb': { anims: [], coSkin: false } };
  const r = kiemPose(man, (s) => f[s] || null);
  assert.equal(r.bad.length, 1); assert.match(r.bad[0], /x/);
  assert.equal(r.warn.length, 1); assert.match(r.warn[0], /khong-co/);
  assert.equal(r.thieu, 1);
});

test('docGlbFs đọc animation + skin từ GLB giả', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'a.glb'), glb({ animations: [{ name: 'Fly' }, {}], skins: [{}] }));
  fs.writeFileSync(path.join(d, 'b.glb'), glb({ meshes: [] }));
  const doc = docGlbFs(d);
  assert.deepEqual(doc('a.glb'), { anims: ['Fly', 'animation_1'], coSkin: true });
  assert.deepEqual(doc('b.glb'), { anims: [], coSkin: false });
  assert.equal(doc('c.glb'), null);
});

const GULL = { id: 'polyfork/herring-gull', title: 'Herring Gull', pose: ['standing', 'flying'], anim: ['Idle', 'Walk', 'Fly'], animTheoPose: { standing: 'Idle', flying: 'Fly' } };
const TREE = { id: 'polyfork/spruce', src: 't.glb', title: 'Spruce Tree', anim: ['tick'] };

test('suyPose: theo từng clip, theo từ, thứ tự cố định', () => {
  const g = suyPose({ id: 'x/gull', title: 'Gull' }, { anims: ['Fly', 'Run', 'Idle', 'Walk'], coSkin: true });
  assert.deepEqual(g.pose, ['standing', 'flying']);
  assert.deepEqual(g.animTheoPose, { standing: 'Idle', flying: 'Fly' });
  const f = suyPose({ id: 'sea/fish1', title: 'Fish' }, { anims: ['Armature|Swim'], coSkin: true });
  assert.deepEqual(f.pose, ['swimming']);
  assert.deepEqual(suyPose({ id: 'x', title: 'x' }, { anims: ['Idle_Sit', 'Wing_Flap'], coSkin: true }).pose, ['standing', 'sitting', 'flying']);
  assert.deepEqual(suyPose({ id: 'x', title: 'x' }, { anims: ['Swimming_x', 'Glide'], coSkin: true }).pose, ['flying']); // "Swimming" không phải từ "swim"
});
test('suyPose: không clip nào khớp -> suy từ id/title theo từ', () => {
  const k = suyPose({ id: 'sea/killer_whale', title: 'Orca' }, { anims: ['Take 001'], coSkin: true });
  assert.deepEqual(k.pose, ['swimming']); assert.equal(k.animTheoPose.swimming, 'Take 001');
  assert.deepEqual(suyPose({ id: 'a/hybrid', title: 'Cat' }, { anims: ['Take 001'], coSkin: true }).pose, ['standing']);
  assert.deepEqual(suyPose({ id: 'a/bird', title: 'Bird' }, { anims: [], coSkin: true }).pose, ['flying']);
});
test('suyPose: tĩnh / trang trí không skin -> không pose', () => {
  assert.equal(suyPose({ id: 'r', title: 'r' }, { anims: [], coSkin: false }), null);
  const t = suyPose({ id: 'a/tree', title: 'Tree' }, { anims: ['tick'], coSkin: false });
  assert.equal(t.pose, undefined); assert.deepEqual(t.anim, ['tick']);
  assert.equal(suyPose({ id: 'a', title: 'a' }, { anims: ['Leaf_Sway'], coSkin: false }).pose, undefined);
  assert.equal(suyPose({ id: 'a', title: 'a' }, { anims: ['WindLoop'], coSkin: false }).pose, undefined);
  assert.ok(CLIP_TRANG_TRI);
});

test('mòng biển: đậu và bay đều chọn được; clipChoPose', () => {
  assert.equal(chonMoHinh([GULL], { loai: 'gull', pose: 'standing' }), GULL);
  assert.equal(chonMoHinh([GULL], { loai: 'gull', pose: 'flying' }), GULL);
  assert.equal(chonMoHinh([GULL], { loai: 'gull', pose: 'swimming' }), null);
  assert.equal(clipChoPose(GULL, 'flying'), 'Fly');
  assert.equal(clipChoPose(GULL, 'sitting'), null);
});
test('cây không skin có tick: không pose, không chọn, doctor không bad', () => {
  assert.equal(chonMoHinh([TREE], { loai: 'tree', pose: 'standing' }), null);
  const r = kiemPose([TREE], () => ({ anims: ['tick'], coSkin: false }));
  assert.equal(r.bad.length, 0);
  assert.equal(kiemPose([TREE], () => ({ anims: ['tick'], coSkin: true })).bad.length, 1);
  assert.equal(kiemPose([TREE], () => ({ anims: ['tick', 'Open'], coSkin: false })).bad.length, 1);
});
test('ưu tiên entry chuyên hơn; loai theo từ', () => {
  const chung = { id: 'a/bird-all', title: 'Bird', pose: ['standing', 'flying'] };
  const rieng = { id: 'a/bird-fly', title: 'Bird', pose: ['flying'] };
  assert.equal(chonMoHinh([chung, rieng], { loai: 'bird', pose: 'flying' }), rieng);
  assert.equal(chonMoHinh([rieng, chung], { loai: 'bird', pose: 'flying' }), rieng);
  assert.equal(chonMoHinh([{ id: 'a/hybrid-car', title: 'Hybrid', pose: ['standing'] }], { loai: 'bird' }), null);
});
test('kiemPose: GLB có nhưng không đọc được -> warn riêng, không tính thiếu', () => {
  const r = kiemPose([{ id: 'q', src: 'q.glb' }], () => ({ loi: 'hỏng' }));
  assert.equal(r.thieu, 0); assert.equal(r.bad.length, 0); assert.equal(r.warn.length, 1); assert.match(r.warn[0], /không đọc được/);
});
test('kiemPose/docGlbFs: src không phải .glb -> bỏ qua, không warn', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'a.gltf'), '{}');
  const r = kiemPose([{ id: 'k', src: 'a.gltf' }], docGlbFs(d));
  assert.deepEqual([r.bad.length, r.warn.length, r.thieu, r.boQua], [0, 0, 0, 1]);
});
test('docGlbFs: chunk đầu không phải JSON -> loi', () => {
  const d = tmp();
  const b = glb({}); b.writeUInt32LE(0x004E4942, 16);
  fs.writeFileSync(path.join(d, 'a.glb'), b);
  assert.ok(docGlbFs(d)('a.glb').loi);
});

test('--write giữ định dạng; --cap-nhat ghi đè entry cũ', () => {
  const d = tmp();
  const man = [{ id: 'sea/fish1', src: 'f.glb', scale: 1, size_m: { x: 1 } }, { id: 'rock', src: 'r.glb', scale: 2 },
    { id: 'tree', src: 't.glb', pose: ['standing'], animTheoPose: { standing: 'tick' }, scale: 1 }, { id: 'old', src: 'f.glb', pose: 'standing', scale: 1 }];
  const orig = JSON.stringify(man, null, 1) + '\n';
  const mp = path.join(d, 'manifest.json');
  fs.writeFileSync(mp, orig);
  fs.writeFileSync(path.join(d, 'f.glb'), glb({ animations: [{ name: 'Armature|Swim' }], skins: [{}] }));
  fs.writeFileSync(path.join(d, 'r.glb'), glb({}));
  fs.writeFileSync(path.join(d, 't.glb'), glb({ animations: [{ name: 'tick' }] }));
  ghiPose(mp, d);
  let nu = fs.readFileSync(mp, 'utf8');
  const a = orig.split('\n'), b = nu.split('\n');
  let i = 0;
  for (const l of b) if (i < a.length && l.replace(/,$/, '') === a[i].replace(/,$/, '')) i++;
  assert.equal(i, a.length);
  let p = JSON.parse(nu);
  assert.deepEqual(p[0].pose, ['swimming']); assert.deepEqual(p[0].anim, ['Armature|Swim']);
  assert.deepEqual(p[0].animTheoPose, { swimming: 'Armature|Swim' });
  assert.equal(p[1].pose, undefined);
  assert.deepEqual(p[2].pose, ['standing']);   // mặc định không đụng entry đã có
  assert.equal(p[3].pose, 'standing');
  assert.ok(nu.endsWith('}\n]\n'));
  assert.deepEqual(Object.keys(p[0]).slice(0, 4), ['id', 'src', 'scale', 'size_m']);
  ghiPose(mp, d, { capNhat: true });
  p = JSON.parse(fs.readFileSync(mp, 'utf8'));
  assert.equal(p[2].pose, undefined); assert.equal(p[2].animTheoPose, undefined); assert.deepEqual(p[2].anim, ['tick']);
  assert.deepEqual(p[3].pose, ['swimming']);
});
