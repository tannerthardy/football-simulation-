/**
 * The offensive structure a secondary identifies before the snap, beyond the
 * plain receiver count: is the three-receiver side a bunch or a stack, is
 * there a nub side (an attached end and no detached receiver), are the
 * trips "closed" by an attached end, is the back offset, is the weak #1
 * isolated, which side is the field. Coverage checks key on these the way
 * coaches teach them (trips, bunch, stack, nub, empty, two-back).
 *
 * It reads only the aligned offense; nothing here sees routes or the call.
 */
import { CENTER_Y } from '../core/field.js';
import { formationKey, type OffenseAlignment } from './alignment.js';
import type { FormationKey, ReceiverRef, StructureTag } from './types.js';

export type { StructureTag };

/** Lateral spread (yd) within which three receivers read as a bunch. */
const BUNCH_WIDTH = 4.5;
/** Lateral gap (yd) under which two receivers read as stacked. */
const STACK_WIDTH = 1.6;
/** Depth difference (yd) that makes two close receivers a stack, not a tight pair. */
const STACK_DEPTH = 0.8;
/** #1 inside this distance (yd) from the ball: a reduced (tight) split. */
const REDUCED_SPLIT = 9;
/** #2 and #3 within this lateral distance (yd): aligned close, set up to exchange (Area). */
const CLOSE_PAIR = 2;

export interface SideStructure {
  /** Detached plus attached receivers to this side, outside-in. */
  count: number;
  refs: ReceiverRef[];
  /** An end attached to the core on this side. */
  attached: boolean;
  /** Receivers split away from the core. */
  detached: number;
  /** Only an attached end: no #1 split out ("nub"). */
  nub: boolean;
  /** Three or more receivers packed within a few yards of each other. */
  bunch: boolean;
  /** Two receivers aligned one behind the other. */
  stack: boolean;
  /** #1's lateral distance from the ball (yd), if he exists. */
  oneSplit: number | null;
  /** #1 aligned in a reduced split. */
  reduced: boolean;
  /** #2 and #3 aligned close together outside a bunch (a wing on an end, a tight pair). */
  close23: boolean;
}

export interface FormationStructure {
  key: FormationKey;
  strong: SideStructure;
  weak: SideStructure;
  /** Backs in the backfield (not the QB). */
  backs: number;
  /** Side of the primary back's offset, or 'C' when he is behind the QB. */
  backOffset: 'S' | 'W' | 'C' | null;
  /** The strong side is the wide side of the field (ball on the far hash). */
  strongToField: boolean | null;
  /** Lone detached weak receiver: the isolated backside X. */
  isoWeak: boolean;
  /** Trips with an attached end as #3 ("closed"/"Trey"). */
  closedTrips: boolean;
  /** Tags coverage checks match on, most specific first. */
  tags: StructureTag[];
}

function side(off: OffenseAlignment, s: 'S' | 'W'): SideStructure {
  const refs: ReceiverRef[] = [];
  for (let n = 1; n <= 4; n++) if (off.numbering[`${s}${n}` as ReceiverRef]) refs.push(`${s}${n}` as ReceiverRef);
  const spots = refs.map(r => off.spots[off.numbering[r]!]);
  const lateral = spots.map(p => Math.abs(p.pos.y - off.ballY));
  const attached = spots.some(p => p.inline);
  const detached = spots.filter(p => !p.inline).length;
  let bunch = false, stack = false;
  for (let i = 0; i + 2 < spots.length; i++) {
    const w = lateral.slice(i, i + 3);
    if (Math.max(...w) - Math.min(...w) <= BUNCH_WIDTH) bunch = true;
  }
  for (let i = 0; i + 1 < spots.length; i++)
    for (let j = i + 1; j < spots.length; j++)
      if (Math.abs(lateral[i] - lateral[j]) <= STACK_WIDTH && Math.abs(spots[i].pos.x - spots[j].pos.x) >= STACK_DEPTH) stack = true;
  const oneSplit = lateral.length ? lateral[0] : null;
  const close23 = lateral.length >= 3 && !bunch && Math.abs(lateral[1] - lateral[2]) <= CLOSE_PAIR;
  return { count: refs.length, refs, attached, detached, nub: refs.length > 0 && detached === 0,
    bunch, stack: stack && !bunch, oneSplit, close23,
    // A wing or attached end is not a split receiver; reduced means a wideout pulled in.
    reduced: oneSplit !== null && !spots[0].inline && oneSplit >= 6 && oneSplit < REDUCED_SPLIT };
}

/** Identify the aligned offensive structure. */
export function formationStructure(off: OffenseAlignment): FormationStructure {
  const key = formationKey(off);
  const strong = side(off, 'S');
  const weak = side(off, 'W');
  const backSlots = Object.values(off.spots).filter(p => p.backfield && p.slot !== 'QB');
  const primary = off.numbering.B ? off.spots[off.numbering.B] : undefined;
  const dy = primary ? (primary.pos.y - off.ballY) * off.strongSign : 0;
  const backOffset = primary ? (Math.abs(dy) < 1 ? 'C' : dy > 0 ? 'S' : 'W') : null;
  // The strong side is to the field when the ball sits on the hash away from it.
  const strongToField = Math.abs(off.ballY - CENTER_Y) < 1 ? null : (CENTER_Y - off.ballY) * off.strongSign > 0;
  const isoWeak = weak.count === 1 && weak.detached === 1;
  const closedTrips = strong.count === 3 && strong.attached;
  const tags: StructureTag[] = [];
  if (key === '4x1') tags.push('quads');
  if (backSlots.length === 0) tags.push(key === '3x2' || (strong.count === 3 && weak.count === 2) ? 'empty_3x2' : 'empty');
  if (strong.bunch) tags.push('bunch_strong');
  if (weak.bunch) tags.push('bunch_weak');
  if (strong.stack) tags.push('stack_strong');
  if (weak.stack) tags.push('stack_weak');
  if (strong.count === 3 && weak.count <= 1 && strong.close23) tags.push('close_23');
  if (strong.count === 3 && weak.count <= 1) tags.push(closedTrips ? 'trips_closed' : 'trips_open', 'trips');
  if (weak.nub) tags.push('nub_weak');
  if (strong.nub) tags.push('nub_strong');
  if (backSlots.length >= 2) tags.push('two_back');
  if (isoWeak) tags.push('iso_weak');
  if (strong.reduced) tags.push('reduced_strong');
  if (weak.reduced) tags.push('reduced_weak');
  return { key, strong, weak, backs: backSlots.length, backOffset, strongToField, isoWeak, closedTrips, tags };
}
