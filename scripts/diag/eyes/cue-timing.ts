// QB lane 2026-11-24: when engine defenders believe the throw is coming (release-belief.ts: loadingAt, releasedAt, ballAt),
// against the passer's windup start and his release, for the defenders within 10 yd of the catch point who reach it by
// the ball's arrival (and those who do not). Measurement only. League games on HEAD_FOLLOW + FLIGHT_BREAK.
//   node --import tsx scripts/diag/eyes/cue-timing.ts <seed> <games>
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { releaseBelief } from '../../../src/sim/release-belief.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
PlaySim.prototype.run = ((orig) => function (this: any) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let dec: number | null = null, rel: any = null, hooked = false; const first: Record<number, any> = {}; const track: Record<number, any[]> = {};
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    const b: any = sim.qb.behavior;
    if (!hooked && b?.kind === 'qb-pass') {
      hooked = true; const st = b.startThrow.bind(b); b.startThrow = (a: any, s: any, ev: any) => { if (dec === null) dec = s.t; return st(a, s, ev); };
      const tb = sim.throwBall.bind(sim);
      sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, ...rest: any[]) => { if (p === sim.qb && !rel && target && intended) rel = { t: sim.t, pt: { x: intended.x, y: intended.y }, arr: arrivalT }; return tb(p, target, v0, intended, arrivalT, ...rest); };
    }
    t0();
    if (dec === null) return;
    for (const d of sim.defense) {
      const rb = releaseBelief(sim, d), f = (first[d.idx] ??= {});
      if (rb.loadingAt !== undefined && f.load === undefined) f.load = sim.t;
      if (rb.releasedAt !== undefined && f.rel === undefined) { f.rel = sim.t; f.relAt = rb.releasedAt; }
      if (rb.ballAt !== undefined && f.ball === undefined) f.ball = sim.t;
      (track[d.idx] ??= []).push([sim.t, d.pos.x, d.pos.y, d.vel.x, d.vel.y]);
    }
  };
  const res = orig.apply(this);
  if (dec !== null && rel) {
    const out = sim.defense.map((d: any) => {
      const tr = track[d.idx] ?? [], s0 = tr[0]; if (!s0) return null;
      const dist = Math.hypot(s0[1] - rel.pt.x, s0[2] - rel.pt.y); if (dist > 10) return null;
      const reachAt = tr.find((s) => Math.hypot(s[1] - rel.pt.x, s[2] - rel.pt.y) <= d.profile.reach + 0.3);
      const leave = tr.find((s) => { const ux = rel.pt.x - s[1], uy = rel.pt.y - s[2], L = Math.hypot(ux, uy) || 1, sp = Math.hypot(s[3], s[4]), vt = (s[3] * ux + s[4] * uy) / L; return vt >= 1.5 && sp > 0 && vt / sp >= 0.7; });
      const f = first[d.idx] ?? {}, d0 = dec as number, rr = (x: number | undefined) => x === undefined ? null : +(x - d0).toFixed(2);
      return { slot: d.slot, kind: d.behavior?.kind ?? null, dist: +dist.toFixed(1), arrived: !!reachAt && reachAt[0] <= rel.arr + 0.1,
        loadSeen: rr(f.load), relSeen: rr(f.rel), relBelieved: rr(f.relAt), ballSeen: rr(f.ball), leave: rr(leave?.[0]) };
    }).filter(Boolean);
    console.log(JSON.stringify({ dec: Number((dec as number).toFixed(2)), release: Number(((rel.t as number) - (dec as number)).toFixed(2)), defs: out }));
  }
  return res;
})(PlaySim.prototype.run);
for (let g = 0; g < games; g++) { const s = seed + g, rng = new Rng(s); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 }); simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); }
