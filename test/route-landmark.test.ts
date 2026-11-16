/** ROUTE_LANDMARK (src/sim/route-motion.ts; experimental, off): a receiver off the drawn line runs the rest of a breaking
 * route from where he is, and the quarterback's forecast steers the same rule from his own picture. Staged on the route
 * controller and the forecast themselves: a post (stem to 12 yd, then in toward the goalpost) with the receiver 2.5 yd
 * inside his stem at 8 yd, running upfield, as CRAFT_HOLD bent concept-menu's hitch_post #2 post round the safety; and
 * (attempt 2) a quick out off his drawn line, which keeps its lateral landmark. On the
 * engine defaults (the stack's flags stubbed on: the forecast's placement is FORECAST_HOLD's, its vertex DECLARED_BREAK's). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const LOS = 40, START = { x: 39, y: 36 }, OUTSIDE = 1; // a receiver on the +y side of the ball, outside is +y

async function staged(landmark: boolean, routeId = 'post', pos = { x: LOS + 8, y: START.y - 2.5 }, vel = { x: 6.5, y: 0 }) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('ROUTE_LANDMARK', landmark ? '1' : '0');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam } = await import('../src/league/team.js');
  const { derivePhysical } = await import('../src/players/physical.js');
  const { getRoute } = await import('../src/playbook/routes.js');
  const { routePath, steerRoute, routeEffort, breaksInside } = await import('../src/sim/route-motion.js');
  const { BREAK_DECL } = await import('../src/playbook/route-breaks.js');
  const { installReceiverRoute, ReceiverForecast } = await import('../src/sim/receiver-forecast.js');
  const { stepBody } = await import('../src/physics/kinematics.js');
  const player = generateTeam(new Rng(7), 'O', 'O').roster.find((p) => p.position === 'WR')!;
  const profile = derivePhysical(player), route = getRoute(routeId);
  const path = routePath(START, LOS, OUTSIDE, route.points, route.end === 'continue', route.family);
  // The receiver decides as RouteRunner does: the landmark shift only on a route breaking inside at its declared vertex.
  const at = BREAK_DECL[routeId]?.at, shifts = landmark && breaksInside(path, typeof at === 'number' ? at : undefined, OUTSIDE);
  // The receiver: his own controller from there, 1.5 s.
  const body = { pos: { ...pos }, vel: { ...vel }, facing: 0, energy: 1, sprintLoad: 0, profile } as never as Parameters<typeof stepBody>[0];
  const st = { idx: 0, from: { ...START } };
  const dt = 1 / 20, track: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 30; i++) {
    const cmd = steerRoute(body, st, path, route.end, routeEffort(route.family, 0.6), 0.6, 1, shifts)!;
    stepBody(body, cmd, dt);
    track.push({ ...body.pos });
  }
  // The quarterback's forecast of him, from one picture of him there.
  const prior = installReceiverRoute(START, LOS, OUTSIDE, route, 0, profile, 0.6);
  const f = new ReceiverForecast({}, prior, dt);
  f.acquire({ pos, vel, facing: 0, sampledAt: 1.6, acquiredAt: 1.6 });
  return { track, forecast: f.predict(1.6, 1.5), motion: f.estimate?.motion, end: track[track.length - 1], shifts };
}

describe('ROUTE_LANDMARK', () => {
  it('off, he steers back out across to the drawn line; on, he runs his post from where he is', async () => {
    const off = await staged(false), on = await staged(true);
    // Lateral drift over the first 0.5 s, before the 12-yd break (toward the drawn line is +y).
    const drift = (r: typeof on) => r.track[9].y - r.track[0].y;
    expect(drift(off)).toBeGreaterThan(0.3);
    expect(Math.abs(drift(on))).toBeLessThan(0.1);
    // After the break the post goes in: on, he ends further inside than off, by about his offset.
    expect(off.end.y - on.end.y).toBeGreaterThan(1.5);
  }, 60_000);

  it('the quarterback reads him as on his route and forecasts the post he runs, not a straight line', async () => {
    const off = await staged(false), on = await staged(true);
    // 2.5 yd off his stem is past FORECAST_HOLD's 1.2 yd: off, the forecast is his straight-line motion.
    expect(off.motion).toBe('observed-motion');
    expect(on.motion).toBe('installed-route');
    const err = (r: typeof on) => Math.hypot(r.forecast!.x - r.end.x, r.forecast!.y - r.end.y);
    expect(err(on)).toBeLessThan(0.3);
    expect(err(on)).toBeLessThan(err(off));
  }, 60_000);

  it("attempt 2: a quick out off his drawn line keeps its lateral landmark, the break spot toward the sideline", async () => {
    // Attempt 1 shifted the quick out's legs by his offset (read-plan's press-man quick outs were thrown early to an out
    // the forecast took as on his route). 2 yd past the line, 5 yd inside his stem, upfield at 5.
    const at = { x: LOS + 2, y: START.y - 5 }, v = { x: 5, y: 0 };
    const off = await staged(false, 'quick_out', at, v), on = await staged(true, 'quick_out', at, v);
    expect(on.shifts).toBe(false);
    // On is the same as off: he works back out toward the drawn break spot, not a quick out shifted to where he is.
    expect(on.end.y).toBeCloseTo(off.end.y, 6);
    expect(on.track[9].y - on.track[0].y).toBeGreaterThan(0.3);
  }, 60_000);

  it('attempt 2: the post (breaking inside) still shifts', async () => {
    const on = await staged(true);
    expect(on.shifts).toBe(true);
  }, 60_000);
});

