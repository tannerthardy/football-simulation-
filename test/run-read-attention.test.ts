/**
 * Run-read attention: a defender who has read run sees men releasing away
 * from him late (his eyes are on the backfield and the blockers), but not a
 * blocker in front of him and in range, whatever that blocker's position.
 */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { pursuitPoint } from '../src/sim/behaviors/common.js';

const formation = FORMATION_BY_ID.ace_11;
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** Corner at the origin of the scene facing the line (−x); Z placed at an
 * offset; the corner's read set as given. Returns how old his picture of Z is. */
function stage(offset: { x: number; y: number }, read: 'run' | 'pass') {
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'attention' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const d = sim.slot('CB_S')!, z = sim.slot('Z')!;
  d.body.pos = { x: 46, y: CENTER_Y + 10 }; d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI;
  z.body.pos = { x: 46 + offset.x, y: CENTER_Y + 10 + offset.y }; z.body.vel = { x: 0, y: 0 };
  d.recog = { ...d.recog!, read } as typeof d.recog;
  d.eyes = null;
  sim.t = 1; sim.world.time = 1;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  return { sim, d, z };
}
const ageOfZ = (offset: { x: number; y: number }, read: 'run' | 'pass') => {
  const { sim, d, z } = stage(offset, read);
  return sim.see(d, z).age!;
};

