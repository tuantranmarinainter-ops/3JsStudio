// cast.js: chuẩn hoá tuỳ chọn diễn viên (ga / bear / beard), bí danh mặt, dựng gấu, và 8 animation người mới (R15 + Gà dùng chung bảng R15_ANIMATIONS).
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { nap, engine } from './_three.mjs';

let THREE, CAST, R15;
before(async () => { THREE = await nap(); R15 = await engine('r15.js'); CAST = await engine('cast.js'); });
const clone = (o) => JSON.parse(JSON.stringify(o));
const finite = (o) => !JSON.stringify(o, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? '__NaN__' : v)).includes('__NaN__');

test('normalizeActorOpts: ga / bear / r15 và các dạng cờ', () => {
  const N = CAST.normalizeActorOpts;
  assert.equal(N({ ga: 1 }).kind, 'ga'); assert.equal(N({ ga: true }).kind, 'ga'); assert.equal(N({ ga: '1' }).kind, 'ga');
  assert.equal(N({ bear: 1, bow: '#2e86de' }).kind, 'bear'); assert.equal(N({ bear: 'true' }).kind, 'bear');
  assert.equal(N({ ga: 0 }).kind, 'r15'); assert.equal(N({ bear: false }).kind, 'r15'); assert.equal(N({ ga: 'false' }).kind, 'r15'); assert.equal(N({}).kind, 'r15'); assert.equal(N().kind, 'r15');
  const o = N({ bear: 1, bow: '#2e86de', fur: '#c68a4a' }).opts;
  assert.deepEqual(o, { bow: '#2e86de', fur: '#c68a4a' }, 'cờ ga/bear không lọt xuống createX');
});
test('normalizeActorOpts: beard true → màu (không để true lọt vào r15)', () => {
  const N = CAST.normalizeActorOpts;
  assert.equal(N({ beard: true, hairColor: '#9e9e9e' }).opts.beard, '#9e9e9e');
  assert.equal(N({ beard: true, hairColor: '#222' }).opts.beard, '#222');
  assert.equal(N({ beard: true }).opts.beard, CAST.BEARD_FALLBACK);
  assert.equal(N({ beard: 'true', hairColor: '#abc' }).opts.beard, '#abc');
  assert.equal(N({ beard: '1' }).opts.beard, CAST.BEARD_FALLBACK);
  assert.equal(N({ beard: '#5a3b1c' }).opts.beard, '#5a3b1c', 'màu chuỗi giữ nguyên');
  for (const v of [false, 0, '0', 'false', '', null]) assert.ok(!('beard' in N({ beard: v }).opts), 'beard=' + v + ' → bỏ râu');
  const mix = N({ hero: 1, beard: true, hairColor: '#9e9e9e' });   // kịch bản ví dụ trong brief
  assert.equal(typeof mix.opts.beard, 'string');
});
test('mapFace: tên chuẩn giữ nguyên, tên lạ ánh xạ, tên không biết để nguyên (không ném)', () => {
  const known = (n) => !!R15.FACE_PRESETS[n];
  for (const f of ['worried', 'moved', 'grin', 'sleep', 'sleepy', 'laugh', 'shy', 'surprised', 'angry', 'sad', 'happy', 'scared', 'neutral', 'smile', 'panic', 'cold']) {
    assert.ok(known(f), 'R15 phải có mặt ' + f); assert.ok(!!R15.GA_FACE_MAP[f], 'Gà phải có mặt ' + f); assert.equal(CAST.mapFace(f, known), f);
  }
  assert.equal(CAST.mapFace('shocked', known), 'surprised'); assert.equal(CAST.mapFace('tired', known), 'sleepy'); assert.equal(CAST.mapFace('khong-biet', known), 'khong-biet');
  assert.equal(CAST.mapFace('smile~o', known), 'smile~o'); assert.equal(CAST.mapFace(undefined, known), undefined);
  for (const [k, v] of Object.entries(CAST.FACE_ALIAS)) assert.ok(known(v), `bí danh ${k} → ${v} phải là mặt có thật`);
});
test('buildCast: gấu Bắp + 2 biến thể dựng không ném (không cần canvas / GLB); hero R15 đã bỏ cờ', async () => {
  const cast = await CAST.buildCast(THREE, { bap: { bear: 1, bow: '#2e86de' }, bear2: { bear: 1, bow: '#e74c3c' }, bear3: { bear: 1, bow: '#f1c40f', face: 'happy' } });
  assert.deepEqual(Object.keys(cast), ['bap', 'bear2', 'bear3']);
  assert.ok(cast.bap.isBear); assert.equal(cast.bap.materials.bow.color.getHexString(), '2e86de'); assert.equal(cast.bear2.materials.bow.color.getHexString(), 'e74c3c');
  assert.equal(cast.bap._defaultFace, 'smile'); assert.equal(cast.bear3._defaultFace, 'happy');
  cast.bap.setFace('worried'); cast.bap.setFace('shocked');   // không ném
  const p = cast.bap.animate('vanish', 5); assert.ok(cast.bap.parts.body.scale.x < 0.01 && finite(p));
});
test('animation người mới: có trong bảng R15_ANIMATIONS (Gà dùng chung qua samplePose), hữu hạn, tất định', () => {
  const NEW = ['sitUp', 'climb', 'drag', 'vanish', 'peek', 'putDown', 'ringBell', 'sleepy'], USED = ['lie', 'hold', 'hug', 'panic', 'cower', 'lookAround', 'sitting'];
  for (const n of [...NEW, ...USED]) assert.equal(typeof R15.R15_ANIMATIONS[n], 'function', 'thiếu ' + n);
  for (const n of [...NEW, ...USED]) for (const t of [0, 0.2, 0.45, 0.9, 1.3, 2.6, 6.1]) {
    const a = clone(R15.samplePose(n, t)), b = clone(R15.samplePose(n, t));
    assert.ok(finite(a), `${n}@${t} NaN`); assert.deepEqual(a, b, `${n}@${t} không tất định`);
  }
  assert.equal(R15.samplePose('sleepy', 1).face, 'sleepy');
});
test('vanish người: co về ~0 cuối ~0,35 s, giữ; applyPose áp scale; anim khác trả scale 1', () => {
  const parts = {}; for (const j of ['hips', 'torso', 'head', 'rightArm', 'leftArm', 'rightElbow', 'leftElbow', 'rightHand', 'leftHand', 'rightLeg', 'leftLeg', 'rightKnee', 'leftKnee', 'rightFoot', 'leftFoot', 'body']) parts[j] = new THREE.Group();
  R15.applyPose(parts, R15.samplePose('vanish', 0)); assert.ok(Math.abs(parts.body.scale.x - 1) < 1e-9);
  R15.applyPose(parts, R15.samplePose('vanish', 0.5)); assert.ok(parts.body.scale.x > 0.95);
  R15.applyPose(parts, R15.samplePose('vanish', 0.9)); assert.ok(parts.body.scale.x < 0.01);
  R15.applyPose(parts, R15.samplePose('vanish', 4)); assert.ok(parts.body.scale.x < 0.01);
  R15.applyPose(parts, R15.samplePose('idle', 4)); assert.equal(parts.body.scale.x, 1);
  const m = R15.mixPose(R15.samplePose('vanish', 0.9), R15.samplePose('walk', 0.5), 0.5); R15.applyPose(parts, m); assert.ok(parts.body.scale.x > 0.4 && parts.body.scale.x < 0.6, 'mixPose trộn ds tuyến tính');
});
test('sitUp người: nằm ngửa → ngồi dậy, hông giữ chỗ; putDown cúi rồi đứng lại', () => {
  const s0 = R15.samplePose('sitUp', 0), s1 = R15.samplePose('sitUp', 2);
  assert.ok(Math.abs(s0.torso.x) < 0.01 && Math.abs(s1.torso.x - Math.PI / 2) < 0.1, `torso ${s0.torso.x} → ${s1.torso.x}`);
  assert.equal(s0.body.z, s1.body.z); assert.equal(s0.body.y, s1.body.y);
  const d0 = R15.samplePose('putDown', 0), dm = R15.samplePose('putDown', 0.4), d1 = R15.samplePose('putDown', 0.8);
  assert.ok(dm.torso.x > d0.torso.x + 0.3 && Math.abs(d1.torso.x - d0.torso.x) < 0.2);
});
