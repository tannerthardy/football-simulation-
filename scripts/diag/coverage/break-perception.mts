// Audit (Integration, 2026-11-24): at the tick each FLIGHT_BREAK break begins, what could the defender perceive? Per entry:
// the call site (flightBreakOf().via), his coverage kind, whether the receiver is the throw's target, the time from the true
// release, his body facing relative to the passer and to the ball (true positions: this is the auditor's view, not his),
// whether each was inside +-100 deg of his facing, his release belief (source, releasedAt, ballAt) and the time from his cue
// to the break, and whether the play ended in an interception by him. Read-only. Tools' game set.
//   node --import tsx scripts/diag/coverage/break-perception.mts <seed> <games> <out.jsonl>
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';
import { flightBreakOf } from '../../../src/sim/behaviors/defense.js';
import { lastReleaseBelief } from '../../../src/sim/release-belief.js';
import { appendFileSync } from 'node:fs';

const seed = Number(process.argv[2] ?? 23), games = Number(process.argv[3] ?? 1), outPath = process.argv[4] ?? 'out/diag/coverage/break-perception.jsonl';
const P: any = PlaySim.prototype, tick0 = P.tick, possess0 = P.possess;
const off = (facing: number, from: { x: number; y: number }, to: { x: number; y: number }) =>
  Math.abs(((Math.atan2(to.y - from.y, to.x - from.x) - facing) * 180 / Math.PI + 540) % 360 - 180);
P.tick = function () {
  tick0.call(this);
  if (compilingPlan()) return;
  if (this.__rel === undefined && this.ball?.kind === 'air' && this.ball.target) this.__rel = { t: this.t, target: this.ball.target };
  if (this.ball?.kind === 'air') { (this.__fl ??= []).push({ t: this.t, x: this.ball.flight.pos.x, y: this.ball.flight.pos.y });
    this.__flightAt ??= (t: number) => { let best: any = null; for (const q of this.__fl) if (!best || Math.abs(q.t - t) < Math.abs(best.t - t)) best = q; return best && Math.abs(best.t - t) < 0.06 ? best : null; }; }
  this.__rows ??= [];
  this.__seen ??= new Map();
  for (const a of this.agents) {
    if (a.team === this.qb?.team) continue;
    const fb = flightBreakOf(a);
    if (!fb) continue;
    const key = `${a.idx}:${fb.since}`; // each new break (a new since) once
    if (this.__seen.has(key)) continue;
    this.__seen.set(key, true);
    const rb = lastReleaseBelief(this, a), ball = this.ballPos?.() ?? null, qb = this.qb.pos;
    const cue = rb?.ballAt ?? rb?.releasedAt;
    this.__rows.push({
      seed, slot: a.slot, kind: a.behavior?.kind ?? '?', zone: (a.behavior as any)?.zone ?? null, via: fb.via,
      onTarget: this.__rel ? fb.receiver === this.__rel.target : null, ballKind: this.ball?.kind,
      tRel: this.__rel ? +(fb.since - this.__rel.t).toFixed(2) : null,
      liveHeadBody: a.head === null || a.head === undefined ? null : +(Math.abs(Math.atan2(Math.sin(a.head - a.body.facing), Math.cos(a.head - a.body.facing))) * 180 / Math.PI).toFixed(0),
      qbOffLiveHead: a.head === null || a.head === undefined ? null : +off(a.head, a.pos, qb).toFixed(0),
      qbOff: +off(a.body.facing, a.pos, qb).toFixed(0), ballOff: ball ? +off(a.body.facing, a.pos, ball).toFixed(0) : null,
      qbInView: off(a.body.facing, a.pos, qb) <= 100, ballInView: ball ? off(a.body.facing, a.pos, ball) <= 100 : null,
      src: rb?.source ?? null, released: rb?.releasedAt ?? null, ballAt: rb?.ballAt ?? null,
      cueToBreak: cue !== undefined && cue !== null ? +(fb.since - cue).toFixed(2) : null, readArm: a.tags.has('readArm'),
      ...(() => { // his recorded head at the cue's sample time: the passer's and ball's bearing off it, and the head's offset from his body
        if (cue === undefined || cue === null) return {};
        const back = Math.max(0, Math.round((this.t - cue) / this.dt)), ro = this.perception.recorded(a.idx, back * this.dt);
        const head = this.perception.perceive(a.idx, back * this.dt).head, qr = this.perception.recorded(this.qb.idx, back * this.dt);
        if (!ro || head === null || head === undefined) return { cueHead: null };
        const d = (x: number) => +(Math.abs(Math.atan2(Math.sin(x), Math.cos(x))) * 180 / Math.PI).toFixed(0);
        const bp = this.__flightAt?.(cue);
        return { cueHead: true, headBody: d(head - ro.facing), qbOffHead: qr ? d(Math.atan2(qr.pos.y - ro.pos.y, qr.pos.x - ro.pos.x) - head) : null,
          ballOffHead: bp ? d(Math.atan2(bp.y - ro.pos.y, bp.x - ro.pos.x) - head) : null };
      })(),
    });
  }
};
P.possess = function (a: any, how: string) {
  if (how === 'interception' && !compilingPlan()) this.__int = a.slot;
  return possess0.call(this, a, how);
};
const res0 = P.buildResult;
P.buildResult = function () {
  const r = res0.call(this);
  if (!compilingPlan() && !this.__done) {
    this.__done = true;
    for (const row of this.__rows ?? []) appendFileSync(outPath, JSON.stringify({ ...row, intBy: this.__int === row.slot }) + '\n');
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let i = 0; i < games; i++) simulateGame(home, away, { seed: seed + i });
console.log('done', seed);
