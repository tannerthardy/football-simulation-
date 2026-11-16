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
  let row: any = null, decSplit: any = null; const tb = sim.throwBall.bind(sim);
  // At his decision (startThrow): the pieces of the miss he believes, each alone on his base: his base miss at the
  // distance; with the urgency he projects to the release (pressure then, without the judgment draw); with his platform
  // (his motion now); and the late-release factor.
  let hooked = false; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { tick0(); const b: any = sim.qb.behavior; if (!hooked && b?.kind === 'qb-pass') { hooked = true; const st0 = b.startThrow.bind(b);
    b.startThrow = (a: any, s: any, ev: any) => { try { if (!decSplit && ev?.point) { const dist = Math.hypot(ev.point.x - a.pos.x, ev.point.y - a.pos.y), pr = b.pressure(a, s), atRel = pr.time - b.windup(a);
      const u = Math.max(0, Math.min(1, (0.9 - atRel) / 0.7)), plat = b.platform(a, ev.point, ev.T);
      decSplit = { dist: +dist.toFixed(1), base: +b.missSigma(a, s, dist, 0).toFixed(2), withU: +b.missSigma(a, s, dist, u).toFixed(2), u: +u.toFixed(2),
        withPlat: +b.missSigma(a, s, dist, 0, plat).toFixed(2), plat: +plat.sigma.toFixed(2), late: +(1 + 0.8 * Math.max(0, Math.min(1, (0.15 - atRel) / 0.3))).toFixed(2), speed: +a.speed.toFixed(1), phase: b.phase }; } } catch { /* diagnostic */ }
      return st0(a, s, ev); }; } };
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
        depth: ev ? +ev.depth.toFixed(1) : null, T: ev ? +ev.T.toFixed(2) : null, near, m, away: !!rest[3],
        // His believed miss: the sigma his pAcc implies at the radius he uses (ACC_RADIUS: 1.6 + 0.9 T + 0.4 (ballSkills - 0.5)),
        // and the real release error: where the ball was sent (releaseRec.aim) against the point he aimed at.
        R: ev ? +(1.6 + 0.9 * ev.T + 0.4 * (target.r('ballSkills') - 0.5)).toFixed(2) : null,
        err: b.releaseRec && rest[1] ? +Math.hypot(b.releaseRec.aim.x - rest[1].x, b.releaseRec.aim.y - rest[1].y).toFixed(2) : null,
        // The belief that decided the throw: his evaluation as he started it (throwRec), not this re-evaluation at release.
        dec: b.throwRec ? { P: +b.throwRec.P.toFixed(3), pAcc: b.throwRec.parts ? +b.throwRec.parts.pAcc.toFixed(3) : null,
          pOpen: b.throwRec.parts ? +b.throwRec.parts.pOpen.toFixed(3) : null, pClear: b.throwRec.parts ? +b.throwRec.parts.pClear.toFixed(3) : null,
          hands: b.throwRec.parts ? +b.throwRec.parts.hands.toFixed(3) : null } : null,
        dist: +Math.hypot((rest[1]?.x ?? 0) - p.pos.x, (rest[1]?.y ?? 0) - p.pos.y).toFixed(1), speed: +p.speed.toFixed(1),
        // His miss function at this distance with no urgency (the release's base), and with the release's own urgency.
        base: rest[1] ? +b.missSigma(p, sim, Math.hypot(rest[1].x - p.pos.x, rest[1].y - p.pos.y), 0).toFixed(2) : null,
        relU: (() => { const pr = b.pressure(p, sim); return +Math.max(0, Math.min(1, (0.9 - pr.time) / 0.7)).toFixed(2); })() };
    }
    return tb(p, target, ...rest);
  };
  let res: any; try { res = sim.run(); } catch { continue; }
  // The ball's fate, from the play's events after the throw: caught, defended (a break-up or deflection), dropped,
  // missed (an incompletion with none of those), picked.
  const ev = sim.events.map((e: any) => e.type), has = (k: string) => ev.includes(k);
  const fate = has('interception') ? 'int' : res.stats?.completed ? 'catch' : has('pbu') || has('deflection') ? 'defended' : has('drop') ? 'drop' : has('miss') ? 'miss' : 'incomplete';
  if (row) console.log(JSON.stringify({ ...row, decSplit, cmp: !!res.stats?.completed, int: has('interception'), fate }));
}
