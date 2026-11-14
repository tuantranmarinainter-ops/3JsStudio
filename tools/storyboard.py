"""Nhập KỊCH BẢN KHUNG HÌNH (storyboard) → tập phim mới dựng được ngay.

  python tools/storyboard.py <thư mục storyboard> <ep> [--force] [--sheet] [--title "…"]

Thư mục vào (định dạng: docs/kich-ban-vao.md, mẫu: episodes/_template/storyboard-example/):
  storyboard.md | storyboard.csv | storyboard.json     mô tả từng shot (+ thông tin tập)
  shot_001.png, shot_002.jpg …                          khung hình (tuỳ chọn; số khung = số thứ tự shot)

Ra episodes/<ep>/:
  episode.js        seed, luật/twist, diễn viên, địa điểm (khung — sửa tay tiếp)
  shots.js          1 dòng / shot theo LOẠI SHOT (engine/shottypes.js), ghi chú máy quay/hành động ở cuối dòng
  narration.txt     lời kể, mỗi câu 1 dòng `@at <giây>` = đúng lúc shot đầu tiên của câu bắt đầu (cho tools/tts.py)
  captions.js       phụ đề ƯỚC LƯỢNG (~14 ký tự/giây) — tạo lại khi có giọng thật
  sfx/cues_*.json   tiếng động theo shot (lớp khoanh-khac) + sfx/layers.json
  index.html        chép từ episodes/_template/index.html
  storyboard/       khung gốc (s001.png…), storyboard.json đã chuẩn hoá, index.html (trang xem khung theo t cho look.mjs)
--sheet: chụp bảng so sánh khung storyboard | bản dựng đầu tiên (tools/look.mjs --ab) → output/storyboard/<ep>/compare.jpg
"""
import argparse, csv, io, json, math, re, shutil, subprocess, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / 'episodes' / '_template'
CPS = 14.0          # ký tự / giây khi ước lượng lời kể (giống tts.py --dry)
GAP = 0.25          # lặng giữa 2 câu
MIN_SHOT = 0.6
SILENT_SHOT = 1.0

TYPES = ['establish', 'crowd', 'walkBy', 'follow', 'closeup', 'reaction', 'overShoulder', 'insert', 'chase', 'reveal', 'dialogue']
IMG_EXT = ('.png', '.jpg', '.jpeg', '.webp')
FACES = {'smile', 'happy', 'laugh', 'grin', 'neutral', 'sad', 'worried', 'scared', 'panic', 'surprised', 'angry', 'sleepy', 'sleep', 'cold', 'moved'}
ANIMS = {'idle', 'walk', 'run', 'jump', 'fall', 'wave', 'point', 'sit', 'scared', 'cheer', 'dance', 'lookAround', 'faint', 'cower', 'lie', 'shiver',
         'hold', 'panic', 'hug', 'sitHold', 'write', 'lookUp', 'tumble', 'tpose'}
IDENT = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')   # tên mã ASCII (không dấu) → giữ nguyên


def fold(s):
    """bỏ dấu + thường hoá để so khớp từ khoá tiếng Việt."""
    s = unicodedata.normalize('NFD', str(s or '').lower().replace('đ', 'd'))
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').strip()


# ---- tên cột (Việt/Anh) → khoá chuẩn ----
COLS = {
    'id': ['id', 'shot', 'ma', 'ma shot', 'so'], 'frame': ['frame', 'khung', 'anh', 'hinh', 'image'],
    'dur': ['dur', 'giay', 'thoi luong', 'duration', 's'], 'narration': ['narration', 'loi ke', 'loi', 'loi dan', 'thoai', 'cau'],
    'type': ['type', 'loai', 'loai shot', 'co canh', 'canh'], 'who': ['who', 'ai', 'nhan vat', 'dien vien'],
    'with': ['with', 'cung', 'voi', 'nguoi 2', 'doi dien'], 'at': ['at', 'o dau', 'dia diem', 'noi', 'where', 'boi canh'],
    'anim': ['anim', 'animation', 'dong tac'], 'action': ['action', 'hanh dong', 'dien'], 'face': ['face', 'mat', 'bieu cam'],
    'camera': ['camera', 'may', 'may quay', 'goc may', 'ghi chu may'], 'text': ['text', 'chu', 'chu noi', 'chu tren hinh', 'on-screen'],
    'sfx': ['sfx', 'am thanh', 'tieng dong', 'tieng'], 'env': ['env'], 'light': ['light', 'anh sang'], 'notes': ['notes', 'ghi chu', 'note'],
    'withAnim': ['withanim', 'dong tac 2', 'hanh dong 2'], 'withFace': ['withface', 'mat 2', 'bieu cam 2'],
    'read': ['read', 'vat can doc'], 'stance': ['stance', 'tu the'],
}
COL_OF = {a: k for k, al in COLS.items() for a in al}

