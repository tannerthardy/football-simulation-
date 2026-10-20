/** NFL 2026 12-1-4: teammate assistance is an achieved act, not a formation,
 * nearby player, two-blocker assignment, or a runner gaining extra yards.
 * Pushing the runner is legal. Pulling him, interlocking to block, and pushing
 * a teammate to help him block/recover a loose ball have distinct predicates.
 */
import type { Vec2 } from '../core/vec.js';
import type { Body } from '../physics/kinematics.js';
import type { ContactSnapshot, Joint, StepReport } from '../physics/world.js';
import type { Agent, TeamSide } from './agent.js';
import type { PlaySim } from './playsim.js';
import type { PenaltyCall } from './types.js';

interface JointStart {
  joint: Joint;
  a: Agent;
  b: Agent;
  positionA: Vec2;
  positionB: Vec2;
  previousApplied?: ContactSnapshot;
}

export interface TeamContactIntervalStart {
  t: number;
  dt: number;
  worldTime: number;
  possession: TeamSide;
  possessionChanges: number;
  possessionSpotX: number;
  runner: Agent | null;
  runnerPosition: Vec2 | null;
  runnerVelocity: Vec2 | null;
  looseBall: Vec2 | null;
  personalRecoveryAttempts: ReadonlySet<Agent>;
  joints: readonly JointStart[];
}

interface ActMemory { next: number; ids: WeakMap<Joint, string>; unresolved: Set<string> }
const memories = new WeakMap<PlaySim, ActMemory>();
const EPS = 1e-8; // Roundoff tolerance, not an NFL force/judgment threshold.
const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
const minus = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec2, n: number): Vec2 => ({ x: a.x * n, y: a.y * n });
const length = (a: Vec2): number => Math.hypot(a.x, a.y);
const copy = (a: Vec2): Vec2 => ({ x: a.x, y: a.y });

/** Capture after controller techniques have installed their actual joints,
 * immediately before the SAME World.step passed to observeTeamContactRules. */
export function captureTeamContactStart(sim: PlaySim): TeamContactIntervalStart {
  const byBody = new Map<Body, Agent>(sim.agents.map(a => [a.body, a]));
  const joints: JointStart[] = [];
  for (const joint of sim.world.joints) {
    if (joint.kind === 'grasp' && joint.broken) continue;
    const a = byBody.get(joint.a), b = byBody.get(joint.b);
    if (!a || !b || a === b) continue;
    joints.push({ joint, a, b, positionA: copy(a.pos), positionB: copy(b.pos), previousApplied: joint.firstApplied });
  }
  const ball = sim.ball.kind === 'loose' ? sim.ball : null;
  const loose = ball !== null && ball.flight.pos.z <= .05;
  return {
    t: sim.t, dt: sim.dt, worldTime: sim.world.time, possession: sim.possession,
    possessionChanges: sim.segments.reduce((n, s, i, ss) => n + Number(s.team !== (i ? ss[i - 1].team : 'O')), 0),
    possessionSpotX: sim.segments.at(-1)?.startX ?? sim.los,
    runner: sim.carrier, runnerPosition: sim.carrier ? copy(sim.carrier.pos) : null,
    runnerVelocity: sim.carrier ? copy(sim.carrier.vel) : null,
    looseBall: loose ? copy(ball.flight.pos) : null,
    // This is the executing personal-recovery technique, not an assignment or
    // a guess from distance. Its achieved motion is checked again below.
    personalRecoveryAttempts: new Set(loose ? sim.agents.filter(a => a.behavior.kind === 'scramble-ball'
      && dot(sim.intents[a.idx]?.vel ?? { x: 0, y: 0 }, minus(ball.flight.pos, a.pos)) > EPS) : []),
    joints,
  };
}

function fresh(sim: PlaySim, start: TeamContactIntervalStart, s: JointStart): boolean {
  const applied = s.joint.firstApplied;
  return sim.world.joints.includes(s.joint) && !!applied && applied !== s.previousApplied
    && applied.time >= start.worldTime - EPS && applied.time <= start.worldTime + start.dt + EPS
    && applied.intervalEnd <= start.worldTime + start.dt + EPS;
}

function normalOn(s: JointStart, recipient: Agent): Vec2 | null {
  const f = s.joint.normalForceOnB;
  if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y)) return null;
  return recipient === s.b ? f : recipient === s.a ? scale(f, -1) : null;
}

function totalOn(s: JointStart, recipient: Agent): Vec2 | null {
  const normal = normalOn(s, recipient), tangent = s.joint.tangentForceOnB;
  if (!normal || !tangent || !Number.isFinite(tangent.x) || !Number.isFinite(tangent.y)) return null;
  const sign = recipient === s.b ? 1 : -1;
  return { x: normal.x + tangent.x * sign, y: normal.y + tangent.y * sign };
}

