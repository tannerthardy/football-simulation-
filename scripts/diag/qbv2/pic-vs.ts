import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const setup: any = nativeTraceSetup({ concept: 'quick_outs', coverage: 'cover3', seed: 1, roster: 3, formation: 'gun_doubles_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID.quick_outs, back: 'back_flat' };
for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline']) setup.offense.QB.ratings[k] = 60;
setup.offense.QB.experience = 4;
const sim: any = new PlaySim(setup); const t0 = sim.tick.bind(sim); const done = new Set<number>();
sim.tick = () => { t0(); const b = sim.qb.behavior, h = b?.v2h; if (!b?.v2 || !h) return; const k = Math.round((sim.t - b.snapAt) * 10);
  if ((k === 9 || k === 11) && !done.has(k)) { done.add(k);
    const x = sim.slot(sim.offAlign.numbering.W1), nb = sim.defense.find((d: any) => d.slot === 'NB'), ev = b.evaluate(sim.qb, sim, x, 0);
    const fc = b.receiverForecasts.get(x).predict(sim.t, 0), e = b.mind.estimate(nb);
    console.log((sim.t - b.snapAt).toFixed(1), 'X true', x.pos.x.toFixed(1), x.pos.y.toFixed(1), 'fc', fc.x.toFixed(1), fc.y.toFixed(1), '| point', ev?.point.x.toFixed(1), ev?.point.y.toFixed(1), 'T', ev?.T.toFixed(2), '| NB true', nb.pos.x.toFixed(1), nb.pos.y.toFixed(1), 'v', nb.vel.x.toFixed(1), nb.vel.y.toFixed(1), 'pic', e.pos.x.toFixed(1), e.pos.y.toFixed(1), 'v', e.vel.x.toFixed(1), e.vel.y.toFixed(1), 'age', b.mind.pictureAge(nb).toFixed(2), '| QB', sim.qb.pos.x.toFixed(1), sim.qb.pos.y.toFixed(1)); }
  if (sim.t > 2) sim.phase = 'dead'; };
sim.run();
