import { PlaySim } from '../wt949/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt949/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt949/scripts/diag/command-trace.js';
const r2 = (x: any) => x === null || x === undefined ? x : Math.round(x * 100) / 100;
const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: 'cover3', seed: 4, roster: 3, formation: 'gun_doubles_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
const sim: any = new PlaySim(setup); let last = -1; const out: string[] = [];
const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const v2 = sim.qb.behavior?.v2, h = sim.qb.behavior?.v2h; if (!v2 || !h || sim.t - last < 0.199 || sim.t > 2.4) return; last = sim.t;
  const o = { ref: 'S2', timing: 'onBreak' }, r = v2.target(h, 'S2');
  const p0 = r ? h.predict(r, 0) : null, p1 = r ? h.predict(r, 1) : null;
  out.push(`${r2(sim.t)} lead ${r2(h.lead)} dueAt ${r2(v2.dueAt(h, o))} early ${v2.lastJudged.get('S2')?.early} pred0 ${p0 ? `(${r2(p0.x)},${r2(p0.y)})` : null} pred1 ${p1 ? `(${r2(p1.x)},${r2(p1.y)})` : null} bp ${JSON.stringify(h.breakPoint(r))}`); };
try { sim.run(); } catch {}
console.log(out.join('\n'));
