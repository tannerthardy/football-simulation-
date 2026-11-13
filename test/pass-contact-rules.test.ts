import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { DRAG_SPIRAL, solveLaunch, stepFlight } from '../src/physics/ball.js';
import { supportParams } from '../src/physics/support.js';
import type { HandJoint } from '../src/physics/world.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { capturePassContactStarts, flushPassContacts, notePassTouch, observePassContacts } from '../src/sim/pass-interference.js';
import { PlaySim } from '../src/sim/playsim.js';

// Staged contacts on the installed contact law: PAD_LEVERAGE makes the same
// staging a different encounter (a pads-up receiver is lifted off his feet).
vi.hoisted(() => { process.env.PAD_LEVERAGE = '0'; process.env.DL_ANCHOR = '0'; });

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
function move(a: Agent, x: number, y: number, vx = 0, vy = 0, kind = 'idle'): void {
  a.body.pos = { x, y }; a.body.vel = { x: vx, y: vy };
  a.body.facing = Math.hypot(vx, vy) ? Math.atan2(vy, vx) : 0;
  a.behavior = { kind, update: () => ({ vel: { x: vx, y: vy }, facing: a.facing }) };
}
function scene() {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'native pass contact' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, record: false,
  });
  for (const a of sim.agents) { move(a, 75 + a.idx % 5 * 3, 3 + Math.floor(a.idx / 5) * 3); a.snapReadyAt = 0; }
  move(sim.qb, 37, CENTER_Y);
  sim.t = .5;
  const receiver = sim.slot('X')!, defender = sim.slot('CB_S')!;
  expect(sim.snapEligibility.get(receiver.player.id)?.eligible).toBe(true);
  return { sim, receiver, defender };
}
function palm(sim: PlaySim, defender: Agent, receiver: Agent): HandJoint {
  const joint: HandJoint = { kind: 'hands', a: defender.body, b: receiver.body,
    extension: .7, push: 400, hold: 0, steer: 100 };
  sim.world.joints.push(joint); return joint;
}
const calls = (sim: PlaySim, kind: string) => sim.penalties.filter(p => p.kind === kind);

/** Stage an incoming native ballistic pass. The bodies/contact are then
 * advanced by the live PlaySim tick, including the real observation hooks.
 * This is a controlled act witness, not a claim about its prevalence. */
function incoming(sim: PlaySim, receiver: Agent, targetX = 51.5, targetY = CENTER_Y, duration = .72, height = 1.5): void {
  const target = { x: targetX, y: targetY, z: height };
  sim.t = .2;
  const release = { x: sim.qb.pos.x + .3, y: sim.qb.pos.y, z: 2.2 };
  sim.throwBall(sim.qb, receiver, solveLaunch(release, target, duration, DRAG_SPIRAL), target, .2 + duration);
  expect(sim.ball.kind).toBe('air');
  if (sim.ball.kind === 'air') stepFlight(sim.ball.flight, .3);
  sim.t = .5;
}

