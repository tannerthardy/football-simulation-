/**
 * Pattern-match rules. Each rule looks at the declarations of the receivers a
 * defender keys (#1/#2/#3 to his side, the back, the trips #3 for a poach
 * safety) and returns what he should be doing now: play a landmark zone, cover
 * a receiver with a technique, trap a quick out, wall a vertical, or rob an
 * in-breaker's window. Exchanges between defenders (Palms, Rip/Liz, quarters
 * #2 reads) emerge from complementary rules reading the same receiver, each
 * through his own eyes — so they can bust when one reads it late.
 *
 * Rules follow the user's coverage-mechanics reference (chs. 5–15) and common
 * coaching definitions; thresholds (carry depths, what counts as "under") are
 * installation choices, named here so they can be tested and tuned.
 */
import type { ZoneId, ZoneStyle, MatchRule } from '../../playbook/types.js';
import type { Agent } from '../agent.js';
import type { Vec2 } from '../../core/vec.js';
import { zoneLandmark } from '../../playbook/alignment.js';
import type { ManOptions } from '../behaviors/defense.js';
import { believesRun, knowsPass } from '../behaviors/defense.js';
import type { PlaySim } from '../playsim.js';
import { isQuickOut, type ReceiverRead, type ReleaseReader } from './reads.js';
import { hasVisibleCap } from './judgment.js';
import { FIELD_WIDTH } from '../../core/field.js';

export const APEX_LEVERAGE = Number(process.env.APEX_LEVERAGE ?? 7);
/** CUT_WALL (experimental, off; CUT_WALL=1): a hook defender walls a shallow crosser from his own area and passes him
 * to the next dropper ("collision and pass"), square to the QB at his window depth, instead of jumping him and carrying
 * him man head-up 8 yd past his area. The low-hole rat (whose job is the crosser) keeps the jump. */
export const CUT_WALL = process.env.CUT_WALL !== '0';
/** CUT_WALL: his area for a crosser, a side of his landmark (yd): half a hook band (zoneBand's hooks are 11-12 yd wide;
 * choice); he takes a crosser inside CUT_ENTER and passes him past CUT_EXIT (the margin is the commit rule). */
export const CUT_ENTER = 5;
export const CUT_EXIT = 6;
const APEX_OUTSIDE = 1.0;

export type Directive =
  | { t: 'qshort'; r: Agent }
  | { t: 'zone'; zone: ZoneId; style: ZoneStyle }
  | { t: 'man'; r: Agent; opts: ManOptions }
  | { t: 'read'; r: Agent; initialPosition: Vec2 }
  | { t: 'trap'; r: Agent }
  | { t: 'wall'; r: Agent; inside?: number; flat?: Agent }
  | { t: 'rob'; r: Agent }
  /** CUT_WALL: wall a shallow crosser from his own area (landmark `area`, half-width `half`), square to the QB. */
  | { t: 'crossWall'; r: Agent; area: Vec2; half: number };

export interface RuleState {
  /** Locked branch of the rule after a declaration ("zoned off", "trap", "carry #2"). */
  mode?: string;
  /** The crosser a hook defender has cut, while he carries him. */
  cut?: Agent;
  /** The receiver an area/banjo pickup settled on. */
  match?: Agent;
  /** When a pending call (a corner's "In") was first seen. */
  pendingAt?: number;
  /** APEX_LEVERAGE: the back the apex has committed to as a flat threat under him. */
  flatBack?: Agent;
}

export interface RuleCtx {
  a: Agent;
  sim: PlaySim;
  reader: ReleaseReader;
  /** The side his rule is written for (formation strength), and its +y sign. */
  side: 'S' | 'W';
  sign: number;
  /** Nominal landmark zone and technique. */
  zone: ZoneId;
  style: ZoneStyle;
  state: RuleState;
}

// ------------------------------------------------------------ helpers

const zoneOf = (c: RuleCtx, zone: ZoneId = c.zone): Directive => ({ t: 'zone', zone, style: c.style });
const man = (rd: ReceiverRead, opts: ManOptions = {}): Directive =>
  ({ t: 'man', r: rd.r, opts: { ...opts, initialPosition: { ...rd.pos } } });
const readRelease = (rd: ReceiverRead): Directive =>
  ({ t: 'read', r: rd.r, initialPosition: { ...rd.pos } });

function ref(c: RuleCtx, n: 1 | 2 | 3, side: 'S' | 'W' = c.side): ReceiverRead | null {
  return c.reader.readRef(c.sim, `${side}${n}`);
}

/** The back, once he has released to this side. */
function backTo(c: RuleCtx): ReceiverRead | null {
  for (const ref of ['B', 'B2'] as const) {
    const rd = c.reader.readRef(c.sim, ref);
    if (rd && rd.release !== 'none' && rd.release !== 'block' && rd.outSign === c.sign) return rd;
  }
  return null;
}

const vertical = (rd: ReceiverRead | null, depth = 4): boolean => !!rd && rd.release === 'vertical' && rd.depth >= depth;
const climbing = (rd: ReceiverRead | null): boolean => !!rd && (rd.release === 'vertical' || rd.climbed);
/** The "no cover zone": a match corner owns any route by #1 whose stem gets past it. */
const NO_COVER = 5;
/** QCORNER (experimental, numeric bitmask, default 0): bit 4, the quarters MOD corner who zoned off a short #1 plays
 * #1's path (QuarterShort in techniques.ts) instead of the deep quarter's drop. */
const QCORNER_BITS = Number(process.env.QCORNER ?? 0);
export const QCORNER_SHORT = (QCORNER_BITS & 4) !== 0;
/** How long a shallow break must hold before a corner commits to zoning off it (s). */
const DECLARE = 0.35;

/**
 * MOD/Rip-Liz corner's "In"/"Under" check on #1: should he zone off and find
 * the next vertical? Only when #1 declares shallow: a break (under, flat, in or
 * out) before his stem clears the no-cover zone. That locks the zone-off.
 * A short stop zones off only while he sits; he can still turn upfield.
 * Outs, curls and in-breakers past the no-cover zone stay the corner's man.
 */
function zoneOffOne(c: RuleCtx, one: ReceiverRead, china = true): boolean {
  const st = c.state;
  if (st.mode === 'zoned') return true;
  const inside = one.release === 'under' || (china && one.release === 'in');
  if (st.mode === 'pending') {
    // Still breaking inside: the call firms up once it has held for a beat.
    if (inside) {
      if (c.sim.t - (st.pendingAt ?? c.sim.t) >= DECLARE) st.mode = 'zoned';
      return true;
    }
    st.mode = undefined;
    st.pendingAt = undefined;
  }
  if (one.deepest > NO_COVER) return false;
  // Without a #2 to his side there is no Smash to sink under ("China is not
  // available" vs any x1, HNFL-095): only #1 running shallow across ("In")
  // takes the corner off him; a short stop or out stays his man.
  // The call is made once #1 "truly declares" shallow, "not just getting us
  // to zone off, then running upfield" (HNFL-079). An inside break ("In",
  // "Under") hands #1 across the formation, so once it has held for a beat
  // the zone-off is final. A short out or flat stays in the corner's own deep
  // area: he zones off while #1 is shallow and has him again if #1 turns
  // upfield past the no-cover zone (out-and-up), like a short stop.
  if (inside) {
    st.mode = 'pending';
    st.pendingAt = c.sim.t;
    return true;
  }
  return china && (one.release === 'stop' || one.release === 'out' || one.release === 'flat');
}

/** #1 failed to clear the no-cover zone or came under: the "China"/"Under" picture an apex pushes to. */
const oneShallow = (one: ReceiverRead | null): boolean => !!one && one.deepest <= NO_COVER
  && (one.release === 'under' || one.release === 'in' || one.release === 'stop' || one.release === 'out');

