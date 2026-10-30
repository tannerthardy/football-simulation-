/** Single-blocker run reps on a down lineman: the feet law's split of ground force (instrumented World). */
import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const sets = process.argv.slice(2).flatMap(f => deserialize(readFileSync(f)) as any[]);
const G: any = globalThis; const tot: Record<string, any> = {};
const blank = () => ({ n: 0, gait: 0, gaitX: 0, gaitY: 0, lean: 0, leanX: 0, leanY: 0, tgt: 0, cap: 0, trac: 0, a: 0, felt: 0, pushCap: 0, capLeg: 0, px: 0, py: 0, glx: 0, gly: 0 });
for (const p of sets) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted || !sim.offCall.run) continue;
  const dir = sim.attackDir('O');
  while (sim.phase === 'live' && sim.t < 3) {
    // Watch the bodies in a single run rep on a down lineman as this tick starts.
    const watch = new Map<number, any>(), role = new Map<number, string>();
    for (const e of sim.engagements) if (e.type === 'run' && !e.helpers.length && /^(DT|DE|NT)/.test(e.defender.slot)) {
      watch.set(e.blocker.idx, blank()); role.set(e.blocker.idx, 'OL'); watch.set(e.defender.idx, blank()); role.set(e.defender.idx, 'DL'); }
    G.__FEET = watch; sim.tick(); G.__FEET = null;
    for (const [i, r] of watch) { if (!r.n) continue; const t = (tot[role.get(i)!] ??= { ...blank(), ticks: 0 }); t.ticks++;
      // Orient along the attack direction: OL upfield = +x*dir, DL "down" (into the backfield) = -x*dir.
      const s = role.get(i) === 'OL' ? dir : -dir;
      for (const k of Object.keys(r)) if (k !== 'n') t[k] += (['gaitX','leanX','px','glx'].includes(k) ? r[k] * s : ['gaitY','leanY','py','gly'].includes(k) ? Math.abs(r[k]) : r[k]) / (['a','capLeg','trac'].includes(k) ? r.n : r.trac);
    }
  }
}
for (const [role, t] of Object.entries(tot)) {
  const f = (k: string) => (t[k] / t.ticks).toFixed(2);
  console.log(`${role} (${t.ticks} ticks), as a share of traction: gait request ${f('gait')} (toward ${role==='OL'?'upfield':'backfield'} ${f('gaitX')}, |sideways| ${f('gaitY')}); `
    + `lean ${f('lean')} (toward ${f('leanX')}); lean target ${f('tgt')}; felt load ${f('felt')}; cap ${f('cap')} (leg-strength bound on ${(100*t.capLeg/t.ticks).toFixed(0)}% of substeps); availability ${f('a')}; `
    + `after allocation: gait toward ${f('glx')} |sideways| ${f('gly')}, lean toward ${f('px')} |sideways| ${f('py')}`);
}