TYPE_WORDS = [  # (từ khoá đã bỏ dấu, loại) — thứ tự quan trọng
    ('toan canh', 'establish'), ('establish', 'establish'), ('dam dong', 'crowd'), ('crowd', 'crowd'),
    ('di ngang', 'walkBy'), ('walkby', 'walkBy'), ('bam theo', 'follow'), ('follow', 'follow'),
    ('qua vai', 'overShoulder'), ('overshoulder', 'overShoulder'), ('can do', 'insert'), ('chi tiet', 'insert'), ('insert', 'insert'),
    ('can mat', 'closeup'), ('closeup', 'closeup'), ('phan ung', 'reaction'), ('reaction', 'reaction'),
    ('ruot', 'chase'), ('duoi', 'chase'), ('chase', 'chase'), ('lo dien', 'reveal'), ('twist', 'reveal'), ('reveal', 'reveal'),
    ('doi thoai', 'dialogue'), ('thoai', 'dialogue'), ('dialogue', 'dialogue'), ('trung canh', 'reaction'), ('can', 'closeup'),
]
ANIM_WORDS = [
    ('nhay mua', 'dance'), ('mua', 'dance'), ('nhay', 'jump'), ('chay', 'run'), ('di bo', 'walk'), ('di ', 'walk'), ('buoc', 'walk'),
    ('vay', 'wave'), ('chao', 'wave'), ('chi tay', 'point'), ('chi ', 'point'), ('ngoi', 'sit'), ('so hai', 'scared'), ('so ', 'scared'),
    ('co vu', 'cheer'), ('reo', 'cheer'), ('nhin quanh', 'lookAround'), ('ngo nghieng', 'lookAround'), ('nga', 'fall'), ('ngat', 'faint'),
    ('nup', 'cower'), ('co ro', 'cower'), ('run ', 'shiver'), ('hoang', 'panic'), ('om', 'hug'), ('viet', 'write'), ('nhin len', 'lookUp'),
    ('nam', 'lie'), ('cam', 'hold'), ('dung', 'idle'),
]
FACE_WORDS = [('ngac nhien', 'surprised'), ('bat ngo', 'surprised'), ('so', 'scared'), ('hoang', 'panic'), ('buon', 'sad'), ('khoc', 'sad'),
              ('lo', 'worried'), ('gian', 'angry'), ('tuc', 'angry'), ('cuoi lon', 'laugh'), ('vui', 'happy'), ('cuoi', 'smile'),
              ('binh thuong', 'neutral'), ('ngai', 'neutral')]
PLACE_WORDS = [('quang truong', 'square'), ('nha toi', 'home'), ('nha', 'home'), ('san', 'yard'), ('cua hang', 'shop'), ('tiem', 'shop'),
               ('pho', 'street'), ('duong', 'street'), ('nga tu', 'crossroad'), ('cong vien', 'park'), ('giua', 'center')]
TOWN_PLACES = {'square', 'home', 'yard', 'shop', 'street', 'crossroad', 'park', 'center'}
ENVS_CU = {'town', 'forest', 'hawaii', 'brazil', 'sahara', 'antarctica', 'ocean', 'mountain', 'snowNight', 'iceSea', 'storm', 'shipStorm',
           'island', 'reef', 'kitchen', 'bedroom', 'kenneyTown'}


def envs_tren_dia():
    """mọi engine/envs/<tên>.js có `export default` (= bộ dựng env; bỏ tệp phụ tang.js, gio-thoi-tiet.js, goc-mau.js…)."""
    d = ROOT / 'engine' / 'envs'
    if not d.is_dir(): return set()
    return {f.stem for f in d.glob('*.js') if re.search(r'^export default\b', f.read_text(encoding='utf-8', errors='ignore'), re.M)}


# tên env = danh sách cũ + file env có trên đĩa (env mới chỉ cần thả file engine/envs/<tên>.js). Tên vừa là `place` vừa là env → env thắng.
ENVS = ENVS_CU | envs_tren_dia()


def them_env(names):
    """thêm tên env (cờ --env a,b: env sắp có mà file chưa dựng)."""
    ENVS.update(n for n in names if n)


# vị trí đứng của diễn viên bên trong env riêng (place '<env>_in', toạ độ của env, env dựng tại gốc). Không có → [0,0,0].
ENV_CHO_DUNG = {'bedroom': ([4, 0, 3], 0), 'kitchen': ([0, 0, 4], 0), 'factory': ([0, 0, 3], 0)}

# ---- đạo cụ theo kịch bản (engine/props-kb.js) ----
# cụm từ (đã bỏ dấu) → tên gốc ascii. Tên gốc khớp tên đạo cụ đã có trong tập theo tiền tố (nhan → nhan_moi; ket → ket_ga/ket_tien,
# ưu tiên cùng nơi). Thêm/ghi đè cho từng tập bằng dòng đầu kịch bản `vat <tên_ascii>: <tên Việt>[, <tên Việt 2>]`.
VAT_ALIAS = [
    ('bang tin', 'bang_tin'), ('ban do', 'ban_do'), ('dong ho', 'dong_ho'), ('day chuyen', 'day_chuyen'), ('tui tien', 'tui_tien'),
    ('ket tien', 'ket_tien'), ('ket', 'ket'), ('nhan', 'nhan'), ('vi', 'vi'), ('doi dep', 'doi_dep'), ('dep', 'doi_dep'),
    ('cuon sach', 'cuon_sach'), ('sach', 'cuon_sach'), ('guong', 'guong'), ('chuong', 'chuong'), ('bang chuyen', 'bang_chuyen'),
    ('hop nhan', 'hop_nhan'), ('o khoa', 'o_khoa'), ('anh ba', 'anh_ba'), ('buu thiep', 'postcard'), ('tam thiep', 'postcard'),
    ('hang rao', 'hang_rao'), ('thung go', 'thung_go'), ('ke', 'ke'),
]
KHONG_CAM = {'ke', 'guong', 'bang_chuyen', 'ban_do', 'bang_tin', 'hang_rao', 'o_khoa'}   # đồ cố định: không gắn vào tay
HANH_DONG_CAM = {'hold', 'hug', 'drag', 'putDown', 'sitHold'}
OBJ_RE = re.compile(r'obj:([A-Za-z_]\w*)')


def obj_of(notes):
    m = OBJ_RE.search(str(notes or ''))
    return m.group(1) if m else None


