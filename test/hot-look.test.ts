/** HOT_LOOK (behaviors/qb.ts; on since engine-41): the hot throw costs the look. docs/reviews/2026-11-12-hot-look.md.
 * Asserted as the mechanism over a named panel of plays whose rush sets off his alarm (re-surveyed engine-58), not as one play's
 * outcome: single-play fixtures moved with every engine from 42 to 45 (later releases, the window, the forecast),
 * while the mechanism held. Off: he never looks, and hot throws go to men well away from his eyes. On: he looks,
 * no hot throw goes to a man more than 60 deg from his eyes, and a throw after a look is on his eyes and later. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Gun doubles; plays where the rush reaches his alarm in both arms. Re-surveyed on the engine-58 candidate (PUNCH_STRIKE,
 * ANCHOR_BASE, PURSUIT_COMMIT on): 24 of 384 plays (every dropback and play-action concept x Cover 1 / 3 x seeds 1-4 x
 * flip) alarm with HOT_LOOK off and on; 14 are kept, 11 of them with a look when on. The engine-52 panel (9 plays) lost
 * four of its alarms to PUNCH_STRIKE (the punch keeps those rushes off him: 8 alarmed without it, 5 with it), which is
 * the scene, not the look logic: the alarm still follows his pressure read. The panel is wider than the counts asked of
 * it so one pass-protection change does not empty it. A called pressure does not stage the alarm on this engine (Mike A
 * and nickel edge: 2 and 4 of the old 9 alarmed): a free rusher is not yet felt as a hit soon (FREE_BOUND, off). */
const PANEL: [string, string, number, boolean][] = [
  ['pa_shot', 'cover3', 2, true], ['post_cross', 'cover1', 2, false], ['post_cross', 'cover1', 3, false], ['dagger', 'cover3', 3, false],
  ['drive', 'cover3', 2, false], ['drive', 'cover3', 3, false], ['comebacks', 'cover1', 2, false], ['pa_flood', 'cover1', 4, true],
  ['pa_shot', 'cover1', 4, false], ['hitch_cross', 'cover1', 3, false], ['seam_hitch', 'cover1', 4, false], ['trips_outs', 'cover1', 3, false],
  ['smash', 'cover1', 3, false], ['corner_flat', 'cover1', 4, true],
];

async function panel(hotLook: string) {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('HOT_LOOK', hotLook);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { looks: number; pick: { dt: number; gaze: number; looked: number } | null; alarmed: boolean }[] = [];
  for (const [concept, coverage, seed, flip] of PANEL) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }));
    let qb: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior; };
    sim.run();
    const p = qb?.hotPick;
    out.push({ alarmed: qb?.alarmAt != null, looks: qb?.hotLooks ?? 0, pick: p ? { dt: p.t - p.alarmAt, gaze: p.gazeOff, looked: p.looked } : null });
  }
  return out;
}

describe('HOT_LOOK', () => {
  it('off: he never looks first, and on his alarm throws to men outside his clear look', async () => {
    const r = await panel('0');
    expect(r.filter((x) => x.alarmed).length).toBeGreaterThanOrEqual(6);
    expect(r.every((x) => x.looks === 0)).toBe(true);
    // Outside his clear look (its half-angle is about 19-31 deg by vision and focus): picked without his eyes there.
    // Under ACC_BELIEF (engine-46) the two picks beyond 60 deg on engine-45 are gone (a rushed far throw priced at
    // the release's urgency no longer clears the hot bar; the other now goes to a man 10 deg off), not a HOT_LOOK change.
    expect(r.filter((x) => x.pick && x.pick.gaze > 30).length).toBeGreaterThanOrEqual(1);
  });

  it('on: he looks first; no hot throw goes more than 60 deg from his eyes, and a throw after a look is on them, later', async () => {
    const r = await panel('1');
    expect(r.filter((x) => x.looks > 0).length).toBeGreaterThanOrEqual(3);
    for (const x of r) if (x.pick) expect(x.pick.gaze, JSON.stringify(x)).toBeLessThanOrEqual(60);
    for (const x of r) if (x.pick?.looked) {
      expect(x.pick.gaze, JSON.stringify(x)).toBeLessThan(30);
      expect(x.pick.dt, JSON.stringify(x)).toBeGreaterThanOrEqual(0.3);
    }
  });
});
