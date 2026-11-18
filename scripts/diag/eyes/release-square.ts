// node --import tsx scripts/diag/eyes/release-square.ts > rows.jsonl   (QB lane, 2026-11-18: QB_STANCE's cross-body cost)
// At each staged release: the angle his trunk is still short of the line to the aimed point (signed, + = chest left of
// the line), the throw's side (lateral from him, + = to his left), whether the turn was charged (QB_ALIGN's sigma and
// speed factors, when on), and the result. Passive.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id))) for (const seed of [1, 2]) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip })); } catch { continue; }
  const dir = sim.attackDir(sim.offense[0].team); let row: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, ...rest: any[]) => { if (p === sim.qb && !row && intended && !rest[1]) {
    const b = Math.atan2(intended.y - p.pos.y, intended.x - p.pos.x), resid = wrap(p.body.facing - b);
    row = { resid: +(resid * 180 / Math.PI).toFixed(1), lat: +(((intended.y - p.pos.y) * dir)).toFixed(1), align: (p.behavior as any)?.alignRec ?? null }; }
    return tb(p, target, v0, intended, ...rest); };
  let res: any; try { res = sim.run(); } catch { continue; }
  if (row) console.log(JSON.stringify({ concept, coverage, seed, flip, ...row, cmp: !!res.stats.completed }));
}
