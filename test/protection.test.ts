import { describe, expect, it } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefPersonnelId } from '../src/playbook/types.js';
import type { Agent } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';

const lr = new Rng(7).fork('league-0');
const offenseTeam = generateTeam(lr.fork('Ironmen'), 'Ironmen', 'IRN', { strength: 0.6 });
const defenseTeam = generateTeam(lr.fork('Comets'), 'Comets', 'COM', { strength: 0.6 });

function dropback(form: string, front: string, personnel: DefPersonnelId, seed: number, pressure: string | null = null): PlaySim {
  const formation = FORMATION_BY_ID[form];
  return new PlaySim({
    offense: pickOffense(offenseTeam, formation.personnel),
    defense: pickDefense(defenseTeam, personnel),
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: '' },
    defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: pressure ? PRESSURE_BY_ID[pressure] : null, zoneStyle: 'match', label: '' },
    los: 40,
    ballY: HASH_LEFT_Y,
    firstDownX: 50,
    seed,
    down: 1,
  });
}

describe('pass protection', () => {
  it('declares protection in order against Tite: edge, 4i, nose, 4i, edge', () => {
    const sim = dropback('gun_empty_11', 'tite', 'base34', 1);
    // Observe the declaration after the linemen's known-count motor response.
    sim.t = Math.max(...sim.offense.map(a => a.snapReadyAt));
    (sim as unknown as { tick(): void }).tick();
    const lt = sim.slot('LT')!;
    const pro = lt.behavior as unknown as { coord: { assigned: Map<Agent, Agent | null> } };
    const map = new Map([...pro.coord.assigned.entries()].map(([b, r]) => [b.slot, r?.slot]));
    const rushers = sim.defense.filter((d) => d.behavior.kind === 'rush').sort((a, b) => a.pos.y - b.pos.y);
    const line = ['RT', 'RG', 'C', 'LG', 'LT'].map((s) => sim.slot(s)!).sort((a, b) => a.pos.y - b.pos.y);
    // Ordered left-to-right on the field, each lineman has the rusher in the same position.
    for (let i = 0; i < Math.min(line.length, rushers.length); i++) {
      const assigned = map.get(line[i].slot) ?? (line[i].engagement?.defender.slot);
      expect(assigned).toBe(rushers[i].slot);
    }
  });

  // PRO_READ: who rushes comes from what the line sees, not from each
  // defender's call. Sting: the weak end (aligned on the line) drops, the
  // Mike (off the ball) blitzes the A gap.
  it('reads a pressure look from what the line sees, not from the call', () => {
    const sim = dropback('gun_doubles_11', 'over', 'nickel', 1, 'sting');
    const end = sim.slot('DE_W')!, mike = sim.slot('LB_M')!;
    expect(end.behavior.kind).not.toBe('rush');
    expect(mike.behavior.kind).toBe('blitz');
    const pro = () => (sim.slot('LT')!.behavior as unknown as { coord: { assigned: Map<Agent, Agent | null> } }).coord;
    const blockedBy = (d: Agent) => sim.offense.filter(b => pro().assigned.get(b) === d || b.engagement?.defender === d).map(b => b.slot);
    const tick = (sim as unknown as { tick(): void }).tick.bind(sim);
    sim.t = Math.max(...sim.offense.map(a => a.snapReadyAt));
    tick();
    // The declaration counts the men on the line: the end who will drop is
    // in it, and the Mike off the ball is not, whatever their calls say.
    expect(blockedBy(end).length).toBe(1);
    expect(blockedBy(mike)).toEqual([]);
    let endReleased = -1, mikePicked = -1;
    while (sim.t < 1.6) {
      tick();
      if (endReleased < 0 && blockedBy(end).length === 0) endReleased = sim.t;
      if (mikePicked < 0 && blockedBy(mike).length > 0) mikePicked = sim.t;
    }
    // The dropping end is let go once seen dropping; the Mike is picked up
    // once seen coming, not on the snap.
    expect(endReleased).toBeGreaterThan(0);
    expect(mikePicked).toBeGreaterThan(sim.offense[0].snapReadyAt + 0.1);
  });
});
