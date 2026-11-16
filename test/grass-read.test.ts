/** GRASS_READ (src/playbook/read-compiler/runtime.ts; experimental, off): the plan marks the reads thrown before their
 * break into space, with the landing area as installed, for the QB lane's grass read. On the engine defaults (the stack's
 * flags stubbed on, as craft-hold.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function plans(on: boolean, ids: string[]) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('GRASS_READ', on ? '1' : '0');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { installedPlan } = await import('../src/playbook/read-compiler/runtime.js');
  return Object.fromEntries(ids.map((id) => [id, installedPlan(PASS_BY_ID[id], 'gun_doubles_11')!]));
}

describe('GRASS_READ', () => {
  it("mesh's corner is read 1 into grass: landing about 20 yd downfield, decided on his step", async () => {
    const { mesh } = await plans(true, ['mesh']);
    const corner = mesh.rhythm.find((r) => r.ref === 'S1')!;
    expect(corner.n).toBe(0);
    expect(corner.grass).toBeDefined();
    expect(corner.grass!.decided).toBe('step');
    expect(corner.grass!.landing.x).toBeGreaterThanOrEqual(19.5);
    expect(corner.grass!.landing.x).toBeLessThan(20.5);
    // Toward his own side, outside where he lined up: a corner breaks to the sideline.
    expect(Math.abs(corner.grass!.landing.y)).toBeGreaterThan(10);
    expect(corner.grass!.t).toBeGreaterThan(corner.ready);
    // The crossers are thrown on their break, not into grass.
    for (const r of mesh.rhythm.filter((x) => x.ref !== 'S1' && x.ref !== 'W1')) expect(r.grass).toBeUndefined();
  }, 120_000);

  it('verticals are grass reads; a keyed corner, a post and an out are not', async () => {
    const p = await plans(true, ['four_verts', 'smash', 'hitch_post', 'double_outs']);
    const verts = p.four_verts.rhythm.filter((r) => r.ref !== 'B');
    expect(verts.length).toBeGreaterThanOrEqual(4);
    for (const r of verts) { expect(r.grass).toBeDefined(); expect(r.grass!.landing.x).toBeGreaterThanOrEqual(19.5); expect(r.grass!.landing.x).toBeLessThan(20.5); }
    // smash's corner is the high half of the key: thrown off the defender, not the grass.
    expect(p.smash.key).not.toBeNull();
    expect(p.smash.rhythm.find((r) => r.ref === p.smash.key!.high)!.grass).toBeUndefined();
    // hitch_post's post (S2) and double_outs' outs are thrown on their breaks.
    expect(p.hitch_post.rhythm.find((r) => r.ref === 'S2')!.grass).toBeUndefined();
    for (const r of p.double_outs.rhythm) expect(r.grass).toBeUndefined();
  }, 120_000);

  it("a seam's grass read is on the hitch, past the hook: never on the set, and the reads after it do not go back", async () => {
    const p = await plans(true, ['verts_hitch', 'dagger', 'four_verts']);
    for (const plan of Object.values(p)) {
      let floor = 0;
      for (const r of plan.rhythm.filter((x) => x.ref !== plan.outlet)) { expect(r.n).toBeGreaterThanOrEqual(floor); floor = r.n; }
    }
    // verts_hitch's and dagger's seams (S2 from gun doubles) were read on the set; now on the hitch.
    expect(p.verts_hitch.rhythm.find((r) => r.ref === 'S2')!.n).toBe(1);
    expect(p.dagger.rhythm.find((r) => r.ref === 'S2')!.n).toBe(1);
  }, 120_000);

  it('off, no read carries a grass entry', async () => {
    const p = await plans(false, ['mesh', 'four_verts']);
    for (const plan of Object.values(p)) for (const r of plan.rhythm) expect(r.grass).toBeUndefined();
  }, 120_000);
});
