/**
 * HOT_LOOK read on league-sampled games (back-probe.ts's population): one row per called drop-back pass where the
 * QB's alarm (pressure under 0.45 s) fires. Passive: reads QBPass's diagnostic fields; the game is unchanged.
 * Row: alarm time, the hot pick (target, on the read or not, whether a look preceded it, facing and gaze offsets),
 * looks started, ticks with no hot throw, picture ages at the alarm, the free first pressure (back-probe's rule: the
 * first defender within 2 yd of the QB from 0.3 s, no blocker within 1.2 yd of him), and the outcome.
 *   [HOT_LOOK=1] [FREE_BOUND=1] node --import tsx scripts/diag/read-plan/hot-games.ts [--seed 101] [--games 16] > out/read-plan/hotg-<arm>.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../../src/sim/playsim.js';

// The window's per-defender terms at the aimed point of the throw he starts (diagnostic trace; no effect on play).
const QP: any = QBPass.prototype, ev0 = QP.evaluate, st0 = QP.startThrow;
QP.evaluate = function (a: any, sim: any, r: any, u: number) {
  this.marginProbe = true;
  const e = ev0.call(this, a, sim, r, u);
  (this.traceBy ??= new Map()).set(r, { t: sim.t, margins: this.marginLast });
  return e;
};
QP.startThrow = function (a: any, sim: any, e: any) {
  const tr = this.traceBy?.get(e.target);
  if (!this.throwMargins) this.throwMargins = tr && tr.t === sim.t ? tr.margins : null;
  return st0.call(this, a, sim, e);
};

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '16'));
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  const pass = sim.offCall?.kind === 'pass' ? sim.offCall.pass : null;
  if (!pass || pass.family === 'screen') return run.call(this);
  let qb: any = null, press: any = null, target: any = null, arrT: number | null = null, deflectedAt: number | null = null, intAt: number | null = null, picker: string | null = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air';
    tick();
    if (!qb && sim.qb.behavior?.kind === 'qb-pass') qb = sim.qb.behavior;
    if (!press && sim.t >= 0.3 && sim.throwAt < 0 && sim.carrier === sim.qb) {
      const d = sim.defense.find((e: any) => Math.hypot(e.pos.x - sim.qb.pos.x, e.pos.y - sim.qb.pos.y) <= 2);
      if (d) press = { t: +sim.t.toFixed(2), free: !sim.offense.some((o: any) => o !== sim.qb && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.2) };
    }
    if (!air && sim.ball.kind === 'air' && !target) { target = sim.ball.target ?? null; arrT = sim.ball.arrivalT ?? sim.ball.arrival ?? null; }
    if (sim.ball.kind === 'air' && sim.ball.deflected && deflectedAt === null) deflectedAt = sim.t;
    if (intAt === null && air && sim.ball.kind !== 'air' && sim.possession === 'D') { intAt = sim.t; picker = sim.ball.carrier?.slot ?? null; }
  };
  const r = run.call(this);
  const s = sim.stats, ref = (a: any) => a ? sim.offAlign.refOf[a.slot] ?? a.slot : null;
  const ev = r.events ?? sim.events ?? [];
  process.stdout.write(JSON.stringify({ concept: pass.id, family: pass.family, alarmAt: qb?.alarmAt ?? null,
    hot: qb?.hotPick ? { ...qb.hotPick, ref: ref({ slot: qb.hotPick.slot }) } : null, hotLooks: qb?.hotLooks ?? 0, hotNone: qb?.hotNone ?? 0,
    alarmAges: qb?.alarmAges ?? null, throwRec: qb?.throwRec ? { ...qb.throwRec, ref: ref({ slot: qb.throwRec.slot }) } : null, press, target: ref(target), throwAt: sim.throwAt >= 0 ? +sim.throwAt.toFixed(2) : null,
    att: !!s.attempted, cmp: !!s.completed, sack: !!s.sacked, int: ev.some((e: any) => e.type === 'interception'),
    throwaway: ev.some((e: any) => e.type === 'throwaway'),
    intKind: intAt === null ? null : deflectedAt !== null && deflectedAt <= intAt ? 'tipped' : arrT !== null && intAt < arrT - 0.15 ? 'path' : 'catch point',
    intEarly: intAt !== null && arrT !== null ? +(arrT - intAt).toFixed(2) : null, outcome: s.completed ? 'catch' : ev.some((e: any) => e.type === 'interception') ? 'int' : ev.some((e: any) => e.type === 'pbu' || e.type === 'deflection') ? 'defended' : ev.some((e: any) => e.type === 'drop') ? 'drop' : 'ground', scramble: !!sim.scrambled, yards: +r.yards.toFixed(2), picker, margins: qb?.throwMargins ?? null }) + '\n');
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
