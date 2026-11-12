import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TOOL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'ghi-cong.mjs');
const NL = String.fromCharCode(10);
const w = (root, rel, s) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof s === 'string' ? s : JSON.stringify(s)); };

// "Tập giả" + CREDITS giả + manifest giả, trong thư mục tạm tên có task18
function taoGoc({ credits = true, sky = false, deep = false } = {}) {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'task18-'));
  w(r, 'assets/manifest.json', [
    { id: 'polyfork/aaa-model-111', source: 'polyfork.dev/asset/aaa-model-111', license: 'CC BY 4.0 (mesh)', credit: 'AAA Model by Polyfork (https://polyfork.dev/asset/aaa-model-111), CC BY 4.0', title: 'AAA Model' },
    { id: 'polyfork/env-thing-222', source: 'polyfork.dev/asset/env-thing-222', license: 'CC BY 4.0 (mesh)', credit: 'Env Thing by Polyfork (https://polyfork.dev/asset/env-thing-222), CC BY 4.0', title: 'Env Thing' },
    { id: 'polyfork/unused-thing-333', source: 'polyfork.dev/asset/unused-thing-333', license: 'CC BY 4.0 (mesh)', credit: 'Unused Thing by Polyfork (https://polyfork.dev/asset/unused-thing-333), CC BY 4.0', title: 'Unused Thing' },
    { id: 'kit/tree_a', source: 'kenney.nl/assets/nature-kit', license: 'CC0' },
    { id: 'poly/unused_plant', source: 'polyhaven.com/a/unused_plant', license: 'CC0', title: 'Unused Plant' },
  ]);
  w(r, 'episodes/t18/shots.js', "export const SHOTS = [{ id: 's001', dur: 1, env: 'forest', props: ['polyfork/aaa-model-111', 'kit/tree_a'] }];");
  w(r, 'episodes/t18/episode.js', "export const EPISODE = { id: 't18' };");
  w(r, 'engine/envs/forest.js', "const x = pf('env-thing-222', 1);");
  w(r, 'episodes/t18/sfx/layers.json', { nen: { map: { forest: 'wind howl' } } });
  w(r, 'episodes/t18/music/plan.json', { segments: [{ from: 0, to: 3, track: 'song_a' }] });
  w(r, 'assets/sfx/sfx_manifest.json', {
    'wind howl': { title: 'Wind Howl Loop', creator: 'WindMaker', license: 'by', source_url: 'https://freesound.org/people/WindMaker/sounds/111' },
    'dog bark': { title: 'Dog Bark Unused', creator: 'BarkGuy', license: 'by', source_url: 'https://freesound.org/people/BarkGuy/sounds/222' },
  });
  w(r, 'assets/music/music_manifest.json', {
    song_a: { title: 'Song Alpha', creator: 'Band Alpha', license: 'by', license_url: 'https://creativecommons.org/licenses/by/3.0/', source_url: 'https://www.jamendo.com/track/1' },
    song_b: { title: 'Song Beta Unused', creator: 'Band Beta', license: 'by', source_url: 'https://www.jamendo.com/track/2' },
  });
  if (credits) {
    w(r, 'assets/polyfork/CREDITS.md', '# Polyfork\n\n- AAA Model by Polyfork (https://polyfork.dev/asset/aaa-model-111), CC BY 4.0\n- Env Thing by Polyfork (https://polyfork.dev/asset/env-thing-222), CC BY 4.0\n- Unused Thing by Polyfork (https://polyfork.dev/asset/unused-thing-333), CC BY 4.0\n');
    w(r, 'assets/sfx/CREDITS.md', '## CC BY 4.0\n\n"Wind Howl Loop" by WindMaker (https://freesound.org/people/WindMaker/sounds/111), licensed under CC BY 4.0\n"Dog Bark Unused" by BarkGuy (https://freesound.org/people/BarkGuy/sounds/222), licensed under CC BY 4.0\n');
    w(r, 'assets/music/CREDITS.md', '- "Song Alpha" by Band Alpha (https://www.jamendo.com/track/1), licensed under BY (https://creativecommons.org/licenses/by/3.0/)\n- "Song Beta Unused" by Band Beta (https://www.jamendo.com/track/2), licensed under BY (https://creativecommons.org/licenses/by/3.0/)\n');
  }
  if (sky) {
    fs.appendFileSync(path.join(r, 'episodes/t18/shots.js'), NL + "export const X = { skybox: 'sky-2' };");
    w(r, 'assets/sky/CREDITS.md', ['# Bầu trời', '', '| Bộ | Nguồn | Ghi chú |', '|---|---|---|',
      '| `sky-2/` (bk, dn, ft) | Người dùng gửi, từ Roblox Sky | Nguồn/giấy phép do người dùng chịu trách nhiệm. |',
      '| `sky-3/` (bk, dn, ft) | Người dùng gửi, từ Roblox Sky | Nguồn/giấy phép do người dùng chịu trách nhiệm. |', ''].join(NL));
  }
  if (deep) {
    // env → a.js → b.js → c.js (3 tầng import) mới nhắc tới asset
    w(r, 'engine/envs/forest.js', ["import { a } from '../a.js';", "const x = pf('env-thing-222', 1);"].join(NL));
    w(r, 'engine/a.js', ["import { b } from './b.js';", 'export const a = 1;'].join(NL));
    w(r, 'engine/b.js', ["import { c } from './c.js';", "import './a.js';   // vòng lặp", 'export const b = 1;'].join(NL));
    w(r, 'engine/c.js', "export const c = pf('deep-thing-444');");
    const m = JSON.parse(fs.readFileSync(path.join(r, 'assets/manifest.json'), 'utf8'));
    m.push({ id: 'polyfork/deep-thing-444', source: 'polyfork.dev/asset/deep-thing-444', license: 'CC BY 4.0 (mesh)', credit: 'Deep Thing by Polyfork (https://polyfork.dev/asset/deep-thing-444), CC BY 4.0', title: 'Deep Thing' });
    w(r, 'assets/manifest.json', m);
  }
  return r;
}
const chay = (goc, ...more) => spawnSync(process.execPath, [TOOL, 't18', '--goc', goc, ...more], { encoding: 'utf8', timeout: 120000 });
const rong = (png) => { const b = fs.readFileSync(png); assert.equal(b.toString('latin1', 1, 4), 'PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('ghi-cong: CC BY của asset được dùng có mặt, asset không dùng vắng, ảnh 1080x1920, chữ >= 28px', () => {
  const g = taoGoc();
  const r = chay(g);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const txt = fs.readFileSync(path.join(g, 'episodes/t18/ghi-cong.txt'), 'utf8');
  for (const s of ['AAA Model', 'Env Thing', 'Wind Howl Loop', 'WindMaker', 'Song Alpha', 'Band Alpha', 'jamendo.com/track/1', 'CC BY'])
    assert.ok(txt.includes(s), 'thiếu: ' + s + '\n' + txt);
  for (const s of ['Unused', 'BarkGuy', 'Band Beta']) assert.ok(!txt.includes(s), 'không được có: ' + s);
  assert.match(txt, /Kenney — CC0/);
  assert.ok(!/Poly Haven/.test(txt), 'nguồn CC0 không dùng không xuất hiện');
  assert.match(txt, /fwjelaa \(FWJ STUDIOS\)/);
  assert.match(txt, /three\.js[^\n]*MIT/); assert.match(txt, /GSAP/); assert.match(txt, /mp4-muxer[^\n]*MIT/);
  assert.ok(txt.indexOf('Mô hình & hình ảnh') < txt.indexOf('Âm thanh & nhạc') && txt.indexOf('Âm thanh & nhạc') < txt.indexOf('Công cụ & phương pháp'));
  assert.deepEqual(rong(path.join(g, 'episodes/t18/ghi-cong.png')), [1080, 1920]);
  const j = JSON.parse(fs.readFileSync(path.join(g, 'episodes/t18/ghi-cong.json'), 'utf8'));
  assert.ok(j.minFontPx >= 28, 'minFontPx=' + j.minFontPx);
  assert.equal(j.width, 1080); assert.equal(j.height, 1920);
});

