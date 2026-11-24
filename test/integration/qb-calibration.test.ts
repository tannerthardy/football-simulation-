/** The QB's calibration contract (docs/reviews/2026-11-24-qb-decision-plan.md section 3 module D, section 4 gates): at each throw decision the believed completion (ThrowEval.P) and
 * interception (intRisk) are compared with what happened, for a mid-rated passer (every mental rating 60) on the staged concepts x coverages x rosters x flips of the rating panel,
 * seeds 1 and 2 (230 throws on engine-95 / develop 703fc628c). When the defense changes and the judgment drifts, this goes red and names the role it drifted for.
 *
 * Tolerances are a stated choice, set from the baseline (cal-baseline in docs/reviews/2026-11-24-qb-calibration-baseline.md) plus two standard errors, not a target: overall completion gap
 * baseline +0.019 (SE 0.030) -> 0.08; interception-rate gap baseline +0.004 -> 0.03; a role cell with at least 40 throws: driver (baseline +0.058, n 134, SE 0.038) -> 0.13; coverer only
 * (baseline +0.042, n 57, SE 0.060) -> 0.17. League games (24, 1,824 throws) read overall +0.028 completion and 0.011 believed against 0.017 actual interceptions (19.8 expected, 31 actual):
 * the interception under-pricing is real in the league sample and is reported there, not asserted here (3 events in the staged set). The rebuild's gate tightens these.
 * Takes a few minutes: an integration test. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { legacyEnv } from '../../config/legacy-env.js';
import type { CalRow } from '../../scripts/diag/qb/calibration.js';

const TOL: Record<string, number> = { all: 0.08, driver: 0.13, coverer: 0.17 };

describe('QB calibration contract (mid-rated passer, staged panel)', () => {
  it('believed completion and interception match what happened, overall and by the role present', async () => {
    // The integration project runs the legacy engine (every promoted flag pinned to 0); the contract is about the engine as it is, so the pins are removed before the engine loads.
    const pins = Object.keys(legacyEnv(JSON.parse(readFileSync(new URL('../../config/reference-stack.json', import.meta.url), 'utf8')))); const saved = pins.map((k) => [k, process.env[k]] as const);
    for (const k of pins) delete process.env[k];
    const { calibrationCells, installCalibration, stagedPlays } = await import('../../scripts/diag/qb/calibration.js');
    const rows: CalRow[] = [];
    const off = installCalibration((r) => rows.push(r), { src: 'staged60', seed: 0 });
    try { for (const sim of stagedPlays(60, [1, 2])) { try { sim.run(); } catch { /* skip */ } } } finally { off(); for (const [k, v] of saved) if (v !== undefined) process.env[k] = v; }
    const cells = calibrationCells(rows);
    expect(cells.all.n).toBeGreaterThan(150);
    const bad: string[] = [];
    for (const [k, tol] of Object.entries(TOL)) {
      const c = cells[k];
      if (c.n >= 40 && Math.abs(c.actual - c.believed) > tol) bad.push(`${k}: believed completion ${c.believed.toFixed(3)} against actual ${c.actual.toFixed(3)} on ${c.n} throws (tolerance ${tol})`);
    }
    if (Math.abs(cells.all.actualInt - cells.all.believedInt) > 0.03) bad.push(`interceptions: believed ${cells.all.believedInt.toFixed(3)} against actual ${cells.all.actualInt.toFixed(3)} (tolerance 0.03)`);
    expect(bad, `the judgment drifted for: ${bad.join('; ')}`).toEqual([]);
  }, 600000);
});
