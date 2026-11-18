// QB lane 2026-11-18 (the chosen throw re-evaluated at the decision, so the trace is its own: marginLast holds the last evaluate()): where the pickers' balls went. League games; per interception: the decision's aim, the release's
// intended point (the re-aim), the drawn aim (his accuracy), the pick spot, the events between release and pick (a tip
// or breakup first), and the picker's margin in the window at the decision. Class: tip, re-aim, miss, path, arrival.
//   node --import tsx scripts/diag/eyes/pick-class.ts <seed> <games> > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) { const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let dec: any = null, rel: any = null, hooked = false; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { const b: any = sim.qb.behavior;
    if (!hooked && b?.kind === 'qb-pass') { hooked = true; b.marginProbe = true; b.marginProbeAll = true; const st = b.startThrow.bind(b);
      b.startThrow = (a: any, s: any, ev: any) => { if (!dec) { try { b.evaluate(a, s, ev.target, b.barNow?.u ?? 0); } catch { /* the trace below falls back */ } } if (!dec) dec = { t: s.t, aim: { x: ev.point.x, y: ev.point.y }, T: ev.T, target: ev.target.slot, rows: (b.marginLast ?? []).map((m: any) => ({ slot: m.slot, m: m.m, contest: m.contest, iPath: m.iPath })) }; return st(a, s, ev); };
      const tb = sim.throwBall.bind(sim); sim.throwBall = (q: any, r: any, v0: any, intended: any, ...rest: any[]) => { if (q === sim.qb && !rel && r) rel = { t: sim.t, intended: { x: intended.x, y: intended.y }, drawn: b.releaseRec?.aim ? { x: b.releaseRec.aim.x, y: b.releaseRec.aim.y } : null, arrivalT: rest[0] }; return tb(q, r, v0, intended, ...rest); }; }
    tick0(); };
  const res = orig.apply(this);
  const ie = sim.events.find((e: any) => e.type === 'interception');
  if (ie && dec && rel) {
    const picker = sim.agents[ie.a]?.slot, spot = ie.pos ?? sim.agents[ie.a]?.pos;
    const between = sim.events.filter((e: any) => e.t >= rel.t - 1e-9 && e.t <= ie.t + 1e-9 && ['pbu', 'deflection', 'tip', 'bat', 'catch', 'drop'].includes(e.type)).map((e: any) => e.type + '@' + (e.t - rel.t).toFixed(2) + ':' + (sim.agents[e.a]?.slot ?? ''));
    const dist = (p: any, q: any) => p && q ? +Math.hypot(p.x - q.x, p.y - q.y).toFixed(2) : null;
    const row = dec.rows.find((x: any) => x.slot === picker);
    const reAim = dist(dec.aim, rel.intended), missBy = dist(rel.intended, rel.drawn), fromIntended = dist(spot, rel.intended), fromDrawn = dist(spot, rel.drawn);
    const early = ie.t < rel.arrivalT - 0.15;
    const cls = between.some((x: string) => /^(pbu|deflection|tip|bat)/.test(x)) ? 'tip' : early ? 'path' : (fromIntended ?? 0) > 1.5 && (fromDrawn ?? 9) <= 1.5 ? 'miss' : (reAim ?? 0) > 1.5 ? 're-aim' : 'arrival';
    console.log(JSON.stringify({ seed, cov: sim.defCall?.coverage?.id, concept: sim.offCall?.pass?.id, picker, cls, reAim, missBy, fromIntended, fromDrawn, pickDt: +(ie.t - rel.t).toFixed(2), flight: +(rel.arrivalT - rel.t).toFixed(2), between, m: row?.m ?? null, contest: row?.contest ?? null, iPath: row?.iPath ?? null }));
  }
  return res; };
for (let g = 0; g < games; g++) { const s = seed + g, rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); }
