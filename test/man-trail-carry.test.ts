/** CATCH_CARRY, the man-trail case (Coverage's fixture, scripts/diag/risk/man-trail-fixture.ts on
 * coverage/C14-release-seen): a man defender trailing his receiver at matched speed when the ball arrives. Without the
 * carry he keeps his coverage for ~0.3 s while the ball is secured, rallies to the ball area, and starts to chase at
 * ~0.55 s; on these plays he drifts away or holds. With it he closes through the catch. A control play where he
 * already closes is not slowed. The cases need the current engine defaults (stack 'on'). The throw is staged
 * (PlaySetup.stagedThrow): its start, receiver, aim point and flight time are the ones develop's QB produced on each
 * play, so a change in the QB does not move a defensive fixture's premise. Re-found 2026-11-14 on the engine-65 candidate
 * (078259db, CATCH_CARRY off): with CROSS_FLAT the mesh's shallow cross runs flat at 2.5-3 yd, so the scenes recorded at
 * 45e17fcc no longer had a trailing man defender at the catch (cover0 s3 is now an interception, cover1 trips s10 an
 * incompletion). The cases are chosen by the premise alone, from a scan of mesh against cover0 / cover1, doubles and
 * trips, both flips, seeds 1-12: trail cases are the first catch per coverage and formation whose man defender closes
 * at -1 to 0 yd/s without the carry (matched speed); the control is the first cover1 doubles catch where he already
 * closes at over 0.3. Each throw is the one the candidate's QB makes on that play. Off -> on at 078259db: -1.43 -> -0.95,
 * -0.02 -> 0.83, -0.02 -> 1.36, -0.14 -> 0.54; control 0.43 -> 1.11 (cover0 doubles s1 flip is -0.81 natural, -1.43
 * staged: the staging suppresses a pump). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StagedThrow } from '../src/sim/playsim.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

type Case = { coverage: string; concept: string; formation: string; seed: number; flip: boolean; staged: StagedThrow };
const TRAIL: Case[] = [
  { coverage: 'cover0', concept: 'mesh', formation: 'gun_doubles_11', seed: 1, flip: true, staged: { at: 2.7, slot: 'H', aim: { x: 47.578585789273035, y: 26.13883682831247, z: 1.0752436010533946 }, T: 0.8258310468926056 } },
  { coverage: 'cover0', concept: 'mesh', formation: 'gun_trips_11', seed: 7, flip: false, staged: { at: 1.95, slot: 'H', aim: { x: 43.40361665017577, y: 23.6061803541274, z: 1.6052683997938129 }, T: 0.5688625619101512 } },
  { coverage: 'cover1', concept: 'mesh', formation: 'gun_doubles_11', seed: 10, flip: false, staged: { at: 1.75, slot: 'Y', aim: { x: 43.93517692229286, y: 29.152697579963142, z: 1.203423769957923 }, T: 0.7516468371986261 } },
  { coverage: 'cover1', concept: 'mesh', formation: 'gun_trips_11', seed: 11, flip: false, staged: { at: 2.55, slot: 'H', aim: { x: 44.66199109746469, y: 27.47384832103233, z: 1.1084586927141817 }, T: 0.7960112743105804 } },
];
const CONTROL: Case = { coverage: 'cover1', concept: 'mesh', formation: 'gun_doubles_11', seed: 2, flip: false, staged: { at: 1.75, slot: 'Y', aim: { x: 44.342182796878774, y: 28.737207826607396, z: 1.053565279262162 }, T: 0.5741794636999107 } };

/** His own man defender's closing speed on the catcher (yd/s), mean over 0.1-0.4 s after the secure event. */
async function closing(flag: string, c: Case): Promise<number> {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  for (const k of ['QUICK_HITCH', 'VERTS_KEYS', 'CURL_SINK', 'SETTLE_DEPTH', 'CRAFT_HOLD', 'CRAFT_EXIT', 'ROUTE_LANDMARK', 'RELEASE_COMMIT']) vi.stubEnv(k, '0'); // engine-73: scenes recorded before this group of the engine-73 landing; Rules to re-record with it on
  vi.stubEnv('MIRROR_SCATTER', '0'); // engine-72: fixture recorded on the old alignment scatter; Defense to re-record with MIRROR_SCATTER on
  vi.stubEnv('BALL_EST', '0'); // engine-72: with the delayed ball estimate (default 6145) these scenes' trailing man no longer trails at the catch; the premise was found on the direct read. Defense to re-find the cases with BALL_EST on
  vi.stubEnv('BALL_DRAG', '0'); // engine-96: the staged throws' starts, aims and flight times were recorded on the old ball (k 0.003027); with the measured k (0.0050) the launch is re-derived for the same T and the premise (a man defender trailing at matched speed at the catch) no longer holds on these scenes (carry gain -0.91 against the case's -0.81 bound). Coverage to re-find the cases on the current ball.
  vi.stubEnv('ARM_BREAK', '0'); // engine-76 (this file's scenes, pinned test-only): with one reaction on the arm read (ARM_BREAK 1) the control's staged throw (cover1 doubles s2) is no longer a catch, and the original control space (mesh, cover1 doubles, s1-12, both flips) has two man-trail catches, both closing at about 0, none over 0.3; Defense to re-find the control in a wider space with it on
  vi.stubEnv('CATCH_CARRY', flag);
  vi.stubEnv('QB_DRIVE', '0'); // engine-83 (QB landing, pinned test-only): the trail-man scenes were found with the old ball speed; a faster natural ball changes who trails at the catch. Defense to re-find with QB_DRIVE on
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim({ ...nativeTraceSetup({ ...c, roster: c.seed }), stagedThrow: c.staged });
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
