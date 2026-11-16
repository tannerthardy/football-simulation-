import { describe, expect, it } from 'vitest';
import { DIR_CAP, type Body } from '../src/physics/kinematics.js';
import { previewFreeMovement, type MovementSample } from '../src/physics/movement-preview.js';
import { newSupport } from '../src/physics/support.js';
import { newVirtualFoot } from '../src/physics/virtual-foot.js';
import { World, type Intent } from '../src/physics/world.js';

function body(): Body {
  return { pos: { x: 50, y: 6 }, vel: { x: 6, y: -5 }, facing: -.7, energy: 1,
    profile: { massKg: 95, radius: .29, reach: 1, heightYd: 2.05, vmax: 9.5, tau: 1.6,
      brake: 6.5, lateral: 7, turnRate: 8, backpedal: .68, shuffle: .6,
      maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100,
      balance: .6, bend: .5, stepSpeed: 3.4, getUp: .9 }, support: newSupport(.35) };
}

const COMMAND: Intent = { vel: { x: 3, y: 5 }, facing: 1.2, effort: .85, cutSkill: 1.1, posture: .55 };

// Independent ordinary World construction deliberately avoids the preview's
// cache/reset path. The same held command is used, with no contacts or future
// controller decisions, so this is a movement-law contract rather than a
// promise that an opponent can be intercepted.
function independent(source: Body, intent: Intent, now: number, steps = 8,
  handContact: World['handContact'] = 'center'): MovementSample[] {
  const predicted = structuredClone(source), world = new World([predicted], { handContact });
  world.time = now;
  const samples: MovementSample[] = [];
  for (let k = 0; k < steps; k++) {
    world.step([intent], .05);
    samples.push({ t: (k + 1) * .05, pos: { ...predicted.pos }, vel: { ...predicted.vel },
      support: predicted.support!.state });
  }
  return samples;
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function reflected(source: Body): Body {
  const mirror = structuredClone(source);
  mirror.pos.y *= -1; mirror.vel.y *= -1; mirror.facing *= -1;
  if (mirror.spin !== undefined) mirror.spin *= -1;
  if (mirror.squeezeHeading !== undefined) mirror.squeezeHeading *= -1;
  if (mirror.support) {
    for (const key of ['xi', 'lean', 'load', 'felt', 'feetVel', 'fall', 'tipAccel', 'feltTip', 'accel', 'strike'] as const) {
      const v = mirror.support[key];
      if (v) v.y *= -1;
    }
    if (mirror.support.yaw !== undefined) mirror.support.yaw *= -1;
  }
  return mirror;
}

describe('feedback movement preview contract',()=>{
  it.each(['center','patch'] as const)('preserves held-command execution with a constant callback, %s',mode=>{
    const source=body(),before=structuredClone(source);
    expect(previewFreeMovement(source,()=>COMMAND,9.2,8,mode)).toEqual(independent(source,COMMAND,9.2,8,mode));
    expect(source).toEqual(before);
  });
  it('executes the same feedback in a separate ordinary World and resets between requests',()=>{
    const source=body(),before=structuredClone(source),target={x:53,y:7};
    const demand=(b:Readonly<Body>,t:number):Intent=>({vel:{x:2*(target.x+.5*t-b.pos.x),y:2*(target.y-b.pos.y)},facing:Math.atan2(target.y-b.pos.y,target.x-b.pos.x)});
    const predicted=structuredClone(source),world=new World([predicted]),expected:MovementSample[]=[];
    world.time=9.2;
    for(let k=0;k<8;k++){
      world.step([demand(predicted,k*.05)],.05);
      expected.push({t:(k+1)*.05,pos:{...predicted.pos},vel:{...predicted.vel},support:predicted.support!.state});
    }
    const actual=previewFreeMovement(source,demand,9.2);
    expect(actual).toEqual(expected);
    expect(actual).not.toEqual(independent(source,demand(source,0),9.2));
    previewFreeMovement(source,COMMAND,2);
    expect(previewFreeMovement(source,demand,9.2)).toEqual(actual);
    expect(source).toEqual(before);
  });
});

describe('free-movement controller previews', () => {
  it.each(['fresh', 'tired and recovering', 'rising'] as const)('uses the production movement law for %s bodies', (kind) => {
    const source = body();
    source.spin = .8;
    if (kind === 'tired and recovering') {
      source.energy = .2; source.sprintLoad = 6;
      source.support!.xi = { x: .2, y: -.09 }; source.support!.out = .07;
      source.support!.accel = { x: -.7, y: .5 };
    } else if (kind === 'rising') {
      source.support!.state = 'rising'; source.support!.since = 8.5;
      source.vel = { x: .1, y: -.05 };
    }
    expect(previewFreeMovement(source, COMMAND, 9.2)).toEqual(independent(source, COMMAND, 9.2));
  });

  it('resets every candidate to the original body and time regardless of evaluation order', () => {
    const source = body();
    source.energy = .45; source.support!.xi = { x: .18, y: -.04 };
    const brake: Intent = { vel: { x: 0, y: 0 }, facing: -.7, posture: .7 };
    const first = previewFreeMovement(source, COMMAND, 3.7);
    const braking = previewFreeMovement(source, brake, 3.7);
    const repeated = previewFreeMovement(source, COMMAND, 3.7);
    expect(repeated).toEqual(first);
    expect(first).toEqual(independent(source, COMMAND, 3.7));
    expect(braking).toEqual(independent(source, brake, 3.7));
    expect(braking).not.toEqual(first);
    expect(previewFreeMovement(source, COMMAND, 12.4, 3)).toEqual(independent(source, COMMAND, 12.4, 3));
  });

  it('restores the start time before predicting a support transition', () => {
    const source = body();
    source.vel = { x: .1, y: -.05 };
    source.support!.state = 'rising'; source.support!.since = 8.5;
    const alreadyRecovered = previewFreeMovement(source, COMMAND, 12);
    const notYetRecovered = previewFreeMovement(source, COMMAND, 9.2);
    expect(alreadyRecovered).toEqual(independent(source, COMMAND, 12));
    expect(notYetRecovered).toEqual(independent(source, COMMAND, 9.2));
    expect(alreadyRecovered[0].support).toBe('up');
    expect(notYetRecovered[0].support).toBe('rising');
    expect(notYetRecovered.some((s) => s.support === 'up')).toBe(true);
  });

  it('does not mutate or alias the source, command, profile, or returned samples', () => {
    const source = freeze(body()), before = structuredClone(source), command = freeze(structuredClone(COMMAND));
    const samples = previewFreeMovement(source, command, 5);
    const expected = structuredClone(samples);
    expect(source).toEqual(before); expect(command).toEqual(COMMAND);
    expect(samples[0].pos).not.toBe(source.pos); expect(samples[0].vel).not.toBe(source.vel);
    expect(samples[0].pos).not.toBe(samples[1].pos); expect(samples[0].vel).not.toBe(samples[1].vel);
    samples[0].pos.x += 100; samples[0].vel.y -= 100;
    expect(source).toEqual(before);
    expect(samples[1]).toEqual(expected[1]);
    expect(previewFreeMovement(source, command, 5)).toEqual(expected);
  });

  it('clears optional gait and support fields when the real body no longer contains them', () => {
    const source = body();
    source.spin = 2; source.sprintLoad = 8; source.squeeze = .8; source.squeezeHeading = 1.8;
    source.support!.tipAccel = { x: 1, y: 2 }; source.support!.feltTip = { x: -.5, y: .4 };
    source.support!.accel = { x: -2, y: 1 }; source.support!.strike = { x: .2, y: -.1 };
    source.support!.foot = newVirtualFoot(source.pos);
    previewFreeMovement(source, COMMAND, 4);
    delete source.spin; delete source.sprintLoad; delete source.squeeze; delete source.squeezeHeading;
    source.support = newSupport();
    expect(previewFreeMovement(source, COMMAND, 4)).toEqual(independent(source, COMMAND, 4));
    delete source.support;
    expect(previewFreeMovement(source, COMMAND, 4)).toEqual(independent(source, COMMAND, 4));
    expect(source.support).toBeUndefined();
  });

  it('reflects turns, yaw, and balance recovery without a preferred side', () => {
    const source = body();
    source.spin = .7; source.squeeze = .2; source.squeezeHeading = -.4;
    source.support!.xi = { x: .18, y: -.1 }; source.support!.out = .06;
    source.support!.accel = { x: .6, y: -.7 }; source.support!.yaw = .3;
    const mirror = reflected(source);
    const a = previewFreeMovement(source, COMMAND, 7);
    const b = previewFreeMovement(mirror, { ...COMMAND, vel: { x: COMMAND.vel.x, y: -COMMAND.vel.y },
      facing: -COMMAND.facing! }, 7);
    for (let k = 0; k < a.length; k++) {
      expect(b[k].pos.x).toBeCloseTo(a[k].pos.x, 10); expect(b[k].pos.y).toBeCloseTo(-a[k].pos.y, 10);
      expect(b[k].vel.x).toBeCloseTo(a[k].vel.x, 10); expect(b[k].vel.y).toBeCloseTo(-a[k].vel.y, 10);
      expect(b[k].support).toBe(a[k].support); expect(b[k].t).toBe(a[k].t);
    }
  });

  it.each(['directional boundary', 'attained yaw', 'tired recovery'].flatMap(kind =>
    [-1, 1].map(side => ({ kind, side }))))
    ('matches independently selected patch physics: $kind, side $side', ({ kind, side }) => {
      let source = body(), command = structuredClone(COMMAND);
      if (kind === 'directional boundary') {
        source.support = newSupport(.2); source.facing = 0; source.spin = 0;
        source.vel = { x: 0, y: source.profile.vmax * source.profile.shuffle };
        command = { vel: { x: 0, y: .9 * source.profile.vmax }, facing: Math.PI / 2, posture: .2 };
      } else {
        source.spin = .8;
        if (kind === 'tired recovery') {
          source.energy = .2; source.sprintLoad = 6;
          source.support!.xi = { x: .2, y: -.09 }; source.support!.out = .07;
          source.support!.accel = { x: -.7, y: .5 };
        }
      }
      if (side === -1) {
        source = reflected(source); command.vel.y *= -1; command.facing! *= -1;
      }
      const before = structuredClone(source), commandBefore = structuredClone(command);
      const expected = independent(source, command, 9.2, 8, 'patch');
      expect(previewFreeMovement(source, command, 9.2, 8, 'patch')).toEqual(expected);
      expect(source).toEqual(before); expect(command).toEqual(commandBefore);
      // This checks a real mode difference, rather than an equality between
      // two fixtures in which the selected physics happen to be inactive.
      // Re-recorded 2026-11-16: the 'attained yaw' fixture differed between the modes only because the legacy directional cap read the plan's prospective
      // facing in 'center' and the attained facing in 'patch'. DIR_CAP's cap reads the hips as they are in both, so with it on the two modes plan the same free
      // movement (the contract this test exists for) and the equality, not a difference, is the correct reading; the other two fixtures still differ.
      if (DIR_CAP && kind === 'attained yaw') expect(expected).toEqual(independent(source, command, 9.2));
      else expect(expected).not.toEqual(independent(source, command, 9.2));
    });

  it.each(['center', 'patch'] as const)('isolates scratch models regardless of caller order, starting %s', firstMode => {
    const source = body(); source.spin = .8;
    source.energy = .45; source.support!.xi = { x: .18, y: -.04 };
    const brake: Intent = { vel: { x: 0, y: 0 }, facing: -.7, posture: .7 };
    const secondMode = firstMode === 'center' ? 'patch' : 'center';
    for (const mode of [firstMode, secondMode, firstMode, secondMode] as const) {
      expect(previewFreeMovement(source, COMMAND, 3.7, 8, mode)).toEqual(independent(source, COMMAND, 3.7, 8, mode));
      expect(previewFreeMovement(source, brake, 12.4, 3, mode)).toEqual(independent(source, brake, 12.4, 3, mode));
    }
    expect(previewFreeMovement(source, COMMAND, 3.7)).toEqual(independent(source, COMMAND, 3.7));
    expect(previewFreeMovement(source, COMMAND, 3.7, 8, 'center')).toEqual(previewFreeMovement(source, COMMAND, 3.7));
  });

  it('keeps both mode caches and their returned samples independent of frozen inputs and result mutation', () => {
    const source = body(); source.spin = .8;
    const frozen = freeze(source), before = structuredClone(source), command = freeze(structuredClone(COMMAND));
    const expectedCenter = independent(source, command, 5), expectedPatch = independent(source, command, 5, 8, 'patch');
    const center = previewFreeMovement(frozen, command, 5, 8, 'center');
    const patch = previewFreeMovement(frozen, command, 5, 8, 'patch');
    expect(center).toEqual(expectedCenter); expect(patch).toEqual(expectedPatch);
    expect(center).not.toBe(patch); expect(center[0].pos).not.toBe(patch[0].pos);
    expect(center[0].pos).not.toBe(source.pos); expect(patch[0].vel).not.toBe(source.vel);
    center[0].pos.x += 100; patch[0].vel.y -= 100;
    expect(previewFreeMovement(frozen, command, 5, 8, 'center')).toEqual(expectedCenter);
    expect(previewFreeMovement(frozen, command, 5, 8, 'patch')).toEqual(expectedPatch);
    expect(source).toEqual(before); expect(command).toEqual(COMMAND);
  });

  it('resets absent optional gait/support fields in each selected model', () => {
    const source = body();
    source.spin = 2; source.sprintLoad = 8; source.squeeze = .8; source.squeezeHeading = 1.8;
    source.support!.tipAccel = { x: 1, y: 2 }; source.support!.strike = { x: .2, y: -.1 };
    for (const mode of ['center', 'patch'] as const) previewFreeMovement(source, COMMAND, 4, 8, mode);
    delete source.spin; delete source.sprintLoad; delete source.squeeze; delete source.squeezeHeading;
    source.support = newSupport();
    for (const mode of ['patch', 'center'] as const)
      expect(previewFreeMovement(source, COMMAND, 4, 8, mode)).toEqual(independent(source, COMMAND, 4, 8, mode));
    delete source.support;
    for (const mode of ['center', 'patch'] as const)
      expect(previewFreeMovement(source, COMMAND, 4, 8, mode)).toEqual(independent(source, COMMAND, 4, 8, mode));
    expect(source.support).toBeUndefined();
  });
});
