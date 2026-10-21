/** Long-run tail candidates (experimental, all off): FORCE_DEPTH (an off-ball
 * force defender keeps his installed depth while the runner he sees is behind
 * the line), EDGE_SQUEEZE (an edge/force fit pursues a runner inside him at
 * the line instead of holding his landmark square to it) and SHED_AWAY (a
 * blocked defender whose runner is past the line on the far side from his
 * blocker asks for his own pursuit instead of the rep's work-off) and LB_DEPTH
 * (a stack backer reads at his alignment depth less one step until the back
 * threatens his gap, rather than sprinting to a landmark on the line). */
import { afterEach, describe, expect, it, vi } from 'vitest';
// These witnesses predate the under-center exchange package (UC_MESH
// MESH_TEMPO QB_CARRYOUT PACE_LEAD) and are timed on the installed exchange;
// pin it off here. test/run-game-flags.test.ts covers the package itself.
vi.hoisted(() => { for (const k of ['UC_MESH', 'MESH_TEMPO', 'QB_CARRYOUT', 'PACE_LEAD']) process.env[k] = '0'; });
// Recorded under the default gait, pull and gun-exchange laws. GAIT_STEP,
// PULL_STEP and MESH_POINT (on in the pinned profile) change its timing or
// first command; pin them off here. test/gait-step.test.ts and
// test/pull-step.test.ts cover those laws.
vi.hoisted(() => { for (const k of ['GAIT_STEP', 'PULL_STEP', 'MESH_POINT']) process.env[k] = '0'; });
// Also recorded before the runner's entry reads (RUN_ARMS RUN_PROJECT
// LOG_READ LANE_DEPTH) and RB_AWAY; test/run-read-fixes.test.ts and
// test/run-arms.test.ts cover those.
vi.hoisted(() => { for (const k of ['RUN_ARMS', 'RUN_PROJECT', 'LOG_READ', 'LANE_DEPTH', 'RB_AWAY']) process.env[k] = '0'; });
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

