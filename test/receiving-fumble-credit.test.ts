/** Constructed native accounting controls, NOT restages of the unavailable
 * c5667bc4 G6-P094/G9-P134/G11-P092 witnesses. GSIS 2025 pp32–33. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { Game } from '../src/game/game.js';
import { deriveOfficialPlayStats } from '../src/game/official-play-stats.js';
import { deriveOfficialPossessionStats } from '../src/game/possession-stats.js';
import { generateTeam } from '../src/league/team.js';
import type { PlaySim } from '../src/sim/playsim.js';
import type { PlayResult } from '../src/sim/types.js';
import { gameRecord } from '../scripts/scorecard/records.js';

const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: .6 });
const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: .6 });
const spec = { game: 0, league: 0, home: 0, away: 1, seed: 5 };

function reception(recoveryX = 62, endX = 40, own = false, side: 'home' | 'away' = 'home') {
  let raw!: PlayResult, sim!: PlaySim;
  const game = new Game(home, away, { seed: spec.seed, hooks: {
    preSnapFoul: () => null,
    playResult(current, kind) {
      if (kind !== 'scrimmage') return undefined;
      sim = current; sim.t = sim.world.time = 1;
      for (const a of sim.agents) {
        a.body.pos = { x: 75 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
        a.body.vel = { x: 0, y: 0 }; a.downUntil = -1; a.snapReadyAt = 0;
        a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
      }
      const receiver = sim.slot('X')!, recoverer = own ? receiver : sim.defense[0];
      sim.qb.body.pos = { x: sim.los - 3, y: CENTER_Y };
      sim.throwBall(sim.qb, receiver, { x: 15, y: 0, z: 4 }, { x: 60, y: CENTER_Y, z: 1 }, 2);
      sim.t = 1.5; receiver.body.pos = { x: 58, y: CENTER_Y }; sim.possess(receiver, 'catch');
      sim.t = 2; receiver.body.pos.x = 65; sim.fumble(receiver, null);
      sim.t = 2.5; recoverer.body.pos = { x: recoveryX, y: CENTER_Y }; sim.possess(recoverer, 'recovery');
      sim.t = 3; recoverer.body.pos.x = endX; sim.finishCarry('tackle', recoverer.pos);
      raw = sim.buildResult(); return raw;
    },
  } });
  // Both clubs use the canonical play frame: offense advances toward +x.
  // Swapping possession mirrors the teams' field direction in the Game frame.
  game.setState({ quarter: 2, clock: 600, possession: side, yardline: 40,
    down: 3, distance: 10, score: { home: 0, away: 0 } });
  game.step();
  const result = game.result(), log = result.log.find(p => p.kind === 'pass')!;
  const receiver = sim.slot('X')!, qb = sim.qb;
  return { raw, sim, game, result, log, qb: result.box.players.get(qb.player.id)!,
    receiver: result.box.players.get(receiver.player.id)!,
    offense: result.box.team(side === 'home' ? home.abbr : away.abbr),
    defense: result.box.team(side === 'home' ? away.abbr : home.abbr),
    record: gameRecord(spec, result, 0).plays[0] };
}

describe('receiving-fumble official allocation', () => {
  it.each(['home', 'away'] as const)('credits a behind-fumble opponent recovery with %s attacking', side => {
    const c = reception(62, 40, false, side);
    expect(c.raw).toMatchObject({ offenseYards: 15, endX: 40, possession: 'D', turnover: true,
      stats: { completedAirYards: 8, yac: 7, returnYards: 22 } });
    expect(c.log.officialCredit).toMatchObject({ yards: 12, stats: { completedAirYards: 8, yac: 4 } });
    expect(c.qb).toMatchObject({ att: 1, cmp: 1, passYds: 12 });
    expect(c.receiver).toMatchObject({ rec: 1, recYds: 12, recLong: 12, yac: 4, fumbles: 1, fumblesLost: 1 });
    expect(c.offense).toMatchObject({ passYds: 12, totalYds: 12, turnovers: 1, thirdConv: 0 });
    expect(c.defense.turnovers).toBe(0);
    expect(c.record).toMatchObject({ yards: 12, air: 8, yac: 4, comp: true });
    expect(c.game.state).toMatchObject({ possession: side === 'home' ? 'away' : 'home', yardline: 70 });
  });

  it('does not use the defensive return ending as the recovery or receiving spot', () => {
    const a = reception(62, 40), b = reception(62, 50);
    expect(a.log.officialCredit!.yards).toBe(12);
    expect(b.log.officialCredit!.yards).toBe(12);
    expect([a.raw.stats.returnYards, b.raw.stats.returnYards]).toEqual([22, 12]);
    for (const c of [a, b]) {
      expect(c.log.officialCredit!.stats!.returnYards).toBe(c.raw.stats.returnYards);
      expect(deriveOfficialPossessionStats({ ...c.raw, stats: c.log.officialCredit!.stats! }))
        .toEqual(deriveOfficialPossessionStats(c.raw));
    }
  });

  it('retains an actual loss behind the catch instead of clamping YAC', () => {
    const c = reception(55, 40);
    expect(c.receiver).toMatchObject({ recYds: 5, yac: -3 });
    expect(c.record).toMatchObject({ yards: 5, air: 8, yac: -3 });
  });

  it('does not award loose-ball forward gain on an opponent recovery ahead', () => {
    const c = reception(68, 50);
    expect(c.receiver).toMatchObject({ recYds: 15, yac: 7 });
    expect(c.log.officialCredit!.stats).toBe(c.raw.stats);
    expect(c.record.yards).toBe(15);
  });

  it.each([[62, 60, 10, 2], [68, 70, 20, 12]])('keeps own recovery%s through ending%s in receiving credit',
    (recoveryX, endX, yards, yac) => {
      const c = reception(recoveryX, endX, true);
      expect(c.receiver).toMatchObject({ recYds: yards, yac, fumbles: 1, fumblesLost: 0 });
      expect(c.log.officialCredit!.stats).toBe(c.raw.stats);
      expect(c.offense.turnovers).toBe(0);
    });

  it('does not credit a nullified reception or fumble', () => {
    const c = reception();
    const ruling = deriveOfficialPlayStats({ result: c.raw, calls: [], los: 50, startDistance: 10,
      selected: { id: 'offset', kind: 'offset', callIndices: [], spotX: 50, yards: 0,
        possession: 'O', nextDown: 3, nextDistance: 10, autoFirst: false, lossDown: false,
        replayDown: true, safety: false, nullifiesPlay: true, preserveBeforeChangeOfPossession: false } });
    expect(ruling.result).toBeUndefined();
    expect(ruling.credit).toMatchObject({ treatment: 'none', playCharged: false });
    expect(gameRecord(spec, { ...c.result, log: [{ ...c.log, nullified: true,
      officialCredit: ruling.credit }] }, 0).plays).toEqual([]);
  });

  it('preserves frozen raw gameplay, segments, events, return credit and RNG', () => {
    const c = reception(), before = structuredClone(c.raw), rng = { ...c.sim.rng };
    Object.freeze(c.raw.stats); c.raw.segments.forEach(Object.freeze);
    Object.freeze(c.raw.segments); Object.freeze(c.raw.events); Object.freeze(c.raw);
    const ruling = deriveOfficialPlayStats({ result: c.raw, calls: [], los: 50, startDistance: 10 });
    expect(ruling.credit.yards).toBe(12);
    expect(c.raw).toEqual(before);
    expect({ ...c.sim.rng }).toEqual(rng);
    expect(ruling.result).toEqual({ ...c.raw, offenseYards: 12, stats: { ...c.raw.stats, yac: 4 } });
    expect(ruling.result!.segments).toBe(c.raw.segments);
    expect(ruling.result!.events).toBe(c.raw.events);
  });

  it('does not infer an unknown recovery from the final return spot in a legacy tape', () => {
    const c = reception(), raw = { ...c.raw, segments: c.raw.segments.slice(0, -1) };
    const ruling = deriveOfficialPlayStats({ result: raw, calls: [], los: 50, startDistance: 10 });
    expect(ruling.credit.yards).toBe(15);
    expect(ruling.credit.stats).toBe(raw.stats);
  });

  it('keeps incomplete legacy identity/segment evidence unchanged', () => {
    const c = reception(), raw = { ...c.raw, segments: [], stats: { ...c.raw.stats, receiver: undefined } };
    const ruling = deriveOfficialPlayStats({ result: raw, calls: [], los: 50, startDistance: 10 });
    expect(ruling.result).toBe(raw);
    expect(ruling.credit.yards).toBe(15);
  });

  it('computes fractional official gain from LOS without subtracting two rounded credits', () => {
    const c = reception();
    const raw = { ...c.raw, offenseYards: 15, stats: { ...c.raw.stats, completedAirYards: 7.996 },
      segments: c.raw.segments.map(s => s.how === 'recovery' ? { ...s, startX: 62.005 } : s) };
    const ruling = deriveOfficialPlayStats({ result: raw, calls: [], los: 50.004, startDistance: 10 });
    expect(ruling.credit.yards).toBe(12);
    expect(ruling.credit.stats!.yac).toBeCloseTo(4.005, 10);
  });
});
