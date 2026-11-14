/**
 * QB_BODY_SEEN pump mechanism (league games, passive): on each pump (a throwing motion pulled down: sim.windupEndAt set
 * without a release), every defender planted on it ('plant' tag) is followed: his speed away from the line at the
 * pull-down and 0.3 / 0.6 s after, his depth gain from the pull-down to the eventual throw, whether he restarted
 * ('plant-restart'), and the throw that follows (to his zone's side or not is not inferred: completion and yards).
 *   [QB_BODY_SEEN=1] node --import tsx scripts/diag/eyes/pump-recover.ts [--seed 101] [--games 8] > out/eyes/pump-recover.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const r2 = (v: number) => +v.toFixed(2);
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  if (sim.offCall?.kind !== 'pass') return run.call(this);
  let pumpAt: number | null = null, lastEnd = -1, release: number | null = null;
  const track = new Map<any, any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const was = sim.ball.kind;
    tick();
    const dir = sim.attackDir('O');
    const away = (d: any) => r2(d.vel.x * dir), depth = (d: any) => (d.pos.x - sim.los) * dir;
    if (pumpAt === null && sim.windupEndAt >= 0 && sim.windupEndAt !== lastEnd && sim.ball.kind !== 'air') {
      pumpAt = sim.t;
      for (const d of sim.defense) if (d.tags.has('plant')) track.set(d, { pos: d.player.position, v0: away(d), d0: depth(d), v3: null, v6: null, restart: null, dThrow: null });
    }
    lastEnd = sim.windupEndAt;
    if (pumpAt !== null) for (const [d, r] of track) {
      if (r.v3 === null && sim.t >= pumpAt + 0.3) r.v3 = away(d);
      if (r.v6 === null && sim.t >= pumpAt + 0.6) r.v6 = away(d);
      if (r.restart === null && d.tags.has('plant-restart')) r.restart = r2(sim.t - pumpAt);
    }
    if (release === null && was !== 'air' && sim.ball.kind === 'air') {
      release = sim.t;
      for (const [d, r] of track) r.dThrow = r2(depth(d) - r.d0);
    }
  };
  const res = run.call(this);
  if (pumpAt !== null) process.stdout.write(JSON.stringify({ concept: sim.offCall.pass?.id, pumpAt: r2(pumpAt), throwAfter: release !== null ? r2(release - pumpAt) : null,
    planted: [...track.values()], caught: !!sim.stats.completed, int: sim.events.some((e: any) => e.type === 'interception'), yards: res.yards ?? null }) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
