// chep-gop-y.js — "📋 Copy điều chỉnh": biến góp ý 3D (ghim, vật đã sửa, camera đã sửa) [+ ghi chú 2D] thành CHỮ để dán thẳng cho Claude,
// không cần Xuất file. Ảnh (khung 3D, khoanh đỏ) không chép được — chỉ có trong file Xuất / Gửi tới Claude.
const j = (a) => (Array.isArray(a) ? a.join(', ') : a);
const giay = (t) => (t == null ? '' : ` · ${Number(t).toFixed(2)}s`);

export function vanBanGopY({ g3 = null, notes = [], tieuDe = '', duongDan = '', fps = 30 } = {}) {
  const L = [`GÓP Ý — ${tieuDe || '(không tên)'}${duongDan ? ` (${duongDan})` : ''}`];
  const fr = (t, f) => (f != null ? ` · frame ${f}` : t != null ? ` · frame ${Math.floor(t * fps + 1e-6)}` : '');
  if (notes?.length) {
    L.push('', `— Ghi chú trên khung Phim: ${notes.length} —`);
    notes.forEach((n, i) => L.push(`${i + 1}. shot ${n.shotId || '?'}${giay(n.t)}${fr(n.t, n.frame)}${n.scope ? ' · ' + n.scope : ''}: ${n.text || '(chưa ghi chữ)'}${n.img ? ' [có khoanh đỏ — xem file Xuất]' : ''}`));
  }
  const ghim = g3?.ghim || [], vat = g3?.vat || [], cam = g3?.cam || [];
  if (ghim.length || vat.length || cam.length) L.push('', `— 3D: ${ghim.length} ghim · ${vat.length} vật · ${cam.length} camera (chỉ thử, chưa ghi vào tập) —`);
  for (const g of ghim) L.push(`📍${g.so}. shot ${g.shotId || '?'}${giay(g.t)}${fr(g.t, g.frame)} · điểm (${j(g.pos)})${g.vat ? ' trên ' + g.vat : ''}: ${g.text || '(chưa mô tả)'}`);
  vat.forEach((v, i) => {
    const dau = `${i + 1}. ${{ xoa: '🗑 XOÁ', banSao: '⧉ THÊM BẢN SAO', sua: '✥ SỬA' }[v.loai || 'sua']} ${v.path}${v.nguon ? ' (sao từ ' + v.nguon + ')' : ''}${v.shotId ? ' · shot ' + v.shotId : ''}${fr(v.t, v.frame)}`;
    if (v.loai === 'xoa') { L.push(dau + (v.text ? ': ' + v.text : '')); return; }
    L.push(dau);
    if (v.lech) L.push(`    dời (${j(v.lech.pos)}) · xoay thêm° (${j(v.lech.rotDeg)}) · cỡ × (${j(v.lech.scaleNhan)})${v.hoatHinh ? ' — vật có animation: cộng phần lệch này vào mọi khung' : ''}`);
    if (v.truoc && v.sau) L.push(`    cục bộ: vị trí ${j(v.truoc.pos)} → ${j(v.sau.pos)} · xoay° ${j(v.truoc.rotDeg)} → ${j(v.sau.rotDeg)} · cỡ ${j(v.truoc.scale)} → ${j(v.sau.scale)}${v.theGioi ? ` · thế giới → ${j(v.theGioi.sau)}` : ''}`);
    if (v.text) L.push(`    ${v.text}`);
  });
  cam.forEach((c, i) => {
    L.push(`🎥${i + 1}. CAMERA shot ${c.shotId}${fr(c.t, c.frame)}${c.durDeNghi != null ? ` · độ dài shot ${c.durGoc}s → ${c.durDeNghi}s (đề nghị)` : ''}`);
    L.push(`    dán vào shots.js (thay cam của shot): ${c.dong}`);
    if (c.text) L.push(`    ${c.text}`);
  });
  if (L.length === 1) L.push('(chưa có điều chỉnh nào)');
  return L.join('\n');
}

export async function chepChu(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
  try {   // file:// hoặc trình duyệt chặn clipboard API → cách cũ
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch (e) { return false; }
}
