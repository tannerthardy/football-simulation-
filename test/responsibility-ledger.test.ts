/** The responsibility ledger (src/sim/responsibility-ledger.ts): the all-blockers form of the command trace's
 * blocking-change hooks. Staged controls for the mechanism, plus recorded plays for the named cases from the
 * Phase II zone set (constructor inputs recorded at develop a5b024b9; re-record them when the source changes on
 * purpose). It is a recorder: nothing here grades a block. */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { RunBlocker, type Combination } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
import { dutyTimeline, initialJobCensus } from '../src/sim/responsibility-views.js';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { restoreSetup } from '../scripts/diag/saved-play.js';

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
function play(id: string) {
  const sim = new PlaySim(restoreSetup(Buffer.from(cases.plays.find(p => p.id === id)!.setup, 'base64')));
  const ledger = sim.recordResponsibility(), result = sim.run();
  const d = ledger.data, slot = (i: number | null) => i === null ? null : d.actors[i].slot;
  return { sim, d, result, slot, census: initialJobCensus(d) };
}
const changeOf = (p: ReturnType<typeof play>, actor: string, reason: string, t?: number) =>
  p.d.changes.filter(c => p.slot(c.actor) === actor && c.reason === reason && (t === undefined || c.t === t));

describe('responsibility ledger, named cases from the Phase II zone set (a5b024b9)', () => {
  it('S9-P062: C releases to LB_W, rereads to LB_M, and loads LB_M and never LB_W', () => {
    const p = play('S9-P062');
    const release = changeOf(p, 'C', 'combination-release', 1.05)[0];
    expect(release.after).toMatchObject({ kind: 'climb' });
    expect(p.slot(release.before.target)).toBe('DT_S'); expect(p.slot(release.after.target)).toBe('LB_W');
    const reread = changeOf(p, 'C', 'threat-reread', 1.25)[0];
    expect(p.slot(reread.before.target)).toBe('LB_W'); expect(p.slot(reread.after.target)).toBe('LB_M');
    const c = p.d.actors.findIndex(a => a.slot === 'C');
    const loads = (slot: string) => p.d.rows.filter(r => r.actor === c).filter(r => r.hands.some(h => p.slot(h.defender) === slot && h.loaded)).map(r => r.endpoint);
    expect(loads('LB_M')[0]).toBe(2.25);
    expect(loads('LB_W')).toEqual([]);
    const job = p.census.find(j => p.slot(j.backer) === 'LB_W')!;
    // Graded against the initial job this is "no member load"; the ledger also says why.
    expect(job.stratum).toBe('U');
    expect(job.responsibility).toMatchObject({ threatRereadAfterRelease: true });
    expect(job.responsibility.otherClimbTargets.map(p.slot)).toEqual(['LB_M']);
  });

  it('S10-P009: LT is given a different man with no block_threat event', () => {
    const p = play('S10-P009');
    const swap = changeOf(p, 'LT', 'available-target/find-work', 1.65)[0];
    expect(p.slot(swap.before.target)).toBe('LB_M'); expect(p.slot(swap.after.target)).toBe('SS');
    expect(p.sim.events.filter(e => e.type === 'block_threat' && p.slot(e.a ?? null) === 'LT')).toEqual([]);
  });

  it('S9-P027: C is reread twice, each recorded with its resulting kind', () => {
    const p = play('S9-P027');
    const threats = changeOf(p, 'C', 'threat-reread');
    expect(threats.map(c => c.t)).toEqual([1.4, 2.65]);
    expect(p.sim.events.filter(e => e.type === 'block_threat' && p.slot(e.a ?? null) === 'C')).toHaveLength(2);
    expect(threats.every(c => c.after.kind === 'reach')).toBe(true);
  });

  it('S7-P067: the first carrier contact keeps both defenders tied at 2.5', () => {
    const first = play('S7-P067').census[0].firstCarrierContact!;
    expect(first.t).toBe(2.5);
    expect(first.defenders.map(play('S7-P067').slot).sort()).toEqual(['LB_M', 'LB_W']);
  });

  it('S8-P005: the same sample is not tied on this source, and the ledger does not invent one', () => {
    const p = play('S8-P005');
    const first = p.census[0].firstCarrierContact!;
    expect(first.t).toBe(2.2);
    expect(first.defenders.map(p.slot)).toEqual(['DT_W']);
    expect(p.d.play.carrierEvents.some(e => e.t === 2.25 && p.slot(e.defender) === 'DE_W')).toBe(true);
  });

  it.each(['S8-P054', 'S10-P006'])('%s: the QB keeps it, so the carrier is the QB all play, not the scheduled RB', id => {
    const p = play(id), qb = p.d.actors.findIndex(a => a.slot === 'QB');
    expect(p.d.play.carrierByTick.filter(c => c.carrier !== null).every(c => c.carrier === qb)).toBe(true);
    expect(p.d.play.carrierEvents.length).toBeGreaterThan(0);
  });

  it.each(['S7-P029', 'S8-P004', 'S9-P039'])('%s: a prevented snap has no live jobs, and says it was censored by the snap', id => {
    const p = play(id);
    expect(p.d.play.snapPermitted).toBe(false);
    expect(p.d.play.censored).toBe('snap-prevented');
    expect(p.d.rows).toEqual([]);
    expect(p.census).toEqual([]);
  });

  it.each(['S9-P062', 'S10-P009', 'S9-P027', 'S7-P067', 'S8-P005', 'S8-P054', 'S10-P006', 'S7-P029'])('%s: recording changes nothing and no plan change goes unclaimed', id => {
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
