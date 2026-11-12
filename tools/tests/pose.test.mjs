import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chonMoHinh, ungVien } from '../kb/chon-mo-hinh.mjs';
import { kiemPose, docGlbFs } from '../kiem/pose.mjs';
import { deXuat, ghiPose } from '../manifest-pose.mjs';

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

test('deXuat: luật tên clip/id/title', () => {
  assert.deepEqual(deXuat({ id: 'x/eagle', title: 'Eagle' }, { anims: ['Wing_Flap'], coSkin: true }).pose, 'flying');
  assert.equal(deXuat({ id: 'sea/fish1', title: 'Fish' }, { anims: ['Armature|Swim'], coSkin: true }).pose, 'swimming');
  assert.equal(deXuat({ id: 'x/b', title: 'Bird' }, { anims: ['Idle_Sit'], coSkin: true }).pose, 'sitting');
  assert.equal(deXuat({ id: 'x/c', title: 'Cat' }, { anims: ['Walk'], coSkin: true }).pose, 'standing');
  assert.equal(deXuat({ id: 'x/r', title: 'Rock' }, { anims: [], coSkin: false }), null);
});

test('--write giữ nguyên định dạng, chỉ thêm dòng', () => {
  const d = tmp();
  const man = [{ id: 'sea/fish1', src: 'f.glb', scale: 1, size_m: { x: 1 } }, { id: 'rock', src: 'r.glb', scale: 2 }];
  const orig = JSON.stringify(man, null, 1) + '\n';
  fs.writeFileSync(path.join(d, 'manifest.json'), orig);
  fs.writeFileSync(path.join(d, 'f.glb'), glb({ animations: [{ name: 'Armature|Swim' }], skins: [{}] }));
  fs.writeFileSync(path.join(d, 'r.glb'), glb({}));
  ghiPose(path.join(d, 'manifest.json'), d);
  const nu = fs.readFileSync(path.join(d, 'manifest.json'), 'utf8');
  const a = orig.split('\n'), b = nu.split('\n');
  // mọi dòng cũ còn nguyên (trừ dấu phẩy cuối) theo đúng thứ tự
  let i = 0;
  for (const l of b) if (i < a.length && l.replace(/,$/, '') === a[i].replace(/,$/, '')) i++;
  assert.equal(i, a.length);
  const p = JSON.parse(nu);
  assert.equal(p[0].pose, 'swimming'); assert.deepEqual(p[0].anim, ['Armature|Swim']);
  assert.equal(p[1].pose, undefined);
  assert.ok(nu.endsWith('}\n]\n'));
  assert.deepEqual(Object.keys(p[0]).slice(0, 4), ['id', 'src', 'scale', 'size_m']);
});
