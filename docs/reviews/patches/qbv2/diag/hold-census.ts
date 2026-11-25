import { PlaySim } from '../wt949/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt949/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt949/scripts/diag/command-trace.js';
const [con, cov, form] = process.argv.slice(2);
const TAUGHT: any = { slant_flat: { back: 'check' }, quick_outs: { back: 'back_flat' } };
let held = 0, plays = 0; const res: string[] = [];
for (let seed = 1; seed <= 30; seed++) {
  const setup: any = nativeTraceSetup({ concept: con, coverage: cov, seed, roster: 3, formation: form, flip: false });
  if (TAUGHT[con]) setup.offCall.pass = { ...PASS_BY_ID[con], ...TAUGHT[con] };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); let thrown = '', cy: any = null;
  const tb = sim.throwBall.bind(sim); sim.throwBall = (q: any, t: any, ...r: any[]) => { if (!thrown) thrown = `${Math.round(sim.t * 100) / 100}:${t?.slot ?? 'away'}`; return tb(q, t, ...r); };
  const t0 = sim.tick.bind(sim); sim.tick = () => { t0(); cy = sim.qb.behavior?.v2?.cycle ?? cy; if (sim.t > 4) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  plays++; if (cy?.keyHeld) { held++; res.push(`s${seed} held ${cy.keyHeld} -> ${thrown} ${sim.stats.completed ? 'cmp' : 'inc'}`); }
}
console.log(con, cov, 'plays', plays, 'with a key hold', held, res.join(' | '));
