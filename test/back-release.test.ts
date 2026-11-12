import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength: .55 });

/** Stick (back: 'check') from gun doubles against a call; the back's job after the first tick. */
async function backOn(env: string | undefined, personnel: 'nickel' | 'dime', coverage: 'cover3' | 'cover2', concept = 'stick', menu = false) {
  vi.resetModules();
  if (env === undefined) delete process.env.BACK_RELEASE; else process.env.BACK_RELEASE = env;
  if (menu) process.env.CONCEPT_MENU = '1'; else delete process.env.CONCEPT_MENU;
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { RouteRunner } = await import('../src/sim/behaviors/receiver.js');
  const formation = FORMATION_BY_ID.gun_doubles_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, personnel),
    offCall: { formation, kind: 'pass', flip: false, pass: PASS_BY_ID[concept], label: concept },
    defCall: { personnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: 'call' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, record: false });
  sim.tick();
  const b = sim.slot('RB')!.behavior as any;
  return { kind: b.kind as string, route: b instanceof RouteRunner ? b.route.id as string : null, check: !!b.passOption };
}

afterEach(() => { delete process.env.BACK_RELEASE; delete process.env.CONCEPT_MENU; vi.resetModules(); });

describe('BACK_RELEASE: the protection count decides whether the back checks or releases', () => {
  it('a full nickel box (more than the five linemen) keeps him in to check', async () => {
    const b = await backOn('1', 'nickel', 'cover3');
    expect(b.kind).toBe('pass-pro');
    expect(b.check).toBe(true);
  });

  it('a light dime box sends him out from the snap, into the flat on his side or an angle', async () => {
    const b = await backOn('1', 'dime', 'cover2');
    expect(b.route).not.toBeNull();
    expect(['back_flat', 'angle']).toContain(b.route);
  });

  it("with CONCEPT_MENU a concept that names the back's route gives it; the release still decides whether he is free", async () => {
    // hitch_out names the back's out; double_outs his angle (src/playbook/concepts.ts MENU_CONCEPTS).
    const free = await backOn('1', 'dime', 'cover2', 'hitch_out', true);
    expect(free.route).toBe('back_out');
    const angle = await backOn('1', 'dime', 'cover2', 'double_outs', true);
    expect(angle.route).toBe('angle');
    // A full box still keeps him in to check first; his route after the check is the concept's.
    const kept = await backOn('1', 'nickel', 'cover3', 'hitch_out', true);
    expect(kept.kind).toBe('pass-pro');
    expect(kept.check).toBe(true);
  });

  it('with the flag off the installed check-release is unchanged against either box', async () => {
    for (const [p, c] of [['nickel', 'cover3'], ['dime', 'cover2']] as const) {
      const b = await backOn('0', p, c);
      expect(b.kind).toBe('pass-pro');
      expect(b.check).toBe(true);
    }
  });
});
