/** A support contract derived from the called front AND coverage, not the run call. */
import { seenBack } from './seen-back.js';
import { gaitLag } from '../physics/kinematics.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { gapY, isDeepZone, lineDepth } from '../playbook/alignment.js';
import type { DefSlot, Gap } from '../playbook/types.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';
import { blendApproach, chase, gatheringApproach, goTo, stand, track } from './behaviors/common.js';
import { chooseApproach } from './approach-control.js';
import { CF_FLOW } from './counterfactual.js';
import { lineFlow, linePicture, liveGap, liveGapY } from './live-gaps.js';
import { requestToCover } from './motion-plan.js';
import { handoffReach } from './ball-transfer.js';
import { forceTrack, retainedForceTrack } from './force-track.js';
import { hasObservedFlight, observedHolder, qbRunning, type PossessionRead } from './possession-read.js';
import { seenEngaged } from './seen-contact.js';
import { KEY_STEP_SEEN } from './key-read.js';
import { describeDefense } from '../playbook/ir/describe.js';
import { runFitJobs } from '../playbook/ir/fits.js';

export interface RunFitJob {
  gap: Gap;
  side: number;
  kind: 'interior' | 'edge' | 'insert' | 'force' | 'alley' | 'cutback';
  technique: 'attack' | 'control' | 'lag';
  edge: 'box' | 'spill';
  pace: 'plug' | 'stack';
  partner?: string;
  /** The same body's inside duty before an observed outside runner activates force. */
  inside?: { gap: Gap; side: number; kind?: 'edge' };
}

/** A personally identified possible runner, separate from authoritative possession. */
export interface KeyedRunFit {
  target: Agent;
  cue: Perceived;
}

/** Installed exchange expectation and this observer's backfield picture.
 * This is not an affirmative runner key: retain normal pursuit boundaries
 * and let acquired empty-back/QB evidence retire the existing expectation.
 */
export interface BackfieldRunFit {
  backfield: { back: Agent; backCue: Perceived; qbCue: Perceived };
}
/** A personally identified holder uses the ordinary post-mesh fit, without
 * promoting a possible key or an installed exchange into confirmed possession. */
export interface AcquiredRunFit { possession: PossessionRead }
export type RunFitRead = KeyedRunFit | BackfieldRunFit | AcquiredRunFit;

const GAP_RANK: Record<Gap, number> = { A: 1, B: 2, C: 3, D: 4 };
const RANK_GAP: Gap[] = ['A', 'A', 'B', 'C', 'D'];
/** DL_GAMES run-down movement: the gap a called angle, slant or pinch moves
 * this lineman to, one gap along the line (crossing the centre from A to A).
 * Null when the call does not move him. Twists are pass-rush paths, not gaps. */
function gameGap(sim: PlaySim, d: Agent, gap: Gap, side: number): { gap: Gap; side: number } | null {
  const game = sim.defCall.dlGame;
  if (!game || game.kind === 'twist') return null;
  const interior = ['DT_S', 'DT_W', 'NT'].includes(d.slot), end = d.slot === 'DE_S' || d.slot === 'DE_W';
  const strong = sim.offAlign.strongSign, toward = game.dir === 'S' ? strong : -strong;
  let step = 0;
  if (game.kind === 'angle' && interior) step = toward;
  else if (game.kind === 'slant' && (interior || end)) step = toward;
  else if (game.kind === 'pinch' && end) step = -Math.sign(side || 1);
  if (!step) return null;
  const u = Math.sign(side || 1) * GAP_RANK[gap];
  let v = u + step; if (v === 0) v = step;
  v = Math.max(-4, Math.min(4, v));
  return { gap: RANK_GAP[Math.abs(v)], side: Math.sign(v) };
}

/** FIT_BLITZ_SLIDE (experimental, off): see buildRunFits. */
const FIT_BLITZ_SLIDE = process.env.FIT_BLITZ_SLIDE !== '0';
/** HONEST_READS (behaviors/defense.ts): a teammate counts on the line when seen in contact, not by his engagement state. */
const HONEST_READS = process.env.HONEST_READS !== '0';

/** FIT_RULES (default on; FIT_RULES=0 restores; Rules + Coaching, step 3c): the pre-snap run-fit jobs come from the
 * shared structural rules (`runFitJobs`, src/playbook/ir/fits.ts, label-free), read from the call's description, the
 * resolved alignment and the bodies where they stand, not from slot labels:
 * - the insert pool by job (an underneath zone wherever it aligns him; man on an attached end or a back fits off his
 *   man's block; man on a detached receiver plays the alley);
 * - a low safety takes what the second level leaves;
 * - gaps are taken inside-out;
 * - a force aligned on or outside #1 contains and never folds inside.
 * Off, the body below runs (the faithful path; test/ir-fits.test.ts proves the shared function's faithful mode equal
 * to it). Post-snap behaviour is unchanged. docs/reviews/2026-11-26-run-fit-cutover-step3c.md. */
export const FIT_RULES = process.env.FIT_RULES !== '0';

export function buildRunFits(sim: PlaySim): Map<Agent, RunFitJob> {
  if (FIT_RULES) {
    const full = sim.defDesc ?? describeDefense(sim.defCall);
    const players = sim.defense.map((a) => full.players.find((p) => p.who.slot === a.slot)).filter((p): p is NonNullable<typeof p> => !!p);
    const pos = Object.fromEntries(sim.defense.map((a) => [a.slot, a.pos])) as Partial<Record<DefSlot, Vec2>>;
    const r = runFitJobs({ ...full, players }, sim.defAlign, sim.offAlign, { pos, labelFree: true });
    return new Map(sim.defense.map((a) => [a, r.jobs[a.slot as DefSlot]!]));
  }
  return faithfulRunFits(sim);
}

/** Today's assignment (FIT_RULES=0), kept as the restore and as the equality proof for the shared function's
 * faithful mode. */