function positions(s: JointStart, actor: Agent) {
  const first = s.joint.firstApplied!;
  return actor === s.a ? { actor: first.positionI, teammate: first.positionJ }
    : { actor: first.positionJ, teammate: first.positionI };
}

function ownedGrip(s: JointStart): Agent | null {
  const body = s.joint.kind === 'grasp' ? s.joint.a
    : s.joint.hold > 0 ? s.joint.holder ?? s.joint.a : null;
  return body === s.a.body ? s.a : body === s.b.body ? s.b : null;
}

function muscularActor(s: JointStart): Agent | null {
  const body = s.joint.kind === 'grasp' ? s.joint.a : s.joint.actor ?? s.joint.a;
  return body === s.a.body ? s.a : body === s.b.body ? s.b : null;
}

function teammateOf(s: JointStart, actor: Agent): Agent { return s.a === actor ? s.b : s.a; }

/** An acquired grasp is explicit physical coupling. A hand joint's unused
 * hold capacity is not: its tensile channel must actually be loaded. */
function acquiredGrip(s: JointStart, owner: Agent): boolean {
  if (s.joint.kind === 'grasp') return true;
  const teammate = teammateOf(s, owner), f = normalOn(s, teammate);
  const p = positions(s, owner);
  return !!f && dot(f, minus(p.actor, p.teammate)) > EPS;
}

interface BlockLoad { target: Agent; force: Vec2 }
function achievedBlock(sim: PlaySim, start: TeamContactIntervalStart, blocker: Agent,
  forceHelpingBlocker: Vec2): BlockLoad | null {
  if (blocker === start.runner || blocker.team !== start.possession) return null;
  for (const s of start.joints) {
    if (!fresh(sim, start, s) || s.a.team === s.b.team || muscularActor(s) !== blocker) continue;
    const target = teammateOf(s, blocker);
    if (target.team === start.possession || target === start.runner) continue;
    const force = totalOn(s, target);
    // Both paths are achieved in the same solver interval: force supplied to
    // the teammate supports his opposing-player block rather than obstructs it.
    if (force && length(force) > EPS && dot(forceHelpingBlocker, force) > EPS) return { target, force };
  }
  return null;
}

function aidsRecovery(start: TeamContactIntervalStart, recipient: Agent, force: Vec2, s: JointStart): boolean {
  if (!start.looseBall || !start.personalRecoveryAttempts.has(recipient)) return false;
  const original = recipient === s.a ? s.positionA : s.positionB;
  const towardBall = minus(start.looseBall, original);
  const travel = minus(recipient.pos, original);
  return dot(force, towardBall) > EPS && dot(travel, towardBall) > EPS;
}

function memory(sim: PlaySim): ActMemory {
  let m = memories.get(sim);
  if (!m) { m = { next: 0, ids: new WeakMap(), unresolved: new Set() }; memories.set(sim, m); }
  return m;
}

function record(sim: PlaySim, start: TeamContactIntervalStart, source: JointStart,
  actor: Agent, teammate: Agent, kind: PenaltyCall['kind'], clause: 'a' | 'b' | 'c',
  force: Vec2, target?: Agent, extra: Record<string, string | number | boolean | null> = {}): void {
  const state = memory(sim);
  let id = state.ids.get(source.joint);
  if (!id) { id = `team-contact:${actor.idx}:${teammate.idx}:${state.next++}`; state.ids.set(source.joint, id); }
  const rule = `12-1-4(${clause})`;
  const at = positions(source, actor);
  sim.recordFoul({ id: `${id}:${kind}:${start.possessionChanges}`, kind, against: actor.team, playerId: actor.player.id,
    yards: 10, autoFirst: false, spotX: at.actor.x, t: start.t + start.dt,
    phase: 'live', playPhase: start.runner ? 'run' : start.looseBall ? 'loose_ball' : undefined,
    possessionTeam: start.possession, possessionChanges: start.possessionChanges,
    possessionSpotX: start.possessionSpotX, rule,
    reason: clause === 'a' ? 'achieved owned grip pulls the actual runner'
      : clause === 'b' ? 'achieved teammate grip couples force into a simultaneous opponent block'
        : 'achieved teammate shove assists an actual block or personal loose-ball recovery' },
  { source: 'native', rule, action: clause === 'a' ? 'achieved_runner_pull'
    : clause === 'b' ? 'achieved_interlocking_block' : 'achieved_teammate_assistance',
    victimId: teammate.player.id, facts: { forceX: force.x, forceY: force.y,
      impulseX: force.x * start.dt, impulseY: force.y * start.dt,
      sourceKind: source.joint.kind, targetId: target?.player.id ?? null,
      runnerAtIntervalStart: start.runner === teammate,
      runnerStartX: start.runnerPosition?.x ?? null, runnerStartY: start.runnerPosition?.y ?? null,
      runnerStartVx: start.runnerVelocity?.x ?? null, runnerStartVy: start.runnerVelocity?.y ?? null,
      ...extra } });
}

