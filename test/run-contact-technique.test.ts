import { describe, expect, it } from 'vitest';
import { contactCommands, contactFixture, executeContact } from '../scripts/diag/run-contact-technique.js';
import { traits } from '../src/sim/engagement.js';

describe('OL contact technique follows the actual run or pass rep', () => {
  it.each([-1, 1])('uses the run specialist\'s hands and feet on the same body, side %s', side => {
    const run = contactFixture({ type: 'run', side, runBlock: 90, passBlock: 20 });
    const pass = contactFixture({ type: 'run', side, runBlock: 20, passBlock: 90 });
    expect(run.capacitySha256).toBe(pass.capacitySha256);
    expect(run.initialBodiesSha256).toBe(pass.initialBodiesSha256);
    const a = traits(run.blocker, 'run'), b = traits(pass.blocker, 'run');
    expect(a.hands).toBeGreaterThan(b.hands);
    expect(a.feet).toBeGreaterThan(b.feet);
    for (const key of ['bend', 'pad', 'lateral', 'arm', 'balance', 'read'] as const) expect(a[key]).toBe(b[key]);
    expect(run.engagement.control).toBeGreaterThan(pass.engagement.control);
    const runRequest = contactCommands(run)[run.blocker.idx], passRequest = contactCommands(pass)[pass.blocker.idx];
    expect(runRequest.cutSkill).toBeGreaterThan(passRequest.cutSkill!);
    expect(runRequest.vel).not.toEqual(passRequest.vel);
    expect(run.blocker.profile).toEqual(pass.blocker.profile);
  });

  it.each([-1, 1])('retains pass specialist execution and default protection traits, side %s', side => {
    const run = contactFixture({ type: 'pass', side, runBlock: 90, passBlock: 20 });
    const pass = contactFixture({ type: 'pass', side, runBlock: 20, passBlock: 90 });
    expect(traits(pass.blocker)).toBe(traits(pass.blocker, 'pass'));
    expect(traits(pass.blocker).hands).toBeGreaterThan(traits(run.blocker).hands);
    expect(traits(pass.blocker).feet).toBeGreaterThan(traits(run.blocker).feet);
    expect(pass.capacitySha256).toBe(run.capacitySha256);
    expect(contactCommands(pass)[pass.blocker.idx].cutSkill)
      .toBeGreaterThan(contactCommands(run)[run.blocker.idx].cutSkill!);
  });

  it('changing only pass training leaves the run contact requests and execution unchanged', () => {
    const a = executeContact({ type: 'run', runBlock: 90, passBlock: 20 });
    const b = executeContact({ type: 'run', runBlock: 90, passBlock: 90 });
    // The older shared bend/pad proxy still combines both training ratings;
    // this increment deliberately changes neither it nor physical support.
    expect(a.capacitySha256).toBe(b.capacitySha256);
    expect(a.initialBodiesSha256).toBe(b.initialBodiesSha256);
    expect(a.traces).toEqual(b.traces);
    expect(a.technique.hands).toBe(b.technique.hands);
    expect(a.technique.feet).toBe(b.technique.feet);
  });

  it('changing only run training leaves default pass hands/feet and the first set unchanged', () => {
    const a = contactFixture({ type: 'pass', runBlock: 20, passBlock: 90 });
    const b = contactFixture({ type: 'pass', runBlock: 90, passBlock: 90 });
    expect(a.capacitySha256).toBe(b.capacitySha256);
    expect(traits(a.blocker).hands).toBe(traits(b.blocker).hands);
    expect(traits(a.blocker).feet).toBe(traits(b.blocker).feet);
    expect(contactCommands(a)[a.blocker.idx]).toEqual(contactCommands(b)[b.blocker.idx]);
  });

  it('caches both techniques independently and reads the new context after a pass-to-run conversion', () => {
    const f = contactFixture({ type: 'pass', runBlock: 90, passBlock: 20 });
    const pass = traits(f.blocker), run = traits(f.blocker, 'run');
    expect(run.hands).toBeGreaterThan(pass.hands);
    expect(run.feet).toBeGreaterThan(pass.feet);
    expect(traits(f.blocker)).toBe(pass);
    expect(traits(f.blocker, 'run')).toBe(run);
    expect(traits(f.defender, 'run')).toBe(traits(f.defender));
    f.sim.isPass = false;
    const request = contactCommands(f)[f.blocker.idx];
    expect(f.engagement.type).toBe('run');
    expect(request.cutSkill).toBeCloseTo(.8 + .3 * run.feet, 12);
    expect(traits(f.blocker)).toBe(pass);
    // A later genuine pass rep on the same athlete must select pass hands.
    f.sim.disengage(f.engagement);
    f.sim.isPass = true;
    const next = f.sim.engage(f.blocker, f.defender, 'pass')!;
    expect(next).not.toBeNull();
    expect(contactCommands(f)[f.blocker.idx].cutSkill).toBeCloseTo(.85 + .3 * pass.feet, 12);
  });

  it.each(['run', 'pass'] as const)('executes %s contact with the unchanged shared force/work budgets', type => {
    for (const side of [-1, 1]) for (const seed of [3, 11, 19]) for (const [runBlock, passBlock] of [[90, 20], [20, 90]]) {
      const receipt = executeContact({ type, side, seed, runBlock, passBlock });
      expect(receipt.loadedTicks).toBeGreaterThan(0);
      expect(receipt.armImpulse).toBeGreaterThan(0);
      expect(receipt.budgets.maxWorkResidual).toBeLessThan(1e-8);
      expect(receipt.budgets.maxArmImpulseExcess).toBeLessThan(1e-8);
      expect(receipt.budgets.maxArmWorkExcess).toBeLessThan(1e-8);
      expect(receipt.budgets.maxSupportWorkExcess).toBeLessThan(1e-8);
      expect(receipt.budgets.maxGroundImpulseExcess).toBeLessThan(1e-8);
    }
  });
});
