// anim-rbx: bộ đọc rbxm/XML (tools/rbx-anim.mjs) + bộ phát (engine/anim-rbx.js) — tất định, không NaN, đúng chiều xoay.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { nap, engine } from './_three.mjs';
const THREE = await nap();
const { rbxPose, quatEuler, ease, registerRbx, RBX_META } = await engine('anim-rbx.js');
const { docRbx, doiClip, matQuat } = await import('../rbx-anim.mjs');
const FX = (f) => new URL('./fixtures/' + f, import.meta.url);
const wave = JSON.parse(fs.readFileSync(FX('rbx-wave.json'), 'utf8')), idle = JSON.parse(fs.readFileSync(FX('rbx-idle.json'), 'utf8'));
const flat = (p) => { const o = []; const walk = (v, k) => { if (typeof v === 'number') o.push([k, v]); else if (v && typeof v === 'object') for (const [kk, vv] of Object.entries(v)) walk(vv, k + '.' + kk); }; walk(p, ''); return o; };
const times = [-1, 0, 0.033, 0.4, 0.75, 1.49, 1.5, 2.9, 17.3];

test('clip mẫu hợp lệ: đủ 6 khớp, khung tăng dần', () => {
  for (const c of [wave, idle]) {
    assert.equal(c.dinhDang, 'rbx-anim-1'); assert.deepEqual([...c.khop].sort(), ['head', 'hips', 'leftArm', 'leftLeg', 'rightArm', 'rightLeg']);
    for (let i = 1; i < c.keys.length; i++) assert.ok(c.keys[i].t >= c.keys[i - 1].t);
  }
});

for (const [n, c] of [['wave', wave], ['idle', idle]]) {
  test(`${n}: tất định, không NaN, tua tới/lui/nhảy cóc cùng kết quả`, () => {
    for (const t of times) {
      const a = rbxPose(t, c), b = rbxPose(t, c);
      assert.deepEqual(a, b);
      for (const [k, v] of flat(a)) assert.ok(Number.isFinite(v), `${n}@${t} ${k}=${v}`);
    }
    const fwd = times.map((t) => JSON.stringify(rbxPose(t, c))), back = [...times].reverse().map((t) => JSON.stringify(rbxPose(t, c))).reverse();
    assert.deepEqual(fwd, back);
  });
}

test('một lần: giữ khung cuối; lặp: tuần hoàn theo dur', () => {
  assert.deepEqual(rbxPose(wave.dur, wave), rbxPose(wave.dur + 5, wave));
  assert.deepEqual(rbxPose(-3, wave), rbxPose(0, wave));
  const t = 0.3, A = flat(rbxPose(t, idle)), B = flat(rbxPose(t + idle.dur * 3, idle));          // idle lặp (sai số dấu phẩy động của phép chia dư)
  A.forEach(([k, v], i) => assert.ok(Math.abs(v - B[i][1]) < 1e-9, k));
  assert.deepEqual(rbxPose(t, idle, { loop: false }), rbxPose(t, idle));                        // chưa hết 1 chu kỳ → như nhau
  assert.notDeepEqual(rbxPose(idle.dur + 0.3, idle, { loop: false }), rbxPose(idle.dur + 0.3, idle));
});

test('wave: tay phải giơ cao (x ≪ 0) giữa clip, tay trái buông', () => {
  const p = rbxPose(0.75, wave);
  assert.ok(Math.abs(p.rightArm.x) > 1.5 || Math.abs(p.rightArm.z) > 1.5, 'tay phải phải giơ: ' + JSON.stringify(p.rightArm));
  assert.ok(Math.abs(p.leftArm.x) < 0.3 && Math.abs(p.leftArm.z) < 0.3, 'tay trái buông: ' + JSON.stringify(p.leftArm));
  assert.ok(Math.abs(p.rightArm.x) > Math.abs(rbxPose(0, wave).rightArm.x) + 1, 'giơ lên so với khung 0');
});

