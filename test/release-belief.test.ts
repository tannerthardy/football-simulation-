/** RELEASE_BELIEF (src/sim/release-belief.ts): a defender's belief that the ball is gone, from the release cues he saw
 * (releaseEvidence, stubbed here with scripted cues): motion is loading, through is released from the arm, pulled
 * undoes an arm belief, the ball is released and is never undone; motion and through on one tick (a gap in his view)
 * both count; the belief is updated once per tick. */
import { describe, expect, it, vi } from 'vitest';

const script = new Map<number, { kind: string; at: number }[]>();
vi.mock('../src/sim/release-evidence.js', () => ({ releaseEvidence: (sim: { t: number }) => script.get(Math.round(sim.t * 100)) ?? [] }));
const { releaseBelief } = await import('../src/sim/release-belief.js');

function run(cues: Record<number, { kind: string; at: number }[]>, upto: number) {
  script.clear();
  for (const [t, c] of Object.entries(cues)) script.set(Math.round(Number(t) * 100), c);
  const sim: any = { t: 0 }, a: any = { idx: 7 };
  const out: any[] = [];
  for (let t = 0; t <= upto + 1e-9; t += 0.05) { sim.t = Math.round(t * 100) / 100; out.push({ t: sim.t, ...releaseBelief(sim, a) }); }
  return out;
}

describe('RELEASE_BELIEF: the release belief from the cues he saw', () => {
  it('motion is loading, through is released from the arm, the ball keeps it', () => {
    const b = run({ 0.5: [{ kind: 'motion', at: 0.25 }], 0.7: [{ kind: 'through', at: 0.45 }], 0.9: [{ kind: 'ball', at: 0.65 }] }, 1);
    expect(b.find((x) => x.t === 0.45)!.loadingAt).toBeUndefined();
    expect(b.find((x) => x.t === 0.5)!.loadingAt).toBe(0.25);
    expect(b.find((x) => x.t === 0.5)!.releasedAt).toBeUndefined();
    expect(b.find((x) => x.t === 0.7)).toMatchObject({ releasedAt: 0.45, source: 'arm' });
    expect(b.find((x) => x.t === 0.9)).toMatchObject({ releasedAt: 0.45, source: 'ball', ballAt: 0.65 });
  });

  it('a pump: through then pulled undoes the arm belief', () => {
    const b = run({ 0.5: [{ kind: 'motion', at: 0.25 }, { kind: 'through', at: 0.25 }], 0.8: [{ kind: 'pulled', at: 0.55 }] }, 1);
    expect(b.find((x) => x.t === 0.5)).toMatchObject({ loadingAt: 0.25, releasedAt: 0.25, source: 'arm' });
    expect(b.find((x) => x.t === 0.8)).toMatchObject({ loadingAt: undefined, releasedAt: undefined, source: undefined });
  });

  it('a pull-down never undoes a ball he saw', () => {
    const b = run({ 0.5: [{ kind: 'ball', at: 0.3 }], 0.8: [{ kind: 'pulled', at: 0.55 }] }, 1);
    expect(b.at(-1)).toMatchObject({ releasedAt: 0.3, source: 'ball', ballAt: 0.3 });
  });

  it('nothing seen is no belief', () => {
    const b = run({}, 1);
    expect(b.every((x) => x.releasedAt === undefined && x.loadingAt === undefined)).toBe(true);
  });
});
