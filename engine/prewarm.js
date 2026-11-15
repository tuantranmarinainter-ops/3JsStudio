// BIÊN DỊCH SHADER THEO TỪNG ENV (tách từ episodes/ep001/index.html:157-243, dùng chung cho mọi tập).
// Đúng đường render lúc chiếu (director.render + post.render ở giữa mỗi shot của env), nên số/loại đèn + vật thể khớp lúc chiếu
// → không phát sinh program mới khi tua. Tất định: chỉ làm nóng cache shader; director.render đặt lại trạng thái mỗi khung.
//  - trước __ready: compile một lần như cũ (await warm.start())
//  - sau __ready: mọi env của tập dịch dần ở nền (warm.background()); khung nào cần env chưa nóng thì dịch ĐỒNG BỘ ngay trong khung đầu tiên cần tới nó (warm.ensure trong onFrame), hoặc dịch dần ở nền sau __ready (warm.background()).
// Chỉ làm nóng env mà shots của tập thật sự dùng. Ô FX `dichTruoc` tắt (globalThis.__autoFx.dichTruoc === false) = hành vi cũ
// (compile một lần cả scene với mọi env hiện).
//
// Dùng:
//   const warm = createPrewarm({ stage, director, post, envs, tl, q, afterRender: (shot) => {...} });   // trước stage.onFrame
//   stage.onFrame((t) => { ...; warm.ensure(shot.env, t); director.render(...); ... });
//   await warm.start();            // thay cho renderer.compile cũ (trước stage.start / __ready)
//   ... window.__ready = true; warm.background();
export function createPrewarm({ stage, director, post, envs, tl, q = new URLSearchParams(), afterRender = null }) {
  const enabled = () => globalThis.__autoFx?.dichTruoc !== false;
  const SIG_ONLY = q.get('warmall') === '0';   // mặc định dịch ở giữa MỌI shot của env (bắt vật chỉ hiện ở vài shot)
  const sig = (s) => !SIG_ONLY ? s.id : JSON.stringify([s.env, s.light, s.night, Object.keys(s.cast || {}), Object.keys(s.props || {}), Object.keys(s.fx || {}), s.room && Object.keys(s.room), s.dirt, s.house && (s.house.style || 1), !!s.fn]);
  const warmShots = {};   // env -> [shot…] (chỉ env có trong shots của tập)
  { const seen = new Set(); for (const s of tl.list) { const k = sig(s); if (seen.has(k)) continue; seen.add(k); (warmShots[s.env] ||= []).push(s); } }
  const warmed = new Set(), done = {};   // warmed = env đã dịch ĐỦ mọi chữ ký; done[env] = số shot đã dịch
  const order = Object.keys(warmShots);
  const tm = [];
  let lastT = 0;

  function warmEnv(name, n = Infinity) {
    const L = warmShots[name]; if (warmed.has(name) || !L) return;
    const upto = Math.min(L.length, n); if (upto >= L.length) warmed.add(name);
    for (const s of L.slice(done[name] || 0, upto)) {
      const local = s.dur * 0.5, T0 = s.t0 + local;
      const a0 = performance.now(), n0 = stage.renderer.info.programs.length;
      const at = tl.at(Math.min(T0, tl.total - 1e-4));
      director.render(s, local, at.k ?? 0.5, T0, at.prev);
      if (afterRender) afterRender(s);
      post.render({ t: T0, ...envs.last, focus: stage.target });
      tm.push([s.id, Math.round(performance.now() - a0), stage.renderer.info.programs.length - n0]);
    }
    done[name] = Math.max(done[name] || 0, upto);
  }

  const api = {
    warmed, warmEnv, order, tm,
    // gọi trong onFrame trước director.render: env chưa dịch thì dịch ngay (rồi khung thật vẽ ngay sau)
    ensure(env, t) { lastT = t; if (enabled()) warmEnv(env); },
    // trước __ready: GIỮ hành vi cũ (compile một lần, không làm nóng env nào) → __ready nhanh như cũ; làm nóng env nằm ở background()/ensure()
    async start() {
      for (const e of Object.values(envs.envs)) e.group.visible = true;
      stage.renderer.compile(stage.scene, stage.camera);
      for (const e of Object.values(envs.envs)) e.group.visible = false;
    },
    // sau __ready: dịch nền các env còn lại, từng env một; xong thì vẽ lại khung đang xem
    background() {
      if (q.get('warm') === '0') return;
      const queue = order.filter((n) => !warmed.has(n));
      const step = () => {
        while (queue.length && warmed.has(queue[0])) queue.shift();
        if (!queue.length) return;
        if (enabled()) { warmEnv(queue.shift()); stage.renderAt(lastT); } else queue.length = 0;
        setTimeout(step, 30);
      };
      setTimeout(step, 300);
    },
  };
  window.__warm = api;
  return api;
}
