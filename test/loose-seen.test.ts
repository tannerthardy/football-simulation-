/** LOOSE_SEEN (src/sim/behaviors/loose-seen.ts; experimental, off). The carrier on run plays (inside zone, power,
 * outside zone; fixed rosters and seeds, the reference stack's on-flags) is made to fumble 1.5 yd past the line:
 *  - off: every player is in the loose-ball scramble on the fumble's tick (all 22 told at once);
 *  - on: the man who lost it is in it within a tick (he knows at once; his cue switches him at his next update);
 *    nobody else enters it sooner than his own observation delay allows (no other player before 0.1 s), and some are
 *    still on their jobs 0.25 s later (they have neither seen the ball nor heard a call).
 * Recognition timing only; no recovery outcome is asserted. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const sim_dt = 1 / 20;
const PLAYS = [['iz_strong', 3], ['power', 7], ['oz_strong', 11], ['iz_weak', 19]] as const;

async function fumbles(on: boolean): Promise<{ first: number[]; atOnce: number; lateAt25: number; n: number; lost: number; others: number }[]> {
  for (const f of stackOn) vi.stubEnv(f, '1');
  for (const k of ['PA_HINGE', 'EDGE_SET', 'POCKET_DROP', 'POWER_AIM', 'END_KEY']) vi.stubEnv(k, '0'); // engine-73: scenes recorded before this group of the engine-73 landing; Defense to re-record with it on
  vi.stubEnv('DIR_CAP', '0'); // engine-69: these fumble scenes were found before the monotone direction cap; re-find with DIR_CAP on
  vi.stubEnv('LOOSE_SEEN', on ? '1' : '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { first: number[]; atOnce: number; lateAt25: number; n: number; lost: number; others: number }[] = [];
  for (const [concept, seed] of PLAYS) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: seed, formation: 'pistol_11', flip: false }));
    const dir = sim.attackDir(sim.offense[0].team);
    let at = -1, lostIdx = -1; const first = new Map<number, number>(); const tick0 = sim.tick.bind(sim);
    sim.tick = () => {
      tick0();
      const c = sim.carrier;
      if (at < 0 && c && c !== sim.qb && sim.ball.kind === 'held' && (c.pos.x - sim.los) * dir > 1.5) { lostIdx = c.idx; sim.fumble(c, null); at = sim.t; }
      if (at >= 0) for (const a of sim.agents) if (a.behavior?.kind === 'scramble-ball' && !first.has(a.idx)) first.set(a.idx, sim.t - at);
    };
    sim.run();
    if (at < 0) continue;
    const t = [...first.values()];
    const others = [...first].filter(([i]) => i !== lostIdx).map(([, x]) => x);
    out.push({ first: t, atOnce: t.filter((x) => x <= 1e-9).length, lateAt25: sim.agents.length - t.filter((x) => x <= 0.25 + 1e-9).length, n: sim.agents.length,
      lost: first.get(lostIdx) ?? Infinity, others: others.length ? Math.min(...others) : Infinity });
  }
  return out;
}

describe('LOOSE_SEEN: a fumble is recognized player by player', () => {
  it('off: everyone scrambles on the fumble tick', async () => {
    const r = await fumbles(false);
    expect(r.length).toBeGreaterThanOrEqual(3);
    for (const p of r) expect(p.atOnce).toBe(p.n);
  }, 120_000);
  it('on: only the man who lost it knows at once; the rest after their own delay, and some still later', async () => {
    const r = await fumbles(true);
    expect(r.length).toBeGreaterThanOrEqual(3);
    for (const p of r) {
      expect(p.lost).toBeLessThanOrEqual(sim_dt + 1e-9);
      expect(p.others).toBeGreaterThanOrEqual(0.1 - 1e-9);
    }
    expect(r.reduce((s, p) => s + p.lateAt25, 0)).toBeGreaterThan(0);
  }, 120_000);
});
