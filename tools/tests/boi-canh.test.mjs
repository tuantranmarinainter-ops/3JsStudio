// Task 13a: lõi bối cảnh 3 tầng + giờ/thời tiết + công thức từ mô tả.
//   Phần 1 (node thuần): engine/envs/cong-thuc.js, gio-thoi-tiet.js, tang.js.
//   Phần 2 (trình duyệt, ep001): __measure().tang theo từng env, đổi time -> tối hơn.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, resolve, relative } from 'node:path';
import { launchBrowser } from '../browser.mjs';
import { docAnh } from '../kiem/nhan.mjs';
import { tyLeToi } from '../kiem/anh.mjs';
import { CONG_THUC, tuMoTa, fold } from '../../engine/envs/cong-thuc.js';
import { GIO, THOI_TIET, gioThoiTiet } from '../../engine/envs/gio-thoi-tiet.js';
import { ganTang, layersOf, TANG } from '../../engine/envs/tang.js';
import { LIGHTS } from '../../engine/lights.js';
import { seaPreset } from '../../engine/seaweather.js';

const root = resolve(import.meta.dirname, '..', '..');
const doc = (p) => readFileSync(join(root, p), 'utf8');

// 17 env hiện có (đồng bộ với def('<tên>', …) trong engine/envs.js — test bên dưới kiểm lệch)
export const ENV17 = ['town', 'forest', 'hawaii', 'brazil', 'sahara', 'antarctica', 'ocean', 'mountain', 'snowNight', 'iceSea', 'storm', 'shipStorm', 'island', 'reef', 'kitchen', 'bedroom', 'sea'];
// Env CHƯA gắn userData.tang. Agent env gỡ tên của mình khỏi danh sách này khi xong (test sẽ bắt đầu kiểm 3 tầng cho env đó).
const DA_GAN = new Set(['town', 'sea', 'ocean', 'storm', 'shipStorm']);
export const CHUA_GAN = new Set(ENV17.filter((e) => !DA_GAN.has(e)));

// ---------------------------------------------------------------- phần 1: thuần
test('tuMoTa: "bến cảng sương mù" ra đúng công thức', () => {
  const r = tuMoTa('bến cảng sương mù');
  const c = CONG_THUC['ben cang suong mu'];
  assert.ok(c, 'thiếu công thức "ben cang suong mu"');
  assert.deepEqual(r, { env: c.env, them: c.them, time: c.time ?? null, weather: c.weather ?? null });
  assert.equal(r.env, 'sea');
  assert.equal(r.weather, 'suong');
  assert.notEqual(r.them, c.them, 'phải trả bản sao của them');
});

test('tuMoTa: mô tả lạ / rỗng / không phải chuỗi -> null', () => {
  assert.equal(tuMoTa('tàu vũ trụ trên sao hỏa'), null);
  assert.equal(tuMoTa(''), null);
  assert.equal(tuMoTa(null), null);
  assert.equal(tuMoTa(42), null);
});

test('tuMoTa: từ khoá dài nhất thắng, khớp theo từ nguyên', () => {
  assert.equal(tuMoTa('một bến cảng buổi sáng').env, 'sea');
  assert.equal(tuMoTa('một bến cảng buổi sáng').weather, null);
  assert.equal(tuMoTa('BẾN CẢNG, sương mù!').weather, 'suong');
  assert.equal(tuMoTa('Nhà bếp nhỏ').env, 'kitchen');
  assert.equal(tuMoTa('bien bang vao ban dem').env, 'iceSea');
  assert.equal(tuMoTa('đi trên biển').env, 'sea');
  assert.equal(tuMoTa('bếp').env, 'kitchen');
  assert.equal(tuMoTa('abeps'), null, 'không khớp giữa chữ');
});