/** #3 to this side: a third receiver, or the back once he releases here. */
const threeTo = (c: RuleCtx): ReceiverRead | null => ref(c, 3) ?? backTo(c);

/** #3 is away: no third receiver here, and the back has released to the other side. */
function threeAway(c: RuleCtx): boolean {
  if (ref(c, 3)) return false;
  const b = c.reader.readRef(c.sim, 'B');
  return !!b && b.release !== 'none' && b.release !== 'block' && b.outSign !== c.sign;
}

/** Over-the-top help on #1 if he is going deep, else rob his in-breaker. */
function helpOne(c: RuleCtx, one: ReceiverRead | null, lev: 'inside' | 'outside' = 'inside'): Directive {
  if (!one) return zoneOf(c);
  if (climbing(one)) return man(one, { overTop: true, lev });
  return { t: 'rob', r: one.r };
}

// ------------------------------------------------------------ rules

/** Cover 3 match corner: carry #1 in the outside third (outside leverage, post help inside); zone off when #1 declares shallow and find #2 high. */
function c3Corner(c: RuleCtx): Directive {
  const one = ref(c, 1);
  if (!one || zoneOffOne(c, one)) return zoneOf(c);
  return man(one, { lev: 'outside', overTop: true });
}

/** #3 (or the back) to this side releasing straight to the flat: the "fast 3" that triggers a Push. */
const fastFlat = (rd: ReceiverRead | null): boolean => !!rd && rd.release === 'flat' && rd.depth < 2;

/** Rip/Liz curl-flat (seam) player: match #2 vertical to `carry` yards; anything else declares the curl-flat zone.
 * Push (HNFL-203/065, Saban): a fast #3 to the flat is chased top-down by the
 * seam/flat player while the hook pushes to #2. Smash (HNFL-016, USAF Rip/Liz):
 * #1 settling short with #2 vertical sends the overhang to hunt #1 while the
 * corner bails under #2. */
function seamCurlFlat(c: RuleCtx, carry: number, deliver = false): Directive {
  if (MATCH_DECLARE) return seamCurlFlatDeclared(c, carry, deliver);
  // With no #2 to this side the released back is #2 (Cover 9's weak seam/flat on the RB).
  const two0 = ref(c, 2);
  const two = two0 ?? backTo(c);
  const one = ref(c, 1);
  const three = two0 ? threeTo(c) : null;
  if (c.state.mode === 'push' && three) return man(three, { lev: 'inside', overTop: true });
  if (c.state.mode === 'smash' && one) return man(one, { lev: 'inside' });
  if (!two || c.state.mode === 'zoned') return zoneOf(c);
  if (fastFlat(three) && two.depth < carry && two.release !== 'flat' && two.release !== 'out') {
    c.state.mode = 'push';
    return man(three!, { lev: 'inside', overTop: true });
  }
  if (oneShallow(one) && one!.release === 'stop' && two.release === 'vertical') {
    c.state.mode = 'smash';
    return man(one!, { lev: 'inside' });
  }
  // Reading #2 is already an installed duty. Do not spend the release
  // cushion driving at a shallow lane before the route earns its match.
  if (two.release === 'none' || (two.release === 'vertical' && two.depth < 3)) return readRelease(two);
  if (vertical(two, 3)) {
    if (two.depth > carry) {
      // Installed depth permits delivery; it does not establish replacement.
      // Keep the acquired vertical when the existing observed roof estimate
      // cannot sustain help. No hidden flight or teammate assignment enters.
      if (deliver && !hasVisibleCap(c.a, c.sim, two)) return man(two, { lev: 'inside' });
      c.state.mode = 'zoned';
      return zoneOf(c);
    }
    return man(two, { lev: 'inside' });
  }
  if (two.release !== 'vertical' && two.release !== 'block') c.state.mode = 'zoned';
  return zoneOf(c);
}

/** MATCH_DECLARE (experimental, off; MATCH_DECLARE=1 turns it on): the match seam/curl-flat player (Rip/Liz
 * `c3_curl_flat`, `c3_seam` in Seam, Cover 9 and fire zone) reads #2 through the taught declare phase, about three steps
 * or 5 yd (Saban Rip/Liz; USA Football 7272; coverage-position spec gap 6), before he commits, and re-reads when the
 * route changes instead of latching "zoned" on the first break:
 * - undeclared (#2 not yet 5 yd deep, inside the first `MATCH_DECLARE_T` s, and not in the flat): read his release;
 * - vertical: carry to `carry`, then deliver (unchanged); once delivered, the hand-off is final;
 * - out or flat: match #2 out (and up), top-down, outside leverage (HNFL-056 "match #2 out and up"); an out-and-up
 *   re-reads to the vertical carry;
 * - in or under: with #3 away (no #3 here, the back released to the other side) take #2 back across (HNFL-292), a man
 *   carry CUT_WALL's pass-off leaves alone; otherwise deliver him to the hook ("under") and play the curl;
 * - stop: sit in the curl-flat zone over him.
 * Push and Smash are unchanged. Every input is his own read of the receivers (ReleaseReader). */
export const MATCH_DECLARE = process.env.MATCH_DECLARE === '1';
/** MATCH_DECLARE: the declare phase's time (s after the snap; about three steps) and depth (yd). */
const MATCH_DECLARE_T = 0.9;
const MATCH_DECLARE_YD = 5;

function seamCurlFlatDeclared(c: RuleCtx, carry: number, deliver: boolean): Directive {
  const st = c.state;
  const two0 = ref(c, 2);
  const two = two0 ?? backTo(c);
  const one = ref(c, 1);
  const three = two0 ? threeTo(c) : null;
  if (st.mode === 'push' && three) return man(three, { lev: 'inside', overTop: true });
  if (st.mode === 'smash' && one) return man(one, { lev: 'inside' });
  if (!two || st.mode === 'delivered') return zoneOf(c);
  if (fastFlat(three) && two.depth < carry && two.release !== 'flat' && two.release !== 'out') {
    st.mode = 'push';
    return man(three!, { lev: 'inside', overTop: true });
  }
  if (oneShallow(one) && one!.release === 'stop' && two.release === 'vertical') {
    st.mode = 'smash';
    return man(one!, { lev: 'inside' });
  }
  st.mode = undefined;
  const declared = two.release === 'flat' || two.deepest >= MATCH_DECLARE_YD || c.sim.t >= MATCH_DECLARE_T;
  if (two.release === 'none' || !declared) return readRelease(two);
  switch (two.release) {
    case 'vertical':
      if (two.depth > carry) {
        if (deliver && !hasVisibleCap(c.a, c.sim, two)) return man(two, { lev: 'inside' });
        st.mode = 'delivered';
        return zoneOf(c);
      }
      return man(two, { lev: 'inside' });
    case 'out': case 'flat':
      return man(two, { lev: 'outside', overTop: true });
    case 'in': case 'under':
      if (threeAway(c)) { st.mode = 'across'; return man(two, { lev: 'inside' }); }
      return zoneOf(c);
    default:
      return zoneOf(c);
  }
}

/**
 * Cut: a hook defender jumps a shallow crosser coming into his area ("under"
 * call from the curl-flat player) and carries him until he has run through it,
 * then looks for the dig behind (robot). A rat's installed low-hole area
 * stays fixed while he moves; this alone does not signal a man exchange.
 */
