import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const setup: any = nativeTraceSetup({ concept: 'stick', coverage: 'cover3', seed: 1, roster: 3, formation: 'gun_doubles_11', flip: false });
const sim: any = new PlaySim(setup); let done = false;
const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const b = sim.qb.behavior;
  if (!done && b?.kind === 'qb-pass' && sim.t > 1.2) { done = true;
    for (const ref of ['S1', 'S2', 'S3', 'W1', 'W2', 'B']) { const slot = sim.offAlign.numbering[ref], r = slot ? sim.slot(slot) : null;
      if (!r) { console.log(ref, 'no agent', slot); continue; }
      console.log(ref, slot, 'route', r.behavior?.route?.id ?? r.behavior?.kind, 'fc', b.receiverForecasts.has(r), 'pose', sim.see(sim.qb, r).pose, 'chk', b.checkRelease(r), 'seenOut', b.seenOut(r), 'ev', !!b.evaluate(sim.qb, sim, r, 0)); } }
  if (sim.t > 2) sim.phase = 'dead'; };
sim.run();
