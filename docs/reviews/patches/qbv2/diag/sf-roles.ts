import { PlaySim } from '../wt949/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt949/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt949/scripts/diag/command-trace.js';
const r2 = (x: number) => Math.round(x * 100) / 100;
for (const seed of [1, 4, 5, 6]) {
  const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: 'cover3', seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); let last = -1, thrown = ''; const out: string[] = [];
  const tb = sim.throwBall.bind(sim); sim.throwBall = (q: any, t: any, ...r: any[]) => { if (!thrown) thrown = `${r2(sim.t)} ${t?.slot}`; return tb(q, t, ...r); };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const v2 = sim.qb.behavior?.v2; if (!v2 || thrown) return; if (sim.t < 1.2 || sim.t - last < 0.149) return; last = sim.t;
    const j = (ref: string) => { const x = v2.lastJudged.get(ref); return x ? `${r2(x.P)}/${r2(x.risk)}${x.early ? 'e' : ''}` : '-'; };
    const roles = (v2.lastRoles.get('S1') ?? []).filter((r: any) => r.pArrive > 0.05).map((r: any) => `${sim.agents[r.id].slot}:${r.role}:m${r2(r.margin)}:p${r2(r.pArrive)}`).join(' ');
    out.push(`${r2(sim.t)} r${v2.cycle.readIdx} cue ${JSON.stringify(Object.fromEntries(v2.cue ?? []))} S1 ${j('S1')} S2 ${j('S2')} B ${j('B')} | S1 roles ${roles}`);
    if (sim.t > 3.2) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  console.log(`seed ${seed} thrown ${thrown}\n  ` + out.join('\n  '));
}
