# Cẩm nang animation kiểu "Blocky Shorts"

Tài liệu này tách các kỹ thuật animation từ engine của skill **blocky-shorts** (`engine/js/poses.js`, `faces.js`, `engine.js`, `overlays.js`) và viết lại thành code mẫu gọn, để bạn áp dụng vào dự án Three.js của mình hoặc chuyển ý tưởng sang công cụ khác (Blender, After Effects, Unity…).

Ý tưởng cốt lõi: **không có keyframe vẽ tay, không có motion capture.** Mọi chuyển động là một **hàm toán học theo thời gian** `f(t)`, nên:
- cùng thời điểm `t` thì luôn ra cùng một hình, render lại bao nhiêu lần cũng giống hệt;
- có thể render khung hình bất kỳ mà không cần chạy tuần tự từ đầu;
- đổi tốc độ hay độ mạnh chỉ cần sửa một con số.

---

## Mục lục
1. Bộ khung xương (rig) 7 khớp
2. Hàm easing: linh hồn của chuyển động
3. Vòng lặp nền: đứng thở, đi, chạy
4. Động tác (actions)
5. Trộn lớp (blend) để không bị giật
6. Đồng bộ với lời thoại/phụ đề
7. Biểu cảm khuôn mặt bằng canvas 2D
8. Rung màn hình (camera shake)
9. Punch-in: zoom giật vào chữ chốt
10. Hiệu ứng tóe (comic burst)
11. Lấp lánh (sparkle) và lóe sao (glint)
12. Pop-in cho biển báo, icon, bong bóng thoại
13. Gắn âm thanh đúng khoảnh khắc
14. Ghép tất cả: vòng lặp render một khung hình
15. Demo tối giản chạy được ngay
16. Áp dụng sang công cụ khác
17. Mẹo tinh chỉnh

---

## 1. Bộ khung xương (rig) 7 khớp

Nhân vật là các khối hộp gắn vào **Group** (khớp). Xoay khớp thì phần con xoay theo.

```
root
└── hips (hông: nâng hạ để nhún, ngồi)
    ├── upper (thân trên: cúi, ngửa, vặn)
    │   ├── neck (cổ) ── head + face decal
    │   ├── armL (vai trái) ── tay
    │   └── armR (vai phải) ── tay
    ├── legL (háng trái) ── chân
    └── legR (háng phải) ── chân
```

Điểm quan trọng: **đặt pivot đúng chỗ.** Tay xoay quanh vai, nên Group của tay đặt ở vai, còn khối tay dời xuống dưới.

```js
const arm = new THREE.Group();
arm.position.set(1.5, 1.85, 0);   // vị trí vai
arm.rotation.order = 'YXZ';       // xoay Y trước rồi X: dễ điều khiển hơn
const limb = new THREE.Mesh(new THREE.BoxGeometry(1, 1.9, 1), mat);
limb.position.y = -0.85;          // khối tay treo xuống dưới vai
arm.add(limb);
upper.add(arm);
```

**Tư thế (pose)** chỉ là một bộ số:

```js
const REST = () => ({
  hipY: 2, hipDY: 0,          // độ cao hông + phần nhún thêm
  up:   [0, 0, 0],            // xoay thân trên [x, y, z] (radian)
  neck: [0, 0, 0],
  aL:   [0, 0,  0.06],        // tay trái
  aR:   [0, 0, -0.06],        // tay phải
  lL: 0, lR: 0,               // chân: chỉ xoay trục X
  body: [0, 0, 0], bodyY: 0,  // xoay cả người (té ngã, nằm)
  scale: 1,
});

function applyPose(c, P) {
  c.hips.position.y = P.hipY + P.hipDY;
  c.upper.rotation.set(...P.up);
  c.neck.rotation.set(...P.neck);
  c.armL.rotation.set(...P.aL);
  c.armR.rotation.set(...P.aR);
  c.legL.rotation.x = P.lL;
  c.legR.rotation.x = P.lR;
  c.body.rotation.set(...P.body);
  c.body.position.y = P.bodyY;
  c.root.scale.setScalar(Math.max(0.001, P.scale));
}
```

> Quy ước góc tay: `aR[0] = -1.55` là tay chỉ thẳng ra trước, `-2.9` là giơ thẳng lên trời, `0` là buông xuôi.

---

## 2. Hàm easing: linh hồn của chuyển động

Chuyển động tuyến tính trông máy móc. Easing làm vật **tăng tốc, giảm tốc, nảy**.

```js
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp  = (a, b, t) => a + (b - a) * t;
// inv: đổi x trong khoảng [a, b] thành tiến độ 0..1
const inv   = (a, b, x) => clamp((x - a) / (b - a));

const E = {
  linear: t => t,
  in:     t => t * t * t,                        // chậm rồi nhanh: đập xuống, rơi
  out:    t => 1 - Math.pow(1 - t, 3),           // nhanh rồi chậm: giơ lên, zoom vào
  inout:  t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2,  // camera mượt
  back:   t => { const c1 = 1.9, c3 = c1 + 1;    // vượt quá đích rồi bật lại: pop-in
                 return 1 + c3*Math.pow(t-1, 3) + c1*Math.pow(t-1, 2); },
  elastic: t => t <= 0 ? 0 : t >= 1 ? 1 :
                Math.pow(2, -10*t) * Math.sin((t*10 - .75) * (2*Math.PI) / 3) + 1,
};
```

