// scene.js — Dựng toàn bộ cảnh ep001 (dùng chung cho index.html của HyperFrames và player.html).
//   const S = await createScene(canvas);  S.renderFrame(t) vẽ đúng khung tại t (hàm thuần của t).
import * as THREE from 'three';
import { createStage } from '/engine/stage.js';
import { propKit } from '/engine/props.js';
import { createEnvs, ENV_ASSETS } from '/engine/envs.js';
import { createAssetLib } from '/engine/assets.js';
import { buildTimeline } from '/engine/timeline.js';
import { createDirector } from '/engine/shots.js';
import { snapPostcards } from '/engine/snap.js';
import { buildCast, buildHouses, buildProps, buildFx, EPISODE } from '/episodes/ep001/episode.js';
import { SHOTS } from '/episodes/ep001/shots.js';
import { CAPTIONS } from '/episodes/ep001/captions.js';

export { CAPTIONS, EPISODE, SHOTS };

export async function createScene(canvas) {
  const stage = createStage(THREE, { canvas, ground: null, fov: 40 });
  const K = propKit(THREE);
  const A = createAssetLib(THREE);
  await A.load(ENV_ASSETS);
  const envs = createEnvs(THREE, stage, K, A);
  const actors = await buildCast(THREE), houses = buildHouses(THREE), props = buildProps(THREE, K), fx = buildFx(THREE);
  for (const a of Object.values(actors)) stage.scene.add(a.root);
  for (const h of Object.values(houses)) stage.scene.add(h.root);
  for (const p of Object.values(props)) stage.scene.add(p);
  for (const f of Object.values(fx)) stage.scene.add(f.obj);
  const tl = buildTimeline(SHOTS, 30);
  const director = createDirector({ THREE, stage, envs, K, actors, houses, props, fx });
  // biên dịch shader của mọi env trước khi seek
  for (const e of Object.values(envs.envs)) e.group.visible = true;
  for (const h of Object.values(houses)) h.root.visible = true;
  stage.renderer.compile(stage.scene, stage.camera);
  for (const e of Object.values(envs.envs)) e.group.visible = false;
  // tranh bưu thiếp = ảnh chụp từ chính các cảnh 3D (Nam Cực, đại dương, đỉnh núi, đảo)
  snapPostcards(THREE, stage, envs, { hide: [...Object.values(actors).map((a) => a.root), ...Object.values(houses).map((h) => h.root)], props });
  const clampT = (t) => Math.min(Math.max(0, t), tl.total - 1e-4);
  function update(t) { const T = clampT(t); const { shot, local, k } = tl.at(T); director.render(shot, local, k, T); return T; }
  function renderFrame(t) { const T = update(t); stage.renderer.render(stage.scene, stage.camera); return T; }
  return { THREE, stage, tl, update, renderFrame, total: tl.total, fps: 30 };
}

// Cụm phụ đề tại t: { text, k } (k = tiến độ bật nảy 0..1)
export function captionAt(t) {
  for (let j = 0; j < CAPTIONS.length; j++) if (CAPTIONS[j][0] <= t + 1e-4 && t < CAPTIONS[j][1]) return { i: j, text: CAPTIONS[j][2], k: Math.min(1, (t - CAPTIONS[j][0]) / 0.12) };
  return { i: -1, text: '', k: 1 };
}
