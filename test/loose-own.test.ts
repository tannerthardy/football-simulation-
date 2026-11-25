/** LOOSE_OWN (src/sim/behaviors/loose-seen.ts; experimental, off), on LOOSE_SEEN's fumble scenes (run plays, the carrier
 * made to fumble 1.5 yd past the line; fixed rosters and seeds, the reference stack's on-flags). A player in the
 * scramble who has not seen the loose ball himself and is not the man who lost it:
 *  - on: heads for the teammate whose call he heard (his request points at that teammate as he sees him), never for
 *    the fumbler he was not told about;
 *  - off (LOOSE_SEEN as merged): heads for the fumbler.
 * Only ticks where the caller and the fumbler lie 45+ deg apart from him are counted, so the two cases differ. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
const PLAYS = [['iz_strong', 3], ['power', 7], ['oz_strong', 11], ['iz_weak', 19]] as const;

async function heads(on: boolean): Promise<{ toCaller: number; toFumbler: number }> {
  for (const f of stackOn) vi.stubEnv(f, '1');
  for (const k of ['PA_HINGE', 'EDGE_SET', 'POCKET_DROP', 'POWER_AIM', 'END_KEY']) vi.stubEnv(k, '0'); // engine-73: scenes recorded before this group of the engine-73 landing; Defense to re-record with it on
  vi.stubEnv('DIR_CAP', '0'); // as loose-seen.test.ts: these scenes were found before the monotone direction cap
  vi.stubEnv('LOOSE_SEEN', '1');
  vi.stubEnv('LOOSE_OWN', on ? '1' : '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { caller, looseStateForTest } = await import('../src/sim/behaviors/loose-seen.js');
  let toCaller = 0, toFumbler = 0;
  for (const [concept, seed] of PLAYS) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: seed, formation: 'pistol_11', flip: false }));
    const dir = sim.attackDir(sim.offense[0].team);
    let at = -1, lost: any = null; const tick0 = sim.tick.bind(sim);
    sim.tick = () => {
      if (at >= 0 && sim.ball.kind === 'loose') {
        const s = looseStateForTest(sim)!;
        for (const a of sim.agents) {
          if (a === lost || a.behavior?.kind !== 'scramble-ball' || s.seen.has(a.idx)) continue;
          const c = caller(sim, a, s as any); if (!c) continue;
          const cp = sim.see(a, c).pos, fp = sim.see(a, lost).pos;
          const hc = Math.atan2(cp.y - a.pos.y, cp.x - a.pos.x), hf = Math.atan2(fp.y - a.pos.y, fp.x - a.pos.x);
          if (Math.abs(Math.atan2(Math.sin(hc - hf), Math.cos(hc - hf))) < Math.PI / 4) continue;
          // Not once he has reached his caller (within contact: the two bodies plus his reach). He runs through the called
          // spot (runThrough), so there his request keeps his travel and points at neither man. Engine-101 (BLOCK_FRAME on):
          // iz_strong 3's Y, 0.85 yd from his caller (RT) at 3.65 s, asked 9.1 yd/s at 99 deg against the caller's -173 and
          // the fumbler's 41, and was counted toward the fumbler.
          if (Math.hypot(cp.x - a.pos.x, cp.y - a.pos.y) <= a.profile.radius + c.profile.radius + a.profile.reach) continue;
          const cmd = a.behavior.update(a, sim); const v = cmd?.vel; if (!v || Math.hypot(v.x, v.y) < 0.5) continue;
          // Not the tick he first sees the ball himself: his update runs his own sighting before it chooses, so a player
          // unseen before the call can head for the ball he has just seen (Coverage, 2026-11-25, LANE_LEVERAGE on: oz_strong
          // 11's Mike at 3.25 s was counted toward the fumbler on the tick he sighted the ball). The file's rule is a player
          // who has not seen it.
          if (s.seen.has(a.idx)) continue;
          const h = Math.atan2(v.y, v.x);
          if (Math.cos(h - hc) > Math.cos(h - hf)) toCaller++; else toFumbler++;
        }
      }
      tick0();
      const c = sim.carrier;
      if (at < 0 && c && c !== sim.qb && sim.ball.kind === 'held' && (c.pos.x - sim.los) * dir > 1.5) { lost = c; sim.fumble(c, null); at = sim.t; }
    };
    sim.run();
  }
  return { toCaller, toFumbler };
}

describe('LOOSE_OWN: a called player goes to the call, not to a fumbler he was not told about', () => {
  it('on: toward the caller', async () => {
    const r = await heads(true);
    expect(r.toCaller + r.toFumbler).toBeGreaterThan(0);
    expect(r.toFumbler).toBe(0);
  }, 180_000);
  it('off: toward the fumbler', async () => {
    const r = await heads(false);
    expect(r.toFumbler).toBeGreaterThan(r.toCaller);
  }, 180_000);
});
