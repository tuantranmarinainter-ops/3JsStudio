# ga_hood.py — dựng MŨ TRÙM hoodie của Gà (túi vải dày rủ sau gáy + viền cuộn quanh cổ) bằng Blender, xuất GLB tĩnh.
#   "C:/Program Files/Blender Foundation/Blender 4.2/blender.exe" --factory-startup -b -P tools/blender/ga_hood.py -- assets/characters/ga/hood.glb
# Toạ độ GLB = toạ độ cục bộ của `torso` trong engine/ga-rig.js (Y lên, mặt nhìn +Z, lưng -Z, gốc ở torsoY0) → gắn thẳng vào torso, không biến đổi.
# Tất định: không ngẫu nhiên, nếp gấp là hàm giải tích của (u, v). UV KHÔNG xuất: ga-rig.js gán lại bằng hoodUV() (sọc ngang liền khớp áo).
import bpy, bmesh, sys, os, re, json, math
from math import sin, cos, pi, sqrt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(ROOT, 'assets/characters/ga/hood.glb')
dims = json.load(open(os.path.join(ROOT, 'assets/characters/ga/dims.json'), encoding='utf-8'))['rig']
src = open(os.path.join(ROOT, 'engine/ga-rig.js'), encoding='utf-8').read()
LOW_H = float(re.search(r'LOW_H = ([\d.]+)', src).group(1))
TD = float(re.search(r'TD: ([\d.]+)', src).group(1))
TY0 = dims['hem_y'] + LOW_H                  # torsoY0
SHOULDER = dims['shoulder_y'] - TY0
BACK = -TD / 2 - 0.02                         # mặt lưng áo (cục bộ torso)
TW2 = dims['torso_w'] / 2

def sstep(a, b, x):
    t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)

# ---- viền cổ (cùng đường cong với hood_collar trong ga-rig.js: a=0.69, b=.57-.13cos, y=3.95-.2cos) ----
A = 0.69
def ring_pt(ph):
    b = 0.57 - 0.13 * cos(ph); yw = 3.95 - 0.2 * cos(ph)
    return (A * sin(ph), yw - TY0, b * cos(ph))
def ring_r(ph):                               # viền dày dần ra phía sau, lượn nhẹ như vải cuộn
    back = max(0.0, -cos(ph))
    return 0.125 + 0.062 * back ** 1.3 + 0.012 * sin(5 * ph + 1.0) * back

verts, faces, aos = [], [], []   # aos: độ tối (AO nướng sẵn vào màu đỉnh) theo đỉnh
def V(p, ao=0.0): verts.append((p[0], -p[2], p[1])); aos.append(ao); return len(verts) - 1   # three(x,y,z) → blender(x,-z,y)

# ---- ống viền ----
NR, NS = 64, 10
ringrows = []
for i in range(NR):
    ph = 2 * pi * i / NR
    c = ring_pt(ph); r = ring_r(ph)
    ox, oz = sin(ph), cos(ph)                  # hướng ra ngoài trong mặt phẳng ngang (gần đúng)
    n = sqrt(ox * ox + oz * oz) or 1; ox /= n; oz /= n
    off = r - 0.125                            # dịch tâm ra ngoài để mép trong không xuyên đầu
    cx, cy, cz = c[0] + ox * off, c[1], c[2] + oz * off
    row = []
    for k in range(NS):
        a = 2 * pi * k / NS
        bk = max(0.0, -cos(ph))
        ao = 0.40 * bk * max(0.0, -sin(a)) + 0.30 * max(0.0, -cos(a)) * (0.4 + 0.6 * bk)   # mặt dưới + mặt trong (phía cổ) tối hơn
        row.append(V((cx + ox * r * cos(a), cy + r * 1.02 * sin(a), cz + oz * r * cos(a)), ao))
    ringrows.append(row)
for i in range(NR):
    for k in range(NS):
        a, b, c2, d = ringrows[i][k], ringrows[(i + 1) % NR][k], ringrows[(i + 1) % NR][(k + 1) % NS], ringrows[i][(k + 1) % NS]
        faces.append((a, d, c2, b))
ring_faces = len(faces)

