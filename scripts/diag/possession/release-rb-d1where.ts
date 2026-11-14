// usage: npm run ref -- --flag RELEASE_BELIEF=1 -- npx tsx scripts/diag/possession/release-rb-d1where.ts SEED GAMES
// Short completions: D1 (nearest defender at the catch). What he was steering on through the flight: the last time
// each of his controller tags fired (onBall = playing his acquired flight, shoulder-break, arm-bite, readArm), when he
// saw the ball, whether his shoulder pick was the catcher, his heading at the catch off the true catch point, and
// (when he holds a remembered flight) its end against the true catch point. Diagnostic only.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { releaseBelief } from '../../../src/sim/release-belief.js';
import { hasObservedFlight, rememberedFlight, flightLanded, catchOpportunity } from '../../../src/sim/possession-read.js';
import { shoulderPickOf } from '../../../src/sim/behaviors/defense.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult;
const TAGS = ['onBall', 'shoulder-break', 'arm-bite', 'readArm', 'catch-carry'];
const rows: any[] = [];
const dif = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
P.tick = function () {
  if (!this.__w && this.offCall?.kind === 'pass') {
    this.__w = true;
    for (const d of this.defense) {
      const s = d.tags, seen: Record<string, number> = {}, sim = this;
      d.__seen = seen;
      const add = s.add.bind(s);
      s.add = (k: string) => { if (TAGS.includes(k)) seen[k] = sim.t; return add(k); };
    }
  }
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  if (this.ball.kind === 'air') { this.__tgt = this.ball.target; this.__rel ??= this.t; }
  else if (this.__tgt && !this.__done && this.ball.kind === 'held' && this.ball.carrier === this.__tgt && this.ball.carrier.pos.x - this.los < 10) {
    this.__done = true;
    const c = this.ball.carrier, CP = { ...c.pos };
    const d = this.defense.reduce((m: any, x: any) => (!m || Math.hypot(x.pos.x - CP.x, x.pos.y - CP.y) < Math.hypot(m.pos.x - CP.x, m.pos.y - CP.y) ? x : m), null);
    const dist = Math.hypot(d.pos.x - CP.x, d.pos.y - CP.y), sp = Math.hypot(d.vel.x, d.vel.y);
    const rb = releaseBelief(this, d), pk = shoulderPickOf(d);
    const fl = hasObservedFlight(d) ? rememberedFlight(d, this.t) : null, end = fl?.at(-1);
    const age = (k: string) => d.__seen[k] === undefined ? null : +(this.t - d.__seen[k]).toFixed(2);
    rows.push({ dist, sp, head: sp > 1 ? dif(Math.atan2(d.vel.y, d.vel.x), Math.atan2(CP.y - d.pos.y, CP.x - d.pos.x)) : null,
      flight: this.t - this.__rel, ballAgo: rb.ballAt === undefined ? null : this.t - rb.ballAt, armAgo: rb.releasedAt === undefined ? null : this.t - rb.releasedAt,
      pick: pk ? (pk.R === c ? 'right' : pk.R ? 'wrong' : 'none') : '-', endOff: end ? Math.hypot(end.x - CP.x, end.y - CP.y) : null,
      landed: hasObservedFlight(d) && flightLanded(d, this.t), oppLead: catchOpportunity(d) ? +(this.t - catchOpportunity(d)!.t).toFixed(2) : null, oppRight: catchOpportunity(d) ? catchOpportunity(d)!.receiver === c : null, onBall: age('onBall'), sb: age('shoulder-break'), bite: age('arm-bite'), cls: d.behavior?.constructor?.name, slot: d.slot });
  }
  return r;
};
P.buildResult = function () { const res = b0.call(this); this.__w = this.__tgt = this.__done = this.__rel = undefined; return res; };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const med = (v: (number | null)[]) => { const w = v.filter((x): x is number => x !== null).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
const B = rows.filter(r => r.dist >= 2 && r.dist < 4);
const sh = (T: any[], f: (r: any) => boolean) => (T.filter(f).length / Math.max(1, T.length)).toFixed(2);
for (const [nm, T] of [['D1 2-4 all', B], ['D1 2-4 heading 30+ off', B.filter(r => r.head !== null && r.head > 30)], ['D1 2-4 heading under 30', B.filter(r => r.head !== null && r.head <= 30)]] as const) {
  console.log(`DW ${nm}: n ${T.length} heading ${med(T.map(r => r.head))} speed ${med(T.map(r => r.sp))} | saw ball ${sh(T, r => r.ballAgo !== null)} (ago ${med(T.map(r => r.ballAgo))} s of flight ${med(T.map(r => r.flight))}) | flight held ${sh(T, r => r.endOff !== null)} end off catch ${med(T.map(r => r.endOff))} yd`);
  console.log(`DW    last onBall ${sh(T, r => r.onBall !== null && r.onBall < 0.06)} at catch (ever ${sh(T, r => r.onBall !== null)}) | shoulder-break ever ${sh(T, r => r.sb !== null)} | arm-bite ever ${sh(T, r => r.bite !== null)} | pick right ${sh(T, r => r.pick === 'right')} wrong ${sh(T, r => r.pick === 'wrong')} | his flight landed by his estimate ${sh(T, r => r.landed)} (opportunity ${med(T.map(r => r.oppLead))} s before the catch; on the catcher ${sh(T, r => r.oppRight === true)}, none ${sh(T, r => r.oppLead === null)}) | onBall last fired ${med(T.map(r => r.onBall))} s before | classes ${[...new Set(T.map(r => r.cls))].map(c => c + ' ' + T.filter(r => r.cls === c).length).join(', ')}`);
}
