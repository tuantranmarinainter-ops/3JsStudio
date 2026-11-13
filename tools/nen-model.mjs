// Nén model glTF/GLB tại chỗ bằng glTF-Transform (donmccurdy/glTF-Transform): bỏ dữ liệu trùng + thừa, lượng tử hoá lưới
// (KHR_mesh_quantization — GLTFLoader của three đọc sẵn, KHÔNG cần bộ giải nén), ảnh vân → WebP cạnh dài ≤ 1024.
//   node tools/nen-model.mjs <file.glb|file.gltf> [file2 …] [--kich 1024] [--chat 85] [--thu] [--khong-anh] [--khong-luoi] [--lai]
//     --thu         chỉ đo, không ghi (in cỡ trước → sau)
//     --kich N      cạnh dài tối đa của ảnh vân (mặc định 1024)
//     --chat Q      chất lượng WebP 1–100 (mặc định 85; ảnh pháp tuyến luôn ≥ 90)
//     --khong-anh   giữ nguyên ảnh vân      --khong-luoi  giữ nguyên lưới (không lượng tử hoá)
//     --lai         nén lại cả file đã có dấu "nen" (mặc định bỏ qua để không nén chồng nhiều lần)
//   Bản gốc được chép vào .cache/nen-model/goc/<đường dẫn> trước khi ghi đè (chỉ lần đầu).
//   Sau khi nén: kiểm bằng  node tools/look.mjs <trang> --shots … --ref refs/<ảnh chụp trước khi nén>
// Dùng từ code:  import { nenModel } from './nen-model.mjs';  await nenModel('assets/nhap/x.glb')
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const GOC = path.join(ROOT, '.cache', 'nen-model', 'goc');

function dsFile(file) {   // mọi file của một model: .glb → chính nó; .gltf → .gltf + các uri (bin, ảnh)
  if (!/\.gltf$/i.test(file)) return [file];
  const j = JSON.parse(fs.readFileSync(file, 'utf8')); const dir = path.dirname(file);
  const uris = [...(j.buffers || []), ...(j.images || [])].map((x) => x.uri).filter((u) => u && !u.startsWith('data:'));
  return [file, ...uris.map((u) => path.join(dir, decodeURIComponent(u)))];
}
const tongCo = (fs_) => fs_.reduce((s, f) => s + (fs.existsSync(f) ? fs.statSync(f).size : 0), 0);

