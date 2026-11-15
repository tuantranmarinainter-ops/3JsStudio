# Dựng nhân vật bằng JS: người khối kiểu Roblox, gấu bông, quái vật

## Luật dự án (14/11)
- **Da nhân vật:** phần da lộ ra (mặt/đầu, tay, chân) phải **nét, trơn một màu, ranh giới da–vải sắc**. KHÔNG phủ nếp nhăn, nhiễu hay làm nhoè của texture vải lên da (lỗi ep004: da vàng lốm đốm, nhoè theo áo quần).
- Mục "làm nhoè / nếp nhăn" bên dưới chỉ áp cho **vải**; vật liệu da tách riêng, không dùng chung texture với vải.
- Kiểm bằng số trên ảnh cận: độ lệch chuẩn màu vùng da ≈ 0.

Hướng dẫn dựng nhân vật **hoàn toàn bằng code Three.js**: không cần Blender, không cần file model, không phải cắt mesh. Texture cũng vẽ bằng code (canvas), nhưng có đủ **viền, nếp nhăn, đường may, chỗ sáng chỗ tối** và được **làm nhoè** như quần áo Roblox độ phân giải thấp. Mục 8 là demo hoàn chỉnh có ba nhân vật cử động, chép ra là chạy.

*Demo gồm: người khối đầu trụ, mặc vest kẻ ô, mặt để trống chờ bạn gắn bộ mặt riêng (vẫy tay khi đi), gấu bông lông xù (vẫy tay, nghiêng đầu), quái vật một mắt (nhảy nén giãn, xúc tu uốn, đảo mắt, chớp mắt).*

---

## Mục lục
1. Nguyên tắc: đẹp = khối + texture + ánh sáng
2. Thiết lập renderer và ánh sáng
3. Bộ cọ vẽ texture "kiểu Roblox"
4. Người khối R6
5. Gấu bông
6. Quái vật
7. Công thức chế thêm sinh vật khác
8. Demo hoàn chỉnh
9. Thay texture vẽ bằng code bằng ảnh PNG tự vẽ
10. Mẹo và lỗi hay gặp

---

## 1. Nguyên tắc: đẹp = khối + texture + ánh sáng

| Lớp | Vai trò | Trong hướng dẫn này |
|---|---|---|
| **Khối** | Dáng nhân vật | Hộp bo cạnh (`RoundedBoxGeometry`), cầu, capsule, nón |
| **Texture** | 80% độ đẹp: chi tiết, viền, bóng "nướng" sẵn | Vẽ bằng canvas: vải, đường may, lông, đốm da |
| **Ánh sáng** | Cho khối nổi lên, có chiều sâu | Đèn trời + đèn chính đổ bóng mềm + đèn viền sau lưng + tone mapping ACES |

**Vì sao dựng bằng JS thì không bị rách khi cử động?** Mỗi bộ phận là **một vật thể riêng**, gắn vào một **khớp** (`THREE.Group`) đặt đúng điểm xoay. Với nhân vật mềm như gấu, tay chân là capsule **cắm sâu vào thân**: xoay cỡ nào thì phần chìm vẫn che chỗ nối, nên không lộ khe như khi cắt một mesh liền.

```
root ── hips ──┬── upper ──┬── neck ── đầu, mặt, tai, tóc…
               │           ├── armL (khớp vai) ── tay
               │           └── armR
               ├── legL (khớp háng) ── chân
               └── legR
```

Bộ khớp này **trùng với cẩm nang animation trước** (`hips`, `upper`, `neck`, `armL/R`, `legL/R`), nên mọi công thức động tác (vỗ tay, đi, nhảy, run…) dùng lại được ngay.

---

## 2. Thiết lập renderer và ánh sáng

```js
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;      // bóng mềm
renderer.toneMapping = THREE.ACESFilmicToneMapping;    // màu "điện ảnh", không cháy sáng
renderer.toneMappingExposure = 1.05;

scene.add(new THREE.HemisphereLight('#ffffff', '#a89a8a', 1.3));   // trời sáng, đất ấm (đất quá tối → mặt dưới bị nâu)
const key = new THREE.DirectionalLight('#fff4e0', 2.6);            // đèn chính hơi vàng
key.position.set(6, 12, 9); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -.0005;
const rim = new THREE.DirectionalLight('#bfe0ff', 1.4);            // đèn viền xanh sau lưng
rim.position.set(-8, 6, -10);
```

- **Đèn viền (rim light)** đặt sau lưng nhân vật tạo một đường sáng mảnh quanh mép, tách nhân vật khỏi nền. Đây là bí quyết rẻ nhất để trông "pro".
- Mọi mesh nhân vật đặt `castShadow = true`, mặt đất đặt `receiveShadow = true`.
- Texture màu phải đặt `colorSpace = THREE.SRGBColorSpace`, nếu không màu sẽ bị nhạt.

---

## 3. Bộ cọ vẽ texture "kiểu Roblox"

Quần áo Roblox đẹp vì **bóng tối, nếp nhăn, viền được vẽ sẵn vào ảnh**, và ảnh lại ở **độ phân giải thấp nên nhoè nhẹ**: không có nét nào sắc lẹm. Ta làm y như vậy bằng canvas, xếp chồng 7 lớp:

| Lớp | Hàm | Tạo cảm giác |
|---|---|---|
| 1. Màu nền + kẻ ô mờ (tuỳ chọn) | `fabric({plaid})` | Vải vest kẻ caro rất nhạt |
| 2. Hạt vải | `fabric()`: cộng nhiễu ±7% mỗi pixel | Bề mặt vải, không bị bệt |
| 3. Sáng trên, tối dưới | `fabric()`: gradient dọc | Ánh sáng từ trên chiếu xuống |
| 4. Tối dần ở mép | `fabric()`: 4 gradient đen trong suốt từ 4 cạnh | "Ambient occlusion" vẽ sẵn: khối trông lồi lên |
| 5. Nếp nhăn mềm | `fabric({folds})`: nét tối rộng + nét sáng, vẽ **qua bộ lọc blur** | Mảng bóng nếp vải, không thành vệt xước |
| 6. Chi tiết + viền | `stitch()`, `band()`, `rim2d()` | Đường may, cổ tay, gấu áo, viền tối ở mép |
| 7. **Làm nhoè toàn bộ** | `soften()` | Chất "texture Roblox độ phân giải thấp" |

### Lớp nếp nhăn mềm

```js
g.lineCap = 'round'; g.filter = `blur(${5 * s}px)`;     // mọi nét vẽ sau đây đều bị làm mờ
for (let i = 0; i < folds; i++) {
  const x = (.15 + rnd() * .7) * w, y = rnd() * h * .55, len = (.25 + rnd() * .3) * h, bend = (rnd() - .5) * w * .3;
  for (const [col, off, lw] of [['rgba(0,0,0,.38)', 0, 18], ['rgba(255,255,255,.1)', 13, 10]]) {
    g.strokeStyle = col; g.lineWidth = lw * s; g.beginPath(); g.moveTo(x + off * s, y);
    g.quadraticCurveTo(x + off * s + bend, y + len / 2, x + off * s + bend * .3, y + len); g.stroke();
  }
}
g.filter = 'none';
```

### Lớp làm nhoè: bí quyết chính

