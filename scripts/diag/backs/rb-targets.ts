/**
 * Pass targets in league games, for the back's routes against NFL RB targets (nfl_rb_targets.py): per pass play the
 * target's slot and route, the throw time after the snap, the QB's read order (slot:route) and his read index at the
 * throw, the nearest defender to the target at the throw (distance; how much deeper than the target), the catch point
 * (width from the sideline, depth past the line) and the result. Passive.
 *   node --import tsx scripts/diag/backs/rb-targets.ts [--seed 101] [--games 8] > out/backs/sim.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { FIELD_WIDTH } from '../../../src/core/field.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const routeOf = (a: any) => a?.behavior?.route?.id ?? a?.behavior?.kind ?? '?';
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  if (sim.offCall?.kind !== 'pass') return run.call(this);
  let rec: any = null, qb: any = null, routes = new Map<any, string>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const was = sim.ball.kind;
    tick();
    if (!qb && sim.qb.behavior?.kind === 'qb-pass') qb = sim.qb.behavior;
    for (const a of sim.offense) if (a.behavior?.route?.id) routes.set(a, a.behavior.route.id);
    if (!rec && was !== 'air' && sim.ball.kind === 'air' && !sim.ball.throwaway && sim.ball.target) {
      const r = sim.ball.target, dir = sim.attackDir('O');
      const D = sim.defense.filter((d: any) => !d.isDown(sim.t));
      const near = D.reduce((b: any, d: any) => (!b || Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y) < Math.hypot(b.pos.x - r.pos.x, b.pos.y - r.pos.y) ? d : b), null);
      rec = { t: +(sim.t - (qb?.snapAt ?? 0)).toFixed(2), slot: r.slot, pos: r.player.position, route: routes.get(r) ?? routeOf(r),
        readIdx: qb?.readIdx ?? null, reads: qb?.reads?.map((x: any) => `${x.slot}:${routes.get(x) ?? routeOf(x)}`) ?? [],
        nearD: near ? +Math.hypot(near.pos.x - r.pos.x, near.pos.y - r.pos.y).toFixed(2) : null,
        nearDeeper: near ? +((near.pos.x - r.pos.x) * dir).toFixed(2) : null, nearPos: near?.player.position ?? null,
        alignW: +Math.abs((sim.offAlign.spots[r.slot]?.pos.y ?? r.pos.y) - sim.ballY).toFixed(2), target: r };
    }
  };
  const res = run.call(this);
  if (rec) {
    delete rec.target;
    rec.caught = !!sim.stats.completed;
    rec.concept = sim.offCall.pass?.id;
    process.stdout.write(JSON.stringify(rec) + '\n');
  } else process.stdout.write(JSON.stringify({ noThrow: true, concept: sim.offCall.pass?.id }) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
