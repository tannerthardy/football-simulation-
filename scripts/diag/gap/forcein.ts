/** Counterfactual (diagnostic only, via the run-read observer, no source edit):
 * CF=base   unchanged
 * CF=inside whenever the read prefers the kick's inside surface (no log) and
 *           selected an entry outside the kicker, the runner instead takes the
 *           best-scoring entry inside the kicker (the same route law).
 * Does the inside lane really stay closed in the physics?
 * usage: CF=inside bash out/raw.sh out/gap/forcein/forcein.ts OUT.jsonl DIR SEED ROSTER [concepts] [formations] */
import { writeFileSync } from 'node:fs';
import { makeSim, rosters, LOOK_SPECS } from '../zone-lab/lab.js';
import { RunBlocker, playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { runReadObservers } from '../../../src/sim/run-read-observer.js';
const [out, dir = 'strong', seedS = '77', roster = 'pair11', conceptsS = 'power,counter,trap', formsS = 'i_pro_21,ace_12'] = process.argv.slice(2);
const CF = process.env.CF ?? 'base';
const R = rosters();
const r2 = (v: number) => Math.round(v * 100) / 100;
const lines: string[] = [];
for (const concept of conceptsS.split(',')) for (const formation of formsS.split(',')) for (const [look] of LOOK_SPECS) {
  const id = [concept, dir, formation, look, roster, seedS].join('/');
  const sim = makeSim({ concept, dir, formation, look, roster, seed: Number(seedS) } as any, R);
  const ps = playSideSign(sim, sim.offCall.run!);
  const kicker = sim.offense.find((b) => b.behavior instanceof RunBlocker && ['kick', 'trap'].includes((b.behavior as RunBlocker).plan.pullRole as string));
  if (!kicker) continue;
  const kplan = (kicker.behavior as RunBlocker).plan, end0 = kplan.target!;
  let forced = 0, reads = 0;
  runReadObservers.set(sim, (ev: any) => {
    if (ev.phase !== 'aim' || !ev.selected) return;
    reads++;
    const ky = kicker.pos.y;
    if ((kicker.pos.x - sim.los) * sim.attackDir('O') < -1.5) return;
    if ((ev.preferred - ky) * ps >= 0) return; // log: preferred outside
    if ((ev.selected.y - ky) * ps <= -0.3) return; // already inside
    if (CF !== 'inside') return;
    const inside = (ev.candidates as Array<{ entry: { x: number; y: number }; score: number }>).filter((c) => (c.entry.y - ky) * ps <= -0.3);
    if (!inside.length) return;
    const b = inside.reduce((p, c) => (c.score < p.score ? c : p));
    ev.selected.x = b.entry.x; ev.selected.y = b.entry.y; forced++;
  });
  let cross: number | null = null, endAtCross: number | null = null;
  while (sim.phase === 'live' && sim.t < 8) {
    sim.tick();
    const c = sim.carrier;
    if (cross === null && c && c.team === 'O' && c !== sim.qb && (c.pos.x - sim.los) * sim.attackDir('O') >= 0) {
      cross = r2((c.pos.y - kicker.pos.y) * ps);
      const end = kplan.target ?? end0; endAtCross = r2((c.pos.y - end.pos.y) * ps);
    }
  }
  const res = sim.buildResult();
  const rc = sim.carrier && sim.carrier.team === 'O' ? sim.carrier : sim.slot('RB')!;
  const fc = sim.events.find((e: any) => (e.type === 'carrier_contact' && (e.a === rc.idx || e.b === rc.idx)) || ((e.type === 'tackle_wrap' || e.type === 'hit' || e.type === 'tackle') && e.b === rc.idx)) as any;
  const fcd = fc ? sim.agents[fc.a === rc.idx ? fc.b : fc.a] : null;
  lines.push(JSON.stringify({ id, concept, cf: CF, gain: r2(res.offenseYards), forced, reads, crossVsKicker: cross, crossVsEnd: endAtCross,
    first: fcd ? fcd.slot : null, firstT: fc ? r2(fc.t) : null, firstX: fc && fcd ? r2((rc.pos.x - sim.los) * sim.attackDir('O')) : null }));
}
writeFileSync(out, lines.join('\n') + '\n');
console.log(out, lines.length, CF);
