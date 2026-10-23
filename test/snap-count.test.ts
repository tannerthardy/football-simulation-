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

describe('HARD_COUNT_LAPSE', () => {
  // One snap plan's men: five offensive linemen and five defenders on the
  // line, all of the same discipline and anticipation.
  async function extraSoundStarts(flag: string, discipline: number) {
    vi.stubEnv('HARD_COUNT_LAPSE', flag); vi.resetModules();
    const { Rng } = await import('../src/core/rng.js');
    const { planSnap, BEAT } = await import('../src/sim/snap-count.js');
    const man = (team: 'O' | 'D', slot: string) => ({ team, slot, mind: { snapDelay: 0.05 },
      profile: { reactionTime: 0.5 }, r: (k: string) => (k === 'discipline' ? discipline : 0.5) });
    const men = [...['LT', 'LG', 'C', 'RG', 'RT'].map((s) => man('O', s)), ...['DE_L', 'DT_L', 'DT_R', 'DE_R', 'LB_S'].map((s) => man('D', s))];
    const n = { O: 0, D: 0, hard: 0 };
    for (let seed = 1; seed <= 6000; seed++) {
      const c = planSnap(men as never, { down: 1, distance: 10, offBall: () => 0.5 }, new Rng(seed));
      if (!c.hard) continue;
      n.hard++;
      // Going on the extra sound: a start about a beat before the snap.
      for (const m of men) if (c.plans.get(m as never)!.go < -BEAT / 2) n[m.team]++;
    }
    return { o: n.O / (5 * n.hard), d: n.D / (5 * n.hard), hard: n.hard };
  }

  it('an extra sound draws a defender who times the count no more than a lineman who goes on the sound', async () => {
    const on = await extraSoundStarts('1', 0.5);
    expect(on.hard).toBeGreaterThan(400);
    // Same lapse for both lines: 0.005 + 0.03 * 0.5 = 2% for a lineman; a
    // defender is drawn only if he was timing the count (most do).
    expect(on.o).toBeGreaterThan(0.01); expect(on.o).toBeLessThan(0.03);
    expect(on.d).toBeLessThanOrEqual(on.o + 0.01);
    const off = await extraSoundStarts('0', 0.5);
    // The separate bite drew defenders about three times as readily.
    expect(off.d).toBeGreaterThan(2 * on.d);
  });
});