test('CONG_THUC: >= 12, khoá đã fold, phủ 17 env, giá trị hợp lệ', () => {
  const keys = Object.keys(CONG_THUC);
  assert.ok(keys.length >= 12, 'chỉ có ' + keys.length);
  for (const k of keys) {
    assert.equal(fold(k), k, 'khoá chưa fold: ' + k);
    const c = CONG_THUC[k];
    assert.ok(ENV17.includes(c.env), `${k}: env "${c.env}" không có`);
    assert.ok(Array.isArray(c.them), k + ': them phải là mảng');
    if (c.time) assert.ok(GIO.includes(c.time), `${k}: time ${c.time}`);
    if (c.weather) assert.ok(THOI_TIET.includes(c.weather), `${k}: weather ${c.weather}`);
  }
  const phu = new Set(keys.map((k) => CONG_THUC[k].env));
  for (const e of ENV17) assert.ok(phu.has(e), 'không công thức nào dùng env ' + e);
});

test('ENV17 khớp def() trong engine/envs.js', () => {
  const ten = [...doc('engine/envs.js').matchAll(/^\s*def\('(\w+)',/gm)].map((m) => m[1]).sort();
  assert.deepEqual([...ENV17].sort(), ten);
  for (const e of CHUA_GAN) assert.ok(ENV17.includes(e), 'CHUA_GAN có env lạ: ' + e);
});

test('GIO / THOI_TIET khớp danh sách hợp lệ của kịch bản (tools/kb/kichban.py)', () => {
  const py = doc('tools/kb/kichban.py');
  const lay = (ten) => [...py.match(new RegExp(ten + " = \\{([^}]*)\\}"))[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual([...GIO].sort(), lay('TIME_OK'));
  assert.deepEqual([...THOI_TIET].sort(), lay('WEATHER_OK'));
});

const ENV = {
  town: { name: 'town', light: 'night' },
  hawaii: { name: 'hawaii', light: 'beach' },
  antarctica: { name: 'antarctica', light: 'snow', snow: true },
  kitchen: { name: 'kitchen', light: 'interior' },
  bedroom: { name: 'bedroom', light: 'bedNight' },
  sea: { name: 'sea', light: 'ocean', sea: true },
  storm: { name: 'storm', light: 'storm', sea: true, rain: true },
};

test('gioThoiTiet: không time/weather -> null; giá trị sai -> ném lỗi', () => {
  assert.equal(gioThoiTiet({}, ENV.town), null);
  assert.equal(gioThoiTiet({ id: 's1' }, ENV.sea), null);
  assert.throws(() => gioThoiTiet({ time: 'nua-dem' }, ENV.town), /time/);
  assert.throws(() => gioThoiTiet({ weather: 'nong' }, ENV.town), /weather/);
});

test('gioThoiTiet: giờ -> khoá ánh sáng + màu', () => {
  assert.equal(gioThoiTiet({ time: 'dem' }, ENV.hawaii).light, 'night');
  assert.equal(gioThoiTiet({ time: 'dem' }, ENV.antarctica).light, 'snowNight');
  assert.equal(gioThoiTiet({ time: 'trua' }, ENV.town).light, 'day');
  assert.equal(gioThoiTiet({ time: 'trua' }, ENV.hawaii).light, 'beach');
  assert.equal(gioThoiTiet({ time: 'dem' }, ENV.kitchen).light, 'bedNight');
  assert.equal(gioThoiTiet({ time: 'sang' }, ENV.bedroom).light, 'interior');
  const hh = gioThoiTiet({ time: 'hoang-hon' }, ENV.hawaii), trua = gioThoiTiet({ time: 'trua' }, ENV.hawaii);
  assert.notEqual(hh.lightOverride.bottom, undefined);
  assert.ok(hh.lightOverride.dir[1] < 0.5, 'hoàng hôn: mặt trời thấp');
  assert.deepEqual(trua.lightOverride, {}, 'trưa = ánh sáng gốc của env');
});

test('gioThoiTiet: thời tiết -> tối hơn + hạt (env không có sẵn) / seaWeather (env biển)', () => {
  const mua = gioThoiTiet({ weather: 'mua' }, ENV.town);
  assert.ok(mua.hat.mua > 0 && !mua.hat.tuyet);
  assert.equal(mua.seaWeather, undefined);
  assert.equal(mua.light, undefined, 'chỉ weather: không đổi khoá ánh sáng');
  assert.ok(mua.lightOverride.sun[1] < LIGHTS.night.sun[1] * 0.5, 'nắng yếu đi so với ánh sáng gốc của env');
  const ngay = gioThoiTiet({ weather: 'mua' }, { name: 'town', light: 'day' });   // ánh sáng THẬT của shot (shot.light) làm nền
  assert.ok(Math.abs(ngay.lightOverride.sun[1] - LIGHTS.day.sun[1] * 0.35) < 1e-9, 'nền phải là day, không phải night');
  assert.ok(gioThoiTiet({ weather: 'tuyet' }, ENV.town).hat.tuyet > 0);
  assert.equal(gioThoiTiet({ weather: 'tuyet' }, ENV.antarctica).hat?.tuyet ?? 0, 0, 'env tự có tuyết: không chồng hạt');
  assert.equal(gioThoiTiet({ weather: 'bao' }, ENV.sea).seaWeather, 'bao');
  assert.equal(gioThoiTiet({ weather: 'bao', time: 'dem' }, ENV.sea).seaWeather, 'dem-bao');
  assert.equal(gioThoiTiet({ weather: 'nang', time: 'dem' }, ENV.sea).seaWeather, 'dem-trang');
  assert.equal(gioThoiTiet({ weather: 'mua' }, ENV.storm).hat, undefined, 'env biển/mưa: mưa do seaWeather lo');
  assert.deepEqual(gioThoiTiet({ weather: 'mua' }, ENV.kitchen).lightOverride, {}, 'nội thất bỏ qua thời tiết');
  const sw = gioThoiTiet({ weather: 'suong' }, ENV.sea).seaWeather;
  assert.equal(sw.base, 'gio-nhe');
  assert.ok(sw.sky.fogR[1] < 300);
});

test('seaWeather: sky từ tintGio thật sự vào seaPreset (dir/hemi/sun/top/bottom)', () => {
  const tt = gioThoiTiet({ time: 'hoang-hon', weather: 'nang' }, ENV.sea);
  assert.equal(tt.seaWeather.base, 'nang');
  const L = seaPreset(tt.seaWeather).L;
  assert.deepEqual(L.dir, tt.seaWeather.sky.dir);
  assert.deepEqual(L.hemi, tt.seaWeather.sky.hemi);
  assert.deepEqual(L.sun, tt.seaWeather.sky.sun);
  assert.equal(L.top, tt.seaWeather.sky.top);
  assert.notDeepEqual(L.dir, seaPreset('nang').L.dir);
});

test('gioThoiTiet: tất định (gọi hai lần ra cùng kết quả)', () => {
  const a = gioThoiTiet({ time: 'chieu', weather: 'may' }, ENV.hawaii), b = gioThoiTiet({ time: 'chieu', weather: 'may' }, ENV.hawaii);
  assert.deepEqual(a, b);
});

test('ganTang / layersOf', () => {
  const nut = (ten) => ({ name: ten, userData: {}, children: [], traverse(fn) { fn(this); this.children.forEach((c) => c.traverse(fn)); } });
  const g = nut('g'), a = nut('a'), b = nut('b'), c = nut('c');
  g.children.push(a, b); b.children.push(c);
  assert.equal(ganTang(a, 'front'), a);
  ganTang(b, 'mid'); ganTang(c, 'mid');   // c nằm trong b (đã có tầng) -> chỉ b là gốc tầng
  assert.equal(a.userData.tang, 'front');
  assert.deepEqual(TANG, ['front', 'mid', 'back']);
  const L = layersOf(g);
  assert.deepEqual(L.front, [a]);
  assert.deepEqual(L.mid, [b]);
  assert.deepEqual(L.back, []);
  assert.throws(() => ganTang(a, 'xa'), /tầng/);
  assert.throws(() => ganTang(null, 'front'));
});

// ---------------------------------------------------------------- phần 2: trình duyệt (ep001)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml' };
let srv, browser, page, tTown;
const T = { timeout: 180000 };

before(async () => {
  srv = createServer(async (req, res) => {
    try {
      const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0])));
      if (relative(root, p).startsWith('..')) throw 0;
      const b = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(b);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  browser = await launchBrowser();
  page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.25 });
  await page.goto(`http://localhost:${srv.address().port}/episodes/ep001/index.html`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 170000 });
  tTown = await page.evaluate(() => { const s = window.__shots.list.find((x) => x.env === 'town'); return s.t0 + s.dur / 2; });
}, { timeout: 180000 });

