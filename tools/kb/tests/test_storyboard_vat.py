"""storyboard.py + kichban.py: đạo cụ (obj/read/cầm), tư thế, nhóm diễn viên, env lạ, địa điểm, narration (fix C)."""
import io, json, shutil, sys, tempfile, unittest
from contextlib import redirect_stdout
from pathlib import Path

HERE = Path(__file__).resolve().parent
KB = HERE.parent
sys.path.insert(0, str(KB))
sys.path.insert(0, str(KB.parent))

import storyboard as sb  # noqa: E402
import kichban  # noqa: E402

HEAD = ('title: thu\nseed: 3\nkiem_tong: off\n'
        'actor hero: ga=1\nactor bap: bear=1 bow=#2e86de\nactor bear2: bear=1 bow=#e74c3c\nactor bear3: bear=1 bow=#f1c40f\n'
        'actor baker: shirt=#ffffff\nplace bakery: 18, -6\nvat thung_tiem_bach: chồng thùng in tên tiệm\n\n')
COLS = '| id | giây | lời kể | loại | ai | cùng | ở đâu | hành động | mặt | máy quay | vật cần đọc | tư thế | ghi chú |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n'


def row(*c):
    return '| ' + ' | '.join(c) + ' |\n'


def lam(body, head=HEAD):
    d = Path(tempfile.mkdtemp())
    (d / 'kich-ban.md').write_text(head + COLS + body, encoding='utf-8')
    f, meta, rows = sb.read_board(d)
    shots, lines, total, warn = sb.build(meta, rows, d)
    props, w2 = sb.ke_dao_cu(shots, meta, lines)
    return d, meta, shots, lines, props, warn + w2


BODY = (row('1', '1,5', 'Ở thị trấn này, đồ mất.', 'establish', '', '', 'street', '', '', 'kéo ra', '', '', '')
        + row('2', '1,5', '^', 'insert', '', '', 'home', '', '', 'đẩy vào', '', '', 'obj:ke_trong — kệ trống')
        + row('3', '1,5', 'Chỉ một tuần.', 'insertRead', '', '', 'square', '', '', 'đẩy vào', 'bảng tin thị trấn', '', '')
        + row('4', '1,2', 'Là Bắp.', 'closeup', 'bap', '', 'bedroom', 'idle', '', 'đẩy vào', '', 'sitting', '')
        + row('5', '1,4', 'Tôi đặt đồng hồ', 'insert', '', '', 'bedroom', '', '', 'đẩy vào', '', '', 'obj:dong_ho trên kệ')
        + row('6', '1,1', 'Nó ôm cái đồng hồ.', 'insert', 'bap', '', 'bedroom', 'hug', '', 'đẩy vào', '', 'standing', 'Bắp ôm đồng hồ')
        + row('7', '1,4', 'Hai con gấu khác nhập vào.', 'walkBy', 'bears', '', 'crossroad', 'run', '', 'lia', '', 'standing', '')
        + row('8', '1,4', 'Chú bán bánh hoảng.', 'reaction', 'baker', '', 'bakery', 'scared', 'surprised', 'đẩy vào', '', '', '')
        + row('9', '1,5', 'in tên tiệm.', 'insertRead', '', '', 'bakery', '', '', 'đẩy vào', 'chồng thùng in tên tiệm', '', '')
        + row('10', '1,5', 'Bản đồ.', 'insertRead', '', '', 'bakery', '', '', 'đẩy vào', 'bản đồ thị trấn', '', '')
        + row('11', '1,0', '^', 'insert', '', '', 'bakery', '', '', 'đẩy vào', '', '', 'obj:ban_do — dấu X'))


