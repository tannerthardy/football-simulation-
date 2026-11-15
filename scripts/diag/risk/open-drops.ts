// Open incompletions (target 3+ yd from the nearest defender when the flight ends): did the ball ever reach his hands'
// envelope (closest approach of the true ball at catchable height within his reach), or not; how far it passed him and
// on which side of his run; his own samples by the end; his estimate's landing error; servo engaged. By flight band.
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/open-drops.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { shouldersOf } from '../../../src/physics/kinematics.js';
import { neckOf } from '../../../src/sim/ball-estimate.js';
const seed = Number(process.argv[2] ?? 23), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && this.__od === undefined && this.ball.target && !this.ball.throwaway) this.__od = { T: this.ball.target, rel: this.t, min: Infinity, servo: false, look: [], route: this.ball.target.behavior?.fallback?.route?.name ?? this.ball.target.behavior?.route?.name ?? this.ball.target.behavior?.kind ?? '?' };
  const S = this.__od;
  if (S && S.end === undefined) {
    const T = S.T, b = this.ball.flight?.pos;
    if (T.tags?.has?.('ball-servo')) S.servo = true;
    if (this.ball.kind === 'air' && b && Math.round((this.t - S.rel) / 0.1) === (this.t - S.rel) / 0.1 || (this.ball.kind === 'air' && b && Math.abs((this.t - S.rel) * 10 - Math.round((this.t - S.rel) * 10)) < 1e-6)) {
      const brg = Math.atan2(b.y - T.pos.y, b.x - T.pos.x), deg = (x: number) => Math.round(Math.abs((((brg - x) * 180 / Math.PI) % 360 + 540) % 360 - 180));
      const head = this.ballEstimates?.headOf?.(T) ?? T.head ?? T.facing, n = this.ballEstimates?.samplesOf?.(T) ?? 0, inEye = n > (S.lastN ?? 0);
      S.lastN = n; S.ticks = (S.ticks ?? 0) + 1; if (inEye) S.eyeTicks = (S.eyeTicks ?? 0) + 1;
      if (!inEye && (S.firstLost === undefined) && n > 0) S.firstLost = this.t - S.rel;
      S.look.push(`${(this.t - S.rel).toFixed(1)}:h${deg(head)}/b${deg(T.facing)}${inEye ? '+' : '-'}`);
    }
    if (this.ball.kind === 'air' && b && this.ballEstimates?.gazeAt) {
      const d = (u: number) => Math.round((((u * 180 / Math.PI) % 360) + 540) % 360 - 180);
      const brg = Math.atan2(b.y - T.pos.y, b.x - T.pos.x), g = this.ballEstimates.gazeAt(T, this), gz = Math.atan2(g.y - T.pos.y, g.x - T.pos.x);
      const head = this.ballEstimates.headOf(T) ?? T.facing, sh = shouldersOf(T.body);
      (S.fine ??= []).push({ t: this.t - S.rel, s: `ball-h ${d(brg - head)} gaze-ball ${d(gz - brg)} h-shoulders ${d(head - sh)}/${Math.round(neckOf(T) * 180 / Math.PI)} sh-hips ${d(sh - T.facing)} r ${Math.hypot(b.x - T.pos.x, b.y - T.pos.y).toFixed(1)} beh ${T.behavior?.kind}` });
    }
    if (S.first === undefined && this.ballEstimates?.firstSeenAt?.(T) !== undefined) S.first = this.ballEstimates.firstSeenAt(T) - S.rel;
    if (S.armSeen === undefined) S.armSeen = this.ballEstimates?.lookedAtRelease?.(T, this) ?? null;
    if (this.ball.kind === 'air' && b && b.z >= 0.1 && b.z <= T.profile.maxCatchHeight) {
      const dx = b.x - T.pos.x, dy = b.y - T.pos.y, d = Math.hypot(dx, dy);
      if (d < S.min) { const sp = Math.hypot(T.vel.x, T.vel.y) || 1; S.min = d; S.along = (dx * T.vel.x + dy * T.vel.y) / sp; S.across = (-dx * T.vel.y + dy * T.vel.x) / sp; S.spd = sp; S.n = this.ballEstimates?.samplesOf?.(T) ?? null; S.reach = T.profile.reach + 0.3; }
    }
    if (this.ball.kind !== 'air' || this.ball.securing) {
      let sep = Infinity; for (const d of this.defense) sep = Math.min(sep, Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y));
      S.end = this.t; S.sep = sep; S.flight = this.t - S.rel;
    }
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__od;
  if (S && S.end !== undefined) rows.push({ flight: S.flight, sep: S.sep, min: S.min, along: S.along, across: S.across, reach: S.reach, n: S.n, servo: S.servo, fine: S.fine, first: S.first, eyeShare: S.ticks ? (S.eyeTicks ?? 0) / S.ticks : 0, firstLost: S.firstLost, armSeen: S.armSeen, look: S.look, route: S.route, cmp: !!this.stats?.completed, ev: this.events.filter((e: any) => ['catch', 'incomplete', 'pbu', 'interception', 'drop', 'deflection'].includes(e.type)).map((e: any) => e.type).join(',') });
  this.__od = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const med = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)].toFixed(2) : '-'; };
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0} DIR_CAP=${process.env.DIR_CAP ?? 0}`);
for (const [a, b] of [[0, 0.9], [0.9, 1.3], [1.3, 1.8], [1.8, 9]]) {
  const O = rows.filter(r => r.sep >= 3 && r.flight >= a && r.flight < b), miss = O.filter(r => !r.cmp);
  const noOpp = miss.filter(r => r.min > r.reach), opp = miss.filter(r => r.min <= r.reach);
  console.log(`  flight ${a}-${b} s: open n ${O.length}, caught ${O.length - miss.length} | not caught: never in reach ${noOpp.length} (passed him p50 ${med(noOpp.map(r => r.min))} yd, along ${med(noOpp.map(r => r.along))} / |across| ${med(noOpp.map(r => Math.abs(r.across)))}, samples ${med(noOpp.map(r => r.n))}, servo ${noOpp.filter(r => r.servo).length}) | in reach, not caught ${opp.length} (${[...new Set(opp.map(r => r.ev))].slice(0, 4).join(' / ')})`);
}
if (process.env.OD_DUMP) for (const [a, b] of [[0.9, 1.3], [1.3, 1.8]]) {
  console.log(`-- open misses never in reach, flight ${a}-${b} s (first 12): flight | passed | along/across | first sample | saw arm | look (s: h = ball off his head, b = off his hips, + = sampled in this 0.1 s)`);
  for (const r of rows.filter(r => r.sep >= 3 && !r.cmp && r.min > r.reach && r.flight >= a && r.flight < b).slice(0, 12))
    console.log(`   ${r.flight.toFixed(2)} ${r.route} | ${r.min.toFixed(1)} | ${r.along?.toFixed(1)}/${r.across?.toFixed(1)} | ${r.first?.toFixed(2) ?? '-'} | ${r.armSeen} | ${r.look.join(' ')}`);
}
console.log('-- open targets, first sample (s after release) and closest pass (yd), caught / not caught');
for (const [a, b] of [[0, 0.9], [0.9, 1.3], [1.3, 1.8]]) {
  const O = rows.filter(r => r.sep >= 3 && r.flight >= a && r.flight < b);
  const f = (V: any[]) => `n ${V.length} share of 0.1 s marks in his eyes ${med(V.map(r => r.eyeShare))} first lost ${med(V.map(r => r.firstLost))} first ${med(V.map(r => r.first))} (none ${V.filter(r => r.first === undefined).length}) left-at-first ${med(V.filter(r => r.first !== undefined).map(r => r.flight - r.first))} closest ${med(V.map(r => r.min))} samples ${med(V.map(r => r.n))}`;
  console.log(`   ${a}-${b} s | caught: ${f(O.filter(r => r.cmp))} | not: ${f(O.filter(r => !r.cmp))}`);
}
if (process.env.OD_FINE) for (const r of rows.filter(r => r.sep >= 3 && !r.cmp && r.min > r.reach && r.flight >= 1.3 && r.flight < 1.8 && r.first !== undefined).slice(0, 5)) {
  console.log(`== miss, flight ${r.flight.toFixed(2)}: last 0.6 s`);
  for (const q of (r.fine ?? []).filter((q: any) => q.t >= r.flight - 0.6)) console.log(`   ${q.t.toFixed(2)} ${q.s}`);
}
