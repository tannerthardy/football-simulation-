/**
 * Why the back is (not) thrown to, on league-sampled games (the population of call-mix/collect.ts): one row per
 * called drop-back pass (no screen, no play action). Passive: wraps QBPass methods and reads state; the game is the
 * same as an unprobed one. The causes are checked in order:
 *   (a) no route: no back; called to block (the concept's install); or a check that never leaves;
 *   (b) late: he runs one but leaves the backfield (past the line or 3 yd lateral, nfl_back.py's operator) after 2.0 s;
 *   (c) never read: out and open at 2.6 s (nearest defender 3 yd or more) but the QB's read never reaches him;
 *   (d) read, not thrown: the read reaches him (or he is evaluated) and another throw, a sack or a scramble follows;
 * plus targeted (and when, pressured or not), and the free first pressure (freepass.mts's rule: the first defender
 * within 2 yd of the QB from 0.3 s, before the throw, with no offensive player within 1.2 yd of him).
 *   [READ_PLAN=1] [FORECAST_BREAK=1] node --import tsx scripts/diag/read-plan/back-probe.ts [--seed 101] [--games 16] > out/read-plan/back-<arm>.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '16'));
const P: any = QBPass.prototype;
const cur = new WeakMap<any, any>();
const upd = P.update, ev = P.evaluate;
P.update = function (a: any, sim: any) {
  const st = cur.get(sim);
  if (st && st.back) {
    const r = this.reads?.[this.readIdx];
    if (r === st.back && st.reachedAt === null && this.phase !== 'snap') st.reachedAt = +sim.t.toFixed(2);
  }
  return upd.call(this, a, sim);
};
P.evaluate = function (a: any, sim: any, r: any, u: number) {
  const out = ev.call(this, a, sim, r, u);
  const st = cur.get(sim);
  if (st && r === st.back) { st.evaluated = true; if (out) st.bestP = Math.max(st.bestP ?? 0, out.P); }
  return out;
};
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  const pass = sim.offCall?.kind === 'pass' ? sim.offCall.pass : null;
  if (!pass || pass.family === 'screen' || pass.fake || pass.family === 'playaction') return run.call(this);
  const st: any = { back: null, reachedAt: null, evaluated: false, bestP: null, released: null, routeAt: null, openAt26: null, press: null };
  cur.set(sim, st);
  const dir = () => sim.attackDir(sim.offense[0].team);
  let start: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (!st.back) st.back = sim.offense.find((o: any) => sim.offAlign.refOf[o.slot] === 'B') ?? null;
    if (!st.press && sim.t >= 0.3 && sim.throwAt < 0 && sim.carrier === sim.qb) {
      const d = sim.defense.find((e: any) => Math.hypot(e.pos.x - sim.qb.pos.x, e.pos.y - sim.qb.pos.y) <= 2);
      if (d) st.press = { t: +sim.t.toFixed(2), free: !sim.offense.some((o: any) => o !== sim.qb && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.2) };
    }
    const b = st.back;
    if (!b) return;
    start ??= { ...b.pos };
    if (b.behavior instanceof RouteRunner && st.routeAt === null) st.routeAt = +sim.t.toFixed(2);
    if (st.routeAt !== null && st.released === null && ((b.pos.x - sim.los) * dir() >= 0 || Math.abs(b.pos.y - start.y) >= 3)) st.released = +sim.t.toFixed(2);
    if (st.openAt26 === null && sim.t >= 2.6 && sim.ball.kind !== 'air') {
      const near = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y)));
      st.openAt26 = st.released !== null && near >= 3;
    }
  };
  const r = run.call(this);
  const s = sim.stats, tgtB = !!st.back && s.target === st.back.player.id;
  const cause = !st.back ? 'a_no_back' : st.routeAt === null ? (pass.back === 'check' ? 'a_check_stays' : 'a_called_block') : (st.released ?? 99) > 2.0 ? 'b_late' : tgtB ? 'targeted'
    : st.reachedAt === null && !st.evaluated ? (st.openAt26 ? 'c_never_read_open' : 'c_never_read') : 'd_read_not_thrown';
  process.stdout.write(JSON.stringify({ concept: pass.id, family: pass.family, back: pass.back, cause, tgtB, released: st.released, routeAt: st.routeAt, reachedAt: st.reachedAt,
    evaluated: st.evaluated, bestP: st.bestP, open26: st.openAt26, press: st.press, att: !!s.attempted, sack: !!s.sacked, ttt: s.timeToThrow ?? null, pressured: !!s.pressured }) + '\n');
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
