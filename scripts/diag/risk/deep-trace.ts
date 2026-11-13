// The covered deep ball, tick by tick (sim only; diagnosis). Deep targets (route go / seam / seam_read / post / fade)
// whose nearest defender is within 2 yd at the release. From the release to the ball's end, every 0.1 s: that
// defender's distance to the target and to the landing point (where the ball comes down at catch height on the true
// path), his speed and its component toward the landing point, his body facing off the ball and off the target,
// whether he has seen the throw (sawThrow), acquired the flight, is tagged looking / onBall, and his technique label;
// the target's distance to the landing point. Ends with the ball events and the outcome. Prints the first N plays
// that end in a catch, then a summary over all of them.
// usage: npx tsx scripts/diag/risk/deep-trace.ts SEED GAMES [N]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { sawThrow } from '../../../src/sim/behaviors/defense.js';
import { hasObservedFlight } from '../../../src/sim/possession-read.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8), N = Number(process.argv[4] ?? 12);
const DEEP = ['go', 'seam', 'seam_read', 'post', 'fade'];
const P: any = PlaySim.prototype, t0 = P.tick, ev0 = P.event, plays: any[] = [];
const ang = (x: number) => Math.abs(Math.atan2(Math.sin(x), Math.cos(x))) * 57.3;
P.event = function (type: string, a: any, b: any, note?: string) { if (this.__dt) this.__dt.events.push(`${type}@${this.t.toFixed(2)}${a?.slot ? ':' + a.slot : ''}`); return ev0.call(this, type, a, b, note); };
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  if (this.ball.kind === 'air' && this.__dt === undefined) {
    this.__dt = null;
    const T = this.ball.target, rid = (T?.behavior as any)?.route?.id ?? (T?.behavior as any)?.fallback?.route?.id;
    if (T && DEEP.includes(rid)) {
      const d = [...this.defense].sort((a: any, b: any) => Math.hypot(a.pos.x - T.pos.x, a.pos.y - T.pos.y) - Math.hypot(b.pos.x - T.pos.x, b.pos.y - T.pos.y))[0];
      const sep = Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y);
      const land = [...this.ballPath].find((s: any) => s.t > this.t && s.z < 2.2) ?? this.ballPath.at(-1);
      if (sep < 2 && land) this.__dt = { T, d, rid, sep, land, t0: this.t, rows: [] as any[], events: [] as string[], call: this.defCall?.coverage?.id, man: !!this.defCall?.coverage?.man, next: this.t };
    }
  }
  const S = this.__dt;
  if (S && !S.done && this.t >= S.next - 1e-9) {
    S.next += 0.1;
    const { d, T, land } = S, cmd = this.cmds?.[d.idx];
    const toLand = Math.atan2(land.y - d.pos.y, land.x - d.pos.x), sp = Math.hypot(d.vel.x, d.vel.y);
    const ballDir = this.ball.kind === 'air' ? Math.atan2(this.ball.flight.pos.y - d.pos.y, this.ball.flight.pos.x - d.pos.x) : NaN;
    S.rows.push({ t: this.t - S.t0, dT: Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y), dL: Math.hypot(d.pos.x - land.x, d.pos.y - land.y), rL: Math.hypot(T.pos.x - land.x, T.pos.y - land.y),
      sp, toward: (d.vel.x * Math.cos(toLand) + d.vel.y * Math.sin(toLand)), fBall: Number.isFinite(ballDir) ? ang(d.body.facing - ballDir) : NaN, fT: ang(d.body.facing - Math.atan2(T.pos.y - d.pos.y, T.pos.x - d.pos.x)),
      saw: this.ball.kind === 'air' && sawThrow(d, this, null), acq: hasObservedFlight(d), look: d.tags?.has('looking'), onBall: d.tags?.has('onBall'), lab: cmd ? facingTechnique(cmd)?.label ?? '-' : '-',
      req: cmd ? (cmd.vel.x * Math.cos(toLand) + cmd.vel.y * Math.sin(toLand)) : NaN });
    if (this.ball.kind !== 'air') { S.done = true; S.end = this.ball.kind; S.carrier = this.ball.carrier?.slot ?? null; S.caught = this.ball.kind === 'held' && this.ball.carrier === T; plays.push(S); }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const C = plays.filter(p => p.caught);
console.log(`== seed ${seed}: deep targets covered at the release (< 2 yd): n ${plays.length}, caught ${C.length} (${(100 * C.length / Math.max(1, plays.length)).toFixed(0)}%)`);
for (const p of C.slice(0, N)) {
  console.log(`-- ${p.call}${p.man ? ' (man)' : ''} ${p.rid} | defender ${p.d.slot} ${p.d.player?.position} sep ${p.sep.toFixed(1)} yd at the release | events ${p.events.join(' ')}`);
  for (const w of p.rows.filter((_: any, i: number) => i % 2 === 0 || i === p.rows.length - 1)) console.log(`   +${w.t.toFixed(1)} s | def to rcv ${w.dT.toFixed(1)} | def to land ${w.dL.toFixed(1)} rcv to land ${w.rL.toFixed(1)} | speed ${w.sp.toFixed(1)}, toward land ${w.toward.toFixed(1)} (req ${Number.isFinite(w.req) ? w.req.toFixed(1) : '-'}) | facing off ball ${Number.isFinite(w.fBall) ? w.fBall.toFixed(0) : '-'} off rcv ${w.fT.toFixed(0)} | saw ${w.saw ? 'Y' : 'n'} acq ${w.acq ? 'Y' : 'n'} look ${w.look ? 'Y' : 'n'} onBall ${w.onBall ? 'Y' : 'n'} | ${w.lab}`);
}
const at = (p: any, f: number) => p.rows[Math.min(p.rows.length - 1, Math.floor(f * (p.rows.length - 1)))];
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 3 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
for (const [lab, V] of [['caught', C], ['not caught', plays.filter(p => !p.caught)]] as const) {
  if (!V.length) continue;
  console.log(`== ${lab} n ${V.length}: def to landing at the release ${q(V.map((p: any) => p.rows[0].dL))} -> at the end ${q(V.map((p: any) => p.rows.at(-1).dL))} | rcv to landing at the end ${q(V.map((p: any) => p.rows.at(-1).rL))} | def to rcv at the end ${q(V.map((p: any) => p.rows.at(-1).dT))} | saw the throw by ${q(V.map((p: any) => (p.rows.find((w: any) => w.saw)?.t ?? NaN)))} s | acquired flight on ${(100 * V.filter((p: any) => p.rows.some((w: any) => w.acq)).length / V.length).toFixed(0)}% | looking at the end ${(100 * V.filter((p: any) => p.rows.at(-1).look).length / V.length).toFixed(0)}% | speed toward land mid-flight ${q(V.map((p: any) => at(p, 0.5).toward))} (requested ${q(V.map((p: any) => at(p, 0.5).req))})`);
}
