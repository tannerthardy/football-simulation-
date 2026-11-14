/**
 * How far a receiver adjusts to a ball: on every targeted pass in league games, the miss (where the thrown ball comes
 * down at its designed arrival, against the point aimed at), the flight time, whether it was caught, intercepted or
 * touched, and the receiver's ball skills and hands. The QB's accuracy belief assumes a fixed 1.35 yd catchable radius
 * whatever the flight (qb.ts window, pAcc). Passive.
 *   node --import tsx scripts/diag/eyes/catch-radius.ts [--seed 101] [--games 8] > out/eyes/radius.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { simulateTo } from '../../../src/physics/ball.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  if (sim.offCall?.kind !== 'pass') return run.call(this);
  let rec: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const was = sim.ball.kind;
    tick();
    if (!rec && was !== 'air' && sim.ball.kind === 'air' && !sim.ball.throwaway && sim.ball.target && sim.ball.flight) {
      const b = sim.ball, T = b.arrivalT - sim.t;
      const land = simulateTo(b.flight.pos, b.flight.vel, T, b.flight.drag, sim.wind);
      const r = b.target;
      rec = { T: +T.toFixed(2), miss: +Math.hypot(land.x - b.intended.x, land.y - b.intended.y).toFixed(2), missZ: +(land.z - b.intended.z).toFixed(2),
        rcvToAim: +Math.hypot(r.pos.x - b.intended.x, r.pos.y - b.intended.y).toFixed(2), skills: +r.r('ballSkills').toFixed(2), hands: +r.r('hands').toFixed(2), r,
        arrT: b.arrivalT, land, sepThrow: +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y))).toFixed(2),
        depth: +((r.pos.x - sim.los) * sim.attackDir('O')).toFixed(1) };
    }
    // At the designed arrival: the receiver's distance from where the ball comes down, and the nearest defender's.
    if (rec && rec.atArr === undefined && sim.t >= rec.arrT - 1e-9) {
      const r = rec.r, L = rec.land;
      rec.atArr = { rcvToBall: +Math.hypot(r.pos.x - L.x, r.pos.y - L.y).toFixed(2), defToBall: +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - L.x, d.pos.y - L.y))).toFixed(2),
        rcvSep: +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y))).toFixed(2) };
    }
  };
  const res = run.call(this);
  if (rec) {
    const r = rec.r; delete rec.r; delete rec.land; delete rec.arrT;
    rec.pbu = sim.events.some((e: any) => e.type === 'pbu' || e.type === 'deflection');
    rec.caught = !!sim.stats.completed; rec.int = sim.events.some((e: any) => e.type === 'interception');
    rec.touched = sim.events.some((e: any) => (e.type === 'secure' || e.type === 'drop' || e.type === 'catch') && e.a === r.idx);
    process.stdout.write(JSON.stringify(rec) + '\n');
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
