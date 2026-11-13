/** HOT_LOOK (behaviors/qb.ts; on since engine-41): the hot throw costs the look. docs/reviews/2026-11-12-hot-look.md.
 * Asserted as the mechanism over a named panel of plays whose rush sets off his alarm (re-surveyed engine-52), not as one play's
 * outcome: single-play fixtures moved with every engine from 42 to 45 (later releases, the window, the forecast),
 * while the mechanism held. Off: he never looks, and hot throws go to men well away from his eyes. On: he looks,
 * no hot throw goes to a man more than 60 deg from his eyes, and a throw after a look is on his eyes and later. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Gun doubles; plays where the rush reaches his alarm on the engine-52 candidate (Flex's edge set on: PAST_ALONG_PATH,
 * OPEN_HANDS, PUNCH; 9 of 96 surveyed plays: 8 concepts x Cover 1 / 3 x seeds 1-3 x flip). Re-surveyed because the set
 * changes which rushes get home (engine-45's panel: 4 of 11 alarmed); the alarm still follows his pressure read on
 * every pocket play (docs/reviews/2026-11-12-hot-look.md). */
const PANEL: [string, string, number, boolean][] = [
  ['pa_shot', 'cover3', 2, true], ['post_cross', 'cover1', 2, false], ['post_cross', 'cover1', 3, false], ['post_cross', 'cover3', 2, false],
  ['seam_hitch', 'cover1', 3, false], ['seam_hitch', 'cover3', 3, false], ['seam_hitch', 'cover3', 3, true], ['pa_post_dig', 'cover1', 3, false],
  ['smash', 'cover1', 3, false],
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
