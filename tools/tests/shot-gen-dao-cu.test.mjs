// tools/shot-gen.mjs + storyboard.py: đường dữ liệu đạo cụ/diễn viên không phải người (fix C). Tập giả episodes/_test_c_sg (xoá khi xong).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..', '..');
const EP = '_test_c_sg', epDir = path.join(root, 'episodes', EP);
const tool = path.join(root, 'tools', 'shot-gen.mjs');
const chay = (...a) => spawnSync(process.execPath, [tool, EP, ...a], { cwd: root, encoding: 'utf8', timeout: 120000 });
const nap = async (f) => (await import(pathToFileURL(path.join(epDir, f)).href + '?t=' + Date.now()));
const HEAD = 'title: thu\nseed: 3\nkiem_tong: off\nactor hero: ga=1\nactor bap: bear=1 bow=#2e86de\nactor bear2: bear=1 bow=#e74c3c\nactor bear3: bear=1 bow=#f1c40f\n'
  + 'place bakery: 18, -6\n\n'
  + '| id | khung | giây | lời kể | loại | ai | cùng | ở đâu | hành động | mặt | máy quay | chữ | tiếng động | giờ | thời tiết | vật cần đọc | tư thế | tối thiểu | ghi chú |\n'
  + '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
const r = (...c) => '| ' + c.join(' | ') + ' |\n';
const BODY = r('1', '', '1,5', 'Ở thị trấn này, đồ mất.', 'establish', '', '', 'street', '', '', 'kéo ra', '', '', 'sang', 'nang', '', '', '', '')
  + r('2', '', '1,5', '^', 'insert', '', '', 'home', '', '', 'đẩy vào', '', '', 'sang', 'nang', '', '', '', 'obj:ke_trong — kệ trống')
  + r('3', '', '1,5', 'Chỉ một tuần.', 'insertRead', '', '', 'square', '', '', 'đẩy vào', '', '', 'trua', 'nang', 'bảng tin thị trấn', '', '', '')
  + r('4', '', '1,2', 'Là Bắp.', 'closeup', 'bap', '', 'bedroom', 'idle', '', 'đẩy vào', '', '', 'dem', 'may', '', 'sitting', '', '')
  + r('5', '', '1,1', 'Nó ôm cái đồng hồ.', 'insert', 'bap', '', 'bedroom', 'hug', '', 'đẩy vào', '', '', 'dem', 'may', '', 'standing', '', 'Bắp ôm đồng hồ')
  + r('6', '', '1,4', 'Tôi đặt nó lên kệ.', 'insert', '', '', 'bedroom', '', '', 'đẩy vào', '', '', 'dem', 'may', '', '', '', 'obj:dong_ho trên kệ')
  + r('7', '', '1,4', 'Hai con gấu khác nhập vào.', 'walkBy', 'bears', '', 'crossroad', 'run', '', 'lia', '', '', 'dem', 'nang', '', 'standing', '', '')
  + r('8', '', '1,4', 'Chú bán bánh hoảng.', 'reaction', 'baker', '', 'bakery', 'scared', 'surprised', 'đẩy vào', '', '', 'sang', 'nang', '', '', '', '');
const ghi = (body, head = HEAD) => fs.writeFileSync(path.join(epDir, 'kich-ban.md'), head + body);

before(() => { fs.rmSync(epDir, { recursive: true, force: true }); fs.mkdirSync(epDir, { recursive: true }); ghi(BODY); });
after(() => fs.rmSync(epDir, { recursive: true, force: true }));

