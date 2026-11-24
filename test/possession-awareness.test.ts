/** Minimal acquired-information controls. Native transfer is checked separately;
 * these scenes freeze the information boundary without granting live vision. */
import { describe, expect, it, vi } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { onBallCaught } from '../src/sim/assign.js';
import { Blitzer, ManCoverage, PassRusher, playBall, Pursuit, pursueIfLive, RunDefender, runFit, ZoneCoverage } from '../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import { observedHolder, acquireFlight, anticipatedCatcher, rememberedFlight, unresolvedBallArea } from '../src/sim/possession-read.js';
import { movementObjective } from '../src/sim/movement-objective.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { ROUTES } from '../src/playbook/routes.js';
import { World } from '../src/physics/world.js';
import { handoffReach } from '../src/sim/ball-transfer.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

const input = { coverage: 'cover3_buzz', concept: 'curl_flat', seed: 1, roster: 7, formation: 'gun_doubles_11', flip: false };
function stage(role = 'zone', side = 1) {
  const sim = new PlaySim({ ...nativeTraceSetup(input), record: true, recordLevel: 'full' });
  const a = sim.slot('SS')!, x = sim.slot('X')!, z = sim.slot('Z')!;
  sim.t = sim.world.time = 2;
  a.body.pos = { x: 48, y: 26 }; a.body.vel = { x: 2, y: side * 1 }; a.body.facing = 0;
  a.readAt = 0; a.recog!.read = 'pass';
  a.runFit = { gap: 'B', side, kind: 'insert', technique: 'attack', edge: 'box', pace: 'stack' };
  for (const b of sim.agents) if (b !== a) { b.body.pos = { x: 30, y: b.idx * 2 }; b.body.vel = { x: 0, y: 0 }; }
  x.body.pos = { x: 54, y: 26 + side * 6 }; x.body.vel = { x: 4, y: 0 };
  z.body.pos = { x: 52, y: 26 - side * 6 };
  const pictures = new Map(sim.agents.map(b => [b, { pos: { ...b.pos }, vel: { ...b.vel }, facing: b.facing,
    stance: null, pose: 'up', carrying: false, age: .2 } as Perceived]));
  const see = vi.spyOn(sim, 'see').mockImplementation((_observer, target) => structuredClone(pictures.get(target)!));
  a.behavior = role === 'man' ? new ManCoverage(a, sim, z, false, 'B', side)
    : role === 'pursuit' ? new Pursuit()
    : role === 'rush' ? new PassRusher(a, sim, 'B', side)
    : role === 'blitz' ? new Blitzer(a, sim, 'B', side)
    : role === 'fit' ? new RunDefender('B', side)
    : role === 'match' ? new CoverageDefender(a, sim, 'c3_hook', 'hook_s', 'match', 'B', side)
    : new ZoneCoverage(a, sim, 'deep_mid', 'B', side);
  return { sim, a, x, z, pictures, see, update: () => a.behavior.update(a, sim) };
}

