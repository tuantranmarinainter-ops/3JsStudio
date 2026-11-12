// Kiểm 5 loại shot mới của engine/shottypes.js (insertRead, houseFull, hug, fall, sinkTilt):
//   - phần thuần (expandShot, không cần trình duyệt): đủ 16 loại, cam hữu hạn, khung đầu ≠ cuối (trừ insertRead);
//   - trang thử engine/shot-lab.html?type=… qua tools/kiem-luat.mjs: houseFull đạt L1 (lề ≥ 5% MỌI khung), insertRead đạt L2, sinkTilt đạt L5.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import { SHOT_TYPE_NAMES, SHOT_TYPES, expandShot, HOUSE } from '../../engine/shottypes.js';
import { kiemShot } from '../kiem/luat.mjs';
import { launchBrowser } from '../browser.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const MOI = ['insertRead', 'houseFull', 'hug', 'fall', 'sinkTilt'];
const places = { square: { pos: [0, 0, 0], ry: 0 }, home: { pos: [20, 0, -8], ry: 0.5 } };
const ctx = { places, crowd: ['crowd1', 'crowd2'], env: 'kenneyTown', light: 'day', fps: 30 };
const T = { timeout: 240000 };

// mọi số trong cam (kể cả mảng lồng) đều hữu hạn
const soHuuHan = (v) => (typeof v === 'number' ? Number.isFinite(v) : Array.isArray(v) ? v.every(soHuuHan) : v && typeof v === 'object' ? Object.values(v).every(soHuuHan) : true);
const nhieuSo = (v) => (typeof v === 'number' ? 1 : Array.isArray(v) ? v.reduce((s, x) => s + nhieuSo(x), 0) : v && typeof v === 'object' ? Object.values(v).reduce((s, x) => s + nhieuSo(x), 0) : 0);
// khoá "x2" khác khoá gốc "x" (hoặc không có gốc) -> camera đổi trong shot
const khacNhau = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
const camDoi = (cam) => Object.keys(cam).some((k) => {
  if (!/2$/.test(k) || k === 'ease') return false;
  const g = k.slice(0, -1);
  return khacNhau(cam[k], cam[g]);
});

const shotMau = {
  insertRead: { id: 'a1', dur: 1.5, type: 'insertRead', read: 'postcard_island', at: 'square' },
  houseFull: { id: 'a2', dur: 1.5, type: 'houseFull', at: 'home', house: { style: 'family', at: [20, -8], ry: 0.5 } },
  hug: { id: 'a3', dur: 1.5, type: 'hug', who: 'hero', with: 'mom', at: 'square' },
  fall: { id: 'a4', dur: 1.2, type: 'fall', who: 'hero', at: 'square' },
  sinkTilt: { id: 'a5', dur: 1.5, type: 'sinkTilt', tilt: 9, sink: 5, at: 'home' },
};

test('đủ 16 loại, có 5 loại mới đúng chữ ký', () => {
  assert.equal(SHOT_TYPE_NAMES.length, 16);
  for (const n of MOI) {
    assert.ok(SHOT_TYPES[n], n);
    assert.equal(typeof SHOT_TYPES[n].doc, 'string', n + '.doc');
    assert.equal(typeof SHOT_TYPES[n].move, 'string', n + '.move');
    assert.equal(typeof SHOT_TYPES[n].make, 'function', n + '.make');
  }
  assert.equal(SHOT_TYPES.insertRead.move, 'static');
  assert.equal(SHOT_TYPES.houseFull.move, 'pan');
});

