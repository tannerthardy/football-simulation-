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
import { CENTER_Y, END_LINE_X, FIELD_WIDTH, OPP_GOAL_X } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import type { Coverage, CoverageRole, DefSlot, DefensivePlayCall, Formation, Gap, OffSlot, PassConcept, ReceiverRef, Side, SkillSlot, Technique, ZoneId, UnderSeat, FormationKey } from './types.js';
import { sideSign } from './types.js';
import { GUN_QB_DEPTH, PISTOL_QB_DEPTH, UNDER_TAILBACK_EXTRA } from './formations.js';

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
const OL_STAGGER = process.env.OL_STAGGER !== '0';
/** Center-guard, guard-tackle and tackle-to-inline-end splits (yd between
 * body centres) of one snap's line. */
export interface LineSplits { cg: number; gt: number; tte: number }
const BASE_LINE: LineSplits = OL_SPLITS ? { cg: 1.54, gt: 1.56, tte: 1.52 } : { cg: 1.3, gt: 1.3, tte: 1.3 };
/** OL_SPLITS: on third or fourth down and a yard or less the line tightens
 * against penetration (tracked tackle to tackle 5.85 yd against 6.2; on first
 * and second down and a yard it does not). Splits do not otherwise change with
 * the call: tracked zone, gap and dropback splits agree within 0.05 yd. */
const SHORT_LINE: LineSplits = { cg: 1.45, gt: 1.47, tte: 1.43 };
export const tackleOf = (l: LineSplits) => OL_SPLITS ? l.cg + l.gt : 2.6;
export const inlineOf = (l: LineSplits) => OL_SPLITS ? tackleOf(l) + l.tte : 3.9;
// A wing stands 1.32 yd outside the attached end: the median lateral offset
// of the 682 off-line players within 2.5 yd outside a single attached TE with a
// defender on the line beside them (2022 tracking, weeks 1-6, SNAP frames;
// scripts/diag/align/nfl_wing.py, its "true wings" cohort).
const wingOf = (l: LineSplits) => OL_SPLITS ? inlineOf(l) + 1.32 : 4.8;
const FLAT_DEPTH = .55;
type LineSlot = 'LT' | 'LG' | 'C' | 'RG' | 'RT';
/** OL_STAGGER: guards and tackles stand deeper on a dropback (tracked tackles
 * 1.10, 1.17 on third or fourth and long; guards 0.90) than on a run (0.97,
 * 0.82). Without a call, the all-snap depths. */
function olDepth(ctx: AlignContext): Record<LineSlot, number> {
  if (!OL_STAGGER) return { LT: FLAT_DEPTH, LG: FLAT_DEPTH, C: FLAT_DEPTH, RG: FLAT_DEPTH, RT: FLAT_DEPTH };
  const long = (ctx.down ?? 1) >= 3 && (ctx.distance ?? 10) >= 7;
  const [g, t] = ctx.kind === 'pass' ? [.9, long ? 1.17 : 1.1] : ctx.kind === 'run' ? [.82, .97] : [.83, .98];
  return { LT: t, LG: g, C: .43, RG: g, RT: t };
}
/** OL_STAGGER: an inline end's tracked depth (formations install 0.6). */
const INLINE_DEPTH = 1.19;
/** RECEIVER_DEPTH (experimental, off): receivers on the line stand where
 * tracked receivers do, measured from the ball (BDB 2025 weeks 1-3, non-PA
 * dropbacks, body centre behind the tracked football at the snap, with no
 * defender within 2 yd in front of him): an outside receiver 0.74 yd
 * (n 3,537), a tight end 0.83 (n 1,500). Off-line receivers keep their
 * installed depth. See PRESS_BACKOFF for a receiver facing a press look. */
export const RECEIVER_DEPTH = process.env.RECEIVER_DEPTH !== '0';
const WR_LINE_DEPTH = 0.74;
const TE_LINE_DEPTH = 0.83;
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
const WR_ALIGN = process.env.WR_ALIGN !== '0';
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
/** TE_OFF (default off): on a zone run call an attached end sometimes sets
 * off the ball beside the tackle (a wing), with the wide receiver on his side
 * moving up onto the line so seven stay on it. Tracked 2022 zone runs: 0.43
 * tight ends a snap stand 0.75 yd or more behind the line beside the tackle
 * (mostly 1.0-1.25 yd behind it, 1-2 yd outside the tackle) against 0.83
 * attached; installed formations set none. The pick is a hash of the slot and
 * the ball spot, not a draw from the play's stream. */
