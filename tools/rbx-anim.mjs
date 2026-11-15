// rbx-anim.mjs — đọc KeyframeSequence Roblox (.rbxm nhị phân hoặc .rbxmx XML) và đổi thành clip JSON theo khớp R6 của ta.
//   Mô-đun THUẦN (không mạng, không ghi file): tools/roblox.mjs lệnh `anim` gọi vào đây. Không chạy mã của ai, chỉ đọc dữ liệu.
//   docRbx(buf) → [{ ten, loop, priority, keys:[{ t, poses:[{ ten, cf:[x,y,z,r00..r22], es, ed }] }] }]   (mọi KeyframeSequence trong file)
//   doiClip(seq, meta) → clip JSON (xem engine/anim-rbx.js đầu file để biết định dạng)
//
// Định dạng nhị phân rbxm: header 32 byte, rồi các chunk INST/PROP/PRNT/…; chunk nén LZ4 (khối). Mảng số nguyên/float xếp xen kẽ byte
// (byte cao trước), int zigzag, float xoay 1 bit. Chỉ giải mã đúng các thuộc tính cần: Name, Loop, Priority, Time, CFrame, EasingStyle/Direction.

const U32 = (b, o) => b.readUInt32LE(o);

// ---------- LZ4 khối ----------
export function lz4(src, outLen) {
  const out = Buffer.allocUnsafe(outLen); let i = 0, o = 0;
  while (i < src.length) {
    const tk = src[i++]; let ll = tk >> 4;
    if (ll === 15) { let b; do { b = src[i++]; ll += b; } while (b === 255); }
    for (let k = 0; k < ll; k++) out[o++] = src[i++];
    if (i >= src.length) break;
    const off = src[i] | (src[i + 1] << 8); i += 2;
    let ml = tk & 15; if (ml === 15) { let b; do { b = src[i++]; ml += b; } while (b === 255); }
    ml += 4;
    for (let k = 0; k < ml; k++) { out[o] = out[o - off]; o++; }
  }
  if (o !== outLen) throw new Error(`LZ4: giải nén ra ${o} byte, cần ${outLen}`);
  return out;
}

// ---------- giải mã mảng xen kẽ ----------
const deint = (b, o, n) => { const v = new Uint32Array(n); for (let i = 0; i < n; i++) v[i] = ((b[o + i] << 24) | (b[o + n + i] << 16) | (b[o + 2 * n + i] << 8) | b[o + 3 * n + i]) >>> 0; return v; };
const zig = (x) => (x >>> 1) ^ -(x & 1);
const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
const unrot = (x) => { u32[0] = ((x >>> 1) | (x << 31)) >>> 0; return f32[0]; };
const ints = (b, o, n) => Array.from(deint(b, o, n), zig);
const floats = (b, o, n) => Array.from(deint(b, o, n), unrot);
const referents = (b, o, n) => { const v = ints(b, o, n); for (let i = 1; i < n; i++) v[i] += v[i - 1]; return v; };

