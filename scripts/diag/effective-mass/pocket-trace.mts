// Pocket movement before contact (Integration, 2026-11-11: NFL QBs are moving 70% of the time in the 0.5 s before a
// rusher reaches 1 yd, ours 34%). Every dropback where a defender reaches 1.0 yd of the QB before the ball is out: per
// tick over the 0.8 s before that frame, what the QB's behaviour returned (pocketMove / evade / scramble / throw /
// throwAway / other), the speed he asked for and the speed he achieved, his felt time to contact (pressure().time) and
// his phase. Then: was he set (achieved < 1.5 yd/s) in the last 0.5 s, and was that asked (request < 1.5) or not
// achieved (request >= 1.5)? Monkeypatches QBPass methods; no source change.
// usage: [flags] node --import tsx scripts/diag/effective-mass/pocket-trace.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const Q: any = (await import(`${W}/src/sim/behaviors/qb.ts`)).QBPass.prototype;
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
let tag = 'other';
for (const m of ['pocketMove', 'evade', 'scramble', 'startThrow', 'throwAway']) {
  const f = Q[m]; if (typeof f !== 'function') continue;
  Q[m] = function (...args: any[]) { const out = f.apply(this, args); tag = m; return out; };
}
const up = Q.update; Q.update = function (a: any, sim: any) { tag = 'other'; const cmd = up.call(this, a, sim); (sim as any).__qbTag = tag; (sim as any).__qbCmd = cmd; return cmd; };
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const qb = sim.qb; const ticks: any[] = []; let hitAt: number | null = null; const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (!qb || hitAt !== null || sim.throwAt >= 0) return;
      const b: any = qb.behavior, cmd = sim.__qbCmd; const pr = b.pressure?.(qb, sim);
      ticks.push({ t: sim.t, tag: sim.__qbTag, ask: cmd?.vel ? Math.hypot(cmd.vel.x, cmd.vel.y) : 0, got: Math.hypot(qb.vel.x, qb.vel.y), felt: pr ? Math.min(pr.time, 9) : null, phase: b.phase });
      if (sim.defense.some((d: any) => Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) <= 1.0)) hitAt = sim.t; };
    const res = sim.run();
    if (hitAt !== null) {
      const w = ticks.filter((k: any) => k.t > hitAt! - 0.8 + 1e-9), last = ticks.filter((k: any) => k.t > hitAt! - 0.5 + 1e-9);
      const mean = (a: any[], f: (k: any) => number) => a.length ? a.reduce((s, k) => s + f(k), 0) / a.length : NaN;
      const tags: Record<string, number> = {}; for (const k of w) tags[`${k.phase}:${k.tag}`] = (tags[`${k.phase}:${k.tag}`] ?? 0) + 1;
      const ev = sim.events.map((e: any) => e.type);
      console.log(JSON.stringify({ got: r2(mean(last, k => k.got)), ask: r2(mean(last, k => k.ask)), feltAt08: r2(w[0]?.felt), feltAt03: r2(w[Math.max(0, w.length - 7)]?.felt), tags,
        out: sim.throwAt >= 0 ? 'throw' : ev.includes('sack') ? 'sack' : 'other' }));
    }
    return res; } } });
}
