# roblox_ghep.py — ghép các mảnh (BasePart) của một model Roblox thành MỘT GLB (Blender headless, KHÔNG mở giao diện).
#   blender -b --factory-startup -P tools/blender/roblox_ghep.py -- <ghep.json>
# ghep.json (do tools/roblox.mjs tạo): {parts:[...dump...], meshes:{meshId: duong.glb}, images:{id: duong.anh}, csg:{assetId: MeshData.bin}, out, ten, anhMax}
# Ảnh vân (TextureID / ColorMap / Decal / Texture) được trộn sẵn lên màu mảnh thành ảnh JPEG đục ≤ anhMax px (mặc định 512).
# UnionOperation: đọc lưới thật từ MeshData (CSGMDL v2–v5) của asset CSG; không có thì dựng hộp bao.
# Hệ toạ độ: Roblox = Y lên, phải-tay, 1 stud = 1 đơn vị — TRÙNG với glTF, nên không đổi tỉ lệ/trục.
# Blender là Z lên → mọi thứ dựng trong "không gian Roblox" rồi đổi bằng C: (x,y,z) -> (x,-z,y); xuất GLB (Y lên) trả lại đúng.
# Mesh .glb từng mảnh do sky-extract tạo (toạ độ Roblox thô) được đọc trực tiếp bằng struct (không qua import glTF).
# In 1 dòng `GHEP_JSON {...}` cho roblox.mjs. Tất định, không ngẫu nhiên.
import bpy, bmesh, sys, json, math, struct, os
import numpy as np
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if not argv:
    print('GHEP_LOI thiếu ghep.json'); sys.exit(2)
D = json.load(open(argv[0], encoding='utf8'))
MESH_GLB, IMGS, CSG = D['meshes'], D['images'], D.get('csg', {})
ANH_MAX = int(D.get('anhMax') or 512)
THU_ANH = os.path.join(os.path.dirname(os.path.abspath(argv[0])), 'anh')

C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))   # Roblox -> Blender
CI = C.inverted()
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------- đọc GLB của sky-extract ----------
_cache = {}
def doc_glb(path):
    if path in _cache: return _cache[path]
    b = open(path, 'rb').read()
    jl, = struct.unpack_from('<I', b, 12)
    js = json.loads(b[20:20 + jl])
    bo = 20 + jl + 8
    def acc(i):
        a = js['accessors'][i]; v = js['bufferViews'][a['bufferView']]
        n = a['count']; k = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
        fmt = '<' + ('I' if a['componentType'] == 5125 else 'f') * (n * k)
        return struct.unpack_from(fmt, b, bo + v.get('byteOffset', 0) + a.get('byteOffset', 0)), k
    at = js['meshes'][0]['primitives'][0]['attributes']
    pos, _ = acc(at['POSITION']); idx, _ = acc(js['meshes'][0]['primitives'][0]['indices'])
    uv = acc(at['TEXCOORD_0'])[0] if 'TEXCOORD_0' in at else None
    V = [(pos[i], pos[i + 1], pos[i + 2]) for i in range(0, len(pos), 3)]
    T = [(idx[i], idx[i + 1], idx[i + 2]) for i in range(0, len(idx), 3)]
    UV = [(uv[i], uv[i + 1]) for i in range(0, len(uv), 2)] if uv else None
    nm = acc(at['NORMAL'])[0] if 'NORMAL' in at else None
    N = [(nm[i], nm[i + 1], nm[i + 2]) for i in range(0, len(nm), 3)] if nm else None
    _cache[path] = (V, T, UV, N); return _cache[path]

# ---------- hình cơ bản (không gian Roblox, cạnh 1 stud, tâm gốc) ----------
def box():
    V = [(x, y, z) for x in (-.5, .5) for y in (-.5, .5) for z in (-.5, .5)]
    F = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return V, F
def wedge():   # lăng trụ tam giác: dốc từ cạnh trên-sau xuống cạnh dưới-trước
    V = [(-.5, -.5, -.5), (-.5, -.5, .5), (-.5, .5, .5), (.5, -.5, -.5), (.5, -.5, .5), (.5, .5, .5)]
    F = [(0, 3, 4, 1), (1, 4, 5, 2), (0, 2, 5, 3), (0, 1, 2), (3, 5, 4)]
    return V, F
