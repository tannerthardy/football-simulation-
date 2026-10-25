import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PerceptionBuffer, type Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { ReplayTrace } from '../src/sim/telemetry.js';
import { packTelemetry, unpackTelemetry } from '../scripts/replay-telemetry-packing.js';

type Snapshot = Parameters<PerceptionBuffer['record']>[0];
function record(buffer: PerceptionBuffer, states: Snapshot, holder?: number | null): void {
  buffer.record(states, holder);
}
const carrying = (cue: Perceived) => cue.carrying;
const states = () => [0, 1].map(i => ({ pos: { x: i * 3, y: 7 }, vel: { x: 2, y: -1 },
  stance: 'low' as const, facing: 0.4, pose: 'up' as const }));

function setup(staged = false, recorded = false): PlaySim {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(31), 'Offense', 'O'), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'Defense', 'D'), 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'possession fixture' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1,
      pressure: null, label: 'man', ...(staged ? { frontStem: { from: FRONT_BY_ID.under, secondsBeforeSnap: 0.4 } } : {}) },
    los: 40, ballY: 26, firstDownX: 50, seed: 7, record: recorded, recordLevel: 'full', recordEvery: 1,
  });
  // Isolate sampling from later football controllers; body movement continues
  // through the production World. Transfers use the real action methods.
  for (const a of sim.agents) a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  return sim;
}

