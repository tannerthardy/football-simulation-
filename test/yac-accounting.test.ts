/** M4: statistical catch depth versus the physical tape. No live behavior or
 * physics is replaced by an accounting correction. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y, OPP_GOAL_X } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { Game } from '../src/game/game.js';
import { deriveOfficialPlayStats } from '../src/game/official-play-stats.js';
import { generateTeam } from '../src/league/team.js';
import type { PlaySim } from '../src/sim/playsim.js';
import type { PlayResult, PlayStats } from '../src/sim/types.js';
import { gameRecord } from '../scripts/scorecard/records.js';

const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: .6 });
const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: .6 });
const spec = { game: 0, league: 0, home: 0, away: 1, seed: 5 };

function reception(los: number, catchX: number, endX: number, touchdown = false,
  ownRecoveryX?: number) {
  let raw!: PlayResult, sim!: PlaySim;
  const game = new Game(home, away, { seed: spec.seed, hooks: {
    preSnapFoul: () => null,
    playResult(current, kind) {
      if (kind !== 'scrimmage') return undefined;
      sim = current;
      sim.t = sim.world.time = 1;
      for (const a of sim.agents) {
        a.body.pos = { x: 65 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
        a.body.vel = { x: 0, y: 0 }; a.downUntil = -1; a.snapReadyAt = 0;
        a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
      }
      sim.qb.body.pos = { x: los - 3, y: CENTER_Y };
      const receiver = sim.slot('X')!;
      sim.throwBall(sim.qb, receiver, { x: 15, y: 0, z: 4 },
        { x: catchX + 2, y: CENTER_Y, z: 1 }, 2);
      sim.t = sim.world.time = 1.5;
      receiver.body.pos = { x: catchX, y: CENTER_Y };
      sim.possess(receiver, 'catch');
      if (ownRecoveryX !== undefined) {
        receiver.body.pos.x = endX;
        sim.t = 2; sim.fumble(receiver, null);
        receiver.body.pos.x = ownRecoveryX;
        sim.t = 2.5; sim.possess(receiver, 'recovery');
      } else receiver.body.pos.x = endX;
      if (touchdown) sim.tick(); // Native goal-line whistle, not an awarded score.
      else sim.finishCarry('tackle', receiver.pos);
      raw = sim.buildResult();
      return raw;
    },
  } });
  game.setState({ quarter: 2, clock: 600, possession: 'home', yardline: los - 10,
    down: 3, distance: 10, score: { home: 0, away: 7 } });
  game.step();
  const result = game.result();
  const log = result.log.find(p => p.kind === 'pass')!;
  const credit = log.officialCredit!;
  const record = gameRecord(spec, result, 0, stats => stats === raw.stats ? 2 : undefined);
  return { raw, result, sim, log, credit, record: record.plays[0] };
}

describe('NFL YAC and LOS-based air-yard accounting', () => {
  it('reproduces G4-P090: an end-zone catch has zero official YAC and retains the physical evidence', () => {
    // Native PR-tier sample on c5667bc4: pa_shot, LOS95.9,
    // catch112.66991596659537; raw YAC -2.6699159665953687.
    const c = reception(95.9, 112.66991596659537, 112.66991596659537, true);
    expect(c.raw).toMatchObject({ outcome: 'touchdown', offenseYards: 14.1,
      stats: { completed: true, yac: -2.6699159665953687 } });
    expect(c.credit.stats).toMatchObject({ completedAirYards: 14.1, yac: 0 });
    expect(c.credit.stats!.airYards).toBe(c.raw.stats.airYards);
    expect(c.credit.segments).toBe(c.raw.segments);
    expect(c.credit.segments![1].startX).toBe(112.66991596659537);
    expect(c.log.stats).toBe(c.raw.stats);
    expect(c.log.stats!.yac).toBeLessThan(0);
    expect(c.result.box.players.get(c.sim.slot('X')!.player.id)).toMatchObject({ rec: 1, recYds: 14.1, yac: 0 });
    expect(c.record).toMatchObject({ comp: true, yards: 14.1, air: 14.1, yac: 0,
      failedTackleOpportunities: 2 });
    expect(c.credit.stats).not.toBe(c.raw.stats);
  });

  it('preserves a catch before the goal line followed by earned touchdown YAC', () => {
    const c = reception(95, 105, OPP_GOAL_X + .1, true);
    expect(c.credit.stats).toMatchObject({ completedAirYards: 10, yac: 5 });
    expect(c.record).toMatchObject({ air: 10, yac: 5, yards: 15 });
  });

  it('preserves a genuine recorded loss after the catch', () => {
    const c = reception(50, 58, 57);
    expect(c.credit.stats).toBe(c.raw.stats);
    expect(c.record).toMatchObject({ air: 8, yac: -1, yards: 7 });
  });

  it('keeps behind-LOS air negative and credits the actual receiver rather than the aim point', () => {
    const c = reception(50, 46, 53);
    expect(c.raw.stats.airYards).toBe(-2);
    expect(c.record).toMatchObject({ air: -4, yac: 7, yards: 3 });
  });

  it('retains own-fumble recovery losses in the receiving category (GSIS pp26,32)', () => {
    const c = reception(50, 58, 59, false, 54);
    expect(c.raw.segments.map(s => s.how)).toEqual(['snap', 'catch', 'recovery']);
    expect(c.credit.stats).toBe(c.raw.stats);
    expect(c.record).toMatchObject({ air: 8, yac: -4, yards: 4 });
    expect(c.result.box.players.get(c.sim.slot('X')!.player.id)).toMatchObject({ recYds: 4, yac: -4 });
  });

  it('does not mutate frozen raw statistics, segments, or events', () => {
    const c = reception(95.9, 112.66991596659537, 112.66991596659537, true);
    const before = structuredClone(c.raw);
    Object.freeze(c.raw.stats);
    for (const segment of c.raw.segments) Object.freeze(segment);
    Object.freeze(c.raw.segments); Object.freeze(c.raw.events); Object.freeze(c.raw);
    const ruling = deriveOfficialPlayStats({ result: c.raw, calls: [], los: 95.9, startDistance: 10 });
    expect(ruling.credit.stats!.yac).toBe(0);
    expect(c.raw).toEqual(before);
  });

  it('leaves a nullified end-zone catch uncredited', () => {
    const c = reception(95, 113, 113, true);
    const ruling = deriveOfficialPlayStats({ result: c.raw, calls: [], los: 95, startDistance: 10,
      selected: { id: 'offset', kind: 'offset', callIndices: [], spotX: 95, yards: 0,
        possession: 'O', nextDown: 3, nextDistance: 10, autoFirst: false, lossDown: false,
        replayDown: true, safety: false, nullifiesPlay: true, preserveBeforeChangeOfPossession: false } });
    expect(ruling.credit).toMatchObject({ treatment: 'none', playCharged: false });
    expect(ruling.credit.stats).toBeUndefined();
    expect(c.raw.stats.yac).toBe(-3);
  });

  it('uses target depth on incompletions and interceptions, with the statistical goal-line bound', () => {
    const c = reception(95, 105, 106);
    for (const intercepted of [false, true]) {
      const stats = { ...c.raw.stats, completed: false, airYards: 12,
        completedAirYards: undefined, yac: undefined,
        interceptedBy: intercepted ? 'defender' : undefined };
      const entry = { ...c.log, stats, officialCredit: undefined };
      const rec = gameRecord(spec, { ...c.result, log: [entry] }, 0).plays[0];
      expect(rec).toMatchObject({ att: true, comp: false, int: intercepted, air: 12 });
      entry.stats.airYards = 22;
      expect(gameRecord(spec, { ...c.result, log: [entry] }, 0).plays[0].air).toBe(15);
    }
  });

  it('keeps unknown completed depth unknown and excludes throwaways and nullified plays', () => {
    const c = reception(50, 58, 59);
    const stats: PlayStats = { ...c.raw.stats, completedAirYards: undefined };
    const entry = { ...c.log, stats, officialCredit: undefined };
    expect(gameRecord(spec, { ...c.result, log: [entry] }, 0).plays[0].air).toBeUndefined();
    entry.stats = { ...stats, completed: false, throwaway: true };
    const thrownAway = gameRecord(spec, { ...c.result, log: [entry] }, 0).plays[0];
    expect(thrownAway.air).toBeUndefined();
    expect(thrownAway.yac).toBeUndefined();
    expect(gameRecord(spec, { ...c.result, log: [{ ...c.log, nullified: true }] }, 0).plays).toEqual([]);
  });
});
