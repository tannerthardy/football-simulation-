import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Vec2 } from '../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { stand } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

const formation = FORMATION_BY_ID.ace_11;
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
const LOS = 40;

type Body = { pos: Vec2; vel: Vec2 };
interface Scene {
  puller: Body; role: 'kick' | 'lead'; pullIdx: number;
  runner: Body; end: Body; backers?: Array<Body & { slot: string; down?: boolean }>; mates?: Array<Body & { slot: string }>;
  twoPoint?: boolean;
}

/** A pulling RG on counter, everyone else parked far away and idle. The
 * runner carries; every picture is recorded (24 times) from these bodies. */
function stage(sc: Scene) {
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.counter, label: 'Counter' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => stand(a.facing) };
  }
  const place = (a: Agent, b: Body) => { a.body.pos = { ...b.pos }; a.body.vel = { ...b.vel }; };
  const puller = sim.slot('RG')!, runner = sim.slot('RB')!, end = sim.slot('DE_W')!;
  place(puller, sc.puller); place(runner, sc.runner); place(end, sc.end);
  for (const b of sc.backers ?? []) place(sim.slot(b.slot)!, b);
  for (const m of sc.mates ?? []) place(sim.slot(m.slot)!, m);
  const hole = { x: LOS - .1, y: CENTER_Y + 4 };
  const path = [{ x: LOS - 1.3, y: CENTER_Y + .9 }, { x: LOS - 1.2, y: CENTER_Y + 3.5 }, ...sc.twoPoint ? [] : [hole]];
  const behavior = new RunBlocker({ kind: 'pull', pullRole: sc.role, target: sc.role === 'kick' ? end : null,
    drive: { x: .3, y: 1 }, pullPath: path });
  puller.behavior = behavior;
  Reflect.set(behavior, 'pullIdx', sc.pullIdx); Reflect.set(behavior, 'pullCleared', true);
  sim.ball = { kind: 'held', carrier: runner } as typeof sim.ball;
  sim.t = sim.world.time = 2;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents, runner.idx);
  for (const b of sc.backers ?? []) if (b.down) { const a = sim.slot(b.slot)!; a.downUntil = 9; }
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents.map(a => ({ ...a.body, pose: a.isDown(sim.t) ? 'down' as const : 'up' as const })), runner.idx);
  return { sim, puller, behavior, runner, end, hole };
}

// The runner is 2 yd past the end and going downhill; the end is going deeper.
const passed: Scene = { role: 'kick', pullIdx: 2,
  puller: { pos: { x: LOS - 1.2, y: CENTER_Y + 3.5 }, vel: { x: 0, y: 3 } },
  runner: { pos: { x: LOS - .5, y: CENTER_Y + 3 }, vel: { x: 4, y: 0 } },
  end: { pos: { x: LOS - 3, y: CENTER_Y + 6 }, vel: { x: -1, y: 0 } },
  backers: [{ slot: 'LB_W', pos: { x: LOS + 3, y: CENTER_Y + 4 }, vel: { x: -1, y: 0 } }] };

