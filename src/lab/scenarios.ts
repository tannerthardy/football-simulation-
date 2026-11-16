/**
 * Readiness scenario pack: the owner's six physical football interactions on
 * the shared physics (world contacts, hand and grasp joints, body-owned
 * support), each with the real technique code driving it.
 *
 *   redirect   a tackle rides a speed rusher past the quarterback
 *   squeeze    an end attacks a tight end's down block and closes the gap
 *   release    a receiver gets off (or is knocked off course by) a press jam
 *   seal       a guard seals a linebacker from the ball's lane
 *   approach   a safety tackles a runner from front, side or behind
 *   sideways   a back is hit from the side: stays up or goes down
 *
 * Every scenario can be mirrored across the field (side −1), run with a fixed
 * physics substep count, and reports physical invariants alongside its
 * football outcome: momentum explained by ground impulse, deepest overlap,
 * finite states and falls. Development and certification tooling; not used
 * by the engine.
 */
import { CENTER_Y, FIELD_WIDTH } from '../core/field.js';
import { Rng } from '../core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../playbook/defense.js';
import { FORMATION_BY_ID } from '../playbook/formations.js';
import type { MoveCommand } from '../physics/kinematics.js';
import type { Agent } from '../sim/agent.js';
import { chase } from '../sim/behaviors/common.js';
import { RouteRunner } from '../sim/behaviors/receiver.js';
import { createEngagement } from '../sim/engagement.js';
import { PassProtector, ProtectionCoordinator } from '../sim/behaviors/blocking.js';
import { PlaySim } from '../sim/playsim.js';

export interface LabOptions {
  /** Roster seed. */
  seed?: number;
  /** Mirror the scenario across the field's long axis. */
  side?: 1 | -1;
  /** Fixed physics substeps (adaptive when unset). */
  substeps?: number;
  /** Explicit experimental support coordinate; no production default change. */
  supportModel?: 'legacy' | 'virtual-foot';
  constraintWork?: 'per-update' | 'per-solve';
  impactTiming?: 'speculative' | 'local-sweep';
  supportIntegration?: 'mean' | 'integrated';
  handContact?: 'center' | 'patch';
}

/** Physical bookkeeping over a scenario. */
export interface Invariants {
  /** Largest |Δp − Σ ground impulse| of the participants over one tick, kg·yd/s. */
  momentumError: number;
  /** Deepest torso overlap the world reported, yd. */
  maxPenetration: number;
  /** Every position and velocity stayed finite. */
  finite: boolean;
  /** Falls by participant slot. */
  falls: string[];
}

const idle = { kind: 'idle', update: (): MoveCommand => ({ vel: { x: 0, y: 0 } }) };

