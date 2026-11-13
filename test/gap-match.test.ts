import { describe, expect, it } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { FRONT_BY_ID } from '../src/playbook/defense.js';
import type { Gap } from '../src/playbook/types.js';
import { PlaySim } from '../src/sim/playsim.js';

// GAP_MATCH (on by default): backers fill the front's open gaps as a set.
function fits(front: string, formation: string) {
  const setup = nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'wz_weak', seed: 1, roster: 7, formation, flip: false });
  setup.defCall = { ...setup.defCall, front: FRONT_BY_ID[front]! };
  const sim = new PlaySim(setup);
  const s = sim.offAlign.strongSign;
  const owned = new Set<string>();
  for (const d of sim.defense) {
    const job = d.runFit;
    if (!job) continue;
    const fit = job.kind === 'force' && job.inside ? job.inside : job;
    if (job.kind !== 'alley') owned.add(`${fit.side === s ? 'S' : 'W'}${fit.gap}`);
  }
  return { sim, owned, job: (slot: string) => sim.slot(slot)!.runFit! };
}

describe('backers fill the front as a set', () => {
  it('nickel Under vs two tight ends: the Will owns the gap between the weak tackle and the tight end', () => {
    const { owned, job, sim } = fits('under', 'ace_12');
    const s = sim.offAlign.strongSign;
    // The weak side has A, B, C and D gaps; every one has a first-level owner.
    for (const gap of ['A', 'B', 'C', 'D'] as Gap[]) expect(owned.has(`W${gap}`)).toBe(true);
    // The Will keeps outside support but fits the C gap inside the boxing end;
    // the Mike slides to the weak A gap. The strong B is the down safety's.
    expect(job('LB_W').inside).toEqual({ side: -s, gap: 'C' });
    expect(job('LB_M')).toMatchObject({ side: -s, gap: 'A', kind: 'insert' });
    expect(owned.has('SB')).toBe(false);
    expect(sim.defense.some(d => d.slot === 'SS' && d.runFit?.kind === 'alley' && (d.pos.y - sim.ballY) * s > 0)).toBe(true);
  });
});