describe('run-read attention', () => {
  it('a blocker in front of him and in range is seen on the normal delay', () => {
    expect(ageOfZ({ x: -3, y: 0 }, 'run')).toBeCloseTo(ageOfZ({ x: -3, y: 0 }, 'pass'), 6);
    expect(ageOfZ({ x: -3, y: 2 }, 'run')).toBeCloseTo(ageOfZ({ x: -3, y: 2 }, 'pass'), 6);
  });

  it('a man behind him or out of range is seen late, as before', () => {
    // Behind (he faces the line, Z is deeper) and in range.
    expect(ageOfZ({ x: 3, y: 0 }, 'run')).toBeCloseTo(ageOfZ({ x: 3, y: 0 }, 'pass') + 0.15, 6);
    // In front, but well out of blocking range.
    expect(ageOfZ({ x: -12, y: 0 }, 'run')).toBeCloseTo(ageOfZ({ x: -12, y: 0 }, 'pass') + 0.15, 6);
  });

  it('where the blocker really is now does not choose his picture: only the recorded history does', () => {
    // History recorded with Z 5.2 yd in front (out of range); then only Z's live body moves across the
    // range (5.01 -> 4.99 yd) or the cone edge (cos .0999 -> .1001), with no record in between.
    const picture = (live: { x: number; y: number }) => {
      const { sim, d, z } = stage({ x: -5.2, y: 0 }, 'run');
      z.body.pos = { x: d.pos.x + live.x, y: d.pos.y + live.y };
      const seen = sim.see(d, z);
      return { age: seen.age, pos: seen.pos, stance: seen.stance };
    };
    const atCos = (cos: number) => ({ x: -3 * cos, y: 3 * Math.sqrt(1 - cos * cos) });
    expect(picture({ x: -4.99, y: 0 })).toEqual(picture({ x: -5.01, y: 0 }));
    expect(picture(atCos(.1001))).toEqual(picture(atCos(.0999)));
  });

  it('a blocker leaving his range holds the picture he had instead of rewinding to an older one', () => {
    // Z recorded 4 yd in front (watched), then running away: once his picture is beyond 5 yd the run
    // read's 0.15 s applies, but the picture ages from the one he held, one tick at a time.
    const { sim, d, z } = stage({ x: -4, y: 0 }, 'run');
    z.body.vel = { x: -8, y: 0 };
    let last = sim.t - sim.see(d, z).age!;
    for (let i = 0; i < 12; i++) {
      z.body.pos = { x: z.body.pos.x + z.body.vel.x * sim.dt, y: z.body.pos.y };
      sim.t += sim.dt; sim.perception.record(sim.agents);
      const sampledAt = sim.t - sim.see(d, z).age!;
      expect(sampledAt).toBeGreaterThanOrEqual(last - 1e-9);
      last = sampledAt;
    }
    // Long out of range, the full delay has caught up.
    expect(sim.see(d, z).age!).toBeCloseTo(ageOfZ({ x: -12, y: 0 }, 'run'), 6);
  });

  it('a caller that asks for an older picture on purpose still gets it (pursuit compares two samples)', () => {
    // Pursuit asks for its ordinary picture and one 0.2 s older, through a larger delay scale. The held
    // picture is kept per query, so the older query is not pulled forward to the newer one.
    const { sim, d, z } = stage({ x: -12, y: 0 }, 'run');
    const rt = Math.max(0.1, d.profile.reactionTime), scale = 0.2 / rt;
    for (let i = 0; i < 6; i++) {
      sim.t += sim.dt; sim.perception.record(sim.agents);
      const near = sim.see(d, z, scale).age!, far = sim.see(d, z, scale + 0.2 / rt).age!;
      expect(far - near).toBeCloseTo(0.2, 6);
    }
  });

  it('pursuit, the actual consumer, measures the same acceleration from its two samples under a run read', () => {
    // Z 12 yd in front, out of range, accelerating at 2 yd/s^2 along +y. pursuitPoint asks for its
    // ordinary picture and one 0.2 s older; the speed difference over 0.2 s is the acceleration it uses.
    // Opposing control: the same history under a pass read, where no hold applies.
    const run = (read: 'run' | 'pass') => {
      const { sim, d, z } = stage({ x: -12, y: 0 }, read);
      const rows: Array<{ t: number; ages: number[]; accel: number }> = [];
      const see = sim.see.bind(sim);
      for (let i = 1; i <= 30; i++) {
        z.body.vel = { x: 0, y: 2 * i * sim.dt };
        z.body.pos = { x: z.body.pos.x, y: z.body.pos.y + z.body.vel.y * sim.dt };
        sim.t += sim.dt; sim.perception.record(sim.agents);
        const asked: Array<{ age: number; speed: number }> = [];
        sim.see = (o, tg, scale) => { const r = see(o, tg, scale); if (tg === z) asked.push({ age: r.age!, speed: Math.hypot(r.vel.x, r.vel.y) }); return r; };
        pursuitPoint(sim, d, z);
        sim.see = see;
        if (i > 12) rows.push({ t: sim.t, ages: asked.map(q => q.age), accel: (asked[0].speed - asked[1].speed) / 0.2 });
      }
      return rows;
    };
    for (const read of ['run', 'pass'] as const) for (const r of run(read)) {
      expect(r.ages[1] - r.ages[0]).toBeCloseTo(0.2, 6);
      expect(r.accel).toBeCloseTo(2, 6);
    }
  });

  it('pursuit infers acceleration over the actual interval between its two pictures when they straddle the 5 yd line', () => {
    // Z runs straight away from the corner accelerating at 2 yd/s^2 and crosses 5 yd mid-scene, so pursuit's
    // two queries can take different attention delays and sit more than 0.2 s apart. The acceleration pursuit
    // records is read from its own trace; opposing control: the pass read, where both share one delay.
    const run = (read: 'run' | 'pass') => {
      const { sim, d, z } = stage({ x: -3, y: 0 }, read);
      const start = sim.t, x0 = z.body.pos.x, out: Array<{ gap: number; accel: number }> = [];
      const see = sim.see.bind(sim);
      for (let i = 1; i <= 40; i++) {
        const t = i * sim.dt;
        z.body.vel = { x: -2 * t, y: 0 }; z.body.pos = { x: x0 - t * t, y: z.body.pos.y };
        sim.t = start + t; sim.perception.record(sim.agents);
        const ages: number[] = [], recorded: number[] = [];
        sim.see = (o, tg, scale) => { const r = see(o, tg, scale); if (tg === z) ages.push(r.age!); return r; };
        (sim as any).commandTraceFor = () => ({ pursuit: (_: unknown, data: any) => recorded.push(data.forecast.acceleration) });
        pursuitPoint(sim, d, z);
        sim.see = see; delete (sim as any).commandTraceFor;
        if (i > 12 && recorded.length) out.push({ gap: ages[1] - ages[0], accel: recorded[0] });
      }
      return out;
    };
    const runRows = run('run'), passRows = run('pass');
    expect(runRows.some(r => Math.abs(r.gap - 0.2) > 0.01)).toBe(true);   // the straddle is exercised
    for (const r of [...runRows, ...passRows]) expect(r.accel).toBeCloseTo(2, 6);
  });
});
