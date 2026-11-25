// HANDOFF_FREEZE staged before/after: every non-screen concept x zone calls x seeds x flip (gun doubles), one arm per
// process (flags read at import). Per coverage and underneath zone (hook*, curl_flat*): depth at the throw p25/50/75 and
// the landmark's; plays, incompletions and yards a play; per play to out/handoff-<ARM>.txt. Read-only.
//   ARM=x [HANDOFF_FREEZE=1] node --import tsx scripts/diag/coverage/handoff-stage.mts [seeds] [coverages]
const W = process.cwd();
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const seeds = Number(process.argv[2] ?? 3), COVS = (process.argv[3] ?? 'cover2,cover3,cover3_buzz,cover4,cover6,tampa2').split(',');
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && !c.screen).map(([id]) => id);
const cells: Record<string, { d: number[]; lm: number[] }> = {}; const per: string[] = []; let n = 0, inc = 0, yds = 0;
for (const coverage of COVS) for (const concept of concepts) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
  let setup: any; try { setup = nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }); } catch { continue; }
  const sim: any = new PlaySim(setup); let done = false; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (done || sim.ball?.kind !== 'air') return; done = true;
    for (const d of sim.defense) { const z = (d.behavior as any)?.zone as string | undefined; if (!z || !/^(hook|curl_flat)/.test(z)) continue;
      const k = `${coverage} ${z.replace(/_[sw]$/, '')}`; const c = cells[k] ??= { d: [], lm: [] };
      c.d.push(d.pos.x - sim.los); c.lm.push((d.behavior as any).landmark.x - sim.los); } };
  let r: any; try { r = sim.run(); } catch { continue; }
  n++; if (r.outcome === 'incomplete') inc++; yds += r.yards; per.push(`${coverage}|${concept}|${seed}|${flip}|${r.outcome}|${r.yards}`);
}
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? +s[Math.floor(p * (s.length - 1))].toFixed(1) : null; };
console.log(JSON.stringify({ arm: process.env.ARM, plays: n, incomplete: inc, ydsPerPlay: +(yds / n).toFixed(2),
  depth: Object.fromEntries(Object.entries(cells).sort().map(([k, c]) => [k, { n: c.d.length, p25: q(c.d, .25), p50: q(c.d, .5), p75: q(c.d, .75), lm: q(c.lm, .5) }])) }));
mkdirSync('out', { recursive: true }); writeFileSync(`out/handoff-${process.env.ARM}.txt`, per.join('\n'));