class TestVat(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d, cls.meta, cls.shots, cls.lines, cls.props, cls.warn = lam(BODY)
        cls.by = {s['id']: s for s in cls.shots}

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.d, ignore_errors=True)

    def test_obj_trong_ghi_chu(self):
        self.assertEqual(self.by['s002']['obj'], 'ke_trong')
        self.assertEqual(self.by['s005']['obj'], 'dong_ho')
        self.assertEqual(sb.obj_of('x — obj:ban_do — dấu X'), 'ban_do')
        self.assertIsNone(sb.obj_of('không có gì'))

    def test_read_qua_bang_alias(self):
        self.assertEqual(self.by['s003']['read'], 'bang_tin')            # alias dựng sẵn
        self.assertEqual(self.by['s009']['read'], 'thung_tiem_bach')     # dòng `vat` ở đầu kịch bản
        self.assertEqual(self.by['s010']['read'], 'ban_do')              # khớp tên obj đã có (ban_do ở s011)

    def test_read_khong_ro_thanh_slug(self):
        self.assertEqual(sb.vat_id('cái bình hoa xanh', {}, set()), 'cai_binh_hoa')

    def test_tu_the_thanh_stance(self):
        self.assertEqual(self.by['s004']['stance'], 'sitting')
        self.assertEqual(self.by['s007']['stance'], 'standing')

    def test_nhom_bears(self):
        s = self.by['s007']
        self.assertEqual(s['who'], 'bap')
        self.assertEqual(s['with'], ['bear2', 'bear3'])
        self.assertEqual(s['group'], 'bears')

    def test_env_va_dia_diem(self):
        self.assertIn('bedroom', sb.ENVS)
        self.assertIn('town', sb.ENVS)
        self.assertNotIn('tang', sb.ENVS)
        self.assertNotIn('gio-thoi-tiet', sb.ENVS)
        s4 = self.by['s004']
        self.assertEqual(s4['env'], 'bedroom')
        self.assertEqual(s4['at'], 'bedroom_in')
        self.assertEqual(self.by['s007']['env'], 'kenneyTown')   # quay lại thị trấn sau bedroom
        self.assertNotIn('env', self.by['s002'])                  # đang ở thị trấn: không ghi lại
        self.assertEqual(self.by['s008']['at'], 'bakery')

    def test_env_them_tu_dong_lenh(self):
        old = set(sb.ENVS)
        try:
            sb.them_env(['factory'])
            d, meta, shots, *_ = lam(row('1', '1,5', 'x', 'establish', '', '', 'factory', '', '', '', '', '', ''))
            self.assertEqual(shots[0]['env'], 'factory')
            self.assertEqual(shots[0]['at'], 'factory_in')
            shutil.rmtree(d, ignore_errors=True)
        finally:
            sb.ENVS.clear(); sb.ENVS.update(old)

    def test_cam_vat(self):
        self.assertEqual(self.by['s006']['cast'], {'bap': {'hold': 'dong_ho'}})
        self.assertNotIn('cast', self.by['s005'])

    def test_cam_vat_uu_tien_cung_noi(self):
        body = (row('1', '1', 'Két ở đây.', 'insert', '', '', 'factory_x', '', '', '', '', '', 'obj:ket_tien')
                + row('2', '1', 'Két Gà.', 'insert', '', '', 'bedroom', '', '', '', '', '', 'obj:ket_ga')
                + row('3', '1', 'Bắp ôm cả cái két.', 'reveal', 'bap', '', 'bedroom', 'hug', '', '', '', '', ''))
        d, meta, shots, lines, props, warn = lam(body)
        self.assertEqual(shots[2]['cast'], {'bap': {'hold': 'ket_ga'}})
        shutil.rmtree(d, ignore_errors=True)

    def test_dao_cu_trong_episode(self):
        p = self.props
        self.assertEqual(p['ke_trong'], {'kit': 'ke_trong', 'at': 'home'})
        self.assertEqual(p['bang_tin'], {'kit': 'bang_tin', 'at': 'square'})
        self.assertEqual(p['dong_ho']['at'], 'bedroom')
        self.assertEqual(p['dong_ho']['on'], 'ke')          # "trên kệ" → tên gốc, JS tìm kệ cùng nơi
        self.assertEqual(p['thung_tiem_bach']['at'], 'bakery')
        self.assertEqual(list(p)[:2], ['ke_trong', 'bang_tin'])   # thứ tự = lần dùng đầu

    def test_vat_chi_duoc_cam(self):
        body = row('1', '1', 'Một con ôm ví.', 'insert', 'bear2', '', 'crossroad', 'hug', '', '', '', 'standing', 'gấu nơ đỏ ôm ví')
        d, meta, shots, lines, props, warn = lam(body)
        self.assertEqual(shots[0]['cast'], {'bear2': {'hold': 'vi'}})
        self.assertEqual(props['vi'], {'kit': 'vi', 'at': 'crossroad', 'hold': True})
        shutil.rmtree(d, ignore_errors=True)

    def test_episode_js_giu_tuy_chon_gau_ga(self):
        out = Path(tempfile.mkdtemp()) / 'ep'
        with redirect_stdout(io.StringIO()):
            sb.write_episode('_t', self.meta, self.shots, self.lines, 9.0, self.d, self.d / 'kich-ban.md', {}, True, out=out, props=self.props)
        txt = (out / 'episode.js').read_text(encoding='utf-8')
        j = json.loads(txt[txt.index('actors: ') + 8: txt.index(',\n  places')])
        self.assertEqual(j['hero'], {'ga': 1})
        self.assertEqual(j['bap'], {'bear': 1, 'bow': '#2e86de'})
        self.assertNotIn('bears', j)
        self.assertIn('props: {', txt)
        self.assertIn('"bedroom_in"', txt)
        sh = (out / 'shots.js').read_text(encoding='utf-8')
        self.assertIn('stance: "sitting"', sh)
        self.assertIn('group: "bears"', sh)
        shutil.rmtree(out.parent, ignore_errors=True)

    def test_voice_khong_chu_thich_sau_lenh(self):
        body = row('1', '1,5', '[bach] Nhà nào có gấu.', 'closeup', 'hero', '', 'home', '', '', '', '', '', '')
        d, meta, shots, lines, props, warn = lam(body)
        out = Path(tempfile.mkdtemp()) / 'ep'
        with redirect_stdout(io.StringIO()):
            sb.write_episode('_t', meta, shots, lines, 2.0, d, d / 'kich-ban.md', {}, True, out=out, props=props)
        nl = (out / 'narration.txt').read_text(encoding='utf-8').splitlines()
        v = [l for l in nl if l.startswith('@voice')]
        self.assertEqual(len(v), 1)
        self.assertNotIn('#', v[0])
        self.assertTrue(any(l.startswith('#') and 'bach' in l for l in nl))
        # --force không ghi đè narration.txt đã có (chỉnh giọng tay)
        (out / 'narration.txt').write_text('@voice bach capcut:XYZ\n@at 0.05 [bach] Nhà nào có gấu.\n', encoding='utf-8')
        with redirect_stdout(io.StringIO()):
            sb.write_episode('_t', meta, shots, lines, 2.0, d, d / 'kich-ban.md', {}, True, out=out, props=props)
        self.assertIn('capcut:XYZ', (out / 'narration.txt').read_text(encoding='utf-8'))
        with redirect_stdout(io.StringIO()):
            sb.write_episode('_t', meta, shots, lines, 2.0, d, d / 'kich-ban.md', {}, True, out=out, props=props, ghi_narration=True)
        self.assertNotIn('capcut:XYZ', (out / 'narration.txt').read_text(encoding='utf-8'))
        shutil.rmtree(out.parent, ignore_errors=True)
        shutil.rmtree(d, ignore_errors=True)


class TestKichbanObj(unittest.TestCase):
    def test_kichban_doc_obj(self):
        p = Path(tempfile.mkdtemp()) / 'kich-ban.md'
        p.write_text(HEAD + COLS + BODY, encoding='utf-8')
        d = kichban.doc(p)
        self.assertEqual(d['loi_doc'], [])
        self.assertEqual(d['shots'][1]['obj'], 'ke_trong')
        self.assertEqual(d['shots'][3]['pose'], 'sitting')
        self.assertNotIn('obj', d['shots'][0])
        self.assertEqual(d['meta']['vat'], {'thung_tiem_bach': ['chồng thùng in tên tiệm']})


if __name__ == '__main__':
    unittest.main()
