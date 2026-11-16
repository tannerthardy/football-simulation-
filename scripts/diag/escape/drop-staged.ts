// [CONCEPT_DROPS=1] node --import tsx drop-staged.ts > rows.jsonl
// The same plays off and on: each concept the flag touches, against eight coverages, four rosters and six seeds, from
// gun doubles (or trips when the concept needs it). Same bodies, call and seed in both arms; only the drop differs.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
const CONCEPTS = 'smash mesh flood drive sail_corner corner_flat trips_sail trips_outs double_outs comebacks dagger y_cross four_verts verts_hitch stick curl_flat'.split(' ');
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
// (STAGED_FIVE_DEEP retired 2026-11-16: develop's 'five' is the deeper set under CONCEPT_DROPS.)
// STAGED_CONCEPTS=a,b: only these concepts, any in the playbook (to run the set in chunks, or play action).
const ONLY = (process.env.STAGED_CONCEPTS ?? '').split(',').filter(Boolean);
for (const concept of ONLY.length ? ONLY.filter((c) => PASS_BY_ID[c]) : CONCEPTS) for (const coverage of COVS) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) {
  // The first of these that builds: gun doubles, else trips (each row prints its formation). STAGED_FORM=<id> runs that
  // formation alone (Rules: verts_hitch's key needs a #3, so its trips cell is not the doubles one).
  for (const formation of process.env.STAGED_FORM ? [process.env.STAGED_FORM] : ['gun_doubles_11', 'gun_trips_11']) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
    let thr: any = null; const tb = sim.throwBall.bind(sim), dir = sim.attackDir(sim.offense[0].team);
    // Each defender at the snap: slot, position, and how wide of the ball he lined up (who made a sack, by where he came from).
    const snap = new Map<number, any>(sim.defense.map((d: any) => [d.idx, { slot: d.slot, pos: d.player.position, wide: +Math.abs(d.pos.y - sim.ballY).toFixed(1) }]));
    sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
      if (p === sim.qb && !thr) thr = { t: +sim.t.toFixed(2), away, route: target?.behavior?.route?.id ?? null, depth: target ? +((target.pos.x - sim.los) * dir).toFixed(1) : null, aim: intended ? +((intended.x - sim.los) * dir).toFixed(1) : null,
        qb: +((p.pos.x - sim.los) * dir).toFixed(1), rec: (() => { const r = p.behavior?.throwRec; return r ? { iR: +r.intRisk.toFixed(3), P: +r.P.toFixed(3), T: r.T !== undefined ? +r.T.toFixed(2) : null, decQb: r.at ? +((r.at.x - sim.los) * dir).toFixed(1) : null, aimD: r.aim ? +Math.hypot(r.aim.x - p.pos.x, r.aim.y - p.pos.y).toFixed(1) : null, decAimD: r.at && r.aim ? +Math.hypot(r.aim.x - r.at.x, r.aim.y - r.at.y).toFixed(1) : null } : null; })(), qbY: +((p.pos.y - sim.ballY) * ss).toFixed(2), readIdx: p.behavior?.readIdx ?? null, P: p.behavior?.throwRec?.P ?? null,
        sep: target ? +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - target.pos.x, d.pos.y - target.pos.y))).toFixed(1) : null };
      return tb(p, target, v0, intended, arrivalT, away, ...rest);
    };
    // His lateral position (toward the strong side positive) when he first sets, and each edge's distance from him then.
    const ss = sim.offAlign?.strongSign ?? 1; let atSet: any = null; const tick0 = sim.tick.bind(sim);
    sim.tick = () => { tick0(); const b: any = sim.qb.behavior; if (!atSet && b?.kind === 'qb-pass' && b.phase === 'set') {
      const e = (slot: string) => { const d = sim.defense.find((x: any) => x.slot === slot); return d ? +Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y).toFixed(1) : null; };
      atSet = { t: +sim.t.toFixed(2), y: +((sim.qb.pos.y - sim.ballY) * ss).toFixed(2), x: +((sim.qb.pos.x - sim.los) * dir).toFixed(1), deS: e('DE_S'), deW: e('DE_W'), rbY: (() => { const rb = sim.slot?.('RB'); return rb ? +((rb.pos.y - sim.ballY) * ss).toFixed(1) : null; })() }; } };
    let res: any; try { res = sim.run(); } catch (e: any) { console.error(String(e?.stack).slice(0, 400)); break; }
    const sk = sim.events.find((e: any) => e.type === 'sack'); const qbEnd = +((sim.qb.pos.x - sim.los) * dir).toFixed(1);
    console.log(JSON.stringify({ concept, drop: PASS_BY_ID[concept].drop, coverage, roster, seed, formation, thr, atSet, sack: sk ? { t: +sk.t.toFixed(2), qbY: +((sim.qb.pos.y - sim.ballY) * ss).toFixed(2), by: snap.get(sk.a)?.slot ?? null, pos: snap.get(sk.a)?.pos ?? null, wide: snap.get(sk.a)?.wide ?? null, qb: qbEnd } : null, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, sacked: !!res.stats.sacked, yards: res.yards ?? null, held: sim.events.filter((e: any) => e.type === 'throw_held').length, pumps: sim.events.filter((e: any) => e.type === 'pump').length }));
    break;
  }
}