function lab(o: LabOptions, run: boolean) {
  const side = o.side ?? 1;
  const rng = new Rng(o.seed ?? 7);
  const off = generateTeam(rng, 'O', 'OFF', { strength: 0.55 });
  const def = generateTeam(rng, 'D', 'DEF', { strength: 0.55 });
  const sim = new PlaySim({ offense: pickOffense(off, '11'), defense: pickDefense(def, 'base43'),
    // Mirror the installed formation and derived run-fit shoulders as well as
    // the bodies placed below. A physical mirror cannot keep an unmirrored job.
    offCall: run ? { formation: FORMATION_BY_ID.ace_11, flip: side < 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'lab' }
      : { formation: FORMATION_BY_ID.gun_doubles_11, flip: side < 0, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: rng.nextU32(), supportModel: o.supportModel, constraintWork: o.constraintWork, impactTiming: o.impactTiming, supportIntegration: o.supportIntegration, handContact: o.handContact });
  if (o.substeps) sim.world.substeps = o.substeps;
  const park = (keep: Agent[]) => {
    for (const a of sim.agents) {
      if (keep.includes(a)) continue;
      a.body.pos = { x: 5 + a.idx * 0.1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99;
      a.behavior = idle as never;
    }
  };
  /** Place a body at `dy` from the field centre on this side, moving (vx, vdy). */
  const place = (a: Agent, x: number, dy: number, vx = 0, vdy = 0, facing = 0) => {
    a.body.pos = { x, y: CENTER_Y + side * dy };
    a.body.vel = { x: vx, y: side * vdy };
    a.body.facing = side > 0 ? facing : -facing;
    a.downUntil = -1;
  };
  const observe = () => { for (let i = 0; i < 24; i++) sim.recordPerception(); };
  return { sim, side, park, place, observe };
}

/** Tick a scenario, checking momentum, overlap and finiteness every tick. */
function runTicks(sim: PlaySim, who: Agent[], until: (t: number) => boolean, maxT: number, afterStep?: () => void): Invariants {
  const inv: Invariants = { momentumError: 0, maxPenetration: 0, finite: true, falls: [] };
  const t0 = sim.t;
  while (sim.phase === 'live' && sim.t < t0 + maxT && !until(sim.t - t0)) {
    const px = who.reduce((s, a) => s + a.profile.massKg * a.vel.x, 0), py = who.reduce((s, a) => s + a.profile.massKg * a.vel.y, 0);
    const before = sim.lastStep;
    sim.tick();
    const r = sim.lastStep;
    // A whistle before the step: nothing moved this tick.
    if (!r || r === before) continue;
    afterStep?.();
    const gx = who.reduce((s, a) => s + r.groundImpulse[a.idx].x, 0), gy = who.reduce((s, a) => s + r.groundImpulse[a.idx].y, 0);
    const qx = who.reduce((s, a) => s + a.profile.massKg * a.vel.x, 0), qy = who.reduce((s, a) => s + a.profile.massKg * a.vel.y, 0);
    inv.momentumError = Math.max(inv.momentumError, Math.hypot(qx - px - gx, qy - py - gy));
    inv.maxPenetration = Math.max(inv.maxPenetration, r.maxPenetration);
    for (const i of r.falls) if (who.some((a) => a.idx === i)) inv.falls.push(sim.agents[i].slot);
    for (const a of who) if (![a.pos.x, a.pos.y, a.vel.x, a.vel.y].every(Number.isFinite)) inv.finite = false;
  }
  return inv;
}

// ---------------------------------------------------------------- approach

export interface ApproachResult extends Invariants {
  tackled: boolean;
  /** Seconds from the start until the whistle (or the time limit). */
  time: number;
  /** Carrier's gain from first contact to where he was ruled down, yd. */
  afterContact: number;
  wraps: number;
  broken: number;
  missed: number;
  endX: number;
  endDy: number;
}

/**
 * A safety approaches a runner. `bearing` is where the tackler starts relative
 * to the runner's heading (0 in front, 90 to his left on side +1, 180 behind),
 * `gap` yards away, closing at `close` yd/s. The runner holds a straight line
 * at `speed` (an evasive runner is a football behavior, not a physics probe).
 */
export function approachTackle(o: LabOptions & { bearing: number; speed: number; gap?: number; close?: number; maxT?: number }): ApproachResult {
  const { sim, park, place, observe, side } = lab(o, false);
  const c = sim.slot('Z')!, d = sim.slot('FS')!;
  park([c, d]);
  const b = (o.bearing * Math.PI) / 180, gap = o.gap ?? 6;
  place(c, 50, 0, o.speed, 0, 0);
  const dx = Math.cos(b) * gap, dy = Math.sin(b) * gap;
  const close = o.close ?? 3;
  place(d, 50 + dx, dy, (-dx / gap) * close, (-dy / gap) * close, Math.atan2(-dy, -dx));
  sim.t = 2; sim.catchAt = 1.9;
  sim.ball = { kind: 'held', carrier: c };
  sim.segments.push({ team: 'O', carrier: c.player.id, how: 'catch', startX: c.pos.x, endX: c.pos.x, end: 'live' });
  c.behavior = { kind: 'carrier', update: () => ({ vel: { x: o.speed, y: 0 }, facing: 0, push: 1 }) as MoveCommand } as never;
  d.behavior = { kind: 'pursuit', update: (a: Agent, s: PlaySim) => chase(s, a, c) } as never;
  observe();
  const inv = runTicks(sim, [c, d], () => false, o.maxT ?? 4);
  const ev = sim.events;
  const contact = ev.find((e) => e.type === 'carrier_contact');
  const endX = sim.endSpot?.x ?? c.pos.x;
  return { ...inv, tackled: sim.outcome === 'tackle', time: sim.t - 2, afterContact: contact?.pos ? endX - contact.pos.x : 0,
    wraps: ev.filter((e) => e.type === 'tackle_wrap').length, broken: ev.filter((e) => e.type === 'broken_tackle').length,
    missed: ev.filter((e) => e.type === 'missed_tackle').length, endX, endDy: side * ((sim.endSpot?.y ?? c.pos.y) - CENTER_Y) };
}

// ---------------------------------------------------------------- sideways

export interface SidewaysResult extends Invariants {
  fell: boolean;
  /** Largest fraction of the fall threshold his deviation reached. */
  peak: number;
  /** Seconds until his capture point was back over his feet (Infinity if never). */
  recovered: number;
  /** Lateral displacement over the scenario, toward the hitter's push (+). */
  pushed: number;
  /** His forward speed half a second after the hit. */
  speedAfter: number;
  /** Seconds from going down to being up again (NaN if he stayed up). */
  timeDown: number;
}

/** A back running at 6 yd/s is hit on the hip by a linebacker running across
 * him at `hitter` yd/s; the linebacker does not wrap. */
export function sidewaysHit(o: LabOptions & { hitter: number; posture?: number }): SidewaysResult {
  const { sim, park, place, observe, side } = lab(o, false);
  const c = sim.slot('Z')!, h = sim.slot('LB_M') ?? sim.slot('LB_W')!;
  park([c, h]);
  place(c, 50, 0, 6, 0, 0);
  // He comes in square from the side, level with the back and already at
  // speed: the contact is across the back's path, not in front of it.
  place(h, 50, 0.3 * o.hitter + 0.9 * (c.profile.radius + h.profile.radius), 6, -o.hitter, -Math.PI / 2);
  h.nextTackleAt = 99;
  sim.t = 2; sim.catchAt = 1.9;
  c.behavior = { kind: 'carrier', update: () => ({ vel: { x: 6, y: 0 }, facing: 0, posture: o.posture ?? 0.3 }) as MoveCommand } as never;
  // A shoulder through him, no wrap and no follow-through: once he has hit,
  // the linebacker pulls up.
  let struck = false;
  h.behavior = { kind: 'hit', update: () => {
    if (!struck && Math.hypot(c.pos.x - h.pos.x, c.pos.y - h.pos.y) < 1.02 * (c.profile.radius + h.profile.radius)) struck = true;
    return (struck ? { vel: { x: 6, y: 0 } } : { vel: { x: 6, y: -side * o.hitter }, facing: -side * Math.PI / 2, posture: 0.5 }) as MoveCommand;
  } } as never;
  observe();
  const y0 = c.pos.y;
  let hitAt = -1, recovered = Infinity, speedAfter = NaN, downAt = -1, upAt = -1;
  const inv = runTicks(sim, [c, h], (t) => {
    const s = c.body.support!;
    if (hitAt < 0 && Math.hypot(c.pos.x - h.pos.x, c.pos.y - h.pos.y) < 0.95 * (c.profile.radius + h.profile.radius)) hitAt = t;
    if (hitAt >= 0 && t - hitAt >= 0.5 && Number.isNaN(speedAfter)) speedAfter = c.vel.x;
    if (hitAt >= 0 && t > hitAt + 0.1 && recovered === Infinity && s.state === 'up' && s.out === 0) recovered = t - hitAt;
    if (s.state !== 'up' && downAt < 0) downAt = t;
    if (downAt >= 0 && upAt < 0 && s.state === 'up') upAt = t;
    // Done once he is up and balanced again after a fall, or a while after a hit he absorbed.
    return (upAt >= 0) || (hitAt >= 0 && downAt < 0 && t > hitAt + 1.5);
  }, 6);
  // A fall that has not finished getting up keeps him off his feet.
  return { ...inv, fell: downAt >= 0, peak: c.body.support!.peak, recovered: downAt >= 0 ? Infinity : recovered,
    pushed: -side * (c.pos.y - y0), speedAfter, timeDown: downAt >= 0 && upAt >= 0 ? upAt - downAt : NaN };
}

// ---------------------------------------------------------------- redirect

export interface RedirectResult extends Invariants {
  /** Closest the rusher got to the quarterback's spot within the window, yd. */
  closest: number;
  /** How far past the quarterback's depth the rusher was carried, yd (+ deeper). */
  carriedPast: number;
  /** The rep ended with the rusher around the corner. */
  cornerTurned: boolean;
  /** Largest hand forces the joint carried, kg·yd/s². */
  peakNormal: number;
  peakTangent: number;
  /** Installed home and actual free-protection requests after the original shed. */
  protectionHomeY: number;
  /** Detached attained positions are ordered RT, DE_S, QB. */
  postShedProtection: Array<{ t: number; target: string | null; request: MoveCommand;
    positions: Array<{ x: number; y: number }> }>;
}

/** A tackle in his set takes on a speed rusher already in his hands outside him. */
export function redirect(o: LabOptions & { rusherPower?: number; maxT?: number }): RedirectResult {
  const { sim, park, place, observe, side } = lab(o, false);
  const b = sim.slot('RT')!, d = sim.slot('DE_S')!, qb = sim.qb;
  park([b, d, qb]);
  place(qb, 33, 0, 0, 0, 0);
  qb.behavior = { kind: 'qb-hold', update: () => ({ vel: { x: 0, y: 0 }, facing: 0 }) } as never;
  place(b, 37.8, -3.0, -1.5, 0, 0);
  place(d, 37.8 + 0.25, -3.0 - (b.profile.radius + d.profile.radius + 0.15), -3, 0, Math.PI);
  // Formation flips do not swap the named OL slots. This synthetic mirror
  // moves the same RT, so install his reflected home as well as his body.
  // The original right-side home and production assignment law are retained.
  const protection = new ProtectionCoordinator();
  protection.add(b);
  const home = sim.offAlign.spots[b.slot].pos.y;
  const protectionHomeY = CENTER_Y + side * (home - CENTER_Y);
  protection.homeY.set(b, protectionHomeY);
  const protector = new PassProtector(protection);
  b.behavior = protector;
  if (o.rusherPower) d.profile.power *= o.rusherPower;
  sim.t = 0.8;
  observe();
  const e = createEngagement(sim, b, d, 'pass', null);
  if (!e) throw new Error('redirect: no engagement formed');
  e.move = 'speed'; e.nextMoveAt = Infinity;
  const postShedProtection: RedirectResult['postShedProtection'] = [];
  const update = protector.update;
  protector.update = function (actor, world) {
    const request = update.call(this, actor, world);
    if (!actor.engagement && world.events.some(event => event.type === 'shed'
      && event.a === d.idx && event.b === b.idx && event.note === 'pass: turned the corner')) {
      const target = this.recordedTarget(actor);
      postShedProtection.push({ t: world.t, target: target === null ? null : world.agents[target].slot,
        request: structuredClone(request), positions: [b, d, qb].map(a => ({ ...a.pos })) });
    }
    return request;
  };
  let closest = Infinity, carriedPast = -Infinity, peakN = 0, peakT = 0;
  const inv = runTicks(sim, [b, d, qb], () => {
    closest = Math.min(closest, Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y));
    carriedPast = Math.max(carriedPast, qb.pos.x - d.pos.x);
    if (e.hands) { peakN = Math.max(peakN, Math.abs(e.hands.normalForce ?? 0)); peakT = Math.max(peakT, Math.abs(e.hands.tangentForce ?? 0)); }
    return !sim.engagements.includes(e) && Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) > 6;
  }, o.maxT ?? 2.5);
  const shed = sim.events.some((x) => x.type === 'shed' && x.note === 'pass: turned the corner');
  return { ...inv, closest, carriedPast, cornerTurned: shed, peakNormal: peakN, peakTangent: peakT,
    protectionHomeY, postShedProtection };
}

