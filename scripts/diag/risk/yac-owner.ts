// Who should have been there on short catches the defense reaches late or never (sim only; engine instrumentation).
// Catches 3-10 yd downfield of the line, from the 'secure' event (else 'catch'). The nearest defender at the catch is
// classed by his job just before it: his own man (ManCoverage on this receiver), man on someone else, zone underneath,
// deep (deep zone, or man with overTop / protectDepth), or other (rusher, blitzer, run fit). Per catch: when any
// defender first gets within 1.0 yd (by 1.0 s / later / never), YAC (carrier's final x minus x at the catch), and for
// the nearest defender over the first 1.0 s: distance at the catch, his speed, his velocity toward the catcher
// (closing), when his behavior becomes Pursuit, and (his own man only) whether he was carried past: downfield of the
// catcher at the catch and still moving downfield (vx > 1 yd/s) while the catcher was not.
// usage: npx tsx scripts/diag/risk/yac-owner.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
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
      if (Y.held) rows.push({ ...Y, yac: (Y.R.pos.x - Y.x0) * Y.dir, R: undefined, d: undefined, beh0: undefined, kinds: [...Y.kinds].join('>') });
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[], f = .5) => { const x = v.filter(n => n === n).sort((a, b) => a - b); return x.length ? x[Math.floor(f * (x.length - 1))] : NaN; };
const NFL: Record<string, number> = { 'settled:by 1.0 s': 0.84, 'settled:later': 4.98, 'settled:never': 1.97, 'moving:by 1.0 s': 2.35, 'moving:later': 8.36, 'moving:never': 5.82 };
for (const o of rows) { o.mode = o.rs < 2 ? 'settled' : 'moving'; o.when = o.reach === null ? 'never' : o.reach <= 1.0 ? 'by 1.0 s' : 'later'; o.excess = o.yac - NFL[`${o.mode}:${o.when}`]; }
console.log(`seed ${seed}, ${games} games: catches 3-10 yd n ${rows.length}`);
for (const mode of ['settled', 'moving']) {
  const v = rows.filter(o => o.mode === mode), lv = v.filter(o => o.when !== 'by 1.0 s');
  const tot = lv.reduce((s, o) => s + o.yac, 0);
  console.log(` ${mode}: n ${v.length}, reached later / never ${lv.length} (${(100 * lv.length / Math.max(1, v.length)).toFixed(0)}%), their YAC total ${tot.toFixed(0)} (all catches ${v.reduce((s, o) => s + o.yac, 0).toFixed(0)})`);
  for (const j of ['man: his own', 'man: other', 'zone underneath', 'deep', 'other']) {
    const w = lv.filter(o => o.job === j); if (!w.length) continue;
    const all = v.filter(o => o.job === j);
    const f = (k: number) => w.map(o => o.f.reduce((b: any, x: any) => Math.abs(x.t - k) < Math.abs(b.t - k) ? x : b, o.f[0] ?? {}));
    const f0 = f(0), f5 = f(0.5);
    console.log(`   ${j.padEnd(16)} nearest at the catch on ${all.length} catches (${(100 * all.length / v.length).toFixed(0)}%); late/never ${w.length} (${(100 * w.length / Math.max(1, all.length)).toFixed(0)}% of his) | YAC sum ${w.reduce((s, o) => s + o.yac, 0).toFixed(0)} (${(100 * w.reduce((s, o) => s + o.yac, 0) / Math.max(1, tot)).toFixed(0)}% of late/never YAC), excess vs NFL ${w.reduce((s, o) => s + o.excess, 0).toFixed(0)} yd`
      + ` | at the catch ${q(w.map(o => o.dd)).toFixed(1)} yd, his speed ${q(f0.map((x: any) => x.sp)).toFixed(1)}, closing ${q(f0.map((x: any) => x.closing)).toFixed(1)} -> at +0.5 s ${q(f5.map((x: any) => x.dist)).toFixed(1)} yd, closing ${q(f5.map((x: any) => x.closing)).toFixed(1)}`
      + ` | moving away from the catcher at the catch ${(100 * f0.filter((x: any) => x.closing < 0).length / w.length).toFixed(0)}%`
      + ` | behaviors seen ${JSON.stringify(w.reduce((m: any, o: any) => (m[o.kinds] = (m[o.kinds] ?? 0) + 1, m), {}))}`
      + ` | behavior changed at ${q(w.filter(o => o.pursuitAt !== null).map(o => o.pursuitAt)).toFixed(2)} s (never ${(100 * w.filter(o => o.pursuitAt === null).length / w.length).toFixed(0)}%)`
      + (j === 'man: his own' ? ` | carried past by his momentum ${(100 * w.filter(o => o.carried).length / w.length).toFixed(0)}% (vs ${(100 * v.filter(o => o.job === j && o.when === 'by 1.0 s' && o.carried).length / Math.max(1, v.filter(o => o.job === j && o.when === 'by 1.0 s').length)).toFixed(0)}% on plays reached by 1.0 s)` : ''));
  }
}
