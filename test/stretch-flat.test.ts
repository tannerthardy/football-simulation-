/** STRETCH_FLAT (experimental, off): a stretch reach blocker never asks his
 * feet to retreat to stay connected with an attacking defender. Only felt
 * load takes ground, and the existing lost-depth anchor answers it. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { contactFixture } from '../scripts/diag/run-contact-technique.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';

function env(flat: string) {
  vi.stubEnv('STRETCH_FLAT', flat);
  vi.stubEnv('RUN_CONTACT_COMPONENTS', '1');
  vi.stubEnv('RUN_HANDS', '0');
  vi.stubEnv('DL_HANDS', '0');
  vi.stubEnv('RUN_ANCHOR', '1');
  vi.stubEnv('ANCHOR_SPLIT', '1');
  vi.stubEnv('STRETCH_REACH', '1');
  vi.resetModules();
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** A real acquired stretch engagement in a vertical surface frame. */
async function command(flat: string, input: { normalVelocity?: number; lateralVelocity?: number; stretch?: boolean; anchor?: boolean; side?: number } = {}) {
  env(flat);
  const { updateEngagements } = await import('../src/sim/engagement.js');
  const { runContactObservers } = await import('../src/sim/run-contact-observer.js');
  const side = input.side ?? 1;
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side });
  f.sim.offCall.run = input.stretch === false ? RUN_BY_ID.iz_strong : RUN_BY_ID.wz_strong;
  f.engagement.surfaceAxis = { x: -1, y: 0 };
  f.engagement.drive = { x: .6, y: side * .8 };
  f.engagement.nextMoveAt = Infinity;
  const sep = f.blocker.profile.radius + f.defender.profile.radius;
  f.defender.body.pos = { x: f.blocker.pos.x + sep, y: f.blocker.pos.y };
  f.defender.body.vel = { x: input.normalVelocity ?? 0, y: side * (input.lateralVelocity ?? 0) };
  f.blocker.body.vel = { x: input.anchor ? -.4 : 0, y: 0 };
  f.blocker.body.support!.felt = input.anchor ? { x: -1000, y: 0 } : { x: 0, y: 0 };
  let anchored: boolean | undefined;
  runContactObservers.set(f.sim, (_e, phase, data) => { if (phase === 'movement') anchored = (data as { anchored: boolean }).anchored; });
  const intents = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  updateEngagements(f.sim, intents);
  return { vel: intents[f.blocker.idx].vel, anchored };
}

describe('STRETCH_FLAT reach blocker plays flat', () => {
  it('is off by default: the blocker follows an attacking defender backward', async () => {
    const r = await command('0', { normalVelocity: -.5, lateralVelocity: 2 });
    expect(r.vel.x).toBeCloseTo(-.5, 12);
  });

  it.each([-1, 1])('holds depth against an attacking defender and keeps the lateral race, side=%s', async side => {
    const off = await command('0', { side, normalVelocity: -.5, lateralVelocity: 2 });
    const on = await command('1', { side, normalVelocity: -.5, lateralVelocity: 2 });
    expect(on.anchored).toBe(false);
    expect(on.vel.x).toBe(0);
    expect(on.vel.y).toBeCloseTo(off.vel.y, 12);
  });

  it('still follows a defender moving away (closing the connection)', async () => {
    const off = await command('0', { normalVelocity: .7 });
    const on = await command('1', { normalVelocity: .7 });
    expect(on.vel).toEqual(off.vel);
  });

  it('leaves the felt lost-depth anchor in charge when he is actually driven back', async () => {
    const on = await command('1', { anchor: true, normalVelocity: -.5, lateralVelocity: 2 });
    expect(on.anchored).toBe(true);
    expect(on.vel.x).toBeCloseTo(2.4, 12);
  });

  it('does not change a vertical (inside zone) block', async () => {
    const off = await command('0', { stretch: false, normalVelocity: -.5 });
    const on = await command('1', { stretch: false, normalVelocity: -.5 });
    expect(on.vel).toEqual(off.vel);
  });
});
