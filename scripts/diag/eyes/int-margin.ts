// node --import tsx scripts/diag/eyes/int-margin.ts [seed] [games] > rows.jsonl
// QB lane, 2026-11-18 (QB_WINDOW_ARRIVE's game interceptions): for each intercepted throw in league games, the picker
// as the QB's window priced him at the last evaluation before the release (marginProbe: margin, blind, reaction, facing),
// the QB's picture of him (position, velocity) and the truth at the release, and the throw (target, air, believed P and
// pick risk). Passive except the window's own margin trace.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const dir = sim.attackDir(sim.qb.team); let rel: any = null;
  const tick = sim.tick.bind(sim); sim.tick = () => { const b: any = sim.qb.behavior; if (b?.kind === 'qb-pass') b.marginProbe = true; tick(); };
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
    if (p === sim.qb && !rel && !away && intended) { const b: any = p.behavior, X = (q: any) => +((q.x - sim.los) * dir).toFixed(1), Y = (q: any) => +(q.y - sim.ballY).toFixed(1);
      rel = { t: +sim.t.toFixed(2), slot: target?.slot, route: target?.behavior?.route?.id ?? null, air: +((intended.x - sim.los) * dir).toFixed(1), aim: [X(intended), Y(intended)], flight: +(arrivalT - sim.t).toFixed(2),
        P: b?.throwRec ? +b.throwRec.P.toFixed(3) : null, iR: b?.throwRec ? +b.throwRec.intRisk.toFixed(3) : null, margins: b?.marginLast ?? null,
        defs: sim.defense.map((d: any) => { const e = b?.mind?.estimate?.(d); return { slot: d.slot, at: [X(d.pos), Y(d.pos)], v: [+(d.vel.x * dir).toFixed(1), +d.vel.y.toFixed(1)], seen: e ? [X(e.pos), Y(e.pos)] : null, seenV: e ? [+(e.vel.x * dir).toFixed(1), +e.vel.y.toFixed(1)] : null, beh: d.behavior?.kind ?? null, zone: d.behavior?.zone ?? null }; }) }; }
    return tb(p, target, v0, intended, arrivalT, away, ...rest);
  };
  const res: any = orig.apply(this);
  const ie = sim.events.find((e: any) => e.type === 'interception');
  if (rel && ie) { const picker = sim.defense.find((d: any) => d.idx === ie.a) ?? null;
    console.log(JSON.stringify({ ...rel, picker: picker?.slot ?? null, pickT: +ie.t.toFixed(2), cov: sim.defCall?.coverage?.id ?? null, concept: sim.offCall?.pass?.id ?? null,
      pickerM: (rel.margins ?? []).find((m: any) => m.slot === picker?.slot) ?? null, pickerDef: rel.defs.find((d: any) => d.slot === picker?.slot) ?? null, margins: undefined, defs: undefined })); }
  return res;
};
const seed = Number(process.argv[2] ?? 11);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 4); g++) simulateGame(home, away, { seed: seed + g });
