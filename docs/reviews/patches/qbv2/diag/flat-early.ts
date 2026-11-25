import { PlaySim } from '../wt949/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt949/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt949/scripts/diag/command-trace.js';
const r1 = (x: number) => Math.round(x * 10) / 10;
for (const seed of [4, 5]) {
  const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: 'cover3', seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); let last = -1; const out: string[] = [];
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const v2 = sim.qb.behavior?.v2, h = sim.qb.behavior?.v2h; if (!v2 || !h || sim.t - last < 0.249 || sim.t > 2.9) return; last = sim.t;
    const r = v2.target(h, 'S2'); if (!r) return; const bp = h.breakPoint(r), st = h.routeStart(r), e = h.estimate(r), f = sim.qb.behavior.receiverForecasts.get(r);
    out.push(`${r1(sim.t)} route ${r.behavior?.route?.id} st(${r1(st.x)},${r1(st.y)}) bp ${bp ? `(${r1(bp.x)},${r1(bp.y)})` : null} seen(${r1(e.pos.x)},${r1(e.pos.y)}) true(${r1(r.pos.x)},${r1(r.pos.y)}) reached ${v2.reachedBreak.has('S2')} prior.routeId ${f?.prior?.routeId}`); };
  try { sim.run(); } catch {}
  console.log('seed', seed, '\n ', out.join('\n  '));
}