def corner():  # CornerWedgePart: đáy chữ nhật, đỉnh nằm thẳng trên góc (+X, -Z) — hai mặt đứng ở +X và -Z
    V = [(-.5, -.5, -.5), (.5, -.5, -.5), (.5, -.5, .5), (-.5, -.5, .5), (.5, .5, -.5)]
    F = [(0, 1, 2, 3), (0, 4, 1), (1, 4, 2), (2, 4, 3), (3, 4, 0)]
    return V, F
def ball(seg=16, rings=8):
    V = [(0, .5, 0)]
    for r in range(1, rings):
        a = math.pi * r / rings
        for s in range(seg):
            t = 2 * math.pi * s / seg
            V.append((.5 * math.sin(a) * math.cos(t), .5 * math.cos(a), .5 * math.sin(a) * math.sin(t)))
    V.append((0, -.5, 0)); F = []
    for s in range(seg): F.append((0, 1 + (s + 1) % seg, 1 + s))
    for r in range(rings - 2):
        for s in range(seg):
            a, b = 1 + r * seg + s, 1 + r * seg + (s + 1) % seg
            F.append((a, b, b + seg, a + seg))
    last = len(V) - 1
    for s in range(seg): F.append((last, last - seg + s, last - seg + (s + 1) % seg))
    return V, F
def cyl(axis='x', seg=16):   # trục dọc X (Part Cylinder của Roblox) hoặc Y (SpecialMesh Cylinder)
    ring = [(math.cos(2 * math.pi * s / seg) * .5, math.sin(2 * math.pi * s / seg) * .5) for s in range(seg)]
    def p(h, c, d): return (h, c, d) if axis == 'x' else (c, h, d)
    V = [p(-.5, c, d) for c, d in ring] + [p(.5, c, d) for c, d in ring]
    F = [tuple(range(seg - 1, -1, -1)), tuple(range(seg, 2 * seg))]
    for s in range(seg):
        n = (s + 1) % seg; F.append((s, n, n + seg, s + seg))
    return V, F

def dau(seg=20, buoc=4, bo=0.25):
    """Đầu R6 (SpecialMesh Head): trụ đứng bo tròn mép trên/dưới, đường kính 1, cao 1. Lưới thật là file có sẵn trong Roblox, không tải được."""
    vong = []
    for i in range(buoc + 1):
        t = -math.pi / 2 + (math.pi / 2) * i / buoc
        vong.append((0.5 - bo + bo * math.cos(t), -0.5 + bo + bo * math.sin(t)))
    for i in range(buoc + 1):
        t = (math.pi / 2) * i / buoc
        vong.append((0.5 - bo + bo * math.cos(t), 0.5 - bo + bo * math.sin(t)))
    V = [(r * math.cos(2 * math.pi * k / seg), y, r * math.sin(2 * math.pi * k / seg)) for r, y in vong for k in range(seg)]
    F = []
    for j in range(len(vong) - 1):
        for k in range(seg):
            a, b = j * seg + k, j * seg + (k + 1) % seg
            F.append((a, a + seg, b + seg, b))
    c0, c1, n = len(V), len(V) + 1, (len(vong) - 1) * seg
    V += [(0, -0.5, 0), (0, 0.5, 0)]
    for k in range(seg):
        F.append((c0, k, (k + 1) % seg)); F.append((c1, n + (k + 1) % seg, n + k))
    return V, F

