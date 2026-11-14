import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// HANDS_LEVER (off): a centre-mode hands row acts at the two chest points with lever arms, so a press on a man's
// outside shoulder puts a moment on him that his yaw motor must resist from his base. Off, the row passes through
// both centres and the pressed man keeps any facing he asks for. Real engine defaults (the reference stack's
// promoted flags on), as test/contact-layer.test.ts.
const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function press(env: Record<string, string>, off: number) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const { sim, blocker: b, defender: d, engagement: e } = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  Object.assign(d.profile, structuredClone(b.profile));
  b.body.pos = { x: 40, y: 26.65 }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
  const R = b.profile.radius + d.profile.radius + 0.1;
  // The man on the blocker's shoulder, square to the line of scrimmage himself, driving straight upfield past him.
  d.body.pos = { x: 40 + Math.sqrt(R * R - off * off), y: 26.65 + off }; d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI;
  e.control = 0;
  let maxTurn = 0;
  for (let k = 0; k < 20; k++) {
    const intents: any[] = sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    // The blocker asks to stay square (facing 0) and hold his ground; the man drives at him.
    intents[b.idx] = { vel: { x: 0, y: 0 }, facing: 0, push: 1, posture: 0.85 };
    intents[d.idx] = { vel: { x: -1, y: 0 }, facing: Math.PI, push: 1, posture: 0.85 };
    sim.world.step(intents, sim.dt);
    maxTurn = Math.max(maxTurn, Math.abs(Math.atan2(Math.sin(b.body.facing), Math.cos(b.body.facing))) * 180 / Math.PI);
  }
  return maxTurn;
}

describe('HANDS_LEVER (a hands press acts at the chest points)', () => {
  it('a press on his shoulder turns the pressed man where the centre law cannot; head-up stays square', async () => {
    const offShoulder = await press({ HANDS_LEVER: '0' }, 0.25), onShoulder = await press({ HANDS_LEVER: '1' }, 0.25);
    expect(onShoulder).toBeGreaterThan(offShoulder + 1);
    expect(await press({ HANDS_LEVER: '1' }, 0)).toBeLessThan(1);
  });
  it('requires HANDS_CHEST', async () => {
    vi.resetModules();
    vi.stubEnv('HANDS_CHEST', '0'); vi.stubEnv('HANDS_LEVER', '1');
    await expect(import('../src/physics/world.js')).rejects.toThrow(/HANDS_CHEST/);
  });
});
