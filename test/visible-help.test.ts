import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { CoverageJudgment, hasVisibleCap } from '../src/sim/coverage/judgment.js';
import { ReleaseReader } from '../src/sim/coverage/reads.js';
import { PerceptionBuffer } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

type Pose = 'up' | 'down' | 'rising';

function setup(pose: Pose | 'falling' = 'up', picture: { ownX?: number; ownVx?: number; capX?: number } = {}) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(7), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'D'), 'nickel'), seed: 3,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, record: true, recordLevel: 'full',
  });
  const a = sim.slot('FS')!, own = sim.slot('X')!, other = sim.slot('H')!, cap = sim.slot('CB_W')!;
  a.body.pos = { x: 52, y: 20 }; a.body.facing = Math.PI;
  own.body.pos = { x: picture.ownX ?? 48, y: 20 }; own.body.vel = { x: picture.ownVx ?? 6, y: 0 };
  other.body.pos = { x: 50, y: 23 }; other.body.vel = { x: 6, y: 0 };
  for (const d of sim.defense) if (d !== a) {
    d.body.pos = { x: 40, y: 40 }; d.body.vel = { x: 0, y: 0 };
  }
  cap.body.pos = { x: picture.capX ?? 51, y: 20 }; cap.body.vel = { x: 5, y: 0 };
  cap.body.support!.state = pose;
  // Constant controlled history isolates the cue. Reads still go through the
  // actual teammate/opponent delays, not a mock of the current bodies.
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  const reader = new ReleaseReader(a, sim), mind = new CoverageJudgment();
  for (const t of [0.1, 0.3]) {
    sim.t = t;
    reader.read(sim, own); reader.read(sim, other);
  }
  const primary = { t: 'man' as const, r: own, opts: { overTop: true } };
  return { sim, a, own, other, cap, reader, mind, primary };
}

function chosenReceiver(s: ReturnType<typeof setup>, mind = s.mind) {
  const d = mind.decide(s.a, s.sim, s.reader, s.primary, true);
  return d.t === 'man' ? d.r : null;
}

