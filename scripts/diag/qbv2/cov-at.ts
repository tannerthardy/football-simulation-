// QB lane: at the V2 decision, his picture of the receiver (forecast now and +0.2 s) and of each defender within 7 yd.
import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const [concept, coverage, seed, ref] = process.argv.slice(2);
const setup: any = nativeTraceSetup({ concept, coverage, seed: Number(seed), roster: 3, formation: 'gun_doubles_11', flip: false });
if (concept === 'slant_flat') setup.offCall.pass = { ...PASS_BY_ID[concept], back: 'check' };
const sim: any = new PlaySim(setup); let done = false;
const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const b = sim.qb.behavior;
  if (!done && b?.v2 && b.v2.cycle.state === 'throw') { done = true;
    const r = sim.slot(sim.offAlign.numbering[ref]); const fc = b.receiverForecasts.get(r);
    const p0 = fc.predict(sim.t, 0), p2 = fc.predict(sim.t, 0.2);
    console.log('t', (sim.t - b.snapAt).toFixed(2), ref, r.slot, 'true', r.pos.x.toFixed(1), r.pos.y.toFixed(1), 'v', r.vel.x.toFixed(1), r.vel.y.toFixed(1), '| fc0', p0.x.toFixed(1), p0.y.toFixed(1), 'fc0.2', p2.x.toFixed(1), p2.y.toFixed(1), 'break', (fc.breakAt() - b.snapAt)?.toFixed?.(2));
    for (const d of sim.defense) { const e = b.mind.estimate(d); if (Math.hypot(e.pos.x - p0.x, e.pos.y - p0.y) > 7) continue;
      console.log('  ', d.slot, 'pic', e.pos.x.toFixed(1), e.pos.y.toFixed(1), 'v', e.vel.x.toFixed(1), e.vel.y.toFixed(1), '| true', d.pos.x.toFixed(1), d.pos.y.toFixed(1), 'v', d.vel.x.toFixed(1), d.vel.y.toFixed(1), 'age', b.mind.pictureAge(d).toFixed(2)); } }
  if (sim.t > 3) sim.phase = 'dead'; };
sim.run();
