import { beforeAll, describe, expect, it, vi } from 'vitest';
import { captureSetup } from '../scripts/diag/saved-play.js';
import { abandonmentSetup, BLOCK_LOOK_UNTIL, compareAbandonment } from '../scripts/diag/cov7-abandonment.js';
import { ReceiverBlockLook } from '../src/sim/behaviors/block-look.js';
import { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { ReceiverForecast } from '../src/sim/receiver-forecast.js';
import type { Agent } from '../src/sim/agent.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;
// Recorded on default switches. The run benefit was first staged with EDGE_CONTAIN=0 SEAL_HOLD=0
// (unbounded edge widening); under the gait start law (#336) that staging leaves LB_W unblocked, and
// the defaults are the game the corner actually plays in.

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
  beforeAll(() => { run = compareAbandonment('run'); pass = compareAbandonment('deception'); });

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

  it('the QB throws where the corner vacated, judged from his own picture while the corner is away', () => {
    for (const a of [pass.baseline, pass.alternative]) {
      expect(a.qbEvaluations.some(e => e.target.playerId === 'OFF-WR2' && e.evaluation)).toBe(true);
      expect(a.releases).toHaveLength(1);
    }
    // The corner bit (support at the shared admission tick) and the QB threw into the window he left.
    expect(pass.summary.firstSupport).not.toBeNull();
    expect(pass.alternative.releases[0].target?.playerId).toBe('OFF-WR2');
    // The QB's own score of Z (his held picture of Z and his remembered defenders, the same
    // evaluation that chooses his throws) on every tick before either release, wherever his eyes are.
    // Where his eyes go rides a look-off roll on the play's single recorded stream, which an
    // unrelated draw elsewhere shifts; the window the corner opened does not. So the clock is
    // the corner's: ticks where the corner who bit is 1+ yd farther from Z than the corner who stayed.
    const release = Math.min(pass.baseline.releases[0].at, pass.alternative.releases[0].at);
    const away = (a: typeof pass.baseline, at: number) => {
      const row = a.rows.find(r => Math.abs(r.at - at) < 1e-6);
      return row ? Math.hypot(row.body.pos.x - row.primary.body.pos.x, row.body.pos.y - row.primary.body.pos.y) : null;
    };
    const window = pass.alternative.zReads.filter(s => s.at < release - 1e-9 && s.completion !== null).flatMap(s => {
      const m = pass.baseline.zReads.find(b => Math.abs(b.at - s.at) < 1e-6);
      const ds = away(pass.alternative, s.at), dm = away(pass.baseline, s.at);
      return m && m.completion !== null && ds !== null && dm !== null && ds > dm + 1 ? [{ support: s, man: m }] : [];
    });
    expect(window.length).toBeGreaterThanOrEqual(4);
    const mean = (k: 'support' | 'man', f: 'completion' | 'interceptionRisk') =>
      window.reduce((sum, w) => sum + w[k][f]!, 0) / window.length;
    expect(mean('support', 'completion')).toBeGreaterThan(mean('man', 'completion') + 0.2);
    expect(mean('support', 'interceptionRisk')).toBeLessThan(mean('man', 'interceptionRisk'));
  });

  it('every release is a legal behind-line forward pass with no fake block on Z', () => {
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
      expect(law.releases[0]).toMatchObject({ priorForwardThrows: 0 });
      expect(law.releases[0].velocity.x).toBeGreaterThan(0);
    }
  });

  it('shows real runner participation on the run, and the deceptive pass opens the window the corner left', () => {
    expect(run.summary.legality.support.forwardPassRestrictionApplicable).toBe(false);
    expect(run.summary.legality.support.maxIneligibleForwardEdgeBeforeRelease).toBeNull();
    // The corner who supports reaches the runner, and before the corner who stayed in man does.
    const first = (contacts: Array<{ t: number }>) => Math.min(Infinity, ...contacts.map(e => e.t));
    const support = run.summary.legality.support.runCornerContacts, man = run.summary.legality.man.runCornerContacts;
    expect(support.some(e => e.type === 'tackle_wrap')).toBe(true);
    expect(first(support)).toBeLessThan(first(man));
    expect(run.summary.result.support.outcome).toBe('tackle');
    expect(run.summary.result.support.yards).toBeLessThan(run.summary.result.man.yards);
    // Re-recorded for the leg force-velocity law (PHY-1): the line contacts differ (a DT is no longer driven
    // down at 2.4 s), the passer's body at release differs, and the same 51-yard throw to WR2 now arrives in stride
    // (ball 0.3 yd longer at 2.8 s; the receiver holds 8 yd/s instead of slowing to 5.4). Both arms then catch it and
    // the yardage after the catch is a different tackler's, so the outcome order is no longer a measure of the
    // abandonment cost. Pin the cost where the corner's own body decides it: how far he is from Z when
    // the QB throws to Z. Under the gait start law the man arm throws elsewhere, later, so both arms are
    // read at that same clock rather than at each arm's own release.
    const released = pass.summary.atRelease;
    expect(released.support).not.toBeNull();
    const tThrow = pass.alternative.releases[0].at;
    const at = (a: typeof pass.baseline) => {
      const row = a.rows.find(r => r.at >= tThrow - 1e-9)!;
      const d = row.body.pos, z = row.primary.body.pos;
      return { distance: Math.hypot(d.x - z.x, d.y - z.y), depthLeverage: d.x - z.x };
    };
    expect(at(pass.alternative).distance).toBeGreaterThan(at(pass.baseline).distance + 1);
    expect(at(pass.alternative).depthLeverage).toBeLessThan(at(pass.baseline).depthLeverage);
    // Name the result: a completion, an interception and an incompletion are different football, and
    // "not incomplete" cannot tell the first two apart. Under the gait start law the corner who bit
    // recovers and intercepts the throw into the window he vacated. The man arm's throw is named, never
    // an interception: incomplete to H under #336, a completion to Z under the direction-free start, where
    // a look-off roll moves his first read of Z past the bitten corner's recovery. The cost of the bite
    // is the window (the QB's read and the same-clock geometry above), not a punished result; being
    // fooled is not forced to fail.
    const kind = (arm: typeof pass.baseline) => {
      const r = arm.execution.result;
      return r.stats.interceptedBy ? 'interception' : r.stats.completed ? 'completion' : r.outcome;
    };
    expect(kind(pass.alternative)).toBe('interception');
    expect(pass.alternative.execution.result.stats.interceptedBy).toBe('DEF-CB3');
    expect(['completion', 'incomplete']).toContain(kind(pass.baseline));
  });
});
