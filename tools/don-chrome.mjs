#!/usr/bin/env node
// don-chrome.mjs — liệt kê / dọn Chrome ẩn MỒ CÔI do playwright mở (xem docs/handoff/giam-tai-cpu.md, mục M4).
//   node tools/don-chrome.mjs           chỉ liệt kê
//   node tools/don-chrome.mjs --xoa     tắt cả cây tiến trình của các Chrome mồ côi + xoá hồ sơ tạm của chúng
// Mồ côi = Chrome GỐC (không có --type=) có --remote-debugging-pipe VÀ --user-data-dir là hồ sơ playwright
//   (playwright_chromiumdev_profile-* / playwright_msedgedev_profile-* trong thư mục tạm, hoặc .cache/chrome-profile) mà tiến trình cha
//   không còn / không phải node / sinh sau con (PID bị dùng lại). KHÔNG BAO GIỜ đụng Chrome thường của người dùng.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const HO_SO = /(playwright_(chromiumdev|msedgedev)_profile-[A-Za-z0-9]+|[\/]\.cache[\/]chrome-profile[\/])/i;

/** procs: [{ProcessId, ParentProcessId, Name, CommandLine, Ms}] → [{pid, hoSo, ly}] các gốc mồ côi (hàm thuần, có test). */
export function chromeMoCoi(procs) {
  const theoPid = new Map(procs.map((p) => [p.ProcessId, p]));
  const out = [];
  for (const p of procs) {
    if (!/^(chrome|msedge)(\.exe)?$/i.test(p.Name || '')) continue;
    const c = p.CommandLine || '';
    if (/--type=/.test(c) || !/--remote-debugging-pipe/.test(c)) continue;
    const m = c.match(/--user-data-dir=("([^"]+)"|\S+)/);
    const ud = m ? (m[2] || m[1]) : '';
    if (!HO_SO.test(ud)) continue;   // Chrome thường: không có hồ sơ playwright → bỏ qua
    const cha = theoPid.get(p.ParentProcessId);
    let ly = null;
    if (!cha) ly = 'cha đã chết';
    else if (!/^node(\.exe)?$/i.test(cha.Name || '')) ly = `cha không phải node (${cha.Name})`;
    else if (cha.Ms && p.Ms && cha.Ms > p.Ms) ly = 'PID cha bị dùng lại';
    if (ly) out.push({ pid: p.ProcessId, hoSo: ud, ly });
  }
  return out;
}

const PSH = (() => { const p = process.env.SystemRoot && join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'); return p && existsSync(p) ? p : 'powershell.exe'; })();

const TASKKILL = (() => { const p = process.env.SystemRoot && join(process.env.SystemRoot, 'System32', 'taskkill.exe'); return p && existsSync(p) ? p : 'taskkill'; })();

function lietKe() {
  const r = spawnSync(PSH, ['-NoProfile', '-Command',
    "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine,@{n='Ms';e={if($_.CreationDate){[DateTimeOffset]::new($_.CreationDate).ToUnixTimeMilliseconds()}else{0}}} | ConvertTo-Json -Compress"],
    { encoding: 'utf8', maxBuffer: 1 << 27 });
  if (r.status !== 0) throw new Error('không chạy được Get-CimInstance: ' + (r.stderr || r.status));
  const j = JSON.parse(r.stdout || '[]'); return Array.isArray(j) ? j : [j];
}

/** Dọn khoá hồ sơ PROFILE=1 của tiến trình đã chết. */
export function donKhoaHoSo(root) {
  const base = join(root, '.cache', 'chrome-profile'); let n = 0;
  if (!existsSync(base)) return 0;
  for (const f of readdirSync(base).filter((x) => x.endsWith('.lock'))) {
    let pid = 0; try { pid = Number(readFileSync(join(base, f), 'utf8')); } catch { /* bỏ */ }
    let song = false; try { if (pid) { process.kill(pid, 0); song = true; } } catch (e) { song = e.code === 'EPERM'; }
    if (!song) { try { rmSync(join(base, f), { force: true }); n++; } catch { /* bỏ */ } }
  }
  return n;
}

export function don({ xoa = false, root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), log = console.log } = {}) {
  if (process.platform !== 'win32') { log('don-chrome: chỉ hỗ trợ Windows'); return []; }
  const ds = chromeMoCoi(lietKe());
  if (!ds.length) log('don-chrome: không có Chrome ẩn mồ côi');
  for (const d of ds) {
    log(`don-chrome: PID ${d.pid} (${d.ly}) ${d.hoSo.split(/[\/]/).pop()}`);
    if (xoa) {
      spawnSync(TASKKILL, ['/PID', String(d.pid), '/T', '/F'], { encoding: 'utf8' });
      const ten = d.hoSo.split(/[\/]/).pop();
      if (/^playwright_/.test(ten) && d.hoSo.toLowerCase().startsWith(os.tmpdir().toLowerCase())) { try { rmSync(d.hoSo, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); } catch { /* đang bị khoá, thôi */ } }
    }
  }
  if (xoa) { const k = donKhoaHoSo(root); if (k) log(`don-chrome: gỡ ${k} khoá hồ sơ mồ côi`); }
  else if (ds.length) log('→ thêm --xoa để tắt chúng');
  return ds;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  don({ xoa: process.argv.includes('--xoa') });
}
