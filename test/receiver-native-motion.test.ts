import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIELD_WIDTH } from '../src/core/field.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
import { restoreSetup } from '../scripts/diag/saved-play.js';

// Receiver eligibility on native snaps with installed pre-snap motion, each as
// captured and mirrored (formation flip, ball spot reflected). Gap runs keep
// their receiver ledger; zone runs take a non-secondary man only in reach; a
// man standing on the front is the core's.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/receiver-native-motion.json', import.meta.url), 'utf8'));
function scene(id: string, mirror: boolean) {
  const setup = restoreSetup(Buffer.from(fixture.plays.find((p: { id: string }) => p.id === id).setup, 'base64'));
  if (mirror) { setup.offCall = { ...setup.offCall, flip: !setup.offCall.flip }; setup.ballY = FIELD_WIDTH - setup.ballY; }
  const sim = new PlaySim(setup);
  const stalk = (slot: string) => { const b = sim.slot(slot)!.behavior as RunBlocker; expect(b.plan.kind).toBe('stalk'); return b.plan.target?.slot; };
  const owners = (slot: string) => sim.offense.filter((a) => a.behavior instanceof RunBlocker && [a.behavior.plan.target, a.behavior.plan.climbTo,
    a.behavior.plan.combination?.backer].includes(sim.slot(slot)!)).map((a) => a.slot);
  return { sim, stalk, owners };
}

describe('receiver eligibility on native snaps with installed motion', () => {
  it('S9-P056 Gun Wing trap, Z in jet motion: the gap ledger keeps the unowned backer across the ball', () => {
    // Z is already moving toward LB_W (y velocity -6.8 yd/s); no lineman or puller owns him.
    const { sim, stalk, owners } = scene('S9-P056', false);
    expect(sim.slot('Z')!.vel.y * Math.sign(sim.slot('LB_W')!.pos.y - sim.slot('Z')!.pos.y)).toBeGreaterThan(5);
    expect(stalk('Z')).toBe('LB_W');
    expect(owners('LB_W')).toEqual(['Z']);
  });
  it('S9-P056 mirrored: the backer is still owned by a receiver (the crack), no front man to an outside receiver', () => {
    const { owners, sim } = scene('S9-P056', true);
    expect(owners('LB_W').length).toBe(1);
    for (const a of sim.offense) {
      const p = a.behavior instanceof RunBlocker ? a.behavior.plan : null;
      if (p?.kind === 'stalk' && p.target) expect(['DT_S', 'DT_W', 'NT']).not.toContain(p.target.slot);
    }
  });
  it.each([false, true])('S7-P001 Gun Trips outside zone, H across motion: Z 18.8 yd wide stalks the corner over him, not a backer 17 yd inside (mirror=%s)', (mirror) => {
    const { stalk } = scene('S7-P001', mirror);
    expect(stalk('Z')).toBe('CB_S');
  });
  it.each([false, true])('S7-P107 Gun Bunch counter, H return motion: X does not cross to the backer walked up on the line over the center (mirror=%s)', (mirror) => {
    const { stalk, sim } = scene('S7-P107', mirror);
    const lbm = sim.slot('LB_M')!;
    expect(Math.abs(lbm.pos.x - sim.los)).toBeLessThan(1.8);
    expect(stalk('X')).not.toBe('LB_M');
    // Engine-70: the backside X, 8 yd split with the man corner pressed over him at 2.5 yd, stalks that corner (the rule
    // receiver-run-eligibility asserts: a receiver split wide stalks the corner over him); on engine-61 he took the
    // middle safety 11.5 yd deep.
    expect(stalk('X')).toBe('CB_W');
  });
});
