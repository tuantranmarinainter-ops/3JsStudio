# chuan_hoa.py — chuẩn hoá 1 model glTF/GLB tải từ mạng thành GLB "khối vuông" của repo (Blender headless).
#   "S:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b --factory-startup -P tools/blender/chuan_hoa.py -- \
#       <vao.glb|gltf> <ra.glb> [--cao 3.0] [--tam-giac-toi-da 8000] [--tex 512] [--ao] [--mau-dinh] [--xoay 90] [--ten x]
# Kết quả: 1 mesh gộp, đã áp transform, Y lên (khi xuất), gốc ở tâm đáy (chân y=0), cao = --cao stud (không có thì giữ cỡ gốc,
# 1 đv = 1 m nguồn), decimate nếu quá ngân sách, vật liệu chỉ giữ màu/ảnh màu gốc (≤ --tex px), bỏ normal/roughness/metal.
# Đầu vào là dữ liệu KHÔNG tin cậy: chỉ import glTF (không chạy gì trong file). In 1 dòng `NHAP_JSON {...}` cho tools/nhap-model.mjs.
# Tất định: không ngẫu nhiên (AO dùng hướng lấy mẫu cố định).
import bpy, bmesh, sys, os, json, math, argparse
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('vao'); ap.add_argument('ra')
ap.add_argument('--cao', type=float, default=0)
ap.add_argument('--tam-giac-toi-da', type=int, default=8000)
ap.add_argument('--tex', type=int, default=512)
ap.add_argument('--ao', action='store_true')
ap.add_argument('--mau-dinh', action='store_true', help='thay ảnh màu bằng màu trung bình (phong cách khối)')
ap.add_argument('--xoay', type=float, default=0, help='xoay quanh trục đứng (độ) để mặt trước nhìn +Z')
ap.add_argument('--sang', type=float, default=0, help='làm sáng màu: trộn k (0..1) về trắng (ảnh màu, màu nền, màu đỉnh)')
ap.add_argument('--xam', type=float, default=0, help='khử bão hoà k (0..1, 1 = xám giữ độ sáng); chạy trước --sang')
ap.add_argument('--mau', default='', help='đổi màu phẳng: "sel=#hex,sel=#hex"; sel = obj:<glob tên mesh> | mat:<tên vật liệu hoặc chỉ số> (không tiền tố = vật liệu)')
ap.add_argument('--bo', default='', help='bỏ mesh theo tên (glob, cách nhau dấu phẩy) trước khi gộp, vd "Object_31,Object_33"')
ap.add_argument('--ghep', action='append', default=[], help='ghép GLB đã chuẩn hoá: "duong.glb;kich;x,y,z;rx" — kich = cạnh dài nhất sau scale (stud), x,y,z (kiểu three, gốc tâm đáy model chính) = vị trí tâm đáy của vật ghép, rx = độ xoay quanh X trước khi đặt')
ap.add_argument('--ten', default='model')
A = ap.parse_args(argv)

def say(*a): print('[chuan_hoa]', *a, flush=True)

# ---------- nhập ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=A.vao)
sc = bpy.context.scene
objs = list(bpy.data.objects)
meshes = [o for o in objs if o.type == 'MESH']
# Mesh nằm trong collection ẩn "glTF_not_exported" là vật phụ không thuộc cảnh (vd. icosphere hình xương) → bỏ, trừ khi không còn gì.
_that = [o for o in meshes if not all(c.name.startswith('glTF_not_exported') for c in o.users_collection)]
if _that: meshes = _that
if not meshes:
    print('NHAP_LOI khong co mesh'); sys.exit(2)

# ---------- bỏ mesh theo tên / tô màu phẳng theo mesh ----------
import fnmatch
def hex_lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
def mat_phang(hexs, base=None):
    m = bpy.data.materials.new('mau_' + hexs.lstrip('#'))
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*hex_lin(hexs), 1.0)
    b.inputs['Roughness'].default_value = 0.85
    return m
MAU = []
for it in [x for x in A.mau.split(',') if x.strip()]:
    sel, _, hx = it.rpartition('=')
    if not sel or not hx: say('--mau sai:', it); sys.exit(2)
    MAU.append((sel.strip(), hx.strip()))
_bo = [x.strip() for x in A.bo.split(',') if x.strip()]
if _bo:
    for o in list(meshes):
        if any(fnmatch.fnmatch(o.name, g) for g in _bo):
            bpy.data.objects.remove(o, do_unlink=True); meshes.remove(o)
    say('đã bỏ mesh theo --bo; còn', len(meshes))
    if not meshes: print('NHAP_LOI --bo bỏ hết mesh'); sys.exit(2)
