import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Intent } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(41), 'Flow offense', 'FO', { strength: .55 });
const defense = generateTeam(new Rng(42), 'Flow defense', 'FD', { strength: .55 });

/** A covered RG two yards from a head-up, stationary DT after the snap. */
function zoneRep(run: string, flip: boolean) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5,
  });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
  }
  const blocker = sim.slot('RG')!, defender = sim.slot('DT_S')!;
  blocker.body.pos = { x: 39.4, y: CENTER_Y + 1.3 };
  defender.body.pos = { x: 41.4, y: CENTER_Y + 1.3 };
  blocker.body.facing = 0; defender.body.facing = Math.PI;
  sim.t = sim.world.time = 1;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const behavior = new RunBlocker({ kind: 'reach', target: defender, drive: { x: .7, y: .7 } });
  blocker.behavior = behavior;
  const ps = (RUN_BY_ID[run].direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign);
  return { sim, blocker, defender, behavior, ps };
}

describe('zone linemen run the track before contact', () => {
  it.each(['oz_strong', 'wz_strong', 'iz_strong'])('%s moves toward the play side from a head-up start', run => {
    const f = zoneRep(run, false);
    const c = f.behavior.update(f.blocker, f.sim) as Intent;
    expect(c.vel.y * f.ps).toBeGreaterThan(1);
    expect(Math.hypot(c.vel.x, c.vel.y)).toBeLessThanOrEqual(f.blocker.profile.vmax + 2.5 + 1e-9);
    expect(f.blocker.engagement).toBeNull();
  });

  it('presses inside zone less hard than it runs outside zone', () => {
    const oz = zoneRep('oz_strong', false), iz = zoneRep('iz_strong', false);
    const a = oz.behavior.update(oz.blocker, oz.sim) as Intent, b = iz.behavior.update(iz.blocker, iz.sim) as Intent;
    expect(Math.abs(a.vel.y)).toBeGreaterThan(Math.abs(b.vel.y));
  });

  it('flows the other way when the call is flipped', () => {
    const r = zoneRep('oz_strong', false), l = zoneRep('oz_strong', true);
    const a = r.behavior.update(r.blocker, r.sim) as Intent, b = l.behavior.update(l.blocker, l.sim) as Intent;
    expect(Math.sign(a.vel.y)).toBe(r.ps);
    expect(Math.sign(b.vel.y)).toBe(l.ps);
    expect(r.ps).toBe(-l.ps);
  });

  it('leaves gap schemes and doubles to their own technique', () => {
    const f = zoneRep('power', false);
    const c = f.behavior.update(f.blocker, f.sim) as Intent;
    // Power's covered reach keeps the ordinary first-step/attack request.
    expect(Math.abs(c.vel.y)).toBeLessThan(f.blocker.profile.vmax * .45);
  });
});
