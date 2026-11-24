// After the V2 decision on slant_flat: the key's cue at the decision, and D on the slant and the flat every 0.05 s for 0.5 s.
import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const r2 = (x: number) => Math.round(x * 100) / 100;
const cov = process.argv[2] ?? 'cover3', concept = process.argv[3] ?? 'slant_flat', form = process.argv[4] ?? 'gun_doubles_11', refs = (process.argv[5] ?? 'S1,S2').split(',');
for (let seed = 1; seed <= 10; seed++) {
  const setup: any = nativeTraceSetup({ concept, coverage: cov, seed, roster: 3, formation: form, flip: false });
  if (concept === 'slant_flat') setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
  const qbP = setup.offense.QB; for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) qbP.ratings[k] = 60; qbP.experience = 4;
  const sim: any = new PlaySim(setup); let at = -1; const out: string[] = []; let cue: any = null;
  sim.throwBall = () => {}; // measure only: the ball never leaves, the picture runs on
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0(); const b = sim.qb.behavior, v2 = b?.v2, h = b?.v2h;
    if (!v2 || !h) return;
    if (at < 0 && v2.cycle.state === 'throw') { at = sim.t; cue = v2.cue ? Object.fromEntries(v2.cue) : null; }
    if (at >= 0 && sim.t <= at + 0.5 && Math.round((sim.t - at) * 20) % 2 === 0) {
      const js = refs.map((ref) => { const j = (v2 as any).judgeOption(h, { ref, timing: 'onBreak' }); return `${ref} ${j ? r2(j.P) + '/' + r2(j.risk) : '-'}`; });
      out.push(`+${r2(sim.t - at)} ${js.join(' ')} cue ${JSON.stringify(Object.fromEntries(v2.cue ?? []))}`);
    }
    if (sim.t > at + 0.55 && at >= 0) sim.phase = 'dead';
    if (sim.t > 4) sim.phase = 'dead';
  };
  try { sim.run(); } catch (e) { out.push('err ' + String((e as Error).message).slice(0, 80)); }
  const key = v2key(sim); console.log(seed, key, 'decided', r2(at), 'cue at decision', JSON.stringify(cue), '\n   ' + out.join('\n   '));
}
function v2key(sim: any): string {
  const b = sim.qb.behavior, v2 = b?.v2, h = b?.v2h; if (!v2 || !h) return '';
  const m = v2.roles.resolve(v2.picture(h), 'flat', 'S'); if (!m) return 'flat:none';
  const d = sim.agents[m.id]; return `flat=${d?.slot} @(${Math.round((m.x - sim.los) * 10) / 10},${Math.round(m.y * 10) / 10}) v(${Math.round(m.vx * 10) / 10},${Math.round(m.vy * 10) / 10})`;
}
