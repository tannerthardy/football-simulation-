// Shed recovery on designed runs (Run Game, 2026-11-24), measurement only. For every run engagement that ends while the
// carrier is still short of the defender's level (along the attack direction), the defender's next 0.5 s at 0.05 s:
// speed, the speed his controller commanded, his support state and balance use (deviation fraction of his critical
// capture point; World availability), any World contact with his former blocker, any hand joint still on him, and the
// engagement end reason (runContactObservers). Summary by position group in shed-recovery.py.
// Usage: node --import tsx shed-recovery.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { runContactObservers } = await import(`${W}/src/sim/run-contact-observer.ts`);
const { deviationFraction, supportParams } = await import(`${W}/src/physics/support.ts`);
const { fatigueFactor } = await import(`${W}/src/physics/kinematics.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const rows: any[] = [];
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) {
    s = !compilingPlan() && this.offCall?.kind === 'run' && this.defCall ? { live: new Set<any>(), track: [] as any[], reasons: new Map<any, string>() } : null;
    st.set(this, s);
    if (s) {
      const prev = runContactObservers.get(this);
      runContactObservers.set(this, (e: any, ph: string, data: any) => { prev?.(e, ph, data); if (ph === 'end') s.reasons.set(e, data?.reason ?? '?'); });
    }
  }
  const before: Set<any> | null = s ? new Set<any>(this.engagements.filter((e: any) => e.type === 'run')) : null;
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  const carrier = bc && bc.team === sim.offense[0].team && bc !== sim.qb ? bc : null;
  const dir = sim.attackDir(sim.offense[0].team);
  // Engagements that ended this tick.
  for (const e of before!) if (!sim.engagements.includes(e)) {
    const d = e.defender;
    if (!carrier || sim.bond) continue;
    const short = (d.pos.x - carrier.pos.x) * dir > 0;
    if (!short) continue;
    s.track.push({ d, b: e.blocker, t0: sim.t, pos: d.player.position, reason: s.reasons.get(e) ?? 'no observed reason', engaged: r3(sim.t - e.start), ticks: [] as any[] });
  }
  for (const x of s.track) {
    if (x.done) continue;
    const el = sim.t - x.t0;
    if (el > 0.5 + 1e-9) { x.done = true; continue; }
    const d = x.d, sup = d.body.support;
    const cmd = sim.cmds?.[d.idx]?.vel;
    const dev = sup && sup.state === 'up' ? deviationFraction(sup, supportParams(d.profile), fatigueFactor(d.body.energy)) : null;
    const touching = !!sim.lastStep?.contacts?.some((h: any) => (h.i === d.idx && h.j === x.b.idx) || (h.i === x.b.idx && h.j === d.idx));
    const hands = sim.world.joints.some((j: any) => j.kind === 'hands' && !j.off && (j.a === d.body || j.b === d.body));
    const re = !!d.engagement;
    x.ticks.push([r3(el), r3(Math.hypot(d.vel.x, d.vel.y)), cmd ? r3(Math.hypot(cmd.x, cmd.y)) : null, sup?.state?.[0] ?? '?', dev === null ? null : r3(dev), touching ? 1 : 0, hands ? 1 : 0, re ? 1 : 0,
      carrier ? r3(Math.hypot(carrier.pos.x - d.pos.x, carrier.pos.y - d.pos.y)) : null, r3(d.profile.vmax * (d.speedScale ?? 1)),
      cmd && Math.hypot(d.vel.x, d.vel.y) > 0.3 && Math.hypot(cmd.x, cmd.y) > 0.3 ? Math.round(Math.abs(Math.atan2(d.vel.x * cmd.y - d.vel.y * cmd.x, d.vel.x * cmd.x + d.vel.y * cmd.y)) * 180 / Math.PI) : null,
      r3(Math.abs(Math.atan2(Math.sin(d.body.facing - Math.atan2(cmd?.y ?? 0, cmd?.x ?? 1)), Math.cos(d.body.facing - Math.atan2(cmd?.y ?? 0, cmd?.x ?? 1)))) * 180 / Math.PI)]);
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) for (const x of s.track) { delete x.d; delete x.b; rows.push(x); }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} releases`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, rows }));
console.log('releases', rows.length);