export function faithfulRunFits(sim: PlaySim): Map<Agent, RunFitJob> {
  const jobs = new Map<Agent, RunFitJob>();
  const policy = sim.defCall.runPolicy ?? { edge: 'box', linebacker: 'stack' };
  const first = new Set<Agent>();
  const claimed = new Set<string>();
  for (const d of sim.defense) {
    const spot = sim.defAlign.spots[d.slot as DefSlot]!;
    const override = sim.defCall.front.fits?.[d.slot as DefSlot];
    const frontSlot = ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'].includes(d.slot);
    const dropper = frontSlot && spot.role.kind === 'zone' && !!sim.defCall.pressure?.droppers?.[d.slot as DefSlot];
    // Preserve the existing front run contract (including man-converted ends).
    // Only an explicitly installed pressure dropper gains this support option.
    const line = (frontSlot && !dropper) || (spot.pos.x < sim.los + 2 && spot.role.kind === 'rush');
    const gap = spot.role.kind === 'blitz' ? spot.role.gap : spot.gap;
    const side = spot.role.kind === 'blitz' ? (spot.role.side === 'S' ? sim.offAlign.strongSign : -sim.offAlign.strongSign) : spot.gapSign;
    let kind: RunFitJob['kind'] = line || dropper ? (gap === 'C' || gap === 'D' ? 'edge' : 'interior') : d.slot.startsWith('LB') ? 'insert' : 'alley';
    // A called line game moves this lineman into his new gap from the snap.
    const moved = line && !dropper && spot.role.kind !== 'blitz' ? gameGap(sim, d, gap, side) : null;
    const g = moved?.gap ?? gap, sd = moved?.side ?? side;
    if (moved) kind = g === 'C' || g === 'D' ? 'edge' : 'interior';
    jobs.set(d, { gap: g, side: sd, kind, technique: moved ? 'attack' : override?.technique ?? 'attack', edge: policy.edge, pace: policy.linebacker });
    if (moved) { if (sim.trace.data) sim.trace.decide({ t: sim.t, a: d.idx, kind: 'dl-game', chose: `${g}${sd > 0 ? '+' : '-'}`,
      cue: `called ${sim.defCall.dlGame!.kind} ${sim.defCall.dlGame!.dir}`, detail: `from ${gap}${side > 0 ? '+' : '-'}` }); }
    if (line || spot.role.kind === 'blitz') first.add(d);
    // Dropping on passes changes support eligibility, not the front's run gap.
    if (line || spot.role.kind === 'blitz' || dropper) claimed.add(`${sd}:${g}`);
    if (dropper && kind === 'edge') jobs.get(d)!.inside = { gap, side, kind: 'edge' };
  }
  // FIT_BLITZ_SLIDE (experimental, off): a called blitzer takes his gap; the
  // lineman whose gap he takes moves at most one gap, to the nearest open
  // neighbour (a nose under a Mike blitzing strong A plays weak A; an end
  // outside a safety blitzing C plays D). With neither neighbour open (double
  // A over a nose) he does not travel: he stays in his gap behind the blitzers
  // as a two-gap player (technique 'control'), squeezing his blocker into
  // them. Defense's decision on #396 (2026-11-02). Off, both own the gap.
  if (FIT_BLITZ_SLIDE) {
    const blitzed = new Set(sim.defense.filter(d => sim.defAlign.spots[d.slot as DefSlot]!.role.kind === 'blitz')
      .map(d => { const j = jobs.get(d)!; return `${j.side}:${j.gap}`; }));
    // Gaps across the line, weak D to strong D; neighbours differ by one.
    const order = (['D', 'C', 'B', 'A'] as Gap[]).map(gap => ({ side: -1, gap })).concat((['A', 'B', 'C', 'D'] as Gap[]).map(gap => ({ side: 1, gap })));
    const at = (side: number, gap: Gap) => order.findIndex(o => o.side === side && o.gap === gap);
    for (const d of first) {
      const j = jobs.get(d)!;
      if (sim.defAlign.spots[d.slot as DefSlot]!.role.kind === 'blitz' || !blitzed.has(`${j.side}:${j.gap}`)) continue;
      const i = at(j.side, j.gap);
      const open = [order[i - 1], order[i + 1]].filter((o): o is typeof order[number] => !!o
        && !blitzed.has(`${o.side}:${o.gap}`) && !claimed.has(`${o.side}:${o.gap}`));
      const dist = (o: { side: number; gap: Gap }) => Math.abs(gapY(sim.offAlign, o.gap, o.side) - d.pos.y);
      const to = open.sort((a, b) => dist(a) - dist(b))[0];
      if (!to) { j.technique = 'control'; continue; }
      claimed.add(`${to.side}:${to.gap}`);
      j.gap = to.gap; j.side = to.side;
      j.kind = to.gap === 'C' || to.gap === 'D' ? 'edge' : 'interior';
    }
  }
  // An explicit exchange already spends its backer on the vacated edge.
  const exchange = sim.defCall.gapExchange;
  const exchangeBacker = exchange && sim.slot(exchange.edge) ? sim.slot(exchange.backer) : undefined;
  const available = (d: Agent) => !first.has(d) && d !== exchangeBacker && jobs.get(d)!.kind !== 'force';
  const deepZone = (d: Agent) => { const role = sim.defAlign.spots[d.slot as DefSlot]!.role; return role.kind === 'zone' && isDeepZone(role.zone); };
  const outsideSide = (d: Agent): number | null => {
    const role = sim.defAlign.spots[d.slot as DefSlot]!.role;
    if (role.kind !== 'zone') return null;
    if (role.zone === 'flat_s' || role.zone === 'curl_flat_s') return sim.offAlign.strongSign;
    if (role.zone === 'flat_w' || role.zone === 'curl_flat_w') return -sim.offAlign.strongSign;
    return null;
  };
  // Actual flat/curl-flat seats own support even when the shown alignment or
  // a small placement error puts them inside the old lateral cutoff. Calls
  // without that seat retain their geometric fallback. Do not steal the other
  // side's installed support while filling a missing seat.
  for (const side of [-1, 1]) {
    const designated = sim.defense.filter(d => available(d) && outsideSide(d) === side);
    const candidates = designated.length ? designated : sim.defense.filter(d => available(d)
      && outsideSide(d) === null && (d.pos.y - sim.ballY) * side > 2);
    const priority = (d: Agent) => {
      const role = sim.defAlign.spots[d.slot as DefSlot]!.role;
      return role.kind === 'zone' ? role.zone.startsWith('flat') ? 0 : role.zone.startsWith('curl_flat') ? 1 : isDeepZone(role.zone) ? 6 : 3 : 7;
    };
    const cost = (d: Agent) => {
      return priority(d) * 4 + Math.abs(Math.abs(d.pos.y - sim.ballY) - 5.5);
    };
    candidates.sort((a,b) => (designated.length ? priority(a)-priority(b) : 0) || cost(a)-cost(b));
    const force = candidates[0];
    if (force) { jobs.get(force)!.kind = 'force'; jobs.get(force)!.side = side; jobs.get(force)!.gap = 'D'; }
    for (const d of first) {
      const j = jobs.get(d)!;
      if (j.side !== side || j.kind !== 'edge') continue;
      // Spill requires an outside support player. Without one, preserve the edge.
      if (!force || force.pos.x>sim.los+8 || (force.pos.y - d.pos.y) * side < .2) j.edge = 'box';
      if (force) j.partner = force.slot;
    }
  }
  // A box curl-flat backer still has his bubble on inside flow. An outside
  // support title does not spend a second body or erase that obligation.
  const backers = sim.defense.filter((d) => d.slot.startsWith('LB') && !first.has(d)
    && (jobs.get(d)!.kind !== 'force' || outsideSide(d) !== null)
    && Math.abs(sim.defAlign.spots[d.slot as DefSlot]!.pos.y - sim.ballY) < 5.5)
    // Primary insertion spends a body first. Conditional outside support can
    // use a remaining bubble, but cannot take an insert's only gap and leave
    // that player's default assignment duplicating it.
    .sort((a, b) => Number(jobs.get(a)!.kind === 'force') - Number(jobs.get(b)!.kind === 'force') || a.pos.y - b.pos.y);
  const bubbles = [-1, 1].flatMap((side) => (['A', 'B', 'C'] as Gap[])
    .filter((gap) => !claimed.has(`${side}:${gap}`)).map((gap) => ({ side, gap })));
  const reach = (d: Agent, b: { side: number; gap: Gap }) => Math.abs(gapY(sim.offAlign, b.gap, b.side) - d.pos.y);
  if (GAP_MATCH) {
    // More gaps than backers (a second tight end adds one): fill them as a
    // set, not nearest-first. A gap left open should be the one an
    // underneath support player (a rotated-down safety or hook defender, not
    // deep help) still covers on that side, so the Mike slides away from him;
    // an unsupported or A gap left open is worse. Distance breaks ties.
    const support = (side: number) => sim.defense.some(d => jobs.get(d)!.kind === 'alley' && !deepZone(d)
      && (d.pos.y - sim.ballY) * side > 0);
    const open = (b: { side: number; gap: Gap }) => (support(b.side) ? 1 : 2) + (b.gap === 'A' ? .5 : 0);
    let best: { cost: number; dist: number; pick: (typeof bubbles[number] | undefined)[] } | null = null;
    const pick: (typeof bubbles[number] | undefined)[] = [];
    const search = (i: number, used: Set<number>) => {
      if (i === backers.length) {
        // Every insertion keeps a gap while one remains; a force's inside duty is optional.
        if (backers.some((d, k) => jobs.get(d)!.kind !== 'force' && !pick[k] && used.size < bubbles.length)) return;
        const cost = bubbles.reduce((c, b, k) => used.has(k) ? c : c + open(b), 0);
        const dist = backers.reduce((c, d, k) => c + (pick[k] ? reach(d, pick[k]!) : 0), 0);
        if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && dist < best.dist)) best = { cost, dist, pick: [...pick] };
        return;
      }
      const job = jobs.get(backers[i])!;
      pick[i] = undefined; search(i + 1, used);
      bubbles.forEach((b, k) => {
        if (used.has(k) || (job.kind === 'force' && b.side !== job.side)) return;
        pick[i] = b; used.add(k); search(i + 1, used); used.delete(k);
      });
      pick[i] = undefined;
    };
    search(0, new Set());
    backers.forEach((d, k) => {
      const bubble = best?.pick[k], job = jobs.get(d)!;
      if (!bubble) return;
      bubbles.splice(bubbles.indexOf(bubble), 1);
      if (job.kind === 'force') job.inside = bubble;
      else Object.assign(job, bubble);
    });
  } else for (const d of backers) {
    const job = jobs.get(d)!;
    const eligible = job.kind === 'force' ? bubbles.filter(b => b.side === job.side) : bubbles;
    eligible.sort((a, b) => reach(d, a) - reach(d, b));
    const bubble = eligible[0];
    if (bubble) {
      bubbles.splice(bubbles.indexOf(bubble), 1);
      if (job.kind === 'force') job.inside = bubble;
      else Object.assign(job, bubble);
    }
  }
  if (exchange) {
    const end = sim.slot(exchange.edge), backer = sim.slot(exchange.backer);
    if (end && backer && !first.has(backer) && jobs.get(backer)?.kind !== 'force') {
      const e = jobs.get(end)!, b = jobs.get(backer)!;
      b.gap = e.gap; b.side = e.side; b.kind = 'cutback'; b.partner = end.slot;
      e.gap = 'B'; e.kind = 'interior'; e.partner = backer.slot;
    }
  }
  return jobs;
}

