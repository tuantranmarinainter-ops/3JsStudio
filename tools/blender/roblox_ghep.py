# roblox_ghep.py — ghép các mảnh (BasePart) của một model Roblox thành MỘT GLB (Blender headless, KHÔNG mở giao diện).
#   blender -b --factory-startup -P tools/blender/roblox_ghep.py -- <ghep.json>
# ghep.json (do tools/roblox.mjs tạo): {parts:[...dump...], meshes:{meshId: duong.glb}, images:{id: duong.anh}, out, ten}
# Hệ toạ độ: Roblox = Y lên, phải-tay, 1 stud = 1 đơn vị — TRÙNG với glTF, nên không đổi tỉ lệ/trục.
# Blender là Z lên → mọi thứ dựng trong "không gian Roblox" rồi đổi bằng C: (x,y,z) -> (x,-z,y); xuất GLB (Y lên) trả lại đúng.
# Mesh .glb từng mảnh do sky-extract tạo (toạ độ Roblox thô) được đọc trực tiếp bằng struct (không qua import glTF).
# In 1 dòng `GHEP_JSON {...}` cho roblox.mjs. Tất định, không ngẫu nhiên.
import bpy, bmesh, sys, json, math, struct, os
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if not argv:
    print('GHEP_LOI thiếu ghep.json'); sys.exit(2)
D = json.load(open(argv[0], encoding='utf8'))
MESH_GLB, IMGS = D['meshes'], D['images']

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
    _cache[path] = (V, T, UV); return _cache[path]

# ---------- hình cơ bản (không gian Roblox, cạnh 1 stud, tâm gốc) ----------
def box():
    V = [(x, y, z) for x in (-.5, .5) for y in (-.5, .5) for z in (-.5, .5)]
    F = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return V, F
def wedge():   # lăng trụ tam giác: dốc từ cạnh trên-sau xuống cạnh dưới-trước
    V = [(-.5, -.5, -.5), (-.5, -.5, .5), (-.5, .5, .5), (.5, -.5, -.5), (.5, -.5, .5), (.5, .5, .5)]
    F = [(0, 3, 4, 1), (1, 4, 5, 2), (0, 2, 5, 3), (0, 1, 2), (3, 5, 4)]
    return V, F
def corner():  # xấp xỉ: đáy chữ nhật + đỉnh ở một góc
    V = [(-.5, -.5, -.5), (.5, -.5, -.5), (.5, -.5, .5), (-.5, -.5, .5), (-.5, .5, .5)]
    F = [(0, 1, 2, 3), (0, 4, 1), (1, 4, 2), (2, 4, 3), (0, 3, 4)]
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

# ---------- vật liệu ----------
_mat = {}
def vat_lieu(rgb, anh=None, alpha=1.0):
    key = (tuple(round(c, 3) for c in rgb), anh, round(alpha, 2))
    if key in _mat: return _mat[key]
    m = bpy.data.materials.new('mau_%d' % len(_mat)); m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.9
    if anh:
        t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(anh); t.image.pack()
        m.node_tree.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
        if alpha < 1: m.node_tree.links.new(t.outputs['Alpha'], bsdf.inputs['Alpha'])
    else:
        bsdf.inputs['Base Color'].default_value = (*rgb, 1.0)
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        try: m.blend_method = 'BLEND'
        except Exception: pass
    _mat[key] = m; return m

def srgb_to_lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

# ---------- dựng ----------
bo_qua, objs = [], []
tong_tam_giac = 0
lo = [1e30] * 3; hi = [-1e30] * 3

def them(ten, V, F, UV, M, mat):
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
    me.materials.append(mat)
    for p in me.polygons: p.use_smooth = False
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
def hinh_special(mt):
    if mt == 2: return wedge(), False
    if mt == 3: return ball(), False
    if mt == 4: return cyl('y'), False
    if mt == 11: return corner(), False
    if mt in (0, 1, 6): return box(), mt != 6        # Head/Torso xấp xỉ bằng hộp
    return box(), True

for p in D['parts']:
    ten = p['name']
    if p['transparency'] >= 0.99:
        bo_qua.append({'ten': ten, 'lyDo': 'trong suốt (transparency %.2f)' % p['transparency']}); continue
    if p['class'] in ('UnionOperation', 'IntersectOperation', 'NegateOperation'):
        pass   # dựng hộp bao xấp xỉ, ghi chú bên dưới
    M = ma_tran(p); size = p['size']
    alpha = 1.0 - p['transparency']
    rgb = mau_part(p)
    if p['class'] == 'MeshPart' and p.get('meshId'):
        g = MESH_GLB.get(p['meshId'])
        if not g:
            bo_qua.append({'ten': ten, 'lyDo': 'không có mesh %s (tải/giải mã lỗi)' % p['meshId']}); continue
        V, T, UV = doc_glb(g)
        mn = [min(v[k] for v in V) for k in range(3)]; mx = [max(v[k] for v in V) for k in range(3)]
        bb = [mx[k] - mn[k] for k in range(3)]; ct = [(mx[k] + mn[k]) / 2 for k in range(3)]
        sc = [size[k] / bb[k] if bb[k] > 1e-9 else 1.0 for k in range(3)]
        Vl = [((v[0] - ct[0]) * sc[0], (v[1] - ct[1]) * sc[1], (v[2] - ct[2]) * sc[2]) for v in V]
        a = anh_cua(p.get('colorMap'), p.get('textureId'))
        mat = vat_lieu((1, 1, 1) if a else rgb, a, alpha)
        them(ten, Vl, T, UV if a else None, M, mat); continue
    sm = next((s for s in p['specialMeshes']), None)
    if sm and sm.get('meshId') and sm['meshId'] in MESH_GLB:
        V, T, UV = doc_glb(MESH_GLB[sm['meshId']])
        sc, of = sm['scale'], sm['offset']
        Vl = [(v[0] * sc[0] + of[0], v[1] * sc[1] + of[1], v[2] * sc[2] + of[2]) for v in V]
        a = anh_cua(sm.get('textureId'))
        them(ten, Vl, T, UV if a else None, M, vat_lieu(rgb if not a else (1, 1, 1), a, alpha)); continue
    if sm and not sm.get('meshId'):
        (V, F), xs = hinh_special(sm.get('meshType'))
        if xs: bo_qua.append({'ten': ten, 'lyDo': 'SpecialMesh loại %s dựng xấp xỉ bằng hộp' % sm.get('meshType')})
        sc = [size[k] * sm['scale'][k] for k in range(3)]
        them(ten, [(v[0] * sc[0], v[1] * sc[1], v[2] * sc[2]) for v in V], F, None, M, vat_lieu(rgb, None, alpha)); continue
    if p['class'] == 'MeshPart':
        bo_qua.append({'ten': ten, 'lyDo': 'MeshPart không có MeshId'}); continue
    if p['class'] in ('UnionOperation', 'IntersectOperation', 'NegateOperation'):
        bo_qua.append({'ten': ten, 'lyDo': '%s: không đọc được hình CSG, dựng hộp bao xấp xỉ' % p['class']})
    V, F = hinh_part(p)
    if p['shape'] == 'CornerWedge': bo_qua.append({'ten': ten, 'lyDo': 'CornerWedge dựng xấp xỉ (hướng góc chưa kiểm)'})
    them(ten, [(v[0] * size[0], v[1] * size[1], v[2] * size[2]) for v in V], F, None, M, vat_lieu(rgb, None, alpha))

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
      'hopBao': [hi[k] - lo[k] for k in range(3)], 'dich': list(dich), 'boQua': bo_qua}, ensure_ascii=False))
