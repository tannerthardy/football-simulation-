/** The responsibility ledger (src/sim/responsibility-ledger.ts): the all-blockers form of the command trace's
 * blocking-change hooks. Staged controls for the mechanism, plus recorded plays for the named cases from the
 * Phase II zone set (constructor inputs recorded at develop a5b024b9; re-record them when the source changes on
 * purpose). The M- cases are matched-restage captures of develop 55cc9e57, recorded when turning on the feet's
 * actual grip moved the S9-P027 and S7-P067 scenes. It is a recorder: nothing here grades a block. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { RunBlocker, type Combination } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
import { dutyTimeline, initialJobCensus } from '../src/sim/responsibility-views.js';
import { LOAD_PRESENT } from '../src/sim/responsibility-ledger.js';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { restoreSetup } from '../scripts/diag/saved-play.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

const input = { coverage: 'cover3_buzz', concept: 'curl_flat', seed: 1, roster: 7, formation: 'gun_doubles_11', flip: false };

/** Same staging as the command trace's blocking controls: a run blocker whose man goes down, and a neighbor. */
function fixture(options: { stable?: boolean; combination?: boolean } = {}) {
  const sim = new PlaySim(nativeTraceSetup({ ...input, concept: 'iz_strong', formation: 'ace_11' }));
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx * 3, y: 10 };
    a.body.vel = { x: 0, y: 0 };
    a.snapReadyAt = 0;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  const blocker = sim.slot('C')!, helper = sim.slot('RG')!, old = sim.slot('DT_W')!, next = sim.slot('SS')!;
  blocker.body.pos = { x: sim.los + 1, y: sim.ballY };
  old.body.pos = { x: sim.los + 3, y: sim.ballY };
  old.downUntil = options.stable ? 0 : 10;
  next.body.pos = { x: sim.los + 4, y: sim.ballY };
  sim.qb.body.pos = { x: sim.los - 4, y: sim.ballY };
  const work = new RunBlocker({ kind: options.combination ? 'combo' : 'lead', target: old, drive: { x: 1, y: 0 } });
  blocker.behavior = work;
  if (options.combination) {
    const combo: Combination = { members: [blocker, helper], defender: old, backer: null,
      released: false, secureSince: -1, nextRead: 0, soloKind: 'reach' };
    work.plan.combination = combo;
    helper.behavior = new RunBlocker({ kind: 'combo', target: old, drive: { x: 1, y: 0 }, combination: combo });
  }
  sim.t = 1; sim.world.time = 1;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  return { sim, blocker, helper, old, next };
}

describe('responsibility ledger, staged controls', () => {
  it('records a silent find-work replacement for a blocker nobody selected, changing nothing', () => {
    const execute = (record: boolean) => {
      const f = fixture();
      const ledger = record ? f.sim.recordResponsibility() : undefined;
      const reads = vi.spyOn(f.sim, 'see'), draws = vi.spyOn(Rng.prototype, 'nextU32');
      f.sim.tick();
      const counts = { reads: reads.mock.calls.length, draws: draws.mock.calls.length };
      vi.restoreAllMocks();
      return { f, ledger, counts, state: structuredClone({ bodies: f.sim.agents.map(a => a.body), minds: f.sim.agents.map(a => a.mind),
        rng: f.sim.rng, intents: f.sim.intents }), result: f.sim.buildResult() };
    };
    const off = execute(false), on = execute(true);
    expect(on.state).toEqual(off.state);
    expect(on.result).toEqual(off.result);
    expect(on.counts).toEqual(off.counts);
    expect(on.result.events.some(e => e.type === 'block_threat')).toBe(false);
    const changes = on.ledger!.data.changes;
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ actor: on.f.blocker.idx, t: 1, reason: 'available-target/find-work', fields: ['target'] });
    expect(changes[0].before).toMatchObject({ kind: 'lead', target: on.f.old.idx });
    expect(changes[0].after).toMatchObject({ kind: 'lead', target: on.f.next.idx });
  });

  it('keeps abandonment and the following replacement as a chain, for both members of the double', () => {
    const f = fixture({ combination: true });
    const ledger = f.sim.recordResponsibility();
    f.sim.tick();
    const by = (idx: number) => ledger.data.changes.filter(c => c.actor === idx);
    const c = by(f.blocker.idx), h = by(f.helper.idx);
    expect(c.map(x => x.reason)).toEqual(['combination-abandoned: original target unavailable; finding work', 'available-target/find-work']);
    expect(c[0].before.kind).toBe('combo'); expect(c[0].after.kind).toBe('reach');
    expect(c[0].fields).toEqual(expect.arrayContaining(['kind', 'combination']));
    expect(c[1].before).toEqual(c[0].after);
    expect(c[1].after).toMatchObject({ kind: 'climb', target: f.next.idx });
    // The helper's own update runs later in the same tick: abandonment first, then his own find-work, chained.
    expect(h.map(x => x.reason)).toEqual(['combination-abandoned: original target unavailable; finding work', 'available-target/find-work']);
    expect(h[1].before).toEqual(h[0].after);
    expect(ledger.data.changes.filter(x => x.reason === 'unattributed')).toEqual([]);
  });

  it('shows the selected-actor trace and the ledger the same mutation', () => {
    const f = fixture({ combination: true });
    const ledger = f.sim.recordResponsibility();
    const trace = f.sim.recordCommands({ actor: { team: 'O', slot: 'C' }, from: 1, to: 1.05 });
    f.sim.tick();
    const traced = trace.steps[0].blockingChanges!.map(c => c.reason);
    expect(traced).toEqual(ledger.data.changes.filter(c => c.actor === f.blocker.idx).map(c => c.reason));
  });

  it('leaves a stable assignment alone and a real null target null', () => {
    const f = fixture({ stable: true });
    const ledger = f.sim.recordResponsibility();
    f.sim.tick(); f.sim.tick();
    expect(ledger.data.changes).toEqual([]);
    expect(ledger.data.rows.filter(r => r.actor === f.blocker.idx)).toHaveLength(2);
    expect(ledger.data.rows[0].plan).toMatchObject({ kind: 'lead', target: f.old.idx, departure: null, combination: null });
  });

  it('records a plan written by a path no hook claims as unattributed, and keeps the initial job frozen', () => {
    const f = fixture({ stable: true });
    const ledger = f.sim.recordResponsibility();
    f.sim.tick();
    (f.blocker.behavior as RunBlocker).plan.kind = 'climb';
    f.sim.tick();
    expect(ledger.data.changes).toHaveLength(1);
    expect(ledger.data.changes[0]).toMatchObject({ reason: 'unattributed', fields: ['kind'] });
    expect(ledger.data.initialPlans.find(p => p.actor === f.blocker.idx)!.plan.kind).toBe('lead');
    expect(dutyTimeline(ledger.data).find(b => b.actor === f.blocker.idx)!.spans.map(s => s.plan.kind)).toEqual(['lead', 'climb']);
  });
});

