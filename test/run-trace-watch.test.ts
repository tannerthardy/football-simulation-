import { describe, expect, it } from 'vitest';
import { PlaySim } from '../src/sim/playsim.js';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { watchRunPlay } from '../scripts/diag/run-trace-watch.js';

const recipe = { coverage: 'cover3_buzz', concept: 'iz_strong', seed: 1, roster: 7, formation: 'i_pro_21', flip: false };
const finish = (sim: PlaySim) => { const r = sim.run(); return JSON.stringify({ r, rng: { ...sim.rng }, bodies: sim.agents.map(a => [a.body.pos, a.body.vel, a.body.facing]) }); };

describe('run-play trace (scripts/diag/run-trace-watch.ts)', () => {
  it('only reads: the play, its RNG and every body end exactly as without it', () => {
    const plain = finish(new PlaySim(nativeTraceSetup(recipe)));
    const traced = new PlaySim(nativeTraceSetup(recipe));
    const get = watchRunPlay(traced);
    expect(finish(traced)).toBe(plain);
    const rec = get() as unknown as { setup: { agents: unknown[]; concept?: string }; frames: Array<{ t: number; a: unknown[] }> };
    expect(rec.setup.agents.length).toBe(22);
    expect(rec.frames.length).toBeGreaterThan(20);
    expect(rec.frames[0].a.length).toBe(22);
  });
});