Vẽ xong ở 256 px, **thu nhỏ còn khoảng 1/3 rồi phóng to lại** (chi tiết sắc mất đi giống ảnh độ phân giải thấp), sau đó phủ thêm một lớp blur:

```js
const SOFT = [.32, 1.8];   // [tỉ lệ thu nhỏ, độ blur px]: số nhỏ hơn / blur lớn hơn = nhoè hơn
function soften(c, [scale, blur]) {
  const w = c.width, h = c.height, t = document.createElement('canvas');
  t.width = Math.max(4, Math.round(w * scale)); t.height = Math.max(4, Math.round(h * scale));
  const tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(c, 0, 0, t.width, t.height);
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(t, 0, 0, w, h);                              // lớp nền không mờ: tránh viền trong suốt
  g.filter = `blur(${blur}px)`; g.drawImage(t, 0, 0, w, h); g.filter = 'none';
}
// dùng: tex(256, 256, draw, { soft: SOFT })
```

### Phần KHÔNG được làm nhoè: vẽ sau (`post`)

Làm nhoè cả tấm ảnh thì màu áo sẽ **lem sang bàn tay**. Vì vậy `tex()` nhận thêm hàm `post`, **chạy sau khi làm nhoè**. Thứ gì cần giữ sạch, sắc (da tay, logo, số áo, chữ) thì vẽ trong `post`:

```js
function tex(w, h, draw, { srgb = true, soft = null, post = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  if (soft) soften(c, soft);
  if (post) post(c.getContext('2d'), w, h);     // vẽ SAU khi làm nhoè → không bị lem
  /* … tạo CanvasTexture … */
}

// Tay áo: vải + cổ tay được làm nhoè, bàn tay vẽ sau nên giữ màu da sạch
const arm = cloth(128, 256,
  (g, w, h) => { /* vải vest, cổ tay vest, cổ tay sơ mi (tới 90%) */ },
  (g, w, h) => { g.fillStyle = o.skin; g.fillRect(0, h * .9, w, h * .1); });
// Lòng bàn tay (mặt dưới hộp) dùng màu da phẳng, không qua canvas:
const bot = new THREE.MeshStandardMaterial({ color: o.skin, roughness: .85 });
```

| Muốn | Chỉnh `SOFT` |
|---|---|
| Nhoè như ảnh mẫu Roblox | `[.32, 1.8]` (mặc định) |
| Nhoè hơn nữa, kiểu ảnh rất thấp | `[.22, 2.5]` |
| Sắc nét hơn | `[.5, 1]` |
| Tắt hẳn | bỏ `{ soft }` |

Gấu dùng `[.6, 1]` (giữ sợi lông), quái vật dùng `[.4, 2]` (đốm da loang mềm).

**Mẹo:** dùng hàm ngẫu nhiên **có seed** (`rnd()` trong demo) thay vì `Math.random()`. Như vậy mỗi lần mở, texture vẫn giống hệt nhau, khi render video không bị nhấp nháy giữa các lần chạy.

---

## 4. Người khối R6

### Kích thước (đơn vị Three.js, theo tỉ lệ R6 cổ điển)

| Bộ phận | Hình khối | Kích thước | Khớp xoay đặt ở |
|---|---|---|---|
| Thân | hộp bo cạnh 0,1 | 2 × 2 × 1 | hông (`hips`, y = 2) |
| Đầu | **trụ bo tròn mép** | bán kính 0,62, cao 1,22, bo mép 0,24 | cổ (đỉnh thân) |
| Tay | hộp bo cạnh 0,1 | 1 × 2 × 1 | vai: x = ±1,5, y = 1,85 |
| Chân | hộp bo cạnh 0,08 | 1 × 2 × 1 | háng: x = ±0,5, đáy hông |

### Đầu hình trụ bo mép (như đầu Roblox cổ điển)

Vẽ **một đường viền nửa mặt cắt** (đáy phẳng → góc bo dưới → thân thẳng → góc bo trên → đỉnh phẳng) rồi **xoay quanh trục Y** bằng `LatheGeometry`:

```js
function roundedCylinder(r = .62, h = 1.22, cr = .24, seg = 10, radial = 48) {
  const pts = [new THREE.Vector2(0, -h / 2)];
  for (let i = 0; i <= seg; i++) { const a = -Math.PI / 2 + i / seg * Math.PI / 2;
    pts.push(new THREE.Vector2(r - cr + Math.cos(a) * cr, -h / 2 + cr + Math.sin(a) * cr)); }   // góc bo dưới
  for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI / 2;
    pts.push(new THREE.Vector2(r - cr + Math.cos(a) * cr, h / 2 - cr + Math.sin(a) * cr)); }    // góc bo trên
  pts.push(new THREE.Vector2(0, h / 2));
  return new THREE.LatheGeometry(pts, radial);
}
```

`cr` (bán kính bo mép) quyết định dáng: `0,24` giống đầu Roblox, `0,1` vuông vức hơn, `0,4` tròn như viên kẹo.

### Mặt để trống + gắn bộ mặt của bạn

Đầu **không vẽ mặt sẵn**. Phía trước đầu có một **mảnh trụ cong mỏng** (lớp dán mặt) ôm sát bề mặt, ẩn cho tới khi bạn gắn ảnh:

```js
const FACE = { h: .92 };                                  // chiều cao vùng mặt
const arc = FACE.h / (HEAD.r + .004);                    // góc ôm sao cho rộng (theo cung) = cao → VUÔNG
const faceGeo = new THREE.CylinderGeometry(HEAD.r + .004, HEAD.r + .004, FACE.h, 40, 1, true, -arc / 2, arc);
c.faceMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: .7, depthWrite: false,
                                             polygonOffset: true, polygonOffsetFactor: -2 });  // chống nhấp nháy
c.setFace = (t) => { if (!t) { c.face.visible = false; return; }
                     c.faceMat.map = t; c.faceMat.needsUpdate = true; c.face.visible = true; };
```

**Cách dùng bộ mặt có sẵn:**

```js
const FACES = loadFaceSet({
  smile:  'faces/smile.png',
  shock:  'faces/shock.png',
  sleepy: 'faces/sleepy.png',
});
bach.setFace(FACES.smile);        // gắn mặt
bach.setFace(FACES.shock);        // đổi mặt bất cứ lúc nào, kể cả giữa animation
bach.setFace(null);               // về mặt trống
```

**Yêu cầu ảnh mặt:**
- **PNG nền trong suốt, tỉ lệ vuông** (256×256 hoặc 512×512). Vùng dán đã được tính để vuông, nên ảnh không bị kéo bè.
- Mặt **nằm giữa ảnh**, chừa lề khoảng 10% bốn phía.
- Mặt to hay nhỏ so với đầu: chỉnh `FACE.h` (0,8 nhỏ, 0,92 mặc định, 1,0 to).
- Muốn đổi mặt theo lời thoại: gọi `setFace()` theo mốc thời gian, giống cách đổi biểu cảm trong cẩm nang animation.

### Mỗi mặt hộp một texture

`BoxGeometry`/`RoundedBoxGeometry` có 6 nhóm mặt theo thứ tự **`[+x, −x, +y, −y, +z (trước), −z (sau)]`**. Truyền **mảng 6 material** thì mỗi mặt mang một ảnh riêng:

