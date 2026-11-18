// QB lane 2026-11-18 (the chosen throw re-evaluated at the decision, so the trace is its own: marginLast holds the last evaluate()): the window's arrival, calibrated. League games; at each throw decision, every defender as the
// window priced him at the aimed point (marginProbe + marginProbeAll: margin m, first, contest, his state); at the ball's
// arrival (its catch, pick, breakup or planned arrival), each defender's true distance to the ball. Rows to stdout.
//   node --import tsx scripts/diag/eyes/arrive-cal.ts <seed> <games> > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) { const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let dec: any = null, hooked = false, arr: any = null, released = false; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { const b: any = sim.qb.behavior;
    if (!hooked && b?.kind === 'qb-pass') { hooked = true; b.marginProbe = true; b.marginProbeAll = true; const st = b.startThrow.bind(b);
      b.startThrow = (a: any, s: any, ev: any) => { if (!dec) { try { b.evaluate(a, s, ev.target, b.barNow?.u ?? 0); } catch { /* the trace below falls back */ } } if (!dec) dec = { t: +s.t.toFixed(2), target: ev.target.slot, P: +ev.P.toFixed(3), iR: +ev.intRisk.toFixed(3), T: ev.T, rows: (b.marginLast ?? []).map((m: any) => ({ ...m })) }; return st(a, s, ev); }; }
    const wasAir = sim.ball.kind === 'air';
    tick0();
    if (sim.ball.kind === 'air') released = true;
    // The arrival: the first tick the ball is no longer in the air after its release, or its planned arrival.
    if (dec && released && !arr && (!(sim.ball.kind === 'air') || (sim.ball.arrivalT !== undefined && sim.t >= sim.ball.arrivalT - 1e-9))) {
      const bp = sim.ball.pos ?? sim.ball.carrier?.pos;
      if (bp) arr = { t: +sim.t.toFixed(2), d: Object.fromEntries(sim.defense.map((d: any) => [d.slot, +Math.hypot(d.pos.x - bp.x, d.pos.y - bp.y).toFixed(2)])), reach: Object.fromEntries(sim.defense.map((d: any) => [d.slot, d.profile.reach])) };
    }
    void wasAir; };
  const res = orig.apply(this);
  if (dec && arr) { const ints = sim.events.filter((e: any) => e.type === 'interception').map((e: any) => sim.agents[e.a]?.slot);
    for (const r of dec.rows) { r.dTrue = arr.d[r.slot]; r.reach = arr.reach[r.slot]; r.picked = ints.includes(r.slot); }
    console.log(JSON.stringify({ seed, cov: sim.defCall?.coverage?.id, ...dec, int: ints.length > 0, cmp: !!sim.stats.completed })); }
  return res; };
for (let g = 0; g < games; g++) { const s = seed + g, rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); }
