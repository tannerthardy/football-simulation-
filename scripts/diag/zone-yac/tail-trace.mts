// One play: catcher, route, catch spot; every defender at the catch and each 1.0 s after: pos (x past LOS, y), speed, distance to carrier, behavior kind/zone/tags.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const [cov, concept, formation, seed, flip] = process.argv.slice(2);
const sim: any = new PlaySim(nativeTraceSetup({ coverage: cov, concept, seed: +seed, roster: +seed, formation, flip: flip === '1' }));
const dir = sim.attackDir(sim.offense[0].team), los = sim.los; let C: any = null, tc = -1, next = 0;
const dump = (lab: string) => { const cx = (C.pos.x - los) * dir; console.log(`${lab} t${sim.t.toFixed(2)} carrier ${C.slot} x${cx.toFixed(1)} y${C.pos.y.toFixed(1)} v${Math.hypot(C.vel.x, C.vel.y).toFixed(1)} vy${C.vel.y.toFixed(1)}`);
  for (const d of [...sim.defense].sort((a: any, b: any) => Math.hypot(a.pos.x - C.pos.x, a.pos.y - C.pos.y) - Math.hypot(b.pos.x - C.pos.x, b.pos.y - C.pos.y)).slice(0, 6)) {
    const b = d.behavior; console.log(`   ${d.slot.padEnd(7)} x${((d.pos.x - los) * dir).toFixed(1).padStart(5)} y${d.pos.y.toFixed(1).padStart(5)} v${Math.hypot(d.vel.x, d.vel.y).toFixed(1)} vx${(d.vel.x * dir).toFixed(1)} vy${d.vel.y.toFixed(1)} dist${Math.hypot(d.pos.x - C.pos.x, d.pos.y - C.pos.y).toFixed(1).padStart(5)} ${b?.kind ?? ''} ${b?.zone ?? ''} ${b?.state ?? ''} [${[...(d.tags ?? [])].join(',')}]`); } };
const tick = sim.tick.bind(sim);
sim.tick = () => { tick(); const bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  if (!C && sim.ball.kind === 'air' && !(globalThis as any).thrown) { (globalThis as any).thrown = 1; const q = sim.qb; console.log('qb', ((q.pos.x - los) * dir).toFixed(1), q.pos.y.toFixed(1), 'snap', sim.snapAt); console.log('throw t', sim.t.toFixed(2), sim.ball.target?.slot, sim.ball.target?.behavior?.route?.id, 'target at', ((sim.ball.target.pos.x - los) * dir).toFixed(1), sim.ball.target.pos.y.toFixed(1)); for (const d of sim.defense) console.log(`   ${d.slot.padEnd(7)} x${((d.pos.x - los) * dir).toFixed(1)} y${d.pos.y.toFixed(1)} ${d.behavior?.kind ?? ''} ${d.behavior?.zone ?? ''} ${d.behavior?.man?.slot ?? d.behavior?.target?.slot ?? ''} [${[...(d.tags ?? [])].join(',')}]`); }
  if (!C && bc && bc.team === sim.offense[0].team && bc !== sim.qb) { C = bc; tc = sim.t; next = tc; }
  if (C && sim.t >= next - 1e-9) { dump(`+${(sim.t - tc).toFixed(1)}s`); next += 1.0; } };
const r = sim.run(); console.log('result', r.yards, sim.events.filter((e: any) => /tackle|touchdown|out_of/.test(e.type)).map((e: any) => e.type));
