/** Per play (keys from a file, one `formation|concept|coverage|roster|seed` per line): every body's position each 0.1 s to 4 s, so two arms (YAW_CAP 0/1) can be compared for the first body to diverge.
 *   [YAW_CAP=1] node --import tsx scripts/diag/body/yaw-diverge.ts KEYS.txt OUT.json */
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const keys = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean); const out: Record<string, any> = {};
for (const k of keys) {
  const [formation, concept, coverage, roster, seed] = k.split('|'); let sim: any;
  try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed: Number(seed), roster: Number(roster), formation, flip: false })); } catch { continue; }
  const rows: any[] = []; const tick0 = sim.tick.bind(sim); let last = -1;
  sim.tick = () => { tick0(); const q = Math.round(sim.t * 10); if (q > last && q <= 40) { last = q; rows.push([q / 10, sim.agents.map((a: any) => [a.slot, a.team, Math.round(a.pos.x * 1000) / 1000, Math.round(a.pos.y * 1000) / 1000])]); } };
  try { const r = sim.run(); out[k] = { rows, sacked: !!(r.stats ?? sim.stats)?.sacked, t: sim.t }; } catch { continue; }
}
writeFileSync(process.argv[3], JSON.stringify(out)); console.log(Object.keys(out).length, 'plays');