| Muốn cảm giác | Dùng |
|---|---|
| Giơ tay lên, zoom vào | `E.out` |
| Đập xuống, rơi, ngã | `E.in` |
| Camera di chuyển mượt | `E.inout` |
| Biển báo, icon bật ra | `E.back` |
| Nảy tưng tưng | `E.elastic` |

---

## 3. Vòng lặp nền: đứng thở, đi, chạy

Nhân vật **không bao giờ đứng im tuyệt đối**. Luôn có một vòng lặp nền. `ph` (phase) là độ lệch pha riêng của mỗi nhân vật, để đám đông không cử động đồng loạt như robot.

```js
const BASES = {
  // Đứng: thân lắc rất nhẹ, tay đung đưa, đầu ngó nghiêng chậm
  idle: (t, ph) => {
    const b = Math.sin(t * 2.1 + ph);
    return {
      up:   [.02 * b, 0, .01 * Math.sin(t * .9 + ph)],
      aL:   [0, 0,  .07 + .02 * b],
      aR:   [0, 0, -.07 - .02 * b],
      neck: [0, .07 * Math.sin(t * .8 + ph * 2), 0],
    };
  },
  // Đi: chân ngược pha nhau, tay ngược chân, hông nhún 2 lần mỗi chu kỳ
  walk: (t, ph, cadence = 1.7, amp = .62) => {
    const w = (t * cadence + ph) * Math.PI * 2, s = Math.sin(w);
    return {
      lL:  amp * s, lR: -amp * s,
      aL: [-amp * .9 * s, 0,  .06],
      aR: [ amp * .9 * s, 0, -.06],
      hipDY: .08 * Math.abs(Math.cos(w)),   // |cos| → nhún mỗi bước
    };
  },
  // Chạy: nhanh hơn, biên độ lớn hơn, người đổ về trước
  run: (t, ph) => {
    const w = (t * 2.8 + ph) * Math.PI * 2, s = Math.sin(w);
    return {
      lL: s, lR: -s,
      aL: [-1.1 * s, 0, .1], aR: [1.1 * s, 0, -.1],
      hipDY: .18 * Math.abs(Math.cos(w)),
      up: [.25, .08 * s, 0],
    };
  },
};
```

**Bí quyết:** dùng `|cos|` cho độ nhún vì mỗi chu kỳ đi có **2 bước**, người phải nhún 2 lần.

---

## 4. Động tác (actions)

Mỗi động tác là một hàm `(lt, u, p) => pose một phần`:
- `lt`: số giây kể từ lúc bắt đầu động tác
- `u`: tiến độ 0→1 trong thời lượng động tác
- `p`: tham số (tay nào, nhanh chậm…)

Chỉ cần trả về **những khớp muốn đổi**. Khớp còn lại giữ nguyên từ vòng lặp nền.

```js
const ACTIONS = {
  // VỖ TAY: hai tay đưa trước, khép mở theo cos, mặc định 4,5 lần/giây
  clap: (lt, u, p) => {
    const rate = p.rate || 4.5;
    const g = .5 + .5 * Math.cos(2 * Math.PI * rate * Math.max(0, lt - .1)); // 0..1
    const yaw = lerp(.22, .6, g);            // độ khép tay
    const x = p.high ? -2.55 : -1.38;        // vỗ trên đầu hay trước ngực
    return { aL: [x, -yaw, 0], aR: [x, yaw, 0] };
  },

  // VẪY TAY
  wave: (lt) => ({ aR: [-2.75, 0, -(.35 + .3 * Math.sin(lt * 12))], neck: [0, 0, -.08] }),

  // NHẢY: hình sin nửa chu kỳ → lên rồi xuống
  jump: (lt, u) => {
    const h = Math.sin(Math.PI * u);
    return { hipDY: 2.2 * h, lL: -.5 * h, lR: -.3 * h,
             aL: [-2.6 * h, 0, .3], aR: [-2.6 * h, 0, -.3] };
  },

  // ĐẬP BÚA: giơ lên (ease-out) đến 45%, đập xuống (ease-in) đến 60%, lặp `times` lần
  slam: (lt, u, p) => {
    const n = p.times || 1, k = (u % (1 / n)) * n;
    const raise = E.out(inv(0, .45, k)), down = E.in(inv(.45, .6, k));
    const x = lerp(lerp(-.4, -2.7, raise), -.95, down);
    return { aR: [x, .25, 0], neck: [.1 * down, 0, 0] };
  },

  // RUN RẨY / CỐ NHỊN: sin tần số rất cao, biên độ rất nhỏ
  tremble: (lt) => {
    const j = Math.sin(lt * 70) * .035, j2 = Math.sin(lt * 57 + 1) * .03;
    return { up: [j2, 0, j], neck: [0, 0, j * 1.5],
             aL: [-1.05 + j, -.1, .1], aR: [-1.05 - j, .1, -.1] };
  },

  // CƯỜI: ngả ra sau, nảy theo |sin|
  laugh: (lt) => {
    const s = Math.abs(Math.sin(lt * 11));
    return { up: [-.22 - .08 * s, 0, 0], aL: [-.5, -.7, 0], aR: [-.5, .7, 0],
             neck: [-.25, 0, 0], hipDY: .05 * s };
  },

  // NGÁP: giơ hai tay theo sin nửa chu kỳ + tự đổi mặt sang 'yawn'
  yawn: (lt, u) => {
    const k = Math.sin(Math.PI * clamp(u));
    return { aL: [-2.95 * k, 0, .3], aR: [-2.95 * k, 0, -.3],
             up: [-.18 * k, 0, 0], neck: [-.3 * k, 0, 0],
             _face: u > .08 && u < .85 ? 'yawn' : null };
  },

  // TÉ NGÃ: xoay cả người 90° với ease-in (rơi nhanh dần)
  fall: (lt, u, p) => {
    const k = E.in(clamp(u * 1.6)), dir = p.dir === 'forward' ? 1 : -1;
    return { body: [dir * Math.PI / 2 * k, 0, 0], bodyY: .5 * k,
             aL: [-2.6 * k, 0, .4], aR: [-2.6 * k, 0, -.4],
             _face: k > .3 ? 'dead' : null };
  },

  // HOẢNG LOẠN: nhiều sin lệch tần số → trông hỗn loạn
  panic: (lt) => {
    const s = Math.sin(lt * 22), c = Math.cos(lt * 19), l = Math.sin(lt * 20);
    return { aL: [-2.4 + .6 * s, 0, .6], aR: [-2.4 - .6 * c, 0, -.6],
             lL: .6 * l, lR: -.6 * l, hipDY: .12 * Math.abs(s), neck: [0, .3 * c, 0] };
  },

  // GẬT / LẮC ĐẦU
  nod:       (lt) => ({ neck: [.22 * Math.sin(lt * 9), 0, 0] }),
  headshake: (lt) => ({ neck: [0, .35 * Math.sin(lt * 10), 0] }),
};
```

