// No World.step or native play is launched by these decision contracts.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { norm } from '../src/core/vec.js';
import type { Intent } from '../src/physics/world.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { RunBlocker, type Combination } from '../src/sim/behaviors/blocking.js';
import { updateEngagements } from '../src/sim/engagement.js';
import type { Perceived } from '../src/sim/perception.js';
import { contactFixture } from '../scripts/diag/run-contact-technique.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });

function fixture(cueVelocity = { x: 0, y: 0 }) {
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60 });
  f.sim.offCall.run = RUN_BY_ID.wz_strong;
  const helper = f.sim.slot('LG')!;
  const combo: Combination = { members: [f.blocker, helper], defender: f.defender,
    backer: null, released: false, secureSince: -1, nextRead: 0, soloKind: 'reach' };
  const drive = norm({ x: 1, y: -1.8 });
  const behavior = new RunBlocker({ kind: 'reach', target: f.defender, drive, combination: combo });
  f.blocker.behavior = behavior;
  helper.behavior = new RunBlocker({ kind: 'combo', target: f.defender, drive, combination: combo });
  f.engagement.drive = drive;
  f.engagement.nextMoveAt = Infinity;
  const cue: Perceived = { pos: { x: 40.82, y: CENTER_Y + .2 }, vel: { ...cueVelocity },
    facing: Math.PI, stance: 'low', age: .2, pose: 'up', carrying: false };
  const see = vi.spyOn(f.sim, 'see').mockImplementation((observer, target) => {
    if (observer !== f.blocker || target !== f.defender) throw new Error('unexpected extra read');
    return structuredClone(cue);
  });
  const update = () => { behavior.update(f.blocker, f.sim); return behavior.contactMotion(f.blocker); };
  return { ...f, helper, combo, behavior, cue, see, update };
}

function forbidMotion(body: ReturnType<typeof fixture>['defender']['body']) {
  Object.defineProperties(body, {
    pos: { configurable: true, get() { throw new Error('private live position'); } },
    vel: { configurable: true, get() { throw new Error('private live velocity'); } },
  });
}

describe('paired stretch fits use the acquired picture and their installed half', () => {
  it('can act on known stationary motion without reading hidden defender or partner motion', () => {
    const f = fixture();
    forbidMotion(f.defender.body); forbidMotion(f.helper.body);
    const before = structuredClone(f.blocker.body), hands = f.engagement.hands;
    const command = f.update();
    expect(command).not.toBeNull();
    expect(command!.x).toBeGreaterThan(0);
    expect(command!.y).toBeLessThan(0);
    expect(f.blocker.body).toEqual(before);
    expect(f.engagement.hands).toBe(hands);
    expect(f.engagement.surfaceAxis).toBeUndefined();
    expect(f.combo.released).toBe(false);
    expect(f.see).toHaveBeenCalledTimes(1);
  });

  it('does not substitute stationary or private motion for an unknown velocity', () => {
    const f = fixture({ x: NaN, y: NaN });
    forbidMotion(f.defender.body); forbidMotion(f.helper.body);
    expect(f.update()).toBeNull();
    expect(f.engagement.surfaceAxis).toBeUndefined();
    expect(f.combo.released).toBe(false);
  });

  it('holds the consumed picture until its next ordinary read, then consumes the new cue', () => {
    const f = fixture(), original = f.update();
    f.cue.vel.y = -4;
    f.sim.t += .05;
    expect(f.update()).toEqual(original);
    expect(f.see).toHaveBeenCalledTimes(1);
    f.sim.t = 2;
    expect(f.update()).not.toEqual(original);
    expect(f.see).toHaveBeenCalledTimes(2);
  });

  it('retains the installed half when a partner crosses sides, including after a new read', () => {
    const f = fixture(), original = f.update();
    f.helper.body.pos.y = CENTER_Y - 8;
    f.sim.t = 2;
    expect(f.update()).toEqual(original);
    expect(f.combo.members).toEqual([f.blocker, f.helper]);
  });

  it('settles on the half and requests recovery after residual motion carries it past', () => {
    const f = fixture();
    expect(f.update()!.y).toBeLessThan(0);
    // Match the installed lateral half while retaining ordinary upfield work.
    f.blocker.body.pos = { x: f.cue.pos.x - .35, y: f.cue.pos.y - .55 };
    f.blocker.body.vel = { x: 0, y: -3 };
    f.sim.t += .05;
    expect(f.update()).toEqual({ x: 2.4, y: 0 });
    f.blocker.body.pos.y -= .2;
    f.sim.t += .05;
    expect(f.update()!.y).toBeGreaterThan(0);
    expect(f.engagement.surfaceAxis).toBeUndefined();
    expect(f.combo.released).toBe(false);
  });

  it('leaves an already framed paired contact under its existing controller', () => {
    const f = fixture(), axis = { x: -.8, y: .6 };
    f.engagement.surfaceAxis = axis;
    const before = structuredClone(f.blocker.body), hands = f.engagement.hands;
    expect(f.update()).toBeNull();
    expect(f.engagement.surfaceAxis).toBe(axis);
    expect(f.engagement.hands).toBe(hands);
    expect(f.blocker.body).toEqual(before);
    expect(f.combo.released).toBe(false);
  });

  it('invalidates the held track when the installed target changes', () => {
    const f = fixture();
    expect(f.update()).not.toBeNull();
    f.behavior.plan.target = f.sim.slot('DT_S')!;
    f.sim.t += .05;
    expect(f.update()).toBeNull();
  });

  it('does not grant first-level track work after this combination releases', () => {
    const f = fixture();
    expect(f.update()).not.toBeNull();
    f.combo.released = true;
    f.sim.t += .05;
    expect(f.update()).toBeNull();
  });
});

