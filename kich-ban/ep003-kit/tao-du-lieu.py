from pathlib import Path
import json, math, re

root = Path(__file__).resolve().parents[2]
out = Path(__file__).resolve().parent
if (out / 'kit.json').exists() and json.loads((out / 'kit.json').read_text(encoding='utf-8')).get('phien_ban') != '0.1-chua-hoan-thanh':
    raise SystemExit('Kit đã chỉnh tay; dừng để tránh ghi đè.')
def read(path):
    return json.loads((root / path).read_text(encoding='utf-8-sig'))
source = read('kich-ban/ep003-goi2/Shotlist_104.json')
cams = read('kich-ban/ep003-goi2/Camera_104.json')
sets = read('kich-ban/ep003-goi2/Bo_canh_kich_thuoc.json')['boi_canh']
moc = read('kich-ban/ep003-sb/moc.json')['shots']
khung_text = (root / 'episodes/ep003/khung.js').read_text(encoding='utf-8')
khung = {}
for ident, body in re.findall(r'^\s*(s\d{3}):\s*\{([^}]+)\}', khung_text, re.M):
    fields = {}
    for key, value in re.findall(r"(\w+):\s*('[^']*'|true|false|-?[\d.]+)", body):
        key = 'tuyet_doi' if key == 'tuyetDoi' else key
        fields[key] = value[1:-1] if value.startswith("'") else json.loads(value)
    khung[ident] = fields

def snake(x):
    if isinstance(x, list): return [snake(v) for v in x]
    if isinstance(x, dict):
        return {re.sub(r'(?<!^)(?=[A-Z])', '_', k).lower(): snake(v) for k, v in x.items()}
    return x

ga = 5.2
nhan_vat = []
for code, name in source['actors'].items():
    desc = next((x for x in source['characters'] if x['id'] == code), {})
    loai = 'ga' if code == 'GA' else 'gau' if code in ('BAP','BEAR_WALLET','BEAR_BAG','BEARS_STOCK') else 'r6'
    ref = 'Ga_truoc.png' if code == 'GA' else 'Truoc_sau_bears.jpg' if loai == 'gau' else 'Truoc_sau_leads.jpg' if code in ('BACH','MAYOR','GUARD_A','GUARD_B') else 'Truoc_sau_neighbors.jpg' if code in ('BAKER','TAILOR','CHILD_A','CHILD_B') else 'Truoc_sau_town.jpg'
    nhan_vat.append({'id': code.lower(), 'ten': name, 'loai_than': loai, 'cao_stud': 5.2 if code == 'GA' else round(5.2*.42,3) if code == 'BAP' else None, 'trang_phuc': desc.get('front'), 'phia_sau': desc.get('back'), 'anh_tham_chieu': ['../ep003-goi2/nhan-vat/'+ref], 'shot_xuat_hien': [s['id'].lower() for s in source['shots'] if code in s['cast']], 'tin_cay': 'cao' if code == 'GA' else 'thap', 'cach_do': 'Gà: đỉnh đầu không tính chỏm theo ga-dims.js; Bắp: 0,42 Gà theo thiết kế; chiều cao còn lại chưa đo.'})

boi_canh = []
for s in sets:
    dims = s.get('kich_thuoc_phong_du_kien') or {}
    def cv(x): return round(x*ga, 3) if isinstance(x,(int,float)) else None
    boi_canh.append({'id': s['id'].replace('-','_'), 'ten': s['ten'], 'kich_thuoc_du_kien': {'rong_x': cv(dims.get('rong_G')), 'sau_z': cv(dims.get('dai_G')), 'cao_y': cv(dims.get('cao_G'))}, 'vat_co_dinh_nguon': snake(s.get('vat_co_dinh',[])), 'ghi_chu_anh': s.get('ghi_chu_anh',[]), 'anh_doi_chieu': s.get('anh_doi_chieu',[]), 'tin_cay': 'thap', 'cach_do': 'Quy đổi số dự kiến của Bo_canh_kich_thuoc.json theo Gà 5,2 stud; chiều sâu chưa giải được từ ảnh.'})

shots=[]
for s,c,t in zip(source['shots'],cams,moc):
    assert s['id'].lower() == t['id'] == c['id'].lower()
    mm = c.get('tieu_cu_mm_du_kien')
    fov = round(math.degrees(2*math.atan(18/mm)),2) if isinstance(mm,(int,float)) and mm > 0 else None
    actors=[]
    for actor, emot in s['cast'].items():
        info = next((b for b in c.get('bo_tri',[]) if b.get('ai') == actor), {})
        actors.append({'id':actor.lower(),'emote_file':'../ep003-goi2/'+source['emotes'][str(emot).zfill(2)]['file'], 'pos':None, 'huong_mat_yaw':None, 'bo_tri_trong_anh':snake(info)})
    ident=t['id']
    shot={'id':ident, 'so':int(ident[1:]), 't0':t['t0'], 't1':t['t1'], 'dur':round(t['t1']-t['t0'],3), 'loi_ke':s.get('dialogue',''), 'y_do':s['title'], 'boi_canh_id':s['set'].replace('-','_'), 'thoi_gian':'dem' if t['dem'] or ident in ('s020','s021') else 'ngay', 'anh_sang_id':None, 'nhan_vat':actors, 'do_vat_trong_khung':[], 'camera':{'dau':{'pos':None,'nhin_vao':None,'fov_doc_do':fov,'tieu_cu_mm_tuong_duong':mm}, 'cuoi':None, 'khung_do_anh':snake(c), 'khung_engine_hien_tai':khung.get(ident)}, 'phai_thay': [s['action']], 'khong_duoc':[], 'anh_tham_chieu':'../ep003-goi2/'+s['file'], 'tin_cay':'thap', 'cach_do':'Bố cục lấy từ Camera_104.json; tọa độ máy và diễn viên chưa được giải từ ảnh.'}
    if ident == 's002': shot['thoi_gian'] = 'ngay'
    if ident == 's104': shot['thoi_gian'] = None
    shots.append(shot)

kit={'phien_ban':'0.1-chua-hoan-thanh','trang_thai':'CHƯA DÙNG DỰNG: chưa giải tọa độ ba chiều và kiểm che khuất.', 'quy_uoc':{'don_vi':'stud; 1 đơn vị three.js = 1 stud', 'truc':'X phải; Y lên; +Z hướng mặt nhân vật khi yaw nhân vật bằng 0.', 'yaw_pitch':'Engine cam.yaw tính bằng radian: p = target + [sin(yaw)*dist, h, cos(yaw)*dist]; yaw=0 máy ở +Z nhìn −Z. h là chênh cao, không phải góc pitch. dat-may ngang/cao tính độ; cao dương máy ở trên nhìn xuống. FOV dọc với cạnh cảm biến dọc 36 mm: 2 atan(18/mm).', 'thuoc_chuan_ga_stud':5.2, 'khung_hinh':'1080x1920'}, 'bang_mau':[], 'nhan_vat':nhan_vat, 'boi_canh':boi_canh, 'do_vat':[], 'anh_sang':[], 'shots':shots, 'mau_thuan':[{'shot':'s020–s021','van_de':'moc.json đánh dấu ban ngày nhưng ảnh có đêm và trăng.','cach_chon':'Theo ảnh: đêm.'}, {'shot':'s024, s026','van_de':'Ảnh gương và kệ có khác biệt hình học.','cach_chon':'Giữ một kệ cố định; cần hiệu chỉnh gương với các shot liên quan.'}], 'thieu_trong_engine':[{'thu_gi':'Mặt phản chiếu gương đúng vị trí','vi_sao_can':'S023–S026 cần thấy ảnh Bắp và kệ','do_uu_tien':'cao'}, {'thu_gi':'Điểm neo tay và đạo cụ nhỏ','vi_sao_can':'Các cận tay, nhẫn và dây chuyền','do_uu_tien':'cao'}, {'thu_gi':'Biểu cảm gấu theo 37 mã','vi_sao_can':'Bắp cần thể hiện nét mặt như storyboard','do_uu_tien':'cao'}]}
(out/'kit.json').write_text(json.dumps(kit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Shots:',len(shots),'existing frames:',len(khung))