### Bốn khuôn mẫu đủ tạo hầu hết động tác

| Khuôn mẫu | Công thức | Dùng cho |
|---|---|---|
| **Lặp đều** | `sin(lt * tốc_độ)` | vẫy, nhảy múa, gật đầu, vỗ tay |
| **Lên rồi xuống một lần** | `sin(π * u)` | nhảy, ngáp, cúi chào, nhún vai |
| **Hai pha có easing** | `E.out(inv(0,.45,u))` rồi `E.in(inv(.45,.6,u))` | đập, đấm, ném |
| **Rung** | `sin(lt*70)*0.03` + `sin(lt*57+1)*0.03` | run, sợ, cố nhịn, giận |

---

## 5. Trộn lớp (blend) để không bị giật

Động tác **không thay thế** tư thế mà **trộn lên trên** với trọng số `w` từ 0 đến 1. `w` tăng dần lúc vào, giảm dần lúc ra.

```js
const ARR = ['up', 'neck', 'aL', 'aR', 'body'];
function blend(base, over, w) {
  if (w <= 0) return base;
  for (const k in over) {
    if (k.startsWith('_')) continue;           // _face, _talk là tín hiệu, không phải góc
    if (ARR.includes(k)) {
      for (let i = 0; i < 3; i++)
        if (over[k][i] != null) base[k][i] = lerp(base[k][i], over[k][i], w);
    } else if (typeof over[k] === 'number') base[k] = lerp(base[k], over[k], w);
  }
  return base;
}

// Trọng số: mờ vào 0,12 s đầu, mờ ra 0,12 s cuối
function weight(t, t0, t1, fade = .12, hold = false) {
  if (t < t0) return 0;
  if (t > t1) return hold ? 1 : 0;              // hold: giữ nguyên tư thế cuối
  const k = Math.min((t - t0) / fade, hold ? 1 : (t1 - t) / fade);
  return clamp(k);
}
```

**Thứ tự tính một nhân vật tại thời điểm `t`:**

```js
const P = REST();
blend(P, BASES.idle(t, ph), 1);                         // 1. nền
if (moving) blend(P, BASES.walk(t, ph), wMove);         // 2. đang đi thì trộn walk
for (const a of actions) {                              // 3. từng động tác
  const w = weight(t, a.t0, a.t1, .12, a.hold);
  if (w > 0) {
    const lt = t - a.t0, u = clamp(lt / (a.t1 - a.t0));
    blend(P, ACTIONS[a.name](lt, u, a.params), w);
  }
}
applyPose(character, P);                                // 4. đẩy vào rig
```

---

## 6. Đồng bộ với lời thoại/phụ đề

Kịch bản không ghi giây mà ghi **theo chữ**. Ví dụ "vỗ tay khi chữ *clap...* xuất hiện". Engine đổi chữ thành giây nhờ file timing:

```json
{ "lines": [ { "text": "In this town,", "start": 0.00, "end": 0.72 },
             { "text": "when you",      "start": 0.72, "end": 1.15 },
             { "text": "*clap...*",     "start": 1.15, "end": 2.17 } ] }
```

