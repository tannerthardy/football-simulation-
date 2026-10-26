import { beforeAll, describe, expect, it, vi } from 'vitest';
import { captureSetup } from '../scripts/diag/saved-play.js';
import { abandonmentSetup, BLOCK_LOOK_UNTIL, compareAbandonment, Z_SPLIT } from '../scripts/diag/cov7-abandonment.js';
import { ReceiverBlockLook } from '../src/sim/behaviors/block-look.js';
import { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { ReceiverForecast } from '../src/sim/receiver-forecast.js';
import type { Agent } from '../src/sim/agent.js';
// Recorded on default switches. The original run benefit was staged with
// EDGE_CONTAIN=0 SEAL_HOLD=0, whose off paths review 2 drops; on defaults the
// corner's run participation is measured below by approach and, at the declared
// wider split, by the tackle itself.

describe('installed non-contact receiver block look', () => {
  it('keeps the release conditional in the QB prior and physically executes the called transition', () => {
    const sim = new PlaySim(abandonmentSetup('deception')), z = sim.slot('Z')!;
    expect(z.behavior).toBeInstanceOf(ReceiverBlockLook);
    const forecasts = (sim.qb.behavior as unknown as { receiverForecasts: Map<Agent, ReceiverForecast> }).receiverForecasts;
    expect(forecasts.get(z)!.prior.startDelay).toBeNull();
    while (sim.t < BLOCK_LOOK_UNTIL) sim.tick();
    expect(z.body.support!.posture).toBeGreaterThan(.6);
    expect(z.pos.x).toBeGreaterThan(sim.offAlign.spots.Z.pos.x);
    expect(z.engagement).toBeNull();
    sim.tick();
    expect(z.behavior).toBeInstanceOf(RouteRunner);
    expect((z.behavior as RouteRunner).breakTime).toBeGreaterThan(BLOCK_LOOK_UNTIL);
    expect(z.stance).toBe('high');
    // The body has to rise over time; the call did not teleport its posture.
    expect(z.body.support!.posture).toBeGreaterThan(.2);
  });

  it('uses the acquired corner picture, independent of unseen target motion or private assignment', () => {
    // Synthetic information contract; the native pair below never supplies pictures.
    const sim = new PlaySim(abandonmentSetup('deception')), z = sim.slot('Z')!;
    const look = z.behavior as ReceiverBlockLook;
    sim.t = .5;
    const picture = { pos: { x: 46, y: 15 }, vel: { x: 1, y: 0 }, facing: Math.PI,
      stance: 'high' as const, pose: 'up' as const, carrying: false, age: .2 };
    sim.see = vi.fn(() => structuredClone(picture));
    const rng = structuredClone(sim.rng), before = look.update(z, sim);
    look.target.body.pos = { x: 90, y: 45 };
    look.target.body.vel = { x: -8, y: 5 };
    look.target.behavior = { kind: 'private-different-duty', update: () => ({ vel: { x: 0, y: 0 } }) };
    expect(look.update(z, sim)).toEqual(before);
    expect(structuredClone(sim.rng)).toEqual(rng);
    expect(z.engagement).toBeNull();
    expect(sim.events.filter(e => e.type === 'block_contact')).toEqual([]);
  });

  it('rejects a non-perimeter installation rather than silently faking an ineligible job', () => {
    const setup = abandonmentSetup('deception');
    setup.offCall.receiverBlockLook = { RB: { until: 1 } };
    expect(() => new PlaySim(setup)).toThrow('detached perimeter');
  });

  it('preserves the called tag and all constructor inputs in the existing restoration format', () => {
    const a = captureSetup(abandonmentSetup('deception')), b = captureSetup(abandonmentSetup('deception'));
    expect(a.equals(b)).toBe(true);
  });
});

describe('COV-7 active run benefit and legal abandonment cost', () => {
  let run: ReturnType<typeof compareAbandonment>, pass: ReturnType<typeof compareAbandonment>;
  beforeAll(() => { run = compareAbandonment('run'); pass = compareAbandonment('deception'); }, 120_000);

  it('activates on both calls with the same acquired primary picture and own body, without a carrying-back cue', () => {
    const cue = (row: any, slot: string) => row.observations.find((o: any) => o.target.slot === slot)?.cue;
    const r = run.summary.firstSupportEvidence, p = pass.summary.firstSupportEvidence;
    expect(run.summary.firstSupport).toBe(pass.summary.firstSupport);
    expect(r.body).toEqual(p.body);
    expect(cue(r, 'Z')).toEqual(cue(p, 'Z'));
    for (const row of [r, p]) {
      expect(row.read).toBe('run');
      expect(cue(row, 'Z').stance).toBe('low');
      expect(cue(row, 'Z').vel.x).toBeGreaterThan(.4);
      expect(cue(row, 'QB').carrying).toBe(true);
      expect(cue(row, 'RB').carrying).toBe(false);
    }
    // Different QB motion is visible and retained, not relabelled as equal.
    expect(cue(r, 'QB').vel).not.toEqual(cue(p, 'QB').vel);
  });

  it('preserves original man identity, alley duty and complete observer-off/on executions', () => {
    for (const p of [run, pass]) {
      expect(p.summary.observerEquality).toBe(true);
      expect(p.summary.installed.actor.playerId).toBe('DEF-CB3');
      expect(p.summary.installed.primary.playerId).toBe('OFF-WR2');
      expect(p.summary.installed.fit).toMatchObject({ kind: 'alley', gap: 'D', side: -1 });
      expect(p.alternative.rows.every(r => r.retainedPrimary.playerId === 'OFF-WR2'
        && r.fit.kind === 'alley')).toBe(true);
    }
  });

  it('charges a finite acquisition/redirect cost while allowing correction on an observed upright release', () => {
    expect(pass.summary.returnedToMan).toBe(pass.summary.acquiredUpright);
    expect(pass.summary.returnedToMan).toBeGreaterThan(BLOCK_LOOK_UNTIL);
    expect(pass.summary.inwardMomentumArrested!).toBeGreaterThan(pass.summary.returnedToMan!);
    const correction = pass.alternative.rows.find(r => r.at === pass.summary.returnedToMan)!;
    expect(correction.body.vel.y).toBeGreaterThan(0);
    const sample = pass.summary.samples.find(s => s.at === 2.4)!;
    expect(sample.support!.lateralGap).toBeGreaterThan(sample.man!.lateralGap + 1);
    expect(sample.support!.depthLeverage).toBeLessThan(sample.man!.depthLeverage);
    expect(sample.support!.distance).toBeGreaterThan(sample.man!.distance + 1);
    // Facing and travel are distinct measured quantities.
    expect(sample.support!.facing).not.toBe(sample.support!.travelHeading);
  });

  it('uses native QB evaluation and one legal behind-line release to the eligible primary, with no fake block', () => {
    for (const a of [pass.baseline, pass.alternative]) {
      expect(a.qbEvaluations.some(e => e.target.playerId === 'OFF-WR2' && e.evaluation)).toBe(true);
      expect(a.releases).toHaveLength(1);
    }
    for (const law of Object.values(pass.summary.legality)) {
      expect(law.snapPermitted).toBe(true);
      expect(law.snapFouls).toEqual([]);
      // Existing installed-snap abstraction, preserved and reported. Require
      // this exact limitation rather than calling modeled helmets/set proof.
      expect(law.snapUnresolved).toEqual([
        "3-18/7-4: declared installed line/set abstraction; helmet/beltline and snap mechanics not recorded; offensive motion judged only by the motion man's velocity at the snap",
      ]);
      expect(law.primaryEligibility?.eligible).toBe(true);
      expect(law.primaryContactsBeforeRelease).toEqual([]);
      expect(law.primaryEngagedBeforeRelease).toBe(false);
      expect(law.forwardPassRestrictionApplicable).toBe(true);
      expect(law.maxIneligibleForwardEdgeBeforeRelease!).toBeLessThan(41);
      expect(law.maxQBForwardEdgeBeforeRelease!).toBeLessThan(40);
      expect(law.nativeFouls).toEqual([]);
      expect(law.limitations).toEqual([]);
      expect(law.releases[0]).toMatchObject({ target: { playerId: 'OFF-WR2' }, priorForwardThrows: 0 });
      expect(law.releases[0].velocity.x).toBeGreaterThan(0);
    }
  });

  it('brings the corner to the runner on the run, while preserving both deceptive incompletions', () => {
    expect(run.summary.legality.support.forwardPassRestrictionApplicable).toBe(false);
    expect(run.summary.legality.support.maxIneligibleForwardEdgeBeforeRelease).toBeNull();
    // On defaults the contained edge and LB_W finish the toss in every arm; the
    // corner who plays the run arrives within reach, the retained man stays
    // on Z more than 4 yd away.
    const approach = run.summary.squeeze.carrierApproach;
    expect(approach.man!.distance).toBeGreaterThan(4);
    expect(approach.squeeze!.distance).toBeLessThan(1.5);
    expect(run.summary.result.support.outcome).toBe('tackle');
    expect(pass.summary.result.man.outcome).toBe('incomplete');
    expect(pass.summary.result.support.outcome).toBe('incomplete');
  });
});

describe('COV-7 squeeze: the stalk-and-go cost and the wider split (defaults)', () => {
  // The vertical call and the 11 2/3 yd split were declared with their
  // predictions before any squeeze run (c2d8c404).
  const WIDE = 11 + 2 / 3;
  let vertical: ReturnType<typeof compareAbandonment>, wideRun: ReturnType<typeof compareAbandonment>,
    widePass: ReturnType<typeof compareAbandonment>;
  beforeAll(() => {
    vertical = compareAbandonment('vertical');
    wideRun = compareAbandonment('run', BLOCK_LOOK_UNTIL, WIDE);
    widePass = compareAbandonment('deception', BLOCK_LOOK_UNTIL, WIDE);
  }, 120_000);

  it('pays for the squeeze in depth on the go, not in lateral abandonment', () => {
    const q = vertical.summary.squeeze, release = vertical.summary.atRelease;
    expect(q.firstSqueeze).toBe(vertical.summary.firstSupport);
    expect(q.returnedToMan).toBe(vertical.summary.returnedToMan);
    // Z is past the squeezed corner at the throw; the man corner is level.
    expect(q.atRelease!.depthLeverage).toBeLessThan(-2);
    expect(release.man!.depthLeverage).toBeGreaterThan(-0.5);
    // ...but he stays nearer Z's line than the corner who ran to the alley.
    expect(q.atRelease!.lateralGap).toBeLessThan(release.support!.lateralGap - 0.5);
  });

  it('at the wider split the run corner makes the play that retained man gives up', () => {
    const man = wideRun.summary.result.man, support = wideRun.summary.result.support;
    expect(wideRun.summary.legality.support.runCornerContacts.some(e => e.type === 'tackle')).toBe(true);
    expect(man.yards).toBeGreaterThan(support.yards + 10);
    expect(wideRun.summary.squeeze.result.yards).toBeLessThan(man.yards - 10);
    expect(wideRun.summary.squeeze.carrierApproach.squeeze!.distance).toBeLessThan(1.5);
  });

  it('at the wider split the permissive alley run is the one PA completes on', () => {
    expect(widePass.summary.result.support.outcome).not.toBe('incomplete');
    expect(widePass.summary.result.man.outcome).toBe('incomplete');
    expect(widePass.summary.squeeze.result.outcome).toBe('incomplete');
  });

  it('keeps the original fixture split', () => {
    expect(Z_SPLIT).toBeCloseTo(8 + 1 / 3);
  });
});
