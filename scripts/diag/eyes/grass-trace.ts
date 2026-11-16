// CONCEPT_DROPS=1 QB_FOOTWORK=11 node --import tsx scripts/diag/eyes/grass-trace.ts concept coverage roster seed
// One staged play: his read index, phase, eyes and whether the current read is ready, each change, until the ball leaves.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const [concept, coverage, roster, seed] = process.argv.slice(2);
const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed: +seed, roster: +roster, formation: 'gun_doubles_11', flip: false }));
let last = '';
for (let i = 0; i < 600 && sim.phase === 'live' && sim.carrier === sim.qb; i++) {
  sim.tick(); const b: any = sim.qb.behavior; if (b?.kind !== 'qb-pass') continue;
  const r = b.reads?.[b.readIdx], id = r?.behavior?.route?.id ?? r?.slot;
  const s = `${b.phase} idx=${b.readIdx}(${id}) eyes=${sim.qbEyes?.slot ?? '-'}`;
  if (s !== last) { console.log(sim.t.toFixed(2), s, 'reads=', b.reads.map((x: any) => x.behavior?.route?.id ?? x.slot).join(',')); last = s; }
}
console.log('end', sim.t.toFixed(2), sim.events.filter((e: any) => ['sack', 'pass'].includes(e.type)).map((e: any) => e.type).join(','));