```js
// "clap...+0.1" → thời điểm bắt đầu dòng "clap..." cộng 0,1 s
function resolveTime(ref, lines) {
  if (typeof ref === 'number') return ref;
  const m = ref.match(/^(.*?)([+-]\d*\.?\d+)?$/);
  const key = m[1].toLowerCase().replace(/[^\w]/g, '');
  const line = lines.find(l => l.text.toLowerCase().replace(/[^\w]/g, '').includes(key));
  return (line ? line.start : 0) + (m[2] ? parseFloat(m[2]) : 0);
}
```

Mẹo: cho động tác **bắt đầu sớm hơn chữ một chút** (`"banned-0.25"`), để cú đập rơi **đúng lúc** chữ vang lên.

---

## 7. Biểu cảm khuôn mặt bằng canvas 2D

Mặt là một **texture vẽ bằng canvas**, dán lên một mặt cong ôm phía trước khối đầu. Mỗi biểu cảm là một tổ hợp **mắt + mày + miệng + chi tiết phụ**:

```js
const EXPRESSIONS = {
  smile:   { eyes: 'dot',     brows: 'none',  mouth: 'smile' },
  happy:   { eyes: 'closed',  brows: 'none',  mouth: 'grin' },
  smirk:   { eyes: 'half',    brows: 'one',   mouth: 'smirk' },
  shock:   { eyes: 'wide',    brows: 'up',    mouth: 'bigO' },
  sad:     { eyes: 'dot',     brows: 'sad',   mouth: 'frown' },
  angry:   { eyes: 'dot',     brows: 'angry', mouth: 'frown' },
  strain:  { eyes: 'squeeze', brows: 'angry', mouth: 'teeth', extras: ['sweat'], tint: '#e8432f' },
  yawn:    { eyes: 'shut',    brows: 'up',    mouth: 'yawn' },
  dead:    { eyes: 'x',       brows: 'none',  mouth: 'wavy' },
  love:    { eyes: 'heart',   brows: 'up',    mouth: 'smile', extras: ['blush'] },
  dizzy:   { eyes: 'spiral',  brows: 'none',  mouth: 'wavy' },
};
```

Vẽ từng bộ phận (canvas 512×320, hai mắt cách tâm ±76 px):

```js
const BLK = '#151515', FW = 512;
function drawEyes(g, type) {
  for (const side of [-1, 1]) {
    const x = FW / 2 + side * 76, y = 128;
    g.fillStyle = g.strokeStyle = BLK; g.lineCap = 'round';
    switch (type) {
      case 'dot':     // chấm đen + đốm sáng → mắt "sống"
        g.beginPath(); g.ellipse(x, y, 15, 24, 0, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x - 5, y - 9, 5, 6, 0, 0, 7); g.fill(); break;
      case 'closed':  // cung cong lên = cười híp mắt
        g.lineWidth = 11; g.beginPath(); g.arc(x, y + 10, 19, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); break;
      case 'wide':    // tròng trắng to + con ngươi nhỏ = sốc
        g.fillStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.ellipse(x, y, 30, 34, 0, 0, 7); g.fill(); g.stroke();
        g.fillStyle = BLK; g.beginPath(); g.arc(x, y + 4, 9, 0, 7); g.fill(); break;
      case 'squeeze': // dấu > < = nhắm chặt, cố gắng
        g.lineWidth = 11; g.beginPath();
        g.moveTo(x - side * 22, y - 16); g.lineTo(x + side * 18, y); g.lineTo(x - side * 22, y + 16); g.stroke(); break;
      case 'x':
        g.lineWidth = 10; g.beginPath();
        g.moveTo(x - 17, y - 17); g.lineTo(x + 17, y + 17); g.moveTo(x + 17, y - 17); g.lineTo(x - 17, y + 17); g.stroke(); break;
    }
  }
}
function drawBrows(g, type) {
  if (type === 'none') return;
  g.strokeStyle = BLK; g.lineWidth = 10; g.lineCap = 'round';
  for (const s of [-1, 1]) {
    const x = FW / 2 + s * 76, y = 72; g.beginPath();
    if (type === 'up')    { g.moveTo(x - 22, y + 2); g.quadraticCurveTo(x, y - 14, x + 22, y + 2); }
    if (type === 'angry') { g.moveTo(x - s * 26, y - 10); g.lineTo(x + s * 20, y + 10); } // chụm vào giữa, chúc xuống
    if (type === 'sad')   { g.moveTo(x - s * 26, y + 8);  g.lineTo(x + s * 20, y - 8);  } // ngược lại
    g.stroke();
  }
}
function drawMouth(g, type) {
  const x = FW / 2, y = 228; g.fillStyle = g.strokeStyle = BLK; g.lineWidth = 11; g.lineCap = 'round';
  g.beginPath();
  if (type === 'smile') { g.arc(x, y - 52, 62, .23 * Math.PI, .77 * Math.PI); g.stroke(); }
  if (type === 'frown') { g.arc(x, y + 50, 50, 1.25 * Math.PI, 1.75 * Math.PI); g.stroke(); }
  if (type === 'bigO')  { g.ellipse(x, y + 4, 26, 36, 0, 0, 7); g.fill(); }
  if (type === 'o')     { g.ellipse(x, y + 2, 15, 19, 0, 0, 7); g.fill(); }
  if (type === 'flat')  { g.moveTo(x - 30, y); g.lineTo(x + 30, y); g.stroke(); }
}
```

