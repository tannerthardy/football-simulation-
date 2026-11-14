// Why a rusher within a yard of the QB has no hold before the ball leaves (Flex, 2026-11-13: only 5.5% of deliveries
// had a grasp on the QB). From each first contact (a defender within 1.0 yd, ball in hand) to the release or the end:
// per tick, which of tryTackles' gates held that defender back: engaged and not working free (the rep's win < 0.6 and
// no free side), out of his reach range, his tackle cooldown, or eligible (then he attempts or keeps his feet for a
// better chance). The tackle events after contact and the outcome.
// usage: [flags] node --import tsx scripts/diag/effective-mass/qb-tackle-gates.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: any[] = []; const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  let c: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const qb = sim.qb, live = sim.throwAt < 0 && sim.carrier === qb && sim.t >= 0.5;
    if (live && !c) for (const d of sim.defense) if (Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) <= 1.0) { c = { d, t: sim.t, gates: { engaged: 0, range: 0, cooldown: 0, eligible: 0, bonded: 0 } }; break; }
    if (c && live) {
      const d = c.d, dx = qb.pos.x - d.pos.x, dy = qb.pos.y - d.pos.y, dd = Math.hypot(dx, dy), e = d.engagement;
      const body = qb.profile.radius + d.profile.radius;
      const blockerY = e ? e.blocker.pos.y - d.pos.y : 0, freeSide = !!e && Math.abs(blockerY) >= 0.25 && blockerY * dy < 0;
      const arms = body + d.profile.reach * (e ? (freeSide ? 0.7 - 0.3 * Math.max(0, Math.min(1, e.control)) : 0.4) : 1), range = arms + (e ? 0 : 0.45);
      const k = sim.bond?.carrier === qb ? 'bonded' : sim.t < d.nextTackleAt ? 'cooldown' : e && !freeSide && e.win < 0.6 ? 'engaged' : dd > range ? 'range' : 'eligible';
      c.gates[k]++;
    }
    tick();
  };
  const r = sim.run();
  if (c) {
    const after = sim.events.filter((x: any) => x.t >= c.t - 1e-9 && (sim.throwAt < 0 || x.t <= sim.throwAt + 1e-9));
    rows.push({ ...c.gates, attempts: after.filter((x: any) => ['missed_tackle', 'tackle_wrap', 'tackle'].includes(x.type) && x.b === sim.qb.idx).length,
      out: sim.events.some((x: any) => x.type === 'sack') ? 'sacked' : sim.throwAt >= 0 ? 'threw' : 'escaped', engagedAtContact: !!c.d.engagement });
  }
  return r;
} } });
const sum = (k: string, R: any[]) => R.reduce((a, r) => a + r[k], 0);
for (const o of ['threw', 'sacked', 'escaped']) {
  const R = rows.filter((r) => r.out === o); if (!R.length) continue;
  const tot = ['engaged', 'range', 'cooldown', 'eligible', 'bonded'].reduce((a, k) => a + sum(k, R), 0) || 1;
  console.log(`${o.padEnd(7)} n ${R.length} | engaged at contact ${(100 * R.filter((r) => r.engagedAtContact).length / R.length).toFixed(0)}% | ticks from contact to the ball out: `
    + ['engaged', 'range', 'cooldown', 'eligible', 'bonded'].map((k) => `${k} ${(100 * sum(k, R) / tot).toFixed(0)}%`).join(', ')
    + ` | a tackle attempt on the QB before the ball left ${(100 * R.filter((r) => r.attempts > 0).length / R.length).toFixed(0)}%`);
}
