// shottypes.js — Thư viện LOẠI SHOT dùng chung cho mọi tập (CLAUDE.md: "shot là DỮ LIỆU, không phải code").
//
// Một dòng shot ngắn gọn:
//   { id:'s004', dur:1.2, type:'walkBy', who:'hero', at:'square', anim:'walk', face:'smile', text:'…' }
// → expandShots() điền `cam` (camera quỹ đạo của engine/shots.js) + `cast` (bố trí diễn viên) mặc định theo loại,
//   rồi engine/shots.js (đạo diễn) vẽ như mọi shot viết tay. Shot ghi `cam`/`cast` thì phần đó GỘP ĐÈ lên mặc định.
//
// Trường của shot ngắn (đều tuỳ chọn trừ id/type; dur hoặc f như timeline.js):
//   type   establish | crowd | walkBy | follow | closeup | reaction | overShoulder | insert | chase | reveal | dialogue
//   who    diễn viên chính ('hero')          with   diễn viên thứ 2 (dialogue/overShoulder/chase) hoặc mảng
//   at     tên địa điểm (places của tập/thị trấn) hoặc [x,y,z]; bỏ trống = nối tiếp địa điểm của shot trước
//   anim   animation R15 (idle, walk, run, jump, wave, point, scared, cheer, dance, lookAround, cower, panic…)
//   face   biểu cảm (smile, happy, surprised, scared, sad, worried, angry…)   withAnim / withFace  cho diễn viên 2
//   move   static | push | pull | pan | orbit | crane | drop | shake   (chuyển động camera; mỗi loại có mặc định)
//   side   'left' = đảo chiều đi / đảo phía camera      obj   tên object cho insert/reveal ('mailbox_home')
//   n      số người đám đông (crowd)                     env, light  bối cảnh / ánh sáng (mặc định: theo tập)
//   cam    ghi đè từng khoá camera (yaw, dist, h, fov, look, dist2, …)   cast  ghi đè từng diễn viên
//
// Liên tục giữa các shot: địa điểm (`at`) và vị trí/hướng cuối của mỗi diễn viên được nhớ sang shot sau.
// Loại bám nhân vật (closeup, reaction, insert…) không ghi `at` → diễn viên đứng đúng chỗ shot trước để lại.
// Mọi thứ là hàm thuần của dữ liệu (không random) → cùng shots.js ra cùng phim.

const PI = Math.PI;
export const WALK_SPEED = 6;    // stud/giây, khớp nhịp bước walk R15 (speed 1.6)
export const RUN_SPEED = 13;

// ---- địa điểm: { pos:[x,y,z], ry } (ry = hướng "mặt tiền": diễn viên mặc định nhìn theo ry, camera đứng phía trước) ----
export function normPlace(p) {
  if (!p) return null;
  if (Array.isArray(p)) return { pos: [p[0], p[1] || 0, p[2] || 0], ry: 0 };
  if (p.pos) return { pos: [p.pos[0], p.pos[1] || 0, p.pos[2] || 0], ry: p.ry || 0, ...p };
  return null;
}
// places của tập (episode.places) đè lên places của thị trấn (town.places). Giá trị dạng 'town:home' = bí danh.
export function resolvePlaces(episodePlaces = {}, townPlaces = {}) {
  const out = {};
  for (const [k, v] of Object.entries(townPlaces)) out[k] = normPlace(v);
  for (const [k, v] of Object.entries(episodePlaces)) {
    if (typeof v === 'string') { const ref = out[v.replace(/^town:/, '')]; if (ref) out[k] = ref; continue; }
    const p = normPlace(v); if (p) out[k] = p;
  }
  return out;
}

// ---- toán nhỏ trong hệ địa điểm: f = trước (theo ry), s = phải-màn-hình khi camera đứng phía trước ----
const frame = (ry) => ({ f: [Math.sin(ry), 0, Math.cos(ry)], s: [Math.cos(ry), 0, -Math.sin(ry)] });
const add = (a, ...vs) => vs.reduce((p, [v, k = 1]) => [p[0] + v[0] * k, p[1] + v[1] * k, p[2] + v[2] * k], [...a]);
const UP = [0, 1, 0];
const headingOf = (d) => Math.atan2(d[0], d[2]);
const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);
// băm số nguyên tất định (cho đám đông)
const hash = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

// chuyển động camera (áp lên camera quỹ đạo)
function applyMove(cam, move) {
  if (!move || move === 'static') return cam;
  const c = { ...cam };
  for (const m of String(move).split(/[,+ ]+/)) {
    if (m === 'push') c.dist2 = c.dist * 0.72;
    else if (m === 'pull') c.dist2 = c.dist * 1.45;
    else if (m === 'pan' || m === 'orbit') c.yaw2 = c.yaw + (m === 'orbit' ? 0.6 : 0.22);
    else if (m === 'crane') c.h2 = (c.h || 0) + c.dist * 0.45;
    else if (m === 'drop') c.h2 = (c.h || 0) - c.dist * 0.3;
    else if (m === 'shake') c.shake = c.shake || 0.6;
  }
  return c;
}

