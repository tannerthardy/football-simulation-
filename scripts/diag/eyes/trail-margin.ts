// node --import tsx scripts/diag/eyes/trail-margin.ts > rows.jsonl
// Integration (2026-11-16), the window's `blind` / reaction terms: is a man trailing the receiver (on him, not facing the
// QB) priced as late to the ball? At each staged throw: his own evaluation of the throw he made (P, pOpen) and the
// window's margin terms for each defender it counted (marginProbe), the nearest defender in his picture to the
// target (distance, whether he faces the QB), and the result. Calibration by class: predicted (1 - pOpen) against the
// real rate of a defended ball (incomplete or picked, ball reached). Also each factor of his P (pOpen, pClear, pAcc,
// hands) against the ball's real fate (caught, defended, dropped, missed, picked), for the open-receiver question. Passive except his own evaluate at the throw.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const CONCEPTS = 'smash mesh stick curl_flat drive dagger hitches double_slants levels y_cross'.split(' ');
for (const concept of CONCEPTS) for (const coverage of ['cover1', 'cover2man', 'cover3', 'cover4']) for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3, 4]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
  let row: any = null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, ...rest: any[]) => {
    const b: any = p.behavior;
    if (p === sim.qb && !row && target && b?.evaluate) {
      b.marginProbe = true; let ev: any = null; try { ev = b.evaluate(p, sim, target, 0); } catch { ev = null; } b.marginProbe = false;
      const tgt = b.receiverForecasts.get(target)?.predict(sim.t, 0) ?? target.pos;
      let near: any = null;
      for (const d of sim.defense) { const e = b.mind.estimate(d), dist = Math.hypot(e.pos.x - tgt.x, e.pos.y - tgt.y);
        if (!near || dist < near.dist) near = { slot: d.slot, dist: +dist.toFixed(2), facingQB: Math.cos(e.facing - Math.atan2(p.pos.y - e.pos.y, p.pos.x - e.pos.x)) > 0.2,
          trueDist: +Math.hypot(d.pos.x - target.pos.x, d.pos.y - target.pos.y).toFixed(2) }; }
      const m = (b.marginLast ?? []).find((x: any) => x.slot === near?.slot) ?? null;
      const pr = ev?.parts, f3 = (x: number | undefined) => (x === undefined ? null : +x.toFixed(3));
      row = { concept, coverage, roster, seed, t: +sim.t.toFixed(2), route: target.behavior?.route?.id ?? null, P: ev ? +ev.P.toFixed(3) : null,
        pOpen: f3(pr?.pOpen), pClear: f3(pr?.pClear), pAcc: f3(pr?.pAcc), hands: f3(pr?.hands), intRisk: ev ? +ev.intRisk.toFixed(3) : null,
        depth: ev ? +ev.depth.toFixed(1) : null, T: ev ? +ev.T.toFixed(2) : null, near, m, away: !!rest[4] };
    }
    return tb(p, target, ...rest);
  };
  let res: any; try { res = sim.run(); } catch { continue; }
  // The ball's fate, from the play's events after the throw: caught, defended (a break-up or deflection), dropped,
  // missed (an incompletion with none of those), picked.
  const ev = sim.events.map((e: any) => e.type), has = (k: string) => ev.includes(k);
  const fate = has('interception') ? 'int' : res.stats?.completed ? 'catch' : has('pbu') || has('deflection') ? 'defended' : has('drop') ? 'drop' : has('miss') ? 'miss' : 'incomplete';
  if (row) console.log(JSON.stringify({ ...row, cmp: !!res.stats?.completed, int: has('interception'), fate }));
}
