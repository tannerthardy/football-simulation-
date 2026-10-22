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

/** Experimental (OL_SPLITS=1, off): the line splits as tracked. 2022
 * tracking at the snap (body centres, scripts/diag/align/snap.py): 1.54 yd
 * center to guard, 1.56 guard to tackle and 1.52 tackle to inline end, a
 * 6.2 yd tackle-to-tackle surface (coaching: two-foot guard and three-foot
 * tackle splits). The sim line stood at 1.3 yd splits (5.2 yd). Defensive
 * techniques, gap landmarks and the run-aiming points installed against the
 * 1.3 yd table are placed from the actual splits (`lineOffset`). */
const OL_SPLITS = process.env.OL_SPLITS === '1';
/** Experimental (OL_STAGGER=1, off): the line stands off the ball as tracked.
 * Guards 0.83 yd behind the ball, tackles 0.98 and an inline end 1.19 (body
 * centres; their helmets break the center's waist, the legal limit for a
 * lineman on the line). The center is tracked at 0.29, over the ball; here
 * the line of scrimmage has no ball length and a body is a disc, so he
 * stands at 0.43, just clear of it for the widest body (radius 0.42). The
 * sim line stood flat at 0.55. */
const OL_STAGGER = process.env.OL_STAGGER === '1';
/** Center-guard, guard-tackle and tackle-to-inline-end splits (yd between
 * body centres) of one snap's line. */
export interface LineSplits { cg: number; gt: number; tte: number }
const BASE_LINE: LineSplits = OL_SPLITS ? { cg: 1.54, gt: 1.56, tte: 1.52 } : { cg: 1.3, gt: 1.3, tte: 1.3 };
/** OL_SPLITS: on third or fourth down and a yard or less the line tightens
 * against penetration (tracked tackle to tackle 5.85 yd against 6.2; on first
 * and second down and a yard it does not). Splits do not otherwise change with
 * the call: tracked zone, gap and dropback splits agree within 0.05 yd. */
const SHORT_LINE: LineSplits = { cg: 1.45, gt: 1.47, tte: 1.43 };
const tackleOf = (l: LineSplits) => OL_SPLITS ? l.cg + l.gt : 2.6;
const inlineOf = (l: LineSplits) => OL_SPLITS ? tackleOf(l) + l.tte : 3.9;
const wingOf = (l: LineSplits) => OL_SPLITS ? inlineOf(l) + .9 : 4.8;
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
/** Experimental (DEF_ALIGN=1, off): the secondary aligns by its job, as on
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
const DEF_ALIGN = process.env.DEF_ALIGN === '1';
/** Experimental (WR_ALIGN=1, off): receivers align as tracked
 * (scripts/diag/align/nfl_scheme.py, 2022 tracking at the snap). The #1's room
 * to his sideline follows his route (ROUTE_ROOM: wide to run vertical or
 * inside, reduced to break out or across) or the run; without a call, a lone
 * #1 keeps about 13.5 yd and one with others about 11. A #2 stands at 0.58 of
 * the #1's split (0.62 in trips) and a #3 at 0.40. The installed split put
 * every #1 at 18 yd, 6 yd from the boundary sideline, and slots at a fixed
 * 8.4-8.6. Off: the installed spots. */
