// [flags] node --import tsx scripts/diag/eyes/release-align.ts > rows.jsonl
// Integration / the user (2026-11-17): at the release, how far off the target line his body is. One row per QB throw on
// staged dropbacks: his trunk facing off the target line at the decision (startThrow) and at the release (deg), his
// velocity's direction off the target line and his speed at the release (his stride: there is no foot in the
// production body, so his motion stands for it), the windup's length, the release error (yd), the flight time against
// the minimum for the distance (the ball's pace), and the result. Passive.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const DEG = 180 / Math.PI, off = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * DEG;
const CONCEPTS = 'smash mesh flood drive dagger y_cross stick curl_flat four_verts trips_outs'.split(' ');
for (const concept of CONCEPTS) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
  let dec: any = null, row: any = null, hooked = false;
  const tick0 = sim.tick.bind(sim);
  sim.tick = () => { tick0(); const b: any = sim.qb.behavior; if (b?.kind === 'qb-pass' && b.lookOff && !b.lookOffSeen) { b.lookOffSeen = true; b.lookOffDecoy = b.lookOff.decoy?.slot ?? null; }
    if (!hooked && b?.kind === 'qb-pass') { hooked = true; const st0 = b.startThrow.bind(b);
    b.startThrow = (a: any, s: any, ev: any) => { const r = st0(a, s, ev); if (b.phase === 'windup' && !dec && ev?.point) dec = { t: s.t, off: off(a.body.facing, Math.atan2(ev.point.y - a.pos.y, ev.point.x - a.pos.x)), head: a.head }; return r; }; } };
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
    if (p === sim.qb && !row && !away && intended) {
      const b: any = p.behavior, line = Math.atan2(intended.y - p.pos.y, intended.x - p.pos.x), sp = Math.hypot(p.vel.x, p.vel.y);
      const aim = b.releaseRec?.aim, dist = Math.hypot(intended.x - p.pos.x, intended.y - p.pos.y);
      row = { concept, coverage, roster, seed, t: +sim.t.toFixed(2), windup: dec ? +(sim.t - dec.t).toFixed(2) : null, decOff: dec ? +dec.off.toFixed(0) : null,
        relOff: +off(p.body.facing, line).toFixed(0), velOff: sp > 0.3 ? +off(Math.atan2(p.vel.y, p.vel.x), line).toFixed(0) : null, speed: +sp.toFixed(1),
        headOff: p.head !== null && p.head !== undefined ? +off(p.head, line).toFixed(0) : null, dist: +dist.toFixed(1), flick: +(b.flick ?? 0).toFixed(2),
        err: aim ? +Math.hypot(aim.x - intended.x, aim.y - intended.y).toFixed(2) : null, T: +(arrivalT - sim.t).toFixed(2),
        align: b.alignRec ?? null, lookOff: !!b.lookOffSeen, target: target?.slot ?? null, decoy: b.lookOffDecoy ?? null };
    }
    return tb(p, target, v0, intended, arrivalT, away, ...rest);
  };
  let res: any; try { res = sim.run(); } catch { continue; }
  if (row) console.log(JSON.stringify({ ...row, cmp: !!res.stats?.completed, int: !!res.stats?.interceptedBy, sacked: !!res.stats?.sacked }));
}
