/** PAST_ALONG_PATH (engagement.ts; experimental, off): beaten is past the
 * blocker along the man's own path of travel (hips past hips), not across the
 * line to the QB; past but within reach, the rep goes on as a ride. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('PAST_ALONG_PATH', () => {
  it('past means behind him along his path: level beside him is not past, however the QB line runs', async () => {
    vi.stubEnv('PAST_ALONG_PATH', '1'); vi.resetModules();
    const { pastAlongPath, PAST_MARGIN } = await import('../src/sim/engagement.js');
    const d = { pos: { x: 33, y: 21 }, vel: { x: -4, y: 0 } };           // running deep, toward his own goal side (-x)
    expect(pastAlongPath({ pos: { x: 33, y: 22 } }, d, 1.2)).toBe(false);           // level beside him: phi past 1, not past
    expect(pastAlongPath({ pos: { x: 33 + PAST_MARGIN + 0.05, y: 22 } }, d, 0.4)).toBe(true);   // behind him along his path
    expect(pastAlongPath({ pos: { x: 32, y: 22 } }, d, 1.5)).toBe(false);           // still ahead of him along his path
    expect(pastAlongPath({ pos: { x: 33.5, y: 22 } }, { pos: d.pos, vel: { x: 0.2, y: 0 } }, 1.2)).toBe(true);  // nearly still: phi decides
  });

  it('off, the switch is off', async () => {
    vi.stubEnv('PAST_ALONG_PATH', '0'); vi.resetModules();
    const { PAST_ALONG_PATH } = await import('../src/sim/engagement.js');
    expect(PAST_ALONG_PATH).toBe(false);
  });
});