// 24 phép xoay trục của CFrame nén (id → 9 số R00..R22), theo rbx_binary
const ROT = {
  0x02: [1, 0, 0, 0, 1, 0, 0, 0, 1], 0x03: [1, 0, 0, 0, 0, -1, 0, 1, 0], 0x05: [1, 0, 0, 0, -1, 0, 0, 0, -1], 0x06: [1, 0, 0, 0, 0, 1, 0, -1, 0],
  0x07: [0, 1, 0, 1, 0, 0, 0, 0, -1], 0x09: [0, 0, 1, 1, 0, 0, 0, 1, 0], 0x0a: [0, -1, 0, 1, 0, 0, 0, 0, 1], 0x0c: [0, 0, -1, 1, 0, 0, 0, -1, 0],
  0x0d: [0, 1, 0, 0, 0, 1, 1, 0, 0], 0x0e: [0, 0, -1, 0, 1, 0, 1, 0, 0], 0x10: [0, -1, 0, 0, 0, -1, 1, 0, 0], 0x11: [0, 0, 1, 0, -1, 0, 1, 0, 0],
  0x14: [-1, 0, 0, 0, 1, 0, 0, 0, -1], 0x15: [-1, 0, 0, 0, 0, 1, 0, 1, 0], 0x17: [-1, 0, 0, 0, -1, 0, 0, 0, 1], 0x18: [-1, 0, 0, 0, 0, -1, 0, -1, 0],
  0x19: [0, 1, 0, -1, 0, 0, 0, 0, 1], 0x1b: [0, 0, -1, -1, 0, 0, 0, 1, 0], 0x1c: [0, -1, 0, -1, 0, 0, 0, 0, -1], 0x1e: [0, 0, 1, -1, 0, 0, 0, -1, 0],
  0x1f: [0, 1, 0, 0, 0, -1, -1, 0, 0], 0x20: [0, 0, 1, 0, 1, 0, -1, 0, 0], 0x22: [0, -1, 0, 0, 0, 1, -1, 0, 0], 0x23: [0, 0, -1, 0, -1, 0, -1, 0, 0],
};

// ---------- đọc rbxm nhị phân → cây thể hiện ----------
function docNhiPhan(buf) {
  const cls = new Map(), inst = new Map();           // classId → { ten, ids }; ref → { cls, p:{}, con:[], cha }
  let pos = 32; const props = [];
  while (pos + 16 <= buf.length) {
    const ten = buf.toString('latin1', pos, pos + 4), cl = U32(buf, pos + 4), ul = U32(buf, pos + 8);
    pos += 16; const raw = buf.subarray(pos, pos + (cl || ul)); pos += cl || ul;
    const d = cl ? lz4(raw, ul) : raw;
    if (ten === 'END\0') break;
    if (ten === 'INST') {
      const id = U32(d, 0), nl = U32(d, 4), name = d.toString('utf8', 8, 8 + nl); let o = 8 + nl + 1; const n = U32(d, o); o += 4;
      const ids = referents(d, o, n); cls.set(id, { ten: name, ids });
      for (const r of ids) inst.set(r, { cls: name, p: {}, con: [], cha: null, ref: r });
    } else if (ten === 'PROP') props.push(d);
    else if (ten === 'PRNT') {
      const n = U32(d, 1), c = referents(d, 5, n), p = referents(d, 5 + 4 * n, n);
      for (let i = 0; i < n; i++) { const a = inst.get(c[i]), b = inst.get(p[i]); if (a && b) { a.cha = b; b.con.push(a); } }
    }
  }
  for (const d of props) {
    const id = U32(d, 0), nl = U32(d, 4), pn = d.toString('utf8', 8, 8 + nl); let o = 8 + nl; const ty = d[o++], c = cls.get(id); if (!c) continue;
    const n = c.ids.length, set = (vals) => c.ids.forEach((r, i) => { inst.get(r).p[pn] = vals[i]; });
    if (ty === 0x01) { const v = []; for (let i = 0; i < n; i++) { const l = U32(d, o); o += 4; v.push(d.toString('utf8', o, o + l)); o += l; } set(v); }
    else if (ty === 0x02) set(Array.from(d.subarray(o, o + n), (x) => !!x));
    else if (ty === 0x03) set(ints(d, o, n));
    else if (ty === 0x04) set(floats(d, o, n));
    else if (ty === 0x12) set(Array.from(deint(d, o, n)));
    else if (ty === 0x10) {
      const R = []; for (let i = 0; i < n; i++) { const id2 = d[o++]; if (id2 === 0) { const m = []; for (let k = 0; k < 9; k++) { m.push(d.readFloatLE(o)); o += 4; } R.push(m); } else if (ROT[id2]) R.push(ROT[id2]); else throw new Error('CFrame: mã xoay lạ 0x' + id2.toString(16)); }
      const X = floats(d, o, n), Y = floats(d, o + 4 * n, n), Z = floats(d, o + 8 * n, n);
      set(R.map((m, i) => [X[i], Y[i], Z[i], ...m]));
    }
  }
  return [...inst.values()];
}

