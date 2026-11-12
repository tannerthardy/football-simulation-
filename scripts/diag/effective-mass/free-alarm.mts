// FREE_BOUND's alarms (Integration, 2026-11-12): when does the QB first feel a hit within 0.45 s (the hot path's
// threshold), was that driven by the bound (pressure() under the ordinary felt estimate by > 0.05 s), and did that man
// actually get within 1.3 yd of him within 1.0 s (while he held the ball, or the play went on)? What he did next: threw
// within 0.5 s, threw later, was sacked, scrambled. One JSON line per dropback with an alarm. Flags via env.
// usage: [flags] node --import tsx scripts/diag/effective-mass/free-alarm.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { timeToReach } = await import(`${W}/src/physics/reach.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const qb = sim.qb; let alarm: any = null; let next = 0;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      if (!qb) return;
      const b = qb.behavior;
      if (alarm && alarm.arrived === null && sim.t - alarm.t <= 1.0) {
        const d = sim.agents[alarm.d];
        if (Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) <= 1.3) alarm.arrived = r2(sim.t - alarm.t);
      }
      if (alarm || sim.carrier !== qb || sim.throwAt >= 0 || typeof b?.pressure !== 'function' || sim.t + 1e-9 < next || sim.t < 0.3) return;
      next = sim.t + 0.05;
      const pr = b.pressure(qb, sim);
      if (pr.time > 0.45 || !pr.agent) return;
      let ordinary = Infinity;
      for (const d of sim.defense) {
        if (d.isDown(sim.t)) continue;
        const seen = b.felt(qb, sim, d);
        ordinary = Math.min(ordinary, timeToReach({ pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale }, qb.pos, 0.8) + b.held(qb, d, sim));
      }
      alarm = { t: sim.t, d: pr.agent.idx, felt: r2(pr.time), ordinary: r2(ordinary), byBound: pr.time < ordinary - 0.05, dist: r2(pr.dist), arrived: null };
    };
    const res = sim.run(); const ev = sim.events.map((e: any) => e.type);
    if (alarm) {
      const thrown = sim.throwAt >= 0, after = thrown ? sim.throwAt - alarm.t : null;
      const out = thrown ? (after! <= 0.5 ? 'threw within 0.5 s' : 'threw later') : ev.includes('sack') ? 'sacked' : sim.scrambled ? 'scrambled' : 'other';
      console.log(JSON.stringify({ ...alarm, out, after: r2(after ?? NaN), complete: ev.includes('catch'), throwaway: ev.includes('throwaway'), yards: r2(res?.yards ?? NaN) }));
    } else console.log(JSON.stringify({ none: true, sack: ev.includes('sack') }));
    return res; } } });
}