function cut(c: RuleCtx, area?: Vec2): Directive | null {
  const st = c.state;
  // CUT_WALL: a hook (not the rat, who is given his low-hole area) walls a crosser from his own area.
  if (CUT_WALL && !area) return cutWall(c);
  const center = area ?? c.a.pos;
  // The shared man producer supplies the acquired entry picture for every match.
  const carry = (rd: ReceiverRead) => man(rd, { lev: 'head' });
  if (st.cut) {
    const rd = c.reader.read(c.sim, st.cut);
    // Through my area (8+ yards past me toward the far side) or turned upfield: let him go.
    if (rd && rd.release === 'under' && Math.abs(rd.pos.y - center.y) < 8 && rd.depth < 8) return carry(rd);
    st.cut = undefined;
    return null;
  }
  let best: ReceiverRead | null = null;
  let bd = Infinity;
  for (const r of c.sim.offense) {
    const rd = c.reader.read(c.sim, r);
    if (!rd || rd.release !== 'under' || rd.depth > 7) continue;
    // "Under" also includes an early diagonal in-break. The low-hole rat
    // keeps playing the window until the acquired path is actually across
    // him; a shallow declaration alone does not make a climbing stem a cross.
    if (area && (Math.abs(rd.pos.y - center.y) >= 8 || Math.abs(rd.vel.y) <= Math.abs(rd.vel.x))) continue;
    const toward = Math.sign(center.y - rd.pos.y) * rd.vel.y > 1.5;
    const d = Math.hypot(rd.pos.x - c.a.pos.x, rd.pos.y - c.a.pos.y);
    if (toward && d < 9 && d < bd) {
      best = rd;
      bd = d;
    }
  }
  if (!best) return null;
  st.cut = best.r;
  return carry(best);
}

/** CUT_WALL: the hook's crosser rule as taught. A shallow crosser (under, 7 yd or less) coming into his area is walled
 * from his area square to the QB, and passed once he is through it; the next dropper walls him the same way. His area is
 * his landmark, not where he stands, so it does not travel with the crosser. */
function cutWall(c: RuleCtx): Directive | null {
  const st = c.state;
  const lm = zoneLandmark(c.zone, c.sim.offAlign);
  const wall = (rd: ReceiverRead): Directive => ({ t: 'crossWall', r: rd.r, area: lm, half: CUT_ENTER });
  if (st.cut) {
    const rd = c.reader.read(c.sim, st.cut);
    if (rd && rd.release === 'under' && rd.depth < 8 && Math.abs(rd.pos.y - lm.y) < CUT_EXIT) return wall(rd);
    st.cut = undefined;
    return null;
  }
  let best: ReceiverRead | null = null;
  let bd = Infinity;
  for (const r of c.sim.offense) {
    const rd = c.reader.read(c.sim, r);
    if (!rd || rd.release !== 'under' || rd.depth > 7 || Math.abs(rd.pos.y - lm.y) >= CUT_ENTER) continue;
    const toward = Math.sign(lm.y - rd.pos.y) * rd.vel.y > 1.5 || Math.abs(rd.vel.y) > 1.5;
    const d = Math.abs(rd.pos.y - lm.y);
    if (toward && d < bd) { best = rd; bd = d; }
  }
  if (!best) return null;
  st.cut = best.r;
  return wall(best);
}

/** Match hook: carry #3 (or the back to his side) vertical to 15; cut a shallow crosser into him; otherwise play the hook and robot.
 * On a Push (fast #3 to the flat while #2 climbs) he takes #2, the new #3, up the seam. */
function c3Hook(c: RuleCtx): Directive {
  const three = ref(c, 3) ?? backTo(c);
  const two = ref(c, 2);
  if (c.state.mode === 'push' && two) {
    if (two.depth < 15) return man(two, { lev: 'inside' });
    c.state.mode = 'zoned';
  }
  if (two && c.state.mode !== 'zoned' && fastFlat(three) && two.release === 'vertical' && two.depth < 12) {
    c.state.mode = 'push';
    return man(two, { lev: 'inside' });
  }
  if (three && c.state.mode !== 'zoned' && vertical(three, 3)) {
    if (three.depth < 15) return man(three, { lev: 'inside' });
    c.state.mode = 'zoned';
  }
  return cut(c) ?? zoneOf(c);
}

/** 3-match Mike: the back is his final #3 — carry a vertical or angle release; cut crossers; otherwise wall the middle and robot. */
function mike3(c: RuleCtx): Directive {
  const b = c.reader.readRef(c.sim, 'B');
  if (b && c.state.mode !== 'zoned' && (b.release === 'vertical' || b.release === 'in' || (b.release === 'under' && b.depth > 1.5))) {
    if (c.state.mode === 'widen') c.state.mode = undefined;
    if (b.depth < 15) return man(b, { lev: 'inside' });
    c.state.mode = 'zoned';
  }
  return cut(c) ?? (APEX_LEVERAGE & 4 ? mikeWiden(c, b) : null) ?? zoneOf(c);
}

/** APEX_LEVERAGE 4: the quarters Mike widens to the hook on the side he sees the back release flat, so the apex
 * can stay over #2 and the flat. A commitment on his own read: enter once the back is declared flat and 2+ yd
 * outside his alignment; hold it until the back is seen back inside 1 yd (a flat-then-under back is the counter, and
 * an under/in/vertical declaration returns him to the back above). Measured, not coached: the NFL Mike's lateral
 * shift with a flat back (apex_leverage_nfl.py), stand-in debt. */
const MIKE_WIDEN_IN = 2, MIKE_WIDEN_OUT = 1;
function mikeWiden(c: RuleCtx, b: ReceiverRead | null): Directive | null {
  const fam = c.sim.defAlign.coverage.family;
  if (!b || c.state.mode === 'zoned' || (fam !== 'cover4' && fam !== 'cover6')) return null;
  if (c.state.mode === 'widen' ? b.outward < MIKE_WIDEN_OUT : !(b.release === 'flat' && b.outward >= MIKE_WIDEN_IN)) {
    if (c.state.mode === 'widen') c.state.mode = undefined;
    return null;
  }
  c.state.mode = 'widen';
  return zoneOf(c, b.outSign === c.sim.offAlign.strongSign ? 'hook_s' : 'hook_w');
}

/** Quarters corner. MEG: man on #1 wherever he goes. MOD: man on #1 unless he declares shallow, then zone the quarter. */
function qCorner(c: RuleCtx, meg: boolean): Directive {
  const one = ref(c, 1);
  if (!one) return zoneOf(c);
  if (meg) return man(one, { lev: 'outside' });
  if (zoneOffOne(c, one, !!ref(c, 2))) return QCORNER_SHORT ? { t: 'qshort', r: one.r } : zoneOf(c);
  return man(one, { lev: 'outside' });
}

/** Quarters safety: #2 decides. Vertical → carry #2 over the top; out/flat/under/stop (or pass-blocking) → help #1 (cap a vertical, rob an in-breaker). */
/** SCREW (experimental, off; SCREW=1 turns it on): Screw, the quarters answer to play action (HNFL-114, image-checked:
 * "plays as MOD unless there is any sort of play fake between the QB and back; then the apex triggers and the strong
 * safety takes #2 up and out; nickel reroutes, but no carry"; USA Football 7422 "Mix"). When the quarters safety reads
 * run, he takes #2 man while #2 goes up or out, over the top from outside, instead of easing down into his alley (#2
 * breaking in or short returns him to his #2-to-1 key and his help on #1); the
 * apex's force is unchanged. A real handoff he sees still pulls him into his fit (the coverage defender's keyed run
 * support fires on the carrier he sees), so play action costs him nothing while a run costs him a beat. A game-plan
 * call in the sources (played when #2's split makes Read useless); here a switch for every q_safety call. */
export const SCREW = process.env.SCREW === '1';

