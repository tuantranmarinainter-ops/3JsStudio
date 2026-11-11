// ep001 — "Ngôi nhà biết đi". Cấu hình chung: diễn viên, nhà, đạo cụ, hiệu ứng.
// Dựng lại theo tài liệu bàn giao của người dùng (refs/ngoinha/): 5132 frame @30fps, 145 shot.
import { createR15, loadR15Body, loadCharacterTextures } from '../../engine/r15.js';
import { createHouse } from '../../engine/house.js';
import { makePostcard, postcardBack } from '../../engine/postcards.js';
import { fxCards, fxDust } from '../../engine/fx.js';

export const EPISODE = {
  id: 'ep001',
  title: 'Ngôi nhà biết đi',
  fps: 30,
  frames: 5132,
  rule: 'Mỗi đêm một ngôi nhà ngẫu nhiên mọc chân, đi tới một nơi trên thế giới rồi đêm sau đi về.',
  weakness: 'Nhà chúng tôi không đi về — cứ đi tiếp mỗi đêm.',
  twist: 'Các nơi nhà dừng chân trùng đúng thứ tự bưu thiếp ba gửi về: nhà đang lần theo dấu ba.',
  solution: 'Theo tấm thiếp cuối (đảo hải đăng), nhà tìm thấy ba và đưa cả nhà về.',
};

const SKIN = '#ecc095';      // màu da (trước: vàng khối #f3d27a)
// Nhân vật R15 (engine/r15.js): thân theo mô hình tham chiếu assets/characters/r15_body.glb; texture Codex nếu có.
export async function buildCast(THREE) {
  const body = await loadR15Body(THREE);
  const CAST = {
    hero: { skin: SKIN, shirt: '#f2c230', sleeves: '#f2c230', hoodie: '#6b4226', pants: '#3f6fb5', shoes: '#1b1b1b', hat: 'beanie', hatColor: '#d6322b' },
    mom: { skin: '#f0c89a', shirt: '#9fe0c0', sleeves: '#9fe0c0', shirtPattern: 'stripes', shirtPattern2: '#d9f5e8', pants: '#8a6a4a', skirt: '#8a6a4a', scarf: '#d6322b', hair: 'braids', hairColor: '#1b1b1b', lashes: true },
    dad: { skin: '#f0c89a', shirt: '#283a66', sleeves: '#283a66', pants: '#d8cfb8', shoes: '#3b2a1e', hat: 'beanie', hatColor: '#d6322b', zipper: true, boots: true, browThickness: 1.4 },
    dadIsland: { skin: '#f0c89a', shirt: '#2f4a7a', sleeves: '#2f4a7a', shirtPattern: 'torn', shirtPattern2: '#f0c89a', pants: '#7a5a3a', pantsPattern: 'torn', hat: 'beanie', hatColor: '#c42e28', beard: '#cfcfd2', browThickness: 1.4, tired: true },
  };
  const FACE = { hero: 'smile', mom: 'smile', dad: 'smile', dadIsland: 'worried' };
  const out = {};
  for (const [name, o] of Object.entries(CAST)) {
    const textures = await loadCharacterTextures(THREE, name);
    const a = createR15(THREE, { name, ...o, body, textures, face: FACE[name] });
    a._defaultFace = FACE[name];
    out[name] = a;
  }
  return out;
}

export function buildHouses(THREE) {
  return { family: createHouse(THREE, { style: 'family', name: 'house_family' }), illus: createHouse(THREE, { style: 'illustration', name: 'house_illus' }) };
}

export function buildProps(THREE, K) {
  const back = postcardBack(THREE, ['Đã tìm thấy một thứ', 'tuyệt vời.', 'Sẽ sớm về nhà thôi.', 'Yêu cả hai mẹ con.']);
  const p = {
    cardIsland: makePostcard(THREE, 'island', { w: 2.6, back }),      // tấm thiếp cuối (mẹ cầm)
    cardPenguin: makePostcard(THREE, 'penguin', { w: 2.4 }),          // cha gửi (montage)
    cardDad: makePostcard(THREE, 'mountain', { w: 2.0 }),
    cardWrite: makePostcard(THREE, 'island', { w: 2.2 }),
    cardStack: K.cardStack(14),
    glass: K.glass(),
    mailboxTown: K.mailbox(),
    shipSail: K.ship(),
    reefShip: K.ship({ sails: false }),
    pencil: K.box(0.15, 0.15, 1.4, '#f2c14e', 0, 0, 0, 'pencil'),
  };
  for (const [n, o] of Object.entries(p)) { o.name = n; o.visible = false; }
  return p;
}

export function buildFx(THREE) {
  return { cards: fxCards(THREE, { count: 36 }), dust: fxDust(THREE, { count: 220 }) };
}
