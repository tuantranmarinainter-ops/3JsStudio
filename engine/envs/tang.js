// tang.js — hợp đồng 3 TẦNG của bối cảnh (trước / giữa / sau). Không import THREE (chạy được trong node).
//   ganTang(obj, 'front'|'mid'|'back') → gắn obj.userData.tang (engine/measure.js đếm theo trường này) và trả lại obj.
//   layersOf(root) → { front: [], mid: [], back: [] }: các vật GỐC của từng tầng dưới root (vật con của vật đã có tầng không tính riêng).
// Env file nhận ganTang qua bộ công cụ H (engine/envs.js); def() tự gom env.layers từ cây vật thể (xem docs/boi-canh-tang.md).
export const TANG = ['front', 'mid', 'back'];

export function ganTang(obj, tang) {
  if (!TANG.includes(tang)) throw new Error(`ganTang: tầng "${tang}" không có. Có: ${TANG.join(', ')}`);
  if (!obj || !obj.userData) throw new Error('ganTang: cần một Object3D (có userData)');
  obj.userData.tang = tang;
  return obj;
}

export function layersOf(root) {
  const out = { front: [], mid: [], back: [] };
  const walk = (o, trong) => {
    const t = o.userData && o.userData.tang;
    if (t && out[t] && !trong) out[t].push(o);
    for (const c of o.children || []) walk(c, trong || !!(t && out[t]));
  };
  walk(root, false);
  return out;
}
