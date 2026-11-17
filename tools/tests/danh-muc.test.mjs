// tools/danh-muc.mjs: danh mục có đủ nhóm chính, tên sai bị báo đúng dòng, tên đúng không bị báo. Không mở Chrome.
import test from 'node:test';
import assert from 'node:assert/strict';
import { taoDanhMuc, kiemNguon, viMd, goiY, khoaCap1 } from '../danh-muc.mjs';

const dm = await taoDanhMuc();

test('danh mục có đủ nhóm chính và các tên cốt lõi', () => {
  for (const [id, mau] of [['loaiShot', 'closeup'], ['clip', 'walk'], ['hanhDong', 'wave'], ['mat', 'binh_thuong'], ['env', 'e3-phong'],
    ['bfx', 'sign'], ['icon', 'question'], ['bkMove', 'push'], ['bkCo', 'medium'], ['bkGoc', 'low'], ['bkFrom', 'front'], ['fx', 'mayBlocky']]) {
    assert.ok(dm.nhom[id], 'thiếu nhóm ' + id);
    assert.ok(dm.nhom[id].ds.includes(mau), `${id} thiếu '${mau}'`);
  }
});

test('docs sinh ra ghi rõ file tự động + liệt kê các nhóm', () => {
  const md = viMd(dm);
  assert.match(md, /sinh tự động, đừng sửa tay/);
  for (const t of ['Loại shot', 'Clip', 'Động tác chồng lớp', 'Mặt', 'Bối cảnh', 'bfx', 'cam.bk', 'Ô FX']) assert.ok(md.includes(t), 'md thiếu ' + t);
});

const SHOT_MAU = [
  '// chú thích: anim: \'khongco\' không được tính',
  "export const S = [",
  "  { id: 's1', type: 'closeup', who: 'hero', anim: 'walk', face: 'smile', env: 'e3-phong', cam: { bk: { co: 'medium', move: 'push', goc: 'low' } } },",
  "  { id: 's2', type: 'closeup', who: 'hero', anim: 'vayy', face: 'smile', env: 'e3-phong' },",
  "  { id: 's3', who: 'hero', face: 'mat_bia', env: 'phong-bia', cam: { bk: { co: 'to_tuong', move: 'pushh', whip: { to: 'a', yaw: 3 } } } },",
  "  { id: 's4', bfx: [{ icon: 'khongco', t: 0 }, { sparkle: 'hero', t: 1 }, { bayy: 1 }], do: [{ a: 'wave', t: [0, 1] }, { a: 'nhayy', t: [0, 1] }], fx: { cards: {} } },",
  "  { id: 's5', mat: [[0.5, 'binh_thuong'], [1, 'mat_sai~open']], fx: { khongCoFx: true } },",
  "];",
].join('\n');

test('tên sai bị báo đúng dòng, tên đúng không bị báo', () => {
  const r = kiemNguon(SHOT_MAU, 'episodes/x/shots.js', dm);
  const co = (dong, loai, ten) => r.find((x) => x.dong === dong && x.loai === loai && x.ten === ten);
  assert.ok(co(4, 'clip', 'vayy'), 'phải báo clip vayy ở dòng 4');
  assert.ok(co(5, 'mặt', 'mat_bia') && co(5, 'bối-cảnh', 'phong-bia'));
  assert.ok(co(5, 'bk-co', 'to_tuong') && co(5, 'bk-move', 'pushh'));
  assert.ok(co(6, 'bfx-icon', 'khongco') && co(6, 'bfx-khoá', 'bayy') && co(6, 'động-tác', 'nhayy'));
  assert.ok(co(7, 'mặt', 'mat_sai~open'), 'mặt lạ có hậu tố ~open vẫn bị báo');
  assert.equal(kiemNguon("{ face: 'smile~open' }", 'x.js', dm).length, 0, '~open trên mặt đúng thì không báo');
  assert.ok(r.some((x) => x.dong === 7 && x.loai === 'fx-shot' && x.ten === 'khongCoFx'));
  // tên đúng, chú thích: không báo
  for (const x of r) assert.ok(![1, 3].includes(x.dong), `dòng ${x.dong} không được báo (${x.ten})`);
  assert.ok(!r.some((x) => x.ten === 'khongco' && x.loai === 'clip'), 'chú thích không bị quét');
  assert.ok(!r.some((x) => ['walk', 'smile', 'closeup', 'e3-phong', 'medium', 'push', 'low', 'wave', 'sparkle', 'cards'].includes(x.ten)), 'tên đúng không bị báo');
  assert.ok(!r.some((x) => x.dong === 5 && x.loai.startsWith('bk.whip')), 'whip nhận mọi khoá bk (yaw)');
});

test('gợi ý gần nhất + khoaCap1', () => {
  assert.ok(goiY('vayy', ['wave', 'walk', 'run']).includes('wave'));
  const s = "{ a: 1, 'b-c': { x: 2 }, d() {}, ...e, f }";
  assert.deepEqual(khoaCap1(s, 0).map((k) => k.key), ['a', 'b-c', 'd', 'f']);
});
