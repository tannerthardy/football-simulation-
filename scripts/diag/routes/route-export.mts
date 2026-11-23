// Sim side of route_timing.py: staged dropback concepts (no play action), every receiver whose route belongs to a
// stem-and-break family, written in the operator's format (t s after the snap; d yd past the LOS; w yd lateral toward
// the sideline he releases to; throw s). Same operator on both sides.
//   node --import tsx scripts/diag/routes/route-export.mts [seeds] [out.jsonl]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const outPath = process.argv[3] ?? 'out/diag/routes/sim.jsonl';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const FAMILY: Record<string, string> = { slant: 'slant', corner: 'corner', post: 'post', dig: 'dig', out: 'out', comeback: 'comeback', curl: 'curl',
  deep_out: 'sail', cross: 'over', hitch: 'hitch' };
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && c.family !== 'playaction' && c.drop !== 'pa').map(([id]) => id);
const lines: string[] = [];
for (const concept of concepts) for (const coverage of ['cover3', 'cover4', 'cover2', 'cover1']) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team);
    const recs = new Map<any, any>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.t < 0) return;
      for (const r of sim.offense) {
        const id = r.behavior?.route?.id; const fam = id && FAMILY[id];
        if (!fam) continue;
        let rec = recs.get(r);
        if (!rec) { rec = { route: id, family: fam, y0: r.pos.y, side: Math.sign(r.pos.y - sim.ballY) || 1, t: [], d: [], w: [] }; recs.set(r, rec); }
        rec.t.push(+sim.t.toFixed(3)); rec.d.push((r.pos.x - sim.los) * dir); rec.w.push((r.pos.y - rec.y0) * rec.side);
      }
    };
    sim.run();
    const thr = sim.throwAt >= 0 ? sim.throwAt : null;
    for (const rec of recs.values()) lines.push(JSON.stringify({ route: rec.route, family: rec.family, t: rec.t, d: rec.d, w: rec.w, throw: thr }));
  }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n') + '\n');
console.log(outPath, lines.length);
