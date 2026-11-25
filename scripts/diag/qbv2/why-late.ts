import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const setup: any = nativeTraceSetup({ concept: 'quick_outs', coverage: 'cover3', seed: 1, roster: 3, formation: 'gun_doubles_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID.quick_outs, back: 'back_flat' };
for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline']) setup.offense.QB.ratings[k] = 60;
setup.offense.QB.experience = 4;
const sim: any = new PlaySim(setup); const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const b = sim.qb.behavior, h = b?.v2h;
  if (b?.v2 && h && sim.t >= h.plantAt - 0.05 && sim.t <= h.plantAt + 0.6 && Math.round(sim.t * 100) % 5 === 0) {
    const x = sim.slot(sim.offAlign.numbering.W1), fc = b.receiverForecasts.get(x);
    const ev = b.evaluate(sim.qb, sim, x, 0), j = b.v2.judgedFor('W1');
    const rl = b.v2.lastRoles.get('W1'); if (rl) console.log('   roles', rl.map((r: any) => `${sim.agents[r.id].slot}:${r.role}:m${r.margin.toFixed(2)}:pA${r.pArrive.toFixed(2)}:pk${r.pPick.toFixed(2)}`).join(' '));
    console.log((sim.t - b.snapAt).toFixed(2), b.v2.cycle.state, 'pose', sim.see(sim.qb, x).pose, 'fc', !!fc, 'cur', !!fc?.predict(sim.t, 0), 'ev', ev ? `P${ev.P.toFixed(2)} T${ev.T.toFixed(2)}` : null, 'judged', j ? `${j.P.toFixed(2)}/${j.risk.toFixed(2)}` : null, 'res', b.v2.cycle.looks.current ? b.v2.cycle.looks.resolved(b.v2.cycle.looks.current).toFixed(2) : null, 'need', h.need.toFixed(2), 'readIdx', b.v2.cycle.readIdx); }
  if (sim.t > 3) sim.phase = 'dead'; };
sim.run();
