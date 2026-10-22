/** SNAP_REACT (experimental, off): starts come from the count (reaction or
 * timing), and only represented pre-snap acts become fouls: a lineman's
 * visible early start or flinch, a defender past the line at the snap, or a
 * defender across the neutral zone into the man in front of him. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('SNAP_REACT', () => {
  it('fouls follow the represented acts; reactors never start before a visual response', async () => {
    vi.stubEnv('SNAP_REACT', '1'); vi.resetModules();
    const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
    const R = rosters();
    let dead = 0, early = 0, timed = 0;
    for (let seed = 1; seed <= 800; seed++) {
      const sim = makeSim({ concept: 'iz', dir: 'strong', formation: 'ace_12', look: 'over3', roster: 'pair11', seed } as never, R);
      const acts = sim.snapActs!, plans = sim.snapCount!.plans;
      const fouls = sim.snapAssessment.fouls.map((f) => `${f.kind}:${f.against}:${f.playerId}`);
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
        expect(fouls.filter((f) => /false_start|encroachment|neutral_zone/.test(f))).toEqual([]);
      }
    }
    // The sample exercises both paths.
    expect(timed).toBeGreaterThan(0);
    expect(early).toBeGreaterThan(0);
    expect(dead).toBeGreaterThan(0);
  }, 120000);
});