def _alias_bang(meta):
    """[(cụm bỏ dấu, tên)] — dòng `vat` của kịch bản trước, cụm dài trước."""
    bang = [(fold(a), k) for k, al in (meta.get('vat') or {}).items() for a in al] + VAT_ALIAS
    return sorted(bang, key=lambda x: -len(x[0]))


def _khop_ten(base, known, loc_of=None, loc=None, header=False):
    """tên gốc → tên đạo cụ đã có (bằng nhau hoặc tiền tố base_), ưu tiên cùng nơi; không có thì chính base."""
    if header or base in known: return base
    cands = [k for k in known if k.startswith(base + '_')]
    if loc_of and loc is not None:
        same = [k for k in cands if loc_of.get(k) == loc]
        if same: return same[0]
    return cands[0] if cands else base


def tim_vat(text, meta, known, loc_of=None, loc=None, bo_qua=(), chi_cam=False):
    """mọi vật nêu trong câu (theo thứ tự xuất hiện) → [tên]."""
    t = ' ' + re.sub(r'[^a-z0-9]+', ' ', fold(text)) + ' '
    hits, used = [], [False] * len(t)
    hdr = {k for k in (meta.get('vat') or {})}
    for w, base in _alias_bang(meta):
        for m in re.finditer(r'(?<= )' + re.escape(w) + r'(?= )', t):
            if any(used[m.start():m.end()]): continue
            for i in range(m.start(), m.end()): used[i] = True
            if chi_cam and base in KHONG_CAM: continue
            ten = _khop_ten(base, known, loc_of, loc, header=base in hdr)
            if ten not in bo_qua: hits.append((m.start(), ten))
    return [n for _, n in sorted(hits)]


def vat_id(text, meta, known, loc_of=None, loc=None):
    """`vật cần đọc` (tiếng Việt) → tên ascii: tên mã giữ nguyên; dòng `vat` / alias dựng sẵn; không thì slug 3 chữ đầu."""
    s = str(text or '').strip()
    if IDENT.fullmatch(s): return s
    f = fold(s)
    for k, al in (meta.get('vat') or {}).items():
        if any(fold(a) == f for a in al): return k
    v = tim_vat(s, meta, known, loc_of, loc)
    if v: return v[0]
    return '_'.join(re.sub(r'[^a-z0-9]+', ' ', f).split()[:3])
WHO_WORDS = [('ba noi', 'grandma'), ('ba ngoai', 'grandma'), ('toi', 'hero'), ('be', 'hero'), ('me', 'mom'), ('ba', 'dad'), ('bo', 'dad'),
             ('dan', 'crowd1')]
MOVE_WORDS = [('day vao', 'push'), ('dolly in', 'push'), ('push', 'push'), ('zoom in', 'push'), ('keo ra', 'pull'), ('lui ra', 'pull'),
              ('pull', 'pull'), ('zoom out', 'pull'), ('xoay quanh', 'orbit'), ('orbit', 'orbit'), ('lia', 'pan'), ('pan', 'pan'),
              ('cau len', 'crane'), ('nang len', 'crane'), ('crane', 'crane'), ('ha xuong', 'drop'), ('rung', 'shake'), ('shake', 'shake'),
              ('dung yen', 'static'), ('co dinh', 'static'), ('static', 'static')]


def match(words, text, exact=None):
    t = ' ' + fold(text) + ' '
    if exact and text in exact: return text
    for w, v in words:
        if (' ' + w) in t or t.strip() == w.strip(): return v
    return None


# ---------- đọc mô tả ----------
def parse_table_md(lines):
    rows, head = [], None
    for ln in lines:
        s = ln.strip()
        if not s.startswith('|'): continue
        cells = [c.strip() for c in s.strip('|').split('|')]
        if all(re.fullmatch(r':?-{2,}:?', c) or c == '' for c in cells): continue
        if head is None: head = cells; continue
        rows.append(dict(zip(head, cells + [''] * (len(head) - len(cells)))))
    return rows


def parse_meta_lines(lines):
    """`khoá: giá trị` trước bảng. actor <tên>: k=v k=v …   crowd: 8   places.<tên>: x,z[,ry]"""
    meta, actors, places = {}, {}, {}
    for ln in lines:
        s = ln.strip()
        if s.startswith('|'): break
        m = re.match(r'^[-*]?\s*([\w.\- ]+?)\s*:\s*(.+)$', s)
        if not m or s.startswith('#'): continue
        k, v = m.group(1).strip(), m.group(2).strip()
        fk = fold(k)
        if fk.startswith('actor ') or fk.startswith('nhan vat '):
            name = k.split(None, 1)[1].strip()
            actors[name] = {kk: _num(vv) for kk, vv in re.findall(r'(\w+)=([^\s,]+)', v)}
        elif fk in ('crowd', 'dam dong', 'dan'): actors['crowd'] = {'count': int(re.findall(r'\d+', v)[0])}
        elif fk.startswith('vat '):     # vat <tên_ascii>: <tên Việt>[, <tên Việt 2>]   (bảng ánh xạ "vật cần đọc"/vật cầm → đạo cụ)
            meta.setdefault('vat', {})[k.split(None, 1)[1].strip()] = [x.strip() for x in v.split(',') if x.strip()]
        elif fk.startswith('nhom '):    # nhom <tên>: a, b, c   (cột "ai" = <tên> → who a, with [b, c])
            meta.setdefault('nhom', {})[k.split(None, 1)[1].strip()] = [x.strip() for x in v.split(',') if x.strip()]
        elif fk.startswith('place ') or fk.startswith('dia diem '):
            nums = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', v)]
            if nums: places[k.split(None, 1)[1].strip()] = {'pos': [nums[0], 0, nums[1] if len(nums) > 1 else 0], 'ry': nums[2] if len(nums) > 2 else 0}
            else: places[k.split(None, 1)[1].strip()] = v
        else: meta[k] = _num(v)
    if actors: meta['actors'] = actors
    if places: meta['places'] = places
    return meta