**Làm mặt "sống":**
- **Chớp mắt tự động:** cứ khoảng 2–4 giây (lệch ngẫu nhiên theo nhân vật) thay mắt bằng `'shut'` trong khoảng 0,1 giây.
- **Mấp máy khi nói:** khi đang `talk`, mỗi khoảng 0,1 giây đổi miệng giữa `'open'` và `'o'`/`'flat'`.
- **Đỏ mặt khi giận hay cố nhịn:** `tint` đổi màu vật liệu da đầu sang đỏ.
- **Cache texture:** mỗi tổ hợp mặt chỉ vẽ một lần rồi tái sử dụng, nên đổi biểu cảm gần như không tốn gì.

---

## 8. Rung màn hình (camera shake)

Không rung hình ảnh mà **rung camera**. Dùng vài sóng sin **tần số lẻ, không chia hết cho nhau** để rung trông hỗn loạn thay vì đều đặn. Độ mạnh **giảm theo bình phương** để giật mạnh rồi tắt nhanh.

```js
// fx = { shake: 0.12, at: 3.4, dur: 0.28 }
function applyShake(camera, t, shakes) {
  let s = 0;
  for (const f of shakes) {
    const k = (t - f.at) / (f.dur ?? .28);
    if (k >= 0 && k < 1) s += f.shake * Math.pow(1 - k, 2);   // giảm theo bình phương
  }
  if (!s) return;
  camera.position.x += Math.sin(t * 97.3) * s + Math.sin(t * 41.1) * s * .6;
  camera.position.y += Math.sin(t * 83.7 + 1) * s;
  // gọi SAU camera.lookAt(): nghiêng nhẹ quanh trục nhìn
  camera.rotateZ(Math.sin(t * 61.7) * s * .04);
}
```

| `shake` | Cảm giác |
|---|---|
| 0.04–0.06 | rung nhẹ, nhấn nhá |
| 0.08–0.12 | va chạm, đập búa (có tiếng "impact") |
| 0.2+ | nổ, động đất |

---

## 9. Punch-in: zoom giật vào chữ chốt

Thu hẹp góc nhìn (FOV) **nhanh trong 0,13 giây rồi giữ nguyên**. Đây là kỹ thuật nhấn mạnh hay gặp nhất trong video ngắn.

```js
// fx = { punch: 0.18, at: 1.15 }
let fov = baseFov;
for (const f of punches)
  if (t >= f.at) fov *= 1 - f.punch * E.out(clamp((t - f.at) / .13));
camera.fov = fov; camera.updateProjectionMatrix();
```

Kết hợp kinh điển: **punch + shake trễ 0,04 giây + tiếng swish/impact**, tất cả đúng vào chữ chốt.

---

## 10. Hiệu ứng tóe (comic burst)

Vẽ **2D lên trên khung hình 3D** (lớp overlay canvas). Có 9 tia xếp quanh một điểm. Trong 0,2 giây, tia **bay ra xa** và **ngắn dần**. Mỗi tia vẽ 2 lớp, viền đen dày và lõi vàng/trắng mỏng, cho ra chất truyện tranh.

```js
function drawBurst(ctx, t, t0, p, scale = 1) {
  const age = t - t0;
  if (age < 0 || age > .2) return;
  const a = age / .2;                           // tiến độ 0..1
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(scale, scale); ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const ang = i / 9 * Math.PI * 2 + .3;       // +0.3 để không có tia thẳng đứng
    const r0 = 40 + a * 50;                     // điểm đầu tia bay ra xa
    const r1 = r0 + 34 * (1 - a);               // tia ngắn dần → biến mất
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 10; ctx.stroke();                     // viền
    ctx.strokeStyle = i % 2 ? '#fff' : '#ffe14d'; ctx.lineWidth = 5; ctx.stroke();  // lõi
  }
  ctx.restore();
}
```

**Đặt tóe đúng chỗ tay chạm nhau:** đổi vị trí 3D của bàn tay sang tọa độ màn hình.

```js
function toScreen(v3, camera, W, H) {
  const v = v3.clone().project(camera);
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H };
}
const hands = new THREE.Vector3();
hero.armL.userData.hand.getWorldPosition(hands);
drawBurst(ctx, t, clapTime, toScreen(hands, camera, W, H));
```

**Đặt tóe đúng lúc:** tính sẵn các thời điểm hai tay khép lại, theo cùng công thức với động tác vỗ tay:

```js
function clapTimes(t0, dur, rate = 4.5) {
  const out = [];
  for (let k = 0; ; k++) {
    const tt = t0 + .1 + k / rate;              // .1 khớp với max(0, lt - .1) trong ACTIONS.clap
    if (tt > t0 + dur - .02) break;
    out.push(tt);
  }
  return out;
}
```

Hình, tiếng và tia tóe đều lấy từ **cùng một công thức**, nên không bao giờ lệch nhau.

---

## 11. Lấp lánh (sparkle) và lóe sao (glint)

Ngôi sao 4 cánh vẽ bằng đường cong bậc hai:

