// Sim side of half_key.py: staged dropbacks against the half-field coverages; one row per unruled half safety
// (deep_half_s / deep_half_w zone behaviours) with his side's #1 and #2 (numbering at alignment, outside-in) tracked
// every tick until the throw, in the operator's format (field x, y; los; dir; throw).
//   node --import tsx scripts/diag/coverage/half-key.mts [seeds] [out.jsonl]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const outPath = process.argv[3] ?? 'out/diag/coverage/half-sim.jsonl';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const COVS = (process.env.COVS ?? 'cover2,cover2_match,tampa2').split(',');
const concepts = process.env.CONCEPTS?.split(',') ?? Object.entries(PASS_BY_ID)
  .filter(([id, c]: any) => !/screen/.test(id) && c.family !== 'playaction' && c.drop !== 'pa').map(([id]) => id);
const lines: string[] = [];
for (const concept of concepts) for (const coverage of COVS) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const rows: any[] = [];
    let started = false;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (!started) {
        started = true;
        for (const d of sim.defense) {
          const z = d.behavior?.zone;
          if ((z !== 'deep_half_s' && z !== 'deep_half_w') || d.behavior?.rule) continue;
          const side = Math.sign(d.pos.y - sim.ballY) || 1;
          const recv = sim.offense.filter((r: any) => !['QB', 'LT', 'LG', 'C', 'RG', 'RT'].includes(r.slot) && (r.pos.y - sim.ballY) * side > 0
            && (sim.los - r.pos.x < 2.5 || Math.abs(r.pos.y - sim.ballY) > 4))
            .sort((p: any, q: any) => Math.abs(q.pos.y - sim.ballY) - Math.abs(p.pos.y - sim.ballY));
          if (recv.length < 2) continue;
          rows.push({ d, r1: recv[0], r2: recv[1], row: { cov: `sim ${coverage}`, concept, key: `${concept}|${coverage}|${formation}|${seed}|${flip ? 'F' : 'N'}`,
            los: sim.los, dir: 1, throw: null, t: [], s: [], r1: [], r2: [] } });
        }
      }
      if (sim.throwAt >= 0) { for (const x of rows) if (x.row.throw == null) x.row.throw = +sim.throwAt.toFixed(2); return; }
      for (const x of rows) {
        x.row.t.push(+sim.t.toFixed(2));
        x.row.s.push([+x.d.pos.x.toFixed(2), +x.d.pos.y.toFixed(2)]);
        x.row.r1.push([+x.r1.pos.x.toFixed(2), +x.r1.pos.y.toFixed(2)]);
        x.row.r2.push([+x.r2.pos.x.toFixed(2), +x.r2.pos.y.toFixed(2)]);
      }
    };
    sim.run();
    for (const x of rows) if (x.row.t.length > 10) lines.push(JSON.stringify(x.row));
  }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n') + '\n');
console.log(lines.length, 'half-safety rows');