describe('delayed visible help', () => {
  it('retains sampled pose through history wraparound without changing the old visual numerics', () => {
    const marked = new PerceptionBuffer(1, 0.05), legacy = new PerceptionBuffer(1, 0.05);
    const poses: Array<Pose | null> = ['up', 'down', 'rising', null];
    for (let i = 0; i < 30; i++) {
      const state = { pos: { x: i / 4, y: i / 7 }, vel: { x: 3 + i / 10, y: -2 },
        stance: i % 2 ? 'high' as const : 'low' as const, facing: i / 9 };
      marked.record([{ ...state, pose: poses[i % poses.length] }]); legacy.record([state]);
      state.pos.x = -999; state.vel.x = -999;
    }
    for (const delay of [-1, 0, 0.05, 0.15, 0.9, 2]) {
      const { pose, ...oldNumerics } = marked.perceive(0, delay);
      const { pose: missing, ...oldReference } = legacy.perceive(0, delay);
      const back = Math.min(23, Math.max(0, Math.round(delay / 0.05)));
      expect(pose).toBe(poses[(29 - back) % poses.length]);
      expect(missing).toBeNull();
      expect(oldNumerics).toEqual(oldReference);
    }
  });

  it.each([['falling', 'down'], ['down', 'down'], ['rising', 'rising']] as const)(
    'keeps its own vertical when apparent help is physically %s and visibly %s', (state, pose) => {
    const s = setup(state);
    expect(s.reader.read(s.sim, s.own)?.release).toBe('vertical');
    expect(s.sim.see(s.a, s.cap).pose).toBe(pose);
    expect(hasVisibleCap(s.a, s.sim, s.reader.read(s.sim, s.own)!)).toBe(false);
    expect(chosenReceiver(s)).toBe(s.own);
    expect(s.mind.reason).toBe('rule');
  });

  it('still permits rescue when a moving upright teammate visibly supplies the roof', () => {
    const s = setup();
    expect(s.sim.see(s.a, s.cap).pose).toBe('up');
    expect(hasVisibleCap(s.a, s.sim, s.reader.read(s.sim, s.own)!)).toBe(true);
    expect(chosenReceiver(s)).toBe(s.other);
    expect(s.mind.reason).toBe('protect-vertical:H');
  });

  it('retains an uncapped declared primary vertical before five yards instead of chasing the deeper route', () => {
    const s = setup('up', { ownX: 43, capX: 40 });
    const own = s.reader.read(s.sim, s.own)!, other = s.reader.read(s.sim, s.other)!;
    expect(own.release).toBe('vertical');
    expect(own.depth).toBeGreaterThan(0);
    expect(own.depth).toBeLessThan(5);
    expect(own.vel.x).toBeGreaterThan(3);
    expect(other.release).toBe('vertical');
    expect(other.depth).toBeGreaterThan(5);
    expect(hasVisibleCap(s.a, s.sim, own)).toBe(false);
    expect(chosenReceiver(s)?.slot).toBe(s.own.slot);
  });

  it('can rescue from an early primary vertical when upright help visibly caps that stem', () => {
    const s = setup('up', { ownX: 43, capX: 46 });
    const own = s.reader.read(s.sim, s.own)!;
    expect(own.release).toBe('vertical');
    expect(own.depth).toBeLessThan(5);
    expect(hasVisibleCap(s.a, s.sim, own)).toBe(true);
    expect(chosenReceiver(s)).toBe(s.other);
  });

  it('still permits rescue when the uncapped primary has visibly declared a short stop', () => {
    const s = setup('up', { ownX: 43, ownVx: 0, capX: 40 });
    const own = s.reader.read(s.sim, s.own)!;
    expect(own.release).toBe('stop');
    expect(hasVisibleCap(s.a, s.sim, own)).toBe(false);
    expect(chosenReceiver(s)).toBe(s.other);
  });

  it('does not turn a hidden scenario parking deadline into a visible fall cue', () => {
    const s = setup();
    s.cap.downUntil = 10;
    for (let i = 0; i < 24; i++) s.sim.perception.record(s.sim.agents);
    expect(s.cap.isDown(s.sim.t)).toBe(true);
    expect(s.sim.see(s.a, s.cap).pose).toBe('up');
    expect(chosenReceiver(s)).toBe(s.other);
  });

  it('can trust an old upright image after a fall, then reconsider on its ordinary decision cadence', () => {
    const s = setup();
    expect(chosenReceiver(s)).toBe(s.other);
    const decisionAt = s.sim.t, interval = s.a.mind.decisionInterval;
    s.cap.body.support!.state = 'down';
    s.sim.t += s.sim.dt; s.sim.perception.record(s.sim.agents);
    expect(s.sim.see(s.a, s.cap).pose).toBe('up');
    // A fresh judgment with the old picture can still make the same mistake.
    expect(chosenReceiver(s, new CoverageJudgment())).toBe(s.other);
    s.sim.t += s.sim.dt; s.sim.perception.record(s.sim.agents);
    expect(s.sim.see(s.a, s.cap).pose).toBe('down');
    expect(hasVisibleCap(s.a, s.sim, s.reader.read(s.sim, s.own)!)).toBe(false);
    s.sim.t = decisionAt + interval - 0.001;
    expect(chosenReceiver(s)).toBe(s.other);
    s.sim.t = decisionAt + interval + 0.001; s.sim.perception.record(s.sim.agents);
    expect(chosenReceiver(s)).toBe(s.own);
  });

  it('waits for visible recovery before treating a teammate as upright help again', () => {
    const s = setup('down');
    expect(chosenReceiver(s)).toBe(s.own);
    for (const state of ['rising', 'up'] as const) {
      s.cap.body.support!.state = state;
      s.sim.t += s.sim.dt; s.sim.perception.record(s.sim.agents);
      expect(s.sim.see(s.a, s.cap).pose).toBe(state === 'rising' ? 'down' : 'rising');
      expect(chosenReceiver(s, new CoverageJudgment())).toBe(s.own);
      s.sim.t += s.sim.dt; s.sim.perception.record(s.sim.agents);
      expect(s.sim.see(s.a, s.cap).pose).toBe(state);
      expect(chosenReceiver(s, new CoverageJudgment())).toBe(state === 'up' ? s.other : s.own);
    }
  });

  it('keeps the legacy geometry fallback when a historical observation has no pose cue', () => {
    const s = setup('down');
    for (let i = 0; i < 24; i++) s.sim.perception.record(s.sim.agents.map(a => ({
      pos: a.pos, vel: a.vel, facing: a.facing, stance: a.stance,
    })));
    expect(s.sim.see(s.a, s.cap).pose).toBeNull();
    expect(chosenReceiver(s)).toBe(s.other);
  });

  it('records the consumed delayed pose without mutating the bodies, vision buffer or random stream', () => {
    const s = setup();
    s.cap.body.support!.state = 'down';
    s.sim.t += s.sim.dt; s.sim.perception.record(s.sim.agents);
    const bodies = structuredClone(s.sim.agents.map(a => a.body));
    const buffer = structuredClone(s.sim.perception), rng = JSON.stringify(s.sim.rng);
    const mind = JSON.stringify(s.a.mind);
    const seen = s.sim.see(s.a, s.cap);
    expect(seen.pose).toBe('up');
    expect(seen.age).toBe(0.05);
    s.sim.trace.state(s.sim);
    const frame = s.sim.trace.data!.frames.at(-1)!;
    expect(frame.agents[s.cap.idx].body?.state).toBe('down');
    expect(frame.perception!.find(p => p.a === s.a.idx && p.b === s.cap.idx)?.pose).toBe('up');
    expect(s.sim.agents.map(a => a.body)).toEqual(bodies);
    expect(s.sim.perception).toEqual(buffer);
    expect(JSON.stringify(s.sim.rng)).toBe(rng);
    expect(JSON.stringify(s.a.mind)).toBe(mind);
    seen.pos.x = -999; seen.vel.y = -999;
    expect(s.sim.see(s.a, s.cap).pos.x).not.toBe(-999);
    expect(s.sim.see(s.a, s.cap).vel.y).not.toBe(-999);
  });
});
