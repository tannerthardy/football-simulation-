/**
 * QB_V2 module B: the passer's pre-snap plan (Flex, 2026-11-24; design note docs/reviews/2026-11-24-qb-module-b-presnap-plan.md,
 * approved in outline by Integration). At the snap, once, it turns his own pre-snap picture into a `PreSnapState` for the
 * plan the call carries: which side he reads (`flip`, by the plan's `pick`), whether the alert is on, his hot belief and
 * the man he confirms. The same condition evaluator (`condHolds`) answers the alert, the call's kill / can and the
 * pre-snap RPO rule (Rules' call-composition and RPO notes: `KillRule` and `rpo.pre` are `AlertCond | AlertCond[]`).
 *
 * Information: it reads only what it is handed. The picture is his scan (QB_SCAN: every defender with his own error,
 * drawn once per play) with the visible defensive-back group; the shell is his coverage belief (P(single-high), which
 * already carries his disguise awareness); the protection and the box width are his own call and his own alignment. No
 * defender's slot, call, tag, assignment or rating, and no true position.
 *
 * Margins (§6.1): stated coaching choices, labelled here, not fitted to any number. Each pick is made once, at the snap,
 * so a margin only separates a near-tie (he keeps the coach's side) from a clear call; nothing is re-scored, so there is
 * no exit margin and nothing to flicker. A poorer reader's larger scan error meets the margin more often and he picks the
 * wrong side; he commits to it and pays for it in the cycle (§6.2). No rating enters here except through that error.
 */
import type { AlertCond, KeyRole, PreSnapState, QbReadPlan } from './plan.js';
import { resolveRole, type PicturedMan, type RolePicture } from './roles.js';
import type { ReceiverRef } from '../../playbook/types.js';

/** He leaves the coach's side for the softer corner only when its cushion is deeper by this much (yd): about one
 * backpedal step; a smaller difference does not change a hitch or a quick out. */
export const MARGIN_CUSHION = 1.0;
/** Around P(single-high) 0.5: inside this band he has no shell read (an alert on the shell is not taken, a shell pick
 * keeps the coach's side). */
export const MARGIN_SHELL = 0.1;
/** Inside / head-up / outside of a receiver: a man within this lateral distance of him is head-up (yd). */
export const MARGIN_LEVERAGE = 0.5;
/** The hot side: 'either' when the two sides' surpluses are within this many defenders. */
export const MARGIN_HOT_SIDE = 0.5;

/** A defender pressed on a receiver: within this depth of the line and this lateral distance of him (QBMind's press rule). */
const PRESS_DEEP = 2.5;
const PRESS_WIDE = 1.8;
/** The man over a receiver who is not #1 (the corner is #1's): the nearest defender within this lateral distance of him,
 * short of this depth (yd). */
const OVER_WIDE = 3.0;
const OVER_DEEP = 12;
/** The box he counts: no deeper than this past the line (yd), within his box half-width of the ball. */
const BOX_DEEP = 7.5;

/** What his pre-snap read shows about the conditions a plan or a call can name. */
export interface PreSnapLook {
  /** The shell he reads, or null inside the margin. */
  shell: 'open' | 'closed' | null;
  /** The defenders he counts in the box, per side of the ball (a man on the ball's line counts half to each side). */
  box: { S: number; W: number; total: number };
  /** Per receiver ref on the field: the man over him, his depth (cushion), whether he is pressed, his leverage. */
  over: Partial<Record<ReceiverRef, { man: PicturedMan; cushion: number; press: boolean; leverage: 'inside' | 'head' | 'outside' }>>;
}

/** The inputs B reads: his picture and his own call. */
export interface PreSnapInputs {
  plan: QbReadPlan;
  /** His scan picture (t < 0), with the visible defensive-back group on each man and his receivers by the field's refs. */
  picture: RolePicture;
  /** His coverage belief at the snap and its single-high mass (QBMind.belief / pSingleHigh). */
  belief: Record<string, number>;
  pSingleHigh: number;
  /** Half-width of the box he counts on each side (yd from the ball): his own core's edge (tackle or attached end) + 2. */
  boxHalfWidth: { S: number; W: number };
  /** His protection as called: blockers per side of the ball (the five linemen split by the call, plus the backs and ends
   * it keeps in). Until Phase 3 rebuilds the protection, this is the call's own count. */
  protectors: { S: number; W: number };
}