function qSafety(c: RuleCtx): Directive {
  const one = ref(c, 1);
  const two = ref(c, 2);
  // Screw: #2 up (or not yet declared) or out is his; #2 breaking in or short hands him back to his #2-to-1 key.
  const upOrOut = (rd: ReceiverRead) => rd.release === 'none' || rd.release === 'vertical' || rd.release === 'out' || rd.release === 'flat';
  if (SCREW && two && two.release !== 'block') {
    if (c.state.mode === 'screw') {
      if (upOrOut(two)) return man(two, { overTop: true, lev: 'outside' });
      c.state.mode = undefined;
    } else if (c.state.mode === undefined && believesRun(c.sim, c.a) && upOrOut(two)) {
      c.state.mode = 'screw';
      return man(two, { overTop: true, lev: 'outside' });
    }
  }
  if (c.state.mode === 'two' && two) return man(two, { overTop: true, lev: 'inside' });
  if (c.state.mode === 'one') return helpOne(c, one);
  if (!two) return one && climbing(one) ? man(one, { overTop: true, lev: 'inside' }) : zoneOf(c);
  // Past quick-out depth before a safety commits to carrying #2.
  if (vertical(two, 7)) {
    c.state.mode = 'two';
    return man(two, { overTop: true, lev: 'inside' });
  }
  if (two.release === 'block') return knowsPass(c.sim, c.a) ? helpOne(c, one) : zoneOf(c);
  if (two.release !== 'none' && two.release !== 'vertical') {
    c.state.mode = 'one';
    return helpOne(c, one);
  }
  return zoneOf(c);
}

/** Apex (nickel/Sam/curl-flat) next to a #2 read: wall #2's vertical to 10 yards for the safety, otherwise play curl-flat. */
function wallTwo(c: RuleCtx, handoff: number, readStem = false, apex = false): Directive {
  const two = ref(c, 2);
  if (!two || c.state.mode === 'zoned') return zoneOf(c);
  // Other wall callers have their own cut/deep-help contracts.
  if (readStem && (two.release === 'none' || (two.release === 'vertical' && two.depth < 2))) return readRelease(two);
  if (vertical(two, 2)) {
    if (two.depth < handoff) return apex && APEX_LEVERAGE ? apexWall(c, two) : { t: 'wall', r: two.r };
    c.state.mode = 'zoned';
    return zoneOf(c);
  }
  if (two.release !== 'none' && two.release !== 'vertical' && two.release !== 'block') c.state.mode = 'zoned';
  return zoneOf(c);
}

/** Quarter-flat owns #2's acquired low out, including a later wheel.
 * Palms shares the seam wall but installs its corner as the flat matcher;
 * its apex must instead retain the curl. This is installed call knowledge,
 * not a query of the corner's private live choice or a promised handoff.
 *
 * Beyond #2's flat (HNFL-094/365, Quarter Flat): when #1 fails to clear the
 * no-cover zone or comes under ("China"/"Under"), the corner sinks and the
 * apex pushes to #1's route. When #2 runs shallow inside with #3 away, the
 * midpoint is occupied by #3 and cannot take a delivery: the apex carries #2
 * back across himself. */
/** Q_APEX (experimental, off; Q_APEX=1 turns it on): the quarters apex (`q_apex`: MOD, MEG, Palms, the 6/8 quarters
 * side) adds his taught rules for #3 and the flat (coverage-position spec item 2; HNFL-200/365/078/198/051), from his
 * own read, before the existing ones:
 * - #2 under with #3 away: take him back across (the existing "two" carry), which CUT_WALL's pass-off now leaves alone
 *   (defender.ts: there is nobody to pass him to);
 * - #2 still climbing past 10 yd (walled to the hand-off) while #3 or the back to his side goes to the flat: take the first
 *   flat, top-down, inside-out;
 * - Palms (the corner traps #2's flat): close the curl window over #1 instead of chasing the flat, walling #1 inside. */
export const Q_APEX = process.env.Q_APEX === '1';

function quarterFlatTaught(c: RuleCtx): Directive | null {
  const two = ref(c, 2), one = ref(c, 1);
  const corner = c.sim.defAlign.coverage.roles[c.side === 'S' ? 'CB_S' : 'CB_W'];
  const cornerTakesFlat = corner?.kind === 'zone' && corner.rule === 'palms_corner';
  if (c.state.mode === 'flat3') {
    const f = c.state.match ? [ref(c, 3), backTo(c)].find((rd) => rd?.r === c.state.match) : null;
    if (f) return man(f, { lev: 'inside', overTop: true });
    c.state.mode = undefined; c.state.match = undefined;
  }
  if (two && two.release === 'vertical' && two.depth >= 10 && two.vel.x > 3) {
    const f = [ref(c, 3), backTo(c)].find((rd) => !!rd && rd.r !== two.r && rd.outSign === c.sign && rd.release === 'flat');
    if (f) { c.state.mode = 'flat3'; c.state.match = f.r; return man(f, { lev: 'inside', overTop: true }); }
  }
  if (cornerTakesFlat && two && (two.release === 'flat' || two.release === 'out') && !two.climbed) {
    if (one && (one.release === 'in' || one.release === 'under') && one.depth < 14) return man(one, { lev: 'inside' });
    return zoneOf(c, c.side === 'S' ? 'curl_s' : 'curl_w');
  }
  return null;
}

function quarterFlat(c: RuleCtx): Directive {
  if (Q_APEX) { const d = quarterFlatTaught(c); if (d) return d; }
  const two = ref(c, 2);
  const one = ref(c, 1);
  const corner = c.sim.defAlign.coverage.roles[c.side === 'S' ? 'CB_S' : 'CB_W'];
  const cornerTakesFlat = corner?.kind === 'zone' && corner.rule === 'palms_corner';
  const cornerOnOne = corner?.kind === 'zone' && corner.rule === 'q_corner_mod';
  // Key #3 every tick: a declaration is believed only after it persists in
  // his own reads, so a glance at the moment #2 breaks would come too late.
  const away = threeAway(c);
  if (!cornerTakesFlat && two && c.state.mode !== 'zoned'
    && (c.state.mode === 'flat' || isQuickOut(two, c.sim))) {
    c.state.mode = 'flat';
    return man(two, { lev: 'inside', overTop: true });
  }
  if (c.state.mode === 'one' && one) return man(one, { lev: 'inside' });
  if (c.state.mode === 'two' && two) return man(two, { lev: 'head' });
  if (cornerOnOne && two && c.state.mode !== 'zoned' && oneShallow(one) && two.release !== 'flat') {
    c.state.mode = 'one';
    return man(one!, { lev: 'inside' });
  }
  if (two && c.state.mode !== 'zoned' && two.release === 'under' && two.deepest <= 7 && away) {
    c.state.mode = 'two';
    return man(two, { lev: 'head' });
  }
  return wallTwo(c, 10, true, true);
}

/** APEX_LEVERAGE (bitmask, off at 0): the quarters apex's wall on #2's vertical.
 * 1: level on #2 rather than 0.8 yd inside (the deep-quarter safety owns the
 *    seam's inside; the apex keeps #2 from flattening outside and stays square).
 * 2: once he commits to the back as a flat threat to his side, he stops
 *    leading #2 (the safety has him over the top), widens to #2's outside and
 *    holds a cushion over the back he sees instead of carrying #2 to the hand-off.
 * Measured, not coached: level leverage, 1 yd outside with a flat back and the
 * cushion over the back are the NFL quarters apex's medians
 * (apex_leverage_nfl.py), stand-in debt. */
function apexWall(c: RuleCtx, two: ReceiverRead): Directive {
  const flat = APEX_LEVERAGE & 2 ? flatThreat(c) : undefined;
  return { t: 'wall', r: two.r, inside: flat ? -APEX_OUTSIDE : APEX_LEVERAGE & 1 ? 0 : undefined, flat };
}

/** A back he sees threatening the flat under him: moving outward to his side, before the release is declared (the
 * declaration needs ~3 yd of width, too late for the apex to stay over it). Committed: enter at 1.5 yd outward and
 * 1.5 yd/s outward speed (the flat_position.py "showed" cue); exit when seen back inside 0.5 yd or declared
 * under / in / vertical. */
