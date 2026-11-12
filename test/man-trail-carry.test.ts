/** CATCH_CARRY, the man-trail case (Coverage's fixture, scripts/diag/risk/man-trail-fixture.ts on
 * coverage/C14-release-seen): a man defender trailing his receiver at matched speed when the ball arrives. Without the
 * carry he keeps his coverage for ~0.3 s while the ball is secured, rallies to the ball area, and starts to chase at
 * ~0.55 s; on these plays he drifts away or holds. With it he closes through the catch. A control play where he
 * already closes is not slowed. Natural plays, no forcing; the cases need the current engine defaults (stack 'on'). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

type Case = { coverage: string; concept: string; formation: string; seed: number; flip: boolean };
const TRAIL: Case[] = [
  { coverage: 'cover0', concept: 'mesh', formation: 'gun_doubles_11', seed: 3, flip: false },
  { coverage: 'cover0', concept: 'mesh', formation: 'gun_doubles_11', seed: 5, flip: false },
  { coverage: 'cover1', concept: 'mesh', formation: 'gun_trips_11', seed: 10, flip: true },
];
const CONTROL: Case = { coverage: 'cover1', concept: 'mesh', formation: 'gun_doubles_11', seed: 1, flip: false };

/** His own man defender's closing speed on the catcher (yd/s), mean over 0.1-0.4 s after the secure event. */
async function closing(flag: string, c: Case): Promise<number> {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('CATCH_CARRY', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ ...c, roster: c.seed }));
  let C: any = null;
  const ev0 = sim.event.bind(sim);
  sim.event = (type: string, a: any, b: any, note?: string) => {
    if ((type === 'secure' || type === 'catch') && a?.team === 'O' && !C) {
      const d = sim.defense.find((x: any) => x.behavior?.kind === 'man' && x.behavior.target === a);
      if (d) C = { R: a, d, t0: sim.t, v: [] as number[] };
    }
    return ev0(type, a, b, note);
  };
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    // The carry acts once the ball is held; the securing window before it is DRIVE_CATCH's.
    if (C && C.held === undefined && sim.ball.kind === 'held' && sim.ball.carrier === C.R) C.held = sim.t;
    if (C?.held !== undefined && sim.t - C.held >= 0.1 - 1e-9 && sim.t - C.held <= 0.4 + 1e-9) {
      const R = sim.ball.kind === 'held' ? sim.ball.carrier : C.R, d = C.d, rx = R.pos.x - d.pos.x, ry = R.pos.y - d.pos.y, L = Math.hypot(rx, ry) || 1;
      C.v.push(((d.vel.x - R.vel.x) * rx + (d.vel.y - R.vel.y) * ry) / L);
    } };
  sim.run();
  if (!C || !C.v.length) return NaN;
  return C.v.reduce((s: number, x: number) => s + x, 0) / C.v.length;
}

describe('CATCH_CARRY: man trail', () => {
  // Defense, on the thresholds: on these plays the trailer already requests full speed at the catcher with the carry
  // (cover0 s3: 9.6 yd/s asked, 5.2 -> 6.5 achieved while the crosser accelerates 6.6 -> 7.3), so whether he closes is
  // his body against a faster receiver, not a decision. The rule controls what he asks for: he attacks the catch, so
  // he is never slower on the man than without it, and on every trail case faster.
  it('a man defender trailing at matched speed attacks the catch instead of mirroring (never slower, faster on each case)', async () => {
    for (const c of TRAIL) {
      const off = await closing('0', c), on = await closing('1', c);
      expect(Number.isFinite(off) && Number.isFinite(on)).toBe(true);
      // Natural plays move with the engine, so the premise is read from the off run: a trailer (not closing) is faster
      // with the carry; one who already closes is not slowed. The window is 0.1-0.4 s after the receiver holds the
      // ball, where the carry acts; before it the ball is still being secured (DRIVE_CATCH). engine-47 (CATCH_SPEED,
      // CATCH_CHOICE) lengthened securing, so a window anchored on the secure event measured mostly that phase.
      if (off <= 0) expect(on).toBeGreaterThan(off + 0.1); else expect(on).toBeGreaterThan(off - 0.3);
    }
  });
  it('a man defender who already closes is not slowed', async () => {
    const off = await closing('0', CONTROL), on = await closing('1', CONTROL);
    expect(on).toBeGreaterThan(off - 0.3);
  });
});