_mat_cache = {}
for sel, hx in MAU:
    if not sel.startswith('obj:'): continue
    n = 0
    for o in meshes:
        if fnmatch.fnmatch(o.name, sel[4:]):
            if hx not in _mat_cache: _mat_cache[hx] = mat_phang(hx)
            o.data = o.data.copy(); o.data.materials.clear(); o.data.materials.append(_mat_cache[hx]); n += 1
    say('mau', sel, hx, '->', n, 'mesh')

# ---------- gộp về 1 gốc, áp transform ----------
for o in meshes:
    for m in list(o.modifiers):
        if m.type == 'ARMATURE': o.modifiers.remove(m)      # tĩnh: bỏ xương (giữ tư thế nhập)
    o.data = o.data.copy()                                   # mỗi object 1 mesh riêng (instance → thật)
    mw = o.matrix_world.copy()
    o.parent = None
    o.data.transform(mw)
    o.matrix_world = Matrix.Identity(4)
    if mw.determinant() < 0: o.data.flip_normals()
    for vg in list(o.vertex_groups): o.vertex_groups.remove(vg)
for o in list(bpy.data.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)

for o in sc.objects: o.select_set(False)
main = meshes[0]
with bpy.context.temp_override(active_object=main, object=main, selected_objects=meshes, selected_editable_objects=meshes):
    if len(meshes) > 1: bpy.ops.object.join()
main.name = A.ten; main.data.name = A.ten
# Một số GLB để nút ngoài scene → importer xếp vào collection ẩn "glTF_not_exported" → xuất ra GLB rỗng. Đưa về collection của scene.
for c in list(main.users_collection): c.objects.unlink(main)
sc.collection.objects.link(main)
for c in list(bpy.data.collections):
    if c.name.startswith('glTF_not_exported'): bpy.data.collections.remove(c)
me = main.data

# ---------- tam giác trước ----------
def tris(mesh):
    mesh.calc_loop_triangles(); return len(mesh.loop_triangles)
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.triangulate(bm, faces=bm.faces[:])
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
bm.to_mesh(me); bm.free()
tri_truoc = tris(me)

# ---------- decimate ----------
if tri_truoc > A.tam_giac_toi_da:
    md = main.modifiers.new('dec', 'DECIMATE'); md.ratio = max(0.02, A.tam_giac_toi_da / tri_truoc); md.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    new = bpy.data.meshes.new_from_object(main.evaluated_get(dg))
    main.modifiers.remove(md); old = main.data; main.data = new; bpy.data.meshes.remove(old); me = new; me.name = A.ten
tri_sau = tris(me)

# ---------- xoay / căn chỉnh / scale ----------
def bbox():
    cs = [v.co for v in me.vertices]
    mn = Vector((min(c.x for c in cs), min(c.y for c in cs), min(c.z for c in cs)))
    mx = Vector((max(c.x for c in cs), max(c.y for c in cs), max(c.z for c in cs)))
    return mn, mx
if A.xoay: me.transform(Matrix.Rotation(math.radians(A.xoay), 4, 'Z'))
mn, mx = bbox()
cao_nguon = mx.z - mn.z
k = (A.cao / cao_nguon) if (A.cao > 0 and cao_nguon > 1e-9) else 1.0
cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2
me.transform(Matrix.Scale(k, 4) @ Matrix.Translation((-cx, -cy, -mn.z)))
mn, mx = bbox()
size = mx - mn      # Blender (x, y, z) -> glTF (x, z, -y): hộp bao three = (x, z, y)

# ---------- tô màu theo vật liệu (--mau mat:… / tên / chỉ số) ----------
for sel, hx in MAU:
    if sel.startswith('obj:'): continue
    key = sel[4:] if sel.startswith('mat:') else sel
    n = 0
    for i, mat in enumerate(me.materials):
        if mat and (mat.name == key or str(i) == key):
            me.materials[i] = mat_phang(hx); n += 1
    say('mau vat lieu', key, hx, '->', n)

