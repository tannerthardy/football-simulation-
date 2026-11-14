// usage: npm run ref -- --flag RELEASE_BELIEF=1 -- npx tsx scripts/diag/possession/release-rb-aftercatch.ts SEED GAMES
// After a short completion: each defender within 15 yd of the catcher at the catch, by his release belief (ball seen /
// arm only / none) and whether he holds an observed flight: his speed toward the catcher at +0.5 and +1.0 s and the
// share of them still closing under 1 yd/s at +1.0 s (diagnostic only; reads cached per-tick beliefs, no dice).
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { releaseBelief } from '../../../src/sim/release-belief.js';
import { hasObservedFlight } from '../../../src/sim/possession-read.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult;
const rows: any[] = [], plays: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  if (this.ball.kind === 'air') this.__air = { tgt: this.ball.target, dist: this.ball.target ? Math.hypot(this.ball.target.pos.x - this.qb.pos.x, 0) : 0 };
  else if (this.__air && !this.__c && this.ball.kind === 'held' && this.ball.carrier === this.__air.tgt && this.ball.carrier.pos.x - this.los < 10) {
    const c = this.ball.carrier;
    this.__c = { c, t: this.t, x0: c.pos.x, done: false, reached: false, ds: this.defense.filter((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 15).map((d: any) => {
      const rb = releaseBelief(this, d);
      const ba = releaseBelief(this, d).ballAt; return { d, lead: ba === undefined ? null : this.t - ba, D1: false, dist: Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y), zone: d.behavior?.constructor?.name === 'ZoneCoverage', arm: d.tags.has('readArm') || d.tags.has('arm-bite'), src: rb.ballAt !== undefined ? 'ball' : rb.releasedAt !== undefined ? 'arm' : 'none', fl: hasObservedFlight(d), v: [] as number[] };
    }) };
    const n = this.__c.ds.reduce((m: any, x: any) => (!m || x.dist < m.dist ? x : m), null); if (n) n.D1 = true;
  }
  if (this.__c && !this.__c.done) {
    const c0 = this.__c.c, gain = c0.pos.x - this.__c.x0;
    if (this.defense.some((d: any) => Math.hypot(d.pos.x - c0.pos.x, d.pos.y - c0.pos.y) < 1)) { this.__c.done = true; this.__c.reached = true; }
    else if (gain > 5 || this.ball.kind !== 'held' || this.ball.carrier !== c0) this.__c.done = true;
  }
  if (this.__c) {
    const dt = this.t - this.__c.t, c = this.__c.c;
    for (const at of [0.5, 1.0]) if (Math.abs(dt - at) < 0.026) for (const x of this.__c.ds) {
      const dx = c.pos.x - x.d.pos.x, dy = c.pos.y - x.d.pos.y, n = Math.hypot(dx, dy) || 1;
      x.v.push((x.d.vel.x * dx + x.d.vel.y * dy) / n);
    }
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this);
  if (this.__c) { for (const x of this.__c.ds) if (x.v.length === 2) rows.push(x); plays.push({ reached: this.__c.reached, d1: this.__c.ds.find((x: any) => x.D1) }); }
  this.__c = undefined; this.__air = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const med = (v: number[]) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)].toFixed(1) : '-';
for (const src of ['ball', 'arm', 'none']) for (const fl of [true, false]) {
  const T = rows.filter(r => r.src === src && r.fl === fl); if (!T.length) continue;
  console.log(`AC ${src} flight ${fl ? 'y' : 'n'}: n ${T.length} toward catcher +0.5 ${med(T.map(r => r.v[0]))} +1.0 ${med(T.map(r => r.v[1]))} yd/s | under 1 yd/s at +1.0 ${(T.filter(r => r.v[1] < 1).length / T.length).toFixed(2)}`);
}
for (const [nm, f] of [['D1 all', (r: any) => r.D1], ['D1 zone', (r: any) => r.D1 && r.zone], ['D1 not zone', (r: any) => r.D1 && !r.zone], ['D1 arm-keyed', (r: any) => r.D1 && r.arm], ['D1 not arm-keyed', (r: any) => r.D1 && !r.arm]] as const) {
  const T = rows.filter(f); if (T.length) console.log(`AC ${nm}: n ${T.length} dist at catch ${med(T.map((r: any) => r.dist))} toward catcher +0.5 ${med(T.map((r: any) => r.v[0]))} +1.0 ${med(T.map((r: any) => r.v[1]))}`);
}
{ const Q = plays.filter(p => p.d1), nr = (T: any[]) => T.length ? (T.filter(p => !p.reached).length / T.length).toFixed(2) : '-';
  console.log(`NR plays ${Q.length} never reached ${nr(Q)}`);
  for (const [nm, f] of [['D1 zone', (p: any) => p.d1.zone], ['D1 not zone', (p: any) => !p.d1.zone], ['D1 arm-keyed', (p: any) => p.d1.arm], ['D1 not arm-keyed', (p: any) => !p.d1.arm],
    ['D1 dist<2', (p: any) => p.d1.dist < 2], ['D1 dist 2-4', (p: any) => p.d1.dist >= 2 && p.d1.dist < 4], ['D1 dist 4+', (p: any) => p.d1.dist >= 4],
    ['D1 saw ball <0.3 s before catch', (p: any) => p.d1.lead !== null && p.d1.lead < 0.3], ['D1 saw ball 0.3+ s', (p: any) => p.d1.lead !== null && p.d1.lead >= 0.3], ['D1 never saw ball', (p: any) => p.d1.src !== 'ball']] as const) {
    const T = Q.filter(f); console.log(`NR   ${nm}: n ${T.length} (${(T.length / Q.length).toFixed(2)}) never reached ${nr(T)}`);
  } }