/** Observe only the interval captured above. No simulated referee roll and no
 * solver changes. Existing contact-legality deliberately excludes same-team
 * sources, so this owns the three teammate-specific Rule12-1-4 clauses. */
export function observeTeamContactRules(sim: PlaySim, report: StepReport, start: TeamContactIntervalStart): void {
  if (!(start.dt > 0) || Math.abs(sim.world.time - start.worldTime - start.dt) > EPS) return;
  for (const s of start.joints) {
    if (s.a.team !== s.b.team || s.a.team !== start.possession || !fresh(sim, start, s)) continue;
    const gripOwner = ownedGrip(s);
    if (gripOwner) {
      const teammate = teammateOf(s, gripOwner), normal = normalOn(s, teammate), total = totalOn(s, teammate);
      const p = positions(s, gripOwner);
      // Signed WORLD force plus actual loaded geometry separates pulling from
      // pushing, including a runner moving backward or sideways.
      if (normal && teammate === start.runner && dot(normal, minus(p.actor, p.teammate)) > EPS) {
        record(sim, start, s, gripOwner, teammate, 'assisting_runner', 'a', normal);
        continue;
      }
      if (total && acquiredGrip(s, gripOwner)) {
        const teammateBlock = achievedBlock(sim, start, teammate, total);
        // The same grip can use a teammate as an anchor for the HOLDER'S
        // block. Newton's opposite force on the holder is equally real aid.
        const holderBlock = teammateBlock ? null : achievedBlock(sim, start, gripOwner, scale(total, -1));
        const block = teammateBlock ?? holderBlock;
        if (block) {
          record(sim, start, s, gripOwner, teammate, 'interlocking_interference', 'b', total, block.target,
            { blockForceX: block.force.x, blockForceY: block.force.y,
              assistedBlockerId: teammateBlock ? teammate.player.id : gripOwner.player.id });
          continue;
        }
      }
    }
    const actor = muscularActor(s);
    if (!actor) continue;
    const teammate = teammateOf(s, actor), normal = normalOn(s, teammate);
    // A compressive hand/brace load can execute a shove. A torso collision or
    // steering-only row cannot establish deliberate teammate assistance.
    if (!normal || teammate === start.runner) continue;
    const p = positions(s, actor);
    if (dot(normal, minus(p.teammate, p.actor)) <= EPS) continue;
    const block = achievedBlock(sim, start, teammate, normal);
    const recovery = aidsRecovery(start, teammate, normal, s);
    if (block || recovery) record(sim, start, s, actor, teammate, 'illegal_teammate_assistance', 'c', normal,
      block?.target, { personalLooseBallRecovery: recovery, blockForceX: block?.force.x ?? null, blockForceY: block?.force.y ?? null });
  }
  // Generic body collisions have no intentional teammate-shove/encircling
  // action receipt. Retain the factual gap when such contact coincides with a
  // block; never turn ordinary line congestion into an invented foul.
  for (const c of report.contacts) {
    const a = sim.agents[c.i], b = sim.agents[c.j];
    if (!a || !b || a.team !== b.team || a.team !== start.possession || !(c.impulse > EPS) || !c.first) continue;
    const key = `${Math.min(c.i, c.j)}:${Math.max(c.i, c.j)}`;
    const state = memory(sim);
    if (state.unresolved.has(key)) continue;
    const candidates = [a, b].filter(t => t !== start.runner);
    if (!candidates.some(t => start.personalRecoveryAttempts.has(t) || start.joints.some(s => fresh(sim, start, s)
      && muscularActor(s) === t && s.a.team !== s.b.team
      && length(totalOn(s, teammateOf(s, t)) ?? { x: 0, y: 0 }) > EPS))) continue;
    state.unresolved.add(key);
    const limitation = '12-1-4(c): torso collision alone does not establish deliberately pushing/throwing a teammate to aid a block or loose-ball recovery; no such technique receipt is represented';
    sim.ruleLimitations.add(limitation);
    sim.foulRecords.push({ id: `team-contact-unresolved:${key}`, t: start.t + start.dt,
      kind: 'illegal_teammate_assistance', playerId: a.player.id, called: false, assessment: 'unresolved',
      evidence: { source: 'native', rule: '12-1-4(c)', action: 'unclassified_teammate_body_contact',
        victimId: b.player.id, facts: { impulse: c.impulse, missingFact: 'deliberate teammate-aiding push/throw action' } } });
  }
}
