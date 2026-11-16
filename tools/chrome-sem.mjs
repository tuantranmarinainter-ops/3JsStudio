// chrome-sem.mjs — semaphore liên tiến trình, TOÀN MÁY: tối đa N Chrome ẩn cùng lúc (xem docs/handoff/giam-tai-cpu.md).
// Mỗi ô = một file khoá o-<i>.lock (tạo bằng 'wx', ghi pid). Ô của tiến trình đã chết được gỡ tự động.
//   CHROME_TOI_DA=<n>  số ô (mặc định 3; GL=swiftshader mặc định 1 vì render bằng CPU nặng hơn nhiều)
//   CHROME_KHOA=0      tắt khoá (chạy tay không muốn chờ)
//   CHROME_CHO=<giây>  chờ ô tối đa (mặc định 1200 = 20 phút), quá thì báo lỗi
//   CHROME_THU_MUC     thư mục khoá (mặc định %LOCALAPPDATA%\3jsstudio\chrome-sem — chung mọi worktree/phiên)
//   CHROME_O_CHA       (tự đặt) pid tiến trình đang giữ ô; tiến trình con chạy lồng thì dùng chung ô đó, không xin thêm → không kẹt.
import { mkdirSync, openSync, writeSync, closeSync, readFileSync, renameSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

export const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

export function thuMucMacDinh() {
  if (process.env.CHROME_THU_MUC) return process.env.CHROME_THU_MUC;
  const goc = process.env.LOCALAPPDATA || join(os.homedir(), '.cache');
  return join(goc, '3jsstudio', 'chrome-sem');
}

export function soODa(env = process.env) {
  const n = parseInt(env.CHROME_TOI_DA || '', 10);
  if (n > 0) return n;
  return env.GL === 'swiftshader' ? 1 : 3;
}

const doc = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };

// Gỡ khoá của tiến trình đã chết. rename (nguyên tử) thay vì rm để hai tiến trình cùng dọn không xoá nhầm khoá mới của nhau.
function goKhoaChet(lock) {
  const k = doc(lock);
  if (k && alive(k.pid)) return false;
  if (!k) {   // file đang được ghi dở? cho 200 ms rồi đọc lại
    const t = Date.now(); while (Date.now() - t < 200) { /* chờ ngắn */ }
    const k2 = doc(lock); if (k2 && alive(k2.pid)) return false;
  }
  const rac = `${lock}.chet.${process.pid}.${Date.now()}`;
  try { renameSync(lock, rac); rmSync(rac, { force: true }); return true; } catch { return false; }
}

export function thuThap(dir) {   // liệt kê ô đang giữ (cho thông báo chờ / test)
  try {
    return readdirSync(dir).filter((f) => /^o-\d+\.lock$/.test(f)).map((f) => ({ o: f, ...doc(join(dir, f)) })).filter((x) => x.pid && alive(x.pid));
  } catch { return []; }
}

/** Xin 1 ô. Trả { tha(), dungChung } — nhớ gọi tha() (cũng tự thả khi tiến trình thoát). */
export async function giuO({ dir = thuMucMacDinh(), toiDa = soODa(), cho = Number(process.env.CHROME_CHO) || 1200, log = (s) => process.stderr.write(s + '\n'), ten = process.argv[1] || 'node' } = {}) {
  if (process.env.CHROME_KHOA === '0') return { tha() {}, dungChung: true };
  const cha = Number(process.env.CHROME_O_CHA);
  if (cha && cha !== process.pid && alive(cha)) return { tha() {}, dungChung: true };   // chạy lồng trong tiến trình đang giữ ô
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now(); let nhacLan = 0;
  for (;;) {
    for (let i = 0; i < toiDa; i++) {
      const lock = join(dir, `o-${i}.lock`);
      for (let thu = 0; thu < 2; thu++) {
        try {
          const fd = openSync(lock, 'wx'); writeSync(fd, JSON.stringify({ pid: process.pid, ten, t: new Date().toISOString() })); closeSync(fd);
          const truoc = process.env.CHROME_O_CHA;
          process.env.CHROME_O_CHA = String(process.pid);
          let xong = false;
          const tha = () => {
            if (xong) return; xong = true;
            try { rmSync(lock, { force: true }); } catch { /* đã mất */ }
            if (truoc === undefined) delete process.env.CHROME_O_CHA; else process.env.CHROME_O_CHA = truoc;
          };
          process.once('exit', tha);
          for (const s of ['SIGINT', 'SIGTERM']) process.once(s, () => { tha(); process.exit(130); });
          return { tha, dungChung: false, lock };
        } catch (e) {
          if (e.code !== 'EEXIST') throw e;
          if (!goKhoaChet(lock)) break;   // ô đang có người dùng thật → sang ô kế
        }
      }
    }
    if ((Date.now() - t0) / 1000 > cho) {
      throw new Error(`Chờ ô Chrome quá ${cho}s (đang dùng: ${thuThap(dir).map((x) => `pid ${x.pid} ${String(x.ten).split(/[\\/]/).pop()}`).join(', ') || '?'}). Đặt CHROME_KHOA=0 để bỏ khoá hoặc CHROME_TOI_DA lớn hơn.`);
    }
    if (Date.now() - t0 >= nhacLan * 15000) {
      if (nhacLan) log(`… đang chờ ô Chrome (tối đa ${toiDa}; đang dùng: ${thuThap(dir).map((x) => `pid ${x.pid} ${String(x.ten).split(/[\\/]/).pop()}`).join(', ') || '?'})`);
      nhacLan++;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}