test('shot-gen giữ obj/read/stance/group/cast.hold; episode.js có props + actors gấu/Gà nguyên tuỳ chọn', async () => {
  const p = chay('--force');
  assert.equal(p.status, 0, p.stdout + p.stderr);
  const { SHOTS } = await nap('shots.js'), { EPISODE } = await nap('episode.js');
  const by = Object.fromEntries(SHOTS.map((s) => [s.id, s]));
  assert.equal(by.s002.obj, 'ke_trong');
  assert.equal(by.s003.type, 'insertRead'); assert.equal(by.s003.read, 'bang_tin');
  assert.equal(by.s004.stance, 'sitting'); assert.equal(by.s004.anim, 'sit', 'gấu ngồi + idle → sit');
  assert.equal(by.s005.cast.bap.hold, 'dong_ho');
  assert.deepEqual([by.s007.who, by.s007.with, by.s007.group], ['bap', ['bear2', 'bear3'], 'bears']);
  assert.equal(by.s004.env, 'bedroom'); assert.equal(by.s004.at, 'bedroom_in'); assert.equal(by.s007.env, 'kenneyTown');
  assert.deepEqual(EPISODE.actors.bap, { bear: 1, bow: '#2e86de' }); assert.deepEqual(EPISODE.actors.hero, { ga: 1 });
  assert.deepEqual(Object.keys(EPISODE.props).sort(), ['bang_tin', 'dong_ho', 'ke_trong']);
  assert.equal(EPISODE.props.dong_ho.at, 'bedroom');
  assert.ok(EPISODE.places.bedroom_in);
});

test('insert có ai là gấu (không obj): đang ôm vật → nhắm vật trên tay; không cầm gì → nhắm mặt gấu; luôn zoom in', async () => {
  const { camGau } = await import('../shot-gen.mjs');
  const { SHOTS } = await nap('shots.js');
  const s5 = SHOTS.find((s) => s.id === 's005');
  assert.equal(s5.cam.at, 'obj:dong_ho');
  assert.ok(s5.cam.dist2 < s5.cam.dist);
  const meta = { actors: { bap: { bear: 1 }, hero: {} } };
  const c = camGau({ id: 'x', type: 'insert', who: 'bap' }, meta);
  assert.equal(c.cam.at, 'face:bap'); assert.ok(c.cam.dist2 < c.cam.dist);
  assert.equal(camGau({ id: 'y', type: 'insert', who: 'hero' }, meta).cam, undefined, 'người: không đổi');
  assert.equal(camGau({ id: 'z', type: 'insert', who: 'bap', obj: 'guong' }, meta).cam, undefined, 'có vật trong cảnh: để ganDaoCu lo');
});

test('insertRead thiếu vật cần đọc → mã 1, nêu id, vẫn xét hết các shot', () => {
  ghi(BODY.replace('| bảng tin thị trấn |', '|  |') + r('9', '', '1,5', 'Bản đồ.', 'insertRead', '', '', 'square', '', '', '', '', '', 'dem', 'nang', '', '', '', ''));
  const p = chay('--force');
  assert.equal(p.status, 1, p.stdout + p.stderr);
  assert.match(p.stderr, /s003/); assert.match(p.stderr, /s009/);
  assert.doesNotMatch(p.stderr, /at expandShot|TypeError/);
  ghi(BODY);
});

test('obj/read không có trong EPISODE.props → mã 1 liệt kê', () => {
  assert.equal(chay('--force').status, 0);
  // giả lập episode.js chỉnh tay mất props: chạy lại chỉ bước kiểm (--chi-kiem) trên shots.js + episode.js hiện có
  const f = path.join(epDir, 'episode.js');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/props: \{.*\}/, 'props: {"ke_trong": {"kit": "ke_trong", "at": "home"}}'));
  const p = chay('--chi-kiem');
  assert.equal(p.status, 1, p.stdout + p.stderr);
  assert.match(p.stderr, /bang_tin/); assert.match(p.stderr, /dong_ho/);
});

test('--dir: chạy khô vào thư mục khác, không đụng episodes/<ep>', async () => {
  const tmp = path.join(root, 'output', '_tmp', 'fixC', 'test-dir');
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, 'kich-ban.md'), HEAD + BODY);
  const p = spawnSync(process.execPath, [tool, 'ep_kho', `--dir=${tmp}`, '--force'], { cwd: root, encoding: 'utf8', timeout: 120000 });
  assert.equal(p.status, 0, p.stdout + p.stderr);
  assert.ok(fs.existsSync(path.join(tmp, 'shots.js')) && fs.existsSync(path.join(tmp, 'episode.js')));
  assert.ok(!fs.existsSync(path.join(root, 'episodes', 'ep_kho')));
  fs.rmSync(tmp, { recursive: true, force: true });
});
