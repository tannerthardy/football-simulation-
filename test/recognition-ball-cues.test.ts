import { describe, expect, it, vi } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefensivePlayCall } from '../src/playbook/types.js';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { Recognition } from '../src/sim/recognition.js';

// INFO-1 stage 2: the run/pass ball cues come from the defender's own
// pictures. Hidden throw/handoff clocks and the true holder say nothing.
const home = generateTeam(new Rng(31), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(32), 'Away', 'AWY', { strength: 0.6 });
const formation = FORMATION_BY_ID.i_pro_21;
const offense = pickOffense(home, formation.personnel);
const defense = pickDefense(away, 'base43');
const defCall: DefensivePlayCall = { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'c3' };
const LOS = 40;

type Look = { back?: boolean; qbX?: number; qbCarrying?: boolean | null; then?: Look };

/** A fresh linebacker read at t=1.0 against given pictures (and, with
 * `then`, a second update 0.1 s later against the next pictures). */
function read(look: Look, hidden?: (sim: PlaySim) => void): number {
  const sim = new PlaySim({ offense, defense,
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'iz' },
    defCall, los: LOS, ballY: HASH_LEFT_Y, firstDownX: 50, seed: 5 });
  const lb = sim.slot('LB_M')!;
  let pictures = new Map<Agent, Perceived>();
  const show = (l: Look) => {
    const runner = sim.slot('RB')!;
    pictures = new Map<Agent, Perceived>(sim.offense.map(o => [o, {
      pos: { x: sim.snapX[o.idx], y: o.pos.y }, vel: { x: 0, y: 0 }, stance: 'high', facing: 0, age: .2, carrying: false }]));
    pictures.set(sim.qb, { pos: { x: l.qbX ?? LOS - 2, y: HASH_LEFT_Y }, vel: { x: 0, y: 0 }, stance: 'high', facing: 0,
      age: .2, carrying: l.qbCarrying === undefined ? true : l.qbCarrying });
    if (l.back) pictures.set(runner, { ...pictures.get(runner)!, pos: { x: LOS - 3, y: HASH_LEFT_Y + 1 }, carrying: true });
  };
  show(look);
  vi.spyOn(sim, 'see').mockImplementation((_a, target) => structuredClone(pictures.get(target)!));
  hidden?.(sim);
  sim.t = 1;
  const recog = new Recognition(lb, sim, 0);
  recog.update(lb, sim);
  if (look.then) { show(look.then); sim.t = 1.1; recog.update(lb, sim); }
  return recog.logOdds;
}

describe('run/pass ball cues from acquired pictures', () => {
  const base = read({});

  it('ignores hidden handoff and throw clocks and the true holder', () => {
    expect(read({}, sim => {
      sim.handoffAt = .2; sim.throwAt = .3;
      sim.ball = { kind: 'held', carrier: sim.slot('RB')! };
    })).toBe(base);
  });

  it('reads run from a back he sees holding the ball behind the line', () => {
    expect(read({ back: true, qbCarrying: false })).toBeCloseTo(base - 3, 6);
  });

  it('keeps a seen give after the runner leaves his picture', () => {
    const once = read({ back: true, qbCarrying: false, then: { qbCarrying: false } });
    const never = read({ qbCarrying: false, then: { qbCarrying: false } });
    expect(once - never).toBeCloseTo(-3, 1);
  });

  it('gives a play-action fake (empty-handed back) no ball cue', () => {
    expect(read({ back: false })).toBe(base);
  });

  it('reads run from the QB he sees carrying past the line, not before', () => {
    expect(read({ qbX: LOS + 1 })).toBeCloseTo(base - 3, 6);
    expect(read({ qbX: LOS + .2 })).toBe(base);
    expect(read({ qbX: LOS + 1, qbCarrying: null })).toBe(base);
  });
});