```js
const torso = new THREE.Mesh(new RoundedBoxGeometry(2, 2, 1, 4, .1),
  [side, side, top, bottom, front, back]);
```

**Thân áo vest (mặt trước)** được vẽ theo thứ tự: vải xanh đen kẻ ô có nếp → sơ mi trắng hình chữ V giữa hai ve áo, tối dần hai bên → cổ áo sơ mi → cà vạt mảnh có vệt sáng giữa → bóng đổ của ve áo lên sơ mi + mép ve sáng mảnh → đường may túi ngực → 2 nút → gấu áo tối → viền mép → **làm nhoè**.

**Tay áo:** vải vest có nếp → cổ tay vest gập dày, tối hơn → cổ tay sơ mi trắng mảnh → *(làm nhoè)* → bàn tay màu da 10% dưới, vẽ trong `post` nên không bị lem.

**Chân:** vải quần có nếp → đường may dọc → giày 14% dưới → đế giày sáng.

**Tóc (tuỳ chọn, `hair: '#màu'`):** một chóp trụ bo tròn lớn hơn đầu một chút, úp lên đỉnh.

> Muốn đổi trang phục: đổi màu trong object cấu hình (`jacket`, `plaid`, `shirt`, `tie`, `pants`, `shoes`, `skin`, `hair`) hoặc viết thêm vài dòng vẽ vào `front`.

---

## 5. Gấu bông

### Dáng: ghép từ các khối cầu bị kéo giãn (ellipsoid)

Một hàm `blob(material, cha, vị trí, tỉ lệ)` dùng chung **một** `SphereGeometry`, chỉ đổi `scale`:

| Bộ phận | Vị trí | Tỉ lệ (x, y, z) | Vật liệu |
|---|---|---|---|
| Thân | (0, .75, 0) | 1,05 × 1,2 × 0,95 | lông nâu |
| Bụng | (0, .62, .62) | 0,72 × 0,82 × 0,4 | lông sáng |
| Đầu | (0, .8, 0) trong `neck` | 1 × 0,92 × 0,9 | lông nâu |
| Mõm | (0, .55, .74) | 0,44 × 0,34 × 0,3 | lông sáng |
| Mũi, mắt | trước mặt | nhỏ | đen bóng (`roughness .15`) |
| Tai (+ lòng tai) | (±.72, 1.5, 0) | 0,33 × 0,33 × 0,16 | nâu + sáng |
| Nơ | cổ | 2 nón nằm ngang + 1 cầu nhỏ | xanh |

**Mắt và mũi bóng** (độ nhám thấp) tự bắt điểm sáng từ đèn, nên không cần vẽ chấm sáng, trông "long lanh" như mắt nhựa của gấu thật.

### Lông: hàng nghìn nét ngắn + bump map

```js
// 9000 nét ngắn, hướng chủ yếu dọc xuống, nửa sáng nửa tối
const strokes = []; for (let i = 0; i < 9000; i++)
  strokes.push([rnd()*512, rnd()*512, (rnd()-.5)*.9 + Math.PI/2, 4 + rnd()*7, rnd()]);
// Vẽ 2 lần cùng bộ nét: một bản màu (map), một bản xám (bumpMap)
const fur = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 3, roughness: 1 });
```

**Bump map** làm ánh sáng "vấp" vào từng sợi, nên lông trông xù thật dù khối vẫn trơn. Đặt `wrapS/T = RepeatWrapping` và `repeat (2, 2)` để sợi lông nhỏ, mịn.

### Tay chân: capsule cắm sâu = không rách

```js
const p = new THREE.Group(); p.position.set(sx * .82, 1.35, .05);  // khớp vai nằm TRONG thân
const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.27, .55, 8, 20), fur);
arm.position.y = -.45; p.add(arm);                                 // capsule treo xuống từ khớp
```

Khớp vai nằm **bên trong** khối thân, đầu tròn của capsule chìm vào thân. Khi xoay tay lên 140°, phần chìm vẫn che chỗ nối. Đây chính là lỗi "bụng rách mảng" bạn gặp khi cắt mesh gấu trong Blender: cách dựng này tránh được hoàn toàn.

---

## 6. Quái vật

Quái vật một mắt minh hoạ bốn kỹ thuật "sinh vật sống":

### 6.1 Thân rung nhẹ (biến dạng đỉnh)
Lưu toạ độ gốc của khối cầu, mỗi khung đẩy từng đỉnh ra/vào theo sóng sin:

```js
geo.userData.base = geo.attributes.position.array.slice();       // lưu một lần
// mỗi khung:
for (let i = 0; i < pos.count; i++) {
  const x = base[i*3], y = base[i*3+1], z = base[i*3+2];
  const k = 1 + .035 * Math.sin(y * 3 + t * 5) + .025 * Math.sin(x * 4 + t * 3.3);
  pos.setXYZ(i, x * k, y * k, z * k);
}
pos.needsUpdate = true; geo.computeVertexNormals();
```

### 6.2 Nén và giãn giữ thể tích (squash & stretch)
Nguyên tắc số 1 của hoạt hình: **bẹp xuống thì phình ngang, dài ra thì thon lại.**

```js
const ph = (t * 1.1) % 1, h = Math.sin(Math.PI * ph);             // độ cao cú nhảy 0→1→0
const squash = Math.pow(1 - h, 6) * .28 - h * .08;               // chạm đất: bẹp; trên không: dài
mon.squash.position.y = h * 1.1;
mon.squash.scale.set(1 + squash * .5, 1 - squash, 1 + squash * .5);
```

### 6.3 Mắt: nhóm riêng để đảo và chớp
Tròng trắng + mống mắt (cầu dẹt) + con ngươi (cầu dẹt nhỏ hơn) nằm trong một `Group`. Xoay nhóm để đảo mắt, ép `scale.y` còn 0,1 trong 0,12 giây để chớp.

### 6.4 Xúc tu: chuỗi đốt lồng nhau, trễ pha
Mỗi đốt là con của đốt trước. Đốt thứ `i` xoay theo `sin(t*4 - i*.7)`, nên độ trễ pha tạo ra **sóng chạy dọc xúc tu**, và góc xoay cộng dồn làm xúc tu uốn cong tự nhiên.

```js
chain.forEach((seg, i) => { seg.rotation.z = s * (.12 + .28 * Math.sin(t * 4 - i * .7)); });
```

Kỹ thuật này dùng được cho **đuôi, vòi, tóc dài, dây, rắn, sâu**.

---

## 7. Công thức chế thêm sinh vật khác

| Sinh vật | Ghép từ | Texture | Chuyển động gợi ý |
|---|---|---|---|
| **Slime** | 1 cầu bị biến dạng + 2 mắt | Màu trong, `transparent`, `opacity .85`, roughness thấp | Squash & stretch mạnh, rung đỉnh nhiều |
| **Ma** | Cầu trên + nón ngược (`ConeGeometry` mở đáy) | Trắng, `emissive` nhẹ | Lơ lửng `sin`, đuôi nón lắc |
| **Robot khối** | R6 + ăng-ten (trụ + cầu phát sáng) | Kim loại: `metalness .8`, vạch tối, ốc vít | Cử động giật cục: làm tròn góc theo bậc |
| **Mèo/chó bông** | Như gấu, tai là nón, đuôi là chuỗi đốt | Lông như gấu, đổi màu và thêm vằn | Vẫy đuôi bằng chuỗi trễ pha |
| **Khủng long** | Thân ellipsoid ngang, cổ + đuôi chuỗi đốt, gai nón | Đốm da như quái vật | Đi lắc lư, đuôi cân bằng ngược pha |
| **Bạch tuộc** | Đầu cầu + 8 chuỗi xúc tu | Đốm + mặt dưới sáng hơn | Mỗi xúc tu một pha khác nhau |
| **Zombie khối** | R6 màu xanh, áo rách (vẽ răng cưa ở mép áo) | Vết bẩn, đường may | Hai tay giơ thẳng, đi lê |

