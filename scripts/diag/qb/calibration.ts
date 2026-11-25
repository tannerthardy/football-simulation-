// QB harness (Tools, 2026-11-24; Integration's plan docs/reviews/2026-11-24-qb-decision-plan.md section 3 module D and section 4): the calibration operator.
// Measurement only: a read-only tap on the passer's throw decision (QBPass.startThrow) and on the play's outcome. No RNG draw, no behaviour change.
//
// At the first throw decision of each pass play it records what he BELIEVED (ThrowEval: P the completion belief, intRisk the interception belief, the window's parts, the flight time,
// the catch point) and what the defense looked like (every defender's position, speed, facing to the passer, assignment, distance to the receiver, to the catch point and to the ball's
// path), then the OUTCOME (completed, intercepted and by whom, broken up and by whom, dropped, incomplete with no defender credited, sacked/scrambled before the throw excluded).
// Roles (what the plan's module D prices), at the decision, from the engine's own state:
//   coverer = the man on the receiver (a man defender whose target is him, else the nearest defender to him within 8 yd);
//   driver  = another defender (not a rusher) within 14 yd of the catch point whose body faces the passer within 60 degrees (eyes on the passer: he can drive on the throw);
//   lane    = another defender or a rusher within his reach + 0.5 yd of the ball's path (a line from the passer to the catch point), neither of the above;
//   other   = anyone else.
// The role that MATTERED = the role of the defender credited with the interception or the breakup; for a completion the coverer; for an incompletion with no credit 'none' (an off-target
// ball, a drop, a throw-away).
//
//   league:  node --import tsx scripts/diag/qb/calibration.ts league <seed> <games> > rows.jsonl
//   staged:  node --import tsx scripts/diag/qb/calibration.ts staged <mental rating 35|60|88> [seeds] > rows.jsonl   (the rating panel's concepts x coverages x rosters x flips, one passer at that level)
// The report is scripts/diag/qb/calibration_report.py; the standing test is test/qb-calibration.test.ts.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const MENTAL = ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency'];
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
const deg = (r: number) => Math.round(Math.abs(r) * 180 / Math.PI);

export function routeFamily(id: string | null | undefined): string {
  const r = (id ?? '').toLowerCase();
  if (!r) return 'none';
  if (/screen|swing|bubble|tunnel/.test(r)) return 'screen';
  if (/flat|arrow|texas|angle|wheel/.test(r)) return 'flat';
  if (/hitch|curl|comeback|stop|hook|stick|sit/.test(r)) return 'stop';
  if (/slant/.test(r)) return 'slant';
  if (/out|speed_out|whip|deep_out/.test(r)) return 'out';
  if (/dig|in\b|^in|drag|shallow|cross|mesh|over|dagger/.test(r)) return 'in';
  if (/go|fly|fade|seam|post|corner|streak|vert|9|nine|bender/.test(r)) return 'vertical';
  return 'other';
}

export interface CalRow {
  src: string; seed: number; game?: number; t: number; rel: number; flight: number; ratingBand: string; mental: number;
  slot: string; route: string | null; family: string; depth: number; P: number; intRisk: number; parts: any;
  cmp: boolean; int: boolean; pbu: boolean; dropped: boolean; matteredRole: string; matteredBy: string | null; coverage: string | null; concept: string | null;
  defs: { slot: string; role: string; dist: number; distPath: number; faceQB: number; kind: string | null; covers: boolean; speed: number }[];
}

