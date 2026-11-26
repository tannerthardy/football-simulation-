/**
 * Alignment resolution.
 *
 * 1. Offense: formation (+flip) → exact spots, receiver numbering (#1 = widest
 *    on each side), formation strength.
 * 2. Defense: front techniques are placed relative to the *actual* offensive
 *    line/TE spots on the strong/weak sides; corners align over the #1s, the
 *    nickel over the slot, safeties by shell; man matchups and zone landmarks
 *    are resolved after alignment. Spreading the offense therefore physically
 *    pulls defenders out of the box.
 */
import { END_LINE_X, FIELD_WIDTH, OPP_GOAL_X } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import type { Coverage, CoverageRole, DefSlot, DefensivePlayCall, Formation, Gap, OffSlot, PassConcept, ReceiverRef, Side, SkillSlot, Technique, ZoneId, UnderSeat, FormationKey } from './types.js';
import { alignDefenseFromDescription } from './ir/align.js';
import { describeDefense } from './ir/describe.js';
import { alignOffenseFromSnap, describeOffenseSnap } from './ir/offense.js';

/** Default on (OL_SPLITS=0 turns it off): the line splits as tracked. 2022
 * tracking at the snap (body centres, scripts/diag/align/snap.py): 1.54 yd
 * center to guard, 1.56 guard to tackle and 1.52 tackle to inline end, a
 * 6.2 yd tackle-to-tackle surface (coaching: two-foot guard and three-foot
 * tackle splits). The sim line stood at 1.3 yd splits (5.2 yd). Defensive
 * techniques, gap landmarks and the run-aiming points installed against the
 * 1.3 yd table are placed from the actual splits (`lineOffset`). */
export const OL_SPLITS = process.env.OL_SPLITS !== '0';
/** Default on (OL_STAGGER=0 turns it off): the line stands off the ball as tracked.
 * Guards 0.83 yd behind the ball, tackles 0.98 and an inline end 1.19 (body
 * centres; their helmets break the center's waist, the legal limit for a
 * lineman on the line). The center is tracked at 0.29, over the ball; here
 * the line of scrimmage has no ball length and a body is a disc, so he
 * stands at 0.43, just clear of it for the widest body (radius 0.42). The
 * sim line stood flat at 0.55. */
export const OL_STAGGER = process.env.OL_STAGGER !== '0';
/** Center-guard, guard-tackle and tackle-to-inline-end splits (yd between
 * body centres) of one snap's line. */
export interface LineSplits { cg: number; gt: number; tte: number }
export const BASE_LINE: LineSplits = OL_SPLITS ? { cg: 1.54, gt: 1.56, tte: 1.52 } : { cg: 1.3, gt: 1.3, tte: 1.3 };
/** OL_SPLITS: on third or fourth down and a yard or less the line tightens
 * against penetration (tracked tackle to tackle 5.85 yd against 6.2; on first
 * and second down and a yard it does not). Splits do not otherwise change with
 * the call: tracked zone, gap and dropback splits agree within 0.05 yd. */
export const SHORT_LINE: LineSplits = { cg: 1.45, gt: 1.47, tte: 1.43 };
export const tackleOf = (l: LineSplits) => OL_SPLITS ? l.cg + l.gt : 2.6;
export const inlineOf = (l: LineSplits) => OL_SPLITS ? tackleOf(l) + l.tte : 3.9;
// A wing stands 1.32 yd outside the attached end: the median lateral offset
// of the 682 off-line players within 2.5 yd outside a single attached TE with a
// defender on the line beside them (2022 tracking, weeks 1-6, SNAP frames;
// scripts/diag/align/nfl_wing.py, its "true wings" cohort).
export const wingOf = (l: LineSplits) => OL_SPLITS ? inlineOf(l) + 1.32 : 4.8;
export const FLAT_DEPTH = .55;
type LineSlot = 'LT' | 'LG' | 'C' | 'RG' | 'RT';
/** OL_STAGGER: guards and tackles stand deeper on a dropback (tracked tackles
 * 1.10, 1.17 on third or fourth and long; guards 0.90) than on a run (0.97,
 * 0.82). Without a call, the all-snap depths. */
export function olDepth(ctx: AlignContext): Record<LineSlot, number> {
  if (!OL_STAGGER) return { LT: FLAT_DEPTH, LG: FLAT_DEPTH, C: FLAT_DEPTH, RG: FLAT_DEPTH, RT: FLAT_DEPTH };
  const long = (ctx.down ?? 1) >= 3 && (ctx.distance ?? 10) >= 7;
  const [g, t] = ctx.kind === 'pass' ? [.9, long ? 1.17 : 1.1] : ctx.kind === 'run' ? [.82, .97] : [.83, .98];
  return { LT: t, LG: g, C: .43, RG: g, RT: t };
}
/** OL_STAGGER: an inline end's tracked depth (formations install 0.6). */
export const INLINE_DEPTH = 1.19;
/** RECEIVER_DEPTH (experimental, off): receivers on the line stand where
 * tracked receivers do, measured from the ball (BDB 2025 weeks 1-3, non-PA
 * dropbacks, body centre behind the tracked football at the snap, with no
 * defender within 2 yd in front of him): an outside receiver 0.74 yd
 * (n 3,537), a tight end 0.83 (n 1,500). Off-line receivers keep their
 * installed depth. See PRESS_BACKOFF for a receiver facing a press look. */
export const RECEIVER_DEPTH = process.env.RECEIVER_DEPTH !== '0';
export const WR_LINE_DEPTH = 0.74;
export const TE_LINE_DEPTH = 0.83;
/** RECEIVER_DEPTH: a receiver on the line who sees a defender set within 2 yd
 * in front of him (within 1.5 yd laterally) before the snap stands deeper to
 * get room to release. Tracked: outside receivers 0.94 vs 0.74 yd (+0.20,
 * n 1,224 pressed), tight ends 1.09 vs 0.83 (+0.26, n 1,469); the
 * pressed-weighted mean is 0.23. */