# ---------- vật liệu ----------
_mat = {}
CUR_MAT = None   # Enum.Material của mảnh đang dựng (đặt trong vòng lặp bên dưới)
MAT_NEON, MAT_GLASS = 288, 1568
def vat_lieu(rgb, anh=None, alpha=1.0):
    if CUR_MAT == MAT_GLASS: alpha = min(alpha, 0.4)      # Glass: trong suốt (Roblox vẽ kính qua ~60%)
    key = (tuple(round(c, 3) for c in rgb), anh, round(alpha, 2), CUR_MAT if CUR_MAT in (MAT_NEON, MAT_GLASS) else None)
    if key in _mat: return _mat[key]
    m = bpy.data.materials.new('mau_%d' % len(_mat)); m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.9
    if anh:
        t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(anh); t.image.pack()
        m.node_tree.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        bsdf.inputs['Base Color'].default_value = (*rgb, 1.0)
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        try: m.blend_method = 'BLEND'
        except Exception: pass
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
    if CUR_MAT == MAT_NEON:     # Neon: tự phát sáng theo màu mảnh (bloom của engine bắt được)
        try:
            bsdf.inputs['Emission Color'].default_value = (*rgb, 1.0); bsdf.inputs['Emission Strength'].default_value = 1.0
        except Exception: pass
    if CUR_MAT == MAT_GLASS:    # Glass: bóng, phản chiếu nhẹ
        bsdf.inputs['Roughness'].default_value = 0.05
        try: bsdf.inputs['Specular IOR Level'].default_value = 0.8
        except Exception: pass
    _mat[key] = m; return m

# ---------- ảnh vân: trộn các lớp ảnh lên màu mảnh (sRGB) → 1 ảnh JPEG đục ----------
def doc_anh(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    if w == 0 or h == 0: raise ValueError('ảnh rỗng ' + path)
    k = ANH_MAX / max(w, h)
    if k < 1:
        img.scale(max(1, round(w * k)), max(1, round(h * k))); w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)
_anh = {}
def ghep_anh(nen, lop):
    """nen: màu mảnh sRGB (r,g,b); lop: [(đường dẫn ảnh, độ đục 0..1)] theo thứ tự từ dưới lên → đường dẫn ảnh JPEG."""
    key = (tuple(round(c, 3) for c in nen), tuple(lop))
    if key in _anh: return _anh[key]
    base = None
    for path, k in lop:
        a = doc_anh(path)
        if base is None:
            base = np.empty((a.shape[0], a.shape[1], 3), dtype=np.float32); base[:] = nen
        elif a.shape[:2] != base.shape[:2]:
            yy = np.arange(base.shape[0]) * a.shape[0] // base.shape[0]
            xx = np.arange(base.shape[1]) * a.shape[1] // base.shape[1]
            a = a[yy][:, xx]
        al = a[..., 3:4] * k
        base = base * (1 - al) + a[..., :3] * al
    h, w = base.shape[:2]
    out = bpy.data.images.new('ghep_%d' % len(_anh), w, h, alpha=False)
    out.pixels.foreach_set(np.concatenate([np.clip(base, 0, 1), np.ones((h, w, 1), dtype=np.float32)], axis=2).ravel())
    os.makedirs(THU_ANH, exist_ok=True)
    f = os.path.join(THU_ANH, '_ghep_%d.jpg' % len(_anh))
    out.filepath_raw = f; out.file_format = 'JPEG'; out.save(quality=88)
    bpy.data.images.remove(out)
    _anh[key] = f; return f

