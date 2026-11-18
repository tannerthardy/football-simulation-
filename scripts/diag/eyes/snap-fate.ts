// QB lane 2026-11-18 (Integration's question on READ_WINDOW): where the quick-concept snaps go. Staged plays, zone
// shells; per play the fate (throw by air band and whether it is the plan's checkdown / the last read, throwaway, sack,
// QB run), completion and yards. Run once per arm (READ_WINDOW=0 / default) and pair by key.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const C = (process.env.SF_CONCEPTS ?? 'slant_flat,four_verts,comebacks').split(',');
for (const concept of C) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover2', 'cover2_match', 'cover3', 'cover3_match', 'cover4', 'cover6', 'tampa2'])
  for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3]) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team);
    let thr: any = null;
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
      if (p === sim.qb && !thr) { const b: any = p.behavior;
        thr = away || !target ? { away: true, t: +sim.t.toFixed(2) } : { t: +sim.t.toFixed(2), air: +((intended.x - sim.los) * dir).toFixed(1), slot: target.slot,
          route: target.behavior?.route?.id ?? null, readIdx: b?.reads?.indexOf(target) ?? -1, nReads: b?.reads?.length ?? 0, outlet: target === b?.planOutlet }; }
      return tb(p, target, v0, intended, arrivalT, away, ...rest); };
    let res: any; try { res = sim.run(); } catch { continue; }
    const ev = sim.events as any[];
    const sack = ev.some((e) => e.type === 'sack'), ta = ev.some((e) => e.type === 'throwaway') || thr?.away;
    const fate = sack ? 'sack' : ta ? 'throwaway' : thr ? (thr.air >= 10 ? 'throw10+' : 'throw<10') : 'qbrun';
    console.log(JSON.stringify({ key: [concept, formation, coverage, roster, seed, flip].join('|'), concept, fate, thr, cmp: !!sim.stats.completed,
      int: ev.some((e) => e.type === 'interception'), yards: +(res.yards ?? 0).toFixed(1) }));
  }
