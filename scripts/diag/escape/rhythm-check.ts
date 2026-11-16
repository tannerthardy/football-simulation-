// node --import tsx scripts/diag/escape/rhythm-check.ts [seed] [games] > rows.jsonl
// Before footwork-keyed reads: are the installed break times (the read compiler's, from an unopposed run on this
// engine; the QB's planReads) the times the routes actually break in games? One row per read receiver whose route
// declares its break at a path vertex (BREAK_DECL) on a pass play: the concept, the coverage, the route, the
// installed break (s after the snap) and the true one (the first tick his route runner is past that vertex), and
// whether he was pressed. Passive.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { BREAK_DECL } from '../../../src/playbook/route-breaks.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const tick = sim.tick.bind(sim);
  let qb: any = null, snap: number | null = null, done = false;
  const seen = new Map<any, { route: string; at: number; plan: number | null; true: number | null; pressed: boolean }>();
  sim.tick = () => {
    tick();
    if (done) return;
    const b: any = sim.qb.behavior;
    if (b?.kind === 'qb-pass' && !qb) qb = b;
    if (!qb) return;
    if (snap === null && qb.snapAt !== undefined && sim.t >= qb.snapAt) snap = qb.snapAt;
    if (snap === null) return;
    if (sim.ball?.kind === 'air' || sim.qb.behavior !== qb) { done = true; return; }
    for (const [r, pr] of qb.planReads ?? new Map()) {
      const rr = r.behavior; if (!(rr instanceof RouteRunner)) continue;
      const id = (rr as any).route?.id ?? null, d = id ? BREAK_DECL[id] : undefined;
      if (!d || typeof d.at !== 'number') continue;
      let row = seen.get(r);
      if (!row) { row = { route: id, at: d.at, plan: pr.breakAt, true: null, pressed: false }; seen.set(r, row); }
      if ((rr as any).pressContact) row.pressed = true;
      if (row.true === null && (rr as any).idx > d.at) { row.true = +(sim.t - snap).toFixed(2); (row as any).abs = +sim.t.toFixed(2); (row as any).snap = snap; (row as any).qbBelief = +(qb.planBreakAt(r) ?? NaN).toFixed(2); }
    }
  };
  const res = orig.apply(this);
  const c = sim.offCall?.pass;
  for (const [, row] of seen) console.log(JSON.stringify({ concept: c?.id ?? '?', coverage: sim.defCall?.coverage?.id ?? '?', ...row }));
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 4); g++) simulateGame(home, away, { seed: seed + g });