# ---------- lưới CSG (UnionOperation…): MeshData "CSGMDL" ----------
KHOA_CSG = bytes([86, 46, 110, 88, 49, 32, 48, 4, 52, 105, 12, 119, 12, 1, 94, 0, 26, 96, 55, 105, 29, 82, 43, 7, 79, 36, 89, 101, 83, 4, 122])
def doc_csg(path):
    """→ (V, T, màu từng đỉnh sRGB 0..1). v2–v4: XOR cả file, đỉnh 84 byte; v5: chỉ XOR 10 byte đầu, chỉ số nén delta."""
    b = open(path, 'rb').read()
    hd = bytes(x ^ KHOA_CSG[i % 31] for i, x in enumerate(b[:10]))
    if hd[:6] != b'CSGMDL': raise ValueError('không phải CSGMDL')
    ver, = struct.unpack('<I', hd[6:10])
    if ver >= 5:
        n, = struct.unpack_from('<H', b, 10); o = 12
        V = [struct.unpack_from('<3f', b, o + 12 * i) for i in range(n)]; o += 12 * n
        o += 6 + struct.unpack_from('<I', b, o + 2)[0]                       # normal (lượng tử)
        col = [tuple(c / 255 for c in b[o + 2 + 4 * i:o + 5 + 4 * i]) for i in range(n)]; o += 2 + 4 * n
        o += 2 + n                                                           # normalId
        o += 2 + 8 * n                                                       # uv
        o += 6 + struct.unpack_from('<I', b, o + 2)[0]                       # tangent
        cnt, size = struct.unpack_from('<II', b, o); seg = b[o + 8:o + 8 + size]
        idx, i, cur = [], 0, 0
        while len(idx) < cnt:
            x = seg[i]
            if x & 0x80:
                v = ((x & 0x7f) << 16) | (seg[i + 1] << 8) | seg[i + 2]; i += 3
                if v & 0x400000: v -= 0x800000
            else:
                v = x; i += 1
                if v & 0x40: v -= 0x80
            cur += v; idx.append(cur)
        t = o + 8 + size
        lod = struct.unpack_from('<%dI' % b[t], b, t + 1) if t < len(b) and b[t] >= 2 else (0, cnt)
    else:
        d = bytes(x ^ KHOA_CSG[i % 31] for i, x in enumerate(b))
        o = next((q for q in (42, 26) if q + 8 <= len(d) and 40 <= struct.unpack_from('<I', d, q + 4)[0] <= 128
                  and q + 8 + struct.unpack_from('<I', d, q)[0] * struct.unpack_from('<I', d, q + 4)[0] + 4 <= len(d)), None)
        if o is None: raise ValueError('CSGMDL v%d: không nhận ra bố cục' % ver)
        n, st = struct.unpack_from('<II', d, o); o += 8
        V = [struct.unpack_from('<3f', d, o + st * i) for i in range(n)]
        col = [tuple(c / 255 for c in d[o + st * i + 24:o + st * i + 27]) for i in range(n)]
        o += n * st
        cnt, = struct.unpack_from('<I', d, o); idx = list(struct.unpack_from('<%dI' % cnt, d, o + 4)); t = o + 4 + 4 * cnt
        nl = struct.unpack_from('<I', d, t)[0] if t + 4 <= len(d) else 0
        lod = struct.unpack_from('<%dI' % nl, d, t + 4) if 2 <= nl <= 8 and t + 4 + 4 * nl <= len(d) else (0, cnt)
    a, e = lod[0], lod[1]
    if not (0 <= a < e <= len(idx)): a, e = 0, len(idx)
    idx = idx[a:e]
    if not idx or max(idx) >= len(V) or min(idx) < 0: raise ValueError('CSGMDL v%d: chỉ số ngoài phạm vi' % ver)
    return V, [(idx[i], idx[i + 1], idx[i + 2]) for i in range(0, len(idx) - 2, 3)], col

def srgb_to_lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

# ---------- dựng ----------
bo_qua, objs = [], []
so_union = so_decal = 0
tong_tam_giac = 0
lo = [1e30] * 3; hi = [-1e30] * 3

def them(ten, V, F, UV, M, mat, min_=False, mats=None, mat_mat=None, N=None):
    """V: đỉnh trong không gian Roblox (cục bộ mảnh); M: ma trận mảnh trong không gian Roblox (4x4 mathutils)."""
    global tong_tam_giac
    Mb = C @ M
    vb = [Mb @ Vector(v) for v in V]
    me = bpy.data.meshes.new(ten)
    me.from_pydata([tuple(v) for v in vb], [], [tuple(f) for f in F])
    me.update()
    if UV:
        uvl = me.uv_layers.new(name='UV')
        for p in me.polygons:
            for li in p.loop_indices:
                u, v = UV[me.loops[li].vertex_index]; uvl.data[li].uv = (u, 1.0 - v)
    # M có thể phản chiếu (size âm / det<0) → lật mặt
    if M.to_3x3().determinant() < 0:
        for p in me.polygons: p.flip()
        me.update()
    if mats:                       # nhiều vật liệu: mat_mat[i] = chỉ số vật liệu của mặt i
        for m in mats: me.materials.append(m)
        for p in me.polygons: p.material_index = mat_mat[p.index]
    else: me.materials.append(mat)
    for p in me.polygons: p.use_smooth = min_     # lưới file của Roblox đã tách đỉnh ở cạnh sắc → bật mịn là giữ đúng cạnh
    if N and len(N) == len(V):     # pháp tuyến gốc của lưới (N đã chia cho tỉ lệ cục bộ) → pháp tuyến tuỳ biến, giữ đúng chỗ mịn / chỗ sắc
        try:
            R = Mb.to_3x3().inverted().transposed()
            me.normals_split_custom_set_from_vertices([tuple((R @ Vector(n)).normalized()) if any(n) else (0, 0, 1) for n in N])
        except Exception: pass
    ob = bpy.data.objects.new(ten, me); bpy.context.scene.collection.objects.link(ob); objs.append(ob)
    tong_tam_giac += sum(len(p.vertices) - 2 for p in me.polygons)
    for v in V:    # hộp bao trong không gian Roblox (= không gian glTF)
        w = M @ Vector(v)
        for k in range(3): lo[k] = min(lo[k], w[k]); hi[k] = max(hi[k], w[k])

def ma_tran(p):
    r = p['cframe']['rot']; t = p['cframe']['pos']
    return Matrix(((r[0][0], r[0][1], r[0][2], t[0]), (r[1][0], r[1][1], r[1][2], t[1]),
                   (r[2][0], r[2][1], r[2][2], t[2]), (0, 0, 0, 1)))
def scale4(s): return Matrix.Diagonal((s[0], s[1], s[2], 1.0))
def trans4(t): return Matrix.Translation(t)

def mau_part(p):
    c = p.get('color') or [0.63, 0.63, 0.63]
    return tuple(srgb_to_lin(x) for x in c)

def anh_cua(*ids):
    for i in ids:
        if i and i in IMGS: return IMGS[i]
    return None

def hinh_part(p):
    s = p['shape']
    return {'Ball': ball(), 'Cylinder': cyl('x'), 'Wedge': wedge(), 'CornerWedge': corner()}.get(s) or box()

# Enum.MeshType: 0 Head,1 Torso,2 Wedge,3 Sphere,4 Cylinder,5 FileMesh,6 Brick,7 Prism,8 Pyramid,9 ParallelRamp,10 RightAngleRamp,11 CornerWedge
def hinh_special(mt, lop=None):
    if mt == 2: return wedge(), False
    if mt == 3: return ball(), False
    if mt == 4: return cyl('y' if lop == 'CylinderMesh' else 'x'), False   # CylinderMesh: trục Y; SpecialMesh Cylinder: trục X như Part
    if mt == 11: return corner(), False
    if mt == 0: return cyl('y'), True                 # Head: trụ bo tròn → xấp xỉ bằng trụ đứng
    if mt in (1, 6): return box(), mt != 6            # Torso xấp xỉ bằng hộp
    return box(), True

# Decal/Texture trên mặt hộp. Enum.NormalId: 0 Right(+X) 1 Top(+Y) 2 Back(+Z) 3 Left(-X) 4 Bottom(-Y) 5 Front(-Z) → (pháp tuyến, hướng "lên" của ảnh)
MAT_HOP = {0: ((1, 0, 0), (0, 1, 0)), 1: ((0, 1, 0), (0, 0, -1)), 2: ((0, 0, 1), (0, 1, 0)),
           3: ((-1, 0, 0), (0, 1, 0)), 4: ((0, -1, 0), (0, 0, 1)), 5: ((0, 0, -1), (0, 1, 0))}