after(async () => { await browser?.close(); srv?.close(); });

// Đổi tạm env / time / weather của shot town đầu tiên rồi chạy fn trong trang; luôn khôi phục.
const voiShot = (patch, fn) => page.evaluate(async ({ patch, tTown, fn }) => {
  const s = window.__shots.list.find((x) => x.env === 'town'); const cu = {};
  for (const k of Object.keys(patch)) { cu[k] = s[k]; if (patch[k] === null) delete s[k]; else s[k] = patch[k]; }
  try { await window.renderAt(tTown); return JSON.parse(JSON.stringify(eval(fn)())); }
  finally { for (const k of Object.keys(cu)) { if (cu[k] === undefined) delete s[k]; else s[k] = cu[k]; } await window.renderAt(tTown); }
}, { patch, tTown, fn: fn.toString() });

for (const env of ENV17) {
  test(`env ${env}: __measure().tang có cả 3 tầng >= 1`, { ...T, skip: CHUA_GAN.has(env) ? 'chưa gắn tầng (CHUA_GAN)' : false }, async () => {
    const tang = await page.evaluate(async ({ env, tTown }) => {
      const s = window.__shots.list.find((x) => x.env === 'town'); const cu = s.env; s.env = env;
      const AF = (globalThis.__autoFx ||= {}), af0 = { tangXa: AF.tangXa, seaDecor: AF.seaDecor }; AF.tangXa = true; AF.seaDecor = true;   // ep001 tắt tangXa; ô bật ⇒ đủ 3 tầng
      try { await window.renderAt(tTown); return JSON.parse(JSON.stringify(window.__measure(tTown).tang)); }
      finally { s.env = cu; AF.tangXa = af0.tangXa; AF.seaDecor = af0.seaDecor; await window.renderAt(tTown); }
    }, { env, tTown });
    for (const k of TANG) assert.ok(tang[k] >= 1, `${env}: tầng ${k} = ${tang[k]}`);
  });
}