test('ghi-cong: thiếu file CREDITS vẫn không chết (dùng manifest)', () => {
  const g = taoGoc({ credits: false });
  const r = chay(g);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const txt = fs.readFileSync(path.join(g, 'episodes/t18/ghi-cong.txt'), 'utf8');
  assert.ok(txt.includes('AAA Model') && txt.includes('Song Alpha') && txt.includes('Wind Howl Loop'));
  assert.ok(!txt.includes('Unused'));
});

test('ghi-cong: quá nhiều dòng mà không vừa khung → thoát 1 kèm thông báo', () => {
  const g = taoGoc();
  const man = JSON.parse(fs.readFileSync(path.join(g, 'assets/manifest.json'), 'utf8'));
  const ids = [];
  for (let i = 0; i < 400; i++) {
    man.push({ id: `polyfork/many-${i}-abcdef`, source: `polyfork.dev/asset/many-${i}`, license: 'CC BY 4.0', title: `Many Model ${i}`, author: `Author Number ${i}` });
    ids.push(`polyfork/many-${i}-abcdef`);
  }
  fs.writeFileSync(path.join(g, 'assets/manifest.json'), JSON.stringify(man));
  fs.writeFileSync(path.join(g, 'episodes/t18/shots.js'), `export const SHOTS = [{ id: 's001', props: ${JSON.stringify(ids)} }];`);
  const r = chay(g);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /tràn|không vừa/);
});