def _num(v):
    if v in ('true', 'false'): return v == 'true'
    try: return int(v)
    except (ValueError, TypeError): pass
    try: return float(v)
    except (ValueError, TypeError): return v


def read_board(src: Path):
    for name in ('storyboard.json', 'storyboard.md', 'storyboard.csv', 'kich-ban.md', 'kich-ban.csv', 'kich-ban.json'):
        f = src / name
        if f.exists(): break
    else:
        cands = sorted([*src.glob('*.json'), *src.glob('*.md'), *src.glob('*.csv')])
        if not cands: sys.exit(f'Không thấy file mô tả (storyboard.md/.csv/.json) trong {src}')
        f = cands[0]
    text = f.read_text(encoding='utf-8-sig')
    if f.suffix == '.json':
        j = json.loads(text)
        meta, rows = (j.get('episode', {}), j['shots']) if isinstance(j, dict) else ({}, j)
    elif f.suffix == '.csv':
        rows = list(csv.DictReader(io.StringIO(text)))
        meta = json.loads((src / 'episode.json').read_text(encoding='utf-8')) if (src / 'episode.json').exists() else {}
    else:
        lines = text.splitlines()
        meta, rows = parse_meta_lines(lines), parse_table_md(lines)
    norm = []
    for r in rows:
        o = {}
        for k, v in r.items():
            key = COL_OF.get(fold(k), k if k in COLS else None)
            if key and v not in (None, ''): o[key] = v if not isinstance(v, str) else v.strip()
        if o: norm.append(o)
    return f, meta, norm


# ---------- dựng shot ----------
def nhom_of(meta):
    """nhóm diễn viên: dòng `nhom` của kịch bản + mặc định `bears` = mọi actor bear=1 theo thứ tự khai."""
    g = dict(meta.get('nhom') or {})
    gau = [n for n, o in (meta.get('actors') or {}).items() if isinstance(o, dict) and o.get('bear')]
    if gau and 'bears' not in g: g['bears'] = gau
    return g


def town_env(meta):
    return meta.get('env', 'kenneyTown')


def build(meta, rows, src: Path):
    shots, lines, warn = [], [], []
    cur_line = 0
    groups = nhom_of(meta)
    TOWN = town_env(meta)
    cur_env = TOWN
    for i, r in enumerate(rows):
        sid = str(r.get('id') or i + 1)
        sid = f's{int(sid):03d}' if sid.isdigit() else (sid if sid.startswith('s') else 's' + sid)
        s = {'id': sid}
        # lời kể: chữ mới = câu mới; "^" / "〃" / '"' = cùng câu shot trước; trống = không lời
        nar = str(r.get('narration', '')).strip()
        if nar in ('^', '〃', '"', '""', '…cont', '+'):
            if cur_line: s['line'] = cur_line
        elif nar:
            lines.append({'text': nar, 'shots': []}); cur_line = len(lines); s['line'] = cur_line
        else: cur_line = 0
        if s.get('line'): lines[s['line'] - 1]['shots'].append(len(shots))
        # loại shot
        ty = r.get('type')
        t2 = ty if ty in TYPES else match(TYPE_WORDS, ty or '') if ty else None
        if not t2: t2 = match(TYPE_WORDS, r.get('camera', '')) or ('establish' if i == 0 else 'reaction' if r.get('who') else 'establish')
        if ty and ty not in TYPES and not match(TYPE_WORDS, ty): warn.append(f'{sid}: loại "{ty}" không rõ → {t2}')
        s['type'] = t2
        # ai / với ai
        for key in ('who', 'with'):
            v = r.get(key)
            if v:
                names = [x.strip() if IDENT.fullmatch(x.strip()) else (match(WHO_WORDS, x) or re.sub(r'\W+', '_', fold(x)).strip('_'))
                         for x in re.split(r'[,+&]| và ', v) if x.strip()]
                s[key] = names[0] if len(names) == 1 else names
        # nhóm (bears) → who = con đầu, with = các con còn lại (+ with cũ), group = tên nhóm
        if isinstance(s.get('who'), str) and s['who'] in groups:
            mem = groups[s['who']]
            s['group'] = s['who']; s['who'] = mem[0]
            old = s.get('with'); old = old if isinstance(old, list) else [old] if old else []
            s['with'] = [m for m in mem[1:] if m not in old] + old
        # địa điểm / bối cảnh: env riêng → env + place '<env>_in' (chỗ đứng trong env); địa điểm thị trấn sau env riêng → ghi lại env thị trấn
        at = r.get('at')
        if at:
            if at in ENVS and at != TOWN:
                s['env'] = at; s['at'] = f'{at}_in'
            else:
                s['at'] = at if IDENT.fullmatch(at) else (match(PLACE_WORDS, at) or re.sub(r'\W+', '_', fold(at)).strip('_'))
                if cur_env != TOWN: s['env'] = TOWN
        if r.get('env'): s['env'] = r['env']
        cur_env = s.get('env', cur_env)
        if r.get('stance'): s['stance'] = r['stance']
        if r.get('read'): s['_read'] = r['read']
        if r.get('light'): s['light'] = r['light']
        # động tác + biểu cảm
        anim = r.get('anim') if r.get('anim') in ANIMS else (match(ANIM_WORDS, r.get('anim') or r.get('action', '')) if (r.get('anim') or r.get('action')) else None)
        if anim: s['anim'] = anim
        face = r.get('face')
        if face: s['face'] = face if face in FACES else (match(FACE_WORDS, face) or 'neutral')
        for k2 in ('withAnim', 'withFace'):
            if r.get(k2): s[k2] = r[k2] if r[k2] in (ANIMS | FACES) else (match(ANIM_WORDS if k2 == 'withAnim' else FACE_WORDS, r[k2]) or 'idle')
        # máy quay: từ khoá chuyển động + phía
        cam = r.get('camera', '')
        mv = match(MOVE_WORDS, cam) if cam else None
        if mv: s['move'] = mv
        if cam and re.search(r'\b(trai|left)\b', fold(cam)): s['side'] = 'left'
        if r.get('text'): s['text'] = r['text']
        if r.get('dur'):
            try: s['dur'] = round(float(str(r['dur']).replace(',', '.').rstrip('s')), 3)
            except ValueError: warn.append(f'{sid}: dur "{r["dur"]}" không phải số')
        s['_note'] = '; '.join(x for x in [f"máy: {cam}" if cam else '', f"diễn: {r['action']}" if r.get('action') else '', r.get('notes', '')] if x)
        s['_sfx'] = r.get('sfx', '')
        s['_frame'] = r.get('frame', '')
        o = obj_of(r.get('notes'))
        if o: s['obj'] = o
        s['_notes'] = r.get('notes', '')
        s['_action'] = str(r.get('anim') or r.get('action') or '')
        shots.append(s)

    # ---- thời lượng: câu kể ước lượng CPS; shot cùng câu chia phần còn lại ----
    for L in lines:
        speech = max(1.0, len(re.sub(r'^\[\w+\]\s*', '', L['text'])) / CPS)
        L['speech'] = speech
        idx = L['shots']
        fixed = sum(shots[j]['dur'] for j in idx if 'dur' in shots[j])
        free = [j for j in idx if 'dur' not in shots[j]]
        if free:
            each = max(MIN_SHOT, (speech + GAP - fixed) / len(free))
            for j in free: shots[j]['dur'] = round(each, 3)
    for s in shots:
        s.setdefault('dur', SILENT_SHOT)
    t = 0.0
    for s in shots:
        s['_t0'] = round(t, 3); t += s['dur']
    total = round(t, 3)
    for L in lines:
        L['at'] = shots[L['shots'][0]]['_t0'] + 0.05
    # câu dài hơn khoảng shot của nó → cảnh báo (giọng sẽ tràn sang câu sau)
    for k, L in enumerate(lines):
        end = shots[L['shots'][-1]]['_t0'] + shots[L['shots'][-1]]['dur']
        if L['at'] + L['speech'] > end + 0.6: warn.append(f"câu {k + 1} dài ~{L['speech']:.1f}s nhưng shot chỉ {end - L['at']:.1f}s — tăng dur")
    return shots, lines, total, warn


