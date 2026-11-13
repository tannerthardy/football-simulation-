// Tight slot/wing WRs next to a pass rusher (nearest defender within 2.5 yd at the snap is a PassRusher), in games.
// For each pair: was the rusher in his path at the snap (ahead 0-2.5 yd and laterally within the release clearance,
// true positions), was the release-around (handleRelease) commanding him, the rusher's lateral motion toward the
// receiver's line in 0.2-0.6 s, and whether the pair stalls (press_stall.py definition) or touches by 1.0 s.
// usage: RELEASE_SEEN=0|1 npx tsx scripts/diag/risk/edge-stall.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
const seed = Number(process.argv[2] ?? 23), games = Number(process.argv[3] ?? 6);
const RR: any = RouteRunner.prototype, hr0 = RR.handleRelease;
RR.handleRelease = function (a: any, sim: any) { const c = hr0.call(this, a, sim); this.__rel = !!c; return c; };
const P: any = PlaySim.prototype, tick0 = P.tick;
const rows: any[] = [];
P.tick = function () {
  if (this.__es === undefined) {
    this.__es = null;
    if (this.offense.some((o: any) => o.behavior instanceof RouteRunner)) {
      const pairs = [];
      for (const o of this.offense.filter((x: any) => x.player?.position === 'WR' && x.behavior instanceof RouteRunner)) {
        const d = this.defense.reduce((b: any, x: any) => Math.hypot(x.pos.x - o.pos.x, x.pos.y - o.pos.y) < Math.hypot(b.pos.x - o.pos.x, b.pos.y - o.pos.y) ? x : b);
        if (Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y) > 2.5 || d.behavior?.constructor?.name !== 'PassRusher') continue;
        const clearance = o.profile.radius + d.profile.radius + 0.2 + d.player.measurables.armIn / 36 * 0.7;
        pairs.push({ o, d, ahead0: d.pos.x - o.pos.x, lat0: d.pos.y - o.pos.y, clearance, f: [] as any[] });
      }
      this.__es = { pairs, t0: this.t };
    }
  }
  const r = tick0.call(this);
  const S = this.__es;
  if (S && !S.done) {
    const t = this.t - S.t0;
    for (const p of S.pairs) { const { o, d } = p;
      p.f.push({ t, behind: d.pos.x > o.pos.x, dist: Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y), sp: Math.hypot(o.vel.x, o.vel.y),
        rel: !!o.behavior.__rel, lat: d.pos.y - o.pos.y, dvy: d.vel.y, ovy: o.vel.y, touch: Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= o.profile.radius + d.profile.radius + 0.15 }); }
    if (t > 1.2 || this.phase !== 'live') {
      S.done = true;
      for (const p of S.pairs) { const f = p.f, k2 = Math.round(0.2 / this.dt); let stall = false;
        for (let k = 0; k + k2 < f.length; k++) { const a = f[k]; if (a.t >= 0.1 && a.t <= 0.9 && a.behind && a.dist <= 1.5 && a.sp < 4 && f[k + k2].sp <= a.sp + 0.1) stall = true; }
        const mid = f.filter((a: any) => a.t >= 0.2 && a.t <= 0.6);
        // rusher's lateral speed toward the receiver's line (+ = closing laterally), mean over 0.2-0.6 s
        const toward = mid.length ? mid.reduce((s: number, a: any) => s + (-Math.sign(a.lat || 1)) * (a.dvy - a.ovy), 0) / mid.length : 0;
        rows.push({ stall, inPath: p.ahead0 >= 0 && p.ahead0 <= 2.5 && Math.abs(p.lat0) <= p.clearance + 0.1, lat0: Math.abs(p.lat0), clearance: p.clearance,
          relShare: f.filter((a: any) => a.t <= 0.9).filter((a: any) => a.rel).length / Math.max(1, f.filter((a: any) => a.t <= 0.9).length),
          toward, touch: f.some((a: any) => a.t <= 1.0 && a.touch), route: o_route(p.o) }); }
    }
  }
  return r;
};
function o_route(o: any) { return o.behavior?.route?.id ?? '?'; }
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { const x = [...v].sort((a, b) => a - b); return x.length ? x[Math.floor((x.length - 1) / 2)].toFixed(2) : '-'; };
const pct = (n: number, d: number) => (100 * n / Math.max(1, d)).toFixed(0) + '%';
console.log(`RELEASE_SEEN=${process.env.RELEASE_SEEN ?? '0'} WR next to a rusher: ${rows.length} pairs, stalled ${pct(rows.filter(r => r.stall).length, rows.length)}, touched by 1.0 s ${pct(rows.filter(r => r.touch).length, rows.length)}`);
for (const [lab, v] of [['stalled', rows.filter(r => r.stall)], ['clean', rows.filter(r => !r.stall)]] as const)
  console.log(`  ${lab.padEnd(8)} n ${v.length} | rusher in his path at the snap ${pct(v.filter(r => r.inPath).length, v.length)} (lateral p50 ${q(v.map(r => r.lat0))} vs clearance ${q(v.map(r => r.clearance))}) | release-around commanding him ${q(v.map(r => r.relShare))} of 0-0.9 s | rusher closing laterally p50 ${q(v.map(r => r.toward))} yd/s`);
