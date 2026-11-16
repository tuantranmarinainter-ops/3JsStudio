// Đọc file góp ý do nút "Gửi góp ý" trong trình phát tạo ra (feedback/gop-y_*.json).
//   node tools/feedback.mjs [file.json | --latest]    (mặc định = file mới nhất)
// In danh sách đánh số (frame, giây, shot, lời ghi chú) và ghi ảnh từng ghi chú ra feedback/<tên>/<nn>_f<frame>.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'feedback');
let arg = process.argv[2];
if (!arg || arg === '--latest') {
  const all = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^gop-y.*\.json$/i.test(f)) : [];
  if (!all.length) { console.error('Chưa có file góp ý nào trong ' + dir); process.exit(1); }
  all.sort((a, b) => fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs);
  arg = path.join(dir, all[0]);
} else if (!fs.existsSync(arg) && fs.existsSync(path.join(dir, arg))) arg = path.join(dir, arg);

const data = JSON.parse(fs.readFileSync(arg, 'utf8'));
const name = path.basename(arg).replace(/\.json$/i, '');
const out = path.join(dir, name);
fs.mkdirSync(out, { recursive: true });
const notes = data.notes || [];
console.log(`Góp ý: ${path.basename(arg)} · tập ${data.episode || '?'} · ${notes.length} ghi chú · ${data.created || ''}\n`);
notes.forEach((n, i) => {
  const nn = String(i + 1).padStart(2, '0');
  let file = '';
  const m = /^data:image\/png;base64,(.+)$/.exec(n.img || '');
  if (m) { file = path.join(out, `${nn}_f${n.frame}.png`); fs.writeFileSync(file, Buffer.from(m[1], 'base64')); }
  console.log(`${nn}. shot ${n.shotId || '?'}${n.scope ? (n.scope === 'shot' ? ` [CẢ SHOT, frame ${n.shotF0}–${n.shotF1}]` : ' [đúng khung]') : ''} · frame ${n.frame}${n.frameInShot ? ` (khung ${n.frameInShot}/${n.shotFrames} của shot)` : ''} · ${Number(n.t).toFixed(2)}s`);
  console.log(`    ${n.text ? n.text.replace(/\n/g, '\n    ') : '(chỉ có nét vẽ, xem ảnh)'}`);
  if (file) console.log(`    ảnh: ${file}`);
});
// góp ý trong khung 3D (engine/che-do-3d-sua.js): ghim mô tả + vật đã thử dời/xoay/cỡ (số trước → sau, chưa ghi vào tập)
const g3 = data.ghiChu3d, anh3 = (img, ten) => { const m = /^data:image\/(jpeg|png);base64,(.+)$/.exec(img || ''); if (!m) return ''; const f = path.join(out, `${ten}.${m[1] === 'png' ? 'png' : 'jpg'}`); fs.writeFileSync(f, Buffer.from(m[2], 'base64')); return f; };
if (g3 && (g3.ghim?.length || g3.vat?.length)) {
  console.log(`
— 3D: ${g3.ghim?.length || 0} ghim · ${g3.vat?.length || 0} vật đã sửa thử —`);
  for (const g of g3.ghim || []) {
    const f = anh3(g.img, `3d_ghim${g.so}`);
    console.log(`📍${g.so}. shot ${g.shotId || '?'} · ${g.t != null ? Number(g.t).toFixed(2) + 's' : ''}${g.frame != null ? ' · frame ' + g.frame : ''} · điểm (${g.pos.join(', ')})${g.vat ? ' trên ' + g.vat : ''}`);
    console.log(`    ${g.text || '(chưa mô tả)'}`); if (f) console.log(`    ảnh 3D: ${f}`);
  }
  (g3.vat || []).forEach((v, i) => {
    const f = anh3(v.img, `3d_vat${i + 1}`);
    const LOAI = { xoa: '🗑 XOÁ', banSao: '⧉ THÊM BẢN SAO', sua: '✥ SỬA' };
    console.log(`${i + 1}. [${LOAI[v.loai || 'sua']}] ${v.path}${v.nguon ? ' (sao từ ' + v.nguon + ')' : ''}${v.shotId ? ' · shot ' + v.shotId : ''}${v.frame != null ? ' · frame ' + v.frame : ''}`);
    if (v.loai === 'xoa') { if (v.text) console.log(`    ${v.text}`); if (f) console.log(`    ảnh 3D: ${f}`); return; }
    console.log(`    vị trí ${v.truoc.pos.join(', ')} → ${v.sau.pos.join(', ')} (dời ${v.lech.pos.join(', ')}) · thế giới → ${v.theGioi.sau.join(', ')}`);
    console.log(`    xoay° ${v.truoc.rotDeg.join(', ')} → ${v.sau.rotDeg.join(', ')} · cỡ ${v.truoc.scale.join(', ')} → ${v.sau.scale.join(', ')} (×${v.lech.scaleNhan.join(', ')})`);
    if (v.text) console.log(`    ${v.text}`); if (f) console.log(`    ảnh 3D: ${f}`);
  });
  console.log('    (số là toạ độ cục bộ của vật trong nhóm cha; tìm vật theo đường dẫn tên — sửa ở builder/env tương ứng)');
}
// chỉ chụp lại phân cảnh liên quan (shot chứa từng frame: frame đó + đầu/giữa/cuối shot), không chụp cả phim
if (notes.length) console.log(`\nChụp lại đúng các phân cảnh bị góp ý:\n  node tools/look.mjs episodes/${data.episode || 'ep001'}/index.html --frames ${notes.map((n) => n.frame).join(',')} --out feedback/${path.basename(out)}/chup`);
