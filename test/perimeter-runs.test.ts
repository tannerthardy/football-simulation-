import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PERIMETER_RUN_CONCEPTS, RUN_BY_ID, RUN_CONCEPTS } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID, FORMATIONS, PERIMETER_FORMATIONS } from '../src/playbook/formations.js';
import type { Engagement } from '../src/sim/agent.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { movementObjective } from '../src/sim/movement-objective.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(11), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(12), 'D', 'D', { strength: .55 });
function make(call = 'buck_sweep', flip = false, front = 'over') {
  const formation = FORMATION_BY_ID[call === 'crack_toss' ? 'ace_nasty_12' : 'ace_12'];
  return new PlaySim({ offense: pickOffense(offense, formation.personnel),
    defense: pickDefense(defense, front === 'bear' ? 'goalline' : 'base43'),
    offCall: { formation, kind: 'run', flip: false, run: { ...RUN_BY_ID[call], direction: flip ? 'weak' : 'strong' }, label: call },
    defCall: { personnel: front === 'bear' ? 'goalline' : 'base43', front: FRONT_BY_ID[front],
      coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
    los: 40, ballY: 26.67, firstDownX: 50, seed: 77, audibles: false });
}
const blockers = (sim: PlaySim) => sim.offense.filter(a => a.behavior instanceof RunBlocker);
const plan = (a: ReturnType<typeof blockers>[number]) => (a.behavior as RunBlocker).plan;

describe('explicit perimeter installations', () => {
  it('leaves automatic calling distributions intact', () => {
    expect(PERIMETER_RUN_CONCEPTS.map(c => c.id)).toEqual(['buck_sweep', 'pin_pull', 'crack_toss']);
    for (const c of PERIMETER_RUN_CONCEPTS) {
      expect(RUN_BY_ID[c.id]).toBe(c);
      expect(RUN_CONCEPTS).not.toContain(c);
    }
    for (const f of PERIMETER_FORMATIONS) {
      expect(FORMATION_BY_ID[f.id]).toBe(f);
      expect(FORMATIONS).not.toContain(f);
      expect(f.qb).toBe('under');
      expect(f.personnel).toBe('12');
    }
  });

  it.each([false, true])('Buck assigns two separate guard jobs and accounts for all down men, weak direction=%s', flip => {
    const sim = make('buck_sweep', flip), bs = blockers(sim);
    const pullers = bs.filter(a => plan(a).kind === 'pull');
    expect(pullers.map(a => a.slot).sort()).toEqual(['LG', 'RG']);
    expect(pullers.map(a => plan(a).pullRole).sort()).toEqual(['force', 'lead']);
    expect(new Set(pullers.map(a => plan(a).target)).size).toBe(2);
    for (const d of sim.defense.filter(a => ['DE_S', 'DE_W', 'DT_S', 'DT_W'].includes(a.slot))) {
      expect(bs.filter(a => plan(a).target === d)).toHaveLength(1);
    }
    const first = pullers.find(a => plan(a).pullRole === 'force')!;
    const wrapper = pullers.find(a => plan(a).pullRole === 'lead')!;
    expect(plan(wrapper).pullPath![0].x).toBeLessThan(plan(first).pullPath![0].x
      - first.profile.radius - wrapper.profile.radius);
    const side = flip ? 1 : -1;
    expect((first.pos.y - sim.ballY) * side).toBeGreaterThan(0);
    expect((plan(first).pullPath!.at(-1)!.y - first.pos.y) * side).toBeGreaterThan(0);
  });

  it.each([false, true])('pin-and-pull reassigns eligible pullers with the front while retaining the down account, weak direction=%s', flip => {
    const signatures: string[] = [];
    for (const front of ['over', 'under', 'bear']) {
      const sim = make('pin_pull', flip, front), bs = blockers(sim);
      const pulls = bs.filter(a => plan(a).kind === 'pull');
      signatures.push(pulls.map(a => a.slot).sort().join(','));
      for (const d of sim.defense.filter(a => /^(DE|DT|NT)/.test(a.slot))) {
        expect(bs.some(a => plan(a).target === d), `${front}/${d.slot}`).toBe(true);
      }
      for (const a of pulls) expect(plan(a).combination).toBeUndefined();
      // A covered player cannot simultaneously be the vacating puller.
      expect(pulls.some(a => ['down', 'cutoff'].includes(plan(a).kind))).toBe(false);
    }
    expect(new Set(signatures).size).toBeGreaterThan(1);
  });

  it.each([false, true])('crack and outside force are distinct owned responsibilities, weak direction=%s', flip => {
    const sim = make('crack_toss', flip), bs = blockers(sim);
    const receiver = bs.find(a => plan(a).kind === 'crack')!;
    const puller = bs.find(a => plan(a).kind === 'pull')!;
    expect(receiver.player.position).toBe('WR');
    expect(receiver.slot).toBe(flip ? 'X' : 'Z');
    expect(puller.slot).toBe(flip ? 'LT' : 'RT');
    expect(plan(receiver).target).not.toBeNull();
    expect(plan(puller).target).not.toBe(plan(receiver).target);
    expect(bs.filter(a => plan(a).target === plan(puller).target)).toHaveLength(1);
    expect(bs.filter(a => plan(a).target === plan(receiver).target)).toHaveLength(1);
  });
});

describe('new perimeter production approaches', () => {
  it.each(['crack', 'force'] as const)('does not change %s work from an unobserved engagement flag', kind => {
    function request(engaged: boolean) {
      const sim = make('crack_toss');
      const a = blockers(sim).find(a => kind === 'crack' ? plan(a).kind === 'crack' : plan(a).pullRole === 'force')!;
      const target = plan(a).target!, controller = a.behavior as RunBlocker;
      sim.t = 1;
      if (kind === 'force') {
        Reflect.set(controller, 'pullIdx', 2);
        const edge = plan(a).pullPath!.at(-1)!;
        a.body.pos = { x: 38, y: edge.y - .4 };
      }
      // Same acquired picture in both arms. Only an unobserved private flag
      // changes; the real update/availableTarget/approach hook must handle it.
      const see = sim.see.bind(sim);
      sim.see = (observer, other, delay) => see(observer, other, delay);
      if (engaged) target.engagement = { blocker: sim.slot('C')!, defender: target, helpers: [] } as unknown as Engagement;
      const before = structuredClone(a.body), rng = JSON.stringify(sim.rng);
      const command = controller.update(a, sim);
      expect(a.body).toEqual(before);
      expect(JSON.stringify(sim.rng)).toBe(rng);
      return { command, target: controller.plan.target?.idx ?? null };
    }
    expect(request(true)).toEqual(request(false));
  });

  it.each([false, true])('keeps a feasible corner request inside the boundary and admits interception outside, weak direction=%s', flip => {
    const sim = make('crack_toss', flip);
    const a = blockers(sim).find(a => plan(a).pullRole === 'force')!, controller = a.behavior as RunBlocker;
    const side = flip ? 1 : -1, edge = plan(a).pullPath!.at(-1)!;
    sim.t = 1;
    Reflect.set(controller, 'pullIdx', 2);
    // Saved failure: arrival steering stopped .11yd inside the strict gate.
    a.body.pos = { x: plan(a).pullPath![1].x, y: edge.y - side * .11 };
    a.body.vel = { x: 0, y: 0 };
    const command = controller.update(a, sim);
    expect(command.vel.y * side).toBeGreaterThan(0);
    expect(command.vel.x).toBeCloseTo(0, 10);
    expect(movementObjective(command)).toBeUndefined();
    a.body.pos.y = edge.y + side * .1;
    const intercept = controller.update(a, sim);
    expect(movementObjective(intercept)?.kind).toBe('moving');
    expect(intercept.vel.x).toBeGreaterThan(0);
  });

  it.each([false, true])('final-waypoint tolerance cannot skip the achieved-corner gate, weak direction=%s', flip => {
    const sim = make('crack_toss', flip);
    const a = blockers(sim).find(a => plan(a).pullRole === 'force')!, controller = a.behavior as RunBlocker;
    const side = flip ? 1 : -1, edge = plan(a).pullPath!.at(-1)!;
    sim.t = 1;
    Reflect.set(controller, 'pullIdx', 2);
    a.body.pos = { x: edge.x, y: edge.y - side * .3 };
    a.body.vel = { x: 0, y: 0 };
    const command = controller.update(a, sim);
    expect(movementObjective(command)).toBeUndefined();
    expect(command.vel.y * side).toBeGreaterThan(0);
    expect(command.vel.x).toBeLessThanOrEqual(0);
  });

  it('a distant crack cannot award an engagement or move either body', () => {
    const sim = make('crack_toss'), a = blockers(sim).find(a => plan(a).kind === 'crack')!;
    const target = plan(a).target!, before = structuredClone([a.body, target.body]);
    sim.t = 1;
    const engage = vi.spyOn(sim, 'engage');
    a.behavior.update(a, sim);
    expect(engage).not.toHaveBeenCalled();
    expect(sim.engagements).toHaveLength(0);
    expect([a.body, target.body]).toEqual(before);
  });

  it('the native crack toss uses real flight and a physical catch with all players reacting', () => {
    const sim = make('crack_toss');
    let flight = false;
    while (sim.phase === 'live' && sim.t < 1.5 && !sim.events.some(e => e.type === 'pitch_catch')) {
      sim.tick();
      if (sim.ball.kind === 'pitch') {
        flight = true;
        expect(sim.carrier).toBeNull();
      }
    }
    expect(flight).toBe(true);
    expect(sim.events.some(e => e.type === 'pitch_catch')).toBe(true);
    expect(sim.carrier).toBe(sim.slot('RB'));
    expect(sim.stats.attempted).toBe(false);
    expect(sim.stats.rusher).toBe(sim.slot('RB')!.player.id);
  });
});
