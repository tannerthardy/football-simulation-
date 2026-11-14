// The QB's felt time to contact against the true time, per rusher near him (Rules + Coaching / Integration,
// 2026-11-12: a free DE read as still blocked). Each 0.1 s from 1.5 s: every defender within 4 yd -- true distance,
// whether the sim has him engaged, the engaged blocker's distance from him, the nearest offensive body's, held(), the
// QB's estimate for him (felt picture + held) and the true time (true state, no hold); the QB's pressure() time.
// usage: [flags] node --import tsx scripts/diag/effective-mass/feel-trace.mts [concept] [coverage] [seed] [flip 0/1] [formation] [roster]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { timeToReach } = await import(`${W}/src/physics/reach.ts`);
const [concept = 'hitches', coverage = 'cover2', seed = '2', flip = '1', formation = 'gun_doubles_11', roster = '7'] = process.argv.slice(2);
const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed: Number(seed), roster: Number(roster), formation, flip: flip === '1' }));
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
let next = 1.5;
while (sim.phase === 'live' && sim.t < 7) {
  sim.tick();
  const qb = sim.qb, b = qb?.behavior;
  if (!qb || sim.carrier !== qb || sim.t + 1e-9 < next) continue;
  next = sim.t + 0.1;
  const rows: any[] = [];
  for (const d of sim.defense) {
    const dist = Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y);
    if (dist > 4 || d.isDown(sim.t)) continue;
    const seen = b.felt(qb, sim, d), held = b.held(qb, d, sim);
    const est = timeToReach({ pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale }, qb.pos, 0.8) + held;
    const tru = timeToReach({ pos: d.pos, vel: d.vel, profile: d.profile, speedScale: d.speedScale }, qb.pos, 0.8);
    const e = d.engagement;
    const near = Math.min(...sim.offense.filter((o: any) => o !== qb).map((o: any) => Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y)));
    rows.push({ d: d.slot ?? d.player.position, dist: r2(dist), eng: !!e, win: e ? r2(e.win) : null,
      blk: e ? r2(Math.hypot(e.blocker.pos.x - d.pos.x, e.blocker.pos.y - d.pos.y)) : null, nearO: r2(near), held: r2(held), est: r2(est), true: r2(tru), age: r2(seen.age ?? 0) });
  }
  const pr = b.pressure(qb, sim);
  console.log(JSON.stringify({ t: r2(sim.t), phase: b.phase, pressure: r2(pr.time), who: pr.agent?.slot ?? null, rows }));
}
console.log(JSON.stringify({ end: r2(sim.t), events: sim.events.filter((e: any) => ['throw', 'sack', 'catch', 'incomplete', 'throwaway', 'scramble'].includes(e.type)).map((e: any) => `${e.type}@${r2(e.t)}`) }));
