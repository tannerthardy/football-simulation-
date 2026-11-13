import { describe, expect, it } from 'vitest';
// The assignments are checked on the default aligned fronts (FRONT_ALIGN,
// BOX_ALIGN): the shaded techniques and a strong safety walked into the box.
import { CENTER_Y, HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { planRunBlocking, playSideSign, type RunBlockPlan } from '../src/sim/behaviors/blocking.js';
import type { Agent } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';

// Snap-time gap-scheme assignments against the written rules in
// docs/reviews/run-blocking-assignment-audit.md. Each case runs on both
// hashes with the formation flipped, so every rule is checked mirrored.
const o = generateTeam(new Rng(11), 'O', 'O', { strength: .55 });
const d = generateTeam(new Rng(12), 'D', 'D', { strength: .55 });
const mirrors = [false, true].flatMap((flip) => [CENTER_Y, HASH_LEFT_Y].map((ballY) => ({ flip, ballY })));

function plan(concept: string, frontId: string, flip: boolean, ballY: number) {
  const formation = FORMATION_BY_ID.i_pro_21, front = FRONT_BY_ID[frontId], personnel = front.personnel[0];
  const sim = new PlaySim({ offense: pickOffense(o, formation.personnel), defense: pickDefense(d, personnel),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[concept], label: concept },
    defCall: { personnel, front, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'test' },
    los: 40, ballY, firstDownX: 50, seed: 7 });
  const plans = planRunBlocking(sim, RUN_BY_ID[concept]);
  const ps = playSideSign(sim, RUN_BY_ID[concept]);
  const rel = (a: Agent) => (a.pos.y - sim.ballY) * ps;
  const by = (slot: string) => plans.get(sim.slot(slot)!)!;
  const owners = (a: Agent) => [...plans].filter(([, p]) => p.target === a || p.climbTo === a).map(([b]) => b.slot);
  const box = sim.defense.filter((x) => x.pos.x - sim.los < 7.5 && Math.abs(x.pos.y - sim.ballY) < 8);
  return { sim, plans, rel, by, owners, box };
}
const lead = (plans: Map<Agent, RunBlockPlan>) => [...plans.values()].find((p) => p.pullRole === 'lead' && p.kind === 'pull')!;

describe('power linebacker ownership (spread playbook p. 66)', () => {
  it.each(['over', 'under', 'odd'].flatMap((f) => mirrors.map((m) => ({ f, ...m }))))(
    'the lead puller wraps for the first playside backer and doubles work backside, $f flip=$flip y=$ballY', ({ f, flip, ballY }) => {
      const { sim, plans, rel, owners } = plan('power', f, flip, ballY);
      const puller = lead(plans), backer = puller.target!;
      expect(backer.slot).toBe('LB_M');
      expect(rel(backer)).toBeGreaterThan(0);
      expect(owners(backer)).toHaveLength(1);
      // Neither the pulling guard's man nor anyone else is left behind the pull.
      const doubles = [...plans.values()].filter((p) => p.kind === 'combo');
      expect(doubles.length).toBeGreaterThan(0);
      for (const p of doubles) if (p.climbTo) expect(rel(p.climbTo)).toBeLessThan(0);
      expect(owners(sim.slot('LB_W')!)).toHaveLength(1);
    });
});

