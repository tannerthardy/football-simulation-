/** Doubled zone reps: ground impulse along the attack direction per tick for owner, helper, DL; masses; ratings. */
import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const sets = process.argv.slice(2).flatMap(f => deserialize(readFileSync(f)) as any[]);
let n = 0, go = 0, gh = 0, gd = 0, gdLat = 0, mo = 0, mh = 0, md = 0, so = 0, sh = 0, sd = 0;
for (const p of sets) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  if (!sim.offCall.run || !['insideZone','outsideZone','wideZone'].includes(sim.offCall.run.scheme)) continue;
  sim.event('snap', sim.slot('C')); const dir = sim.attackDir('O');
  while (sim.phase === 'live' && sim.t < 2.5) {
    sim.tick(); const g = sim.lastStep?.groundImpulse; if (!g) continue;
    for (const e of sim.engagements) {
      if (e.type !== 'run' || !e.helpers.length) continue;
      const h = e.helpers[0], dt = sim.dt;
      n++; go += g[e.blocker.idx].x * dir / dt; gh += g[h.idx].x * dir / dt; gd += g[e.defender.idx].x * dir / dt;
      mo += e.blocker.profile.massKg; mh += h.profile.massKg; md += e.defender.profile.massKg;
      so += e.blocker.r('strength'); sh += h.r('strength'); sd += e.defender.r('strength');
    }
  }
}
const f = (x: number) => (x / n).toFixed(0);
console.log(`doubled ticks ${n}: ground force along attack (kg·yd/s²): owner ${f(go)}, helper ${f(gh)}, DL ${f(gd)} (negative = pushing toward the offense)`);
const G: any = globalThis; console.log(`helper commands: recovery ${G.__rec ?? 0}, ordinary ${G.__norec ?? 0} (with preparation ${G.__prep ?? 0})`);
console.log(`mass owner ${f(mo)} helper ${f(mh)} DL ${f(md)} kg; strength rating owner ${(so/n).toFixed(2)} helper ${(sh/n).toFixed(2)} DL ${(sd/n).toFixed(2)}`);
