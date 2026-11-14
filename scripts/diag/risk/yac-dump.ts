// After-catch staging, sim side: for short completions (intended under 10 air yd, thrown non-screen passes) dump the
// targeted receiver (catcher after the catch) and every defender at 10 Hz from the release to the end of the play,
// as JSON lines in the same shape nfl_yac_stage.py reads from BDB tracking, so one measurement code reads both.
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/yac-dump.ts SEED GAMES > out/risk/yac-sim.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult;
const r2 = (v: number) => Math.round(v * 100) / 100;
const st = (a: any) => [r2(a.pos.x), r2(a.pos.y), r2(a.vel.x), r2(a.vel.y)];
// A defender's row adds his requested velocity (the command he issued) and flags: 1 he has seen this flight, 2 he holds
// a ball estimate (BALL_EST), 4 man / 8 zone behavior, 16 he has seen his receiver look back for it.
function dst(sim: any, d: any) {
  const c = sim.cmds?.[d.idx]?.vel ?? { x: NaN, y: NaN }, ts = sim.throwSight, be = sim.ballEstimates;
  const k = d.behavior?.kind;
  const f = (ts?.seenAt?.(d) !== undefined ? 1 : 0) | (be?.lastSeen?.(d) ? 2 : 0) | (k === 'man' ? 4 : k === 'zone' ? 8 : 0) | (ts?.handsAt?.(d) !== undefined ? 16 : 0);
  return [...st(d), r2(c.x), r2(c.y), f];
}
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.__yd && this.ball.target && !this.ball.throwaway)
    this.__yd = { T: this.ball.target, air: (this.ball.intended.x - this.los) * this.attackDir(this.offense[0].team), dir: this.attackDir(this.offense[0].team), los: this.los, k: 0, frames: [], catchAt: -1 };
  const S = this.__yd;
  if (S) {
    const held = this.ball.kind === 'held' && this.ball.carrier !== this.qb && this.offense.includes(this.ball.carrier);
    // The catch tick is always a frame, and 10 Hz restarts from it, so after-catch times are exact multiples of 0.1 s.
    if (held && S.catchAt < 0) { S.catchAt = S.frames.length; S.T = this.ball.carrier; S.k = 0; }
    if (S.k++ % 2 === 0) S.frames.push({ c: st(S.T), d: this.defense.map((d: any) => dst(this, d)) });
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__yd; this.__yd = undefined;
  if (S && S.air < 10 && this.stats?.completed && S.catchAt >= 0) {
    process.stdout.write(JSON.stringify({ src: 'sim', dir: S.dir, los: S.los, catch: S.catchAt, yards: res.yards, end: res.outcome ?? '-', frames: S.frames }) + '\n');
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