describe('possession identity comes from the observer, not the ball holder', () => {
  it('does not notify any defender controller at a catch', () => {
    const f = stage(), controllers = f.sim.defense.map(d => d.behavior);
    f.sim.ball = { kind: 'held', carrier: f.x };
    onBallCaught(f.sim, f.x);
    expect(f.sim.defense.map(d => d.behavior)).toEqual(controllers);
    expect(f.x.behavior.kind).toBe('carrier');
    expect(f.sim.offense.filter(o => o !== f.x).every(o => o.behavior.kind === 'downfield-block')).toBe(true);
  });

  it.each(['man', 'zone', 'match', 'rush', 'blitz', 'fit', 'pursuit'])('%s keeps the complete request when only hidden holder identity changes', role => {
    const one = stage(role), two = stage(role);
    one.pictures.get(one.x)!.carrying = two.pictures.get(two.x)!.carrying = true;
    one.sim.ball = { kind: 'held', carrier: one.z };
    two.sim.ball = { kind: 'held', carrier: two.sim.qb };
    const before = structuredClone(two.a.body);
    expect(two.update()).toEqual(one.update());
    expect(two.a.body).toEqual(before);
    expect(two.sim.rng).toEqual(one.sim.rng);
    expect(observedHolder(two.a, two.sim)?.target).toBe(two.x);
  });

  it.each([false, null, undefined])('does not turn carrying=%s into knowledge of the hidden holder', carrying => {
    const f = stage(); f.sim.ball = { kind: 'held', carrier: f.x };
    f.pictures.get(f.x)!.carrying = carrying;
    expect(observedHolder(f.a, f.sim)).toBeNull();
    expect(pursueIfLive(f.sim, f.a)).toBeNull();
  });

  it('does not exempt an observed obstruction just because it is the hidden true holder', () => {
    const clear = stage('pursuit'), one = stage('pursuit'), two = stage('pursuit');
    clear.pictures.get(clear.x)!.carrying = true;
    const straight = clear.update(), speed = Math.hypot(straight.vel.x, straight.vel.y);
    for (const f of [one, two]) {
      f.pictures.get(f.x)!.carrying = true;
      f.z.body.pos = { x: f.a.pos.x + straight.vel.x / speed * 2, y: f.a.pos.y + straight.vel.y / speed * 2 };
      f.pictures.get(f.z)!.pos = { ...f.z.pos };
    }
    one.sim.ball = { kind: 'held', carrier: one.z };
    two.sim.ball = { kind: 'held', carrier: two.sim.qb };
    const around = one.update();
    expect(around).toEqual(two.update());
    expect(around.vel).not.toEqual(straight.vel);
    expect(movementObjective(around)).toEqual(movementObjective(straight));
  });

  it('uses the most recent positive sample; equally recent or unknown conflicting samples remain unresolved', () => {
    const f = stage();
    const x = f.pictures.get(f.x)!, z = f.pictures.get(f.z)!;
    x.carrying = z.carrying = true; x.age = .3; z.age = .2;
    expect(observedHolder(f.a, f.sim)?.target).toBe(f.z);
    x.age = .2; expect(observedHolder(f.a, f.sim)).toBeNull();
    x.age = undefined; expect(observedHolder(f.a, f.sim)).toBeNull();
    z.carrying = false; expect(observedHolder(f.a, f.sim)).toBeNull();
  });

  it.each([-1, 1])('keeps installed backfield support through a hidden fake exchange, side=%s', side => {
    const one = stage('fit', side), two = stage('fit', side);
    for (const f of [one, two]) {
      f.a.recog!.read = 'run';
      const qb = f.pictures.get(f.sim.qb)!, rb = f.pictures.get(f.sim.slot('RB')!)!;
      qb.pos = { x: 36, y: 26 }; qb.carrying = true;
      rb.pos = { x: 37, y: 26 + side }; rb.vel = { x: 2, y: side * 2 };
    }
    one.sim.ball = { kind: 'held', carrier: one.sim.qb };
    two.sim.ball = { kind: 'held', carrier: two.sim.slot('RB')! };
    two.sim.handoffAt = 1.5; two.sim.scrambled = true;
    expect(two.update()).toEqual(one.update());
    expect(two.a.runFit).toEqual(one.a.runFit);
    const back = one.sim.slot('RB')!;
    expect(runFit(one.a, one.sim, 'B', side)).toEqual(runFit(one.a, one.sim, 'B', side,
      { backfield: { back, backCue: one.pictures.get(back)!, qbCue: one.pictures.get(one.sim.qb)! } }));
  });

  it('retains the force boundary on an acquired handoff despite pass belief', () => {
    const f = stage(); f.a.runFit!.kind = 'force';
    const rb = f.sim.slot('RB')!, cue = f.pictures.get(rb)!;
    cue.carrying = true; cue.pos.x = f.sim.los + 1;
    expect(pursueIfLive(f.sim, f.a)).toBeNull();
    cue.pos.x = f.sim.los + 2.1;
    expect(pursueIfLive(f.sim, f.a)).not.toBeNull();
  });

  it('honors a newer acquired back instead of reviving an older QB-held mesh image', () => {
    const f = stage(); f.a.runFit!.kind = 'alley'; f.a.recog!.read = 'run';
    const rb = f.sim.slot('RB')!, back = f.pictures.get(rb)!, qb = f.pictures.get(f.sim.qb)!;
    back.carrying = qb.carrying = true;
    back.age = .1; qb.age = .3; back.pos = { x: f.sim.los - 1, y: 26 };
    expect(observedHolder(f.a, f.sim)?.target).toBe(rb);
    // The existing post-mesh alley approach follows the acquired runner here.
    // Reconstructing a raw backfield pair must not discard that interpretation.
    expect(movementObjective(runFit(f.a, f.sim, 'B', 1))?.point.x).toBe(back.pos.x);
  });

  it('keeps an installed fit in Empty when possession is unresolved; an empty QB is not a runner', () => {
    const sim = new PlaySim(nativeTraceSetup({ ...input, formation: 'gun_empty_11' }));
    const a = sim.slot('LB_M')!;
    sim.t = 2; a.recog!.read = 'run';
    expect(sim.offAlign.spots.RB.backfield).not.toBe(true);
    const pictures = new Map(sim.agents.map(b => [b, { pos: { ...b.pos }, vel: { ...b.vel }, facing: b.facing,
      stance: null, carrying: false, age: .2 } as Perceived]));
    // A known-empty QB beyond the line must not become the default target.
    pictures.get(sim.qb)!.pos.x = sim.los + 10;
    vi.spyOn(sim, 'see').mockImplementation((_a,b) => pictures.get(b)!);
    expect(observedHolder(a, sim)).toBeNull();
    expect(pursueIfLive(sim, a)).toBeNull();
    expect(runFit(a, sim, 'B', 1)).toEqual(runFit(a, sim, 'B', 1, null));
    // The existing no-carrier fit is toward the gap, behind this linebacker,
    // rather than toward the known-empty QB ten yards beyond the line.
    expect(runFit(a, sim, 'B', 1).vel.x).toBeLessThan(0);
  });

  it.each([-1, 1])('caps both visible threats when a still-empty back outruns the QB mesh, side=%s', side => {
    const f = stage('zone', side); f.a.runFit!.kind = 'alley'; f.a.recog!.read = 'run';
    const rb = f.sim.slot('RB')!, qb = f.pictures.get(f.sim.qb)!, back = f.pictures.get(rb)!;
    qb.carrying = true; qb.pos = { x: 35, y: 26 }; qb.vel = { x: 0, y: side * 2 };
    back.carrying = false; back.pos = { x: qb.pos.x + handoffReach(f.sim.qb, rb) + .2, y: 26 + side * 6 };
    back.vel = { x: 3, y: side * -2 };
    const before = structuredClone(f.a.runFit), c = runFit(f.a, f.sim, 'B', side);
    expect(movementObjective(c)?.point.y).toBeCloseTo(26 + side * 3 + side * 1.2 + f.a.mind.placementError, 10);
    const goal = movementObjective(c);
    expect(goal?.kind).toBe('moving');
    if (goal?.kind !== 'moving') throw new Error('Expected the installed moving cap');
    expect(goal.velocity?.y).toBe(0);
    expect(f.a.runFit).toEqual(before);
    expect(f.sim.trace.data!.decisions.some(d => d.kind === 'run-fit-mesh')).toBe(false);
    const rng = structuredClone(f.sim.rng), body = structuredClone(f.a.body);
    f.sim.ball = { kind: 'held', carrier: rb }; // change hidden reality, keep the acquired split fixed
    expect(runFit(f.a, f.sim, 'B', side)).toEqual(c);
    expect(f.a.body).toEqual(body);
    expect(f.sim.rng).toEqual(rng);
  });

  it('preserves ordinary expected flow without a dated QB-held/empty-back separation cue', () => {
    for (const control of ['within-reach', 'behind-QB', 'unknown-QB', 'unknown-back', 'undated', 'acquired-back']) {
      const f = stage(); f.a.runFit!.kind = 'alley'; f.a.recog!.read = 'run';
      const rb = f.sim.slot('RB')!, qb = f.pictures.get(f.sim.qb)!, back = f.pictures.get(rb)!;
      qb.carrying = true; qb.pos = { x: 35, y: 26 }; qb.vel = { x: 0, y: 1 };
      back.carrying = false; back.pos = { x: qb.pos.x + handoffReach(f.sim.qb, rb) + .2, y: 32 };
      back.vel = { x: 3, y: -2 };
      if (control === 'within-reach') back.pos.x = qb.pos.x + handoffReach(f.sim.qb, rb) / 2;
      if (control === 'behind-QB') back.pos.x = qb.pos.x - 2;
      if (control === 'unknown-QB') qb.carrying = null;
      if (control === 'unknown-back') back.carrying = null;
      if (control === 'undated') back.age = undefined;
      if (control === 'acquired-back') { qb.carrying = false; back.carrying = true; }
      const goal = movementObjective(runFit(f.a, f.sim, 'B', 1));
      expect(goal?.point.y).toBeCloseTo(back.pos.y + 1.2 + f.a.mind.placementError, 10);
      expect(f.sim.trace.data!.decisions.some(d => d.kind === 'run-fit-cap')).toBe(false);
    }
  });
});

