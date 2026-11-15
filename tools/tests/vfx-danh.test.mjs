// VFX đánh nhau: mọi ô mặc định TẮT (tập cũ không đổi), có nhãn, đã nối vào danh sách __autoFx; mã không dùng Math.random/giờ thực.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const post = readFileSync(new URL('../../engine/post.js', import.meta.url), 'utf8');
const src = readFileSync(new URL('../../engine/fx-danh.js', import.meta.url), 'utf8');
const KEYS = ['vfxAura', 'vfxBeam', 'vfxHitSpark', 'vfxSpeedLines', 'vfxShake'];
test('ô VFX đánh nhau mặc định tắt, có nhãn, nối __autoFx', () => {
  for (const k of KEYS) {
    assert.ok(post.slice(post.indexOf('FX_DEFAULTS ='), post.indexOf('FX_LABELS')).includes(`${k}: false`), k + ' phải mặc định false');
    assert.ok(post.slice(post.indexOf('FX_LABELS =')).includes(`  ${k}: '`), k + ' thiếu nhãn');
    assert.ok(post.includes(`'${k}'`), k + ' chưa vào danh sách AF');
  }
});
test('fx-danh.js tất định (không Math.random / Date / rAF)', () => {
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /Math\.random|Date\.now|performance\.now|requestAnimationFrame/);
});
