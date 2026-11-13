# nhap_rig.py — nhập model CÓ XƯƠNG (glTF/GLB), giữ nguyên armature + skin + animation, chuẩn hoá và xuất GLB cho three.js.
#   "<Blender 5.1.2>" -b --factory-startup -t 4 -P tools/blender/nhap_rig.py -- <vao.glb> [--ra out.glb] [--cao 2.6]
#       [--long "#hex"] [--nhan-mau "#hex"] [--bo "glob,glob"] [--no "#hex"|--khong-no] [--xoay 0] [--tex 512] [--ten x] [--chi-xem]
# Chế độ xem (không --ra hoặc --chi-xem): chỉ in 1 dòng `RIG_JSON {...}`: xương (tên, cha), action (tên, số khung, fps, giây),
#   số tam giác, vật liệu, ảnh màu (cỡ), mesh + nhóm đỉnh, hộp bao.
# Chế độ xuất: --cao đặt chiều cao thân (chân y=0, mặt nhìn +Z); scale được áp vào MESH và vào armature (rest pose + từng key
#   vị trí của action) để animation không hỏng; --bo bỏ mesh theo tên (mũ, khăn); --long đổi màu lông (ảnh màu được thay bằng
#   màu phẳng nhân với độ sáng gốc, hoặc nếu muốn giữ ảnh thì dùng --nhan); --no gắn nơ cổ (khối hộp gắn xương cổ/đầu).
# Đầu vào là dữ liệu KHÔNG tin cậy: chỉ import glTF. Tất định, không ngẫu nhiên.
import bpy, sys, os, json, math, argparse, fnmatch
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('vao')
ap.add_argument('--ra', default='')
ap.add_argument('--chi-xem', action='store_true')
ap.add_argument('--cao', type=float, default=0, help='chiều cao thân (stud); không có thì giữ cỡ gốc')
ap.add_argument('--xoay', type=float, default=0, help='xoay quanh trục đứng (độ) để mặt nhìn +Z')
ap.add_argument('--bo', default='', help='bỏ mesh theo tên (glob, cách nhau dấu phẩy)')
ap.add_argument('--long', default='', help='màu lông #hex (thay màu nền, giữ độ sáng/đậm nhạt của ảnh gốc)')
ap.add_argument('--giu-anh', action='store_true', help='không thay ảnh bằng màu phẳng; chỉ nhân màu')
ap.add_argument('--cat-mu', default='', help='tên mesh phụ kiện (glob): xoá các mảnh rời nằm cao hơn --cat-cao (mũ), giữ phần cổ (nơ/khăn gốc)')
ap.add_argument('--cat-cao', type=float, default=0.72, help='tỉ lệ chiều cao; mảnh có tâm cao hơn mức này bị xoá')
ap.add_argument('--mau-pk', default='', help='màu #hex cho phụ kiện giữ lại bởi --cat-mu')
ap.add_argument('--no-glb', default='', help='GLB nơ lấy từ nguồn ngoài (đã chuẩn hoá bằng nhap-model): gắn ở cổ, chỉ đổi màu bằng --no; thay khăn giữ bởi --cat-mu')
ap.add_argument('--no-rong', type=float, default=0.9, help='bề ngang nơ (stud)')
ap.add_argument('--no-dz', type=float, default=0.0, help='dời nơ lên/xuống (stud)')
ap.add_argument('--no', default='', help='màu nơ cổ #hex')
ap.add_argument('--no-xuong', default='', help='tên xương gắn nơ (mặc định tự tìm cổ/đầu)')
ap.add_argument('--tex', type=int, default=512)
ap.add_argument('--ten', default='bap')
A = ap.parse_args(argv)

def say(*a): print('[nhap_rig]', *a, flush=True)
def hex_lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=A.vao)
sc = bpy.context.scene
arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
# vật phụ nằm trong collection ẩn "glTF_not_exported" (vd. hình cầu của xương) → bỏ
for o in list(meshes):
    if o.users_collection and all(c.name.startswith('glTF_not_exported') for c in o.users_collection):
        bpy.data.objects.remove(o, do_unlink=True); meshes.remove(o)

def fcurves_of(ac):
    if hasattr(ac, 'fcurves'): return list(ac.fcurves)      # Blender < 5
    out = []
    for ly in ac.layers:
        for st in ly.strips:
            for cb in st.channelbags: out += list(cb.fcurves)
    return out
