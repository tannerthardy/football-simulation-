/** QB_FOOTWORK bit 16 (behaviors/qb.ts; with Rules' plantAt / decided 'plant', #819): the play-action read decided on
 * the plant out of the fake. A keyed play action's key is read at the plan's plant, not before; read 1 is thrown on its
 * own ready, not skipped for being unready at the plant: staged, read 1 is thrown more often than with bits 1+2. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(fw: string) {
  vi.resetModules();
  const stack = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(stack.flags as Record<string, string>)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('DIR_START', '0'); // engine-92: fixture recorded before a start from rest cost the legs in a direction they were not loaded for; the owning lane to re-record with it on
  for (const [k, v] of Object.entries(stack.numeric ?? {}) as [string, { default: number }][]) vi.stubEnv(k, String(v.default));
  vi.stubEnv('CONCEPT_DROPS', '1'); vi.stubEnv('QB_FOOTWORK', fw);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { keyAt: number | null; plantAt: number | null; read1: boolean }[] = [];
  for (const concept of ['pa_post_dig', 'pa_shot', 'pa_flood']) for (const coverage of ['cover1', 'cover3', 'cover4']) for (const roster of [3, 7]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed: 1, roster, formation: 'gun_doubles_11', flip: false }));
    let qb: any = null, first: any = null, read1 = false;
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, t: any, ...r: any[]) => { if (p === sim.qb && qb && !read1 && first === null) { first = t; read1 = qb.readIdx === 0; } return tb(p, t, ...r); };
    for (let i = 0; i < 600 && sim.phase === 'live' && sim.carrier === sim.qb; i++) { sim.tick(); if (sim.qb.behavior?.kind === 'qb-pass') qb = sim.qb.behavior; }
    const plan = qb?.plan;
    out.push({ keyAt: qb?.keyRead?.at ?? null, plantAt: plan?.key ? plan.key.cueBy : null, read1 });
  }
  return out;
}

describe('QB_FOOTWORK bit 16: the play-action read on the plant', () => {
  it('reads a keyed play action at the plant and throws read 1 more often than bits 1+2', async () => {
    const off = await run('3'), on = await run('19');
    const keyed = on.filter((r) => r.keyAt !== null && r.plantAt !== null);
    expect(keyed.length).toBeGreaterThanOrEqual(4);
    for (const r of keyed) expect(r.keyAt!).toBeGreaterThanOrEqual(r.plantAt! - 1e-9);
    expect(on.filter((r) => r.read1).length).toBeGreaterThan(off.filter((r) => r.read1).length);
  }, 600_000);
});