export const PRESS_BACKOFF = 0.23;
/** MIRROR_SCATTER (off; MIRROR_SCATTER=1 turns it on; Run Game, docs/reviews/2026-11-16-mirror-scatter.md): a defender's
 * lateral placement error (his alignment error, PlaySim) and his ALIGN_HABIT lateral scatter are a cheat wide or tight
 * of his landmark, on his own side: the draw is multiplied by his side's sign (his spot's side of the ball, or the
 * offence's strong sign for a man aligned on the ball). Magnitudes and draws are unchanged; only the direction is now
 * relative to his side. Off, both were added in absolute field y from the same seed whichever way the formation set, so
 * a mirrored formation met an unmirrored defence (the read compiler's offence-only sample: DE_S 6.08 vs 6.41 yd from the
 * ball, LB_M 2.36 vs 2.90, FS +0.40 vs -0.40; RECEIVER_DEPTH then backed the Y off 0.23 yd on one side only and LINE_START
 * carried it into his readiness, tipping pa_flood and trips_sail between plans). */
export const MIRROR_SCATTER = process.env.MIRROR_SCATTER !== '0';
/** MIRROR_SCATTER: +1 if a defender at `y` widens toward +y (his own side of the ball), -1 toward -y. */
export function scatterSide(off: Pick<OffenseAlignment, 'ballY' | 'strongSign'>, y: number): number {
  return Math.abs(y - off.ballY) > 0.05 ? Math.sign(y - off.ballY) : off.strongSign;
}
/** Default on (DEF_ALIGN=0 turns it off): the secondary aligns by its job, as on
 * film (2022 tracking at the snap by PFF coverage assignment,
 * scripts/diag/align/nfl_scheme.py). A corner's depth and shade come from his
 * role: the hard (flat) corner 4 yd and outside, a deep-third or
 * outside-quarter corner 7.3 and outside, a deep-half corner 8.2 about
 * head-up, a curl-flat corner 4.5 head-up, a hook seat 4.5 inside; a pressed
 * man corner 1.3 about head-up, an off-man corner 6 on his called shoulder. A
 * receiver within 9 yd of the sideline is played from inside: the sideline is
 * the help. Deep safeties hold the field, not the ball: halves 14 deep 6.9 yd
 * either side of the middle, quarters 12 deep and 6.65, each shading toward
 * the ball (0.36 and 0.45 of its offset); a deep-middle (thirds) safety stays
 * in the middle 14.5 deep, a man-free safety shades 0.34 toward the ball.
 * Off: the installed spots. */
export const DEF_ALIGN = process.env.DEF_ALIGN !== '0';
/** Default on (WR_ALIGN=0 turns it off): receivers align as tracked
 * (scripts/diag/align/nfl_scheme.py, 2022 tracking at the snap). The #1's room
 * to his sideline follows his route (ROUTE_ROOM: wide to run vertical or
 * inside, reduced to break out or across) or the run; without a call, a lone
 * #1 keeps about 13.5 yd and one with others about 11. A #2 stands at 0.58 of
 * the #1's split (0.62 in trips) and a #3 at 0.40. The installed split put
 * every #1 at 18 yd, 6 yd from the boundary sideline, and slots at a fixed
 * 8.4-8.6. Off: the installed spots. */
export const WR_ALIGN = process.env.WR_ALIGN !== '0';
/** Default on (FRONT_ALIGN=0 turns it off): the front aligns on bodies, not gaps,
 * and its end men by who they are. A shaded technique sits on its blocker's
 * shoulder, 0.57 yd off his centre in 2022 tracking for centres and guards
 * alike (scripts/diag/align/, nfl-snap extract); the installed 1 and 3 sat in
 * the middle of the gap. The end man on each side sets the edge outside the
 * surface: with no inline end there he aligns outside the tackle (a 9 or a
 * wide nine), never on the tackle's outside shoulder (tracked weak edges are
 * a 5 on 1-2% of runs); with one, at least on him (an uncovered end with a 5
 * outside the tackle is 1%), else the call's technique stands. His build
 * then moves him 0.025 yd wider per kg lighter than 118 kg, at most 0.4 yd
 * out and 0.2 in (0.4 from a wide nine), so his feet stay within the called
 * technique, and never inside an end he is set on: half the tracked slope (about -0.05 yd
 * per kg; 235 lb ends 1.81 yd outside an end, 275 lb 1.03), since light ends
 * also draw the wide calls. An end man's 9 over an end stands 1.5 yd outside
 * him and a wide nine 2.5: tracked ends outside an end form one hump at 1.65
 * (IQR 1.20-2.14), with no separate peak at a shoulder's 0.57 (the open side
 * likewise stands 2.4 outside the tackle). Over an end, the technique
 * comes from the call against the look, as team installs write it (2017
 * Colts pp. 13, 77, 79): vs a pair of ends a 9; in nickel ("Auto") a 6 vs
 * a near back and a 9 vs a dot or far one; base fronts keep their map; the
 * Over Sam is a "90" (outside shade at linebacker depth), on the line
 * head-up on a wing. An explicit edge call (tight, base, wide) overrides.
 * The call's gap is unchanged. */
export const FRONT_ALIGN = process.env.FRONT_ALIGN !== '0';
/** SHORT_PACKAGE (on; =0 turns it off): see game/playcaller.ts. */
export const SHORT_PACKAGE = process.env.SHORT_PACKAGE !== '0';
/** Default on (FRONT_STRENGTH=0 turns it off): the front sets its own strength,
 * apart from the coverage's receiver strength. With one attached end it sets
 * to him, whatever the receivers do: in 2022 tracking a 4-down front's 3
 * technique is on the end's side 82-86% of over/under snaps, 86% against
 * trips away from him (scripts/diag/align/deflook.py); the remainder are
 * Under calls, which put it away by design. Without a single attached end
 * (none, or one each side) the league has no one rule (3 technique toward
 * the back, the field or the receivers each about half), so the call carries
 * the team's pick: toward the receivers' strength or the other way. Front
 * players' called sides (blitz gaps, a dropping lineman's zone, a backer's man
 * preferences) follow the front; defensive backs keep the coverage's. Off: the
 * front sets to the coverage strength (more receivers, then the end, then the
 * field). */
