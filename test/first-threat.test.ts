import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(51), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(52), 'D', 'D', { strength: .55 });
afterEach(() => vi.restoreAllMocks());

/** G1 P024 in miniature: the lead back is on a deep safety while the Mike
 * comes free between him and the runner. Decision geometry only, from the
 * lead's own pictures; nobody else moves. */
function scene(edit: (s: ReturnType<typeof bodies>) => void = () => {}) {
  const sim = new PlaySim({ offense: pickOffense(offense, '21'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.i_pro_21, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'Inside zone' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 7 });
  const s = bodies(sim);
  edit(s);
  const lead = new RunBlocker({ kind: 'lead', target: s.fs, drive: { x: 1, y: 0 } });
  s.fb.behavior = lead;
  sim.t = 1.8;
  const pictures = new Map(sim.agents.map(o => [o, { pos: { ...o.pos }, vel: { ...o.vel }, facing: o.facing,
    stance: null, pose: 'up', age: .2, carrying: o === s.rb } as Perceived]));
  pictures.get(s.rb)!.vel = { x: 5, y: 0 };
  pictures.get(s.fs)!.vel = { x: 1, y: 0 };
  pictures.get(s.mike)!.vel = { x: -2, y: 0 };
  const ordinary = sim.see.bind(sim);
  vi.spyOn(sim, 'see').mockImplementation((observer, target, scale) => observer === s.fb
    ? structuredClone(pictures.get(target)!) : ordinary(observer, target, scale));
  lead.update(s.fb, sim);
  return { ...s, lead };
}

function bodies(sim: PlaySim) {
  for (const o of sim.agents) { o.body.pos = { x: 80 + o.idx * 2, y: 4 }; o.body.vel = { x: 0, y: 0 }; }
  const fb = sim.slot('F')!, rb = sim.slot('RB')!, fs = sim.slot('FS')!, mike = sim.slot('LB_M')!;
  rb.body.pos = { x: 37, y: CENTER_Y };
  fb.body.pos = { x: 40.5, y: CENTER_Y + .4 };
  fs.body.pos = { x: 47, y: CENTER_Y + 1 };
  mike.body.pos = { x: 41.5, y: CENTER_Y };
  sim.qb.body.pos = { x: 34, y: CENTER_Y + 3 };
  return { sim, fb, rb, fs, mike };
}

describe('a lead blocker takes the first threat to show', () => {
  it('leaves a deep safety for the free Mike between him and the runner', () => {
    const f = scene();
    expect(f.lead.target).toBe(f.mike);
  });

  it('keeps the safety when no one else threatens the runner (control)', () => {
    const f = scene(s => { s.mike.body.pos = { x: 41.5, y: CENTER_Y + 15 }; });
    expect(f.lead.target).toBe(f.fs);
  });

  it('keeps the safety when a teammate is already nearer the Mike (control)', () => {
    const f = scene(s => { s.sim.slot('LG')!.body.pos = { x: 41.1, y: CENTER_Y - .1 }; });
    expect(f.lead.target).toBe(f.fs);
  });

  it('keeps a man who is already near the runner (control)', () => {
    const f = scene(s => { s.fs.body.pos = { x: 40, y: CENTER_Y + 2.5 }; });
    expect(f.lead.target).toBe(f.fs);
  });
});
