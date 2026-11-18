/** Minimal staged witnesses, not restorations of audit P093/P095. The installed
 * run assignment or already-acquired receiver pictures supply target changes;
 * the production controllers emit the commands. No capacity/physics tuning. */
import { afterEach, describe, expect, it, vi, afterAll } from 'vitest';
// engine-80 (pinned test-only, Rules + Coaching's coverage landing): the zone target scenes stage a half safety re-picking his deepest vertical each tick, which HALF_OWN replaces with held membership. The file's owner to re-record with the rule on.
vi.hoisted(() => { process.env.HALF_OWN = '0'; });
afterAll(() => { delete process.env.HALF_OWN; });
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { ZoneCoverage } from '../src/sim/behaviors/defense.js';
import { track } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

const home = generateTeam(new Rng(91), 'Home', 'HOM');
const away = generateTeam(new Rng(92), 'Away', 'AWY');

function fixture(role: 'blocker' | 'zone') {
  const run = role === 'blocker';
  const sim = new PlaySim({ offense: pickOffense(home, run ? '21' : '11'), defense: pickDefense(away, 'nickel'), seed: 45,
    offCall: run
      ? { formation: FORMATION_BY_ID.i_pro_21, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'minimal lead' }
      : { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'minimal receivers' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', label: 'c3' },
    los: 40, ballY: 26, firstDownX: 50 });
  const actor = sim.slot(run ? 'F' : 'FS')!;
  const A = sim.slot(run ? 'LB_M' : 'X')!, B = sim.slot(run ? 'LB_W' : 'Z')!;
  for (const a of sim.agents) {
    a.body.pos = { x: 35, y: 3 + a.idx * 2 };
    a.body.vel = { x: 0, y: 0 }; a.downUntil = -1;
    a.snapReadyAt = 0;
  }
  sim.qb.body.pos = { x: 36, y: 26 };
  actor.body.pos = { x: run ? 44 : 54, y: 26 };
  actor.recog && (actor.recog.read = 'pass');
  actor.mind.focus = 1;
  A.body.pos = { x: 49.01, y: 20 };
  B.body.pos = { x: 49, y: 32 };
  const behavior = run
    ? new RunBlocker({ kind: 'lead', target: A, drive: { x: 1, y: 0 } })
    : new ZoneCoverage(actor, sim, 'deep_mid', 'A', 1);
  actor.behavior = behavior;
  sim.t = sim.world.time = 1;
  const acquire = () => { for (let i = 0; i < 24; i++) sim.perception.record(sim.agents); };
  acquire();
  const select = (target: typeof A) => {
    if (behavior instanceof RunBlocker) behavior.plan.target = target;
    else target.body.pos.x = Math.max(A.pos.x, B.pos.x) + .02;
    acquire();
  };
  return { sim, actor, A, B, behavior, select, acquire,
    update: () => behavior.update(actor, sim), job: run ? 'block-fit' : 'zone-drive' };
}

afterEach(() => vi.restoreAllMocks());

/** Same controllers and input pictures with the old job-only action lifetime.
 * Used only as a control; production has no feature flag or second policy. */
function legacyFixture(role: 'blocker' | 'zone') {
  const f = fixture(role);
  vi.spyOn(f.actor.mind, 'setAimTarget').mockImplementation(() => {});
  return f;
}

describe('selected target and held aim belong to the same action', () => {
  it.each(['blocker', 'zone'] as const)('%s changes direction for B instead of consuming A\'s held point', role => {
    const f = fixture(role), aim = vi.spyOn(f.actor.mind, 'aim');
    const first = f.update();
    expect(first.vel.y).toBeLessThan(0);
    expect(aim).toHaveBeenCalledWith(f.job, expect.anything(), 1);
    f.sim.t += .05;
    f.select(f.B);
    const changed = f.update();
    expect(f.behavior.target).toBe(f.B);
    expect(changed.vel.y).toBeGreaterThan(0);
    expect(f.actor.engagement).toBeNull();
    expect(f.sim.world.joints).toHaveLength(0);
  });

  it.each(['blocker', 'zone'] as const)('%s preserves same-target commands, cadence, acquisitions and RNG', role => {
    const f = fixture(role), old = legacyFixture(role);
    const aim = vi.spyOn(f.actor.mind, 'aim');
    const see = vi.spyOn(f.sim, 'see'), oldSee = vi.spyOn(old.sim, 'see');
    expect(f.update()).toEqual(old.update());
    const interval = f.actor.mind.decisionInterval;
    for (const dt of [interval / 4, interval / 2, interval * .9]) {
      for (const s of [f, old]) {
        s.sim.t = 1 + dt;
        s.A.body.pos.x += .01;
        s.select(s.A);
      }
      expect(f.update()).toEqual(old.update());
      expect(aim.mock.results.at(-1)!.value).toBe(aim.mock.results[0].value);
    }
    const calls = (spy: typeof see) => spy.mock.calls.map(([a, b, scale]) => [a.idx, b.idx, scale]);
    expect(calls(see)).toEqual(calls(oldSee));
    expect(f.sim.rng).toEqual(old.sim.rng);
    expect(f.actor.body).toEqual(old.actor.body);
  });

  it.each(['blocker', 'zone'] as const)('%s refreshes an expired same-target action at its original deadline', role => {
    const f = fixture(role), old = legacyFixture(role), aim = vi.spyOn(f.actor.mind, 'aim');
    const first = f.update(); old.update();
    for (const s of [f, old]) {
      s.sim.t = 1 + s.actor.mind.decisionInterval;
      s.A.body.pos.x += .05;
      s.select(s.A);
    }
    const expired = f.update();
    expect(expired).toEqual(old.update());
    expect(expired).not.toEqual(first);
    expect(aim.mock.results[1].value).not.toBe(aim.mock.results[0].value);
  });

  it.each(['blocker', 'zone'] as const)('%s cannot resurrect an earlier A action after A→B→A', role => {
    const f = fixture(role), fresh = legacyFixture(role);
    for (const s of [f, fresh]) {
      s.update(); s.sim.t += .05; s.select(s.B); s.update();
      s.sim.t += .05; s.A.body.pos.x += .05; s.select(s.A);
    }
    // A separate current-picture command with no held point is the oracle
    // for this new action. Other controller state/picture history is matched.
    vi.spyOn(fresh.actor.mind, 'aim').mockImplementation((_job, desired) => ({ ...desired }));
    expect(f.update()).toEqual(fresh.update());
    expect(f.behavior.target).toBe(f.A);
  });

  it.each(['blocker', 'zone'] as const)('%s cancels A even when B takes a branch that never consumes its aim', role => {
    const f = fixture(role), fresh = legacyFixture(role);
    const aim = vi.spyOn(f.actor.mind, 'aim');
    for (const s of [f, fresh]) {
      s.update(); s.sim.t += .05; s.select(s.B);
      if (s.behavior instanceof RunBlocker) s.behavior.plan.kind = 'drive';
      else { s.B.body.vel.x = 8; s.acquire(); }
    }
    const count = aim.mock.calls.length;
    expect(f.update()).toEqual(fresh.update());
    expect(f.behavior.target).toBe(f.B);
    expect(aim.mock.calls).toHaveLength(count);
    for (const s of [f, fresh]) {
      s.sim.t += .05;
      s.A.body.pos.x = 51;
      if (s.behavior instanceof RunBlocker) s.behavior.plan.kind = 'lead';
      else s.B.body.vel.x = 0;
      s.select(s.A);
    }
    vi.spyOn(fresh.actor.mind, 'aim').mockImplementation((_job, desired) => ({ ...desired }));
    expect(f.update()).toEqual(fresh.update());
    expect(f.behavior.target).toBe(f.A);
  });

  it('does not mistake an ignored block-fit return for an executed climb change', () => {
    const f = fixture('blocker'), old = legacyFixture('blocker');
    const aim = vi.spyOn(f.actor.mind, 'aim'), oldAim = vi.spyOn(old.actor.mind, 'aim');
    for (const s of [f, old]) {
      if (!(s.behavior instanceof RunBlocker)) throw new Error('blocker fixture');
      s.behavior.plan.kind = 'climb';
      s.update(); s.sim.t += .05; s.select(s.B);
    }
    expect(f.update()).toEqual(old.update());
    expect(aim.mock.results.at(-1)!.value).not.toEqual(oldAim.mock.results.at(-1)!.value);
    expect(f.actor.engagement).toBeNull();
  });

  it('keeps unregistered jobs and their emitted commands independent of target invalidation', () => {
    const f = fixture('zone'), mind = f.actor.mind;
    const point = mind.aim('force-fit', { x: 49, y: 23 }, 1);
    const expected = track(f.actor, point, { x: 0, y: 0 });
    mind.setAimTarget('zone-drive', f.A.idx);
    mind.aim('zone-drive', { x: 50, y: 20 }, 1);
    mind.setAimTarget('zone-drive', f.B.idx);
    const actual = track(f.actor, mind.aim('force-fit', { x: 53, y: 33 }, 1.05), { x: 0, y: 0 });
    expect(actual).toEqual(expected);
  });
});