const WR_ALIGN = process.env.WR_ALIGN === '1';
/** Experimental (FRONT_ALIGN=1, off): the front aligns on bodies, not gaps,
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
const FRONT_ALIGN = process.env.FRONT_ALIGN === '1';
/** SHORT_PACKAGE (experimental, off): see game/playcaller.ts. */
const SHORT_PACKAGE = process.env.SHORT_PACKAGE === '1';
/** Experimental (FRONT_STRENGTH=1, off): the front sets its own strength,
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
const FRONT_STRENGTH = process.env.FRONT_STRENGTH === '1';
const FRONT_PLAYERS = new Set<DefSlot>(['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT', 'LB_S', 'LB_M', 'LB_W']);
/** The front's strong side (+1 = +y). */
export function frontSign(call: DefensivePlayCall, off: OffenseAlignment): number {
  if (!FRONT_STRENGTH) return off.strongSign;
  if (off.hasTE.S !== off.hasTE.W) return off.hasTE.S ? off.strongSign : -off.strongSign;
  return call.strength === 'opposite' ? -off.strongSign : off.strongSign;
}
const otherSide = (side: 'S' | 'W'): 'S' | 'W' => side === 'S' ? 'W' : 'S';
const flipZone = (z: ZoneId): ZoneId => z.replace(/_(s|w)(?=_|$)/, (_, c: string) => c === 's' ? '_w' : '_s') as ZoneId;
const flipRef = (r: ReceiverRef): ReceiverRef => (r[0] === 'S' ? `W${r.slice(1)}` : r[0] === 'W' ? `S${r.slice(1)}` : r) as ReceiverRef;

export interface OffSpot {
  slot: OffSlot;
  pos: Vec2;
  side: Side | 'C';
  /** Lined up in the backfield (not counted as a numbered receiver). */
  backfield: boolean;
  /** Attached tight end. */
  inline: boolean;
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
}

/** WR_ALIGN: the #1's room to his sideline (yd) by his route, [alone on his
 * side, with other receivers]: tracked 2022 medians, which follow the
 * coaching rule. Vertical and inside-breaking routes take a wide split when
 * others share his side (go, slant and comeback alone too); routes that break
 * outside or across take a reduced one, leaving room to break. Runs: alone
 * reduced, with others wide (crack and stalk angles). */