const FLAT_IN = 1.5, FLAT_OUT = 0.5;
function flatThreat(c: RuleCtx): Agent | undefined {
  for (const ref of ['B', 'B2'] as const) {
    const rd = c.reader.readRef(c.sim, ref);
    if (!rd || rd.outSign !== c.sign) continue;
    const declaredAway = rd.release === 'under' || rd.release === 'in' || rd.release === 'vertical' || rd.release === 'block';
    if (c.state.flatBack === rd.r) {
      if (declaredAway || rd.outward < FLAT_OUT) { c.state.flatBack = undefined; continue; }
      return rd.r;
    }
    if (!declaredAway && rd.outward >= FLAT_IN && rd.vel.y * rd.outSign >= 1.5) { c.state.flatBack = rd.r; return rd.r; }
  }
  return undefined;
}

/** Palms/2-Read corner: trap #2's quick out; otherwise MOD on #1. */
function palmsCorner(c: RuleCtx): Directive {
  const two = ref(c, 2);
  if (c.state.mode === 'trap' && two) return { t: 'trap', r: two.r };
  if (two && isQuickOut(two, c.sim) && c.state.mode !== 'zoned') {
    c.state.mode = 'trap';
    return { t: 'trap', r: two.r };
  }
  return qCorner(c, false);
}

/** Palms safety: #2 quick out → replace the corner over #1; #2 vertical → carry #2; #2 under → help #1. */
function palmsSafety(c: RuleCtx): Directive {
  const one = ref(c, 1);
  const two = ref(c, 2);
  if (c.state.mode === 'one' && one) return man(one, { overTop: true, lev: 'outside' });
  if (c.state.mode === 'two' && two) return man(two, { overTop: true, lev: 'inside' });
  if (!two) return helpOne(c, one);
  if (isQuickOut(two, c.sim) && one) {
    c.state.mode = 'one';
    return man(one, { overTop: true, lev: 'outside' });
  }
  if (vertical(two, 7)) {
    c.state.mode = 'two';
    return man(two, { overTop: true, lev: 'inside' });
  }
  if (two.release === 'under' || two.release === 'in' || two.release === 'stop' || (two.release === 'block' && knowsPass(c.sim, c.a))) return helpOne(c, one);
  return zoneOf(c);
}

/**
 * Cloud (half-side) corner: reroute #1, take the first threat to the flat.
 * `sink` (Cover 2 match / trap): with no flat threat he sinks under #1's
 * vertical to ~13 yards, squeezing the hole shot between him and the half safety.
 */
/** SQUAT_TOPDOWN (experimental, off; SQUAT_TOPDOWN=1 turns it on): the Cover 2 squat/cloud corner plays the flat
 * top-down, as taught (coverage-position spec item 7; HNFL-099/097/334: "the ball brings you flat", "sink and
 * squeeze the hole shot"), from his own read, re-read every tick instead of locking the flat:
 * - a flat threat (#2, #3 or the back to the flat, or a short out) with a high threat over him (#1 climbing outside,
 *   or a #2 who has climbed past 7 yd breaking out: fade, corner, sail): sink under the high threat, trailing him from
 *   inside, until he passes 15 yd (the half safety's), then come back down to the flat;
 * - a flat threat with nothing over him: the flat zone;
 * - a flat runner who turns up past 7 yd (the wheel): stay on him over the top;
 * - no flat threat: man under #1 (`sink`) as before.
 * The throw still brings him down through the ball phase. */
export const SQUAT_TOPDOWN = process.env.SQUAT_TOPDOWN === '1';

function squatTopDown(c: RuleCtx, sink: boolean): Directive {
  const st = c.state;
  const one = ref(c, 1), two = ref(c, 2), three = ref(c, 3), back = backTo(c);
  const runners = [two, three, back].filter((rd): rd is ReceiverRead => !!rd);
  if (st.match) {
    const w = runners.find((rd) => rd.r === st.match);
    if (w && w.release === 'vertical' && w.depth > 7) return man(w, { lev: 'outside', overTop: true });
    st.match = undefined;
  }
  const flat = runners.find((rd) => rd.release === 'flat' || (rd.release === 'out' && rd.depth < 6 && !rd.climbed));
  const wheel = runners.find((rd) => rd.first === 'flat' && rd.release === 'vertical' && rd.depth > 7);
  if (wheel) { st.match = wheel.r; return man(wheel, { lev: 'outside', overTop: true }); }
  if (flat) {
    const high = [one, two].find((rd) => !!rd && rd.r !== flat.r && rd.depth < 15 && rd.climbed
      && (rd.release === 'out' || (rd.release === 'vertical' && rd === one)));
    st.mode = 'flat';
    if (high) return man(high, { lev: 'inside', trail: true });
    return zoneOf(c);
  }
  st.mode = undefined;
  const inside = [two, three].filter((rd): rd is ReceiverRead => !!rd);
  const declared = inside.every((rd) => rd.release !== 'none' && rd.release !== 'flat' && rd.release !== 'out');
  if (sink && one && declared && one.release !== 'none' && one.release !== 'block') return man(one, { lev: 'outside', trail: true });
  return zoneOf(c);
}

function cloudCorner(c: RuleCtx, sink: boolean): Directive {
  if (SQUAT_TOPDOWN) return squatTopDown(c, sink);
  const one = ref(c, 1);
  const flat = [ref(c, 2), ref(c, 3), backTo(c)].find((rd) => rd && (rd.release === 'flat' || (rd.release === 'out' && rd.depth < 6)));
  if (flat || c.state.mode === 'flat') {
    c.state.mode = 'flat';
    return zoneOf(c);
  }
  // Sink only once the inside receivers have declared away from the flat:
  // eyes on #2 first, then carry #1. With no flat threat the squat corner
  // converts to man under #1 on whatever he runs (HNFL-099/255: "No flat
  // threat = convert to man under on final #1. Only the ball will bring you
  // down"), not only on a vertical inside 13.
  const inside = [ref(c, 2), ref(c, 3)].filter((rd): rd is ReceiverRead => !!rd);
  const declared = inside.every((rd) => rd.release !== 'none' && rd.release !== 'flat' && rd.release !== 'out');
  if (c.state.mode === 'under' && one) return man(one, { lev: 'outside', trail: true });
  if (sink && one && declared && one.release !== 'none' && one.release !== 'block') {
    c.state.mode = 'under';
    return man(one, { lev: 'outside', trail: true });
  }
  return zoneOf(c);
}

/** Tampa 2 Mike: run the pipe — carry the inside-most vertical through the middle to ~20 yards, otherwise the deep hole. */
/** TAMPA_PIPE (experimental, off; TAMPA_PIPE=1 turns it on): the Tampa 2 Mike runs the pipe as taught (coverage-
 * position spec item 9; HNFL-028 "Mid Run", HNFL-241 "Middle Read #3"), from his own picture:
 * - he carries a true vertical by #2 or #3 (or the back) down the middle, between the hashes plus a yard, inside
 *   trail, and keeps the one he took (no re-pick each tick);
 * - he comes off a stem the moment he sees it break outside of him (its seen velocity outward from the middle at
 *   1.5 yd/s and more than half its upfield speed), or leave the pipe, not when the release read later turns "out";
 * - two verticals in the pipe: he takes depth in the middle between them (the safeties squeeze from outside);
 * - nothing vertical in the pipe: his deep-middle zone (unchanged). */
export const TAMPA_PIPE = process.env.TAMPA_PIPE === '1';
const PIPE_HALF = 4;

function tampaPipe(c: RuleCtx): Directive {
  const sim = c.sim, mid = FIELD_WIDTH / 2;
  const outward = (rd: ReceiverRead) => Math.sign(rd.pos.y - mid || 1) * rd.vel.y;
  const inPipe = (rd: ReceiverRead) => Math.abs(rd.pos.y - mid) <= PIPE_HALF && rd.depth < 20
    && !(outward(rd) > 1.5 && outward(rd) > 0.5 * Math.max(0, rd.vel.x));
  if (c.state.match) {
    const rd = c.reader.read(sim, c.state.match);
    if (rd && inPipe(rd) && rd.release !== 'out') return man(rd, { lev: 'inside', trail: true });
    c.state.match = undefined;
  }
  const cand: ReceiverRead[] = [];
  for (const r of sim.offense) {
    const rd = c.reader.read(sim, r);
    if (rd && vertical(rd, 4) && inPipe(rd)) cand.push(rd);
  }
  if (cand.length !== 1) return zoneOf(c);
  c.state.match = cand[0].r;
  return man(cand[0], { lev: 'inside', trail: true });
}

