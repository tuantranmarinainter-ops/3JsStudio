// E2E fix C: kịch bản giả (rút từ ep002) → storyboard.py → shot-gen → trang thật (episodes/_template/index.html) trong trình duyệt:
// __ready, renderAt giữa mỗi shot không ném, đạo cụ obj/read nằm trong khung + đang hiện, vật cầm gắn vào tay, đạo cụ không lạc nơi.
// Tập giả episodes/_test_c_e2e (xoá khi xong). Gấu (bear=1) / Gà (ga=1): engine/cast.js hiện dựng thành R15 người (TODO khi có engine/bear.js).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { launchBrowser } from '../browser.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const EP = '_test_c_e2e', epDir = path.join(root, 'episodes', EP);
const HEAD = 'title: e2e C\nseed: 21\nkiem_tong: off\nactor hero: ga=1\nactor baker: shirt=#ffffff pants=#795548\n'
  + 'actor bap: bear=1 bow=#2e86de\nactor bear2: bear=1 bow=#e74c3c\nactor bear3: bear=1 bow=#f1c40f\nplace bakery: 18, -6\n\n'
  + '| id | khung | giây | lời kể | loại | ai | cùng | ở đâu | hành động | mặt | máy quay | chữ | tiếng động | giờ | thời tiết | vật cần đọc | tư thế | tối thiểu | ghi chú |\n'
  + '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
const r = (...c) => '| ' + c.join(' | ') + ' |\n';
const BODY = r('1', '', '1,5', 'Ở thị trấn này, đồ đạc liên tục biến mất,', 'establish', '', '', 'street', '', '', 'lia chậm, kéo ra', '', '', 'sang', 'nang', '', '', '', '')
  + r('2', '', '1,5', '^', 'insert', '', '', 'home', '', '', 'đẩy vào', '', '', 'sang', 'nang', '', '', '', 'obj:ke_trong — kệ trống, vết bụi hình món đồ')
  + r('3', '', '1,4', 'Ban đầu là két tiền của chú bán bánh.', 'reaction', 'baker', '', 'bakery', 'scared', 'surprised', 'đẩy vào', '', '', 'sang', 'nang', '', '', '', '')
  + r('4', '', '1,5', 'Chỉ trong một tuần,', 'insertRead', '', '', 'square', '', '', 'đẩy vào', '7 ngày', '', 'trua', 'nang', 'bảng tin thị trấn', '', '', 'bảng tin dán kín giấy báo mất')
  + r('5', '', '1,4', 'Tối đó, tôi đặt cái đồng hồ lên kệ.', 'insert', '', '', 'bedroom', '', '', 'đẩy vào', '', '', 'dem', 'may', '', '', '', 'obj:dong_ho trên kệ')
  + r('6', '', '1,2', 'Là Bắp.', 'closeup', 'bap', '', 'bedroom', 'idle', '', 'đẩy vào', 'Bắp', '', 'dem', 'may', '', 'sitting', '1,2', '')
  + r('7', '', '1,1', 'Nó ôm cái đồng hồ.', 'insert', 'bap', '', 'bedroom', 'hug', '', 'đẩy vào', '', '', 'dem', 'may', '', 'standing', '', 'Bắp ôm đồng hồ')
  + r('8', '', '1,4', 'Qua ngã ba, hai con gấu khác nhập vào.', 'walkBy', 'bears', '', 'crossroad', 'run', '', 'lia', '', '', 'dem', 'nang', '', 'standing', '', 'Bắp + gấu2 + gấu3');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.bin': 'application/octet-stream', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.hdr': 'application/octet-stream', '.ktx2': 'application/octet-stream', '.webp': 'image/webp' };
let srv, port;

