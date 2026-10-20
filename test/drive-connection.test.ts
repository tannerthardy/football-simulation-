import {describe, expect, it} from 'vitest';
import {contactFixture} from '../scripts/diag/run-contact-technique.js';
import {updateEngagements} from '../src/sim/engagement.js';

function rep(side: 1 | -1, ahead: number, mode: 'ordinary' | 'cleared' | 'lost' = 'ordinary') {
  const f = contactFixture({type: 'run', runBlock: 60, passBlock: 60, side});
  const {blocker: b, defender: d, engagement: e, sim} = f;
  const drive = e.drive!, across = {x: -drive.y, y: drive.x};
  const separation = b.profile.radius + d.profile.radius + .05;
  const transverse = Math.sqrt(Math.max(0, separation * separation - ahead * ahead));
  d.body.pos = {x: b.pos.x + drive.x * ahead + across.x * transverse,
    y: b.pos.y + drive.y * ahead + across.y * transverse};
  d.body.vel = {x: -1.2, y: 0};
  e.nextMoveAt = Infinity;
  if (mode === 'cleared') d.body.pos = {x: b.pos.x + 5, y: b.pos.y};
  if (mode === 'lost') b.body.facing = Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x) + Math.PI;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const before = structuredClone(sim.agents.map(a => a.body));
  const commands = sim.agents.map(a => ({vel: {x: 0, y: 0}, facing: a.facing}));
  updateEngagements(sim, commands);
  // A controller request never credits body movement before World executes it.
  expect(sim.agents.map(a => a.body)).toEqual(before);
  const command = commands[b.idx];
  return {attached: !!b.engagement, alongDrive: command.vel.x * drive.x + command.vel.y * drive.y};
}

describe('a non-stretch block follows the connected man instead of driving past him', () => {
  it.each([1, -1] as const)('keeps full drive with the man ahead, side=%s', side => {
    const result = rep(side, .6);
    expect(result.attached).toBe(true);
    expect(result.alongDrive).toBeCloseTo(2.4, 6);
  });

  it.each([1, -1] as const)('stops fixed drive away from a level downhill man, side=%s', side => {
    const result = rep(side, 0);
    expect(result.attached).toBe(true);
    expect(result.alongDrive).toBeLessThan(1);
  });

  it.each([1, -1] as const)('does not retain an unreachable connection or defeated shoulder, side=%s', side => {
    expect(rep(side, 0, 'cleared').attached).toBe(false);
    expect(rep(side, 0, 'lost').attached).toBe(false);
  });
});
