import { describe, expect, it } from 'vitest';
import { contactCommands, contactFixture } from '../scripts/diag/run-contact-technique.js';
import { CENTER_Y } from '../src/core/field.js';
import { ManCoverage } from '../src/sim/behaviors/defense.js';
import { Recognition, type Read } from '../src/sim/recognition.js';
import type { Perceived } from '../src/sim/perception.js';

function contact(read: Read = 'run', side = 1) {
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side, seed: 11 });
  f.sim.t = 1.5;
  f.defender.recog!.read = read;
  f.engagement.nextMoveAt = Infinity;
  return f;
}
function runnerPicture(f: ReturnType<typeof contact>, pos = { x: 35, y: CENTER_Y }) {
  const see = f.sim.see;
  f.sim.see = function (a, b, ...rest) {
    if (a === f.defender && (b === this.qb || b.slot === 'RB'))
      return { pos: { ...pos }, vel: { x: 0, y: 0 }, stance: null, facing: 0, pose: 'up', age: .25, carrying: b === this.carrier };
    return see.call(this, a, b, ...rest);
  };
}
const command = (f: ReturnType<typeof contact>) => contactCommands(f)[f.defender.idx];

describe('engaged defenders preserve known duties and delayed runner pictures', () => {
  it.each(['unsure', 'pass', 'run'] as const)('does not learn the offensive call from a %s read', read => {
    const a = contact(read), b = contact(read);
    runnerPicture(a); runnerPicture(b);
    a.sim.isPass = false; b.sim.isPass = true;
    expect(command(a)).toEqual(command(b));
    expect(a.engagement.side).toBe(b.engagement.side);
    expect(a.sim.rng.nextU32()).toBe(b.sim.rng.nextU32());
  });

  it('does not follow an unseen change to the carrier position or release on its true location', () => {
    const a = contact(), b = contact();
    runnerPicture(a); runnerPicture(b);
    a.sim.qb.body.pos = { x: 35, y: CENTER_Y - 8 };
    b.sim.qb.body.pos = { x: 50, y: CENTER_Y + 8 };
    expect(command(a)).toEqual(command(b));
    expect(a.defender.engagement).not.toBeNull();
    expect(b.defender.engagement).not.toBeNull();
    expect(a.sim.rng.nextU32()).toBe(b.sim.rng.nextU32());
  });

  it.each([-1, 1])('keeps different box and spill shoulders even when the runner is inside, side %s', side => {
    const box = contact('run', side), spill = contact('run', side);
    for (const f of [box, spill]) {
      f.defender.runFit = { gap: 'C', side, kind: 'edge', technique: 'attack', edge: 'box', pace: 'stack' };
      runnerPicture(f, { x: 39, y: CENTER_Y - side * 3 });
    }
    spill.defender.runFit!.edge = 'spill';
    command(box); command(spill);
    expect(box.engagement.side).toBe(-side);
    expect(spill.engagement.side).toBe(side);
  });

  it('keeps an unsure interior fit but answers a personally recognised, declared runner', () => {
    const unsure = contact('unsure'), run = contact('run');
    for (const f of [unsure, run]) runnerPicture(f, { x: 39, y: CENTER_Y - 3 });
    const u = command(unsure), r = command(run);
    expect(unsure.engagement.side).not.toBe(run.engagement.side);
    expect(u.vel).not.toEqual(r.vel);
    expect(unsure.defender.profile).toEqual(run.defender.profile);
  });

  it('holds a chosen shoulder through a decision beat then answers the changed visible cue', () => {
    const f = contact();
    let y = CENTER_Y - 3;
    const see = f.sim.see;
    f.sim.see = function (a, b, ...rest) {
      if (a === f.defender && (b === this.qb || b.slot === 'RB'))
        return { pos: { x: 39, y }, vel: { x: 0, y: 0 }, stance: null, facing: 0, pose: 'up', age: .25, carrying: b === this.carrier };
      return see.call(this, a, b, ...rest);
    };
    command(f); const firstSide = f.engagement.side;
    y = CENTER_Y + 4;
    f.sim.t += .01; command(f);
    expect(f.engagement.side).toBe(firstSide);
    f.sim.t += f.defender.mind.decisionInterval + .01; command(f);
    expect(f.engagement.side).toBe(-firstSide);
  });

  it('waits to shed when the physically close runner is still distant in the consumed picture', () => {
    const f = contact();
    f.engagement.nextMoveAt = 0;
    f.sim.ball = { kind: 'held', carrier: f.sim.slot('RB')! };
    f.sim.slot('RB')!.body.pos = { x: 40, y: CENTER_Y };
    runnerPicture(f, { x: 35, y: CENTER_Y });
    command(f);
    expect(f.engagement.nextMoveAt).toBe(0);
    expect(f.sim.events.some(e => e.type === 'shed')).toBe(false);
  });

  it('can attempt a shed from a close declared picture and still respects shared loads', () => {
    const f = contact();
    f.engagement.nextMoveAt = 0;
    f.sim.ball = { kind: 'held', carrier: f.sim.slot('RB')! };
    runnerPicture(f, { x: 40, y: CENTER_Y });
    const intents = contactCommands(f);
    expect(f.engagement.nextMoveAt > f.sim.t || f.sim.events.some(e => e.type === 'shed')).toBe(true);
    const report = f.sim.world.step(intents, f.sim.dt);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    for (const a of [f.blocker, f.defender]) {
      expect(report.armWork[a.idx] - report.armWorkLimit[a.idx]).toBeLessThan(1e-8);
      expect(report.armImpulse[a.idx] - report.armImpulseLimit[a.idx]).toBeLessThan(1e-8);
    }
  });

  it('a penetrating run-reading defender can shed toward a close observed back deep behind the line', () => {
    const f = contact();
    f.blocker.body.pos.x = 35; f.defender.body.pos.x = 35.82;
    f.engagement.nextMoveAt = 0;
    f.sim.ball = { kind: 'held', carrier: f.sim.slot('RB')! };
    runnerPicture(f, { x: 35, y: CENTER_Y });
    command(f);
    expect(f.engagement.nextMoveAt > f.sim.t || f.sim.events.some(e => e.type === 'shed')).toBe(true);
  });

  it('penetration does not grant knowledge of a physically close back absent from the consumed picture', () => {
    const f = contact();
    f.blocker.body.pos.x = 35; f.defender.body.pos.x = 35.82;
    f.engagement.nextMoveAt = 0;
    f.sim.ball = { kind: 'held', carrier: f.sim.slot('RB')! };
    f.sim.slot('RB')!.body.pos = { x: 35, y: CENTER_Y };
    runnerPicture(f, { x: 31, y: CENTER_Y + 5 });
    command(f);
    expect(f.engagement.nextMoveAt).toBe(0);
    expect(f.sim.events.some(e => e.type === 'shed')).toBe(false);
  });

  it('a physically and visibly close standing QB deep at the mesh is not a run shed target', () => {
    const f = contact();
    f.blocker.body.pos.x = 35; f.defender.body.pos.x = 35.82;
    f.engagement.nextMoveAt = 0;
    f.sim.qb.body.pos = { x: 35, y: CENTER_Y };
    runnerPicture(f, { x: 35, y: CENTER_Y });
    command(f);
    expect(f.engagement.nextMoveAt).toBe(0);
    expect(f.sim.events.some(e => e.type === 'shed')).toBe(false);
  });

  it('an advanced observed ball carrier remains a threat after an originally correct pass read', () => {
    const f = contact('pass');
    f.sim.ball = { kind: 'held', carrier: f.sim.slot('RB')! };
    runnerPicture(f, { x: 43, y: CENTER_Y - 3 });
    expect(Number.isFinite(command(f).vel.y)).toBe(true);
    expect(f.engagement.side).toBe(1);
    expect(f.defender.recog!.read).toBe('pass');
  });
});