for (const n of MOI) {
  test(`expandShot ${n}: cam hữu hạn, ${n === 'insertRead' ? 'zoom ≤ 3%' : 'khung đầu ≠ cuối'}`, () => {
    const o = expandShot(shotMau[n], ctx);
    assert.ok(o.cam && nhieuSo(o.cam) > 0, 'có cam');
    assert.ok(soHuuHan(o.cam), 'cam hữu hạn: ' + JSON.stringify(o.cam));
    assert.ok(soHuuHan(o.cast), 'cast hữu hạn');
    if (n === 'insertRead') {
      assert.equal(o.static, true, 'static: true');
      assert.equal(o.cam.at, 'obj:postcard_island');
      for (const [a, b] of [['dist', 'dist2'], ['fov', 'fov2']]) {
        if (o.cam[b] === undefined) continue;
        assert.ok(Math.abs(o.cam[b] / o.cam[a] - 1) <= 0.03 + 1e-9, `${b}/${a} trong 3%`);
      }
      assert.ok(Math.abs((o.cam.yaw2 ?? o.cam.yaw) - o.cam.yaw) < 0.02, 'không lia');
    } else {
      assert.ok(camDoi(o.cam), 'camera phải đổi giữa đầu và cuối: ' + JSON.stringify(o.cam));
      assert.ok(!o.static, 'không đặt static');
    }
  });
}

test('houseFull: lùi theo fov (fov to hơn -> dist nhỏ hơn), có nhà mặc định', () => {
  const a = expandShot(shotMau.houseFull, ctx), b = expandShot({ ...shotMau.houseFull, cam: { fov: 60 } }, ctx);
  // cam ghi đè fov sau khi make nên dist không đổi: kiểm trực tiếp qua make() với fov khác
  const mk = (fov) => SHOT_TYPES.houseFull.make({ P: [0, 0, 0], ry: 0, f: [0, 0, 1], s: [1, 0, 0], who: null, other: null, crowd: [], sh: { id: 'x', fov }, dur: 1, flip: false, pos: () => [0, 0, 0] }).cam;
  assert.ok(mk(40).dist > mk(60).dist);
  assert.ok(a.house && a.house.style, 'house mặc định');
  assert.equal(b.cam.fov, 60);
  assert.ok(a.cam.yaw2 > a.cam.yaw, 'lia ngang');
});

test('hug: 2 người anim hug, zoom out; fall: 1 người, camera hạ + zoom in', () => {
  const h = expandShot(shotMau.hug, ctx);
  assert.deepEqual(Object.keys(h.cast).sort(), ['hero', 'mom']);
  for (const c of Object.values(h.cast)) assert.equal(c.anim, 'hug');
  assert.ok(h.cam.dist2 > h.cam.dist, 'zoom out');
  const f = expandShot(shotMau.fall, ctx);
  assert.deepEqual(Object.keys(f.cast), ['hero']);
  assert.ok(['fall', 'tumble'].includes(f.cast.hero.anim));
  assert.ok(f.cam.h2 < f.cam.h, 'camera hạ theo');
  assert.ok(f.cam.dist2 < f.cam.dist, '1 người -> zoom in');
});

test('sinkTilt: nhà nghiêng + chìm theo tham số, camera zoom out', () => {
  const o = expandShot(shotMau.sinkTilt, ctx);
  assert.ok(o.cam.dist2 > o.cam.dist, 'zoom out');
  assert.ok(o.house, 'có house');
  const roll = o.house.roll, y = o.house.y;
  assert.ok(Array.isArray(roll) && Math.abs(roll[1]) > 0.1, 'nghiêng ~9 độ: ' + JSON.stringify(roll));
  assert.ok(Array.isArray(y) && y[1] === -5, 'chìm 5 stud: ' + JSON.stringify(y));
  // shot ghi house thì gộp đè
  const p = expandShot({ ...shotMau.sinkTilt, house: { style: 'illustration' } }, ctx);
  assert.equal(p.house.style, 'illustration');
  assert.ok(p.house.roll);
});

test('đầu vào xấu: fov/w/fill = 0 và thiếu read/with ném lỗi rõ', () => {
  for (const k of ['fov', 'w', 'fill']) assert.throws(() => expandShot({ ...shotMau.insertRead, [k]: 0 }, ctx), /insertRead/, k);
  assert.throws(() => expandShot({ ...shotMau.houseFull, fov: 0 }, ctx), /fov/);
  assert.throws(() => expandShot({ ...shotMau.sinkTilt, fov: 0 }, ctx), /fov/);
  assert.throws(() => expandShot({ ...shotMau.insertRead, read: undefined }, ctx), /read/);
  assert.throws(() => expandShot({ ...shotMau.hug, with: undefined }, ctx), /with/);
});

