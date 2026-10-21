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
import type { Coverage, CoverageRole, DefSlot, DefensivePlayCall, Formation, Gap, OffSlot, ReceiverRef, Side, SkillSlot, Technique, ZoneId, UnderSeat, FormationKey } from './types.js';
import { sideSign } from './types.js';
import type { LineSet } from './types.js';

/** Experimental (OL_ALIGN=1, off): the line aligns as tracked. 2022 tracking
 * at the snap (body centres, scripts/diag/stretch/olalign.py, 5,880 runs):
 * the center 0.29 yd behind the ball, guards 0.83, tackles 0.98 and an inline
 * end 1.19 (heads still on the line: they break the center's waist), with
 * splits of 1.54 (center-guard), 1.56 (guard-tackle) and 1.52 (tackle-end),
 * a 6.2 yd tackle-to-tackle surface. The sim line stood flat at 0.55 with
 * 1.3 yd splits (5.2 yd). Defensive techniques and gap landmarks are then
 * placed from these actual splits instead of the 1.3 yd table. */
const OL_ALIGN = process.env.OL_ALIGN === '1';
/** The tracked median line (2022 runs). Teams set their own splits around it
 * (team medians 1.46-1.74 yd, scripts/diag/align/olsplits.py) and tighten in
 * short yardage; the call carries that set (`OffensivePlayCall.line`). */
export const TRACKED_LINE: LineSet = { cg: 1.54, gt: 1.56, tte: 1.52, depth: { C: .29, G: .83, T: .98, TE: 1.19 } };
/** The installed flat line (OL_ALIGN off). The inline end keeps the
 * formation's depth. */
const LEGACY_LINE: LineSet = { cg: 1.3, gt: 1.3, tte: 1.3, depth: { C: .55, G: .55, T: .55, TE: NaN } };

/** OL_ALIGN: the set a team calls: its base split (a coaching rule) for
 * every split, tightened in short yardage (2 yd or less to go, or the goal
 * line inside the 3), where tracked lines narrow 0.2 yd and set 0.05 yd
 * shallower. Undefined with the flag off (the installed line). */
export function lineSet(split: number | undefined, shortYardage: boolean): LineSet | undefined {
  if (!OL_ALIGN) return undefined;
  const base = split ?? (TRACKED_LINE.cg + TRACKED_LINE.gt) / 2, tight = shortYardage ? .05 : 0;
  const d = TRACKED_LINE.depth, up = shortYardage ? .05 : 0;
  return { cg: base - tight - .01, gt: base - tight + .01, tte: TRACKED_LINE.tte - tight,
    depth: { C: d.C, G: d.G - up, T: d.T - up, TE: d.TE - up } };
}

/** Lateral offsets of the line's landmarks from the ball for a set. */
const tackleOffset = (l: LineSet) => l.cg + l.gt;
const inlineOffset = (l: LineSet) => tackleOffset(l) + l.tte;
const wingOffset = (l: LineSet) => inlineOffset(l) + .9;

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
  /** The line's set this snap (the installed flat line with OL_ALIGN off). */
  line: LineSet;
  hasTE: { S: boolean; W: boolean };
  counts: { S: number; W: number };
}

function wideOffset(ballY: number, sign: number): number {
  const toSideline = sign > 0 ? FIELD_WIDTH - ballY : ballY;
  return Math.max(9, Math.min(18, toSideline - 6));
}

