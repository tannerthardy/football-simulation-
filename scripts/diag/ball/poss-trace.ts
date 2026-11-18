// Ball state around a possession change after a catch. node --import tsx scripts/diag/ball/poss-trace.ts [from] [to]
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const from = Number(process.argv[2] ?? 5.0), to = Number(process.argv[3] ?? 9);
const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'tampa2', concept: 'dagger', formation: 'gun_trips_11', seed: 2, roster: 2, flip: true }));
let last = '', evN = 0;
const tick0 = sim.tick.bind(sim);
sim.tick = () => {
  tick0();
  for (; evN < sim.events.length; evN++) { const e = sim.events[evN]; if (e.t >= from - 0.3 && e.t <= to) console.log(`  EVENT t=${e.t.toFixed(2)} ${e.type} a=${sim.agents[e.a]?.slot ?? ''} b=${sim.agents[e.b]?.slot ?? ''} ${e.note ?? ''}`); }
  if (sim.t < from || sim.t > to) return;
  const b = sim.ball; const c = b.kind === 'held' ? b.carrier : null;
  const sig = `${b.kind}|${c ? c.team + c.slot : ''}|${sim.bond ? 'bond' : ''}`;
  if (sig !== last || Math.abs(sim.t * 10 - Math.round(sim.t * 10)) < 1e-6 && sim.t % 0.5 < 0.05) { console.log(`t=${sim.t.toFixed(2)} ball=${b.kind} carrier=${c ? c.team + c.slot : '-'} bond=${sim.bond ? sim.bond.progressX?.toFixed?.(1) : '-'} pos=${b.kind === 'held' ? c.pos.x.toFixed(1) + ',' + c.pos.y.toFixed(1) : b.flight ? b.flight.pos.x.toFixed(1) + ',' + b.flight.pos.y.toFixed(1) + ',z' + b.flight.pos.z.toFixed(2) : ''}`); last = sig; }
};
sim.run();
console.log(sim.segments.map((s: any) => `${s.team}:${s.carrier}:${s.how}:${s.end}`).join(' | '));
