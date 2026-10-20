/** The first supported OPI branch: an achieved offensive block clearly
 * downfield before a forward pass (NFL 2026 8-5-4(a)). This does not claim to
 * adjudicate general picks, in-flight PI or the ineligible-player exceptions.
 * Pending acts live independently of optional replay/telemetry recording. */
import { bodyRadius } from '../physics/bodyshape.js';
import type { Vec2 } from '../core/vec.js';
import type { HandJoint, StepReport } from '../physics/world.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

const RECEIVING_SLOTS = new Set(['X', 'Z', 'Y', 'H', 'F', 'RB']);
const FORCE_EPSILON = 1e-6; // Existing World/block-contact numerical resolution.

interface PrethrowBlock {
  actor: Agent;
  defender: Agent;
  intervalStart: number;
  intervalEnd: number;
  spotX: number;
  actorBackX: number;
  defenderBackX: number;
  normalForce: number;
  tangentForce: number;
  locationMargin: number;
}

const pending = new WeakMap<PlaySim, Map<string, PrethrowBlock>>();
// Initial-line contact can remain legal for an ineligible player as it moves
// downfield (8-3-1). Installed skill slots alone do not prove numbering/covered
// eligibility, so this first branch does not adjudicate any such continued
// initial-line contact. Joint replacement is not proof that body contact
// broke. Keep the possible exception sticky for that actor/defender pair for
// this play; proving separation can broaden this deliberately narrow branch.
const possibleInitialLinePairs = new WeakMap<PlaySim, Set<string>>();

const pairId = (actor: Agent, defender: Agent): string => `${actor.idx}:${defender.idx}`;

/** A conservative location test: every represented torso point on both
 * players lies beyond the one-yard line, so an unresolved torso contact
 * point cannot move the act across that legal boundary. */
function torsoBackX(a: Agent): number {
  return a.pos.x - bodyRadius(a.body, 1, 0);
}

function intervalLocation(actor: Agent, defender: Agent, boundary: number,
  starts: readonly Readonly<Vec2>[]): {
    clear: boolean; actorBackX: number; defenderBackX: number; margin: number;
  } | null {
  const actorStart = starts[actor.idx], defenderStart = starts[defender.idx];
  if (!actorStart || !defenderStart) return null;
  const actorTravel = Math.hypot(actor.pos.x - actorStart.x, actor.pos.y - actorStart.y);
  const defenderTravel = Math.hypot(defender.pos.x - defenderStart.x, defender.pos.y - defenderStart.y);
  const actorBackX = torsoBackX(actor), defenderBackX = torsoBackX(defender);
  // The maximum represented torso radius is 1.12×its unsqueezed radius.
  // Keep a full observed-translation band at both endpoints instead of
  // applying the law to an end-of-tick center alone.
  const margin = Math.max(actorTravel, defenderTravel);
  const actorFloor = Math.min(actorBackX, actorStart.x - actor.profile.radius * 1.12) - margin;
  const defenderFloor = Math.min(defenderBackX, defenderStart.x - defender.profile.radius * 1.12) - margin;
  return { actorBackX, defenderBackX, margin,
    clear: actorTravel <= actor.profile.radius && defenderTravel <= defender.profile.radius
      && actorFloor > boundary && defenderFloor > boundary };
}

/** Read the just-achieved World interval, before the engagement can release.
 * Body proximity, an engagement request and a defender-controlled joint do
 * not establish the offensive blocking act delivered by this predicate. */