**Ba nguyên tắc chung:**
1. Bộ phận chuyển động phải **có khớp riêng** và **chìm vào thân** ở chỗ nối.
2. **Mắt to, mắt bóng** thì nhân vật dễ thương và dễ đọc cảm xúc.
3. **Phối màu:** một màu chính, một màu sáng cho bụng/mõm/lòng bàn tay, một màu nhấn (nơ, sừng, mắt).

---

## 8. Demo hoàn chỉnh

Lưu thành `characters.html` và mở bằng trình duyệt (cần internet để tải three.js r170 từ CDN). Tham số tiện kiểm tra: `?t=3` đứng hình ở giây thứ 3; `?focus=0` (hoặc 1, 2) cận cảnh người khối (gấu, quái vật). Ví dụ: `characters.html?t=3&focus=0`. Dòng `bach.setFace(...)` đang để dạng chú thích: bỏ `//` và trỏ tới file mặt của bạn.

```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Nhân vật khối bằng JS</title>
<style>html,body{margin:0;background:#000;overflow:hidden}</style>
<script type="importmap">
{ "imports": {
  "three": "https://unpkg.com/three@0.170.0/build/three.module.js",
  "three/addons/": "https://unpkg.com/three@0.170.0/examples/jsm/"
} }
</script>
</head><body>
<script type="module">
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ================================================================ RENDERER + ÁNH SÁNG */
const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, W / H, .1, 200);

let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // ngẫu nhiên cố định
function tex(w, h, draw, opt = {}) {
  const { srgb = true, soft = null, post = null } = typeof opt === 'boolean' ? { srgb: opt } : opt;
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  if (soft) soften(c, soft);
  if (post) post(c.getContext('2d'), w, h);               // vẽ SAU khi làm nhoè → không bị lem (da tay, logo…)
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const shade = (hex, k) => { const c = new THREE.Color(hex); c.lerp(new THREE.Color(k > 0 ? '#fff' : '#000'), Math.abs(k)); return '#' + c.getHexString(); };

scene.background = tex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7cc4ff'); gr.addColorStop(1, '#e9f4ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
scene.add(new THREE.HemisphereLight('#ffffff', '#a89a8a', 1.3));
const key = new THREE.DirectionalLight('#fff4e0', 2.6); key.position.set(6, 12, 9); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -.0005;
Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -4, near: 1, far: 40 }); scene.add(key);
const rim = new THREE.DirectionalLight('#bfe0ff', 1.4); rim.position.set(-8, 6, -10); scene.add(rim); // viền sáng sau lưng
const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: '#cfe6b8', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

/* ================================================================ BỘ CỌ VẼ TEXTURE */
// Vải: màu nền + hạt vải + kẻ ô mờ (tuỳ chọn) + sáng trên/tối dưới + tối dần ở mép + nếp nhăn mềm
function fabric(g, w, h, base, { grain = .07, edge = .4, folds = 0, s = w / 256, plaid = false } = {}) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  if (plaid) { const step = 14 * s; g.lineWidth = 2 * s;
    for (let x = rnd() * step; x < w; x += step) { g.strokeStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = rnd() * step; y < h; y += step) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * 255 * grain; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const vg = g.createLinearGradient(0, 0, 0, h); vg.addColorStop(0, 'rgba(255,255,255,.07)'); vg.addColorStop(.5, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.2)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
  const e = Math.min(w, h) * .25;
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, e, 0, 0, 0, e, h], [w, 0, w - e, 0, w - e, 0, e, h], [0, 0, 0, e, 0, 0, w, e], [0, h, 0, h - e, 0, h - e, w, e]]) {
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(0,0,0,${edge})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  }
  g.lineCap = 'round'; g.filter = `blur(${5 * s}px)`;     // vẽ nếp nhăn qua bộ lọc mờ → mảng bóng mềm, không thành vệt
  for (let i = 0; i < folds; i++) {                       // nếp nhăn: nét tối rộng + nét sáng bên cạnh
    const x = (.15 + rnd() * .7) * w, y = rnd() * h * .55, len = (.25 + rnd() * .3) * h, bend = (rnd() - .5) * w * .3;
    for (const [col, off, lw] of [['rgba(0,0,0,.38)', 0, 18], ['rgba(255,255,255,.1)', 13, 10]]) {
      g.strokeStyle = col; g.lineWidth = lw * s; g.beginPath(); g.moveTo(x + off * s, y);
      g.quadraticCurveTo(x + off * s + bend, y + len / 2, x + off * s + bend * .3, y + len); g.stroke();
    }
  }
  g.filter = 'none';
}
// Đường may nét đứt
function stitch(g, pts, s, col = 'rgba(255,255,255,.4)') {
  g.save(); g.setLineDash([6 * s, 5 * s]); g.strokeStyle = col; g.lineWidth = 2.5 * s; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore();
}
// Viền tối quanh mép mặt hộp (sau khi làm nhoè sẽ thành bóng mềm ở mép, đúng chất Roblox)
function rim2d(g, w, h, s, col = 'rgba(5,5,15,.55)', lw = 8) { g.strokeStyle = col; g.lineWidth = lw * s; g.strokeRect(lw * s / 2, lw * s / 2, w - lw * s, h - lw * s); }
// Dải màu ngang (gấu áo, cổ tay, giày)
function band(g, w, y0, y1, col, s) {
  g.fillStyle = col; g.fillRect(0, y0, w, y1 - y0);
  g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, y0, w, 3 * s);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, y1 - 4 * s, w, 4 * s);
}
// Làm nhoè: thu nhỏ còn `scale` rồi phóng lại (mất chi tiết sắc như texture Roblox độ phân giải thấp) + blur
function soften(c, [scale, blur]) {
  const w = c.width, h = c.height, t = document.createElement('canvas');
  t.width = Math.max(4, Math.round(w * scale)); t.height = Math.max(4, Math.round(h * scale));
  const tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(c, 0, 0, t.width, t.height);
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(t, 0, 0, w, h);                              // lớp nền không mờ: tránh viền trong suốt
  g.filter = `blur(${blur}px)`; g.drawImage(t, 0, 0, w, h); g.filter = 'none';
}
const mat = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: .85, ...o });

/* ================================================================ 1) NGƯỜI KHỐI KIỂU ROBLOX (R6) */
// Độ nhoè chung cho quần áo: vẽ ở 32% độ phân giải rồi phóng lại + làm mờ 1,8 px
const SOFT = [.32, 1.8];
const cloth = (w, h, draw, post) => mat(tex(w, h, draw, { soft: SOFT, post }));

// Thứ tự mặt của BoxGeometry: [+x, -x, +y, -y, +z (trước), -z (sau)]
function torsoMats(o) {
  const jacket = (g, w, h, folds) => fabric(g, w, h, o.jacket, { folds, s: w / 256, plaid: o.plaid });
  const hem = (g, w, h) => { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, h * .93, w, h * .07); };   // gấu áo
  const front = cloth(256, 256, (g, w, h) => {
    const s = w / 256; jacket(g, w, h, 3);
    // sơ mi lộ ra giữa hai ve áo, có bóng mềm hai bên
    const shirtPath = () => { g.beginPath(); g.moveTo(w * .3, 0); g.lineTo(w * .7, 0); g.lineTo(w * .56, h * .93); g.lineTo(w * .44, h * .93); g.closePath(); };
    shirtPath(); g.fillStyle = o.shirt; g.fill();
    const sg = g.createLinearGradient(w * .3, 0, w * .7, 0);
    sg.addColorStop(0, 'rgba(0,0,0,.4)'); sg.addColorStop(.32, 'rgba(0,0,0,0)'); sg.addColorStop(.68, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.4)');
    shirtPath(); g.fillStyle = sg; g.fill();
    // cổ áo sơ mi
    g.fillStyle = shade(o.shirt, -.06); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3 * s;
    for (const k of [-1, 1]) { g.beginPath(); g.moveTo(w * (.5 + k * .15), 0); g.lineTo(w * .5, h * .09); g.lineTo(w * (.5 + k * .09), h * .15); g.closePath(); g.fill(); g.stroke(); }
    // cà vạt mảnh
    g.fillStyle = o.tie; g.fillRect(w * .472, h * .07, w * .056, h * .06);
    g.beginPath(); g.moveTo(w * .478, h * .13); g.lineTo(w * .522, h * .13); g.lineTo(w * .538, h * .82); g.lineTo(w * .5, h * .88); g.lineTo(w * .462, h * .82); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(w * .5, h * .14); g.lineTo(w * .5, h * .8); g.stroke();
    // ve áo: bóng đổ lên sơ mi + mép sáng mảnh
    for (const [x0, x1, d] of [[.3, .44, 1], [.7, .56, -1]]) {
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 9 * s; g.beginPath(); g.moveTo(w * x0 + d * 5 * s, 0); g.lineTo(w * x1 + d * 5 * s, h * .93); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(w * x0, 0); g.lineTo(w * x1, h * .93); g.stroke();
    }
    stitch(g, [[w * .1, h * .32], [w * .26, h * .3]], s, 'rgba(255,255,255,.25)');            // túi ngực
    for (const y of [.62, .76]) { g.fillStyle = '#0d0f16'; g.beginPath(); g.arc(w * .4, h * y, 5 * s, 0, 7); g.fill(); }
    hem(g, w, h); rim2d(g, w, h, s);
  });
  const back = cloth(256, 256, (g, w, h) => { jacket(g, w, h, 2); stitch(g, [[w / 2, 0], [w / 2, h * .93]], 1, 'rgba(0,0,0,.35)'); hem(g, w, h); rim2d(g, w, h, 1); });
  const side = cloth(128, 256, (g, w, h) => { jacket(g, w, h, 1); hem(g, w, h); rim2d(g, w, h, .5); });
  const top = cloth(256, 128, (g, w, h) => { jacket(g, w, h, 0); g.fillStyle = o.shirt; g.fillRect(w * .36, 0, w * .28, h * .5); rim2d(g, w, h, 1); });
  const bottom = cloth(256, 128, (g, w, h) => fabric(g, w, h, o.pants, { s: 1 }));
  return [side, side, top, bottom, front, back];
}
function armMats(o) {
  const HAND = .9;                                          // bàn tay chiếm 10% dưới cùng
  const f = cloth(128, 256, (g, w, h) => {
    const s = w / 128; fabric(g, w, h, o.jacket, { folds: 2, s: s * .5, plaid: o.plaid });
    band(g, w, h * .74, h * .86, shade(o.jacket, -.3), s * .5);                 // cổ tay áo vest gập dày
    band(g, w, h * .86, h * HAND, o.shirt, s * .5);                             // cổ tay sơ mi
    rim2d(g, w, h, s * .5);
  }, (g, w, h) => {                                          // bàn tay: vẽ sau khi làm nhoè, giữ màu da sạch
    g.fillStyle = o.skin; g.fillRect(0, h * HAND, w, h * (1 - HAND));
    const gr = g.createLinearGradient(0, h * HAND, 0, h * HAND + 6); gr.addColorStop(0, 'rgba(0,0,0,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, h * HAND, w, 6);                            // bóng mảnh ngay dưới cổ tay áo
  });
  const top = cloth(128, 128, (g, w, h) => { fabric(g, w, h, o.jacket, { s: .5, plaid: o.plaid }); rim2d(g, w, h, .5); });
  const bot = mat(null, { color: o.skin });                 // lòng bàn tay (mặt dưới): màu da phẳng, không qua làm nhoè
  return [f, f, top, bot, f, f];
}
function legMats(o, side) {
  const face = (seam) => cloth(128, 256, (g, w, h) => {
    const s = w / 128; fabric(g, w, h, o.pants, { folds: 2, s: s * .5 });
    if (seam) stitch(g, [[w * .5, 0], [w * .5, h * .86]], s * .5, 'rgba(255,255,255,.2)');
    band(g, w, h * .86, h, o.shoes, s * .5);                                    // giày
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, h * .965, w, h * .035); // đế
    rim2d(g, w, h, s * .5);
  });
  const f = face(true), inner = face(false);
  const top = cloth(64, 64, (g) => { g.fillStyle = o.pants; g.fillRect(0, 0, 64, 64); }), sole = cloth(64, 64, (g) => { g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, 64, 64); });
  return side > 0 ? [f, inner, top, sole, f, f] : [inner, f, top, sole, f, f];
}
// Đầu hình trụ bo tròn mép trên/dưới (giống đầu Roblox cổ điển): xoay một đường viền quanh trục Y
function roundedCylinder(r = .62, h = 1.22, cr = .24, seg = 10, radial = 48) {
  const pts = [new THREE.Vector2(0, -h / 2)];
  for (let i = 0; i <= seg; i++) { const a = -Math.PI / 2 + i / seg * Math.PI / 2; pts.push(new THREE.Vector2(r - cr + Math.cos(a) * cr, -h / 2 + cr + Math.sin(a) * cr)); }
  for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI / 2; pts.push(new THREE.Vector2(r - cr + Math.cos(a) * cr, h / 2 - cr + Math.sin(a) * cr)); }
  pts.push(new THREE.Vector2(0, h / 2));
  return new THREE.LatheGeometry(pts, radial);
}
const HEAD = { r: .62, h: 1.22, cr: .24 };
// Vùng dán mặt: cao FACE.h, rộng (theo cung) = FACE.h → vuông, khớp ảnh PNG vuông. Tăng FACE.h nếu mặt của bạn cần to hơn.
const FACE = { h: .92 };
function makeR6(o) {
  const c = { root: new THREE.Group() };
  c.hips = new THREE.Group(); c.hips.position.y = 2; c.root.add(c.hips);
  c.upper = new THREE.Group(); c.hips.add(c.upper);
  const torso = new THREE.Mesh(new RoundedBoxGeometry(2, 2, 1, 4, .1), torsoMats(o)); torso.position.y = 1; c.upper.add(torso);
  c.neck = new THREE.Group(); c.neck.position.y = 2; c.upper.add(c.neck);
  const head = new THREE.Mesh(roundedCylinder(HEAD.r, HEAD.h, HEAD.cr), mat(null, { color: o.skin, roughness: .7 }));
  head.position.y = .64; c.neck.add(head);
  // Lớp dán mặt: mảnh trụ cong ôm phía trước đầu, để TRỐNG cho tới khi gọi setFace()
  c.faceMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: .7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const arc = FACE.h / (HEAD.r + .004);                  // góc ôm (radian) sao cho chiều rộng cung = chiều cao
  const faceGeo = new THREE.CylinderGeometry(HEAD.r + .004, HEAD.r + .004, FACE.h, 40, 1, true, -arc / 2, arc);
  c.face = new THREE.Mesh(faceGeo, c.faceMat); c.face.position.y = .64; c.face.visible = false; c.neck.add(c.face);
  c.setFace = (t) => { if (!t) { c.face.visible = false; return; } c.faceMat.map = t; c.faceMat.needsUpdate = true; c.face.visible = true; };
  if (o.hair) { const cap = new THREE.Mesh(roundedCylinder(HEAD.r + .06, .5, .22), mat(tex(128, 128, (g, w, h) => fabric(g, w, h, o.hair, { grain: .15, edge: .15, s: .5 }), { soft: SOFT })));
    cap.position.y = .64 + HEAD.h / 2 - .1; c.neck.add(cap); }
  const mkArm = (sx) => { const p = new THREE.Group(); p.position.set(sx * 1.5, 1.85, 0); p.rotation.order = 'YXZ'; c.upper.add(p);
    const m = new THREE.Mesh(new RoundedBoxGeometry(1, 2, 1, 4, .1), armMats(o)); m.position.y = -.85; p.add(m); return p; };
  c.armL = mkArm(1); c.armR = mkArm(-1);
  const mkLeg = (sx) => { const p = new THREE.Group(); p.position.set(sx * .5, 0, 0); c.hips.add(p);
    const m = new THREE.Mesh(new RoundedBoxGeometry(1, 2, 1, 4, .08), legMats(o, sx)); m.position.y = -1; p.add(m); return p; };
  c.legL = mkLeg(1); c.legR = mkLeg(-1);
  c.root.traverse(m => { if (m.isMesh && m !== c.face) m.castShadow = true; });
  return c;
}
// Nạp bộ mặt PNG của bạn (nền trong suốt). Ví dụ:
//   const FACES = loadFaceSet({ smile: 'faces/smile.png', shock: 'faces/shock.png', sleepy: 'faces/sleepy.png' });
//   bach.setFace(FACES.smile);        // đổi mặt bất cứ lúc nào, kể cả giữa animation
function loadFaceSet(dict) {
  const L = new THREE.TextureLoader(), out = {};
  for (const k in dict) { const t = L.load(dict[k]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; out[k] = t; }
  return out;
}

/* ================================================================ 2) GẤU BÔNG */
// Lông: hàng nghìn nét ngắn sáng/tối + bump map từ chính các nét đó
function furTextures(base) {
  const strokes = []; for (let i = 0; i < 9000; i++) strokes.push([rnd() * 512, rnd() * 512, (rnd() - .5) * .9 + Math.PI / 2, 4 + rnd() * 7, rnd()]);
  const draw = (g, w, h, gray) => {
    g.fillStyle = gray ? '#808080' : base; g.fillRect(0, 0, w, h); g.lineCap = 'round'; g.lineWidth = 2;
    for (const [x, y, a, l, k] of strokes) { const light = k > .5;
      g.strokeStyle = gray ? (light ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.5)') : (light ? 'rgba(255,240,220,.18)' : 'rgba(40,20,5,.22)');
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  };
  const map = tex(512, 512, (g, w, h) => draw(g, w, h, false), { soft: [.6, 1] }), bump = tex(512, 512, (g, w, h) => draw(g, w, h, true), { srgb: false, soft: [.6, 1] });
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); }
  return { map, bump };
}
function makeTeddy(o) {
  const c = { root: new THREE.Group() };
  const furA = furTextures(o.fur), furB = furTextures(o.light);
  const fur = new THREE.MeshStandardMaterial({ map: furA.map, bumpMap: furA.bump, bumpScale: 3, roughness: 1 });
  const light = new THREE.MeshStandardMaterial({ map: furB.map, bumpMap: furB.bump, bumpScale: 3, roughness: 1 });
  const gloss = new THREE.MeshStandardMaterial({ color: '#111', roughness: .15 });                // mắt, mũi bóng
  const SPH = new THREE.SphereGeometry(1, 48, 32);
  const blob = (m, parent, [x, y, z], [sx, sy, sz]) => { const b = new THREE.Mesh(SPH, m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); parent.add(b); return b; };

  c.hips = new THREE.Group(); c.hips.position.y = 1.0; c.root.add(c.hips);
  c.upper = new THREE.Group(); c.hips.add(c.upper);
  blob(fur, c.upper, [0, .75, 0], [1.05, 1.2, .95]);                // thân
  blob(light, c.upper, [0, .62, .62], [.72, .82, .4]);             // bụng
  const bow = new THREE.MeshStandardMaterial({ color: o.bow, roughness: .45 });
  for (const s of [-1, 1]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(.24, .45, 16), bow); cone.rotation.z = s * Math.PI / 2; cone.position.set(s * .22, 1.72, .72); cone.scale.z = .6; c.upper.add(cone); }
  blob(bow, c.upper, [0, 1.72, .78], [.11, .11, .09]);

  c.neck = new THREE.Group(); c.neck.position.y = 1.8; c.upper.add(c.neck);   // cổ = khớp xoay của đầu
  blob(fur, c.neck, [0, .8, 0], [1, .92, .9]);                      // đầu
  blob(light, c.neck, [0, .55, .74], [.44, .34, .3]);               // mõm
  blob(gloss, c.neck, [0, .7, 1.02], [.15, .11, .1]);               // mũi
  for (const s of [-1, 1]) {
    blob(gloss, c.neck, [s * .34, .98, .76], [.11, .12, .08]);      // mắt
    blob(fur, c.neck, [s * .72, 1.5, 0], [.33, .33, .16]);          // tai
    blob(light, c.neck, [s * .72, 1.5, .08], [.2, .2, .1]);         // lòng tai
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.09, .018, 8, 20, Math.PI), gloss); mouth.rotation.z = Math.PI; mouth.position.set(0, .5, 1.03); c.neck.add(mouth);

  // Tay/chân: capsule cắm sâu vào thân → xoay thoải mái mà KHÔNG lộ khe (khác với cắt mesh)
  const CAP_A = new THREE.CapsuleGeometry(.27, .55, 8, 20), CAP_L = new THREE.CapsuleGeometry(.33, .35, 8, 20);
  const mkArm = (sx) => { const p = new THREE.Group(); p.position.set(sx * .82, 1.35, .05); c.upper.add(p);
    const m = new THREE.Mesh(CAP_A, fur); m.position.y = -.45; p.add(m);
    blob(light, p, [0, -.8, .17], [.17, .17, .08]);                 // đệm lòng bàn tay
    return p; };
  c.armL = mkArm(1); c.armR = mkArm(-1);
  const mkLeg = (sx) => { const p = new THREE.Group(); p.position.set(sx * .48, 0, .12); c.hips.add(p);
    const m = new THREE.Mesh(CAP_L, fur); m.position.y = -.35; p.add(m);
    blob(fur, p, [0, -.72, .14], [.36, .26, .46]);                  // bàn chân
    blob(light, p, [0, -.72, .58], [.22, .2, .05]);                 // đệm chân
    return p; };
  c.legL = mkLeg(1); c.legR = mkLeg(-1);
  c.root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return c;
}

/* ================================================================ 3) QUÁI VẬT */
function makeMonster(o) {
  const c = { root: new THREE.Group() };
  const skin = tex(512, 256, (g, w, h) => {
    g.fillStyle = o.color; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const r = 6 + rnd() * 22; g.fillStyle = rnd() > .5 ? shade(o.color, -.25) : shade(o.color, .2); g.globalAlpha = .7; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, r * 1.6, r, 0, 0, 7); g.fill(); }
    g.globalAlpha = 1; const img = g.getImageData(0, 0, w, h), d = img.data; for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(img, 0, 0);
  }, { soft: [.4, 2] });
  c.bodyMat = new THREE.MeshStandardMaterial({ map: skin, roughness: .55 });
  c.squash = new THREE.Group(); c.root.add(c.squash);                    // nhóm để nén/giãn
  const geo = new THREE.SphereGeometry(1.35, 64, 48); geo.userData.base = geo.attributes.position.array.slice();
  c.body = new THREE.Mesh(geo, c.bodyMat); c.body.position.y = 1.4; c.body.castShadow = true; c.squash.add(c.body);
  // mắt to: tròng trắng + mống + con ngươi, nằm trong một nhóm để đảo mắt / chớp
  c.eye = new THREE.Group(); c.eye.position.set(0, 1.8, 1.0); c.squash.add(c.eye);
  c.eye.add(new THREE.Mesh(new THREE.SphereGeometry(.55, 32, 24), new THREE.MeshStandardMaterial({ color: '#fff', roughness: .2 })));
  const iris = new THREE.Mesh(new THREE.SphereGeometry(.3, 32, 16), new THREE.MeshStandardMaterial({ color: o.iris, roughness: .3 })); iris.scale.z = .35; iris.position.z = .45; c.eye.add(iris);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(.15, 24, 12), new THREE.MeshStandardMaterial({ color: '#050505', roughness: .1 })); pupil.scale.z = .3; pupil.position.z = .53; c.eye.add(pupil);
  // miệng + răng
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshStandardMaterial({ color: '#2a0716', roughness: .6 }));
  mouth.scale.set(.55, .2, .12); mouth.position.set(0, .95, 1.2); c.squash.add(mouth);
  const toothM = new THREE.MeshStandardMaterial({ color: '#fff8e8', roughness: .4 });
  for (const x of [-.32, -.1, .12, .34]) { const t = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 8), toothM); t.rotation.x = Math.PI; t.position.set(x, 1.06, 1.3); c.squash.add(t); }
  // sừng
  const hornM = new THREE.MeshStandardMaterial({ color: '#f3e3c3', roughness: .5 });
  for (const s of [-1, 1]) { const hn = new THREE.Mesh(new THREE.ConeGeometry(.22, .85, 16), hornM); hn.position.set(s * .62, 2.85, 0); hn.rotation.z = -s * .45; hn.castShadow = true; c.squash.add(hn); }
  // xúc tu: chuỗi đốt lồng nhau, mỗi đốt xoay trễ pha → sóng chạy dọc xúc tu
  c.tentacles = [];
  for (const s of [-1, 1]) {
    const base = new THREE.Group(); base.position.set(s * 1.15, 1.25, .25); base.rotation.z = s * .6; c.squash.add(base);
    let parent = base; const chain = [];
    for (let i = 0; i < 7; i++) { const seg = new THREE.Group(); seg.position.y = i ? -.2 : 0; parent.add(seg);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(.27 - i * .028, 20, 14), c.bodyMat); ball.castShadow = true; seg.add(ball);
      chain.push(seg); parent = seg; }
    c.tentacles.push({ chain, s });
  }
  return c;
}

/* ================================================================ DỰNG CẢNH */
const bach = makeR6({ skin: '#f2c9a0', jacket: '#232a45', plaid: true, shirt: '#e9ebef', tie: '#2a2f3c', pants: '#2a2c33', shoes: '#151515' });
// bach.setFace(loadFaceSet({ smile: 'faces/smile.png' }).smile);   // ← gắn mặt của bạn ở đây
bach.root.position.set(-5.2, 0, 0); scene.add(bach.root);
const teddy = makeTeddy({ fur: '#9a5a2b', light: '#e2bf8f', bow: '#3f7fe0' });
teddy.root.position.set(0, 0, 0); teddy.root.scale.setScalar(1.15); scene.add(teddy.root);
const mon = makeMonster({ color: '#8a4fd8', iris: '#3bd17a' });
mon.root.position.set(5.2, 0, 0); scene.add(mon.root);

camera.position.set(0, 4, 19); camera.lookAt(0, 2.1, 0);
const focus = new URLSearchParams(location.search).get('focus');   // ?focus=0|1|2 → cận cảnh từng nhân vật
if (focus != null) { const x = [-5.2, 0, 5.2][+focus] ?? 0; camera.position.set(x + 1.6, 4.2, 10.5); camera.lookAt(x, 3, 0); }
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

/* ================================================================ ANIMATION (công thức như cẩm nang trước) */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const t0 = performance.now();
const tmp = new THREE.Vector3();
function frame(t) {
  // Người khối: đi tại chỗ, vẫy tay phải ở giây 2–4 mỗi chu kỳ 6 s
  { const w = t * 1.7 * Math.PI * 2, s = Math.sin(w), a = .6;
    bach.legL.rotation.x = a * s; bach.legR.rotation.x = -a * s;
    bach.armL.rotation.set(-a * .9 * s, 0, .06);
    bach.hips.position.y = 2 + .08 * Math.abs(Math.cos(w));
    bach.upper.rotation.y = .06 * s; bach.root.rotation.y = .35;
    const cyc = t % 6, k = clamp(Math.min((cyc - 2) / .2, (4 - cyc) / .2));
    bach.armR.rotation.set(-2.75 * k + a * .9 * s * (1 - k), 0, -(.06 + k * (.35 + .3 * Math.sin(t * 12))));
    bach.neck.rotation.set(0, .15 * Math.sin(t * .8), 0); }
  // Gấu: đung đưa, nghiêng đầu, vẫy tay trái
  { const b = Math.sin(t * 2.2);
    teddy.upper.rotation.z = .05 * b; teddy.hips.position.y = 1 + .03 * Math.abs(b);
    teddy.neck.rotation.set(.05, .15 * Math.sin(t * .9), .18 * Math.sin(t * 1.1));
    teddy.armL.rotation.set(0, 0, 2.5 + .35 * Math.sin(t * 9));
    teddy.armR.rotation.set(.15 * b, 0, -.35);
    teddy.legL.rotation.x = .08 * b; teddy.legR.rotation.x = -.08 * b; }
  // Quái vật: nhảy + nén/giãn giữ thể tích, thân rung nhẹ, xúc tu uốn, mắt đảo + chớp
  { const ph = (t * 1.1) % 1, h = Math.sin(Math.PI * ph);                 // 0 → 1 → 0 mỗi cú nhảy
    const squash = Math.pow(1 - h, 6) * .28 - h * .08;                   // chạm đất: bẹp; trên không: dài ra
    mon.squash.position.y = h * 1.1;
    mon.squash.scale.set(1 + squash * .5, 1 - squash, 1 + squash * .5);
    const pos = mon.body.geometry.attributes.position, base = mon.body.geometry.userData.base;
    for (let i = 0; i < pos.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const k = 1 + .035 * Math.sin(y * 3 + t * 5) + .025 * Math.sin(x * 4 + t * 3.3); pos.setXYZ(i, x * k, y * k, z * k); }
    pos.needsUpdate = true; mon.body.geometry.computeVertexNormals();
    for (const { chain, s } of mon.tentacles) chain.forEach((seg, i) => { seg.rotation.z = s * (.12 + .28 * Math.sin(t * 4 - i * .7)); });
    mon.eye.rotation.set(.12 * Math.sin(t * .7), .4 * Math.sin(t * 1.3), 0);
    const blink = (t % 3.2) < .12 ? .1 : 1; mon.eye.scale.y = blink; }
}
const fixedT = new URLSearchParams(location.search).get('t'); // ?t=3 → đứng yên ở giây 3
function loop() { const t = fixedT != null ? +fixedT : (performance.now() - t0) / 1000; frame(t); renderer.render(scene, camera); requestAnimationFrame(loop); }
loop();
</script>
</body></html>
```