const sideSign = (p: RolePicture, side: 'S' | 'W') => p.strong * (side === 'S' ? 1 : -1);
const deep = (p: RolePicture, m: { x: number }) => (m.x - p.los) * p.dir;
/** Lateral distance from the ball toward a side (+ = toward it). */
const out = (p: RolePicture, m: { y: number }, side: 'S' | 'W') => (m.y - p.ballY) * sideSign(p, side);

/** The plan's refs mirrored (S and W swapped): a flipped plan reads the other side. */
export function mirrorRef(r: ReceiverRef): ReceiverRef {
  return (r[0] === 'S' ? `W${r.slice(1)}` : r[0] === 'W' ? `S${r.slice(1)}` : r) as ReceiverRef;
}

/** The plan mirrored (S and W swapped) for a flip: every ref in the reads (looks, key sides, throws, key answers), the hot
 * rules (side and answer), the checkdown and the alert's condition. QB lane, 2026-11-24. Give `decidePreSnap` the plan as
 * authored (condHolds mirrors the alert's refs itself when it flips) and the Cycle the mirrored plan, so no ref is swapped
 * twice. */
export function mirrorPlan(plan: QbReadPlan): QbReadPlan {
  const side = <T extends string>(x: T): T => (x === 'S' ? 'W' : x === 'W' ? 'S' : x) as T;
  const cond = (c: AlertCond): AlertCond => ({
    ...c,
    ...(c.press ? { press: mirrorRef(c.press) } : {}),
    ...(c.cushion ? { cushion: { ...c.cushion, on: mirrorRef(c.cushion.on) } } : {}),
    ...(c.leverage ? { leverage: { ...c.leverage, on: mirrorRef(c.leverage.on) } } : {}),
  });
  return {
    ...plan,
    reads: plan.reads.map((r) => ({
      ...r,
      look: r.look.kind === 'receiver' ? { kind: 'receiver', ref: mirrorRef(r.look.ref) } : { ...r.look, side: side(r.look.side ?? 'S') },
      throws: r.throws.map((o) => ({ ...o, ref: mirrorRef(o.ref) })),
      ...(r.keyRules ? { keyRules: r.keyRules.map((k) => ({ ...k, throwTo: mirrorRef(k.throwTo) })) } : {}),
    })),
    hot: plan.hot.map((h) => ({ ...h, side: side(h.side), answer: { ...h.answer, ref: mirrorRef(h.answer.ref) } })),
    checkdown: plan.checkdown ? { ...plan.checkdown, ref: mirrorRef(plan.checkdown.ref) } : null,
    ...(plan.alert ? { alert: { ...plan.alert, ...(plan.alert.when ? { when: Array.isArray(plan.alert.when) ? plan.alert.when.map(cond) : cond(plan.alert.when) } : {}) } } : {}),
  };
}

/** His read of the picture: the shell from his belief, the box by side, and the man over each of his receivers. */
export function lookOf(p: RolePicture, pSingleHigh: number, boxHalfWidth: { S: number; W: number }): PreSnapLook {
  const shell = pSingleHigh > 0.5 + MARGIN_SHELL ? 'closed' : pSingleHigh < 0.5 - MARGIN_SHELL ? 'open' : null;
  const box = { S: 0, W: 0, total: 0 };
  for (const m of p.defenders) {
    const d = deep(p, m);
    if (d < -1 || d > BOX_DEEP) continue;
    const o = out(p, m, 'S');
    if (o >= 0 ? o > boxHalfWidth.S : -o > boxHalfWidth.W) continue;
    box.total++;
    if (Math.abs(o) < 0.25) { box.S += 0.5; box.W += 0.5; } else if (o > 0) box.S++; else box.W++;
  }
  const over: PreSnapLook['over'] = {};
  for (const [ref, r] of Object.entries(p.receivers) as Array<[ReceiverRef, PicturedMan | undefined]>) {
    if (!r || (ref[0] !== 'S' && ref[0] !== 'W')) continue;
    const side = ref[0] as 'S' | 'W', rOut = out(p, r, side);
    // #1's man is the corner (one rule with module C, roles.ts); any other receiver's is the nearest man over him.
    let man: PicturedMan | null = ref.endsWith('1') ? resolveRole(p, 'corner', side) : null;
    if (!man) {
      let best: PicturedMan | null = null;
      for (const m of p.defenders) {
        const d = deep(p, m);
        if (d < -1 || d > OVER_DEEP || Math.abs(out(p, m, side) - rOut) > OVER_WIDE) continue;
        if (!best || Math.hypot(d, out(p, m, side) - rOut) < Math.hypot(deep(p, best), out(p, best, side) - rOut)) best = m;
      }
      man = best;
    }
    if (!man) continue;
    const lat = out(p, man, side) - rOut; // + = outside him
    const cushion = deep(p, man);
    over[ref] = {
      man, cushion,
      press: cushion < PRESS_DEEP && Math.abs(lat) < PRESS_WIDE,
      leverage: lat > MARGIN_LEVERAGE ? 'outside' : lat < -MARGIN_LEVERAGE ? 'inside' : 'head',
    };
  }
  return { shell, box, over };
}

