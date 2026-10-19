/** DRIVE_CONNECT (experimental, off): a drive block drives through his man,
 * not along a fixed line past him. Requests only. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { contactFixture } from '../scripts/diag/run-contact-technique.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** The fixture's run rep (drive line up and to the side), with the man staged
 * `ahead` yd in front of the blocker along that line, still in contact, and
 * coming downhill. The blocker's request along the drive line. */
async function forward(on: boolean, ahead: number, side: 1 | -1) {
  vi.stubEnv('DRIVE_CONNECT', on ? '1' : '0');
  vi.resetModules();
  const { updateEngagements } = await import('../src/sim/engagement.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side });
  const drive = f.engagement.drive!, perp = { x: -drive.y, y: drive.x };
  const sep = f.blocker.profile.radius + f.defender.profile.radius + .05;
  const across = Math.sqrt(Math.max(0, sep * sep - ahead * ahead));
  f.defender.body.pos = { x: f.blocker.pos.x + drive.x * ahead + perp.x * across, y: f.blocker.pos.y + drive.y * ahead + perp.y * across };
  f.defender.body.vel = { x: -1.2, y: 0 };
  f.engagement.nextMoveAt = 1e9;
  for (let k = 0; k < 24; k++) f.sim.perception.record(f.sim.agents);
  const intents = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  updateEngagements(f.sim, intents);
  expect(f.defender.engagement).toBeTruthy();
  const v = intents[f.blocker.idx].vel;
  return v.x * drive.x + v.y * drive.y;
}

describe('DRIVE_CONNECT', () => {
  it.each([1, -1] as const)('keeps the full drive while the man is in front of him, side=%s', async side => {
    const sep = .6;
    expect(await forward(true, sep, side)).toBeCloseTo(await forward(false, sep, side), 6);
  });

  it.each([1, -1] as const)('stops driving past a man who is level with him, side=%s', async side => {
    const off = await forward(false, 0, side), on = await forward(true, 0, side);
    expect(off).toBeGreaterThan(2);
    expect(on).toBeLessThan(1);
  });
});