# ---------- ghép vật khác đã chuẩn hoá ----------
for gs in A.ghep:
    pth, kich, pos, rx = (gs.split(';') + ['0', '0,0,0', '0'])[:4]
    pre = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=pth)
    nw = [o for o in bpy.data.objects if o.name not in pre]
    ms = [o for o in nw if o.type == 'MESH']
    for o in ms:
        mw = o.matrix_world.copy(); o.parent = None; o.data = o.data.copy(); o.data.transform(mw); o.matrix_world = Matrix.Identity(4)
    for o in nw:
        if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    for o in ms:
        for c in list(o.users_collection): c.objects.unlink(o)
        sc.collection.objects.link(o)
    if not ms: say('ghép: không có mesh trong', pth); sys.exit(2)
    with bpy.context.temp_override(active_object=ms[0], object=ms[0], selected_objects=ms, selected_editable_objects=ms):
        if len(ms) > 1: bpy.ops.object.join()
    g = ms[0]; gm = g.data
    gm.transform(Matrix.Rotation(math.radians(float(rx)), 4, 'X'))
    cs = [v.co for v in gm.vertices]
    gmn = Vector((min(c.x for c in cs), min(c.y for c in cs), min(c.z for c in cs))); gmx = Vector((max(c.x for c in cs), max(c.y for c in cs), max(c.z for c in cs)))
    gk = float(kich) / max(gmx.x - gmn.x, gmx.y - gmn.y, gmx.z - gmn.z)
    px, py, pz = [float(v) for v in pos.split(',')]
    tgt = Vector((px, -pz, py))   # three (x, cao, sâu) -> Blender (x, -sâu, cao)
    gm.transform(Matrix.Translation(tgt) @ Matrix.Scale(gk, 4) @ Matrix.Translation(Vector((-(gmn.x + gmx.x) / 2, -(gmn.y + gmx.y) / 2, -gmn.z))))
    with bpy.context.temp_override(active_object=main, object=main, selected_objects=[main, g], selected_editable_objects=[main, g]):
        bpy.ops.object.join()
    me = main.data
    say('ghép', os.path.basename(pth), 'kich', kich, 'tại', pos)
tri_sau = tris(me)

# ---------- vật liệu ----------
TEX = A.tex
def upstream_image(sock, depth=0):
    if depth > 6 or not sock.is_linked: return None
    n = sock.links[0].from_node
    if n.type == 'TEX_IMAGE': return n
    for i in n.inputs:
        r = upstream_image(i, depth + 1)
        if r: return r
    return None
def mean_color(img):
    import numpy as np
    w, h = img.size
    if w * h == 0: return None
    a = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(a)
    a = a.reshape(-1, 4); return tuple(float(x) for x in a.mean(axis=0))
def doi_mau(r, g, b):
    if A.xam > 0:
        y = 0.2126 * r + 0.7152 * g + 0.0722 * b
        r, g, b = r + (y - r) * A.xam, g + (y - g) * A.xam, b + (y - b) * A.xam
    if A.sang > 0:
        r, g, b = r + (1 - r) * A.sang, g + (1 - g) * A.sang, b + (1 - b) * A.sang
    return r, g, b
def doi_anh(img):
    import numpy as np
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(a); a = a.reshape(-1, 4)
    if A.xam > 0:
        y = a[:, 0] * 0.2126 + a[:, 1] * 0.7152 + a[:, 2] * 0.0722
        for i in range(3): a[:, i] = a[:, i] + (y - a[:, i]) * A.xam
    if A.sang > 0:
        for i in range(3): a[:, i] = a[:, i] + (1 - a[:, i]) * A.sang
    img.pixels.foreach_set(a.reshape(-1)); img.update()
DOI = A.xam > 0 or A.sang > 0
n_mat = 0; img_dung = set(); tex_info = []; anh_doi = set()
for mat in me.materials:
    if not mat: continue
    n_mat += 1
    if not mat.use_nodes or not mat.node_tree: continue
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf: continue
    for name in ('Normal', 'Roughness', 'Metallic', 'Specular IOR Level', 'Coat Weight', 'Sheen Weight', 'Transmission Weight', 'Emission Strength'):
        s = bsdf.inputs.get(name)
        if s is None: continue
        for l in list(s.links): nt.links.remove(l)
    for name, v in (('Roughness', 0.85), ('Metallic', 0.0), ('Specular IOR Level', 0.2), ('Coat Weight', 0.0), ('Sheen Weight', 0.0), ('Transmission Weight', 0.0), ('Emission Strength', 0.0)):
        s = bsdf.inputs.get(name)
        if s is not None: s.default_value = v
    bc = bsdf.inputs['Base Color']
    tn = upstream_image(bc)
    if tn and tn.image:
        img = tn.image
        if A.mau_dinh:
            c = mean_color(img)
            if c:
                for l in list(bc.links): nt.links.remove(l)
                bc.default_value = (*doi_mau(c[0], c[1], c[2]), 1.0)
                al = bsdf.inputs['Alpha']
                for l in list(al.links): nt.links.remove(l)
                al.default_value = 1.0
                continue
        w, h = img.size
        m = max(w, h)
        if m > TEX:
            f = TEX / m; img.scale(max(1, int(w * f)), max(1, int(h * f)))
        al_linked = bsdf.inputs['Alpha'].is_linked
        if DOI and img.name not in anh_doi: doi_anh(img); anh_doi.add(img.name)
        img.file_format = 'PNG' if al_linked else 'JPEG'
        try: img.pack()   # đóng gói lại bộ đệm đã thu nhỏ để bộ xuất không dùng lại tệp gốc 1024 px
        except Exception as e: say('pack lỗi', e)
        img_dung.add(img.name); tex_info.append((img.name, img.size[0], img.size[1]))
    if DOI and not bc.is_linked:
        v = bc.default_value; bc.default_value = (*doi_mau(v[0], v[1], v[2]), v[3])
    for l in list(bsdf.inputs['Normal'].links): nt.links.remove(l)
    # Bỏ ảnh/nhóm nút không nuôi màu nền hoặc alpha (vd. nhóm "glTF Settings" nối ảnh ORM 1024 px → bộ xuất vẫn xuất occlusion)
    giu = {getattr(x, 'name', None) for x in (upstream_image(bc), upstream_image(bsdf.inputs['Alpha']))}
    for nd in list(nt.nodes):
        if nd.type == 'GROUP' and nd.node_tree and 'glTF' in nd.node_tree.name: nt.nodes.remove(nd)
        elif nd.type == 'TEX_IMAGE' and nd.name not in giu: nt.nodes.remove(nd)
    # Emission map -> bỏ (phong cách khối)
    for l in list(bsdf.inputs['Emission Color'].links): nt.links.remove(l)