/** FOLD_HOLD (default on; FOLD_HOLD=0 restores; Rules + Coaching, step 3c, Integration's ruling 2): a force player with
 * an inside (fold) duty holds his outside leverage on a run toward him until the ball has declared inside (the
 * carrier, with the ball, at least FOLD_IN inside the blocking surface and across the line or running upfield more
 * than across) or the flow is away (the runner moving away from his side faster than FOLD_FLOW). Only then does he
 * fold. A dropping end's inside duty is his own C edge, not a fold: it is unchanged. It is one decision on his own
 * picture of the runner (never his own speed): once folded he returns to force only if the carrier gets FOLD_OUT
 * outside the surface, the far side of the entry. Off, he folded unless the carrier was already outside the surface,
 * so on a stretch toward him he folded at the mesh and was late to the edge (step-3c staged case d). */
export const FOLD_HOLD = process.env.FOLD_HOLD !== '0';
const FOLD_FLOW = 1.0, FOLD_IN = .5, FOLD_OUT = .5;
const folded = new WeakMap<Agent, boolean>();
function holdsFold(a: Agent, sim: PlaySim, c: Agent, side: number, seen: Perceived, premesh: boolean, surface: number): boolean {
  const outside = side * seen.pos.y + c.profile.radius - side * surface;
  const declared = !premesh && seen.carrying === true;
  // Declared inside: with the ball, inside the surface, and across the line or running upfield more than across.
  const dir = sim.attackDir(c.team);
  const committed = declared && ((seen.pos.x - sim.los) * dir > 0 || seen.vel.x * dir > Math.abs(seen.vel.y));
  let fold = folded.get(a) ?? false;
  if (!fold && (seen.vel.y * side < -FOLD_FLOW || (committed && outside < -FOLD_IN))) fold = true;
  else if (fold && declared && outside > FOLD_OUT) fold = false;
  if (fold !== (folded.get(a) ?? false) && sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'fold',
    chose: fold ? 'fold inside' : 'force', cue: fold ? 'runner declared inside or flowing away' : 'runner outside the surface' });
  folded.set(a, fold);
  return fold;
}

/** Free fits scrape with the gap's motion, the earliest zone key (SCRAPE=0) and read the back's
 * threatened crossing rather than his position (THREAT_READ=0). */
const SCRAPE = process.env.SCRAPE !== '0', THREAT_READ = process.env.THREAT_READ !== '0';

/** Free fits plan lateral work with their own body (LB_PLAN=0 off). */
const LB_PLAN = process.env.LB_PLAN !== '0';
/** EDGE_REACH (experimental, off): see the edge fit below and PassRusher's reach read. */
const EDGE_REACH = process.env.EDGE_REACH !== '0';
const LB_LINE_FLOW = process.env.LB_LINE_FLOW !== '0', LINE_FLOW_LEAD = 1.5, GUARD_KEY_DELAY = 0.5, GUARD_STEP = 0.5;
/** Experimental activation of the same planner for an observed pull-adjusted
 * insertion. Default off while matched containment/misdirection controls run. */
const PULL_PLAN = process.env.PULL_PLAN === '1';

/** Backers flow inside-out on a declared track (FLOW_READ=0 off); yards inside the ball. */
const FLOW_READ = process.env.FLOW_READ !== '0', FLOW_INSIDE = 1;
/** ATTACK_LANDMARK (experimental, off): an attacking interior lineman's fit landmark is the offensive line's stance line, not the .25 hold. */
const ATTACK_LANDMARK = process.env.ATTACK_LANDMARK === '1';
/** FLOW_INTERCEPT (experimental, off): a backer leads the back by how soon
 * he could reach the backer's depth, not a fixed two reads. */
const FLOW_INTERCEPT = process.env.FLOW_INTERCEPT === '1';

/** Does a puller arriving at `target` (moving `dir`) read as a pull for a
 * backer whose landmark is `gy`? Within reach toward the pull. With
 * FLOW_INTERCEPT the landmark before the runner projection (`gapY`) also
 * counts, so a projection that already carried `gy` past the puller's
 * arrival does not hide the pull. */
export function pullCueReads(target: number, dir: number, gy: number, gapY: number): boolean {
  const reads = (from: number) => (target - from) * dir > 0 && (target - from) * dir < PULL_REACH;
  return reads(gy) || (FLOW_INTERCEPT && reads(gapY));
}

/** How far ahead (s) a flowing backer projects the back he keeps leverage on.
 * A back still crossing behind the line can turn up at any moment, so the
 * lead is the soonest he could reach the backer's depth at his current speed,
 * never less than the backer's two reads. `toDepth` is the backer's depth
 * past the back along the offense's direction. */
export function flowLead(toDepth: number, vel: { x: number; y: number }, reads: number): number {
  if (!FLOW_INTERCEPT || toDepth <= 0) return reads;
  return Math.max(reads, toDepth / Math.max(1, Math.hypot(vel.x, vel.y)));
}

/** Pull reads (PULL_READ=0 restores the single nearest-shift read, for A/B). */
const PULL_READ = process.env.PULL_READ !== '0';
/** Diagnostic pull acquisition from observed departure, independent of an
 * opponent's current engagement. Default off pending matched controls. */
const PULL_CUE = process.env.PULL_CUE === '1';
/** How far ahead a puller's seen path is carried (about one decision beat), the
 * leverage kept on his arrival, and how far a fit will flow to it. */
const PULL_LOOK = .4, PULL_SHOULDER = .6, PULL_REACH = 6;
/** Default on (PULL_EARLY=0 turns it off): a backer keys the pull step itself. A
 * lineman seen moving across at more than 1.5 yd/s while stepping back from
 * his stance (not climbing) is pulling, before he has cleared a yard of
 * ground. Coaching keys the guard's hips and first step; tracked gap-run
 * backers are 0.6 yd toward the play at 1.0 s, while the displacement read
 * fired near 1.35 s (scripts/diag/runblock/lbfill.py, lbtrace.ts). Same
 * delayed picture; a kick-slide on play-action can fool him. */
