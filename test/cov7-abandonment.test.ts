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
  // Eight native executions (four observer pairs) take ~6s alone; the old
  // implicit10s hook timed out under full-core contention. Match core's60s
  // per-test budget explicitly for this hook, without changing any scene input.
  beforeAll(() => { run = compareAbandonment('run'); pass = compareAbandonment('deception'); }, 60_000);

  it('admits each call on acquired run belief after a common pre-admission picture, without a carrying-back cue', () => {
    const cue = (row: any, slot: string) => row.observations.find((o: any) => o.target.slot === slot)?.cue;
    const r = run.summary.firstSupportEvidence, p = pass.summary.firstSupportEvidence;
    // #353 on develop510f7a6a: Toss recognizes run one tick before PA. Do not
    // synchronize recognition or compare pictures from different clocks as equal.
    expect(run.summary.firstSupport).toBe(.65);
    expect(pass.summary.firstSupport).toBe(.70);
    const beforeAdmission = Math.min(r.at, p.at);
    const prior = run.alternative.rows.filter(row => row.at < beforeAdmission).at(-1)!;
    const same = pass.alternative.rows.find(row => row.at === prior.at)!;
    expect(prior.at).toBe(.60);
    expect(prior.read).toBe('unsure');
    expect(same.read).toBe('unsure');
    expect(prior.body).toEqual(same.body);
    expect(cue(prior, 'Z')).toEqual(cue(same, 'Z'));
    // Within each call the treatment/control body and acquired primary picture
    // still match exactly at that call's own first support decision.
    for (const arm of [run, pass]) {
      const admitted = arm.summary.firstSupportEvidence;
      const retained = arm.baseline.rows.find(row => row.at === admitted.at)!;
      expect(admitted.body).toEqual(retained.body);
      expect(cue(admitted, 'Z')).toEqual(cue(retained, 'Z'));
    }
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
    // The corner bit at his own admission tick and the QB threw into the window he left.
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
    for (const [arm, law] of Object.entries(pass.summary.legality)) {
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
      // A native unresolved observation is not a proved or called violation.
      // Retain the interior holding record, while allowing no called foul,
      // demonstrated violation, or record involving the scene's Z/QB/corner.
      // #353/recorded stream: OG1->DT3 at2.75, unresolved double-team exception.
      const execution = arm === 'man' ? pass.baseline : pass.alternative;
      const protectedIds = new Set([pass.summary.installed.primary.playerId,
        pass.summary.installed.actor.playerId, ...law.releases.map(r => r.passer.playerId)]);
      for (const foul of law.nativeFouls) {
        expect(foul).toMatchObject({ kind: 'holding', called: false, assessment: 'unresolved',
          evidence: { source: 'native', rule: '12-1-3(c)', action: 'achieved_grab_exception_unresolved' } });
        expect(protectedIds.has(foul.playerId)).toBe(false);
        expect(foul.evidence.victimId).toBeTypeOf('string');
        expect(protectedIds.has(foul.evidence.victimId!)).toBe(false);
        const holder = execution.execution.actors.find(a => a.actor.playerId === foul.playerId)?.actor;
        const victim = execution.execution.actors.find(a => a.actor.playerId === foul.evidence.victimId)?.actor;
        expect(holder?.team).toBe('O');
        expect(['LT', 'RT', 'C', 'LG', 'RG']).toContain(holder?.slot);
        expect(victim?.team).toBe('D');
      }
      expect(law.limitations).toEqual([]);
      expect(law.releases[0]).toMatchObject({ priorForwardThrows: 0 });
      expect(law.releases[0].velocity.x).toBeGreaterThan(0);
    }
  });

  it('shows earlier actual corner contact and tackle participation on the run', () => {
    expect(run.summary.legality.support.forwardPassRestrictionApplicable).toBe(false);
    expect(run.summary.legality.support.maxIneligibleForwardEdgeBeforeRelease).toBeNull();
    // The corner who supports reaches the runner, and before the corner who stayed in man does.
    const first = (contacts: Array<{ t: number }>) => Math.min(Infinity, ...contacts.map(e => e.t));
    const support = run.summary.legality.support.runCornerContacts, man = run.summary.legality.man.runCornerContacts;
    expect(support.some(e => e.type === 'tackle_wrap')).toBe(true);
    expect(first(support)).toBeLessThan(first(man));
    expect(run.summary.result.support.outcome).toBe('tackle');
    expect(run.alternative.execution.result.stats.tacklers).toContain('DEF-CB3');
    expect(run.summary.result.support.yards).toBeLessThan(run.summary.result.man.yards);
  });

  it('preserves same-clock abandonment geometry and names both native PA results on Z', () => {
    // Exact combined58f6c038, recorded single stream: both arms throw to Z at2.95,
    // both complete at4.50. Keep these named outcomes; do not restore #336's
    // interception by changing policy, seeds, bodies, or the throw. The cost is
    // the vacated window above and corner geometry at the same native throw.
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
    // A completion, an interception and an incompletion are different football.
    // Name both new results explicitly rather than accepting any non-incompletion.
    const kind = (arm: typeof pass.baseline) => {
      const r = arm.execution.result;
      return r.stats.interceptedBy ? 'interception' : r.stats.completed ? 'completion' : r.outcome;
    };
    // With the line read (DL flow with a run-looking line, so a play-action line fools the DL), the arms no
    // longer throw on the same clock: the baseline throws to Z at 2.85 and CB3 breaks it up; the support arm
    // throws to Z at 2.75 and completes. The geometry above is still read at the support arm's throw.
    // With run-read attention (a run-reading defender sees a blocker in front of him and in range on the ordinary
    // delay, so the man corner sees Z's blocking look on time), the results swap: the baseline throws to Z at 2.9
    // and completes; the support arm's throw to Z at 2.75 falls incomplete with no defender credited. The geometry
    // and the QB's own read of Z above carry the cost of the bite; results are named, not judged.
    // With the QB's throwing motion (load and delivery, ~0.4 s) and his timing read of the break, the baseline
    // throws to Z at 3.15 and the support arm at 2.85; both complete.
    // With the receivers' route reads and flat release (#420) as well, the baseline still throws to Z at 3.15 and
    // completes (caught at 4.75); the support arm throws to Z at 2.35, with the corner away, and it falls
    // incomplete at 3.2 with no defender credited (#420's open catch-opportunity boundary).
    // 2026-11-15, the QB's readiness without the receiver's clock (route package): a released man's break is timed
    // from when the QB sees him leave his spot plus the installed route, not from the runner's own breakTime. The
    // baseline still throws to Z at 3.15 and completes; the support arm's throw moves 2.35 -> 2.85 s and completes.
    expect(kind(pass.baseline)).toBe('completion');
    expect(pass.baseline.execution.result.stats.receiver).toBe('OFF-WR2');
    expect(kind(pass.alternative)).toBe('completion');
    expect(pass.alternative.execution.result.stats.target).toBe('OFF-WR2');
    expect(pass.alternative.execution.result.stats.passDefendedBy).toBeUndefined();
    for (const arm of [pass.baseline, pass.alternative]) expect(arm.execution.result.stats.interceptedBy).toBeUndefined();
  });
});
