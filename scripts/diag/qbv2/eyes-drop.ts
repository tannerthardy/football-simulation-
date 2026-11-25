import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const setup: any = nativeTraceSetup({ concept: 'quick_outs', coverage: 'cover3', seed: 1, roster: 3, formation: 'gun_doubles_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID.quick_outs, back: 'back_flat' };
const sim: any = new PlaySim(setup); const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const b = sim.qb.behavior, qb = sim.qb;
  if (b?.v2 && b.v2h && Math.round(sim.t * 100) % 10 === 0) { const c = b.v2.cycle, look = c.looks.current, x = sim.slot(sim.offAlign.numbering.W1);
    const ang = Math.atan2(x.pos.y - qb.pos.y, x.pos.x - qb.pos.x), head = qb.head ?? qb.body.facing;
    const g = b.v2.gaze(b.v2h);
    console.log((sim.t - b.snapAt).toFixed(2), b.phase, 'look', look ? JSON.stringify(look) : null, 'res', look ? c.looks.resolved(look).toFixed(2) : '-', 'head', (head * 57.3).toFixed(0), 'toW1', (ang * 57.3).toFixed(0), 'gaze', g ? `${g.x.toFixed(1)},${g.y.toFixed(1)}` : null, 'W1 at', x.pos.x.toFixed(1), x.pos.y.toFixed(1), 'clear', (b.mind.clearHalf * 57.3).toFixed(0)); }
  if (sim.t > 2) sim.phase = 'dead'; };
sim.run();
