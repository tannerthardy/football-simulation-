// During the flight: each defender's release belief (releasedAt / ballAt, s after release), and every 0.4 s his position
// relative to the arrival spot, speed toward it, behavior kind/zone and tags.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { releaseBelief } = await import(`${W}/src/sim/release-belief.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const [cov, concept, formation, seed, flip] = process.argv.slice(2);
const sim: any = new PlaySim(nativeTraceSetup({ coverage: cov, concept, seed: +seed, roster: +seed, formation, flip: flip === '1' }));
const dir = sim.attackDir(sim.offense[0].team), los = sim.los; let rel = -1, arr: any = null, nx = 0; const bel = new Map<string, any>();
const tick = sim.tick.bind(sim);
sim.tick = () => { tick();
  if (sim.ball.kind === 'air') { if (rel < 0) { rel = sim.t; nx = rel; arr = sim.ball.intended ?? sim.ball.flight.pos; console.log('release', rel.toFixed(2), 'arrival', sim.ball.arrivalT.toFixed(2), 'spot x', ((arr.x - los) * dir).toFixed(1), 'y', arr.y.toFixed(1)); }
    for (const d of sim.defense) { const b = releaseBelief(sim, d); const o = bel.get(d.slot) ?? {}; if (b.releasedAt !== undefined && o.rel === undefined) o.rel = +(sim.t - rel).toFixed(2); if (b.ballAt !== undefined && o.ball === undefined) o.ball = +(sim.t - rel).toFixed(2); bel.set(d.slot, o); }
    if (sim.t >= nx - 1e-9) { nx += 0.4; console.log(` +${(sim.t - rel).toFixed(2)}`);
      for (const d of sim.defense.filter((q: any) => q.behavior?.kind !== 'rush')) { const tx = arr.x - d.pos.x, ty = arr.y - d.pos.y, l = Math.hypot(tx, ty);
        console.log(`   ${d.slot.padEnd(5)} toSpot ${l.toFixed(1).padStart(5)} closing ${((d.vel.x * tx + d.vel.y * ty) / l).toFixed(1).padStart(5)} ${d.behavior?.kind} ${d.behavior?.zone ?? ''} belief ${JSON.stringify(bel.get(d.slot))} [${[...(d.tags ?? [])].filter((t: string) => !/onBall|readArm|arm-bite/.test(t)).join(',')}]`); } } } };
sim.run();
