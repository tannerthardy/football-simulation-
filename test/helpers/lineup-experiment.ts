/** Bounded lineup-order witness. Observes actual calls, never evaluates a controller twice. */
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { Agent, Behavior } from '../../src/sim/agent.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';

export function lineupFixture(kind: 'run' | 'pass', seed = 77): PlaySetup {
  const offense = generateTeam(new Rng(19), 'Offense', 'OFF');
  const defense = generateTeam(new Rng(20), 'Defense', 'DEF');
  return {
    offense: pickOffense(offense, kind === 'run' ? '12' : '11'),
    defense: pickDefense(defense, kind === 'run' ? 'base43' : 'nickel'),
    offCall: kind === 'run'
      ? { formation: FORMATION_BY_ID.ace_12, flip: false, kind, run: RUN_BY_ID.iz_strong, label: 'Inside Zone' }
      : { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind, pass: PASS_BY_ID.hitches, label: 'Hitches' },
    defCall: { personnel: kind === 'run' ? 'base43' : 'nickel', front: FRONT_BY_ID.over,
      coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: 26, firstDownX: 50, seed, record: false,
  };
}

const identity = (a: Agent) => `${a.team}:${a.slot}:${a.player.id}`;
const byIdentity = <T extends { actor: string }>(rows: T[]) => rows.sort((a, b) => a.actor < b.actor ? -1 : a.actor > b.actor ? 1 : 0);

export function reordered(setup: PlaySetup, offense: boolean, defense: boolean): PlaySetup {
  const entries = <T extends object>(value: T, reverse: boolean) => Object.fromEntries(
    reverse ? Object.entries(value).reverse() : Object.entries(value));
  return { ...setup, offense: entries(setup.offense, offense), defense: entries(setup.defense, defense) };
}

export function lineupExperiment(setup: PlaySetup, seconds = 2, observeRequests = true) {
  const sim = new PlaySim(setup);
  const actors = () => byIdentity(sim.agents.map(a => ({ actor: identity(a),
    body: structuredClone(a.body), behavior: a.behavior.kind, snapReadyAt: a.snapReadyAt,
    mind: { alignment: a.mind.alignmentError, execution: a.mind.executionError,
      delay: a.mind.snapDelay, urgency: a.mind.urgencyBias, focus: a.mind.focus },
    alignment: structuredClone(a.team === 'O' ? sim.offAlign.spots[a.slot as keyof typeof sim.offAlign.spots]
      : sim.defAlign.spots[a.slot as keyof typeof sim.defAlign.spots]),
  })));
  const initial = actors();
  const steps: Array<{ start: number; end: number; raw: Array<{ actor: string; behavior: string; command: unknown }>;
    actors: ReturnType<typeof actors>; ball: unknown; phase: string }> = [];
  while (sim.phase === 'live' && sim.t < seconds) {
    const start = sim.t;
    const raw: typeof steps[number]['raw'] = [];
    const original = new Map<Behavior, Behavior['update']>();
    // Install for this tick only: behavior can be replaced during the play.
    // The normal tick still owns invocation, order, RNG and all modifiers.
    if (observeRequests) for (const a of sim.agents) {
      const b = a.behavior;
      if (original.has(b)) continue;
      const update = b.update;
      original.set(b, update);
      b.update = function(actor, play) {
        const command = update.call(this, actor, play);
        raw.push({ actor: identity(actor), behavior: this.kind, command: structuredClone(command) });
        return command;
      };
    }
    try { sim.tick(); }
    finally { for (const [b, update] of original) b.update = update; }
    steps.push({ start, end: sim.t, raw: byIdentity(raw), actors: actors(), phase: sim.phase,
      ball: { kind: sim.ball.kind, position: structuredClone(sim.ballPos()), carrier: sim.carrier ? identity(sim.carrier) : null } });
  }
  const who = (i?: number) => i === undefined ? undefined : identity(sim.agents[i]);
  const events = sim.events.map(({ a, b, ...event }) => ({ ...event, a: who(a), b: who(b) }));
  return { initial, steps, events, rngNext: sim.rng.nextU32() };
}