export const TE_OFF = process.env.TE_OFF !== '0';
const TE_OFF_SHARE = .58, TE_OFF_DEPTH = 1.1;
function spotHash(...parts: (string | number)[]): number {
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
const ROUTE_ROOM: Record<string, [number, number]> = {
  go: [10.9, 10], fade: [10.9, 10], comeback: [10.9, 10], slant: [10.2, 9.9],
  hitch: [14, 10.6], quick_hitch: [14, 10.6], curl: [14, 10.6], stick: [14, 10.6], hook: [14, 10.6],
  short_in: [14.6, 10.4], dig: [14.6, 10.4], post: [14.6, 11.2], seam: [14.6, 11.2],
  quick_out: [14.7, 15.8], out: [14.7, 15.8], deep_out: [14.7, 15.8], corner: [15.4, 15.3],
  shallow: [15.8, 16.8], shallow_high: [15.8, 16.8], mesh_under: [15.8, 16.8], cross: [15.8, 16.8], flat: [15.1, 17.6], arrow: [15.1, 17.6],
};
// SCREEN_QB: the tunnel screen's #1 keeps the room of a vertical stem, to come back under it: 10.9 yd to his sideline
// (BDB 2025 WR-in screens, n 23, all with another receiver on his side; screen_tunnel_path.py). Off: the default room.
if (process.env.SCREEN_QB === '1') ROUTE_ROOM.tunnel = [10.9, 10.9];
const RUN_ROOM: [number, number] = [15, 10.8];
const ANY_ROOM: [number, number] = [13.5, 11];

/** Split of the widest receiver on a side from the ball. `detached` counts
 * that side's detached receivers and `room` is the #1's room to his sideline
 * [alone, with others] (used by WR_ALIGN only). */
function wideOffset(ballY: number, sign: number, detached = 1, room: [number, number] = ANY_ROOM, habit = 0): number {
  const toSideline = sign > 0 ? FIELD_WIDTH - ballY : ballY;
  if (WR_ALIGN) return Math.max(8, toSideline - (detached >= 2 ? room[1] : room[0]) - habit);
  return Math.max(9, Math.min(18, toSideline - 6));
}

export function alignOffense(formation: Formation, flip: boolean, los: number, ballY: number, ctx: AlignContext = {}): OffenseAlignment {
  const spots: Record<string, OffSpot> = {};
  const fside = (s: Side | 'C'): Side | 'C' => (s === 'C' ? 'C' : flip ? (s === 'L' ? 'R' : 'L') : s);

  const set = OL_SPLITS && (ctx.down ?? 1) >= 3 && (ctx.distance ?? 10) <= 1 ? SHORT_LINE : BASE_LINE;
  const w = OL_SPLITS ? 1 + (ctx.style?.olWidth ?? 0) : 1;
  const line: LineSplits = w === 1 ? set : { cg: set.cg * w, gt: set.gt * w, tte: set.tte * w };
  const T = tackleOf(line), olOff: Record<LineSlot, number> = OL_SPLITS
    ? { LT: T, LG: line.cg, C: 0, RG: -line.cg, RT: -T } : { LT: 2.6, LG: 1.3, C: 0, RG: -1.3, RT: -2.6 };
  const depthOf = olDepth(ctx);
  for (const [slot, off] of Object.entries(olOff)) {
    spots[slot] = { slot: slot as OffSlot, pos: { x: los - depthOf[slot as LineSlot], y: ballY + off }, side: off > 0 ? 'L' : off < 0 ? 'R' : 'C', backfield: false, inline: false, onLine: true };
  }
  // Under center the QB's body is ~1.7 yd behind the line (NFL tracking at the snap): the center is in between.
  const qbDepth = formation.qb === 'under' ? 1.6 : formation.qb === 'pistol' ? PISTOL_QB_DEPTH : GUN_QB_DEPTH;
  spots.QB = { slot: 'QB', pos: { x: los - qbDepth, y: ballY }, side: 'C', backfield: true, inline: false, onLine: false };

  // First pass: wide/inline/wing/fixed; second pass: slots (need #1 position).
  const entries = Object.entries(formation.slots) as Array<[SkillSlot, NonNullable<Formation['slots'][SkillSlot]>]>;
  const offsets: Partial<Record<SkillSlot, number>> = {};
  const detachedOn = (side: Side | 'C') => entries.filter(([, e]) => fside(e.side) === side
    && (e.split === 'wide' || e.split === 'slot' || e.split === 'slot2')).length;
  // WR_ALIGN: the #1's route on each side. The strong side by the rule below
  // (more receivers, then the tight end, then the field), from the formation.
  const onSide = (side: Side) => entries.filter(([, e]) => fside(e.side) === side
    && !(typeof e.split === 'number' && e.depth >= 3 && Math.abs(e.split) < 3.5));
  const nL = onSide('L').length, nR = onSide('R').length;
  const teL = onSide('L').some(([, e]) => e.split === 'inline'), teR = onSide('R').some(([, e]) => e.split === 'inline');
  const early: Side = nL !== nR ? (nL > nR ? 'L' : 'R') : teL !== teR ? (teL ? 'L' : 'R') : ballY < CENTER_Y ? 'L' : 'R';
  const roomOn = (side: Side | 'C'): [number, number] => {
    if (side === 'C' || !ctx.kind) return ANY_ROOM;
    if (ctx.kind === 'run') return RUN_ROOM;
    const route = (side === early ? ctx.pass?.strong : ctx.pass?.weak)?.[1];
    return (route && ROUTE_ROOM[route]) || ANY_ROOM;
  };
  for (const [slot, a] of entries) {
    const side = fside(a.side);
    const sign = side === 'C' ? 0 : sideSign(side);
    let off: number | null = null;
    if (typeof a.split === 'number') off = a.split * (sign || 1) * (side === 'C' ? 0 : 1);
    else if (a.split === 'wide') off = wideOffset(ballY, sign, detachedOn(side), roomOn(side), ctx.style?.wrRoom) * sign;
    else if (a.split === 'inline') off = inlineOf(line) * sign;
    else if (a.split === 'wing') off = wingOf(line) * sign;
    else if (a.split === 'core') off = 0;
    if (off !== null) offsets[slot] = off;
  }
  for (const [slot, a] of entries) {
    if (offsets[slot] !== undefined) continue;
    const side = fside(a.side);
    const sign = side === 'C' ? 1 : sideSign(side);
    // Slot receivers split the difference between the tackle and the widest receiver.
    let widest = wideOffset(ballY, sign, detachedOn(side), roomOn(side), ctx.style?.wrRoom);
    for (const [s2, o2] of Object.entries(offsets)) {
      if (o2 !== undefined && Math.sign(o2) === sign && Math.abs(o2) > 6) widest = Math.max(widest, Math.abs(o2));
      void s2;
    }
    if (WR_ALIGN) {
      // Tracked: a #2 stands at 0.58 of the #1's split (0.62 in trips), a #3 at 0.40.
      const share = a.split === 'slot2' ? 0.40 : detachedOn(side) >= 3 ? 0.62 : 0.58;
      offsets[slot] = Math.max(a.split === 'slot2' ? 4.6 : 5.5, widest * share) * sign;
      continue;
    }
    const slotOff = Math.max(5.5, widest * 0.45 + 0.5);
    offsets[slot] = (a.split === 'slot2' ? Math.max(4.6, slotOff * 0.62) : slotOff) * sign;
  }
  // TE_OFF: which attached ends set off the ball, and the wide receiver who
  // comes up onto the line outside each of them.
  const offEnd = new Set<SkillSlot>(), upWide = new Set<SkillSlot>();
  if (TE_OFF && ctx.run && ['insideZone', 'outsideZone', 'wideZone'].includes(ctx.run.scheme)) for (const [slot, a] of entries) {
    if (a.split !== 'inline') continue;
    const side = fside(a.side);
    if (entries.some(([s2, e]) => s2 !== slot && e.split === 'inline' && fside(e.side) === side)) continue;
    const wide = entries.find(([, e]) => e.split === 'wide' && fside(e.side) === side);
    if (!wide || spotHash(slot, los.toFixed(2), ballY.toFixed(2)) >= TE_OFF_SHARE) continue;
    offEnd.add(slot); upWide.add(wide[0]);
  }
  const olMean = (Object.values(depthOf) as number[]).reduce((t, v) => t + v, 0) / 5;
  for (const [slot, a] of entries) {
    const off = offsets[slot] ?? 0;
    const side = fside(a.side);
    const backfield = a.depth >= 3 && Math.abs(off) < 3.5;
    const onLine = !backfield && (upWide.has(slot) || a.depth <= 0.6 + 1e-9);
    const depth = offEnd.has(slot) ? olMean + TE_OFF_DEPTH
      : RECEIVER_DEPTH && onLine ? (a.split === 'inline' ? TE_LINE_DEPTH : WR_LINE_DEPTH)
      : upWide.has(slot) ? Math.min(a.depth, 0.6)
      : OL_STAGGER && a.split === 'inline' ? INLINE_DEPTH : a.depth + (!backfield ? 0 : formation.qb === 'gun' ? GUN_QB_DEPTH - 5.0 : formation.qb === 'under' && a.depth >= 6 ? UNDER_TAILBACK_EXTRA : 0);
    spots[slot] = {
      slot,
      pos: { x: los - depth, y: clamp(ballY + off, 1, FIELD_WIDTH - 1) },
      side,
      backfield,
      inline: a.split === 'inline' && !offEnd.has(slot),
      // TE_OFF: an end set off the ball is a back; the wide receiver brought up outside him is on the line.
      onLine: onLine && !offEnd.has(slot),
    };
  }

  // Receiver numbering per side, outside-in, excluding backfield players.
  const bySide: Record<Side, Array<{ slot: SkillSlot; off: number }>> = { L: [], R: [] };
  for (const [slot] of entries) {
    const sp = spots[slot];
    if (sp.backfield) continue;
    const off = sp.pos.y - ballY;
    bySide[off >= 0 ? 'L' : 'R'].push({ slot, off: Math.abs(off) });
  }
  bySide.L.sort((a, b) => b.off - a.off);
  bySide.R.sort((a, b) => b.off - a.off);

  const teSide = (s: Side) => bySide[s].some((r) => spots[r.slot].inline);
  let strong: Side;
  if (bySide.L.length !== bySide.R.length) strong = bySide.L.length > bySide.R.length ? 'L' : 'R';
  else if (teSide('L') !== teSide('R')) strong = teSide('L') ? 'L' : 'R';
  else strong = ballY < CENTER_Y ? 'L' : 'R'; // field side is the wider side
  const weak: Side = strong === 'L' ? 'R' : 'L';

  const numbering: OffenseAlignment['numbering'] = {};
  const refOf: OffenseAlignment['refOf'] = {};
  bySide[strong].forEach((r, i) => {
    const ref = `S${i + 1}` as ReceiverRef;
    numbering[ref] = r.slot;
    refOf[r.slot] = ref;
  });
  bySide[weak].forEach((r, i) => {
    const ref = `W${i + 1}` as ReceiverRef;
    numbering[ref] = r.slot;
    refOf[r.slot] = ref;
  });
  const backs = entries.filter(([slot]) => spots[slot].backfield).map(([slot]) => slot);
  // RB is the primary back; FB second.
  backs.sort((a, b) => (a === 'RB' ? -1 : b === 'RB' ? 1 : 0));
  if (backs[0]) {
    numbering.B = backs[0];
    refOf[backs[0]] = 'B';
  }
  if (backs[1]) {
    numbering.B2 = backs[1];
    refOf[backs[1]] = 'B2';
  }

  const strongSign = sideSign(strong);
  if (formation.qb === 'gun' && ctx.run && ((STRETCH_OFFSET && (ctx.run.scheme === 'outsideZone' || ctx.run.scheme === 'wideZone'))
    || (IZ_OFFSET && (ctx.run.scheme === 'insideZone' || ctx.run.scheme === 'splitZone'))
    || (COUNTER_OFFSET && ctx.run.scheme === 'counter'))) {
    const play = ctx.run.direction === 'strong' ? strongSign : -strongSign;
    for (const sp of Object.values(spots)) if (sp.backfield && sp.slot !== 'QB' && (sp.pos.y - ballY) * play > 1)
      sp.pos = { x: sp.pos.x, y: clamp(2 * ballY - sp.pos.y, 1, FIELD_WIDTH - 1) };
  }
  const coreEdge = {
    S: ballY + strongSign * (teSide(strong) ? inlineOf(line) : T),
    W: ballY - strongSign * (teSide(weak) ? inlineOf(line) : T),
  };

  return {
    los,
    ballY,
    spots,
    numbering,
    refOf,
    strong,
    strongSign,
    coreEdge,
    line,
    hasTE: { S: teSide(strong), W: teSide(weak) },
    counts: { S: bySide[strong].length, W: bySide[weak].length },
  };
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

export function alignDefense(call: DefensivePlayCall, off: OffenseAlignment, present: DefSlot[], prefs: ManPreference = {}, style: AlignStyle = {}): DefenseAlignment {
  if (call.shown && call.shown.id !== call.coverage.id) return alignDisguised(call, off, present, prefs, style);
  const s = off.strongSign;
  const los = off.los;
  const cov = call.coverage;
  const spots: Partial<Record<DefSlot, DefSpot>> = {};
  const has = (slot: DefSlot) => present.includes(slot);
  // FRONT_STRENGTH: the front's own strong side; `s` stays the coverage's.
  const fs = frontSign(call, off), flipFront = fs !== s;
  const teAt = (sign: number) => sign === s ? off.hasTE.S : off.hasTE.W;

  // --- front ---
  const frontSlots = call.front.slots;
  // FRONT_ALIGN: each side's end man (the widest defender on the line) sets
  // the edge; his technique comes from the call against the look and his build.
  const edgeTech = new Map<DefSlot, Technique>(), edgeShift = new Map<DefSlot, number>();
  // Vs a pair the 9 is the end's outside shoulder, inside the wing.
  const pairShade = new Set<DefSlot>();
  const sideSign = (side: 'S' | 'W') => side === 'S' ? fs : -fs;
  // A wing: an attached receiver just outside the inline end, off the ball.
  const wingOn = (side: 'S' | 'W') => Object.values(off.spots).find(sp => !sp.inline && !sp.backfield
    && !OL_SLOTS.has(sp.slot) && (sp.pos.y - off.ballY) * sideSign(side) > inlineOf(off.line) + .3
    && (sp.pos.y - off.ballY) * sideSign(side) < inlineOf(off.line) + 2 && los - sp.pos.x < 2.5);
  // A back offset to that side (installs: "near"), not behind the QB or away.
  const nearBack = (side: 'S' | 'W') => Object.values(off.spots).some(sp => sp.backfield && sp.slot !== 'QB'
    && (sp.pos.y - off.ballY) * sideSign(side) > .5);
  // Nickel and dime calls; a 3-4 has no LB_S slot but is a base front.
  const nickel = call.personnel ? call.personnel === 'nickel' || call.personnel === 'dime' : !present.includes('LB_S');
  if (FRONT_ALIGN) for (const side of ['S', 'W'] as const) {
    const onLine = present.filter(slot => frontSlots[slot]?.side === side && frontSlots[slot]!.depth < 2);
    const hasTE = teAt(sideSign(side));
    const end = onLine.sort((a, b) => techniqueOffset(frontSlots[b]!.tech, hasTE, off.line) - techniqueOffset(frontSlots[a]!.tech, hasTE, off.line))[0];
    if (!end) continue;
    // NICKEL_FRONTS: a side whose widest man on the line is an inside
    // technique has no edge by design (the Mint's weak C-gap bubble, filled
    // by a backer): he keeps his technique rather than becoming the end.
    if (NICKEL_FRONTS_ALIGN && ['0', '1', '2i', '2', '3', '4i'].includes(frontSlots[end]!.tech)) continue;
    let tech = frontSlots[end]!.tech;
    if (call.edge) tech = hasTE ? EDGE_CALL_TE[call.edge] : call.edge === 'tight' ? '9' : 'w9';
    // With no end there a 6 or 7 is a ghost: he stands where the end would.
    else if (!hasTE) tech = tech === '6' || tech === '7' ? '9' : EDGE_TECH.includes(tech) ? tech : 'w9';
    // Installs (2017 Colts pp. 13, 79): vs a pair of ends the end plays a 9;
    // in nickel ("Auto") a 6 vs a near back, a 9 vs a dot or far back. Base
    // fronts keep their own map, at least on the end.
    else if (wingOn(side)) { tech = '9'; pairShade.add(end); }
    else if (nickel && end.startsWith('DE')) tech = nearBack(side) ? '6' : '9';
    else if (!EDGE_TECH.includes(tech)) tech = '6';
    edgeTech.set(end, tech);
    // His build moves his feet within his technique, not into the next one,
    // and never inside a tight end he is set on (a wide nine has room to
    // come in). Half the tracked slope: light ends also draw the wide calls.
    const mass = style.mass?.[end];
    if (pairShade.has(end)) edgeShift.set(end, inlineOf(off.line) + SHOULDER - techniqueOffset(tech, true, off.line));
    else if (mass !== undefined) edgeShift.set(end, Math.max(clamp(-.025 * (mass - 118), tech === 'w9' ? -.4 : -.2, .4),
      hasTE ? -techniqueOffset(tech, true, off.line) + inlineOf(off.line) : -Infinity));
  }
  for (const slot of present) {
    const fa = frontSlots[slot];
    if (!fa) continue;
    const sign = sideSign(fa.side);
    const hasTE = teAt(sign);
    const tech = edgeTech.get(slot) ?? fa.tech;
    const lateral = FRONT_ALIGN && AGAP_ALIGN && tech === '1' && fa.depth < 2
      ? (style.aGap ?? AGAP_LEAGUE) * off.line.cg
      : techniqueOffset(tech, hasTE, off.line) + (edgeShift.get(slot) ?? 0);
    const y = off.ballY + sign * lateral;
    const fit = call.front.fits?.[slot];
    spots[slot] = { slot, pos: { x: los + fa.depth, y }, role: { kind: 'rush' },
      gap: fit?.gap ?? techniqueGap(fa.tech, FIT_TE_GAP && hasTE), gapSign: fit ? sideSign(fit.side) : sign };
    const rushGap = fit?.gap ?? techniqueGap(fa.tech);
    if (FIT_TE_GAP && rushGap !== spots[slot]!.gap) spots[slot]!.rushGap = rushGap;
  }

  // FRONT_MENU: off-ball backers by the front's family and their number.
  const backerSpots = FRONT_MENU ? BACKERS[FAMILY[call.front.id] ?? ''] : undefined;
  // SAM_ON_TE (experimental, off): a "Sam on" call walks the Over/Even Sam
  // onto the line on an attached tight end's outside shoulder, a front man
  // like the Under's 9; the Mike and Will are then the two off-ball backers.
  // Not against a wing (handled below) or a detached #2 (the apex).
  const s2 = off.numbering.S2;
  const samOnTE = SAM_ON_TE && !!call.samOn && FRONT_ALIGN && (call.front.id === 'over' || call.front.id === 'even')
    && !!spots.LB_S && !!frontSlots.LB_S && frontSlots.LB_S.depth > 2 && teAt(fs) && !wingOn('S')
    && !(!has('NB') && !flipFront && off.counts.S >= 2 && !!s2 && !off.spots[s2].inline);
  const offBall = (['LB_W', 'LB_M', 'LB_S'] as DefSlot[]).filter(slot => spots[slot] && frontSlots[slot]!.depth > 2 && !(samOnTE && slot === 'LB_S'));
  const table = backerSpots?.[offBall.length as 1 | 2 | 3];
  if (table) {
    const G = OL_SPLITS ? off.line.cg : 1.3, T = tackleOf(off.line);
    const across = (u: number) => {
      const a = Math.abs(u), sign = u >= 0 ? fs : -fs;
      const out = a <= 1 ? a * G : a <= 2 ? G + (a - 1) * (T - G) : T + (a - 2) * (teAt(sign) ? inlineOf(off.line) - T : T - G);
      return off.ballY + sign * out;
    };
    // Weak to strong: the Will takes the weakest spot, the Sam the strongest.
    offBall.forEach((slot, i) => { const [u, depth] = table[i]; spots[slot]!.pos = { x: los + depth, y: across(u) }; });
    // A mug walks a backer into an A gap no lineman occupies, at the tracked
    // 1.2 yd: the Mike first, to the strong side when both are open.
    if (call.mug) {
      const lined = present.filter(slot => frontSlots[slot] && frontSlots[slot]!.depth < 2 && !slot.startsWith('LB'));
      const open = [fs, -fs].filter(sign => !lined.some(slot => {
        const u = (spots[slot]!.pos.y - off.ballY) * sign / G;
        return u > -.25 && u < .9;
      }));
      const muggers = (['LB_M', 'LB_W'] as DefSlot[]).filter(slot => offBall.includes(slot)).slice(0, Math.min(call.mug, open.length));
      muggers.forEach((slot, i) => { spots[slot]!.pos = { x: los + 1.2, y: off.ballY + open[i] * .5 * G }; });
    }
  }

  // --- receivers by side for DB alignment ---
  const rec = (ref: ReceiverRef) => {
    const slot = off.numbering[ref];
    return slot ? off.spots[slot].pos : null;
  };
  const shell = cov.look ?? cov.shell;
  const cornerDepth = cov.press ? 1.2 : shell === 'one-high' ? 7 : 6;
  /** DEF_ALIGN: a defensive back's depth and outward shade (negative =
   * inside) on the receiver he aligns over, from his role in the call. */
  const dbSpot = (slot: DefSlot, r: Vec2, sign: number): { depth: number; shade: number } => {
    const role = cov.roles[slot];
    const spot = role?.kind === 'man' || (!role && cov.man)
      ? (cov.press || (role?.kind === 'man' && role.press) ? { depth: 1.3, shade: 0.15 }
        : { depth: 6, shade: role?.kind === 'man' && role.lev === 'outside' ? 0.5 : role?.kind === 'man' && role.lev === 'head' ? 0 : -0.2 })
      : zoneSpot(role?.kind === 'zone' ? role.zone : undefined, slot === 'NB' || slot === 'DB');
    // The team's habit moves its outside zone corners deeper or tighter.
    if (role?.kind === 'zone' && slot.startsWith('CB')) {
      const z = role.zone;
      const job: DepthJob | null = z.startsWith('flat') ? 'flatCB' : z.startsWith('deep_third') ? 'thirdCB' : z.endsWith('_out') ? 'quarterCB' : null;
      spot.depth = Math.max(1.3, spot.depth + (style.cbDepth ?? 0) + (job ? situationDepth(job, style.situation) : 0));
    }
    const room = sign > 0 ? FIELD_WIDTH - r.y : r.y;
    if (room < 9) spot.shade = Math.min(spot.shade, -0.2);
    return spot;
  };

  const placeCorner = (slot: DefSlot, side: 'S' | 'W') => {
    if (!has(slot)) return;
    const sign = side === 'S' ? s : -s;
    // A nub side (only an attached end) has no #1 for the corner: he aligns
    // as the nub-side corner, wide and off, as with no receiver at all.
    const s1 = off.numbering[`${side}1` as ReceiverRef];
    const r1 = s1 && !off.spots[s1].inline ? rec(`${side}1` as ReceiverRef) : null;
    const spot = DEF_ALIGN && r1 ? dbSpot(slot, r1, sign) : null;
    const y = r1 ? (spot ? r1.y + sign * spot.shade : r1.y - sign * (cov.press ? 0.6 : shell === 'one-high' ? -0.8 : 0.8)) : off.ballY + sign * 14;
    spots[slot] = { slot, pos: { x: los + (spot?.depth ?? cornerDepth), y: clamp(y, 1, FIELD_WIDTH - 1) }, role: { kind: 'rush' }, gap: 'D', gapSign: sign, press: cov.press };
  };
  placeCorner('CB_S', 'S');
  placeCorner('CB_W', 'W');

  // Nickel over the strong slot (or apex if none); dime over the weak slot.
  const placeSlotDB = (slot: DefSlot, side: 'S' | 'W') => {
    if (!has(slot)) return;
    const sign = side === 'S' ? s : -s;
    const r2 = rec(`${side}2` as ReceiverRef);
    const apex = off.ballY + sign * 6.5;
    const detachedSlot = r2 && !off.spots[off.numbering[`${side}2` as ReceiverRef]!].inline;
    const spot = DEF_ALIGN && detachedSlot ? dbSpot(slot, r2, sign) : null;
    const y = detachedSlot ? r2.y + sign * (spot ? spot.shade : -0.8) : apex;
    spots[slot] = { slot, pos: { x: los + (spot?.depth ?? (cov.press ? 1.5 : 5)), y }, role: { kind: 'rush' }, gap: 'D', gapSign: sign, press: cov.press };
  };
  // The nickel goes to the side with a detached slot: vs. an inline TE and a
  // flanker on the strong side, the slot is usually to the weak side.
  const detached = (side: 'S' | 'W') => {
    const r = off.numbering[`${side}2` as ReceiverRef];
    return !!r && !off.spots[r].inline;
  };
  const nickelSide: 'S' | 'W' = !detached('S') && detached('W') ? 'W' : 'S';
  placeSlotDB('NB', nickelSide);
  placeSlotDB('DB', nickelSide === 'S' ? 'W' : 'S');

  // Safeties by shell.
  if (has('FS') || has('SS')) {
    if (shell === 'two-high') {
      // DEF_ALIGN: halves or quarters by the safety's role, held on the field.
      const deep = (slot: 'SS' | 'FS', sign: number): Vec2 => {
        if (!DEF_ALIGN) return { x: los + 12, y: off.ballY + sign * 9 };
        const r = cov.roles[slot], quarters = r?.kind === 'zone' && r.zone.startsWith('quarter');
        const [depth, width, follow] = quarters ? [12, 6.65, 0.45] : [14, 6.9, 0.36];
        const sit = situationDepth(quarters ? 'quarter' : 'half', style.situation);
        return { x: los + depth + (style.safetyDepth ?? 0) + sit, y: CENTER_Y + follow * (off.ballY - CENTER_Y) + sign * width };
      };
      if (has('SS')) spots.SS = { slot: 'SS', pos: deep('SS', s), role: { kind: 'rush' }, gap: 'D', gapSign: s };
      if (has('FS')) spots.FS = { slot: 'FS', pos: deep('FS', -s), role: { kind: 'rush' }, gap: 'D', gapSign: -s };
    } else {
      const fs = DEF_ALIGN ? { x: los + (cov.man ? 14.7 : 14.5) + (style.safetyDepth ?? 0) + situationDepth('post', style.situation), y: CENTER_Y + (cov.man ? 0.34 : 0) * (off.ballY - CENTER_Y) }
        : { x: los + 13, y: clamp(off.ballY, 18, FIELD_WIDTH - 18) };
      // The post is whichever safety the call makes the deep player (the
      // Lurk's SS); the other is the down safety.
      const deepRole = (slot: DefSlot) => { const r = cov.roles[slot]; return r?.kind === 'zone' && isDeepZone(r.zone); };
      const [post, low]: DefSlot[] = deepRole('SS') && !deepRole('FS') ? ['SS', 'FS'] : ['FS', 'SS'];
      if (has(post)) spots[post] = { slot: post, pos: fs, role: { kind: 'rush' }, gap: 'A', gapSign: -s };
      // BOX_ALIGN: the down safety at his tracked spot outside the strong
      // side's end of the line (an attached end or the tackle).
      const uc = (off.spots.QB?.pos.x ?? los - 5) > los - 2.5, te = off.hasTE.S;
      const down = BOX_ALIGN ? { depth: te ? (uc ? 4.4 : 5.2) : (uc ? 5.1 : 5.8), out: te ? 1.5 : uc ? 2.7 : 3.9 } : { depth: 7.5, out: 3 };
      if (has(low)) spots[low] = { slot: low, pos: { x: los + down.depth, y: off.coreEdge.S + s * down.out }, role: { kind: 'rush' }, gap: 'D', gapSign: s };
    }
  }

  // LBs without front alignment (shouldn't happen, but keep them sane).
  for (const slot of present) {
    if (!spots[slot]) spots[slot] = { slot, pos: { x: los + 5, y: off.ballY }, role: { kind: 'rush' }, gap: 'A', gapSign: s };
  }

  // Off-ball LBs walk out to apex vs. spread looks in two-high shells.
  let apex = false;
  // FRONT_STRENGTH: the backer on the receivers' side, the Will when the
  // front sets the other way.
  const apexLB: DefSlot = flipFront ? 'LB_W' : 'LB_S';
  // Zone calls only: in a man call each defender aligns on his man below.
  if (!cov.man && !has('NB') && off.counts.S >= 2 && has(apexLB) && frontSlots[apexLB] && frontSlots[apexLB]!.depth > 2) {
    const r2 = rec('S2');
    // Against trips he splits #2 and a detached #3, not #2 and the core.
    const s3 = off.numbering.S3, r3 = s3 && !off.spots[s3].inline && !off.spots[s3].backfield ? off.spots[s3].pos : null;
    if (r2 && !off.spots[off.numbering.S2!].inline) { spots[apexLB]!.pos = { x: los + 4.5, y: (r2.y + (r3?.y ?? off.coreEdge.S)) / 2 }; apex = !flipFront; }
  }
  // FRONT_ALIGN: the Over Sam is a "90", the end's outside shade at
  // linebacker depth; a wing is attached, not spread, so vs one he tightens
  // to the line head-up on him (2017 Colts p. 77). A detached #2 keeps the apex.
  if (FRONT_ALIGN && call.front.id === 'over' && spots.LB_S && teAt(fs)) {
    const wing = wingOn('S'), sam = spots.LB_S;
    if (wing) sam.pos = { x: los + (frontSlots.DE_S?.depth ?? .9), y: wing.pos.y };
    // Lateral only: his depth is the front's (or FRONT_MENU's tracked) backer depth.
    else if (!apex) sam.pos = { x: sam.pos.x, y: off.ballY + fs * (inlineOf(off.line) + SHOULDER) };
  }
  if (samOnTE) spots.LB_S!.pos = { x: los + SAM_ON_DEPTH, y: off.ballY + fs * (inlineOf(off.line) + SHOULDER) };

  // BOX_ALIGN: answer every detached inside receiver in a zone call.
  if (BOX_ALIGN && !cov.man) {
    const blitzing = new Set(Object.keys(call.pressure?.blitzers ?? {}));
    // A backer walked out to one receiver is spent: the next receiver takes
    // the next-nearest backer (the Mike against trips), not the same one back.
    const walked = new Set<DefSlot>();
    for (const side of ['W', 'S'] as const) {
      const sign = side === 'S' ? s : -s;
      for (const i of [2, 3]) {
        const slot = off.numbering[`${side}${i}` as ReceiverRef];
        if (!slot || off.spots[slot].inline || off.spots[slot].backfield) continue;
        const y2 = (off.spots[slot].pos.y - off.ballY) * sign;
        const inner = off.numbering[`${side}${i + 1}` as ReceiverRef];
        const next = inner && !off.spots[inner].inline && !off.spots[inner].backfield
          ? (off.spots[inner].pos.y - off.ballY) * sign : (off.coreEdge[side] - off.ballY) * sign;
        const answer = Object.values(spots).find(sp => {
          const depth = sp!.pos.x - los, y = (sp!.pos.y - off.ballY) * sign;
          return depth < 8 && (Math.abs(y - y2) < 1.5 || (depth > 1 && y > next + .5 && y < y2 - 1.5));
        });
        // The backer already answering him is spent on him as well.
        if (answer) { if (answer.slot.startsWith('LB')) walked.add(answer.slot); continue; }
        const apexY = off.ballY + sign * (y2 + next) / 2;
        const backer = (['LB_W', 'LB_M', 'LB_S'] as DefSlot[]).filter(lb => spots[lb] && frontSlots[lb] && frontSlots[lb]!.depth > 2
          && spots[lb]!.pos.x - los > 2 && !blitzing.has(lb) && !walked.has(lb))
          .sort((a, b) => Math.abs(spots[a]!.pos.y - apexY) - Math.abs(spots[b]!.pos.y - apexY))[0];
        if (backer) { spots[backer]!.pos = { x: los + 4.6, y: apexY }; walked.add(backer); }
      }
    }
  }

  // BOX_ALIGN: end men widen on passing downs; backers' depth by down and distance.
  const sit = style.situation;
  if (BOX_ALIGN && sit && sit.down >= 3 && sit.distance >= 3) for (const sign of [fs, -fs]) {
    const end = present.filter(slot => frontSlots[slot] && frontSlots[slot]!.depth < 2 && spots[slot]
      && (spots[slot]!.pos.y - off.ballY) * sign > 0 && spots[slot]!.pos.x - los < 2)
      .sort((a, b) => (spots[b]!.pos.y - spots[a]!.pos.y) * sign)[0];
    if (end) spots[end]!.pos = { x: spots[end]!.pos.x, y: spots[end]!.pos.y + sign * .4 };
  }
  if (BOX_ALIGN && sit && sit.down >= 3 && (sit.distance <= 2 || sit.distance >= 7)) {
    const shift = sit.distance <= 2 ? -.5 : .5;
    for (const lb of ['LB_W', 'LB_M', 'LB_S'] as DefSlot[])
      if (spots[lb] && spots[lb]!.pos.x - los > 2.5) spots[lb]!.pos = { x: spots[lb]!.pos.x + shift, y: spots[lb]!.pos.y };
  }

  // --- roles ---
  const roles: Partial<Record<DefSlot, CoverageRole>> = {};
  const pressure = call.pressure;
  const blitzers = new Set<DefSlot>();
  if (pressure) {
    // Sides are the coverage's (consumers read them against its strength);
    // a front player's follow the front.
    const front = (slot: DefSlot) => flipFront && FRONT_PLAYERS.has(slot);
    for (const [slot, b] of Object.entries(pressure.blitzers) as Array<[DefSlot, { gap: Gap; side: 'S' | 'W' }]>) {
      if (!has(slot)) continue;
      roles[slot] = { kind: 'blitz', gap: b.gap, side: front(slot) ? otherSide(b.side) : b.side };
      blitzers.add(slot);
    }
    for (const [slot, z] of Object.entries(pressure.droppers ?? {}) as Array<[DefSlot, UnderSeat]>) {
      if (has(slot)) { const role = seatRole(z); roles[slot] = front(slot) && role.kind === 'zone' ? { ...role, zone: flipZone(role.zone) } : role; }
    }
  }
  const dlSlots: DefSlot[] = ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'];
  for (const slot of dlSlots) if (has(slot) && !roles[slot]) roles[slot] = { kind: 'rush' };
  // 3-4 OLB on the line in a Sam position rushes too.
  if (has('LB_S') && frontSlots.LB_S && frontSlots.LB_S.depth < 2 && !roles.LB_S && !cov.man) roles.LB_S = { kind: 'rush' };
  // NICKEL_FRONTS: so does a Will or Mike walked up onto the line as an edge
  // (Penny); a rover off the ball drops on 3rd and long (a three-man rush with
  // eight in coverage) and rushes otherwise.
  for (const lb of ['LB_W', 'LB_M'] as DefSlot[])
    if (has(lb) && frontSlots[lb] && frontSlots[lb]!.depth < 2 && !roles[lb] && !cov.man) roles[lb] = { kind: 'rush' };
  for (const slot of dlSlots) if (has(slot) && frontSlots[slot]?.rover && roles[slot]?.kind === 'rush' && !cov.man
    && style.situation && style.situation.down >= 3 && style.situation.distance >= 7) roles[slot] = { kind: 'zone', zone: 'hook_mid' };

  for (const slot of present) {
    if (roles[slot]) continue;
    const r = cov.roles[slot];
    // A backer's man preferences are by his side of the front.
    if (r) roles[slot] = r.kind === 'man' && r.prefer && flipFront && FRONT_PLAYERS.has(slot) ? { ...r, prefer: r.prefer.map(flipRef) } : r;
  }

  // Remaining defenders fill underneath zones (zone) or play man (man).
  const unassigned = present.filter((p) => !roles[p]);
  if (!cov.man) {
    const zones = cov.underneath.filter((z) => !Object.values(roles).some((r) => r?.kind === 'zone' && r.zone === seatZone(z)));
    // The call's seats in priority order, as many as there are free
    // defenders, go to the defenders by the least total distance to their
    // landmarks: one seat at a time, nearest first, sent a backer over the
    // trips #2 to the weak hook while the man beside the weak hook took the
    // strong one.
    const free = new Set(unassigned);
    const pool = [...free];
    const seats = zones.slice(0, pool.length);
    const lms = seats.map(seat => zoneLandmark(seatZone(seat), off));
    const dist = (slot: DefSlot, i: number) => Math.hypot(spots[slot]!.pos.x - lms[i].x, spots[slot]!.pos.y - lms[i].y);
    let best: { cost: number; pick: DefSlot[] } | null = null;
    const pick: DefSlot[] = [];
    const used = new Set<DefSlot>();
    const search = (i: number, cost: number) => {
      if (best && cost >= best.cost) return;
      if (i === seats.length) { best = { cost, pick: [...pick] }; return; }
      for (const slot of pool) {
        if (used.has(slot)) continue;
        used.add(slot); pick.push(slot);
        search(i + 1, cost + dist(slot, i));
        pick.pop(); used.delete(slot);
      }
    };
    search(0, 0);
    (best as { cost: number; pick: DefSlot[] } | null)?.pick.forEach((slot, i) => { roles[slot] = seatRole(seats[i]); free.delete(slot); });
    for (const slot of free) roles[slot] = { kind: 'zone', zone: 'hook_mid' };
  } else {
    // Man calls can still name underneath seats (a rat, a robber, a hole player)
    // for defenders left over after the man assignments are made below.
    for (const slot of unassigned) roles[slot] = { kind: 'man', prefer: ['B', 'S3', 'W2'] };
  }

  // --- man matching ---
  const receivers = Object.entries(off.refOf) as Array<[SkillSlot, ReceiverRef]>;
  if(cov.man){
    // Pressure may use a marker who had a back/slot responsibility. Optional
    // low help and brackets check to the vacated man before we leave an
    // eligible receiver unaccounted for. Deep help stays the called coverage.
    let shortage=receivers.length-present.filter(slot=>{const r=roles[slot];return r?.kind==='man'&&!r.double;}).length;
    for(const slot of present){
      if(shortage<=0)break;
      const r=roles[slot];
      if((r?.kind==='zone'&&!isDeepZone(r.zone))||(r?.kind==='man'&&r.double)){
        roles[slot]={kind:'man',prefer:['B','B2','S3','S2','W2']};shortage--;
      }
    }
    // Odd/goal-line personnel have five front players (the DE slots include
    // stand-up edges). The same pressure cannot blindly add to a four-man
    // rush. An uncalled edge takes a coverage assignment when the man budget
    // requires it; keep explicit blitzers and the called deep help intact.
    for(const slot of ['DE_S','DE_W'] as const){
      if(shortage<=0)break;
      if(roles[slot]?.kind==='rush'){
        roles[slot]={kind:'man',prefer:slot==='DE_S'?['S3','S2','B','B2']:['W2','B2','B']};shortage--;
      }
    }
  }
  const taken = new Set<SkillSlot>();
  const manDefs = present.filter((p) => roles[p]?.kind === 'man');
  // Coach overrides first (shadowing).
  for (const d of manDefs) {
    const o = prefs.overrides?.[d];
    if (o && off.refOf[o] && !taken.has(o)) {
      spots[d]!.manTarget = o;
      taken.add(o);
    }
  }
  // Then preference lists in priority order: corners, nickel, safeties, LBs.
  const order: DefSlot[] = ['CB_S', 'CB_W', 'NB', 'DB', 'SS', 'FS', 'LB_S', 'LB_W', 'LB_M', 'DE_S', 'DE_W'];
  for (const d of order) {
    if (!manDefs.includes(d) || spots[d]!.manTarget) continue;
    const role = roles[d] as { kind: 'man'; prefer?: ReceiverRef[]; double?: boolean };
    // A shadow override may take the other corner's #1. That corner must
    // trade to the remaining outside receiver before an interior/box player
    // is asked to cover him; the slot names are not fixed field-side bodies.
    const preferences = role.prefer ?? [];
    const corner = d === 'CB_S' || d === 'CB_W', slotDB = d === 'NB' || d === 'DB';
    // A slot defender covers a detached slot, not an attached end (that is a
    // safety's or backer's man), on either side; a corner does not press a
    // nub end as his #1.
    // Without a slot defender on the field (base), a nub-side corner travels
    // to a detached #2; a nickel or dime is there to cover that slot himself.
    const refs = corner ? [...preferences, 'S1', 'W1', ...(has('NB') || has('DB') ? [] : ['S2', 'W2'])] as ReceiverRef[]
      : slotDB ? [...preferences, 'S2', 'W2', 'S3', 'W3'] as ReceiverRef[] : preferences;
    // ...only when a box player or safety in man is there to take that end or
    // back; otherwise (split-field 2-Man to a nub end) the DB keeps him rather
    // than leave him free and cross the formation.
    const boxMan = manDefs.some(m => m !== 'CB_S' && m !== 'CB_W' && m !== 'NB' && m !== 'DB');
    for (const ref of refs) {
      const tgt = off.numbering[ref];
      if (tgt && boxMan && (corner || slotDB) && (off.spots[tgt].inline || off.spots[tgt].backfield)) continue;
      if (tgt && (!taken.has(tgt) || role.double)) {
        spots[d]!.manTarget = tgt;
        taken.add(tgt);
        break;
      }
    }
  }
  // Any uncovered receiver goes to the nearest unassigned man defender.
  for (const [slot] of receivers) {
    if (taken.has(slot)) continue;
    let best: DefSlot | null = null;
    let bestD = Infinity;
    for (const d of manDefs) {
      if (spots[d]!.manTarget) continue;
      // Defensive backs leave an attached end or a back to the box players when one is free.
      const db = d === 'CB_S' || d === 'CB_W' || d === 'NB' || d === 'DB';
      const dd = Math.hypot(spots[d]!.pos.x - off.spots[slot].pos.x, spots[d]!.pos.y - off.spots[slot].pos.y)
        + (db && (off.spots[slot].inline || off.spots[slot].backfield) ? 20 : 0);
      if (dd < bestD) {
        bestD = dd;
        best = d;
      }
    }
    if (best) {
      spots[best]!.manTarget = slot;
      taken.add(slot);
    }
  }
  // Man defenders left without a receiver take the call's underneath seats
  // (rat, robber, lurk) in order, or play robber.
  const spare = manDefs.filter((d) => !spots[d]!.manTarget);
  const seats = [...cov.underneath];
  for (const d of spare) {
    const seat = seats.shift();
    roles[d] = seat ? seatRole(seat) : { kind: 'zone', zone: 'robber' };
  }

  // Pre-snap: man defenders align on their man.
  for (const d of manDefs) {
    const t = spots[d]!.manTarget;
    if (!t) continue;
    const tp = off.spots[t].pos;
    const isCorner = d === 'CB_S' || d === 'CB_W' || d === 'NB' || d === 'DB';
    // A back on the ball has no inside: the defender shades from his own
    // side of it, not from a fixed side of the field (which flipped the
    // backers' sides with the offense's orientation).
    const inside = Math.sign(off.ballY - tp.y) || Math.sign(spots[d]!.pos.y - tp.y) || s;
    const mr = roles[d] as Extract<CoverageRole, { kind: 'man' }>;
    const press = (mr.press ?? cov.press) && !mr.overTop;
    const depth = off.spots[t].backfield ? 5 : mr.overTop ? 10 : isCorner ? (press ? (DEF_ALIGN ? 1.3 : 1.2) : 6) : 4;
    const shade = mr.lev === 'outside' ? -inside : mr.lev === 'head' ? 0 : inside;
    // DEF_ALIGN: a corner presses about head-up, plays the called shoulder
    // from off, and takes the inside against a receiver near the sideline.
    const room = Math.min(tp.y, FIELD_WIDTH - tp.y);
    const offset = DEF_ALIGN && isCorner && !off.spots[t].backfield
      ? (room < 9 ? inside * 0.2 : press ? -inside * 0.15 : shade * (mr.lev === 'outside' ? 0.5 : 0.2))
      : shade * 0.7;
    spots[d]!.pos = { x: los + depth, y: clamp(tp.y + offset, 1, FIELD_WIDTH - 1) };
    spots[d]!.press = press && isCorner && !off.spots[t].backfield;
  }

  // Calls that set a pre-snap depth for a seat (a rotating safety cheated
  // down, an inverted corner pressed to bail) keep his lateral alignment.
  for (const slot of present) {
    const r = roles[slot];
    if (r?.kind === 'zone' && r.depth !== undefined && spots[slot]) spots[slot]!.pos = { x: los + r.depth, y: spots[slot]!.pos.y };
  }

  // Finalize roles and zone ids.
  for (const slot of present) {
    const r = roles[slot]!;
    spots[slot]!.role = r;
    if (r.kind === 'zone' || r.kind === 'man') {
      const spot = spots[slot]!;
      spot.pos.x = los + coverageDepth(los, spot.pos.x - los);
    }
    if (r.kind === 'zone') spots[slot]!.zone = r.zone;
    if (r.kind === 'blitz') {
      spots[slot]!.gap = r.gap;
      spots[slot]!.gapSign = r.side === 'S' ? s : -s;
    }
  }

  // SLOT_LEV (experimental, off): a slot defender's zone spot comes from the
  // seat he is finally given. Placed before roles were assigned, he took the
  // no-role default (hook: 4.5 yd, 0.5 inside) even as a curl-flat or flat
  // player; NFL zone DBs over a slot stand +0.2 outside in Cover 3, -0.1 in
  // Cover 2 and Quarters (scripts/diag/align/overtwo.py).
  if (SLOT_LEV && DEF_ALIGN) for (const slot of ['NB', 'DB'] as DefSlot[]) {
    const sp = spots[slot], r = roles[slot];
    if (!sp || r?.kind !== 'zone' || r.depth !== undefined) continue;
    const near = (['S2', 'W2', 'S3', 'W3'] as ReceiverRef[]).map(ref => off.numbering[ref]).filter((t): t is NonNullable<typeof t> => !!t)
      .map(t => off.spots[t]).filter(o => o && !o.inline && !o.backfield && Math.abs(o.pos.y - sp.pos.y) <= 1.5)
      .sort((a, b) => Math.abs(a.pos.y - sp.pos.y) - Math.abs(b.pos.y - sp.pos.y))[0];
    if (!near) continue;
    const out = Math.sign(near.pos.y - off.ballY) || 1, z = zoneSpot(r.zone, true);
    sp.pos = { x: los + coverageDepth(los, z.depth), y: clamp(near.pos.y + out * z.shade, 1, FIELD_WIDTH - 1) };
  }
  // TIGHT_OFF (experimental, off): a defensive back over a tight #2 (an
  // inline end or a man within 3.5 yd of his tackle) plays off him, not in
  // press: with the line and the formation's traffic inside, the reduced
  // split leaves no room to jam and plays through him as the run's force.
  // NFL DBs over a tight #2 stand 3.2 / 4.5 / 6.5 yd deep (p25/50/75), 10%
  // pressed; ours pressed 39% (scripts/diag/align/overtwo.py). A blitzer keeps his spot.
  if (TIGHT_OFF) {
    const tackles = (['LT', 'RT'] as const).map(t => off.spots[t]?.pos.y).filter((y): y is number => y !== undefined);
    const tight = (['S2', 'W2'] as ReceiverRef[]).map(ref => off.numbering[ref]).filter((t): t is NonNullable<typeof t> => !!t)
      .map(t => off.spots[t]).filter(sp => sp && !sp.backfield && (sp.inline || Math.min(...tackles.map(y => Math.abs(sp.pos.y - y))) < TIGHT_SPLIT));
    for (const slot of present) {
      const sp = spots[slot];
      if (!sp || !/^(CB|NB|DB|SS|FS)/.test(slot) || sp.role.kind === 'blitz' || sp.pos.x - los >= 2) continue;
      if (tight.some(r => Math.abs(r.pos.y - sp.pos.y) <= 1.5)) { sp.pos = { x: los + TIGHT_OFF_DEPTH, y: sp.pos.y }; sp.press = false; }
    }
  }
  // SHORT_PACKAGE: the Bear's Sam is on the line outside the attached end
  // ("Dubs" 9; HonestNFL HNFL-129), whatever he covers after the snap.
  if (SHORT_PACKAGE && call.front.id === 'bear' && spots.LB_S && teAt(fs))
    spots.LB_S.pos = { x: los + (frontSlots.DE_S?.depth ?? .9), y: off.ballY + fs * techniqueOffset('9', true, off.line) };
  // Off the ball, two players do not stand on one spot: whoever is inside
  // 0.9 yd of a teammate already there steps aside. The several placement
  // rules above each pick their own spot; this keeps their landmarks and gives
  // the later one the next patch of grass: outward, away from the ball, unless
  // that would carry a man defender across his man (his called leverage, the
  // side of the receiver he aligned on), at any step. Then he keeps his
  // landmark and stacks a step deeper, as man defenders do over a bunch or
  // stack.
  const settled: DefSlot[] = [];
  for (const slot of [...present].sort((a, b) => Math.abs(spots[a]!.pos.y - off.ballY) - Math.abs(spots[b]!.pos.y - off.ballY))) {
    const p = spots[slot]!.pos, t = spots[slot]!.manTarget && !off.spots[spots[slot]!.manTarget!].backfield
      ? off.spots[spots[slot]!.manTarget!].pos : null;
    const lev = t ? Math.sign(p.y - t.y) : 0;
    const keeps = (y: number) => !lev || Math.sign(y - t!.y) === lev;
    let dir = 0;
    if (p.x - los > 2) for (let k = 0; k < 4; k++) {
      const near = settled.find((o) => Math.hypot(spots[o]!.pos.x - p.x, spots[o]!.pos.y - p.y) < .9);
      if (!near) break;
      const q = spots[near]!.pos, out = Math.sign(p.y - off.ballY) || Math.sign(p.y - q.y) || s;
      const aside = (d: number) => clamp(q.y + d * Math.sqrt(Math.max(0, .81 - (p.x - q.x) ** 2)) + d * .01, 1, FIELD_WIDTH - 1);
      // Each step re-checks the leverage: a second teammate further out can
      // make the next outward step cross the man even when the first did not.
      if (dir !== 2) dir = keeps(aside(dir || out)) ? dir || out : 2;
      if (dir === 2) p.x = q.x + Math.sqrt(Math.max(0, .81 - (p.y - q.y) ** 2)) + .01;
      else p.y = aside(dir);
    }
    settled.push(slot);
  }
  // Box count: defenders within the tackle box area at snap.
  let box = 0;
  for (const slot of present) {
    const p = spots[slot]!.pos;
    if (p.x - los < 7.5 && Math.abs(p.y - off.ballY) < 6) box++;
  }
  const rushers = present.filter((p) => spots[p]!.role.kind === 'rush' || spots[p]!.role.kind === 'blitz');
  // BLITZ_CREEP (experimental, off): a backer with a blitz assignment stands
  // where tracked rushers stand, walked up to time the snap, instead of at
  // the front's backer depth, walked toward the gap he will shoot: an A or B
  // gap blitzer over the gap, a C or D gap blitzer outside the tackle. It
  // shows the pressure: the offense sees him up. Tracked shallow backers on
  // zone runs stand outside the tackles (42%), over an uncovered lineman
  // (32%) or in a gap (17%), rarely stacked behind a down lineman (9%).
  // NFL box backers who rush stand a median 2.26 yd deep on passes and 2.47
  // on runs at the snap frame (p75 3.3; non-rushers 4.45-4.62); ours blitzed
  // from 4.6 and never stood shallower than 4.0.
  if (BLITZ_CREEP) for (const slot of blitzers) {
    const sp = spots[slot];
    if (sp && slot.startsWith('LB') && sp.pos.x - los > CREEP_DEPTH) sp.pos = { x: los + CREEP_DEPTH, y: gapY(off, sp.gap, sp.gapSign) };
  }
  // ALIGN_HABIT (experimental, off): an off-ball defender stands where his
  // own habit and this snap put him, not on the exact landmark: a personal
  // depth habit plus per-snap placement scatter (PlaySim draws both). NFL
  // off-ball backers: depth sd 0.91, between players 0.41, within a player 0.78
  // (scripts/diag/align); ours stood on one spot (4.6 / 4.6 / 5.0 at p25/50/75).
  // Front men, pressed backs and blitzers keep their spots.
  if (style.scatter) for (const slot of present) {
    const sp = spots[slot], j = style.scatter[slot];
    if (!sp || !j || sp.press || sp.role.kind === 'blitz' || sp.pos.x - los <= 2) continue;
    sp.pos = { x: los + Math.max(2.2, sp.pos.x - los + j.x), y: clamp(sp.pos.y + j.y * (MIRROR_SCATTER ? scatterSide(off, sp.pos.y) : 1), 1, FIELD_WIDTH - 1) };
  }
  return { spots, rushers, coverage: cov, boxCount: box };
}

/**
 * Disguised coverage: roles, man matchups and landmarks come from the real
 * call; the secondary and off-ball linebackers stand where the shown coverage
 * would put them and rotate at the snap. Linemen and blitzers align as played.
 * Press only survives if both looks press (you can't jam from 7 yards).
 */
function alignDisguised(call: DefensivePlayCall, off: OffenseAlignment, present: DefSlot[], prefs: ManPreference, style: AlignStyle): DefenseAlignment {
  const played = alignDefense({ ...call, shown: undefined }, off, present, prefs, style);
  const look = alignDefense({ ...call, coverage: call.shown!, pressure: null, shown: undefined }, off, present, prefs, style);
  for (const slot of present) {
    const p = played.spots[slot]!;
    const l = look.spots[slot];
    if (!l || p.role.kind === 'rush' || p.role.kind === 'blitz') continue;
    if (p.role.kind === 'man' && p.manTarget) {
      // Present a cushion without swapping the player's actual matchup to
      // the opposite side of the field. A shadow corner changes sides with
      // his receiver; a zero safety cannot disguise twelve yards away from
      // a detached man and pretend the rotation costs nothing.
      const target = off.spots[p.manTarget];
      const corner = slot === 'CB_S' || slot === 'CB_W' || slot === 'NB' || slot === 'DB';
      const depth = target.backfield ? 5 : p.role.overTop ? 10 : corner ? 6 : 4;
      // SHELL_SHOW: a man safety may show the deep look and come down at the
      // snap, paying for it with his own feet (tracked: Cover 1 shows two
      // high 26% of dropbacks, Cover 0 shows someone deep 36%), when that
      // spot is on his man's side of the ball and within 8 yd of him.
      const side = (y: number) => Math.sign(y - off.ballY);
      if (SHELL_SHOW && (slot === 'FS' || slot === 'SS') && l.pos.x - off.los > 8
        && side(l.pos.y) === side(target.pos.y) && Math.abs(l.pos.y - target.pos.y) <= 8)
        p.pos = { x: Math.min(l.pos.x, off.los + coverageDepth(off.los, 12)), y: l.pos.y };
      else p.pos = { x: Math.min(l.pos.x, off.los + coverageDepth(off.los, depth)), y: p.pos.y };
    } else p.pos = { ...l.pos };
    p.press = !!p.press && !!l.press;
  }
  let box = 0;
  for (const slot of present) {
    const q = played.spots[slot]!.pos;
    if (q.x - off.los < 7.5 && Math.abs(q.y - off.ballY) < 6) box++;
  }
  return { ...played, boxCount: box };
}