function tampaMike(c: RuleCtx): Directive {
  if (TAMPA_PIPE) return tampaPipe(c);
  const sim = c.sim;
  let best: ReceiverRead | null = null;
  for (const r of sim.offense) {
    const rd = c.reader.read(sim, r);
    if (!rd || !vertical(rd, 4) || rd.depth > 20 || Math.abs(rd.pos.y - sim.ballY) > 9) continue;
    if (!best || Math.abs(rd.pos.y - sim.ballY) < Math.abs(best.pos.y - sim.ballY)) best = rd;
  }
  return best ? man(best, { lev: 'inside', trail: true }) : zoneOf(c);
}

/** Trix/Poach (backside) safety vs trips, key #3 to X: overtake #3's
 * vertical; if #3 cancels, zone the quarter and squeeze to X (HNFL-197:
 * "take #3 deep or squeeze to X"), capping his vertical or robbing his
 * in-breaker, rather than floating to the middle of the field. */
function poachSafety(c: RuleCtx): Directive {
  const other = c.side === 'S' ? 'W' : 'S';
  const three = ref(c, 3, other);
  const x = ref(c, 1);
  if (c.state.mode === 'three' && three) return man(three, { overTop: true, lev: 'inside' });
  if (three && vertical(three, 6)) {
    c.state.mode = 'three';
    return man(three, { overTop: true, lev: 'inside' });
  }
  if (c.state.mode === 'x' || (three && three.release !== 'none' && three.release !== 'vertical')) {
    c.state.mode = 'x';
    return helpOne(c, x);
  }
  return zoneOf(c);
}

/**
 * Read hook (Book/Stubbie/Trix midpoint, HNFL-309/270/197): key #3. Reroute
 * #3 up the seam and hand him to the safety who overtakes him (no carry);
 * match the final #3 underneath when he runs shallow; with #3 out to the
 * flat, zone the hook and cut what comes under. A back releasing fast to
 * this side ("fast #4") is pushed through and matched.
 */
function readHook(c: RuleCtx, handoff = 8): Directive {
  const three = ref(c, 3);
  const st = c.state;
  if (st.mode === 'four') {
    const b = backTo(c);
    if (b) return man(b, { lev: 'inside' });
  }
  if (st.mode === 'three' && three) {
    if (three.release === 'vertical' && three.depth >= handoff) st.mode = 'zoned';
    else return man(three, { lev: 'head' });
  }
  const back = backTo(c);
  if (three && back && st.mode !== 'zoned' && (back.release === 'flat' || back.release === 'out') && back.depth < 3) {
    st.mode = 'four';
    return man(back, { lev: 'inside' });
  }
  if (three && st.mode !== 'zoned') {
    if (three.release === 'none') return readRelease(three);
    if (three.release === 'vertical') {
      if (three.depth < handoff) return { t: 'wall', r: three.r };
      st.mode = 'zoned';
    } else if ((three.release === 'under' || three.release === 'in' || three.release === 'stop') && three.depth < handoff) {
      st.mode = 'three';
      return man(three, { lev: 'head' });
    } else if (three.release !== 'block') st.mode = 'zoned';
  }
  return cut(c) ?? zoneOf(c);
}

/**
 * MUSH nickel (Stubbie/Book apex, HNFL-270/309): man on #2 unless he runs
 * shallow, or unless #3 cancels him by going to the flat; then 7-seam-flat
 * (zone the curl-flat). With #2 and #3 both vertical the nickel keeps #2,
 * because the safety has #3.
 */
/** MUSH_TRAP (experimental, off; MUSH_TRAP=1 turns it on): in Book (cover4_book_read, cover6_book) the nickel is the
 * "Soft Squat": #3 out or flat = trap it (HNFL-050, image-checked; Ross: "if #3 runs an out, he traps it"), driving on
 * #3 from outside-in while the Mike walls #3's release and zones the hook. Stubbie keeps HNFL-270's "3 cancelled =
 * 7-seam-flat" zone. The trap holds while #3 stays shallow; a #3 who turns up is the safety's (Read #3). */
export const MUSH_TRAP = process.env.MUSH_TRAP === '1';
const BOOK_CALLS = new Set(['cover4_book_read', 'cover6_book']);

function mush(c: RuleCtx): Directive {
  const two = ref(c, 2);
  const three = ref(c, 3);
  if (MUSH_TRAP && BOOK_CALLS.has(c.sim.defAlign.coverage.id) && three) {
    if (c.state.mode === 'trap') {
      if (three.release !== 'vertical' || three.depth < 7) return { t: 'trap', r: three.r };
      c.state.mode = 'zoned';
      return zoneOf(c);
    }
    if (c.state.mode !== 'zoned' && (three.release === 'flat' || three.release === 'out') && three.depth < NO_COVER) {
      c.state.mode = 'trap';
      return { t: 'trap', r: three.r };
    }
  }
  if (!two || c.state.mode === 'zoned') return zoneOf(c);
  const cancels = !!three && (three.release === 'flat' || three.release === 'out') && three.depth < NO_COVER;
  const shallow = two.deepest <= NO_COVER && two.release !== 'none' && two.release !== 'vertical' && two.release !== 'block';
  if (cancels || shallow) {
    c.state.mode = 'zoned';
    return zoneOf(c);
  }
  if (two.release === 'none' || (two.release === 'vertical' && two.depth < 3)) return readRelease(two);
  return man(two, { lev: 'inside' });
}

/** Stubbie/Book trips safety, the 3/2 read (HNFL-270/309/195): match #3 up
 * the seam with vertical separation; if #3 cancels, push for width and cap
 * #2 up and over (the nickel stays under him); otherwise rob #2's in-breaker. */
function stubbieSafety(c: RuleCtx): Directive {
  const two = ref(c, 2);
  const three = ref(c, 3);
  if (c.state.mode === 'two' && two) return man(two, { overTop: true, lev: 'inside' });
  if (c.state.mode === 'three' && three) return man(three, { overTop: true, lev: 'inside' });
  if (three && vertical(three, 6)) {
    c.state.mode = 'three';
    return man(three, { overTop: true, lev: 'inside' });
  }
  const cancelled = !three || (three.release !== 'none' && three.release !== 'vertical');
  if (cancelled && two && vertical(two, 6)) {
    c.state.mode = 'two';
    return man(two, { overTop: true, lev: 'inside' });
  }
  if (cancelled && two && (two.release === 'in' || two.release === 'stop')) return { t: 'rob', r: two.r };
  return zoneOf(c);
}

/** Halves apex, vertical curl (HNFL-097): wall #2's vertical to 12 and match
 * #2 up and in; anything else zones the curl (a flat by #2 belongs to the
 * squat corner) and cuts what comes under. */
/** C2_APEX (experimental, off; C2_APEX=1 turns it on): the Cover 2 vertical-curl apex (`c2_hook`: Cover 2 Match,
 * Wild, Inverted, Tampa hooks, the 6/8 half-side hook) plays his taught rule on #2 (coverage-position spec item 1;
 * HNFL-334/-097 vertical curl, HNFL-015 smash), from his own read of #2 and #1, re-read every tick:
 * - undeclared (#2 not yet 5 yd, inside 0.9 s, not in the flat): read #2's release (MATCH_DECLARE's declare phase);
 * - vertical: wall him; hand him to the half safety once a safety is seen over the top past 10 yd (or at 15 yd);
 * - in (under 14 yd): match him inside (unchanged);
 * - corner, sail or deep out (an out by a #2 who has climbed past 7 yd): match it from underneath, trailing under him
 *   (the squat corner sinks on #1 or takes the flat);
 * - flat or short out: zone the curl window on his side, not the hook, and wall #1 (the new #2) breaking inside;
 * - stop or anything else: hook zone and the crosser wall (unchanged). */
