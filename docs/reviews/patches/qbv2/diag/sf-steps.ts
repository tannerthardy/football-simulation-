import { PlaySim } from '../wt949/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt949/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt949/scripts/diag/command-trace.js';
const r2 = (x: number) => Math.round(x * 100) / 100;
for (const seed of [1, 4, 5, 6]) {
  const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: 'cover3', seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); const ev: string[] = []; let cue0: any = null, idx = -1, s2due: number | null = null, thrown = '';
  const tb = sim.throwBall.bind(sim); sim.throwBall = (q: any, t: any, ...r: any[]) => { if (!thrown) thrown = `${r2(sim.t)} ${t?.slot}`; return tb(q, t, ...r); };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const v2 = sim.qb.behavior?.v2, h = sim.qb.behavior?.v2h; if (!v2 || !h || thrown) return;
    const c = JSON.stringify(Object.fromEntries(v2.cue ?? [])); if (c !== cue0) { ev.push(`${r2(sim.t)} cue ${c}`); cue0 = c; }
    if (v2.cycle.readIdx !== idx) { idx = v2.cycle.readIdx; ev.push(`${r2(sim.t)} read ${idx} (step ${v2.plan.reads[idx]?.step})`); }
    if (s2due === null && v2.reachedBreak.has('S2')) { s2due = v2.reachedBreak.get('S2'); ev.push(`${r2(s2due)} S2 reached its landmark`); }
    if (sim.t > 3.2) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  const h = sim.qb.behavior?.v2h;
  console.log(`seed ${seed} plantAt ${h ? r2(h.plantAt) : '-'} readFrom ${h?.readFrom !== undefined ? r2(h.readFrom) : '-'} stride ${h ? r2(h.stride) : '-'} thrown ${thrown} :: ${ev.join(' | ')}`);
}