def mat_decal(size, face, lap=None):
    n, up = (Vector(v) for v in MAT_HOP.get(face if face is not None else 5, MAT_HOP[5]))
    r = up.cross(n); h = [x / 2 for x in size]
    do = lambda v: sum(abs(v[k]) * h[k] for k in range(3))
    hn, hr, hu = do(n), do(r), do(up)
    c = n * (hn + 0.01)                                # nhô 0,01 stud để không trùng mặt hộp
    ru, rv = (2 * hr / lap[0], 2 * hu / lap[1]) if lap else (1.0, 1.0)
    V = [tuple(c - r * hr - up * hu), tuple(c + r * hr - up * hu), tuple(c + r * hr + up * hu), tuple(c - r * hr + up * hu)]
    return V, [(0, 1, 2, 3)], [(0, 1), (ru, 1), (ru, 1 - rv), (0, 1 - rv)]   # UV kiểu glTF (v xuống)
def lop_decal(p):
    return [(IMGS[d['texture']], 1.0 - d.get('transparency', 0)) for d in p.get('decals') or [] if d.get('texture') in IMGS]

# Ball: Roblox vẽ hình cầu đường kính = cạnh NHỎ NHẤT của Size; Size lệch trục (vd 0.29×146.8×134.8 ở nhà 127340966876926)
# từng bị dựng thành elip khổng lồ. Chuẩn hoá về cầu — ghi vào boQua, không lặng lẽ.
for p in D['parts']:
    if p['class'] == 'Part' and p['shape'] == 'Ball' and max(p['size']) > min(p['size']) * 1.01:
        m_ = min(p['size'])
        bo_qua.append({'ten': p['name'], 'lyDo': 'Ball Size lệch trục %s → cầu đường kính %.3f' % ('×'.join('%.2f' % x for x in p['size']), m_)})
        p['size'] = [m_, m_, m_]

# Chốt chặn: mảnh có hộp bao > 2 lần hộp bao của phần còn lại của model → cảnh báo (giữ nguyên), --bo-manh-lon thì bỏ (có ghi).
def aabb_part(p):
    R = np.array(p['cframe']['rot']); t = np.array(p['cframe']['pos']); e = np.abs(R) @ (np.array(p['size']) / 2)
    return t - e, t + e
_vis = [p for p in D['parts'] if p['transparency'] < 0.99]
_bb = [aabb_part(p) for p in _vis]
MANH_LON, LON_IDS = [], set()
if len(_vis) > 1:
    for i, p in enumerate(_vis):
        lo_o = np.min([b[0] for j, b in enumerate(_bb) if j != i], axis=0); hi_o = np.max([b[1] for j, b in enumerate(_bb) if j != i], axis=0)
        w_o = hi_o - lo_o; w_p = _bb[i][1] - _bb[i][0]
        if sum(1 for k in range(3) if w_p[k] > 2.0 * max(w_o[k], 1e-6) and w_p[k] > 1.0) >= 2:   # ≥ 2 trục: cột đèn/thân cây dài 1 trục là bình thường
            LON_IDS.add(id(p))
            MANH_LON.append({'ten': p['name'], 'path': p.get('path', ''), 'hopBao': [round(float(x), 2) for x in w_p], 'phanConLai': [round(float(x), 2) for x in w_o]})
BO_LON = bool(D.get('boManhLon'))

