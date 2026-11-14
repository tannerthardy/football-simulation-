/** QB_SEEN_OUT (behaviors/qb.ts): whether a check-release man is out is the quarterback's own picture of him, not the
 * man's behaviour object. Staged on plays whose call has a check-release man. The quarterback's eyes are held far
 * from him (his look is replaced by a point 25 yd downfield on the far sideline) and the play is run until the man has
 * truly released (the call is a mugged pressure look, which puts the back in the count). Off: he is ready the tick the behaviour changes, unseen. On: a man he has not seen is not out; once
 * the quarterback's picture has him on his release route he is out, and stays out when the picture is lost. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

// A mugged look puts the back in the protection count; his man does not come, so he releases late (about 2.9 s).
// Which calls put a back in the count and then let him go moves with the engine's defaults, so the panel is searched:
// the first three calls that stage are used.
const PLAYS: [string, string, number, string][] = [];
for (const pressure of ['mug_both', 'mug_fire', 'zero_6']) for (const seed of [2, 3, 4]) for (const concept of ['smash', 'dagger', 'drive', 'comebacks']) PLAYS.push([concept, 'cover3', seed, pressure]);

async function stage(flag: string) {
  vi.resetModules();
  vi.stubEnv('QB_SEEN_OUT', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PRESSURE_BY_ID } = await import('../src/playbook/defense.js');
  const { stand } = await import('../src/sim/behaviors/common.js');
  const out: { unseenReady: boolean; unseenOut: boolean; seenOut: boolean; stays: boolean }[] = [];
  for (const [concept, coverage, seed, pressure] of PLAYS) {
    if (out.length >= 3) break;
    const setup = nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false });
    const sim: any = new PlaySim({ ...setup, defCall: { ...setup.defCall, pressure: PRESSURE_BY_ID[pressure] } });
    const qb = sim.qb, beh: any = qb.behavior;
    const man = [...beh.receiverForecasts].find(([, f]: any) => f.prior.startDelay === null)?.[0];
    if (!man) continue;
    const f = beh.receiverForecasts.get(man);
    // Eyes away: nothing he looks at is near the man.
    beh.gazePoint = () => ({ x: sim.los + 25, y: man.pos.y > sim.ballY ? 2 : 51 });
    // No throw while staged, so the play lasts until the release.
    beh.evaluate = () => null;
    for (let i = 0; i < 400 && sim.phase === 'live' && sim.carrier === qb && qb.behavior === beh && man.behavior.kind !== 'route'; i++) sim.tick();
    if (man.behavior.kind !== 'route' || sim.carrier !== qb || f.estimate?.progress != null) continue;
    // The rushers stop where they are so the play lasts long enough to be read.
    for (const d of sim.defense) if (d.behavior.kind === 'rush' || d.behavior.kind === 'blitz') d.behavior = { kind: 'idle', update: () => stand(0) };
    for (let i = 0; i < 4; i++) sim.tick(); // a few steps onto the route, still unseen
    if (sim.carrier !== qb || qb.behavior !== beh || f.estimate?.progress != null) continue;
    const unseenReady = beh.ready(man, sim) as boolean, unseenOut = beh.seenOut(man) as boolean;
    // Now he looks at him until his picture has the man on the route.
    beh.gazePoint = () => ({ ...man.pos });
    for (let i = 0; i < 80 && sim.phase === 'live' && sim.carrier === qb && qb.behavior === beh && f.estimate?.progress == null; i++) sim.tick();
    if (f.estimate?.progress == null) continue;
    const seen = beh.seenOut(man) as boolean;
    // The picture is lost (as when the man is off his line or behind bodies): out stays out.
    f.picture = null; f.cache = null;
    out.push({ unseenReady, unseenOut, seenOut: seen, stays: beh.seenOut(man) as boolean });
  }
  return out;
}

describe('QB_SEEN_OUT', () => {
  it('off: the man is ready the moment his behaviour changes, though the quarterback has not seen him', async () => {
    const rows = await stage('0');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.some((r) => r.unseenReady)).toBe(true);
  });

  it('on: unseen he is not out or ready; seen on his route he is out, and stays out', async () => {
    const rows = await stage('1');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const r of rows) {
      expect(r.unseenOut).toBe(false);
      expect(r.unseenReady).toBe(false);
      expect(r.seenOut).toBe(true);
      expect(r.stays).toBe(true);
    }
  });
});