/** One condition (every clause it names holds) or alternatives (any one holds); absent: always. Refs are the plan's,
 * mirrored when he reads it flipped. A clause his read cannot answer (no man over the receiver, no shell read) fails. */
export function condHolds(when: AlertCond | AlertCond[] | undefined, look: PreSnapLook, flip = false): boolean {
  if (!when) return true;
  if (Array.isArray(when)) return when.some((c) => condHolds(c, look, flip));
  const ref = (r: ReceiverRef) => (flip ? mirrorRef(r) : r);
  if (when.shell && look.shell !== when.shell) return false;
  if (when.press && !look.over[ref(when.press)]?.press) return false;
  if (when.cushion) {
    const o = look.over[ref(when.cushion.on)];
    if (!o) return false;
    if (when.cushion.under != null && !(o.cushion < when.cushion.under)) return false;
    if (when.cushion.over != null && !(o.cushion > when.cushion.over)) return false;
  }
  if (when.leverage && look.over[ref(when.leverage.on)]?.leverage !== when.leverage.is) return false;
  if (when.boxAtLeast != null && !(look.box.total >= when.boxAtLeast)) return false;
  return true;
}

/** Whether he mirrors the plan, by its pick. Near the margin he keeps the coach's (strong) side. */
export function pickFlip(plan: QbReadPlan, look: PreSnapLook): boolean {
  switch (plan.pick) {
    case 'cushion': {
      // The softer corner: the cushion of the man over each #1 (the corner).
      const s = look.over.S1?.cushion, w = look.over.W1?.cushion;
      return s != null && w != null && w > s + MARGIN_CUSHION;
    }
    case 'shell':
      return !!plan.pickShell && look.shell != null && look.shell !== plan.pickShell;
    case 'leverage':
      // Pending Rules' taught rule for stick (asked 2026-11-24): until then he keeps the coach's side.
      return false;
    default:
      return false;
  }
}

/** His hot belief: by how many his box count outnumbers his protection, and from which side. */
export function hotOf(look: PreSnapLook, protectors: { S: number; W: number }): PreSnapState['hot'] {
  const overS = look.box.S - protectors.S, overW = look.box.W - protectors.W;
  const over = Math.max(0, Math.round(look.box.total - (protectors.S + protectors.W)));
  if (over <= 0) return null;
  const side = Math.abs(overS - overW) <= MARGIN_HOT_SIDE ? 'either' : overS > overW ? 'S' : 'W';
  return { side, over };
}

/** Module B: his pre-snap state for this plan, decided once at the snap. */
export function decidePreSnap(inp: PreSnapInputs): PreSnapState & { look: PreSnapLook } {
  const { plan } = inp;
  const look = lookOf(inp.picture, inp.pSingleHigh, inp.boxHalfWidth);
  const flip = pickFlip(plan, look);
  const alert = plan.alert && condHolds(plan.alert.when, look, flip) ? { read: plan.alert.read } : null;
  const confirm: KeyRole | null = plan.confirm;
  return {
    startRead: alert ? alert.read : 0,
    flip,
    alert,
    hot: hotOf(look, inp.protectors),
    confirm,
    belief: { ...inp.belief },
    look,
  };
}
