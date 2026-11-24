// Interceptions in whole games, per arm (FLIGHT_BREAK=0 / default): who made each one, from which seat, by which catch
// path (catching.ts: through the hands, the contested hands-fight, a tipped ball, the defender alone at the ball), whether
// he was breaking on that throw (flightBreakOf: a break request within 0.3 s, on the targeted receiver or another), and
// the throw (target number, depth at the release, air time). Read-only. Tools' game set.
//   FLIGHT_BREAK=0 node --import tsx scripts/diag/coverage/int-census.mts <seed> <games> [out.jsonl]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';
import { flightBreakOf } from '../../../src/sim/behaviors/defense.js';
import { appendFileSync } from 'node:fs';

const seed = Number(process.argv[2] ?? 23), games = Number(process.argv[3] ?? 2), outPath = process.argv[4];
const arm = process.env.FLIGHT_BREAK === '0' ? 'off' : 'on';
const P: any = PlaySim.prototype, possess0 = P.possess, throw0 = P.throwBall, res0 = P.buildResult;
const out = { plays: 0, throws: 0, ints: 0, outcomes: {} as Record<string, number> };
const path = (stack: string) => {
  const m = /catching\.ts:(\d+)/.exec(stack); const l = Number(m?.[1] ?? 0);
  return l < 300 ? 'pbu-hands' : l < 420 ? 'contested' : l < 510 ? 'tip' : l ? 'alone' : '?';
};
P.possess = function (a: any, how: string) {
  if (how === 'interception' && this.ball?.kind === 'air' && !compilingPlan() && !this.__int) {
    const T = this.__rel?.T ?? this.ball.target, dir = this.attackDir('O'), nr: Record<string, string> = {};
    for (const [ref, slot] of Object.entries(this.offAlign?.numbering ?? {})) if (slot) nr[slot as string] = ref;
    const fb = flightBreakOf(a), breaking = !!fb && this.t - fb.t < 0.3;
    const rel = this.__rel;
    const b: any = a.behavior;
    const row = {
      arm, seed, slot: a.slot, role: b?.zone ? `zone:${b.zone}` : b?.constructor?.name ?? '?',
      cov: this.defCall?.coverage?.id, path: path(new Error().stack ?? ''),
      breaking, onTarget: breaking && fb!.receiver === T, target: T?.slot, ref: T ? nr[T.slot] ?? '?' : null,
      depth: rel ? +rel.depth.toFixed(1) : null, air: rel ? +(this.t - rel.t).toFixed(2) : null,
      dRel: rel?.d?.[a.slot] ?? null, dCatch: T ? +Math.hypot(a.pos.x - T.pos.x, a.pos.y - T.pos.y).toFixed(1) : null,
      concept: this.offCall?.pass?.id ?? this.offCall?.concept?.id ?? null,
    };
    this.__int = true;
    if (outPath) appendFileSync(outPath, JSON.stringify(row) + '\n');
  }
  return possess0.call(this, a, how);
};
const tick0 = P.tick;
P.tick = function () {
  tick0.call(this);
  if (!this.__rel && this.ball?.kind === 'air' && this.ball.target && !compilingPlan()) {
    const T = this.ball.target, dir = this.attackDir('O'), d: Record<string, number> = {};
    for (const x of this.agents) if (x.team === 'D') d[x.slot] = +Math.hypot(x.pos.x - T.pos.x, x.pos.y - T.pos.y).toFixed(1);
    this.__rel = { T, t: this.t, depth: (T.pos.x - this.los) * dir, d };
  }
};
P.buildResult = function () {
  const r = res0.call(this);
  if (!compilingPlan() && !this.__counted) {
    this.__counted = true; out.plays++;
    if (this.__rel) out.throws++;
    if (this.__int) out.ints++;
    out.outcomes[r.outcome] = (out.outcomes[r.outcome] ?? 0) + 1;
  }
  return r;
};
void throw0;
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let i = 0; i < games; i++) simulateGame(home, away, { seed: seed + i });
console.log(JSON.stringify({ arm, seed, ...out }));
