// QB lane 2026-11-18: his coverage belief against the truth, at his set and 0.5 s after, over every coverage
// (staged, doubles, concept curl_flat, rosters 3 / 11, seeds 1-2). Per play: the top belief, its mass, his pMan and
// pSingleHigh, and the truth's man / shell.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { COVERAGE_BY_ID } from '../../../src/playbook/coverages.js';
for (const coverage of Object.keys(COVERAGE_BY_ID)) for (const roster of [3, 11]) for (const seed of [1, 2]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept: process.env.CI_CONCEPT ?? 'curl_flat', seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
  const cov: any = (COVERAGE_BY_ID as any)[coverage]; const out: any = { coverage, man: cov.man, shell: cov.shell, roster, seed };
  for (let i = 0; i < 80 && sim.phase === 'live' && sim.carrier === sim.qb; i++) { sim.tick(); const b: any = sim.qb.behavior;
    if (b?.kind !== 'qb-pass' || !b.mind?.belief) continue;
    const tag = b.setAt >= 0 && !out.set ? 'set' : b.setAt >= 0 && out.set && !out.set5 && sim.t >= b.setAt + 0.5 ? 'set5' : null;
    if (tag) { const top = Object.entries(b.mind.belief as Record<string, number>).sort((u, v) => v[1] - u[1])[0]; out[tag] = { t: +sim.t.toFixed(2), top: top[0], p: +top[1].toFixed(3), pMan: +b.mind.pMan().toFixed(3), p1: +b.mind.pSingleHigh().toFixed(3) }; } }
  console.log(JSON.stringify(out));
}