export function observePrethrowBlocks(sim: PlaySim, report: StepReport, intervalStart: number,
  startPositions: readonly Readonly<Vec2>[]): void {
  if (sim.phase !== 'live' || sim.throwAt >= 0 || sim.segments.some(s => s.team === 'D')) return;

  const intervalEnd = intervalStart + sim.dt;
  const boundary = sim.los + 1;
  let initialLine = possibleInitialLinePairs.get(sim);
  const rememberPossibleInitialLine = (actor: Agent, defender: Agent): void => {
    initialLine ??= new Set();
    initialLine.add(pairId(actor, defender));
    possibleInitialLinePairs.set(sim, initialLine);
  };
  // The first contact can be a torso collision before hands are acquired.
  // Record that history even with no engagement, or during a backward pitch.
  for (const contact of report.contacts) {
    const a = sim.agents[contact.i], b = sim.agents[contact.j];
    if (!a || !b || a.team === b.team) continue;
    const actor = a.team === 'O' ? a : b, defender = a.team === 'D' ? a : b;
    if (RECEIVING_SLOTS.has(actor.slot)
      && !intervalLocation(actor, defender, boundary, startPositions)?.clear) {
      rememberPossibleInitialLine(actor, defender);
    }
  }
  const canRetainBlock = sim.ball.kind === 'held' && sim.ball.carrier.team === 'O';
  let acts = pending.get(sim);
  for (const rep of sim.engagements) {
    if (rep.defender.team !== 'D') continue;
    const members: Array<[Agent, HandJoint | undefined]> = [
      [rep.blocker, rep.hands],
      ...rep.helpers.map(a => [a, rep.helperHands?.get(a)] as [Agent, HandJoint | undefined]),
    ];
    for (const [actor, hands] of members) {
      // The installed receiving-slot subset cannot accidentally penalize a
      // legal ineligible lineman's continuous initial-charge block. Full snap
      // numbering/reporting/alignment eligibility remains a separate rule.
      if (actor.team !== 'O' || !RECEIVING_SLOTS.has(actor.slot) || !hands
        || !sim.world.joints.includes(hands)) continue;
      const normalForce = hands.normalForce ?? 0, tangentForce = hands.tangentForce ?? 0;
      if (!Number.isFinite(normalForce) || !Number.isFinite(tangentForce)) continue;
      const loaded = Math.hypot(normalForce, tangentForce) > FORCE_EPSILON;
      const torsoContact = report.contacts.some(c => (c.i === actor.idx && c.j === rep.defender.idx)
        || (c.j === actor.idx && c.i === rep.defender.idx));
      if (!loaded && !torsoContact) continue;
      // This first branch is deliberately limited to a slow, clearly
      // downfield held block. A fast/boundary-crossing interval needs native
      // substep contact location rather than invented ordering/location.
      const location = intervalLocation(actor, rep.defender, boundary, startPositions);
      if (!location?.clear) rememberPossibleInitialLine(actor, rep.defender);
      if (!canRetainBlock || !loaded || !location?.clear || initialLine?.has(pairId(actor, rep.defender))) continue;
      const { actorBackX, defenderBackX, margin: locationMargin } = location;
      const appliedArmImpulse = report.armImpulse[actor.idx];
      if ((hands.actor ?? hands.a) !== actor.body || !Number.isFinite(appliedArmImpulse)
        || appliedArmImpulse <= FORCE_EPSILON) continue;

      acts ??= new Map();
      const id = pairId(actor, rep.defender);
      // Preserve the earliest definite act, rather than moving its timestamp
      // up to the eventual release during a continuously loaded block.
      if (!acts.has(id)) acts.set(id, { actor, defender: rep.defender, intervalStart,
        intervalEnd, spotX: rep.defender.pos.x, actorBackX, defenderBackX,
        normalForce, tangentForce, locationMargin });
    }
  }
  if (acts) pending.set(sim, acts);
}

/** Resolve retained acts only once a qualifying forward pass actually exists.
 * A backward pitch, no-throw run or same unresolved contact/release interval
 * cannot be converted into OPI. Positive initial forward velocity is the
 * supported unequivocal forward-pass definition (8-1-1(a)). */
export function assessPrethrowBlocksOnPass(sim: PlaySim, passer: Agent, releaseX: number,
  releaseT: number, forwardVelocityX: number): void {
  const acts = pending.get(sim);
  if (!acts || passer.team !== 'O' || sim.segments.some(s => s.team === 'D')
    || !(forwardVelocityX > 0) || !Number.isFinite(releaseX)
    || !Number.isFinite(releaseT) || releaseX > sim.los
    || passer.pos.x + bodyRadius(passer.body, 1, 0) > sim.los) return;

  for (const act of acts.values()) {
    if (possibleInitialLinePairs.get(sim)?.has(pairId(act.actor, act.defender))) continue;
    // World reports only interval-aggregated load. If that interval ends at
    // release, its ordering is not clear enough to call this prethrow branch.
    if (!(act.intervalEnd < releaseT - 1e-9)) continue;
    sim.recordFoul({
      id: `opi:prethrow:${act.actor.idx}:${act.defender.idx}`,
      kind: 'opi', against: 'O', playerId: act.actor.player.id,
      yards: 10, autoFirst: false, spotX: act.spotX, t: act.intervalEnd,
      rule: '8-5-4(a)', reason: 'achieved downfield block clearly before forward pass',
    }, {
      source: 'native', rule: '8-5-4(a)', action: 'prethrow_downfield_block',
      victimId: act.defender.player.id,
      facts: { intervalStart: act.intervalStart, intervalEnd: act.intervalEnd,
        releaseT, releaseX, forwardVelocityX, blockerTorsoBackX: act.actorBackX,
        defenderTorsoBackX: act.defenderBackX, boundaryX: sim.los + 1,
        normalForce: act.normalForce, tangentForce: act.tangentForce,
        locationMargin: act.locationMargin,
        coverage: 'slow, clearly downfield receiving-slot active-hand block; not general OPI' },
    });
  }
}