const FRONT_STRENGTH = process.env.FRONT_STRENGTH !== '0';
/** Default on (FRONT_MENU=0 turns it off; with the caller's menu, game/playcaller.ts):
 * off-ball backers stand where 2022 tracking puts them for the called
 * front's family and the number of backers off the ball (medians of body
 * positions in line units, 0 the ball, 1 a guard, 2 a tackle, 3 an attached
 * end; strong side positive; scripts/diag/align/deflook.py): two backers in a
 * nickel Over stack the B gaps, Will at -1.4 and Mike at +1.7, both 4.6 deep;
 * three in a base Over put the Mike in the strong A gap at +0.5 between a
 * weak Will at -1.9 and a Sam at +2.7. Off: the front's installed techniques. */
export const FRONT_MENU = process.env.FRONT_MENU !== '0';
/** Default on (BOX_ALIGN=0 turns it off): in a zone call every detached inside
 * receiver (#2, #3) is answered before the snap. When no defender stands over
 * him (within 1.5 yd laterally, under 8 deep) or at his apex (between him
 * and the next receiver inside, or the end of the line), the nearest off-ball
 * backer not mugged or blitzing walks out to the apex, halfway between them,
 * 4.6 deep. 2022 tracking (scripts/diag/align/deflook.py): a weak #2 against
 * 2x2 or empty is unanswered on 6% of snaps (the sim's zone calls 26-48%);
 * the answering backer stands 1.8-1.9 yd inside a #2 4-5 yd outside the
 * surface, 2.6 inside a #3, 4.5-4.8 deep. Against empty, nickel backers stay
 * in the box about half the time. Man defenders align on their men already.
 * Off-ball backers also set their depth by the situation: half a yard
 * tighter on third or fourth and 2 or less (tracked medians 4.0-4.1 against
 * 4.6 on early downs), half a yard looser on third and 7 or more (tracked
 * 75th percentile 5.6 against 5.2; "LBs loosen up", 1999 Buccaneers). On
 * third and 3 or more each side's end man widens 0.4 yd (tracked median 2.4
 * yd outside the surface against 1.9-2.1 on early downs; "closed end
 * widens", 1999 Buccaneers; "open end wide 5", 2005 Ravens). In a
 * one-high shell the down safety stands where tracking puts the Cover 3 down
 * safety: against an attached end 1.5 yd outside him, 4.4 deep with the
 * quarterback under center and 5.2 in the gun; against a tackle 2.7 and 5.1
 * under center, 3.9 and 5.8 in the gun (medians, 1,678 and 1,131 snaps). The
 * installed spot, 3 yd outside and 7.5 deep, left him out of the box against
 * an attached end on every snap (tracked: within 2 yd of the end on 70%). */
export const BOX_ALIGN = process.env.BOX_ALIGN !== '0';
/** BLITZ_CREEP (experimental, off): see alignDefense; tracked depth of a rushing backer at the snap (yd). */
export const BLITZ_CREEP = process.env.BLITZ_CREEP !== '0', CREEP_DEPTH = 2.4;
/** SAM_ON_TE (experimental, off): see alignDefense; a Sam on the line stands as the Under's 9 does (yd). */
export const SAM_ON_TE = process.env.SAM_ON_TE === '1', SAM_ON_DEPTH = 1.0;
/** TIGHT_OFF (experimental, off): see alignDefense; a tight #2 is within this of his tackle (yd); off depth (yd). */
/** NICKEL_FRONTS (experimental, off): see the end-man rule in alignDefense. */
export const NICKEL_FRONTS_ALIGN = process.env.NICKEL_FRONTS !== '0';
/** SLOT_LEV (experimental, off): see alignDefense. */
export const SLOT_LEV = process.env.SLOT_LEV !== '0';
export const TIGHT_OFF = process.env.TIGHT_OFF !== '0', TIGHT_SPLIT = 3.5, TIGHT_OFF_DEPTH = 4.5;
/** SHELL_SHOW (on; the call's disguise rates are in
 * game/playcaller.ts): a disguised man safety shows the deep look. */
export const SHELL_SHOW = process.env.SHELL_SHOW !== '0';
/** Default on (AGAP_ALIGN=0 turns it off; acts with FRONT_ALIGN): a lineman's 1
 * technique stands at his team's habit along the centre-guard split, not on
 * the centre's shoulder. In 2022 tracking the A-gap man of a 4-down
 * over/under stands a median 0.66 of the split off the centre (0.99 yd; the
 * shoulder put him at 0.47 and covered the centre on 97% of those snaps,
 * tracked 51%). The spot is mostly the team's: team medians run 0.30 (NYG,
 * a shade on the centre) to 0.82 (PHI, a 2i on the guard), sd 0.14, while
 * his build barely moves it (-0.017 per 10 lb) and down, personnel and run
 * or pass move the median under 0.06 (scripts/diag/align/deflook.py). The
 * gap is unchanged. Off: the shoulder. */
export const AGAP_ALIGN = process.env.AGAP_ALIGN !== '0';
/** AGAP_ALIGN: the league's 1 technique, as a share of the centre-guard
 * split (mean of the 2022 team medians), for a defense without a habit. */