describe('existing lost-depth anchoring retains priority over paired approach feet', () => {
  function anchored(usePlan: boolean) {
    const f = fixture();
    f.blocker.body.vel = { x: -.4, y: -1 };
    f.blocker.body.support!.felt = { x: -1000, y: 0 };
    expect(f.update()).not.toBeNull();
    f.see.mockRestore(); // Ordinary defensive contact reads remain native.
    if (!usePlan) vi.spyOn(f.behavior, 'contactMotion').mockReturnValue(null);
    const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    updateEngagements(f.sim, intents);
    return { command: intents[f.blocker.idx], drive: f.engagement.drive,
      axis: f.engagement.surfaceAxis, control: f.engagement.control,
      hands: { extension: f.engagement.hands!.extension, push: f.engagement.hands!.push,
        hold: f.engagement.hands!.hold, steer: f.engagement.hands!.steer },
      rng: JSON.stringify(f.sim.rng), released: f.combo.released };
  }

  it('preserves the same anchored command, hands, control and execution draws', () => {
    expect(anchored(true)).toEqual(anchored(false));
  });

  it('does not apply a framed legacy hook when stretch handling is disabled', async () => {
    vi.stubEnv('STRETCH_REACH', '0');
    vi.stubEnv('RUN_CONTACT_TRACK', '1');
    vi.resetModules();
    const { updateEngagements: updateWithoutStretch } = await import('../src/sim/engagement.js');
    function command(withHook: boolean) {
      const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60 });
      f.sim.offCall.run = RUN_BY_ID.wz_strong;
      f.engagement.surfaceAxis = { x: -1, y: 0 };
      f.engagement.nextMoveAt = Infinity;
      f.blocker.behavior = { kind: 'run-block', update: () => ({ vel: { x: 0, y: 0 } }),
        contactMotion: () => withHook ? { x: 17, y: -17 } : null };
      const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
      const before = f.sim.agents.map(a => structuredClone(a.body));
      updateWithoutStretch(f.sim, intents);
      expect(f.sim.agents.map(a => a.body)).toEqual(before);
      return { command: intents[f.blocker.idx], axis: f.engagement.surfaceAxis,
        control: f.engagement.control, rng: JSON.stringify(f.sim.rng),
        hands: { extension: f.engagement.hands!.extension, push: f.engagement.hands!.push,
          hold: f.engagement.hands!.hold, steer: f.engagement.hands!.steer } };
    }
    expect(command(true)).toEqual(command(false));
  });
});