def loc_cua(shots, meta):
    """nơi của từng shot (nối tiếp như expandShot): env riêng → tên env; thị trấn → tên địa điểm."""
    TOWN, env, at, out = town_env(meta), town_env(meta), None, []
    for s in shots:
        env = s.get('env', env); at = s.get('at', at)
        out.append(env if env != TOWN else at)
    return out


def ke_dao_cu(shots, meta, lines):
    """đạo cụ của tập → (props {tên: {kit, at, on?, hold?}}, cảnh báo). Ghi thêm vào shot: read (tên ascii), cast.<ai>.hold.
    Thứ tự props = lần dùng đầu; `at` = nơi của lần dùng đầu (obj/read; vật chỉ được cầm: nơi lần cầm đầu, hold: True)."""
    locs, warn, props = loc_cua(shots, meta), [], {}
    loc_of = {}
    for s, L in zip(shots, locs):
        if s.get('obj'): loc_of.setdefault(s['obj'], L)
    known = set(loc_of) | set(meta.get('vat') or {})
    hdr = set(meta.get('vat') or {})

    def them(name, L, **kw):
        if name not in props: props[name] = {'kit': name, 'at': L, **kw}; loc_of.setdefault(name, L)
        elif props[name].get('hold') and not kw.get('hold'): props[name].pop('hold', None); props[name]['at'] = L

    for s, L in zip(shots, locs):
        if s.get('obj'):
            them(s['obj'], L)
            m = re.search(r'\btren\s+(.+)$', fold(s.get('_notes', '').split('obj:' + s['obj'], 1)[-1]))
            if m:
                hit = tim_vat(m.group(1), meta, set())
                if hit:
                    base = hit[0]
                    same = [k for k in known if (k == base or k.startswith(base + '_')) and loc_of.get(k) == L and k != s['obj']]
                    props[s['obj']].setdefault('on', base if base in hdr else (same[0] if same else base))
        if s.get('_read'):
            s['read'] = vat_id(s['_read'], meta, known, loc_of, L)
            them(s['read'], L)
        who = s.get('who')
        if isinstance(who, str) and (s.get('anim') in HANH_DONG_CAM or s.get('_action') in HANH_DONG_CAM):
            text = s.get('_notes', '') + ' . ' + (re.sub(r'^\[\w+\]\s*', '', lines[s['line'] - 1]['text']) if s.get('line') else '')
            hit = tim_vat(text, meta, known, loc_of, L, chi_cam=True)
            if hit:
                s['cast'] = {**(s.get('cast') or {}), who: {**((s.get('cast') or {}).get(who) or {}), 'hold': hit[0]}}
                them(hit[0], L, hold=True); known.add(hit[0])
    for s in shots:
        if s.get('type') == 'insert' and not s.get('obj') and not s.get('who') and not s.get('read'):
            warn.append(f"{s['id']}: insert không có obj:<tên> trong ghi chú, không có ai — camera nhắm điểm giữa địa điểm")
    return props, warn