test('tích hợp công cụ kiểm: shot dữ liệu qua expandShot vẫn được L2/L5/L11 nhận đúng loại (shotType)', () => {
  const o = expandShot(shotMau.insertRead, ctx);
  assert.equal(o.type, undefined);
  assert.equal(o.shotType, 'insertRead');
  const m = { vat: [{ ten: 'c', vai: 'doc', bbox: [0.2, 0.4, 0.8, 0.6], trongKhung: 1, che: 0 }] };
  const kq = kiemShot({ shot: { id: o.id, shotType: o.shotType, dur: 1.0, static: o.static, read: o.read }, m: [m, m, m], anh: [], env: {} }, JSON.parse(fs.readFileSync(path.join(root, 'tools', 'kiem', 'mac-dinh.json'), 'utf8')));
  assert.ok(!kq.L2.ghiChu || !/khong-phai-insertRead/.test(kq.L2.ghiChu), JSON.stringify(kq.L2));
  assert.equal(kq.L2.ok, true, JSON.stringify(kq.L2));
  assert.equal(kq.L11.nguong, 1.5, 'L11 nhận insertRead (1.5 s)');
  assert.equal(kq.L11.ok, false, 'dur 1.0 < 1.5');
  const st = expandShot(shotMau.sinkTilt, ctx);
  const k2 = kiemShot({ shot: { id: st.id, shotType: st.shotType, dur: 2, static: st.static }, m: [{ vat: [{ ten: 'n', vai: 'nha', bbox: [0.2, 0.3, 0.8, 0.6], trongKhung: 1, nghieng: 7, chim: 0 }] }], anh: [], env: {} }, JSON.parse(fs.readFileSync(path.join(root, 'tools', 'kiem', 'mac-dinh.json'), 'utf8')));
  assert.equal(k2.L5.ok, true, JSON.stringify(k2.L5));
  assert.equal(k2.L11.nguong, 1.0);
});

test('footEvents (engine/shots.js) đọc y dạng [a,b] qua val(), không dùng sp.y thô', () => {
  const src = fs.readFileSync(path.join(root, 'engine', 'shots.js'), 'utf8');
  assert.ok(!/sp\.y \?\? 0/.test(src), 'footEvents còn đọc sp.y thô');
  assert.ok(/val\(sp\.y, kc, 0\)/.test(src));
  assert.ok(!/spec\.y \?\? 0/.test(src), 'placeHouse còn đọc spec.y thô');
});

test('tất định: mở rộng hai lần ra cùng kết quả', () => {
  for (const n of MOI) assert.deepEqual(expandShot(shotMau[n], ctx), expandShot(shotMau[n], ctx));
});

// ---- trang thử (cần Chrome/Edge) ----
function chayLab(type) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'shottypes-'));
  const luuCtx = path.join(d, 'ctx.json'), out = path.join(d, 'kiem');
  const r = spawnSync(process.execPath, ['tools/kiem-luat.mjs', `engine/shot-lab.html?type=${type}`, '--shots', 'all', '--jobs', '1',
    '--khong-anh', '--out', out, '--duyet', path.join(d, 'duyet'), '--luu-ctx', luuCtx, '--cho', '180'],
  { cwd: root, encoding: 'utf8', timeout: 230000 });
  assert.ok(r.status === 0 || r.status === 1, `kiem-luat mã ${r.status}\n${r.stdout}\n${r.stderr}`);
  return { luat: JSON.parse(fs.readFileSync(path.join(out, 'luat.json'), 'utf8')), ctx: JSON.parse(fs.readFileSync(luuCtx, 'utf8')) };
}

