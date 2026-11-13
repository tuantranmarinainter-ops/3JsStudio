# python tools/thong-ke-token.py  — cộng token và thời gian làm việc của Claude Code theo TẬP (ep001…ep004) từ nhật ký phiên
# (~/.claude/projects/S--3JS-Studio/*.jsonl + subagents). Ghi output/artifact/token/du-lieu.json.
# Cách gán tập (ƯỚC LƯỢNG): mỗi lượt gọi mô hình được gán cho tập được nhắc nhiều nhất trong chính lượt đó (đường dẫn/ tên ep00N);
# lượt không nhắc tập nào thì theo tập của lượt trước; trước khi có tập nào → "chung" (engine, studio, công cụ).
# Thời gian = tổng các khoảng cách giữa hai sự kiện liền nhau trong cùng phiên, chỉ tính khoảng ≤ 5 phút (bỏ lúc nghỉ).
import json, re, os, glob, sys, collections, datetime

GOC = os.path.expanduser('~/.claude/projects')
THU_MUC = [d for d in glob.glob(GOC + '/*') if re.search(r'3JS-Studio', os.path.basename(d))]
RE_EP = re.compile(r'ep00([1-4])\b|t[ậa]p\s*([1-4])\b', re.I)   # chỉ ep00N và "tập N"; KHÔNG bắt tên nhánh ep1-v2
NGHI = 300

def tap_trong(s):
    c = collections.Counter()
    for m in RE_EP.finditer(s):
        c['ep' + (m.group(1) or m.group(2))] += 1
    return c.most_common(1)[0][0] if c else None

tong = collections.defaultdict(lambda: collections.Counter())
phien = []
def doc(f, la_agent):
    da_thay = set(); hien = None; t_truoc = None; rieng = collections.Counter(); so_luot = 0; dau = cuoi = None
    # agent phụ: gán cả file theo tập được nhắc nhiều nhất trong 200 KB đầu
    if la_agent:
        try: hien = tap_trong(open(f, encoding='utf-8', errors='ignore').read(200000))
        except Exception: hien = None
    for dong in open(f, encoding='utf-8', errors='ignore'):
        try: j = json.loads(dong)
        except Exception: continue
        ts = j.get('timestamp')
        if not la_agent:
            # chỉ soi phần chữ của lượt này (không soi kết quả công cụ dài) để gán tập
            m = j.get('message') or {}
            chu = ''
            ct = m.get('content')
            if isinstance(ct, str): chu = ct[:4000]
            elif isinstance(ct, list):
                for c in ct:
                    if c.get('type') == 'text': chu += c.get('text', '')[:3000]
                    elif c.get('type') == 'tool_use': chu += json.dumps(c.get('input'), ensure_ascii=False)[:3000]
            tp = tap_trong(chu)
            if tp: hien = tp
        khoa = hien or 'chung'
        if ts:
            try: t = datetime.datetime.fromisoformat(ts.replace('Z', '+00:00')).timestamp()
            except Exception: t = None
            if t:
                if t_truoc and 0 < t - t_truoc <= NGHI: tong[khoa]['giay'] += t - t_truoc; rieng['giay'] += t - t_truoc
                t_truoc = t; dau = dau or t; cuoi = t
        m = j.get('message') or {}
        u = m.get('usage')
        if j.get('type') == 'assistant' and u:
            mid = m.get('id') or j.get('uuid')
            if mid in da_thay: continue
            da_thay.add(mid); so_luot += 1
            for a, b in (('vao', 'input_tokens'), ('ghi_dem', 'cache_creation_input_tokens'), ('doc_dem', 'cache_read_input_tokens'), ('ra', 'output_tokens')):
                v = u.get(b) or 0; tong[khoa][a] += v; rieng[a] += v
            tong[khoa]['luot'] += 1
            tong[khoa]['luot_agent' if la_agent else 'luot_chinh'] += 1
    return rieng, so_luot, dau, cuoi

for d in THU_MUC:
    for f in glob.glob(d + '/*.jsonl'):
        r, n, a, b = doc(f, False)
        phien.append({'file': os.path.basename(f)[:8], 'luot': n, 'token': r['vao'] + r['ghi_dem'] + r['doc_dem'] + r['ra'], 'gio': round(r['giay'] / 3600, 2),
                      'tu': datetime.datetime.fromtimestamp(a).strftime('%m-%d %H:%M') if a else '', 'den': datetime.datetime.fromtimestamp(b).strftime('%m-%d %H:%M') if b else ''})
    for f in glob.glob(d + '/*/subagents/*.jsonl') + glob.glob(d + '/*/*/*.jsonl'):
        if '/memory/' in f.replace('\\', '/'): continue
        doc(f, True)

kq = {}
for k, c in tong.items():
    kq[k] = {'vao': c['vao'], 'ghi_dem': c['ghi_dem'], 'doc_dem': c['doc_dem'], 'ra': c['ra'], 'tong': c['vao'] + c['ghi_dem'] + c['doc_dem'] + c['ra'],
             'moi': c['vao'] + c['ghi_dem'] + c['ra'], 'gio': round(c['giay'] / 3600, 2), 'luot': c['luot'], 'luot_agent': c['luot_agent'], 'luot_chinh': c['luot_chinh']}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'output', 'artifact', 'token')
os.makedirs(out, exist_ok=True)
json.dump({'lap_luc': datetime.datetime.now().strftime('%Y-%m-%d %H:%M'), 'tap': kq, 'so_phien': len(phien), 'phien': sorted(phien, key=lambda x: -x['token'])[:25]}, open(out + '/du-lieu.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k in sorted(kq): print(k, {a: (round(b / 1e6, 1) if a not in ('gio', 'luot', 'luot_agent', 'luot_chinh') else b) for a, b in kq[k].items()})
print('phiên:', len(phien))
