import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { DB_SLOTS, generateTeam } from '../src/league/team.js';

const rosters = (n: number) => Array.from({ length: n }, (_, i) => generateTeam(new Rng(5000 + i), 'T', `T${i}`, { strength: 0.55 }));

describe('DB_SLOTS: safeties fill the safety slots before the nickel and dime', () => {
  afterEach(() => { delete process.env.DB_SLOTS; vi.resetModules(); });

  // Promoted on at run-ref-21 (re-recorded 2026-11-18, Coverage): on by default; DB_SLOTS=0 restores the installed order.
  it('is on by default; DB_SLOTS=0 leaves the installed order (an LB can still take SS)', async () => {
    expect(DB_SLOTS).toBe(true);
    process.env.DB_SLOTS = '0';
    vi.resetModules();
    const team = await import('../src/league/team.js');
    expect(team.DB_SLOTS).toBe(false);
    const ss = rosters(40).map((t) => team.pickDefense(t, 'dime').SS!.position);
    expect(ss).toContain('LB');
  });

  it('with it on, FS and SS are safeties and the nickel and dime are defensive backs', async () => {
    process.env.DB_SLOTS = '1';
    vi.resetModules();
    const team = await import('../src/league/team.js');
    expect(team.DB_SLOTS).toBe(true);
    for (const t of rosters(40)) for (const pers of ['base43', 'nickel', 'dime'] as const) {
      const d = team.pickDefense(t, pers);
      expect(d.FS!.position).toBe('S');
      expect(d.SS!.position).toBe('S');
      for (const slot of ['NB', 'DB'] as const) if (d[slot]) expect(['CB', 'S']).toContain(d[slot]!.position);
      const ids = Object.values(d).map((p) => p!.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('falls back to a corner, then a backer, only when no safety is available', async () => {
    process.env.DB_SLOTS = '1';
    vi.resetModules();
    const team = await import('../src/league/team.js');
    const t = rosters(1)[0];
    const unavailable = new Set(t.roster.filter((p) => p.position === 'S').map((p) => p.id));
    const d = team.pickDefense(t, 'base43', { unavailable });
    expect(d.FS!.position).toBe('CB');
    expect(['CB', 'LB']).toContain(d.SS!.position);
  });
});
