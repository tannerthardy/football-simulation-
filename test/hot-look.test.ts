/** HOT_LOOK (behaviors/qb.ts; on since engine-41): the hot throw costs the look. docs/reviews/2026-11-12-hot-look.md.
 * Asserted on the hot decision itself, staged: each play is run to 0.3 s after he sets, and his hot choice is asked for
 * there, as his alarm would ask it. Off: the instant best of every receiver, wherever he is looking. On: a target
 * inside his clear look is thrown; anyone else first costs the head turn and a glance.
 *
 * Why staged. Until engine-58 this test waited for the pass rush to set off his alarm on a named panel of plays. That
 * panel moved with every change to pass protection: engine-52's nine lost four alarms to PUNCH_STRIKE; a re-surveyed
 * fourteen lost twelve to PASS_SET_SEEN (engine-59 candidate: 14 alarmed with it off, 2 with it on; in five the felt
 * time bottoms at 0.45-0.54 s against the 0.45 s threshold, in five the rusher is held off at 2-4 yd). The alarm is a
 * threshold on a quantity that hovers near it, so a panel of natural alarms is a test of the pass rush. A placed free
 * rusher does not fix that either: 4 yd away in his field of view and closing at 5 yd/s he raises the alarm on 5 of 12
 * plays (he throws on rhythm first, or the man is on him before his delayed picture shows him: FREE_BOUND, off). The
 * look logic does not depend on how the alarm arose, so it is asked directly. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.QB_FOOTWORK = '0'; }); // engine-73: fixture recorded before QB_FOOTWORK; QB to re-record with it on

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const PLAYS: [string, string, number, boolean][] = [
  ['post_cross', 'cover1', 2, false], ['post_cross', 'cover1', 3, false], ['post_cross', 'cover3', 2, false], ['dagger', 'cover3', 3, false],
  ['drive', 'cover3', 2, false], ['drive', 'cover3', 3, false], ['comebacks', 'cover1', 2, false], ['hitch_cross', 'cover1', 3, false],
  ['seam_hitch', 'cover1', 4, false], ['smash', 'cover1', 3, false], ['corner_flat', 'cover1', 4, true], ['dagger', 'cover1', 4, true],
  ['trips_outs', 'cover1', 3, false], ['pa_shot', 'cover1', 4, false],
];

interface Asked { kind: 'throw' | 'look' | 'none'; gaze: number | null; wait: number | null; inLook: boolean | null }

async function ask(hotLook: string): Promise<Asked[]> {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('HOT_LOOK', hotLook);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: Asked[] = [];
  for (const [concept, coverage, seed, flip] of PLAYS) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }));
    const a = sim.qb, qb: any = a.behavior;
    // Run the play to 0.3 s after he sets (he still has the ball and is not in a throwing motion).
    let setAt = -1;
    for (let i = 0; i < 400 && sim.phase === 'live' && sim.carrier === a && a.behavior === qb; i++) {
      sim.tick();
      if (setAt < 0 && qb.phase === 'set') setAt = sim.t;
      if (setAt >= 0 && sim.t >= setAt + 0.3) break;
    }
    if (setAt < 0 || sim.carrier !== a || a.behavior !== qb || qb.phase !== 'set') continue;
    const gaze = qb.gazePoint(sim), off = (p: { x: number; y: number }) => {
      const b = Math.atan2(p.y - a.pos.y, p.x - a.pos.x), g = Math.atan2(gaze.y - a.pos.y, gaze.x - a.pos.x);
      return Math.abs(Math.atan2(Math.sin(b - g), Math.cos(b - g))) * 180 / Math.PI;
    };
    const r = hotLook === '1' ? qb.hotLook(a, sim) : qb.hotThrow(a, sim);
    if (r === null) out.push({ kind: 'none', gaze: null, wait: null, inLook: null });
    else if (r === 'look') out.push({ kind: 'look', gaze: off(qb.look.target.pos), wait: qb.look.seenAt - sim.t, inLook: qb.inClearLook(a, sim, qb.look.target) });
    else out.push({ kind: 'throw', gaze: off(r.point), wait: 0, inLook: qb.inClearLook(a, sim, r.target) });
  }
  return out;
}

describe('HOT_LOOK', () => {
  it('off: his hot choice is thrown at once, to men outside his clear look too', async () => {
    const r = await ask('0');
    const picks = r.filter((x) => x.kind === 'throw');
    expect(r.length).toBeGreaterThanOrEqual(10);
    expect(picks.length).toBeGreaterThanOrEqual(6);
    expect(r.every((x) => x.kind !== 'look')).toBe(true);
    // Outside his clear look (its half-angle is about 19-31 deg by vision and focus): picked without his eyes there.
    expect(picks.filter((x) => x.inLook === false).length).toBeGreaterThanOrEqual(2);
  });

  it('on: a target in his clear look is thrown; anyone else costs the head turn and a glance first', async () => {
    const r = await ask('1');
    const looks = r.filter((x) => x.kind === 'look'), picks = r.filter((x) => x.kind === 'throw');
    expect(looks.length).toBeGreaterThanOrEqual(2);
    // Nothing is thrown at once to a man outside his clear look.
    for (const x of picks) expect(x.inLook, JSON.stringify(x)).toBe(true);
    // A look goes to a man who was outside it, and takes at least the glance (0.15 s) before he can throw there.
    for (const x of looks) {
      expect(x.inLook, JSON.stringify(x)).toBe(false);
      expect(x.wait!, JSON.stringify(x)).toBeGreaterThanOrEqual(0.15);
    }
  });
});