interface Case { id: string; setup: string }
const cases = JSON.parse(readFileSync(new URL('./fixtures/responsibility-ledger-cases.json', import.meta.url), 'utf8')) as { plays: Case[] };
function play(id: string, selected?: string) {
  const setup = Buffer.from(cases.plays.find(p => p.id === id)!.setup, 'base64');
  const sim = new PlaySim(restoreSetup(setup));
  const ledger = sim.recordResponsibility();
  const trace = selected ? sim.recordCommands({ actor: { team: 'O', slot: selected }, from: 0, to: 15 }) : undefined;
  const result = sim.run();
  const d = ledger.data, slot = (i: number | null) => i === null ? null : d.actors[i].slot;
  return { sim, d, result, slot, trace, setupSha256: createHash('sha256').update(setup).digest('hex'), census: initialJobCensus(d) };
}
const changeOf = (p: ReturnType<typeof play>, actor: string, reason: string, t?: number) =>
  p.d.changes.filter(c => p.slot(c.actor) === actor && c.reason === reason && (t === undefined || c.t === t));

describe('responsibility ledger, named cases from the Phase II zone set (a5b024b9)', () => {
  it('S9-P062: C releases to LB_W, rereads to LB_M, and loads LB_M and never LB_W', () => {
    const p = play('S9-P062', 'C');
    expect(p.setupSha256).toBe('fc7f58f199912f3255588696ab79ee4b5c57cef717b550601f349412119eba81');
    const release = changeOf(p, 'C', 'combination-release', 1.05)[0];
    expect(release.after).toMatchObject({ kind: 'climb' });
    expect(p.slot(release.before.target)).toBe('DT_S'); expect(p.slot(release.after.target)).toBe('LB_W');
    const reread = changeOf(p, 'C', 'threat-reread', 1.25)[0];
    expect(p.slot(reread.before.target)).toBe('LB_W'); expect(p.slot(reread.after.target)).toBe('LB_M');
    const c = p.d.actors.findIndex(a => a.slot === 'C');
    const loaded = (slot: string) => p.d.rows.filter(r => r.actor === c).filter(r => r.hands.some(h => p.slot(h.defender) === slot && h.loaded));
    const loads = (slot: string) => loaded(slot).map(r => r.endpoint);
    // #298 changed the fatigue law: the same a5b024b9 input first loads at
    // 2.20 rather than 2.25. The ledger's contract is the actual endpoint and
    // loaded target, not preservation of that older physical arrival time.
    const first = loaded('LB_M')[0];
    expect(first).toBeDefined();
    expect(first.t).toBeGreaterThan(reread.t);
    expect(p.slot(first.plan!.target)).toBe('LB_M');
    const step = p.trace!.steps.find(s => {
      const e = s.endpoint?.engagement;
      return e?.defender.slot === 'LB_M' && e.hands
        && typeof e.hands.normalForce === 'number' && typeof e.hands.tangentForce === 'number'
        && Math.hypot(e.hands.normalForce, e.hands.tangentForce) > LOAD_PRESENT;
    })!;
    expect(step).toBeDefined();
    expect(first.endpoint).toBe(step.endpointTime);
    expect(step.stepStart).toBe(first.t);
    expect(step.endpoint!.engagement!.defender.slot).toBe('LB_M');
    const hands = step.endpoint!.engagement!.hands!;
    expect(hands.normalForce).toBeTypeOf('number');
    expect(hands.tangentForce).toBeTypeOf('number');
    const load = first.hands.find(h => p.slot(h.defender) === 'LB_M')!;
    expect(load.loaded).toBe(true);
    expect(load.magnitude).toBeGreaterThan(LOAD_PRESENT);
    expect(load.magnitude).toBe(Math.hypot(hands.normalForce!, hands.tangentForce!));
    expect(loads('LB_W')).toEqual([]);
    const job = p.census.find(j => p.slot(j.backer) === 'LB_W')!;
    // Graded against the initial job this is "no member load"; the ledger also says why.
    // On the engaged-flow law (#347) LB_W no longer reaches the carrier on this play, so the grade is '?'
    // (no load, no carrier contact) rather than 'U'; the reasons below are unchanged.
    expect(job.stratum).toBe('?');
    expect(job.responsibility).toMatchObject({ threatRereadAfterRelease: true });
    expect(job.responsibility.otherClimbTargets.map(p.slot)).toEqual(['LB_M']);
  });

  it('S10-P009: LT is given a different man with no block_threat event', () => {
    const p = play('S10-P009', 'LT');
    expect(p.setupSha256).toBe('42de46aa33a84002163f945e51d8cb279d9d4c40f9703649282eb70edfb2b678');
    // The real transition still exists after #298, one tick earlier. Locate
    // its exact semantic identity, then require both observers and the actual
    // pre/post behavior to agree on its native decision and endpoint clocks.
    const swaps = changeOf(p, 'LT', 'available-target/find-work')
      .filter(c => p.slot(c.before.target) === 'LB_M' && p.slot(c.after.target) === 'SS');
    expect(swaps).toHaveLength(1);
    const swap = swaps[0];
    expect(p.slot(swap.before.target)).toBe('LB_M'); expect(p.slot(swap.after.target)).toBe('SS');
    const step = p.trace!.steps.find(s => s.blockingChanges?.some(c => c.reason === swap.reason && c.t === swap.t))!;
    expect(step).toBeDefined();
    expect(step.stepStart).toBe(swap.t);
    const reported = step.blockingChanges!.filter(c => c.reason === swap.reason && c.t === swap.t);
    expect(reported).toHaveLength(1);
    expect(reported[0].previous.target!.slot).toBe('LB_M');
    expect(reported[0].current.target!.slot).toBe('SS');
    expect(step.start.behavior.target!.slot).toBe('LB_M');
    expect(step.endpoint!.behavior.target!.slot).toBe('SS');
    const row = p.d.rows.find(r => r.actor === swap.actor && r.t === swap.t)!;
    expect(step.endpointTime).toBe(row.endpoint);
    expect(p.slot(row.plan!.target)).toBe('SS');
    expect(p.sim.events.filter(e => e.type === 'block_threat' && p.slot(e.a ?? null) === 'LT')).toEqual([]);
  });

  it('M9-P000: C is reread, recorded with its resulting kind', () => {
    const p = play('M9-P000');
    const threats = changeOf(p, 'C', 'threat-reread');
    // Re-recorded when a draw double's uncovered man climbs once the rush comes across: RG's double releases at 1.1
    // (was 2.45), so the 2.45 crossing exchange and C's second reread (2.6) no longer happen.
    expect(threats.map(c => c.t)).toEqual([2.2]);
    expect(p.sim.events.filter(e => e.type === 'block_threat' && p.slot(e.a ?? null) === 'C')).toHaveLength(1);
    expect(threats.every(c => c.after.kind === 'drive')).toBe(true);
  });

  it('M7-P051: a released climber stays off his keeper\'s man, one defender reaches the carrier alone, and the ledger does not invent a tie', () => {
    // Re-recorded for the leg force-velocity law (PHY-1): the recorded play's contacts move by one tick (2.75 -> 2.7).
    // Re-recorded when a released climber stopped re-taking the man his keeper is on: LB_W now arrives alone at 2.9
    // (was tied with LB_M at 2.7); the tie check moved to R7-P083.
    // With the off-hip climb (#345) as well: the releases and RG's single reread are unchanged, but LB_W's 2.75
    // swipe no longer loads the carrier, so CB_S makes first contact alone at 3.3.
    const p = play('M7-P051'), first = p.census[0].firstCarrierContact!;
    // The climber property itself: RG rereads once, to the backer, and never goes back to the down man
    // (without this PR he returns to DT_S at 1.25).
    expect(changeOf(p, 'RG', 'threat-reread').map(c => [c.t, p.slot(c.before.target), p.slot(c.after.target)]))
      .toEqual([[1.45, 'NB', 'LB_M']]);
    // On the engaged-flow law (#347) as well: RG's reread is unchanged, and LB_W reaches the carrier alone at 2.75.
    expect(first.t).toBe(2.75);
    expect(first.defenders.map(p.slot)).toEqual(['LB_W']);
  });

  it('R7-P083: the first carrier contact keeps both defenders tied at 2.45', () => {
    // Gun Trips Open wide zone weak, a run-only capture: LB_M and LB_W reach the carrier on the same tick.
    const p = play('R7-P083'), first = p.census[0].firstCarrierContact!;
    expect(first.t).toBe(2.45);
    expect(first.defenders.map(p.slot).sort()).toEqual(['LB_M', 'LB_W']);
  });

  it('S8-P005: the same sample is not tied on this source, and the ledger does not invent one', () => {
    const p = play('S8-P005');
    const first = p.census[0].firstCarrierContact!;
    // Re-recorded for the leg force-velocity law (PHY-1): first contact moves 2.2 -> 2.1 and the DT_W reaches the carrier first;
    // still one defender, not a tie. The DT_W's wrap now comes with the contact (2.1; was 2.3 after the DE_W's contact).
    // Re-recorded for the engaged-flow law: 2.1 -> 2.15, still DT_W alone.
    expect(first.t).toBe(2.15);
    expect(first.defenders.map(p.slot)).toEqual(['DT_W']);
    expect(p.d.play.carrierEvents.some(e => e.t === 2.15 && p.slot(e.defender) === 'DT_W')).toBe(true);
  });

  it.each(['S8-P054'])('%s: the QB keeps it, so the carrier is the QB all play, not the scheduled RB', id => {
    const p = play(id), qb = p.d.actors.findIndex(a => a.slot === 'QB');
    expect(p.d.play.carrierByTick.filter(c => c.carrier !== null).every(c => c.carrier === qb)).toBe(true);
    expect(p.d.play.carrierEvents.length).toBeGreaterThan(0);
  });

  it('S10-P006: the QB keeps it and fumbles; the ledger follows the ball to the recovery, never to the scheduled RB', () => {
    // Re-recorded for the engaged-flow law: SS hits the QB at 4.15, the ball comes out and NB recovers.
    const p = play('S10-P006'), qb = p.d.actors.findIndex(a => a.slot === 'QB'), rb = p.d.actors.findIndex(a => a.slot === 'RB');
    const carried = p.d.play.carrierByTick.filter(c => c.carrier !== null);
    expect(carried[0].carrier).toBe(qb);
    expect(carried.some(c => c.carrier === rb)).toBe(false);
    const firstOther = carried.find(c => c.carrier !== qb);
    if (firstOther) expect(p.sim.events.some(e => e.type === 'fumble' && e.t <= firstOther.t)).toBe(true);
    expect(p.d.play.carrierEvents.length).toBeGreaterThan(0);
  });

  it.each(['S7-P029', 'S8-P004', 'S9-P039'])('%s: a prevented snap has no live jobs, and says it was censored by the snap', id => {
    const p = play(id);
    expect(p.d.play.snapPermitted).toBe(false);
    expect(p.d.play.censored).toBe('snap-prevented');
    expect(p.d.rows).toEqual([]);
    expect(p.census).toEqual([]);
  });

  it.each(['S9-P062', 'S10-P009', 'S9-P027', 'S7-P067', 'M9-P000', 'M7-P051', 'S8-P005', 'S8-P054', 'S10-P006', 'S7-P029', 'R7-P083'])('%s: recording changes nothing and no plan change goes unclaimed', id => {
    const setup = Buffer.from(cases.plays.find(p => p.id === id)!.setup, 'base64');
    const run = (record: boolean) => {
      const sim = new PlaySim(restoreSetup(setup));
      const ledger = record ? sim.recordResponsibility() : null;
      const result = sim.run();
      return { ledger, snapshot: structuredClone({ result, events: sim.events, rng: sim.rng, t: sim.t, bodies: sim.agents.map(a => [a.body.pos, a.body.vel, a.body.facing, a.body.energy]) }) };
    };
    const off = run(false), on = run(true);
    expect(on.snapshot).toEqual(off.snapshot);
    expect(on.ledger!.data.changes.filter(c => c.reason === 'unattributed')).toEqual([]);
  });
});
