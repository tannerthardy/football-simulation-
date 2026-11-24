// QB lane 2026-11-24 (QB_V2 bring-up, the user's "start simple" set): staged plays of a quick concept against the coverage
// where its answer is plain, and the control that takes it away. One mid-rated passer. Run once with QB_V2 unset (the
// old controller) and once with QB_V2=1 on the same cells. Per play: the release (from the snap), the target and its
// release minus break (10 Hz track: stop = under half peak speed after the peak; others = sharpest turn > 25 deg), the
// result; with V2, every 0.05 s from the plant until the throw: read, look resolution against his need, his bar, and
// each candidate's judged P / risk, so the stage that held the ball is read off the trace.
//   QB_V2=1 node --import tsx scripts/diag/qbv2/stage.ts quick_outs cover3 1-12 > rows.jsonl
import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';

const [concept, coverage, seedArg = '1-8', formation = 'gun_doubles_11'] = process.argv.slice(2);
const [s0, s1] = seedArg.split('-').map(Number);
/** The taught version Rules' plan is authored on (CONCEPT_TAUGHT is not on develop yet). */
const TAUGHT: Record<string, { back?: string }> = { slant_flat: { back: 'check' }, quick_outs: { back: 'back_flat' } };
// PASSER=<n> (the rating panel): every passing rating at n (mind and arm: the mental ratings, pocket presence, accuracy,
// release); EXP=<n> his experience. Body ratings stay the roster's. Default: the mid passer (mental 60, experience 4).
const PN = process.env.PASSER ? Number(process.env.PASSER) : null;
const MID: Record<string, number> = PN === null ? { playRecognition: 60, decisionMaking: 60, awareness: 60, composure: 60, discipline: 60, anticipation: 60, consistency: 60 }
  : Object.fromEntries(['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency', 'pocketPresence', 'accShort', 'accMid', 'accDeep', 'release'].map((k) => [k, PN]));
const EXP = process.env.EXP ? Number(process.env.EXP) : 4;
const r2 = (x: number) => Math.round(x * 100) / 100;
type S = [number, number, number, number, number];
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
function breakAt(P: S[], stop: boolean): number | null {
  if (P.length < 8) return null;
  const sp = P.map((s) => Math.hypot(s[3], s[4]));
  if (stop) { let kp = 3; for (let k = 3; k < P.length; k++) if (sp[k] > sp[kp]) kp = k; for (let k = kp + 1; k < P.length; k++) if (sp[k] < 0.5 * sp[kp]) return P[k][0]; return null; }
  let best = 0, kb = -1;
  for (let k = 3; k < P.length - 2; k++) { if (sp[k - 2] < 2 || sp[k + 2] < 2) continue; const d = Math.abs(wrap(Math.atan2(P[k + 2][4], P[k + 2][3]) - Math.atan2(P[k - 2][4], P[k - 2][3]))); if (d > best) { best = d; kb = k; } }
  return kb >= 0 && best > 25 * Math.PI / 180 ? P[kb][0] : null;
}
/** Where a judged defender is when the ball leaves (truth, measurement only): to the catch point, to the ball's line from
 * the passer, and whether his body faces the passer (within 60 deg), so the plays-the-ball share can be split by them. */
