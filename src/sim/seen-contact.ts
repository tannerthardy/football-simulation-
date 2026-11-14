/**
 * Seen contact (the user's information rule; docs/reviews/2026-11-13-information-leak-sweep.md). Whether a man is
 * tied up with an opponent (blocked, in a hand fight, held, in a tackle hold) is a visible state of the bodies, not a
 * record anyone can consult. `recordContact` writes it onto each body from physics every tick (engagements, then hand
 * and grasp joints, strongest first, at most two partners); every other player learns it only through perception, with
 * his own delay, view and peripheral terms. The two men in contact feel it directly and keep their touch channel.
 * With his pose (up / rising / down) it replaces decision reads of another player's true `engagement` / `isDown`.
 */
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

/** Write each body's contact from physics: called by `PlaySim.tick` before the perception record. */
export function recordContact(sim: Pick<PlaySim, 'agents' | 'engagements' | 'world'>): void {
  const byBody = new Map<unknown, Agent>();
  for (const a of sim.agents) { a.contactWith = []; a.held = false; byBody.set(a.body, a); }
  const add = (x: Agent, y: Agent) => {
    if (x.team === y.team || x.contactWith.includes(y.idx) || x.contactWith.length >= 2) return;
    x.contactWith.push(y.idx);
  };
  // Blocks first: the strongest, longest-held contact.
  for (const e of sim.engagements) { add(e.blocker, e.defender); add(e.defender, e.blocker); }
  for (const j of sim.world.joints) {
    const a = byBody.get(j.a), b = byBody.get(j.b);
    if (!a || !b || a.team === b.team) continue;
    add(a, b); add(b, a);
    // A hold: the joint's holder (a grasp's a; a hand joint's holder, default a) has the other man.
    const holder = j.kind === 'grasp' ? a : byBody.get(j.holder ?? j.a);
    const other = holder === a ? b : a;
    if (holder && (j.kind === 'grasp' || j.holder)) other.held = true;
  }
}

/** Whether the observer's picture shows this player in contact with an opponent. */
export function seenEngaged(sim: PlaySim, observer: Agent, target: Agent): boolean {
  return (sim.see(observer, target).contactWith?.length ?? 0) > 0;
}

/** The opponent the observer's picture shows this player in contact with (the strongest), or null. */
export function seenEngagedWith(sim: PlaySim, observer: Agent, target: Agent): Agent | null {
  const i = sim.see(observer, target).contactWith?.[0];
  return i === undefined ? null : sim.agents[i] ?? null;
}

/** All (up to two) partners the observer's picture shows this player in contact with: a double shows both. */
export function seenPartners(sim: PlaySim, observer: Agent, target: Agent): Agent[] {
  return (sim.see(observer, target).contactWith ?? []).map((i) => sim.agents[i]).filter((x): x is Agent => !!x);
}

/** Whether the observer's picture shows this opponent taken: in contact with one of the observer's teammates
 * ('my-team') or with anyone. */
export function seenTaken(sim: PlaySim, observer: Agent, target: Agent, by: 'my-team' | 'any' = 'my-team'): boolean {
  const seen = sim.see(observer, target).contactWith ?? [];
  return by === 'any' ? seen.length > 0 : seen.some((i) => sim.agents[i]?.team === observer.team);
}

/** Whether the observer's picture shows this player down (his pose). */
export function seenDown(sim: PlaySim, observer: Agent, target: Agent): boolean {
  return sim.see(observer, target).pose === 'down';
}
