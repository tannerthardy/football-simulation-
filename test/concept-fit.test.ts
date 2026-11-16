/** CONCEPT_FIT (src/game/concept-fit.ts, playcaller.ts; experimental, off): a pass concept is called only from a field
 * that has the receivers its read names, after the called motion. On the engine defaults (the stack's flags stubbed on,
 * as craft-hold.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(on: boolean) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('CONCEPT_FIT', on ? '1' : '0');
  const fit = await import('../src/game/concept-fit.js');
  const { PASS_BY_ID, PASS_CONCEPTS } = await import('../src/playbook/concepts.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { OffensiveCoordinator } = await import('../src/game/playcaller.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickOffense, alignStyle } = await import('../src/league/team.js');
  const { derivePhysical } = await import('../src/players/physical.js');
  return { fit, PASS_BY_ID, PASS_CONCEPTS, FORMATION_BY_ID, OffensiveCoordinator, Rng, generateTeam, pickOffense, alignStyle, derivePhysical };
}

describe('CONCEPT_FIT', () => {
  it('every pool concept carries the receivers its read names', async () => {
    const { PASS_CONCEPTS } = await load(true);
    for (const c of PASS_CONCEPTS) expect(c.needs?.length, c.id).toBeGreaterThanOrEqual(2);
  });

  it('a field fits a concept when it has the named receivers: verts_hitch and mesh by structure, four_verts from both', async () => {
    const { fit, PASS_BY_ID } = await load(true);
    const doubles = new Set(['S1', 'S2', 'W1', 'W2', 'B'] as const), trips = new Set(['S1', 'S2', 'S3', 'W1', 'B'] as const);
    expect(fit.conceptFits(PASS_BY_ID.verts_hitch, trips)).toBe(true);
    expect(fit.conceptFits(PASS_BY_ID.verts_hitch, doubles)).toBe(false);
    expect(fit.conceptFits(PASS_BY_ID.mesh, doubles)).toBe(true);
    expect(fit.conceptFits(PASS_BY_ID.mesh, trips)).toBe(false);
    // Two seams: #2 and the weak #2 from 2x2, #2 and #3 from trips.
    expect(fit.conceptFits(PASS_BY_ID.four_verts, doubles)).toBe(true);
    expect(fit.conceptFits(PASS_BY_ID.four_verts, trips)).toBe(true);
  });

  it('the field after motion: Z across from gun doubles sets trips', async () => {
    const { fit, FORMATION_BY_ID, PASS_BY_ID } = await load(true);
    const at = { los: 40, bodies: {}, ctx: { kind: 'pass' as const, pass: PASS_BY_ID.verts_hitch } };
    const still = fit.fieldRefs(FORMATION_BY_ID.gun_doubles_11, false, 26.65, undefined, at);
    const moved = fit.fieldRefs(FORMATION_BY_ID.gun_doubles_11, false, 26.65, { slot: 'Z', kind: 'across' }, at);
    expect(still.has('W2') && !still.has('S3')).toBe(true);
    expect(moved.has('S3') && !moved.has('W2')).toBe(true);
  });

  it('on, the caller never calls a concept the field it will snap does not fit; off, it does', async () => {
    const count = async (on: boolean) => {
      const m = await load(on);
      const team = m.generateTeam(new m.Rng(5), 'Off', 'OFF', { strength: 0.55 }), opp = m.generateTeam(new m.Rng(6), 'Def', 'DEF', { strength: 0.55 });
      const oc = new m.OffensiveCoordinator(team, new m.Rng(11));
      let calls = 0, misfits = 0;
      for (let i = 0; i < 400; i++) {
        const s = { down: 1 + (i % 3), distance: [10, 7, 4][i % 3], yardline: 30 + (i % 40), quarter: 1 + (i % 4), clock: 600, scoreDiff: 0, ballY: 20 + (i % 14), hurry: false };
        const call = oc.call(s, opp);
        if (call.kind !== 'pass' || !call.pass?.needs) continue;
        calls++;
        const bodies = Object.fromEntries(Object.entries(m.pickOffense(team, call.formation.personnel)).map(([k, p]) => [k, m.derivePhysical(p)]));
        const refs = m.fit.fieldRefs(call.formation, call.flip, s.ballY, call.motion, { los: 10 + s.yardline, bodies,
          ctx: { kind: 'pass', pass: m.PASS_BY_ID[call.pass.id.split('+')[0]] ?? call.pass, down: s.down, distance: s.distance, style: m.alignStyle(team) } });
        if (!m.fit.conceptFits(call.pass, refs)) misfits++;
      }
      return { calls, misfits };
    };
    const off = await count(false), on = await count(true);
    expect(off.calls).toBeGreaterThan(100);
    expect(off.misfits).toBeGreaterThan(5);
    expect(on.calls).toBeGreaterThan(100);
    expect(on.misfits).toBe(0);
  }, 120_000);
});