def bo_fcurve(ac, fc):
    if hasattr(ac, 'fcurves'): ac.fcurves.remove(fc); return
    for ly in ac.layers:
        for st in ly.strips:
            for cb in st.channelbags:
                if fc in list(cb.fcurves): cb.fcurves.remove(fc); return

def world_bbox(objs):
    pts = []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        ev = o.evaluated_get(dg); me = ev.to_mesh()
        pts += [o.matrix_world @ v.co for v in me.vertices]; ev.to_mesh_clear()
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx

def info():
    d = {'armature': arm.name if arm else None, 'bones': [], 'actions': [], 'meshes': [], 'materials': [], 'images': []}
    if arm:
        for b in arm.data.bones: d['bones'].append({'ten': b.name, 'cha': b.parent.name if b.parent else None})
    for ac in bpy.data.actions:
        r = ac.frame_range; fps = sc.render.fps
        d['actions'].append({'ten': ac.name, 'khung': [round(r[0], 2), round(r[1], 2)], 'soKhung': int(round(r[1] - r[0])) + 1, 'fps': fps, 'giay': round((r[1] - r[0]) / fps, 3)})
    tri = 0
    for o in meshes:
        me = o.data; me.calc_loop_triangles(); n = len(me.loop_triangles); tri += n
        d['meshes'].append({'ten': o.name, 'tamGiac': n, 'dinh': len(me.vertices), 'nhomDinh': [g.name for g in o.vertex_groups][:60],
                            'vatLieu': [m.name for m in me.materials if m], 'cha': o.parent.name if o.parent else None})
    d['tamGiac'] = tri
    for m in bpy.data.materials:
        e = {'ten': m.name}
        if m.use_nodes:
            b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if b: e['mauNen'] = [round(x, 3) for x in b.inputs['Base Color'].default_value[:3]]; e['coAnh'] = b.inputs['Base Color'].is_linked
        d['materials'].append(e)
    for im in bpy.data.images:
        if im.size[0] and im.name != 'Render Result': d['images'].append({'ten': im.name, 'px': [im.size[0], im.size[1]]})
    objs = meshes
    if objs:
        mn, mx = world_bbox(objs)
        d['hopBaoBlender'] = {'min': [round(x, 3) for x in mn], 'max': [round(x, 3) for x in mx]}
    return d

# ---------- bỏ shape key (morph): model gốc có 1 target lệch tới ~50 đơn vị, animation nội suy 0→1 làm lưới "nổ" ----------
if A.ra and not A.chi_xem:
    for o in meshes:
        if o.data.shape_keys: o.shape_key_clear(); say('bỏ shape key của', o.name)
    for ac in bpy.data.actions:
        for fc in list(fcurves_of(ac)):
            if 'key_blocks' in fc.data_path: bo_fcurve(ac, fc)


# ---------- đặt lại rest pose = tư thế idly khung 0 ----------
# Model gốc: rest pose của xương không khớp lưới (lưới "xẹp" khi không có animation; chỉ đúng khi một action đang chạy).
# Để engine tự đặt tư thế được, ta "nướng" tư thế idly@0 làm rest: (1) lấy mẫu mọi action theo ma trận xương (armature space),
# (2) áp pose idly@0 vào lưới + armature_apply, (3) dựng lại keyframe để pose_bone.matrix = ma trận đã lấy mẫu.
def gan_action(ac):
    arm.animation_data.action = ac
    sl = [x for x in getattr(ac, 'slots', []) if x.target_id_type == 'OBJECT']
    if sl and hasattr(arm.animation_data, 'action_slot'): arm.animation_data.action_slot = sl[0]