export async function nenModel(file, o = {}) {
  const { kich = 1024, chat = 85, thu = false, anh = true, luoi = true, lai = false, luuGoc = true } = o;
  const { NodeIO } = await import('@gltf-transform/core');
  const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
  const { dedup, prune, weld, quantize, textureCompress } = await import('@gltf-transform/functions');
  const sharp = (await import('sharp')).default;

  file = path.resolve(file);
  const truocFiles = dsFile(file); const truoc = tongCo(truocFiles);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(file);
  const root = doc.getRoot();
  const extras = root.getAsset().extras || {};
  if (extras.nen && !lai) return { file, boQua: 'đã nén (thêm --lai để nén lại)', truoc, sau: truoc };
  const dem = () => { let v = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) v += p.getAttribute('POSITION')?.getCount() || 0; return v; };
  const dinhTruoc = dem();

  const buoc = [dedup(), prune({ keepAttributes: false, keepLeaves: true }), weld()];
  // 14 bit vị trí ≈ sai số 1/16384 cạnh hộp bao (model 10 stud → 0,0006 stud); pháp tuyến 10 bit, UV 12 bit
  if (luoi) buoc.push(quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeColor: 8 }));
  if (anh) {
    // ảnh pháp tuyến: chất lượng cao hơn (nhiễu khối JPEG/WebP hiện thành gợn sáng); ảnh màu/độ nhám: mức thường
    buoc.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [kich, kich], quality: Math.max(chat, 90), slots: /normal/i }));
    buoc.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [kich, kich], quality: chat, slots: /^(?!.*normal)/i }));
  }
  await doc.transform(...buoc);
  root.getAsset().extras = { ...extras, nen: { kich, chat, luoi, anh } };

  // ghi thử ra thư mục tạm để đo; chỉ chép đè khi nhỏ hơn thật
  const tam = path.join(ROOT, 'output', '_tmp', 'nen-model', path.basename(file).replace(/\W+/g, '_') + '_' + process.pid);
  fs.rmSync(tam, { recursive: true, force: true }); fs.mkdirSync(tam, { recursive: true });
  const raTam = path.join(tam, path.basename(file));
  await io.write(raTam, doc);
  const sauFilesTam = dsFile(raTam); const sau = tongCo(sauFilesTam);
  const kq = { file: path.relative(ROOT, file).replace(/\\/g, '/'), truoc, sau, giam: +(100 * (1 - sau / truoc)).toFixed(1), dinh: [dinhTruoc, dem()], anh: root.listTextures().map((t) => `${t.getURI() || t.getName() || '?'} ${(t.getSize() || []).join('×')} ${Math.round((t.getImage()?.byteLength || 0) / 1024)}kB`) };
  if (thu) { fs.rmSync(tam, { recursive: true, force: true }); return { ...kq, thu: true }; }
  if (sau >= truoc * 0.97) { fs.rmSync(tam, { recursive: true, force: true }); return { ...kq, boQua: 'giảm < 3%, giữ bản cũ' }; }

  // lưu bản gốc (một lần), xoá file cũ không còn dùng, chép bản mới vào
  const dir = path.dirname(file);
  for (const f of luuGoc ? truocFiles : []) {
    const luu = path.join(GOC, path.relative(ROOT, f));
    if (!fs.existsSync(luu)) { fs.mkdirSync(path.dirname(luu), { recursive: true }); fs.copyFileSync(f, luu); }
  }
  const moi = sauFilesTam.map((f) => path.join(dir, path.relative(tam, f)));
  for (const f of truocFiles) if (!moi.some((m) => path.resolve(m) === path.resolve(f))) fs.rmSync(f, { force: true });
  sauFilesTam.forEach((f, i) => { fs.mkdirSync(path.dirname(moi[i]), { recursive: true }); fs.copyFileSync(f, moi[i]); });
  fs.rmSync(tam, { recursive: true, force: true });
  return kq;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const a = { _: [] }; const av = process.argv.slice(2);
  const CO = new Set(['thu', 'khong-anh', 'khong-luoi', 'lai']);
  for (let i = 0; i < av.length; i++) { const x = av[i]; if (x.startsWith('--')) { const k = x.slice(2); a[k] = CO.has(k) ? true : av[++i]; } else a._.push(x); }
  if (!a._.length) { console.log('Dùng: node tools/nen-model.mjs <file.glb|.gltf> […] [--kich 1024] [--chat 85] [--thu] [--khong-anh] [--khong-luoi] [--lai]'); process.exit(1); }
  let loi = 0; const kb = (n) => (n / 1024).toFixed(0) + ' kB';
  for (const f of a._) {
    try {
      const r = await nenModel(f, { kich: +(a.kich || 1024), chat: +(a.chat || 85), thu: !!a.thu, anh: !a['khong-anh'], luoi: !a['khong-luoi'], lai: !!a.lai });
      console.log(`${r.boQua ? '–' : r.thu ? '?' : '✓'} ${r.file}: ${kb(r.truoc)} → ${kb(r.sau)}${r.giam != null ? ` (−${r.giam}%)` : ''}${r.dinh ? ` · đỉnh ${r.dinh[0]} → ${r.dinh[1]}` : ''}${r.boQua ? ' · ' + r.boQua : ''}`);
      if (a.thu && r.anh) for (const t of r.anh) console.log('    ' + t);
    } catch (e) { loi++; console.error(`✗ ${f}: ${e.message}`); }
  }
  process.exit(loi ? 1 : 0);
}
