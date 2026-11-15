// PHÁT HÀNH studio lên GitHub để nút "Cập nhật mới nhất" của studio.html tải về (docs/handoff/tach-studio.md, GĐ3).
//   node tools/phat-hanh-studio.mjs [--ghi-chu "Có gì mới"]          → CHẠY THỬ: dựng lõi, in các bước, KHÔNG đẩy gì lên mạng
//   node tools/phat-hanh-studio.mjs --day [--ghi-chu "…"]             → đẩy thật (chỉ khi người dùng bảo)
// Vì tệp đính kèm Release không tải được từ trình duyệt (thiếu CORS), lõi nằm trong nhánh mồ côi `studio-ban` (chỉ 2 file:
// studio-core.js, studio-core.json), mỗi bản một thẻ `studio-v<phiên bản>` + một GitHub Release (ghi chú) trỏ vào thẻ đó.
// Studio đọc: api.github.com/repos/<repo>/releases/latest → tag_name → raw.githubusercontent.com/<repo>/<tag>/studio-core.*
// Không đổi nhánh / thư mục làm việc: commit dựng bằng git hash-object + mktree + commit-tree.
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const day = args.includes('--day');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const notes = opt('ghi-chu', '');

console.log('[1/3] dựng studio + lõi phát hành…');
execFileSync(process.execPath, [join(root, 'tools', 'bundle-studio.mjs'), ...(notes ? ['--ghi-chu', notes] : [])], { stdio: 'inherit' });
const ban = join(root, 'dist', 'studio-ban');
const meta = JSON.parse(readFileSync(join(ban, 'studio-core.json'), 'utf8'));
const tag = `studio-v${meta.version}`;
console.log(`[2/3] bản ${meta.version}: studio-core.js ${(meta.size / 1048576).toFixed(2)} MB, sha256 ${meta.sha256.slice(0, 12)}…, thẻ ${tag}`);

const blobJs = git('hash-object', '-w', join(ban, 'studio-core.js'));
const blobJson = git('hash-object', '-w', join(ban, 'studio-core.json'));
const tree = execFileSync('git', ['mktree'], { cwd: root, encoding: 'utf8',
  input: `100644 blob ${blobJs}\tstudio-core.js\n100644 blob ${blobJson}\tstudio-core.json\n` }).trim();
let parent = ''; try { parent = git('rev-parse', '--verify', '-q', 'refs/heads/studio-ban'); } catch {}
const steps = [
  `git commit-tree ${tree}${parent ? ' -p ' + parent.slice(0, 9) : ''} -m "studio ${meta.version}"  → cập nhật refs/heads/studio-ban`,
  `git tag ${tag} <commit đó>`,
  `git push origin studio-ban ${tag}`,
  `gh release create ${tag} --title "Studio ${meta.version}" --notes "${notes || '(ghi chú)'}"   (đánh dấu Latest)`,
];
if (!day) {
  console.log('[3/3] CHẠY THỬ — sẽ làm các bước sau khi thêm --day:\n  ' + steps.join('\n  '));
  console.log('Repo phải công khai để studio tải được không cần đăng nhập.');
  process.exit(0);
}
console.log('[3/3] đẩy thật…');
const commit = execFileSync('git', ['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', `studio ${meta.version}\n\n${notes}`], { cwd: root, encoding: 'utf8' }).trim();
git('update-ref', 'refs/heads/studio-ban', commit, ...(parent ? [parent] : []));
git('tag', tag, commit);
execFileSync('git', ['push', 'origin', 'refs/heads/studio-ban:refs/heads/studio-ban', `refs/tags/${tag}:refs/tags/${tag}`], { cwd: root, stdio: 'inherit' });
const repo = (opt('repo', null) || git('remote', 'get-url', 'origin').replace(/^.*github.com[:/]/, '').replace(/.git$/, ''));
try { execFileSync('gh', ['release', 'create', tag, '--title', `Studio ${meta.version}`, '--notes', notes || `Studio ${meta.version}`, '--latest', '--verify-tag'], { cwd: root, stdio: 'inherit' }); }
catch (e) { console.log(`(chưa tạo được GitHub Release — máy chưa có gh hoặc chưa đăng nhập. Studio vẫn cập nhật được từ nhánh studio-ban.
 Muốn có trang ghi chú: mở https://github.com/${repo}/releases/new?tag=${tag} và bấm Publish.)`); }
console.log(`Xong: ${tag}. Studio bấm "Cập nhật mới nhất" sẽ thấy bản ${meta.version}.`);