---

## 9. Thay texture vẽ bằng code bằng ảnh PNG tự vẽ

Khi muốn đẹp hơn nữa, vẽ ảnh trong Krita, Photoshop hoặc Photopea rồi nạp vào. Có hai cách:

**Cách A: mỗi mặt một file ảnh** (dễ nhất, khớp ngay với mảng 6 material):

```js
const L = new THREE.TextureLoader();
const load = (f) => { const t = L.load(f); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t; };
const m = (f) => new THREE.MeshStandardMaterial({ map: load(f), roughness: .85 });
const torso = new THREE.Mesh(new RoundedBoxGeometry(2, 2, 1, 3, .06),
  [m('torso_right.png'), m('torso_left.png'), m('torso_top.png'), m('torso_bottom.png'), m('torso_front.png'), m('torso_back.png')]);
```

Kích thước ảnh nên theo tỉ lệ mặt hộp: thân trước/sau 256×256, hông 128×256, tay/chân 128×256.

**Cách B: một ảnh atlas** chứa mọi mặt (giống ý tưởng template quần áo Roblox), rồi trỏ UV từng mặt vào ô tương ứng:

```js
// rect = [x, y, w, h] tính bằng pixel trên ảnh W×H; faceIndex theo thứ tự [+x, -x, +y, -y, +z, -z]
function setFaceUV(geo, faceIndex, [x, y, w, h], W, H) {
  const uv = geo.attributes.uv, g = geo.groups[faceIndex], done = new Set();
  const u0 = x / W, u1 = (x + w) / W, v0 = 1 - (y + h) / H, v1 = 1 - y / H;
  for (let i = g.start; i < g.start + g.count; i++) {
    const vi = geo.index ? geo.index.getX(i) : i;
    if (done.has(vi)) continue; done.add(vi);             // mỗi đỉnh chỉ đổi một lần
    const ou = uv.getX(vi), ov = uv.getY(vi);             // UV gốc 0..1 của mặt
    uv.setXY(vi, u0 + ou * (u1 - u0), v0 + ov * (v1 - v0));
  }
  uv.needsUpdate = true;
}
```

