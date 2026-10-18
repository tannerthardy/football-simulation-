/** Stretch losses (observation only): for each outside/wide-zone play that
 * loses yards, the first defender to get a hand on the runner, where, and
 * his block history (who engaged him, how each rep ended, sheds/beats), plus
 * his installed fit and the blocker plan assigned to him at the snap.
 *
 * node --import tsx scripts/diag/stretch/losses.ts [--seeds 77,71001,1,2,3] [--formation ace_12]
 */
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { LOOK_SPECS, makeSim, rosters, caseId } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const R = rosters();
const rows: any[] = [];
let plays = 0;
for (const concept of arg('--concepts', 'oz,wz').split(',')) for (const dir of ['strong', 'weak'] as const)
  for (const lk of LOOK_SPECS.map(l => l[0])) for (const roster of ['pair11', 'pair31']) for (const seed of arg('--seeds', '77,71001,1,2,3').split(',').map(Number)) {
    const c = { concept, dir, look: lk, roster, seed, formation: arg('--formation', 'ace_12') };
    const sim = makeSim(c, R); plays++;
    const ps = dir === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
    const assigned = new Map<number, string[]>();
    for (const o of sim.offense) if (o.behavior instanceof RunBlocker && o.behavior.plan.target)
      (assigned.get(o.behavior.plan.target.idx) ?? assigned.set(o.behavior.plan.target.idx, []).get(o.behavior.plan.target.idx)!).push(`${o.slot}:${o.behavior.plan.kind}`);
    const reps = new Map<number, string[]>();
    const seen = new Set<any>();
    runContactObservers.set(sim, (e: any, phase: string, info: any) => {
      const k = e.defender.idx; const l = reps.get(k) ?? reps.set(k, []).get(k)!;
      if (!seen.has(e)) { seen.add(e); l.push(`${e.blocker.slot}@${sim.t.toFixed(2)}`); }
      if (phase === 'end') l.push(`end:${info.reason}@${sim.t.toFixed(2)}`);
    });
    let first: any = null;
    while (sim.phase === 'live' && sim.t < 20) {
      sim.tick();
      if (!first) for (const j of sim.world.joints) if (j.kind === 'grasp' && sim.carrier && j.b === sim.carrier.body) {
        const d = sim.agents.find(a => a.body === j.a)!;
        first = { d, t: sim.t, x: (sim.carrier.pos.x - sim.los) * sim.attackDir('O'), y: (sim.carrier.pos.y - sim.ballY) * ps,
          dy0: 0, dpos: { x: (d.pos.x - sim.los) * sim.attackDir('O'), y: (d.pos.y - sim.ballY) * ps } };
      }
    }
    const gain = sim.buildResult().offenseYards;
    if (gain >= 0 || !first) continue;
    const d = first.d;
    const events = sim.events.filter(e => (e.a === d.idx || e.b === d.idx) && ['shed', 'beat', 'block_contact', 'missed_block'].includes(e.type as string)).map(e => `${e.type}@${e.t}:${e.note ?? ''}`);
    rows.push({ id: caseId(c), gain: +gain.toFixed(2), tackler: d.slot, fit: d.runFit ? `${d.runFit.kind}:${d.runFit.gap}${d.runFit.side * ps > 0 ? '+' : '-'}` : null,
      at: +first.t.toFixed(2), runnerX: +first.x.toFixed(2), runnerLat: +first.y.toFixed(2), assigned: assigned.get(d.idx) ?? [], reps: reps.get(d.idx) ?? [], events });
  }
console.log(`stretch plays ${plays}, losses with a hold ${rows.length} (${(100 * rows.length / plays).toFixed(1)}%)`);
const tally = (f: (r: any) => string) => { const m: Record<string, number> = {}; for (const r of rows) m[f(r)] = (m[f(r)] ?? 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '); };
console.log('tackler:', tally(r => r.tackler));
console.log('tackler fit:', tally(r => r.fit ?? 'none'));
console.log('assigned blocker plan:', tally(r => r.assigned.join('+') || 'UNASSIGNED'));
console.log('engaged at all:', tally(r => r.reps.length ? 'engaged' : 'never engaged'));
console.log('how the first rep ended:', tally(r => (r.reps.find((x: string) => x.startsWith('end:')) ?? 'still engaged/none').split('@')[0]));
console.log('runner lateral at hold (+ play side):', tally(r => r.runnerLat > 4 ? 'wide(>4)' : r.runnerLat > 1.5 ? 'outside(1.5-4)' : r.runnerLat > -1.5 ? 'middle' : 'cutback'));
for (const r of rows.slice(0, 18)) console.log(' ', r.id, r.gain, r.tackler, r.fit, 'hold@', r.at, 'runner', r.runnerX, r.runnerLat, '| assigned', r.assigned.join(','), '| reps', r.reps.join(' '), '|', r.events.join(' '));
