/** DOWN_SEAL (src/sim/engagement.ts stepRunRep): the owner of a gap-scheme
 * down block reads his man from his own picture, answers only motion toward
 * the hole and works to the man's hole side (docs/reviews/run-offense.md). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Tick = { dLat: number; seen: number; truth: number; seal: number; feedback: number; correction: number; mirror: number; hole: number };

async function reps(on: boolean, id: string) {
  vi.stubEnv('DOWN_SEAL', on ? '1' : '0');
  vi.resetModules();
  const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
  const { RunBlocker, playSideSign } = await import('../src/sim/behaviors/blocking.js');
  const { runContactObservers } = await import('../src/sim/run-contact-observer.js');
  const [concept, dir, formation, look] = id.split('/');
  const sim = makeSim({ concept, dir, formation, look, roster: 'pair11', seed: 77 } as never, rosters());
  const ps = playSideSign(sim, sim.offCall.run!);
  const ticks: Tick[] = [];
  runContactObservers.set(sim, (e, phase, data) => {
    if (phase !== 'movement' || e.type !== 'run' || e.surfaceAxis || e.blocker.team !== 'O') return;
    const plan = e.blocker.behavior instanceof RunBlocker ? e.blocker.behavior.plan : null;
    if (plan?.kind !== 'down' || plan.target !== e.defender) return;
    const lat = data.lat as { x: number; y: number }, d = e.defender;
    const seen = sim.see(e.blocker, d).vel;
    ticks.push({ dLat: data.dLat as number, seen: seen.x * lat.x + seen.y * lat.y, truth: d.vel.x * lat.x + d.vel.y * lat.y,
      seal: data.seal as number, feedback: data.feedback as number, correction: data.correction as number,
      mirror: data.mirror as number, hole: Math.sign(lat.y * ps) || 1 });
  });
  while (sim.phase === 'live' && sim.t < 2.5) sim.tick();
  return ticks;
}

describe('DOWN_SEAL: a gap down block seals toward the hole', () => {
  it.each(['power/strong/i_pro_21/over3', 'trap/weak/i_pro_21/wide9'])(
    'reads the man from his picture and never chases him away from the hole (%s)', async id => {
      const off = await reps(false, id), on = await reps(true, id);
      expect(off.length).toBeGreaterThan(0);
      expect(on.length).toBeGreaterThan(0);
      // Without the flag the rep mirrors the man's true motion.
      for (const t of off) expect(t.dLat).toBeCloseTo(t.truth, 9);
      let away = 0;
      for (const t of on) {
        expect(t.dLat).toBeCloseTo(t.seen, 9);
        // Motion away from the hole adds nothing to his seal request.
        if (t.dLat * t.hole < 0) {
          away++;
          const rest = Math.max(-t.mirror, Math.min(t.mirror, t.feedback + t.correction));
          expect(t.seal).toBeCloseTo(rest, 9);
        }
      }
      expect(away).toBeGreaterThan(0);
    }, 60000);
});