const ROUTE_ROOM: Record<string, [number, number]> = {
  go: [10.9, 10], fade: [10.9, 10], comeback: [10.9, 10], slant: [10.2, 9.9],
  hitch: [14, 10.6], curl: [14, 10.6], stick: [14, 10.6], hook: [14, 10.6],
  short_in: [14.6, 10.4], dig: [14.6, 10.4], post: [14.6, 11.2], seam: [14.6, 11.2],
  quick_out: [14.7, 15.8], out: [14.7, 15.8], deep_out: [14.7, 15.8], corner: [15.4, 15.3],
  shallow: [15.8, 16.8], shallow_high: [15.8, 16.8], cross: [15.8, 16.8], flat: [15.1, 17.6], arrow: [15.1, 17.6],
};
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
    spots[slot] = { slot: slot as OffSlot, pos: { x: los - depthOf[slot as LineSlot], y: ballY + off }, side: off > 0 ? 'L' : off < 0 ? 'R' : 'C', backfield: false, inline: false };
  }
  // Under center the QB's body is ~1.7 yd behind the line (NFL tracking at the snap): the center is in between.
  const qbDepth = formation.qb === 'under' ? 1.6 : formation.qb === 'pistol' ? 4.0 : 5.0;
  spots.QB = { slot: 'QB', pos: { x: los - qbDepth, y: ballY }, side: 'C', backfield: true, inline: false };

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
  for (const [slot, a] of entries) {
    const off = offsets[slot] ?? 0;
    const side = fside(a.side);
    const backfield = a.depth >= 3 && Math.abs(off) < 3.5;
    spots[slot] = {
      slot,
      pos: { x: los - (OL_STAGGER && a.split === 'inline' ? INLINE_DEPTH : a.depth), y: clamp(ballY + off, 1, FIELD_WIDTH - 1) },
      side,
      backfield,
      inline: a.split === 'inline',
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
const OL_SLOTS = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
/** FRONT_ALIGN: a shade's offset from its blocker's centre (tracked). */
const SHOULDER = .57;
/** FRONT_ALIGN: techniques an end man can hold outside the tackle. */
const EDGE_TECH: Technique[] = ['7', '6', '9', 'w9'];
/** FRONT_ALIGN: the called edge over an end (with none: a 9 or a wide nine). */
const EDGE_CALL_TE: Record<'tight' | 'base' | 'wide', Technique> = { tight: '6', base: '9', wide: 'w9' };

export function lineOffset(offset: number, hasTE: boolean, line: LineSplits = BASE_LINE): number {
  if (!OL_SPLITS) return offset;
  const d = Math.abs(offset), from = [0, 1.3, 2.6, 3.9], to = [0, line.cg, tackleOf(line), inlineOf(line)];
  const last = hasTE ? 3 : 2;
  for (let i = 1; i <= last; i++)
    if (d <= from[i]) return Math.sign(offset) * (to[i - 1] + (d - from[i - 1]) * (to[i] - to[i - 1]) / (from[i] - from[i - 1]));
  return Math.sign(offset) * (to[last] + d - from[last]);
}

/** y offset (absolute, ≥ 0) of a technique from the ball on a side. */
function techniqueOffset(tech: Technique, hasTE: boolean, line: LineSplits = BASE_LINE): number {
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

export function techniqueGap(tech: Technique): Gap {
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
function zoneSpot(zone: ZoneId | undefined, slot: boolean): { depth: number; shade: number } {
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
  const nickel = !present.includes('LB_S');
  if (FRONT_ALIGN) for (const side of ['S', 'W'] as const) {
    const onLine = present.filter(slot => frontSlots[slot]?.side === side && frontSlots[slot]!.depth < 2);
    const hasTE = teAt(sideSign(side));
    const end = onLine.sort((a, b) => techniqueOffset(frontSlots[b]!.tech, hasTE, off.line) - techniqueOffset(frontSlots[a]!.tech, hasTE, off.line))[0];
    if (!end) continue;
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
    const y = off.ballY + sign * (techniqueOffset(edgeTech.get(slot) ?? fa.tech, hasTE, off.line) + (edgeShift.get(slot) ?? 0));
    const fit = call.front.fits?.[slot];
    spots[slot] = { slot, pos: { x: los + fa.depth, y }, role: { kind: 'rush' },
      gap: fit?.gap ?? techniqueGap(fa.tech), gapSign: fit ? sideSign(fit.side) : sign };
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
    if (role?.kind === 'zone' && slot.startsWith('CB')) spot.depth = Math.max(1.3, spot.depth + (style.cbDepth ?? 0));
    const room = sign > 0 ? FIELD_WIDTH - r.y : r.y;
    if (room < 9) spot.shade = Math.min(spot.shade, -0.2);
    return spot;
  };

  const placeCorner = (slot: DefSlot, side: 'S' | 'W') => {
    if (!has(slot)) return;
    const sign = side === 'S' ? s : -s;
    const r1 = rec(`${side}1` as ReceiverRef);
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
        return { x: los + depth + (style.safetyDepth ?? 0), y: CENTER_Y + follow * (off.ballY - CENTER_Y) + sign * width };
      };
      if (has('SS')) spots.SS = { slot: 'SS', pos: deep('SS', s), role: { kind: 'rush' }, gap: 'D', gapSign: s };
      if (has('FS')) spots.FS = { slot: 'FS', pos: deep('FS', -s), role: { kind: 'rush' }, gap: 'D', gapSign: -s };
    } else {
      const fs = DEF_ALIGN ? { x: los + (cov.man ? 14.7 : 14.5) + (style.safetyDepth ?? 0), y: CENTER_Y + (cov.man ? 0.34 : 0) * (off.ballY - CENTER_Y) }
        : { x: los + 13, y: clamp(off.ballY, 18, FIELD_WIDTH - 18) };
      if (has('FS')) spots.FS = { slot: 'FS', pos: fs, role: { kind: 'rush' }, gap: 'A', gapSign: -s };
      if (has('SS')) spots.SS = { slot: 'SS', pos: { x: los + 7.5, y: off.coreEdge.S + s * 3 }, role: { kind: 'rush' }, gap: 'D', gapSign: s };
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
  if (!has('NB') && off.counts.S >= 2 && has(apexLB) && frontSlots[apexLB] && frontSlots[apexLB]!.depth > 2) {
    const r2 = rec('S2');
    if (r2 && !off.spots[off.numbering.S2!].inline) { spots[apexLB]!.pos = { x: los + 4.5, y: (r2.y + off.coreEdge.S) / 2 }; apex = !flipFront; }
  }
  // FRONT_ALIGN: the Over Sam is a "90", the end's outside shade at
  // linebacker depth; a wing is attached, not spread, so vs one he tightens
  // to the line head-up on him (2017 Colts p. 77). A detached #2 keeps the apex.
  if (FRONT_ALIGN && call.front.id === 'over' && spots.LB_S && teAt(fs)) {
    const wing = wingOn('S'), sam = spots.LB_S;
    if (wing) sam.pos = { x: los + (frontSlots.DE_S?.depth ?? .9), y: wing.pos.y };
    else if (!apex) sam.pos = { x: los + frontSlots.LB_S!.depth, y: off.ballY + fs * (inlineOf(off.line) + SHOULDER) };
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
    for (const [slot, z] of Object.entries(pressure.droppers ?? {}) as Array<[DefSlot, ZoneId]>) {
      if (has(slot)) roles[slot] = { kind: 'zone', zone: front(slot) ? flipZone(z) : z };
    }
  }
  const dlSlots: DefSlot[] = ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'];
  for (const slot of dlSlots) if (has(slot) && !roles[slot]) roles[slot] = { kind: 'rush' };
  // 3-4 OLB on the line in a Sam position rushes too.
  if (has('LB_S') && frontSlots.LB_S && frontSlots.LB_S.depth < 2 && !roles.LB_S && !cov.man) roles.LB_S = { kind: 'rush' };

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
    // Greedy by distance: each zone (in priority order) takes the closest free defender.
    const free = new Set(unassigned);
    for (const seat of zones) {
      if (free.size === 0) break;
      const z = seatZone(seat);
      const lm = zoneLandmark(z, off);
      let best: DefSlot | null = null;
      let bestD = Infinity;
      for (const slot of free) {
        const d = Math.hypot(spots[slot]!.pos.x - lm.x, spots[slot]!.pos.y - lm.y);
        if (d < bestD) {
          bestD = d;
          best = slot;
        }
      }
      if (best) {
        roles[best] = seatRole(seat);
        free.delete(best);
      }
    }
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
    const refs = d === 'CB_S' || d === 'CB_W' ? [...preferences, 'S1', 'W1'] as ReceiverRef[] : preferences;
    for (const ref of refs) {
      const tgt = off.numbering[ref];
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
      const dd = Math.hypot(spots[d]!.pos.x - off.spots[slot].pos.x, spots[d]!.pos.y - off.spots[slot].pos.y);
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
    const inside = Math.sign(off.ballY - tp.y) || 1;
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

  // SHORT_PACKAGE: the Bear's Sam is on the line outside the attached end
  // ("Dubs" 9; HonestNFL HNFL-129), whatever he covers after the snap.
  if (SHORT_PACKAGE && call.front.id === 'bear' && spots.LB_S && teAt(fs))
    spots.LB_S.pos = { x: los + (frontSlots.DE_S?.depth ?? .9), y: off.ballY + fs * techniqueOffset('9', true, off.line) };
  // Box count: defenders within the tackle box area at snap.
  let box = 0;
  for (const slot of present) {
    const p = spots[slot]!.pos;
    if (p.x - los < 7.5 && Math.abs(p.y - off.ballY) < 6) box++;
  }
  const rushers = present.filter((p) => spots[p]!.role.kind === 'rush' || spots[p]!.role.kind === 'blitz');
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
      p.pos = { x: Math.min(l.pos.x, off.los + coverageDepth(off.los, depth)), y: p.pos.y };
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
