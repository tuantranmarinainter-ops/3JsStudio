// nhap-story-goc: tách NHÂN VẬT + BỐI CẢNH + DỮ LIỆU SHOT gốc của story.html thành mô-đun RIÊNG của một tập (không dùng chung với studio).
//   Gọi từ tools/nhap-story-html.mjs (xuatGoc). Chỉ đọc chữ (regex/cắt dòng), KHÔNG chạy file gốc.
// Ra episodes/<ep>/goc/: faces/face_NNN.png (140 mặt) · characters.js · sets.js · Reflector.js · story.js (createStory: CAST, SETS, SHOTS gốc + frame(t))
// story.js.frame(t) = hàm thuần của t: đặt lại thế giới, chạy `run` của shot, trả { p, l, fov, roll } (camera gốc) và đặt ánh sáng theo look gốc.
// Không nhập (vẽ 2D lên khung): bụi bông/tóe sao, nhoè whip, sepia, kính, mờ, phụ đề gốc — studio có phụ đề + hậu kỳ riêng.
import fs from 'node:fs';
import path from 'node:path';

export function xuatGoc(file, epDir, ten) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const dir = path.join(epDir, 'goc'); fs.mkdirSync(path.join(dir, 'faces'), { recursive: true });
  const scriptBody = (marker) => {
    const a = lines.findIndex((l) => l.startsWith('<script>') && l.includes(marker));
    if (a < 0) throw new Error('không thấy script ' + marker);
    let b = a + 1; while (!lines[b].startsWith('</script>')) b++;
    return [lines[a].replace(/^<script>/, ''), ...lines.slice(a + 1, b)].join('\n');
  };
  // 1. mặt
  const fl = lines.find((l) => l.startsWith('window.RBX_FACES = '));
  const faces = JSON.parse(fl.slice(fl.indexOf('{'), fl.lastIndexOf('}') + 1));
  for (const [id, uri] of Object.entries(faces)) fs.writeFileSync(path.join(dir, 'faces', `face_${id}.png`), Buffer.from(uri.split(',')[1], 'base64'));
  // 2. Reflector (đóng gói trong importmap)
  const im = lines.find((l) => l.startsWith('<script type="importmap">'));
  const rf = im.match(/"three\/addons\/objects\/Reflector\.js": "data:text\/javascript;base64,([A-Za-z0-9+/=]+)"/);
  if (rf) fs.writeFileSync(path.join(dir, 'Reflector.js'), Buffer.from(rf[1], 'base64'));
  // 3. characters.js (IIFE gắn createCharacterKit vào global)
  const ids = Object.keys(faces);
  fs.writeFileSync(path.join(dir, 'characters.js'),
    `// ${ten}/goc/characters.js — NGUYÊN VĂN characters.js của story.html (bản gốc), bọc thành module. Mặt: faces/face_NNN.png cạnh file.\n` +
    `globalThis.RBX_FACES = Object.fromEntries(${JSON.stringify(ids)}.map((id) => [id, '/episodes/${ten}/goc/faces/face_' + id + '.png']));\n` +
    scriptBody('characters.js') + `\nexport const createCharacterKit = globalThis.createCharacterKit;\n`);
  // 4. bối cảnh
  fs.writeFileSync(path.join(dir, 'sets.js'),
    `// ${ten}/goc/sets.js — NGUYÊN VĂN story-sets.js + story-sets2.js của story.html (bối cảnh dựng bằng code).\n` +
    scriptBody('story-sets.js') + '\n' + scriptBody('story-sets2.js') + `\nexport const buildStorySets = globalThis.buildStorySets, buildStorySets2 = globalThis.buildStorySets2;\n`);
  // 5. story.js: cắt khối module theo mốc
  const ix = (re, from = 0) => { const i = lines.findIndex((l, k) => k >= from && re.test(l)); if (i < 0) throw new Error('mốc ' + re); return i; };
  const m0 = ix(/^<script type="module">/, ix(/story-sets2\.js/));
  const iUtil = ix(/TIỆN ÍCH \*\//, m0), iRend = ix(/RENDERER \+ CẢNH \*\//, iUtil), iCam = ix(/^const camera = new THREE\.PerspectiveCamera/, iRend);
  const iFrame = ix(/MỘT KHUNG HÌNH \*\//, iCam), iReset = ix(/^const shotAt = /, iFrame), iLet = ix(/^let whK = 1;/, iReset);
  const iRF = ix(/^function renderFrame\(t\)/, iLet), iFlags = ix(/^ {2}if \(s\.clockOn\)/, iRF), iRun = ix(/^ {2}if \(s\.run\) s\.run\(lt, u\);/, iFlags);
  const iHand = ix(/^ {2}if \(s\.handheld\)/, iRun), iLight = ix(/^ {2}\/\/ ánh sáng theo look/, iHand), iSet = ix(/^ {2}setLook\(s\.look,/, iLight);
  const sl = (a, b) => lines.slice(a, b).join('\n');
  const story = `// ${ten}/goc/story.js — NHÂN VẬT + DỮ LIỆU SHOT gốc của story.html (cắt nguyên văn theo mốc, tools/nhap-story-goc.mjs). Hàm thuần của t.
// createStory(THREE, RoundedBoxGeometry, Reflector, KIT, buildStorySets, buildStorySets2, scene) → { frame(t) → camera, SHOTS, END, CAST, SETS, preload }
export function createStory(THREE, RoundedBoxGeometry, Reflector, KIT, buildStorySets, buildStorySets2, scene) {
const W = 720, H = 1280, renderer = { toneMappingExposure: 1 }, Q = new URLSearchParams('');
${sl(iUtil + 1, iRend)}
${sl(iCam, iFrame)}
${sl(iReset, iRF)}
function frame(t) {
  const s = shotAt(t), lt = t - s.t, u = inv(s.t, s.t1, t);
  resetWorld();
${sl(iFlags, iRun + 1)}
  const cm = s.cam(u, lt);
  let p = cm.p, l = cm.l;
${lines[iHand]}
  if (s.whip) { const w0 = s.sub ? s.sub.filter(x => x <= lt).pop() : 0, wa = lt - w0; if (wa < .22) { const a = .9 * Math.pow(1 - wa / .22, 2), d = l.clone().sub(p), c = Math.cos(a), sn = Math.sin(a); l = p.clone().add(V(d.x * c + d.z * sn, d.y, -d.x * sn + d.z * c)); } }
  camera.position.copy(p);
${sl(iLight, iSet + 1)}
  const q = camera.position;
  return { p: [q.x, q.y, q.z], l: [l.x, l.y, l.z], fov: cm.fov, roll: cm.roll || 0, shot: s.n, lt, look: s.look };
}
return { frame, SHOTS, END, CAST, SETS, KIT, preload: () => KIT.preloadFaces() };
}
`;
  fs.writeFileSync(path.join(dir, 'story.js'), story);
  return { mat: ids.length, dong: story.split('\n').length };
}
