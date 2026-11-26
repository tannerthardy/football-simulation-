/**
 * The offense's alignment from the call description alone (step 1c; Integration's grammar plan). Today's
 * `alignOffense` resolves the formation's split-kind names and reads the play by name (the run scheme for the backs'
 * offset and the zone tight end; the pass concept for #1's route room). Here the describer writes those decisions as
 * per-player data for that call, and `alignOffenseFromSnap` places the players from the data with no formation,
 * personnel, scheme or concept name read. Equality with alignOffense: test/ir-offense.test.ts.
 *
 * The anchors:
 * - a lineman: his lateral spot from the ball and his depth;
 * - the QB: his depth behind the line;
 * - a skill player: a fixed lateral offset from the ball; or a width from his sideline (his room to it, by side
 *   strength); or a share of the widest receiver on his side; plus his final depth and his on-line / backfield /
 *   attached facts.
 * Typed conditions on the snap: the strong side (receiver counts, then an attached end, then the field: the same rule
 * as today); a zone run's tight end setting off the ball by a hash of his spot; a gun run's backs mirroring to the
 * play side.
 */
import { CENTER_Y, FIELD_WIDTH } from '../../core/field.js';
import { clamp } from '../../core/vec.js';
import {
  ANY_ROOM, BASE_LINE, COUNTER_OFFSET, INLINE_DEPTH, IZ_OFFSET, OL_SPLITS, OL_STAGGER, RECEIVER_DEPTH, ROUTE_ROOM,
  RUN_ROOM, SHORT_LINE, SPLIT_BACK_SIDES, STRETCH_OFFSET, backsAway, TE_LINE_DEPTH, TE_OFF, TE_OFF_SHARE, WR_ALIGN, WR_LINE_DEPTH, inlineOf, olDepth,
  spotHash, tackleOf, wingOf, type AlignContext, type LineSplits, type OffSpot, type OffenseAlignment,
} from '../alignment.js';
import { GUN_QB_DEPTH, PISTOL_QB_DEPTH, UNDER_TAILBACK_EXTRA } from '../formations.js';
import { OFF_PERSONNEL, sideSign, type Formation, type OffSlot, type ReceiverRef, type Side, type SkillSlot } from '../types.js';
import { ref, type Ref } from './types.js';

type LineSlot = 'LT' | 'LG' | 'C' | 'RG' | 'RT';
/** A width from the ball, by whether his side is the formation's strong side (`early`) or not. */
/** `habit`: the team's own room habit (yd), applied after the room, as today's wideOffset does. */
export interface Room { early: number; late: number; habit?: number }
export type SkillAnchor =
  | { kind: 'offset'; y: number }
  | { kind: 'sideline'; room: Room }
  | { kind: 'share'; share: number; min: number; room: Room };

export interface LinePlayer { who: { slot: LineSlot; eligible?: boolean }; where: { y: number; depth: number } }
export interface SkillPlayer {
  /** His body (the personnel's position for his slot) and whether he is an eligible receiver by number (data for the
   * legality check, step 2a; absent: eligible). */
  who: { slot: SkillSlot; position?: string; eligible?: boolean };
  where: {
    /** The side as authored; the snap's flip mirrors it. */
    side: Side | 'C';
    anchor: SkillAnchor;
    depth: number;
    backfield: boolean;
    onLine: boolean;
    inline: boolean;
    /** Counts toward his side for the strong-side rule (not a back set behind the line inside the tackles). */
    counts: boolean;
    /** An attached end, for the strong-side rule. */
    attached: boolean;
    /** A zone run's attached end may set off the ball as a wing (a hash of his spot below `share`): his depth then, and
     * the wide receiver on his side who comes up onto the line. */
    offBall?: { share: number; depth: number; partner: SkillSlot; partnerDepth: number };
  };
}

/** The offense for one call: the formation's players placed with the play's decisions written in. */
export interface OffenseSnapDescription {
  preset: Ref<'formation'>;
  line: LineSplits;
  linemen: LinePlayer[];
  qb: { depth: number };
  players: SkillPlayer[];
  /** A gun run that moves the backs to the play side, and to which side. */
  backsToPlay?: 'strong' | 'weak';
  /** With `backsToPlay` (step 2b): the carrier aligns away and a second back takes the play side, where his job is (a
   * zone lead or slice); absent, every back on the play side moves away. */
  secondBackToPlay?: boolean;
  /** Players the call cannot be run without (step 2a), written by the describer from the play: a split zone's slicer
   * (a core off-ball TE or FB, or a second back), a screen's receiver by number. */
  requires?: Array<{ kind: 'slicer' } | { kind: 'receiver'; ref: ReceiverRef }>;
  /** Players in motion at the snap and their direction (step 2a; the catalog calls none). */
  motion?: Array<{ slot: SkillSlot; toward: 'line' | 'parallel' | 'away' }>;
}

