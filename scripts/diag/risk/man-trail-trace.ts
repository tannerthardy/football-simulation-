// Who should have been there on short catches the defense reaches late or never (sim only; engine instrumentation).
// Catches 3-10 yd downfield of the line, from the 'secure' event (else 'catch'). The nearest defender at the catch is
// classed by his job just before it: his own man (ManCoverage on this receiver), man on someone else, zone underneath,
// deep (deep zone, or man with overTop / protectDepth), or other (rusher, blitzer, run fit). Per catch: when any
// defender first gets within 1.0 yd (by 1.0 s / later / never), YAC (carrier's final x minus x at the catch), and for
// the nearest defender over the first 1.0 s: distance at the catch, his speed, his velocity toward the catcher
// (closing), when his behavior becomes Pursuit, and (his own man only) whether he was carried past: downfield of the
// catcher at the catch and still moving downfield (vx > 1 yd/s) while the catcher was not.
// usage: npx tsx scripts/diag/risk/man-trail-trace.ts [seed] [games]
// MAN-TRAIL TRACE variant: the nearest defender's own decision-trace kinds over the first 1.0 s after the catch, for
// catches whose nearest defender is his own man defender, with the time each kind first and last applies.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ReplayTrace } from '../../../src/sim/telemetry.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, tick0 = P.tick, ev0 = P.event;
const rows: any[] = [];
function job(d: any, R: any): string {
  const b = d.behavior;
  if (!b) return 'other';
  if (b.kind === 'man') {
    if (b.opts?.overTop || b.opts?.protectDepth) return 'deep';
    return b.target === R ? 'man: his own' : 'man: other';
  }
  if (b.kind === 'zone') return b.deep ? 'deep' : 'zone underneath';
  return 'other';
}
P.event = function (type: string, a: any, b: any, note?: string) {
  if ((type === 'secure' || type === 'catch') && a && a.team !== undefined && !this.__yo) {
    const R = a, dir = this.attackDir(R.team), depth = (R.pos.x - this.los) * dir;
    if (depth >= 3 && depth <= 10) {
      const D = this.defense.filter((d: any) => !d.isDown?.(this.t));
      const near = D.reduce((m: any, d: any) => Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y) < Math.hypot(m.pos.x - R.pos.x, m.pos.y - R.pos.y) ? d : m);
      const dd = Math.hypot(near.pos.x - R.pos.x, near.pos.y - R.pos.y);
      const along = (near.pos.x - R.pos.x) * dir;
      this.__yo = { R, d: near, dir, t0: this.t, x0: R.pos.x, job: job(near, R), dd, rs: Math.hypot(R.vel.x, R.vel.y),
        carried: job(near, R) === 'man: his own' && along > 0.3 && near.vel.x * dir > 1 && R.vel.x * dir < 1,
        reach: null as number | null, pursuitAt: null as number | null, kind0: near.behavior?.kind, beh0: near.behavior, kinds: new Set<string>(), f: [] as any[] };
    }
  }
  return ev0.call(this, type, a, b, note);
};
P.tick = function () {
  if (!this.__tr) { this.__tr = true; (this as any).trace = new ReplayTrace('standard', 1, true); }
  const r = tick0.call(this);
  const Y = this.__yo;
  if (Y && !Y.done) {
    const t = this.t - Y.t0, carrier = this.ball.kind === 'held' ? this.ball.carrier : Y.R;
    if (this.ball.kind === 'held' && this.ball.carrier === Y.R) Y.held = true;
    if (Y.reach === null && this.defense.some((d: any) => Math.hypot(d.pos.x - carrier.pos.x, d.pos.y - carrier.pos.y) <= 1.0)) Y.reach = t;
    if (Y.pursuitAt === null && Y.d.behavior !== Y.beh0) Y.pursuitAt = t;
    Y.kinds.add(String(Y.d.behavior?.kind));
    if (t <= 1.0) {
      const rx = carrier.pos.x - Y.d.pos.x, ry = carrier.pos.y - Y.d.pos.y, L = Math.hypot(rx, ry) || 1;
      Y.f.push({ t, dist: L, sp: Math.hypot(Y.d.vel.x, Y.d.vel.y), closing: ((Y.d.vel.x - carrier.vel.x) * rx + (Y.d.vel.y - carrier.vel.y) * ry) / L });
    }
    const lost = (this.ball.kind === 'held' && this.ball.carrier !== Y.R) || (Y.held && this.ball.kind !== 'held') || (!Y.held && t > 0.8);
    if (this.phase !== 'live' || lost) {
      Y.done = true;
      const decs = (this.trace.data?.decisions ?? []).filter((x: any) => x.a === Y.d.idx && x.t >= Y.t0 - 0.05 && x.t <= Y.t0 + 1.0);
      Y.decs = decs.map((x: any) => ({ t: +(x.t - Y.t0).toFixed(2), kind: x.kind }));
      if (Y.held) rows.push({ ...Y, yac: (Y.R.pos.x - Y.x0) * Y.dir, R: undefined, d: undefined, beh0: undefined, kinds: [...Y.kinds].join('>') });
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[], f = .5) => { const x = v.filter(n => n === n).sort((a, b) => a - b); return x.length ? x[Math.floor(f * (x.length - 1))] : NaN; };
const own = rows.filter(o => o.job === 'man: his own');
console.log(`seed ${seed}: catches 3-10 yd n ${rows.length}; his own man defender nearest on ${own.length}`);
for (const mode of ['settled', 'moving']) {
  const v = own.filter(o => (o.rs < 2 ? 'settled' : 'moving') === mode);
  const stats: Record<string, { n: number; first: number[]; last: number[] }> = {};
  for (const o of v) { const seen = new Map<string, { f: number; l: number }>();
    for (const d of o.decs) { const s = seen.get(d.kind); if (!s) seen.set(d.kind, { f: d.t, l: d.t }); else s.l = d.t; }
    for (const [k, s] of seen) { const e = (stats[k] ??= { n: 0, first: [], last: [] }); e.n++; e.first.push(s.f); e.last.push(s.l); } }
  console.log(` ${mode}: n ${v.length}; no decision recorded in the first 1.0 s ${v.filter(o => !o.decs.length).length}`);
  for (const [k, e] of Object.entries(stats).sort((a, b) => b[1].n - a[1].n))
    console.log(`   ${k.padEnd(26)} on ${e.n} catches | first at p50 ${q(e.first).toFixed(2)} s, last at p50 ${q(e.last).toFixed(2)} s (p90 ${q(e.last, .9).toFixed(2)})`);
  const pp = v.map(o => o.decs.find((d: any) => d.kind === 'possession-pursuit')?.t ?? null);
  console.log(`   chase ('possession-pursuit') starts p50 ${q(pp.filter((x: any) => x !== null) as number[]).toFixed(2)} s after the catch; not within 1.0 s on ${pp.filter((x: any) => x === null).length}/${v.length}`);
}