// ---------- đọc rbxmx XML → cây thể hiện (chỉ các thuộc tính cần) ----------
function docXml(txt) {
  const out = []; const stack = []; let m; const re = /<(\/?)(Item|Properties|CoordinateFrame|bool|string|token|float|int|X|Y|Z|R\d\d)\b([^>]*?)(\/?)>|([^<]+)/g;
  let thuoc = null, ct = null, mo = null, nm = '', kieu = '';
  const num = (s) => Number(s);
  while ((m = re.exec(txt))) {
    if (m[5] !== undefined) { if (mo === 'val') ct.val += m[5]; continue; }
    const dong = m[1] === '/', tag = m[2], at = m[3];
    if (tag === 'Item') { if (!dong) { const o = { cls: /class="([^"]+)"/.exec(at)?.[1], p: {}, con: [], cha: stack.at(-1) || null }; if (o.cha) o.cha.con.push(o); out.push(o); stack.push(o); } else stack.pop(); }
    else if (tag === 'CoordinateFrame') { if (!dong) { nm = /name="([^"]+)"/.exec(at)?.[1]; thuoc = { cf: {} }; } else { const c = thuoc.cf; stack.at(-1).p[nm] = ['X', 'Y', 'Z', 'R00', 'R01', 'R02', 'R10', 'R11', 'R12', 'R20', 'R21', 'R22'].map((k) => num(c[k])); thuoc = null; } }
    else if (thuoc && /^[XYZR]/.test(tag)) { if (!dong) { mo = 'cf'; ct = { val: '' }; kieu = tag; mo = 'val'; } else { thuoc.cf[kieu] = ct.val; mo = null; } }
    else if (!thuoc) { if (!dong) { nm = /name="([^"]+)"/.exec(at)?.[1]; kieu = tag; ct = { val: '' }; mo = 'val'; } else if (mo === 'val') { const v = ct.val.trim(); stack.at(-1).p[nm] = kieu === 'bool' ? v === 'true' : kieu === 'string' ? v.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : num(v); mo = null; } }
  }
  return out;
}

/** Nhận Buffer .rbxm / .rbxmx (hoặc chuỗi XML) → các KeyframeSequence đã gom. */
export function docRbx(buf) {
  if (typeof buf === 'string') buf = Buffer.from(buf, 'utf8');
  const dau = buf.toString('latin1', 0, 8);
  const ds = dau === '<roblox!' ? docNhiPhan(buf) : /^\s*<roblox/.test(buf.toString('latin1', 0, 64)) ? docXml(buf.toString('utf8')) : null;
  if (!ds) throw new Error('không phải file Roblox (đầu: ' + JSON.stringify(buf.toString('latin1', 0, 12)) + ')');
  const seqs = ds.filter((x) => x.cls === 'KeyframeSequence');
  return seqs.map((s) => {
    const keys = s.con.filter((k) => k.cls === 'Keyframe').map((k) => {
      const poses = [];
      const duyet = (p) => { for (const c of p.con) if (c.cls === 'Pose') { poses.push({ ten: String(c.p.Name || ''), cf: c.p.CFrame || [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], es: c.p.EasingStyle ?? 0, ed: c.p.EasingDirection ?? 0, w: c.p.Weight ?? 1 }); duyet(c); } };
      duyet(k);
      return { t: Number(k.p.Time) || 0, poses };
    }).sort((a, b) => a.t - b.t);
    return { ten: String(s.p.Name || ''), loop: !!s.p.Loop, priority: s.p.Priority ?? null, keys };
  });
}

// ---------- đổi sang khớp R6 của ta ----------
// Khung xoay C0/C1 của Motor6D R6 (Roblox): Part1 = Part0·C0·Transform·C1⁻¹, C0 và C1 cùng xoay Rc → xoay tương đối = Rc·T·Rcᵀ.
const RC = {
  root: [-1, 0, 0, 0, 0, 1, 0, 1, 0], neck: [-1, 0, 0, 0, 0, 1, 0, 1, 0],
  rsh: [0, 0, 1, 0, 1, 0, -1, 0, 0], lsh: [0, 0, -1, 0, 1, 0, 1, 0, 0],
  rhip: [0, 0, 1, 0, 1, 0, -1, 0, 0], lhip: [0, 0, -1, 0, 1, 0, 1, 0, 0],
};
export const KHOP = { 'Torso': ['hips', 'root'], 'Head': ['head', 'neck'], 'Right Arm': ['rightArm', 'rsh'], 'Left Arm': ['leftArm', 'lsh'], 'Right Leg': ['rightLeg', 'rhip'], 'Left Leg': ['leftLeg', 'lhip'] };
const mul = (a, b) => { const o = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return o; };
const tp = (a) => [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
const MIR = [-1, 0, 0, 0, 1, 0, 0, 0, -1];            // Roblox nhìn −Z, ta nhìn +Z: xoay 180° quanh Y (đối xứng, tự nghịch đảo)
const mv = (m, v) => [0, 1, 2].map((i) => m[i * 3] * v[0] + m[i * 3 + 1] * v[1] + m[i * 3 + 2] * v[2]);
/** ma trận 3×3 (hàng) → quaternion [x,y,z,w] */
export function matQuat(m) {
  const [a, b, c, d, e, f, g, h, i] = m, tr = a + e + i; let x, y, z, w;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (h - f) / s; y = (c - g) / s; z = (d - b) / s; }
  else if (a > e && a > i) { const s = Math.sqrt(1 + a - e - i) * 2; w = (h - f) / s; x = s / 4; y = (b + d) / s; z = (c + g) / s; }
  else if (e > i) { const s = Math.sqrt(1 + e - a - i) * 2; w = (c - g) / s; x = (b + d) / s; y = s / 4; z = (f + h) / s; }
  else { const s = Math.sqrt(1 + i - a - e) * 2; w = (d - b) / s; x = (c + g) / s; y = (f + h) / s; z = s / 4; }
  const n = Math.hypot(x, y, z, w) || 1; return [x / n, y / n, z / n, w / n];
}
const lam = (v) => Math.round(v * 1e5) / 1e5;

/** KeyframeSequence (từ docRbx) → clip JSON. Chỉ giữ 6 khớp R6; keys[].j[khớp] = [qx,qy,qz,qw, px,py,pz, es, ed] (hệ three, mặt +Z). */
export function doiClip(seq, meta = {}) {
  const canhBao = []; const goc = [];
  const keys = seq.keys.map((k) => {
    const j = {};
    for (const p of k.poses) {
      const kh = KHOP[p.ten]; if (!kh) { if (p.ten === 'HumanoidRootPart') { if (p.cf.some((v, i) => Math.abs(v - [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1][i]) > 1e-3)) goc.push(k.t); } continue; }
      const Rc = RC[kh[1]], T = p.cf.slice(3), Rj = mul(mul(Rc, T), tp(Rc)), Rt = mul(mul(MIR, Rj), MIR);
      const pos = mv(MIR, mv(Rc, p.cf.slice(0, 3)));
      j[kh[0]] = [...matQuat(Rt).map(lam), ...pos.map(lam), p.es | 0, p.ed | 0];
    }
    return { t: lam(k.t), j };
  });
  if (goc.length) canhBao.push(`HumanoidRootPart có xoay/dịch ở ${goc.length} khung — bỏ qua`);
  const dur = keys.length ? keys[keys.length - 1].t : 0;
  return { dinhDang: 'rbx-anim-1', nguon: 'roblox', id: meta.id ?? null, ten: meta.ten || seq.ten, loop: meta.loop ?? seq.loop, dur, priority: seq.priority, khop: [...new Set(keys.flatMap((k) => Object.keys(k.j)))], keys, canhBao };
}
