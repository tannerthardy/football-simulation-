/** The passer's per-stage trace hook (src/sim/qb-trace.ts) and its dither-core reader: stages are named in the plan's cycle order; leaving a read is a re-aim charged to the stage that decided it;
 * coming back to the read he just left within 0.3 s is a reversal; the hook is a no-op without a recorder (no behaviour change). */
import { describe, expect, it } from 'vitest';
import { readDither, rates, ORDER, STAGE_NAME, type Acc } from '../scripts/diag/effective-mass/dither-core.js';
import { QB_STAGES, qbRead, qbStage } from '../src/sim/qb-trace.js';

describe('qb-trace', () => {
  it('is a no-op without a recorder', () => {
    const sim: any = { responsibility: undefined };
    expect(() => { qbStage(sim, 'qb-look', {} as any, { vel: { x: 1, y: 0 } }); qbRead(sim, {} as any, { read: 1, target: 'X', stage: 'qb-cycle' }); }).not.toThrow();
  });
  it('forwards a stage and a read to the recorder when there is one', () => {
    const got: string[] = []; const sim: any = { responsibility: { stage: (st: string) => got.push('stage ' + st), read: (_a: unknown, r: { read: number }) => got.push('read ' + r.read) } };
    qbStage(sim, 'qb-pocket', {} as any, { vel: { x: 0, y: 1 } }); qbRead(sim, {} as any, { read: 2, target: 'H', stage: 'qb-cycle' });
    expect(got).toEqual(['stage qb-pocket', 'read 2']);
  });
  it('names the QB stages in cycle order, ahead of the behaviour stage, each with a readable name', () => {
    expect(ORDER.slice(0, QB_STAGES.length)).toEqual([...QB_STAGES]);
    for (const st of QB_STAGES) expect(STAGE_NAME[st]).toBeTruthy();
  });
  it('a read left once is a re-aim by its stage; coming back within 0.3 s is a reversal; a late return is not', () => {
    const acc: Acc = {}; const note = readDither(acc); const qb = {};
    // read 1 held, left for 2 by the cycle at 1.00, back to 1 at 1.20 (reversal), left again for 2 by the pressure stage at 1.60, back at 2.20 (too late)
    const seq: [number, number, string][] = [[0.8, 1, 'qb-cycle'], [0.95, 1, 'qb-cycle'], [1.0, 2, 'qb-cycle'], [1.1, 2, 'qb-cycle'], [1.2, 1, 'qb-cycle'], [1.6, 2, 'qb-pressure'], [2.0, 2, 'qb-pressure'], [2.2, 1, 'qb-cycle']];
    for (const [t, read, stage] of seq) note(qb, t, 0.05, { read, stage });
    const g = acc['QB reads'];
    expect(g.reaims).toBe(4);
    expect(g.reversed).toBe(1);
    expect(g.src['qb cycle'].n).toBe(3); expect(g.src['qb cycle'].reversed).toBe(1);
    expect(g.src['qb pressure'].n).toBe(1); expect(g.src['qb pressure'].reversed).toBe(0);
    const r = rates(acc);
    expect(r.controller['QB reads'].reversed).toBe(1);
    expect(r.stage['QB reads / qb cycle'].reversed).toBe(1);
  });
});
