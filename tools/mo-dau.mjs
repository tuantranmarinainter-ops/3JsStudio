#!/usr/bin/env node
// mo-dau.mjs — cổng "mở đầu" (hook) cho 3 giây đầu của MP4 đã xuất. Chỉ phân tích âm thanh.
//   node tools/mo-dau.mjs <file.mp4> [--json]
// Lọc 250–5000 Hz, mono 16 kHz, cửa sổ 20 ms → RMS dBFS.
//   Khởi âm = cửa sổ đầu tiên mà 2 cửa sổ liên tiếp ≥ -36 dBFS; phải ≤ 100 ms.
//   Lặng = chuỗi cửa sổ < -44 dBFS; cờ nếu một chuỗi > 600 ms.
// Thoát 0 = đạt, 2 = cần xem lại (needs_review), 1 = lỗi chạy. In kèm sha256 của file.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SR = 16000, WIN_MS = 20, SECONDS = 3;
export const ONSET_DB = -36, ONSET_MAX_MS = 100, SILENCE_DB = -44, SILENCE_MAX_MS = 600;

// samples: Int16Array / mảng số (thang ±32768 hoặc ±1 nếu float=true) → mảng RMS dBFS mỗi cửa sổ
export function rmsDb(samples, { sr = SR, winMs = WIN_MS, float = false } = {}) {
  const n = Math.round(sr * winMs / 1000), out = [], scale = float ? 1 : 32768;
  for (let i = 0; i + n <= samples.length; i += n) {
    let s = 0;
    for (let j = i; j < i + n; j++) { const v = samples[j] / scale; s += v * v; }
    const r = Math.sqrt(s / n);
    out.push(r > 1e-9 ? 20 * Math.log10(r) : -120);
  }
  return out;
}

// Trả { onsetMs|null, silences:[{fromMs,toMs,ms}], flags:[...], status }
export function phanTich(db, { winMs = WIN_MS } = {}) {
  const flags = [];
  let onset = null;
  for (let i = 0; i + 1 < db.length; i++) if (db[i] >= ONSET_DB && db[i + 1] >= ONSET_DB) { onset = i * winMs; break; }
  const silences = [];
  for (let i = 0; i < db.length;) {
    if (db[i] < SILENCE_DB) {
      let j = i; while (j < db.length && db[j] < SILENCE_DB) j++;
      silences.push({ fromMs: i * winMs, toMs: j * winMs, ms: (j - i) * winMs });
      i = j;
    } else i++;
  }
  if (onset === null) flags.push('KHONG_CO_KHOI_AM');
  else if (onset > ONSET_MAX_MS) flags.push(`KHOI_AM_TRE(${onset}ms>${ONSET_MAX_MS}ms)`);
  for (const s of silences) if (s.ms > SILENCE_MAX_MS) flags.push(`LANG_DAI(${s.fromMs}-${s.toMs}ms)`);
  return { onsetMs: onset, silences, flags, status: flags.length ? 'needs_review' : 'pass' };
}

export function docPcm(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-t', String(SECONDS), '-i', file, '-vn', '-ac', '1', '-ar', String(SR),
    '-af', 'highpass=f=250,lowpass=f=5000', '-f', 's16le', '-'], { maxBuffer: 1 << 26 });
  if (r.error || r.status !== 0) throw new Error('ffmpeg lỗi: ' + (r.error?.message || String(r.stderr).trim().split('\n').pop()));
  const b = r.stdout;
  return new Int16Array(b.buffer, b.byteOffset, Math.floor(b.length / 2));
}

export const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

export function kiemMoDau(file) {
  const pcm = docPcm(file);
  const db = rmsDb(pcm);
  const kq = db.length ? phanTich(db) : { onsetMs: null, silences: [], flags: ['KHONG_CO_AM_THANH'], status: 'needs_review' };
  return { file, sha256: sha256(file), windows: db.length, ...kq };
}

export function baoCao(r) {
  const L = [`Mở đầu 3 s: ${r.file}`, `  sha256 ${r.sha256}`];
  L.push(`  khởi âm: ${r.onsetMs === null ? 'không có' : r.onsetMs + ' ms'} (ngưỡng ≤ ${ONSET_MAX_MS} ms, ≥ ${ONSET_DB} dBFS ×2 cửa sổ)`);
  const dai = r.silences.filter((s) => s.ms > SILENCE_MAX_MS);
  L.push(`  lặng > ${SILENCE_MAX_MS} ms (< ${SILENCE_DB} dBFS): ${dai.length ? dai.map((s) => `${s.fromMs}-${s.toMs}ms`).join(', ') : 'không'}`);
  L.push(r.status === 'pass' ? '  ✔ ĐẠT' : '  ⚠ CẦN XEM LẠI: ' + r.flags.join(' '));
  return L.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), f = a.find((x) => !x.startsWith('--'));
  if (!f || !existsSync(f)) { console.error('Dùng: node tools/mo-dau.mjs <file.mp4> [--json]'); process.exit(1); }
  try {
    const r = kiemMoDau(resolve(f));
    console.log(a.includes('--json') ? JSON.stringify(r, null, 1) : baoCao(r));
    process.exit(r.status === 'pass' ? 0 : 2);
  } catch (e) { console.error('✘ ' + e.message); process.exit(1); }
}