// ---- thư viện loại shot. Mỗi hàm nhận (shot, C) với C = { P, ry, f, s, who, other, crowd, pos(name), dur, flip }
//      và trả { cam, cast, move } — cam là camera quỹ đạo của engine/shots.js. ----
export const SHOT_TYPES = {
  // toàn cảnh địa điểm, lia chậm
  establish: {
    doc: 'Toàn cảnh địa điểm (cao, xa), lia chậm. who (nếu có) đứng giữa.',
    move: 'pan',
    make: ({ P, ry, who, sh }) => ({
      cam: { at: add(P, [UP, 6]), yaw: ry + 0.35, dist: 95, h: 34, fov: 50 },
      cast: who ? { [who]: { at: P, ry, anim: sh.anim || 'idle' } } : {},
    }),
  },
  // đám đông quanh địa điểm, mọi người cùng animation (lệch pha theo người)
  crowd: {
    doc: 'Đám đông (n người) quanh địa điểm cùng làm anim; who đứng hàng đầu.',
    move: 'pan',
    make: ({ P, ry, f, s, who, crowd, sh }) => {
      const cast = {}, n = Math.min(crowd.length, sh.n ?? crowd.length);
      for (let i = 0; i < n; i++) {
        const a = (i / Math.max(1, n)) * 2 * PI + hash(i, 3) * 0.6, r = 5 + hash(i, 5) * 9;
        const p = add(P, [s, Math.cos(a) * r], [f, Math.sin(a) * r * 0.7 - 3]);
        cast[crowd[i]] = { at: p, ry: ry + (hash(i, 7) - 0.5) * 1.2, anim: sh.anim || 'idle', tOff: hash(i, 9) * 2 };
      }
      if (who) cast[who] = { at: add(P, [f, 6]), ry, anim: sh.anim || 'idle' };
      return { cam: { at: add(P, [UP, 3.5]), yaw: ry + 0.2, dist: 34, h: 8, fov: 45 }, cast };
    },
  },
  // đi ngang khung hình (trái → phải), camera đứng yên
  walkBy: {
    doc: 'who đi ngang khung (trái→phải; side:"left" đảo chiều), camera đứng yên ngang tầm.',
    move: 'static',
    make: ({ P, ry, s, who, sh, dur, flip }) => {
      const anim = sh.anim || 'walk', half = ((anim === 'run' ? RUN_SPEED : WALK_SPEED) * dur) / 2, d = flip ? -1 : 1;
      const a = add(P, [s, -half * d]), b = add(P, [s, half * d]);
      return { cam: { at: add(P, [UP, 3.2]), yaw: ry, dist: 20, h: 0.5, fov: 40 },
        cast: who ? { [who]: { at: a, to: b, anim } } : {} };
    },
  },
  // bám theo sau lưng nhân vật đang đi vào sâu
  follow: {
    doc: 'Camera bám sau lưng who đang đi/chạy ra xa (vào sâu địa điểm).',
    move: 'static',
    make: ({ P, ry, f, who, sh, dur, flip }) => {
      const anim = sh.anim || 'walk', len = (anim === 'run' ? RUN_SPEED : WALK_SPEED) * dur;
      const a = add(P, [f, len * 0.4]), b = add(P, [f, -len * 0.6]);
      return { cam: { at: who || add(P, [UP, 3]), look: [0, -0.8, 0], yaw: ry + (flip ? -0.3 : 0.3), dist: 14, h: 3.5, fov: 42 },
        cast: who ? { [who]: { at: a, to: b, anim } } : {} };
    },
  },
  // cận mặt
  closeup: {
    doc: 'Cận mặt who (đẩy vào nhẹ). Không ghi at → đứng đúng chỗ shot trước.',
    move: 'push', follows: true,
    make: ({ ry, who, sh, pos, flip }) => ({
      cam: { at: who, look: [0, 0.45, 0], yaw: ry + (flip ? -0.2 : 0.2), dist: 6.5, h: 0.25, fov: 32 },
      cast: { [who]: { at: pos(who), ry, anim: sh.anim || 'idle', face: sh.face } },
    }),
  },
  // phản ứng (trung cảnh, ngang ngực)
  reaction: {
    doc: 'Trung cảnh phản ứng của who (ngang ngực, hơi chéo), mặc định mặt "surprised".',
    move: 'push', follows: true,
    make: ({ ry, who, sh, pos, flip }) => ({
      cam: { at: who, look: [0, -0.7, 0], yaw: ry + (flip ? 0.35 : -0.35), dist: 11, h: 0.6, fov: 38 },
      cast: { [who]: { at: pos(who), ry, anim: sh.anim || 'idle', face: sh.face || 'surprised' } },
    }),
  },
  // qua vai: who nói, with quay lưng về camera ở tiền cảnh
  overShoulder: {
    doc: 'Qua vai: with (tiền cảnh, quay lưng) nhìn who đang nói/diễn.',
    move: 'static',
    make: ({ P, ry, f, s, who, other, sh, flip }) => {
      const a = P, b = add(P, [f, 6.5]), d = flip ? -1 : 1;
      const cast = { [who]: { at: a, ry, anim: sh.anim || 'idle', face: sh.face } };
      if (other) cast[other] = { at: b, ry: ry + PI, anim: sh.withAnim || 'idle', face: sh.withFace };
      return { cam: { p: r3(add(b, [f, 6], [s, 2.4 * d], [UP, 5.4])), l: r3(add(a, [UP, 3.8])), fov: 38 }, cast };
    },
  },
  // cận đạo cụ / chi tiết
  insert: {
    doc: 'Cận đạo cụ: obj = tên object trong cảnh (vd "mailbox_home") hoặc điểm của địa điểm.',
    move: 'push',
    make: ({ P, ry, who, sh, pos }) => ({
      cam: { at: sh.obj ? 'obj:' + sh.obj : add(P, [UP, 1.5]), look: sh.obj ? [0, 2.2, 0] : [0, 0, 0], yaw: ry + 0.3, dist: 8.5, h: 1.6, fov: 30 },
      cast: who ? { [who]: { at: pos(who), ry, anim: sh.anim || 'idle', face: sh.face } } : {},
    }),
  },
  // rượt đuổi: with chạy sau who, camera bám ngang + rung
  chase: {
    doc: 'Rượt: who chạy ngang, with đuổi phía sau; camera bám ngang, rung nhẹ.',
    move: 'shake',
    make: ({ P, ry, s, who, other, sh, dur, flip }) => {
      const len = RUN_SPEED * dur, d = flip ? -1 : 1;
      const cast = { [who]: { at: add(P, [s, -len / 2 * d]), to: add(P, [s, len / 2 * d]), anim: sh.anim || 'run', face: sh.face || 'scared' } };
      if (other) cast[other] = { at: add(P, [s, (-len / 2 - 5.5) * d]), to: add(P, [s, (len / 2 - 5.5) * d]), anim: sh.withAnim || 'run', face: sh.withFace || 'angry' };
      return { cam: { at: who, look: [0, -1, 0], yaw: ry + 0.75 * d, dist: 26, h: 2.5, fov: 44 }, cast };
    },
  },
  // lộ twist: bắt đầu sát lưng nhân vật, cẩu lên + kéo ra để thấy thứ phía trước
  reveal: {
    doc: 'Lộ twist: từ sau lưng who, camera cẩu lên + kéo ra thấy thứ phía trước (obj hoặc sâu trong địa điểm).',
    move: 'static',
    make: ({ P, ry, f, who, sh }) => ({
      cam: { at: sh.obj ? 'obj:' + sh.obj : add(P, [f, -10], [UP, 4]), yaw: ry, dist: 16, dist2: 58, h: 2, h2: 24, fov: 40, fov2: 50, ease: 'inout' },
      cast: who ? { [who]: { at: P, ry: ry + PI, anim: sh.anim || 'idle', face: sh.face || 'scared' } } : {},
    }),
  },
  // thoại 2 người: đứng đối diện, camera 2-shot ngang
  dialogue: {
    doc: 'Thoại 2 người: who (trái màn hình, được ưu tiên mặt) và with (phải) quay vào nhau, hơi mở về camera; 2-shot.',
    move: 'static',
    make: ({ P, ry, s, who, other, sh, flip }) => {
      const d = flip ? -1 : 1, a = add(P, [s, -2.3 * d]), b = add(P, [s, 2.3 * d]);
      const cast = { [who]: { at: a, ry: headingOf([s[0] * d, 0, s[2] * d]) - 0.45 * d, anim: sh.anim || 'idle', face: sh.face } };
      if (other) cast[other] = { at: b, ry: headingOf([-s[0] * d, 0, -s[2] * d]) + 0.45 * d, anim: sh.withAnim || 'idle', face: sh.withFace };
      return { cam: { at: add(P, [UP, 3.6]), yaw: ry + 0.22 * d, dist: 21, h: 1.2, fov: 38 }, cast };
    },
  },
};
export const SHOT_TYPE_NAMES = Object.keys(SHOT_TYPES);

