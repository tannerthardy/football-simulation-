import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const r2 = (x: number) => Math.round(x * 100) / 100;
const setup: any = nativeTraceSetup({ concept: 'quick_outs', coverage: 'cover3', seed: 3, roster: 3, formation: 'gun_doubles_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID.quick_outs, back: 'back_flat' };
const sim: any = new PlaySim(setup); let done = false;
const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const b = sim.qb.behavior;
  if (!done && sim.t >= 1.0 && b?.receiverForecasts) { done = true;
    for (const [r, f] of b.receiverForecasts) { if (r.behavior?.route?.id !== 'quick_out') continue;
      const c = f.build(); f.extend(c, 160); console.log(r.slot, 'motion', c.estimate.motion, 'sampledAt', r2(c.estimate.sampledAt), 'breakStep', c.breakStep, 'dt', f.dt, 'turnAt', f.turnAt(), 'breakAt', f.breakAt());
      console.log('  pts', c.pts.slice(0, 40).filter((_: any, i: number) => i % 3 === 0).map((p: any) => `${r2(p.x - sim.los)},${r2(p.y)}`).join(' '));
    } }
  if (sim.t > 1.1) sim.phase = 'dead'; };
try { sim.run(); } catch (e) { console.log(String(e)); }