export const AGAP_LEAGUE = .63;
type BackerSpot = [units: number, depth: number];
export const BACKERS: Record<string, Partial<Record<1 | 2 | 3, BackerSpot[]>>> = {
  over: { 1: [[.35, 4.7]], 2: [[-1.4, 4.6], [1.7, 4.6]], 3: [[-1.9, 4.5], [.5, 4.8], [2.7, 4.5]] },
  under: { 1: [[.3, 4.6]], 2: [[-1.2, 4.5], [1.7, 4.6]], 3: [[-1.7, 4.5], [.7, 4.6], [3, 4.5]] },
  even: { 1: [[.05, 4.7]], 2: [[-1.5, 4.8], [1.9, 4.8]], 3: [[-1.9, 4.5], [.5, 4.8], [2.7, 4.5]] },
  bear: { 2: [[-.8, 4.6], [2, 4.4]] },
  tite: { 2: [[-.8, 4.6], [1.85, 4.5]] },
  // NICKEL_FRONTS: the Mint's Will sits over the weak C-gap bubble the front leaves open.
  mint: { 2: [[-2.5, 4.3], [.6, 4.6]] },
};
export const FAMILY: Record<string, string> = { over: 'over', wide9: 'over', under: 'under', under34: 'under', even: 'even', bear34: 'bear', tite: 'tite', penny: 'over', penny_bear: 'over', mint: 'mint', okie: 'even' };
export const FRONT_PLAYERS = new Set<DefSlot>(['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT', 'LB_S', 'LB_M', 'LB_W']);
/** The front's strong side (+1 = +y). */
export function frontSign(call: DefensivePlayCall, off: OffenseAlignment): number {
  if (!FRONT_STRENGTH) return off.strongSign;
  if (off.hasTE.S !== off.hasTE.W) return off.hasTE.S ? off.strongSign : -off.strongSign;
  return call.strength === 'opposite' ? -off.strongSign : off.strongSign;
}
export const otherSide = (side: 'S' | 'W'): 'S' | 'W' => side === 'S' ? 'W' : 'S';
export const flipZone = (z: ZoneId): ZoneId => z.replace(/_(s|w)(?=_|$)/, (_, c: string) => c === 's' ? '_w' : '_s') as ZoneId;
export const flipRef = (r: ReceiverRef): ReceiverRef => (r[0] === 'S' ? `W${r.slice(1)}` : r[0] === 'W' ? `S${r.slice(1)}` : r) as ReceiverRef;

export interface OffSpot {
  slot: OffSlot;
  pos: Vec2;
  side: Side | 'C';
  /** Lined up in the backfield (not counted as a numbered receiver). */
  backfield: boolean;
  /** Attached tight end. */
  inline: boolean;
  /** On the line of scrimmage at the snap (the legal-position fact Rule 5 / 7 read: the five linemen, an attached end, a
   * receiver set on the ball); everyone else, the quarterback included, is a back. A motion man is always off the line
   * (canMotion), so motion never changes it. Absent on a spot built elsewhere: see playbook/eligibility.ts. */
  onLine?: boolean;
}

export interface OffenseAlignment {
  los: number;
  ballY: number;
  spots: Record<string, OffSpot>;
  /** Receiver refs (S1, W2…) → slot. */
  numbering: Partial<Record<ReceiverRef, SkillSlot>>;
  /** Slot → its receiver ref. */
  refOf: Partial<Record<SkillSlot, ReceiverRef>>;
  /** Strong side (L/R from the offense's view). */
  strong: Side;
  /** +1 if strong side is +y, else −1. */
  strongSign: number;
  /** y of the strong- and weak-side end of the core (TE if attached, else OT). */
  coreEdge: { S: number; W: number };
  /** The line's splits at this snap. */
  line: LineSplits;
  hasTE: { S: boolean; W: boolean };
  counts: { S: number; W: number };
}

/** A team's alignment habits on top of its scheme (see `alignStyle` in
 * league/team.ts): line width (share), the #1's room to his sideline (yd), zone
 * corners' and deep safeties' depth (yd). Each applies under its flag only. */
export interface AlignStyle { olWidth?: number; wrRoom?: number; cbDepth?: number; safetyDepth?: number;
  /** FRONT_ALIGN: the body mass (kg) of the player in each defensive slot. */
  mass?: Partial<Record<DefSlot, number>>;
  /** FRONT_STRENGTH: how often the front sets to the passing strength when
   * the look has no single attached end (the call carries each snap's pick). */
  passingStrength?: number;
  /** AGAP_ALIGN: where the front's 1 technique stands, as a share of the
   * centre-guard split from the centre. */
  aGap?: number;
  /** The defense's own picture of the snap: down, yards to gain and to the
   * goal line. Never the offense's call. */
  situation?: DefSituation;
  /** ALIGN_HABIT: each slot's alignment offset this snap (habit + scatter, yd; x deeper, y across). */
  scatter?: Partial<Record<DefSlot, Vec2>>;
}

export interface DefSituation { down: number; distance: number; toGoal: number;
  /** The offensive personnel group the defense saw come on (e.g. '11', '12', '21'). */
  personnel?: string }

/** SITU_DEPTH (default on; SITU_DEPTH=0 turns it off): deep safeties and zone
 * corners set their depth by the down, the distance and the offense's
 * personnel, as tracked (BDB 2025, all 9 weeks, PFF assignment at the snap,
 * medians relative to 1st & 10 against 11 personnel): tighter on short
 * yardage and 3rd & medium and against heavier personnel; corners off a
 * little more on 3rd & long. The two effects are added (checked against the
 * joint cells within their noise). docs/reviews/2026-11-09-coverage-spacing.md. */
const SITU_DEPTH = process.env.SITU_DEPTH !== '0';
export type DepthJob = 'post' | 'half' | 'quarter' | 'thirdCB' | 'quarterCB' | 'flatCB';
// Columns: 2nd & 7+, 2nd & 3-6, 2nd-4th & <=2, 3rd/4th & 3-6, 3rd/4th & 7+ | 12/21, 13/22+.
const SITUATION_DEPTH: Record<DepthJob, [number[], number[]]> = {
  post: [[-0.2, -0.8, -1.2, -0.5, 0], [0, -0.3]],
  half: [[-0.3, -0.8, -0.4, -1.4, -0.1], [-1.2, -1.2]],
  quarter: [[-0.3, -0.9, -1.1, -2.2, 0.3], [-1.0, -1.6]],
  thirdCB: [[-0.1, -0.5, -1.0, -0.4, 0.6], [-0.5, -1.4]],
  quarterCB: [[-0.1, -0.2, -0.1, -0.7, 0.8], [-0.3, -0.9]],
  flatCB: [[-0.2, -0.2, -0.8, -1.0, 0.8], [-0.6, -1.1]],
};
/** SITU_DEPTH: the change to a deep or zone defender's depth for this snap. */
export function situationDepth(job: DepthJob, sit: DefSituation | undefined): number {
  if (!SITU_DEPTH || !sit) return 0;
  const [bySituation, byPersonnel] = SITUATION_DEPTH[job];
  const { down, distance } = sit;
  const col = down >= 2 && distance <= 2 ? 2 : down === 2 ? (distance >= 7 ? 0 : 1) : down >= 3 ? (distance >= 7 ? 4 : 3) : -1;
  const digits = (sit.personnel ?? '11').split('').map(Number);
  const extra = digits.length === 2 && digits.every(Number.isFinite) ? digits[0] + digits[1] - 1 : 1;
  return (col >= 0 ? bySituation[col] : 0) + (extra === 2 ? byPersonnel[0] : extra >= 3 ? byPersonnel[1] : 0);
}

