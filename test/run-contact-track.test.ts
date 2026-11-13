import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
import { supportParams } from '../src/physics/support.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

function fixture(side: number, phase: 'reach' | 'seal' | 'runoff' = 'reach') {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: side > 0, kind: 'run', run: RUN_BY_ID.wz_strong, label: 'Held reach' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over Cover 3' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  sim.t = 1; sim.world.time = 1;
  const b = sim.slot('RG')!, d = sim.slot('DT_S')!;
  const sep = b.profile.radius + d.profile.radius;
  b.body.pos = { x: 40, y: CENTER_Y + side * Math.sin(.3 * Math.PI / 2) * sep };
  d.body.pos = { x: 40.72, y: CENTER_Y };
  b.body.facing = 0; d.body.facing = Math.PI;
  const behavior = new RunBlocker({ kind: 'reach', target: d, drive: { x: 1, y: 0 } });
  b.behavior = behavior;
  // A held interpretation acquired on the preceding read; current relative
  // position temporarily reaches its offset before the next technique read.
  behavior.zoneRead = { phase, target: d.idx, side, t: .9, nextRead: 1.1,
    seen: { pos: { ...d.pos }, vel: { ...d.vel }, age: .2, carrying: null, stance: null, facing: Math.PI, pose: 'up' },
    drive: { x: 1, y: 0 }, sealTarget: side * .3, aim: { x: 40.42, y: CENTER_Y + side * .6 },
    horizon: .2, neededTravel: .3, availableTravel: .4 };
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const e = sim.engage(b, d, 'run', { x: 1, y: 0 }, { axis: { x: -1, y: 0 }, sealTarget: side * .3 });
  if (!e) throw new Error('Real hand engagement unavailable');
  e.nextMoveAt = Infinity;
  return { sim, b, d, e, behavior };
}

async function command(f: ReturnType<typeof fixture>, enabled: boolean) {
  vi.stubEnv('RUN_CONTACT_TRACK', enabled ? '1' : '0');
  vi.resetModules();
  const { updateEngagements } = await import('../src/sim/engagement.js');
  const intents = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  updateEngagements(f.sim, intents);
  return intents;
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('held reach work survives acquisition of contact', () => {
  it.each([-1, 1])('keeps asking to reach at a stationary attained offset, side=%s', async side => {
    const old = fixture(side), next = fixture(side);
    const before = structuredClone(next.b.body);
    const baseline = await command(old, false), candidate = await command(next, true);
    expect(Math.abs(baseline[old.b.idx].vel.y)).toBeLessThan(1e-9);
    expect(candidate[next.b.idx].vel.y * side).toBeGreaterThan(1);
    expect(next.b.body).toEqual(before);
    expect({ extension: next.e.hands!.extension, push: next.e.hands!.push,
      steer: next.e.hands!.steer, hold: next.e.hands!.hold }).toEqual({ extension: old.e.hands!.extension,
      push: old.e.hands!.push, steer: old.e.hands!.steer, hold: old.e.hands!.hold });
    const r = next.sim.world.step(candidate, .05);
    old.sim.world.step(baseline, .05);
    expect(next.b.vel.y * side).toBeGreaterThan(old.b.vel.y * side);
    expect(Math.hypot(r.groundImpulse[next.b.idx].x, r.groundImpulse[next.b.idx].y))
      .toBeLessThanOrEqual(r.groundImpulseLimit[next.b.idx] + 1e-8);
    expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
  });

  it.each(['seal', 'runoff'] as const)('does not force reach tempo into a held %s', async phase => {
    const old = fixture(1, phase), next = fixture(1, phase);
    expect(await command(next, true)).toEqual(await command(old, false));
  });

  it('does not reinterpret down/cutoff/drive work as a solo reach', async () => {
    for (const kind of ['down', 'cutoff', 'drive'] as const) {
      const old = fixture(1), next = fixture(1);
      old.behavior.plan.kind = kind; next.behavior.plan.kind = kind;
      expect(await command(next, true)).toEqual(await command(old, false));
    }
  });

  it('does not follow a stale read of another defender', async () => {
    const old = fixture(1), next = fixture(1);
    old.behavior.zoneRead!.target = 999; next.behavior.zoneRead!.target = 999;
    expect(await command(next, true)).toEqual(await command(old, false));
  });
});