const offense = generateTeam(new Rng(51), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(52), 'D', 'D', { strength: .55 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function play(flags: Record<string, string>, run = 'iz_strong', seed = 5) {
  for (const [k, v] of Object.entries(flags)) vi.stubEnv(k, v);
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID.ace_12;
  return new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
}

/** The Cover 3 force safety's depth past the line while the carrier is still behind it. */
async function forceDepthBehindLine(on: boolean) {
  const sim = await play({ FORCE_DEPTH: on ? '1' : '0' });
  const ss = sim.slot('SS')!;
  const home = sim.defAlign.spots.SS!.pos.x - sim.los;
  let least = Infinity;
  while (sim.phase === 'live' && sim.t < 4) {
    sim.tick();
    const c = sim.carrier;
    if (!c || c === sim.qb || c.pos.x > sim.los) continue;
    if (ss.runFit?.kind === 'force') least = Math.min(least, ss.pos.x - sim.los);
  }
  return { home, least };
}

describe('FORCE_DEPTH', () => {
  it('off: the force safety squeezes toward the line before the runner reaches it', async () => {
    const { home, least } = await forceDepthBehindLine(false);
    expect(home).toBeGreaterThanOrEqual(5);
    expect(least).toBeLessThan(home - 2);
  });
  it('on: he keeps his installed depth until the runner reaches the line', async () => {
    const { home, least } = await forceDepthBehindLine(true);
    expect(least).toBeGreaterThan(home - 1);
  });
});

/** Ticks where an unengaged edge/force fit holds his landmark facing the line
 * while the carrying runner is inside him at or past the line. */
async function edgeHolds(on: boolean) {
  const sim = await play({ EDGE_SQUEEZE: on ? '1' : '0' }, 'oz_weak');
  const intents = (sim as unknown as { intents: { facing?: number }[] }).intents;
  let holds = 0, inside = 0;
  while (sim.phase === 'live' && sim.t < 5) {
    sim.tick();
    const c = sim.carrier;
    if (!c || c === sim.qb || c.pos.x < sim.los - .5) continue;
    for (const d of sim.defense) {
      const job = d.runFit;
      if (!job || (job.kind !== 'edge' && job.kind !== 'force') || d.engagement || c.pos.x > sim.los + 2) continue;
      if (job.side * (c.pos.y - d.pos.y) >= -(d.profile.radius + c.profile.radius + d.profile.reach)) continue;
      inside++;
      if (intents[d.idx].facing === Math.PI) holds++;
    }
  }
  return { holds, inside };
}

describe('EDGE_SQUEEZE', () => {
  it('off: edge fits hold their landmark square to the line with the runner inside them', async () => {
    const { holds, inside } = await edgeHolds(false);
    expect(inside).toBeGreaterThan(0);
    expect(holds).toBeGreaterThan(0);
  });
  it('on: they pursue instead (the picture they act on lags the runner by a perception delay)', async () => {
    const off = await edgeHolds(false), on = await edgeHolds(true);
    expect(on.inside).toBeGreaterThan(0);
    expect(on.holds).toBeLessThan(off.holds / 4);
  });
});

/** Engaged defenders asking for their own pursuit through a run rep. */
async function awayTicks(on: boolean) {
  const sim = await play({ SHED_AWAY: on ? '1' : '0', SHED_PURSUE: '1' }, 'oz_strong');
  const s = sim as unknown as { intents: { vel: { x: number; y: number } }[]; cmds: { vel: { x: number; y: number } }[] };
  let tagged = 0, matched = 0;
  while (sim.phase === 'live' && sim.t < 5) {
    for (const d of sim.defense) d.tags.delete('shed-away');
    sim.tick();
    for (const d of sim.defense) if (d.tags.has('shed-away') && d.engagement) {
      tagged++;
      const i = s.intents[d.idx].vel, c = s.cmds[d.idx].vel;
      if (Math.abs(i.x - c.x) < 1e-9 && Math.abs(i.y - c.y) < 1e-9) matched++;
    }
  }
  return { tagged, matched };
}

describe('SHED_AWAY', () => {
  it('off: no engaged defender is released to his own request', async () => {
    expect((await awayTicks(false)).tagged).toBe(0);
  });
  it('on: a defender with the runner past the line on the far side asks for his own pursuit', async () => {
    const { tagged, matched } = await awayTicks(true);
    expect(tagged).toBeGreaterThan(0);
    expect(matched).toBe(tagged);
  });
});

/** The middle backer's shallowest depth on a power play before the back's
 * path threatens his gap (no fit-threat tag yet, not declared). */
async function backerReadDepth(on: boolean) {
  const sim = await play({ LB_DEPTH: on ? '1' : '0' }, 'power');
  const lb = sim.slot('LB_M')!;
  const home = sim.defAlign.spots.LB_M!.pos.x - sim.los;
  let least = Infinity, lateral = 0;
  const y0 = lb.pos.y;
  while (sim.phase === 'live' && sim.t < 1.6) {
    lb.tags.delete('fit-threat-read');
    sim.tick();
    if (lb.tags.has('fit-threat-read') || lb.engagement) break;
    if (lb.runFit?.kind === 'insert') least = Math.min(least, lb.pos.x - sim.los);
    lateral = Math.max(lateral, Math.abs(lb.pos.y - y0));
  }
  return { home, least, lateral };
}

describe('LB_DEPTH', () => {
  it('off: the stack backer runs toward a landmark near the line before the back threatens his gap', async () => {
    const { home, least } = await backerReadDepth(false);
    expect(home).toBeGreaterThanOrEqual(3);
    expect(least).toBeLessThan(home - 1.5);
  });
  it('on: he holds his read depth (alignment less one step) until then', async () => {
    const { home, least } = await backerReadDepth(true);
    expect(least).toBeGreaterThan(home - 1.25);
  });
});