const PULL_EARLY = process.env.PULL_EARLY !== '0';
/** Default on (FORCE_BOUNCE=0 turns it off): the force keeps the ball on his inside
 * shoulder until it declares. While the runner he sees is still behind the
 * line, his boundary stays outside the outermost body at the point of attack
 * (the line and inline ends as seen, plus blockers and engaged defenders
 * within 4 yd outside them near the line) by the ground that runner covers
 * at full speed in this defender's reaction time; a force half a yard outside
 * the surface has already given up the bounce. Once the runner is at the
 * line the installed track applies. */
const FORCE_BOUNCE = process.env.FORCE_BOUNCE !== '0';
/** Default on (LB_LANDMARK=0 turns it off): where a stack backer fits before the
 * runner declares. The installed 1.5 yd past the line is an unfitted
 * constant; tracked backers meet the climbing lineman at a median 2.01 yd
 * and settle about 2.3 yd off the ball at 2.0 s (climbphase.py, lbfit.py on
 * the run-offense branch). On: 2.25 yd. On the run-offense profile his
 * depth at the meeting goes 1.57 -> 2.08 and at 2.0 s 1.82 -> 2.21 (NFL
 * 2.35), and he has moved further sideways by then (1.92 -> 2.29; NFL 4.10). */
const LB_LANDMARK = process.env.LB_LANDMARK !== '0';
/** SAFETY_TEMPO (on; =0 turns it off): an alley safety eases down from his alignment depth
 * (about a yard) until the back declares, instead of coming to 5-8 yd. Tracked
 * deep support is 12.9 yd deep at the handoff and comes forward +0.5 / +1.75
 * yd/s at 0.5 / 1.0 s after it; ours +1.75 / +2.5, and on runs reaching 20
 * it is 5.3 yd behind the back at 10 yd where the NFL's is 3.1 ahead
 * (scripts/diag/long-run.py). Off: the installed 65% of alignment depth. */
const SAFETY_TEMPO = process.env.SAFETY_TEMPO !== '0';
/** GAP_MATCH (on; =0 restores nearest-first): backers fill the front's open
 * gaps as a set. Nearest-first sent the Will in the nickel Under vs 12
 * personnel to the weak A gap and the Mike to the strong B, leaving the gap
 * between the weak tackle and the second tight end empty while the
 * rotated-down safety sat over the strong B. Real Under/cover 3 fits slide
 * the Mike weak and give the strong side's open gap to that safety. */
const GAP_MATCH = process.env.GAP_MATCH !== '0';
const STACK_LANDMARK = LB_LANDMARK ? 2.25 : 1.5;
/** Where a threatened stack backer fills to: a yard off the ball, meeting the runner in the hole. */
const FILL_DEPTH = 1;
/** END_CHASE (experimental, off): see the edge fit; how far into the backfield a backside edge chases (yd). */
const END_CHASE = process.env.END_CHASE !== '0', END_CHASE_DEPTH = 1.0;

/** Linemen this player sees pulling: off the surface, behind the line, moving
 * across. Every one counts; nothing reads the offensive call. */
export function pullers(sim: PlaySim, a: Agent): Perceived[] {
  return pullerPairs(sim, a).map((p) => p.seen);
}
/** The pullers this player sees, with who each is (his own perception, as `pullers`). */
function pullerPairs(sim: PlaySim, a: Agent): Array<{ agent: Agent; seen: Perceived }> {
  const picture = linePicture(sim, a);
  const candidates = PULL_CUE || PULL_EARLY ? [...picture.surface, ...picture.departed].filter(b => {
    const home = sim.offAlign.spots[b.agent.slot]!.pos, dir = sim.attackDir(b.agent.team);
    const depth = (b.seen.pos.x - home.x) * dir;
    if (PULL_EARLY && depth < -.15 && b.seen.vel.x * dir <= .5 && Math.abs(b.seen.vel.y) > 1.5) return true;
    return PULL_CUE && (depth < -1.5 || depth < -.5 && Math.abs(b.seen.pos.y - home.y) > 1);
  }) : picture.departed;
  return candidates.map((b) => ({ agent: b.agent, seen: b.seen }))
    .filter(({ seen: s }) => (sim.los - s.pos.x) * sim.attackDir(sim.offense[0].team) > .3 && Math.abs(s.vel.y) > 1.5);
}

/** GUARD_KEY (default on; GUARD_KEY=0 restores; Rules + Coaching, step 3c, Integration's ruling 4): a second-level
 * run fitter keys the guard he is aligned over or nearest inside, and when that guard pulls he flows with the pull
 * (through his own perception and reaction), whatever the distance from his landmark to the puller's arrival. Off,
 * every pull was read only when his landmark lay within PULL_REACH of where the puller would arrive. PULL_REACH stays
 * for the pullers he is not keyed on (a guard or tackle across the formation), which he reads only when they cross
 * near his own landmark. */
export const GUARD_KEY = process.env.GUARD_KEY !== '0';
const keyGuards = new WeakMap<Agent, Agent | null>();
function keyGuard(sim: PlaySim, a: Agent): Agent | null {
  if (keyGuards.has(a)) return keyGuards.get(a)!;
  const home = sim.defAlign.spots[a.slot as DefSlot]?.pos ?? a.pos, by = sim.offAlign.ballY;
  const guards = sim.offense.filter((o) => o.slot === 'LG' || o.slot === 'RG');
  const at = (o: Agent) => sim.offAlign.spots[o.slot]!.pos.y;
  const inside = guards.filter((g) => Math.abs(at(g) - by) <= Math.abs(home.y - by) + .5 && (at(g) - by) * (home.y - by) >= 0);
  const pick = (inside.length ? inside : guards).sort((p, q) => Math.abs(at(p) - home.y) - Math.abs(at(q) - home.y))[0] ?? null;
  keyGuards.set(a, pick);
  return pick;
}

/** A zone step: the line moving across faster than this (yd/s), four of the five together. */
const LINE_STEP = 0.7;
/** RUN-17: the play's direction a lineman reads from the line, held between his reads. */
const lineReads = new WeakMap<Agent, { side: number; next: number }>();

/** The play's direction as a lineman reads it from the line in front of him,
 * before the back declares: a puller crossing behind the line leads the play;
 * otherwise the whole line stepping one way (four of the five across faster
 * than LINE_STEP, none of them setting back in pass protection) is a zone step.
 * 0 while the line says neither. His own delayed pictures, read once per
 * decision beat and kept until the line shows the other way; no offensive call
 * or assignment. A play-action line shows run and fools him, as it should. */
/** LB_LINE_FLOW: a backer's keys are the guards ("guards to backs"), read as
 * keys the way a lineman reads the man in front of him: half his ordinary
 * observation delay. Both guards stepping the same way (a zone step), and
 * neither setting back in a pass set, is the flow; a puller is read by the
 * pull read, not here. Held for a decision beat. */
const guardReads = new WeakMap<Agent, { side: number; next: number }>();
/** LB_GUARD_STEP: the guards' first step as he keys them, read every tick at
 * their first visible movement (KEY_STEP_SEEN, the DL's key threshold) rather
 * than the flow read's 0.5 yd/s held for a beat: side (0 if they split or set
 * back in a pass set) and pace (yd/s). */
