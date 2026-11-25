import { PlaySim } from '../../../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../../../../../scripts/diag/command-trace.js';
const r2 = (x: any) => typeof x === 'number' ? Math.round(x * 100) / 100 : x;
for (const seed of process.argv.slice(2).map(Number)) {
const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: 'cover3', seed, roster: 3, formation: 'gun_doubles_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
const sim: any = new PlaySim(setup); let last = -1, thrown = '';
const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const b = sim.qb.behavior, v2 = b?.v2, h = b?.v2h; if (sim.ball?.kind === 'air' && !thrown) thrown = `${r2(sim.t)}`; if (!v2 || !h || sim.t < 0.9 || sim.t > 1.8 || sim.t - last < 0.099 || thrown) return; last = sim.t;
  const parts = [];
  for (const ref of ['S1','S2']) { const r = v2.target(h, ref), f = b.receiverForecasts.get(r); if (!f) continue; const est = f.estimate, p0 = f.predict(sim.t, 0), p5 = f.predict(sim.t, .5), j = v2.judgedFor?.(ref);
    parts.push(`${ref} ${est?.motion?.slice(0,4)} err ${r2(Math.hypot(p0.x - r.pos.x, p0.y - r.pos.y))} p.5 (${r2(p5.x-sim.los)},${r2(p5.y)}) tv(${r2(r.vel.x)},${r2(r.vel.y)}) P ${r2(j?.P)} rk ${r2(j?.risk)}`); }
  console.log(seed, r2(sim.t), v2.cycle?.state, parts.join(' | ')); };
try { sim.run(); } catch {}
console.log(seed, 'thrown at', thrown);
}
