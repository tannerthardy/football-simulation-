/** Lead/wrap puller probe (power, counter): does the lead block anyone, a
 * backer, before the back crosses the line; outcomes. Same code for every arm.
 * usage: node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/gap/leadprobe.ts OUT.jsonl [seeds] */
import { writeFileSync } from 'node:fs';
import { RunBlocker, playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { makeSim, rosters, LOOK_SPECS } from '../zone-lab/lab.js';
const [out = 'out/gs/lead.jsonl', seedsS = '2,71001'] = process.argv.slice(2);
const R = rosters(), r2 = (x: number) => Math.round(x * 100) / 100;
const rows: string[] = [];
for (const seed of seedsS.split(',').map(Number)) for (const concept of ['power', 'counter']) for (const formation of ['i_pro_21', 'ace_12'])
for (const dir of ['strong', 'weak'] as const) for (const [look] of LOOK_SPECS) {
  const id = [concept, dir, formation, look, 'pair11', seed].join('/');
  let sim;
  try { sim = makeSim({ concept, dir, formation, look, roster: 'pair11', seed } as never, R); } catch { continue; }
  const ps = playSideSign(sim, sim.offCall.run!), ad = sim.attackDir('O');
  const lead = sim.offense.find(o => o.behavior instanceof RunBlocker && (o.behavior as RunBlocker).plan.kind === 'pull'
    && (o.behavior as RunBlocker).plan.pullRole === 'lead');
  if (!lead) continue;
  let first: { slot: string; t: number } | null = null, cross: number | null = null, leadAtCross: number | null = null;
  const depth: Record<string, number | null> = { '1.4': null, '1.8': null, '2.2': null };
  while (sim.phase === 'live' && sim.t < 8) {
    sim.tick();
    if (!first && lead.engagement && lead.engagement.blocker === lead) first = { slot: lead.engagement.defender.slot, t: r2(sim.t) };
    const c = sim.carrier;
    if (cross === null && c && c.team === 'O' && c !== sim.qb && (c.pos.x - sim.los) * ad >= 0) {
      cross = r2(sim.t); leadAtCross = r2((lead.pos.y - c.pos.y) * ps);
    }
    for (const k of Object.keys(depth)) if (depth[k] === null && sim.t >= Number(k) - 1e-9) depth[k] = r2((lead.pos.x - sim.los) * ad);
  }
  const res = sim.buildResult();
  const rc = sim.carrier && sim.carrier.team === 'O' ? sim.carrier : sim.slot('RB')!;
  const fc = sim.events.find((e: any) => (e.type === 'carrier_contact' && (e.a === rc.idx || e.b === rc.idx))
    || ((e.type === 'tackle_wrap' || e.type === 'hit' || e.type === 'tackle') && e.b === rc.idx)) as any;
  const fcd = fc ? sim.agents[fc.a === rc.idx ? fc.b : fc.a] : null;
  rows.push(JSON.stringify({ id, concept, formation, dir, look, seed, lead: lead.slot, gain: r2(res.offenseYards),
    first, cross, leadAtCross, depth, blockedBeforeCross: !!first && cross !== null && first.t <= cross,
    backerBeforeCross: !!first && cross !== null && first.t <= cross && /^(LB|S|FS|SS|NB)/.test(first.slot),
    firstContact: fcd ? fcd.slot : null }));
}
writeFileSync(out, rows.join('\n') + '\n');
console.log(out, rows.length);
