import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
let shown = 0;
for (const seed of process.argv.slice(2)) for (const [i, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass || shown >= 6) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/outsideZone|wideZone/.test(sim.offCall.run?.scheme ?? '')) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const combos = [...new Set<any>(sim.offense.map((o: any) => o.behavior?.plan?.combination).filter(Boolean))];
  const watch = combos.map((cb: any) => ({ cb, owner: cb.members[0], helper: cb.members[1], d: cb.defender, backer: cb.backer, rel: -1, kept: true, hit: -1, alone: -1 }));
  while (sim.phase === 'live' && sim.t < 3.5) {
    sim.tick();
    for (const w of watch) {
      const e = w.d.engagement;
      if (w.rel < 0 && w.alone < 0 && e && e.blocker === w.helper && !w.owner.engagement) w.alone = sim.t;
      if (w.rel < 0 && w.cb.released) w.rel = sim.t;
      if (w.rel >= 0 && w.owner.behavior.plan.kind === 'climb' && w.owner.tags.has('combo-check-climb')) {
        if (w.hit < 0 && w.owner.engagement?.defender === w.backer) w.hit = sim.t;
        const c = sim.carrier; if (c && c !== sim.qb && c.pos.x < sim.los && !(w.d.engagement && w.d.engagement.blocker === w.helper)) w.kept = false;
      }
    }
  }
  for (const w of watch) if (w.rel >= 0 && w.owner.tags.has('combo-check-climb') && w.hit > 0 && w.kept) {
    shown++; console.log(`seed ${seed} #${i} ${sim.offCall.run.scheme} owner ${w.owner.slot} helper ${w.helper.slot} on ${w.d.slot}: helper alone ${w.alone.toFixed(2)}, owner climbs ${w.rel.toFixed(2)}, hits ${w.backer.slot} ${w.hit.toFixed(2)}`);
  }
}
