/** Runner entry read (src/sim/behaviors/carrier.ts runReadAim), witnessed on
 * a counter where the end crosses the kicker's face after contact and keeps
 * penetrating (docs/reviews/run-offense.md):
 * LOG_READ   kick or log from the seen kicker against his installed end;
 * RUN_PROJECT bodies met where their seen motion puts them;
 * LANE_DEPTH a closed lane costs the yards behind the line where he is met
 *            (by a free defender closing toward him, or at the entry). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Aim = { t: number; preferred: number; candidates: Array<{ entry: { x: number; y: number }; risk: number }>; side: number; kickY: number; endY: number };

async function aims(flags: Record<string, string>, until = 2.3): Promise<Aim[]> {
  // KICK_INTERCEPT/LOG_CONTACT change the kicker himself (LOG_CONTACT tags
  // the late log); this witness isolates the runner's read of it.
  for (const k of ['LOG_READ', 'RUN_PROJECT', 'LANE_DEPTH', 'RUN_ARMS', 'KICK_INTERCEPT', 'LOG_CONTACT']) vi.stubEnv(k, flags[k] ?? '0');
  vi.resetModules();
  const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
  const { RunBlocker, playSideSign } = await import('../src/sim/behaviors/blocking.js');
  const { runReadObservers } = await import('../src/sim/run-read-observer.js');
  const sim = makeSim({ concept: 'counter', dir: 'weak', formation: 'i_pro_21', look: 'wide9', roster: 'pair11', seed: 77 } as never, rosters());
  const side = playSideSign(sim, sim.offCall.run!);
  const kicker = sim.offense.find(a => a.behavior instanceof RunBlocker && a.behavior.plan.pullRole === 'kick')!;
  const end = (kicker.behavior as InstanceType<typeof RunBlocker>).plan.target!;
  const out: Aim[] = [];
  runReadObservers.set(sim, ev => {
    if (ev.phase !== 'aim') return;
    out.push({ t: sim.t, preferred: ev.preferred as number, candidates: ev.candidates as Aim['candidates'], side,
      kickY: kicker.pos.y, endY: end.pos.y });
  });
  while (sim.phase === 'live' && sim.t < until) sim.tick();
  return out;
}

describe('runner entry read', () => {
  it('LOG_READ: an end who crossed the kicker after contact is read as logged', async () => {
    const off = await aims({}), on = await aims({ LOG_READ: '1' });
    // The kicker never tagged a log: he was engaged before the crossing.
    const logged = (a: Aim) => (a.kickY - a.endY) * a.side > .2;
    const late = off.filter(logged);
    expect(late.length).toBeGreaterThan(0);
    for (const a of late) expect((a.preferred - a.kickY) * a.side).toBeLessThan(0);
    for (const a of on.filter(logged)) expect((a.preferred - a.kickY) * a.side).toBeGreaterThan(0);
  }, 60000);

  it('LANE_DEPTH: a closed lane only ever costs more, and some cost the yards behind the line', async () => {
    const off = await aims({}, 1.9), on = await aims({ LANE_DEPTH: '1' }, 1.9);
    // Identical play until the first changed choice: compare the first read.
    const a = off[0], b = on[0];
    expect(b.t).toBe(a.t);
    let raised = 0;
    for (let i = 0; i < a.candidates.length; i++) {
      expect(b.candidates[i].entry).toEqual(a.candidates[i].entry);
      expect(b.candidates[i].risk).toBeGreaterThanOrEqual(a.candidates[i].risk - 1e-9);
      if (b.candidates[i].risk > a.candidates[i].risk + 1e-9) raised++;
    }
    expect(raised).toBeGreaterThan(0);
  }, 60000);

  it('RUN_PROJECT: bodies moving toward a route change the route check', async () => {
    const off = await aims({}, 1.9), on = await aims({ RUN_PROJECT: '1' }, 1.9);
    const a = off[0], b = on[0];
    expect(b.t).toBe(a.t);
    expect(b.candidates.map(c => c.risk)).not.toEqual(a.candidates.map(c => c.risk));
  }, 60000);
});