test('tang: vật gắn tầng nằm ngoài camera.far KHÔNG được đếm; vào tầm nhìn thì đếm', T, async () => {
  const r = await page.evaluate(async (tTown) => {
    await window.renderAt(tTown);
    const { ganTang } = await import('/engine/envs/tang.js');
    const cam = window.__stage.camera;
    const scene = window.__stage.scene;
    const THREE_ = window.THREE;
    const far = cam.far, dir = new THREE_.Vector3(); cam.getWorldDirection(dir);
    const mk = (d) => { const m = new THREE_.Mesh(new THREE_.BoxGeometry(2, 2, 2), new THREE_.MeshBasicMaterial()); m.position.copy(cam.getWorldPosition(new THREE_.Vector3())).addScaledVector(dir, d); ganTang(m, 'back'); scene.add(m); return m; };
    const truoc = window.__measure(tTown).tang.back;
    const xa = mk(far + 300); const a = window.__measure(tTown).tang.back;
    const gan = mk(far * 0.5); const b = window.__measure(tTown).tang.back;
    scene.remove(xa); scene.remove(gan);
    return { far, truoc, a, b };
  }, tTown);
  assert.equal(r.a, r.truoc, 'vật ngoài far bị đếm: ' + JSON.stringify(r));
  assert.equal(r.b, r.truoc + 1, 'vật trong tầm nhìn không được đếm: ' + JSON.stringify(r));
});

for (const env of ['storm', 'shipStorm']) {
  test(`env ${env}: tangXa bật ⇒ back >= 1 (vật dưới camera.far); tắt ⇒ back = 0`, T, async () => {
    const r = await page.evaluate(async ({ env, tTown }) => {
      const s = window.__shots.list.find((x) => x.env === 'town'); const cu = s.env; s.env = env;
      const AF = (globalThis.__autoFx ||= {}), t0 = AF.tangXa, out = {};
      try {
        for (const on of [true, false]) { AF.tangXa = on; await window.renderAt(tTown); out[on ? 'bat' : 'tat'] = window.__measure(tTown).tang.back; }
      } finally { s.env = cu; AF.tangXa = t0; await window.renderAt(tTown); }
      return out;
    }, { env, tTown });
    assert.ok(r.bat >= 1, JSON.stringify(r));
    assert.equal(r.tat, 0, JSON.stringify(r));
  });
}