// ---------------------------------------------------------------- seal

export interface SealResult extends Invariants {
  /** Seconds the linebacker stayed on the far side of the blocker from the lane. */
  sealedFor: number;
  /** His progress across toward the lane, yd. */
  progress: number;
  ended: string;
}

/** A guard climbs onto a linebacker who is flowing toward a back's lane on
 * the far side of him, and turns his drive to seal. */
export function seal(o: LabOptions & { flow?: number; maxT?: number }): SealResult {
  const { sim, park, place, observe, side } = lab(o, true);
  const b = sim.slot('LG')!, d = sim.slot('LB_M') ?? sim.slot('LB_W')!, rb = sim.slot('RB')!;
  park([b, d, rb]);
  // The back aims at a lane 3 yd to the blocker's right (side +1: lower y).
  place(rb, 37.5, -3.0, 0, 0, 0);
  rb.behavior = { kind: 'carrier', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  sim.ball = { kind: 'held', carrier: rb };
  place(b, 43.5, 0.2, 1.5, -0.5, 0);
  place(d, 43.5 + b.profile.radius + d.profile.radius + 0.1, 0, -0.5, -(o.flow ?? 2.5), Math.PI);
  sim.t = 1.4;
  observe();
  const drive = { x: 0.55, y: -side * 0.835 };
  const e = createEngagement(sim, b, d, 'run', drive);
  if (!e) throw new Error('seal: no engagement formed');
  // Sealed while the blocker stays between the linebacker and the lane.
  const across = () => side * (b.pos.y - d.pos.y);
  const y0 = d.pos.y;
  let sealedFor = 0;
  const inv = runTicks(sim, [b, d, rb], (t) => {
    if (across() > -0.2 && sim.engagements.includes(e)) sealedFor = t;
    return !sim.engagements.includes(e);
  }, o.maxT ?? 2.0);
  const ended = [...sim.events].reverse().find((x) => x.type === 'shed')?.note ?? (sim.engagements.includes(e) ? 'held' : 'released');
  return { ...inv, sealedFor, progress: -side * (d.pos.y - y0), ended };
}

// ---------------------------------------------------------------- squeeze

export interface SqueezeResult extends Invariants {
  /** End's movement toward the inside gap, yd (+ squeezes it). */
  inside: number;
  /** How far the end was driven off the line, yd (+ driven back). */
  drivenBack: number;
  ended: string;
}

/** A tight end blocks down on the end inside him; the ball is going inside. */
export function squeeze(o: LabOptions & { endPower?: number; maxT?: number }): SqueezeResult {
  const { sim, park, place, observe, side } = lab(o, true);
  const b = sim.slot('Y')!, d = sim.slot('DE_S')!, rb = sim.slot('RB')!;
  park([b, d, rb]);
  // The play hits inside the end (toward the centre on side +1: higher y).
  place(rb, 36.5, 1.0, 0, 0, 0);
  rb.behavior = { kind: 'carrier', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  sim.ball = { kind: 'held', carrier: rb };
  place(d, 40.9, -4.0, -1.0, 0, Math.PI);
  place(b, 40.9 - 0.3, -4.0 - (b.profile.radius + d.profile.radius + 0.1), 1.0, 1.0, Math.PI / 4);
  if (o.endPower) d.profile.power *= o.endPower;
  sim.t = 0.5;
  observe();
  const drive = { x: 0.45, y: side * 0.89 };
  const e = createEngagement(sim, b, d, 'run', drive);
  if (!e) throw new Error('squeeze: no engagement formed');
  const x0 = d.pos.x, y0 = d.pos.y;
  const inv = runTicks(sim, [b, d, rb], () => !sim.engagements.includes(e), o.maxT ?? 1.5);
  const ended = [...sim.events].reverse().find((x) => x.type === 'shed')?.note ?? (sim.engagements.includes(e) ? 'held' : 'released');
  return { ...inv, inside: side * (d.pos.y - y0), drivenBack: d.pos.x - x0, ended };
}

// ---------------------------------------------------------------- release

export interface ReleaseResult extends Invariants {
  /** The corner's jam transmitted measured force through a hand joint. */
  jammed: boolean;
  /** Receiver's depth past the line at 1.2 s, yd. */
  depth: number;
  /** Receiver's lateral displacement from his alignment at 1.2 s (+ outside), yd. */
  rerouted: number;
  /** Duration of physics ticks carrying a nonzero hand load, seconds. */
  loadedTime: number;
  /** Largest 20 Hz mean hand force magnitude, kg·yd/s² (not an instantaneous peak). */
  peakHandForce: number;
  /** Time integral of the mean hand force magnitude, kg·yd/s. */
  handImpulse: number;
}

/** A pressed outside receiver runs a vertical against a corner a yard off,
 * shading his inside shoulder; the corner punches as the receiver releases. */
export function release(o: LabOptions & { press?: boolean }): ReleaseResult {
  const { sim, park, observe, side } = lab(o, false);
  const r = sim.slot('X')!;
  const cb = (['CB_W', 'CB_S'] as const).find((s) => sim.slot(s))!;
  const d = sim.slot(cb)!;
  park([r, d]);
  // Rebuild the receiver's route in the mirrored receiver frame, rather
  // than reflecting his position while retaining an unreflected waypoint.
  if (side < 0) {
    const runner = r.behavior as RouteRunner;
    r.body.pos.y = FIELD_WIDTH - r.pos.y;
    r.body.vel.y = -r.vel.y;
    r.body.facing = -r.facing;
    r.behavior = new RouteRunner(r, sim, runner.route, Math.sign(r.pos.y - CENTER_Y) || -1);
  }
  const out = Math.sign(r.pos.y - CENTER_Y) || 1;
  d.body.pos = { x: sim.los + 0.9, y: r.pos.y - out * 0.4 };
  d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI; d.downUntil = -1;
  const spot = sim.defAlign.spots[cb]!;
  spot.press = o.press ?? true; spot.manTarget = 'X';
  // The corner holds his ground square to the receiver until the jam.
  d.behavior = { kind: 'press', update: (a: Agent) => ({ vel: { x: 0, y: 0 }, facing: Math.atan2(r.pos.y - a.pos.y, r.pos.x - a.pos.x) }) as MoveCommand } as never;
  const y0 = r.pos.y;
  observe();
  let loadedTime = 0, peakHandForce = 0, handImpulse = 0;
  const inv = runTicks(sim, [r, d], (t) => t >= 1.2, 1.2, () => {
    const hands = sim.world.joints.find((j) => j.kind === 'hands' && j.a === d.body && j.b === r.body);
    if (!hands || hands.kind !== 'hands') return;
    const force = Math.hypot(hands.normalForce ?? 0, hands.tangentForce ?? 0);
    if (force > 1e-6) loadedTime += sim.dt;
    peakHandForce = Math.max(peakHandForce, force);
    handImpulse += force * sim.dt;
  });
  return { ...inv, jammed: sim.events.some((x) => x.type === 'jam'), depth: r.pos.x - sim.los, rerouted: out * (r.pos.y - y0),
    loadedTime, peakHandForce, handImpulse };
}