test('trang thử houseFull: đạt L1 và lề ≥ 5% ở MỌI khung, đủ 4 chân', T, () => {
  const { luat, ctx: dump } = chayLab('houseFull');
  const ids = Object.keys(luat.shots);
  assert.ok(ids.length >= 2, 'ít nhất 2 shot thử');
  for (const id of ids) {
    const L1 = luat.shots[id].luat.L1;
    assert.equal(L1.ok, true, `${id} L1: ${JSON.stringify(L1)}`);
    assert.equal(L1.val && L1.val.apDung, true, `${id} L1 phải được áp dụng (không miễn): ${JSON.stringify(L1)}`);
    const ms = dump[id].m;
    assert.ok(ms && ms.length === 3, id + ' có __measure 3 khung');
    ms.forEach((m, i) => {
      const nha = m.vat.filter((v) => v.vai === 'nha' && v.bbox), chan = m.vat.filter((v) => v.vai === 'chan-nha' && v.bbox);
      assert.equal(chan.length, 4, `${id} khung ${i}: đủ 4 chân`);
      const bs = [...nha, ...chan].map((v) => v.bbox);
      const b = [Math.min(...bs.map((x) => x[0])), Math.min(...bs.map((x) => x[1])), Math.max(...bs.map((x) => x[2])), Math.max(...bs.map((x) => x[3]))];
      const le = Math.min(b[0], b[1], 1 - b[2], 1 - b[3]);
      assert.ok(le >= 0.05, `${id} khung ${i}: lề ${le.toFixed(3)} < 0.05`);
    });
    assert.equal(luat.shots[id].luat.L4.ok, true, id + ' L4 camera động: ' + JSON.stringify(luat.shots[id].luat.L4));
  }
});

// HOUSE đặt cứng (engine/shottypes.js) phải khớp bbox nhà thật (Box3 trên house_family, nhà đứng thẳng ry=0, legsOut 1, lift 1) trong shot-lab:
// nhà đổi kích thước (vd cầu thang chạm đất kéo dài tới z=35) mà HOUSE không đổi -> camera lùi thiếu -> L1 hụt lề.
test('HOUSE đặt cứng khớp bbox nhà thật trong shot-lab (sai > 3% = đo lại HOUSE)', T, async () => {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    try { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); const b = fs.readFileSync(p); res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
    await page.goto(`http://localhost:${srv.address().port}/engine/shot-lab.html?type=houseFull`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const b = await page.evaluate(async () => {
      const T3 = await import('/vendor/three/three.module.js');
      window.renderAt(0.1);   // shot h1: nhà ry = 0
      const bb = new T3.Box3().setFromObject(window.__stage.scene.getObjectByName('house_family'));
      return { hw: Math.max(-bb.min.x, bb.max.x), hd: Math.max(-bb.min.z, bb.max.z), top: bb.max.y };
    });
    for (const k of ['hw', 'hd', 'top']) {
      const sai = Math.abs(HOUSE[k] - b[k]) / b[k];
      assert.ok(HOUSE[k] >= b[k] && sai <= 0.03, `HOUSE.${k} = ${HOUSE[k]} lệch bbox thật ${b[k].toFixed(2)} (${(sai * 100).toFixed(1)}%) — đo lại HOUSE trong engine/shottypes.js`);
    }
  } finally { await browser.close(); srv.close(); }
});

test('trang thử insertRead: đạt L2 (tâm lệch < 10%), không che', T, () => {
  const { luat, ctx: dump } = chayLab('insertRead');
  for (const [id, s] of Object.entries(luat.shots)) {
    assert.equal(s.luat.L2.ok, true, `${id} L2: ${JSON.stringify(s.luat.L2)}`);
    assert.ok(s.luat.L2.val.lech < 0.1);
    assert.equal(dump[id].shot.static, true);
    assert.equal(dump[id].shot.type, 'insertRead');
  }
});

test('trang thử sinkTilt: đạt L5 + L1 (thấy trọn nhà + chân)', T, () => {
  const { luat, ctx: dump } = chayLab('sinkTilt');
  for (const [id, s] of Object.entries(luat.shots)) {
    assert.equal(s.type, 'sinkTilt', id + ' công cụ phải thấy loại shot qua shotType');
    assert.equal(s.luat.L5.ok, true, `${id} L5: ${JSON.stringify(s.luat.L5)}`);
    assert.equal(s.luat.L1.ok, true, `${id} L1: ${JSON.stringify(s.luat.L1)}`);
    assert.equal(s.luat.L1.val && s.luat.L1.val.apDung, true, `${id} L1 phải áp dụng`);
    for (const m of dump[id].m) assert.equal(m.vat.filter((v) => v.vai === 'chan-nha' && v.bbox).length, 4, id + ': đủ 4 chân mọi khung');
  }
});