export function guardStep(sim: PlaySim, a: Agent): { side: number; pace: number } {
  const dir = sim.attackDir(sim.offense[0].team);
  const guards = ['LG', 'RG'].map(s => sim.slot(s)).filter((g): g is Agent => !!g).map(g => sim.see(a, g, GUARD_KEY_DELAY));
  if (guards.length !== 2 || guards.some(g => g.vel.x * dir < -1)) return { side: 0, pace: 0 };
  const s0 = Math.sign(guards[0].vel.y);
  if (!s0 || !guards.every(g => g.vel.y * s0 > KEY_STEP_SEEN)) return { side: 0, pace: 0 };
  return { side: s0, pace: (Math.abs(guards[0].vel.y) + Math.abs(guards[1].vel.y)) / 2 };
}
export function guardRead(sim: PlaySim, a: Agent): number {
  const held = guardReads.get(a);
  if (held && sim.t < held.next) return held.side;
  const dir = sim.attackDir(sim.offense[0].team);
  const guards = ['LG', 'RG'].map(s => sim.slot(s)).filter((g): g is Agent => !!g).map(g => sim.see(a, g, GUARD_KEY_DELAY));
  let side = 0;
  if (guards.length === 2 && !guards.some(g => g.vel.x * dir < -1)) {
    const s0 = Math.sign(guards[0].vel.y);
    if (s0 && guards.every(g => g.vel.y * s0 > GUARD_STEP)) side = s0;
  }
  side = side || held?.side || 0;
  guardReads.set(a, { side, next: sim.t + a.mind.decisionInterval });
  return side;
}

export function lineRead(sim: PlaySim, d: Agent): number {
  const held = lineReads.get(d);
  if (held && sim.t < held.next) return held.side;
  let side = 0;
  const pull = pullers(sim, d).reduce<{ vel: Vec2 } | null>((m, p) => !m || Math.abs(p.vel.y) > Math.abs(m.vel.y) ? p : m, null);
  if (pull) side = Math.sign(pull.vel.y);
  else {
    const line = linePicture(sim, d).surface.filter(b => ['LT', 'LG', 'C', 'RG', 'RT'].includes(b.agent.slot));
    const dir = sim.attackDir(sim.offense[0].team);
    const setting = line.some(b => b.seen.vel.x * dir < -1);
    const across = (s: number) => line.filter(b => b.seen.vel.y * s > LINE_STEP).length;
    if (!setting && line.length === 5) side = across(1) >= 4 ? 1 : across(-1) >= 4 ? -1 : 0;
  }
  side = side || held?.side || 0;
  lineReads.set(d, { side, next: sim.t + d.mind.decisionInterval });
  return side;
}

/** Only visible pull/slice motion changes a fit; no offensive scheme lookup. */
export function blockingIndicator(a: Agent, sim: PlaySim): { side: number; kind: 'pull' | 'slice'; pos: Vec2 } | null {
  for (const o of sim.offense) {
    const guard = o.slot === 'LG' || o.slot === 'RG' || o.slot === 'LT' || o.slot === 'RT';
    const homeSpot=sim.offAlign.spots[o.slot];
    const slice = (o.player.position === 'TE' || o.player.position === 'FB') && !homeSpot?.inline
      && homeSpot.pos.x<sim.los-.9 && Math.abs(homeSpot.pos.y-sim.ballY)<6;
    if (!guard && !slice) continue;
    const s = sim.see(a, o), home = sim.offAlign.spots[o.slot].pos;
    if (s.pos.x > sim.los - (guard ? lineDepth(.65, sim.los - home.x) : 1) || Math.abs(s.vel.y) < 1.5 || Math.abs(s.pos.y-home.y) < .6) continue;
    return { side: Math.sign(s.vel.y), kind: guard ? 'pull' : 'slice', pos: s.pos };
  }
  return null;
}

// A remembered contradiction belongs to this observer for this play. Losing
// sight of the empty back later does not reinstall the expected exchange.
const contradictedMesh = new WeakSet<Agent>();

/** Explicit null means unresolved possession: keep the installed fit, without
 * falling through to the authoritative holder. Undefined preserves older
 * direct callers; defense.runFit always supplies its acquired interpretation. */