export function installCalibration(sink: (r: CalRow) => void, tag: { src: string; seed: number; game?: number }) {
  const orig = PlaySim.prototype.run;
  PlaySim.prototype.run = function (this: any) {
    const sim: any = this; if (!sim.isPass) return orig.apply(this);
    let dec: any = null, rel: any = null, hooked = false;
    const t0 = sim.tick.bind(sim);
    sim.tick = () => {
      const b: any = sim.qb.behavior;
      if (!hooked && b?.kind === 'qb-pass') {
        hooked = true; const st = b.startThrow.bind(b);
        b.startThrow = (a: any, s: any, ev: any) => {
          if (!dec) {
            const q = ev.target, pt = ev.point, qb = sim.qb;
            const defs = sim.defense.map((d: any) => {
              const dx = pt.x - qb.pos.x, dy = pt.y - qb.pos.y, L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((d.pos.x - qb.pos.x) * dx + (d.pos.y - qb.pos.y) * dy) / L2));
              return { a: d, slot: d.slot, kind: d.behavior?.kind ?? null, covers: d.behavior?.kind === 'man' && d.behavior?.target?.slot === q.slot,
                distTgt: Math.hypot(d.pos.x - q.pos.x, d.pos.y - q.pos.y), dist: Math.hypot(d.pos.x - pt.x, d.pos.y - pt.y), distPath: Math.hypot(d.pos.x - (qb.pos.x + u * dx), d.pos.y - (qb.pos.y + u * dy)),
                faceQB: deg(wrap((d.head ?? d.body.facing) - Math.atan2(qb.pos.y - d.pos.y, qb.pos.x - d.pos.x))), speed: Math.hypot(d.vel.x, d.vel.y), reach: d.profile.reach };
            });
            let cov = defs.find((d: any) => d.covers) ?? null;
            if (!cov) { const n = [...defs].sort((x: any, y: any) => x.distTgt - y.distTgt)[0]; if (n && n.distTgt <= 8) cov = n; }
            for (const d of defs) d.role = d === cov ? 'coverer' : (d.kind !== 'rush' && d.kind !== 'blitz' && d.dist <= 14 && d.faceQB <= 60) ? 'driver' : d.distPath <= d.reach + 0.5 ? 'lane' : 'other';
            dec = { t: s.t, slot: q.slot, route: q.behavior?.route?.id ?? null, ev: { P: ev.P, intRisk: ev.intRisk, T: ev.T, depth: ev.depth, parts: ev.parts ?? null }, defs };
          }
          return st(a, s, ev);
        };
        const tb = sim.throwBall.bind(sim);
        sim.throwBall = (p: any, target: any, ...rest: any[]) => { if (p === sim.qb && !rel && target) rel = { t: sim.t, slot: target.slot, arr: rest[2] }; return tb(p, target, ...rest); };
      }
      t0();
    };
    const res = orig.apply(this);
    try {
      if (dec && rel && rel.slot === dec.slot) {
        const st = sim.stats, id = (a: any) => a.player?.id;
        const byId = (x: string | undefined) => x ? dec.defs.find((d: any) => id(d.a) === x) ?? null : null;
        const intBy = byId(st.interceptedBy), pbuBy = byId(st.passDefendedBy);
        const cmp = !!st.completed, int = !!st.interceptedBy, pbu = !!st.passDefendedBy && !int, dropped = !!st.dropped;
        const m = int ? intBy : pbu ? pbuBy : null;
        const matteredRole = int || pbu ? (m?.role ?? 'unseen') : cmp ? (dec.defs.find((d: any) => d.role === 'coverer')?.role ?? 'none') : 'none';
        const q = sim.qb.player.ratings, mental = MENTAL.reduce((s: number, k: string) => s + (q[k] ?? 50), 0) / MENTAL.length;
        sink({ ...tag, t: +dec.t.toFixed(2), rel: +rel.t.toFixed(2), flight: +((rel.arr ?? rel.t) - rel.t).toFixed(2), ratingBand: mental < 50 ? 'low' : mental < 75 ? 'mid' : 'high', mental: +mental.toFixed(1),
          slot: dec.slot, route: dec.route, family: routeFamily(dec.route), depth: +(dec.ev.depth ?? 0).toFixed(1), P: +dec.ev.P.toFixed(3), intRisk: +dec.ev.intRisk.toFixed(3), parts: dec.ev.parts,
          cmp, int, pbu, dropped, matteredRole, matteredBy: m?.slot ?? null, coverage: sim.defCall?.coverage?.id ?? null, concept: sim.offCall?.label ?? null,
          defs: dec.defs.filter((d: any) => d.dist <= 14 || d.covers).map((d: any) => ({ slot: d.slot, role: d.role, dist: +d.dist.toFixed(1), distPath: +d.distPath.toFixed(1), faceQB: d.faceQB, kind: d.kind, covers: d.covers, speed: +d.speed.toFixed(1) })) });
      }
    } catch { /* read-only */ }
    return res;
  } as typeof orig;
  return () => { PlaySim.prototype.run = orig; };
}

