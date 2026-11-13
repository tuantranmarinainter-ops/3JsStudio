import {readFileSync} from 'node:fs';
const kit=JSON.parse(readFileSync(new URL('./kit.json',import.meta.url),'utf8'));
const entries=kit.shots.filter(s=>s.camera?.khung_engine_hien_tai).map(s=>{
  const k={...s.camera.khung_engine_hien_tai};
  if ('tuyet_doi' in k) { k.tuyetDoi=k.tuyet_doi; delete k.tuyet_doi; }
  return [s.id,k];
});
console.error(`CẢNH BÁO: chỉ xuất ${entries.length}/104 khung engine cũ, chưa xác minh đặt máy; không dùng làm kit hoàn chỉnh.`);
console.log('export const KHUNG = '+JSON.stringify(Object.fromEntries(entries),null,2)+';');
if (entries.length !== kit.shots.length) process.exitCode = 1;