```js
function star4(ctx, x, y, r, rot, fill) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.quadraticCurveTo(0, 0, Math.cos(a + Math.PI / 2) * r, Math.sin(a + Math.PI / 2) * r);
  }
  ctx.fillStyle = fill; ctx.fill(); ctx.restore();
}

// 5 ngôi sao quanh đầu, mỗi cái xuất hiện trễ 0,04 s, phình rồi xẹp (sin), trôi ra ngoài, xoay
function drawSparkles(ctx, t, t0, p, scale = 1) {
  const age = t - t0; if (age < 0 || age > .6) return;
  const pts = [[-70, -40, 26], [80, -70, 20], [60, 50, 16], [-55, 70, 14], [0, -110, 18]];
  pts.forEach(([dx, dy, r], i) => {
    const a = clamp((age - i * .04) / .45); if (a <= 0 || a >= 1) return;
    const s = Math.sin(a * Math.PI);
    star4(ctx, p.x + dx * scale * (1 + a * .3), p.y + dy * scale * (1 + a * .3),
          r * s * 1.4 * scale, a * 1.5, i % 2 ? '#fff' : '#fff2a0');
  });
}

// Một ngôi sao lóe lên cạnh mặt: hợp làm khoảnh khắc kết thúc
function drawGlint(ctx, t, t0, p) {
  const age = t - t0; if (age < 0 || age > .35) return;
  star4(ctx, p.x, p.y, 34 * Math.sin(age / .35 * Math.PI), age * 4, '#ffffff');
}
```

Mẹo **so le thời gian** (`i * .04`): nhiều phần tử xuất hiện lệch nhau một chút luôn trông tự nhiên hơn xuất hiện cùng lúc.

---

## 12. Pop-in cho biển báo, icon, bong bóng thoại

Công thức chung: **phóng to bằng `E.back`** (vượt quá cỡ rồi bật lại) trong 0,18–0,2 giây đầu, **thu nhỏ hoặc mờ dần** trong 0,12–0,15 giây cuối.

```js
function popScale(age, dur, inT = .2, outT = .15) {
  if (age < 0 || age > dur) return 0;
  const sIn  = E.back(clamp(age / inT));
  const sOut = 1 - clamp((age - dur + outT) / outT);
  return sIn * sOut;
}

// Icon nổi trên đầu (zzz, !, ?): pop + nhấp nhô nhẹ
const s = popScale(age, 1.2);
ctx.save();
ctx.translate(p.x, p.y - 40 + Math.sin(age * 6) * 6);  // nhấp nhô
ctx.scale(s, s);
drawIcon(ctx, 'zzz');
ctx.restore();
```

**Dấu đóng (stamp):** bắt đầu to gấp 2–3 lần và nghiêng, **đập xuống bằng `E.in`**, đúng lúc chạm thì rung màn hình 2D và phát tiếng "stamp". Để mực trông loang lổ, dùng `globalCompositeOperation = 'destination-out'` khoét vài chục chấm ngẫu nhiên.

---

## 13. Gắn âm thanh đúng khoảnh khắc

Mỗi hiệu ứng **tự sinh sự kiện âm thanh** tại đúng thời điểm của nó. Xong thì xuất thành danh sách để trộn bằng ffmpeg hoặc Python:

```js
function events(story) {
  const ev = [];
  for (const f of allFx) {
    if (f.punch != null)   ev.push({ t: f.at, sfx: 'swish', gain: .7 });
    if (f.shake >= .08)    ev.push({ t: f.at, sfx: 'impact', gain: clamp(f.shake * 7, .4, 1) });
    if (f.stamp)           ev.push({ t: f.at, sfx: 'stamp' });
    if (f.sparkle)         ev.push({ t: f.at, sfx: 'sparkle', gain: .8 });
  }
  for (const a of clapActions)
    for (const tt of clapTimes(a.t0, a.dur)) ev.push({ t: tt, sfx: 'clap' }); // clap_1/2/3 chọn ngẫu nhiên
  return ev.sort((a, b) => a.t - b.t);
}
```

Mẹo: chuẩn bị 2–3 biến thể cho cùng một tiếng (`clap_1.wav`, `clap_2.wav`…) và chọn ngẫu nhiên, để tiếng lặp lại không bị đơn điệu.

---

## 14. Ghép tất cả: vòng lặp render một khung hình

```js
function renderFrame(t) {
  // 1. Tư thế + mặt từng nhân vật
  for (const c of characters) {
    const P = computePose(c, t);                 // mục 5
    applyPose(c, P);
    setFace(c, P._face || currentExpr(c, t), isBlinking(c, t), P._talk && t % .2 < .1);
  }
  // 2. Camera: chuyển động cơ bản (push/crane/orbit) → punch → shake
  placeCamera(camera, t);                        // ví dụ: dolly-in 20% với E.inout suốt shot
  applyPunch(camera, t);                         // mục 9
  camera.lookAt(target);
  applyShake(camera, t, shakes);                 // mục 8 (sau lookAt)
  // 3. Render 3D
  renderer.render(scene, camera);
  // 4. Overlay 2D lên canvas phía trên
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(renderer.domElement, 0, 0);
  drawBursts(ctx, t); drawSparkles(ctx, ...); drawSigns(ctx, t); drawCaptions(ctx, t);
}
// Render offline: for (let i = 0; i < frames; i++) renderFrame(i / fps) → lưu JPG → ffmpeg ghép video
```