/** What an alignment may know of its own snap: the call, the situation and
 * the team's habits. */
export interface AlignContext {
  kind?: 'pass' | 'run';
  pass?: PassConcept;
  down?: number;
  /** Yards to the line to gain. */
  distance?: number;
  style?: AlignStyle;
  /** The run called, when one is (STRETCH_OFFSET). */
  run?: { scheme: string; direction: 'strong' | 'weak' };
}

/** MAN_TE_OFF (default on; MAN_TE_OFF=0 restores; Rules + Coaching, step 2b): a defensive back in man on an attached
 * tight end aligns off the ball by the man rule for an inside receiver (4 yd, inside shade), not pressed head-up at 1.3
 * yd: there the end man of the front (a 6 or 9 technique on that end) stands, and the two bodies overlapped (DE_S and DB
 * 0.43 yd apart against Gun Split Twins in dime man; DE_W and CB_W against I Jumbo on bear heavy). */
export const MAN_TE_OFF = process.env.MAN_TE_OFF !== '0';
/** STRETCH_OFFSET (default off): on a stretch call (outside/wide zone) from
 * the gun, the offset back aligns away from the play side, so the mesh path
 * across the QB's face carries him toward it. Tracked 2022 gun outside zone:
 * 219 snaps away, 22 on the play side; a back on the play side takes the ball
 * running away from the play and has to reverse. */
export const STRETCH_OFFSET = process.env.STRETCH_OFFSET !== '0';
/** IZ_OFFSET (default off): STRETCH_OFFSET for gun inside and split zone: the
 * offset back aligns away from the play side and meshes across the QB's face
 * into it. Tracked 2022 gun inside zone: back backside 91% of snaps, play
 * side 5% (gun outside zone 61% / 5%). Ours lined up on the play side on 48%
 * of gun IZ calls, and on 56 of 75 of those the back's mesh path (built for a
 * backside offset) carried him against the call after the handoff. */
export const IZ_OFFSET = process.env.IZ_OFFSET !== '0';
/** COUNTER_OFFSET (default off): IZ_OFFSET for gun counter. Tracked 2022 gun
 * counter: the offset back aligns backside on 119 of 153 snaps and takes the
 * ball 0.9 yd backside already running to the hole (+3.05 yd/s); ours aligned
 * play side on 64 of 76, met the ball running away from the hole (-2.85 yd/s)
 * and crossed the LOS on the pull side 70% of the time (NFL 92%). */
export const COUNTER_OFFSET = process.env.COUNTER_OFFSET !== '0';
/** SPLIT_BACK_SIDES (default on; SPLIT_BACK_SIDES=0 restores; Rules + Coaching, step 2b): with two backs on a gun zone
 * run (inside, split, outside, wide), the ball carrier aligns away from the play side and the second back takes the play
 * side, where his job is (the zone lead through the play-side hole or to the stretch landmark, or the slice back across
 * to the backside end: blocking.ts). Off, every back on the play side mirrored to the backside, so from split backs the
 * play-side back landed on the other one (0.00 yd apart) or beside him: the step-2a checker's 64 offensive overlaps.
 * Counter is left as it was: how the second back aligns on gun counter from split backs is not settled here. */
export const SPLIT_BACK_SIDES = process.env.SPLIT_BACK_SIDES !== '0';

/** The gun run's backs, given the play side (`play`, a sign). `lead`: the carrier (B) aligns away and the second back
 * (B2) takes the play side, each keeping his depth; otherwise every back on the play side mirrors away. */
export function backsAway(spots: Record<string, OffSpot>, numbering: Partial<Record<ReceiverRef, SkillSlot>>, ballY: number, play: number, lead: boolean): void {
  const mirror = (sp: OffSpot) => { sp.pos = { x: sp.pos.x, y: clamp(2 * ballY - sp.pos.y, 1, FIELD_WIDTH - 1) }; };
  const b = numbering.B && spots[numbering.B], b2 = numbering.B2 && spots[numbering.B2];
  if (lead && b && b2 && b.backfield && b2.backfield) {
    if ((b.pos.y - ballY) * play > 1) mirror(b);
    if ((b2.pos.y - ballY) * play < -1) mirror(b2);
    return;
  }
  for (const sp of Object.values(spots)) if (sp.backfield && sp.slot !== 'QB' && (sp.pos.y - ballY) * play > 1) mirror(sp);
}
/** TE_OFF (default off): on a zone run call an attached end sometimes sets
 * off the ball beside the tackle (a wing), with the wide receiver on his side
 * moving up onto the line so seven stay on it. Tracked 2022 zone runs: 0.43
 * tight ends a snap stand 0.75 yd or more behind the line beside the tackle
 * (mostly 1.0-1.25 yd behind it, 1-2 yd outside the tackle) against 0.83
 * attached; installed formations set none. The pick is a hash of the slot and
 * the ball spot, not a draw from the play's stream. */
export const TE_OFF = process.env.TE_OFF !== '0';
export const TE_OFF_SHARE = .58, TE_OFF_DEPTH = 1.1;
export function spotHash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const c of parts.join('|')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

/** WR_ALIGN: the #1's room to his sideline (yd) by his route, [alone on his
 * side, with other receivers]: tracked 2022 medians, which follow the
 * coaching rule. Vertical and inside-breaking routes take a wide split when
 * others share his side (go, slant and comeback alone too); routes that break
 * outside or across take a reduced one, leaving room to break. Runs: alone
 * reduced, with others wide (crack and stalk angles). */
