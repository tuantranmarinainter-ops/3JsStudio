// sfx.mjs — Xuất bộ âm thanh sinh bằng code (engine/sfx.js) ra assets/sfx/*.wav để HyperFrames dùng.
//   node tools/sfx.mjs                 → mọi âm, footstep có 4 biến thể (footstep_0..3)
//   node tools/sfx.mjs pop ding:3      → chỉ các âm chỉ định; "ding:3" = 3 biến thể
// Tất định: chạy lại ra file giống hệt từng byte (seed = tên + biến thể).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSfx, toWav, SFX_LIST, SR } from '../engine/sfx.js';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx');
mkdirSync(out, { recursive: true });
const DEFAULT_VARIANTS = { footstep: 4 };
const jobs = process.argv.slice(2).length
  ? process.argv.slice(2).map((a) => { const [n, v] = a.split(':'); return [n, +(v || 1)]; })
  : SFX_LIST.map((n) => [n, DEFAULT_VARIANTS[n] || 1]);

for (const [name, count] of jobs) {
  for (let v = 0; v < count; v++) {
    const pcm = renderSfx(name, v);
    const file = count > 1 ? `${name}_${v}.wav` : `${name}.wav`;
    writeFileSync(join(out, file), toWav(pcm));
    console.log(`${file.padEnd(16)} ${(pcm.length / SR).toFixed(2)}s`);
  }
}