---

## 15. Demo tối giản chạy được ngay

Lưu thành `demo.html`, mở bằng trình duyệt (cần internet để tải three.js từ CDN). Một nhân vật khối đứng thở, vỗ tay 1 giây mỗi 3 giây, kèm tia tóe, punch-in, rung và đổi mặt.

```html
<!DOCTYPE html>
<html><body style="margin:0;background:#000">
<canvas id="ov" style="position:absolute;inset:0"></canvas>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H); document.body.prepend(renderer.domElement);
const ov = document.getElementById('ov'); ov.width = W; ov.height = H; const ctx = ov.getContext('2d');
const scene = new THREE.Scene(); scene.background = new THREE.Color('#5fb4ff');
scene.add(new THREE.HemisphereLight('#fff', '#668', 2.2));
const sun = new THREE.DirectionalLight('#fff', 1.5); sun.position.set(3, 8, 6); scene.add(sun);
const camera = new THREE.PerspectiveCamera(45, W / H, .1, 100);

// helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
const E = { out: t => 1 - Math.pow(1 - t, 3) };
const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: .6 });
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));

// rig
const c = {}; c.root = new THREE.Group(); scene.add(c.root);
c.body = new THREE.Group(); c.root.add(c.body);
c.hips = new THREE.Group(); c.body.add(c.hips);
c.upper = new THREE.Group(); c.hips.add(c.upper);
const torso = box(2, 2, 1, '#1fbf6a'); torso.position.y = 1; c.upper.add(torso);
c.neck = new THREE.Group(); c.neck.position.y = 2.02; c.upper.add(c.neck);
const head = box(1.2, 1.2, 1.2, '#f5cd30'); head.position.y = .6; c.neck.add(head);
// mặt: canvas texture dán lên mặt trước của đầu
const faceCv = document.createElement('canvas'); faceCv.width = 256; faceCv.height = 256;
const faceTex = new THREE.CanvasTexture(faceCv); faceTex.colorSpace = THREE.SRGBColorSpace;
const face = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: faceTex, transparent: true }));
face.position.set(0, .6, .61); c.neck.add(face);
function drawFace(expr) {
  const g = faceCv.getContext('2d'); g.clearRect(0, 0, 256, 256); g.fillStyle = g.strokeStyle = '#151515'; g.lineCap = 'round';
  for (const s of [-1, 1]) {
    const x = 128 + s * 40, y = 100; g.beginPath();
    if (expr === 'happy') { g.lineWidth = 9; g.arc(x, y + 8, 14, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); }
    else { g.ellipse(x, y, 9, 15, 0, 0, 7); g.fill(); }
  }
  g.lineWidth = 9; g.beginPath();
  if (expr === 'happy') { g.ellipse(128, 165, 28, 20, 0, 0, Math.PI); g.fill(); }
  else { g.arc(128, 130, 34, .25 * Math.PI, .75 * Math.PI); g.stroke(); }
  faceTex.needsUpdate = true;
}
const mkArm = sx => { const p = new THREE.Group(); p.position.set(sx * 1.5, 1.85, 0); p.rotation.order = 'YXZ';
  const a = box(1, 1.9, 1, '#f5cd30'); a.position.y = -.85; p.add(a);
  const hand = new THREE.Group(); hand.position.y = -1.9; p.add(hand); p.userData.hand = hand; c.upper.add(p); return p; };
c.armL = mkArm(1); c.armR = mkArm(-1);
const mkLeg = sx => { const p = new THREE.Group(); p.position.x = sx * .5; const l = box(1, 2, 1, '#2b4fb8'); l.position.y = -1; p.add(l); c.hips.add(p); return p; };
c.legL = mkLeg(1); c.legR = mkLeg(-1);

// pose
const REST = () => ({ hipY: 2, hipDY: 0, up: [0,0,0], neck: [0,0,0], aL: [0,0,.06], aR: [0,0,-.06], lL: 0, lR: 0 });
const ARR = ['up', 'neck', 'aL', 'aR'];
const blend = (b, o, w) => { for (const k in o) { if (ARR.includes(k)) for (let i = 0; i < 3; i++) b[k][i] = lerp(b[k][i], o[k][i], w); else b[k] = lerp(b[k], o[k], w); } return b; };
const idle = t => { const b = Math.sin(t * 2.1); return { up: [.02 * b, 0, 0], aL: [0, 0, .07 + .02 * b], aR: [0, 0, -.07 - .02 * b], neck: [0, .07 * Math.sin(t * .8), 0] }; };
const clap = lt => { const g = .5 + .5 * Math.cos(2 * Math.PI * 4.5 * Math.max(0, lt - .1)); const y = lerp(.22, .6, g); return { aL: [-1.38, -y, 0], aR: [-1.38, y, 0] }; };
const apply = P => { c.hips.position.y = P.hipY + P.hipDY; c.upper.rotation.set(...P.up); c.neck.rotation.set(...P.neck);
  c.armL.rotation.set(...P.aL); c.armR.rotation.set(...P.aR); c.legL.rotation.x = P.lL; c.legR.rotation.x = P.lR; };

function drawBurst(t, t0, p) { const age = t - t0; if (age < 0 || age > .2) return; const a = age / .2;
  ctx.save(); ctx.translate(p.x, p.y); ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const ang = i / 9 * Math.PI * 2 + .3, r0 = 40 + a * 50, r1 = r0 + 34 * (1 - a);
    ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 10; ctx.stroke(); ctx.strokeStyle = i % 2 ? '#fff' : '#ffe14d'; ctx.lineWidth = 5; ctx.stroke(); }
  ctx.restore(); }

const t0 = performance.now(); let lastExpr = '';
function loop() {
  const t = (performance.now() - t0) / 1000, cyc = t % 3;          // mỗi chu kỳ 3 s
  const CLAP_AT = 1, CLAP_DUR = 1;
  const P = blend(REST(), idle(t), 1);
  const lt = cyc - CLAP_AT, w = clamp(Math.min(lt / .12, (CLAP_DUR - lt) / .12));
  if (lt >= 0 && lt <= CLAP_DUR) blend(P, clap(lt), w);
  apply(P);
  const expr = lt >= 0 && lt <= CLAP_DUR + .3 ? 'happy' : 'smile';
  if (expr !== lastExpr) { drawFace(expr); lastExpr = expr; }

  // camera: dolly-in chậm + punch + shake
  const dist = W / H < .8 ? 19 : 12;                         // màn hình dọc → lùi xa hơn
  camera.position.set(0, 3.2, dist - cyc * .5); camera.fov = 45;
  if (cyc >= CLAP_AT) camera.fov *= 1 - .18 * E.out(clamp((cyc - CLAP_AT) / .13));
  camera.updateProjectionMatrix(); camera.lookAt(0, 3, 0);
  const k = (cyc - CLAP_AT - .04) / .28;
  if (k >= 0 && k < 1) { const s = .08 * Math.pow(1 - k, 2);
    camera.position.x += Math.sin(t * 97.3) * s; camera.position.y += Math.sin(t * 83.7) * s; camera.rotateZ(Math.sin(t * 61.7) * s * .04); }
  renderer.render(scene, camera);

  ctx.clearRect(0, 0, W, H);
  const hL = new THREE.Vector3(), hR = new THREE.Vector3();
  c.armL.userData.hand.getWorldPosition(hL); c.armR.userData.hand.getWorldPosition(hR);
  const v = hL.add(hR).multiplyScalar(.5).project(camera);   // điểm giữa hai bàn tay
  const scr = { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H };
  for (let n = 0; ; n++) { const tt = CLAP_AT + .1 + n / 4.5; if (tt > CLAP_AT + CLAP_DUR - .02) break; drawBurst(cyc, tt, scr); }
  requestAnimationFrame(loop);
}
loop();
</script></body></html>
```

