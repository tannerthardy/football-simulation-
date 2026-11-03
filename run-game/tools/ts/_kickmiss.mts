import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker, playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const f = (v: number) => v.toFixed(2);
const agg: Record<string, number> = {}; let shown = 0;
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  snaps.forEach((p: any, ix: number) => { if (p.pass) return; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== 'power') return;
    const sim: any = new PlaySim(st); sim.tick();
    const k = sim.offense.find((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'pull' && a.behavior.plan.pullRole === 'kick')
      ?? sim.offense.find((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'lead' && a.behavior.plan.pullRole === 'kick');
    const e = k?.behavior.plan.target; if (!e) return;
    const ps = playSideSign(sim, sim.offCall.run), lat = (y: number) => (y - sim.ballY) * ps, dep = (x: number) => (x - sim.los) * sim.attackDir('O');
    let touched = false; const log: string[] = [];
    let next = .4;
    while (sim.t < 4 && sim.phase === 'live') { sim.tick();
      if (sim.offense.some((o: any) => o.engagement?.defender === e)) touched = true;
      if (sim.t + 1e-6 >= next && sim.t < 2.6) { next += .3; const car = sim.ball?.carrier ?? sim.slot('RB'); const b: any = k.behavior;
        log.push(`  t=${f(sim.t)} K ${k.slot}(${f(dep(k.pos.x))},${f(lat(k.pos.y))}) v${f(Math.hypot(k.vel.x, k.vel.y))} idx ${b.pullIdx ?? '-'} tgt ${b.plan.target?.slot} eng ${k.engagement?.defender.slot ?? '-'} | E ${e.slot}(${f(dep(e.pos.x))},${f(lat(e.pos.y))}) v(${f(e.vel.x * sim.attackDir('O'))},${f(e.vel.y * ps)}) | car(${f(dep(car.pos.x))},${f(lat(car.pos.y))})`); }
      const hit = sim.events.find((ev: any) => ev.type === 'carrier_contact');
      if (hit) break;
    }
    const hit = sim.events.find((ev: any) => ev.type === 'carrier_contact');
    if (!hit) return;
    const byE = hit.b === e.idx || hit.a === e.idx;
    const key = byE ? (touched ? 'first hit by kick man, after a block' : 'first hit by kick man, never blocked') : 'other';
    agg[key] = (agg[key] ?? 0) + 1;
    if (byE && !touched && shown < 5) { shown++; console.log(`--- seed ${seed} #${ix} ${k.slot} kicks ${e.slot}, hit at ${f(hit.t)}`); console.log(log.join('\n')); }
  });
}
console.log(agg);
