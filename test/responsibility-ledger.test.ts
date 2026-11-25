/** The responsibility ledger (src/sim/responsibility-ledger.ts): the all-blockers form of the command trace's
 * blocking-change hooks. Staged controls for the mechanism, plus recorded plays for the named cases from the
 * Phase II zone set (constructor inputs recorded at develop a5b024b9; re-record them when the source changes on
 * purpose). The M- cases are matched-restage captures of develop 55cc9e57, recorded when turning on the feet's
 * actual grip moved the S9-P027 and S7-P067 scenes; M25-P032, M13-P086 and M29-P036 are captures of develop 1ec115c7,
 * recorded when the start law (#336) moved M9-P000, M7-P051 and S10-P006; M25-P021 and M25-P029 are captures of #336
 * with develop 84af7d9e merged, recorded when that merge moved M25-P032 and M13-P086. It is a recorder: nothing here grades a block. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { RunBlocker, type Combination } from '../src/sim/behaviors/blocking.js';
import { BLOCK_FRAME } from '../src/sim/engagement.js';
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
    // With the start law (#336), the back's own mesh start (#344) and the off-hip climb (#362), C released at 1.0 and
    // reached LB_W without a reread. With the direction-free start (#353) as well he releases at 0.95 and rereads at
    // 1.35 again; the release/reread/load contract is also on M10-P081 below. With the squeeze read (DL_SQUEEZE from
    // a seen carrier's track) as well, the release comes at 1.05 and the reread at 1.25; C still loads LB_M first.
    // With the line read (a puller or zone step seen from the line feeding the squeeze, and the keyed flat step),
    // the DT flows with the zone step: the release comes at 1.4 and the reread at 1.6; C still loads LB_M first.
    const release = changeOf(p, 'C', 'combination-release', 1.4)[0];
    expect(release.after).toMatchObject({ kind: 'climb' });
    expect(p.slot(release.before.target)).toBe('DT_S'); expect(p.slot(release.after.target)).toBe('LB_W');
    const reread = changeOf(p, 'C', 'threat-reread', 1.6)[0];
    expect(p.slot(reread.before.target)).toBe('LB_W'); expect(p.slot(reread.after.target)).toBe('LB_M');
    const c = p.d.actors.findIndex(a => a.slot === 'C');
    const loaded = p.d.rows.filter(r => r.actor === c && r.t > release.t).flatMap(r => r.hands.filter(h => h.loaded).map(h => p.slot(h.defender)));
    expect(loaded[0]).toBe('LB_M'); expect(loaded).not.toContain('LB_W');
  });

  it('M10-P081: C releases to LB_W, rereads to LB_M, and loads LB_M and never LB_W', () => {
    // The release/reread/load contract S9-P062 carried until the off-hip climb (#362) on top of #336 + #344.
    const p = play('M10-P081', 'C');
    expect(p.setupSha256).toBe('d9fe5799b8485ffa6108a407a9335f3d4a62a3a98f1efc49fc2766ebedb61988');
    // With the line read (a puller or zone step seen from the line feeding the squeeze, and the keyed flat step): release 1.3, reread 1.5.
    // With the box backer reading before he moves and filling to a pull he sees: release 1.5, reread 1.7.
    const release = changeOf(p, 'C', 'combination-release', 1.5)[0];
    expect(release.after).toMatchObject({ kind: 'climb' });
    expect(p.slot(release.before.target)).toBe('DT_S'); expect(p.slot(release.after.target)).toBe('LB_W');
    const reread = changeOf(p, 'C', 'threat-reread', 1.7)[0];
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
    // Graded against the initial job there is no member load; the ledger also says why. With run-read
    // attention (a defender who has read run sees a blocker in front of him and in range on the ordinary
    // delay), DT_S tackles at 3.1 and LB_W never contacts the carrier, so the job is '?' rather than 'U'.
    // BLOCK_FRAME (a released defender re-blocked only from in front of his path, inside his frame): LB_W is not
    // re-blocked from outside his frame and reaches the carrier, so the job is 'U' (no member load, a carrier contact).
    expect(job.stratum).toBe(BLOCK_FRAME ? 'U' : '?');
    expect(job.responsibility).toMatchObject({ threatRereadAfterRelease: true });
    expect(job.responsibility.otherClimbTargets.map(p.slot)).toEqual(['LB_M']);
  });

  it('S9-P027: LT is given a different man with no block_threat event', () => {
    // Re-recorded for the start law (#336): on S10-P009 the LT now releases to a reach on DT_S and is never handed
    // another man. On S9-P027, from the same zone set, he is: DE_S to SS by find-work at 1.05, no block_threat.
    const p = play('S9-P027', 'LT');
    expect(p.setupSha256).toBe('52613bab7cabed1d9eaadf3e0fc14d52b2155a75a84b5749c48bbaa5cb994cbc');
    // Locate the transition's exact semantic identity, then require both observers and the actual
    // pre/post behavior to agree on its native decision and endpoint clocks.
    const swaps = changeOf(p, 'LT', 'available-target/find-work')
      .filter(c => p.slot(c.before.target) === 'DE_S' && p.slot(c.after.target) === 'SS');
    expect(swaps).toHaveLength(1);
    const swap = swaps[0];
    expect(p.slot(swap.before.target)).toBe('DE_S'); expect(p.slot(swap.after.target)).toBe('SS');
    const step = p.trace!.steps.find(s => s.blockingChanges?.some(c => c.reason === swap.reason && c.t === swap.t))!;
    expect(step).toBeDefined();
    expect(step.stepStart).toBe(swap.t);
    const reported = step.blockingChanges!.filter(c => c.reason === swap.reason && c.t === swap.t);
    expect(reported).toHaveLength(1);
    expect(reported[0].previous.target!.slot).toBe('DE_S');
    expect(reported[0].current.target!.slot).toBe('SS');
    expect(step.start.behavior.target!.slot).toBe('DE_S');
    expect(step.endpoint!.behavior.target!.slot).toBe('SS');
    const row = p.d.rows.find(r => r.actor === swap.actor && r.t === swap.t)!;
    expect(step.endpointTime).toBe(row.endpoint);
    expect(p.slot(row.plan!.target)).toBe('SS');
    // Re-recorded when the back began leaving the mesh on his own start: LT
    // later rereads a threat (1.95), after this swap; the swap itself is silent.
    expect(p.sim.events.filter(e => e.type === 'block_threat' && p.slot(e.a ?? null) === 'LT' && e.t <= swap.t)).toEqual([]);
  });

  it('M9-P000: RG is reread, and each reread is recorded with its resulting kind', () => {
    // Re-recorded for the start law (#336): M9-P000's C is now reread once (1.8). M25-P032 carried the case on
    // develop 1ec115c7; with develop 84af7d9e merged (the draw double's uncovered man climbs, the departing guard
    // steps off the DT's hip) its C is not reread at all, so M25-P021 carried it (C at 1.7 and 2.65). On #336 + #344
    // with the along-route crease read (#366) M25-P021's C is reread once (1.7), so M29-P036 carries it: LG, released
    // from the DT_W double to climb, is reread to reach LB_W at 2.25 and, climbing again, to SS at 3.75. With the
    // direction-free start (#353) LG releases from DT_W at 1.45 to climb to SS and is reread once, to reach LB_W, at 2.05.
    // With the box backer reading before he moves and filling to a pull he sees, M29-P036's LG is no longer reread
    // (its SS->LB_W reach at 2.05 disappears; that play's ending moves -0.09 -> 12.89 yd, first contact 3.15 -> 5.20,
    // kept as an adverse outcome, not attributed). S8-P005 carries the case: RT, climbing to SS, is
    // reread to LB_M at 2.15 (still a climb) and to LB_W at 2.65, where the resulting kind is a drive.
    // With the Cover 3 hook seats assigned by least total distance (the Mike to the middle hook, the Will to
    // the weak hook, no longer crossing), S8-P005's RT is not reread. M9-P000 carries the case: RG, climbing
    // to SS, is reread to LB_M at 1.7 (still a climb) and to LB_W at 2.1, where the resulting kind is a draw.
    const p = play('M9-P000');
    const threats = changeOf(p, 'RG', 'threat-reread');
    // With develop 8696d32a merged (the backer read step and line flow, a climber releasing a held backer), RG is
    // reread to LB_W at 1.7 and, climbing again, to SS at 2.7; both resulting kinds are climbs.
    expect(threats.map(c => c.t)).toEqual([1.7, 2.7]);
    expect(p.sim.events.filter(e => e.type === 'block_threat' && p.slot(e.a ?? null) === 'RG').map(e => e.t)).toEqual([1.7, 2.7]);
    expect(threats.map(c => [p.slot(c.before.target), p.slot(c.after.target), c.after.kind])).toEqual([['SS', 'LB_W', 'climb'], ['LB_M', 'SS', 'climb']]);
  });

  it('R9-P020: one defender reaches the carrier first, and the ledger does not invent a tie', () => {
    // A run-only capture of develop db6bc472, recorded for #336 + #344 with develop 90daa454 (#362) merged, when
    // M7-P051 stopped tying: LB_M and LB_W reached the carrier on the same tick (2.55). With the direction-free
    // start (#353), DT_W and LB_M tied at 2.45. With the squeeze read (DL_SQUEEZE from a seen carrier's track) the run
    // goes further and CB_S alone makes first contact at 5.05, wrapping with it. With receivers blocking the man in
    // reach of them, Z stalks CB_S pressed over him instead of crossing 4.7 yd inside to SS; CB_S is still alone
    // first, at 6.35, wrapping. The natural tie is on M25-P032; the census rule itself is pinned on the staged case below.
    // With the line read (a puller or zone step seen from the line feeding the squeeze, and the keyed flat step) as
    // well, DT_W alone makes first contact at 3.1, wrapping with it. With the box backer reading before he moves and filling to a pull he sees,
    // SS alone at 3.45, wrapping with it.
    const p = play('R9-P020'), first = p.census[0].firstCarrierContact!;
    expect(first.t).toBe(3.45);
    expect(first.defenders.map(p.slot)).toEqual(['SS']);
  });

  it('M7-P051: one defender reaches the carrier first, and the ledger does not invent a tie', () => {
    // Re-recorded for the leg force-velocity law (PHY-1): the recorded play's contacts move by one tick (2.75 -> 2.7).
    // It carried the tie (LB_M + LB_W at 2.45) on #336 + #344 + #347; with the off-hip climb (#362) LB_W arrives
    // alone at 2.85 (still on develop 510f7a6a); with the direction-free start (#353), DE_S alone at 2.65.
    // With achievable carrier clearance (#381), the RB passes the RT instead of braking at 1.95. The native
    // DE_S contact no longer occurs; CB_S is alone at 3.25. With the containment bound holding an engaged edge's
    // read flow (RUN-18) as well, LB_W makes first contact alone at 2.85 (CB_S wraps later, at 3.35). With
    // receivers blocking the man in reach of them, X (10.4 yd out) stalks CB_W over him instead of crossing 8.4 yd
    // to LB_M, and LB_W is alone at 2.9. The recorded input and single-defender contract stay. The tie is on R9-P020.
    // #349's climber property is on M10-P081 below.
    // With the line read (a puller or zone step seen from the line feeding the squeeze, and the keyed flat step) as
    // well, LB_W is still alone at 2.9. With the box backer reading before he moves and filling to a pull he sees, LB_W alone at 3.0.
    // With run-read attention (a blocker in front of a run-reading defender and in range is seen on the ordinary
    // delay), DE_S alone at 2.85; with his picture judged from what he saw and held rather than rewound when the
    // blocker leaves his range, and the edge key held across a down step (#389), DE_S alone at 2.65.
    // With the offset back aligned away from the play taking the ball as he crosses the QB's face (wide zone strong,
    // back 2.3 yd weak), he arrives 0.6-0.8 yd further downhill at 1.6-1.8 s, where DT_S has driven C a yard into the
    // backfield: DT_S alone at 1.9 (a body collision after his missed tackle at 1.75), where on develop he missed at 1.9.
    // Merged with develop's wing at its tracked width (#395), DT_S alone at 1.85. With #406 (a box backer drops only
    // when sure enough of pass; underneath zone holds over a back behind the line), DE_S alone at 2.55. With the carrier
    // judging defenders from what he sees of them (2026-11-17 carrier-honest: size-judged speed and recovery, no hidden
    // profile), DT_S alone at 1.85.
    const p = play('M7-P051'), first = p.census[0].firstCarrierContact!;
    expect(first.t).toBe(1.85);
    expect(first.defenders.map(p.slot)).toEqual(['DT_S']);
  });

  it('first carrier contact: every defender at the earliest timestamp, and only those', () => {
    // A recorded tie moves with every behaviour change: R7-P083 tied at 2.45, then R7-P075 at 3.45, and each lost
    // it under a later read change. The census rule is what this case pins, so the tie is staged on a recorded
    // play's actors and jobs with an explicit event list (no native events, so a future natural tie cannot leak
    // in): two defenders at the first timestamp, a third 0.05 s later.
    const p = play('R7-P083'), d = structuredClone(p.d);
    const def = d.actors.filter(a => a.team === 'D').map(a => a.idx), t0 = 2;
    d.play.carrierEvents = [
      { t: t0 + 0.05, type: 'tackle_wrap', defender: def[2], carrier: null },
      { t: t0, type: 'hit', defender: def[0], carrier: null },
      { t: t0, type: 'hit', defender: def[1], carrier: null },
    ];
    const tied = initialJobCensus(d)[0].firstCarrierContact!;
    expect(tied.t).toBe(t0);
    expect(new Set(tied.defenders)).toEqual(new Set([def[0], def[1]]));
  });

  it('M10-P081: a released climber rereads to a backer and stays off the man his keeper is on', () => {
    // A matched-restage capture of develop db6bc472 (Pistol Doubles outside zone vs wide 9), recorded for the start
    // law (#336) with #344 and #347 merged, when M10-P004's double stopped releasing. C releases from DT_S to LB_W
    // at 1.45 and rereads once, to LB_M, at 1.65; without #349's keeper-contact check that reread goes back to DT_S.
    const p = play('M10-P081');
    expect(changeOf(p, 'C', 'combination-release').map(c => [c.t, p.slot(c.before.target), p.slot(c.after.target)]))
      .toEqual([[1.5, 'DT_S', 'LB_W']]);
    // The contract is the release-reread before the ball arrives. With a one-armed grab from inside a block
    // (ONE_ARM_HOLD, #412) DT_S's hold at 3.1 is broken at 3.75 and the run goes on to 5.55 (3.39 yd, was -0.55);
    // C rereads again at 4.7 (LB_M -> LB_W), after first carrier contact, which this contract does not cover.
    const contact = p.census[0].firstCarrierContact!.t;
    expect(changeOf(p, 'C', 'threat-reread').filter(c => c.t < contact).map(c => [c.t, p.slot(c.before.target), p.slot(c.after.target)]))
      .toEqual([[1.7, 'LB_W', 'LB_M']]);
    // With the direction-free start (#353), after first carrier contact (3.05) C and his keeper RG exchange crossing
    // men at 3.2: RG climbs to LB_M and C takes DT_S, which RG has just left. That is the keeper handing DT_S over,
    // not a reread back onto the man his keeper is on; every other change keeps C off DT_S.
    // With the line read (a puller or zone step seen from the line feeding the squeeze, and the keyed flat step):
    // C releases at 1.3 and rereads at 1.5; his only later change is a crossing exchange onto DT_W at 2.95, and
    // no change ever puts him back on DT_S. With the box backer reading before he moves and filling to a pull he sees, C releases at 1.5 and rereads at 1.7, and
    // still no change puts him back on DT_S.
    // With a one-armed grab from inside a block (ONE_ARM_HOLD, #412) the run goes on to 5.55, and after the broken
    // tackle C and his keeper exchange crossing men at 4.9-5.4; at 4.95 the exchange hands him DT_S, which the keeper
    // has left. As above, a crossing exchange is the keeper handing his man over, so the contract is that no other
    // change (a release or a reread) ever puts C back on DT_S.
    expect(p.d.changes.filter(c => p.slot(c.actor) === 'C' && c.t > 1.5 && p.slot(c.after.target) === 'DT_S'
      && c.reason !== 'crossing-exchange').map(c => [c.t, c.reason])).toEqual([]);
  });

  it('M25-P032: the first carrier contact records every defender at that tick', () => {
    // A capture of develop 1ec115c7 for the start law (#336). With #344 it carried the tie (LB_M + NB at 2.25); with
    // the engaged-flow law (#347) as well NB arrives alone at 2.3. With the direction-free start (#353) LB_M and NB
    // tie again, at 2.35 (a second recorded tie beside R9-P020; the census rule itself is pinned on the staged case).
    const p = play('M25-P032'), first = p.census[0].firstCarrierContact!;
    // With the box backer reading before he moves and filling to a pull he sees, LB_M and NB still tie, at 2.4.
    expect(first.t).toBe(2.4);
    expect(first.defenders.map(p.slot).sort()).toEqual(['LB_M', 'NB']);
  });

  it('R7-P083: the same sample is not tied under the start law, and the ledger does not invent one', () => {
    // Gun Trips Open wide zone weak, a run-only capture: LB_M and LB_W reached the carrier on the same tick (2.45) on
    // develop. With the start law (#336) RG releases at 1.7 and his climb reaches LB_W at 2.45, so CB_W makes first
    // contact alone at 2.5; with the back's own mesh start (#344) and the engaged-flow law (#347) as well, CB_W
    // alone at 2.55; with the direction-free start (#353), CB_W alone at 2.85. With achievable carrier clearance
    // (#381), the RB passes the LT at 1.5 and LB_W is alone at 3.0. The later RB-Z collision under a tackle bond
    // remains an adverse physical outcome, not a contact-free guarantee. The tie is carried by R9-P020.
    // With the line read (a puller or zone step seen from the line feeding the squeeze, and the keyed flat step) as well,
    // CB_W alone at 3.25. With run-read attention as well, DE_W alone at 2.95; judged from his held picture and with
    // #389's edge key, DE_W alone at 2.9.
    // With underneath zone defenders holding depth over a back still behind the line before the throw
    // (flatThreat 'hold'), DE_W misses at 2.9 and CB_W is alone at 3.35.
    const p = play('R7-P083'), first = p.census[0].firstCarrierContact!;
    expect(first.t).toBe(3.35);
    expect(first.defenders.map(p.slot)).toEqual(['CB_W']);
  });

  it('S8-P005: the same sample is not tied on this source, and the ledger does not invent one', () => {
    const p = play('S8-P005');
    const first = p.census[0].firstCarrierContact!;
    // Re-recorded for the leg force-velocity law (PHY-1): first contact moves 2.2 -> 2.1 and the DT_W reaches the carrier first;
    // still one defender, not a tie. The DT_W's wrap now comes with the contact (2.1; was 2.3 after the DE_W's contact).
    // Re-recorded for the start law (#336): the run gets further, and LB_W alone makes first contact at 2.6, wrapping
    // with it; still one defender, not a tie. With develop 84af7d9e merged the run gets further still: CB_W alone
    // makes first contact at 3.45; still not a tie. With the back's own mesh start (#344) and the engaged-flow law
    // (#347) as well, LB_W alone at 2.95; still not a tie. With the along-route crease read (#366) as well, LB_W
    // alone at 3.1; still not a tie. With the support contact face (#363) as well, LB_M works off RG's climb across
    // RG's face from 2.2, carrying RG ~0.1 yd off the line LB_W rubbed him on at 2.55; LB_W clears RG, keeps his
    // pursuit angle and alone makes first contact at 2.9 (the back's path is unchanged until then); still not a tie.
    // With the direction-free start (#353) as well, DT_W alone at 2.15, wrapping with the contact; still not a tie.
    // With the squeeze read (DL_SQUEEZE from a seen carrier's track) as well, the run scores and FS alone makes first
    // contact at 3.85, wrapping with it; still not a tie. With the line read (a puller or zone step seen from the line feeding the squeeze, and the keyed flat step)
    // as well, LB_W alone at 3.0, wrapping with it (5.4 yd, not a score); still not a tie. With the box backer reading before he moves and filling to a pull he sees
    // as well, DT_W alone makes first contact at 2.75, a hit without a wrap; SS wraps first, at 4.25; still not a tie.
    // With a climber releasing a held backer who has run under him and he can no longer meet (C leaves LB_W for FS at
    // 2.35), first contact is unchanged and SS wraps first at 4.0 (3.95 yd, was 2.4).
    // With the Cover 3 hook seats no longer crossed (Mike middle, Will weak), DT_W alone at 2.75 and wraps with
    // the contact; still not a tie. With a released player deciding again in the step his block ends
    // (RELEASE_REDECIDE, #410), one tick later: DT_W alone at 2.8, wrapping with it (RELEASE_REDECIDE=0: 2.75).
    expect(first.t).toBe(2.8);
    expect(first.defenders.map(p.slot)).toEqual(['DT_W']);
    expect(p.d.play.carrierEvents.find(e => e.type === 'tackle_wrap')).toMatchObject({ t: 2.8 });
    expect(p.slot(p.d.play.carrierEvents.find(e => e.type === 'tackle_wrap')!.defender)).toBe('DT_W');
  });

  // With the back leaving the mesh on his own start (#344), these former QB keeps (S8-P054 and S10-P006 on develop,
  // M29-P036 captured for the start law #336) are completed gives: the back runs through the QB's pocket only with
  // the QB there, and the ledger follows the ball across the exchange.
  it.each(['S8-P054', 'S10-P006', 'M29-P036'])('%s: the carrier is the QB until the handoff, then the RB', id => {
    // These were exchanges the QB kept after the back ran past outside his
    // reach. The back now runs through the QB's pocket only with the QB there,
    // so the give completes; the ledger follows the ball across it.
    const p = play(id), qb = p.d.actors.findIndex(a => a.slot === 'QB'), rb = p.d.actors.findIndex(a => a.slot === 'RB');
    const h = p.sim.handoffAt, carried = p.d.play.carrierByTick.filter(c => c.carrier !== null);
    expect(h).toBeGreaterThan(0);
    expect(carried.filter(c => c.t < h).every(c => c.carrier === qb)).toBe(true);
    expect(carried.filter(c => c.t > h).every(c => c.carrier === rb)).toBe(true);
    expect(p.d.play.carrierEvents.length).toBeGreaterThan(0);
  });

  it.each(['S7-P029', 'S8-P004', 'S9-P039'])('%s: a prevented snap has no live jobs, and says it was censored by the snap', id => {
    const p = play(id);
    expect(p.d.play.snapPermitted).toBe(false);
    expect(p.d.play.censored).toBe('snap-prevented');
    expect(p.d.rows).toEqual([]);
    expect(p.census).toEqual([]);
  });

  it.each(['S9-P062', 'S10-P009', 'S9-P027', 'S7-P067', 'M9-P000', 'M7-P051', 'M25-P032', 'M13-P086', 'M29-P036', 'M25-P021', 'M25-P029', 'M10-P004', 'M10-P081', 'R9-P020', 'S8-P005', 'S8-P054', 'S10-P006', 'S7-P029', 'R7-P083', 'R7-P075'])('%s: recording changes nothing and no plan change goes unclaimed', id => {
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