---

## 16. Áp dụng sang công cụ khác

| Kỹ thuật | Blender | After Effects | Unity |
|---|---|---|---|
| Động tác bằng hàm | Driver: `sin(frame/24*12)*0.3` | Expression: `Math.sin(time*12)*20` | `transform.localRotation` trong `Update()` |
| Easing | Graph Editor → Back / Elastic | Easy Ease hoặc expression `ease()` | `AnimationCurve` |
| Rung camera | Noise modifier trên F-curve | `wiggle(30, 15)` × độ giảm dần | Cinemachine Impulse |
| Punch-in | Keyframe focal length 2 khung | Scale lớp 100 → 118% trong 4 khung | Tween `fieldOfView` |
| Tóe, lấp lánh | Grease Pencil | Shape layer + Repeater | UI Image / Particle |
| Mặt đổi biểu cảm | Đổi image texture theo frame | Time remap một chuỗi hình | Đổi `material.mainTexture` |

---

## 17. Mẹo tinh chỉnh

1. **Không bao giờ đứng im.** Luôn có idle, camera luôn dolly-in nhẹ (~20%/shot).
2. **Lệch pha cho đám đông.** Mỗi người một `ph` và trễ thêm 0–0,15 giây cho động tác chung.
3. **Đến sớm hơn chữ một chút.** Động tác bắt đầu trước 0,1–0,25 giây để đỉnh của nó rơi đúng chữ.
4. **Tần số lẻ khi rung.** 97,3 / 83,7 / 61,7 nghe kỳ nhưng chính vì vậy mà không lộ chu kỳ.
5. **Giảm dần theo bình phương** cho mọi thứ "va chạm": rung, chớp sáng, tia tóe.
6. **So le** khi có nhiều phần tử (sparkle, chữ, người trong đám đông).
7. **Mọi thứ phụ thuộc `t`**, không phụ thuộc trạng thái khung trước. Nhờ đó render được từng khung độc lập, chia nhiều máy hay tiếp tục khi bị ngắt đều được.
8. **Một công thức cho cả hình và tiếng.** Thời điểm tay chạm, tia tóe và tiếng vỗ cùng tính từ `clapTimes()`, nên không bao giờ lệch.
9. **Biên độ là "cá tính".** Cùng hàm đi bộ: `amp .4` là rụt rè, `.62` bình thường, `.9` hớn hở.
10. **Mặt nói nhiều hơn tay.** Hình khối đơn giản thì biểu cảm phải rõ, phóng đại, đổi đúng nhịp.