export const C2_APEX = process.env.C2_APEX === '1';

function verticalCurlTaught(c: RuleCtx): Directive {
  const st = c.state;
  const two = ref(c, 2);
  const one = ref(c, 1);
  const hook = () => cut(c) ?? zoneOf(c);
  if (!two || st.mode === 'handed') return hook();
  const declared = two.release === 'flat' || two.deepest >= MATCH_DECLARE_YD || c.sim.t >= MATCH_DECLARE_T;
  if (two.release === 'none' || !declared) return readRelease(two);
  const curl = (): Directive => {
    if (one && (one.release === 'in' || one.release === 'under') && one.depth < 14) return man(one, { lev: 'inside' });
    return zoneOf(c, c.side === 'S' ? 'curl_s' : 'curl_w');
  };
  switch (two.release) {
    case 'vertical':
      if (two.depth >= 15 || (two.depth >= 10 && hasVisibleCap(c.a, c.sim, two))) { st.mode = 'handed'; return hook(); }
      return { t: 'wall', r: two.r };
    case 'in':
      return two.depth < 14 ? man(two, { lev: 'inside' }) : hook();
    case 'out':
      if (two.climbed) return man(two, { lev: 'inside', trail: true });
      return curl();
    case 'flat':
      return curl();
    default:
      return hook();
  }
}

function verticalCurl(c: RuleCtx): Directive {
  if (C2_APEX) return verticalCurlTaught(c);
  const two = ref(c, 2);
  if (c.state.mode === 'in' && two) return man(two, { lev: 'inside' });
  if (two && c.state.mode !== 'zoned' && two.release === 'in' && two.depth < 14) {
    c.state.mode = 'in';
    return man(two, { lev: 'inside' });
  }
  const d = wallTwo(c, 12);
  return d.t === 'zone' ? cut(c) ?? d : d;
}

/** Wild vertical hook vs trips (HNFL-131/334): the midpoint has #3 vertical
 * with minimal help, carried up the middle between the halves; otherwise he
 * plays the 3-match Mike (the back, crossers). */
function verticalHook(c: RuleCtx): Directive {
  const three = ref(c, 3, 'S');
  if (c.state.mode === 'three' && three) {
    if (three.depth < 18) return man(three, { lev: 'inside', trail: true });
    c.state.mode = 'zoned';
  }
  if (three && c.state.mode !== 'zoned' && vertical(three, 3)) {
    c.state.mode = 'three';
    return man(three, { lev: 'inside', trail: true });
  }
  return mike3(c);
}

/**
 * Clue 1/3 corner (Cover 3/9 vs bunch, stack or reduced #1; HNFL-091/063/203):
 * key #2 to #1. If #2 eliminates himself as a vertical threat, lock onto #1;
 * if only #2 climbs past the no-cover zone, squeeze his seam from above the
 * outside shoulder; with both vertical, play the third with vision and squeeze.
 */
function clueCorner(c: RuleCtx): Directive {
  const one = ref(c, 1), two = ref(c, 2);
  if (c.state.mode === 'one' && one) return man(one, { lev: 'outside' });
  if (c.state.mode === 'two' && two) return man(two, { lev: 'outside', overTop: true });
  if (!two) return one ? man(one, { lev: 'outside' }) : zoneOf(c);
  if (['under', 'in', 'out', 'flat', 'stop', 'block'].includes(two.release) && one) {
    c.state.mode = 'one';
    return man(one, { lev: 'outside' });
  }
  if (isUp(two) && one && one.release !== 'none' && !isUp(one) && one.release !== 'vertical') {
    c.state.mode = 'two';
    return man(two, { lev: 'outside', overTop: true });
  }
  return zoneOf(c);
}

/**
 * #3 Receiver Hook (Cover 9 Strap/Grab, HNFL-203/054): key #3 to #2. Cut off
 * and carry the final #3 up the seam or over the linebacker level; if #3
 * cancels, zone the hook and look for the final #4 (the back) coming to you.
 */
function threeRecHook(c: RuleCtx): Directive {
  const three = ref(c, 3, 'S');
  const st = c.state;
  // Under the linebacker level #3 belongs to the bonus hook; flat, to the seam/flat.
  const underLb = (rd: ReceiverRead) => rd.release === 'flat' || rd.release === 'out' || (rd.release === 'under' && rd.depth < NO_COVER);
  if (st.mode === 'three' && three) {
    if (three.depth < 18 && !underLb(three)) return man(three, { lev: 'inside' });
    st.mode = 'zoned';
  }
  if (st.mode === 'four') {
    const b = c.reader.readRef(c.sim, 'B');
    if (b) return man(b, { lev: 'inside' });
  }
  const back = c.reader.readRef(c.sim, 'B');
  if (three && st.mode !== 'zoned') {
    if (three.release === 'none' || (three.release === 'vertical' && three.depth <= 3)) return readRelease(three);
    // Up the seam, or over the top of the linebackers (a dig or deep cross).
    if (three.release === 'vertical' || (three.release === 'in' && three.depth >= 5)) {
      st.mode = 'three';
      return man(three, { lev: 'inside' });
    }
    if (three.release !== 'block') st.mode = 'zoned';
  }
  if (back && back.release !== 'none' && back.release !== 'block' && Math.abs(back.pos.y - c.a.pos.y) < 8 && st.mode !== 'four') {
    st.mode = 'four';
    return man(back, { lev: 'inside' });
  }
  return cut(c) ?? zoneOf(c);
}

/**
 * Bonus hook (Cover 9 Strap Mike, HNFL-056/203): overdrop toward the #2/#3
 * area to the strength and relate to the final #3 underneath, with no
 * vertical responsibility; otherwise cut what comes under him.
 */
function bonusHook(c: RuleCtx): Directive {
  const three = ref(c, 3, 'S');
  if (c.state.mode === 'three' && three && three.depth < 9 && three.release !== 'vertical') return man(three, { lev: 'head' });
  if (three && ['under', 'in', 'stop'].includes(three.release) && three.depth < 9) {
    c.state.mode = 'three';
    return man(three, { lev: 'head' });
  }
  c.state.mode = undefined;
  return cut(c) ?? zoneOf(c);
}

// ------------------------------------------------------------ area pickups (Box, Banjo)

const isOut = (rd: ReceiverRead) => rd.release === 'out' || rd.release === 'flat';
const isIn = (rd: ReceiverRead) => rd.release === 'under' || rd.release === 'in';
/** Up the field past the no-cover zone: a stem that has not broken by then is a vertical. */
const isUp = (rd: ReceiverRead) => rd.release === 'vertical' && rd.depth > NO_COVER;
/** He has shown his route: broken in, out or short, or cleared the no-cover zone vertically. */
const declaredRoute = (rd: ReceiverRead) => isUp(rd) || ['out', 'flat', 'under', 'in', 'stop'].includes(rd.release);
/** The receiver of `pool` that declared `test` first. */
function first(pool: ReceiverRead[], test: (rd: ReceiverRead) => boolean): ReceiverRead | null {
  return pool.filter(test).sort((a, b) => a.since - b.since)[0] ?? null;
}

/** Keep a settled pickup while he is still visible; otherwise pick again. */
function settle(c: RuleCtx, pick: ReceiverRead | null, lock: boolean, opts: ManOptions): Directive | null {
  if (c.state.match) {
    const rd = c.reader.read(c.sim, c.state.match);
    if (rd) return man(rd, opts);
  }
  if (!pick) return null;
  if (lock) c.state.match = pick.r;
  return man(pick, opts);
}