# ---------- AO nướng vào màu đỉnh (tuỳ chọn) ----------
if A.ao:
    me.calc_loop_triangles(); me.calc_normals() if hasattr(me, 'calc_normals') else None
    bvh = BVHTree.FromObject(main, bpy.context.evaluated_depsgraph_get())
    diag = (mx - mn).length; R = 0.35 * diag; eps = 1e-3 * diag
    N = 24; golden = math.pi * (3 - math.sqrt(5))
    local = [Vector((math.cos(golden * i) * math.sqrt(1 - ((i + .5) / N) ** 2), math.sin(golden * i) * math.sqrt(1 - ((i + .5) / N) ** 2), (i + .5) / N)) for i in range(N)]
    ao = [0.0] * len(me.vertices)
    for v in me.vertices:
        n = v.normal.normalized()
        t = (Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).cross(n).normalized(); b = n.cross(t)
        hit = 0
        for d in local:
            w = t * d.x + b * d.y + n * d.z
            if bvh.ray_cast(v.co + n * eps, w, R)[0] is not None: hit += 1
        ao[v.index] = hit / N
    for ca in list(me.color_attributes): me.color_attributes.remove(ca)
    ca = me.color_attributes.new('AO', 'BYTE_COLOR', 'CORNER')
    for li, lp in enumerate(me.loops):
        g = 1.0 - 0.75 * ao[lp.vertex_index]; ca.data[li].color = (g, g, g, 1.0)
    me.color_attributes.active_color = ca
elif len(me.color_attributes):
    if DOI:   # màu đỉnh gốc: đổi cùng cách
        import numpy as np
        for ca in me.color_attributes:
            if ca.domain not in ('POINT', 'CORNER'): continue
            n = len(ca.data); a = np.empty(n * 4, dtype=np.float32); ca.data.foreach_get('color', a); a = a.reshape(-1, 4)
            if A.xam > 0:
                y = a[:, 0] * 0.2126 + a[:, 1] * 0.7152 + a[:, 2] * 0.0722
                for i in range(3): a[:, i] = a[:, i] + (y - a[:, i]) * A.xam
            if A.sang > 0:
                for i in range(3): a[:, i] = a[:, i] + (1 - a[:, i]) * A.sang
            ca.data.foreach_set('color', a.reshape(-1))

# ---------- xuất ----------
os.makedirs(os.path.dirname(os.path.abspath(A.ra)), exist_ok=True)
props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
want = dict(filepath=A.ra, export_format='GLB', export_yup=True, export_apply=True, export_cameras=False, export_lights=False,
            export_animations=False, export_skins=False, export_morph=False, export_extras=False, export_normals=True,
            export_texcoords=True, export_materials='EXPORT', export_image_format='AUTO', export_jpeg_quality=80,
            export_draco_mesh_compression_enable=False, use_selection=False)
if 'export_vertex_color' in props: want['export_vertex_color'] = 'ACTIVE' if (A.ao or len(me.color_attributes)) else 'NONE'
bpy.ops.export_scene.gltf(**{k: v for k, v in want.items() if k in props})

print('NHAP_JSON ' + json.dumps({
    'ten': A.ten, 'bbox_stud': [round(size.x, 3), round(size.z, 3), round(size.y, 3)],   # (x, cao, sâu) kiểu three
    'tam_giac_truoc': tri_truoc, 'tam_giac_sau': tri_sau, 'vat_lieu': n_mat, 'anh': tex_info,
    'cao_nguon_m': round(cao_nguon, 4), 'he_so': round(k, 5), 'bytes': os.path.getsize(A.ra)}))
