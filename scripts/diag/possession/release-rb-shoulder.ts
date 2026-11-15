// usage: npm run ref -- --flag RELEASE_BELIEF=1 -- npx tsx scripts/diag/possession/release-rb-shoulder.ts SEED GAMES
// RELEASE_BELIEF shoulder break: each defender's shoulder read (pick, when, bearing read) against the receiver the
// ball went to (diagnostic only): right / wrong by anticipation tercile; the bearing error at the choice (his read
// against the bearing from the passer to that receiver); and for wrong picks, whether another receiver was within 10 deg
// of the target's bearing (two close in bearing) or the passer's true facing was over 15 deg off the target at the
// choice (a look-off / not yet turned).
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { shoulderPickOf } from '../../../src/sim/behaviors/defense.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult;
const dif = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
const rows: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  this.__sb ??= new Map();
  for (const d of this.defense) {
    const p = shoulderPickOf(d);
    if (p && p.R !== undefined && !this.__sb.has(d.idx + ':' + p.at)) {
      const q = this.qb;
      this.__sb.set(d.idx + ':' + p.at, { p, ant: d.r('anticipation'), qpos: { ...q.pos }, qf: q.body.facing, role: d.slot + ':' + (d.behavior?.constructor?.name ?? ''),
        others: this.offense.filter((o: any) => o !== q).map((o: any) => ({ o, b: Math.atan2(o.pos.y - q.pos.y, o.pos.x - q.pos.x) })) });
    }
  }
  if (this.ball.kind === 'air' && !this.__tgt) { this.__tgt = this.ball.target; this.__rel = this.t; }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this);
  if (this.__sb && this.__tgt) {
    // the last pick per defender before the ball (the read the throw then confirms or not)
    const last = new Map<number, any>();
    for (const [k, v] of this.__sb) { const idx = Number(k.split(':')[0]); if (!last.has(idx) || last.get(idx).p.at < v.p.at) last.set(idx, v); }
    for (const [, v] of last) {
      if (!v.p.R) continue;
      const tb = v.others.find((x: any) => x.o === this.__tgt)?.b;
      if (tb === undefined) continue;
      const pb = v.others.find((x: any) => x.o === v.p.R)?.b;
      rows.push({ right: v.p.R === this.__tgt, ant: v.ant, err: v.p.read === null ? null : dif(v.p.read, tb),
        close: v.others.some((x: any) => x.o !== this.__tgt && dif(x.b, tb) < 10), look: dif(v.qf, tb) > 15,
        // detail for the 'neither' wrong picks: true facing vs target / vs pick, read vs true facing, target-pick gap,
        // time from the pick to the release, target and pick distance from the passer, defender's role
        qfT: dif(v.qf, tb), qfP: pb === undefined ? null : dif(v.qf, pb), rdF: dif(v.p.read, v.qf), dice: Math.abs(v.p.err * 180 / Math.PI), trk: dif(v.p.read - v.p.err, v.qf), sbT: v.p.seenBearing === null || pb === undefined ? null : dif(v.p.seenBearing, pb), gap: pb === undefined ? null : dif(pb, tb),
        lead: this.__rel === undefined ? null : +(this.__rel - v.p.at).toFixed(2),
        dT: Math.hypot(this.__tgt.pos.x - v.qpos.x, this.__tgt.pos.y - v.qpos.y).toFixed(1), role: v.role });
    }
  }
  this.__sb = undefined; this.__tgt = undefined; this.__rel = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const med = (v: number[]) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)].toFixed(0) : '-';
const R = rows, W = R.filter(r => !r.right);
console.log(`SB picks ${R.length}: right ${R.filter(r => r.right).length} (${(R.filter(r => r.right).length / R.length).toFixed(2)}) | bearing error at the choice median ${med(R.map(r => r.err).filter((x: any) => x !== null))} deg (right ${med(R.filter(r => r.right).map(r => r.err))}, wrong ${med(W.map(r => r.err))})`);
for (const [lo, hi, nm] of [[0, 0.4, 'anticipation low'], [0.4, 0.7, 'mid'], [0.7, 1.01, 'high']] as const) {
  const T = R.filter(r => r.ant >= lo && r.ant < hi); if (T.length) console.log(`SB   ${nm}: n ${T.length} right ${(T.filter(r => r.right).length / T.length).toFixed(2)}`);
}
console.log(`SB wrong ${W.length}: another receiver within 10 deg of the target ${W.filter(r => r.close).length}, passer's facing over 15 deg off the target ${W.filter(r => r.look).length}, neither ${W.filter(r => !r.close && !r.look).length}`);
if (process.env.SB_NEITHER) for (const r of W.filter(r => !r.close && !r.look).slice(0, Number(process.env.SB_NEITHER)))
  console.log(`SBN ant ${r.ant.toFixed(2)} role ${r.role} | facing off target ${r.qfT.toFixed(0)} off pick ${r.qfP?.toFixed(0)} | read off facing ${r.rdF.toFixed(0)} (draw ${r.dice.toFixed(0)}, tracked facing off true ${r.trk.toFixed(0)}) | pick's seen bearing off true ${r.sbT?.toFixed(0)} | pick-target gap ${r.gap?.toFixed(0)} | pick ${r.lead} s before release | target ${r.dT} yd`);
{ const N = W.filter(r => !r.close && !r.look), A = R;
  for (const [nm, T] of [['all', A], ['neither', N]] as const) console.log(`SBD ${nm} n ${T.length}: median draw ${med(T.map(r => r.dice))} deg, tracked facing off true ${med(T.map(r => r.trk))}, pick's seen bearing off true ${med(T.map(r => r.sbT).filter((x: any) => x !== null))}, release-time facing off target ${med(T.map(r => r.qfT))}`); }
