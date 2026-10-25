import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { ManCoverage } from '../src/sim/behaviors/defense.js';
import { showsBlock } from '../src/sim/coverage-cues.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

// PASS_FIRST (defense.ts): a man corner whose receiver comes to block him stays
// on the receiver until the ball is past the line; the force player still
// comes to the run.
function corner(kind: 'alley' | 'force', side = 1) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(71), 'O', 'MO'), '11'),
    defense: pickDefense(generateTeam(new Rng(72), 'D', 'MD'), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: side < 0, kind: 'pass', pass: PASS_BY_ID.pa_post_dig, label: 'PA' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1_off, pressure: null, label: 'Man' },
    los: 40, ballY: 26, firstDownX: 50, seed: 5 });
  const a = sim.slot('CB_S')!, r = sim.slot('Z')!;
  a.body.pos = { x: 46, y: 26 + side * 10 }; a.body.vel = { x: 0, y: 0 }; a.body.facing = Math.PI;
  a.runFit = { gap: 'D', side, kind, technique: 'attack', edge: 'box', pace: 'stack' }; a.recog!.read = 'run';
  sim.t = .8;
  // The receiver comes at him low, as a stalk; the ball is still in the backfield.
  const cue: Perceived = { pos: { x: 41, y: a.pos.y - side * .5 }, vel: { x: 4, y: side * .2 }, facing: 0, stance: 'low', pose: 'up', carrying: false, age: .25 };
  const far: Perceived = { pos: { x: 70, y: 50 }, vel: { x: 0, y: 0 }, facing: 0, stance: 'high', pose: 'up', carrying: false, age: .25 };
  sim.see = (_o, target) => structuredClone(target === r ? cue : target === sim.qb ? { ...far, pos: { x: 36, y: 26 }, carrying: true }
    : target === sim.slot('RB') ? { ...far, pos: { x: 36, y: 25 } } : far);
  const man = new ManCoverage(a, sim, r, false, 'D', side, { initialPosition: cue.pos });
  a.behavior = man;
  expect(showsBlock(a, sim, r, cue)).toBe(true);
  return { sim, a, man };
}

describe('a perimeter man defender plays pass first', () => {
  it.each([-1, 1])('stays on his receiver when the receiver comes to block, side=%s', side => {
    const f = corner('alley', side);
    expect(f.man.update(f.a, f.sim)).toEqual(f.man.trackReceiver(f.a, f.sim));
  });
  it('the force player still comes to the run off the same picture', () => {
    const f = corner('force');
    expect(f.man.update(f.a, f.sim)).not.toEqual(f.man.trackReceiver(f.a, f.sim));
  });
  it('PASS_FIRST=0 restores the run read off the block', () => {
    vi.stubEnv('PASS_FIRST', '0');
    const f = corner('alley');
    expect(f.man.update(f.a, f.sim)).not.toEqual(f.man.trackReceiver(f.a, f.sim));
  });
});

// STALK_CUSHION (blocking.ts): a receiver stalking a DB breaks down short of
// him while the DB is not attacking, and closes once he comes downhill.
function stalk(dbVel: { x: number; y: number }, cushion: boolean) {
  vi.stubEnv('STALK_CUSHION', cushion ? '1' : '0');
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'stalk' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const a = sim.slot('Z')!, d = sim.slot('CB_S')!;
  a.body.pos = { x: 41, y: CENTER_Y + 12 }; a.body.vel = { x: 3, y: 0 }; a.body.facing = 0;
  d.body.pos = { x: 46, y: CENTER_Y + 12 }; d.body.vel = dbVel;
  sim.t = 1; sim.world.time = 1;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  return { sim, a, d };
}

describe('a receiver breaks down on the DB he stalks', () => {
  it('stops short of a backpedalling DB instead of running through him', async () => {
    const run = async (cushion: boolean) => {
      const f = stalk({ x: 1, y: 0 }, cushion);
      vi.resetModules();
      const { RunBlocker: Blocker } = await import('../src/sim/behaviors/blocking.js');
      const c = new Blocker({ kind: 'stalk', target: f.d, drive: { x: 1, y: 0 }, perimeterStalk: f.d });
      f.a.behavior = c;
      return c.update(f.a, f.sim);
    };
    const off = await run(false), on = await run(true);
    // Off: the installed interception runs at the DB. On: a stand-off 2 yd
    // short of him, matching his retreat rather than closing through him.
    expect(on.vel.x).toBeLessThan(off.vel.x);
  });
  it('closes on a DB who attacks downhill, as before', () => {
    const f = stalk({ x: -3, y: 0 }, true);
    const c = new RunBlocker({ kind: 'stalk', target: f.d, drive: { x: 1, y: 0 }, perimeterStalk: f.d });
    f.a.behavior = c;
    const cmd = c.update(f.a, f.sim);
    expect(cmd.vel.x).toBeGreaterThan(0);
  });
});

// BACK_BLOCK (blocking.ts): once the runner is past a defender who has turned
// to chase him, the blocker behind that defender does not start a block on
// him or run at him; with the runner still behind the man, he blocks as before.
async function chaser(runnerPast: boolean, backBlock: boolean) {
  vi.stubEnv('BACK_BLOCK', backBlock ? '1' : '0');
  vi.resetModules();
  const { RunBlocker: Blocker } = await import('../src/sim/behaviors/blocking.js');
  const { PlaySim: Sim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new Sim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'chase' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const a = sim.slot('LG')!, d = sim.slot('DT_W')!, back = sim.slot('RB')!;
  // The tackle has come off the guard and turned downfield after the back.
  a.body.pos = { x: 40.2, y: CENTER_Y - 1 }; a.body.vel = { x: 1, y: 0 }; a.body.facing = 0;
  d.body.pos = { x: 41.1, y: CENTER_Y - 1 }; d.body.vel = { x: 2, y: 0 }; d.body.facing = 0;
  back.body.pos = { x: runnerPast ? 45 : 37, y: CENTER_Y - 3 }; back.body.vel = { x: 6, y: 0 };
  sim.ball = { kind: 'held', carrier: back };
  sim.t = 2; sim.world.time = 2;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  const c = new Blocker({ kind: 'drive', target: d, drive: { x: 1, y: 0 } });
  a.behavior = c;
  const cmd = c.update(a, sim);
  return { cmd, engaged: !!a.engagement };
}

describe('a blocker does not block a man in the back', () => {
  it('leaves a defender who has turned to chase a runner already past him', async () => {
    const on = await chaser(true, true), off = await chaser(true, false);
    // Off: a fresh block on his back. On: no block, and he trails at the
    // man's own pace (2 yd/s downfield) rather than running into him.
    expect(off.engaged).toBe(true);
    expect(on.engaged).toBe(false);
    expect(on.cmd.vel.x).toBeLessThan(2.25);
  });
  it('still blocks him while the runner is behind him', async () => {
    const before = await chaser(false, true), off = await chaser(false, false);
    expect(before.cmd).toEqual(off.cmd);
  });
});
