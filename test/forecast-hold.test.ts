/** FORECAST_HOLD (receiver-forecast.ts; experimental, off): a receiver a little off his drawn line, running along his
 * route, is still running it; one who really breaks it off (cuts across it, stops, or is far off it) is forecast from
 * his observed motion. docs/reviews/2026-11-12-forecast-hold.md. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** A slant's forecast, and a picture `off` yd to the side of its stem's middle, moving `angle` rad off the stem. */
async function picture(hold: string, off: number, angle: number, speed = 7) {
  vi.resetModules();
  vi.stubEnv('FORECAST_HOLD', hold);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { getRoute } = await import('../src/playbook/routes.js');
  const { ReceiverForecast, installReceiverRoute } = await import('../src/sim/receiver-forecast.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(91), 'O', 'O'), '11'), defense: pickDefense(generateTeam(new Rng(92), 'D', 'D'), 'nickel'), seed: 45,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'go' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', label: 'cover3' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false });
  const r = sim.slot('X')!;
  const prior = installReceiverRoute(r.pos, sim.los, 1, getRoute('go'), 0, r.profile, r.r('routeRunning'));
  const forecast = new ReceiverForecast(sim.qb, prior, sim.dt);
  // The route's longest drawn segment; a picture at its middle, `off` yd to the side.
  const pts = [prior.start, ...prior.path.map((q: any) => q.p)];
  let a = pts[0], b = pts[1];
  for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) > Math.hypot(b.x - a.x, b.y - a.y)) { a = pts[i - 1]; b = pts[i]; }
  const L = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, k = L / 2;
  const pos = { x: a.x + ux * k - uy * off, y: a.y + uy * k + ux * off };
  const heading = Math.atan2(uy, ux) + angle;
  forecast.acquire({ pos, vel: { x: Math.cos(heading) * speed, y: Math.sin(heading) * speed }, facing: heading, sampledAt: 1.5, acquiredAt: 1.7 });
  return forecast.estimate?.motion;
}

describe('FORECAST_HOLD', () => {
  it('a go route run 1 yd off its drawn line: off, abandoned for straight-line motion; on, still the route', async () => {
    expect(await picture('0', 1, 0.1)).toBe('observed-motion');
    expect(await picture('1', 1, 0.1)).toBe('installed-route');
  });

  it('on, a receiver who breaks it off is still read from his motion: cutting across it, stopped, or far off it', async () => {
    expect(await picture('1', 1, Math.PI / 2)).toBe('observed-motion');
    expect(await picture('1', 1, 0, 0)).toBe('observed-motion');
    expect(await picture('1', 3, 0)).toBe('observed-motion');
  });

  it('on the line, both read the route', async () => {
    expect(await picture('0', 0, 0)).toBe('installed-route');
    expect(await picture('1', 0, 0)).toBe('installed-route');
  });
});
