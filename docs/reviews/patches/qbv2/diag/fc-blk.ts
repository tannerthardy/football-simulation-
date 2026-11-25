import { PlaySim } from '../../../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../../../../../scripts/diag/command-trace.js';
const r2 = (x: any) => typeof x === 'number' ? Math.round(x * 100) / 100 : x;
const [concept, coverage, seed, slot] = [process.argv[2], process.argv[3], Number(process.argv[4]), process.argv[5]];
const setup: any = nativeTraceSetup({ concept, coverage, seed, roster: 3, formation: 'gun_doubles_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID[concept], back: 'check' };
for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
const sim: any = new PlaySim(setup); let last = -1; const pend: any[] = [];
const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const b = sim.qb.behavior; if (!b?.v2 || sim.ball?.kind !== 'held') return;
  for (const q of pend) if (!q.done && sim.t >= q.at - 1e-6) { q.done = true; console.log(q.s, `true+.5 (${r2(q.r.pos.x - sim.los)},${r2(q.r.pos.y)}) err ${r2(Math.hypot(q.p.x - q.r.pos.x, q.p.y - q.r.pos.y))}`); }
  if (sim.t < 0.5 || sim.t > 3.0 || sim.t - last < 0.099) return; last = sim.t;
  for (const [r, f] of b.receiverForecasts as Map<any, any>) { if (r.slot !== slot) continue; const lp = f.lastPicture(), p = f.predict(sim.t, .5), pr = f.prior;
    const s = `${r2(sim.t)} ${r.behavior?.route?.id} ph ${r.behavior?.phase ?? '-'} eng ${!!r.engagement} true (${r2(r.pos.x - sim.los)},${r2(r.pos.y)}) v(${r2(r.vel.x)},${r2(r.vel.y)}) pic age ${r2(sim.t - lp?.sampledAt)} pa ${r2(lp?.sampledAt)} ${f.estimate?.motion?.slice(0, 4)} p.5 (${r2(p.x - sim.los)},${r2(p.y)}) legs ${[pr.start, ...pr.path.map((q: any) => q.p)].slice(0, 4).map((q: any) => `(${r2(q.x - sim.los)},${r2(q.y)})`).join('')}`;
    pend.push({ s, at: sim.t + .5, r, p }); } };
try { sim.run(); } catch {}