def rebase_rest(pose_action='idly'):
    ac0 = bpy.data.actions.get(pose_action) or bpy.data.actions[0]
    mau = {}
    for ac in list(bpy.data.actions):
        gan_action(ac)
        r = ac.frame_range; f0, f1 = int(math.floor(r[0])), int(math.ceil(r[1]))
        fr = []
        for f in range(f0, f1 + 1):
            sc.frame_set(f); bpy.context.view_layer.update()
            fr.append((f, {pb.name: pb.matrix.copy() for pb in arm.pose.bones}))
        mau[ac.name] = fr
    gan_action(ac0)
    sc.frame_set(int(math.floor(ac0.frame_range[0]))); bpy.context.view_layer.update()
    for o in meshes:
        md = next((m for m in o.modifiers if m.type == 'ARMATURE'), None)
        if not md: continue
        o.data = o.data.copy()
        with bpy.context.temp_override(active_object=o, object=o, selected_objects=[o], selected_editable_objects=[o]):
            bpy.ops.object.modifier_apply(modifier=md.name)
        nm = o.modifiers.new('Armature', 'ARMATURE'); nm.object = arm
    bpy.context.view_layer.objects.active = arm
    with bpy.context.temp_override(active_object=arm, object=arm, selected_objects=[arm], selected_editable_objects=[arm]):
        bpy.ops.object.mode_set(mode='POSE')
        bpy.ops.pose.select_all(action='SELECT')
        bpy.ops.pose.armature_apply(selected=False)
        bpy.ops.object.mode_set(mode='OBJECT')
    thutu = sorted(arm.pose.bones, key=lambda b: len(b.parent_recursive))
    for ten, fr in mau.items():
        cu = bpy.data.actions[ten]; cu.name = ten + '__cu'
        mo = bpy.data.actions.new(ten)
        gan_action(mo)
        for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
        for f, mats in fr:
            sc.frame_set(f)
            for pb in thutu:
                pb.matrix = mats[pb.name]; bpy.context.view_layer.update()
                pb.keyframe_insert('location', frame=f); pb.keyframe_insert('rotation_quaternion', frame=f); pb.keyframe_insert('scale', frame=f)
        bpy.data.actions.remove(cu)
    for tr in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(tr)
    for ac in bpy.data.actions:
        tr = arm.animation_data.nla_tracks.new(); tr.name = ac.name
        st = tr.strips.new(ac.name, int(math.floor(ac.frame_range[0])), ac); st.name = ac.name
    arm.animation_data.action = None
    sc.frame_set(0)
    arm.data.pose_position = 'REST'; bpy.context.view_layer.update()
    say('đã đặt lại rest pose theo', pose_action, '; actions:', [a.name for a in bpy.data.actions])

if not A.ra or A.chi_xem:
    print('RIG_JSON ' + json.dumps(info(), ensure_ascii=False)); sys.exit(0)

# ---------- bỏ mesh (mũ, khăn) ----------
bo = [x.strip() for x in A.bo.split(',') if x.strip()]
for o in list(meshes):
    if any(fnmatch.fnmatch(o.name, g) for g in bo):
        bpy.data.objects.remove(o, do_unlink=True); meshes.remove(o)
        say('đã bỏ mesh theo --bo')

if arm and A.ra and not A.chi_xem: rebase_rest()