/**
 * Box (quarters vs bunch, HNFL-053/331/272): zone pickups by area of release
 * over the three bunched receivers. Low defenders take the first out and the
 * first in underneath; the corner takes the outermost receiver up the field,
 * the safety the innermost (one vertical gets both: "1 vertical route =
 * 2-on-1"). Every pool member is read every tick so the order is honest.
 */
function box(c: RuleCtx, job: 'out_low' | 'in_low' | 'out_deep' | 'in_deep'): Directive {
  const pool = ([1, 2, 3] as const).map(n => ref(c, n)).filter((rd): rd is ReceiverRead => !!rd);
  if (!pool.length) return zoneOf(c);
  // Outermost to innermost by the count (#1, #2, #3), which releases do not reshuffle.
  const ups = pool.filter(isUp);
  switch (job) {
    case 'out_low': return settle(c, first(pool, isOut), true, { lev: 'inside', overTop: true }) ?? zoneOf(c);
    case 'in_low': return settle(c, first(pool, isIn), true, { lev: 'head' }) ?? zoneOf(c);
    case 'out_deep': {
      const pick = ups[0] ?? null;
      return settle(c, pick, !!pick && pick.depth > 10, { lev: 'outside', overTop: true }) ?? zoneOf(c);
    }
    case 'in_deep': {
      const pick = ups.at(-1) ?? null;
      return settle(c, pick, !!pick && pick.depth > 10, { lev: 'inside', overTop: true }) ?? zoneOf(c);
    }
  }
}

/**
 * Area (Cover 6 vs trips exchanges or a close #2/#3, HNFL-052/073/195/019):
 * "Triangle" pickups over #2 and #3 by area of release. The quarter-flat
 * nickel takes the outermost underneath (the first out by #2/#3; with none,
 * "Smash = push to #1" on a short #1). The quarter hook takes the innermost
 * (the first in), otherwise walls final #3. The Topper safety tops whichever
 * of #2/#3 goes deep; with both deep he plays vision and squeeze.
 */
function area(c: RuleCtx, job: 'flat' | 'hook' | 'topper'): Directive {
  const pool = ([2, 3] as const).map(n => ref(c, n)).filter((rd): rd is ReceiverRead => !!rd);
  const one = ref(c, 1), three = ref(c, 3);
  if (!pool.length) return zoneOf(c);
  switch (job) {
    case 'flat': {
      const d = settle(c, first(pool, isOut), true, { lev: 'inside', overTop: true });
      if (d) return d;
      return oneShallow(one) ? man(one!, { lev: 'inside' }) : zoneOf(c);
    }
    case 'hook': {
      // Underneath only: a seam bending in past ten yards is the Topper's.
      // A stem drifting inside for a step is not a declared in: match it
      // provisionally and lock once the break has held.
      const pick = first(pool, rd => isIn(rd) && rd.deepest < 10);
      const d = settle(c, pick, !!pick && c.sim.t - pick.since >= DECLARE, { lev: 'head' });
      if (d) return d;
      if (three && vertical(three, 2) && three.depth < 10) return { t: 'wall', r: three.r };
      return cut(c) ?? zoneOf(c);
    }
    case 'topper': {
      // Deep: up past the no-cover zone, or still climbing past eight
      // yards whatever angle the stem takes (a seam bending in).
      const deep = (rd: ReceiverRead) => isUp(rd) || (rd.depth > 8 && rd.vel.x > 3);
      const ups = pool.filter(deep);
      if (c.state.match) {
        const rd = c.reader.read(c.sim, c.state.match);
        // Past ten yards he is carried. Short of that, a declared break (a
        // hitch) or a second vertical turns the top back into vision and squeeze.
        const second = ups.some(u => u.r !== c.state.match);
        if (rd && (rd.depth > 10 || (!second && (deep(rd) || rd.release === 'vertical')))) return man(rd, { lev: 'inside', overTop: true });
        c.state.match = undefined;
      }
      // Both deep: vision and squeeze between them from the quarter.
      if (ups.length !== 1) return zoneOf(c);
      return settle(c, ups[0], true, { lev: 'inside', overTop: true })!;
    }
  }
}

/**
 * Banjo (man vs bunch/stack, HNFL-074 Mini Fist, MS §15): the point is locked
 * by another defender; this pair trades #1 and #3 by release. The outside
 * defender takes the first out (or, with none, the outer man); the inside
 * defender takes the other one. Both read both receivers each tick and lock
 * once both have declared, so a late cross does not re-trade them.
 */
function banjo(c: RuleCtx, outside: boolean): Directive {
  const one = ref(c, 1), three = ref(c, 3);
  if (c.state.match) {
    const rd = c.reader.read(c.sim, c.state.match);
    if (rd) return man(rd, { lev: outside ? 'outside' : 'inside' });
  }
  if (!one || !three) return one ? man(one, { lev: 'outside' }) : zoneOf(c);
  const pair = [one, three];
  const other = (rd: ReceiverRead) => (rd === one ? three : one);
  const out = first(pair, isOut) ?? (first(pair, isIn) ? other(first(pair, isIn)!) : one);
  const mine = outside ? out : other(out);
  const declared = pair.every(declaredRoute);
  if (declared) c.state.match = mine.r;
  if (!declared) return readRelease(mine);
  return man(mine, { lev: outside ? 'outside' : 'inside' });
}

/** Inverted Cover 2 safety: rotate down to curl-flat; wall #2's vertical to 12 for the bailing corner. */
function invertSafety(c: RuleCtx): Directive {
  return wallTwo(c, 12);
}

export function runRule(rule: MatchRule, c: RuleCtx): Directive {
  switch (rule) {
    case 'c3_corner': return c3Corner(c);
    case 'c3_curl_flat': return seamCurlFlat(c, 12, true);
    case 'c3_seam': return seamCurlFlat(c, 99);
    case 'c3_hook': return c3Hook(c);
    case 'mike_3': return mike3(c);
    case 'q_corner_mod': return qCorner(c, false);
    case 'q_corner_meg': return qCorner(c, true);
    case 'q_safety': return qSafety(c);
    case 'q_apex': return quarterFlat(c);
    case 'palms_corner': return palmsCorner(c);
    case 'palms_safety': return palmsSafety(c);
    case 'cloud_corner': return cloudCorner(c, false);
    case 'sink_corner': return cloudCorner(c, true);
    case 'c2_hook': return verticalCurl(c);
    case 'vertical_hook': return verticalHook(c);
    case 'box_out_low': return box(c, 'out_low');
    case 'box_in_low': return box(c, 'in_low');
    case 'box_out_deep': return box(c, 'out_deep');
    case 'box_in_deep': return box(c, 'in_deep');
    case 'area_flat': return area(c, 'flat');
    case 'area_hook': return area(c, 'hook');
    case 'topper': return area(c, 'topper');
    case 'banjo_out': return banjo(c, true);
    case 'banjo_in': return banjo(c, false);
    case 'clue_corner': return clueCorner(c);
    case 'three_rec_hook': return threeRecHook(c);
    case 'bonus_hook': return bonusHook(c);
    case 'tampa_mike': return tampaMike(c);
    case 'poach_safety': return poachSafety(c);
    case 'stubbie_safety': return stubbieSafety(c);
    case 'invert_safety': return invertSafety(c);
    case 'read_hook': return readHook(c);
    case 'mush': return mush(c);
    case 'rat': return cut(c, zoneLandmark(c.zone, c.sim.offAlign)) ?? zoneOf(c);
    case 'robber': return zoneOf(c);
  }
}

/** The side a zone is written for (strength-relative), if any. */
export function zoneSide(zone: ZoneId): 'S' | 'W' | null {
  if (/_s(_|$)/.test(zone)) return 'S';
  if (/_w(_|$)/.test(zone)) return 'W';
  return null;
}
