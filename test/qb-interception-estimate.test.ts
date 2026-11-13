/** The QB prices an interception over where his ball can actually go: an errant
 * ball is the one a defender beside the window picks. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { QBPass } from '../src/sim/behaviors/qb.js';
import { PlaySim } from '../src/sim/playsim.js';

const home = generateTeam(new Rng(91), 'Estimate offense', 'EOF');
const away = generateTeam(new Rng(92), 'Estimate defense', 'EDF');

function scene(accuracy: number, gap = 3) {
  const sim = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 45,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'curl' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Cover 3' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false });
  const qbAgent = sim.qb, qb = qbAgent.behavior as QBPass, r = sim.slot('X')!;
  for (const k of ['accShort', 'accMid', 'accDeep'] as const) qbAgent.player.ratings[k] = accuracy;
  sim.t = 2;
  qbAgent.body.pos = { x: sim.los - 7, y: sim.ballY }; qbAgent.body.vel = { x: 0, y: 0 };
  r.body.pos = { x: sim.los + 12, y: 12 }; r.body.vel = { x: 0, y: 0 };
  // Everyone far away except one defender sitting 3 yd inside the window, facing the QB.
  for (const d of sim.defense) { d.body.pos = { x: sim.los + 40, y: 50 }; d.body.vel = { x: 0, y: 0 }; }
  const lurker = sim.slot('CB_S') ?? sim.defense[0];
  lurker.body.pos = { x: sim.los + 12, y: 12 + gap }; lurker.body.facing = Math.PI;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  // A fresh picture of every defender (no remembered alignment).
  (sim.qbMind as unknown as { memory: Map<unknown, unknown> }).memory.clear();
  const point = { x: sim.los + 12, y: 12, z: 1.2 };
  const from = { x: qbAgent.pos.x, y: qbAgent.pos.y, z: 2.2 };
  const window = (qb as unknown as { window: (...a: unknown[]) => { P: number; intRisk: number } }).window.bind(qb);
  return window(qbAgent, sim, r, from, point, 0.9, 0.4, 0);
}

describe('QB interception estimate', () => {
  it('rises with his own miss when a defender sits off the window, out of reach of the aimed ball', () => {
    // 7 yd off the aim, facing the QB: he cannot contest a ball thrown where it is aimed, but he can
    // reach an errant one. Even a 99-rated passer has some miss, so the ratio is modest.
    const accurate = scene(99, 7), wild = scene(20, 7);
    expect(accurate.P).toBeGreaterThan(0.6); // the aimed window is open
    expect(wild.intRisk).toBeGreaterThan(1.4 * accurate.intRisk);
    expect(wild.intRisk - accurate.intRisk).toBeGreaterThan(0.015);
  });
});