export const ROUTE_ROOM: Record<string, [number, number]> = {
  go: [10.9, 10], fade: [10.9, 10], comeback: [10.9, 10], slant: [10.2, 9.9],
  hitch: [14, 10.6], quick_hitch: [14, 10.6], curl: [14, 10.6], stick: [14, 10.6], hook: [14, 10.6],
  short_in: [14.6, 10.4], dig: [14.6, 10.4], post: [14.6, 11.2], seam: [14.6, 11.2],
  quick_out: [14.7, 15.8], out: [14.7, 15.8], deep_out: [14.7, 15.8], corner: [15.4, 15.3],
  shallow: [15.8, 16.8], shallow_high: [15.8, 16.8], mesh_under: [15.8, 16.8], cross: [15.8, 16.8], flat: [15.1, 17.6], arrow: [15.1, 17.6],
};
// SCREEN_QB: the tunnel screen's #1 keeps the room of a vertical stem, to come back under it: 10.9 yd to his sideline
// (BDB 2025 WR-in screens, n 23, all with another receiver on his side; screen_tunnel_path.py). Off: the default room.
if (process.env.SCREEN_QB === '1') ROUTE_ROOM.tunnel = [10.9, 10.9];
export const RUN_ROOM: [number, number] = [15, 10.8];
export const ANY_ROOM: [number, number] = [13.5, 11];

/** Split of the widest receiver on a side from the ball. `detached` counts
 * that side's detached receivers and `room` is the #1's room to his sideline
 * [alone, with others] (used by WR_ALIGN only). */
export function wideOffset(ballY: number, sign: number, detached = 1, room: [number, number] = ANY_ROOM, habit = 0): number {
  const toSideline = sign > 0 ? FIELD_WIDTH - ballY : ballY;
  if (WR_ALIGN) return Math.max(8, toSideline - (detached >= 2 ? room[1] : room[0]) - habit);
  return Math.max(9, Math.min(18, toSideline - 6));
}

/** The offense at the snap, aligned from the call's description (step 4: the description is the one source). */
export function alignOffense(formation: Formation, flip: boolean, los: number, ballY: number, ctx: AlignContext = {}): OffenseAlignment {
  return alignOffenseFromSnap(describeOffenseSnap(formation, ctx), flip, los, ballY);
}


// ------------------------------------------------------------------ defense

/** A depth behind the line of scrimmage installed against the flat 0.55 yd
 * line, placed behind the actual line. `stance` (a lineman's own depth)
 * measures it from that lineman's stance: a set or a drop. Without one it is
 * carried behind the deepest lineman: a pull path behind the tackles. Depths
 * at or in front of the flat line are unchanged. The identity unless
 * OL_STAGGER is on. */
export function lineDepth(depth: number, stance?: number): number {
  if (!OL_STAGGER || depth <= FLAT_DEPTH) return depth;
  return depth - FLAT_DEPTH + (stance ?? olDepth({}).LT);
}

/** A landmark installed against the legacy line (1.3 yd splits, inline end
 * at 3.9 yd from the ball) placed on the actual line: interpolated between
 * the center, guard, tackle and (with one) inline end, and carried with the
 * outermost of them beyond it. The identity unless OL_SPLITS is on. */
export const OL_SLOTS = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
/** FRONT_ALIGN: a shade's offset from its blocker's centre (tracked). */
export const SHOULDER = .57;
/** FRONT_ALIGN: techniques an end man can hold outside the tackle. */
export const EDGE_TECH: Technique[] = ['7', '6', '9', 'w9'];
/** FRONT_ALIGN: the called edge over an end (with none: a 9 or a wide nine). */
export const EDGE_CALL_TE: Record<'tight' | 'base' | 'wide', Technique> = { tight: '6', base: '9', wide: 'w9' };

export function lineOffset(offset: number, hasTE: boolean, line: LineSplits = BASE_LINE): number {
  if (!OL_SPLITS) return offset;
  const d = Math.abs(offset), from = [0, 1.3, 2.6, 3.9], to = [0, line.cg, tackleOf(line), inlineOf(line)];
  const last = hasTE ? 3 : 2;
  for (let i = 1; i <= last; i++)
    if (d <= from[i]) return Math.sign(offset) * (to[i - 1] + (d - from[i - 1]) * (to[i] - to[i - 1]) / (from[i] - from[i - 1]));
  return Math.sign(offset) * (to[last] + d - from[last]);
}

/** y offset (absolute, ≥ 0) of a technique from the ball on a side. */
export function techniqueOffset(tech: Technique, hasTE: boolean, line: LineSplits = BASE_LINE): number {
  if (FRONT_ALIGN) {
    // On the blocker: head-up on his centre or on a shoulder 0.57 yd off it.
    const G = OL_SPLITS ? line.cg : 1.3, T = tackleOf(line), E = inlineOf(line), sh = SHOULDER;
    switch (tech) {
      case '0': return 0;
      case '1': return sh;
      case '2i': return G - sh;
      case '2': return G;
      case '3': return G + sh;
      case '4i': return T - sh;
      case '4': return T;
      case '5': return T + sh;
      case '6': return hasTE ? E : T + 1.0;
      case '7': return hasTE ? E - sh : T + .8;
      case '9': return hasTE ? E + 1.5 : T + 1.6;
      case 'w9': return hasTE ? E + 2.5 : T + 2.3;
    }
  }
  if (OL_SPLITS) {
    // The same shoulders and gaps, placed from the actual splits.
    const G = line.cg, T = tackleOf(line), E = inlineOf(line);
    switch (tech) {
      case '0': return 0;
      case '1': return G / 2;
      case '2i': return G - .3;
      case '2': return G;
      case '3': return G + line.gt / 2;
      case '4i': return T - .3;
      case '4': return T;
      case '5': return T + .65;
      case '6': return hasTE ? E : T + 1.0;
      case '7': return hasTE ? E - .45 : T + .8;
      case '9': return hasTE ? E + .7 : T + 1.6;
      case 'w9': return hasTE ? E + 1.6 : T + 2.3;
    }
  }
  switch (tech) {
    case '0':
      return 0;
    case '1':
      return 0.65;
    case '2i':
      return 1.0;
    case '2':
      return 1.3;
    case '3':
      return 1.95;
    case '4i':
      return 2.3;
    case '4':
      return 2.6;
    case '5':
      return 3.25;
    case '6':
      return hasTE ? 3.9 : 3.6;
    case '7':
      return hasTE ? 3.45 : 3.4;
    case '9':
      return hasTE ? 4.6 : 4.2;
    case 'w9':
      return hasTE ? 5.5 : 4.9;
  }
}

