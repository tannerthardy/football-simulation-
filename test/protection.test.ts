import { describe, expect, it } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefPersonnelId } from '../src/playbook/types.js';
import type { Agent } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';

const lr = new Rng(7).fork('league-0');
const offenseTeam = generateTeam(lr.fork('Ironmen'), 'Ironmen', 'IRN', { strength: 0.6 });
const defenseTeam = generateTeam(lr.fork('Comets'), 'Comets', 'COM', { strength: 0.6 });

function dropback(form: string, front: string, personnel: DefPersonnelId, seed: number): PlaySim {
  const formation = FORMATION_BY_ID[form];
  return new PlaySim({
    offense: pickOffense(offenseTeam, formation.personnel),
    defense: pickDefense(defenseTeam, personnel),
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: '' },
    defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', label: '' },
    los: 40,
    ballY: HASH_LEFT_Y,
    firstDownX: 50,
    seed,
    down: 1,
  });
}

/** Share of edge rushes on which the rusher was engaged by a blocker before the play ended. */
function edgesEngaged(form: string, front: string, personnel: DefPersonnelId, plays: number): number {
  let engaged = 0;
  let total = 0;
  for (let seed = 1; seed <= plays; seed++) {
    const sim = dropback(form, front, personnel, seed);
    const edges = sim.defense.filter((d) => (d.slot === 'DE_W' || d.slot === 'DE_S') && d.behavior.kind === 'rush');
    const touched = new Set<Agent>();
    const step = sim as unknown as { tick(): void };
    while (sim.phase === 'live' && sim.t < 3) {
      step.tick();
      for (const d of edges) if (d.engagement) touched.add(d);
      // A contact followed by a same-tick shed is still a real interception
      // of the rush arc. Snapshot-only counting misses that short rep.
      for (const event of sim.events) if (event.type === 'block_contact') {
        const d = edges.find(d => d.idx === event.b);
        if (d) touched.add(d);
      }
    }
    engaged += touched.size;
    total += edges.length;
  }
  return engaged / Math.max(1, total);
}

describe('pass protection', () => {
  it('blocks the edge rushers instead of shadowing their arc', () => {
    expect(edgesEngaged('gun_doubles_11', 'over', 'nickel', 12)).toBeGreaterThan(0.9);
    expect(edgesEngaged('ace_12', 'over', 'base43', 12)).toBeGreaterThan(0.9);
    // A wide-nine end has a genuine speed advantage, but is still usually touched.
    expect(edgesEngaged('gun_doubles_11', 'wide9', 'nickel', 12)).toBeGreaterThan(0.75);
  });

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
});
