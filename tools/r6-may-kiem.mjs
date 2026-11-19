// MÁY KIỂM ĐỘNG TÁC R6 — 1 lệnh: dựng trang thử → đo số + chụp 4 khung/động tác → gộp với kết luận mắt → trang tổng hợp.
//   node tools/r6-may-kiem.mjs                 chạy đủ (Gà R6 thân gập eo, 84 động tác BBS)
//   node tools/r6-may-kiem.mjs --chi a,b       chỉ vài động tác
//   node tools/r6-may-kiem.mjs --khong-anh     chỉ đo số (vài giây), không chụp
//   node tools/r6-may-kiem.mjs --chi-gop       chỉ gộp lại (sau khi agent đã ghi mat-*.json)
//   --khong-dung   bỏ bước dựng lại trang thử        --out <thư mục>   (mặc định output/r6-bobj/kiem)
// Bước soi bằng mắt do agent làm: lệnh ghi sẵn nhom-1..3.txt + de-bai-mat.md trong thư mục kết quả.
// Cần: repo app 1 ở S:/3appclaude (trang thử tools-local/xem/build.mjs). Chi tiết: assets/r6-bobj/README.md mục "Máy kiểm".
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, statSync, copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined }
const has = (k) => process.argv.includes(k)
const OUT = resolve(ROOT, arg('--out') || 'output/r6-bobj/kiem'), MAIN = join(ROOT, 'output/r6-bobj/kiem'); mkdirSync(OUT, { recursive: true })
const BUILD = 'S:/3appclaude/tools-local/xem/build.mjs', DIST = join(ROOT, 'dist/r6-bobj-test.html'), ART = join(ROOT, 'output/r6-bobj/thu-dong-tac-r6.html')
const run = (file, args = [], env = {}) => execFileSync(process.execPath, [file, ...args], { stdio: 'inherit', env: { ...process.env, ...env } })
const dung = () => { if (!existsSync(BUILD)) { console.log('⚠ không thấy', BUILD, '— bỏ qua dựng trang thử'); return } run(BUILD, [DIST, ART]) }

if (!has('--chi-gop')) {
  if (!has('--khong-dung')) { console.log('① Dựng lại trang thử'); dung() }
  console.log('② Đo số' + (has('--khong-anh') ? '' : ' + chụp 4 khung/động tác'))
  const a = []; if (arg('--chi')) a.push('--chi=' + arg('--chi')); if (has('--khong-anh')) a.push('--khong-anh')
  run(join(ROOT, 'tools/r6-may-kiem/do.mjs'), a, { OUT })
}
// mắt cũ hơn số đo → cảnh báo (kết luận mắt có thể đã lỗi thời)
const so = join(OUT, 'so.json'), mats = [1, 2, 3].map((i) => join(OUT, `mat-${i}.json`)).filter(existsSync)
if (mats.some((m) => statSync(m).mtimeMs < statSync(so).mtimeMs)) console.log('⚠ mat-*.json cũ hơn so.json — kết luận mắt là của lần đo trước; chạy lại bước soi mắt rồi --chi-gop')
console.log('③ Gộp + trang tổng hợp'); run(join(ROOT, 'tools/r6-may-kiem/gop.mjs'), [], { K: OUT + '/' })
if (OUT !== MAIN) copyFileSync(join(OUT, 'may-kiem.json'), join(MAIN, 'may-kiem.json'))   // build.mjs đọc nhãn máy từ đây
if (!has('--khong-dung')) { console.log('④ Dựng lại trang thử kèm nhãn "máy bắt"'); dung() }
// đề bài soi mắt cho 3 agent
const names = JSON.parse(readFileSync(so, 'utf8')).map((x) => x.name), g = [[], [], []]; names.forEach((n, i) => g[i % 3].push(n))
g.forEach((l, k) => writeFileSync(join(OUT, `nhom-${k + 1}.txt`), l.join('\n')))
writeFileSync(join(OUT, 'de-bai-mat.md'), `# Đề bài soi mắt (giao 3 agent Sonnet, mỗi agent 1 nhóm; thay <k> = 1|2|3)
Soi ảnh kiểm động tác nhân vật khối vuông. Không sửa code, không chạy trình duyệt, chỉ đọc ảnh/JSON và ghi báo cáo.
Mỗi ảnh \`${OUT}\\<tên>.jpg\` là lưới 2×2 (4 khung, nhãn ghi tick + lý do máy chọn). TRÁI = Steve (chuẩn đúng), PHẢI = Gà R6 vàng (đầu, thân gập ở eo, tay/chân khối cứng KHÔNG khuỷu/gối — thiết kế; tay chĩa thẳng tới bàn tay Steve nên khi Steve co khuỷu tay Gà chĩa chéo — chỉ tính lỗi khi sai rõ; chân sát sàn mà Steve gập gối thì nghiêng về phía gối — thiết kế).
Số máy đo: \`${so}\` (name, loi[{key,label,note,tk}]; key: lun, lo, xuyen, lech, than, giat, cham).
Danh sách: \`${OUT}\\nhom-<k>.txt\`.
Thang mức: 0 giống Steve · 1 khác nhẹ, khó để ý · 2 lỗi rõ · 3 hỏng động tác. ket_luan "ok" nếu ≤ 1, "loi" nếu ≥ 2.
Mỗi động tác: {name, ket_luan, muc, loi:[câu ngắn kèm khung số], may_dung:[key ảnh xác nhận], may_sai:[key ảnh KHÔNG thấy → báo nhầm], khong_kiem_duoc:[vd giat]}.
Ghi JSON vào \`${OUT}\\mat-<k>.json\` + bản ngắn \`${OUT}\\bao-cao-<k>.md\`.
Chỉ trả về: (1) đường dẫn đã ghi, (2) ≤ 5 gạch kết luận (đếm mức 0/1/2/3, lỗi lặp nhiều nhất, động tác nặng nhất), (3) mục chưa kiểm được. Không chép lại nội dung đã đọc.
Xong cả 3 → \`node tools/r6-may-kiem.mjs --chi-gop${OUT !== MAIN ? ' --out ' + OUT : ''}\`
`)
console.log(`
Xong. Trang tổng hợp: file:///${join(ROOT, 'dist/r6-may-kiem.html').replace(/\\/g, '/').replace(/ /g, '%20')}
      Trang thử:      file:///${DIST.replace(/\\/g, '/').replace(/ /g, '%20')}
Soi mắt: giao 3 agent theo ${join(OUT, 'de-bai-mat.md')} rồi chạy --chi-gop.
Đăng artifact (Claude làm): output/r6-bobj/thu-dong-tac-r6.html → 17qceasXPUWM7pqJA1vQ3i · output/r6-bobj/may-kiem-r6.html → 7gdgkkCbwCo7b6a2skaCpH`)