/** FIT_TE_GAP (experimental, off): a 6 or 7 technique on an attached end
 * owns C, the gap inside him (Browns OL manual p. 11: 6 head-up, 7 inside
 * shade), not D beside the 9; the 4-3 Over's Sam outside him (a "90", 2017
 * Colts p. 77) takes D; and the end still rushes outside the TE, his pass
 * lane apart from his run gap. Off, every technique outside the tackle owns D,
 * so C between the tackle and the TE has no owner at the snap. */
export const FIT_TE_GAP = process.env.FIT_TE_GAP !== '0';

export function techniqueGap(tech: Technique, hasTE = false): Gap {
  switch (tech) {
    case '0':
    case '1':
      return 'A';
    case '2i':
    case '2':
    case '3':
      return 'B';
    case '4i':
    case '4':
    case '5':
      return 'C';
    // Head-up on or inside an attached end, his gap is inside him; outside
    // him is the 9's. With no end there it is the edge outside the tackle.
    case '6':
    case '7':
      return hasTE ? 'C' : 'D';
    default:
      return 'D';
  }
}

/** Absolute y of the middle of a gap on a side (sign = +1 for the +y side). */
export function gapY(off: OffenseAlignment, gap: Gap, sign: number): number {
  const b = off.ballY;
  const hasTE = sign === off.strongSign ? off.hasTE.S : off.hasTE.W;
  if (OL_SPLITS) {
    switch (gap) {
      case 'A': return b + sign * off.line.cg / 2;
      case 'B': return b + sign * (off.line.cg + off.line.gt / 2);
      case 'C': return b + sign * (hasTE ? (tackleOf(off.line) + inlineOf(off.line)) / 2 : tackleOf(off.line) + .65);
      case 'D': return b + sign * (hasTE ? inlineOf(off.line) + .7 : tackleOf(off.line) + 1.6);
    }
  }
  switch (gap) {
    case 'A':
      return b + sign * 0.65;
    case 'B':
      return b + sign * 1.95;
    case 'C':
      return b + sign * 3.25;
    case 'D':
      return b + sign * (hasTE ? 4.6 : 4.2);
  }
}

export interface DefSpot {
  slot: DefSlot;
  pos: Vec2;
  role: CoverageRole;
  /** Run-fit gap and side sign (+1 = +y). */
  gap: Gap;
  gapSign: number;
  /** FIT_TE_GAP: a front player's pass-rush lane when it differs from his run
   * gap (a 6 or 7 on an attached end fits C but rushes outside him). */
  rushGap?: Gap;
  /** For man defenders: the offensive slot they cover. */
  manTarget?: SkillSlot;
  /** For zone defenders: landmark. */
  zone?: ZoneId;
  /** Press alignment. */
  press?: boolean;
}

export interface DefenseAlignment {
  spots: Partial<Record<DefSlot, DefSpot>>;
  rushers: DefSlot[];
  coverage: Coverage;
  boxCount: number;
}

/** Actual initial bodies, after the ordinary alignment error is applied. */
export interface DefensiveStanceBody {
  slot: DefSlot;
  pos: Vec2;
  radius: number;
}

/** A pressed marker retains his receiver and lateral shade when the called
 * front occupies that stance. Choose the nearest unoccupied depth, rather
 * than beginning with interpenetrating teammates. This installs an initial
 * stance; it must never reposition players after pre-snap movement begins. */
export function fitPressStances(alignment: DefenseAlignment, bodies: readonly DefensiveStanceBody[], los: number): void {
  for (const body of bodies) {
    const spot = alignment.spots[body.slot];
    const corner = body.slot === 'CB_S' || body.slot === 'CB_W' || body.slot === 'NB' || body.slot === 'DB';
    if (!corner || !spot?.press || spot.role.kind !== 'man' || !spot.manTarget) continue;
    const occupied = bodies.flatMap(other => {
      if (other === body) return [];
      const radius = body.radius + other.radius, lateral = body.pos.y - other.pos.y;
      if (Math.abs(lateral) >= radius) return [];
      const half = Math.sqrt(radius * radius - lateral * lateral);
      return [{ low: other.pos.x - half, high: other.pos.x + half }];
    });
    const original = body.pos.x;
    const clear = (x: number) => occupied.every(({ low, high }) => x <= low || x >= high);
    if (clear(original)) continue;
    const minimum = los + body.radius;
    // Every boundary of the occupied intervals is a possible nearest stance.
    // Checking all teammates also prevents a front correction entering a
    // second player's body. Equally near depths retain the tighter cushion.
    const candidates = [minimum, ...occupied.flatMap(({ low, high }) => [low, high])]
      .filter(x => x >= minimum && clear(x));
    candidates.sort((a, b) => Math.abs(a - original) - Math.abs(b - original) || a - b);
    if (candidates.length) body.pos.x = candidates[0];
  }
}