// ---- mở rộng cả danh sách shot (giữ liên tục địa điểm + vị trí diễn viên) ----
//   ctx = { places, crowd:[tên…], env, light, hero:'hero', fps }
export function expandShots(shots, ctx = {}) {
  const state = { at: null, actors: {}, env: ctx.env, light: ctx.light };
  return shots.map((s) => expandShot(s, ctx, state));
}

export function expandShot(sh, ctx = {}, state = { at: null, actors: {} }) {
  const places = ctx.places || {};
  const env = sh.env || state.env || ctx.env; state.env = env;
  const light = sh.light || state.light || ctx.light; if (sh.light) state.light = sh.light;
  if (!sh.type) {   // shot viết tay: chỉ nối env, ghi lại vị trí cuối của diễn viên
    remember(sh.cast, state);
    return { ...sh, env, light: sh.light ?? light };
  }
  const T = SHOT_TYPES[sh.type];
  if (!T) throw new Error(`Loại shot "${sh.type}" (shot ${sh.id}) không có. Có: ${SHOT_TYPE_NAMES.join(', ')}`);
  // địa điểm
  let place;
  if (sh.at !== undefined) {
    place = typeof sh.at === 'string' ? places[sh.at] : normPlace(sh.at);
    if (!place) throw new Error(`Shot ${sh.id}: không có địa điểm "${sh.at}". Có: ${Object.keys(places).join(', ')}`);
    state.at = place;
  } else place = state.at || places[Object.keys(places)[0]] || { pos: [0, 0, 0], ry: 0 };
  let ry = place.ry + (sh.turn || 0);
  const who0 = sh.who || ctx.hero || 'hero';
  // loại bám nhân vật, không ghi at → lấy hướng cuối của diễn viên làm hướng "mặt tiền" (camera vẫn đứng trước mặt)
  if (T.follows && sh.at === undefined && state.actors[who0]) ry = state.actors[who0].ry + (sh.turn || 0);
  const { f, s } = frame(ry);
  const who = sh.who || (['crowd', 'establish', 'insert'].includes(sh.type) ? null : ctx.hero || 'hero');
  const others = Array.isArray(sh.with) ? sh.with : sh.with ? [sh.with] : [];
  const dur = sh.dur ?? (sh.f ? (sh.f[1] + 1 - sh.f[0]) / (ctx.fps || 30) : 1);
  // vị trí diễn viên: loại bám nhân vật & không ghi at → chỗ cuối của shot trước; không có thì giữa địa điểm
  const pos = (name) => (T.follows && sh.at === undefined && state.actors[name] ? state.actors[name].pos : place.pos);
  const C = { P: place.pos, ry, f, s, who, other: others[0], crowd: ctx.crowd || [], pos, dur, flip: sh.side === 'left', sh };
  const made = T.make(C);
  // gán face/anim chung nếu loại chưa gán
  if (who && made.cast[who]) { if (sh.face && !made.cast[who].face) made.cast[who].face = sh.face; }
  for (const o of others.slice(1)) if (!made.cast[o]) made.cast[o] = { at: add(place.pos, [f, 3], [s, 2]), ry, anim: sh.withAnim || 'idle' };
  for (const c of Object.values(made.cast)) for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
  let cam = applyMove(made.cam, sh.move ?? T.move);
  if (sh.cam) cam = { ...cam, ...sh.cam };
  const cast = { ...made.cast };
  for (const [k, v] of Object.entries(sh.cast || {})) cast[k] = v === null ? undefined : { ...(cast[k] || {}), ...v };
  for (const k of Object.keys(cast)) if (!cast[k]) delete cast[k];
  remember(cast, state);
  const out = { ...sh, env, light: sh.light ?? light, cam, cast };
  delete out.type; out.shotType = sh.type;     // đã mở rộng (tránh mở rộng lần 2)
  return out;
}

function remember(cast, state) {
  for (const [name, c] of Object.entries(cast || {})) {
    if (!c || !Array.isArray(c.at)) continue;
    const end = c.to || c.at;
    let ry = c.ry2 ?? c.ry;
    if (ry === undefined && c.to) ry = Math.atan2(c.to[0] - c.at[0], c.to[2] - c.at[2]);
    state.actors[name] = { pos: [...end], ry: ry || 0 };
  }
}

// Hook cho engine/shots.js: mở rộng 1 shot lẻ (không có liên tục) — dùng khi index.html không gọi expandShots().
export function makeTypeResolver(ctx) {
  const cache = new Map();
  return (shot) => {
    if (!cache.has(shot)) cache.set(shot, { ...expandShot(shot, ctx), t0: shot.t0, t1: shot.t1, dur: shot.dur, index: shot.index });
    return cache.get(shot);
  };
}