for p in D['parts']:
    ten = p['name']
    CUR_MAT = p.get('material')
    if id(p) in LON_IDS and BO_LON:
        bo_qua.append({'ten': ten, 'lyDo': 'mảnh lớn bị bỏ (--bo-manh-lon): hộp bao %s' % '×'.join('%.1f' % x for x in (aabb_part(p)[1] - aabb_part(p)[0]))}); continue
    if p['transparency'] >= 0.99:
        bo_qua.append({'ten': ten, 'lyDo': 'trong suốt (transparency %.2f)' % p['transparency']}); continue
    if p['class'] in ('UnionOperation', 'IntersectOperation', 'NegateOperation'):
        pass   # dựng hộp bao xấp xỉ, ghi chú bên dưới
    M = ma_tran(p); size = p['size']
    alpha = 1.0 - p['transparency']
    rgb = mau_part(p)
    srgb = tuple(p.get('color') or [0.63, 0.63, 0.63])
    if p['class'] == 'MeshPart' and p.get('meshId'):
        g = MESH_GLB.get(p['meshId'])
        if not g:
            bo_qua.append({'ten': ten, 'lyDo': 'không có mesh %s (tải/giải mã lỗi)' % p['meshId']}); continue
        V, T, UV, N = doc_glb(g)
        mn = [min(v[k] for v in V) for k in range(3)]; mx = [max(v[k] for v in V) for k in range(3)]
        bb = [mx[k] - mn[k] for k in range(3)]; ct = [(mx[k] + mn[k]) / 2 for k in range(3)]
        sc = [size[k] / bb[k] if bb[k] > 1e-9 else 1.0 for k in range(3)]
        Vl = [((v[0] - ct[0]) * sc[0], (v[1] - ct[1]) * sc[1], (v[2] - ct[2]) * sc[2]) for v in V]
        a0 = anh_cua(p.get('colorMap'), p.get('textureId'))
        lop = ([(a0, 1.0)] if a0 else []) + lop_decal(p)          # Decal trên MeshPart dùng UV của lưới
        a = ghep_anh(srgb, lop) if (lop and UV) else None
        if lop and not UV: bo_qua.append({'ten': ten, 'lyDo': 'lưới không có UV → bỏ ảnh vân'})
        mat = vat_lieu((1, 1, 1) if a else rgb, a, alpha)
        Nl = [(n[0] / sc[0], n[1] / sc[1], n[2] / sc[2]) for n in N] if N and all(abs(x) > 1e-9 for x in sc) else None
        them(ten, Vl, T, UV if a else None, M, mat, min_=True, N=Nl); continue
    sm = next((s for s in p['specialMeshes']), None)
    if sm and sm.get('meshId') and sm['meshId'] in MESH_GLB:
        V, T, UV, N = doc_glb(MESH_GLB[sm['meshId']])
        sc, of = sm['scale'], sm['offset']
        Nl = [(n[0] / sc[0], n[1] / sc[1], n[2] / sc[2]) for n in N] if N and all(abs(x) > 1e-9 for x in sc) else None
        Vl = [(v[0] * sc[0] + of[0], v[1] * sc[1] + of[1], v[2] * sc[2] + of[2]) for v in V]
        a0 = anh_cua(sm.get('textureId'))
        a = ghep_anh(srgb, [(a0, 1.0)]) if (a0 and UV) else None
        them(ten, Vl, T, UV if a else None, M, vat_lieu(rgb if not a else (1, 1, 1), a, alpha), min_=True, N=Nl); continue
    if sm and not sm.get('meshId') and sm.get('meshType') == 0 and sm.get('class', 'SpecialMesh') == 'SpecialMesh':
        V, F = dau()
        sc = [size[0] / 2 * sm['scale'][0], size[1] * sm['scale'][1], size[2] * sm['scale'][2]]   # part đầu 2×1×1 → đầu tròn rộng = sâu
        of = sm['offset']
        Vl = [(v[0] * sc[0] + of[0], v[1] * sc[1] + of[1], v[2] * sc[2] + of[2]) for v in V]
        lop = [(IMGS[d['texture']], 1.0 - d.get('transparency', 0)) for d in p.get('decals') or []
               if d.get('texture') in IMGS and d.get('face') in (5, None)]
        bo_qua.append({'ten': ten, 'lyDo': 'đầu R6 là lưới có sẵn của Roblox (không tải được) → dựng trụ bo tròn %d tam giác' % sum(len(f) - 2 for f in F)})
        if lop:      # mặt: chiếu phẳng lên nửa trước (-Z); nửa sau lấy cột mép ảnh (trong suốt → màu da)
            UVd = [(0.5 - v[0], 0.5 - v[1]) if v[2] < -1e-6 else (0.004 if v[0] > 0 else 0.996, 0.5 - v[1]) for v in V]   # nửa sau: dính vào cột mép ảnh cùng phía (không quét ngang qua mặt)
            a = ghep_anh(srgb, lop)
            them(ten, Vl, F, UVd, M, vat_lieu((1, 1, 1), a, alpha), min_=True); so_decal += len(lop)
        else:
            them(ten, Vl, F, None, M, vat_lieu(rgb, None, alpha), min_=True)
        continue
    if sm and not sm.get('meshId'):
        (V, F), xs = hinh_special(sm.get('meshType'), sm.get('class'))
        if xs: bo_qua.append({'ten': ten, 'lyDo': 'SpecialMesh loại %s dựng xấp xỉ' % sm.get('meshType')})
        sc = [size[k] * sm['scale'][k] for k in range(3)]
        them(ten, [(v[0] * sc[0], v[1] * sc[1], v[2] * sc[2]) for v in V], F, None, M, vat_lieu(rgb, None, alpha)); continue
    if p['class'] == 'MeshPart':
        bo_qua.append({'ten': ten, 'lyDo': 'MeshPart không có MeshId'}); continue
    if p['class'] in ('UnionOperation', 'IntersectOperation', 'NegateOperation'):
        cid = ((p.get('csg') or {}).get('Content') or {}).get('id')
        try:
            if not cid or cid not in CSG: raise ValueError('không tải được asset CSG' if cid else 'model không kèm asset CSG')
            V, T, col = doc_csg(CSG[cid])
            i0 = p.get('initialSize')
            sc = [size[k] / i0[k] if i0 and i0[k] > 1e-9 else 1.0 for k in range(3)]
            Vl = [(v[0] * sc[0], v[1] * sc[1], v[2] * sc[2]) for v in V]
            if p.get('usePartColor'):
                them(ten, Vl, T, None, M, vat_lieu(rgb, None, alpha), min_=True)
            else:                                     # màu gốc của từng mảnh con nằm ở màu đỉnh → mỗi màu một vật liệu
                ds, mm = [], []
                for t in T:
                    c = tuple(round(x, 3) for x in col[t[0]])
                    if c not in ds: ds.append(c)
                    mm.append(ds.index(c))
                them(ten, Vl, T, None, M, None, min_=True, mat_mat=mm,
                     mats=[vat_lieu(tuple(srgb_to_lin(x) for x in c), None, alpha) for c in ds])
            so_union += 1
            continue
        except Exception as e:
            bo_qua.append({'ten': ten, 'lyDo': '%s: %s → dựng HỘP BAO thay thế' % (p['class'], e)})
    V, F = hinh_part(p)
    them(ten, [(v[0] * size[0], v[1] * size[1], v[2] * size[2]) for v in V], F, None, M, vat_lieu(rgb, None, alpha))
    for d in p.get('decals') or []:
        if d.get('texture') not in IMGS: continue
        if p['shape'] != 'Block' or sm or p['class'].endswith('Operation'):
            bo_qua.append({'ten': ten, 'lyDo': '%s trên mảnh không phải hộp → bỏ' % d.get('class', 'Decal')}); continue
        lap = d.get('studsPerTile') if d.get('class') == 'Texture' else None
        Vd, Fd, UVd = mat_decal(size, d.get('face'), lap)
        a = ghep_anh(srgb, [(IMGS[d['texture']], 1.0 - d.get('transparency', 0))])
        them(ten + '_decal', Vd, Fd, UVd, M, vat_lieu((1, 1, 1), a, alpha)); so_decal += 1

if not objs:
    print('GHEP_LOI không có mảnh nào để ghép'); sys.exit(3)

# Đưa về gốc: tâm X/Z về 0, đáy (y nhỏ nhất) về 0 — chỉ tịnh tiến, không đổi tỉ lệ/xoay.
dich = (-(lo[0] + hi[0]) / 2, -lo[1], -(lo[2] + hi[2]) / 2)
for ob in objs: ob.location = C.to_3x3() @ Vector(dich)
out = D['out']
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True,
                          export_image_format='AUTO', export_cameras=False, export_lights=False)
print('GHEP_JSON ' + json.dumps({'manh': len(objs), 'tamGiac': tong_tam_giac,
      'hopBao': [hi[k] - lo[k] for k in range(3)], 'dich': list(dich), 'boQua': bo_qua,
      'union': so_union, 'decal': so_decal, 'anh': len(_anh), 'manhLon': MANH_LON}, ensure_ascii=False))