export function executeRunFit(a: Agent, sim: PlaySim, fallbackGap: Gap, fallbackSide: number, input?: RunFitRead | null) {
  if (a.engagement) return stand();
  let job: RunFitJob = a.runFit ?? { gap: fallbackGap, side: fallbackSide, kind: 'insert', technique: 'attack', edge: 'box', pace: 'stack' };
  // HONEST_READS: a direct caller without a read gets the one defense.runFit
  // builds (his acquired holder, else his picture of the backfield mesh), never
  // the true carrier or the true handoff. No production caller reaches this;
  // edge-backside-trail and edge-fit-approach tests do, and pass explicit reads
  // when the flag's old path is deleted.
  if (HONEST_READS && input === undefined) {
    const holder = observedHolder(a, sim), rb = seenBack(sim, a);
    input = holder && (holder.target !== sim.qb || hasObservedFlight(a) || qbRunning(a, sim)) ? { possession: holder }
      : rb && sim.offAlign.spots[rb.slot]?.backfield ? { backfield: { back: rb, backCue: sim.see(a, rb), qbCue: sim.see(a, sim.qb) } }
      : holder ? { possession: holder } : null;
  }
  const keyed = input && 'target' in input ? input : undefined;
  const picture = input && 'backfield' in input ? input.backfield : undefined;
  const acquired = input && 'possession' in input ? input.possession : undefined;
  const back = picture?.back ?? seenBack(sim, a);
  const acquiredBack = picture?.backCue.carrying === true && picture.qbCue.carrying !== true;
  const c = input === null ? null : acquired?.target ?? (picture ? acquiredBack ? back! : sim.qb : keyed?.target ?? (HONEST_READS ? null : sim.carrier));
  // A keyed fit has already consumed its runner picture. Deep mesh geometry
  // keeps the insertion at its surface; the actual handoff/carrier cannot
  // choose another target or prematurely declare this observed crease.
  let premesh = acquired ? false : picture ? c === sim.qb : keyed ? keyed.cue.pos.x <= sim.los - 1.6
    : c === sim.qb && !qbRunning(a, sim) && (HONEST_READS || sim.handoffAt < 0) && !!back;
  if (!c || c.team === a.team) return goTo(a, { x: sim.los + .6, y: liveGapY(sim, a, job.gap, job.side) }, { speed: .7 });
  let seen = acquired?.cue ?? (picture ? premesh || c === back ? picture.backCue : picture.qbCue
    : keyed?.cue ?? sim.see(a, premesh ? back! : c));
  if (!keyed && premesh) {
    const qb = picture?.qbCue ?? sim.see(a, sim.qb);
    // Snap possession is expected. An empty back already beyond the line
    // and out of handoff reach contradicts that expectation; a personally
    // acquired committed QB also retires it. Neither uses a failure clock.
    const leftEmpty = seen.carrying === false && seen.pos.x > sim.los
      && seen.pos.x - qb.pos.x > handoffReach(sim.qb, back!);
    if (qb.carrying === true && (qb.pos.x > sim.los + 2 || leftEmpty) && !contradictedMesh.has(a)) {
      contradictedMesh.add(a);
      if (sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'run-fit-mesh', chose: 'acquired-QB',
        cue: leftEmpty ? 'Acquired empty back beyond LOS/out of handoff reach; QB carrying=true' : 'Acquired carrying QB beyond LOS+2',
        options: ['expected-back', 'acquired-QB'],
        detail: `Retire this observer's mesh expectation; QB picture age ${qb.age ?? 'unknown'}, back age ${seen.age ?? 'unknown'} s. Existing fit/shoulder retained.` });
    }
    if (contradictedMesh.has(a)) { premesh = false; seen = qb; }
  }
  if (!premesh && seen.pos.x > sim.los + (keyed ? 0 : 2)) return chase(sim, a, c);
  const indicator = blockingIndicator(a, sim);
  let gy = liveGapY(sim, a, job.gap, job.side);
  if (job.kind === 'alley') {
    // The remaining secondary support is the cap on the fit. Bringing every
    // safety to linebacker depth before the back declares removes the final
    // level and turns ordinary creases into breakaways.
    if (!premesh && seen.pos.x>sim.los-2.5) return chase(sim,a,c,3.5);
    const home=sim.defAlign.spots[a.slot as DefSlot]!.pos;
    // The expected exchange is no longer a single visible threat when an
    // empty back has gone ahead and out of handoff reach while the QB still
    // shows possession. Keep both capped until the picture resolves it. A
    // pitch is still possible; this is not a declaration of a failed mesh.
    const split = premesh && picture && picture.qbCue.carrying === true
      && picture.backCue.carrying === false
      && picture.qbCue.age !== undefined && picture.backCue.age !== undefined
      && picture.backCue.pos.x - picture.qbCue.pos.x > handoffReach(sim.qb, back!);
    const flowY = split ? (picture.backCue.pos.y + picture.qbCue.pos.y) / 2 : seen.pos.y;
    const flowVy = split ? (picture.backCue.vel.y + picture.qbCue.vel.y) / 2 : seen.vel.y;
    if (split && sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'run-fit-cap',
      chose: 'cap QB and empty back', cue: 'QB carrying; empty back ahead and outside handoff reach',
      detail: 'Retain installed cap depth. Neither a completed exchange nor a keeper is assumed.' });
    // SAFETY_TEMPO: until the back declares, the alley player eases down
    // from his alignment and stays the last level over the ball.
    const depth=SAFETY_TEMPO ? Math.max(5,home.x-sim.los-1) : clamp((home.x-sim.los)*.65,5,8);
    const aim=a.mind.aim('alley-fit',{x:sim.los+depth,y:flowY+job.side*1.2+a.mind.placementError},sim.t);
    return track(a,aim,{x:0,y:flowVy},{speed:.65,gain:2,facing:Math.PI});
  }
  const core = sim.offense.filter((o) => ['LT','LG','C','RG','RT'].includes(o.slot) || sim.offAlign.spots[o.slot]?.inline)
    .map((o) => ({ ...sim.see(a,o), radius:o.profile.radius }));
  const surface = job.side > 0 ? Math.max(...core.map((o) => o.pos.y + o.radius)) : Math.min(...core.map((o) => o.pos.y - o.radius));
  if (job.kind === 'force' && job.inside && (FOLD_HOLD && job.inside.kind !== 'edge' ? holdsFold(a, sim, c, job.side, seen, premesh, surface)
    : !(!premesh && seen.carrying === true && job.side * seen.pos.y + c.profile.radius >= job.side * surface))) {
    // Use this same consumed picture, not the live runner or offensive call.
    // The installed outside shoulder remains available during later pursuit
    // and contact; only the free fit landmark is conditional here.
    job = { ...job, ...job.inside, kind: job.inside.kind ?? 'insert',
      // A dropping end is his own outside support, so cannot spill to himself.
      edge: job.inside.kind === 'edge' ? 'box' : job.edge };
    gy = liveGapY(sim, a, job.gap, job.side);
  }
  const edge = job.kind === 'edge' || job.kind === 'force';
  if (edge) {
    let kick: ReturnType<PlaySim['see']> | null = null;
    if (job.kind === 'edge') {
      kick = sim.offense.filter((o) => o !== sim.qb && o !== back).map((o) => sim.see(a,o))
        .filter((o) => o.pos.x < a.pos.x + .5 && Math.abs(o.pos.y-a.pos.y) < 2.5 && o.vel.y * job.side > 1.3)
        .sort((p,q) => Math.hypot(p.pos.x-a.pos.x,p.pos.y-a.pos.y)-Math.hypot(q.pos.x-a.pos.x,q.pos.y-a.pos.y))[0] ?? null;
    }
    if (kick) {
      // Wrong-arm the inside half or maintain the outside half of the arriving
      // kickout. The blocker can answer with a log; no outcome is prescribed.
      gy = kick.pos.y + job.side * (job.edge === 'spill' ? -.45 : .65);
      a.tags.add(job.edge === 'spill' ? 'fit-spill' : 'fit-box');
    } else gy = job.kind === 'force' ? job.side > 0 ? Math.max(surface+.5,seen.pos.y+.7) : Math.min(surface-.5,seen.pos.y-.7) : gy;
    // EDGE_REACH (experimental, off): a box edge keeps his outside leverage
    // on the man in front of him while the line he sees flows to his side.
    // His landmark never falls inside that man's outside shoulder nor inside
    // his own alignment, so a reach stretching outward carries the edge out
    // with it, instead of a gap-centre landmark pulling him in.
    if (EDGE_REACH && job.kind === 'edge' && job.edge !== 'spill' && !kick && lineRead(sim, a) === job.side) {
      const out = job.side;
      const front = sim.offense.filter((o) => o !== sim.qb && o !== back && o !== c).map((o) => ({ s: sim.see(a, o), r: o.profile.radius }))
        .filter(({ s }) => Math.abs(s.pos.x - a.pos.x) < 2 && Math.abs(s.pos.y - a.pos.y) < 2.5)
        .sort((p, q) => Math.hypot(p.s.pos.x - a.pos.x, p.s.pos.y - a.pos.y) - Math.hypot(q.s.pos.x - a.pos.x, q.s.pos.y - a.pos.y))[0];
      const shoulder = front ? front.s.pos.y + out * (front.r + a.profile.radius * .5) : -Infinity * out;
      const home = sim.defAlign.spots[a.slot as DefSlot]!.pos.y;
      const floor = out > 0 ? Math.max(shoulder, home) : Math.min(shoulder, home);
      if ((floor - gy) * out > 0) { gy = floor; a.tags.add('edge-reach-fit'); }
    }
    // Squeeze, don't chase: the man on the inside of his gap blocking down
    // takes the gap inside with him, but the edge owns the spot he left. He
    // closes to it, his body just outside it, and no further, where a
    // kick-out or a lead has to come get him: he replaces the spot, at the
    // depth the blocker stood, not on the line beside him.
    // Play side only: the line shows the play coming his way (a puller, or a
    // zone step toward him). A backside edge follows the line down instead.
    let replace: number | undefined;
    if (job.kind === 'edge' && !kick && (job.gap === 'C' || job.gap === 'D') && lineRead(sim, a) === job.side) {
      const mid = sim.offAlign.spots.C?.pos.y ?? sim.ballY;
      const out = sim.offense.filter((o) => ['LT','LG','RG','RT'].includes(o.slot) || sim.offAlign.spots[o.slot]?.inline)
        .map((o) => sim.offAlign.spots[o.slot]!.pos).filter((q) => (q.y - mid) * job.side > 0)
        .sort((p, q) => (p.y - q.y) * job.side);
      const inner = job.gap === 'D' ? out.at(-1) : out[1];
      if (inner !== undefined) {
        const spot = inner.y + job.side * a.profile.radius;
        if ((gy - spot) * job.side < 0) { gy = spot; replace = inner.x; a.tags.add('fit-replace'); }
      }
    }
    // Backside: his own picture shows the ball carried away from his side,
    // already inside his landmark. He squeezes and trails it flat at its
    // depth, keeping the lateral relation to the ball his fit had (the
    // boot/reverse/cutback check), instead of holding a spot the play has
    // left. Never wider than his fit; a ball coming back to him is the
    // ordinary edge fit again.
    const trail = job.kind === 'edge' && !kick && !premesh && seen.carrying === true
      && job.side * seen.vel.y < -1 && job.side * (seen.pos.y - gy) < 0;
    if (trail) {
      const cushion = Math.abs(gy - sim.ballY);
      gy = job.side > 0 ? Math.min(gy, seen.pos.y + cushion) : Math.max(gy, seen.pos.y - cushion);
    }
    const homeDepth=sim.defAlign.spots[a.slot as DefSlot]!.pos.x-sim.los;
    const supportDepth=job.kind==='force' && (premesh||seen.pos.x<sim.los-1.6) ? clamp(homeDepth*.55,1.5,6) : .3;
    const fitX = Math.max(sim.los+supportDepth,Math.min(sim.los+2.5,seen.pos.x+1.5));
    let x = kick ? Math.max(sim.los-.6,kick.pos.x+.5) : trail ? Math.min(fitX, Math.max(seen.pos.x, sim.los-3)) : replace ?? fitX;
    // END_CHASE (experimental, off; with the edge squeeze in defense.ts): a
    // backside edge whose line flows away with no puller (no kick-out coming)
    // squeezes upfield behind it into the backfield, the boot/reverse/cutback
    // player chasing from the back, rather than at his side of the line.
    // NFL unblocked backside ends on zone runs are 0.6-0.7 yd in the
    // backfield by 1.5 s (68-80% cross the line); ours sat at +0.2.
    if (END_CHASE && job.kind === 'edge' && !kick && replace === undefined && lineRead(sim, a) === -job.side) {
      x = Math.min(x, sim.los - END_CHASE_DEPTH);
      a.tags.add('end-chase');
    }
    // The outside shoulder belongs to a moving runner/surface, not a series
    // of stationary landmarks. Use only the pictures acquired above and
    // retain point and motion together for the existing decision beat.
    let aim, motion = {x:0,y:0};
    if (job.kind === 'force') {
      const boundary = core.reduce((p,q) => job.side*(p.pos.y+job.side*p.radius)
        >= job.side*(q.pos.y+job.side*q.radius) ? p : q);
      let line = surface, lineVel = boundary.vel.y;
      if (FORCE_BOUNCE) {
        const dir = sim.attackDir(sim.offense[0].team);
        for (const o of sim.agents) {
          if (o === a || o === c || o === sim.qb || (o.team === a.team && !(HONEST_READS ? seenEngaged(sim, a, o) : o.engagement))) continue;
          const b = sim.see(a,o), outer = b.pos.y + job.side*o.profile.radius, depth = (b.pos.x - sim.los)*dir;
          if (depth < -2.5 || depth > 1.5 || job.side*(outer-surface) <= 0 || job.side*(outer-surface) > 4) continue;
          if (job.side*(outer-line) > 0) { line = outer; lineVel = b.vel.y; }
        }
      }
      // Behind the line nothing has declared; keep a runner's outward cut inside
      // the reach of his own reaction.
      if (FORCE_BOUNCE && (premesh || seen.pos.x < sim.los - .5)) line += job.side * a.profile.reactionTime * (premesh && back ? back : c).profile.vmax;
      const desired = forceTrack(a,seen,x,line,lineVel,job.side);
      desired.point.y += a.mind.placementError;
      const held = retainedForceTrack(a,desired,sim.t);
      aim = held.point; motion = held.velocity;
    } else {
      aim = a.mind.aim('edge-fit',{x,y:gy+a.mind.placementError},sim.t);
      // Trailing, the point moves with the ball he sees: carry its lateral motion.
      if (trail) motion = { x: 0, y: seen.vel.y };
    }
    const fit = track(a,aim,motion,{speed:.9,gain:3,facing:Math.PI});
    // Open the hips for an acquired outward lateral run; a square shuffle
    // cannot execute this request. Near-contact gathering below still owns
    // the final approach, and stationary/inside fits keep their technique.
    if (motion.y*job.side > 0 && Math.abs(fit.vel.y)>Math.abs(fit.vel.x))
      fit.facing = Math.atan2(fit.vel.y,fit.vel.x);
    // A fit landmark is not permission to run through an approaching back.
    // Gather for a personally identified runner threatening this surface,
    // even before he crosses the old LOS pursuit gate. Keep the installed
    // shoulder and use the same short, force-limited approach preview as
    // ordinary pursuit; a distant/inside runner still leaves the edge intact.
    const contact = a.profile.radius + c.profile.radius + a.profile.reach * .65;
    const support = a.body.support;
    const free = !a.isDown(sim.t) && !sim.bond?.tacklers.includes(a) && (!support ||
      (support.state === 'up' && !support.foot && !support.strike &&
        Math.hypot(support.lean.x,support.lean.y) < 1e-6 && Math.hypot(support.load.x,support.load.y) < 1e-6));
    if (!premesh && seen.carrying === true && free && job.side * (seen.pos.y - gy) >= -contact) {
      const offset = aim.y-seen.pos.y;
      const { near, gather } = gatheringApproach(a,seen,contact,offset);
      return chooseApproach(a,seen,contact,offset,fit,sim.t,
        command => blendApproach(command,near,gather));
    }
    return fit;
  }
  if (CF_FLOW) return counterfactualFit(a, sim, c, job, seen, premesh);
  if (job.technique === 'lag' && Math.abs(seen.vel.y) > .8) gy = liveGapY(sim,a,'A',-Math.sign(seen.vel.y));
  // Flow read: once the back's own track clearly declares a direction, a
  // backer flows to keep inside-out leverage on him (a yard inside his
  // projected position), never against his own gap. Backside cutback and
  // lag duties stay home. FLOW_READ=0 restores the landmark-only fit.
  let flowing = false;
  // An identified runner at the existing declaration surface can straighten
  // up without ceasing to occupy his crease. Keep inside-out leverage there;
  // a deep mesh or uncertain possession still requires the original flow cue.
  const shallowRunner = job.kind === 'insert' && !premesh && seen.carrying === true
    && seen.pos.x > sim.los - 1.6 && (seen.pos.y - sim.ballY) * job.side > 0;
  const flowSide = Math.abs(seen.vel.y) > 1.5 ? Math.sign(seen.vel.y)
    : shallowRunner ? Math.sign(seen.pos.y - gy) : 0;
  // The landmark before the runner projection: a pull cue is judged against
  // it, so the back's projected track never hides the puller from the read.
  const gapY = gy;
  // LB_LINE_FLOW (experimental, off): the line tells him first. A backer who
  // has read run and sees the line step one way together (the zone step; the
  // same read lineRead gives the DL) flows over the top that way before the
  // back's track shows it, a gap's width ahead of his landmark, with his hips
  // open (LB_PLAN below). NFL box backers flow 1.35 yd/s toward the play by
  // 0.6 s on outside zone; ours stood on their landmark until the back's
  // lateral run or the gap's own slow motion moved them.
  let lineFlow = 0;
  // The back's track agreeing with the guards keeps the lead: dropping it
  // when the back confirms the flow reversed him onto his old landmark.
  if (LB_LINE_FLOW && job.kind === 'insert' && job.technique !== 'lag') {
    lineFlow = guardRead(sim, a);
    if (lineFlow && flowSide && flowSide !== lineFlow) lineFlow = 0;
    if (lineFlow) { gy += lineFlow * LINE_FLOW_LEAD; flowing = true; a.tags.add('fit-line-flow'); }
  }
  if (FLOW_READ && job.kind !== 'cutback' && job.technique !== 'lag' && flowSide) {
    const f = flowSide;
    const lead = flowLead((a.pos.x - seen.pos.x) * sim.attackDir(c.team), seen.vel, 2 * a.mind.decisionInterval);
    const onBall = seen.pos.y + seen.vel.y * lead - f * FLOW_INSIDE;
    if ((onBall - gy) * f > 0) { gy = onBall; flowing = true; a.tags.add('fit-flow-read'); }
  }
  // Scrape with the gap: carry the landmark forward at the speed of the
  // bodies that bound it over one read (a stack backer more than a plug).
  // The back no longer pulls the landmark; he decides when to attack it.
  // SCRAPE=0 restores the old lean toward the back's lateral position.
  const gap = liveGap(sim, a, job.gap, job.side);
  const flow = SCRAPE ? clamp(gap.vel * a.mind.decisionInterval * (job.pace === 'stack' ? 2 : 1), -2, 2)
    : clamp(seen.pos.y-gy,-2,2) * (job.pace === 'stack' ? .5 : .2);
  let pullSide = 0;
  if (PULL_READ) {
    // Read the guards: every puller this player sees crossing behind the line
    // shows where an extra blocker will turn up. Flow with him to keep the
    // installed leverage on his arrival (box outside him, spill inside him);
    // never flow against the pull. When linemen move behind the line both
    // ways (a puller and a hinging tackle), the fastest lateral mover is the
    // pull; reading whichever came first flipped the fit from tick to tick.
    const pairs = job.kind === 'interior' ? [] : pullerPairs(sim, a), moving = pairs.map((q) => q.seen);
    const lead = moving.reduce<Perceived | null>((m, p) => !m || Math.abs(p.vel.y) > Math.abs(m.vel.y) ? p : m, null);
    const key = GUARD_KEY && (job.kind === 'insert' || job.kind === 'cutback') ? keyGuard(sim, a) : null;
    for (const { agent: puller, seen: p } of pairs) {
      const dir = Math.sign(p.vel.y), arrive = p.pos.y + p.vel.y * PULL_LOOK;
      if (dir !== Math.sign(lead!.vel.y)) continue;
      const target = arrive + dir * (job.edge === 'spill' ? -PULL_SHOULDER : PULL_SHOULDER);
      // FLOW_INTERCEPT: a runner projection that has already carried the
      // landmark past the puller's arrival does not hide the pull. Within
      // reach of the landmark before that projection the cue still reads
      // (and the backer fills); he never moves back against his own flow.
      if (puller === key ? (target - gy) * dir > 0 || (target - gapY) * dir > 0 : pullCueReads(target, dir, gy, gapY)) {
        if ((target - gy) * dir > 0) gy = target;
        pullSide = dir; a.tags.add('fit-pull-read');
      }
    }
  } else if (indicator?.kind === 'pull' && job.kind !== 'interior') {
    gy += indicator.side * Math.min(1.5,Math.abs(indicator.pos.y-gy)*.35);
    a.tags.add('fit-pull-read');
  }
  // Insert to the surface, then attack a declared crease. The back's being
  // near our lateral landmark at a deep mesh is not permission to chase him.
  // THREAT_READ: the back threatens this gap when his seen path crosses the
  // line within reach of it (not merely where he stands now); he has
  // declared it when he is also at the surface. A back pressing wide still
  // threatens to bend back, so a disciplined fit holds until he commits.
  let declared: boolean, threatened = false;
  if (THREAT_READ && !premesh) {
    const dirX = sim.attackDir(c.team), toLos = Math.max(0, (sim.los - seen.pos.x) * dirX);
    const reachLos = clamp(toLos / Math.max(.5, seen.vel.x * dirX), 0, 1);
    const crossing = seen.pos.y + seen.vel.y * reachLos;
    const half = Number.isFinite(gap.width) ? Math.max(.6, gap.width / 2) : 1.2;
    const threat = Math.abs(crossing - gy) < half + 1;
    declared = threat && seen.pos.x > sim.los - 1.6;
    if (threat && !declared) { a.tags.add('fit-threat-read'); threatened = true; }
  } else declared = !premesh && seen.pos.x > sim.los-1.6 && Math.abs(seen.pos.y-gy) < 2.5;
  if (declared && job.kind !== 'cutback') return chase(sim,a,c,2);
  // A stack backer whose gap the runner's path threatens fills downhill to meet
  // him at the line, instead of waiting at his landmark until he declares. A
  // guard pulling into his fit is the same threat seen sooner: the puller leads
  // the ball to the hole, and the backer fills to meet him there.
  const fill = threatened || pullSide !== 0;
  // An attacking interior lineman penetrates his gap: his landmark is the
  // offensive line's stance line, in the backfield, where he resets the line
  // and meets a trapper or puller. A two-gap (control) or lagging lineman holds
  // just past the line, where he can still play either side of his blocker.
  const fitDepth = ATTACK_LANDMARK && job.technique === 'attack' ? (sim.offAlign.spots.C?.pos.x ?? sim.los - 1) - sim.los : .25;
  const depth = job.kind === 'interior' ? fitDepth : job.kind === 'cutback' ? 1.4 : job.pace === 'stack' ? fill ? FILL_DEPTH : STACK_LANDMARK : .5;
  const aim = a.mind.aim('run-fit',{x:sim.los+depth,y:gy+flow+a.mind.placementError},sim.t);
  let pace = .78+.15*a.mind.urgency;
  const fit = track(a,aim,{x:0,y:0},{speed:pace,gain:3,facing:Math.PI});
  // A moving landmark (the line flowing, or the back's declared track) is
  // chased with lateral work planned with his own body (the law every
  // position plans with): the speed that puts him there within two reads,
  // rather than a proportional drift the acceleration lag turns into a late
  // arrival. A still landmark keeps the ordinary proportional fit.
  // A newly seen pull can precede adoption of its target on the next decision
  // beat. Do not amplify the still-held action away from that observed pull.
  const planPull = PULL_PLAN && job.kind === 'insert' && job.technique !== 'lag'
    && (aim.y - a.pos.y) * pullSide > 0;
  if (!LB_PLAN || !(flowing || Math.abs(gap.vel) > 1 || planPull)) return fit;
  const horizon = 2 * a.mind.decisionInterval;
  const vy = clamp(requestToCover(gaitLag(a.profile), aim.y - a.pos.y, horizon, a.vel.y), -a.profile.vmax, a.profile.vmax);
  // Once the acquired track calls for lateral running, use a crossover
  // rather than holding square shoulders and limiting that request to a
  // shuffle. Interior/lag/cutback and still-patient landmarks stay square.
  // A request against the landmark's side is braking from an overrun: he
  // plants and squares up, he does not turn to run back the way he came.
  const toward = Math.sign(vy) === Math.sign(aim.y - a.pos.y);
  const facing = job.kind === 'insert' && flowing && toward && Math.abs(vy) > Math.abs(fit.vel.x)
    ? Math.atan2(vy, fit.vel.x) : fit.facing;
  return { ...fit, vel: { x: fit.vel.x, y: vy }, facing };
}

