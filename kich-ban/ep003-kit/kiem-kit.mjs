import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';
const dir = dirname(fileURLToPath(import.meta.url));
const kit = JSON.parse(readFileSync(resolve(dir, 'kit.json'), 'utf8'));
const moc = JSON.parse(readFileSync(resolve(dir, '../ep003-sb/moc.json'), 'utf8'));
const errors = [], warnings = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const sets = new Set(kit.boi_canh.map(x => x.id));
const actors = new Set(kit.nhan_vat.map(x => x.id));
const lights = new Set(kit.anh_sang.map(x => x.id));
const props = new Set(kit.do_vat.map(x => x.id));
const vec = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const sub = (a,b) => a.map((v,i)=>v-b[i]);
const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit = a => { const n=Math.hypot(...a); return n ? a.map(v=>v/n) : null; };
function chieu(p, camera) {
  const f=unit(sub(camera.nhin_vao,camera.pos));
  const r=f && unit(cross(f,[0,1,0]));
  if (!r || !Number.isFinite(camera.fov_doc_do) || camera.fov_doc_do <= 0 || camera.fov_doc_do >= 180) return null;
  const u=cross(r,f), q=sub(p,camera.pos), z=dot(q,f), t=Math.tan(camera.fov_doc_do*Math.PI/360);
  if (z<=0) return null;
  return [50+50*dot(q,r)/(z*t*9/16),50-50*dot(q,u)/(z*t)];
}
function giaoHop(a,b,min,max) {
  let lo=0,hi=1;
  for(let i=0;i<3;i++) {
    const d=b[i]-a[i];
    if(Math.abs(d)<1e-9) { if(a[i]<min[i] || a[i]>max[i]) return false; continue; }
    let x=(min[i]-a[i])/d,y=(max[i]-a[i])/d;
    if(x>y) [x,y]=[y,x];
    lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi) return false;
  }
  return hi>=0 && lo<=1;
}
assert.deepEqual(chieu([0,0,-5],{pos:[0,0,0],nhin_vao:[0,0,-1],fov_doc_do:90}),[50,50]);
assert.equal(giaoHop([0,0,0],[0,0,5],[-1,-1,2],[1,1,3]),true);
assert.equal(giaoHop([2,0,0],[2,0,5],[-1,-1,2],[1,1,3]),false);
if (kit.shots.length !== 104) err('kit', `có ${kit.shots.length}, cần 104 shot`);
if (new Set(kit.shots.map(s => s.id)).size !== kit.shots.length) err('kit', 'id shot trùng');
for (let i = 0; i < kit.shots.length; i++) {
  const s = kit.shots[i], expected = `s${String(i+1).padStart(3,'0')}`, t = moc.shots[i];
  if (s.id !== expected) err(s.id, `id không liên tục, cần ${expected}`);
  if (!t || t.id !== s.id || s.t0 !== t.t0 || s.t1 !== t.t1) err(s.id, 'mốc khác moc.json');
  if (!(s.t0 < s.t1)) err(s.id, 't0 phải nhỏ hơn t1');
  if (!sets.has(s.boi_canh_id)) err(s.id, 'bối cảnh không tồn tại');
  if (s.boi_canh_id !== 'black' && !lights.has(s.anh_sang_id)) err(s.id, 'chưa có bộ ánh sáng hợp lệ');
  for (const a of s.nhan_vat) {
    if (!actors.has(a.id)) err(s.id, `nhân vật không tồn tại: ${a.id}`);
    if (a.emote_file && !existsSync(resolve(dir,a.emote_file))) err(s.id, `thiếu ảnh mặt: ${a.emote_file}`);
    if (!vec(a.pos)) err(s.id, `chưa có tọa độ nhân vật ${a.id}`);
  }
  for (const p of s.do_vat_trong_khung) if (!props.has(p.id)) err(s.id, `đạo cụ không tồn tại: ${p.id}`);
  if (s.boi_canh_id !== 'black' && (!vec(s.camera?.dau?.pos) || !vec(s.camera?.dau?.nhin_vao) || !vec(s.camera?.cuoi?.pos) || !vec(s.camera?.cuoi?.nhin_vao))) err(s.id,'chưa có vị trí máy và điểm nhìn đầu/cuối');
  if (s.boi_canh_id === 'bedroom') {
    const room=kit.boi_canh.find(x=>x.id==='bedroom'), d=room.kich_thuoc;
    const inside=p=>vec(p)&&Math.abs(p[0])<=d.rong_x/2&&p[1]>=0&&p[1]<=d.cao_y&&Math.abs(p[2])<=d.sau_z/2;
    for(const a of s.nhan_vat) if(vec(a.pos)&&!inside(a.pos)) err(s.id,`nhân vật ${a.id} ngoài phòng`);
    for(let j=0;j<s.nhan_vat.length;j++) for(let m=j+1;m<s.nhan_vat.length;m++) {
      const a=s.nhan_vat[j].pos,b=s.nhan_vat[m].pos;
      if(vec(a)&&vec(b)&&Math.hypot(a[0]-b[0],a[2]-b[2])<1) err(s.id,'nhân vật chồng nhau dưới 1 stud');
    }
    const cam=s.camera?.dau, frame=s.camera?.khung;
    if(vec(cam?.pos)&&!inside(cam.pos)) err(s.id,'máy ngoài phòng; chưa hỗ trợ kiểm cửa sổ cho máy ngoài');
    if(vec(cam?.pos)&&vec(cam?.nhin_vao)&&vec(frame?.diem_kiem_stud)) {
      const point=frame.diem_kiem_stud, uv=chieu(point,cam), expected=frame.tam_chu_the_pct;
      if(!uv || uv.some(v=>v<0||v>100)) err(s.id,'điểm chủ thể ngoài nón nhìn');
      else if(Array.isArray(expected)&&Math.max(...uv.map((v,i)=>Math.abs(v-expected[i])))>8) err(s.id,`chiếu sai vị trí ${uv.map(v=>v.toFixed(1)).join(', ')}%`);
      for(const f of room.vat_co_dinh||[]) {
        const obj=kit.do_vat.find(x=>x.id===f.do_vat_id); if(!obj||!vec(f.tam)) continue;
        const {rong:w,cao:h,sau:z}=obj.kich_thuoc, a=(f.xoay_y||0)*Math.PI/180;
        const half=[(Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*z)/2,h/2,(Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*z)/2];
        const min=f.tam.map((v,i)=>v-half[i]),max=f.tam.map((v,i)=>v+half[i]);
        if(cam.pos.every((v,i)=>v>=min[i]&&v<=max[i])) err(s.id,`máy trong hộp bao ${f.do_vat_id}`);
        // shortcut: hộp bao kệ/giường là khối đặc, cần mô hình từng tấm để loại cảnh báo giả.
        if(frame.chu_the!==f.do_vat_id && giaoHop(cam.pos,point,min,max)) err(s.id,`tia tới chủ thể gặp hộp bao ${f.do_vat_id}`);
      }
    }
  }
  if (s.boi_canh_id.startsWith('factory_')) {
    const scene=kit.boi_canh.find(x=>x.id===s.boi_canh_id), box=scene.bien_toa_do;
    const cam=s.camera?.dau, frame=s.camera?.khung;
    if (!vec(cam?.pos) || !vec(cam?.nhin_vao) || !vec(frame?.diem_kiem_stud)) {
      if(vec(cam?.pos)) err(s.id,'chưa có điểm chủ thể để kiểm phép chiếu và che khuất');
    } else {
      const outside=(p)=>p.some((v,i)=>v<box[['x','y','z'][i]][0]||v>box[['x','y','z'][i]][1]);
      if(outside(cam.pos)) err(s.id,'máy ngoài biên blockout nhà máy; cần xác minh vùng ngoại thất');
      for(const a of s.nhan_vat) if(vec(a.pos)&&outside(a.pos)) err(s.id,`nhân vật ${a.id} ngoài biên blockout`);
      for(let i=0;i<s.nhan_vat.length;i++) for(let j=i+1;j<s.nhan_vat.length;j++) {
        const a=s.nhan_vat[i].pos,b=s.nhan_vat[j].pos;
        if(vec(a)&&vec(b)&&Math.hypot(a[0]-b[0],a[2]-b[2])<1) err(s.id,'nhân vật chồng nhau dưới 1 stud');
      }
      const uv=chieu(frame.diem_kiem_stud,cam);
      if(!uv||uv.some(v=>v<0||v>100)) err(s.id,'chủ thể ngoài nón nhìn');
      else if(Array.isArray(frame.tam_chu_the_pct)&&Math.max(...uv.map((v,i)=>Math.abs(v-frame.tam_chu_the_pct[i])))>8) err(s.id,`chiếu sai vị trí ${uv.map(v=>v.toFixed(1)).join(', ')}%`);
      const subject=kit.do_vat.find(o=>o.id===frame.chu_the);
      if(subject && Number.isFinite(frame.cao_chu_the_pct)) {
        const p=frame.diem_kiem_stud,h=subject.kich_thuoc.cao,top=chieu([p[0],p[1]+h/2,p[2]],cam),bottom=chieu([p[0],p[1]-h/2,p[2]],cam);
        if(!top||!bottom||Math.abs(Math.abs(bottom[1]-top[1])-frame.cao_chu_the_pct)>8) err(s.id,'chiều cao chiếu sai quá 8% khung');
      }
      for(const f of scene.vat_co_dinh||[]) {
        const obj=kit.do_vat.find(x=>x.id===f.do_vat_id);if(!obj||!vec(f.tam)) continue;
        const {rong:w,cao:h,sau:z}=obj.kich_thuoc,angle=(f.xoay_y||0)*Math.PI/180;
        const half=[(Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*z)/2,h/2,(Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*z)/2];
        const min=f.tam.map((v,i)=>v-half[i]),max=f.tam.map((v,i)=>v+half[i]);
        if(cam.pos.every((v,i)=>v>=min[i]&&v<=max[i])) err(s.id,`máy trong hộp ${f.do_vat_id}`);
        // shortcut: hộp bao kệ che cả khoảng rỗng, cần thay bằng các tấm và chân rời.
        if(frame.chu_the!==f.do_vat_id&&giaoHop(cam.pos,frame.diem_kiem_stud,min,max)) err(s.id,`tia tới chủ thể gặp hộp ${f.do_vat_id}`);
      }
    }
  }
  if (s.tin_cay === 'thap') warnings.push(s.id);
}
if (kit.shots.length && Math.abs(kit.shots.at(-1).t1 - moc.tong) > 0.001) err('kit','tổng thời lượng khác moc.json');
const bedroomIds=new Set(kit.shots.filter(s=>s.boi_canh_id==='bedroom').map(s=>s.id));
const bedroomErrors=errors.filter(e=>bedroomIds.has(e.split(':')[0]));
const factoryIds=new Set(kit.shots.filter(s=>s.boi_canh_id.startsWith('factory_')).map(s=>s.id));
const factoryErrors=errors.filter(e=>factoryIds.has(e.split(':')[0]));
const streetIds=new Set(kit.shots.filter(s=>!bedroomIds.has(s.id)&&!factoryIds.has(s.id)).map(s=>s.id));
const streetErrors=errors.filter(e=>streetIds.has(e.split(':')[0]));
console.log(`Shot: ${kit.shots.length}/104 | Phố và tiệm: ${streetIds.size} shot, ${streetErrors.length} lỗi cứng | Nhà máy: ${factoryIds.size} shot, ${factoryErrors.length} lỗi | Phòng Gà: ${bedroomIds.size} shot, ${bedroomErrors.length} lỗi | Khác: ${errors.length-bedroomErrors.length-factoryErrors.length-streetErrors.length} lỗi | Tin cậy thấp: ${warnings.length}`);
for (const e of errors) console.log(`LỖI ${e}`);
console.log(`Tin cậy thấp: ${warnings.join(', ') || 'không có'}`);
console.log('CHƯA KIỂM ĐỦ: hình học và chiếu ngược cụm phố, bề dày tường/cửa, tia phản xạ gương, mặt kệ rỗng, kích thước chiếu của chủ thể, máy cuối, luật chuyển động và tính liên tục.');
if (errors.length) process.exitCode = 1;