Hàm này đổi UV gốc 0..1 của mỗi mặt sang ô trong atlas, chạy được với cả `RoundedBoxGeometry` (vốn có nhiều đỉnh hơn mỗi mặt). Gọi **sau khi** tạo geometry, mỗi mặt một lần.

**Mẹo vẽ ảnh cho ra chất Roblox:**
- Vẽ sẵn bóng tối ở mép, dưới cổ áo, dưới nách; highlight nhẹ ở ngực, vai.
- Viền tối 3–5 px quanh mép mỗi mặt.
- Nếp nhăn: một nét tối, ngay cạnh là một nét sáng mảnh hơn.
- Phủ một lớp noise 5–8% cho chất vải.
- `magFilter = NearestFilter` nếu muốn nét pixel sắc, `LinearFilter` nếu muốn mịn.

---

## 10. Mẹo và lỗi hay gặp

| Vấn đề | Nguyên nhân / cách xử lý |
|---|---|
| Màu nhạt, xám | Quên `texture.colorSpace = THREE.SRGBColorSpace` |
| Bóng răng cưa | Tăng `shadow.mapSize` lên 2048, dùng `PCFSoftShadowMap`, chỉnh `shadow.bias` khoảng −0,0005 |
| Có sọc đen lạ trên nhân vật (shadow acne) | `shadow.bias` âm hơn một chút hoặc thêm `shadow.normalBias = .02` |
| Texture mỗi lần chạy một khác | Dùng hàm ngẫu nhiên có seed, không dùng `Math.random()` |
| Tay xoay quanh tâm tay chứ không quanh vai | Mesh tay phải là con của `Group` đặt ở vai và dời xuống `y = -0,85` |
| Lộ khe ở khớp khi xoay | Đặt khớp sâu hơn vào thân, hoặc dùng capsule/cầu có đầu tròn ở chỗ nối |
| Chậm khi có nhiều nhân vật | Dùng chung geometry (`SPH`, `CAP_A`…) và material, chỉ tạo texture một lần |
| Mặt dán bị kéo bè ngang / bị bóp | Ảnh mặt phải vuông; vùng dán tự tính vuông theo `FACE.h` |
| Mặt nhấp nháy, chập chờn với da đầu | Giữ `polygonOffset` và bán kính lớp mặt lớn hơn đầu 0,004 |
| Màu áo lem sang bàn tay / da | Vẽ phần da trong `post` (sau khi làm nhoè), mặt dưới bàn tay dùng màu phẳng |
| Mặt dưới đầu, bàn tay quá nâu tối | Đó là đèn hắt từ đất (`HemisphereLight` màu thứ hai): làm sáng màu đó lên, vd `#a89a8a` |
| Áo vẫn quá sắc | Giảm số đầu của `SOFT` (vd `.25`) hoặc tăng blur; nếp nhăn phải vẽ trong `g.filter = blur(...)` |
| Biến dạng đỉnh làm mắt/miệng "trôi" khỏi thân | Giữ biên độ rung nhỏ (≤ 4%) và cắm mắt/miệng hơi lún vào bề mặt |

**Kết nối với cẩm nang animation trước:** các khớp trong hướng dẫn này đặt tên giống hệt (`hips`, `upper`, `neck`, `armL`, `armR`, `legL`, `legR`). Bạn có thể bê nguyên `BASES`, `ACTIONS`, `blend()`, rung màn hình, tia tóe… sang. Riêng khung xương gấu ngắn hơn, nên nhân biên độ chân/tay khoảng 0,6–0,8 cho vừa.