describe('native NFL 2026 receiver contact', () => {
  it('keeps a genuinely loaded legal front palm jam within five yards', () => {
    const { sim, receiver, defender } = scene();
    move(receiver, 42, CENTER_Y, 2, 0, 'route');
    move(defender, 42.7, CENTER_Y); defender.body.facing = Math.PI;
    const hand = palm(sim, defender, receiver);
    sim.tick();
    expect(Math.hypot(hand.normalForce ?? 0, hand.tangentForce ?? 0)).toBeGreaterThan(0);
    expect(calls(sim, 'illegal_contact')).toEqual([]);
  });

  it('calls continued achieved palm contact after the legal jam exits five yards', () => {
    const { sim, receiver, defender } = scene();
    move(receiver, 42, CENTER_Y, 2, 0, 'route');
    move(defender, 42.7, CENTER_Y); defender.body.facing = Math.PI;
    const hand = palm(sim, defender, receiver);
    sim.tick(); expect(calls(sim, 'illegal_contact')).toEqual([]);
    // Common translation preserves the actual same contact's provenance.
    receiver.body.pos.x += 5; defender.body.pos.x += 5;
    sim.tick();
    expect(Math.hypot(hand.normalForce ?? 0, hand.tangentForce ?? 0)).toBeGreaterThan(0);
    expect(calls(sim, 'illegal_contact')).toEqual([expect.objectContaining({ rule: '8-4-3', yards: 5, autoFirst: true })]);
  });

  it.each(['exit', 'pitch', 'handoff'] as const)('ends the same contact restriction permanently after %s', action => {
    const { sim, receiver, defender } = scene();
    move(receiver, 42, CENTER_Y, 2, 0, 'route'); move(defender, 42.7, CENTER_Y);
    const hand = palm(sim, defender, receiver); sim.tick();
    if (action === 'exit') {
      move(sim.qb, 37, CENTER_Y + 8); sim.tick(); move(sim.qb, 37, CENTER_Y);
    } else if (action === 'pitch') {
      const back = sim.slot('RB')!; move(back, 35, CENTER_Y);
      expect(sim.pitchBall(sim.qb, back)).toBe(true); sim.tick();
    } else {
      const back = sim.slot('RB')!; move(back, 37.1, CENTER_Y);
      expect(sim.handoff(sim.qb, back)).toBe(true);
      expect(sim.handoff(back, sim.qb)).toBe(true); sim.tick();
    }
    receiver.body.pos.x += 5; defender.body.pos.x += 5; sim.tick();
    expect(Math.hypot(hand.normalForce ?? 0, hand.tangentForce ?? 0)).toBeGreaterThan(0);
    expect(calls(sim, 'illegal_contact')).toEqual([]);
  });

  it('does not guess that continued contact preceded a passer pocket exit in the same World interval', () => {
    const { sim, receiver, defender } = scene();
    move(receiver, 42, CENTER_Y, 2, 0, 'route'); move(defender, 42.7, CENTER_Y);
    palm(sim, defender, receiver); sim.tick();
    const lt = sim.slot('LT')!, rt = sim.slot('RT')!;
    const edge = Math.max(sim.offAlign.spots.LT.pos.y + lt.profile.radius,
      sim.offAlign.spots.RT.pos.y + rt.profile.radius);
    move(sim.qb, 37, edge - sim.qb.profile.radius - .02, 0, 6);
    receiver.body.pos.x += 5; defender.body.pos.x += 5;
    sim.tick();
    expect(sim.qb.pos.y + sim.qb.profile.radius).toBeGreaterThan(edge);
    expect(calls(sim, 'illegal_contact')).toEqual([]);
  });

  it('calls a new achieved hit into an evading eligible receiver beyond five', () => {
    const { sim, receiver, defender } = scene();
    move(receiver, 48, CENTER_Y, 0, 2, 'route');
    move(defender, 48, CENTER_Y - .55, 0, 8, 'run-fit');
    sim.tick();
    expect(sim.lastStep!.contacts.some(c => [c.i, c.j].includes(receiver.idx) && [c.i, c.j].includes(defender.idx))).toBe(true);
    expect(calls(sim, 'illegal_contact')).toHaveLength(1);
  });

  it('calls achieved initial contact into the back within five yards', () => {
    const { sim, receiver, defender } = scene();
    move(receiver, 43, CENTER_Y, 2, 0, 'route'); move(defender, 42.45, CENTER_Y, 8, 0, 'run-fit');
    sim.tick();
    expect(sim.lastStep!.contacts.length).toBeGreaterThan(0);
    expect(calls(sim, 'illegal_contact')).toEqual([expect.objectContaining({ rule: '8-4-2' })]);
  });

  it('calls recontact within five only after a physically separated interval', () => {
    const { sim, receiver, defender } = scene();
    move(receiver, 42, CENTER_Y, 2, 0, 'route'); move(defender, 42.7, CENTER_Y);
    const hand = palm(sim, defender, receiver); sim.tick();
    expect(calls(sim, 'illegal_contact')).toEqual([]);
    sim.world.joints.splice(sim.world.joints.indexOf(hand), 1);
    move(receiver, 42, CENTER_Y, 0, 0, 'route'); move(defender, 42, CENTER_Y - 2); sim.tick();
    move(defender, 42.55, CENTER_Y, -8, 0, 'run-fit'); sim.tick();
    expect(calls(sim, 'illegal_contact')).toEqual([expect.objectContaining({
      reason: 'recontact_after_proven_separation', rule: '8-4-2' })]);
  });

  it('does not call the same beyond-five encounter when the receiver causes it', () => {
    const { sim, receiver, defender } = scene();
    move(receiver, 48, CENTER_Y, 0, -8, 'route'); move(defender, 48, CENTER_Y - .55);
    sim.tick(); expect(sim.lastStep!.contacts.length).toBeGreaterThan(0);
    expect(calls(sim, 'illegal_contact')).toEqual([]);
  });

  it('calls in-flight achieved offensive blocking in the target catch envelope, even on an uncatchable ball', () => {
    const { sim, receiver, defender } = scene();
    const target = sim.slot('Z')!;
    sim.throwBall(sim.qb, target, { x: 15, y: -30, z: 3 }, { x: 60, y: 0, z: 1 }, 2);
    move(receiver, 48, CENTER_Y, 0, 0, 'downfield-block');
    move(defender, 48.7, CENTER_Y); defender.body.facing = Math.PI;
    move(target, 48, CENTER_Y + .6);
    const rep = sim.engage(receiver, defender, 'run', { x: 1, y: 0 })!;
    expect(rep).not.toBeNull(); rep.control = .8;
    sim.tick();
    expect(Math.hypot(rep.hands!.normalForce ?? 0, rep.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
    expect(calls(sim, 'opi')).toEqual([expect.objectContaining({ rule: '8-5-4(b)', yards: 10 })]);
  });

  it('does not expand the in-flight blocking branch to a remote receiver', () => {
    const { sim, receiver, defender } = scene(); const target = sim.slot('Z')!;
    sim.throwBall(sim.qb, target, { x: 15, y: 0, z: 3 }, { x: 60, y: CENTER_Y, z: 1 }, 2);
    move(receiver, 48, CENTER_Y, 0, 0, 'downfield-block'); move(defender, 48.7, CENTER_Y);
    move(target, 60, CENTER_Y + 8);
    const rep = sim.engage(receiver, defender, 'run', { x: 1, y: 0 })!; rep.control = .8;
    sim.tick(); expect(Math.hypot(rep.hands!.normalForce ?? 0, rep.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
    expect(calls(sim, 'opi')).toEqual([]);
  });

  it('requires materially restricted catch opportunity for a non-ball collision', () => {
    const { sim, receiver, defender } = scene(); incoming(sim, receiver, 51.5, CENTER_Y - 1.4);
    move(receiver, 50, CENTER_Y, 6, 0, 'track'); receiver.tags.add('onBall');
    move(defender, 50, CENTER_Y - .55, 0, 12, 'pursuit'); defender.tags.delete('onBall');
    sim.tick();
    const contact = sim.lastStep!.contacts.find(c => [c.i, c.j].includes(receiver.idx) && [c.i, c.j].includes(defender.idx));
    expect(contact?.first).toBeDefined();
    expect(calls(sim, 'dpi'), JSON.stringify(sim.foulRecords)).toHaveLength(1);
    expect(calls(sim, 'dpi')[0]).toMatchObject({ enforcement: 'spot', autoFirst: true, phase: 'live' });
  });

  it('applies the same material body restriction to an offensive player interfering with a defender', () => {
    const { sim, receiver: actor, defender: victim } = scene(); incoming(sim, actor, 51.5, CENTER_Y - 1.4);
    move(victim, 50, CENTER_Y, 6, 0, 'track'); victim.tags.add('onBall');
    move(actor, 50, CENTER_Y - .55, 0, 12, 'downfield-block'); actor.tags.delete('onBall');
    sim.tick();
    expect(sim.lastStep!.contacts.length).toBeGreaterThan(0);
    expect(calls(sim, 'opi'), JSON.stringify(sim.foulRecords)).toEqual([expect.objectContaining({
      against: 'O', enforcement: 'previous', yards: 10 })]);
  });

  it.each([true, false])('distinguishes an actual push-off from equal-rights ball play, shove=%s', shove => {
    const { sim, receiver, defender } = scene(); incoming(sim, receiver, 51.5, CENTER_Y - 1.4);
    move(receiver, 50, CENTER_Y, 6, 0, 'track'); receiver.tags.add('onBall');
    move(defender, 50, CENTER_Y - .55, 0, 12, 'track'); defender.tags.add('onBall');
    if (shove) sim.world.strike(defender.body, receiver.body, { x: 0, y: 100 });
    sim.tick();
    if (shove) {
      expect(sim.lastStep!.strikes[0]?.first).toBeDefined();
      expect(Math.hypot(sim.lastStep!.strikes[0].impulse.x, sim.lastStep!.strikes[0].impulse.y)).toBeGreaterThan(0);
      expect(calls(sim, 'dpi'), JSON.stringify(sim.foulRecords)).toContainEqual(expect.objectContaining({ rule: '8-5-2(g)' }));
    } else expect(calls(sim, 'dpi')).toEqual([]);
  });

  it.each(['uncatchable', 'both-playing', 'neither-playing', 'already-touched', 'unknown-attention'] as const)
  ('keeps the opposing %s contact control uncalled', control => {
    const { sim, receiver, defender } = scene();
    incoming(sim, receiver, 51.5, control === 'uncatchable' ? CENTER_Y + 16 : CENTER_Y - 1.4);
    move(receiver, 50, CENTER_Y, 6, 0, control === 'neither-playing' ? 'pursuit' : 'track');
    receiver.tags.delete('onBall');
    if (control !== 'neither-playing') receiver.tags.add('onBall');
    move(defender, 50, CENTER_Y - .55, 0, 12, control === 'unknown-attention' ? 'idle' : 'pursuit');
    defender.tags.delete('onBall');
    if (control === 'both-playing') defender.tags.add('onBall');
    if (control === 'already-touched') notePassTouch(sim, sim.t - .01);
    sim.tick(); expect(sim.lastStep!.contacts.length).toBeGreaterThan(0);
    expect(calls(sim, 'dpi')).toEqual([]);
  });

  it('calls a sustained achieved cloth restriction on a catchable pass even while a catch remains possible', () => {
    const { sim, receiver, defender } = scene(); incoming(sim, receiver, 53.7, CENTER_Y, .75, 3.8);
    move(receiver, 50.1, CENTER_Y, 8, 0, 'track'); receiver.tags.add('onBall');
    move(defender, 49, CENTER_Y, 0, 0, 'pursuit'); defender.tags.delete('onBall');
    const hand: HandJoint = { kind: 'hands', a: defender.body, b: receiver.body,
      actor: defender.body, holder: defender.body, extension: 1, push: 0,
      hold: supportParams(defender.profile).armForce * 1.2, steer: 0 };
    sim.world.joints.push(hand);
    while (sim.t < 1.2 && sim.phase === 'live' && calls(sim, 'dpi').length === 0) sim.tick();
    expect(hand.normalForce).toBeLessThan(0);
    expect(calls(sim, 'dpi'), JSON.stringify(sim.foulRecords)).toContainEqual(expect.objectContaining({ rule: '8-5-1' }));
    expect(sim.foulRecords.find(r => r.called && r.kind === 'dpi')?.evidence.action).toBe('achieved_grab_catch_restriction');
    expect(calls(sim, 'defensive_holding')).toEqual([]);
  });

  it('preserves the uncatchable-pass PI exception for the same actual cloth restriction', () => {
    const { sim, receiver, defender } = scene(); incoming(sim, receiver, 80, CENTER_Y, .75, 3.8);
    move(receiver, 50.1, CENTER_Y, 8, 0, 'track'); receiver.tags.add('onBall');
    move(defender, 49, CENTER_Y, 0, 0, 'pursuit'); defender.tags.delete('onBall');
    const hand: HandJoint = { kind: 'hands', a: defender.body, b: receiver.body,
      actor: defender.body, holder: defender.body, extension: 1, push: 0,
      hold: supportParams(defender.profile).armForce * 1.2, steer: 0 };
    sim.world.joints.push(hand);
    sim.tick(); sim.tick(); sim.tick();
    expect(hand.normalForce).toBeLessThan(0);
    expect(calls(sim, 'dpi')).toEqual([]);
  });

  it('records a hard but non-dispositive encounter as unresolved instead of flagging every loaded contact', () => {
    const { sim, receiver, defender } = scene(); incoming(sim, receiver, 51.5, CENTER_Y - .9);
    move(receiver, 50, CENTER_Y, 6, 0, 'track'); receiver.tags.add('onBall');
    move(defender, 50, CENTER_Y - .55, 0, 12, 'pursuit'); defender.tags.delete('onBall');
    sim.tick();
    expect(sim.lastStep!.contacts.some(c => c.impulse > 100)).toBe(true);
    expect(calls(sim, 'dpi')).toEqual([]);
    expect(sim.foulRecords).toContainEqual(expect.objectContaining({ kind: 'dpi',
      called: false, assessment: 'unresolved' }));
  });

  it('keeps same-interval first-touch ordering unresolved and consumes no rule RNG', () => {
    const { sim, receiver, defender } = scene(); incoming(sim, receiver, 51.5, CENTER_Y - 1.4);
    move(receiver, 50, CENTER_Y, 6, 0, 'track'); receiver.tags.add('onBall');
    move(defender, 50, CENTER_Y - .55, 0, 12, 'pursuit'); defender.tags.delete('onBall');
    // The actual World contact remains native; supply the touch before flush
    // to isolate the unresolvable row/touch ordering, without a catch roll.
    sim.intents = sim.agents.map(a => a.behavior.update(a, sim));
    const starts = capturePassContactStarts(sim), before = JSON.stringify(sim.rng);
    sim.world.time = sim.t;
    const report = sim.world.step(sim.intents, sim.dt);
    observePassContacts(sim, report, sim.t, starts);
    notePassTouch(sim, sim.t + .001); flushPassContacts(sim);
    expect(calls(sim, 'dpi')).toEqual([]);
    expect(JSON.stringify(sim.rng)).toBe(before);
    expect(sim.foulRecords.some(r => r.evidence.action === 'contact_first_touch_order')).toBe(true);
    expect(sim.frames).toEqual([]);
  });
});
