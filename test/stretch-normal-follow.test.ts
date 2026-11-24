import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vec2 } from '../src/core/vec.js';
import { contactFixture } from '../scripts/diag/run-contact-technique.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';

beforeEach(() => {
  vi.stubEnv('RUN_CONTACT_COMPONENTS', '1');
  vi.stubEnv('RUN_HANDS', '0');
  vi.stubEnv('DL_HANDS', '0');
  vi.stubEnv('RUN_ANCHOR', '1');
  vi.stubEnv('ANCHOR_SPLIT', '1');
  vi.stubEnv('STRETCH_REACH', '1');
  // This island supplies the defender's incoming velocity on his body, with
  // no perception history; RUN_FEEL takes it from the blocker's acquired picture.
  vi.stubEnv('RUN_FEEL', '0');
  vi.resetModules();
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

interface Input {
  side?: number;
  driveNormal?: number;
  normalVelocity?: number;
  lateralVelocity?: number;
  gap?: number;
  stretch?: boolean;
  anchor?: boolean;
  axis?: Vec2;
}

/** A real acquired engagement, with explicit geometry and incoming velocity.
 * Commands only: no World previews, fabricated contact load or future runner
 * path. The anchor opposing control alone installs its stated incoming load.
 */
async function command(input: Input = {}) {
  const { updateEngagements } = await import('../src/sim/engagement.js');
  const { runContactObservers } = await import('../src/sim/run-contact-observer.js');
  const side = input.side ?? 1, driveNormal = input.driveNormal ?? .6;
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side });
  f.sim.offCall.run = input.stretch === false ? RUN_BY_ID.iz_strong : RUN_BY_ID.wz_strong;
  const axis = input.axis ?? { x: -1, y: 0 };
  const normal = { x: -axis.x, y: -axis.y }, across = { x: axis.y, y: -axis.x };
  const driveLateral = side * Math.sqrt(1 - driveNormal * driveNormal);
  f.engagement.surfaceAxis = { ...axis };
  f.engagement.drive = { x: normal.x * driveNormal + across.x * driveLateral,
    y: normal.y * driveNormal + across.y * driveLateral };
  f.engagement.nextMoveAt = Infinity;
  const sep = f.blocker.profile.radius + f.defender.profile.radius;
  f.defender.body.pos = { x: f.blocker.pos.x + normal.x * (sep + (input.gap ?? 0)),
    y: f.blocker.pos.y + normal.y * (sep + (input.gap ?? 0)) };
  f.defender.body.vel = { x: normal.x * (input.normalVelocity ?? 0) + across.x * side * (input.lateralVelocity ?? 0),
    y: normal.y * (input.normalVelocity ?? 0) + across.y * side * (input.lateralVelocity ?? 0) };
  f.blocker.body.vel = { x: input.anchor ? -.4 : 0, y: 0 };
  f.blocker.body.support!.felt = input.anchor ? { x: -1000, y: 0 } : { x: 0, y: 0 };
  // The blocker reads the defender through his delayed picture (ENGAGE_FELT): the fixture teleported the bodies, so
  // record the picture again, or he sees the defender where he stood before the move.
  // He sees velocity as the change in position over the history, so lay the defender's last second down as the
  // track that ends where the test puts him, moving as it says.
  { const d = f.defender.body, end = { ...d.pos }, v = { ...d.vel };
    for (let k = 0; k < 24; k++) { const back = (23 - k) * f.sim.dt; d.pos = { x: end.x - v.x * back, y: end.y - v.y * back }; f.sim.perception.record(f.sim.agents); }
    d.pos = end; }
  const before = structuredClone(f.sim.agents.map(a => a.body));
  const hands = f.engagement.hands!;
  let movement: { anchored: boolean; lateral: number; lat: Vec2 } | undefined;
  runContactObservers.set(f.sim, (_e, phase, data) => {
    if (phase === 'movement') movement = data as typeof movement;
  });
  const intents = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  updateEngagements(f.sim, intents);
  expect(movement).toBeDefined();
  expect(f.engagement.hands).toBe(hands);
  expect(f.sim.agents.map(a => a.body)).toEqual(before);
  return { intent: intents[f.blocker.idx], movement: movement! };
}

