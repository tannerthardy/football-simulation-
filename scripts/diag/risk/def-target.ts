// Three reads on the defense's honest picture of a throw (reads only).
// (1) Gap over time: the three defenders nearest the true catch spot at the catch, their distance to it at the release
//     + 0.25 / + 0.5 s and at the catch - 0.5 / - 0.25 / 0, by arm (run under BALL_EST=0 and the honest arm).
// (2) Target identification: when a defender first has two samples of the ball (BALL_EST), his own ball line (his
//     estimate's ground track over the next 0.3 s) against the receivers in his picture (sim.see): angle of each
//     receiver off the line from the ball's estimated position (ahead of it only); does the true target have the
//     smallest angle, and by what margin over the second; by role and by time since release.
// (3) What a defender with a settled flight is running at (bit 16384's commit), by flight third: cos of his velocity
//     to the true catch point, to the target as he sees him, to the ball's true ground position now, and his branch tag.
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/def-target.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { catchSpot } from '../../../src/sim/behaviors/receiver.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const P: any = PlaySim.prototype, tick0 = P.tick, ev0 = P.event, b0 = P.buildResult;
const gaps: any[] = [], ids: any[] = [], runs: any[] = [];
const ang = (v: number) => { let x = v; while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return Math.abs(x) * 180 / Math.PI; };
const cosTo = (d: any, p: { x: number; y: number }) => { const sp = Math.hypot(d.vel.x, d.vel.y), dx = p.x - d.pos.x, dy = p.y - d.pos.y, l = Math.hypot(dx, dy); return sp < 0.5 || l < 0.5 ? NaN : (d.vel.x * dx + d.vel.y * dy) / (sp * l); };
P.tick = function () {
  const r = tick0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  const S = (this.__dt ??= { pos: [] as any[], id: new Set<number>() });
  if (this.ball?.kind === 'air' && !this.ball.securing) {
    S.rel ??= this.t; S.target = this.ball.target;
    S.pos.push({ t: this.t, p: this.defense.map((d: any) => ({ x: d.pos.x, y: d.pos.y })) });
    const E = this.ballEstimates, tgt = this.ball.target, recv = this.offense.filter((o: any) => o !== this.qb && o.behavior?.kind !== 'block');
    const truePath = this.ballPath, end = truePath.length ? truePath[truePath.length - 1].t : this.t + 1, frac = Math.min(0.999, (this.t - S.rel) / Math.max(0.1, end - S.rel));
    for (const d of this.defense) {
      const n = E?.samplesOf?.(d) ?? 0;
      if (n >= 2 && !S.id.has(d.idx) && tgt) {
        S.id.add(d.idx);
        const path = E.peek(d, this), now = path.find((p: any) => p.t >= this.t - 1e-9), later = path.find((p: any) => p.t >= this.t + 0.3 - 1e-9) ?? path[path.length - 1];
        if (now && later && later !== now) {
          const line = Math.atan2(later.y - now.y, later.x - now.x);
          const offs = recv.map((o: any) => { const s = this.see(d, o).pos, ux = s.x - now.x, uy = s.y - now.y;
            return { o, off: Math.hypot(ux, uy) < 0.5 ? 0 : ang(Math.atan2(uy, ux) - line), ahead: ux * Math.cos(line) + uy * Math.sin(line) > -1 }; }).filter((x: any) => x.ahead).sort((a: any, b: any) => a.off - b.off);
          if (offs.length) ids.push({ role: d.behavior?.kind ?? '?', since: this.t - S.rel, hit: offs[0].o === tgt, off: offs.find((x: any) => x.o === tgt)?.off ?? 999, margin: offs.length > 1 ? offs[1].off - offs[0].off : 180 });
        }
      }
      if (d.tags?.has?.('onBall') && !d.tags.has('flight-unsettled')) {
        const tru = catchSpot(d, { t: this.t, ballPath: truePath }), bp = this.ball.flight.pos;
        if (tru) runs.push({ role: d.behavior?.kind ?? '?', third: Math.floor(frac * 3), cTrue: cosTo(d, tru.p), cTgt: tgt ? cosTo(d, this.see(d, tgt).pos) : NaN, cBall: cosTo(d, bp) });
      }
    }
  }
  return r;
};
P.event = function (type: string, a?: any, b?: any, note?: string) {
  const r = ev0.call(this, type, a, b, note);
  const S = this.__dt;
  if (type === 'catch' && S && S.catchT === undefined && a?.team === 'O') { S.catchT = this.t; S.spot = { x: a.pos.x, y: a.pos.y }; }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__dt;
  if (S?.catchT !== undefined && S.rel !== undefined && S.pos.length) {
    const at = (t: number) => S.pos.reduce((a: any, b: any) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
    const last = at(S.catchT), near = last.p.map((p: any, i: number) => ({ i, d: Math.hypot(p.x - S.spot.x, p.y - S.spot.y) })).sort((a: any, b: any) => a.d - b.d).slice(0, 3);
    const row: any = { flight: S.catchT - S.rel };
    for (const [k, t] of [['r25', S.rel + 0.25], ['r50', S.rel + 0.5], ['c50', S.catchT - 0.5], ['c25', S.catchT - 0.25], ['c0', S.catchT]] as const) {
      if (t < S.rel - 1e-9 || t > S.catchT + 1e-9) continue;
      const fr = at(t); row[k] = near.reduce((s: number, n: any) => s + Math.hypot(fr.p[n.i].x - S.spot.x, fr.p[n.i].y - S.spot.y), 0) / near.length;
    }
    gaps.push(row);
  }
  this.__dt = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[], d = 2) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(d)).join('/') : '-'; };
console.log(`BALL_EST=${process.env.BALL_EST ?? 0}: completions ${gaps.length}, flight ${q(gaps.map(g => g.flight))} s`);
console.log(`  (1) 3 nearest defenders' mean distance to the catch spot (yd, p25/50/75): rel+0.25 ${q(gaps.map(g => g.r25), 1)} | rel+0.5 ${q(gaps.map(g => g.r50), 1)} | catch-0.5 ${q(gaps.map(g => g.c50), 1)} | catch-0.25 ${q(gaps.map(g => g.c25), 1)} | catch ${q(gaps.map(g => g.c0), 1)}`);
if (ids.length) for (const role of ['zone', 'man', 'rush']) for (const [lo, hi] of [[0, 0.3], [0.3, 0.6], [0.6, 9]]) {
  const V = ids.filter(x => x.role === role && x.since >= lo && x.since < hi); if (!V.length) continue;
  console.log(`  (2) ${role.padEnd(4)} 2nd sample at ${lo}-${hi} s n ${String(V.length).padStart(4)} | line picks the target ${(100 * V.filter(x => x.hit).length / V.length).toFixed(0)}% | target off the line ${q(V.map(x => x.off), 0)} deg | margin when picked ${q(V.filter(x => x.hit).map(x => x.margin), 0)} deg`);
}
if (runs.length) for (const role of ['zone', 'man']) for (const th of [0, 1, 2]) {
  const V = runs.filter(x => x.role === role && x.third === th); if (!V.length) continue;
  console.log(`  (3) ${role.padEnd(4)} settled, third ${th} n ${String(V.length).padStart(5)} | cos to true catch pt ${q(V.map(x => x.cTrue))} | to target as seen ${q(V.map(x => x.cTgt))} | to the ball now ${q(V.map(x => x.cBall))}`);
}