test('quatEuler khớp THREE.Euler XYZ', () => {
  for (let i = 0; i < 40; i++) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(i) * 2.5, Math.cos(i * 1.7) * 1.4, Math.sin(i * 2.3) * 3, 'XYZ'));
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ'), mine = quatEuler([q.x, q.y, q.z, q.w]).e;
    for (let k = 0; k < 3; k++) assert.ok(Math.abs([e.x, e.y, e.z][k] - mine[k]) < 1e-9, `i=${i} k=${k}`);
  }
});

test('easing: 0→0, 1→1, đơn điệu với Cubic/Linear, Constant nhảy ở cuối', () => {
  for (let es = 0; es <= 4; es++) for (let ed = 0; ed <= 2; ed++) { assert.ok(Math.abs(ease(0, es, ed)) < 1e-6, `es${es} ed${ed} @0`); assert.ok(Math.abs(ease(1, es, ed) - 1) < 1e-6, `es${es} ed${ed} @1`); }
  assert.equal(ease(0.99, 1, 0), 0); assert.equal(ease(1, 1, 0), 1);
  let prev = -1; for (let i = 0; i <= 20; i++) { const v = ease(i / 20, 3, 2); assert.ok(v >= prev - 1e-12); prev = v; }
});

test('đọc rbxm nhị phân thật (idle 180435571) khớp clip JSON đã lưu', () => {
  const seqs = docRbx(fs.readFileSync(FX('rbx-idle.rbxm')));
  assert.equal(seqs.length, 1); assert.equal(seqs[0].keys.length, idle.keys.length);
  const c = doiClip(seqs[0], { id: '180435571', ten: idle.ten, loop: idle.loop });
  assert.deepEqual(JSON.parse(JSON.stringify(c.keys)), idle.keys);
});

test('đọc rbxmx XML nhỏ + đổi trục: xoay 90° quanh trục vai → tay đưa ra trước (x<0)', () => {
  const cf = (r) => `<CoordinateFrame name="CFrame"><X>0</X><Y>0</Y><Z>0</Z>${['R00', 'R01', 'R02', 'R10', 'R11', 'R12', 'R20', 'R21', 'R22'].map((k, i) => `<${k}>${r[i]}</${k}>`).join('')}</CoordinateFrame>`;
  const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  // Roblox: Right Shoulder Transform xoay quanh Z cục bộ −90° (đưa tay ra trước theo khung C0 xoay Y) — thử mọi trục, chỉ cần tay phải thoát khỏi 0 và hữu hạn
  const c90 = Math.cos(Math.PI / 2), s90 = Math.sin(Math.PI / 2);
  const Rz = [c90, -s90, 0, s90, c90, 0, 0, 0, 1];
  const pose = (ten, r, con = '') => `<Item class="Pose"><Properties>${cf(r)}<string name="Name">${ten}</string><token name="EasingStyle">0</token></Properties>${con}</Item>`;
  const xml = `<roblox version="4"><Item class="KeyframeSequence"><Properties><bool name="Loop">false</bool><string name="Name">T</string></Properties>` +
    [0, 1].map((t) => `<Item class="Keyframe"><Properties><float name="Time">${t}</float></Properties>${pose('HumanoidRootPart', I, pose('Torso', I, pose('Right Arm', t ? Rz : I)))}</Item>`).join('') + `</Item></roblox>`;
  const seq = docRbx(xml)[0]; assert.equal(seq.keys.length, 2);
  const c = doiClip(seq, { ten: 't' });
  const p0 = rbxPose(0, c), p1 = rbxPose(1, c);
  assert.ok(Math.abs(p0.rightArm.x) + Math.abs(p0.rightArm.y) + Math.abs(p0.rightArm.z) < 1e-6);
  assert.ok(Math.abs(p1.rightArm.x) + Math.abs(p1.rightArm.y) + Math.abs(p1.rightArm.z) > 1.4, JSON.stringify(p1.rightArm));
  assert.ok(Math.abs(matQuat(I)[3] - 1) < 1e-9);
});

test('registerRbx thêm rbx_<tên> vào bảng, trả pose giống rbxPose', () => {
  const table = {}; const names = registerRbx({ wave, idle }, table);
  assert.deepEqual(names.sort(), ['rbx_idle', 'rbx_wave']); assert.deepEqual(table.rbx_wave(0.5, {}), rbxPose(0.5, wave));
  assert.ok(RBX_META.wave.dur > 0);
});