export function alignOffense(formation: Formation, flip: boolean, los: number, ballY: number, called?: LineSet): OffenseAlignment {
  const spots: Record<string, OffSpot> = {};
  const line = OL_ALIGN ? called ?? TRACKED_LINE : LEGACY_LINE;
  const T = tackleOffset(line), olOffset = { LT: T, LG: line.cg, C: 0, RG: -line.cg, RT: -T };
  const fside = (s: Side | 'C'): Side | 'C' => (s === 'C' ? 'C' : flip ? (s === 'L' ? 'R' : 'L') : s);

  for (const [slot, off] of Object.entries(olOffset)) {
    const depth = line.depth[slot === 'C' ? 'C' : slot.endsWith('G') ? 'G' : 'T'];
    spots[slot] = { slot: slot as OffSlot, pos: { x: los - depth, y: ballY + off }, side: off > 0 ? 'L' : off < 0 ? 'R' : 'C', backfield: false, inline: false };
  }
  // Under center the QB's body is ~1.7 yd behind the line (NFL tracking at the snap): the center is in between.
  const qbDepth = formation.qb === 'under' ? 1.6 : formation.qb === 'pistol' ? 4.0 : 5.0;
  spots.QB = { slot: 'QB', pos: { x: los - qbDepth, y: ballY }, side: 'C', backfield: true, inline: false };

  // First pass: wide/inline/wing/fixed; second pass: slots (need #1 position).
  const entries = Object.entries(formation.slots) as Array<[SkillSlot, NonNullable<Formation['slots'][SkillSlot]>]>;
  const offsets: Partial<Record<SkillSlot, number>> = {};
  for (const [slot, a] of entries) {
    const side = fside(a.side);
    const sign = side === 'C' ? 0 : sideSign(side);
    let off: number | null = null;
    if (typeof a.split === 'number') off = a.split * (sign || 1) * (side === 'C' ? 0 : 1);
    else if (a.split === 'wide') off = wideOffset(ballY, sign) * sign;
    else if (a.split === 'inline') off = inlineOffset(line) * sign;
    else if (a.split === 'wing') off = wingOffset(line) * sign;
    else if (a.split === 'core') off = 0;
    if (off !== null) offsets[slot] = off;
  }
  for (const [slot, a] of entries) {
    if (offsets[slot] !== undefined) continue;
    const side = fside(a.side);
    const sign = side === 'C' ? 1 : sideSign(side);
    // Slot receivers split the difference between the tackle and the widest receiver.
    let widest = wideOffset(ballY, sign);
    for (const [s2, o2] of Object.entries(offsets)) {
      if (o2 !== undefined && Math.sign(o2) === sign && Math.abs(o2) > 6) widest = Math.max(widest, Math.abs(o2));
      void s2;
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
      pos: { x: los - (OL_ALIGN && a.split === 'inline' ? line.depth.TE : a.depth), y: clamp(ballY + off, 1, FIELD_WIDTH - 1) },
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
    S: ballY + strongSign * (teSide(strong) ? inlineOffset(line) : T),
    W: ballY - strongSign * (teSide(weak) ? inlineOffset(line) : T),
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

/** A landmark installed against the legacy line (1.3 yd splits, inline end
 * at 3.9 yd from the ball) placed on the actual line: interpolated between
 * the center, guard, tackle and (with one) inline end, and carried with the
 * outermost of them beyond it. The identity unless OL_ALIGN is on. */
export function lineOffset(offset: number, hasTE: boolean, line: LineSet = TRACKED_LINE): number {
  if (!OL_ALIGN) return offset;
  const d = Math.abs(offset), from = [0, 1.3, 2.6, 3.9], to = [0, line.cg, tackleOffset(line), inlineOffset(line)];
  const last = hasTE ? 3 : 2;
  for (let i = 1; i <= last; i++)
    if (d <= from[i]) return Math.sign(offset) * (to[i - 1] + (d - from[i - 1]) * (to[i] - to[i - 1]) / (from[i] - from[i - 1]));
  return Math.sign(offset) * (to[last] + d - from[last]);
}

/** y offset (absolute, ≥ 0) of a technique from the ball on a side. */
function techniqueOffset(tech: Technique, hasTE: boolean, line: LineSet): number {
  if (OL_ALIGN) {
    // The same shoulders and gaps, placed from the actual splits.
    const G = line.cg, T = tackleOffset(line), E = inlineOffset(line), gt = line.gt;
    switch (tech) {
      case '0': return 0;
      case '1': return G / 2;
      case '2i': return G - .3;
      case '2': return G;
      case '3': return G + gt / 2;
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
  if (OL_ALIGN) {
    const l = off.line, T = tackleOffset(l);
    switch (gap) {
      case 'A': return b + sign * l.cg / 2;
      case 'B': return b + sign * (l.cg + l.gt / 2);
      case 'C': return b + sign * (T + .65);
      case 'D': return b + sign * (hasTE ? inlineOffset(l) + .7 : T + 1.6);
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
export function alignDefense(call: DefensivePlayCall, off: OffenseAlignment, present: DefSlot[], prefs: ManPreference = {}): DefenseAlignment {
  if (call.shown && call.shown.id !== call.coverage.id) return alignDisguised(call, off, present, prefs);
  const s = off.strongSign;
  const los = off.los;
  const cov = call.coverage;
  const spots: Partial<Record<DefSlot, DefSpot>> = {};
  const has = (slot: DefSlot) => present.includes(slot);

  // --- front ---
  const frontSlots = call.front.slots;
  for (const slot of present) {
    const fa = frontSlots[slot];
    if (!fa) continue;
    const sign = fa.side === 'S' ? s : -s;
    const hasTE = fa.side === 'S' ? off.hasTE.S : off.hasTE.W;
    const y = off.ballY + sign * techniqueOffset(fa.tech, hasTE, off.line);
    const fit = call.front.fits?.[slot];
    spots[slot] = { slot, pos: { x: los + fa.depth, y }, role: { kind: 'rush' },
      gap: fit?.gap ?? techniqueGap(fa.tech), gapSign: fit ? (fit.side === 'S' ? s : -s) : sign };
  }

  // --- receivers by side for DB alignment ---
  const rec = (ref: ReceiverRef) => {
    const slot = off.numbering[ref];
    return slot ? off.spots[slot].pos : null;
  };
  const shell = cov.look ?? cov.shell;
  const cornerDepth = cov.press ? 1.2 : shell === 'one-high' ? 7 : 6;

  const placeCorner = (slot: DefSlot, side: 'S' | 'W') => {
    if (!has(slot)) return;
    const sign = side === 'S' ? s : -s;
    const r1 = rec(`${side}1` as ReceiverRef);
    const y = r1 ? r1.y - sign * (cov.press ? 0.6 : shell === 'one-high' ? -0.8 : 0.8) : off.ballY + sign * 14;
    spots[slot] = { slot, pos: { x: los + cornerDepth, y: clamp(y, 1, FIELD_WIDTH - 1) }, role: { kind: 'rush' }, gap: 'D', gapSign: sign, press: cov.press };
  };
  placeCorner('CB_S', 'S');
  placeCorner('CB_W', 'W');

  // Nickel over the strong slot (or apex if none); dime over the weak slot.
  const placeSlotDB = (slot: DefSlot, side: 'S' | 'W') => {
    if (!has(slot)) return;
    const sign = side === 'S' ? s : -s;
    const r2 = rec(`${side}2` as ReceiverRef);
    const apex = off.ballY + sign * 6.5;
    const y = r2 && !off.spots[off.numbering[`${side}2` as ReceiverRef]!].inline ? r2.y - sign * 0.8 : apex;
    spots[slot] = { slot, pos: { x: los + (cov.press ? 1.5 : 5), y }, role: { kind: 'rush' }, gap: 'D', gapSign: sign, press: cov.press };
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
      if (has('SS')) spots.SS = { slot: 'SS', pos: { x: los + 12, y: off.ballY + s * 9 }, role: { kind: 'rush' }, gap: 'D', gapSign: s };
      if (has('FS')) spots.FS = { slot: 'FS', pos: { x: los + 12, y: off.ballY - s * 9 }, role: { kind: 'rush' }, gap: 'D', gapSign: -s };
    } else {
      if (has('FS')) spots.FS = { slot: 'FS', pos: { x: los + 13, y: clamp(off.ballY, 18, FIELD_WIDTH - 18) }, role: { kind: 'rush' }, gap: 'A', gapSign: -s };
      if (has('SS')) spots.SS = { slot: 'SS', pos: { x: los + 7.5, y: off.coreEdge.S + s * 3 }, role: { kind: 'rush' }, gap: 'D', gapSign: s };
    }
  }

  // LBs without front alignment (shouldn't happen, but keep them sane).
  for (const slot of present) {
    if (!spots[slot]) spots[slot] = { slot, pos: { x: los + 5, y: off.ballY }, role: { kind: 'rush' }, gap: 'A', gapSign: s };
  }

  // Off-ball LBs walk out to apex vs. spread looks in two-high shells.
  if (!has('NB') && off.counts.S >= 2 && has('LB_S') && frontSlots.LB_S && frontSlots.LB_S.depth > 2) {
    const r2 = rec('S2');
    if (r2 && !off.spots[off.numbering.S2!].inline) spots.LB_S!.pos = { x: los + 4.5, y: (r2.y + off.coreEdge.S) / 2 };
  }

  // --- roles ---
  const roles: Partial<Record<DefSlot, CoverageRole>> = {};
  const pressure = call.pressure;
  const blitzers = new Set<DefSlot>();
  if (pressure) {
    for (const [slot, b] of Object.entries(pressure.blitzers) as Array<[DefSlot, { gap: Gap; side: 'S' | 'W' }]>) {
      if (!has(slot)) continue;
      roles[slot] = { kind: 'blitz', gap: b.gap, side: b.side };
      blitzers.add(slot);
    }
    for (const [slot, z] of Object.entries(pressure.droppers ?? {}) as Array<[DefSlot, ZoneId]>) {
      if (has(slot)) roles[slot] = { kind: 'zone', zone: z };
    }
  }
  const dlSlots: DefSlot[] = ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'];
  for (const slot of dlSlots) if (has(slot) && !roles[slot]) roles[slot] = { kind: 'rush' };
  // 3-4 OLB on the line in a Sam position rushes too.
  if (has('LB_S') && frontSlots.LB_S && frontSlots.LB_S.depth < 2 && !roles.LB_S && !cov.man) roles.LB_S = { kind: 'rush' };

  for (const slot of present) {
    if (roles[slot]) continue;
    const r = cov.roles[slot];
    if (r) roles[slot] = r;
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
    const depth = off.spots[t].backfield ? 5 : mr.overTop ? 10 : isCorner ? (press ? 1.2 : 6) : 4;
    const shade = mr.lev === 'outside' ? -inside : mr.lev === 'head' ? 0 : inside;
    spots[d]!.pos = { x: los + depth, y: clamp(tp.y + shade * 0.7, 1, FIELD_WIDTH - 1) };
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
function alignDisguised(call: DefensivePlayCall, off: OffenseAlignment, present: DefSlot[], prefs: ManPreference): DefenseAlignment {
  const played = alignDefense({ ...call, shown: undefined }, off, present, prefs);
  const look = alignDefense({ ...call, coverage: call.shown!, pressure: null, shown: undefined }, off, present, prefs);
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
