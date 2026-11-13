/** SNAP_REACT (experimental, off): starts come from the count (reaction or
 * timing), and only represented pre-snap acts become fouls: a lineman's
 * visible early start or flinch, a defender past the line at the snap, or a
 * defender across the neutral zone into the man in front of him. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('SNAP_REACT', () => {
  it('fouls follow the represented acts; reactors never start before a visual response', async () => {
    vi.stubEnv('SNAP_REACT', '1'); vi.resetModules();
    const { Rng } = await import('../src/core/rng.js');
    const { CENTER_Y } = await import('../src/core/field.js');
    const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
    const { RUN_BY_ID } = await import('../src/playbook/concepts.js');
    const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
    const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
    const { PlaySim } = await import('../src/sim/playsim.js');
    // Ported from claude/run-game-v3, where it staged the zone lab's case; the
    // same snap, built here from the ordinary play setup.
    const o = generateTeam(new Rng(11), 'O', 'O', { strength: .55 }), dd = generateTeam(new Rng(12), 'D', 'D', { strength: .55 });
    let dead = 0, early = 0, timed = 0;
    for (let seed = 1; seed <= 800; seed++) {
      const sim = new PlaySim({ offense: pickOffense(o, '12'), defense: pickDefense(dd, 'base43'),
        offCall: { formation: FORMATION_BY_ID.ace_12, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'iz' },
        defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'over3' },
        los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
      const acts = sim.snapActs!, plans = sim.snapCount!.plans;
      const fouls = sim.snapAssessment.fouls.map((f) => `${f.kind}:${f.against}:${f.playerId}`);
      // Every start comes from the count on every snap, early movers or not.
      if (!sim.snapDead) for (const a of sim.agents) {
        const p = plans.get(a)!;
        expect(a.snapReadyAt).toBe(p.stop !== undefined ? p.restart : Math.max(0, p.go));
      }
      for (const d of sim.defense) {
        const p = plans.get(d)!;
        if (!p.timed) expect(p.go).toBeGreaterThanOrEqual(0.1);
        else timed++;
        if (p.go < 0) early++;
        // Standing still never puts a man past the line.
        if (p.go >= 0) expect(acts.inZone.has(d.player.id)).toBe(false);
      }
      if (sim.snapDead) {
        dead++;
        expect(sim.snapAssessment.snapPermitted).toBe(false);
        for (const id of acts.falseStarts) expect(fouls).toContain(`false_start:O:${id}`);
        for (const i of acts.incidents)
          expect(fouls).toContain(`${i.contactedOpponentOrBall ? 'encroachment' : 'neutral_zone_infraction'}:D:${i.playerId}`);
        expect(acts.falseStarts.size + acts.incidents.length).toBe(1);
      } else {
        expect(acts.falseStarts.size + acts.incidents.length).toBe(0);
        for (const id of acts.inZone) expect(fouls).toContain(`offside:D:${id}`);
        expect(fouls.filter((f: string) => /false_start|encroachment|neutral_zone/.test(f))).toEqual([]);
      }
    }
    // The sample exercises both paths.
    expect(timed).toBeGreaterThan(0);
    expect(early).toBeGreaterThan(0);
    expect(dead).toBeGreaterThan(0);
  }, 120000);
});