before(async () => {
  fs.rmSync(epDir, { recursive: true, force: true }); fs.mkdirSync(epDir, { recursive: true });
  fs.writeFileSync(path.join(epDir, 'kich-ban.md'), HEAD + BODY);
  srv = createServer(async (req, res) => {
    try {
      const p = path.resolve(path.join(root, decodeURIComponent(req.url.split('?')[0])));
      if (path.relative(root, p).startsWith('..')) throw 0;
      const b = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  await new Promise((ok) => srv.once('listening', ok));
  port = srv.address().port;
});
after(() => { srv?.close(); fs.rmSync(epDir, { recursive: true, force: true }); });

test('e2e: kịch bản → shot-gen → trang: renderAt mọi shot, đạo cụ trong khung, vật cầm trên tay', { timeout: 420000 }, async () => {
  const sg = spawnSync(process.execPath, [path.join(root, 'tools', 'shot-gen.mjs'), EP, '--force'], { cwd: root, encoding: 'utf8', timeout: 120000 });
  assert.equal(sg.status, 0, sg.stdout + sg.stderr);
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
    const loi = [];
    page.on('pageerror', (e) => loi.push(String(e?.message || e)));
    await page.goto(`http://localhost:${port}/episodes/${EP}/index.html`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
    const kq = await page.evaluate(async () => {
      const out = [], list = window.__shots.list, props = window.__props, dat = window.__datDaoCu, cam = window.__stage.camera;
      const hien = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
      for (const s of list) {
        const t = (s.t0 + s.t1) / 2;
        let err = null;
        try { await window.renderAt(t); } catch (e) { err = String(e?.message || e); }
        const row = { id: s.id, env: s.env, err, vis: Object.keys(props).filter((n) => hien(props[n])), vat: null, tay: null };
        const ten = s.obj || s.read;
        if (ten && props[ten]) {
          const o = props[ten], V = o.position.constructor, p = new V();
          o.updateWorldMatrix(true, false); o.getWorldPosition(p); p.y += dat[ten].look[1];
          cam.updateMatrixWorld(); p.project(cam);
          row.vat = { ten, hien: hien(o), x: p.x, y: p.y, z: p.z };
        }
        for (const [who, c] of Object.entries(s.cast || {})) if (c?.hold && props[c.hold]) {
          let a = props[c.hold].parent, chain = [];
          while (a) { chain.push(a.name); a = a.parent; }
          row.tay = { who, vat: c.hold, chain: chain.slice(0, 6).join('<'), hien: hien(props[c.hold]) };
        }
        out.push(row);
      }
      return out;
    });
    assert.deepEqual(loi, [], 'lỗi trang: ' + loi.join(' | '));
    const by = Object.fromEntries(kq.map((k) => [k.id, k]));
    for (const k of kq) assert.equal(k.err, null, `${k.id}: renderAt ném ${k.err}`);
    for (const id of ['s002', 's004', 's005']) {
      const v = by[id].vat;
      assert.ok(v, id + ': không có đạo cụ obj/read');
      assert.ok(v.hien, `${id}: ${v.ten} bị ẩn`);
      assert.ok(Math.abs(v.x) < 0.9 && Math.abs(v.y) < 0.9 && v.z < 1, `${id}: ${v.ten} ngoài khung (${v.x.toFixed(2)}, ${v.y.toFixed(2)}, z ${v.z.toFixed(3)})`);
    }
    assert.ok(!by.s001.vis.includes('ke_trong') && !by.s001.vis.includes('dong_ho'), 's001 (phố) lẫn đạo cụ nơi khác: ' + by.s001.vis);
    assert.ok(!by.s003.vis.includes('bang_tin'), 's003 (tiệm bánh) không được thấy bảng tin quảng trường');
    assert.ok(by.s006.vis.includes('dong_ho'), 's006 cùng khối cảnh phòng phải thấy đồng hồ: ' + by.s006.vis);
    assert.ok(by.s007.tay && by.s007.tay.hien && /Hand|Arm/i.test(by.s007.tay.chain), 's007: đồng hồ phải trên tay Bắp: ' + JSON.stringify(by.s007.tay));
    assert.equal(by.s005.env, 'bedroom'); assert.equal(by.s008.env, 'kenneyTown');
  } finally { await browser.close(); }
});
