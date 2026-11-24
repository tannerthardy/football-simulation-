// FLIGHT_BREAK's man arm-read break before the ball is out (a pump, or an arm read ahead of the release): per bite, its
// length, his receiver's separation from him at the start, at the end and 0.5 s later, the coverage, and whether a
// throw followed and to whom. Read-only. Tools' game set.
//   node --import tsx scripts/diag/coverage/man-pump-bite.mts <seed> <games> <out.jsonl>
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';
import { flightBreakOf } from '../../../src/sim/behaviors/defense.js';
import { appendFileSync } from 'node:fs';

const seed = Number(process.argv[2] ?? 23), games = Number(process.argv[3] ?? 1), outPath = process.argv[4] ?? 'out/diag/coverage/man-pump-bite.jsonl';
const P: any = PlaySim.prototype, tick0 = P.tick, res0 = P.buildResult;
const sep = (a: any, r: any) => Math.hypot(a.pos.x - r.pos.x, a.pos.y - r.pos.y);
P.tick = function () {
  tick0.call(this);
  if (compilingPlan()) return;
  this.__bites ??= new Map();
  if (this.__rel === undefined && this.ball?.kind === 'air') this.__rel = { t: this.t, target: this.ball.target?.slot ?? null };
  for (const a of this.agents) {
    const fb = flightBreakOf(a);
    const live = fb && fb.via === 'man-arm' && this.t - fb.t < 0.06;
    const b = this.__bites.get(a);
    if (live && this.__rel === undefined && (!b || b.end !== undefined)) {
      const fresh = { slot: a.slot, rcv: fb!.receiver.slot, start: this.t, sep0: +sep(a, fb!.receiver).toFixed(2), R: fb!.receiver, end: undefined as number | undefined };
      this.__bites.set(a, fresh); (this.__all ??= []).push(fresh);
    } else if (b && b.end === undefined && !live) { b.end = this.t; b.sepEnd = +sep(a, b.R).toFixed(2); }
    if (b && b.end !== undefined && b.sep05 === undefined && this.t - b.end >= 0.5) b.sep05 = +sep(a, b.R).toFixed(2);
  }
};
P.buildResult = function () {
  const r = res0.call(this);
  if (!compilingPlan() && !this.__done) {
    this.__done = true;
    for (const b of this.__all ?? []) appendFileSync(outPath, JSON.stringify({ seed, cov: this.defCall?.coverage?.id, slot: b.slot, rcv: b.rcv,
      len: b.end !== undefined ? +(b.end - b.start).toFixed(2) : null, sep0: b.sep0, sepEnd: b.sepEnd ?? null, sep05: b.sep05 ?? null,
      thrownAfter: this.__rel ? +(this.__rel.t - b.start).toFixed(2) : null, target: this.__rel?.target ?? null, toHisMan: this.__rel?.target === b.rcv,
      outcome: r.outcome, yards: r.yards }) + '\n');
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let i = 0; i < games; i++) simulateGame(home, away, { seed: seed + i });
console.log('done', seed);