test('ghi-cong: sky không ghi giấy phép mà tập dùng → mã 3, chuaRo, khối # cuối .txt, PNG vẫn đủ', () => {
  const g = taoGoc({ sky: true });
  const r = chay(g);
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stderr, /⚠ CHƯA RÕ GIẤY PHÉP — cần người dùng xác nhận trước khi đăng/);
  assert.match(r.stderr, /sky-2/);
  assert.ok(!/sky-3/.test(r.stderr), 'sky-3 không dùng');
  const j = JSON.parse(fs.readFileSync(path.join(g, 'episodes/t18/ghi-cong.json'), 'utf8'));
  assert.equal(j.chuaRo.length, 1);
  assert.equal(j.chuaRo[0].ten, 'sky-2'); assert.match(j.chuaRo[0].nguon, /sky[\/]CREDITS.md/); assert.ok(j.chuaRo[0].lyDo);
  const lines = fs.readFileSync(path.join(g, 'episodes/t18/ghi-cong.txt'), 'utf8').split(NL);
  const hi = lines.findIndex((l) => l.startsWith('# CHƯA RÕ GIẤY PHÉP (xoá khối này khi đã xác nhận; không dán lên YouTube)'));
  assert.ok(hi > 0, 'thiếu khối chưa rõ');
  assert.ok(lines.slice(hi).filter((l) => l.trim()).every((l) => l.startsWith('#')));
  assert.ok(lines.slice(hi).some((l) => l.includes('sky-2')));
  assert.ok(!lines.slice(0, hi).some((l) => l.includes('sky-2')), 'phần dán được không nhắc sky-2');
  assert.deepEqual(rong(path.join(g, 'episodes/t18/ghi-cong.png')), [1080, 1920]);
  const r2 = chay(g, '--cho-phep-chua-ro');
  assert.equal(r2.status, 0, r2.stdout + r2.stderr);
  assert.match(r2.stderr, /⚠ CHƯA RÕ GIẤY PHÉP/);
});

test('ghi-cong: phần dán được chỉ có 1 dòng # chú thích đầu; không chưa rõ → chuaRo rỗng', () => {
  const g = taoGoc();
  assert.equal(chay(g).status, 0);
  const lines = fs.readFileSync(path.join(g, 'episodes/t18/ghi-cong.txt'), 'utf8').split(NL);
  assert.equal(lines[0], '# Dán toàn bộ phần dưới vào mô tả video (ảnh cuối phim chỉ ghi tác giả + giấy phép).');
  assert.equal(lines.filter((l) => l.startsWith('#')).length, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(g, 'episodes/t18/ghi-cong.json'), 'utf8')).chuaRo, []);
});

test('ghi-cong: asset CC BY nạp qua 3 tầng import (có vòng lặp) vẫn được ghi công', () => {
  const g = taoGoc({ deep: true });
  const r = chay(g);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(fs.readFileSync(path.join(g, 'episodes/t18/ghi-cong.txt'), 'utf8').includes('Deep Thing'));
});

test('ghi-cong --help nêu ý nghĩa mã thoát 3', () => {
  const r = spawnSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /3/); assert.match(r.stdout, /--cho-phep-chua-ro/);
});
