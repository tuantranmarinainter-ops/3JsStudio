// CHÉP NGUYÊN từ bộ skill 'blocky-shorts' (In This Town Skill Files, tác giả chưa rõ, 2026-11-14) — engine/js/poses.js.
// Người dùng cho phép dùng và nhận trách nhiệm (2026-11-14). Không sửa tệp này; mã nối của mình nằm ở engine/blocky/song.js, co-canh.js.
// Pose library. A pose is a flat object of joint values; actions return partial poses that are blended
// over a base loop (idle / walk / run / sit / lie) with smooth fade in/out weights.
import { lerp, clamp, inv, E, noise1 } from './util.js';

export const REST = () => ({
  hipY: 2, hipDY: 0, up: [0, 0, 0], neck: [0, 0, 0], aL: [0, 0, .06], aR: [0, 0, -.06], lL: 0, lR: 0,
  body: [0, 0, 0], bodyY: 0, scale: 1,
});
const ARR = ['up', 'neck', 'aL', 'aR', 'body'];
export function blend(base, over, w) {
  if (w <= 0) return base;
  for (const k in over) {
    if (k.startsWith('_')) continue;
    if (ARR.includes(k)) { for (let i = 0; i < 3; i++) if (over[k][i] != null) base[k][i] = lerp(base[k][i], over[k][i], w); }
    else if (typeof over[k] === 'number') base[k] = lerp(base[k], over[k], w);
  }
  return base;
}
// ---------- base loops: f(time, phase, opts) -> partial pose
export const BASES = {
  idle: (t, ph) => { const b = Math.sin(t * 2.1 + ph); return { up: [.02 * b, 0, .01 * Math.sin(t * .9 + ph)], aL: [0, 0, .07 + .02 * b], aR: [0, 0, -.07 - .02 * b], neck: [0, .07 * Math.sin(t * .8 + ph * 2), 0] }; },
  walk: (t, ph, o = {}) => { const f = (o.cadence || 1.7), s = Math.sin((t * f + ph) * Math.PI * 2), a = o.amp || .62; return { lL: a * s, lR: -a * s, aL: [-a * .9 * s, 0, .06], aR: [a * .9 * s, 0, -.06], hipDY: .08 * Math.abs(Math.cos((t * f + ph) * Math.PI * 2)), up: [.05, .05 * s, 0] }; },
  run: (t, ph) => { const s = Math.sin((t * 2.8 + ph) * Math.PI * 2); return { lL: 1.0 * s, lR: -1.0 * s, aL: [-1.1 * s, 0, .1], aR: [1.1 * s, 0, -.1], hipDY: .18 * Math.abs(Math.cos((t * 2.8 + ph) * Math.PI * 2)), up: [.25, .08 * s, 0] }; },
  sit: (t, ph, o = {}) => ({ ...BASES.idle(t, ph), lL: -Math.PI / 2, lR: -Math.PI / 2, hipY: (o.seat ?? 1.35) + .5, up: [-(o.recline || 0) + .02 * Math.sin(t * 2.1 + ph), 0, 0] }),
  lie: (t, ph, o = {}) => ({ body: [-Math.PI / 2, 0, 0], bodyY: (o.bed ?? 0) + .5, hipY: 0, up: [0, 0, 0], aL: [0, 0, .15], aR: [0, 0, -.15], neck: [.05 * Math.sin(t * .7 + ph), 0, 0], hipDY: 0 }),
  float: (t, ph) => ({ ...BASES.idle(t, ph), hipDY: .3 + .2 * Math.sin(t * 2 + ph) }),
};
// helpers
const pulse = (u, a = .15, b = .85) => Math.min(inv(0, a, u), 1 - inv(b, 1, u));
// ---------- actions: f(localTime, u(0..1), params, ctx) -> partial pose (+ optional _events)
// ctx: { t, dur, ph }
export const ACTIONS = {
  clap: (lt, u, p) => { const rate = p.rate || 4.5, high = !!p.high; const g = .5 + .5 * Math.cos(2 * Math.PI * rate * Math.max(0, lt - .1)); const yaw = lerp(.22, .6, g); const x = high ? -2.55 : -1.38; return { aL: [x, -yaw, 0], aR: [x, yaw, 0] }; },
  wave: (lt, u, p) => { const s = Math.sin(lt * 12); const arm = p.arm === 'L' ? 'aL' : 'aR', sg = p.arm === 'L' ? 1 : -1; return { [arm]: [-2.75, 0, sg * (.35 + .3 * s)], neck: [0, 0, sg * .08] }; },
  point: (lt, u, p) => { const arm = p.arm === 'L' ? 'aL' : 'aR'; const d = p.dir || 'forward'; const v = { forward: [-1.55, 0, 0], up: [-2.9, 0, 0], left: [-1.5, .9, 0], right: [-1.5, -.9, 0], side: [0, 0, (p.arm === 'L' ? 1 : -1) * 1.5] }[d] || [-1.55, 0, 0]; return { [arm]: v, up: [0, d === 'left' ? .15 : d === 'right' ? -.15 : 0, 0] }; },
  cheer: (lt) => { const b = Math.abs(Math.sin(lt * 9)); return { aL: [-2.9, 0, .35 + .15 * b], aR: [-2.9, 0, -.35 - .15 * b], hipDY: .35 * b, neck: [-.15, 0, 0] }; },
  jump: (lt, u) => { const h = Math.sin(Math.PI * u); return { hipDY: 2.2 * h, lL: -.5 * h, lR: -.3 * h, aL: [-2.6 * h, 0, .3], aR: [-2.6 * h, 0, -.3] }; },
  dance: (lt) => { const s = Math.sin(lt * 8), c = Math.cos(lt * 8); return { aL: [-1.6 + .9 * s, 0, .4], aR: [-1.6 - .9 * s, 0, -.4], up: [0, .25 * c, .12 * s], hipDY: .15 * Math.abs(s), lL: .25 * s, lR: -.25 * s, neck: [0, -.2 * c, .1 * s] }; },
  bow: (lt, u) => { const k = Math.sin(Math.PI * clamp(u * 1.1)); return { up: [.8 * k, 0, 0], aL: [-.2 * k, 0, .15], aR: [-.2 * k, 0, -.15] }; },
  slam: (lt, u, p) => { // raise, slam at 60% of duration; repeats if p.times
    const n = p.times || 1, seg = 1 / n, k = (u % seg) / seg; const raise = E.out(inv(0, .45, k)), down = E.in(inv(.45, .6, k));
    const x = lerp(lerp(-.4, -2.7, raise), -.95, down); const arm = p.arm === 'L' ? 'aL' : 'aR'; return { [arm]: [x, p.arm === 'L' ? -.25 : .25, 0], neck: [.1 * down, 0, 0] };
  },
  facepalm: (lt, u) => ({ aR: [-2.55, .55, 0], neck: [.3, 0, 0], up: [.08, 0, 0], aL: [0, 0, .1 + .03 * Math.sin(lt * 3)] }),
  shrug: (lt, u) => { const k = Math.sin(Math.PI * clamp(u * 1.2)); return { aL: [-.4, 0, .75 * k + .1], aR: [-.4, 0, -.75 * k - .1], neck: [0, 0, .18 * k], up: [0, 0, 0] }; },
  think: (lt) => ({ aR: [-2.2, .8, 0], aL: [-.9, -.6, 0], neck: [-.1, .2, .12], up: [0, .05, 0] }),
  yawn: (lt, u) => { const k = Math.sin(Math.PI * clamp(u)); return { aL: [-2.95 * k, 0, .3], aR: [-2.95 * k, 0, -.3], up: [-.18 * k, 0, 0], neck: [-.3 * k, 0, 0], _face: u > .08 && u < .85 ? 'yawn' : null }; },
  stretch: (lt, u) => { const k = Math.sin(Math.PI * clamp(u)); return { aL: [-3.0 * k, 0, .2], aR: [-3.0 * k, 0, -.2], up: [-.12 * k, 0, 0], hipDY: .1 * k }; },
  tremble: (lt) => { const j = Math.sin(lt * 70) * .035, j2 = Math.sin(lt * 57 + 1) * .03; return { up: [j2, 0, j], neck: [0, 0, j * 1.5], aL: [-1.05 + j, -.1, .1], aR: [-1.05 - j, .1, -.1] }; },
  shake: (lt) => { const j = Math.sin(lt * 70) * .04; return { up: [0, 0, j], neck: [0, 0, j * 1.5], body: [0, 0, j * .3] }; },
  scared: (lt) => { const j = Math.sin(lt * 60) * .04; return { aL: [-2.3 + j, -.55, 0], aR: [-2.3 - j, .55, 0], up: [-.18, 0, j], neck: [-.1, 0, j], lL: .1, lR: -.1 }; },
  cry: (lt) => { const s = Math.sin(lt * 14) * .05; return { aL: [-2.45, -.62, 0], aR: [-2.45, .62, 0], neck: [.35, 0, 0], up: [.15 + s, 0, 0] }; },
  laugh: (lt) => { const s = Math.abs(Math.sin(lt * 11)); return { up: [-.22 - .08 * s, 0, 0], aL: [-.5, -.7, 0], aR: [-.5, .7, 0], neck: [-.25, 0, 0], hipDY: .05 * s }; },
  nod: (lt) => ({ neck: [.22 * Math.sin(lt * 9), 0, 0] }),
  headshake: (lt) => ({ neck: [0, .35 * Math.sin(lt * 10), 0] }),
  look: (lt, u, p) => ({ neck: [p.down || 0, p.yaw ?? .5, 0], up: [0, (p.yaw ?? .5) * .3, 0] }),
  talk: (lt, u, p) => { const s = Math.sin(lt * 5.3), c = Math.sin(lt * 3.1 + 1); return { aR: [-.9 - .35 * s, .25, -.1], aL: [-.35 + .2 * c, 0, .15], neck: [.04 * Math.sin(lt * 7), .1 * c, 0], _talk: true }; },
  hold: (lt, u, p) => { const arm = p.arm === 'L' ? 'aL' : 'aR'; return { [arm]: [p.up ? -2.7 : -1.0, 0, 0] }; },
  show: (lt, u, p) => ({ aR: [-1.7, .35, 0], aL: [-1.7, -.35, 0] }), // hold item out with both hands
  fall: (lt, u, p) => { const k = E.in(clamp(u * 1.6)); const dir = p.dir === 'forward' ? 1 : -1; return { body: [dir * Math.PI / 2 * k, 0, 0], bodyY: .5 * k, aL: [-2.6 * k, 0, .4], aR: [-2.6 * k, 0, -.4], _face: k > .3 ? (p.face || 'dead') : null }; },
  faint: (lt, u, p) => ACTIONS.fall(lt, u, { ...p, face: 'dizzy' }),
  spin: (lt, u) => ({ body: [0, Math.PI * 2 * E.inout(u), 0] }),
  panic: (lt) => { const s = Math.sin(lt * 22), c = Math.cos(lt * 19); return { aL: [-2.4 + .6 * s, 0, .6], aR: [-2.4 - .6 * c, 0, -.6], lL: .6 * Math.sin(lt * 20), lR: -.6 * Math.sin(lt * 20), hipDY: .12 * Math.abs(s), neck: [0, .3 * c, 0] }; },
  salute: () => ({ aR: [-2.6, .62, -.2], neck: [-.05, 0, 0] }),
  flex: (lt) => { const s = .1 * Math.sin(lt * 10); return { aL: [-.3, 0, 1.6 + s], aR: [-.3, 0, -1.6 - s], up: [-.05, 0, 0], neck: [-.1, 0, 0] }; },
  type: (lt) => ({ aL: [-1.25 + .07 * Math.sin(lt * 26), -.25, 0], aR: [-1.25 + .07 * Math.sin(lt * 26 + 2), .25, 0], neck: [.15, 0, 0] }),
  eat: (lt) => { const k = .5 + .5 * Math.sin(lt * 7); return { aR: [lerp(-1.3, -2.45, k), .5 * k, 0], neck: [-.05, 0, 0], _talk: true }; },
  sneak: (lt, u) => { const s = Math.sin(lt * 7); return { up: [.35, 0, 0], aL: [-.9, -.3, 0], aR: [-.9, .3, 0], hipY: 1.75, lL: .35 * s, lR: -.35 * s }; },
  kneel: () => ({ hipY: 1.1, lL: -1.4, lR: .3, up: [.1, 0, 0] }),
  hug: () => ({ aL: [-1.5, -.7, 0], aR: [-1.5, .7, 0], up: [.1, 0, 0] }),
  sleepstand: (lt) => ({ neck: [.38 + .04 * Math.sin(lt * 1.6), 0, .1], up: [.08, 0, 0], aL: [0, 0, .04], aR: [0, 0, -.04], _face: 'asleep' }),
  pose: (lt, u, p) => p.pose || {}, // raw custom pose
};
export const ACTION_NAMES = Object.keys(ACTIONS);
// meeting times of hands for clap (for sfx/burst sync)
export function clapTimes(t0, dur, rate = 4.5) { const out = []; for (let k = 0; ; k++) { const tt = t0 + .1 + k / rate; if (tt > t0 + dur - .02) break; out.push(tt); } return out; }
export function slamTimes(t0, dur, times = 1) { const out = []; for (let i = 0; i < times; i++) out.push(t0 + dur * (i + .6) / times); return out; }
export { pulse, noise1 };

// apply pose to rig
export function applyPose(c, P) {
  c.hips.position.y = P.hipY + P.hipDY;
  c.upper.rotation.set(P.up[0], P.up[1], P.up[2]);
  c.neck.rotation.set(P.neck[0], P.neck[1], P.neck[2]);
  c.armL.rotation.set(P.aL[0], P.aL[1], P.aL[2]); c.armR.rotation.set(P.aR[0], P.aR[1], P.aR[2]);
  c.legL.rotation.x = P.lL; c.legR.rotation.x = P.lR;
  c.body.rotation.set(P.body[0], P.body[1], P.body[2]); c.body.position.y = P.bodyY;
  c.root.scale.setScalar(Math.max(.001, P.scale));
}
