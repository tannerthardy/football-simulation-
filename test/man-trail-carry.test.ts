/** CATCH_CARRY, the man-trail case (Coverage's fixture idea, scripts/diag/risk/man-trail-fixture.ts on
 * coverage/C14-release-seen): a man defender trailing his receiver at matched speed when the ball arrives. Without the
 * carry he keeps his coverage for ~0.3 s while the ball is secured, rallies to the ball area, and starts to chase at
 * ~0.55 s; on these plays he drifts away or holds. With it he closes through the catch. A control play where he
 * already closes is not slowed.
 *
 * The cases are found by their rule at test time, on the engine as it is (the stack's `on` flags, no scene pins), not
 * recorded: a recorded scene went stale with each landing (re-found 2026-11-14, -24 and -25 twice; on engine-105 the
 * rule's own case exposed a real defect in HONEST_FLIGHT, fixed in #970). The rule: mesh against cover0 and cover1,
 * doubles and trips; for each coverage and formation, the first natural play (seeds 1-12, no flip then flip, the QB's
 * own throw) whose man defender, on the receiver he covers who makes the catch, closes at -1 to 0 yd/s over 0.1-0.4 s
 * after the catch without the carry (matched speed); the control, the first cover1 doubles catch where he already
 * closes at over 0.3. The carry acts only after the catch, so the throw is the same play in both arms. A coverage and
 * formation with no such play is reported and skipped; the premise must hold on at least three of the four. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

type Case = { coverage: string; concept: string; formation: string; seed: number; flip: boolean };
const SEEDS = 12;

/** His own man defender's closing speed on the catcher (yd/s), mean over 0.1-0.4 s after the receiver holds the ball. */
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
      if (d) C = { R: a, d, v: [] as number[] };
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

/** The first play by the rule: seeds 1..SEEDS, no flip then flip; `ok` on its off-arm closing. */
async function find(coverage: string, formation: string, ok: (off: number) => boolean): Promise<{ c: Case; off: number } | null> {
  for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
    const c = { coverage, concept: 'mesh', formation, seed, flip }, off = await closing('0', c);
    if (Number.isFinite(off) && ok(off)) return { c, off };
  }
  return null;
}
const show = (...x: unknown[]) => { if (process.env.MTC_PRINT) console.log('MTC', ...x); };

describe('CATCH_CARRY: man trail', () => {
  // Defense, on the thresholds: on these plays the trailer already requests full speed at the catcher with the carry,
  // so whether he closes is his body against a faster receiver, not a decision. The rule controls what he asks for: he
  // attacks the catch, so he is never slower on the man than without it.
  it('a man defender trailing at matched speed attacks the catch instead of mirroring (never slower)', async () => {
    let found = 0;
    for (const coverage of ['cover0', 'cover1']) for (const formation of ['gun_doubles_11', 'gun_trips_11']) {
      const hit = await find(coverage, formation, off => off >= -1 && off <= 0);
      if (!hit) { show(coverage, formation, 'no trail case in seeds 1 -', SEEDS); continue; }
      found++;
      const { c, off } = hit, on = await closing('1', c);
      show(coverage, formation, 'seed', c.seed, 'flip', c.flip, 'off', off.toFixed(2), 'on', on.toFixed(2));
      expect(Number.isFinite(on)).toBe(true);
      // HONEST_FLIGHT: his own flight estimate keeps him on the receiver it brought the ball to through the securing beat
      // (catch-anticipation), with or without the carry, so a trailer is not left mirroring for the carry to rescue: the
      // carry must not slow him. (Not compared with the carry that read the private securing state with the flag off: an
      // honest defender may be later, and the scene differs between the arms; mesh cover1 trips s3 flip: honest -0.34, at
      // his man 0.5 yd from him, against the old carry's +0.42 on a different approach.)
      if (process.env.HONEST_FLIGHT !== '0') expect(on).toBeGreaterThan(off - 0.3);
      else expect(on).toBeGreaterThan(off + 0.1);
    }
    expect(found).toBeGreaterThanOrEqual(3);
  }, 600_000);
  it('a man defender who already closes is not slowed', async () => {
    const hit = await find('cover1', 'gun_doubles_11', off => off > 0.3);
    expect(hit).not.toBeNull();
    const on = await closing('1', hit!.c);
    show('control seed', hit!.c.seed, 'flip', hit!.c.flip, 'off', hit!.off.toFixed(2), 'on', on.toFixed(2));
    expect(on).toBeGreaterThan(hit!.off - 0.3);
  }, 600_000);
});
