// Tiếng động kiểu blocky cho một tập: đọc shots (cam.bk whip/crash, bfx punch/shake/sign/stamp/icon…, do: jump/clap) → sự kiện → trộn các file
// episodes/<ep>/sfx/blocky/<tên>.wav (bộ 27 tiếng tổng hợp của blocky-shorts) thành episodes/<ep>/sfx_blocky.ogg (1 lớp, bật/tắt trong trình phát).
// Bảng sự kiện → tiếng theo blocky engine.js events(). Dùng: node tools/blocky-tieng.mjs ep003b
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';
import { join, resolve } from 'path';
const ep = process.argv[2]; if (!ep) { console.error('Dùng: node tools/blocky-tieng.mjs <ep>'); process.exit(1); }
const dir = resolve('episodes', ep);
const { SHOTS } = await import(pathToFileURL(join(dir, 'shots.js')).href);
const ev = []; const add = (t, sfx, gain = 1) => ev.push({ t: +t.toFixed(3), sfx, gain });
const ICON = { zzz: 'snore', bulb: 'ding', heart: 'pop_small', star: 'sparkle', anger: 'grr', exclaim: 'alert', question: 'boop', interrobang: 'alert', cross: 'boop', sweat: 'pop_small' };
let t0 = 0;
for (const s of SHOTS) {
  const bk = s.cam?.bk;
  if (bk?.whip) add(t0 + (bk.whip.at ?? 0), 'whoosh');
  if (bk?.crash) { const a = t0 + (bk.crash.at ?? s.dur * .6); add(a - .05, 'whoosh_long'); add(a + (bk.crash.dur ?? .36), 'impact', .8); }
  for (const f of s.bfx || []) {
    const t = t0 + (f.t ?? 0); if (f.sfx === false) continue;
    if (f.sfx) { add(t, f.sfx, f.gain ?? 1); continue; }
    if (f.punch != null) add(t, 'swish', .7);
    else if (f.shake != null) { if ((f.shake === true ? .1 : f.shake) >= .08) add(t, 'impact', Math.min(1, Math.max(.4, f.shake * 7))); }
    else if (f.sign) add(t, 'pop');
    else if (f.stamp) add(t, 'stamp');
    else if (f.icon) add(t, ICON[f.icon] || 'pop_small', .8);
    else if (f.bulb) add(t, 'ding');
    else if (f.sparkle || f.glint) add(t, 'sparkle', .8);
    else if (f.title) add(t, f.style === 'banner' ? 'pop' : 'whoosh');
    else if (f.flash) add(t, 'flash');
    else if (f.say) add(t, 'blip', .7);
  }
  for (const c of Object.values(s.cast || {})) for (const d of c.do || []) {
    const a = t0 + (d.t?.[0] ?? 0);
    if (d.a === 'jump') add(a, 'boing', .7);
    if (d.a === 'clap') add(a + .1, 'clap', .8);
    if (d.a === 'fall' || d.a === 'faint') add(a + .35, 'thud');
  }
  t0 += s.dur;
}
ev.sort((a, b) => a.t - b.t);
writeFileSync(join(dir, 'blocky_events.json'), JSON.stringify({ dur: t0, ev }, null, 1));
console.log(`${ev.length} sự kiện, phim ${t0.toFixed(2)} s`);
// trộn bằng python (numpy) rồi nén ogg bằng ffmpeg
const py = `
import json, wave, numpy as np, sys, os
d = json.load(open(sys.argv[1], encoding='utf-8')); base = sys.argv[2]; SR = 44100
out = np.zeros(int((d['dur'] + 1) * SR), np.float32); cache = {}
def load(n):
    if n not in cache:
        f = os.path.join(base, n + '.wav')
        if not os.path.exists(f): f = os.path.join(base, n + '_1.wav')
        w = wave.open(f); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2: a = a.reshape(-1, 2).mean(1)
        cache[n] = a
    return cache[n]
for e in d['ev']:
    a = load(e['sfx']) * e['gain'] * 0.8; i = int(e['t'] * SR); j = min(len(out), i + len(a)); out[i:j] += a[: j - i]
pk = np.abs(out).max() or 1; out = out / max(1, pk / 0.95)
w = wave.open(sys.argv[3], 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close()
`;
import { mkdirSync } from 'fs';
const tmp = resolve('output/_tmp'); mkdirSync(tmp, { recursive: true });
const pyf = join(tmp, 'blocky_tron.py'), wav = join(tmp, ep + '_blocky.wav'), ogg = join(dir, 'sfx_blocky.ogg');
writeFileSync(pyf, py);
execFileSync('python', ['-I', pyf, join(dir, 'blocky_events.json'), join(dir, 'sfx', 'blocky'), wav], { stdio: 'inherit' });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '4', ogg], { stdio: 'inherit' });
console.log('→', ogg);