export function stagedPlays(level: number, seeds: number[] = [1, 2], concepts = ['curl_flat', 'smash', 'dagger', 'mesh', 'quick_outs', 'stick', 'flood', 'y_cross'], coverages = ['cover1', 'cover2', 'cover3', 'cover4'], rosters = [3, 9], flips = [false, true]) {
  const out: PlaySim[] = [];
  for (const concept of concepts) for (const coverage of coverages) for (const roster of rosters) for (const seed of seeds) for (const flip of flips) {
    const setup: any = nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip });
    const qbP = setup.offense.QB; if (!qbP) continue;
    for (const k of MENTAL) qbP.ratings[k] = level;
    qbP.experience = level < 50 ? 0 : level < 75 ? 4 : 10;
    try { out.push(new PlaySim(setup)); } catch { /* unplayable combination */ }
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('calibration.ts')) {
  const [mode, a, b] = process.argv.slice(2);
  if (mode === 'league') {
    const seed = Number(a ?? 11), games = Number(b ?? 4);
    for (let g = 0; g < games; g++) {
      const s = seed + g, rng = new Rng(s);
      const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
      const off = installCalibration((r) => console.log(JSON.stringify(r)), { src: 'league', seed: s, game: g });
      try { simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); } finally { off(); }
      console.error(`game ${g + 1}/${games}`);
    }
  } else if (mode === 'staged') {
    const level = Number(a ?? 60), seeds = b ? b.split(',').map(Number) : [1, 2];
    const off = installCalibration((r) => console.log(JSON.stringify(r)), { src: `staged${level}`, seed: 0 });
    try { for (const sim of stagedPlays(level, seeds)) { try { sim.run(); } catch { /* skip */ } } } finally { off(); }
  } else console.error('usage: calibration.ts league <seed> <games> | staged <35|60|88> [seeds]');
}

/** The standing contract's cells (same definitions as calibration_report.py): the strongest role present at the decision, with the driver one who can drive on THIS throw (within 8 yd of the catch point, facing the passer within 45 degrees). */
export function strongestRole(r: CalRow): string {
  const roles = new Set(r.defs.map((d) => (d.role === 'driver' && !(d.dist <= 8 && d.faceQB <= 45)) ? 'other' : d.role));
  return roles.has('driver') ? 'driver' : roles.has('lane') ? 'lane man' : roles.has('coverer') ? 'coverer' : 'nobody within 14 yd';
}
export function calibrationCells(rows: CalRow[]) {
  const cell = (S: CalRow[]) => ({ n: S.length, believed: S.reduce((s, r) => s + r.P, 0) / Math.max(1, S.length), actual: S.filter((r) => r.cmp).length / Math.max(1, S.length),
    believedInt: S.reduce((s, r) => s + r.intRisk, 0) / Math.max(1, S.length), actualInt: S.filter((r) => r.int).length / Math.max(1, S.length) });
  const out: Record<string, ReturnType<typeof cell>> = { all: cell(rows) };
  for (const k of ['driver', 'lane man', 'coverer', 'nobody within 14 yd']) out[k] = cell(rows.filter((r) => strongestRole(r) === k));
  return out;
}