/** Presets + play context → the offense's description for that call (the preset step: names are read here, once). */
export function describeOffenseSnap(formation: Formation, ctx: AlignContext = {}): OffenseSnapDescription {
  const set = OL_SPLITS && (ctx.down ?? 1) >= 3 && (ctx.distance ?? 10) <= 1 ? SHORT_LINE : BASE_LINE;
  const w = OL_SPLITS ? 1 + (ctx.style?.olWidth ?? 0) : 1;
  const line: LineSplits = w === 1 ? set : { cg: set.cg * w, gt: set.gt * w, tte: set.tte * w };
  const T = tackleOf(line), olOff: Record<LineSlot, number> = OL_SPLITS
    ? { LT: T, LG: line.cg, C: 0, RG: -line.cg, RT: -T } : { LT: 2.6, LG: 1.3, C: 0, RG: -1.3, RT: -2.6 };
  const depthOf = olDepth(ctx);
  const linemen = (Object.entries(olOff) as [LineSlot, number][]).map(([slot, y]) => ({ who: { slot, eligible: false }, where: { y, depth: depthOf[slot] } }));
  const qb = { depth: formation.qb === 'under' ? 1.6 : formation.qb === 'pistol' ? PISTOL_QB_DEPTH : GUN_QB_DEPTH };
  const entries = Object.entries(formation.slots) as Array<[SkillSlot, NonNullable<Formation['slots'][SkillSlot]>]>;
  const detachedOn = (side: Side | 'C') => entries.filter(([, e]) => e.side === side && (e.split === 'wide' || e.split === 'slot' || e.split === 'slot2')).length;
  // #1's room on each side: [alone, with others] by the side's route, chosen by detached count; plus the team's habit.
  const roomFor = (side: Side | 'C'): Room => {
    const pick = (r: [number, number]) => (detachedOn(side) >= 2 ? r[1] : r[0]);
    const by = (strongSide: boolean): [number, number] => {
      if (side === 'C' || !ctx.kind) return ANY_ROOM;
      if (ctx.kind === 'run') return RUN_ROOM;
      const route = (strongSide ? ctx.pass?.strong : ctx.pass?.weak)?.[1];
      return (route && ROUTE_ROOM[route]) || ANY_ROOM;
    };
    const habit = ctx.style?.wrRoom;
    return { early: pick(by(true)), late: pick(by(false)), ...(habit !== undefined ? { habit } : {}) };
  };
  const olMean = (Object.values(depthOf) as number[]).reduce((t, v) => t + v, 0) / 5;
  const zoneRun = TE_OFF && !!ctx.run && ['insideZone', 'outsideZone', 'wideZone'].includes(ctx.run.scheme);
  const bodies = OFF_PERSONNEL[formation.personnel] ?? {};
  const players: SkillPlayer[] = entries.map(([slot, a]) => {
    let anchor: SkillAnchor;
    if (typeof a.split === 'number') anchor = { kind: 'offset', y: a.side === 'C' ? 0 : a.split };
    else if (a.split === 'wide') anchor = { kind: 'sideline', room: roomFor(a.side) };
    else if (a.split === 'inline') anchor = { kind: 'offset', y: inlineOf(line) };
    else if (a.split === 'wing') anchor = { kind: 'offset', y: wingOf(line) };
    else if (a.split === 'core') anchor = { kind: 'offset', y: 0 };
    else {
      if (!WR_ALIGN) throw new Error('describeOffenseSnap: WR_ALIGN off is not described');
      anchor = a.split === 'slot2' ? { kind: 'share', share: 0.40, min: 4.6, room: roomFor(a.side) }
        : { kind: 'share', share: detachedOn(a.side) >= 3 ? 0.62 : 0.58, min: 5.5, room: roomFor(a.side) };
    }
    const lateral = anchor.kind === 'offset' ? Math.abs(anchor.y) : Infinity;
    const backfield = a.depth >= 3 && lateral < 3.5;
    const onLine = !backfield && a.depth <= 0.6 + 1e-9;
    const depth = RECEIVER_DEPTH && onLine ? (a.split === 'inline' ? TE_LINE_DEPTH : WR_LINE_DEPTH)
      : OL_STAGGER && a.split === 'inline' ? INLINE_DEPTH
      : a.depth + (!backfield ? 0 : formation.qb === 'gun' ? GUN_QB_DEPTH - 5.0 : formation.qb === 'under' && a.depth >= 6 ? UNDER_TAILBACK_EXTRA : 0);
    const p: SkillPlayer = { who: { slot, position: bodies[slot], eligible: true }, where: { side: a.side, anchor, depth, backfield, onLine, inline: a.split === 'inline',
      counts: !(typeof a.split === 'number' && a.depth >= 3 && Math.abs(a.split) < 3.5), attached: a.split === 'inline' } };
    if (zoneRun && a.split === 'inline' && !entries.some(([s2, e]) => s2 !== slot && e.split === 'inline' && e.side === a.side)) {
      const wide = entries.find(([, e]) => e.split === 'wide' && e.side === a.side);
      if (wide) {
        const wb = wide[1].depth >= 3 && false, wOnLine = !wb; // a wide receiver is never in the backfield
        p.where.offBall = { share: TE_OFF_SHARE, depth: olMean + 1.1, partner: wide[0],
          partnerDepth: RECEIVER_DEPTH && wOnLine ? WR_LINE_DEPTH : Math.min(wide[1].depth, 0.6) };
      }
    }
    return p;
  });
  const backsToPlay = formation.qb === 'gun' && ctx.run && ((STRETCH_OFFSET && (ctx.run.scheme === 'outsideZone' || ctx.run.scheme === 'wideZone'))
    || (IZ_OFFSET && (ctx.run.scheme === 'insideZone' || ctx.run.scheme === 'splitZone'))
    || (COUNTER_OFFSET && ctx.run.scheme === 'counter')) ? ctx.run.direction : undefined;
  const requires: NonNullable<OffenseSnapDescription['requires']> = [];
  if (ctx.run?.scheme === 'splitZone') requires.push({ kind: 'slicer' });
  if (ctx.pass?.screen?.receiver) requires.push({ kind: 'receiver', ref: ctx.pass.screen.receiver });
  const secondBackToPlay = !!backsToPlay && SPLIT_BACK_SIDES && ctx.run!.scheme !== 'counter';
  return { preset: ref('formation', formation.id), line, linemen, qb, players, ...(backsToPlay ? { backsToPlay } : {}),
    ...(secondBackToPlay ? { secondBackToPlay } : {}), ...(requires.length ? { requires } : {}) };
}

