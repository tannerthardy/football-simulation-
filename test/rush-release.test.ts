import { describe, expect, it, vi } from 'vitest';

/** RUSH_RELEASE (src/sim/release-belief.ts): staged at the passer's first load tick on cover0 curl_flat, the weak end
 * placed free at D yd in front of the passer, moving at him at V yd/s. One who cannot get there before the ball leaves
 * as he judges it pulls up (hands up, facing him); one who can keeps coming (never ban the sack). */
async function staged(flag: string, D: number, V: number, seed = 1) {
  vi.stubEnv('RUSH_RELEASE', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover0', concept: 'curl_flat', seed, roster: seed, formation: 'gun_doubles_11', flip: false })) as any;
  while (sim.phase === 'live' && sim.t < 6 && sim.qb.arm !== 'load') sim.tick();
  const d = sim.defense.find((x: any) => x.slot === 'DE_W'), qb = sim.qb;
  if (d.engagement) sim.disengage(d.engagement);
  const dir = sim.attackDir(sim.offense[0].team), off = { x: dir, y: Math.sign(d.pos.y - qb.pos.y) || 1 }, L = Math.hypot(off.x, off.y);
  const u = { x: off.x / L, y: off.y / L };
  d.body.pos = { x: qb.pos.x + u.x * D, y: qb.pos.y + u.y * D };
  d.body.vel = { x: -u.x * V, y: -u.y * V }; d.body.facing = Math.atan2(-u.y, -u.x);
  const t0 = sim.t, reach = qb.profile.radius + d.profile.radius + d.player.measurables.armIn / 36;
  let pulled = false, contact: number | null = null;
  while (sim.phase === 'live' && sim.t < t0 + 1.2) {
    sim.tick();
    pulled ||= d.tags.has('hands-up');
    if (contact === null && Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) <= reach) contact = sim.t - t0;
  }
  return { pulled, contact };
}

describe('RUSH_RELEASE', () => {
  it('a rusher standing 3 yd off at the load pulls up and does not reach the passer; off, he runs into him after the throw', async () => {
    const on = await staged('1', 3, 0), off = await staged('0', 3, 0);
    expect(on.pulled).toBe(true);
    expect(on.contact).toBeNull();
    expect(off.contact).not.toBeNull();
  });

  it('a rusher 1.5 yd off at 5 yd/s keeps coming and gets there, as with the flag off', async () => {
    const on = await staged('1', 1.5, 5), off = await staged('0', 1.5, 5);
    expect(on.pulled).toBe(false);
    expect(on.contact).not.toBeNull();
    expect(on.contact).toBeCloseTo(off.contact!, 5);
  });
});
