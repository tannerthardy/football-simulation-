// Where does the ball go, relative to where an underneath zone defender could drive on a held look? Sim only. Zone
// completions; underneath zone defenders (not deep zones) within 10 yd of the catch point at the catch whose seen QB
// look (seenQbEyes) is on the eventual catcher at the sample time. At -0.6 / -0.3 / 0 s before the release, distance
// from the actual catch point to: the current lane point (82% of the way from the QB to the receiver's seen spot);
// the receiver's seen spot projected along his seen velocity by H s (H = 0.5 / 1.0 / the true time to the catch);
// split by whether the receiver changes heading by more than 45 deg (at 1.5+ yd/s) between the sample and the catch.
// Prints a dozen sample plays per arm.
// usage: [QB_EYES=1] [EYES_HEAD=1] npx tsx scripts/diag/risk/lane-probe.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ZoneCoverage, seenQbEyes } from '../../../src/sim/behaviors/defense.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, rows: any[] = [];
const isUnder = (d: any) => { const z = (d.behavior as any)?.sub ?? d.behavior; return z instanceof ZoneCoverage && !(z as any).deep; };
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.defCall?.coverage?.man) return r;
  const S = this.__lp ?? (this.__lp = { hist: [] as any[], rel: null as any, done: false, rpath: [] as any[] });
  if (S.done) return r;
  if (this.ball.kind === 'held' && !S.rel) {
    const snap: any[] = [];
    for (const d of this.defense) if (isUnder(d)) snap.push({ d, seen: seenQbEyes(d, this), pos: { ...d.pos } });
    const offs = this.offense.map((o: any) => ({ o, pos: { ...o.pos }, vel: { ...o.vel } }));
    S.hist.push({ t: this.t, snap, qb: { ...this.qb.pos }, offs }); if (S.hist.length > 10) S.hist.shift();
  } else if (this.ball.kind === 'air' && !S.rel) S.rel = { t: this.t, target: this.ball.target, hist: S.hist.slice(), path: [] as any[] };
  if (S.rel && !S.done) S.rel.path.push({ t: this.t, pos: { ...S.rel.target?.pos }, vel: { ...S.rel.target?.vel } });
  if (S.rel && this.ball.kind === 'held' && this.ball.carrier && this.offense.includes(this.ball.carrier) && this.ball.carrier !== this.qb) {
    S.done = true; const R = this.ball.carrier; if (R !== S.rel.target) return r;
    const cp = { ...R.pos }, tc = this.t, H = S.rel.hist;
    for (const back of [6, 3, 0]) {
      const h = H[H.length - 1 - back]; if (!h) continue;
      const me = h.offs.find((x: any) => x.o === R); if (!me) continue;
      // Did he break between the sample and the catch? (pre-release history, then flight path)
      const after = [...H.slice(H.length - 1 - back).map((x: any) => x.offs.find((y: any) => y.o === R)), ...S.rel.path];
      let broke = false; const h0 = Math.atan2(me.vel.y, me.vel.x);
      for (const p of after) { const sp = Math.hypot(p.vel.x, p.vel.y); if (sp >= 1.5 && Math.abs(Math.atan2(Math.sin(Math.atan2(p.vel.y, p.vel.x) - h0), Math.cos(Math.atan2(p.vel.y, p.vel.x) - h0))) > Math.PI / 4) { broke = true; break; } }
      for (const s of h.snap) {
        if (s.seen !== R) continue;
        if (Math.hypot(s.d.pos.x - cp.x, s.d.pos.y - cp.y) > 10) continue;
        const lane = { x: h.qb.x + 0.82 * (me.pos.x - h.qb.x), y: h.qb.y + 0.82 * (me.pos.y - h.qb.y) };
        const proj = (H_: number) => ({ x: me.pos.x + me.vel.x * H_, y: me.pos.y + me.vel.y * H_ });
        const dd = (p: any) => Math.hypot(p.x - cp.x, p.y - cp.y);
        rows.push({ back: back / 10, broke, now: dd(me.pos), lane: dd(lane), p05: dd(proj(0.5)), p10: dd(proj(1.0)), ptrue: dd(proj(tc - h.t)), toCatch: tc - h.t, def: dd(s.pos), play: `${this.defCall?.coverage?.id} ${(R.behavior as any)?.route?.id ?? '?'} t ${h.t.toFixed(1)}` });
      }
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
console.log(`== seed ${seed}: underneath zone defenders reading the look on the eventual catcher; distance from the catch point to each candidate (p25/p50/p75 yd)`);
for (const back of [0.6, 0.3, 0]) for (const broke of [false, true]) {
  const V = rows.filter(r => Math.abs(r.back - back) < 1e-9 && r.broke === broke);
  console.log(`   ${back.toFixed(1)} s before the release, ${broke ? 'breaks after' : 'no break   '} n ${String(V.length).padStart(3)} | receiver now ${q(V.map(r => r.now))} | current lane ${q(V.map(r => r.lane))} | projected 0.5 s ${q(V.map(r => r.p05))} | 1.0 s ${q(V.map(r => r.p10))} | true time to catch (${q(V.map(r => r.toCatch))} s) ${q(V.map(r => r.ptrue))} | the defender himself ${q(V.map(r => r.def))}`);
}
console.log('   sample plays at -0.3 s:');
for (const r of rows.filter(r => Math.abs(r.back - 0.3) < 1e-9).slice(0, 12)) console.log(`     ${r.play.padEnd(28)} break ${r.broke ? 'y' : 'n'} | now ${r.now.toFixed(1)} lane ${r.lane.toFixed(1)} proj0.5 ${r.p05.toFixed(1)} proj1.0 ${r.p10.toFixed(1)} projTrue ${r.ptrue.toFixed(1)} (${r.toCatch.toFixed(2)} s) | defender ${r.def.toFixed(1)}`);
