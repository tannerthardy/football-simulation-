import { PlaySim } from '../wt950/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt950/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt950/scripts/diag/command-trace.js';
const r2 = (x: any) => typeof x === 'number' ? Math.round(x * 100) / 100 : x;
for (const seed of [25, 23]) {
const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: 'cover3', seed, roster: 3, formation: 'gun_doubles_11', flip: false });
setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
const sim: any = new PlaySim(setup); let last = -1; const out: string[] = [];
const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const v2 = sim.qb.behavior?.v2, h = sim.qb.behavior?.v2h; if (!v2 || !h || v2.cycle.readIdx !== 1 || sim.t - last < 0.099) return; last = sim.t;
  const t = v2.cycle.looks.current; const role = v2.roles.resolve(v2.picture(h), 'flat', 'W'); const j = v2.lastJudged.get('W2');
  out.push(`${r2(sim.t)} look ${JSON.stringify(t)} res ${r2(t ? v2.cycle.looks.resolved(t) : 0)} need ${r2(h.need)} Wflat ${role ? sim.agents[role.id].slot : 'none'} cue ${v2.cue.get('W:flat') ?? '-'} W2 ${j ? r2(j.P) + '/' + r2(j.risk) + (j.early ? 'e' : '') : '-'} state ${v2.cycle.state}`); };
try { sim.run(); } catch {}
console.log('seed', seed, '\n ', out.join('\n  '));
}
