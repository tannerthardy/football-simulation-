/** NFL2026 16-1-5(c): a kickoff is R's opportunity even when K legally recovers.
 * Scripted kick facts exercise ordinary Game callers; no football physics. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { Game } from '../src/game/game.js';
import type { FreeKickFacts } from '../src/game/kick-rules.js';
import { generateTeam } from '../src/league/team.js';
import { World } from '../src/physics/world.js';

const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: .6 });
const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: .6 });
const recoveredOnside: FreeKickFacts = { kind: 'onside', declaredOnside: true,
  declarationBeforePlayClock: true, kickSpot: 35, reachedReceivingRestrainingLine: true,
  terminal: { kind: 'possession', possession: 'kicking', yardline: 55 } };

function openingKick(event: FreeKickFacts, state: Parameters<Game['setState']>[0] = {}) {
  const g = new Game(home, away, { seed: 5, hooks: {
    freeKickEvent: () => event,
    scrimmageKickEvent: () => ({ scrimmageSpot: 90, fieldGoalGood: true,
      terminal: { kind: 'posts', yardline: 0 } }),
  } });
  g.setState({ quarter: 5, clock: 600, openingReceiver: 'away', otFirst: 'away',
    otPossessions: 0, possession: 'away', score: { home: 0, away: 0 }, ...state });
  g.kickoffToStart();
  return g;
}

beforeEach(() => { vi.spyOn(World.prototype, 'step').mockImplementation(() => {
  throw new Error('Kick-opportunity scenarios must not simulate a snap');
}); });
afterEach(() => vi.restoreAllMocks());

describe('overtime kickoff opportunities', () => {
  it('counts the opening receivers before the recovering kickers; their field goal wins', () => {
    const g = openingKick(recoveredOnside);
    expect(g.state).toMatchObject({ possession: 'home', otFirst: 'away', otPossessions: 2, over: false });
    g.setState({ yardline: 90, down: 4, distance: 10 });
    // Use the Game FG caller with the represented good kick, not a sampled score or native snap.
    (g as unknown as { doFieldGoal(): void }).doFieldGoal();
    expect(g.state).toMatchObject({ score: { home: 3, away: 0 }, over: true });
    expect(g.result().log.filter(p => p.kind === 'kickoff')).toHaveLength(1);
  });

  it('keeps a normal receiving-team possession as the first opportunity', () => {
    const g = openingKick({ kind: 'kickoff', terminal: { kind: 'out_of_bounds', yardline: -1 } });
    expect(g.state).toMatchObject({ possession: 'away', otFirst: 'away', otPossessions: 1, over: false });
  });

  it('ends the game when the first FG scorer recovers the answering kickoff', () => {
    const g = openingKick(recoveredOnside, { otFirst: 'home', otPossessions: 1,
      score: { home: 3, away: 0 } });
    expect(g.state).toMatchObject({ possession: 'home', otFirst: 'home', otPossessions: 3,
      score: { home: 3, away: 0 }, over: true });
  });

  it('counts an illegal early recovery awarded to R only once', () => {
    const g = openingKick({ ...recoveredOnside, reachedReceivingRestrainingLine: false,
      terminal: { kind: 'possession', possession: 'kicking', yardline: 58 } });
    expect(g.state).toMatchObject({ possession: 'away', otFirst: 'away', otPossessions: 1, over: false });
  });

  it('preserves a kicking-team recovery touchdown as an immediate overtime win', () => {
    const g = openingKick({ kind: 'kickoff', landingZoneTouched: true,
      terminal: { kind: 'possession', possession: 'kicking', yardline: -1 } });
    expect(g.state).toMatchObject({ score: { home: 6, away: 0 }, over: true });
    expect(g.result().log.some(p => p.kind === 'xp' || p.kind === 'two')).toBe(false);
  });

  it('leaves regulation recovery and overtime counters unchanged', () => {
    const g = openingKick(recoveredOnside, { quarter: 1 });
    expect(g.state).toMatchObject({ possession: 'home', otFirst: 'away', otPossessions: 0, over: false });
  });
});