def js(v):
    return json.dumps(v, ensure_ascii=False)


def js_obj(d, order=None):
    keys = [k for k in (order or []) if k in d] + [k for k in d if k not in (order or [])]
    return '{ ' + ', '.join(f"{k}: {js(d[k])}" for k in keys if not k.startswith('_')) + ' }'


SHOT_ORDER = ['id', 'dur', 'type', 'who', 'with', 'group', 'at', 'env', 'light', 'anim', 'face', 'withAnim', 'withFace', 'stance', 'move', 'side',
              'obj', 'read', 'cast', 'text', 'line']


def write_episode(ep, meta, shots, lines, total, src, board_file, frames, force, out=None, props=None, ghi_narration=False):
    out = Path(out) if out else ROOT / 'episodes' / ep
    if out.exists() and any(out.iterdir()) and not force:
        sys.exit(f'{out} đã có — thêm --force để ghi đè (file khác trong thư mục được giữ nguyên)')
    (out / 'sfx').mkdir(parents=True, exist_ok=True)
    (out / 'storyboard').mkdir(exist_ok=True)

    # địa điểm dùng trong shot mà thị trấn không có → thêm khung vào places; env riêng → place '<env>_in' (chỗ đứng trong env)
    places = dict(meta.get('places', {}))
    for s in shots:
        a = s.get('at')
        if isinstance(a, str) and a.endswith('_in') and a[:-3] in ENVS and a not in places:
            pos, ry = ENV_CHO_DUNG.get(a[:-3], ([0, 0, 0], 0))
            places[a] = {'pos': pos, 'ry': ry}
        elif isinstance(a, str) and a not in TOWN_PLACES and a not in places and not re.fullmatch(r'house\d+', a):
            places[a] = 'town:center'
    actors = meta.get('actors') or {}
    who_all = set()
    for s in shots:
        for k in ('who', 'with'):
            v = s.get(k); who_all.update(v if isinstance(v, list) else [v] if v else [])
    actors.setdefault('hero', {'shirt': '#e74c3c', 'sleeves': '#e74c3c', 'pants': '#2c3e50', 'face': 'smile'})
    palette = ['#8e44ad', '#2d6cdf', '#27ae60', '#e67e22', '#16a085']
    for i, w in enumerate(sorted(who_all)):
        if w not in actors and not re.fullmatch(r'crowd\d+', w): actors[w] = {'shirt': palette[i % len(palette)], 'face': 'smile'}
    need_crowd = max([int(m.group(1)) for s in shots for w in [s.get('who'), s.get('with')] for x in (w if isinstance(w, list) else [w])
                      if isinstance(x, str) for m in [re.fullmatch(r'crowd(\d+)', x)] if m] + [0])
    if any(s['type'] == 'crowd' for s in shots): need_crowd = max(need_crowd, 8)
    if need_crowd and 'crowd' not in actors: actors['crowd'] = {'count': need_crowd}

    title = meta.get('title', ep)
    E = {
        'id': ep, 'title': title, 'fps': 30, 'seed': int(meta.get('seed', 7)),
        'rule': meta.get('rule', meta.get('luat', '')), 'weakness': meta.get('weakness', meta.get('diem yeu', '')),
        'twist': meta.get('twist', ''), 'solution': meta.get('solution', meta.get('loi giai', '')),
        'env': meta.get('env', 'kenneyTown'), 'light': meta.get('light', 'day'), 'town': meta.get('town', {'blocks': 3}),
        'actors': actors, 'places': places, 'props': props or {},
        'facePack': meta.get('facePack', 'altiwyre'),   # bộ mặt nhân vật R6 (engine/face-pack.js): tập mới mặc định AltiWyre
    }
    body = ',\n'.join(f'  {k}: {js(v)}' for k, v in E.items())
    (out / 'episode.js').write_text(
        f"// {ep} — {title}. Sinh bởi tools/storyboard.py từ {board_file.name} (sửa tay tiếp: diễn viên, địa điểm 'town:center' = chưa đặt).\n"
        f"// Địa điểm thị trấn có sẵn: square, home, yard, shop, street, crossroad, park, center, house1… (engine/town.js); '<env>_in' = chỗ đứng trong env riêng.\n"
        f"// props: {{ <tên>: {{ kit: <khoá PROPS_KB (engine/props-kb.js) | hàm propKit>, at: <địa điểm | env>, on?: <đạo cụ đỡ>, hold?: chỉ được cầm,\n"
        f"//          pos?: [x,y,z], ry? }} }} — không ghi pos: engine/props-kb.js datDaoCu() đặt theo quy tắc (docs/kich-ban-vao.md).\n"
        f"export const EPISODE = {{\n{body},\n}};\n", encoding='utf-8')

    # shots.js
    rows = []
    for s in shots:
        note = s['_note'].replace('\n', ' ')
        rows.append(f"  {js_obj(s, SHOT_ORDER)},{('  // ' + note) if note else ''}")
    (out / 'shots.js').write_text(
        f"// {ep} — {len(shots)} shot, {total:.2f} s. Sinh bởi tools/storyboard.py; mỗi dòng 1 shot theo LOẠI (engine/shottypes.js).\n"
        "// Ghi đè camera/diễn viên khi cần: thêm cam: { dist: 8, yaw: 0.4 } hoặc cast: { hero: { anim: 'wave' } } vào dòng.\n"
        "export const SHOTS = [\n" + '\n'.join(rows) + '\n];\n', encoding='utf-8')

    # narration.txt (@at = lúc shot đầu của câu bắt đầu)
    nl = [f'# {title} — lời kể từ storyboard ({board_file.name}). @at = giây shot đầu tiên của câu bắt đầu (tools/tts.py canh đúng mốc).',
          f"@source {meta.get('voice_source', 'capcut')}", f"@narrator {meta.get('narrator', 'BV075_streaming')}"]
    roles = sorted({m.group(1) for L in lines for m in [re.match(r'^\[(\w+)\]', L['text'])] if m})
    for r in roles:
        if r not in ('me', 'mom'): nl.append(f'# TODO: chọn giọng cho vai {r}')   # chú thích dòng riêng (không đặt sau lệnh @voice)
        nl.append(f'@voice {r} multi_female_yangguangnv_uranus_bigtts')
    nl.append('')
    for L in lines: nl.append(f"@at {L['at']:.2f} {L['text']}")
    nf = out / 'narration.txt'
    if nf.exists() and not ghi_narration:   # đã có (có thể đã chỉnh giọng vai tay) → giữ; tools/shot-gen.mjs chỉ cập nhật mốc @at
        n_cu = sum(1 for l in nf.read_text(encoding='utf-8').splitlines() if l.startswith('@at '))
        print(f'  · giữ narration.txt đã có ({n_cu} câu @at; kịch bản {len(lines)} câu) — ghi lại: --ghi-narration')
        if n_cu != len(lines): print(f'  ! narration.txt có {n_cu} câu nhưng kịch bản {len(lines)} câu — kiểm lại hoặc chạy --ghi-narration')
    else:
        nf.write_text('\n'.join(nl) + '\n', encoding='utf-8')

    # captions.js ước lượng: cụm ~3 chữ chia theo độ dài
    caps = []
    for L in lines:
        txt = re.sub(r'^\[\w+\]\s*', '', L['text']); words = txt.split()
        chunks = [' '.join(words[i:i + 3]) for i in range(0, len(words), 3)] or ['']
        tot = sum(len(c) for c in chunks) or 1; t = L['at']
        for c in chunks:
            d = L['speech'] * len(c) / tot; caps.append([round(t, 3), round(t + d, 3), c]); t += d
    (out / 'captions.js').write_text('// Phụ đề ƯỚC LƯỢNG từ storyboard (~14 ký tự/giây). Có giọng thật → tạo lại theo narration.json.\n'
                                     'export const CAPTIONS = ' + js(caps) + ';\n', encoding='utf-8')

    # sfx: "tên tiếng Anh@giây_trong_shot*âm_lượng" cách nhau ';'
    cues = []
    for s in shots:
        for part in [p.strip() for p in re.split(r'[;\n]', s['_sfx']) if p.strip()]:
            m = re.match(r'^(.*?)(?:@\s*([\d.]+))?(?:\s*\*\s*([\d.]+))?$', part)
            name, off, vol = m.group(1).strip(), float(m.group(2) or 0), float(m.group(3) or 0.4)
            cues.append({'t': round(s['_t0'] + off, 3), 'name': name, 'vol': vol, 'dur': 1.5, 'shot': s['id'], 'why': 'storyboard'})
    if cues:
        (out / 'sfx' / f"cues_{shots[0]['id']}-{shots[-1]['id']}.json").write_text(json.dumps(cues, ensure_ascii=False, indent=1), encoding='utf-8')
    lj = out / 'sfx' / 'layers.json'
    if not lj.exists() or force: shutil.copy(TEMPLATE / 'sfx' / 'layers.json', lj)

    # index.html từ mẫu
    html = (TEMPLATE / 'index.html').read_text(encoding='utf-8')
    html = html.replace('/episodes/_template/', f'/episodes/{ep}/')
    html = re.sub(r'data-duration="[\d.]+"', f'data-duration="{total:.3f}"', html)
    html = re.sub(r'<title>.*?</title>', f'<title>{ep}</title>', html)
    html = html.replace('episodes/_template/index.html', f'episodes/{ep}/index.html').replace('output/_template.mp4', f'output/{ep}.mp4')
    html = re.sub(r'<!-- TẬP MẪU.*?-->', f'<!-- {ep} — {title}. Sinh từ episodes/_template/index.html bởi tools/storyboard.py.\n     Xem: node tools/look.mjs episodes/{ep}/index.html --shots all -->', html, count=1, flags=re.S)
    (out / 'index.html').write_text(html, encoding='utf-8')

    # storyboard/: khung gốc + trang xem theo t
    sb = out / 'storyboard'
    lst = []
    for k, s in enumerate(shots):
        f = frames.get(k)
        img = None
        if f:
            img = f"{s['id']}{f.suffix.lower()}"; shutil.copy(f, sb / img)
        lst.append({'id': s['id'], 't0': s['_t0'], 't1': round(s['_t0'] + s['dur'], 3), 'img': img, 'type': s['type'], 'note': s['_note'],
                    'text': s.get('text', ''), 'line': lines[s['line'] - 1]['text'] if s.get('line') else ''})
    (sb / 'storyboard.json').write_text(json.dumps({'episode': E, 'shots': lst, 'source': board_file.name}, ensure_ascii=False, indent=1), encoding='utf-8')
    (sb / 'index.html').write_text(VIEWER.replace('__DATA__', json.dumps(lst, ensure_ascii=False)).replace('__TOTAL__', f'{total:.3f}'), encoding='utf-8')
    return out


