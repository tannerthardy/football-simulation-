/**
 * The backside end on flow away (Integration's condition for naked/boot: does our unblocked backside end chase,
 * squeeze or stay home when zone action goes away from him?). League-sampled games; every zone run
 * (insideZone, outsideZone, wideZone, splitZone, stretch, toss) and every play-action pass with a zone fake. The
 * backside end is the defender on the line (within 1.5 yd of it at the snap) widest on the side away from the play
 * (pass: away from the fake's side, the back's side). At 0.5 / 1.0 / 1.5 s: his move toward the play side along the
 * line (yd), his depth gained into the backfield (yd), whether anyone has engaged him, and his distance to the QB.
 * Passive.
 *   node --import tsx scripts/diag/concepts/backside-end.ts [--seed 101] [--games 8] > out/concepts/bsend-<seed>.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const ZONE = new Set(['insideZone', 'outsideZone', 'wideZone', 'splitZone', 'stretch', 'toss']);
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this, call = sim.offCall;
  const runZ = call?.kind === 'run' && ZONE.has(call.run?.scheme);
  const paZ = call?.kind === 'pass' && call.pass?.fake && /zone/i.test(call.pass.fake);
  if (!runZ && !paZ) return run.call(this);
  let end: any = null, side = 0, start: any = null, engagedAt: number | null = null, qbStart: any = null;
  const marks: any = {};
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    if (!end) {
      const dir = sim.attackDir(sim.offense[0].team);
      if (runZ) side = (call.run.direction === 'strong' ? 1 : -1) * sim.offAlign.strongSign;
      else { const rb = sim.slot('RB'); side = rb ? -(Math.sign(rb.pos.y - sim.qb.pos.y) || 1) : sim.offAlign.strongSign; }
      // The play goes to `side` (y sign from the ball). A gun zone fake goes away from the back's alignment side.
      const line = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * dir) < 1.5);
      const back = line.filter((d: any) => Math.sign(d.pos.y - sim.ballY) === -side);
      end = back.sort((p: any, q: any) => Math.abs(q.pos.y - sim.ballY) - Math.abs(p.pos.y - sim.ballY))[0] ?? null;
      if (end) { start = { x: end.pos.x, y: end.pos.y }; qbStart = { x: sim.qb.pos.x, y: sim.qb.pos.y }; }
    }
    tick();
    if (!end) return;
    if (engagedAt === null && end.engagement) engagedAt = +sim.t.toFixed(2);
    const dir = sim.attackDir(sim.offense[0].team);
    for (const T of [0.5, 1.0, 1.5]) if (!marks[T] && sim.t >= T - 1e-9) marks[T] = {
      toPlay: +((end.pos.y - start.y) * side).toFixed(2), depth: +(-(end.pos.x - start.x) * dir).toFixed(2),
      engaged: engagedAt !== null, toQB: +Math.hypot(end.pos.x - sim.qb.pos.x, end.pos.y - sim.qb.pos.y).toFixed(2),
      speed: +Math.hypot(end.vel.x, end.vel.y).toFixed(2) };
  };
  const r = run.call(this);
  if (end) process.stdout.write(JSON.stringify({ kind: runZ ? 'run' : 'pa', concept: runZ ? call.run.id : call.pass.id, scheme: runZ ? call.run.scheme : call.pass.fake,
    end: end.slot, role: end.behavior?.kind ?? null, engagedAt, marks, yards: +r.yards.toFixed(2) }) + '\n');
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
