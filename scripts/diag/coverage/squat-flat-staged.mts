// SQUAT_FLAT_FIRST staged pairs (was SPOT_LEAN's): every non-screen pass concept x spot-style zone calls x seeds x flip, off vs on (each arm in its
// own process: SPOT_LEAN is read at import). Per arm: plays, incompletions and yards a play; per play to
// out/spot-lean-<arm>.txt for the paired comparison. Read-only.
//   SPOT_LEAN=0|1 node --import tsx scripts/diag/coverage/spot-lean-staged.mts [seeds]
const W = process.cwd();
import { readFileSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const seeds = Number(process.argv[2] ?? 3);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && !c.screen).map(([id]) => id);
const COVS = (process.argv[3] ?? 'cover2,cover2_invert,tampa2,cover6,cover6_rev').split(',');
let n = 0, inc = 0, yds = 0; const per: string[] = [];
for (const concept of concepts) for (const coverage of COVS) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
  let setup: any; try { setup = nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }); } catch { continue; }
  let r: any; try { r = new PlaySim(setup).run(); } catch { continue; }
  n++; if (r.outcome === 'incomplete') inc++; yds += r.yards;
  const tgt = r.passTarget ?? r.target ?? '';
  per.push(`${concept}|${coverage}|${seed}|${flip}|${r.outcome}|${r.yards}|${tgt}`);
}
console.log(JSON.stringify({ arm: process.env.ARM ?? '?', plays: n, incomplete: inc, ydsPerPlay: +(yds / n).toFixed(2) }));
const { writeFileSync, mkdirSync } = await import('node:fs');
mkdirSync('out', { recursive: true }); writeFileSync(`out/squat-flat-${process.env.ARM ?? 'x'}.txt`, per.join('\n'));