describe('delayed sampled possession', () => {
  it('keeps legacy snapshots explicitly unknown rather than treating missing possession as false', () => {
    const buffer = new PerceptionBuffer(2, 0.05);
    buffer.record(states());
    expect(carrying(buffer.perceive(0, 0))).toBeNull();
    expect(carrying(buffer.perceive(1, 0))).toBeNull();
  });

  it('distinguishes a known unheld ball from an omitted possession sample', () => {
    const buffer = new PerceptionBuffer(2, 0.05);
    record(buffer, states(), null);
    expect(carrying(buffer.perceive(0, 0))).toBe(false);
    expect(carrying(buffer.perceive(1, 0))).toBe(false);
  });

  it('identifies the sampled holder while preserving known false for other players', () => {
    const buffer = new PerceptionBuffer(2, 0.05);
    record(buffer, states(), 1);
    expect(carrying(buffer.perceive(0, 0))).toBe(false);
    expect(carrying(buffer.perceive(1, 0))).toBe(true);
  });

  it('samples possession and pose from the same delayed state rather than the current holder', () => {
    const buffer = new PerceptionBuffer(2, 0.05), s = states();
    record(buffer, s, 0);
    record(buffer, s.map(a => ({ ...a, pose: 'down' as const })), 1);
    const old = buffer.perceive(0, 0.05), current = buffer.perceive(0, 0);
    expect({ carrying: carrying(old), pose: old.pose, age: old.age }).toEqual({ carrying: true, pose: 'up', age: 0.05 });
    expect({ carrying: carrying(current), pose: current.pose, age: current.age }).toEqual({ carrying: false, pose: 'down', age: 0 });
  });

  it('does not fill a later unknown sample with an earlier or current holder', () => {
    const buffer = new PerceptionBuffer(2, 0.05);
    record(buffer, states(), 0); record(buffer, states());
    expect(carrying(buffer.perceive(0, 0))).toBeNull();
    expect(carrying(buffer.perceive(0, 0.05))).toBe(true);
  });

  it('retains a stale held image after a release and then consumes known unheld possession', () => {
    const buffer = new PerceptionBuffer(2, 0.05);
    record(buffer, states(), 0); record(buffer, states(), null);
    expect(carrying(buffer.perceive(0, 0.05))).toBe(true);
    expect(carrying(buffer.perceive(0, 0))).toBe(false);
  });

  it('retains ternary possession through the bounded history wrap and ordinary delay rounding', () => {
    const buffer = new PerceptionBuffer(2, 0.05), holders = [0, 1, null, undefined];
    for (let i = 0; i < 31; i++) record(buffer, states(), holders[i % holders.length]);
    for (const delay of [-1, 0, 0.049, 0.15, 0.9, 2]) {
      const back = Math.min(23, Math.max(0, Math.round(delay / 0.05)));
      const holder = holders[(30 - back) % holders.length];
      for (let i = 0; i < 2; i++) {
        expect(carrying(buffer.perceive(i, delay))).toBe(holder === undefined ? null : holder === i);
      }
    }
  });

  it('leaves dead-reckoned position, velocity, pose, stance, facing and sample age unchanged', () => {
    const marked = new PerceptionBuffer(2, 0.05), legacy = new PerceptionBuffer(2, 0.05);
    for (let i = 0; i < 31; i++) {
      const s = states().map((a, j) => ({ ...a, pos: { x: i + j, y: i / 3 }, vel: { x: 2 + i / 7, y: -i / 5 }, facing: i / 8 }));
      record(marked, s, i % 2); legacy.record(s);
      s[0].pos.x = -999; s[0].vel.y = -999;
    }
    for (const delay of [-1, 0, 0.15, 0.9, 2]) for (let i = 0; i < 2; i++) {
      const { carrying: _marked, ...numerics } = marked.perceive(i, delay);
      const { carrying: _legacy, ...reference } = legacy.perceive(i, delay);
      expect(numerics).toEqual(reference);
    }
  });

  it.each([false, true])('records native initial and staged=%s snapshots with the real holder', staged => {
    const sim = setup(staged);
    for (const a of sim.agents) expect(carrying(sim.perception.perceive(a.idx, 0))).toBe(a === sim.qb);
    if (staged) expect(carrying(sim.perception.perceive(sim.qb.idx, 0.25))).toBe(true);
  });

  it('does not infer an immediate handoff from current carrier, handoffAt or hidden call flags', () => {
    const sim = setup(), back = sim.slot('RB')!, observer = sim.slot('LB_M')!;
    observer.mind.observationDelay = () => 0.1;
    back.body.pos = { x: sim.qb.pos.x, y: sim.qb.pos.y + 0.8 };
    for (let i = 0; i < 24; i++) record(sim.perception, sim.agents, sim.qb.idx);
    expect(sim.handoff(sim.qb, back)).toBe(true);
    expect(sim.carrier).toBe(back);
    expect(carrying(sim.see(observer, back))).toBe(false);
    sim.isPass = false; sim.handoffAt = 999;
    expect(carrying(sim.see(observer, back))).toBe(false);
    sim.tick(); expect(carrying(sim.see(observer, back))).toBe(false);
    sim.tick(); expect(carrying(sim.see(observer, back))).toBe(false);
    sim.tick(); expect(carrying(sim.see(observer, back))).toBe(true);
  });

  it('records known non-possession during a native pitch without retroactively changing the release image', () => {
    const sim = setup(), back = sim.slot('RB')!, observer = sim.slot('LB_M')!;
    observer.mind.observationDelay = () => 0.1;
    for (let i = 0; i < 24; i++) record(sim.perception, sim.agents, sim.qb.idx);
    expect(sim.pitchBall(sim.qb, back)).toBe(true);
    expect(sim.carrier).toBeNull();
    expect(carrying(sim.see(observer, sim.qb))).toBe(true);
    sim.tick();
    expect(carrying(sim.perception.perceive(sim.qb.idx, 0))).toBe(false);
    expect(carrying(sim.perception.perceive(back.idx, 0))).toBe(false);
    expect(carrying(sim.see(observer, sim.qb))).toBe(true);
  });

  it('records known non-possession in pass flight while the delayed QB image can still hold it', () => {
    const sim = setup(), observer = sim.slot('LB_M')!;
    observer.mind.observationDelay = () => 0.1;
    for (let i = 0; i < 24; i++) record(sim.perception, sim.agents, sim.qb.idx);
    sim.throwBall(sim.qb, null, { x: 15, y: 0, z: 5 }, { x: 60, y: 26, z: 1 }, 1);
    expect(sim.ball.kind).toBe('air');
    expect(carrying(sim.see(observer, sim.qb))).toBe(true);
    sim.tick();
    for (const a of sim.agents) expect(carrying(sim.perception.perceive(a.idx, 0))).toBe(false);
    expect(carrying(sim.see(observer, sim.qb))).toBe(true);
  });

  it('copies the actually consumed carrying cue into full replay telemetry and packs it losslessly', () => {
    const sim = setup(), a = sim.slot('LB_M')!, b = sim.slot('RB')!;
    const trace = new ReplayTrace('full', 1, true);
    for (const [t, value] of [[0, true], [0.05, false], [0.1, null]] as const) {
      const cue: Perceived = { pos: { x: 2, y: 3 }, vel: { x: 4, y: 0 }, stance: null,
        facing: 0, pose: 'up', age: 0.2, carrying: value };
      sim.t = t; trace.observe(a, b, cue, t); trace.state(sim);
      cue.carrying = !value;
    }
    const entries = trace.data!.frames.map(f => f.perception![0]);
    expect(entries.map(e => e.carrying)).toEqual([true, false, null]);
    expect(unpackTelemetry(packTelemetry(trace.data!))).toEqual(trace.data);
    expect(entries.map(e => e.age)).toEqual([0.2, 0.2, 0.2]);
  });
});
