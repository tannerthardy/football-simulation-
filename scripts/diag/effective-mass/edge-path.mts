// The speed rusher's path, requested against run (Integration, 2026-11-15: the corner; "his landmark and requested path
// against what he runs ... controller first, physics only if his request is right and his body fails it"). Edge
// rushers (DE / OLB rushing from outside a tackle within 4 yd, unblocked at the time or engaged), on dropbacks with the
// QB holding the ball, at 0.5 / 1.0 / 1.5 s: his phase in RushPass (lane: within 0.5 yd of the line; arc: deeper,
// still more than 1 yd shallower than the QB; finish: otherwise), his distance outside the tackle, his requested and
// achieved speed and their outward components (+ = toward the sideline), the angle between request and achievement,
// and his bend trait. By top-speed tercile, as edge-rush.py. Measurement only.
// usage: [flags] node --import tsx scripts/diag/effective-mass/edge-path.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { traits } = await import(`${W}/src/sim/engagement.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const TIMES = [0.5, 1.0, 1.5];
const reps: any[] = [];
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const by = sim.ballY, dir = sim.attackDir(sim.offense[0].team);
  const T = sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT');
  const pairs = T.map((t: any) => {
    const out = Math.sign(t.pos.y - by) || 1;
    const c = sim.defense.filter((d: any) => { const w = (d.pos.y - t.pos.y) * out; return w >= 0 && w <= 4 && Math.abs(d.pos.x - sim.los) < 2; })
      .sort((a: any, b: any) => (b.pos.y - t.pos.y) * out - (a.pos.y - t.pos.y) * out)[0];
    return c ? { t, d: c, out, vmax: 0, at: {} as any, bend: traits(c).bend } : null;
  }).filter(Boolean);
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (sim.throwAt >= 0) return;
    for (const p of pairs) {
      const { t, d, out } = p; if (d.behavior?.kind !== 'rush') continue;
      p.vmax = Math.max(p.vmax, Math.hypot(d.vel.x, d.vel.y));
      for (const T0 of TIMES) if (Math.abs(sim.t - T0) < sim.dt / 2 + 1e-9 && !p.at[T0]) {
        const iv = sim.intents?.[d.idx]?.vel ?? { x: 0, y: 0 }, qbx = sim.qb.pos.x;
        const phase = (d.pos.x - sim.los) * dir > -0.5 ? 'lane' : (d.pos.x - qbx) * dir > 1.0 ? 'arc' : 'finish';
        const rq = Math.hypot(iv.x, iv.y), ach = Math.hypot(d.vel.x, d.vel.y);
        const ang = rq > 0.2 && ach > 0.2 ? Math.abs(Math.atan2(iv.x * d.vel.y - iv.y * d.vel.x, iv.x * d.vel.x + iv.y * d.vel.y)) * 180 / Math.PI : NaN;
        p.at[T0] = { phase, outT: (d.pos.y - t.pos.y) * out, rq, ach, rqOut: iv.y * out, achOut: d.vel.y * out, ang, engaged: !!d.engagement };
      }
    }
  };
  const res = sim.run();
  for (const p of pairs) reps.push(p);
  return res;
} } });
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(0.5 * (s.length - 1))] : NaN; };
const vs = reps.map((r) => r.vmax).sort((a, b) => a - b), lo = vs[Math.floor(vs.length / 3)], hi = vs[Math.floor(2 * vs.length / 3)];
for (const [lab, f] of [['slowest third', (v: number) => v <= lo], ['middle third', (v: number) => v > lo && v <= hi], ['fastest third', (v: number) => v > hi]] as [string, (v: number) => boolean][]) {
  const g = reps.filter((r) => f(r.vmax));
  console.log(`${lab} (n ${g.length}, top ${q(g.map((r) => r.vmax)).toFixed(1)} yd/s, bend ${q(g.map((r) => r.bend)).toFixed(2)}):`);
  for (const T0 of TIMES) {
    const S = g.map((r) => r.at[T0]).filter(Boolean), ph = (k: string) => (100 * S.filter((s: any) => s.phase === k).length / Math.max(1, S.length)).toFixed(0);
    const fr = S.filter((s: any) => !s.engaged), m = (k: string, X = S) => q(X.map((s: any) => s[k])).toFixed(2);
    console.log(`  ${T0.toFixed(1)} s (n ${S.length}): phase lane ${ph('lane')}% / arc ${ph('arc')}% / finish ${ph('finish')}%, engaged ${(100 * (S.length - fr.length) / Math.max(1, S.length)).toFixed(0)}% | outside the tackle ${m('outT')} yd | asks ${m('rq')} (out ${m('rqOut')}) / runs ${m('ach')} (out ${m('achOut')}) yd/s, off his request ${m('ang')} deg | unengaged: asks out ${m('rqOut', fr)} / runs out ${m('achOut', fr)}`);
  }
}