describe('an acquired trajectory supports anticipation, not certified possession', () => {
  function flight() {
    const f = stage();
    f.sim.ball = { kind: 'air', flight: { pos: { x: 52, y: 29, z: 2 }, vel: { x: 8, y: 3, z: -1 }, drag: 0 },
      thrower: f.sim.qb, target: f.z, releaseT: 1, releaseX: 35,
      intended: { x: 54, y: 32, z: 1 }, arrivalT: 2.4, deflected: false, throwaway: false };
    f.sim.throwAt = 1; f.sim.throwSight.stageRelease(f.sim, f.sim.throwAt);
    f.sim.ballPath = [{ t: 2.2, x: 54, y: 32, z: 1.5 }, { t: 2.5, x: 56, y: 33, z: .1 }];
    f.a.tags.add('looking');
    return f;
  }

  it('continues its legitimate catch approach without a fresh delay, even if the actual catcher differs', () => {
    const one = flight(), two = flight();
    expect(playBall(one.a, one.sim, null)).toEqual(playBall(two.a, two.sim, null));
    expect(observedHolder(one.a, one.sim)).toBeNull();
    const command = playBall(one.a, one.sim, null);
    expect(Math.hypot(command.vel.x, command.vel.y)).toBeGreaterThan(1);
    for (const f of [one, two]) f.sim.t += .05;
    one.sim.ball = { kind: 'held', carrier: one.x };
    two.sim.ball = { kind: 'held', carrier: two.z };
    // Even the private current flight prediction can now change: the observer
    // must use its acquired copy, not reread authoritative prediction output.
    two.sim.ballPath[0].y = 2;
    expect(pursueIfLive(two.sim, two.a)).toEqual(pursueIfLive(one.sim, one.a));
    expect(movementObjective(pursueIfLive(one.sim, one.a)!)).toBeDefined();
    expect(observedHolder(one.a, one.sim)).toBeNull();
  });

  it('keeps an in-phase defender moving with the credible catcher on the next tick', () => {
    const expected = flight(), continued = flight();
    for (const f of [expected, continued]) {
      f.a.body.pos = { x: 53.5, y: 32.8 }; f.a.body.vel = { x: 4, y: 0 };
      f.a.body.facing = 0;
      playBall(f.a, f.sim, null);
      f.sim.t += .05;
    }
    continued.sim.ball = { kind: 'held', carrier: continued.z }; // not the plausible catcher
    const command = pursueIfLive(continued.sim, continued.a)!;
    expect(command).toEqual(playBall(expected.a, expected.sim, null));
    expect(command.vel.x).toBeGreaterThan(0);
    expect(observedHolder(continued.a, continued.sim)).toBeNull();
    const before = continued.a.pos.x;
    new World([continued.a.body]).step([command], .05);
    expect(continued.a.pos.x).toBeGreaterThan(before);
  });

  it('does not let an old held-body image undo a later acquired unheld flight', () => {
    const f = flight(); f.pictures.get(f.sim.qb)!.carrying = true;
    acquireFlight(f.a, f.sim);
    f.sim.t = 2.1;
    expect(observedHolder(f.a, f.sim)).toBeNull();
    const cue = f.pictures.get(f.x)!; cue.carrying = true; cue.age = .05;
    expect(observedHolder(f.a, f.sim)?.target).toBe(f.x);
  });

  it('pays for the plausible miss/bobble, then rallies to the last ball area without inventing a holder', () => {
    const f = flight(); playBall(f.a, f.sim, null);
    f.sim.ball = { kind: 'held', carrier: f.sim.qb }; // unseen identity is irrelevant to the estimate
    f.sim.t = 2.1;
    expect(pursueIfLive(f.sim, f.a)).not.toBeNull();
    expect(observedHolder(f.a, f.sim)).toBeNull();
    f.sim.t = 2.2;
    expect(anticipatedCatcher(f.a, f.sim)?.target).toBe(f.x);
    f.sim.t = 2.3; f.pictures.get(f.x)!.age = .05;
    if (process.env.HONEST_FLIGHT === '1') {
      // HONEST_FLIGHT: an empty picture taken inside the catch's securing beat (2.25 s, within 0.4 s of the 2.2 s
      // opportunity) is not evidence against it: a receiver securing the ball is not yet carrying it in any picture. The
      // hypothesis stands until the flight's own end (2.5 s), before any picture could refute it.
      expect(anticipatedCatcher(f.a, f.sim)?.target).toBe(f.x);
    } else {
      expect(anticipatedCatcher(f.a, f.sim)).toBeNull();
      f.pictures.get(f.x)!.carrying = null;
      expect(anticipatedCatcher(f.a, f.sim)).toBeNull(); // refuted hypothesis cannot revive with unknown
    }
    f.sim.t = 2.55;
    expect(rememberedFlight(f.a, f.sim.t)).toBeNull();
    expect(observedHolder(f.a, f.sim)).toBeNull();
    expect(unresolvedBallArea(f.a)).toEqual({ x: 56, y: 33 });
    const rally = pursueIfLive(f.sim, f.a)!;
    expect(rally).not.toBeNull();
    expect(rally.vel.x).toBeGreaterThan(0);
    expect(rally.vel.y).toBeGreaterThan(0);
  });

  it('responds on the first ordinary update with a newer acquired catch; no second recognition timer', () => {
    const f = flight(); playBall(f.a, f.sim, null);
    f.a.readAt = 10; // Initial run/pass recognition cannot delay a personally acquired catch again.
    f.sim.t = 2.1; f.sim.ball = { kind: 'held', carrier: f.z };
    f.pictures.get(f.x)!.carrying = true; f.pictures.get(f.x)!.age = .05;
    f.pictures.get(f.x)!.pos.x = f.sim.los - 1; // a legitimately acquired catch behind the line
    const c = pursueIfLive(f.sim, f.a)!;
    expect(c).not.toBeNull();
    expect(movementObjective(c)?.point.x).toBe(f.pictures.get(f.x)!.pos.x);
    expect(observedHolder(f.a, f.sim)?.target).toBe(f.x);
    f.pictures.get(f.x)!.carrying = null;
    expect(rememberedFlight(f.a, f.sim.t)).toBeNull();
    expect(pursueIfLive(f.sim, f.a)).toBeNull(); // acquired catch retired the older forecast
  });

  it('replaces the estimate on a newly recognized deflection and preserves it against unseen path changes', () => {
    const f = flight(); playBall(f.a, f.sim, null);
    f.sim.t += .05;
    const old = structuredClone(rememberedFlight(f.a, f.sim.t));
    f.sim.ballPath = [{ t: 2.3, x: 53, y: 22, z: 1.2 }, { t: 2.6, x: 54, y: 21, z: .1 }];
    playBall(f.a, f.sim, null); // existing recognition gate still controls this acquisition
    expect(rememberedFlight(f.a, f.sim.t)).toEqual(f.sim.ballPath);
    expect(rememberedFlight(f.a, f.sim.t)).not.toEqual(old);
    f.sim.ballPath[0].y = 40;
    expect(rememberedFlight(f.a, f.sim.t)![0].y).toBe(22);
  });

  it('keeps rallying instead of reopening route coverage after the native mirror forecast ends', () => {
    // Re-selected under the leg force-velocity law (PHY-1): the original
    // roster-7 flip now catches earlier with no rally phase. This native play
    // has the same sequence: flight continuation, rally, possession pursuit.
    // Start law (#336): roster 5 seed 7 now catches at 4.1 s with catch
    // anticipation, no rally. The file's own input (roster 7, seed 1) has the
    // sequence; its catch (y 4.3) lies to −y of the SS (y 12.2), so the rally is −y.
    // Re-staged for the direction-free start (#353): roster 7 seed 1 now
    // throws at 2.45 s (2.65 before) and falls incomplete at 4.25 s, so there
    // is no catch to rally to. Roster 3 seed 2 flipped has the same sequence
    // one second earlier: catch at 3.5 s, flight continuation at 3.55 s, rally
    // at 3.6-3.7 s, possession pursuit from 3.75 s. Its catch (y 37.9) lies to
    // +y of the SS (y 34.8), so the rally is +y. The behavior is the same.
    // With the edge kick that stops matching the rusher's retreat once deeper than its lead, roster 3 seed 2
    // flipped no longer completes. Roster 5 seed 10 (not flipped) has the sequence: catch at 3.4 s, flight
    // continuation 3.45-3.6 s, rally at 3.65 s, possession pursuit from 3.7 s. Its catch (y 10.7) lies to
    // -y of the SS (y 14.3), so the rally is -y.
    // The QB's throwing motion (load and delivery, ~0.4 s) moves roster 5 seed 10's release, and it falls
    // incomplete; roster 10 seed 18 flipped carried the sequence on that branch. The receiver route reads and
    // flat release (#420) re-pinned roster 5 seed 10 under the old flat install on develop. With both, neither
    // completes. Roster 7 seed 26 flipped has the sequence on current routes: catch at 3.4 s, flight
    // continuation 3.45 s, rally 3.6-3.65 s, possession pursuit from 3.7 s. Its catch (y 39.3) lies to +y of
    // the SS (y 33.7), so the rally is +y.
    const rallyInput = { ...input, seed: 26, roster: 7, flip: true };
    const sim = new PlaySim({ ...nativeTraceSetup(rallyInput), record: true, recordLevel: 'full' });
    const toBall = 1;
    const trace = sim.recordCommands({ actor: { team: 'D', slot: 'SS' }, from: 3.45, to: 3.75 });
    const result = sim.run();
    // Exact native input from the opposing control. The correction owns the
    // request/response, not this play's yardage or the receiver's earned catch.
    expect(result.events.find(e => e.type === 'catch')?.t).toBe(3.4);
    // HONEST_FLIGHT: his flight continues on his own estimate up to its arrival (3.3-3.4 s) and, through the catch's securing
    // beat, he works with the receiver it brought the ball to (catch-anticipation, 3.45-3.55 s), the one who caught it at
    // 3.4 s; then the same rally (+y, 3.6-3.65 s) and possession pursuit (3.7 s). Off: flight continuation at 3.45 s.
    const honest = process.env.HONEST_FLIGHT === '1';
    expect(result.telemetry!.decisions.some(d => d.a === sim.slot('SS')!.idx && d.t === (honest ? 3.4 : 3.45) && d.kind === 'flight-continuation')).toBe(true);
    if (honest) expect(result.telemetry!.decisions.some(d => d.a === sim.slot('SS')!.idx && d.t === 3.45 && d.kind === 'catch-anticipation')).toBe(true);
    for (const t of [3.65]) {
      const s = trace.steps.find(s => s.stepStart === t)!;
      expect(s.decision!.raw.vel.y * toBall).toBeGreaterThan(0);
      expect(s.final!.vel.y * toBall).toBeGreaterThan(0);
      expect(s.endpoint!.body.velocity.y * toBall).toBeGreaterThan(0);
      expect(result.telemetry!.decisions.some(d => d.a === sim.slot('SS')!.idx && d.t === t && d.kind === 'ball-rally')).toBe(true);
    }
    expect(result.telemetry!.decisions.some(d => d.a === sim.slot('SS')!.idx && d.t === 3.7 && d.kind === 'possession-pursuit')).toBe(true);
  });
});
