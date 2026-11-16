/** QB_CALL_ROUTES (behaviors/qb.ts; information rule): who is on a route is his call, a check-release man (a play-action
 * back after the fake, a checking back) once his picture has him out; never the receiver's live behavior object.
 * Staged gate on its consequential cases, which the dropback set cannot see (scripts/diag/eyes/call-routes-panel.ts:
 * play action and check-release concepts, four formations, cover 1 and 3, two seeds; screens are not in the play pool).
 * 1. On: no check-release man is counted on a route before his picture has him out.
 * 2. Off (the leak it removes): the live behavior counts such men before he has seen them out (28 of 28 on the
 *    panel, all play-action backs). Outcomes on the panel are the same in both arms. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function rows(flag: string) {
  vi.resetModules();
  const stack = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8'));
  const flags: Record<string, string> = stack.flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  // The reference stack's numeric settings too (the suite pins them to their legacy values).
  for (const [k, v] of Object.entries(stack.numeric ?? {}) as [string, { default: number }][]) vi.stubEnv(k, String(v.default));
  vi.stubEnv('QB_CALL_ROUTES', flag);
  const { panelRows } = await import('../scripts/diag/eyes/call-routes-panel.js');
  return panelRows();
}

describe('QB_CALL_ROUTES: routes from his call', () => {
  it('counts a check-release man on a route only once he has seen him out (off: before)', async () => {
    const off = await rows('0'), on = await rows('1');
    expect(on.length).toBeGreaterThanOrEqual(60);
    const sum = (rs: any[], k: string) => rs.reduce((s, r) => s + r[k], 0);
    expect(sum(on, 'checks')).toBeGreaterThanOrEqual(10);
    expect(sum(on, 'early')).toBe(0);
    expect(sum(off, 'early')).toBeGreaterThan(0);
  }, 600_000);
});