/** Landmark for a zone (field coordinates). */
export function zoneLandmark(zone: ZoneId, off: OffenseAlignment): Vec2 {
  const s = off.strongSign;
  const los = off.los;
  const sideY = (sign: number, fromSideline: number) => (sign > 0 ? FIELD_WIDTH - fromSideline : fromSideline);
  const third = FIELD_WIDTH / 3;
  const depth = (yards: number) => los + coverageDepth(los, yards);
  switch (zone) {
    case 'deep_third_s':
      return { x: depth(16), y: sideY(s, third / 2 + 1.5) };
    case 'deep_third_w':
      return { x: depth(16), y: sideY(-s, third / 2 + 1.5) };
    case 'deep_mid':
      return { x: depth(15), y: clamp(off.ballY, third + 2, 2 * third - 2) };
    case 'tampa_mid':
      return { x: depth(13), y: off.ballY };
    case 'deep_half_s':
      return { x: depth(15), y: sideY(s, 13.5) };
    case 'deep_half_w':
      return { x: depth(15), y: sideY(-s, 13.5) };
    case 'quarter_s_out':
      return { x: depth(13), y: sideY(s, 8) };
    case 'quarter_w_out':
      return { x: depth(13), y: sideY(-s, 8) };
    case 'quarter_s_in':
      return { x: depth(12), y: off.ballY + s * 7 };
    case 'quarter_w_in':
      return { x: depth(12), y: off.ballY - s * 7 };
    case 'flat_s':
      return { x: depth(4), y: sideY(s, 9) };
    case 'flat_w':
      return { x: depth(4), y: sideY(-s, 9) };
    case 'curl_flat_s':
      return { x: depth(8.5), y: off.ballY + s * Math.min(12, Math.abs(sideY(s, 12) - off.ballY)) };
    case 'curl_flat_w':
      return { x: depth(8.5), y: off.ballY - s * Math.min(12, Math.abs(sideY(-s, 12) - off.ballY)) };
    case 'hook_s':
      return { x: depth(10), y: off.ballY + s * 5 };
    case 'hook_w':
      return { x: depth(10), y: off.ballY - s * 5 };
    case 'hook_mid':
      return { x: depth(10.5), y: off.ballY };
    case 'robber':
      return { x: depth(11), y: off.ballY };
    case 'hole':
      return { x: depth(6), y: off.ballY };
    case 'curl_s':
      return { x: depth(11), y: off.ballY + s * Math.min(9, Math.abs(sideY(s, 14) - off.ballY)) };
    case 'curl_w':
      return { x: depth(11), y: off.ballY - s * Math.min(9, Math.abs(sideY(-s, 14) - off.ballY)) };
  }
}

/** The zone of an underneath seat, and the role it gives the defender who fills it. */
export const seatZone = (seat: UnderSeat): ZoneId => (typeof seat === 'string' ? seat : seat.zone);
export const seatRole = (seat: UnderSeat): CoverageRole => (typeof seat === 'string' ? { kind: 'zone', zone: seat } : { kind: 'zone', ...seat });

/**
 * Receiver distribution as a coverage check sees it: 3x1, 2x2, empty and so
 * on (backs in the backfield don't count; an attached TE does).
 */
export function formationKey(off: OffenseAlignment): FormationKey {
  const strong = Math.max(off.counts.S, off.counts.W);
  const weak = Math.min(off.counts.S, off.counts.W);
  const backs = Object.values(off.spots).filter((p) => p.backfield && p.slot !== 'QB').length;
  if (backs === 0) return strong >= 4 ? '4x1' : 'empty';
  if (strong >= 4) return '4x1';
  if (strong === 3 && weak >= 2) return '3x2';
  if (strong === 3) return '3x1';
  if (strong === 2 && weak === 2) return '2x2';
  if (strong + weak <= 2) return 'heavy';
  return '2x1';
}

/** Compress planned spacing with the remaining scoring field. This changes
 * assignments/alignment only; it never clamps a moving player's position. */
export function coverageDepth(los: number, normalDepth: number): number {
  return Math.min(normalDepth, END_LINE_X - los - 1.2,
    Math.max(1.2, 0.6 * Math.max(0, OPP_GOAL_X - los) + 0.25 * normalDepth));
}

const DEEP_ZONES = new Set<ZoneId>(['deep_third_s', 'deep_third_w', 'deep_mid', 'deep_half_s', 'deep_half_w', 'quarter_s_out', 'quarter_s_in', 'quarter_w_in', 'quarter_w_out', 'tampa_mid']);
export const isDeepZone = (z: ZoneId): boolean => DEEP_ZONES.has(z);

export interface ManPreference {
  /** Defender slot → receiver slot overrides (coach shadow/bracket decisions). */
  overrides?: Partial<Record<DefSlot, SkillSlot>>;
}

/**
 * Align the defense to the offense. `present` lists the defensive slots on the
 * field. Returns spots with roles, man targets and zone landmarks resolved.
 */
/** DEF_ALIGN: a zone defensive back's depth and outward shade (negative =
 * inside) by his zone, as tracked by PFF assignment. A slot defender without
 * a named zone sits in a hook seat. */
export function zoneSpot(zone: ZoneId | undefined, slot: boolean): { depth: number; shade: number } {
  if (!zone) return slot ? { depth: 4.5, shade: -0.5 } : { depth: 7, shade: 0.7 };
  if (zone.startsWith('flat')) return { depth: 4, shade: 0.5 };
  if (zone.startsWith('deep_half')) return { depth: 8.2, shade: 0.1 };
  if (zone.startsWith('deep_third') || zone.endsWith('_out')) return { depth: 7.3, shade: 0.8 };
  if (zone.startsWith('curl_flat')) return { depth: 4.5, shade: 0 };
  if (zone.startsWith('hook') || zone.startsWith('curl') || zone === 'hole') return { depth: 4.5, shade: -0.5 };
  return slot ? { depth: 4.5, shade: -0.5 } : { depth: 7, shade: 0.7 };
}

/** The defense at the snap, aligned from the call's description (step 4: the description is the one source). */
export function alignDefense(call: DefensivePlayCall, off: OffenseAlignment, present: DefSlot[], prefs: ManPreference = {}, style: AlignStyle = {}): DefenseAlignment {
  return alignDefenseFromDescription(describeDefense(call), off, present, prefs, style);
}


/**
 * Disguised coverage: roles, man matchups and landmarks come from the real
 * call; the secondary and off-ball linebackers stand where the shown coverage
 * would put them and rotate at the snap. Linemen and blitzers align as played.
 * Press only survives if both looks press (you can't jam from 7 yards).
 */