/** Counterfactual free fit (diagnostic): `hold` keeps the snap landmark with no
 * flow reads; `over` sprints with the seen line flow, cutback duty included.
 * Both still attack a runner who declares this player's lane. */
function counterfactualFit(a: Agent, sim: PlaySim, c: Agent, job: RunFitJob, seen: Perceived, premesh: boolean) {
  let gy = gapY(sim.offAlign, job.gap, job.side);
  const declared = !premesh && seen.pos.x > sim.los - 1.6 && Math.abs(seen.pos.y - gy) < 2.5;
  if (declared) return chase(sim, a, c, 2);
  const depth = job.kind === 'interior' ? .25 : job.kind === 'cutback' ? 1.4 : job.pace === 'stack' ? STACK_LANDMARK : .5;
  if (CF_FLOW === 'over') {
    const f = lineFlow(linePicture(sim, a)), dir = Math.abs(f) > .5 ? Math.sign(f) : Math.abs(seen.vel.y) > 1 ? Math.sign(seen.vel.y) : 0;
    if (dir) {
      const fit = track(a, { x: sim.los + depth, y: a.pos.y + dir * 4 }, { x: 0, y: 0 }, { speed: 1, gain: 3, facing: Math.PI });
      return { ...fit, vel: { x: fit.vel.x, y: dir * a.profile.vmax } };
    }
  }
  const aim = a.mind.aim('run-fit', { x: sim.los + depth, y: gy + a.mind.placementError }, sim.t);
  return track(a, aim, { x: 0, y: 0 }, { speed: .78 + .15 * a.mind.urgency, gain: 3, facing: Math.PI });
}
