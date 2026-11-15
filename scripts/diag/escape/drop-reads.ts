// node --import tsx scripts/diag/escape/drop-reads.ts [seed] [games] > rows.jsonl
// Measurement 4 of the drop set (docs/football-handbook/qb-drops-and-pocket.md): does his read advance with his
// footwork? One row per dropback (pass plays whose QB runs the pass behavior from the snap): the concept, its drop,
// his upfield position (yd behind the line, attack direction) every 0.05 s from the snap to the release or the end,
// the times his read index changed (to what), where his eyes went (sim.qbEyes) and when, the plan's kind (a
// triangle or peek is evaluated together and holds the index until it is done: triEnd), the time he went 'set',
// the release time. Footwork events are found from the trajectory by drop_reads_table.py with drop-steps.py's plant
// definition, so the sim and any later NFL proxy share them. Passive.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const tick = sim.tick.bind(sim);
  let b0: any = null, last = -1, nextSample = 0, setT: number | null = null, rel: number | null = null;
  const xs: number[] = [], adv: [number, number][] = [], eyes: [number, string | null][] = [];
  let eyeLast: any = undefined, triEnd: number | null = null, kind: string | null = null;
  sim.tick = () => {
    tick();
    const q = sim.qb, b: any = q.behavior;
    if (rel !== null) return;
    if (b?.kind !== 'qb-pass') { if (b0) rel = rel ?? -1; return; }
    if (!b0) b0 = b;
    if (b !== b0) return;
    const dir = sim.attackDir(q.team);
    if (sim.t >= nextSample - 1e-9) { xs.push(+((q.pos.x - sim.los) * dir).toFixed(2)); nextSample += 0.05; }
    if (b.readIdx !== last) { adv.push([+sim.t.toFixed(2), b.readIdx]); last = b.readIdx; }
    if (setT === null && b.phase === 'set') setT = +sim.t.toFixed(2);
    if (sim.qbEyes !== eyeLast) { eyes.push([+sim.t.toFixed(2), sim.qbEyes?.slot ?? null]); eyeLast = sim.qbEyes; }
    if (kind === null && b.plan) kind = b.plan.peek ? 'peek' : b.plan.triangle ? 'triangle' : 'sequence';
    if (triEnd === null && b.triDone && b.plan?.triangle) triEnd = +sim.t.toFixed(2);
  };
  const tb = sim.throwBall.bind(sim);
  let thrIdx: number | null = null, thrStep: number | null = null, thrRdy: number | null = null;
  sim.throwBall = (p: any, target: any, ...rest: any[]) => {
    if (p === sim.qb && rel === null) {
      rel = +sim.t.toFixed(2);
      if (b0) { thrIdx = b0.reads?.indexOf(target) ?? null; thrStep = b0.stepOf?.get(target)?.n ?? null; }
    }
    return tb(p, target, ...rest);
  };
  const res = orig.apply(this);
  if (b0) {
    const c = sim.offCall?.pass;
    console.log(JSON.stringify({ concept: c?.id ?? '?', family: c?.family ?? null, drop: c?.drop ?? null, coverage: sim.defCall?.coverage?.id ?? '?',
      gun: xs[0] !== undefined ? xs[0] <= -3 : null, xs, adv, eyes, kind, triEnd, set: setT, rel: rel !== null && rel >= 0 ? rel : null, thrIdx, thrStep, qbSet: b0.setAt ?? null, reads: b0.reads?.length ?? null,
      sacked: !!res.stats.sacked, cmp: !!res.stats.completed }));
  }
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });
