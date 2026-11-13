import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';
import type { ReplayLevel } from '../src/sim/types.js';

const offense = generateTeam(new Rng(21), 'Offense', 'OFF', { strength: 0.6 });
const defense = generateTeam(new Rng(22), 'Defense', 'DEF', { strength: 0.6 });
function setup(kind: 'pass' | 'run', level: ReplayLevel, record = true): PlaySetup {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  return {
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: false, kind, pass: kind === 'pass' ? PASS_BY_ID.four_verts : undefined,
      run: kind === 'run' ? RUN_BY_ID.iz_weak : undefined, label: 'recording fixture' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4_palms,
      pressure: null, zoneStyle: 'match', label: 'Palms' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5, record, recordLevel: level,
  };
}

describe('observational replay recording', () => {
  it.each(['pass', 'run'] as const)('light, standard and full preserve %s physics, results, event decisions and RNG', kind => {
    const runs = (['light', 'standard', 'full'] as const).map(level => {
      const sim = new PlaySim(setup(kind, level));
      const { telemetry, ...result } = sim.run();
      return { result, telemetry, bodies: JSON.stringify(sim.agents.map(a => a.body)), nextRandom: sim.rng.nextU32() };
    });
    expect(runs[1].result).toEqual(runs[0].result);
    expect(runs[2].result).toEqual(runs[0].result);
    expect(runs[1].bodies).toBe(runs[0].bodies);
    expect(runs[2].bodies).toBe(runs[0].bodies);
    expect(runs[1].nextRandom).toBe(runs[0].nextRandom);
    expect(runs[2].nextRandom).toBe(runs[0].nextRandom);
    expect(runs[0].telemetry).toBeUndefined();
    for (const run of runs.slice(1)) {
      expect(run.telemetry?.frames.map(f => f.t)).toEqual(run.result.frames?.map(f => f.t));
      expect(run.telemetry?.frames.every(f => f.agents.length === 22)).toBe(true);
    }
    expect(runs[1].telemetry?.frames[0].agents[0].body).toBeUndefined();
    expect(runs[2].telemetry?.frames[0].agents[0].body).toBeDefined();
  });

  it('stores copied source state and only existing coverage choices, with unavailable causes explicit', () => {
    const sim = new PlaySim(setup('pass', 'full'));
    for (let i = 0; i < 45 && sim.phase === 'live'; i++) sim.tick();
    const first = JSON.stringify(sim.trace.data!.frames[0]);
    const before = sim.trace.data!.decisions.filter(d => d.kind === 'coverage-job');
    for (const decision of before) {
      const b = sim.agents[decision.a].behavior;
      expect(b instanceof CoverageDefender).toBe(true);
      expect((b as CoverageDefender).history).toContainEqual({ t: decision.t, job: decision.chose });
      expect(decision.cue).toBeNull();
      expect(decision.detail).toContain('Causal trigger is not exposed');
    }
    expect(before.length).toBeGreaterThan(0);
    expect(sim.trace.data!.frames.some(f => f.perception?.length)).toBe(true);
    expect(sim.trace.data!.frames.some(f => f.qb?.belief && Object.keys(f.qb.belief).length)).toBe(true);
    sim.agents[0].body.pos.x += 10;
    sim.agents[0].runFit = { gap: 'A', side: 1, kind: 'interior', technique: 'control', edge: 'box', pace: 'stack' };
    if (sim.phase === 'live') sim.tick();
    expect(JSON.stringify(sim.trace.data!.frames[0])).toBe(first);
  });

  it('does not keep rich state when recording is off, even with a full request', () => {
    const sim = new PlaySim(setup('run', 'full', false));
    sim.tick();
    expect(sim.frames).toEqual([]);
    expect(sim.trace.data).toBeUndefined();
  });

  it('coverage rule inspection copies consumed keys and preserves the play and RNG', () => {
    const plain = new PlaySim(setup('pass', 'light', false));
    const inspected = new PlaySim(setup('pass', 'light', false));
    let declarations = 0;
    while (inspected.phase === 'live' && inspected.t < 2) {
      const readTick = inspected.t;
      plain.tick(); inspected.tick();
      for (const a of inspected.defense) {
        if (!(a.behavior instanceof CoverageDefender)) continue;
        const snapshot = a.behavior.recordedRule(readTick);
        const original = JSON.stringify(snapshot);
        declarations += snapshot.reads.length;
        for (const rd of snapshot.reads) { rd.position.x += 100; rd.velocity.y += 100; }
        expect(JSON.stringify(a.behavior.recordedRule(readTick))).toBe(original);
      }
    }
    expect(declarations).toBeGreaterThan(0);
    expect(inspected.run()).toEqual(plain.run());
    expect(JSON.stringify(inspected.agents.map(a => a.body))).toBe(JSON.stringify(plain.agents.map(a => a.body)));
    expect(inspected.rng.nextU32()).toBe(plain.rng.nextU32());
  });

  it('records staged pre-snap commands without changing movement and replaces the staged snap frame', () => {
    const make = (level: ReplayLevel) => {
      const input = setup('pass', level);
      input.defCall = { ...input.defCall, frontStem: { from: FRONT_BY_ID.under, secondsBeforeSnap: 0.4 } };
      return new PlaySim(input);
    };
    const light = make('light'), full = make('full');
    expect(full.frames).toEqual(light.frames);
    expect(full.trace.data!.frames.some(f => f.t < 0 && f.agents.some(a => a.intent && Math.hypot(...a.intent.velocity) > 0))).toBe(true);
    light.tick(); full.tick();
    expect(full.frames).toEqual(light.frames);
    expect(full.trace.data!.frames.map(f => f.t)).toEqual(full.frames.map(f => f.t));
    expect(full.trace.data!.frames.filter(f => f.t === 0)).toHaveLength(1);
    expect(full.rng.nextU32()).toBe(light.rng.nextU32());
  });
});
