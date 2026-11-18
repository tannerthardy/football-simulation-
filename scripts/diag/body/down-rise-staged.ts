/** Staged zone plays, paired across DOWN_RISE_PLANT arms (identical until a defender dives): per play the result, YAC, missed tackles, touchdown, and the number of defender dives.
 *   [DOWN_RISE_PLANT=1] node --import tsx scripts/diag/body/down-rise-staged.ts OUT.jsonl [--rosters 1-3] [--seeds 1,2] [--shard 0/4] */
import { writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const range = (s: string) => s.includes('-') ? Array.from({ length: Number(s.split('-')[1]) - Number(s.split('-')[0]) + 1 }, (_, i) => Number(s.split('-')[0]) + i) : s.split(',').map(Number);
const out = process.argv[2], rosters = range(arg('--rosters', '1-3')), seeds = range(arg('--seeds', '1,2')); const [si, sn] = arg('--shard', '0/1').split('/').map(Number);
const concepts = ['curl_flat', 'slant_flat', 'stick', 'mesh', 'drive', 'y_cross', 'smash', 'flood', 'quick_outs', 'hitch_cross', 'dagger', 'four_verts'];
const covs = ['cover2', 'cover3', 'cover4', 'cover6', 'cover2_match'], forms = ['gun_doubles_11', 'gun_trips_11'];
const lines: string[] = []; let n = 0;
for (const formation of forms) for (const concept of concepts) for (const coverage of covs) for (const roster of rosters) for (const seed of seeds) {
  if (n++ % sn !== si) continue;
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
  let dives = 0; const seen = new Set<number>(); const tick0 = sim.tick.bind(sim);
  sim.tick = () => { tick0(); for (const a of sim.agents) { const s = a.body.support; if (a.team === 'D' && s?.state === 'falling' && s.cause === 'dive' && !seen.has(a.idx)) { seen.add(a.idx); dives++; } } };
  let res: any; try { res = sim.run(); } catch { continue; }
  const st = res.stats ?? sim.stats ?? {};
  lines.push(JSON.stringify({ k: `${formation}|${concept}|${coverage}|${roster}|${seed}`, completed: !!st.completed, yac: st.yac ?? null, yards: Math.round((res.yards ?? 0) * 100) / 100, missed: st.missedTackles ?? 0, td: res.outcome === 'touchdown', outcome: res.outcome, dives }));
}
writeFileSync(out, lines.join('\n') + '\n'); console.log(lines.length, 'plays ->', out);
