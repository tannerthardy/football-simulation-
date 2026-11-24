// SPOT_LEAN staged pairs: every non-screen pass concept x spot-style zone calls x seeds x flip, off vs on (each arm in its
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
const COVS = ['cover3', 'cover2', 'cover4', 'cover3_buzz', 'cover6'];
let n = 0, inc = 0, yds = 0; const per: string[] = [];
for (const concept of concepts) for (const coverage of COVS) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
  let setup: any; try { setup = nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }); } catch { continue; }
  setup.defCall = { ...setup.defCall, zoneStyle: 'spot' };
  let r: any; try { r = new PlaySim(setup).run(); } catch { continue; }
  n++; if (r.outcome === 'incomplete') inc++; yds += r.yards;
  per.push(`${concept}|${coverage}|${seed}|${flip}|${r.outcome}|${r.yards}`);
}
console.log(JSON.stringify({ SPOT_LEAN: process.env.SPOT_LEAN ?? '0', plays: n, incomplete: inc, ydsPerPlay: +(yds / n).toFixed(2) }));
const { writeFileSync, mkdirSync } = await import('node:fs');
mkdirSync('out', { recursive: true }); writeFileSync(`out/spot-lean-${process.env.SPOT_LEAN ?? '0'}.txt`, per.join('\n'));