/** The offense placed from its description (no formation, personnel, scheme or concept name read). */
export function alignOffenseFromSnap(d: OffenseSnapDescription, flip: boolean, los: number, ballY: number): OffenseAlignment {
  const spots: Record<string, OffSpot> = {};
  const fside = (s: Side | 'C'): Side | 'C' => (s === 'C' ? 'C' : flip ? (s === 'L' ? 'R' : 'L') : s);
  const line = d.line, T = tackleOf(line);
  for (const l of d.linemen) spots[l.who.slot] = { slot: l.who.slot as OffSlot, pos: { x: los - l.where.depth, y: ballY + l.where.y },
    side: l.where.y > 0 ? 'L' : l.where.y < 0 ? 'R' : 'C', backfield: false, inline: false, onLine: true };
  spots.QB = { slot: 'QB', pos: { x: los - d.qb.depth, y: ballY }, side: 'C', backfield: true, inline: false, onLine: false };
  // The strong side as the formation shows it: more receivers, then an attached end, then the field.
  const on = (side: Side) => d.players.filter((p) => fside(p.where.side) === side && p.where.counts);
  const nL = on('L').length, nR = on('R').length;
  const teL = on('L').some((p) => p.where.attached), teR = on('R').some((p) => p.where.attached);
  const early: Side = nL !== nR ? (nL > nR ? 'L' : 'R') : teL !== teR ? (teL ? 'L' : 'R') : ballY < CENTER_Y ? 'L' : 'R';
  const roomOf = (side: Side | 'C', r: Room) => (side === early ? r.early : r.late);
  const fromSideline = (sign: number, room: number, habit = 0) => {
    const toSideline = sign > 0 ? FIELD_WIDTH - ballY : ballY;
    return WR_ALIGN ? Math.max(8, toSideline - room - habit) : Math.max(9, Math.min(18, toSideline - 6));
  };
  const offsets: Partial<Record<SkillSlot, number>> = {};
  for (const p of d.players) {
    const side = fside(p.where.side), sign = side === 'C' ? 0 : sideSign(side), a = p.where.anchor;
    if (a.kind === 'offset') offsets[p.who.slot] = a.y * (sign || 1) * (side === 'C' ? 0 : 1);
    else if (a.kind === 'sideline') offsets[p.who.slot] = fromSideline(sign, roomOf(side, a.room), a.room.habit) * sign;
  }
  for (const p of d.players) {
    const a = p.where.anchor;
    if (a.kind !== 'share') continue;
    const side = fside(p.where.side), sign = side === 'C' ? 1 : sideSign(side);
    let widest = fromSideline(sign, roomOf(side, a.room), a.room.habit);
    for (const o2 of Object.values(offsets)) if (o2 !== undefined && Math.sign(o2) === sign && Math.abs(o2) > 6) widest = Math.max(widest, Math.abs(o2));
    offsets[p.who.slot] = Math.max(a.min, widest * a.share) * sign;
  }
  // A zone run's attached end set off the ball (a hash of his spot), and the wide receiver brought up outside him.
  const offEnd = new Set<SkillSlot>(), up = new Map<SkillSlot, number>();
  for (const p of d.players) {
    const o = p.where.offBall;
    if (o && spotHash(p.who.slot, los.toFixed(2), ballY.toFixed(2)) < o.share) { offEnd.add(p.who.slot); up.set(o.partner, o.partnerDepth); }
  }
  for (const p of d.players) {
    const slot = p.who.slot, off = offsets[slot] ?? 0, side = fside(p.where.side);
    const ended = offEnd.has(slot), upped = up.has(slot);
    const depth = ended ? p.where.offBall!.depth : upped ? up.get(slot)! : p.where.depth;
    spots[slot] = { slot, pos: { x: los - depth, y: clamp(ballY + off, 1, FIELD_WIDTH - 1) }, side, backfield: p.where.backfield,
      inline: p.where.inline && !ended, onLine: (p.where.onLine || upped) && !ended };
  }
  // Numbering per side, outside-in, without the backs; strength by counts, then an attached end, then the field.
  const bySide: Record<Side, Array<{ slot: SkillSlot; off: number }>> = { L: [], R: [] };
  for (const p of d.players) {
    const sp = spots[p.who.slot]; if (sp.backfield) continue;
    const off = sp.pos.y - ballY; bySide[off >= 0 ? 'L' : 'R'].push({ slot: p.who.slot, off: Math.abs(off) });
  }
  bySide.L.sort((a, b) => b.off - a.off); bySide.R.sort((a, b) => b.off - a.off);
  const teSide = (s: Side) => bySide[s].some((r) => spots[r.slot].inline);
  const strong: Side = bySide.L.length !== bySide.R.length ? (bySide.L.length > bySide.R.length ? 'L' : 'R')
    : teSide('L') !== teSide('R') ? (teSide('L') ? 'L' : 'R') : ballY < CENTER_Y ? 'L' : 'R';
  const weak: Side = strong === 'L' ? 'R' : 'L';
  const numbering: OffenseAlignment['numbering'] = {}, refOf: OffenseAlignment['refOf'] = {};
  bySide[strong].forEach((r, i) => { const x = `S${i + 1}` as ReceiverRef; numbering[x] = r.slot; refOf[r.slot] = x; });
  bySide[weak].forEach((r, i) => { const x = `W${i + 1}` as ReceiverRef; numbering[x] = r.slot; refOf[r.slot] = x; });
  // The primary back: today's rule reads the slot label (RB first).
  const backs = d.players.filter((p) => spots[p.who.slot].backfield).map((p) => p.who.slot).sort((a, b) => (a === 'RB' ? -1 : b === 'RB' ? 1 : 0));
  if (backs[0]) { numbering.B = backs[0]; refOf[backs[0]] = 'B'; }
  if (backs[1]) { numbering.B2 = backs[1]; refOf[backs[1]] = 'B2'; }
  const strongSign = sideSign(strong);
  if (d.backsToPlay) {
    backsAway(spots, numbering, ballY, d.backsToPlay === 'strong' ? strongSign : -strongSign, !!d.secondBackToPlay);
  }
  const coreEdge = { S: ballY + strongSign * (teSide(strong) ? inlineOf(line) : T), W: ballY - strongSign * (teSide(weak) ? inlineOf(line) : T) };
  return { los, ballY, spots, numbering, refOf, strong, strongSign, coreEdge, line,
    hasTE: { S: teSide(strong), W: teSide(weak) }, counts: { S: bySide[strong].length, W: bySide[weak].length } };
}