# ---- túi vải sau gáy ----
NU, NV = 20, 12
YB = 3.15 - TY0                               # chóp túi (đo từ ảnh phác sau)
PH0 = 78 * pi / 180
def panel(u, v):
    ph = pi + u * PH0
    rp = ring_pt(ph)                           # mép trên = tâm viền
    # bề rộng theo v: loe ra phủ vai rồi thu về chóp tròn
    W = 0.69 + (0.84 - 0.69) * sstep(0.0, 0.3, v)
    if v > 0.3:
        t = (v - 0.3) / 0.7; W = 0.84 * sqrt(max(0.0, 1 - t ** 4)) if t < 1 else 0.0
    x_h = u * W
    w = sstep(0.0, 0.34, v)
    # độ gục: túi dày nhất ở vai, mỏng dần xuống chóp
    rnd = sqrt(max(0.0, 1 - u * u))                  # tiết diện tròn như gối: mỏng ở rìa
    gap = 0.04 + (0.235 * (1 - v) ** 0.8 + 0.05 * sin(pi * min(1, v * 1.1))) * (0.28 + 0.72 * rnd)
    z_h = BACK - gap
    # nếp mềm: sóng hội tụ về chóp + gờ ngang cong + vết lõm dọc giữa (đường may)
    fold = 0.034 * sin(u * pi * (2.6 + 0.9 * v) + 0.6) * sin(pi * min(1, v * 1.1)) ** 0.8
    fold += -0.035 * math.exp(-((v - 0.42) / 0.07) ** 2) * (1 - 0.5 * u * u)
    fold += 0.012 * sin(u * pi * 5.3 + 2.0 * v) * v * (1 - v)
    fold -= 0.016 * math.exp(-(u / 0.045) ** 2) * sstep(0.1, 0.5, v)
    z_h -= fold
    # chóp tròn: kéo y lên ở hai bên (rìa) cho đáy hình chữ U / V mềm
    y_h = rp[1] * (1 - v) + (YB + 0.40 * (1 - sqrt(max(0.0, 1 - u * u * 0.98))) * v ** 2) * v
    y_h = rp[1] + (YB - rp[1]) * v + 0.38 * (1 - sqrt(max(0.0, 1 - (u * 0.97) ** 2))) * v ** 2
    x = rp[0] * (1 - w) + x_h * w
    z = rp[2] * (1 - w) + z_h * w
    y = rp[1] * (1 - w) + y_h * w if v < 0.34 else y_h
    ao = 0.32 * math.exp(-(v / 0.10) ** 2) + 6.0 * max(0.0, -fold) + 0.22 * v ** 3 + 0.45 * abs(u) ** 5 * min(1, v * 6) + 0.5 * v ** 6 + 0.12 * u * u * (0.3 + v) + 0.18 * math.exp(-((v - 0.42) / 0.07) ** 2)
    return (x, y, z), min(0.8, ao)
# túi KÍN có khối: lớp ngoài (phồng ra sau) + lớp trong (áp sát lưng áo) + thành rìa → không còn là tấm mỏng
INNER = -TD / 2 + 0.005
def inner_of(p):
    th = max(0.045, INNER - p[2])
    return (p[0], p[1], p[2] + th)
go, gi = [], []
for j in range(NV + 1):
    ro, ri = [], []
    for i in range(NU + 1):
        p, ao = panel(-1 + 2 * i / NU, j / NV)
        ro.append(V(p, ao)); ri.append(V(inner_of(p), 0.6))
    go.append(ro); gi.append(ri)
for j in range(NV):
    for i in range(NU):
        a, b, c2, d = go[j][i], go[j][i + 1], go[j + 1][i + 1], go[j + 1][i]
        faces.append((a, d, c2, b))                 # lớp ngoài: pháp tuyến ra sau lưng
        a, b, c2, d = gi[j][i], gi[j][i + 1], gi[j + 1][i + 1], gi[j + 1][i]
        faces.append((a, b, c2, d))                 # lớp trong: ngược lại
for j in range(NV):                                 # thành hai bên
    for i, sg in ((0, 1), (NU, -1)):
        a, d = go[j][i], go[j + 1][i]; b, c2 = gi[j][i], gi[j + 1][i]
        faces.append((a, d, c2, b) if sg > 0 else (a, b, c2, d))
for i in range(NU):                                 # đáy chóp + mép trên (nằm dưới viền)
    a, b = go[NV][i], go[NV][i + 1]; c2, d = gi[NV][i + 1], gi[NV][i]
    faces.append((a, b, c2, d))
    a, b = go[0][i], go[0][i + 1]; c2, d = gi[0][i + 1], gi[0][i]
    faces.append((a, d, c2, b))

for _o in list(bpy.data.objects): bpy.data.objects.remove(_o, do_unlink=True)   # bỏ khối mặc định
def mk(name, vs, fs, ao):
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update()
    ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for i, a in enumerate(ao): k = 1.0 - a; ca.data[i].color = (k, k, k, 1.0)
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    for f in me.polygons: f.use_smooth = True
    return ob
def use(ob):
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
n_ring = ringrows[-1][-1] + 1
ring = mk('hood_rim', verts[:n_ring], faces[:ring_faces], aos[:n_ring])
pan = mk('hood_pouch', [(x, y, z) for (x, y, z) in verts[n_ring:]], [tuple(i - n_ring for i in f) for f in faces[ring_faces:]], aos[n_ring:])
use(ring)
bm = bmesh.new(); bm.from_mesh(ring.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(ring.data); bm.free()
use(pan)
bm = bmesh.new(); bm.from_mesh(pan.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.faces.ensure_lookup_table()
far = [f for f in bm.faces if f.calc_center_median().y > 0.62]            # mặt xa nhất ở sau lưng phải quay ra sau (+y Blender)
if sum(f.normal.y for f in far) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
bm.to_mesh(pan.data); bm.free()
sub = pan.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 1
bpy.ops.object.modifier_apply(modifier='sub')
bpy.ops.object.select_all(action='DESELECT'); ring.select_set(True); pan.select_set(True); bpy.context.view_layer.objects.active = ring
bpy.ops.object.join(); obj = ring; obj.name = 'hood'; obj.data.name = 'hood'
bpy.ops.object.shade_smooth()
ntri = sum(len(p.vertices) - 2 for p in obj.data.polygons)
print('HOOD tri =', ntri)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                          export_texcoords=False, export_normals=True, export_materials='NONE', export_active_vertex_color_when_no_material=True, export_cameras=False, export_lights=False)
print('OK', out, os.path.getsize(out), 'bytes')