VIEWER = """<!doctype html>
<!-- Trang xem storyboard theo thời gian (sinh bởi tools/storyboard.py) — cùng giao ước với index.html của tập
     (window.renderAt, __shots, __ready) để so khung: node tools/look.mjs <tập>/storyboard/index.html --ab <tập>/index.html --shots all -->
<html lang="vi"><head><meta charset="UTF-8"><title>storyboard</title>
<style>
  @font-face { font-family: 'Be Vietnam Pro'; font-weight: 900; src: url('/assets/fonts/BeVietnamPro-Black.ttf') format('truetype'); }
  * { margin: 0; padding: 0; box-sizing: border-box; } html, body { width: 1080px; height: 1920px; overflow: hidden; background: #1a1a1f; }
  #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; }
  #img { position: absolute; left: 0; top: 0; width: 1080px; height: 1560px; object-fit: contain; background: #000; }
  #none { position: absolute; left: 0; top: 0; width: 1080px; height: 1560px; display: flex; align-items: center; justify-content: center; color: #777; font: 900 70px 'Be Vietnam Pro', sans-serif; }
  #info { position: absolute; left: 30px; right: 30px; top: 1590px; color: #eee; font: 38px/1.3 sans-serif; }
  #info b { color: #ffd34d; font: 900 48px 'Be Vietnam Pro', sans-serif; }
</style></head><body>
<div id="root"><img id="img" alt=""><div id="none">(không có khung)</div><div id="info"></div></div>
<script>
  const SHOTS = __DATA__, TOTAL = __TOTAL__;
  const img = document.getElementById('img'), none = document.getElementById('none'), info = document.getElementById('info');
  const esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  window.__shots = { list: SHOTS, total: TOTAL };
  window.renderAt = async (t) => {
    const s = SHOTS.find((x) => t >= x.t0 && t < x.t1) || SHOTS[SHOTS.length - 1];
    if (s.img) { const u = new URL(s.img, location.href).href; if (img.src !== u) { img.src = u; } await img.decode().catch(() => {}); img.style.display = ''; none.style.display = 'none'; }
    else { img.style.display = 'none'; none.style.display = 'flex'; }
    info.innerHTML = `<b>${esc(s.id)} · ${esc(s.type)}</b><br>${esc(s.line)}${s.text ? '<br>Chữ: ' + esc(s.text) : ''}${s.note ? '<br><i>' + esc(s.note) + '</i>' : ''}`;
  };
  document.fonts.load("900 48px 'Be Vietnam Pro'").finally(() => window.renderAt(0).then(() => { window.__ready = true; }));
</script></body></html>
"""


