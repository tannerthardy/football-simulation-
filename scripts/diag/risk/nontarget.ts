// Gate row: completions caught by a teammate other than the thrown-to target (target = whom the QB meant), per arm,
// with whether the catcher held a ball estimate (BALL_EST) or had been tracking (onBall) when he caught it.
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/nontarget.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult;
let comps = 0; const other: any[] = []; const dplays: any[] = [];
// Defender ball plays (interceptions, pass breakups, deflections) by whether he had sampled the flight himself.
const e0 = P.event;
P.event = function (type: string, a: any, ...rest: any[]) {
  if (a && a.team === 'D' && (type === 'interception' || type === 'pbu' || type === 'deflection')) {
    const tr = this.ballEstimates?.tracks?.get?.(a);
    dplays.push({ type, seen: !!this.ballEstimates?.lastSeen?.(a), passive: !!(tr && !tr.deliberate && tr.passiveAt !== undefined), legacyFacing: (() => { const v = this.ball.kind === 'air' ? this.ball.flight.vel : null; if (!v) return undefined; const sp = Math.hypot(v.x, v.y) || 1; return Math.cos(a.body.facing) * (-v.x / sp) + Math.sin(a.body.facing) * (-v.y / sp) > -0.35; })() });
  }
  return e0.call(this, type, a, ...rest);
};
P.tick = function () {
  const air = this.ball.kind === 'air' ? this.ball : null;
  if (air && this.offCall?.kind === 'pass' && !air.throwaway) this.__nt = { T: air.target, est: new Map() };
  const S = this.__nt;
  const r = t0.call(this);
  if (S && !S.C && this.ball.kind === 'held' && this.ball.carrier !== this.qb && this.offense.includes(this.ball.carrier)) {
    const C = this.ball.carrier; S.C = C; S.hadEst = !!this.ballEstimates?.lastSeen?.(C); S.onBall = C.tags?.has?.('onBall'); const tr = this.ballEstimates?.tracks?.get?.(C); S.passive = !!(tr && !tr.deliberate && tr.passiveAt !== undefined);
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__nt; this.__nt = undefined;
  if (S?.C && this.stats?.completed) { comps++; if (S.C !== S.T) other.push({ slot: S.C.slot, target: S.T?.slot, hadEst: S.hadEst, onBall: S.onBall, passive: S.passive, deflected: !!this.events.find((e: any) => e.type === 'deflection' || e.type === 'pbu') }); }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
for (const ty of ['interception', 'pbu', 'deflection']) { const V = dplays.filter(d => d.type === ty); console.log(`   defender ${ty}: ${V.length} | had sampled the flight ${V.filter(d => d.seen).length} (of them by passive sight ${V.filter(d => d.passive).length}) | body facing the ball (legacy cone) ${V.filter(d => d.legacyFacing).length}`); }
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: completions ${comps}, caught by a non-target ${other.length} (${(100 * other.length / Math.max(1, comps)).toFixed(1)}%) | of them with a ball estimate ${other.filter(o => o.hadEst).length} (by passive sight ${other.filter(o => o.passive).length}), tracking (onBall) ${other.filter(o => o.onBall).length}, after a deflection or breakup ${other.filter(o => o.deflected).length} | ${other.map(o => `${o.slot}<-${o.target}`).join(' ')}`);
