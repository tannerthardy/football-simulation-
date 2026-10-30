import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const sets = process.argv.slice(2).flatMap(f => deserialize(readFileSync(f)) as any[]);
let n = 0, own = 0, help = 0, ownLoaded = 0, helpLoaded = 0, helpJoint = 0, ownUp = 0, helpUp = 0, dlUp = 0, contactImp = 0, helpBodyImp = 0;
for (const p of sets) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  if (!sim.offCall.run || !['insideZone','outsideZone','wideZone'].includes(sim.offCall.run.scheme)) continue;
  sim.event('snap', sim.slot('C'));
  const dir = sim.attackDir('O');
  while (sim.phase === 'live' && sim.t < 2.5) {
    sim.tick();
    for (const e of sim.engagements) {
      if (e.type !== 'run' || !e.helpers.length) continue;
      const h = e.helpers[0], hj = e.helperHands?.get(h);
      const f = (j: any) => j ? Math.hypot(j.normalForce ?? 0, j.tangentForce ?? 0) : 0;
      n++; own += f(e.hands); help += f(hj); if (f(e.hands) > 1) ownLoaded++; if (f(hj) > 1) helpLoaded++; if (hj && sim.world.joints.includes(hj)) helpJoint++;
      ownUp += e.blocker.body.vel.x * dir; helpUp += h.body.vel.x * dir; dlUp += e.defender.body.vel.x * dir;
      for (const c of sim.lastStep?.contacts ?? []) {
        const pair = [c.i, c.j];
        if (pair.includes(e.defender.idx) && pair.includes(h.idx)) helpBodyImp += c.impulse;
        if (pair.includes(e.defender.idx) && pair.includes(e.blocker.idx)) contactImp += c.impulse;
      }
    }
  }
}
console.log(`doubled run reps x ticks ${n}: hands force owner ${(own/n).toFixed(0)} (loaded ${(100*ownLoaded/n).toFixed(0)}%), helper ${(help/n).toFixed(0)} (loaded ${(100*helpLoaded/n).toFixed(0)}%, joint present ${(100*helpJoint/n).toFixed(0)}%); body-contact impulse/tick owner ${(contactImp/n).toFixed(1)} helper ${(helpBodyImp/n).toFixed(1)}; upfield vel owner ${(ownUp/n).toFixed(2)} helper ${(helpUp/n).toFixed(2)} DL ${(dlUp/n).toFixed(2)}`);
