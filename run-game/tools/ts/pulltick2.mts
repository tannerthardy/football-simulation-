/** One saved run-only snap: every puller's internal pull state per tick (waypoint, clearance, cleared, command). */
import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const [seed, id, every = '2', until = '3'] = process.argv.slice(2);
const p = (deserialize(readFileSync(`out/run/restage/seed${seed}.bin`)) as any[]).find(q => q.id === id);
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
const f = (v: number) => v.toFixed(2);
console.log(id, sim.offCall.label, sim.defCall.label, 'los', sim.los);
for (const o of pullers) console.log(' ', o.slot, o.behavior.plan.pullRole, '->', o.behavior.plan.target?.slot, 'path', o.behavior.plan.pullPath.map((w: any) => `(${f(w.x - sim.los)},${f(w.y)})`).join(' '));
let n = 0;
while (sim.phase === 'live' && sim.t < +until) {
  sim.tick(); if (n++ % +every) continue;
  const c = sim.carrier;
  for (const o of pullers) {
    const b: any = o.behavior, tg = b.plan.target, read = b.pullRead;
    console.log(`${f(sim.t)} ${o.slot} ${b.plan.pullRole} idx ${b.pullIdx} wp ${b.plan.pullPath[b.pullIdx] ? `(${f(b.plan.pullPath[b.pullIdx].x - sim.los)},${f(b.plan.pullPath[b.pullIdx].y)})` : '-'} `
      + `pos (${f(o.pos.x - sim.los)},${f(o.pos.y)}) vel (${f(o.vel.x)},${f(o.vel.y)}) req (${f(sim.intents[o.idx].vel.x)},${f(sim.intents[o.idx].vel.y)}) `
      + `cleared ${b.pullCleared ? 1 : 0} clearX ${read?.clearanceX != null ? f(read.clearanceX - sim.los) : '-'} tgt ${tg?.slot ?? '-'}${tg ? ` (${f(tg.pos.x - sim.los)},${f(tg.pos.y)})` : ''} eng ${o.engagement?.defender.slot ?? '-'} `
      + `| ball ${c?.slot ?? '-'} (${c ? f(c.pos.x - sim.los) : '-'},${c ? f(c.pos.y) : '-'})`);
  }
}
const e = sim.events.find((e: any) => e.type === 'carrier_contact'); console.log('first contact', e?.t, e && sim.agents[e.b].slot, 'yards', sim.run().yards.toFixed(1));
