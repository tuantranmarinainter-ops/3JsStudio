// So 2 lần đo so.json: đếm động tác mỗi loại lỗi + điểm tổng + liệt kê động tác đổi nhiều.  node tools/r6-may-kiem/so-sanh.mjs <thư-mục-trước> <thư-mục-sau> [tên,…]
import { readFileSync } from 'node:fs'
const [a, b, chi] = process.argv.slice(2), A = JSON.parse(readFileSync(a + '/so.json', 'utf8')), B = JSON.parse(readFileSync(b + '/so.json', 'utf8'))
const v = (o, k) => o?.loi.find((x) => x.key === k)?.v || 0, keys = [...new Set([...A, ...B].flatMap((x) => x.loi.map((l) => l.key)))], mA = Object.fromEntries(A.map((x) => [x.name, x]))
console.log(keys.map((k) => k + ' ' + A.filter((x) => v(x, k)).length + '→' + B.filter((x) => v(x, k)).length).join(' · '), '· điểm', A.reduce((s, x) => s + x.score, 0).toFixed(1), '→', B.reduce((s, x) => s + x.score, 0).toFixed(1))
const L = B.map((x) => [x.name, (mA[x.name]?.score || 0), x.score]).filter(([n, p, q]) => (chi ? chi.split(',').includes(n) : Math.abs(q - p) > 0.3)).sort((p, q) => Math.abs(q[2] - q[1]) - Math.abs(p[2] - p[1]))
for (const [n, p, q] of L.slice(0, 15)) console.log((q > p ? '▲ ' : '▼ ') + n, p.toFixed(2), '→', q.toFixed(2), keys.filter((k) => v(mA[n], k) || v(B.find((x) => x.name === n), k)).map((k) => k + ' ' + v(mA[n], k) + '→' + v(B.find((x) => x.name === n), k)).join(' '))