function keyRecognition(nearSpeed: number, keySpeed: number, man = true,
  nearCue: 'upright' | 'low-pads' | 'own-contact' = 'upright') {
  const { sim } = contactFixture({ type: 'run', runBlock: 60, passBlock: 60 });
  const a = sim.slot('CB_S')!, target = sim.slot('X')!, near = sim.slot('Y')!;
  a.body.pos = { x: 42, y: 35 };
  a.behavior = man ? new ManCoverage(a, sim, target, false, 'D', 1) : { kind: 'zone', update: () => ({ vel: { x: 0, y: 0 } }) };
  a.recog = new Recognition(a, sim, 0);
  const targets: string[] = [];
  sim.see = function (observer, r): Perceived {
    let pos = { x: this.snapX[r.idx], y: 20 }, vel = { x: 0, y: 0 };
    if (r === this.qb) pos = { x: 36.5, y: 20 };
    else if (r.slot === 'RB') pos = { x: 34, y: 20 };
    else if (r === target) { pos = { x: 41, y: 43 }; vel = { x: keySpeed, y: 0 }; }
    else if (r === near) { pos = nearCue === 'own-contact' ? { x: 41.4, y: 35 } : { x: 41, y: 35.5 }; vel = { x: nearSpeed, y: 0 }; }
    else if (!['LT', 'LG', 'C', 'RG', 'RT'].includes(r.slot)) pos = { x: 41, y: 15 };
    if (observer === a) targets.push(r.slot);
    return { pos, vel, facing: 0, stance: r === near && nearCue === 'low-pads' ? 'low' : null, pose: 'up', age: .25 };
  };
  const trajectory = [];
  for (let k = 0; k < 16; k++) {
    sim.t = .65 + k * sim.dt; a.recog.update(a, sim);
    trajectory.push({ read: a.recog.read, pPass: a.recog.pPass(), readAt: a.recog.readAt });
  }
  return { a, trajectory, targets };
}