test('CHUA_GAN không mồ côi: env đã đủ 3 tầng thì phải gỡ khỏi CHUA_GAN', T, async () => {
  const mo = [];
  for (const env of CHUA_GAN) {
    const tang = await page.evaluate(async ({ env, tTown }) => {
      const s = window.__shots.list.find((x) => x.env === 'town'); const cu = s.env; s.env = env;
      try { await window.renderAt(tTown); return JSON.parse(JSON.stringify(window.__measure(tTown).tang)); }
      finally { s.env = cu; await window.renderAt(tTown); }
    }, { env, tTown });
    if (TANG.every((k) => tang[k] >= 1)) mo.push(env);
  }
  assert.deepEqual(mo, [], 'đã đủ 3 tầng, hãy gỡ khỏi CHUA_GAN: ' + mo.join(', '));
});

test('đổi time sang dem -> tyLeToi tăng (town)', T, async () => {
  const toi = async (time) => {
    await page.evaluate(async ({ time, tTown }) => {
      const s = window.__shots.list.find((x) => x.env === 'town'); s.time = time; await window.renderAt(tTown);
    }, { time, tTown });
    const png = await page.locator((await page.locator('#root').count()) ? '#root' : 'canvas').first().screenshot({ type: 'png' });
    return tyLeToi(await docAnh(page, png, 135, 240));
  };
  try {
    const trua = await toi('trua'), dem = await toi('dem');
    assert.ok(dem > trua, `tyLeToi dem ${dem} <= trua ${trua}`);
  } finally {
    await page.evaluate(async (tTown) => { delete window.__shots.list.find((x) => x.env === 'town').time; await window.renderAt(tTown); }, tTown);
  }
});

test('hạt thời tiết: weather mua trên town -> __measure().hat.mua > 0; bỏ weather -> 0', T, async () => {
  const mua = await voiShot({ weather: 'mua' }, () => window.__measure(tTown).hat);
  assert.ok(mua.mua > 0, JSON.stringify(mua));
  const khong = await voiShot({ weather: null }, () => window.__measure(tTown).hat);
  assert.equal(khong.mua, 0);
  const tuyet = await voiShot({ weather: 'tuyet' }, () => window.__measure(tTown).hat);
  assert.ok(tuyet.tuyet > 0 && tuyet.mua === 0, JSON.stringify(tuyet));   // snow.obj.children + setDrawRange đúng chữ ký fxSnow hiện tại
});

// ---- time/weather cấp EPISODE (trang tập mẫu: createDirector({ …, episode: EPISODE })) ----
test('EPISODE.time là mặc định cho shot; shot ghi riêng thì thắng; không khai thì như cũ', T, async () => {
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.25 });
  try {
    await pg.goto(`http://localhost:${srv.address().port}/episodes/_template/index.html`);
    await pg.waitForFunction(() => window.__ready === true, null, { timeout: 170000 });
    const toi = async (ep, shotTime) => {
      const t = await pg.evaluate(async ({ ep, shotTime }) => {
        const { EPISODE } = await import('/episodes/_template/episode.js');
        const s = window.__shots.list[0];
        if (ep === undefined) delete EPISODE.time; else EPISODE.time = ep;
        if (shotTime === undefined) delete s.time; else s.time = shotTime;
        const t = s.t0 + s.dur / 2; await window.renderAt(t); return t;
      }, { ep, shotTime });
      const png = await pg.locator((await pg.locator('#root').count()) ? '#root' : 'canvas').first().screenshot({ type: 'png' });
      return tyLeToi(await docAnh(pg, png, 135, 240));
    };
    const goc = await toi(undefined, undefined);
    const dem = await toi('dem', undefined);
    const shotThang = await toi('dem', 'trua');
    const trua = await toi(undefined, 'trua');
    assert.ok(dem > goc, `episode dem ${dem} <= gốc ${goc}`);
    assert.equal(shotThang, trua, 'shot.time phải thắng EPISODE.time');
    assert.equal(await toi(undefined, undefined), goc, 'bỏ time khỏi episode thì về như cũ');
  } finally { await pg.close(); }
});