describe('stretch connection follows velocity in the acquired normal frame', () => {
  it.each([-1, 1])('does not turn pure lateral opponent motion into normal drive, side=%s', async side => {
    const resting = await command({ side });
    const flowing = await command({ side, lateralVelocity: 3 });
    expect(resting.movement.anchored).toBe(false);
    expect(flowing.movement.anchored).toBe(false);
    expect(flowing.intent.vel.x).toBeCloseTo(resting.intent.vel.x, 12);
    expect(flowing.intent.vel.x).toBeCloseTo(0, 12);
    expect(Math.abs(flowing.intent.vel.y)).toBeGreaterThan(Math.abs(resting.intent.vel.y));
  });

  it.each([-.5, .7])('follows attainable normal opponent velocity %s without attenuating it twice', async normalVelocity => {
    const requested = await command({ normalVelocity });
    expect(requested.intent.vel.x).toBeCloseTo(normalVelocity, 12);
  });

  it.each([[-3, -.6], [3, 1.44]])('keeps projected normal bounds for opponent velocity %s', async (normalVelocity, limit) => {
    const requested = await command({ normalVelocity });
    expect(requested.intent.vel.x).toBeCloseTo(limit, 12);
  });

  it.each([-1, 1])('retains stationary oblique gap closure, side=%s', async side => {
    const requested = await command({ side, gap: .1 });
    // Existing 3/s closure along a drive with 0.6 normal component.
    expect(requested.intent.vel.x).toBeCloseTo(.18, 12);
  });

  it.each([0, 1e-10, 1e-5])('does not amplify normal work for near-tangent drive %s', async driveNormal => {
    const requested = await command({ driveNormal, normalVelocity: 3, lateralVelocity: 3, gap: .1 });
    expect(Number.isFinite(requested.intent.vel.x)).toBe(true);
    expect(Number.isFinite(requested.intent.vel.y)).toBe(true);
    expect(Math.abs(requested.intent.vel.x)).toBeLessThanOrEqual(2.4 * driveNormal + 1e-12);
  });

  it('retains straight-drive following and closure despite lateral flow', async () => {
    const requested = await command({ driveNormal: 1, normalVelocity: -.4, lateralVelocity: 3, gap: .1 });
    expect(requested.intent.vel.x).toBeCloseTo(-.1, 12);
  });

  it('retains ordinary inside-zone downhill work', async () => {
    const requested = await command({ stretch: false, normalVelocity: -.5, lateralVelocity: 3 });
    expect(requested.intent.vel.x).toBeCloseTo(.6 * 2.4, 12);
    expect(requested.movement.anchored).toBe(false);
  });

  it('retains the opposing vertical-block lost-depth anchor response', async () => {
    const requested = await command({ stretch: false, anchor: true, normalVelocity: -.5, lateralVelocity: 3 });
    expect(requested.movement.anchored).toBe(true);
    expect(requested.intent.vel.x).toBeCloseTo(2.4, 12);
    expect(requested.intent.vel.y).toBeCloseTo(requested.movement.lat.y * requested.movement.lateral * .3, 12);
  });

  it('keeps normal following in a rotated acquired surface frame', async () => {
    const requested = await command({ axis: { x: -.8, y: -.6 }, normalVelocity: -.5, lateralVelocity: 3 });
    expect(requested.movement.anchored).toBe(false);
    expect(requested.intent.vel.x * .8 + requested.intent.vel.y * .6).toBeCloseTo(-.5, 12);
  });

  it('preserves signed closure and bounded following for a reversed normal drive', async () => {
    const closing = await command({ driveNormal: -.6, gap: .1 });
    expect(closing.intent.vel.x).toBeCloseTo(.18, 12);
    const following = await command({ driveNormal: -.6, normalVelocity: -.5 });
    expect(following.intent.vel.x).toBeCloseTo(-.5, 12);
  });

  it('preserves the explicitly selected legacy non-component request', async () => {
    vi.stubEnv('RUN_CONTACT_COMPONENTS', '0'); vi.resetModules();
    const requested = await command({ lateralVelocity: 3 });
    expect(requested.intent.vel.x).toBeCloseTo(.6 * 2.4, 12);
    expect(requested.intent.vel.y).toBeCloseTo(.8 * 2.4 - requested.movement.lateral, 12);
  });
});
