// The corner once level (Flex, 2026-11-14; Integration's four candidates for "level and stays level" under
// VERTICAL_SET). Per DE pass rep against a tackle: the first tick the rusher is level outside him (rusher's depth within
// 0.3 yd of the tackle's, outside by 0.3 yd or more) while the rep is on, then the next 0.5 s:
//   1. the strut: the load on the rusher along the tackle-to-rusher line (+ away) and across it, the tackle's hand
//      joint normal / tangential force;
//   2. his bend: his requested heading against the bearing to the QB (0 = straight at him), his achieved heading
//      against it, his speed and turn rate; his lean into the press (|support.lean|) against RUSH_LEAN_BOUND's cap
//      (intent.leanCap), and the share of ticks the cap is the binding limit (lean within 5% of it);
//   3. his hands: the move on the rep (share of ticks by move), and whether the tackle's hands are still on (joint on);
//   4. the tackle's turn: his facing off the line to the rusher, his yaw rate.
// Outcome: past outside (more than 0.3 yd deeper than the tackle, not inside) by 0.5 s.
// usage: [flags] node --import tsx scripts/diag/effective-mass/edge-level.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const deg = (a: number) => Math.abs(((a * 180 / Math.PI) + 540) % 360 - 180);
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const reps = new Map<any, any>(); const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.throwAt >= 0 || sim.carrier !== sim.qb) return;
    const off = sim.attackDir('O'), qb = sim.qb;
    for (const e of sim.engagements) {
      if (e.type !== 'pass' || !/^DE/.test(e.defender.slot) || !['LT', 'RT'].includes(e.blocker.slot)) continue;
      const d = e.defender, b = e.blocker, side = Math.sign(d.pos.y - sim.ballY) || 1;
      let r = reps.get(e);
      const depth = (d.pos.x - b.pos.x) * off, width = side * (d.pos.y - b.pos.y);
      if (!r) {
        if (Math.abs(depth) > 0.3 || width < 0.3) continue;
        r = { t0: sim.t, n: 0, ln: 0, lt: 0, jn: 0, jt: 0, on: 0, reqQB: 0, gotQB: 0, v: 0, lean: 0, cap: 0, capN: 0, bind: 0, offChest: 0, yaw: 0, moves: {} as Record<string, number>, h0: Math.atan2(d.vel.y, d.vel.x), past: false };
        reps.set(e, r);
      }
      if (r.done) continue;
      if (sim.t - r.t0 > 0.5) { r.done = true; r.turn = deg(Math.atan2(d.vel.y, d.vel.x) - r.h0) / 0.5; rows.push(r); continue; }
      const nx = d.pos.x - b.pos.x, ny = d.pos.y - b.pos.y, L = Math.hypot(nx, ny) || 1, n = { x: nx / L, y: ny / L };
      const iv = sim.intents?.[d.idx] ?? {}, vel = iv.vel ?? { x: 0, y: 0 };
      const toQB = Math.atan2(qb.pos.y - d.pos.y, qb.pos.x - d.pos.x);
      let t = { x: -n.y, y: n.x }; if (d.vel.x * t.x + d.vel.y * t.y < 0) t = { x: -t.x, y: -t.y };
      const Ld = d.body.support?.load ?? { x: 0, y: 0 };
      r.ln += Ld.x * n.x + Ld.y * n.y; r.lt += -(Ld.x * t.x + Ld.y * t.y); r.n++;
      const h = e.hands; if (h && !h.off) { r.on++; r.jn += Math.max(0, h.normalForce ?? 0); r.jt += Math.abs(h.tangentForce ?? 0); }
      if (Math.hypot(vel.x, vel.y) > 0.3) r.reqQB += deg(Math.atan2(vel.y, vel.x) - toQB);
      // His request split on the line to the tackle: into him (-n) and past him (along t), yd/s.
      r.reqInto = (r.reqInto ?? 0) - (vel.x * n.x + vel.y * n.y); r.reqPast = (r.reqPast ?? 0) + (vel.x * t.x + vel.y * t.y);
      // Does the straight line from him to the QB pass through the tackle's body (within the two radii)?
      { const ux = Math.cos(toQB), uy = Math.sin(toQB), bx = b.pos.x - d.pos.x, by = b.pos.y - d.pos.y, along = bx * ux + by * uy;
        const perp = Math.abs(-bx * uy + by * ux), Q = Math.hypot(qb.pos.x - d.pos.x, qb.pos.y - d.pos.y);
        if (along > 0 && along < Q && perp < b.profile.radius + d.profile.radius) r.through = (r.through ?? 0) + 1; }
      r.gotQB += deg(Math.atan2(d.vel.y, d.vel.x) - toQB); r.v += Math.hypot(d.vel.x, d.vel.y);
      const lean = Math.hypot(d.body.support?.lean?.x ?? 0, d.body.support?.lean?.y ?? 0); r.lean += lean;
      if (Number.isFinite(iv.leanCap)) { r.cap += iv.leanCap; r.capN++; if (lean >= 0.95 * iv.leanCap) r.bind++; }
      r.offChest += deg(Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x) - b.body.facing); r.yaw += Math.abs(b.body.spin ?? 0) * 180 / Math.PI;
      r.moves[e.move ?? 'none'] = (r.moves[e.move ?? 'none'] ?? 0) + 1;
      if (depth < -0.3 && width >= -0.3) r.past = true;
    }
  };
  return sim.run();
} } });
const q = (v: number[], f = .5, dp = 0) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(dp) : 'nan'; };
for (const [lab, f] of [['all level', (r: any) => true], ['went past by 0.5 s', (r: any) => r.past], ['stayed level / held', (r: any) => !r.past]] as const) {
  const R = rows.filter(f); if (!R.length) continue;
  const m = (k: string, by = 'n') => R.map((r) => r[k] / Math.max(1, r[by]));
  const mv: Record<string, number> = {}; let tot = 0;
  for (const r of R) for (const [k, v] of Object.entries(r.moves as Record<string, number>)) { mv[k] = (mv[k] ?? 0) + v; tot += v; }
  console.log(`${lab.padEnd(20)} n ${String(R.length).padStart(4)} (past ${(100 * R.filter((r) => r.past).length / R.length).toFixed(0)}%)`);
  console.log(`   1 strut: load along the line p50 ${q(m('ln'))} N, across ${q(m('lt'))} N | tackle's hands on ${q(R.map((r) => 100 * r.on / Math.max(1, r.n)))}% of ticks, normal ${q(m('jn', 'on'))} N, tangential ${q(m('jt', 'on'))} N`);
  console.log(`   2 bend: request off the QB bearing p50 ${q(m('reqQB'))} deg, achieved ${q(m('gotQB'))} deg; speed ${q(m('v'), .5, 2)} yd/s; turn ${q(R.map((r) => r.turn))} deg/s | lean ${q(m('lean'))} N, cap ${q(m('cap', 'capN'))} N, cap binding ${q(R.map((r) => 100 * r.bind / Math.max(1, r.capN)))}% of capped ticks (capped on ${q(R.map((r) => 100 * r.capN / Math.max(1, r.n)))}% of ticks)`);
  console.log(`   request into the tackle p50 ${q(m('reqInto'), .5, 2)} yd/s, past him ${q(m('reqPast'), .5, 2)} yd/s | the line to the QB through the tackle's body on ${q(R.map((r) => 100 * (r.through ?? 0) / Math.max(1, r.n)))}% of ticks`);
  console.log(`   3 hands: moves ${Object.entries(mv).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / tot).toFixed(0)}%`).join(', ')}`);
  console.log(`   4 tackle: rusher off his chest p50 ${q(m('offChest'))} deg, yaw rate ${q(m('yaw'))} deg/s`);
}