describe('a puller acts only on the runner and men he sees', () => {
  it('turns up off a kick man the carrying runner has passed, onto the threat in the hole', () => {
    const f = stage(passed), ledger = f.sim.recordResponsibility();
    const command = f.behavior.update(f.puller, f.sim);
    expect(f.sim.events.some(e => e.type === 'pull_turn_up')).toBe(true);
    expect(f.behavior.plan.pullRole).toBe('lead');
    expect(f.behavior.plan.target?.slot).toBe('LB_W');
    // The lead command goes at him, not back to the finished flat waypoint.
    expect(command.vel.x).toBeGreaterThan(0);
    expect(ledger.data.changes.length + 1).toBeGreaterThan(0);
  });

  it('gives the turn-up target its first action and holds it through the next update', () => {
    const f = stage(passed), mind = f.puller.mind;
    const owner = () => (Reflect.get(mind, 'aimTargets') as Map<string, number | null>).get('block-fit');
    const aim = () => (Reflect.get(mind, 'aims') as Map<string, { pos: { x: number; y: number }; until: number }>).get('block-fit');
    f.behavior.update(f.puller, f.sim);
    const lb = f.sim.slot('LB_W')!, first = aim();
    expect(owner()).toBe(lb.idx);
    expect(first).toBeDefined();
    // Same job, next tick before the held action expires: the held aim stays.
    f.sim.t += .05;
    f.behavior.update(f.puller, f.sim);
    expect(f.behavior.plan.target).toBe(lb);
    expect(owner()).toBe(lb.idx);
    expect(aim()).toBe(first);
  });

  it('keeps the kick when the runner is still at the mesh or bending toward the end', () => {
    for (const runner of [{ pos: { x: LOS - .5, y: CENTER_Y + 3 }, vel: { x: .8, y: 0 } },
      { pos: { x: LOS - .5, y: CENTER_Y + 3 }, vel: { x: 2.2, y: 4 } }]) {
      const f = stage({ ...passed, runner, end: { pos: { x: LOS - 1.6, y: CENTER_Y + 6 }, vel: { x: 0, y: 0 } } });
      f.behavior.update(f.puller, f.sim);
      expect(f.sim.events.some(e => e.type === 'pull_turn_up')).toBe(false);
      expect(f.behavior.plan.pullRole).toBe('kick');
    }
  });

  it('does not retreat after an end going deeper behind the ball, but fits one coming downfield', () => {
    const deeper: Scene = { ...passed, pullIdx: 1, backers: [],
      runner: { pos: { x: LOS - 3.2, y: CENTER_Y + 2 }, vel: { x: 2.5, y: 0 } },
      end: { pos: { x: LOS - 3, y: CENTER_Y + 4.5 }, vel: { x: -2, y: 0 } } };
    const away = stage(deeper), awayCommand = away.behavior.update(away.puller, away.sim);
    expect(away.sim.events.some(e => e.type === 'pull_turn_up')).toBe(false);
    expect(awayCommand.vel.x).toBeGreaterThan(-.5);
    const chase = stage({ ...deeper, end: { pos: { x: LOS - 3, y: CENTER_Y + 4.5 }, vel: { x: 2, y: 0 } } });
    const chaseCommand = chase.behavior.update(chase.puller, chase.sim);
    expect(chaseCommand.vel.x).toBeLessThan(awayCommand.vel.x);
    // A two-point (slice) path finished at the observed corner: he is past
    // his path and takes his work, not a missing waypoint.
    const slice = stage({ ...deeper, twoPoint: true }), sliceCommand = slice.behavior.update(slice.puller, slice.sim);
    expect(Number.isFinite(sliceCommand.vel.x) && Number.isFinite(sliceCommand.vel.y)).toBe(true);
  });

  it('takes the free threat in the hole over a man he sees on a teammate, helps when that man is the only one, and leaves the called kick man to the kicker', () => {
    const lead = (mates: Scene['mates'], backers: Scene['backers'], kicks?: string) => {
      const f = stage({ ...passed, role: 'lead', pullIdx: 3, end: { pos: { x: 75, y: 3 }, vel: { x: 0, y: 0 } }, mates, backers });
      // The call gives this man to a teammate puller's kick.
      if (kicks) f.sim.slot('LG')!.behavior = new RunBlocker({ kind: 'pull', pullRole: 'kick', target: f.sim.slot(kicks)!, drive: { x: .3, y: 1 }, pullPath: [] });
      f.behavior.update(f.puller, f.sim);
      return f.behavior.plan.target?.slot ?? null;
    };
    const claimed = { slot: 'LB_M', pos: { x: LOS + 2, y: CENTER_Y + 3.6 }, vel: { x: 0, y: 0 } };
    const free = { slot: 'LB_W', pos: { x: LOS + 2.6, y: CENTER_Y + 4.8 }, vel: { x: 0, y: 0 } };
    const blocker = { slot: 'C', pos: { x: LOS + 1.4, y: CENTER_Y + 3.6 }, vel: { x: 0, y: 0 } };
    expect(lead([blocker], [claimed, free])).toBe('LB_W');
    expect(lead([blocker], [claimed])).toBe('LB_M');
    expect(lead([], [{ ...free, down: true }, { ...claimed, slot: 'LB_S' }])).toBe('LB_S');
    expect(lead([blocker], [claimed, free], 'LB_W')).toBe('LB_M');
  });

  it('reaches the same consumed command when only hidden engagement and down state change', () => {
    const run = (hide: boolean) => {
      const f = stage({ ...passed, backers: [...passed.backers!, { slot: 'LB_M', pos: { x: LOS + 2.5, y: CENTER_Y + 2.5 }, vel: { x: 0, y: 0 } }] });
      // Private state only: no picture, body or RNG changes. The snap-named
      // kick man keeps the installed named-work eligibility (outside this
      // read); every man the turn-up and the hole read can choose is hidden.
      if (hide) for (const d of f.sim.defense) if (d !== f.end) {
        d.engagement = { blocker: f.sim.slot('LT')!, defender: d, helpers: [] } as unknown as NonNullable<Agent['engagement']>;
        d.downUntil = 9;
      }
      const rng = JSON.stringify(f.sim.rng);
      const command = f.behavior.update(f.puller, f.sim);
      const second = (f.sim.t += .05, f.behavior.update(f.puller, f.sim));
      if (hide) for (const d of f.sim.defense) if (d !== f.end) { d.engagement = null; d.downUntil = 0; }
      return { command, second, target: f.behavior.plan.target?.slot, events: f.sim.events.map(e => e.type), rng: JSON.stringify(f.sim.rng) === rng };
    };
    const hidden = run(true), plain = run(false);
    expect(plain.events).toContain('pull_turn_up');
    expect(hidden).toEqual(plain);
  });
});