describe('defensive recognition reads a known job without inventing tactile knowledge', () => {
  it('a man defender uses his assigned receiver despite a closer conflicting receiver', () => {
    const closeStalk = keyRecognition(0, 6), closeVertical = keyRecognition(6, 6);
    expect(closeStalk.trajectory).toEqual(closeVertical.trajectory);
    expect(closeStalk.a.recog!.read).toBe('pass');
    expect(closeStalk.targets).not.toContain('Y');
    expect(closeStalk.targets).toContain('X');
  });
  it('a changed observed assigned receiver can change his interpretation', () => {
    const release = keyRecognition(6, 6), stalk = keyRecognition(6, 0);
    expect(release.a.recog!.read).toBe('pass');
    // Distant stationary movement is ambiguous, rather than proof of a block.
    expect(stalk.a.recog!.read).toBe('unsure');
    expect(stalk.a.recog!.pPass()).toBeLessThan(release.a.recog!.pPass() - .3);
  });
  it('zone players retain their local key without declaring a slow upright receiver a blocker', () => {
    const still = keyRecognition(0, 6, false), release = keyRecognition(6, 6, false);
    expect(still.a.recog!.read).toBe('unsure');
    expect(still.trajectory).toEqual(keyRecognition(0, 0, false).trajectory);
    expect(release.a.recog!.read).toBe('pass');
  });
  it.each(['low-pads', 'own-contact'] as const)('zone players still recognise their local blocker from %s', cue => {
    const block = keyRecognition(cue === 'low-pads' ? 1 : 0, 6, false, cue);
    expect(block.a.recog!.read).toBe('run');
    expect(block.a.recog!.pPass()).toBeLessThan(keyRecognition(0, 6, false).a.recog!.pPass());
  });
  it('unknown pad presentation conveys no run/pass category from the engagement label', () => {
    const compare = (type: 'pass' | 'run', stance: 'high' | 'low' | null) => {
      const f = contact(); f.engagement.type = type; f.blocker.stance = stance;
      f.defender.recog = new Recognition(f.defender, f.sim, 0);
      f.sim.see = function (_a, r) { return { pos: { x: this.snapX[r.idx], y: CENTER_Y }, vel: { x: 0, y: 0 }, facing: 0, stance: null, pose: 'up', age: .25 }; };
      for (let k = 0; k < 6; k++) { f.sim.t = .3 + k * f.sim.dt; f.defender.recog.update(f.defender, f.sim); }
      return f.defender.recog.pPass();
    };
    expect(compare('run', null)).toBe(compare('pass', null));
    expect(compare('run', 'low')).toBeLessThan(compare('run', null));
    expect(compare('pass', 'high')).toBeGreaterThan(compare('pass', null));
  });
});
