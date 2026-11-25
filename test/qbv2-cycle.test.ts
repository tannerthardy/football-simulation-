// QB_V2 module E skeleton (QB lane, 2026-11-24): the cycle's decisions on fake senses, against the stub slant-flat plan
// (src/sim/qbv2/plan.ts). No simulation: what the state machine does with a given picture.
import { describe, expect, it } from 'vitest';
import { Cycle, type CycleSenses, type Judged } from '../src/sim/qbv2/cycle.js';
import { STUB_SLANT_FLAT, type ThrowOption } from '../src/sim/qbv2/plan.js';

function senses(over: Partial<CycleSenses> & { now: number }, P: Record<string, number> = {}, cue: string | null = null): CycleSenses {
  return {
    plantAt: 1.0, stride: 0.4, felt: 0, outside: false, tau: 0.2, need: 0.6, bar: { P: 0.6, risk: 0.05 }, hotSide: null,
    inClear: () => true, canReach: () => true,
    judge: (o: ThrowOption): Judged | null => (o.ref in P ? { option: o, P: P[o.ref], risk: 0.01, reachesSticks: false } : null),
    keyCue: () => cue,
    ...over,
  };
}
function run(c: Cycle, from: number, to: number, f: (t: number) => CycleSenses) {
  const out = [];
  for (let t = from; t <= to + 1e-9; t += 0.05) out.push({ t: +t.toFixed(2), i: c.tick(f(t)), read: c.readIdx, state: c.state });
  return out;
}

describe('QB_V2 cycle (module E) on the stub slant-flat plan', () => {
  it('a key read throws what the key names once the look is resolved, and not before', () => {
    const c = new Cycle(STUB_SLANT_FLAT);
    const tr = run(c, 0, 1.6, (t) => senses({ now: t }, { S1: 0.8, S2: 0.9 }, 'widens'));
    const th = tr.find((x) => x.i.kind === 'throw');
    expect(th && th.i.kind === 'throw' && th.i.judged.option.ref).toBe('S1'); // widens names the slant, though the flat's P is higher
    expect(th!.t).toBeGreaterThanOrEqual(1.0 + 0.2 * Math.log(1 / 0.4) - 0.06); // resolved past need 0.6 at tau 0.2
  });

  it('a look that cannot resolve (outside his cone, head cannot get there) does not hold: the eyes move on the next step', () => {
    const c = new Cycle(STUB_SLANT_FLAT);
    const tr = run(c, 0, 1.6, (t) => senses({ now: t, inClear: () => false, canReach: () => false }, {}));
    const moved = tr.find((x) => x.read === 1);
    expect(moved?.t).toBeCloseTo(1.4, 1); // step 1 lands at the plant plus one stride
  });

  it('an unresolved look that is resolving holds past its step (the stare-down), bounded', () => {
    const c = new Cycle(STUB_SLANT_FLAT);
    // Slow processing (tau 1.0) and a high need (0.9): still resolving at step 1.
    const tr = run(c, 0, 4.0, (t) => senses({ now: t, tau: 1.0, need: 0.9 }, {}));
    const moved = tr.find((x) => x.read === 1)!;
    expect(moved.t).toBeGreaterThan(1.45);
    expect(moved.t).toBeLessThanOrEqual(1.4 + 1.0 * Math.log(10) + 0.06);
  });

  it('out of structure is one more pass, then no restart at read 1', () => {
    const c = new Cycle(STUB_SLANT_FLAT);
    const tr = run(c, 0, 6.0, (t) => senses({ now: t }, {}));
    expect(c.outPass).toBe(1);
    expect(tr.at(-1)!.i.kind).toBe('move');
    expect(tr.filter((x) => x.state === 'structureOut').length).toBeGreaterThan(0);
  });

  it('pressure is chosen by state with margins: felt does not pre-empt a read, imminent moves him, and it holds to its exit', () => {
    const c = new Cycle(STUB_SLANT_FLAT);
    expect(c.tick(senses({ now: 1.1, felt: 0.7 })).kind).toBe('look');
    expect(c.pressure).toBe('felt');
    expect(c.tick(senses({ now: 1.15, felt: 0.9 })).kind).toBe('move');
    expect(c.tick(senses({ now: 1.2, felt: 0.75 })).kind).toBe('move'); // above imminent's exit 0.7: still imminent
    c.tick(senses({ now: 1.25, felt: 0.65 }));
    expect(c.pressure).toBe('felt');
  });
});

describe('QB_V2 cycle: a covered read marked kill', () => {
  it('throws at the read receiver\'s feet once resolved and answered no', () => {
    const plan = { ...STUB_SLANT_FLAT, reads: [{ ...STUB_SLANT_FLAT.reads[0], look: { kind: 'receiver' as const, ref: 'S1' as const }, keyRules: undefined, onCovered: 'kill' as const }] };
    const c = new Cycle(plan);
    let i: ReturnType<Cycle['tick']> = { kind: 'look', target: null };
    for (let t = 0; t <= 1.6 && i.kind !== 'kill'; t += 0.05) i = c.tick(senses({ now: t }, { S1: 0.2, S2: 0.3 }));
    expect(i).toEqual({ kind: 'kill', ref: 'S1' });
  });

  // The outside audit's rows (2026-11-24), each as its staged rule.
  it('a commit the wiring cannot start fails back to the read (audit §1 #1)', () => {
    const c = new Cycle(STUB_SLANT_FLAT);
    const tr = run(c, 0, 1.6, (t) => senses({ now: t }, { S1: 0.8 }, 'widens'));
    expect(tr.some((x) => x.i.kind === 'throw')).toBe(true);
    c.uncommit();
    expect(c.state).toBe('read');
    expect(c.decision).toBeNull();
  });

  it('with a body on him and nothing clearing, he throws it away in the pocket (audit §1 #4)', () => {
    const c = new Cycle(STUB_SLANT_FLAT);
    const tr = run(c, 0, 1.3, (t) => senses({ now: t, contact: t > 1.1 }, {}));
    expect(c.pressure).toBe('contact');
    expect(tr[tr.length - 1].i.kind).toBe('away');
  });

  it('escape is left when he is back inside the pocket (audit §1 #5)', () => {
    const c = new Cycle(STUB_SLANT_FLAT);
    run(c, 0, 1.2, (t) => senses({ now: t }, {}));
    c.tick(senses({ now: 1.25, outside: true }, {}));
    expect(c.state).toBe('escape');
    c.tick(senses({ now: 1.3, outside: false }, {}));
    expect(c.state).not.toBe('escape');
  });
});
