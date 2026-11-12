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

describe('PUNCH', () => {
  async function rep(flag: string) {
    vi.stubEnv('PUNCH', flag); vi.resetModules();
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'four_verts', seed: 2, roster: 7, formation: 'gun_doubles_11', flip: false }));
    const ext: { gap: number; ext: number; arm: number }[] = [];
    while (sim.phase === 'live' && sim.t < 3 && sim.throwAt < 0) {
      sim.tick();
      for (const e of sim.engagements) if (e.hands && e.control >= 0) {
        const b = e.blocker, d = e.defender, bodies = b.profile.radius + d.profile.radius;
        ext.push({ gap: Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) - bodies, ext: e.hands.extension - bodies, arm: b.player.measurables.armIn / 36 });
      }
    }
    return ext;
  }
  it('his hands reach out toward the man, never past lockout; off, they stay at bent elbows', async () => {
    const on = await rep('1'), off = await rep('0');
    expect(Math.max(...on.map((r) => r.ext / r.arm))).toBeLessThanOrEqual(0.9 + 1e-9);
    expect(Math.max(...off.map((r) => r.ext / r.arm))).toBeLessThan(0.31);
    const far = on.filter((r) => r.gap > 0.4 * r.arm && r.gap < 0.85 * r.arm);
    expect(far.length).toBeGreaterThan(0);
    expect(far.filter((r) => r.ext > 0.35 * r.arm).length / far.length).toBeGreaterThan(0.5);   // working out at him
  });
});

describe('PUNCH is pass-set technique', () => {
  async function maxExt(concept: string, pick: (sim: any, b: any, e: any) => boolean) {
    vi.stubEnv('PUNCH', '1'); vi.resetModules();
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    let best = 0;
    for (const seed of [1, 2, 3, 4]) {
      const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
      while (sim.phase === 'live' && sim.t < 2.5) {
        sim.tick();
        for (const e of sim.engagements) if (e.hands && e.control >= 0 && pick(sim, e.blocker, e)) {
          const b = e.blocker, bodies = b.profile.radius + e.defender.profile.radius;
          best = Math.max(best, (e.hands.extension - bodies) / (b.player.measurables.armIn / 36));
        }
      }
    }
    return best;
  }
  it('a run fit never extends (inside zone); a draw blocker selling pass may', async () => {
    expect(await maxExt('iz_strong', (_s, _b, e) => e.type === 'run')).toBeLessThan(0.31);
    expect(await maxExt('draw', (s, b, e) => e.type === 'run' && b.behavior?.presentingDraw?.(s.t))).toBeGreaterThan(0.31);
  });
  it('on play-action an interior lineman fits for his run look; after it he sets', async () => {
    const interior = (b: any) => b.slot === 'LG' || b.slot === 'C' || b.slot === 'RG';
    expect(await maxExt('pa_post_dig', (s, b) => interior(b) && s.t < 0.35)).toBeLessThan(0.31);
  });
});
