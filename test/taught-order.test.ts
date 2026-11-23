/** TAUGHT_ORDER (src/playbook/taught-reads.ts; experimental, off): the taught read is the one source of the order. On,
 * every concept's installed plan from gun doubles and trips reads the taught refs in the taught order (an installed
 * key's pair leads as one look), reads no route the taught list leaves out, and the call's progression is the list;
 * off, the call keeps its hand-written progression. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(on: boolean) {
  vi.stubEnv('TAUGHT_ORDER', on ? '1' : '0');
  vi.resetModules();
  const { PASS_CONCEPTS } = await import('../src/playbook/concepts.js');
  const { installedPlan } = await import('../src/playbook/read-compiler/runtime.js');
  const { TAUGHT_READS } = await import('../src/playbook/taught-reads.js');
  return { PASS_CONCEPTS, installedPlan, TAUGHT_READS };
}

describe('TAUGHT_ORDER', () => {
  it('installs the taught order and makes it the call\'s progression', async () => {
    const off = await load(false);
    const offMesh = off.PASS_CONCEPTS.find((c: any) => c.id === 'mesh')!;
    expect(offMesh.progression).not.toEqual(off.TAUGHT_READS.mesh);
    const { PASS_CONCEPTS, installedPlan, TAUGHT_READS } = await load(true);
    let checked = 0;
    for (const c of PASS_CONCEPTS as any[]) {
      const taught = TAUGHT_READS[c.id];
      if (!taught) continue;
      expect(c.progression).toEqual(taught);
      for (const f of ['gun_doubles_11', 'gun_trips_11']) {
        const p: any = installedPlan(c, f);
        if (!p) continue;
        const key = p.key ? [p.key.high, p.key.low] : [];
        const rest = p.order.filter((r: string) => !key.includes(r));
        expect(rest.every((r: string) => (taught as string[]).includes(r)), `${c.id} ${f}: ${p.order}`).toBe(true);
        const t = taught.filter((r: string) => rest.includes(r));
        expect(rest, `${c.id} ${f}`).toEqual(t);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(50);
  }, 300000);
});