function atPass(sim: any, q: any, pt: any, d: any) {
  if (!pt) return {};
  const ax = pt.x - q.pos.x, ay = pt.y - q.pos.y, L2 = ax * ax + ay * ay, u = Math.max(0, Math.min(1, ((d.pos.x - q.pos.x) * ax + (d.pos.y - q.pos.y) * ay) / L2));
  const toQ = Math.atan2(q.pos.y - d.pos.y, q.pos.x - d.pos.x), f = d.facing ?? Math.atan2(d.vel.y, d.vel.x);
  return { dPt: r2(Math.hypot(d.pos.x - pt.x, d.pos.y - pt.y)), dLine: r2(Math.hypot(d.pos.x - q.pos.x - u * ax, d.pos.y - q.pos.y - u * ay)), alongU: r2(u),
    faces: Math.abs(wrap(f - toQ)) < Math.PI / 3, spd: r2(Math.hypot(d.vel.x, d.vel.y)) };
}
for (let seed = s0; seed <= s1; seed++) {
  const setup: any = nativeTraceSetup({ concept, coverage, seed, roster: 3, formation, flip: false });
  const t = process.env.NO_TAUGHT === "1" ? undefined : TAUGHT[concept]; if (t) setup.offCall.pass = { ...PASS_BY_ID[concept], ...t };
  const qbP = setup.offense.QB; for (const [k, v] of Object.entries(MID)) qbP.ratings[k] = v; qbP.experience = EXP;
  const sim: any = new PlaySim(setup);
  let thrown: any = null, qbb: any = null, lastT = -1; const fbk: Record<number, any> = {}; let decAim: any = null; const trace: any[] = []; const tr: Record<number, S[]> = {};
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, target: any, v0: any, intended: any, arrivalT: number, ...rest: any[]) => {
    if (q === sim.qb && !thrown) {
      thrown = { t: sim.t, slot: target?.slot ?? null, idx: target?.idx ?? null, away: !target, pt: intended ? { x: intended.x, y: intended.y } : null, arr: arrivalT,
        dist: r2(Math.hypot((intended?.x ?? q.pos.x) - q.pos.x, (intended?.y ?? q.pos.y) - q.pos.y)), qbSpeed: r2(Math.hypot(q.vel.x, q.vel.y)), qbDepth: r2(sim.los - q.pos.x),
        rid: target?.behavior?.route?.id ?? null, plannedBreak: target?.behavior?.breakTime != null ? r2(target.behavior.breakTime) : null, depthAtThrow: target ? r2(target.pos.x - sim.los) : null };
      const ref = target ? Object.entries(sim.offAlign.numbering).find(([, sl]) => sl === target.slot)?.[0] : null;
      const v2 = qbb?.v2;
      if (v2 && ref) { const j = v2.judgedFor(ref); thrown.belief = j ? { P: r2(j.P), risk: r2(j.risk) } : null; thrown.roles = (v2.lastRoles.get(ref) ?? []).map((x: any) => ({ id: x.id, role: x.role, pA: r2(x.pArrive), pPick: r2(x.pPick), ...atPass(sim, q, intended, sim.agents[x.id]) })); }
    }
    return tb(q, target, v0, intended, arrivalT, ...rest);
  };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0();
    const b = sim.qb.behavior; if (b?.kind === 'qb-pass' && typeof b.throwAway === 'function') qbb = b;
    if (sim.t - lastT >= 0.099) { lastT = sim.t; for (const a of sim.offense) (tr[a.idx] ??= []).push([sim.t, a.pos.x, a.pos.y, a.vel.x, a.vel.y]); }
    // Where the ball comes to the receiver: the first tick the ball is within 2.5 yd of him, or at the planned arrival.
    if (thrown && !thrown.at && thrown.idx != null && sim.ball?.kind === 'air') {
      const bp = sim.ball.flight.pos, rc = sim.agents[thrown.idx].pos, d = Math.hypot(bp.x - rc.x, bp.y - rc.y);
      if (d <= 1.2 || sim.t >= thrown.arr - 1e-6) thrown.at = { miss: r2(d), z: r2(bp.z), dx: r2(bp.x - rc.x), dy: r2(bp.y - rc.y) };
    }
    // The miss split (Integration, 2026-11-24): at the ball's planned arrival, the ball against the point he aimed at (his
    // release error) and the receiver against that point (the target moving after the aim).
    if (thrown?.pt && !thrown.split && sim.ball?.kind === 'air' && sim.t >= thrown.arr - 1e-6 && thrown.idx != null) {
      const bp = sim.ball.flight.pos, rc = sim.agents[thrown.idx].pos, pt = thrown.pt;
      thrown.split = { ballVsAim: r2(Math.hypot(bp.x - pt.x, bp.y - pt.y)), recvVsAim: r2(Math.hypot(rc.x - pt.x, rc.y - pt.y)), ballVsRecv: r2(Math.hypot(bp.x - rc.x, bp.y - rc.y)), z: r2(bp.z) };
    }
    // Calibration: did each judged defender get within his reach + 0.5 of the throw's point by the ball's arrival?
    if (thrown?.roles && thrown.pt && sim.t <= thrown.arr + 1e-6) for (const r of thrown.roles) { const d = sim.agents[r.id]; if (Math.hypot(d.pos.x - thrown.pt.x, d.pos.y - thrown.pt.y) <= d.profile.reach + 0.5) r.arrived = true; }
    const v2 = qbb?.v2, h = qbb?.v2h;
    if (v2 && h && !decAim && v2.cycle.state === 'throw') {
      const ref = v2.cycle.decision?.intent?.judged?.option?.ref, rr = ref ? v2.target(h, ref) : null, m = rr ? h.mechanics(rr, h.felt) : null;
      decAim = m ? { x: m.point.x, y: m.point.y, t: sim.t } : { t: sim.t };
    }
    // The passer's forecast of each receiver's break, first taken at the secure and at 1.0 s from the snap (absolute times).
    if (h && !thrown) for (const r of sim.offense) { if (r.behavior?.kind !== 'route') continue; const fb = (fbk[r.idx] ??= {}); const b = h.breakAt(r);
      if (fb.atSecure === undefined && sim.t >= h.snapAt) fb.atSecure = b == null ? null : r2(b);
      if (fb.at1 === undefined && sim.t >= 1.0) { fb.at1 = b == null ? null : r2(b); const tt = h.timingAt ? h.timingAt(r) : null; fb.turn1 = tt == null ? null : r2(tt); } }
    if (v2 && h && !thrown && sim.t >= h.plantAt - 1e-6 && Math.round(sim.t * 20) % 1 === 0 && trace.length < 60) {
      const c = v2.cycle, look = c.looks.current, r = c.plan.reads[c.readIdx];
      trace.push({ t: r2(sim.t - h.snapAt), read: c.readIdx, st: c.state, look: look ? (look.kind === 'receiver' ? look.ref : look.role) : null,
        res: look ? r2(c.looks.resolved(look)) : null, need: r2(h.need), bar: r2(h.bar.P), risk: r2(h.bar.risk), press: c.pressure,
        opts: r ? r.throws.map((o: any) => { const j = v2.judgedFor(o.ref); const rc = v2.target(h, o.ref), bk = rc ? h.breakAt(rc) : null; return j ? `${o.ref}:${r2(j.P)}/${r2(j.risk)}${j.early ? ' early' : ''}${bk != null ? ' bk' + r2(bk) : ''}` : `${o.ref}:-`; }) : [] });
    }
    if (sim.t > 6) sim.phase = 'dead';
  };
  try { sim.run(); } catch (e) { process.stderr.write(String((e as Error).message).slice(0, 200) + '\n'); }
  const snap = qbb?.snapAt ?? 0;
  let relBrk: number | null = null; let brk: any = null;
  if (thrown?.idx != null) {
    const rid = String(thrown.rid ?? '');
    const P = (tr[thrown.idx] ?? []).filter((s) => s[0] <= thrown.t + 1.2);
    const b = breakAt(P, /hitch|stick|curl|hook|comeback/.test(rid)); if (b !== null) relBrk = r2(thrown.t - b);
    // Integration's audit: where the receiver is at the break timed, from the snap (sim.t 0) and his own start.
    if (b !== null) { const k = P.findIndex((x) => x[0] >= b - 1e-6), p0 = (tr[thrown.idx] ?? [])[0]; if (k >= 0 && p0) brk = { t: r2(b), depth: r2((P[k][1] - sim.los) * (sim.offDir ?? 1)), fromStart: r2(Math.hypot(P[k][1] - p0[1], P[k][2] - p0[2])) }; }
  }
  const ev = sim.events as any[];
  console.log(JSON.stringify({ concept, coverage, seed, v2: !!qbb?.v2, rel: thrown ? r2(thrown.t - snap) : null, rel0: thrown ? r2(thrown.t) : null, secured: r2(snap), plant0: qbb?.v2h ? r2(qbb.v2h.plantAt) : null, brk, slot: thrown?.slot ?? null, away: thrown?.away ?? null,
    route: thrown?.rid ?? null, fcBreak: thrown?.idx != null ? fbk[thrown.idx] ?? null : null, plannedBreak: thrown?.plannedBreak ?? null, depthAtThrow: thrown?.depthAtThrow ?? null, relBrk,
    complete: !!sim.stats.completed, int: ev.some((e) => e.type === 'interception'), sack: ev.some((e) => e.type === 'sack'),
    pre: qbb?.v2?.presnap ? { flip: qbb.v2.presnap.flip, start: qbb.v2.presnap.startRead, look: qbb.v2.presnap.look ? { shell: qbb.v2.presnap.look.shell, over: Object.fromEntries(Object.entries(qbb.v2.presnap.look.over ?? {}).map(([k, v]: any) => [k, v ? { cushion: v.cushion, press: v.press, lev: v.leverage } : null])) } : null } : null,
    ball: thrown?.at ?? null, split: thrown?.split ? { ...thrown.split, reaim: decAim?.x != null && thrown.pt ? r2(Math.hypot(decAim.x - thrown.pt.x, decAim.y - thrown.pt.y)) : null, decToRel: decAim ? r2(thrown.t - decAim.t) : null } : null, dist: thrown?.dist ?? null, qbDepth: thrown?.qbDepth ?? null, qbSpeed: thrown?.qbSpeed ?? null,
    catchEv: [...new Set(ev.filter((e) => thrown && e.t >= thrown.t && ['catch', 'drop', 'miss', 'pbu', 'deflection', 'interception', 'incomplete', 'secure'].includes(e.type)).map((e) => `${e.type}:${sim.agents[e.a]?.team === sim.qb.team ? 'O' : 'D'}${sim.agents[e.a]?.slot ?? ''}`))],
    belief: thrown?.belief ?? null, roles: (thrown?.roles ?? []).map((r: any) => ({ ...r, arrived: !!r.arrived || ev.some((e) => ['pbu', 'deflection', 'interception'].includes(e.type) && e.a === r.id), slot: sim.agents[r.id].slot, picked: ev.some((e) => e.type === 'interception' && e.a === r.id), played: ev.some((e) => ['pbu', 'deflection', 'interception'].includes(e.type) && e.a === r.id) })),
    intents: qbb?.v2Intents ?? null, trace,
    // TRACK=1 (Rules' operator check): the targeted receiver's 10 Hz track from the snap, [t, x past the line, y], with
    // the line and the ball's side (y), to the throw + 1.2 s.
    ...(process.env.TRACK === '1' && thrown?.idx != null ? { los: r2(sim.los), ballY: r2(sim.ballY), track: (tr[thrown.idx] ?? []).filter((x) => x[0] <= thrown.t + 1.2).map((x) => [r2(x[0]), r2(x[1] - sim.los), r2(x[2])]) } : {}) }));
}
