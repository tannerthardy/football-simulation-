// Why a pass blocker falls (Integration, 2026-11-10). Live games, one arm per process. Every OL-DL pass engagement that ends
// while the QB holds the ball because the blocker left 'up' (a fall starts: isDown covers 'falling'), with the 0.5 s before
// (10 ticks), read after each tick from his support state and the world's step report. Axes: 'push' = the felt load's
// direction (what the rusher's force does to him), 'stride' = his own achieved velocity direction.
//   e/rb, e/crit: capture-point deviation over his base radius and over the fall threshold (rb + recovery step / w0);
//   xiPush: share of the deviation along the felt load (1 = the push displaced him); xiStride: along his own travel;
//   felt/mg: felt load over his weight; pushVsStride: angle (deg) between felt load and his velocity;
//   lean/mg and leanVsFelt: his committed lean and its angle to the felt load (a lean the load left behind topples him);
//   ground: ground impulse / its traction limit this tick; alpha: availability; posture;
//   req/ach: his requested and achieved speed along his request; causes (contact/legs/overspeed) and the fall's cause.
// usage: node --import tsx scripts/diag/effective-mass/pass-fall.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']), DL = /^(DE|DT|NT)/;
const G = 9.81 * 1.0936;
const ang = (ax: number, ay: number, bx: number, by: number) => { const a = Math.hypot(ax, ay), b = Math.hypot(bx, by); return a < 1e-9 || b < 1e-9 ? NaN : Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (a * b)))) * 57.3; };
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const reps = new Map<any, any>(); const tick = sim.tick.bind(sim); const out: any[] = [];
    sim.tick = () => { tick(); const t = sim.t, holding = sim.throwAt < 0, w = sim.world, rep = w.report;
      for (const e of sim.engagements ?? []) { if (e.type !== 'pass' || !OL.has(e.blocker.slot) || !DL.test(e.defender.slot)) continue;
        if (!reps.has(e)) reps.set(e, { e, start: e.start, ticks: [] as any[] }); }
      for (const [e, r] of reps) { if (r.done) continue; const b = e.blocker, d = e.defender, bd = b.body, sup = bd.support; const i = w.indexOf(bd);
        const sp = w.sp[i], fat = w.fat[i], m = w.mass[i];
        const ex = Math.hypot(sup.xi.x, sup.xi.y), rb = S.baseRadiusAt(sp, sup.posture), crit = rb + S.recoverySpeed(sp, 0, fat) / S.omega0(sp, sup.posture);
        const fl = Math.hypot(sup.felt.x, sup.felt.y), v = Math.hypot(bd.vel.x, bd.vel.y), it = sim.intents?.[b.idx];
        const rq = it?.vel ? Math.hypot(it.vel.x, it.vel.y) : 0, ach = rq > 1e-6 ? (bd.vel.x * it.vel.x + bd.vel.y * it.vel.y) / rq : 0;
        const gi = rep?.groundImpulse?.[i], gl = rep?.groundImpulseLimit?.[i];
        const c = sup.causes ?? { contact: 0, legs: 0, overspeed: 0 };
        r.ticks.push({ t, st: sup.state, eRb: ex / rb, eCrit: ex / crit, xiPush: fl > 1e-9 && ex > 1e-9 ? (sup.xi.x * sup.felt.x + sup.xi.y * sup.felt.y) / (ex * fl) : NaN,
          xiStride: v > 1e-6 && ex > 1e-9 ? (sup.xi.x * bd.vel.x + sup.xi.y * bd.vel.y) / (ex * v) : NaN, felt: fl / (m * G), pushVsStride: ang(sup.felt.x, sup.felt.y, bd.vel.x, bd.vel.y),
          lean: Math.hypot(sup.lean.x, sup.lean.y) / (m * G), leanVsFelt: ang(sup.lean.x, sup.lean.y, sup.felt.x, sup.felt.y),
          ground: gi && gl ? Math.hypot(gi.x, gi.y) / Math.max(1e-9, gl) : NaN, alpha: w.alpha[i], posture: sup.posture, req: rq, ach, v,
          xiYd: ex, rbYd: rb, critYd: crit, leanYd: Math.hypot(sup.lean.x, sup.lean.y) / (m * S.omega0(sp, sup.posture) ** 2), rel: rep?.leanRelease?.[i] ? Math.hypot(rep.leanRelease[i].x, rep.leanRelease[i].y) : NaN,
          handsJ: w.joints.filter((j: any) => j.kind === 'hands' && (j.a === bd || j.b === bd) && j.b === d.body || j.kind === 'hands' && j.a === d.body && j.b === bd).length, cC: c.contact, cL: c.legs, cO: c.overspeed, feetLock: sup.feetLock, hands: !!e.hands, move: e.move?.kind ?? e.move ?? null });
        if (sup.state !== 'up' || !(sim.engagements ?? []).includes(e)) { r.done = true;
          if (sup.state !== 'up' && holding) out.push({ r, cause: sup.cause, fallDir: sup.fall, b, d, i, m, dm: w.mass[w.indexOf(d.body)] }); } } };
    const res = sim.run();
    for (const o of out) { const { r, b, d } = o; const last = r.ticks.slice(-11, -1); // the 10 ticks before the fall tick
      const ft = r.ticks[r.ticks.length - 1];
      console.log(JSON.stringify({ slot: b.slot, dslot: d.slot, cause: o.cause, dur: +(ft.t - r.start).toFixed(2), bm: +o.m.toFixed(0), dm: +o.dm.toFixed(0),
        bStr: b.ratings?.strength ?? b.player?.ratings?.strength ?? null, dStr: d.ratings?.strength ?? d.player?.ratings?.strength ?? null,
        bBal: b.ratings?.balance ?? b.player?.ratings?.balance ?? null, moves: [...new Set(r.ticks.map((x: any) => JSON.stringify(x.move)))],
        ticks: last.map((x: any) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, typeof v === 'number' ? r2(v) : v]))) })); }
    return res; } } });
}
