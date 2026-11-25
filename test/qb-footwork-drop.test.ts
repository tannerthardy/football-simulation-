/** QB_FOOTWORK bit 2 (behaviors/qb.ts; read with bit 1, on CONCEPT_DROPS): the drop's body, staged.
 * 1. The crossover: by the middle of his drop his chest is open off downfield (bit 2 off: square to it).
 * 2. Shoulders on a step: in the pocket the facing he requests does not turn on a look alone; it turns at the plant, on a
 *    landed step, or for the throw (bit 2 off: it turns whenever his eyes or read move).
 * 3. Bit 16 (split from bit 2): the play-action fake is planned to the measured mesh: from the gun past 1.4 s (off, and
 *    with bit 2 alone: 0.7 s); with the blitz stack he cuts it short only when he believes a free rusher (BLITZ_SKILL).
 * docs/reviews/2026-11-15-drop-design-stage1.md. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const DROPBACKS: [string, string, number][] = [];
for (const concept of ['smash', 'dagger', 'stick', 'four_verts']) for (const coverage of ['cover1', 'cover3']) for (const seed of [1, 2]) DROPBACKS.push([concept, coverage, seed]);

async function load(fw: string) {
  vi.resetModules();
  const stack = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8'));
  const flags: Record<string, string> = stack.flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  // The reference stack's numeric settings too (the suite pins them to their legacy values).
  for (const [k, v] of Object.entries(stack.numeric ?? {}) as [string, { default: number }][]) vi.stubEnv(k, String(v.default));
  vi.stubEnv('CONCEPT_DROPS', '1'); vi.stubEnv('QB_FOOTWORK', fw);
  // QB_V2 (engine-108, QB lane, pinned test-only): this panel's stick rows are the gun3 drop's crossover. With V2, stick
  // from the gun runs its read plan's quick drop, the 1.6 yd drift with no crossover, so the panel keeps the old passer's
  // drop. The drop body itself is unchanged.
  vi.stubEnv('QB_V2', '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  return { PlaySim, nativeTraceSetup };
}
const DEG = 180 / Math.PI, d = (a: number, b: number) => Math.abs(((b - a) * DEG + 540) % 360 - 180);

async function drops(fw: string) {
  const { PlaySim, nativeTraceSetup } = await load(fw);
  const out: { midOpen: number | null; lookTurns: number; looks: number }[] = [];
  for (const [concept, coverage, seed] of DROPBACKS) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
    const qb: any = sim.qb.behavior, dir = sim.attackDir(sim.qb.team), down = dir > 0 ? 0 : Math.PI;
    const x0 = sim.qb.pos.x, depthAll = Math.abs(x0 - qb.drop.x);
    let midOpen: number | null = null, lookTurns = 0, looks = 0, prev: any = null;
    const up = qb.update.bind(qb);
    qb.update = (a: any, s: any) => {
      const before = { eyes: s.qbEyes, idx: qb.readIdx, landed: qb.landedSteps, phase: qb.phase };
      const cmd = up(a, s);
      if (sim.carrier === sim.qb && cmd && Number.isFinite(cmd.facing)) {
        if (qb.phase === 'drop' && midOpen === null && Math.abs(a.pos.x - x0) >= depthAll / 2) midOpen = d(down, cmd.facing);
        // A look alone: his eyes or read moved this tick, no step landed, no phase change (set / windup).
        if (prev && qb.phase === 'set' && before.phase === 'set' && (s.qbEyes !== prev.eyes || qb.readIdx !== prev.idx) && qb.landedSteps === before.landed) {
          looks++;
          if (d(prev.f, cmd.facing) > 20) lookTurns++;
        }
        prev = { f: cmd.facing, eyes: s.qbEyes, idx: qb.readIdx };
      }
      return cmd;
    };
    for (let i = 0; i < 600 && sim.phase === 'live' && sim.carrier === sim.qb; i++) sim.tick();
    out.push({ midOpen, lookTurns, looks });
  }
  return out;
}

async function fakeEnd(fw: string) {
  const { PlaySim, nativeTraceSetup } = await load(fw);
  const ends: { end: number; planned: number; freeU: number }[] = [];
  for (const [concept, coverage] of [['pa_shot', 'cover3'], ['pa_post_dig', 'cover1'], ['pa_flood', 'cover3']] as const) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed: 1, roster: 7, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
    const qb: any = sim.qb.behavior;
    for (let i = 0; i < 400 && sim.phase === 'live' && qb.fakeEndAt === null && sim.qb.behavior === qb; i++) sim.tick();
    if (qb.fakeEndAt !== null) ends.push({ end: qb.fakeEndAt, planned: qb.fakeUntil, freeU: qb.freeU ?? 0 });
  }
  return ends;
}

describe('QB_FOOTWORK bit 2: the drop body', () => {
  it('the crossover: his chest opens off downfield by mid-drop (off: square)', async () => {
    const off = (await drops('1')).map((r) => r.midOpen).filter((x): x is number => x !== null);
    const on = (await drops('3')).map((r) => r.midOpen).filter((x): x is number => x !== null);
    expect(off.length).toBeGreaterThanOrEqual(10); expect(on.length).toBeGreaterThanOrEqual(10);
    expect(Math.max(...off)).toBeLessThan(5);
    expect(on.filter((x) => x >= 30).length / on.length).toBeGreaterThanOrEqual(0.8);
  }, 600_000);
  it('shoulders on a step: a look alone does not turn his requested facing (off: it does)', async () => {
    const off = await drops('1'), on = await drops('3');
    const sum = (r: typeof off, k: 'lookTurns' | 'looks') => r.reduce((s, x) => s + x[k], 0);
    expect(sum(off, 'looks')).toBeGreaterThanOrEqual(5); expect(sum(on, 'looks')).toBeGreaterThanOrEqual(5);
    expect(sum(off, 'lookTurns')).toBeGreaterThan(0);
    expect(sum(on, 'lookTurns')).toBe(0);
  }, 600_000);
  it('bit 16: the play-action fake is planned to the measured mesh (gun past 1.4 s; bits 1+2 alone 0.7 s), cut short only by a believed free rusher', async () => {
    const off = await fakeEnd('3'), on = await fakeEnd('19');
    expect(off.length).toBeGreaterThanOrEqual(2); expect(on.length).toBeGreaterThanOrEqual(2);
    for (const r of off) { expect(r.planned).toBeLessThan(0.8); expect(r.end).toBeLessThan(0.8); }
    // With the blitz stack (engine-72), BLITZ_SKILL cuts the fake short in proportion to his believed free threat.
    for (const r of on) { expect(r.planned).toBeGreaterThan(1.4); expect(r.end >= 1.4 || r.freeU > 0).toBe(true); }
  }, 600_000);
});
