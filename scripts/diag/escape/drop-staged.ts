// [CONCEPT_DROPS=1] node --import tsx drop-staged.ts > rows.jsonl
// The same plays off and on: each concept the flag touches, against eight coverages, four rosters and six seeds, from
// gun doubles (or trips when the concept needs it). Same bodies, call and seed in both arms; only the drop differs.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
const CONCEPTS = 'smash mesh flood drive sail_corner corner_flat trips_sail trips_outs double_outs comebacks dagger y_cross four_verts verts_hitch stick curl_flat'.split(' ');
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
for (const concept of CONCEPTS) for (const coverage of COVS) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) {
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
    let thr: any = null; const tb = sim.throwBall.bind(sim), dir = sim.attackDir(sim.offense[0].team);
    // Each defender at the snap: slot, position, and how wide of the ball he lined up (who made a sack, by where he came from).
    const snap = new Map<number, any>(sim.defense.map((d: any) => [d.idx, { slot: d.slot, pos: d.player.position, wide: +Math.abs(d.pos.y - sim.ballY).toFixed(1) }]));
    sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
      if (p === sim.qb && !thr) thr = { t: +sim.t.toFixed(2), away, route: target?.behavior?.route?.id ?? null, depth: target ? +((target.pos.x - sim.los) * dir).toFixed(1) : null, aim: intended ? +((intended.x - sim.los) * dir).toFixed(1) : null,
        qb: +((p.pos.x - sim.los) * dir).toFixed(1), readIdx: p.behavior?.readIdx ?? null, P: p.behavior?.throwRec?.P ?? null,
        sep: target ? +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - target.pos.x, d.pos.y - target.pos.y))).toFixed(1) : null };
      return tb(p, target, v0, intended, arrivalT, away, ...rest);
    };
    let res: any; try { res = sim.run(); } catch (e: any) { console.error(String(e?.stack).slice(0, 400)); break; }
    const sk = sim.events.find((e: any) => e.type === 'sack'); const qbEnd = +((sim.qb.pos.x - sim.los) * dir).toFixed(1);
    console.log(JSON.stringify({ concept, drop: PASS_BY_ID[concept].drop, coverage, roster, seed, formation, thr, sack: sk ? { t: +sk.t.toFixed(2), by: snap.get(sk.a)?.slot ?? null, pos: snap.get(sk.a)?.pos ?? null, wide: snap.get(sk.a)?.wide ?? null, qb: qbEnd } : null, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, sacked: !!res.stats.sacked, yards: res.yards ?? null }));
    break;
  }
}
