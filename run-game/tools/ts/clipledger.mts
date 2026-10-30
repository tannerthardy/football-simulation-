/** Film clips: each puller's responsibility swaps from the #307 ledger, plus where he and his man were, and the result. */
import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const [seed, ...ids] = process.argv.slice(2);
const plays = deserialize(readFileSync(`out/run/restage/seed${seed}.bin`)) as any[];
for (const id of ids) {
  const p = plays.find(q => q.id === id); const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  const ledger = sim.recordResponsibility();
  sim.tick();
  const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
  const deep = new Map(pullers.map((o: any) => [o, 0])), first = new Map<any, string>();
  while (sim.phase === 'live' && sim.t < 8) {
    sim.tick();
    for (const o of pullers) { deep.set(o, Math.min(deep.get(o)!, o.pos.x - sim.los));
      if (!first.has(o) && o.engagement) first.set(o, `${o.engagement.defender.slot} at ${sim.t.toFixed(2)} s (${(o.engagement.defender.pos.x - sim.los).toFixed(1)} yd)`); }
  }
  const D = ledger.data, slot = (i: number | null) => i == null ? '-' : D.actors[i].slot;
  console.log(`${id} ${sim.offCall.label} vs ${sim.defCall.front?.id}: ${sim.result?.yards?.toFixed?.(1) ?? ''}`);
  for (const o of pullers) {
    const ch = D.changes.filter((c: any) => c.actor === o.idx && c.fields.includes('target') || (c.actor === o.idx && c.reason.startsWith('pull')));
    console.log(`  ${o.slot} ${o.behavior.plan.pullRole}: deepest ${(deep.get(o) as number).toFixed(2)} yd; first block ${first.get(o) ?? 'none'}; swaps: `
      + (ch.map((c: any) => `${c.t.toFixed(2)} ${c.reason}: ${slot(c.before.target)} -> ${slot(c.after.target)}`).join('; ') || 'none'));
  }
}
