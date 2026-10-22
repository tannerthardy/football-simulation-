/** A support contract derived from the called front AND coverage, not the run call. */
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
export type RunFitRead = KeyedRunFit | BackfieldRunFit;

export function buildRunFits(sim: PlaySim): Map<Agent, RunFitJob> {
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
    const kind = line || dropper ? (gap === 'C' || gap === 'D' ? 'edge' : 'interior') : d.slot.startsWith('LB') ? 'insert' : 'alley';
    jobs.set(d, { gap, side, kind, technique: override?.technique ?? 'attack', edge: policy.edge, pace: policy.linebacker });
    if (line || spot.role.kind === 'blitz') first.add(d);
    // Dropping on passes changes support eligibility, not the front's run gap.
    if (line || spot.role.kind === 'blitz' || dropper) claimed.add(`${side}:${gap}`);
    if (dropper && kind === 'edge') jobs.get(d)!.inside = { gap, side, kind: 'edge' };
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
      && outsideSide(d) === null && (d.pos.y - sim.ballY) * side > 2 && !(DEEP_NO_FORCE && deepZone(d)));
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
  for (const d of backers) {
    const job = jobs.get(d)!;
    const eligible = job.kind === 'force' ? bubbles.filter(b => b.side === job.side) : bubbles;
    eligible.sort((a, b) => Math.abs(gapY(sim.offAlign, a.gap, a.side) - d.pos.y) - Math.abs(gapY(sim.offAlign, b.gap, b.side) - d.pos.y));
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

/** Free fits scrape with the gap's motion, the earliest zone key (SCRAPE=0) and read the back's
 * threatened crossing rather than his position (THREAT_READ=0). */
const SCRAPE = process.env.SCRAPE !== '0', THREAT_READ = process.env.THREAT_READ !== '0';

/** Free fits plan lateral work with their own body (LB_PLAN=0 off). */
const LB_PLAN = process.env.LB_PLAN !== '0';
/** Experimental activation of the same planner for an observed pull-adjusted
 * insertion. Default off while matched containment/misdirection controls run. */
const PULL_PLAN = process.env.PULL_PLAN === '1';

/** Backers flow inside-out on a declared track (FLOW_READ=0 off); yards inside the ball. */
const FLOW_READ = process.env.FLOW_READ !== '0', FLOW_INSIDE = 1;

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
/** DEEP_NO_FORCE (off): a deep-zone defender is never the side's force
 * player. Without a flat seat (man and quarters calls) the fallback could
 * pick the post or half safety at 10-12 yd, who then sprints to the line
 * outside the back; the back runs inside him with no one behind. Off: any
 * available defender outside the ball. With no candidate the edge boxes. */
const DEEP_NO_FORCE = process.env.DEEP_NO_FORCE === '1';
const STACK_LANDMARK = LB_LANDMARK ? 2.25 : 1.5;

/** Linemen this player sees pulling: off the surface, behind the line, moving
 * across. Every one counts; nothing reads the offensive call. */
export function pullers(sim: PlaySim, a: Agent): Perceived[] {
  const picture = linePicture(sim, a);
  const candidates = PULL_CUE || PULL_EARLY ? [...picture.surface, ...picture.departed].filter(b => {
    const home = sim.offAlign.spots[b.agent.slot]!.pos, dir = sim.attackDir(b.agent.team);
    const depth = (b.seen.pos.x - home.x) * dir;
    if (PULL_EARLY && depth < -.15 && b.seen.vel.x * dir <= .5 && Math.abs(b.seen.vel.y) > 1.5) return true;
    return PULL_CUE && (depth < -1.5 || depth < -.5 && Math.abs(b.seen.pos.y - home.y) > 1);
  }) : picture.departed;
  return candidates.map((b) => b.seen)
    .filter((s) => (sim.los - s.pos.x) * sim.attackDir(sim.offense[0].team) > .3 && Math.abs(s.vel.y) > 1.5);
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

export function executeRunFit(a: Agent, sim: PlaySim, fallbackGap: Gap, fallbackSide: number, input?: RunFitRead) {
  if (a.engagement) return stand();
  let job: RunFitJob = a.runFit ?? { gap: fallbackGap, side: fallbackSide, kind: 'insert', technique: 'attack', edge: 'box', pace: 'stack' };
  const keyed = input && 'target' in input ? input : undefined;
  const picture = input && 'backfield' in input ? input.backfield : undefined;
  const back = picture?.back ?? sim.slot('RB');
  const acquiredBack = picture?.backCue.carrying === true && picture.qbCue.carrying !== true;
  const c = picture ? acquiredBack ? back! : sim.qb : keyed?.target ?? sim.carrier;
  // A keyed fit has already consumed its runner picture. Deep mesh geometry
  // keeps the insertion at its surface; the actual handoff/carrier cannot
  // choose another target or prematurely declare this observed crease.
  let premesh = picture ? c === sim.qb : keyed ? keyed.cue.pos.x <= sim.los - 1.6
    : c === sim.qb && !sim.scrambled && sim.handoffAt < 0 && !!back;
  if (!c || c.team === a.team) return goTo(a, { x: sim.los + .6, y: liveGapY(sim, a, job.gap, job.side) }, { speed: .7 });
  let seen = picture ? premesh || c === back ? picture.backCue : picture.qbCue
    : keyed?.cue ?? sim.see(a, premesh ? back! : c);
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
    // SAFETY_TEMPO: until the back declares, the alley player eases down
    // from his alignment and stays the last level over the ball.
    const depth=SAFETY_TEMPO ? Math.max(5,home.x-sim.los-1) : clamp((home.x-sim.los)*.65,5,8);
    const aim=a.mind.aim('alley-fit',{x:sim.los+depth,y:seen.pos.y+job.side*1.2+a.mind.placementError},sim.t);
    return track(a,aim,{x:0,y:seen.vel.y},{speed:.65,gain:2,facing:Math.PI});
  }
  const core = sim.offense.filter((o) => ['LT','LG','C','RG','RT'].includes(o.slot) || sim.offAlign.spots[o.slot]?.inline)
    .map((o) => ({ ...sim.see(a,o), radius:o.profile.radius }));
  const surface = job.side > 0 ? Math.max(...core.map((o) => o.pos.y + o.radius)) : Math.min(...core.map((o) => o.pos.y - o.radius));
  if (job.kind === 'force' && job.inside && !(!premesh && seen.carrying === true
    && job.side * seen.pos.y + c.profile.radius >= job.side * surface)) {
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
    const homeDepth=sim.defAlign.spots[a.slot as DefSlot]!.pos.x-sim.los;
    const supportDepth=job.kind==='force' && (premesh||seen.pos.x<sim.los-1.6) ? clamp(homeDepth*.55,1.5,6) : .3;
    const x = kick ? Math.max(sim.los-.6,kick.pos.x+.5) : Math.max(sim.los+supportDepth,Math.min(sim.los+2.5,seen.pos.x+1.5));
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
          if (o === a || o === c || o === sim.qb || (o.team === a.team && !o.engagement)) continue;
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
    } else aim = a.mind.aim('edge-fit',{x,y:gy+a.mind.placementError},sim.t);
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
  if (FLOW_READ && job.kind !== 'cutback' && job.technique !== 'lag' && flowSide) {
    const f = flowSide;
    const onBall = seen.pos.y + seen.vel.y * 2 * a.mind.decisionInterval - f * FLOW_INSIDE;
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
    // never flow against the pull.
    if (job.kind !== 'interior') for (const p of pullers(sim, a)) {
      const dir = Math.sign(p.vel.y), arrive = p.pos.y + p.vel.y * PULL_LOOK;
      const target = arrive + dir * (job.edge === 'spill' ? -PULL_SHOULDER : PULL_SHOULDER);
      if ((target - gy) * dir > 0 && (target - gy) * dir < PULL_REACH) {
        gy = target; pullSide = dir; a.tags.add('fit-pull-read');
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
  let declared: boolean;
  if (THREAT_READ && !premesh) {
    const dirX = sim.attackDir(c.team), toLos = Math.max(0, (sim.los - seen.pos.x) * dirX);
    const reachLos = clamp(toLos / Math.max(.5, seen.vel.x * dirX), 0, 1);
    const crossing = seen.pos.y + seen.vel.y * reachLos;
    const half = Number.isFinite(gap.width) ? Math.max(.6, gap.width / 2) : 1.2;
    const threat = Math.abs(crossing - gy) < half + 1;
    declared = threat && seen.pos.x > sim.los - 1.6;
    if (threat && !declared) a.tags.add('fit-threat-read');
  } else declared = !premesh && seen.pos.x > sim.los-1.6 && Math.abs(seen.pos.y-gy) < 2.5;
  if (declared && job.kind !== 'cutback') return chase(sim,a,c,2);
  const depth = job.kind === 'interior' ? .25 : job.kind === 'cutback' ? 1.4 : job.pace === 'stack' ? STACK_LANDMARK : .5;
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
  const facing = job.kind === 'insert' && flowing && Math.abs(vy) > Math.abs(fit.vel.x)
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
