import { PlaySim } from '../../../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../../../../../scripts/diag/command-trace.js';
const r2 = (x: any) => typeof x === 'number' ? Math.round(x * 100) / 100 : x;
const setup: any = nativeTraceSetup({ concept: 'stick', coverage: 'cover2', seed: 1, roster: 3, formation: 'gun_trips_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID.stick, back: 'check' };
for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
const sim: any = new PlaySim(setup); let last = -1;
const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const b = sim.qb.behavior, v2 = b?.v2, h = b?.v2h; if (!v2 || !h || sim.t < 2.2 || sim.t > 3.0 || sim.t - last < 0.049 || sim.ball?.kind !== 'held') return; last = sim.t;
  const r = v2.target(h, 'B'), f: any = b.receiverForecasts.get(r), p = f.picture, est = f.estimate, pr = f.prior;
  console.log(r2(sim.t), r.behavior?.route?.id, 'true', `(${r2(r.pos.x - sim.los)},${r2(r.pos.y)}) v(${r2(r.vel.x)},${r2(r.vel.y)})`, 'pic', p ? `@${r2(p.sampledAt)} (${r2(p.pos.x - sim.los)},${r2(p.pos.y)}) v(${r2(p.vel.x)},${r2(p.vel.y)})` : '-', 'est', est?.motion?.slice(0, 4), '@', r2(est?.sampledAt), 'prog', est?.progress, 'offSince', r2(f.offSince), 'legs', [pr.start, ...pr.path.map((q: any) => q.p)].slice(0, 5).map((q: any) => `(${r2(q.x - sim.los)},${r2(q.y)})`).join(''), 'delay', pr.startDelay); };
try { sim.run(); } catch {}