# ---------- phụ kiện gốc: bỏ mũ, giữ nơ/khăn cổ ----------
if A.cat_mu:
    import bmesh
    (lo, hi) = world_bbox(meshes); z0, z1 = lo[2], hi[2]
    nguong = z0 + (z1 - z0) * A.cat_cao
    for o in meshes:
        if not any(fnmatch.fnmatch(o.name, g.strip()) for g in A.cat_mu.split(',')): continue
        bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table()
        seen = set(); xoa = []; giu = 0
        for v in bm.verts:
            if v.index in seen: continue
            comp = []; st = [v]; seen.add(v.index)
            while st:
                a = st.pop(); comp.append(a)
                for e in a.link_edges:
                    b = e.other_vert(a)
                    if b.index not in seen: seen.add(b.index); st.append(b)
            cz = sum((o.matrix_world @ c.co).z for c in comp) / len(comp)
            if cz > nguong: xoa += comp
            else: giu += 1
        bmesh.ops.delete(bm, geom=xoa, context='VERTS')
        bm.to_mesh(o.data); bm.free()
        say('cat mu', o.name, 'xoa', len(xoa), 'dinh, giu', giu, 'manh,', len(o.data.polygons), 'mat')
        if A.mau_pk:
            for i, m in enumerate(o.data.materials):
                m2 = m.copy(); m2.name = 'no_mau'; o.data.materials[i] = m2
                b = next((n for n in m2.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
                if b:
                    bc = b.inputs['Base Color']
                    for l in list(bc.links): m2.node_tree.links.remove(l)
                    bc.default_value = (*hex_lin(A.mau_pk), 1.0); b.inputs['Roughness'].default_value = 0.8

# ---------- xoay + scale + đặt chân y=0 (áp đúng cách, giữ animation) ----------
# Cách: đưa MỌI object về cùng một root rỗng, đo hộp bao ở rest pose, rồi áp scale trực tiếp vào
#  (a) đỉnh mesh (đã ở không gian world), (b) xương rest (đầu/đuôi xương), (c) key vị trí của action.
if A.xoay:
    R = Matrix.Rotation(math.radians(A.xoay), 4, 'Z')
else:
    R = Matrix.Identity(4)
mn, mx = world_bbox(meshes)
cao_nguon = mx.z - mn.z
k = (A.cao / cao_nguon) if (A.cao > 0 and cao_nguon > 1e-9) else 1.0
cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2
T = Matrix.Scale(k, 4) @ Matrix.Translation((-cx, -cy, -mn.z))
M = R @ T if A.xoay else T
if A.xoay: M = R @ T

# mesh: ghi biến đổi vào đỉnh ở không gian world, bỏ cha, object thành identity (armature modifier vẫn dùng armature)
bpy.context.view_layer.update()
for o in meshes:
    mw = o.matrix_world.copy()
    o.parent = None
    o.data = o.data.copy()
    o.data.transform(M @ mw)
    o.matrix_world = Matrix.Identity(4)
    if (M @ mw).determinant() < 0: o.data.flip_normals()

if arm:
    # armature: gốc object = identity; rest pose (edit bones) nhân M; key vị trí của action nhân k (chỉ phần tịnh tiến, theo đơn vị xương cha)
    mwa = arm.matrix_world.copy()
    arm.parent = None; arm.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    MA = M @ mwa
    for eb in arm.data.edit_bones:
        h, t, roll_vec = eb.head.copy(), eb.tail.copy(), eb.z_axis.copy()
        eb.head = MA @ h; eb.tail = MA @ t
        eb.align_roll(MA.to_3x3() @ roll_vec)
    bpy.ops.object.mode_set(mode='OBJECT')
    # animation: xương con có vị trí cục bộ (location) tính theo không gian xương cha -> nhân k (scale đều); xoay không đổi
    # (nếu có --xoay, chỉ xương gốc cần xoay: tạm không hỗ trợ xoay animation → báo)
    if A.xoay: say('CANH BAO: --xoay chưa chỉnh key animation của xương gốc')
    s_tot = MA.to_scale()[0]    # hệ số co giãn thật áp lên xương (gồm scale của object armature, vd 100 từ FBX)
    say('scale xuong', round(s_tot, 4), '(k =', round(k, 4), ')')
    n_loc = 0
    for ac in bpy.data.actions:
        for fc in fcurves_of(ac):
            if fc.data_path.endswith('.location'):
                for kp in fc.keyframe_points:
                    kp.co[1] *= s_tot; kp.handle_left[1] *= s_tot; kp.handle_right[1] *= s_tot
                fc.update(); n_loc += 1
    say('key vi tri da nhan he so:', n_loc, 'duong cong')

# ---------- màu lông ----------
# Ảnh màu của model = nền lông nâu + mảng sáng (mõm, lòng bàn chân) + vệt đen (mũi). Phân theo độ sáng: tối → lông, sáng → mảng sáng
# (= lông trộn trắng 45%), đen sâu giữ nguyên. Kết quả phẳng, hợp phong cách khối. Làm trong không gian giá trị ảnh (cùng không gian với hex).
if A.long:
    import numpy as np
    def hx(h):
        h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)
    fur = hx(A.long); sang = fur + (1 - fur) * 0.45
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not b or m.name != 'body': continue
        bc = b.inputs['Base Color']
        tn = None
        if bc.is_linked and bc.links[0].from_node.type == 'TEX_IMAGE': tn = bc.links[0].from_node
        if tn and tn.image:
            im = tn.image; w, h = im.size
            a = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(a); a = a.reshape(-1, 4)
            L = a[:, 0] * 0.2126 + a[:, 1] * 0.7152 + a[:, 2] * 0.0722
            Lf = float(np.median(L)); Lt = float(np.percentile(L, 99))
            t = np.clip((L - Lf) / max(1e-4, (Lt - Lf) * 0.5), 0, 1)[:, None]
            col = fur[None, :] * (1 - t) + sang[None, :] * t
            den = np.clip((L / max(1e-4, Lf * 0.5)), 0, 1)[:, None]     # đen sâu (mũi, mắt) giữ tối
            a[:, :3] = col * den
            im.pixels.foreach_set(a.reshape(-1)); im.update()
            say('đổi màu lông', A.long, 'trên ảnh', im.name, w, h)
        else:
            bc.default_value = (*hex_lin(A.long), 1.0)
        b.inputs['Roughness'].default_value = 0.9

# ---------- nơ cổ ----------
def tim_xuong(ten_goi):
    ds = [b.name for b in arm.data.bones]
    if ten_goi and ten_goi in ds: return ten_goi
    for kw in ('neck', 'co', 'head', 'dau'):
        for n in ds:
            if kw in n.lower(): return n
    return ds[0]
no_xuong = None
if A.no_glb and arm:
    # vị trí cổ = mép trên-trước của khăn gốc (mesh --cat-mu); sau đó bỏ khăn
    khan = [o for o in meshes if A.cat_mu and any(fnmatch.fnmatch(o.name, g.strip()) for g in A.cat_mu.split(','))]
    lo, hi = world_bbox(khan if khan else meshes)
    co = Vector(((lo.x + hi.x) / 2, lo.y, hi.z if khan else lo.z + (hi.z - lo.z) * 0.6))
    for o in khan: meshes.remove(o); bpy.data.objects.remove(o, do_unlink=True)
    truoc = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(A.no_glb))
    moi = [o for o in bpy.data.objects if o not in truoc]
    mm = [o for o in moi if o.type == 'MESH']
    bpy.context.view_layer.update()
    for o in mm:
        mw = o.matrix_world.copy(); o.parent = None; o.data = o.data.copy(); o.data.transform(mw); o.matrix_world = Matrix.Identity(4)
    bpy.ops.object.select_all(action='DESELECT')
    for o in mm: o.select_set(True)
    bpy.context.view_layer.objects.active = mm[0]
    if len(mm) > 1: bpy.ops.object.join()
    no = mm[0]; no.name = 'no_co'
    for o in moi:
        if o.name in bpy.data.objects and o is not no and o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    l2, h2 = world_bbox([no]); kk = A.no_rong / max(1e-6, h2.x - l2.x)
    c2 = (l2 + h2) / 2; day = (h2.y - l2.y) * kk
    no.data.transform(Matrix.Translation(co + Vector((0, -day * 0.5, A.no_dz))) @ Matrix.Scale(kk, 4) @ Matrix.Translation(-c2))
    if A.no:
        mt = bpy.data.materials.new('no_mau'); mt.use_nodes = True
        b = next(n for n in mt.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Base Color'].default_value = (*hex_lin(A.no), 1.0); b.inputs['Roughness'].default_value = 0.8
        no.data.materials.clear(); no.data.materials.append(mt)
    no_xuong = A.no_xuong if A.no_xuong in arm.data.bones else next((b.name for b in arm.data.bones if b.name.startswith('base')), tim_xuong(''))
    g = no.vertex_groups.new(name=no_xuong); g.add(list(range(len(no.data.vertices))), 1.0, 'REPLACE')
    md = no.modifiers.new('Armature', 'ARMATURE'); md.object = arm
    meshes.append(no)
    say('nơ GLB', A.no_glb, 'gắn xương', no_xuong, 'tại', [round(x, 2) for x in co])
elif A.no and arm:
    import bmesh
    no_xuong = tim_xuong(A.no_xuong)
    bone = arm.data.bones[no_xuong]
    # vị trí: đầu xương cổ (world, đã chuẩn hoá); nơ = 2 cánh (hình nêm) + nút giữa, đặt trước cổ (+Z... mặt nhìn -Y trong Blender?) -> dùng hướng +Y âm (three +Z)
    pos = arm.matrix_world @ bone.head_local
    s = 0.20 * (A.cao if A.cao > 0 else 1.0) / 2.6
    bm = bmesh.new()
    def hop(c, sx, sy, sz):
        bmesh.ops.create_cube(bm, size=1.0)
        v = bm.verts[-8:]
        for p in v: p.co = Vector((p.co.x * sx + c[0], p.co.y * sy + c[1], p.co.z * sz + c[2]))
    hop((-s * 0.9, 0, 0), s * 1.5, s * 0.5, s * 1.1)     # cánh trái
    hop((s * 0.9, 0, 0), s * 1.5, s * 0.5, s * 1.1)      # cánh phải
    for v in bm.verts:                                   # cánh thu nhỏ dần về phía nút → hình nơ thắt (hai nêm), không phải thanh dẹt
        f = min(1.0, abs(v.co.x) / (s * 1.65)); v.co.z *= 0.30 + 0.70 * f
    hop((0, 0, 0), s * 0.55, s * 0.62, s * 0.55)         # nút
    nome = bpy.data.meshes.new('no_co'); bm.to_mesh(nome); bm.free()
    no = bpy.data.objects.new('no_co', nome); sc.collection.objects.link(no)
    mt = bpy.data.materials.new('no_mau'); mt.use_nodes = True
    b = next(n for n in mt.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*hex_lin(A.no), 1.0); b.inputs['Roughness'].default_value = 0.8
    nome.materials.append(mt)
    # nơ đặt ở trước cổ: lệch về phía mặt (Blender -Y = three +Z), hơi thấp hơn đầu xương
    off = Vector((0, -getattr(A, 'no_lech', 0.0) , 0))
    no.location = pos + Vector((0, -s * 1.2, -s * 0.2))
    # bake vị trí vào đỉnh, rồi skin cứng 100% vào xương cổ
    nome.transform(Matrix.Translation(no.location)); no.location = (0, 0, 0)
    g = no.vertex_groups.new(name=no_xuong); g.add(list(range(len(nome.vertices))), 1.0, 'REPLACE')
    md = no.modifiers.new('Armature', 'ARMATURE'); md.object = arm
    meshes.append(no)
    say('nơ gắn xương', no_xuong)

# ---------- ảnh màu <= --tex ----------
for im in bpy.data.images:
    if im.size[0] and im.name != 'Render Result':
        m = max(im.size)
        if m > A.tex:
            f = A.tex / m; im.scale(max(1, int(im.size[0] * f)), max(1, int(im.size[1] * f)))
        try: im.pack()
        except Exception as e: say('pack lỗi', e)
# vật liệu: bỏ normal/roughness/metal (chỉ màu)
for m in bpy.data.materials:
    if not m.use_nodes: continue
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b: continue
    for nm in ('Normal', 'Roughness', 'Metallic', 'Emission Color'):
        s = b.inputs.get(nm)
        if s is not None:
            for l in list(s.links): m.node_tree.links.remove(l)
    giu = set()
    def up(sock, d=0):
        if d > 6 or not sock.is_linked: return None
        n = sock.links[0].from_node
        if n.type == 'TEX_IMAGE': return n
        for i in n.inputs:
            r = up(i, d + 1)
            if r: return r
    n1 = up(b.inputs['Base Color']); n2 = up(b.inputs['Alpha'])
    giu = {x.name for x in (n1, n2) if x}
    for nd in list(m.node_tree.nodes):
        if nd.type == 'GROUP' and nd.node_tree and 'glTF' in nd.node_tree.name: m.node_tree.nodes.remove(nd)
        elif nd.type == 'TEX_IMAGE' and nd.name not in giu: m.node_tree.nodes.remove(nd)

# ---------- xuất ----------
if arm: arm.data.pose_position = 'POSE'
bpy.ops.object.select_all(action='DESELECT')
os.makedirs(os.path.dirname(os.path.abspath(A.ra)), exist_ok=True)
props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
want = dict(filepath=A.ra, export_format='GLB', export_yup=True, export_apply=False, export_cameras=False, export_lights=False,
            export_animations=True, export_animation_mode='ACTIONS', export_skins=True, export_morph=False, export_extras=False,
            export_normals=True, export_texcoords=True, export_materials='EXPORT', export_image_format='AUTO', export_jpeg_quality=80,
            export_force_sampling=True, export_optimize_animation_size=False, export_def_bones=False, export_draco_mesh_compression_enable=False,
            use_selection=False, export_anim_single_armature=True)
bpy.ops.export_scene.gltf(**{kk: v for kk, v in want.items() if kk in props})
mn2, mx2 = world_bbox(meshes)
out = info(); out['ra'] = A.ra; out['bytes'] = os.path.getsize(A.ra)
out['hopBaoSau'] = {'min': [round(x, 3) for x in mn2], 'max': [round(x, 3) for x in mx2]}
out['heSo'] = round(k, 5); out['noXuong'] = no_xuong
print('RIG_JSON ' + json.dumps(out, ensure_ascii=False))
