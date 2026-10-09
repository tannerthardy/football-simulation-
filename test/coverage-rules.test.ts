/**
 * Pattern-match rules in fixed scenarios: one formation, scripted routes, one
 * coverage call. Each case checks the job a defender took (from his job
 * history) when a receiver declared a release — the exchanges the coverage
 * is built on.
 */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { COVERAGE_BY_ID } from '../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { PassConcept, SkillSlot } from '../src/playbook/types.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(21), 'Offense', 'OFF', { strength: 0.6 });
const defense = generateTeam(new Rng(22), 'Defense', 'DEF', { strength: 0.6 });

type Routes = Partial<Record<1 | 2 | 3, string>>;

/** Run one snap until the throw (or `until` seconds); return each rule defender's jobs. */
function run(form: string, coverage: string, strong: Routes, weak: Routes, opts: { until?: number; seed?: number; checkPick?: number; zeus?: SkillSlot } = {}) {
  const formation = FORMATION_BY_ID[form];
  const concept: PassConcept = { id: 'lab', name: 'lab', family: 'dropback', drop: 'gun5', strong, weak, back: 'block', progression: ['S1'], beats: [] };
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel),
    defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: concept, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, zoneStyle: 'match', label: 'lab', checkPick: opts.checkPick ?? 0, zeus: opts.zeus },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: opts.seed ?? 5,
  });
  // The rules under test are the exchanges as routes declare; keep the ball
  // in the quarterback's hands so his timing cannot end the snap early.
  sim.throwBall = () => undefined;
  const step = sim as unknown as { tick(): void };
  while (sim.phase === 'live' && sim.t < (opts.until ?? 2.4) && sim.throwAt < 0) step.tick();
  const jobs = (slot: string): string[] => {
    const b = sim.slot(slot)?.behavior;
    return b instanceof CoverageDefender ? b.history.map((h) => h.job) : [];
  };
  return { sim, jobs };
}

describe('Palms (2-Read)', () => {
  it('corner traps #2 quick out; safety replaces him over #1', () => {
    const { jobs } = run('gun_doubles_11', 'cover4_palms', { 1: 'go', 2: 'go' }, { 1: 'go', 2: 'quick_out' }, { until: 2.8 });
    expect(jobs('CB_W')).toContain('trap:H');
    expect(jobs('FS')).toContain('man:X');
  });

  it('#2 vertical goes to the safety; the corner stays on #1', () => {
    const { jobs } = run('gun_doubles_11', 'cover4_palms', { 1: 'go', 2: 'go' }, { 1: 'go', 2: 'seam' });
    expect(jobs('FS')).toContain('man:H');
    expect(jobs('CB_W')).not.toContain('trap:H');
    expect(jobs('CB_W')).toContain('man:X');
  });
});

describe('Quarters', () => {
  it('MOD corner carries #1 deep and zones off when #1 runs under', () => {
    const deep = run('gun_doubles_11', 'cover4', { 1: 'go', 2: 'go' }, { 1: 'go', 2: 'seam' }).jobs('CB_W');
    expect(deep).toContain('man:X');
    expect(deep[deep.length - 1]).toBe('man:X');
    const under = run('gun_doubles_11', 'cover4', { 1: 'go', 2: 'go' }, { 1: 'slant', 2: 'seam' }).jobs('CB_W');
    expect(under[under.length - 1]).toBe('zone:quarter_w_out');
  });

  it('safety carries #2 vertical, and helps on #1 when #2 goes out', () => {
    expect(run('gun_doubles_11', 'cover4', { 1: 'go', 2: 'go' }, { 1: 'go', 2: 'seam' }).jobs('FS')).toContain('man:H');
    const out = run('gun_doubles_11', 'cover4', { 1: 'go', 2: 'go' }, { 1: 'go', 2: 'quick_out' }).jobs('FS');
    expect(out.some((j) => j === 'man:X' || j === 'rob:X')).toBe(true);
  });

  it('checks to Poach or Stubbie against trips by the coordinator\'s preference', () => {
    expect(run('gun_trips_11', 'cover4', { 1: 'go', 2: 'go', 3: 'seam' }, { 1: 'go' }, { until: 0.1 }).sim.defCall.coverage.id).toBe('cover4_poach');
    expect(run('gun_trips_11', 'cover4', { 1: 'go', 2: 'go', 3: 'seam' }, { 1: 'go' }, { until: 0.1, checkPick: 1 }).sim.defCall.coverage.id).toBe('cover4_stubbie');
    expect(run('gun_doubles_11', 'cover4', { 1: 'go' }, { 1: 'go' }, { until: 0.1 }).sim.defCall.coverage.id).toBe('cover4');
  });

  it('poach safety takes trips #3 vertical from the backside', () => {
    const { jobs } = run('gun_trips_11', 'cover4_poach', { 1: 'go', 2: 'go', 3: 'seam' }, { 1: 'go' });
    expect(jobs('FS')).toContain('man:Y');
  });
});

describe('Cover 3 match (Rip/Liz)', () => {
  it('the curl-flat player matches #2 vertical, the corner carries #1', () => {
    const { sim, jobs } = run('gun_doubles_11', 'cover3_match', { 1: 'go', 2: 'go' }, { 1: 'go', 2: 'seam' });
    const seamer = sim.defense.find((d) => jobs(d.slot).includes('man:H'));
    expect(seamer).toBeDefined();
    expect(seamer!.slot.startsWith('CB')).toBe(false);
    expect(jobs('CB_W')).toContain('man:X');
  });

  it('corner zones off a slant, then protects the exposed next vertical', () => {
    const jobsCB = run('gun_doubles_11', 'cover3_match', { 1: 'go', 2: 'go' }, { 1: 'slant', 2: 'seam' }).jobs('CB_W');
    expect(jobsCB).toContain('zone:deep_third_w');
    expect(jobsCB[jobsCB.length - 1]).toBe('man:H');
  });
});

describe('Cover 2 match', () => {
  it('corner sinks under #1 with no flat threat, squats when #2 runs to the flat', () => {
    expect(run('gun_doubles_11', 'cover2_match', { 1: 'go', 2: 'go' }, { 1: 'go', 2: 'hitch' }).jobs('CB_W')).toContain('man:X');
    expect(run('gun_doubles_11', 'cover2_match', { 1: 'go', 2: 'go' }, { 1: 'go', 2: 'flat' }).jobs('CB_W')).not.toContain('man:X');
  });
});

describe('Tampa 2', () => {
  it('the Mike runs with a vertical through the middle', () => {
    const { jobs } = run('gun_doubles_11', 'tampa2', { 1: 'go', 2: 'seam' }, { 1: 'go', 2: 'seam' });
    expect(jobs('LB_M').some((j) => j.startsWith('man:'))).toBe(true);
  });
});

describe('Zeus (Fangio target tag)', () => {
  it('resolves by where the target lines up: Cover 8 on strong #1, Stuff on weak #1, Quads inside', () => {
    const played = (zeus: SkillSlot) => run('gun_doubles_11', 'cover6', { 1: 'go' }, { 1: 'go' }, { until: 0.1, zeus }).sim.defCall.coverage.id;
    expect(played('Z')).toBe('cover6_rev');
    expect(played('X')).toBe('cover6');
    expect(played('H')).toBe('cover4');
  });
});
