/** SIGHT_STALE (inside SIGHT_PURE): the pictures of a man a player cannot see. `staleOf` carries a lost sighting on its velocity for the record's
 * length and then holds it (bit 1), marks it stale with a spread that grows with its age (bit 2); a man not seen since the snap is believed where he
 * lined up, not at the record's oldest true sample (bit 4). Query-order invariance still holds with every bit on (docs/reviews/2026-11-16-sight-stale.md). */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function play(extra: boolean, kind: 'run' | 'pass'): Promise<string> {
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID, RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(101), 'Pure O', 'PRO', { strength: .55 }), defense = generateTeam(new Rng(102), 'Pure D', 'PRD', { strength: .55 });
  const formation = FORMATION_BY_ID.ace_12;
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: kind === 'run' ? { formation, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'oz' } : { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'cf' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
    los: 35, ballY: 26.65, firstDownX: 45, seed: 3 } as never);
  if (extra) {
    const record = sim.perception.record.bind(sim.perception); let asking = false;
    sim.perception.record = (...args: unknown[]) => {
      record(...args);
      if (asking || !(sim.t > 0.2)) return;
      asking = true;
      for (const o of sim.agents) for (const t of sim.agents) {
        if (o === t) continue;
        for (const d of [0.05, 0.2, 0.45]) {
          const seen = sim.perception.perceive(t.idx, d);
          sim.sighted(o, t, seen, false); sim.sighted(o, t, seen, true); sim.sighted(o, t, seen, true, true);
        }
      }
      asking = false;
    };
  }
  const r = sim.run();
  return JSON.stringify([r.outcome, +r.yards.toFixed(4), sim.agents.map((a: any) => [+a.pos.x.toFixed(4), +a.pos.y.toFixed(4)])]);
}

describe('SIGHT_STALE', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  const pic = (age: number) => ({ pos: { x: 10 + 4 * age, y: 5 }, vel: { x: 4, y: 0 }, stance: null, facing: 0, age });
  async function sim(bits: string) {
    vi.stubEnv('SIGHT_PURE', '1'); vi.stubEnv('SIGHT_STALE', bits); vi.resetModules();
    const { HISTORY } = await import('../src/sim/perception.js');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { STALE_SPREAD } = await import('../src/sim/sight.js');
    return { staleOf: PlaySim.prototype['staleOf' as keyof typeof PlaySim.prototype] as unknown as (this: { dt: number }, p: any, e: number, o: number, h?: boolean) => any, HISTORY, STALE_SPREAD };
  }
  it('off, a lost man runs on his last velocity without bound and is not marked', async () => {
    const { staleOf } = await sim('0');
    const out = staleOf.call({ dt: .05 }, pic(.2), 5, .2);
    expect(out.pos.x).toBeCloseTo(10 + 4 * .2 + 4 * 5, 6);
    expect(out.stale).toBeUndefined();
  });
  it('bit 1 carries him for the record\'s length from the moment he was seen, then holds him', async () => {
    const { staleOf, HISTORY } = await sim('1');
    const length = (HISTORY - 1) * .05, out = staleOf.call({ dt: .05 }, pic(.2), 5, .2);
    expect(out.pos.x).toBeCloseTo(10 + 4 * .2 + 4 * (length - .2), 6);
    expect(out.age).toBeCloseTo(5.2, 9);
    expect(staleOf.call({ dt: .05 }, pic(.2), 9, .2).pos.x).toBeCloseTo(out.pos.x, 9);
  });
  it('bit 2 marks a picture older than his own delay, with a spread that grows with its age', async () => {
    const { staleOf, STALE_SPREAD } = await sim('2');
    const a = staleOf.call({ dt: .05 }, pic(.2), 1, .2), b = staleOf.call({ dt: .05 }, pic(.2), 3, .2);
    expect(a.stale).toBe(true);
    expect(a.spread).toBeCloseTo(STALE_SPREAD * 1, 9);
    expect(b.spread).toBeGreaterThan(a.spread);
  });
  it('a run play is the same with extra sight questions after every tick\'s record, every bit on', async () => {
    vi.stubEnv('SIGHT_PURE', '1'); vi.stubEnv('SIGHT_STALE', '7'); vi.stubEnv('SIGHT_CARRIER', '1'); vi.stubEnv('SIGHT_COVER', '1'); vi.stubEnv('SIGHT_RECOG', '1'); vi.resetModules();
    expect(await play(true, 'run')).toBe(await play(false, 'run'));
  }, 120000);
});