describe('backside cutoff priority (Browns post hinge, p. 33)', () => {
  it.each(mirrors)('takes the defender in the vacated playside gap before the man outside, flip=$flip y=$ballY', ({ flip, ballY }) => {
    const { by, rel, sim } = plan('counter', 'under', flip, ballY);
    const y = by('Y'), end = sim.slot('DE_S')!, sam = sim.slot('LB_S')!, yRel = rel(sim.slot('Y')!);
    expect(rel(end)).toBeGreaterThan(yRel);
    expect(rel(sam)).toBeLessThan(yRel);
    expect(y.kind).toBe('cutoff');
    expect(y.target).toBe(end);
  });
  it.each(mirrors)('control: with the playside gap empty, still walls the man on or outside him, flip=$flip y=$ballY', ({ flip, ballY }) => {
    const counter = plan('counter', 'over', flip, ballY), power = plan('power', 'over', flip, ballY);
    expect(counter.by('Y').target).toBe(counter.sim.slot('DE_S'));
    const bst = [...power.plans].find(([b, p]) => p.kind === 'cutoff' && (b.slot === 'LT' || b.slot === 'RT'))!;
    expect(bst[1].target).toBe(power.sim.slot('DE_W'));
    expect(power.rel(bst[1].target!)).toBeLessThan(power.rel(bst[0]));
  });
});

describe('fullback lead with every backer owned', () => {
  it.each([
    { concept: 'counter', front: 'under', edge: 'LB_S' },
    { concept: 'trap', front: 'odd', edge: 'DE_W' },
  ].flatMap((c) => mirrors.map((m) => ({ ...c, ...m }))))(
    'takes the free backside edge on $concept vs $front, flip=$flip y=$ballY', ({ concept, front, edge, flip, ballY }) => {
      const { by, rel, sim, box, owners } = plan(concept, front, flip, ballY);
      const f = by('F');
      expect(f.kind).toBe('lead');
      expect(f.target).toBe(sim.slot(edge));
      expect(rel(f.target!)).toBeLessThan(0);
      for (const x of box) expect(owners(x).length).toBeGreaterThan(0);
    });
  it.each(mirrors)('control: a free backer is still the first choice, flip=$flip y=$ballY', ({ flip, ballY }) => {
    const { by, sim } = plan('counter', 'over', flip, ballY);
    expect(by('F').target).toBe(sim.slot('LB_S'));
  });
});

describe('trap against a playside 1-technique is the installed long trap', () => {
  it.each(mirrors)('traps the 3-technique vs Over and the 5-technique past the doubled 1-technique vs Under, flip=$flip y=$ballY', ({ flip, ballY }) => {
    const over = plan('trap', 'over', flip, ballY);
    expect(lead(over.plans)).toBeUndefined();
    const short = [...over.plans.values()].find((p) => p.pullRole === 'trap')!;
    expect(short.target).toBe(over.sim.slot('DT_S'));
    const under = plan('trap', 'under', flip, ballY);
    const long = [...under.plans.values()].find((p) => p.pullRole === 'trap')!;
    const one = under.sim.slot('DT_S')!;
    expect(long.target).toBe(under.sim.slot('DE_S'));
    expect(under.rel(one)).toBeLessThan(under.rel(long.target!));
    const double = [...under.plans.values()].filter((p) => p.target === one);
    expect(double.some((p) => p.combination && p.climbTo)).toBe(true);
  });
  it.each(['under', 'odd'].flatMap((f) => mirrors.map((m) => ({ f, ...m }))))(
    'the PST with the trapped man over him releases inside, not across the trap, $f flip=$flip y=$ballY', ({ f, flip, ballY }) => {
      const { plans, rel } = plan('trap', f, flip, ballY);
      const trapped = [...plans.values()].find((p) => p.pullRole === 'trap')!.target!;
      const pst = [...plans.keys()].find((b) => (b.slot === 'LT' || b.slot === 'RT') && rel(b) > 0)!;
      expect(Math.abs(rel(trapped) - rel(pst))).toBeLessThan(1.3);
      expect(rel(plans.get(pst)!.target!)).toBeLessThan(rel(trapped));
    });
  it.each(mirrors)('control: the PST inside a trapped 3-technique keeps working outside, flip=$flip y=$ballY', ({ flip, ballY }) => {
    const { plans, rel, sim } = plan('trap', 'over', flip, ballY);
    const pst = [...plans.keys()].find((b) => (b.slot === 'LT' || b.slot === 'RT') && rel(b) > 0)!;
    expect(plans.get(pst)!.target).toBe(sim.slot('DE_S'));
  });
});
