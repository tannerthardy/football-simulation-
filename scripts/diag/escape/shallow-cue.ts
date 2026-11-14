import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover4', concept: 'drive', seed: 3, roster: 3, formation: 'gun_doubles_11', flip: false }));
const M = sim.defense.find((d: any) => d.slot === 'LB_W'); let thrT = -1; const t0 = sim.tick.bind(sim);
sim.tick = () => { t0();
  if (sim.ball.kind === 'air' && thrT < 0) thrT = sim.t;
  if (thrT >= 0 && sim.ball.kind === 'air' && Math.round((sim.t - thrT) / 0.05) % 4 === 0) {
    const seen = sim.see(M, sim.qb), b = sim.ball.flight.pos;
    const head = sim.perception.perceive(M.idx, 0).head;
    const brg = Math.atan2(b.y - M.pos.y, b.x - M.pos.x), offF = Math.abs(((brg - M.facing) * 180 / Math.PI + 540) % 360 - 180);
    const offH = head == null ? null : Math.abs(((brg - head) * 180 / Math.PI + 540) % 360 - 180);
    console.log(`+${(sim.t - thrT).toFixed(2)} QB seen age ${seen.age?.toFixed(2)} | ball dist ${Math.hypot(b.x - M.pos.x, b.y - M.pos.y).toFixed(1)} z ${b.z.toFixed(1)} | ball off facing ${offF.toFixed(0)} off recorded head ${offH == null ? 'none' : offH.toFixed(0)}`);
  } };
sim.run();