def find_frames(src: Path, n):
    files = sorted([p for p in src.iterdir() if p.suffix.lower() in IMG_EXT])
    out = {}
    for p in files:
        m = re.search(r'(\d+)', p.stem)
        if m and 1 <= int(m.group(1)) <= n: out[int(m.group(1)) - 1] = p
    return out


def main():
    ap = argparse.ArgumentParser(description='Nhập storyboard → episodes/<ep>/ (xem docs/kich-ban-vao.md)')
    ap.add_argument('src'); ap.add_argument('ep')
    ap.add_argument('--force', action='store_true', help='ghi đè tập đã có')
    ap.add_argument('--sheet', action='store_true', help='chụp bảng so khung storyboard | bản dựng (look.mjs)')
    ap.add_argument('--title')
    ap.add_argument('--out', help='thư mục ra thay cho episodes/<ep> (chạy khô / thử)')
    ap.add_argument('--env', default='', help='tên env thêm, cách bằng dấu phẩy (env sắp dựng mà engine/envs/<tên>.js chưa có)')
    ap.add_argument('--ghi-narration', action='store_true', help='ghi đè narration.txt đã có (mặc định giữ: có thể đã chỉnh giọng vai tay)')
    a = ap.parse_args()
    them_env(a.env.split(','))
    src = Path(a.src).resolve()
    if not src.is_dir(): sys.exit(f'Không thấy thư mục {src}')
    if not re.fullmatch(r'[\w\-]+', a.ep): sys.exit('Tên tập chỉ gồm chữ/số/_/-  (vd ep002)')
    board, meta, rows = read_board(src)
    if a.title: meta['title'] = a.title
    if not rows: sys.exit(f'{board.name}: không đọc được shot nào (xem docs/kich-ban-vao.md)')
    shots, lines, total, warn = build(meta, rows, src)
    props, w2 = ke_dao_cu(shots, meta, lines)
    warn += w2
    # khung: cột frame ghi tên file, không thì shot_<số thứ tự>.png
    frames = find_frames(src, len(shots))
    for k, s in enumerate(shots):
        if s['_frame'] and (src / s['_frame']).exists(): frames[k] = src / s['_frame']
    out = write_episode(a.ep, meta, shots, lines, total, src, board, frames, a.force, out=a.out and Path(a.out).resolve(), props=props,
                        ghi_narration=a.ghi_narration)
    try: shown = out.relative_to(ROOT)
    except ValueError: shown = out
    print(f'✓ {shown}: {len(shots)} shot, {len(lines)} câu kể, {total:.2f} s, {len(frames)} khung storyboard, {len(props)} đạo cụ')
    for w in warn: print('  ! ' + w)
    print(f'  Xem:  node tools/look.mjs episodes/{a.ep}/index.html --shots all')
    if a.sheet:
        sheet = ROOT / 'output' / 'storyboard' / a.ep / 'compare.jpg'
        cmd = ['node', 'tools/look.mjs', f'episodes/{a.ep}/storyboard/index.html', '--ab', f'episodes/{a.ep}/index.html', '--shots', 'all',
               '--out', str(sheet.parent), '--sheet', str(sheet), '--cols', '6', '--tile', '240']
        print('▶ ' + ' '.join(cmd))
        r = subprocess.run(cmd, cwd=ROOT)
        if r.returncode == 0: print(f'✓ Bảng so khung (trái storyboard | phải bản dựng): {sheet}')
        else: sys.exit(r.returncode)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
