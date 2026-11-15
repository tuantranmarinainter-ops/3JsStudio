// tools/gates.mjs: cổng kiểm chạy trên cảnh dựng tay CỐ Ý LỖI (chân lơ lửng, đầu bị cắt, xuyên nhau, camera đứng yên)
// và một cảnh đúng (phải PASS, không LOOK). probe() chạy được trong Node vì chỉ đọc window.__stage.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three/three.module.js';
import { probe, judge, DEFAULT_CFG } from '../gates.mjs';

const mat = new THREE.MeshBasicMaterial();
function actor(name, { x = 0, y = 0, hero = false } = {}) {
  const root = new THREE.Group(); root.name = name; root.userData.vai = hero ? 'hero' : 'nguoi';
  const box = (w, h, d, py, parent, n) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.name = n; m.position.y = py; parent.add(m); return m; };
  box(2, 2, 1, 3, root, 'torso_mesh');
  for (const [s, sx] of [['Left', -0.5], ['Right', 0.5]]) {
    const f = new THREE.Group(); f.name = s + 'Foot'; f.position.set(sx, 0, 0); root.add(f);
    const leg = box(0.95, 2, 1, 1, root, s + 'Leg_mesh'); leg.position.x = sx;
  }
  const head = new THREE.Group(); head.name = 'Head'; head.position.y = 4; root.add(head);
  box(1.2, 1.2, 1.2, 0.6, head, 'head_mesh');
  root.position.set(x, y, 0);
  return root;
}
function stage(actors, camPos, look) {
  const scene = new THREE.Scene();
  const ground = new THREE.Mesh(new THREE.BoxGeometry(60, 0.2, 60), mat); ground.name = 'ground'; ground.position.y = -0.1; scene.add(ground);
  for (const a of actors) scene.add(a);
  const camera = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 500);
  camera.position.set(...camPos); camera.lookAt(...look);
  globalThis.window = { __stage: { scene, camera, THREE }, THREE };
  return () => probe(DEFAULT_CFG);
}
const gates = (r) => r.fails.map((f) => f.gate).sort();

test('cảnh đúng: đứng trên sàn, đủ đầu, camera tiến lại gần 1 người → PASS, không LOOK', () => {
  const A = [actor('hero', { hero: true })];
  const a = stage(A, [0, 3, 16], [0, 2.6, 0])(), m = stage(A, [0, 3, 15], [0, 2.6, 0])(), b = stage(A, [0, 3, 14], [0, 2.6, 0])();
  const r = judge({ a, m, b });
  assert.deepEqual(r.fails, []); assert.deepEqual(r.look, []);
});

test('chân lơ lửng 0,6 stud → FAIL chan', () => {
  const A = [actor('hero', { hero: true, y: 0.6 })];
  const P = stage(A, [0, 3, 16], [0, 2.6, 0])();
  const r = judge({ a: P, m: P, b: P });
  assert.ok(gates(r).includes('chan'), JSON.stringify(r));
  assert.match(r.fails.find((f) => f.gate === 'chan').msg, /lơ lửng 0\.6/);
});

test('chân lún 0,5 stud → FAIL chan', () => {
  const A = [actor('hero', { hero: true, y: -0.5 })];
  const P = stage(A, [0, 3, 16], [0, 2.6, 0])();
  assert.match(judge({ a: P, m: P, b: P }).fails.find((f) => f.gate === 'chan').msg, /lún/);
});

test('mép trên khung cắt ngang đầu → FAIL dau (+ mặt ngoài vùng an toàn), camera đứng yên → LOOK', () => {
  const A = [actor('hero', { hero: true })];
  const P = stage(A, [0, 2.42, 6], [0, 2.42, 0])();
  const r = judge({ a: P, m: P, b: P });
  assert.ok(gates(r).includes('dau'), JSON.stringify(r));
  assert.ok(gates(r).includes('mat'));
  assert.ok(r.look.includes('camera đứng yên'));
});

test('hai người đứng chồng lên nhau → FAIL xuyen; camera tiến lại gần 2 người → LOOK không zoom out', () => {
  const A = [actor('hero', { hero: true }), actor('ban', { x: 0.3 })];
  const a = stage(A, [0, 3, 18], [0, 2.6, 0])(), b = stage(A, [0, 3, 15], [0, 2.6, 0])();
  const r = judge({ a, m: a, b });
  assert.ok(gates(r).includes('xuyen'), JSON.stringify(r));
  assert.ok(r.look.some((l) => /không zoom out/.test(l)));
});

test('nhân vật nằm (bề ngang > chiều cao) không bị cổng chân bắt nhầm', () => {
  const lie = actor('hero', { hero: true, y: 0.5 }); lie.rotation.z = Math.PI / 2;
  const P = stage([lie], [0, 3, 16], [0, 1, 0])();
  assert.ok(!gates(judge({ a: P, m: P, b: P })).includes('chan'));
});
