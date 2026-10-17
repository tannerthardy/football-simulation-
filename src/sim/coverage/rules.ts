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
import { knowsPass } from '../behaviors/defense.js';
import type { PlaySim } from '../playsim.js';
import { isQuickOut, type ReceiverRead, type ReleaseReader } from './reads.js';
import { hasVisibleCap } from './judgment.js';

export type Directive =
  | { t: 'zone'; zone: ZoneId; style: ZoneStyle }
  | { t: 'man'; r: Agent; opts: ManOptions }
  | { t: 'read'; r: Agent; initialPosition: Vec2 }
  | { t: 'trap'; r: Agent }
  | { t: 'wall'; r: Agent }
  | { t: 'rob'; r: Agent };

export interface RuleState {
  /** Locked branch of the rule after a declaration ("zoned off", "trap", "carry #2"). */
  mode?: string;
  /** The crosser a hook defender has cut, while he carries him. */
  cut?: Agent;
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
/** Short or settling: what MOD/Rip-Liz corners call "under" — zone off and find the next vertical. */
const under = (rd: ReceiverRead, maxDepth = 9): boolean =>
  rd.release === 'under' || rd.release === 'flat' || (rd.release === 'stop' && rd.depth < maxDepth)
  || ((rd.release === 'in' || rd.release === 'out') && rd.depth < maxDepth);

/** Over-the-top help on #1 if he is going deep, else rob his in-breaker. */
function helpOne(c: RuleCtx, one: ReceiverRead | null, lev: 'inside' | 'outside' = 'inside'): Directive {
  if (!one) return zoneOf(c);
  if (climbing(one)) return man(one, { overTop: true, lev });
  return { t: 'rob', r: one.r };
}

// ------------------------------------------------------------ rules

/** Cover 3 match corner: carry #1 vertical in the outside third (outside leverage, post help inside); zone off when #1 goes under and find #2 high. */
function c3Corner(c: RuleCtx): Directive {
  const one = ref(c, 1);
  if (!one || c.state.mode === 'zoned') return zoneOf(c);
  if (under(one, 9)) {
    c.state.mode = 'zoned';
    return zoneOf(c);
  }
  return man(one, { lev: 'outside', overTop: true });
}

/** Rip/Liz curl-flat (seam) player: match #2 vertical to `carry` yards; anything else declares the curl-flat zone. */
function seamCurlFlat(c: RuleCtx, carry: number, deliver = false): Directive {
  const two = ref(c, 2);
  if (!two || c.state.mode === 'zoned') return zoneOf(c);
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

/**
 * Cut: a hook defender jumps a shallow crosser coming into his area ("under"
 * call from the curl-flat player) and carries him until he has run through it,
 * then looks for the dig behind (robot). A rat's installed low-hole area
 * stays fixed while he moves; this alone does not signal a man exchange.
 */
function cut(c: RuleCtx, area?: Vec2): Directive | null {
  const st = c.state;
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

/** Match hook: carry #3 (or the back to his side) vertical to 15; cut a shallow crosser into him; otherwise play the hook and robot. */
function c3Hook(c: RuleCtx): Directive {
  const three = ref(c, 3) ?? backTo(c);
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
    if (b.depth < 15) return man(b, { lev: 'inside' });
    c.state.mode = 'zoned';
  }
  return cut(c) ?? zoneOf(c);
}

/** Quarters corner. MEG: man on #1 wherever he goes. MOD: man on #1 deep, zone off his under/short routes into the quarter. */
function qCorner(c: RuleCtx, meg: boolean): Directive {
  const one = ref(c, 1);
  if (!one) return zoneOf(c);
  if (meg) return man(one, { lev: 'outside' });
  if (c.state.mode === 'zoned') return zoneOf(c);
  if (under(one, 9)) {
    c.state.mode = 'zoned';
    return zoneOf(c);
  }
  return man(one, { lev: 'outside' });
}

/** Quarters safety: #2 decides. Vertical → carry #2 over the top; out/flat/under/stop (or pass-blocking) → help #1 (cap a vertical, rob an in-breaker). */
function qSafety(c: RuleCtx): Directive {
  const one = ref(c, 1);
  const two = ref(c, 2);
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
function wallTwo(c: RuleCtx, handoff: number, readStem = false): Directive {
  const two = ref(c, 2);
  if (!two || c.state.mode === 'zoned') return zoneOf(c);
  // Other wall callers have their own cut/deep-help contracts.
  if (readStem && (two.release === 'none' || (two.release === 'vertical' && two.depth < 2))) return readRelease(two);
  if (vertical(two, 2)) {
    if (two.depth < handoff) return { t: 'wall', r: two.r };
    c.state.mode = 'zoned';
    return zoneOf(c);
  }
  if (two.release !== 'none' && two.release !== 'vertical' && two.release !== 'block') c.state.mode = 'zoned';
  return zoneOf(c);
}

/** Quarter-flat owns #2's acquired low out, including a later wheel.
 * Palms shares the seam wall but installs its corner as the flat matcher;
 * its apex must instead retain the curl. This is installed call knowledge,
 * not a query of the corner's private live choice or a promised handoff. */
function quarterFlat(c: RuleCtx): Directive {
  const two = ref(c, 2);
  const corner = c.sim.defAlign.coverage.roles[c.side === 'S' ? 'CB_S' : 'CB_W'];
  const cornerTakesFlat = corner?.kind === 'zone' && corner.rule === 'palms_corner';
  if (!cornerTakesFlat && two && c.state.mode !== 'zoned'
    && (c.state.mode === 'flat' || isQuickOut(two, c.sim))) {
    c.state.mode = 'flat';
    return man(two, { lev: 'inside', overTop: true, topDownFlat: true });
  }
  return wallTwo(c, 10, true);
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
function cloudCorner(c: RuleCtx, sink: boolean): Directive {
  const one = ref(c, 1);
  const flat = [ref(c, 2), ref(c, 3), backTo(c)].find((rd) => rd && (rd.release === 'flat' || (rd.release === 'out' && rd.depth < 6)));
  if (flat || c.state.mode === 'flat') {
    c.state.mode = 'flat';
    return zoneOf(c);
  }
  // Sink only once the inside receivers have declared away from the flat:
  // eyes on #2 first, then carry #1.
  const inside = [ref(c, 2), ref(c, 3)].filter((rd): rd is ReceiverRead => !!rd);
  const declared = inside.every((rd) => rd.release !== 'none' && rd.release !== 'flat' && rd.release !== 'out');
  if (sink && one && declared && vertical(one, 2) && one.depth < 13) return man(one, { lev: 'outside', trail: true });
  return zoneOf(c);
}

/** Tampa 2 Mike: run the pipe — carry the inside-most vertical through the middle to ~20 yards, otherwise the deep hole. */
function tampaMike(c: RuleCtx): Directive {
  const sim = c.sim;
  let best: ReceiverRead | null = null;
  for (const r of sim.offense) {
    const rd = c.reader.read(sim, r);
    if (!rd || !vertical(rd, 4) || rd.depth > 20 || Math.abs(rd.pos.y - sim.ballY) > 9) continue;
    if (!best || Math.abs(rd.pos.y - sim.ballY) < Math.abs(best.pos.y - sim.ballY)) best = rd;
  }
  return best ? man(best, { lev: 'inside', trail: true }) : zoneOf(c);
}

/** Poach (backside) safety vs trips: take #3 vertical over the top; otherwise help the middle. */
function poachSafety(c: RuleCtx): Directive {
  const other = c.side === 'S' ? 'W' : 'S';
  const three = ref(c, 3, other);
  if (c.state.mode === 'three' && three) return man(three, { overTop: true, lev: 'inside' });
  if (three && vertical(three, 6)) {
    c.state.mode = 'three';
    return man(three, { overTop: true, lev: 'inside' });
  }
  if (three && three.release !== 'none') return zoneOf(c, 'deep_mid');
  return zoneOf(c);
}

/** Stubbie/Special trips safety: cap the inner verticals — #2 first, then #3; otherwise rob #2's in-breaker. */
function stubbieSafety(c: RuleCtx): Directive {
  const two = ref(c, 2);
  const three = ref(c, 3);
  if (c.state.mode === 'two' && two) return man(two, { overTop: true, lev: 'inside' });
  if (c.state.mode === 'three' && three) return man(three, { overTop: true, lev: 'inside' });
  if (two && vertical(two, 6)) {
    c.state.mode = 'two';
    return man(two, { overTop: true, lev: 'inside' });
  }
  if (three && vertical(three, 6)) {
    c.state.mode = 'three';
    return man(three, { overTop: true, lev: 'inside' });
  }
  return zoneOf(c);
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
    case 'c2_hook': {
      const d = wallTwo(c, 12);
      return d.t === 'zone' ? cut(c) ?? d : d;
    }
    case 'tampa_mike': return tampaMike(c);
    case 'poach_safety': return poachSafety(c);
    case 'stubbie_safety': return stubbieSafety(c);
    case 'invert_safety': return invertSafety(c);
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
